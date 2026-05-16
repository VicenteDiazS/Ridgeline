# Ridgeline Site Agent Backlog

This backlog is ordered by practical value. The agent should work from the top unless the user gives a different priority.

## High Priority

- Treat iPhone/mobile Safari as the main user environment for all navigation, layout, and interaction decisions.
- Use `ANTON_ROADMAP.md` to keep improving the site through multi-day initiatives instead of isolated one-off changes.
- Continue validating fuse diagram accuracy against reliable owner-manual or cover-label sources; per-box source-status notes are now present.
- Run periodic web research for practical Ridgeline-owner feature ideas, then add sourced, non-safety-critical ideas to this backlog.
- Build from owner workflows the user is likely to value: quick diagnostics, maintenance planning, fuse finding, parts tracking, offline checklists, garage records, and mobile-first reference tools.

## Fuse And Electrical

- Deepen source notes with exact owner-manual/page or cover-label references as reliable sources are captured.
- Add clearer acronym definitions for fuse circuits.
- Expand the Fuse Symptom Finder with more symptoms only when the route can point to existing references or reliable sources without inventing fuse facts.
- Accessory-power / 12V outlet mini-flow completed 2026-05-16; deepen it only if stronger sources or user needs appear.
- Audio/radio/display mini-flow completed 2026-05-16; deepen it only if stronger sources, real-truck symptoms, or user needs appear.
- Add print-friendly symptom-to-fuse quick sheets after the underlying fuse-source validation is deeper.
- Add print-friendly fuse reference sheets.

## Research Notes

- 2026-05-15: Owner-search terms worth supporting include power outlet / cigarette lighter / accessory socket, trailer running/brake/reverse lights, radio/audio/display screen, and backup camera. Sources used for idea support and table-term cross-checking: https://fuse-box.info/honda/honda-ridgeline-2017-2019-fuses and https://techinfo.honda.com/rjanisis/pubs/QS/AH/AT6Z1717OG/enu/AT6Z1717OG.pdf. These were used to guide search aliases only; no fuse ratings or positions were changed.
- 2026-05-15: Added the Fuse Symptom Finder using the existing site tables plus source support from the 2019 owner-manual fuse guidance and common 2017-2019 Ridgeline fuse reference wording. Source URLs used for support, accessed 2026-05-15: https://cdn.dealereprocess.org/cdn/servicemanuals/honda/2019-ridgeline.pdf and https://fuse-box.info/honda/honda-ridgeline-2017-2019-fuses. No fuse ratings or positions were changed.
- 2026-05-15: Corrected Maintenance Minder code content against official Honda owner PDFs, accessed 2026-05-15: https://owners.honda.com/utility/download?path=%2Fstatic%2Fpdfs%2F2019%2FRidgeline%2FMY19_Ridgeline_Maintenance_Minder_System.pdf, https://owners.honda.com/utility/download?path=%2Fstatic%2Fpdfs%2F2020%2FRidgeline%2FMY20_Ridgeline_Maintenance_Minder_System.pdf, and https://owners.honda.com/utility/download?path=%2Fstatic%2Fpdfs%2F2017%2FRidgeline%2F2017_Ridgeline_Maintenance_Minder_System.pdf. The durable rule is: 2017-2020 Ridgeline Maintenance Minder sub-items are 1-6 in these Honda PDFs; brake fluid is tracked separately as a 3-year calendar item, not as site code 7/B127.
- 2026-05-16: Added the No-Start Workflow using official Honda source support, accessed 2026-05-16: https://techinfo.honda.com/rjanisis/pubs/OM/AH/AT6Z1919OM/enu/AT6Z1919OMEN.PDF and https://techinfo.honda.com/rjanisis/pubs/QS/AH/BTJB1919GW/enu/GUID-C68F4997-76C9-42F4-9101-6ACD79C71899.html. The workflow routes no-crank/slow-crank/normal-crank owner language to existing battery, fuse, garage-note, and emergency-card references; no repair specifications, fuse ratings, or fuse positions were changed.
- 2026-05-16: Added the Trailer-Light Issue Flow using Honda 2019 Ridgeline feature-guide source support, accessed 2026-05-16: https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Engine-Chassis-Features/Towing-Capacity/. The workflow routes trailer brake/turn/running/reverse light, 7-way connector, adapter, and repeat-setup owner language to existing hitch, pinout, hood fuse, and garage-note references; no trailer wiring facts, fuse ratings, pin assignments, or repair specifications were changed.
- 2026-05-16: Added the Accessory Power Issue Flow using Honda 2019 Ridgeline owner-manual source support, accessed 2026-05-16: https://cdn.dealereprocess.org/cdn/servicemanuals/honda/2019-ridgeline.pdf. The workflow routes dead phone charger, 12V socket, front accessory socket, console socket, overload, and repeat accessory-power owner language to existing Cabin/Hood fuse, battery, quick-check, and garage-note references; no fuse ratings, fuse positions, inverter facts, or repair specifications were changed.
- 2026-05-16: Added the Audio Display Issue Flow using Honda 2019 Ridgeline audio source support, accessed 2026-05-16: https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Interior-Features/Audio-System/, https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Interior-Features/Display-Audio-with-HondaLink---RTL-T-and-above/, https://owners.honda.com/utility/download?path=%2Fstatic%2Fpdfs%2F2019%2FRidgeline%2FMY19_Ridgeline_Audio_and_Connectivity.pdf, and https://techinfo.honda.com/rjanisis/pubs/OM/AH/AT6Z1919OM/enu/AT6Z1919OMEN.PDF. The workflow routes dead radio, no sound, blank display audio screen, Bluetooth/phone audio, and recent audio/electrical work to existing Hood/Cabin fuse, cabin journal, and garage-note references; no fuse ratings, fuse positions, reset procedures, or repair specifications were changed.

## Navigation And UX

- Keep expanding browser smoke coverage for real user glitches: blank pages, collapsed sections, stuck scroll locks after modals/drawers, broken anchor jumps, stale service-worker loads, and mobile-only navigation failures.
- Make the header, bottom bar, site menu, and search feel consistent on small screens.
- Reduce duplicated navigation surfaces where they compete for attention.
- Current-page indicator in the universal header/menu completed 2026-05-16; keep it visible during future header density tuning.
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
- Improve iPhone orientation now that diagnostics has several deep workflows: current-page indicators, clearer active menu state, compact workflow index, and explicit workflow-index browser-smoke coverage are complete; next safe slice is trimming duplicated lower-page Diagnostics routing.
- Add parts cross-reference tables with source dates.
- Add mobile-friendly emergency/roadside mode.

## Nice To Have

- Add an "Ideas from research" panel or note stream where Anton can summarize sourced feature candidates before implementing them.
- Add a local Windows truck-computer mode later.
- Add export/import for garage notes.
- Add printable quick sheets.
- Add QR/NFC landing flows for specific fuse diagrams and maintenance tasks.
