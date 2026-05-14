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
  - `Invoke-BrowserSmoke.ps1` renders selected pages in headless Edge, checks landmarks/header controls, opens Search, opens More, and clicks a sample section link.
  - `Capture-Screenshots.ps1` captures desktop and mobile screenshots.
  - `Invoke-SiteAudit.ps1` runs the checklist together.
- Motion is adaptive: richer transitions are reserved for capable connections, while reduced motion, save-data, and weak connections use lighter behavior.
- The service worker cache version is bumped when site structure changes so installed/offline copies refresh.
- Screenshots are captured into `debug-screenshots/` after major UI/navigation changes.

## Manual Review Checklist

- Open desktop and mobile widths.
- Confirm the header remains usable on every page.
- Open Search and More from multiple pages.
- Click top navigation links and confirm the page lands at the intended content.
- Check fuse diagrams on Hood and Cabin pages and click sample fuses.
- Confirm no blank page/blank scroll position appears after navigation.
- Run a link audit after adding or renaming pages, sections, or buttons.

## Latest Verification Notes

- Added reusable audit scripts in `tools/audit/`.
- Improved `Invoke-BrowserSmoke.ps1` with scoped interaction checks for Search, More, and in-page section navigation.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v240 -SkipScreenshots`.
- Static internal link/anchor audit passed for 15 HTML files.
- Browser smoke and interaction checks passed for `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html`.
- Screenshots were skipped because this run changed audit tooling, not site UI; latest UI screenshots remain `debug-screenshots/audit-v239b-*.png`.
