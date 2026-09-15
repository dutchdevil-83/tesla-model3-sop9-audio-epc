# GitHub Pages source

This directory is the source for **classic GitHub Pages / Deploy from a branch**.

Configure the repository once:

```text
Settings > Pages
Source: Deploy from a branch
Branch: main
Folder: /docs
Save
```

Expected site URL:

```text
https://dutchdevil-83.github.io/tesla-model3-sop9-audio-epc/
```

## Contents

- `index.html` - vehicle-centered Tesla Model 3 SOP9 audio engineering workspace.
- `assets/app.css` - workspace presentation.
- `assets/app.js` - Tesla endpoint navigation, source switching, connector evidence and inspector behavior.
- `assets/installed-system.js` - owner-confirmed purchased-build overlay, exact hardware mapping, service references and build state.
- `assets/installed-system.css` - purchased-build / documentation inspector styling.
- `data/installed-system.json` - current physical build, purchased/ordered hardware, official documentation links and Tesla Service procedure cross-reference.
- `catalog.html` - loader for the current self-contained interactive EPC HTML stored at repository root.
- `data/door_damping_v2.2.json` - public structured data for the door-acoustic-treatment comparison.
- `.nojekyll` - prevents Jekyll processing so the folder is served as static content.

## Current physical build

The published workspace now distinguishes the **actual current car build** from the 15-position Tesla reference architecture.

Current owner-confirmed state:

- HELIX V TWELVE DSP MK2 is the DSP amplifier.
- DIRECTOR for SCP is ordered.
- Front door woofers: HELIX Ci7 W200FM-S3.
- Front door tweeters: HELIX Ci7 T20FM-SC with CFMK20 TES.1 adapters ordered.
- Dash left/right: HELIX Ci7 M100FM-S3.
- Dash center: one HELIX Ci3 C100.2FM-S3 MK2.
- Rear door speakers remain the original Tesla speakers.
- Parcel-shelf speakers are absent and are shown as `NONE / FUTURE`.
- Headliner and PAUDIO-only 80 mm positions are reference/future endpoints, not falsely shown as installed.
- Two existing Pioneer subwoofers will be reused in the trunk as a separate subsystem. They are **not** represented as X588/X593 parcel-shelf speakers because those connectors/locations describe different Tesla hardware.
- Exact Pioneer model, nominal impedance and voice-coil configuration remain TBD before final subwoofer channel/load wiring is approved.

A receipt line identifies the purchased integration harness as `MATCH PP-TES 1.7B Ryzen`. Audiotec Fischer's official compatibility information states that this specific Ryzen version is for Model 3 MY 03/2022-09/2023 and is not Highland-compatible; `PP-TES 1.7B Highland` is the published Highland version. The workspace therefore shows an explicit **FITMENT CHECK REQUIRED** warning until the physical supplied harness label/part number is confirmed.

## Official documentation model

The repository stores structured links, specifications and concise engineering summaries from official manufacturer/Tesla sources. It does **not** vendor full third-party copyrighted manuals or Tesla service pages. The side panel links directly to the official source so the latest procedure/manual remains authoritative.

Each relevant target can expose:

- exact installed/current hardware and adapter;
- official Audiotec Fischer product/manual references;
- Tesla connector and raw pin/cavity identifiers;
- EPC mapping confidence and notes;
- physical location evidence;
- target-specific Tesla Service remove/install procedures, including prerequisite trim/panel access and torque information where documented.

## Identifier and readiness semantics

The workspace keeps three concepts separate:

1. `Tesla EPC <number>` is the original Parts Catalog annotation and may repeat.
2. `SPK01` through `SPK15` are unique project/reference target IDs.
3. Current-build status (`PURCHASED`, `OEM STOCK`, `NONE / FUTURE`, etc.) describes what is actually fitted or planned in this car.

EPC mapping **existence** is not promoted to `VERIFIED`. The original cross-reference confidence (`strong-family-match`, `location-count-candidate`, `probable-location-pair`, etc.) and note remain visible. Connector/pin/part identifiers are rendered verbatim rather than passed through generic human-readable token formatting.

The inspector also separates source evidence from current-build state. Metadata, connector/faceview, physical location, wiring/route and EPC mapping are independent evidence dimensions. A source gap such as X566's documented HTTP 403 remains visible and prevents unconditional READY status.

## Repository asset loading

Classic Pages publishes only `/docs`; files such as `Target_Assets/core/audio_lhd.svg`, connector location images and `Target_Assets/coverage.json` live outside that publish folder. The workspace therefore resolves those validated assets from the repository's public `raw.githubusercontent.com/.../main/` paths instead of using broken `../Target_Assets/...` links.

`scripts/validate_docs_workspace.py` and the focused unit tests are executed by the repository validation workflow. They protect the Tesla source baseline, target namespace, Parts Catalog hashes, build mapping, exact raw engineering identifiers and the explicit source gaps.

The public workspace may show engineering decisions and sourcing references. It must not imply affiliation with Tesla or any audio-equipment manufacturer.
