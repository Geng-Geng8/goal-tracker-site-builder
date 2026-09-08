import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
function worker() {
  const handlers = {}, data = new Map(), deleted = [], fetched = [], scope = 'https://example.test/goal-tracker-site-builder/';
  const caches = { keys: async () => [...data.keys()], delete: async name => { deleted.push(name); return data.delete(name); }, open: async name => { if (!data.has(name)) data.set(name, new Map()); const cache = data.get(name); return { addAll: async paths => { for (const p of paths) cache.set(new URL(p, scope).href, { url: new URL(p, scope).href }); }, match: async req => cache.get(typeof req === 'string' ? req : req.url), keys: async () => [...cache.keys()].map(url => ({ url })), delete: async req => cache.delete(req.url) }; } };
  const self = { registration: { scope }, clients: { claim: async () => {} }, addEventListener: (type, fn) => handlers[type] = fn, skipWaiting: () => { self.skipped = true; } };
  vm.runInNewContext(source, { self, caches, URL, Set, fetch: async req => { fetched.push(req); return { network: true }; } });
  const run = async type => { let p; handlers[type]({ waitUntil: value => p = value }); await p; };
  return { handlers, data, deleted, fetched, scope, run, self };
}
test('service worker caches exactly existing V1 shell resources', async () => {
  const w = worker(); await w.run('install'); const urls = [...w.data.values()][0];
  for (const url of urls.keys()) { const name = new URL(url).pathname.split('/').pop() || 'index.html'; assert.ok(fs.existsSync(new URL('../' + name, import.meta.url)), name); }
  assert.ok([...urls.keys()].some(x => x.endsWith('core.js'))); assert.ok(![...urls.keys()].some(x => /api\.js|offline\.js/.test(x)));
  assert.equal(w.self.skipped, undefined);
});
test('activation cleans only own older caches and matching legacy cache', async () => {
  const w = worker(); await w.run('install'); const current = [...w.data.keys()][0];
  const old = current.replace('universal-v1-1', 'older'); w.data.set(old, new Map());
  w.data.set('goal-tracker-shell-v1', new Map([[w.scope + 'index.html', {}]])); w.data.set('unrelated-app', new Map()); w.data.set('goal-tracker-shell-other-site-old', new Map());
  await w.run('activate'); assert.ok(w.deleted.includes(old)); assert.ok(w.deleted.includes('goal-tracker-shell-v1')); assert.ok(w.data.has('unrelated-app')); assert.ok(w.data.has('goal-tracker-shell-other-site-old'));
});
test('offline navigation uses cached shell and external/POST requests are not handled', async () => {
  const w = worker(); await w.run('install'); let response;
  w.handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: w.scope }, respondWith: p => response = p }); assert.equal((await response).url, w.scope + 'index.html'); assert.equal(w.fetched.length, 0);
  for (const request of [{ method: 'POST', url: w.scope }, { method: 'GET', url: 'https://other.test/' }]) w.handlers.fetch({ request, respondWith: () => assert.fail('Should not intercept') });
});
test('shared legacy cache preserves another repository site within the same cache', async () => {
  const w = worker(); await w.run('install');
  const other = 'https://example.test/another-tracker/index.html';
  w.data.set('goal-tracker-shell-v1', new Map([[w.scope + 'index.html', {}], [w.scope + 'api.js', {}], [other, {}]]));
  await w.run('activate');
  assert.deepEqual([...w.data.get('goal-tracker-shell-v1').keys()], [other]);
});
test('updates activate only through the explicit update message', () => { const w = worker(); w.handlers.message({ data: { type: 'bad' } }); assert.equal(w.self.skipped, undefined); w.handlers.message({ data: { type: 'ACTIVATE_UPDATE' } }); assert.equal(w.self.skipped, true); });
test('manifest uses relative Pages URLs and proper icons', () => {
  const m = JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest', import.meta.url))); assert.equal(m.start_url, './'); assert.equal(m.scope, './'); assert.equal(m.display, 'standalone');
  for (const icon of m.icons) { const png = fs.readFileSync(new URL('../' + icon.src, import.meta.url)); assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes); }
});
test('application has no remote requests, dynamic scripts, unsafe DOM sinks or obsolete core dependencies', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8'), core = fs.readFileSync(new URL('../core.js', import.meta.url), 'utf8'), html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(app + core, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|innerHTML|outerHTML|insertAdjacentHTML|new Function|\beval\s*\(/);
  assert.doesNotMatch(html + app, /script\.google\.com|jsonp|GoalTrackerAPI|waiting to sync/i); assert.match(html, /connect-src 'none'/);
});
test('accessibility foundations include labels, dialogs, keyboard focus and reduced motion', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8'), css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(html, /<main/); assert.match(html, /<dialog/); assert.match(html, /aria-live/); assert.match(css, /:focus-visible/); assert.match(css, /prefers-reduced-motion: reduce/); assert.match(css, /min-height: 48px/);
});
