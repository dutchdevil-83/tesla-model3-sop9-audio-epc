param(
    [Parameter(Mandatory = $false)]
    [string]$PackageZip = "$env:USERPROFILE\Downloads\Tesla_SOP9_Audio_EPC_Package_v2.1.0_Full.zip",

    [Parameter(Mandatory = $false)]
    [string]$WorkingRoot = "X:\Github\Personal"
)

& {
    $ErrorActionPreference = 'Stop'

    $Repo = 'dutchdevil-83/tesla-model3-sop9-audio-epc'
    $RepoDir = Join-Path $WorkingRoot 'tesla-model3-sop9-audio-epc'
    $TempDir = Join-Path $env:TEMP ("tesla-sop9-v210-" + [guid]::NewGuid().ToString('N'))

    if (-not (Test-Path -LiteralPath $PackageZip)) {
        throw "Package ZIP not found: $PackageZip"
    }

    gh auth status --hostname github.com | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'GitHub CLI is not authenticated.'
    }

    if (-not (Test-Path -LiteralPath $WorkingRoot)) {
        New-Item -ItemType Directory -Path $WorkingRoot -Force | Out-Null
    }

    if (Test-Path -LiteralPath $RepoDir) {
        if (-not (Test-Path -LiteralPath (Join-Path $RepoDir '.git'))) {
            throw "Target exists but is not a Git repository: $RepoDir"
        }

        Push-Location $RepoDir
        try {
            git status --porcelain
            if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect repository status.' }
            if (git status --porcelain) { throw 'Repository worktree is not clean.' }
            git pull --ff-only origin main
        }
        finally {
            Pop-Location
        }
    }
    else {
        gh repo clone $Repo $RepoDir
    }

    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

    try {
        Expand-Archive -LiteralPath $PackageZip -DestinationPath $TempDir -Force

        $Entries = @(Get-ChildItem -LiteralPath $TempDir -Force)
        if ($Entries.Count -ne 1 -or -not $Entries[0].PSIsContainer) {
            throw 'Unexpected package structure. Expected one top-level directory.'
        }

        $SourceRoot = $Entries[0].FullName

        $NestedArchives = @(Get-ChildItem -LiteralPath $SourceRoot -Recurse -File | Where-Object {
            $_.Extension -in @('.zip', '.rar', '.7z')
        })
        if ($NestedArchives.Count -gt 0) {
            throw "Nested archive(s) found in package: $($NestedArchives.FullName -join ', ')"
        }

        Get-ChildItem -LiteralPath $SourceRoot -Force | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $RepoDir -Recurse -Force
        }

        Push-Location $RepoDir
        try {
            git add -A

            $Archives = @(git ls-files '*.zip' '*.rar' '*.7z')
            if ($Archives.Count -gt 0) {
                throw "Archive files are staged/tracked unexpectedly: $($Archives -join ', ')"
            }

            if (-not (git status --porcelain)) {
                Write-Host 'No changes to commit.'
                return
            }

            git commit -m 'feat: import v2.1.0 full EPC baseline'
            git push origin main

            Write-Host "Imported v2.1.0 baseline into https://github.com/$Repo"
        }
        finally {
            Pop-Location
        }
    }
    finally {
        if (Test-Path -LiteralPath $TempDir) {
            Remove-Item -LiteralPath $TempDir -Recurse -Force
        }
    }
}
