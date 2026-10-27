# Hafnia Memcap Explorer

Interactive models for ferroelectric HZO, HfO₂ and ZrO₂ memcapacitors with W, TiN and Pt electrodes. Each model has live sliders and plots, the theory with its equations, what to look for, and what it means for our samples.

Built for the memcapacitor project by Chaitanya Panse (Department of Materials Engineering, guide Dr. Bhagwati Prasad).

## What is inside

| Section | Models |
|---|---|
| Foundations | Landau double well · phase stability vs grain size · KAI vs NLS switching kinetics |
| Measurements | P–E loop with leakage and charging · minor loops and Vmax · PUND · wake-up and fatigue |
| Memcapacitor physics | C–V butterfly and 0 V window · interface depolarisation · charge-domain crossbar · read disturb |
| Electrodes | stiffness vs Pr (Lenox 2024 data) · work function and built-in field · oxygen vacancies |
| Phases and switching | o → t → o switching · biased antiferroelectric memory |
| Layered films | FE/AFE stack coupling |
| Memory in time | retention · leaky integrator · reservoir computing with live ridge-regression training |
| PLD | fluence · O₂ pressure · temperature and growth mode · thickness uniformity |

The site also has a paper library (26 papers), six new research directions and references.

## Run it locally

Open `index.html` in any browser. The site has no build step and no dependencies apart from Google Fonts. Without internet it falls back to system fonts.

## Put it on GitHub Pages

1. Create a GitHub account at github.com if you do not have one.
2. Click **New repository**. Name it, for example, `memcap-explorer`. Set it to **Public** and create it.
3. On the empty repository page, click **uploading an existing file**. Drag in every file from this folder (`index.html`, `README.md`, `style.css` and the `.js` files). All files sit side by side at the top level. Click **Commit changes**.
4. Go to **Settings → Pages**. Under **Build and deployment**, set **Source** to *Deploy from a branch*, then choose **Branch: main** and **/(root)**, and click **Save**.
5. After about a minute the site is live at `https://<your-username>.github.io/memcap-explorer/`. The link also appears at the top of the Pages settings.

To update the site later, edit or upload files in the repository; Pages redeploys automatically.

### Using git instead of the web upload

```bash
cd memcap-explorer          # this folder
git init
git add .
git commit -m "Hafnia Memcap Explorer"
git branch -M main
git remote add origin https://github.com/<your-username>/memcap-explorer.git
git push -u origin main
```

Then enable Pages as in step 4.

## Adding a new model

Each model is one object passed to `MX.add({...})` in one of the `m-*.js` files:

```js
MX.add({
  id: 'mymodel', sec: 'meas', title: 'My model', layout: 'two', plots: ['a', 'b'],
  lede: 'One-sentence summary.',
  controls: [{ id: 'V', label: 'Voltage', min: 0, max: 5, step: 0.1, value: 2, unit: 'V' }],
  update(p, c) {               // p holds slider values; c draws plots and readouts
    const xs = MX.lin(0, p.V, 100);
    c.plot('a', [{ x: xs, y: xs.map(v => v * v), name: 'V²' }], { title: 'Example', xaxis: { title: 'V' }, yaxis: { title: 'V²' } });
    c.out([['max', (p.V * p.V).toFixed(2)]]);
  },
  theory: '<p>HTML with equations in <div class="eq">…</div>.</p>',
  look: '<p>…</p>', ours: '<p>…</p>', refs: '<p>…</p>'
});
```

The new model appears automatically on the home page and in the previous/next navigation.

## Notes

- The models are teaching simulations. Parameters are illustrative unless a plot says it shows measured data (the electrode stiffness model uses published data).
- Several papers in the library are preprints or conference talks; numbers come from their abstracts.
- Classic theory references are given from memory; check page numbers before citing.
