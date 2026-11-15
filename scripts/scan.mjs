// Prints what the scanner finds in the photos folder. Handy for checking folder names and EXIF.
import { loadConfig } from '../lib/config.mjs';
import { scanPhotos, plural } from '../lib/scan.mjs';

const cfg = loadConfig();
const { data } = await scanPhotos(cfg);
console.log(`Folder: ${cfg.photosDirAbs}`);
if (!data.photos.length) {
  console.log('Brak zdjęć. Ułóż je tak: photos/<kategoria>/<seria>/zdjecie.jpg');
  process.exit(0);
}
for (const s of data.series) {
  console.log(`\n■ ${s.title}  [${s.category || 'bez kategorii'}]  ${s.count} zdj.  ${s.place} ${s.date}`);
  for (const id of s.photos) {
    const p = data.photos.find((x) => x.id === id);
    console.log(`   ${p.file.padEnd(28)} ${p.w}×${p.h}  ${p.exifLine || '(brak EXIF)'}`);
  }
}
const n = data.photos.length, s = data.series.length;
console.log(`\nRazem: ${n} ${plural(n, 'zdjęcie', 'zdjęcia', 'zdjęć')}, ${s} ${plural(s, 'seria', 'serie', 'serii')}, wyróżnionych: ${data.highlights.length}`);
