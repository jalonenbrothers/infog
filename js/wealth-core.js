/* Infog — shared core for the UK wealth timeline views.
 * Vanilla JS, no libraries. Loaded before the view files.
 * Exposes window.WealthCore: formatting helpers, SVG helpers, and the
 * data shaping + projection model (real 1995-2025, extrapolated 2026-2040)
 * shared by ALL view modes (circles / hourglass / 100-people table).
 */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- formatting: £bn -> £x.xT etc ---------- */
  function fmtGBP(bn) {
    if (bn >= 1000) return '£' + (bn / 1000).toFixed(1) + 'T';
    return '£' + Math.round(bn) + 'bn';
  }
  function fmtPct(p) { return p.toFixed(1) + '%'; }

  /* ---------- tiny SVG helpers ---------- */
  function el(name, attrs, text) {
    var n = document.createElementNS(SVGNS, name);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function lerp(a, b, p) { return a + (b - a) * p; }
  // smooth 0..1 with a soft landing at both ends
  function soft(p) { return easeInOut(clamp(p, 0, 1)); }

  /* ---------- data shaping (identical model in every view) ----------
   * Real data 1995-2025 (ONS totals + WID top-10% share), then a
   * steady-state trend extrapolation to 2040: share held constant
   * (+/-1pp band), total at last-decade CAGR (+/-2pp/yr). NOT a forecast.
   */
  var LAST_PROJ_YEAR = 2040;

  function shapeData(d) {
    var years = d.annual.map(function (r) {
      return { year: r.year, total: r.total_wealth_gbp_bn, wid: r.wid_top10_share_pct, proj: false };
    });
    // carry last WID share forward onto null rows (2025)
    var last = null;
    years.forEach(function (y) { if (y.wid != null) last = y.wid; else y.wid = last; });

    var minYear = years[0].year;
    var dataEnd = years[years.length - 1].year;
    var tLast = years[years.length - 1].total;

    // last-decade CAGR (2015->2025)
    var y0 = null;
    years.forEach(function (y) { if (y.year === dataEnd - 10) y0 = y.total; });
    if (!y0) y0 = years[0].total;
    var cagr = Math.pow(tLast / y0, 1 / 10) - 1;
    var projShare = years[years.length - 1].wid;

    for (var i = 1; i <= LAST_PROJ_YEAR - dataEnd; i++) {
      years.push({ year: dataEnd + i, total: tLast * Math.pow(1 + cagr, i), wid: projShare, proj: true });
    }

    return {
      raw: d,
      years: years,
      minYear: minYear,
      dataEnd: dataEnd,
      maxYear: LAST_PROJ_YEAR,
      tLast: tLast,
      cagr: cagr,
      projShare: projShare
    };
  }

  // interpolate the year rows at fractional year yearF.
  // never interpolates across the real->projection boundary (snaps).
  function rowAt(model, yearF) {
    var years = model.years;
    var y0 = Math.floor(yearF), y1 = Math.min(y0 + 1, years.length - 1);
    var a = null, b = null;
    for (var i = 0; i < years.length; i++) {
      if (years[i].year === y0) a = years[i];
      if (years[i].year === y1) b = years[i];
    }
    if (!a) a = years[0];
    if (!b) b = a;
    var p = yearF - a.year;
    var proj = a.proj && b.proj;
    if (a.proj !== b.proj) { b = a; p = 0; proj = a.proj; }
    return {
      year: lerp(a.year, b.year, p),
      total: lerp(a.total, b.total, p),
      wid: lerp(a.wid, b.wid, p),
      proj: proj
    };
  }

  // per-head multiplier: how many times more wealth one person in the
  // top 10% holds than one person in the other 90%, at a given share.
  // (9*share/(100-share) — pure function of the share, no population data needed)
  function perHeadX(sharePct) { return 9 * sharePct / (100 - sharePct); }

  window.WealthCore = {
    SVGNS: SVGNS,
    fmtGBP: fmtGBP,
    fmtPct: fmtPct,
    el: el,
    clamp: clamp,
    easeInOut: easeInOut,
    lerp: lerp,
    soft: soft,
    shapeData: shapeData,
    rowAt: rowAt,
    perHeadX: perHeadX
  };
})();
