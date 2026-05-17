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
    "workflow index": "Diagnostics Workflow Index",
    "service prep": "Service Prep Planner",
    "minder planner": "Maintenance Minder Pocket Planner",
    "parts staging list": "Saved Maintenance Notes",
    "need to buy": "Saved Maintenance Notes",
    "saved maintenance notes": "Saved Maintenance Notes",
    "fuse quick sheet": "Fuse Triage Quick Sheet",
    "quick sheet sources": "Quick Sheet Source Confidence",
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
            const workflowIndex = document.querySelector("#workflow-index");
            const workflowCards = workflowIndex ? [...workflowIndex.querySelectorAll(".workflow-index-card[href^='#']")] : [];
            return {
                hasWorkflowIndex: Boolean(workflowIndex),
                cardCount: workflowCards.length,
                hasTrailerCard: workflowCards.some((card) => card.hash === "#trailer-light-workflow"),
                hasWarningCard: workflowCards.some((card) => card.hash === "#warning-light-workflow"),
                hasWarningTemplateRoute: Boolean(document.querySelector('#warning-light-workflow a[href="garage.html#warning-light-template"]'))
            };
        }"""
    )
    assert_true(state["hasWorkflowIndex"], "diagnostics page is missing workflow index")
    assert_true(state["cardCount"] == 7, "workflow index should expose seven workflow cards")
    assert_true(state["hasTrailerCard"], "workflow index is missing trailer-light workflow card")
    assert_true(state["hasWarningCard"], "workflow index is missing warning-light workflow card")
    assert_true(state["hasWarningTemplateRoute"], "warning-light workflow is missing the garage note-template route")
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
            const triage = document.querySelector("#fuse-triage");
            const sources = document.querySelector("#source-confidence");
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
            return {
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


async def assert_maintenance_features(page, page_name):
    if page_name != "maintenance.html":
        return
    state = await page.evaluate(
        """() => {
            const prep = document.querySelector("#service-prep");
            const cards = prep ? [...prep.querySelectorAll("[data-service-prep-card]")] : [];
            const checkboxLabels = cards.flatMap((card) => [...card.querySelectorAll("label")]).filter((label) => label.querySelector("input[type='checkbox']"));
            const minder = document.querySelector("#minder-pocket-planner");
            return {
                hasPrep: Boolean(prep),
                cardCount: cards.length,
                checkboxCount: checkboxLabels.length,
                hasGarageRoute: Boolean(prep?.querySelector('a[href="garage.html#notes"]')),
                hasCopyButtons: cards.every((card) => Boolean(card.querySelector("[data-copy-service-prep]"))),
                hasSaveButtons: cards.every((card) => Boolean(card.querySelector("[data-save-service-prep]"))),
                hasResetButtons: cards.every((card) => Boolean(card.querySelector("[data-reset-service-prep]"))),
                hasMinder: Boolean(minder),
                hasMinderInput: Boolean(minder?.querySelector("[data-minder-code-input]")),
                hasMinderCopy: Boolean(minder?.querySelector("[data-copy-minder-plan]")),
                hasMinderSaveNote: Boolean(minder?.querySelector("[data-save-minder-note]")),
                hasMinderReset: Boolean(minder?.querySelector("[data-reset-minder-plan]")),
                hasMinderUpdaterRoute: Boolean(minder?.querySelector('a[href="#maintenance-updater"]')),
                hasMinderGarageRoute: Boolean(minder?.querySelector('a[href="garage.html#notes"]')),
                minderText: minder?.innerText || "",
                hasMaintenanceScope: document.body.classList.contains("maintenance-page")
            };
        }"""
    )
    assert_true(state["hasPrep"], "maintenance page is missing the service prep planner")
    assert_true(state["cardCount"] == 4, "service prep planner should expose four job cards")
    assert_true(state["checkboxCount"] >= 16, "service prep planner should expose labeled checkbox items")
    assert_true(state["hasGarageRoute"], "service prep planner is missing the Garage notes route")
    assert_true(state["hasCopyButtons"], "service prep planner is missing copy buttons")
    assert_true(state["hasSaveButtons"], "service prep planner is missing Garage note save buttons")
    assert_true(state["hasResetButtons"], "service prep planner is missing reset buttons")
    assert_true(state["hasMinder"], "maintenance page is missing the Maintenance Minder Pocket Planner")
    assert_true(state["hasMinderInput"], "Maintenance Minder Pocket Planner is missing its code input")
    assert_true(state["hasMinderCopy"], "Maintenance Minder Pocket Planner is missing copy action")
    assert_true(state["hasMinderSaveNote"], "Maintenance Minder Pocket Planner is missing its Garage note save action")
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
            const firstPrepAction = document.querySelector("#service-prep [data-service-prep-card] .service-prep-actions");
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
                prepColumns,
                prepActionRows,
                minderActionRows,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visibleMaintenanceHeroLinks"] == 6, "maintenance mobile hero should show six primary task links")
    assert_true(mobile_state["visibleMaintenanceDockLinks"] == ["Update", "Prep", "Planner", "More"], "maintenance mobile bottom bar should prioritize Update, Prep, Planner, and More")
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
    await page.evaluate("""() => localStorage.setItem('ridgeline-notes', JSON.stringify({
        general_notes: '[5/16/2026 - Maintenance Minder A1 planner]\\nMaintenance Minder A1:\\n- A: Replace engine oil.\\n- 1: Rotate tires.\\n[5/16/2026 - Oil Change Prep]\\nOil Change Prep:\\n- 0W-20 oil and final dipstick level check'
    }))""")
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
            const partsPreview = panel?.querySelector("[data-maintenance-parts-preview]");
            const stagingCard = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((card) => card.textContent.includes("Parts Staging"));
            const itemButtons = panel ? [...panel.querySelectorAll("[data-copy-maintenance-note-index]")] : [];
            const stagingButtons = panel ? [...panel.querySelectorAll("[data-copy-maintenance-parts-index]")] : [];
            const stagingToggles = panel ? [...panel.querySelectorAll("[data-maintenance-staging-toggle]")] : [];
            return {
                copyLatestEnabled: copyLatest?.disabled === false,
                copyStagingEnabled: copyStaging?.disabled === false,
                itemButtonCount: itemButtons.length,
                stagingButtonCount: stagingButtons.length,
                stagingToggleCount: stagingToggles.length,
                stagingToggleNeedText: stagingToggles.some((button) => button.textContent.includes("Need to buy")),
                stagingStateKeyEmpty: !localStorage.getItem("ridgeline-maintenance-staging-state"),
                dashboardStagingText: stagingCard?.innerText || "",
                hasStagingCard: Boolean(partsPreview?.querySelector(".maintenance-parts-card")),
                hasStagingText: partsPreview?.textContent.includes("0W-20 oil and final dipstick level check") &&
                    partsPreview?.textContent.includes("Rotate tires"),
                hasPartsSourceRoute: Boolean(partsPreview?.querySelector('a[href="#rockauto-parts"]')),
                hasPrepRoute: Boolean(panel?.querySelector('.maintenance-note-item a[href="maintenance.html#service-prep"]')),
                hasMinderRoute: Boolean(panel?.querySelector('.maintenance-note-item a[href="maintenance.html#minder-pocket-planner"]')),
                hasFullNoteRoute: Boolean(panel?.querySelector('.maintenance-note-item a[href="#notes"]'))
            };
        }"""
    )
    assert_true(populated_state["copyLatestEnabled"], "saved maintenance notes Copy Latest should enable after notes are present")
    assert_true(populated_state["copyStagingEnabled"], "saved maintenance notes Copy Staging List should enable after staging items are present")
    assert_true(populated_state["itemButtonCount"] >= 2, "saved maintenance notes preview should expose per-note copy actions")
    assert_true(populated_state["stagingButtonCount"] >= 2, "saved maintenance notes preview should expose staging copy actions")
    assert_true(populated_state["stagingToggleCount"] >= 2, "saved maintenance notes preview should expose need-to-buy/staged toggles")
    assert_true(populated_state["stagingToggleNeedText"], "saved maintenance notes staging toggles should start as need-to-buy")
    assert_true(populated_state["stagingStateKeyEmpty"], "saved maintenance notes staging state should start separate from seeded Garage notes")
    assert_true("3 need / 0 staged" in populated_state["dashboardStagingText"], "garage dashboard parts staging card should summarize need/staged counts")
    assert_true(populated_state["hasStagingCard"], "saved maintenance notes preview did not render the parts/supplies staging card")
    assert_true(populated_state["hasStagingText"], "saved maintenance notes preview did not derive expected staging items")
    assert_true(populated_state["hasPartsSourceRoute"], "maintenance staging card is missing the parts source route")
    assert_true(populated_state["hasPrepRoute"], "saved maintenance notes preview is missing Service Prep planner route on populated notes")
    assert_true(populated_state["hasMinderRoute"], "saved maintenance notes preview is missing Minder planner route on populated notes")
    assert_true(populated_state["hasFullNoteRoute"], "saved maintenance notes preview is missing the full notes route on populated notes")
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
    await page.reload()
    await page.wait_for_selector("#maintenance-note-preview [data-maintenance-staging-toggle]", state="attached")
    reloaded_toggle = await page.locator("#maintenance-note-preview [data-maintenance-staging-toggle]").first.inner_text()
    assert_true("Staged" in reloaded_toggle, "staging toggle state should survive a Garage reload")
    await page.locator("#maintenance-note-preview [data-copy-maintenance-parts-index='1']").first.click()
    await page.wait_for_timeout(150)
    item_staging_status = await page.locator("#maintenance-note-preview [data-maintenance-note-status]").inner_text()
    assert_true("Copied staging list for this saved note" in item_staging_status, "saved maintenance note item staging copy did not report success")
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    garage_mobile_state = await page.evaluate(
        """() => {
            const preview = document.querySelector("#maintenance-note-preview [data-maintenance-note-preview]");
            const partsPreview = document.querySelector("#maintenance-note-preview [data-maintenance-parts-preview] .maintenance-parts-groups");
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            const columns = preview ? getComputedStyle(preview).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const partsColumns = partsPreview ? getComputedStyle(partsPreview).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            return {
                overflow: width > document.documentElement.clientWidth + 1,
                columns,
                partsColumns,
                hasContextRoute: Boolean(document.querySelector('.context-action[href="#maintenance-note-preview"]'))
            };
        }"""
    )
    assert_true(not garage_mobile_state["overflow"], "saved maintenance notes preview introduced garage mobile horizontal overflow")
    assert_true(garage_mobile_state["columns"] == 1, "saved maintenance notes preview should stack to one column on iPhone width")
    assert_true(garage_mobile_state["partsColumns"] == 1, "maintenance staging preview should stack to one column on iPhone width")
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
    await assert_scroll_unlocked(page, "initial load")
    await assert_diagnostics_workflow_index(page, page_name)
    await assert_maintenance_features(page, page_name)
    await assert_quick_sheet(page, page_name)
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
