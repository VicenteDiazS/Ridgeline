param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"

function Get-AttributeValues {
    param(
        [string]$Html,
        [string]$Attribute
    )

    $pattern = "(?i)\s$Attribute\s*=\s*(['""])(.*?)\1"
    [regex]::Matches($Html, $pattern) | ForEach-Object { $_.Groups[2].Value }
}

function Get-DocumentIds {
    param([string]$Html)

    $ids = New-Object "System.Collections.Generic.HashSet[string]"
    Get-AttributeValues -Html $Html -Attribute "id" | ForEach-Object { [void]$ids.Add($_) }
    Get-AttributeValues -Html $Html -Attribute "name" | ForEach-Object { [void]$ids.Add($_) }
    return $ids
}

function Convert-HrefToPathAndHash {
    param([string]$Href)

    $cleanHref = $Href.Trim()
    $hash = ""
    $path = $cleanHref

    $hashIndex = $cleanHref.IndexOf("#")
    if ($hashIndex -ge 0) {
        $path = $cleanHref.Substring(0, $hashIndex)
        $hash = $cleanHref.Substring($hashIndex + 1)
    }

    $queryIndex = $path.IndexOf("?")
    if ($queryIndex -ge 0) {
        $path = $path.Substring(0, $queryIndex)
    }

    [pscustomobject]@{
        Path = $path
        Hash = $hash
    }
}

$rootPath = (Resolve-Path $Root).Path
$htmlFiles = Get-ChildItem -Path $rootPath -Filter "*.html" -File
$documents = @{}
$errors = New-Object "System.Collections.Generic.List[string]"

foreach ($file in $htmlFiles) {
    $html = Get-Content -Raw -LiteralPath $file.FullName
    $documents[$file.Name.ToLowerInvariant()] = [pscustomobject]@{
        File = $file
        Html = $html
        Ids = Get-DocumentIds -Html $html
    }
}

foreach ($entry in $documents.GetEnumerator()) {
    $source = $entry.Value.File
    $sourceHtml = $entry.Value.Html
    $hrefs = Get-AttributeValues -Html $sourceHtml -Attribute "href"

    foreach ($href in $hrefs) {
        if ([string]::IsNullOrWhiteSpace($href)) {
            continue
        }

        if ($href -match "^(?i)(https?:|mailto:|tel:|sms:|javascript:|data:|blob:)" -or $href -eq "#") {
            continue
        }

        $parsed = Convert-HrefToPathAndHash -Href $href
        $targetPath = $parsed.Path
        if ([string]::IsNullOrWhiteSpace($targetPath)) {
            $targetName = $source.Name
        } else {
            $normalized = $targetPath -replace "\\", "/"
            if ($normalized.StartsWith("/")) {
                $normalized = $normalized.TrimStart("/")
            }
            if ($normalized.Contains("/")) {
                $candidate = Join-Path $rootPath $normalized
                if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
                    $errors.Add("$($source.Name): missing target file '$href'")
                    continue
                }
                $targetName = Split-Path -Leaf $candidate
            } else {
                $targetName = $normalized
            }
        }

        if (-not $targetName.EndsWith(".html", [System.StringComparison]::OrdinalIgnoreCase)) {
            continue
        }

        $targetKey = $targetName.ToLowerInvariant()
        if (-not $documents.ContainsKey($targetKey)) {
            $errors.Add("$($source.Name): missing target file '$href'")
            continue
        }

        if (-not [string]::IsNullOrWhiteSpace($parsed.Hash)) {
            $decodedHash = [System.Uri]::UnescapeDataString($parsed.Hash)
            if (-not $documents[$targetKey].Ids.Contains($decodedHash)) {
                $errors.Add("$($source.Name): missing anchor '#$decodedHash' in $targetName from '$href'")
            }
        }
    }
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "Internal link/anchor audit passed for $($documents.Count) HTML files."
