# Anton Run Brief

Read this file first on every scheduled run. Open the larger memory files only when the current slice needs them.

## Goal

Make the Ridgeline site better for real iPhone use in noticeable, verified, shippable slices.

## Current User Preferences

- The user primarily uses the site on an iPhone 16 Pro Max.
- Prioritize practical ownership workflows: diagnostics, maintenance, fuses, parts, offline access, garage records, quick references, and Anton status.
- Normal successful runs should produce a visible site improvement, not just logs, status updates, screenshots, or Markdown churn.
- Anton should complete useful work, but should not get stuck polishing one workflow for many runs.

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

- Read `ANTON_RUN_BRIEF.md` and `AGENT_STATE.md` first.
- Skim `AGENT_BACKLOG.md`, `ANTON_ROADMAP.md`, `SITE_QUALITY_AUDIT.md`, or `ANTON.md` only for the chosen slice or when you need a durable rule/source.
- Update `AGENT_STATE.md` every successful run.
- Update `ANTON.md`, `ANTON_ROADMAP.md`, `AGENT_BACKLOG.md`, and `SITE_QUALITY_AUDIT.md` only when preserving a durable rule, roadmap decision, meaningful audit result, or new source-backed idea.
- Keep screenshots local unless they prove a major visual change or a failure that future runs must inspect.
- Prefer targeted browser smoke for changed pages. Run broader audits when changing shared navigation, storage, service worker behavior, or factual/reference content.

## Impact Standard

Every successful run must end with these exact lines:

- `Impact Score: N/5`
- `Visible Change: one sentence naming what the user can see or do now`
- `Impact Reason: one sentence explaining why it matters on iPhone`

Use 3/5 or higher for normal runs. A 1/5 or 2/5 run is acceptable only for urgent fixes, reliability, token/auth recovery, or verification repair.

## Current Standing Next Bets

- Review the site-wide iPhone header/Dynamic Island experience after the recent compact sticky header and island shelf changes.
- Move beyond the Garage parts-staging run unless a bug or obvious completion gap is found.
- Look for the next high-impact iPhone workflow outside Garage staging, especially Diagnostics, Quick Sheet, fuse clarity, offline/search reliability, or Anton status clarity.
