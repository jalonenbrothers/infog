<?php
declare(strict_types=1);

/**
 * Series registry: the single list of published infographics.
 * A series entry needs a data/<slug>.md (description page content).
 * The infographic visual itself is implemented in js/<slug>.js.
 */
function infog_series(): array
{
    return [
        [
            'slug'    => 'uk-wealth-timeline',
            'title'   => 'The UK Wealth Timeline, 1995–2025',
            'teaser'  => 'Thirty years of UK household wealth animated: the pool grows to £11 trillion, but who holds it? Top 10% vs the other 90%, year by year — plus an honest projection of where the trend points.',
            'badge'   => 'Infographic #1',
            'date'    => '2026-10-31',
        ],
    ];
}

function infog_find_series(string $slug): ?array
{
    foreach (infog_series() as $s) {
        if ($s['slug'] === $slug) return $s;
    }
    return null;
}

/** Escaped output helpers */
function e(?string $s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}
