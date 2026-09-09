# Universal Goal Tracker V1

One free, static, mobile-first application for every student. Students make a Goal Plan, ask an approved external AI tool to organize it into **data**, and paste that Tracker Setup back into the app. No student edits application code or JSON by hand.

**Use AI to build something that helps you do the work.** Students choose their goal, reasons, success, actions, schedule and style. AI does not make those decisions.

## Architecture

GitHub Pages + vanilla HTML/CSS/JavaScript ES modules + PWA + localStorage. No build step or production dependencies. No backend, database, accounts, AI API, analytics or remote tracker requests. The content security policy blocks application connections and executable imported content. Hosting still serves public static files; external AI is a separate, student-initiated copy/paste workflow.

- `core.js`: authoritative Tracker Setup and state validators, balanced JSON extraction, deterministic prompts, calendar calculations, storage and backups. Also runs directly in Node tests.
- `app.js`: safe DOM rendering, student screens, local actions, backup/restore/reset, teacher information and recovery.
- `index.html`, `styles.css`: semantic shell and responsive dark/light UI, retaining the starter's card layout and accent palette.
- `pwa.js`, `sw.js`, `manifest.webmanifest`: optional installation, offline shell and explicit updates.
- `icon.svg`, `icon-192.png`, `icon-512.png`: existing visual identity; the corrupt original 512px PNG was rebuilt from the added SVG source.
- `tests/`: dependency-free unit tests and optional actual-browser acceptance scripts.

The former `api.js` and `offline.js` have been removed after inspection. Their local unique-event concept and local-calendar helpers informed the replacement. There is no server synchronization or write queue.

## Student workflow

1. Welcome: age guidance, privacy and a 15–25 minute process. A separate teacher information screen is available.
2. Choose one of ten goal areas. **I Don't Know Yet** offers discovery questions and examples without choosing for the student.
3. Answer ten questions, one screen at a time. Answers and selected days save as they change; Back and refresh preserve them.
4. Review a human-readable Goal Plan. **Looks good** records approval; edits invalidate approval.
5. Copy the complete deterministic prompt into ChatGPT, Gemini, or the teacher/adult-approved AI tool. Under-13 students do this part with an appropriate adult using an appropriate account.
6. Copy the complete Tracker Setup reply and paste it into the tracker. Prose and Markdown fences are accepted. No code or manual formatting is needed.
7. Invalid input gets **Almost there** and a **Copy Fix Prompt** for the same AI conversation. It identifies validation problems, without echoing hostile input.
8. Preview the proposed actions, points, milestones, schedule and style. The student can adjust the realistic daily action target, return to paste, or change their plan. Nothing becomes an active tracker until **Save tracker**.
9. Use Today, Week, Progress and History. Installation and backup are optional follow-up actions in **Backup & settings**.

## Tracker Setup V1

`validateConfig()` and `SCHEMA_GUIDE` in `core.js` define the single versioned contract. All listed properties are required; unknown properties are rejected. Strings must be bounded plain text; HTML, executable schemes and common execution attempts are rejected. Nothing is evaluated, inserted as HTML, loaded as a script, or used as an arbitrary style/URL.

| Field | Rules |
| --- | --- |
| `version` | Exactly `1` |
| `appName` | 1–60 characters |
| `mainGoal`, `successDefinition` | 1–500 characters each |
| `targetDate` | 1–100 characters; a student's time frame such as `6 weeks` is allowed, so no date is invented |
| `dailyTarget` | Integer 1–6, no greater than action count |
| `daysPerWeek` | Integer 1–7 |
| `scheduledDays` | Distinct integers 0 (Sunday) through 6 (Saturday); count must equal `daysPerWeek` |
| `pointsName`, `streakName` | 1–24 characters each |
| `style.mode` | `light` or `dark` |
| `style.feel` | `calm`, `sporty`, `playful`, `serious`, `game-like` |
| `style.accent` | `lime`, `blue`, `purple`, `orange`; mapped to accessible local palettes |
| `actions` | 3–6 objects, each containing `id`, `name` (1–160), `category` (1–40), `difficulty`, `points` |
| `milestones` | 0–8 objects, each containing `id` and `name` (1–160) |

IDs use 1–64 letters/numbers/underscores/hyphens, begin with a letter or number, exclude prototype-related names, and are unique across actions and milestones. Difficulty/points pairs are fixed: **easy = 1, medium = 3, hard = 5, big-win = 10**. The parser accepts at most 24,000 characters and exactly one candidate setup. Missing fields, invalid enums, oversized arrays/strings, malformed numbers and duplicate IDs fail closed.

The app verifies that the imported title, goal, success, time frame and scheduled days exactly match the approved plan. Actions still need the student's final preview approval. The prompt instructs AI to derive useful actions only from that plan and not invent outcomes or milestones.

## Local state and data safety

Storage key: `universalGoalTracker:state:v1`. State has `stateVersion`, `onboarding`, `trackerConfig`, `actionHistory`, `milestoneState` and `preferences`. `migrateState()` is the explicit future-migration hook. Unsupported or damaged data opens a recovery screen; it is never silently reset. Keep the existing key and original data when adding future migrations.

Action events snapshot their unique ID, action ID, action name, points, ISO timestamp and **local calendar date at completion**. Historical names/points are never reconstructed from current configuration. One action can be recorded only once per local day. Completed buttons disable immediately. Dates use local calendar arithmetic, including DST and year changes. Changing the device clock can affect date-based tracking; this is a personal reflection tool, not a tamper-proof record.

Writes validate the complete proposed state before one atomic localStorage write. A failed/quota write leaves previous storage intact and shows an error. Modern browsers use Web Locks to serialize writes across tabs and re-read the latest state before each change; storage events refresh other tabs. On browsers without Web Locks, use one tracker tab at a time (a notice is shown in settings). History is bounded at 20,000 events; backup data is bounded at 8 MB UTF-8, and browser storage may fill sooner.

Earlier starter storage keys are left untouched and detected in the welcome/settings screens. Students can download an archive for safekeeping. The old cached dashboard/queued actions are not enough to infer an approved V1 plan, so there is **no automatic legacy history conversion**. The legacy archive is not a V1 backup. Only an explicitly confirmed reset removes this earlier local data. Remote data from the old architecture is never contacted or changed.

### Calculations

- Today: completed actions versus the student's action target, plus the actual points earned.
- Week: Monday–Sunday; days worked (at least one action), days-per-week target, actual points and action counts. Work on optional days is included.
- Streak: consecutive **scheduled** days that meet the daily action count. Unscheduled days neither add to nor break it. An incomplete current day remains open until local midnight; a missed past scheduled day resets the current count. Best streak and all past work remain. The rule is explained on Progress.
- Progress: total points, current/best streak, days worked and manually completed milestones. No fabricated percentage toward a subjective outcome.
- History: newest-first snapshots with calendar date, time and points; older entries are accessible through Show more. Event IDs are not displayed.

### Backup, restore and reset

**Save a backup** downloads `{ "backupVersion": 1, "state": ... }` containing the full restorable state, including an unfinished onboarding plan. It is data, not software. Keep the file private.

Restore limits the file size, parses only JSON, validates the entire state, shows the proposed tracker and progress count, and asks for explicit confirmation. The existing raw storage value is checked again at replacement time so a change in another tab cannot be overwritten using a stale preview. A rejected file, cancellation, stale preview or failed write leaves current storage unchanged.

**Reset my tracker** is visually separate, describes what will be erased and requires confirmation in a keyboard-accessible modal. Escape/Cancel retains everything. Downloaded backup files are not deleted. A recovery copy preserves unreadable original storage for troubleshooting; it is not guaranteed to be a restorable V1 backup.

Local data belongs to the **browser profile and origin**. It does not follow students across devices, private-browsing sessions or browser profiles. Clearing site data or browser eviction can remove it. Anyone using the same profile can see it. Backups are the recovery/move-device path; installation does not create cloud storage.

## Privacy and healthy motivation

No age, birthdate, legal name, email, school, board, location, health fields or analytics identifiers are collected. Students are told not to place sensitive information in free-text plans. No tracker data is sent to Glen or any backend. Only the approved plan is placed on the clipboard for external AI; that provider's account and privacy rules apply separately.

Lightweight phrase checks redirect some clearly concerning goals at onboarding, import and restore. The app does not gamify those goals; it offers short trusted-adult guidance without diagnosis, shame or treatment advice. These checks are intentionally not a comprehensive moderation system; context can be missed or flagged unnecessarily. Teacher/adult supervision and student review remain important.

Points reward useful work under the student's control. No punishment, negative points, leaderboards, random rewards, purchase currencies, countdowns or guilt. A missed day uses neutral language. Optional rest days are built into the schedule.

## PWA and GitHub Pages

The app runs under a repository subpath with relative asset, manifest and service-worker URLs. Maintainers can preview it on any local HTTP server; HTTPS or localhost is required for PWA/clipboard support. Opening `index.html` with `file://` is not supported. No production deployment or Pages-setting change is part of this V1 PR.

The service worker atomically precaches the complete V1 shell and serves that release from its own scoped cache. It never caches or sends tracker data. An unsuccessful installation leaves the previous version available. An installed update waits for **Update app**, or until all old clients close. Finish a current paste/preview first; saved data persists. Assets in the first V1 HTML use a query version so the old starter worker cannot mix cached V0 scripts with the new HTML during upgrade.

On activation, cleanup removes only older caches in this app's namespace. If the starter's shared cache contains this app's index URL, cleanup removes only entries within this app's scope, then deletes the cache only if empty. Other repository sites sharing that old cache keep their entries. Unrelated caches and localStorage are not deleted. Every future release must change `RELEASE` in `sw.js` whenever shell content changes. Keep manifest/icon assets valid. `icon.svg` is a reproducible source for the repaired 512px PNG.

Installation is browser-dependent. The app provides Install app where supported and browser-menu guidance otherwise. It displays when offline preparation is complete or unavailable. Test offline only after the first successful online load has installed the shell.

## Development and tests

Requires Node 20+ for tests. Runtime dependencies: **none**.

```sh
npm run check
npm test
```

For actual-browser checks, install Playwright in a separate development environment or point `PLAYWRIGHT_MODULE` at an existing local module. The tests use an installed Chrome by default; set `BROWSER_CHANNEL=msedge` to test Edge. No browser package is a production dependency.

```sh
node tests/browser.mjs
node tests/upgrade.mjs
```

Both scripts start a temporary loopback-only server under `/goal-tracker-site-builder/`, use isolated browser contexts, and clean up when done. `browser.mjs` saves screenshots, a synthetic backup and a result report in ignored `test-results/`. `upgrade.mjs` reads the recorded starting commit with `git show` to test the actual prior worker on the same local origin, then switches the temporary server to V1. It never deploys anything.

See [TESTING.md](TESTING.md) for the acceptance matrix and actual results.

## Scope and limitations

One tracker per browser profile/origin. No configuration editing after activation in V1; save a backup and reset to start another plan. No automatic legacy conversion, cloud sync, teacher dashboard, accounts, grading, analytics, AI integration, subjective outcome estimation or code generation. These features are intentionally excluded or deferred, not partially implemented.

Native installation on physical iOS/Android/Chromebook devices and assistive-technology screen-reader testing still require device QA. Automated and desktop browser checks cover the available environment; the external AI conversation itself was not sent to a provider during tests.

Starting main SHA for this implementation: `cf7644b6ae96a02cee9f198abba01b7013b2e2c8`.
