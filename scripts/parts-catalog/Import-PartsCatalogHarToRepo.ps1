param(
    [Parameter(Mandatory = $true)]
    [Alias('HarPath', 'BundleZip', 'ZipPath')]
    [string]$InputPath,
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string]$CaptureId = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    [string]$CatalogReference,
    [string]$SystemGroupTitle = 'Audio Speakers',
    [switch]$IncludeRelatedHarnesses,
    [switch]$PublishToDocs,
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
    foreach ($required in @($importer)) {
        if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Required helper not found: $required" }
    }
    if (-not (Test-Path -LiteralPath $InputPath -PathType Leaf)) { throw "Input file not found: $InputPath" }

    $resolved = (Resolve-Path -LiteralPath $InputPath).Path
    $ext = [IO.Path]::GetExtension($resolved).ToLowerInvariant()
    $kind = switch ($ext) {
        '.har' { 'har' }
        '.zip' { 'zip' }
        default { throw "Unsupported input '$ext'. Use a .har or .zip file." }
    }

    Write-Host "Input: $resolved"
    Write-Host ("Size: {0:N1} MB" -f ((Get-Item -LiteralPath $resolved).Length / 1MB))
    Write-Host "Kind: $kind"

    $tempZip = $null
    $bundleToImport = $resolved
    try {
        if ($kind -eq 'har') {
            if (-not (Test-Path -LiteralPath $exporter -PathType Leaf)) { throw "HAR export helper not found: $exporter" }
            $tempZip = Join-Path $env:TEMP ("tesla-parts-$CaptureId-" + [guid]::NewGuid().ToString('N') + '.zip')
            $exportArgs = @{
                HarPath = $resolved
                OutputZip = $tempZip
                SystemGroupTitle = $SystemGroupTitle
            }
            if ($CatalogReference) { $exportArgs.CatalogReference = $CatalogReference }
            if ($IncludeRelatedHarnesses) { $exportArgs.IncludeRelatedHarnesses = $true }
            & $exporter @exportArgs
            $bundleToImport = $tempZip
        }

        $importArgs = @{
            BundleZip = $bundleToImport
            RepoRoot = $RepoRoot
            CaptureId = $CaptureId
            PublishToDocs = [bool]$PublishToDocs
            MergeExisting = $true
        }
        if ($CreateBranch) { $importArgs.CreateBranch = $true }
        if ($Commit) { $importArgs.Commit = $true }
        if ($Push) { $importArgs.Push = $true }
        if ($OpenDraftPr) { $importArgs.OpenDraftPr = $true }
        & $importer @importArgs

        Write-Host ''
        Write-Host 'Import complete.'
        Write-Host "Source capture: Source_Assets/Tesla_Parts_Catalog/$CaptureId/"
    }
    finally {
        if ($tempZip -and (Test-Path -LiteralPath $tempZip)) { Remove-Item -LiteralPath $tempZip -Force }
    }
}
