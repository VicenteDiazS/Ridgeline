# Ridgeline Agent State

Last updated: 2026-05-14

## Current Site Status

- Static Ridgeline service site with shared UI, offline service worker, interactive fuse diagrams, search, menu, adaptive motion, garage/service tools, and reference pages.
- Universal header navigation has been added across pages.
- Subpage helper controls now sit after the page hero so the main title is visible sooner on mobile and desktop.
- Reusable audit scripts now live in `tools/audit/` for internal link checks, rendered browser smoke checks, and desktop/mobile screenshot capture.
- Browser smoke checks now include scoped interactions and keyboard focus behavior for Search, More, and sample in-page section links.
- Search and More now move focus into their dialogs and restore focus to the triggering control when closed with Escape or the close control.
- Site-quality audit file exists at `SITE_QUALITY_AUDIT.md`.
- Anton is the main coding agent. Its editable instruction file is `ANTON.md`.
- Manual full-access startup script exists at `tools/agent-loop/Start-AntonManual.ps1`.
- Recent verification produced desktop/mobile screenshots in `debug-screenshots/` with the `audit-v241` tag.

## Last Completed Work

- Added `tools/audit/Test-InternalLinks.ps1` for static internal HTML file and anchor validation.
- Added `tools/audit/Invoke-BrowserSmoke.ps1` for rendered Edge checks that confirm main landmarks, header controls, page titles, and subpage support controls.
- Added `tools/audit/Capture-Screenshots.ps1` for repeatable desktop/mobile captures.
- Added `tools/audit/Invoke-SiteAudit.ps1` as the single local checklist command that runs links, browser smoke checks, and screenshots.
- Improved `tools/audit/Invoke-BrowserSmoke.ps1` so each checked page opens Search, confirms fuse results render, opens the More menu, confirms menu links render, and clicks a sample in-page section link.
- Added keyboard focus assertions to `tools/audit/Invoke-BrowserSmoke.ps1` for Search and More: focus moves into the dialog, Escape closes it, and focus returns to the opener.
- Updated `shared-ui.js` so Search and More restore focus after closing, and bumped the service worker cache to `ridgeline-console-v241`.
- Verified the audit wrapper against `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html`.

## Known Cautions

- The worktree may already contain user or agent changes. Never revert unknown changes without explicit permission.
- Fuse, torque, fluid, towing, electrical, and safety data must be treated as accuracy-sensitive.
- Browser click-audit scripts can accidentally trigger navigation if they click broad button sets. Keep future click audits scoped or navigation-aware.

## Best Next Task

Continue validating fuse diagram accuracy and add source notes for every fuse box without changing factual fuse data unless a reliable source is in hand.

## Next Verification Target

After the next content/data change:

- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v241`.
- If fuse/source notes change, record the source and review the affected Hood/Cabin diagrams in the browser.

After the next UI change:

- Run the same audit command without `-SkipScreenshots` so fresh desktop/mobile screenshots are captured.

## Latest Verification

- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v241`.
- Internal link/anchor audit passed for 15 HTML files.
- Browser smoke, interaction, and keyboard focus checks passed for `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html`.
- Captured desktop/mobile screenshots for the checked pages under `debug-screenshots/audit-v241-*.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v241-final -SkipScreenshots` after the service-worker cache bump; it passed.
