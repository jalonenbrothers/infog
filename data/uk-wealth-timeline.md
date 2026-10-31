# The UK Wealth Timeline, 1995–2025 — how it was built

> An animated 30-year timeline of UK household wealth: the pool grows
> from £2.6 trillion to over £11 trillion, while the top 10% pull
> further ahead. Every number is real, every source is named, and the
> projection is drawn dashed because it *is* a projection.

## What prompted it

Wealth inequality is usually shown as a static pie chart in a PDF.
The thing that makes it land — watching the gap *widen* year by year,
with the actual pound values climbing — almost never survives the
> trip into print. We wanted one animation where the areas you see are
> literally proportional to the £ values, so the audience can watch
> both the growth and the concentration happen at once.

## What it shows

1. **The pool forms.** UK household-sector net worth (ONS National
   Balance Sheet, series CGRC), 1995–2025: £2.6tn → £11.2tn.
2. **The split.** The pool divides into the top 10% of individuals
   vs the other 90% (World Inequality Database, UK top-10% share).
3. **Year-by-year growth.** The animation steps through each year
   with the real total on screen.
4. **The share race.** The top-10% share climbs from ~52.6% (1995)
   to 57.1% (2024) — and we show the ONS Wealth & Assets Survey
   household measure (43–45%, method break flagged) alongside, because
   the two measures are genuinely different and both are published.
5. **The projection.** 2026–2027, drawn dashed with an uncertainty
   band: last WID share held constant ±1pp, total wealth extrapolated
   at the last-decade CAGR ±2pp/yr. Trend extrapolation, not a
   forecast — and labelled as such on screen.
6. **The verdict.** What the numbers say, what would falsify the
   projection, and every source.

## Method

- Data: `data/wealth-uk.json` — 31 annual rows assembled from ONS
  and WID.world publications (see the source key below). Annual WAS
  shares are linear interpolations between biennial survey rounds
  (flagged per row in the data; the animation uses WID as its main
  share series precisely because it is annual and continuous).
- Honest caveats baked into the visual: the 2020–22 WAS round has a
  pension-methodology break (SCAPE discounting), so the WAS 45%→41%
  drop is partly methodological; WID (57%) and WAS (~41–45%) measure
  different things (individual net personal wealth vs GB household
  survey wealth) and are both real published numbers.
- Rendering: hand-written SVG animated with `requestAnimationFrame`
  in ~600 lines of vanilla JS. No libraries, no build step. Pool
  areas are proportional to £ values (radius = sqrt(value)) so the
  visual is honest at every frame. `prefers-reduced-motion` skips
  to the final state instantly.

## Data sources

- **ONS Wealth & Assets Survey**, Tables 2.1 & 2.2 ("Total Wealth:
  Wealth in Great Britain" dataset, released 24 Jan 2025) — aggregate
  wealth and decile breakdowns, 9 survey rounds 2006–08 → 2020–22.
- **ONS National Balance Sheet** (release 10 June 2026), household
  sector net worth, series CGRC — the annual 1995–2025 total-wealth
  series. Via DBnomics.
- **ONS bulletins** (2025, 2022, 2018) — cross-checks: top-10% 41%
  (2020–22), 43% (2018–20), 44–45% earlier rounds; top-1% = 10%.
- **World Inequality Database** (retrieved 2026) — UK top-10%
  individual wealth share, 1995–2024 annual. Via Our World in Data
  grapher CSV.
- Full per-figure traceability: `data/sources.md` in the repo.

## What would falsify the projection

- WAS rounds adopting the updated pension methodology *retrospectively*
  revising the top-10% share rather than the level.
- A WID methodology revision to UK capitalization factors (top shares
  are sensitive to assumed returns).
- Policy shocks (wealth taxes, major pension reform) — the projection
  assumes none, which is exactly why it stops at 2 years.

*Built as Infographic #1 — the point was to prove the platform
(template + data + animation) works end to end on real data.*
