param(
    [string[]]$Pages = @("index.html", "hood.html", "cabin.html", "maintenance.html", "garage.html"),
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [string]$BrowserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $BrowserPath -PathType Leaf)) {
    throw "Microsoft Edge was not found at '$BrowserPath'. Pass -BrowserPath with a Chromium-compatible browser."
}

function ConvertTo-JsString {
    param([string]$Value)

    $escaped = $Value.Replace("\", "\\").Replace("""", "\""").Replace("`r", "\r").Replace("`n", "\n")
    return """$escaped"""
}

function Join-ProcessArguments {
    param([string[]]$Arguments)

    ($Arguments | ForEach-Object {
        if ($_ -match '[\s"]') {
            '"' + ($_.Replace('"', '\"')) + '"'
        } else {
            $_
        }
    }) -join " "
}

function Invoke-EdgeDumpDom {
    param(
        [string]$BrowserPath,
        [string]$PageUri,
        [string]$OutputPath,
        [string]$ErrorPath,
        [string]$ProfilePath,
        [int]$VirtualTimeBudget = 3500
    )

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
        "--user-data-dir=$ProfilePath",
        "--window-size=1280,900",
        "--virtual-time-budget=$VirtualTimeBudget",
        "--dump-dom",
        $PageUri
    )

    $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = $BrowserPath
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.Arguments = Join-ProcessArguments $args

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $processInfo
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    Set-Content -LiteralPath $OutputPath -Value $stdout -Encoding UTF8
    Set-Content -LiteralPath $ErrorPath -Value $stderr -Encoding UTF8

    if ($process.ExitCode -ne 0) {
        throw "Browser render failed for $PageUri with exit code $($process.ExitCode). $stderr"
    }
}

function Invoke-InteractionSmoke {
    param(
        [string]$Page,
        [string]$PageUri,
        [string]$Root,
        [string]$BrowserPath,
        [string]$TempDir
    )

    $probeName = ".ridgeline-browser-probe-$([System.Guid]::NewGuid().ToString("N")).html"
    $probePath = Join-Path $Root $probeName
    $probeUri = [System.Uri]::new($probePath).AbsoluteUri
    $resultPath = Join-Path $TempDir ([System.IO.Path]::GetFileNameWithoutExtension($Page) + "-probe.html")
    $errPath = Join-Path $TempDir ([System.IO.Path]::GetFileNameWithoutExtension($Page) + "-probe.err")
    $profilePath = Join-Path $TempDir ([System.IO.Path]::GetFileNameWithoutExtension($Page) + "-probe-profile")

    $pageLiteral = ConvertTo-JsString $Page
    $uriLiteral = ConvertTo-JsString $PageUri
    $probeHtml = @"
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Ridgeline browser interaction probe</title></head>
<body>
<pre id="result">PENDING</pre>
<script>
(async () => {
  const pageName = $pageLiteral;
  const pageUri = $uriLiteral;
  const result = document.querySelector("#result");
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const assert = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };
  try {
    const frame = document.createElement("iframe");
    frame.style.width = "1280px";
    frame.style.height = "900px";
    const frameLoad = new Promise((resolve, reject) => {
      frame.addEventListener("load", resolve, { once: true });
      frame.addEventListener("error", () => reject(new Error("iframe failed to load")), { once: true });
      setTimeout(() => reject(new Error("iframe load timed out")), 5000);
    });
    frame.src = pageUri;
    document.body.appendChild(frame);
    await frameLoad;
    await sleep(1200);

    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    assert(doc, "cannot inspect rendered page");
    const pressEscape = () => {
      doc.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    };
    const getFocusable = (container) => [...container.querySelectorAll([
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(","))].filter((element) => {
      const style = win.getComputedStyle(element);
      return !element.hidden && !element.closest("[hidden]") && element.tabIndex >= 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    const pressTabFromActiveElement = (shiftKey = false) => {
      const target = doc.activeElement || doc;
      target.dispatchEvent(new win.KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
        shiftKey
      }));
    };
    const assertFocusTrap = (container, label) => {
      const focusable = getFocusable(container);
      assert(focusable.length >= 2, label + " needs at least two focusable controls for trap coverage");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      last.focus();
      pressTabFromActiveElement(false);
      assert(doc.activeElement === first, label + " Tab from last control did not wrap to first control");
      first.focus();
      pressTabFromActiveElement(true);
      assert(doc.activeElement === last, label + " Shift+Tab from first control did not wrap to last control");
    };
    const assertPageReady = () => {
      const main = doc.querySelector("main");
      assert(main, "missing main content after load");
      assert(main.textContent.trim().length > 250, "main content looks empty after load");
      const visibleSections = [...main.querySelectorAll("section, article")].filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = win.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });
      assert(visibleSections.length > 0, "no visible content sections after load");
      const brokenHashLinks = [...doc.querySelectorAll("a[href^='#']")]
        .filter((link) => link.hash && link.hash !== "#" && !doc.querySelector(link.hash))
        .map((link) => link.getAttribute("href"));
      assert(brokenHashLinks.length === 0, "broken in-page section links: " + brokenHashLinks.slice(0, 5).join(", "));
    };
    const assertScrollUnlocked = async (label) => {
      assert(!doc.body.classList.contains("modal-open"), label + " left body marked modal-open");
      const bodyOverflowY = win.getComputedStyle(doc.body).overflowY;
      const htmlOverflowY = win.getComputedStyle(doc.documentElement).overflowY;
      assert(bodyOverflowY !== "hidden" && htmlOverflowY !== "hidden", label + " left page scroll locked");
      const maxScroll = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight) - win.innerHeight;
      if (maxScroll > 120) {
        const scroller = doc.scrollingElement || doc.documentElement || doc.body;
        assert(scroller.scrollHeight - scroller.clientHeight > 120, label + " scroll range collapsed unexpectedly");
      }
    };

    assertPageReady();
    await assertScrollUnlocked("initial load");

    const searchButton = doc.querySelector("[data-open-search]");
    assert(searchButton, "missing search button");
    searchButton.focus();
    searchButton.click();
    await sleep(300);
    const searchModal = doc.querySelector(".search-modal");
    const searchInput = doc.querySelector("#site-search-input");
    assert(searchModal && searchModal.hidden === false, "search modal did not open");
    assert(searchInput, "missing search input");
    assert(doc.activeElement === searchInput, "search input did not receive focus");
    assertFocusTrap(searchModal, "search modal");
    searchInput.value = "fuse";
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(900);
    assert(doc.querySelector("#site-search-results").children.length > 0, "search returned no results for fuse");
    const setSearchQuery = async (query) => {
      searchInput.value = query;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(900);
      return doc.querySelector("#site-search-results").textContent || "";
    };
    assert((await setSearchQuery("power outlet")).includes("Power Outlet / 12V Socket Fuses"), "power outlet alias did not surface the fuse shortcut");
    assert((await setSearchQuery("trailer brake lights")).includes("Trailer Light Fuse Search"), "trailer brake lights alias did not surface the fuse shortcut");
    assert((await setSearchQuery("radio")).includes("Audio / Radio Fuse Search"), "radio alias did not surface the fuse shortcut");
    assert((await setSearchQuery("backup camera")).includes("Backup / Reverse Light Fuse Search"), "backup camera alias did not surface the fuse shortcut");
    assert((await setSearchQuery("outlet not working")).includes("Fuse Symptom Finder"), "outlet not working did not surface the fuse symptom finder");
    assert((await setSearchQuery("truck wont start")).includes("No-Start Workflow"), "truck wont start did not surface the no-start workflow");
    pressEscape();
    await sleep(150);
    assert(searchModal.hidden === true, "Escape did not close search modal");
    assert(doc.activeElement === searchButton, "search focus did not return to opener");
    await assertScrollUnlocked("search close");

    const menuButton = doc.querySelector("[data-open-site-menu]");
    assert(menuButton, "missing More menu button");
    menuButton.focus();
    menuButton.click();
    await sleep(300);
    const menu = doc.querySelector("#site-menu");
    assert(menu && menu.hidden === false, "site menu did not open");
    assert(doc.querySelectorAll(".site-menu-link").length >= 5, "site menu has too few links");
    assert(menu.contains(doc.activeElement), "site menu did not receive focus");
    assertFocusTrap(menu, "site menu");
    pressEscape();
    await sleep(150);
    assert(menu.hidden === true, "Escape did not close site menu");
    assert(doc.activeElement === menuButton, "site menu focus did not return to opener");
    await assertScrollUnlocked("site menu close");

    menuButton.focus();
    doc.dispatchEvent(new win.KeyboardEvent("keydown", { key: "K", ctrlKey: true, shiftKey: true, bubbles: true }));
    await sleep(250);
    const commandModal = doc.querySelector(".command-palette");
    const commandInput = doc.querySelector(".command-input");
    assert(commandModal && commandModal.hidden === false, "command palette did not open");
    assert(doc.activeElement === commandInput, "command palette input did not receive focus");
    assertFocusTrap(commandModal, "command palette");
    pressEscape();
    await sleep(150);
    assert(commandModal.hidden === true, "Escape did not close command palette");
    assert(doc.activeElement === menuButton, "command palette focus did not return to opener");
    await assertScrollUnlocked("command palette close");

    const quickButton = doc.querySelector(".quick-capture-fab");
    assert(quickButton, "missing quick capture button");
    quickButton.focus();
    quickButton.click();
    await sleep(250);
    const quickModal = doc.querySelector(".quick-capture-modal");
    const quickTitle = doc.querySelector(".quick-capture-modal input[name='title']");
    assert(quickModal && quickModal.hidden === false, "quick capture modal did not open");
    assert(doc.activeElement === quickTitle, "quick capture title input did not receive focus");
    assertFocusTrap(quickModal, "quick capture modal");
    pressEscape();
    await sleep(150);
    assert(quickModal.hidden === true, "Escape did not close quick capture modal");
    assert(doc.activeElement === quickButton, "quick capture focus did not return to opener");
    await assertScrollUnlocked("quick capture close");

    const syncButton = doc.querySelector("[data-page-action='sync-settings'], [data-context-action='sync-settings']");
    assert(syncButton, "missing sync settings opener");
    syncButton.focus();
    syncButton.click();
    await sleep(650);
    const syncModal = doc.querySelector(".sync-settings-modal");
    assert(syncModal && syncModal.hidden === false, "sync settings modal did not open");
    assert(syncModal.contains(doc.activeElement), "sync settings did not receive focus");
    assertFocusTrap(syncModal, "sync settings modal");
    pressEscape();
    await sleep(150);
    assert(syncModal.hidden === true, "Escape did not close sync settings modal");
    assert(doc.activeElement === syncButton, "sync settings focus did not return to opener");
    await assertScrollUnlocked("sync settings close");

    const sectionLink = [...doc.querySelectorAll(".section-utility-nav a[href^='#'], .topnav a[href^='#']")]
      .find((link) => link.hash && doc.querySelector(link.hash));
    assert(sectionLink, "missing usable in-page section link");
    const expectedHash = sectionLink.hash;
    sectionLink.click();
    await sleep(300);
    assert(win.location.hash === expectedHash, "section link did not update the hash");
    const sectionTarget = doc.querySelector(expectedHash);
    assert(sectionTarget && sectionTarget.getBoundingClientRect().height > 0, "section target is missing or collapsed after navigation");
    await assertScrollUnlocked("section navigation");

    result.textContent = "PASS " + pageName;
  } catch (error) {
    result.textContent = "FAIL " + pageName + ": " + error.message;
  }
})();
</script>
</body>
</html>
"@

    try {
        Set-Content -LiteralPath $probePath -Value $probeHtml -Encoding UTF8
        Invoke-EdgeDumpDom -BrowserPath $BrowserPath -PageUri $probeUri -OutputPath $resultPath -ErrorPath $errPath -ProfilePath $profilePath -VirtualTimeBudget 16000
        $probeDom = Get-Content -Raw -LiteralPath $resultPath
        if ($probeDom -notmatch "PASS\s+$([regex]::Escape($Page))") {
            $statusMatch = [regex]::Match($probeDom, "(?s)<pre id=""result"">(.*?)</pre>")
            $status = if ($statusMatch.Success) { [System.Net.WebUtility]::HtmlDecode($statusMatch.Groups[1].Value).Trim() } else { "No probe result was rendered." }
            throw "Interaction smoke failed for ${Page}: $status"
        }
    }
    finally {
        Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $profilePath -Recurse -Force -ErrorAction SilentlyContinue
    }
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
        Invoke-EdgeDumpDom -BrowserPath $BrowserPath -PageUri $pageUri -OutputPath $domPath -ErrorPath $errPath -ProfilePath $profilePath

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

        Invoke-InteractionSmoke -Page $page -PageUri $pageUri -Root $Root -BrowserPath $BrowserPath -TempDir $tempDir

        Write-Host "Browser smoke and interactions passed for $page"
    }
}
finally {
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
