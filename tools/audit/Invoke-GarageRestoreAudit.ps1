param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [string]$BrowserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    [string]$Tag = ("audit-" + (Get-Date -Format "yyyyMMdd-HHmmss")),
    [switch]$SkipScreenshots
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $BrowserPath -PathType Leaf)) {
    throw "Chromium-compatible browser was not found at '$BrowserPath'. Pass -BrowserPath."
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    throw "Python was not found. Install Python with Playwright or pass through an environment where python is available."
}

$scriptPath = Join-Path ([System.IO.Path]::GetTempPath()) ("ridgeline-garage-restore-audit-" + [System.Guid]::NewGuid().ToString("N") + ".py")
$pythonScript = @'
import argparse
import asyncio
import json
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright


STORAGE_KEYS = {
    "notes": "ridgeline-notes",
    "tracker": "ridgeline-tracker",
    "maintenance": "ridgeline-maintenance-log",
    "photos": "ridgeline-photos",
    "favorites": "ridgeline-favorites",
    "area": "ridgeline-area-journal",
    "profile": "ridgeline-truck-profile",
}


def assert_true(condition, message):
    if not condition:
        raise AssertionError(message)


def write_json(temp_dir, name, payload):
    path = Path(temp_dir) / name
    path.write_text(json.dumps(payload), encoding="utf-8")
    return str(path)


async def wait_for_garage(page):
    await page.wait_for_selector("#diagnostic-activity [data-import-garage-backup]", state="attached")
    await page.wait_for_selector("#diagnostic-activity [data-garage-backup-preview]", state="attached")
    await page.wait_for_timeout(500)


async def clear_garage_storage(page):
    await page.evaluate(
        """(keys) => {
            keys.forEach((key) => localStorage.removeItem(key));
            localStorage.removeItem("ridgeline-remote-enabled");
            localStorage.removeItem("ridgeline-remote-disabled-until");
            localStorage.removeItem("ridgeline-github-backup-endpoint");
        }""",
        list(STORAGE_KEYS.values()),
    )


async def open_garage_page(context, root):
    page = await context.new_page()
    await page.set_viewport_size({"width": 390, "height": 844})
    target = (Path(root) / "garage.html").resolve().as_uri() + "#diagnostic-activity"
    await page.goto(target, wait_until="load")
    await wait_for_garage(page)
    await clear_garage_storage(page)
    await page.reload(wait_until="load")
    await wait_for_garage(page)
    return page


async def set_backup_file(page, path):
    await page.set_input_files("#diagnostic-activity [data-import-garage-backup]", path)
    await page.wait_for_timeout(700)


async def status_text(page):
    return (await page.locator("#diagnostic-activity [data-diagnostic-activity-status]").inner_text()).strip()


async def preview_text(page):
    preview = page.locator("#diagnostic-activity [data-garage-backup-preview]")
    if await preview.evaluate("node => node.hidden"):
        return ""
    return (await preview.inner_text()).strip()


async def assert_no_overflow(page, label):
    overflow = await page.evaluate(
        """() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            bodyScrollWidth: document.body.scrollWidth
        })"""
    )
    max_width = max(overflow["scrollWidth"], overflow["bodyScrollWidth"])
    assert_true(max_width <= overflow["clientWidth"] + 1, f"{label} has horizontal overflow: {overflow}")


async def assert_restore_target_painted(page, label):
    state = await page.evaluate(
        """() => {
            const target = document.querySelector("#diagnostic-activity");
            if (!target) {
                return { found: false };
            }
            const hiddenAncestor = [];
            let node = target;
            while (node) {
                if (node.classList?.contains("section-reveal")) {
                    const style = getComputedStyle(node);
                    hiddenAncestor.push({
                        id: node.id || "",
                        className: node.className || "",
                        opacity: Number(style.opacity)
                    });
                }
                node = node.parentElement;
            }
            const rect = target.getBoundingClientRect();
            return {
                found: true,
                top: rect.top,
                bottom: rect.bottom,
                hiddenAncestor,
                text: target.innerText.slice(0, 160)
            };
        }"""
    )
    assert_true(state.get("found"), f"{label} target was not found")
    assert_true(0 <= state["top"] <= 240, f"{label} target did not settle near top: {state}")
    assert_true("RECENT DIAGNOSTICS" in state["text"], f"{label} target text missing: {state}")
    hidden = [item for item in state["hiddenAncestor"] if item["opacity"] < 0.99]
    assert_true(not hidden, f"{label} has hidden reveal ancestor: {hidden}")


async def run_restore_audit(args):
    root = Path(args.root).resolve()
    screenshot_dir = root / "debug-screenshots"
    screenshot_dir.mkdir(exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="ridgeline-garage-restore-") as temp_dir:
        diagnostic_handoff = write_json(
            temp_dir,
            "diagnostic-handoff.json",
            {
                "kind": "ridgeline-diagnostic-activity-export",
                "generatedAt": "2026-05-16T12:00:00.000Z",
                "items": [{"type": "warning", "title": "MID warning"}],
            },
        )
        invalid_only = write_json(
            temp_dir,
            "invalid-only.json",
            {
                "kind": "ridgeline-garage-backup",
                "generatedAt": "2026-05-16T12:00:00.000Z",
                "payload": {
                    STORAGE_KEYS["notes"]: [],
                    STORAGE_KEYS["maintenance"]: {"bad": "shape"},
                },
            },
        )
        mixed_backup = write_json(
            temp_dir,
            "mixed-backup.json",
            {
                "kind": "ridgeline-garage-backup",
                "generatedAt": "2026-05-16T12:00:00.000Z",
                "payload": {
                    STORAGE_KEYS["notes"]: {
                        "warning_light_indicator": "Check engine light",
                        "warning_light_mid_message": "Emissions system problem",
                        "quick_capture_audit": "Battery warning captured before restore",
                    },
                    STORAGE_KEYS["maintenance"]: {"invalid": "skip me"},
                    STORAGE_KEYS["profile"]: {
                        "vehicle": "2019 Honda Ridgeline",
                        "trim_drive": "RTL-E AWD",
                    },
                    STORAGE_KEYS["photos"]: [
                        {
                            "label": "dash warning",
                            "storagePath": "audit/top.jpg",
                            "uploadedAt": "2026-05-16T12:00:00.000Z",
                            "dataUrl": "data:image/png;base64,SHOULD_NOT_PERSIST",
                        }
                    ],
                    STORAGE_KEYS["area"]: {
                        "cabin": {
                            "notes": {"audit": "radio display warning check"},
                            "photos": [
                                {
                                    "label": "cabin",
                                    "storagePath": "audit/cabin.jpg",
                                    "uploadedAt": "2026-05-16T12:00:00.000Z",
                                    "dataUrl": "data:image/png;base64,SHOULD_NOT_PERSIST",
                                }
                            ],
                        }
                    },
                },
            },
        )

        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(
                executable_path=args.browser_path,
                headless=True,
                args=["--allow-file-access-from-files", "--disable-web-security"],
            )
            context = await browser.new_context()
            page = await open_garage_page(context, root)

            restore_button = page.locator("#diagnostic-activity [data-restore-garage-backup]")
            preview = page.locator("#diagnostic-activity [data-garage-backup-preview]")
            assert_true(await restore_button.is_disabled(), "restore button should start disabled")
            assert_true(await preview.evaluate("node => node.hidden"), "backup preview should start hidden")
            await assert_restore_target_painted(page, "initial mobile Garage restore")
            await assert_no_overflow(page, "initial mobile Garage restore")

            await set_backup_file(page, diagnostic_handoff)
            assert_true(await restore_button.is_disabled(), "diagnostic activity handoff should not enable restore")
            assert_true("not a diagnostic activity handoff" in await status_text(page), "handoff rejection status missing")
            assert_true(await preview.evaluate("node => node.hidden"), "handoff rejection should keep preview hidden")

            await set_backup_file(page, invalid_only)
            assert_true(await restore_button.is_disabled(), "invalid-only backup should not enable restore")
            assert_true("not a diagnostic activity handoff" in await status_text(page), "invalid-only backup rejection status missing")
            assert_true(await preview.evaluate("node => node.hidden"), "invalid-only backup should keep preview hidden")

            await set_backup_file(page, mixed_backup)
            assert_true(await restore_button.is_enabled(), "mixed valid backup should enable restore")
            text = await preview_text(page)
            assert_true("Backup ready to restore" in text, "valid backup preview title missing")
            assert_true("notes" in text and "truck profile" in text and "photo metadata" in text, "valid sections missing from preview")
            assert_true("Backup" in text and "Current" in text, "backup/current count comparison missing from preview")
            assert_true("Skipped invalid" in text and "service log" in text, "invalid section skip message missing")
            assert_true("Will replace" in text and "Will merge" in text, "replace/merge impact text missing")
            assert_true("Download a fresh Garage backup first" in text, "pre-restore reminder missing from preview")
            assert_true("Skipped invalid service log" in await status_text(page), "status should mention skipped invalid service log")
            await assert_no_overflow(page, "preview mobile Garage restore")

            if not args.skip_screenshots:
                await page.screenshot(path=str(screenshot_dir / f"{args.tag}-garage-restore-audit-mobile.png"), full_page=True)

            await restore_button.click()
            await page.wait_for_timeout(900)
            assert_true(await restore_button.is_disabled(), "restore button should reset disabled after restore")
            assert_true(await preview.evaluate("node => node.hidden"), "preview should reset hidden after restore")
            assert_true("Garage backup restored" in await status_text(page), "restore completion status missing")

            stored = await page.evaluate(
                """(keys) => ({
                    notes: JSON.parse(localStorage.getItem(keys.notes) || "{}"),
                    maintenance: JSON.parse(localStorage.getItem(keys.maintenance) || "[]"),
                    profile: JSON.parse(localStorage.getItem(keys.profile) || "{}"),
                    photos: JSON.parse(localStorage.getItem(keys.photos) || "[]"),
                    area: JSON.parse(localStorage.getItem(keys.area) || "{}")
                })""",
                STORAGE_KEYS,
            )
            assert_true(stored["notes"].get("warning_light_indicator") == "Check engine light", "warning note was not restored")
            assert_true(isinstance(stored["maintenance"], list), "invalid service log shape should not be restored")
            assert_true(stored["profile"].get("trim_drive") == "RTL-E AWD", "profile section was not restored")
            assert_true(stored["photos"] and "dataUrl" not in stored["photos"][0], "top-level photo dataUrl should be stripped")
            area_photos = stored["area"].get("cabin", {}).get("photos", [])
            assert_true(area_photos and "dataUrl" not in area_photos[0], "area-journal photo dataUrl should be stripped")

            await page.select_option("#diagnostic-activity [data-diagnostic-activity-filter]", "area")
            await page.wait_for_timeout(300)
            assert_true("radio display warning check" in await page.locator("#diagnostic-activity [data-diagnostic-activity]").inner_text(), "area filter should reveal restored area note")

            await page.set_viewport_size({"width": 1280, "height": 900})
            await page.wait_for_timeout(300)
            await assert_no_overflow(page, "desktop Garage restore")
            if not args.skip_screenshots:
                await page.screenshot(path=str(screenshot_dir / f"{args.tag}-garage-restore-audit-desktop.png"), full_page=True)

            await browser.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--browser-path", required=True)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--skip-screenshots", action="store_true")
    args = parser.parse_args()
    asyncio.run(run_restore_audit(args))


if __name__ == "__main__":
    main()
'@

try {
    Set-Content -LiteralPath $scriptPath -Value $pythonScript -Encoding UTF8
    $args = @(
        $scriptPath,
        "--root",
        $Root,
        "--browser-path",
        $BrowserPath,
        "--tag",
        $Tag
    )

    if ($SkipScreenshots) {
        $args += "--skip-screenshots"
    }

    & $python.Source $args
    if ($LASTEXITCODE -ne 0) {
        throw "Garage restore Playwright audit failed with exit code $LASTEXITCODE."
    }

    Write-Host "Garage restore Playwright audit passed for garage.html#diagnostic-activity"
}
finally {
    Remove-Item -LiteralPath $scriptPath -Force -ErrorAction SilentlyContinue
}
