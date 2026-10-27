/* Minimal canvas plotting engine: lines, markers, bars, log axes, shapes, annotations, legend, hover, PNG export */
(function () {
  'use strict';
  const MX = window.MX;
  const SUP = '⁻⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = n => String(n).split('').map(ch => SUP['-0123456789'.indexOf(ch)] || ch).join('');
  function niceStep(span, n) { const raw = span / Math.max(1, n); const p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }
  function fmtTick(v, step) { if (Math.abs(v) < step * 1e-6) return '0'; const a = Math.abs(v); if (a >= 1e5 || a < 1e-3) { const e = Math.floor(Math.log10(a)); const m = v / Math.pow(10, e); return (Math.abs(m - Math.round(m)) < 1e-6 ? Math.round(m) : m.toFixed(1)) + '×10' + sup(e); } const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9)); return v.toFixed(Math.min(d, 6)); }

  function axisInfo(ax, vals, isLog, forceZero) {
    let lo, hi;
    if (ax.range) { lo = ax.range[0]; hi = ax.range[1]; if (isLog) { lo = Math.pow(10, lo); hi = Math.pow(10, hi); } }
    else {
      const v = vals.filter(x => isFinite(x) && (!isLog || x > 0)); if (!v.length) { lo = isLog ? 1 : 0; hi = isLog ? 10 : 1; }
      else { lo = Math.min(...v); hi = Math.max(...v); if (forceZero && !isLog) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
        if (isLog) { if (hi / lo < 1.01) { lo /= 2; hi *= 2; } const l0 = Math.log10(lo), l1 = Math.log10(hi), pd = (l1 - l0) * 0.04; lo = Math.pow(10, l0 - pd); hi = Math.pow(10, l1 + pd); }
        else { if (hi - lo < 1e-12) { lo -= 0.5; hi += 0.5; } const pd = (hi - lo) * 0.05; if (!(forceZero && lo === 0)) lo -= pd; hi += pd; } }
    }
    return { lo, hi, isLog };
  }
  function ticksFor(a, pxLen, tickvals) {
    if (tickvals) return tickvals.filter(v => v >= a.lo && v <= a.hi).map(v => ({ v, s: String(v) }));
    if (a.isLog) {
      const e0 = Math.floor(Math.log10(a.lo)), e1 = Math.ceil(Math.log10(a.hi)); const dec = e1 - e0; const every = Math.max(1, Math.ceil(dec / Math.max(2, pxLen / 60))); const t = [];
      for (let e = e0; e <= e1; e++) { if ((e - e0) % every) continue; const v = Math.pow(10, e); if (v >= a.lo * 0.999 && v <= a.hi * 1.001) t.push({ v, s: e === 0 ? '1' : e === 1 ? '10' : '10' + sup(e) }); }
      if (dec <= 1) { [2, 5].forEach(m => { for (let e = e0; e <= e1; e++) { const v = m * Math.pow(10, e); if (v >= a.lo && v <= a.hi) t.push({ v, s: fmtTick(v, v) }); } }); }
      return t;
    }
    const st = niceStep(a.hi - a.lo, Math.max(2, Math.floor(pxLen / 70))); const t = []; for (let v = Math.ceil(a.lo / st) * st; v <= a.hi + st * 1e-9; v += st) t.push({ v, s: fmtTick(v, st) }); return t;
  }
  function dashOf(d) { return d === 'dot' ? [2, 4] : d === 'dash' ? [8, 6] : d === 'dashdot' ? [8, 4, 2, 4] : []; }
  function rgba(col, a) { if (!col) return col; if (col[0] === '#' && col.length === 7) { const n = parseInt(col.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; } return col; }

  function draw(el, traces, L) {
    const t = MX.theme();
    let cv = el.querySelector('canvas.pl'); let tip = el.querySelector('.pl-tip'); let btn = el.querySelector('.pl-png');
    if (!cv) {
      el.innerHTML = ''; el.style.position = 'relative';
      cv = document.createElement('canvas'); cv.className = 'pl'; cv.style.width = '100%'; cv.style.height = '100%'; cv.style.display = 'block'; el.appendChild(cv);
      tip = document.createElement('div'); tip.className = 'pl-tip'; tip.hidden = true; el.appendChild(tip);
      btn = document.createElement('button'); btn.className = 'pl-png'; btn.type = 'button'; btn.textContent = 'PNG'; btn.title = 'Save this plot as PNG'; el.appendChild(btn);
      btn.addEventListener('click', () => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = (el.id || 'plot') + '.png'; document.body.appendChild(a); a.click(); a.remove(); });
      cv.addEventListener('mousemove', e => hover(el, e)); cv.addEventListener('mouseleave', () => { tip.hidden = true; });
      if (window.ResizeObserver) { let pend = 0; new ResizeObserver(() => { cancelAnimationFrame(pend); pend = requestAnimationFrame(() => { if (el._args) draw(el, el._args[0], el._args[1]); }); }).observe(el); }
    }
    el._args = [traces, L];
    const W = Math.max(280, el.clientWidth), H = Math.max(220, el.clientHeight); const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const FF = 'IBM Plex Sans, system-ui, -apple-system, Segoe UI, Arial, sans-serif';
    g.fillStyle = t.bg; g.fillRect(0, 0, W, H);
    /* title + legend layout */
    let top = 10; const title = L.title ? (typeof L.title === 'string' ? L.title : L.title.text) : '';
    if (title) { g.font = '600 14px ' + FF; g.fillStyle = t.fg; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(title, 14, top, W - 80); top += 22; }
    const named = traces.filter(tr => tr.name && tr.showlegend !== false);
    const showLeg = L.showlegend !== false && named.length > 1; const legItems = [];
    if (showLeg) { g.font = '12px ' + FF; let x = 14, y = top; named.forEach(tr => { const w = 26 + g.measureText(tr.name).width + 14; if (x + w > W - 50 && x > 14) { x = 14; y += 18; } legItems.push({ tr, x, y }); x += w; }); top = y + 22; }
    const bars = traces.filter(tr => tr.type === 'bar'); const cats = [];
    bars.forEach(b => b.x.forEach(c => { if (cats.indexOf(String(c)) < 0) cats.push(String(c)); }));
    const xa = L.xaxis || {}, ya = L.yaxis || {}; const xLog = xa.type === 'log', yLog = ya.type === 'log';
    const xs = [], ys = []; traces.forEach(tr => { if (tr.type !== 'bar') (tr.x || []).forEach(v => xs.push(+v)); (tr.y || []).forEach(v => ys.push(+v)); });
    (L.shapes || []).forEach(s => { if ((s.xref || 'x') === 'x') { xs.push(s.x0, s.x1); } if ((s.yref || 'y') === 'y') { ys.push(s.y0, s.y1); } });
    const X = cats.length ? { lo: -0.5, hi: cats.length - 0.5, cat: true } : axisInfo(xa, xs, xLog, xa.rangemode === 'tozero');
    const Y = axisInfo(ya, ys, yLog, ya.rangemode === 'tozero' || bars.length > 0);
    g.font = '12px ' + FF; const yt = ticksFor(Y, H - top - 60); const ylw = Math.max(30, ...yt.map(k => g.measureText(k.s).width));
    const pl = 22 + ylw + (ya.title ? 18 : 0), pr = W - 16, pt = top + 6, pb = H - (xa.title ? 50 : 32);
    const fx = v => X.cat ? pl + (v - X.lo) / (X.hi - X.lo) * (pr - pl) : X.isLog ? pl + (Math.log10(v) - Math.log10(X.lo)) / (Math.log10(X.hi) - Math.log10(X.lo)) * (pr - pl) : pl + (v - X.lo) / (X.hi - X.lo) * (pr - pl);
    const fy = v => Y.isLog ? pb - (Math.log10(v) - Math.log10(Y.lo)) / (Math.log10(Y.hi) - Math.log10(Y.lo)) * (pb - pt) : pb - (v - Y.lo) / (Y.hi - Y.lo) * (pb - pt);
    const sx = (v, ref) => ref === 'paper' ? pl + v * (pr - pl) : fx(v); const sy = (v, ref) => ref === 'paper' ? pb - v * (pb - pt) : fy(v);
    /* grid */
    g.lineWidth = 1; g.strokeStyle = t.grid; g.setLineDash([]); g.fillStyle = t.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
    yt.forEach(k => { const y = fy(k.v); if (y < pt - 1 || y > pb + 1) return; g.beginPath(); g.moveTo(pl, y); g.lineTo(pr, y); g.stroke(); g.fillText(k.s, pl - 6, y); });
    g.textAlign = 'center'; g.textBaseline = 'top';
    if (X.cat) cats.forEach((c, i) => { const x = fx(i); const s = c.length > 18 && cats.length > 3 ? c.slice(0, 16) + '…' : c; g.fillText(s, x, pb + 6); });
    else { const xt = ticksFor(X, pr - pl, xa.tickvals); xt.forEach(k => { const x = fx(k.v); if (x < pl - 1 || x > pr + 1) return; g.beginPath(); g.moveTo(x, pt); g.lineTo(x, pb); g.stroke(); g.fillText(k.s, x, pb + 6); }); }
    g.strokeStyle = t.line; g.beginPath(); g.moveTo(pl, pt); g.lineTo(pl, pb); g.lineTo(pr, pb); g.stroke();
    if (!X.cat && !X.isLog && X.lo < 0 && X.hi > 0) { g.strokeStyle = t.line; g.beginPath(); g.moveTo(fx(0), pt); g.lineTo(fx(0), pb); g.stroke(); }
    if (!Y.isLog && Y.lo < 0 && Y.hi > 0) { g.strokeStyle = t.line; g.beginPath(); g.moveTo(pl, fy(0)); g.lineTo(pr, fy(0)); g.stroke(); }
    g.fillStyle = t.fg; g.font = '600 12px ' + FF;
    if (xa.title) { g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(typeof xa.title === 'string' ? xa.title : xa.title.text, (pl + pr) / 2, H - 8); }
    if (ya.title) { g.save(); g.translate(14, (pt + pb) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(typeof ya.title === 'string' ? ya.title : ya.title.text, 0, 0); g.restore(); }
    g.save(); g.beginPath(); g.rect(pl, pt - 2, pr - pl, pb - pt + 4); g.clip();
    const shape = s => { const x0 = sx(s.x0, s.xref || 'x'), x1 = sx(s.x1, s.xref || 'x'), y0 = sy(s.y0, s.yref || 'y'), y1 = sy(s.y1, s.yref || 'y'); if (s.type === 'rect') { g.fillStyle = s.fillcolor || 'rgba(0,0,0,0.05)'; g.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); } else { const ln = s.line || {}; g.strokeStyle = ln.color === 'muted' || !ln.color ? t.muted : ln.color; g.lineWidth = ln.width || 1; g.setLineDash(dashOf(ln.dash)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]); } };
    (L.shapes || []).filter(s => s.type === 'rect' || s.layer === 'below').forEach(shape);
    const pts = [];
    if (bars.length) { const nb = bars.length; const bw = (pr - pl) / cats.length * 0.7 / (L.barmode === 'group' || nb > 1 ? nb : 1);
      bars.forEach((b, bi) => b.x.forEach((c, i) => { const ci = cats.indexOf(String(c)); const v = +b.y[i]; if (!isFinite(v)) return; const xc = fx(ci) - (nb > 1 ? (nb - 1) * bw / 2 : 0) + bi * bw; const y0 = Y.isLog ? pb : fy(Math.max(Y.lo, 0)); const y1 = fy(Y.isLog ? Math.max(v, Y.lo) : v);
        const col = Array.isArray(b.marker && b.marker.color) ? b.marker.color[i] : (b.marker && b.marker.color) || t.c[0]; g.fillStyle = col; g.fillRect(xc - bw / 2 + 1, Math.min(y0, y1), bw - 2, Math.abs(y1 - y0)); pts.push({ x: xc, y: y1, tr: b, i, label: c, val: v }); })); }
    traces.forEach(tr => {
      if (tr.type === 'bar') return; const mode = tr.mode || 'lines'; const ln = tr.line || {}; const col = ln.color || (tr.marker && tr.marker.color) || t.c[0];
      const P = []; for (let i = 0; i < tr.x.length; i++) { const xv = +tr.x[i], yv = +tr.y[i]; const ok = isFinite(xv) && isFinite(yv) && (!X.isLog || xv > 0) && (!Y.isLog || yv > 0) && tr.y[i] !== null; P.push(ok ? [fx(xv), fy(yv), xv, yv, i] : null); }
      if (mode.indexOf('lines') >= 0) { g.strokeStyle = col; g.lineWidth = ln.width || 2.5; g.lineJoin = 'round'; g.setLineDash(dashOf(ln.dash)); g.beginPath(); let pen = false, last = null;
        P.forEach(p => { if (!p) { pen = false; return; } if (!pen) { g.moveTo(p[0], p[1]); pen = true; } else { if (ln.shape === 'hv' && last) g.lineTo(p[0], last[1]); g.lineTo(p[0], p[1]); } last = p; }); g.stroke(); g.setLineDash([]); }
      if (mode.indexOf('markers') >= 0) { const mk = tr.marker || {}; const r = (mk.size || 9) / 2; g.fillStyle = mk.color || col; g.strokeStyle = mk.color || col;
        P.forEach(p => { if (!p) return; if (mk.symbol === 'line-ns-open') { g.lineWidth = 2; g.beginPath(); g.moveTo(p[0], p[1] - r); g.lineTo(p[0], p[1] + r); g.stroke(); } else { g.beginPath(); g.arc(p[0], p[1], r, 0, 6.2832); g.fill(); } }); }
      if (mode.indexOf('text') >= 0 && tr.text) { g.fillStyle = t.fg; g.font = '600 12px ' + FF; g.textAlign = 'center'; g.textBaseline = 'bottom'; P.forEach((p, i) => { if (p) g.fillText(tr.text[i], p[0] + (tr.textposition === 'top right' ? 18 : 0), p[1] - 8); }); }
      const step = Math.max(1, Math.floor(P.length / 400)); P.forEach((p, i) => { if (p && i % step === 0) pts.push({ x: p[0], y: p[1], tr, xv: p[2], yv: p[3] }); });
    });
    (L.shapes || []).filter(s => s.type !== 'rect' && s.layer !== 'below').forEach(shape);
    g.restore();
    (L.annotations || []).forEach(a => { const xr = a.xref || 'x', yr = a.yref || 'y'; let xv = a.x, yv = a.y; if (xr === 'x' && X.isLog) xv = Math.pow(10, xv); if (yr === 'y' && Y.isLog) yv = Math.pow(10, yv); const x = sx(xv, xr), y = sy(yv, yr); g.font = '600 ' + ((a.font && a.font.size) || 12) + 'px ' + FF; g.fillStyle = (a.font && a.font.color) || t.fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(a.text, x, y); });
    if (showLeg) { g.font = '12px ' + FF; g.textAlign = 'left'; g.textBaseline = 'middle'; legItems.forEach(it => { const tr = it.tr; const col = tr.type === 'bar' ? (Array.isArray(tr.marker.color) ? tr.marker.color[0] : tr.marker.color) : ((tr.line && tr.line.color) || (tr.marker && tr.marker.color)); g.strokeStyle = col; g.fillStyle = col; if ((tr.mode || 'lines').indexOf('lines') >= 0 && tr.type !== 'bar') { g.lineWidth = 2.5; g.setLineDash(dashOf(tr.line && tr.line.dash)); g.beginPath(); g.moveTo(it.x, it.y + 6); g.lineTo(it.x + 20, it.y + 6); g.stroke(); g.setLineDash([]); } else { g.beginPath(); g.arc(it.x + 10, it.y + 6, 5, 0, 6.2832); g.fill(); } g.fillStyle = t.fg; g.fillText(tr.name, it.x + 26, it.y + 6); }); }
    el._hover = { pts, X, Y, xa, ya };
    void rgba;
  }
  function hover(el, e) {
    const hv = el._hover; const tip = el.querySelector('.pl-tip'); if (!hv || !hv.pts.length) return;
    const r = el.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; let best = null, bd = 900;
    hv.pts.forEach(p => { const d = (p.x - mx) ** 2 + (p.y - my) ** 2; if (d < bd) { bd = d; best = p; } });
    if (!best) { tip.hidden = true; return; }
    const f = v => { if (typeof v !== 'number') return v; const a = Math.abs(v); return (a !== 0 && (a < 1e-3 || a >= 1e5)) ? v.toExponential(2) : (+v.toPrecision(4)).toString(); };
    tip.textContent = (best.tr.name ? best.tr.name + ': ' : '') + (best.label !== undefined ? best.label + ' → ' + f(best.val) : f(best.xv) + ', ' + f(best.yv));
    tip.hidden = false; tip.style.left = Math.min(r.width - 220, Math.max(4, best.x + 10)) + 'px'; tip.style.top = Math.max(4, best.y - 34) + 'px';
  }
  MX.draw = draw;
})();
