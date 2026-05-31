# Ridgeline Agent State

Last updated: 2026-05-31

## Current Site Status

- The site is a static iPhone-first Ridgeline reference and workflow app with shared UI, search, offline/PWA behavior, owner-auth-protected writes, and owner-only Anton/visitor controls.
- Public visitors can browse and read site memory content; only the configured owner account should be able to write, delete, upload, restore, or use protected Anton controls.
- The shared header has recent iPhone-focused changes: compact mobile layout, clearer Sign In button behavior, theme toggle, and a homepage order fix so the truck viewer should be the first major content on phone.
- The shared header now includes a background intensity control for Soft/Balanced/Bold page chrome; it uses a real icon and hides alongside the theme toggle in compact sticky mode so the core iPhone actions stay stable.
- The homepage truck map now defaults to a calmer hotspot focus mode so the 3D model is less cluttered.
- Light theme exists and recently needed contrast fixes on specialty buttons; future theme work should assume stragglers may still exist.
- Anton/Home status is visible on the homepage and on `anton.html`, with impact score, visible change, sign-off, visitor log, and owner-only internals.
- Recent high-value iPhone workflows exist across the core pages:
  - `diagnostics.html`: first-check tracker, diagnostic call summary, symptom-first flows
  - `quick-sheet.html`: roadside contact/dispatch, offline route checks, router tools
  - `maintenance.html`: service prep, follow-up, closeout, service run pack
  - `garage.html`: recent handoffs, restore plan, backup/restore, structured notes
  - `hood.html` / `cabin.html`: saved-fuse review, counter pack, glossary/decoder tools
  - `tires.html`: pressure recheck and tire shop pack
- The most recent Anton-delivered feature is the homepage iPhone Task Launcher: the truck-first home view now exposes situation-first routes for flat tire, no-start, warning light, dead outlet/radio, tow setup, service logging, and offline prep, and the shared site menu preserves a page-level current badge even when the homepage is focused on `#viewer`.
- Ask Anton now has a no-API local route-answer mode, so the chat surface can route iPhone questions to the best local Ridgeline pages before model setup; the PWA cache is bumped to `ridgeline-console-v418`.
- Diagnostics and Quick Sheet now expose their high-value page-specific routes in the shared iPhone bottom action bar, replacing important section-dock shortcuts that shared UI removes on mobile.

## Current Queue

- `Now`: shared iPhone polish and regression review after the recent manual changes to homepage first view, header layout, theme toggle, and hotspot density.
- `Next`: high-value cross-page improvements that make existing tools easier to reach from the truck/home experience without adding clutter.
- `Fallback`: targeted reliability work on light-theme contrast, mobile scroll/anchor behavior, search/offline clarity, or Anton status clarity if larger feature work is risky.

## High-Impact Zones

- Home truck-map navigation and first-screen iPhone usability
- Diagnostics symptom routing and helper handoffs
- Quick Sheet roadside and offline-readiness flows
- Garage handoff review, restore clarity, and owner-memory ergonomics
- Shared iPhone header, search, theme, and navigation reliability
- Anton status clarity and owner review/control experience

## Run Efficiency Rules

- Read `ANTON_RUN_BRIEF.md` and this file first; open larger memory files only when needed.
- Use most of the scheduled work block when safe by chaining multiple meaningful slices.
- Prefer targeted verification for page-local changes; reserve broader audits for shared UI, storage, service worker, auth, or factual/reference changes.
- Keep `AGENT_STATE.md` concise; put long chronology in `AGENT_STATE_ARCHIVE.md`.
- Use specific commit messages derived from the visible change instead of generic `chore` summaries when possible.
- If helper sub-agents are available, use them for sidecar research or verification during longer runs.

## Recent Delivered Work

- Added the Tire Shop Pack in `tires.html#tire-shop-pack` for one-note tire counter/shop handoffs.
- Added Global Search recent queries, result summaries, and smart owner routes that send iPhone searches such as `tow truck`, `tire pressure`, warning lights, no-start, power, and service terms to the right workflow.
- Added `quick-sheet.html#roadside-dispatch-pack` so roadside dispatch searches can land directly on the dispatch handoff panel.
- Added Quick Sheet roadside deep-link selection and visible Roadside Router `Use Stack` actions so Home, router cards, and future search/menu routes can open the action stack with the intended flat/no-start/warning/trailer plan selected.
- Added Quick Sheet offline readiness receipts and Diagnostics symptom-aware deep-link selection for warning, power, audio, trailer, and no-start workflows.
- Added the homepage iPhone Task Launcher and repaired shared site-menu current-page semantics for hash-focused homepage routes.
- Added Ask Anton local route answers for no-key/offline first use and promoted Diagnostics/Quick Sheet page routes into the persistent iPhone action bar.
- Restored mobile Page Sections navigation after shared dock cleanup, so iPhone users can expand section links instead of losing section navigation when `.section-dock` is removed.
- Promoted Diagnostics First Checks/Call Summary and Quick Sheet no-start/contact/live/dispatch paths into direct iPhone routes.
- Added the Service Run Pack in `maintenance.html#service-run-pack` for parts-counter/shop helper handoffs.
- Added the Roadside Dispatch Pack in `quick-sheet.html#roadside-action-stack`.
- Added Garage Recent Handoffs type filters for faster iPhone review of saved handoffs.
- Added Fuse Counter Pack handoffs in Hood and Cabin saved-fuse review panels.
- Added Diagnostic Call Summary in `diagnostics.html#diagnostic-call-summary`.
- Added owner-access hardening so public visitors stay read-only while owner workflows remain available.
- Added and refined Anton status/review features including sign-off, visitor logging, and public/private separation.

## Known Cautions

- The worktree may contain user changes. Do not revert unknown work.
- Safety-critical vehicle data still requires reliable sourcing and conservative edits.
- Owner-auth/public-read behavior is now part of the product surface; do not accidentally reopen public write paths.
- Service-worker caching can hide recent UI fixes on phone until the new cache takes over.
- The site is increasingly iPhone-first; desktop support matters, but mobile Safari behavior should win tie-breaks.

## Best Next Task

Use the next Anton run to improve a high-impact iPhone path that builds on current work without over-polishing one page. The best near-term bets are:

- run a real iPhone/browser smoke of the new Ask Anton local route-answer path and the Diagnostics/Quick Sheet bottom action bars once the browser audit wrapper is healthy
- Diagnostics or Quick Sheet workflow depth that makes a real roadside or service task easier
- Garage clarity or Anton status clarity that reduces confusion for real phone use

Avoid another long single-page niche pass unless it clearly completes a user-visible workflow or fixes a regression.

## Next Verification Target

For page-local UI changes:

- Run `powershell -NoProfile -ExecutionPolicy Bypass -Command "& .\tools\audit\Invoke-BrowserSmoke.ps1 -Pages @('page.html')"` for the changed page(s).
- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`.

For shared UI, owner auth, search, offline, service worker, or storage changes:

- Run `powershell -NoProfile -ExecutionPolicy Bypass -Command "& .\tools\audit\Invoke-SiteAudit.ps1 -Pages @('index.html','garage.html') -Tag audit-vNNN-shared-change -SkipScreenshots"` with the right page list and tag.
- Include screenshots when the change is heavily visual or layout-sensitive.

## Latest Verification

- Anton's latest scheduled run verified the Ask Anton no-key route-answer changes and Diagnostics/Quick Sheet bottom-bar route changes with the internal-link/anchor audit, which passed for 17 HTML files. `Invoke-BrowserSmoke.ps1` and `Invoke-SiteAudit.ps1` both timed out in this environment, and Node/browser automation was unavailable, so a real browser/iPhone smoke remains the next verification target for these UI paths.

## Archive

- Older detailed run-by-run history now lives in [AGENT_STATE_ARCHIVE.md](/c:/Users/diazv/Desktop/Ridgeline/AGENT_STATE_ARCHIVE.md).
