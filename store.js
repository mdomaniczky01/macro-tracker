import { FOODS, perGram } from './foods.js';
import { BASE_RECIPES, recipeMacros } from './recipes.js';

const KEY = 'plato.v1';

export const MEALS = [
  { id: 'desayuno', n: 'Desayuno', main: true },
  { id: 'media_manana', n: 'Media mañana', main: false },
  { id: 'almuerzo', n: 'Almuerzo', main: true },
  { id: 'media_tarde', n: 'Media tarde', main: false },
  { id: 'merienda', n: 'Merienda', main: true },
  { id: 'cena', n: 'Cena', main: true },
];
export const MAINS = MEALS.filter((m) => m.main).map((m) => m.id);
export const mealName = (id) => (MEALS.find((m) => m.id === id) || {}).n || id;

export const SUPPS = [
  { id: 'multi', when: 'Desayuno', n: '1 multivitamínico' },
  { id: 'd3k2', when: 'Desayuno', n: 'Vitamina D3 + K2 (5000 UI)' },
  { id: 'creatina', when: 'Desayuno', n: 'Creatina monohidratada 5 g' },
  { id: 'cromo', when: 'Almuerzo', n: 'Picolinato de cromo (si hay ansiedad)', opt: true },
  { id: 'magnesio', when: 'Antes de dormir', n: 'Glicinato de magnesio 400–500 mg' },
  { id: 'omega', when: 'Antes de dormir', n: 'Omega 3 · 2 comprimidos (840 mg)' },
  { id: 'vitc', when: 'Antes de dormir', n: 'Vitamina C 1 g' },
];

const defaults = () => ({
  v: 1,
  settings: {
    name: 'Mauricio', age: 24, height: 175,
    targets: { k: null, p: null, c: null, f: null, kManual: false },
    carbState: 'cocido', avoidGluten: true, avoidLact: true, waterGoal: 3000, onboarded: false,
  },
  log: {}, water: {}, supps: {},
  weights: [{ d: '2026-10-15', kg: 75.3 }],
  allowed: {}, customFoods: [], customRecipes: [], favRecipes: [], recents: [], showOpt: {}, plateDraft: null,
});

function merge(a, b) {
  for (const k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) a[k] = merge(a[k], b[k]);
    else a[k] = b[k];
  }
  return a;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(defaults(), JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return defaults();
}

export let S = load();
let timer;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }, 120);
}
export function replaceState(obj) { S = merge(defaults(), obj); dropFoodCache(); save(); }
export function resetState() { S = defaults(); dropFoodCache(); try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
export const uid = () => Math.random().toString(36).slice(2, 9);

// ---------------- fechas ----------------
export const iso = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const todayISO = () => iso(new Date());
export const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
export const weekStart = (s) => { const d = parseISO(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); };
const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const dowName = (s) => DOW[parseISO(s).getDay()];
export const prettyDate = (s) => { const d = parseISO(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
export const shortDate = (s) => { const d = parseISO(s); return `${d.getDate()}/${d.getMonth() + 1}`; };

// ---------------- alimentos y recetas ----------------
export const allFoods = () => [...FOODS, ...S.customFoods.map((f) => ({ ...f, custom: true }))];
let fmCache = null, fmKey = '';
export const foodMap = () => {
  const key = S.customFoods.map((f) => f.id).join(',');
  if (fmCache && fmKey === key) return fmCache;
  fmKey = key;
  fmCache = Object.fromEntries(allFoods().map((f) => [f.id, f]));
  return fmCache;
};
export const dropFoodCache = () => { fmCache = null; };
export const allRecipes = () => [...BASE_RECIPES, ...S.customRecipes.map((r) => ({ ...r, src: 'mine' }))];
export const getRecipe = (id) => allRecipes().find((r) => r.id === id);
export const carbState = () => S.settings.carbState;

export function macrosOf(recipe, mult = 1) {
  return recipeMacros(recipe, foodMap(), carbState(), mult);
}
export function foodPer(food) { return perGram(food, carbState()); }

export function dietOK(flags) {
  if (S.settings.avoidGluten && flags.gluten) return false;
  if (S.settings.avoidLact && flags.lact) return false;
  return true;
}
export const foodOK = (f) => dietOK({ gluten: f.g, lact: f.l });

// ---------------- objetivos ----------------
export function targets() {
  const t = S.settings.targets;
  const set = [t.p, t.c, t.f].every((v) => v > 0) || t.k > 0;
  if (!set) return { k: 2000, p: 150, c: 200, f: 65, isSet: false };
  const p = t.p || 0, c = t.c || 0, f = t.f || 0;
  const k = t.kManual && t.k ? t.k : Math.round(p * 4 + c * 4 + f * 9) || t.k || 0;
  return { k, p, c, f, isSet: true };
}

// ---------------- diario ----------------
export const entries = (date) => S.log[date] || [];
export const mealEntries = (date, meal) => entries(date).filter((e) => e.m === meal);
export const eTot = (e) => ({ k: e.per.k * e.qty, p: e.per.p * e.qty, c: e.per.c * e.qty, f: e.per.f * e.qty });
export function sumEntries(list) {
  const t = { k: 0, p: 0, c: 0, f: 0 };
  for (const e of list) { const x = eTot(e); t.k += x.k; t.p += x.p; t.c += x.c; t.f += x.f; }
  return t;
}
export const dayTotals = (date) => sumEntries(entries(date));
export function addEntry(date, e) {
  e.id = e.id || uid();
  (S.log[date] = S.log[date] || []).push(e);
  save();
  return e;
}
export function removeEntry(date, id) {
  S.log[date] = entries(date).filter((e) => e.id !== id);
  if (!S.log[date].length) delete S.log[date];
  save();
}
export function findEntry(date, id) { return entries(date).find((e) => e.id === id); }
export function pushRecent(type, id) {
  S.recents = [{ type, id }, ...S.recents.filter((r) => !(r.type === type && r.id === id))].slice(0, 14);
  save();
}

// ---------------- agua, suplementos, permitido ----------------
export const waterOf = (d) => S.water[d] || 0;
export function addWater(d, ml) { S.water[d] = Math.max(0, waterOf(d) + ml); save(); }
export const suppsOf = (d) => S.supps[d] || {};
export function toggleSupp(d, id) { (S.supps[d] = S.supps[d] || {})[id] = !suppsOf(d)[id]; save(); }
export const allowedOf = (d) => S.allowed[weekStart(d)] || { used: false };
export function setAllowed(d, used, note = '') { S.allowed[weekStart(d)] = { used, note, on: d }; save(); }

// ---------------- peso ----------------
export function addWeight(d, kg) {
  S.weights = S.weights.filter((w) => w.d !== d);
  S.weights.push({ d, kg });
  S.weights.sort((a, b) => a.d.localeCompare(b.d));
  save();
}

// ---------------- sugerencias ----------------
export function slotByHour(date) {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (date !== todayISO()) return MAINS.find((m) => !mealEntries(date, m).length) || 'almuerzo';
  const base = h < 10.5 ? 'desayuno' : h < 14.5 ? 'almuerzo' : h < 18.5 ? 'merienda' : 'cena';
  if (!mealEntries(date, base).length) return base;
  const i = MAINS.indexOf(base);
  const rest = [...MAINS.slice(i + 1), ...MAINS.slice(0, i)].find((m) => !mealEntries(date, m).length);
  return rest || base;
}
export function mealsLeft(date, slot) {
  const un = MAINS.filter((m) => !mealEntries(date, m).length);
  if (!un.includes(slot)) un.push(slot);
  return Math.max(1, un.length);
}
export function remaining(date) {
  const t = targets(), d = dayTotals(date);
  return { k: t.k - d.k, p: t.p - d.p, c: t.c - d.c, f: t.f - d.f };
}
export function shareForMeal(date, slot) {
  const r = remaining(date), n = mealsLeft(date, slot);
  return { k: Math.max(r.k / n, 0), p: Math.max(r.p / n, 0), c: Math.max(r.c / n, 0), f: Math.max(r.f / n, 0) };
}
const MULTS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export function fitRecipe(recipe, share, remK) {
  let best = null;
  for (const mult of MULTS) {
    const m = macrosOf(recipe, mult);
    let score =
      1.4 * Math.abs(m.p - share.p) / Math.max(share.p, 12) +
      1.0 * Math.abs(m.c - share.c) / Math.max(share.c, 18) +
      0.6 * Math.abs(m.f - share.f) / Math.max(share.f, 6);
    if (m.k > remK * 1.08 + 30) score += 2;
    if (!best || score < best.score) best = { recipe, mult, m, score };
  }
  return best;
}
export function suggestions(date, slot, limit = 3, pool = null) {
  const share = shareForMeal(date, slot), remK = remaining(date).k;
  let list = (pool || allRecipes()).filter((r) => r.meals.includes(slot));
  list = list.map((r) => ({ r, m0: macrosOf(r) })).filter((x) => dietOK(x.m0)).map((x) => fitRecipe(x.r, share, remK));
  list.sort((a, b) => a.score - b.score);
  if (limit === Infinity) return list;
  const out = [], seen = new Set();
  for (const x of list) { const key = (x.recipe.prot || 'x') + '|' + (x.recipe.carb || 'x'); if (!seen.has(key) && !out.some((o) => o.recipe.prot === x.recipe.prot && o.recipe.prot && out.length < 2)) { seen.add(key); out.push(x); } if (out.length >= limit) break; }
  for (const x of list) { if (out.length >= limit) break; if (!out.includes(x)) out.push(x); }
  return out;
}
