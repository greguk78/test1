// Local server: serves the three sites, the portfolio data and resized photos.
//   npm start            -> live mode: reads photos straight from photosDir (local folder or NAS share)
//   npm run preview      -> serves the static build from dist/
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, normalize, extname, resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { ROOT, loadConfig } from './lib/config.mjs';
import { scanPhotos, demoData, SIZES, sharp, plural } from './lib/scan.mjs';
import { resized } from './lib/media.mjs';

const DIST = process.argv.includes('--dist');
const PUBLIC = resolve(ROOT, DIST ? 'dist' : 'public');
const CACHE = resolve(ROOT, '.cache', 'media');
const cfg = loadConfig();

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
};

// Rescan at most every few seconds, so new photos show up after a page refresh.
let cache = { at: 0, result: null, pending: null };
async function getData() {
  if (cache.result && Date.now() - cache.at < 4000) return cache.result;
  if (!cache.pending) {
    cache.pending = scanPhotos(cfg).then((r) => {
      if (!r.data.photos.length) r = { data: demoData(cfg), paths: new Map() };
      cache = { at: Date.now(), result: r, pending: null };
      return r;
    }).catch((err) => { cache.pending = null; throw err; });
  }
  return cache.pending;
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

async function sendFile(res, file, type, maxAge = 0) {
  const st = await stat(file);
  res.writeHead(200, {
    'Content-Type': type, 'Content-Length': st.size,
    'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-cache',
  });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);

    if (!DIST && path === '/data/portfolio.json') {
      const { data } = await getData();
      return send(res, 200, JSON.stringify(data), TYPES['.json']);
    }

    const m = !DIST && path.match(/^\/media\/([a-f0-9]{12})\/(\d+)$/);
    if (m) {
      const [, id, wStr] = m;
      const w = SIZES.includes(Number(wStr)) ? Number(wStr) : SIZES[1];
      const { paths } = await getData();
      const abs = paths.get(id);
      if (!abs) return send(res, 404, 'Nie ma takiego zdjęcia');
      const r = await resized(abs, id, w, CACHE);
      return sendFile(res, r.file, r.type, 3600);
    }

    // static files, with protection against ../ paths
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(PUBLIC, path));
    if (!file.startsWith(PUBLIC)) return send(res, 403, 'Brak dostępu');
    let st;
    try {
      st = await stat(file);
    } catch {
      return send(res, 404, 'Nie znaleziono');
    }
    if (st.isDirectory()) {
      res.writeHead(301, { Location: path + '/' });
      return res.end();
    }
    return sendFile(res, file, TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
  } catch (err) {
    console.error(err);
    send(res, 500, 'Błąd serwera: ' + err.message);
  }
});

server.listen(cfg.port, '0.0.0.0', async () => {
  const lan = Object.values(networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n.address);
  console.log(`\n  Portfolio działa${DIST ? ' (wersja zbudowana, dist/)' : ''}:`);
  console.log(`    http://localhost:${cfg.port}/`);
  lan.forEach((ip) => console.log(`    http://${ip}:${cfg.port}/   (inne urządzenia w tej samej sieci)`));
  if (!DIST) {
    console.log(`\n  Folder ze zdjęciami: ${cfg.photosDirAbs}`);
    if (!sharp) console.log('  Uwaga: brak biblioteki sharp, zdjęcia nie będą zmniejszane (wolniejsze ładowanie).');
    try {
      const { data } = await getData();
      console.log(data.demo
        ? '  Nie znaleziono zdjęć, strony pokazują przykładowe grafiki. Wrzuć zdjęcia do folderu i odśwież stronę.'
        : `  Znaleziono ${data.photos.length} ${plural(data.photos.length, 'zdjęcie', 'zdjęcia', 'zdjęć')} (serie: ${data.series.length}).`);
    } catch (err) {
      console.log('  Nie udało się odczytać folderu ze zdjęciami: ' + err.message);
    }
  }
  console.log('');
});
