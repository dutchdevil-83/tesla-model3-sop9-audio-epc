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

- `index.html` - public project landing page and current engineering summary.
- `catalog.html` - loader for the current self-contained interactive EPC HTML stored at repository root.
- `data/door_damping_v2.2.json` - public structured data for the door-acoustic-treatment comparison.
- `.nojekyll` - prevents Jekyll processing so the folder is served as static content.

The public landing page may show engineering decisions and sourcing references. It must not imply affiliation with Tesla or any audio-equipment manufacturer.
