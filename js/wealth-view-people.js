/* Infog #1 — view: 100 PEOPLE, ONE WEALTH TABLE (draft-2 concept B).
 *
 * A demographic strip of 100 standing figures — 10 highlighted (richest
 * 10%) vs 90 muted — then a "table" below: stacks of coins representing
 * real £ wealth. Each year new wealth POURS from above (coins entering
 * from outside the frame) and the pour FORKS in real 10/90 proportion —
 * some coins join the 10's stack, most join the 90's, and in bad years
 * coins drain away below. The 10%'s side visibly grows faster PER HEAD.
 *
 * Coin areas are proportional to £ (stack height ∝ £bn with equal
 * column width), year counter + £ labels throughout. Projection phase:
 * dashed coins + widening band + EXTRAPOLATION badge.
 *
 * Vanilla SVG + requestAnimationFrame. No libraries.
 */
(function () {
  'use strict';
  var C = window.WealthCore;
  if (!C) return;
  window.WealthViews = window.WealthViews || {};

  window.WealthViews.people = function (stage, M, REDUCED) {
    var el = C.el, fmtGBP = C.fmtGBP, fmtPct = C.fmtPct;
    var W = 720, H = 640;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });

    var txtTitle = el('text', { x: 24, y: 40, 'class': 'stage-title' });
    var txtSub = el('text', { x: 24, y: 62, 'class': 'stage-sub' });
    var txtYear = el('text', { x: W - 24, y: 78, 'text-anchor': 'end', 'class': 'year-big' });
    var projBadge = el('text', { x: W - 24, y: 104, 'text-anchor': 'end',
      'class': 'stage-sub', fill: '#b9a86a', 'font-weight': '700' });
    txtTitle.textContent = '100 people, one wealth table';

    /* ---- demographic strip: 100 standing figures ---- */
    var strip = el('g', {});
    var FIG_W = 5.2, FIG_H = 13, STRIP_Y = 128;
    var figs = [];
    for (var i = 0; i < 100; i++) {
      var fx = 30 + i * (W - 60) / 99;
      var top10 = i >= 90; // rightmost 10 highlighted
      var g = el('g', {});
      g.appendChild(el('circle', { cx: fx, cy: STRIP_Y, r: FIG_W / 2 - 0.4,
        fill: top10 ? '#c14646' : '#8f9ab5', 'fill-opacity': top10 ? '1' : '0.55' }));
      // simple body: rounded line
      g.appendChild(el('line', { x1: fx, y1: STRIP_Y + FIG_W / 2, x2: fx, y2: STRIP_Y + FIG_H,
        stroke: top10 ? '#c14646' : '#8f9ab5', 'stroke-width': FIG_W - 1,
        'stroke-linecap': 'round', 'stroke-opacity': top10 ? '1' : '0.55' }));
      strip.appendChild(g);
      figs.push(g);
    }
    var stripCapL = el('text', { x: 30, y: STRIP_Y + FIG_H + 16, 'class': 'stage-sub', 'font-size': '11' });
    var stripCapR = el('text', { x: W - 30, y: STRIP_Y + FIG_H + 16, 'text-anchor': 'end',
      'class': 'stage-sub', 'font-size': '11', fill: '#c14646', 'font-weight': '700' });
    stripCapL.textContent = '90 muted people — the other 90%';
    stripCapR.textContent = '10 highlighted — the richest 10%';

    /* ---- the wealth table ---- */
    var TABLE_Y = 560;          // tabletop line
    var MID_X = 360;            // where the pour forks
    var forkX = 430;            // boundary between the two sides
    var MAX_H = 330;            // tallest stack (2040 top-10 max)
    var tableLine = el('line', { x1: 40, y1: TABLE_Y, x2: W - 40, y2: TABLE_Y,
      stroke: '#8f9ab5', 'stroke-width': 3 });

    /* coin stacks: drawn as columns of small ellipses ("coins") — but
     * coin COUNT is capped; the stack is area-proportional via a filled
     * column whose top is decorated with a coin rim. Honesty rule:
     * column height ∝ £bn (equal widths). */
    var topCol = el('path', { fill: '#c14646', 'fill-opacity': '0.92' });
    var restCol = el('path', { fill: '#33456e', 'fill-opacity': '0.9' });
    var topColProj = el('path', { fill: 'none', stroke: '#b9a86a', 'stroke-width': 2, 'stroke-dasharray': '5 4' });
    var restColProj = el('path', { fill: 'none', stroke: '#b9a86a', 'stroke-width': 2, 'stroke-dasharray': '5 4' });
    var bandTop = el('path', { fill: '#b9a86a', 'fill-opacity': '0.18' });
    var bandBot = el('path', { fill: '#b9a86a', 'fill-opacity': '0.18' });

    /* pour: coins falling from above the frame, forking left/right */
    var pour = el('g', {});
    var NPOUR = 16;
    for (var q = 0; q < NPOUR; q++) {
      pour.appendChild(el('circle', { r: 3.4, fill: '#b9a86a', opacity: 0 }));
    }
    var drain = el('g', {});
    var NDRAIN = 6;
    for (var d0 = 0; d0 < NDRAIN; d0++) {
      drain.appendChild(el('circle', { r: 3.2, fill: '#6b7186', opacity: 0 }));
    }

    /* labels */
    var topVal = el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'class': 'pool-value', fill: '#c14646' });
    var restVal = el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'class': 'pool-value', fill: '#33456e' });
    var topHead = el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'class': 'stage-sub' });
    var restHead = el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'class': 'stage-sub' });
    var perHeadLine = el('text', { x: 24, y: 628, 'class': 'stage-sub', 'font-size': '11' });
    var totalLbl = el('text', { x: W - 24, y: STRIP_Y - 44, 'text-anchor': 'end', 'class': 'pool-value' });
    var footnote = el('text', { x: 24, y: 610, 'class': 'stage-sub', 'font-size': '10' });

    [txtTitle, txtSub, txtYear, projBadge, totalLbl].forEach(function (x) { svg.appendChild(x); });
    svg.appendChild(strip);
    svg.appendChild(stripCapL); svg.appendChild(stripCapR);
    svg.appendChild(tableLine);
    svg.appendChild(bandTop); svg.appendChild(bandBot);
    svg.appendChild(topCol); svg.appendChild(restCol);
    svg.appendChild(topColProj); svg.appendChild(restColProj);
    svg.appendChild(pour); svg.appendChild(drain);
    [topVal, restVal, topHead, restHead, perHeadLine, footnote].forEach(function (x) { svg.appendChild(x); });
    stage.appendChild(svg);

    var years = M.years, minYear = M.minYear, maxYear = M.maxYear, DATA_END = M.dataEnd;
    var T_LAST = M.tLast, CAGR = M.cagr, PROJ_SHARE = M.projShare;

    function rowAt(yF) { return C.rowAt(M, yF); }
    function deltaAt(yF) {
      var a = rowAt(yF - 1), b = rowAt(yF);
      return b.total - a.total;
    }

    /* stack scale: height ∝ £bn, cap at MAX_H for the 2040 top-10 max */
    var H_K = 0;
    (function solveHK() {
      var mx = 0;
      years.forEach(function (y) { mx = Math.max(mx, y.total, y.total * y.wid / 100); });
      H_K = MAX_H / mx;
    })();

    var SIDE_W = { top: [40, forkX - 8], rest: [forkX + 8, W - 40] }; // [x0, x1]
    function colPath(bn, side) {
      var h = Math.max(bn * H_K, 0.5);
      var x0 = SIDE_W[side][0], x1 = SIDE_W[side][1];
      return 'M' + x0 + ',' + TABLE_Y + ' L' + x0 + ',' + (TABLE_Y - h) +
             ' L' + x1 + ',' + (TABLE_Y - h) + ' L' + x1 + ',' + TABLE_Y + ' Z';
    }

    function setTable(row, proj) {
      var top = row.total * row.wid / 100, rest = row.total - top;
      topCol.setAttribute('d', colPath(top, 'top'));
      restCol.setAttribute('d', colPath(rest, 'rest'));
      topColProj.setAttribute('d', colPath(top, 'top'));
      restColProj.setAttribute('d', colPath(rest, 'rest'));
      topColProj.setAttribute('opacity', proj ? 1 : 0);
      restColProj.setAttribute('opacity', proj ? 1 : 0);
      topCol.setAttribute('fill-opacity', proj ? 0.45 : 0.92);
      restCol.setAttribute('fill-opacity', proj ? 0.5 : 0.9);
      // labels sit above each stack top
      var hT = top * H_K, hR = rest * H_K;
      var cxT = (SIDE_W.top[0] + SIDE_W.top[1]) / 2;
      var cxR = (SIDE_W.rest[0] + SIDE_W.rest[1]) / 2;
      topVal.setAttribute('x', cxT); topVal.setAttribute('y', TABLE_Y - hT - 12);
      topVal.textContent = fmtGBP(top);
      restVal.setAttribute('x', cxR); restVal.setAttribute('y', TABLE_Y - hR - 12);
      restVal.textContent = fmtGBP(rest);
      topHead.setAttribute('x', cxT); topHead.setAttribute('y', TABLE_Y - hT - 32);
      topHead.textContent = fmtPct(row.wid) + ' — 10 people';
      restHead.setAttribute('x', cxR); restHead.setAttribute('y', TABLE_Y - hR - 32);
      restHead.textContent = fmtPct(100 - row.wid) + ' — 90 people';
      totalLbl.textContent = fmtGBP(row.total);
      perHeadLine.textContent = 'Per head: one of the 10 holds ' + C.perHeadX(row.wid).toFixed(1) +
        '× the wealth of one of the 90.';
    }

    /* pour animation: coins fall from above the frame (y<0 region of the
     * viewBox is outside the visible stage top; we start at y≈STRIP_Y+30
     * above the stacks), fork at MID_X toward the side boundary. Drain
     * coins fall below the table line on loss years. */
    var flowT = 0;
    function setFlows(dtSec, row, yF) {
      if (REDUCED) return;
      flowT += dtSec;
      var d = deltaAt(yF);
      var inAmt = Math.max(d, 0), outAmt = Math.max(-d, 0);
      var inScale = C.clamp(inAmt / 600, 0.15, 1);
      var outScale = C.clamp(outAmt / 600, 0, 1);
      var share = row.wid / 100;
      var kids = pour.children;
      for (var i = 0; i < NPOUR; i++) {
        var ph = (flowT * 0.5 + i / NPOUR) % 1;
        var toTop = (i % 10) < share * 10; // fork in real 10/90 proportion
        var cx = toTop ? (SIDE_W.top[0] + SIDE_W.top[1]) / 2
                       : (SIDE_W.rest[0] + SIDE_W.rest[1]) / 2;
        var startY = 190, endY = TABLE_Y - 12;
        // arc: converge toward the stack while falling
        var t = ph;
        var x = MID_X + (cx - MID_X) * (t * t);
        var y = startY + (endY - startY) * t;
        kids[i].setAttribute('cx', x.toFixed(0));
        kids[i].setAttribute('cy', y.toFixed(0));
        kids[i].setAttribute('opacity', (inScale * Math.sin(Math.min(t * Math.PI, Math.PI)) * 0.95).toFixed(2));
        kids[i].setAttribute('fill', toTop ? '#c14646' : '#b9a86a');
      }
      var kouts = drain.children;
      for (var j = 0; j < NDRAIN; j++) {
        var ph2 = (flowT * 0.4 + j / NDRAIN) % 1;
        var x2 = 200 + j * 60;
        var y2 = TABLE_Y + 6 + ph2 * 30;
        kouts[j].setAttribute('cx', x2.toFixed(0));
        kouts[j].setAttribute('cy', y2.toFixed(0));
        kouts[j].setAttribute('opacity', (outScale * (1 - ph2) * 0.9).toFixed(2));
      }
    }

    var api = { yearText: '', draw: draw, destroy: function () {} };

    function draw(p, phaseName, overall, dtSec) {
      var yF;
      if (phaseName === 'Pooling wealth') {
        yF = minYear;
        var row = rowAt(yF);
        var grow = C.soft(p);
        topCol.setAttribute('d', colPath(row.total * grow / 2, 'top'));
        restCol.setAttribute('d', colPath(row.total * grow / 2, 'rest'));
        topColProj.setAttribute('opacity', 0); restColProj.setAttribute('opacity', 0);
        topVal.textContent = ''; restVal.textContent = '';
        topHead.textContent = 'total (unsplit)'; restHead.textContent = '';
        totalLbl.textContent = p > 0.2 ? fmtGBP(row.total) : '';
        perHeadLine.textContent = '';
        txtSub.textContent = 'Total UK household wealth — one shared table';
        api.yearText = String(minYear);
        footnote.textContent = 'Source: ONS National Balance Sheet 2026, series CGRC. Stack height ∝ £ value.';
        bandTop.setAttribute('opacity', 0); bandBot.setAttribute('opacity', 0);
      } else if (phaseName === 'Top 10% vs the other 90%') {
        yF = minYear;
        row = rowAt(yF);
        var s = C.soft(p);
        var top = row.total * row.wid / 100, rest = row.total - top;
        topCol.setAttribute('d', colPath(top * s, 'top'));
        restCol.setAttribute('d', colPath(rest * s, 'rest'));
        if (s > 0.6) {
          topVal.textContent = fmtGBP(top); restVal.textContent = fmtGBP(rest);
          topHead.textContent = fmtPct(row.wid) + ' — 10 people';
          restHead.textContent = fmtPct(100 - row.wid) + ' — 90 people';
          perHeadLine.textContent = 'Per head: one of the 10 holds ' + C.perHeadX(row.wid).toFixed(1) +
            '× the wealth of one of the 90.';
        }
        txtSub.textContent = '100 people. Watch which side of the table grows';
        api.yearText = String(minYear);
        footnote.textContent = 'Share series: World Inequality Database, top-10% individual net wealth share.';
      } else if (phaseName === 'Year-by-year growth') {
        yF = C.lerp(minYear, DATA_END, C.soft(p));
        row = rowAt(yF); setTable(row, false);
        txtSub.textContent = 'Wealth pours in and forks in real proportion';
        api.yearText = String(Math.round(yF));
        footnote.textContent = 'Stack height ∝ real £ values · Sources: ONS NBS, WID.world.';
      } else if (phaseName === 'The share race') {
        yF = C.lerp(minYear, DATA_END, C.soft(p));
        row = rowAt(yF); setTable(row, false);
        txtSub.textContent = 'The 10%' + String.fromCharCode(8217) + 's stack grows faster — per head';
        api.yearText = String(Math.round(yF));
        footnote.textContent = 'Top-10% share: 52.6% (1995) → 57.1% (2024), WID.world.';
      } else if (phaseName.indexOf('Projection') === 0) {
        yF = C.lerp(DATA_END, maxYear, C.soft(p));
        row = rowAt(yF); setTable(row, true);
        projBadge.textContent = 'EXTRAPOLATION — trend, not forecast';
        txtSub.textContent = 'Projection to 2040: dashed stacks, widening band';
        api.yearText = String(Math.round(yF));
        var yr = row.year - DATA_END;
        var tHi = T_LAST * Math.pow(1 + CAGR + 0.02, yr);
        var sHi = (PROJ_SHARE + 1) / 100, sLo = (PROJ_SHARE - 1) / 100;
        bandTop.setAttribute('d', colPath(tHi * sHi, 'top'));
        bandBot.setAttribute('d', colPath(tHi * (1 - sLo), 'rest'));
        bandTop.setAttribute('opacity', 1); bandBot.setAttribute('opacity', 1);
        footnote.textContent = 'Projection: WID 2024 share held constant ±1pp; total at last-decade CAGR ±2pp/yr. Trend, not forecast.';
      } else if (phaseName === 'Verdict') {
        // keep the final (2040) state on screen under the verdict panel
        yF = maxYear;
        row = rowAt(yF); setTable(row, true);
        var yrV = row.year - DATA_END;
        var tHiV = T_LAST * Math.pow(1 + CAGR + 0.02, yrV);
        var sHiV = (PROJ_SHARE + 1) / 100, sLoV = (PROJ_SHARE - 1) / 100;
        bandTop.setAttribute('d', colPath(tHiV * sHiV, 'top'));
        bandBot.setAttribute('d', colPath(tHiV * (1 - sLoV), 'rest'));
        bandTop.setAttribute('opacity', 1); bandBot.setAttribute('opacity', 1);
        txtSub.textContent = 'What the numbers say';
      } else { yF = minYear; }
      var bandsOn = (phaseName.indexOf('Projection') === 0 || phaseName === 'Verdict');
      if (!bandsOn) { bandTop.setAttribute('opacity', 0); bandBot.setAttribute('opacity', 0); }
      setFlows(dtSec || 0.016, rowAt(yF), yF);
      txtYear.textContent = api.yearText;
    }

    if (REDUCED) {
      draw(1, 'Projection 2026–2040 (extrapolation)', 1, 0);
      txtSub.textContent = 'Reduced-motion view: final state (2025 + projection)';
      footnote.textContent = 'Projection: dashed, ±band. Sources: ONS NBS 2026, WID.world 2026, ONS WAS.';
      for (var k = 0; k < NPOUR; k++) pour.children[k].setAttribute('opacity', 0);
      for (var k2 = 0; k2 < NDRAIN; k2++) drain.children[k2].setAttribute('opacity', 0);
    }

    return api;
  };
})();
