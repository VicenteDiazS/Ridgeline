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

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
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
    "copy restore plan": "Recent Diagnostic Activity",
    "trailer hookup": "Trailer Hookup Flow",
    "tow day readiness": "Tow Day Readiness",
    "tow prep": "Tow Day Readiness",
    "tow setup saver": "Tow Setup Saver",
    "copy tow setup": "Tow Setup Saver",
    "trailer setup note": "Tow Setup Saver",
    "copy pinout handoff": "7-Way Pinout",
    "trailer pin handoff": "7-Way Pinout",
    "engine service jumpstart": "Engine Service Jumpstart",
    "engine part picker": "Engine Service Jumpstart",
    "nfc starter tag pack": "NFC Starter Tag Pack",
    "starter tag pack": "NFC Starter Tag Pack",
    "first truck tags": "NFC Starter Tag Pack",
    "nfc scan note": "NFC Landing Pages",
    "tag check note": "NFC Landing Pages",
    "save nfc note": "NFC Landing Pages",
    "photo capture plan": "Photo Capture Plan",
    "photo capture mission": "Photo Capture Plan",
    "missing photo checklist": "Photo Capture Plan",
    "save photo plan": "Photo Capture Plan",
    "truck photo checklist": "Photo Capture Plan",
    "workflow index": "Diagnostics Workflow Index",
    "first minute triage": "First Minute Diagnostic Triage",
    "diagnostic first minute": "First Minute Diagnostic Triage",
    "diagnostic handoff builder": "Diagnostic Handoff Builder",
    "copy diagnostic handoff": "Diagnostic Handoff Builder",
    "share diagnostic note": "Diagnostic Handoff Builder",
    "save diagnostic note": "Diagnostic Handoff Builder",
    "diagnostic note receipt": "Diagnostic Handoff Builder",
    "diagnostic smart dock": "Diagnostic Handoff Builder",
    "first diagnostic checks": "First Diagnostic Check Tracker",
    "diagnostic check tracker": "First Diagnostic Check Tracker",
    "copy diagnostic checks": "First Diagnostic Check Tracker",
    "save first checks": "First Diagnostic Check Tracker",
    "diagnostic call summary": "Diagnostic Call Summary",
    "copy diagnostic call": "Diagnostic Call Summary",
    "shop call summary": "Diagnostic Call Summary",
    "tow call summary": "Diagnostic Call Summary",
    "offline pack": "Offline Launch Pad",
    "refresh offline pack": "Offline Launch Pad",
    "offline route check": "Offline Route Check",
    "check cached routes": "Offline Route Check",
    "prime routes": "Offline Route Check",
    "prime offline routes": "Offline Route Check",
    "offline pinout": "Offline Route Check",
    "tow route cache": "Offline Route Check",
    "copy offline route plan": "Offline Route Check",
    "search prime routes": "Offline Launch Pad",
    "global route readiness": "Offline Launch Pad",
    "search copy route plan": "Offline Launch Pad",
    "signal loss prep": "Signal-Loss Prep",
    "before signal drops": "Signal-Loss Prep",
    "service run launcher": "Service Run Launcher",
    "service closeout": "Service Closeout",
    "finish service": "Service Closeout",
    "service follow-up": "Service Follow-Up Note",
    "next drive recheck": "Service Follow-Up Note",
    "copy maintenance receipt": "Service Closeout",
    "service run pack": "Service Run Pack",
    "copy service run pack": "Service Run Pack",
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
    "roadside note": "Roadside Note Receipt",
    "save roadside note": "Roadside Note Receipt",
    "roadside contact card": "Roadside Contact Card",
    "roadside location": "Roadside Contact Card",
    "copy roadside contact": "Roadside Contact Card",
    "tow eta": "Roadside Contact Card",
    "roadside live session": "Roadside Live Session",
    "roadside checkpoint": "Roadside Live Session",
    "copy roadside update": "Roadside Live Session",
    "roadside dispatch pack": "Roadside Dispatch Pack",
    "copy roadside dispatch": "Roadside Dispatch Pack",
    "save dispatch log": "Roadside Dispatch Pack",
    "fuse check note": "Fuse Check Note",
    "copy fuse note": "Fuse Check Note",
    "save fuse note": "Fuse Check Note",
    "before pulling a fuse": "Fuse Check Note",
    "owner shortcut strip": "Owner Shortcut Strip",
    "i need to": "Owner Shortcut Strip",
    "owner sign in": "Owner Sign In",
    "unlock site memory": "Owner Sign In",
    "resume last task": "Resume Search Strip",
    "continue where i left off": "Resume Search Strip",
    "recent owner work": "Recent Work Search Strip",
    "latest service receipt": "Recent Work Search Strip",
    "latest diagnostic note": "Recent Work Search Strip",
    "saved diagnostic note": "Recent Work Search Strip",
    "service job note": "Service Job Note Template",
    "copy job note": "Service Job Note Template",
    "append job note": "Service Job Note Template",
    "garage record snapshot": "Garage Fill-In Checklist",
    "copy garage plan": "Garage Fill-In Checklist",
    "latest maintenance handoff": "Garage Fill-In Checklist",
    "copy latest buy list": "Garage Fill-In Checklist",
    "garage recent handoffs": "Garage Recent Handoffs",
    "copy latest handoff": "Garage Recent Handoffs",
    "latest handoff note": "Garage Recent Handoffs",
    "filter handoffs": "Garage Recent Handoffs",
    "service handoff filter": "Garage Recent Handoffs",
    "tire roadside launcher": "Tire Roadside Launcher",
    "flat tire launcher": "Tire Roadside Launcher",
    "fuse quick sheet": "Fuse Triage Quick Sheet",
    "fuse quick finder": "Hood Fuse Quick Finder",
    "copy fuse": "Selected Fuse Handoff",
    "saved fuse review": "Saved Fuse Review",
    "copy saved fuses": "Saved Fuse Review",
    "garage saved fuse": "Saved Fuse Review",
    "fuse counter pack": "Fuse Counter Pack",
    "copy fuse counter pack": "Fuse Counter Pack",
    "parts counter fuse": "Fuse Counter Pack",
    "fuse pull checklist": "Fuse Pull Checklist",
    "save fuse checklist": "Fuse Pull Checklist",
    "fuse label decoder": "Fuse Label Decoder",
    "copy fuse decode": "Fuse Label Decoder",
    "tire handoff builder": "Tire Handoff Builder",
    "copy tire handoff": "Tire Handoff Builder",
    "save tire note": "Tire Handoff Builder",
    "tire pressure sweep": "Tire Pressure Sweep",
    "tpms note": "Tire Pressure Sweep",
    "copy tire pressure": "Tire Pressure Sweep",
    "tire pressure recheck": "Tire Pressure Recheck Plan",
    "copy tire recheck": "Tire Pressure Recheck Plan",
    "save tire recheck": "Tire Pressure Recheck Plan",
    "cabin fuse quick finder": "Cabin Fuse Quick Finder",
    "hood fuse quick finder": "Hood Fuse Quick Finder",
    "cargo load planner": "Cargo Load Planner",
    "bed load planner": "Cargo Load Planner",
    "quick sheet sources": "Quick Sheet Source Confidence",
    "anton status": "Anton Latest Impact",
    "home resume work": "Home Resume Work",
    "resume saved work": "Home Resume Work",
    "copy latest home note": "Home Resume Work",
    "anton owner check": "Anton Owner Check",
    "anton run snapshot": "Anton Owner Check",
    "anton sign off": "Anton Owner Check",
    "copy sign-off": "Anton Owner Check",
    "save anton review": "Anton Owner Check",
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
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.evaluate("window.scrollTo(0, 0);")
    await page.mouse.wheel(0, 920)
    await page.wait_for_timeout(250)
    try:
        await page.wait_for_function(
            """() => {
                const canScroll = document.documentElement.scrollHeight > window.innerHeight + 160;
                return !canScroll || document.querySelector(".topbar")?.classList.contains("is-compact");
            }""",
            timeout=1200,
        )
    except PlaywrightTimeoutError:
        await page.evaluate("window.scrollTo(0, 920); window.dispatchEvent(new Event('scroll'));")
        await page.wait_for_timeout(250)
    compact_state = await page.evaluate(
        """() => {
            const topbar = document.querySelector(".topbar");
            const current = document.querySelector(".header-current-page");
            const actions = document.querySelector(".topbar-actions");
            const section = current?.querySelector("[data-header-section-label]");
            const topbarRect = topbar?.getBoundingClientRect();
            const currentRect = current?.getBoundingClientRect();
            const actionsRect = actions?.getBoundingClientRect();
            return {
                compact: Boolean(topbar?.classList.contains("is-compact")),
                hasSection: Boolean(section && !section.hidden && section.textContent.trim()),
                sectionText: section?.textContent.trim() || "",
                href: current?.getAttribute("href") || "",
                topbarHeight: topbarRect?.height || 0,
                sameRail: Boolean(currentRect && actionsRect && Math.abs(currentRect.top - actionsRect.top) <= 2),
                currentWidth: currentRect?.width || 0,
                actionsWidth: actionsRect?.width || 0,
                canScroll: document.documentElement.scrollHeight > window.innerHeight + 160,
                overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > document.documentElement.clientWidth + 1
            };
        }"""
    )
    if compact_state["canScroll"]:
        assert_true(compact_state["compact"], f"{page_name} header did not collapse after iPhone scroll")
        assert_true(compact_state["hasSection"], f"{page_name} compact header is missing the active section label")
        assert_true("#" in compact_state["href"], f"{page_name} compact header should link to the active section")
        assert_true(compact_state["sameRail"], f"{page_name} compact header current chip and actions should share one iPhone rail")
        assert_true(compact_state["currentWidth"] >= 88, f"{page_name} compact header current chip is too narrow on iPhone")
        assert_true(compact_state["actionsWidth"] >= 176, f"{page_name} compact header action rail is too narrow on iPhone")
        assert_true(compact_state["topbarHeight"] <= 56, f"{page_name} compact header is too tall on iPhone")
        assert_true(not compact_state["overflow"], f"{page_name} compact header introduced horizontal overflow")
    await page.evaluate("window.scrollTo(0, 0);")
    await page.wait_for_timeout(120)
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(120)


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

    await page.evaluate(
        """() => {
            localStorage.setItem("ridgeline-notes", JSON.stringify({
                general_notes: "[2026-05-24 - Diagnostic Note: Warning light]\\nContext: amber warning on first start.\\nNext: open Garage Recent Handoffs."
            }));
        }"""
    )
    await page.reload(wait_until="load")
    await page.wait_for_timeout(700)
    resume_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("[data-home-resume-work]");
            const rect = panel?.getBoundingClientRect();
            const actions = [...panel?.querySelectorAll("a") || []].map((link) => link.getAttribute("href"));
            const button = panel?.querySelector("[data-home-resume-copy]");
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasPanel: Boolean(panel),
                visible: Boolean(rect && rect.width > 0 && rect.height > 0),
                state: panel?.dataset.resumeState || "",
                text: panel?.textContent || "",
                copyEnabled: Boolean(button && !button.disabled),
                actions,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(resume_state["hasPanel"], "home page is missing the resume work panel")
    assert_true(resume_state["visible"], "home resume work panel is not visible")
    assert_true(resume_state["state"] == "ready", "home resume work panel did not detect seeded Garage Notes")
    assert_true(resume_state["copyEnabled"], "home resume work Copy Latest button should enable with seeded notes")
    for phrase in ["Resume Work", "Diagnostic note", "Garage Notes", "Recent Handoffs"]:
        assert_true(phrase in resume_state["text"], f"home resume work panel is missing {phrase}")
    for href in ["garage.html#recent-handoffs", "quick-sheet.html#roadside-action-stack", "diagnostics.html#first-check-tracker"]:
        assert_true(href in resume_state["actions"], f"home resume work panel is missing route {href}")
    assert_true(not resume_state["overflow"], "home resume work panel introduced desktop horizontal overflow")
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    resume_mobile = await page.evaluate(
        """() => {
            const panel = document.querySelector("[data-home-resume-work]");
            const rect = panel?.getBoundingClientRect();
            const buttons = [...panel?.querySelectorAll(".utility-link") || []].map((item) => item.getBoundingClientRect().height);
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(rect && rect.width > 0 && rect.height > 0),
                panelWidth: rect?.width || 0,
                buttonHeights: buttons,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(resume_mobile["visible"], "home resume work panel is not visible at iPhone width")
    assert_true(resume_mobile["panelWidth"] <= 390, "home resume work panel is wider than the iPhone viewport")
    assert_true(all(height >= 34 for height in resume_mobile["buttonHeights"]), "home resume work actions are too small for touch")
    assert_true(not resume_mobile["overflow"], "home resume work panel introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_anton_owner_check(page, page_name):
    if page_name != "anton.html":
        return

    await page.wait_for_selector(".anton-owner-check", state="attached", timeout=7000)
    await page.wait_for_selector("[data-anton-review-queue]", state="attached", timeout=7000)
    await page.wait_for_selector("[data-anton-run-snapshot]", state="attached", timeout=7000)
    await page.wait_for_timeout(500)
    state = await page.evaluate(
        """() => {
            const panel = document.querySelector(".anton-owner-check");
            const snapshot = document.querySelector("[data-anton-run-snapshot]");
            const queue = document.querySelector("[data-anton-review-queue]");
            const signoff = document.querySelector("[data-anton-signoff]");
            const cards = [...panel?.querySelectorAll("article") || []];
            const snapshotCards = [...snapshot?.querySelectorAll("article") || []];
            const queueCards = [...queue?.querySelectorAll("article") || []];
            const link = panel?.querySelector("[data-anton-owner-check-link]");
            const reviewPackButtons = [...queue?.querySelectorAll("[data-anton-copy-review-pack], [data-anton-share-review-pack]") || []].map((item) => item.textContent.trim());
            const signoffButtons = [...signoff?.querySelectorAll("[data-anton-signoff-choice], [data-anton-save-signoff], [data-anton-copy-signoff], [data-anton-share-signoff]") || []].map((item) => item.textContent.trim());
            const queueLinks = [...queue?.querySelectorAll("a") || []].map((item) => ({
                text: item.textContent.trim(),
                href: item.getAttribute("href") || ""
            }));
            const bottomLinks = [...document.querySelectorAll(".context-action-bar .context-action")].map((item) => item.textContent.trim());
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasPanel: Boolean(panel),
                hasSnapshot: Boolean(snapshot),
                hasQueue: Boolean(queue),
                hasSignoff: Boolean(signoff),
                cardCount: cards.length,
                snapshotCardCount: snapshotCards.length,
                queueCardCount: queueCards.length,
                snapshotText: (snapshot?.innerText || "").toLowerCase(),
                text: (panel?.innerText || "").toLowerCase(),
                queueText: (queue?.innerText || "").toLowerCase(),
                signoffText: (signoff?.innerText || "").toLowerCase(),
                linkHref: link?.getAttribute("href") || "",
                linkText: link?.textContent?.trim() || "",
                reviewPackButtons,
                signoffButtons,
                queueLinks,
                bottomLinks,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(state["hasPanel"], "Anton page is missing the owner check strip")
    assert_true(state["hasSnapshot"], "Anton page is missing the live run snapshot")
    assert_true(state["hasQueue"], "Anton page is missing the iPhone review queue")
    assert_true(state["hasSignoff"], "Anton page is missing the iPhone sign-off panel")
    assert_true(state["cardCount"] == 3, "Anton owner check should have three action cards")
    assert_true(state["snapshotCardCount"] == 3, "Anton run snapshot should have three cards")
    assert_true(state["queueCardCount"] == 5, "Anton review queue should have five review cards")
    assert_true("stage" in state["snapshotText"], "Anton run snapshot is missing the stage card")
    assert_true("heartbeat" in state["snapshotText"], "Anton run snapshot is missing the heartbeat card")
    assert_true("owner move" in state["snapshotText"], "Anton run snapshot is missing the owner-move card")
    assert_true("owner check" in state["text"], "Anton owner check is missing the owner-check label")
    assert_true("needs you?" in state["text"], "Anton owner check is missing the action-needed card")
    assert_true("next check" in state["text"], "Anton owner check is missing the next-check card")
    assert_true("home monitor" in state["queueText"], "Anton review queue is missing the home monitor confirmation card")
    assert_true("run log" in state["queueText"] or "no log path" in state["queueText"], "Anton review queue is missing the run trace card")
    assert_true("review pack" in state["queueText"], "Anton review queue is missing the copy/share review pack card")
    assert_true("iphone sign-off" in state["signoffText"], "Anton sign-off panel is missing its label")
    assert_true("works on iphone" in state["signoffText"], "Anton sign-off panel is missing the reviewed choice")
    assert_true("needs follow-up" in state["signoffText"], "Anton sign-off panel is missing the follow-up choice")
    assert_true(state["linkHref"].endswith(".html"), "Anton owner check link should route to a page")
    assert_true(state["linkText"].startswith("Open"), "Anton owner check link should be a clear open action")
    assert_true(any(link["text"] == "Open Changed Page" and link["href"].endswith(".html") for link in state["queueLinks"]), "Anton review queue should open the changed page")
    assert_true(any(link["href"] == "index.html#agent-status" for link in state["queueLinks"]), "Anton review queue should link to the home monitor")
    assert_true({"Copy Pack", "Share Pack"}.issubset(set(state["reviewPackButtons"])), "Anton review pack should expose copy and share actions")
    assert_true({"Save Sign-Off", "Copy Sign-Off", "Share"}.issubset(set(state["signoffButtons"])), "Anton sign-off should expose save, copy, and share actions")
    assert_true({"Review", "Sign", "Home", "Controls", "More"}.issubset(set(state["bottomLinks"])), "Anton bottom action bar should expose Review, Sign, Home, Controls, and More")
    assert_true(not state["overflow"], "Anton owner check introduced desktop horizontal overflow")
    await page.click("[data-anton-copy-review-pack]")
    await page.wait_for_timeout(250)
    pack_status = await page.locator("[data-anton-review-pack-status]").inner_text()
    assert_true(pack_status.strip(), "Anton review pack copy action did not report a status")
    await page.click("[data-anton-signoff-choice='followup']")
    await page.fill("[data-anton-signoff-note]", "Button spacing needs one more iPhone check.")
    await page.click("[data-anton-save-signoff]")
    await page.wait_for_timeout(250)
    signoff_state = await page.evaluate(
        """() => {
            const saved = JSON.parse(localStorage.getItem("ridgeline-anton-iphone-signoff") || "null");
            return {
                savedChoice: saved?.choice || "",
                savedText: saved?.text || "",
                status: document.querySelector("[data-anton-signoff-status]")?.textContent || "",
                latest: document.querySelector("[data-anton-signoff-latest]")?.innerText || ""
            };
        }"""
    )
    assert_true(signoff_state["savedChoice"] == "followup", "Anton sign-off did not save the selected follow-up result")
    assert_true("Button spacing needs one more iPhone check." in signoff_state["savedText"], "Anton sign-off did not preserve the owner note")
    assert_true("Saved sign-off" in signoff_state["status"], "Anton sign-off save action did not report a status")
    assert_true("Needs follow-up" in signoff_state["latest"], "Anton sign-off latest-review card did not render the saved result")
    await page.click("[data-anton-copy-signoff]")
    await page.wait_for_timeout(250)
    copy_status = await page.locator("[data-anton-signoff-status]").inner_text()
    assert_true(copy_status.strip(), "Anton sign-off copy action did not report a status")

    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    mobile_state = await page.evaluate(
        """() => {
            const panel = document.querySelector(".anton-owner-check");
            const snapshot = document.querySelector("[data-anton-run-snapshot]");
            const queue = document.querySelector("[data-anton-review-queue]");
            const signoff = document.querySelector("[data-anton-signoff]");
            const cards = [...panel?.querySelectorAll("article") || []];
            const snapshotCards = [...snapshot?.querySelectorAll("article") || []];
            const queueCards = [...queue?.querySelectorAll("article") || []];
            const link = panel?.querySelector("[data-anton-owner-check-link]");
            const queueActions = [...queue?.querySelectorAll("a, button") || []];
            const signoffActions = [...signoff?.querySelectorAll("a, button") || []];
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(panel && panel.getBoundingClientRect().height > 0),
                snapshotVisible: Boolean(snapshot && snapshot.getBoundingClientRect().height > 0),
                queueVisible: Boolean(queue && queue.getBoundingClientRect().height > 0),
                signoffVisible: Boolean(signoff && signoff.getBoundingClientRect().height > 0),
                columns: cards.map((card) => Math.round(card.getBoundingClientRect().width)),
                snapshotColumns: snapshotCards.map((card) => Math.round(card.getBoundingClientRect().width)),
                queueColumns: queueCards.map((card) => Math.round(card.getBoundingClientRect().width)),
                queueActionHeights: queueActions.map((item) => Math.round(item.getBoundingClientRect().height)),
                signoffActionHeights: signoffActions.map((item) => Math.round(item.getBoundingClientRect().height)),
                signoffWidth: Math.round(signoff?.getBoundingClientRect().width || 0),
                linkHeight: Math.round(link?.getBoundingClientRect().height || 0),
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "Anton owner check is not visible at iPhone width")
    assert_true(mobile_state["snapshotVisible"], "Anton run snapshot is not visible at iPhone width")
    assert_true(mobile_state["queueVisible"], "Anton review queue is not visible at iPhone width")
    assert_true(mobile_state["signoffVisible"], "Anton sign-off panel is not visible at iPhone width")
    assert_true(all(width >= 340 for width in mobile_state["columns"]), "Anton owner check cards should stack at iPhone width")
    assert_true(all(width >= 340 for width in mobile_state["snapshotColumns"]), "Anton run snapshot cards should stack at iPhone width")
    assert_true(all(width >= 340 for width in mobile_state["queueColumns"]), "Anton review queue cards should stack at iPhone width")
    assert_true(mobile_state["signoffWidth"] <= 390, "Anton sign-off panel is wider than the iPhone viewport")
    assert_true(mobile_state["linkHeight"] >= 38, "Anton owner check action is too small for touch")
    assert_true(all(height >= 38 for height in mobile_state["queueActionHeights"]), "Anton review queue actions are too small for touch")
    assert_true(all(height >= 38 for height in mobile_state["signoffActionHeights"]), "Anton sign-off actions are too small for touch")
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
            const shareBuilder = document.querySelector("#diagnostic-share-builder");
            const checkTracker = document.querySelector("#first-check-tracker");
            const callSummary = document.querySelector("#diagnostic-call-summary");
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
                hasShareBuilder: Boolean(shareBuilder),
                hasCheckTracker: Boolean(checkTracker),
                hasCallSummary: Boolean(callSummary),
                callText: callSummary ? callSummary.innerText : "",
                hasCallTarget: Boolean(callSummary?.querySelector("[data-diagnostic-call-target]")),
                hasCallStatusField: Boolean(callSummary?.querySelector("[data-diagnostic-call-status]")),
                hasCallCallback: Boolean(callSummary?.querySelector("[data-diagnostic-call-callback]")),
                hasCallAsk: Boolean(callSummary?.querySelector("[data-diagnostic-call-ask]")),
                hasCallCopy: Boolean(callSummary?.querySelector("[data-copy-diagnostic-call]")),
                hasCallShare: Boolean(callSummary?.querySelector("[data-share-diagnostic-call]")),
                hasCallSave: Boolean(callSummary?.querySelector("[data-save-diagnostic-call]")),
                hasCallGarageRoute: Boolean(callSummary?.querySelector('a[href="garage.html#recent-handoffs"]')),
                hasCallRoadsideRoute: Boolean(callSummary?.querySelector('a[href="quick-sheet.html#roadside-action-stack"]')),
                checkButtons: checkTracker ? checkTracker.querySelectorAll("[data-diagnostic-check-plan]").length : 0,
                checkItems: checkTracker ? checkTracker.querySelectorAll("[data-diagnostic-check]").length : 0,
                hasCheckCopy: Boolean(checkTracker?.querySelector("[data-copy-diagnostic-checks]")),
                hasCheckShare: Boolean(checkTracker?.querySelector("[data-share-diagnostic-checks]")),
                hasCheckSave: Boolean(checkTracker?.querySelector("[data-save-diagnostic-checks]")),
                hasCheckGarageRoute: Boolean(checkTracker?.querySelector('a[href="garage.html#recent-handoffs"]')),
                checkText: checkTracker ? checkTracker.innerText : "",
                shareButtons: shareBuilder ? shareBuilder.querySelectorAll("[data-diagnostic-share-plan]").length : 0,
                shareText: shareBuilder ? shareBuilder.innerText : "",
                hasShareCopy: Boolean(shareBuilder?.querySelector("[data-copy-diagnostic-share]")),
                hasShareShare: Boolean(shareBuilder?.querySelector("[data-share-diagnostic-share]")),
                hasShareSave: Boolean(shareBuilder?.querySelector("[data-save-diagnostic-note]")),
                hasDetailField: Boolean(shareBuilder?.querySelector("[data-diagnostic-detail]")),
                detailPlaceholder: shareBuilder?.querySelector("[data-diagnostic-detail]")?.getAttribute("placeholder") || "",
                hasShareReceipt: Boolean(shareBuilder?.querySelector("[data-diagnostic-save-receipt]")),
                receiptHidden: Boolean(shareBuilder?.querySelector("[data-diagnostic-save-receipt]")?.hidden),
                sharePrimary: shareBuilder?.querySelector("[data-diagnostic-share-primary]")?.getAttribute("href") || "",
                shareSecondary: shareBuilder?.querySelector("[data-diagnostic-share-secondary]")?.getAttribute("href") || "",
                dockPrimary: document.querySelector("[data-diagnostic-dock-primary]")?.getAttribute("href") || "",
                dockPrimaryText: document.querySelector("[data-diagnostic-dock-primary]")?.textContent.trim() || "",
                dockSecondary: document.querySelector("[data-diagnostic-dock-secondary]")?.getAttribute("href") || "",
                dockSecondaryText: document.querySelector("[data-diagnostic-dock-secondary]")?.textContent.trim() || "",
                dockLabel: document.querySelector("[data-diagnostic-dock]")?.getAttribute("aria-label") || "",
                contextPrimary: document.querySelector('[data-diagnostic-context="primary"]')?.getAttribute("href") || "",
                contextPrimaryText: document.querySelector('[data-diagnostic-context="primary"] span')?.textContent.trim() || "",
                contextSecondary: document.querySelector('[data-diagnostic-context="secondary"]')?.getAttribute("href") || "",
                contextSecondaryText: document.querySelector('[data-diagnostic-context="secondary"] span')?.textContent.trim() || "",
                contextLabel: document.querySelector(".context-action-bar")?.getAttribute("aria-label") || "",
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
    assert_true(state["hasShareBuilder"], "diagnostics page is missing diagnostic handoff builder")
    assert_true(state["hasCheckTracker"], "diagnostics page is missing first diagnostic check tracker")
    assert_true(state["hasCallSummary"], "diagnostics page is missing diagnostic call summary")
    assert_true(state["hasCallTarget"], "diagnostic call summary is missing send-to selector")
    assert_true(state["hasCallStatusField"], "diagnostic call summary is missing truck-status field")
    assert_true(state["hasCallCallback"], "diagnostic call summary is missing callback field")
    assert_true(state["hasCallAsk"], "diagnostic call summary is missing question field")
    assert_true(state["hasCallCopy"], "diagnostic call summary is missing Copy Call")
    assert_true(state["hasCallShare"], "diagnostic call summary is missing Share")
    assert_true(state["hasCallSave"], "diagnostic call summary is missing Save Garage Note")
    assert_true(state["hasCallGarageRoute"], "diagnostic call summary is missing Garage Recent Handoffs route")
    assert_true(state["hasCallRoadsideRoute"], "diagnostic call summary is missing Roadside Stack route")
    for phrase in ["Copy The Next Call In One Tap", "Repair shop", "Copy Call", "Roadside Stack"]:
        assert_true(phrase in state["callText"], f"diagnostic call summary is missing {phrase}")
    assert_true(state["checkButtons"] == 5, "first diagnostic check tracker should expose five symptom buttons")
    assert_true(state["checkItems"] == 4, "first diagnostic check tracker should render four checks for the default symptom")
    assert_true(state["hasCheckCopy"], "first diagnostic check tracker is missing copy control")
    assert_true(state["hasCheckShare"], "first diagnostic check tracker is missing share control")
    assert_true(state["hasCheckSave"], "first diagnostic check tracker is missing save control")
    assert_true(state["hasCheckGarageRoute"], "first diagnostic check tracker is missing Recent Handoffs route")
    for phrase in ["Mark What You Already Tried", "No Start", "Copy Checks", "Save Garage Note"]:
        assert_true(phrase in state["checkText"], f"first diagnostic check tracker is missing {phrase}")
    assert_true(state["shareButtons"] == 5, "diagnostic handoff builder should expose five symptom buttons")
    assert_true(state["hasShareCopy"], "diagnostic handoff builder is missing copy control")
    assert_true(state["hasShareShare"], "diagnostic handoff builder is missing share control")
    assert_true(state["hasShareSave"], "diagnostic handoff builder is missing save-note control")
    assert_true(state["hasDetailField"], "diagnostic handoff builder is missing the owner-detail capture field")
    assert_true("87,420 mi" in state["detailPlaceholder"], "diagnostic owner-detail field should show a no-start example")
    assert_true(state["hasShareReceipt"], "diagnostic handoff builder is missing saved-note receipt")
    assert_true(state["receiptHidden"], "diagnostic saved-note receipt should stay hidden until a note is saved")
    assert_true(state["sharePrimary"] == "#no-start-workflow", "diagnostic handoff builder should default to no-start flow")
    assert_true(state["shareSecondary"] == "hood.html#wiring", "diagnostic handoff builder should default to jump notes")
    assert_true(state["contextPrimary"] == "#no-start-workflow", "diagnostic bottom bar should default to no-start flow")
    assert_true(state["contextPrimaryText"] == "No-Start", "diagnostic bottom bar should label the default flow")
    assert_true(state["contextSecondary"] == "hood.html#wiring", "diagnostic bottom bar should default to jump notes")
    assert_true(state["contextSecondaryText"] == "Jump", "diagnostic bottom bar should label the default reference")
    assert_true("No start or weak battery" in state["contextLabel"], "diagnostic bottom bar should announce the selected default handoff")
    for phrase in ["No start", "Warning", "12V Power", "Audio", "Trailer", "Copy Handoff", "Save Note"]:
        assert_true(phrase in state["shareText"], f"diagnostic handoff builder is missing {phrase}")
    await page.evaluate("""() => document.querySelector('[data-diagnostic-share-plan="warning"]').click()""")
    await page.wait_for_timeout(200)
    warning_share = await page.evaluate(
        """() => {
            const builder = document.querySelector("#diagnostic-share-builder");
            return {
                primary: builder?.querySelector("[data-diagnostic-share-primary]")?.getAttribute("href") || "",
                secondary: builder?.querySelector("[data-diagnostic-share-secondary]")?.getAttribute("href") || "",
                dockPrimary: document.querySelector("[data-diagnostic-dock-primary]")?.getAttribute("href") || "",
                dockPrimaryText: document.querySelector("[data-diagnostic-dock-primary]")?.textContent.trim() || "",
                dockSecondary: document.querySelector("[data-diagnostic-dock-secondary]")?.getAttribute("href") || "",
                dockSecondaryText: document.querySelector("[data-diagnostic-dock-secondary]")?.textContent.trim() || "",
                dockLabel: document.querySelector("[data-diagnostic-dock]")?.getAttribute("aria-label") || "",
                contextPrimary: document.querySelector('[data-diagnostic-context="primary"]')?.getAttribute("href") || "",
                contextPrimaryText: document.querySelector('[data-diagnostic-context="primary"] span')?.textContent.trim() || "",
                contextSecondary: document.querySelector('[data-diagnostic-context="secondary"]')?.getAttribute("href") || "",
                contextSecondaryText: document.querySelector('[data-diagnostic-context="secondary"] span')?.textContent.trim() || "",
                contextLabel: document.querySelector(".context-action-bar")?.getAttribute("aria-label") || "",
                pressed: builder?.querySelector('[data-diagnostic-share-plan="warning"]')?.getAttribute("aria-pressed") || "",
                status: builder?.querySelector("[data-diagnostic-share-status]")?.textContent || "",
                text: builder?.innerText || ""
            };
        }"""
    )
    assert_true(warning_share["primary"] == "#warning-light-workflow", "warning diagnostic handoff should route to warning flow")
    assert_true(warning_share["secondary"] == "garage.html#warning-light-template", "warning diagnostic handoff should route to Garage warning note")
    assert_true(warning_share["contextPrimary"] == "#warning-light-workflow", "diagnostic bottom bar should follow the selected warning flow")
    assert_true(warning_share["contextPrimaryText"] == "Warning", "diagnostic bottom bar should label the selected warning flow")
    assert_true(warning_share["contextSecondary"] == "garage.html#warning-light-template", "diagnostic bottom bar should follow the selected warning reference")
    assert_true(warning_share["contextSecondaryText"] == "Note", "diagnostic bottom bar should label the selected warning reference")
    assert_true("Warning light or MID message" in warning_share["contextLabel"], "diagnostic bottom bar should announce the selected warning handoff")
    assert_true(warning_share["pressed"] == "true", "warning diagnostic handoff button should become active")
    assert_true("Warning light or MID message handoff ready" in warning_share["status"], "warning diagnostic handoff status did not update")
    assert_true("exact indicator name" in warning_share["text"], "warning diagnostic handoff did not render warning-specific steps")
    await page.locator("[data-diagnostic-detail]").fill("87,420 mi, amber MID said Check Charging System after battery swap")
    await page.locator("[data-save-diagnostic-note]").click()
    await page.wait_for_timeout(250)
    receipt_state = await page.evaluate(
        """() => {
            const builder = document.querySelector("#diagnostic-share-builder");
            const receipt = JSON.parse(localStorage.getItem("ridgeline-diagnostic-last-handoff") || "null");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            return {
                hidden: Boolean(builder?.querySelector("[data-diagnostic-save-receipt]")?.hidden),
                title: builder?.querySelector("[data-diagnostic-receipt-title]")?.textContent || "",
                summary: builder?.querySelector("[data-diagnostic-receipt-summary]")?.textContent || "",
                meta: builder?.querySelector("[data-diagnostic-receipt-meta]")?.textContent || "",
                status: builder?.querySelector("[data-diagnostic-share-status]")?.textContent || "",
                note: notes.general_notes || "",
                receiptText: receipt?.text || "",
                garageRoute: Boolean(builder?.querySelector('[data-diagnostic-save-receipt] a[href="garage.html#notes"]')),
                hasCopyReceipt: Boolean(builder?.querySelector("[data-copy-diagnostic-receipt]")),
                hasShareReceipt: Boolean(builder?.querySelector("[data-share-diagnostic-receipt]"))
            };
        }"""
    )
    assert_true(not receipt_state["hidden"], "diagnostic receipt should appear after saving a note")
    assert_true("Warning light" in receipt_state["title"], "diagnostic receipt should show the saved warning-light situation")
    assert_true("Garage Notes" in receipt_state["summary"], "diagnostic receipt should explain that it saved into Garage Notes")
    assert_true("warning-light flow" in receipt_state["meta"].lower(), "diagnostic receipt should preserve reference context")
    assert_true("saved to Garage Notes" in receipt_state["status"], "diagnostic save did not report Garage Notes status")
    assert_true("Diagnostic Note: Warning light or MID message" in receipt_state["note"], "Garage Notes did not receive the diagnostic note")
    assert_true("87,420 mi, amber MID said Check Charging System" in receipt_state["note"], "saved diagnostic note did not preserve owner-entered detail")
    assert_true("current conditions remain final authority" in receipt_state["note"], "saved diagnostic note should preserve the source-authority reminder")
    assert_true("Diagnostic Note: Warning light or MID message" in receipt_state["receiptText"], "diagnostic receipt storage did not keep the saved note text")
    assert_true("87,420 mi, amber MID said Check Charging System" in receipt_state["receiptText"], "diagnostic receipt storage did not keep owner-entered detail")
    assert_true(receipt_state["garageRoute"], "diagnostic receipt is missing the Open Garage Notes route")
    assert_true(receipt_state["hasCopyReceipt"], "diagnostic receipt is missing Copy Note")
    assert_true(receipt_state["hasShareReceipt"], "diagnostic receipt is missing Share")
    await page.locator('[data-diagnostic-check-plan="power"]').click()
    await page.locator('[data-diagnostic-check="0"]').check()
    await page.locator('[data-diagnostic-check="2"]').check()
    await page.locator("[data-diagnostic-check-detail]").fill("front socket dead, console socket works")
    await page.locator("[data-save-diagnostic-checks]").click()
    await page.wait_for_timeout(250)
    check_state = await page.evaluate(
        """() => {
            const tracker = document.querySelector("#first-check-tracker");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            const stored = JSON.parse(localStorage.getItem("ridgeline-diagnostic-first-checks") || "{}");
            return {
                pressed: tracker?.querySelector('[data-diagnostic-check-plan="power"]')?.getAttribute("aria-pressed") || "",
                title: tracker?.querySelector("[data-diagnostic-check-title]")?.textContent || "",
                count: tracker?.querySelector("[data-diagnostic-check-count]")?.textContent || "",
                next: tracker?.querySelector("[data-diagnostic-check-next]")?.textContent || "",
                status: tracker?.querySelector("[data-diagnostic-check-status]")?.textContent || "",
                note: notes.general_notes || "",
                storedMarked: stored.power?.markedChecks || [],
                storedDetail: stored.power?.detail || "",
                checkedCount: tracker ? tracker.querySelectorAll("[data-diagnostic-check]:checked").length : 0
            };
        }"""
    )
    assert_true(check_state["pressed"] == "true", "first diagnostic check tracker did not select 12V Power")
    assert_true("outlet and device checks" in check_state["title"], "first diagnostic check tracker did not render the 12V plan")
    assert_true(check_state["count"] == "2 of 4 checks marked", "first diagnostic check tracker did not count marked checks")
    assert_true("Device or adapter named" in check_state["next"], "first diagnostic check tracker did not show the next unmarked check")
    assert_true("saved to Garage Notes" in check_state["status"], "first diagnostic check tracker did not report save status")
    assert_true("First Diagnostic Checks: 12V socket or accessory power" in check_state["note"], "Garage Notes did not receive first-check tracker note")
    assert_true("front socket dead, console socket works" in check_state["note"], "first-check tracker note did not preserve owner detail")
    assert_true(len(check_state["storedMarked"]) == 2, "first-check tracker did not persist marked checks locally")
    assert_true(check_state["storedDetail"] == "front socket dead, console socket works", "first-check tracker did not persist detail locally")
    assert_true(check_state["checkedCount"] == 2, "first-check tracker did not keep checked controls active")
    await page.locator("[data-diagnostic-call-target]").select_option("Tow or roadside help")
    await page.locator("[data-diagnostic-call-status]").fill("parked at home, no-start, can text photos")
    await page.locator("[data-diagnostic-call-callback]").fill("text first, available after 3 PM")
    await page.locator("[data-diagnostic-call-ask]").fill("confirm if I should tow it in or try one more battery/fuse check first")
    await page.locator("[data-copy-diagnostic-call]").click()
    await page.wait_for_timeout(200)
    await page.locator("[data-save-diagnostic-call]").click()
    await page.wait_for_timeout(250)
    call_state = await page.evaluate(
        """() => {
            const root = document.querySelector("#diagnostic-call-summary");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            const stored = JSON.parse(localStorage.getItem("ridgeline-diagnostic-call-summary") || "{}");
            return {
                title: root?.querySelector("[data-diagnostic-call-title]")?.textContent || "",
                preview: root?.querySelector("[data-diagnostic-call-preview]")?.textContent || "",
                context: root?.querySelector("[data-diagnostic-call-context]")?.textContent || "",
                copyStatus: root?.querySelector("[data-diagnostic-call-status-text]")?.textContent || "",
                note: notes.general_notes || "",
                storedTarget: stored.target || "",
                storedStatus: stored.truckStatus || "",
                storedCallback: stored.callback || "",
                storedAsk: stored.ask || ""
            };
        }"""
    )
    assert_true("Warning light" in call_state["title"], "diagnostic call summary should pick up the latest saved handoff")
    assert_true("Garage Notes" in call_state["preview"], "diagnostic call summary preview should include saved handoff context")
    assert_true("2 of 4 first checks marked" in call_state["context"], "diagnostic call summary should include latest first-check count")
    assert_true("front socket dead, console socket works" in call_state["context"], "diagnostic call summary should include latest first-check clue")
    assert_true("saved to Garage Notes" in call_state["copyStatus"], "diagnostic call summary save did not report Garage Notes status")
    assert_true("Diagnostic Call Summary" in call_state["note"], "Garage Notes did not receive diagnostic call summary")
    assert_true("Tow or roadside help" in call_state["note"], "diagnostic call summary did not preserve call target")
    assert_true("parked at home, no-start" in call_state["note"], "diagnostic call summary did not preserve truck status")
    assert_true("try one more battery/fuse check" in call_state["note"], "diagnostic call summary did not preserve owner ask")
    assert_true(call_state["storedTarget"] == "Tow or roadside help", "diagnostic call summary did not persist target locally")
    assert_true(call_state["storedStatus"] == "parked at home, no-start, can text photos", "diagnostic call summary did not persist truck status")
    assert_true(call_state["storedCallback"] == "text first, available after 3 PM", "diagnostic call summary did not persist callback")
    assert_true("try one more battery/fuse check" in call_state["storedAsk"], "diagnostic call summary did not persist owner ask")
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
            const shareBuilder = document.querySelector("#diagnostic-share-builder");
            const checkTracker = document.querySelector("#first-check-tracker");
            const callSummary = document.querySelector("#diagnostic-call-summary");
            const sharePicker = shareBuilder?.querySelector(".diagnostic-share-picker");
            const shareActions = shareBuilder?.querySelector(".diagnostic-share-card .inspector-actions");
            const checkPicker = checkTracker?.querySelector(".diagnostic-check-picker");
            const checkList = checkTracker?.querySelector(".diagnostic-check-list");
            const checkActions = checkTracker?.querySelector(".diagnostic-check-card .inspector-actions");
            const callFields = callSummary?.querySelector(".diagnostic-call-fields");
            const callActions = callSummary?.querySelector(".diagnostic-call-card .inspector-actions");
            const detailField = shareBuilder?.querySelector("[data-diagnostic-detail]");
            const checkDetail = checkTracker?.querySelector("[data-diagnostic-check-detail]");
            const callAsk = callSummary?.querySelector("[data-diagnostic-call-ask]");
            const receipt = shareBuilder?.querySelector("[data-diagnostic-save-receipt]");
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(triage && triage.getBoundingClientRect().height > 0),
                columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                actionRows: firstActions
                    ? new Set([...firstActions.querySelectorAll(".utility-link")].map((link) => Math.round(link.getBoundingClientRect().top))).size
                    : 0,
                shareVisible: Boolean(shareBuilder && shareBuilder.getBoundingClientRect().height > 0),
                shareColumns: sharePicker ? getComputedStyle(sharePicker).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                shareActionRows: shareActions
                    ? new Set([...shareActions.querySelectorAll(".utility-link")].map((link) => Math.round(link.getBoundingClientRect().top))).size
                    : 0,
                checkVisible: Boolean(checkTracker && checkTracker.getBoundingClientRect().height > 0),
                checkColumns: checkPicker ? getComputedStyle(checkPicker).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                checkItemColumns: checkList ? getComputedStyle(checkList).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                checkActionRows: checkActions
                    ? new Set([...checkActions.querySelectorAll(".utility-link")].map((link) => Math.round(link.getBoundingClientRect().top))).size
                    : 0,
                callVisible: Boolean(callSummary && callSummary.getBoundingClientRect().height > 0),
                callFieldColumns: callFields ? getComputedStyle(callFields).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                callActionRows: callActions
                    ? new Set([...callActions.querySelectorAll(".utility-link")].map((link) => Math.round(link.getBoundingClientRect().top))).size
                    : 0,
                callAskVisible: Boolean(callAsk && callAsk.getBoundingClientRect().height >= 70),
                minCallActionHeight: callActions
                    ? Math.min(...[...callActions.querySelectorAll(".utility-link")].map((link) => link.getBoundingClientRect().height))
                    : 0,
                checkDetailVisible: Boolean(checkDetail && checkDetail.getBoundingClientRect().height >= 70),
                minCheckItemHeight: checkList
                    ? Math.min(...[...checkList.querySelectorAll(".diagnostic-check-item")].map((item) => item.getBoundingClientRect().height))
                    : 0,
                detailFieldVisible: Boolean(detailField && detailField.getBoundingClientRect().height >= 70),
                receiptVisible: Boolean(receipt && receipt.getBoundingClientRect().height > 0),
                dockPrimaryVisible: Boolean(document.querySelector("[data-diagnostic-dock-primary]")?.getBoundingClientRect().height >= 38),
                dockSecondaryVisible: Boolean(document.querySelector("[data-diagnostic-dock-secondary]")?.getBoundingClientRect().height >= 38),
                contextPrimaryVisible: Boolean(document.querySelector('[data-diagnostic-context="primary"]')?.getBoundingClientRect().height >= 38),
                contextSecondaryVisible: Boolean(document.querySelector('[data-diagnostic-context="secondary"]')?.getBoundingClientRect().height >= 38),
                minReceiptActionHeight: receipt
                    ? Math.min(...[...receipt.querySelectorAll(".utility-link")].map((link) => link.getBoundingClientRect().height))
                    : 0,
                overflow: width > window.innerWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "first-minute triage is not visible at iPhone width")
    assert_true(mobile_state["columns"] == 2, "first-minute triage should use two compact columns at iPhone width")
    assert_true(mobile_state["actionRows"] == 1, "first-minute triage actions should stay on one row at iPhone width")
    assert_true(mobile_state["shareVisible"], "diagnostic handoff builder is not visible at iPhone width")
    assert_true(mobile_state["shareColumns"] == 3, "diagnostic handoff builder picker should use three compact columns at iPhone width")
    assert_true(mobile_state["shareActionRows"] == 3, "diagnostic handoff builder actions should use three compact rows at iPhone width")
    assert_true(mobile_state["checkVisible"], "first diagnostic check tracker is not visible at iPhone width")
    assert_true(mobile_state["checkColumns"] == 3, "first diagnostic check tracker picker should use three compact columns at iPhone width")
    assert_true(mobile_state["checkItemColumns"] == 2, "first diagnostic check tracker should keep checks in two iPhone columns")
    assert_true(mobile_state["checkActionRows"] == 2, "first diagnostic check tracker actions should use two compact rows at iPhone width")
    assert_true(mobile_state["callVisible"], "diagnostic call summary is not visible at iPhone width")
    assert_true(mobile_state["callFieldColumns"] == 1, "diagnostic call summary fields should stack on iPhone")
    assert_true(mobile_state["callActionRows"] == 3, "diagnostic call summary actions should use three compact rows at iPhone width")
    assert_true(mobile_state["callAskVisible"], "diagnostic call summary ask field should stay usable at iPhone width")
    assert_true(mobile_state["minCallActionHeight"] >= 38, "diagnostic call summary actions should stay thumb-readable on iPhone")
    assert_true(mobile_state["checkDetailVisible"], "first diagnostic check tracker note field should stay usable at iPhone width")
    assert_true(mobile_state["minCheckItemHeight"] >= 38, "first diagnostic check tracker chips should stay thumb-readable on iPhone")
    assert_true(mobile_state["detailFieldVisible"], "diagnostic owner-detail field should stay usable at iPhone width")
    assert_true(mobile_state["receiptVisible"], "saved diagnostic receipt is not visible at iPhone width after save")
    assert_true(mobile_state["contextPrimaryVisible"], "diagnostic bottom-bar selected-flow action should stay thumb-readable on iPhone")
    assert_true(mobile_state["contextSecondaryVisible"], "diagnostic bottom-bar selected-reference action should stay thumb-readable on iPhone")
    assert_true(mobile_state["minReceiptActionHeight"] >= 38, "saved diagnostic receipt actions should stay thumb-readable on iPhone")
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
            const fuseNote = document.querySelector("[data-fuse-check-note]");
            const sources = document.querySelector("#source-confidence");
            const contact = document.querySelector("[data-roadside-contact-card]");
            const dispatch = document.querySelector("[data-roadside-dispatch-pack]");
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
                hasOfflineRouteCheck: Boolean(printPack?.querySelector("[data-check-offline-routes]")),
                hasOfflineRoutePrime: Boolean(printPack?.querySelector("[data-prime-offline-routes]")),
                hasOfflineRoutePlanCopy: Boolean(printPack?.querySelector("[data-copy-offline-route-plan]")),
                offlineRouteItems: printPack ? printPack.querySelectorAll("[data-offline-route-list] li").length : 0,
                offlineRouteSummary: printPack?.querySelector("[data-offline-route-summary]")?.textContent || "",
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
                hasStackSave: Boolean(stack?.querySelector("[data-save-roadside-note]")),
                hasReceipt: Boolean(stack?.querySelector("[data-roadside-receipt]")),
                receiptHidden: Boolean(stack?.querySelector("[data-roadside-receipt]")?.hidden),
                hasContactCard: Boolean(contact),
                contactText: contact?.innerText.toLowerCase() || "",
                contactFields: contact ? contact.querySelectorAll("[data-roadside-contact-field]").length : 0,
                hasCopyContact: Boolean(contact?.querySelector("[data-copy-roadside-contact]")),
                hasSaveContact: Boolean(contact?.querySelector("[data-save-roadside-contact]")),
                hasContactHandoffRoute: Boolean(contact?.querySelector('a[href="garage.html#recent-handoffs"]')),
                hasLiveSession: Boolean(stack?.querySelector("[data-roadside-live-session]")),
                liveSessionText: stack?.querySelector("[data-roadside-live-session]")?.innerText.toLowerCase() || "",
                liveCheckpointButtons: stack ? stack.querySelectorAll("[data-roadside-checkpoint]").length : 0,
                hasStartSession: Boolean(stack?.querySelector("[data-start-roadside-session]")),
                hasCopySession: Boolean(stack?.querySelector("[data-copy-roadside-session]")),
                hasSaveSession: Boolean(stack?.querySelector("[data-save-roadside-session]")),
                hasResetSession: Boolean(stack?.querySelector("[data-reset-roadside-session]")),
                hasDispatchPack: Boolean(dispatch),
                dispatchText: dispatch?.innerText.toLowerCase() || "",
                dispatchPreview: dispatch?.querySelector("[data-roadside-dispatch-preview]")?.textContent || "",
                hasCopyDispatch: Boolean(dispatch?.querySelector("[data-copy-roadside-dispatch]")),
                hasShareDispatch: Boolean(dispatch?.querySelector("[data-share-roadside-dispatch]")),
                hasSaveDispatch: Boolean(dispatch?.querySelector("[data-save-roadside-dispatch]")),
                hasDispatchHandoffRoute: Boolean(dispatch?.querySelector('a[href="garage.html#recent-handoffs"]')),
                hasTriage: Boolean(triage),
                triageCards: triage ? triage.querySelectorAll(".quick-sheet-triage-grid .dashboard-card").length : 0,
                missingTargets: requiredTargets.filter((href) => !triage?.querySelector(`a[href="${href}"]`)),
                hasFuseNote: Boolean(fuseNote),
                fuseNoteButtons: fuseNote ? fuseNote.querySelectorAll("[data-fuse-note-symptom]").length : 0,
                fuseNoteText: fuseNote ? fuseNote.innerText.toLowerCase() : "",
                fuseNotePreview: fuseNote?.querySelector("[data-fuse-note-preview]")?.innerText.toLowerCase() || "",
                hasFuseNoteField: Boolean(fuseNote?.querySelector("[data-fuse-note-context]")),
                hasFuseNoteCopy: Boolean(fuseNote?.querySelector("[data-copy-fuse-note]")),
                hasFuseNoteShare: Boolean(fuseNote?.querySelector("[data-share-fuse-note]")),
                hasFuseNoteSave: Boolean(fuseNote?.querySelector("[data-save-fuse-note]")),
                hasFuseNoteCabinRoute: Boolean(fuseNote?.querySelector('a[href="cabin.html#fuses"]')),
                hasFuseNoteHoodRoute: Boolean(fuseNote?.querySelector('a[href="hood.html#fuses"]')),
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
    assert_true(state["hasOfflineRouteCheck"], "print/offline pack is missing route-check control")
    assert_true(state["hasOfflineRoutePrime"], "print/offline pack is missing prime-routes control")
    assert_true(state["hasOfflineRoutePlanCopy"], "print/offline pack is missing copy-route-plan control")
    assert_true(state["offlineRouteItems"] == 6, "print/offline pack route check should expose six key routes")
    assert_true("cached routes" in state["offlineRouteSummary"].lower(), "print/offline pack route check should explain cached routes")
    assert_true(state["hasPrintPackCopy"], "print/offline pack is missing copy-prep control")
    assert_true(state["hasPrintPackShare"], "print/offline pack is missing share control")
    assert_true(state["hasPrintPackOfflineStatus"], "print/offline pack is missing live offline status")
    for phrase in ["print the emergency sheet", "offline pack", "rear hitch", "pinout", "garage backup", "source authority", "truck labels"]:
        assert_true(phrase in state["printPackText"], f"print/offline pack is missing text: {phrase}")
    await page.locator("[data-check-offline-routes]").click()
    await page.wait_for_timeout(400)
    route_state = await page.evaluate(
        """() => {
            const printPack = document.querySelector("#print-offline-pack");
            return {
                status: printPack?.querySelector("[data-print-pack-status]")?.textContent || "",
                summary: printPack?.querySelector("[data-offline-route-summary]")?.textContent || "",
                statuses: [...printPack?.querySelectorAll("[data-offline-route-list] li") || []].map((item) => item.dataset.routeStatus || ""),
                routeLinks: [...printPack?.querySelectorAll("[data-offline-route-list] a") || []].map((item) => item.getAttribute("href") || "")
            };
        }"""
    )
    assert_true("key offline routes" in route_state["status"].lower(), "route-check action did not report offline route count")
    assert_true(route_state["statuses"] and all(status in ["ready", "missing"] for status in route_state["statuses"]), "route-check action did not update route item states")
    assert_true(len(route_state["routeLinks"]) == 6, "route-check should expose tappable route links after checking cache")
    await page.locator("[data-copy-offline-route-plan]").click()
    await page.wait_for_timeout(200)
    route_plan_status = await page.locator("[data-print-pack-status]").inner_text()
    assert_true("route plan copied" in route_plan_status.lower() or "copy is unavailable" in route_plan_status.lower(), "copy route plan action did not report status")
    await page.locator("[data-prime-offline-routes]").click()
    await page.wait_for_timeout(700)
    prime_state = await page.evaluate(
        """() => {
            const printPack = document.querySelector("#print-offline-pack");
            return {
                status: printPack?.querySelector("[data-print-pack-status]")?.textContent || "",
                offlineStatus: printPack?.querySelector("[data-quick-offline-status]")?.textContent || "",
                readyCount: [...printPack?.querySelectorAll('[data-offline-route-list] li[data-route-status="ready"]') || []].length,
                routeLinks: [...printPack?.querySelectorAll("[data-offline-route-list] a") || []].map((item) => item.getAttribute("href") || "")
            };
        }"""
    )
    assert_true("roadside routes" in prime_state["status"].lower(), "prime-routes action did not report a roadside-route result")
    assert_true("/6" in prime_state["offlineStatus"], "prime-routes action did not update the live offline route count")
    assert_true("rear-hitch.html#pinout" in prime_state["routeLinks"], "prime-routes list should preserve the pinout route link")
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
    assert_true(state["hasStackSave"], "roadside action stack is missing save-note control")
    assert_true(state["hasReceipt"], "roadside action stack is missing the saved-note receipt")
    assert_true(state["receiptHidden"], "roadside receipt should stay hidden until a note is saved")
    assert_true(state["hasContactCard"], "roadside action stack is missing the contact card")
    assert_true(state["contactFields"] == 4, "roadside contact card should expose four fields")
    assert_true(state["hasCopyContact"], "roadside contact card is missing Copy Contact")
    assert_true(state["hasSaveContact"], "roadside contact card is missing Save Contact Note")
    assert_true(state["hasContactHandoffRoute"], "roadside contact card is missing Recent Handoffs route")
    for phrase in ["roadside contact card", "location", "callback", "help", "eta"]:
        assert_true(phrase in state["contactText"], f"roadside contact card is missing text: {phrase}")
    assert_true(state["hasLiveSession"], "roadside action stack is missing the live session panel")
    assert_true(state["liveCheckpointButtons"] == 3, "roadside live session should expose three checkpoint buttons")
    assert_true(state["hasStartSession"], "roadside live session is missing Start Session")
    assert_true(state["hasCopySession"], "roadside live session is missing Copy Update")
    assert_true(state["hasSaveSession"], "roadside live session is missing Save Log")
    assert_true(state["hasResetSession"], "roadside live session is missing Reset")
    for phrase in ["live roadside session", "safe stop", "help called", "moving again"]:
        assert_true(phrase in state["liveSessionText"], f"roadside live session is missing text: {phrase}")
    assert_true(state["hasDispatchPack"], "roadside action stack is missing the dispatch pack")
    assert_true(state["hasCopyDispatch"], "roadside dispatch pack is missing Copy Dispatch")
    assert_true(state["hasShareDispatch"], "roadside dispatch pack is missing Share")
    assert_true(state["hasSaveDispatch"], "roadside dispatch pack is missing Save Dispatch Log")
    assert_true(state["hasDispatchHandoffRoute"], "roadside dispatch pack is missing Recent Handoffs route")
    for phrase in ["roadside dispatch pack", "selected situation", "contact card", "live checkpoints", "route-cache status"]:
        assert_true(phrase in state["dispatchText"], f"roadside dispatch pack is missing text: {phrase}")
    for phrase in ["flat tire", "94 lb-ft", "copy handoff", "save note"]:
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
    await page.locator("[data-save-roadside-note]").click()
    await page.wait_for_timeout(350)
    receipt_state = await page.evaluate(
        """() => {
            const stack = document.querySelector("#roadside-action-stack");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            const receipt = JSON.parse(localStorage.getItem("ridgeline-roadside-last-handoff") || "null");
            return {
                hidden: Boolean(stack?.querySelector("[data-roadside-receipt]")?.hidden),
                title: stack?.querySelector("[data-roadside-receipt-title]")?.textContent || "",
                summary: stack?.querySelector("[data-roadside-receipt-summary]")?.textContent || "",
                meta: stack?.querySelector("[data-roadside-receipt-meta]")?.textContent || "",
                status: stack?.querySelector("[data-roadside-status]")?.textContent || "",
                note: notes.general_notes || "",
                receiptText: receipt?.text || "",
                garageRoute: Boolean(stack?.querySelector('[data-roadside-receipt] a[href="garage.html#notes"]')),
                hasCopyReceipt: Boolean(stack?.querySelector("[data-copy-roadside-receipt]")),
                hasShareReceipt: Boolean(stack?.querySelector("[data-share-roadside-receipt]"))
            };
        }"""
    )
    assert_true(not receipt_state["hidden"], "roadside receipt should appear after saving a note")
    assert_true("Warning light" in receipt_state["title"], "roadside receipt should show the saved warning-light situation")
    assert_true("Garage Notes" in receipt_state["summary"], "roadside receipt should explain that it saved into Garage Notes")
    assert_true("warning-light flow" in receipt_state["meta"].lower(), "roadside receipt should preserve reference context")
    assert_true("saved to Garage Notes" in receipt_state["status"], "roadside save did not report Garage Notes status")
    assert_true("Roadside Note: Warning light or MID message" in receipt_state["note"], "Garage Notes did not receive the roadside note")
    assert_true("owner's manual remain final authority" in receipt_state["note"], "saved roadside note should preserve the source-authority reminder")
    assert_true("Roadside Note: Warning light or MID message" in receipt_state["receiptText"], "roadside receipt storage did not keep the saved note text")
    assert_true(receipt_state["garageRoute"], "roadside receipt is missing the Open Garage Notes route")
    assert_true(receipt_state["hasCopyReceipt"], "roadside receipt is missing Copy Note")
    assert_true(receipt_state["hasShareReceipt"], "roadside receipt is missing Share")
    await page.locator('[data-roadside-contact-field="location"]').fill("I-35 SB shoulder near exit 230")
    await page.locator('[data-roadside-contact-field="callback"]').fill("My phone and AAA case 123")
    await page.locator('[data-roadside-contact-field="helper"]').fill("Tow requested")
    await page.locator('[data-roadside-contact-field="eta"]').fill("ETA 45 min")
    await page.locator("[data-save-roadside-contact]").click()
    await page.wait_for_timeout(250)
    contact_state = await page.evaluate(
        """() => {
            const stack = document.querySelector("#roadside-action-stack");
            const contact = JSON.parse(localStorage.getItem("ridgeline-roadside-contact-card") || "{}");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            return {
                preview: stack?.querySelector("[data-roadside-contact-preview]")?.textContent || "",
                status: stack?.querySelector("[data-roadside-status]")?.textContent || "",
                storedLocation: contact.location || "",
                storedCallback: contact.callback || "",
                note: notes.general_notes || "",
                overflow: document.documentElement.scrollWidth > window.innerWidth + 1
            };
        }"""
    )
    assert_true("I-35 SB" in contact_state["preview"], "roadside contact preview should show the saved location")
    assert_true("AAA case 123" in contact_state["preview"], "roadside contact preview should show callback detail")
    assert_true("saved to Garage Notes" in contact_state["status"], "roadside contact save did not report Garage Notes status")
    assert_true(contact_state["storedLocation"] == "I-35 SB shoulder near exit 230", "roadside contact storage should keep location")
    assert_true(contact_state["storedCallback"] == "My phone and AAA case 123", "roadside contact storage should keep callback")
    assert_true("Ridgeline roadside contact card" in contact_state["note"], "Garage Notes did not receive the roadside contact card")
    assert_true("Tow requested" in contact_state["note"], "saved contact card did not preserve helper detail")
    assert_true(not contact_state["overflow"], "roadside contact card introduced horizontal overflow")
    await page.locator("[data-start-roadside-session]").click()
    await page.wait_for_timeout(150)
    await page.locator('[data-roadside-checkpoint="Stopped safely"]').click()
    await page.wait_for_timeout(150)
    await page.locator("[data-save-roadside-session]").click()
    await page.wait_for_timeout(250)
    session_state = await page.evaluate(
        """() => {
            const stack = document.querySelector("#roadside-action-stack");
            const session = JSON.parse(localStorage.getItem("ridgeline-roadside-live-session") || "null");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            return {
                title: stack?.querySelector("[data-roadside-live-title]")?.textContent || "",
                elapsed: stack?.querySelector("[data-roadside-live-elapsed]")?.textContent || "",
                count: stack?.querySelector("[data-roadside-live-count]")?.textContent || "",
                checks: stack?.querySelector("[data-roadside-live-checks]")?.textContent || "",
                status: stack?.querySelector("[data-roadside-status]")?.textContent || "",
                storedPlan: session?.planKey || "",
                checkpointCount: session?.checkpoints?.length || 0,
                note: notes.general_notes || ""
            };
        }"""
    )
    assert_true("Warning light" in session_state["title"], "roadside live session should preserve the selected situation")
    assert_true("Elapsed:" in session_state["elapsed"], "roadside live session should show elapsed time")
    assert_true("2 checkpoints" in session_state["count"], "roadside live session should count session start plus safe stop")
    assert_true("Stopped safely" in session_state["checks"], "roadside live session should render the marked checkpoint")
    assert_true("saved to Garage Notes" in session_state["status"], "roadside live session save did not report Garage Notes status")
    assert_true(session_state["storedPlan"] == "warning", "roadside live session storage should keep the selected plan")
    assert_true(session_state["checkpointCount"] == 2, "roadside live session storage should keep checkpoints")
    assert_true("Ridgeline live roadside update" in session_state["note"], "Garage Notes did not receive the live roadside session log")
    assert_true("Roadside contact:" in session_state["note"], "live roadside session log should include contact detail")
    assert_true("I-35 SB shoulder near exit 230" in session_state["note"], "live roadside session log should preserve location detail")
    assert_true("Current roadside conditions" in session_state["note"], "live roadside session log should preserve source-authority reminder")
    await page.locator("[data-copy-roadside-dispatch]").click()
    await page.wait_for_timeout(200)
    await page.locator("[data-save-roadside-dispatch]").click()
    await page.wait_for_timeout(250)
    dispatch_state = await page.evaluate(
        """() => {
            const stack = document.querySelector("#roadside-action-stack");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            return {
                preview: stack?.querySelector("[data-roadside-dispatch-preview]")?.textContent || "",
                status: stack?.querySelector("[data-roadside-status]")?.textContent || "",
                note: notes.general_notes || "",
                overflow: document.documentElement.scrollWidth > window.innerWidth + 1
            };
        }"""
    )
    assert_true("Warning light" in dispatch_state["preview"], "roadside dispatch preview should preserve the selected situation")
    assert_true("contact ready" in dispatch_state["preview"], "roadside dispatch preview should reflect completed contact details")
    assert_true("2 checkpoints" in dispatch_state["preview"], "roadside dispatch preview should reflect live checkpoints")
    assert_true("routes cached" in dispatch_state["preview"], "roadside dispatch preview should include route-cache state")
    assert_true("dispatch pack saved to Garage Notes" in dispatch_state["status"], "roadside dispatch save did not report Garage Notes status")
    assert_true("Ridgeline roadside dispatch: Warning light or MID message" in dispatch_state["note"], "Garage Notes did not receive the roadside dispatch pack")
    assert_true("I-35 SB shoulder near exit 230" in dispatch_state["note"], "roadside dispatch pack did not include contact location")
    assert_true("Checkpoints:" in dispatch_state["note"], "roadside dispatch pack did not include session checkpoints")
    assert_true("Offline route status:" in dispatch_state["note"], "roadside dispatch pack did not include offline route status")
    assert_true("owner's manual remain final authority" in dispatch_state["note"], "roadside dispatch pack should preserve source authority")
    assert_true(not dispatch_state["overflow"], "roadside dispatch pack introduced horizontal overflow")
    assert_true(state["hasTriage"], "quick sheet is missing fuse triage section")
    assert_true(state["triageCards"] == 4, "fuse triage should expose four routing cards")
    assert_true(not state["missingTargets"], f"fuse triage is missing routes: {state['missingTargets']}")
    assert_true(state["hasFuseNote"], "quick sheet is missing the fuse check note tool")
    assert_true(state["fuseNoteButtons"] == 4, "fuse check note should expose four symptom chips")
    assert_true(state["hasFuseNoteField"], "fuse check note is missing the owner-detail field")
    assert_true(state["hasFuseNoteCopy"], "fuse check note is missing Copy Note")
    assert_true(state["hasFuseNoteShare"], "fuse check note is missing Share")
    assert_true(state["hasFuseNoteSave"], "fuse check note is missing Save Garage Note")
    assert_true(state["hasFuseNoteCabinRoute"], "fuse check note is missing Cabin Fuses route")
    assert_true(state["hasFuseNoteHoodRoute"], "fuse check note is missing Hood Fuses route")
    for phrase in ["capture the label", "12v", "trailer", "audio", "start", "truck's fuse-cover label"]:
        assert_true(phrase in state["fuseNoteText"], f"fuse check note is missing text: {phrase}")
    assert_true("12v accessory power" in state["fuseNotePreview"], "fuse check note should default to the 12V accessory plan")
    await page.locator('[data-fuse-note-symptom="trailer"]').click()
    await page.locator("[data-fuse-note-context]").fill("4-flat adapter, left turn light out, cover label photo saved")
    await page.locator("[data-save-fuse-note]").click()
    await page.wait_for_timeout(250)
    fuse_note_state = await page.evaluate(
        """() => {
            const fuseNote = document.querySelector("[data-fuse-check-note]");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            const receipt = JSON.parse(localStorage.getItem("ridgeline-fuse-check-last-note") || "null");
            return {
                pressed: fuseNote?.querySelector('[data-fuse-note-symptom="trailer"]')?.getAttribute("aria-pressed") || "",
                preview: fuseNote?.querySelector("[data-fuse-note-preview]")?.innerText || "",
                status: fuseNote?.querySelector("[data-fuse-note-status]")?.textContent || "",
                note: notes.general_notes || "",
                receiptText: receipt?.text || "",
                receiptTitle: receipt?.title || "",
                overflow: document.documentElement.scrollWidth > window.innerWidth + 1
            };
        }"""
    )
    assert_true(fuse_note_state["pressed"] == "true", "fuse check note should expose selected trailer chip state")
    assert_true("trailer light" in fuse_note_state["preview"].lower(), "fuse check note preview should update to trailer")
    assert_true("saved to Garage Notes" in fuse_note_state["status"], "fuse check note save did not report Garage Notes status")
    assert_true("Fuse Check Note: Trailer light / adapter" in fuse_note_state["note"], "Garage Notes did not receive the fuse check note")
    assert_true("4-flat adapter" in fuse_note_state["note"], "saved fuse note did not preserve owner detail")
    assert_true("truck's fuse-cover label" in fuse_note_state["note"], "saved fuse note should preserve the source-authority reminder")
    assert_true("Fuse Check Note: Trailer light / adapter" in fuse_note_state["receiptText"], "last fuse note receipt did not keep saved text")
    assert_true(fuse_note_state["receiptTitle"] == "Trailer light / adapter", "last fuse note receipt should keep the selected plan title")
    assert_true(not fuse_note_state["overflow"], "fuse check note introduced horizontal overflow")
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
            const receipt = document.querySelector("[data-roadside-receipt]");
            const contact = document.querySelector("[data-roadside-contact-card]");
            const live = document.querySelector("[data-roadside-live-session]");
            const dispatch = document.querySelector("[data-roadside-dispatch-pack]");
            const fuseNote = document.querySelector("[data-fuse-check-note]");
            const grid = critical?.querySelector(".quick-critical-grid");
            const printGrid = printPack?.querySelector(".quick-print-pack-grid");
            const receiptActions = [...(receipt?.querySelectorAll("button, a") || [])].map((action) => action.getBoundingClientRect().height);
            const contactGrid = contact?.querySelector(".roadside-contact-grid");
            const contactActions = [...(contact?.querySelectorAll("button, a") || [])].map((action) => action.getBoundingClientRect().height);
            const liveActions = [...(live?.querySelectorAll("button, a") || [])].map((action) => action.getBoundingClientRect().height);
            const liveGrid = live?.querySelector(".roadside-live-actions");
            const dispatchActions = [...(dispatch?.querySelectorAll("button, a") || [])].map((action) => action.getBoundingClientRect().height);
            const dispatchGrid = dispatch?.querySelector(".roadside-dispatch-actions");
            const fusePicker = fuseNote?.querySelector(".quick-fuse-note-picker");
            const fuseActions = [...(fuseNote?.querySelectorAll("button, a") || [])].map((action) => action.getBoundingClientRect().height);
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
                receiptVisible: Boolean(receipt && !receipt.hidden && receipt.getBoundingClientRect().height > 0),
                minReceiptActionHeight: receiptActions.length ? Math.min(...receiptActions) : 0,
                contactVisible: Boolean(contact && contact.getBoundingClientRect().height > 0),
                contactColumns: contactGrid ? getComputedStyle(contactGrid).gridTemplateColumns.split(" ").length : 0,
                minContactActionHeight: contactActions.length ? Math.min(...contactActions) : 0,
                liveVisible: Boolean(live && live.getBoundingClientRect().height > 0),
                liveActionColumns: liveGrid ? getComputedStyle(liveGrid).gridTemplateColumns.split(" ").length : 0,
                minLiveActionHeight: liveActions.length ? Math.min(...liveActions) : 0,
                dispatchVisible: Boolean(dispatch && dispatch.getBoundingClientRect().height > 0),
                dispatchActionColumns: dispatchGrid ? getComputedStyle(dispatchGrid).gridTemplateColumns.split(" ").length : 0,
                minDispatchActionHeight: dispatchActions.length ? Math.min(...dispatchActions) : 0,
                fuseNoteVisible: Boolean(fuseNote && fuseNote.getBoundingClientRect().height > 0),
                fusePickerColumns: fusePicker ? getComputedStyle(fusePicker).gridTemplateColumns.split(" ").length : 0,
                minFuseActionHeight: fuseActions.length ? Math.min(...fuseActions) : 0,
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
    assert_true(mobile_state["receiptVisible"], "saved roadside receipt is not visible at iPhone width after save")
    assert_true(mobile_state["minReceiptActionHeight"] >= 38, "saved roadside receipt actions should stay thumb-readable on iPhone")
    assert_true(mobile_state["contactVisible"], "roadside contact card is not visible at iPhone width")
    assert_true(mobile_state["contactColumns"] == 1, "roadside contact fields should stack on iPhone")
    assert_true(mobile_state["minContactActionHeight"] >= 38, "roadside contact actions should stay thumb-readable on iPhone")
    assert_true(mobile_state["liveVisible"], "roadside live session is not visible at iPhone width")
    assert_true(mobile_state["liveActionColumns"] == 2, "roadside live session actions should use two compact columns on iPhone")
    assert_true(mobile_state["minLiveActionHeight"] >= 38, "roadside live session actions should stay thumb-readable on iPhone")
    assert_true(mobile_state["dispatchVisible"], "roadside dispatch pack is not visible at iPhone width")
    assert_true(mobile_state["dispatchActionColumns"] == 2, "roadside dispatch actions should use two compact columns on iPhone")
    assert_true(mobile_state["minDispatchActionHeight"] >= 38, "roadside dispatch actions should stay thumb-readable on iPhone")
    assert_true(mobile_state["fuseNoteVisible"], "quick sheet fuse check note should stay visible at iPhone width")
    assert_true(mobile_state["fusePickerColumns"] == 2, "quick sheet fuse check symptom chips should use two columns on iPhone")
    assert_true(mobile_state["minFuseActionHeight"] >= 38, "quick sheet fuse check actions should remain thumb-readable")
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

    checklist_id = "#hood-fuse-pull-checklist" if page_name == "hood.html" else "#cabin-fuse-pull-checklist"
    checklist_state = await page.evaluate(
        """(selector) => {
            const root = document.querySelector(selector);
            const steps = root ? [...root.querySelectorAll("[data-fuse-pull-step]")] : [];
            const actions = root ? [...root.querySelectorAll(".inspector-actions .utility-link")] : [];
            const actionRects = actions.map((action) => action.getBoundingClientRect());
            const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasChecklist: Boolean(root),
                text: root?.innerText || "",
                hasContext: Boolean(root?.querySelector("[data-fuse-pull-context]")),
                stepCount: steps.length,
                hasCopy: Boolean(root?.querySelector("[data-copy-fuse-pull]")),
                hasShare: Boolean(root?.querySelector("[data-share-fuse-pull]")),
                hasSave: Boolean(root?.querySelector("[data-save-fuse-pull]")),
                hasQuickRoute: Boolean(root?.querySelector('a[href="quick-sheet.html#fuse-triage"]')),
                hasGarageRoute: Boolean(root?.querySelector('a[href="garage.html#notes"]')),
                minActionHeight: actionRects.length ? Math.min(...actionRects.map((rect) => rect.height)) : 0,
                overflow: docWidth > document.documentElement.clientWidth + 1
            };
        }""",
        checklist_id,
    )
    assert_true(checklist_state["hasChecklist"], f"{page_name} is missing the fuse pull checklist")
    assert_true(checklist_state["hasContext"], f"{page_name} fuse pull checklist is missing the symptom field")
    assert_true(checklist_state["stepCount"] == 4, f"{page_name} fuse pull checklist should expose four check steps")
    assert_true(checklist_state["hasCopy"], f"{page_name} fuse pull checklist is missing Copy Checklist")
    assert_true(checklist_state["hasShare"], f"{page_name} fuse pull checklist is missing Share")
    assert_true(checklist_state["hasSave"], f"{page_name} fuse pull checklist is missing Save Garage Note")
    assert_true(checklist_state["hasQuickRoute"], f"{page_name} fuse pull checklist is missing Quick Fuse Note route")
    assert_true(checklist_state["hasGarageRoute"], f"{page_name} fuse pull checklist is missing Garage Notes route")
    assert_true("does not add fuse ratings" in checklist_state["text"], f"{page_name} fuse pull checklist is missing its facts boundary")
    assert_true(checklist_state["minActionHeight"] >= 40, f"{page_name} fuse pull checklist actions are too small for iPhone")
    assert_true(not checklist_state["overflow"], f"{page_name} fuse pull checklist introduced iPhone horizontal overflow")

    glossary_id = "#hood-fuse-glossary" if page_name == "hood.html" else "#cabin-fuse-glossary"
    decode_query = "IG MAIN" if page_name == "hood.html" else "MICU"
    await page.locator(f"{glossary_id} [data-fuse-label-input]").fill(decode_query)
    await page.wait_for_timeout(250)
    decoder_state = await page.evaluate(
        """(glossaryId) => {
            const glossary = document.querySelector(glossaryId);
            const decoder = glossary?.querySelector("[data-fuse-label-decoder]");
            const result = decoder?.querySelector("[data-fuse-label-result]");
            const inputRect = decoder?.querySelector("[data-fuse-label-input]")?.getBoundingClientRect();
            const copyRect = decoder?.querySelector("[data-fuse-label-copy]")?.getBoundingClientRect();
            const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasDecoder: Boolean(decoder),
                status: decoder?.querySelector("[data-fuse-label-status]")?.textContent || "",
                resultCount: decoder?.querySelectorAll("[data-fuse-label-result]").length || 0,
                text: decoder?.innerText || "",
                inputHeight: inputRect?.height || 0,
                copyHeight: copyRect?.height || 0,
                overflow: docWidth > document.documentElement.clientWidth + 1,
                firstResultText: result?.innerText || ""
            };
        }""",
        glossary_id,
    )
    assert_true(decoder_state["hasDecoder"], f"{page_name} is missing the fuse label decoder")
    assert_true("row" in decoder_state["status"], f"{page_name} decoder did not report matching fuse rows")
    assert_true(decoder_state["resultCount"] > 0, f"{page_name} decoder did not show matching fuse rows")
    assert_true(decode_query.split(" ")[0] in decoder_state["text"], f"{page_name} decoder did not include the typed label")
    assert_true(decoder_state["inputHeight"] >= 40, f"{page_name} decoder input is too small for iPhone")
    assert_true(decoder_state["copyHeight"] >= 40, f"{page_name} decoder copy button is too small for iPhone")
    assert_true(not decoder_state["overflow"], f"{page_name} fuse label decoder introduced iPhone horizontal overflow")
    await page.locator(f"{glossary_id} [data-fuse-label-result]").first.click()
    await page.wait_for_timeout(250)
    selected_state = await page.evaluate(
        """() => ({
            selectedRows: document.querySelectorAll(".fuse-table tr.is-active").length,
            visibleInspectors: [...document.querySelectorAll("[data-fuse-inspector]")].filter((inspector) => !inspector.hidden).length
        })"""
    )
    assert_true(selected_state["selectedRows"] > 0, f"{page_name} decoder result did not highlight a fuse row")
    assert_true(selected_state["visibleInspectors"] > 0, f"{page_name} decoder result did not open a fuse inspector")
    await page.locator(f"{glossary_id} [data-fuse-label-copy]").click()
    await page.wait_for_timeout(200)
    copy_decode_state = await page.evaluate(
        """(glossaryId) => document.querySelector(`${glossaryId} [data-fuse-label-status]`)?.textContent || ''""",
        glossary_id,
    )
    assert_true("Copied label decode" in copy_decode_state or "Copy failed" in copy_decode_state, f"{page_name} decoder Copy Decode did not report a result")
    assert_true("Verify against the truck cover label" in copy_decode_state, f"{page_name} decoder copy status is missing cover-label reminder")

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
                    hasCopy: Boolean(inspector?.querySelector("[data-copy-fuse]")),
                    hasShare: Boolean(inspector?.querySelector("[data-share-fuse]")),
                    handoffText: inspector?.querySelector(".fuse-handoff-status")?.textContent || "",
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
        assert_true(state["hasCopy"], f"{key} fuse inspector is missing Copy Handoff")
        assert_true(state["hasShare"], f"{key} fuse inspector is missing Share")
        assert_true("Copy or share" in state["handoffText"], f"{key} fuse handoff status should explain the selected fuse action")
        assert_true(state["metaColumns"] == 1, f"{key} fuse inspector meta should stack on iPhone")
        assert_true(state["rowDisplay"] == "block", f"{key} fuse table rows should render as mobile cards")
        assert_true(state["circuitWrap"] != "nowrap", f"{key} fuse circuit cell should wrap on iPhone")
        assert_true("Pos" in state["label"], f"{key} fuse mobile table should show row labels")
        assert_true(state["diagramPans"], f"{key} fuse diagram should pan inside its panel on iPhone")
        assert_true(not state["pageOverflow"], f"{key} fuse page introduced horizontal overflow")
        await page.locator(f'[data-fuse-inspector="{key}"] [data-copy-fuse]').click()
        await page.wait_for_timeout(200)
        copy_state = await page.evaluate(
            """(key) => {
                const inspector = document.querySelector(`[data-fuse-inspector="${key}"]`);
                return {
                    status: inspector?.querySelector(".fuse-handoff-status")?.textContent || "",
                    text: inspector?.innerText || ""
                };
            }""",
            key,
        )
        assert_true("Copied fuse handoff" in copy_state["status"] or "Copy failed" in copy_state["status"], f"{key} Copy Handoff did not report a result")
        assert_true("Verify against the truck cover label" in copy_state["status"], f"{key} selected fuse handoff is missing cover-label reminder")

    await page.locator(f'[data-fuse-inspector="{keys[-1]}"] [data-save-fuse]').click()
    await page.wait_for_timeout(300)
    review_id = "#hood-saved-fuse-review" if page_name == "hood.html" else "#cabin-saved-fuse-review"
    review_state = await page.evaluate(
        """(selector) => {
            const root = document.querySelector(selector);
            const favorites = JSON.parse(localStorage.getItem("ridgeline-favorites") || "[]");
            const actions = root ? [...root.querySelectorAll(".utility-link")] : [];
            const actionRects = actions.map((action) => action.getBoundingClientRect());
            const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasReview: Boolean(root),
                text: root?.innerText || "",
                itemCount: root?.querySelectorAll(".saved-fuse-item").length || 0,
                favoriteCount: favorites.length,
                hasCopyList: Boolean(root?.querySelector("[data-copy-saved-fuses]")),
                hasSaveNote: Boolean(root?.querySelector("[data-save-saved-fuses]")),
                hasRecentHandoffsRoute: Boolean(root?.querySelector('a[href="garage.html#recent-handoffs"]')),
                hasCounterPack: Boolean(root?.querySelector("[data-fuse-counter-pack]")),
                hasCounterTarget: Boolean(root?.querySelector("[data-fuse-counter-target]")),
                hasCounterCallback: Boolean(root?.querySelector("[data-fuse-counter-callback]")),
                hasCounterSymptom: Boolean(root?.querySelector("[data-fuse-counter-symptom]")),
                hasCounterAsk: Boolean(root?.querySelector("[data-fuse-counter-ask]")),
                hasCounterCopy: Boolean(root?.querySelector("[data-copy-fuse-counter-pack]")),
                hasCounterShare: Boolean(root?.querySelector("[data-share-fuse-counter-pack]")),
                hasCounterSave: Boolean(root?.querySelector("[data-save-fuse-counter-pack]")),
                counterCopyDisabled: Boolean(root?.querySelector("[data-copy-fuse-counter-pack]")?.disabled),
                counterText: root?.querySelector("[data-fuse-counter-pack]")?.innerText || "",
                minActionHeight: actionRects.length ? Math.min(...actionRects.map((rect) => rect.height)) : 0,
                overflow: docWidth > document.documentElement.clientWidth + 1
            };
        }""",
        review_id,
    )
    assert_true(review_state["hasReview"], f"{page_name} is missing the saved fuse review panel")
    assert_true(review_state["favoriteCount"] > 0, f"{page_name} Save Fuse did not create a saved fuse")
    assert_true(review_state["itemCount"] > 0, f"{page_name} saved fuse review did not render saved items")
    assert_true(review_state["hasCopyList"], f"{page_name} saved fuse review is missing Copy Saved List")
    assert_true(review_state["hasSaveNote"], f"{page_name} saved fuse review is missing Save Garage Note")
    assert_true(review_state["hasRecentHandoffsRoute"], f"{page_name} saved fuse review is missing Recent Handoffs route")
    assert_true(review_state["hasCounterPack"], f"{page_name} saved fuse review is missing the Fuse Counter Pack")
    assert_true(review_state["hasCounterTarget"], f"{page_name} Fuse Counter Pack is missing the target picker")
    assert_true(review_state["hasCounterCallback"], f"{page_name} Fuse Counter Pack is missing the callback field")
    assert_true(review_state["hasCounterSymptom"], f"{page_name} Fuse Counter Pack is missing the symptom field")
    assert_true(review_state["hasCounterAsk"], f"{page_name} Fuse Counter Pack is missing the question field")
    assert_true(review_state["hasCounterCopy"], f"{page_name} Fuse Counter Pack is missing Copy Counter Pack")
    assert_true(review_state["hasCounterShare"], f"{page_name} Fuse Counter Pack is missing Share")
    assert_true(review_state["hasCounterSave"], f"{page_name} Fuse Counter Pack is missing Save Garage Note")
    assert_true(not review_state["counterCopyDisabled"], f"{page_name} Fuse Counter Pack copy should enable after saving a fuse")
    assert_true("parts counter" in review_state["counterText"].lower(), f"{page_name} Fuse Counter Pack should name parts-counter use")
    assert_true("verify against the truck cover label" in review_state["text"].lower(), f"{page_name} saved fuse review is missing cover-label reminder")
    assert_true(review_state["minActionHeight"] >= 40, f"{page_name} saved fuse review actions are too small for iPhone")
    assert_true(not review_state["overflow"], f"{page_name} saved fuse review introduced iPhone horizontal overflow")
    await page.locator(f"{review_id} [data-fuse-counter-callback]").fill("text owner before replacing anything")
    await page.locator(f"{review_id} [data-fuse-counter-symptom]").fill("saved fuse still tied to the owner symptom")
    await page.locator(f"{review_id} [data-fuse-counter-ask]").fill("confirm the next fuse or part to inspect")
    await page.locator(f"{review_id} [data-copy-fuse-counter-pack]").click()
    await page.wait_for_timeout(200)
    counter_copy_state = await page.locator(f"{review_id} [data-saved-fuse-status]").inner_text()
    assert_true("Fuse counter pack copied" in counter_copy_state or "Copy is unavailable" in counter_copy_state, f"{page_name} Fuse Counter Pack copy did not report a result")
    await page.locator(f"{review_id} [data-save-fuse-counter-pack]").click()
    await page.wait_for_timeout(200)
    counter_saved_state = await page.evaluate(
        """(selector) => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            const root = document.querySelector(selector);
            return {
                notes: notes.general_notes || "",
                status: root?.querySelector("[data-saved-fuse-status]")?.textContent || "",
                stored: JSON.parse(localStorage.getItem("ridgeline-fuse-counter-pack") || "{}")
            };
        }""",
        review_id,
    )
    assert_true("Fuse counter pack saved to Garage Notes" in counter_saved_state["status"], f"{page_name} Fuse Counter Pack did not report Garage save")
    assert_true("Fuse Counter Pack" in counter_saved_state["notes"], f"{page_name} Fuse Counter Pack did not save a Garage note")
    assert_true("saved fuse still tied to the owner symptom" in counter_saved_state["notes"], f"{page_name} Fuse Counter Pack did not save symptom detail")
    assert_true("confirm the next fuse or part" in counter_saved_state["notes"], f"{page_name} Fuse Counter Pack did not save the owner question")
    await page.locator(f"{review_id} [data-copy-saved-fuses]").click()
    await page.wait_for_timeout(200)
    await page.locator(f"{review_id} [data-save-saved-fuses]").click()
    await page.wait_for_timeout(200)
    saved_review_state = await page.evaluate(
        """(selector) => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            const root = document.querySelector(selector);
            return {
                notes: notes.general_notes || "",
                status: root?.querySelector("[data-saved-fuse-status]")?.textContent || ""
            };
        }""",
        review_id,
    )
    assert_true("Saved fuse review added to Garage Notes" in saved_review_state["status"], f"{page_name} saved fuse review did not report Garage save")
    assert_true("saved fuse review" in saved_review_state["notes"].lower(), f"{page_name} saved fuse review did not save a Garage note")
    assert_true("Verify against the truck cover label" in saved_review_state["notes"], f"{page_name} saved fuse review note is missing cover-label reminder")

    await page.locator(f"{checklist_id} [data-fuse-pull-context]").fill("audit fuse cover label and symptom")
    await page.locator(f"{checklist_id} [data-fuse-pull-step]").first.check()
    await page.locator(f"{checklist_id} [data-save-fuse-pull]").click()
    await page.wait_for_timeout(200)
    saved_checklist_state = await page.evaluate(
        """(selector) => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            const root = document.querySelector(selector);
            return {
                savedNotes: notes.general_notes || "",
                status: root?.querySelector("[data-fuse-pull-status]")?.textContent || "",
                preview: root?.querySelector("[data-fuse-pull-preview]")?.innerText || ""
            };
        }""",
        checklist_id,
    )
    assert_true("Fuse pull checklist saved to Garage Notes" in saved_checklist_state["status"], f"{page_name} fuse pull checklist did not report a Garage save")
    assert_true("audit fuse cover label and symptom" in saved_checklist_state["savedNotes"], f"{page_name} fuse pull checklist did not save context to Garage notes")
    assert_true("Selected fuse:" in saved_checklist_state["savedNotes"], f"{page_name} fuse pull checklist did not save selected fuse context")
    assert_true("Photo of cover label saved" in saved_checklist_state["savedNotes"], f"{page_name} fuse pull checklist did not save marked steps")
    assert_true("Verify against the truck cover label" in saved_checklist_state["preview"], f"{page_name} fuse pull checklist preview is missing cover-label reminder")
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
            const pinout = document.querySelector("#pinout");
            const handoff = document.querySelector("[data-pinout-handoff]");
            const saver = document.querySelector("#tow-setup-saver");
            const lightTest = document.querySelector("[data-tow-light-test]");
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
                hasSourceBoundary: Boolean(flow?.innerText.includes("does not change towing limits")),
                hasPinout: Boolean(pinout),
                hasHandoff: Boolean(handoff),
                pinChoiceCount: handoff ? handoff.querySelectorAll("[data-pinout-choice]").length : 0,
                hasCopyPin: Boolean(handoff?.querySelector("[data-copy-pinout-handoff]")),
                hasSharePin: Boolean(handoff?.querySelector("[data-share-pinout-handoff]")),
                hasTrailerFlowRoute: Boolean(handoff?.querySelector('a[href="diagnostics.html#trailer-light-workflow"]')),
                hasJournalRoute: Boolean(handoff?.querySelector('a[href="#area-journal"]')),
                handoffText: handoff?.innerText || "",
                hasSaver: Boolean(saver),
                saverText: saver?.innerText || "",
                saverPlugButtons: saver?.querySelectorAll("[data-tow-setup-plug]").length || 0,
                saverResultButtons: saver?.querySelectorAll("[data-tow-setup-result]").length || 0,
                hasCopySetup: Boolean(saver?.querySelector("[data-copy-tow-setup]")),
                hasShareSetup: Boolean(saver?.querySelector("[data-share-tow-setup]")),
                hasSaveSetup: Boolean(saver?.querySelector("[data-save-tow-setup]")),
                hasOpenJournal: Boolean(saver?.querySelector('a[href="#area-journal"]')),
                hasLightTest: Boolean(lightTest),
                lightTestText: lightTest?.innerText || "",
                lightSelectCount: lightTest?.querySelectorAll("[data-tow-light-function]").length || 0,
                hasLightContext: Boolean(lightTest?.querySelector("[data-tow-light-context]")),
                hasCopyLight: Boolean(lightTest?.querySelector("[data-copy-tow-light]")),
                hasShareLight: Boolean(lightTest?.querySelector("[data-share-tow-light]")),
                hasSaveLight: Boolean(lightTest?.querySelector("[data-save-tow-light]")),
                hasLightTrailerFlow: Boolean(lightTest?.querySelector('a[href="diagnostics.html#trailer-light-workflow"]')),
                heroHasSaverRoute: Boolean(document.querySelector('.section-page-hero a[href="#tow-setup-saver"]')),
                hasBottomPinoutRoute: [...document.querySelectorAll(".context-action-bar a")].some((link) =>
                    link.getAttribute("href") === "#pinout" && /pinout/i.test(link.textContent || "")
                )
            };
        }"""
    )
    assert_true(state["hasFlow"], "rear hitch is missing the trailer hookup flow")
    assert_true(state["cardCount"] == 4, "rear hitch hookup flow should expose four route cards")
    for phrase in ["Latch, pin, chain, plug", "Match the failed function", "Truck, adapter, or trailer", "Record adapter and tester notes"]:
        assert_true(phrase in state["text"], f"rear hitch hookup flow is missing '{phrase}'")
    assert_true(not state["missingLinks"], f"rear hitch hookup flow is missing route links: {state['missingLinks']}")
    assert_true(state["hasSourceBoundary"], "rear hitch hookup flow is missing its no-new-facts boundary note")
    assert_true(state["hasPinout"], "rear hitch page is missing the pinout panel")
    assert_true(state["hasHandoff"], "rear hitch pinout is missing the trailer-light handoff card")
    assert_true(state["pinChoiceCount"] == 7, "pinout handoff should expose seven selectable functions")
    assert_true(state["hasCopyPin"], "pinout handoff is missing Copy Pin")
    assert_true(state["hasSharePin"], "pinout handoff is missing Share")
    assert_true(state["hasTrailerFlowRoute"], "pinout handoff is missing the Trailer Flow route")
    assert_true(state["hasJournalRoute"], "pinout handoff is missing the Save Setup route")
    assert_true("Copy the selected pin" in state["handoffText"], "pinout handoff is missing its action hint")
    assert_true(state["hasSaver"], "rear hitch is missing the Tow Setup Saver")
    assert_true(state["saverPlugButtons"] == 4, "Tow Setup Saver should expose four plug choices")
    assert_true(state["saverResultButtons"] == 3, "Tow Setup Saver should expose three light-check results")
    assert_true(state["hasCopySetup"], "Tow Setup Saver is missing Copy Setup")
    assert_true(state["hasShareSetup"], "Tow Setup Saver is missing Share")
    assert_true(state["hasSaveSetup"], "Tow Setup Saver is missing Save Journal")
    assert_true(state["hasOpenJournal"], "Tow Setup Saver is missing Open Journal")
    assert_true(state["hasLightTest"], "Tow Setup Saver is missing the trailer light test note")
    assert_true(state["lightSelectCount"] == 5, "trailer light test should expose five light-function selectors")
    assert_true(state["hasLightContext"], "trailer light test is missing the trailer/adapter detail field")
    assert_true(state["hasCopyLight"], "trailer light test is missing Copy Light Test")
    assert_true(state["hasShareLight"], "trailer light test is missing Share")
    assert_true(state["hasSaveLight"], "trailer light test is missing Save Journal")
    assert_true(state["hasLightTrailerFlow"], "trailer light test is missing the Trailer Flow route")
    assert_true(state["heroHasSaverRoute"], "rear hitch hero is missing the Tow Setup Saver route")
    for phrase in ["Save The Trailer Setup", "7-Way", "4-Flat", "Passed", "Issue", "existing Rear Hitch Journal", "does not add towing limits"]:
        assert_true(phrase in state["saverText"], f"Tow Setup Saver is missing '{phrase}'")
    light_test_text_lower = state["lightTestText"].lower()
    for phrase in ["light test note", "running", "left", "right", "brake", "reverse", "trailer flow"]:
        assert_true(phrase in light_test_text_lower, f"trailer light test note is missing '{phrase}'")
    assert_true(state["hasBottomPinoutRoute"], "rear hitch iPhone bottom bar is missing the Pinout route")

    await page.locator('[data-pinout-choice="running"]').click()
    running_state = await page.evaluate(
        """() => {
            const handoff = document.querySelector("[data-pinout-handoff]");
            return {
                title: handoff?.querySelector("[data-pinout-handoff-title]")?.textContent || "",
                copy: handoff?.querySelector("[data-pinout-handoff-copy]")?.textContent || "",
                activePressed: handoff?.querySelector('[data-pinout-choice="running"]')?.getAttribute("aria-pressed"),
                activePin: document.querySelector('[data-pin="running"]')?.classList.contains("is-active"),
                status: handoff?.querySelector("[data-pinout-handoff-status]")?.textContent || ""
            };
        }"""
    )
    assert_true("11:00 Pin" in running_state["title"], "running-light handoff did not select the 11:00 pin")
    assert_true("Running lights" in running_state["title"], "running-light handoff did not name the function")
    assert_true("marker lights" in running_state["copy"], "running-light handoff did not describe the selected pin")
    assert_true(running_state["activePressed"] == "true", "running-light handoff button did not expose active state")
    assert_true(running_state["activePin"], "running-light handoff did not sync the diagram active pin")
    assert_true("Function selected" in running_state["status"], "pinout handoff did not report selection status")

    await page.locator("[data-copy-pinout-handoff]").click()
    pin_copy_state = await page.evaluate(
        """() => ({
            status: document.querySelector("[data-pinout-handoff-status]")?.textContent || "",
            text: document.querySelector("[data-pinout-handoff]")?.innerText || ""
        })"""
    )
    assert_true("Selected trailer pin handoff copied" in pin_copy_state["status"] or "Copy is unavailable" in pin_copy_state["status"], "pinout handoff copy did not report a result")
    assert_true("Trailer Flow" in pin_copy_state["text"], "pinout handoff should keep the trailer-flow route visible")

    await page.locator('[data-tow-setup-plug="7-way to 4-flat adapter"]').click()
    await page.locator('[data-tow-setup-result^="Issue found"]').click()
    await page.locator("[data-save-tow-setup]").click()
    setup_state = await page.evaluate(
        """() => {
            const saver = document.querySelector("#tow-setup-saver");
            const area = JSON.parse(localStorage.getItem("ridgeline-area-journal") || "{}");
            const form = document.querySelector('[data-area-journal="rear-hitch"] [data-area-form]');
            return {
                title: saver?.querySelector("[data-tow-setup-title]")?.textContent || "",
                copy: saver?.querySelector("[data-tow-setup-copy]")?.textContent || "",
                status: saver?.querySelector("[data-tow-setup-status]")?.textContent || "",
                activePlug: saver?.querySelector('[data-tow-setup-plug="7-way to 4-flat adapter"]')?.getAttribute("aria-pressed") || "",
                activeResult: saver?.querySelector('[data-tow-setup-result^="Issue found"]')?.getAttribute("aria-pressed") || "",
                savedPrimary: area?.["rear-hitch"]?.notes?.primary_setup || "",
                savedTowNotes: area?.["rear-hitch"]?.notes?.tow_notes || "",
                formTowNotes: form?.elements?.tow_notes?.value || ""
            };
        }"""
    )
    assert_true("4-flat" in setup_state["title"], "Tow Setup Saver did not select the 4-flat adapter")
    assert_true("Issue found" in setup_state["copy"], "Tow Setup Saver did not select the issue result")
    assert_true(setup_state["activePlug"] == "true", "Tow Setup Saver plug choice did not expose active state")
    assert_true(setup_state["activeResult"] == "true", "Tow Setup Saver result choice did not expose active state")
    assert_true("saved into the existing Rear Hitch Journal" in setup_state["status"], "Tow Setup Saver did not report journal save")
    assert_true("7-way to 4-flat adapter" in setup_state["savedPrimary"], "Tow Setup Saver did not save the selected adapter")
    assert_true("Issue found" in setup_state["savedTowNotes"], "Tow Setup Saver did not save the light-check result")
    assert_true("Issue found" in setup_state["formTowNotes"], "Tow Setup Saver did not refresh the visible journal form")

    await page.locator('[data-tow-light-function="Running lights"]').select_option("Passed")
    await page.locator('[data-tow-light-function="Left turn / brake"]').select_option("Issue")
    await page.locator("[data-tow-light-context]").fill("audit utility trailer, 4-flat tester, left signal dead")
    await page.locator("[data-copy-tow-light]").click()
    await page.wait_for_timeout(200)
    light_copy_state = await page.evaluate(
        """() => ({
            status: document.querySelector("[data-tow-light-status]")?.textContent || "",
            summary: document.querySelector("[data-tow-light-summary]")?.textContent || ""
        })"""
    )
    assert_true("Trailer light test copied" in light_copy_state["status"] or "Copy is unavailable" in light_copy_state["status"], "trailer light test copy did not report a result")
    assert_true("2 of 5 checked" in light_copy_state["summary"], "trailer light test summary did not count checked functions")
    await page.locator("[data-save-tow-light]").click()
    light_save_state = await page.evaluate(
        """() => {
            const area = JSON.parse(localStorage.getItem("ridgeline-area-journal") || "{}");
            const form = document.querySelector('[data-area-journal="rear-hitch"] [data-area-form]');
            return {
                status: document.querySelector("[data-tow-light-status]")?.textContent || "",
                savedTowNotes: area?.["rear-hitch"]?.notes?.tow_notes || "",
                formTowNotes: form?.elements?.tow_notes?.value || ""
            };
        }"""
    )
    assert_true("Trailer light test saved into the existing Rear Hitch Journal" in light_save_state["status"], "trailer light test did not report journal save")
    assert_true("Ridgeline trailer light test note" in light_save_state["savedTowNotes"], "trailer light test did not save its note heading")
    assert_true("Left turn / brake: Issue" in light_save_state["savedTowNotes"], "trailer light test did not save the failed function")
    assert_true("audit utility trailer" in light_save_state["formTowNotes"], "trailer light test did not refresh the visible journal form")

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
            const saver = document.querySelector("#tow-setup-saver");
            const saverPlugRects = saver ? [...saver.querySelectorAll("[data-tow-setup-plug]")].map((button) => button.getBoundingClientRect()) : [];
            const saverActionRects = saver ? [...saver.querySelectorAll(".tow-setup-actions .utility-link")].map((button) => button.getBoundingClientRect()) : [];
            const lightTest = document.querySelector("[data-tow-light-test]");
            const lightSelectRects = lightTest ? [...lightTest.querySelectorAll("[data-tow-light-function]")].map((field) => field.getBoundingClientRect()) : [];
            const lightActionRects = lightTest ? [...lightTest.querySelectorAll(".tow-light-actions .utility-link")].map((button) => button.getBoundingClientRect()) : [];
            const handoff = document.querySelector("[data-pinout-handoff]");
            const choiceRects = handoff ? [...handoff.querySelectorAll("[data-pinout-choice]")].map((button) => button.getBoundingClientRect()) : [];
            const actionRects = handoff ? [...handoff.querySelectorAll(".pinout-handoff-actions .utility-link")].map((button) => button.getBoundingClientRect()) : [];
            const dockLinks = [...document.querySelectorAll(".context-action-bar a, .context-action-bar button")].map((link) => (link.textContent || "").trim());
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                readinessVisible: Boolean(readiness?.getBoundingClientRect().height),
                readinessColumns: readinessGrid ? getComputedStyle(readinessGrid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                readinessMinCardHeight: readinessRects.length ? Math.min(...readinessRects.map((rect) => rect.height)) : 0,
                flowVisible: Boolean(flow?.getBoundingClientRect().height),
                cardsStacked: cardRects.every((rect) => rect.width <= document.documentElement.clientWidth - 16),
                minCardHeight: Math.min(...cardRects.map((rect) => rect.height)),
                saverVisible: Boolean(saver?.getBoundingClientRect().height),
                saverPlugMinHeight: saverPlugRects.length ? Math.min(...saverPlugRects.map((rect) => rect.height)) : 0,
                saverActionMinHeight: saverActionRects.length ? Math.min(...saverActionRects.map((rect) => rect.height)) : 0,
                saverActionRows: new Set(saverActionRects.map((rect) => Math.round(rect.top))).size,
                lightVisible: Boolean(lightTest?.getBoundingClientRect().height),
                lightSelectMinHeight: lightSelectRects.length ? Math.min(...lightSelectRects.map((rect) => rect.height)) : 0,
                lightActionMinHeight: lightActionRects.length ? Math.min(...lightActionRects.map((rect) => rect.height)) : 0,
                lightActionRows: new Set(lightActionRects.map((rect) => Math.round(rect.top))).size,
                handoffVisible: Boolean(handoff?.getBoundingClientRect().height),
                choiceMinHeight: choiceRects.length ? Math.min(...choiceRects.map((rect) => rect.height)) : 0,
                actionMinHeight: actionRects.length ? Math.min(...actionRects.map((rect) => rect.height)) : 0,
                actionRows: new Set(actionRects.map((rect) => Math.round(rect.top))).size,
                dockLinks,
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
    assert_true(mobile_state["saverVisible"], "Tow Setup Saver is not visible at iPhone width")
    assert_true(mobile_state["saverPlugMinHeight"] >= 44, "Tow Setup Saver plug choices lost thumb-sized touch targets")
    assert_true(mobile_state["saverActionMinHeight"] >= 44, "Tow Setup Saver actions lost thumb-sized touch targets")
    assert_true(mobile_state["saverActionRows"] <= 2, "Tow Setup Saver actions should stay compact on iPhone")
    assert_true(mobile_state["lightVisible"], "trailer light test note is not visible at iPhone width")
    assert_true(mobile_state["lightSelectMinHeight"] >= 44, "trailer light test selectors lost thumb-sized touch targets")
    assert_true(mobile_state["lightActionMinHeight"] >= 44, "trailer light test actions lost thumb-sized touch targets")
    assert_true(mobile_state["lightActionRows"] <= 2, "trailer light test actions should stay compact on iPhone")
    assert_true(mobile_state["handoffVisible"], "pinout handoff is not visible at iPhone width")
    assert_true(mobile_state["choiceMinHeight"] >= 44, "pinout handoff choices lost thumb-sized touch targets")
    assert_true(mobile_state["actionMinHeight"] >= 44, "pinout handoff actions lost thumb-sized touch targets")
    assert_true(mobile_state["actionRows"] <= 2, "pinout handoff actions should stay compact on iPhone")
    assert_true(mobile_state["dockLinks"] == ["Tow Day", "Pinout", "Hookup", "More"], "rear hitch mobile bottom bar should prioritize Tow Day, Pinout, Hookup, and More")
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
            const mission = panel?.querySelector("[data-photo-mission]");
            const atlasCards = [...document.querySelectorAll("[data-atlas-area]")];
            const emptyStates = [...document.querySelectorAll(".atlas-empty-state")];
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasPanel: Boolean(panel),
                cardCount: cards.length,
                text: panel?.innerText || "",
                missingLinks: requiredLinks.filter((href) => !panel?.querySelector(`a[href="${href}"]`)),
                hasMission: Boolean(mission),
                missionItems: mission?.querySelectorAll(".photo-mission-list li").length || 0,
                missionText: mission?.innerText || "",
                hasCopyMissing: Boolean(mission?.querySelector("[data-photo-copy-missing]")),
                hasShareMissing: Boolean(mission?.querySelector("[data-photo-share-missing]")),
                hasSaveMissing: Boolean(mission?.querySelector("[data-photo-save-missing]")),
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
    assert_true(state["hasMission"], "Photo Capture Plan is missing the capture mission")
    assert_true(state["missionItems"] == 4, "Photo Capture Mission should show four area checklist rows")
    mission_text = state["missionText"].lower()
    for phrase in ["needed", "hood", "cabin", "cargo", "hitch"]:
        assert_true(phrase in mission_text, f"Photo Capture Mission is missing {phrase}")
    assert_true(state["hasCopyMissing"], "Photo Capture Mission is missing Copy Missing")
    assert_true(state["hasShareMissing"], "Photo Capture Mission is missing Share")
    assert_true(state["hasSaveMissing"], "Photo Capture Mission is missing Save Plan")
    assert_true(not state["missingLinks"], f"Photo Capture Plan is missing route links: {state['missingLinks']}")
    assert_true("does not add repair steps" in state["text"], "Photo Capture Plan is missing its no-new-facts boundary note")
    assert_true("Garage Notes only" in state["text"], "Photo Capture Plan should explain the Save Plan boundary")
    assert_true(state["heroHasPlan"], "Photo Atlas hero is missing the capture plan route")
    assert_true(state["dockHasPlan"], "Photo Atlas bottom dock is missing the capture plan route")
    assert_true(state["atlasCount"] == 4, "Photo Atlas should still render four atlas areas")
    assert_true(state["emptyCount"] == 4, "Photo Atlas empty state should render for each empty area")
    assert_true(state["emptyLinks"] == 4, "Photo Atlas empty states should route to area journals")
    assert_true(state["hasPageScope"], "Photo Atlas is missing its page-scoped styling class")
    assert_true(not state["overflow"], "Photo Capture Plan introduced horizontal overflow")

    await page.locator("[data-photo-copy-missing]").click()
    await page.wait_for_timeout(150)
    copy_status = await page.locator("[data-photo-mission-status]").inner_text()
    assert_true("Copied" in copy_status, "Photo Capture Mission copy action did not report success")
    await page.locator("[data-photo-save-missing]").click()
    await page.wait_for_timeout(180)
    save_state = await page.evaluate(
        """() => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            return {
                status: document.querySelector("[data-photo-mission-status]")?.textContent || "",
                notes: notes.general_notes || ""
            };
        }"""
    )
    assert_true("Saved" in save_state["status"], "Photo Capture Mission save action did not report success")
    assert_true("Ridgeline Photo Capture Plan" in save_state["notes"], "Photo Capture Mission did not save into Garage Notes")
    assert_true("Hood:" in save_state["notes"], "Photo Capture Mission saved note should include missing area checklist")

    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(300)
    mobile_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#photo-capture-plan");
            const grid = panel?.querySelector(".photo-capture-grid");
            const missionGrid = panel?.querySelector(".photo-mission-list");
            const missionButtons = [...(panel?.querySelectorAll(".photo-mission-actions button") || [])];
            const cards = panel ? [...panel.querySelectorAll(".photo-capture-card")] : [];
            const cardRects = cards.map((card) => card.getBoundingClientRect());
            const missionButtonRects = missionButtons.map((button) => button.getBoundingClientRect());
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
                missionColumns: missionGrid ? getComputedStyle(missionGrid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                visibleHeroLinks,
                minCardHeight: cardRects.length ? Math.min(...cardRects.map((rect) => rect.height)) : 0,
                maxCardWidth: cardRects.length ? Math.max(...cardRects.map((rect) => rect.width)) : 0,
                minMissionButtonHeight: missionButtonRects.length ? Math.min(...missionButtonRects.map((rect) => rect.height)) : 0,
                maxMissionButtonWidth: missionButtonRects.length ? Math.max(...missionButtonRects.map((rect) => rect.width)) : 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "Photo Capture Plan is not visible at iPhone width")
    assert_true(mobile_state["columns"] == 1, "Photo Capture Plan should stack to one column on iPhone")
    assert_true(mobile_state["missionColumns"] == 1, "Photo Capture Mission should stack to one column on iPhone")
    assert_true(mobile_state["visibleHeroLinks"] == 5, "Photo Atlas mobile hero should keep five primary routes visible")
    assert_true(mobile_state["minCardHeight"] >= 44, "Photo Capture Plan cards lost thumb-sized touch targets")
    assert_true(mobile_state["maxCardWidth"] <= 390, "Photo Capture Plan cards are wider than the iPhone viewport")
    assert_true(mobile_state["minMissionButtonHeight"] >= 42, "Photo Capture Mission actions lost thumb-sized touch targets")
    assert_true(mobile_state["maxMissionButtonWidth"] <= 130, "Photo Capture Mission actions are too wide for the iPhone action row")
    assert_true(not mobile_state["overflow"], "Photo Capture Plan introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_tire_roadside_launcher(page, page_name):
    if page_name != "tires.html":
        return

    state = await page.evaluate(
        """() => {
            const launcher = document.querySelector("#tire-roadside-launcher");
            const builder = document.querySelector("#tire-handoff-builder");
            const sweep = document.querySelector("#tire-pressure-sweep");
            const recheck = document.querySelector("#tire-recheck-planner");
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
                hasBuilder: Boolean(builder),
                builderButtons: builder?.querySelectorAll("[data-tire-handoff-plan]").length || 0,
                builderText: builder?.innerText || "",
                builderPrimary: builder?.querySelector("[data-tire-handoff-primary]")?.getAttribute("href") || "",
                builderSecondary: builder?.querySelector("[data-tire-handoff-secondary]")?.getAttribute("href") || "",
                hasBuilderCopy: Boolean(builder?.querySelector("[data-copy-tire-handoff]")),
                hasBuilderShare: Boolean(builder?.querySelector("[data-share-tire-handoff]")),
                hasBuilderSave: Boolean(builder?.querySelector("[data-save-tire-handoff]")),
                hasSweep: Boolean(sweep),
                sweepInputs: sweep?.querySelectorAll("[data-tire-corner]").length || 0,
                sweepSelects: sweep?.querySelectorAll("[data-tire-corner-status]").length || 0,
                sweepText: sweep?.innerText || "",
                hasSweepCopy: Boolean(sweep?.querySelector("[data-copy-tire-pressure]")),
                hasSweepShare: Boolean(sweep?.querySelector("[data-share-tire-pressure]")),
                hasSweepSave: Boolean(sweep?.querySelector("[data-save-tire-pressure]")),
                hasSweepReset: Boolean(sweep?.querySelector("[data-reset-tire-pressure]")),
                hasRecheck: Boolean(recheck),
                recheckButtons: recheck?.querySelectorAll("[data-tire-recheck-when]").length || 0,
                recheckText: recheck?.innerText || "",
                hasRecheckPlace: Boolean(recheck?.querySelector("[data-tire-recheck-place]")),
                hasRecheckNote: Boolean(recheck?.querySelector("[data-tire-recheck-note]")),
                hasRecheckCopy: Boolean(recheck?.querySelector("[data-copy-tire-recheck]")),
                hasRecheckShare: Boolean(recheck?.querySelector("[data-share-tire-recheck]")),
                hasRecheckSave: Boolean(recheck?.querySelector("[data-save-tire-recheck]")),
                bottomHasRoadside: Boolean(document.querySelector('.context-action[href="#tire-roadside-launcher"]')),
                bottomHasHandoff: Boolean(document.querySelector('.context-action[href="#tire-handoff-builder"]')),
                bottomHasPressure: Boolean(document.querySelector('.context-action[href="#tire-pressure-sweep"]')),
                bottomHasRecheck: Boolean(
                    document.querySelector('.context-action[href="#tire-recheck-planner"]') ||
                    document.querySelector('.section-dock a[href="#tire-recheck-planner"]')
                ),
                heroHasRoadside: Boolean(document.querySelector('.wheel-utility-nav a[href="#tire-roadside-launcher"]')),
                heroHasHandoff: Boolean(document.querySelector('.wheel-utility-nav a[href="#tire-handoff-builder"]')),
                heroHasPressure: Boolean(document.querySelector('.wheel-utility-nav a[href="#tire-pressure-sweep"]')),
                heroHasRecheck: Boolean(document.querySelector('.wheel-utility-nav a[href="#tire-recheck-planner"]')),
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
    assert_true(state["hasBuilder"], "tires page is missing tire handoff builder")
    assert_true(state["builderButtons"] == 4, "tire handoff builder should expose four scenario buttons")
    assert_true(state["builderPrimary"] == "index.html?system=jack-points#viewer", "tire handoff builder should default to jack map")
    assert_true(state["builderSecondary"] == "quick-sheet.html#tires", "tire handoff builder should default to tire card")
    assert_true(state["hasBuilderCopy"], "tire handoff builder is missing Copy")
    assert_true(state["hasBuilderShare"], "tire handoff builder is missing Share")
    assert_true(state["hasBuilderSave"], "tire handoff builder is missing Save Note")
    for phrase in ["tire handoff builder", "flat", "pressure", "after work", "buying", "garage notes"]:
        assert_true(phrase in state["builderText"].lower(), f"tire handoff builder is missing {phrase}")
    assert_true(state["hasSweep"], "tires page is missing pressure sweep")
    assert_true(state["sweepInputs"] == 4, "pressure sweep should expose four PSI inputs")
    assert_true(state["sweepSelects"] == 4, "pressure sweep should expose four status selectors")
    assert_true(state["hasSweepCopy"], "pressure sweep is missing Copy")
    assert_true(state["hasSweepShare"], "pressure sweep is missing Share")
    assert_true(state["hasSweepSave"], "pressure sweep is missing Save Note")
    assert_true(state["hasSweepReset"], "pressure sweep is missing Reset")
    for phrase in ["tire pressure sweep", "front left", "rear right", "garage notes", "35 psi"]:
        assert_true(phrase in state["sweepText"].lower(), f"pressure sweep is missing {phrase}")
    assert_true(state["hasRecheck"], "tires page is missing pressure recheck planner")
    assert_true(state["recheckButtons"] == 4, "pressure recheck planner should expose four timing buttons")
    assert_true(state["hasRecheckPlace"], "pressure recheck planner is missing location input")
    assert_true(state["hasRecheckNote"], "pressure recheck planner is missing follow-up note")
    assert_true(state["hasRecheckCopy"], "pressure recheck planner is missing Copy Recheck")
    assert_true(state["hasRecheckShare"], "pressure recheck planner is missing Share")
    assert_true(state["hasRecheckSave"], "pressure recheck planner is missing Save Recheck")
    for phrase in ["pressure recheck plan", "before drive", "tomorrow", "shop", "garage notes"]:
        assert_true(phrase in state["recheckText"].lower(), f"pressure recheck planner is missing {phrase}")
    assert_true(state["bottomHasRoadside"], "tire page bottom bar is missing roadside launcher route")
    assert_true(state["bottomHasHandoff"], "tire page bottom bar is missing tire handoff route")
    assert_true(state["bottomHasPressure"], "tire page bottom bar is missing pressure sweep route")
    assert_true(state["bottomHasRecheck"], "tire page bottom bar is missing pressure recheck route")
    assert_true(state["heroHasRoadside"], "tire page hero is missing roadside launcher route")
    assert_true(state["heroHasHandoff"], "tire page hero is missing tire handoff route")
    assert_true(state["heroHasPressure"], "tire page hero is missing pressure sweep route")
    assert_true(state["heroHasRecheck"], "tire page hero is missing pressure recheck route")
    assert_true(not state["overflow"], "tire roadside launcher introduced horizontal overflow")
    await page.evaluate("""() => document.querySelector('[data-tire-handoff-plan="buying"]').click()""")
    await page.wait_for_timeout(150)
    buying_state = await page.evaluate(
        """() => {
            const builder = document.querySelector("#tire-handoff-builder");
            return {
                primary: builder?.querySelector("[data-tire-handoff-primary]")?.getAttribute("href") || "",
                secondary: builder?.querySelector("[data-tire-handoff-secondary]")?.getAttribute("href") || "",
                pressed: builder?.querySelector('[data-tire-handoff-plan="buying"]')?.getAttribute("aria-pressed") || "",
                status: builder?.querySelector("[data-tire-handoff-status]")?.textContent || "",
                text: builder?.innerText || ""
            };
        }"""
    )
    assert_true(buying_state["primary"] == "#fitment-guide", "buying tire handoff should route to fitment guide")
    assert_true(buying_state["secondary"] == "garage.html#truck-profile", "buying tire handoff should route to Garage profile")
    assert_true(buying_state["pressed"] == "true", "buying tire handoff button should become active")
    assert_true("Buying handoff ready" in buying_state["status"], "buying tire handoff status did not update")
    assert_true("265/60R18" in buying_state["text"], "buying tire handoff should include fitment caution")
    await page.evaluate("""() => document.querySelector("[data-save-tire-handoff]").click()""")
    await page.wait_for_timeout(150)
    saved_state = await page.evaluate(
        """() => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            return {
                notes: notes.general_notes || "",
                status: document.querySelector("[data-tire-handoff-status]")?.textContent || ""
            };
        }"""
    )
    assert_true("Tire Handoff" in saved_state["notes"], "Save Note should write a tire handoff into Garage Notes")
    assert_true("Tire handoff saved to Garage Notes" in saved_state["status"], "Save Note should report the Garage Notes save")
    await page.evaluate(
        """() => {
            const sweep = document.querySelector("#tire-pressure-sweep");
            sweep.querySelector('[data-tire-corner="Front left"]').value = "31";
            sweep.querySelector('[data-tire-corner="Front left"]').dispatchEvent(new Event("input", { bubbles: true }));
            sweep.querySelector('[data-tire-corner-status="Front left"]').value = "low";
            sweep.querySelector('[data-tire-corner-status="Front left"]').dispatchEvent(new Event("change", { bubbles: true }));
            sweep.querySelector('[data-tire-corner="Rear right"]').value = "35";
            sweep.querySelector('[data-tire-corner="Rear right"]').dispatchEvent(new Event("input", { bubbles: true }));
            sweep.querySelector('[data-tire-corner-status="Rear right"]').value = "ok";
            sweep.querySelector('[data-tire-corner-status="Rear right"]').dispatchEvent(new Event("change", { bubbles: true }));
            sweep.querySelector("[data-tire-pressure-note]").value = "TPMS came on after cold morning";
            sweep.querySelector("[data-tire-pressure-note]").dispatchEvent(new Event("input", { bubbles: true }));
        }"""
    )
    await page.wait_for_timeout(150)
    pressure_state = await page.evaluate(
        """() => {
            document.querySelector("[data-save-tire-pressure]").click();
            const sweep = document.querySelector("#tire-pressure-sweep");
            const saved = JSON.parse(localStorage.getItem("ridgeline-tire-pressure-sweep") || "{}");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            return {
                summary: sweep.querySelector("[data-tire-pressure-summary]")?.textContent || "",
                status: sweep.querySelector("[data-tire-pressure-status]")?.textContent || "",
                savedCorner: saved.corners?.find((item) => item.corner === "Front left") || {},
                notes: notes.general_notes || ""
            };
        }"""
    )
    assert_true("2/4 corners recorded" in pressure_state["summary"], "pressure sweep should summarize recorded corners")
    assert_true("1 flagged" in pressure_state["summary"], "pressure sweep should summarize flagged corners")
    assert_true(pressure_state["savedCorner"].get("psi") == "31", "pressure sweep should persist PSI locally")
    assert_true(pressure_state["savedCorner"].get("status") == "low", "pressure sweep should persist status locally")
    assert_true("Pressure sweep saved to Garage Notes" in pressure_state["status"], "pressure sweep Save Note should report Garage save")
    assert_true("Tire Pressure Sweep" in pressure_state["notes"], "pressure sweep Save Note should write Garage Notes")
    assert_true("Front left: 31 psi; Low" in pressure_state["notes"], "pressure sweep Garage note should include corner reading")
    assert_true("TPMS came on after cold morning" in pressure_state["notes"], "pressure sweep Garage note should include context")
    await page.evaluate(
        """() => {
            const recheck = document.querySelector("#tire-recheck-planner");
            recheck.querySelector('[data-tire-recheck-when="tomorrow"]').click();
            recheck.querySelector("[data-tire-recheck-place]").value = "Costco air";
            recheck.querySelector("[data-tire-recheck-place]").dispatchEvent(new Event("input", { bubbles: true }));
            recheck.querySelector("[data-tire-recheck-note]").value = "Watch front left for repeat drop";
            recheck.querySelector("[data-tire-recheck-note]").dispatchEvent(new Event("input", { bubbles: true }));
        }"""
    )
    await page.wait_for_timeout(150)
    recheck_state = await page.evaluate(
        """() => {
            document.querySelector("[data-save-tire-recheck]").click();
            const recheck = document.querySelector("#tire-recheck-planner");
            const saved = JSON.parse(localStorage.getItem("ridgeline-tire-recheck-plan") || "{}");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            return {
                summary: recheck.querySelector("[data-tire-recheck-summary]")?.textContent || "",
                status: recheck.querySelector("[data-tire-recheck-status]")?.textContent || "",
                pressed: recheck.querySelector('[data-tire-recheck-when="tomorrow"]')?.getAttribute("aria-pressed") || "",
                saved,
                notes: notes.general_notes || ""
            };
        }"""
    )
    assert_true("Tomorrow cold" in recheck_state["summary"], "pressure recheck should summarize selected timing")
    assert_true("Costco air" in recheck_state["summary"], "pressure recheck should summarize location")
    assert_true("Front left" in recheck_state["summary"], "pressure recheck should use flagged tire as watch target")
    assert_true(recheck_state["pressed"] == "true", "pressure recheck timing button should become active")
    assert_true(recheck_state["saved"].get("when") == "tomorrow", "pressure recheck should persist timing locally")
    assert_true(recheck_state["saved"].get("place") == "Costco air", "pressure recheck should persist location locally")
    assert_true("Pressure recheck saved to Garage Notes" in recheck_state["status"], "pressure recheck Save should report Garage save")
    assert_true("Tire Pressure Recheck" in recheck_state["notes"], "pressure recheck Save should write Garage Notes")
    assert_true("Watch front left for repeat drop" in recheck_state["notes"], "pressure recheck Garage note should include follow-up note")
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    mobile_state = await page.evaluate(
        """() => {
            const launcher = document.querySelector("#tire-roadside-launcher");
            const grid = launcher?.querySelector(".tire-roadside-grid");
            const builder = document.querySelector("#tire-handoff-builder");
            const picker = builder?.querySelector(".tire-handoff-picker");
            const actions = builder?.querySelector(".tire-handoff-actions");
            const sweep = document.querySelector("#tire-pressure-sweep");
            const sweepGrid = sweep?.querySelector(".tire-pressure-grid");
            const sweepActions = sweep?.querySelector(".tire-pressure-actions");
            const recheck = document.querySelector("#tire-recheck-planner");
            const recheckPicker = recheck?.querySelector(".tire-recheck-picker");
            const recheckActions = recheck?.querySelector(".tire-recheck-actions");
            const recheckFields = recheck?.querySelector(".tire-recheck-fields");
            const sweepCells = [...(sweep?.querySelectorAll(".tire-pressure-cell") || [])].map((cell) => {
                const rect = cell.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
            });
            const cards = [...(launcher?.querySelectorAll(".tire-roadside-action") || [])].map((card) => {
                const rect = card.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
            });
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(launcher && launcher.getBoundingClientRect().height > 0),
                builderVisible: Boolean(builder && builder.getBoundingClientRect().height > 0),
                columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 0,
                pickerColumns: picker ? getComputedStyle(picker).gridTemplateColumns.split(" ").length : 0,
                actionRows: actions ? new Set([...actions.children].map((button) => Math.round(button.getBoundingClientRect().top))).size : 0,
                sweepVisible: Boolean(sweep && sweep.getBoundingClientRect().height > 0),
                sweepColumns: sweepGrid ? getComputedStyle(sweepGrid).gridTemplateColumns.split(" ").length : 0,
                sweepActionRows: sweepActions ? new Set([...sweepActions.children].map((button) => Math.round(button.getBoundingClientRect().top))).size : 0,
                recheckVisible: Boolean(recheck && recheck.getBoundingClientRect().height > 0),
                recheckPickerColumns: recheckPicker ? getComputedStyle(recheckPicker).gridTemplateColumns.split(" ").length : 0,
                recheckActionRows: recheckActions ? new Set([...recheckActions.children].map((button) => Math.round(button.getBoundingClientRect().top))).size : 0,
                recheckFieldColumns: recheckFields ? getComputedStyle(recheckFields).gridTemplateColumns.split(" ").length : 0,
                minSweepCellHeight: sweepCells.length ? Math.min(...sweepCells.map((cell) => cell.height)) : 0,
                maxSweepCellWidth: sweepCells.length ? Math.max(...sweepCells.map((cell) => cell.width)) : 0,
                minCardHeight: cards.length ? Math.min(...cards.map((card) => card.height)) : 0,
                maxCardWidth: cards.length ? Math.max(...cards.map((card) => card.width)) : 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "tire roadside launcher is not visible at iPhone width")
    assert_true(mobile_state["builderVisible"], "tire handoff builder is not visible at iPhone width")
    assert_true(mobile_state["columns"] == 1, "tire roadside launcher should stack to one column on iPhone")
    assert_true(mobile_state["pickerColumns"] == 4, "tire handoff picker should use four compact columns on iPhone")
    assert_true(mobile_state["actionRows"] == 2, "tire handoff actions should use two rows on iPhone")
    assert_true(mobile_state["sweepVisible"], "pressure sweep is not visible at iPhone width")
    assert_true(mobile_state["sweepColumns"] == 2, "pressure sweep should use two compact columns on iPhone")
    assert_true(mobile_state["sweepActionRows"] == 2, "pressure sweep actions should use two rows on iPhone")
    assert_true(mobile_state["recheckVisible"], "pressure recheck planner is not visible at iPhone width")
    assert_true(mobile_state["recheckPickerColumns"] == 2, "pressure recheck timing buttons should use two compact columns on iPhone")
    assert_true(mobile_state["recheckActionRows"] == 2, "pressure recheck actions should use two rows on iPhone")
    assert_true(mobile_state["recheckFieldColumns"] == 1, "pressure recheck fields should stack on iPhone")
    assert_true(mobile_state["minSweepCellHeight"] >= 92, "pressure sweep cells should remain thumb-readable on iPhone")
    assert_true(mobile_state["maxSweepCellWidth"] <= 190, "pressure sweep cells are wider than half the iPhone viewport")
    assert_true(mobile_state["minCardHeight"] >= 64, "tire roadside cards should remain thumb-sized on iPhone")
    assert_true(mobile_state["maxCardWidth"] <= 390, "tire roadside cards are wider than the iPhone viewport")
    assert_true(not mobile_state["overflow"], "tire roadside launcher introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_nfc_starter_pack(page, page_name):
    if page_name != "nfc.html":
        return

    state = await page.evaluate(
        """() => {
            const pack = document.querySelector("#starter-tag-pack");
            const required = [
                "nfc-landing.html?target=battery-service",
                "nfc-landing.html?target=oil-service",
                "nfc-landing.html?target=diagnostics",
                "nfc-landing.html?target=trailer-pinout"
            ];
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasPack: Boolean(pack),
                cardCount: pack?.querySelectorAll("[data-nfc-starter-card]").length || 0,
                selectCount: pack?.querySelectorAll("[data-nfc-starter-select]").length || 0,
                hasCopy: Boolean(pack?.querySelector("[data-nfc-copy-starter-pack]")),
                missing: required.filter((href) => !pack?.querySelector(`a[href="${href}"]`)),
                text: pack?.innerText || "",
                bottomHasStarter: Boolean(document.querySelector('.context-action[href="#starter-tag-pack"]')),
                bottomHasWrite: Boolean(document.querySelector('.context-action[href="#tag-writer"]')),
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(state["hasPack"], "NFC page is missing the starter tag pack")
    assert_true(state["cardCount"] == 4, "NFC starter tag pack should expose four starter cards")
    assert_true(state["selectCount"] == 4, "NFC starter tag pack should expose four select buttons")
    assert_true(state["hasCopy"], "NFC starter tag pack is missing Copy Pack List")
    assert_true(not state["missing"], f"NFC starter tag pack is missing landing routes: {state['missing']}")
    for phrase in ["Battery And Jump Point", "Oil Service", "Diagnostic Quick Checks", "Trailer Connector And Hitch"]:
        assert_true(phrase in state["text"], f"NFC starter tag pack is missing {phrase}")
    assert_true(state["bottomHasStarter"], "NFC bottom bar is missing the starter pack route")
    assert_true(state["bottomHasWrite"], "NFC bottom bar is missing the writer route")
    assert_true(not state["overflow"], "NFC starter tag pack introduced horizontal overflow")

    await page.locator('[data-nfc-starter-select="battery-service"]').click()
    await page.wait_for_timeout(400)
    select_state = await page.evaluate(
        """() => {
            const field = document.querySelector("#nfc-target-url");
            const status = document.querySelector("[data-nfc-starter-status]");
            const card = document.querySelector('[data-nfc-starter-card="battery-service"]');
            return {
                url: field?.value || "",
                selectedTitle: document.querySelector("#nfc-selected-title")?.textContent || "",
                status: status?.textContent || "",
                active: card?.classList.contains("is-active"),
                hash: window.location.hash
            };
        }"""
    )
    assert_true("target=battery-service" in select_state["url"], "starter select did not load the battery tag URL")
    assert_true(select_state["selectedTitle"] == "Battery And Jump Point", "starter select did not update the writer title")
    assert_true("Loaded Battery And Jump Point" in select_state["status"], "starter select did not report the loaded tag")
    assert_true(select_state["active"], "starter select did not mark the selected starter card active")

    await page.locator("[data-nfc-copy-starter-pack]").click()
    await page.wait_for_timeout(250)
    copy_state = await page.evaluate(
        """() => ({
            starterStatus: document.querySelector("[data-nfc-starter-status]")?.textContent || "",
            writerStatus: document.querySelector("#nfc-status-text")?.textContent || ""
        })"""
    )
    assert_true("Copied the starter tag pack list" in copy_state["starterStatus"], "copy starter pack did not update starter status")
    assert_true("Copied the starter tag pack list" in copy_state["writerStatus"], "copy starter pack did not update writer status")

    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    mobile_state = await page.evaluate(
        """() => {
            const pack = document.querySelector("#starter-tag-pack");
            const grid = pack?.querySelector(".nfc-starter-grid");
            const cards = [...(pack?.querySelectorAll("[data-nfc-starter-card]") || [])].map((card) => {
                const rect = card.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
            });
            const buttons = [...(pack?.querySelectorAll("button, a") || [])].map((button) => button.getBoundingClientRect().height);
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(pack && pack.getBoundingClientRect().height > 0),
                columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                minCardHeight: cards.length ? Math.min(...cards.map((card) => card.height)) : 0,
                maxCardWidth: cards.length ? Math.max(...cards.map((card) => card.width)) : 0,
                minButtonHeight: buttons.length ? Math.min(...buttons) : 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "NFC starter tag pack is not visible at iPhone width")
    assert_true(mobile_state["columns"] == 1, "NFC starter tag pack should stack to one column on iPhone")
    assert_true(mobile_state["minCardHeight"] >= 120, "NFC starter cards became too small for iPhone scanning")
    assert_true(mobile_state["maxCardWidth"] <= 390, "NFC starter cards are wider than the iPhone viewport")
    assert_true(mobile_state["minButtonHeight"] >= 40, "NFC starter actions are too small on iPhone")
    assert_true(not mobile_state["overflow"], "NFC starter tag pack introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_nfc_landing_handoff(page, page_name):
    if page_name != "nfc-landing.html":
        return

    state = await page.evaluate(
        """() => {
            const handoff = document.querySelector("#nfc-scan-handoff");
            const actions = handoff ? [...handoff.querySelectorAll(".nfc-scan-actions > *")] : [];
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                hasHandoff: Boolean(handoff),
                statusCount: handoff?.querySelectorAll("[data-nfc-scan-status]").length || 0,
                hasPreview: Boolean(document.querySelector("#nfc-scan-preview")),
                hasNote: Boolean(document.querySelector("#nfc-scan-note")),
                hasSave: Boolean(document.querySelector("#nfc-scan-save")),
                preview: document.querySelector("#nfc-scan-preview")?.textContent || "",
                bottomHasNote: Boolean(document.querySelector('.context-action[href="#nfc-scan-handoff"]')),
                bottomHasTags: Boolean(document.querySelector('.context-action[href="nfc.html#tag-writer"]')),
                minActionHeight: actions.length ? Math.min(...actions.map((item) => item.getBoundingClientRect().height)) : 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(state["hasHandoff"], "NFC landing page is missing the scan handoff")
    assert_true(state["statusCount"] == 3, "NFC scan handoff should expose three status choices")
    assert_true(state["hasPreview"], "NFC scan handoff is missing the note preview")
    assert_true(state["hasNote"], "NFC scan handoff is missing the quick note field")
    assert_true(state["hasSave"], "NFC scan handoff is missing Save Garage Note")
    assert_true("Under-Hood Fuse Box A" in state["preview"], "NFC scan preview did not include the fallback target")
    assert_true("Saved from NFC landing page" in state["preview"], "NFC scan preview is missing the schema-boundary note")
    assert_true(state["bottomHasNote"], "NFC landing bottom bar is missing the scan note route")
    assert_true(state["bottomHasTags"], "NFC landing bottom bar is missing the tag writer route")
    assert_true(state["minActionHeight"] >= 40, "NFC scan handoff actions are too small")
    assert_true(not state["overflow"], "NFC landing handoff introduced horizontal overflow")

    await page.locator('[data-nfc-scan-status="Needs Attention"]').click()
    await page.locator("#nfc-scan-note").fill("Tester found loose label after scan.")
    await page.locator("#nfc-scan-save").click()
    await page.wait_for_timeout(250)
    save_state = await page.evaluate(
        """() => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            const last = JSON.parse(localStorage.getItem("ridgeline-nfc-last-scan") || "{}");
            return {
                status: document.querySelector("#nfc-scan-status")?.textContent || "",
                preview: document.querySelector("#nfc-scan-preview")?.textContent || "",
                notes: notes.general_notes || "",
                lastStatus: last.status || "",
                lastTarget: last.target || "",
                pressed: document.querySelector('[data-nfc-scan-status="Needs Attention"]')?.getAttribute("aria-pressed")
            };
        }"""
    )
    assert_true(save_state["pressed"] == "true", "NFC scan status did not mark the selected state")
    assert_true("Needs Attention" in save_state["preview"], "NFC scan preview did not update selected status")
    assert_true("Tester found loose label" in save_state["preview"], "NFC scan preview did not include the typed note")
    assert_true("Saved the NFC scan note into Garage Notes" in save_state["status"], "NFC scan save did not report success")
    assert_true("NFC Tag Check" in save_state["notes"], "NFC scan note was not saved into Garage Notes")
    assert_true("Tester found loose label" in save_state["notes"], "NFC scan note did not persist typed note")
    assert_true(save_state["lastStatus"] == "Needs Attention", "NFC last-scan receipt did not preserve status")
    assert_true(save_state["lastTarget"] == "hood-fuse-box-a", "NFC last-scan receipt did not preserve target")

    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    mobile_state = await page.evaluate(
        """() => {
            const handoff = document.querySelector("#nfc-scan-handoff");
            const statusGrid = handoff?.querySelector(".nfc-scan-status-picker");
            const actionGrid = handoff?.querySelector(".nfc-scan-actions");
            const actions = [...(actionGrid?.children || [])].map((item) => item.getBoundingClientRect());
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visible: Boolean(handoff && handoff.getBoundingClientRect().height > 0),
                statusColumns: statusGrid ? getComputedStyle(statusGrid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                actionColumns: actionGrid ? getComputedStyle(actionGrid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                minActionHeight: actions.length ? Math.min(...actions.map((rect) => rect.height)) : 0,
                maxActionWidth: actions.length ? Math.max(...actions.map((rect) => rect.width)) : 0,
                overflow: width > document.documentElement.clientWidth + 1
            };
        }"""
    )
    assert_true(mobile_state["visible"], "NFC scan handoff is not visible at iPhone width")
    assert_true(mobile_state["statusColumns"] == 1, "NFC scan status choices should stack on iPhone")
    assert_true(mobile_state["actionColumns"] == 1, "NFC scan actions should stack on iPhone")
    assert_true(mobile_state["minActionHeight"] >= 40, "NFC scan actions are too short on iPhone")
    assert_true(mobile_state["maxActionWidth"] <= 390, "NFC scan actions are wider than the iPhone viewport")
    assert_true(not mobile_state["overflow"], "NFC scan handoff introduced iPhone horizontal overflow")
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(250)


async def assert_maintenance_features(page, page_name):
    if page_name != "maintenance.html":
        return
    state = await page.evaluate(
        """() => {
            const prep = document.querySelector("#service-prep");
            const launcher = document.querySelector("#service-run-launcher");
            const closeout = document.querySelector("#service-closeout");
            const followup = document.querySelector("#service-followup");
            const runPack = document.querySelector("#service-run-pack");
            const receipt = document.querySelector("[data-maintenance-save-receipt]");
            const launcherCards = launcher ? [...launcher.querySelectorAll(".maintenance-run-card")] : [];
            const closeoutCards = closeout ? [...closeout.querySelectorAll("[data-closeout-service]")] : [];
            const followupButtons = followup ? [...followup.querySelectorAll("[data-followup-service]")] : [];
            const closeoutTray = closeout?.querySelector("[data-service-closeout-form]");
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
                hasCloseout: Boolean(closeout),
                closeoutCardCount: closeoutCards.length,
                closeoutText: closeout?.innerText || "",
                closeoutServices: closeoutCards.map((card) => card.dataset.closeoutService).filter(Boolean),
                hasCloseoutUpdaterRoute: Boolean(closeout?.querySelector('a[href="#maintenance-updater"]')),
                hasCloseoutTray: Boolean(closeoutTray),
                closeoutTrayHidden: Boolean(closeoutTray?.hidden),
                hasCloseoutMileage: Boolean(closeoutTray?.querySelector("[data-service-closeout-mileage]")),
                hasCloseoutNote: Boolean(closeoutTray?.querySelector("[data-service-closeout-note]")),
                hasCloseoutSave: Boolean(closeoutTray?.querySelector("button[type='submit']")),
                hasCloseoutCopy: Boolean(closeoutTray?.querySelector("[data-copy-service-closeout]")),
                hasCloseoutShare: Boolean(closeoutTray?.querySelector("[data-share-service-closeout]")),
                hasFollowup: Boolean(followup),
                followupButtonCount: followupButtons.length,
                followupText: followup?.innerText || "",
                followupServices: followupButtons.map((button) => button.dataset.followupService).filter(Boolean),
                hasFollowupTiming: Boolean(followup?.querySelector("[data-service-followup-timing]")),
                hasFollowupMileage: Boolean(followup?.querySelector("[data-service-followup-mileage]")),
                hasFollowupChecks: Boolean(followup?.querySelector("[data-service-followup-checks]")),
                hasFollowupSave: Boolean(followup?.querySelector("button[type='submit']")),
                hasFollowupCopy: Boolean(followup?.querySelector("[data-copy-service-followup]")),
                hasFollowupShare: Boolean(followup?.querySelector("[data-share-service-followup]")),
                hasFollowupHandoffRoute: Boolean(followup?.querySelector('a[href="garage.html#recent-handoffs"]')),
                hasRunPack: Boolean(runPack),
                runPackText: runPack?.innerText || "",
                hasRunPackService: Boolean(runPack?.querySelector("[data-service-run-pack-service]")),
                hasRunPackMileage: Boolean(runPack?.querySelector("[data-service-run-pack-mileage]")),
                hasRunPackMinder: Boolean(runPack?.querySelector("[data-service-run-pack-minder]")),
                hasRunPackContact: Boolean(runPack?.querySelector("[data-service-run-pack-contact]")),
                hasRunPackNote: Boolean(runPack?.querySelector("[data-service-run-pack-note]")),
                hasRunPackQuestion: Boolean(runPack?.querySelector("[data-service-run-pack-question]")),
                hasRunPackPreview: Boolean(runPack?.querySelector("[data-service-run-pack-preview]")),
                hasRunPackCopy: Boolean(runPack?.querySelector("[data-copy-service-run-pack]")),
                hasRunPackShare: Boolean(runPack?.querySelector("[data-share-service-run-pack]")),
                hasRunPackSave: Boolean(runPack?.querySelector("button[type='submit']")),
                hasRunPackStagingRoute: Boolean(runPack?.querySelector('a[href="garage.html#maintenance-note-preview"]')),
                hasSaveReceipt: Boolean(receipt),
                receiptInitiallyHidden: Boolean(receipt?.hidden),
                hasReceiptCopy: Boolean(receipt?.querySelector("[data-copy-maintenance-receipt]")),
                hasReceiptShare: Boolean(receipt?.querySelector("[data-share-maintenance-receipt]")),
                hasReceiptGarageRoute: Boolean(receipt?.querySelector('a[href="garage.html#maintenance-note-preview"]')),
                hasReceiptFollowupRoute: Boolean(receipt?.querySelector('a[href="#service-followup"]')),
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
    assert_true(state["hasCloseout"], "maintenance page is missing the service closeout panel")
    assert_true(state["closeoutCardCount"] == 4, "service closeout should expose four after-service shortcuts")
    assert_true(set(state["closeoutServices"]) == {"oil_change", "tire_rotation", "battery_install", "filters"}, "service closeout shortcuts should target existing update types")
    assert_true(state["hasCloseoutUpdaterRoute"], "service closeout is missing its Quick Maintenance Update route")
    assert_true(state["hasCloseoutTray"], "service closeout is missing the inline mileage tray")
    assert_true(state["closeoutTrayHidden"], "service closeout tray should stay hidden until a completed job is selected")
    assert_true(state["hasCloseoutMileage"], "service closeout tray is missing its mileage input")
    assert_true(state["hasCloseoutNote"], "service closeout tray is missing its editable note")
    assert_true(state["hasCloseoutSave"], "service closeout tray is missing Save Closeout")
    assert_true(state["hasCloseoutCopy"], "service closeout tray is missing Copy Note")
    assert_true(state["hasCloseoutShare"], "service closeout tray is missing Share")
    assert_true(state["hasFollowup"], "maintenance page is missing the service follow-up panel")
    assert_true(state["followupButtonCount"] == 4, "service follow-up should expose four common service follow-up choices")
    assert_true(set(state["followupServices"]) == {"oil_change", "tire_rotation", "battery_install", "filters"}, "service follow-up choices should target existing update types")
    assert_true(state["hasFollowupTiming"], "service follow-up is missing timing select")
    assert_true(state["hasFollowupMileage"], "service follow-up is missing mileage field")
    assert_true(state["hasFollowupChecks"], "service follow-up is missing recheck list")
    assert_true(state["hasFollowupSave"], "service follow-up is missing Save Follow-Up")
    assert_true(state["hasFollowupCopy"], "service follow-up is missing Copy")
    assert_true(state["hasFollowupShare"], "service follow-up is missing Share")
    assert_true(state["hasFollowupHandoffRoute"], "service follow-up is missing the Garage Recent Handoffs route")
    followup_text_upper = state["followupText"].upper()
    for phrase in ["NEXT CHECK", "SERVICE FOLLOW-UP NOTE", "OIL", "WHEEL", "BATTERY", "FILTERS"]:
        assert_true(phrase in followup_text_upper, f"service follow-up is missing text: {phrase}")
    assert_true(state["hasRunPack"], "maintenance page is missing the Service Run Pack")
    assert_true(state["hasRunPackService"], "Service Run Pack is missing its service selector")
    assert_true(state["hasRunPackMileage"], "Service Run Pack is missing its mileage field")
    assert_true(state["hasRunPackMinder"], "Service Run Pack is missing its dash code field")
    assert_true(state["hasRunPackContact"], "Service Run Pack is missing its counter/callback field")
    assert_true(state["hasRunPackNote"], "Service Run Pack is missing its owner detail field")
    assert_true(state["hasRunPackQuestion"], "Service Run Pack is missing its owner question field")
    assert_true(state["hasRunPackPreview"], "Service Run Pack is missing its live preview")
    assert_true(state["hasRunPackCopy"], "Service Run Pack is missing Copy Pack")
    assert_true(state["hasRunPackShare"], "Service Run Pack is missing Share")
    assert_true(state["hasRunPackSave"], "Service Run Pack is missing Save Garage Note")
    assert_true(state["hasRunPackStagingRoute"], "Service Run Pack is missing its Garage staging route")
    run_pack_text_upper = state["runPackText"].upper()
    for phrase in ["BEFORE THE COUNTER", "SERVICE RUN PACK", "COPY PACK", "SAVE GARAGE NOTE"]:
        assert_true(phrase in run_pack_text_upper, f"Service Run Pack is missing text: {phrase}")
    assert_true(state["hasSaveReceipt"], "Quick Maintenance Update is missing its saved receipt panel")
    assert_true(state["receiptInitiallyHidden"], "maintenance saved receipt should stay hidden until an update is saved")
    assert_true(state["hasReceiptCopy"], "maintenance saved receipt is missing Copy Receipt")
    assert_true(state["hasReceiptShare"], "maintenance saved receipt is missing Share")
    assert_true(state["hasReceiptGarageRoute"], "maintenance saved receipt is missing its Garage route")
    assert_true(state["hasReceiptFollowupRoute"], "maintenance saved receipt is missing its Follow-Up route")
    for phrase in ["AFTER THE JOB", "OIL DONE", "WHEEL DONE", "BATTERY DONE", "FILTERS DONE"]:
        assert_true(phrase in state["closeoutText"], f"service closeout is missing text: {phrase}")
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
            const closeoutGrid = document.querySelector("#service-closeout .service-closeout-grid");
            const closeoutActions = document.querySelector("#service-closeout .service-closeout-actions");
            const followupPicker = document.querySelector("#service-followup .service-followup-picker");
            const followupChecks = document.querySelector("#service-followup [data-service-followup-checks]");
            const followupActions = document.querySelector("#service-followup .service-followup-actions");
            const runPackTool = document.querySelector("#service-run-pack .service-run-pack-tool");
            const runPackActions = document.querySelector("#service-run-pack .service-run-pack-actions");
            const firstFollowupButton = document.querySelector("#service-followup [data-followup-service]");
            const receiptActions = document.querySelector("[data-maintenance-save-receipt] .maintenance-receipt-actions");
            const firstCloseoutButton = document.querySelector("#service-closeout [data-closeout-service]");
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
            const closeoutColumns = closeoutGrid ? getComputedStyle(closeoutGrid).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const launcherActionRows = firstLauncherAction
                ? new Set([...firstLauncherAction.querySelectorAll(".utility-link")].map((button) => Math.round(button.getBoundingClientRect().top))).size
                : 0;
            const prepActionRows = firstPrepAction
                ? new Set([...firstPrepAction.querySelectorAll(".utility-link")].map((button) => Math.round(button.getBoundingClientRect().top))).size
                : 0;
            const minderActionRows = minderActions
                ? new Set([...minderActions.querySelectorAll(".utility-link")].map((button) => Math.round(button.getBoundingClientRect().top))).size
                : 0;
            const receiptActionRows = receiptActions
                ? new Set([...receiptActions.querySelectorAll(".utility-link")].map((button) => Math.round(button.getBoundingClientRect().top))).size
                : 0;
            const closeoutActionRows = closeoutActions
                ? new Set([...closeoutActions.querySelectorAll(".utility-link")].map((button) => Math.round(button.getBoundingClientRect().top))).size
                : 0;
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                visibleMaintenanceHeroLinks,
                visibleMaintenanceDockLinks,
                hasMaintenanceCloseoutRoute: visibleMaintenanceDockLinks.includes("Done") &&
                    Boolean(document.querySelector('.maintenance-page .context-action-bar a[href="#service-closeout"]')),
                hasMaintenanceStagingRoute: visibleMaintenanceDockLinks.includes("Stage") &&
                    Boolean(document.querySelector('.maintenance-page .context-action-bar a[href="garage.html#maintenance-note-preview"]')),
                hasMaintenanceFollowupRoute: visibleMaintenanceDockLinks.includes("Follow") &&
                    Boolean(document.querySelector('.maintenance-page .context-action-bar a[href="#service-followup"]')),
                prepStageText: firstPrepStageButton?.textContent.trim() || "",
                prepStageLabel: firstPrepStageButton?.getAttribute("aria-label") || "",
                minderStageText: minderStageButton?.textContent.trim() || "",
                minderStageLabel: minderStageButton?.getAttribute("aria-label") || "",
                launcherColumns,
                closeoutColumns,
                followupColumns: followupPicker ? getComputedStyle(followupPicker).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                followupCheckColumns: followupChecks ? getComputedStyle(followupChecks).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                runPackColumns: runPackTool ? getComputedStyle(runPackTool).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
                followupButtonHeight: firstFollowupButton?.getBoundingClientRect().height || 0,
                closeoutButtonHeight: firstCloseoutButton?.getBoundingClientRect().height || 0,
                closeoutActionRows,
                followupActionRows: followupActions
                    ? new Set([...followupActions.querySelectorAll(".utility-link")].map((button) => Math.round(button.getBoundingClientRect().top))).size
                    : 0,
                runPackActionRows: runPackActions
                    ? new Set([...runPackActions.querySelectorAll(".utility-link")].map((button) => Math.round(button.getBoundingClientRect().top))).size
                    : 0,
                receiptActionRows,
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
    assert_true(mobile_state["closeoutColumns"] == 2, "service closeout should keep two compact columns at iPhone width")
    assert_true(mobile_state["followupColumns"] == 4, "service follow-up chips should stay compact on iPhone width")
    assert_true(mobile_state["followupCheckColumns"] == 2, "service follow-up checks should use two compact iPhone columns")
    assert_true(mobile_state["runPackColumns"] == 2, "Service Run Pack fields should use two compact iPhone columns")
    assert_true(mobile_state["followupButtonHeight"] >= 40, "service follow-up chips should remain thumb-sized on iPhone width")
    assert_true(mobile_state["followupActionRows"] == 1, "service follow-up actions should stay on one compact iPhone row")
    assert_true(mobile_state["runPackActionRows"] == 1, "Service Run Pack actions should stay on one compact iPhone row")
    assert_true(mobile_state["closeoutButtonHeight"] >= 44, "service closeout shortcuts should remain thumb-sized on iPhone width")
    assert_true(mobile_state["closeoutActionRows"] <= 1, "service closeout tray actions should stay on one compact iPhone row")
    assert_true(mobile_state["receiptActionRows"] == 1, "maintenance receipt actions should stay on one compact iPhone row")
    assert_true(mobile_state["launcherActionRows"] == 1, "service run launcher action buttons should stay on one compact row at iPhone width")
    assert_true(mobile_state["visibleMaintenanceDockLinks"] == ["Done", "Prep", "Follow", "More"], "maintenance mobile bottom bar should prioritize Done, Prep, Follow, and More")
    assert_true(mobile_state["hasMaintenanceCloseoutRoute"], "maintenance mobile bottom bar is missing the closeout route")
    assert_true(mobile_state["hasMaintenanceFollowupRoute"], "maintenance mobile bottom bar is missing the service follow-up route")
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
    await page.locator("#service-closeout [data-closeout-service='battery_install']").click()
    await page.wait_for_timeout(450)
    closeout_state = await page.evaluate(
        """() => {
            const form = document.querySelector("[data-maintenance-update-form]");
            const closeout = document.querySelector("#service-closeout");
            const tray = closeout?.querySelector("[data-service-closeout-form]");
            return {
                service: form?.elements.service?.value || "",
                note: form?.elements.note?.value || "",
                trayVisible: Boolean(tray && !tray.hidden && tray.getBoundingClientRect().height > 0),
                trayTitle: tray?.querySelector("[data-service-closeout-title]")?.textContent || "",
                trayNote: tray?.querySelector("[data-service-closeout-note]")?.value || "",
                trayActive: document.activeElement?.getAttribute("data-service-closeout-mileage") !== null,
                pressed: closeout?.querySelector("[data-closeout-service='battery_install']")?.getAttribute("aria-pressed") || "",
                closeoutStatus: document.querySelector("[data-service-closeout-status]")?.textContent || "",
                updateStatus: document.querySelector("[data-maintenance-update-status]")?.textContent || ""
            };
        }"""
    )
    assert_true(closeout_state["service"] == "battery_install", "service closeout did not preselect the existing battery install update type")
    assert_true("Battery service complete" in closeout_state["note"], "service closeout did not prefill the battery completion note")
    assert_true(closeout_state["trayVisible"], "service closeout did not reveal the inline mileage tray")
    assert_true("Battery install closeout" in closeout_state["trayTitle"], "service closeout tray should name the selected closeout")
    assert_true("Battery service complete" in closeout_state["trayNote"], "service closeout tray did not prefill the completion note")
    assert_true(closeout_state["trayActive"], "service closeout should focus the inline mileage input")
    assert_true(closeout_state["pressed"] == "true", "selected service closeout shortcut should expose pressed state")
    assert_true("Battery install closeout is ready" in closeout_state["closeoutStatus"], "service closeout did not report the ready state")
    assert_true("Battery install closeout selected" in closeout_state["updateStatus"], "Quick Maintenance Update did not reflect the selected closeout")
    await page.locator("[data-copy-service-closeout]").click()
    await page.wait_for_timeout(100)
    closeout_copy_status = await page.locator("[data-service-closeout-status]").inner_text()
    assert_true("Closeout note copied" in closeout_copy_status, "service closeout copy did not report success")
    await page.locator("[data-service-closeout-mileage]").fill("166240")
    await page.locator("[data-service-closeout-form] button[type='submit']").click()
    await page.wait_for_timeout(200)
    receipt_state = await page.evaluate(
        """() => {
            const receipt = document.querySelector("[data-maintenance-save-receipt]");
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            const log = JSON.parse(localStorage.getItem("ridgeline-maintenance-log") || "[]");
            return {
                visible: Boolean(receipt && !receipt.hidden && receipt.getBoundingClientRect().height > 0),
                text: receipt?.innerText || "",
                title: receipt?.querySelector("[data-maintenance-receipt-title]")?.textContent || "",
                meta: receipt?.querySelector("[data-maintenance-receipt-meta]")?.textContent || "",
                closeoutStatus: document.querySelector("[data-service-closeout-status]")?.textContent || "",
                closeoutMileage: document.querySelector("[data-service-closeout-mileage]")?.value || "",
                status: document.querySelector("[data-maintenance-update-status]")?.textContent || "",
                notes: notes.general_notes || "",
                logCount: log.length,
                latestService: log[0]?.service || "",
                latestMileage: log[0]?.mileage || 0,
                preservedKey: notes.quick_capture_keep || ""
            };
        }"""
    )
    assert_true(receipt_state["visible"], "maintenance saved receipt did not appear after saving a closeout update")
    assert_true("Battery install saved" in receipt_state["title"], "maintenance receipt should name the saved update type")
    assert_true("166,240 miles" in receipt_state["meta"], "maintenance receipt should show the saved mileage")
    assert_true("Garage Notes updated" in receipt_state["meta"], "maintenance receipt should confirm the Garage Notes handoff")
    assert_true("Battery service complete" in receipt_state["text"], "maintenance receipt should show the saved closeout note")
    assert_true("Battery install saved at 166,240 miles" in receipt_state["closeoutStatus"], "inline service closeout save should report mileage")
    assert_true(receipt_state["closeoutMileage"] == "", "inline service closeout should clear mileage after saving")
    assert_true("Battery install saved at 166,240 miles" in receipt_state["status"], "maintenance save status should confirm mileage and date")
    assert_true(receipt_state["logCount"] >= 1 and receipt_state["latestService"] == "battery_install", "maintenance save did not write the selected closeout service to the log")
    assert_true(receipt_state["latestMileage"] == 166240, "maintenance save did not write the entered mileage to the log")
    assert_true("Battery service complete" in receipt_state["notes"], "maintenance save did not append the closeout note to Garage notes")
    assert_true(receipt_state["preservedKey"] == "preserve me", "maintenance save dropped an unrelated Garage note key")
    followup_prefill = await page.evaluate(
        """() => {
            const panel = document.querySelector("#service-followup");
            const checks = [...(panel?.querySelectorAll("[data-service-followup-check]") || [])];
            return {
                title: panel?.querySelector("[data-service-followup-title]")?.textContent || "",
                summary: panel?.querySelector("[data-service-followup-summary]")?.textContent || "",
                mileage: panel?.querySelector("[data-service-followup-mileage]")?.value || "",
                pressed: panel?.querySelector("[data-followup-service='battery_install']")?.getAttribute("aria-pressed") || "",
                checkCount: checks.length,
                checkedCount: checks.filter((item) => item.checked).length,
                status: document.querySelector("[data-service-followup-status]")?.textContent || ""
            };
        }"""
    )
    assert_true("Battery service follow-up" in followup_prefill["title"], "saved battery closeout should prefill the battery follow-up")
    assert_true("terminal" in followup_prefill["summary"].lower(), "battery follow-up should show service-specific recheck guidance")
    assert_true(followup_prefill["mileage"] == "166240", "service follow-up should inherit saved closeout mileage")
    assert_true(followup_prefill["pressed"] == "true", "service follow-up should expose selected service pressed state")
    assert_true(followup_prefill["checkCount"] == 4, "service follow-up should render four service-specific checks")
    assert_true(followup_prefill["checkedCount"] == 2, "service follow-up should preselect the first two recheck items")
    assert_true("Battery service follow-up is ready" in followup_prefill["status"], "service follow-up should report it is ready after closeout save")
    await page.locator("#service-followup textarea[name='followup_note']").fill("Watch for slow crank after sitting overnight.")
    await page.locator("#service-followup [data-copy-service-followup]").click()
    await page.wait_for_timeout(100)
    followup_copy_status = await page.locator("[data-service-followup-status]").inner_text()
    assert_true("Follow-up copied" in followup_copy_status, "service follow-up copy did not report success")
    await page.locator("#service-followup button[type='submit']").click()
    await page.wait_for_timeout(150)
    followup_saved = await page.evaluate(
        """() => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            return {
                status: document.querySelector("[data-service-followup-status]")?.textContent || "",
                notes: notes.general_notes || "",
                preservedKey: notes.quick_capture_keep || ""
            };
        }"""
    )
    assert_true("Follow-up saved to Garage Notes" in followup_saved["status"], "service follow-up save did not report success")
    assert_true("Ridgeline service follow-up: Battery install" in followup_saved["notes"], "service follow-up save did not write the selected service")
    assert_true("Watch for slow crank" in followup_saved["notes"], "service follow-up save did not write the owner note")
    assert_true("Starts normally after sitting" in followup_saved["notes"], "service follow-up save did not include the checked battery item")
    assert_true(followup_saved["preservedKey"] == "preserve me", "service follow-up save dropped an unrelated Garage note key")
    await page.locator("[data-copy-maintenance-receipt]").click()
    await page.wait_for_timeout(100)
    receipt_copy_status = await page.locator("[data-maintenance-update-status]").inner_text()
    assert_true("Maintenance receipt copied" in receipt_copy_status, "maintenance receipt copy did not report success")
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
    await page.locator("#service-run-pack [data-service-run-pack-service]").select_option("oil_change")
    await page.locator("#service-run-pack [data-service-run-pack-mileage]").fill("166245")
    await page.locator("#service-run-pack [data-service-run-pack-minder]").fill("A1")
    await page.locator("#service-run-pack [data-service-run-pack-contact]").fill("Parts counter callback")
    await page.locator("#service-run-pack [data-service-run-pack-note]").fill("Bring oil filter and crush washer options.")
    await page.locator("#service-run-pack [data-service-run-pack-question]").fill("Verify filter fitment before checkout.")
    await page.wait_for_timeout(150)
    run_pack_preview = await page.locator("#service-run-pack [data-service-run-pack-preview]").inner_text()
    assert_true("Ridgeline service run pack: Oil change" in run_pack_preview, "Service Run Pack preview did not name the selected service")
    assert_true("166,245 miles" in run_pack_preview, "Service Run Pack preview did not include mileage")
    assert_true("0W-20 oil and final dipstick level check" in run_pack_preview, "Service Run Pack preview did not include checked prep items")
    await page.locator("#service-run-pack [data-copy-service-run-pack]").click()
    await page.wait_for_timeout(100)
    run_pack_copy_status = await page.locator("[data-service-run-pack-status]").inner_text()
    assert_true("Service run pack copied" in run_pack_copy_status, "Service Run Pack copy did not report success")
    await page.locator("#service-run-pack button[type='submit']").click()
    await page.wait_for_timeout(150)
    run_pack_saved = await page.evaluate(
        """() => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            const draft = JSON.parse(localStorage.getItem("ridgeline-service-run-pack") || "{}");
            return {
                status: document.querySelector("[data-service-run-pack-status]")?.textContent || "",
                notes: notes.general_notes || "",
                preservedKey: notes.quick_capture_keep || "",
                draftService: draft.service || "",
                draftQuestion: draft.question || ""
            };
        }"""
    )
    assert_true("Service run pack saved to Garage Notes" in run_pack_saved["status"], "Service Run Pack save did not report success")
    assert_true("Ridgeline service run pack: Oil change" in run_pack_saved["notes"], "Service Run Pack save did not write the selected service")
    assert_true("Parts counter callback" in run_pack_saved["notes"], "Service Run Pack save did not write the counter/callback detail")
    assert_true("Verify filter fitment before checkout" in run_pack_saved["notes"], "Service Run Pack save did not write the owner question")
    assert_true("0W-20 oil and final dipstick level check" in run_pack_saved["notes"], "Service Run Pack save did not include checked prep")
    assert_true(run_pack_saved["preservedKey"] == "preserve me", "Service Run Pack save dropped an unrelated Garage note key")
    assert_true(run_pack_saved["draftService"] == "oil_change", "Service Run Pack did not persist the selected service draft")
    assert_true("Verify filter fitment" in run_pack_saved["draftQuestion"], "Service Run Pack did not persist the owner question draft")
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
            const fillChecklist = document.querySelector("#garage-fill-in-checklist");
            const handoffPanel = document.querySelector("#recent-handoffs");
            const fillChecklistLinks = [
                "#truck-profile",
                "maintenance.html#service-closeout",
                "#warning-light-template",
                "photo-atlas.html#photo-capture-plan"
            ];
            const activity = document.querySelector("#diagnostic-activity [data-diagnostic-activity]");
            const backupCheckpoint = document.querySelector("#diagnostic-activity [data-garage-backup-checkpoint]");
            const maintenanceNotes = document.querySelector("#maintenance-note-preview [data-maintenance-note-preview]");
            const maintenanceParts = document.querySelector("#maintenance-note-preview [data-maintenance-parts-preview]");
            const maintenanceNoteText = document.querySelector("#maintenance-note-preview")?.innerText || "";
            const handoffText = handoffPanel?.innerText || "";
            const activityText = document.querySelector("#diagnostic-activity")?.innerText || "";
            const template = document.querySelector("#warning-light-template");
            const jobTemplate = document.querySelector("#job-note-template");
            const requiredFields = [
                "warning_light_date_mileage",
                "warning_light_indicator",
                "warning_light_behavior",
                "warning_light_context",
                "warning_light_mid_message",
                "warning_light_next_action"
            ];
            const requiredJobFields = [
                "job_note_date_mileage",
                "job_note_title",
                "job_note_parts",
                "job_note_area",
                "job_note_result",
                "job_note_followup"
            ];
            return {
                hasDashboard: Boolean(dashboard),
                hasDiagnosticCard: Boolean(diagnosticCard),
                hasDiagnosticCardRoute: Boolean(diagnosticCard?.querySelector('a[href="#warning-light-template"]')),
                hasStagingDashboardCard: Boolean(stagingCard),
                hasStagingDashboardRoute: Boolean(stagingCard?.querySelector('a[href="#maintenance-note-preview"]')),
                hasHandoffDashboardCard: Boolean([...dashboard.querySelectorAll(".dashboard-card")]
                    .some((card) => card.textContent.includes("Recent Handoffs") && card.querySelector('a[href="#recent-handoffs"]'))),
                hasFillChecklist: Boolean(fillChecklist),
                fillChecklistCards: fillChecklist?.querySelectorAll(".garage-setup-card").length || 0,
                hasFillSnapshot: Boolean(fillChecklist?.querySelector("[data-garage-fill-snapshot]")),
                fillSnapshotText: fillChecklist?.querySelector("[data-garage-fill-snapshot]")?.innerText || "",
                hasFillCopy: Boolean(fillChecklist?.querySelector("[data-garage-fill-copy]")),
                hasFillShare: Boolean(fillChecklist?.querySelector("[data-garage-fill-share]")),
                hasFillNext: Boolean(fillChecklist?.querySelector("[data-garage-fill-next]")),
                fillChecklistText: fillChecklist?.innerText || "",
                fillChecklistMissingRoutes: fillChecklistLinks.filter((href) => !fillChecklist?.querySelector(`a[href="${href}"]`)),
                hasFillChecklistBackup: Boolean(fillChecklist?.querySelector("[data-garage-fill-backup]")),
                dockHasFillChecklist: Boolean(document.querySelector('.context-action[href="#garage-fill-in-checklist"]')),
                dockHasHandoffs: Boolean(document.querySelector('.context-action[href="#recent-handoffs"]')),
                dockHasBackup: Boolean(document.querySelector('.context-action[href="#diagnostic-activity"]')),
                hasHeroHandoffRoute: Boolean(document.querySelector('.section-utility-nav a[href="#recent-handoffs"]')),
                hasHandoffPanel: Boolean(handoffPanel),
                hasHandoffCopy: Boolean(handoffPanel?.querySelector("[data-copy-recent-handoff]")),
                hasHandoffList: Boolean(handoffPanel?.querySelector("[data-recent-handoffs]")),
                handoffFilterCount: handoffPanel?.querySelectorAll("[data-recent-handoff-filter]").length || 0,
                handoffEmpty: Boolean(handoffPanel?.textContent.includes("No saved handoffs yet.")),
                handoffText,
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
                hasRestorePlan: Boolean(document.querySelector("#diagnostic-activity [data-copy-garage-restore-plan]")),
                restorePlanDisabled: document.querySelector("#diagnostic-activity [data-copy-garage-restore-plan]")?.disabled === true,
                textHasActivityJson: activityText.includes("Activity JSON"),
                textHasPhotoMetadata: activityText.includes("photo metadata"),
                textHasRestoreNote: activityText.includes("Restore Backup imports"),
                textHasSafetyNote: activityText.includes("Use Download Backup first"),
                textHasImageByteNote: activityText.includes("browser-local image bytes are not included"),
                hasPreview: Boolean(document.querySelector("#diagnostic-activity [data-garage-backup-preview]")),
                previewHidden: document.querySelector("#diagnostic-activity [data-garage-backup-preview]")?.hidden === true,
                hasTemplate: Boolean(template),
                missingFields: requiredFields.filter((name) => !template?.querySelector(`[name="${name}"]`)),
                hasTemplateRoute: Boolean(template?.querySelector('a[href="diagnostics.html#warning-light-workflow"]')),
                hasJobTemplate: Boolean(jobTemplate),
                missingJobFields: requiredJobFields.filter((name) => !jobTemplate?.querySelector(`[name="${name}"]`)),
                hasJobTemplateCloseoutRoute: Boolean(jobTemplate?.querySelector('a[href="maintenance.html#service-closeout"]')),
                hasJobTemplateStagingRoute: Boolean(jobTemplate?.querySelector('a[href="#maintenance-note-preview"]')),
                hasJobCopy: Boolean(jobTemplate?.querySelector("[data-copy-job-note]")),
                hasJobAppend: Boolean(jobTemplate?.querySelector("[data-append-job-note]")),
                jobTemplateText: jobTemplate?.innerText || ""
            };
        }"""
    )
    assert_true(state["hasDashboard"], "garage page is missing the garage dashboard")
    assert_true(state["hasDiagnosticCard"], "garage dashboard is missing the diagnostic notes card")
    assert_true(state["hasDiagnosticCardRoute"], "diagnostic notes card is missing the warning-light note route")
    assert_true(state["hasStagingDashboardCard"], "garage dashboard is missing the parts staging card")
    assert_true(state["hasStagingDashboardRoute"], "garage dashboard parts staging card is missing the staging route")
    assert_true(state["hasHandoffDashboardCard"], "garage dashboard is missing the recent handoffs card")
    assert_true(state["hasFillChecklist"], "garage dashboard is missing the fill-in checklist")
    assert_true(state["fillChecklistCards"] == 4, "garage fill-in checklist should expose four record cards")
    assert_true(state["hasFillSnapshot"], "garage fill-in checklist is missing the record snapshot")
    assert_true(state["hasFillCopy"], "garage fill-in checklist is missing Copy Plan")
    assert_true(state["hasFillShare"], "garage fill-in checklist is missing Share Plan")
    assert_true(state["hasFillNext"], "garage fill-in checklist is missing the next-record route")
    assert_true(not state["fillChecklistMissingRoutes"], f"garage fill-in checklist is missing routes: {state['fillChecklistMissingRoutes']}")
    assert_true(state["hasFillChecklistBackup"], "garage fill-in checklist is missing the backup action")
    assert_true(state["dockHasFillChecklist"], "garage bottom dock is missing the fill-in route")
    assert_true(state["dockHasHandoffs"], "garage bottom dock is missing the recent handoffs route")
    assert_true(state["dockHasBackup"], "garage bottom dock is missing the backup route")
    fill_checklist_lower = state["fillChecklistText"].lower()
    for phrase in ["what to record next", "garage snapshot", "next on this iphone", "copy plan", "share plan", "truck profile", "service closeout", "diagnostic memory", "photo and area notes", "only reads existing garage data"]:
        assert_true(phrase in fill_checklist_lower, f"garage fill-in checklist is missing {phrase}")
    fill_snapshot_lower = state["fillSnapshotText"].lower()
    assert_true("record paths started" in fill_snapshot_lower, "garage fill-in snapshot is missing record paths started")
    assert_true(
        "truck profile ready" in fill_snapshot_lower or "latest service record" in fill_snapshot_lower or "no fresh record yet" in fill_snapshot_lower,
        "garage fill-in snapshot should show latest profile, service, or empty-record state"
    )
    await page.locator("#garage-fill-in-checklist [data-garage-fill-copy]").click()
    fill_copy_status = await page.locator("#garage-fill-in-checklist [data-garage-fill-status]").inner_text()
    assert_true("Garage record plan" in fill_copy_status, "garage fill-in Copy Plan did not report status")
    assert_true(state["hasHeroHandoffRoute"], "garage hero is missing the recent handoffs shortcut")
    assert_true(state["hasHandoffPanel"], "garage page is missing the recent handoffs panel")
    assert_true(state["hasHandoffCopy"], "recent handoffs panel is missing Copy Latest")
    assert_true(state["hasHandoffList"], "recent handoffs panel is missing its list surface")
    assert_true(state["handoffEmpty"], "recent handoffs panel should render an empty state before saved handoffs")
    handoff_text_lower = state["handoffText"].lower()
    assert_true(state["handoffFilterCount"] == 6, "recent handoffs panel should expose six type filters")
    for phrase in ["recent handoffs", "roadside, service, fuse, diagnostic, tire, and tow notes", "open quick sheet", "open diagnostics", "open follow-up", "open tire recheck"]:
        assert_true(phrase in handoff_text_lower, f"recent handoffs panel is missing {phrase}")
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
        ("hasRestorePlan", "garage backup restore-plan copy button is missing"),
        ("restorePlanDisabled", "garage backup restore-plan copy button should start disabled"),
        ("textHasActivityJson", "diagnostic activity JSON handoff note is missing"),
        ("textHasPhotoMetadata", "garage backup photo-metadata note is missing"),
        ("textHasRestoreNote", "garage backup restore note is missing"),
        ("textHasSafetyNote", "garage backup pre-restore safety note is missing"),
        ("textHasImageByteNote", "garage backup local-image-byte note is missing"),
        ("hasPreview", "garage backup preview surface is missing"),
        ("previewHidden", "garage backup preview should start hidden"),
        ("hasTemplate", "garage page is missing warning-light note template"),
        ("hasTemplateRoute", "warning-light template is missing diagnostics route"),
        ("hasJobTemplate", "garage page is missing service job note template"),
        ("hasJobTemplateCloseoutRoute", "service job note template is missing closeout route"),
        ("hasJobTemplateStagingRoute", "service job note template is missing staging route"),
        ("hasJobCopy", "service job note template is missing copy action"),
        ("hasJobAppend", "service job note template is missing append action"),
    ]:
        assert_true(state[key], message)
    assert_true(not state["missingFields"], f"warning-light template is missing fields: {state['missingFields']}")
    assert_true(not state["missingJobFields"], f"service job note template is missing fields: {state['missingJobFields']}")
    for phrase in ["Service Job Note", "Parts / supplies", "Work performed / result", "Follow-up / next buy", "Copy Job Note", "Append To General Notes"]:
        assert_true(phrase in state["jobTemplateText"], f"service job note template is missing {phrase}")
    await page.locator("#job-note-template [name='job_note_date_mileage']").fill("5/23/2026 / 166,420 miles")
    await page.locator("#job-note-template [name='job_note_title']").fill("Battery terminal cleaning")
    await page.locator("#job-note-template [name='job_note_parts']").fill("terminal brush, gloves")
    await page.locator("#job-note-template [name='job_note_area']").fill("Hood")
    await page.locator("#job-note-template [name='job_note_result']").fill("Cleaned corrosion and photographed positive terminal cover.")
    await page.locator("#job-note-template [name='job_note_followup']").fill("Recheck starting after next cold morning.")
    await page.locator("#job-note-template [data-copy-job-note]").click()
    await page.wait_for_timeout(150)
    job_copy_status = await page.locator("#job-note-template [data-job-note-status]").inner_text()
    assert_true("Service job note copied" in job_copy_status, "service job note Copy action did not report copied status")
    await page.locator("#job-note-template [data-append-job-note]").click()
    await page.wait_for_timeout(150)
    job_append_state = await page.evaluate(
        """() => {
            const notes = JSON.parse(localStorage.getItem("ridgeline-notes") || "{}");
            const general = notes.general_notes || "";
            return {
                status: document.querySelector("#job-note-template [data-job-note-status]")?.textContent || "",
                general,
                storedTitle: notes.job_note_title || "",
                storedParts: notes.job_note_parts || ""
            };
        }"""
    )
    assert_true("Appended Battery terminal cleaning to General Notes" in job_append_state["status"], "service job note append action did not report the appended job")
    assert_true("Ridgeline Service Job Note - Battery terminal cleaning" in job_append_state["general"], "service job note append did not add the job note block")
    assert_true("terminal brush, gloves" in job_append_state["general"], "service job note append did not preserve parts text")
    assert_true("Recheck starting after next cold morning" in job_append_state["general"], "service job note append did not preserve follow-up text")
    assert_true(job_append_state["storedTitle"] == "Battery terminal cleaning", "service job note title should persist in the existing Garage notes object")
    assert_true(job_append_state["storedParts"] == "terminal brush, gloves", "service job note parts should persist in the existing Garage notes object")
    await page.evaluate("""() => {
        localStorage.setItem('ridgeline-remote-enabled', '0');
        localStorage.setItem('ridgeline-notes', JSON.stringify({
            general_notes: `[May 24, 2026, 1:10 AM - Tire Pressure Recheck]
Ridgeline Tire Pressure Recheck
Timing: Tomorrow morning cold
Where: driveway
Watch list:
- Left front: flagged
[May 24, 2026, 1:05 AM - Diagnostic Note: Warning light or MID message]
Record color, exact wording, and what happened before it appeared
Owner detail: amber TPMS after air stop
[May 24, 2026, 1:03 AM - Service Follow-Up]
Ridgeline service follow-up: Oil change
Recheck: Next drive
Owner note: verify drain/filter area
[May 24, 2026, 1:00 AM - Fuse Check Note: 12V power]
Ridgeline fuse check: 12V power
Symptom: front socket dead`
        }));
        localStorage.setItem('ridgeline-area-journal', JSON.stringify({
            'rear-hitch': {
                notes: {
                    tow_notes: `[Trailer light test saved May 24, 2026, 1:15 AM]
Ridgeline trailer light test note
Running: passed
Left: issue`
                },
                photos: []
            }
        }));
    }""")
    await page.reload()
    await page.wait_for_selector("#recent-handoffs [data-recent-handoffs]", state="attached")
    await page.wait_for_timeout(300)
    handoff_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#recent-handoffs");
            const card = [...document.querySelectorAll("[data-garage-dashboard] .dashboard-card")]
                .find((item) => item.textContent.includes("Recent Handoffs"));
            return {
                cardText: card?.innerText || "",
                panelText: panel?.innerText || "",
                itemCount: panel?.querySelectorAll(".roadside-note-item").length || 0,
                copyEnabled: panel?.querySelector("[data-copy-recent-handoff]")?.disabled === false,
                perItemCopyCount: panel?.querySelectorAll("[data-copy-recent-handoff-index]").length || 0,
                filterCount: panel?.querySelectorAll("[data-recent-handoff-filter]").length || 0,
                serviceFilterText: panel?.querySelector('[data-recent-handoff-filter="service"]')?.textContent || "",
                diagnosticFilterText: panel?.querySelector('[data-recent-handoff-filter="diagnostic"]')?.textContent || "",
                hasTireRoute: Boolean(panel?.querySelector('a[href="tires.html#tire-recheck-planner"]')),
                hasDiagnosticRoute: Boolean(panel?.querySelector('a[href="diagnostics.html#diagnostic-share-builder"]')),
                hasFuseRoute: Boolean(panel?.querySelector('a[href="quick-sheet.html#fuse-triage"]')),
                hasServiceRoute: Boolean(panel?.querySelector('a[href="maintenance.html#service-followup"]')),
                hasTowRoute: Boolean(panel?.querySelector('a[href="rear-hitch.html#tow-setup-saver"]'))
            };
        }"""
    )
    assert_true("5 saved" in handoff_state["cardText"], "recent handoffs dashboard card should summarize saved handoffs")
    assert_true(handoff_state["itemCount"] == 5, "recent handoffs panel should show tire, diagnostic, service, fuse, and tow handoffs")
    assert_true(handoff_state["copyEnabled"], "recent handoffs Copy Latest should enable when handoffs exist")
    assert_true(handoff_state["perItemCopyCount"] == 5, "recent handoffs panel should expose per-item copy actions")
    assert_true(handoff_state["filterCount"] == 6, "recent handoffs panel should keep type filters after saved handoffs render")
    assert_true("Service 1" in handoff_state["serviceFilterText"], "recent handoffs service filter should show the saved service count")
    assert_true("Diagnostic 1" in handoff_state["diagnosticFilterText"], "recent handoffs diagnostic filter should show the saved diagnostic count")
    for phrase in ["Tire Pressure Recheck", "Diagnostic Note: Warning light", "Service Follow-Up", "Fuse Check Note", "Trailer Light Test"]:
        assert_true(phrase in handoff_state["panelText"], f"recent handoffs panel is missing {phrase}")
    assert_true(handoff_state["hasTireRoute"], "recent handoffs panel is missing the tire source route")
    assert_true(handoff_state["hasDiagnosticRoute"], "recent handoffs panel is missing the diagnostics source route")
    assert_true(handoff_state["hasFuseRoute"], "recent handoffs panel is missing the fuse source route")
    assert_true(handoff_state["hasServiceRoute"], "recent handoffs panel is missing the service follow-up source route")
    assert_true(handoff_state["hasTowRoute"], "recent handoffs panel is missing the trailer light source route")
    await page.locator("#recent-handoffs [data-copy-recent-handoff]").click()
    await page.wait_for_timeout(150)
    handoff_copy_status = await page.locator("#recent-handoffs [data-recent-handoff-status]").inner_text()
    assert_true("Copied all handoff: Tire Pressure Recheck" in handoff_copy_status, "recent handoffs Copy Latest did not report the latest handoff")
    await page.locator("#recent-handoffs [data-copy-recent-handoff-index='1']").click()
    await page.wait_for_timeout(150)
    handoff_second_status = await page.locator("#recent-handoffs [data-recent-handoff-status]").inner_text()
    assert_true("Copied all handoff: Diagnostic Note: Warning light" in handoff_second_status, "recent handoffs per-item copy did not report the selected handoff")
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.wait_for_timeout(250)
    await page.locator("#recent-handoffs [data-recent-handoff-filter='service']").click()
    await page.wait_for_timeout(150)
    handoff_service_state = await page.evaluate(
        """() => {
            const panel = document.querySelector("#recent-handoffs");
            const gridStyle = getComputedStyle(panel.querySelector(".recent-handoff-filters")).gridTemplateColumns;
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            return {
                itemCount: panel?.querySelectorAll(".roadside-note-item").length || 0,
                pressed: panel?.querySelector('[data-recent-handoff-filter="service"]')?.getAttribute("aria-pressed"),
                status: panel?.querySelector("[data-recent-handoff-status]")?.textContent || "",
                text: panel?.innerText || "",
                filterColumns: gridStyle.split(" ").filter(Boolean).length,
                overflow: width > window.innerWidth + 1
            };
        }"""
    )
    assert_true(handoff_service_state["itemCount"] == 1, "recent handoffs Service filter should show one service handoff")
    assert_true(handoff_service_state["pressed"] == "true", "recent handoffs Service filter should become active")
    assert_true("Showing 1 service saved handoff" in handoff_service_state["status"], "recent handoffs Service filter should update the status")
    assert_true("Service Follow-Up" in handoff_service_state["text"], "recent handoffs Service filter should show the service note")
    assert_true("Fuse Check Note" not in handoff_service_state["text"], "recent handoffs Service filter should hide non-service notes")
    assert_true(handoff_service_state["filterColumns"] == 3, "recent handoff filters should render as a three-column iPhone grid")
    assert_true(not handoff_service_state["overflow"], "recent handoff filters introduced mobile horizontal overflow")
    await page.locator("#recent-handoffs [data-copy-recent-handoff]").click()
    await page.wait_for_timeout(150)
    handoff_service_copy_status = await page.locator("#recent-handoffs [data-recent-handoff-status]").inner_text()
    assert_true("Copied service handoff: Service Follow-Up" in handoff_service_copy_status, "filtered Copy Latest should copy the active service handoff")
    await page.evaluate("""() => {
        localStorage.setItem('ridgeline-remote-enabled', '0');
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
            const fillChecklist = document.querySelector("#garage-fill-in-checklist");
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
                hasFillMaintenanceHandoff: Boolean(fillChecklist?.querySelector("[data-garage-maintenance-handoff]")),
                fillMaintenanceHandoffText: fillChecklist?.querySelector("[data-garage-maintenance-handoff]")?.innerText || "",
                hasFillCopyLatestMaintenance: Boolean(fillChecklist?.querySelector("[data-garage-fill-copy-latest-maintenance]")),
                hasFillCopyLatestBuy: Boolean(fillChecklist?.querySelector("[data-garage-fill-copy-latest-buy]")),
                fillCopyLatestBuyEnabled: fillChecklist?.querySelector("[data-garage-fill-copy-latest-buy]")?.disabled === false,
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
    assert_true(populated_state["hasFillMaintenanceHandoff"], "garage fill-in checklist should surface the latest Maintenance handoff")
    assert_true("latest maintenance handoff" in populated_state["fillMaintenanceHandoffText"].lower(), "Garage fill-in Maintenance handoff should be labeled")
    assert_true("Maintenance Minder A1 planner" in populated_state["fillMaintenanceHandoffText"], "Garage fill-in Maintenance handoff should name the latest saved planner note")
    assert_true("2 need-to-buy" in populated_state["fillMaintenanceHandoffText"], "Garage fill-in Maintenance handoff should summarize open latest-note need lines")
    assert_true(populated_state["hasFillCopyLatestMaintenance"], "Garage fill-in Maintenance handoff is missing Copy Note")
    assert_true(populated_state["hasFillCopyLatestBuy"], "Garage fill-in Maintenance handoff is missing Copy Need")
    assert_true(populated_state["fillCopyLatestBuyEnabled"], "Garage fill-in Maintenance handoff Copy Need should enable when latest note has open need lines")
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
    await page.locator("#garage-fill-in-checklist [data-garage-fill-copy-latest-maintenance]").click()
    await page.wait_for_timeout(150)
    fill_latest_status = await page.locator("#garage-fill-in-checklist [data-garage-fill-status]").inner_text()
    assert_true("Copied latest maintenance handoff: Maintenance Minder A1 planner" in fill_latest_status, "Garage fill-in latest Maintenance copy did not report the copied note")
    await page.locator("#garage-fill-in-checklist [data-garage-fill-copy-latest-buy]").click()
    await page.wait_for_timeout(150)
    fill_need_status = await page.locator("#garage-fill-in-checklist [data-garage-fill-status]").inner_text()
    assert_true("Copied latest maintenance need list with 2 items" in fill_need_status, "Garage fill-in latest Maintenance need copy did not report the open need count")
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
            const fillChecklist = document.querySelector("#garage-fill-in-checklist .garage-setup-grid");
            const fillSnapshot = document.querySelector("#garage-fill-in-checklist [data-garage-fill-snapshot]");
            const fillActions = document.querySelector("#garage-fill-in-checklist .garage-setup-actions");
            const counterStyle = counterPanel ? getComputedStyle(counterPanel) : null;
            const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            const columns = preview ? getComputedStyle(preview).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const partsColumns = partsPreview ? getComputedStyle(partsPreview).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const backupCheckpointColumns = backupCheckpoint ? getComputedStyle(backupCheckpoint).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const fillChecklistColumns = fillChecklist ? getComputedStyle(fillChecklist).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const fillSnapshotColumns = fillSnapshot ? getComputedStyle(fillSnapshot).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const fillActionColumns = fillActions ? getComputedStyle(fillActions).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
            const fillActionMinHeight = fillActions ? Math.min(...[...fillActions.querySelectorAll(".utility-link")].map((action) => action.getBoundingClientRect().height)) : 0;
            return {
                overflow: width > document.documentElement.clientWidth + 1,
                columns,
                partsColumns,
                backupCheckpointColumns,
                fillChecklistColumns,
                fillSnapshotColumns,
                fillActionColumns,
                fillActionMinHeight,
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
    assert_true(garage_mobile_state["fillChecklistColumns"] == 1, "Garage Fill-In Checklist should stack to one column on iPhone width")
    assert_true(garage_mobile_state["fillSnapshotColumns"] == 1, "Garage Fill-In snapshot should stack to one column on iPhone width")
    assert_true(garage_mobile_state["fillActionColumns"] == 3, "Garage Fill-In snapshot actions should stay in one compact iPhone row")
    assert_true(garage_mobile_state["fillActionMinHeight"] >= 40, "Garage Fill-In snapshot actions should stay thumb-sized on iPhone width")
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
    await page.evaluate(
        """() => {
            localStorage.setItem("ridgeline-roadside-last-handoff", JSON.stringify({
                title: "Warning light roadside note",
                summary: "Saved warning-light roadside handoff",
                savedAt: "2026-05-21T18:30:00.000Z"
            }));
            localStorage.setItem("ridgeline-diagnostic-last-handoff", JSON.stringify({
                planKey: "warning",
                title: "Warning light or MID message",
                summary: "Record color, exact wording, and what happened before it appeared saved into Garage Notes.",
                reference: "warning-light flow, emergency card, Garage warning note",
                savedAt: "2026-05-21T18:45:00.000Z"
            }));
            localStorage.setItem("ridgeline-maintenance-log", JSON.stringify([{
                createdAt: "2026-05-21T17:30:00.000Z",
                service: "battery",
                mileageText: "45,123 mi",
                note: "Battery closeout saved"
            }]));
            localStorage.setItem("ridgeline-notes", JSON.stringify({
                general_notes: "Garage note from smoke check"
            }));
            localStorage.setItem("ridgeline-last-task", JSON.stringify({
                href: "diagnostics.html#diagnostic-share-builder",
                label: "Diagnostic Handoff Builder",
                kind: "workflow",
                at: "2026-05-21T16:30:00.000Z"
            }));
            localStorage.setItem("ridgeline-recent-nav", JSON.stringify([{
                href: "maintenance.html#service-closeout",
                label: "Service Closeout",
                at: "2026-05-21T15:30:00.000Z"
            }]));
            localStorage.setItem("ridgeline-last-section:quick-sheet.html", "roadside-action-stack");
            localStorage.setItem("ridgeline-last-section:rear-hitch.html", "pinout");
        }"""
    )
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
            const intent = document.querySelector(".search-intent-strip");
            const resume = document.querySelector("[data-search-resume-work]");
            const recent = document.querySelector("[data-search-recent-work]");
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
                hasIntent: Boolean(intent),
                intentCards: intent?.querySelectorAll("a").length || 0,
                intentText: intent?.textContent || "",
                hasResume: Boolean(resume && !resume.hidden),
                resumeCards: resume?.querySelectorAll("a").length || 0,
                resumeText: resume?.textContent || "",
                resumeMissing: [
                    "diagnostics.html#diagnostic-share-builder",
                    "maintenance.html#service-closeout"
                ].filter((href) => !resume?.querySelector(`a[href="${href}"]`)),
                resumeHasSavedSection: Boolean(
                    resume?.querySelector('a[href="quick-sheet.html#roadside-action-stack"]') ||
                    resume?.querySelector('a[href="rear-hitch.html#pinout"]')
                ),
                hasRecent: Boolean(recent && !recent.hidden),
                recentCards: recent?.querySelectorAll("a").length || 0,
                recentText: recent?.textContent || "",
                recentMissing: [
                    "garage.html#diagnostic-activity",
                    "quick-sheet.html#roadside-action-stack",
                    "maintenance.html#maintenance-updater"
                ].filter((href) => !recent?.querySelector(`a[href="${href}"]`)),
                intentMissing: [
                    "maintenance.html#service-closeout",
                    "garage.html#garage-fill-in-checklist",
                    "diagnostics.html#diagnostic-share-builder",
                    "quick-sheet.html#print-offline-pack"
                ].filter((href) => !intent?.querySelector(`a[href="${href}"]`)),
                offlineMissing: [
                    "quick-sheet.html#roadside-action-stack",
                    "diagnostics.html#workflow-index",
                    "hood.html#fuses",
                    "quick-sheet.html#emergency-card",
                    "garage.html#diagnostic-activity"
                ].filter((href) => !offlineCard?.querySelector(`a[href="${href}"]`)),
                hasOfflineRefresh: Boolean(offlineCard?.querySelector("[data-search-refresh-pack]")),
                hasOfflineRouteCheck: Boolean(offlineCard?.querySelector("[data-search-check-routes]")),
                hasOfflineRoutePrime: Boolean(offlineCard?.querySelector("[data-search-prime-routes]")),
                hasOfflineRoutePlanCopy: Boolean(offlineCard?.querySelector("[data-search-copy-route-plan]")),
                hasOfflineRouteReadiness: Boolean(offlineCard?.querySelector(".search-route-check")),
                offlineRouteItems: offlineCard?.querySelectorAll("[data-search-route-list] li").length || 0,
                offlineRouteSummary: offlineCard?.querySelector("[data-search-route-summary]")?.textContent || "",
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
    assert_true(quick_state["hasIntent"], "search modal is missing the owner shortcut strip")
    assert_true(quick_state["intentCards"] == 4, "search owner shortcut strip should expose four routes")
    assert_true(not quick_state["intentMissing"], f"search owner shortcut strip is missing routes: {quick_state['intentMissing']}")
    for phrase in ["I need to", "Finish service", "Fill Garage", "Share symptom", "Prep offline"]:
        assert_true(phrase in quick_state["intentText"], f"search owner shortcut strip is missing {phrase}")
    assert_true(quick_state["hasResume"], "search modal is missing the seeded resume strip")
    assert_true(quick_state["resumeCards"] == 3, "search resume strip should expose three seeded routes")
    assert_true(not quick_state["resumeMissing"], f"search resume strip is missing routes: {quick_state['resumeMissing']}")
    assert_true(quick_state["resumeHasSavedSection"], "search resume strip is missing a seeded saved-section route")
    for phrase in ["Resume", "Last task", "Recent page", "Last section", "Diagnostic Handoff Builder", "Service Closeout"]:
        assert_true(phrase in quick_state["resumeText"], f"search resume strip is missing {phrase}")
    assert_true(quick_state["hasRecent"], "search modal is missing the seeded recent work strip")
    assert_true(quick_state["recentCards"] == 3, "search recent work strip should expose three seeded routes")
    assert_true(not quick_state["recentMissing"], f"search recent work strip is missing routes: {quick_state['recentMissing']}")
    for phrase in ["Recent Work", "Diagnostic note", "Roadside note", "Service receipt"]:
        assert_true(phrase in quick_state["recentText"], f"search recent work strip is missing {phrase}")
    assert_true("Offline pack" in quick_state["offlineText"], "search offline launch pad should show offline pack status")
    assert_true("Before Signal Drops" in quick_state["offlineText"], "search offline launch pad should include signal-loss prep")
    assert_true("Print Sheet" in quick_state["offlineText"], "search offline launch pad should include the Quick Sheet print route")
    assert_true("Roadside" in quick_state["offlineText"], "search offline launch pad should include Roadside")
    assert_true("Garage Backup" in quick_state["offlineText"], "search offline launch pad should include Garage Backup")
    assert_true(not quick_state["offlineMissing"], f"search offline launch pad is missing routes: {quick_state['offlineMissing']}")
    assert_true(quick_state["hasOfflineRefresh"], "search offline launch pad is missing refresh-pack action")
    assert_true(quick_state["hasOfflineRouteCheck"], "search offline launch pad is missing check-routes action")
    assert_true(quick_state["hasOfflineRoutePrime"], "search offline launch pad is missing prime-routes action")
    assert_true(quick_state["hasOfflineRoutePlanCopy"], "search offline launch pad is missing copy-route-plan action")
    assert_true(quick_state["hasOfflineRouteReadiness"], "search offline launch pad is missing route readiness list")
    assert_true(quick_state["offlineRouteItems"] == 6, "search route readiness should expose six key routes")
    assert_true("key routes" in quick_state["offlineRouteSummary"].lower(), "search route readiness summary should explain key routes")
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
    await page.locator("[data-search-check-routes]").click()
    await page.wait_for_timeout(450)
    route_state = await page.evaluate(
        """() => {
            const card = document.querySelector("[data-search-offline-card]");
            return {
                status: card?.querySelector("[data-search-refresh-status]")?.textContent || "",
                summary: card?.querySelector("[data-search-route-summary]")?.textContent || "",
                statuses: [...card?.querySelectorAll("[data-search-route-list] li") || []].map((item) => item.dataset.routeStatus),
                links: [...card?.querySelectorAll("[data-search-route-list] a") || []].map((link) => link.getAttribute("href"))
            };
        }"""
    )
    assert_true("/6" in route_state["status"], "search check-routes action did not report route count")
    assert_true("cache" in route_state["summary"].lower() or "open key routes" in route_state["summary"].lower(), "search route readiness summary did not update")
    assert_true(len(route_state["statuses"]) == 6, "search route readiness list lost route rows after check")
    assert_true("quick-sheet.html" in route_state["links"], "search route readiness should make checked routes tappable")
    await page.locator("[data-search-copy-route-plan]").click()
    await page.wait_for_timeout(200)
    route_plan_status = await page.locator("[data-search-refresh-status]").inner_text()
    assert_true("route plan copied" in route_plan_status.lower() or "could not copy" in route_plan_status.lower(), "search copy-route-plan action did not report status")
    await page.locator("[data-search-prime-routes]").click()
    await page.wait_for_timeout(650)
    prime_status = await page.locator("[data-search-refresh-status]").inner_text()
    assert_true("/6" in prime_status or "Could not prime" in prime_status, "search prime-routes action did not report route readiness")
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

    await page.locator("[data-open-site-menu]").first.click()
    await page.wait_for_timeout(200)
    assert_true(await page.locator("[data-tool-action='owner-auth']").count() == 1, "site menu quick tools should expose Owner Sign In")
    await page.locator("[data-tools-toggle]").click()
    await page.wait_for_timeout(150)
    await page.locator("[data-tool-action='owner-auth']").click()
    await page.wait_for_timeout(200)
    assert_true(not await page.locator("[data-owner-auth-modal]").evaluate("node => node.hidden"), "Owner Sign In quick tool did not open owner auth modal")
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(150)
    assert_true(await page.locator("[data-owner-auth-modal]").evaluate("node => node.hidden"), "Escape did not close owner auth modal")
    await assert_scroll_unlocked(page, "owner auth close")

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
    await assert_nfc_starter_pack(page, page_name)
    await assert_nfc_landing_handoff(page, page_name)
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
        try:
            for page_name in args.pages:
                context = await browser.new_context()
                try:
                    await smoke_page(context, args.root, page_name)
                finally:
                    await context.close()
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
