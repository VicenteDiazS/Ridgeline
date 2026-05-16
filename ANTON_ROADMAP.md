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
- Maintenance planning that separates official Maintenance Minder facts from user-friendly reminders.
- iPhone-first garage workflows for quick use beside the truck.
- Stronger navigation and smoke coverage so every added feature stays reachable, scrollable, and stable.

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
- Printable or saved quick sheets for fuses, maintenance, and emergency references.
- Local garage-log export/import checks.

### Guided Diagnostics

Create non-safety-critical guided paths for common owner problems.

Candidate slices:

- Trailer-light issue flow using existing fuse-table, hitch connector, and adapter references. Completed 2026-05-16 as `diagnostics.html#trailer-light-workflow`; future work should deepen it only if stronger sources or user needs appear.
- Accessory power / 12V outlet issue flow.
- Audio/radio/display symptom path.

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
- Current-page indicators.
- Better empty states.
- More regression checks for drawers, modals, anchor jumps, and scrolling.
- Thumb-reachable primary actions and no horizontal overflow at common iPhone widths.

## Research Queue

- Current 2017-2020 Ridgeline owner questions and recurring DIY workflows.
- Strong examples of offline-first service dashboards and garage logs.
- Accessibility and PWA patterns that reduce stuck states, stale caches, and mobile navigation confusion.
- Official Honda owner/manual PDFs for factual maintenance, fluids, fuse, and warning-light content.

## Blocker Rules

- If a factual vehicle-data source is missing, do not invent. Add a source-needed note and work on UX, tooling, or unsourced user-note scaffolding instead.
- If browser verification is flaky, improve the verification tooling before trusting the feature.
- If the worktree has user changes, inspect and preserve them. Keep Anton commits focused on Anton's own work.
