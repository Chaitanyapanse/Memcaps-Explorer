/* Front A: memcapacitor physics: C–V butterfly, interface depolarisation, charge-domain crossbar, read disturb */
(function () {
  const MX = window.MX;
  MX.sec('memcap', 'Memcapacitor physics', 'How a ferroelectric capacitor stores a weight as capacitance and is read without switching.');
  const E0 = 8.854e-14; /* F/cm */

  MX.add({
    id: 'butterfly', sec: 'memcap', title: 'C–V butterfly and the 0 V window', layout: 'two', plots: ['a', 'b'],
    lede: 'Each polarisation state has its own C–V curve, peaked near its switching voltage. A built-in bias shifts both, so at 0 V the two states give different capacitance.',
    controls: [
      { id: 'vb', label: 'Built-in bias V_bi', min: -1.2, max: 1.2, step: 0.01, value: 0.4, unit: 'V' },
      { id: 'vc', label: 'Coercive voltage Vc', min: 0.5, max: 2.5, step: 0.05, value: 1.0, unit: 'V' },
      { id: 'w', label: 'Peak width (spread of local Vc)', min: 0.1, max: 1.0, step: 0.01, value: 0.35, unit: 'V' },
      { id: 'vr', label: 'Read amplitude', min: 0.01, max: 0.8, step: 0.01, value: 0.1, unit: 'V' }
    ],
    update(p, c) {
      const CL = 1, A = 2.2; const C = (v, pk) => CL + A / (1 + Math.pow((v - pk) / p.w, 2));
      const vs = MX.lin(-3, 3, 361);
      const up = vs.map(v => C(v, p.vb + p.vc)), dn = vs.map(v => C(v, p.vb - p.vc));
      const cd = C(0, p.vb + p.vc), cu = C(0, p.vb - p.vc);
      c.plot('a', [{ x: vs, y: up, name: 'state P↓ (switches at +Vc + V_bi)' }, { x: vs, y: dn, name: 'state P↑ (switches at −Vc + V_bi)' }, { x: [0, 0], y: [cd, cu], mode: 'markers', name: 'read at 0 V', col: 'hf', marker: { size: 12 } }],
        { title: 'Small-signal C–V of both states', xaxis: { title: 'bias V (V)' }, yaxis: { title: 'C / C_lattice' }, shapes: [{ type: 'rect', x0: -p.vr, x1: p.vr, y0: 0, y1: 1, yref: 'paper', fillcolor: 'rgba(196,86,29,0.12)', line: { width: 0 } }] });
      const vbs = MX.lin(-1.5, 1.5, 241); const ratio = vbs.map(b => { const a = C(0, b + p.vc), d = C(0, b - p.vc); return Math.max(a, d) / Math.min(a, d); });
      const stable = vbs.map(b => Math.abs(b) < p.vc - p.w ? 1 : 0);
      c.plot('b', [{ x: vbs, y: ratio, name: 'C ratio at 0 V' }, { x: vbs, y: stable.map((s, i) => s ? null : ratio[i]), name: 'retention at risk (|V_bi| near Vc)', col: 'hf', line: { width: 4 } }, { x: [p.vb], y: [Math.max(cd, cu) / Math.min(cd, cu)], mode: 'markers', name: 'now', col: 'hf', marker: { size: 12 } }],
        { title: 'Window at 0 V vs built-in bias', xaxis: { title: 'V_bi (V)' }, yaxis: { title: 'C_high / C_low' } });
      const disturb = p.vr > Math.max(0, p.vc - Math.abs(p.vb) - p.w);
      c.out([['C(P↑) at 0 V', cu.toFixed(2) + ' × C_L'], ['C(P↓) at 0 V', cd.toFixed(2) + ' × C_L'], ['ratio', (Math.max(cd, cu) / Math.min(cd, cu)).toFixed(2) + '×'], ['read safe?', disturb ? 'no: read reaches the low tail of Vc' : 'yes']]);
      c.csv(['V', 'C_down', 'C_up'], vs.map((v, i) => [v.toFixed(3), up[i].toFixed(4), dn[i].toFixed(4)]));
    },
    theory: '<p>The capacitance measured with a small AC signal is the derivative of the displacement:</p><div class="eq">C(V) = A·dD/dV = (ε₀A/d)·[ε_L + χ_rev(P, V)/ε₀]<span class="why">ε_L is the lattice response (no memory). χ_rev comes from domain walls and regions close to switching, and it depends on the state.</span></div><p>For a film with a spread of local coercive voltages, the reversible part peaks where the most regions are about to switch. State P↓ switches on the way up, so its peak sits at +Vc; state P↑ peaks at −Vc. A built-in voltage shifts both:</p><div class="eq">V_peak = ±Vc + V_bi,&nbsp;&nbsp; V_bi ≈ S·ΔΦ/e + V_imprint</div><p>With V_bi = 0 the two curves cross at 0 V and give identical capacitance there. With V_bi ≠ 0, one state sits near its peak at 0 V and the other far from it. That difference is the non-destructive memory window.</p><p>The window grows with V_bi, but when |V_bi| approaches Vc one state is no longer stable at 0 V and retention fails. The optimum lies in between.</p>',
    look: '<ul><li>Set V_bi = 0: ratio 1, nothing to read.</li><li>Sweep V_bi: the ratio rises, then the orange segment warns that the stored state is near its switching point.</li><li>Widen the read band: when it reaches the low tail, the read starts to disturb.</li></ul>',
    ours: '<p>Compare the symmetric W/W and TiN/TiN pads with the Ti/Pt-top pads. Report C at 0 V for both states, measured with pulses, in fF/µm².</p>',
    refs: '<p>Mukherjee et al., IEDM 2023. Kim, Luo, Phadke, Read and Yu, IMW 2024. Wang et al., Nano Energy 140 (2025).</p>'
  });

  MX.add({
    id: 'depol', sec: 'memcap', title: 'Interface layer and depolarisation', layout: 'two', plots: ['a', 'b'],
    lede: 'A nanometre of dielectric between electrode and ferroelectric leaves the bound charge partly unscreened. The resulting depolarising field can exceed the coercive field.',
    controls: [
      { id: 'P', label: 'Polarisation P', min: 2, max: 40, step: 0.5, value: 20, unit: 'µC/cm²', d: 1 },
      { id: 'df', label: 'Ferroelectric thickness d_f', min: 3, max: 50, step: 0.5, value: 10, unit: 'nm', d: 1 },
      { id: 'ef', label: 'Ferroelectric εf', min: 15, max: 50, step: 1, value: 30, d: 0 },
      { id: 'di', label: 'Interface thickness d_i', min: 0, max: 3, step: 0.05, value: 1, unit: 'nm' },
      { id: 'ei', label: 'Interface εi', min: 3, max: 80, step: 1, value: 10, d: 0, hint: 'SiO₂ ≈ 4, TiOₓNᵧ ≈ 10–30, conductive WOₓ acts like εi → ∞' },
      { id: 'Ec', label: 'Coercive field', min: 0.5, max: 2.5, step: 0.05, value: 1.0, unit: 'MV/cm' }
    ],
    update(p, c) {
      const Ed = (P, df, ef, di, ei) => (P * 1e-6 / E0) * (di * 1e-7) / (ei * df * 1e-7 + ef * di * 1e-7) / 1e6;
      const dis = MX.lin(0, 3, 121); const eis = [4, 10, 25, p.ei];
      const tr = eis.map((e, i) => ({ x: dis, y: dis.map(d => Ed(p.P, p.df, p.ef, d, e)), name: (i === 3 ? 'your εi = ' : 'εi = ') + e, ci: i, line: { width: i === 3 ? 4 : 1.8, dash: i === 3 ? 'solid' : 'dot' } }));
      tr.push({ x: [0, 3], y: [p.Ec, p.Ec], name: 'Ec', col: 'hf', line: { dash: 'dash', width: 2 } });
      c.plot('a', tr, { title: 'Depolarising field at 0 V', xaxis: { title: 'interface thickness d_i (nm)' }, yaxis: { title: '|E_dep| (MV/cm)' } });
      const Cf = E0 * p.ef / (p.df * 1e-7) * 1e6, Ci = d => d > 0 ? E0 * p.ei / (d * 1e-7) * 1e6 : Infinity;
      const Ct = d => 1 / (1 / Cf + 1 / Ci(d));
      c.plot('b', [{ x: dis, y: dis.map(Ct), name: 'measured (series)' }, { x: [0, 3], y: [Cf, Cf], name: 'ferroelectric alone', col: 'muted', line: { dash: 'dot' } }],
        { title: 'Series capacitance per area', xaxis: { title: 'd_i (nm)' }, yaxis: { title: 'C (µF/cm²)', rangemode: 'tozero' } });
      const e = Ed(p.P, p.df, p.ef, p.di, p.ei); const share = p.di > 0 ? (1 / Ci(p.di)) / (1 / Cf + 1 / Ci(p.di)) : 0;
      c.out([['E_dep', e.toFixed(2) + ' MV/cm'], ['E_dep / Ec', (e / p.Ec).toFixed(2)], ['verdict', e > p.Ec ? 'back-switching: pinched, AFE-like loop' : (e > 0.5 * p.Ec ? 'retention and imprint at risk' : 'stable')], ['C_FE', Cf.toFixed(2) + ' µF/cm²'], ['C measured', Ct(p.di).toFixed(2) + ' µF/cm²'], ['voltage lost in interface', (100 * share).toFixed(0) + ' %']]);
      c.csv(['d_i_nm', 'Edep_eps4', 'Edep_eps10', 'Edep_eps25', 'Edep_user', 'C_series_uFcm2'], dis.map(d => [d.toFixed(3)].concat(eis.map(e => Ed(p.P, p.df, p.ef, d, e).toFixed(4)), [Ct(d).toFixed(4)])));
    },
    theory: '<p>Treat the stack as a ferroelectric (thickness d_f, permittivity ε_f, polarisation P) in series with a thin non-ferroelectric layer (d_i, ε_i). Two conditions fix the fields. D is continuous at the boundary:</p><div class="eq">ε₀ε_f·E_f + P = ε₀ε_i·E_i</div><p>and the voltages add up:</p><div class="eq">V = E_f·d_f + E_i·d_i</div><p>Solving for the field in the ferroelectric:</p><div class="eq">E_f = [V − P·d_i/(ε₀ε_i)] / [d_f + d_i·ε_f/ε_i]<span class="why">At V = 0 this is the depolarising field, which opposes P.</span></div><div class="eq">E_dep = −P·d_i / ε₀(ε_i·d_f + ε_f·d_i)</div><p>The same layer adds a series capacitance, 1/C = d_f/(ε₀ε_f) + d_i/(ε₀ε_i), which caps the measured C and makes it frequency dependent. A metal with finite screening length λ acts like an interface layer with d_i/ε_i → λ/ε_e.</p>',
    look: '<ul><li>With 1 nm of εi = 10, the field is about 1.7 MV/cm for P = 20 µC/cm²: above Ec.</li><li>Raise εi toward 80 (a conductive oxide): the field almost vanishes.</li><li>Make the ferroelectric thinner: the same interface matters more.</li></ul>',
    ours: '<p>TiN grows a dielectric TiOₓNᵧ; W grows a conductive WOₓ. This model is the main reason W/W films kept more polarisation at 10 nm. Check with C–f: an interface layer appears as a series capacitor.</p>',
    refs: '<p>Lomenzo et al., ACS Appl. Electron. Mater. 2, 1583 (2020). Xu, Wunderwald et al., Nano Research 19, 94908815 (2026). Tagantsev and Gerra, J. Appl. Phys. 100, 051607 (2006).</p>'
  });

  MX.add({
    id: 'crossbar', sec: 'memcap', title: 'Charge-domain multiply–accumulate', layout: 'two', plots: ['a', 'b'],
    lede: 'Inputs are voltage steps on rows, weights are capacitances, and each column collects Q = Σ C·V. No DC current flows, so only dynamic energy is spent.',
    controls: [
      { id: 'N', label: 'Rows (inputs)', min: 8, max: 256, step: 8, value: 64, d: 0 },
      { id: 'L', label: 'Weight levels per cell', min: 2, max: 32, step: 1, value: 8, d: 0 },
      { id: 'r', label: 'Window C_max / C_min', min: 1.2, max: 10, step: 0.1, value: 3, d: 1 },
      { id: 'sig', label: 'Device-to-device spread σ_C', min: 0, max: 20, step: 0.5, value: 4, unit: '%', d: 1 },
      { id: 'cmin', label: 'C_min per cell', min: 0.2, max: 20, step: 0.1, value: 1, unit: 'fF', d: 1 },
      { id: 'vin', label: 'Input step amplitude', min: 0.1, max: 1, step: 0.05, value: 0.5, unit: 'V' }
    ],
    update(p, c) {
      const r = MX.rng(42); const cols = 10; const N = p.N; const L = p.L;
      const u = []; for (let i = 0; i < N; i++) u.push(r());
      const lev = [], cap = []; for (let i = 0; i < N; i++) { lev.push([]); cap.push([]); for (let j = 0; j < cols; j++) { const l = Math.floor(r() * L); lev[i].push(l); const cn = p.cmin * (1 + (p.r - 1) * l / (L - 1)); cap[i].push(cn * (1 + p.sig / 100 * MX.gauss(r))); } }
      const ideal = [], real = []; for (let j = 0; j < cols; j++) { let a = 0, b = 0; for (let i = 0; i < N; i++) { const cn = p.cmin * (1 + (p.r - 1) * lev[i][j] / (L - 1)); a += cn * u[i] * p.vin; b += cap[i][j] * u[i] * p.vin; } ideal.push(a); real.push(b); }
      const lab = ideal.map((_, j) => 'col ' + (j + 1));
      c.plot('a', [{ type: 'bar', x: lab, y: ideal, name: 'ideal Σ C·V (fC)' }, { type: 'bar', x: lab, y: real, name: 'with device spread' }], { title: 'Column charge', barmode: 'group', yaxis: { title: 'Q (fC)' } });
      const Ls = [2, 4, 8, 16, 32, 64]; const sigs = [1, 2, 5, 10];
      const tr = sigs.map((s, k) => ({ x: Ls, y: Ls.map(l => { const step = (p.r - 1) / (l - 1); const mid = (1 + p.r) / 2; return Math.min(100, 100 * Math.max(0, 1 - MX.erf(step / (2 * Math.SQRT2 * s / 100 * mid)))); }), name: 'σ = ' + s + ' %', mode: 'lines+markers', ci: k }));
      c.plot('b', tr, { title: 'Chance a cell is read as the wrong level', xaxis: { title: 'levels per cell', type: 'log', tickvals: Ls }, yaxis: { title: 'misread probability (%)', range: [0, 100] } });
      let err = 0; for (let j = 0; j < cols; j++) err += Math.abs(real[j] - ideal[j]) / ideal[j]; err /= cols;
      const Eop = N * cols * (p.cmin * (1 + p.r) / 2) * 1e-15 * p.vin * p.vin * 0.5; const step = (p.r - 1) / (p.L - 1);
      c.out([['mean column error', (100 * err).toFixed(2) + ' %'], ['level step / spread', (step / (p.sig / 100 * (1 + p.r) / 2 || 1e-9)).toFixed(2)], ['energy per MAC array read', MX.sci(Eop) + ' J'], ['energy per cell', MX.sci(Eop / (N * cols)) + ' J'], ['DC current', '0']]);
      c.csv(['column', 'Q_ideal_fC', 'Q_real_fC'], lab.map((l, j) => [l, ideal[j].toFixed(3), real[j].toFixed(3)]));
    },
    theory: '<p>In a capacitive crossbar, row i receives a voltage step V_i and the cell at (i, j) holds capacitance C_ij. A charge amplifier on column j keeps it at virtual ground and collects:</p><div class="eq">Q_j = Σᵢ C_ij·V_i,&nbsp;&nbsp; V_out,j = −Q_j / C_f</div><p>That is a matrix–vector product computed by physics. The energy per operation is the charging energy:</p><div class="eq">E ≈ ½ Σ C_ij·V_i²<span class="why">There is no static current, so no sneak paths and no IR drop along the lines: the two main problems of resistive crossbars disappear.</span></div><p>How many levels a cell can hold depends on the ratio of the level spacing to the device-to-device spread:</p><div class="eq">N_levels ≈ (C_max − C_min) / (k·σ_C),&nbsp; k ≈ 3–6</div>',
    look: '<ul><li>Increase levels at fixed spread: the misread probability climbs quickly.</li><li>A larger window (C_max/C_min) buys levels.</li><li>Energy stays in the femtojoule range per cell even for 256 rows.</li></ul>',
    ours: '<p>Our first target is a measured σ_C over 20–30 pads and the window in fF/µm². Those two numbers set how many bits our memcapacitor can hold.</p>',
    refs: '<p>Wang et al., Nano Energy 140 (2025). Kim, Luo, Phadke, Read and Yu, IMW 2024.</p>'
  });

  MX.add({
    id: 'disturb', sec: 'memcap', title: 'Read disturb', layout: 'two', plots: ['a', 'b'],
    lede: 'A larger read voltage gives more signal, but repeated reads slowly switch the regions with the smallest coercive voltages. The usable read window lies between the two.',
    controls: [
      { id: 'vc', label: 'Mean local Vc', min: 0.5, max: 2.5, step: 0.05, value: 1.2, unit: 'V' },
      { id: 'sig', label: 'Spread of local Vc', min: 0.05, max: 0.6, step: 0.01, value: 0.25, unit: 'V' },
      { id: 'vb', label: 'Built-in bias toward the unstable state', min: 0, max: 1, step: 0.01, value: 0.3, unit: 'V' },
      { id: 'vr', label: 'Read amplitude', min: 0.02, max: 1.2, step: 0.01, value: 0.3, unit: 'V' },
      { id: 'lr', label: 'Number of reads', min: 0, max: 12, step: 0.1, value: 6, fmt: v => '10^' + v.toFixed(1) }
    ],
    update(p, c) {
      const tr = 1e-7, tinf = 1e-12, k = 18; /* Merz: tau = tinf·exp(k·Vc_local / V) */
      const flip = (vr, nr) => { const V = vr + p.vb; if (V <= 0) return 0; let s = 0, w = 0; for (let i = -40; i <= 40; i++) { const x = i / 10; const vcl = p.vc + p.sig * x; if (vcl <= 0) continue; const wt = Math.exp(-x * x / 2); const tau = tinf * Math.exp(k * vcl / V); s += wt * (1 - Math.exp(-nr * tr / tau)); w += wt; } return s / w; };
      const vrs = MX.lin(0.02, 1.2, 120);
      const tr2 = [3, 6, 9, 12].map((l, i) => ({ x: vrs, y: vrs.map(v => 100 * flip(v, 10 ** l)), name: '10^' + l + ' reads', ci: i }));
      tr2.push({ x: [p.vr], y: [100 * flip(p.vr, 10 ** p.lr)], mode: 'markers', col: 'hf', name: 'now', marker: { size: 12 } });
      c.plot('a', tr2, { title: 'Fraction of the state lost to reads', xaxis: { title: 'read amplitude (V)' }, yaxis: { title: 'disturbed (%)', type: 'log', range: [-4, 2] } });
      const sig = vrs.map(v => v * (1 - 2 * flip(v, 10 ** p.lr)));
      c.plot('b', [{ x: vrs, y: sig, name: 'useful signal ∝ ΔC·V_read·(1 − 2·disturbed)' }, { x: [p.vr], y: [p.vr * (1 - 2 * flip(p.vr, 10 ** p.lr))], mode: 'markers', col: 'hf', name: 'now', marker: { size: 12 } }],
        { title: 'Read signal after the chosen number of reads', xaxis: { title: 'read amplitude (V)' }, yaxis: { title: 'signal (a.u.)' } });
      let best = 0, bv = 0; vrs.forEach((v, i) => { if (sig[i] > best) { best = sig[i]; bv = v; } });
      c.out([['disturbed now', (100 * flip(p.vr, 10 ** p.lr)).toExponential(2) + ' %'], ['best read amplitude', bv.toFixed(2) + ' V'], ['effective field on weak tail', (p.vr + p.vb).toFixed(2) + ' V vs Vc ' + (p.vc - 2 * p.sig).toFixed(2) + ' V (−2σ)']]);
      c.csv(['Vread', 'disturbed_1e3', 'disturbed_1e6', 'disturbed_1e9', 'disturbed_1e12'], vrs.map(v => [v.toFixed(3)].concat([3, 6, 9, 12].map(l => flip(v, 10 ** l).toExponential(4)))));
    },
    theory: '<p>Each region k has its own coercive voltage V_c,k. Under a read pulse of amplitude V_r, plus any built-in bias pushing toward the other state, it switches with a Merz-type time constant:</p><div class="eq">τ_k = τ∞ · exp[α·V_c,k / (V_r + V_bi)]</div><p>After N reads of width t_r, the fraction of the film that has flipped is</p><div class="eq">f(N) = ⟨1 − exp(−N·t_r / τ_k)⟩ over the V_c distribution<span class="why">The low tail of the distribution dominates. A broad spread or a large built-in bias shortens the safe read range.</span></div><p>The sensed charge grows with V_r, while the stored contrast falls as 1 − 2f. The product has a maximum: the optimum read amplitude. This is the read-yield against read-disturb trade-off studied by Fehlings and co-workers.</p>',
    look: '<ul><li>Raise the built-in bias: the disturb curves shift left, so a bias that helps the window also hurts read endurance.</li><li>Broaden the spread: more weak regions, earlier disturb.</li></ul>',
    ours: '<p>A simple experiment on the tester: write, read N times at V_r, then PUND. Plot the loss against V_r and N. Few papers report this.</p>',
    refs: '<p>Fehlings et al., arXiv 2506.09480 (2025). Mukherjee et al., IEDM 2023.</p>'
  });
})();
