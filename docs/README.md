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
- `assets/harness-map.js` / `data/harness-integration.json` - exact SOP9 OEM source/speaker references plus 2026 Highland replacement sleeve labels; actual new physical cavities remain unverified.
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

## Replacement harness: 2026-10-08 (SUPERSEDES old Ryzen repin plan)

The earlier M141318 Ryzen guide and seven-channel repin plan below have been **superseded**, not silently retroactively made correct. Audiotec Fischer specifies MATCH **M141318** for pre-Highland Ryzen Model 3 (through 09/2023), and MATCH **M141320** for Highland (from 10/2023). The received replacement's exact printed product/part identity remains to be confirmed against its actual label.

- Read **[HIGHLAND-REPLACEMENT-DSP-MANUAL.md](HIGHLAND-REPLACEMENT-DSP-MANUAL.md)** for all seven source/return sleeve names, differences, safety checks and starting DSP filters.
- Use the **[interactive old/new DSP connector and VCP inspector](dsp-wiring.html)**. This shows physical HELIX -X/+X inputs and +X/-X outputs, actual new colours, historical planned old colours and an editable field to record old currently installed wires (unknown until recorded).
- Machine-readable source: **[replacement-harness-2026-10-08.json](data/replacement-harness-2026-10-08.json)**. It explicitly distinguishes photographed new lead sleeves from unproven new connector cavities.
- The previous **Front Low Left/Right** labels are **Front Low/TW Left/Right** on the new cable. The seven broad colour families appear consistent with the old engineering map; individual new plug cavity positions remain unverified.
- DSP **VCP** is required for both physical Pioneer J/K channels to track DIRECTOR SubRC: VCP virtual Subwoofer 1 (K) -> physical J, virtual Subwoofer 2 (L) -> physical K.
- **H/I tweeter outputs remain MUTED / DISCONNECTED** until separate wiring, crossover protection and load isolation from front woofer A/B are physically proved. Never directly parallel a 3-ohm HELIX woofer and a 4-ohm HELIX tweeter on a V TWELVE output.

### HELIX terminal meanings

- HIGHLEVEL INPUT A-L is labelled -X / +X. OUTPUT CHANNELS A-L is labelled +X / -X. LINE INPUT A-F and LINE OUTPUT M/N remain unused in this configuration.
- Tesla X171/X175 OEM source cavity/net references are separately documented in the existing SOP9 metadata. They do not prove how a newly received physical white plug is pinned.
- The original 2026-09-16 Ryzen project plan is a historical design assumption, not evidence of the actual old DSP connections. Do not attempt to repin the new Highland harness using the old Ryzen cavity map.

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
