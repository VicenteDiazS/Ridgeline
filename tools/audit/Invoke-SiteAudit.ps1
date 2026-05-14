param(
    [string[]]$Pages = @("index.html", "hood.html", "cabin.html", "maintenance.html", "garage.html"),
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [string]$Tag = ("audit-" + (Get-Date -Format "yyyyMMdd-HHmmss")),
    [switch]$SkipScreenshots
)

$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "Test-InternalLinks.ps1") -Root $Root
& (Join-Path $PSScriptRoot "Invoke-BrowserSmoke.ps1") -Pages $Pages -Root $Root

if (-not $SkipScreenshots) {
    & (Join-Path $PSScriptRoot "Capture-Screenshots.ps1") -Pages $Pages -Root $Root -Tag $Tag
}

Write-Host "Ridgeline site audit completed."
