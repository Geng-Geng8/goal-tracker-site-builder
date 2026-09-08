// Exercises the actual starter service worker, then upgrades at the same Pages path.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { serve } from './server.mjs';
import { config, saved } from './fixtures.js';
import { makeBackup } from '../core.js';
const require = createRequire(import.meta.url), { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const START = 'cf7644b6ae96a02cee9f198abba01b7013b2e2c8';
const overrides = new Map(['index.html', 'app.js', 'api.js', 'offline.js', 'styles.css', 'sw.js', 'pwa.js', 'manifest.webmanifest'].map(file => [file, execFileSync('git', ['show', `${START}:${file}`])]));
const { server, url } = await serve(overrides);
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
let context;
try {
  context = await browser.newContext(); const page = await context.newPage();
  await page.goto(url); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload();
  await page.getByRole('heading', { name: 'Connect My Google Sheet', exact: true }).waitFor();
  await page.evaluate(async () => { localStorage.setItem('goalTracker:lastData:v1', '{"legacy":"preserve me"}'); await caches.open('unrelated-app-cache'); });
  overrides.clear(); // Publish the feature files only to the temporary local test server.
  await page.reload(); await page.getByRole('heading', { name: 'Build Your Own Goal Tracker' }).waitFor();
  await page.getByRole('button', { name: 'Update app', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Update app', exact: true }).click();
  await page.waitForFunction(async () => !(await caches.keys()).includes('goal-tracker-shell-v1'));
  await page.getByRole('heading', { name: 'Build Your Own Goal Tracker' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('goalTracker:lastData:v1')), '{"legacy":"preserve me"}');
  assert.ok((await page.evaluate(() => caches.keys())).includes('unrelated-app-cache'));
  console.log('PASS Actual starter → V1 update, cache cleanup, unrelated cache and legacy data preservation');
  await page.getByRole('button', { name: 'Backup & settings', exact: true }).click();
  await page.getByLabel('RESTORE A BACKUP', { exact: true }).setInputFiles({ name: 'test.json', mimeType: 'application/json', buffer: Buffer.from(makeBackup(saved())) });
  await page.getByRole('button', { name: 'RESTORE THIS BACKUP', exact: true }).click(); await page.getByRole('heading', { name: 'Practice Lab', exact: true }).waitFor();
  const other = await context.newPage(); await other.goto(url); await other.getByRole('heading', { name: 'Practice Lab', exact: true }).waitFor();
  // Both tabs attempt the same activation; a tab already updated by storage events may be disabled.
  await Promise.all([page, other].map(tab => tab.getByRole('button', { name: new RegExp(config().actions[0].name) }).evaluate(b => b.click())));
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('universalGoalTracker:state:v1')).actionHistory.length === 1);
  assert.equal(await other.evaluate(() => JSON.parse(localStorage.getItem('universalGoalTracker:state:v1')).actionHistory.length), 1);
  await other.close();
  const raw = await page.evaluate(() => localStorage.getItem('universalGoalTracker:state:v1'));
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  await page.getByRole('button', { name: new RegExp(config().actions[1].name) }).click();
  await page.getByRole('alert').filter({ hasText: 'Could not save on this device' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('universalGoalTracker:state:v1')), raw);
  await page.reload();
  console.log('PASS Real two-tab duplicate prevention and storage-quota failure preservation');
  await page.evaluate(() => localStorage.setItem('universalGoalTracker:state:v1', '{"stateVersion":999}')); await page.reload();
  await page.getByRole('heading', { name: 'Let’s keep your saved data safe' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('universalGoalTracker:state:v1')), '{"stateVersion":999}');
  await page.getByLabel('RESTORE A BACKUP', { exact: true }).setInputFiles({ name: 'recovery.json', mimeType: 'application/json', buffer: Buffer.from(makeBackup(saved())) });
  await page.getByRole('button', { name: 'RESTORE THIS BACKUP', exact: true }).click(); await page.getByRole('heading', { name: 'Practice Lab', exact: true }).waitFor();
  console.log('PASS Unsupported-version recovery screen and confirmed restore without silent deletion');
  await context.setOffline(true); await page.reload(); await page.getByRole('heading', { name: 'Practice Lab', exact: true }).waitFor();
  console.log('PASS Offline shell after actual starter upgrade');
} finally { await context?.close(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
