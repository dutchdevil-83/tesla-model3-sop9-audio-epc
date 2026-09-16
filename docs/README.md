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
- `assets/harness-map.js` / `data/harness-integration.json` - PP-TES sleeve labels, verified SOP9 Tesla source pairs and custom-harness rework state.
- `assets/v-twelve-map.js` / `data/v-twelve-connectors.json` - exact HELIX V TWELVE factory connector labels plus the proposed A-L installation assignment.
- `data/installed-system.json` - current physical build, purchased/ordered hardware, official documentation links and Tesla Service procedure cross-reference.
- `catalog.html` - loader for the current self-contained interactive EPC HTML stored at repository root.
- `data/door_damping_v2.2.json` - public structured data for the door-acoustic-treatment comparison.
- `.nojekyll` - prevents Jekyll processing so the folder is served as static content.

## Current physical build

The published workspace distinguishes the **actual current car build** from the 15-position Tesla reference architecture.

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

## PP-TES Ryzen donor harness and verified SOP9 map

The purchased donor harness is `MATCH PP-TES 1.7B Ryzen` (M141318). Audiotec Fischer does not publish that older product as plug-and-play compatible with Model 3 Highland. In this build it is deliberately used as a **custom vehicle-side breakout / return harness**, not as a MATCH-UP-10DSP plug-and-play installation.

The Tesla-side electrical meaning is **not pending**. The repository already contains the SOP9 electrical reference, and the engineering workspace derives the seven standard-audio source pairs directly from it:

| PP-TES sleeve label | Tesla SOP9 source pair | Logical role |
| --- | --- | --- |
| `Front Low Left` | X171-6 `AMP2_2P` / X171-5 `AMP2_2N` | front-left door woofer source |
| `Front Low Right` | X171-2 `AMP2_1P` / X171-1 `AMP2_1N` | front-right door woofer source |
| `Front Left` | X175-10 `AMP3_1_P` / X175-9 `AMP3_1_N` | left dash speaker source |
| `Center` | X171-7 `AMP2_4P` / X171-8 `AMP2_4N` | center dash speaker source |
| `Front Right` | X175-4 `AMP3_3_P` / X175-3 `AMP3_3_N` | right dash speaker source |
| `Rear Left` | X175-13 `AMP3_2_P` / X175-14 `AMP3_2_N` | rear-left door speaker source |
| `Rear Right` | X171-3 `AMP2_3P` / X171-4 `AMP2_3N` | rear-right door speaker source |

These X171/X175 cavity and net definitions are treated as **VERIFIED SOP9 source evidence**. The remaining harness task is to compare/rework the older M141318's internal routing so its photographed `IN +/-` and `OUT +/-` sleeves serve these Highland SOP9 functions. A continuity check after modification is final harness QC, not a method for discovering what the Tesla SOP9 pins mean.

The `Optional Woofer 1/2 +/-` leads are kept separate from Tesla parcel-shelf X588/X593 and are not represented as Tesla source channels.

## HELIX V TWELVE connector plan

Factory connector labels are recorded separately from our installation assignment:

- `HIGHLEVEL INPUT`: channels A-L, each physically labelled `-X +X`.
- `OUTPUT CHANNELS`: amplified A-L, each physically labelled `+X -X`.
- `LINE INPUT`: RCA A-F, unused for the PP-TES speaker-level source plan.
- `LINE OUTPUT`: RCA M/N, reserved.
- `SCP`: DIRECTOR for SCP.
- `GND`, `POWER REM`, `+12V`, `REM. OUT`, `OPTICAL INPUT`, `USB` and `CONTROL / STATUS` are recorded exactly from the amplifier/manual and owner photographs.

The current installation plan assigns A-G to the seven direct PP-TES channels, H/I to the DSP-derived front tweeters, J/K to the two future Pioneer trunk-sub channels pending their electrical specifications, and L as spare. This A-L assignment is a **project wiring decision**, not a HELIX factory definition.

## Official documentation model

The repository stores structured links, specifications and concise engineering summaries from official manufacturer/Tesla sources. It does **not** vendor full third-party copyrighted manuals or Tesla service pages. The side panel links directly to the official source so the latest procedure/manual remains authoritative.

Each relevant target can expose:

- exact installed/current hardware and adapter;
- official Audiotec Fischer product/manual references;
- Tesla connector and raw pin/cavity identifiers;
- verified SOP9 source connector/cavity/net mapping;
- PP-TES labelled IN/OUT routing;
- planned V TWELVE input/output terminals;
- EPC mapping confidence and notes;
- physical location evidence;
- target-specific Tesla Service remove/install procedures, including prerequisite trim/panel access and torque information where documented.

## Identifier and readiness semantics

The workspace keeps separate concepts separate:

1. `Tesla EPC <number>` is the original Parts Catalog annotation and may repeat.
2. `SPK01` through `SPK15` are unique project/reference target IDs.
3. Current-build status (`PURCHASED`, `OEM STOCK`, `NONE / FUTURE`, etc.) describes what is actually fitted or planned in this car.
4. Tesla SOP9 electrical source mapping comes from the repository electrical reference.
5. The A-L V TWELVE assignment is the project installation plan.

EPC mapping **existence** is not promoted to `VERIFIED`. The original cross-reference confidence (`strong-family-match`, `location-count-candidate`, `probable-location-pair`, etc.) and note remain visible. Connector/pin/part identifiers are rendered verbatim rather than passed through generic human-readable token formatting.

The inspector also separates source evidence from current-build state. Metadata, connector/faceview, physical location, wiring/route and EPC mapping are independent evidence dimensions. A source gap such as X566's documented HTTP 403 remains visible and prevents unconditional READY status.

## Repository asset loading

Classic Pages publishes only `/docs`; files such as `Target_Assets/core/audio_lhd.svg`, connector location images and `Target_Assets/coverage.json` live outside that publish folder. The workspace therefore resolves those validated assets from the repository's public `raw.githubusercontent.com/.../main/` paths instead of using broken `../Target_Assets/...` links.

`scripts/validate_docs_workspace.py` and the focused unit tests are executed by the repository validation workflow. They protect the Tesla source baseline, exact SOP9 channel mapping, target namespace, Parts Catalog hashes, current-build mapping, raw engineering identifiers, V TWELVE connector labels and explicit source gaps.

The public workspace may show engineering decisions and sourcing references. It must not imply affiliation with Tesla or any audio-equipment manufacturer.
