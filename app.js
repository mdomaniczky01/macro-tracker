import { FOODS, foodLabel } from './foods.js';
import { PROT_GROUPS, CARB_GROUPS } from './recipes.js';
import { parseMeal } from './parse.js';
import { Portion, gpcFor, loadImage } from './vision.js';
import {
  S, save, MEALS, MAINS, mealName, SUPPS, uid, todayISO, addDays, prettyDate, shortDate, dowName, weekStart, parseISO,
  allFoods, foodMap, dropFoodCache, allRecipes, getRecipe, macrosOf, foodPer, foodOK, dietOK, targets, entries, mealEntries,
  eTot, sumEntries, dayTotals, addEntry, removeEntry, findEntry, pushRecent, waterOf, addWater, suppsOf, toggleSupp,
  allowedOf, setAllowed, addWeight, slotByHour, remaining, shareForMeal, suggestions, replaceState, resetState, carbState,
} from './store.js';
import {
  $, $$, esc, n0, n1, clamp, COL, MLABEL, GROUP_COL, GROUP_NAME, plateGroup, shade, ICON, applyAnim, countTo, fillRange,
  impactHTML, setImpact, splitHTML, macsHTML, toast, openSheet, closeSheet, sheetEl, setSheetBody, setSheetTitle,
} from './ui.js';

const FM = () => foodMap();
const fname = (f) => foodLabel(f, carbState());
const shortName = (f) => f.n.split('(')[0].split(':')[0].replace(/ sin gluten| deslactosado/gi, '').trim();
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const PLURAL = { porción: 'porciones', mitad: 'mitades', pan: 'panes', plato: 'platos' };
const pl = (n, name) => (n > 1.001 ? PLURAL[name] || (name.endsWith('s') ? name : name + 's') : name);

// ============================================================================
// Estado de interfaz
// ============================================================================
const UI = {
  tab: 'hoy', date: todayISO(), pg: 'prot', supOpen: false,
  rf: { q: '', prot: null, carb: null, meal: null, fav: false, mine: false, fit: false, limit: 50 },
};
const TPL = [
  { n: 'Pollo + arroz', items: [['pollo_pechuga', 175], ['arroz_blanco', 100], ['ensalada', 150]] },
  { n: 'Carne + papa', items: [['carne_magra', 175], ['papa', 150], ['ensalada', 150]] },
  { n: 'Cerdo + batata', items: [['cerdo_lomo', 175], ['batata', 100], ['ensalada', 150]] },
  { n: 'Pescado + papa', items: [['pescado_blanco', 225], ['papa', 150], ['ensalada', 150]] },
  { n: 'Pollo + fideo', items: [['pollo_pechuga', 175], ['fideo_sg', 100], ['salsa_tomate', 80], ['ensalada', 100]] },
  { n: 'Huevos + batata', items: [['huevo', 100], ['clara', 66], ['batata', 100], ['ensalada', 150]] },
  { n: 'Carne + arroz', items: [['carne_magra', 175], ['arroz_blanco', 100], ['verd_salteadas', 150]] },
  { n: 'Hamburguesa', items: [['carne_molida', 175], ['pan_hamb_sg', 65], ['tomate', 50], ['ensalada', 100]] },
];
const PICK = {
  prot: ['pollo_pechuga', 'pollo_muslo', 'carne_magra', 'carne_molida', 'cerdo_lomo', 'cerdo_bife', 'pescado_blanco', 'atun_lata', 'huevo', 'clara'],
  carb: ['arroz_blanco', 'arroz_integral', 'fideo_sg', 'papa', 'batata', 'mandioca', 'tapioca', 'pan_hamb_sg', 'avena_sg', 'pororo', 'galletita_arroz'],
  veg: ['ensalada', 'verd_salteadas', 'brocoli', 'zapallito', 'espinaca', 'tomate', 'cebolla', 'morron', 'zanahoria', 'caldo_verd'],
  extra: ['aceite_oliva', 'soja', 'mostaza', 'salsa_tomate', 'queso_feta', 'leche_desl', 'yogurt_prot', 'whey', 'coco', 'chia'],
};
const PICK_NAMES = { prot: 'Proteína', carb: 'Hidrato', veg: 'Verdura', extra: 'Extras', mine: 'Mis alimentos' };

// ---------------- plato (borrador persistente) ----------------
const mkItem = (fid, g) => ({ u: uid(), fid, g: g ?? (FM()[fid] || { def: 100 }).def });
let PLATE = S.plateDraft && Array.isArray(S.plateDraft.items) ? S.plateDraft : null;
if (PLATE) { PLATE.items = PLATE.items.filter((i) => i && FM()[i.fid]); if (!PLATE.items.length) PLATE = null; }
if (!PLATE) PLATE = { name: '', meal: slotByHour(todayISO()), items: TPL[0].items.map(([f, g]) => mkItem(f, g)), editing: null };
const savePlate = () => { S.plateDraft = PLATE; save(); };

function itemMac(it) {
  const f = FM()[it.fid];
  if (!f) return { k: 0, p: 0, c: 0, f: 0 };
  const pg = foodPer(f);
  return { k: pg.k * it.g, p: pg.p * it.g, c: pg.c * it.g, f: pg.f * it.g };
}
function sumItems(items) {
  const t = { k: 0, p: 0, c: 0, f: 0 };
  for (const it of items) { const m = itemMac(it); t.k += m.k; t.p += m.p; t.c += m.c; t.f += m.f; }
  return t;
}
function rangeCfg(f) {
  const d = f.def, tiny = d <= 20;
  return {
    min: 0, step: tiny ? 1 : 5,
    max: tiny ? Math.max(40, d * 3) : clamp(Math.round((d * 3) / 25) * 25, 100, 450),
  };
}
function gHint(f, g) {
  if (f.v && f.y && carbState() === 'cocido') {
    const raw = n0(g / f.y);
    if (f.id.startsWith('fideo')) return `≈ ${raw} g de fideo seco`;
    if (f.id.startsWith('arroz')) return `≈ ${raw} g de arroz crudo`;
    return `≈ ${raw} g en crudo`;
  }
  if (f.u && !f.only && f.u.g >= 25) { const n = Math.round((g / f.u.g) * 2) / 2; return `≈ ${n1(n)} ${pl(n, f.u.n)}`; }
  return '';
}
function autoName(items) {
  const fs = items.map((i) => FM()[i.fid]).filter(Boolean);
  const order = ['prot', 'carb', 'veg', 'fat'];
  fs.sort((a, b) => order.indexOf(plateGroup(a)) - order.indexOf(plateGroup(b)));
  const main = fs.filter((f) => ['prot', 'carb'].includes(plateGroup(f))).slice(0, 3);
  return (main.length ? main : fs.slice(0, 2)).map(shortName).join(' + ') || 'Plato';
}
function dotsFor(items) {
  return items.map(([fid]) => `<i style="background:${GROUP_COL[plateGroup(FM()[fid] || { cat: 'extra' })]}"></i>`).join('');
}
function qtyText(e) {
  if (e.items && e.unit === 'plato') return e.items.map((i) => shortName(FM()[i.fid] || { n: '?' })).slice(0, 4).join(' · ');
  if (e.unit === 'g') return `${n0(e.qty)} g`;
  return `${n1(e.qty)} ${pl(e.qty, e.unit)}`;
}

// ============================================================================
// Render principal
// ============================================================================
function render() {
  const v = $('#view');
  v.innerHTML = ({ hoy: viewHoy, recetas: viewRecetas, plato: viewPlato, progreso: viewProgreso, ajustes: viewAjustes })[UI.tab]();
  renderTabs();
  applyAnim(v);
  if (UI.tab === 'plato') {
    paintPlate(false);
    const c = $('#view .chips'), on = c && $('.chip.on', c);
    if (on) c.scrollLeft += on.getBoundingClientRect().left - c.getBoundingClientRect().left - (c.clientWidth - on.clientWidth) / 2;
  }
}
function renderTabs() {
  const T = [['hoy', 'Hoy'], ['recetas', 'Recetas'], ['plato', 'Plato'], ['progreso', 'Progreso'], ['ajustes', 'Ajustes']];
  $('#tabs').innerHTML = T.map(([id, l]) => id === 'plato'
    ? `<button class="tab tab-plate ${UI.tab === id ? 'on' : ''}" data-act="tab" data-tab="plato"><div class="bubble">${ICON.plato}</div><span>${l}</span></button>`
    : `<button class="tab ${UI.tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}">${ICON[id]}<span>${l}</span></button>`).join('');
}

// ============================================================================
// HOY
// ============================================================================
function viewHoy() {
  const d = UI.date, today = todayISO(), isToday = d === today;
  const t = targets(), tot = dayTotals(d);
  const remK = t.k - tot.k;
  const pct = t.k ? (tot.k / t.k) * 100 : 0;
  const mb = (m, lab) => `
    <div class="mbar" style="--col:${COL[m]}">
      <div class="ihead"><span class="l"><i class="d" style="background:${COL[m]}"></i>${lab}</span><span class="v"><b>${n0(tot[m])}</b> / ${t[m]} g</span></div>
      <div class="track"><i class="eaten" data-bar="${clamp((tot[m] / (t[m] || 1)) * 100, 0, 100)}" data-key="mb-${m}"></i></div>
    </div>`;
  const showOpt = (id) => S.showOpt[id] || mealEntries(d, id).length;
  const hiddenOpt = MEALS.filter((m) => !m.main && !showOpt(m.id));
  return `<div class="screen">
    <div class="head">
      <div><h1>${isToday ? 'Hoy' : prettyDate(d)}</h1><div class="sub">${isToday ? prettyDate(d) : `<button class="link" data-act="date-today">Volver a hoy</button>`}</div></div>
      <div class="date-nav">
        <button class="icon-btn" data-act="date-prev" aria-label="Día anterior">${ICON.left}</button>
        <button class="icon-btn" data-act="date-next" aria-label="Día siguiente" ${isToday ? 'disabled style="opacity:.35"' : ''}>${ICON.right}</button>
      </div>
    </div>
    ${t.isSet ? '' : `<section class="card onb"><h3>Primer paso</h3><p>Cargá tus macros objetivo del día (proteína, hidratos y grasas) y la app arma todo en base a eso.</p><button class="btn block" data-act="targets">Cargar mis macros</button></section>`}
    <section class="card">
      <div class="sum-top">
        <div class="ring"><svg viewBox="0 0 132 132"><circle class="bg" cx="66" cy="66" r="54"/><circle class="fg ${remK < 0 ? 'over' : ''}" cx="66" cy="66" r="54" data-ring="${pct}" data-key="ring"/></svg>
          <div class="mid"><b data-num="${Math.abs(remK)}" data-key="remk">0</b><span>${remK >= 0 ? 'kcal restantes' : 'kcal de más'}</span></div></div>
        <div class="mbars">${mb('p', 'Proteína')}${mb('c', 'Hidratos')}${mb('f', 'Grasas')}</div>
      </div>
      <div class="sum-foot"><span>Consumido <b>${n0(tot.k)}</b> kcal</span><span>Objetivo <b>${t.k}</b>${t.isSet ? '' : ' (ref.)'}</span></div>
    </section>
    ${sugHTML(d, t)}
    <div class="sec"><h2>Comidas</h2></div>
    ${MEALS.filter((m) => m.main || showOpt(m.id)).map((m) => mealCard(d, m)).join('')}
    ${hiddenOpt.length ? `<div class="opt-toggle">${hiddenOpt.map((m) => `<button data-act="opt-meal" data-meal="${m.id}">+ ${m.n}</button>`).join('&nbsp;&nbsp;')}</div>` : ''}
    <div class="sec"><h2>Agua</h2></div>${waterCard(d)}
    <div class="sec"><h2>Suplementos</h2></div>${suppCard(d)}
    <div class="sec"><h2>Permitido</h2></div>${allowedCard(d)}
  </div>`;
}

function sugHTML(d, t) {
  const rest = remaining(d);
  const slot = slotByHour(d);
  if (t.isSet && rest.k < 80) {
    return `<section class="card" style="text-align:center"><div class="serif" style="font-size:19px;font-weight:600">Objetivo del día cumplido</div><div class="muted" style="margin-top:4px;font-size:13px">Si todavía te falta proteína, sumá algo liviano desde Colaciones.</div></section>`;
  }
  const list = suggestions(d, slot, 4);
  if (!list.length) return '';
  const sh = shareForMeal(d, slot);
  return `<div class="sec"><h2>Sugerido · ${mealName(slot)}</h2><button class="link" data-act="goto-fit">Ver más</button></div>
    <div class="muted" style="font-size:13px;margin:-4px 2px 10px">Ideal para tu próxima comida: ~${n0(sh.k)} kcal · ${n0(sh.p)} g de proteína</div>
    <div class="sug">${list.map((x) => `
      <div class="scard" data-act="open-recipe" data-id="${esc(x.recipe.id)}" data-mult="${x.mult}" data-meal="${slot}">
        <div class="nm">${esc(x.recipe.name)}</div>
        ${splitHTML(x.m)}
        <div class="meta"><span><b style="color:var(--ink)">${n0(x.m.k)}</b> kcal · <b style="color:var(--ink)">${n0(x.m.p)}</b> g prot</span><span>${x.mult !== 1 ? '×' + n1(x.mult) : '1 porción'}</span></div>
        <button class="btn sm soft go" data-act="sug-add" data-id="${esc(x.recipe.id)}" data-mult="${x.mult}" data-meal="${slot}">+ Agregar</button>
      </div>`).join('')}</div>`;
}

function mealCard(d, m) {
  const list = mealEntries(d, m.id), tot = sumEntries(list);
  return `<section class="card meal ${list.length ? 'done' : ''}">
    <div class="meal-h"><span class="ck">${ICON.check}</span>
      <div class="t"><b>${m.n}</b><small>${list.length ? `${n0(tot.k)} kcal · ${n0(tot.p)} g prot` : m.main ? 'Sin cargar' : 'Opcional'}</small></div>
      <button class="add" data-act="add-meal" data-meal="${m.id}" aria-label="Agregar a ${m.n}">+</button></div>
    ${list.length ? `<div class="meal-rows">${list.map(rowHTML).join('')}</div>` : ''}
  </section>`;
}
function rowHTML(e) {
  const x = eTot(e), tt = x.p * 4 + x.c * 4 + x.f * 9 || 1;
  return `<button class="row" data-act="entry" data-id="${e.id}">
    <span class="mix"><i style="height:${(x.p * 4 / tt) * 100}%;background:${COL.p}"></i><i style="height:${(x.c * 4 / tt) * 100}%;background:${COL.c}"></i><i style="height:${(x.f * 9 / tt) * 100}%;background:${COL.f}"></i></span>
    <span class="n"><b>${esc(e.name)}</b><small>${esc(qtyText(e))}</small></span>
    <span class="k">${n0(x.k)} kcal<small>P ${n0(x.p)} · C ${n0(x.c)} · G ${n0(x.f)}</small></span></button>`;
}

function waterCard(d) {
  const goal = S.settings.waterGoal, w = waterOf(d), p = clamp(w / goal, 0, 1);
  const path = 'M10 6 H64 L58.5 88 Q58 92 54 92 H20 Q16 92 15.5 88 Z';
  return `<section class="card water">
    <svg class="glass" viewBox="0 0 74 98"><defs><clipPath id="gl"><path d="${path}"/></clipPath></defs>
      <path d="${path}" fill="#FFFDF8" stroke="#D9C7AE" stroke-width="2"/>
      <g clip-path="url(#gl)"><rect class="lvl" x="0" y="0" width="74" height="98" fill="#A9BFC4" opacity=".85" style="transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(0);transition:transform .9s cubic-bezier(.2,.8,.2,1)" data-scale="${p * 0.93}" data-key="water"/></g>
      <path d="${path}" fill="none" stroke="#D9C7AE" stroke-width="2"/></svg>
    <div class="info"><div class="big">${(w / 1000).toFixed(2).replace('.', ',').replace(/,?0+$/, '')}<small> / ${goal / 1000} L</small></div>
      <div class="muted" style="font-size:12px">${w >= goal ? 'Meta cumplida' : `Faltan ${n0(goal - w)} ml`} · repartidos en el día</div>
      <div class="water btns" style="display:flex;gap:8px;margin-top:10px">
        <button class="btn sm soft" data-act="water" data-ml="-250" style="width:44px;padding:0;font-size:20px" aria-label="Quitar 250 ml">−</button>
        <button class="btn sm" data-act="water" data-ml="250">+ 250 ml</button><button class="btn sm soft" data-act="water" data-ml="500">+ 500</button></div></div></section>`;
}

function suppCard(d) {
  const on = suppsOf(d), done = SUPPS.filter((s) => on[s.id]).length;
  const head = `<button class="toggle" data-act="supp-open" style="padding-top:0"><span><b>${done} de ${SUPPS.length} tomados</b><small>Desayuno · Almuerzo · Antes de dormir</small></span><span class="link">${UI.supOpen ? 'Cerrar' : 'Abrir'}</span></button>
    <div class="track" style="margin:2px 0 4px"><i style="background:var(--bordo)" data-bar="${(done / SUPPS.length) * 100}" data-key="supp"></i></div>`;
  const list = UI.supOpen ? `<div style="margin-top:8px">${SUPPS.map((s) => `<button class="supp ${on[s.id] ? 'on' : ''}" data-act="supp" data-id="${s.id}"><span class="cb">${ICON.check}</span><span class="t"><small>${s.when}</small>${s.n}</span></button>`).join('')}</div>` : '';
  return `<section class="card">${head}${list}</section>`;
}

function allowedCard(d) {
  const a = allowedOf(d), used = a.used;
  return `<section class="card allowed ${used ? 'used' : ''}"><span class="badge" style="width:52px;height:52px">${ICON.plato.replace('<svg', '<svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7"')}</span>
    <div class="t"><b>${used ? 'Permitido usado' : 'Permitido disponible'}</b><div class="muted" style="font-size:13px">${used ? `Lo usaste el ${prettyDate(a.on || d)}. Se renueva el lunes.` : '1 por semana · sin culpa, sin cuentas.'}</div></div>
    <button class="btn sm ${used ? 'ghost' : ''}" data-act="allowed">${used ? 'Deshacer' : 'Usar'}</button></section>`;
}

// ============================================================================
// PLATO INTERACTIVO
// ============================================================================
function viewPlato() {
  const P = PLATE, items = P.items;
  const geo = plateGeom();
  const segs = [...items].filter((it) => FM()[it.fid]).map((it) => {
    const s = geo.out[it.u];
    return `<circle class="seg" data-act="seg" data-uid="${it.u}" cx="110" cy="110" r="64" stroke="${s.col}" style="stroke-dasharray:${s.len} ${geo.C - s.len};stroke-dashoffset:${s.off}"/>`;
  }).join('');
  const rows = items.map(ingRow).join('');
  const groups = Object.keys(PICK).concat(S.customFoods.length ? ['mine'] : []);
  const list = (S.customFoods.length && UI.pg === 'mine' ? S.customFoods.map((f) => f.id) : PICK[UI.pg] || PICK.prot).filter((id) => FM()[id] && foodOK(FM()[id]));
  const state = (id) => items.some((i) => i.fid === id);
  return `<div class="screen">
    <div class="head"><div><h1>Plato</h1><div class="sub">Armalo y mirá cómo impacta en tu día</div></div>
      <div style="display:flex;gap:8px;align-items:center"><button class="btn sm" data-act="describe" style="gap:6px;white-space:nowrap">${ICON.camera.replace('<svg', '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')}Foto</button>
      <button class="icon-btn" data-act="plate-clear" aria-label="Vaciar plato"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg></button></div></div>
    <div class="chips" style="margin-bottom:12px">${MEALS.map((m) => `<button class="chip ${P.meal === m.id ? 'on' : ''}" data-act="plate-meal" data-meal="${m.id}">${m.n}</button>`).join('')}</div>
    <section class="card plate-hero">
      <div class="plate-wrap">
        <div class="plate-svg"><svg viewBox="0 0 220 220" id="plate-svg">
          <circle cx="110" cy="110" r="107" fill="#fff" stroke="#E3D5C1" stroke-width="1.5"/>
          <circle cx="110" cy="110" r="92" fill="#FBF5EA" stroke="#EADBC6" stroke-width="1.5"/>
          <circle cx="110" cy="110" r="64" fill="none" stroke="#EFE5D4" stroke-width="34" ${items.length ? '' : 'stroke-dasharray="4 6"'}/>
          <g transform="rotate(-90 110 110)">${segs}</g>
          <text x="110" y="112" font-size="34" font-weight="600" id="pk-k">0</text>
          <text x="110" y="132" font-size="11" style="font-family:var(--sans);fill:#8B7566;letter-spacing:.08em">KCAL</text></svg></div>
        <div class="legend">${['prot', 'carb', 'veg', 'fat'].map((g) => `<div class="lg"><i class="d" style="background:${GROUP_COL[g]}"></i><span>${GROUP_NAME[g]}</span><b data-g="${g}">0 g</b></div>`).join('')}</div>
      </div>
      <div class="macro-chips">
        ${['p', 'c', 'f'].map((m) => `<div class="mchip"><b data-mc="${m}">0</b><small>${MLABEL[m]}</small><i style="background:${COL[m]}"></i></div>`).join('')}
      </div>
    </section>
    <section class="card" id="impact"><h3>Impacto en tu día <span class="r">${prettyDate(UI.date)}</span></h3>${impactHTML()}</section>
    <div class="sec" style="margin-top:4px"><h2>Arrancá con una base</h2></div>
    <div class="tpl">${TPL.map((t, i) => `<button data-act="plate-tpl" data-i="${i}"><span class="dd">${dotsFor(t.items)}</span>${t.n}</button>`).join('')}</div>
    <section class="card"><h3>Ingredientes <span class="r">${items.length ? '┃ = cantidad de tu plan' : ''}</span></h3>
      ${items.length ? rows : `<div class="empty"><div class="big">🍽</div>Plato vacío. Elegí una base arriba o sumá ingredientes abajo.</div>`}
    </section>
    ${items.length ? '<button class="btn soft block" style="margin:-4px 0 14px" data-act="plate-save">Guardar como receta</button>' : ''}
    <section class="card"><h3>Sumar ingredientes</h3>
      <div class="chips" style="margin-bottom:10px">${groups.map((g) => `<button class="chip ${UI.pg === g ? 'on' : ''}" data-act="plate-pg" data-g="${g}">${PICK_NAMES[g]}</button>`).join('')}</div>
      <div class="addrow">${list.map((id) => { const f = FM()[id]; return `<button class="chip ${state(id) ? 'on' : ''}" data-act="plate-food" data-fid="${id}"><i class="d" style="background:${GROUP_COL[plateGroup(f)]}"></i>${esc(shortName(f))}</button>`; }).join('')}
        <button class="chip" data-act="plate-more" style="border-style:dashed">Buscar más…</button></div>
    </section>
    <div style="height:70px"></div>
    <div class="dock" id="dock" style="${items.length ? '' : 'display:none'}">
      <button class="btn soft" data-act="plate-fit" title="Ajustar al resto del día">Ajustar a mi día</button>
      <button class="btn" data-act="plate-commit" style="flex:1" id="commit">Agregar al diario</button>
    </div>
  </div>`;
}

function plateGeom() {
  const C = 2 * Math.PI * 64, order = ['prot', 'carb', 'veg', 'fat'];
  const its = PLATE.items.map((it) => ({ it, f: FM()[it.fid] })).filter((x) => x.f);
  const sorted = [...its].sort((a, b) => order.indexOf(plateGroup(a.f)) - order.indexOf(plateGroup(b.f)));
  const totalG = sorted.reduce((s, x) => s + x.it.g, 0) || 1;
  const idx = {}, out = {};
  let start = 0;
  for (const x of sorted) {
    const g = plateGroup(x.f);
    const i = (idx[g] = (idx[g] || 0) + 1) - 1;
    const len = (x.it.g / totalG) * C, gap = sorted.length > 1 ? 2.5 : 0;
    out[x.it.u] = { len: Math.max(len - gap, 0.01), off: -start, col: shade(GROUP_COL[g], i) };
    start += len;
  }
  return { C, out };
}

function ingRow(it) {
  const f = FM()[it.fid];
  if (!f) return '';
  const cfg = rangeCfg(f), g = plateGroup(f), geo = plateGeom();
  const col = geo.out[it.u] ? geo.out[it.u].col : GROUP_COL[g];
  return `<div class="ing" data-uid="${it.u}">
    <div class="ing-head"><i class="d" style="background:${col}"></i>
      <div class="nm">${esc(fname(f))}<small class="hint"></small></div>
      <div class="gv"><b>${n0(it.g)}</b><small> g</small></div>
      <button class="x" data-act="plate-rm" data-uid="${it.u}" aria-label="Quitar">✕</button></div>
    <div class="ing-ctl"><button class="sb" data-act="plate-step" data-uid="${it.u}" data-d="-${cfg.step === 1 ? 1 : 5}">−</button>
      <div class="rng"><input type="range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${it.g}" data-in="plate-g" data-uid="${it.u}" style="--col:${GROUP_COL[g]}" aria-label="Gramos de ${esc(shortName(f))}">
        <i class="tick" style="left:${clamp((f.def / cfg.max) * 100, 0, 100)}%"></i></div>
      <button class="sb" data-act="plate-step" data-uid="${it.u}" data-d="${cfg.step === 1 ? 1 : 5}">+</button></div>
    <div class="ing-mac"><span><b data-im="k">0</b> kcal</span><span>P <b data-im="p">0</b></span><span>C <b data-im="c">0</b></span><span>G <b data-im="f">0</b></span></div>
  </div>`;
}

function paintPlate(animate) {
  const root = $('#view');
  if (!$('#plate-svg')) return;
  const geo = plateGeom(), tot = sumItems(PLATE.items);
  const grams = { prot: 0, carb: 0, veg: 0, fat: 0 };
  for (const it of PLATE.items) {
    const f = FM()[it.fid];
    if (!f) continue;
    grams[plateGroup(f)] += it.g;
    const seg = $(`.seg[data-uid="${it.u}"]`, root), s = geo.out[it.u];
    if (seg && s) {
      seg.style.strokeDasharray = `${s.len} ${geo.C - s.len}`; seg.style.strokeDashoffset = s.off; seg.setAttribute('stroke', s.col);
    }
    const row = $(`.ing[data-uid="${it.u}"]`, root);
    if (!row) continue;
    const m = itemMac(it);
    $('.gv b', row).textContent = n0(it.g);
    $('.hint', row).textContent = gHint(f, it.g);
    $('.ing-head .d', row).style.background = s ? s.col : '';
    for (const k of ['k', 'p', 'c', 'f']) $(`[data-im="${k}"]`, row).textContent = n0(m[k]);
    const r = $('input[type=range]', row);
    if (+r.value !== it.g) r.value = it.g;
    fillRange(r);
  }
  const pk = $('#pk-k');
  if (animate) countTo(pk, parseFloat(pk.textContent) || 0, tot.k, 380); else { pk._cnt = (pk._cnt || 0) + 1; pk.textContent = n0(tot.k); }
  for (const g of Object.keys(grams)) $(`[data-g="${g}"]`, root).textContent = n0(grams[g]) + ' g';
  for (const m of ['p', 'c', 'f']) $(`[data-mc="${m}"]`, root).textContent = n0(tot[m]) + ' g';
  setImpact($('#impact'), tot, UI.date);
  $('#commit').textContent = `${PLATE.editing ? 'Guardar cambios' : 'Agregar al diario'} · ${n0(tot.k)} kcal`;
  $('#dock').style.display = PLATE.items.length ? '' : 'none';
}

function plateAddFood(fid, g) {
  PLATE.items.push(mkItem(fid, g));
  savePlate(); render();
  const last = PLATE.items[PLATE.items.length - 1];
  const row = $(`.ing[data-uid="${last.u}"]`);
  if (row) { row.classList.add('pulse'); }
  paintPlate(true);
}
function commitPlate() {
  const items = PLATE.items.filter((i) => i.g > 0 && FM()[i.fid]);
  if (!items.length) return toast('El plato está vacío');
  const per = sumItems(items);
  const e = {
    m: PLATE.meal, name: PLATE.name || autoName(items), qty: 1, unit: 'plato', step: 0.25, min: 0.25, max: 3, per,
    items: items.map((i) => ({ fid: i.fid, g: i.g })), src: { t: 'plate' },
  };
  if (PLATE.editing) removeEntry(UI.date, PLATE.editing.id);
  addEntry(UI.date, e);
  items.forEach((i) => pushRecent('food', i.fid));
  const meal = e.m;
  PLATE = { name: '', meal: slotByHour(UI.date), items: [], editing: null };
  savePlate();
  UI.tab = 'hoy'; window.scrollTo(0, 0); render();
  toast(`Agregado a ${mealName(meal)}`);
}
function loadPlate(items, meal, name = '', editing = null) {
  PLATE = { name, meal: meal || PLATE.meal, items: items.map(([fid, g]) => mkItem(fid, g)), editing };
  savePlate();
  closeSheet(true);
  UI.tab = 'plato'; window.scrollTo(0, 0); render();
}

// ============================================================================
// RECETAS
// ============================================================================
function recipePool() {
  const f = UI.rf, q = norm(f.q.trim());
  return allRecipes().filter((r) => {
    if (f.fav && !S.favRecipes.includes(r.id)) return false;
    if (f.mine && r.src !== 'mine') return false;
    if (f.prot && r.prot !== f.prot) return false;
    if (f.carb && r.carb !== f.carb) return false;
    if (f.meal && !r.meals.includes(f.meal)) return false;
    if (q && !norm(r.name).includes(q)) return false;
    return dietOK(macrosOf(r));
  });
}
function viewRecetas() {
  const f = UI.rf;
  let pool = recipePool(), cards;
  const slot = f.meal || slotByHour(UI.date);
  if (f.fit) {
    cards = suggestions(UI.date, slot, Infinity, pool.filter((r) => r.meals.includes(slot)));
  } else {
    pool.sort((a, b) => (S.favRecipes.includes(b.id) ? 1 : 0) - (S.favRecipes.includes(a.id) ? 1 : 0));
    cards = pool.map((r) => ({ recipe: r, mult: 1, m: macrosOf(r) }));
  }
  const shown = cards.slice(0, f.limit);
  const chip = (cond, act, data, label) => `<button class="chip ${cond ? 'on' : ''}" data-act="${act}" ${data}>${label}</button>`;
  return `<div class="screen">
    <div class="head"><div><h1>Recetas</h1><div class="sub">${allRecipes().length} ideas simples, a tu plan</div></div></div>
    <div class="search">${ICON.search}<input type="search" placeholder="Buscar: pollo, papa, tortilla…" value="${esc(f.q)}" data-in="rf-q" enterkeyhint="search"></div>
    <div class="chips" style="margin-bottom:6px">
      ${chip(f.fit, 'rf-fit', '', `Para mí · ${mealName(slot)}`)}${chip(f.fav, 'rf-fav', '', '★ Favoritas')}${chip(f.mine, 'rf-mine', '', 'Mías')}
    </div>
    <div class="filters">
      <div class="lab">Proteína</div><div class="chips">${PROT_GROUPS.map(([id, n]) => chip(f.prot === id, 'rf-prot', `data-v="${id}"`, n)).join('')}</div>
      <div class="lab">Hidrato</div><div class="chips">${CARB_GROUPS.map(([id, n]) => chip(f.carb === id, 'rf-carb', `data-v="${id}"`, n)).join('')}</div>
      <div class="lab">Momento</div><div class="chips">${[['desayuno', 'Desayuno'], ['almuerzo', 'Almuerzo / Cena'], ['merienda', 'Merienda'], ['media_tarde', 'Colación']].map(([id, n]) => chip(f.meal === id, 'rf-meal', `data-v="${id}"`, n)).join('')}</div>
    </div>
    <div class="count">${cards.length} receta${cards.length === 1 ? '' : 's'}${f.fit ? ' · ordenadas por cuánto encajan con lo que te queda' : ''}</div>
    ${shown.map((x) => rcardHTML(x, slot)).join('') || `<div class="empty">No encontré recetas con esos filtros.</div>`}
    ${cards.length > shown.length ? `<button class="btn ghost block" data-act="rf-more">Mostrar más (${cards.length - shown.length})</button>` : ''}
    <button class="btn soft block" style="margin-top:12px" data-act="goto-plate">+ Armar mi propio plato</button>
  </div>`;
}
function rcardHTML(x, slot) {
  const r = x.recipe, m = x.m, fav = S.favRecipes.includes(r.id);
  return `<button class="rcard" data-act="open-recipe" data-id="${esc(r.id)}" data-mult="${x.mult}" data-meal="${slot}">
    <div class="t"><div class="nm">${esc(r.name)}</div>${fav ? '<span class="star">★</span>' : ''}</div>
    <div class="meta">${r.plan ? '<span class="tag plan">Plan</span>' : ''}${r.src === 'mine' ? '<span class="tag mine">Mía</span>' : ''}<span>${r.min} min</span><span>${r.ing.length} ingredientes</span>${x.mult !== 1 ? `<span><b>×${n1(x.mult)}</b></span>` : ''}</div>
    ${splitHTML(m)}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span class="serif" style="font-size:19px;font-weight:600">${n0(m.k)} <small class="muted" style="font-family:var(--sans);font-size:12px;font-weight:450">kcal</small></span>${macsHTML(m)}</div>
  </button>`;
}

// ---------- detalle de receta (sheet) ----------
let RC = null;
function openRecipe(id, ctx = {}) {
  const r = getRecipe(id);
  if (!r) return;
  RC = { r, mult: ctx.mult || 1, oil: false, meal: ctx.meal || slotByHour(UI.date), date: UI.date };
  const tags = `${r.plan ? '<span class="tag plan">Plan</span> ' : ''}${r.src === 'mine' ? '<span class="tag mine">Mía</span> ' : ''}<span class="muted" style="font-size:13px">${r.min} min</span>`;
  const body = `
    <div style="margin:-2px 0 10px">${tags}</div>
    <div class="detail-hero"><div class="big"><span id="rc-k">0</span><small> kcal</small></div>
      <div id="rc-split" style="margin:10px 4px 6px"></div>
      <div class="macro-chips" style="margin-top:8px">${['p', 'c', 'f'].map((m) => `<div class="mchip"><b data-rm="${m}">0</b><small>${MLABEL[m]}</small><i style="background:${COL[m]}"></i></div>`).join('')}</div></div>
    <div class="card" style="padding:14px;margin-top:12px"><div class="ihead" style="margin-bottom:0"><span class="l">Porciones</span><span class="v"><b id="rc-mv">1</b></span></div>
      <div class="ing-ctl"><button class="sb" data-act="rc-step" data-d="-0.25">−</button><div class="rng"><input type="range" min="0.25" max="3" step="0.25" value="${RC.mult}" data-in="rc-mult" style="--col:var(--bordo)"></div><button class="sb" data-act="rc-step" data-d="0.25">+</button></div></div>
    <div class="card"><h3>Impacto en tu día</h3>${impactHTML()}</div>
    <div class="card"><h3>Ingredientes <span class="r" id="rc-ing-n"></span></h3><ul class="ings" id="rc-ings"></ul>
      <button class="toggle" data-act="rc-oil" id="rc-oil" style="margin-top:6px"><span>Sumar 1 cda de aceite de oliva<small>Opcional · el plan sugiere spray antiadherente</small></span><span class="sw"></span></button>
      ${carbState() === 'cocido' && r.ing.some(([f]) => FM()[f] && FM()[f].v) ? '<div class="note">Todo va pesado <b>cocido</b>, como en tu plan. Entre paréntesis ves el equivalente en crudo.</div>' : ''}</div>
    <div class="card"><h3>Preparación</h3>${r.steps.length ? `<ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : '<div class="muted">Sin pasos cargados.</div>'}</div>
    <div class="card"><h3>Agregar a</h3><div class="chips">${MEALS.map((m) => `<button class="chip ${RC.meal === m.id ? 'on' : ''}" data-act="rc-meal" data-meal="${m.id}">${m.n}</button>`).join('')}</div></div>
    ${r.src === 'mine' ? '<button class="btn danger block" data-act="rc-delete">Eliminar mi receta</button>' : ''}`;
  const foot = `<button class="icon-btn" data-act="rc-fav" id="rc-fav" style="width:48px;height:48px;flex:0 0 auto"></button>
    <button class="btn soft" data-act="rc-plate" style="flex:0 0 auto;padding:0 14px">En el plato</button>
    <button class="btn" data-act="rc-add" id="rc-add">Agregar</button>`;
  openSheet({ title: esc(r.name), body, foot, onMount: () => paintRecipe(true) });
}
function rcItems() {
  const { r, mult, oil } = RC;
  const list = r.ing.map(([fid, g]) => [fid, g * mult]);
  if (oil) list.push(['aceite_oliva', 13]);
  return list;
}
function paintRecipe(first) {
  const el = sheetEl();
  if (!el || !RC) return;
  const items = rcItems().map(([fid, g]) => ({ fid, g }));
  const tot = sumItems(items);
  const kEl = $('#rc-k', el);
  if (first) countTo(kEl, 0, tot.k, 500); else { kEl._cnt = (kEl._cnt || 0) + 1; kEl.textContent = n0(tot.k); }
  $('#rc-split', el).innerHTML = splitHTML(tot);
  for (const m of ['p', 'c', 'f']) $(`[data-rm="${m}"]`, el).textContent = n0(tot[m]) + ' g';
  $('#rc-mv', el).textContent = RC.mult === 1 ? '1 porción' : `×${n1(RC.mult)}`;
  $('#rc-ings', el).innerHTML = items.map((it) => {
    const f = FM()[it.fid];
    if (!f) return '';
    const h = gHint(f, it.g);
    return `<li><i class="d" style="background:${GROUP_COL[plateGroup(f)]}"></i><span>${esc(fname(f))}</span><span class="g">${n0(it.g)} g${h ? ` <small>(${h.replace('≈ ', '')})</small>` : ''}</span></li>`;
  }).join('');
  const range = $('input[type=range]', el); range.value = RC.mult; fillRange(range);
  $('#rc-oil', el).classList.toggle('on', RC.oil);
  const fav = S.favRecipes.includes(RC.r.id);
  $('#rc-fav', el).innerHTML = fav ? '★' : '☆';
  $('#rc-add', el).textContent = `Agregar · ${n0(tot.k)} kcal`;
  setImpact(el, tot, RC.date);
}
function recipeEntry(r, mult, meal) {
  const per = macrosOf(r, 1);
  return {
    m: meal, name: r.name, qty: mult, unit: 'porción', step: 0.25, min: 0.25, max: 4,
    per: { k: per.k, p: per.p, c: per.c, f: per.f }, items: r.ing.map(([fid, g]) => ({ fid, g })), src: { t: 'recipe', id: r.id },
  };
}

// ============================================================================
// PROGRESO
// ============================================================================
function viewProgreso() {
  const ws = S.weights, last = ws[ws.length - 1], first = ws[0];
  const diff = last && first ? last.kg - first.kg : 0;
  const t = targets(), today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const data = days.map((d) => ({ d, tot: dayTotals(d), full: MAINS.every((m) => mealEntries(d, m).length) }));
  const logged = data.filter((x) => x.tot.k > 0);
  const avg = (k) => (logged.length ? logged.reduce((s, x) => s + x.tot[k], 0) / logged.length : 0);
  return `<div class="screen">
    <div class="head"><div><h1>Progreso</h1><div class="sub">Una vez por semana, misma balanza</div></div></div>
    <section class="card"><h3>Peso <span class="r">${ws.length} registro${ws.length === 1 ? '' : 's'}</span></h3>
      <div style="display:flex;align-items:baseline;gap:10px"><span class="serif" style="font-size:40px;font-weight:600;letter-spacing:-.02em">${last ? n1(last.kg) : '–'}</span><span class="muted">kg</span>
        ${ws.length > 1 ? `<span style="margin-left:auto;font-weight:650;color:${diff <= 0 ? 'var(--ok)' : 'var(--bordo)'}">${diff > 0 ? '+' : ''}${n1(diff)} kg</span>` : ''}</div>
      ${weightChart()}
      <div style="display:flex;gap:8px;margin-top:12px"><input type="number" inputmode="decimal" step="0.1" id="w-kg" placeholder="Peso de hoy (kg)" style="flex:1;min-width:0;width:100%;height:46px;border-radius:14px;border:1px solid var(--line);background:var(--bg);padding:0 14px;outline:none"><button class="btn" data-act="weight-save">Guardar</button></div>
    </section>
    <section class="card"><h3>Últimos 7 días <span class="r">calorías</span></h3>${weekChart(data, t)}
      <div class="kpis"><div class="kpi"><b>${n0(avg('k'))}</b><small>kcal promedio</small></div><div class="kpi"><b>${n0(avg('p'))} g</b><small>prot. promedio</small></div><div class="kpi"><b>${data.filter((x) => x.full).length}/7</b><small>días con 4 comidas</small></div></div>
    </section>
  </div>`;
}
function weightChart() {
  const ws = S.weights.slice(-12);
  if (ws.length < 2) return `<div class="empty" style="padding:14px 0 4px">Cargá tu próximo pesaje y vas a ver la curva acá.</div>`;
  const W = 320, H = 130, px = 22, py = 22;
  const vals = ws.map((w) => w.kg), mn = Math.min(...vals) - 0.6, mx = Math.max(...vals) + 0.6;
  const x = (i) => px + (i * (W - 2 * px)) / (ws.length - 1), y = (v) => H - py - ((v - mn) / (mx - mn)) * (H - 2 * py);
  const pts = ws.map((w, i) => `${x(i).toFixed(1)},${y(w.kg).toFixed(1)}`);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="margin-top:8px"><defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6E1F2E" stop-opacity=".22"/><stop offset="1" stop-color="#6E1F2E" stop-opacity="0"/></linearGradient></defs>
    <path d="M${pts[0]} L${pts.join(' L')} L${x(ws.length - 1)},${H - py} L${x(0)},${H - py} Z" fill="url(#wg)"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="#6E1F2E" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${ws.map((w, i) => `<circle cx="${x(i)}" cy="${y(w.kg)}" r="4" fill="#FCF8F0" stroke="#6E1F2E" stroke-width="2"/><text x="${x(i)}" y="${y(w.kg) - 9}" text-anchor="middle">${n1(w.kg)}</text><text x="${x(i)}" y="${H - 4}" text-anchor="middle">${shortDate(w.d)}</text>`).join('')}</svg>`;
}
function weekChart(data, t) {
  const W = 320, H = 150, base = 118, top = 18, bw = 28;
  const mx = Math.max(t.k * 1.15, ...data.map((x) => x.tot.k), 1);
  const y = (v) => base - (v / mx) * (base - top);
  const step = (W - 20) / 7;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    <line x1="10" x2="${W - 10}" y1="${y(t.k)}" y2="${y(t.k)}" stroke="#3A2920" stroke-opacity=".35" stroke-dasharray="4 4"/><text x="${W - 10}" y="${y(t.k) - 4}" text-anchor="end">objetivo ${t.k}</text>
    ${data.map((x, i) => {
      const cx = 10 + step * i + step / 2, h = base - y(x.tot.k), over = x.tot.k > t.k * 1.05;
      return `<rect x="${cx - bw / 2}" y="${base}" width="${bw}" height="0" rx="8" fill="${over ? '#B5452F' : x.d === todayISO() ? '#6E1F2E' : '#B98A8E'}"><animate attributeName="height" from="0" to="${Math.max(h, x.tot.k ? 3 : 0)}" dur=".6s" fill="freeze" begin="0s"/><animate attributeName="y" from="${base}" to="${base - Math.max(h, x.tot.k ? 3 : 0)}" dur=".6s" fill="freeze" begin="0s"/></rect>
      ${x.tot.k ? `<text x="${cx}" y="${y(x.tot.k) - 5}" text-anchor="middle">${n0(x.tot.k)}</text>` : ''}
      <text x="${cx}" y="${base + 16}" text-anchor="middle" style="font-weight:${x.d === todayISO() ? 700 : 400}">${dowName(x.d)}</text>
      ${x.full ? `<circle cx="${cx}" cy="${base + 29}" r="3" fill="#5E7A4C"/>` : ''}`;
    }).join('')}</svg>
    <div class="muted" style="font-size:11px;margin-top:2px"><span style="color:#5E7A4C">●</span> día con desayuno, almuerzo, merienda y cena cargados</div>`;
}

// ============================================================================
// AJUSTES
// ============================================================================
function viewAjustes() {
  const s = S.settings, t = targets();
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `<div class="screen">
    <div class="head"><div><h1>Ajustes</h1><div class="sub">Tu plan, a tu manera</div></div></div>
    <section class="card"><h3>Objetivo diario</h3>
      <button class="list-item" data-act="targets" style="padding-top:0"><span class="t"><b class="serif" style="font-size:22px">${t.isSet ? `${t.k} kcal` : 'Sin cargar'}</b><small>${t.isSet ? `P ${t.p} g · C ${t.c} g · G ${t.f} g` : 'Tocá para cargar tus macros'}</small></span><span class="chev">›</span></button>
      ${t.isSet ? splitHTML({ p: t.p, c: t.c, f: t.f }) : ''}</section>
    <section class="card"><h3>Perfil</h3>
      <label class="field"><span>Nombre</span><input data-in="prof" data-k="name" value="${esc(s.name)}"></label>
      <div class="grid2"><label class="field"><span>Edad</span><input type="number" inputmode="numeric" data-in="prof" data-k="age" value="${s.age}"></label>
      <label class="field"><span>Altura (cm)</span><input type="number" inputmode="numeric" data-in="prof" data-k="height" value="${s.height}"></label></div></section>
    <section class="card"><h3>Preferencias</h3>
      <button class="toggle ${s.avoidGluten ? 'on' : ''}" data-act="set-toggle" data-k="avoidGluten"><span>Evitar gluten<small>Oculta recetas y alimentos con gluten (tu plan lo marca como agresor)</small></span><span class="sw"></span></button>
      <button class="toggle ${s.avoidLact ? 'on' : ''}" data-act="set-toggle" data-k="avoidLact"><span>Evitar lactosa<small>Quedan los deslactosados</small></span><span class="sw"></span></button>
      <div style="padding:12px 0 4px"><div style="font-weight:600;margin-bottom:2px">Los alimentos se pesan</div><div class="muted" style="font-size:12px;margin-bottom:8px">Carnes, pescado, arroz, fideo, papa y batata. Tu plan: cocidos</div>
        <div class="segmented"><button class="${s.carbState === 'cocido' ? 'on' : ''}" data-act="set-carb" data-v="cocido">Cocidos</button><button class="${s.carbState === 'crudo' ? 'on' : ''}" data-act="set-carb" data-v="crudo">Crudos</button></div></div>
      <label class="field" style="margin-top:12px;margin-bottom:0"><span>Meta de agua (ml)</span><input type="number" inputmode="numeric" step="250" data-in="prof" data-k="waterGoal" value="${s.waterGoal}"></label></section>
    <section class="card"><h3>Mi contenido</h3>
      <button class="list-item" data-act="plan-info"><span class="t"><b>Mi plan nutricional</b><small>Estrategia, suplementos y recomendaciones</small></span><span class="chev">›</span></button>
      <button class="list-item" data-act="my-foods"><span class="t"><b>Mis alimentos</b><small>${S.customFoods.length} creados</small></span><span class="chev">›</span></button>
      <button class="list-item" data-act="my-recipes"><span class="t"><b>Mis recetas</b><small>${S.customRecipes.length} guardadas</small></span><span class="chev">›</span></button>
      <button class="list-item" data-act="backup"><span class="t"><b>Respaldo</b><small>Exportar o restaurar tus datos</small></span><span class="chev">›</span></button></section>
    ${standalone ? '' : `<section class="card"><h3>Instalar en el iPhone</h3><ol class="steps" style="margin-top:4px"><li>Abrí esta página en <b>Safari</b>.</li><li>Tocá <b>Compartir</b> (el cuadrado con flecha).</li><li>Elegí <b>Agregar a inicio</b> y listo: queda como una app.</li></ol><div class="note">Tus datos se guardan en el teléfono. Si instalás la app, empezá a usarla desde el ícono (no desde Safari) y hacé un respaldo de vez en cuando.</div></section>`}
    <button class="btn danger block" data-act="reset">Borrar todos mis datos</button>
    <div class="muted" style="text-align:center;font-size:12px;margin:14px 0 0">Plato · hecho para tu plan</div>
  </div>`;
}

// ============================================================================
// SHEETS: objetivo, picker, detalle de alimento, entrada, formularios
// ============================================================================
function openTargets() {
  const t = S.settings.targets, cur = targets();
  const body = `<p class="muted" style="margin:0 0 14px;font-size:14px">Poné tus macros diarios. Las calorías se calculan solas (4·P + 4·C + 9·G), pero podés pisarlas.</p>
    <div class="grid2">
      <label class="field"><span>Proteína (g)</span><input id="t-p" type="number" inputmode="numeric" data-in="t-in" value="${t.p ?? ''}" placeholder="${cur.isSet ? '' : '150'}"></label>
      <label class="field"><span>Hidratos (g)</span><input id="t-c" type="number" inputmode="numeric" data-in="t-in" value="${t.c ?? ''}" placeholder="${cur.isSet ? '' : '200'}"></label>
      <label class="field"><span>Grasas (g)</span><input id="t-f" type="number" inputmode="numeric" data-in="t-in" value="${t.f ?? ''}" placeholder="${cur.isSet ? '' : '60'}"></label>
      <label class="field"><span>Calorías</span><input id="t-k" type="number" inputmode="numeric" data-in="t-in" value="${t.kManual ? t.k : ''}" placeholder="auto"></label></div>
    <div class="card" style="margin-top:4px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><span class="serif" style="font-size:30px;font-weight:600" id="t-kcal">0</span><span class="muted" style="font-size:13px" id="t-gkg"></span></div><div id="t-split"></div>
      <div class="macs" style="margin-top:8px;justify-content:space-between" id="t-pct"></div></div>`;
  const foot = `<button class="btn" data-act="targets-save">Guardar objetivo</button>`;
  openSheet({ title: 'Mis macros del día', body, foot, onMount: () => paintTargets() });
}
function readTargets() {
  const v = (id) => { const x = parseFloat($(id).value); return x > 0 ? x : 0; };
  const p = v('#t-p'), c = v('#t-c'), f = v('#t-f'), k = v('#t-k');
  return { p, c, f, k, auto: Math.round(p * 4 + c * 4 + f * 9) };
}
function paintTargets() {
  const x = readTargets(), k = x.k || x.auto;
  const el = sheetEl();
  $('#t-kcal', el).textContent = `${k} kcal`;
  const w = S.weights.length ? S.weights[S.weights.length - 1].kg : 0;
  $('#t-gkg', el).textContent = x.p && w ? `${n1(x.p / w)} g de proteína por kg` : '';
  $('#t-split', el).innerHTML = splitHTML(x);
  const tot = x.p * 4 + x.c * 4 + x.f * 9 || 1;
  $('#t-pct', el).innerHTML = [['p', 'P'], ['c', 'C'], ['f', 'G']].map(([m, l], i) => `<span><i class="dot" style="background:${COL[m]}"></i><b>${n0(((m === 'f' ? x.f * 9 : x[m] * 4) / tot) * 100)}%</b> ${l}</span>`).join('');
  $('#t-k', el).placeholder = x.auto ? String(x.auto) : 'auto';
}
function saveTargets() {
  const x = readTargets();
  if (!x.p && !x.c && !x.f && !x.k) return toast('Cargá al menos un valor');
  S.settings.targets = { p: x.p || null, c: x.c || null, f: x.f || null, k: x.k || null, kManual: !!x.k };
  S.settings.onboarded = true; save();
  closeSheet(); render(); toast('Objetivo guardado');
}

// ---------- picker ----------
let PK = null;
function openPicker({ mode = 'diary', meal, date = UI.date }) {
  PK = { mode, meal: meal || slotByHour(date), date, tab: mode === 'plate' ? 'foods' : 'recent', q: '' };
  openSheet({ title: mode === 'plate' ? 'Sumar al plato' : `Agregar a ${mealName(PK.meal)}`, body: '<div id="pk"></div>', onMount: drawPicker });
}
function drawPicker() {
  const tabs = PK.mode === 'plate' ? [['foods', 'Alimentos']] : [['recent', 'Recientes'], ['plan', 'Plan'], ['recipes', 'Recetas'], ['foods', 'Alimentos'], ['quick', 'Rápido']];
  const search = PK.tab !== 'quick' && PK.tab !== 'recent' && PK.tab !== 'plan';
  $('#pk').innerHTML = `
    ${tabs.length > 1 ? `<div class="chips" style="margin-bottom:10px">${tabs.map(([id, n]) => `<button class="chip ${PK.tab === id ? 'on' : ''}" data-act="pk-tab" data-tab="${id}">${n}</button>`).join('')}</div>` : ''}
    ${search ? `<div class="search">${ICON.search}<input type="search" id="pk-q" placeholder="${PK.tab === 'recipes' ? 'Buscar receta…' : 'Buscar alimento…'}" value="${esc(PK.q)}" data-in="pk-q" enterkeyhint="search"></div>` : ''}
    <div id="pk-list"></div>`;
  drawPickerList();
}
const pickRow = (type, id, name, sub, dd = '#D3AE7E') => `<button class="pick" data-act="pk-pick" data-type="${type}" data-id="${esc(id)}"><i class="dd" style="background:${dd}"></i><span class="n"><b>${esc(name)}</b><small>${esc(sub)}</small></span><span class="go">＋</span></button>`;
function foodRow(f) {
  const pg = foodPer(f), g = f.only ? f.u.g : f.def, m = { k: pg.k * g, p: pg.p * g };
  const unit = f.only ? `1 ${f.u.n}` : `${f.def} g`;
  return pickRow('food', f.id, fname(f), `${unit} · ${n0(m.k)} kcal · P ${n0(m.p)}`, GROUP_COL[plateGroup(f)]);
}
function recRow(r) { const m = macrosOf(r); return pickRow('recipe', r.id, r.name, `${n0(m.k)} kcal · P ${n0(m.p)} · C ${n0(m.c)} · G ${n0(m.f)}`, r.plan ? '#8B9A69' : '#7A2233'); }
function drawPickerList() {
  const box = $('#pk-list');
  if (!box) return;
  const q = norm(PK.q.trim());
  let html = '';
  if (PK.tab === 'recent') {
    const rec = S.recents.map((r) => (r.type === 'food' ? FM()[r.id] && ['food', FM()[r.id]] : getRecipe(r.id) && ['recipe', getRecipe(r.id)])).filter(Boolean);
    html = rec.length ? rec.map(([t, o]) => (t === 'food' ? foodRow(o) : recRow(o))).join('') : `<div class="empty">Todavía no cargaste nada.<br>Probá la pestaña <b>Plan</b> o <b>Rápido</b>.</div>`;
    html += `<button class="btn soft block" style="margin-top:14px" data-act="goto-plate-meal">Armar un plato con sliders</button>`;
  } else if (PK.tab === 'plan') {
    const plan = allRecipes().filter((r) => r.plan);
    const first = plan.filter((r) => r.meals.includes(PK.meal)), rest = plan.filter((r) => !r.meals.includes(PK.meal));
    html = (first.length ? `<div class="muted" style="font-size:12px;margin:2px 0 4px;letter-spacing:.06em;text-transform:uppercase">Opciones de ${mealName(PK.meal)}</div>${first.map(recRow).join('')}` : '') +
      (rest.length ? `<div class="muted" style="font-size:12px;margin:14px 0 4px;letter-spacing:.06em;text-transform:uppercase">Otras del plan</div>${rest.map(recRow).join('')}` : '');
    html += `<button class="btn soft block" style="margin-top:14px" data-act="goto-plate-meal">Armar almuerzo o cena con sliders</button>`;
  } else if (PK.tab === 'recipes') {
    const list = allRecipes().filter((r) => (!q || norm(r.name).includes(q)) && (q || r.meals.includes(PK.meal)) && dietOK(macrosOf(r))).slice(0, 40);
    html = list.map(recRow).join('') || '<div class="empty">Sin resultados.</div>';
  } else if (PK.tab === 'foods') {
    const list = allFoods().filter((f) => foodOK(f) && (!q || norm(f.n).includes(q))).slice(0, 60);
    html = list.map(foodRow).join('') || '<div class="empty">Sin resultados.</div>';
    html += `<button class="btn soft block" style="margin-top:14px" data-act="food-form">+ Crear alimento nuevo</button>`;
  } else if (PK.tab === 'quick') {
    html = `<p class="muted" style="margin:0 0 12px;font-size:14px">Cargá solo los números. Ideal para comidas afuera o algo que no querés armar.</p>
      <label class="field"><span>Nombre (opcional)</span><input id="q-n" placeholder="Ej: Almuerzo en el trabajo" data-in="q-in"></label>
      <div class="grid4"><label class="field"><span>kcal</span><input id="q-k" type="number" inputmode="numeric" data-in="q-in"></label><label class="field"><span>Prot</span><input id="q-p" type="number" inputmode="numeric" data-in="q-in"></label><label class="field"><span>Carb</span><input id="q-c" type="number" inputmode="numeric" data-in="q-in"></label><label class="field"><span>Gras</span><input id="q-f" type="number" inputmode="numeric" data-in="q-in"></label></div>
      <div class="card" style="padding:14px"><h3>Impacto en tu día</h3>${impactHTML()}</div>
      <button class="btn block" id="q-add" data-act="quick-add">Agregar</button>`;
  }
  box.innerHTML = html;
  if (PK.tab === 'quick') paintQuick();
}
function paintQuick() {
  const v = (id) => parseFloat($(id).value) || 0;
  const p = v('#q-p'), c = v('#q-c'), f = v('#q-f');
  const k = v('#q-k') || p * 4 + c * 4 + f * 9;
  setImpact($('#pk-list'), { k, p, c, f }, PK.date);
  $('#q-add').textContent = k ? `Agregar · ${n0(k)} kcal` : 'Agregar';
}

// ---------- detalle de alimento ----------
let FD = null;
function openFoodDetail(fid) {
  const f = FM()[fid];
  if (!f) return;
  const cfg = rangeCfg(f), pg = foodPer(f);
  const unitFirst = !!f.only;
  FD = { f, pg, cfg, unit: unitFirst, q: unitFirst ? 1 : f.def, meal: PK ? PK.meal : slotByHour(UI.date), date: PK ? PK.date : UI.date };
  const hasU = !!f.u;
  const body = `<button class="link" data-act="pk-back" style="margin:-4px 0 8px">‹ Volver</button>
    <div class="detail-hero"><div class="big"><span id="fd-q">0</span><small id="fd-u"> g</small></div><div class="muted" id="fd-h" style="min-height:18px;font-size:13px;margin-top:4px"></div></div>
    ${hasU && !f.only ? `<div class="segmented" style="margin:6px 0 12px"><button data-act="fd-mode" data-v="g" class="on">Gramos</button><button data-act="fd-mode" data-v="u">${esc(pl(2, f.u.n))}</button></div>` : ''}
    <div class="ing-ctl" style="margin-bottom:12px"><button class="sb" data-act="fd-step" data-d="-1">−</button><div class="rng"><input type="range" id="fd-r" data-in="fd-r" style="--col:${GROUP_COL[plateGroup(f)]}"></div><button class="sb" data-act="fd-step" data-d="1">+</button></div>
    <div class="macro-chips" style="grid-template-columns:repeat(4,1fr);margin:0 0 12px">${['k', 'p', 'c', 'f'].map((m) => `<div class="mchip"><b data-fm="${m}">0</b><small>${m === 'k' ? 'kcal' : MLABEL[m].slice(0, 4)}</small><i style="background:${COL[m]}"></i></div>`).join('')}</div>
    <div class="card" style="padding:14px"><h3>Impacto en tu día</h3>${impactHTML()}</div>
    <div class="card"><h3>Agregar a</h3><div class="chips">${MEALS.map((m) => `<button class="chip ${FD.meal === m.id ? 'on' : ''}" data-act="fd-meal" data-meal="${m.id}">${m.n}</button>`).join('')}</div></div>`;
  setSheetTitle(esc(fname(f)));
  setSheetBody(body, `<button class="btn" id="fd-add" data-act="fd-add">Agregar</button>`);
  fdConfigure();
}
function fdConfigure() {
  const { f, cfg } = FD, el = sheetEl(), r = $('#fd-r', el);
  if (FD.unit) { r.min = 0; r.max = f.only ? 4 : 8; r.step = f.u.step; if (!FD.keepQ) FD.q = f.only ? 1 : Math.max(f.u.step, Math.round(f.def / f.u.g / f.u.step) * f.u.step); }
  else { r.min = cfg.min; r.max = cfg.max; r.step = cfg.step; if (!FD.keepQ) FD.q = f.def; }
  FD.keepQ = false;
  r.value = FD.q;
  paintFood(true);
}
function fdMac() {
  const { f, pg } = FD, per = FD.unit ? f.u.g : 1;
  return { k: pg.k * per * FD.q, p: pg.p * per * FD.q, c: pg.c * per * FD.q, f: pg.f * per * FD.q };
}
function paintFood(animate) {
  const el = sheetEl(), { f } = FD, m = fdMac();
  $('#fd-q', el).textContent = FD.unit ? n1(FD.q) : n0(FD.q);
  $('#fd-u', el).textContent = FD.unit ? ' ' + pl(FD.q, f.u.n) : ' g';
  $('#fd-h', el).textContent = FD.unit ? (f.only ? '' : `≈ ${n0(FD.q * f.u.g)} g`) : gHint(f, FD.q);
  for (const k of ['k', 'p', 'c', 'f']) $(`[data-fm="${k}"]`, el).textContent = n0(m[k]);
  const r = $('#fd-r', el); r.value = FD.q; fillRange(r);
  setImpact(el, m, FD.date);
  $('#fd-add', el).textContent = `Agregar · ${n0(m.k)} kcal`;
  $$('[data-act="fd-mode"]', el).forEach((b) => b.classList.toggle('on', (b.dataset.v === 'u') === FD.unit));
}

// ---------- editar entrada del diario ----------
let ED = null;
function openEntry(id) {
  const e = findEntry(UI.date, id);
  if (!e) return;
  ED = { id, qty: e.qty, meal: e.m, date: UI.date };
  const isG = e.unit === 'g';
  const body = `<div class="detail-hero"><div class="big"><span id="ed-q">0</span><small id="ed-u"></small></div><div class="muted" style="font-size:13px;margin-top:4px">${esc(e.items && e.unit === 'plato' ? qtyText(e) : '')}</div></div>
    <div class="ing-ctl" style="margin-bottom:12px"><button class="sb" data-act="ed-step" data-d="-1">−</button><div class="rng"><input type="range" id="ed-r" data-in="ed-r" min="${e.min ?? 0}" max="${e.max ?? 10}" step="${e.step ?? 1}" value="${e.qty}" style="--col:var(--bordo)"></div><button class="sb" data-act="ed-step" data-d="1">+</button></div>
    <div class="macro-chips" style="grid-template-columns:repeat(4,1fr);margin:0 0 12px">${['k', 'p', 'c', 'f'].map((m) => `<div class="mchip"><b data-em="${m}">0</b><small>${m === 'k' ? 'kcal' : MLABEL[m].slice(0, 4)}</small><i style="background:${COL[m]}"></i></div>`).join('')}</div>
    <div class="card" style="padding:14px"><h3>Impacto en tu día</h3>${impactHTML()}</div>
    <div class="card"><h3>Mover a</h3><div class="chips">${MEALS.map((m) => `<button class="chip ${ED.meal === m.id ? 'on' : ''}" data-act="ed-meal" data-meal="${m.id}">${m.n}</button>`).join('')}</div></div>
    ${e.items ? '<button class="btn soft block" data-act="ed-plate" style="margin-bottom:10px">Editar ingredientes en el plato</button>' : ''}
    <button class="btn danger block" data-act="ed-delete">Eliminar</button>`;
  openSheet({ title: esc(e.name), body, foot: `<button class="btn" data-act="ed-save">Guardar</button>`, onMount: () => paintEntry() });
}
function paintEntry() {
  const e = findEntry(ED.date, ED.id), el = sheetEl();
  if (!e || !el) return;
  const isG = e.unit === 'g';
  $('#ed-q', el).textContent = isG ? n0(ED.qty) : n1(ED.qty);
  $('#ed-u', el).textContent = isG ? ' g' : ' ' + pl(ED.qty, e.unit);
  const m = { k: e.per.k * ED.qty, p: e.per.p * ED.qty, c: e.per.c * ED.qty, f: e.per.f * ED.qty };
  for (const k of ['k', 'p', 'c', 'f']) $(`[data-em="${k}"]`, el).textContent = n0(m[k]);
  const r = $('#ed-r', el); r.value = ED.qty; fillRange(r);
  setImpact(el, m, ED.date, ED.id);
}

// ---------- formularios ----------
let formFromPicker = false;
function openFoodForm() {
  const body = `<label class="field"><span>Nombre</span><input id="nf-n" placeholder="Ej: Galletitas Marolio" autocomplete="off"></label>
    <div class="muted" style="font-size:12px;margin:-4px 0 8px">Valores por 100 g (o 100 ml) de la etiqueta</div>
    <div class="grid4"><label class="field"><span>kcal</span><input id="nf-k" type="number" inputmode="decimal"></label><label class="field"><span>Prot</span><input id="nf-p" type="number" inputmode="decimal"></label><label class="field"><span>Carb</span><input id="nf-c" type="number" inputmode="decimal"></label><label class="field"><span>Gras</span><input id="nf-f" type="number" inputmode="decimal"></label></div>
    <div class="grid2"><label class="field"><span>Unidad (opcional)</span><input id="nf-un" placeholder="porción, scoop…"></label><label class="field"><span>Gramos por unidad</span><input id="nf-ug" type="number" inputmode="decimal" placeholder="30"></label></div>
    <button class="toggle" data-act="nf-gl" id="nf-gl"><span>Contiene gluten</span><span class="sw"></span></button>
    <button class="toggle" data-act="nf-la" id="nf-la"><span>Contiene lactosa</span><span class="sw"></span></button>`;
  openSheet({ title: 'Nuevo alimento', body, foot: `<button class="btn" data-act="nf-save">Guardar alimento</button>` });
}
function saveFood() {
  const v = (id) => parseFloat($(id).value) || 0;
  const n = $('#nf-n').value.trim();
  if (!n) return toast('Poné un nombre');
  const p = v('#nf-p'), c = v('#nf-c'), f = v('#nf-f'), k = v('#nf-k') || Math.round(p * 4 + c * 4 + f * 9);
  if (!k) return toast('Cargá las calorías o los macros');
  const un = $('#nf-un').value.trim(), ug = v('#nf-ug');
  const food = { id: 'u_' + uid(), n, k, p, c, f, cat: 'extra', g: $('#nf-gl').classList.contains('on'), l: $('#nf-la').classList.contains('on'), def: ug && un ? ug : 100 };
  if (un && ug) food.u = { n: un, g: ug, step: 1 };
  S.customFoods.push(food); dropFoodCache(); save();
  toast('Alimento guardado');
  if (formFromPicker && PK) { const { mode, meal, date } = PK; openPicker({ mode, meal, date }); PK.tab = 'foods'; PK.q = n; drawPicker(); }
  else { closeSheet(); if (UI.tab === 'ajustes') render(); }
  formFromPicker = false;
}
function openSaveRecipe() {
  const items = PLATE.items.filter((i) => i.g > 0 && FM()[i.fid]);
  if (!items.length) return toast('El plato está vacío');
  const body = `<label class="field"><span>Nombre de la receta</span><input id="sr-n" value="${esc(PLATE.name || autoName(items))}" autocomplete="off"></label><div class="muted" style="font-size:13px">Se guarda con estos gramos como 1 porción. La vas a encontrar en Recetas → Mías.</div>`;
  openSheet({ title: 'Guardar receta', body, foot: '<button class="btn" data-act="sr-save">Guardar</button>' });
  setTimeout(() => { const i = $('#sr-n'); if (i) { i.focus(); i.select(); } }, 350);
}
function saveRecipeFromPlate() {
  const items = PLATE.items.filter((i) => i.g > 0 && FM()[i.fid]);
  const name = $('#sr-n').value.trim() || autoName(items);
  const has = (re) => items.some((i) => re.test(i.fid));
  const prot = has(/^pollo/) ? 'pollo' : has(/^carne/) ? 'carne' : has(/^cerdo/) ? 'cerdo' : has(/^(pescado|atun)/) ? 'pescado' : has(/^huevo/) ? 'huevo' : null;
  const carb = has(/^arroz/) ? 'arroz' : has(/^fideo/) ? 'fideo' : has(/^papa/) ? 'papa' : has(/^batata/) ? 'batata' : has(/^tapioca/) ? 'tapioca' : has(/^pan/) ? 'pan' : null;
  const meals = ['desayuno', 'merienda', 'media_manana', 'media_tarde'].includes(PLATE.meal) ? [PLATE.meal] : ['almuerzo', 'cena'];
  S.customRecipes.push({ id: 'u_' + uid(), name, meals, prot, carb, ing: items.map((i) => [i.fid, i.g]), steps: [], min: 15 });
  save(); closeSheet(); toast('Receta guardada en “Mías”');
}

// ---------- info / respaldo / listas ----------
function openPlanInfo() {
  const body = `<div class="card"><h3>Estrategia</h3><ul class="ings"><li>4 comidas obligatorias: desayuno, almuerzo, merienda y cena</li><li>Media mañana y media tarde: opcionales según apetito</li><li>1 permitido a la semana</li><li>Comer cada 2 a 4 horas para evitar ansiedad</li></ul></div>
    <div class="card"><h3>Agua y alimentos agresores</h3><ul class="ings"><li>Mínimo 3 litros de agua repartidos en el día</li><li>Evitar <b>gluten</b> y <b>lactosa</b></li></ul></div>
    <div class="card"><h3>Suplementación</h3><ul class="ings">${SUPPS.map((s) => `<li><span>${s.n}</span><span class="g"><small>${s.when}</small></span></li>`).join('')}</ul></div>
    <div class="card"><h3>Recomendaciones</h3><ul class="ings"><li>Edulcorantes o ka'a he'e; nada de azúcar</li><li>Gaseosas solo cero calorías, y solo en caso de ansiedad</li><li>Spray antiadherente o salsa de soja en vez de aceite</li><li>Condimentos aromáticos libres</li><li>Gelatina diet libre (cero calorías)</li><li>Pesarse una vez por semana, misma balanza</li><li>Evitar embutidos, fiambres, paté, chorizos, mortadelas, morcillas y frituras</li></ul></div>
    <div class="note">Cantidades base del plan: carnes 175 g, pescado 225 g, huevo 2 enteros + 2 claras, arroz/fideo 100 g, batata 100 g, papa 150 g, tapioca 50 g o 1 pan de hamburguesa sin gluten.</div>`;
  openSheet({ title: 'Mi plan', body });
}
function openBackup() {
  const json = JSON.stringify(S);
  const body = `<div class="card"><h3>Exportar</h3><p class="muted" style="margin:0 0 10px;font-size:14px">Guardá una copia de todo (diario, recetas, pesos). Podés compartirla a Notas o Archivos.</p>
    <div style="display:flex;gap:8px"><button class="btn block" data-act="bk-share">Compartir archivo</button><button class="btn soft block" data-act="bk-copy">Copiar</button></div></div>
    <div class="card"><h3>Restaurar</h3><p class="muted" style="margin:0 0 10px;font-size:14px">Pegá el respaldo acá. Esto reemplaza lo que tenés ahora.</p>
    <textarea class="paste" id="bk-text" placeholder="Pegá el respaldo…"></textarea><button class="btn ghost block" style="margin-top:10px" data-act="bk-restore">Restaurar</button></div>`;
  openSheet({ title: 'Respaldo', body });
  window.__bk = json;
}
function openMyFoods() {
  const body = S.customFoods.length ? `<div class="pick-list">${S.customFoods.map((f) => `<div class="pick" style="cursor:default"><i class="dd" style="background:var(--c)"></i><span class="n"><b>${esc(f.n)}</b><small>${f.k} kcal · P ${f.p} · C ${f.c} · G ${f.f} por 100 g</small></span><button class="x" data-act="del-food" data-id="${f.id}">✕</button></div>`).join('')}</div>` : '<div class="empty">Todavía no creaste alimentos propios.</div>';
  openSheet({ title: 'Mis alimentos', body, foot: '<button class="btn" data-act="food-form">+ Nuevo alimento</button>' });
}
function openMyRecipes() {
  const body = S.customRecipes.length ? `<div class="pick-list">${S.customRecipes.map((r) => { const m = macrosOf(r); return `<div class="pick" style="cursor:default"><i class="dd" style="background:var(--p)"></i><span class="n"><b>${esc(r.name)}</b><small>${n0(m.k)} kcal · P ${n0(m.p)}</small></span><button class="x" data-act="del-recipe" data-id="${r.id}">✕</button></div>`; }).join('')}</div>` : '<div class="empty">Armá un plato y tocá “Guardar receta”.</div>';
  openSheet({ title: 'Mis recetas', body });
}


// ============================================================================
// DESCRIBIR PLATO: texto + (opcional) foto para medir la porción de cada parte
// ============================================================================
let DS = null;
const GROUP_OF = (fid) => plateGroup(FM()[fid] || { cat: 'extra' });
const measuredIdx = () => DS.parsed.items.map((it, i) => (it.g == null && it.fixedG == null && ['prot', 'carb', 'veg'].includes(GROUP_OF(it.fid)) ? i : -1)).filter((i) => i >= 0);
const roundG = (g, f) => { const st = rangeCfg(f).step; return Math.max(st, Math.round(g / st) * st); };

function openDescribe() {
  DS = { text: '', parsed: { items: [], unknown: [], ignored: [] }, stage: 'text', pstage: 'plate', tool: 'wand', active: 0, tol: 18, brush: 9, cm: S.settings.plateCm || 26, hm: {}, portion: null, img: null, sig: '', counts: null };
  openSheet({ title: 'Describir plato', body: '<div id="ds"></div>', foot: '<button class="btn" id="ds-go" data-act="ds-go">Cargar al plato</button>', onMount: () => { drawDescribe(); setTimeout(() => { const t = $('#ds-text'); if (t) t.focus(); }, 380); } });
}
function reparse() {
  DS.parsed = parseMeal(DS.text, allFoods().filter(foodOK), { avoidGluten: S.settings.avoidGluten });
}
function dsAreaCm2(k) { // k = posición entre las partes medidas (0-based)
  if (!DS.portion || !DS.counts) return 0;
  const frac = DS.counts.c[k + 1] / DS.counts.total;
  const r = DS.cm / 2;
  return frac * Math.PI * r * r;
}
function dsGrams(i) {
  const it = DS.parsed.items[i], f = FM()[it.fid];
  if (it.fixedG != null) return { g: it.fixedG, src: 'fijo' };
  if (it.g != null) return { g: it.g, src: 'texto' };
  const k = measuredIdx().indexOf(i);
  if (DS.portion && k >= 0) {
    const area = dsAreaCm2(k);
    if (area > 1) return { g: area * gpcFor(f, GROUP_OF(it.fid)) * (DS.hm[i] || 1), src: 'foto' };
  }
  return { g: f.def * it.mult, src: 'plan' };
}
function dsColor(i) {
  const idx = measuredIdx(), k = idx.indexOf(i);
  const g = GROUP_OF(DS.parsed.items[i].fid);
  const same = idx.slice(0, k).filter((j) => GROUP_OF(DS.parsed.items[j].fid) === g).length;
  return shade(GROUP_COL[g], same);
}
function dsKcal() {
  return DS.parsed.items.reduce((s, it, i) => { const f = FM()[it.fid], pg = foodPer(f); return s + pg.k * dsGrams(i).g; }, 0);
}
function dsFoot() {
  const b = $('#ds-go');
  if (!b) return;
  const k = dsKcal();
  b.textContent = DS.parsed.items.length ? `Cargar al plato · ${n0(k)} kcal` : 'Cargar al plato';
  b.disabled = !DS.parsed.items.length;
}

function drawDescribe() {
  const box = $('#ds');
  if (!box) return;
  if (DS.stage === 'text') {
    box.innerHTML = `<p class="muted" style="margin:0 0 10px;font-size:14px">Escribí qué comiste, con o sin cantidades. Si querés, sumá una foto para medir la porción de cada parte.</p>
      <textarea class="paste" id="ds-text" rows="3" data-in="ds-text" style="font-family:var(--sans);font-size:16px;height:96px" placeholder="Ej: milanesa de pollo con puré de papa y ensalada, 2 huevos, 150 g de arroz">${esc(DS.text)}</textarea>
      <div class="muted" style="font-size:12px;margin:6px 2px 0">Probá: “arroz con pollo y ensalada” · “bife con mandioca” · “2 huevos con 1 rebanada de pan”</div>
      <div id="ds-chips" style="margin:14px 0 12px"></div>
      <button class="btn soft block" data-act="ds-photo" id="ds-photo-btn">${ICON.camera.replace('<svg', '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')}${DS.portion ? 'Ajustar la foto' : 'Sumar foto para medir porciones'}</button>`;
    drawDsChips();
  } else drawPhotoStep();
  dsFoot();
}
function drawDsChips() {
  const el = $('#ds-chips');
  if (!el) return;
  const { items, unknown, ignored } = DS.parsed;
  if (!items.length && !unknown.length) { el.innerHTML = '<div class="muted" style="font-size:13px;text-align:center;padding:6px 0">Los ingredientes que entienda aparecen acá.</div>'; $('#ds-photo-btn').disabled = true; return; }
  el.innerHTML = `<div class="addrow" style="margin-top:0">${items.map((it, i) => {
    const f = FM()[it.fid], r = dsGrams(i);
    const tag = r.src === 'foto' ? `~${n0(r.g)} g · foto` : r.src === 'plan' ? `~${n0(r.g)} g · plan` : `${n0(r.g)} g`;
    return `<span class="chip on" style="background:var(--card);color:var(--ink);border-color:var(--line);padding-right:6px"><i class="d" style="background:${GROUP_COL[GROUP_OF(it.fid)]}"></i>${esc(shortName(f))} <small class="muted" style="font-weight:450">${tag}</small><button class="x" data-act="ds-rm" data-i="${i}" style="width:22px;height:22px;font-size:11px;margin-left:2px" aria-label="Quitar">✕</button></span>`;
  }).join('')}${unknown.map((u) => `<span class="chip" style="border-style:dashed;color:var(--muted)">¿${esc(u)}?</span>`).join('')}</div>
    ${unknown.length ? '<div class="muted" style="font-size:12px;margin-top:8px">Lo que tiene “¿?” no lo reconocí: sumalo después con “Buscar más…”.</div>' : ''}
    ${ignored.length ? '<div class="muted" style="font-size:12px;margin-top:6px">Bebidas sin calorías: las dejé afuera.</div>' : ''}`;
  const meas = measuredIdx().length;
  const b = $('#ds-photo-btn');
  b.disabled = !meas;
  b.title = meas ? '' : 'Todo tiene cantidad: no hace falta foto';
}

function drawPhotoStep() {
  const box = $('#ds');
  if (!measuredIdx().length) { DS.stage = 'text'; return drawDescribe(); }
  if (!DS.portion) {
    box.innerHTML = `<button class="link" data-act="ds-back" style="margin:-4px 0 8px">‹ Texto</button>
      <label class="photo-drop"><input type="file" accept="image/*" data-in="ph-file" hidden>${ICON.camera}<b>Sacá o elegí una foto del plato</b><small>Mejor desde arriba y con el plato entero a la vista</small></label>`;
    return;
  }
  box.innerHTML = `<button class="link" data-act="ds-back" style="margin:-4px 0 8px">‹ Texto</button>
    <div class="cv-wrap"><canvas id="ph-cv"></canvas></div>
    <div class="segmented" style="margin:10px 0"><button data-act="ph-stage" data-v="plate" class="${DS.pstage === 'plate' ? 'on' : ''}">1 · Plato</button><button data-act="ph-stage" data-v="zones" class="${DS.pstage === 'zones' ? 'on' : ''}">2 · Partes</button></div>
    <div id="ph-ctl"></div>
    <div class="card" id="ph-res" style="margin:12px 0 8px"></div>
    <button class="btn ghost sm" data-act="ph-newphoto">Cambiar foto</button>`;
  drawPhotoCtl();
  mountEditor();
}
function drawPhotoCtl() {
  const el = $('#ph-ctl');
  if (!el) return;
  if (DS.pstage === 'plate') {
    el.innerHTML = `<div class="muted" style="font-size:13px;margin-bottom:10px">Arrastrá el círculo para que calce con el borde del plato y ajustá su tamaño.</div>
      <div class="ing-ctl" style="margin-bottom:8px"><div class="rng"><input type="range" min="20" max="62" step="1" value="${Math.round((DS.portion.circle.r / Math.min(DS.portion.W, DS.portion.H)) * 100)}" data-in="ph-r" style="--col:var(--bordo)" aria-label="Tamaño del círculo"></div></div>
      <div class="muted" style="font-size:12px;margin:2px 0 6px;letter-spacing:.06em;text-transform:uppercase;font-weight:650">Diámetro real del plato</div>
      <div class="chips" style="margin-bottom:4px">${[20, 22, 24, 26, 28, 30].map((c) => `<button class="chip ${DS.cm === c ? 'on' : ''}" data-act="ph-cm" data-v="${c}">${c} cm</button>`).join('')}</div>
      <button class="btn block" style="margin-top:12px" data-act="ph-stage" data-v="zones">Siguiente: marcar las partes</button>`;
  } else {
    const idx = measuredIdx();
    el.innerHTML = `<div class="chips" style="margin-bottom:10px">${idx.map((i, k) => `<button class="chip ${DS.active === k ? 'on' : ''}" data-act="ph-comp" data-k="${k}"><i class="d" style="background:${dsColor(i)}"></i>${esc(shortName(FM()[DS.parsed.items[i].fid]))}</button>`).join('')}</div>
      <div class="segmented" style="margin-bottom:10px"><button data-act="ph-tool" data-v="wand" class="${DS.tool === 'wand' ? 'on' : ''}">Varita</button><button data-act="ph-tool" data-v="brush" class="${DS.tool === 'brush' ? 'on' : ''}">Pincel</button><button data-act="ph-tool" data-v="erase" class="${DS.tool === 'erase' ? 'on' : ''}">Borrar</button></div>
      <div class="ihead" style="margin-bottom:0"><span class="l">${DS.tool === 'wand' ? 'Sensibilidad de la varita' : 'Tamaño del pincel'}</span></div>
      <div class="ing-ctl"><div class="rng"><input type="range" min="${DS.tool === 'wand' ? 6 : 3}" max="${DS.tool === 'wand' ? 45 : 30}" step="1" value="${DS.tool === 'wand' ? DS.tol : DS.brush}" data-in="ph-size" style="--col:var(--bordo)"></div></div>
      <div class="muted" style="font-size:13px;margin:0 0 10px">${DS.tool === 'wand' ? 'Tocá una parte del plato y se rellena sola. Si se pasa, bajá la sensibilidad.' : 'Pintá con el dedo sobre la parte elegida.'}</div>
      <div style="display:flex;gap:8px"><button class="btn sm soft" style="flex:1" data-act="ph-auto">Sugerir zonas</button><button class="btn sm ghost" data-act="ph-undo">Deshacer</button><button class="btn sm ghost" data-act="ph-clear">Limpiar</button></div>`;
  }
}
function mountEditor() {
  const P = DS.portion, cv = $('#ph-cv');
  if (!cv) return;
  const refresh = () => { P.paintOverlay(measuredIdx().map(dsColor)); DS.counts = P.counts(measuredIdx().length); drawCanvas(); paintResults(); drawDsChips(); dsFoot(); };
  DS.refresh = refresh;
  const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * P.W, y: ((e.clientY - r.top) / r.height) * P.H }; };
  let drag = null, raf = 0;
  const later = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; refresh(); }); };
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    const p = pt(e);
    drag = { sx: p.x, sy: p.y, ox: P.circle.cx, oy: P.circle.cy, moved: false };
    if (DS.pstage === 'zones' && DS.tool !== 'wand') { P.snapshot(); P.brush(p.x, p.y, DS.brush, DS.tool === 'erase' ? 0 : DS.active + 1); later(); }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pt(e);
    if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 3) drag.moved = true;
    if (DS.pstage === 'plate') {
      P.circle.cx = clamp(drag.ox + p.x - drag.sx, 0, P.W); P.circle.cy = clamp(drag.oy + p.y - drag.sy, 0, P.H); later();
    } else if (DS.tool !== 'wand') { P.brush(p.x, p.y, DS.brush, DS.tool === 'erase' ? 0 : DS.active + 1); later(); }
  });
  const end = (e) => {
    if (!drag) return;
    const p = pt(e);
    if (DS.pstage === 'zones' && DS.tool === 'wand' && !drag.moved) {
      const n = P.wand(p.x, p.y, DS.active + 1, DS.tol);
      if (!n) toast('Esa zona se mezcla con el plato: usá el pincel o bajá la sensibilidad');
      else if (P.lastTol < DS.tol - 0.5) toast('Era muy grande: bajé la sensibilidad solo para esta zona');
      later();
    }
    drag = null;
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', () => { drag = null; });
  requestAnimationFrame(refresh);
}
function drawCanvas() {
  const cv = $('#ph-cv'), P = DS.portion;
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), cssW = cv.clientWidth || 340;
  const w = Math.round(cssW * dpr), h = Math.round((cssW * P.H / P.W) * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const ctx = cv.getContext('2d'), s = w / P.W;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(DS.img, 0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(P.overlayCanvas, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  const { cx, cy, r } = P.circle;
  ctx.save();
  ctx.fillStyle = 'rgba(40,22,16,.38)';
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.arc(cx * s, cy * s, r * s, 0, Math.PI * 2, true); ctx.fill('evenodd');
  ctx.setLineDash([10 * dpr, 7 * dpr]); ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = '#FBF5EA';
  ctx.beginPath(); ctx.arc(cx * s, cy * s, r * s, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function paintResults() {
  const el = $('#ph-res');
  if (!el) return;
  const idx = measuredIdx();
  el.innerHTML = `<h3>Porción estimada <span class="r">plato de ${DS.cm} cm</span></h3>${idx.map((i, k) => {
    const it = DS.parsed.items[i], f = FM()[it.fid], g = dsGrams(i), frac = DS.counts ? DS.counts.c[k + 1] / DS.counts.total : 0;
    return `<div class="irow comp" style="margin-bottom:14px"><div class="ihead"><span class="l"><i class="d" style="background:${dsColor(i)};border-radius:3px"></i>${esc(shortName(f))}</span><span class="v"><b>${g.src === 'foto' ? n0(g.g) : '—'}</b> g · ${n0(frac * 100)}% del plato</span></div>
      <div class="track"><i style="background:${dsColor(i)};width:${clamp(frac * 100 * 1.6, 0, 100)}%"></i></div>
      <div class="chips" style="margin:6px 0 0;padding:0"><span class="muted" style="font-size:12px;align-self:center">Altura:</span>${[[0.75, 'Baja'], [1, 'Normal'], [1.3, 'Alta']].map(([v, l]) => `<button class="chip ${(DS.hm[i] || 1) === v ? 'on' : ''}" style="height:30px;font-size:13px" data-act="ph-h" data-i="${i}" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  }).join('')}<div class="muted" style="font-size:12px">Es una estimación: la foto no ve el espesor. Después podés afinar los gramos en el plato.</div>`;
}
async function dsFile(file) {
  if (!file) return;
  try {
    DS.img = await loadImage(file);
    DS.portion = new Portion(DS.img);
    DS.hm = {}; DS.active = 0; DS.pstage = 'plate'; DS.sig = measuredIdx().map((i) => DS.parsed.items[i].fid).join(',');
    drawPhotoStep();
  } catch (e) { toast('No pude abrir esa foto'); }
}
function dsGo() {
  if (!DS.parsed.items.length) return toast('Escribí qué comiste');
  const items = DS.parsed.items.map((it, i) => [it.fid, roundG(dsGrams(i).g, FM()[it.fid])]);
  S.settings.plateCm = DS.cm; save();
  const meal = PLATE.meal;
  loadPlate(items, meal, '');
  toast('Plato armado: ajustá los gramos si hace falta');
}

// ============================================================================
// Acciones (clicks)
// ============================================================================
const ACT = {
  describe: () => openDescribe(),
  'ds-go': dsGo,
  'ds-rm': (el) => { const i = +el.dataset.i; DS.parsed.items.splice(i, 1); drawDsChips(); dsFoot(); },
  'ds-photo': () => {
    const sig = measuredIdx().map((i) => DS.parsed.items[i].fid).join(',');
    if (DS.portion && DS.sig !== sig) { DS.portion.labels.fill(0); DS.hm = {}; DS.active = 0; }
    DS.sig = sig; DS.stage = 'photo'; drawDescribe();
  },
  'ds-back': () => { DS.stage = 'text'; drawDescribe(); },
  'ph-stage': (el) => { DS.pstage = el.dataset.v; $$('[data-act="ph-stage"]').forEach((b) => b.classList.toggle('on', b.dataset.v === DS.pstage && b.closest('.segmented'))); drawPhotoCtl(); },
  'ph-cm': (el) => { DS.cm = +el.dataset.v; drawPhotoCtl(); DS.refresh(); },
  'ph-comp': (el) => { DS.active = +el.dataset.k; drawPhotoCtl(); },
  'ph-tool': (el) => { DS.tool = el.dataset.v; drawPhotoCtl(); },
  'ph-auto': () => {
    const groups = measuredIdx().map((i) => GROUP_OF(DS.parsed.items[i].fid));
    if (!DS.portion.suggest(groups)) toast('No pude separar por color; marcá con la varita');
    else toast('Revisá las zonas y corregí con la varita');
    DS.refresh();
  },
  'ph-undo': () => { if (!DS.portion.undo()) toast('Nada para deshacer'); DS.refresh(); },
  'ph-clear': () => { DS.portion.clear(); DS.refresh(); },
  'ph-h': (el) => { DS.hm[+el.dataset.i] = +el.dataset.v; DS.refresh(); },
  'ph-newphoto': () => { DS.portion = null; DS.img = null; drawPhotoStep(); },
  tab: (el) => { UI.tab = el.dataset.tab; window.scrollTo(0, 0); render(); },
  'sheet-close': () => closeSheet(),
  'goto-plate': () => { UI.tab = 'plato'; window.scrollTo(0, 0); render(); },
  'goto-plate-meal': () => { const m = PK ? PK.meal : null; closeSheet(true); if (m) PLATE.meal = m; savePlate(); UI.tab = 'plato'; window.scrollTo(0, 0); render(); },
  'goto-fit': () => { UI.rf = { q: '', prot: null, carb: null, meal: slotByHour(UI.date), fav: false, mine: false, fit: true, limit: 50 }; UI.tab = 'recetas'; window.scrollTo(0, 0); render(); },
  // fecha
  'date-prev': () => { UI.date = addDays(UI.date, -1); render(); },
  'date-next': () => { if (UI.date < todayISO()) { UI.date = addDays(UI.date, 1); render(); } },
  'date-today': () => { UI.date = todayISO(); render(); },
  // hoy
  'add-meal': (el) => openPicker({ mode: 'diary', meal: el.dataset.meal }),
  'opt-meal': (el) => { S.showOpt[el.dataset.meal] = true; save(); render(); },
  entry: (el) => openEntry(el.dataset.id),
  water: (el) => { addWater(UI.date, +el.dataset.ml); render(); },
  'supp-open': () => { UI.supOpen = !UI.supOpen; render(); },
  supp: (el) => { toggleSupp(UI.date, el.dataset.id); render(); },
  allowed: () => { const a = allowedOf(UI.date); setAllowed(UI.date, !a.used); render(); toast(a.used ? 'Permitido disponible' : 'Permitido usado, disfrutalo'); },
  targets: () => openTargets(),
  'targets-save': saveTargets,
  'open-recipe': (el, ev) => { if (ev.target.closest('[data-act="sug-add"]')) return; openRecipe(el.dataset.id, { mult: +el.dataset.mult || 1, meal: el.dataset.meal }); },
  'sug-add': (el) => {
    const r = getRecipe(el.dataset.id), mult = +el.dataset.mult || 1;
    addEntry(UI.date, recipeEntry(r, mult, el.dataset.meal)); pushRecent('recipe', r.id); render(); toast(`Agregado a ${mealName(el.dataset.meal)}`);
  },
  // plato
  'plate-meal': (el) => { PLATE.meal = el.dataset.meal; savePlate(); render(); },
  'plate-tpl': (el) => { PLATE.items = TPL[+el.dataset.i].items.map(([f, g]) => mkItem(f, g)); PLATE.editing = null; PLATE.name = ''; savePlate(); render(); paintPlate(true); },
  'plate-pg': (el) => { UI.pg = el.dataset.g; render(); },
  'plate-food': (el) => {
    const fid = el.dataset.fid, ex = PLATE.items.find((i) => i.fid === fid);
    if (ex) { PLATE.items = PLATE.items.filter((i) => i !== ex); savePlate(); render(); paintPlate(true); } else plateAddFood(fid);
  },
  'plate-more': () => openPicker({ mode: 'plate' }),
  'plate-rm': (el) => { PLATE.items = PLATE.items.filter((i) => i.u !== el.dataset.uid); savePlate(); render(); paintPlate(true); },
  'plate-step': (el) => {
    const it = PLATE.items.find((i) => i.u === el.dataset.uid), f = FM()[it.fid], cfg = rangeCfg(f);
    it.g = clamp(it.g + +el.dataset.d, cfg.min, cfg.max); savePlate(); paintPlate(true);
  },
  seg: (el) => { const row = $(`.ing[data-uid="${el.dataset.uid}"]`); if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.remove('pulse'); void row.offsetWidth; row.classList.add('pulse'); } },
  'plate-clear': () => { PLATE.items = []; PLATE.editing = null; PLATE.name = ''; savePlate(); render(); },
  'plate-fit': () => {
    const sh = shareForMeal(UI.date, PLATE.meal);
    if (sh.k < 120) return toast('Ya cubriste casi todo tu día');
    const fixed = PLATE.items.filter((i) => ['veg', 'fat'].includes(plateGroup(FM()[i.fid] || { cat: 'extra' })));
    const scal = PLATE.items.filter((i) => !fixed.includes(i));
    const fk = sumItems(fixed).k, sk = sumItems(scal).k;
    if (!sk) return toast('Sumá una proteína o un hidrato primero');
    const f = clamp((sh.k - fk) / sk, 0.4, 2.2);
    scal.forEach((i) => { const cfg = rangeCfg(FM()[i.fid]); i.g = clamp(Math.round((i.g * f) / cfg.step) * cfg.step, cfg.step, cfg.max); });
    savePlate(); paintPlate(true); toast(`Ajustado a ~${n0(sh.k)} kcal para ${mealName(PLATE.meal).toLowerCase()}`);
  },
  'plate-commit': commitPlate,
  'plate-save': openSaveRecipe,
  'sr-save': saveRecipeFromPlate,
  // recetas
  'rf-fit': () => { UI.rf.fit = !UI.rf.fit; render(); },
  'rf-fav': () => { UI.rf.fav = !UI.rf.fav; render(); },
  'rf-mine': () => { UI.rf.mine = !UI.rf.mine; render(); },
  'rf-prot': (el) => { UI.rf.prot = UI.rf.prot === el.dataset.v ? null : el.dataset.v; UI.rf.limit = 50; render(); },
  'rf-carb': (el) => { UI.rf.carb = UI.rf.carb === el.dataset.v ? null : el.dataset.v; UI.rf.limit = 50; render(); },
  'rf-meal': (el) => { UI.rf.meal = UI.rf.meal === el.dataset.v ? null : el.dataset.v; UI.rf.limit = 50; render(); },
  'rf-more': () => { UI.rf.limit += 50; render(); },
  'rc-step': (el) => { RC.mult = clamp(RC.mult + +el.dataset.d, 0.25, 3); paintRecipe(false); },
  'rc-oil': () => { RC.oil = !RC.oil; paintRecipe(false); },
  'rc-meal': (el) => { RC.meal = el.dataset.meal; $$('[data-act="rc-meal"]', sheetEl()).forEach((b) => b.classList.toggle('on', b.dataset.meal === RC.meal)); },
  'rc-fav': () => { const i = S.favRecipes.indexOf(RC.r.id); if (i >= 0) S.favRecipes.splice(i, 1); else S.favRecipes.push(RC.r.id); save(); paintRecipe(false); if (UI.tab === 'recetas') render(); },
  'rc-add': () => {
    const e = recipeEntry(RC.r, RC.mult, RC.meal);
    if (RC.oil) { const o = FM().aceite_oliva, pg = foodPer(o); e.per = { k: e.per.k + (pg.k * 13) / RC.mult, p: e.per.p, c: e.per.c, f: e.per.f + (pg.f * 13) / RC.mult }; e.items.push({ fid: 'aceite_oliva', g: 13 / RC.mult }); }
    addEntry(RC.date, e); pushRecent('recipe', RC.r.id); closeSheet(); render(); toast(`Agregado a ${mealName(RC.meal)}`);
  },
  'rc-plate': () => loadPlate(rcItems().map(([f, g]) => [f, Math.round(g)]), RC.meal, RC.r.name),
  'rc-delete': () => { S.customRecipes = S.customRecipes.filter((r) => r.id !== RC.r.id); S.favRecipes = S.favRecipes.filter((i) => i !== RC.r.id); save(); closeSheet(); render(); toast('Receta eliminada'); },
  // picker
  'pk-tab': (el) => { PK.tab = el.dataset.tab; PK.q = ''; drawPicker(); },
  'pk-pick': (el) => {
    if (el.dataset.type === 'recipe') { const m = PK.meal, d = PK.date; PK.back = true; openRecipe(el.dataset.id, { meal: m }); RC.date = d; return; }
    if (PK.mode === 'plate') { closeSheet(); plateAddFood(el.dataset.id); toast('Sumado al plato'); return; }
    openFoodDetail(el.dataset.id);
  },
  'pk-back': () => { openPicker({ mode: PK.mode, meal: PK.meal, date: PK.date }); },
  'quick-add': () => {
    const v = (id) => parseFloat($(id).value) || 0, p = v('#q-p'), c = v('#q-c'), f = v('#q-f'), k = v('#q-k') || p * 4 + c * 4 + f * 9;
    if (!k) return toast('Cargá calorías o macros');
    addEntry(PK.date, { m: PK.meal, name: $('#q-n').value.trim() || 'Comida rápida', qty: 1, unit: 'porción', step: 0.5, min: 0.5, max: 4, per: { k, p, c, f }, src: { t: 'quick' } });
    closeSheet(); render(); toast(`Agregado a ${mealName(PK.meal)}`);
  },
  // detalle alimento
  'fd-mode': (el) => { FD.unit = el.dataset.v === 'u'; fdConfigure(); },
  'fd-step': (el) => { const r = $('#fd-r'), st = +r.step; FD.q = clamp(FD.q + +el.dataset.d * (FD.unit ? st : st), +r.min, +r.max); paintFood(); },
  'fd-meal': (el) => { FD.meal = el.dataset.meal; $$('[data-act="fd-meal"]', sheetEl()).forEach((b) => b.classList.toggle('on', b.dataset.meal === FD.meal)); },
  'fd-add': () => {
    const { f, pg } = FD, per = FD.unit ? f.u.g : 1;
    const cfg = rangeCfg(f);
    addEntry(FD.date, {
      m: FD.meal, name: fname(f), qty: FD.q, unit: FD.unit ? f.u.n : 'g', step: FD.unit ? f.u.step : cfg.step, min: 0, max: FD.unit ? 8 : cfg.max,
      per: { k: pg.k * per, p: pg.p * per, c: pg.c * per, f: pg.f * per }, src: { t: 'food', id: f.id },
    });
    pushRecent('food', f.id); closeSheet(); render(); toast(`Agregado a ${mealName(FD.meal)}`);
  },
  // editar entrada
  'ed-step': (el) => { const e = findEntry(ED.date, ED.id), r = $('#ed-r'); ED.qty = clamp(ED.qty + +el.dataset.d * +r.step, +r.min, +r.max); paintEntry(); },
  'ed-meal': (el) => { ED.meal = el.dataset.meal; $$('[data-act="ed-meal"]', sheetEl()).forEach((b) => b.classList.toggle('on', b.dataset.meal === ED.meal)); },
  'ed-save': () => { const e = findEntry(ED.date, ED.id); e.qty = ED.qty; e.m = ED.meal; save(); closeSheet(); render(); },
  'ed-delete': () => { removeEntry(ED.date, ED.id); closeSheet(); render(); toast('Eliminado'); },
  'ed-plate': () => {
    const e = findEntry(ED.date, ED.id);
    loadPlate(e.items.map((i) => [i.fid, Math.max(1, Math.round(i.g * ED.qty))]), ED.meal, e.name, { id: e.id });
  },
  // formularios
  'food-form': (el) => { formFromPicker = !!(el.closest('#pk-list') && PK); openFoodForm(); },
  'nf-gl': (el) => el.classList.toggle('on'),
  'nf-la': (el) => el.classList.toggle('on'),
  'nf-save': saveFood,
  'del-food': (el) => { S.customFoods = S.customFoods.filter((f) => f.id !== el.dataset.id); dropFoodCache(); save(); openMyFoods(); },
  'del-recipe': (el) => { S.customRecipes = S.customRecipes.filter((r) => r.id !== el.dataset.id); save(); openMyRecipes(); },
  // progreso / ajustes
  'weight-save': () => { const v = parseFloat($('#w-kg').value); if (!(v > 20 && v < 300)) return toast('Ingresá un peso válido'); addWeight(todayISO(), v); render(); toast('Peso guardado'); },
  'set-toggle': (el) => { S.settings[el.dataset.k] = !S.settings[el.dataset.k]; save(); render(); },
  'set-carb': (el) => { S.settings.carbState = el.dataset.v; save(); render(); toast(`Pesos en ${el.dataset.v === 'cocido' ? 'cocido' : 'crudo'}`); },
  'plan-info': openPlanInfo,
  'my-foods': openMyFoods,
  'my-recipes': openMyRecipes,
  backup: openBackup,
  'bk-copy': async () => { try { await navigator.clipboard.writeText(window.__bk); toast('Respaldo copiado'); } catch (e) { toast('No se pudo copiar'); } },
  'bk-share': async () => {
    const file = new File([window.__bk], `plato-respaldo-${todayISO()}.json`, { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Respaldo Plato' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); }
    } catch (e) { /* cancelado */ }
  },
  'bk-restore': () => {
    try {
      const d = JSON.parse($('#bk-text').value);
      if (!d || !d.settings) throw new Error('x');
      replaceState(d); toast('Datos restaurados'); setTimeout(() => location.reload(), 600);
    } catch (e) { toast('El texto no es un respaldo válido'); }
  },
  reset: () => {
    openSheet({ title: '¿Borrar todo?', body: '<p style="margin:0;font-size:15px">Se elimina el diario, tus recetas, alimentos y pesos de este dispositivo. No se puede deshacer.</p>', foot: '<button class="btn ghost" data-act="sheet-close">Cancelar</button><button class="btn danger" data-act="reset-ok">Borrar</button>' });
  },
  'reset-ok': () => { resetState(); location.reload(); },
};

const INP = {
  'ds-text': (el) => { DS.text = el.value; clearTimeout(INP._d); INP._d = setTimeout(() => { reparse(); drawDsChips(); dsFoot(); }, 140); },
  'ph-file': (el) => dsFile(el.files && el.files[0]),
  'ph-r': (el) => { const P = DS.portion; P.circle.r = (+el.value / 100) * Math.min(P.W, P.H); DS.refresh(); },
  'ph-size': (el) => { if (DS.tool === 'wand') DS.tol = +el.value; else DS.brush = +el.value; },
  'rf-q': (el) => { UI.rf.q = el.value; UI.rf.limit = 50; clearTimeout(INP._t); INP._t = setTimeout(() => { const pos = el.selectionStart; render(); const n = $('input[data-in="rf-q"]'); n.focus(); n.setSelectionRange(pos, pos); }, 220); },
  'pk-q': (el) => { PK.q = el.value; drawPickerList(); },
  'plate-g': (el) => { const it = PLATE.items.find((i) => i.u === el.dataset.uid); if (!it) return; it.g = +el.value; savePlate(); paintPlate(false); },
  'rc-mult': (el) => { RC.mult = +el.value; paintRecipe(false); },
  'fd-r': (el) => { FD.q = +el.value; paintFood(); },
  'ed-r': (el) => { ED.qty = +el.value; paintEntry(); },
  't-in': () => paintTargets(),
  'q-in': () => paintQuick(),
  prof: (el) => { const k = el.dataset.k; S.settings[k] = el.type === 'number' ? (parseFloat(el.value) || 0) : el.value; save(); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (fn) fn(el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-in="ph-file"]');
  if (el) INP['ph-file'](el);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-in]');
  if (el && INP[el.dataset.in]) INP[el.dataset.in](el, e);
});

// al volver a la app (otro día) refrescamos la fecha
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && UI._today !== todayISO()) {
    if (UI.date === UI._today) UI.date = todayISO();
    UI._today = todayISO();
    if (!sheetEl()) render();
  }
});
UI._today = todayISO();

// ============================================================================
// Inicio
// ============================================================================
render();
window.__booted = true;
if (!S.settings.onboarded && !targets().isSet) setTimeout(() => { if (!sheetEl()) openTargets(); }, 450);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
