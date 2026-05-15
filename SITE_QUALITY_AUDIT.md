# Ridgeline Site Quality Audit

This file tracks the baseline fundamentals for the 2019 Honda Ridgeline service site.

## Current Baseline

- Every HTML page uses a consistent top header with brand, primary section links, search, and a full-site menu.
- Header actions are normalized by `shared-ui.js` so subpages receive the same Map, Service, Garage, Search, and More controls as the home page.
- Subpage support controls are injected after the page hero instead of above the main content, keeping each page title near the top of the first screen.
- Every real HTML page has a `main` landmark and page title.
- Every real HTML page has a meta description for browser, search, and assistive-tool context.
- Internal anchor links are checked so buttons and section links do not point to missing pages or missing sections.
- Repeatable local audit scripts live under `tools/audit/`:
  - `Test-InternalLinks.ps1` checks local HTML links and anchors.
  - `Invoke-BrowserSmoke.ps1` renders selected pages in headless Edge, checks landmarks/header controls, verifies main content and visible sections load, confirms in-page section links resolve, checks page scrolling after load and after overlays close, opens Search, verifies Search focus, focus trapping, and Escape close/return behavior, opens More, verifies menu focus, focus trapping, and Escape close/return behavior, verifies Command Palette, Quick Capture, and Sync Settings modal focus trapping, and clicks a sample section link.
  - `Capture-Screenshots.ps1` captures desktop and mobile screenshots.
  - `Invoke-SiteAudit.ps1` runs the checklist together.
- Motion is adaptive: richer transitions are reserved for capable connections, while reduced motion, save-data, and weak connections use lighter behavior.
- The service worker cache version is bumped when site structure changes so installed/offline copies refresh.
- Screenshots are captured into `debug-screenshots/` after major UI/navigation changes.
- Hood and Cabin fuse pages include per-box source-status notes so uncertain or model-dependent fuse rows remain visible instead of silently normalized.
- Search includes explicit layman fuse/electrical aliases so practical queries like power outlet, trailer brake lights, radio, and backup camera surface the existing fuse-table shortcuts quickly.
- Diagnostics includes a Fuse Symptom Finder for common electrical symptoms, routing users to existing references without introducing new fuse data.
- Maintenance Minder guidance uses Honda Ridgeline sub-items 1-6 and records brake fluid as a separate 3-year calendar item rather than a code 7/B127 example.
- Screenshot capture uses `System.Diagnostics.ProcessStartInfo` instead of PowerShell `Start-Process`, avoiding duplicate environment-key failures in this Windows shell.
- Long-horizon product work is tracked in `ANTON_ROADMAP.md` so multi-day improvements can keep moving without losing verification or next-step context.

## Manual Review Checklist

- Open desktop and mobile widths.
- Confirm the header remains usable on every page.
- Open Search and More from multiple pages.
- Click top navigation links and confirm the page lands at the intended content.
- Check fuse diagrams on Hood and Cabin pages and click sample fuses.
- Confirm no blank page/blank scroll position appears after navigation.
- Confirm the page can still scroll after closing Search, More, Command Palette, Quick Capture, Sync Settings, and any drawer/modal added by the change.
- Run a link audit after adding or renaming pages, sections, or buttons.

## Latest Verification Notes

- Added keyboard focus behavior for Search and More in `shared-ui.js`: focus moves into the opened dialog/menu and returns to the opener when closed.
- Improved `Invoke-BrowserSmoke.ps1` with keyboard focus checks for Search, More, Escape close behavior, and focus return.
- Bumped the service worker cache to `ridgeline-console-v241` so offline installs receive the shared UI change.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v241`.
- Static internal link/anchor audit passed for 15 HTML files.
- Browser smoke and interaction checks passed for `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html`.
- Captured desktop/mobile screenshots for the checked pages under `debug-screenshots/audit-v241-*.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v241-final -SkipScreenshots` after the cache bump; it passed.
- Added source-status notes for Hood Fuse Box A, Hood Fuse Box B, Cabin Interior Fuse Box Type A, and Cabin Interior Fuse Box Type B without changing fuse values.
- Fixed `Capture-Screenshots.ps1` so screenshot capture works when the shell environment exposes both `Path` and `PATH`.
- Bumped the service worker cache to `ridgeline-console-v242`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v242`.
- Static internal link/anchor audit passed for 15 HTML files.
- Browser smoke and interaction checks passed for `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html`.
- Captured desktop/mobile screenshots for the checked pages under `debug-screenshots/audit-v242-*.png`.
- After the final source-status wording adjustment, `Test-InternalLinks.ps1` passed for 15 HTML files, `Invoke-BrowserSmoke.ps1` passed for `hood.html` and `cabin.html`, and Hood/Cabin screenshots were captured under `debug-screenshots/audit-v242-final-*.png`.
- Added shared focus trapping and focus-return behavior for Command Palette, Quick Capture, Sync Settings, and the quick-tools drawer, and applied the same Tab wrap helper to Search and More.
- Extended `Invoke-BrowserSmoke.ps1` to verify Tab and Shift+Tab wrapping for Search, More, Command Palette, Quick Capture, and Sync Settings.
- Bumped the service worker cache to `ridgeline-console-v243`.
- Ran `Invoke-SiteAudit.ps1 -Tag audit-v243`; link checks passed and browser checks passed for `index.html` and `hood.html` before the monolithic run timed out.
- Ran the remaining browser smoke checks separately for `cabin.html`, `maintenance.html`, and `garage.html`; all passed.
- Captured desktop/mobile screenshots under `debug-screenshots/audit-v243-*.png`.
- Added search aliases for high-intent fuse/electrical owner terms and future smoke assertions for `power outlet`, `trailer brake lights`, `radio`, and `backup camera`.
- Bumped the service worker cache to `ridgeline-console-v245`.
- Static internal link/anchor audit passed for 16 HTML files.
- Existing Chromium `--dump-dom` browser smoke path returned an empty DOM with both Edge and Chrome in this shell; Playwright/Chrome verification passed for the new search aliases.
- Captured desktop/mobile Playwright screenshots for `index.html`, `hood.html`, and `cabin.html` under `debug-screenshots/audit-v245-*.png`, plus the mobile search modal screenshot for `power outlet`.
- Added future browser-smoke assertions for main-content readiness, visible sections, broken in-page hash links, stuck `modal-open` scroll locks, and scrollability after Search, More, Command Palette, Quick Capture, Sync Settings, and section navigation.
- Added a Diagnostics Fuse Symptom Finder and search shortcut coverage for `outlet not working`.
- Corrected the Maintenance Minder code guide against Honda owner PDFs: removed unsupported code 7/B127 brake-fluid wording and kept brake fluid as a separate 3-year calendar item.
- Static internal link/anchor audit passed for 16 HTML files.
- Playwright/Chrome verification passed for Diagnostics, search, and the Maintenance Minder section. Screenshots captured under `debug-screenshots/audit-v247-diagnostics-desktop.png`, `debug-screenshots/audit-v247-diagnostics-mobile.png`, `debug-screenshots/audit-v247-search-outlet-not-working.png`, and `debug-screenshots/audit-v247-maintenance-minder-desktop.png`.
