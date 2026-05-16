# Ridgeline Agent State

Last updated: 2026-05-16

## Current Site Status

- Static Ridgeline service site with shared UI, offline service worker, interactive fuse diagrams, search, menu, adaptive motion, garage/service tools, and reference pages.
- Universal header navigation has been added across pages.
- Subpage helper controls now sit after the page hero so the main title is visible sooner on mobile and desktop.
- Reusable audit scripts now live in `tools/audit/` for internal link checks, rendered browser smoke checks, Garage restore Playwright checks, and desktop/mobile screenshot capture.
- Browser smoke checks now include scoped interactions and keyboard focus behavior for Search, More, and sample in-page section links.
- Search and More now move focus into their dialogs and restore focus to the triggering control when closed with Escape or the close control.
- Search, More, Command Palette, Quick Capture, Sync Settings, and quick-tools drawer now keep Tab focus inside the open modal surface and restore focus on close where applicable.
- Hood and Cabin fuse sections now have explicit source-status notes for each listed fuse box/panel without changing fuse facts.
- Site search now includes layman fuse/electrical aliases for power outlets, trailer lights, radio/audio, and backup/reverse-light terms, routing users into the existing fuse tables without changing fuse facts.
- Diagnostics now has a Fuse Symptom Finder that routes common owner electrical symptoms into the existing Hood/Cabin/Hitch references without adding new fuse ratings or positions.
- Diagnostics now has a No-Start Workflow that routes no-crank, slow-crank, normal-crank/no-start, recent electrical work, and roadside scenarios into existing battery, fuse, garage, and emergency references without changing repair specifications.
- Diagnostics now has a Trailer-Light Issue Flow that routes trailer brake/turn/running/reverse light and connector-adapter symptoms into existing hitch, pinout, fuse, and garage-note references without changing trailer wiring facts, fuse ratings, or pin assignments.
- Diagnostics now has an Accessory Power Issue Flow that routes dead phone charger, 12V socket, front accessory socket, console socket, overload, and repeat accessory-power symptoms into existing Cabin/Hood fuse, battery, quick-check, and garage-note references without changing fuse facts.
- Diagnostics now has an Audio Display Issue Flow that routes dead radio, no sound, blank display audio screen, Bluetooth/phone audio, and recent audio/electrical work into existing Hood/Cabin fuse, cabin journal, and garage-note references without changing fuse facts or repair procedures.
- Diagnostics now has a compact Workflow Index immediately after the hero, keeping no-start, accessory power, audio/display, trailer-light, warning-light, fuse-symptom, and quick-check flows reachable without crowding the hero controls.
- Diagnostics now has a Warning Light Triage flow that routes red/amber dash lights, MID messages, multiple warning lights, and recent battery/service history into official-manual, emergency-card, battery, and garage-note paths without adding repair procedures.
- Garage Log now has a structured Warning Light Note template linked from Diagnostics and search, capturing date/mileage, exact indicator/MID text, light behavior, recent context, symptoms, photos/next action, and saving through the existing Garage notes form without a storage migration.
- Garage Dashboard now surfaces a Diagnostic Notes card that summarizes the structured warning-light fields and routes back to the Warning Light Note template; Garage notes form saves now merge into existing notes so dynamic quick-capture note keys are preserved.
- Garage Dashboard now includes a Recent Diagnostic Activity panel that groups existing warning-light fields, diagnostic Quick Capture/NFC notes, matching maintenance log entries, and area-journal notes without changing Garage storage schema.
- Garage Recent Diagnostic Activity now has a local derived activity filter and Copy Summary action for warning notes, quick captures, service logs, and area-journal notes without changing Garage storage schema.
- Garage Recent Diagnostic Activity now has a Download Backup action that creates a local Garage JSON backup from the existing syncable storage keys, including notes, tracker, maintenance log, favorites, profile, area journal, and photo metadata while leaving local-only image bytes in the browser.
- Garage Recent Diagnostic Activity now has a Download Activity action that exports the current diagnostic-activity filter as a small derived JSON handoff, separate from the restorable full Garage backup and without changing Garage storage schema.
- Garage Recent Diagnostic Activity now has a guarded local Restore Backup flow: Choose Backup validates a `ridgeline-garage-backup` JSON file, previews the recognized Garage data areas, rejects malformed JSON and derived diagnostic-activity handoffs, and enables Restore Backup only after a valid backup is selected.
- Garage Restore Backup now has a visible mobile-friendly preview card showing the backup date and recognized data areas before restore; imported photo entries are sanitized so browser-local `dataUrl` image bytes are stripped from top-level and area-journal photo metadata before merge.
- Garage Restore Backup now validates recognized backup sections by expected shape before enabling restore, skips invalid recognized sections with a visible preview/status note, and shows replace-vs-merge impact text before import.
- Garage Recent Diagnostic Activity now filters the full derived activity list before applying the six-item display cap, so category filters can still reveal older matching area/service/capture records.
- Garage restore validation now has reusable Playwright/Chrome audit coverage in `tools/audit/Invoke-GarageRestoreAudit.ps1` instead of relying on one-off fallback scripts.
- Diagnostics lower-page routing is now trimmed to non-main "Other quick routes" so the workflow index remains the canonical entry point and the page is shorter on iPhone.
- Diagnostics now has a mobile density pass: the page is scoped with `diagnostics-page`, the workflow index and diagnostic cards are shorter at iPhone widths, Quick Checks stacks into card-like rows, source notes are visually lighter on mobile, and the bottom action bar routes to the canonical workflow index.
- Universal navigation now shows the current page in the sticky header and marks the matching full-menu entry with `aria-current` plus a visible Current badge.
- Maintenance Minder content now reflects Honda Ridgeline sub-items 1-6 and treats brake fluid as a separate 3-year calendar item instead of a code 7/B127 example.
- Hood and Cabin fuse pages now include generated Fuse Label Glossary sections that expose plain-English shorthand definitions already used by the fuse inspector, without changing fuse positions, ratings, or source-conflict notes.
- Quick Sheet now includes a Fuse Triage section with symptom-first routes to accessory-power, trailer-light, audio/display, and fuse-label glossary references, plus a print/save-PDF action, print-specific styling, and a Source Confidence section that separates truck-label authority, Honda-backed facts, and weaker replacement/fitment references.
- Browser smoke checks now include explicit Diagnostics Workflow Index coverage: seven cards, trailer-light card hash navigation, warning-light card presence, scroll-lock cleanup, and `workflow index` / `warning light` search result coverage.
- Browser smoke checks now include Quick Sheet Fuse Triage and Source Confidence coverage: four routing cards, required destination links, a print/save button, four source-confidence cards, external source-link attributes, and `fuse quick sheet` / `quick sheet sources` search result coverage.
- Screenshot capture no longer uses PowerShell `Start-Process`, avoiding duplicate `Path`/`PATH` environment failures in the current shell.
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
- Added per-box source-status notes for Hood Fuse Box A, Hood Fuse Box B, Cabin Interior Fuse Box Type A, and Cabin Interior Fuse Box Type B.
- Updated `tools/audit/Capture-Screenshots.ps1` to launch Edge through `System.Diagnostics.ProcessStartInfo` instead of `Start-Process`, fixing screenshot capture when the environment contains duplicate path keys.
- Bumped the service worker cache to `ridgeline-console-v242`.
- Added shared modal focus-trap helpers in `shared-ui.js`.
- Applied focus trapping to Search, More, Command Palette, Quick Capture, Sync Settings, and the quick-tools drawer.
- Extended `tools/audit/Invoke-BrowserSmoke.ps1` to verify Tab and Shift+Tab wrapping for Search, More, Command Palette, Quick Capture, and Sync Settings, plus Escape close/focus return for the newly covered modals.
- Bumped the service worker cache to `ridgeline-console-v243`.
- Added static search shortcuts for common owner fuse phrases: `power outlet`, `trailer brake lights`, `radio`, and `backup camera`.
- Extended search synonyms for outlet/socket/charger/radio/stereo/screen/camera terms.
- Extended `tools/audit/Invoke-BrowserSmoke.ps1` so future browser smoke checks assert those search aliases appear.
- Bumped the service worker cache to `ridgeline-console-v245`.
- Added `diagnostics.html#fuse-symptom-finder` with practical symptom cards for accessory power, trailer lights, audio/display, and reverse/backup issues, all routing into existing verified references.
- Added search and browser-smoke coverage for `outlet not working` surfacing the Fuse Symptom Finder.
- Corrected the Maintenance Minder guide by removing the unsupported 2019 Ridgeline sub-item 7/B127 brake-fluid example and replacing it with a separate 3-year brake-fluid note from Honda owner PDFs.
- Bumped the service worker cache to `ridgeline-console-v247`.
- Added `diagnostics.html#no-start-workflow` with no-crank/slow-crank/normal-crank routing cards that point into existing battery, fuse, garage-note, and emergency-card references.
- Added static search coverage and query expansion for owner phrases like `truck wont start`, `clicking`, `slow crank`, and `cranks but wont start`, with a future browser-smoke assertion for the no-start workflow.
- Bumped the service worker cache to `ridgeline-console-v249`.
- Added `diagnostics.html#trailer-light-workflow` with trailer connector, adapter, single-function, all-lights-out, and repeat-setup routing cards that point into existing hitch, pinout, hood fuse, and garage-note references.
- Added search coverage for `trailer lights not working`, `trailer brake lights not working`, `7 pin trailer lights`, `7 way connector no lights`, `hitch lights not working`, `trailer adapter`, and `ridgeline trailer light fuse`.
- Extended `tools/audit/Invoke-BrowserSmoke.ps1` with a future search assertion for `trailer lights not working` surfacing the Trailer-Light Issue Flow.
- Bumped the service worker cache to `ridgeline-console-v250`.
- Added `diagnostics.html#accessory-power-workflow` with power-mode, one-socket, all-sockets, and repeat-issue routing cards that point into existing cabin fuse, hood fuse, battery/jump, quick-check, and garage-note references.
- Added search coverage for `accessory socket not working`, `power outlet not working`, `12v outlet not working`, `phone charger dead`, `cigarette lighter not working`, `front outlet dead`, `console outlet dead`, and related accessory-power owner phrases.
- Extended `tools/audit/Invoke-BrowserSmoke.ps1` with a future search assertion for `accessory socket not working` surfacing the Accessory Power Issue Flow.
- Bumped the service worker cache to `ridgeline-console-v251`.
- Added `diagnostics.html#audio-display-workflow` with power-mode, no-sound, screen-only, and recent-work routing cards that point into existing Hood/Cabin fuse, cabin journal, quick-check, and garage-note references.
- Added search coverage for `radio not working`, `radio dead`, `audio not working`, `no sound`, `speakers not working`, `display audio dead`, `screen not working`, `hondalink not working`, `carplay not working`, `android auto not working`, `usb audio not working`, `bluetooth audio not working`, `amp fuse`, and related audio/display owner phrases.
- Extended `tools/audit/Invoke-BrowserSmoke.ps1` with a future search assertion for `radio not working` surfacing the Audio Display Issue Flow.
- Bumped the service worker cache to `ridgeline-console-v252`.
- Added a compact current-page chip to the sticky header and expanded active-link handling so header, quick-nav, route-strip, contextual bottom bar, mobile nav, and full-menu links receive consistent `is-current-link` and `aria-current` state.
- Added a Current badge to the active full-menu page entry.
- Extended `tools/audit/Invoke-BrowserSmoke.ps1` with current-page navigation assertions.
- Bumped the service worker cache to `ridgeline-console-v253`.
- Added `diagnostics.html#workflow-index` as a compact, mobile-first routing index for the existing Diagnostics workflows and trimmed the hero shortcut list so it points to the index instead of listing every deep flow.
- Added search coverage for `workflow index` / diagnostics-index language and bumped the service worker cache to `ridgeline-console-v255`.
- Extended `tools/audit/Invoke-BrowserSmoke.ps1` with durable Workflow Index assertions for Diagnostics card count, trailer-light card navigation, scroll-lock cleanup, and `workflow index` search coverage.
- Trimmed duplicate lower-page Diagnostics routing by replacing repeated no-start, accessory-power, trailer-light, and audio/display cards with a focused "Other quick routes" section.
- Consolidated duplicate static search aliases for no-start and trailer-light symptoms into their canonical workflow entries.
- Bumped the service worker cache to `ridgeline-console-v256`.
- Added Hood and Cabin Fuse Label Glossary sections generated from each page's fuse-table circuit labels.
- Reused the inspector acronym definitions for full-page glossaries, expanded non-factual label help for terms like ST CUT1, F/B, +B, SMART, MISS SOL, trailer small, trailer charge, and audio amp, and corrected matching so `AC outlet` does not get treated as A/C air conditioning.
- Added search coverage for `fuse acronyms`, `what does dbw mean`, and related fuse-label questions.
- Bumped the service worker cache to `ridgeline-console-v257`.
- Added `quick-sheet.html#fuse-triage` with practical routes into the existing Diagnostics workflows and Cabin fuse glossary without adding or changing fuse facts.
- Added a Quick Sheet print/save-PDF button, print-specific CSS that hides injected navigation/support controls and keeps quick-sheet content readable on paper/PDF, and a reusable `print-page` shared UI action.
- Added search coverage for `fuse quick sheet` / printable fuse quick-sheet phrases and extended `Invoke-BrowserSmoke.ps1` with durable Quick Sheet Fuse Triage assertions.
- Bumped the service worker cache to `ridgeline-console-v258`.
- Added `quick-sheet.html#source-confidence` with visible source-confidence notes and links for the emergency card, marked battery size/CCA as common replacement references, marked bolt pattern/center bore as fitment-reference values, and added search/smoke coverage for `quick sheet sources`.
- Bumped the service worker cache to `ridgeline-console-v259`.
- Added `diagnostics.html#warning-light-workflow` with red-light, amber-light, multiple-light, and MID-message routing cards backed by Honda's 2019 Ridgeline Dashboard Details guide.
- Added search coverage for `warning light` and related owner phrases, updated Diagnostics Workflow Index smoke coverage from six to seven cards, and bumped the service-worker cache to `ridgeline-console-v260`.
- Added `garage.html#warning-light-template` as a structured warning-light incident note inside the existing Garage notes form, linked the Diagnostics warning-light flow to it, added search coverage for `warning light note`, extended browser-smoke assertions, and bumped the service-worker cache to `ridgeline-console-v261`.
- Added a Garage Dashboard Diagnostic Notes card that reflects populated warning-light template fields, links directly to `#warning-light-template`, refreshes live as note fields change, and preserves dynamic quick-capture notes when the Garage notes form saves.
- Extended Garage browser-smoke assertions for the Diagnostic Notes dashboard route and bumped the service-worker cache to `ridgeline-console-v262`.
- Added `garage.html#diagnostic-activity`, a Recent Diagnostic Activity panel that reads existing warning-light fields, diagnostic Quick Capture/NFC notes, diagnostic maintenance log entries, and matching area-journal notes into a compact Garage Dashboard list.
- Added search coverage and browser-smoke assertions for `recent diagnostic activity`, refreshed Garage after on-page Quick Capture saves, and bumped the service-worker cache to `ridgeline-console-v263`.
- Tightened Diagnostics on iPhone without changing diagnostic content or vehicle facts: compacted workflow cards, symptom cards, hero shortcuts, Quick Checks rows, and source notes; pointed the mobile bottom action to `#workflow-index`; wrapped Quick Checks in `.table-scroll`; bumped the service-worker cache to `ridgeline-console-v264`.
- Added derived filters and a Copy Summary action to `garage.html#diagnostic-activity`, added search keywords and smoke assertions for the controls, and bumped the service-worker cache to `ridgeline-console-v265`.
- Added a Garage Download Backup action to `garage.html#diagnostic-activity`, exported the existing Garage backup payload builder from `garage-data.js`, added backup search keywords and browser-smoke selector coverage, and bumped the service-worker cache to `ridgeline-console-v266`.
- Added a Garage Download Activity action to `garage.html#diagnostic-activity`, exporting the currently selected diagnostic-activity filter as `ridgeline-diagnostic-activity-{filter}-{date}.json`; added search keywords and browser-smoke selector/search coverage, reused the JSON downloader for full Garage backups, and bumped the service-worker cache to `ridgeline-console-v267`.
- Added a guarded Garage Restore Backup flow to `garage.html#diagnostic-activity`, exported `restoreGarageBackupPayload()` from `garage-data.js`, added search/audit coverage for restore/import backup terms, and bumped the service-worker cache to `ridgeline-console-v268`.
- Added a compact Garage backup preview surface to `garage.html#diagnostic-activity`, split the Activity/Backup/Photos helper copy for iPhone scanning, sanitized imported backup photo entries to strip `dataUrl` bytes, updated smoke assertions/search copy, and bumped the service-worker cache to `ridgeline-console-v269`.
- Added schema-lite Garage backup restore validation for recognized storage keys, visible replace/merge/skipped preview text, a pre-restore Download Backup reminder, and a filter-before-display-cap fix for Recent Diagnostic Activity; bumped the service-worker cache to `ridgeline-console-v270`.

## Known Cautions

- The worktree may already contain user or agent changes. Never revert unknown changes without explicit permission.
- Fuse, torque, fluid, towing, electrical, and safety data must be treated as accuracy-sensitive.
- Browser click-audit scripts can accidentally trigger navigation if they click broad button sets. Keep future click audits scoped or navigation-aware.

## Best Next Task

Continue validating fuse diagram accuracy against reliable owner-manual or cover-label sources. The per-box source-status notes, first-pass visible acronym glossaries, quick-sheet fuse triage route, quick-sheet Source Confidence section, warning-light routing, warning-light garage-note template, Garage diagnostic dashboard card, Recent Diagnostic Activity panel/filter/copy/download tools, Garage backup download, filtered diagnostic-activity JSON export, guarded local Garage restore with visible preview, imported-photo-byte sanitization, and Diagnostics mobile density pass are present; the remaining fuse work is deeper position/rating confirmation and conflict resolution where sources disagree. A good non-data follow-up is a real-device review of Garage restore with an actual user backup file, then a cautious conflict/replace/merge design if real data shows it is needed.

## Next Verification Target

After the next content/data change:

- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v254`.
- If fuse/source notes change, record the source and review the affected Hood/Cabin diagrams in the browser.

After the next UI change:

- Run the same audit command without `-SkipScreenshots` so fresh desktop/mobile screenshots are captured.
- If Edge `--dump-dom` still returns an empty DOM, use the Playwright/Chrome fallback and record the screenshots under `debug-screenshots/`.

## Latest Verification

- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v241`.
- Internal link/anchor audit passed for 15 HTML files.
- Browser smoke, interaction, and keyboard focus checks passed for `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html`.
- Captured desktop/mobile screenshots for the checked pages under `debug-screenshots/audit-v241-*.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v241-final -SkipScreenshots` after the service-worker cache bump; it passed.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v242`.
- Internal link/anchor audit passed for 15 HTML files.
- Browser smoke and interaction checks passed for `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html`.
- Captured desktop/mobile screenshots for the checked pages under `debug-screenshots/audit-v242-*.png`.
- After tightening the source-status wording, reran `Test-InternalLinks.ps1`; it passed for 15 HTML files.
- Reran `Invoke-BrowserSmoke.ps1` for `hood.html` and `cabin.html`; both passed.
- Captured final Hood/Cabin desktop/mobile screenshots under `debug-screenshots/audit-v242-final-*.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-SiteAudit.ps1 -Tag audit-v243`; the static link audit passed and browser smoke passed for `index.html` and `hood.html` before the monolithic command timed out.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -Command "& .\tools\audit\Invoke-BrowserSmoke.ps1 -Pages @('cabin.html','maintenance.html','garage.html')"`; browser smoke and modal focus-trap checks passed for the remaining pages.
- Captured desktop/mobile screenshots for `index.html`, `hood.html`, `cabin.html`, `maintenance.html`, and `garage.html` under `debug-screenshots/audit-v243-*.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` with Edge and Chrome, but Chromium `--dump-dom` returned an empty DOM in this shell before interaction checks could run.
- Verified the search aliases with a Playwright/Chrome browser probe: `power outlet`, `trailer brake lights`, `radio`, and `backup camera` each surfaced the intended shortcut result.
- Captured Playwright screenshots for `index.html`, `hood.html`, and `cabin.html` at desktop/mobile sizes under `debug-screenshots/audit-v245-*.png`, plus `debug-screenshots/audit-v245-mobile-search-power-outlet.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Ran a Playwright/Chrome browser probe for `diagnostics.html`, search, and `maintenance.html#minder`; verified the Fuse Symptom Finder renders, mobile cards do not overflow, `outlet not working` returns the Fuse Symptom Finder, search closes without leaving `modal-open`, and the Maintenance Minder section no longer shows B127 or the old brake-fluid sub-code wording.
- Captured screenshots under `debug-screenshots/audit-v247-diagnostics-desktop.png`, `debug-screenshots/audit-v247-diagnostics-mobile.png`, `debug-screenshots/audit-v247-search-outlet-not-working.png`, and `debug-screenshots/audit-v247-maintenance-minder-desktop.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `diagnostics.html`; Edge `--dump-dom` again returned an empty DOM and failed before the interaction probe.
- Ran a Playwright/Chrome fallback for `diagnostics.html`; verified `#no-start-workflow` renders on desktop and iPhone-width mobile, mobile has no horizontal overflow, `truck wont start` returns the No-Start Workflow search result, and Escape closes Search without leaving `modal-open`.
- Captured screenshots under `debug-screenshots/audit-v249-diagnostics-desktop.png`, `debug-screenshots/audit-v249-diagnostics-mobile.png`, and `debug-screenshots/audit-v249-search-truck-wont-start.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Ran a Playwright/Chrome fallback for `diagnostics.html#trailer-light-workflow`; verified the Trailer-Light Issue Flow renders on desktop and iPhone-width mobile, mobile has no horizontal overflow, `trailer lights not working` returns the Trailer-Light Issue Flow search result, and Escape closes Search without leaving `modal-open`.
- Captured screenshots under `debug-screenshots/audit-v250-diagnostics-trailer-desktop.png`, `debug-screenshots/audit-v250-diagnostics-trailer-mobile.png`, and `debug-screenshots/audit-v250-search-trailer-lights-not-working.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Ran a Playwright/Chrome fallback for `diagnostics.html#accessory-power-workflow`; verified the Accessory Power Issue Flow renders on desktop and iPhone-width mobile, mobile has no horizontal overflow, `accessory socket not working` returns the Accessory Power Issue Flow search result, and Escape closes Search without leaving `modal-open`.
- Captured screenshots under `debug-screenshots/audit-v251-diagnostics-accessory-desktop.png`, `debug-screenshots/audit-v251-diagnostics-accessory-mobile.png`, and `debug-screenshots/audit-v251-search-accessory-socket-not-working.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `diagnostics.html`; Edge `--dump-dom` again returned an empty DOM before checking the main landmark.
- Ran a Playwright/Chrome fallback for `diagnostics.html#audio-display-workflow`; verified the Audio Display Issue Flow renders on desktop and iPhone-width mobile, mobile has no horizontal overflow, `radio not working` returns the Audio Display Issue Flow search result, and Escape closes Search without leaving `modal-open`.
- Captured screenshots under `debug-screenshots/audit-v252-diagnostics-audio-desktop.png`, `debug-screenshots/audit-v252-diagnostics-audio-mobile.png`, and `debug-screenshots/audit-v252-search-radio-not-working.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `index.html`, `diagnostics.html`, `maintenance.html`, and `garage.html`; Edge `--dump-dom` again returned an empty DOM before the main-landmark check.
- Ran a Playwright/Chrome fallback for `index.html`, `diagnostics.html`, `maintenance.html`, and `garage.html` at desktop and iPhone-width mobile; verified main content, exactly one current full-menu page, visible current-page navigation, no horizontal overflow, and Diagnostics mobile More-menu Escape cleanup.
- Captured screenshots under `debug-screenshots/audit-v253-*.png`, including `debug-screenshots/audit-v253-diagnostics-mobile-menu-current.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Ran a Playwright/Chrome fallback for `diagnostics.html`; verified the Workflow Index renders after the hero on desktop and iPhone-width mobile, exposes six workflow cards, has no horizontal overflow, deep card navigation reaches `#trailer-light-workflow` after smooth scroll settles, `workflow index` search returns `diagnostics.html#workflow-index`, and Escape closes Search without leaving `modal-open`.
- Captured screenshots under `debug-screenshots/audit-v255-diagnostics-desktop.png`, `debug-screenshots/audit-v255-diagnostics-mobile.png`, and `debug-screenshots/audit-v255-search-workflow-index-mobile.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `diagnostics.html`; Edge `--dump-dom` again rendered without the main landmark before interaction checks.
- Ran a Playwright/Chrome fallback for `diagnostics.html` at iPhone width; verified the Workflow Index still exposes six cards, has no horizontal overflow, the trailer-light card reaches `#trailer-light-workflow`, `workflow index` returns the Diagnostics Workflow Index search result, and Search closes without leaving `modal-open`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `diagnostics.html`; Edge `--dump-dom` again rendered without the main landmark before interaction checks.
- Ran a Playwright/Chrome fallback for `diagnostics.html` at desktop and iPhone width; verified the Workflow Index still exposes six cards, the new Other Quick Routes section exposes six non-main cards, removed duplicate lower-page no-start/trailer cards, no horizontal overflow, deep links to the seven Diagnostics anchors, `no crank` returns the No-Start Workflow without the old duplicate alias, `trailer lights` returns the Trailer-Light Issue Flow without the old duplicate alias, and Search closes without leaving `modal-open`.
- Captured screenshots under `debug-screenshots/audit-v256-diagnostics-desktop.png`, `debug-screenshots/audit-v256-diagnostics-mobile.png`, `debug-screenshots/audit-v256-search-no-crank-mobile.png`, and `debug-screenshots/audit-v256-search-trailer-lights-mobile.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `hood.html` and `cabin.html`; Edge `--dump-dom` again rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `hood.html#hood-fuse-glossary` and `cabin.html#cabin-fuse-glossary` at desktop and iPhone width; verified each glossary renders, has at least four acronym items, has no horizontal overflow, includes expected DBW/ACG definitions, and does not mis-map `AC outlet` as A/C.
- Ran Playwright/Chrome fallback mobile search checks for `fuse acronyms`, `what does dbw mean`, and `what does miss sol mean`; each surfaced the Fuse Label Glossary and Search closed without leaving `modal-open`.
- Captured screenshots under `debug-screenshots/audit-v257-hood-desktop-glossary.png`, `debug-screenshots/audit-v257-hood-mobile-glossary.png`, `debug-screenshots/audit-v257-cabin-desktop-glossary.png`, `debug-screenshots/audit-v257-cabin-mobile-glossary.png`, and `debug-screenshots/audit-v257-search-fuse-acronyms-mobile.png`.
- Used MDN printing guidance, accessed 2026-05-16, to keep the quick-sheet print treatment in CSS with `@media print` / `@page`: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `quick-sheet.html`, `diagnostics.html`, and `cabin.html`; Edge `--dump-dom` again rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `quick-sheet.html`; verified the Fuse Triage section renders, exposes four routing cards, links to the expected Diagnostics/Cabin targets, has no desktop or iPhone-width horizontal overflow, `fuse quick sheet` returns the Fuse Triage Quick Sheet search result, Search closes without leaving `modal-open`, and print media hides injected navigation/support controls while keeping `#fuse-triage` visible.
- Captured screenshots under `debug-screenshots/audit-v258-quick-sheet-desktop.png`, `debug-screenshots/audit-v258-quick-sheet-mobile-fuse-triage.png`, `debug-screenshots/audit-v258-search-fuse-quick-sheet-mobile.png`, and `debug-screenshots/audit-v258-quick-sheet-print-preview.png`.
- Used Honda Info Center towing/specification pages, the Honda 2019 Ridgeline owner-manual PDF, and Honda accessory wheel instructions, accessed 2026-05-16, for the quick-sheet source-confidence pass: https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Engine-Chassis-Features/Towing-Capacity/, https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Specifications/, https://techinfo.honda.com/rjanisis/pubs/OM/AH/ATHR1919OM/enu/ATHR1919OM.PDF, and https://www.bernardiparts.com/Images/Install/2018_Ridgeline_18inchAluminumWheelTG7_AII06945-38.pdf.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `quick-sheet.html`; Edge `--dump-dom` again rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `quick-sheet.html#source-confidence`; verified desktop and iPhone-width rendering, four source-confidence cards, external source links with `target="_blank"` and `rel="noreferrer"`, no horizontal overflow, `quick sheet sources` search coverage, Search Escape cleanup, and print media preserving `#source-confidence` while hiding header/actions.
- Captured screenshots under `debug-screenshots/audit-v259-quick-sheet-desktop-source-confidence.png`, `debug-screenshots/audit-v259-quick-sheet-mobile-source-confidence.png`, `debug-screenshots/audit-v259-search-quick-sheet-sources-mobile.png`, and `debug-screenshots/audit-v259-quick-sheet-print-source-confidence.png`.
- Used Honda's 2019 Ridgeline Dashboard Details guide, accessed 2026-05-16, for the warning-light triage source note: https://owners.honda.com/utility/download?path=%2Fstatic%2Fpdfs%2F2019%2FRidgeline%2FMY19_Ridgeline_Dashboard_Details.pdf.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `diagnostics.html`; Edge `--dump-dom` again rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `diagnostics.html#warning-light-workflow`; verified desktop and iPhone-width rendering, seven Workflow Index cards, the new quick-check row, no horizontal overflow, mobile card navigation to the warning-light workflow after smooth scroll settled, `warning light` search coverage, and Search Escape cleanup.
- Captured screenshots under `debug-screenshots/audit-v260-diagnostics-desktop-warning-light.png`, `debug-screenshots/audit-v260-diagnostics-mobile-warning-light.png`, and `debug-screenshots/audit-v260-search-warning-light-mobile.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `garage.html` and `diagnostics.html`; Edge `--dump-dom` again rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `garage.html#warning-light-template` and `diagnostics.html#warning-light-workflow`; verified desktop and iPhone-width Garage template rendering, required note fields, template back-link to Diagnostics, Diagnostics route into the template, no horizontal overflow, `warning light note` search coverage, and Search Escape cleanup.
- Captured screenshots under `debug-screenshots/audit-v261-garage-warning-template-desktop.png`, `debug-screenshots/audit-v261-garage-warning-template-mobile.png`, `debug-screenshots/audit-v261-garage-warning-template-mobile-viewport.png`, `debug-screenshots/audit-v261-diagnostics-warning-template-route-mobile.png`, and `debug-screenshots/audit-v261-search-warning-light-note-mobile.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `garage.html`; Edge `--dump-dom` again rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `garage.html#dashboard`; verified the Diagnostic Notes dashboard card on iPhone and desktop, the route to `#warning-light-template`, no horizontal overflow, live dashboard refresh after warning-light field edits, preservation of an existing dynamic quick-capture note key during Garage notes form save, `warning light note` search coverage, and Search Escape cleanup.
- Captured screenshots under `debug-screenshots/audit-v262-garage-dashboard-mobile.png`, `debug-screenshots/audit-v262-garage-dashboard-mobile-live-update.png`, and `debug-screenshots/audit-v262-garage-dashboard-desktop.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `garage.html`; Edge `--dump-dom` again rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `garage.html#diagnostic-activity`; verified empty and populated iPhone-width states, grouping of warning-light, Quick Capture, maintenance-log, and area-journal diagnostic notes, no horizontal overflow, `recent diagnostic activity` search coverage, Search Escape cleanup, and desktop rendering.
- Captured screenshots under `debug-screenshots/audit-v263-garage-diagnostic-activity-empty-mobile.png`, `debug-screenshots/audit-v263-garage-diagnostic-activity-populated-mobile.png`, `debug-screenshots/audit-v263-search-recent-diagnostic-activity-mobile.png`, and `debug-screenshots/audit-v263-garage-diagnostic-activity-desktop.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `diagnostics.html`; Edge `--dump-dom` still rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `diagnostics.html`; verified iPhone-width rendering, seven Workflow Index cards, shortened workflow cards, stacked Quick Checks rows, lighter mobile source notes, mobile bottom action text `Flows`, no mobile or desktop horizontal overflow, warning-light workflow hash navigation after smooth-scroll settling, `workflow index` search coverage, Search Escape cleanup, and desktop rendering.
- Captured screenshots under `debug-screenshots/audit-v264-diagnostics-mobile-density.png`, `debug-screenshots/audit-v264-diagnostics-mobile-warning-anchor.png`, and `debug-screenshots/audit-v264-diagnostics-desktop-density.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- `node --check garage.js` could not run because `node` is not installed in this shell.
- Attempted `Invoke-BrowserSmoke.ps1` for `garage.html`; Edge still rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `garage.html#diagnostic-activity`; verified iPhone and desktop rendering, no horizontal overflow, populated diagnostic activity from warning-light notes/Quick Capture/service log/area journal data, filter changes for service and area categories, Copy Summary status, and screenshots.
- Captured screenshots under `debug-screenshots/audit-v265-garage-diagnostic-activity-mobile.png` and `debug-screenshots/audit-v265-garage-diagnostic-activity-desktop.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `garage.html`; Edge still rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `garage.html#diagnostic-activity`; verified iPhone and desktop rendering, no horizontal overflow, Download Backup visibility, JSON download creation, required Garage backup keys, exclusion of local photo data URLs from the JSON payload, `garage backup` search coverage, and Search Escape cleanup.
- Captured screenshots under `debug-screenshots/audit-v266-garage-backup-mobile.png`, `debug-screenshots/audit-v266-search-garage-backup-mobile.png`, and `debug-screenshots/audit-v266-garage-backup-desktop.png`; verified the downloaded JSON at `debug-screenshots/audit-v266-downloads/ridgeline-garage-backup-2026-05-16.json`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `garage.html`; Edge still rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `garage.html#diagnostic-activity`; verified iPhone and desktop rendering, no horizontal overflow, the new Download Activity button, service-filtered diagnostic JSON download, full Garage backup download, `diagnostic activity json` search coverage, and Search Escape scroll-lock cleanup.
- Captured screenshots under `debug-screenshots/audit-v267-garage-activity-download-mobile.png` and `debug-screenshots/audit-v267-garage-activity-download-desktop.png`; verified downloaded JSON at `debug-screenshots/audit-v267-downloads/ridgeline-diagnostic-activity-service-2026-05-16.json` and `debug-screenshots/audit-v267-downloads/ridgeline-garage-backup-2026-05-16.json`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `garage.html`; Edge still rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `garage.html#diagnostic-activity`; verified iPhone-width rendering, no horizontal overflow, malformed JSON rejection, diagnostic-activity handoff rejection, valid Garage backup preview, Restore Backup enabling only after valid selection, local Garage restore into notes/profile/photos without data-URL image bytes, restore-button reset, `restore garage backup` search coverage, Search Escape scroll-lock cleanup, and desktop rendering.
- Captured screenshots under `debug-screenshots/audit-v268-garage-restore-preview-mobile.png`, `debug-screenshots/audit-v268-garage-restore-complete-mobile.png`, `debug-screenshots/audit-v268-search-restore-garage-backup-mobile.png`, and `debug-screenshots/audit-v268-garage-restore-desktop.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `garage.html`; Edge still rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `garage.html#diagnostic-activity`; verified the preview starts hidden, invalid diagnostic-activity handoffs keep Restore disabled, valid Garage backups reveal the preview and enable Restore, restored notes persist, imported top-level and area-journal photo `dataUrl` bytes are stripped, mobile and desktop have no horizontal overflow, and restore resets the preview/button state.
- Captured screenshots under `debug-screenshots/audit-v269-garage-restore-preview-mobile.png`, `debug-screenshots/audit-v269-garage-restore-complete-mobile.png`, and `debug-screenshots/audit-v269-garage-restore-desktop.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
- Attempted `Invoke-BrowserSmoke.ps1` for `garage.html`; Edge still rendered without the main landmark before interaction checks.
- Ran Playwright/Chrome fallback verification for `garage.html#diagnostic-activity`; verified invalid-only backups keep Restore disabled, mixed valid/invalid backups preview replace/merge/skipped impact, invalid service-log sections are not restored, valid sections still restore, imported top-level and area-journal photo `dataUrl` bytes are stripped, the area-journal filter reveals matching items beyond the six-item display cap, and mobile/desktop have no horizontal overflow.
- Captured screenshots under `debug-screenshots/audit-v270-garage-restore-validation-mobile.png`, `debug-screenshots/audit-v270-garage-restore-complete-mobile.png`, and `debug-screenshots/audit-v270-garage-restore-desktop.png`.
- Added `tools/audit/Invoke-GarageRestoreAudit.ps1`, a reusable Playwright/Chrome audit for `garage.html#diagnostic-activity` restore behavior. It creates temporary diagnostic-handoff, invalid-only, and mixed valid/invalid Garage backup JSON files, uses Playwright file input handling, verifies Restore disabled/enabled states, preview replace/merge/skipped wording, valid-section-only restore, photo `dataUrl` stripping, restored area activity filtering, and mobile/desktop no-horizontal-overflow behavior.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Invoke-GarageRestoreAudit.ps1 -Tag audit-v271`; Garage restore Playwright audit passed and captured `debug-screenshots/audit-v271-garage-restore-audit-mobile.png` and `debug-screenshots/audit-v271-garage-restore-audit-desktop.png`.
- Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\audit\Test-InternalLinks.ps1`; internal link/anchor audit passed for 16 HTML files.
