// Interpreta una descripción en texto ("milanesa de pollo con puré de papa y ensalada")
// y la convierte en ingredientes de la base de alimentos. Todo corre en el teléfono.

export const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const NUM = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, medio: 0.5, media: 0.5 };
// gramos aproximados por "unidad" cuando se nombra una cantidad con palabra
const WORD_G = {
  huevo: 50, huevos: 50, clara: 33, claras: 33, lata: 120, latas: 120, pan: 65, panes: 65, rebanada: 30, rebanadas: 30,
  feta: 20, fetas: 20, galletita: 9, galletitas: 9, cucharada: 15, cucharadas: 15, cucharadita: 5, cucharaditas: 5,
  scoop: 30, scoops: 30, pote: 170, potes: 170, barrita: 50, barritas: 50, taza: 150, tazas: 150, vaso: 200, vasos: 200,
  presa: 120, presas: 120, filete: 150, filetes: 150, milanesa: 150, milanesas: 150, hamburguesa: 130, hamburguesas: 130,
  papa: 150, papas: 150, batata: 100, batatas: 100,
};
const UNIT_RE = '(huevos?|claras?|latas?|panes?|rebanadas?|fetas?|galletitas?|cucharadas?|cucharaditas?|scoops?|potes?|barritas?|tazas?|vasos?|presas?|filetes?|milanesas?|hamburguesas?|papas?|batatas?)';

function qty(chunk) {
  let m = chunk.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|grs|gramos?|ml)\b/);
  if (m) { const v = parseFloat(m[1].replace(',', '.')); return { g: /^kg/.test(m[2]) ? v * 1000 : v }; }
  m = chunk.match(new RegExp(`\\b(\\d+(?:[.,]\\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|medio|media)\\s+(?:de\\s+)?${UNIT_RE}\\b`));
  if (m) {
    const n = NUM[m[1]] ?? parseFloat(m[1].replace(',', '.'));
    return { count: n, word: m[2] };
  }
  return {};
}
function sizeMult(chunk) {
  if (/\b(doble|abundante|grande|grandes|mucho|mucha|bien cargado)\b/.test(chunk)) return 1.4;
  if (/\b(chico|chica|chicos|chicas|poco|poca|pequeno|pequena|medio plato|liviano)\b/.test(chunk)) return 0.7;
  return 1;
}

export function parseMeal(text, foods, { avoidGluten = true } = {}) {
  const FM = Object.fromEntries(foods.map((f) => [f.id, f]));
  const items = [], unknown = [], ignored = [];
  let globalMult = 1;
  const t = norm(text).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return { items, unknown, ignored };
  const chunks = t.split(/\s*(?:,|;|\.|\n|\+|&|\bcon\b|\by\b|\bmas\b|\bjunto a\b|\bacompanad[oa] de\b|\bsobre\b)\s*/).map((c) => c.trim()).filter(Boolean);

  const toG = (q, fid) => {
    if (q.g != null) return q.g;
    if (q.count != null) {
      const f = FM[fid];
      if (f && f.u && !f.only && norm(f.u.n).startsWith(q.word.replace(/s$/, '').slice(0, 4))) return q.count * f.u.g;
      let per = WORD_G[q.word];
      if (q.word.startsWith('taza') && fid && /^(arroz|fideo)/.test(fid)) per = 160;
      if (per) return q.count * per;
    }
    return null;
  };
  const add = (fid, q, mult, raw, fixedG = null) => {
    if (!FM[fid]) return;
    const food = FM[fid];
    if (food.only) return; // bebidas cero: no entran al plato
    const g = fixedG != null ? null : toG(q, fid);
    items.push({ fid, g, fixedG, mult: fixedG != null ? 1 : mult, raw });
  };
  const protOf = (c) => {
    if (/\b(muslo|pata|contramuslo)\b/.test(c)) return 'pollo_muslo';
    if (/\b(pollo|pechuga|suprema)\b/.test(c)) return 'pollo_pechuga';
    if (/\b(cerdo|bondiola|costeleta|chancho|puerco|carre)\b/.test(c)) return /bife|costeleta/.test(c) ? 'cerdo_bife' : 'cerdo_lomo';
    if (/\b(pescado|surubi|tilapia|merluza|dorado|pacu|filet de pescado|salmon)\b/.test(c)) return 'pescado_blanco';
    if (/\batun\b/.test(c)) return 'atun_lata';
    if (/\b(molida|picada)\b/.test(c)) return 'carne_molida';
    if (/\b(carne|bife|churrasco|cuadril|peceto|asado|lomo|vaca|vacuna|nalga|colita|bola de lomo|vacio|costilla)\b/.test(c)) return 'carne_magra';
    return null;
  };

  for (const c of chunks) {
    if (/^(una |un |la |el )?(porcion|racion|plato|cantidad)( (grande|chica|chico|abundante|pequena|doble|generosa))?$/.test(c) || /^(doble|abundante|bien cargado|poco|poca|chico|chica|grande|medio plato)$/.test(c)) {
      globalMult = sizeMult(c);
      continue;
    }
    if (/^(un |una |el |la |mi )?(cafe|te|mate|mate cocido|cocido|infusion|agua|gaseosa|coca zero|coca|zero|gelatina|gelatina diet|edulcorante|stevia)( [a-z ]*)?$/.test(c)) { ignored.push(c); continue; }
    const q = qty(c), mult = sizeMult(c);
    const before = items.length;
    const prot = protOf(c);

    if (/milanesa|empanad|rebozad/.test(c)) {
      add(prot || 'carne_magra', q, mult, c); add('huevo', {}, 1, c, 25); add('tapioca', {}, 1, c, 15);
    } else if (/hamburguesa/.test(c)) {
      add(prot && !['atun_lata', 'carne_magra'].includes(prot) ? prot : 'carne_molida', q.g != null ? q : {}, mult, c);
      if (!/sin pan/.test(c)) add('pan_hamb_sg', {}, 1, c, 65);
    } else if (/tortilla|omelette|omelet|revuelto/.test(c)) {
      add('huevo', q, mult, c);
      if (/papa/.test(c)) add('papa', {}, mult, c);
      else if (/batata/.test(c)) add('batata', {}, mult, c);
      if (/espinaca/.test(c)) add('espinaca', {}, mult, c);
      else if (/verdura/.test(c)) add('verd_salteadas', {}, mult, c);
    } else if (prot) {
      add(prot, q, mult, c);
    } else if (/\bclaras?\b/.test(c)) {
      add('clara', q, mult, c);
    } else if (/\b(huevos?)\b/.test(c)) {
      add('huevo', q, mult, c);
    } else if (/arroz integral/.test(c)) {
      add('arroz_integral', q, mult, c);
    } else if (/arroz/.test(c)) {
      add('arroz_blanco', q, mult, c);
    } else if (/\b(fideos?|pasta|pastas|tallarin|tallarines|espagueti|spaghetti|macarron|macarrones|penne|noquis|ravioles?)\b/.test(c)) {
      add(avoidGluten ? 'fideo_sg' : 'fideo_trigo', q, mult, c);
    } else if (/papas? fritas?/.test(c)) {
      add('papa', q, mult, c); add('aceite_oliva', {}, 1, c, 13);
    } else if (/\bpure\b/.test(c)) {
      add(/batata|camote/.test(c) ? 'batata' : 'papa', q, mult, c); add('leche_desl', {}, 1, c, 30);
    } else if (/\b(papas?|patatas?)\b/.test(c)) {
      add('papa', q, mult, c);
    } else if (/\b(batatas?|camote)\b/.test(c)) {
      add('batata', q, mult, c);
    } else if (/\b(mandioca|mandi'?o)\b/.test(c)) {
      add('mandioca', q, mult, c);
    } else if (/tapioca|chipa/.test(c)) {
      add('tapioca', q, mult, c);
    } else if (/\b(tostadas?|rebanadas? de pan)\b/.test(c)) {
      add('pan_sg', q, mult, c);
    } else if (/\bpan\b/.test(c)) {
      add('pan_hamb_sg', q.count != null ? { count: q.count, word: 'pan' } : q, mult, c);
    } else if (/\b(ensalada|lechuga|rucula|repollo|rucula)\b/.test(c)) {
      add('ensalada', q, mult, c);
    } else if (/\b(verduras?|salteado de verduras|wok|vegetales)\b/.test(c)) {
      add('verd_salteadas', q, mult, c);
    } else if (/brocoli|brocol/.test(c)) {
      add('brocoli', q, mult, c);
    } else if (/zapallito|zucchini|calabacin/.test(c)) {
      add('zapallito', q, mult, c);
    } else if (/espinaca/.test(c)) {
      add('espinaca', q, mult, c);
    } else if (/salsa de soja|\bsoja\b/.test(c)) {
      add('soja', q, mult, c, q.g != null ? null : 15);
    } else if (/mostaza/.test(c)) {
      add('mostaza', q, mult, c, q.g != null ? null : 10);
    } else if (/salsa|tomate triturado|pure de tomate|salsa de tomate/.test(c)) {
      add('salsa_tomate', q, mult, c);
    } else if (/tomate/.test(c)) {
      add('tomate', q, mult, c);
    } else if (/cebolla de hoja|verdeo/.test(c)) {
      add('verdeo', q, mult, c);
    } else if (/cebolla/.test(c)) {
      add('cebolla', q, mult, c);
    } else if (/morron|pimiento/.test(c)) {
      add('morron', q, mult, c);
    } else if (/zanahoria/.test(c)) {
      add('zanahoria', q, mult, c);
    } else if (/queso/.test(c)) {
      add('queso_feta', q, mult, c, q.g != null || q.count != null ? null : 20);
    } else if (/aceite/.test(c)) {
      add('aceite_oliva', q, mult, c, q.g != null ? null : 13);
    } else if (/yogu?rt/.test(c)) {
      add('yogurt_prot', q, mult, c);
    } else if (/avena/.test(c)) {
      add('avena_sg', q, mult, c);
    } else if (/whey|batido|proteina/.test(c)) {
      add('whey', q, mult, c);
    } else if (/barrita/.test(c)) {
      add('barrita', q, mult, c);
    } else if (/galletitas?/.test(c)) {
      add('galletita_arroz', q, mult, c);
    } else if (/pororo|pochoclo|palomitas/.test(c)) {
      add('pororo', q, mult, c);
    } else if (/mermelada/.test(c)) {
      add('mermelada', q, mult, c);
    } else if (/\bleche\b/.test(c)) {
      add('leche_desl', q, mult, c);
    } else if (/\bchia\b/.test(c)) {
      add('chia', q, mult, c);
    } else if (/\bcoco\b/.test(c)) {
      add('coco', q, mult, c);
    }

    if (items.length === before) {
      // buscar por nombre en cualquier alimento (incluye los creados por vos)
      const words = c.replace(/\d+(?:[.,]\d+)?\s*(kg|g|gr|grs|gramos?|ml)?/g, '').split(' ').filter((w) => w.length >= 4 && !/^(para|unas?|unos?|algo|bien|medio|media|porcion|plato|comi|comida|almuerzo|cena|tome)$/.test(w));
      let hit = null;
      if (words.length) hit = foods.find((f) => !f.only && words.every((w) => norm(f.n).includes(w))) || foods.find((f) => !f.only && words.some((w) => norm(f.n).split(/\W+/).includes(w)));
      if (hit) add(hit.id, q, mult, c);
      else if (/[a-z]{3,}/.test(c) && !/^(un|una|el|la|los|las|de|del|al|un poco)$/.test(c)) unknown.push(c.replace(/^(un|una|unos|unas|el|la|los|las|de)\s+/, ''));
    }
  }

  // la ensalada ya incluye tomate / zanahoria: no los duplicamos
  const hasSalad = items.some((i) => i.fid === 'ensalada');
  const out = [];
  for (const it of items) {
    if (hasSalad && (it.fid === 'tomate' || it.fid === 'zanahoria') && it.g == null) continue;
    const ex = out.find((o) => o.fid === it.fid);
    if (ex) { if (ex.g == null && it.g != null) ex.g = it.g; continue; }
    out.push(it);
  }
  if (globalMult !== 1) out.forEach((o) => { if (o.fixedG == null) o.mult *= globalMult; });
  return { items: out, unknown, ignored };
}
