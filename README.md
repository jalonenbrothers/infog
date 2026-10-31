# Infog

Animated infographics built on real, sourced data. MVP Lab side project.
Zero dependencies: PHP front controller (flat Hostinger deploy), vanilla
JS/SVG animation, no chart libraries, no build step.

## Structure

```
index.php          front controller (routing: /, /about/<slug>, /view/<slug>, /data/<slug>.json)
router.php         dev router for `php -S`
lib/               config + layout + registry + tiny markdown (not web-accessible)
assets/site.css    house style (muted navy / red / cream)
js/<slug>.js       per-infographic animation (vanilla JS, rAF + SVG)
data/              static content: <slug>.md (description page), wealth-uk.json (dataset), sources.md
tests/run.php      php -l + data-shape checks (self-contained, no framework)
```

No database is used — content is static JSON/Markdown under `data/` (web-served
only through the `/data/<slug>.json` endpoint, since `data/` itself is blocked
by .htaccess). The house config shape is kept for future apps.

## Infographic #1 — UK Wealth Timeline

`/view/uk-wealth-timeline` — 30-year animated timeline of UK household
wealth: pool formation → top-10% vs 90% split → year-by-year growth with
real £ values → the share race (WID line + ONS WAS survey dots, method
break dashed) → clearly-styled projection (2026–27, dashed + uncertainty
band, labelled EXTRAPOLATION) → verdict panel with sources.

- Data: `data/wealth-uk.json` (researcher-assembled, every figure keyed
  to a named publication — see `data/sources.md`)
- Circle **areas are proportional to £ values** (r = k·√£bn)
- `prefers-reduced-motion`: jumps to final state, no animation
- Play button + scroll-trigger (IntersectionObserver) fallback
- Mobile responsive down to 375px

## Tests

```
php tests/run.php        # php -l on all PHP + data-shape checks on wealth-uk.json
```

Exits non-zero on any failure. The data-shape check validates years
1995–2025 contiguous, totals positive, WID shares within (0,100), WAS
round fields, and that projection rows (if any) carry flags — it does
NOT verify the real-world values (that's the QA data spot-check card
against sources.md).

## Deploy (Hostinger subdomain)

1. Clone/upload repo to the subdomain's web root
2. cp lib/config.example.php lib/config.php — fill db creds from hPanel
   (unused by this MVP, but the file must exist)
3. Run migrations/ per migrations/README.md — **none for this app**
   (static data only; directory kept for future apps)
4. Done — no build steps
