param(
    [Parameter(Mandatory = $true)]
    [string]$BundleZip,
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string]$CaptureId = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    [switch]$PublishToDocs,
    [switch]$MergeExisting,
    [switch]$CreateBranch,
    [switch]$Commit,
    [switch]$Push,
    [switch]$OpenDraftPr
)

& {
    $ErrorActionPreference = 'Stop'
    Set-StrictMode -Version Latest

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    function Get-SafeRelativePath([string]$Root, [string]$Path) {
        return [IO.Path]::GetRelativePath($Root, $Path).Replace('\', '/')
    }

    function Assert-SafeZipEntry([string]$EntryName, [string]$Destination) {
        if ([string]::IsNullOrWhiteSpace($EntryName)) { return $false }
        $normalized = $EntryName.Replace('/', [IO.Path]::DirectorySeparatorChar).TrimStart('\')
        if ($normalized -match '(^|[\\/])\.\.([\\/]|$)') { throw "Unsafe archive path: $EntryName" }
        $target = [IO.Path]::GetFullPath((Join-Path $Destination $normalized))
        $destFull = [IO.Path]::GetFullPath($Destination).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
        if (-not $target.StartsWith($destFull, [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe archive path: $EntryName" }
        return $true
    }

    function Get-StreamSha256([IO.Stream]$Stream) {
        $sha = [Security.Cryptography.SHA256]::Create()
        try {
            $hash = $sha.ComputeHash($Stream)
            return [BitConverter]::ToString($hash).Replace('-', '').ToLowerInvariant()
        }
        finally { $sha.Dispose() }
    }

    function Get-FileSha256([string]$Path) {
        return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
    }

    function Convert-OfflineRelative([string]$EntryName) {
        $name = $EntryName.Replace('\', '/').TrimStart('/')
        if ($name -match '^(index\.html|catalog\.json)$') { return $name }
        if ($name.StartsWith('images/drawings/')) { return ('raw/drawings/' + $name.Substring('images/drawings/'.Length)) }
        if ($name.StartsWith('images/parts/')) { return ('raw/parts/' + $name.Substring('images/parts/'.Length)) }
        if ($name.StartsWith('selected/')) { return $name }
        if ($name -eq 'asset-manifest.json') { return $name }
        return ('raw/other/' + $name)
    }

    function Test-ShouldReplace([string]$DestPath, [string]$IncomingSha, [DateTime]$IncomingStamp) {
        if (-not (Test-Path -LiteralPath $DestPath -PathType Leaf)) { return 'add' }
        $existingSha = Get-FileSha256 $DestPath
        if ($existingSha -eq $IncomingSha) { return 'skip-same-hash' }
        $existingTime = (Get-Item -LiteralPath $DestPath).LastWriteTimeUtc
        if ($existingTime -gt $IncomingStamp) { return 'skip-newer-dest' }
        return 'update-older'
    }

    function Write-ZipEntryToFile([IO.Compression.ZipArchiveEntry]$Entry, [string]$DestPath) {
        $dir = Split-Path -Parent $DestPath
        if ($dir) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        $in = $Entry.Open()
        try {
            $out = [IO.File]::Open($DestPath, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None)
            try { $in.CopyTo($out) }
            finally { $out.Dispose() }
        }
        finally { $in.Dispose() }
        if ($Entry.LastWriteTime.UtcDateTime.Year -gt 1980) {
            [IO.File]::SetLastWriteTimeUtc($DestPath, $Entry.LastWriteTime.UtcDateTime)
        }
    }

    if (-not (Test-Path -LiteralPath $BundleZip -PathType Leaf)) { throw "Bundle ZIP not found: $BundleZip" }
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.git'))) { throw "RepoRoot is not a Git worktree: $RepoRoot" }
    if ($CaptureId -notmatch '^[A-Za-z0-9._-]+$') { throw 'CaptureId may contain only letters, numbers, dot, underscore and hyphen.' }
    if ($Push -and -not $Commit) { throw '-Push requires -Commit.' }
    if ($OpenDraftPr -and -not $Push) { throw '-OpenDraftPr requires -Push.' }

    $bundle = (Resolve-Path -LiteralPath $BundleZip).Path
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
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

    if ((Test-Path -LiteralPath $sourceDest) -and -not $MergeExisting) {
        throw "Capture destination already exists: $sourceDest (pass -MergeExisting to hash-merge)."
    }
    New-Item -ItemType Directory -Path $sourceDest, $referenceDest -Force | Out-Null

    $archive = [IO.Compression.ZipFile]::OpenRead($bundle)
    $stats = [ordered]@{ added = 0; updated = 0; skippedHash = 0; skippedNewer = 0; bytesWritten = [int64]0 }
    $copied = [System.Collections.Generic.List[object]]::new()
    $layout = 'unknown'
    $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    if ($names -contains 'asset-manifest.json') { $layout = 'bundle' }
    elseif ($names -contains 'catalog.json' -or ($names | Where-Object { $_ -like 'images/parts/*' })) { $layout = 'offline-snapshot' }
    elseif ($names | Where-Object { $_ -like 'selected/audio-speakers/*' }) { $layout = 'bundle' }
    Write-Host "ZIP layout: $layout ($($archive.Entries.Count) entries)"

    try {
        foreach ($entry in $archive.Entries) {
            if ([string]::IsNullOrWhiteSpace($entry.Name)) { continue }
            Assert-SafeZipEntry $entry.FullName $sourceDest | Out-Null
            $incomingName = $entry.FullName.Replace('\', '/')
            $relative = if ($layout -eq 'offline-snapshot') { Convert-OfflineRelative $incomingName } else { $incomingName }
            $dest = Join-Path $sourceDest ($relative.Replace('/', [IO.Path]::DirectorySeparatorChar))

            $hashStream = $entry.Open()
            try { $incomingSha = Get-StreamSha256 $hashStream }
            finally { $hashStream.Dispose() }

            $stamp = $entry.LastWriteTime.UtcDateTime
            if ($stamp.Year -lt 1980) { $stamp = [DateTime]::UtcNow }
            $action = Test-ShouldReplace $dest $incomingSha $stamp
            switch ($action) {
                'skip-same-hash' { $stats.skippedHash++; continue }
                'skip-newer-dest' { $stats.skippedNewer++; continue }
                'update-older' { $stats.updated++ }
                default { $stats.added++ }
            }
            Write-ZipEntryToFile $entry $dest
            $stats.bytesWritten += [int64]$entry.Length
            $copied.Add([pscustomobject]@{
                file = Get-SafeRelativePath $repo $dest
                zipEntry = $incomingName
                sha256 = $incomingSha
                bytes = [int64]$entry.Length
                action = $action
            })
        }
    }
    finally { $archive.Dispose() }

    [ordered]@{
        schemaVersion = 3
        importedAtUtc = [DateTime]::UtcNow.ToString('o')
        captureId = $CaptureId
        sourceBundle = [IO.Path]::GetFileName($bundle)
        sourceBytes = (Get-Item -LiteralPath $bundle).Length
        layout = $layout
        mergeExisting = [bool]$MergeExisting
        added = $stats.added
        updated = $stats.updated
        skippedSameHash = $stats.skippedHash
        skippedNewerDest = $stats.skippedNewer
        bytesWritten = $stats.bytesWritten
        publishedToDocs = [bool]$PublishToDocs
        files = $copied
    } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $referenceDest 'import-manifest.json') -Encoding UTF8

    if ($PublishToDocs) {
        $candidates = @(
            (Join-Path $sourceDest 'selected\audio-speakers'),
            (Join-Path $sourceDest 'raw\drawings')
        )
        $selectedSource = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Container } | Select-Object -First 1
        if ($selectedSource) {
            New-Item -ItemType Directory -Path $docsCapture, $docsStable -Force | Out-Null
            Get-ChildItem -LiteralPath $selectedSource -File | Where-Object { $_.Extension -match '\.(png|svg|json|jpg|jpeg)$' } | ForEach-Object {
                Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $docsCapture $_.Name) -Force
            }
            foreach ($name in @('audio-speakers.png', 'epc-crossref.json')) {
                $src = Join-Path $sourceDest "selected\audio-speakers\$name"
                if (Test-Path -LiteralPath $src -PathType Leaf) {
                    Copy-Item -LiteralPath $src -Destination (Join-Path $docsStable $name) -Force
                }
            }
        }
    }

    Push-Location $repo
    try {
        git add -- "Source_Assets/Tesla_Parts_Catalog/$CaptureId" "Reference_Assets/Tesla_Parts_Catalog/$CaptureId"
        if ($PublishToDocs) { git add -- 'docs/assets/tesla-parts/audio-speakers' "docs/assets/tesla-parts/captures/$CaptureId" }
        git status --short -- "Source_Assets/Tesla_Parts_Catalog/$CaptureId" "Reference_Assets/Tesla_Parts_Catalog/$CaptureId" 'docs/assets/tesla-parts/audio-speakers' "docs/assets/tesla-parts/captures/$CaptureId"
        if ($Commit) {
            git commit -m "assets: import Parts Catalog capture $CaptureId ($layout)"
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

    Write-Host ("Imported add={0} update={1} skip-hash={2} skip-newer={3} written={4:N1} MB" -f $stats.added, $stats.updated, $stats.skippedHash, $stats.skippedNewer, ($stats.bytesWritten / 1MB))
    Write-Host "Source capture: $sourceDest"
    Write-Host "Import provenance: $referenceDest"
}
