# UK Wealth-Distribution Data — Sources (infog)

Assembled 2026-10-31. Every value in `wealth-uk.json` traces to one of the
source keys below. No invented numbers; annual WAS top-10% shares between
round mid-years are flagged `interpolated_top10: true`.

## Source keys

### `ons-was-t2.2` — ONS Wealth & Assets Survey, Table 2.2
- Publication: "Total Wealth: Wealth in Great Britain" dataset (edition
  "July 2006 to June 2016 / April 2014 to March 2022", released 24 Jan 2025),
  Table 2.2: Aggregate household total wealth and components by total wealth
  decile (£ millions).
- File: `totalwealthtables.xlsx` from
  https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/datasets/totalwealthwealthingreatbritain
- Used for: decile-level aggregates for all 9 WAS waves/rounds (Wave 1 Jul
  2006–Jun 2008 … Round 8 Apr 2020–Mar 2022). Decile shares and top-10% share
  are computed as decile ÷ sum(deciles). Computed top-10% shares reproduce
  ONS's published prose figures for every round it states one (44% Wave 5,
  45% Round 6, 43% Round 7) — cross-check passed.
- Caveat: Round 8 (2020–22) uses SCAPE-based pension methodology — time-series
  break vs earlier rounds (flagged `method_break`).

### `ons-was-t2.1` — ONS WAS, Table 2.1 (same xlsx)
- Aggregate household total wealth (£bn) per round: 8,426 (2006-08) →
  15,221 (2018-20) → 13,568 (2020-22, method break). Matches published
  bulletins ("£14.6 trillion" 2016-18, "£12.7tn" Wave 5, etc.).

### `ons-was-bulletins` — ONS Household total wealth bulletins
- 2020–22 round: https://www.ons.gov.uk/.../totalwealthingreatbritain/april2020tomarch2022 (24 Jan 2025):
  total £13.6tn (£15.2tn per regen-fin roundup), wealthiest 10% hold 41%,
  top 1% hold 10%, bottom 50% hold 9%, median £293,700.
- 2018–20 round (7 Jan 2022): wealthiest 10% held 43%, bottom 50% 9%.
- 2016–18 round: £14.6tn; top-10% share 45%, "largely unchanged since
  July 2006 to June 2008".
- Wave 5 (2014–16): £12.7tn, top 10% owned 44%.
- Wave 4 (2012–14): £11.1tn, top 10% owned 45%.
- Wave 1 (2006–08): £9.0tn (Bristol/ONS WAS wave-1 report, 2009), wealthiest
  10% were 4.8× wealthier than bottom 50%; top-20% held 62%.
- Privately-owned-wealth page (ONS): wealthiest 10% hold 41%, 1% hold 10%,
  50% hold 91% (2020-22).
- "Applying updated pension methodology… 2018–20" (Jul 2026): median total
  wealth 2018–20 under updated method £282,200 (published method £302,500).

### `ons-nbs-2026` — ONS National balance sheet (household sector net worth)
- Series CGRC "S.1HN total net worth, current prices, £m", annual 1962–2025,
  via the UK national balance sheet time series (release 10 June 2026),
  retrieved through DBnomics (api.db.nomics.world, ONS/NBS/CGRC.A).
- 2024 bulletin figures: household net worth £10.8tn in 2024 (+£217.7bn),
  driven by land +£176.7bn. Note: this is a DIFFERENT concept from WAS
  (national-accounts balance-sheet household sector; ONS states the two are
  "not directly comparable").
- Used for: `total_wealth_gbp_bn` annual 1995–2025 (this is the ONLY annual
  1995-present total-wealth series; WAS is biennial).

### `wid-2026-owid` — World Inequality Database, UK top-10% wealth share
- Indicator: "Share (top 10%, wealth)" — share of net personal wealth held
  by the top decile of INDIVIDUALS, WID.world capitalization-survey mixed
  method. Retrieved via Our World in Data grapher CSV
  (wealth-share-richest.csv, 2026 edition; WID.world retrieved 2026-07-07).
- UK series used: 1995–2024 annual (52.55% … 57.14%).
- Cross-check: MacroMicro mirrors WID (UK 2024: 57.14%). ✓
- Known tension (documented in json notes): WID top-1% UK 2023 = 21.3% vs
  ONS-WAS prose top-1% = 10% — different units (individuals vs households)
  and methods (capitalization vs survey); both are real published numbers.

### International comparison candidates (`intl_wid_2024`)
- WID top-10% net personal wealth shares, 2024: France 59.9%, Germany 58.5%,
  Spain 57.4%, Sweden 68.2%, US 69.5%, UK 57.1%.
- Best decile data if UK falls short: the UK itself has excellent decile
  data (ONS WAS Table 2.2, full decile × component grid, 9 rounds). Of the
  comparison set, FRANCE has the longest continuous WID annual series;
  US has the most-cited top-decile series (Piketty-Saez-Zucman lineage).

## Gaps (reported honestly)
1. **Pre-2007 WAS shares don't exist** — WAS starts Jul 2006. The 1995–2006
   top-10% share in the JSON is WID only (survey-equivalent missing).
2. **Annual WAS top-10% shares are interpolations** between biennial round
   mid-years (flagged per-row).
3. **Method break at 2020-22** (SCAPE pension discounting) — the 45%→41% WAS
   drop partly reflects methodology, not pure real change. For the
   animation, prefer WID (57%) or show WAS with a break annotation.
4. **No assembled wealth-FLOW series** (savings vs asset appreciation).
   Evidence exists piecemeal: WAS 2.1 component growth (pensions + property
   dominate), NBS 2024 (+£217.7bn, land appreciation +£176.7bn).
   Resolution Foundation / IFS / OBR publish wealth-stock projections, not
   a clean public flow time series. Recommend a second animation frame on
   "how wealth grew" using WAS components instead.
5. **Top-1%**: ONS gives 10% only as prose (2020-22); WID individual basis
   gives 21.3% (2023). State the basis in any animation caption.