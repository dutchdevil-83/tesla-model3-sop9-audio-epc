# Tesla Parts Catalog HAR asset tools

These scripts turn a **user-provided HAR export** into a repeatable repository asset package. They do not make network requests while extracting: the HAR is the acquisition boundary.

The collector is optimized for the Tesla Parts Catalog **Audio Speakers** system group and keeps the exact catalog artwork, callout coordinates, parts data and loaded part thumbnails together.

## 1. Capture the Audio Speakers page

In Chrome / Edge DevTools:

1. Open **Network** and enable **Preserve log**.
2. Open the vehicle-specific Parts Catalog.
3. Navigate to **21 - Infotainment → Audio Speakers**.
4. Wait until the vehicle illustration and parts list have loaded.
5. Use **Save all as HAR with content**.

Do not rename the HAR to include a full VIN. The collector redacts VIN-like strings from persisted JSON/source paths.

## 2. Extract the exact showcase assets

```powershell
& {
    .\scripts\parts-catalog\Export-AssetsFromHar.ps1 `
        -HarPath "$env:USERPROFILE\Downloads\parts.tesla.com.har" `
        -OutputZip "$env:USERPROFILE\Downloads\tesla-audio-speakers-assets.zip" `
        -CatalogReference '47b31c21-3311-4c98-a6fa-423a6997aaba' `
        -SystemGroupTitle 'Audio Speakers' `
        -IncludeRelatedHarnesses
}
```

The ZIP contains a stable selected subtree:

```text
asset-manifest.json
selected/
  audio-speakers/
    audio-speakers.png       # exact Parts Catalog showcase image
    audio-speakers.svg       # exact Parts Catalog interactive/vector source when embedded
    system-group.json        # exact system-group response with VIN-like values redacted
    epc-crossref.json        # parsed callouts + parts + internal SPK cross-reference
    parts/<part-number>/...  # thumbnails actually present in the HAR
  related-harnesses/...      # optional wiring/harness illustrations from the same HAR
```

### What `epc-crossref.json` adds

The Tesla SVG contains printed callout circles such as `1`, `3`, `4`, `5`, `6`, `9`, etc. The collector reads their `data-innertext`, circle coordinates and leader endpoints directly from the embedded SVG. This lets the UI put transparent click targets over the **original Tesla numbers** instead of drawing a replacement vehicle.

Important: an EPC annotation number identifies a **part/family** and may repeat at multiple physical locations. `SPK01`–`SPK15` remain this project's engineering endpoint IDs. The cross-reference records confidence and fitment discrepancies instead of pretending the two numbering systems are identical.

## 3. Import into the repository

```powershell
& {
    .\scripts\parts-catalog\Import-PartsCatalogAssetBundle.ps1 `
        -BundleZip "$env:USERPROFILE\Downloads\tesla-audio-speakers-assets.zip" `
        -RepoRoot 'X:\Github\Personal\tesla-model3-sop9-audio-epc' `
        -CaptureId '20260911-audio-speakers'
}
```

The importer verifies every manifest SHA-256 and preserves the bundle structure under:

```text
Source_Assets/Tesla_Parts_Catalog/<capture>/
Reference_Assets/Tesla_Parts_Catalog/<capture>/import-manifest.json
```

## Publish the selected UI assets

Use `-PublishToDocs` when the selected assets should be served by this repository's GitHub Pages site:

```powershell
& {
    .\scripts\parts-catalog\Import-PartsCatalogAssetBundle.ps1 `
        -BundleZip "$env:USERPROFILE\Downloads\tesla-audio-speakers-assets.zip" `
        -RepoRoot 'X:\Github\Personal\tesla-model3-sop9-audio-epc' `
        -CaptureId '20260911-audio-speakers' `
        -PublishToDocs `
        -CreateBranch `
        -Commit `
        -Push `
        -OpenDraftPr
}
```

This creates two web locations:

```text
docs/assets/tesla-parts/audio-speakers/
    audio-speakers.png
    epc-crossref.json
    parts/...

docs/assets/tesla-parts/captures/<capture>/
    ...versioned selected evidence...
```

The **stable** `docs/assets/tesla-parts/audio-speakers/` path is what the main UI consumes. The versioned capture path preserves traceability.

## Mapping model

The cross-reference deliberately separates Tesla part-family facts from project mapping:

- annotation `1`: Tesla 200 mm parcel-shelf woofer pair → candidate `SPK12/SPK13`, with a driver-size discrepancy recorded;
- annotations `3` / `4`: base/premium 200 mm woofer families → `SPK01/SPK02` variant-family references;
- annotation `5`: Tesla 100 mm full-range family, seven physical leaders → candidate group `SPK05-SPK11`, with `SPK08/SPK09` flagged for 80/100 mm reconciliation;
- annotation `6`: active 25 mm tweeter family → strong match for `SPK03/SPK04`;
- annotation `9`: 60 mm full-range pair → probable `SPK14/SPK15`, with the current 50/60 mm planning difference flagged;
- annotations `2`, `7`, `8`, `10` remain amplifier / non-cabin / unmapped / hardware groups unless stronger evidence is added.

That is deliberately less convenient than making up certainty, but considerably more useful when somebody eventually has to install the hardware in an actual car.
