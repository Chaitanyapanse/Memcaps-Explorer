/* Core: registry, math helpers, plotting, UI builder and router for the Memcap Explorer */
(function () {
  'use strict';
  const MX = window.MX = { mods: [], sections: [], pages: {} };
  MX.sec = function (id, title, blurb) { MX.sections.push({ id, title, blurb }); };
  MX.add = function (m) { MX.mods.push(m); };

  /* ---------- math helpers ---------- */
  MX.lin = (a, b, n) => { const r = []; for (let i = 0; i < n; i++) r.push(a + (b - a) * i / (n - 1)); return r; };
  MX.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  MX.rng = function (seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  MX.gauss = function (r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  MX.erf = function (x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  MX.ncdf = x => 0.5 * (1 + MX.erf(x / Math.SQRT2));
  MX.fmt = (v, d) => { if (!isFinite(v)) return '–'; const a = Math.abs(v); if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(d === undefined ? 2 : d); return v.toFixed(d === undefined ? 2 : d); };
  MX.sci = v => { if (!isFinite(v) || v === 0) return String(v); const e = Math.floor(Math.log10(Math.abs(v))); const m = v / Math.pow(10, e); const sup = String(e).split('').map(c => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]).join(''); return m.toFixed(2) + '×10' + sup; };
  /* Preisach ensemble of square hysterons. opts: n, ec, sig, bias(i) -> offset, seed */
  MX.Preisach = class {
    constructor(o) {
      const r = MX.rng(o.seed || 11); this.n = o.n || 300; this.up = []; this.dn = []; this.s = new Array(this.n).fill(-1);
      for (let i = 0; i < this.n; i++) {
        const e = Math.max(0.08 * o.ec, o.ec * (1 + (o.sig === undefined ? 0.2 : o.sig) * MX.gauss(r)));
        const b = (o.bias ? o.bias(i, r) : 0) + (o.bsig ? o.bsig * MX.gauss(r) : 0);
        this.up.push(e + b); this.dn.push(-e + b);
      }
    }
    set(v) { this.s.fill(v); }
    apply(E) { let p = 0; for (let i = 0; i < this.n; i++) { if (E >= this.up[i]) this.s[i] = 1; else if (E <= this.dn[i]) this.s[i] = -1; p += this.s[i]; } return p / this.n; }
  };
  /* triangular sweep 0 -> +A -> -A -> +A -> 0, returns array of fields */
  MX.sweep = function (A, n, cycles) { const out = []; const c = cycles || 2; const q = Math.max(4, Math.round(n / 4)); for (let k = 0; k < c; k++) { for (let i = 0; i < q; i++) out.push(A * i / q); for (let i = 0; i < 2 * q; i++) out.push(A - 2 * A * i / (2 * q)); for (let i = 0; i < q; i++) out.push(-A + A * i / q); } out.push(0); return out; };
  /* solve small linear system (Gaussian elimination with partial pivoting) */
  MX.solve = function (A, b) { const n = b.length; const M = A.map((r, i) => r.concat([b[i]])); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; const t = M[c]; M[c] = M[p]; M[p] = t; const d = M[c][c] || 1e-12; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map((r, i) => r[n] / (r[i] || 1e-12)); };

  /* ---------- theme + plotting ---------- */
  MX.theme = function () { const cs = getComputedStyle(document.documentElement); const g = k => cs.getPropertyValue(k).trim(); return { fg: g('--ink'), muted: g('--muted'), grid: g('--grid'), bg: g('--panel'), line: g('--line'), hf: g('--hf'), c: [g('--c1'), g('--c2'), g('--c3'), g('--c4'), g('--c5')] }; };
  MX.plot = function (el, traces, layout) {
    const t = MX.theme(); const L = Object.assign({}, layout || {});
    let ci = 0;
    traces.forEach(tr => {
      const col = tr.ci !== undefined ? t.c[tr.ci % 5] : (tr.col === 'hf' ? t.hf : (tr.col === 'muted' ? t.muted : t.c[ci % 5]));
      if (tr.type === 'bar') { tr.marker = Object.assign({ color: col }, tr.marker || {}); }
      else { tr.line = Object.assign({ color: col, width: 2.5 }, tr.line || {}); if (tr.mode && tr.mode.indexOf('markers') >= 0) tr.marker = Object.assign({ color: col, size: 9 }, tr.marker || {}); }
      if (tr.ci === undefined && !tr.col) ci++;
      delete tr.ci; delete tr.col;
    });
    MX.draw(el, traces, L);
  };

  /* ---------- DOM helpers ---------- */
  const h = (tag, attrs, html) => { const e = document.createElement(tag); if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); } if (html !== undefined) e.innerHTML = html; return e; };
  MX.h = h;
  let stopAnim = null, current = null;

  function saveTheme(v) { try { localStorage.setItem('mx-theme', v); } catch (e) { /* storage unavailable */ } }
  function loadTheme() { try { return localStorage.getItem('mx-theme'); } catch (e) { return null; } }

  function home() {
    const root = document.getElementById('view'); root.innerHTML = '';
    const nMods = MX.mods.length, nSec = MX.sections.filter(s => MX.mods.some(m => m.sec === s.id)).length;
    const hero = h('section', { class: 'hero' });
    const left = h('div', { class: 'hero-text' });
    left.innerHTML = '<p class="eyebrow">Interactive physics companion</p><h2 class="hero-title">Move a slider. Watch hafnia answer.</h2>' +
      '<p class="hero-lede">Every model behind our HZO, HfO₂ and ZrO₂ memcapacitor work as a live simulation with its theory: from the Landau free energy, through the P–E loop and PUND on the tester, to electrodes, antiferroelectric memory, reservoir computing and PLD growth.</p>' +
      '<div class="stats"><div><b>' + nMods + '</b><span>live models</span></div><div><b>' + nSec + '</b><span>topics</span></div><div><b>26</b><span>papers explained</span></div></div>' +
      '<div class="hero-cta"><a class="btn primary" href="#' + MX.mods[0].id + '">Start with ' + MX.mods[0].title + ' →</a><a class="btn" href="#ideas">Six new directions</a></div>';
    const fig = h('figure', { class: 'hero-fig' });
    const cv = h('canvas', { 'aria-label': 'Animated ferroelectric hysteresis loop' }); fig.appendChild(cv);
    fig.appendChild(h('figcaption', null, 'A ferroelectric remembers: the loop traced live by 300 switching regions'));
    hero.appendChild(left); hero.appendChild(fig); root.appendChild(hero);
    const grid = h('section', { class: 'topic-grid', 'aria-label': 'Topics' });
    let n = 0;
    MX.sections.forEach(s => {
      const mods = MX.mods.filter(m => m.sec === s.id); if (!mods.length) return;
      const a = n + 1, b = n + mods.length; n = b;
      const card = h('article', { class: 'topic' });
      card.innerHTML = '<p class="range">' + String(a).padStart(2, '0') + (b > a ? '–' + String(b).padStart(2, '0') : '') + '</p><h3><a href="#' + mods[0].id + '">' + s.title + '</a></h3><p class="blurb">' + s.blurb + '</p><ul>' + mods.map(m => '<li><a href="#' + m.id + '">' + m.title + '</a></li>').join('') + '</ul>';
      grid.appendChild(card);
    });
    const lit = h('article', { class: 'topic lit' });
    lit.innerHTML = '<p class="range">Library</p><h3><a href="#papers">Papers and plan</a></h3><p class="blurb">The 26 papers behind the models with their physics, six new research directions, and all references.</p><ul><li><a href="#papers">Paper library</a></li><li><a href="#ideas">Six new directions</a></li><li><a href="#refs">References</a></li></ul>';
    grid.appendChild(lit); root.appendChild(grid);
    root.appendChild(h('p', { class: 'how' }, 'In every model: drag the sliders on the left, read the live values, hover a curve for numbers. Theory, equations and what it means for our samples sit under the plots. Each plot has a PNG button; Export CSV saves its data.'));
    /* hero animation: Preisach loop traced live */
    const pre = new MX.Preisach({ n: 300, ec: 1, sig: 0.25, seed: 5 }); pre.set(-1);
    const trail = []; let on = true, t0 = null, id = 0;
    const draw = ts => {
      if (!on) return; if (t0 === null) t0 = ts; const t = (ts - t0) / 1000;
      const r = cv.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; const W = Math.max(260, r.width), H = Math.max(200, r.height);
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); const th = MX.theme();
      g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
      const E = 2.2 * Math.sin(t * 0.9); const P = pre.apply(E); trail.push([E, P]); if (trail.length > 420) trail.shift();
      const X = e => W / 2 + e / 2.5 * (W / 2 - 24), Y = p => H / 2 - p * (H / 2 - 30);
      g.strokeStyle = th.line; g.lineWidth = 1; g.beginPath(); g.moveTo(16, Y(0)); g.lineTo(W - 16, Y(0)); g.moveTo(X(0), 16); g.lineTo(X(0), H - 16); g.stroke();
      g.fillStyle = th.muted; g.font = '600 12px IBM Plex Sans, system-ui, sans-serif'; g.textAlign = 'right'; g.fillText('E', W - 18, Y(0) - 8); g.textAlign = 'left'; g.fillText('P', X(0) + 8, 26);
      for (let i = 1; i < trail.length; i++) { g.strokeStyle = th.c[0]; g.globalAlpha = i / trail.length; g.lineWidth = 3; g.beginPath(); g.moveTo(X(trail[i - 1][0]), Y(trail[i - 1][1])); g.lineTo(X(trail[i][0]), Y(trail[i][1])); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = th.hf; g.beginPath(); g.arc(X(E), Y(P), 7, 0, 6.2832); g.fill();
      const cols = 30, rows = 10, bw = (W - 32) / cols; for (let i = 0; i < cols * rows && i < pre.n; i++) { g.fillStyle = pre.s[i] > 0 ? th.hf : th.c[0]; g.globalAlpha = 0.18; g.fillRect(16 + (i % cols) * bw, H - 14 - (rows - Math.floor(i / cols)) * 5, bw - 1, 4); } g.globalAlpha = 1;
      id = requestAnimationFrame(draw);
    };
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { for (let k = 0; k < 400; k++) { const E = 2.2 * Math.sin(k * 0.02); trail.push([E, pre.apply(E)]); } }
    id = requestAnimationFrame(draw); stopAnim = () => { on = false; cancelAnimationFrame(id); };
    if (reduce) setTimeout(() => { if (stopAnim) stopAnim(); }, 50);
  }

  function moduleView(m) {
    const root = document.getElementById('view'); root.innerHTML = '';
    const idx = MX.mods.indexOf(m); const s = MX.sections.find(x => x.id === m.sec);
    root.appendChild(h('header', { class: 'mod-head' }, '<p class="eyebrow">' + (s ? s.title : '') + ' · model ' + String(idx + 1).padStart(2, '0') + '</p><h2>' + m.title + '</h2><p class="lede">' + m.lede + '</p>'));
    const lab = h('section', { class: 'lab' });
    const ctl = h('aside', { class: 'controls', 'aria-label': 'Controls' });
    const plots = h('div', { class: 'plots' + (m.layout === 'two' ? ' two' : '') });
    lab.appendChild(ctl); lab.appendChild(plots); root.appendChild(lab);
    const p = {}; const outs = {};
    (m.controls || []).forEach(c => {
      const id = m.id + '-' + c.id; const box = h('div', { class: 'ctl' });
      if (c.type === 'select') {
        box.innerHTML = '<label for="' + id + '">' + c.label + '</label>';
        const sel = h('select', { id }); c.options.forEach(o => { const op = h('option', { value: o[0] }, o[1]); if (o[0] === c.value) op.selected = true; sel.appendChild(op); });
        sel.addEventListener('change', () => { p[c.id] = sel.value; run(); }); box.appendChild(sel); p[c.id] = c.value;
      } else {
        box.innerHTML = '<label for="' + id + '"><span>' + c.label + '</span><output id="' + id + '-o"></output></label>';
        const inp = h('input', { type: 'range', id, min: c.min, max: c.max, step: c.step, value: c.value }); box.appendChild(inp);
        const show = () => { const v = parseFloat(inp.value); p[c.id] = v; document.getElementById(id + '-o').textContent = c.fmt ? c.fmt(v) : (MX.fmt(v, c.d === undefined ? 2 : c.d) + (c.unit ? ' ' + c.unit : '')); };
        inp.addEventListener('input', () => { show(); run(); }); outs[c.id] = show; setTimeout(show, 0); p[c.id] = c.value;
      }
      if (c.hint) box.appendChild(h('span', { class: 'hint' }, c.hint));
      ctl.appendChild(box);
    });
    const ro = h('dl', { class: 'readout' }); ctl.appendChild(ro);
    const act = h('div', { class: 'ctl-actions' });
    const reset = h('button', { class: 'btn', type: 'button' }, 'Reset'); const csv = h('button', { class: 'btn', type: 'button' }, 'Export CSV');
    act.appendChild(reset); act.appendChild(csv); ctl.appendChild(act);
    const slots = {}; (m.plots || ['a']).forEach(k => { const d = h('div', { class: 'plot', id: m.id + '-' + k, style: 'height:' + (m.height || 400) + 'px' }); plots.appendChild(d); slots[k] = d; });
    if (m.caption) plots.appendChild(h('p', { class: 'cap' }, m.caption));
    let data = null;
    const ctx = {
      el: slots,
      plot: (k, tr, lay) => MX.plot(slots[k], tr, lay),
      out: rows => { ro.innerHTML = rows.map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join(''); },
      csv: (head, rows) => { data = { head, rows }; },
      canvas: k => { let cv = slots[k].querySelector('canvas'); if (!cv) { slots[k].innerHTML = ''; cv = h('canvas'); slots[k].appendChild(cv); } const r = slots[k].getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; cv.width = Math.max(300, r.width) * dpr; cv.height = Math.max(200, r.height) * dpr; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return { cv, g, W: cv.width / dpr, H: cv.height / dpr }; },
      anim: f => { if (stopAnim) stopAnim(); let on = true, t0 = null, id = 0; const k = ts => { if (!on) return; if (t0 === null) t0 = ts; f((ts - t0) / 1000); id = requestAnimationFrame(k); }; id = requestAnimationFrame(k); stopAnim = () => { on = false; cancelAnimationFrame(id); }; },
      p
    };
    function run() { try { m.update(p, ctx); } catch (e) { console.error(e); } }
    reset.addEventListener('click', () => { (m.controls || []).forEach(c => { const el = document.getElementById(m.id + '-' + c.id); el.value = c.value; p[c.id] = c.value; if (outs[c.id]) outs[c.id](); }); run(); });
    csv.addEventListener('click', () => {
      if (!data) return; const txt = [data.head.join(',')].concat(data.rows.map(r => r.join(','))).join('\n');
      const a = h('a', { href: URL.createObjectURL(new Blob([txt], { type: 'text/csv' })), download: m.id + '.csv' }); document.body.appendChild(a); a.click(); a.remove();
    });
    const th = h('section', { class: 'theory' });
    th.appendChild(h('article', null, '<h3>Theory</h3>' + m.theory));
    const side = h('div', { class: 'side' });
    if (m.look) side.appendChild(h('div', { class: 'note' }, '<p class="eyebrow">What to look for</p>' + m.look));
    if (m.ours) side.appendChild(h('div', { class: 'note ours' }, '<p class="eyebrow">For our samples</p>' + m.ours));
    if (m.refs) side.appendChild(h('div', { class: 'note' }, '<p class="eyebrow">Read further</p>' + m.refs));
    th.appendChild(side); root.appendChild(th);
    const prev = MX.mods[idx - 1], next = MX.mods[idx + 1];
    root.appendChild(h('nav', { class: 'pager', 'aria-label': 'Module navigation' }, (prev ? '<a class="btn" href="#' + prev.id + '">← ' + prev.title + '</a>' : '<a class="btn" href="#">← All models</a>') + (next ? '<a class="btn primary" href="#' + next.id + '">' + next.title + ' →</a>' : '<a class="btn primary" href="#papers">Paper library →</a>')));
    current = run; setTimeout(run, 0);
  }

  function buildNav() {
    const nav = document.getElementById('tabs'); if (!nav) return; nav.innerHTML = '';
    const row = h('div', { class: 'tabrow' });
    row.appendChild(h('a', { class: 'tab', href: '#', 'data-sec': 'home' }, 'Overview'));
    MX.sections.forEach(s => { const first = MX.mods.find(m => m.sec === s.id); const SH = { found: 'Foundations', meas: 'Measurements', memcap: 'Memcapacitors', elec: 'Electrodes', switch: 'Switching', layers: 'Layers', time: 'Memory in time', pld: 'PLD growth' }; if (first) row.appendChild(h('a', { class: 'tab', href: '#' + first.id, 'data-sec': s.id }, SH[s.id] || s.title)); });
    row.appendChild(h('a', { class: 'tab', href: '#papers', 'data-sec': 'lit' }, 'Papers & plan'));
    nav.appendChild(row); nav.appendChild(h('div', { class: 'subrow' }));
  }
  function updateNav(id) {
    const nav = document.getElementById('tabs'); if (!nav) return;
    const m = MX.mods.find(x => x.id === id); const sec = m ? m.sec : (MX.pages[id] ? 'lit' : 'home');
    nav.querySelectorAll('.tab').forEach(t => { if (t.getAttribute('data-sec') === sec) { t.setAttribute('aria-current', 'page'); t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } else t.removeAttribute('aria-current'); });
    const sub = nav.querySelector('.subrow'); sub.innerHTML = '';
    let items = [];
    if (m) items = MX.mods.filter(x => x.sec === sec).map(x => [x.id, x.title, MX.mods.indexOf(x) + 1]);
    else if (sec === 'lit') items = [['papers', 'Paper library'], ['ideas', 'Six new directions'], ['refs', 'References']];
    else items = MX.sections.map(s => { const f = MX.mods.find(x => x.sec === s.id); return f ? [f.id, s.title + ' (' + MX.mods.filter(x => x.sec === s.id).length + ')'] : null; }).filter(Boolean);
    sub.hidden = sec === 'home';
    items.forEach(it => { const a = h('a', { class: 'subtab', href: '#' + it[0] }, (it[2] ? '<span class="n">' + String(it[2]).padStart(2, '0') + '</span>' : '') + it[1]); if (it[0] === id) a.setAttribute('aria-current', 'page'); sub.appendChild(a); });
    const cur = sub.querySelector('[aria-current]'); if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function route() {
    if (stopAnim) { stopAnim(); stopAnim = null; } current = null;
    const id = (location.hash || '').replace('#', '');
    const m = MX.mods.find(x => x.id === id);
    if (m) moduleView(m); else if (MX.pages[id]) { document.getElementById('view').innerHTML = ''; MX.pages[id](document.getElementById('view')); current = null; } else home();
    updateNav(id);
    window.scrollTo(0, 0);
  }
  MX.start = function () {
    const saved = loadTheme(); if (saved) document.documentElement.setAttribute('data-theme', saved);
    const tb = document.getElementById('theme');
    if (tb) tb.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', nx); saveTheme(nx); if (current) current();
    });
    buildNav(); window.addEventListener('hashchange', route); route();
  };
})();
