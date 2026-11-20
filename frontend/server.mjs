// M.E frontend dev/prod server — zero dependencies.
//  - serves ./public with SPA fallback
//  - proxies /backend/* to the existing Node API (same origin => no CORS needed,
//    so the backend does not have to change)
//  - serves /config.js generated from environment variables
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PUBLIC = join(root, 'public');

// minimal .env loader (frontend/.env) — no secrets belong here
const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const PORT = Number(process.env.PORT || 5173);
const BACKEND_URL = new URL(process.env.BACKEND_URL || 'http://localhost:3000');
const CURRENCY = (process.env.STORE_CURRENCY || 'EGP').toUpperCase();

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain'
};

function proxy(req, res) {
  const target = new URL(req.url.replace(/^\/backend/, '') || '/', BACKEND_URL);
  const headers = { ...req.headers, host: target.host };
  delete headers.origin; delete headers.referer;
  const upstream = http.request(target, { method: req.method, headers }, (up) => {
    res.writeHead(up.statusCode || 502, up.headers);
    up.pipe(res);
  });
  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: `Cannot reach the backend at ${BACKEND_URL.origin} (${err.code || err.message}). Is it running?` }));
  });
  req.pipe(upstream);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  const clean = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(PUBLIC, clean);
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    // SPA fallback for navigation requests (no file extension)
    if (extname(clean)) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
    file = join(PUBLIC, 'index.html');
  }
  try {
    const data = await readFile(file);
    const ext = extname(file).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
}

http.createServer((req, res) => {
  const path = req.url.split('?')[0];
  if (path === '/backend' || path.startsWith('/backend/')) return proxy(req, res);
  if (path === '/config.js') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(`window.ME_CONFIG = ${JSON.stringify({
      API_URL: process.env.API_URL || '/backend',
      CURRENCY
    })};`);
  }
  serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`M.E frontend  → http://localhost:${PORT}`);
  console.log(`API proxy     → /backend  ⇒  ${BACKEND_URL.origin}`);
});
