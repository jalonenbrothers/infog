<?php
declare(strict_types=1);

/**
 * Front controller. Flat git-deploy structure (repo root = web root).
 * Routes:
 *   /                      homepage (series index)
 *   /about/<slug>          per-infographic description page (data/<slug>.md)
 *   /view/<slug>           the infographic page itself (js/<slug>.js drives it)
 *   /data/<slug>.json      data endpoint for the animation (readfile, JSON headers)
 */
require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/registry.php';
require __DIR__ . '/lib/markdown.php';
require __DIR__ . '/lib/layout.php';

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$path = rtrim($path, '/') ?: '/';
// strip an optional base dir (php -S inside a subdir / Apache alias)
$scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
if ($scriptDir !== '' && str_starts_with($path, $scriptDir)) {
    $path = substr($path, strlen($scriptDir)) ?: '/';
}

try {
    if ($path === '/' || $path === '/index.php') {
        infog_home();
    } elseif (preg_match('#^/data/([a-z0-9-]+)\.json$#', $path, $m)) {
        infog_data($m[1]);
    } elseif (preg_match('#^/about/([a-z0-9-]+)$#', $path, $m)) {
        infog_about($m[1]);
    } elseif (preg_match('#^/view/([a-z0-9-]+)$#', $path, $m)) {
        infog_view($m[1]);
    } else {
        http_response_code(404);
        echo infog_layout('Not found', '<section class="wrap"><h1>404 — not found</h1><p><a href="/">Back to the series index</a>.</p></section>');
    }
} catch (Throwable $e) {
    infog_fail($e);
}

function infog_home(): void
{
    $cards = '';
    foreach (infog_series() as $s) {
        $cards .= <<<CARD
<article class="card">
  <p class="card-kicker">{$s['badge']} · {$s['date']}</p>
  <h2><a href="/view/{$s['slug']}">{$s['title']}</a></h2>
  <p class="teaser">{$s['teaser']}</p>
  <p class="card-links"><a class="cta" href="/view/{$s['slug']}">▶ Watch the animation</a>
     <a href="/about/{$s['slug']}">How it was built &amp; sources</a></p>
</article>
CARD;
    }
    $body = <<<HTML
<section class="hero wrap">
  <h1>Infographics that move — on real data.</h1>
  <p>Short animated explainers built on published, traceable numbers. No chart
  libraries, no spin — every figure is sourced, every projection is labelled.</p>
</section>
<section class="wrap series">
{$cards}
</section>
HTML;
    echo infog_layout('', $body);
}

function infog_data(string $slug): void
{
    // slug must correspond to a published series entry
    if (infog_find_series($slug) === null) { http_response_code(404); exit('not found'); }
    $file = __DIR__ . '/data/' . $slug . '.json';
    // canonical data files are named after their dataset, not the slug:
    $aliasMap = ['uk-wealth-timeline' => 'wealth-uk.json'];
    if (!is_file($file) && isset($aliasMap[$slug])) {
        $file = __DIR__ . '/data/' . $aliasMap[$slug];
    }
    if (!is_file($file)) { http_response_code(404); exit('data not found'); }
    header('Content-Type: application/json; charset=utf-8');
    readfile($file);
}

function infog_about(string $slug): void
{
    $s = infog_find_series($slug);
    if ($s === null) { http_response_code(404); exit('not found'); }
    $mdFile = __DIR__ . '/data/' . $slug . '.md';
    if (!is_file($mdFile)) { http_response_code(404); exit('description not found'); }
    $md = file_get_contents($mdFile) ?: '';
    $title = $s['title'];
    $html = Markdown::render($md);
    $slugE = e($slug);
    $body = <<<HTML
<article class="wrap about">
<nav class="crumb"><a href="/">← All infographics</a></nav>
<h1>{$title}</h1>
<p class="card-kicker">{$s['badge']} · {$s['date']} · how it was built</p>
{$html}
<p class="about-watch"><a class="cta" href="/view/{$slugE}">▶ Watch the animation</a></p>
</article>
HTML;
    echo infog_layout($s['title'] . ' — how it was built', $body, $s['teaser']);
}

function infog_view(string $slug): void
{
    $s = infog_find_series($slug);
    if ($s === null) { http_response_code(404); exit('not found'); }
    $jsFile = __DIR__ . '/js/' . $slug . '.js';
    if (!is_file($jsFile)) { http_response_code(404); exit('infographic not found'); }
    // deep-link: ?view=hourglass|people|circles sets the initial view server-side
    $views = ['hourglass', 'people', 'circles'];
    $reqView = $_GET['view'] ?? '';
    $view = in_array($reqView, $views, true) ? $reqView : 'hourglass';
    $selHourglass = $view === 'hourglass' ? 'true' : 'false';
    $selPeople = $view === 'people' ? 'true' : 'false';
    $selCircles = $view === 'circles' ? 'true' : 'false';
    $slugE = e($slug);
    $titleE = e($s['title']);
    $body = <<<HTML_VIEW_SCRIPTS
<article class="view wrap">
<nav class="crumb"><a href="/">← All infographics</a> · <a href="/about/{$slugE}">How it was built &amp; sources</a></nav>
<h1>{$titleE}</h1>

<section id="infog-stage" class="stage" aria-label="UK wealth distribution animation"
         data-slug="{$slugE}" data-endpoint="/data/{$slugE}.json">
  <noscript>
    <div class="stage-static">
      <p><strong>This infographic is animated and needs JavaScript.</strong></p>
      <p>Static summary: UK household sector net worth grew from about £2.6 trillion in 1995
      to about £11.2 trillion in 2025 (ONS National Balance Sheet). Over 2024, the top 10%
      of individuals held about 57% of net personal wealth (World Inequality Database);
      the ONS Wealth &amp; Assets Survey puts the top 10% of households at 41% of household
      wealth (2020–22, updated pension methodology).</p>
      <p>Full sources and method on the <a href="/about/{$slugE}">description page</a>.</p>
    </div>
  </noscript>
</section>

<section id="infog-progress" class="stagebar" hidden aria-hidden="true">
  <div class="stagebar-fill"></div>
  <div class="stagebar-labels">
    <span data-stage-label>Pooling wealth</span>
    <span data-year-label>1995</span>
  </div>
</section>

<section id="infog-controls" class="controls">
  <button id="infog-play" type="button" class="cta">▶ Play</button>
  <button id="infog-restart" type="button" class="ghost" hidden>↺ Replay</button>
  <p class="controls-note" id="infog-note">Animation runs once — about 50 seconds. Everything you see is proportional to the real £ values.</p>
</section>

<section id="infog-verdict" class="verdict" hidden>
  <h2>The verdict</h2>
</section>

<section id="infog-viewsel" class="viewsel" aria-label="Animation view mode">
  <p class="viewsel-note">Three ways to see the same numbers:</p>
  <ol class="viewsel-list" id="infog-view-select-list" role="listbox" data-initial-view="{$view}">
    <li><button type="button" class="viewsel-item" role="option" aria-selected="{$selHourglass}" data-view="hourglass">⧗ The Hourglass<span class="viewsel-hint">flows & sliding neck</span></button></li>
    <li><button type="button" class="viewsel-item" role="option" aria-selected="{$selPeople}" data-view="people">👥 100 People, One Table<span class="viewsel-hint">coins & per-head split</span></button></li>
    <li><button type="button" class="viewsel-item" role="option" aria-selected="{$selCircles}" data-view="circles">⬤ Circles (draft 1)<span class="viewsel-hint">the original pools</span></button></li>
  </ol>
</section>
</article>
HTML_VIEW_SCRIPTS;
    $scripts = <<<HTML_SCRIPTS
<script src="/js/wealth-core.js" defer></script>
<script src="/js/wealth-view-circles.js" defer></script>
<script src="/js/wealth-view-hourglass.js" defer></script>
<script src="/js/wealth-view-people.js" defer></script>
<script src="/js/{$slugE}.js" defer></script>
HTML_SCRIPTS;
    $body .= $scripts;
    echo infog_layout($s['title'], $body, $s['teaser']);
}
