# Tesla Model 3 SOP9 target audio assets — v2.0.1

Current source tree: `../Source_Assets/`
Original source archive and SHA-256 are recorded in `../PROVENANCE.json`.
Collector: v1.1.6
Generated source capture: 2026-09-10T11:50:22.583Z

Historical path note: the earlier package layout used `../Source_Assets/Tesla_Model3_SOP9_audio_assets_2026-09-10T11-50-37-616Z/`. That path is no longer the current working-tree layout after the source-asset flattening. `../Tesla_SOP9_Audio_EPC_Package_v2.1.0_manifest.json` and `../SHA256SUMS.txt` intentionally preserve the pre-flattening package paths as historical v2.1 provenance; they must not be interpreted as current repository paths.

Critical target coverage:
- 15/15 target speaker connector metadata records present.
- 15/15 target speaker faceviews resolved (3 unique faceview files).
- 12/15 target location JPGs were returned in the current collector capture.
- 2 additional target location JPGs (X586 and X595) are retained from the prior built-in capture after the current Tesla endpoint returned HTTP 403.
- X566 location JPG remains unavailable (HTTP 403). This is a visual-only gap; X566 connector identity, device name, faceview and cavities are present.

No Tesla OEM speaker part numbers are inferred from connector housing part numbers.
