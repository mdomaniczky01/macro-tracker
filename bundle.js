(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // js/parse.js
  var parse_exports = {};
  __export(parse_exports, {
    norm: () => norm,
    parseMeal: () => parseMeal
  });
  function qty(chunk) {
    let m = chunk.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|grs|gramos?|ml)\b/);
    if (m) {
      const v = parseFloat(m[1].replace(",", "."));
      return { g: /^kg/.test(m[2]) ? v * 1e3 : v };
    }
    m = chunk.match(new RegExp(`\\b(\\d+(?:[.,]\\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|medio|media)\\s+(?:de\\s+)?${UNIT_RE}\\b`));
    if (m) {
      const n = NUM[m[1]] ?? parseFloat(m[1].replace(",", "."));
      return { count: n, word: m[2] };
    }
    return {};
  }
  function sizeMult(chunk) {
    if (/\b(doble|abundante|grande|grandes|mucho|mucha|bien cargado)\b/.test(chunk)) return 1.4;
    if (/\b(chico|chica|chicos|chicas|poco|poca|pequeno|pequena|medio plato|liviano)\b/.test(chunk)) return 0.7;
    return 1;
  }
  function parseMeal(text, foods, { avoidGluten = true } = {}) {
    const FM2 = Object.fromEntries(foods.map((f) => [f.id, f]));
    const items = [], unknown = [], ignored = [];
    let globalMult = 1;
    const t = norm(text).replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
    if (!t) return { items, unknown, ignored };
    const chunks = t.split(/\s*(?:,|;|\.|\n|\+|&|\bcon\b|\by\b|\bmas\b|\bjunto a\b|\bacompanad[oa] de\b|\bsobre\b)\s*/).map((c) => c.trim()).filter(Boolean);
    const toG = (q, fid) => {
      if (q.g != null) return q.g;
      if (q.count != null) {
        const f = FM2[fid];
        if (f && f.u && !f.only && norm(f.u.n).startsWith(q.word.replace(/s$/, "").slice(0, 4))) return q.count * f.u.g;
        let per = WORD_G[q.word];
        if (q.word.startsWith("taza") && fid && /^(arroz|fideo)/.test(fid)) per = 160;
        if (per) return q.count * per;
      }
      return null;
    };
    const add = (fid, q, mult, raw, fixedG = null) => {
      if (!FM2[fid]) return;
      const food = FM2[fid];
      if (food.only) return;
      const g = fixedG != null ? null : toG(q, fid);
      items.push({ fid, g, fixedG, mult: fixedG != null ? 1 : mult, raw });
    };
    const protOf = (c) => {
      if (/\b(muslo|pata|contramuslo)\b/.test(c)) return "pollo_muslo";
      if (/\b(pollo|pechuga|suprema)\b/.test(c)) return "pollo_pechuga";
      if (/\b(cerdo|bondiola|costeleta|chancho|puerco|carre)\b/.test(c)) return /bife|costeleta/.test(c) ? "cerdo_bife" : "cerdo_lomo";
      if (/\b(pescado|surubi|tilapia|merluza|dorado|pacu|filet de pescado|salmon)\b/.test(c)) return "pescado_blanco";
      if (/\batun\b/.test(c)) return "atun_lata";
      if (/\b(molida|picada)\b/.test(c)) return "carne_molida";
      if (/\b(carne|bife|churrasco|cuadril|peceto|asado|lomo|vaca|vacuna|nalga|colita|bola de lomo|vacio|costilla)\b/.test(c)) return "carne_magra";
      return null;
    };
    for (const c of chunks) {
      if (/^(una |un |la |el )?(porcion|racion|plato|cantidad)( (grande|chica|chico|abundante|pequena|doble|generosa))?$/.test(c) || /^(doble|abundante|bien cargado|poco|poca|chico|chica|grande|medio plato)$/.test(c)) {
        globalMult = sizeMult(c);
        continue;
      }
      if (/^(un |una |el |la |mi )?(cafe|te|mate|mate cocido|cocido|infusion|agua|gaseosa|coca zero|coca|zero|gelatina|gelatina diet|edulcorante|stevia)( [a-z ]*)?$/.test(c)) {
        ignored.push(c);
        continue;
      }
      const q = qty(c), mult = sizeMult(c);
      const before = items.length;
      const prot = protOf(c);
      if (/milanesa|empanad|rebozad/.test(c)) {
        add(prot || "carne_magra", q, mult, c);
        add("huevo", {}, 1, c, 25);
        add("tapioca", {}, 1, c, 15);
      } else if (/hamburguesa/.test(c)) {
        add(prot && !["atun_lata", "carne_magra"].includes(prot) ? prot : "carne_molida", q.g != null ? q : {}, mult, c);
        if (!/sin pan/.test(c)) add("pan_hamb_sg", {}, 1, c, 65);
      } else if (/tortilla|omelette|omelet|revuelto/.test(c)) {
        add("huevo", q, mult, c);
        if (/papa/.test(c)) add("papa", {}, mult, c);
        else if (/batata/.test(c)) add("batata", {}, mult, c);
        if (/espinaca/.test(c)) add("espinaca", {}, mult, c);
        else if (/verdura/.test(c)) add("verd_salteadas", {}, mult, c);
      } else if (prot) {
        add(prot, q, mult, c);
      } else if (/\bclaras?\b/.test(c)) {
        add("clara", q, mult, c);
      } else if (/\b(huevos?)\b/.test(c)) {
        add("huevo", q, mult, c);
      } else if (/arroz integral/.test(c)) {
        add("arroz_integral", q, mult, c);
      } else if (/arroz/.test(c)) {
        add("arroz_blanco", q, mult, c);
      } else if (/\b(fideos?|pasta|pastas|tallarin|tallarines|espagueti|spaghetti|macarron|macarrones|penne|noquis|ravioles?)\b/.test(c)) {
        add(avoidGluten ? "fideo_sg" : "fideo_trigo", q, mult, c);
      } else if (/papas? fritas?/.test(c)) {
        add("papa", q, mult, c);
        add("aceite_oliva", {}, 1, c, 13);
      } else if (/\bpure\b/.test(c)) {
        add(/batata|camote/.test(c) ? "batata" : "papa", q, mult, c);
        add("leche_desl", {}, 1, c, 30);
      } else if (/\b(papas?|patatas?)\b/.test(c)) {
        add("papa", q, mult, c);
      } else if (/\b(batatas?|camote)\b/.test(c)) {
        add("batata", q, mult, c);
      } else if (/\b(mandioca|mandi'?o)\b/.test(c)) {
        add("mandioca", q, mult, c);
      } else if (/tapioca|chipa/.test(c)) {
        add("tapioca", q, mult, c);
      } else if (/\b(tostadas?|rebanadas? de pan)\b/.test(c)) {
        add("pan_sg", q, mult, c);
      } else if (/\bpan\b/.test(c)) {
        add("pan_hamb_sg", q.count != null ? { count: q.count, word: "pan" } : q, mult, c);
      } else if (/\b(ensalada|lechuga|rucula|repollo|rucula)\b/.test(c)) {
        add("ensalada", q, mult, c);
      } else if (/\b(verduras?|salteado de verduras|wok|vegetales)\b/.test(c)) {
        add("verd_salteadas", q, mult, c);
      } else if (/brocoli|brocol/.test(c)) {
        add("brocoli", q, mult, c);
      } else if (/zapallito|zucchini|calabacin/.test(c)) {
        add("zapallito", q, mult, c);
      } else if (/espinaca/.test(c)) {
        add("espinaca", q, mult, c);
      } else if (/salsa de soja|\bsoja\b/.test(c)) {
        add("soja", q, mult, c, q.g != null ? null : 15);
      } else if (/mostaza/.test(c)) {
        add("mostaza", q, mult, c, q.g != null ? null : 10);
      } else if (/salsa|tomate triturado|pure de tomate|salsa de tomate/.test(c)) {
        add("salsa_tomate", q, mult, c);
      } else if (/tomate/.test(c)) {
        add("tomate", q, mult, c);
      } else if (/cebolla de hoja|verdeo/.test(c)) {
        add("verdeo", q, mult, c);
      } else if (/cebolla/.test(c)) {
        add("cebolla", q, mult, c);
      } else if (/morron|pimiento/.test(c)) {
        add("morron", q, mult, c);
      } else if (/zanahoria/.test(c)) {
        add("zanahoria", q, mult, c);
      } else if (/queso/.test(c)) {
        add("queso_feta", q, mult, c, q.g != null || q.count != null ? null : 20);
      } else if (/aceite/.test(c)) {
        add("aceite_oliva", q, mult, c, q.g != null ? null : 13);
      } else if (/yogu?rt/.test(c)) {
        add("yogurt_prot", q, mult, c);
      } else if (/avena/.test(c)) {
        add("avena_sg", q, mult, c);
      } else if (/whey|batido|proteina/.test(c)) {
        add("whey", q, mult, c);
      } else if (/barrita/.test(c)) {
        add("barrita", q, mult, c);
      } else if (/galletitas?/.test(c)) {
        add("galletita_arroz", q, mult, c);
      } else if (/pororo|pochoclo|palomitas/.test(c)) {
        add("pororo", q, mult, c);
      } else if (/mermelada/.test(c)) {
        add("mermelada", q, mult, c);
      } else if (/\bleche\b/.test(c)) {
        add("leche_desl", q, mult, c);
      } else if (/\bchia\b/.test(c)) {
        add("chia", q, mult, c);
      } else if (/\bcoco\b/.test(c)) {
        add("coco", q, mult, c);
      }
      if (items.length === before) {
        const words = c.replace(/\d+(?:[.,]\d+)?\s*(kg|g|gr|grs|gramos?|ml)?/g, "").split(" ").filter((w) => w.length >= 4 && !/^(para|unas?|unos?|algo|bien|medio|media|porcion|plato|comi|comida|almuerzo|cena|tome)$/.test(w));
        let hit = null;
        if (words.length) hit = foods.find((f) => !f.only && words.every((w) => norm(f.n).includes(w))) || foods.find((f) => !f.only && words.some((w) => norm(f.n).split(/\W+/).includes(w)));
        if (hit) add(hit.id, q, mult, c);
        else if (/[a-z]{3,}/.test(c) && !/^(un|una|el|la|los|las|de|del|al|un poco)$/.test(c)) unknown.push(c.replace(/^(un|una|unos|unas|el|la|los|las|de)\s+/, ""));
      }
    }
    const hasSalad = items.some((i) => i.fid === "ensalada");
    const out2 = [];
    for (const it of items) {
      if (hasSalad && (it.fid === "tomate" || it.fid === "zanahoria") && it.g == null) continue;
      const ex = out2.find((o) => o.fid === it.fid);
      if (ex) {
        if (ex.g == null && it.g != null) ex.g = it.g;
        continue;
      }
      out2.push(it);
    }
    if (globalMult !== 1) out2.forEach((o) => {
      if (o.fixedG == null) o.mult *= globalMult;
    });
    return { items: out2, unknown, ignored };
  }
  var norm, NUM, WORD_G, UNIT_RE;
  var init_parse = __esm({
    "js/parse.js"() {
      norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      NUM = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, medio: 0.5, media: 0.5 };
      WORD_G = {
        huevo: 50,
        huevos: 50,
        clara: 33,
        claras: 33,
        lata: 120,
        latas: 120,
        pan: 65,
        panes: 65,
        rebanada: 30,
        rebanadas: 30,
        feta: 20,
        fetas: 20,
        galletita: 9,
        galletitas: 9,
        cucharada: 15,
        cucharadas: 15,
        cucharadita: 5,
        cucharaditas: 5,
        scoop: 30,
        scoops: 30,
        pote: 170,
        potes: 170,
        barrita: 50,
        barritas: 50,
        taza: 150,
        tazas: 150,
        vaso: 200,
        vasos: 200,
        presa: 120,
        presas: 120,
        filete: 150,
        filetes: 150,
        milanesa: 150,
        milanesas: 150,
        hamburguesa: 130,
        hamburguesas: 130,
        papa: 150,
        papas: 150,
        batata: 100,
        batatas: 100
      };
      UNIT_RE = "(huevos?|claras?|latas?|panes?|rebanadas?|fetas?|galletitas?|cucharadas?|cucharaditas?|scoops?|potes?|barritas?|tazas?|vasos?|presas?|filetes?|milanesas?|hamburguesas?|papas?|batatas?)";
    }
  });

  // js/vision.js
  var vision_exports = {};
  __export(vision_exports, {
    GPC: () => GPC,
    Portion: () => Portion,
    gpcFor: () => gpcFor,
    loadImage: () => loadImage
  });
  function rgb2lab(r, g, b) {
    const f = (c) => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const R = f(r), G = f(g), B = f(b);
    let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const h = (t) => t > 8856e-6 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    x = h(x);
    y = h(y);
    z = h(z);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve(img);
        setTimeout(() => URL.revokeObjectURL(url), 5e3);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo abrir la imagen"));
      };
      img.src = url;
    });
  }
  var GPC, GPC_DEFAULT, gpcFor, Portion;
  var init_vision = __esm({
    "js/vision.js"() {
      GPC = {
        pollo_pechuga: 1.9,
        pollo_muslo: 2,
        carne_magra: 2,
        carne_molida: 1.8,
        cerdo_lomo: 1.9,
        cerdo_bife: 1.9,
        pescado_blanco: 1.7,
        huevo: 1.2,
        clara: 1,
        arroz_blanco: 1.25,
        arroz_integral: 1.25,
        fideo_sg: 1,
        fideo_trigo: 1,
        papa: 1.3,
        batata: 1.3,
        mandioca: 1.3,
        tapioca: 1,
        pan_hamb_sg: 1,
        ensalada: 0.7,
        verd_salteadas: 1,
        brocoli: 1
      };
      GPC_DEFAULT = { prot: 1.8, carb: 1.2, veg: 0.8 };
      gpcFor = (food, group) => GPC[food.id] ?? GPC_DEFAULT[group] ?? 1;
      Portion = class {
        constructor(img, maxDim = 360) {
          const s = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
          this.W = Math.max(8, Math.round((img.naturalWidth || img.width) * s));
          this.H = Math.max(8, Math.round((img.naturalHeight || img.height) * s));
          const c = document.createElement("canvas");
          c.width = this.W;
          c.height = this.H;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, this.W, this.H);
          this.px = ctx.getImageData(0, 0, this.W, this.H).data;
          const N = this.W * this.H;
          this.lab = new Float32Array(N * 3);
          for (let i = 0; i < N; i++) {
            const l = rgb2lab(this.px[i * 4], this.px[i * 4 + 1], this.px[i * 4 + 2]);
            this.lab[i * 3] = l[0];
            this.lab[i * 3 + 1] = l[1];
            this.lab[i * 3 + 2] = l[2];
          }
          this.labels = new Uint8Array(N);
          this.hist = [];
          this.circle = { cx: this.W / 2, cy: this.H / 2, r: Math.min(this.W, this.H) * 0.46 };
          this.overlay = new ImageData(this.W, this.H);
          this.overlayCanvas = document.createElement("canvas");
          this.overlayCanvas.width = this.W;
          this.overlayCanvas.height = this.H;
        }
        inC(x, y, k = 1) {
          const dx = x - this.circle.cx, dy = y - this.circle.cy, r = this.circle.r * k;
          return dx * dx + dy * dy <= r * r;
        }
        snapshot() {
          this.hist.push(this.labels.slice());
          if (this.hist.length > 25) this.hist.shift();
        }
        undo() {
          const h = this.hist.pop();
          if (h) this.labels.set(h);
          return !!h;
        }
        clear() {
          this.snapshot();
          this.labels.fill(0);
        }
        // varita mágica: rellena la zona de color parecido al punto tocado
        wand(x, y, label, tol = 18) {
          const { W, H: H2, lab, labels } = this;
          x = Math.round(x);
          y = Math.round(y);
          if (x < 0 || y < 0 || x >= W || y >= H2 || !this.inC(x, y)) return 0;
          this.snapshot();
          let L0 = 0, A0 = 0, B0 = 0, n = 0;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H2) continue;
            const i = (yy * W + xx) * 3;
            L0 += lab[i];
            A0 += lab[i + 1];
            B0 += lab[i + 2];
            n++;
          }
          L0 /= n;
          A0 /= n;
          B0 /= n;
          const cap = Math.PI * this.circle.r * this.circle.r * 0.5;
          const flood = (tl2) => {
            const seen = new Uint8Array(W * H2), q = new Int32Array(W * H2);
            let h = 0, t = 0;
            q[t++] = y * W + x;
            seen[y * W + x] = 1;
            const out2 = [];
            while (h < t) {
              const p = q[h++], px2 = p % W, py = p / W | 0;
              const i = p * 3, dL = 0.6 * (lab[i] - L0), dA = lab[i + 1] - A0, dB = lab[i + 2] - B0;
              if (Math.sqrt(dL * dL + dA * dA + dB * dB) > tl2) continue;
              out2.push(p);
              if (out2.length > cap * 1.2) return out2;
              if (px2 > 0 && !seen[p - 1] && this.inC(px2 - 1, py)) {
                seen[p - 1] = 1;
                q[t++] = p - 1;
              }
              if (px2 < W - 1 && !seen[p + 1] && this.inC(px2 + 1, py)) {
                seen[p + 1] = 1;
                q[t++] = p + 1;
              }
              if (py > 0 && !seen[p - W] && this.inC(px2, py - 1)) {
                seen[p - W] = 1;
                q[t++] = p - W;
              }
              if (py < H2 - 1 && !seen[p + W] && this.inC(px2, py + 1)) {
                seen[p + W] = 1;
                q[t++] = p + W;
              }
            }
            return out2;
          };
          let tl = tol, px = flood(tl);
          for (let k = 0; k < 5 && px.length > cap; k++) {
            tl *= 0.7;
            px = flood(tl);
          }
          if (px.length > cap) return 0;
          for (const p of px) labels[p] = label;
          this.lastTol = tl;
          return px.length;
        }
        // pincel (label 0 = borrador)
        brush(x, y, rad, label) {
          const { W, H: H2, labels } = this;
          const x0 = Math.max(0, Math.floor(x - rad)), x1 = Math.min(W - 1, Math.ceil(x + rad));
          const y0 = Math.max(0, Math.floor(y - rad)), y1 = Math.min(H2 - 1, Math.ceil(y + rad));
          for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
            if ((xx - x) ** 2 + (yy - y) ** 2 <= rad * rad && this.inC(xx, yy)) labels[yy * W + xx] = label;
          }
        }
        // cuenta de píxeles por etiqueta dentro del círculo del plato
        counts(nLabels) {
          const { W, H: H2, labels } = this;
          const c = new Uint32Array(nLabels + 1);
          let total = 0;
          for (let y = 0; y < H2; y++) for (let x = 0; x < W; x++) {
            if (!this.inC(x, y)) continue;
            total++;
            const l = labels[y * W + x];
            if (l <= nLabels) c[l]++;
          }
          return { c, total: total || 1 };
        }
        // sugerencia automática: separa por color lo que no es plato y lo reparte entre las partes
        suggest(groups) {
          const n = groups.length;
          if (!n) return false;
          const { W, H: H2, lab, circle } = this;
          const bins = /* @__PURE__ */ new Map();
          for (let y = 0; y < H2; y++) for (let x = 0; x < W; x++) {
            const d = Math.hypot(x - circle.cx, y - circle.cy);
            if (d > circle.r * 0.78 && d <= circle.r * 0.97) {
              const i = (y * W + x) * 3;
              const key = Math.round(lab[i] / 6) * 1e4 + Math.round(lab[i + 1] / 6) * 100 + Math.round(lab[i + 2] / 6);
              const b = bins.get(key) || [0, 0, 0, 0];
              b[0] += lab[i];
              b[1] += lab[i + 1];
              b[2] += lab[i + 2];
              b[3]++;
              bins.set(key, b);
            }
          }
          let top = null;
          for (const b of bins.values()) if (!top || b[3] > top[3]) top = b;
          if (!top) return false;
          const bg = [top[0] / top[3], top[1] / top[3], top[2] / top[3]];
          const idx = [];
          for (let y = 0; y < H2; y++) for (let x = 0; x < W; x++) {
            if (!this.inC(x, y, 0.96)) continue;
            const i = (y * W + x) * 3;
            const d = Math.hypot(lab[i] - bg[0], lab[i + 1] - bg[1], lab[i + 2] - bg[2]);
            if (d > 8) idx.push(y * W + x);
          }
          if (idx.length < 150) return false;
          let seed = 12345;
          const rnd = () => {
            seed = seed * 1664525 + 1013904223 >>> 0;
            return seed / 4294967296;
          };
          const step = Math.max(1, Math.floor(idx.length / 5e3)), S2 = [];
          for (let i = 0; i < idx.length; i += step) S2.push(idx[i]);
          const at = (p) => [lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2]];
          const dist = (a, b) => (a[0] - b[0]) ** 2 * 0.36 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
          const cents = [at(S2[Math.floor(rnd() * S2.length)])];
          while (cents.length < n) {
            const ds = S2.map((p) => Math.min(...cents.map((c) => dist(at(p), c))));
            const sum = ds.reduce((a, b) => a + b, 0) || 1;
            let r = rnd() * sum, k = 0;
            for (; k < ds.length - 1; k++) {
              r -= ds[k];
              if (r <= 0) break;
            }
            cents.push(at(S2[k]));
          }
          for (let it = 0; it < 10; it++) {
            const acc = cents.map(() => [0, 0, 0, 0]);
            for (const p of S2) {
              const v = at(p);
              let best = 0, bd = Infinity;
              cents.forEach((c, k) => {
                const d = dist(v, c);
                if (d < bd) {
                  bd = d;
                  best = k;
                }
              });
              const a = acc[best];
              a[0] += v[0];
              a[1] += v[1];
              a[2] += v[2];
              a[3]++;
            }
            acc.forEach((a, k) => {
              if (a[3]) cents[k] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
            });
          }
          const chroma = (c) => Math.hypot(c[1], c[2]);
          const score = (g, c) => {
            const ch = chroma(c);
            if (g === "veg") return -c[1] / 18 + c[2] / 90 + (c[0] < 70 ? 0.1 : 0);
            if (g === "prot") return 0.7 * (ch / 35) + 0.6 * ((72 - c[0]) / 40) + (c[1] > 4 ? 0.25 : 0) - (c[1] < -6 ? 0.8 : 0);
            return 0.9 * ((c[0] - 55) / 40) - 0.7 * (ch / 40) - (c[1] < -6 ? 0.8 : 0);
          };
          const perms = [];
          const permute = (arr, cur = []) => {
            if (!arr.length) {
              perms.push(cur);
              return;
            }
            arr.forEach((v, i) => permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...cur, v]));
          };
          permute([...Array(n).keys()]);
          let bestP = perms[0], bs = -Infinity;
          for (const p of perms) {
            const s = p.reduce((a, k, gi) => a + score(groups[gi], cents[k]), 0);
            if (s > bs) {
              bs = s;
              bestP = p;
            }
          }
          const clusterToLabel = {};
          bestP.forEach((k, gi) => {
            clusterToLabel[k] = gi + 1;
          });
          this.snapshot();
          this.labels.fill(0);
          for (const p of idx) {
            const v = at(p);
            let best = 0, bd = Infinity;
            cents.forEach((c, k) => {
              const d = dist(v, c);
              if (d < bd) {
                bd = d;
                best = k;
              }
            });
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
            if (l && rgb[l - 1]) {
              d[i * 4] = rgb[l - 1][0];
              d[i * 4 + 1] = rgb[l - 1][1];
              d[i * 4 + 2] = rgb[l - 1][2];
              d[i * 4 + 3] = 150;
            } else d[i * 4 + 3] = 0;
          }
          this.overlayCanvas.getContext("2d").putImageData(overlay, 0, 0);
        }
      };
    }
  });

  // js/foods.js
  var F = (id, n, k, p, c, f, cat, extra = {}) => ({ id, n, k, p, c, f, cat, g: false, l: false, def: 100, ...extra });
  var FOODS = [
    // ---- Proteínas (pesos en crudo) ----
    F("pollo_pechuga", "Pechuga de pollo", 165, 31, 0, 3.6, "prot", { def: 175, v: { cocido: [165, 31, 0, 3.6], crudo: [120, 22.5, 0, 2.6] }, y: 0.75, fem: true }),
    F("pollo_muslo", "Muslo de pollo sin piel", 180, 25, 0, 8, "prot", { def: 175, v: { cocido: [180, 25, 0, 8], crudo: [121, 19.7, 0, 4.1] }, y: 0.75 }),
    F("carne_magra", "Carne vacuna magra (cuadril/peceto)", 185, 30, 0, 6.5, "prot", { def: 175, v: { cocido: [185, 30, 0, 6.5], crudo: [135, 21.5, 0, 5] }, y: 0.72, fem: true }),
    F("carne_molida", "Carne molida magra", 215, 26, 0, 12, "prot", { def: 175, v: { cocido: [215, 26, 0, 12], crudo: [160, 20.5, 0, 8.5] }, y: 0.72, fem: true }),
    F("cerdo_lomo", "Lomo de cerdo", 145, 26, 0, 3.8, "prot", { def: 175, v: { cocido: [145, 26, 0, 3.8], crudo: [120, 21, 0, 3.5] }, y: 0.75 }),
    F("cerdo_bife", "Bife de cerdo magro", 195, 28, 0, 8, "prot", { def: 175, v: { cocido: [195, 28, 0, 8], crudo: [155, 20.5, 0, 8] }, y: 0.72 }),
    F("pescado_blanco", "Pescado blanco: surub\xED/tilapia/merluza", 128, 26, 0, 2.7, "prot", { def: 225, v: { cocido: [128, 26, 0, 2.7], crudo: [100, 20.5, 0, 1.8] }, y: 0.8 }),
    F("atun_lata", "At\xFAn al natural (escurrido)", 115, 26, 0, 1, "prot", { def: 120, u: { n: "lata", g: 120, step: 1 } }),
    F("huevo", "Huevo entero", 143, 12.6, 0.7, 9.5, "prot", { def: 100, u: { n: "huevo", g: 50, step: 1 } }),
    F("clara", "Clara de huevo", 52, 10.9, 0.7, 0.2, "prot", { def: 66, u: { n: "clara", g: 33, step: 1 } }),
    // ---- Hidratos ----
    F("arroz_blanco", "Arroz blanco", 130, 2.7, 28, 0.3, "carb", {
      v: { cocido: [130, 2.7, 28, 0.3], crudo: [360, 7, 79, 0.6] },
      y: 2.6
    }),
    F("arroz_integral", "Arroz integral", 123, 2.7, 25.6, 1, "carb", {
      v: { cocido: [123, 2.7, 25.6, 1], crudo: [355, 7.5, 76, 2.7] },
      y: 2.5
    }),
    F("fideo_sg", "Fideo sin gluten (arroz/ma\xEDz)", 150, 3, 33, 0.7, "carb", {
      v: { cocido: [150, 3, 33, 0.7], crudo: [357, 7, 78, 1.5] },
      y: 2.3
    }),
    F("fideo_trigo", "Fideo de trigo", 158, 5.8, 31, 0.9, "carb", {
      g: true,
      v: { cocido: [158, 5.8, 31, 0.9], crudo: [360, 12.5, 74, 1.5] },
      y: 2.3
    }),
    F("papa", "Papa", 87, 1.9, 20, 0.1, "carb", { def: 150, v: { cocido: [87, 1.9, 20, 0.1], crudo: [77, 2, 17, 0.1] }, fem: true }),
    F("batata", "Batata", 90, 2, 20.7, 0.2, "carb", { def: 100, v: { cocido: [90, 2, 20.7, 0.2], crudo: [86, 1.6, 20, 0.1] }, fem: true }),
    F("mandioca", "Mandioca (cocida)", 160, 1.4, 38, 0.3, "carb", { def: 100 }),
    F("tapioca", "Tapioca (f\xE9cula seca)", 358, 0.2, 88, 0, "carb", { def: 50 }),
    F("pan_hamb_sg", "Pan de hamburguesa sin gluten", 280, 4, 50, 6, "carb", { def: 65, u: { n: "pan", g: 65, step: 1 } }),
    F("pan_sg", "Pan tostado sin gluten (rebanada)", 250, 3, 48, 4, "carb", { def: 30, u: { n: "rebanada", g: 30, step: 1 } }),
    F("pan_arabe_sg", "Pan \xE1rabe sin gluten", 260, 3.5, 50, 4, "carb", { def: 40, u: { n: "mitad", g: 40, step: 1 } }),
    F("avena_sg", "Avena sin gluten", 380, 13, 67, 7, "carb", { def: 35 }),
    F("galletita_arroz", "Galletitas de arroz", 385, 8, 81, 3, "carb", { def: 18, u: { n: "galletita", g: 9, step: 1 } }),
    F("pororo", "Poror\xF3 (pochoclo sin az\xFAcar)", 387, 12.9, 77.8, 4.5, "carb", { def: 55 }),
    F("mermelada", "Mermelada diet", 100, 0.3, 25, 0.1, "carb", { def: 15, u: { n: "cucharada", g: 15, step: 1 } }),
    // ---- Lácteos (deslactosados) y suplementos ----
    F("queso_feta", "Queso en fetas deslactosado", 320, 22, 2, 25, "lacteo", { def: 20, u: { n: "feta", g: 20, step: 1 } }),
    F("yogurt_prot", "Yogurt proteico (pote)", 65, 9, 5, 1, "lacteo", { def: 170, u: { n: "pote", g: 170, step: 1 } }),
    F("leche_desl", "Leche deslactosada", 60, 3.1, 4.7, 3.3, "lacteo", { def: 200 }),
    F("whey", "Whey protein (deslactosado/vegano)", 400, 80, 8, 6, "supl", { def: 30, u: { n: "scoop", g: 30, step: 0.5 } }),
    F("barrita", "Barrita proteica", 380, 36, 36, 12, "supl", { def: 50, u: { n: "barrita", g: 50, step: 1 } }),
    // ---- Grasas y extras ----
    F("aceite_oliva", "Aceite de oliva", 884, 0, 0, 100, "grasa", { def: 13, u: { n: "cucharada", g: 13, step: 1 } }),
    F("coco", "Coco rallado sin az\xFAcar", 660, 7, 24, 65, "grasa", { def: 5, u: { n: "cucharita", g: 5, step: 1 } }),
    F("chia", "Semillas de ch\xEDa", 486, 17, 42, 31, "grasa", { def: 5, u: { n: "cucharadita", g: 5, step: 1 } }),
    F("chipitas", "Chipitas de chocolate", 480, 4, 62, 26, "snack", { def: 10, u: { n: "chipita", g: 2, step: 1 } }),
    F("soja", "Salsa de soja", 53, 8, 5, 0, "extra", { def: 15, u: { n: "cucharada", g: 15, step: 1 } }),
    F("mostaza", "Mostaza", 66, 4, 6, 4, "extra", { def: 10, u: { n: "cucharada", g: 10, step: 1 } }),
    F("salsa_tomate", "Salsa/pur\xE9 de tomate natural", 32, 1.5, 6.5, 0.2, "extra", { def: 100 }),
    // ---- Verduras ----
    F("ensalada", "Ensalada cl\xE1sica (lechuga, tomate, zanahoria)", 22, 1, 4.5, 0.2, "veg", { def: 150 }),
    F("verd_salteadas", "Verduras salteadas (mix)", 35, 1.8, 6.5, 0.4, "veg", { def: 150 }),
    F("caldo_verd", "Caldo de verduras", 8, 0.3, 1.5, 0.1, "veg", { def: 250 }),
    F("cebolla", "Cebolla", 40, 1.1, 9.3, 0.1, "veg", { def: 50 }),
    F("morron", "Morr\xF3n", 26, 1, 6, 0.3, "veg", { def: 50 }),
    F("tomate", "Tomate", 18, 0.9, 3.9, 0.2, "veg", { def: 100 }),
    F("zanahoria", "Zanahoria", 41, 0.9, 9.6, 0.2, "veg", { def: 60 }),
    F("zapallito", "Zapallito / zucchini", 17, 1.2, 3.1, 0.3, "veg", { def: 100 }),
    F("brocoli", "Br\xF3coli", 34, 2.8, 7, 0.4, "veg", { def: 100 }),
    F("espinaca", "Espinaca", 23, 2.9, 3.6, 0.4, "veg", { def: 80 }),
    F("verdeo", "Cebolla de hoja", 32, 1.8, 7.3, 0.2, "veg", { def: 20 }),
    // ---- Libres / cero calorías ----
    F("infusion", "Caf\xE9 / t\xE9 / cocido con edulcorante", 2, 0.1, 0, 0, "libre", { def: 100, u: { n: "taza", g: 100, step: 1 }, only: "unit" }),
    F("gaseosa_zero", "Gaseosa Zero (lata 350 ml)", 0, 0, 0, 0, "libre", { def: 100, u: { n: "lata", g: 100, step: 1 }, only: "unit" }),
    F("gelatina_diet", "Gelatina diet (porci\xF3n)", 5, 1, 0, 0, "libre", { def: 100, u: { n: "porci\xF3n", g: 100, step: 1 }, only: "unit" })
  ];
  var FOOD_MAP = Object.fromEntries(FOODS.map((f) => [f.id, f]));
  function perGram(food, carbState2 = "cocido") {
    let k = food.k, p = food.p, c = food.c, f = food.f;
    if (food.v) [k, p, c, f] = food.v[carbState2] || food.v.cocido;
    return { k: k / 100, p: p / 100, c: c / 100, f: f / 100 };
  }
  function foodLabel(food, carbState2 = "cocido") {
    if (!food.v) return food.n;
    const word = carbState2 === "cocido" ? food.fem ? "cocida" : "cocido" : food.fem ? "cruda" : "crudo";
    return `${food.n} (${word})`;
  }

  // js/recipes.js
  var slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  var LUNCH = ["almuerzo", "cena"];
  var out = [];
  var push = (r) => {
    r.id = r.id || slug(r.name);
    r.src = r.src || "base";
    r.steps = r.steps || [];
    r.min = r.min || 20;
    if (out.some((x) => x.id === r.id)) r.id += "_" + out.length;
    out.push(r);
  };
  var PROT = {
    pollo: { food: "pollo_pechuga", g: 175, grp: "pollo" },
    muslo: { food: "pollo_muslo", g: 175, grp: "pollo" },
    carne: { food: "carne_magra", g: 175, grp: "carne" },
    cerdo: { food: "cerdo_lomo", g: 175, grp: "cerdo" },
    pescado: { food: "pescado_blanco", g: 225, grp: "pescado" }
  };
  var METHODS = {
    pollo: {
      plancha: { t: "Pollo a la plancha", min: 15, add: [], steps: [
        "Cort\xE1 la pechuga en filetes de 1 cm y condiment\xE1 con sal, pimienta, or\xE9gano y ajo.",
        "Cocin\xE1 en sart\xE9n antiadherente con spray a fuego medio-alto, 4 min por lado, hasta que quede dorado y sin rosado."
      ] },
      horno: { t: "Pollo al horno", min: 35, add: [], steps: [
        "Precalent\xE1 el horno a 200 \xB0C. Condiment\xE1 la pechuga con sal, piment\xF3n, or\xE9gano y ajo.",
        "Ponela en una bandeja con spray y horne\xE1 25\u201330 min, d\xE1ndola vuelta a la mitad."
      ] },
      salteado: { t: "Pollo salteado con soja", min: 20, add: [["soja", 15], ["cebolla", 40], ["morron", 40]], steps: [
        "Cort\xE1 el pollo en tiras y salpiment\xE1. Cort\xE1 la cebolla y el morr\xF3n en tiras.",
        "Salte\xE1 el pollo en sart\xE9n o wok bien caliente con spray 4\u20135 min. Sum\xE1 las verduras y salte\xE1 3 min m\xE1s.",
        "Termin\xE1 con la salsa de soja."
      ] }
    },
    muslo: {
      horno: { t: "Muslo de pollo al horno", min: 45, add: [], steps: [
        "Precalent\xE1 el horno a 200 \xB0C. Sacale la piel a los muslos y condiment\xE1 con sal, piment\xF3n, ajo y or\xE9gano.",
        "Horne\xE1 en bandeja con spray 35\u201340 min, d\xE1ndolos vuelta a la mitad, hasta que el jugo salga claro."
      ] }
    },
    carne: {
      plancha: { t: "Bife a la plancha", min: 15, add: [], steps: [
        "Sac\xE1 el bife de la heladera 15 min antes y salpimentalo.",
        "Sart\xE9n bien caliente con spray: 3 min por lado para punto medio (m\xE1s si lo quer\xE9s m\xE1s cocido). Dejalo reposar 2 min."
      ] },
      horno: { t: "Carne al horno", min: 35, add: [["cebolla", 50]], steps: [
        "Precalent\xE1 el horno a 200 \xB0C. Salpiment\xE1 la carne y ponela en una fuente con la cebolla en rodajas y un chorrito de agua.",
        "Horne\xE1 tapada con aluminio 20 min y destapada 5\u201310 min m\xE1s. Dej\xE1 reposar 5 min y cort\xE1 en fetas."
      ] },
      salteado: { t: "Carne salteada con cebolla y morr\xF3n", min: 20, add: [["cebolla", 50], ["morron", 50]], steps: [
        "Cort\xE1 la carne en tiras finas, la cebolla y el morr\xF3n en tiras. Salpiment\xE1 la carne.",
        "Salte\xE1 la carne en sart\xE9n bien caliente con spray 3\u20134 min, sin amontonar. Sum\xE1 las verduras y salte\xE1 3 min m\xE1s."
      ] }
    },
    cerdo: {
      plancha: { t: "Bife de cerdo a la plancha", min: 15, add: [], steps: [
        "Salpiment\xE1 el bife de cerdo y condimentalo con ajo y or\xE9gano.",
        "Cocin\xE1 en sart\xE9n con spray 4 min por lado: tiene que quedar bien cocido pero jugoso."
      ] },
      horno: { t: "Lomo de cerdo al horno", min: 35, add: [], steps: [
        "Precalent\xE1 el horno a 200 \xB0C. Cort\xE1 el lomo en medallones, salpiment\xE1 y condiment\xE1 con ajo y or\xE9gano.",
        "Horne\xE1 en bandeja con spray 20\u201325 min, d\xE1ndolos vuelta a la mitad."
      ] },
      salteado: { t: "Cerdo salteado con soja", min: 20, add: [["soja", 15], ["cebolla", 40], ["morron", 40]], steps: [
        "Cort\xE1 el cerdo en tiras finas y las verduras en tiras.",
        "Salte\xE1 el cerdo en sart\xE9n bien caliente con spray 4\u20135 min. Sum\xE1 las verduras y salte\xE1 3 min.",
        "Termin\xE1 con la salsa de soja."
      ] }
    },
    pescado: {
      plancha: { t: "Pescado a la plancha", min: 12, add: [], steps: [
        "Sec\xE1 el pescado con papel y condiment\xE1 con sal, pimienta y lim\xF3n.",
        "Cocin\xE1 en sart\xE9n antiadherente con spray 3\u20134 min por lado, hasta que se desmenuce f\xE1cil."
      ] },
      horno: { t: "Pescado al horno con lim\xF3n y tomate", min: 25, add: [["tomate", 60]], steps: [
        "Precalent\xE1 el horno a 200 \xB0C. Pon\xE9 el pescado en una fuente con spray, rodajas de tomate y lim\xF3n, sal y pimienta.",
        "Horne\xE1 12\u201315 min, hasta que se desmenuce con el tenedor."
      ] }
    }
  };
  var CARBS = {
    arroz: { t: "arroz", grp: "arroz", min: 20, ing: [["arroz_blanco", 100]], steps: [
      "Mientras tanto, cocin\xE1 el arroz (lavado) con una pizca de sal, tapado y a fuego bajo, hasta que absorba el agua (unos 15 min)."
    ] },
    arroz_int: { t: "arroz integral", grp: "arroz", min: 35, ing: [["arroz_integral", 100]], steps: [
      "Mientras tanto, cocin\xE1 el arroz integral con una pizca de sal, tapado y a fuego bajo, 30\u201335 min."
    ] },
    fideo: { t: "fideos", grp: "fideo", min: 15, ing: [["fideo_sg", 100], ["salsa_tomate", 80]], steps: [
      "Mientras tanto, herv\xED los fideos sin gluten en agua con sal seg\xFAn el paquete (8\u201310 min) y escurr\xED.",
      "Calent\xE1 la salsa de tomate con or\xE9gano y mezclala con los fideos."
    ] },
    papa_horno: { t: "papas al horno", grp: "papa", min: 40, ing: [["papa", 150]], steps: [
      "Mientras tanto, cort\xE1 las papas en gajos con c\xE1scara, condiment\xE1 con sal, piment\xF3n y or\xE9gano y horne\xE1 con spray a 200 \xB0C unos 30\u201335 min, d\xE1ndolas vuelta a la mitad."
    ] },
    pure_papa: { t: "pur\xE9 de papa", grp: "papa", min: 25, ing: [["papa", 150], ["leche_desl", 30]], steps: [
      "Mientras tanto, herv\xED las papas peladas 15\u201320 min, escurr\xED y pis\xE1 con la leche deslactosada tibia, sal y nuez moscada."
    ] },
    batata_horno: { t: "batata al horno", grp: "batata", min: 35, ing: [["batata", 100]], steps: [
      "Mientras tanto, cort\xE1 la batata en rodajas o cubos, condiment\xE1 con sal y piment\xF3n y horne\xE1 con spray a 200 \xB0C 25\u201330 min."
    ] },
    pure_batata: { t: "pur\xE9 de batata", grp: "batata", min: 25, ing: [["batata", 100]], steps: [
      "Mientras tanto, herv\xED la batata en trozos 15\u201320 min, escurr\xED y pis\xE1 con sal y una pizca de pimienta."
    ] }
  };
  var join = (t, c) => `${t} ${t.includes(" con ") ? "y" : "con"} ${c}`;
  for (const [pk, methods] of Object.entries(METHODS)) {
    const P = PROT[pk];
    for (const [mk, m] of Object.entries(methods)) {
      for (const [ck, c] of Object.entries(CARBS)) {
        push({
          name: join(m.t, c.t),
          meals: LUNCH,
          prot: P.grp,
          carb: c.grp,
          ing: [[P.food, P.g], ...m.add, ...c.ing, ["ensalada", 150]],
          steps: [...m.steps, ...c.steps, "Serv\xED con la ensalada (lechuga, tomate, zanahoria) y listo."],
          min: Math.max(m.min, c.min) + 5
        });
      }
    }
  }
  var MIL = [
    ["Milanesa de pollo al horno", "pollo_pechuga", 175, "pollo"],
    ["Milanesa de carne al horno", "carne_magra", 175, "carne"],
    ["Milanesa de cerdo al horno", "cerdo_bife", 175, "cerdo"],
    ["Milanesa de pescado al horno", "pescado_blanco", 225, "pescado"]
  ];
  for (const [name, food, g, grp] of MIL) {
    for (const ck of ["pure_papa", "pure_batata", "arroz", "papa_horno"]) {
      const c = CARBS[ck];
      push({
        name: join(name, c.t),
        meals: LUNCH,
        prot: grp,
        carb: c.grp,
        ing: [[food, g], ["huevo", 50], ["tapioca", 15], ...c.ing, ["ensalada", 120]],
        steps: [
          "Aplast\xE1 el filete hasta que quede finito y salpiment\xE1.",
          "Bat\xED el huevo con ajo y perejil. Pas\xE1 el filete por el huevo y despu\xE9s por la tapioca (o avena sin gluten molida).",
          "Horne\xE1 a 200 \xB0C sobre bandeja con spray 10 min, dalo vuelta y 10 min m\xE1s. (O en sart\xE9n con spray, 3 min por lado.)",
          ...c.steps,
          "Serv\xED con ensalada."
        ],
        min: 35
      });
    }
  }
  [
    ["Hamburguesa casera de pollo con pan sin gluten", "pollo_pechuga", "pollo"],
    ["Hamburguesa casera de carne con pan sin gluten", "carne_molida", "carne"],
    ["Hamburguesa casera de cerdo con pan sin gluten", "cerdo_lomo", "cerdo"]
  ].forEach(([name, food, grp]) => push({
    name,
    meals: LUNCH,
    prot: grp,
    carb: "pan",
    ing: [[food, 175], ["huevo", 25], ["cebolla", 20], ["pan_hamb_sg", 65], ["tomate", 50], ["ensalada", 100], ["mostaza", 5]],
    steps: [
      "Pic\xE1 bien la carne (o us\xE1 carne molida) y mezclala con la cebolla rallada, sal, pimienta y el huevo batido.",
      "Form\xE1 una hamburguesa y cocin\xE1 en sart\xE9n con spray 4\u20135 min por lado (el pollo y el cerdo, bien cocidos).",
      "Tost\xE1 el pan y arm\xE1 con tomate, lechuga y mostaza. Serv\xED con ensalada."
    ],
    min: 25
  }));
  [
    ["S\xE1ndwich de bife con pan sin gluten", "carne_magra", "carne"],
    ["S\xE1ndwich de pollo grillado con pan sin gluten", "pollo_pechuga", "pollo"],
    ["S\xE1ndwich de lomo de cerdo con pan sin gluten", "cerdo_lomo", "cerdo"]
  ].forEach(([name, food, grp]) => push({
    name,
    meals: LUNCH,
    prot: grp,
    carb: "pan",
    ing: [[food, 175], ["pan_hamb_sg", 65], ["tomate", 50], ["cebolla", 30], ["ensalada", 80], ["mostaza", 5]],
    steps: [
      "Cort\xE1 la carne en filetes finos, salpiment\xE1 y cocin\xE1 en sart\xE9n con spray 3\u20134 min por lado.",
      "Tost\xE1 el pan, untalo con mostaza y arm\xE1 con la carne, tomate, cebolla y lechuga."
    ],
    min: 20
  }));
  push({
    name: "S\xE1ndwich de huevo, tomate y lechuga",
    meals: LUNCH,
    prot: "huevo",
    carb: "pan",
    ing: [["huevo", 100], ["clara", 66], ["pan_hamb_sg", 65], ["tomate", 50], ["ensalada", 80]],
    steps: [
      "Hac\xE9 una tortilla fina con los huevos y las claras (sal y or\xE9gano) en sart\xE9n con spray.",
      "Tost\xE1 el pan y arm\xE1 con la tortilla, tomate y lechuga."
    ],
    min: 12
  });
  var TAP = [
    [
      "Tapioca rellena de pollo y tomate",
      "pollo",
      [["pollo_pechuga", 175], ["tomate", 60], ["cebolla", 20]],
      "Cocin\xE1 el pollo en cubitos con spray, sal y or\xE9gano; desmenuzalo con la cebolla picada y el tomate."
    ],
    [
      "Tapioca rellena de carne molida y cebolla",
      "carne",
      [["carne_molida", 175], ["cebolla", 40], ["tomate", 50]],
      "Salte\xE1 la carne molida con la cebolla y el tomate picados, sal, pimienta y comino hasta que se dore."
    ],
    [
      "Tapioca rellena de at\xFAn y tomate",
      "pescado",
      [["atun_lata", 180], ["tomate", 60], ["verdeo", 10]],
      "Mezcl\xE1 el at\xFAn escurrido con el tomate picado, la cebolla de hoja y un chorrito de lim\xF3n."
    ],
    [
      "Tapioca rellena de huevo revuelto",
      "huevo",
      [["huevo", 100], ["clara", 66], ["tomate", 60]],
      "Revolv\xE9 los huevos y las claras en sart\xE9n con spray y sal; sum\xE1 el tomate picado al final."
    ]
  ];
  for (const [name, grp, ing, fill] of TAP) {
    push({
      name,
      meals: LUNCH,
      prot: grp,
      carb: "tapioca",
      ing: [...ing, ["tapioca", 50], ["ensalada", 100]],
      steps: [
        fill,
        "Tamiz\xE1 los 50 g de tapioca sobre una sart\xE9n antiadherente caliente, sin aceite, formando un disco. Cuando se una (1\u20132 min), dalo vuelta 30 seg.",
        "Rellen\xE1 con el preparado, dobl\xE1 y serv\xED con ensalada."
      ],
      min: 20
    });
  }
  push({
    name: "Pizza de tapioca con pollo, tomate y queso",
    meals: LUNCH,
    prot: "pollo",
    carb: "tapioca",
    ing: [["tapioca", 50], ["salsa_tomate", 60], ["pollo_pechuga", 175], ["queso_feta", 20], ["ensalada", 100]],
    steps: [
      "Hac\xE9 un disco de tapioca en sart\xE9n antiadherente (tamiz\xE1 y cocin\xE1 2 min por lado).",
      "Cubr\xED con la salsa, el pollo cocido y desmenuzado y el queso deslactosado.",
      "Tap\xE1 la sart\xE9n 2 min a fuego bajo hasta que el queso se derrita. Serv\xED con ensalada."
    ],
    min: 25
  });
  [
    ["Fideos salteados con pollo y verduras", "pollo_pechuga", "pollo"],
    ["Fideos salteados con carne y verduras", "carne_magra", "carne"],
    ["Fideos salteados con cerdo y verduras", "cerdo_lomo", "cerdo"]
  ].forEach(([name, food, grp]) => push({
    name,
    meals: LUNCH,
    prot: grp,
    carb: "fideo",
    ing: [[food, 175], ["fideo_sg", 100], ["zanahoria", 50], ["morron", 50], ["cebolla", 40], ["brocoli", 60], ["soja", 15]],
    steps: [
      "Herv\xED los fideos sin gluten seg\xFAn el paquete, escurr\xED y reserv\xE1.",
      "Cort\xE1 la carne y las verduras en tiras finas. Salte\xE1 la carne en sart\xE9n bien caliente con spray 4 min.",
      "Sum\xE1 las verduras y salte\xE1 4 min. Agreg\xE1 los fideos y la salsa de soja, mezcl\xE1 1 min y serv\xED."
    ],
    min: 25
  }));
  [
    ["Pinchos de pollo con verduras y arroz", "pollo_pechuga", "pollo", "arroz"],
    ["Pinchos de carne con verduras y batata al horno", "carne_magra", "carne", "batata_horno"],
    ["Pinchos de cerdo con verduras y arroz", "cerdo_lomo", "cerdo", "arroz"],
    ["Pinchos de pollo con verduras y papas al horno", "pollo_pechuga", "pollo", "papa_horno"]
  ].forEach(([name, food, grp, ck]) => {
    const c = CARBS[ck];
    push({
      name,
      meals: LUNCH,
      prot: grp,
      carb: c.grp,
      ing: [[food, 175], ["morron", 60], ["cebolla", 60], ["zapallito", 60], ...c.ing],
      steps: [
        "Cort\xE1 la carne y las verduras en cubos del mismo tama\xF1o y alternalos en palitos. Salpiment\xE1.",
        "Cocin\xE1 en sart\xE9n o parrilla con spray 10\u201312 min, d\xE1ndolos vuelta, hasta que est\xE9n dorados y bien cocidos.",
        ...c.steps
      ],
      min: 30
    });
  });
  [["Pollo", "pollo_pechuga", "pollo", 25], ["Lomo de cerdo", "cerdo_lomo", "cerdo", 22]].forEach(([n, food, grp, mins]) => {
    for (const ck of ["papa_horno", "batata_horno"]) {
      const c = CARBS[ck];
      push({
        name: `${n} a la mostaza con ${c.t}`,
        meals: LUNCH,
        prot: grp,
        carb: c.grp,
        ing: [[food, 175], ["mostaza", 10], ...c.ing, ["ensalada", 120]],
        steps: [
          "Mezcl\xE1 la mostaza con ajo, or\xE9gano y una cucharada de agua y unt\xE1 la carne.",
          `Horne\xE1 a 200 \xB0C en bandeja con spray unos ${mins} min, d\xE1ndola vuelta a la mitad.`,
          ...c.steps,
          "Serv\xED con ensalada."
        ],
        min: 40
      });
    }
  });
  var H = (name, o) => push({ name, meals: LUNCH, ...o });
  H("Arroz con pollo (en una olla)", {
    prot: "pollo",
    carb: "arroz",
    min: 35,
    ing: [["pollo_pechuga", 175], ["arroz_blanco", 100], ["cebolla", 50], ["morron", 50], ["tomate", 60], ["caldo_verd", 150]],
    steps: [
      "Cort\xE1 el pollo en cubos y salpiment\xE1 con or\xE9gano y piment\xF3n.",
      "En una olla con spray, doralo 4 min. Sum\xE1 cebolla, morr\xF3n y tomate picados y rehog\xE1 3 min.",
      "Agreg\xE1 el arroz crudo (la cantidad que equivale a tu porci\xF3n), mezcl\xE1 1 min y cubr\xED con caldo caliente (doble de volumen que el arroz).",
      "Tap\xE1 y cocin\xE1 a fuego bajo 15 min. Dej\xE1 reposar 5 min."
    ]
  });
  H("Pollo al curry con arroz", {
    prot: "pollo",
    carb: "arroz",
    min: 30,
    ing: [["pollo_pechuga", 175], ["arroz_blanco", 100], ["cebolla", 50], ["caldo_verd", 100], ["leche_desl", 50]],
    steps: [
      "Cocin\xE1 el arroz con una pizca de sal.",
      "Dor\xE1 el pollo en cubos con spray; sum\xE1 la cebolla picada y 1 cucharadita de curry.",
      "Agreg\xE1 el caldo y la leche deslactosada y cocin\xE1 8 min a fuego bajo hasta que espese.",
      "Serv\xED sobre el arroz."
    ]
  });
  H("Fideos con pollo y salsa de tomate", {
    prot: "pollo",
    carb: "fideo",
    min: 25,
    ing: [["pollo_pechuga", 175], ["fideo_sg", 100], ["salsa_tomate", 150], ["cebolla", 40]],
    steps: [
      "Herv\xED los fideos sin gluten y escurr\xED.",
      "Cocin\xE1 el pollo en cubitos con spray y la cebolla picada. Sum\xE1 la salsa de tomate y or\xE9gano; 8 min a fuego bajo.",
      "Mezcl\xE1 con los fideos."
    ]
  });
  H("Sopa de pollo, papa y zanahoria", {
    prot: "pollo",
    carb: "papa",
    min: 35,
    ing: [["pollo_pechuga", 175], ["papa", 150], ["zanahoria", 60], ["cebolla", 40], ["caldo_verd", 400]],
    steps: [
      "Pon\xE9 el caldo a hervir con la cebolla, la zanahoria y la papa en cubos.",
      "A los 10 min agreg\xE1 el pollo en cubos. Cocin\xE1 12 min m\xE1s.",
      "Condiment\xE1 con sal, pimienta y perejil."
    ]
  });
  H("Pechuga rellena de espinaca y queso con batata al horno", {
    prot: "pollo",
    carb: "batata",
    min: 45,
    ing: [["pollo_pechuga", 175], ["espinaca", 60], ["queso_feta", 20], ["batata", 100], ["ensalada", 100]],
    steps: [
      "Abr\xED la pechuga como un libro y salpiment\xE1. Rellen\xE1 con espinaca salteada y el queso deslactosado; cerr\xE1 con palillos.",
      "Horne\xE1 a 200 \xB0C con spray 25 min.",
      "Cocin\xE1 la batata en cubos al horno junto con el pollo 25\u201330 min.",
      "Serv\xED con ensalada."
    ]
  });
  H("Arroz salteado con pollo y huevo", {
    prot: "pollo",
    carb: "arroz",
    min: 25,
    ing: [["pollo_pechuga", 150], ["huevo", 50], ["arroz_blanco", 100], ["zanahoria", 40], ["cebolla", 30], ["verdeo", 15], ["soja", 15]],
    steps: [
      "Salte\xE1 el pollo en cubitos con spray 5 min. Reserv\xE1.",
      "En la misma sart\xE9n, salte\xE1 las verduras picadas 3 min y volc\xE1 el huevo batido; revolv\xE9 hasta que cuaje.",
      "Sum\xE1 el arroz cocido fr\xEDo y el pollo, la salsa de soja y mezcl\xE1 2 min."
    ]
  });
  H("Fideos con salsa bolo\xF1esa simple", {
    prot: "carne",
    carb: "fideo",
    min: 25,
    ing: [["carne_molida", 175], ["fideo_sg", 100], ["salsa_tomate", 120], ["cebolla", 40], ["zanahoria", 30]],
    steps: [
      "Herv\xED los fideos sin gluten y escurr\xED.",
      "Dor\xE1 la carne molida con la cebolla y la zanahoria rallada. Salpiment\xE1.",
      "Agreg\xE1 la salsa de tomate y or\xE9gano; cocin\xE1 10 min. Mezcl\xE1 con los fideos."
    ]
  });
  H("Arroz con carne molida y morr\xF3n", {
    prot: "carne",
    carb: "arroz",
    min: 30,
    ing: [["carne_molida", 175], ["arroz_blanco", 100], ["morron", 60], ["cebolla", 40], ["tomate", 60], ["caldo_verd", 150]],
    steps: [
      "Dor\xE1 la carne molida con la cebolla en una olla con spray; sum\xE1 el morr\xF3n y el tomate picados.",
      "Agreg\xE1 el arroz crudo (cantidad equivalente a tu porci\xF3n) y el caldo caliente.",
      "Tap\xE1 y cocin\xE1 a fuego bajo 15 min."
    ]
  });
  H("Pastel de papa con carne molida", {
    prot: "carne",
    carb: "papa",
    min: 50,
    ing: [["carne_molida", 175], ["papa", 150], ["leche_desl", 30], ["cebolla", 50], ["tomate", 50], ["ensalada", 100]],
    steps: [
      "Herv\xED las papas y hac\xE9 un pur\xE9 con la leche deslactosada, sal y nuez moscada.",
      "Rehog\xE1 la cebolla con spray, sum\xE1 la carne molida y el tomate picado; cocin\xE1 8 min y condiment\xE1 con comino y piment\xF3n.",
      "Arm\xE1 en una fuente: carne abajo, pur\xE9 arriba. Gratin\xE1 en horno fuerte 15 min. Serv\xED con ensalada."
    ]
  });
  H("Pastel de batata con carne molida", {
    prot: "carne",
    carb: "batata",
    min: 50,
    ing: [["carne_molida", 175], ["batata", 100], ["cebolla", 50], ["tomate", 50], ["ensalada", 100]],
    steps: [
      "Herv\xED la batata y pisala con sal y pimienta.",
      "Rehog\xE1 la cebolla con spray, sum\xE1 la carne molida y el tomate; cocin\xE1 8 min.",
      "Arm\xE1 en una fuente con el pur\xE9 arriba y gratin\xE1 15 min a 200 \xB0C. Serv\xED con ensalada."
    ]
  });
  H("Estofado de carne con papa y zanahoria", {
    prot: "carne",
    carb: "papa",
    min: 60,
    ing: [["carne_magra", 175], ["papa", 150], ["zanahoria", 80], ["cebolla", 50], ["salsa_tomate", 80], ["caldo_verd", 200]],
    steps: [
      "Cort\xE1 la carne en cubos y sellala en una olla con spray.",
      "Sum\xE1 la cebolla picada, la salsa de tomate y el caldo. Tap\xE1 y cocin\xE1 a fuego bajo 30 min.",
      "Agreg\xE1 la papa y la zanahoria en cubos y cocin\xE1 20 min m\xE1s, hasta que la carne est\xE9 tierna."
    ]
  });
  H("Guiso de arroz con carne", {
    prot: "carne",
    carb: "arroz",
    min: 40,
    ing: [["carne_magra", 175], ["arroz_blanco", 100], ["cebolla", 50], ["morron", 50], ["tomate", 60], ["caldo_verd", 200]],
    steps: [
      "Sell\xE1 la carne en cubos con spray en una olla. Sum\xE1 cebolla, morr\xF3n y tomate picados.",
      "Agreg\xE1 el caldo y cocin\xE1 tapado 20 min.",
      "Sum\xE1 el arroz crudo (equivalente a tu porci\xF3n) y cocin\xE1 15 min m\xE1s."
    ]
  });
  H("So'o josopy (sopa paraguaya de carne molida) con fideos", {
    prot: "carne",
    carb: "fideo",
    min: 30,
    ing: [["carne_molida", 175], ["fideo_sg", 100], ["cebolla", 50], ["morron", 40], ["tomate", 80], ["caldo_verd", 300]],
    steps: [
      "Rehog\xE1 la cebolla, el morr\xF3n y el tomate picados con spray. Sum\xE1 la carne molida y dorala.",
      "Agreg\xE1 el caldo caliente y llev\xE1 a hervor.",
      "Sum\xE1 los fideos sin gluten y cocin\xE1 8\u201310 min. Condiment\xE1 con or\xE9gano y perejil."
    ]
  });
  H("So'o josopy con arroz", {
    prot: "carne",
    carb: "arroz",
    min: 35,
    ing: [["carne_molida", 175], ["arroz_blanco", 100], ["cebolla", 50], ["morron", 40], ["tomate", 80], ["caldo_verd", 300]],
    steps: [
      "Rehog\xE1 la cebolla, el morr\xF3n y el tomate picados con spray. Sum\xE1 la carne molida y dorala.",
      "Agreg\xE1 el caldo caliente y el arroz crudo (equivalente a tu porci\xF3n).",
      "Cocin\xE1 15 min a fuego medio hasta que el arroz est\xE9 listo."
    ]
  });
  H("Alb\xF3ndigas con fideos y salsa de tomate", {
    prot: "carne",
    carb: "fideo",
    min: 35,
    ing: [["carne_molida", 175], ["huevo", 25], ["cebolla", 20], ["fideo_sg", 100], ["salsa_tomate", 120]],
    steps: [
      "Mezcl\xE1 la carne con el huevo, la cebolla rallada, sal, pimienta y perejil. Form\xE1 alb\xF3ndigas.",
      "Doralas en sart\xE9n con spray 5 min y sum\xE1 la salsa de tomate; cocin\xE1 tapadas 10 min.",
      "Servilas sobre los fideos sin gluten."
    ]
  });
  H("Alb\xF3ndigas con pur\xE9 de papa", {
    prot: "carne",
    carb: "papa",
    min: 35,
    ing: [["carne_molida", 175], ["huevo", 25], ["cebolla", 20], ["papa", 150], ["leche_desl", 30], ["salsa_tomate", 60]],
    steps: [
      "Mezcl\xE1 la carne con el huevo, la cebolla rallada, sal y pimienta. Form\xE1 alb\xF3ndigas.",
      "Doralas con spray y termin\xE1 con la salsa de tomate 8 min.",
      "Hac\xE9 el pur\xE9 con las papas hervidas y la leche. Serv\xED junto."
    ]
  });
  H("Bife koygua con arroz", {
    prot: "carne",
    carb: "arroz",
    min: 25,
    ing: [["carne_magra", 175], ["cebolla", 80], ["tomate", 80], ["morron", 40], ["huevo", 50], ["arroz_blanco", 100]],
    steps: [
      "Cocin\xE1 el arroz con una pizca de sal.",
      "Hac\xE9 el bife a la plancha con spray y reserv\xE1. En la misma sart\xE9n rehog\xE1 la cebolla, el tomate y el morr\xF3n en rodajas.",
      "Pon\xE9 el bife sobre el arroz, cubr\xED con las verduras y coronalo con un huevo a la plancha."
    ]
  });
  H("Bife con papas r\xFAsticas y cebolla", {
    prot: "carne",
    carb: "papa",
    min: 40,
    ing: [["carne_magra", 175], ["papa", 150], ["cebolla", 60], ["ensalada", 100]],
    steps: [
      "Cort\xE1 las papas en gajos, condiment\xE1 y horne\xE1 con spray 30 min a 200 \xB0C.",
      "Hac\xE9 el bife a la plancha. Rehog\xE1 la cebolla en rodajas hasta que se dore.",
      "Serv\xED con ensalada."
    ]
  });
  H("Fideos con cerdo y salsa de tomate", {
    prot: "cerdo",
    carb: "fideo",
    min: 25,
    ing: [["cerdo_lomo", 175], ["fideo_sg", 100], ["salsa_tomate", 120], ["morron", 40]],
    steps: ["Herv\xED los fideos sin gluten y escurr\xED.", "Salte\xE1 el cerdo en tiritas con spray y el morr\xF3n; sum\xE1 la salsa 6 min.", "Mezcl\xE1 con los fideos."]
  });
  H("Arroz con cerdo y morr\xF3n", {
    prot: "cerdo",
    carb: "arroz",
    min: 35,
    ing: [["cerdo_lomo", 175], ["arroz_blanco", 100], ["morron", 60], ["cebolla", 40], ["caldo_verd", 120], ["soja", 10]],
    steps: [
      "Salte\xE1 el cerdo en cubos con spray; sum\xE1 cebolla y morr\xF3n picados.",
      "Agreg\xE1 el arroz crudo (equivalente a tu porci\xF3n), la soja y el caldo caliente.",
      "Tap\xE1 y cocin\xE1 15 min a fuego bajo."
    ]
  });
  H("Guiso de cerdo con papa", {
    prot: "cerdo",
    carb: "papa",
    min: 45,
    ing: [["cerdo_lomo", 175], ["papa", 150], ["zanahoria", 60], ["cebolla", 50], ["tomate", 60], ["caldo_verd", 250]],
    steps: [
      "Sell\xE1 el cerdo en cubos con spray. Sum\xE1 cebolla y tomate picados.",
      "Agreg\xE1 el caldo y cocin\xE1 tapado 15 min. Sum\xE1 la papa y la zanahoria en cubos y cocin\xE1 20 min m\xE1s."
    ]
  });
  H("Cerdo con batata y cebolla en bandeja", {
    prot: "cerdo",
    carb: "batata",
    min: 40,
    ing: [["cerdo_lomo", 175], ["batata", 100], ["cebolla", 60], ["ensalada", 100]],
    steps: [
      "Precalent\xE1 el horno a 200 \xB0C. Pon\xE9 en una bandeja con spray el cerdo en medallones, la batata en cubos y la cebolla en gajos.",
      "Condiment\xE1 con sal, piment\xF3n y or\xE9gano. Horne\xE1 30 min, mezclando a la mitad. Serv\xED con ensalada."
    ]
  });
  H("Surub\xED al horno con papa, cebolla y tomate", {
    prot: "pescado",
    carb: "papa",
    min: 40,
    ing: [["pescado_blanco", 225], ["papa", 150], ["cebolla", 50], ["tomate", 80]],
    steps: [
      "Cort\xE1 la papa en rodajas finas y la cebolla y el tomate en rodajas. Arm\xE1 una cama con la papa en una fuente con spray.",
      "Pon\xE9 el pescado arriba con la cebolla y el tomate, sal, pimienta y lim\xF3n.",
      "Tap\xE1 con aluminio y horne\xE1 a 200 \xB0C 25\u201330 min."
    ]
  });
  H("Arroz con at\xFAn y verduras", {
    prot: "pescado",
    carb: "arroz",
    min: 25,
    ing: [["atun_lata", 180], ["arroz_blanco", 100], ["zapallito", 80], ["zanahoria", 40], ["cebolla", 30]],
    steps: [
      "Cocin\xE1 el arroz con una pizca de sal.",
      "Salte\xE1 la cebolla, el zapallito y la zanahoria en cubitos con spray 6 min.",
      "Mezcl\xE1 con el arroz y el at\xFAn escurrido. Termin\xE1 con lim\xF3n."
    ]
  });
  H("Fideos con at\xFAn y salsa de tomate", {
    prot: "pescado",
    carb: "fideo",
    min: 20,
    ing: [["atun_lata", 180], ["fideo_sg", 100], ["salsa_tomate", 120], ["cebolla", 20]],
    steps: ["Herv\xED los fideos sin gluten y escurr\xED.", "Calent\xE1 la salsa con la cebolla picada 5 min; sum\xE1 el at\xFAn escurrido.", "Mezcl\xE1 con los fideos."]
  });
  H("Ensalada tibia de papa, at\xFAn y huevo", {
    prot: "pescado",
    carb: "papa",
    min: 25,
    ing: [["papa", 150], ["atun_lata", 150], ["huevo", 50], ["tomate", 60], ["cebolla", 20], ["verdeo", 10]],
    steps: [
      "Herv\xED la papa en cubos 12\u201315 min y el huevo 10 min.",
      "Mezcl\xE1 todo con el tomate, la cebolla y la cebolla de hoja.",
      "Condiment\xE1 con sal, pimienta, lim\xF3n y or\xE9gano."
    ]
  });
  H("Tortilla de at\xFAn y papa", {
    prot: "pescado",
    carb: "papa",
    min: 25,
    ing: [["atun_lata", 120], ["huevo", 100], ["clara", 33], ["papa", 150], ["cebolla", 30]],
    steps: [
      "Herv\xED la papa en cubitos y rehog\xE1 la cebolla con spray.",
      "Bat\xED los huevos y las claras; mezcl\xE1 con la papa, la cebolla y el at\xFAn.",
      "Cocin\xE1 en sart\xE9n con spray tapada, 4 min por lado."
    ]
  });
  H("Pescado en papillote con batata y zapallito", {
    prot: "pescado",
    carb: "batata",
    min: 40,
    ing: [["pescado_blanco", 225], ["batata", 100], ["zapallito", 80], ["tomate", 60]],
    steps: [
      "Cort\xE1 la batata en rodajas finas y el zapallito y el tomate en rodajas.",
      "Arm\xE1 un paquete de aluminio con las verduras abajo y el pescado arriba, con sal, pimienta y lim\xF3n.",
      "Cerr\xE1 y horne\xE1 a 200 \xB0C 25 min."
    ]
  });
  H("Arroz caldoso de pescado", {
    prot: "pescado",
    carb: "arroz",
    min: 35,
    ing: [["pescado_blanco", 225], ["arroz_blanco", 100], ["tomate", 80], ["cebolla", 40], ["morron", 40], ["caldo_verd", 250]],
    steps: [
      "Rehog\xE1 cebolla, morr\xF3n y tomate picados con spray.",
      "Agreg\xE1 el caldo y el arroz crudo (equivalente a tu porci\xF3n); cocin\xE1 12 min.",
      "Sum\xE1 el pescado en cubos y cocin\xE1 6 min m\xE1s, sin revolver mucho."
    ]
  });
  H("Caldo de pescado con papa", {
    prot: "pescado",
    carb: "papa",
    min: 35,
    ing: [["pescado_blanco", 225], ["papa", 150], ["tomate", 60], ["cebolla", 40], ["morron", 30], ["caldo_verd", 300]],
    steps: [
      "Hac\xE9 hervir el caldo con la cebolla, el morr\xF3n y el tomate picados y la papa en cubos 12 min.",
      "Agreg\xE1 el pescado en trozos y cocin\xE1 6\u20138 min. Condiment\xE1 con or\xE9gano y perejil."
    ]
  });
  H("Tortilla de papa y cebolla", {
    prot: "huevo",
    carb: "papa",
    min: 30,
    ing: [["huevo", 100], ["clara", 66], ["papa", 150], ["cebolla", 50], ["ensalada", 100]],
    steps: [
      "Cort\xE1 la papa en rodajas finas y la cebolla en tiras; cocinalas en sart\xE9n con spray tapadas 12 min.",
      "Bat\xED los huevos y las claras con sal y mezcl\xE1 con la papa.",
      "Cocin\xE1 4 min por lado en la sart\xE9n con spray. Serv\xED con ensalada."
    ]
  });
  H("Tortilla de batata y espinaca", {
    prot: "huevo",
    carb: "batata",
    min: 25,
    ing: [["huevo", 100], ["clara", 66], ["batata", 100], ["espinaca", 80]],
    steps: ["Herv\xED la batata en cubitos 10 min.", "Mezclala con la espinaca picada y los huevos y claras batidos, con sal y pimienta.", "Cocin\xE1 en sart\xE9n con spray tapada, 4 min por lado."]
  });
  H("Revuelto de huevo con papa y morr\xF3n", {
    prot: "huevo",
    carb: "papa",
    min: 25,
    ing: [["huevo", 100], ["clara", 66], ["papa", 150], ["morron", 50], ["cebolla", 30]],
    steps: ["Herv\xED la papa en cubitos 10 min.", "Salte\xE1 el morr\xF3n y la cebolla con spray; sum\xE1 la papa y doralas.", "Volc\xE1 los huevos y claras batidos y revolv\xE9 hasta que cuajen."]
  });
  H("Arroz frito con huevo", {
    prot: "huevo",
    carb: "arroz",
    min: 20,
    ing: [["arroz_blanco", 100], ["huevo", 100], ["clara", 66], ["zanahoria", 40], ["verdeo", 20], ["soja", 15], ["cebolla", 30]],
    steps: ["Salte\xE1 la cebolla y la zanahoria en cubitos con spray 3 min.", "Volc\xE1 los huevos y claras batidos y revolv\xE9.", "Sum\xE1 el arroz cocido fr\xEDo, la salsa de soja y la cebolla de hoja; salte\xE1 3 min."]
  });
  H("Fideos salteados con huevo y zapallito", {
    prot: "huevo",
    carb: "fideo",
    min: 20,
    ing: [["fideo_sg", 100], ["huevo", 100], ["clara", 66], ["zapallito", 100], ["cebolla", 30], ["soja", 10]],
    steps: ["Herv\xED los fideos sin gluten y escurr\xED.", "Salte\xE1 el zapallito y la cebolla con spray 4 min.", "Agreg\xE1 los fideos, la soja y los huevos batidos; revolv\xE9 hasta que cuajen."]
  });
  H("Omelette de verduras con batata al horno", {
    prot: "huevo",
    carb: "batata",
    min: 35,
    ing: [["huevo", 100], ["clara", 66], ["espinaca", 40], ["tomate", 50], ["cebolla", 30], ["batata", 100]],
    steps: ["Horne\xE1 la batata en cubos con spray y piment\xF3n 25 min a 200 \xB0C.", "Hac\xE9 el omelette: bat\xED huevos y claras, volc\xE1 en sart\xE9n con spray y rellen\xE1 con la espinaca, el tomate y la cebolla.", "Dobl\xE1 y serv\xED con la batata."]
  });
  H("Huevos en salsa de tomate con arroz", {
    prot: "huevo",
    carb: "arroz",
    min: 25,
    ing: [["huevo", 100], ["clara", 66], ["salsa_tomate", 150], ["cebolla", 40], ["morron", 40], ["arroz_blanco", 100]],
    steps: [
      "Cocin\xE1 el arroz con una pizca de sal.",
      "Rehog\xE1 la cebolla y el morr\xF3n con spray y agreg\xE1 la salsa de tomate.",
      "Hac\xE9 huecos y volc\xE1 los huevos y las claras; tap\xE1 y cocin\xE1 5 min. Serv\xED con el arroz."
    ]
  });
  H("Crepioca salada con tomate y queso", {
    prot: "huevo",
    carb: "tapioca",
    min: 12,
    ing: [["tapioca", 50], ["huevo", 100], ["clara", 66], ["queso_feta", 20], ["tomate", 60]],
    steps: ["Mezcl\xE1 la tapioca con los huevos y las claras y una pizca de sal.", "Volc\xE1 en sart\xE9n antiadherente y cocin\xE1 tapada 2 min por lado.", "Rellen\xE1 con el queso y el tomate en rodajas y dobl\xE1."]
  });
  var PL = (name, meals, ing, steps, extra = {}) => push({ name, meals, ing, steps, plan: true, src: "plan", min: 8, ...extra });
  PL(
    "Galletitas de arroz con huevos revueltos",
    ["desayuno"],
    [["galletita_arroz", 18], ["huevo", 100], ["clara", 33]],
    ["Revolv\xE9 los huevos y la clara en sart\xE9n con spray.", "Serv\xED con las 2 galletitas de arroz y tu infusi\xF3n con edulcorante."],
    { prot: "huevo", carb: "pan" }
  );
  PL(
    "Tostada con mermelada y huevos revueltos",
    ["desayuno"],
    [["pan_sg", 30], ["mermelada", 15], ["huevo", 100], ["clara", 33]],
    ["Tost\xE1 la rebanada de pan sin gluten y untala con mermelada.", "Revolv\xE9 los huevos y la clara en sart\xE9n con spray."],
    { prot: "huevo", carb: "pan" }
  );
  PL(
    "Pan \xE1rabe sin gluten con huevos revueltos",
    ["desayuno"],
    [["pan_arabe_sg", 40], ["huevo", 100], ["clara", 33]],
    ["Calent\xE1 \xBD pan \xE1rabe sin gluten.", "Revolv\xE9 los huevos y la clara con spray y rellen\xE1 el pan."],
    { prot: "huevo", carb: "pan" }
  );
  PL(
    "Crepioca de desayuno",
    ["desayuno"],
    [["huevo", 100], ["clara", 33], ["queso_feta", 20], ["tapioca", 35]],
    ["Mezcl\xE1 los huevos, la clara y la tapioca con una pizca de sal.", "Volc\xE1 en sart\xE9n antiadherente y cocin\xE1 2 min por lado.", "Rellen\xE1 con la feta de queso deslactosado y dobl\xE1."],
    { prot: "huevo", carb: "tapioca" }
  );
  PL(
    "Panqueque de avena y coco (desayuno)",
    ["desayuno"],
    [["huevo", 100], ["coco", 5], ["avena_sg", 35]],
    ["Bat\xED los huevos con la avena sin gluten, el coco rallado y edulcorante.", "Cocin\xE1 en sart\xE9n con spray 2 min por lado (o al horno a 180 \xB0C 12 min)."],
    { prot: "huevo", carb: "pan" }
  );
  PL(
    "Yogurt proteico con avena",
    ["desayuno"],
    [["yogurt_prot", 170], ["avena_sg", 35]],
    ["Mezcl\xE1 el yogurt proteico con la avena sin gluten."],
    { carb: "pan" }
  );
  PL(
    "Batido de prote\xEDna con avena",
    ["merienda"],
    [["whey", 30], ["avena_sg", 50]],
    ["Bat\xED 1 scoop de whey (deslactosado, carn\xEDvora o vegana) con agua.", "Acompa\xF1\xE1 con los 50 g de avena sin gluten."],
    { carb: "pan" }
  );
  PL(
    "Batido de prote\xEDna con chipitas",
    ["merienda"],
    [["whey", 30], ["chipitas", 10]],
    ["Bat\xED 1 scoop de whey con agua y servilo con 5 chipitas."]
  );
  PL(
    "Batido de prote\xEDna con poror\xF3",
    ["merienda"],
    [["whey", 30], ["pororo", 55]],
    ["Bat\xED 1 scoop de whey con agua y com\xE9 el poror\xF3 (55 g) al lado."]
  );
  PL(
    "Crepioca de merienda",
    ["merienda"],
    [["huevo", 100], ["clara", 66], ["tapioca", 50]],
    ["Mezcl\xE1 los huevos, las claras y la tapioca con una pizca de sal.", "Cocin\xE1 en sart\xE9n antiadherente 2 min por lado."],
    { prot: "huevo", carb: "tapioca" }
  );
  PL(
    "Yogurt proteico con ch\xEDa y avena",
    ["merienda"],
    [["yogurt_prot", 170], ["chia", 5], ["avena_sg", 35]],
    ["Mezcl\xE1 el yogurt con la ch\xEDa y la avena sin gluten."],
    { carb: "pan" }
  );
  PL(
    "Tostada con huevos revueltos y queso",
    ["merienda"],
    [["pan_sg", 30], ["mermelada", 15], ["huevo", 100], ["queso_feta", 20]],
    ["Tost\xE1 el pan sin gluten con mermelada.", "Revolv\xE9 los 2 huevos con spray y arm\xE1 con la feta de queso."],
    { prot: "huevo", carb: "pan" }
  );
  PL(
    "Crepioca con queso (merienda)",
    ["merienda"],
    [["huevo", 100], ["queso_feta", 20], ["tapioca", 35]],
    ["Mezcl\xE1 los huevos con la tapioca y sal.", "Cocin\xE1 2 min por lado y rellen\xE1 con la feta de queso deslactosado."],
    { prot: "huevo", carb: "tapioca" }
  );
  PL(
    "Panqueque de avena y coco (merienda)",
    ["merienda"],
    [["huevo", 100], ["clara", 66], ["coco", 5], ["avena_sg", 35]],
    ["Bat\xED los huevos y las claras con la avena sin gluten, el coco y edulcorante.", "Cocin\xE1 en sart\xE9n con spray 2 min por lado."],
    { prot: "huevo", carb: "pan" }
  );
  PL("2 huevos cocidos", ["media_manana", "media_tarde"], [["huevo", 100]], ["Herv\xED 2 huevos 10 min, enfri\xE1 y pel\xE1."], { prot: "huevo", min: 12 });
  PL("Whey protein (\xBD scoop)", ["media_manana", "media_tarde"], [["whey", 15]], ["Mezcl\xE1 \xBD scoop en 200 ml de agua (o leche deslactosada)."], { min: 2 });
  PL("Yogurt proteico", ["media_manana", "media_tarde"], [["yogurt_prot", 170]], ["Directo del pote."], { min: 1 });
  PL("Barrita proteica", ["media_manana", "media_tarde"], [["barrita", 50]], ["Lista para comer."], { min: 1 });
  var BASE_RECIPES = out;
  var RECIPE_MAP = Object.fromEntries(out.map((r) => [r.id, r]));
  var PROT_GROUPS = [
    ["pollo", "Pollo"],
    ["carne", "Carne"],
    ["cerdo", "Cerdo"],
    ["pescado", "Pescado"],
    ["huevo", "Huevo"]
  ];
  var CARB_GROUPS = [
    ["arroz", "Arroz"],
    ["fideo", "Fideo"],
    ["papa", "Papa"],
    ["batata", "Batata"],
    ["tapioca", "Tapioca"],
    ["pan", "Pan"]
  ];
  function recipeMacros(recipe, foodMap2, carbState2 = "cocido", mult = 1) {
    let k = 0, p = 0, c = 0, f = 0, g = 0, l = 0;
    for (const [fid, grams] of recipe.ing) {
      const food = foodMap2[fid];
      if (!food) continue;
      const pg = perGram(food, carbState2);
      k += pg.k * grams;
      p += pg.p * grams;
      c += pg.c * grams;
      f += pg.f * grams;
      if (food.g) g = 1;
      if (food.l) l = 1;
    }
    return { k: k * mult, p: p * mult, c: c * mult, f: f * mult, gluten: !!g, lact: !!l };
  }

  // js/store.js
  var KEY = "plato.v1";
  var MEALS = [
    { id: "desayuno", n: "Desayuno", main: true },
    { id: "media_manana", n: "Media ma\xF1ana", main: false },
    { id: "almuerzo", n: "Almuerzo", main: true },
    { id: "media_tarde", n: "Media tarde", main: false },
    { id: "merienda", n: "Merienda", main: true },
    { id: "cena", n: "Cena", main: true }
  ];
  var MAINS = MEALS.filter((m) => m.main).map((m) => m.id);
  var mealName = (id) => (MEALS.find((m) => m.id === id) || {}).n || id;
  var SUPPS = [
    { id: "multi", when: "Desayuno", n: "1 multivitam\xEDnico" },
    { id: "d3k2", when: "Desayuno", n: "Vitamina D3 + K2 (5000 UI)" },
    { id: "creatina", when: "Desayuno", n: "Creatina monohidratada 5 g" },
    { id: "cromo", when: "Almuerzo", n: "Picolinato de cromo (si hay ansiedad)", opt: true },
    { id: "magnesio", when: "Antes de dormir", n: "Glicinato de magnesio 400\u2013500 mg" },
    { id: "omega", when: "Antes de dormir", n: "Omega 3 \xB7 2 comprimidos (840 mg)" },
    { id: "vitc", when: "Antes de dormir", n: "Vitamina C 1 g" }
  ];
  var defaults = () => ({
    v: 1,
    settings: {
      name: "Mauricio",
      age: 24,
      height: 175,
      targets: { k: null, p: null, c: null, f: null, kManual: false },
      carbState: "cocido",
      avoidGluten: true,
      avoidLact: true,
      waterGoal: 3e3,
      onboarded: false
    },
    log: {},
    water: {},
    supps: {},
    weights: [{ d: "2026-10-15", kg: 75.3 }],
    allowed: {},
    customFoods: [],
    customRecipes: [],
    favRecipes: [],
    recents: [],
    showOpt: {},
    plateDraft: null
  });
  function merge(a, b) {
    for (const k in b) {
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) a[k] = merge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return merge(defaults(), JSON.parse(raw));
    } catch (e) {
    }
    return defaults();
  }
  var S = load();
  var timer;
  function save() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(S));
      } catch (e) {
      }
    }, 120);
  }
  function replaceState(obj) {
    S = merge(defaults(), obj);
    dropFoodCache();
    save();
  }
  function resetState() {
    S = defaults();
    dropFoodCache();
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
    }
  }
  var uid = () => Math.random().toString(36).slice(2, 9);
  var iso = (d) => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4);
    return z.toISOString().slice(0, 10);
  };
  var todayISO = () => iso(/* @__PURE__ */ new Date());
  var parseISO = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  var addDays = (s, n) => {
    const d = parseISO(s);
    d.setDate(d.getDate() + n);
    return iso(d);
  };
  var weekStart = (s) => {
    const d = parseISO(s);
    const wd = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - wd);
    return iso(d);
  };
  var DOW = ["dom", "lun", "mar", "mi\xE9", "jue", "vie", "s\xE1b"];
  var MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var dowName = (s) => DOW[parseISO(s).getDay()];
  var prettyDate = (s) => {
    const d = parseISO(s);
    return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  };
  var shortDate = (s) => {
    const d = parseISO(s);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  var allFoods = () => [...FOODS, ...S.customFoods.map((f) => ({ ...f, custom: true }))];
  var fmCache = null;
  var fmKey = "";
  var foodMap = () => {
    const key = S.customFoods.map((f) => f.id).join(",");
    if (fmCache && fmKey === key) return fmCache;
    fmKey = key;
    fmCache = Object.fromEntries(allFoods().map((f) => [f.id, f]));
    return fmCache;
  };
  var dropFoodCache = () => {
    fmCache = null;
  };
  var allRecipes = () => [...BASE_RECIPES, ...S.customRecipes.map((r) => ({ ...r, src: "mine" }))];
  var getRecipe = (id) => allRecipes().find((r) => r.id === id);
  var carbState = () => S.settings.carbState;
  function macrosOf(recipe, mult = 1) {
    return recipeMacros(recipe, foodMap(), carbState(), mult);
  }
  function foodPer(food) {
    return perGram(food, carbState());
  }
  function dietOK(flags) {
    if (S.settings.avoidGluten && flags.gluten) return false;
    if (S.settings.avoidLact && flags.lact) return false;
    return true;
  }
  var foodOK = (f) => dietOK({ gluten: f.g, lact: f.l });
  function targets() {
    const t = S.settings.targets;
    const set = [t.p, t.c, t.f].every((v) => v > 0) || t.k > 0;
    if (!set) return { k: 2e3, p: 150, c: 200, f: 65, isSet: false };
    const p = t.p || 0, c = t.c || 0, f = t.f || 0;
    const k = t.kManual && t.k ? t.k : Math.round(p * 4 + c * 4 + f * 9) || t.k || 0;
    return { k, p, c, f, isSet: true };
  }
  var entries = (date) => S.log[date] || [];
  var mealEntries = (date, meal) => entries(date).filter((e) => e.m === meal);
  var eTot = (e) => ({ k: e.per.k * e.qty, p: e.per.p * e.qty, c: e.per.c * e.qty, f: e.per.f * e.qty });
  function sumEntries(list) {
    const t = { k: 0, p: 0, c: 0, f: 0 };
    for (const e of list) {
      const x = eTot(e);
      t.k += x.k;
      t.p += x.p;
      t.c += x.c;
      t.f += x.f;
    }
    return t;
  }
  var dayTotals = (date) => sumEntries(entries(date));
  function addEntry(date, e) {
    e.id = e.id || uid();
    (S.log[date] = S.log[date] || []).push(e);
    save();
    return e;
  }
  function removeEntry(date, id) {
    S.log[date] = entries(date).filter((e) => e.id !== id);
    if (!S.log[date].length) delete S.log[date];
    save();
  }
  function findEntry(date, id) {
    return entries(date).find((e) => e.id === id);
  }
  function pushRecent(type, id) {
    S.recents = [{ type, id }, ...S.recents.filter((r) => !(r.type === type && r.id === id))].slice(0, 14);
    save();
  }
  var waterOf = (d) => S.water[d] || 0;
  function addWater(d, ml) {
    S.water[d] = Math.max(0, waterOf(d) + ml);
    save();
  }
  var suppsOf = (d) => S.supps[d] || {};
  function toggleSupp(d, id) {
    (S.supps[d] = S.supps[d] || {})[id] = !suppsOf(d)[id];
    save();
  }
  var allowedOf = (d) => S.allowed[weekStart(d)] || { used: false };
  function setAllowed(d, used, note = "") {
    S.allowed[weekStart(d)] = { used, note, on: d };
    save();
  }
  function addWeight(d, kg) {
    S.weights = S.weights.filter((w) => w.d !== d);
    S.weights.push({ d, kg });
    S.weights.sort((a, b) => a.d.localeCompare(b.d));
    save();
  }
  function slotByHour(date) {
    const h = (/* @__PURE__ */ new Date()).getHours() + (/* @__PURE__ */ new Date()).getMinutes() / 60;
    if (date !== todayISO()) return MAINS.find((m) => !mealEntries(date, m).length) || "almuerzo";
    const base = h < 10.5 ? "desayuno" : h < 14.5 ? "almuerzo" : h < 18.5 ? "merienda" : "cena";
    if (!mealEntries(date, base).length) return base;
    const i = MAINS.indexOf(base);
    const rest = [...MAINS.slice(i + 1), ...MAINS.slice(0, i)].find((m) => !mealEntries(date, m).length);
    return rest || base;
  }
  function mealsLeft(date, slot) {
    const un = MAINS.filter((m) => !mealEntries(date, m).length);
    if (!un.includes(slot)) un.push(slot);
    return Math.max(1, un.length);
  }
  function remaining(date) {
    const t = targets(), d = dayTotals(date);
    return { k: t.k - d.k, p: t.p - d.p, c: t.c - d.c, f: t.f - d.f };
  }
  function shareForMeal(date, slot) {
    const r = remaining(date), n = mealsLeft(date, slot);
    return { k: Math.max(r.k / n, 0), p: Math.max(r.p / n, 0), c: Math.max(r.c / n, 0), f: Math.max(r.f / n, 0) };
  }
  var MULTS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  function fitRecipe(recipe, share, remK) {
    let best = null;
    for (const mult of MULTS) {
      const m = macrosOf(recipe, mult);
      let score = 1.4 * Math.abs(m.p - share.p) / Math.max(share.p, 12) + 1 * Math.abs(m.c - share.c) / Math.max(share.c, 18) + 0.6 * Math.abs(m.f - share.f) / Math.max(share.f, 6);
      if (m.k > remK * 1.08 + 30) score += 2;
      if (!best || score < best.score) best = { recipe, mult, m, score };
    }
    return best;
  }
  function suggestions(date, slot, limit = 3, pool = null) {
    const share = shareForMeal(date, slot), remK = remaining(date).k;
    let list = (pool || allRecipes()).filter((r) => r.meals.includes(slot));
    list = list.map((r) => ({ r, m0: macrosOf(r) })).filter((x) => dietOK(x.m0)).map((x) => fitRecipe(x.r, share, remK));
    list.sort((a, b) => a.score - b.score);
    if (limit === Infinity) return list;
    const out2 = [], seen = /* @__PURE__ */ new Set();
    for (const x of list) {
      const key = (x.recipe.prot || "x") + "|" + (x.recipe.carb || "x");
      if (!seen.has(key) && !out2.some((o) => o.recipe.prot === x.recipe.prot && o.recipe.prot && out2.length < 2)) {
        seen.add(key);
        out2.push(x);
      }
      if (out2.length >= limit) break;
    }
    for (const x of list) {
      if (out2.length >= limit) break;
      if (!out2.includes(x)) out2.push(x);
    }
    return out2;
  }

  // js/ui.js
  var $ = (s, r = document) => r.querySelector(s);
  var $$ = (s, r = document) => [...r.querySelectorAll(s)];
  var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var n0 = (x) => Math.round(x);
  var n1 = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
  var clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  var COL = { k: "#6E1F2E", p: "#7A2233", c: "#D3AE7E", f: "#8F6B50", veg: "#8B9A69" };
  var MLABEL = { k: "Calor\xEDas", p: "Prote\xEDna", c: "Hidratos", f: "Grasas" };
  var MUNIT = { k: "kcal", p: "g", c: "g", f: "g" };
  function plateGroup(food) {
    if (["prot", "supl", "lacteo"].includes(food.cat)) return "prot";
    if (["carb", "snack"].includes(food.cat)) return "carb";
    if (["veg", "libre"].includes(food.cat)) return "veg";
    return "fat";
  }
  var GROUP_COL = { prot: "#7A2233", carb: "#D3AE7E", veg: "#8B9A69", fat: "#A8805F" };
  var GROUP_NAME = { prot: "Prote\xEDna", carb: "Hidrato", veg: "Verdura", fat: "Extras" };
  function shade(hex, i) {
    const f = [1, 0.82, 1.14, 0.7, 1.26][i % 5];
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => clamp(Math.round(v * f), 0, 255);
    const r = ch(n >> 16 & 255), g = ch(n >> 8 & 255), b = ch(n & 255);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  var ICON = {
    hoy: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3.5"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    recetas: '<svg viewBox="0 0 24 24"><path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/></svg>',
    plato: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/></svg>',
    progreso: '<svg viewBox="0 0 24 24"><path d="M4 4v16h16"/><path d="M8 15l3.5-4.5 3 2.5L19 7"/></svg>',
    ajustes: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
    camera: '<svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.3-2h6l1.3 2h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.4"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
  };
  var lastW = {};
  var lastN = {};
  function applyAnim(root = document) {
    $$("[data-bar]", root).forEach((el) => {
      const key = el.dataset.key || "";
      const to = parseFloat(el.dataset.bar);
      const from = key in lastW ? lastW[key] : 0;
      el.style.width = from + "%";
      void el.offsetWidth;
      requestAnimationFrame(() => {
        el.style.width = to + "%";
      });
      lastW[key] = to;
    });
    $$("[data-ring]", root).forEach((el) => {
      const key = el.dataset.key || "ring";
      const to = clamp(parseFloat(el.dataset.ring), 0, 100);
      const from = key in lastW ? lastW[key] : 0;
      const C = 2 * Math.PI * parseFloat(el.getAttribute("r"));
      el.style.strokeDasharray = C;
      el.style.strokeDashoffset = C * (1 - from / 100);
      void el.getBoundingClientRect();
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = C * (1 - to / 100);
      });
      lastW[key] = to;
    });
    $$("[data-num]", root).forEach((el) => {
      const key = el.dataset.key || el.dataset.num;
      const to = parseFloat(el.dataset.num);
      const from = key in lastN ? lastN[key] : 0;
      lastN[key] = to;
      countTo(el, from, to);
    });
    $$("[data-scale]", root).forEach((el) => {
      const key = el.dataset.key || "scale";
      const to = clamp(parseFloat(el.dataset.scale), 0, 1);
      const from = key in lastW ? lastW[key] : 0;
      el.style.transform = `scaleY(${from})`;
      void el.getBoundingClientRect();
      requestAnimationFrame(() => {
        el.style.transform = `scaleY(${to})`;
      });
      lastW[key] = to;
    });
    $$("input[type=range]", root).forEach(fillRange);
  }
  function countTo(el, from, to, ms = 550) {
    const token = el._cnt = (el._cnt || 0) + 1;
    if (from === to) {
      el.textContent = n0(to);
      return;
    }
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
  function fillRange(el) {
    const min = parseFloat(el.min || 0), max = parseFloat(el.max || 100), v = parseFloat(el.value);
    el.style.setProperty("--fill", (v - min) / (max - min || 1) * 100 + "%");
  }
  function impactHTML(withAfter = true) {
    const rows = ["k", "p", "c", "f"].map((m) => `
    <div class="irow" data-m="${m}">
      <div class="ihead"><span class="l"><i class="d" style="background:${COL[m]}"></i>${MLABEL[m]}</span><span class="v"></span></div>
      <div class="track tall"><i class="eaten"></i><i class="plate"></i><i class="mark" style="opacity:0"></i></div>
    </div>`).join("");
    return `<div class="impact">${rows}${withAfter ? '<div class="after"></div>' : ""}</div>`;
  }
  function setImpact(root, add, date, excludeId = null) {
    const t = targets();
    const d = { ...dayTotals(date) };
    if (excludeId) {
      const e = findEntry(date, excludeId);
      if (e) {
        const x = eTot(e);
        for (const m of ["k", "p", "c", "f"]) d[m] -= x[m];
      }
    }
    const rest = {};
    for (const m of ["k", "p", "c", "f"]) {
      const row = $(`.irow[data-m="${m}"]`, root);
      if (!row) continue;
      const eaten = d[m], a = add[m] || 0, total = eaten + a, tgt = t[m];
      const scale = Math.max(tgt, total, 1);
      const [iE, iP, iM] = $$(".track i", row);
      iE.style.left = "0%";
      iE.style.width = eaten / scale * 100 + "%";
      iP.style.left = eaten / scale * 100 + "%";
      iP.style.width = a / scale * 100 + "%";
      const over = total > tgt * 1.001;
      iM.style.left = tgt / scale * 100 + "%";
      iM.style.opacity = over ? "1" : "0";
      row.classList.toggle("over", over && m !== "p");
      $(".v", row).innerHTML = `<b>${n0(total)}</b> / ${n0(tgt)} ${MUNIT[m]}` + (a > 0.5 ? ` <span class="plus">+${n0(a)}</span>` : "");
      rest[m] = tgt - total;
    }
    const after = $(".after", root);
    if (after) {
      const f = (m, lab, u) => `<span class="${rest[m] < 0 ? "neg" : ""}">${lab} <b>${rest[m] < 0 ? "+" + n0(-rest[m]) + " de m\xE1s" : n0(rest[m])}${rest[m] < 0 ? "" : " " + u}</b></span>`;
      after.innerHTML = `<span style="width:100%">Despu\xE9s te quedan${targets().isSet ? "" : " <i>(objetivo de referencia)</i>"}:</span>${f("k", "Cal", "kcal")}${f("p", "P", "g")}${f("c", "C", "g")}${f("f", "G", "g")}`;
    }
    return rest;
  }
  function splitHTML(m) {
    const p = m.p * 4, c = m.c * 4, f = m.f * 9, tot = p + c + f || 1;
    return `<div class="split"><i style="width:${p / tot * 100}%;background:${COL.p}"></i><i style="width:${c / tot * 100}%;background:${COL.c}"></i><i style="width:${f / tot * 100}%;background:${COL.f}"></i></div>`;
  }
  function macsHTML(m) {
    return `<div class="macs"><span><i class="dot" style="background:${COL.p}"></i><b>${n0(m.p)}</b> P</span><span><i class="dot" style="background:${COL.c}"></i><b>${n0(m.c)}</b> C</span><span><i class="dot" style="background:${COL.f}"></i><b>${n0(m.f)}</b> G</span></div>`;
  }
  var toastT;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove("show"), 1900);
  }
  var onCloseCb = null;
  function openSheet({ title = "", body = "", foot = "", onMount, onClose, headRight = "" }) {
    const root = $("#sheet-root");
    closeSheet(true);
    onCloseCb = onClose || null;
    root.innerHTML = `<div class="scrim" data-act="sheet-close"></div>
    <div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>
      <div class="sh-head"><h2>${title}</h2>${headRight || '<button class="x" data-act="sheet-close" aria-label="Cerrar">\u2715</button>'}</div>
      <div class="sh-body">${body}</div>${foot ? `<div class="sh-foot">${foot}</div>` : ""}</div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("open")));
    const el = $(".sheet", root);
    applyAnim(el);
    if (onMount) onMount(el);
    return el;
  }
  function closeSheet(silent = false) {
    const root = $("#sheet-root");
    if (!root.firstChild) return;
    root.classList.remove("open");
    const cb = onCloseCb;
    onCloseCb = null;
    if (silent) {
      root.innerHTML = "";
      return;
    }
    setTimeout(() => {
      if (!root.classList.contains("open")) root.innerHTML = "";
    }, 320);
    if (cb) cb();
  }
  var sheetEl = () => $("#sheet-root .sheet");
  function setSheetBody(html, foot) {
    const el = sheetEl();
    if (!el) return;
    $(".sh-body", el).innerHTML = html;
    const f = $(".sh-foot", el);
    if (foot !== void 0) {
      if (f) f.innerHTML = foot;
      else el.insertAdjacentHTML("beforeend", `<div class="sh-foot">${foot}</div>`);
    }
    applyAnim(el);
  }
  function setSheetTitle(t) {
    const h = $(".sh-head h2", sheetEl());
    if (h) h.innerHTML = t;
  }

  // js/app.js
  var FM = () => foodMap();
  var fname = (f) => foodLabel(f, carbState());
  var shortName = (f) => f.n.split("(")[0].split(":")[0].replace(/ sin gluten| deslactosado/gi, "").trim();
  var norm2 = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  var PLURAL = { porci\u00F3n: "porciones", mitad: "mitades", pan: "panes", plato: "platos" };
  var pl = (n, name) => n > 1.001 ? PLURAL[name] || (name.endsWith("s") ? name : name + "s") : name;
  var UI = {
    tab: "hoy",
    date: todayISO(),
    pg: "prot",
    supOpen: false,
    rf: { q: "", prot: null, carb: null, meal: null, fav: false, mine: false, fit: false, limit: 50 }
  };
  var TPL = [
    { n: "Pollo + arroz", items: [["pollo_pechuga", 175], ["arroz_blanco", 100], ["ensalada", 150]] },
    { n: "Carne + papa", items: [["carne_magra", 175], ["papa", 150], ["ensalada", 150]] },
    { n: "Cerdo + batata", items: [["cerdo_lomo", 175], ["batata", 100], ["ensalada", 150]] },
    { n: "Pescado + papa", items: [["pescado_blanco", 225], ["papa", 150], ["ensalada", 150]] },
    { n: "Pollo + fideo", items: [["pollo_pechuga", 175], ["fideo_sg", 100], ["salsa_tomate", 80], ["ensalada", 100]] },
    { n: "Huevos + batata", items: [["huevo", 100], ["clara", 66], ["batata", 100], ["ensalada", 150]] },
    { n: "Carne + arroz", items: [["carne_magra", 175], ["arroz_blanco", 100], ["verd_salteadas", 150]] },
    { n: "Hamburguesa", items: [["carne_molida", 175], ["pan_hamb_sg", 65], ["tomate", 50], ["ensalada", 100]] }
  ];
  var PICK = {
    prot: ["pollo_pechuga", "pollo_muslo", "carne_magra", "carne_molida", "cerdo_lomo", "cerdo_bife", "pescado_blanco", "atun_lata", "huevo", "clara"],
    carb: ["arroz_blanco", "arroz_integral", "fideo_sg", "papa", "batata", "mandioca", "tapioca", "pan_hamb_sg", "avena_sg", "pororo", "galletita_arroz"],
    veg: ["ensalada", "verd_salteadas", "brocoli", "zapallito", "espinaca", "tomate", "cebolla", "morron", "zanahoria", "caldo_verd"],
    extra: ["aceite_oliva", "soja", "mostaza", "salsa_tomate", "queso_feta", "leche_desl", "yogurt_prot", "whey", "coco", "chia"]
  };
  var PICK_NAMES = { prot: "Prote\xEDna", carb: "Hidrato", veg: "Verdura", extra: "Extras", mine: "Mis alimentos" };
  var mkItem = (fid, g) => ({ u: uid(), fid, g: g ?? (FM()[fid] || { def: 100 }).def });
  var PLATE = S.plateDraft && Array.isArray(S.plateDraft.items) ? S.plateDraft : null;
  if (PLATE) {
    PLATE.items = PLATE.items.filter((i) => i && FM()[i.fid]);
    if (!PLATE.items.length) PLATE = null;
  }
  if (!PLATE) PLATE = { name: "", meal: slotByHour(todayISO()), items: TPL[0].items.map(([f, g]) => mkItem(f, g)), editing: null };
  var savePlate = () => {
    S.plateDraft = PLATE;
    save();
  };
  function itemMac(it) {
    const f = FM()[it.fid];
    if (!f) return { k: 0, p: 0, c: 0, f: 0 };
    const pg = foodPer(f);
    return { k: pg.k * it.g, p: pg.p * it.g, c: pg.c * it.g, f: pg.f * it.g };
  }
  function sumItems(items) {
    const t = { k: 0, p: 0, c: 0, f: 0 };
    for (const it of items) {
      const m = itemMac(it);
      t.k += m.k;
      t.p += m.p;
      t.c += m.c;
      t.f += m.f;
    }
    return t;
  }
  function rangeCfg(f) {
    const d = f.def, tiny = d <= 20;
    return {
      min: 0,
      step: tiny ? 1 : 5,
      max: tiny ? Math.max(40, d * 3) : clamp(Math.round(d * 3 / 25) * 25, 100, 450)
    };
  }
  function gHint(f, g) {
    if (f.v && f.y && carbState() === "cocido") {
      const raw = n0(g / f.y);
      if (f.id.startsWith("fideo")) return `\u2248 ${raw} g de fideo seco`;
      if (f.id.startsWith("arroz")) return `\u2248 ${raw} g de arroz crudo`;
      return `\u2248 ${raw} g en crudo`;
    }
    if (f.u && !f.only && f.u.g >= 25) {
      const n = Math.round(g / f.u.g * 2) / 2;
      return `\u2248 ${n1(n)} ${pl(n, f.u.n)}`;
    }
    return "";
  }
  function autoName(items) {
    const fs = items.map((i) => FM()[i.fid]).filter(Boolean);
    const order = ["prot", "carb", "veg", "fat"];
    fs.sort((a, b) => order.indexOf(plateGroup(a)) - order.indexOf(plateGroup(b)));
    const main = fs.filter((f) => ["prot", "carb"].includes(plateGroup(f))).slice(0, 3);
    return (main.length ? main : fs.slice(0, 2)).map(shortName).join(" + ") || "Plato";
  }
  function dotsFor(items) {
    return items.map(([fid]) => `<i style="background:${GROUP_COL[plateGroup(FM()[fid] || { cat: "extra" })]}"></i>`).join("");
  }
  function qtyText(e) {
    if (e.items && e.unit === "plato") return e.items.map((i) => shortName(FM()[i.fid] || { n: "?" })).slice(0, 4).join(" \xB7 ");
    if (e.unit === "g") return `${n0(e.qty)} g`;
    return `${n1(e.qty)} ${pl(e.qty, e.unit)}`;
  }
  function render() {
    const v = $("#view");
    v.innerHTML = { hoy: viewHoy, recetas: viewRecetas, plato: viewPlato, progreso: viewProgreso, ajustes: viewAjustes }[UI.tab]();
    renderTabs();
    applyAnim(v);
    if (UI.tab === "plato") {
      paintPlate(false);
      const c = $("#view .chips"), on = c && $(".chip.on", c);
      if (on) c.scrollLeft += on.getBoundingClientRect().left - c.getBoundingClientRect().left - (c.clientWidth - on.clientWidth) / 2;
    }
  }
  function renderTabs() {
    const T = [["hoy", "Hoy"], ["recetas", "Recetas"], ["plato", "Plato"], ["progreso", "Progreso"], ["ajustes", "Ajustes"]];
    $("#tabs").innerHTML = T.map(([id, l]) => id === "plato" ? `<button class="tab tab-plate ${UI.tab === id ? "on" : ""}" data-act="tab" data-tab="plato"><div class="bubble">${ICON.plato}</div><span>${l}</span></button>` : `<button class="tab ${UI.tab === id ? "on" : ""}" data-act="tab" data-tab="${id}">${ICON[id]}<span>${l}</span></button>`).join("");
  }
  function viewHoy() {
    const d = UI.date, today = todayISO(), isToday = d === today;
    const t = targets(), tot = dayTotals(d);
    const remK = t.k - tot.k;
    const pct = t.k ? tot.k / t.k * 100 : 0;
    const mb = (m, lab) => `
    <div class="mbar" style="--col:${COL[m]}">
      <div class="ihead"><span class="l"><i class="d" style="background:${COL[m]}"></i>${lab}</span><span class="v"><b>${n0(tot[m])}</b> / ${t[m]} g</span></div>
      <div class="track"><i class="eaten" data-bar="${clamp(tot[m] / (t[m] || 1) * 100, 0, 100)}" data-key="mb-${m}"></i></div>
    </div>`;
    const showOpt = (id) => S.showOpt[id] || mealEntries(d, id).length;
    const hiddenOpt = MEALS.filter((m) => !m.main && !showOpt(m.id));
    return `<div class="screen">
    <div class="head">
      <div><h1>${isToday ? "Hoy" : prettyDate(d)}</h1><div class="sub">${isToday ? prettyDate(d) : `<button class="link" data-act="date-today">Volver a hoy</button>`}</div></div>
      <div class="date-nav">
        <button class="icon-btn" data-act="date-prev" aria-label="D\xEDa anterior">${ICON.left}</button>
        <button class="icon-btn" data-act="date-next" aria-label="D\xEDa siguiente" ${isToday ? 'disabled style="opacity:.35"' : ""}>${ICON.right}</button>
      </div>
    </div>
    ${t.isSet ? "" : `<section class="card onb"><h3>Primer paso</h3><p>Carg\xE1 tus macros objetivo del d\xEDa (prote\xEDna, hidratos y grasas) y la app arma todo en base a eso.</p><button class="btn block" data-act="targets">Cargar mis macros</button></section>`}
    <section class="card">
      <div class="sum-top">
        <div class="ring"><svg viewBox="0 0 132 132"><circle class="bg" cx="66" cy="66" r="54"/><circle class="fg ${remK < 0 ? "over" : ""}" cx="66" cy="66" r="54" data-ring="${pct}" data-key="ring"/></svg>
          <div class="mid"><b data-num="${Math.abs(remK)}" data-key="remk">0</b><span>${remK >= 0 ? "kcal restantes" : "kcal de m\xE1s"}</span></div></div>
        <div class="mbars">${mb("p", "Prote\xEDna")}${mb("c", "Hidratos")}${mb("f", "Grasas")}</div>
      </div>
      <div class="sum-foot"><span>Consumido <b>${n0(tot.k)}</b> kcal</span><span>Objetivo <b>${t.k}</b>${t.isSet ? "" : " (ref.)"}</span></div>
    </section>
    ${sugHTML(d, t)}
    <div class="sec"><h2>Comidas</h2></div>
    ${MEALS.filter((m) => m.main || showOpt(m.id)).map((m) => mealCard(d, m)).join("")}
    ${hiddenOpt.length ? `<div class="opt-toggle">${hiddenOpt.map((m) => `<button data-act="opt-meal" data-meal="${m.id}">+ ${m.n}</button>`).join("&nbsp;&nbsp;")}</div>` : ""}
    <div class="sec"><h2>Agua</h2></div>${waterCard(d)}
    <div class="sec"><h2>Suplementos</h2></div>${suppCard(d)}
    <div class="sec"><h2>Permitido</h2></div>${allowedCard(d)}
  </div>`;
  }
  function sugHTML(d, t) {
    const rest = remaining(d);
    const slot = slotByHour(d);
    if (t.isSet && rest.k < 80) {
      return `<section class="card" style="text-align:center"><div class="serif" style="font-size:19px;font-weight:600">Objetivo del d\xEDa cumplido</div><div class="muted" style="margin-top:4px;font-size:13px">Si todav\xEDa te falta prote\xEDna, sum\xE1 algo liviano desde Colaciones.</div></section>`;
    }
    const list = suggestions(d, slot, 4);
    if (!list.length) return "";
    const sh = shareForMeal(d, slot);
    return `<div class="sec"><h2>Sugerido \xB7 ${mealName(slot)}</h2><button class="link" data-act="goto-fit">Ver m\xE1s</button></div>
    <div class="muted" style="font-size:13px;margin:-4px 2px 10px">Ideal para tu pr\xF3xima comida: ~${n0(sh.k)} kcal \xB7 ${n0(sh.p)} g de prote\xEDna</div>
    <div class="sug">${list.map((x) => `
      <div class="scard" data-act="open-recipe" data-id="${esc(x.recipe.id)}" data-mult="${x.mult}" data-meal="${slot}">
        <div class="nm">${esc(x.recipe.name)}</div>
        ${splitHTML(x.m)}
        <div class="meta"><span><b style="color:var(--ink)">${n0(x.m.k)}</b> kcal \xB7 <b style="color:var(--ink)">${n0(x.m.p)}</b> g prot</span><span>${x.mult !== 1 ? "\xD7" + n1(x.mult) : "1 porci\xF3n"}</span></div>
        <button class="btn sm soft go" data-act="sug-add" data-id="${esc(x.recipe.id)}" data-mult="${x.mult}" data-meal="${slot}">+ Agregar</button>
      </div>`).join("")}</div>`;
  }
  function mealCard(d, m) {
    const list = mealEntries(d, m.id), tot = sumEntries(list);
    return `<section class="card meal ${list.length ? "done" : ""}">
    <div class="meal-h"><span class="ck">${ICON.check}</span>
      <div class="t"><b>${m.n}</b><small>${list.length ? `${n0(tot.k)} kcal \xB7 ${n0(tot.p)} g prot` : m.main ? "Sin cargar" : "Opcional"}</small></div>
      <button class="add" data-act="add-meal" data-meal="${m.id}" aria-label="Agregar a ${m.n}">+</button></div>
    ${list.length ? `<div class="meal-rows">${list.map(rowHTML).join("")}</div>` : ""}
  </section>`;
  }
  function rowHTML(e) {
    const x = eTot(e), tt = x.p * 4 + x.c * 4 + x.f * 9 || 1;
    return `<button class="row" data-act="entry" data-id="${e.id}">
    <span class="mix"><i style="height:${x.p * 4 / tt * 100}%;background:${COL.p}"></i><i style="height:${x.c * 4 / tt * 100}%;background:${COL.c}"></i><i style="height:${x.f * 9 / tt * 100}%;background:${COL.f}"></i></span>
    <span class="n"><b>${esc(e.name)}</b><small>${esc(qtyText(e))}</small></span>
    <span class="k">${n0(x.k)} kcal<small>P ${n0(x.p)} \xB7 C ${n0(x.c)} \xB7 G ${n0(x.f)}</small></span></button>`;
  }
  function waterCard(d) {
    const goal = S.settings.waterGoal, w = waterOf(d), p = clamp(w / goal, 0, 1);
    const path = "M10 6 H64 L58.5 88 Q58 92 54 92 H20 Q16 92 15.5 88 Z";
    return `<section class="card water">
    <svg class="glass" viewBox="0 0 74 98"><defs><clipPath id="gl"><path d="${path}"/></clipPath></defs>
      <path d="${path}" fill="#FFFDF8" stroke="#D9C7AE" stroke-width="2"/>
      <g clip-path="url(#gl)"><rect class="lvl" x="0" y="0" width="74" height="98" fill="#A9BFC4" opacity=".85" style="transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(0);transition:transform .9s cubic-bezier(.2,.8,.2,1)" data-scale="${p * 0.93}" data-key="water"/></g>
      <path d="${path}" fill="none" stroke="#D9C7AE" stroke-width="2"/></svg>
    <div class="info"><div class="big">${(w / 1e3).toFixed(2).replace(".", ",").replace(/,?0+$/, "")}<small> / ${goal / 1e3} L</small></div>
      <div class="muted" style="font-size:12px">${w >= goal ? "Meta cumplida" : `Faltan ${n0(goal - w)} ml`} \xB7 repartidos en el d\xEDa</div>
      <div class="water btns" style="display:flex;gap:8px;margin-top:10px">
        <button class="btn sm soft" data-act="water" data-ml="-250" style="width:44px;padding:0;font-size:20px" aria-label="Quitar 250 ml">\u2212</button>
        <button class="btn sm" data-act="water" data-ml="250">+ 250 ml</button><button class="btn sm soft" data-act="water" data-ml="500">+ 500</button></div></div></section>`;
  }
  function suppCard(d) {
    const on = suppsOf(d), done = SUPPS.filter((s) => on[s.id]).length;
    const head = `<button class="toggle" data-act="supp-open" style="padding-top:0"><span><b>${done} de ${SUPPS.length} tomados</b><small>Desayuno \xB7 Almuerzo \xB7 Antes de dormir</small></span><span class="link">${UI.supOpen ? "Cerrar" : "Abrir"}</span></button>
    <div class="track" style="margin:2px 0 4px"><i style="background:var(--bordo)" data-bar="${done / SUPPS.length * 100}" data-key="supp"></i></div>`;
    const list = UI.supOpen ? `<div style="margin-top:8px">${SUPPS.map((s) => `<button class="supp ${on[s.id] ? "on" : ""}" data-act="supp" data-id="${s.id}"><span class="cb">${ICON.check}</span><span class="t"><small>${s.when}</small>${s.n}</span></button>`).join("")}</div>` : "";
    return `<section class="card">${head}${list}</section>`;
  }
  function allowedCard(d) {
    const a = allowedOf(d), used = a.used;
    return `<section class="card allowed ${used ? "used" : ""}"><span class="badge" style="width:52px;height:52px">${ICON.plato.replace("<svg", '<svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7"')}</span>
    <div class="t"><b>${used ? "Permitido usado" : "Permitido disponible"}</b><div class="muted" style="font-size:13px">${used ? `Lo usaste el ${prettyDate(a.on || d)}. Se renueva el lunes.` : "1 por semana \xB7 sin culpa, sin cuentas."}</div></div>
    <button class="btn sm ${used ? "ghost" : ""}" data-act="allowed">${used ? "Deshacer" : "Usar"}</button></section>`;
  }
  function viewPlato() {
    const P = PLATE, items = P.items;
    const geo = plateGeom();
    const segs = [...items].filter((it) => FM()[it.fid]).map((it) => {
      const s = geo.out[it.u];
      return `<circle class="seg" data-act="seg" data-uid="${it.u}" cx="110" cy="110" r="64" stroke="${s.col}" style="stroke-dasharray:${s.len} ${geo.C - s.len};stroke-dashoffset:${s.off}"/>`;
    }).join("");
    const rows = items.map(ingRow).join("");
    const groups = Object.keys(PICK).concat(S.customFoods.length ? ["mine"] : []);
    const list = (S.customFoods.length && UI.pg === "mine" ? S.customFoods.map((f) => f.id) : PICK[UI.pg] || PICK.prot).filter((id) => FM()[id] && foodOK(FM()[id]));
    const state = (id) => items.some((i) => i.fid === id);
    return `<div class="screen">
    <div class="head"><div><h1>Plato</h1><div class="sub">Armalo y mir\xE1 c\xF3mo impacta en tu d\xEDa</div></div>
      <div style="display:flex;gap:8px;align-items:center"><button class="btn sm" data-act="describe" style="gap:6px;white-space:nowrap">${ICON.camera.replace("<svg", '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')}Foto</button>
      <button class="icon-btn" data-act="plate-clear" aria-label="Vaciar plato"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg></button></div></div>
    <div class="chips" style="margin-bottom:12px">${MEALS.map((m) => `<button class="chip ${P.meal === m.id ? "on" : ""}" data-act="plate-meal" data-meal="${m.id}">${m.n}</button>`).join("")}</div>
    <section class="card plate-hero">
      <div class="plate-wrap">
        <div class="plate-svg"><svg viewBox="0 0 220 220" id="plate-svg">
          <circle cx="110" cy="110" r="107" fill="#fff" stroke="#E3D5C1" stroke-width="1.5"/>
          <circle cx="110" cy="110" r="92" fill="#FBF5EA" stroke="#EADBC6" stroke-width="1.5"/>
          <circle cx="110" cy="110" r="64" fill="none" stroke="#EFE5D4" stroke-width="34" ${items.length ? "" : 'stroke-dasharray="4 6"'}/>
          <g transform="rotate(-90 110 110)">${segs}</g>
          <text x="110" y="112" font-size="34" font-weight="600" id="pk-k">0</text>
          <text x="110" y="132" font-size="11" style="font-family:var(--sans);fill:#8B7566;letter-spacing:.08em">KCAL</text></svg></div>
        <div class="legend">${["prot", "carb", "veg", "fat"].map((g) => `<div class="lg"><i class="d" style="background:${GROUP_COL[g]}"></i><span>${GROUP_NAME[g]}</span><b data-g="${g}">0 g</b></div>`).join("")}</div>
      </div>
      <div class="macro-chips">
        ${["p", "c", "f"].map((m) => `<div class="mchip"><b data-mc="${m}">0</b><small>${MLABEL[m]}</small><i style="background:${COL[m]}"></i></div>`).join("")}
      </div>
    </section>
    <section class="card" id="impact"><h3>Impacto en tu d\xEDa <span class="r">${prettyDate(UI.date)}</span></h3>${impactHTML()}</section>
    <div class="sec" style="margin-top:4px"><h2>Arranc\xE1 con una base</h2></div>
    <div class="tpl">${TPL.map((t, i) => `<button data-act="plate-tpl" data-i="${i}"><span class="dd">${dotsFor(t.items)}</span>${t.n}</button>`).join("")}</div>
    <section class="card"><h3>Ingredientes <span class="r">${items.length ? "\u2503 = cantidad de tu plan" : ""}</span></h3>
      ${items.length ? rows : `<div class="empty"><div class="big">\u{1F37D}</div>Plato vac\xEDo. Eleg\xED una base arriba o sum\xE1 ingredientes abajo.</div>`}
    </section>
    ${items.length ? '<button class="btn soft block" style="margin:-4px 0 14px" data-act="plate-save">Guardar como receta</button>' : ""}
    <section class="card"><h3>Sumar ingredientes</h3>
      <div class="chips" style="margin-bottom:10px">${groups.map((g) => `<button class="chip ${UI.pg === g ? "on" : ""}" data-act="plate-pg" data-g="${g}">${PICK_NAMES[g]}</button>`).join("")}</div>
      <div class="addrow">${list.map((id) => {
      const f = FM()[id];
      return `<button class="chip ${state(id) ? "on" : ""}" data-act="plate-food" data-fid="${id}"><i class="d" style="background:${GROUP_COL[plateGroup(f)]}"></i>${esc(shortName(f))}</button>`;
    }).join("")}
        <button class="chip" data-act="plate-more" style="border-style:dashed">Buscar m\xE1s\u2026</button></div>
    </section>
    <div style="height:70px"></div>
    <div class="dock" id="dock" style="${items.length ? "" : "display:none"}">
      <button class="btn soft" data-act="plate-fit" title="Ajustar al resto del d\xEDa">Ajustar a mi d\xEDa</button>
      <button class="btn" data-act="plate-commit" style="flex:1" id="commit">Agregar al diario</button>
    </div>
  </div>`;
  }
  function plateGeom() {
    const C = 2 * Math.PI * 64, order = ["prot", "carb", "veg", "fat"];
    const its = PLATE.items.map((it) => ({ it, f: FM()[it.fid] })).filter((x) => x.f);
    const sorted = [...its].sort((a, b) => order.indexOf(plateGroup(a.f)) - order.indexOf(plateGroup(b.f)));
    const totalG = sorted.reduce((s, x) => s + x.it.g, 0) || 1;
    const idx = {}, out2 = {};
    let start = 0;
    for (const x of sorted) {
      const g = plateGroup(x.f);
      const i = (idx[g] = (idx[g] || 0) + 1) - 1;
      const len = x.it.g / totalG * C, gap = sorted.length > 1 ? 2.5 : 0;
      out2[x.it.u] = { len: Math.max(len - gap, 0.01), off: -start, col: shade(GROUP_COL[g], i) };
      start += len;
    }
    return { C, out: out2 };
  }
  function ingRow(it) {
    const f = FM()[it.fid];
    if (!f) return "";
    const cfg = rangeCfg(f), g = plateGroup(f), geo = plateGeom();
    const col = geo.out[it.u] ? geo.out[it.u].col : GROUP_COL[g];
    return `<div class="ing" data-uid="${it.u}">
    <div class="ing-head"><i class="d" style="background:${col}"></i>
      <div class="nm">${esc(fname(f))}<small class="hint"></small></div>
      <div class="gv"><b>${n0(it.g)}</b><small> g</small></div>
      <button class="x" data-act="plate-rm" data-uid="${it.u}" aria-label="Quitar">\u2715</button></div>
    <div class="ing-ctl"><button class="sb" data-act="plate-step" data-uid="${it.u}" data-d="-${cfg.step === 1 ? 1 : 5}">\u2212</button>
      <div class="rng"><input type="range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${it.g}" data-in="plate-g" data-uid="${it.u}" style="--col:${GROUP_COL[g]}" aria-label="Gramos de ${esc(shortName(f))}">
        <i class="tick" style="left:${clamp(f.def / cfg.max * 100, 0, 100)}%"></i></div>
      <button class="sb" data-act="plate-step" data-uid="${it.u}" data-d="${cfg.step === 1 ? 1 : 5}">+</button></div>
    <div class="ing-mac"><span><b data-im="k">0</b> kcal</span><span>P <b data-im="p">0</b></span><span>C <b data-im="c">0</b></span><span>G <b data-im="f">0</b></span></div>
  </div>`;
  }
  function paintPlate(animate) {
    const root = $("#view");
    if (!$("#plate-svg")) return;
    const geo = plateGeom(), tot = sumItems(PLATE.items);
    const grams = { prot: 0, carb: 0, veg: 0, fat: 0 };
    for (const it of PLATE.items) {
      const f = FM()[it.fid];
      if (!f) continue;
      grams[plateGroup(f)] += it.g;
      const seg = $(`.seg[data-uid="${it.u}"]`, root), s = geo.out[it.u];
      if (seg && s) {
        seg.style.strokeDasharray = `${s.len} ${geo.C - s.len}`;
        seg.style.strokeDashoffset = s.off;
        seg.setAttribute("stroke", s.col);
      }
      const row = $(`.ing[data-uid="${it.u}"]`, root);
      if (!row) continue;
      const m = itemMac(it);
      $(".gv b", row).textContent = n0(it.g);
      $(".hint", row).textContent = gHint(f, it.g);
      $(".ing-head .d", row).style.background = s ? s.col : "";
      for (const k of ["k", "p", "c", "f"]) $(`[data-im="${k}"]`, row).textContent = n0(m[k]);
      const r = $("input[type=range]", row);
      if (+r.value !== it.g) r.value = it.g;
      fillRange(r);
    }
    const pk = $("#pk-k");
    if (animate) countTo(pk, parseFloat(pk.textContent) || 0, tot.k, 380);
    else {
      pk._cnt = (pk._cnt || 0) + 1;
      pk.textContent = n0(tot.k);
    }
    for (const g of Object.keys(grams)) $(`[data-g="${g}"]`, root).textContent = n0(grams[g]) + " g";
    for (const m of ["p", "c", "f"]) $(`[data-mc="${m}"]`, root).textContent = n0(tot[m]) + " g";
    setImpact($("#impact"), tot, UI.date);
    $("#commit").textContent = `${PLATE.editing ? "Guardar cambios" : "Agregar al diario"} \xB7 ${n0(tot.k)} kcal`;
    $("#dock").style.display = PLATE.items.length ? "" : "none";
  }
  function plateAddFood(fid, g) {
    PLATE.items.push(mkItem(fid, g));
    savePlate();
    render();
    const last = PLATE.items[PLATE.items.length - 1];
    const row = $(`.ing[data-uid="${last.u}"]`);
    if (row) {
      row.classList.add("pulse");
    }
    paintPlate(true);
  }
  function commitPlate() {
    const items = PLATE.items.filter((i) => i.g > 0 && FM()[i.fid]);
    if (!items.length) return toast("El plato est\xE1 vac\xEDo");
    const per = sumItems(items);
    const e = {
      m: PLATE.meal,
      name: PLATE.name || autoName(items),
      qty: 1,
      unit: "plato",
      step: 0.25,
      min: 0.25,
      max: 3,
      per,
      items: items.map((i) => ({ fid: i.fid, g: i.g })),
      src: { t: "plate" }
    };
    if (PLATE.editing) removeEntry(UI.date, PLATE.editing.id);
    addEntry(UI.date, e);
    items.forEach((i) => pushRecent("food", i.fid));
    const meal = e.m;
    PLATE = { name: "", meal: slotByHour(UI.date), items: [], editing: null };
    savePlate();
    UI.tab = "hoy";
    window.scrollTo(0, 0);
    render();
    toast(`Agregado a ${mealName(meal)}`);
  }
  function loadPlate(items, meal, name = "", editing = null) {
    PLATE = { name, meal: meal || PLATE.meal, items: items.map(([fid, g]) => mkItem(fid, g)), editing };
    savePlate();
    closeSheet(true);
    UI.tab = "plato";
    window.scrollTo(0, 0);
    render();
  }
  function recipePool() {
    const f = UI.rf, q = norm2(f.q.trim());
    return allRecipes().filter((r) => {
      if (f.fav && !S.favRecipes.includes(r.id)) return false;
      if (f.mine && r.src !== "mine") return false;
      if (f.prot && r.prot !== f.prot) return false;
      if (f.carb && r.carb !== f.carb) return false;
      if (f.meal && !r.meals.includes(f.meal)) return false;
      if (q && !norm2(r.name).includes(q)) return false;
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
    const chip = (cond, act, data, label) => `<button class="chip ${cond ? "on" : ""}" data-act="${act}" ${data}>${label}</button>`;
    return `<div class="screen">
    <div class="head"><div><h1>Recetas</h1><div class="sub">${allRecipes().length} ideas simples, a tu plan</div></div></div>
    <div class="search">${ICON.search}<input type="search" placeholder="Buscar: pollo, papa, tortilla\u2026" value="${esc(f.q)}" data-in="rf-q" enterkeyhint="search"></div>
    <div class="chips" style="margin-bottom:6px">
      ${chip(f.fit, "rf-fit", "", `Para m\xED \xB7 ${mealName(slot)}`)}${chip(f.fav, "rf-fav", "", "\u2605 Favoritas")}${chip(f.mine, "rf-mine", "", "M\xEDas")}
    </div>
    <div class="filters">
      <div class="lab">Prote\xEDna</div><div class="chips">${PROT_GROUPS.map(([id, n]) => chip(f.prot === id, "rf-prot", `data-v="${id}"`, n)).join("")}</div>
      <div class="lab">Hidrato</div><div class="chips">${CARB_GROUPS.map(([id, n]) => chip(f.carb === id, "rf-carb", `data-v="${id}"`, n)).join("")}</div>
      <div class="lab">Momento</div><div class="chips">${[["desayuno", "Desayuno"], ["almuerzo", "Almuerzo / Cena"], ["merienda", "Merienda"], ["media_tarde", "Colaci\xF3n"]].map(([id, n]) => chip(f.meal === id, "rf-meal", `data-v="${id}"`, n)).join("")}</div>
    </div>
    <div class="count">${cards.length} receta${cards.length === 1 ? "" : "s"}${f.fit ? " \xB7 ordenadas por cu\xE1nto encajan con lo que te queda" : ""}</div>
    ${shown.map((x) => rcardHTML(x, slot)).join("") || `<div class="empty">No encontr\xE9 recetas con esos filtros.</div>`}
    ${cards.length > shown.length ? `<button class="btn ghost block" data-act="rf-more">Mostrar m\xE1s (${cards.length - shown.length})</button>` : ""}
    <button class="btn soft block" style="margin-top:12px" data-act="goto-plate">+ Armar mi propio plato</button>
  </div>`;
  }
  function rcardHTML(x, slot) {
    const r = x.recipe, m = x.m, fav = S.favRecipes.includes(r.id);
    return `<button class="rcard" data-act="open-recipe" data-id="${esc(r.id)}" data-mult="${x.mult}" data-meal="${slot}">
    <div class="t"><div class="nm">${esc(r.name)}</div>${fav ? '<span class="star">\u2605</span>' : ""}</div>
    <div class="meta">${r.plan ? '<span class="tag plan">Plan</span>' : ""}${r.src === "mine" ? '<span class="tag mine">M\xEDa</span>' : ""}<span>${r.min} min</span><span>${r.ing.length} ingredientes</span>${x.mult !== 1 ? `<span><b>\xD7${n1(x.mult)}</b></span>` : ""}</div>
    ${splitHTML(m)}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span class="serif" style="font-size:19px;font-weight:600">${n0(m.k)} <small class="muted" style="font-family:var(--sans);font-size:12px;font-weight:450">kcal</small></span>${macsHTML(m)}</div>
  </button>`;
  }
  var RC = null;
  function openRecipe(id, ctx = {}) {
    const r = getRecipe(id);
    if (!r) return;
    RC = { r, mult: ctx.mult || 1, oil: false, meal: ctx.meal || slotByHour(UI.date), date: UI.date };
    const tags = `${r.plan ? '<span class="tag plan">Plan</span> ' : ""}${r.src === "mine" ? '<span class="tag mine">M\xEDa</span> ' : ""}<span class="muted" style="font-size:13px">${r.min} min</span>`;
    const body = `
    <div style="margin:-2px 0 10px">${tags}</div>
    <div class="detail-hero"><div class="big"><span id="rc-k">0</span><small> kcal</small></div>
      <div id="rc-split" style="margin:10px 4px 6px"></div>
      <div class="macro-chips" style="margin-top:8px">${["p", "c", "f"].map((m) => `<div class="mchip"><b data-rm="${m}">0</b><small>${MLABEL[m]}</small><i style="background:${COL[m]}"></i></div>`).join("")}</div></div>
    <div class="card" style="padding:14px;margin-top:12px"><div class="ihead" style="margin-bottom:0"><span class="l">Porciones</span><span class="v"><b id="rc-mv">1</b></span></div>
      <div class="ing-ctl"><button class="sb" data-act="rc-step" data-d="-0.25">\u2212</button><div class="rng"><input type="range" min="0.25" max="3" step="0.25" value="${RC.mult}" data-in="rc-mult" style="--col:var(--bordo)"></div><button class="sb" data-act="rc-step" data-d="0.25">+</button></div></div>
    <div class="card"><h3>Impacto en tu d\xEDa</h3>${impactHTML()}</div>
    <div class="card"><h3>Ingredientes <span class="r" id="rc-ing-n"></span></h3><ul class="ings" id="rc-ings"></ul>
      <button class="toggle" data-act="rc-oil" id="rc-oil" style="margin-top:6px"><span>Sumar 1 cda de aceite de oliva<small>Opcional \xB7 el plan sugiere spray antiadherente</small></span><span class="sw"></span></button>
      ${carbState() === "cocido" && r.ing.some(([f]) => FM()[f] && FM()[f].v) ? '<div class="note">Todo va pesado <b>cocido</b>, como en tu plan. Entre par\xE9ntesis ves el equivalente en crudo.</div>' : ""}</div>
    <div class="card"><h3>Preparaci\xF3n</h3>${r.steps.length ? `<ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : '<div class="muted">Sin pasos cargados.</div>'}</div>
    <div class="card"><h3>Agregar a</h3><div class="chips">${MEALS.map((m) => `<button class="chip ${RC.meal === m.id ? "on" : ""}" data-act="rc-meal" data-meal="${m.id}">${m.n}</button>`).join("")}</div></div>
    ${r.src === "mine" ? '<button class="btn danger block" data-act="rc-delete">Eliminar mi receta</button>' : ""}`;
    const foot = `<button class="icon-btn" data-act="rc-fav" id="rc-fav" style="width:48px;height:48px;flex:0 0 auto"></button>
    <button class="btn soft" data-act="rc-plate" style="flex:0 0 auto;padding:0 14px">En el plato</button>
    <button class="btn" data-act="rc-add" id="rc-add">Agregar</button>`;
    openSheet({ title: esc(r.name), body, foot, onMount: () => paintRecipe(true) });
  }
  function rcItems() {
    const { r, mult, oil } = RC;
    const list = r.ing.map(([fid, g]) => [fid, g * mult]);
    if (oil) list.push(["aceite_oliva", 13]);
    return list;
  }
  function paintRecipe(first) {
    const el = sheetEl();
    if (!el || !RC) return;
    const items = rcItems().map(([fid, g]) => ({ fid, g }));
    const tot = sumItems(items);
    const kEl = $("#rc-k", el);
    if (first) countTo(kEl, 0, tot.k, 500);
    else {
      kEl._cnt = (kEl._cnt || 0) + 1;
      kEl.textContent = n0(tot.k);
    }
    $("#rc-split", el).innerHTML = splitHTML(tot);
    for (const m of ["p", "c", "f"]) $(`[data-rm="${m}"]`, el).textContent = n0(tot[m]) + " g";
    $("#rc-mv", el).textContent = RC.mult === 1 ? "1 porci\xF3n" : `\xD7${n1(RC.mult)}`;
    $("#rc-ings", el).innerHTML = items.map((it) => {
      const f = FM()[it.fid];
      if (!f) return "";
      const h = gHint(f, it.g);
      return `<li><i class="d" style="background:${GROUP_COL[plateGroup(f)]}"></i><span>${esc(fname(f))}</span><span class="g">${n0(it.g)} g${h ? ` <small>(${h.replace("\u2248 ", "")})</small>` : ""}</span></li>`;
    }).join("");
    const range = $("input[type=range]", el);
    range.value = RC.mult;
    fillRange(range);
    $("#rc-oil", el).classList.toggle("on", RC.oil);
    const fav = S.favRecipes.includes(RC.r.id);
    $("#rc-fav", el).innerHTML = fav ? "\u2605" : "\u2606";
    $("#rc-add", el).textContent = `Agregar \xB7 ${n0(tot.k)} kcal`;
    setImpact(el, tot, RC.date);
  }
  function recipeEntry(r, mult, meal) {
    const per = macrosOf(r, 1);
    return {
      m: meal,
      name: r.name,
      qty: mult,
      unit: "porci\xF3n",
      step: 0.25,
      min: 0.25,
      max: 4,
      per: { k: per.k, p: per.p, c: per.c, f: per.f },
      items: r.ing.map(([fid, g]) => ({ fid, g })),
      src: { t: "recipe", id: r.id }
    };
  }
  function viewProgreso() {
    const ws = S.weights, last = ws[ws.length - 1], first = ws[0];
    const diff = last && first ? last.kg - first.kg : 0;
    const t = targets(), today = todayISO();
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    const data = days.map((d) => ({ d, tot: dayTotals(d), full: MAINS.every((m) => mealEntries(d, m).length) }));
    const logged = data.filter((x) => x.tot.k > 0);
    const avg = (k) => logged.length ? logged.reduce((s, x) => s + x.tot[k], 0) / logged.length : 0;
    return `<div class="screen">
    <div class="head"><div><h1>Progreso</h1><div class="sub">Una vez por semana, misma balanza</div></div></div>
    <section class="card"><h3>Peso <span class="r">${ws.length} registro${ws.length === 1 ? "" : "s"}</span></h3>
      <div style="display:flex;align-items:baseline;gap:10px"><span class="serif" style="font-size:40px;font-weight:600;letter-spacing:-.02em">${last ? n1(last.kg) : "\u2013"}</span><span class="muted">kg</span>
        ${ws.length > 1 ? `<span style="margin-left:auto;font-weight:650;color:${diff <= 0 ? "var(--ok)" : "var(--bordo)"}">${diff > 0 ? "+" : ""}${n1(diff)} kg</span>` : ""}</div>
      ${weightChart()}
      <div style="display:flex;gap:8px;margin-top:12px"><input type="number" inputmode="decimal" step="0.1" id="w-kg" placeholder="Peso de hoy (kg)" style="flex:1;min-width:0;width:100%;height:46px;border-radius:14px;border:1px solid var(--line);background:var(--bg);padding:0 14px;outline:none"><button class="btn" data-act="weight-save">Guardar</button></div>
    </section>
    <section class="card"><h3>\xDAltimos 7 d\xEDas <span class="r">calor\xEDas</span></h3>${weekChart(data, t)}
      <div class="kpis"><div class="kpi"><b>${n0(avg("k"))}</b><small>kcal promedio</small></div><div class="kpi"><b>${n0(avg("p"))} g</b><small>prot. promedio</small></div><div class="kpi"><b>${data.filter((x) => x.full).length}/7</b><small>d\xEDas con 4 comidas</small></div></div>
    </section>
  </div>`;
  }
  function weightChart() {
    const ws = S.weights.slice(-12);
    if (ws.length < 2) return `<div class="empty" style="padding:14px 0 4px">Carg\xE1 tu pr\xF3ximo pesaje y vas a ver la curva ac\xE1.</div>`;
    const W = 320, H2 = 130, px = 22, py = 22;
    const vals = ws.map((w) => w.kg), mn = Math.min(...vals) - 0.6, mx = Math.max(...vals) + 0.6;
    const x = (i) => px + i * (W - 2 * px) / (ws.length - 1), y = (v) => H2 - py - (v - mn) / (mx - mn) * (H2 - 2 * py);
    const pts = ws.map((w, i) => `${x(i).toFixed(1)},${y(w.kg).toFixed(1)}`);
    return `<svg class="chart" viewBox="0 0 ${W} ${H2}" style="margin-top:8px"><defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6E1F2E" stop-opacity=".22"/><stop offset="1" stop-color="#6E1F2E" stop-opacity="0"/></linearGradient></defs>
    <path d="M${pts[0]} L${pts.join(" L")} L${x(ws.length - 1)},${H2 - py} L${x(0)},${H2 - py} Z" fill="url(#wg)"/>
    <polyline points="${pts.join(" ")}" fill="none" stroke="#6E1F2E" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${ws.map((w, i) => `<circle cx="${x(i)}" cy="${y(w.kg)}" r="4" fill="#FCF8F0" stroke="#6E1F2E" stroke-width="2"/><text x="${x(i)}" y="${y(w.kg) - 9}" text-anchor="middle">${n1(w.kg)}</text><text x="${x(i)}" y="${H2 - 4}" text-anchor="middle">${shortDate(w.d)}</text>`).join("")}</svg>`;
  }
  function weekChart(data, t) {
    const W = 320, H2 = 150, base = 118, top = 18, bw = 28;
    const mx = Math.max(t.k * 1.15, ...data.map((x) => x.tot.k), 1);
    const y = (v) => base - v / mx * (base - top);
    const step = (W - 20) / 7;
    return `<svg class="chart" viewBox="0 0 ${W} ${H2}">
    <line x1="10" x2="${W - 10}" y1="${y(t.k)}" y2="${y(t.k)}" stroke="#3A2920" stroke-opacity=".35" stroke-dasharray="4 4"/><text x="${W - 10}" y="${y(t.k) - 4}" text-anchor="end">objetivo ${t.k}</text>
    ${data.map((x, i) => {
      const cx = 10 + step * i + step / 2, h = base - y(x.tot.k), over = x.tot.k > t.k * 1.05;
      return `<rect x="${cx - bw / 2}" y="${base}" width="${bw}" height="0" rx="8" fill="${over ? "#B5452F" : x.d === todayISO() ? "#6E1F2E" : "#B98A8E"}"><animate attributeName="height" from="0" to="${Math.max(h, x.tot.k ? 3 : 0)}" dur=".6s" fill="freeze" begin="0s"/><animate attributeName="y" from="${base}" to="${base - Math.max(h, x.tot.k ? 3 : 0)}" dur=".6s" fill="freeze" begin="0s"/></rect>
      ${x.tot.k ? `<text x="${cx}" y="${y(x.tot.k) - 5}" text-anchor="middle">${n0(x.tot.k)}</text>` : ""}
      <text x="${cx}" y="${base + 16}" text-anchor="middle" style="font-weight:${x.d === todayISO() ? 700 : 400}">${dowName(x.d)}</text>
      ${x.full ? `<circle cx="${cx}" cy="${base + 29}" r="3" fill="#5E7A4C"/>` : ""}`;
    }).join("")}</svg>
    <div class="muted" style="font-size:11px;margin-top:2px"><span style="color:#5E7A4C">\u25CF</span> d\xEDa con desayuno, almuerzo, merienda y cena cargados</div>`;
  }
  function viewAjustes() {
    const s = S.settings, t = targets();
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    return `<div class="screen">
    <div class="head"><div><h1>Ajustes</h1><div class="sub">Tu plan, a tu manera</div></div></div>
    <section class="card"><h3>Objetivo diario</h3>
      <button class="list-item" data-act="targets" style="padding-top:0"><span class="t"><b class="serif" style="font-size:22px">${t.isSet ? `${t.k} kcal` : "Sin cargar"}</b><small>${t.isSet ? `P ${t.p} g \xB7 C ${t.c} g \xB7 G ${t.f} g` : "Toc\xE1 para cargar tus macros"}</small></span><span class="chev">\u203A</span></button>
      ${t.isSet ? splitHTML({ p: t.p, c: t.c, f: t.f }) : ""}</section>
    <section class="card"><h3>Perfil</h3>
      <label class="field"><span>Nombre</span><input data-in="prof" data-k="name" value="${esc(s.name)}"></label>
      <div class="grid2"><label class="field"><span>Edad</span><input type="number" inputmode="numeric" data-in="prof" data-k="age" value="${s.age}"></label>
      <label class="field"><span>Altura (cm)</span><input type="number" inputmode="numeric" data-in="prof" data-k="height" value="${s.height}"></label></div></section>
    <section class="card"><h3>Preferencias</h3>
      <button class="toggle ${s.avoidGluten ? "on" : ""}" data-act="set-toggle" data-k="avoidGluten"><span>Evitar gluten<small>Oculta recetas y alimentos con gluten (tu plan lo marca como agresor)</small></span><span class="sw"></span></button>
      <button class="toggle ${s.avoidLact ? "on" : ""}" data-act="set-toggle" data-k="avoidLact"><span>Evitar lactosa<small>Quedan los deslactosados</small></span><span class="sw"></span></button>
      <div style="padding:12px 0 4px"><div style="font-weight:600;margin-bottom:2px">Los alimentos se pesan</div><div class="muted" style="font-size:12px;margin-bottom:8px">Carnes, pescado, arroz, fideo, papa y batata. Tu plan: cocidos</div>
        <div class="segmented"><button class="${s.carbState === "cocido" ? "on" : ""}" data-act="set-carb" data-v="cocido">Cocidos</button><button class="${s.carbState === "crudo" ? "on" : ""}" data-act="set-carb" data-v="crudo">Crudos</button></div></div>
      <label class="field" style="margin-top:12px;margin-bottom:0"><span>Meta de agua (ml)</span><input type="number" inputmode="numeric" step="250" data-in="prof" data-k="waterGoal" value="${s.waterGoal}"></label></section>
    <section class="card"><h3>Mi contenido</h3>
      <button class="list-item" data-act="plan-info"><span class="t"><b>Mi plan nutricional</b><small>Estrategia, suplementos y recomendaciones</small></span><span class="chev">\u203A</span></button>
      <button class="list-item" data-act="my-foods"><span class="t"><b>Mis alimentos</b><small>${S.customFoods.length} creados</small></span><span class="chev">\u203A</span></button>
      <button class="list-item" data-act="my-recipes"><span class="t"><b>Mis recetas</b><small>${S.customRecipes.length} guardadas</small></span><span class="chev">\u203A</span></button>
      <button class="list-item" data-act="backup"><span class="t"><b>Respaldo</b><small>Exportar o restaurar tus datos</small></span><span class="chev">\u203A</span></button></section>
    ${standalone ? "" : `<section class="card"><h3>Instalar en el iPhone</h3><ol class="steps" style="margin-top:4px"><li>Abr\xED esta p\xE1gina en <b>Safari</b>.</li><li>Toc\xE1 <b>Compartir</b> (el cuadrado con flecha).</li><li>Eleg\xED <b>Agregar a inicio</b> y listo: queda como una app.</li></ol><div class="note">Tus datos se guardan en el tel\xE9fono. Si instal\xE1s la app, empez\xE1 a usarla desde el \xEDcono (no desde Safari) y hac\xE9 un respaldo de vez en cuando.</div></section>`}
    <button class="btn danger block" data-act="reset">Borrar todos mis datos</button>
    <div class="muted" style="text-align:center;font-size:12px;margin:14px 0 0">Plato \xB7 hecho para tu plan</div>
  </div>`;
  }
  function openTargets() {
    const t = S.settings.targets, cur = targets();
    const body = `<p class="muted" style="margin:0 0 14px;font-size:14px">Pon\xE9 tus macros diarios. Las calor\xEDas se calculan solas (4\xB7P + 4\xB7C + 9\xB7G), pero pod\xE9s pisarlas.</p>
    <div class="grid2">
      <label class="field"><span>Prote\xEDna (g)</span><input id="t-p" type="number" inputmode="numeric" data-in="t-in" value="${t.p ?? ""}" placeholder="${cur.isSet ? "" : "150"}"></label>
      <label class="field"><span>Hidratos (g)</span><input id="t-c" type="number" inputmode="numeric" data-in="t-in" value="${t.c ?? ""}" placeholder="${cur.isSet ? "" : "200"}"></label>
      <label class="field"><span>Grasas (g)</span><input id="t-f" type="number" inputmode="numeric" data-in="t-in" value="${t.f ?? ""}" placeholder="${cur.isSet ? "" : "60"}"></label>
      <label class="field"><span>Calor\xEDas</span><input id="t-k" type="number" inputmode="numeric" data-in="t-in" value="${t.kManual ? t.k : ""}" placeholder="auto"></label></div>
    <div class="card" style="margin-top:4px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><span class="serif" style="font-size:30px;font-weight:600" id="t-kcal">0</span><span class="muted" style="font-size:13px" id="t-gkg"></span></div><div id="t-split"></div>
      <div class="macs" style="margin-top:8px;justify-content:space-between" id="t-pct"></div></div>`;
    const foot = `<button class="btn" data-act="targets-save">Guardar objetivo</button>`;
    openSheet({ title: "Mis macros del d\xEDa", body, foot, onMount: () => paintTargets() });
  }
  function readTargets() {
    const v = (id) => {
      const x = parseFloat($(id).value);
      return x > 0 ? x : 0;
    };
    const p = v("#t-p"), c = v("#t-c"), f = v("#t-f"), k = v("#t-k");
    return { p, c, f, k, auto: Math.round(p * 4 + c * 4 + f * 9) };
  }
  function paintTargets() {
    const x = readTargets(), k = x.k || x.auto;
    const el = sheetEl();
    $("#t-kcal", el).textContent = `${k} kcal`;
    const w = S.weights.length ? S.weights[S.weights.length - 1].kg : 0;
    $("#t-gkg", el).textContent = x.p && w ? `${n1(x.p / w)} g de prote\xEDna por kg` : "";
    $("#t-split", el).innerHTML = splitHTML(x);
    const tot = x.p * 4 + x.c * 4 + x.f * 9 || 1;
    $("#t-pct", el).innerHTML = [["p", "P"], ["c", "C"], ["f", "G"]].map(([m, l], i) => `<span><i class="dot" style="background:${COL[m]}"></i><b>${n0((m === "f" ? x.f * 9 : x[m] * 4) / tot * 100)}%</b> ${l}</span>`).join("");
    $("#t-k", el).placeholder = x.auto ? String(x.auto) : "auto";
  }
  function saveTargets() {
    const x = readTargets();
    if (!x.p && !x.c && !x.f && !x.k) return toast("Carg\xE1 al menos un valor");
    S.settings.targets = { p: x.p || null, c: x.c || null, f: x.f || null, k: x.k || null, kManual: !!x.k };
    S.settings.onboarded = true;
    save();
    closeSheet();
    render();
    toast("Objetivo guardado");
  }
  var PK = null;
  function openPicker({ mode = "diary", meal, date = UI.date }) {
    PK = { mode, meal: meal || slotByHour(date), date, tab: mode === "plate" ? "foods" : "recent", q: "" };
    openSheet({ title: mode === "plate" ? "Sumar al plato" : `Agregar a ${mealName(PK.meal)}`, body: '<div id="pk"></div>', onMount: drawPicker });
  }
  function drawPicker() {
    const tabs = PK.mode === "plate" ? [["foods", "Alimentos"]] : [["recent", "Recientes"], ["plan", "Plan"], ["recipes", "Recetas"], ["foods", "Alimentos"], ["quick", "R\xE1pido"]];
    const search = PK.tab !== "quick" && PK.tab !== "recent" && PK.tab !== "plan";
    $("#pk").innerHTML = `
    ${tabs.length > 1 ? `<div class="chips" style="margin-bottom:10px">${tabs.map(([id, n]) => `<button class="chip ${PK.tab === id ? "on" : ""}" data-act="pk-tab" data-tab="${id}">${n}</button>`).join("")}</div>` : ""}
    ${search ? `<div class="search">${ICON.search}<input type="search" id="pk-q" placeholder="${PK.tab === "recipes" ? "Buscar receta\u2026" : "Buscar alimento\u2026"}" value="${esc(PK.q)}" data-in="pk-q" enterkeyhint="search"></div>` : ""}
    <div id="pk-list"></div>`;
    drawPickerList();
  }
  var pickRow = (type, id, name, sub, dd = "#D3AE7E") => `<button class="pick" data-act="pk-pick" data-type="${type}" data-id="${esc(id)}"><i class="dd" style="background:${dd}"></i><span class="n"><b>${esc(name)}</b><small>${esc(sub)}</small></span><span class="go">\uFF0B</span></button>`;
  function foodRow(f) {
    const pg = foodPer(f), g = f.only ? f.u.g : f.def, m = { k: pg.k * g, p: pg.p * g };
    const unit = f.only ? `1 ${f.u.n}` : `${f.def} g`;
    return pickRow("food", f.id, fname(f), `${unit} \xB7 ${n0(m.k)} kcal \xB7 P ${n0(m.p)}`, GROUP_COL[plateGroup(f)]);
  }
  function recRow(r) {
    const m = macrosOf(r);
    return pickRow("recipe", r.id, r.name, `${n0(m.k)} kcal \xB7 P ${n0(m.p)} \xB7 C ${n0(m.c)} \xB7 G ${n0(m.f)}`, r.plan ? "#8B9A69" : "#7A2233");
  }
  function drawPickerList() {
    const box = $("#pk-list");
    if (!box) return;
    const q = norm2(PK.q.trim());
    let html = "";
    if (PK.tab === "recent") {
      const rec = S.recents.map((r) => r.type === "food" ? FM()[r.id] && ["food", FM()[r.id]] : getRecipe(r.id) && ["recipe", getRecipe(r.id)]).filter(Boolean);
      html = rec.length ? rec.map(([t, o]) => t === "food" ? foodRow(o) : recRow(o)).join("") : `<div class="empty">Todav\xEDa no cargaste nada.<br>Prob\xE1 la pesta\xF1a <b>Plan</b> o <b>R\xE1pido</b>.</div>`;
      html += `<button class="btn soft block" style="margin-top:14px" data-act="goto-plate-meal">Armar un plato con sliders</button>`;
    } else if (PK.tab === "plan") {
      const plan = allRecipes().filter((r) => r.plan);
      const first = plan.filter((r) => r.meals.includes(PK.meal)), rest = plan.filter((r) => !r.meals.includes(PK.meal));
      html = (first.length ? `<div class="muted" style="font-size:12px;margin:2px 0 4px;letter-spacing:.06em;text-transform:uppercase">Opciones de ${mealName(PK.meal)}</div>${first.map(recRow).join("")}` : "") + (rest.length ? `<div class="muted" style="font-size:12px;margin:14px 0 4px;letter-spacing:.06em;text-transform:uppercase">Otras del plan</div>${rest.map(recRow).join("")}` : "");
      html += `<button class="btn soft block" style="margin-top:14px" data-act="goto-plate-meal">Armar almuerzo o cena con sliders</button>`;
    } else if (PK.tab === "recipes") {
      const list = allRecipes().filter((r) => (!q || norm2(r.name).includes(q)) && (q || r.meals.includes(PK.meal)) && dietOK(macrosOf(r))).slice(0, 40);
      html = list.map(recRow).join("") || '<div class="empty">Sin resultados.</div>';
    } else if (PK.tab === "foods") {
      const list = allFoods().filter((f) => foodOK(f) && (!q || norm2(f.n).includes(q))).slice(0, 60);
      html = list.map(foodRow).join("") || '<div class="empty">Sin resultados.</div>';
      html += `<button class="btn soft block" style="margin-top:14px" data-act="food-form">+ Crear alimento nuevo</button>`;
    } else if (PK.tab === "quick") {
      html = `<p class="muted" style="margin:0 0 12px;font-size:14px">Carg\xE1 solo los n\xFAmeros. Ideal para comidas afuera o algo que no quer\xE9s armar.</p>
      <label class="field"><span>Nombre (opcional)</span><input id="q-n" placeholder="Ej: Almuerzo en el trabajo" data-in="q-in"></label>
      <div class="grid4"><label class="field"><span>kcal</span><input id="q-k" type="number" inputmode="numeric" data-in="q-in"></label><label class="field"><span>Prot</span><input id="q-p" type="number" inputmode="numeric" data-in="q-in"></label><label class="field"><span>Carb</span><input id="q-c" type="number" inputmode="numeric" data-in="q-in"></label><label class="field"><span>Gras</span><input id="q-f" type="number" inputmode="numeric" data-in="q-in"></label></div>
      <div class="card" style="padding:14px"><h3>Impacto en tu d\xEDa</h3>${impactHTML()}</div>
      <button class="btn block" id="q-add" data-act="quick-add">Agregar</button>`;
    }
    box.innerHTML = html;
    if (PK.tab === "quick") paintQuick();
  }
  function paintQuick() {
    const v = (id) => parseFloat($(id).value) || 0;
    const p = v("#q-p"), c = v("#q-c"), f = v("#q-f");
    const k = v("#q-k") || p * 4 + c * 4 + f * 9;
    setImpact($("#pk-list"), { k, p, c, f }, PK.date);
    $("#q-add").textContent = k ? `Agregar \xB7 ${n0(k)} kcal` : "Agregar";
  }
  var FD = null;
  function openFoodDetail(fid) {
    const f = FM()[fid];
    if (!f) return;
    const cfg = rangeCfg(f), pg = foodPer(f);
    const unitFirst = !!f.only;
    FD = { f, pg, cfg, unit: unitFirst, q: unitFirst ? 1 : f.def, meal: PK ? PK.meal : slotByHour(UI.date), date: PK ? PK.date : UI.date };
    const hasU = !!f.u;
    const body = `<button class="link" data-act="pk-back" style="margin:-4px 0 8px">\u2039 Volver</button>
    <div class="detail-hero"><div class="big"><span id="fd-q">0</span><small id="fd-u"> g</small></div><div class="muted" id="fd-h" style="min-height:18px;font-size:13px;margin-top:4px"></div></div>
    ${hasU && !f.only ? `<div class="segmented" style="margin:6px 0 12px"><button data-act="fd-mode" data-v="g" class="on">Gramos</button><button data-act="fd-mode" data-v="u">${esc(pl(2, f.u.n))}</button></div>` : ""}
    <div class="ing-ctl" style="margin-bottom:12px"><button class="sb" data-act="fd-step" data-d="-1">\u2212</button><div class="rng"><input type="range" id="fd-r" data-in="fd-r" style="--col:${GROUP_COL[plateGroup(f)]}"></div><button class="sb" data-act="fd-step" data-d="1">+</button></div>
    <div class="macro-chips" style="grid-template-columns:repeat(4,1fr);margin:0 0 12px">${["k", "p", "c", "f"].map((m) => `<div class="mchip"><b data-fm="${m}">0</b><small>${m === "k" ? "kcal" : MLABEL[m].slice(0, 4)}</small><i style="background:${COL[m]}"></i></div>`).join("")}</div>
    <div class="card" style="padding:14px"><h3>Impacto en tu d\xEDa</h3>${impactHTML()}</div>
    <div class="card"><h3>Agregar a</h3><div class="chips">${MEALS.map((m) => `<button class="chip ${FD.meal === m.id ? "on" : ""}" data-act="fd-meal" data-meal="${m.id}">${m.n}</button>`).join("")}</div></div>`;
    setSheetTitle(esc(fname(f)));
    setSheetBody(body, `<button class="btn" id="fd-add" data-act="fd-add">Agregar</button>`);
    fdConfigure();
  }
  function fdConfigure() {
    const { f, cfg } = FD, el = sheetEl(), r = $("#fd-r", el);
    if (FD.unit) {
      r.min = 0;
      r.max = f.only ? 4 : 8;
      r.step = f.u.step;
      if (!FD.keepQ) FD.q = f.only ? 1 : Math.max(f.u.step, Math.round(f.def / f.u.g / f.u.step) * f.u.step);
    } else {
      r.min = cfg.min;
      r.max = cfg.max;
      r.step = cfg.step;
      if (!FD.keepQ) FD.q = f.def;
    }
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
    $("#fd-q", el).textContent = FD.unit ? n1(FD.q) : n0(FD.q);
    $("#fd-u", el).textContent = FD.unit ? " " + pl(FD.q, f.u.n) : " g";
    $("#fd-h", el).textContent = FD.unit ? f.only ? "" : `\u2248 ${n0(FD.q * f.u.g)} g` : gHint(f, FD.q);
    for (const k of ["k", "p", "c", "f"]) $(`[data-fm="${k}"]`, el).textContent = n0(m[k]);
    const r = $("#fd-r", el);
    r.value = FD.q;
    fillRange(r);
    setImpact(el, m, FD.date);
    $("#fd-add", el).textContent = `Agregar \xB7 ${n0(m.k)} kcal`;
    $$('[data-act="fd-mode"]', el).forEach((b) => b.classList.toggle("on", b.dataset.v === "u" === FD.unit));
  }
  var ED = null;
  function openEntry(id) {
    const e = findEntry(UI.date, id);
    if (!e) return;
    ED = { id, qty: e.qty, meal: e.m, date: UI.date };
    const isG = e.unit === "g";
    const body = `<div class="detail-hero"><div class="big"><span id="ed-q">0</span><small id="ed-u"></small></div><div class="muted" style="font-size:13px;margin-top:4px">${esc(e.items && e.unit === "plato" ? qtyText(e) : "")}</div></div>
    <div class="ing-ctl" style="margin-bottom:12px"><button class="sb" data-act="ed-step" data-d="-1">\u2212</button><div class="rng"><input type="range" id="ed-r" data-in="ed-r" min="${e.min ?? 0}" max="${e.max ?? 10}" step="${e.step ?? 1}" value="${e.qty}" style="--col:var(--bordo)"></div><button class="sb" data-act="ed-step" data-d="1">+</button></div>
    <div class="macro-chips" style="grid-template-columns:repeat(4,1fr);margin:0 0 12px">${["k", "p", "c", "f"].map((m) => `<div class="mchip"><b data-em="${m}">0</b><small>${m === "k" ? "kcal" : MLABEL[m].slice(0, 4)}</small><i style="background:${COL[m]}"></i></div>`).join("")}</div>
    <div class="card" style="padding:14px"><h3>Impacto en tu d\xEDa</h3>${impactHTML()}</div>
    <div class="card"><h3>Mover a</h3><div class="chips">${MEALS.map((m) => `<button class="chip ${ED.meal === m.id ? "on" : ""}" data-act="ed-meal" data-meal="${m.id}">${m.n}</button>`).join("")}</div></div>
    ${e.items ? '<button class="btn soft block" data-act="ed-plate" style="margin-bottom:10px">Editar ingredientes en el plato</button>' : ""}
    <button class="btn danger block" data-act="ed-delete">Eliminar</button>`;
    openSheet({ title: esc(e.name), body, foot: `<button class="btn" data-act="ed-save">Guardar</button>`, onMount: () => paintEntry() });
  }
  function paintEntry() {
    const e = findEntry(ED.date, ED.id), el = sheetEl();
    if (!e || !el) return;
    const isG = e.unit === "g";
    $("#ed-q", el).textContent = isG ? n0(ED.qty) : n1(ED.qty);
    $("#ed-u", el).textContent = isG ? " g" : " " + pl(ED.qty, e.unit);
    const m = { k: e.per.k * ED.qty, p: e.per.p * ED.qty, c: e.per.c * ED.qty, f: e.per.f * ED.qty };
    for (const k of ["k", "p", "c", "f"]) $(`[data-em="${k}"]`, el).textContent = n0(m[k]);
    const r = $("#ed-r", el);
    r.value = ED.qty;
    fillRange(r);
    setImpact(el, m, ED.date, ED.id);
  }
  var formFromPicker = false;
  function openFoodForm() {
    const body = `<label class="field"><span>Nombre</span><input id="nf-n" placeholder="Ej: Galletitas Marolio" autocomplete="off"></label>
    <div class="muted" style="font-size:12px;margin:-4px 0 8px">Valores por 100 g (o 100 ml) de la etiqueta</div>
    <div class="grid4"><label class="field"><span>kcal</span><input id="nf-k" type="number" inputmode="decimal"></label><label class="field"><span>Prot</span><input id="nf-p" type="number" inputmode="decimal"></label><label class="field"><span>Carb</span><input id="nf-c" type="number" inputmode="decimal"></label><label class="field"><span>Gras</span><input id="nf-f" type="number" inputmode="decimal"></label></div>
    <div class="grid2"><label class="field"><span>Unidad (opcional)</span><input id="nf-un" placeholder="porci\xF3n, scoop\u2026"></label><label class="field"><span>Gramos por unidad</span><input id="nf-ug" type="number" inputmode="decimal" placeholder="30"></label></div>
    <button class="toggle" data-act="nf-gl" id="nf-gl"><span>Contiene gluten</span><span class="sw"></span></button>
    <button class="toggle" data-act="nf-la" id="nf-la"><span>Contiene lactosa</span><span class="sw"></span></button>`;
    openSheet({ title: "Nuevo alimento", body, foot: `<button class="btn" data-act="nf-save">Guardar alimento</button>` });
  }
  function saveFood() {
    const v = (id) => parseFloat($(id).value) || 0;
    const n = $("#nf-n").value.trim();
    if (!n) return toast("Pon\xE9 un nombre");
    const p = v("#nf-p"), c = v("#nf-c"), f = v("#nf-f"), k = v("#nf-k") || Math.round(p * 4 + c * 4 + f * 9);
    if (!k) return toast("Carg\xE1 las calor\xEDas o los macros");
    const un = $("#nf-un").value.trim(), ug = v("#nf-ug");
    const food = { id: "u_" + uid(), n, k, p, c, f, cat: "extra", g: $("#nf-gl").classList.contains("on"), l: $("#nf-la").classList.contains("on"), def: ug && un ? ug : 100 };
    if (un && ug) food.u = { n: un, g: ug, step: 1 };
    S.customFoods.push(food);
    dropFoodCache();
    save();
    toast("Alimento guardado");
    if (formFromPicker && PK) {
      const { mode, meal, date } = PK;
      openPicker({ mode, meal, date });
      PK.tab = "foods";
      PK.q = n;
      drawPicker();
    } else {
      closeSheet();
      if (UI.tab === "ajustes") render();
    }
    formFromPicker = false;
  }
  function openSaveRecipe() {
    const items = PLATE.items.filter((i) => i.g > 0 && FM()[i.fid]);
    if (!items.length) return toast("El plato est\xE1 vac\xEDo");
    const body = `<label class="field"><span>Nombre de la receta</span><input id="sr-n" value="${esc(PLATE.name || autoName(items))}" autocomplete="off"></label><div class="muted" style="font-size:13px">Se guarda con estos gramos como 1 porci\xF3n. La vas a encontrar en Recetas \u2192 M\xEDas.</div>`;
    openSheet({ title: "Guardar receta", body, foot: '<button class="btn" data-act="sr-save">Guardar</button>' });
    setTimeout(() => {
      const i = $("#sr-n");
      if (i) {
        i.focus();
        i.select();
      }
    }, 350);
  }
  function saveRecipeFromPlate() {
    const items = PLATE.items.filter((i) => i.g > 0 && FM()[i.fid]);
    const name = $("#sr-n").value.trim() || autoName(items);
    const has = (re) => items.some((i) => re.test(i.fid));
    const prot = has(/^pollo/) ? "pollo" : has(/^carne/) ? "carne" : has(/^cerdo/) ? "cerdo" : has(/^(pescado|atun)/) ? "pescado" : has(/^huevo/) ? "huevo" : null;
    const carb = has(/^arroz/) ? "arroz" : has(/^fideo/) ? "fideo" : has(/^papa/) ? "papa" : has(/^batata/) ? "batata" : has(/^tapioca/) ? "tapioca" : has(/^pan/) ? "pan" : null;
    const meals = ["desayuno", "merienda", "media_manana", "media_tarde"].includes(PLATE.meal) ? [PLATE.meal] : ["almuerzo", "cena"];
    S.customRecipes.push({ id: "u_" + uid(), name, meals, prot, carb, ing: items.map((i) => [i.fid, i.g]), steps: [], min: 15 });
    save();
    closeSheet();
    toast("Receta guardada en \u201CM\xEDas\u201D");
  }
  function openPlanInfo() {
    const body = `<div class="card"><h3>Estrategia</h3><ul class="ings"><li>4 comidas obligatorias: desayuno, almuerzo, merienda y cena</li><li>Media ma\xF1ana y media tarde: opcionales seg\xFAn apetito</li><li>1 permitido a la semana</li><li>Comer cada 2 a 4 horas para evitar ansiedad</li></ul></div>
    <div class="card"><h3>Agua y alimentos agresores</h3><ul class="ings"><li>M\xEDnimo 3 litros de agua repartidos en el d\xEDa</li><li>Evitar <b>gluten</b> y <b>lactosa</b></li></ul></div>
    <div class="card"><h3>Suplementaci\xF3n</h3><ul class="ings">${SUPPS.map((s) => `<li><span>${s.n}</span><span class="g"><small>${s.when}</small></span></li>`).join("")}</ul></div>
    <div class="card"><h3>Recomendaciones</h3><ul class="ings"><li>Edulcorantes o ka'a he'e; nada de az\xFAcar</li><li>Gaseosas solo cero calor\xEDas, y solo en caso de ansiedad</li><li>Spray antiadherente o salsa de soja en vez de aceite</li><li>Condimentos arom\xE1ticos libres</li><li>Gelatina diet libre (cero calor\xEDas)</li><li>Pesarse una vez por semana, misma balanza</li><li>Evitar embutidos, fiambres, pat\xE9, chorizos, mortadelas, morcillas y frituras</li></ul></div>
    <div class="note">Cantidades base del plan: carnes 175 g, pescado 225 g, huevo 2 enteros + 2 claras, arroz/fideo 100 g, batata 100 g, papa 150 g, tapioca 50 g o 1 pan de hamburguesa sin gluten.</div>`;
    openSheet({ title: "Mi plan", body });
  }
  function openBackup() {
    const json = JSON.stringify(S);
    const body = `<div class="card"><h3>Exportar</h3><p class="muted" style="margin:0 0 10px;font-size:14px">Guard\xE1 una copia de todo (diario, recetas, pesos). Pod\xE9s compartirla a Notas o Archivos.</p>
    <div style="display:flex;gap:8px"><button class="btn block" data-act="bk-share">Compartir archivo</button><button class="btn soft block" data-act="bk-copy">Copiar</button></div></div>
    <div class="card"><h3>Restaurar</h3><p class="muted" style="margin:0 0 10px;font-size:14px">Peg\xE1 el respaldo ac\xE1. Esto reemplaza lo que ten\xE9s ahora.</p>
    <textarea class="paste" id="bk-text" placeholder="Peg\xE1 el respaldo\u2026"></textarea><button class="btn ghost block" style="margin-top:10px" data-act="bk-restore">Restaurar</button></div>`;
    openSheet({ title: "Respaldo", body });
    window.__bk = json;
  }
  function openMyFoods() {
    const body = S.customFoods.length ? `<div class="pick-list">${S.customFoods.map((f) => `<div class="pick" style="cursor:default"><i class="dd" style="background:var(--c)"></i><span class="n"><b>${esc(f.n)}</b><small>${f.k} kcal \xB7 P ${f.p} \xB7 C ${f.c} \xB7 G ${f.f} por 100 g</small></span><button class="x" data-act="del-food" data-id="${f.id}">\u2715</button></div>`).join("")}</div>` : '<div class="empty">Todav\xEDa no creaste alimentos propios.</div>';
    openSheet({ title: "Mis alimentos", body, foot: '<button class="btn" data-act="food-form">+ Nuevo alimento</button>' });
  }
  function openMyRecipes() {
    const body = S.customRecipes.length ? `<div class="pick-list">${S.customRecipes.map((r) => {
      const m = macrosOf(r);
      return `<div class="pick" style="cursor:default"><i class="dd" style="background:var(--p)"></i><span class="n"><b>${esc(r.name)}</b><small>${n0(m.k)} kcal \xB7 P ${n0(m.p)}</small></span><button class="x" data-act="del-recipe" data-id="${r.id}">\u2715</button></div>`;
    }).join("")}</div>` : '<div class="empty">Arm\xE1 un plato y toc\xE1 \u201CGuardar receta\u201D.</div>';
    openSheet({ title: "Mis recetas", body });
  }
  var DS = null;
  var GROUP_OF = (fid) => plateGroup(FM()[fid] || { cat: "extra" });
  var measuredIdx = () => DS.parsed.items.map((it, i) => it.g == null && it.fixedG == null && ["prot", "carb", "veg"].includes(GROUP_OF(it.fid)) ? i : -1).filter((i) => i >= 0);
  var roundG = (g, f) => {
    const st = rangeCfg(f).step;
    return Math.max(st, Math.round(g / st) * st);
  };
  var parseMeal2;
  var Portion2;
  var gpcFor2;
  var loadImage2;
  async function ensureVision() {
    if (parseMeal2 && Portion2) return true;
    try {
      const [p, v] = await Promise.all([Promise.resolve().then(() => (init_parse(), parse_exports)), Promise.resolve().then(() => (init_vision(), vision_exports))]);
      ({ parseMeal: parseMeal2 } = p);
      ({ Portion: Portion2, gpcFor: gpcFor2, loadImage: loadImage2 } = v);
      return true;
    } catch (e) {
      toast("Faltan archivos de la funci\xF3n Foto (js/parse.js y js/vision.js). Subilos a Vercel.");
      return false;
    }
  }
  async function openDescribe() {
    if (!await ensureVision()) return;
    DS = { text: "", parsed: { items: [], unknown: [], ignored: [] }, stage: "text", pstage: "plate", tool: "wand", active: 0, tol: 18, brush: 9, cm: S.settings.plateCm || 26, hm: {}, portion: null, img: null, sig: "", counts: null };
    openSheet({ title: "Describir plato", body: '<div id="ds"></div>', foot: '<button class="btn" id="ds-go" data-act="ds-go">Cargar al plato</button>', onMount: () => {
      drawDescribe();
      setTimeout(() => {
        const t = $("#ds-text");
        if (t) t.focus();
      }, 380);
    } });
  }
  function reparse() {
    DS.parsed = parseMeal2(DS.text, allFoods().filter(foodOK), { avoidGluten: S.settings.avoidGluten });
  }
  function dsAreaCm2(k) {
    if (!DS.portion || !DS.counts) return 0;
    const frac = DS.counts.c[k + 1] / DS.counts.total;
    const r = DS.cm / 2;
    return frac * Math.PI * r * r;
  }
  function dsGrams(i) {
    const it = DS.parsed.items[i], f = FM()[it.fid];
    if (it.fixedG != null) return { g: it.fixedG, src: "fijo" };
    if (it.g != null) return { g: it.g, src: "texto" };
    const k = measuredIdx().indexOf(i);
    if (DS.portion && k >= 0) {
      const area = dsAreaCm2(k);
      if (area > 1) return { g: area * gpcFor2(f, GROUP_OF(it.fid)) * (DS.hm[i] || 1), src: "foto" };
    }
    return { g: f.def * it.mult, src: "plan" };
  }
  function dsColor(i) {
    const idx = measuredIdx(), k = idx.indexOf(i);
    const g = GROUP_OF(DS.parsed.items[i].fid);
    const same = idx.slice(0, k).filter((j) => GROUP_OF(DS.parsed.items[j].fid) === g).length;
    return shade(GROUP_COL[g], same);
  }
  function dsKcal() {
    return DS.parsed.items.reduce((s, it, i) => {
      const f = FM()[it.fid], pg = foodPer(f);
      return s + pg.k * dsGrams(i).g;
    }, 0);
  }
  function dsFoot() {
    const b = $("#ds-go");
    if (!b) return;
    const k = dsKcal();
    b.textContent = DS.parsed.items.length ? `Cargar al plato \xB7 ${n0(k)} kcal` : "Cargar al plato";
    b.disabled = !DS.parsed.items.length;
  }
  function drawDescribe() {
    const box = $("#ds");
    if (!box) return;
    if (DS.stage === "text") {
      box.innerHTML = `<p class="muted" style="margin:0 0 10px;font-size:14px">Escrib\xED qu\xE9 comiste, con o sin cantidades. Si quer\xE9s, sum\xE1 una foto para medir la porci\xF3n de cada parte.</p>
      <textarea class="paste" id="ds-text" rows="3" data-in="ds-text" style="font-family:var(--sans);font-size:16px;height:96px" placeholder="Ej: milanesa de pollo con pur\xE9 de papa y ensalada, 2 huevos, 150 g de arroz">${esc(DS.text)}</textarea>
      <div class="muted" style="font-size:12px;margin:6px 2px 0">Prob\xE1: \u201Carroz con pollo y ensalada\u201D \xB7 \u201Cbife con mandioca\u201D \xB7 \u201C2 huevos con 1 rebanada de pan\u201D</div>
      <div id="ds-chips" style="margin:14px 0 12px"></div>
      <button class="btn soft block" data-act="ds-photo" id="ds-photo-btn">${ICON.camera.replace("<svg", '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')}${DS.portion ? "Ajustar la foto" : "Sumar foto para medir porciones"}</button>`;
      drawDsChips();
    } else drawPhotoStep();
    dsFoot();
  }
  function drawDsChips() {
    const el = $("#ds-chips");
    if (!el) return;
    const { items, unknown, ignored } = DS.parsed;
    if (!items.length && !unknown.length) {
      el.innerHTML = '<div class="muted" style="font-size:13px;text-align:center;padding:6px 0">Los ingredientes que entienda aparecen ac\xE1.</div>';
      $("#ds-photo-btn").disabled = true;
      return;
    }
    el.innerHTML = `<div class="addrow" style="margin-top:0">${items.map((it, i) => {
      const f = FM()[it.fid], r = dsGrams(i);
      const tag = r.src === "foto" ? `~${n0(r.g)} g \xB7 foto` : r.src === "plan" ? `~${n0(r.g)} g \xB7 plan` : `${n0(r.g)} g`;
      return `<span class="chip on" style="background:var(--card);color:var(--ink);border-color:var(--line);padding-right:6px"><i class="d" style="background:${GROUP_COL[GROUP_OF(it.fid)]}"></i>${esc(shortName(f))} <small class="muted" style="font-weight:450">${tag}</small><button class="x" data-act="ds-rm" data-i="${i}" style="width:22px;height:22px;font-size:11px;margin-left:2px" aria-label="Quitar">\u2715</button></span>`;
    }).join("")}${unknown.map((u) => `<span class="chip" style="border-style:dashed;color:var(--muted)">\xBF${esc(u)}?</span>`).join("")}</div>
    ${unknown.length ? '<div class="muted" style="font-size:12px;margin-top:8px">Lo que tiene \u201C\xBF?\u201D no lo reconoc\xED: sumalo despu\xE9s con \u201CBuscar m\xE1s\u2026\u201D.</div>' : ""}
    ${ignored.length ? '<div class="muted" style="font-size:12px;margin-top:6px">Bebidas sin calor\xEDas: las dej\xE9 afuera.</div>' : ""}`;
    const meas = measuredIdx().length;
    const b = $("#ds-photo-btn");
    b.disabled = !meas;
    b.title = meas ? "" : "Todo tiene cantidad: no hace falta foto";
  }
  function drawPhotoStep() {
    const box = $("#ds");
    if (!measuredIdx().length) {
      DS.stage = "text";
      return drawDescribe();
    }
    if (!DS.portion) {
      box.innerHTML = `<button class="link" data-act="ds-back" style="margin:-4px 0 8px">\u2039 Texto</button>
      <label class="photo-drop"><input type="file" accept="image/*" data-in="ph-file" hidden>${ICON.camera}<b>Sac\xE1 o eleg\xED una foto del plato</b><small>Mejor desde arriba y con el plato entero a la vista</small></label>`;
      return;
    }
    box.innerHTML = `<button class="link" data-act="ds-back" style="margin:-4px 0 8px">\u2039 Texto</button>
    <div class="cv-wrap"><canvas id="ph-cv"></canvas></div>
    <div class="segmented" style="margin:10px 0"><button data-act="ph-stage" data-v="plate" class="${DS.pstage === "plate" ? "on" : ""}">1 \xB7 Plato</button><button data-act="ph-stage" data-v="zones" class="${DS.pstage === "zones" ? "on" : ""}">2 \xB7 Partes</button></div>
    <div id="ph-ctl"></div>
    <div class="card" id="ph-res" style="margin:12px 0 8px"></div>
    <button class="btn ghost sm" data-act="ph-newphoto">Cambiar foto</button>`;
    drawPhotoCtl();
    mountEditor();
  }
  function drawPhotoCtl() {
    const el = $("#ph-ctl");
    if (!el) return;
    if (DS.pstage === "plate") {
      el.innerHTML = `<div class="muted" style="font-size:13px;margin-bottom:10px">Arrastr\xE1 el c\xEDrculo para que calce con el borde del plato y ajust\xE1 su tama\xF1o.</div>
      <div class="ing-ctl" style="margin-bottom:8px"><div class="rng"><input type="range" min="20" max="62" step="1" value="${Math.round(DS.portion.circle.r / Math.min(DS.portion.W, DS.portion.H) * 100)}" data-in="ph-r" style="--col:var(--bordo)" aria-label="Tama\xF1o del c\xEDrculo"></div></div>
      <div class="muted" style="font-size:12px;margin:2px 0 6px;letter-spacing:.06em;text-transform:uppercase;font-weight:650">Di\xE1metro real del plato</div>
      <div class="chips" style="margin-bottom:4px">${[20, 22, 24, 26, 28, 30].map((c) => `<button class="chip ${DS.cm === c ? "on" : ""}" data-act="ph-cm" data-v="${c}">${c} cm</button>`).join("")}</div>
      <button class="btn block" style="margin-top:12px" data-act="ph-stage" data-v="zones">Siguiente: marcar las partes</button>`;
    } else {
      const idx = measuredIdx();
      el.innerHTML = `<div class="chips" style="margin-bottom:10px">${idx.map((i, k) => `<button class="chip ${DS.active === k ? "on" : ""}" data-act="ph-comp" data-k="${k}"><i class="d" style="background:${dsColor(i)}"></i>${esc(shortName(FM()[DS.parsed.items[i].fid]))}</button>`).join("")}</div>
      <div class="segmented" style="margin-bottom:10px"><button data-act="ph-tool" data-v="wand" class="${DS.tool === "wand" ? "on" : ""}">Varita</button><button data-act="ph-tool" data-v="brush" class="${DS.tool === "brush" ? "on" : ""}">Pincel</button><button data-act="ph-tool" data-v="erase" class="${DS.tool === "erase" ? "on" : ""}">Borrar</button></div>
      <div class="ihead" style="margin-bottom:0"><span class="l">${DS.tool === "wand" ? "Sensibilidad de la varita" : "Tama\xF1o del pincel"}</span></div>
      <div class="ing-ctl"><div class="rng"><input type="range" min="${DS.tool === "wand" ? 6 : 3}" max="${DS.tool === "wand" ? 45 : 30}" step="1" value="${DS.tool === "wand" ? DS.tol : DS.brush}" data-in="ph-size" style="--col:var(--bordo)"></div></div>
      <div class="muted" style="font-size:13px;margin:0 0 10px">${DS.tool === "wand" ? "Toc\xE1 una parte del plato y se rellena sola. Si se pasa, baj\xE1 la sensibilidad." : "Pint\xE1 con el dedo sobre la parte elegida."}</div>
      <div style="display:flex;gap:8px"><button class="btn sm soft" style="flex:1" data-act="ph-auto">Sugerir zonas</button><button class="btn sm ghost" data-act="ph-undo">Deshacer</button><button class="btn sm ghost" data-act="ph-clear">Limpiar</button></div>`;
    }
  }
  function mountEditor() {
    const P = DS.portion, cv = $("#ph-cv");
    if (!cv) return;
    const refresh = () => {
      P.paintOverlay(measuredIdx().map(dsColor));
      DS.counts = P.counts(measuredIdx().length);
      drawCanvas();
      paintResults();
      drawDsChips();
      dsFoot();
    };
    DS.refresh = refresh;
    const pt = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * P.W, y: (e.clientY - r.top) / r.height * P.H };
    };
    let drag = null, raf = 0;
    const later = () => {
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        refresh();
      });
    };
    cv.addEventListener("pointerdown", (e) => {
      cv.setPointerCapture(e.pointerId);
      const p = pt(e);
      drag = { sx: p.x, sy: p.y, ox: P.circle.cx, oy: P.circle.cy, moved: false };
      if (DS.pstage === "zones" && DS.tool !== "wand") {
        P.snapshot();
        P.brush(p.x, p.y, DS.brush, DS.tool === "erase" ? 0 : DS.active + 1);
        later();
      }
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const p = pt(e);
      if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 3) drag.moved = true;
      if (DS.pstage === "plate") {
        P.circle.cx = clamp(drag.ox + p.x - drag.sx, 0, P.W);
        P.circle.cy = clamp(drag.oy + p.y - drag.sy, 0, P.H);
        later();
      } else if (DS.tool !== "wand") {
        P.brush(p.x, p.y, DS.brush, DS.tool === "erase" ? 0 : DS.active + 1);
        later();
      }
    });
    const end = (e) => {
      if (!drag) return;
      const p = pt(e);
      if (DS.pstage === "zones" && DS.tool === "wand" && !drag.moved) {
        const n = P.wand(p.x, p.y, DS.active + 1, DS.tol);
        if (!n) toast("Esa zona se mezcla con el plato: us\xE1 el pincel o baj\xE1 la sensibilidad");
        else if (P.lastTol < DS.tol - 0.5) toast("Era muy grande: baj\xE9 la sensibilidad solo para esta zona");
        later();
      }
      drag = null;
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", () => {
      drag = null;
    });
    requestAnimationFrame(refresh);
  }
  function drawCanvas() {
    const cv = $("#ph-cv"), P = DS.portion;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), cssW = cv.clientWidth || 340;
    const w = Math.round(cssW * dpr), h = Math.round(cssW * P.H / P.W * dpr);
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    const ctx = cv.getContext("2d"), s = w / P.W;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(DS.img, 0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(P.overlayCanvas, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    const { cx, cy, r } = P.circle;
    ctx.save();
    ctx.fillStyle = "rgba(40,22,16,.38)";
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.arc(cx * s, cy * s, r * s, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.setLineDash([10 * dpr, 7 * dpr]);
    ctx.lineWidth = 2.5 * dpr;
    ctx.strokeStyle = "#FBF5EA";
    ctx.beginPath();
    ctx.arc(cx * s, cy * s, r * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function paintResults() {
    const el = $("#ph-res");
    if (!el) return;
    const idx = measuredIdx();
    el.innerHTML = `<h3>Porci\xF3n estimada <span class="r">plato de ${DS.cm} cm</span></h3>${idx.map((i, k) => {
      const it = DS.parsed.items[i], f = FM()[it.fid], g = dsGrams(i), frac = DS.counts ? DS.counts.c[k + 1] / DS.counts.total : 0;
      return `<div class="irow comp" style="margin-bottom:14px"><div class="ihead"><span class="l"><i class="d" style="background:${dsColor(i)};border-radius:3px"></i>${esc(shortName(f))}</span><span class="v"><b>${g.src === "foto" ? n0(g.g) : "\u2014"}</b> g \xB7 ${n0(frac * 100)}% del plato</span></div>
      <div class="track"><i style="background:${dsColor(i)};width:${clamp(frac * 100 * 1.6, 0, 100)}%"></i></div>
      <div class="chips" style="margin:6px 0 0;padding:0"><span class="muted" style="font-size:12px;align-self:center">Altura:</span>${[[0.75, "Baja"], [1, "Normal"], [1.3, "Alta"]].map(([v, l]) => `<button class="chip ${(DS.hm[i] || 1) === v ? "on" : ""}" style="height:30px;font-size:13px" data-act="ph-h" data-i="${i}" data-v="${v}">${l}</button>`).join("")}</div></div>`;
    }).join("")}<div class="muted" style="font-size:12px">Es una estimaci\xF3n: la foto no ve el espesor. Despu\xE9s pod\xE9s afinar los gramos en el plato.</div>`;
  }
  async function dsFile(file) {
    if (!file) return;
    try {
      DS.img = await loadImage2(file);
      DS.portion = new Portion2(DS.img);
      DS.hm = {};
      DS.active = 0;
      DS.pstage = "plate";
      DS.sig = measuredIdx().map((i) => DS.parsed.items[i].fid).join(",");
      drawPhotoStep();
    } catch (e) {
      toast("No pude abrir esa foto");
    }
  }
  function dsGo() {
    if (!DS.parsed.items.length) return toast("Escrib\xED qu\xE9 comiste");
    const items = DS.parsed.items.map((it, i) => [it.fid, roundG(dsGrams(i).g, FM()[it.fid])]);
    S.settings.plateCm = DS.cm;
    save();
    const meal = PLATE.meal;
    loadPlate(items, meal, "");
    toast("Plato armado: ajust\xE1 los gramos si hace falta");
  }
  var ACT = {
    describe: () => openDescribe(),
    "ds-go": dsGo,
    "ds-rm": (el) => {
      const i = +el.dataset.i;
      DS.parsed.items.splice(i, 1);
      drawDsChips();
      dsFoot();
    },
    "ds-photo": () => {
      const sig = measuredIdx().map((i) => DS.parsed.items[i].fid).join(",");
      if (DS.portion && DS.sig !== sig) {
        DS.portion.labels.fill(0);
        DS.hm = {};
        DS.active = 0;
      }
      DS.sig = sig;
      DS.stage = "photo";
      drawDescribe();
    },
    "ds-back": () => {
      DS.stage = "text";
      drawDescribe();
    },
    "ph-stage": (el) => {
      DS.pstage = el.dataset.v;
      $$('[data-act="ph-stage"]').forEach((b) => b.classList.toggle("on", b.dataset.v === DS.pstage && b.closest(".segmented")));
      drawPhotoCtl();
    },
    "ph-cm": (el) => {
      DS.cm = +el.dataset.v;
      drawPhotoCtl();
      DS.refresh();
    },
    "ph-comp": (el) => {
      DS.active = +el.dataset.k;
      drawPhotoCtl();
    },
    "ph-tool": (el) => {
      DS.tool = el.dataset.v;
      drawPhotoCtl();
    },
    "ph-auto": () => {
      const groups = measuredIdx().map((i) => GROUP_OF(DS.parsed.items[i].fid));
      if (!DS.portion.suggest(groups)) toast("No pude separar por color; marc\xE1 con la varita");
      else toast("Revis\xE1 las zonas y correg\xED con la varita");
      DS.refresh();
    },
    "ph-undo": () => {
      if (!DS.portion.undo()) toast("Nada para deshacer");
      DS.refresh();
    },
    "ph-clear": () => {
      DS.portion.clear();
      DS.refresh();
    },
    "ph-h": (el) => {
      DS.hm[+el.dataset.i] = +el.dataset.v;
      DS.refresh();
    },
    "ph-newphoto": () => {
      DS.portion = null;
      DS.img = null;
      drawPhotoStep();
    },
    tab: (el) => {
      UI.tab = el.dataset.tab;
      window.scrollTo(0, 0);
      render();
    },
    "sheet-close": () => closeSheet(),
    "goto-plate": () => {
      UI.tab = "plato";
      window.scrollTo(0, 0);
      render();
    },
    "goto-plate-meal": () => {
      const m = PK ? PK.meal : null;
      closeSheet(true);
      if (m) PLATE.meal = m;
      savePlate();
      UI.tab = "plato";
      window.scrollTo(0, 0);
      render();
    },
    "goto-fit": () => {
      UI.rf = { q: "", prot: null, carb: null, meal: slotByHour(UI.date), fav: false, mine: false, fit: true, limit: 50 };
      UI.tab = "recetas";
      window.scrollTo(0, 0);
      render();
    },
    // fecha
    "date-prev": () => {
      UI.date = addDays(UI.date, -1);
      render();
    },
    "date-next": () => {
      if (UI.date < todayISO()) {
        UI.date = addDays(UI.date, 1);
        render();
      }
    },
    "date-today": () => {
      UI.date = todayISO();
      render();
    },
    // hoy
    "add-meal": (el) => openPicker({ mode: "diary", meal: el.dataset.meal }),
    "opt-meal": (el) => {
      S.showOpt[el.dataset.meal] = true;
      save();
      render();
    },
    entry: (el) => openEntry(el.dataset.id),
    water: (el) => {
      addWater(UI.date, +el.dataset.ml);
      render();
    },
    "supp-open": () => {
      UI.supOpen = !UI.supOpen;
      render();
    },
    supp: (el) => {
      toggleSupp(UI.date, el.dataset.id);
      render();
    },
    allowed: () => {
      const a = allowedOf(UI.date);
      setAllowed(UI.date, !a.used);
      render();
      toast(a.used ? "Permitido disponible" : "Permitido usado, disfrutalo");
    },
    targets: () => openTargets(),
    "targets-save": saveTargets,
    "open-recipe": (el, ev) => {
      if (ev.target.closest('[data-act="sug-add"]')) return;
      openRecipe(el.dataset.id, { mult: +el.dataset.mult || 1, meal: el.dataset.meal });
    },
    "sug-add": (el) => {
      const r = getRecipe(el.dataset.id), mult = +el.dataset.mult || 1;
      addEntry(UI.date, recipeEntry(r, mult, el.dataset.meal));
      pushRecent("recipe", r.id);
      render();
      toast(`Agregado a ${mealName(el.dataset.meal)}`);
    },
    // plato
    "plate-meal": (el) => {
      PLATE.meal = el.dataset.meal;
      savePlate();
      render();
    },
    "plate-tpl": (el) => {
      PLATE.items = TPL[+el.dataset.i].items.map(([f, g]) => mkItem(f, g));
      PLATE.editing = null;
      PLATE.name = "";
      savePlate();
      render();
      paintPlate(true);
    },
    "plate-pg": (el) => {
      UI.pg = el.dataset.g;
      render();
    },
    "plate-food": (el) => {
      const fid = el.dataset.fid, ex = PLATE.items.find((i) => i.fid === fid);
      if (ex) {
        PLATE.items = PLATE.items.filter((i) => i !== ex);
        savePlate();
        render();
        paintPlate(true);
      } else plateAddFood(fid);
    },
    "plate-more": () => openPicker({ mode: "plate" }),
    "plate-rm": (el) => {
      PLATE.items = PLATE.items.filter((i) => i.u !== el.dataset.uid);
      savePlate();
      render();
      paintPlate(true);
    },
    "plate-step": (el) => {
      const it = PLATE.items.find((i) => i.u === el.dataset.uid), f = FM()[it.fid], cfg = rangeCfg(f);
      it.g = clamp(it.g + +el.dataset.d, cfg.min, cfg.max);
      savePlate();
      paintPlate(true);
    },
    seg: (el) => {
      const row = $(`.ing[data-uid="${el.dataset.uid}"]`);
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        row.classList.remove("pulse");
        void row.offsetWidth;
        row.classList.add("pulse");
      }
    },
    "plate-clear": () => {
      PLATE.items = [];
      PLATE.editing = null;
      PLATE.name = "";
      savePlate();
      render();
    },
    "plate-fit": () => {
      const sh = shareForMeal(UI.date, PLATE.meal);
      if (sh.k < 120) return toast("Ya cubriste casi todo tu d\xEDa");
      const fixed = PLATE.items.filter((i) => ["veg", "fat"].includes(plateGroup(FM()[i.fid] || { cat: "extra" })));
      const scal = PLATE.items.filter((i) => !fixed.includes(i));
      const fk = sumItems(fixed).k, sk = sumItems(scal).k;
      if (!sk) return toast("Sum\xE1 una prote\xEDna o un hidrato primero");
      const f = clamp((sh.k - fk) / sk, 0.4, 2.2);
      scal.forEach((i) => {
        const cfg = rangeCfg(FM()[i.fid]);
        i.g = clamp(Math.round(i.g * f / cfg.step) * cfg.step, cfg.step, cfg.max);
      });
      savePlate();
      paintPlate(true);
      toast(`Ajustado a ~${n0(sh.k)} kcal para ${mealName(PLATE.meal).toLowerCase()}`);
    },
    "plate-commit": commitPlate,
    "plate-save": openSaveRecipe,
    "sr-save": saveRecipeFromPlate,
    // recetas
    "rf-fit": () => {
      UI.rf.fit = !UI.rf.fit;
      render();
    },
    "rf-fav": () => {
      UI.rf.fav = !UI.rf.fav;
      render();
    },
    "rf-mine": () => {
      UI.rf.mine = !UI.rf.mine;
      render();
    },
    "rf-prot": (el) => {
      UI.rf.prot = UI.rf.prot === el.dataset.v ? null : el.dataset.v;
      UI.rf.limit = 50;
      render();
    },
    "rf-carb": (el) => {
      UI.rf.carb = UI.rf.carb === el.dataset.v ? null : el.dataset.v;
      UI.rf.limit = 50;
      render();
    },
    "rf-meal": (el) => {
      UI.rf.meal = UI.rf.meal === el.dataset.v ? null : el.dataset.v;
      UI.rf.limit = 50;
      render();
    },
    "rf-more": () => {
      UI.rf.limit += 50;
      render();
    },
    "rc-step": (el) => {
      RC.mult = clamp(RC.mult + +el.dataset.d, 0.25, 3);
      paintRecipe(false);
    },
    "rc-oil": () => {
      RC.oil = !RC.oil;
      paintRecipe(false);
    },
    "rc-meal": (el) => {
      RC.meal = el.dataset.meal;
      $$('[data-act="rc-meal"]', sheetEl()).forEach((b) => b.classList.toggle("on", b.dataset.meal === RC.meal));
    },
    "rc-fav": () => {
      const i = S.favRecipes.indexOf(RC.r.id);
      if (i >= 0) S.favRecipes.splice(i, 1);
      else S.favRecipes.push(RC.r.id);
      save();
      paintRecipe(false);
      if (UI.tab === "recetas") render();
    },
    "rc-add": () => {
      const e = recipeEntry(RC.r, RC.mult, RC.meal);
      if (RC.oil) {
        const o = FM().aceite_oliva, pg = foodPer(o);
        e.per = { k: e.per.k + pg.k * 13 / RC.mult, p: e.per.p, c: e.per.c, f: e.per.f + pg.f * 13 / RC.mult };
        e.items.push({ fid: "aceite_oliva", g: 13 / RC.mult });
      }
      addEntry(RC.date, e);
      pushRecent("recipe", RC.r.id);
      closeSheet();
      render();
      toast(`Agregado a ${mealName(RC.meal)}`);
    },
    "rc-plate": () => loadPlate(rcItems().map(([f, g]) => [f, Math.round(g)]), RC.meal, RC.r.name),
    "rc-delete": () => {
      S.customRecipes = S.customRecipes.filter((r) => r.id !== RC.r.id);
      S.favRecipes = S.favRecipes.filter((i) => i !== RC.r.id);
      save();
      closeSheet();
      render();
      toast("Receta eliminada");
    },
    // picker
    "pk-tab": (el) => {
      PK.tab = el.dataset.tab;
      PK.q = "";
      drawPicker();
    },
    "pk-pick": (el) => {
      if (el.dataset.type === "recipe") {
        const m = PK.meal, d = PK.date;
        PK.back = true;
        openRecipe(el.dataset.id, { meal: m });
        RC.date = d;
        return;
      }
      if (PK.mode === "plate") {
        closeSheet();
        plateAddFood(el.dataset.id);
        toast("Sumado al plato");
        return;
      }
      openFoodDetail(el.dataset.id);
    },
    "pk-back": () => {
      openPicker({ mode: PK.mode, meal: PK.meal, date: PK.date });
    },
    "quick-add": () => {
      const v = (id) => parseFloat($(id).value) || 0, p = v("#q-p"), c = v("#q-c"), f = v("#q-f"), k = v("#q-k") || p * 4 + c * 4 + f * 9;
      if (!k) return toast("Carg\xE1 calor\xEDas o macros");
      addEntry(PK.date, { m: PK.meal, name: $("#q-n").value.trim() || "Comida r\xE1pida", qty: 1, unit: "porci\xF3n", step: 0.5, min: 0.5, max: 4, per: { k, p, c, f }, src: { t: "quick" } });
      closeSheet();
      render();
      toast(`Agregado a ${mealName(PK.meal)}`);
    },
    // detalle alimento
    "fd-mode": (el) => {
      FD.unit = el.dataset.v === "u";
      fdConfigure();
    },
    "fd-step": (el) => {
      const r = $("#fd-r"), st = +r.step;
      FD.q = clamp(FD.q + +el.dataset.d * (FD.unit ? st : st), +r.min, +r.max);
      paintFood();
    },
    "fd-meal": (el) => {
      FD.meal = el.dataset.meal;
      $$('[data-act="fd-meal"]', sheetEl()).forEach((b) => b.classList.toggle("on", b.dataset.meal === FD.meal));
    },
    "fd-add": () => {
      const { f, pg } = FD, per = FD.unit ? f.u.g : 1;
      const cfg = rangeCfg(f);
      addEntry(FD.date, {
        m: FD.meal,
        name: fname(f),
        qty: FD.q,
        unit: FD.unit ? f.u.n : "g",
        step: FD.unit ? f.u.step : cfg.step,
        min: 0,
        max: FD.unit ? 8 : cfg.max,
        per: { k: pg.k * per, p: pg.p * per, c: pg.c * per, f: pg.f * per },
        src: { t: "food", id: f.id }
      });
      pushRecent("food", f.id);
      closeSheet();
      render();
      toast(`Agregado a ${mealName(FD.meal)}`);
    },
    // editar entrada
    "ed-step": (el) => {
      const e = findEntry(ED.date, ED.id), r = $("#ed-r");
      ED.qty = clamp(ED.qty + +el.dataset.d * +r.step, +r.min, +r.max);
      paintEntry();
    },
    "ed-meal": (el) => {
      ED.meal = el.dataset.meal;
      $$('[data-act="ed-meal"]', sheetEl()).forEach((b) => b.classList.toggle("on", b.dataset.meal === ED.meal));
    },
    "ed-save": () => {
      const e = findEntry(ED.date, ED.id);
      e.qty = ED.qty;
      e.m = ED.meal;
      save();
      closeSheet();
      render();
    },
    "ed-delete": () => {
      removeEntry(ED.date, ED.id);
      closeSheet();
      render();
      toast("Eliminado");
    },
    "ed-plate": () => {
      const e = findEntry(ED.date, ED.id);
      loadPlate(e.items.map((i) => [i.fid, Math.max(1, Math.round(i.g * ED.qty))]), ED.meal, e.name, { id: e.id });
    },
    // formularios
    "food-form": (el) => {
      formFromPicker = !!(el.closest("#pk-list") && PK);
      openFoodForm();
    },
    "nf-gl": (el) => el.classList.toggle("on"),
    "nf-la": (el) => el.classList.toggle("on"),
    "nf-save": saveFood,
    "del-food": (el) => {
      S.customFoods = S.customFoods.filter((f) => f.id !== el.dataset.id);
      dropFoodCache();
      save();
      openMyFoods();
    },
    "del-recipe": (el) => {
      S.customRecipes = S.customRecipes.filter((r) => r.id !== el.dataset.id);
      save();
      openMyRecipes();
    },
    // progreso / ajustes
    "weight-save": () => {
      const v = parseFloat($("#w-kg").value);
      if (!(v > 20 && v < 300)) return toast("Ingres\xE1 un peso v\xE1lido");
      addWeight(todayISO(), v);
      render();
      toast("Peso guardado");
    },
    "set-toggle": (el) => {
      S.settings[el.dataset.k] = !S.settings[el.dataset.k];
      save();
      render();
    },
    "set-carb": (el) => {
      S.settings.carbState = el.dataset.v;
      save();
      render();
      toast(`Pesos en ${el.dataset.v === "cocido" ? "cocido" : "crudo"}`);
    },
    "plan-info": openPlanInfo,
    "my-foods": openMyFoods,
    "my-recipes": openMyRecipes,
    backup: openBackup,
    "bk-copy": async () => {
      try {
        await navigator.clipboard.writeText(window.__bk);
        toast("Respaldo copiado");
      } catch (e) {
        toast("No se pudo copiar");
      }
    },
    "bk-share": async () => {
      const file = new File([window.__bk], `plato-respaldo-${todayISO()}.json`, { type: "application/json" });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: "Respaldo Plato" });
        else {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(file);
          a.download = file.name;
          a.click();
        }
      } catch (e) {
      }
    },
    "bk-restore": () => {
      try {
        const d = JSON.parse($("#bk-text").value);
        if (!d || !d.settings) throw new Error("x");
        replaceState(d);
        toast("Datos restaurados");
        setTimeout(() => location.reload(), 600);
      } catch (e) {
        toast("El texto no es un respaldo v\xE1lido");
      }
    },
    reset: () => {
      openSheet({ title: "\xBFBorrar todo?", body: '<p style="margin:0;font-size:15px">Se elimina el diario, tus recetas, alimentos y pesos de este dispositivo. No se puede deshacer.</p>', foot: '<button class="btn ghost" data-act="sheet-close">Cancelar</button><button class="btn danger" data-act="reset-ok">Borrar</button>' });
    },
    "reset-ok": () => {
      resetState();
      location.reload();
    }
  };
  var INP = {
    "ds-text": (el) => {
      DS.text = el.value;
      clearTimeout(INP._d);
      INP._d = setTimeout(() => {
        reparse();
        drawDsChips();
        dsFoot();
      }, 140);
    },
    "ph-file": (el) => dsFile(el.files && el.files[0]),
    "ph-r": (el) => {
      const P = DS.portion;
      P.circle.r = +el.value / 100 * Math.min(P.W, P.H);
      DS.refresh();
    },
    "ph-size": (el) => {
      if (DS.tool === "wand") DS.tol = +el.value;
      else DS.brush = +el.value;
    },
    "rf-q": (el) => {
      UI.rf.q = el.value;
      UI.rf.limit = 50;
      clearTimeout(INP._t);
      INP._t = setTimeout(() => {
        const pos = el.selectionStart;
        render();
        const n = $('input[data-in="rf-q"]');
        n.focus();
        n.setSelectionRange(pos, pos);
      }, 220);
    },
    "pk-q": (el) => {
      PK.q = el.value;
      drawPickerList();
    },
    "plate-g": (el) => {
      const it = PLATE.items.find((i) => i.u === el.dataset.uid);
      if (!it) return;
      it.g = +el.value;
      savePlate();
      paintPlate(false);
    },
    "rc-mult": (el) => {
      RC.mult = +el.value;
      paintRecipe(false);
    },
    "fd-r": (el) => {
      FD.q = +el.value;
      paintFood();
    },
    "ed-r": (el) => {
      ED.qty = +el.value;
      paintEntry();
    },
    "t-in": () => paintTargets(),
    "q-in": () => paintQuick(),
    prof: (el) => {
      const k = el.dataset.k;
      S.settings[k] = el.type === "number" ? parseFloat(el.value) || 0 : el.value;
      save();
    }
  };
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const fn = ACT[el.dataset.act];
    if (fn) fn(el, e);
  });
  document.addEventListener("change", (e) => {
    const el = e.target.closest('[data-in="ph-file"]');
    if (el) INP["ph-file"](el);
  });
  document.addEventListener("input", (e) => {
    const el = e.target.closest("[data-in]");
    if (el && INP[el.dataset.in]) INP[el.dataset.in](el, e);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && UI._today !== todayISO()) {
      if (UI.date === UI._today) UI.date = todayISO();
      UI._today = todayISO();
      if (!sheetEl()) render();
    }
  });
  UI._today = todayISO();
  render();
  window.__booted = true;
  if (!S.settings.onboarded && !targets().isSet) setTimeout(() => {
    if (!sheetEl()) openTargets();
  }, 450);
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) {
  }
})();
