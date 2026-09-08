# Goal Tracker Starter Template

A free, mobile-first goal tracker for the Goal Tracker Starter Kit.

This repository is the reusable front-end app engine. Students should personalize their tracker by changing their Google Sheet, not by rewriting the website code.

## What is included

- Today screen
- Week screen
- Progress screen
- History screen
- Points and progress
- Streak display
- Milestones
- Mobile-first layout
- Installable PWA
- Offline app shell
- Offline action queue
- Automatic sync when internet returns
- Duplicate-write protection through mutation IDs
- Saved last-known dashboard data
- Simple Google Apps Script connector setup

## Files

- `index.html` — app screen and structure
- `styles.css` — mobile-first design
- `app.js` — tracker UI and calculations
- `api.js` — Google Apps Script connection
- `offline.js` — offline action queue and retry logic
- `pwa.js` — install and service-worker helpers
- `sw.js` — offline app-shell cache
- `manifest.webmanifest` — PWA metadata
- `icon-192.png` and `icon-512.png` — app icons

## Expected Google Sheet tabs

The matching Starter Kit Google Sheet uses:

- `Settings`
- `Categories`
- `Actions`
- `Log`
- `Milestones`
- `App Text`

The front end expects the matching Starter Kit `Code.gs` web app to support:

### GET

- `?action=getApp`
- `?action=getToday`
- `?action=getWeek`
- `?action=getHistory`

### POST

```json
{
  "action": "logAction",
  "actionName": "Practice 10 questions",
  "mutationId": "unique-id",
  "occurredAt": "2026-09-08T12:00:00.000Z"
}
```

and:

```json
{
  "action": "completeMilestone",
  "milestone": "Finish chapter 1",
  "mutationId": "unique-id",
  "occurredAt": "2026-09-08T12:00:00.000Z"
}
```

The provided Starter Kit backend already uses mutation IDs to prevent duplicate action writes. If the backend also reads `occurredAt`, it can preserve the original time of actions completed offline.

## Student setup

1. Make a copy of the Goal Tracker Google Sheet.
2. Add the Starter Kit `Code.gs` in Google Apps Script.
3. Deploy it as a Web App.
4. Copy the Web App URL.
5. Open this tracker and paste the URL into **Connect My Google Sheet**.
6. Tap **Connect**.

The URL is saved only in that browser using local storage. The student does not need to edit JavaScript.

## GitHub Pages

1. Open **Settings** in this repository.
2. Open **Pages**.
3. Choose **Deploy from a branch**.
4. Select `main` and `/root`.
5. Save.

## Offline behavior

The service worker caches the app shell. The browser also stores the last successfully loaded dashboard data.

When an action is completed while offline:

1. it receives a unique mutation ID;
2. it is saved to the offline queue;
3. the app shows it immediately as pending;
4. the queue survives closing or refreshing the app;
5. the app retries when internet returns;
6. the backend mutation ID prevents the same action from being written twice.

## Important production note

This repository is the reusable front-end template. The matching Google Sheet template and `Code.gs` are separate Starter Kit resources and should be frozen and tested together before classroom use.

The intended student experience is:

**Answer questions → copy the Sheet → paste one connector URL → use the app → test → polish → install.**

Students should not need to understand APIs, databases, service workers, or JavaScript to complete the project.
