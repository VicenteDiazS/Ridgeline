# Anton Roadmap

This file is Anton's long-horizon product roadmap for the Ridgeline site. Anton should use it to carry high-level improvements across many scheduled runs, even when a single run only completes one small slice.

## Operating Model

- Maintain one active initiative at a time unless the current task is blocked.
- Break big work into reviewable slices that can ship independently every run or every few runs.
- Prefer visible, practical improvements that make the site better for real 2019 Honda Ridgeline ownership on the user's iPhone.
- Keep the site stable while iterating: navigation, scrolling, search, offline behavior, and browser smoke checks must stay healthy.
- Use internet research to discover owner pain points, but only use reliable sources for factual vehicle data.
- Update this roadmap after meaningful progress, a new user preference, a blocker, or a better high-level opportunity.
- If a project needs days, keep returning to it across scheduled runs until it reaches a useful stopping point.

## Active Initiative

### Owner Workflow Upgrade

Goal: turn the site from a reference collection into a practical garage companion that helps the user diagnose, plan, verify, and record Ridgeline work.

Current focus areas:

- Fuse and electrical symptom workflows that guide from common words to existing sourced tables.
- No-start and roadside diagnostic workflows that start from owner-visible symptoms and route into existing battery, fuse, emergency, and garage-log references.
- Trailer-light workflows that start from connector, adapter, and owner-visible light symptoms before routing to existing hitch, pinout, fuse, and garage-log references.
- Accessory-power workflows that start from power mode, device/load, and which outlet failed before routing to existing fuse and garage-log references.
- Audio/display workflows that start from power mode, no-sound, screen-only, and recent-work symptoms before routing to existing fuse, cabin, and garage-log references.
- Warning-light workflows that start from red/amber indicators, exact MID messages, multiple-light events, and recent battery/service context before routing to official-manual, emergency-card, battery, and garage-note references. Completed 2026-05-16 as `diagnostics.html#warning-light-workflow`.
- A Garage warning-light incident template that captures exact indicator/MID text, light behavior, recent context, and next action from the warning-light workflow. Completed 2026-05-16 as `garage.html#warning-light-template`.
- A Garage dashboard diagnostic-note surface that summarizes populated warning-light fields and routes back to the warning-light template. Completed 2026-05-16 as a `garage.html#dashboard` card.
- A Garage Recent Diagnostic Activity surface that groups existing warning-light fields, diagnostic Quick Capture/NFC notes, maintenance log entries, and area-journal notes without a storage migration. Completed 2026-05-16 as `garage.html#diagnostic-activity`.
- Derived Garage Recent Diagnostic Activity filtering and copy-summary export for warning notes, quick captures, service logs, and area journals without a storage migration. Completed 2026-05-16 on `garage.html#diagnostic-activity`.
- Garage backup download from the diagnostic activity panel using the existing syncable Garage storage keys, completed 2026-05-16. The JSON includes Garage fields and photo metadata but intentionally excludes local-only image data URLs.
- Filtered diagnostic-activity JSON download from the diagnostic activity panel, completed 2026-05-16. This is a derived handoff export for the current filter, separate from the restorable full Garage backup and without a storage migration.
- Guarded local Garage restore from a downloaded backup, completed 2026-05-16 and tightened in audit-v269. The restore flow validates `ridgeline-garage-backup` JSON, previews recognized data areas in a visible mobile-friendly card, rejects diagnostic-activity handoffs, enables restore only after a valid backup is selected, and strips imported `dataUrl` image bytes from photo metadata before merge.
- A compact Diagnostics workflow index near the top of the page so the deep flows stay reachable on iPhone without crowding the hero. Completed 2026-05-16 as `diagnostics.html#workflow-index`.
- Lower-page Diagnostics routing trimmed so the workflow index is the canonical entry point and repeated no-start, accessory-power, audio/display, and trailer-light cards no longer duplicate the main flows. Completed 2026-05-16.
- Maintenance planning that separates official Maintenance Minder facts from user-friendly reminders.
- iPhone-first garage workflows for quick use beside the truck.
- Stronger navigation and smoke coverage so every added feature stays reachable, scrollable, and stable. Diagnostics Workflow Index coverage was added to `Invoke-BrowserSmoke.ps1` on 2026-05-16.
- Current-page orientation in the sticky header and full menu, completed 2026-05-16.
- Fuse-label glossary visibility for Hood and Cabin pages, completed 2026-05-16. The pages now expose plain-English shorthand definitions generated from existing fuse-table labels without changing fuse positions, ratings, or source-conflict notes.
- Quick Sheet Fuse Triage and Source Confidence, completed 2026-05-16. The emergency quick sheet now routes common fuse/electrical symptoms into the existing accessory-power, trailer-light, audio/display, and fuse-label glossary references, with print/save-PDF styling, visible source-confidence notes, and search coverage.
- Diagnostics mobile density pass, completed 2026-05-16. The page now uses scoped mobile rules to keep the workflow index, Quick Checks, source notes, and diagnostic routing cards more compact on iPhone without removing content or changing vehicle facts.

Definition of done:

- The user can start from a symptom, maintenance question, or garage task and reach the right page/section quickly.
- The experience works on iPhone/mobile first and desktop second, without stuck overlays, scroll locks, or blank sections.
- Any vehicle facts are sourced or clearly marked as user-entered/unsourced notes.
- Browser/link audits cover the new path.

## Future Initiatives

### Offline Garage Mode

Build the site into a stronger offline-first companion for garage or driveway use.

Candidate slices:

- Service-worker cache audit and update strategy.
- Clear offline status and stale-content messaging.
- Printable or saved quick sheets for fuses, maintenance, and emergency references. Fuse-triage routing and source-confidence slices completed 2026-05-16 on `quick-sheet.html#fuse-triage` and `quick-sheet.html#source-confidence`; next work should improve density after real-device review or wait for deeper fuse validation before adding factual tables.
- Local garage-log export/import checks.

### Guided Diagnostics

Create non-safety-critical guided paths for common owner problems.

Candidate slices:

- Trailer-light issue flow using existing fuse-table, hitch connector, and adapter references. Completed 2026-05-16 as `diagnostics.html#trailer-light-workflow`; future work should deepen it only if stronger sources or user needs appear.
- Accessory power / 12V outlet issue flow. Completed 2026-05-16 as `diagnostics.html#accessory-power-workflow`; future work should deepen it only if stronger sources or user needs appear.
- Audio/radio/display symptom path. Completed 2026-05-16 as `diagnostics.html#audio-display-workflow`; future work should deepen it only if stronger sources, real-truck symptoms, or user needs appear.

### Parts And Supplies Companion

Help the user prepare for service tasks without mixing vendor suggestions into factual repair data.

Candidate slices:

- Parts list templates by job.
- Source-date notes for vendor/catalog references.
- Garage inventory and “need to buy” views.
- Print-friendly job prep sheets.

### iPhone Interaction Polish

Keep improving the first-touch experience on the user's iPhone.

Candidate slices:

- Header/menu/search density tuning.
- Current-page indicators. Completed 2026-05-16 with a sticky-header page chip, full-menu Current badge, `aria-current`, and browser-check coverage.
- Diagnostics workflow index. Completed 2026-05-16 with a seven-card mobile-first index, leaner hero shortcuts, search coverage, reusable browser-smoke assertions, and desktop/mobile screenshots.
- Warning Light Triage. Completed 2026-05-16 with a seventh Diagnostics Workflow Index card, iPhone-width rendering, search coverage, official Honda source note, and screenshots.
- Warning Light Note Template. Completed 2026-05-16 with structured Garage fields, Diagnostics route links, mobile rendering, search coverage, browser-smoke assertions, and screenshots.
- Garage Diagnostic Notes Dashboard. Completed 2026-05-16 with a warning-light summary card, quick route back to the template, dynamic quick-capture note preservation, browser assertion coverage, and iPhone/desktop screenshots.
- Garage Recent Diagnostic Activity. Completed 2026-05-16 with empty/populated iPhone states, search coverage, browser-smoke assertions, dynamic Quick Capture refresh, and iPhone/desktop screenshots.
- Fuse-label glossary visibility. Completed 2026-05-16 with Hood/Cabin page sections, mobile search coverage, and screenshots.
- Quick Sheet Fuse Triage and Source Confidence. Completed 2026-05-16 with iPhone-width rendering, search coverage, source-link checks, print-media checks, and screenshots.
- Better empty states.
- More regression checks for drawers, modals, anchor jumps, and scrolling.
- Thumb-reachable primary actions and no horizontal overflow at common iPhone widths.
- Review Garage restore with a real user backup file before adding overwrite/merge conflict choices, plus real-device review of the Diagnostics and Garage mobile density before adding more workflow surfaces.

## Research Queue

- Current 2017-2020 Ridgeline owner questions and recurring DIY workflows.
- Strong examples of offline-first service dashboards and garage logs.
- Accessibility and PWA patterns that reduce stuck states, stale caches, and mobile navigation confusion.
- Official Honda owner/manual PDFs for factual maintenance, fluids, fuse, and warning-light content.

## Blocker Rules

- If a factual vehicle-data source is missing, do not invent. Add a source-needed note and work on UX, tooling, or unsourced user-note scaffolding instead.
- If browser verification is flaky, improve the verification tooling before trusting the feature.
- If the worktree has user changes, inspect and preserve them. Keep Anton commits focused on Anton's own work.
