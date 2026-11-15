// Resized copies of the photos, cached on disk. Without sharp the original file is used.
import { mkdir, stat, copyFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { sharp } from './scan.mjs';

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.tif': 'image/tiff', '.tiff': 'image/tiff' };

/** Returns { file, type } for a resized version (width w) of the photo at abs. */
export async function resized(abs, id, w, cacheDir) {
  if (!sharp) return { file: abs, type: MIME[extname(abs).toLowerCase()] || 'application/octet-stream' };
  const out = join(cacheDir, `${id}-${w}.jpg`);
  const src = await stat(abs);
  try {
    const dst = await stat(out);
    if (dst.mtimeMs >= src.mtimeMs) return { file: out, type: 'image/jpeg' };
  } catch { /* not cached yet */ }
  await mkdir(cacheDir, { recursive: true });
  await sharp(abs, { failOn: 'none' })
    .rotate()
    .resize({ width: w, height: w, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: w <= 480 ? 72 : 82, mozjpeg: true, progressive: true })
    .withMetadata({ orientation: undefined })
    .toFile(out);
  return { file: out, type: 'image/jpeg' };
}

/** Writes a resized copy to dest (used by the static build). */
export async function writeResized(abs, id, w, dest, cacheDir) {
  const r = await resized(abs, id, w, cacheDir);
  await copyFile(r.file, dest);
}
