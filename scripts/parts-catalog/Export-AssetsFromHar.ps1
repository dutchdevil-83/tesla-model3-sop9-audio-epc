param(
    [Parameter(Mandatory = $true)]
    [string]$HarPath,

    [Parameter(Mandatory = $false)]
    [string]$OutputZip,

    [Parameter(Mandatory = $false)]
    [string]$CatalogReference,

    [Parameter(Mandatory = $false)]
    [switch]$IncludeStylesAndFonts
)

& {
    $ErrorActionPreference = 'Stop'
    Set-StrictMode -Version Latest

    function Get-ExtensionFromMime {
        param([string]$MimeType)
        $mime = ($MimeType -split ';', 2)[0].Trim().ToLowerInvariant()
        $map = @{
            'image/png' = '.png'
            'image/jpeg' = '.jpg'
            'image/jpg' = '.jpg'
            'image/webp' = '.webp'
            'image/svg+xml' = '.svg'
            'image/avif' = '.avif'
            'image/gif' = '.gif'
            'image/bmp' = '.bmp'
            'image/x-icon' = '.ico'
            'model/gltf-binary' = '.glb'
            'model/gltf+json' = '.gltf'
            'font/woff' = '.woff'
            'font/woff2' = '.woff2'
            'application/font-woff' = '.woff'
            'application/vnd.ms-fontobject' = '.eot'
            'text/css' = '.css'
        }
        if ($map.ContainsKey($mime)) { return $map[$mime] }
        return ''
    }

    function Test-AssetMime {
        param([string]$MimeType, [string]$Url)
        $mime = (($MimeType -split ';', 2)[0]).Trim().ToLowerInvariant()
        if ($mime -like 'image/*' -or $mime -like 'model/*') { return $true }
        if ($mime -eq 'application/octet-stream' -and $Url -match '\.(glb|gltf|bin)(\?|$)') { return $true }
        if ($IncludeStylesAndFonts -and ($mime -like 'font/*' -or $mime -eq 'text/css' -or $Url -match '\.(woff2?|ttf|otf|eot)(\?|$)')) { return $true }
        return $false
    }

    function Protect-Text {
        param([string]$Value)
        if ([string]::IsNullOrEmpty($Value)) { return $Value }
        return [regex]::Replace($Value, '(?i)\b[A-HJ-NPR-Z0-9]{17}\b', '[REDACTED-VIN]')
    }

    if (-not (Test-Path -LiteralPath $HarPath -PathType Leaf)) {
        throw "HAR file not found: $HarPath"
    }

    $resolvedHar = (Resolve-Path -LiteralPath $HarPath).Path
    if (-not $OutputZip) {
        $base = [IO.Path]::GetFileNameWithoutExtension($resolvedHar)
        $OutputZip = Join-Path (Split-Path -Parent $resolvedHar) "$base-assets.zip"
    }

    $work = Join-Path $env:TEMP ("tesla-parts-har-" + [guid]::NewGuid().ToString('N'))
    $assetRoot = Join-Path $work 'assets'
    New-Item -ItemType Directory -Path $assetRoot -Force | Out-Null

    try {
        $har = Get-Content -LiteralPath $resolvedHar -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 100
        if (-not $har.log -or -not $har.log.entries) {
            throw 'Invalid HAR: log.entries is missing.'
        }

        $seenHashes = @{}
        $manifestEntries = [System.Collections.Generic.List[object]]::new()
        $skipped = [System.Collections.Generic.List[object]]::new()
        $counter = 0

        foreach ($entry in @($har.log.entries)) {
            $url = [string]$entry.request.url
            $content = $entry.response.content
            $mime = [string]$content.mimeType

            if (-not (Test-AssetMime -MimeType $mime -Url $url)) { continue }
            if (-not $content.text) {
                $skipped.Add([pscustomobject]@{
                    reason = 'HAR entry has no embedded response body'
                    mimeType = $mime
                    source = Protect-Text $url
                })
                continue
            }

            if ([string]$content.encoding -eq 'base64') {
                try { $bytes = [Convert]::FromBase64String([string]$content.text) }
                catch {
                    $skipped.Add([pscustomobject]@{ reason = 'invalid base64 body'; mimeType = $mime; source = Protect-Text $url })
                    continue
                }
            }
            else {
                $bytes = [Text.Encoding]::UTF8.GetBytes([string]$content.text)
            }

            $sha = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
            if ($seenHashes.ContainsKey($sha)) { continue }
            $seenHashes[$sha] = $true
            $counter++

            $uri = $null
            try { $uri = [Uri]$url } catch { }
            $leaf = if ($uri) { [IO.Path]::GetFileName($uri.AbsolutePath) } else { '' }
            $leaf = Protect-Text $leaf
            $leaf = [regex]::Replace($leaf, '[^A-Za-z0-9._-]+', '_')
            $ext = [IO.Path]::GetExtension($leaf)
            if (-not $ext) { $ext = Get-ExtensionFromMime -MimeType $mime }
            if (-not $ext) { $ext = '.bin' }
            $stem = if ($leaf) { [IO.Path]::GetFileNameWithoutExtension($leaf) } else { 'asset' }
            if (-not $stem) { $stem = 'asset' }
            $fileName = ('{0:D4}_{1}_{2}{3}' -f $counter, $stem, $sha.Substring(0, 10), $ext.ToLowerInvariant())
            $dest = Join-Path $assetRoot $fileName
            [IO.File]::WriteAllBytes($dest, $bytes)

            $manifestEntries.Add([pscustomobject]@{
                file = "assets/$fileName"
                bytes = $bytes.Length
                sha256 = $sha
                mimeType = (($mime -split ';', 2)[0]).Trim()
                sourceHost = if ($uri) { $uri.Host } else { $null }
                sourcePath = if ($uri) { Protect-Text $uri.AbsolutePath } else { $null }
            })
        }

        $manifest = [ordered]@{
            schemaVersion = 1
            createdAtUtc = [DateTime]::UtcNow.ToString('o')
            sourceKind = 'local HAR export; no network requests performed by collector'
            sourceHar = [IO.Path]::GetFileName($resolvedHar)
            catalogReference = $CatalogReference
            assetCount = $manifestEntries.Count
            skippedCount = $skipped.Count
            assets = $manifestEntries
            skipped = $skipped
        }
        $manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $work 'asset-manifest.json') -Encoding UTF8

        if (Test-Path -LiteralPath $OutputZip) { Remove-Item -LiteralPath $OutputZip -Force }
        Compress-Archive -Path (Join-Path $work '*') -DestinationPath $OutputZip -CompressionLevel Optimal

        Write-Host "Created asset bundle: $OutputZip"
        Write-Host "Unique embedded assets: $($manifestEntries.Count)"
        if ($skipped.Count -gt 0) {
            Write-Warning "$($skipped.Count) matching resource(s) had no embedded HAR body and were not fetched from the network."
        }
    }
    finally {
        if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
    }
}
