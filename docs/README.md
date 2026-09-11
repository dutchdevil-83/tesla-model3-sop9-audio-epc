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
- `assets/app.js` - stage planning, endpoint navigation, source switching, connector evidence and inspector behavior.
- `catalog.html` - loader for the current self-contained interactive EPC HTML stored at repository root.
- `data/door_damping_v2.2.json` - public structured data for the door-acoustic-treatment comparison.
- `.nojekyll` - prevents Jekyll processing so the folder is served as static content.

## Repository asset loading

Classic Pages publishes only `/docs`; files such as `Target_Assets/core/audio_lhd.svg`, connector location images and `Target_Assets/coverage.json` live outside that publish folder. The workspace therefore resolves those validated assets from the repository's public `raw.githubusercontent.com/.../main/` paths instead of using broken `../Target_Assets/...` links.

`scripts/validate_docs_workspace.py` is executed by the repository validation workflow. It rejects dead out-of-`/docs` target paths, verifies the 15 target endpoints and 14/15 location-image state, checks the two Tesla Service audio schematics, and prevents the old generic hand-drawn vehicle renderer markers from returning.

The public workspace may show engineering decisions and sourcing references. It must not imply affiliation with Tesla or any audio-equipment manufacturer.
