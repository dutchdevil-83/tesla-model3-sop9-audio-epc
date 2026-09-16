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

- `index.html` - default landscape-first **Installation Workflow**, optimized for iPad landscape and in-car use.
- `engineering.html` - the preserved source-focused Tesla Parts Catalog / Service engineering workspace.
- `assets/workflow.css` / `assets/workflow.js` - seven-step workflow layout, navigation, collapsible details and data-driven install guidance.
- `assets/app.css` / `assets/app.js` - engineering workspace presentation, Tesla endpoint navigation, source switching and inspector behavior.
- `assets/installed-system.js` - owner-confirmed purchased-build overlay, exact hardware mapping, service references and build state.
- `assets/harness-map.js` / `data/harness-integration.json` - exact SOP9 source/speaker colors, M141318 sleeve labels and V TWELVE A-G mapping.
- `assets/v-twelve-map.js` / `data/v-twelve-connectors.json` - exact V TWELVE factory connector labels and A-L speaker-output plan including direct J/K subwoofer outputs.
- `data/installed-system.json` - current physical build, purchased/ordered hardware, identified Pioneer donor subsystem and official documentation links.
- `catalog.html` - loader for the current self-contained interactive EPC HTML stored at repository root.
- `.nojekyll` - prevents Jekyll processing so the folder is served as static content.

## Installation Workflow

The root Pages URL now opens a seven-step landscape workflow rather than the engineering inspector. The step model mirrors the approved mockup:

1. Overview
2. Prepare
3. Remove
4. Install
5. Configure
6. Test
7. Enjoy

The workflow has a horizontal numbered timeline, a persistent step rail, Previous/Next controls, wide tables/cards and collapsible detail sections. At landscape widths the page keeps the header, timeline and navigation visible while the active step content scrolls independently. Portrait/narrow layouts fall back to horizontal step navigation.

The workflow does not duplicate or invent wiring facts. It loads the canonical `installed-system.json`, `harness-integration.json` and `v-twelve-connectors.json` files already used by the engineering workspace. Quick Access links open the preserved engineering views for Tesla Service wiring, connector evidence and technical sources.

The verified V TWELVE MK2 connector model is shown directly in the Install step:

- `HIGHLEVEL INPUT`: A-L, physically `-X +X`.
- `LINE INPUT`: RCA **A-F**. This is the official six-input V TWELVE MK2 layout; A-D was an earlier shorthand and is not used as the connector truth.
- amplified `OUTPUT CHANNELS`: A-L, physically `+X -X`.
- `LINE OUTPUT`: M/N.
- `USB`, `SCP`, `OPTICAL INPUT`, `REM. OUT`, `GND`, `POWER REM`, `+12V` and `CONTROL / STATUS` are exposed in the connector map.

## Current physical build

The published workspace distinguishes the **actual current car build** from the 15-position Tesla reference architecture.

Current owner-confirmed state:

- HELIX V TWELVE DSP MK2 is the only audio power amplifier in the current plan.
- DIRECTOR for SCP is ordered.
- Front door woofers: HELIX Ci7 W200FM-S3.
- Front door tweeters: HELIX Ci7 T20FM-SC with CFMK20 TES.1 adapters ordered.
- Dash left/right: HELIX Ci7 M100FM-S3.
- Dash center: one HELIX Ci3 C100.2FM-S3 MK2.
- Rear door speakers remain the original Tesla speakers.
- Parcel-shelf speakers are absent and are shown as `NONE / FUTURE`.
- The trunk subsystem reuses the two original 30 cm / 12-inch drivers from a **European Pioneer TS-WX1220AH** active dual-subwoofer system.
- Pioneer Europe lists TS-WX1220AH at **2 ohm / 1000 W nominal total** and its single-driver TS-WX1210AH sibling at **2 ohm / 500 W nominal**. The current project uses 2 ohm per loose donor driver as the working basis and requires DCR verification before first energization.
- V TWELVE **OUTPUT J -> SUB01** and **OUTPUT K -> SUB02**, one woofer per channel. At 2 ohm the V TWELVE is rated approximately **120 W RMS per channel**, so this current arrangement is deliberately power-limited.
- No external subwoofer amplifier and no original Pioneer amplifier are used. `LINE OUTPUT M/N` remain reserved/unused.

## PP-TES Ryzen donor harness and verified SOP9 map

The purchased donor harness is `MATCH PP-TES 1.7B Ryzen` (M141318). Audiotec Fischer does not publish that older product as plug-and-play compatible with Model 3 Highland. In this build it is deliberately used as a custom vehicle-side breakout/return harness and its amplifier-side conductors are terminated directly to the V TWELVE.

The Tesla-side electrical meaning is **not pending**. The repository SOP9 electrical reference defines the source cavities, nets and wire colors, while the speaker connector metadata defines the speaker-side return colors.

| V TWELVE | Function | SOP9 source | Speaker-side return |
| --- | --- | --- | --- |
| A | Front Low Left | X171-6 `YE` + / X171-5 `BU` - | X568 `YE` + / `BU` - |
| B | Front Low Right | X171-2 `YE/WH` + / X171-1 `BU/WH` - | X578 `YE` + / `BU` - |
| C | Front Left DASH | X175-10 `YE` + / X175-9 `VT` - | X566 `YE` + / `VT` - |
| D | Center DASH | X171-7 `GY` + / X171-8 `BU` - | X595 `GY` + / `BU` - |
| E | Front Right DASH | X175-4 `TN` + / X175-3 `BK` - | X576 `TN` + / `BK` - |
| F | Rear Left | X175-13 `RD` + / X175-14 `BK` - | X586 `RD` + / `BK` - |
| G | Rear Right | X171-3 `RD/WH` + / X171-4 `BK` - | X591 `RD` + / `BK` - |

The seven logical names should be **kept**, not renamed merely because the donor harness came from a Ryzen car. Instead, repin/re-route the M141318 so each labelled conductor serves the SOP9 circuit shown above, then add the V TWELVE channel to the sleeve. Example: `VT-A Front Low Left IN +` and `VT-A Front Low Left OUT +`.

On the V TWELVE `HIGHLEVEL INPUT`, each channel is physically labelled `-X +X`: connect sleeve `IN -` to `-X` and `IN +` to `+X`. On `OUTPUT CHANNELS`, each channel is physically labelled `+X -X`: connect sleeve `OUT +` to `+X` and sleeve `OUT -` to `-X`.

The tweeters are separate full-active outputs: V TWELVE H -> X565 (`VT` + / `BU` -) and V TWELVE I -> X575 (`VT` + / `BU` -), DSP-derived from high-level inputs C and E respectively.

The photographed `Optional Woofer 1 +/-` lead is assigned to V TWELVE J / SUB01 and `Optional Woofer 2 +/-` to V TWELVE K / SUB02. These are output leads in the current project and are **not** Tesla X588/X593 parcel-shelf channels.

Continuity testing of the finished M141318 is final physical QC. It is not needed to discover the Tesla SOP9 functions, which are already defined by the repository source data. Measure the two loose Pioneer donor drivers before first power-up as a separate subwoofer-load QC step.

## HELIX V TWELVE connector plan

Factory connector labels are kept separate from our installation assignment:

- `HIGHLEVEL INPUT`: A-L, physically `-X +X`.
- amplified `OUTPUT CHANNELS`: A-L, physically `+X -X`.
- `LINE INPUT`: RCA A-F, unused for the current PP-TES speaker-level source path.
- `LINE OUTPUT`: RCA M/N, reserved/unused in the current single-amplifier architecture.
- `SCP`: DIRECTOR for SCP.
- `GND`, `POWER REM`, `+12V`, `REM. OUT`, `OPTICAL INPUT`, `USB` and `CONTROL / STATUS` are recorded exactly from the amplifier/manual and owner photographs.

Current speaker outputs are A-G direct cabin channels, H/I tweeters, **J/K the two Pioneer donor woofers**, and L spare. This A-L assignment is a project wiring decision, not a HELIX factory definition.

## Official documentation model

The repository stores structured links, specifications and concise engineering summaries from official manufacturer/Tesla sources. It does **not** vendor full third-party copyrighted manuals or Tesla service pages. The workflow and engineering inspector link directly to the official source so the latest procedure/manual remains authoritative.

Each relevant target can expose:

- exact installed/current hardware and adapter;
- official Audiotec Fischer/Pioneer product and manual references;
- Tesla connector and raw pin/cavity identifiers;
- verified SOP9 source and speaker-side wire colors;
- final M141318 sleeve labels and V TWELVE terminal assignment;
- EPC mapping confidence and notes;
- physical location evidence;
- target-specific Tesla Service remove/install procedures, including prerequisite trim/panel access and torque information where documented.

## Identifier and readiness semantics

The workspace keeps separate concepts separate:

1. `Tesla EPC <number>` is the original Parts Catalog annotation and may repeat.
2. `SPK01` through `SPK15` are unique project/reference target IDs.
3. Current-build status (`PURCHASED`, `OEM STOCK`, `NONE / FUTURE`, etc.) describes what is actually fitted or planned in this car.
4. Tesla SOP9 electrical mapping comes from the repository electrical reference.
5. V TWELVE A-L/M-N assignments are project installation decisions.

EPC mapping existence is not promoted to `VERIFIED`. The original cross-reference confidence and notes remain visible. Connector/pin/part identifiers are rendered verbatim rather than passed through generic human-readable token formatting.

## Repository asset loading

Classic Pages publishes only `/docs`; files such as `Target_Assets/core/audio_lhd.svg`, connector location images and `Target_Assets/coverage.json` live outside that publish folder. The engineering workspace therefore resolves those validated assets from the repository's public `raw.githubusercontent.com/.../main/` paths instead of using broken `../Target_Assets/...` links. The Installation Workflow itself only consumes JSON published inside `/docs/data`.

`scripts/validate_docs_workspace.py` and focused unit tests are executed by the repository validation workflow. They protect the Tesla source baseline, exact SOP9 channel mapping/colors, target namespace, Parts Catalog hashes, current-build mapping, V TWELVE connector labels, direct Pioneer J/K routing and explicit source gaps. `tests/test_installation_workflow.py` additionally locks the seven-step navigation, iPad landscape contract, front/dash mapping, OEM rear/shelf-future state and connector labels.

The public workspace may show engineering decisions and sourcing references. It must not imply affiliation with Tesla or any audio-equipment manufacturer.
