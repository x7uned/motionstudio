// «The last person alive» — Builder W: tree rasters shared by the town edge and the clearing.
// pineRaster draws a conifer straight in pixels (so it stays crisp at any zoom it is built for): stacked saw-tooth tiers
// with clumpy edges and scalloped undersides, a straight trunk, bare at the bottom. Codes per pixel:
//   0 empty · 1 needles · 2 needles, lit upper-left surface / rim · 3 needles, shadow under a tier · 6 needles, dark clump
//   4 trunk · 5 trunk, lit (left) edge
import { rnd, clamp01, lerp } from "./layout.mjs";
import { vnoise } from "./W-util.mjs";

export const PINE = { EMPTY: 0, NEEDLE: 1, LIT: 2, SHADOW: 3, TRUNK: 4, TRUNK_LIT: 5, CLUMP: 6 };

/** A pine H px tall and W px wide (widest tier). bare: share of the height that is bare trunk at the bottom. */
export function pineRaster(seed, H, W, bare = 0.25, e = 1) {
  H = Math.max(10, Math.round(H)); W = Math.max(6, Math.round(W));
  const w = W + 8, h = H + 2, ax = Math.floor(w / 2), c = new Uint8Array(w * h), tier = new Uint8Array(w * h);
  const set = (x, y, v, ti) => { if (x >= 0 && y >= 0 && x < w && y < h) { c[y * w + x] = v; tier[y * w + x] = ti; } };
  const get = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? c[y * w + x] : 0);
  const tw = Math.max(e, Math.round(W * 0.055 + 0.4 * e)), lean = (rnd(seed * 3 + 1) - 0.5) * 0.03;
  const trunkX = (y) => ax + Math.round((h - y) * lean);
  for (let y = Math.round(H * 0.05); y < h; y++) { const x0 = trunkX(y); for (let x = -tw; x < tw; x++) set(x0 + x, y, x < -tw + e ? 5 : 4, 0); }
  // tiers, drawn bottom-up so every tier's skirt hangs over the one below
  const crownBot = Math.round(H * (1 - bare)), top = 1;
  const n = Math.max(3, Math.min(11, Math.round((crownBot - top) / Math.max(6 * e, W * 0.42))));
  const wts = []; for (let i = 0; i < n; i++) wts.push(0.7 + 0.6 * (i / Math.max(1, n - 1)) + 0.2 * rnd(seed * 11 + i));
  const sum = wts.reduce((a, b) => a + b, 0); const ys = [top]; for (let i = 0; i < n; i++) ys.push(ys[i] + (wts[i] / sum) * (crownBot - top));
  for (let i = n - 1; i >= 0; i--) {
    const yt = Math.round(ys[i]), yb = Math.round(ys[i + 1] + (ys[i + 1] - ys[i]) * 0.3), k = (i + 1) / n;
    const Wi = (W / 2) * (0.2 + 0.8 * Math.pow(k, 0.85)) * (0.9 + 0.2 * rnd(seed * 17 + i)), Wt = i === 0 ? 0.6 : Wi * 0.2;
    const asym = (rnd(seed * 19 + i) - 0.5) * 0.2, clumpW = Math.max(3, Wi * (0.4 + 0.14 * rnd(seed * 23 + i))), ph = rnd(seed * 29 + i) * 6.28;
    for (let y = yt; y <= yb; y++) {
      const u = (y - yt) / Math.max(1, yb - yt), base = Wt + (Wi - Wt) * Math.pow(u, 1.2), x0 = trunkX(y);
      for (const s of [-1, 1]) {
        const wob = Math.round((vnoise(y / (3.5 * e) + s * 10, seed + i * 3) - 0.5) * 2.4 * e), ext = base * (1 + s * asym) + wob;
        for (let x = 0; x <= ext; x++) {
          const gap = Math.pow(0.5 + 0.5 * Math.cos((2 * Math.PI * x) / clumpW + ph + s), 2.2), bottomU = 1 - 0.22 * gap * Math.min(1, x / (clumpW * 0.6));
          if (u > bottomU) continue;
          set(x0 + s * x, y, 1, i + 1);
        }
      }
    }
  }
  for (let y = 0; y < top + 2; y++) set(trunkX(y), y, 1, 1);
  // shading: shadow under each skirt, lit edges facing the upper left, darker clumps on the right
  const out = c.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (c[i] !== 1) continue;
    const ti = tier[i], above = (dy) => (y - dy >= 0 ? tier[(y - dy) * w + x] : 0), side = (x - ax) / (W / 2);
    let L = false, U = false, Rr = false, sh = false;
    for (let k = 1; k <= e; k++) { if (get(x - k, y) === 0) L = true; if (get(x, y - k) === 0) U = true; if (get(x + k, y) === 0) Rr = true; }
    for (let k = 1; k <= 2 * e; k++) { const a = above(k); if (a && a < ti && (k <= e || get(x, y - k) === 1)) sh = true; }
    if (L || (U && side < 0.25)) out[i] = 2;
    else if (sh) out[i] = 3;
    else if (Rr) out[i] = 3;
    else if (side > 0.35 && vnoise((x / e) * 0.4 + seed, (y / e) * 0.4) > 0.45) out[i] = 6;
    else if (side < -0.3 && get(x - 2 * e, y) === 0) out[i] = 2;
  }
  return { w, h, ax, ay: h - 1, c: out };
}

/** A bare dead tree: branch segments [x0, y0, x1, y1, w] in world units (base at 0, 0). */
export function deadTree(seed, H) {
  const segs = []; const grow = (x, y, a, len, w, d) => {
    if (d > 4 || len < 4) return;
    const x1 = x + Math.sin(a) * len, y1 = y - Math.cos(a) * len; segs.push([x, y, x1, y1, w]);
    const n = d === 0 ? 3 : 2;
    for (let i = 0; i < n; i++) grow(x1, y1, a + (rnd(seed * 31 + d * 7 + i) - 0.5) * 1.6 + (i - (n - 1) / 2) * 0.5, len * (0.55 + 0.25 * rnd(seed * 13 + d + i * 3)), w * 0.62, d + 1);
  };
  grow(0, 0, (rnd(seed) - 0.5) * 0.15, H * 0.48, Math.max(2, H * 0.035), 0);
  return segs;
}

/**
 * A spruce as a code raster (same codes as pineRaster), built from needle clumps on drooping branch whorls — the same
 * construction as clearing-tex.mjs texSpruce, for strips drawn at a fixed zoom. u: pixels per world unit.
 * H, W in world units. Codes: 1 needles · 2 lit (upper-left of each clump) · 3 shadow (under each clump) · 4 trunk · 5 trunk lit · 6 bare branch.
 */
export function spruceRaster(seed, H, W, bare, u) {
  const w = Math.ceil(W * u) + 12, h = Math.ceil(H * u * 1.06) + 4, ax = Math.floor(w / 2), ay = h - 2, c = new Uint8Array(w * h);
  const put = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) c[y * w + x] = v; };
  const X = (wx) => ax + wx * u, Y = (wy) => ay + wy * u;
  const tw = Math.max(1, W * 0.045 * u), crownBot = -H * bare, crownTop = -H;
  for (let y = Math.floor(Y(crownTop * 0.96)); y <= ay; y++) for (let d = -tw; d <= tw; d++) put(ax + d, y, d < -tw + Math.max(1, u * 0.8) ? 5 : 4);
  const whorls = []; for (let y = crownBot; y > crownTop + 6; y -= (16 + rnd(seed * 3 + whorls.length) * 8) * (0.6 + 0.4 * (y - crownTop) / (crownBot - crownTop + 1e-6))) whorls.push(y);
  const clump = (cx, cy, rx, ry) => {
    const ci = X(cx), cj = Y(cy), RX = rx * u, RY = ry * u;
    for (let j = Math.floor(cj - RY); j <= Math.ceil(cj + RY); j++) for (let i = Math.floor(ci - RX); i <= Math.ceil(ci + RX); i++) {
      const dx = (i - ci) / RX, dy = (j - cj) / RY, wob = (vnoise(i / (u * 2.2) + seed, j / (u * 2.2)) - 0.5) * 0.5;
      if (dx * dx + dy * dy > 1 + wob) continue;
      const lit = -0.45 * dx - 0.85 * dy + wob * 0.6; put(i, j, lit > 0.62 ? 2 : lit < -0.35 ? 3 : 1);
    }
  };
  for (let k = 0; k < whorls.length; k++) {
    const y = whorls[k], kk = Math.pow((y - crownTop) / (crownBot - crownTop + 1e-6), 0.85), hw = (W / 2) * (0.1 + 0.9 * kk) * (0.82 + 0.3 * rnd(seed * 7 + k));
    for (const side of [-1, 1]) {
      const L = hw * (0.85 + 0.3 * rnd(seed * 11 + k * 2 + (side > 0 ? 1 : 0))), n = Math.max(2, Math.round(L / 4.2)), droop = 0.3 + 0.2 * rnd(seed * 17 + k);
      for (let s = 0; s <= 1; s += 1 / Math.max(4, L * u)) put(X(side * s * L), Y(y + s * s * L * droop + 1), 6);
      for (let ci = n; ci >= 0; ci--) {
        const s = ci / n, cx = side * s * L + (rnd(seed * 19 + k * 5 + ci) - 0.5) * 2, cy = y + s * s * L * droop + 1.5 + (rnd(seed * 23 + k + ci) - 0.5) * 2;
        const rx = (4 + 5.5 * (1 - s)) * (0.8 + 0.4 * rnd(seed * 13 + k * 7 + ci)) * (0.55 + 0.45 * Math.min(1, W / 110)), ry = rx * (0.7 + 0.15 * rnd(seed + ci));
        clump(cx, cy, rx, ry);
      }
    }
  }
  for (let k = 0; k < 4; k++) clump(0, crownTop + k * 3.5, 1.2 + k * 0.7, 2 + k * 0.4);
  return { w, h, ax, ay, c };
}
