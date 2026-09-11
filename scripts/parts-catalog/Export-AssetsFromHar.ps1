param(
    [Parameter(Mandatory = $true)]
    [string]$HarPath,
    [string]$OutputZip,
    [string]$CatalogReference,
    [string]$SystemGroupTitle = 'Audio Speakers',
    [switch]$IncludeRelatedHarnesses
)

& {
    $ErrorActionPreference = 'Stop'
    Set-StrictMode -Version Latest

    function Protect-Text([string]$Value) {
        if ([string]::IsNullOrEmpty($Value)) { return $Value }
        return [regex]::Replace($Value, '(?i)\b[A-HJ-NPR-Z0-9]{17}\b', '[REDACTED-VIN]')
    }
    function Get-Bytes($Entry) {
        $content = $Entry.response.content
        if (-not $content -or $null -eq $content.text) { return $null }
        if ([string]$content.encoding -eq 'base64') {
            try { return [Convert]::FromBase64String([string]$content.text) } catch { return $null }
        }
        return [Text.Encoding]::UTF8.GetBytes([string]$content.text)
    }
    function Get-Sha([byte[]]$Bytes) {
        return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Bytes)).ToLowerInvariant()
    }
    function Normalize-Url([string]$Url) {
        try { return [Uri]::UnescapeDataString(([Uri]$Url).AbsoluteUri) } catch { return [Uri]::UnescapeDataString($Url) }
    }
    function Find-Entry($Entries, [string]$Url) {
        $wanted = Normalize-Url $Url
        foreach ($entry in $Entries) {
            if ((Normalize-Url ([string]$entry.request.url)) -eq $wanted) { return $entry }
        }
        return $null
    }
    function Write-Asset([byte[]]$Bytes, [string]$Path) {
        New-Item -ItemType Directory -Path (Split-Path -Parent $Path) -Force | Out-Null
        [IO.File]::WriteAllBytes($Path, $Bytes)
    }
    function Get-Callouts([string]$SvgText) {
        $result = [System.Collections.Generic.List[object]]::new()
        $groups = [regex]::Matches($SvgText, '<g\b[^>]*>(?:(?!<g\b).)*?class="svg-circle"(?:(?!<g\b).)*?</g>', [Text.RegularExpressions.RegexOptions]::Singleline)
        $id = 0
        foreach ($groupMatch in $groups) {
            $group = $groupMatch.Value
            $circle = [regex]::Match($group, '<circle\b[^>]*class="svg-circle"[^>]*/?>')
            if (-not $circle.Success) { continue }
            $cxm = [regex]::Match($circle.Value, '\bcx="([^"]+)"')
            $cym = [regex]::Match($circle.Value, '\bcy="([^"]+)"')
            $anm = [regex]::Match($circle.Value, '\bdata-innertext="([^"]+)"')
            $cfm = [regex]::Match($circle.Value, '\bdata-confidence="([^"]+)"')
            if (-not ($cxm.Success -and $cym.Success -and $anm.Success)) { continue }
            $cx = [double]::Parse($cxm.Groups[1].Value, [Globalization.CultureInfo]::InvariantCulture)
            $cy = [double]::Parse($cym.Groups[1].Value, [Globalization.CultureInfo]::InvariantCulture)
            $anchors = [System.Collections.Generic.List[object]]::new()
            foreach ($pm in [regex]::Matches($group, '<path[^>]*\bd="([^"]+)"')) {
                $nums = @([regex]::Matches($pm.Groups[1].Value, '-?\d+(?:\.\d+)?') | ForEach-Object { [double]::Parse($_.Value, [Globalization.CultureInfo]::InvariantCulture) })
                if ($nums.Count -lt 4) { continue }
                $points = @()
                for ($i = 0; $i + 1 -lt $nums.Count; $i += 2) { $points += ,@($nums[$i], $nums[$i + 1]) }
                $distance = { param($p) [Math]::Sqrt((($p[0]-$cx)*($p[0]-$cx)) + (($p[1]-$cy)*($p[1]-$cy))) }
                $sorted = @($points | Sort-Object { & $distance $_ })
                if ($sorted.Count -eq 0 -or (& $distance $sorted[0]) -gt 14 -or (& $distance $sorted[-1]) -le 25) { continue }
                $far = $sorted[-1]
                if (@($anchors | Where-Object { [Math]::Abs($_.x-$far[0]) -lt 2 -and [Math]::Abs($_.y-$far[1]) -lt 2 }).Count -eq 0) {
                    $anchors.Add([pscustomobject]@{ x=$far[0]; y=$far[1]; xPct=[Math]::Round(($far[0]/1189)*100,4); yPct=[Math]::Round(($far[1]/841)*100,4) })
                }
            }
            $id++
            $result.Add([pscustomobject]@{
                id=$id; annotation=$anm.Groups[1].Value; cx=$cx; cy=$cy;
                xPct=[Math]::Round(($cx/1189)*100,4); yPct=[Math]::Round(($cy/841)*100,4);
                confidence=if($cfm.Success){$cfm.Groups[1].Value}else{$null}; anchors=$anchors
            })
        }
        return $result
    }

    if (-not (Test-Path -LiteralPath $HarPath -PathType Leaf)) { throw "HAR file not found: $HarPath" }
    $harPathResolved = (Resolve-Path -LiteralPath $HarPath).Path
    if (-not $OutputZip) { $OutputZip = Join-Path (Split-Path -Parent $harPathResolved) 'tesla-audio-speakers-assets.zip' }
    $work = Join-Path $env:TEMP ('tesla-parts-har-' + [guid]::NewGuid().ToString('N'))
    $selected = Join-Path $work 'selected\audio-speakers'
    New-Item -ItemType Directory -Path $selected -Force | Out-Null

    try {
        $har = Get-Content -LiteralPath $harPathResolved -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 100
        $entries = @($har.log.entries)
        if ($entries.Count -eq 0) { throw 'HAR contains no log entries.' }

        $groupResponse = $null
        foreach ($entry in $entries) {
            if ([string]$entry.request.url -notmatch '/systemgroups/') { continue }
            if ([string]$entry.response.content.mimeType -notmatch 'application/json') { continue }
            $bytes = Get-Bytes $entry
            if ($null -eq $bytes) { continue }
            try { $candidate = [Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json -Depth 100 } catch { continue }
            $obj = if ($candidate.responseObject) { $candidate.responseObject } else { $candidate }
            if ([string]$obj.title -eq $SystemGroupTitle) { $groupResponse = $candidate; break }
        }
        if ($null -eq $groupResponse) { throw "Embedded Parts Catalog system group '$SystemGroupTitle' was not found." }
        $group = if ($groupResponse.responseObject) { $groupResponse.responseObject } else { $groupResponse }

        Protect-Text ($groupResponse | ConvertTo-Json -Depth 100) | Set-Content -LiteralPath (Join-Path $selected 'system-group.json') -Encoding UTF8

        $sourceAssets = [ordered]@{}
        foreach ($image in @($group.systemGroupImages)) {
            $url = [string]$image.imageURL
            if (-not $url) { continue }
            $entry = Find-Entry $entries $url
            if ($null -eq $entry) { continue }
            $bytes = Get-Bytes $entry
            if ($null -eq $bytes) { continue }
            $ext = [IO.Path]::GetExtension(([Uri]$url).AbsolutePath).ToLowerInvariant()
            if ($ext -notin @('.png','.svg')) { continue }
            $name = "audio-speakers$ext"
            Write-Asset $bytes (Join-Path $selected $name)
            $sourceAssets[$ext] = [ordered]@{ path="selected/audio-speakers/$name"; sha256=Get-Sha $bytes; bytes=$bytes.Length; sourcePath=Protect-Text ([Uri]$url).AbsolutePath }
        }
        if (-not $sourceAssets['.png']) { throw 'Exact Audio Speakers PNG is not embedded in the HAR.' }

        $callouts = @()
        $svgPath = Join-Path $selected 'audio-speakers.svg'
        if (Test-Path -LiteralPath $svgPath) { $callouts = @(Get-Callouts (Get-Content -LiteralPath $svgPath -Raw -Encoding UTF8)) }

        $partRows = [System.Collections.Generic.List[object]]::new()
        foreach ($part in @($group.parts)) {
            $pn = [string]$part.partNumber
            $thumbs = [System.Collections.Generic.List[string]]::new()
            if ($pn) {
                foreach ($entry in $entries) {
                    $url = [string]$entry.request.url
                    if ($url -notmatch '/partimages/' -or $url -notmatch [regex]::Escape($pn)) { continue }
                    $bytes = Get-Bytes $entry
                    if ($null -eq $bytes) { continue }
                    $ext = if ([string]$entry.response.content.mimeType -match 'png') { '.png' } else { '.jpg' }
                    $relative = "selected/audio-speakers/parts/$pn/thumbnail$ext"
                    Write-Asset $bytes (Join-Path $work $relative.Replace('/', '\'))
                    $thumbs.Add($relative)
                }
            }
            $partRows.Add([pscustomobject]@{
                annotation=[string]$part.annotation; partNumber=$pn; description=[string]$part.title;
                quantity=$part.quantity; currencyCode=[string]$part.currencyCode; price=$part.price;
                notes=if($part.notes){Protect-Text ([string]$part.notes)}else{$null}; thumbnailFiles=$thumbs
            })
        }

        if ($IncludeRelatedHarnesses) {
            $patterns = @('Coax and Speciality Cables','Dash and Console Harnesses','Door and Trunk Harness','Headliner and Parcel Shelf Harnesses','Main Front and Body Harnesses')
            foreach ($entry in $entries) {
                $decoded = [Uri]::UnescapeDataString([string]$entry.request.url)
                if (@($patterns | Where-Object { $decoded.Contains($_) }).Count -eq 0) { continue }
                $bytes = Get-Bytes $entry
                if ($null -eq $bytes) { continue }
                $uri = [Uri][string]$entry.request.url
                $leaf = [regex]::Replace([IO.Path]::GetFileName([Uri]::UnescapeDataString($uri.AbsolutePath)), '[^A-Za-z0-9._-]+', '_')
                Write-Asset $bytes (Join-Path $work "selected\related-harnesses\$leaf")
            }
        }

        $mappings = [ordered]@{
            '1'=@{targets=@('SPK12','SPK13');confidence='direct-location-family';note='Tesla 200 mm parcel-shelf woofer pair. Current staged upgrade data differs in planned driver size; verify fitment.'}
            '3'=@{targets=@('SPK01','SPK02');confidence='variant-family';note='BASE 200 mm woofer family; not a left/right unique identifier.'}
            '4'=@{targets=@('SPK01','SPK02');confidence='variant-family';note='PREMIUM 200 mm woofer family; not a left/right unique identifier.'}
            '5'=@{targets=@('SPK05','SPK06','SPK07','SPK08','SPK09','SPK10','SPK11');confidence='location-count-candidate';note='100 mm full-range family has seven physical leaders. SPK08/SPK09 are currently planned as 80 mm and require reconciliation.'}
            '6'=@{targets=@('SPK03','SPK04');confidence='strong-family-match';note='Active 25 mm tweeter family appears twice; maps to the left/right tweeter pair.'}
            '9'=@{targets=@('SPK14','SPK15');confidence='probable-location-pair';note='60 mm full-range pair is the probable headliner/effect family; current plan uses 50 mm replacements.'}
            '2'=@{targets=@();confidence='non-cabin-component';note='Premium audio amplifier.'}
            '7'=@{targets=@();confidence='non-cabin-component';note='Pedestrian warning speaker; outside the 15 cabin targets.'}
            '8'=@{targets=@();confidence='unmapped-speaker-family';note='Super horn; not mapped into the 15-target architecture without stronger evidence.'}
            '10'=@{targets=@();confidence='hardware';note='Fastener/hardware callout.'}
            '*'=@{targets=@();confidence='hardware';note='Hardware/fastener Parts Catalog entries.'}
        }
        $crossRef = [ordered]@{
            schemaVersion=1; source='user-provided HAR export of Tesla Parts Catalog / Audio Speakers';
            catalogExternalReference=if($CatalogReference){$CatalogReference}else{[string]$group.catalogExternalReference};
            systemGroupExternalReference=[string]$group.externalReference; title=[string]$group.title; generation=[string]$group.generation;
            sourceAssets=$sourceAssets; calloutCoordinateSpace=@{width=1189;height=841}; callouts=$callouts;
            annotationMappings=$mappings; parts=$partRows;
            mappingWarning='Tesla EPC annotation numbers identify parts/families and repeat across physical callouts. SPKxx mappings are an engineering cross-reference, not OEM Tesla endpoint identifiers.'
        }
        $crossRef | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $selected 'epc-crossref.json') -Encoding UTF8

        $assets = [System.Collections.Generic.List[object]]::new()
        foreach ($file in Get-ChildItem -LiteralPath $work -Recurse -File | Where-Object Name -ne 'asset-manifest.json') {
            $assets.Add([pscustomobject]@{
                file=[IO.Path]::GetRelativePath($work,$file.FullName).Replace('\\','/'); bytes=$file.Length;
                sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant();
                mimeType=switch($file.Extension.ToLowerInvariant()){'.png'{'image/png'}'.jpg'{'image/jpeg'}'.jpeg'{'image/jpeg'}'.svg'{'image/svg+xml'}'.json'{'application/json'}default{'application/octet-stream'}}
            })
        }
        [ordered]@{
            schemaVersion=2; createdAtUtc=[DateTime]::UtcNow.ToString('o'); sourceKind='user-provided local HAR export; zero network requests';
            sourceHar=[IO.Path]::GetFileName($harPathResolved); catalogReference=$crossRef.catalogExternalReference;
            systemGroupExternalReference=$crossRef.systemGroupExternalReference; selectedTitle=$crossRef.title; assetCount=$assets.Count; assets=$assets
        } | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $work 'asset-manifest.json') -Encoding UTF8

        if (Test-Path -LiteralPath $OutputZip) { Remove-Item -LiteralPath $OutputZip -Force }
        Compress-Archive -Path (Join-Path $work '*') -DestinationPath $OutputZip -CompressionLevel Optimal
        Write-Host "Created: $OutputZip"
        Write-Host "Parts Catalog PNG SHA-256: $($sourceAssets['.png'].sha256)"
        if ($sourceAssets['.svg']) { Write-Host "Parts Catalog SVG SHA-256: $($sourceAssets['.svg'].sha256)" }
        Write-Host "Parsed callout circles: $($callouts.Count)"
        Write-Host "Parts rows: $($partRows.Count)"
    }
    finally { if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force } }
}
