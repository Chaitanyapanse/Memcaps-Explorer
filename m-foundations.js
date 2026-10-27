/* Foundations: Landau double well, phase stability vs grain size, switching kinetics */
(function () {
  const MX = window.MX;
  MX.sec('found', 'Foundations', 'Free energy, phases and switching kinetics: the physics every later model uses.');

  MX.add({
    id: 'landau', sec: 'found', title: 'Landau double well', layout: 'two', plots: ['a', 'b'],
    lede: 'The free energy F(P) has two minima. A field tilts them; when one well vanishes the polarisation jumps. That jump is the coercive field, and the curvature of the well is the capacitance.',
    controls: [
      { id: 'al', label: 'α (below T₀ it is negative)', min: -2, max: 0.5, step: 0.05, value: -1, d: 2 },
      { id: 'be', label: 'β', min: 0.3, max: 2, step: 0.05, value: 1, d: 2 },
      { id: 'E', label: 'Applied field E', min: -1.5, max: 1.5, step: 0.01, value: 0.3, d: 2, hint: 'Reduced units: F in units of α²/β' }
    ],
    update(p, c) {
      const a = p.al, b = p.be, E = p.E;
      const F = P => a * P * P + b * P ** 4 - E * P;
      const Ps = a < 0 ? Math.sqrt(-a / (2 * b)) : 0;
      const Ec = a < 0 ? (4 * Math.abs(a) / 3) * Math.sqrt(Math.abs(a) / (6 * b)) : 0;
      const xs = MX.lin(-1.6, 1.6, 321);
      const mins = []; for (let i = 1; i < xs.length - 1; i++) { if (F(xs[i]) < F(xs[i - 1]) && F(xs[i]) < F(xs[i + 1])) mins.push(xs[i]); }
      c.plot('a', [
        { x: xs, y: xs.map(P => F(P)), name: 'F(P) at current E' },
        { x: xs, y: xs.map(P => a * P * P + b * P ** 4), name: 'F(P) at E = 0', line: { dash: 'dot', width: 1.5 }, col: 'muted' },
        { x: mins, y: mins.map(F), mode: 'markers', name: 'stable states', col: 'hf', marker: { size: 12 } }
      ], { title: 'Free energy landscape', xaxis: { title: 'Polarisation P' }, yaxis: { title: 'F', range: [Math.min(-0.6, ...xs.map(F)) - 0.05, 1] } });
      const Pc = MX.lin(-1.6, 1.6, 321); const stab = [], unst = [];
      Pc.forEach(P => { const e = 2 * a * P + 4 * b * P ** 3; const k = 2 * a + 12 * b * P * P; (k > 0 ? stab : unst).push([e, P]); });
      const chi = mins.map(P => 1 / (2 * a + 12 * b * P * P));
      c.plot('b', [
        { x: stab.map(q => q[0]), y: stab.map(q => q[1]), mode: 'markers', marker: { size: 3 }, name: 'stable branch' },
        { x: unst.map(q => q[0]), y: unst.map(q => q[1]), mode: 'markers', marker: { size: 3 }, name: 'unstable (never seen)', col: 'muted' },
        { x: mins.map(() => E), y: mins, mode: 'markers', name: 'now', col: 'hf', marker: { size: 12 } }
      ], { title: 'Equation of state E = 2αP + 4βP³', xaxis: { title: 'E', range: [-1.6, 1.6] }, yaxis: { title: 'P', range: [-1.6, 1.6] },
        shapes: Ec ? [{ type: 'line', x0: Ec, x1: Ec, y0: -1.6, y1: 1.6, line: { dash: 'dash', color: 'muted', width: 1 } }, { type: 'line', x0: -Ec, x1: -Ec, y0: -1.6, y1: 1.6, line: { dash: 'dash', color: 'muted', width: 1 } }] : [] });
      c.out([['Ps', MX.fmt(Ps)], ['Ec (intrinsic)', MX.fmt(Ec)], ['states at this E', String(mins.length)], ['χ = 1/F″ at state', chi.map(v => MX.fmt(v)).join(' / ')]]);
      c.csv(['P', 'F_at_E', 'F_at_0'], xs.map(P => [P.toFixed(3), F(P).toFixed(5), (a * P * P + b * P ** 4).toFixed(5)]));
    },
    theory: '<p>Near a ferroelectric transition the free energy per volume is expanded in the order parameter P:</p><div class="eq">F(P) = αP² + βP⁴ − E·P,&nbsp;&nbsp; α = α₀(T − T₀)<span class="why">β &gt; 0 keeps the energy bounded; for a first-order transition add γP⁶ with β &lt; 0.</span></div><p>Equilibrium needs ∂F/∂P = 0, which gives the equation of state on the right. Below T₀ (α &lt; 0) it has two minima at</p><div class="eq">Ps = √(−α / 2β)</div><p>The S-shaped curve has an unstable middle part where ∂²F/∂P² &lt; 0. The upper branch ends where ∂E/∂P = 0, at P* = √(−α/6β). The field there is the intrinsic coercive field:</p><div class="eq">Ec = (4|α|/3)·√(|α| / 6β)</div><p>The small-signal susceptibility is the inverse curvature of the occupied well. It grows as the well becomes shallow, near Ec:</p><div class="eq">χ = ∂P/∂E = 1 / (2α + 12βP²)<span class="why">This is why a capacitance–voltage curve of a ferroelectric peaks near ±Vc: the butterfly.</span></div><p>Real hafnia films switch at fields roughly ten times lower than this intrinsic Ec, because switching starts by nucleation at defects and grain boundaries. The kinetics model handles that.</p>',
    look: '<ul><li>Drag E slowly to one side: one minimum gets shallower, then disappears. That is the jump.</li><li>The readout χ grows as you approach Ec.</li><li>Set α &gt; 0: a single well, no memory (paraelectric).</li></ul>',
    ours: '<p>The butterfly peak in our C–V data is the χ divergence smeared by the distribution of local coercive fields. The memcapacitor reads exactly this curvature at 0 V.</p>',
    refs: '<p>Devonshire, Phil. Mag. 40, 1040 (1949). Any ferroelectrics text, for example Rabe, Ahn and Triscone, <i>Physics of Ferroelectrics</i> (2007).</p>'
  });

  MX.add({
    id: 'phases', sec: 'found', title: 'Which phase wins: grain size', plots: ['a'],
    lede: 'Bulk HfO₂ and ZrO₂ are monoclinic. In thin films, surface energy, composition and a stiff cap can make the polar orthorhombic or the tetragonal phase win.',
    controls: [
      { id: 'zr', label: 'Zr fraction', min: 0, max: 1, step: 0.01, value: 0.5, fmt: v => Math.round(v * 100) + ' %' },
      { id: 'cap', label: 'Cap stiffness (elastic penalty on m)', min: 0, max: 1, step: 0.01, value: 0.5, hint: '0 = no cap, 1 = very stiff cap such as W' },
      { id: 'vo', label: 'Oxygen vacancies (stabilise o)', min: 0, max: 1, step: 0.01, value: 0.3 }
    ],
    update(p, c) {
      /* illustrative energies (meV per formula unit) and surface terms; G = u + k·γ/x with x in nm */
      const uo = 75 - 25 * p.vo - 15 * p.zr, ut = 40 + 100 * (1 - p.zr);
      const um2 = 100 * p.cap; const k = 120; const gm = 3.5, go = 1.6, gt = 0.8;
      const xs = MX.lin(2, 40, 300);
      const Gm = x => um2 + k * gm / x, Go = x => uo + k * go / x, Gt = x => ut + k * gt / x;
      const win = x => { const v = [Gm(x), Go(x), Gt(x)]; return ['m', 'o', 't'][v.indexOf(Math.min(...v))]; };
      const bands = []; let cur = win(xs[0]), x0 = xs[0];
      xs.forEach(x => { const w = win(x); if (w !== cur) { bands.push([x0, x, cur]); cur = w; x0 = x; } }); bands.push([x0, xs[xs.length - 1], cur]);
      const col = { m: 'rgba(150,150,150,0.13)', o: 'rgba(196,86,29,0.16)', t: 'rgba(42,91,215,0.14)' };
      c.plot('a', [
        { x: xs, y: xs.map(Gm), name: 'monoclinic (P2₁/c, non-polar)', ci: 4 },
        { x: xs, y: xs.map(Go), name: 'orthorhombic (Pca2₁, polar)', ci: 1 },
        { x: xs, y: xs.map(Gt), name: 'tetragonal (P4₂/nmc, AFE-like)', ci: 0 }
      ], { title: 'Free energy per formula unit vs grain size', xaxis: { title: 'grain size x (nm)', type: 'log' }, yaxis: { title: 'G (meV per f.u., illustrative)' },
        shapes: bands.map(b => ({ type: 'rect', xref: 'x', yref: 'paper', x0: b[0], x1: b[1], y0: 0, y1: 1, fillcolor: col[b[2]], line: { width: 0 }, layer: 'below' })),
        annotations: bands.map(b => ({ x: Math.log10(Math.sqrt(b[0] * b[1])), y: 0.04, xref: 'x', yref: 'paper', text: b[2] + ' wins', showarrow: false })) });
      const crit = bands.map(b => b[2] + ': ' + b[0].toFixed(1) + '–' + b[1].toFixed(1) + ' nm');
      c.out([['Phase at 10 nm grains', win(10)], ['Phase at 30 nm grains', win(30)], ['Bands', crit.join('<br>')]]);
      c.csv(['x_nm', 'G_m', 'G_o', 'G_t'], xs.map(x => [x.toFixed(2), Gm(x).toFixed(2), Go(x).toFixed(2), Gt(x).toFixed(2)]));
    },
    theory: '<p>The free energy of one grain has a bulk part that scales with volume and an interface part that scales with area:</p><div class="eq">G(x) = ΔU·V(x) + Σ A(x)·γ ⇒ G/V = u + k·γ/x<span class="why">k is a shape factor (6 for a cube). Phases with lower surface energy γ win at small size x.</span></div><p>Two phases are equal when u₁ + kγ₁/x = u₂ + kγ₂/x, so the critical size is x* = k(γ₁ − γ₂)/(u₂ − u₁). For hafnia the ordering of surface energies is roughly γ_m &gt; γ_o &gt; γ_t, while the bulk energies run the other way. The result is the sequence t → o → m as grains grow.</p><p>Three knobs shift the curves:</p><ul><li><b>Zr</b> lowers the tetragonal energy, which is why ZrO₂ is tetragonal, field-induced and AFE-like.</li><li><b>A stiff cap during the anneal</b> adds an elastic penalty to the volume-expanding t → m transformation, ½M(Δε)², so m is blocked.</li><li><b>Oxygen vacancies and dopants</b> lower the o energy.</li></ul><p>Grain size grows with film thickness, so the same composition can be AFE-like when thin and FE when thick.</p>',
    look: '<ul><li>Raise Zr to 90 %: the tetragonal band widens; small grains become AFE-like.</li><li>Set the cap to 0: monoclinic takes over at large grains.</li><li>The numbers are illustrative; the ordering of the curves is the physics.</li></ul>',
    ours: '<p>Our 78 % and 87 % Zr films are AFE-like at 10 nm and FE at 50 nm. In this model that is the t → o crossover moving with grain size. GIXRD and grain-size statistics from TEM would test it.</p>',
    refs: '<p>Müller et al., Nano Lett. 12, 4318 (2012). Chae et al., ACS AMI 14, 36771 (2022). Materlik, Künneth and Kersch, J. Appl. Phys. 117, 134109 (2015).</p>'
  });

  MX.add({
    id: 'kinetics', sec: 'found', title: 'Switching kinetics: KAI vs NLS', layout: 'two', plots: ['a', 'b'],
    lede: 'A polycrystalline film switches region by region, each with its own time constant. Pulse width and voltage decide which regions have flipped, which is where analogue states come from.',
    controls: [
      { id: 'V', label: 'Pulse amplitude', min: 1, max: 4, step: 0.05, value: 2.2, unit: 'V' },
      { id: 'lt', label: 'Pulse width', min: -9, max: -2, step: 0.05, value: -6, fmt: v => MX.sci(10 ** v) + ' s' },
      { id: 'w', label: 'Spread of log τ (decades)', min: 0.1, max: 2.5, step: 0.05, value: 1.0, d: 2 },
      { id: 'd', label: 'Film thickness', min: 5, max: 30, step: 1, value: 10, unit: 'nm', d: 0 }
    ],
    update(p, c) {
      const tinf = 1e-12, Ea = 30; /* MV/cm, Merz activation field (illustrative) */
      const tauMed = V => tinf * Math.exp(Ea / (V / (p.d * 1e-7) / 1e6));
      const nls = (t, V) => { const x = (Math.log10(t) - Math.log10(tauMed(V))) / p.w; return 0.5 + Math.atan(x * 1.0) / Math.PI; };
      const kai = (t, V) => 1 - Math.exp(-Math.pow(t / tauMed(V), 2));
      const lts = MX.lin(-10, 0, 300); const ts = lts.map(v => 10 ** v);
      const Vs = [p.V - 0.4, p.V, p.V + 0.4];
      const tr = Vs.map((V, i) => ({ x: ts, y: ts.map(t => nls(t, V)), name: 'NLS at ' + V.toFixed(2) + ' V', ci: i, line: { width: i === 1 ? 3.5 : 1.8 } }));
      tr.push({ x: ts, y: ts.map(t => kai(t, p.V)), name: 'KAI (single τ) at ' + p.V.toFixed(2) + ' V', col: 'muted', line: { dash: 'dot' } });
      const tw = 10 ** p.lt; tr.push({ x: [tw], y: [nls(tw, p.V)], mode: 'markers', name: 'this pulse', col: 'hf', marker: { size: 13 } });
      c.plot('a', tr, { title: 'Switched fraction vs pulse width', xaxis: { title: 'pulse width (s)', type: 'log', exponentformat: 'power' }, yaxis: { title: 'switched fraction', range: [0, 1.02] } });
      const VV = MX.lin(0.5, 5, 200);
      c.plot('b', [{ x: VV, y: VV.map(V => nls(tw, V)), name: 'NLS, fixed width' }, { x: VV, y: VV.map(V => kai(tw, V)), name: 'KAI, fixed width', col: 'muted', line: { dash: 'dot' } }, { x: [p.V], y: [nls(tw, p.V)], mode: 'markers', name: 'this pulse', col: 'hf', marker: { size: 13 } }],
        { title: 'Switched fraction vs amplitude (width fixed)', xaxis: { title: 'pulse amplitude (V)' }, yaxis: { title: 'switched fraction', range: [0, 1.02] } });
      const f = nls(tw, p.V); const levels = Math.max(1, Math.round(4 * p.w));
      c.out([['E at this pulse', (p.V / (p.d * 1e-7) / 1e6).toFixed(2) + ' MV/cm'], ['median τ(V)', MX.sci(tauMed(p.V)) + ' s'], ['switched (NLS)', (100 * f).toFixed(1) + ' %'], ['switched (KAI)', (100 * kai(tw, p.V)).toFixed(1) + ' %'], ['decades of usable width', (4 * p.w).toFixed(1)]]);
      c.csv(['t_s', 'nls_Vlow', 'nls_V', 'nls_Vhigh', 'kai_V'], ts.map(t => [t.toExponential(3), nls(t, Vs[0]).toFixed(4), nls(t, Vs[1]).toFixed(4), nls(t, Vs[2]).toFixed(4), kai(t, p.V).toFixed(4)]));
      void levels;
    },
    theory: '<p><b>KAI</b> (Kolmogorov–Avrami–Ishibashi) describes a uniform crystal in which domains nucleate and grow everywhere at the same rate:</p><div class="eq">ΔP(t)/2Ps = 1 − exp[−(t/t₀)ⁿ]<span class="why">n is the effective dimensionality of domain growth. The switch completes within about one decade of time.</span></div><p><b>NLS</b> (nucleation-limited switching, Tagantsev 2002) treats the film as many independent regions. Each switches as soon as one nucleus appears, after a time τ that varies from region to region. With a broad distribution g(log τ):</p><div class="eq">ΔP(t)/2Ps = ∫ [1 − e^(−t/τ)] · g(log τ) d log τ</div><p>The field sets where the distribution sits, through Merz’s law:</p><div class="eq">τ(E) = τ∞ · exp(E_a / E)<span class="why">Small changes in E move τ by decades, so pulse width and amplitude are interchangeable along lines of constant switched fraction.</span></div><p>In hafnia the polar phonon band is almost flat, so domain walls cost little and neighbouring regions barely interact. Switching is therefore close to NLS, and a partial pulse leaves a stable intermediate polarisation. That is the basis of multi-level memcapacitors and linear synaptic updates.</p>',
    look: '<ul><li>Broaden the spread: the NLS curve becomes a long ramp, giving many analogue states.</li><li>Shrink it to 0.1 decades: NLS approaches KAI, which is almost binary.</li><li>Change the amplitude by 0.4 V: the curve shifts by several decades in time.</li></ul>',
    ours: '<p>Measure PUND switched polarisation against pulse width at three amplitudes and fit this model. The fitted spread tells us how many capacitance levels our films can hold.</p>',
    refs: '<p>Ishibashi and Takagi, J. Phys. Soc. Jpn. 31, 506 (1971). Tagantsev et al., Phys. Rev. B 66, 214109 (2002). Merz, Phys. Rev. 95, 690 (1954). H.-J. Lee et al., Science 369, 1343 (2020).</p>'
  });
})();
