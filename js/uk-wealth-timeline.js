/* Infog #1 — UK wealth-distribution timeline, draft-2.
 * Vanilla JS, requestAnimationFrame, hand-built SVG. No libraries.
 *
 * Draft-2 adds THREE view modes over the same data and timeline:
 *   circles   — draft-1 view: two pools, area proportional to £
 *   hourglass — concept D: flows pour in/drain out, neck = 10/90 boundary
 *   people    — concept B: 100 standing figures + a coin table
 *
 * Architecture: this file is the CONTROLLER (data load, view selector,
 * master clock, progress bar, verdict panel, reduced-motion). Each view
 * is a module registered on window.WealthViews that draws into its own
 * <svg> inside the shared stage. wealth-core.js provides the shared
 * data model + helpers.
 */
(function () {
  'use strict';

  var C = window.WealthCore;
  var stage = document.getElementById('infog-stage');
  var progressWrap = document.getElementById('infog-progress');
  var playBtn = document.getElementById('infog-play');
  var restartBtn = document.getElementById('infog-restart');
  var noteEl = document.getElementById('infog-note');
  var verdictEl = document.getElementById('infog-verdict');
  var viewsel = document.getElementById('infog-view-select-list');
  if (!stage || !C) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- view registry & selection ---------- */
  var VIEWS = window.WealthViews || {};
  var viewKey = 'hourglass';
  function markSelected(key) {
    if (!viewsel) return;
    var btns = viewsel.querySelectorAll('.viewsel-item');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-view') === key;
      btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
      btns[i].classList.toggle('viewsel-active', on);
    }
  }
  if (viewsel) {
    viewsel.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.viewsel-item');
      if (btn && btn.getAttribute('data-view')) switchView(btn.getAttribute('data-view'));
    });
    markSelected(viewKey);
  }
  var current = null;   // active view instance

  function switchView(key) {
    if (!VIEWS[key] || !MODEL) return;
    viewKey = key;
    markSelected(key);
    if (current) current.destroy();
    for (var i = stage.children.length - 1; i >= 0; i--) {
      if (stage.children[i].tagName === 'svg') stage.removeChild(stage.children[i]);
    }
    current = VIEWS[key](stage, MODEL, REDUCED);
    // render the new view at the current point in the timeline
    if (REDUCED || played || t >= TOTAL) {
      current.draw(phaseProgressAt(t >= TOTAL ? TOTAL : t), phaseAt(t >= TOTAL ? TOTAL : t).name, t >= TOTAL ? 1 : t / TOTAL);
    } else if (!playing) {
      current.draw(0, PH[0].name, 0);
    } // mid-play: next frame() will render it
    noteEl.textContent = noteFor(key);
  }

  function noteFor(key) {
    var base = 'About ' + Math.round(TOTAL) + ' seconds. Everything you see is proportional to the real £ values. Projection is drawn dashed on purpose.';
    if (key === 'hourglass') {
      base = 'About ' + Math.round(TOTAL) + ' seconds. Flows are stylised from annual change in net worth (no public flow series exists). Neck width = the 10/90 split. Projection is drawn dashed on purpose.';
    } else if (key === 'people') {
      base = 'About ' + Math.round(TOTAL) + ' seconds. 10 highlighted people vs 90 muted ones; the pour forks in real 10/90 proportion. Projection is drawn dashed on purpose.';
    }
    if (REDUCED) base = 'Reduced motion is respected: the animation is shown as its final state.';
    return base;
  }

  /* ---------- shared phases ----------
   * The narrative phases are identical in all views; each view interprets
   * them (pools forming, splitting, growing, share race chart, projection,
   * verdict). The share-race chart + verdict panel are controller-owned.
   */
  var DATA = null, MODEL = null;
  var PH = [
    { name: 'Pooling wealth', dur: 4.5, idx: 0 },
    { name: 'Top 10% vs the other 90%', dur: 4.5, idx: 1 },
    { name: 'Year-by-year growth', dur: 18, idx: 2 },
    { name: 'The share race', dur: 9, idx: 3 },
    { name: 'Projection 2026–2040 (extrapolation)', dur: 12, idx: 4 },
    { name: 'Verdict', dur: 1.5, idx: 5 }
  ];
  var TOTAL = PH.reduce(function (s, p) { return s + p.dur; }, 0);
  PH.forEach(function (p, i) { p.start = PH.slice(0, i).reduce(function (s, q) { return s + q.dur; }, 0); });

  function phaseAt(t) {
    for (var i = PH.length - 1; i >= 0; i--) if (t >= PH[i].start) return PH[i];
    return PH[0];
  }
  function phaseProgressAt(t) {
    var ph = phaseAt(t);
    return C.clamp((t - ph.start) / ph.dur, 0, 1);
  }

  /* ---------- verdict panel (controller-owned) ---------- */
  function verdictFigure(num, cap) {
    return '<figure><div class="big-number">' + num + '</div><figcaption>' + cap + '</figcaption></figure>';
  }
  function showVerdict() {
    if (!verdictEl || !verdictEl.hidden) return;
    var real = MODEL.years.filter(function (y) { return !y.proj; });
    var r1995 = real[0], r2025 = real[real.length - 1], r2024 = real[real.length - 2];
    var intl = (DATA.international_wid_top10_2024) || {};
    var intlRows = Object.keys(intl).sort(function (a, b) { return intl[b] - intl[a]; })
      .map(function (k) { return '<li>' + k + ' — ' + intl[k].toFixed(1) + '%</li>'; }).join('');
    var ph2025 = C.perHeadX(r2024.wid);
    verdictEl.innerHTML =
      '<h2>The verdict</h2>' +
      '<div class="verdict-grid">' +
      verdictFigure(C.fmtGBP(r1995.total), 'UK household wealth, 1995 (ONS National Balance Sheet)') +
      verdictFigure(C.fmtGBP(r2025.total), '…2025. A ' + (r2025.total / r1995.total).toFixed(1) + '× increase, nominal terms.') +
      verdictFigure(C.fmtPct(r1995.wid), 'held by the richest 10% of individuals, 1995 (WID)') +
      verdictFigure(C.fmtPct(r2024.wid), '…by 2024. The 90% share fell accordingly.') +
      '</div>' +
      '<p class="stage-sub">Per head, one person in the richest 10% now holds about <strong>' + ph2025.toFixed(1) +
      '×</strong> the wealth of one person in the other 90% (same share, both groups are 10% and 90% of people).' +
      ' In 1995 it was about ' + C.perHeadX(r1995.wid).toFixed(1) + '×.</p>' +
      '<p class="stage-sub">Extrapolated to 2040 (trend, not forecast): total ≈ ' +
      C.fmtGBP(MODEL.tLast * Math.pow(1 + MODEL.cagr, 2040 - MODEL.dataEnd)) + ' at last-decade CAGR, top-10% share held at ' +
      C.fmtPct(MODEL.projShare) + ' ±1pp.</p>' +
      '<h3>Two published measures — both real</h3>' +
      '<p>The animation&rsquo;s main series is WID.world&rsquo;s top-10% share of <em>individual</em> net wealth (~57%). ' +
      'The ONS Wealth & Assets Survey puts the top 10% of <em>households</em> at 41% (2020–22) — and part of its drop ' +
      'from 43–45% is a pension-methodology break, not real change. Surveys also under-capture the very top.</p>' +
      '<h3>Where the UK sits, 2024 (WID top-10% share)</h3>' +
      '<ul>' + intlRows + '</ul>' +
      '<h3>What would falsify the projection</h3>' +
      '<ul><li>WAS rounds re-basing the top-10% share under the updated pension method</li>' +
      '<li>WID revising UK capitalization factors</li>' +
      '<li>Policy shocks (wealth taxes, pension reform) — the projection assumes none, which is why it is a trend extrapolation, not a forecast</li></ul>' +
      '<p class="stage-sub">Sources: ONS Wealth & Assets Survey Tables 2.1/2.2 (24 Jan 2025) · ONS National Balance Sheet 2026 (CGRC) · ' +
      'WID.world via Our World in Data (2026) — full traceability in the repo&rsquo;s <a href="/about/uk-wealth-timeline">sources page</a>.</p>';
    verdictEl.hidden = false;
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
    var p = C.clamp((t - ph.start) / ph.dur, 0, 1);
    current.draw(p, ph.name, t / TOTAL);
    updateBar(ph.name);
    if (ph.name === 'Verdict') showVerdict();
    if (t >= TOTAL) { stop(true); return; }
    rafId = requestAnimationFrame(frame);
  }

  function updateBar(name) {
    if (!progressWrap) return;
    if (progressWrap.hidden) { progressWrap.hidden = false; }
    progressWrap.querySelector('.stagebar-fill').style.width = (t / TOTAL * 100).toFixed(1) + '%';
    progressWrap.querySelector('[data-stage-label]').textContent = name;
    progressWrap.querySelector('[data-year-label]').textContent = String(current.yearText || '');
  }

  function play() {
    if (playing || !current) return;
    if (played && t >= TOTAL) { restart(); return; }
    playing = true;
    if (playBtn) playBtn.hidden = true;
    if (restartBtn) restartBtn.hidden = true;
    lastTs = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function restart() {
    t = 0; played = false;
    if (verdictEl) { verdictEl.hidden = true; }
    play();
  }
  function stop(done) {
    playing = false;
    played = done;
    cancelAnimationFrame(rafId);
    if (done && restartBtn) { restartBtn.hidden = false; }
  }

  /* ---------- boot ---------- */
  function boot(d) {
    DATA = d;
    MODEL = C.shapeData(d);
    if (viewsel && !VIEWS[viewKey]) viewKey = 'circles';
    current = VIEWS[viewKey](stage, MODEL, REDUCED);
    noteEl.textContent = noteFor(viewKey);
    if (REDUCED) {
      // static end-state in the active view
      current.draw(1, 'Projection 2026–2040 (extrapolation)', 1);
      showVerdict();
      if (playBtn) playBtn.hidden = true;
      return;
    }
    if (playBtn) playBtn.addEventListener('click', play);
    if (restartBtn) restartBtn.addEventListener('click', restart);
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
  }

  fetch(stage.getAttribute('data-endpoint'))
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(boot)
    .catch(function (err) {
      if (noteEl) noteEl.textContent = 'Could not load the data (' + err.message + ') — the animation cannot run.';
    });
})();
