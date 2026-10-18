// Recetario base. Todo gira en torno a: arroz / fideo / papa / batata (+ tapioca y pan)
// con pollo / carne / cerdo / pescado / huevo, con agregados mínimos.
// Porciones alineadas al plan: carnes 175 g (crudo), pescado 225 g, huevo 2 enteros + 2 claras,
// arroz/fideo 100 g, batata 100 g, papa 150 g, tapioca 50 g, 1 pan de hamburguesa sin gluten.
import { FOOD_MAP, perGram } from './foods.js';

const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const LUNCH = ['almuerzo', 'cena'];
const out = [];
const push = (r) => {
  r.id = r.id || slug(r.name);
  r.src = r.src || 'base';
  r.steps = r.steps || [];
  r.min = r.min || 20;
  if (out.some((x) => x.id === r.id)) r.id += '_' + out.length;
  out.push(r);
};

// ---------------------------------------------------------------------------
// 1) Generador: proteína (método) × hidrato  → ~85 platos
// ---------------------------------------------------------------------------
const PROT = {
  pollo: { food: 'pollo_pechuga', g: 175, grp: 'pollo' },
  muslo: { food: 'pollo_muslo', g: 175, grp: 'pollo' },
  carne: { food: 'carne_magra', g: 175, grp: 'carne' },
  cerdo: { food: 'cerdo_lomo', g: 175, grp: 'cerdo' },
  pescado: { food: 'pescado_blanco', g: 225, grp: 'pescado' },
};

const METHODS = {
  pollo: {
    plancha: { t: 'Pollo a la plancha', min: 15, add: [], steps: [
      'Cortá la pechuga en filetes de 1 cm y condimentá con sal, pimienta, orégano y ajo.',
      'Cociná en sartén antiadherente con spray a fuego medio-alto, 4 min por lado, hasta que quede dorado y sin rosado.'] },
    horno: { t: 'Pollo al horno', min: 35, add: [], steps: [
      'Precalentá el horno a 200 °C. Condimentá la pechuga con sal, pimentón, orégano y ajo.',
      'Ponela en una bandeja con spray y horneá 25–30 min, dándola vuelta a la mitad.'] },
    salteado: { t: 'Pollo salteado con soja', min: 20, add: [['soja', 15], ['cebolla', 40], ['morron', 40]], steps: [
      'Cortá el pollo en tiras y salpimentá. Cortá la cebolla y el morrón en tiras.',
      'Salteá el pollo en sartén o wok bien caliente con spray 4–5 min. Sumá las verduras y salteá 3 min más.',
      'Terminá con la salsa de soja.'] },
  },
  muslo: {
    horno: { t: 'Muslo de pollo al horno', min: 45, add: [], steps: [
      'Precalentá el horno a 200 °C. Sacale la piel a los muslos y condimentá con sal, pimentón, ajo y orégano.',
      'Horneá en bandeja con spray 35–40 min, dándolos vuelta a la mitad, hasta que el jugo salga claro.'] },
  },
  carne: {
    plancha: { t: 'Bife a la plancha', min: 15, add: [], steps: [
      'Sacá el bife de la heladera 15 min antes y salpimentalo.',
      'Sartén bien caliente con spray: 3 min por lado para punto medio (más si lo querés más cocido). Dejalo reposar 2 min.'] },
    horno: { t: 'Carne al horno', min: 35, add: [['cebolla', 50]], steps: [
      'Precalentá el horno a 200 °C. Salpimentá la carne y ponela en una fuente con la cebolla en rodajas y un chorrito de agua.',
      'Horneá tapada con aluminio 20 min y destapada 5–10 min más. Dejá reposar 5 min y cortá en fetas.'] },
    salteado: { t: 'Carne salteada con cebolla y morrón', min: 20, add: [['cebolla', 50], ['morron', 50]], steps: [
      'Cortá la carne en tiras finas, la cebolla y el morrón en tiras. Salpimentá la carne.',
      'Salteá la carne en sartén bien caliente con spray 3–4 min, sin amontonar. Sumá las verduras y salteá 3 min más.'] },
  },
  cerdo: {
    plancha: { t: 'Bife de cerdo a la plancha', min: 15, add: [], steps: [
      'Salpimentá el bife de cerdo y condimentalo con ajo y orégano.',
      'Cociná en sartén con spray 4 min por lado: tiene que quedar bien cocido pero jugoso.'] },
    horno: { t: 'Lomo de cerdo al horno', min: 35, add: [], steps: [
      'Precalentá el horno a 200 °C. Cortá el lomo en medallones, salpimentá y condimentá con ajo y orégano.',
      'Horneá en bandeja con spray 20–25 min, dándolos vuelta a la mitad.'] },
    salteado: { t: 'Cerdo salteado con soja', min: 20, add: [['soja', 15], ['cebolla', 40], ['morron', 40]], steps: [
      'Cortá el cerdo en tiras finas y las verduras en tiras.',
      'Salteá el cerdo en sartén bien caliente con spray 4–5 min. Sumá las verduras y salteá 3 min.',
      'Terminá con la salsa de soja.'] },
  },
  pescado: {
    plancha: { t: 'Pescado a la plancha', min: 12, add: [], steps: [
      'Secá el pescado con papel y condimentá con sal, pimienta y limón.',
      'Cociná en sartén antiadherente con spray 3–4 min por lado, hasta que se desmenuce fácil.'] },
    horno: { t: 'Pescado al horno con limón y tomate', min: 25, add: [['tomate', 60]], steps: [
      'Precalentá el horno a 200 °C. Poné el pescado en una fuente con spray, rodajas de tomate y limón, sal y pimienta.',
      'Horneá 12–15 min, hasta que se desmenuce con el tenedor.'] },
  },
};

const CARBS = {
  arroz: { t: 'arroz', grp: 'arroz', min: 20, ing: [['arroz_blanco', 100]], steps: [
    'Mientras tanto, cociná el arroz (lavado) con una pizca de sal, tapado y a fuego bajo, hasta que absorba el agua (unos 15 min).'] },
  arroz_int: { t: 'arroz integral', grp: 'arroz', min: 35, ing: [['arroz_integral', 100]], steps: [
    'Mientras tanto, cociná el arroz integral con una pizca de sal, tapado y a fuego bajo, 30–35 min.'] },
  fideo: { t: 'fideos', grp: 'fideo', min: 15, ing: [['fideo_sg', 100], ['salsa_tomate', 80]], steps: [
    'Mientras tanto, herví los fideos sin gluten en agua con sal según el paquete (8–10 min) y escurrí.',
    'Calentá la salsa de tomate con orégano y mezclala con los fideos.'] },
  papa_horno: { t: 'papas al horno', grp: 'papa', min: 40, ing: [['papa', 150]], steps: [
    'Mientras tanto, cortá las papas en gajos con cáscara, condimentá con sal, pimentón y orégano y horneá con spray a 200 °C unos 30–35 min, dándolas vuelta a la mitad.'] },
  pure_papa: { t: 'puré de papa', grp: 'papa', min: 25, ing: [['papa', 150], ['leche_desl', 30]], steps: [
    'Mientras tanto, herví las papas peladas 15–20 min, escurrí y pisá con la leche deslactosada tibia, sal y nuez moscada.'] },
  batata_horno: { t: 'batata al horno', grp: 'batata', min: 35, ing: [['batata', 100]], steps: [
    'Mientras tanto, cortá la batata en rodajas o cubos, condimentá con sal y pimentón y horneá con spray a 200 °C 25–30 min.'] },
  pure_batata: { t: 'puré de batata', grp: 'batata', min: 25, ing: [['batata', 100]], steps: [
    'Mientras tanto, herví la batata en trozos 15–20 min, escurrí y pisá con sal y una pizca de pimienta.'] },
};

const join = (t, c) => `${t} ${t.includes(' con ') ? 'y' : 'con'} ${c}`;

for (const [pk, methods] of Object.entries(METHODS)) {
  const P = PROT[pk];
  for (const [mk, m] of Object.entries(methods)) {
    for (const [ck, c] of Object.entries(CARBS)) {
      push({
        name: join(m.t, c.t),
        meals: LUNCH, prot: P.grp, carb: c.grp,
        ing: [[P.food, P.g], ...m.add, ...c.ing, ['ensalada', 150]],
        steps: [...m.steps, ...c.steps, 'Serví con la ensalada (lechuga, tomate, zanahoria) y listo.'],
        min: Math.max(m.min, c.min) + 5,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 2) Milanesas al horno (rebozadas con huevo y tapioca, sin gluten)
// ---------------------------------------------------------------------------
const MIL = [
  ['Milanesa de pollo al horno', 'pollo_pechuga', 175, 'pollo'],
  ['Milanesa de carne al horno', 'carne_magra', 175, 'carne'],
  ['Milanesa de cerdo al horno', 'cerdo_bife', 175, 'cerdo'],
  ['Milanesa de pescado al horno', 'pescado_blanco', 225, 'pescado'],
];
for (const [name, food, g, grp] of MIL) {
  for (const ck of ['pure_papa', 'pure_batata', 'arroz', 'papa_horno']) {
    const c = CARBS[ck];
    push({
      name: join(name, c.t), meals: LUNCH, prot: grp, carb: c.grp,
      ing: [[food, g], ['huevo', 50], ['tapioca', 15], ...c.ing, ['ensalada', 120]],
      steps: [
        'Aplastá el filete hasta que quede finito y salpimentá.',
        'Batí el huevo con ajo y perejil. Pasá el filete por el huevo y después por la tapioca (o avena sin gluten molida).',
        'Horneá a 200 °C sobre bandeja con spray 10 min, dalo vuelta y 10 min más. (O en sartén con spray, 3 min por lado.)',
        ...c.steps, 'Serví con ensalada.'],
      min: 35,
    });
  }
}

// ---------------------------------------------------------------------------
// 3) Hamburguesas con pan de hamburguesa sin gluten
// ---------------------------------------------------------------------------
[
  ['Hamburguesa casera de pollo con pan sin gluten', 'pollo_pechuga', 'pollo'],
  ['Hamburguesa casera de carne con pan sin gluten', 'carne_molida', 'carne'],
  ['Hamburguesa casera de cerdo con pan sin gluten', 'cerdo_lomo', 'cerdo'],
].forEach(([name, food, grp]) =>
  push({
    name, meals: LUNCH, prot: grp, carb: 'pan',
    ing: [[food, 175], ['huevo', 25], ['cebolla', 20], ['pan_hamb_sg', 65], ['tomate', 50], ['ensalada', 100], ['mostaza', 5]],
    steps: [
      'Picá bien la carne (o usá carne molida) y mezclala con la cebolla rallada, sal, pimienta y el huevo batido.',
      'Formá una hamburguesa y cociná en sartén con spray 4–5 min por lado (el pollo y el cerdo, bien cocidos).',
      'Tostá el pan y armá con tomate, lechuga y mostaza. Serví con ensalada.'],
    min: 25,
  }));

// ---------------------------------------------------------------------------
// 4) Sándwiches con pan sin gluten
// ---------------------------------------------------------------------------
[
  ['Sándwich de bife con pan sin gluten', 'carne_magra', 'carne'],
  ['Sándwich de pollo grillado con pan sin gluten', 'pollo_pechuga', 'pollo'],
  ['Sándwich de lomo de cerdo con pan sin gluten', 'cerdo_lomo', 'cerdo'],
].forEach(([name, food, grp]) =>
  push({
    name, meals: LUNCH, prot: grp, carb: 'pan',
    ing: [[food, 175], ['pan_hamb_sg', 65], ['tomate', 50], ['cebolla', 30], ['ensalada', 80], ['mostaza', 5]],
    steps: [
      'Cortá la carne en filetes finos, salpimentá y cociná en sartén con spray 3–4 min por lado.',
      'Tostá el pan, untalo con mostaza y armá con la carne, tomate, cebolla y lechuga.'],
    min: 20,
  }));
push({
  name: 'Sándwich de huevo, tomate y lechuga', meals: LUNCH, prot: 'huevo', carb: 'pan',
  ing: [['huevo', 100], ['clara', 66], ['pan_hamb_sg', 65], ['tomate', 50], ['ensalada', 80]],
  steps: ['Hacé una tortilla fina con los huevos y las claras (sal y orégano) en sartén con spray.',
    'Tostá el pan y armá con la tortilla, tomate y lechuga.'], min: 12,
});

// ---------------------------------------------------------------------------
// 5) Tapioca rellena
// ---------------------------------------------------------------------------
const TAP = [
  ['Tapioca rellena de pollo y tomate', 'pollo', [['pollo_pechuga', 175], ['tomate', 60], ['cebolla', 20]],
    'Cociná el pollo en cubitos con spray, sal y orégano; desmenuzalo con la cebolla picada y el tomate.'],
  ['Tapioca rellena de carne molida y cebolla', 'carne', [['carne_molida', 175], ['cebolla', 40], ['tomate', 50]],
    'Salteá la carne molida con la cebolla y el tomate picados, sal, pimienta y comino hasta que se dore.'],
  ['Tapioca rellena de atún y tomate', 'pescado', [['atun_lata', 180], ['tomate', 60], ['verdeo', 10]],
    'Mezclá el atún escurrido con el tomate picado, la cebolla de hoja y un chorrito de limón.'],
  ['Tapioca rellena de huevo revuelto', 'huevo', [['huevo', 100], ['clara', 66], ['tomate', 60]],
    'Revolvé los huevos y las claras en sartén con spray y sal; sumá el tomate picado al final.'],
];
for (const [name, grp, ing, fill] of TAP) {
  push({
    name, meals: LUNCH, prot: grp, carb: 'tapioca',
    ing: [...ing, ['tapioca', 50], ['ensalada', 100]],
    steps: [fill,
      'Tamizá los 50 g de tapioca sobre una sartén antiadherente caliente, sin aceite, formando un disco. Cuando se una (1–2 min), dalo vuelta 30 seg.',
      'Rellená con el preparado, doblá y serví con ensalada.'],
    min: 20,
  });
}
push({
  name: 'Pizza de tapioca con pollo, tomate y queso', meals: LUNCH, prot: 'pollo', carb: 'tapioca',
  ing: [['tapioca', 50], ['salsa_tomate', 60], ['pollo_pechuga', 175], ['queso_feta', 20], ['ensalada', 100]],
  steps: ['Hacé un disco de tapioca en sartén antiadherente (tamizá y cociná 2 min por lado).',
    'Cubrí con la salsa, el pollo cocido y desmenuzado y el queso deslactosado.',
    'Tapá la sartén 2 min a fuego bajo hasta que el queso se derrita. Serví con ensalada.'],
  min: 25,
});

// ---------------------------------------------------------------------------
// 6) Fideos salteados con carne/pollo/cerdo y verduras
// ---------------------------------------------------------------------------
[
  ['Fideos salteados con pollo y verduras', 'pollo_pechuga', 'pollo'],
  ['Fideos salteados con carne y verduras', 'carne_magra', 'carne'],
  ['Fideos salteados con cerdo y verduras', 'cerdo_lomo', 'cerdo'],
].forEach(([name, food, grp]) =>
  push({
    name, meals: LUNCH, prot: grp, carb: 'fideo',
    ing: [[food, 175], ['fideo_sg', 100], ['zanahoria', 50], ['morron', 50], ['cebolla', 40], ['brocoli', 60], ['soja', 15]],
    steps: [
      'Herví los fideos sin gluten según el paquete, escurrí y reservá.',
      'Cortá la carne y las verduras en tiras finas. Salteá la carne en sartén bien caliente con spray 4 min.',
      'Sumá las verduras y salteá 4 min. Agregá los fideos y la salsa de soja, mezclá 1 min y serví.'],
    min: 25,
  }));

// ---------------------------------------------------------------------------
// 7) Pinchos y mostaza
// ---------------------------------------------------------------------------
[
  ['Pinchos de pollo con verduras y arroz', 'pollo_pechuga', 'pollo', 'arroz'],
  ['Pinchos de carne con verduras y batata al horno', 'carne_magra', 'carne', 'batata_horno'],
  ['Pinchos de cerdo con verduras y arroz', 'cerdo_lomo', 'cerdo', 'arroz'],
  ['Pinchos de pollo con verduras y papas al horno', 'pollo_pechuga', 'pollo', 'papa_horno'],
].forEach(([name, food, grp, ck]) => {
  const c = CARBS[ck];
  push({
    name, meals: LUNCH, prot: grp, carb: c.grp,
    ing: [[food, 175], ['morron', 60], ['cebolla', 60], ['zapallito', 60], ...c.ing],
    steps: ['Cortá la carne y las verduras en cubos del mismo tamaño y alternalos en palitos. Salpimentá.',
      'Cociná en sartén o parrilla con spray 10–12 min, dándolos vuelta, hasta que estén dorados y bien cocidos.', ...c.steps],
    min: 30,
  });
});
[['Pollo', 'pollo_pechuga', 'pollo', 25], ['Lomo de cerdo', 'cerdo_lomo', 'cerdo', 22]].forEach(([n, food, grp, mins]) => {
  for (const ck of ['papa_horno', 'batata_horno']) {
    const c = CARBS[ck];
    push({
      name: `${n} a la mostaza con ${c.t}`, meals: LUNCH, prot: grp, carb: c.grp,
      ing: [[food, 175], ['mostaza', 10], ...c.ing, ['ensalada', 120]],
      steps: ['Mezclá la mostaza con ajo, orégano y una cucharada de agua y untá la carne.',
        `Horneá a 200 °C en bandeja con spray unos ${mins} min, dándola vuelta a la mitad.`, ...c.steps, 'Serví con ensalada.'],
      min: 40,
    });
  }
});

// ---------------------------------------------------------------------------
// 8) Platos de olla / guisos / sopas
// ---------------------------------------------------------------------------
const H = (name, o) => push({ name, meals: LUNCH, ...o });

H('Arroz con pollo (en una olla)', { prot: 'pollo', carb: 'arroz', min: 35,
  ing: [['pollo_pechuga', 175], ['arroz_blanco', 100], ['cebolla', 50], ['morron', 50], ['tomate', 60], ['caldo_verd', 150]],
  steps: ['Cortá el pollo en cubos y salpimentá con orégano y pimentón.',
    'En una olla con spray, doralo 4 min. Sumá cebolla, morrón y tomate picados y rehogá 3 min.',
    'Agregá el arroz crudo (la cantidad que equivale a tu porción), mezclá 1 min y cubrí con caldo caliente (doble de volumen que el arroz).',
    'Tapá y cociná a fuego bajo 15 min. Dejá reposar 5 min.'] });
H('Pollo al curry con arroz', { prot: 'pollo', carb: 'arroz', min: 30,
  ing: [['pollo_pechuga', 175], ['arroz_blanco', 100], ['cebolla', 50], ['caldo_verd', 100], ['leche_desl', 50]],
  steps: ['Cociná el arroz con una pizca de sal.',
    'Dorá el pollo en cubos con spray; sumá la cebolla picada y 1 cucharadita de curry.',
    'Agregá el caldo y la leche deslactosada y cociná 8 min a fuego bajo hasta que espese.', 'Serví sobre el arroz.'] });
H('Fideos con pollo y salsa de tomate', { prot: 'pollo', carb: 'fideo', min: 25,
  ing: [['pollo_pechuga', 175], ['fideo_sg', 100], ['salsa_tomate', 150], ['cebolla', 40]],
  steps: ['Herví los fideos sin gluten y escurrí.',
    'Cociná el pollo en cubitos con spray y la cebolla picada. Sumá la salsa de tomate y orégano; 8 min a fuego bajo.',
    'Mezclá con los fideos.'] });
H('Sopa de pollo, papa y zanahoria', { prot: 'pollo', carb: 'papa', min: 35,
  ing: [['pollo_pechuga', 175], ['papa', 150], ['zanahoria', 60], ['cebolla', 40], ['caldo_verd', 400]],
  steps: ['Poné el caldo a hervir con la cebolla, la zanahoria y la papa en cubos.',
    'A los 10 min agregá el pollo en cubos. Cociná 12 min más.', 'Condimentá con sal, pimienta y perejil.'] });
H('Pechuga rellena de espinaca y queso con batata al horno', { prot: 'pollo', carb: 'batata', min: 45,
  ing: [['pollo_pechuga', 175], ['espinaca', 60], ['queso_feta', 20], ['batata', 100], ['ensalada', 100]],
  steps: ['Abrí la pechuga como un libro y salpimentá. Rellená con espinaca salteada y el queso deslactosado; cerrá con palillos.',
    'Horneá a 200 °C con spray 25 min.', 'Cociná la batata en cubos al horno junto con el pollo 25–30 min.', 'Serví con ensalada.'] });
H('Arroz salteado con pollo y huevo', { prot: 'pollo', carb: 'arroz', min: 25,
  ing: [['pollo_pechuga', 150], ['huevo', 50], ['arroz_blanco', 100], ['zanahoria', 40], ['cebolla', 30], ['verdeo', 15], ['soja', 15]],
  steps: ['Salteá el pollo en cubitos con spray 5 min. Reservá.',
    'En la misma sartén, salteá las verduras picadas 3 min y volcá el huevo batido; revolvé hasta que cuaje.',
    'Sumá el arroz cocido frío y el pollo, la salsa de soja y mezclá 2 min.'] });

H('Fideos con salsa boloñesa simple', { prot: 'carne', carb: 'fideo', min: 25,
  ing: [['carne_molida', 175], ['fideo_sg', 100], ['salsa_tomate', 120], ['cebolla', 40], ['zanahoria', 30]],
  steps: ['Herví los fideos sin gluten y escurrí.',
    'Dorá la carne molida con la cebolla y la zanahoria rallada. Salpimentá.',
    'Agregá la salsa de tomate y orégano; cociná 10 min. Mezclá con los fideos.'] });
H('Arroz con carne molida y morrón', { prot: 'carne', carb: 'arroz', min: 30,
  ing: [['carne_molida', 175], ['arroz_blanco', 100], ['morron', 60], ['cebolla', 40], ['tomate', 60], ['caldo_verd', 150]],
  steps: ['Dorá la carne molida con la cebolla en una olla con spray; sumá el morrón y el tomate picados.',
    'Agregá el arroz crudo (cantidad equivalente a tu porción) y el caldo caliente.', 'Tapá y cociná a fuego bajo 15 min.'] });
H('Pastel de papa con carne molida', { prot: 'carne', carb: 'papa', min: 50,
  ing: [['carne_molida', 175], ['papa', 150], ['leche_desl', 30], ['cebolla', 50], ['tomate', 50], ['ensalada', 100]],
  steps: ['Herví las papas y hacé un puré con la leche deslactosada, sal y nuez moscada.',
    'Rehogá la cebolla con spray, sumá la carne molida y el tomate picado; cociná 8 min y condimentá con comino y pimentón.',
    'Armá en una fuente: carne abajo, puré arriba. Gratiná en horno fuerte 15 min. Serví con ensalada.'] });
H('Pastel de batata con carne molida', { prot: 'carne', carb: 'batata', min: 50,
  ing: [['carne_molida', 175], ['batata', 100], ['cebolla', 50], ['tomate', 50], ['ensalada', 100]],
  steps: ['Herví la batata y pisala con sal y pimienta.',
    'Rehogá la cebolla con spray, sumá la carne molida y el tomate; cociná 8 min.',
    'Armá en una fuente con el puré arriba y gratiná 15 min a 200 °C. Serví con ensalada.'] });
H('Estofado de carne con papa y zanahoria', { prot: 'carne', carb: 'papa', min: 60,
  ing: [['carne_magra', 175], ['papa', 150], ['zanahoria', 80], ['cebolla', 50], ['salsa_tomate', 80], ['caldo_verd', 200]],
  steps: ['Cortá la carne en cubos y sellala en una olla con spray.',
    'Sumá la cebolla picada, la salsa de tomate y el caldo. Tapá y cociná a fuego bajo 30 min.',
    'Agregá la papa y la zanahoria en cubos y cociná 20 min más, hasta que la carne esté tierna.'] });
H('Guiso de arroz con carne', { prot: 'carne', carb: 'arroz', min: 40,
  ing: [['carne_magra', 175], ['arroz_blanco', 100], ['cebolla', 50], ['morron', 50], ['tomate', 60], ['caldo_verd', 200]],
  steps: ['Sellá la carne en cubos con spray en una olla. Sumá cebolla, morrón y tomate picados.',
    'Agregá el caldo y cociná tapado 20 min.', 'Sumá el arroz crudo (equivalente a tu porción) y cociná 15 min más.'] });
H("So'o josopy (sopa paraguaya de carne molida) con fideos", { prot: 'carne', carb: 'fideo', min: 30,
  ing: [['carne_molida', 175], ['fideo_sg', 100], ['cebolla', 50], ['morron', 40], ['tomate', 80], ['caldo_verd', 300]],
  steps: ['Rehogá la cebolla, el morrón y el tomate picados con spray. Sumá la carne molida y dorala.',
    'Agregá el caldo caliente y llevá a hervor.', 'Sumá los fideos sin gluten y cociná 8–10 min. Condimentá con orégano y perejil.'] });
H("So'o josopy con arroz", { prot: 'carne', carb: 'arroz', min: 35,
  ing: [['carne_molida', 175], ['arroz_blanco', 100], ['cebolla', 50], ['morron', 40], ['tomate', 80], ['caldo_verd', 300]],
  steps: ['Rehogá la cebolla, el morrón y el tomate picados con spray. Sumá la carne molida y dorala.',
    'Agregá el caldo caliente y el arroz crudo (equivalente a tu porción).', 'Cociná 15 min a fuego medio hasta que el arroz esté listo.'] });
H('Albóndigas con fideos y salsa de tomate', { prot: 'carne', carb: 'fideo', min: 35,
  ing: [['carne_molida', 175], ['huevo', 25], ['cebolla', 20], ['fideo_sg', 100], ['salsa_tomate', 120]],
  steps: ['Mezclá la carne con el huevo, la cebolla rallada, sal, pimienta y perejil. Formá albóndigas.',
    'Doralas en sartén con spray 5 min y sumá la salsa de tomate; cociná tapadas 10 min.', 'Servilas sobre los fideos sin gluten.'] });
H('Albóndigas con puré de papa', { prot: 'carne', carb: 'papa', min: 35,
  ing: [['carne_molida', 175], ['huevo', 25], ['cebolla', 20], ['papa', 150], ['leche_desl', 30], ['salsa_tomate', 60]],
  steps: ['Mezclá la carne con el huevo, la cebolla rallada, sal y pimienta. Formá albóndigas.',
    'Doralas con spray y terminá con la salsa de tomate 8 min.', 'Hacé el puré con las papas hervidas y la leche. Serví junto.'] });
H('Bife koygua con arroz', { prot: 'carne', carb: 'arroz', min: 25,
  ing: [['carne_magra', 175], ['cebolla', 80], ['tomate', 80], ['morron', 40], ['huevo', 50], ['arroz_blanco', 100]],
  steps: ['Cociná el arroz con una pizca de sal.',
    'Hacé el bife a la plancha con spray y reservá. En la misma sartén rehogá la cebolla, el tomate y el morrón en rodajas.',
    'Poné el bife sobre el arroz, cubrí con las verduras y coronalo con un huevo a la plancha.'] });
H('Bife con papas rústicas y cebolla', { prot: 'carne', carb: 'papa', min: 40,
  ing: [['carne_magra', 175], ['papa', 150], ['cebolla', 60], ['ensalada', 100]],
  steps: ['Cortá las papas en gajos, condimentá y horneá con spray 30 min a 200 °C.',
    'Hacé el bife a la plancha. Rehogá la cebolla en rodajas hasta que se dore.', 'Serví con ensalada.'] });

H('Fideos con cerdo y salsa de tomate', { prot: 'cerdo', carb: 'fideo', min: 25,
  ing: [['cerdo_lomo', 175], ['fideo_sg', 100], ['salsa_tomate', 120], ['morron', 40]],
  steps: ['Herví los fideos sin gluten y escurrí.', 'Salteá el cerdo en tiritas con spray y el morrón; sumá la salsa 6 min.', 'Mezclá con los fideos.'] });
H('Arroz con cerdo y morrón', { prot: 'cerdo', carb: 'arroz', min: 35,
  ing: [['cerdo_lomo', 175], ['arroz_blanco', 100], ['morron', 60], ['cebolla', 40], ['caldo_verd', 120], ['soja', 10]],
  steps: ['Salteá el cerdo en cubos con spray; sumá cebolla y morrón picados.',
    'Agregá el arroz crudo (equivalente a tu porción), la soja y el caldo caliente.', 'Tapá y cociná 15 min a fuego bajo.'] });
H('Guiso de cerdo con papa', { prot: 'cerdo', carb: 'papa', min: 45,
  ing: [['cerdo_lomo', 175], ['papa', 150], ['zanahoria', 60], ['cebolla', 50], ['tomate', 60], ['caldo_verd', 250]],
  steps: ['Sellá el cerdo en cubos con spray. Sumá cebolla y tomate picados.',
    'Agregá el caldo y cociná tapado 15 min. Sumá la papa y la zanahoria en cubos y cociná 20 min más.'] });
H('Cerdo con batata y cebolla en bandeja', { prot: 'cerdo', carb: 'batata', min: 40,
  ing: [['cerdo_lomo', 175], ['batata', 100], ['cebolla', 60], ['ensalada', 100]],
  steps: ['Precalentá el horno a 200 °C. Poné en una bandeja con spray el cerdo en medallones, la batata en cubos y la cebolla en gajos.',
    'Condimentá con sal, pimentón y orégano. Horneá 30 min, mezclando a la mitad. Serví con ensalada.'] });

H('Surubí al horno con papa, cebolla y tomate', { prot: 'pescado', carb: 'papa', min: 40,
  ing: [['pescado_blanco', 225], ['papa', 150], ['cebolla', 50], ['tomate', 80]],
  steps: ['Cortá la papa en rodajas finas y la cebolla y el tomate en rodajas. Armá una cama con la papa en una fuente con spray.',
    'Poné el pescado arriba con la cebolla y el tomate, sal, pimienta y limón.', 'Tapá con aluminio y horneá a 200 °C 25–30 min.'] });
H('Arroz con atún y verduras', { prot: 'pescado', carb: 'arroz', min: 25,
  ing: [['atun_lata', 180], ['arroz_blanco', 100], ['zapallito', 80], ['zanahoria', 40], ['cebolla', 30]],
  steps: ['Cociná el arroz con una pizca de sal.', 'Salteá la cebolla, el zapallito y la zanahoria en cubitos con spray 6 min.',
    'Mezclá con el arroz y el atún escurrido. Terminá con limón.'] });
H('Fideos con atún y salsa de tomate', { prot: 'pescado', carb: 'fideo', min: 20,
  ing: [['atun_lata', 180], ['fideo_sg', 100], ['salsa_tomate', 120], ['cebolla', 20]],
  steps: ['Herví los fideos sin gluten y escurrí.', 'Calentá la salsa con la cebolla picada 5 min; sumá el atún escurrido.', 'Mezclá con los fideos.'] });
H('Ensalada tibia de papa, atún y huevo', { prot: 'pescado', carb: 'papa', min: 25,
  ing: [['papa', 150], ['atun_lata', 150], ['huevo', 50], ['tomate', 60], ['cebolla', 20], ['verdeo', 10]],
  steps: ['Herví la papa en cubos 12–15 min y el huevo 10 min.', 'Mezclá todo con el tomate, la cebolla y la cebolla de hoja.',
    'Condimentá con sal, pimienta, limón y orégano.'] });
H('Tortilla de atún y papa', { prot: 'pescado', carb: 'papa', min: 25,
  ing: [['atun_lata', 120], ['huevo', 100], ['clara', 33], ['papa', 150], ['cebolla', 30]],
  steps: ['Herví la papa en cubitos y rehogá la cebolla con spray.', 'Batí los huevos y las claras; mezclá con la papa, la cebolla y el atún.',
    'Cociná en sartén con spray tapada, 4 min por lado.'] });
H('Pescado en papillote con batata y zapallito', { prot: 'pescado', carb: 'batata', min: 40,
  ing: [['pescado_blanco', 225], ['batata', 100], ['zapallito', 80], ['tomate', 60]],
  steps: ['Cortá la batata en rodajas finas y el zapallito y el tomate en rodajas.',
    'Armá un paquete de aluminio con las verduras abajo y el pescado arriba, con sal, pimienta y limón.', 'Cerrá y horneá a 200 °C 25 min.'] });
H('Arroz caldoso de pescado', { prot: 'pescado', carb: 'arroz', min: 35,
  ing: [['pescado_blanco', 225], ['arroz_blanco', 100], ['tomate', 80], ['cebolla', 40], ['morron', 40], ['caldo_verd', 250]],
  steps: ['Rehogá cebolla, morrón y tomate picados con spray.', 'Agregá el caldo y el arroz crudo (equivalente a tu porción); cociná 12 min.',
    'Sumá el pescado en cubos y cociná 6 min más, sin revolver mucho.'] });
H('Caldo de pescado con papa', { prot: 'pescado', carb: 'papa', min: 35,
  ing: [['pescado_blanco', 225], ['papa', 150], ['tomate', 60], ['cebolla', 40], ['morron', 30], ['caldo_verd', 300]],
  steps: ['Hacé hervir el caldo con la cebolla, el morrón y el tomate picados y la papa en cubos 12 min.',
    'Agregá el pescado en trozos y cociná 6–8 min. Condimentá con orégano y perejil.'] });

H('Tortilla de papa y cebolla', { prot: 'huevo', carb: 'papa', min: 30,
  ing: [['huevo', 100], ['clara', 66], ['papa', 150], ['cebolla', 50], ['ensalada', 100]],
  steps: ['Cortá la papa en rodajas finas y la cebolla en tiras; cocinalas en sartén con spray tapadas 12 min.',
    'Batí los huevos y las claras con sal y mezclá con la papa.', 'Cociná 4 min por lado en la sartén con spray. Serví con ensalada.'] });
H('Tortilla de batata y espinaca', { prot: 'huevo', carb: 'batata', min: 25,
  ing: [['huevo', 100], ['clara', 66], ['batata', 100], ['espinaca', 80]],
  steps: ['Herví la batata en cubitos 10 min.', 'Mezclala con la espinaca picada y los huevos y claras batidos, con sal y pimienta.', 'Cociná en sartén con spray tapada, 4 min por lado.'] });
H('Revuelto de huevo con papa y morrón', { prot: 'huevo', carb: 'papa', min: 25,
  ing: [['huevo', 100], ['clara', 66], ['papa', 150], ['morron', 50], ['cebolla', 30]],
  steps: ['Herví la papa en cubitos 10 min.', 'Salteá el morrón y la cebolla con spray; sumá la papa y doralas.', 'Volcá los huevos y claras batidos y revolvé hasta que cuajen.'] });
H('Arroz frito con huevo', { prot: 'huevo', carb: 'arroz', min: 20,
  ing: [['arroz_blanco', 100], ['huevo', 100], ['clara', 66], ['zanahoria', 40], ['verdeo', 20], ['soja', 15], ['cebolla', 30]],
  steps: ['Salteá la cebolla y la zanahoria en cubitos con spray 3 min.', 'Volcá los huevos y claras batidos y revolvé.', 'Sumá el arroz cocido frío, la salsa de soja y la cebolla de hoja; salteá 3 min.'] });
H('Fideos salteados con huevo y zapallito', { prot: 'huevo', carb: 'fideo', min: 20,
  ing: [['fideo_sg', 100], ['huevo', 100], ['clara', 66], ['zapallito', 100], ['cebolla', 30], ['soja', 10]],
  steps: ['Herví los fideos sin gluten y escurrí.', 'Salteá el zapallito y la cebolla con spray 4 min.', 'Agregá los fideos, la soja y los huevos batidos; revolvé hasta que cuajen.'] });
H('Omelette de verduras con batata al horno', { prot: 'huevo', carb: 'batata', min: 35,
  ing: [['huevo', 100], ['clara', 66], ['espinaca', 40], ['tomate', 50], ['cebolla', 30], ['batata', 100]],
  steps: ['Horneá la batata en cubos con spray y pimentón 25 min a 200 °C.', 'Hacé el omelette: batí huevos y claras, volcá en sartén con spray y rellená con la espinaca, el tomate y la cebolla.', 'Doblá y serví con la batata.'] });
H('Huevos en salsa de tomate con arroz', { prot: 'huevo', carb: 'arroz', min: 25,
  ing: [['huevo', 100], ['clara', 66], ['salsa_tomate', 150], ['cebolla', 40], ['morron', 40], ['arroz_blanco', 100]],
  steps: ['Cociná el arroz con una pizca de sal.', 'Rehogá la cebolla y el morrón con spray y agregá la salsa de tomate.',
    'Hacé huecos y volcá los huevos y las claras; tapá y cociná 5 min. Serví con el arroz.'] });
H('Crepioca salada con tomate y queso', { prot: 'huevo', carb: 'tapioca', min: 12,
  ing: [['tapioca', 50], ['huevo', 100], ['clara', 66], ['queso_feta', 20], ['tomate', 60]],
  steps: ['Mezclá la tapioca con los huevos y las claras y una pizca de sal.', 'Volcá en sartén antiadherente y cociná tapada 2 min por lado.', 'Rellená con el queso y el tomate en rodajas y doblá.'] });

// ---------------------------------------------------------------------------
// 9) Plan: desayunos, colaciones y meriendas (cantidades exactas de tu plan)
// ---------------------------------------------------------------------------
const PL = (name, meals, ing, steps, extra = {}) =>
  push({ name, meals, ing, steps, plan: true, src: 'plan', min: 8, ...extra });

PL('Galletitas de arroz con huevos revueltos', ['desayuno'], [['galletita_arroz', 18], ['huevo', 100], ['clara', 33]],
  ['Revolvé los huevos y la clara en sartén con spray.', 'Serví con las 2 galletitas de arroz y tu infusión con edulcorante.'], { prot: 'huevo', carb: 'pan' });
PL('Tostada con mermelada y huevos revueltos', ['desayuno'], [['pan_sg', 30], ['mermelada', 15], ['huevo', 100], ['clara', 33]],
  ['Tostá la rebanada de pan sin gluten y untala con mermelada.', 'Revolvé los huevos y la clara en sartén con spray.'], { prot: 'huevo', carb: 'pan' });
PL('Pan árabe sin gluten con huevos revueltos', ['desayuno'], [['pan_arabe_sg', 40], ['huevo', 100], ['clara', 33]],
  ['Calentá ½ pan árabe sin gluten.', 'Revolvé los huevos y la clara con spray y rellená el pan.'], { prot: 'huevo', carb: 'pan' });
PL('Crepioca de desayuno', ['desayuno'], [['huevo', 100], ['clara', 33], ['queso_feta', 20], ['tapioca', 35]],
  ['Mezclá los huevos, la clara y la tapioca con una pizca de sal.', 'Volcá en sartén antiadherente y cociná 2 min por lado.', 'Rellená con la feta de queso deslactosado y doblá.'], { prot: 'huevo', carb: 'tapioca' });
PL('Panqueque de avena y coco (desayuno)', ['desayuno'], [['huevo', 100], ['coco', 5], ['avena_sg', 35]],
  ['Batí los huevos con la avena sin gluten, el coco rallado y edulcorante.', 'Cociná en sartén con spray 2 min por lado (o al horno a 180 °C 12 min).'], { prot: 'huevo', carb: 'pan' });
PL('Yogurt proteico con avena', ['desayuno'], [['yogurt_prot', 170], ['avena_sg', 35]],
  ['Mezclá el yogurt proteico con la avena sin gluten.'], { carb: 'pan' });

PL('Batido de proteína con avena', ['merienda'], [['whey', 30], ['avena_sg', 50]],
  ['Batí 1 scoop de whey (deslactosado, carnívora o vegana) con agua.', 'Acompañá con los 50 g de avena sin gluten.'], { carb: 'pan' });
PL('Batido de proteína con chipitas', ['merienda'], [['whey', 30], ['chipitas', 10]],
  ['Batí 1 scoop de whey con agua y servilo con 5 chipitas.']);
PL('Batido de proteína con pororó', ['merienda'], [['whey', 30], ['pororo', 55]],
  ['Batí 1 scoop de whey con agua y comé el pororó (55 g) al lado.']);
PL('Crepioca de merienda', ['merienda'], [['huevo', 100], ['clara', 66], ['tapioca', 50]],
  ['Mezclá los huevos, las claras y la tapioca con una pizca de sal.', 'Cociná en sartén antiadherente 2 min por lado.'], { prot: 'huevo', carb: 'tapioca' });
PL('Yogurt proteico con chía y avena', ['merienda'], [['yogurt_prot', 170], ['chia', 5], ['avena_sg', 35]],
  ['Mezclá el yogurt con la chía y la avena sin gluten.'], { carb: 'pan' });
PL('Tostada con huevos revueltos y queso', ['merienda'], [['pan_sg', 30], ['mermelada', 15], ['huevo', 100], ['queso_feta', 20]],
  ['Tostá el pan sin gluten con mermelada.', 'Revolvé los 2 huevos con spray y armá con la feta de queso.'], { prot: 'huevo', carb: 'pan' });
PL('Crepioca con queso (merienda)', ['merienda'], [['huevo', 100], ['queso_feta', 20], ['tapioca', 35]],
  ['Mezclá los huevos con la tapioca y sal.', 'Cociná 2 min por lado y rellená con la feta de queso deslactosado.'], { prot: 'huevo', carb: 'tapioca' });
PL('Panqueque de avena y coco (merienda)', ['merienda'], [['huevo', 100], ['clara', 66], ['coco', 5], ['avena_sg', 35]],
  ['Batí los huevos y las claras con la avena sin gluten, el coco y edulcorante.', 'Cociná en sartén con spray 2 min por lado.'], { prot: 'huevo', carb: 'pan' });

PL('2 huevos cocidos', ['media_manana', 'media_tarde'], [['huevo', 100]], ['Herví 2 huevos 10 min, enfriá y pelá.'], { prot: 'huevo', min: 12 });
PL('Whey protein (½ scoop)', ['media_manana', 'media_tarde'], [['whey', 15]], ['Mezclá ½ scoop en 200 ml de agua (o leche deslactosada).'], { min: 2 });
PL('Yogurt proteico', ['media_manana', 'media_tarde'], [['yogurt_prot', 170]], ['Directo del pote.'], { min: 1 });
PL('Barrita proteica', ['media_manana', 'media_tarde'], [['barrita', 50]], ['Lista para comer.'], { min: 1 });

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export const BASE_RECIPES = out;
export const RECIPE_MAP = Object.fromEntries(out.map((r) => [r.id, r]));

export const PROT_GROUPS = [
  ['pollo', 'Pollo'], ['carne', 'Carne'], ['cerdo', 'Cerdo'], ['pescado', 'Pescado'], ['huevo', 'Huevo'],
];
export const CARB_GROUPS = [
  ['arroz', 'Arroz'], ['fideo', 'Fideo'], ['papa', 'Papa'], ['batata', 'Batata'], ['tapioca', 'Tapioca'], ['pan', 'Pan'],
];

// Macros de una receta (por porción base) según el estado del arroz/fideo y un multiplicador.
export function recipeMacros(recipe, foodMap, carbState = 'cocido', mult = 1) {
  let k = 0, p = 0, c = 0, f = 0, g = 0, l = 0;
  for (const [fid, grams] of recipe.ing) {
    const food = foodMap[fid];
    if (!food) continue;
    const pg = perGram(food, carbState);
    k += pg.k * grams; p += pg.p * grams; c += pg.c * grams; f += pg.f * grams;
    if (food.g) g = 1;
    if (food.l) l = 1;
  }
  return { k: k * mult, p: p * mult, c: c * mult, f: f * mult, gluten: !!g, lact: !!l };
}

// Sanity check de ingredientes (útil en desarrollo)
export function validateRecipes() {
  const bad = [];
  for (const r of out) for (const [fid] of r.ing) if (!FOOD_MAP[fid]) bad.push(`${r.id}: ${fid}`);
  return bad;
}
