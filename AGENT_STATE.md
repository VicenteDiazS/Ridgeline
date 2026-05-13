# Ridgeline Agent State

Last updated: 2026-05-13

## Current Site Status

- Static Ridgeline service site with shared UI, offline service worker, interactive fuse diagrams, search, menu, adaptive motion, garage/service tools, and reference pages.
- Universal header navigation has been added across pages.
- Site-quality audit file exists at `SITE_QUALITY_AUDIT.md`.
- Anton is the main coding agent. Its editable instruction file is `ANTON.md`.
- Manual full-access startup script exists at `tools/agent-loop/Start-AntonManual.ps1`.
- Recent verification produced desktop/mobile screenshots in `debug-screenshots/`.

## Last Completed Work

- Added consistent header actions: Map, Service, Garage, Search, More.
- Added meta descriptions to subpages.
- Bumped service worker cache to `ridgeline-console-v236`.
- Verified 15 pages in browser with 0 header/menu/search failures.
- Captured 22 audit screenshots.

## Known Cautions

- The worktree may already contain user or agent changes. Never revert unknown changes without explicit permission.
- Fuse, torque, fluid, towing, electrical, and safety data must be treated as accuracy-sensitive.
- Browser click-audit scripts can accidentally trigger navigation if they click broad button sets. Keep future click audits scoped or navigation-aware.

## Best Next Task

Improve the subpage information architecture so the injected support panels do not push each page’s main title too far down on mobile and desktop. Preserve the helpful tools, but make the first screen feel cleaner and more direct.

## Next Verification Target

After the next UI change:

- Capture desktop and mobile screenshots for `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html`.
- Verify header controls, Search, More, and section links.
- Re-run the static internal link/anchor audit.
