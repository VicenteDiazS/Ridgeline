# Ridgeline Agent State

Last updated: 2026-05-14

## Current Site Status

- Static Ridgeline service site with shared UI, offline service worker, interactive fuse diagrams, search, menu, adaptive motion, garage/service tools, and reference pages.
- Universal header navigation has been added across pages.
- Subpage helper controls now sit after the page hero so the main title is visible sooner on mobile and desktop.
- Site-quality audit file exists at `SITE_QUALITY_AUDIT.md`.
- Anton is the main coding agent. Its editable instruction file is `ANTON.md`.
- Manual full-access startup script exists at `tools/agent-loop/Start-AntonManual.ps1`.
- Recent verification produced desktop/mobile screenshots in `debug-screenshots/`.

## Last Completed Work

- Moved injected subpage helper controls below the page hero so page titles are visible sooner on mobile and desktop.
- Added a shared subpage intro insertion helper for the view-mode rail, mobile navigation accordion, and page support controls.
- Moved the mobile quick-add FAB to the lower right above the bottom bar so it does not cover hero copy.
- Bumped service worker cache to `ridgeline-console-v238`.
- Captured desktop/mobile screenshots for `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html` in `debug-screenshots/*-v238.png`.
- Verified Search, More, header controls, section link targets, and subpage helper placement with headless Edge/CDP.
- Re-ran the static internal link/anchor audit across 15 HTML files.

## Known Cautions

- The worktree may already contain user or agent changes. Never revert unknown changes without explicit permission.
- Fuse, torque, fluid, towing, electrical, and safety data must be treated as accuracy-sensitive.
- Browser click-audit scripts can accidentally trigger navigation if they click broad button sets. Keep future click audits scoped or navigation-aware.

## Best Next Task

Build reusable local audit scripts for screenshots, browser interaction checks, and static internal link/anchor validation so future loops do not depend on one-off inline commands.

## Next Verification Target

After the next tooling change:

- Run the new reusable audit command against `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html`.
- Confirm generated screenshots land in `debug-screenshots/`.
- Confirm the static link/anchor check still passes for all HTML files.
