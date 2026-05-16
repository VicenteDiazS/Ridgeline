param(
    [string[]]$Pages = @("index.html", "hood.html", "cabin.html", "maintenance.html", "garage.html", "quick-sheet.html"),
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
    const assertCurrentPageNavigation = () => {
      const currentMenuLink = doc.querySelector(".site-menu-link[aria-current='page']");
      assert(currentMenuLink, "site menu is missing a current-page link");
      assert(currentMenuLink.querySelector("em")?.textContent.includes("Current"), "site menu current-page link is missing its badge");

      const visibleCurrentLinks = [...doc.querySelectorAll(".topnav a.is-current-link, .route-strip a.is-current-link, .header-quick-nav a.is-current-link, .header-current-page.is-current-link, .header-nav-button.is-current-link, .mobile-nav-link.is-current-link, .context-action.is-current-link")]
        .filter((link) => {
          const style = win.getComputedStyle(link);
          const rect = link.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        });
      assert(visibleCurrentLinks.length > 0, "page has no visible current navigation indicator");
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
    const assertDiagnosticsWorkflowIndex = async () => {
      if (pageName !== "diagnostics.html") {
        return;
      }

      const workflowIndex = doc.querySelector("#workflow-index");
      assert(workflowIndex, "diagnostics page is missing workflow index");
      const workflowCards = [...workflowIndex.querySelectorAll(".workflow-index-card[href^='#']")];
      assert(workflowCards.length === 7, "workflow index should expose seven workflow cards");
      const trailerCard = workflowCards.find((card) => card.hash === "#trailer-light-workflow");
      assert(trailerCard, "workflow index is missing trailer-light workflow card");
      const warningCard = workflowCards.find((card) => card.hash === "#warning-light-workflow");
      assert(warningCard, "workflow index is missing warning-light workflow card");
      const warningTemplateLink = doc.querySelector('#warning-light-workflow a[href="garage.html#warning-light-template"]');
      assert(warningTemplateLink, "warning-light workflow is missing the garage note-template route");
      trailerCard.click();
      await sleep(700);
      assert(win.location.hash === "#trailer-light-workflow", "workflow index card did not update hash");
      const trailerTarget = doc.querySelector("#trailer-light-workflow");
      assert(trailerTarget && trailerTarget.getBoundingClientRect().height > 0, "workflow index target is missing or collapsed");
      await assertScrollUnlocked("workflow index navigation");
    };
    const assertQuickSheetFuseTriage = () => {
      if (pageName !== "quick-sheet.html") {
        return;
      }

      const triage = doc.querySelector("#fuse-triage");
      assert(triage, "quick sheet is missing fuse triage section");
      const triageCards = [...triage.querySelectorAll(".quick-sheet-triage-grid .dashboard-card")];
      assert(triageCards.length === 4, "fuse triage should expose four routing cards");
      const requiredTargets = [
        "diagnostics.html#accessory-power-workflow",
        "diagnostics.html#trailer-light-workflow",
        "diagnostics.html#audio-display-workflow",
        "cabin.html#cabin-fuse-glossary"
      ];
      requiredTargets.forEach((href) => {
        assert(triage.querySelector(`a[href="${href}"]`), "fuse triage is missing route " + href);
      });
      assert(doc.querySelector("[data-print-page]"), "quick sheet is missing print/save button");
      const sources = doc.querySelector("#source-confidence");
      assert(sources, "quick sheet is missing source confidence section");
      const sourceCards = [...sources.querySelectorAll(".quick-sheet-source-grid .dashboard-card")];
      assert(sourceCards.length === 4, "source confidence should expose four confidence cards");
      const sourceText = sources.textContent || "";
      ["door placard", "owner's manual", "accessory wheel instructions", "installed battery label"].forEach((phrase) => {
        assert(sourceText.includes(phrase), "source confidence is missing note: " + phrase);
      });
      const requiredSourceLinks = [
        "https://techinfo.honda.com/rjanisis/pubs/OM/AH/ATHR1919OM/enu/ATHR1919OM.PDF",
        "https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Engine-Chassis-Features/Towing-Capacity/",
        "https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Specifications/",
        "https://www.bernardiparts.com/Images/Install/2018_Ridgeline_18inchAluminumWheelTG7_AII06945-38.pdf"
      ];
      requiredSourceLinks.forEach((href) => {
        const link = sources.querySelector(`a[href="${href}"]`);
        assert(link, "source confidence is missing external link " + href);
        assert(link.target === "_blank", "source link should open in a new tab " + href);
        assert((link.rel || "").includes("noreferrer"), "source link should use noreferrer " + href);
      });
    };
    const assertGarageWarningLightTemplate = () => {
      if (pageName !== "garage.html") {
        return;
      }

      const dashboard = doc.querySelector("[data-garage-dashboard]");
      assert(dashboard, "garage page is missing the garage dashboard");
      const diagnosticCard = [...dashboard.querySelectorAll(".dashboard-card")]
        .find((card) => card.textContent.includes("Diagnostic Notes"));
      assert(diagnosticCard, "garage dashboard is missing the diagnostic notes card");
      assert(diagnosticCard.querySelector('a[href="#warning-light-template"]'), "diagnostic notes card is missing the warning-light note route");

      const template = doc.querySelector("#warning-light-template");
      assert(template, "garage page is missing warning-light note template");
      [
        "warning_light_date_mileage",
        "warning_light_indicator",
        "warning_light_behavior",
        "warning_light_context",
        "warning_light_mid_message",
        "warning_light_next_action"
      ].forEach((name) => {
        assert(template.querySelector(`[name="${name}"]`), "warning-light template is missing field " + name);
      });
      assert(template.querySelector('a[href="diagnostics.html#warning-light-workflow"]'), "warning-light template is missing diagnostics route");
    };

    assertPageReady();
    assertCurrentPageNavigation();
    await assertScrollUnlocked("initial load");
    await assertDiagnosticsWorkflowIndex();
    assertQuickSheetFuseTriage();
    assertGarageWarningLightTemplate();

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
    assert((await setSearchQuery("accessory socket not working")).includes("Accessory Power Issue Flow"), "accessory socket not working did not surface the accessory power workflow");
    assert((await setSearchQuery("radio not working")).includes("Audio Display Issue Flow"), "radio not working did not surface the audio display workflow");
    assert((await setSearchQuery("truck wont start")).includes("No-Start Workflow"), "truck wont start did not surface the no-start workflow");
    assert((await setSearchQuery("trailer lights not working")).includes("Trailer-Light Issue Flow"), "trailer lights not working did not surface the trailer-light workflow");
    assert((await setSearchQuery("warning light")).includes("Warning Light Triage"), "warning light did not surface the warning-light workflow");
    assert((await setSearchQuery("warning light note")).includes("Warning Light Note Template"), "warning light note did not surface the garage note template");
    assert((await setSearchQuery("workflow index")).includes("Diagnostics Workflow Index"), "workflow index did not surface the diagnostics workflow index");
    assert((await setSearchQuery("fuse quick sheet")).includes("Fuse Triage Quick Sheet"), "fuse quick sheet did not surface the quick-sheet triage entry");
    assert((await setSearchQuery("quick sheet sources")).includes("Quick Sheet Source Confidence"), "quick sheet sources did not surface the source confidence entry");
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
