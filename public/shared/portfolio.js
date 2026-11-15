// Shared browser module: loads data/portfolio.json and provides helpers + a full-screen viewer.
const BASE = new URL('../', import.meta.url); // site root (works under any sub-path)

export async function loadPortfolio() {
  const res = await fetch(new URL('data/portfolio.json', BASE), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Nie udało się wczytać danych (${res.status}). Czy strona jest uruchomiona przez "npm start"?`);
  const data = await res.json();
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
export const nPhotos = (n) => `${n} ${plural(n, 'zdjęcie', 'zdjęcia', 'zdjęć')}`;
export const nSeries = (n) => `${n} ${plural(n, 'seria', 'serie', 'serii')}`;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(pointer: fine)').matches;

/** Small banner shown while the site runs on the bundled demo images. */
export function demoBanner(pf, el = document.body) {
  if (!pf.demo) return;
  const b = document.createElement('div');
  b.setAttribute('role', 'status');
  b.style.cssText = 'position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:95;background:#111;color:#f3f3f0;font:400 12px/1.4 ui-monospace,Menlo,monospace;padding:9px 14px;border-radius:99px;box-shadow:0 8px 30px rgba(0,0,0,.35);max-width:calc(100% - 32px);text-align:center';
  b.textContent = `Przykładowe grafiki. Wrzuć zdjęcia do folderu „${pf.photosDir || 'photos'}” i odśwież stronę.`;
  el.appendChild(b);
  setTimeout(() => { b.style.transition = 'opacity .6s'; b.style.opacity = '0'; setTimeout(() => b.remove(), 700); }, 9000);
}

/** Error message for when the data cannot be loaded. */
export function fatal(err) {
  document.body.innerHTML = `<div style="font:15px/1.6 system-ui,sans-serif;max-width:620px;margin:15vh auto;padding:0 20px;color:#222;background:#fff">
    <h1 style="font-size:22px">Strona nie mogła wczytać zdjęć</h1><p>${esc(err.message)}</p>
    <p>Uruchom serwer poleceniem <code>npm start</code> w folderze projektu i otwórz adres, który pokaże terminal.</p></div>`;
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
  v.setAttribute('aria-label', 'Podgląd zdjęcia');
  v.innerHTML = `<div class="pv-bar"><span class="pv-n"></span><div class="pv-nav"><button class="pv-p" aria-label="Poprzednie">←</button><button class="pv-x">Zamknij</button><button class="pv-nx" aria-label="Następne">→</button></div></div>
    <div class="pv-stage"><img class="pv-img" alt=""></div>
    <div class="pv-cap"><div><div class="pv-t"></div><div class="pv-m"></div></div><span class="pv-h">Kliknij, aby przybliżyć · ← → · Esc</span></div>`;
  document.body.appendChild(v);
  return v;
}
