import http from 'node:http';
import fs from 'node:fs/promises';
const files = new Set(['index.html', 'styles.css', 'app.js', 'core.js', 'pwa.js', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']);
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', webmanifest: 'application/manifest+json', png: 'image/png' };
export async function serve(overrides = new Map()) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const prefix = '/goal-tracker-site-builder/';
    const file = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) || 'index.html' : '';
    if (!files.has(file) && !overrides.has(file)) { res.writeHead(404).end(); return; }
    try { const data = overrides.get(file) ?? await fs.readFile(new URL('../' + file, import.meta.url)); res.writeHead(200, { 'Content-Type': types[file.split('.').pop()], 'Cache-Control': 'no-store' }); res.end(data); }
    catch { res.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/goal-tracker-site-builder/` };
}
