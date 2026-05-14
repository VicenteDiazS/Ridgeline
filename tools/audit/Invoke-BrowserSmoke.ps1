param(
    [string[]]$Pages = @("index.html", "hood.html", "cabin.html", "maintenance.html", "garage.html"),
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [string]$BrowserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $BrowserPath -PathType Leaf)) {
    throw "Microsoft Edge was not found at '$BrowserPath'. Pass -BrowserPath with a Chromium-compatible browser."
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("ridgeline-browser-smoke-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

try {
    foreach ($page in $Pages) {
        $pagePath = Join-Path $Root $page
        if (-not (Test-Path -LiteralPath $pagePath -PathType Leaf)) {
            throw "Cannot smoke-test missing page '$page'."
        }

        $pageUri = [System.Uri]::new((Resolve-Path -LiteralPath $pagePath).Path).AbsoluteUri
        $domPath = Join-Path $tempDir ([System.IO.Path]::GetFileNameWithoutExtension($page) + ".html")
        $errPath = Join-Path $tempDir ([System.IO.Path]::GetFileNameWithoutExtension($page) + ".err")
        $profilePath = Join-Path $tempDir ([System.IO.Path]::GetFileNameWithoutExtension($page) + "-profile")
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
            "--disable-extensions",
            "--no-first-run",
            "--no-default-browser-check",
            "--allow-file-access-from-files",
            "--user-data-dir=$profilePath",
            "--window-size=1280,900",
            "--virtual-time-budget=3500",
            "--dump-dom",
            $pageUri
        )

        $process = Start-Process -FilePath $BrowserPath -ArgumentList $args -NoNewWindow -Wait -PassThru -RedirectStandardOutput $domPath -RedirectStandardError $errPath
        if ($process.ExitCode -ne 0) {
            $stderr = Get-Content -Raw -LiteralPath $errPath
            throw "Browser smoke test failed for $page with exit code $($process.ExitCode). $stderr"
        }

        $dom = Get-Content -Raw -LiteralPath $domPath
        $checks = @(
            @{ Name = "main landmark"; Pattern = "(?is)<main[\s>]" },
            @{ Name = "site header"; Pattern = "topbar" },
            @{ Name = "site search control"; Pattern = "data-open-search" },
            @{ Name = "site menu control"; Pattern = "data-open-site-menu" },
            @{ Name = "page title"; Pattern = "(?is)<title>.+?</title>" }
        )

        foreach ($check in $checks) {
            if ($dom -notmatch $check.Pattern) {
                throw "$page is missing $($check.Name) after browser render."
            }
        }

        if ($dom -match "ERR_FILE_NOT_FOUND|This site can't be reached|404 Not Found") {
            throw "$page rendered a browser error page."
        }

        if ($page -ne "index.html" -and $dom -notmatch "subpage-intro") {
            throw "$page is missing the injected subpage support controls."
        }

        Write-Host "Browser smoke passed for $page"
    }
}
finally {
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
