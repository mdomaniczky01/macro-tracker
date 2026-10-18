// Medición de porciones desde una foto, 100% en el teléfono (sin servidores ni IA externa).
// Idea: vos marcás cada parte del plato (varita mágica / pincel / sugerencia automática por color),
// la app mide qué fracción del plato ocupa cada una y, usando el diámetro real del plato como regla,
// convierte esa superficie en gramos con un espesor típico de cada alimento.

// gramos por cm² de plato que cubre cada alimento (ya cocido, en un plato playo)
export const GPC = {
  pollo_pechuga: 1.9, pollo_muslo: 2.0, carne_magra: 2.0, carne_molida: 1.8, cerdo_lomo: 1.9, cerdo_bife: 1.9,
  pescado_blanco: 1.7, huevo: 1.2, clara: 1.0, arroz_blanco: 1.25, arroz_integral: 1.25, fideo_sg: 1.0, fideo_trigo: 1.0,
  papa: 1.3, batata: 1.3, mandioca: 1.3, tapioca: 1.0, pan_hamb_sg: 1.0, ensalada: 0.7, verd_salteadas: 1.0, brocoli: 1.0,
};
const GPC_DEFAULT = { prot: 1.8, carb: 1.2, veg: 0.8 };
export const gpcFor = (food, group) => GPC[food.id] ?? GPC_DEFAULT[group] ?? 1;

// ---------- color ----------
function rgb2lab(r, g, b) {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const R = f(r), G = f(g), B = f(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = h(x); y = h(y); z = h(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const median = (a) => { const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)] || 0; };

export class Portion {
  constructor(img, maxDim = 360) {
    const s = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    this.W = Math.max(8, Math.round((img.naturalWidth || img.width) * s));
    this.H = Math.max(8, Math.round((img.naturalHeight || img.height) * s));
    const c = document.createElement('canvas');
    c.width = this.W; c.height = this.H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, this.W, this.H);
    this.px = ctx.getImageData(0, 0, this.W, this.H).data;
    const N = this.W * this.H;
    this.lab = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const l = rgb2lab(this.px[i * 4], this.px[i * 4 + 1], this.px[i * 4 + 2]);
      this.lab[i * 3] = l[0]; this.lab[i * 3 + 1] = l[1]; this.lab[i * 3 + 2] = l[2];
    }
    this.labels = new Uint8Array(N);
    this.hist = [];
    this.circle = { cx: this.W / 2, cy: this.H / 2, r: Math.min(this.W, this.H) * 0.46 };
    this.overlay = new ImageData(this.W, this.H);
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.width = this.W; this.overlayCanvas.height = this.H;
  }
  inC(x, y, k = 1) { const dx = x - this.circle.cx, dy = y - this.circle.cy, r = this.circle.r * k; return dx * dx + dy * dy <= r * r; }
  snapshot() { this.hist.push(this.labels.slice()); if (this.hist.length > 25) this.hist.shift(); }
  undo() { const h = this.hist.pop(); if (h) this.labels.set(h); return !!h; }
  clear() { this.snapshot(); this.labels.fill(0); }

  // varita mágica: rellena la zona de color parecido al punto tocado
  wand(x, y, label, tol = 18) {
    const { W, H, lab, labels } = this;
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H || !this.inC(x, y)) return 0;
    this.snapshot();
    let L0 = 0, A0 = 0, B0 = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const i = (yy * W + xx) * 3; L0 += lab[i]; A0 += lab[i + 1]; B0 += lab[i + 2]; n++;
    }
    L0 /= n; A0 /= n; B0 /= n;
    const cap = Math.PI * this.circle.r * this.circle.r * 0.5; // una parte no ocupa más de la mitad del plato
    const flood = (tl) => {
      const seen = new Uint8Array(W * H), q = new Int32Array(W * H);
      let h = 0, t = 0;
      q[t++] = y * W + x; seen[y * W + x] = 1;
      const out = [];
      while (h < t) {
        const p = q[h++], px = p % W, py = (p / W) | 0;
        const i = p * 3, dL = 0.6 * (lab[i] - L0), dA = lab[i + 1] - A0, dB = lab[i + 2] - B0;
        if (Math.sqrt(dL * dL + dA * dA + dB * dB) > tl) continue;
        out.push(p);
        if (out.length > cap * 1.2) return out; // se está escapando
        if (px > 0 && !seen[p - 1] && this.inC(px - 1, py)) { seen[p - 1] = 1; q[t++] = p - 1; }
        if (px < W - 1 && !seen[p + 1] && this.inC(px + 1, py)) { seen[p + 1] = 1; q[t++] = p + 1; }
        if (py > 0 && !seen[p - W] && this.inC(px, py - 1)) { seen[p - W] = 1; q[t++] = p - W; }
        if (py < H - 1 && !seen[p + W] && this.inC(px, py + 1)) { seen[p + W] = 1; q[t++] = p + W; }
      }
      return out;
    };
    let tl = tol, px = flood(tl);
    for (let k = 0; k < 5 && px.length > cap; k++) { tl *= 0.7; px = flood(tl); } // baja la sensibilidad si se pasa
    if (px.length > cap) return 0;
    for (const p of px) labels[p] = label;
    this.lastTol = tl;
    return px.length;
  }
  // pincel (label 0 = borrador)
  brush(x, y, rad, label) {
    const { W, H, labels } = this;
    const x0 = Math.max(0, Math.floor(x - rad)), x1 = Math.min(W - 1, Math.ceil(x + rad));
    const y0 = Math.max(0, Math.floor(y - rad)), y1 = Math.min(H - 1, Math.ceil(y + rad));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      if ((xx - x) ** 2 + (yy - y) ** 2 <= rad * rad && this.inC(xx, yy)) labels[yy * W + xx] = label;
    }
  }
  // cuenta de píxeles por etiqueta dentro del círculo del plato
  counts(nLabels) {
    const { W, H, labels } = this;
    const c = new Uint32Array(nLabels + 1);
    let total = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!this.inC(x, y)) continue;
      total++; const l = labels[y * W + x]; if (l <= nLabels) c[l]++;
    }
    return { c, total: total || 1 };
  }

  // sugerencia automática: separa por color lo que no es plato y lo reparte entre las partes
  suggest(groups) {
    const n = groups.length;
    if (!n) return false;
    const { W, H, lab, circle } = this;
    // color de fondo = el color más frecuente del anillo exterior del plato (cuantizado)
    const bins = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - circle.cx, y - circle.cy);
      if (d > circle.r * 0.78 && d <= circle.r * 0.97) {
        const i = (y * W + x) * 3;
        const key = Math.round(lab[i] / 6) * 10000 + Math.round(lab[i + 1] / 6) * 100 + Math.round(lab[i + 2] / 6);
        const b = bins.get(key) || [0, 0, 0, 0];
        b[0] += lab[i]; b[1] += lab[i + 1]; b[2] += lab[i + 2]; b[3]++;
        bins.set(key, b);
      }
    }
    let top = null;
    for (const b of bins.values()) if (!top || b[3] > top[3]) top = b;
    if (!top) return false;
    const bg = [top[0] / top[3], top[1] / top[3], top[2] / top[3]];
    const idx = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!this.inC(x, y, 0.96)) continue;
      const i = (y * W + x) * 3;
      const d = Math.hypot(lab[i] - bg[0], lab[i + 1] - bg[1], lab[i + 2] - bg[2]);
      if (d > 8) idx.push(y * W + x);
    }
    if (idx.length < 150) return false;
    // k-means (k = partes) sobre una muestra
    let seed = 12345;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const step = Math.max(1, Math.floor(idx.length / 5000)), S = [];
    for (let i = 0; i < idx.length; i += step) S.push(idx[i]);
    const at = (p) => [lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2]];
    const dist = (a, b) => (a[0] - b[0]) ** 2 * 0.36 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    const cents = [at(S[Math.floor(rnd() * S.length)])];
    while (cents.length < n) {
      const ds = S.map((p) => Math.min(...cents.map((c) => dist(at(p), c))));
      const sum = ds.reduce((a, b) => a + b, 0) || 1;
      let r = rnd() * sum, k = 0;
      for (; k < ds.length - 1; k++) { r -= ds[k]; if (r <= 0) break; }
      cents.push(at(S[k]));
    }
    for (let it = 0; it < 10; it++) {
      const acc = cents.map(() => [0, 0, 0, 0]);
      for (const p of S) {
        const v = at(p);
        let best = 0, bd = Infinity;
        cents.forEach((c, k) => { const d = dist(v, c); if (d < bd) { bd = d; best = k; } });
        const a = acc[best]; a[0] += v[0]; a[1] += v[1]; a[2] += v[2]; a[3]++;
      }
      acc.forEach((a, k) => { if (a[3]) cents[k] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
    }
    // puntuación de cada cluster para cada grupo (heurística de color)
    const chroma = (c) => Math.hypot(c[1], c[2]);
    const score = (g, c) => {
      const ch = chroma(c);
      if (g === 'veg') return -c[1] / 18 + c[2] / 90 + (c[0] < 70 ? 0.1 : 0);
      if (g === 'prot') return 0.7 * (ch / 35) + 0.6 * ((72 - c[0]) / 40) + (c[1] > 4 ? 0.25 : 0) - (c[1] < -6 ? 0.8 : 0);
      return 0.9 * ((c[0] - 55) / 40) - 0.7 * (ch / 40) - (c[1] < -6 ? 0.8 : 0); // carb: claro y poco saturado
    };
    // mejor asignación grupo → cluster (n chico: probamos todas las permutaciones)
    const perms = [];
    const permute = (arr, cur = []) => { if (!arr.length) { perms.push(cur); return; } arr.forEach((v, i) => permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...cur, v])); };
    permute([...Array(n).keys()]);
    let bestP = perms[0], bs = -Infinity;
    for (const p of perms) { const s = p.reduce((a, k, gi) => a + score(groups[gi], cents[k]), 0); if (s > bs) { bs = s; bestP = p; } }
    const clusterToLabel = {};
    bestP.forEach((k, gi) => { clusterToLabel[k] = gi + 1; });
    this.snapshot();
    this.labels.fill(0);
    for (const p of idx) {
      const v = at(p);
      let best = 0, bd = Infinity;
      cents.forEach((c, k) => { const d = dist(v, c); if (d < bd) { bd = d; best = k; } });
      this.labels[p] = clusterToLabel[best];
    }
    return true;
  }

  // capa de color translúcida con las zonas marcadas
  paintOverlay(colors) {
    const { labels, overlay } = this, d = overlay.data;
    const rgb = colors.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      if (l && rgb[l - 1]) { d[i * 4] = rgb[l - 1][0]; d[i * 4 + 1] = rgb[l - 1][1]; d[i * 4 + 2] = rgb[l - 1][2]; d[i * 4 + 3] = 150; } else d[i * 4 + 3] = 0;
    }
    this.overlayCanvas.getContext('2d').putImageData(overlay, 0, 0);
  }
}

// carga una File/Blob como <img> (el navegador aplica la orientación EXIF)
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 5000); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir la imagen')); };
    img.src = url;
  });
}
