/* Infog #1 — UK wealth-distribution timeline.
 * Vanilla JS, requestAnimationFrame, hand-built SVG. No libraries.
 *
 * Arc: pool forms (1995) -> top-10 vs 90 split -> year-by-year growth
 * (real £ on screen) -> share race -> PROJECTION (dashed, banded,
 * labelled) -> verdict panel.
 *
 * Honesty rules baked in:
 *  - circle AREAS are proportional to £ values (r = K*sqrt(£bn))
 *  - WID is the main share series (annual); WAS shown as survey dots
 *    with its 2020-22 method break drawn as a dashed jump
 *  - projection years: share held constant +/-1pp, total at last-decade
 *    CAGR +/-2pp/yr, dashed stroke + band + "EXTRAPOLATION" label
 */
(function () {
  'use strict';

  var stage = document.getElementById('infog-stage');
  var progressWrap = document.getElementById('infog-progress');
  var playBtn = document.getElementById('infog-play');
  var restartBtn = document.getElementById('infog-restart');
  var noteEl = document.getElementById('infog-note');
  var verdictEl = document.getElementById('infog-verdict');
  if (!stage) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var DATA = null;

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
  // smooth 0..1 with a pause at both ends
  function soft(p) { return easeInOut(clamp(p, 0, 1)); }

  /* ---------- SVG skeleton ---------- */
  var W = 720, H = 640;
  var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });

  var txtTitle = el('text', { x: 24, y: 40, 'class': 'stage-title' });
  var txtSub = el('text', { x: 24, y: 62, 'class': 'stage-sub' });
  var txtYear = el('text', { x: W - 24, y: 78, 'text-anchor': 'end', 'class': 'year-big' });
  var projBadge = el('text', { x: W - 24, y: 104, 'text-anchor': 'end',
    'class': 'stage-sub', fill: '#b9a86a', 'font-weight': '700' });

  // pools
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

  // share-race mini chart (WID line + WAS dots), hidden until phase 4
  var raceGroup = el('g', { opacity: 0 });
  var raceTitle = el('text', { x: 24, y: 540, 'class': 'stage-sub', 'font-weight': '700' });
  raceTitle.textContent = 'Top-10% share of wealth, %  (two published measures)';
  var raceWasTitle = el('text', { x: 24, y: 628, 'class': 'stage-sub', 'font-size': '10' });
  raceWasTitle.textContent = 'Dots = ONS Wealth & Assets Survey (households, GB; 2020–22 round is a method break — dashed jump).';
  // built after data loads

  var footnote = el('text', { x: 24, y: 628, 'class': 'stage-sub', 'font-size': '10' });

  [txtTitle, txtSub, txtYear, projBadge].forEach(function (t) { svg.appendChild(t); });
  svg.appendChild(topBand); svg.appendChild(restBand);
  svg.appendChild(topCirc); svg.appendChild(restCirc);
  svg.appendChild(topCircProj); svg.appendChild(restCircProj);
  [topLabel, restLabel, topValue, restValue, topWho, restWho].forEach(function (t) { svg.appendChild(t); });
  svg.appendChild(raceGroup);
  svg.appendChild(raceWasTitle); raceWasTitle.setAttribute('opacity', '0');
  svg.appendChild(footnote);
  stage.appendChild(svg);

  txtTitle.textContent = 'UK household wealth, 1995–2025';
  txtSub.textContent = 'loading data…';

  /* ---------- data shaping ---------- */
  var years = [];      // [{year,total,wid,proj:boolean}]
  var minYear, maxYear;
  var PROJ_SHARE, CAGR, T_LAST;

  function shapeData(d) {
    var annual = d.annual;
    years = annual.map(function (r) {
      return { year: r.year, total: r.total_wealth_gbp_bn, wid: r.wid_top10_share_pct, proj: false };
    });
    // carry last WID share forward onto null rows (2025)
    var last = null;
    years.forEach(function (y) { if (y.wid != null) last = y.wid; else y.wid = last; });
    minYear = years[0].year; maxYear = years[years.length - 1].year;
    T_LAST = years[years.length - 1].total;
    // last-decade CAGR (2015->2025)
    var y0 = null;
    years.forEach(function (y) { if (y.year === maxYear - 10) y0 = y.total; });
    if (!y0) y0 = years[0].total;
    CAGR = Math.pow(T_LAST / y0, 1 / 10) - 1;
    PROJ_SHARE = years[years.length - 1].wid;
    // append projection years
    for (var i = 1; i <= 2; i++) {
      years.push({
        year: maxYear + i,
        total: T_LAST * Math.pow(1 + CAGR, i),
        wid: PROJ_SHARE,
        proj: true
      });
    }
  }

  function rowAt(yearF) {
    var y0 = Math.floor(yearF), y1 = Math.min(y0 + 1, years.length - 1);
    var a = null, b = null;
    for (var i = 0; i < years.length; i++) {
      if (years[i].year === y0) a = years[i];
      if (years[i].year === y1) b = years[i];
    }
    if (!a) a = years[0];
    if (!b) b = a;
    var p = yearF - a.year;
    // don't interpolate across the real->projection boundary; snap
    var proj = a.proj && b.proj;
    if (a.proj !== b.proj) { b = a; p = 0; proj = a.proj; }
    return {
      year: lerp(a.year, b.year, p),
      total: lerp(a.total, b.total, p),
      wid: lerp(a.wid, b.wid, p),
      proj: proj
    };
  }

  /* ---------- scale: area proportional to £ ---------- */
  var K = 0.95; // px per sqrt(£bn) — chosen so 2025 pools fit
  function rOf(bn) { return K * Math.sqrt(Math.max(bn, 0)); }

  function setPools(row, proj) {
    var top = row.total * row.wid / 100, rest = row.total - top;
    topCirc.setAttribute('r', rOf(top).toFixed(1));
    restCirc.setAttribute('r', rOf(rest).toFixed(1));
    topBand.setAttribute('r', rOf(top * 1.04).toFixed(1));
    restBand.setAttribute('r', rOf(rest * 1.04).toFixed(1));
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
    // keep value labels under circles as they grow
    var rT = rOf(top), rR = rOf(rest);
    topLabel.setAttribute('y', (300 - Math.min(rT * 0.35, 18)).toFixed(0));
    restLabel.setAttribute('y', (300 - Math.min(rR * 0.35, 18)).toFixed(0));
    topValue.setAttribute('y', (300 + rT + 28).toFixed(0));
    restValue.setAttribute('y', (300 + rR + 28).toFixed(0));
    topWho.setAttribute('y', (300 + rT + 46).toFixed(0));
    restWho.setAttribute('y', (300 + rR + 46).toFixed(0));
  }

  /* ---------- share race chart ---------- */
  var RX0 = 24, RX1 = 696, RY = 596, RY0 = 560, RY1 = 585; // value 50%..70% band
  function raceX(year) { return RX0 + (year - minYear) / (maxYear + 2 - minYear) * (RX1 - RX0); }
  function raceY(pct) { return RY1 - (clamp(pct, 50, 70) - 50) / 20 * (RY1 - RY0); }

  function buildRace(d) {
    var pts = years.filter(function (y) { return y.year <= maxYear; })
      .map(function (y) { return raceX(y.year).toFixed(1) + ',' + raceY(y.wid).toFixed(1); })
      .join(' ');
    raceGroup.appendChild(el('polyline', { points: pts, fill: 'none', stroke: '#c14646', 'stroke-width': 2.5 }));
    raceGroup.appendChild(el('line', { x1: RX0, y1: raceY(57.14), x2: RX1, y2: raceY(57.14),
      stroke: '#b9a86a', 'stroke-dasharray': '5 4', 'stroke-width': 1.5 }));
    // WAS dots (survey rounds) with dashed jump across method break
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
    raceGroup.appendChild(el('text', { x: RX0, y: RY + 20, 'class': 'stage-sub', 'font-size': '10' }));
  }

  /* ---------- phases ---------- */
  // master timeline, seconds
  var PH = [
    { name: 'Pooling wealth', dur: 4.5, fn: phPool },
    { name: 'Top 10% vs the other 90%', dur: 4.5, fn: phSplit },
    { name: 'Year-by-year growth', dur: 18, fn: phGrow },
    { name: 'The share race', dur: 9, fn: phRace },
    { name: 'Projection 2026–27 (extrapolation)', dur: 7, fn: phProj },
    { name: 'Verdict', dur: 1.5, fn: phVerdict }
  ];
  var TOTAL = PH.reduce(function (s, p) { return s + p.dur; }, 0);
  PH.forEach(function (p, i) { p.start = PH.slice(0, i).reduce(function (s, q) { return s + q.dur; }, 0); });

  function phaseAt(t) {
    for (var i = PH.length - 1; i >= 0; i--) if (t >= PH[i].start) return PH[i];
    return PH[0];
  }

  function phPool(p) {
    var row = rowAt(minYear);
    var r = rOf(row.total) * soft(p);
    topCirc.setAttribute('r', 0); restCirc.setAttribute('r', 0);
    // single un-split pool for phase 1: draw as a neutral circle at centre
    if (!phPool._c) {
      phPool._c = el('circle', { cx: 360, cy: 300, r: 0, fill: '#33456e', 'fill-opacity': 0.9 });
      svg.insertBefore(phPool._c, topCirc);
      phPool._v = el('text', { x: 360, y: 470, 'text-anchor': 'middle', 'class': 'pool-value' });
      svg.insertBefore(phPool._v, topLabel);
      phPool._y = el('text', { x: 360, y: 494, 'text-anchor': 'middle', 'class': 'stage-sub' });
      phPool._y.textContent = 'total UK household wealth';
      svg.insertBefore(phPool._y, raceGroup);
    }
    phPool._c.setAttribute('r', r.toFixed(1));
    phPool._v.textContent = p > 0.15 ? fmtGBP(row.total) : '';
    phPool._v.setAttribute('y', (300 + r + 28).toFixed(0));
    phPool._y.setAttribute('y', (300 + r + 46).toFixed(0));
    txtSub.textContent = 'Total household-sector net worth (ONS National Balance Sheet)';
    txtYear.textContent = String(minYear);
    footnote.textContent = 'Source: ONS National Balance Sheet 2026, series CGRC. Area ∝ £ value.';
  }

  function phSplit(p) {
    var row = rowAt(minYear);
    if (phPool._c) {
      phPool._c.setAttribute('r', (rOf(row.total) * (1 - soft(p * 1.4))).toFixed(1));
      phPool._v.textContent = ''; phPool._y.textContent = '';
    }
    var s = soft(p);
    // split circle: keep top pool centered left, rest right
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
    txtYear.textContent = String(minYear);
    footnote.textContent = 'Share series: World Inequality Database, top-10% individual net wealth share.';
  }

  function setLabelPos(rT, rR) {
    topLabel.setAttribute('y', (300 - Math.min(rT * 0.35, 18)).toFixed(0));
    restLabel.setAttribute('y', (300 - Math.min(rR * 0.35, 18)).toFixed(0));
    topValue.setAttribute('y', (300 + rT + 28).toFixed(0));
    restValue.setAttribute('y', (300 + rR + 28).toFixed(0));
    topWho.setAttribute('y', (300 + rT + 46).toFixed(0));
    restWho.setAttribute('y', (300 + rR + 46).toFixed(0));
  }

  function phGrow(p) {
    var yF = lerp(minYear, maxYear, soft(p));
    var row = rowAt(yF);
    setPools(row, false);
    txtYear.textContent = Math.round(yF);
    txtSub.textContent = 'Year by year — the pool grows. Values are real.';
    footnote.textContent = 'Sources: ONS National Balance Sheet (totals) · WID.world (top-10% share). Area ∝ £ value.';
    if (p > 0.02) raceGroup.setAttribute('opacity', 0.5); // quietly visible
  }

  function phRace(p) {
    var yF = lerp(minYear, maxYear, soft(p));
    var row = rowAt(yF);
    setPools(row, false);
    txtYear.textContent = Math.round(yF);
    raceGroup.setAttribute('opacity', 1);
    raceWasTitle.setAttribute('opacity', 1);
    txtSub.textContent = 'The share race: top-10% share, 1995→2024';
    footnote.textContent = 'Red line: WID.world individual share · blue dots: ONS WAS household survey · dashed = method break.';
    // stash final numbers for verdict
  }

  function phProj(p) {
    var yF = lerp(maxYear, maxYear + 2, soft(p));
    var row = rowAt(yF);
    setPools(row, true);
    txtYear.textContent = Math.round(yF);
    projBadge.textContent = 'EXTRAPOLATION — trend, not forecast';
    txtSub.textContent = 'Projection: share held constant ±1pp, total at last-decade CAGR ±2pp/yr';
    footnote.textContent = 'Projection method: WID 2024 share held constant; NBS total extrapolated (last-decade CAGR). Uncertainty band shown.';
    // band radii: total +/-2%/yr, share +/-1pp
    var yr = row.year - maxYear;
    var tHi = T_LAST * Math.pow(1 + CAGR + 0.02, yr), tLo = T_LAST * Math.pow(1 + CAGR - 0.02, yr);
    var sHi = (PROJ_SHARE + 1) / 100, sLo = (PROJ_SHARE - 1) / 100;
    topBand.setAttribute('r', rOf(tHi * sHi).toFixed(1));
    restBand.setAttribute('r', rOf(tHi * (1 - sLo)).toFixed(1));
    var top = row.total * row.wid / 100, rest = row.total - top;
    topCircProj.setAttribute('r', rOf(top).toFixed(1));
    restCircProj.setAttribute('r', rOf(rest).toFixed(1));
    topCirc.setAttribute('fill-opacity', 0.45);
    restCirc.setAttribute('fill-opacity', 0.45);
  }

  function phVerdict() {
    showVerdict();
    txtSub.textContent = 'What the numbers say';
  }

  /* ---------- master clock ---------- */
  var t = 0, playing = false, rafId = 0, lastTs = 0, played = false;

  function frame(ts) {
    if (!playing) return;
    var dt = Math.min((ts - lastTs) / 1000, 0.1);
    lastTs = ts;
    t += dt;
    if (t >= TOTAL) { t = TOTAL; }
    var ph = phaseAt(t);
    ph.fn(clamp((t - ph.start) / ph.dur, 0, 1));
    updateBar(ph.name);
    if (t >= TOTAL) { stop(true); return; }
    rafId = requestAnimationFrame(frame);
  }

  function updateBar(name) {
    if (progressWrap.hidden) { progressWrap.hidden = false; }
    progressWrap.querySelector('.stagebar-fill').style.width = (t / TOTAL * 100).toFixed(1) + '%';
    progressWrap.querySelector('[data-stage-label]').textContent = name;
    progressWrap.querySelector('[data-year-label]').textContent = txtYear.textContent;
  }

  function play() {
    if (playing) return;
    if (played && t >= TOTAL) { restart(); return; } // restart() calls play() itself
    playing = true;
    playBtn.hidden = true;
    restartBtn.hidden = true;
    lastTs = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function restart() {
    t = 0; played = false;
    verdictEl.hidden = true;
    raceGroup.setAttribute('opacity', 0);
    raceWasTitle.setAttribute('opacity', 0);
    projBadge.textContent = '';
    play();
  }
  function stop(done) {
    playing = false;
    played = done;
    cancelAnimationFrame(rafId);
    if (done) { restartBtn.hidden = false; }
  }

  /* ---------- verdict panel ---------- */
  function verdictFigure(num, cap) {
    return '<figure><div class="big-number">' + num + '</div><figcaption>' + cap + '</figcaption></figure>';
  }
  function showVerdict() {
    if (!verdictEl.hidden) return;
    var r1995 = years[0], r2025 = years[years.length - 3], r2024 = years[years.length - 4];
    var intl = (DATA.international_wid_top10_2024) || {};
    var intlRows = Object.keys(intl).sort(function (a, b) { return intl[b] - intl[a]; })
      .map(function (k) { return '<li>' + k + ' — ' + intl[k].toFixed(1) + '%</li>'; }).join('');
    verdictEl.innerHTML =
      '<h2>The verdict</h2>' +
      '<div class="verdict-grid">' +
      verdictFigure(fmtGBP(r1995.total), 'UK household wealth, 1995 (ONS National Balance Sheet)') +
      verdictFigure(fmtGBP(r2025.total), '…2025. A ' + (r2025.total / r1995.total).toFixed(1) + '× increase, nominal terms.') +
      verdictFigure(fmtPct(r1995.wid), 'held by the richest 10% of individuals, 1995 (WID)') +
      verdictFigure(fmtPct(r2024.wid), '…by 2024. The 90% share fell accordingly.') +
      '</div>' +
      '<h3>Two published measures — both real</h3>' +
      '<p>The animation&rsquo;s main series is WID.world&rsquo;s top-10% share of <em>individual</em> net wealth (~57%). ' +
      'The ONS Wealth &amp; Assets Survey puts the top 10% of <em>households</em> at 41% (2020–22) — and part of its drop ' +
      'from 43–45% is a pension-methodology break, not real change. Surveys also under-capture the very top.</p>' +
      '<h3>Where the UK sits, 2024 (WID top-10% share)</h3>' +
      '<ul>' + intlRows + '</ul>' +
      '<h3>What would falsify the projection</h3>' +
      '<ul><li>WAS rounds re-basing the top-10% share under the updated pension method</li>' +
      '<li>WID revising UK capitalization factors</li>' +
      '<li>Policy shocks (wealth taxes, pension reform) — the projection assumes none, which is why it stops at 2027</li></ul>' +
      '<p class="stage-sub">Sources: ONS Wealth &amp; Assets Survey Tables 2.1/2.2 (24 Jan 2025) · ONS National Balance Sheet 2026 (CGRC) · ' +
      'WID.world via Our World in Data (2026) — full traceability in the repo&rsquo;s <a href="/about/uk-wealth-timeline">sources page</a>.</p>';
    verdictEl.hidden = false;
  }

  /* ---------- static (reduced motion / no-JS-timeline) ---------- */
  function drawStatic() {
    raceGroup.setAttribute('opacity', 1);
    phProj(1);
    raceGroup.setAttribute('opacity', 1);
    raceWasTitle.setAttribute('opacity', 1);
    txtYear.textContent = '2025';
    txtSub.textContent = 'Reduced-motion view: final state (2025 + projection)';
    footnote.textContent = 'Projection: dashed, ±band. Sources: ONS NBS 2026, WID.world 2026, ONS WAS.';
    playBtn.hidden = true;
    noteEl.textContent = 'Reduced motion is respected: the animation is shown as its final state.';
    showVerdict();
  }

  /* ---------- boot ---------- */
  function boot(d) {
    DATA = d;
    shapeData(d);
    buildRace(d);
    txtSub.textContent = 'Ready.';
    if (REDUCED) { drawStatic(); return; }
    playBtn.addEventListener('click', play);
    restartBtn.addEventListener('click', restart);
    // scroll-trigger fallback: start once when the stage is well in view
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !played && !playing) {
            io.disconnect();
            setTimeout(function () { if (!playing && !played) play(); }, 600);
          }
        });
      }, { threshold: 0.45 });
      io.observe(stage);
    }
    noteEl.textContent = 'About ' + Math.round(TOTAL) + ' seconds. Areas are proportional to the real £ values. Projection is drawn dashed on purpose.';
  }

  fetch(stage.getAttribute('data-endpoint'))
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(boot)
    .catch(function (err) {
      txtSub.textContent = 'Could not load the data (' + err.message + ').';
      if (noteEl) noteEl.textContent = 'Data failed to load — the animation cannot run.';
    });
})();
