// Static export: dist/ holds the sites, data/portfolio.json and resized photos.
// Copy dist/ to any web server (nginx on Ubuntu, a NAS web share, …). No Node needed there.
import { rm, mkdir, cp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { ROOT, loadConfig } from '../lib/config.mjs';
import { scanPhotos, demoData, SIZES, sharp } from '../lib/scan.mjs';
import { writeResized } from '../lib/media.mjs';

const cfg = loadConfig();
const DIST = resolve(ROOT, 'dist');
const CACHE = resolve(ROOT, '.cache', 'media');

console.log(`Skanuję ${cfg.photosDirAbs} …`);
let { data, paths } = await scanPhotos(cfg);
if (!data.photos.length) {
  console.log('Nie znaleziono zdjęć, buduję wersję z przykładowymi grafikami.');
  data = demoData(cfg);
}

await rm(DIST, { recursive: true, force: true });
await cp(resolve(ROOT, 'public'), DIST, { recursive: true });
await mkdir(join(DIST, 'media'), { recursive: true });
await mkdir(join(DIST, 'data'), { recursive: true });

if (!data.demo) {
  if (!sharp) console.log('Uwaga: brak biblioteki sharp, kopiuję oryginały bez zmniejszania.');
  let n = 0;
  for (const p of data.photos) {
    for (const w of SIZES) await writeResized(paths.get(p.id), p.id, w, join(DIST, 'media', `${p.id}-${w}.jpg`), CACHE);
    n++;
    process.stdout.write(`\r  Zdjęcia: ${n}/${data.photos.length}`);
  }
  process.stdout.write('\n');
}
data.mediaPattern = 'media/{id}-{w}.jpg';
delete data.photosDir; // do not publish local/NAS paths
await writeFile(join(DIST, 'data', 'portfolio.json'), JSON.stringify(data));
console.log(`Gotowe: ${DIST}  (zdjęcia: ${data.photos.length}, serie: ${data.series.length})`);
console.log('Podgląd: npm run preview');
