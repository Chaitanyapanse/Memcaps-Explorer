/* Front B: electrodes: stiffness, work function and built-in field, oxygen vacancies */
(function () {
  const MX = window.MX;
  MX.sec('elec', 'Electrodes and interfaces', 'Why W, TiN and Pt give different films: mechanics, electronics and oxygen chemistry.');
  const EPS = 0.08854;

  const LENOX = [['Pt', 210.4, 9.64, 3.56, 6.43, 9.93], ['Ir', 219.4, 7.45, 3.80, 6.33, 9.04], ['TaN', 303.4, 5.50, 3.85, 6.93, 10.43], ['Ru', 322.3, 7.95, 4.00, 7.73, 11.50], ['W', 381.8, 4.45, 4.21, 9.55, 12.44]];
  function fit(xs, ys) { const n = xs.length; const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; } const b = sxy / sxx; return { b, a: my - b * mx, r2: sxy * sxy / (sxx * syy) }; }

  MX.add({
    id: 'stiffness', sec: 'elec', title: 'Electrode stiffness and polarisation', layout: 'two', plots: ['a', 'b'],
    lede: 'Real data from five top electrodes on the same HZO. Polarisation tracks how stiff the electrode is far better than its thermal expansion.',
    controls: [
      { id: 'x', label: 'Plot Pr against', type: 'select', value: 'mod', options: [['mod', 'Elastic modulus (GPa)'], ['cte', 'Thermal expansion (10⁻⁶/K)'], ['str', 'Measured film stress (GPa)']] },
      { id: 'st', label: 'State', type: 'select', value: 'wk', options: [['wk', 'After wake-up'], ['pr', 'Pristine']] }
    ],
    update(p, c) {
      const xi = { mod: 1, cte: 2, str: 3 }[p.x], yi = p.st === 'wk' ? 5 : 4;
      const xs = LENOX.map(r => r[xi]), ys = LENOX.map(r => r[yi]); const f = fit(xs, ys);
      const xl = { mod: 'electrode elastic modulus (GPa)', cte: 'electrode thermal expansion (10⁻⁶ K⁻¹)', str: 'HZO biaxial stress (GPa)' }[p.x];
      const x0 = Math.min(...xs), x1 = Math.max(...xs), pad = (x1 - x0) * 0.1;
      c.plot('a', [{ x: xs, y: ys, mode: 'markers+text', text: LENOX.map(r => r[0]), textposition: 'top center', name: 'measured', marker: { size: 13 } }, { x: [x0 - pad, x1 + pad], y: [f.a + f.b * (x0 - pad), f.a + f.b * (x1 + pad)], name: 'linear fit, R² = ' + f.r2.toFixed(2), col: 'hf', line: { dash: 'dash' } }],
        { title: 'Remanent polarisation vs ' + xl.split(' (')[0], xaxis: { title: xl }, yaxis: { title: 'Pr (µC/cm²)' } });
      const r2 = ['mod', 'cte', 'str'].map(k => fit(LENOX.map(r => r[{ mod: 1, cte: 2, str: 3 }[k]]), ys).r2);
      c.plot('b', [{ type: 'bar', x: ['modulus', 'thermal expansion', 'film stress'], y: r2, showlegend: false }], { title: 'How well each property predicts Pr (R²)', yaxis: { title: 'R²', range: [0, 1] } });
      c.out([['R² (this x)', f.r2.toFixed(2)], ['slope', MX.fmt(f.b, 3) + ' µC/cm² per unit'], ['W vs Pt (Pr)', (LENOX[4][yi] - LENOX[0][yi]).toFixed(2) + ' µC/cm² higher with W']]);
      c.csv(['electrode', 'modulus_GPa', 'CTE_1e-6K', 'stress_GPa', 'Pr_pristine', 'Pr_woken'], LENOX.map(r => r.slice()));
    },
    theory: '<p>The top electrode is deposited before the crystallisation anneal. During that anneal amorphous HZO crystallises first into the tetragonal phase. On cooling it can transform to monoclinic, which expands the cell by a few percent, or to the polar orthorhombic phase. A capping layer resists the expansion:</p><div class="eq">ΔG_t→m = ΔG_chem + ½·M_eff·(Δε_tr)²·V<span class="why">A stiffer cap (larger M_eff) raises the elastic penalty for the volume-expanding monoclinic transformation, leaving the film in t/o.</span></div><p>Thermal-expansion mismatch adds a stress on cooling, σ = [E_f/(1 − ν_f)]·Δα·ΔT, but in this data set it predicts Pr poorly. The decisive pair is Ir and Ru: almost the same thermal expansion, very different stiffness, and Ru gives more polarisation.</p>',
    look: '<ul><li>Switch the x-axis to thermal expansion: the fit collapses (R² ≈ 0.25).</li><li>Wake-up raises Pr by about 45 % for every electrode, so the ordering is a film property set during the anneal.</li></ul>',
    ours: '<p>Our W/W 10 nm film gave Pr 19.5 µC/cm² against 4.7 for TiN/TiN. TiN (about 250 GPa, sputter dependent) is softer than W and also grows a dielectric oxynitride. Both point the same way.</p>',
    refs: '<p>Data: Lenox et al., ACS Appl. Mater. Interfaces 16, 69588 (2024). See also Alcala et al., Adv. Funct. Mater. 33, 2303261 (2023).</p>'
  });

  const WF = { Pt: 5.6, Au: 5.1, Ir: 5.3, W: 4.6, TiN: 4.5, Ru: 4.7, Ti: 4.3, Al: 4.1 };
  MX.add({
    id: 'workfn', sec: 'elec', title: 'Work function and built-in field', layout: 'two', plots: ['a', 'b'],
    lede: 'Different top and bottom metals give a built-in voltage across the film. It shifts the loop, sets the 0 V capacitance window and changes retention.',
    controls: [
      { id: 'top', label: 'Top electrode', type: 'select', value: 'Pt', options: Object.keys(WF).map(k => [k, k + ' (Φ ≈ ' + WF[k] + ' eV)']) },
      { id: 'bot', label: 'Bottom electrode', type: 'select', value: 'TiN', options: Object.keys(WF).map(k => [k, k + ' (Φ ≈ ' + WF[k] + ' eV)']) },
      { id: 'S', label: 'Pinning factor S', min: 0.1, max: 1, step: 0.01, value: 0.5, d: 2, hint: 'S ≈ 0.5 for HfO₂ (fraction of ΔΦ that becomes barrier difference)' },
      { id: 'd', label: 'Thickness', min: 5, max: 30, step: 1, value: 10, unit: 'nm', d: 0 },
      { id: 'Ec', label: 'Coercive field', min: 0.5, max: 2, step: 0.05, value: 1.0, unit: 'MV/cm' }
    ],
    update(p, c) {
      const dphi = WF[p.top] - WF[p.bot]; const Vbi = p.S * dphi; const Ebi = Vbi / (p.d * 1e-7) / 1e6;
      const mk = b => { const pre = new MX.Preisach({ n: 300, ec: p.Ec, sig: 0.18, bias: () => b, seed: 3 }); pre.set(-1); const Es = MX.sweep(2.8, 500, 2); const o = []; Es.forEach((E, i) => { const v = 18 * pre.apply(E); if (i >= Es.length / 2 - 1) o.push([E, v]); }); return o; };
      const sym = mk(0), shf = mk(-Ebi);
      c.plot('a', [{ x: sym.map(r => r[0]), y: sym.map(r => r[1]), name: 'symmetric (same metal)', col: 'muted', line: { dash: 'dot' } }, { x: shf.map(r => r[0]), y: shf.map(r => r[1]), name: p.top + ' / HZO / ' + p.bot }],
        { title: 'P–E loop shifted by the built-in field', xaxis: { title: 'applied E (MV/cm)' }, yaxis: { title: 'P (µC/cm²)' } });
      const C = (v, pk) => 1 + 2.2 / (1 + Math.pow((v - pk) / (0.35 * p.Ec), 2)); const vs = MX.lin(-2.8, 2.8, 281);
      c.plot('b', [{ x: vs, y: vs.map(v => C(v, -Ebi + p.Ec)), name: 'P↓ state' }, { x: vs, y: vs.map(v => C(v, -Ebi - p.Ec)), name: 'P↑ state' }],
        { title: 'Small-signal C at each field', xaxis: { title: 'E (MV/cm)' }, yaxis: { title: 'C / C_lattice' }, shapes: [{ type: 'line', x0: 0, x1: 0, y0: 0, y1: 1, yref: 'paper', line: { color: 'muted', dash: 'dash', width: 1 } }] });
      const c1 = C(0, -Ebi + p.Ec), c2 = C(0, -Ebi - p.Ec);
      c.out([['ΔΦ (top − bottom)', dphi.toFixed(2) + ' eV'], ['V_bi = S·ΔΦ/e', Vbi.toFixed(2) + ' V'], ['E_bi', Ebi.toFixed(2) + ' MV/cm'], ['loop shift / Ec', (Ebi / p.Ec).toFixed(2)], ['C ratio at 0 V', (Math.max(c1, c2) / Math.min(c1, c2)).toFixed(2) + '×'], ['retention', Math.abs(Ebi) > 0.7 * p.Ec ? 'one state at risk' : 'both states stable']]);
      c.csv(['E', 'P_sym', 'P_shifted'], sym.map((r, i) => [r[0].toFixed(4), r[1].toFixed(3), shf[i] ? shf[i][1].toFixed(3) : '']));
    },
    theory: '<p>Electrons align their Fermi levels across the stack, so two metals with different work functions leave a built-in voltage across the oxide. On HfO₂ the Fermi level is partly pinned by interface states, so only a fraction S of the difference appears:</p><div class="eq">φ_B = S·(Φ_M − χ) + (1 − S)·φ_CNL,&nbsp;&nbsp; V_bi ≈ S·(Φ_top − Φ_bottom)/e<span class="why">χ is the oxide electron affinity and φ_CNL the charge-neutrality level. S ≈ 0.5 is a common estimate for HfO₂.</span></div><p>The internal field E_bi = V_bi/d adds to the applied field, so the measured coercive fields shift: E_c⁺ → E_c − E_bi and E_c⁻ → −E_c − E_bi. The same shift moves the C–V butterfly and creates a capacitance difference at 0 V.</p><p>Real stacks add more: oxygen scavenging by Ti, interface dipoles and trapped charge. That is why annealing with W on both sides and then replacing the top metal is the cleanest experiment, because it changes only Φ.</p>',
    look: '<ul><li>Pt on TiN: about 0.55 V of bias in 10 nm, a clear shift.</li><li>Same metal on both sides: no shift and no window at 0 V.</li><li>Make the film thinner: the same V_bi gives a larger field.</li></ul>',
    ours: '<p>The Ti/Pt tops are not a pure work-function test because Ti touches the HZO and takes oxygen. Extract V_bi from the loop centre and C–V for each stack, and plot it against ΔΦ to measure S for our films.</p>',
    refs: '<p>Robertson, J. Vac. Sci. Technol. B 18, 1785 (2000). Jang et al., MRS Spring 2026. Work functions are typical literature values; thin-film values depend on process.</p>'
  });

  MX.add({
    id: 'vacancy', sec: 'elec', title: 'Oxygen vacancies: pressure and temperature', layout: 'two', plots: ['a', 'b'],
    lede: 'Vacancies form when oxygen leaves the lattice and move by thermally activated hopping. Growth pressure sets how many there are; temperature sets how fast they move.',
    controls: [
      { id: 'lp', label: 'O₂ pressure during growth', min: -6, max: 0, step: 0.1, value: -2, fmt: v => MX.sci(10 ** v) + ' mbar' },
      { id: 'Ea', label: 'Hopping activation energy E_a', min: 0.3, max: 1.5, step: 0.01, value: 0.7, unit: 'eV' },
      { id: 'lN', label: 'Wake-up cycles at 25 °C', min: 2, max: 7, step: 0.1, value: 5, fmt: v => '10^' + v.toFixed(1) }
    ],
    update(p, c) {
      const lps = MX.lin(-6, 0, 100); const rel = lp => Math.pow(10 ** lp / 1e-2, -1 / 6);
      c.plot('a', [{ x: lps.map(l => 10 ** l), y: lps.map(rel), name: '[V_O] ∝ pO₂^(−1/6)' }, { x: [10 ** p.lp], y: [rel(p.lp)], mode: 'markers', col: 'hf', name: 'chosen', marker: { size: 12 } }],
        { title: 'Vacancy concentration vs growth pressure', xaxis: { title: 'pO₂ (mbar)', type: 'log', exponentformat: 'power' }, yaxis: { title: '[V_O] relative to 10⁻² mbar', type: 'log' } });
      const kB = 8.617e-5; const T0 = 298.15; const N0 = 10 ** p.lN;
      const Nwu = T => N0 * Math.exp(p.Ea / kB * (1 / T - 1 / T0));
      const Ts = MX.lin(250, 450, 60); const pts = [25, 70, 125].map(t => t + 273.15);
      c.plot('b', [{ x: Ts.map(T => 1000 / T), y: Ts.map(Nwu), name: 'N_wake-up ∝ exp(E_a/kT)' }, { x: pts.map(T => 1000 / T), y: pts.map(Nwu), mode: 'markers+text', text: ['25 °C', '70 °C', '125 °C'], textposition: 'top right', col: 'hf', name: 'measure here' }],
        { title: 'Arrhenius plot for wake-up', xaxis: { title: '1000 / T (K⁻¹)' }, yaxis: { title: 'cycles to wake up', type: 'log', exponentformat: 'power' } });
      c.out([['[V_O] vs 10⁻² mbar', rel(p.lp).toFixed(2) + '×'], ['N_wu at 70 °C', MX.sci(Nwu(343.15))], ['N_wu at 125 °C', MX.sci(Nwu(398.15))], ['speed-up 25 → 125 °C', MX.sci(Nwu(T0) / Nwu(398.15)) + '×']]);
      c.csv(['T_K', 'N_wakeup'], Ts.map(T => [T.toFixed(1), Nwu(T).toExponential(3)]));
    },
    theory: '<p>In Kröger–Vink notation an oxygen leaves its site as gas and leaves a doubly charged vacancy and two electrons:</p><div class="eq">O_O^× ⇌ V_O^•• + 2e′ + ½O₂(g)</div><p>Mass action with charge neutrality (n = 2[V_O^••]) gives</p><div class="eq">[V_O^••] ∝ pO₂^(−1/6)·exp(−ΔH_f / 3kT)<span class="why">PLD is not at equilibrium, so treat the −1/6 slope as a trend. Lower pressure means more vacancies.</span></div><p>Vacancies move by hopping over a barrier E_a, biased by the field (jump length a, attempt frequency ν):</p><div class="eq">v = 2aν·exp(−E_a/kT)·sinh(qaE / 2kT)</div><p>If wake-up is limited by this redistribution, the number of cycles it needs scales as N_wu ∝ exp(E_a/kT). Three temperatures give E_a from the slope.</p><p>Electrodes change the vacancy budget too. Per oxygen atom, HfO₂ and ZrO₂ (≈ −560 kJ/mol O) are more stable than TiO₂ (≈ −470) and far more than WO₃ (≈ −280). Ti cannot reduce HfO₂ to TiO₂, but it dissolves oxygen and scavenges the interface; WOₓ can give oxygen back.</p>',
    look: '<ul><li>Two decades lower pressure raise [V_O] by about 2.2×.</li><li>With E_a = 0.7 eV, wake-up at 125 °C is about 1000× faster than at 25 °C.</li></ul>',
    ours: '<p>Run the wake-up test at 25, 70 and 125 °C on fresh pads and fit E_a. Compare W and TiN bottoms: a WOₓ reservoir should change both the number of vacancies and E_a.</p>',
    refs: '<p>Kröger, <i>The Chemistry of Imperfect Crystals</i> (1974). Alcala et al., Adv. Funct. Mater. 33, 2303261 (2023). Afroze, Choi et al., arXiv 2601.20271 (2026). Enthalpies are rounded standard values.</p>'
  });
})();
