# Tesla Model 3 Highland SOP9 Audio EPC

Engineering, sourcing and installation reference for a **Tesla Model 3 Highland 2026 Premium Long Range RWD / SOP9 / LHD** audio upgrade.

Current baseline: **v2.1.0** (2026-09-10)

## Project scope

- Tesla SOP9 speaker/location reference and verified source assets
- Interactive EPC/playground
- Audio BOM and EU procurement comparison
- MB Car Audio Audison/Focal proposal
- HELIX alternative architecture
- Channel-routing and integration decisions
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

## Repository layout

```text
assets/              Tesla/source and project-owned working assets
data/                BOM exports, pricing, channel maps and coverage data
docs/                GitHub Pages entry point and documentation
references/          Documentation indexes and permitted reference material
tools/               Asset-collector tooling
workbook/            Current Excel engineering/procurement workbook
.github/workflows/   QA and GitHub Pages workflows
```

## Interactive catalog

After the full v2.1.0 baseline has been imported, open:

```text
Tesla_SOP9_Audio_EPC_Playground_v2.1.0_Final.html
```

The GitHub Pages landing page is prepared under `docs/` and will link to the current catalog.

## Important engineering gates

- Measure/verify the Pioneer donor-woofer electrical configuration before final AF M1D wiring.
- Do not infer unconfirmed Tesla connector pinouts or amplifier routing.
- Recheck procurement prices, stock, shipping and warranty conditions immediately before purchase.
- Installer field experience (for example Audison vs HELIX tuning time) is recorded as field evidence, not as a manufacturer benchmark.

## Version policy

- `main` contains validated baselines.
- Changes should normally be developed in a branch and merged through a PR.
- Release tags follow semantic versioning, e.g. `v2.1.0`, `v2.1.1`, `v2.2.0`.
- Do not commit ZIP/RAR/7z archives. Source packages are expanded into normal repository directories.

## Disclaimer

This is an independent engineering project and is not affiliated with or endorsed by Tesla, Audison, Audiotec Fischer / HELIX / MATCH, Focal, Pioneer, or MB Car Audio. Product names and trademarks belong to their respective owners.
