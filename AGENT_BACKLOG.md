# Ridgeline Site Agent Backlog

This backlog is ordered by practical value. The agent should work from the top unless the user gives a different priority.

## High Priority

- Continue validating fuse diagram accuracy against reliable owner-manual or cover-label sources; per-box source-status notes are now present.
- Run periodic web research for practical Ridgeline-owner feature ideas, then add sourced, non-safety-critical ideas to this backlog.
- Build from owner workflows the user is likely to value: quick diagnostics, maintenance planning, fuse finding, parts tracking, offline checklists, garage records, and mobile-first reference tools.

## Fuse And Electrical

- Deepen source notes with exact owner-manual/page or cover-label references as reliable sources are captured.
- Add clearer acronym definitions for fuse circuits.
- Expand the new search aliases into a fuller guided fuse-finder workflow for common symptoms, without changing fuse facts unless sourced.
- Add a fuse-finder workflow: symptom to likely fuse boxes and fuse positions.
- Add print-friendly fuse reference sheets.

## Research Notes

- 2026-05-15: Owner-search terms worth supporting include power outlet / cigarette lighter / accessory socket, trailer running/brake/reverse lights, radio/audio/display screen, and backup camera. Sources used for idea support and table-term cross-checking: https://fuse-box.info/honda/honda-ridgeline-2017-2019-fuses and https://techinfo.honda.com/rjanisis/pubs/QS/AH/AT6Z1717OG/enu/AT6Z1717OG.pdf. These were used to guide search aliases only; no fuse ratings or positions were changed.

## Navigation And UX

- Keep expanding browser smoke coverage for real user glitches: blank pages, collapsed sections, stuck scroll locks after modals/drawers, broken anchor jumps, stale service-worker loads, and mobile-only navigation failures.
- Make the header, bottom bar, site menu, and search feel consistent on small screens.
- Reduce duplicated navigation surfaces where they compete for attention.
- Add a clear current-page indicator in the universal header/menu.
- Improve empty states for garage data and photo atlas.
- Add regression coverage for nested modal/drawer handoffs, such as opening Search or Sync Settings from the quick-tools drawer.
- Continue tuning subpage helper density after real-device review; the page title should remain the first content priority.

## Performance And Offline

- Add service worker cache audit notes.
- Check image sizes and defer non-critical heavy assets.
- Keep adaptive motion behavior tied to connection quality and reduced-motion preference.

## Content

- Add maintenance interval views by mileage and job type.
- Expand garage log templates for common Ridgeline jobs.
- Add common problem diagnosis paths with confidence/source notes.
- Add parts cross-reference tables with source dates.
- Add mobile-friendly emergency/roadside mode.

## Nice To Have

- Add an "Ideas from research" panel or note stream where Anton can summarize sourced feature candidates before implementing them.
- Add a local Windows truck-computer mode later.
- Add export/import for garage notes.
- Add printable quick sheets.
- Add QR/NFC landing flows for specific fuse diagrams and maintenance tasks.
