// Shared helpers of LV1 ocean (levels/ocean.mjs) and LV2 savanna (levels/savanna.mjs) of «Which animal kills the most
// people?»: masked offscreen layers and sprites (with an underwater look and a horizontal squash for turns), world-
// anchored static layers, small drawing helpers, and the far coast / far plain both levels share across their seam.
// Pure functions of their inputs: the caches only memoise.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";

export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- masked offscreen layer
/** Offscreen canvas with a coverage mask. Draw on `.g` (any cute.mjs / raster call), then blit. */
export class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m, base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    c.has = (x, y) => { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1; };
    c._mask = m;                                  // a Layer blitted into another Layer marks the destination mask too
    this.g = c;
  }
  /**
   * Copy covered pixels with the anchor (ox, oy) at screen (x, y).
   * o.a dissolve · o.sx horizontal scale (negative mirrors; |sx| < 1 squashes, used for turns) ·
   * o.below screen row from which the sprite is under water: those rows are pulled toward o.tint by o.k(row) and shifted
   * by o.wob(row) px · o.tint without o.below tints every row by o.kk · o.x0/o.x1/o.y0/o.y1 clip (screen).
   */
  blit(c, x, y, ox, oy, o = {}) {
    const a = o.a ?? 1; if (a <= 0) return;
    const sx = o.sx ?? 1, W = this.w, H = this.h, s = this.c.d, m = this.m, d = c.d, CW = c.w, dm = c._mask;
    const ax = Math.abs(sx); if (ax < 0.02) return;
    const left = R(x - (sx > 0 ? ox : W - ox) * ax), right = R(x + (sx > 0 ? W - ox : ox) * ax);
    const top = R(y - oy);
    const below = o.below ?? 1e9, tint = o.tint ? hex(o.tint) : null, kf = o.k, wob = o.wob, kk = o.kk ?? 0;
    const ya = Math.max(0, top, o.y0 ?? 0), yb = Math.min(c.h, top + H, o.y1 ?? c.h);
    for (let Y = ya; Y < yb; Y++) {
      const sub = Y >= below, k = sub && tint ? kf(Y) : tint && !o.below ? kk : 0, dx = sub && wob ? wob(Y) : 0, row = (Y - top) * W;
      const xa = Math.max(0, left + dx, o.x0 ?? 0), xb = Math.min(CW, right + dx + 1, o.x1 ?? CW);
      for (let X = xa; X < xb; X++) {
        const lx = Math.floor(ox + (X - dx - x + 0.5) / sx); if (lx < 0 || lx >= W) continue;
        const li = row + lx; if (!m[li]) continue;
        if (a < 1 && a <= bayer(X, Y)) continue;
        const q = li * 3, p = (Y * CW + X) * 3; let r = s[q], g = s[q + 1], b = s[q + 2];
        if (k > 0) { r += (tint[0] - r) * k; g += (tint[1] - g) * k; b += (tint[2] - b) * k; }
        d[p] = r; d[p + 1] = g; d[p + 2] = b; if (dm) dm[Y * CW + X] = 1;
      }
    }
  }
}
/** Memoised sprite: key → { layer, ox, oy, blit(c, x, y, o) } with (ox, oy) the anchor inside the layer. Small LRU. */
export function spriteCache(max = 64) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new Layer(w, h); paint(L.g, ox, oy, L);
    s = { layer: L, ox, oy, blit(c, x, y, o) { L.blit(c, x, y, ox, oy, o); } };
    map.set(key, s); if (map.size > max) map.delete(map.keys().next().value);
    return s;
  };
}
/** World-anchored static layer covering world x wx0..wx0+w, y wy0..wy0+h; paint(g, L, T) draws with L(wx)/T(wy). */
export function worldLayer(wx0, wy0, w, h, paint) {
  const Ly = new Layer(w, h); paint(Ly.g, (wx) => wx - wx0, (wy) => wy - wy0, Ly);
  return { layer: Ly, wx0, wy0, blit(c, V, o = {}) { Ly.blit(c, R(V.X(wx0)), R(V.Y(wy0)), 0, 0, o); } };
}
/** Rotate + translate: local [x, y] → screen about the local origin, then offset (ox, oy), scaled by s. */
export function xf(ox, oy, s = 1, rot = 0) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (x, y) => [ox + (x * cs - y * sn) * s, oy + (x * sn + y * cs) * s];
  P.poly = (pts) => pts.map(([x, y]) => P(x, y)); P.s = s; P.rot = rot;
  return P;
}
/** Thick pixel polyline (radius r, round caps) in one colour. */
export function thick(g, pts, r, col) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n; for (let j = -r; j <= r; j++) for (let i2 = -r; i2 <= r; i2++) if (i2 * i2 + j * j <= r * r + 0.5) g.px(R(x) + i2, R(y) + j, col); }
  }
}
/** Gaze keyframes [[t0, [x, y]], …] → look at t, easing over dur seconds after each key. */
export function gaze(t, keys, dur = 0.2) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [tk, v] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / dur), e = k * k * (3 - 2 * k); cur = [cur[0] + (v[0] - cur[0]) * e, cur[1] + (v[1] - cur[1]) * e]; }
  return cur;
}
/** Smooth profile y(x) through [x, y] keys (cosine-eased between keys). */
export function profile(keys) {
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [a, ya] = keys[i], [b, yb] = keys[i + 1]; if (x <= b) { const k = (x - a) / (b - a), e = (1 - Math.cos(Math.PI * k)) / 2; return ya + (yb - ya) * e; } }
    return keys[keys.length - 1][1];
  };
}
/** Damped overshoot ease 0 → 1 (a rise that pops a little past its target and settles). */
export function popEase(u, over = 0.12) { u = clamp01(u); if (u >= 1) return 1; const k = 1 - Math.pow(1 - u, 3); return k + over * Math.sin(Math.PI * u) * (1 - u) * 2.2; }

// ---------------------------------------------------------------- far coast / far plain shared across the ocean → savanna seam
// The sea band (the far sea surface up to the horizon) spans world y −FAR_SEA..0. A far coastal bluff rises out of it near the
// beach and becomes the savanna's far plain; both levels paint it with farLandCol so the seam at x 540 is invisible.
export const FAR_SEA = 32;
export const HZ = -112;                            // the savanna's far horizon (world y)
export const farHz = profile([[380, -FAR_SEA + 2], [446, -FAR_SEA - 1], [480, -38], [520, -50], [560, -66], [620, -90], [690, HZ + 4], [760, HZ], [900, HZ - 3], [1000, HZ + 2], [1080, HZ]]);
const FAR = ["#F2E4A6", "#ECD68E", "#E4C87A", "#DCBA68", "#D2AC5C", "#C69E52", "#BA904A", "#AE8442"];
const HAZE = "#D8E6E0";
/** How "near" the far land at world x looks: the coastal headland by the sea is distant haze, the savanna plain comes closer. */
export const farNear = (wx) => sm(wx, 560, 720);
/** Colour of the far land at world (wx, wy) (wy ≥ farHz(wx)): hazy golden plain with grass rows, a light rim on the crest. */
export function farLandCol(wx, wy) {
  const top = farHz(wx), d = wy - top, near = farNear(wx);
  if (d < 1) return mix("#F8F2D4", "#FFF8DC", near);
  const v = clamp01((wy - HZ) / (-20 - HZ)) * near + clamp01(d / 60) * 0.25 * (1 - near), s = Math.pow(v, 0.8) * (FAR.length - 1), lo = Math.floor(s), f = s - lo;
  let col = FAR[Math.min(FAR.length - 1, f > bayer(wx, wy) ? lo + 1 : lo)];
  if (d < 3) col = mix(col, "#FFF6D4", 0.35);
  const row = Math.floor(Math.pow(clamp01((wy - HZ) / (-20 - HZ)), 0.5) * 18);
  if (rnd(wx * 31 + row * 977) < 0.16 && Math.abs(wy - (HZ + Math.pow(row / 18, 2) * (-20 - HZ))) < 1 + v * 2) col = mix(col, "#FFF4B8", 0.35);
  if (rnd(wx * 7 + wy * 131) < 0.008 + v * 0.02) col = mix(col, "#7A6A2A", 0.25 + v * 0.25);
  return mix(col, HAZE, 0.42 * (1 - near) * (1 - clamp01(d / 80) * 0.4));
}

// ---------------------------------------------------------------- ground cross-section shared by the beach and the savanna
const COAST_STRATA = ["#EAD098", "#DEC088", "#D2B27A", "#E2C690", "#CCA872", "#DAB884"];
const EARTH = ["#C98A50", "#B97A44", "#D49A5E", "#A86A3A", "#C2844C", "#D8A066"];
/** Colour of the ground's cut face at world (wx, wy), gy = the ground line above it: sandy strata at the coast, warm
 *  savanna earth inland (by x ≈ 640), darkening with depth, a few pebbles. */
export function earthCol(wx, wy, gy) {
  const inland = sm(wx, 548, 640), wv = Math.sin(wx * 0.027) * 6 + Math.sin(wx * 0.13) * 2, v = (wy + wv + 400) / lerpN(14, 22, inland), band = Math.floor(v), f = v - band, i = ((band % 6) + 6) % 6;
  let col = mix(COAST_STRATA[i], EARTH[i], inland); if (f < 0.09 && bayer(wx, wy) > 0.35) col = mix(col, "#6A3A1A", 0.22 + 0.08 * inland);
  if (wy > 80) col = mix(col, "#5A2E1A", Math.min(0.42, (wy - 80) / 700));
  if (wy - gy > 5) { if (rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#FFF0D8", 0.5); else if (rnd(wx * 29 + wy * 17) < 0.006) col = mix(col, "#3A1A0E", 0.5); }
  return col;
}
const lerpN = (a, b, k) => a + (b - a) * k;

export { hex, mix, bayer };
