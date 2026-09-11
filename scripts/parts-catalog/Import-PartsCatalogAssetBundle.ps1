param(
    [Parameter(Mandatory = $true)]
    [string]$BundleZip,

    [Parameter(Mandatory = $false)]
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,

    [Parameter(Mandatory = $false)]
    [string]$CaptureId = (Get-Date -Format 'yyyyMMdd-HHmmss'),

    [Parameter(Mandatory = $false)]
    [switch]$PublishToDocs,

    [Parameter(Mandatory = $false)]
    [switch]$CreateBranch,

    [Parameter(Mandatory = $false)]
    [switch]$Commit,

    [Parameter(Mandatory = $false)]
    [switch]$Push,

    [Parameter(Mandatory = $false)]
    [switch]$OpenDraftPr
)

& {
    $ErrorActionPreference = 'Stop'
    Set-StrictMode -Version Latest

    function Get-SafeRelativePath {
        param([string]$Root, [string]$Path)
        return [IO.Path]::GetRelativePath($Root, $Path).Replace('\\', '/')
    }

    function Assert-SafeArchive {
        param([string]$ZipPath, [string]$Destination)
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $archive = [IO.Compression.ZipFile]::OpenRead($ZipPath)
        try {
            $destFull = [IO.Path]::GetFullPath($Destination).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
            foreach ($entry in $archive.Entries) {
                $target = [IO.Path]::GetFullPath((Join-Path $Destination $entry.FullName))
                if (-not $target.StartsWith($destFull, [StringComparison]::OrdinalIgnoreCase)) {
                    throw "Unsafe archive path: $($entry.FullName)"
                }
            }
        }
        finally { $archive.Dispose() }
    }

    if (-not (Test-Path -LiteralPath $BundleZip -PathType Leaf)) { throw "Bundle ZIP not found: $BundleZip" }
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.git'))) { throw "RepoRoot is not a Git worktree: $RepoRoot" }
    if ($CaptureId -notmatch '^[A-Za-z0-9._-]+$') { throw 'CaptureId may contain only letters, numbers, dot, underscore and hyphen.' }
    if ($Push -and -not $Commit) { throw '-Push requires -Commit.' }
    if ($OpenDraftPr -and -not $Push) { throw '-OpenDraftPr requires -Push.' }

    $bundle = (Resolve-Path -LiteralPath $BundleZip).Path
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $temp = Join-Path $env:TEMP ("tesla-parts-import-" + [guid]::NewGuid().ToString('N'))
    $sourceDest = Join-Path $repo "Source_Assets\Tesla_Parts_Catalog\$CaptureId"
    $referenceDest = Join-Path $repo "Reference_Assets\Tesla_Parts_Catalog\$CaptureId"
    $docsDest = Join-Path $repo "docs\assets\tesla-parts\$CaptureId"

    Push-Location $repo
    try {
        $status = @(git status --porcelain)
        if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect Git worktree.' }
        if (($CreateBranch -or $Commit -or $Push -or $OpenDraftPr) -and $status.Count -gt 0) {
            throw 'Git worktree must be clean when branch/commit/push options are used.'
        }

        if ($CreateBranch) {
            $branch = "assets/tesla-parts-$CaptureId"
            git switch -c $branch
            if ($LASTEXITCODE -ne 0) { throw "Unable to create branch $branch" }
        }
    }
    finally { Pop-Location }

    New-Item -ItemType Directory -Path $temp -Force | Out-Null
    try {
        Assert-SafeArchive -ZipPath $bundle -Destination $temp
        Expand-Archive -LiteralPath $bundle -DestinationPath $temp -Force

        $manifestPath = Join-Path $temp 'asset-manifest.json'
        if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
            throw 'Bundle is missing asset-manifest.json.'
        }

        $bundleManifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 50
        if (-not $bundleManifest.assets) { throw 'asset-manifest.json does not contain an assets array.' }

        New-Item -ItemType Directory -Path $sourceDest -Force | Out-Null
        Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $sourceDest 'asset-manifest.json') -Force

        $rawDest = Join-Path $sourceDest 'raw'
        New-Item -ItemType Directory -Path $rawDest -Force | Out-Null
        $copied = [System.Collections.Generic.List[object]]::new()

        foreach ($asset in @($bundleManifest.assets)) {
            $rel = ([string]$asset.file).Replace('/', [IO.Path]::DirectorySeparatorChar)
            $src = Join-Path $temp $rel
            if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { throw "Manifest asset missing from bundle: $($asset.file)" }

            $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $src).Hash.ToLowerInvariant()
            if ($actualHash -ne ([string]$asset.sha256).ToLowerInvariant()) { throw "SHA-256 mismatch: $($asset.file)" }

            $dest = Join-Path $rawDest ([IO.Path]::GetFileName($src))
            Copy-Item -LiteralPath $src -Destination $dest -Force
            $copied.Add([pscustomobject]@{
                file = Get-SafeRelativePath -Root $repo -Path $dest
                sha256 = $actualHash
                bytes = (Get-Item -LiteralPath $dest).Length
                mimeType = $asset.mimeType
                sourceHost = $asset.sourceHost
                sourcePath = $asset.sourcePath
            })
        }

        New-Item -ItemType Directory -Path $referenceDest -Force | Out-Null
        $importManifest = [ordered]@{
            schemaVersion = 1
            importedAtUtc = [DateTime]::UtcNow.ToString('o')
            captureId = $CaptureId
            sourceBundle = [IO.Path]::GetFileName($bundle)
            sourceKind = $bundleManifest.sourceKind
            catalogReference = $bundleManifest.catalogReference
            assetCount = $copied.Count
            publishedToDocs = [bool]$PublishToDocs
            files = $copied
        }
        $importManifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $referenceDest 'import-manifest.json') -Encoding UTF8

        if ($PublishToDocs) {
            New-Item -ItemType Directory -Path $docsDest -Force | Out-Null
            $webExtensions = @('.png','.jpg','.jpeg','.webp','.svg','.avif','.gif','.glb','.gltf','.bin','.woff','.woff2','.css')
            Get-ChildItem -LiteralPath $rawDest -File | Where-Object { $_.Extension.ToLowerInvariant() -in $webExtensions } | ForEach-Object {
                Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $docsDest $_.Name) -Force
            }
        }

        Push-Location $repo
        try {
            git add -- "Source_Assets/Tesla_Parts_Catalog/$CaptureId" "Reference_Assets/Tesla_Parts_Catalog/$CaptureId"
            if ($PublishToDocs) { git add -- "docs/assets/tesla-parts/$CaptureId" }

            Write-Host 'Staged asset import summary:'
            git status --short -- "Source_Assets/Tesla_Parts_Catalog/$CaptureId" "Reference_Assets/Tesla_Parts_Catalog/$CaptureId" $(if ($PublishToDocs) { "docs/assets/tesla-parts/$CaptureId" })

            if ($Commit) {
                git commit -m "assets: import authorized Parts Catalog bundle $CaptureId"
                if ($LASTEXITCODE -ne 0) { throw 'git commit failed.' }
            }
            if ($Push) {
                git push -u origin HEAD
                if ($LASTEXITCODE -ne 0) { throw 'git push failed.' }
            }
            if ($OpenDraftPr) {
                gh pr create --draft --base main --fill
                if ($LASTEXITCODE -ne 0) { throw 'gh pr create failed.' }
            }
        }
        finally { Pop-Location }

        Write-Host "Imported $($copied.Count) verified asset(s)."
        Write-Host "Source assets: $sourceDest"
        Write-Host "Import manifest: $referenceDest"
        if ($PublishToDocs) { Write-Host "Published web assets: $docsDest" }
    }
    finally {
        if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force }
    }
}
