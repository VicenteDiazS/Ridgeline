param(
    [string[]]$Pages = @("index.html", "hood.html", "cabin.html", "maintenance.html", "garage.html", "quick-sheet.html"),
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [string]$BrowserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $BrowserPath -PathType Leaf)) {
    throw "Chromium-compatible browser was not found at '$BrowserPath'. Pass -BrowserPath."
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    throw "Python was not found. Install Python with Playwright or pass through an environment where python is available."
}

$scriptPath = Join-Path ([System.IO.Path]::GetTempPath()) ("ridgeline-browser-smoke-" + [System.Guid]::NewGuid().ToString("N") + ".py")
$pythonScript = @'
import argparse
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright


SEARCH_EXPECTATIONS = {
    "power outlet": "Power Outlet / 12V Socket Fuses",
    "trailer brake lights": "Trailer Light Fuse Search",
    "radio": "Audio / Radio Fuse Search",
    "backup camera": "Backup / Reverse Light Fuse Search",
    "outlet not working": "Fuse Symptom Finder",
    "accessory socket not working": "Accessory Power Issue Flow",
    "radio not working": "Audio Display Issue Flow",
    "truck wont start": "No-Start Workflow",
    "trailer lights not working": "Trailer-Light Issue Flow",
    "warning light": "Warning Light Triage",
    "warning light note": "Warning Light Note Template",
    "recent diagnostic activity": "Recent Diagnostic Activity",
    "diagnostic activity json": "Recent Diagnostic Activity",
    "restore garage backup": "Recent Diagnostic Activity",
    "trailer hookup": "Trailer Hookup Flow",
    "tow day readiness": "Tow Day Readiness",
    "tow prep": "Tow Day Readiness",
    "engine service jumpstart": "Engine Service Jumpstart",
    "engine part picker": "Engine Service Jumpstart",
    "photo capture plan": "Photo Capture Plan",
    "truck photo checklist": "Photo Capture Plan",
    "workflow index": "Diagnostics Workflow Index",
    "first minute triage": "First Minute Diagnostic Triage",
    "diagnostic first minute": "First Minute Diagnostic Triage",
    "offline pack": "Offline Launch Pad",
    "refresh offline pack": "Offline Launch Pad",
    "signal loss prep": "Signal-Loss Prep",
    "before signal drops": "Signal-Loss Prep",
    "service run launcher": "Service Run Launcher",
    "service prep": "Service Prep Planner",
    "minder planner": "Maintenance Minder Pocket Planner",
    "save and stage": "Service Prep Planner",
    "parts staging list": "Saved Maintenance Notes",
    "counter mode": "Saved Maintenance Notes",
    "counter mode done": "Saved Maintenance Notes",
    "copy staged list": "Saved Maintenance Notes",
    "share staged list": "Saved Maintenance Notes",
    "draft staged parts": "Saved Maintenance Notes",
    "use staged list": "Saved Maintenance Notes",
    "skip counter item": "Saved Maintenance Notes",
    "undo counter mode": "Saved Maintenance Notes",
    "one-off store item": "Saved Maintenance Notes",
    "quick add store item": "Saved Maintenance Notes",
    "quick kit": "Saved Maintenance Notes",
    "need to buy": "Saved Maintenance Notes",
    "save buy note": "Saved Maintenance Notes",
    "saved maintenance notes": "Saved Maintenance Notes",
    "roadside router": "Roadside Router",
    "critical strip": "Quick Sheet Critical Strip",
    "quick sheet critical": "Quick Sheet Critical Strip",
    "quick sheet print pack": "Quick Sheet Print Pack",
    "print offline pack": "Quick Sheet Print Pack",
    "roadside action stack": "Roadside Action Stack",
    "tire roadside launcher": "Tire Roadside Launcher",
    "flat tire launcher": "Tire Roadside Launcher",
    "fuse quick sheet": "Fuse Triage Quick Sheet",
    "fuse quick finder": "Hood Fuse Quick Finder",
    "cabin fuse quick finder": "Cabin Fuse Quick Finder",
    "hood fuse quick finder": "Hood Fuse Quick Finder",
    "cargo load planner": "Cargo Load Planner",
    "bed load planner": "Cargo Load Planner",
    "quick sheet sources": "Quick Sheet Source Confidence",
    "anton status": "Anton Latest Impact",
    "anton owner check": "Anton Owner Check",
    "capture clues": "Diagnostic Clue Capture",
}


def assert_true(condition, message):
    if not condition:
        raise AssertionError(message)


async def assert_page_ready(page, page_name):
    await page.wait_for_selector("main", state="attached", timeout=7000)
    state = await page.evaluate(
        """(pageName) => {
            const main = document.querySelector("main");
            const visibleSections = main ? [...main.querySelectorAll("section, article")].filter((element) => {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
            }).length : 0;
            const brokenHashLinks = [...document.querySelectorAll("a[href^='#']")]
                .filter((link) => link.hash && link.hash !== "#" && !document.querySelector(link.hash))
                .map((link) => link.getAttribute("href"));
            const errorText = document.body?.innerText || "";
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasMain: Boolean(main),
                mainLength: main ? main.innerText.trim().length : 0,
                title: document.title || "",
                hasTopbar: Boolean(document.querySelector(".topbar")),
                hasSearch: Boolean(document.querySelector("[data-open-search]")),
                hasMenu: Boolean(document.querySelector("[data-open-site-menu]")),
                hasSubpageIntro: Boolean(document.querySelector(".subpage-intro-tool")),
                visibleSections,
                brokenHashLinks,
                renderedError: /ERR_FILE_NOT_FOUND|This site can't be reached|404 Not Found/.test(errorText),
                overflow: width > document.documentElement.clientWidth + 1,
                pageName
            };
        }""",
        page_name,
    )
    assert_true(state["hasMain"], f"{page_name} is missing main content after browser render")
    assert_true(state["mainLength"] > 250, f"{page_name} main content looks empty after browser render")
    assert_true(state["title"], f"{page_name} is missing page title after browser render")
    assert_true(state["hasTopbar"], f"{page_name} is missing site header after browser render")
    assert_true(state["hasSearch"], f"{page_name} is missing site search control after browser render")
    assert_true(state["hasMenu"], f"{page_name} is missing site menu control after browser render")
    assert_true(state["visibleSections"] > 0, f"{page_name} has no visible content sections after load")
    assert_true(not state["brokenHashLinks"], f"{page_name} has broken in-page section links: {state['brokenHashLinks'][:5]}")
    assert_true(not state["renderedError"], f"{page_name} rendered a browser error page")
    assert_true(not state["overflow"], f"{page_name} has horizontal overflow after browser render")
    if page_name != "index.html":
        assert_true(state["hasSubpageIntro"], f"{page_name} is missing the injected subpage support controls")


async def assert_current_page_navigation(page, page_name):
    state = await page.evaluate(
        """() => {
            const currentMenuLink = document.querySelector(".site-menu-link[aria-current='page']");
            const visibleCurrentLinks = [...document.querySelectorAll(".topnav a.is-current-link, .route-strip a.is-current-link, .header-quick-nav a.is-current-link, .header-current-page.is-current-link, .header-nav-button.is-current-link, .mobile-nav-link.is-current-link, .context-action.is-current-link")]
                .filter((link) => {
                    const style = getComputedStyle(link);
                    const rect = link.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
                });
            return {
                hasCurrentMenuLink: Boolean(currentMenuLink),
                hasCurrentBadge: Boolean(currentMenuLink?.querySelector("em")?.textContent.includes("Current")),
                visibleCurrentLinks: visibleCurrentLinks.length
            };
        }"""
    )
    assert_true(state["hasCurrentMenuLink"], f"{page_name} site menu is missing a current-page link")
    assert_true(state["hasCurrentBadge"], f"{page_name} site menu current-page link is missing its badge")
    assert_true(state["visibleCurrentLinks"] > 0, f"{page_name} has no visible current navigation indicator")


async def assert_support_status_badges(page, page_name):
    state = await page.evaluate(
        """() => {
            const badges = document.querySelector(".sync-status-badges");
            return {
                hasBadges: Boolean(badges),
                aria: badges?.getAttribute("aria-label") || "",
                text: badges?.innerText || "",
                hasNetwork: Boolean(badges?.querySelector("[data-sync-network]")),
                hasOfflinePack: Boolean(badges?.querySelector("[data-sync-offline-pack]")),
                hasLocalMessage: Boolean(badges?.querySelector("[data-sync-local-message]"))
            };
        }"""
    )
    assert_true(state["hasBadges"], f"{page_name} is missing the shared save/offline status strip")
    assert_true("offline" in state["aria"].lower(), f"{page_name} status strip should identify offline status")
    assert_true(state["hasNetwork"], f"{page_name} status strip is missing live network state")
    assert_true(state["hasOfflinePack"], f"{page_name} status strip is missing offline pack state")
    assert_true(state["hasLocalMessage"], f"{page_name} status strip is missing local save message")
    assert_true("Offline pack" in state["text"], f"{page_name} status strip should show the offline pack label")
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    mobile_state = await page.evaluate(
        """() => {
            const badges = document.querySelector(".sync-status-badges");
            const rect = badges?.getBoundingClientRect();
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(rect && rect.width > 0 && rect.height > 0),
                badgeHeight: rect?.height || 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], f"{page_name} status strip is not visible at iPhone width")
    assert_true(mobile_state["badgeHeight"] <= 58, f"{page_name} status strip became too tall at iPhone width")
    assert_true(not mobile_state["overflow"], f"{page_name} status strip introduced horizontal page overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_home_anton_status(page, page_name):
    if page_name != "index.html":
        return

    await page.wait_for_selector("[data-agent-home-card]", state="attached", timeout=7000)
    await page.wait_for_timeout(400)
    state = await page.evaluate(
        """() => {
            const card = document.querySelector("[data-agent-home-card]");
            const title = card?.querySelector("[data-agent-home-title]");
            const detail = card?.querySelector("[data-agent-home-detail]");
            const rect = card?.getBoundingClientRect();
            return {
                hasCard: Boolean(card),
                title: title?.textContent?.trim() || "",
                detail: detail?.textContent?.trim() || "",
                health: card?.dataset.agentHealth || "",
                aria: card?.getAttribute("aria-label") || "",
                visible: Boolean(rect && rect.width > 0 && rect.height > 0)
            };
        }"""
    )
    assert_true(state["hasCard"], "home page is missing the Anton latest-impact card")
    assert_true(state["visible"], "home Anton latest-impact card is not visible")
    assert_true(state["title"] and state["title"] != "Checking status...", "home Anton card did not render the latest status title")
    assert_true(state["detail"] and ("Impact" in state["detail"] or "running" in state["detail"].lower() or "Loop" in state["detail"]), "home Anton card did not render impact or loop detail")
    assert_true(state["health"], "home Anton card did not expose loop health")
    assert_true("Anton status:" in state["aria"], "home Anton card aria-label does not describe the status")
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    mobile_state = await page.evaluate(
        """() => {
            const card = document.querySelector("[data-agent-home-card]");
            const rect = card?.getBoundingClientRect();
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(rect && rect.width > 0 && rect.height > 0),
                height: rect?.height || 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "home Anton card is not visible at iPhone width")
    assert_true(mobile_state["height"] <= 84, "home Anton card became too tall at iPhone width")
    assert_true(not mobile_state["overflow"], "home Anton card introduced horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_anton_owner_check(page, page_name):
    if page_name != "anton.html":
        return

    await page.wait_for_selector(".anton-owner-check", state="attached", timeout=7000)
    await page.wait_for_timeout(500)
    state = await page.evaluate(
        """() => {
            const panel = document.querySelector(".anton-owner-check");
            const cards = [...panel?.querySelectorAll("article") || []];
            const link = panel?.querySelector("[data-anton-owner-check-link]");
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasPanel: Boolean(panel),
                cardCount: cards.length,
                text: (panel?.innerText || "").toLowerCase(),
                linkHref: link?.getAttribute("href") || "",
                linkText: link?.textContent?.trim() || "",
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(state["hasPanel"], "Anton page is missing the owner check strip")
    assert_true(state["cardCount"] == 3, "Anton owner check should have three action cards")
    assert_true("owner check" in state["text"], "Anton owner check is missing the owner-check label")
    assert_true("needs you?" in state["text"], "Anton owner check is missing the action-needed card")
    assert_true("next check" in state["text"], "Anton owner check is missing the next-check card")
    assert_true(state["linkHref"].endswith(".html"), "Anton owner check link should route to a page")
    assert_true(state["linkText"].startswith("Open"), "Anton owner check link should be a clear open action")
    assert_true(not state["overflow"], "Anton owner check introduced desktop horizontal overflow")

    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    mobile_state = await page.evaluate(
        """() => {
            const panel = document.querySelector(".anton-owner-check");
            const cards = [...panel?.querySelectorAll("article") || []];
            const link = panel?.querySelector("[data-anton-owner-check-link]");
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(panel && panel.getBoundingClientRect().height > 0),
                columns: cards.map((card) => Math.round(card.getBoundingClientRect().width)),
                linkHeight: Math.round(link?.getBoundingClientRect().height || 0),
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "Anton owner check is not visible at iPhone width")
    assert_true(all(width >= 340 for width in mobile_state["columns"]), "Anton owner check cards should stack at iPhone width")
    assert_true(mobile_state["linkHeight"] >= 38, "Anton owner check action is too small for touch")
    assert_true(not mobile_state["overflow"], "Anton owner check introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_scroll_unlocked(page, label):
    state = await page.evaluate(
        """() => {
            const maxScroll = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
            const scroller = document.scrollingElement || document.documentElement || document.body;
            return {
                bodyModalOpen: document.body.classList.contains("modal-open"),
                bodyOverflowY: getComputedStyle(document.body).overflowY,
                htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
                maxScroll,
                scrollRange: scroller.scrollHeight - scroller.clientHeight
            };
        }"""
    )
    assert_true(not state["bodyModalOpen"], f"{label} left body marked modal-open")
    assert_true(state["bodyOverflowY"] != "hidden" and state["htmlOverflowY"] != "hidden", f"{label} left page scroll locked")
    if state["maxScroll"] > 120:
        assert_true(state["scrollRange"] > 120, f"{label} scroll range collapsed unexpectedly")


async def assert_focus_trap(page, selector, label):
    state = await page.evaluate(
        """({ selector, label }) => {
            const container = document.querySelector(selector);
            if (!container) {
                throw new Error(label + " container missing");
            }
            const getFocusable = (root) => [...root.querySelectorAll([
                "a[href]",
                "button:not([disabled])",
                "input:not([disabled])",
                "select:not([disabled])",
                "textarea:not([disabled])",
                "[tabindex]:not([tabindex='-1'])"
            ].join(","))].filter((element) => {
                const style = getComputedStyle(element);
                return !element.hidden && !element.closest("[hidden]") && element.tabIndex >= 0 && style.display !== "none" && style.visibility !== "hidden";
            });
            const pressTabFromActiveElement = (shiftKey = false) => {
                const target = document.activeElement || document;
                target.dispatchEvent(new KeyboardEvent("keydown", {
                    key: "Tab",
                    bubbles: true,
                    cancelable: true,
                    shiftKey
                }));
            };
            const focusable = getFocusable(container);
            if (focusable.length < 2) {
                throw new Error(label + " needs at least two focusable controls for trap coverage");
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            last.focus();
            pressTabFromActiveElement(false);
            const tabWrapped = document.activeElement === first;
            first.focus();
            pressTabFromActiveElement(true);
            const shiftWrapped = document.activeElement === last;
            return { tabWrapped, shiftWrapped };
        }""",
        {"selector": selector, "label": label},
    )
    assert_true(state["tabWrapped"], f"{label} Tab from last control did not wrap to first control")
    assert_true(state["shiftWrapped"], f"{label} Shift+Tab from first control did not wrap to last control")


async def assert_diagnostics_workflow_index(page, page_name):
    if page_name != "diagnostics.html":
        return
    state = await page.evaluate(
        """() => {
            const firstMinute = document.querySelector("#first-minute-triage");
            const workflowIndex = document.querySelector("#workflow-index");
            const handoff = document.querySelector("#diagnostic-handoff");
            const firstMinuteCards = firstMinute ? [...firstMinute.querySelectorAll(".diagnostic-first-minute-card")] : [];
            const requiredFirstMinuteTargets = [
                "#no-start-workflow",
                "quick-sheet.html#roadside-action-stack",
                "#warning-light-workflow",
                "garage.html#warning-light-template",
                "#fuse-symptom-finder",
                "cabin.html#cabin-fuse-glossary",
                "#trailer-light-workflow",
                "rear-hitch.html#trailer-hookup-flow"
            ];
            const workflowCards = workflowIndex ? [...workflowIndex.querySelectorAll(".workflow-index-card[href^='#']")] : [];
            const requiredHandoffTargets = [
                "garage.html#warning-light-template",
                "quick-sheet.html#roadside-router",
                "garage.html#notes",
                "garage.html#diagnostic-activity",
                "#quick-checks"
            ];
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasFirstMinute: Boolean(firstMinute),
                firstMinuteCards: firstMinuteCards.length,
                firstMinuteText: firstMinute ? firstMinute.innerText : "",
                firstMinuteRouteMissing: requiredFirstMinuteTargets.filter((href) => !firstMinute?.querySelector(`a[href="${href}"]`)),
                hasWorkflowIndex: Boolean(workflowIndex),
                cardCount: workflowCards.length,
                hasTrailerCard: workflowCards.some((card) => card.hash === "#trailer-light-workflow"),
                hasWarningCard: workflowCards.some((card) => card.hash === "#warning-light-workflow"),
                hasWarningTemplateRoute: Boolean(document.querySelector('#warning-light-workflow a[href="garage.html#warning-light-template"]')),
                hasHandoff: Boolean(handoff),
                handoffCards: handoff ? handoff.querySelectorAll(".diagnostic-handoff-card").length : 0,
                handoffText: handoff ? handoff.innerText : "",
                missingHandoffTargets: requiredHandoffTargets.filter((href) => !handoff?.querySelector(`a[href="${href}"]`)),
                overflow: width > window.innerWidth + 1
            };
        }"""
    )
    assert_true(state["hasFirstMinute"], "diagnostics page is missing first-minute triage")
    assert_true(state["firstMinuteCards"] == 4, "first-minute triage should expose four situation cards")
    assert_true(not state["firstMinuteRouteMissing"], f"first-minute triage is missing routes: {state['firstMinuteRouteMissing']}")
    first_minute_text = state["firstMinuteText"].lower()
    for phrase in ["no start", "warning light", "dead electrical", "trailer lights"]:
        assert_true(phrase in first_minute_text, f"first-minute triage is missing {phrase}")
    assert_true(state["hasWorkflowIndex"], "diagnostics page is missing workflow index")
    assert_true(state["cardCount"] == 7, "workflow index should expose seven workflow cards")
    assert_true(state["hasTrailerCard"], "workflow index is missing trailer-light workflow card")
    assert_true(state["hasWarningCard"], "workflow index is missing warning-light workflow card")
    assert_true(state["hasWarningTemplateRoute"], "warning-light workflow is missing the garage note-template route")
    assert_true(state["hasHandoff"], "diagnostics page is missing clue-capture handoff panel")
    assert_true(state["handoffCards"] == 4, "diagnostic handoff should expose four capture cards")
    assert_true(not state["missingHandoffTargets"], f"diagnostic handoff is missing routes: {state['missingHandoffTargets']}")
    for phrase in ["Save Warning Note", "Roadside Router", "Garage Notes", "Recent Activity"]:
        assert_true(phrase in state["handoffText"], f"diagnostic handoff is missing {phrase}")
    assert_true(not state["overflow"], "diagnostics handoff introduced horizontal overflow")
    await page.set_viewport_size({"width": 430, "height": 932})
    await page.wait_for_timeout(350)
    mobile_state = await page.evaluate(
        """() => {
            const triage = document.querySelector("#first-minute-triage");
            const grid = triage?.querySelector(".diagnostic-first-minute-grid");
            const firstActions = triage?.querySelector(".diagnostic-first-minute-card .inspector-actions");
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(triage && triage.getBoundingClientRect().height > 0),
                columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                actionRows: firstActions
                    ? new Set([...firstActions.querySelectorAll(".utility-link")].map((link) => Math.round(link.getBoundingClientRect().top))).size
                    : 0,
                overflow: width > window.innerWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "first-minute triage is not visible at iPhone width")
    assert_true(mobile_state["columns"] == 2, "first-minute triage should use two compact columns at iPhone width")
    assert_true(mobile_state["actionRows"] == 1, "first-minute triage actions should stay on one row at iPhone width")
    assert_true(not mobile_state["overflow"], "first-minute triage introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(350)
    await page.evaluate("""() => document.querySelector('#workflow-index .workflow-index-card[href="#trailer-light-workflow"]').click()""")
    await page.wait_for_timeout(800)
    nav_state = await page.evaluate(
        """() => {
            const target = document.querySelector("#trailer-light-workflow");
            return {
                hash: window.location.hash,
                targetHeight: target ? target.getBoundingClientRect().height : 0
            };
        }"""
    )
    assert_true(nav_state["hash"] == "#trailer-light-workflow", "workflow index card did not update hash")
    assert_true(nav_state["targetHeight"] > 0, "workflow index target is missing or collapsed")
    await assert_scroll_unlocked(page, "workflow index navigation")


async def assert_quick_sheet(page, page_name):
    if page_name != "quick-sheet.html":
        return
    state = await page.evaluate(
        """() => {
            const router = document.querySelector("#roadside-router");
            const printPack = document.querySelector("#print-offline-pack");
            const critical = document.querySelector("#critical-strip");
            const stack = document.querySelector("#roadside-action-stack");
            const triage = document.querySelector("#fuse-triage");
            const sources = document.querySelector("#source-confidence");
            const requiredCriticalTargets = [
                "#tires",
                "hood.html#wiring",
                "#fuse-triage",
                "#towing",
                "garage.html#warning-light-template"
            ];
            const requiredRouterTargets = [
                "#tires",
                "index.html?system=jack-points#viewer",
                "diagnostics.html#no-start-workflow",
                "diagnostics.html#warning-light-workflow",
                "garage.html#warning-light-template",
                "diagnostics.html#trailer-light-workflow"
            ];
            const requiredTargets = [
                "diagnostics.html#accessory-power-workflow",
                "diagnostics.html#trailer-light-workflow",
                "diagnostics.html#audio-display-workflow",
                "cabin.html#cabin-fuse-glossary"
            ];
            const requiredSourceLinks = [
                "https://techinfo.honda.com/rjanisis/pubs/OM/AH/ATHR1919OM/enu/ATHR1919OM.PDF",
                "https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Engine-Chassis-Features/Towing-Capacity/",
                "https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Specifications/",
                "https://www.bernardiparts.com/Images/Install/2018_Ridgeline_18inchAluminumWheelTG7_AII06945-38.pdf"
            ];
            const requiredPrintPackTargets = [
                "#emergency-card",
                "diagnostics.html#workflow-index",
                "garage.html#diagnostic-activity",
                "garage.html#notes",
                "#source-confidence"
            ];
            return {
                hasPrintPack: Boolean(printPack),
                printPackCards: printPack ? printPack.querySelectorAll(".quick-print-pack-grid .dashboard-card").length : 0,
                printPackText: printPack ? printPack.innerText.toLowerCase() : "",
                hasPrintPackRefresh: Boolean(printPack?.querySelector("[data-refresh-quick-pack]")),
                hasPrintPackCopy: Boolean(printPack?.querySelector("[data-copy-print-pack]")),
                hasPrintPackShare: Boolean(printPack?.querySelector("[data-share-print-pack]")),
                hasPrintPackOfflineStatus: Boolean(printPack?.querySelector("[data-quick-offline-status]")),
                missingPrintPackTargets: requiredPrintPackTargets.filter((href) => !printPack?.querySelector(`a[href="${href}"]`)),
                hasCritical: Boolean(critical),
                criticalCards: critical ? critical.querySelectorAll(".quick-critical-card").length : 0,
                criticalText: critical ? critical.innerText.toLowerCase() : "",
                missingCriticalTargets: requiredCriticalTargets.filter((href) => !critical?.querySelector(`a[href="${href}"]`)),
                hasRouter: Boolean(router),
                routerCards: router ? router.querySelectorAll(".roadside-action-grid .dashboard-card").length : 0,
                routerText: router ? router.innerText.toLowerCase() : "",
                missingRouterTargets: requiredRouterTargets.filter((href) => !router?.querySelector(`a[href="${href}"]`)),
                hasStack: Boolean(stack),
                stackButtons: stack ? stack.querySelectorAll("[data-roadside-plan]").length : 0,
                stackText: stack ? stack.innerText.toLowerCase() : "",
                stackPrimary: stack?.querySelector("[data-roadside-primary]")?.getAttribute("href") || "",
                stackSecondary: stack?.querySelector("[data-roadside-secondary]")?.getAttribute("href") || "",
                hasStackCopy: Boolean(stack?.querySelector("[data-copy-roadside-stack]")),
                hasStackShare: Boolean(stack?.querySelector("[data-share-roadside-stack]")),
                hasTriage: Boolean(triage),
                triageCards: triage ? triage.querySelectorAll(".quick-sheet-triage-grid .dashboard-card").length : 0,
                missingTargets: requiredTargets.filter((href) => !triage?.querySelector(`a[href="${href}"]`)),
                hasPrint: Boolean(document.querySelector("[data-print-page]")),
                hasSources: Boolean(sources),
                sourceCards: sources ? sources.querySelectorAll(".quick-sheet-source-grid .dashboard-card").length : 0,
                sourceText: sources ? sources.innerText : "",
                sourceLinks: requiredSourceLinks.map((href) => {
                    const link = sources?.querySelector(`a[href="${href}"]`);
                    return {
                        href,
                        found: Boolean(link),
                        target: link?.target || "",
                        rel: link?.rel || ""
                    };
                })
            };
        }"""
    )
    assert_true(state["hasPrintPack"], "quick sheet is missing the print/offline pack")
    assert_true(state["printPackCards"] == 4, "print/offline pack should expose four prep cards")
    assert_true(not state["missingPrintPackTargets"], f"print/offline pack is missing routes: {state['missingPrintPackTargets']}")
    assert_true(state["hasPrintPackRefresh"], "print/offline pack is missing refresh-pack control")
    assert_true(state["hasPrintPackCopy"], "print/offline pack is missing copy-prep control")
    assert_true(state["hasPrintPackShare"], "print/offline pack is missing share control")
    assert_true(state["hasPrintPackOfflineStatus"], "print/offline pack is missing live offline status")
    for phrase in ["print the emergency sheet", "offline pack", "garage backup", "source authority", "truck labels"]:
        assert_true(phrase in state["printPackText"], f"print/offline pack is missing text: {phrase}")
    assert_true(state["hasCritical"], "quick sheet is missing the critical strip")
    assert_true(state["criticalCards"] == 6, "quick sheet critical strip should expose six compact references")
    assert_true(not state["missingCriticalTargets"], f"critical strip is missing routes: {state['missingCriticalTargets']}")
    for phrase in ["35 psi", "94 lb-ft", "jump path", "symptom first", "3,500 / 5,000 lb", "save exact text"]:
        assert_true(phrase in state["criticalText"], f"critical strip is missing text: {phrase}")
    assert_true(state["hasRouter"], "quick sheet is missing roadside router section")
    assert_true(state["routerCards"] == 4, "roadside router should expose four situation cards")
    assert_true(not state["missingRouterTargets"], f"roadside router is missing routes: {state['missingRouterTargets']}")
    for phrase in ["flat tire", "won't start", "warning light", "trailer light"]:
        assert_true(phrase in state["routerText"], f"roadside router is missing situation: {phrase}")
    assert_true(state["hasStack"], "quick sheet is missing roadside action stack")
    assert_true(state["stackButtons"] == 4, "roadside action stack should expose four situation buttons")
    assert_true(state["stackPrimary"] == "#tires", "roadside action stack should default to tire card")
    assert_true(state["stackSecondary"] == "index.html?system=jack-points#viewer", "roadside action stack should default to jack map")
    assert_true(state["hasStackCopy"], "roadside action stack is missing copy control")
    assert_true(state["hasStackShare"], "roadside action stack is missing share control")
    for phrase in ["flat tire", "94 lb-ft", "copy handoff"]:
        assert_true(phrase in state["stackText"], f"roadside action stack is missing default text: {phrase}")
    await page.evaluate("""() => document.querySelector('[data-roadside-plan="warning"]').click()""")
    warning_state = await page.evaluate(
        """() => {
            const stack = document.querySelector("#roadside-action-stack");
            return {
                text: stack?.innerText.toLowerCase() || "",
                primary: stack?.querySelector("[data-roadside-primary]")?.getAttribute("href") || "",
                secondary: stack?.querySelector("[data-roadside-secondary]")?.getAttribute("href") || "",
                pressed: stack?.querySelector('[data-roadside-plan="warning"]')?.getAttribute("aria-pressed") || "",
                overflow: document.documentElement.scrollWidth > window.innerWidth + 1
            };
        }"""
    )
    assert_true(warning_state["primary"] == "diagnostics.html#warning-light-workflow", "warning stack should route to warning flow")
    assert_true(warning_state["secondary"] == "garage.html#warning-light-template", "warning stack should route to garage warning note")
    assert_true(warning_state["pressed"] == "true", "warning stack button should expose pressed state")
    for phrase in ["warning light", "record exact wording", "save the structured note"]:
        assert_true(phrase in warning_state["text"], f"warning stack is missing text: {phrase}")
    assert_true(not warning_state["overflow"], "roadside action stack introduced horizontal overflow")
    assert_true(state["hasTriage"], "quick sheet is missing fuse triage section")
    assert_true(state["triageCards"] == 4, "fuse triage should expose four routing cards")
    assert_true(not state["missingTargets"], f"fuse triage is missing routes: {state['missingTargets']}")
    assert_true(state["hasPrint"], "quick sheet is missing print/save button")
    assert_true(state["hasSources"], "quick sheet is missing source confidence section")
    assert_true(state["sourceCards"] == 4, "source confidence should expose four confidence cards")
    for phrase in ["door placard", "owner's manual", "accessory wheel instructions", "installed battery label"]:
        assert_true(phrase in state["sourceText"], f"source confidence is missing note: {phrase}")
    for link in state["sourceLinks"]:
        assert_true(link["found"], f"source confidence is missing external link {link['href']}")
        assert_true(link["target"] == "_blank", f"source link should open in a new tab {link['href']}")
        assert_true("noreferrer" in link["rel"], f"source link should use noreferrer {link['href']}")
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    mobile_state = await page.evaluate(
        """() => {
            const critical = document.querySelector("#critical-strip");
            const printPack = document.querySelector("#print-offline-pack");
            const grid = critical?.querySelector(".quick-critical-grid");
            const printGrid = printPack?.querySelector(".quick-print-pack-grid");
            const printCards = [...printPack?.querySelectorAll(".quick-print-pack-card") || []].map((card) => {
                const rect = card.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
            });
            const cards = [...critical?.querySelectorAll(".quick-critical-card") || []].map((card) => {
                const rect = card.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
            });
            return {
                printPackVisible: Boolean(printPack && printPack.getBoundingClientRect().height > 0),
                printPackColumns: printGrid ? getComputedStyle(printGrid).gridTemplateColumns.split(" ").length : 0,
                minPrintPackCardHeight: printCards.length ? Math.min(...printCards.map((card) => card.height)) : 0,
                visible: Boolean(critical && critical.getBoundingClientRect().height > 0),
                columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 0,
                minCardHeight: cards.length ? Math.min(...cards.map((card) => card.height)) : 0,
                maxCardWidth: cards.length ? Math.max(...cards.map((card) => card.width)) : 0,
                overflow: document.documentElement.scrollWidth > window.innerWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["printPackVisible"], "quick sheet print/offline pack is not visible at iPhone width")
    assert_true(mobile_state["printPackColumns"] == 1, "quick sheet print/offline pack should use one readable column on iPhone")
    assert_true(mobile_state["minPrintPackCardHeight"] >= 90, "quick sheet print/offline pack cards should stay thumb-readable on iPhone")
    assert_true(mobile_state["visible"], "quick sheet critical strip is not visible at iPhone width")
    assert_true(mobile_state["columns"] == 2, "quick sheet critical strip should use two compact columns on iPhone")
    assert_true(mobile_state["minCardHeight"] >= 70, "quick sheet critical strip cards should stay thumb-sized on iPhone")
    assert_true(mobile_state["maxCardWidth"] <= 195, "quick sheet critical strip cards are wider than half the iPhone viewport")
    assert_true(not mobile_state["overflow"], "quick sheet critical strip introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_fuse_mobile_readability(page, page_name):
    if page_name not in ["hood.html", "cabin.html"]:
        return

    expected = {
        "hood.html": {
            "selector": "#hood-fuse-quick-finder",
            "links": [
                "diagnostics.html#no-start-workflow",
                "#battery-service",
                "diagnostics.html#accessory-power-workflow",
                "cabin.html#cabin-fuse-quick-finder",
                "rear-hitch.html#trailer-hookup-flow",
                "diagnostics.html#trailer-light-workflow",
                "#hood-fuse-glossary",
                "#fuses",
            ],
            "phrases": [
                "No crank",
                "Phone charger",
                "Trailer lights",
                "Fuse label shorthand",
            ],
        },
        "cabin.html": {
            "selector": "#cabin-fuse-quick-finder",
            "links": [
                "diagnostics.html#accessory-power-workflow",
                "#fuses",
                "diagnostics.html#audio-display-workflow",
                "#cabin-fuse-glossary",
                "diagnostics.html#warning-light-workflow",
                "garage.html#warning-light-template",
                "diagnostics.html#fuse-symptom-finder",
                "hood.html#hood-fuse-quick-finder",
            ],
            "phrases": [
                "Phone charger",
                "Radio",
                "Warning light",
                "cabin or hood",
            ],
        },
    }[page_name]
    finder_state = await page.evaluate(
        """(expected) => {
            const finder = document.querySelector(expected.selector);
            const cards = finder ? [...finder.querySelectorAll(".fuse-quick-card")] : [];
            return {
                hasFinder: Boolean(finder),
                cardCount: cards.length,
                text: finder?.innerText || "",
                missingLinks: expected.links.filter((href) => !finder?.querySelector(`a[href="${href}"]`)),
                hasBoundary: Boolean(finder?.innerText.includes("does not change fuse ratings"))
            };
        }""",
        expected,
    )
    assert_true(finder_state["hasFinder"], f"{page_name} is missing the fuse quick finder")
    assert_true(finder_state["cardCount"] == 4, f"{page_name} fuse quick finder should expose four route cards")
    assert_true(not finder_state["missingLinks"], f"{page_name} fuse quick finder is missing routes: {finder_state['missingLinks']}")
    assert_true(finder_state["hasBoundary"], f"{page_name} fuse quick finder is missing its route-only boundary note")
    for phrase in expected["phrases"]:
        assert_true(phrase in finder_state["text"], f"{page_name} fuse quick finder is missing '{phrase}'")

    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(350)
    finder_mobile_state = await page.evaluate(
        """(selector) => {
            const finder = document.querySelector(selector);
            const grid = finder?.querySelector(".fuse-quick-grid");
            const cards = [...finder?.querySelectorAll(".fuse-quick-card") || []].map((card) => card.getBoundingClientRect());
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(finder && finder.getBoundingClientRect().height > 0),
                columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                minCardHeight: cards.length ? Math.min(...cards.map((card) => card.height)) : 0,
                maxCardWidth: cards.length ? Math.max(...cards.map((card) => card.width)) : 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }""",
        expected["selector"],
    )
    assert_true(finder_mobile_state["visible"], f"{page_name} fuse quick finder is not visible at iPhone width")
    assert_true(finder_mobile_state["columns"] == 2, f"{page_name} fuse quick finder should use two compact columns on iPhone")
    assert_true(finder_mobile_state["minCardHeight"] >= 140, f"{page_name} fuse quick finder cards should stay thumb-readable on iPhone")
    assert_true(finder_mobile_state["maxCardWidth"] <= 195, f"{page_name} fuse quick finder cards are wider than half the iPhone viewport")
    assert_true(not finder_mobile_state["overflow"], f"{page_name} fuse quick finder introduced iPhone horizontal overflow")

    keys = ["hood-a", "hood-b"] if page_name == "hood.html" else ["cabin-a", "cabin-b"]
    for key in keys:
        await page.locator(f'[data-fuse-diagram="{key}"] [data-fuse-position]').last.click()
        await page.wait_for_timeout(350)
        state = await page.evaluate(
            """(key) => {
                const diagram = document.querySelector(`[data-fuse-diagram="${key}"]`);
                const inspector = document.querySelector(`[data-fuse-inspector="${key}"]`);
                const table = document.querySelector(`[data-fuse-table="${key}"]`);
                const activeRow = table?.querySelector("tr.is-active");
                const firstDataCell = table?.querySelector("tr:nth-child(2) td:first-child");
                const circuitCell = activeRow?.querySelector("td:nth-child(5)");
                const diagramWidth = diagram?.getBoundingClientRect().width || 0;
                const svgWidth = diagram?.querySelector("svg")?.getBoundingClientRect().width || 0;
                const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
                const beforeLabel = firstDataCell ? getComputedStyle(firstDataCell, "::before").content : "";
                return {
                    inspectorVisible: Boolean(inspector && !inspector.hidden),
                    title: inspector?.querySelector(".fuse-inspector-title")?.textContent || "",
                    metaColumns: inspector ? getComputedStyle(inspector.querySelector(".fuse-inspector-meta")).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                    rowDisplay: activeRow ? getComputedStyle(activeRow).display : "",
                    circuitWrap: circuitCell ? getComputedStyle(circuitCell).whiteSpace : "",
                    label: beforeLabel,
                    diagramPans: svgWidth > diagramWidth,
                    pageOverflow: docWidth > document.documentElement.clientWidth + 1
                };
            }""",
            key,
        )
        assert_true(state["inspectorVisible"], f"{key} fuse inspector did not open after tapping a fuse")
        assert_true("Fuse" in state["title"], f"{key} fuse inspector title did not update")
        assert_true(state["metaColumns"] == 1, f"{key} fuse inspector meta should stack on iPhone")
        assert_true(state["rowDisplay"] == "block", f"{key} fuse table rows should render as mobile cards")
        assert_true(state["circuitWrap"] != "nowrap", f"{key} fuse circuit cell should wrap on iPhone")
        assert_true("Pos" in state["label"], f"{key} fuse mobile table should show row labels")
        assert_true(state["diagramPans"], f"{key} fuse diagram should pan inside its panel on iPhone")
        assert_true(not state["pageOverflow"], f"{key} fuse page introduced horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_rear_hitch_flow(page, page_name):
    if page_name != "rear-hitch.html":
        return

    readiness_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#tow-day-readiness");
            const cards = panel ? [...panel.querySelectorAll(".tow-day-card")] : [];
            const requiredLinks = [
                "#connector",
                "#tow-checklist",
                "#trailer-hookup-flow",
                "#area-journal"
            ];
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasPanel: Boolean(panel),
                cardCount: cards.length,
                text: panel?.innerText || "",
                missingLinks: requiredLinks.filter((href) => !panel?.querySelector(`a[href="${href}"]`)),
                heroHasRoute: Boolean(document.querySelector('.section-page-hero a[href="#tow-day-readiness"]')),
                dockHasRoute: [...document.querySelectorAll("a")].some((link) =>
                    link.getAttribute("href") === "#tow-day-readiness" && /tow day/i.test(link.textContent || "")
                ),
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(readiness_state["hasPanel"], "rear hitch is missing the Tow Day Readiness panel")
    assert_true(readiness_state["cardCount"] == 4, "Tow Day Readiness should expose four route cards")
    for phrase in ["Confirm this truck first", "Pin, latch, chains, plug", "Name the failed light", "Keep the setup note"]:
        assert_true(phrase in readiness_state["text"], f"Tow Day Readiness is missing '{phrase}'")
    assert_true(not readiness_state["missingLinks"], f"Tow Day Readiness is missing route links: {readiness_state['missingLinks']}")
    assert_true("does not add towing limits" in readiness_state["text"], "Tow Day Readiness is missing its no-new-facts boundary note")
    assert_true(readiness_state["heroHasRoute"], "rear hitch hero is missing the Tow Day route")
    assert_true(readiness_state["dockHasRoute"], "rear hitch bottom dock is missing the Tow Day route")
    assert_true(not readiness_state["overflow"], "Tow Day Readiness introduced desktop horizontal overflow")

    state = await page.evaluate(
        """() => {
            const flow = document.querySelector("#trailer-hookup-flow");
            const cards = flow ? [...flow.querySelectorAll(".trailer-hookup-card")] : [];
            const requiredLinks = [
                "#tow-checklist",
                "#pinout",
                "diagnostics.html#trailer-light-workflow",
                "#area-journal"
            ];
            return {
                hasFlow: Boolean(flow),
                cardCount: cards.length,
                text: flow?.innerText || "",
                missingLinks: requiredLinks.filter((href) => !flow?.querySelector(`a[href="${href}"]`)),
                hasSourceBoundary: Boolean(flow?.innerText.includes("does not change towing limits"))
            };
        }"""
    )
    assert_true(state["hasFlow"], "rear hitch is missing the trailer hookup flow")
    assert_true(state["cardCount"] == 4, "rear hitch hookup flow should expose four route cards")
    for phrase in ["Latch, pin, chain, plug", "Match the failed function", "Truck, adapter, or trailer", "Record adapter and tester notes"]:
        assert_true(phrase in state["text"], f"rear hitch hookup flow is missing '{phrase}'")
    assert_true(not state["missingLinks"], f"rear hitch hookup flow is missing route links: {state['missingLinks']}")
    assert_true(state["hasSourceBoundary"], "rear hitch hookup flow is missing its no-new-facts boundary note")

    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(300)
    mobile_state = await page.evaluate(
        """() => {
            const readiness = document.querySelector("#tow-day-readiness");
            const readinessGrid = readiness?.querySelector(".tow-day-grid");
            const readinessCards = readiness ? [...readiness.querySelectorAll(".tow-day-card")] : [];
            const readinessRects = readinessCards.map((card) => card.getBoundingClientRect());
            const flow = document.querySelector("#trailer-hookup-flow");
            const cards = flow ? [...flow.querySelectorAll(".trailer-hookup-card")] : [];
            const cardRects = cards.map((card) => card.getBoundingClientRect());
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                readinessVisible: Boolean(readiness?.getBoundingClientRect().height),
                readinessColumns: readinessGrid ? getComputedStyle(readinessGrid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                readinessMinCardHeight: readinessRects.length ? Math.min(...readinessRects.map((rect) => rect.height)) : 0,
                flowVisible: Boolean(flow?.getBoundingClientRect().height),
                cardsStacked: cardRects.every((rect) => rect.width <= document.documentElement.clientWidth - 16),
                minCardHeight: Math.min(...cardRects.map((rect) => rect.height)),
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["readinessVisible"], "Tow Day Readiness is not visible at iPhone width")
    assert_true(mobile_state["readinessColumns"] == 1, "Tow Day Readiness should stack to one column on iPhone")
    assert_true(mobile_state["readinessMinCardHeight"] >= 44, "Tow Day Readiness cards lost thumb-sized touch targets")
    assert_true(mobile_state["flowVisible"], "rear hitch hookup flow is not visible at iPhone width")
    assert_true(mobile_state["cardsStacked"], "rear hitch hookup cards did not stack inside the iPhone viewport")
    assert_true(mobile_state["minCardHeight"] >= 44, "rear hitch hookup cards lost thumb-sized touch targets")
    assert_true(not mobile_state["overflow"], "rear hitch hookup flow introduced horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_cargo_load_planner(page, page_name):
    if page_name != "cargo.html":
        return

    state = await page.evaluate(
        """() => {
            const planner = document.querySelector("#cargo-load-planner");
            const cards = planner ? [...planner.querySelectorAll(".cargo-load-card")] : [];
            const requiredLinks = [
                "#bed-diagram",
                "#trunk-diagram",
                "#bed-specs",
                "#area-journal"
            ];
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasPlanner: Boolean(planner),
                cardCount: cards.length,
                text: planner?.innerText || "",
                missingLinks: requiredLinks.filter((href) => !planner?.querySelector(`a[href="${href}"]`)),
                heroHasPlanner: Boolean(document.querySelector('.section-page-hero a[href="#cargo-load-planner"]')),
                dockHasPlanner: [...document.querySelectorAll("a")].some((link) =>
                    link.getAttribute("href") === "#cargo-load-planner" && /load/i.test(link.textContent || "")
                ),
                hasBedSpecsTarget: Boolean(document.querySelector("#bed-specs")),
                hasCargoScope: document.body.classList.contains("cargo-page"),
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(state["hasPlanner"], "cargo page is missing the cargo load planner")
    assert_true(state["cardCount"] == 4, "cargo load planner should expose four route cards")
    for phrase in ["Confirm length", "lockable trunk", "cleats", "Save the repeat setup"]:
        assert_true(phrase in state["text"], f"cargo load planner is missing '{phrase}'")
    assert_true(not state["missingLinks"], f"cargo load planner is missing route links: {state['missingLinks']}")
    assert_true("does not add payload ratings" in state["text"], "cargo load planner is missing its no-new-facts boundary note")
    assert_true(state["heroHasPlanner"], "cargo hero is missing the load planner route")
    assert_true(state["dockHasPlanner"], "cargo bottom dock is missing the load planner route")
    assert_true(state["hasBedSpecsTarget"], "cargo load planner should route to a bed specs anchor")
    assert_true(state["hasCargoScope"], "cargo page is missing its page-scoped styling class")
    assert_true(not state["overflow"], "cargo load planner introduced horizontal overflow")

    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(300)
    mobile_state = await page.evaluate(
        """() => {
            const planner = document.querySelector("#cargo-load-planner");
            const grid = planner?.querySelector(".cargo-load-grid");
            const cards = planner ? [...planner.querySelectorAll(".cargo-load-card")] : [];
            const cardRects = cards.map((card) => card.getBoundingClientRect());
            const visibleHeroLinks = [...document.querySelectorAll(".cargo-page .section-page-hero .section-utility-nav .utility-link")]
                .filter((link) => {
                    const style = getComputedStyle(link);
                    const rect = link.getBoundingClientRect();
                    return style.display !== "none" && rect.width > 0 && rect.height > 0;
                }).length;
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(planner?.getBoundingClientRect().height),
                columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                visibleHeroLinks,
                minCardHeight: cardRects.length ? Math.min(...cardRects.map((rect) => rect.height)) : 0,
                maxCardWidth: cardRects.length ? Math.max(...cardRects.map((rect) => rect.width)) : 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "cargo load planner is not visible at iPhone width")
    assert_true(mobile_state["columns"] == 1, "cargo load planner should stack to one column on iPhone")
    assert_true(mobile_state["visibleHeroLinks"] == 6, "cargo mobile hero should keep the six primary cargo routes visible")
    assert_true(mobile_state["minCardHeight"] >= 44, "cargo load planner cards lost thumb-sized touch targets")
    assert_true(mobile_state["maxCardWidth"] <= 390, "cargo load planner cards are wider than the iPhone viewport")
    assert_true(not mobile_state["overflow"], "cargo load planner introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_engine_service_jumpstart(page, page_name):
    if page_name != "engine.html":
        return

    state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#engine-service-jumpstart");
            const cards = panel ? [...panel.querySelectorAll(".engine-service-route")] : [];
            const requiredLinks = [
                "#timing-service",
                "#engine-part-reference",
                "photo-atlas.html#hood-atlas",
                "diagnostics.html#no-start-workflow"
            ];
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasPanel: Boolean(panel),
                cardCount: cards.length,
                text: panel?.innerText || "",
                missingLinks: requiredLinks.filter((href) => !panel?.querySelector(`a[href="${href}"]`)),
                heroHasRoute: Boolean(document.querySelector('.engine-utility-nav a[href="#engine-service-jumpstart"]')),
                dockHasRoute: [...document.querySelectorAll("a")].some((link) =>
                    link.getAttribute("href") === "#engine-service-jumpstart" && /service jump/i.test(link.textContent || "")
                ),
                hasPartTarget: Boolean(document.querySelector("#engine-part-reference")),
                hasTimingTarget: Boolean(document.querySelector("#timing-service")),
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(state["hasPanel"], "engine page is missing the Engine Service Jumpstart panel")
    assert_true(state["cardCount"] == 4, "Engine Service Jumpstart should expose four route cards")
    for phrase in ["Open the timing service facts", "Use the in-site part picker", "Match it to real hood photos", "Route no-start clues"]:
        assert_true(phrase in state["text"], f"Engine Service Jumpstart is missing '{phrase}'")
    assert_true(not state["missingLinks"], f"Engine Service Jumpstart is missing route links: {state['missingLinks']}")
    assert_true("does not add repair procedures" in state["text"], "Engine Service Jumpstart is missing its no-new-facts boundary note")
    assert_true(state["heroHasRoute"], "engine hero is missing the Service Jumpstart route")
    assert_true(state["dockHasRoute"], "engine bottom dock is missing the Service Jump route")
    assert_true(state["hasPartTarget"], "Engine Service Jumpstart should route to the part reference target")
    assert_true(state["hasTimingTarget"], "Engine Service Jumpstart should route to the timing service target")
    assert_true(not state["overflow"], "Engine Service Jumpstart introduced desktop horizontal overflow")

    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(300)
    mobile_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#engine-service-jumpstart");
            const grid = panel?.querySelector(".engine-service-grid");
            const cards = panel ? [...panel.querySelectorAll(".engine-service-route")] : [];
            const cardRects = cards.map((card) => card.getBoundingClientRect());
            const visibleHeroLinks = [...document.querySelectorAll(".engine-page-main .engine-utility-nav .utility-link")]
                .filter((link) => {
                    const style = getComputedStyle(link);
                    const rect = link.getBoundingClientRect();
                    return style.display !== "none" && rect.width > 0 && rect.height > 0;
                }).length;
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(panel?.getBoundingClientRect().height),
                columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                visibleHeroLinks,
                minCardHeight: cardRects.length ? Math.min(...cardRects.map((rect) => rect.height)) : 0,
                maxCardWidth: cardRects.length ? Math.max(...cardRects.map((rect) => rect.width)) : 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "Engine Service Jumpstart is not visible at iPhone width")
    assert_true(mobile_state["columns"] == 1, "Engine Service Jumpstart should stack to one column on iPhone")
    assert_true(mobile_state["visibleHeroLinks"] == 5, "engine mobile hero should keep the five primary engine routes visible")
    assert_true(mobile_state["minCardHeight"] >= 44, "Engine Service Jumpstart cards lost thumb-sized touch targets")
    assert_true(mobile_state["maxCardWidth"] <= 390, "Engine Service Jumpstart cards are wider than the iPhone viewport")
    assert_true(not mobile_state["overflow"], "Engine Service Jumpstart introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_photo_capture_plan(page, page_name):
    if page_name != "photo-atlas.html":
        return

    state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#photo-capture-plan");
            const cards = panel ? [...panel.querySelectorAll(".photo-capture-card")] : [];
            const requiredLinks = [
                "hood.html#area-journal",
                "cabin.html#area-journal",
                "cargo.html#area-journal",
                "rear-hitch.html#area-journal",
                "garage.html#areas"
            ];
            const atlasCards = [...document.querySelectorAll("[data-atlas-area]")];
            const emptyStates = [...document.querySelectorAll(".atlas-empty-state")];
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasPanel: Boolean(panel),
                cardCount: cards.length,
                text: panel?.innerText || "",
                missingLinks: requiredLinks.filter((href) => !panel?.querySelector(`a[href="${href}"]`)),
                heroHasPlan: Boolean(document.querySelector('.section-page-hero a[href="#photo-capture-plan"]')),
                dockHasPlan: [...document.querySelectorAll("a")].some((link) =>
                    link.getAttribute("href") === "#photo-capture-plan" && /capture plan/i.test(link.textContent || "")
                ),
                atlasCount: atlasCards.length,
                emptyCount: emptyStates.length,
                emptyLinks: emptyStates.filter((state) => state.querySelector('a[href$="#area-journal"]')).length,
                hasPageScope: document.body.classList.contains("photo-atlas-page"),
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(state["hasPanel"], "Photo Atlas is missing the capture plan panel")
    assert_true(state["cardCount"] == 4, "Photo Capture Plan should expose four route cards")
    for phrase in ["Fuse covers", "Driver-left fuse panel", "Trunk layout", "Connector"]:
        assert_true(phrase in state["text"], f"Photo Capture Plan is missing '{phrase}'")
    assert_true(not state["missingLinks"], f"Photo Capture Plan is missing route links: {state['missingLinks']}")
    assert_true("does not add repair steps" in state["text"], "Photo Capture Plan is missing its no-new-facts boundary note")
    assert_true(state["heroHasPlan"], "Photo Atlas hero is missing the capture plan route")
    assert_true(state["dockHasPlan"], "Photo Atlas bottom dock is missing the capture plan route")
    assert_true(state["atlasCount"] == 4, "Photo Atlas should still render four atlas areas")
    assert_true(state["emptyCount"] == 4, "Photo Atlas empty state should render for each empty area")
    assert_true(state["emptyLinks"] == 4, "Photo Atlas empty states should route to area journals")
    assert_true(state["hasPageScope"], "Photo Atlas is missing its page-scoped styling class")
    assert_true(not state["overflow"], "Photo Capture Plan introduced horizontal overflow")

    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(300)
    mobile_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#photo-capture-plan");
            const grid = panel?.querySelector(".photo-capture-grid");
            const cards = panel ? [...panel.querySelectorAll(".photo-capture-card")] : [];
            const cardRects = cards.map((card) => card.getBoundingClientRect());
            const visibleHeroLinks = [...document.querySelectorAll(".photo-atlas-page .section-page-hero .section-utility-nav .utility-link")]
                .filter((link) => {
                    const style = getComputedStyle(link);
                    const rect = link.getBoundingClientRect();
                    return style.display !== "none" && rect.width > 0 && rect.height > 0;
                }).length;
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(panel?.getBoundingClientRect().height),
                columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                visibleHeroLinks,
                minCardHeight: cardRects.length ? Math.min(...cardRects.map((rect) => rect.height)) : 0,
                maxCardWidth: cardRects.length ? Math.max(...cardRects.map((rect) => rect.width)) : 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "Photo Capture Plan is not visible at iPhone width")
    assert_true(mobile_state["columns"] == 1, "Photo Capture Plan should stack to one column on iPhone")
    assert_true(mobile_state["visibleHeroLinks"] == 5, "Photo Atlas mobile hero should keep five primary routes visible")
    assert_true(mobile_state["minCardHeight"] >= 44, "Photo Capture Plan cards lost thumb-sized touch targets")
    assert_true(mobile_state["maxCardWidth"] <= 390, "Photo Capture Plan cards are wider than the iPhone viewport")
    assert_true(not mobile_state["overflow"], "Photo Capture Plan introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_tire_roadside_launcher(page, page_name):
    if page_name != "tires.html":
        return

    state = await page.evaluate(
        """() => {
            const launcher = document.querySelector("#tire-roadside-launcher");
            const required = [
                "quick-sheet.html#roadside-action-stack",
                "index.html?system=jack-points#viewer",
                "quick-sheet.html#tires",
                "maintenance.html#tire-wheel-lab"
            ];
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasLauncher: Boolean(launcher),
                cardCount: launcher?.querySelectorAll(".tire-roadside-action").length || 0,
                missing: required.filter((href) => !launcher?.querySelector(`a[href="${href}"]`)),
                text: launcher?.innerText || "",
                bottomHasRoadside: Boolean(document.querySelector('.context-action[href="#tire-roadside-launcher"]')),
                bottomHasJack: Boolean(document.querySelector('.context-action[href="index.html?system=jack-points#viewer"]')),
                heroHasRoadside: Boolean(document.querySelector('.wheel-utility-nav a[href="#tire-roadside-launcher"]')),
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(state["hasLauncher"], "tires page is missing the roadside tire launcher")
    assert_true(state["cardCount"] == 4, "tire roadside launcher should expose four route cards")
    assert_true(not state["missing"], f"tire roadside launcher is missing routes: {state['missing']}")
    launcher_text = state["text"].lower()
    for phrase in ["flat tire now", "lift point", "35 psi", "94 lb-ft", "fitment"]:
        assert_true(phrase in launcher_text, f"tire roadside launcher is missing {phrase}")
    assert_true(state["bottomHasRoadside"], "tire page bottom bar is missing roadside launcher route")
    assert_true(state["bottomHasJack"], "tire page bottom bar is missing direct jack map route")
    assert_true(state["heroHasRoadside"], "tire page hero is missing roadside launcher route")
    assert_true(not state["overflow"], "tire roadside launcher introduced horizontal overflow")
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    mobile_state = await page.evaluate(
        """() => {
            const launcher = document.querySelector("#tire-roadside-launcher");
            const grid = launcher?.querySelector(".tire-roadside-grid");
            const cards = [...(launcher?.querySelectorAll(".tire-roadside-action") || [])].map((card) => {
                const rect = card.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
            });
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(launcher && launcher.getBoundingClientRect().height > 0),
                columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 0,
                minCardHeight: cards.length ? Math.min(...cards.map((card) => card.height)) : 0,
                maxCardWidth: cards.length ? Math.max(...cards.map((card) => card.width)) : 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "tire roadside launcher is not visible at iPhone width")
    assert_true(mobile_state["columns"] == 1, "tire roadside launcher should stack to one column on iPhone")
    assert_true(mobile_state["minCardHeight"] >= 64, "tire roadside cards should remain thumb-sized on iPhone")
    assert_true(mobile_state["maxCardWidth"] <= 390, "tire roadside cards are wider than the iPhone viewport")
    assert_true(not mobile_state["overflow"], "tire roadside launcher introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_maintenance_features(page, page_name):
    if page_name != "maintenance.html":
        return
    state = await page.evaluate(
        """() => {
            const prep = document.querySelector("#service-prep");
            const launcher = document.querySelector("#service-run-launcher");
            const launcherCards = launcher ? [...launcher.querySelectorAll(".maintenance-run-card")] : [];
            const cards = prep ? [...prep.querySelectorAll("[data-service-prep-card]")] : [];
            const checkboxLabels = cards.flatMap((card) => [...card.querySelectorAll("label")]).filter((label) => label.querySelector("input[type='checkbox']"));
            const minder = document.querySelector("#minder-pocket-planner");
            return {
                hasLauncher: Boolean(launcher),
                launcherCardCount: launcherCards.length,
                launcherText: launcher?.innerText || "",
                launcherRoutes: launcher ? [
                    'a[href="#service-prep"]',
                    'a[href="#oil-service"]',
                    'a[href="#maintenance-updater"]',
                    'a[href="#minder-pocket-planner"]',
                    'a[href="#minder"]',
                    'a[href="garage.html#maintenance-note-preview"]',
                    'a[href="hood.html#battery-service"]',
                    'a[href="#filter-cross"]',
                    'a[href="index.html?system=jack-points#viewer"]'
                ].every((selector) => Boolean(launcher.querySelector(selector))) : false,
                hasPrep: Boolean(prep),
                cardCount: cards.length,
                checkboxCount: checkboxLabels.length,
                hasGarageRoute: Boolean(prep?.querySelector('a[href="garage.html#notes"]')),
                hasCopyButtons: cards.every((card) => Boolean(card.querySelector("[data-copy-service-prep]"))),
                hasSaveButtons: cards.every((card) => Boolean(card.querySelector("[data-save-service-prep]"))),
                hasStageButtons: cards.every((card) => Boolean(card.querySelector("[data-save-open-service-staging]"))),
                hasResetButtons: cards.every((card) => Boolean(card.querySelector("[data-reset-service-prep]"))),
                hasMinder: Boolean(minder),
                hasMinderInput: Boolean(minder?.querySelector("[data-minder-code-input]")),
                hasMinderCopy: Boolean(minder?.querySelector("[data-copy-minder-plan]")),
                hasMinderSaveNote: Boolean(minder?.querySelector("[data-save-minder-note]")),
                hasMinderStage: Boolean(minder?.querySelector("[data-save-open-minder-staging]")),
                hasMinderReset: Boolean(minder?.querySelector("[data-reset-minder-plan]")),
                hasMinderUpdaterRoute: Boolean(minder?.querySelector('a[href="#maintenance-updater"]')),
                hasMinderGarageRoute: Boolean(minder?.querySelector('a[href="garage.html#notes"]')),
                minderText: minder?.innerText || "",
                hasMaintenanceScope: document.body.classList.contains("maintenance-page")
            };
        }"""
    )
    assert_true(state["hasLauncher"], "maintenance page is missing the service run launcher")
    assert_true(state["launcherCardCount"] == 5, "service run launcher should expose five common service routes")
    assert_true(state["launcherRoutes"], "service run launcher is missing prep/spec/log/Garage routes")
    assert_true("Pick The Job Before You Scroll" in state["launcherText"], "service run launcher should explain the iPhone job-picker purpose")
    assert_true(state["hasPrep"], "maintenance page is missing the service prep planner")
    assert_true(state["cardCount"] == 4, "service prep planner should expose four job cards")
    assert_true(state["checkboxCount"] >= 16, "service prep planner should expose labeled checkbox items")
    assert_true(state["hasGarageRoute"], "service prep planner is missing the Garage notes route")
    assert_true(state["hasCopyButtons"], "service prep planner is missing copy buttons")
    assert_true(state["hasSaveButtons"], "service prep planner is missing Garage note save buttons")
    assert_true(state["hasStageButtons"], "service prep planner is missing direct Garage staging buttons")
    assert_true(state["hasResetButtons"], "service prep planner is missing reset buttons")
    assert_true(state["hasMinder"], "maintenance page is missing the Maintenance Minder Pocket Planner")
    assert_true(state["hasMinderInput"], "Maintenance Minder Pocket Planner is missing its code input")
    assert_true(state["hasMinderCopy"], "Maintenance Minder Pocket Planner is missing copy action")
    assert_true(state["hasMinderSaveNote"], "Maintenance Minder Pocket Planner is missing its Garage note save action")
    assert_true(state["hasMinderStage"], "Maintenance Minder Pocket Planner is missing its direct Garage staging action")
    assert_true(state["hasMinderReset"], "Maintenance Minder Pocket Planner is missing reset action")
    assert_true(state["hasMinderUpdaterRoute"], "Maintenance Minder Pocket Planner is missing the Quick Maintenance Update route")
    assert_true(state["hasMinderGarageRoute"], "Maintenance Minder Pocket Planner is missing the Garage notes route")
    assert_true("sub-item 1-6" in state["minderText"], "Maintenance Minder Pocket Planner should state the 1-6 sub-item limit")
    assert_true(state["hasMaintenanceScope"], "maintenance page is missing its page-scoped styling class")
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    mobile_state = await page.evaluate(
        """() => {
            const prepGrid = document.querySelector("#service-prep .service-prep-grid");
            const launcherGrid = document.querySelector("#service-run-launcher .maintenance-run-grid");
            const firstLauncherAction = document.querySelector("#service-run-launcher .maintenance-run-card .inspector-actions");
            const firstPrepAction = document.querySelector("#service-prep [data-service-prep-card] .service-prep-actions");
            const firstPrepStageButton = firstPrepAction?.querySelector("[data-save-open-service-staging]");
            const minderStageButton = document.querySelector("#minder-pocket-planner [data-save-open-minder-staging]");
            const minderActions = document.querySelector("#minder-pocket-planner .minder-pocket-actions");
            const visibleMaintenanceHeroLinks = [...document.querySelectorAll(".maintenance-page .section-page-hero .section-utility-nav .utility-link")]
                .filter((link) => {
                    const style = getComputedStyle(link);
                    const rect = link.getBoundingClientRect();
                    return style.display !== "none" && rect.width > 0 && rect.height > 0;
                }).length;
            const visibleMaintenanceDockLinks = [...document.querySelectorAll(".maintenance-page .context-action-bar a")]
                .filter((link) => {
                    const style = getComputedStyle(link);
                    const rect = link.getBoundingClientRect();
                    return style.display !== "none" && rect.width > 0 && rect.height > 0;
                })
                .map((link) => link.textContent.trim());
            const prepColumns = prepGrid ? getComputedStyle(prepGrid).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const launcherColumns = launcherGrid ? getComputedStyle(launcherGrid).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const launcherActionRows = firstLauncherAction
                ? new Set([...firstLauncherAction.querySelectorAll(".utility-link")].map((button) => Math.round(button.getBoundingClientRect().top))).size
                : 0;
            const prepActionRows = firstPrepAction
                ? new Set([...firstPrepAction.querySelectorAll(".utility-link")].map((button) => Math.round(button.getBoundingClientRect().top))).size
                : 0;
            const minderActionRows = minderActions
                ? new Set([...minderActions.querySelectorAll(".utility-link")].map((button) => Math.round(button.getBoundingClientRect().top))).size
                : 0;
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visibleMaintenanceHeroLinks,
                visibleMaintenanceDockLinks,
                hasMaintenanceStagingRoute: visibleMaintenanceDockLinks.includes("Stage") &&
                    Boolean(document.querySelector('.maintenance-page .context-action-bar a[href="garage.html#maintenance-note-preview"]')),
                prepStageText: firstPrepStageButton?.textContent.trim() || "",
                prepStageLabel: firstPrepStageButton?.getAttribute("aria-label") || "",
                minderStageText: minderStageButton?.textContent.trim() || "",
                minderStageLabel: minderStageButton?.getAttribute("aria-label") || "",
                launcherColumns,
                launcherActionRows,
                prepColumns,
                prepActionRows,
                minderActionRows,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visibleMaintenanceHeroLinks"] == 6, "maintenance mobile hero should show six primary task links")
    assert_true(mobile_state["launcherColumns"] == 2, "service run launcher should keep two compact columns at iPhone width")
    assert_true(mobile_state["launcherActionRows"] == 1, "service run launcher action buttons should stay on one compact row at iPhone width")
    assert_true(mobile_state["visibleMaintenanceDockLinks"] == ["Update", "Prep", "Stage", "More"], "maintenance mobile bottom bar should prioritize Update, Prep, Stage, and More")
    assert_true(mobile_state["hasMaintenanceStagingRoute"], "maintenance mobile bottom bar is missing the Garage staging route")
    assert_true(mobile_state["prepStageText"] == "Stage in Garage", "service prep Stage button should clearly state it opens Garage staging")
    assert_true("open Garage staging" in mobile_state["prepStageLabel"], "service prep Stage button should expose a descriptive aria label")
    assert_true(mobile_state["minderStageText"] == "Stage in Garage", "minder planner Stage button should clearly state it opens Garage staging")
    assert_true("open Garage staging" in mobile_state["minderStageLabel"], "minder planner Stage button should expose a descriptive aria label")
    assert_true(mobile_state["prepColumns"] == 2, "service prep planner should keep two compact columns at iPhone width")
    assert_true(mobile_state["prepActionRows"] == 1, "service prep action buttons should stay on one compact row at iPhone width")
    assert_true(mobile_state["minderActionRows"] <= 2, "minder planner actions should not stack into three separate rows at iPhone width")
    assert_true(not mobile_state["overflow"], "maintenance planner mobile density introduced horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)
    await page.evaluate("""() => localStorage.setItem('ridgeline-notes', JSON.stringify({ general_notes: 'Existing garage note', quick_capture_keep: 'preserve me' }))""")
    await page.locator("#service-prep [data-service-prep-card]").first.locator("input[type='checkbox']").first.check()
    await page.locator("#service-prep [data-copy-service-prep]").first.click()
    await page.wait_for_timeout(100)
    status = await page.locator("#service-prep [data-service-prep-status]").first.inner_text()
    assert_true("Prep copied" in status, "service prep copy did not report success")
    await page.locator("#service-prep [data-save-service-prep]").first.click()
    await page.wait_for_timeout(100)
    prep_save_status = await page.locator("#service-prep [data-service-prep-status]").first.inner_text()
    assert_true("saved to Garage Notes" in prep_save_status, "service prep save did not report success")
    prep_saved_notes = await page.evaluate("""() => JSON.parse(localStorage.getItem('ridgeline-notes') || '{}').general_notes || ''""")
    prep_preserved_key = await page.evaluate("""() => JSON.parse(localStorage.getItem('ridgeline-notes') || '{}').quick_capture_keep || ''""")
    assert_true("Oil Change Prep" in prep_saved_notes, "service prep save did not write the card title to Garage notes")
    assert_true("0W-20 oil and final dipstick level check" in prep_saved_notes, "service prep save did not write checked prep item to Garage notes")
    assert_true("Oil filter and 14 mm crush washer" not in prep_saved_notes, "service prep save should use checked items when at least one item is checked")
    assert_true(prep_saved_notes.index("Oil Change Prep") < prep_saved_notes.index("Existing garage note"), "service prep save should prepend instead of replacing or appending Garage notes")
    assert_true(prep_preserved_key == "preserve me", "service prep save dropped an unrelated Garage note key")
    await page.locator("#service-prep [data-reset-service-prep]").first.click()
    unchecked = await page.locator("#service-prep [data-service-prep-card]").first.locator("input[type='checkbox']").first.is_checked()
    assert_true(not unchecked, "service prep reset did not uncheck the item")
    await page.locator("#minder-pocket-planner [data-minder-code-input]").fill("B127")
    await page.locator("#minder-pocket-planner [data-build-minder-plan]").click()
    await page.wait_for_timeout(100)
    minder_text = await page.locator("#minder-pocket-planner [data-minder-plan-output]").inner_text()
    assert_true("B: Replace engine oil and oil filter" in minder_text, "minder planner did not include B service")
    assert_true("1: Rotate tires." in minder_text, "minder planner did not include sub-item 1")
    assert_true("2: Replace engine air filter" in minder_text, "minder planner did not include sub-item 2")
    assert_true("Unsupported sub-code ignored: 7" in minder_text, "minder planner did not reject unsupported sub-code 7")
    await page.locator("#minder-pocket-planner [data-copy-minder-plan]").click()
    await page.wait_for_timeout(100)
    minder_status = await page.locator("#minder-pocket-planner [data-minder-plan-status]").inner_text()
    assert_true("Checklist copied" in minder_status, "minder planner copy did not report success")
    await page.locator("#minder-pocket-planner [data-save-minder-note]").click()
    await page.wait_for_timeout(100)
    saved_status = await page.locator("#minder-pocket-planner [data-minder-plan-status]").inner_text()
    assert_true("saved to Garage Notes" in saved_status, "minder planner Garage note save did not report success")
    saved_notes = await page.evaluate("""() => JSON.parse(localStorage.getItem('ridgeline-notes') || '{}').general_notes || ''""")
    assert_true("Maintenance Minder B127 planner" in saved_notes, "minder planner did not save the checklist to Garage notes")
    assert_true("Brake fluid: separate 3-year calendar item" in saved_notes, "minder planner Garage note dropped the brake-fluid caution")
    await page.locator("#minder-pocket-planner [data-minder-code-input]").fill("A1")
    await page.locator("#minder-pocket-planner [data-save-minder-note]").click()
    await page.wait_for_timeout(100)
    refreshed_notes = await page.evaluate("""() => JSON.parse(localStorage.getItem('ridgeline-notes') || '{}').general_notes || ''""")
    assert_true("Maintenance Minder A1 planner" in refreshed_notes, "minder planner Save Note did not rebuild from the current code input")
    await page.locator("#minder-pocket-planner [data-reset-minder-plan]").click()
    await page.wait_for_timeout(100)
    minder_value = await page.locator("#minder-pocket-planner [data-minder-code-input]").input_value()
    assert_true(minder_value == "", "minder planner reset did not clear the code input")
    await page.locator("#minder-pocket-planner [data-minder-code-input]").fill("A1")
    await page.locator("#minder-pocket-planner [data-save-open-minder-staging]").click()
    await page.wait_for_url("**/garage.html#maintenance-note-preview", timeout=5000)
    await page.wait_for_selector("#maintenance-note-preview [data-maintenance-parts-preview]", state="attached")
    stage_nav_notes = await page.evaluate("""() => JSON.parse(localStorage.getItem('ridgeline-notes') || '{}').general_notes || ''""")
    assert_true("Maintenance Minder A1 planner" in stage_nav_notes, "minder planner Stage action did not save before opening Garage staging")
    assert_true("maintenance-note-preview" in page.url, "minder planner Stage action did not open Garage staging")
    stage_handoff_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const confirmation = panel?.querySelector("[data-maintenance-stage-confirmation]");
            const fresh = panel?.querySelector(".maintenance-note-item.is-fresh-maintenance-note");
            return {
                hasConfirmation: Boolean(confirmation),
                confirmationText: confirmation?.innerText || "",
                hasShare: Boolean(confirmation?.querySelector("[data-share-maintenance-needed-inline]")),
                hasCopy: Boolean(confirmation?.querySelector("[data-copy-maintenance-needed-inline]")),
                hasSaveBuy: Boolean(confirmation?.querySelector("[data-save-maintenance-needed-inline]")),
                hasSaveRun: Boolean(confirmation?.querySelector("[data-save-maintenance-run-inline]")),
                hasDismiss: Boolean(confirmation?.querySelector("[data-dismiss-maintenance-stage-confirmation]")),
                previewLines: [...(confirmation?.querySelectorAll(".maintenance-stage-preview li") || [])].map((line) => line.textContent.trim()),
                hasFreshNote: Boolean(fresh),
                freshText: fresh?.innerText || "",
                handoffCleared: !sessionStorage.getItem("ridgeline-maintenance-stage-handoff")
            };
        }"""
    )
    assert_true(stage_handoff_state["hasConfirmation"], "Garage staging should show a just-saved handoff confirmation after Maintenance Stage")
    assert_true("Maintenance Minder A1" in stage_handoff_state["confirmationText"], "Garage staging handoff confirmation should name the saved planner")
    assert_true("staging line" in stage_handoff_state["confirmationText"], "Garage staging handoff confirmation should report derived staging lines")
    assert_true(stage_handoff_state["hasShare"], "Garage staging handoff confirmation should expose Share Buy List")
    assert_true(stage_handoff_state["hasCopy"], "Garage staging handoff confirmation should expose Copy Buy List")
    assert_true(stage_handoff_state["hasSaveBuy"], "Garage staging handoff confirmation should expose Save Buy Note")
    assert_true(stage_handoff_state["hasSaveRun"], "Garage staging handoff confirmation should expose Save Run Note")
    assert_true(stage_handoff_state["hasDismiss"], "Garage staging handoff confirmation should expose a Dismiss control")
    assert_true(len(stage_handoff_state["previewLines"]) == 2, "Garage staging handoff confirmation should preview just-saved need-to-buy lines without the brake-fluid calendar caution")
    assert_true(any("Replace engine oil" in line for line in stage_handoff_state["previewLines"]), "Garage staging handoff preview should include the just-saved checklist lines")
    assert_true(not any("Brake fluid" in line for line in stage_handoff_state["previewLines"]), "Garage staging handoff preview should not treat the brake-fluid calendar note as a staging line")
    assert_true(stage_handoff_state["hasFreshNote"], "Garage staging should highlight the latest saved maintenance note")
    assert_true("just saved" in stage_handoff_state["freshText"].lower(), "latest saved maintenance note should carry a Just saved marker")
    assert_true(stage_handoff_state["handoffCleared"], "Maintenance Stage handoff should be one-visit session state")
    await page.locator("#maintenance-note-preview [data-dismiss-maintenance-stage-confirmation]").click()
    await page.wait_for_timeout(150)
    dismiss_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            return {
                hasConfirmation: Boolean(panel?.querySelector("[data-maintenance-stage-confirmation]")),
                hasFreshNote: Boolean(panel?.querySelector(".maintenance-note-item.is-fresh-maintenance-note")),
                hasStagingList: Boolean(panel?.querySelector("[data-maintenance-staging-toggle]")),
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                handoffCleared: !sessionStorage.getItem("ridgeline-maintenance-stage-handoff")
            };
        }"""
    )
    assert_true(not dismiss_state["hasConfirmation"], "dismissing the Maintenance handoff should remove the one-visit receipt")
    assert_true(dismiss_state["hasStagingList"], "dismissing the Maintenance handoff should keep the saved staging checklist")
    assert_true(dismiss_state["handoffCleared"], "dismissing the Maintenance handoff should keep session handoff state cleared")
    assert_true("Dismissed the one-visit Maintenance handoff receipt" in dismiss_state["status"], "dismissing the Maintenance handoff should explain that saved staging remains")
    await page.go_back(wait_until="load")
    await page.wait_for_selector("#minder-pocket-planner [data-minder-code-input]", state="attached")
    await assert_scroll_unlocked(page, "service prep planner")


async def assert_garage_features(page, page_name):
    if page_name != "garage.html":
        return
    state = await page.evaluate(
        """() => {
            const dashboard = document.querySelector("[data-garage-dashboard]");
            const diagnosticCard = dashboard ? [...dashboard.querySelectorAll(".dashboard-card")]
                .find((card) => card.textContent.includes("Diagnostic Notes")) : null;
            const stagingCard = dashboard ? [...dashboard.querySelectorAll(".dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging")) : null;
            const activity = document.querySelector("#diagnostic-activity [data-diagnostic-activity]");
            const backupCheckpoint = document.querySelector("#diagnostic-activity [data-garage-backup-checkpoint]");
            const maintenanceNotes = document.querySelector("#maintenance-note-preview [data-maintenance-note-preview]");
            const maintenanceParts = document.querySelector("#maintenance-note-preview [data-maintenance-parts-preview]");
            const maintenanceNoteText = document.querySelector("#maintenance-note-preview")?.innerText || "";
            const activityText = document.querySelector("#diagnostic-activity")?.innerText || "";
            const template = document.querySelector("#warning-light-template");
            const requiredFields = [
                "warning_light_date_mileage",
                "warning_light_indicator",
                "warning_light_behavior",
                "warning_light_context",
                "warning_light_mid_message",
                "warning_light_next_action"
            ];
            return {
                hasDashboard: Boolean(dashboard),
                hasDiagnosticCard: Boolean(diagnosticCard),
                hasDiagnosticCardRoute: Boolean(diagnosticCard?.querySelector('a[href="#warning-light-template"]')),
                hasStagingDashboardCard: Boolean(stagingCard),
                hasStagingDashboardRoute: Boolean(stagingCard?.querySelector('a[href="#maintenance-note-preview"]')),
                hasHeroStagingRoute: Boolean(document.querySelector('.section-utility-nav a[href="#maintenance-note-preview"]')),
                hasActivity: Boolean(activity),
                activityRenders: Boolean(activity?.textContent.includes("No diagnostic activity saved yet.") || activity?.querySelector(".diagnostic-activity-item")),
                hasBackupCheckpoint: Boolean(backupCheckpoint),
                backupCheckpointCards: backupCheckpoint?.querySelectorAll("article").length || 0,
                backupCheckpointText: backupCheckpoint?.innerText || "",
                hasBackupCheckpointDownload: Boolean(backupCheckpoint?.querySelector('[data-garage-backup-quick="download"]')),
                hasBackupCheckpointChoose: Boolean(backupCheckpoint?.querySelector('[data-garage-backup-quick="choose"]')),
                hasBackupCheckpointRestore: Boolean(backupCheckpoint?.querySelector('[data-garage-backup-quick="restore"]')),
                backupCheckpointRestoreDisabled: backupCheckpoint?.querySelector('[data-garage-backup-quick="restore"]')?.disabled === true,
                hasMaintenanceNotes: Boolean(maintenanceNotes),
                hasMaintenancePartsPreview: Boolean(maintenanceParts),
                hasMaintenanceNoteCopy: Boolean(document.querySelector("#maintenance-note-preview [data-copy-maintenance-note]")),
                hasMaintenancePartsCopy: Boolean(document.querySelector("#maintenance-note-preview [data-copy-maintenance-parts]")),
                maintenanceNotesEmpty: Boolean(maintenanceNotes?.textContent.includes("No saved maintenance planner notes yet.")),
                maintenanceNotesPopulated: Boolean(maintenanceNotes?.querySelector(".maintenance-note-item")),
                maintenanceNoteCopyDisabled: document.querySelector("#maintenance-note-preview [data-copy-maintenance-note]")?.disabled === true,
                maintenancePartsCopyDisabled: document.querySelector("#maintenance-note-preview [data-copy-maintenance-parts]")?.disabled === true,
                maintenanceNotesRender: Boolean(maintenanceNotes?.textContent.includes("No saved maintenance planner notes yet.") || maintenanceNotes?.querySelector(".maintenance-note-item")),
                maintenanceNoteHasRoutes: Boolean(document.querySelector('#maintenance-note-preview a[href="maintenance.html#service-prep"]')) &&
                    (maintenanceNoteText.includes("Open Minder Planner") || Boolean(maintenanceNotes?.querySelector('.maintenance-note-item a[href="#notes"]'))),
                hasFilter: Boolean(document.querySelector("#diagnostic-activity [data-diagnostic-activity-filter]")),
                hasCopy: Boolean(document.querySelector("#diagnostic-activity [data-copy-diagnostic-activity]")),
                hasActivityDownload: Boolean(document.querySelector("#diagnostic-activity [data-download-diagnostic-activity]")),
                hasBackupDownload: Boolean(document.querySelector("#diagnostic-activity [data-download-garage-backup]")),
                hasImport: Boolean(document.querySelector("#diagnostic-activity [data-import-garage-backup]")),
                hasChoose: Boolean(document.querySelector("#diagnostic-activity [data-choose-garage-backup]")),
                hasRestore: Boolean(document.querySelector("#diagnostic-activity [data-restore-garage-backup]")),
                restoreDisabled: document.querySelector("#diagnostic-activity [data-restore-garage-backup]")?.disabled === true,
                textHasActivityJson: activityText.includes("Activity JSON"),
                textHasPhotoMetadata: activityText.includes("photo metadata"),
                textHasRestoreNote: activityText.includes("Restore Backup imports"),
                textHasSafetyNote: activityText.includes("Use Download Backup first"),
                textHasImageByteNote: activityText.includes("browser-local image bytes are not included"),
                hasPreview: Boolean(document.querySelector("#diagnostic-activity [data-garage-backup-preview]")),
                previewHidden: document.querySelector("#diagnostic-activity [data-garage-backup-preview]")?.hidden === true,
                hasTemplate: Boolean(template),
                missingFields: requiredFields.filter((name) => !template?.querySelector(`[name="${name}"]`)),
                hasTemplateRoute: Boolean(template?.querySelector('a[href="diagnostics.html#warning-light-workflow"]'))
            };
        }"""
    )
    assert_true(state["hasDashboard"], "garage page is missing the garage dashboard")
    assert_true(state["hasDiagnosticCard"], "garage dashboard is missing the diagnostic notes card")
    assert_true(state["hasDiagnosticCardRoute"], "diagnostic notes card is missing the warning-light note route")
    assert_true(state["hasStagingDashboardCard"], "garage dashboard is missing the parts staging card")
    assert_true(state["hasStagingDashboardRoute"], "garage dashboard parts staging card is missing the staging route")
    assert_true(state["hasHeroStagingRoute"], "garage hero is missing the saved maintenance shortcut")
    assert_true(state["hasActivity"], "garage dashboard is missing recent diagnostic activity list")
    assert_true(state["activityRenders"], "diagnostic activity list is not rendering an empty or populated state")
    assert_true(state["hasBackupCheckpoint"], "garage page is missing the Backup Checkpoint panel")
    assert_true(state["backupCheckpointCards"] == 3, "Garage Backup Checkpoint should expose three steps")
    assert_true(state["hasBackupCheckpointDownload"], "Garage Backup Checkpoint is missing the safety-copy download action")
    assert_true(state["hasBackupCheckpointChoose"], "Garage Backup Checkpoint is missing the choose-backup action")
    assert_true(state["hasBackupCheckpointRestore"], "Garage Backup Checkpoint is missing the restore-ready action")
    assert_true(state["backupCheckpointRestoreDisabled"], "Garage Backup Checkpoint restore action should start disabled")
    for phrase in ["Save A Safety Copy", "Choose The Backup File", "Restore After Preview"]:
        assert_true(phrase in state["backupCheckpointText"], f"Garage Backup Checkpoint is missing {phrase}")
    assert_true(state["hasMaintenanceNotes"], "garage dashboard is missing saved maintenance notes preview")
    assert_true(state["hasMaintenancePartsPreview"], "garage dashboard is missing maintenance parts staging preview")
    assert_true(state["hasMaintenanceNoteCopy"], "saved maintenance notes preview is missing Copy Latest")
    assert_true(state["hasMaintenancePartsCopy"], "saved maintenance notes preview is missing Copy Staging List")
    if state["maintenanceNotesEmpty"]:
        assert_true(state["maintenanceNoteCopyDisabled"], "saved maintenance notes Copy Latest should start disabled when no planner notes exist")
        assert_true(state["maintenancePartsCopyDisabled"], "saved maintenance notes Copy Staging List should start disabled when no planner notes exist")
    if state["maintenanceNotesPopulated"]:
        assert_true(not state["maintenanceNoteCopyDisabled"], "saved maintenance notes Copy Latest should enable when planner notes exist")
    assert_true(state["maintenanceNotesRender"], "saved maintenance notes preview is not rendering an empty or populated state")
    assert_true(state["maintenanceNoteHasRoutes"], "saved maintenance notes preview is missing planner routes")
    for key, message in [
        ("hasFilter", "diagnostic activity filter is missing"),
        ("hasCopy", "diagnostic activity copy summary button is missing"),
        ("hasActivityDownload", "diagnostic activity download button is missing"),
        ("hasBackupDownload", "garage backup download button is missing"),
        ("hasImport", "garage backup import input is missing"),
        ("hasChoose", "garage backup choose button is missing"),
        ("hasRestore", "garage backup restore button is missing"),
        ("restoreDisabled", "garage backup restore button should start disabled"),
        ("textHasActivityJson", "diagnostic activity JSON handoff note is missing"),
        ("textHasPhotoMetadata", "garage backup photo-metadata note is missing"),
        ("textHasRestoreNote", "garage backup restore note is missing"),
        ("textHasSafetyNote", "garage backup pre-restore safety note is missing"),
        ("textHasImageByteNote", "garage backup local-image-byte note is missing"),
        ("hasPreview", "garage backup preview surface is missing"),
        ("previewHidden", "garage backup preview should start hidden"),
        ("hasTemplate", "garage page is missing warning-light note template"),
        ("hasTemplateRoute", "warning-light template is missing diagnostics route"),
    ]:
        assert_true(state[key], message)
    assert_true(not state["missingFields"], f"warning-light template is missing fields: {state['missingFields']}")
    await page.evaluate("""() => {
        localStorage.removeItem('ridgeline-maintenance-custom-staging');
        localStorage.setItem('ridgeline-notes', JSON.stringify({
            general_notes: '[5/16/2026 - Maintenance Minder A1 planner]\\nMaintenance Minder A1:\\n- A: Replace engine oil.\\n- 1: Rotate tires.\\n[5/16/2026 - Oil Change Prep]\\nOil Change Prep:\\n- 0W-20 oil and final dipstick level check\\n[5/16/2026 - Battery Install Prep]\\nBattery Install Prep:\\n- Call shop before buying'
        }));
    }""")
    await page.reload()
    await page.wait_for_selector("#maintenance-note-preview [data-maintenance-note-preview]", state="attached")
    await page.wait_for_timeout(300)
    note_preview = await page.locator("#maintenance-note-preview [data-maintenance-note-preview]").inner_text()
    assert_true("Maintenance Minder A1 planner" in note_preview, "saved maintenance notes preview did not show Minder planner note")
    assert_true("Oil Change Prep" in note_preview, "saved maintenance notes preview did not show Service Prep note")
    populated_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const copyLatest = panel?.querySelector("[data-copy-maintenance-note]");
            const copyStaging = panel?.querySelector("[data-copy-maintenance-parts]");
            const copyNeeded = panel?.querySelector("[data-copy-maintenance-needed]");
            const partsPreview = panel?.querySelector("[data-maintenance-parts-preview]");
            const stagingCard = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging"));
            const itemButtons = panel ? [...panel.querySelectorAll("[data-copy-maintenance-note-index]")] : [];
            const stagingButtons = panel ? [...panel.querySelectorAll("[data-copy-maintenance-parts-index]")] : [];
            const stagingToggles = panel ? [...panel.querySelectorAll("[data-maintenance-staging-toggle]")] : [];
            const bulkButtons = panel ? [...panel.querySelectorAll("[data-maintenance-staging-bulk]")] : [];
            const groupBulkButtons = panel ? [...panel.querySelectorAll("[data-maintenance-staging-group-bulk]")] : [];
            const groupNeedButtons = panel ? [...panel.querySelectorAll("[data-copy-maintenance-needed-index]")] : [];
            const groupShareButtons = panel ? [...panel.querySelectorAll("[data-share-maintenance-needed-index]")] : [];
            const groupSaveButtons = panel ? [...panel.querySelectorAll("[data-save-maintenance-needed-index]")] : [];
            const shareButtons = panel ? [...panel.querySelectorAll("[data-share-maintenance-needed-inline]")] : [];
            const stagingRun = panel?.querySelector(".maintenance-staging-run");
            const stagingGuide = panel?.querySelector("[data-maintenance-staging-guide]");
            const inlineBuyButton = panel?.querySelector("[data-copy-maintenance-needed-inline]");
            const inlineCounterButton = panel?.querySelector(".maintenance-staging-run [data-maintenance-counter-mode]");
            const inlineShareButton = panel?.querySelector(".maintenance-staging-run [data-share-maintenance-needed-inline]");
            const inlineSaveBuyButton = panel?.querySelector(".maintenance-staging-run [data-save-maintenance-needed-inline]");
            const finalPartsPanel = panel?.querySelector("[data-maintenance-final-parts]");
            const stagingStateChips = panel ? [...panel.querySelectorAll(".maintenance-note-staging-state")].map((chip) => chip.textContent.trim()) : [];
            return {
                copyLatestEnabled: copyLatest?.disabled === false,
                copyStagingEnabled: copyStaging?.disabled === false,
                copyNeededEnabled: copyNeeded?.disabled === false,
                inlineBuyEnabled: inlineBuyButton?.disabled === false,
                inlineCounterEnabled: inlineCounterButton?.disabled === false,
                inlineShareEnabled: inlineShareButton?.disabled === false,
                inlineSaveBuyEnabled: inlineSaveBuyButton?.disabled === false,
                itemButtonCount: itemButtons.length,
                stagingButtonCount: stagingButtons.length,
                stagingToggleCount: stagingToggles.length,
                stagingToggleNeedText: stagingToggles.some((button) => button.textContent.includes("Need to buy")),
                stagingFilterCount: panel ? panel.querySelectorAll("[data-maintenance-staging-filter]").length : 0,
                stagingBulkButtonCount: bulkButtons.length,
                stagingGroupBulkButtonCount: groupBulkButtons.length,
                stagingGroupNeedButtonCount: groupNeedButtons.length,
                stagingGroupShareButtonCount: groupShareButtons.length,
                stagingGroupSaveButtonCount: groupSaveButtons.length,
                shareButtonCount: shareButtons.length,
                hasStagingRun: Boolean(stagingRun),
                stagingRunText: stagingRun?.innerText || "",
                hasFinalPartsPanel: Boolean(finalPartsPanel),
                finalPartsText: finalPartsPanel?.innerText || "",
                hasStagingGuide: Boolean(stagingGuide),
                stagingGuideText: stagingGuide?.innerText || "",
                stagingStateKeyEmpty: !localStorage.getItem("ridgeline-maintenance-staging-state"),
                dashboardStagingText: stagingCard?.innerText || "",
                hasStagingCard: Boolean(partsPreview?.querySelector(".maintenance-parts-card")),
                hasStagingText: partsPreview?.textContent.includes("0W-20 oil and final dipstick level check") &&
                    partsPreview?.textContent.includes("Rotate tires"),
                hasPartsSourceRoute: Boolean(partsPreview?.querySelector('a[href="#rockauto-parts"]')),
                hasPrepRoute: Boolean(panel?.querySelector('.maintenance-note-item a[href="maintenance.html#service-prep"]')),
                hasMinderRoute: Boolean(panel?.querySelector('.maintenance-note-item a[href="maintenance.html#minder-pocket-planner"]')),
                hasFullNoteRoute: Boolean(panel?.querySelector('.maintenance-note-item a[href="#notes"]')),
                hasStagingLineChip: stagingStateChips.some((text) => text.includes("staging line")),
                hasNoStagingChip: stagingStateChips.some((text) => text.includes("No staging lines detected"))
            };
        }"""
    )
    assert_true(populated_state["copyLatestEnabled"], "saved maintenance notes Copy Latest should enable after notes are present")
    assert_true(populated_state["copyStagingEnabled"], "saved maintenance notes Copy Staging List should enable after staging items are present")
    assert_true(populated_state["copyNeededEnabled"], "saved maintenance notes Copy Buy List should enable after staging items are present")
    assert_true(populated_state["inlineBuyEnabled"], "saved maintenance notes store-run summary should expose an enabled Copy Buy List")
    assert_true(populated_state["inlineCounterEnabled"], "saved maintenance notes store-run summary should expose an enabled Counter Mode")
    assert_true(populated_state["inlineShareEnabled"], "saved maintenance notes store-run summary should expose an enabled Share Buy List")
    assert_true(populated_state["inlineSaveBuyEnabled"], "saved maintenance notes store-run summary should expose an enabled Save Buy Note")
    assert_true(populated_state["itemButtonCount"] >= 2, "saved maintenance notes preview should expose per-note copy actions")
    assert_true(populated_state["stagingButtonCount"] >= 2, "saved maintenance notes preview should expose staging copy actions")
    assert_true(populated_state["stagingToggleCount"] >= 2, "saved maintenance notes preview should expose need-to-buy/staged toggles")
    assert_true(populated_state["stagingToggleNeedText"], "saved maintenance notes staging toggles should start as need-to-buy")
    assert_true(populated_state["stagingFilterCount"] == 3, "saved maintenance notes staging preview should expose All/Need/Staged filters")
    assert_true(populated_state["stagingBulkButtonCount"] == 2, "saved maintenance notes staging preview should expose bulk store-run controls")
    assert_true(populated_state["stagingGroupBulkButtonCount"] >= 4, "saved maintenance notes staging preview should expose per-note bulk controls")
    assert_true(populated_state["stagingGroupNeedButtonCount"] >= 2, "saved maintenance notes staging preview should expose per-note Copy Need controls")
    assert_true(populated_state["stagingGroupShareButtonCount"] >= 2, "saved maintenance notes staging preview should expose per-note Share Need controls")
    assert_true(populated_state["stagingGroupSaveButtonCount"] >= 2, "saved maintenance notes staging preview should expose per-note Save Need controls")
    assert_true(populated_state["shareButtonCount"] >= 1, "saved maintenance notes staging preview should expose Share Buy List")
    assert_true(populated_state["hasStagingRun"], "saved maintenance notes staging preview is missing the store-run summary")
    assert_true(populated_state["hasFinalPartsPanel"], "saved maintenance notes staging preview is missing the final part-number profile handoff")
    assert_true(populated_state["hasStagingGuide"], "saved maintenance notes staging preview is missing the local-only staging guide")
    assert_true("3 need to buy" in populated_state["stagingRunText"], "saved maintenance notes staging run summary should show need-to-buy count")
    assert_true("Save Confirmed Parts To Truck Profile" in populated_state["finalPartsText"], "final part-number handoff should clearly target Truck Profile")
    assert_true("3 staging lines from saved notes and one-off items" in populated_state["stagingGuideText"], "saved maintenance notes staging guide should show derived line count")
    assert_true("outside Garage backup and sync" in populated_state["stagingGuideText"], "saved maintenance notes staging guide should clarify local-only state")
    assert_true("1 saved note visible below did not include detected parts, tools, or supplies" in populated_state["stagingGuideText"], "saved maintenance notes staging guide should explain skipped notes")
    assert_true(populated_state["stagingStateKeyEmpty"], "saved maintenance notes staging state should start separate from seeded Garage notes")
    assert_true("3 need / 0 staged" in populated_state["dashboardStagingText"], "garage dashboard parts staging card should summarize need/staged counts")
    assert_true(populated_state["hasStagingCard"], "saved maintenance notes preview did not render the parts/supplies staging card")
    assert_true(populated_state["hasStagingText"], "saved maintenance notes preview did not derive expected staging items")
    assert_true(populated_state["hasPartsSourceRoute"], "maintenance staging card is missing the parts source route")
    assert_true(populated_state["hasPrepRoute"], "saved maintenance notes preview is missing Service Prep planner route on populated notes")
    assert_true(populated_state["hasMinderRoute"], "saved maintenance notes preview is missing Minder planner route on populated notes")
    assert_true(populated_state["hasFullNoteRoute"], "saved maintenance notes preview is missing the full notes route on populated notes")
    assert_true(populated_state["hasStagingLineChip"], "saved maintenance notes preview should mark notes that produce staging lines")
    assert_true(populated_state["hasNoStagingChip"], "saved maintenance notes preview should explain saved notes without detected staging lines")
    await page.locator("#maintenance-note-preview [data-copy-maintenance-note]").click()
    await page.wait_for_timeout(150)
    latest_status = await page.locator("#maintenance-note-preview [data-maintenance-note-status]").inner_text()
    assert_true("Copied Maintenance Minder A1 planner" in latest_status, "saved maintenance notes Copy Latest did not report the copied latest note")
    await page.locator("#maintenance-note-preview [data-copy-maintenance-note-index='1']").click()
    await page.wait_for_timeout(150)
    second_status = await page.locator("#maintenance-note-preview [data-maintenance-note-status]").inner_text()
    assert_true("Copied Oil Change Prep" in second_status, "saved maintenance note item copy did not report the copied note")
    await page.locator("#maintenance-note-preview [data-copy-maintenance-parts]").click()
    await page.wait_for_timeout(150)
    staging_status = await page.locator("#maintenance-note-preview [data-maintenance-note-status]").inner_text()
    assert_true("Copied maintenance staging list" in staging_status, "saved maintenance notes Copy Staging List did not report success")
    await page.locator("#maintenance-note-preview [data-copy-maintenance-needed-inline]").click()
    await page.wait_for_timeout(150)
    inline_need_status = await page.locator("#maintenance-note-preview [data-maintenance-note-status]").inner_text()
    assert_true("Copied need-to-buy list with 3 items" in inline_need_status, "inline store-run Copy Buy List did not report the initial need-to-buy count")
    await page.locator("#maintenance-note-preview .maintenance-staging-run [data-maintenance-counter-mode]").click()
    await page.wait_for_timeout(150)
    counter_mode_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const toggles = [...panel.querySelectorAll("[data-maintenance-staging-toggle]")];
            const counterPanel = panel.querySelector("[data-maintenance-counter-panel]");
            return {
                activeNeed: panel.querySelector("[data-maintenance-staging-filter='need']")?.getAttribute("aria-pressed"),
                visibleToggleCount: toggles.length,
                hasCounterPanel: Boolean(counterPanel),
                counterText: counterPanel?.innerText || "",
                hasMarkNext: Boolean(counterPanel?.querySelector("[data-maintenance-counter-mark-next]")),
                hasSkipNext: Boolean(counterPanel?.querySelector("[data-maintenance-counter-skip-next]")),
                hasCopyNext: Boolean(counterPanel?.querySelector("[data-maintenance-counter-copy-next]")),
                hasShareNext: Boolean(counterPanel?.querySelector("[data-maintenance-counter-share-next]")),
                status: panel.querySelector("[data-maintenance-note-status]")?.textContent || ""
            };
        }"""
    )
    assert_true(counter_mode_state["activeNeed"] == "true", "Counter Mode should switch the staging panel to the Need filter")
    assert_true(counter_mode_state["visibleToggleCount"] == 3, "Counter Mode should show the current need-to-buy staging items")
    assert_true(counter_mode_state["hasCounterPanel"], "Counter Mode should show the next-item counter panel")
    assert_true("Next Need-To-Buy Item" in counter_mode_state["counterText"], "Counter Mode panel should name the next need-to-buy item")
    assert_true("Item 1 of 3" in counter_mode_state["counterText"], "Counter Mode panel should show the current item position")
    assert_true("Next up:" in counter_mode_state["counterText"], "Counter Mode panel should preview the following need-to-buy line")
    assert_true("Replace engine oil" in counter_mode_state["counterText"] or "Rotate tires" in counter_mode_state["counterText"], "Counter Mode panel should surface the next current need-to-buy line")
    assert_true(counter_mode_state["hasMarkNext"], "Counter Mode panel should expose Mark Next Staged")
    assert_true(counter_mode_state["hasSkipNext"], "Counter Mode panel should expose Skip This Item")
    assert_true(counter_mode_state["hasCopyNext"], "Counter Mode panel should expose Copy Next Item")
    assert_true(counter_mode_state["hasShareNext"], "Counter Mode panel should expose Share Next Item")
    assert_true("Counter Mode is showing 3 need-to-buy items" in counter_mode_state["status"], "Counter Mode should report the need-to-buy count")
    await page.locator("#maintenance-note-preview [data-maintenance-counter-copy-next]").click()
    await page.wait_for_timeout(150)
    copy_next_status = await page.locator("#maintenance-note-preview [data-maintenance-note-status]").inner_text()
    assert_true("Copied next Counter Mode item" in copy_next_status, "Counter Mode Copy Next Item did not report success")
    await page.evaluate(
        """() => {
            window.__maintenanceNextSharePayload = null;
            Object.defineProperty(navigator, "share", {
                configurable: true,
                value: (payload) => {
                    window.__maintenanceNextSharePayload = payload;
                    return Promise.resolve();
                }
            });
        }"""
    )
    await page.locator("#maintenance-note-preview [data-maintenance-counter-share-next]").click()
    await page.wait_for_timeout(150)
    share_next_state = await page.evaluate(
        """() => ({
            status: document.querySelector("#maintenance-note-preview [data-maintenance-note-status]")?.textContent || "",
            title: window.__maintenanceNextSharePayload?.title || "",
            text: window.__maintenanceNextSharePayload?.text || ""
        })"""
    )
    assert_true("Shared next Counter Mode item" in share_next_state["status"], "Counter Mode Share Next Item did not report success")
    assert_true(share_next_state["title"] == "Ridgeline Counter Mode Next Item", "Counter Mode Share Next Item should use a clear share-sheet title")
    assert_true("Source note:" in share_next_state["text"], "Counter Mode Share Next Item should include the source saved-note title")
    assert_true("Confirm fitment against the receipt" in share_next_state["text"], "Counter Mode Share Next Item should include the final-fitment caution")
    await page.locator("#maintenance-note-preview [data-maintenance-counter-skip-next]").click()
    await page.wait_for_timeout(150)
    counter_skip_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const counterPanel = panel.querySelector("[data-maintenance-counter-panel]");
            const stagingCardText = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging"))?.innerText || "";
            return {
                counterText: counterPanel?.innerText || "",
                status: panel.querySelector("[data-maintenance-note-status]")?.textContent || "",
                hasResetSkips: Boolean(counterPanel?.querySelector("[data-maintenance-counter-reset-skips]")),
                stagingUnchanged: stagingCardText.includes("3 need / 0 staged")
            };
        }"""
    )
    assert_true("for this Counter Mode visit" in counter_skip_state["status"], "Counter Mode Skip This Item did not report a session-only skip")
    assert_true("Skips do not change saved Garage data" in counter_skip_state["counterText"], "Counter Mode skipped item note should state the data boundary")
    assert_true(counter_skip_state["hasResetSkips"], "Counter Mode should expose Reset Skips after skipping an item")
    assert_true(counter_skip_state["stagingUnchanged"], "Counter Mode Skip This Item should not mark staging data")
    await page.locator("#maintenance-note-preview [data-maintenance-counter-reset-skips]").click()
    await page.wait_for_timeout(150)
    reset_skip_status = await page.locator("#maintenance-note-preview [data-maintenance-note-status]").inner_text()
    assert_true("Original need-to-buy order is restored" in reset_skip_status, "Counter Mode Reset Skips did not report restored order")
    await page.locator("#maintenance-note-preview [data-maintenance-counter-mark-next]").click()
    await page.wait_for_timeout(150)
    counter_next_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const counterPanel = panel.querySelector("[data-maintenance-counter-panel]");
            const stagingCardText = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging"))?.innerText || "";
            return {
                activeNeed: panel.querySelector("[data-maintenance-staging-filter='need']")?.getAttribute("aria-pressed"),
                visibleToggleCount: panel.querySelectorAll("[data-maintenance-staging-toggle]").length,
                counterText: counterPanel?.innerText || "",
                hasUndo: Boolean(counterPanel?.querySelector("[data-maintenance-counter-undo]")),
                status: panel.querySelector("[data-maintenance-note-status]")?.textContent || "",
                dashboardUpdated: stagingCardText.includes("2 need / 1 staged")
            };
        }"""
    )
    assert_true(counter_next_state["activeNeed"] == "true", "Counter Mode should stay in the Need filter after marking the next item staged")
    assert_true(counter_next_state["visibleToggleCount"] == 2, "Counter Mode Mark Next should hide the newly staged line from the need view")
    assert_true("2 need-to-buy items remain" in counter_next_state["counterText"], "Counter Mode panel should update the remaining count after Mark Next")
    assert_true("Item 1 of 2" in counter_next_state["counterText"], "Counter Mode panel should update the position count after Mark Next")
    assert_true(counter_next_state["hasUndo"], "Counter Mode should expose Undo Last after Mark Next Staged")
    assert_true("Marked next Counter Mode item staged" in counter_next_state["status"], "Counter Mode Mark Next should report progress")
    assert_true(counter_next_state["dashboardUpdated"], "Counter Mode Mark Next should update the dashboard staging count")
    await page.locator("#maintenance-note-preview [data-maintenance-counter-undo]").click()
    await page.wait_for_timeout(150)
    counter_undo_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const counterPanel = panel.querySelector("[data-maintenance-counter-panel]");
            const stagingCardText = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging"))?.innerText || "";
            return {
                activeNeed: panel.querySelector("[data-maintenance-staging-filter='need']")?.getAttribute("aria-pressed"),
                visibleToggleCount: panel.querySelectorAll("[data-maintenance-staging-toggle]").length,
                counterText: counterPanel?.innerText || "",
                hasUndo: Boolean(counterPanel?.querySelector("[data-maintenance-counter-undo]")),
                status: panel.querySelector("[data-maintenance-note-status]")?.textContent || "",
                dashboardReset: stagingCardText.includes("3 need / 0 staged")
            };
        }"""
    )
    assert_true(counter_undo_state["activeNeed"] == "true", "Counter Mode Undo Last should keep the Need filter active")
    assert_true(counter_undo_state["visibleToggleCount"] == 3, "Counter Mode Undo Last should restore the item to the need view")
    assert_true("3 need-to-buy items remain" in counter_undo_state["counterText"], "Counter Mode panel should show restored need count after Undo Last")
    assert_true("Item 1 of 3" in counter_undo_state["counterText"], "Counter Mode panel should restore the position count after Undo Last")
    assert_true(not counter_undo_state["hasUndo"], "Counter Mode Undo Last should clear the undo action after use")
    assert_true("Undid the last Counter Mode item" in counter_undo_state["status"], "Counter Mode Undo Last should report the restored item")
    assert_true(counter_undo_state["dashboardReset"], "Counter Mode Undo Last should update the dashboard count")
    await page.locator("#maintenance-note-preview [data-maintenance-counter-mark-next]").click()
    await page.wait_for_timeout(150)
    await page.locator("#maintenance-note-preview [data-maintenance-counter-mark-next]").click()
    await page.wait_for_timeout(150)
    await page.locator("#maintenance-note-preview [data-maintenance-counter-mark-next]").click()
    await page.wait_for_timeout(150)
    counter_complete_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const counterPanel = panel.querySelector("[data-maintenance-counter-panel]");
            const stagingCardText = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging"))?.innerText || "";
            return {
                activeAll: panel.querySelector("[data-maintenance-staging-filter='all']")?.getAttribute("aria-pressed"),
                counterText: counterPanel?.innerText || "",
                hasUndo: Boolean(counterPanel?.querySelector("[data-maintenance-counter-undo]")),
                hasSaveRun: Boolean(counterPanel?.querySelector("[data-save-maintenance-run-inline]")),
                hasCopyStaged: Boolean(counterPanel?.querySelector("[data-copy-maintenance-staged-inline]")),
                hasShareStaged: Boolean(counterPanel?.querySelector("[data-share-maintenance-staged-inline]")),
                hasFinalParts: Boolean(counterPanel?.querySelector("[data-maintenance-counter-final-parts]")),
                hasDraftStaged: Boolean(counterPanel?.querySelector("[data-maintenance-counter-draft-staged]")),
                stagedFillEnabled: panel?.querySelector("[data-maintenance-final-parts-fill='staged']")?.disabled === false,
                needFillDisabled: panel?.querySelector("[data-maintenance-final-parts-fill='need']")?.disabled === true,
                status: panel.querySelector("[data-maintenance-note-status]")?.textContent || "",
                dashboardComplete: stagingCardText.includes("0 need / 3 staged")
            };
        }"""
    )
    assert_true(counter_complete_state["activeAll"] == "true", "Counter Mode completion should switch back to All so staged items remain visible")
    assert_true("All Need-To-Buy Items Are Staged" in counter_complete_state["counterText"], "Counter Mode completion panel should name the all-staged state")
    assert_true(counter_complete_state["hasUndo"], "Counter Mode completion panel should keep Undo Last available")
    assert_true(counter_complete_state["hasSaveRun"], "Counter Mode completion panel should expose Save Run Note")
    assert_true(counter_complete_state["hasCopyStaged"], "Counter Mode completion panel should expose Copy Staged List")
    assert_true(counter_complete_state["hasShareStaged"], "Counter Mode completion panel should expose Share Staged List")
    assert_true(counter_complete_state["hasFinalParts"], "Counter Mode completion panel should expose Open Final Parts")
    assert_true(counter_complete_state["hasDraftStaged"], "Counter Mode completion panel should expose Draft Staged Parts")
    assert_true(counter_complete_state["stagedFillEnabled"], "Final Part Numbers should allow drafting from staged lines after Counter Mode completion")
    assert_true(counter_complete_state["needFillDisabled"], "Final Part Numbers should disable need-list draft when no need-to-buy lines remain")
    assert_true("Marked the last Counter Mode item staged" in counter_complete_state["status"], "Counter Mode completion should report the last staged action")
    assert_true(counter_complete_state["dashboardComplete"], "Counter Mode completion should update the dashboard count to all staged")
    await page.locator("#maintenance-note-preview [data-copy-maintenance-staged-inline]").click()
    await page.wait_for_timeout(150)
    staged_copy_state = await page.evaluate(
        """() => ({
            status: document.querySelector("#maintenance-note-preview [data-maintenance-note-status]")?.textContent || ""
        })"""
    )
    assert_true("Copied staged list with 3 items" in staged_copy_state["status"], "Counter Mode completion Copy Staged List should report the staged count")
    await page.evaluate(
        """() => {
            window.__maintenanceSharePayload = null;
            Object.defineProperty(navigator, "share", {
                configurable: true,
                value: (payload) => {
                    window.__maintenanceSharePayload = payload;
                    return Promise.resolve();
                }
            });
        }"""
    )
    await page.locator("#maintenance-note-preview [data-share-maintenance-staged-inline]").click()
    await page.wait_for_timeout(150)
    staged_share_state = await page.evaluate(
        """() => ({
            status: document.querySelector("#maintenance-note-preview [data-maintenance-note-status]")?.textContent || "",
            title: window.__maintenanceSharePayload?.title || "",
            text: window.__maintenanceSharePayload?.text || ""
        })"""
    )
    assert_true("Shared staged list with 3 items" in staged_share_state["status"], "Counter Mode completion Share Staged List should report the staged count")
    assert_true(staged_share_state["title"] == "Ridgeline Staged Maintenance List", "Share Staged List should use a clear share-sheet title")
    assert_true("Ridgeline Staged Maintenance List" in staged_share_state["text"], "Share Staged List should share the staged export text")
    assert_true("Remaining items only" not in staged_share_state["text"], "Share Staged List should not use the need-to-buy export copy")
    assert_true("0W-20 oil and final dipstick level check" in staged_share_state["text"], "Share Staged List should include completed staged maintenance lines")
    await page.locator("#maintenance-note-preview [data-maintenance-counter-draft-staged]").click()
    await page.wait_for_timeout(150)
    staged_final_parts_state = await page.evaluate(
        """() => ({
            focusedFinalParts: document.activeElement?.matches("[data-maintenance-final-parts-input]") || false,
            draft: document.querySelector("#maintenance-note-preview [data-maintenance-final-parts-input]")?.value || "",
            status: document.querySelector("#maintenance-note-preview [data-maintenance-note-status]")?.textContent || ""
        })"""
    )
    assert_true(staged_final_parts_state["focusedFinalParts"], "Draft Staged Parts should focus the final part-number handoff input")
    assert_true("0W-20 oil and final dipstick level check" in staged_final_parts_state["draft"], "staged final-part helper should draft from completed Counter Mode lines")
    assert_true("Maintenance Minder A1 planner: Rotate tires" in staged_final_parts_state["draft"], "staged final-part helper should include all staged saved-note lines")
    assert_true("Drafted staged lines into Final Part Numbers" in staged_final_parts_state["status"], "Counter Mode staged draft shortcut should report its source")
    await page.locator("#maintenance-note-preview [data-maintenance-staging-filter='all']").click()
    await page.wait_for_timeout(150)
    await page.locator("#maintenance-note-preview [data-maintenance-staging-bulk='reset-staged']").click()
    await page.wait_for_timeout(150)
    await page.evaluate(
        """() => {
            window.__maintenanceSharePayload = null;
            Object.defineProperty(navigator, "share", {
                configurable: true,
                value: (payload) => {
                    window.__maintenanceSharePayload = payload;
                    return Promise.resolve();
                }
            });
        }"""
    )
    await page.locator("#maintenance-note-preview .maintenance-staging-run [data-share-maintenance-needed-inline]").click()
    await page.wait_for_timeout(150)
    share_state = await page.evaluate(
        """() => ({
            status: document.querySelector("#maintenance-note-preview [data-maintenance-note-status]")?.textContent || "",
            title: window.__maintenanceSharePayload?.title || "",
            text: window.__maintenanceSharePayload?.text || ""
        })"""
    )
    assert_true("Shared need-to-buy list with 3 items" in share_state["status"], "Share Buy List did not report the shared need-to-buy count")
    assert_true(share_state["title"] == "Ridgeline Need-To-Buy Maintenance List", "Share Buy List should use a clear share-sheet title")
    assert_true("Remaining items only" in share_state["text"], "Share Buy List should share the need-to-buy export text")
    assert_true("0W-20 oil and final dipstick level check" in share_state["text"], "Share Buy List should include derived maintenance staging lines")
    await page.locator("#maintenance-note-preview [data-maintenance-final-parts-fill='need']").click()
    await page.wait_for_timeout(150)
    final_parts_draft = await page.locator("#maintenance-note-preview [data-maintenance-final-parts-input]").input_value()
    assert_true("Maintenance Minder A1 planner: Rotate tires" in final_parts_draft, "final part-number helper should draft from current need-to-buy lines")
    await page.locator("#maintenance-note-preview [data-maintenance-final-parts-input]").fill("Oil filter: TEST-15400-PCX-004\nCabin filter: TEST-CABIN-80292")
    await page.locator("#maintenance-note-preview [data-maintenance-final-parts-save]").click()
    await page.wait_for_timeout(150)
    final_parts_state = await page.evaluate(
        """() => {
            const profile = JSON.parse(localStorage.getItem("ridgeline-truck-profile") || "{}");
            const profileText = document.querySelector("[data-profile-form] textarea[name='parts_notes']")?.value || "";
            const panel = document.querySelector("#maintenance-note-preview");
            return {
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                profileNotes: profile.parts_notes || "",
                profileText
            };
        }"""
    )
    assert_true("Saved final part-number notes into Truck Profile" in final_parts_state["status"], "final part-number save should report Truck Profile persistence")
    assert_true("Maintenance Final Part Numbers" in final_parts_state["profileNotes"], "final part-number save should append a Truck Profile parts note block")
    assert_true("Oil filter: TEST-15400-PCX-004" in final_parts_state["profileNotes"], "final part-number save should preserve user-entered part numbers")
    assert_true("User-entered from Garage staging" in final_parts_state["profileNotes"], "final part-number save should preserve the user-entered/source boundary")
    assert_true("Oil filter: TEST-15400-PCX-004" in final_parts_state["profileText"], "Truck Profile form should hydrate after final part-number save")
    await page.locator("#maintenance-note-preview [data-copy-maintenance-needed-index]").first.click()
    await page.wait_for_timeout(150)
    group_need_status = await page.locator("#maintenance-note-preview [data-maintenance-note-status]").inner_text()
    assert_true("Copied saved-note buy list with 2 items" in group_need_status, "per-note Copy Need did not report the saved-note need-to-buy count")
    await page.locator("#maintenance-note-preview [data-share-maintenance-needed-index]").first.click()
    await page.wait_for_timeout(150)
    group_share_state = await page.evaluate(
        """() => ({
            status: document.querySelector("#maintenance-note-preview [data-maintenance-note-status]")?.textContent || "",
            title: window.__maintenanceSharePayload?.title || "",
            text: window.__maintenanceSharePayload?.text || ""
        })"""
    )
    assert_true("Shared saved-note buy list with 2 items" in group_share_state["status"], "per-note Share Need did not report the saved-note need-to-buy count")
    assert_true("Maintenance Minder A1 planner" in group_share_state["title"], "per-note Share Need should name the saved planner in the share-sheet title")
    assert_true("Rotate tires" in group_share_state["text"], "per-note Share Need should include that saved note's needed lines")
    assert_true("0W-20 oil and final dipstick level check" not in group_share_state["text"], "per-note Share Need should not include other saved notes")
    await page.locator("#maintenance-note-preview [data-save-maintenance-needed-index]").first.click()
    await page.wait_for_timeout(150)
    group_save_state = await page.evaluate(
        """() => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}").general_notes || "";
            const panel = document.querySelector("#maintenance-note-preview");
            return {
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                notes,
                noteCount: panel?.querySelectorAll(".maintenance-note-item").length || 0
            };
        }"""
    )
    assert_true("Saved Maintenance Minder A1 planner buy note with 2 need-to-buy items into Garage Notes" in group_save_state["status"], "per-note Save Need did not report the saved-note need-to-buy count")
    assert_true("Job Buy List" in group_save_state["notes"], "per-note Save Need did not prepend a Garage job buy-list block")
    assert_true("Source saved note: Maintenance Minder A1 planner" in group_save_state["notes"], "per-note Save Need should record the source saved note")
    assert_true(group_save_state["noteCount"] == 3, "per-note Save Need should not create another parsed maintenance planner card")
    await page.locator("#maintenance-note-preview [data-maintenance-staging-toggle]").first.click()
    await page.wait_for_timeout(150)
    toggled_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const firstToggle = panel?.querySelector("[data-maintenance-staging-toggle]");
            const partsText = panel?.querySelector("[data-maintenance-parts-preview]")?.innerText || "";
            const stagingCardText = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging"))?.innerText || "";
            const storage = JSON.parse(localStorage.getItem("ridgeline-maintenance-staging-state") || "{}");
            return {
                pressed: firstToggle?.getAttribute("aria-pressed"),
                text: firstToggle?.textContent || "",
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                hasStagedCount: partsText.includes("1/"),
                dashboardUpdated: stagingCardText.includes("2 need / 1 staged"),
                storedCount: Object.keys(storage).length
            };
        }"""
    )
    assert_true(toggled_state["pressed"] == "true", "staging toggle should become pressed after marking item staged")
    assert_true("Staged" in toggled_state["text"], "staging toggle should report Staged after click")
    assert_true("already staged" in toggled_state["status"], "staging toggle status should report staged state")
    assert_true(toggled_state["hasStagedCount"], "maintenance staging group should show staged-count progress after toggle")
    assert_true(toggled_state["dashboardUpdated"], "garage dashboard parts staging card should update after a staging toggle")
    assert_true(toggled_state["storedCount"] >= 1, "maintenance staging state should persist outside the Garage notes object")
    await page.locator("#maintenance-note-preview [data-maintenance-staging-filter='need']").click()
    await page.wait_for_timeout(150)
    need_filter_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const toggles = [...panel.querySelectorAll("[data-maintenance-staging-toggle]")];
            return {
                activeNeed: panel.querySelector("[data-maintenance-staging-filter='need']")?.getAttribute("aria-pressed"),
                visibleToggleCount: toggles.length,
                hasStagedToggle: toggles.some((button) => button.textContent.includes("Staged")),
                status: panel.querySelector("[data-maintenance-note-status]")?.textContent || ""
            };
        }"""
    )
    assert_true(need_filter_state["activeNeed"] == "true", "maintenance staging Need filter should become active")
    assert_true(need_filter_state["visibleToggleCount"] == 2, "maintenance staging Need filter should hide the staged line")
    assert_true(not need_filter_state["hasStagedToggle"], "maintenance staging Need filter should not show staged toggles")
    assert_true("need-to-buy staging items" in need_filter_state["status"], "maintenance staging Need filter should report the active filter")
    await page.locator("#maintenance-note-preview [data-maintenance-staging-filter='staged']").click()
    await page.wait_for_timeout(150)
    staged_filter_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const toggles = [...panel.querySelectorAll("[data-maintenance-staging-toggle]")];
            return {
                activeStaged: panel.querySelector("[data-maintenance-staging-filter='staged']")?.getAttribute("aria-pressed"),
                visibleToggleCount: toggles.length,
                hasStagedToggle: toggles.some((button) => button.textContent.includes("Staged"))
            };
        }"""
    )
    assert_true(staged_filter_state["activeStaged"] == "true", "maintenance staging Staged filter should become active")
    assert_true(staged_filter_state["visibleToggleCount"] == 1, "maintenance staging Staged filter should show only the staged line")
    assert_true(staged_filter_state["hasStagedToggle"], "maintenance staging Staged filter should show the staged toggle")
    await page.locator("#maintenance-note-preview [data-copy-maintenance-needed]").click()
    await page.wait_for_timeout(150)
    need_status = await page.locator("#maintenance-note-preview [data-maintenance-note-status]").inner_text()
    assert_true("Copied need-to-buy list with 2 items" in need_status, "saved maintenance notes Copy Buy List did not report the remaining need-to-buy count")
    await page.locator("#maintenance-note-preview [data-save-maintenance-needed-inline]").first.click()
    await page.wait_for_timeout(150)
    saved_buy_state = await page.evaluate(
        """() => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}").general_notes || "";
            const panel = document.querySelector("#maintenance-note-preview");
            return {
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                notes,
                stillHasToggle: Boolean(panel?.querySelector("[data-maintenance-staging-toggle]"))
            };
        }"""
    )
    assert_true("Saved buy note with 2 need-to-buy items into Garage Notes" in saved_buy_state["status"], "Save Buy Note did not report the remaining need-to-buy count")
    assert_true("Maintenance Buy List" in saved_buy_state["notes"], "Save Buy Note did not prepend a Garage maintenance buy-list block")
    assert_true("Ridgeline Need-To-Buy Maintenance List" in saved_buy_state["notes"], "saved buy note is missing the need-to-buy export text")
    assert_true("Remaining items only" in saved_buy_state["notes"], "saved buy note should preserve the remaining-items context")
    assert_true("Need/Staged toggles remain local browser state outside Garage backup and sync" in saved_buy_state["notes"], "saved buy note should preserve the local-only staging boundary")
    assert_true(saved_buy_state["stillHasToggle"], "Save Buy Note should not remove the interactive staging checklist")
    await page.locator("#maintenance-note-preview [data-save-maintenance-run-inline]").first.click()
    await page.wait_for_timeout(150)
    saved_run_state = await page.evaluate(
        """() => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}").general_notes || "";
            const panel = document.querySelector("#maintenance-note-preview");
            return {
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                notes,
                stillHasToggle: Boolean(panel?.querySelector("[data-maintenance-staging-toggle]"))
            };
        }"""
    )
    assert_true("Saved staging run note with 3 items into Garage Notes" in saved_run_state["status"], "Save Run Note did not report the saved staging count")
    assert_true("Maintenance Staging Run" in saved_run_state["notes"], "Save Run Note did not prepend a Garage maintenance staging run block")
    assert_true("Ridgeline Maintenance Staging List" in saved_run_state["notes"], "saved staging run note is missing the staging export text")
    assert_true("Need/Staged toggles remain local browser state outside Garage backup and sync" in saved_run_state["notes"], "saved staging run note should preserve the local-only staging boundary")
    assert_true(saved_run_state["stillHasToggle"], "Save Run Note should not remove the interactive staging checklist")
    await page.reload()
    await page.wait_for_selector("#maintenance-note-preview [data-maintenance-staging-toggle]", state="attached")
    reloaded_toggle = await page.locator("#maintenance-note-preview [data-maintenance-staging-toggle]").first.inner_text()
    assert_true("Staged" in reloaded_toggle, "staging toggle state should survive a Garage reload")
    await page.locator("#maintenance-note-preview [data-maintenance-staging-bulk='stage-needed']").click()
    await page.wait_for_timeout(150)
    bulk_stage_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const stagingCardText = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging"))?.innerText || "";
            return {
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                runText: panel?.querySelector(".maintenance-staging-run")?.innerText || "",
                inlineBuyDisabled: panel?.querySelector("[data-copy-maintenance-needed-inline]")?.disabled === true,
                inlineSaveBuyDisabled: panel?.querySelector("[data-save-maintenance-needed-inline]")?.disabled === true,
                stageNeededDisabled: panel?.querySelector("[data-maintenance-staging-bulk='stage-needed']")?.disabled === true,
                resetEnabled: panel?.querySelector("[data-maintenance-staging-bulk='reset-staged']")?.disabled === false,
                dashboardUpdated: stagingCardText.includes("0 need / 3 staged")
            };
        }"""
    )
    assert_true("Marked 2 need-to-buy items as staged" in bulk_stage_state["status"], "bulk stage-needed control did not report the changed count")
    assert_true("0 need to buy" in bulk_stage_state["runText"], "bulk stage-needed control should update the run summary")
    assert_true(bulk_stage_state["inlineBuyDisabled"], "inline Copy Buy List should disable when no need-to-buy items remain")
    assert_true(bulk_stage_state["inlineSaveBuyDisabled"], "inline Save Buy Note should disable when no need-to-buy items remain")
    assert_true(bulk_stage_state["stageNeededDisabled"], "bulk stage-needed control should disable when no need-to-buy items remain")
    assert_true(bulk_stage_state["resetEnabled"], "bulk reset control should enable when staged items exist")
    assert_true(bulk_stage_state["dashboardUpdated"], "garage dashboard parts staging card should update after bulk staging")
    await page.locator("#maintenance-note-preview [data-maintenance-staging-bulk='reset-staged']").click()
    await page.wait_for_timeout(150)
    bulk_reset_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const stagingCardText = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging"))?.innerText || "";
            return {
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                runText: panel?.querySelector(".maintenance-staging-run")?.innerText || "",
                inlineBuyEnabled: panel?.querySelector("[data-copy-maintenance-needed-inline]")?.disabled === false,
                inlineSaveBuyEnabled: panel?.querySelector("[data-save-maintenance-needed-inline]")?.disabled === false,
                needEnabled: panel?.querySelector("[data-maintenance-staging-bulk='stage-needed']")?.disabled === false,
                resetDisabled: panel?.querySelector("[data-maintenance-staging-bulk='reset-staged']")?.disabled === true,
                dashboardUpdated: stagingCardText.includes("3 need / 0 staged")
            };
        }"""
    )
    assert_true("Reset 3 staged items to need to buy" in bulk_reset_state["status"], "bulk reset control did not report the changed count")
    assert_true("3 need to buy" in bulk_reset_state["runText"], "bulk reset control should update the run summary")
    assert_true(bulk_reset_state["inlineBuyEnabled"], "inline Copy Buy List should re-enable after reset")
    assert_true(bulk_reset_state["inlineSaveBuyEnabled"], "inline Save Buy Note should re-enable after reset")
    assert_true(bulk_reset_state["needEnabled"], "bulk stage-needed control should re-enable after reset")
    assert_true(bulk_reset_state["resetDisabled"], "bulk reset control should disable after all items return to need-to-buy")
    assert_true(bulk_reset_state["dashboardUpdated"], "garage dashboard parts staging card should update after bulk reset")
    await page.locator("#maintenance-note-preview [data-maintenance-staging-group-bulk='stage-needed']").first.click()
    await page.wait_for_timeout(150)
    group_stage_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const firstGroup = panel?.querySelector(".maintenance-parts-group");
            return {
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                groupText: firstGroup?.innerText || "",
                stageDisabled: firstGroup?.querySelector("[data-maintenance-staging-group-bulk='stage-needed']")?.disabled === true,
                resetEnabled: firstGroup?.querySelector("[data-maintenance-staging-group-bulk='reset-staged']")?.disabled === false
            };
        }"""
    )
    assert_true("Marked" in group_stage_state["status"] and "as staged" in group_stage_state["status"], "per-note bulk stage control did not report staged items")
    assert_true("/" in group_stage_state["groupText"] and "staged" in group_stage_state["groupText"], "per-note bulk stage control should keep the group count visible")
    assert_true(group_stage_state["stageDisabled"], "per-note bulk stage control should disable when the group is fully staged")
    assert_true(group_stage_state["resetEnabled"], "per-note reset control should enable after staging the group")
    await page.locator("#maintenance-note-preview [data-maintenance-staging-group-bulk='reset-staged']").first.click()
    await page.wait_for_timeout(150)
    group_reset_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const firstGroup = panel?.querySelector(".maintenance-parts-group");
            return {
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                stageEnabled: firstGroup?.querySelector("[data-maintenance-staging-group-bulk='stage-needed']")?.disabled === false,
                resetDisabled: firstGroup?.querySelector("[data-maintenance-staging-group-bulk='reset-staged']")?.disabled === true
            };
        }"""
    )
    assert_true("Reset" in group_reset_state["status"] and "to need to buy" in group_reset_state["status"], "per-note reset control did not report reset items")
    assert_true(group_reset_state["stageEnabled"], "per-note bulk stage control should re-enable after group reset")
    assert_true(group_reset_state["resetDisabled"], "per-note reset control should disable after group reset")
    await page.locator("#maintenance-note-preview [data-copy-maintenance-parts-index='1']").first.click()
    await page.wait_for_timeout(150)
    item_staging_status = await page.locator("#maintenance-note-preview [data-maintenance-note-status]").inner_text()
    assert_true("Copied staging list for this saved note" in item_staging_status, "saved maintenance note item staging copy did not report success")
    await page.locator("#maintenance-note-preview [data-maintenance-custom-staging-kit='Oil run']").click()
    await page.wait_for_timeout(150)
    custom_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const stagingCardText = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging"))?.innerText || "";
            const customItems = JSON.parse(localStorage.getItem("ridgeline-maintenance-custom-staging") || "[]");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}").general_notes || "";
            return {
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                text: panel?.querySelector("[data-maintenance-parts-preview]")?.innerText || "",
                dashboardUpdated: stagingCardText.includes("7 need / 0 staged"),
                customCount: customItems.length,
                customOutsideNotes: !notes.includes("Shop towels"),
                hasRemove: Boolean(panel?.querySelector("[data-maintenance-custom-staging-remove]")),
                hasClear: Boolean(panel?.querySelector("[data-maintenance-custom-staging-clear]")),
                suggestionCount: panel?.querySelectorAll("[data-maintenance-custom-staging-suggestion]").length || 0,
                kitCount: panel?.querySelectorAll("[data-maintenance-custom-staging-kit]").length || 0,
                hasOilKit: Boolean(panel?.querySelector("[data-maintenance-custom-staging-kit='Oil run']"))
            };
        }"""
    )
    assert_true("Added 4 Oil run items to the local-only staging list" in custom_state["status"], "custom one-off quick kit did not report add success")
    assert_true("One-Off Store Items" in custom_state["text"] and "Shop towels" in custom_state["text"] and "Drain pan" in custom_state["text"], "custom one-off quick kit did not render in the staging list")
    assert_true(custom_state["dashboardUpdated"], "custom one-off quick kit should update the dashboard staging count")
    assert_true(custom_state["customCount"] == 4, "custom one-off quick kit should persist in the local-only helper key")
    assert_true(custom_state["customOutsideNotes"], "custom one-off quick kit should not be written into Garage notes")
    assert_true(custom_state["hasRemove"], "custom one-off staging item should expose a remove control")
    assert_true(custom_state["hasClear"], "custom one-off staging items should expose a clear-all control")
    assert_true(custom_state["suggestionCount"] >= 6, "custom one-off staging quick-add suggestions should render")
    assert_true(custom_state["kitCount"] >= 4 and custom_state["hasOilKit"], "custom one-off staging quick kits should render")
    await page.locator("#maintenance-note-preview [data-maintenance-custom-staging-clear]").click()
    await page.wait_for_timeout(150)
    clear_custom_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#maintenance-note-preview");
            const stagingCardText = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging"))?.innerText || "";
            const customItems = JSON.parse(localStorage.getItem("ridgeline-maintenance-custom-staging") || "[]");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}").general_notes || "";
            return {
                status: panel?.querySelector("[data-maintenance-note-status]")?.textContent || "",
                text: panel?.querySelector("[data-maintenance-parts-preview]")?.innerText || "",
                dashboardReset: stagingCardText.includes("3 need / 0 staged"),
                customCount: customItems.length,
                customOutsideNotes: !notes.includes("Shop towels")
            };
        }"""
    )
    assert_true("Cleared 4 one-off store items" in clear_custom_state["status"], "custom one-off clear control did not report cleared item count")
    assert_true(clear_custom_state["customCount"] == 0, "custom one-off clear control should empty the local-only helper key")
    assert_true("One-Off Store Items" not in clear_custom_state["text"], "custom one-off clear control should remove the one-off group from the staging list")
    assert_true(clear_custom_state["dashboardReset"], "custom one-off clear control should restore dashboard staging counts")
    assert_true(clear_custom_state["customOutsideNotes"], "custom one-off clear control should not write helper items into Garage notes")
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    await page.locator("#maintenance-note-preview .maintenance-staging-run [data-maintenance-counter-mode]").click()
    await page.wait_for_timeout(150)
    garage_mobile_state = await page.evaluate(
        """() => {
            const preview = document.querySelector("#maintenance-note-preview [data-maintenance-note-preview]");
            const partsPreview = document.querySelector("#maintenance-note-preview [data-maintenance-parts-preview] .maintenance-parts-groups");
            const counterPanel = document.querySelector("#maintenance-note-preview [data-maintenance-counter-panel]");
            const backupCheckpoint = document.querySelector("#diagnostic-activity [data-garage-backup-checkpoint]");
            const counterStyle = counterPanel ? getComputedStyle(counterPanel) : null;
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            const columns = preview ? getComputedStyle(preview).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const partsColumns = partsPreview ? getComputedStyle(partsPreview).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const backupCheckpointColumns = backupCheckpoint ? getComputedStyle(backupCheckpoint).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            return {
                overflow: width > document.documentElement.clientWidth + 1,
                columns,
                partsColumns,
                backupCheckpointColumns,
                counterSticky: counterStyle?.position === "sticky",
                hasCounterSkipNext: Boolean(counterPanel?.querySelector("[data-maintenance-counter-skip-next]")),
                hasCounterCopyNext: Boolean(counterPanel?.querySelector("[data-maintenance-counter-copy-next]")),
                hasCounterShareNext: Boolean(counterPanel?.querySelector("[data-maintenance-counter-share-next]")),
                hasContextRoute: Boolean(document.querySelector('.context-action[href="#maintenance-note-preview"]'))
            };
        }"""
    )
    assert_true(not garage_mobile_state["overflow"], "saved maintenance notes preview introduced garage mobile horizontal overflow")
    assert_true(garage_mobile_state["backupCheckpointColumns"] == 1, "Garage Backup Checkpoint should stack to one column on iPhone width")
    assert_true(garage_mobile_state["columns"] == 1, "saved maintenance notes preview should stack to one column on iPhone width")
    assert_true(garage_mobile_state["partsColumns"] == 1, "maintenance staging preview should stack to one column on iPhone width")
    assert_true(garage_mobile_state["counterSticky"], "Counter Mode panel should stay sticky on iPhone width")
    assert_true(garage_mobile_state["hasCounterSkipNext"], "Counter Mode mobile panel is missing Skip This Item")
    assert_true(garage_mobile_state["hasCounterCopyNext"], "Counter Mode mobile panel is missing Copy Next Item")
    assert_true(garage_mobile_state["hasCounterShareNext"], "Counter Mode mobile panel is missing Share Next Item")
    assert_true(garage_mobile_state["hasContextRoute"], "garage contextual bottom bar is missing the staging route")
    await page.locator('.context-action[href="#maintenance-note-preview"]').click()
    await page.wait_for_timeout(700)
    staging_nav_state = await page.evaluate(
        """() => {
            const target = document.querySelector("#maintenance-note-preview");
            return {
                hash: window.location.hash,
                targetHeight: target?.getBoundingClientRect().height || 0,
                targetTop: target?.getBoundingClientRect().top || 0
            };
        }"""
    )
    assert_true(staging_nav_state["hash"] == "#maintenance-note-preview", "garage staging bottom-bar route did not update the hash")
    assert_true(staging_nav_state["targetHeight"] > 0, "garage staging bottom-bar route landed on a missing or collapsed target")
    assert_true(staging_nav_state["targetTop"] >= 0, "garage staging bottom-bar route landed above the visible viewport")


async def set_search_query(page, query):
    await page.evaluate(
        """(query) => {
            const input = document.querySelector("#site-search-input");
            input.value = query;
            input.dispatchEvent(new Event("input", { bubbles: true }));
        }""",
        query,
    )
    await page.wait_for_timeout(900)
    return await page.locator("#site-search-results").inner_text()


async def run_overlay_checks(page, page_name):
    await page.locator("[data-open-search]").first.focus()
    await page.locator("[data-open-search]").first.click()
    await page.wait_for_timeout(300)
    assert_true(not await page.locator(".search-modal").first.evaluate("node => node.hidden"), "search modal did not open")
    active_id = await page.evaluate("() => document.activeElement?.id || ''")
    assert_true(active_id == "site-search-input", "search input did not receive focus")
    await assert_focus_trap(page, ".search-modal", "search modal")
    quick_state = await page.evaluate(
        """() => {
            const grid = document.querySelector(".search-situation-grid");
            const offlineCard = document.querySelector("[data-search-offline-card]");
            const required = [
                "quick-sheet.html#roadside-router",
                "diagnostics.html#no-start-workflow",
                "diagnostics.html#warning-light-workflow",
                "diagnostics.html#accessory-power-workflow",
                "diagnostics.html#trailer-light-workflow",
                "garage.html#maintenance-note-preview"
            ];
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasGrid: Boolean(grid),
                hasOfflineCard: Boolean(offlineCard),
                offlineText: offlineCard?.textContent || "",
                offlineMissing: [
                    "quick-sheet.html#roadside-action-stack",
                    "diagnostics.html#workflow-index",
                    "hood.html#fuses",
                    "quick-sheet.html#emergency-card",
                    "garage.html#diagnostic-activity"
                ].filter((href) => !offlineCard?.querySelector(`a[href="${href}"]`)),
                hasOfflineRefresh: Boolean(offlineCard?.querySelector("[data-search-refresh-pack]")),
                hasOfflineStatus: Boolean(offlineCard?.querySelector("[data-search-refresh-status]")),
                hasOfflinePrep: Boolean(offlineCard?.querySelector(".search-offline-prep")),
                prepSteps: offlineCard?.querySelectorAll(".search-offline-prep li").length || 0,
                cardCount: grid?.querySelectorAll("a").length || 0,
                missing: required.filter((href) => !grid?.querySelector(`a[href="${href}"]`)),
                text: grid?.textContent || "",
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(quick_state["hasGrid"], "search modal is missing the common situations grid")
    assert_true(quick_state["hasOfflineCard"], "search modal is missing the offline launch pad")
    assert_true("Offline pack" in quick_state["offlineText"], "search offline launch pad should show offline pack status")
    assert_true("Before Signal Drops" in quick_state["offlineText"], "search offline launch pad should include signal-loss prep")
    assert_true("Print Sheet" in quick_state["offlineText"], "search offline launch pad should include the Quick Sheet print route")
    assert_true("Roadside" in quick_state["offlineText"], "search offline launch pad should include Roadside")
    assert_true("Garage Backup" in quick_state["offlineText"], "search offline launch pad should include Garage Backup")
    assert_true(not quick_state["offlineMissing"], f"search offline launch pad is missing routes: {quick_state['offlineMissing']}")
    assert_true(quick_state["hasOfflineRefresh"], "search offline launch pad is missing refresh-pack action")
    assert_true(quick_state["hasOfflineStatus"], "search offline launch pad is missing live refresh status")
    assert_true(quick_state["hasOfflinePrep"], "search offline launch pad is missing the signal-loss prep checklist")
    assert_true(quick_state["prepSteps"] == 3, "search signal-loss prep should expose three steps")
    assert_true(quick_state["cardCount"] == 6, "search common situations grid should expose six routes")
    assert_true(not quick_state["missing"], f"search common situations grid is missing routes: {quick_state['missing']}")
    for phrase in ["Roadside", "No start", "Warning light", "12V power", "Trailer lights", "Parts run"]:
        assert_true(phrase in quick_state["text"], f"search common situations grid is missing {phrase}")
    assert_true(not quick_state["overflow"], "search common situations grid introduced horizontal overflow")
    await page.locator("[data-search-refresh-pack]").click()
    await page.wait_for_timeout(450)
    refresh_status = await page.locator("[data-search-refresh-status]").inner_text()
    assert_true("Offline pack" in refresh_status or "Could not update" in refresh_status, "search refresh-pack action did not report status")
    await set_search_query(page, "fuse")
    result_count = await page.locator("#site-search-results > *").count()
    assert_true(result_count > 0, "search returned no results for fuse")
    for query, expected in SEARCH_EXPECTATIONS.items():
        text = await set_search_query(page, query)
        assert_true(expected in text, f"{query} did not surface {expected}")
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(150)
    assert_true(await page.locator(".search-modal").first.evaluate("node => node.hidden"), "Escape did not close search modal")
    opener_focused = await page.evaluate("() => document.activeElement?.matches('[data-open-search]') || false")
    assert_true(opener_focused, "search focus did not return to opener")
    await assert_scroll_unlocked(page, "search close")

    await page.locator("[data-open-site-menu]").first.focus()
    await page.locator("[data-open-site-menu]").first.click()
    await page.wait_for_timeout(300)
    assert_true(not await page.locator("#site-menu").evaluate("node => node.hidden"), "site menu did not open")
    assert_true(await page.locator(".site-menu-link").count() >= 5, "site menu has too few links")
    menu_contains_focus = await page.evaluate("() => document.querySelector('#site-menu')?.contains(document.activeElement) || false")
    assert_true(menu_contains_focus, "site menu did not receive focus")
    await assert_focus_trap(page, "#site-menu", "site menu")
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(150)
    assert_true(await page.locator("#site-menu").evaluate("node => node.hidden"), "Escape did not close site menu")
    menu_opener_focused = await page.evaluate("() => document.activeElement?.matches('[data-open-site-menu]') || false")
    assert_true(menu_opener_focused, "site menu focus did not return to opener")
    await assert_scroll_unlocked(page, "site menu close")

    await page.locator("[data-open-site-menu]").first.focus()
    await page.keyboard.press("Control+Shift+K")
    await page.wait_for_timeout(250)
    assert_true(not await page.locator(".command-palette").evaluate("node => node.hidden"), "command palette did not open")
    command_focused = await page.evaluate("() => document.activeElement?.matches('.command-input') || false")
    assert_true(command_focused, "command palette input did not receive focus")
    await assert_focus_trap(page, ".command-palette", "command palette")
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(150)
    assert_true(await page.locator(".command-palette").evaluate("node => node.hidden"), "Escape did not close command palette")
    await assert_scroll_unlocked(page, "command palette close")

    await page.locator(".quick-capture-fab").focus()
    await page.locator(".quick-capture-fab").click()
    await page.wait_for_timeout(250)
    assert_true(not await page.locator(".quick-capture-modal").evaluate("node => node.hidden"), "quick capture modal did not open")
    quick_focused = await page.evaluate("() => document.activeElement?.matches('.quick-capture-modal input[name=\"title\"]') || false")
    assert_true(quick_focused, "quick capture title input did not receive focus")
    await assert_focus_trap(page, ".quick-capture-modal", "quick capture modal")
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(150)
    assert_true(await page.locator(".quick-capture-modal").evaluate("node => node.hidden"), "Escape did not close quick capture modal")
    quick_opener_focused = await page.evaluate("() => document.activeElement?.matches('.quick-capture-fab') || false")
    assert_true(quick_opener_focused, "quick capture focus did not return to opener")
    await assert_scroll_unlocked(page, "quick capture close")

    sync_selector = "[data-page-action='sync-settings'], [data-context-action='sync-settings']"
    await page.locator(sync_selector).first.focus()
    await page.locator(sync_selector).first.click()
    await page.wait_for_timeout(650)
    assert_true(not await page.locator(".sync-settings-modal").evaluate("node => node.hidden"), "sync settings modal did not open")
    sync_contains_focus = await page.evaluate("() => document.querySelector('.sync-settings-modal')?.contains(document.activeElement) || false")
    assert_true(sync_contains_focus, "sync settings did not receive focus")
    await assert_focus_trap(page, ".sync-settings-modal", "sync settings modal")
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(150)
    assert_true(await page.locator(".sync-settings-modal").evaluate("node => node.hidden"), "Escape did not close sync settings modal")
    await assert_scroll_unlocked(page, "sync settings close")


async def assert_section_navigation(page):
    state = await page.evaluate(
        """() => {
            const link = [...document.querySelectorAll(".section-utility-nav a[href^='#'], .topnav a[href^='#']")]
                .find((candidate) => candidate.hash && document.querySelector(candidate.hash));
            if (!link) {
                return { found: false };
            }
            const expectedHash = link.hash;
            link.click();
            return { found: true, expectedHash };
        }"""
    )
    assert_true(state["found"], "missing usable in-page section link")
    await page.wait_for_timeout(700)
    nav_state = await page.evaluate(
        """(expectedHash) => {
            const target = document.querySelector(expectedHash);
            return {
                hash: window.location.hash,
                targetHeight: target ? target.getBoundingClientRect().height : 0
            };
        }""",
        state["expectedHash"],
    )
    assert_true(nav_state["hash"] == state["expectedHash"], "section link did not update the hash")
    assert_true(nav_state["targetHeight"] > 0, "section target is missing or collapsed after navigation")
    await assert_scroll_unlocked(page, "section navigation")


async def smoke_page(context, root, page_name):
    page_path = (Path(root) / page_name).resolve()
    assert_true(page_path.is_file(), f"Cannot smoke-test missing page '{page_name}'.")

    page = await context.new_page()
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.goto(page_path.as_uri(), wait_until="load")
    await page.wait_for_timeout(1200)

    await assert_page_ready(page, page_name)
    await assert_current_page_navigation(page, page_name)
    await assert_support_status_badges(page, page_name)
    await assert_home_anton_status(page, page_name)
    await assert_anton_owner_check(page, page_name)
    await assert_scroll_unlocked(page, "initial load")
    await assert_diagnostics_workflow_index(page, page_name)
    await assert_rear_hitch_flow(page, page_name)
    await assert_cargo_load_planner(page, page_name)
    await assert_engine_service_jumpstart(page, page_name)
    await assert_photo_capture_plan(page, page_name)
    await assert_tire_roadside_launcher(page, page_name)
    await assert_maintenance_features(page, page_name)
    await assert_quick_sheet(page, page_name)
    await assert_fuse_mobile_readability(page, page_name)
    await assert_garage_features(page, page_name)
    await run_overlay_checks(page, page_name)
    await assert_section_navigation(page)
    await page.close()
    print(f"Browser smoke and interactions passed for {page_name}")


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--browser-path", required=True)
    parser.add_argument("--pages", nargs="+", required=True)
    args = parser.parse_args()

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path=args.browser_path,
            headless=True,
            args=["--allow-file-access-from-files", "--disable-web-security"],
        )
        context = await browser.new_context()
        try:
            for page_name in args.pages:
                await smoke_page(context, args.root, page_name)
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
'@

try {
    Set-Content -LiteralPath $scriptPath -Value $pythonScript -Encoding UTF8
    $pythonArgs = @($scriptPath, "--root", $Root, "--browser-path", $BrowserPath, "--pages") + $Pages
    & $python.Source $pythonArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Browser smoke Playwright audit failed with exit code $LASTEXITCODE."
    }
}
finally {
    Remove-Item -LiteralPath $scriptPath -Force -ErrorAction SilentlyContinue
}
