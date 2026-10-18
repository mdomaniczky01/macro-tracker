import { S, targets, dayTotals, eTot, findEntry } from './store.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const n0 = (x) => Math.round(x);
export const n1 = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export const COL = { k: '#6E1F2E', p: '#7A2233', c: '#D3AE7E', f: '#8F6B50', veg: '#8B9A69' };
export const MLABEL = { k: 'Calorías', p: 'Proteína', c: 'Hidratos', f: 'Grasas' };
export const MUNIT = { k: 'kcal', p: 'g', c: 'g', f: 'g' };

// categoría de alimento → grupo del plato
export function plateGroup(food) {
  if (['prot', 'supl', 'lacteo'].includes(food.cat)) return 'prot';
  if (['carb', 'snack'].includes(food.cat)) return 'carb';
  if (['veg', 'libre'].includes(food.cat)) return 'veg';
  return 'fat';
}
export const GROUP_COL = { prot: '#7A2233', carb: '#D3AE7E', veg: '#8B9A69', fat: '#A8805F' };
export const GROUP_NAME = { prot: 'Proteína', carb: 'Hidrato', veg: 'Verdura', fat: 'Extras' };
// sombras alternadas dentro del mismo grupo para distinguir ingredientes
export function shade(hex, i) {
  const f = [1, 0.82, 1.14, 0.7, 1.26][i % 5];
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => clamp(Math.round(v * f), 0, 255);
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const ICON = {
  hoy: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3.5"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  recetas: '<svg viewBox="0 0 24 24"><path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/></svg>',
  plato: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/></svg>',
  progreso: '<svg viewBox="0 0 24 24"><path d="M4 4v16h16"/><path d="M8 15l3.5-4.5 3 2.5L19 7"/></svg>',
  ajustes: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.3-2h6l1.3 2h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.4"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
};

// ---------------- animaciones de barras / anillos / números ----------------
const lastW = {};
const lastN = {};
export function applyAnim(root = document) {
  $$('[data-bar]', root).forEach((el) => {
    const key = el.dataset.key || '';
    const to = parseFloat(el.dataset.bar);
    const from = key in lastW ? lastW[key] : 0;
    el.style.width = from + '%';
    void el.offsetWidth;
    requestAnimationFrame(() => { el.style.width = to + '%'; });
    lastW[key] = to;
  });
  $$('[data-ring]', root).forEach((el) => {
    const key = el.dataset.key || 'ring';
    const to = clamp(parseFloat(el.dataset.ring), 0, 100);
    const from = key in lastW ? lastW[key] : 0;
    const C = 2 * Math.PI * parseFloat(el.getAttribute('r'));
    el.style.strokeDasharray = C;
    el.style.strokeDashoffset = C * (1 - from / 100);
    void el.getBoundingClientRect();
    requestAnimationFrame(() => { el.style.strokeDashoffset = C * (1 - to / 100); });
    lastW[key] = to;
  });
  $$('[data-num]', root).forEach((el) => {
    const key = el.dataset.key || el.dataset.num;
    const to = parseFloat(el.dataset.num);
    const from = key in lastN ? lastN[key] : 0;
    lastN[key] = to;
    countTo(el, from, to);
  });
  $$('[data-scale]', root).forEach((el) => {
    const key = el.dataset.key || 'scale';
    const to = clamp(parseFloat(el.dataset.scale), 0, 1);
    const from = key in lastW ? lastW[key] : 0;
    el.style.transform = `scaleY(${from})`;
    void el.getBoundingClientRect();
    requestAnimationFrame(() => { el.style.transform = `scaleY(${to})`; });
    lastW[key] = to;
  });
  $$('input[type=range]', root).forEach(fillRange);
}
export function countTo(el, from, to, ms = 550) {
  const token = (el._cnt = (el._cnt || 0) + 1);
  if (from === to) { el.textContent = n0(to); return; }
  const t0 = performance.now();
  const step = (t) => {
    if (el._cnt !== token) return;
    const k = clamp((t - t0) / ms, 0, 1);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = n0(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
export function fillRange(el) {
  const min = parseFloat(el.min || 0), max = parseFloat(el.max || 100), v = parseFloat(el.value);
  el.style.setProperty('--fill', ((v - min) / (max - min || 1)) * 100 + '%');
}

// ---------------- barras de impacto en vivo ----------------
export function impactHTML(withAfter = true) {
  const rows = ['k', 'p', 'c', 'f'].map((m) => `
    <div class="irow" data-m="${m}">
      <div class="ihead"><span class="l"><i class="d" style="background:${COL[m]}"></i>${MLABEL[m]}</span><span class="v"></span></div>
      <div class="track tall"><i class="eaten"></i><i class="plate"></i><i class="mark" style="opacity:0"></i></div>
    </div>`).join('');
  return `<div class="impact">${rows}${withAfter ? '<div class="after"></div>' : ''}</div>`;
}

// Pinta las barras: consumido (sólido) + lo que estás armando (rayado) contra el objetivo.
// add = macros del plato/porción; date = día; excludeId = entrada del diario que se está editando.
export function setImpact(root, add, date, excludeId = null) {
  const t = targets();
  const d = { ...dayTotals(date) };
  if (excludeId) {
    const e = findEntry(date, excludeId);
    if (e) { const x = eTot(e); for (const m of ['k', 'p', 'c', 'f']) d[m] -= x[m]; }
  }
  const rest = {};
  for (const m of ['k', 'p', 'c', 'f']) {
    const row = $(`.irow[data-m="${m}"]`, root);
    if (!row) continue;
    const eaten = d[m], a = add[m] || 0, total = eaten + a, tgt = t[m];
    const scale = Math.max(tgt, total, 1);
    const [iE, iP, iM] = $$('.track i', row);
    iE.style.left = '0%'; iE.style.width = (eaten / scale) * 100 + '%';
    iP.style.left = (eaten / scale) * 100 + '%'; iP.style.width = (a / scale) * 100 + '%';
    const over = total > tgt * 1.001;
    iM.style.left = (tgt / scale) * 100 + '%';
    iM.style.opacity = over ? '1' : '0';
    row.classList.toggle('over', over && m !== 'p');
    $('.v', row).innerHTML = `<b>${n0(total)}</b> / ${n0(tgt)} ${MUNIT[m]}` + (a > 0.5 ? ` <span class="plus">+${n0(a)}</span>` : '');
    rest[m] = tgt - total;
  }
  const after = $('.after', root);
  if (after) {
    const f = (m, lab, u) => `<span class="${rest[m] < 0 ? 'neg' : ''}">${lab} <b>${rest[m] < 0 ? '+' + n0(-rest[m]) + ' de más' : n0(rest[m])}${rest[m] < 0 ? '' : ' ' + u}</b></span>`;
    after.innerHTML = `<span style="width:100%">Después te quedan${targets().isSet ? '' : ' <i>(objetivo de referencia)</i>'}:</span>${f('k', 'Cal', 'kcal')}${f('p', 'P', 'g')}${f('c', 'C', 'g')}${f('f', 'G', 'g')}`;
  }
  return rest;
}

// ---------------- barra de reparto de energía ----------------
export function splitHTML(m) {
  const p = m.p * 4, c = m.c * 4, f = m.f * 9, tot = p + c + f || 1;
  return `<div class="split"><i style="width:${(p / tot) * 100}%;background:${COL.p}"></i><i style="width:${(c / tot) * 100}%;background:${COL.c}"></i><i style="width:${(f / tot) * 100}%;background:${COL.f}"></i></div>`;
}
export function macsHTML(m) {
  return `<div class="macs"><span><i class="dot" style="background:${COL.p}"></i><b>${n0(m.p)}</b> P</span><span><i class="dot" style="background:${COL.c}"></i><b>${n0(m.c)}</b> C</span><span><i class="dot" style="background:${COL.f}"></i><b>${n0(m.f)}</b> G</span></div>`;
}

// ---------------- toast ----------------
let toastT;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 1900);
}

// ---------------- sheets ----------------
let onCloseCb = null;
export function openSheet({ title = '', body = '', foot = '', onMount, onClose, headRight = '' }) {
  const root = $('#sheet-root');
  closeSheet(true);
  onCloseCb = onClose || null;
  root.innerHTML = `<div class="scrim" data-act="sheet-close"></div>
    <div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>
      <div class="sh-head"><h2>${title}</h2>${headRight || '<button class="x" data-act="sheet-close" aria-label="Cerrar">✕</button>'}</div>
      <div class="sh-body">${body}</div>${foot ? `<div class="sh-foot">${foot}</div>` : ''}</div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
  const el = $('.sheet', root);
  applyAnim(el);
  if (onMount) onMount(el);
  return el;
}
export function closeSheet(silent = false) {
  const root = $('#sheet-root');
  if (!root.firstChild) return;
  root.classList.remove('open');
  const cb = onCloseCb; onCloseCb = null;
  if (silent) { root.innerHTML = ''; return; }
  setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 320);
  if (cb) cb();
}
export const sheetEl = () => $('#sheet-root .sheet');
export function setSheetBody(html, foot) {
  const el = sheetEl();
  if (!el) return;
  $('.sh-body', el).innerHTML = html;
  const f = $('.sh-foot', el);
  if (foot !== undefined) {
    if (f) f.innerHTML = foot; else el.insertAdjacentHTML('beforeend', `<div class="sh-foot">${foot}</div>`);
  }
  applyAnim(el);
}
export function setSheetTitle(t) { const h = $('.sh-head h2', sheetEl()); if (h) h.innerHTML = t; }
export { S };
