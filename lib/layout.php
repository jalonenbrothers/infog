<?php
declare(strict_types=1);

/**
 * Shared page shell. Zero-dep, flat structure; asset paths are root-relative
 * so both Apache and `php -S` serve them identically.
 */
function infog_layout(string $title, string $body, ?string $desc = null): string
{
    $siteName = 'Infog';
    $fullTitle = $title === '' ? $siteName : ($title . ' — ' . $siteName);
    $desc = e($desc ?? 'Animated infographics built on real, sourced data. No chart libraries, no spin.');
    return <<<HTML
<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$fullTitle}</title>
<meta name="description" content="{$desc}">
<link rel="stylesheet" href="/assets/site.css">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="icon" type="image/x-icon" sizes="32x32 16x16" href="/assets/favicon.ico">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <a class="brand" href="/">Infog<span class="brand-dot">.</span></a>
  <span class="tagline">animated infographics · real data · no libraries</span>
</header>
<main id="main">
{$body}
</main>
<footer class="site-foot">
  <p>Infog — an <a href="https://github.com/jalonenbrothers/infog">MVP Lab</a> side project. Every number on this site is sourced; every projection is labelled as one.</p>
</footer>
</body>
</html>
HTML;
}
