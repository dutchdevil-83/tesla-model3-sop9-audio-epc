# Tesla Model 3 Highland SOP9 Audio EPC

Engineering, sourcing and installation reference for a **Tesla Model 3 Highland 2026 Premium Long Range RWD / SOP9 / LHD** audio upgrade.

Current engineering baseline: **v2.2.0** (2026-09-10)  
Current interactive EPC baseline: **v2.1.0**

## Project scope

- Tesla SOP9 speaker/location reference and verified source assets
- Interactive EPC/playground
- Audio BOM and EU procurement comparison
- MB Car Audio Audison/Focal proposal
- HELIX alternative architecture
- Channel-routing and integration decisions
- Optional door acoustic treatment with Front-only and All-4-doors scenarios
- Functional-equivalence screening for damping/absorption materials
- Manufacturer documentation/reference indexes
- QA, provenance and checksums

## Current MB Car Audio architecture

| Function | Component / decision |
| --- | --- |
| Front stage | Audison AF M8.14 bit |
| Rear woofers / midrange / optional rear tweeters | Audison AF M4D |
| Donor subwoofers | Audison AF M1D candidate; final electrical load still to be measured |
| Tesla integration | MATCH PP-TES-1.7B Highland |
| Speakers | Focal Inside Tesla T3Y range |
| Upper/headliner immersive positions X569/X579 | Omit for music-first build |
| Dashboard center X595 | Retain |

The received MB Car Audio quote is **EUR 4,010.90 incl. VAT for hardware only**. Cabling, damping, installation materials and labour are excluded; installation is DIY.

## Door acoustic treatment v2.2

Two optional scenarios are tracked in the workbook:

| Scenario | Reference | Current reference price |
| --- | --- | ---: |
| Front doors only | Bünde Lautsprecher dämmsetPRO | EUR 199 |
| All four doors | Bünde Lautsprecher dämmsetXTREME | EUR 299 |

The equivalence policy is deliberately stricter than matching thickness:

- **STP Black Gold:** alternatives are allowed when the replacement is a documented automotive butyl/aluminium CLD material with comparable thickness, foil/mass and preferably published MLF. **CTK Premium 2.2 mm is currently the strongest documented candidate.**
- **STP Accent 10:** functional absorber/decoupler alternatives are allowed when moisture behavior, adhesive suitability and acoustic function are documented. **CTK SilenceFix 10 mm is currently accepted as a strong functional alternative.**
- **STP Aero Bomb, Sonora and Bromo:** strict gate. No generic substitute is currently approved without comparable published construction/performance evidence.
- AliExpress findings are retained as **research leads**, not approved equivalents, until the exact variant has adequate technical documentation.

Structured source: `data/door-damping/door_damping_v2.2.json`.

## Repository layout

```text
.github/workflows/   QA / automation
Reference_Assets/    Manufacturer and supplied reference material
Source_Assets/       Preserved Tesla source captures
Target_Assets/       Curated Tesla target assets
data/door-damping/   Door-treatment BOM/equivalence source data
docs/                Classic GitHub Pages source
scripts/             Import/build/update tooling
Tools/               Asset-collector tooling
*.xlsx               Versioned engineering/procurement workbooks
*.html               Versioned self-contained interactive EPC builds
```

## GitHub Pages

The repository now contains a classic Pages source under `docs/`.

Configure once in GitHub:

```text
Settings > Pages
Source: Deploy from a branch
Branch: main
Folder: /docs
Save
```

Expected public URL:

```text
https://dutchdevil-83.github.io/tesla-model3-sop9-audio-epc/
```

The Pages landing page links to the interactive EPC and the current workbook. Pages is intentionally not assumed to be enabled until this repository setting is saved.

## Interactive catalog

Current validated UI build:

```text
Tesla_SOP9_Audio_EPC_Playground_v2.1.0_Final.html
```

The catalog UI remains v2.1.0 while the engineering/procurement workbook has moved to v2.2.0. That separation avoids touching the validated renderer merely to add sourcing/BOM data.

## Important engineering gates

- Measure/verify the Pioneer donor-woofer electrical configuration before final AF M1D wiring.
- Do not infer unconfirmed Tesla connector pinouts or amplifier routing.
- Recheck procurement prices, stock, shipping and warranty conditions immediately before purchase.
- Installer field experience, such as Audison vs HELIX tuning time, is recorded as field evidence rather than a manufacturer benchmark.
- Do not substitute door-treatment materials based on thickness alone; obey the functional-equivalence gate recorded in the workbook/data.

## Version policy

- `main` contains validated baselines.
- Changes should normally be developed in a branch and merged through a PR.
- Release tags follow semantic versioning, e.g. `v2.1.0`, `v2.2.0`, `v2.2.1`.
- Do not commit ZIP/RAR/7z archives. Source packages are expanded into normal repository directories.

## Disclaimer

This is an independent engineering project and is not affiliated with or endorsed by Tesla, Audison, Audiotec Fischer / HELIX / MATCH, Focal, Pioneer, STP, CTK, or MB Car Audio. Product names and trademarks belong to their respective owners.
