# Changelog

## v2.2.0 — 2026-09-10

- Added `Door_Damping_BOM` with separate **Front only** and **All 4 doors** scenarios based on the Bünde PRO / XTREME material schedules.
- Added `Door_Damping_Equiv` with functional-equivalence gates so alternatives are assessed by acoustic/mechanical function, construction, moisture/temperature suitability and published performance, not thickness alone.
- Added door-treatment products and alternatives to the EU Product Master / price matrix.
- Marked **CTK Premium 2.2 mm** as the strongest documented functional alternative to STP Black Gold: 2.2 mm, 100 µm foil and published MLF 0.36.
- Marked **CTK SilenceFix 10 mm** as a strong functional absorber/decoupler alternative to STP Accent 10.
- Added AliExpress butyl/aluminium and 5/10 mm closed-cell foam listings as research leads only; neither is treated as an approved equivalent until the exact variant has sufficient technical evidence.
- Kept **STP Aero Bomb, Sonora and Bromo** behind strict equivalence gates. No generic substitute is approved without comparable construction/performance documentation.
- Recorded the current Bromo specification discrepancy: Bünde kit text still lists 500x375x10 mm while the current standalone product is approximately 470x375x7 mm.
- Added `data/door-damping/door_damping_v2.2.json` as the structured engineering/sourcing source.
- Added a classic GitHub Pages source under `/docs`, including landing page, interactive-EPC loader, `.nojekyll` and setup instructions.

## v2.1.0 — 2026-09-10

- Added actual MB Car Audio hardware quote (EUR 4,010.90 hardware-only) and quote screenshot evidence.
- Replaced obsolete MBC shopping-list assumptions with the received Focal/Audison/MATCH basket.
- Added installer-confirmed routing: AF M8.14 bit front; AF M4D rear; AF M1D donor-sub candidate.
- Added music-first decision to omit upper/headliner immersive positions X569/X579; dashboard center remains retained.
- Added Audison vs HELIX tuning comparison. Corrected the overly broad earlier statement that HELIX has no tuning automation.
- Added manufacturer documentation indexes for Focal T3Y, Audison AF/bit Drive, MATCH PP-TES 1.7B Highland and Pioneer TS-WX1220AH donor subsystem.
- Added full identifiable-SKU NL/DE/BE/FR price matrix with explicit missing-market flags and split-buy comparison.
- Preserved all original Tesla source assets and v2.0.1 renderer fix.
- Kept archive flat: no ZIP/RAR/7z files inside the distributable ZIP.

## v2.0.1 — 2026-09-10

- Restored the missing renderer block that caused v1.9.1 through v2.0 to stop rendering service views after `renderInspector()`.
- Preserved the v2.0 Tesla target assets, source-capture data, BOM and sourcing content.
- Removed nested ZIPs from the distributable package.
- Expanded the raw Tesla source-capture archive into `Source_Assets/`.
- Expanded the Asset Collector archive into `Tools/`.
- Expanded the supplied DIRECTOR 3D archive into `Reference_Assets/`.
- Added supplied HELIX NEXT DSP ULTRA XT, HELIX V EIGHTEEN DSP, DIRECTOR and MATCH PP-TES 1.7B reference assets.
- Added full package SHA-256 inventory and archive provenance metadata.
