/* Measurements on the Radiant tester: P–E loop, minor loops, PUND, wake-up */
(function () {
  const MX = window.MX;
  MX.sec('meas', 'Measurements', 'What the ferroelectric tester actually records, and how leakage, charging and wake-up distort it.');
  const EPS = 0.08854; /* µC/cm² per (MV/cm) per unit εr */

  function loopSim(o) {
    /* o: Vmax, d (nm), Ec (MV/cm), Pr, er, J1 (A/cm² at 1 MV/cm), f (Hz), sig, bias(i) */
    const pre = new MX.Preisach({ n: 320, ec: o.Ec, sig: o.sig === undefined ? 0.22 : o.sig, bias: o.bias, seed: 5 });
    const Emax = o.Vmax / (o.d * 1e-7) / 1e6; const Es = MX.sweep(Emax, 600, 2); const dt = 1 / o.f / (Es.length / 2);
    let q = 0; const out = [];
    pre.set(-1);
    Es.forEach((E, i) => { const ps = o.Pr * pre.apply(E); q += (o.J1 || 0) * E * dt * 1e6; if (i >= Es.length / 2 - 1) out.push({ E, ps, pt: ps + EPS * o.er * E + q }); });
    const m = out.reduce((s, r) => s + r.pt, 0) / out.length; out.forEach(r => { r.pt -= m; });
    return { out, Emax };
  }
  function remanent(out, key) { /* Pr from crossings of E = 0 */ const z = []; for (let i = 1; i < out.length; i++) { if ((out[i - 1].E < 0) !== (out[i].E < 0) || out[i].E === 0) z.push(out[i][key]); } if (z.length < 2) return 0; return (Math.max(...z) - Math.min(...z)) / 2; }

  MX.add({
    id: 'peloop', sec: 'meas', title: 'P–E loop and what distorts it', layout: 'two', plots: ['a', 'b'],
    lede: 'The tester integrates all charge that flows. Switching, ordinary dielectric charging and leakage all add up; only the first is ferroelectric memory.',
    controls: [
      { id: 'V', label: 'Vmax', min: 0.5, max: 6, step: 0.05, value: 3, unit: 'V' },
      { id: 'd', label: 'Thickness', min: 5, max: 50, step: 1, value: 10, unit: 'nm', d: 0 },
      { id: 'Ec', label: 'Mean coercive field', min: 0.4, max: 2.5, step: 0.05, value: 1.1, unit: 'MV/cm' },
      { id: 'Pr', label: 'True Pr', min: 2, max: 40, step: 0.5, value: 18, unit: 'µC/cm²', d: 1 },
      { id: 'er', label: 'Relative permittivity εr', min: 10, max: 60, step: 1, value: 30, d: 0 },
      { id: 'lj', label: 'Leakage at 1 MV/cm', min: -8, max: -1, step: 0.1, value: -6, fmt: v => MX.sci(10 ** v) + ' A/cm²' },
      { id: 'lf', label: 'Frequency', min: 1, max: 5, step: 0.1, value: 3, fmt: v => MX.sci(10 ** v) + ' Hz' }
    ],
    update(p, c) {
      const s = loopSim({ Vmax: p.V, d: p.d, Ec: p.Ec, Pr: p.Pr, er: p.er, J1: 10 ** p.lj, f: 10 ** p.lf });
      const o = s.out; const E = o.map(r => r.E);
      c.plot('a', [{ x: E, y: o.map(r => r.pt), name: 'what the tester shows' }, { x: E, y: o.map(r => r.ps), name: 'switching only', col: 'hf', line: { dash: 'dash' } }],
        { title: 'Polarisation loop', xaxis: { title: 'E (MV/cm)' }, yaxis: { title: 'P (µC/cm²)' } });
      const Ef = MX.lin(-s.Emax, s.Emax, 3); const dielP = Ef.map(e => EPS * p.er * e);
      const leakQ = (10 ** p.lj) * s.Emax / (10 ** p.lf) * 1e6 / 2;
      c.plot('b', [{ type: 'bar', x: ['switching 2Pr', 'dielectric at Vmax', 'leakage per half-cycle'], y: [2 * remanent(o, 'ps'), dielP[2], leakQ], name: 'charge', marker: { color: [MX.theme().hf, MX.theme().c[0], MX.theme().c[2]] } }],
        { title: 'Where the charge comes from', yaxis: { title: 'charge (µC/cm²)', type: 'log' }, showlegend: false });
      const apparent = remanent(o, 'pt'), truePr = remanent(o, 'ps');
      c.out([['Emax', s.Emax.toFixed(2) + ' MV/cm'], ['Vmax / Vc', (p.V / (p.Ec * p.d * 0.1)).toFixed(2)], ['true remanent Pr', truePr.toFixed(1) + ' µC/cm²'], ['apparent Pr', apparent.toFixed(1) + ' µC/cm²'], ['error from leakage', (apparent - truePr).toFixed(1) + ' µC/cm²']]);
      c.csv(['E_MVcm', 'P_measured', 'P_switching'], o.map(r => [r.E.toFixed(4), r.pt.toFixed(3), r.ps.toFixed(3)]));
    },
    theory: '<p>A Radiant tester applies V(t) and integrates the current with a virtual-ground amplifier. It then plots charge per area against field:</p><div class="eq">P_meas = Q/A = P_sw(E) + ε₀εr·E + ∫ J_leak dt,&nbsp;&nbsp; E = V/d</div><p>Each term looks different in the loop:</p><ul><li><b>Switching</b> gives the square loop with remanence ±Pr.</li><li><b>Dielectric charging</b> tilts the loop. It is reversible, so it has no remanence.</li><li><b>Leakage</b> adds charge that grows with time spent at high field. It fattens and rounds the loop into a “banana” and inflates the apparent Pr. It is worst at low frequency, because ∫J dt ∝ 1/f.</li></ul><p>The switching part here is a Preisach ensemble: 320 square hysterons with a spread of coercive fields. A sweep that does not reach the coercive fields of all hysterons gives a minor loop.</p>',
    look: '<ul><li>Raise the leakage to 10⁻² A/cm² and lower the frequency: the apparent Pr overshoots the true one.</li><li>Raise the frequency: leakage shrinks, but switching is unchanged.</li><li>Lower Vmax below about 1.5 Vc: the loop collapses (minor loop).</li></ul>',
    ours: '<p>For leaky samples, take loops at two or three frequencies. If the apparent Pr changes with frequency, it is leakage. Then trust PUND, not the loop.</p>',
    refs: '<p>Radiant Technologies application notes on virtual-ground measurement. Scott et al., J. Phys.: Condens. Matter 20, 021001 (2008), on loops that are not ferroelectric.</p>'
  });

  MX.add({
    id: 'minor', sec: 'meas', title: 'Minor loops and choosing Vmax', layout: 'two', plots: ['a', 'b'],
    lede: 'Below saturation, only the regions with small coercive fields switch. Pr grows with Vmax and then saturates. The knee tells you which voltage to use.',
    controls: [
      { id: 'V', label: 'Highlighted Vmax', min: 0.5, max: 5, step: 0.05, value: 2, unit: 'V' },
      { id: 'sig', label: 'Spread of local Ec (σ/mean)', min: 0.05, max: 0.6, step: 0.01, value: 0.25 },
      { id: 'Ec', label: 'Mean coercive field', min: 0.5, max: 2, step: 0.05, value: 1.0, unit: 'MV/cm' }
    ],
    update(p, c) {
      const d = 10; const Vs = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5].map(k => k * p.Ec * d * 0.1 * 2);
      const tr = []; Vs.forEach((V, i) => { const s = loopSim({ Vmax: V, d, Ec: p.Ec, Pr: 20, er: 0, J1: 0, f: 1e3, sig: p.sig }); tr.push({ x: s.out.map(r => r.E), y: s.out.map(r => r.ps), name: V.toFixed(1) + ' V', line: { width: 1.5 }, ci: i % 5 }); });
      const sh = loopSim({ Vmax: p.V, d, Ec: p.Ec, Pr: 20, er: 0, J1: 0, f: 1e3, sig: p.sig });
      tr.push({ x: sh.out.map(r => r.E), y: sh.out.map(r => r.ps), name: 'highlighted', col: 'hf', line: { width: 4 } });
      c.plot('a', tr, { title: 'Nested loops, 10 nm film', xaxis: { title: 'E (MV/cm)' }, yaxis: { title: 'P_sw (µC/cm²)' }, showlegend: false });
      const VV = MX.lin(0.2, 5, 50); const pr = VV.map(V => remanent(loopSim({ Vmax: V, d, Ec: p.Ec, Pr: 20, er: 0, J1: 0, f: 1e3, sig: p.sig }).out, 'ps'));
      c.plot('b', [{ x: VV, y: pr, name: 'Pr vs Vmax' }, { x: [p.V], y: [remanent(sh.out, 'ps')], mode: 'markers', col: 'hf', name: 'highlighted', marker: { size: 13 } }],
        { title: 'Remanence vs Vmax', xaxis: { title: 'Vmax (V)' }, yaxis: { title: 'Pr (µC/cm²)', range: [0, 21] } });
      const i90 = pr.findIndex(v => v > 18);
      c.out([['Pr at highlighted Vmax', remanent(sh.out, 'ps').toFixed(1) + ' µC/cm²'], ['Vmax for 90 % saturation', i90 >= 0 ? VV[i90].toFixed(2) + ' V' : '> 5 V'], ['Vc (mean)', (p.Ec * d * 0.1).toFixed(2) + ' V']]);
      c.csv(['Vmax_V', 'Pr'], VV.map((v, i) => [v.toFixed(3), pr[i].toFixed(3)]));
    },
    theory: '<p>In the Preisach picture each region k has its own up and down switching fields. A sweep to ±E_max switches only the regions with |E_c,k| &lt; E_max, so</p><div class="eq">Pr(E_max) ≈ Ps · [2·Φ((E_max − Ē_c)/σ) − 1]<span class="why">Φ is the cumulative normal distribution of local coercive fields with mean Ē_c and width σ.</span></div><p>The curve of Pr against E_max is therefore the cumulative distribution of coercive fields. Its slope is the distribution itself. This is the same information a first-order-reversal-curve (FORC) measurement gives in more detail.</p>',
    look: '<ul><li>A narrow spread gives a sharp knee; a broad spread gives a slow rise.</li><li>Choose Vmax just past the knee. More voltage adds leakage and fatigue but not memory.</li></ul>',
    ours: '<p>Step Vmax on every new sample before any other test. For memcapacitor programming, the steep part of this curve is where analogue states live.</p>',
    refs: '<p>Preisach, Z. Physik 94, 277 (1935). Schenk et al., ACS Appl. Mater. Interfaces (2015), on internal bias fields in doped HfO₂ studied by FORC.</p>'
  });

  MX.add({
    id: 'pund', sec: 'meas', title: 'PUND pulse measurement', layout: 'two', plots: ['a', 'b'], caption: 'Spikes on the pulse edges are dielectric charging; the current axis is clipped so the switching current stays visible.',
    lede: 'Four pulses: Positive, Up, Negative, Down. The second pulse of each pair sees no switching, so subtracting it removes charging and leakage.',
    controls: [
      { id: 'V', label: 'Pulse amplitude', min: 1, max: 5, step: 0.05, value: 2.6, unit: 'V' },
      { id: 'lt', label: 'Pulse width', min: -8, max: -3, step: 0.05, value: -6, fmt: v => MX.sci(10 ** v) + ' s' },
      { id: 'er', label: 'εr', min: 10, max: 60, step: 1, value: 30, d: 0 },
      { id: 'lj', label: 'Leakage at 1 MV/cm', min: -8, max: -1, step: 0.1, value: -5, fmt: v => MX.sci(10 ** v) + ' A/cm²' },
      { id: 'Pr', label: 'True Pr', min: 2, max: 40, step: 0.5, value: 18, unit: 'µC/cm²', d: 1 }
    ],
    update(p, c) {
      const d = 10, Ea = 30, tinf = 1e-12, w = 1.0; const E = p.V / (d * 1e-7) / 1e6; const tw = 10 ** p.lt;
      const tau = tinf * Math.exp(Ea / E); const f = t => t <= 0 ? 0 : 0.5 + Math.atan((Math.log10(t) - Math.log10(tau)) / w) / Math.PI;
      const f0 = 0.5 + Math.atan((Math.log10(1e-30) - Math.log10(tau)) / w) / Math.PI;
      const fs = t => Math.max(0, (f(t) - f0) / (1 - f0));
      const tr = tw / 10, J1 = 10 ** p.lj; const seq = [['P', 1, true], ['U', 1, false], ['N', -1, true], ['D', -1, false]];
      const tt = [], jj = [], lab = []; const Q = {}; let t0 = 0;
      seq.forEach(s => {
        const T = 2 * tr + tw; let q = 0; const n = 160;
        for (let i = 0; i <= n; i++) {
          const t = T * i / n; const dt = T / n;
          const v = t < tr ? t / tr : (t < tr + tw ? 1 : Math.max(0, (T - t) / tr)); const dv = t < tr ? 1 / tr : (t < tr + tw ? 0 : -1 / tr);
          const jd = EPS * p.er * E * dv * 1e-6; const jl = J1 * E * v * s[1];
          const js = s[2] ? 2 * p.Pr * 1e-6 * (fs(t + dt / 2) - fs(t - dt / 2)) / dt : 0;
          const j = s[1] * jd + jl + s[1] * js; q += j * dt; tt.push((t0 + t) / tw); jj.push(j); lab.push(s[0]);
        }
        Q[s[0]] = q * 1e6; t0 += T + tw; tt.push(NaN); jj.push(NaN); lab.push('');
      });
      const jsw = 2 * p.Pr * 1e-6 / (tw * 0.3); const jcap = Math.max(1.5 * jsw, 3 * J1 * E);
      c.plot('a', [{ x: tt, y: jj, name: 'current density', line: { width: 2 } }], { title: 'Current during P, U, N, D', xaxis: { title: 'time ÷ pulse width' },
        yaxis: { title: 'J (A/cm²)', range: [-jcap, jcap] }, annotations: seq.map((s, i) => ({ x: i * 2.2 + 0.6, y: 0.95, yref: 'paper', text: s[0], showarrow: false, font: { size: 16 } })) });
      const dP = Q.P - Q.U, dN = Q.N - Q.D; const ideal = 2 * p.Pr * fs(tr + tw);
      c.plot('b', [{ type: 'bar', x: ['P', 'U', 'P−U', 'N', 'D', 'N−D', '2Pr·f'], y: [Q.P, Q.U, dP, Q.N, Q.D, dN, ideal].map(Math.abs), showlegend: false }],
        { title: 'Charge per pulse (magnitude)', yaxis: { title: 'µC/cm²' } });
      c.out([['field', E.toFixed(2) + ' MV/cm'], ['switched in width', (100 * fs(tr + tw)).toFixed(1) + ' %'], ['P − U', Math.abs(dP).toFixed(1) + ' µC/cm²'], ['N − D', Math.abs(dN).toFixed(1) + ' µC/cm²'], ['2Pr·f (true)', ideal.toFixed(1) + ' µC/cm²'], ['P alone (with leakage)', Math.abs(Q.P).toFixed(1) + ' µC/cm²']]);
      c.csv(['t_over_width', 'J_Acm2', 'pulse'], tt.map((t, i) => [isNaN(t) ? '' : t.toFixed(4), isNaN(jj[i]) ? '' : jj[i].toExponential(4), lab[i]]));
    },
    theory: '<p>PUND applies two pulses of each sign. The first (P or N) switches the film. The second (U or D) has the same shape but meets a film that is already switched. Charging, leakage and any fast relaxation appear in both, so</p><div class="eq">ΔP = Q_P − Q_U ≈ 2Pr · f(t_w, V)<span class="why">f is the fraction switched within the pulse width (NLS kinetics). Short or weak pulses give ΔP &lt; 2Pr.</span></div><p>The switching current during the P pulse is</p><div class="eq">J_sw(t) = 2Pr · df/dt</div><p>The dielectric term ε₀εr·dE/dt appears only on the ramps, and leakage J = σE flows while the voltage is on. Both cancel in the subtraction if the film is not changed by the first pulse. Strong imprint or relaxation between pulses breaks that assumption, so keep the delay between pulses short.</p>',
    look: '<ul><li>Raise the leakage: P alone grows a lot, but P − U stays near 2Pr·f.</li><li>Shorten the pulse below the median switching time: P − U falls even though the true Pr is the same.</li></ul>',
    ours: '<p>Report P − U together with pulse width and amplitude. Sweeping the width gives the NLS kinetics of our films directly.</p>',
    refs: '<p>Scott et al., J. Appl. Phys. 64, 787 (1988), the origin of pulsed switching measurements on ferroelectric memories.</p>'
  });

  MX.add({
    id: 'wakeup', sec: 'meas', title: 'Wake-up and fatigue', layout: 'two', plots: ['a', 'b'],
    lede: 'A fresh film often shows a pinched loop. Cycling spreads the oxygen vacancies that pin it, the loop opens, and much later the film fatigues.',
    controls: [
      { id: 'lN', label: 'Cycles N', min: 0, max: 10, step: 0.05, value: 1, fmt: v => '10^' + v.toFixed(1) },
      { id: 'Ei', label: 'Initial internal field Eᵢ₀', min: 0, max: 2, step: 0.05, value: 1.1, unit: 'MV/cm' },
      { id: 'lN0', label: 'Wake-up constant N₀', min: 1, max: 7, step: 0.1, value: 4, fmt: v => '10^' + v.toFixed(1) },
      { id: 'lNf', label: 'Fatigue onset N_f', min: 5, max: 11, step: 0.1, value: 8.5, fmt: v => '10^' + v.toFixed(1) }
    ],
    update(p, c) {
      const Ec = 1.0, Pr0 = 18; const Ei = N => p.Ei * Math.exp(-N / 10 ** p.lN0); const fat = N => 1 / (1 + Math.pow(N / 10 ** p.lNf, 0.6));
      const N = 10 ** p.lN; const e = Ei(N);
      const pre = new MX.Preisach({ n: 320, ec: Ec, sig: 0.15, bias: i => (i % 2 ? e : -e), seed: 9 });
      const Es = MX.sweep(2.6, 600, 2); pre.set(-1); const out = []; Es.forEach((E, i) => { const v = Pr0 * fat(N) * pre.apply(E); if (i >= Es.length / 2 - 1) out.push([E, v]); });
      const upE = [], upI = []; for (let i = 1; i < out.length; i++) { if (out[i][0] > out[i - 1][0]) { upE.push(out[i][0]); upI.push((out[i][1] - out[i - 1][1]) / (out[i][0] - out[i - 1][0])); } }
      const sm = upI.map((v, i) => { let s = 0, k = 0; for (let j = -3; j <= 3; j++) if (upI[i + j] !== undefined) { s += upI[i + j]; k++; } return s / k; });
      c.plot('a', [{ x: out.map(r => r[0]), y: out.map(r => r[1]), name: 'P–E' }, { x: upE, y: sm.map(v => v * 0.25), name: 'switching current (up-sweep, scaled)', col: 'hf', line: { width: 1.8 } }],
        { title: 'Loop and current at N = 10^' + p.lN.toFixed(1), xaxis: { title: 'E (MV/cm)' }, yaxis: { title: 'P (µC/cm²) · current (a.u.)' } });
      const remN = n => { const ee = Ei(n); const q = new MX.Preisach({ n: 200, ec: Ec, sig: 0.15, bias: i => (i % 2 ? ee : -ee), seed: 9 }); q.set(-1); const s = MX.sweep(2.6, 300, 2); const o2 = []; s.forEach((E, i) => { const v = Pr0 * fat(n) * q.apply(E); if (i >= s.length / 2 - 1) o2.push({ E, ps: v }); }); return 2 * remanent(o2, 'ps'); };
      const NN = MX.lin(0, 11, 56); const prN = NN.map(l => remN(10 ** l));
      c.plot('b', [{ x: NN.map(l => 10 ** l), y: prN, name: '2Pr (remanent)' }, { x: [N], y: [remN(N)], mode: 'markers', col: 'hf', name: 'now', marker: { size: 13 } }],
        { title: 'Wake-up, plateau, fatigue', xaxis: { title: 'cycles N', type: 'log', exponentformat: 'power' }, yaxis: { title: '2Pr (µC/cm², model)', range: [0, 40] } });
      c.out([['internal field Eᵢ', e.toFixed(2) + ' MV/cm'], ['Eᵢ / Ec', (e / Ec).toFixed(2)], ['state', e > 0.6 * Ec ? 'pinched (two current peaks)' : (fat(N) < 0.8 ? 'fatigued' : 'woken up')], ['fatigue factor', fat(N).toFixed(2)]]);
      c.csv(['E_MVcm', 'P'], out.map(r => [r[0].toFixed(4), r[1].toFixed(3)]));
    },
    theory: '<p>Model the fresh film as two populations of regions, near the top and bottom electrodes, that feel internal fields of opposite sign. The fields come from charged oxygen vacancies piled up at each interface. Each population has an ordinary loop shifted by its field:</p><div class="eq">P(E) = ½·[P_FE(E − Eᵢ) + P_FE(E + Eᵢ)]<span class="why">If Eᵢ is comparable to Ec, the average loop is pinched and the switching current has two peaks.</span></div><p>Field cycling drives the vacancies by drift and diffusion, flattening the profile. A simple description is a decaying internal field:</p><div class="eq">Eᵢ(N) = Eᵢ₀ · exp(−N/N₀)</div><p>Fatigue at high cycle numbers comes from charge injection, new trap states and pinned domains. Here it appears as a slow fall of the switchable fraction past N_f. An imprint (one-sided field) instead shifts the whole loop: E_imp = (Ec⁺ + Ec⁻)/2.</p>',
    look: '<ul><li>Start at N = 10⁰ with Eᵢ₀ &gt; Ec: two current peaks and a pinched loop.</li><li>Move N past N₀: the peaks merge and 2Pr rises.</li><li>Set Eᵢ₀ = 0: no wake-up, only fatigue.</li></ul>',
    ours: '<p>Use a fresh pad for wake-up. Measure N₀ at 25, 70 and 125 °C; if vacancy hopping controls wake-up, ln N₀ against 1/T is a straight line whose slope is the activation energy.</p>',
    refs: '<p>Lomenzo et al., ACS Appl. Electron. Mater. 2, 1583 (2020). Pešić et al., Adv. Funct. Mater. 26, 4601 (2016). Song et al., J. Mater. Chem. C (2025).</p>'
  });
})();
