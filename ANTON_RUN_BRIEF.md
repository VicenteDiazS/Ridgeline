# Anton Run Brief

Read this file first on every scheduled run. Open the larger memory files only when the current slice needs them.

## Goal

Make the Ridgeline site better for real iPhone use in noticeable, verified, shippable slices.

## Current User Preferences

- The user primarily uses the site on an iPhone 16 Pro Max.
- Prioritize practical ownership workflows: diagnostics, maintenance, fuses, parts, offline access, garage records, quick references, and Anton status.
- Normal successful runs should produce a visible site improvement, not just logs, status updates, screenshots, or Markdown churn.
- Anton should complete useful work, but should not get stuck polishing one workflow for many runs.

## Current Queue

- `Now`: review shared iPhone polish after the recent homepage/header/theme/hotspot changes and fix any regression that makes the truck-first experience feel worse.
- `Next`: pick one high-impact owner workflow outside the exact last slice, preferably Diagnostics, Quick Sheet, Garage clarity, or Home truck navigation.
- `Fallback`: if larger feature work is risky, improve a real reliability path such as light-theme contrast, mobile anchor landing, search/offline clarity, or Anton status clarity.

## High-Impact Zones

- Home truck map and first-screen iPhone navigation
- Diagnostics symptom-first help and handoffs
- Quick Sheet roadside/offline flows
- Garage handoff review, restore clarity, and owner-memory ergonomics
- Shared iPhone header/search/theme reliability
- Anton status clarity and owner review/control flows

## Rotation Rule

Before continuing the same initiative, ask whether it has reached a useful stopping point. If the last 2-3 successful runs were in the same page or workflow, compare at least three other high-impact areas before choosing the next slice.

Good rotation targets:

- `diagnostics.html`: symptom-first workflows, warning-light paths, mobile density, garage handoffs.
- `quick-sheet.html`: emergency/fuse/printable references, roadside-friendly iPhone use.
- `hood.html` / `cabin.html` / `rear-hitch.html`: fuse clarity, source confidence, glossary/search routes.
- `garage.html`: records, backups, notes, parts handoffs, review/export flows.
- `maintenance.html`: planner clarity, service prep, garage handoffs.
- `anton.html` / home Anton status: understandable progress, control/status clarity.
- Shared UI/PWA: header, search, menu, offline/cache, scroll/nav reliability.

Continue an active initiative when:

- the previous run left a broken, half-finished, or confusing user path
- a small follow-up unlocks a complete workflow
- verification found a regression
- the next slice is clearly higher impact than rotating away

Rotate away when:

- the next idea is another small button, wording tweak, or narrow helper on the same panel
- the workflow is already usable and the next step needs real iPhone review
- the same files have dominated the last 2-3 successful work commits

## Token And Time Budget

- Scheduled runs should behave like a full work block, not a one-task sprint.
- Aim to stay productively working for most of the 90-minute interval by chaining multiple meaningful slices when safe.
- Do not stop right after one successful feature or fix if useful time remains; pick the next best safe slice and keep going.
- Good run shapes:
  - one large feature plus follow-up fix/verification work
  - two to four meaningful smaller slices in adjacent or clearly high-value areas
  - one implementation slice plus a second slice that removes the next obvious friction point
- Only end early when:
  - auth, quota, or tool failure blocks further work
  - the remaining time is too short for another safe slice
  - the next likely slice needs risky assumptions or fresh user direction
  - verification exposed a blocker that needs a clean handoff note rather than rushed edits
- Read `ANTON_RUN_BRIEF.md` and `AGENT_STATE.md` first.
- Skim `AGENT_BACKLOG.md`, `ANTON_ROADMAP.md`, `SITE_QUALITY_AUDIT.md`, or `ANTON.md` only for the chosen slice or when you need a durable rule/source.
- Update `AGENT_STATE.md` every successful run.
- Update `ANTON.md`, `ANTON_ROADMAP.md`, `AGENT_BACKLOG.md`, and `SITE_QUALITY_AUDIT.md` only when preserving a durable rule, roadmap decision, meaningful audit result, or new source-backed idea.
- Keep screenshots local unless they prove a major visual change or a failure that future runs must inspect.
- Prefer targeted browser smoke for changed pages. Run broader audits when changing shared navigation, storage, service worker behavior, or factual/reference content.
- For page-local UI work, do not spend the whole run on full-site audits if targeted verification is enough.
- For long runs, use one helper sub-agent for sidecar research or verification when the available tools support it and the write scopes stay clear.

## Impact Standard

Every successful run must end with these exact lines:

- `Impact Score: N/5`
- `Visible Change: one sentence naming what the user can see or do now`
- `Impact Reason: one sentence explaining why it matters on iPhone`

When relevant, also add:

- `Ended Early Because: one sentence if the run stopped before using most of the block`
- `Time Lost To: one sentence if a repeated tool, audit, auth, or setup issue burned time`
- `Blocked By: one short phrase if a concrete blocker remained`

Use 3/5 or higher for normal runs. A 1/5 or 2/5 run is acceptable only for urgent fixes, reliability, token/auth recovery, or verification repair.

## Run Utilization Rule

Before ending a scheduled run, ask:

- Is there still enough time for one more safe, user-visible slice?
- Did I stop because the work is actually complete, or just because one slice landed cleanly?
- Would the user rather see another real improvement than an early wrap-up?

If the honest answer is that another safe slice fits, keep going.

## Current Standing Next Bets

- Review the site-wide iPhone header/Dynamic Island experience after the recent compact sticky header and island shelf changes.
- Move beyond the Garage parts-staging run unless a bug or obvious completion gap is found.
- Look for the next high-impact iPhone workflow outside Garage staging, especially Diagnostics, Quick Sheet, fuse clarity, offline/search reliability, or Anton status clarity.
