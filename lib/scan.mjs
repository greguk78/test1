// Scans the photos folder and builds the portfolio data (series, photos, EXIF).
//
// Folder layout:
//   photos/<kategoria>/<seria>/*.jpg     e.g. photos/lotnictwo/radom-air-show-2026/DSC01234.jpg
//   photos/<seria>/*.jpg                 also works (no category)
// Optional photos/<…>/<seria>/seria.json: { "title", "place", "date", "description", "cover", "highlights": [], "order" }
import { readdir, stat, readFile } from 'node:fs/promises';
import { join, relative, extname, basename, sep } from 'node:path';
import { createHash } from 'node:crypto';
import exifr from 'exifr';
import { publicConfig } from './config.mjs';

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  sharp = null;
}
export { sharp };

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);
const SKIP_DIR = /^(\.|@|#recycle|lost\+found)/i; // hidden folders and NAS system folders (@eaDir, #recycle)

const CATEGORY_ALIASES = {
  lotnictwo: 'Lotnictwo', samoloty: 'Lotnictwo', aviation: 'Lotnictwo', air: 'Lotnictwo',
  motoryzacja: 'Motoryzacja', samochody: 'Motoryzacja', auta: 'Motoryzacja', cars: 'Motoryzacja', automotive: 'Motoryzacja',
};

const exifCache = new Map(); // abs path -> { mtimeMs, data }

export const SIZES = [480, 1200, 2400];

export function photoId(relPath) {
  return createHash('sha1').update(relPath.split(sep).join('/')).digest('hex').slice(0, 12);
}

export function prettify(name) {
  const clean = name.replace(/^\d+[-_. ]+/, '').replace(/[-_]+/g, ' ').trim();
  // A folder already written with capitals ("Radom Air Show 2026") keeps its own casing.
  if (/[A-ZĄĆĘŁŃÓŚŹŻ]/.test(clean)) return clean;
  return clean.split(/\s+/).map((w, i) => {
    if (/^ep[a-z]{2}$/.test(w)) return w.toUpperCase(); // Polish ICAO airport codes, e.g. EPWA
    return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  }).join(' ');
}

/** Polish plural: plural(5, 'zdjęcie', 'zdjęcia', 'zdjęć') -> 'zdjęć' */
export function plural(n, one, few, many) {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
}

function slugify(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'l')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'seria';
}

function fmtShutter(t) {
  if (!t) return null;
  if (t >= 1) return `${Math.round(t * 10) / 10} s`;
  return `1/${Math.round(1 / t)} s`;
}

async function readExif(abs, mtimeMs) {
  const hit = exifCache.get(abs);
  if (hit && hit.mtimeMs === mtimeMs) return hit.data;
  let e = {};
  try {
    e = (await exifr.parse(abs, {
      pick: ['ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'LensModel',
        'ImageDescription', 'ExifImageWidth', 'ExifImageHeight', 'ImageWidth', 'ImageHeight', 'Orientation', 'title', 'Title'],
      translateValues: false,
    })) || {};
  } catch {
    e = {};
  }
  let w = e.ExifImageWidth || e.ImageWidth || 0;
  let h = e.ExifImageHeight || e.ImageHeight || 0;
  if ((!w || !h) && sharp) {
    try {
      const m = await sharp(abs).metadata();
      w = m.width; h = m.height;
      if (!e.Orientation && m.orientation) e.Orientation = m.orientation;
    } catch { /* unreadable file */ }
  }
  if (e.Orientation >= 5 && e.Orientation <= 8) [w, h] = [h, w];
  const date = e.DateTimeOriginal || e.CreateDate || null;
  const exif = {
    shutter: fmtShutter(e.ExposureTime),
    aperture: e.FNumber ? `f/${Math.round(e.FNumber * 10) / 10}` : null,
    iso: e.ISO ? `ISO ${e.ISO}` : null,
    focal: e.FocalLength ? `${Math.round(e.FocalLength)} mm` : null,
    focalNum: e.FocalLength ? Math.round(e.FocalLength) : null,
    camera: [e.Make, e.Model].filter(Boolean).join(' ').replace(/^(\w+) \1/i, '$1') || null,
    lens: e.LensModel || null,
    date: date instanceof Date && !isNaN(date) ? date.toISOString() : null,
  };
  const title = (typeof e.title === 'string' && e.title) || (typeof e.Title === 'string' && e.Title)
    || (typeof e.ImageDescription === 'string' && e.ImageDescription.trim()) || null;
  const data = { w: w || 3, h: h || 2, exif, title };
  exifCache.set(abs, { mtimeMs, data });
  return data;
}

async function walk(dir, depth = 0, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  const files = [];
  for (const ent of entries) {
    if (SKIP_DIR.test(ent.name)) continue;
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) await walk(abs, depth + 1, out);
    else if (IMAGE_EXT.has(extname(ent.name).toLowerCase())) files.push(abs);
  }
  if (files.length) out.push({ dir, depth, files: files.sort((a, b) => a.localeCompare(b, 'pl', { numeric: true })) });
  return out;
}

/** Full scan. Returns the JSON-ready portfolio object plus an id -> absolute path map. */
export async function scanPhotos(cfg) {
  const root = cfg.photosDirAbs;
  const groups = await walk(root);
  const series = [];
  const photos = [];
  const paths = new Map();
  const usedSlugs = new Set();

  for (const g of groups) {
    const rel = relative(root, g.dir);
    const parts = rel ? rel.split(sep) : [];
    const folder = parts.length ? parts[parts.length - 1] : 'Wybrane';
    const catRaw = parts.length >= 2 ? parts[0] : '';
    const catLabel = catRaw ? (CATEGORY_ALIASES[catRaw.toLowerCase()] || prettify(catRaw)) : '';
    let meta = {};
    try {
      meta = JSON.parse(await readFile(join(g.dir, 'seria.json'), 'utf8'));
    } catch { /* optional */ }

    const title = meta.title || prettify(folder);
    let slug = slugify(meta.slug || title);
    while (usedSlugs.has(slug)) slug += '-2';
    usedSlugs.add(slug);

    const ids = [];
    let latest = null;
    for (const abs of g.files) {
      const st = await stat(abs);
      const relPath = relative(root, abs);
      const id = photoId(relPath);
      const info = await readExif(abs, st.mtimeMs);
      const ex = info.exif;
      photos.push({
        id,
        series: slug,
        file: basename(abs),
        title: info.title || title,
        w: info.w,
        h: info.h,
        exif: ex,
        exifLine: [ex.shutter, ex.aperture, ex.iso, ex.focal].filter(Boolean).join(' · '),
      });
      paths.set(id, abs);
      ids.push(id);
      if (ex.date && (!latest || ex.date > latest)) latest = ex.date;
    }

    const byFile = (name) => photos.find((p) => p.series === slug && p.file === name)?.id;
    const cover = (meta.cover && byFile(meta.cover)) || ids[0];
    let highlights = Array.isArray(meta.highlights) ? meta.highlights.map(byFile).filter(Boolean) : [];
    if (!highlights.length) highlights = [cover, ...ids.filter((i) => i !== cover)].slice(0, cfg.highlightsPerSeries);

    series.push({
      slug,
      title,
      category: catLabel,
      place: meta.place || '',
      date: meta.date || (latest ? latest.slice(0, 10) : ''),
      sortDate: meta.date || latest || '',
      description: meta.description || '',
      order: Number.isFinite(meta.order) ? meta.order : null,
      cover,
      highlights,
      photos: ids,
      count: ids.length,
    });
  }

  series.sort((a, b) => {
    if (a.order != null || b.order != null) return (a.order ?? 999) - (b.order ?? 999);
    return String(b.sortDate).localeCompare(String(a.sortDate)) || a.title.localeCompare(b.title, 'pl');
  });

  // Highlights interleaved across series, so one big shoot does not dominate.
  const highlights = [];
  for (let round = 0; highlights.length < cfg.maxHighlights; round++) {
    let added = false;
    for (const s of series) {
      if (s.highlights[round]) { highlights.push(s.highlights[round]); added = true; }
      if (highlights.length >= cfg.maxHighlights) break;
    }
    if (!added) break;
  }

  const categories = [...new Set(series.map((s) => s.category).filter(Boolean))]
    .map((label) => ({ label, count: series.filter((s) => s.category === label).length }));

  return {
    data: {
      generated: new Date().toISOString(),
      demo: false,
      photosDir: cfg.photosDir,
      resize: Boolean(sharp),
      config: publicConfig(cfg),
      sizes: SIZES,
      mediaPattern: 'media/{id}/{w}',
      categories,
      series: series.map(({ sortDate, ...s }) => s),
      photos,
      highlights,
    },
    paths,
  };
}

/** Demo data built from the bundled placeholder images, used until real photos exist. */
export function demoData(cfg) {
  const D = [
    ['contrail', 'Smuga nad Okęciem', 'Lotnictwo', 'Warszawa, EPWA', ['1/2000 s', 'f/8', 'ISO 100', '600 mm'], 16, 10],
    ['panning', 'Track day', 'Motoryzacja', 'Tor Poznań', ['1/30 s', 'f/16', 'ISO 50', '135 mm'], 16, 10],
    ['sunset', 'Radom Air Show', 'Lotnictwo', 'Radom-Sadków, EPRA', ['1/500 s', 'f/8', 'ISO 100', '600 mm'], 16, 10],
    ['night', 'Nocne operacje', 'Lotnictwo', 'Kraków-Balice, EPKK', ['25 s', 'f/9', 'ISO 64', '24 mm'], 16, 10],
    ['paint', 'Linia błotnika', 'Motoryzacja', 'Studio, Warszawa', ['1/125 s', 'f/11', 'ISO 100', '90 mm'], 16, 10],
    ['wet', 'Mokry tor', 'Motoryzacja', 'Silesia Ring', ['1/15 s', 'f/4', 'ISO 800', '50 mm'], 22, 29],
    ['skin', 'Poszycie', 'Lotnictwo', 'Muzeum Lotnictwa, Kraków', ['1/250 s', 'f/5.6', 'ISO 200', '85 mm'], 22, 29],
    ['bokeh', 'Pit lane o zmierzchu', 'Motoryzacja', 'Tor Poznań', ['1/200 s', 'f/1.8', 'ISO 1600', '85 mm'], 22, 29],
    ['clouds', 'Przed burzą', 'Lotnictwo', 'Góraszka', ['1/1000 s', 'f/7.1', 'ISO 200', '400 mm'], 16, 10],
  ];
  const photos = D.map(([f, t, , , e, w, h]) => ({
    id: `demo-${f}`, series: slugify(t), file: `${f}.jpg`, title: t, w, h, src: `shared/demo/${f}.jpg`,
    exif: { shutter: e[0], aperture: e[1], iso: e[2], focal: e[3], focalNum: parseInt(e[3], 10), camera: 'Przykład', lens: null, date: null },
    exifLine: e.join(' · '),
  }));
  const series = D.map(([f, t, c, p], i) => ({
    slug: slugify(t), title: t, category: c, place: p, date: i < 4 ? '2026' : '2025', description: '',
    cover: `demo-${f}`, highlights: [`demo-${f}`], photos: [`demo-${f}`], count: 1, order: i,
  }));
  return {
    generated: new Date().toISOString(),
    demo: true,
    photosDir: cfg.photosDir,
    resize: false,
    config: publicConfig(cfg),
    sizes: SIZES,
    mediaPattern: 'media/{id}/{w}',
    categories: [{ label: 'Lotnictwo', count: 5 }, { label: 'Motoryzacja', count: 4 }],
    series,
    photos,
    highlights: photos.map((p) => p.id),
  };
}
