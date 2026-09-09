# V1 verification

Starting main: `cf7644b6ae96a02cee9f198abba01b7013b2e2c8`.

## Results

- `npm run check`: all four application JavaScript files pass Node syntax checks.
- `npm test`: 52/52 tests pass, with no production or unit-test dependencies.
- The 44 core tests also pass with `TZ=America/Toronto`, including DST and year boundaries.
- `node tests/browser.mjs`: seven real Chrome acceptance groups pass at a GitHub Pages-style subpath, with 390px mobile and 1280px desktop layouts. No uncaught JavaScript errors. Observed requests contain only same-origin static GETs and no tracker payloads.
- `node tests/upgrade.mjs`: four real Chrome groups pass: actual starter service-worker upgrade; scoped cache cleanup and legacy preservation; two-tab duplicate prevention and storage quota failure; future-version recovery/restore; offline use after upgrade.
- Screenshots of welcome, preview and Today were visually inspected. The existing 512px PNG failed decoding; its replacement decodes correctly and keeps the original visual identity.

## Acceptance matrix

| Requirement | Evidence |
| --- | --- |
| 1. Fresh start | Unit and actual-browser welcome; no demo history |
| 2. Goal Builder completion | Actual browser completes all ten questions and schedule |
| 3. Back preserves answers | Unit persistence and actual-browser Back |
| 4. Refresh preserves onboarding | Actual browser refreshes a partially completed plan |
| 5. AI prompt generation | Approval-gated deterministic unit check; actual clipboard contents |
| 6. Valid setup import | Unit plain JSON; actual browser preview and save |
| 7. Markdown JSON import | Unit and actual browser with prose and fenced block |
| 8. Friendly repair | Actual invalid input and Copy Fix Prompt; unit repair assertions |
| 9. HTML/script never executes | Malicious schema rejection; actual browser has no injected nodes or execution |
| 10. Oversized/malformed rejection | Units and browser; ambiguous setups and prototype fields rejected |
| 11. Correct points | Units plus actual browser's saved event history |
| 12. Once per day | Units, disabled UI, refresh, two real tabs |
| 13. Today | Event-count and point unit assertions; actual Today view |
| 14. Week | Monday boundary unit assertions; actual Week view |
| 15. Streaks | Current/best, missed scheduled day, current-day grace, >1-year streak |
| 16. Unscheduled days | Weekends ignored; optional-day work does not grow streak |
| 17. History persistence | Snapshot unit tests and browser History |
| 18. Refresh persistence | Actual saved tracker reload |
| 19. Reopen persistence | Actual tab closed and reopened while offline |
| 20. Backup generation | Validated unit roundtrip and actual downloaded file |
| 21. Restore works | Actual file input, preview, confirm, retained history/milestones |
| 22. Invalid restore preserves | Byte-for-byte unit and browser assertions; stale preview rejected |
| 23. Reset confirmation | Actual Escape cancellation and confirmed reset |
| 24. Keyboard usability | Actual Tab/Enter skip link, Escape dialog; semantic native controls and visible focus inspected |
| 25. Reduced motion | Stylesheet checks and real browser emulation |
| 26. Correct SW files | VM test verifies every shell resource exists; actual offline reload |
| 27. Old-cache cleanup | VM namespace and shared-cache preservation checks; upgrade from the actual starting worker |
| 28. No old core dependency | Core/UI source checks; old modules removed; legacy references only for preservation/testing/docs |
| 29. No remote tracker transmission | Source checks, CSP connect-src none, real network request assertions |
| 30. No executable imported data | Strict schema, plain text DOM sinks, no eval/dynamic scripts/unsafe HTML |

Additional coverage: failed/quota writes preserve the saved tracker, unsupported-version recovery, duplicate imported history, invalid timestamps/calendar dates, milestone validation, exact approved-plan matching, and safe earlier-data archival.

## Practical limits

Native install acceptance on physical devices, Safari/Firefox engine coverage and a full screen-reader audit have not been performed. Browser emulation verifies layout/keyboard/offline functionality, not every physical-device behavior. Clipboard permission denial has a selectable-text fallback but its platform-specific context menus are not exhaustively tested. Lightweight goal checks are heuristic and not comprehensive moderation. Tests use synthetic plans and a fixture AI reply; no external AI service received a student plan.

No V1 implementation blocker remains in the tested environment. Production deployment and merging are intentionally not performed.
