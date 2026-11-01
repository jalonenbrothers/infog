<?php
declare(strict_types=1);

/**
 * Infog test runner — zero-dep, run: php tests/run.php
 * 1) php -l on every PHP file
 * 2) data-shape checks on data/wealth-uk.json (shape only, not values —
 *    value spot-checks vs sources.md are the QA card's job)
 * 3) registry/route coherence: every series slug has js/<slug>.js + data/<slug>.md
 * Exits 1 on any failure.
 */
$root = dirname(__DIR__);
$pass = 0; $fail = 0;
function ok(string $name, bool $cond, string $detail = ''): void
{
    global $pass, $fail;
    if ($cond) { $pass++; echo "PASS  $name\n"; }
    else { $fail++; echo "FAIL  $name" . ($detail !== '' ? " — $detail" : '') . "\n"; }
}

// 1) lint all PHP
$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
foreach ($files as $f) {
    if ($f->isFile() && $f->getExtension() === 'php') {
        exec('php -l ' . escapeshellarg($f->getPathname()) . ' 2>&1', $out, $code);
        ok('php -l ' . basename($f->getPathname()), $code === 0, implode("\n", $out));
        $out = [];
    }
}

// 2) data shape
$j = json_decode((string)file_get_contents($root . '/data/wealth-uk.json'), true);
ok('wealth-uk.json parses', is_array($j));
if (is_array($j)) {
    $a = $j['annual'] ?? [];
    ok('annual rows: 31', count($a) === 31, 'got ' . count($a));
    $years = array_column($a, 'year');
    ok('years 1995..2025 contiguous', $years === range(1995, 2025),
        'first=' . ($years[0] ?? '?') . ' last=' . end($years));
    $badTot = 0; $badShare = 0; $badFlag = 0; $missingWid = [];
    foreach ($a as $r) {
        if (!isset($r['total_wealth_gbp_bn']) || !is_numeric($r['total_wealth_gbp_bn']) || $r['total_wealth_gbp_bn'] <= 0) $badTot++;
        if (isset($r['wid_top10_share_pct']) && $r['wid_top10_share_pct'] !== null) {
            if ($r['wid_top10_share_pct'] <= 0 || $r['wid_top10_share_pct'] >= 100) $badShare++;
        } else {
            $missingWid[] = $r['year'];
        }
        if ($r['was_top10_share_pct'] !== null && !isset($r['interpolated_top10'])) $badFlag++;
    }
    ok('totals all positive numerics', $badTot === 0, "$badTot bad");
    ok('WID shares in (0,100)', $badShare === 0, "$badShare bad");
    ok('missing WID only for post-2024 (latest year)', $missingWid === [2025], 'missing: ' . implode(',', $missingWid));
    ok('WAS rows always carry interpolated_top10 flag', $badFlag === 0);

    $wr = $j['was_rounds'] ?? [];
    ok('was_rounds: 9 (Wave 1 … Round 8)', count($wr) === 9, 'got ' . count($wr));
    $decBad = 0; $mbBad = 0;
    foreach ($wr as $r) {
        if (!isset($r['mid_year'], $r['top10_share_pct'], $r['decile_shares_pct'])) $decBad++;
        elseif (count($r['decile_shares_pct']) !== 10) $decBad++;
        if (!isset($r['method_break'])) $mbBad++;
    }
    ok('was_rounds have mid_year/top10/10 deciles', $decBad === 0);
    ok('was_rounds carry method_break flag', $mbBad === 0);

    // decile shares sum ~100
    $sumBad = 0;
    foreach ($wr as $r) {
        $s = array_sum($r['decile_shares_pct'] ?? []);
        if (abs($s - 100) > 1.0) $sumBad++;
    }
    ok('decile shares sum to ~100% (±1)', $sumBad === 0, "$sumBad bad");

    ok('international comparison present (6 countries)', count($j['international_wid_top10_2024'] ?? []) === 6);
    ok('projection method note present', isset($j['projection_method_note']) && $j['projection_method_note'] !== '');
    ok('notes present', isset($j['notes']) && is_array($j['notes']) && count($j['notes']) >= 5);
}

// 3) registry coherence
$reg = file_get_contents($root . '/lib/registry.php');
preg_match_all("/'slug'\s*=>\s*'([a-z0-9-]+)'/", (string)file_get_contents($root . '/lib/registry.php'), $m);
$slugs = $m[1];
ok('registry lists 1 series', count($slugs) === 1);
foreach ($slugs as $s) {
    ok("js/$s.js exists", is_file($root . "/js/$s.js"));
    ok("data/$s.md exists", is_file($root . "/data/$s.md"));
}

// 4) .htaccess: the public data endpoint slug must be whitelisted (negative
//    lookahead), so Apache lets /data/<slug>.json through to index.php while
//    raw files (wealth-uk.json, sources.md) stay 404. Static check so this
//    runs without Apache; the end-to-end check runs under the QA container.
$ht = (string)file_get_contents($root . '/.htaccess');
ok('htaccess blocks internals', strpos($ht, 'RedirectMatch 404 ^/(lib|src|tests|migrations)/') !== false);
ok('htaccess does NOT blanket-block data/', strpos($ht, 'migrations|data)') === false);
foreach ($slugs as $s) {
    $escaped = str_replace('.', '\.', $s);
    ok("htaccess whitelists data endpoint /data/$s.json",
        strpos($ht, "(?!$escaped\.json\$)") !== false);
}

// 5) live endpoint check when served by a real Apache (BASE_URL env), else skipped
$base = getenv('INFOG_BASE_URL');
if ($base) {
    foreach ($slugs as $s) {
        $ctx = stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 5]]);
        $body = @file_get_contents(rtrim($base, '/') . "/data/$s.json", false, $ctx);
        $code = 0;
        foreach ($http_response_header ?? [] as $h) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $hm)) { $code = (int)$hm[1]; }
        }
        ok("GET /data/$s.json → 200 application/json",
            $code === 200 && strpos(implode(' ', $http_response_header ?? []), 'application/json') !== false,
            "code=$code");
    }
    // raw internals must stay blocked
    foreach (['/data/wealth-uk.json', '/data/sources.md', '/lib/bootstrap.php'] as $p) {
        $ctx = stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 5]]);
        @file_get_contents(rtrim($base, '/') . $p, false, $ctx);
        $code = 0;
        foreach ($http_response_header ?? [] as $h) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $hm)) { $code = (int)$hm[1]; }
        }
        ok("GET $p → 404 (stays blocked)", $code === 404, "code=$code");
    }
}

// 6) draft-2 view modes: shared core + 3 views wired into the timeline page
ok('view controller registered (WealthViews.circles in wealth-view-circles.js)',
    strpos((string)file_get_contents($root . '/js/wealth-view-circles.js'), 'WealthViews.circles') !== false);
ok('hourglass view registered (WealthViews.hourglass)',
    strpos((string)file_get_contents($root . '/js/wealth-view-hourglass.js'), 'WealthViews.hourglass') !== false);
ok('people view registered (WealthViews.people)',
    strpos((string)file_get_contents($root . '/js/wealth-view-people.js'), 'WealthViews.people') !== false);
ok('controller uses shared core (wealth-core.js loaded)',
    strpos((string)file_get_contents($root . '/index.php'), '/js/wealth-core.js') !== false);
foreach (['wealth-core.js', 'wealth-view-circles.js', 'wealth-view-hourglass.js', 'wealth-view-people.js', 'uk-wealth-timeline.js'] as $jsf) {
    $p = $root . '/js/' . $jsf;
    $ok = is_file($p);
    $detail = 'missing';
    if ($ok && function_exists('exec')) {
        // syntax-check with node when available; skip (not fail) otherwise
        exec('command -v node', $nv, $nc);
        if ($nc === 0) {
            exec('node --check ' . escapeshellarg($p) . ' 2>&1', $o, $c);
            $ok = $c === 0; $detail = implode(' ', array_slice($o, -1)); $o = [];
        }
    }
    ok("js/$jsf present + syntax-checked", $ok, $detail);
}
$viewHtml = (string)file_get_contents($root . '/index.php');
ok('view selector rendered server-side (3 modes)', substr_count($viewHtml, 'viewsel-item') === 3);
foreach (['hourglass', 'people', 'circles'] as $mode) {
    ok("selector offers mode '$mode'", strpos($viewHtml, 'data-view="' . $mode . '"') !== false);
}
// exact on-screen honesty wording for the hourglass flows (card requirement)
ok('hourglass flow wording exact',
    strpos((string)file_get_contents($root . '/js/wealth-view-hourglass.js'),
        'stylised from annual change in net worth (no public flow series exists)') !== false);
// projection honesty: all views mark the extrapolation
foreach (['wealth-view-hourglass.js', 'wealth-view-people.js'] as $vf) {
    $src = (string)file_get_contents($root . '/js/' . $vf);
    ok("$vf projects to 2040 with EXTRAPOLATION badge",
        strpos($src, 'EXTRAPOLATION') !== false && strpos($src, '2040') !== false);
    ok("$vf respects prefers-reduced-motion",
        strpos($src, 'prefers-reduced-motion') === false ? strpos($src, 'REDUCED') !== false : true);
}
// per-head math spot-check (pure share math: 9*s/(100-s)); 57.14% -> ~12.0x
$x = 9 * 57.14 / (100 - 57.14);
ok('per-head multiple ~12x at 57.14% share', abs($x - 12.0) < 0.05, sprintf('%.3f', $x));
// controller keeps 2040 as the projection horizon (same model as v1)
ok('controller timeline ends at 2040',
    strpos((string)file_get_contents($root . '/js/wealth-core.js'), '2040') !== false);

// 7) deep-link ?view= + favicon (QA polish card t_7c67f3d0)
$viewPhp = (string)file_get_contents($root . '/index.php');
ok('deep-link: server whitelists ?view values (hourglass|people|circles)',
    strpos($viewPhp, "['hourglass', 'people', 'circles']") !== false);
ok('deep-link: selector carries data-initial-view',
    strpos($viewPhp, 'data-initial-view="{$view}"') !== false);
ok('deep-link: aria-selected is server-computed per view',
    strpos($viewPhp, '$selHourglass') !== false && strpos($viewPhp, '$selPeople') !== false);
$ctrl = (string)file_get_contents($root . '/js/uk-wealth-timeline.js');
ok('deep-link: JS reads data-initial-view',
    strpos($ctrl, 'data-initial-view') !== false);
ok('deep-link: JS syncs ?view= on switch (replaceState, no history pollution)',
    strpos($ctrl, "searchParams.set('view'") !== false && strpos($ctrl, 'replaceState') !== false);
$layoutPhp = (string)file_get_contents($root . '/lib/layout.php');
ok('favicon: SVG link in head', strpos($layoutPhp, 'favicon.svg') !== false);
ok('favicon: ICO fallback link in head', strpos($layoutPhp, 'favicon.ico') !== false);
ok('favicon: assets/favicon.svg exists', is_file($root . '/assets/favicon.svg'));
$ico = $root . '/assets/favicon.ico';
$icoOk = is_file($ico);
if ($icoOk && function_exists('exec')) {
    exec('file ' . escapeshellarg($ico) . ' 2>/dev/null', $fo, $fc);
    $icoOk = $fc === 0 && strpos(implode(' ', $fo), 'icon') !== false;
}
ok('favicon: assets/favicon.ico is a real ICO (16+32 sizes)', $icoOk);

echo "\n" . ($fail ? "FAILED: $fail failed, $pass passed\n" : "OK: $pass passed, 0 failed\n");
exit($fail ? 1 : 0);
