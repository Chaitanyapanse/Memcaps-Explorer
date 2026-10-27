/* Fronts C, D, E: switching path, antiferroelectric memory, layered stacks, retention, leaky integration, reservoir computing */
(function () {
  const MX = window.MX;
  const EPS = 0.08854;
  MX.sec('switch', 'Phases and switching', 'How the tetragonal phase enters switching, and how a biased antiferroelectric becomes a memory.');
  MX.sec('layers', 'Layered films', 'Electrostatic coupling in HZO/ZrO₂ stacks.');
  MX.sec('time', 'Memory in time', 'Retention, volatile states, and computing with fading memory.');

  MX.add({
    id: 'oto', sec: 'switch', title: 'Switching through the tetragonal phase', layout: 'two', plots: ['a', 'b'],
    lede: 'Recent in-situ X-ray work shows polarisation reversing through a non-polar tetragonal stop-over. Lowering that barrier lowers the coercive field.',
    controls: [
      { id: 'q', label: 'Landscape parameter q', min: 0.7, max: 1.08, step: 0.005, value: 0.9, d: 3, hint: 'Higher q raises the o wells toward the t well (Zr, strain, vacancies)' },
      { id: 'E', label: 'Field for the landscape view', min: -1.4, max: 1.4, step: 0.01, value: 0.4, d: 2 }
    ],
    update(p, c) {
      const q = p.q; const U = (x, E) => x ** 6 - 2.1 * x ** 4 + q * x * x - E * x; const dU = (x, E) => 6 * x ** 5 - 8.4 * x ** 3 + 2 * q * x - E;
      const xs = MX.lin(-1.5, 1.5, 301);
      c.plot('a', [{ x: xs, y: xs.map(x => U(x, p.E)), name: 'U(P) at chosen E' }, { x: xs, y: xs.map(x => U(x, 0)), name: 'U(P) at E = 0', col: 'muted', line: { dash: 'dot' } }],
        { title: 'Energy landscape: o (±P) and t (P = 0)', xaxis: { title: 'P (reduced)' }, yaxis: { title: 'U (reduced)', range: [-1.2, 1.2] } });
      const sweep = MX.sweep(1.4, 800, 2); let x = -1.05; const loop = []; let ec = null;
      sweep.forEach((E, i) => { for (let k = 0; k < 200; k++) x -= 0.01 * dU(x, E); if (i >= sweep.length / 2 - 1) { loop.push([E, x]); if (ec === null && loop.length > 1 && loop[loop.length - 2][1] < 0 && x > 0) ec = E; } });
      c.plot('b', [{ x: loop.map(r => r[0]), y: loop.map(r => r[1]), name: 'quasi-static loop' }], { title: 'P–E loop from this landscape', xaxis: { title: 'E (reduced)' }, yaxis: { title: 'P (reduced)' } });
      const disc = 17.64 - 12 * q; const xo = Math.sqrt((4.2 + Math.sqrt(Math.max(0, disc))) / 6), xb = Math.sqrt((4.2 - Math.sqrt(Math.max(0, disc))) / 6);
      c.out([['U(o) − U(t)', MX.fmt(U(xo, 0))], ['barrier o → t', MX.fmt(U(xb, 0) - U(xo, 0))], ['coercive field (from loop)', ec === null ? '> 1.4' : MX.fmt(ec)], ['P at the o well', MX.fmt(xo)]]);
      c.csv(['E', 'P'], loop.map(r => [r[0].toFixed(4), r[1].toFixed(4)]));
    },
    theory: '<p>A sixth-order Landau expansion can hold three minima: two polar orthorhombic wells at ±P and a non-polar tetragonal well at P = 0:</p><div class="eq">U(P) = P⁶ − 2.1·P⁴ + q·P² − E·P<span class="why">For 0 &lt; q &lt; 1.1 the o wells are lowest and t is metastable. As q rises the o wells approach t in energy.</span></div><p>Switching then follows o(−P) → t → o(+P). The coercive field is set by the barrier out of the o well, not by the full depth of the double well. Anything that brings o and t closer in energy (Zr content, in-plane tension, oxygen vacancies, interface engineering) lowers that barrier and the coercive field.</p><p>Chen et al. (Nat. Commun. 2025) saw this path directly with in-situ grazing-incidence X-ray diffraction under field, and reached Ec ≈ 0.6 MV/cm in 8 nm HZO.</p>',
    look: '<ul><li>Raise q toward 1.08: the loop narrows. Lower barrier means lower Ec.</li><li>Near q = 1.1 the t well becomes as deep as o: the film turns AFE-like (next model).</li></ul>',
    ours: '<p>Our Zr-rich films sit near the high-q end. Low Ec but a risk of AFE behaviour; the thickness series decides which side we are on.</p>',
    refs: '<p>Chen et al., Nat. Commun. 16, 8188 (2025). Reyes-Lillo, Garrity and Rabe, Phys. Rev. B 90, 140103 (2014), on antiferroelectricity in ZrO₂ from first principles.</p>'
  });

  MX.add({
    id: 'afe', sec: 'switch', title: 'Biased antiferroelectric memory', layout: 'two', plots: ['a', 'b'],
    lede: 'Zr-rich films switch into the polar phase only under field, giving a double loop and no memory at 0 V. A built-in field larger than E_down shifts one loop across zero and creates two stable states.',
    controls: [
      { id: 'eu', label: 'Forward transition field E_up', min: 0.6, max: 2.5, step: 0.05, value: 1.4, unit: 'MV/cm' },
      { id: 'ed', label: 'Backward transition field E_down', min: 0.2, max: 2.0, step: 0.05, value: 0.8, unit: 'MV/cm' },
      { id: 'eb', label: 'Built-in field E_bi', min: 0, max: 2, step: 0.01, value: 1.0, unit: 'MV/cm' },
      { id: 'w', label: 'Transition width', min: 0.03, max: 0.4, step: 0.01, value: 0.1, unit: 'MV/cm' }
    ],
    update(p, c) {
      const ed = Math.min(p.ed, p.eu - 0.05); const s = x => 0.5 * (1 + Math.tanh(x));
      const up = E => { const e = E + p.eb; return 15 * (s((e - p.eu) / p.w) - s((-e - ed) / p.w)); };
      const dn = E => { const e = E + p.eb; return 15 * (s((e - ed) / p.w) - s((-e - p.eu) / p.w)); };
      const Es = MX.lin(-3.5, 3.5, 351);
      c.plot('a', [{ x: Es, y: Es.map(up), name: 'increasing E' }, { x: Es, y: Es.map(dn), name: 'decreasing E' }, { x: [0, 0], y: [up(0), dn(0)], mode: 'markers', col: 'hf', name: 'states at 0 V', marker: { size: 12 } }],
        { title: 'Double loop shifted by the built-in field', xaxis: { title: 'applied E (MV/cm)' }, yaxis: { title: 'P (µC/cm²)' } });
      const ebs = MX.lin(0, 2.5, 126); const gap = ebs.map(b => { const u0 = 15 * (s((b - p.eu) / p.w) - s((-b - ed) / p.w)); const d0 = 15 * (s((b - ed) / p.w) - s((-b - p.eu) / p.w)); return Math.abs(d0 - u0); });
      c.plot('b', [{ x: ebs, y: gap, name: 'P difference between states at 0 V' }, { x: [p.eb], y: [Math.abs(dn(0) - up(0))], mode: 'markers', col: 'hf', name: 'now', marker: { size: 12 } }],
        { title: 'Memory window vs built-in field', xaxis: { title: 'E_bi (MV/cm)' }, yaxis: { title: 'ΔP at 0 V (µC/cm²)' }, shapes: [{ type: 'line', x0: ed, x1: ed, y0: 0, y1: 1, yref: 'paper', line: { color: 'muted', dash: 'dash', width: 1 } }, { type: 'line', x0: p.eu, x1: p.eu, y0: 0, y1: 1, yref: 'paper', line: { color: 'muted', dash: 'dash', width: 1 } }] });
      const nv = p.eb > ed && p.eb < p.eu;
      c.out([['states at 0 V', nv ? 'two: non-volatile' : (p.eb >= p.eu ? 'one (polar, always on)' : 'one: volatile')], ['ΔP at 0 V', Math.abs(dn(0) - up(0)).toFixed(1) + ' µC/cm²'], ['needed: E_down < E_bi < E_up', ed.toFixed(2) + ' < ' + p.eb.toFixed(2) + ' < ' + p.eu.toFixed(2)]]);
      c.csv(['E', 'P_up', 'P_down'], Es.map(E => [E.toFixed(3), up(E).toFixed(3), dn(E).toFixed(3)]));
    },
    theory: '<p>At zero field the tetragonal phase has the lower free energy, G_t &lt; G_o. In a field the polar phase gains −P_o·E, so it wins above</p><div class="eq">E_up ≈ (G_o − G_t) / P_o</div><p>The transition is first order, so on the way back the film returns to t at a lower field, E_down &lt; E_up. Each half of the double loop is therefore a small hysteresis loop, centred at ±(E_up + E_down)/2.</p><p>Add a built-in field E_bi from asymmetric electrodes, Ti scavenging or a composition gradient. The positive loop moves toward zero. Once</p><div class="eq">E_down &lt; E_bi &lt; E_up</div><p>the loop straddles 0 V. After a positive pulse the film stays polar; after a negative pulse it returns to t. Two states at zero bias with very different capacitance: a non-volatile AFE memory (Pešić et al., 2016). Depolarisation fields from a dielectric interface can produce the same double loop (Lomenzo 2020), so either origin can be biased this way.</p>',
    look: '<ul><li>E_bi = 0: classic double loop, one state at 0 V.</li><li>Raise E_bi past E_down: a second state appears and ΔP jumps.</li><li>Past E_up the film is permanently polar: the window closes again.</li></ul>',
    ours: '<p>Direction 2 of the project: the 10 nm, 78 % and 87 % Zr films with Ti tops (scavenging bias) vs Pt tops. Measure the loop centres to get E_bi, then read C at 0 V after ± pulses.</p>',
    refs: '<p>Pešić et al., Adv. Funct. Mater. 26, 7486 (2016). Müller et al., Nano Lett. 12, 4318 (2012). Lomenzo et al., ACS Appl. Electron. Mater. 2, 1583 (2020). Kim et al., ACS AMI 18, 16692 (2026).</p>'
  });

  MX.add({
    id: 'stack', sec: 'layers', title: 'FE/AFE stack coupling', layout: 'two', plots: ['a', 'b'],
    lede: 'In a stack, D is continuous across every interface. A ferroelectric layer can drag an antiferroelectric layer along, so the stack shows a loop that neither layer has alone.',
    controls: [
      { id: 'fr', label: 'FE fraction of 10 nm', min: 0, max: 1, step: 0.02, value: 0.5, fmt: v => Math.round(v * 100) + ' %' },
      { id: 'V', label: 'Vmax', min: 1, max: 6, step: 0.1, value: 4, unit: 'V' },
      { id: 'e2', label: 'AFE layer E_up', min: 0.6, max: 2.5, step: 0.05, value: 1.5, unit: 'MV/cm' }
    ],
    update(p, c) {
      const d = 10, d1 = p.fr * d, d2 = (1 - p.fr) * d; const s = x => 0.5 * (1 + Math.tanh(x)); const eu = p.e2, ed = 0.55 * p.e2, w = 0.12;
      const P1 = (E, up) => 20 * Math.tanh((E - (up ? 1 : -1) * 1.0) / 0.25);
      const P2 = (E, up) => up ? 15 * (s((E - eu) / w) - s((-E - ed) / w)) : 15 * (s((E - ed) / w) - s((-E - eu) / w));
      const Eof = (D, er, P, up) => { let lo = -20, hi = 20; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; (EPS * er * m + P(m, up) > D) ? hi = m : lo = m; } return (lo + hi) / 2; };
      const solve = (V, up) => { let lo = -200, hi = 200; let E1 = 0, E2 = 0; for (let k = 0; k < 50; k++) { const D = (lo + hi) / 2; E1 = d1 > 0 ? Eof(D, 30, P1, up) : 0; E2 = d2 > 0 ? Eof(D, 30, P2, up) : 0; const v = (E1 * d1 + E2 * d2) * 0.1; v > V ? hi = D : lo = D; } return { D: (lo + hi) / 2, E1, E2 }; };
      const Vs = MX.lin(-p.V, p.V, 161); const upB = Vs.map(V => solve(V, true)), dnB = Vs.map(V => solve(V, false));
      const unc = (V, up) => p.fr * (EPS * 30 * V / d * 10 + P1(V / d * 10, up)) + (1 - p.fr) * (EPS * 30 * V / d * 10 + P2(V / d * 10, up));
      c.plot('a', [{ x: Vs, y: upB.map(r => r.D), name: 'stack, up-sweep' }, { x: Vs, y: dnB.map(r => r.D), name: 'stack, down-sweep' }, { x: Vs, y: Vs.map(V => unc(V, true)), name: 'uncoupled average (up)', col: 'muted', line: { dash: 'dot', width: 1.5 } }, { x: Vs, y: Vs.map(V => unc(V, false)), name: 'uncoupled average (down)', col: 'muted', line: { dash: 'dot', width: 1.5 } }],
        { title: 'Charge vs voltage (what the tester measures)', xaxis: { title: 'V (V)' }, yaxis: { title: 'D = Q/A (µC/cm²)' } });
      c.plot('b', [{ x: Vs, y: upB.map(r => r.E1), name: 'field in FE layer' }, { x: Vs, y: upB.map(r => r.E2), name: 'field in AFE layer' }],
        { title: 'Field in each layer (up-sweep)', xaxis: { title: 'V (V)' }, yaxis: { title: 'E (MV/cm)' } });
      const i0 = Vs.findIndex(v => v >= 0); const rem = Math.abs(dnB[i0].D - upB[i0].D) / 2;
      c.out([['FE / AFE thickness', d1.toFixed(1) + ' / ' + d2.toFixed(1) + ' nm'], ['remanent D at 0 V', rem.toFixed(1) + ' µC/cm²'], ['FE alone would give', '≈ 20 µC/cm²'], ['AFE alone would give', '0 at 0 V']]);
      c.csv(['V', 'D_up', 'D_down', 'E_FE_up', 'E_AFE_up'], Vs.map((V, i) => [V.toFixed(3), upB[i].D.toFixed(3), dnB[i].D.toFixed(3), upB[i].E1.toFixed(4), upB[i].E2.toFixed(4)]));
    },
    theory: '<p>For two layers in series, with no free charge at the interface, the displacement is the same in both:</p><div class="eq">D = ε₀ε₁E₁ + P₁(E₁) = ε₀ε₂E₂ + P₂(E₂),&nbsp;&nbsp; V = E₁d₁ + E₂d₂</div><p>Given V, these two equations fix E₁, E₂ and D. If the layers try to hold different polarisations, the difference creates a bound sheet charge ΔP at the interface, whose field costs energy of order (ΔP)²·d/2ε₀ε. The system lowers that energy by making the layers switch together:</p><ul><li>When the FE layer holds +P at 0 V, it puts a field on the AFE layer that can keep it polar.</li><li>The AFE layer in turn depolarises the FE layer, lowering its remanence.</li></ul><p>The measured loop is therefore not the thickness-weighted average of the two layers. Real superlattices add a second effect: thin layers cap the grain size and favour the tetragonal phase.</p>',
    look: '<ul><li>Compare the stack with the dotted uncoupled average: coupling changes both the shape and the remanence.</li><li>At 50 % FE, the field in the AFE layer at 0 V is not zero: that is the coupling.</li></ul>',
    ours: '<p>Our ALD superlattices (ALD3/6/9/12) give Pr 2.7–5.2 µC/cm², well below HZO. PLD lets us vary the number and order of layers at fixed total thickness to test this model.</p>',
    refs: '<p>ArXiv 2509.07045 (2025) on HfO₂–ZrO₂ superlattices. Chen et al., Nano Research 19, 94908828 (2026). Kim et al., ACS AMI 18, 16692 (2026).</p>'
  });

  MX.add({
    id: 'retention', sec: 'time', title: 'Retention and back-switching', plots: ['a'],
    lede: 'After a write, the depolarising field and any built-in field remain. For one state they push it back. The time it takes is exponential in the inverse field.',
    controls: [
      { id: 'eb', label: 'Built-in field E_bi', min: 0, max: 1, step: 0.01, value: 0.15, unit: 'MV/cm' },
      { id: 'edp', label: 'Depolarising field E_dep', min: 0, max: 1, step: 0.01, value: 0.2, unit: 'MV/cm' },
      { id: 'T', label: 'Temperature', min: 25, max: 150, step: 1, value: 85, unit: '°C', d: 0 },
      { id: 'w', label: 'Spread of log τ', min: 0.5, max: 4, step: 0.1, value: 2, unit: 'decades', d: 1 }
    ],
    update(p, c) {
      const tinf = 1e-12, Ea = 15, U = 0.3, kB = 8.617e-5; const T = p.T + 273.15;
      const tau = E => E <= 0 ? Infinity : tinf * Math.exp(Ea / E) * Math.exp(U / kB / T) / Math.exp(U / kB / 298.15);
      const frac = (t, E) => { const tm = tau(E); if (!isFinite(tm)) return 0; return MX.ncdf((Math.log10(t) - Math.log10(tm)) / (p.w / 2)); };
      const ts = MX.lin(-6, 9, 300).map(v => 10 ** v);
      const Ebad = p.eb + p.edp, Egood = Math.max(0, p.edp - p.eb);
      c.plot('a', [{ x: ts, y: ts.map(t => 100 * (1 - 2 * frac(t, Ebad))), name: 'state pushed by E_bi + E_dep' }, { x: ts, y: ts.map(t => 100 * (1 - 2 * frac(t, Egood))), name: 'state helped by E_bi' }],
        { title: 'Remaining polarisation after a write', xaxis: { title: 'time (s)', type: 'log', exponentformat: 'power' }, yaxis: { title: 'P / P₀ (%)', range: [-100, 102] }, shapes: [{ type: 'line', x0: 3.15e8, x1: 3.15e8, y0: 0, y1: 1, yref: 'paper', line: { color: 'muted', dash: 'dash', width: 1 } }], annotations: [{ x: 8.5, y: 0.95, xref: 'x', yref: 'paper', text: '10 years', showarrow: false }] });
      const t90 = E => { const tm = tau(E); if (!isFinite(tm)) return Infinity; return 10 ** (Math.log10(tm) - 1.645 * (p.w / 2)); };
      c.out([['field on weak state', Ebad.toFixed(2) + ' MV/cm'], ['time to lose 10 %', MX.sci(t90(Ebad)) + ' s'], ['median τ', MX.sci(tau(Ebad)) + ' s'], ['other state', Egood > 0 ? 'also decays, slower' : 'stable']]);
      c.csv(['t_s', 'P_weak_pct', 'P_strong_pct'], ts.map(t => [t.toExponential(3), (100 * (1 - 2 * frac(t, Ebad))).toFixed(3), (100 * (1 - 2 * frac(t, Egood))).toFixed(3)]));
    },
    theory: '<p>At zero bias two fields remain on the ferroelectric: the depolarising field, which always opposes the stored polarisation, and the built-in field, which has a fixed direction. For one state they add:</p><div class="eq">E_back = E_dep + E_bi&nbsp;&nbsp;(weak state),&nbsp;&nbsp; E_dep − E_bi&nbsp;&nbsp;(strong state)</div><p>Back-switching is nucleation-limited, so each region relaxes with a Merz-type time, also thermally activated:</p><div class="eq">τ = τ∞·exp(E_a / E_back)·exp(U / kT)</div><p>With a broad NLS distribution of τ the loss is roughly linear in log t, the shape seen in most retention data. The same equation explains a deliberately volatile device: a large E_bi brings τ down to milliseconds.</p>',
    look: '<ul><li>Increase E_bi: the weak state fails earlier while the strong state improves.</li><li>Heat to 150 °C: the curves shift left by decades.</li></ul>',
    ours: '<p>Measure retention for both states separately (same-state and opposite-state). The asymmetry gives E_bi directly; heating gives U.</p>',
    refs: '<p>Merz, Phys. Rev. 95, 690 (1954). Tagantsev et al., Phys. Rev. B 66, 214109 (2002). Fehlings et al., arXiv 2508.08973 (2025).</p>'
  });

  MX.add({
    id: 'leaky', sec: 'time', title: 'Volatile memory as a leaky integrator', plots: ['a'],
    lede: 'When one state relaxes in milliseconds, the device adds up pulses that arrive close together and forgets isolated ones, like a neuron membrane.',
    controls: [
      { id: 'tau', label: 'Relaxation time τ', min: 0.05, max: 5, step: 0.05, value: 1, unit: 'ms' },
      { id: 'a', label: 'Fraction switched per pulse', min: 0.05, max: 0.6, step: 0.01, value: 0.25 },
      { id: 'th', label: 'Read-out threshold', min: 0.2, max: 0.95, step: 0.01, value: 0.6 }
    ],
    update(p, c) {
      const spikes = [0.5, 1.0, 1.5, 4.0, 4.2, 4.4, 4.6, 7.5, 9.5, 11.0, 11.15, 11.3, 11.45, 11.6]; const T = 14, n = 1400;
      const ts = MX.lin(0, T, n); let P = 0, j = 0; const Ps = []; const fires = [];
      ts.forEach((t, i) => { if (i > 0) P *= Math.exp(-(t - ts[i - 1]) / p.tau); while (j < spikes.length && spikes[j] <= t) { P += p.a * (1 - P); j++; } Ps.push(P); if (P > p.th && (fires.length === 0 || t - fires[fires.length - 1] > 0.3)) fires.push(t); });
      c.plot('a', [{ x: ts, y: Ps, name: 'stored fraction P(t)' }, { x: spikes, y: spikes.map(() => -0.05), mode: 'markers', name: 'input pulses', col: 'muted', marker: { symbol: 'line-ns-open', size: 14 } }, { x: [0, T], y: [p.th, p.th], name: 'threshold', col: 'hf', line: { dash: 'dash' } }, { x: fires, y: fires.map(() => p.th), mode: 'markers', col: 'hf', name: 'crossings', marker: { size: 11 } }],
        { title: 'Leaky integration of pulse bursts', xaxis: { title: 'time (ms)' }, yaxis: { title: 'P / Ps', range: [-0.1, 1.05] } });
      c.out([['τ', p.tau.toFixed(2) + ' ms'], ['threshold crossings', String(fires.length)], ['burst detected', fires.length ? 'yes' : 'no']]);
      c.csv(['t_ms', 'P'], ts.map((t, i) => [t.toFixed(4), Ps[i].toFixed(5)]));
    },
    theory: '<p>Each pulse switches a fraction a of the regions that have not yet switched, and between pulses the stored polarisation relaxes:</p><div class="eq">P → P + a·(1 − P)&nbsp; at each pulse,&nbsp;&nbsp; dP/dt = −P/τ&nbsp; between pulses</div><p>That is a leaky integrator, the same equation as the membrane of a leaky integrate-and-fire neuron. A burst of closely spaced pulses pushes P over a threshold; isolated pulses fade. τ is set by the built-in field and the pulse history (retention model), so one device can be tuned from short-term to long-term memory.</p>',
    look: '<ul><li>With τ = 1 ms only the dense bursts cross the threshold.</li><li>Raise τ to 5 ms: isolated pulses start to add up too.</li></ul>',
    ours: '<p>Our Ti-top films have an internal bias. Delayed PUND (write, wait 1 µs–1 s, read) gives τ directly and tells us whether they can act as volatile synapses.</p>',
    refs: '<p>Fehlings, Mikolajick, Noheda and Covi, arXiv 2508.08973 (2025).</p>'
  });

  MX.add({
    id: 'reservoir', sec: 'time', title: 'Reservoir computing with one device', layout: 'two', plots: ['a', 'b'],
    lede: 'Time-multiplexing one relaxing device gives many virtual neurons. Only a linear readout is trained. Here the reservoir is trained live to recall past inputs.',
    controls: [
      { id: 'N', label: 'Virtual nodes N', min: 5, max: 40, step: 1, value: 20, d: 0 },
      { id: 'th', label: 'Node spacing θ / τ', min: 0.05, max: 3, step: 0.05, value: 0.5, d: 2 },
      { id: 'g', label: 'Nonlinearity (input gain)', min: 0.2, max: 4, step: 0.1, value: 1.2, d: 1 },
      { id: 'eta', label: 'Delayed feedback η (circuit)', min: 0, max: 0.95, step: 0.01, value: 0.5, d: 2 }
    ],
    update(p, c) {
      const r = MX.rng(17); const K = 700, wash = 50, train = 450; const N = p.N; const decay = Math.exp(-p.th);
      const u = []; for (let k = 0; k < K; k++) u.push(r()); const m = []; for (let i = 0; i < N; i++) m.push(r() < 0.5 ? -1 : 1);
      const X = []; let x = 0; let prev = new Array(N).fill(0);
      for (let k = 0; k < K; k++) { const row = []; for (let i = 0; i < N; i++) { x = x * decay + (1 - decay) * Math.tanh(p.g * (m[i] * (u[k] - 0.5)) + p.eta * prev[i]); row.push(x); } prev = row; X.push(row); }
      const ridge = (A, y, lam) => { const n = A[0].length + 1; const G = []; const b = new Array(n).fill(0); for (let i = 0; i < n; i++) G.push(new Array(n).fill(0)); A.forEach((row, t) => { const f = row.concat([1]); for (let i = 0; i < n; i++) { b[i] += f[i] * y[t]; for (let j = 0; j < n; j++) G[i][j] += f[i] * f[j]; } }); for (let i = 0; i < n; i++) G[i][i] += lam; return MX.solve(G, b); };
      const r2s = [];
      for (let dly = 1; dly <= 15; dly++) {
        const Atr = [], ytr = [], Ate = [], yte = [];
        for (let k = wash; k < K; k++) { if (k - dly < 0) continue; (k < wash + train ? Atr : Ate).push(X[k]); (k < wash + train ? ytr : yte).push(u[k - dly]); }
        const w = ridge(Atr, ytr, 1e-6 * Atr.length); const pred = Ate.map(row => row.reduce((s, v, i) => s + v * w[i], w[w.length - 1]));
        const my = yte.reduce((a, b) => a + b) / yte.length, mp = pred.reduce((a, b) => a + b) / pred.length; let sxy = 0, sxx = 0, syy = 0; yte.forEach((y, i) => { sxy += (y - my) * (pred[i] - mp); sxx += (pred[i] - mp) ** 2; syy += (y - my) ** 2; });
        r2s.push(Math.max(0, sxy * sxy / (sxx * syy || 1)));
      }
      const MC = r2s.reduce((a, b) => a + b, 0);
      c.plot('a', [{ type: 'bar', x: r2s.map((_, i) => i + 1), y: r2s, name: 'r² of recalling u(k − d)', showlegend: false }], { title: 'Memory function (test data)', xaxis: { title: 'delay d (steps)', dtick: 1 }, yaxis: { title: 'r²', range: [0, 1] } });
      const ks = [], xs = []; for (let k = 100; k < 106; k++) for (let i = 0; i < N; i++) { ks.push(k + i / N); xs.push(X[k][i]); }
      c.plot('b', [{ x: ks, y: xs, name: 'device state x (virtual nodes)', mode: 'lines+markers', marker: { size: 5 } }, { x: MX.lin(100, 106, 7), y: MX.lin(100, 106, 7).map(k => u[Math.min(K - 1, Math.floor(k))] - 0.5), name: 'input u(k) − 0.5', line: { shape: 'hv', dash: 'dot' }, col: 'hf' }],
        { title: 'Six input steps, N nodes each', xaxis: { title: 'step k' }, yaxis: { title: 'state / input' } });
      c.out([['memory capacity MC', MC.toFixed(2) + ' (max N = ' + N + ')'], ['r² at d = 1', r2s[0].toFixed(2)], ['coupling e^(−θ/τ)', decay.toFixed(2)]]);
      c.csv(['delay', 'r2'], r2s.map((v, i) => [i + 1, v.toFixed(4)]));
    },
    theory: '<p>A reservoir computer drives a fixed nonlinear dynamical system with the input and trains only a linear readout. In the delay-based form (Appeltant 2011) one device replaces the network: each input u(k) is held for one step, multiplied by a random mask mᵢ, and sampled N times. The samples are virtual nodes:</p><div class="eq">xᵢ(k) = xᵢ₋₁(k)·e^(−θ/τ) + (1 − e^(−θ/τ))·f(g·mᵢ·u(k) + η·xᵢ(k−1))<span class="why">e^(−θ/τ) couples neighbouring nodes through the device’s own relaxation. η is optional feedback from a delay line.</span></div><p>The readout is trained by ridge regression:</p><div class="eq">W_out = Y·Xᵀ·(X·Xᵀ + λI)⁻¹</div><p>The short-term memory capacity is MC = Σ_d r²(u(k − d), ŷ_d) ≤ N. A good physical reservoir needs a nonlinearity (partial switching), fading memory with τ matched to θ, and enough distinguishable states.</p>',
    look: '<ul><li>θ/τ near 0.2–1 gives the most memory. Very large θ/τ decouples the nodes; very small θ/τ makes them identical.</li><li>Strong nonlinearity trades memory for computing power.</li></ul>',
    ours: '<p>Measure τ of a biased memcapacitor, then set θ (the pulse spacing on the tester) to about τ/2. This simulation then predicts the memory capacity before any circuit is built.</p>',
    refs: '<p>Jaeger and Haas, Science 304, 78 (2004). Appeltant et al., Nat. Commun. 2, 468 (2011). Jeong et al., J. Mater. Chem. C (2026), review of ferroelectric reservoirs.</p>'
  });
})();
