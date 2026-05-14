param(
    [string[]]$Pages = @("index.html", "hood.html", "cabin.html", "maintenance.html", "garage.html"),
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [string]$OutputDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path "debug-screenshots"),
    [string]$Tag = ("audit-" + (Get-Date -Format "yyyyMMdd-HHmmss")),
    [string]$BrowserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $BrowserPath -PathType Leaf)) {
    throw "Microsoft Edge was not found at '$BrowserPath'. Pass -BrowserPath with a Chromium-compatible browser."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$viewports = @(
    [pscustomobject]@{ Name = "desktop"; Size = "1440,1100" },
    [pscustomobject]@{ Name = "mobile"; Size = "390,844" }
)

foreach ($page in $Pages) {
    $pagePath = Join-Path $Root $page
    if (-not (Test-Path -LiteralPath $pagePath -PathType Leaf)) {
        throw "Cannot capture missing page '$page'."
    }

    $pageSlug = [System.IO.Path]::GetFileNameWithoutExtension($page)
    $pageUri = [System.Uri]::new((Resolve-Path -LiteralPath $pagePath).Path).AbsoluteUri

    foreach ($viewport in $viewports) {
        $screenshotPath = Join-Path $OutputDir "$Tag-$($viewport.Name)-$pageSlug.png"
        $profilePath = Join-Path $env:TEMP ("ridgeline-edge-shot-" + [System.Guid]::NewGuid().ToString("N"))
        $stdoutPath = Join-Path $env:TEMP ("ridgeline-edge-shot-" + [System.Guid]::NewGuid().ToString("N") + ".out")
        $stderrPath = Join-Path $env:TEMP ("ridgeline-edge-shot-" + [System.Guid]::NewGuid().ToString("N") + ".err")
        $args = @(
            "--headless=new",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-background-networking",
            "--disable-component-update",
            "--disable-sync",
            "--metrics-recording-only",
            "--hide-scrollbars",
            "--disable-extensions",
            "--no-first-run",
            "--no-default-browser-check",
            "--allow-file-access-from-files",
            "--user-data-dir=$profilePath",
            "--window-size=$($viewport.Size)",
            "--virtual-time-budget=2500",
            "--screenshot=$screenshotPath",
            $pageUri
        )

        try {
            $process = Start-Process -FilePath $BrowserPath -ArgumentList $args -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
            if ($process.ExitCode -ne 0) {
                $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -Raw -LiteralPath $stderrPath } else { "" }
                throw "Screenshot capture failed for $page at $($viewport.Name) viewport with exit code $($process.ExitCode). $stderr"
            }
        }
        finally {
            Remove-Item -LiteralPath $profilePath -Recurse -Force -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath $stdoutPath -Force -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
        }

        if (-not (Test-Path -LiteralPath $screenshotPath -PathType Leaf)) {
            throw "Screenshot was not created: $screenshotPath"
        }

        Write-Host "Captured $screenshotPath"
    }
}
