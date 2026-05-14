# Ridgeline Site Quality Audit

This file tracks the baseline fundamentals for the 2019 Honda Ridgeline service site.

## Current Baseline

- Every HTML page uses a consistent top header with brand, primary section links, search, and a full-site menu.
- Header actions are normalized by `shared-ui.js` so subpages receive the same Map, Service, Garage, Search, and More controls as the home page.
- Subpage support controls are injected after the page hero instead of above the main content, keeping each page title near the top of the first screen.
- Every real HTML page has a `main` landmark and page title.
- Every real HTML page has a meta description for browser, search, and assistive-tool context.
- Internal anchor links are checked so buttons and section links do not point to missing pages or missing sections.
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

- Subpage intro layout cleanup added in `shared-ui.js` and `styles.css`.
- Mobile quick-add FAB moved below content and above the bottom bar to avoid covering hero copy.
- Service worker cache advanced to `ridgeline-console-v238`.
- Captured desktop/mobile screenshots for `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html` as `debug-screenshots/*-v238.png`.
- Browser interaction checks passed for header controls, Search, More, section links, and subpage helper placement.
- Static internal link/anchor audit passed for 15 HTML files.
