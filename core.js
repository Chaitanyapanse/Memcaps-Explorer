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
    const intro = h('section', { class: 'intro' });
    intro.appendChild(h('div', null, '<p>An interactive companion to the memcapacitor project: every model behind the slides, as a live simulation with its theory. Move a slider and the physics answers. Each module ends with what it means for our HZO, HfO₂ and ZrO₂ films on W, Pt and TiN.</p>'));
    intro.appendChild(h('div', { class: 'how' }, '<p><b>How to use.</b> Pick a topic below. The left column holds the controls and live read-outs; the plots update as you drag. Theory, equations and what to look for are under the plots.</p><p>Hover a curve to read values. Each plot has a <b>PNG</b> button, and <b>Export CSV</b> saves the data behind the current plot.</p>'));
    root.appendChild(intro);
    let n = 0;
    MX.sections.forEach(s => {
      const mods = MX.mods.filter(m => m.sec === s.id); if (!mods.length) return;
      const sec = h('section', { class: 'sec' });
      sec.appendChild(h('div', { class: 'sec-head' }, '<h3>' + s.title + '</h3><p>' + s.blurb + '</p>'));
      const chips = h('div', { class: 'chips' });
      mods.forEach(m => { n++; chips.appendChild(h('a', { class: 'chip', href: '#' + m.id }, '<span class="n">' + String(n).padStart(2, '0') + '</span>' + m.title)); });
      sec.appendChild(chips); root.appendChild(sec);
    });
    const docs = h('section', { class: 'sec' });
    docs.appendChild(h('div', { class: 'sec-head' }, '<h3>Literature and plan</h3><p>The 26 papers behind the models, the six new directions, and all references.</p>'));
    const dc = h('div', { class: 'chips' });
    [['papers', 'Paper library'], ['ideas', 'Six new directions'], ['refs', 'References']].forEach(p => dc.appendChild(h('a', { class: 'chip doc', href: '#' + p[0] }, p[1])));
    docs.appendChild(dc); root.appendChild(docs);
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

  function route() {
    if (stopAnim) { stopAnim(); stopAnim = null; } current = null;
    const id = (location.hash || '').replace('#', '');
    const m = MX.mods.find(x => x.id === id);
    if (m) moduleView(m); else if (MX.pages[id]) { document.getElementById('view').innerHTML = ''; MX.pages[id](document.getElementById('view')); current = null; } else home();
    window.scrollTo(0, 0);
  }
  MX.start = function () {
    const saved = loadTheme(); if (saved) document.documentElement.setAttribute('data-theme', saved);
    const tb = document.getElementById('theme');
    if (tb) tb.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', nx); saveTheme(nx); if (current) current();
    });
    window.addEventListener('hashchange', route); route();
  };
})();
