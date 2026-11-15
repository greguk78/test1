import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULTS = {
  name: 'Twoje Imię',
  wordmark: '',
  tagline: 'Fotografia lotnicza i motoryzacyjna',
  city: '',
  since: '',
  about: '',
  email: '',
  instagram: '',
  gear: '',
  flyHeadline: 'Wszystko, co lata i jedzie.',
  photosDir: './photos',
  port: 4321,
  highlightsPerSeries: 3,
  maxHighlights: 18,
};

/** Reads portfolio.config.json. Env vars PHOTOS_DIR and PORT override the file. */
export function loadConfig() {
  const file = resolve(ROOT, 'portfolio.config.json');
  let user = {};
  if (existsSync(file)) {
    try {
      user = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      console.error(`Błąd w portfolio.config.json: ${err.message}`);
    }
  }
  const cfg = { ...DEFAULTS, ...user };
  if (process.env.PHOTOS_DIR) cfg.photosDir = process.env.PHOTOS_DIR;
  if (process.env.PORT) cfg.port = Number(process.env.PORT);
  cfg.photosDirAbs = isAbsolute(cfg.photosDir) ? cfg.photosDir : resolve(ROOT, cfg.photosDir);
  if (!cfg.wordmark) cfg.wordmark = String(cfg.name).trim().split(/\s+/).pop().toUpperCase();
  return cfg;
}

/** The subset of the config that is safe to send to the browser. */
export function publicConfig(cfg) {
  const keys = ['name', 'wordmark', 'tagline', 'city', 'since', 'about', 'email', 'instagram', 'gear', 'flyHeadline'];
  return Object.fromEntries(keys.map((k) => [k, cfg[k]]));
}
