# Tesla SOP9 Asset Collector v1.1.6

Lint-complete maintenance release over v1.1.5.

## What changed

- Fixes ESLint `curly` warnings by adding braces to every single-line `if` statement in the collector.
- The fix is applied across the entire userscript, not only the first warning reported by the Tampermonkey editor.
- Keeps the v1.1.5 `no-multi-spaces` cleanup.
- Keeps the native standard ZIP STORE writer introduced in v1.1.4.
- JSZip remains removed.
- `GM_registerMenuCommand` remains removed.
- CRC-32, SHA-256, fetch timeout, collection concurrency, missing-asset reporting and browser download behavior are unchanged.

## Expected ZIP phase

The UI shows `Creating ZIP (native STORE)...`, then progresses through local file records, central-directory records, Blob finalization and browser download.

## Validation

- `node --check`: PASS
- Static scan: every one-line `if` in the source uses braces.
- Static scan: no executable line contains multiple spaces immediately before an inline `//` comment.
- Static scan: no `JSZip`, `GM_registerMenuCommand` or `globalThis` runtime dependency remains.
- Native ZIP implementation is behaviorally unchanged from v1.1.5.

## Use

Replace the installed Tampermonkey script with `Tesla_SOP9_Asset_Collector_v1.1.6.user.js`, save it and reload the Tesla Service page. Confirm the console reports v1.1.6 before collecting.
