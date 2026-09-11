param(
    [Parameter(Mandatory = $true)]
    [string]$HarPath,
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string]$CaptureId = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    [string]$CatalogReference,
    [string]$SystemGroupTitle = 'Audio Speakers',
    [switch]$IncludeRelatedHarnesses,
    [switch]$CreateBranch,
    [switch]$Commit,
    [switch]$Push,
    [switch]$OpenDraftPr
)

& {
    $ErrorActionPreference = 'Stop'
    Set-StrictMode -Version Latest

    $exporter = Join-Path $PSScriptRoot 'Export-AssetsFromHar.ps1'
    $importer = Join-Path $PSScriptRoot 'Import-PartsCatalogAssetBundle.ps1'
    foreach ($required in @($exporter, $importer)) {
        if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Required helper not found: $required" }
    }
    if (-not (Test-Path -LiteralPath $HarPath -PathType Leaf)) { throw "HAR file not found: $HarPath" }

    $tempZip = Join-Path $env:TEMP ("tesla-parts-$CaptureId-" + [guid]::NewGuid().ToString('N') + '.zip')
    try {
        $exportArgs = @{
            HarPath = $HarPath
            OutputZip = $tempZip
            SystemGroupTitle = $SystemGroupTitle
        }
        if ($CatalogReference) { $exportArgs.CatalogReference = $CatalogReference }
        if ($IncludeRelatedHarnesses) { $exportArgs.IncludeRelatedHarnesses = $true }
        & $exporter @exportArgs

        $importArgs = @{
            BundleZip = $tempZip
            RepoRoot = $RepoRoot
            CaptureId = $CaptureId
            PublishToDocs = $true
        }
        if ($CreateBranch) { $importArgs.CreateBranch = $true }
        if ($Commit) { $importArgs.Commit = $true }
        if ($Push) { $importArgs.Push = $true }
        if ($OpenDraftPr) { $importArgs.OpenDraftPr = $true }
        & $importer @importArgs

        Write-Host ''
        Write-Host 'HAR -> repo import complete.'
        Write-Host 'Stable showcase: docs/assets/tesla-parts/audio-speakers/audio-speakers.png'
        Write-Host 'Cross-reference: docs/assets/tesla-parts/audio-speakers/epc-crossref.json'
        Write-Host "Source capture: Source_Assets/Tesla_Parts_Catalog/$CaptureId/"
    }
    finally {
        if (Test-Path -LiteralPath $tempZip) { Remove-Item -LiteralPath $tempZip -Force }
    }
}
