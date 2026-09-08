// Change the release whenever any app-shell file changes. Each release is atomic.
const RELEASE = 'universal-v1-1';
const SCOPE = self.registration.scope;
const PREFIX = `goal-tracker-shell-${encodeURIComponent(new URL(SCOPE).pathname)}-`;
const CACHE = PREFIX + RELEASE;
const APP_SHELL = ['./', './index.html', './styles.css?v=1', './app.js?v=1', './core.js', './pwa.js?v=1', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const SHELL_URLS = new Set(APP_SHELL.map(path => new URL(path, SCOPE).href));
self.addEventListener('install', event => {
  // A failed download rejects installation, leaving the previous shell intact.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
});
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name === CACHE) continue;
      if (name.startsWith(PREFIX)) await caches.delete(name);
      // The starter shared one cache name across repository sites on an origin.
      // Remove only our entries; another site's cached resources must survive.
      else if (/^goal-tracker-shell-v\d+$/.test(name)) {
        const old = await caches.open(name);
        if (await old.match(new URL('./index.html', SCOPE).href)) {
          for (const request of await old.keys()) {
            if (request.url.startsWith(SCOPE)) await old.delete(request);
          }
          if ((await old.keys()).length === 0) await caches.delete(name);
        }
      }
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== new URL(SCOPE).origin || !url.pathname.startsWith(new URL(SCOPE).pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(new URL('./index.html', SCOPE).href)).then(cached => cached || fetch(request)));
  } else if (SHELL_URLS.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(cached => cached || fetch(request)));
  }
});
