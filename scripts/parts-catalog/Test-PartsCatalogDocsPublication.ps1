param(
    [string]$ImporterPath = (Join-Path $PSScriptRoot 'Import-PartsCatalogAssetBundle.ps1')
)

& {
    $ErrorActionPreference = 'Stop'
    Set-StrictMode -Version Latest

    $requiredAssets = @('audio-speakers.svg', 'audio-speakers.png', 'epc-crossref.json')
    $importer = (Resolve-Path -LiteralPath $ImporterPath).Path
    $workRoot = Join-Path ([IO.Path]::GetTempPath()) ('tesla-parts-publication-' + [guid]::NewGuid().ToString('N'))

    function Get-HashSnapshot([string]$Root) {
        $snapshot = [ordered]@{}
        if (Test-Path -LiteralPath $Root -PathType Container) {
            foreach ($file in @(Get-ChildItem -LiteralPath $Root -Recurse -File | Sort-Object FullName)) {
                $relative = [IO.Path]::GetRelativePath($Root, $file.FullName).Replace('\', '/')
                $snapshot[$relative] = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
            }
        }
        return $snapshot
    }

    function Assert-HashSnapshotUnchanged(
        [System.Collections.IDictionary]$Before,
        [System.Collections.IDictionary]$After,
        [string]$Label
    ) {
        $beforeKeys = @($Before.Keys | ForEach-Object { [string]$_ } | Sort-Object)
        $afterKeys = @($After.Keys | ForEach-Object { [string]$_ } | Sort-Object)
        if ($beforeKeys.Count -ne $afterKeys.Count -or (Compare-Object -ReferenceObject $beforeKeys -DifferenceObject $afterKeys)) {
            throw "$Label file set changed. Before: $($beforeKeys -join ', '); after: $($afterKeys -join ', ')."
        }
        foreach ($key in $beforeKeys) {
            $beforeHash = [string]$Before[$key]
            $afterHash = [string]$After[$key]
            if ($beforeHash -ne $afterHash) {
                throw "$Label SHA-256 changed for ${key}: $beforeHash -> $afterHash."
            }
            Write-Host "    $Label/${key}: $beforeHash -> $afterHash (unchanged)"
        }
    }

    function Initialize-Fixture([string]$CaseRoot, [string]$CaptureId) {
        $repo = Join-Path $CaseRoot 'repo'
        $stable = Join-Path $repo 'docs\assets\tesla-parts\audio-speakers'
        $capture = Join-Path $repo "docs\assets\tesla-parts\captures\$CaptureId"
        New-Item -ItemType Directory -Path $stable, $capture -Force | Out-Null

        foreach ($asset in $requiredAssets) {
            [IO.File]::WriteAllBytes(
                (Join-Path $stable $asset),
                [Text.Encoding]::UTF8.GetBytes("existing-stable-$asset")
            )
        }
        [IO.File]::WriteAllText((Join-Path $stable 'stable-sentinel.txt'), 'stable-sentinel')
        [IO.File]::WriteAllText((Join-Path $capture 'capture-sentinel.txt'), 'capture-sentinel')

        New-Item -ItemType Directory -Path $repo -Force | Out-Null
        git -C $repo init --quiet
        if ($LASTEXITCODE -ne 0) { throw "Unable to initialize fixture Git repository: $repo" }
        git -C $repo config user.email 'parts-catalog-regression@example.invalid'
        git -C $repo config user.name 'Parts Catalog Regression'
        return $repo
    }

    function New-Bundle(
        [string]$CaseRoot,
        [string]$CaseId,
        [string]$MissingAsset
    ) {
        $bundleRoot = Join-Path $CaseRoot 'bundle-root'
        $selected = Join-Path $bundleRoot 'selected\audio-speakers'
        New-Item -ItemType Directory -Path $selected -Force | Out-Null

        foreach ($asset in $requiredAssets) {
            if ($asset -eq $MissingAsset) { continue }
            [IO.File]::WriteAllBytes(
                (Join-Path $selected $asset),
                [Text.Encoding]::UTF8.GetBytes("incoming-$CaseId-$asset")
            )
        }

        $zip = Join-Path $CaseRoot ($CaseId + '.zip')
        Compress-Archive -Path (Join-Path $bundleRoot '*') -DestinationPath $zip -CompressionLevel Optimal
        return $zip
    }

    function Invoke-Publish([string]$Repo, [string]$Bundle, [string]$CaptureId) {
        $succeeded = $true
        $output = ''
        try {
            $output = (& $importer `
                -BundleZip $Bundle `
                -RepoRoot $Repo `
                -CaptureId $CaptureId `
                -PublishToDocs `
                -MergeExisting `
                2>&1 | Out-String)
        }
        catch {
            $succeeded = $false
            $output = $_ | Out-String
        }
        return [pscustomobject]@{ Succeeded = $succeeded; Output = $output.Trim() }
    }

    try {
        New-Item -ItemType Directory -Path $workRoot -Force | Out-Null

        $negativeCases = @(
            [pscustomobject]@{ Name = 'missing-svg'; Missing = 'audio-speakers.svg' },
            [pscustomobject]@{ Name = 'missing-png'; Missing = 'audio-speakers.png' },
            [pscustomobject]@{ Name = 'missing-crossref'; Missing = 'epc-crossref.json' }
        )

        foreach ($case in $negativeCases) {
            $caseRoot = Join-Path $workRoot $case.Name
            New-Item -ItemType Directory -Path $caseRoot -Force | Out-Null
            $repo = Initialize-Fixture $caseRoot $case.Name
            $bundle = New-Bundle $caseRoot $case.Name $case.Missing
            $stable = Join-Path $repo 'docs\assets\tesla-parts\audio-speakers'
            $capture = Join-Path $repo "docs\assets\tesla-parts\captures\$($case.Name)"
            $beforeStable = Get-HashSnapshot $stable
            $beforeCapture = Get-HashSnapshot $capture

            $result = Invoke-Publish $repo $bundle $case.Name
            if ($result.Succeeded) { throw "$($case.Name) unexpectedly published successfully." }
            if ($result.Output -notmatch [regex]::Escape($case.Missing)) {
                throw "$($case.Name) failed without naming the missing asset '$($case.Missing)'. Output: $($result.Output)"
            }

            $afterStable = Get-HashSnapshot $stable
            $afterCapture = Get-HashSnapshot $capture
            Write-Host "PASS $($case.Name): publication failed before docs writes."
            Write-Host "  Error: $($result.Output -replace '\r?\n', ' | ')"
            Assert-HashSnapshotUnchanged $beforeStable $afterStable 'docsStable'
            Assert-HashSnapshotUnchanged $beforeCapture $afterCapture 'docsCapture'
        }

        $positiveName = 'complete-publication'
        $positiveRoot = Join-Path $workRoot $positiveName
        New-Item -ItemType Directory -Path $positiveRoot -Force | Out-Null
        $positiveRepo = Initialize-Fixture $positiveRoot $positiveName
        $positiveBundle = New-Bundle $positiveRoot $positiveName $null
        $positiveStable = Join-Path $positiveRepo 'docs\assets\tesla-parts\audio-speakers'
        $positiveCapture = Join-Path $positiveRepo "docs\assets\tesla-parts\captures\$positiveName"
        $positiveResult = Invoke-Publish $positiveRepo $positiveBundle $positiveName
        if (-not $positiveResult.Succeeded) {
            throw "complete publication failed: $($positiveResult.Output)"
        }

        $bundleSource = Join-Path $positiveRoot 'bundle-root\selected\audio-speakers'
        Write-Host "PASS complete-publication: all required assets published."
        foreach ($asset in $requiredAssets) {
            $expectedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $bundleSource $asset)).Hash.ToLowerInvariant()
            $stableHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $positiveStable $asset)).Hash.ToLowerInvariant()
            $captureHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $positiveCapture $asset)).Hash.ToLowerInvariant()
            if ($stableHash -ne $expectedHash -or $captureHash -ne $expectedHash) {
                throw "complete-publication SHA-256 mismatch for ${asset}: expected $expectedHash; stable $stableHash; capture $captureHash."
            }
            Write-Host "    ${asset}: source $expectedHash; docsStable $stableHash; docsCapture $captureHash"
        }

        Write-Host 'Parts Catalog docs publication regression validation: PASS'
    }
    finally {
        if (Test-Path -LiteralPath $workRoot) {
            Remove-Item -LiteralPath $workRoot -Recurse -Force
        }
    }
}
