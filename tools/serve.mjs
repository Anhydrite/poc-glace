#!/usr/bin/env node
/**
 * Serveur statique de developpement / test.
 *
 * - Sert le depot a la racine (utile pour /render/index.html et /dist/*).
 * - Supporte les requetes HTTP Range : indispensable pour que le navigateur
 *   puisse "seeker" dans les fichiers MP4 (scrub video au scroll).
 * - Aucune dependance externe.
 *
 * Usage: node tools/serve.mjs [--port 4321] [--root .]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');

const argv = process.argv.slice(2);
function argValue(flag, fallback) {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

const PORT = Number(argValue('--port', process.env.PORT || 4321));
const ROOT = path.resolve(PROJECT_ROOT, argValue('--root', '.'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const joined = path.normalize(path.join(root, decoded));
  if (!joined.startsWith(root)) return null;
  return joined;
}

export function createServer({ root = ROOT } = {}) {
  return http.createServer((req, res) => {
    const urlPath = req.url === '/' ? '/index.html' : req.url;
    let filePath = safeJoin(root, urlPath);

    if (!filePath) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err || stat.isDirectory()) {
        const asIndex = path.join(filePath, 'index.html');
        if (!err && stat.isDirectory() && fs.existsSync(asIndex)) {
          filePath = asIndex;
          stat = fs.statSync(asIndex);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found: ' + urlPath);
          return;
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      const total = stat.size;
      const range = req.headers.range;

      const baseHeaders = {
        'Content-Type': type,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      };

      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
        if (!m) {
          res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${total}` }).end();
          return;
        }
        let start = m[1] === '' ? total - Number(m[2]) : Number(m[1]);
        let end = m[2] === '' ? total - 1 : Number(m[2]);
        start = Math.max(0, Math.min(start, total - 1));
        end = Math.max(start, Math.min(end, total - 1));
        const chunkSize = end - start + 1;
        res.writeHead(206, {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Content-Length': String(chunkSize),
        });
        if (req.method === 'HEAD') return res.end();
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }

      res.writeHead(200, { ...baseHeaders, 'Content-Length': String(total) });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(filePath).pipe(res);
    });
  });
}

export async function startServer({ port = PORT, root = ROOT } = {}) {
  const server = createServer({ root });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const actualPort = server.address().port;
  return { server, port: actualPort, url: `http://127.0.0.1:${actualPort}` };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { url } = await startServer({ port: PORT, root: ROOT });
  console.log(`[serve] http://127.0.0.1:${PORT}  root=${ROOT}`);
  console.log(`[serve] site      -> ${url}/dist/index.html`);
  console.log(`[serve] harness   -> ${url}/render/index.html`);
}
