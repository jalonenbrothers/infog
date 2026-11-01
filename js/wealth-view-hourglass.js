/* Infog #1 — view: HOURGLASS (draft-2 concept D).
 *
 * Total wealth pours in from above (inflows) and drains below (outflows)
 * through a neck whose horizontal position IS the 10/90 share boundary.
 * Upper chamber = richest 10% ("10 people"), lower chamber = the other 90
 * ("90 people"). The neck slides left/right as the share shifts, year by
 * year (real data 1995-2025), then DASHES for the 2026-2040 extrapolation
 * with a widening band.
 *
 * Flow honesty: there is no published wealth-flow series, so the streams
 * are stylised from the annual change in net worth (delta-total); the
 * exact on-screen wording is kept: "stylised from annual change in net
 * worth (no public flow series exists)".
 *
 * The chamber FILL HEIGHTS are area-proportional to the real £ values
 * (chamber widths are equal; height ∝ £bn), so the split is honest too.
 * Vanilla SVG + requestAnimationFrame. No libraries.
 */
(function () {
  'use strict';
  var C = window.WealthCore;
  if (!C) return;
  window.WealthViews = window.WealthViews || {};

  window.WealthViews.hourglass = function (stage, M, REDUCED) {
    var el = C.el, fmtGBP = C.fmtGBP, fmtPct = C.fmtPct;
    var W = 720, H = 640;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });

    var txtTitle = el('text', { x: 24, y: 40, 'class': 'stage-title' });
    var txtSub = el('text', { x: 24, y: 62, 'class': 'stage-sub' });
    var txtYear = el('text', { x: W - 24, y: 78, 'text-anchor': 'end', 'class': 'year-big' });
    var projBadge = el('text', { x: W - 24, y: 104, 'text-anchor': 'end',
      'class': 'stage-sub', fill: '#b9a86a', 'font-weight': '700' });
    txtTitle.textContent = 'The hourglass: wealth pours in, the neck divides it';

    /* geometry: a wide hourglass centred at x=360 */
    var CX = 360;
    var TOP_Y = 200, NECK_Y = 400, BOT_Y = 590;   // chamber vertical extents
    var SIDE = 230;       // half-width of chamber walls
    var NECK_H = 26;      // half-height of the neck pinch

    /* glass outline: two trapezoids + neck (drawn once) */
    var outline = el('path', { fill: 'none', stroke: '#8f9ab5', 'stroke-width': 2,
      d: 'M' + (CX - SIDE) + ',' + TOP_Y +
         ' L' + (CX - 26) + ',' + (NECK_Y - NECK_H) +
         ' L' + (CX - 26) + ',' + (NECK_Y + NECK_H) +
         ' L' + (CX - SIDE) + ',' + BOT_Y +
         ' L' + (CX + SIDE) + ',' + BOT_Y +
         ' L' + (CX + 26) + ',' + (NECK_Y + NECK_H) +
         ' L' + (CX + 26) + ',' + (NECK_Y - NECK_H) +
         ' L' + (CX + SIDE) + ',' + TOP_Y + ' Z' });

    /* chamber fills (widths shrink toward the neck) — area ∝ £ via height */
    var topFill = el('path', { fill: '#c14646', 'fill-opacity': '0.92' });
    var botFill = el('path', { fill: '#33456e', 'fill-opacity': '0.9' });
    var topFillProj = el('path', { fill: 'none', stroke: '#b9a86a', 'stroke-width': 2, 'stroke-dasharray': '5 4' });
    var botFillProj = el('path', { fill: 'none', stroke: '#b9a86a', 'stroke-width': 2, 'stroke-dasharray': '5 4' });
    var bandTop = el('path', { fill: '#b9a86a', 'fill-opacity': '0.18' });
    var bandBot = el('path', { fill: '#b9a86a', 'fill-opacity': '0.18' });

    /* neck: a sliding vertical divider whose x IS the share boundary.
     * We draw the neck as two short guide lines converging on the
     * boundary x, plus a marked gap (the "hole" of the hourglass). */
    var neckL = el('line', { stroke: '#8f9ab5', 'stroke-width': 2 });
    var neckR = el('line', { stroke: '#8f9ab5', 'stroke-width': 2 });
    var neckMark = el('circle', { r: 5, fill: '#f4efe4', stroke: '#a63a3a', 'stroke-width': 2 });
    var neckPct = el('text', { 'text-anchor': 'middle', 'class': 'pool-label', fill: '#f4efe4', 'font-size': '13' });

    /* flows: streams of small circles falling in from above and draining
     * below. Sizes are stylised from |delta total|; count/opacity scaled. */
    var inflow = el('g', {});
    var outflow = el('g', {});
    var NIN = 14, NOUT = 8;
    for (var i = 0; i < NIN; i++) {
      inflow.appendChild(el('circle', { r: 3.2, fill: '#b9a86a', opacity: 0 }));
    }
    for (var o = 0; o < NOUT; o++) {
      outflow.appendChild(el('circle', { r: 3.2, fill: '#6b7186', opacity: 0 }));
    }
    /* labels around the glass */
    var topWho = el('text', { x: CX, y: TOP_Y - 40, 'text-anchor': 'middle', 'class': 'stage-sub' });
    topWho.textContent = '10 people — the richest 10%';
    var botWho = el('text', { x: CX, y: BOT_Y + 34, 'text-anchor': 'middle', 'class': 'stage-sub' });
    botWho.textContent = '90 people — everyone else';
    var sideTen = el('text', { x: 24, y: TOP_Y + 26, 'class': 'pool-value', fill: '#c14646', 'font-size': '1.1rem' });
    var sideNinety = el('text', { x: 24, y: BOT_Y - 16, 'class': 'pool-value', fill: '#33456e', 'font-size': '1.1rem' });
    var sideTenCap = el('text', { x: 24, y: TOP_Y + 44, 'class': 'stage-sub', 'font-size': '11' });
    var sideNinetyCap = el('text', { x: 24, y: BOT_Y + 2, 'class': 'stage-sub', 'font-size': '11' });
    var totalLbl = el('text', { x: W - 24, y: TOP_Y - 40, 'text-anchor': 'end', 'class': 'pool-value' });
    var totalCap = el('text', { x: W - 24, y: TOP_Y - 22, 'text-anchor': 'end', 'class': 'stage-sub' });
    totalCap.textContent = 'total household wealth';
    var flowNote = el('text', { x: 24, y: 128, 'class': 'stage-sub', 'font-size': '11', fill: '#8f9ab5' });
    flowNote.textContent = 'flows stylised from annual change in net worth (no public flow series exists)';
    var footnote = el('text', { x: 24, y: 628, 'class': 'stage-sub', 'font-size': '10' });

    [txtTitle, txtSub, txtYear, projBadge, flowNote].forEach(function (x) { svg.appendChild(x); });
    svg.appendChild(outline);
    svg.appendChild(bandTop); svg.appendChild(bandBot);
    svg.appendChild(topFill); svg.appendChild(botFill);
    svg.appendChild(topFillProj); svg.appendChild(botFillProj);
    svg.appendChild(inflow); svg.appendChild(outflow);
    svg.appendChild(neckL); svg.appendChild(neckR); svg.appendChild(neckMark); svg.appendChild(neckPct);
    [topWho, botWho, sideTen, sideNinety, sideTenCap, sideNinetyCap, totalLbl, totalCap, footnote].forEach(function (x) { svg.appendChild(x); });
    stage.appendChild(svg);

    var years = M.years, minYear = M.minYear, maxYear = M.maxYear, DATA_END = M.dataEnd;
    var T_LAST = M.tLast, CAGR = M.cagr, PROJ_SHARE = M.projShare;

    function rowAt(yF) { return C.rowAt(M, yF); }

    /* previous-year delta for flow sizing (real data only; projection
     * uses the extrapolated total change) */
    function deltaAt(yF) {
      var a = rowAt(yF - 1), b = rowAt(yF);
      return b.total - a.total;
    }

    /* --- geometry helpers --- */
    // half-width of chamber at vertical position y (trapezoid: wide at the
    // far ends, 26px half-width at the neck). Upper chamber spans
    // [TOP_Y, NECK_Y-NECK_H]; lower [NECK_Y+NECK_H, BOT_Y].
    function halfW(y, top) {
      var h = top ? (NECK_Y - NECK_H - y) / (NECK_Y - NECK_H - TOP_Y)   // 0 at top rim, 1 at neck
                  : (y - NECK_Y - NECK_H) / (BOT_Y - NECK_Y - NECK_H);   // 0 at neck, 1 at bottom
      return 26 + (SIDE - 26) * h;
    }
    // fill a chamber from its neck end up to fillHeight h (0..1)
    function chamberPath(hFrac, top) {
      hFrac = C.clamp(hFrac, 0, 1);
      var yFar, yNear, hh;
      if (top) { yNear = NECK_Y - NECK_H; yFar = TOP_Y; hh = (yNear - yFar) * hFrac; }
      else { yNear = NECK_Y + NECK_H; yFar = BOT_Y; hh = (yFar - yNear) * hFrac; }
      if (hh < 0.5) hh = 0.5;
      var yEnd = top ? yNear - hh : yNear + hh;
      var wNear = 26, wEnd = halfW(yEnd, top);
      return 'M' + (CX - wNear) + ',' + yNear +
             ' L' + (CX - wEnd) + ',' + yEnd +
             ' L' + (CX + wEnd) + ',' + yEnd +
             ' L' + (CX + wNear) + ',' + yNear + ' Z';
    }
    // trapezoid area between neck end and y = yEnd (for area-proportional fills)
    function chamberArea(hFrac, top) {
      hFrac = C.clamp(hFrac, 0, 1);
      var yNear = top ? NECK_Y - NECK_H : NECK_Y + NECK_H;
      var yFar = top ? TOP_Y : BOT_Y;
      var span = Math.abs(yFar - yNear);
      var h = span * hFrac;
      var wEnd = halfW(top ? yNear - h : yNear + h, top);
      return h * (26 + wEnd); // integral of width along the height
    }
    // invert: fill fraction so that chamber area ∝ £bn (with shared scale)
    var AREA_K = 0; // solved at boot from the 2040 max so the glass never overflows
    (function solveK() {
      var maxTop = 0, maxBot = 0;
      years.forEach(function (y) {
        var topV = y.total * y.wid / 100;
        if (topV > maxTop) maxTop = topV;
        if (y.total - topV > maxBot) maxBot = y.total - topV;
      });
      var areaTop = chamberArea(1, true), areaBot = chamberArea(1, false);
      AREA_K = Math.min(areaTop / maxTop, areaBot / maxBot) * 0.97;
    })();
    function fracOf(bn, top) { return chamberArea(1, top) ? (bn * AREA_K) / chamberArea(1, top) : 0; }
    function wAtFrac(hFrac, top) { // for band outlines
      var yNear = top ? NECK_Y - NECK_H : NECK_Y + NECK_H;
      var yFar = top ? TOP_Y : BOT_Y;
      var h = Math.abs(yFar - yNear) * C.clamp(hFrac, 0, 1);
      return halfW(top ? yNear - h : yNear + h, top);
    }

    function setGlass(row, proj) {
      var top = row.total * row.wid / 100, rest = row.total - top;
      var fT = C.clamp(fracOf(top, true), 0, 1);
      var fB = C.clamp(fracOf(rest, false), 0, 1);
      topFill.setAttribute('d', chamberPath(fT, true));
      botFill.setAttribute('d', chamberPath(fB, false));
      topFillProj.setAttribute('d', chamberPath(fT, true));
      botFillProj.setAttribute('d', chamberPath(fB, false));
      topFillProj.setAttribute('opacity', proj ? 1 : 0);
      botFillProj.setAttribute('opacity', proj ? 1 : 0);
      topFill.setAttribute('fill-opacity', proj ? 0.45 : 0.92);
      botFill.setAttribute('fill-opacity', proj ? 0.5 : 0.9);
      sideTen.textContent = fmtPct(row.wid);
      sideNinety.textContent = fmtPct(100 - row.wid);
      sideTenCap.textContent = fmtGBP(top);
      sideNinetyCap.textContent = fmtGBP(rest);
      totalLbl.textContent = fmtGBP(row.total);
      // neck x position IS the share boundary across the chamber width
      var f = C.clamp((row.wid - 50) / 20, 0, 1); // 50%->left, 70%->right
      var nx = CX - SIDE + 2 * SIDE * f;
      neckL.setAttribute('x1', nx - 12); neckL.setAttribute('x2', nx - 3);
      neckL.setAttribute('y1', NECK_Y - NECK_H - 14); neckL.setAttribute('y2', NECK_Y - NECK_H - 2);
      neckR.setAttribute('x1', nx + 12); neckR.setAttribute('x2', nx + 3);
      neckR.setAttribute('y1', NECK_Y + NECK_H + 2); neckR.setAttribute('y2', NECK_Y + NECK_H + 14);
      neckMark.setAttribute('cx', nx); neckMark.setAttribute('cy', NECK_Y);
      neckPct.setAttribute('x', nx); neckPct.setAttribute('y', NECK_Y + 26);
      neckPct.textContent = fmtPct(row.wid);
    }

    /* flowing particles: positions derive from absolute clock time, so
     * they drift continuously while any year is displayed. Inflow size
     * from delta-total, mirrored outflow below. */
    var flowT = 0;
    function setFlows(dtSec, row, yF) {
      if (REDUCED) return;
      flowT += dtSec;
      var d = deltaAt(yF);
      var inAmt = Math.max(d, 0), outAmt = Math.max(-d, 0);
      // gentle floor so the glass never looks dead in flat years
      var inScale = C.clamp(inAmt / 600, 0.12, 1);
      var outScale = C.clamp(outAmt / 600, 0, 1) * 0.7 + 0.05;
      var kids = inflow.children, kouts = outflow.children;
      for (var i = 0; i < NIN; i++) {
        var ph = (flowT * 0.45 + i / NIN) % 1;
        var x = CX + Math.sin(i * 2.4) * 150;
        var y = 150 + ph * (TOP_Y - 160);
        kids[i].setAttribute('cx', x.toFixed(0));
        kids[i].setAttribute('cy', y.toFixed(0));
        kids[i].setAttribute('opacity', (inScale * (1 - ph) * 0.95).toFixed(2));
      }
      for (var j = 0; j < NOUT; j++) {
        var ph2 = (flowT * 0.4 + j / NOUT) % 1;
        var x2 = CX + Math.sin(j * 2.9) * 130;
        var y2 = BOT_Y + 8 + ph2 * 34;
        kouts[j].setAttribute('cx', x2.toFixed(0));
        kouts[j].setAttribute('cy', y2.toFixed(0));
        kouts[j].setAttribute('opacity', (outScale * (1 - ph2) * 0.9).toFixed(2));
      }
    }

    var api = { yearText: '', draw: draw, destroy: function () {} };
    var lastPhase = '', lastP = -1, lastYF = minYear;

    function draw(p, phaseName, overall, dtSec) {
      var yF;
      if (phaseName === 'Pooling wealth') {
        yF = minYear;
        var row = rowAt(yF);
        // show only total, unsplit: fill both chambers proportionally to
        // a merged pool (visual: equal fill by total/2 each)
        var grow = C.soft(p);
        var half = row.total / 2;
        var fT = C.clamp(fracOf(half, true), 0, 1) * grow;
        var fB = C.clamp(fracOf(half, false), 0, 1) * grow;
        topFill.setAttribute('d', chamberPath(fT, true));
        botFill.setAttribute('d', chamberPath(fB, false));
        topFill.setAttribute('fill-opacity', '0.92');
        botFill.setAttribute('fill-opacity', '0.9');
        topFillProj.setAttribute('opacity', 0); botFillProj.setAttribute('opacity', 0);
        sideTen.textContent = ''; sideNinety.textContent = '';
        sideTenCap.textContent = 'total (unsplit)'; sideNinetyCap.textContent = '';
        totalLbl.textContent = p > 0.2 ? fmtGBP(row.total) : '';
        txtSub.textContent = 'Wealth pours in — total UK household net worth';
        api.yearText = String(minYear);
        footnote.textContent = 'Source: ONS National Balance Sheet 2026, series CGRC.';
        neckPct.textContent = ''; neckMark.setAttribute('opacity', 0);
        neckL.setAttribute('opacity', 0); neckR.setAttribute('opacity', 0);
      } else if (phaseName === 'Top 10% vs the other 90%') {
        yF = minYear;
        row = rowAt(yF);
        var s = C.soft(p);
        // neck appears, chambers re-tint to their own share
        var row95 = row;
        setGlass({ total: row95.total, wid: row95.wid }, false);
        // scale both fills by s from the merged state
        var top95 = row95.total * row95.wid / 100;
        var rest95 = row95.total - top95;
        topFill.setAttribute('d', chamberPath(C.clamp(fracOf(top95, true), 0, 1) * s, true));
        botFill.setAttribute('d', chamberPath(C.clamp(fracOf(rest95, false), 0, 1) * s, false));
        neckMark.setAttribute('opacity', s); neckL.setAttribute('opacity', s); neckR.setAttribute('opacity', s);
        txtSub.textContent = 'The neck splits the stream: where it sits IS the 10/90 divide';
        api.yearText = String(minYear);
        footnote.textContent = 'Share series: World Inequality Database, top-10% individual net wealth share.';
      } else if (phaseName === 'Year-by-year growth') {
        yF = C.lerp(minYear, DATA_END, C.soft(p));
        row = rowAt(yF); setGlass(row, false);
        txtSub.textContent = 'The neck slides as the share shifts — year by year';
        api.yearText = String(Math.round(yF));
        footnote.textContent = 'Chamber fills ∝ real £ values · Sources: ONS NBS, WID.world.';
      } else if (phaseName === 'The share race') {
        yF = C.lerp(minYear, DATA_END, C.soft(p));
        row = rowAt(yF); setGlass(row, false);
        txtSub.textContent = '1995→2024: the boundary creeps right — toward the 10%';
        api.yearText = String(Math.round(yF));
        footnote.textContent = 'Top-10% share: 52.6% (1995) → 57.1% (2024), WID.world.';
      } else if (phaseName.indexOf('Projection') === 0) {
        yF = C.lerp(DATA_END, maxYear, C.soft(p));
        row = rowAt(yF); setGlass(row, true);
        projBadge.textContent = 'EXTRAPOLATION — trend, not forecast';
        txtSub.textContent = 'Projection to 2040: dashed walls, widening band';
        api.yearText = String(Math.round(yF));
        // widening band: ±2pp/yr total, ±1pp share, drawn as soft halos
        var yr = row.year - DATA_END;
        var tHi = T_LAST * Math.pow(1 + CAGR + 0.02, yr);
        var sHi = (PROJ_SHARE + 1) / 100, sLo = (PROJ_SHARE - 1) / 100;
        var topHi = tHi * sHi, botHi = tHi * (1 - sLo);
        bandTop.setAttribute('d', chamberPath(C.clamp(fracOf(topHi, true), 0, 1), true));
        bandBot.setAttribute('d', chamberPath(C.clamp(fracOf(botHi, false), 0, 1), false));
        bandTop.setAttribute('opacity', 1); bandBot.setAttribute('opacity', 1);
        footnote.textContent = 'Projection: WID 2024 share held constant ±1pp; total at last-decade CAGR ±2pp/yr. Trend, not forecast.';
      } else if (phaseName === 'Verdict') {
        // keep the final (2040) state on screen under the verdict panel
        yF = maxYear;
        row = rowAt(yF); setGlass(row, true);
        var yrV = row.year - DATA_END;
        var tHiV = T_LAST * Math.pow(1 + CAGR + 0.02, yrV);
        var sHiV = (PROJ_SHARE + 1) / 100, sLoV = (PROJ_SHARE - 1) / 100;
        bandTop.setAttribute('d', chamberPath(C.clamp(fracOf(tHiV * sHiV, true), 0, 1), true));
        bandBot.setAttribute('d', chamberPath(C.clamp(fracOf(tHiV * (1 - sLoV), false), 0, 1), false));
        bandTop.setAttribute('opacity', 1); bandBot.setAttribute('opacity', 1);
        txtSub.textContent = 'What the numbers say';
      } else { yF = lastYF; }
      // bands visible only during Projection/Verdict (the extrapolation state)
      var bandsOn = (phaseName.indexOf('Projection') === 0 || phaseName === 'Verdict');
      if (!bandsOn) { bandTop.setAttribute('opacity', 0); bandBot.setAttribute('opacity', 0); }
      setFlows(dtSec || 0.016, rowAt(yF), yF);
      txtYear.textContent = api.yearText;
      lastPhase = phaseName; lastP = p; lastYF = yF;
    }

    if (REDUCED) {
      // static end-state: 2040 projection, band visible, no flows
      draw(1, 'Projection 2026–2040 (extrapolation)', 1, 0);
      txtSub.textContent = 'Reduced-motion view: final state (2025 + projection)';
      footnote.textContent = 'Projection: dashed, ±band. Sources: ONS NBS 2026, WID.world 2026.';
      for (var k = 0; k < NIN; k++) inflow.children[k].setAttribute('opacity', 0);
      for (var k2 = 0; k2 < NOUT; k2++) outflow.children[k2].setAttribute('opacity', 0);
    }

    return api;
  };
})();
