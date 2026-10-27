/* PLD: fluence, background pressure, surface diffusion and growth mode, thickness uniformity */
(function () {
  const MX = window.MX;
  MX.sec('pld', 'Making the film: PLD', 'Each growth knob acts on one stage of a laser pulse: ablation, plume flight or growth.');

  MX.add({
    id: 'plume', sec: 'pld', title: 'The plasma plume', layout: 'two', plots: ['a', 'b'],
    lede: 'Each laser pulse makes a forward-directed plume of ions and atoms flying at about 10 km/s. The background oxygen drags it to a stop. Where it stops, and how fast species arrive, decides the film.',
    controls: [
      { id: 'lp', label: 'O₂ pressure', min: -5, max: -0.5, step: 0.05, value: -2, fmt: v => MX.sci(10 ** v) + ' mbar' },
      { id: 'E', label: 'Pulse energy on target', min: 50, max: 500, step: 10, value: 200, unit: 'mJ', d: 0 },
      { id: 'd', label: 'Target–substrate distance', min: 30, max: 80, step: 1, value: 50, unit: 'mm', d: 0 },
      { id: 'n', label: 'Plume forwardness n (cosⁿθ)', min: 2, max: 20, step: 1, value: 10, d: 0 }
    ],
    update(p, c) {
      const amu = 1.6605e-27, eV = 1.602e-19, m = 178.5 * amu; /* Hf as the heaviest plume species */
      const v0 = 1.0e4 * Math.sqrt(p.E / 200); /* m/s, typical ion front velocity, scaled with energy */
      const P = 10 ** p.lp; const beta = 1.67e7 * P; /* s⁻¹: drag coefficient, calibrated so x_stop ≈ 60 mm at 10⁻² mbar, 200 mJ */
      const xstop = v0 / beta * 1000; /* mm */
      const D = p.d / 1000;
      const xt = (t, b) => b <= 0 ? v0 * t : v0 / b * (1 - Math.exp(-b * t)); /* m */
      const vt = (t, b) => v0 * Math.exp(-b * t);
      const tArr = beta * D / v0 >= 1 ? Infinity : -Math.log(1 - beta * D / v0) / beta; const vArr = isFinite(tArr) ? vt(tArr, beta) : 0;
      const KE = v => 0.5 * m * v * v / eV;
      /* plot b: front position vs time for several pressures */
      const ts = MX.lin(0, 40e-6, 200);
      const press = [-5, -3, -2, -1.3, -0.7]; const tr = press.map((l, i) => ({ x: ts.map(t => t * 1e6), y: ts.map(t => Math.min(200, xt(t, 1.67e7 * 10 ** l) * 1000)), name: MX.sci(10 ** l).replace('.00', '') + ' mbar', ci: i, line: { width: 1.8 } }));
      tr.push({ x: ts.map(t => t * 1e6), y: ts.map(t => Math.min(200, xt(t, beta) * 1000)), name: 'chosen', col: 'hf', line: { width: 4 } });
      c.plot('b', tr, { title: 'Plume front x(t) = x_stop·(1 − e^(−βt))', xaxis: { title: 'time after pulse (µs)' }, yaxis: { title: 'front position (mm)', range: [0, 120] }, shapes: [{ type: 'line', x0: 0, x1: 40, y0: p.d, y1: p.d, line: { color: 'muted', dash: 'dash', width: 2 } }], annotations: [{ x: 34, y: p.d + 5, text: 'substrate', showarrow: false }] });
      const regime = xstop > 1.5 * p.d ? 'energetic: species hit the film at ' + KE(vArr).toFixed(0) + ' eV (resputtering, defects)' : xstop > 0.8 * p.d ? 'good: plume arrives nearly thermalised' : 'stops short: slow diffusion, porous film, low rate';
      c.out([['initial front speed v₀', (v0 / 1000).toFixed(1) + ' km/s'], ['initial KE (Hf ion)', KE(v0).toFixed(0) + ' eV'], ['stopping distance x_stop', xstop > 5000 ? '> 5 m (free flight)' : xstop.toFixed(0) + ' mm'], ['arrival time at substrate', isFinite(tArr) ? (tArr * 1e6).toFixed(1) + ' µs' : 'never (plume stops)'], ['arrival KE', isFinite(tArr) ? KE(vArr).toFixed(1) + ' eV' : '≈ thermal (0.03 eV)'], ['regime', regime]]);
      c.csv(['t_us'].concat(press.map(l => 'x_mm_p' + l)).concat(['x_mm_chosen']), ts.map(t => [(t * 1e6).toFixed(3)].concat(press.map(l => (xt(t, 1.67e7 * 10 ** l) * 1000).toFixed(3))).concat([(xt(t, beta) * 1000).toFixed(3)])));
      /* canvas animation: particle plume */
      const k = c.canvas('a'); const th = MX.theme(); const r = MX.rng(3); const N = 420; const parts = [];
      for (let i = 0; i < N; i++) { const ct = Math.pow(r(), 1 / (p.n + 1)); const st = Math.sqrt(1 - ct * ct) * Math.cos(2 * Math.PI * r()); parts.push({ s: 0.6 + 0.8 * r(), ct, st, hit: false }); }
      const gas = []; const ng = Math.round(MX.clamp((p.lp + 5) / 4.5, 0, 1) * 260); for (let i = 0; i < ng; i++) gas.push([r(), r()]);
      const deposit = new Array(60).fill(0);
      const tEnd = Math.min(40e-6, Math.max(6e-6, 2.2 * D / v0 + (isFinite(tArr) ? 0 : 0)) * 1.4);
      c.anim(tt => {
        const g = k.g, W = k.W, H = k.H; g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
        const cycle = 3.2; const ph = (tt % cycle) / cycle; const t = ph * tEnd;
        if (ph < 0.01) deposit.fill(0);
        const x0 = 44, sx = (W - 110) / (p.d * 1.15), yc = H / 2 + 6; const xs = x0 + p.d * sx;
        g.fillStyle = th.muted; g.globalAlpha = 0.35; gas.forEach(q => { g.beginPath(); g.arc(x0 + q[0] * (W - x0 - 20), 40 + q[1] * (H - 80), 1.6, 0, 6.2832); g.fill(); }); g.globalAlpha = 1;
        g.fillStyle = '#8a7a66'; g.fillRect(x0 - 14, yc - 90, 14, 180);
        g.fillStyle = th.muted; g.fillRect(xs, yc - 95, 10, 190);
        if (ph < 0.06) { g.strokeStyle = th.c[3]; g.lineWidth = 4; g.globalAlpha = 1 - ph / 0.06; g.beginPath(); g.moveTo(x0 + 60, 24); g.lineTo(x0, yc); g.stroke(); g.globalAlpha = 1; }
        parts.forEach((q, i) => {
          const b = beta * (0.7 + 0.6 * q.s % 1); const v = v0 * q.s; const rr = b > 0 ? v / b * (1 - Math.exp(-b * t)) : v * t; const vn = v * Math.exp(-b * t);
          let x = x0 + rr * 1000 * q.ct * sx, y = yc + rr * 1000 * q.st * sx * 1.0;
          if (x >= xs) { if (!q.hit) { const bin = Math.floor(MX.clamp((y - (yc - 95)) / 190, 0, 0.999) * 60); deposit[bin]++; } q.hit = true; x = xs - 1; }
          else q.hit = false;
          if (y < 30 || y > H - 30) return;
          const hot = MX.clamp(vn / v0, 0, 1); g.fillStyle = hot > 0.5 ? th.hf : (hot > 0.15 ? th.c[2] : th.c[0]); g.globalAlpha = q.hit ? 0.25 : 0.85; g.beginPath(); g.arc(x, y, 2.2, 0, 6.2832); g.fill();
        }); g.globalAlpha = 1;
        const mx = Math.max(1, ...deposit); g.fillStyle = th.hf; deposit.forEach((v, i) => { const w = v / mx * 34; g.fillRect(xs + 12, yc - 95 + i * 190 / 60, w, 190 / 60 - 0.5); });
        if (isFinite(xstop) && xstop < p.d * 1.15) { const xx = x0 + xstop * sx; g.strokeStyle = th.c[0]; g.setLineDash([5, 5]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(xx, 40); g.lineTo(xx, H - 40); g.stroke(); g.setLineDash([]); g.fillStyle = th.c[0]; g.font = '600 12px IBM Plex Sans, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('x_stop', xx, 34); }
        g.textAlign = 'left'; g.fillStyle = th.fg; g.font = '600 14px IBM Plex Sans, system-ui, sans-serif'; g.fillText('t = ' + (t * 1e6).toFixed(1) + ' µs after the pulse', 16, 22);
        g.fillStyle = th.muted; g.font = '12px IBM Plex Sans, system-ui, sans-serif'; g.fillText('target', x0 - 30, H - 14); g.fillText('substrate + deposit', xs - 40, H - 14);
        g.fillStyle = th.hf; g.fillText('● fast', W - 170, 22); g.fillStyle = th.c[2]; g.fillText('● slowing', W - 120, 22); g.fillStyle = th.c[0]; g.fillText('● thermal', W - 60, 22);
      });
    },
    theory: '<p>A nanosecond UV pulse is absorbed in a ~100 nm skin of the target and heats it far above its boiling point. What follows happens in four stages, each controlled by a different growth parameter.</p><ol><li><b>Ablation (0–25 ns).</b> Material leaves the surface faster than heat can diffuse. Above the threshold fluence, the composition of the vapour equals that of the target: congruent ablation.</li><li><b>Plasma formation (10–100 ns).</b> The dense vapour absorbs the rest of the pulse and ionises. A Knudsen layer forms in front of the target and the particles acquire forward-directed velocities.</li><li><b>Adiabatic expansion (µs).</b> The pressure gradient is largest along the target normal, so the plume expands fastest forward. It becomes an elongated ellipsoid and its angular flux is close to cosⁿθ with n ≈ 8–12 (Anisimov model).</li><li><b>Interaction with the gas (µs–tens of µs).</b> In vacuum the front flies freely at about 10 km/s, so Hf ions carry about 100 eV. In O₂ it pushes a shock front, collides, slows down and is oxidised.</li></ol><p>Two simple descriptions of stage 4 are widely used. In the <b>drag model</b> the front experiences a viscous force proportional to its velocity:</p><div class="eq">dv/dt = −β·v ⇒ x(t) = x_stop·(1 − e^(−βt)),&nbsp;&nbsp; x_stop = v₀/β,&nbsp; β ∝ p<span class="why">Good at moderate pressures and early times. Used for the animation and the front curves here.</span></div><p>At higher pressure the plume behaves as a <b>blast wave</b> driven by the deposited energy E into gas of density ρ₀ (Sedov–Taylor):</p><div class="eq">R(t) = ξ₀·(E/ρ₀)^(1/5)·t^(2/5)</div><p>An empirical plume length combines both, L ∝ E^(1/3γ)·p^(−1/3γ) with γ the heat-capacity ratio. Growth is usually best when the substrate sits near the end of the visible plume, d ≈ L: species arrive thermalised enough not to damage the film but still mobile.</p><p>The oxygen also matters chemically. Collisions oxidise Hf and Zr in flight, so the pressure sets the oxygen-vacancy content of the film, and with it wake-up, imprint and leakage.</p>',
    look: '<ul><li>At 10⁻⁵ mbar the front reaches the substrate in about 5 µs carrying about 100 eV: the film is dense but damaged and oxygen-poor.</li><li>At 10⁻² mbar and 50 mm the plume is just stopping at the substrate.</li><li>At 10⁻¹ mbar it stops a few mm from the target: rate collapses.</li><li>Lower n widens the plume and the deposit profile at the right.</li></ul>',
    ours: '<p>Fast imaging of the plume glow on our PLD (phone camera at high frame rate, or an ICCD if available) gives the visible plume length at each pressure. Place the substrate near that length, then confirm with PUND and leakage on films grown at three pressures.</p>',
    refs: '<p>Geohegan, Appl. Phys. Lett. 60, 2732 (1992), plume imaging in O₂. Anisimov et al., Phys. Rev. B 48, 12076 (1993), plume gas dynamics. Kim and Kwok, Appl. Phys. Lett. 65, 3239 (1994), plume length and the optimal distance. Eason (ed.), <i>Pulsed Laser Deposition of Thin Films</i> (2007). Calibration constants in this model are illustrative.</p>'
  });

  MX.add({
    id: 'fluence', sec: 'pld', title: 'Laser fluence', plots: ['a'],
    lede: 'Below threshold nothing leaves the target. Just above it, ablation is slow and partly thermal, so composition drifts. Too high, and molten droplets land on the film.',
    controls: [
      { id: 'F', label: 'Fluence at the target', min: 0.2, max: 4, step: 0.05, value: 2, unit: 'J/cm²' },
      { id: 'Ft', label: 'Ablation threshold', min: 0.3, max: 1.5, step: 0.05, value: 0.7, unit: 'J/cm²' },
      { id: 'a', label: 'Absorption length 1/α', min: 20, max: 200, step: 5, value: 80, unit: 'nm', d: 0 }
    ],
    update(p, c) {
      const rate = F => F > p.Ft ? (p.a / 10) * Math.log(F / p.Ft) : 0; /* Å per pulse at the target, Beer–Lambert */
      const sto = F => F > p.Ft ? Math.min(1, (F - p.Ft) / 1.1) : 0; const drop = F => F > 2.6 ? Math.min(1, (F - 2.6) / 1.2) : 0;
      const Fs = MX.lin(0, 4, 201); const rmax = rate(4) || 1;
      c.plot('a', [{ x: Fs, y: Fs.map(F => rate(F) / rmax), name: 'ablated depth per pulse (normalised)' }, { x: Fs, y: Fs.map(sto), name: 'stoichiometric transfer (qualitative)' }, { x: Fs, y: Fs.map(drop), name: 'droplet density (qualitative)', col: 'hf' }],
        { title: 'What changes with fluence', xaxis: { title: 'F (J/cm²)' }, yaxis: { title: 'relative value', range: [0, 1.05] }, shapes: [{ type: 'line', x0: p.F, x1: p.F, y0: 0, y1: 1, yref: 'paper', line: { color: 'muted', dash: 'dash', width: 2 } }, { type: 'rect', x0: 1.5, x1: 2.5, y0: 0, y1: 1, yref: 'paper', fillcolor: 'rgba(29,138,107,0.10)', line: { width: 0 }, layer: 'below' }], annotations: [{ x: 2, y: 1.02, yref: 'paper', text: 'usual window', showarrow: false }] });
      const regime = p.F < p.Ft ? 'below threshold: nothing leaves' : p.F < 1.5 ? 'near threshold: slow, composition drifts' : p.F <= 2.6 ? 'good: fast and congruent' : 'too high: droplets on the film';
      c.out([['ablated depth per pulse', (rate(p.F)).toFixed(1) + ' Å (target)'], ['regime', regime], ['F / F_th', (p.F / p.Ft).toFixed(2)]]);
      c.csv(['F', 'rate_norm', 'stoich', 'droplets'], Fs.map(F => [F.toFixed(3), (rate(F) / rmax).toFixed(4), sto(F).toFixed(4), drop(F).toFixed(4)]));
    },
    theory: '<p>Fluence is pulse energy per area on the target, F = E_pulse / A_spot. Light is absorbed over a length 1/α. Material is removed down to the depth where the absorbed energy density reaches the ablation threshold:</p><div class="eq">d_abl = (1/α)·ln(F / F_th)&nbsp;&nbsp; for F &gt; F_th<span class="why">Beer–Lambert: the depth grows only logarithmically, so doubling F does not double the rate.</span></div><p>Near threshold, removal is partly thermal evaporation, so the more volatile species leave first. For HZO the Hf:Zr ratio and the oxygen content drift. Well above threshold the removal is explosive and congruent, so the film copies the target. At very high fluence the subsurface melts and is ejected as droplets of 0.1–1 µm, which make shorts and leakage paths in thin capacitors.</p><p>The entrance window coats over time, so the real fluence falls from run to run. Measure the energy after the window and the spot area from a burn mark.</p>',
    look: '<ul><li>The usual window for oxides is about 1.5–2.5 J/cm².</li><li>Rate grows slowly with F; droplets grow fast. Small gains in rate are not worth particles.</li></ul>',
    ours: '<p>Starting point: about 2 J/cm². Check composition by XPS or EDX at two fluences; an Hf:Zr drift means you are too close to threshold.</p>',
    refs: '<p>Eason (ed.), <i>Pulsed Laser Deposition of Thin Films</i> (Wiley, 2007). Chrisey and Hubler (eds.), <i>Pulsed Laser Deposition of Thin Films</i> (1994).</p>'
  });

  MX.add({
    id: 'pressure', sec: 'pld', title: 'Background O₂ pressure', layout: 'two', plots: ['a', 'b'],
    lede: 'Oxygen slows and oxidises the plume. Low pressure gives energetic, oxygen-poor arrival; high pressure stops the plume before it reaches the substrate.',
    controls: [
      { id: 'lp', label: 'O₂ pressure', min: -4, max: -0.5, step: 0.05, value: -2, fmt: v => MX.sci(10 ** v) + ' mbar' },
      { id: 'D', label: 'Target–substrate distance', min: 30, max: 80, step: 1, value: 50, unit: 'mm', d: 0 },
      { id: 'E', label: 'Pulse energy', min: 50, max: 500, step: 10, value: 200, unit: 'mJ', d: 0 }
    ],
    update(p, c) {
      /* blast-wave stopping length L = A·(E/P)^(1/3); A chosen so L ≈ 60 mm at 200 mJ, 10⁻² mbar (illustrative calibration) */
      const Lstop = (lp, E) => { const P = 10 ** lp * 100; const A = 60 / Math.cbrt(0.2 / 1); return A * Math.cbrt((E / 1000) / P); };
      const lps = MX.lin(-4, -0.5, 141);
      c.plot('a', [{ x: lps.map(l => 10 ** l), y: lps.map(l => Lstop(l, p.E)), name: 'plume stopping length' }, { x: [10 ** -4, 10 ** -0.5], y: [p.D, p.D], name: 'substrate distance', col: 'hf', line: { dash: 'dash' } }, { x: [10 ** p.lp], y: [Lstop(p.lp, p.E)], mode: 'markers', col: 'hf', name: 'now', marker: { size: 12 } }],
        { title: 'Where the plume stops', xaxis: { title: 'pO₂ (mbar)', type: 'log', exponentformat: 'power' }, yaxis: { title: 'L (mm)', type: 'log' } });
      const KE = l => 1 / (1 + Math.exp(2.6 * (l + 2.4))), OX = l => 1 / (1 + Math.exp(-2.4 * (l + 2.6))), RT = l => 1 / (1 + Math.exp(2.2 * (l + 1.3)));
      c.plot('b', [{ x: lps.map(l => 10 ** l), y: lps.map(KE), name: 'arrival energy' }, { x: lps.map(l => 10 ** l), y: lps.map(OX), name: 'oxygen content' }, { x: lps.map(l => 10 ** l), y: lps.map(RT), name: 'growth rate' }],
        { title: 'Trends at the substrate (qualitative)', xaxis: { title: 'pO₂ (mbar)', type: 'log', exponentformat: 'power' }, yaxis: { title: 'relative', range: [0, 1.05] }, shapes: [{ type: 'line', x0: 10 ** p.lp, x1: 10 ** p.lp, y0: 0, y1: 1, yref: 'paper', line: { color: 'muted', dash: 'dash' } }] });
      const L = Lstop(p.lp, p.E);
      c.out([['stopping length', L.toFixed(0) + ' mm'], ['plume', L > 1.3 * p.D ? 'reaches substrate fast (energetic)' : L > 0.8 * p.D ? 'arrives thermalised (good)' : 'stops short: slow, porous film']]);
      c.csv(['pO2_mbar', 'L_mm', 'KE', 'O', 'rate'], lps.map(l => [(10 ** l).toExponential(3), Lstop(l, p.E).toFixed(2), KE(l).toFixed(3), OX(l).toFixed(3), RT(l).toFixed(3)]));
    },
    theory: '<p>In vacuum the plume species fly freely with tens of eV. In a gas they push a shock front and slow down. A blast-wave (Sedov–Taylor) estimate gives the distance at which the plume stops:</p><div class="eq">L_stop ≈ A·(E_plume / p)^(1/3)<span class="why">A depends on the gas and plume geometry. The cube root means a tenfold rise in pressure shortens the range by about 2.2×.</span></div><p>The best films often grow when L_stop is close to the target–substrate distance: species arrive thermalised but still with enough energy to move on the surface. Collisions with O₂ also oxidise the plume, which sets the oxygen-vacancy content of the film ([V_O] falls roughly as pO₂^(−1/6)).</p>',
    look: '<ul><li>At 10⁻² mbar and 50 mm the plume arrives thermalised.</li><li>Move the substrate further away: you need a lower pressure for the same arrival.</li></ul>',
    ours: '<p>Pressure is the most direct knob on vacancies, which control wake-up, imprint and leakage. A pressure series at fixed fluence, with PUND and wake-up on each film, maps vacancies to device behaviour.</p>',
    refs: '<p>Predtechensky and Mayorov, Appl. Supercond. 1, 2011 (1993), on the plume stopping length. Eason (ed.), <i>Pulsed Laser Deposition of Thin Films</i> (2007).</p>'
  });

  MX.add({
    id: 'growth', sec: 'pld', title: 'Temperature, rate and growth mode', layout: 'two', plots: ['a', 'b'],
    lede: 'An atom that lands hops around until the next pulse buries it. How far it gets, the diffusion length, decides between rough amorphous films and smooth crystalline ones.',
    controls: [
      { id: 'T', label: 'Substrate temperature', min: 25, max: 750, step: 5, value: 450, unit: '°C', d: 0 },
      { id: 'f', label: 'Repetition rate', min: 1, max: 20, step: 1, value: 3, unit: 'Hz', d: 0 },
      { id: 'Ed', label: 'Diffusion barrier E_d', min: 0.8, max: 2, step: 0.05, value: 1.4, unit: 'eV' }
    ],
    update(p, c) {
      const kB = 8.617e-5, nu = 1e13; const T = p.T + 273.15; const Dh = nu * Math.exp(-p.Ed / kB / T); const ell = Math.sqrt(Dh / p.f);
      const hops = Math.min(30, Math.round(ell));
      const Nc = 120; const sim = (hp, nAt, seed) => { const r = MX.rng(seed); const h = new Array(Nc).fill(0); for (let a = 0; a < nAt; a++) { let x = Math.floor(r() * Nc); for (let s = 0; s < hp; s++) { const l = (x + Nc - 1) % Nc, rr = (x + 1) % Nc; let b = x; if (h[l] < h[b]) b = l; if (h[rr] < h[b]) b = rr; if (b === x) { b = r() < 0.5 ? l : rr; if (h[b] > h[x]) break; } x = b; } h[x]++; } return h; };
      const rough = h => { const m = h.reduce((a, b) => a + b) / h.length; return Math.sqrt(h.reduce((s, v) => s + (v - m) ** 2, 0) / h.length); };
      const MLs = MX.lin(1, 30, 30); const rr = MLs.map(ml => rough(sim(hops, Math.round(ml * Nc), 4)));
      const Ts = MX.lin(25, 750, 60); const ells = Ts.map(t => Math.sqrt(nu * Math.exp(-p.Ed / kB / (t + 273.15)) / p.f));
      c.plot('b', [{ x: Ts, y: ells, name: 'diffusion length ℓ (lattice sites)' }, { x: [p.T], y: [ell], mode: 'markers', col: 'hf', name: 'now', marker: { size: 12 } }],
        { title: 'Diffusion length vs temperature', xaxis: { title: 'T (°C)' }, yaxis: { title: 'ℓ (sites)', type: 'log', exponentformat: 'power' } });
      const k = c.canvas('a'); const th = MX.theme(); let H = new Array(Nc).fill(0); const r = MX.rng(7); let nAt = 0;
      c.anim(t => {
        const g = k.g; g.fillStyle = th.bg; g.fillRect(0, 0, k.W, k.H);
        for (let i = 0; i < 6; i++) { let x = Math.floor(r() * Nc); for (let s = 0; s < hops; s++) { const l = (x + Nc - 1) % Nc, rt = (x + 1) % Nc; let b = x; if (H[l] < H[b]) b = l; if (H[rt] < H[b]) b = rt; if (b === x) { b = r() < 0.5 ? l : rt; if (H[b] > H[x]) break; } x = b; } H[x]++; nAt++; }
        if (nAt > Nc * 40) { H = new Array(Nc).fill(0); nAt = 0; }
        const cw = (k.W - 40) / Nc, ch = Math.min(6, (k.H - 90) / 50);
        g.fillStyle = th.muted; g.fillRect(20, k.H - 40, k.W - 40, 8);
        g.fillStyle = th.c[0]; for (let i = 0; i < Nc; i++) { const hh = Math.min(H[i], 50); g.fillRect(20 + i * cw, k.H - 40 - hh * ch, Math.max(1, cw - 1), hh * ch); }
        g.fillStyle = th.fg; g.font = '600 14px IBM Plex Sans, system-ui, sans-serif'; g.fillText('Growing film (1D model): ' + (nAt / Nc).toFixed(1) + ' monolayers', 20, 24);
        g.fillStyle = th.muted; g.font = '13px IBM Plex Sans, system-ui, sans-serif'; g.fillText('hops before burial: ' + hops + '   roughness: ' + rough(H).toFixed(2) + ' ML', 20, 44);
      });
      c.out([['hop rate D/a²', MX.sci(Dh) + ' s⁻¹'], ['time between pulses', (1000 / p.f).toFixed(0) + ' ms'], ['diffusion length ℓ', ell > 1e4 ? '> 10⁴ sites' : ell.toFixed(1) + ' sites'], ['roughness at 30 ML', rr[rr.length - 1].toFixed(2) + ' ML'], ['growth mode', hops < 1 ? 'hit-and-stick (rough, amorphous)' : hops < 6 ? 'islands, partial smoothing' : 'step-flow / layer-like']]);
      c.csv(['ML', 'roughness'], MLs.map((m, i) => [m, rr[i].toFixed(4)]));
    },
    theory: '<p>An adatom hops between surface sites at a thermally activated rate</p><div class="eq">ν_hop = ν₀·exp(−E_d / kT)&nbsp;&nbsp; (ν₀ ≈ 10¹³ s⁻¹)</div><p>and keeps hopping for about one pulse period, 1/f, before the next pulse covers it. The number of sites it explores is the diffusion length</p><div class="eq">ℓ ≈ √(ν_hop / f)<span class="why">Raising T increases ℓ exponentially; lowering the repetition rate increases it only as the square root.</span></div><p>If ℓ is below one site, atoms stick where they land and the film is rough and amorphous. If ℓ is larger than the island spacing, atoms reach step edges and the film grows layer by layer.</p><p>For HZO, growing hot tends to give the non-polar monoclinic phase. The usual route is to grow amorphous near room temperature and crystallise afterwards with a capped rapid thermal anneal.</p>',
    look: '<ul><li>At 25 °C atoms stick where they land: the profile is rough.</li><li>Above about 500 °C (E_d = 1.4 eV) the film smooths visibly.</li><li>Changing the rate from 3 to 20 Hz shortens ℓ by only 2.6×.</li></ul>',
    ours: '<p>For our RT-grown PLD films, ℓ ≈ 0, so the as-grown film is amorphous. Roughness then comes from the anneal; compare AFM before and after RTA.</p>',
    refs: '<p>Venables, <i>Introduction to Surface and Thin Film Processes</i> (2000). Eason (ed.), <i>Pulsed Laser Deposition of Thin Films</i> (2007). E_d here is a model parameter, not a measured value for HZO.</p>'
  });

  MX.add({
    id: 'uniform', sec: 'pld', title: 'Thickness uniformity and calibration', layout: 'two', plots: ['a', 'b'],
    lede: 'The plume is strongly forward-directed, so the film is thickest in the middle. Moving the substrate away flattens the profile but slows the growth.',
    controls: [
      { id: 'd', label: 'Target–substrate distance', min: 30, max: 80, step: 1, value: 50, unit: 'mm', d: 0 },
      { id: 'n', label: 'Plume exponent n (cosⁿθ)', min: 2, max: 20, step: 1, value: 10, d: 0 },
      { id: 'gpp', label: 'Growth per pulse at 50 mm', min: 0.03, max: 0.3, step: 0.01, value: 0.1, unit: 'Å' },
      { id: 'N', label: 'Number of pulses', min: 200, max: 10000, step: 100, value: 1000, d: 0 }
    ],
    update(p, c) {
      const prof = (x, d) => Math.pow(1 + (x / d) ** 2, -(p.n + 3) / 2);
      const xs = MX.lin(-12, 12, 121); const sc = d => (50 / d) ** 2;
      c.plot('a', [{ x: xs, y: xs.map(x => prof(x, p.d) * sc(p.d)), name: 'd = ' + p.d + ' mm' }, { x: xs, y: xs.map(x => prof(x, 40) * sc(40)), name: 'd = 40 mm', col: 'muted', line: { dash: 'dot' } }, { x: xs, y: xs.map(x => prof(x, 70) * sc(70)), name: 'd = 70 mm', col: 'muted', line: { dash: 'dash' } }],
        { title: 'Thickness profile (relative to centre at 50 mm)', xaxis: { title: 'position on substrate (mm)' }, yaxis: { title: 'relative thickness', rangemode: 'tozero' }, shapes: [{ type: 'rect', x0: -5, x1: 5, y0: 0, y1: 1, yref: 'paper', fillcolor: 'rgba(196,86,29,0.08)', line: { width: 0 }, layer: 'below' }] });
      const Ns = MX.lin(0, 10000, 51); const g = p.gpp * sc(p.d);
      c.plot('b', [{ x: Ns, y: Ns.map(n => n * g / 10), name: 'centre thickness' }, { x: [p.N], y: [p.N * g / 10], mode: 'markers', col: 'hf', name: 'chosen', marker: { size: 12 } }],
        { title: 'Thickness from pulse count', xaxis: { title: 'pulses' }, yaxis: { title: 'thickness (nm)' } });
      c.out([['edge / centre at ±5 mm', (100 * prof(5, p.d)).toFixed(1) + ' %'], ['rate vs 50 mm', (100 * sc(p.d)).toFixed(0) + ' %'], ['growth per pulse here', g.toFixed(3) + ' Å'], ['centre thickness', (p.N * g / 10).toFixed(1) + ' nm'], ['pulses for 10 nm', Math.round(100 / g)]]);
      c.csv(['x_mm', 'rel_thickness'], xs.map(x => [x.toFixed(2), (prof(x, p.d) * sc(p.d)).toFixed(5)]));
    },
    theory: '<p>Treat the plume as a point source with angular flux ∝ cosⁿθ (n ≈ 8–12 for oxide plumes). On a flat substrate at distance d, a point at lateral position x sees</p><div class="eq">t(x)/t(0) = [1 + (x/d)²]^(−(n+3)/2)<span class="why">The extra 3 comes from the 1/r² spreading and the oblique angle of incidence.</span></div><p>The centre rate falls roughly as 1/d². Thickness is pulses × growth per pulse, so calibrate the growth per pulse by X-ray reflectivity on a test film, and repeat whenever fluence, distance or target change. The coercive voltage scales with thickness, so a thickness error shifts the Vmax you need.</p>',
    look: '<ul><li>At 50 mm and n = 10, the edge of a 10 mm sample is about 94 % of the centre thickness.</li><li>A wider plume (smaller n) is more uniform but wastes material.</li></ul>',
    ours: '<p>Measure thickness by XRR at the centre and at the edge of one sample to fit n for our system. Then the uniformity on every later sample is known.</p>',
    refs: '<p>Eason (ed.), <i>Pulsed Laser Deposition of Thin Films</i> (2007), chapter on plume angular distribution.</p>'
  });
})();
