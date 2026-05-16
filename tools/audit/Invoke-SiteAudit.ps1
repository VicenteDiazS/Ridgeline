param(
    [string[]]$Pages = @("index.html", "hood.html", "cabin.html", "maintenance.html", "garage.html", "quick-sheet.html"),
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [string]$BrowserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    [string]$Tag = ("audit-" + (Get-Date -Format "yyyyMMdd-HHmmss")),
    [switch]$SkipScreenshots,
    [switch]$SkipBrowserSmoke,
    [switch]$SkipGarageRestoreAudit
)

$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "Test-InternalLinks.ps1") -Root $Root

if (-not $SkipGarageRestoreAudit) {
    $garageRestoreArgs = @{
        Root = $Root
        BrowserPath = $BrowserPath
        Tag = $Tag
    }

    if ($SkipScreenshots) {
        $garageRestoreArgs.SkipScreenshots = $true
    }

    & (Join-Path $PSScriptRoot "Invoke-GarageRestoreAudit.ps1") @garageRestoreArgs
}

if (-not $SkipBrowserSmoke) {
    & (Join-Path $PSScriptRoot "Invoke-BrowserSmoke.ps1") -Pages $Pages -Root $Root -BrowserPath $BrowserPath
}

if (-not $SkipScreenshots) {
    & (Join-Path $PSScriptRoot "Capture-Screenshots.ps1") -Pages $Pages -Root $Root -Tag $Tag -BrowserPath $BrowserPath
}

Write-Host "Ridgeline site audit completed."
