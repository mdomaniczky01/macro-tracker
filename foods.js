// Base de alimentos. Valores por 100 g (o 100 ml), aproximados (tablas USDA / etiquetas comunes).
// k = kcal, p = proteína, c = carbohidratos, f = grasa
// g = contiene gluten, l = contiene lactosa
// def = cantidad por defecto (g) al agregarlo
// u = unidad natural {n: nombre, g: gramos por unidad, step: paso del selector}
// v = macros según se pese cocido o crudo. y = rendimiento (peso cocido / peso crudo). fem = nombre femenino

const F = (id, n, k, p, c, f, cat, extra = {}) => ({ id, n, k, p, c, f, cat, g: false, l: false, def: 100, ...extra });

export const FOODS = [
  // ---- Proteínas (pesos en crudo) ----
  F('pollo_pechuga', 'Pechuga de pollo', 165, 31, 0, 3.6, 'prot', { def: 175, v: { cocido: [165, 31, 0, 3.6], crudo: [120, 22.5, 0, 2.6] }, y: 0.75, fem: true }),
  F('pollo_muslo', 'Muslo de pollo sin piel', 180, 25, 0, 8, 'prot', { def: 175, v: { cocido: [180, 25, 0, 8], crudo: [121, 19.7, 0, 4.1] }, y: 0.75 }),
  F('carne_magra', 'Carne vacuna magra (cuadril/peceto)', 185, 30, 0, 6.5, 'prot', { def: 175, v: { cocido: [185, 30, 0, 6.5], crudo: [135, 21.5, 0, 5] }, y: 0.72, fem: true }),
  F('carne_molida', 'Carne molida magra', 215, 26, 0, 12, 'prot', { def: 175, v: { cocido: [215, 26, 0, 12], crudo: [160, 20.5, 0, 8.5] }, y: 0.72, fem: true }),
  F('cerdo_lomo', 'Lomo de cerdo', 145, 26, 0, 3.8, 'prot', { def: 175, v: { cocido: [145, 26, 0, 3.8], crudo: [120, 21, 0, 3.5] }, y: 0.75 }),
  F('cerdo_bife', 'Bife de cerdo magro', 195, 28, 0, 8, 'prot', { def: 175, v: { cocido: [195, 28, 0, 8], crudo: [155, 20.5, 0, 8] }, y: 0.72 }),
  F('pescado_blanco', 'Pescado blanco: surubí/tilapia/merluza', 128, 26, 0, 2.7, 'prot', { def: 225, v: { cocido: [128, 26, 0, 2.7], crudo: [100, 20.5, 0, 1.8] }, y: 0.8 }),
  F('atun_lata', 'Atún al natural (escurrido)', 115, 26, 0, 1, 'prot', { def: 120, u: { n: 'lata', g: 120, step: 1 } }),
  F('huevo', 'Huevo entero', 143, 12.6, 0.7, 9.5, 'prot', { def: 100, u: { n: 'huevo', g: 50, step: 1 } }),
  F('clara', 'Clara de huevo', 52, 10.9, 0.7, 0.2, 'prot', { def: 66, u: { n: 'clara', g: 33, step: 1 } }),

  // ---- Hidratos ----
  F('arroz_blanco', 'Arroz blanco', 130, 2.7, 28, 0.3, 'carb', {
    v: { cocido: [130, 2.7, 28, 0.3], crudo: [360, 7, 79, 0.6] }, y: 2.6,
  }),
  F('arroz_integral', 'Arroz integral', 123, 2.7, 25.6, 1, 'carb', {
    v: { cocido: [123, 2.7, 25.6, 1], crudo: [355, 7.5, 76, 2.7] }, y: 2.5,
  }),
  F('fideo_sg', 'Fideo sin gluten (arroz/maíz)', 150, 3, 33, 0.7, 'carb', {
    v: { cocido: [150, 3, 33, 0.7], crudo: [357, 7, 78, 1.5] }, y: 2.3,
  }),
  F('fideo_trigo', 'Fideo de trigo', 158, 5.8, 31, 0.9, 'carb', {
    g: true, v: { cocido: [158, 5.8, 31, 0.9], crudo: [360, 12.5, 74, 1.5] }, y: 2.3,
  }),
  F('papa', 'Papa', 87, 1.9, 20, 0.1, 'carb', { def: 150, v: { cocido: [87, 1.9, 20, 0.1], crudo: [77, 2, 17, 0.1] }, fem: true }),
  F('batata', 'Batata', 90, 2, 20.7, 0.2, 'carb', { def: 100, v: { cocido: [90, 2, 20.7, 0.2], crudo: [86, 1.6, 20, 0.1] }, fem: true }),
  F('mandioca', 'Mandioca (cocida)', 160, 1.4, 38, 0.3, 'carb', { def: 100 }),
  F('tapioca', 'Tapioca (fécula seca)', 358, 0.2, 88, 0, 'carb', { def: 50 }),
  F('pan_hamb_sg', 'Pan de hamburguesa sin gluten', 280, 4, 50, 6, 'carb', { def: 65, u: { n: 'pan', g: 65, step: 1 } }),
  F('pan_sg', 'Pan tostado sin gluten (rebanada)', 250, 3, 48, 4, 'carb', { def: 30, u: { n: 'rebanada', g: 30, step: 1 } }),
  F('pan_arabe_sg', 'Pan árabe sin gluten', 260, 3.5, 50, 4, 'carb', { def: 40, u: { n: 'mitad', g: 40, step: 1 } }),
  F('avena_sg', 'Avena sin gluten', 380, 13, 67, 7, 'carb', { def: 35 }),
  F('galletita_arroz', 'Galletitas de arroz', 385, 8, 81, 3, 'carb', { def: 18, u: { n: 'galletita', g: 9, step: 1 } }),
  F('pororo', 'Pororó (pochoclo sin azúcar)', 387, 12.9, 77.8, 4.5, 'carb', { def: 55 }),
  F('mermelada', 'Mermelada diet', 100, 0.3, 25, 0.1, 'carb', { def: 15, u: { n: 'cucharada', g: 15, step: 1 } }),

  // ---- Lácteos (deslactosados) y suplementos ----
  F('queso_feta', 'Queso en fetas deslactosado', 320, 22, 2, 25, 'lacteo', { def: 20, u: { n: 'feta', g: 20, step: 1 } }),
  F('yogurt_prot', 'Yogurt proteico (pote)', 65, 9, 5, 1, 'lacteo', { def: 170, u: { n: 'pote', g: 170, step: 1 } }),
  F('leche_desl', 'Leche deslactosada', 60, 3.1, 4.7, 3.3, 'lacteo', { def: 200 }),
  F('whey', 'Whey protein (deslactosado/vegano)', 400, 80, 8, 6, 'supl', { def: 30, u: { n: 'scoop', g: 30, step: 0.5 } }),
  F('barrita', 'Barrita proteica', 380, 36, 36, 12, 'supl', { def: 50, u: { n: 'barrita', g: 50, step: 1 } }),

  // ---- Grasas y extras ----
  F('aceite_oliva', 'Aceite de oliva', 884, 0, 0, 100, 'grasa', { def: 13, u: { n: 'cucharada', g: 13, step: 1 } }),
  F('coco', 'Coco rallado sin azúcar', 660, 7, 24, 65, 'grasa', { def: 5, u: { n: 'cucharita', g: 5, step: 1 } }),
  F('chia', 'Semillas de chía', 486, 17, 42, 31, 'grasa', { def: 5, u: { n: 'cucharadita', g: 5, step: 1 } }),
  F('chipitas', 'Chipitas de chocolate', 480, 4, 62, 26, 'snack', { def: 10, u: { n: 'chipita', g: 2, step: 1 } }),
  F('soja', 'Salsa de soja', 53, 8, 5, 0, 'extra', { def: 15, u: { n: 'cucharada', g: 15, step: 1 } }),
  F('mostaza', 'Mostaza', 66, 4, 6, 4, 'extra', { def: 10, u: { n: 'cucharada', g: 10, step: 1 } }),
  F('salsa_tomate', 'Salsa/puré de tomate natural', 32, 1.5, 6.5, 0.2, 'extra', { def: 100 }),

  // ---- Verduras ----
  F('ensalada', 'Ensalada clásica (lechuga, tomate, zanahoria)', 22, 1, 4.5, 0.2, 'veg', { def: 150 }),
  F('verd_salteadas', 'Verduras salteadas (mix)', 35, 1.8, 6.5, 0.4, 'veg', { def: 150 }),
  F('caldo_verd', 'Caldo de verduras', 8, 0.3, 1.5, 0.1, 'veg', { def: 250 }),
  F('cebolla', 'Cebolla', 40, 1.1, 9.3, 0.1, 'veg', { def: 50 }),
  F('morron', 'Morrón', 26, 1, 6, 0.3, 'veg', { def: 50 }),
  F('tomate', 'Tomate', 18, 0.9, 3.9, 0.2, 'veg', { def: 100 }),
  F('zanahoria', 'Zanahoria', 41, 0.9, 9.6, 0.2, 'veg', { def: 60 }),
  F('zapallito', 'Zapallito / zucchini', 17, 1.2, 3.1, 0.3, 'veg', { def: 100 }),
  F('brocoli', 'Brócoli', 34, 2.8, 7, 0.4, 'veg', { def: 100 }),
  F('espinaca', 'Espinaca', 23, 2.9, 3.6, 0.4, 'veg', { def: 80 }),
  F('verdeo', 'Cebolla de hoja', 32, 1.8, 7.3, 0.2, 'veg', { def: 20 }),

  // ---- Libres / cero calorías ----
  F('infusion', 'Café / té / cocido con edulcorante', 2, 0.1, 0, 0, 'libre', { def: 100, u: { n: 'taza', g: 100, step: 1 }, only: 'unit' }),
  F('gaseosa_zero', 'Gaseosa Zero (lata 350 ml)', 0, 0, 0, 0, 'libre', { def: 100, u: { n: 'lata', g: 100, step: 1 }, only: 'unit' }),
  F('gelatina_diet', 'Gelatina diet (porción)', 5, 1, 0, 0, 'libre', { def: 100, u: { n: 'porción', g: 100, step: 1 }, only: 'unit' }),
];

export const FOOD_MAP = Object.fromEntries(FOODS.map((f) => [f.id, f]));

// Macros por gramo de un alimento (respeta cocido/crudo para arroz y fideo).
export function perGram(food, carbState = 'cocido') {
  let k = food.k, p = food.p, c = food.c, f = food.f;
  if (food.v) [k, p, c, f] = food.v[carbState] || food.v.cocido;
  return { k: k / 100, p: p / 100, c: c / 100, f: f / 100 };
}

export function foodLabel(food, carbState = 'cocido') {
  if (!food.v) return food.n;
  const word = carbState === 'cocido' ? (food.fem ? 'cocida' : 'cocido') : (food.fem ? 'cruda' : 'crudo');
  return `${food.n} (${word})`;
}
