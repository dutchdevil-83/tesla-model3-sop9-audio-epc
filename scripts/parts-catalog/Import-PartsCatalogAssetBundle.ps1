param(
    [Parameter(Mandatory = $true)]
    [string]$BundleZip,
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string]$CaptureId = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    [switch]$PublishToDocs,
    [switch]$CreateBranch,
    [switch]$Commit,
    [switch]$Push,
    [switch]$OpenDraftPr
)

& {
    $ErrorActionPreference = 'Stop'
    Set-StrictMode -Version Latest

    function Get-SafeRelativePath([string]$Root, [string]$Path) {
        return [IO.Path]::GetRelativePath($Root, $Path).Replace('\\', '/')
    }
    function Assert-SafeArchive([string]$ZipPath, [string]$Destination) {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $archive = [IO.Compression.ZipFile]::OpenRead($ZipPath)
        try {
            $destFull = [IO.Path]::GetFullPath($Destination).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
            foreach ($entry in $archive.Entries) {
                $target = [IO.Path]::GetFullPath((Join-Path $Destination $entry.FullName))
                if (-not $target.StartsWith($destFull, [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe archive path: $($entry.FullName)" }
            }
        }
        finally { $archive.Dispose() }
    }
    function Assert-SafeRelativePath([string]$RelativePath) {
        if ([string]::IsNullOrWhiteSpace($RelativePath)) { throw 'Manifest contains an empty file path.' }
        if ([IO.Path]::IsPathRooted($RelativePath)) { throw "Manifest contains rooted path: $RelativePath" }
        $normalized = $RelativePath.Replace('/', [IO.Path]::DirectorySeparatorChar)
        if (@($normalized -split [regex]::Escape([string][IO.Path]::DirectorySeparatorChar) | Where-Object { $_ -eq '..' }).Count -gt 0) { throw "Manifest contains parent traversal: $RelativePath" }
        return $normalized
    }

    if (-not (Test-Path -LiteralPath $BundleZip -PathType Leaf)) { throw "Bundle ZIP not found: $BundleZip" }
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.git'))) { throw "RepoRoot is not a Git worktree: $RepoRoot" }
    if ($CaptureId -notmatch '^[A-Za-z0-9._-]+$') { throw 'CaptureId may contain only letters, numbers, dot, underscore and hyphen.' }
    if ($Push -and -not $Commit) { throw '-Push requires -Commit.' }
    if ($OpenDraftPr -and -not $Push) { throw '-OpenDraftPr requires -Push.' }

    $bundle = (Resolve-Path -LiteralPath $BundleZip).Path
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $temp = Join-Path $env:TEMP ('tesla-parts-import-' + [guid]::NewGuid().ToString('N'))
    $sourceDest = Join-Path $repo "Source_Assets\Tesla_Parts_Catalog\$CaptureId"
    $referenceDest = Join-Path $repo "Reference_Assets\Tesla_Parts_Catalog\$CaptureId"
    $docsStable = Join-Path $repo 'docs\assets\tesla-parts\audio-speakers'
    $docsCapture = Join-Path $repo "docs\assets\tesla-parts\captures\$CaptureId"

    Push-Location $repo
    try {
        $status = @(git status --porcelain)
        if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect Git worktree.' }
        if (($CreateBranch -or $Commit -or $Push -or $OpenDraftPr) -and $status.Count -gt 0) { throw 'Git worktree must be clean when Git mutation options are used.' }
        if ($CreateBranch) {
            $branch = "assets/tesla-parts-$CaptureId"
            git switch -c $branch
            if ($LASTEXITCODE -ne 0) { throw "Unable to create branch $branch" }
        }
    }
    finally { Pop-Location }

    New-Item -ItemType Directory -Path $temp -Force | Out-Null
    try {
        Assert-SafeArchive $bundle $temp
        Expand-Archive -LiteralPath $bundle -DestinationPath $temp -Force
        $manifestPath = Join-Path $temp 'asset-manifest.json'
        if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'Bundle is missing asset-manifest.json.' }
        $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 50
        if (-not $manifest.assets) { throw 'asset-manifest.json does not contain an assets array.' }

        $selectedPng = Join-Path $temp 'selected\audio-speakers\audio-speakers.png'
        $crossRef = Join-Path $temp 'selected\audio-speakers\epc-crossref.json'
        if ([int]$manifest.schemaVersion -ge 2) {
            if (-not (Test-Path -LiteralPath $selectedPng -PathType Leaf)) { throw 'Bundle is missing selected/audio-speakers/audio-speakers.png.' }
            if (-not (Test-Path -LiteralPath $crossRef -PathType Leaf)) { throw 'Bundle is missing selected/audio-speakers/epc-crossref.json.' }
            $cross = Get-Content -LiteralPath $crossRef -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 50
            if ([string]$cross.title -ne 'Audio Speakers') { throw 'epc-crossref.json does not describe Audio Speakers.' }
            if (@($cross.callouts).Count -lt 10) { throw 'epc-crossref.json does not contain the expected Parts Catalog callouts.' }
        }

        if (Test-Path -LiteralPath $sourceDest) { throw "Capture destination already exists: $sourceDest" }
        New-Item -ItemType Directory -Path $sourceDest -Force | Out-Null
        Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $sourceDest 'asset-manifest.json') -Force
        $copied = [System.Collections.Generic.List[object]]::new()

        foreach ($asset in @($manifest.assets)) {
            $relative = Assert-SafeRelativePath ([string]$asset.file)
            $src = Join-Path $temp $relative
            if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { throw "Manifest asset missing from bundle: $($asset.file)" }
            $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $src).Hash.ToLowerInvariant()
            if ($hash -ne ([string]$asset.sha256).ToLowerInvariant()) { throw "SHA-256 mismatch: $($asset.file)" }
            $dest = Join-Path $sourceDest $relative
            New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
            Copy-Item -LiteralPath $src -Destination $dest -Force
            $copied.Add([pscustomobject]@{ file=Get-SafeRelativePath $repo $dest; sha256=$hash; bytes=(Get-Item -LiteralPath $dest).Length; mimeType=[string]$asset.mimeType })
        }

        New-Item -ItemType Directory -Path $referenceDest -Force | Out-Null
        [ordered]@{
            schemaVersion=2; importedAtUtc=[DateTime]::UtcNow.ToString('o'); captureId=$CaptureId;
            sourceBundle=[IO.Path]::GetFileName($bundle); sourceKind=[string]$manifest.sourceKind;
            catalogReference=[string]$manifest.catalogReference; systemGroupExternalReference=[string]$manifest.systemGroupExternalReference;
            selectedTitle=[string]$manifest.selectedTitle; assetCount=$copied.Count; publishedToDocs=[bool]$PublishToDocs; files=$copied
        } | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $referenceDest 'import-manifest.json') -Encoding UTF8

        if ($PublishToDocs) {
            $selectedSource = Join-Path $temp 'selected\audio-speakers'
            if (-not (Test-Path -LiteralPath $selectedSource -PathType Container)) { throw 'Selected Audio Speakers directory is required for -PublishToDocs.' }
            New-Item -ItemType Directory -Path $docsCapture, $docsStable -Force | Out-Null
            Copy-Item -Path (Join-Path $selectedSource '*') -Destination $docsCapture -Recurse -Force
            foreach ($name in @('audio-speakers.png','epc-crossref.json')) {
                $src = Join-Path $selectedSource $name
                if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { throw "Missing required selected asset: $name" }
                Copy-Item -LiteralPath $src -Destination (Join-Path $docsStable $name) -Force
            }
            $partsSource = Join-Path $selectedSource 'parts'
            if (Test-Path -LiteralPath $partsSource -PathType Container) {
                $partsDest = Join-Path $docsStable 'parts'
                New-Item -ItemType Directory -Path $partsDest -Force | Out-Null
                Copy-Item -Path (Join-Path $partsSource '*') -Destination $partsDest -Recurse -Force
            }
        }

        Push-Location $repo
        try {
            git add -- "Source_Assets/Tesla_Parts_Catalog/$CaptureId" "Reference_Assets/Tesla_Parts_Catalog/$CaptureId"
            if ($PublishToDocs) { git add -- 'docs/assets/tesla-parts/audio-speakers' "docs/assets/tesla-parts/captures/$CaptureId" }
            git status --short -- "Source_Assets/Tesla_Parts_Catalog/$CaptureId" "Reference_Assets/Tesla_Parts_Catalog/$CaptureId" 'docs/assets/tesla-parts/audio-speakers' "docs/assets/tesla-parts/captures/$CaptureId"
            if ($Commit) {
                git commit -m "assets: import Parts Catalog Audio Speakers capture $CaptureId"
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
        Write-Host "Source capture: $sourceDest"
        Write-Host "Import provenance: $referenceDest"
        if ($PublishToDocs) { Write-Host "Stable UI assets: $docsStable"; Write-Host "Versioned web evidence: $docsCapture" }
    }
    finally { if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force } }
}
