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

echo "\n" . ($fail ? "FAILED: $fail failed, $pass passed\n" : "OK: $pass passed, 0 failed\n");
exit($fail ? 1 : 0);
