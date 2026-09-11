# Tesla Parts Catalog asset import tools

These tools deliberately separate **acquisition** from **repository import**.

Tesla's EPC / Parts Catalog terms govern whether you may save or republish catalog content. These scripts do not bypass authentication, call hidden EPC APIs, or scrape the live site.

## 1. Export a HAR you are authorized to retain

In Chromium/Chrome DevTools:

1. Open **Network**.
2. Enable **Preserve log**.
3. Load the catalog pages/assets you are permitted to use.
4. Use **Save all as HAR with content**.

Do not put a full VIN in filenames or commit messages.

## 2. Extract embedded visual assets from the HAR

```powershell
& {
    .\scripts\parts-catalog\Export-AssetsFromHar.ps1 `
        -HarPath "$env:USERPROFILE\Downloads\parts-tesla.har" `
        -OutputZip "$env:USERPROFILE\Downloads\tesla-parts-assets.zip" `
        -CatalogReference 'your-catalog-reference'
}
```

The collector performs **zero network requests**. It only extracts image/model bodies already embedded in the HAR. Duplicate bodies are removed by SHA-256. VIN-like values are redacted from stored source paths.

Add `-IncludeStylesAndFonts` only if your authorized export needs CSS/font resources for faithful local rendering.

## 3. Import into the repository

Preview/stage an import without pushing:

```powershell
& {
    .\scripts\parts-catalog\Import-PartsCatalogAssetBundle.ps1 `
        -BundleZip "$env:USERPROFILE\Downloads\tesla-parts-assets.zip" `
        -RepoRoot 'X:\Github\Personal\tesla-model3-sop9-audio-epc' `
        -CaptureId '20260911-model3-parts'
}
```

This writes:

```text
Source_Assets/Tesla_Parts_Catalog/<capture>/raw/
Source_Assets/Tesla_Parts_Catalog/<capture>/asset-manifest.json
Reference_Assets/Tesla_Parts_Catalog/<capture>/import-manifest.json
```

The importer verifies every SHA-256 before staging files.

## Optional: publish authorized web assets

Only when you have the rights to publish the catalog content:

```powershell
& {
    .\scripts\parts-catalog\Import-PartsCatalogAssetBundle.ps1 `
        -BundleZip "$env:USERPROFILE\Downloads\tesla-parts-assets.zip" `
        -RepoRoot 'X:\Github\Personal\tesla-model3-sop9-audio-epc' `
        -CaptureId '20260911-model3-parts' `
        -PublishToDocs `
        -CreateBranch `
        -Commit `
        -Push `
        -OpenDraftPr
}
```

`-PublishToDocs` copies web-safe assets into:

```text
docs/assets/tesla-parts/<capture>/
```

The default path does **not** publish anything to GitHub Pages.
