// Shared browser module: language (PL/EN), data loading, helpers and a full-screen viewer.
const BASE = new URL('../', import.meta.url); // site root (works under any sub-path)

/* ---------------- language ---------------- */
export const LANGS = ['pl', 'en'];
function detectLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) return q;
  try { const s = localStorage.getItem('portfolio-lang'); if (LANGS.includes(s)) return s; } catch { /* storage blocked */ }
  return (navigator.languages || [navigator.language || 'pl']).some((l) => /^pl\b/i.test(l)) ? 'pl' : 'en';
}
export const LANG = detectLang();
document.documentElement.lang = LANG;

export function setLang(l) {
  if (!LANGS.includes(l) || l === LANG) return;
  try { localStorage.setItem('portfolio-lang', l); } catch { /* storage blocked */ }
  const u = new URL(location.href);
  u.searchParams.set('lang', l);
  location.replace(u.href);
}

const DICT = {
  pl: {
    'err.load': 'Nie udało się wczytać danych ({status}). Czy strona jest uruchomiona przez „npm start”?',
    'fatal.title': 'Strona nie mogła wczytać zdjęć',
    'fatal.run': 'Uruchom serwer poleceniem <code>npm start</code> w folderze projektu i otwórz adres, który pokaże terminal.',
    'demo.banner': 'Przykładowe grafiki. Wrzuć zdjęcia do folderu „{dir}” i odśwież stronę.',
    'viewer.label': 'Podgląd zdjęcia', 'viewer.close': 'Zamknij', 'viewer.prev': 'Poprzednie', 'viewer.next': 'Następne',
    'viewer.hint': 'Kliknij, aby przybliżyć · ← → · Esc',
    'lang.label': 'Język',
    'open.photo': 'Otwórz zdjęcie {t}',
    'nav.shots': 'Kadry', 'nav.series': 'Serie', 'nav.contact': 'Kontakt',
    'all': 'Wszystko', 'filter.cat': 'Filtr kategorii', 'since': 'od {y}',
    'c.email': 'E-mail', 'c.instagram': 'Instagram', 'c.base': 'Baza', 'c.gear': 'Sprzęt',
    'portfolio.year': 'Portfolio {y}',
    'k.selected': 'Wybrane kadry', 'k.write': 'Napisz →', 'k.statSeries': 'Serie', 'k.statPhotos': 'Zdjęcia w portfolio',
    'k.statFocal': 'mm najdłuższa ogniskowa', 'k.statCats': 'Kategorie', 'k.gallery': 'Wybrane kadry',
    'f.altitude': 'Wysokość', 'f.frame': 'Kadr', 'f.hint': 'Przewiń, aby wystartować ↓', 'f.landing': 'Lądowanie.',
    'v.stage': 'Wizjer aparatu. Kliknij lub naciśnij spację, aby przejść do następnego zdjęcia. Strzałki zmieniają zdjęcie.',
    'v.hintMouse': 'Prowadź ostrość kursorem · kliknij, aby zrobić zdjęcie',
    'v.hintTouch': 'Stuknij, aby zrobić zdjęcie · przesuń palcem, aby zmienić kadr',
    'v.back': '← Wybrane', 'v.full': 'Pełny kadr', 'v.zoom': 'Powiększ', 'v.soundOn': 'Dźwięk: wł.', 'v.soundOff': 'Dźwięk: wył.',
    'v.highlights': 'Wybrane', 'v.noexif': 'brak EXIF', 'v.seriesHint': 'Najedź, aby wyostrzyć · kliknij, aby oglądać w wizjerze',
    'home.title': 'Portfolio · wybór wersji',
    'home.lead': 'Trzy wersje tej samej strony, zasilane tymi samymi zdjęciami. Wybierz wersję, żeby zobaczyć ją na swoich kadrach.',
    'home.loading': 'Wczytuję dane…', 'home.open': 'Otwórz →',
    'home.kinetic': 'Odważna typografia, która rozciąga się pod kursorem, i galeria jadąca w poziomie.',
    'home.fly': 'Przewijanie to lot przez zdjęcia zawieszone w przestrzeni 3D.',
    'home.focus': 'Strona działa jak aparat: ostrość podąża za kursorem, kliknięcie robi zdjęcie.',
    'home.found': '<b>{photos}</b> ({series})', 'home.fromDir': ' z folderu <code>{dir}</code>', 'home.noSharp': ' (bez zmniejszania: brak biblioteki sharp)',
    'home.none': '<b>Brak zdjęć</b>', 'home.inDir': ' w folderze <code>{dir}</code>', 'home.demo': '. Strony pokazują przykładowe grafiki.',
    'home.h1': '1. Ułóż zdjęcia w folderach', 'home.p1': 'Kategoria, potem seria. Nazwa folderu serii staje się jej tytułem.',
    'home.h2': '2. Albo wskaż folder na NAS', 'home.p2': 'W pliku <code>portfolio.config.json</code> ustaw <code>photosDir</code> na zamontowany udział, np.:',
    'home.h3': '3. Odśwież stronę', 'home.p3': 'Serwer sam czyta nowe zdjęcia, ich dane EXIF i robi zmniejszone wersje. Szczegóły są w pliku README.md.',
  },
  en: {
    'err.load': 'Could not load the data ({status}). Is the site running with “npm start”?',
    'fatal.title': 'The site could not load the photos',
    'fatal.run': 'Start the server with <code>npm start</code> in the project folder and open the address shown in the terminal.',
    'demo.banner': 'Sample images. Add your photos to the “{dir}” folder and refresh the page.',
    'viewer.label': 'Photo viewer', 'viewer.close': 'Close', 'viewer.prev': 'Previous', 'viewer.next': 'Next',
    'viewer.hint': 'Click to zoom · ← → · Esc',
    'lang.label': 'Language',
    'open.photo': 'Open photo {t}',
    'nav.shots': 'Shots', 'nav.series': 'Series', 'nav.contact': 'Contact',
    'all': 'All', 'filter.cat': 'Category filter', 'since': 'since {y}',
    'c.email': 'Email', 'c.instagram': 'Instagram', 'c.base': 'Based in', 'c.gear': 'Gear',
    'portfolio.year': 'Portfolio {y}',
    'k.selected': 'Selected shots', 'k.write': 'Get in touch →', 'k.statSeries': 'Series', 'k.statPhotos': 'Photos in the portfolio',
    'k.statFocal': 'mm longest focal length', 'k.statCats': 'Categories', 'k.gallery': 'Selected shots',
    'f.altitude': 'Altitude', 'f.frame': 'Frame', 'f.hint': 'Scroll to take off ↓', 'f.landing': 'Landing.',
    'v.stage': 'Camera viewfinder. Click or press space to go to the next photo. Arrow keys change the photo.',
    'v.hintMouse': 'Move the focus with your cursor · click to take the shot',
    'v.hintTouch': 'Tap to take the shot · swipe to change the frame',
    'v.back': '← Highlights', 'v.full': 'Full frame', 'v.zoom': 'Enlarge', 'v.soundOn': 'Sound: on', 'v.soundOff': 'Sound: off',
    'v.highlights': 'Highlights', 'v.noexif': 'no EXIF', 'v.seriesHint': 'Hover to focus · click to view in the viewfinder',
    'home.title': 'Portfolio · choose a version',
    'home.lead': 'Three versions of the same site, fed by the same photos. Pick a version to see it with your own shots.',
    'home.loading': 'Loading data…', 'home.open': 'Open →',
    'home.kinetic': 'Bold type that stretches under your cursor, and a gallery that slides sideways.',
    'home.fly': 'Scrolling becomes a flight through photos floating in 3D space.',
    'home.focus': 'The site works like a camera: focus follows your cursor and a click takes the shot.',
    'home.found': '<b>{photos}</b> ({series})', 'home.fromDir': ' from <code>{dir}</code>', 'home.noSharp': ' (not resized: the sharp library is missing)',
    'home.none': '<b>No photos found</b>', 'home.inDir': ' in <code>{dir}</code>', 'home.demo': '. The sites show sample images.',
    'home.h1': '1. Sort your photos into folders', 'home.p1': 'Category first, then series. The series folder name becomes its title.',
    'home.h2': '2. Or point to a folder on your NAS', 'home.p2': 'In <code>portfolio.config.json</code> set <code>photosDir</code> to the mounted share, e.g.:',
    'home.h3': '3. Refresh the page', 'home.p3': 'The server reads new photos and their EXIF data and makes smaller copies. Details are in README.md.',
  },
};

/** UI string for the current language. t('since', { y: 2022 }) */
export function t(key, vars = {}) {
  const s = DICT[LANG][key] ?? DICT.pl[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

/** Content value that may be written in both languages: "text" or { "pl": "…", "en": "…" }. */
export function tr(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v[LANG] ?? v.pl ?? v.en ?? Object.values(v)[0] ?? '';
  return v ?? '';
}

function localize(data) {
  const L = (o, keys) => { keys.forEach((k) => { if (k in o) o[k] = tr(o[k]); }); return o; };
  L(data.config, Object.keys(data.config));
  data.series.forEach((s) => L(s, ['title', 'place', 'description', 'category']));
  data.photos.forEach((p) => L(p, ['title']));
  data.categories.forEach((c) => L(c, ['label']));
  return data;
}

/** Fills elements marked with data-i18n (text), data-i18n-html, data-i18n-aria and data-i18n-title. */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

/** PL / EN switch. Put an empty element with class "lang-switch" in the page. */
export function langSwitch(root = document) {
  root.querySelectorAll('.lang-switch').forEach((el) => {
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', t('lang.label'));
    el.innerHTML = LANGS.map((l) => `<button type="button" lang="${l}" aria-pressed="${l === LANG}">${l.toUpperCase()}</button>`).join('<span aria-hidden="true">/</span>');
    el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setLang(b.lang); });
  });
}

const lsCss = document.createElement('style');
lsCss.textContent = '.lang-switch{display:inline-flex;gap:6px;align-items:center}.lang-switch button{font:inherit;color:inherit;background:none;border:0;padding:2px 0;cursor:pointer;opacity:.5;letter-spacing:inherit;text-transform:inherit}.lang-switch button[aria-pressed="true"]{opacity:1;text-decoration:underline;text-underline-offset:4px}.lang-switch button:hover{opacity:1}.lang-switch span{opacity:.35}';
document.head.appendChild(lsCss);

/* ---------------- data ---------------- */
export async function loadPortfolio() {
  applyI18n();
  langSwitch();
  const res = await fetch(new URL('data/portfolio.json', BASE), { cache: 'no-store' });
  if (!res.ok) throw new Error(t('err.load', { status: res.status }));
  const data = localize(await res.json());
  const byId = new Map(data.photos.map((p) => [p.id, p]));
  const bySlug = new Map(data.series.map((s) => [s.slug, s]));
  const img = (p, w = 1200) => {
    if (p.src) return new URL(p.src, BASE).href;
    const size = data.sizes.reduce((best, s) => (s >= w && (best < w || s < best) ? s : best), data.sizes[data.sizes.length - 1]);
    return new URL(data.mediaPattern.replace('{id}', p.id).replace('{w}', size), BASE).href;
  };
  const photo = (id) => byId.get(id);
  const series = (slug) => bySlug.get(slug);
  const seriesOf = (p) => bySlug.get(p.series);
  const ratio = (p) => (p.w && p.h ? p.w / p.h : 1.5);
  const highlights = data.highlights.map(photo).filter(Boolean);
  return { ...data, img, photo, series: data.series, seriesBySlug: series, seriesOf, ratio, highlightPhotos: highlights, base: BASE.href };
}

export const p2 = (n) => String(n).padStart(2, '0');
export function plural(n, one, few, many) {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
}
export const nPhotos = (n) => (LANG === 'en' ? `${n} ${n === 1 ? 'photo' : 'photos'}` : `${n} ${plural(n, 'zdjęcie', 'zdjęcia', 'zdjęć')}`);
export const nSeries = (n) => (LANG === 'en' ? `${n} series` : `${n} ${plural(n, 'seria', 'serie', 'serii')}`);
export const nShort = (n) => (LANG === 'en' ? `${n} ph.` : `${n} zdj.`);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(pointer: fine)').matches;

/** Small banner shown while the site runs on the bundled demo images. */
export function demoBanner(pf, el = document.body) {
  if (!pf.demo) return;
  const b = document.createElement('div');
  b.setAttribute('role', 'status');
  b.style.cssText = 'position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:95;background:#111;color:#f3f3f0;font:400 12px/1.4 ui-monospace,Menlo,monospace;padding:9px 14px;border-radius:99px;box-shadow:0 8px 30px rgba(0,0,0,.35);max-width:calc(100% - 32px);text-align:center';
  b.textContent = t('demo.banner', { dir: pf.photosDir || 'photos' });
  el.appendChild(b);
  setTimeout(() => { b.style.transition = 'opacity .6s'; b.style.opacity = '0'; setTimeout(() => b.remove(), 700); }, 9000);
}

/** Error message for when the data cannot be loaded. */
export function fatal(err) {
  document.body.innerHTML = `<div style="font:15px/1.6 system-ui,sans-serif;max-width:620px;margin:15vh auto;padding:0 20px;color:#222;background:#fff">
    <h1 style="font-size:22px">${t('fatal.title')}</h1><p>${esc(err.message)}</p><p>${t('fatal.run')}</p></div>`;
  document.body.style.background = '#fff';
}

/* ---------------- full-screen viewer ---------------- */
let viewerEl = null;
export function openViewer(pf, list, start = 0, opts = {}) {
  if (!list.length) return;
  if (!viewerEl) viewerEl = buildViewer();
  const v = viewerEl;
  let i = start;
  const last = document.activeElement;
  const img = v.querySelector('.pv-img');
  const show = (n, anim) => {
    i = (n + list.length) % list.length;
    const p = list[i];
    const s = pf.seriesOf(p);
    const set = () => {
      img.classList.remove('zoom');
      img.src = pf.img(p, 2400);
      img.alt = p.title;
      v.querySelector('.pv-n').textContent = `${p2(i + 1)} / ${p2(list.length)}`;
      v.querySelector('.pv-t').textContent = p.title;
      v.querySelector('.pv-m').textContent = [s?.place, p.exifLine, p.exif?.camera].filter(Boolean).join(' · ');
      img.classList.remove('swap');
    };
    if (anim) { img.classList.add('swap'); setTimeout(set, 200); } else set();
    // preload neighbours
    [1, -1].forEach((d) => { const q = list[(i + d + list.length) % list.length]; new Image().src = pf.img(q, 2400); });
  };
  const close = () => {
    v.classList.remove('open');
    document.removeEventListener('keydown', key);
    document.documentElement.style.overflow = '';
    setTimeout(() => { v.hidden = true; }, 350);
    if (last) last.focus?.();
    opts.onClose?.();
  };
  const key = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(i + 1, true);
    if (e.key === 'ArrowLeft') show(i - 1, true);
  };
  v.querySelector('.pv-x').onclick = close;
  v.querySelector('.pv-p').onclick = () => show(i - 1, true);
  v.querySelector('.pv-nx').onclick = () => show(i + 1, true);
  v.querySelector('.pv-stage').onclick = (e) => { if (e.target.classList.contains('pv-stage')) close(); };
  img.onclick = (e) => {
    const r = img.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    img.classList.toggle('zoom');
  };
  img.onpointermove = (e) => {
    if (!img.classList.contains('zoom')) return;
    const r = img.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  };
  let sx = null;
  v.ontouchstart = (e) => { sx = e.touches[0].clientX; };
  v.ontouchend = (e) => {
    if (sx == null || img.classList.contains('zoom')) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1), true);
    sx = null;
  };
  document.addEventListener('keydown', key);
  document.documentElement.style.overflow = 'hidden';
  show(i, false);
  v.hidden = false;
  requestAnimationFrame(() => v.classList.add('open'));
  v.querySelector('.pv-x').focus();
}

function buildViewer() {
  const css = document.createElement('style');
  css.textContent = `
  .pv{position:fixed;inset:0;z-index:90;background:rgba(8,8,9,.97);color:#f2f2ef;display:grid;grid-template-rows:auto 1fr auto;opacity:0;transition:opacity .35s;font-family:var(--pv-font,system-ui,sans-serif)}
  .pv.open{opacity:1}
  .pv-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:calc(16px + env(safe-area-inset-top,0px)) max(18px,env(safe-area-inset-right,0px)) 14px max(18px,env(safe-area-inset-left,0px));font:400 12px ui-monospace,Menlo,monospace;letter-spacing:.06em}
  .pv-nav{display:flex;gap:8px}
  .pv button{font:inherit;color:inherit;background:none;border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:6px 14px;cursor:pointer}
  .pv button:hover{border-color:#fff}
  .pv button:focus-visible{outline:2px solid #6aa0ff;outline-offset:2px}
  .pv-stage{position:relative;overflow:hidden;display:grid;place-items:center;padding:0 max(18px,env(safe-area-inset-left,0px))}
  .pv-img{max-width:100%;max-height:100%;object-fit:contain;transition:transform .45s cubic-bezier(.2,.7,.2,1),opacity .2s;cursor:zoom-in}
  .pv-img.zoom{transform:scale(2.2);cursor:zoom-out}
  .pv-img.swap{opacity:0}
  .pv-cap{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;padding:14px max(18px,env(safe-area-inset-right,0px)) calc(18px + env(safe-area-inset-bottom,0px)) max(18px,env(safe-area-inset-left,0px))}
  .pv-t{font-size:17px;font-weight:500}
  .pv-m{font:400 12px ui-monospace,Menlo,monospace;color:rgba(242,242,239,.6);margin-top:4px}
  .pv-h{font:400 11px ui-monospace,Menlo,monospace;color:rgba(242,242,239,.45)}
  @media (prefers-reduced-motion:reduce){.pv,.pv-img{transition:none}}`;
  document.head.appendChild(css);
  const v = document.createElement('div');
  v.className = 'pv';
  v.hidden = true;
  v.setAttribute('role', 'dialog');
  v.setAttribute('aria-modal', 'true');
  v.setAttribute('aria-label', t('viewer.label'));
  v.innerHTML = `<div class="pv-bar"><span class="pv-n"></span><div class="pv-nav"><button class="pv-p" aria-label="${t('viewer.prev')}">←</button><button class="pv-x">${t('viewer.close')}</button><button class="pv-nx" aria-label="${t('viewer.next')}">→</button></div></div>
    <div class="pv-stage"><img class="pv-img" alt=""></div>
    <div class="pv-cap"><div><div class="pv-t"></div><div class="pv-m"></div></div><span class="pv-h">${t('viewer.hint')}</span></div>`;
  document.body.appendChild(v);
  return v;
}
