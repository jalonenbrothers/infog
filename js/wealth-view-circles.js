/* Infog #1 — view: CIRCLES (draft-1 classic).
 * Two pools whose AREAS are proportional to £ values (r = K*sqrt(£bn)),
 * plus the share-race mini chart (WID line + WAS dots).
 * View contract: factory(stage, model, reduced) -> {draw(p, phaseName, overall), destroy(), yearText}
 */
(function () {
  'use strict';
  var C = window.WealthCore;
  if (!C) return;
  window.WealthViews = window.WealthViews || {};

  window.WealthViews.circles = function (stage, M, REDUCED) {
    var el = C.el, fmtGBP = C.fmtGBP, fmtPct = C.fmtPct;
    var W = 720, H = 640;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });

    var txtTitle = el('text', { x: 24, y: 40, 'class': 'stage-title' });
    var txtSub = el('text', { x: 24, y: 62, 'class': 'stage-sub' });
    var txtYear = el('text', { x: W - 24, y: 78, 'text-anchor': 'end', 'class': 'year-big' });
    var projBadge = el('text', { x: W - 24, y: 104, 'text-anchor': 'end',
      'class': 'stage-sub', fill: '#b9a86a', 'font-weight': '700' });

    var topCirc = el('circle', { cx: 205, cy: 300, r: 0, 'class': 'share-top', 'fill-opacity': '0.92' });
    var restCirc = el('circle', { cx: 515, cy: 300, r: 0, 'class': 'share-rest', 'fill-opacity': '0.85' });
    var topBand = el('circle', { cx: 205, cy: 300, r: 0, 'class': 'proj-band' });
    var restBand = el('circle', { cx: 515, cy: 300, r: 0, 'class': 'proj-band' });
    var topCircProj = el('circle', { cx: 205, cy: 300, r: 0, 'class': 'proj-mark', fill: 'none' });
    var restCircProj = el('circle', { cx: 515, cy: 300, r: 0, 'class': 'proj-mark', fill: 'none' });

    var topLabel = el('text', { x: 205, y: 300, 'text-anchor': 'middle', 'class': 'pool-label', fill: '#f4efe4' });
    var restLabel = el('text', { x: 515, y: 300, 'text-anchor': 'middle', 'class': 'pool-label', fill: '#f4efe4' });
    var topValue = el('text', { x: 205, y: 470, 'text-anchor': 'middle', 'class': 'pool-value' });
    var restValue = el('text', { x: 515, y: 470, 'text-anchor': 'middle', 'class': 'pool-value' });
    var topWho = el('text', { x: 205, y: 494, 'text-anchor': 'middle', 'class': 'stage-sub' });
    var restWho = el('text', { x: 515, y: 494, 'text-anchor': 'middle', 'class': 'stage-sub' });

    var raceGroup = el('g', { opacity: 0 });
    var raceTitle = el('text', { x: 24, y: 540, 'class': 'stage-sub', 'font-weight': '700' });
    raceTitle.textContent = 'Top-10% share of wealth, %  (two published measures)';
    var raceWasTitle = el('text', { x: 24, y: 628, 'class': 'stage-sub', 'font-size': '10' });
    raceWasTitle.textContent = 'Dots = ONS Wealth & Assets Survey (households, GB; 2020–22 round is a method break — dashed jump).';
    raceWasTitle.setAttribute('opacity', '0');
    var footnote = el('text', { x: 24, y: 628, 'class': 'stage-sub', 'font-size': '10' });

    [txtTitle, txtSub, txtYear, projBadge].forEach(function (x) { svg.appendChild(x); });
    svg.appendChild(topBand); svg.appendChild(restBand);
    svg.appendChild(topCirc); svg.appendChild(restCirc);
    svg.appendChild(topCircProj); svg.appendChild(restCircProj);
    [topLabel, restLabel, topValue, restValue, topWho, restWho].forEach(function (x) { svg.appendChild(x); });
    svg.appendChild(raceGroup);
    svg.appendChild(raceWasTitle);
    svg.appendChild(footnote);
    stage.appendChild(svg);

    txtTitle.textContent = 'UK household wealth, 1995–2025';

    var years = M.years, minYear = M.minYear, maxYear = M.maxYear, DATA_END = M.dataEnd;
    var PROJ_SHARE = M.projShare, CAGR = M.cagr, T_LAST = M.tLast;

    function rowAt(yF) { return C.rowAt(M, yF); }

    /* scale: area proportional to £ */
    var K = 0.95;
    function rOf(bn) { return K * Math.sqrt(Math.max(bn, 0)); }

    function setLabelPos(rT, rR) {
      topLabel.setAttribute('y', (300 - Math.min(rT * 0.35, 18)).toFixed(0));
      restLabel.setAttribute('y', (300 - Math.min(rR * 0.35, 18)).toFixed(0));
      topValue.setAttribute('y', (300 + rT + 28).toFixed(0));
      restValue.setAttribute('y', (300 + rR + 28).toFixed(0));
      topWho.setAttribute('y', (300 + rT + 46).toFixed(0));
      restWho.setAttribute('y', (300 + rR + 46).toFixed(0));
    }

    function setPools(row, proj) {
      var top = row.total * row.wid / 100, rest = row.total - top;
      topCirc.setAttribute('r', rOf(top).toFixed(1));
      restCirc.setAttribute('r', rOf(rest).toFixed(1));
      topCircProj.setAttribute('r', rOf(top).toFixed(1));
      restCircProj.setAttribute('r', rOf(rest).toFixed(1));
      topCircProj.setAttribute('opacity', proj ? 1 : 0);
      restCircProj.setAttribute('opacity', proj ? 1 : 0);
      topBand.setAttribute('opacity', proj ? 1 : 0);
      restBand.setAttribute('opacity', proj ? 1 : 0);
      topCirc.setAttribute('fill-opacity', proj ? 0.45 : 0.92);
      restCirc.setAttribute('fill-opacity', proj ? 0.45 : 0.85);
      topLabel.textContent = fmtPct(row.wid);
      restLabel.textContent = fmtPct(100 - row.wid);
      topValue.textContent = fmtGBP(top);
      restValue.textContent = fmtGBP(rest);
      topWho.textContent = 'richest 10% of individuals';
      restWho.textContent = 'the other 90%';
      setLabelPos(rOf(top), rOf(rest));
    }

    /* share race chart */
    var RX0 = 24, RX1 = 696, RY = 596, RY0 = 560, RY1 = 585;
    function raceX(year) { return RX0 + (year - minYear) / (maxYear - minYear) * (RX1 - RX0); }
    function raceY(pct) { return RY1 - (C.clamp(pct, 50, 70) - 50) / 20 * (RY1 - RY0); }

    (function buildRace(d) {
      var pts = years.filter(function (y) { return !y.proj; })
        .map(function (y) { return raceX(y.year).toFixed(1) + ',' + raceY(y.wid).toFixed(1); })
        .join(' ');
      raceGroup.appendChild(el('polyline', { points: pts, fill: 'none', stroke: '#c14646', 'stroke-width': 2.5 }));
      var pStart = raceX(DATA_END), pEnd = raceX(maxYear);
      raceGroup.appendChild(el('line', { x1: pStart, y1: raceY(PROJ_SHARE), x2: pEnd, y2: raceY(PROJ_SHARE),
        stroke: '#c14646', 'stroke-dasharray': '5 4', 'stroke-width': 2.5, 'stroke-opacity': 0.8 }));
      raceGroup.appendChild(el('rect', { x: pStart, y: raceY(PROJ_SHARE + 1),
        width: pEnd - pStart, height: raceY(PROJ_SHARE - 1) - raceY(PROJ_SHARE + 1),
        fill: '#c14646', 'fill-opacity': 0.12 }));
      raceGroup.appendChild(el('text', { x: pEnd - 2, y: raceY(PROJ_SHARE) - 6, 'text-anchor': 'end',
        'class': 'stage-sub', 'font-size': '9', fill: '#b9a86a' },
        'extrapolated to 2040 ±1pp'));
      var rounds = d.was_rounds || [];
      for (var i = 0; i < rounds.length; i++) {
        var r = rounds[i];
        raceGroup.appendChild(el('circle', { cx: raceX(r.mid_year), cy: raceY(r.top10_share_pct),
          r: 4, fill: '#7a8db8', stroke: 'none' }));
        if (i > 0 && r.method_break) {
          var prev = rounds[i - 1];
          raceGroup.appendChild(el('line', { x1: raceX(prev.mid_year), y1: raceY(prev.top10_share_pct),
            x2: raceX(r.mid_year), y2: raceY(r.top10_share_pct),
            stroke: '#7a8db8', 'stroke-dasharray': '3 3', 'stroke-width': 1.5 }));
        }
      }
    })(M.raw);

    /* phase-1 single pool */
    var poolC = el('circle', { cx: 360, cy: 300, r: 0, fill: '#33456e', 'fill-opacity': 0.9 });
    var poolV = el('text', { x: 360, y: 470, 'text-anchor': 'middle', 'class': 'pool-value' });
    var poolY = el('text', { x: 360, y: 494, 'text-anchor': 'middle', 'class': 'stage-sub' });
    poolY.textContent = 'total UK household wealth';
    svg.insertBefore(poolC, topCirc);
    svg.insertBefore(poolV, topLabel);
    svg.insertBefore(poolY, raceGroup);

    var api = { yearText: '', draw: draw, destroy: function () {} };

    function draw(p, phaseName, overall) {
      // map controller phase names to local phase rendering
      var row;
      if (phaseName === 'Pooling wealth') {
        row = rowAt(minYear);
        var r = rOf(row.total) * C.soft(p);
        topCirc.setAttribute('r', 0); restCirc.setAttribute('r', 0);
        poolC.setAttribute('r', r.toFixed(1));
        poolV.textContent = p > 0.15 ? fmtGBP(row.total) : '';
        poolV.setAttribute('y', (300 + r + 28).toFixed(0));
        poolY.setAttribute('y', (300 + r + 46).toFixed(0));
        txtSub.textContent = 'Total household-sector net worth (ONS National Balance Sheet)';
        api.yearText = String(minYear);
        footnote.textContent = 'Source: ONS National Balance Sheet 2026, series CGRC. Area ∝ £ value.';
      } else if (phaseName === 'Top 10% vs the other 90%') {
        row = rowAt(minYear);
        poolC.setAttribute('r', (rOf(row.total) * (1 - C.soft(p * 1.4))).toFixed(1));
        poolV.textContent = ''; poolY.textContent = '';
        var s = C.soft(p);
        var top = row.total * row.wid / 100, rest = row.total - top;
        topCirc.setAttribute('r', (rOf(top) * s).toFixed(1));
        restCirc.setAttribute('r', (rOf(rest) * s).toFixed(1));
        topLabel.textContent = s > 0.5 ? fmtPct(row.wid) : '';
        restLabel.textContent = s > 0.5 ? fmtPct(100 - row.wid) : '';
        topValue.textContent = s > 0.6 ? fmtGBP(top) : '';
        restValue.textContent = s > 0.6 ? fmtGBP(rest) : '';
        topWho.textContent = 'richest 10% of individuals';
        restWho.textContent = 'the other 90%';
        setLabelPos(rOf(top) * s, rOf(rest) * s);
        txtSub.textContent = 'Who holds it? Top 10% of individuals vs the other 90% (WID.world)';
        api.yearText = String(minYear);
        footnote.textContent = 'Share series: World Inequality Database, top-10% individual net wealth share.';
      } else if (phaseName === 'Year-by-year growth') {
        var yF = C.lerp(minYear, DATA_END, C.soft(p));
        row = rowAt(yF);
        setPools(row, false);
        api.yearText = String(Math.round(yF));
        txtSub.textContent = 'Year by year — the pool grows. Values are real.';
        footnote.textContent = 'Sources: ONS National Balance Sheet (totals) · WID.world (top-10% share). Area ∝ £ value.';
        if (p > 0.02) raceGroup.setAttribute('opacity', 0.5);
      } else if (phaseName === 'The share race') {
        yF = C.lerp(minYear, DATA_END, C.soft(p));
        row = rowAt(yF);
        setPools(row, false);
        api.yearText = String(Math.round(yF));
        raceGroup.setAttribute('opacity', 1);
        raceWasTitle.setAttribute('opacity', 1);
        txtSub.textContent = 'The share race: top-10% share, 1995→2024';
        footnote.textContent = 'Red line: WID.world individual share · blue dots: ONS WAS household survey · dashed = method break.';
      } else if (phaseName.indexOf('Projection') === 0) {
        yF = C.lerp(DATA_END, maxYear, C.soft(p));
        row = rowAt(yF);
        setPools(row, true);
        api.yearText = String(Math.round(yF));
        projBadge.textContent = 'EXTRAPOLATION — trend, not forecast';
        txtSub.textContent = 'Projection to 2040: share held constant ±1pp, total at last-decade CAGR ±2pp/yr';
        footnote.textContent = 'Projection method: WID 2024 share held constant; NBS total extrapolated (last-decade CAGR). Uncertainty band shown.';
        raceGroup.setAttribute('opacity', 1);
        raceWasTitle.setAttribute('opacity', 1);
        var yr = row.year - DATA_END;
        var tHi = T_LAST * Math.pow(1 + CAGR + 0.02, yr), tLo = T_LAST * Math.pow(1 + CAGR - 0.02, yr);
        var sHi = (PROJ_SHARE + 1) / 100, sLo = (PROJ_SHARE - 1) / 100;
        topBand.setAttribute('r', rOf(tHi * sHi).toFixed(1));
        restBand.setAttribute('r', rOf(tHi * (1 - sLo)).toFixed(1));
        var top = row.total * row.wid / 100, rest = row.total - top;
        topCircProj.setAttribute('r', rOf(top).toFixed(1));
        restCircProj.setAttribute('r', rOf(rest).toFixed(1));
        topCirc.setAttribute('fill-opacity', 0.45);
        restCirc.setAttribute('fill-opacity', 0.45);
      } else if (phaseName === 'Verdict') {
        // keep the final (2040) state on screen under the verdict panel
        var rowV = rowAt(maxYear);
        setPools(rowV, true);
        var yrV = rowV.year - DATA_END;
        var tHiV = T_LAST * Math.pow(1 + CAGR + 0.02, yrV);
        var sHiV = (PROJ_SHARE + 1) / 100, sLoV = (PROJ_SHARE - 1) / 100;
        topBand.setAttribute('r', rOf(tHiV * sHiV).toFixed(1));
        restBand.setAttribute('r', rOf(tHiV * (1 - sLoV)).toFixed(1));
        topBand.setAttribute('opacity', 1); restBand.setAttribute('opacity', 1);
        raceGroup.setAttribute('opacity', 1);
        raceWasTitle.setAttribute('opacity', 1);
        txtSub.textContent = 'What the numbers say';
        api.yearText = String(Math.round(rowV.year));
      }
      txtYear.textContent = api.yearText;
    }

    if (REDUCED) {
      raceGroup.setAttribute('opacity', 1);
      raceWasTitle.setAttribute('opacity', 1);
      txtSub.textContent = 'Reduced-motion view: final state (2025 + projection)';
      footnote.textContent = 'Projection: dashed, ±band. Sources: ONS NBS 2026, WID.world 2026, ONS WAS.';
      api.yearText = '2025';
      txtYear.textContent = '2025';
    }

    return api;
  };
})();
