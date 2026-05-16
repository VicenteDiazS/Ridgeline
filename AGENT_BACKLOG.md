# Ridgeline Site Agent Backlog

This backlog is ordered by practical value. The agent should work from the top unless the user gives a different priority.

## High Priority

- Treat iPhone/mobile Safari as the main user environment for all navigation, layout, and interaction decisions.
- Use `ANTON_ROADMAP.md` to keep improving the site through multi-day initiatives instead of isolated one-off changes.
- Continue validating fuse diagram accuracy against reliable owner-manual or cover-label sources; per-box source-status notes are now present.
- Visible first-pass fuse-label glossaries completed 2026-05-16 for Hood and Cabin; future work should deepen only non-factual label help unless reliable sources support data changes.
- Quick-sheet fuse triage, print/save-PDF treatment, and source-confidence pass completed 2026-05-16; future work should tune printed-page density after real-device review, not add fuse facts without sources.
- Run periodic web research for practical Ridgeline-owner feature ideas, then add sourced, non-safety-critical ideas to this backlog.
- Build from owner workflows the user is likely to value: quick diagnostics, maintenance planning, fuse finding, parts tracking, offline checklists, garage records, and mobile-first reference tools.
- Service Prep Planner completed 2026-05-16 for oil, wheel/tire, battery, and filter staging checklists.
- Maintenance Minder Pocket Planner completed 2026-05-16 near `maintenance.html#minder`; it builds copyable checklists from the existing A/B and sub-item 1-6 rows, rejects unsupported sub-code 7, routes to Quick Maintenance Update and Garage Notes, and avoids mileage prediction or brake-fluid sub-code wording.

## Fuse And Electrical

- Deepen source notes with exact owner-manual/page or cover-label references as reliable sources are captured.
- Add clearer acronym definitions for fuse circuits. First visible glossary slice completed 2026-05-16; remaining work is additional search aliases or print-friendly glossary placement after real-device review.
- Expand the Fuse Symptom Finder with more symptoms only when the route can point to existing references or reliable sources without inventing fuse facts.
- Accessory-power / 12V outlet mini-flow completed 2026-05-16; deepen it only if stronger sources or user needs appear.
- Audio/radio/display mini-flow completed 2026-05-16; deepen it only if stronger sources, real-truck symptoms, or user needs appear.
- Warning-light triage, Garage note template, first Garage dashboard diagnostic card, Recent Diagnostic Activity grouping, derived filters, Copy Summary, Garage backup download, filtered diagnostic-activity JSON export, guarded local Garage restore, mobile restore preview, imported-photo-byte sanitization, restore section-shape validation, replace/merge preview wording, filter-before-cap activity rendering, and reusable Playwright restore audit coverage completed 2026-05-16; future work should review restore behavior with a real user backup before adding conflict resolution or overwrite/merge choices.
- Garage Restore Backup preview now shows Backup/Current counts, the restore audit catches hidden reveal ancestors on deep links, and `Invoke-SiteAudit.ps1` runs `Invoke-GarageRestoreAudit.ps1` by default. The flaky Edge dump-DOM smoke path was replaced on 2026-05-16 with a Playwright/Chrome smoke runner that preserves the prior interaction coverage.
- Add print-friendly symptom-to-fuse quick sheets after the underlying fuse-source validation is deeper.
- Add print-friendly fuse reference sheets after deeper source validation; first quick-sheet triage routing slice is complete.

## Research Notes

- 2026-05-15: Owner-search terms worth supporting include power outlet / cigarette lighter / accessory socket, trailer running/brake/reverse lights, radio/audio/display screen, and backup camera. Sources used for idea support and table-term cross-checking: https://fuse-box.info/honda/honda-ridgeline-2017-2019-fuses and https://techinfo.honda.com/rjanisis/pubs/QS/AH/AT6Z1717OG/enu/AT6Z1717OG.pdf. These were used to guide search aliases only; no fuse ratings or positions were changed.
- 2026-05-15: Added the Fuse Symptom Finder using the existing site tables plus source support from the 2019 owner-manual fuse guidance and common 2017-2019 Ridgeline fuse reference wording. Source URLs used for support, accessed 2026-05-15: https://cdn.dealereprocess.org/cdn/servicemanuals/honda/2019-ridgeline.pdf and https://fuse-box.info/honda/honda-ridgeline-2017-2019-fuses. No fuse ratings or positions were changed.
- 2026-05-15: Corrected Maintenance Minder code content against official Honda owner PDFs, accessed 2026-05-15: https://owners.honda.com/utility/download?path=%2Fstatic%2Fpdfs%2F2019%2FRidgeline%2FMY19_Ridgeline_Maintenance_Minder_System.pdf, https://owners.honda.com/utility/download?path=%2Fstatic%2Fpdfs%2F2020%2FRidgeline%2FMY20_Ridgeline_Maintenance_Minder_System.pdf, and https://owners.honda.com/utility/download?path=%2Fstatic%2Fpdfs%2F2017%2FRidgeline%2F2017_Ridgeline_Maintenance_Minder_System.pdf. The durable rule is: 2017-2020 Ridgeline Maintenance Minder sub-items are 1-6 in these Honda PDFs; brake fluid is tracked separately as a 3-year calendar item, not as site code 7/B127.
- 2026-05-16: Added the No-Start Workflow using official Honda source support, accessed 2026-05-16: https://techinfo.honda.com/rjanisis/pubs/OM/AH/AT6Z1919OM/enu/AT6Z1919OMEN.PDF and https://techinfo.honda.com/rjanisis/pubs/QS/AH/BTJB1919GW/enu/GUID-C68F4997-76C9-42F4-9101-6ACD79C71899.html. The workflow routes no-crank/slow-crank/normal-crank owner language to existing battery, fuse, garage-note, and emergency-card references; no repair specifications, fuse ratings, or fuse positions were changed.
- 2026-05-16: Added the Trailer-Light Issue Flow using Honda 2019 Ridgeline feature-guide source support, accessed 2026-05-16: https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Engine-Chassis-Features/Towing-Capacity/. The workflow routes trailer brake/turn/running/reverse light, 7-way connector, adapter, and repeat-setup owner language to existing hitch, pinout, hood fuse, and garage-note references; no trailer wiring facts, fuse ratings, pin assignments, or repair specifications were changed.
- 2026-05-16: Added the Accessory Power Issue Flow using Honda 2019 Ridgeline owner-manual source support, accessed 2026-05-16: https://cdn.dealereprocess.org/cdn/servicemanuals/honda/2019-ridgeline.pdf. The workflow routes dead phone charger, 12V socket, front accessory socket, console socket, overload, and repeat accessory-power owner language to existing Cabin/Hood fuse, battery, quick-check, and garage-note references; no fuse ratings, fuse positions, inverter facts, or repair specifications were changed.
- 2026-05-16: Added the Audio Display Issue Flow using Honda 2019 Ridgeline audio source support, accessed 2026-05-16: https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Interior-Features/Audio-System/, https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Interior-Features/Display-Audio-with-HondaLink---RTL-T-and-above/, https://owners.honda.com/utility/download?path=%2Fstatic%2Fpdfs%2F2019%2FRidgeline%2FMY19_Ridgeline_Audio_and_Connectivity.pdf, and https://techinfo.honda.com/rjanisis/pubs/OM/AH/AT6Z1919OM/enu/AT6Z1919OMEN.PDF. The workflow routes dead radio, no sound, blank display audio screen, Bluetooth/phone audio, and recent audio/electrical work to existing Hood/Cabin fuse, cabin journal, and garage-note references; no fuse ratings, fuse positions, reset procedures, or repair specifications were changed.
- 2026-05-16: Added Quick Sheet Fuse Triage and print styling using MDN print-CSS guidance, accessed 2026-05-16: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing. This affected layout/print behavior only and routes to existing site workflows/glossaries; no fuse ratings, positions, or repair procedures were changed.
- 2026-05-16: Added Quick Sheet Source Confidence using Honda owner/spec/towing references and Honda accessory wheel instructions, accessed 2026-05-16: https://techinfo.honda.com/rjanisis/pubs/OM/AH/ATHR1919OM/enu/ATHR1919OM.PDF, https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Engine-Chassis-Features/Towing-Capacity/, https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Specifications/, and https://www.bernardiparts.com/Images/Install/2018_Ridgeline_18inchAluminumWheelTG7_AII06945-38.pdf. This pass added visible source links/cautions, marked battery size/CCA as common replacement references, and marked bolt pattern/center bore as fitment-reference values; no vehicle specs were changed.
- 2026-05-16: Added Diagnostics Warning Light Triage using Honda's 2019 Ridgeline Dashboard Details guide, accessed 2026-05-16: https://owners.honda.com/utility/download?path=%2Fstatic%2Fpdfs%2F2019%2FRidgeline%2FMY19_Ridgeline_Dashboard_Details.pdf. The workflow routes red/amber dash lights, MID messages, multiple warning lights, and recent battery/service context to existing official-manual, emergency-card, battery, and garage-note paths; no diagnostic procedures, warning-light definitions, or repair specifications were added beyond the Honda-backed categorization note.

## Navigation And UX

- Keep expanding browser smoke coverage for real user glitches: blank pages, collapsed sections, stuck scroll locks after modals/drawers, broken anchor jumps, stale service-worker loads, and mobile-only navigation failures.
- Browser smoke now runs through Playwright/Chrome instead of `--dump-dom`; future coverage should be added to that path.
- Make the header, bottom bar, site menu, and search feel consistent on small screens.
- Reduce duplicated navigation surfaces where they compete for attention.
- Current-page indicator in the universal header/menu completed 2026-05-16; keep it visible during future header density tuning.
- Improve empty states for garage data and photo atlas.
- Add regression coverage for nested modal/drawer handoffs, such as opening Search or Sync Settings from the quick-tools drawer.
- Add broader main-audit coverage for nested hash targets with animated parents; first targeted coverage now exists in the Garage restore audit for `garage.html#diagnostic-activity` and is included in `Invoke-SiteAudit.ps1`.
- Continue tuning subpage helper density after real-device review; the page title should remain the first content priority.

## Performance And Offline

- Add service worker cache audit notes.
- Check image sizes and defer non-critical heavy assets.
- Keep adaptive motion behavior tied to connection quality and reduced-motion preference.

## Content

- Add maintenance interval views by mileage and job type.
- Maintenance Minder Pocket Planner completed 2026-05-16: accepts codes like A1/B12/B4, assembles a checklist from already-sourced code rows, routes to Quick Maintenance Update and Garage notes, and avoids mileage predictions or treating brake fluid as sub-code 7.
- Review Maintenance page iPhone density after the Service Prep Planner and Pocket Planner live together; tune section spacing or bottom-dock behavior only if real-device use feels crowded.
- Expand garage log templates for common Ridgeline jobs.
- Add common problem diagnosis paths with confidence/source notes.
- Improve iPhone orientation now that diagnostics has several deep workflows: current-page indicators, clearer active menu state, compact workflow index, warning-light routing, explicit workflow-index browser-smoke coverage, trimmed lower-page Diagnostics routing, a warning-light Garage note template, a Garage dashboard diagnostic-note card, Recent Diagnostic Activity grouping/filter/copy/download tools, Garage backup download, guarded local Garage restore, backup-shape validation, reusable restore audit coverage in the main wrapper, and a first Diagnostics mobile density pass are complete; next safe slice is a real-device review of the new Diagnostics/Garage density and Garage restore wording before adding conflict resolution choices.
- Add parts cross-reference tables with source dates.
- Add mobile-friendly emergency/roadside mode.

## Nice To Have

- Add an "Ideas from research" panel or note stream where Anton can summarize sourced feature candidates before implementing them.
- Add a local Windows truck-computer mode later.
- Add conflict-aware Garage restore options after the guarded local restore is reviewed with real user backup files.
- Add more printable quick sheets after source validation; Quick Sheet Fuse Triage print route completed 2026-05-16.
- Add QR/NFC landing flows for specific fuse diagrams and maintenance tasks.
