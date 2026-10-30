// Helpers for LV7 · jungle (snake): masked offscreen layers (static scenery drawn once, then copied row by row into the
// frame), cached sprites, a few jungle plants (pointed leaves, elephant-ear leaves, fern fronds) and small pixel helpers.
// Adapted from ../../animals/film/levels/bay-kit.mjs (same series). Pure functions of their inputs: caches only memoise.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { blob } from "../cute.mjs";

const R = Math.round;

/** Offscreen canvas with a coverage mask. Draw on `.g` (any cute.mjs / raster call), then blit with `.blit`. */
export class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m, base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    this.g = c;
  }
  /** Copy the covered pixels with the layer's top-left at screen (sx, sy). o.a dissolves, o.x0/o.x1/o.y0/o.y1 clip. */
  blit(c, sx, sy, o = {}) {
    sx = R(sx); sy = R(sy);
    const W = this.w, H = this.h, s = this.c.d, m = this.m, d = c.d, CW = c.w, a = o.a ?? 1;
    if (a <= 0) return;
    const xa = Math.max(o.x0 ?? 0, sx, 0), xb = Math.min(o.x1 ?? CW, sx + W, CW), ya = Math.max(0, sy, o.y0 ?? 0), yb = Math.min(c.h, sy + H, o.y1 ?? c.h);
    for (let y = ya; y < yb; y++) {
      const row = (y - sy) * W;
      for (let x = xa; x < xb; x++) {
        const li = row + x - sx; if (!m[li]) continue;
        if (a < 1 && a <= bayer(x, y)) continue;
        const q = li * 3, p = (y * CW + x) * 3; d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2];
      }
    }
  }
}

/** World-anchored static layer covering world x wx0..wx0+w, y wy0..wy0+h; `paint(g, L, T)` draws with L(wx)/T(wy). */
export function worldLayer(wx0, wy0, w, h, paint) {
  const L = new Layer(w, h); paint(L.g, (wx) => wx - wx0, (wy) => wy - wy0, L);
  return { layer: L, wx0, wy0, blit(c, V, o) { L.blit(c, V.X(wx0), V.Y(wy0), o); } };
}

/** Memoised sprite: key → { blit(c, x, y, o) } with (ox, oy) the anchor inside the layer. Small LRU. */
export function spriteCache(max = 64) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new Layer(w, h); paint(L.g, ox, oy); s = { layer: L, ox, oy, blit(c, x, y, o) { L.blit(c, x - ox, y - oy, o); } };
    map.set(key, s); if (map.size > max) map.delete(map.keys().next().value);
    return s;
  };
}

/** Thick pixel polyline (radius r, round caps) in one colour. */
export function thick(g, pts, r, col) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n; for (let j = -r; j <= r; j++) for (let i2 = -r; i2 <= r; i2++) if (i2 * i2 + j * j <= r * r + 0.5) g.px(R(x) + i2, R(y) + j, col); }
  }
}

/** Gaze keyframes: [[t0, [x, y]], [t1, [x, y]], …] → the look at time t, easing over `dur` seconds after each key. */
export function gaze(t, keys, dur = 0.2) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [tk, v] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / dur), e = k * k * (3 - 2 * k); cur = [cur[0] + (v[0] - cur[0]) * e, cur[1] + (v[1] - cur[1]) * e]; }
  return cur;
}

/** Ramp → a darker/hazier copy (mixed toward `col` by k), for depth layers. */
export const tintRamp = (ramp, col, k) => ramp.map((c0) => "#" + mix(c0, col, k).map((n) => n.toString(16).padStart(2, "0")).join(""));

// ---------------------------------------------------------------- plants
/** A big pointed leaf from its stalk end (x, y) along `ang`: lens shape, volume shaded, midrib and side veins. */
export function leaf(g, x, y, len, wid, ang, ramp, { vein = true, rim = null, droop = 0 } = {}) {
  const ca = Math.cos(ang), sa = Math.sin(ang), pts = [];
  const bend = (u) => droop * u * u * len;                       // the tip droops (perpendicular, toward +v)
  for (let i = 0; i <= 18; i++) { const u = i / 18; pts.push([u * len, Math.sin(Math.PI * Math.pow(u, 0.8)) * wid + bend(u)]); }
  for (let i = 18; i >= 0; i--) { const u = i / 18; pts.push([u * len, -Math.sin(Math.PI * Math.pow(u, 0.8)) * wid + bend(u)]); }
  const P = pts.map(([u, v]) => [x + u * ca - v * sa, y + u * sa + v * ca]);
  blob(g, [P], { ramp, thick: Math.max(3, wid * 0.6), base: 3.2, gain: 1.8, outline: ramp[0], litOutline: rim ?? ramp[5] });
  if (!vein) return;
  const at = (u, v) => [x + u * ca - (v + bend(u / len)) * sa, y + u * sa + (v + bend(u / len)) * ca];
  for (let u = 2; u < len - 3; u++) { const p = at(u, 0); g.px(R(p[0]), R(p[1]), ramp[2]); }
  const nv = Math.max(3, R(len / 14));
  for (let k = 1; k < nv; k++) { const u0 = (k / nv) * len * 0.9; for (let j = 1; j < wid * 0.75; j++) for (const sd of [-1, 1]) { const p = at(u0 + j * 0.7, sd * j); g.px(R(p[0]), R(p[1]), ramp[3]); } }
}

/** Elephant-ear (heart-shaped) leaf hanging from a stalk tip (x, y), pointing along `ang` (π/2 = straight down). */
export function earLeaf(g, x, y, size, ang, ramp, rim = null) {
  const ca = Math.cos(ang), sa = Math.sin(ang), pts = [];
  // heart: two round lobes at the stalk, a long pointed tip
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * 2 * Math.PI, sx = Math.sin(a), cx = Math.cos(a);
    const rr = size * (0.62 + 0.38 * Math.pow(Math.max(0, cx), 3)) * (1 - 0.32 * Math.exp(-((a - Math.PI) ** 2) * 6));
    pts.push([cx * rr * 1.05 + size * 0.42, sx * rr * 0.82]);
  }
  const P = pts.map(([u, v]) => [x + u * ca - v * sa, y + u * sa + v * ca]);
  blob(g, [P], { ramp, thick: size * 0.45, base: 3.0, gain: 2.0, outline: ramp[0], litOutline: rim ?? ramp[5] });
  const at = (u, v) => [x + u * ca - v * sa, y + u * sa + v * ca];
  for (let u = 2; u < size * 1.4; u++) { const p = at(u, 0); g.px(R(p[0]), R(p[1]), ramp[2]); }
  for (let k = 0; k < 5; k++) { const u0 = size * (0.1 + k * 0.24), L = size * (0.55 - k * 0.07); for (const sd of [-1, 1]) for (let j = 1; j < L; j++) { const p = at(u0 + j * 0.55, sd * j * 0.8); g.px(R(p[0]), R(p[1]), ramp[3]); } }
}

/** Fern clump: `n` fronds fanning up from (x, y); sway (radians) bends the tips; leaflets alternate along each frond. */
export function fern(g, x, y, n, len, sway, cols, spread = 0.4) {
  for (let f = 0; f < n; f++) {
    const m = (n - 1) / 2, ang = -Math.PI / 2 + (f - m) * spread + sway * (0.6 + 0.4 * Math.abs(f - m)), L = len * (1 - Math.abs(f - m) / (n + 1) * 0.6);
    for (let k = 0; k < L; k++) {
      const u = k / L, a2 = ang + (f - m) * 0.32 * u + sway * u, xx = R(x + Math.cos(a2) * k), yy = R(y + Math.sin(a2) * k + u * u * L * 0.35);
      g.px(xx, yy, cols[0]);
      if (k % 3 === 1 && k > 2) { const ll = Math.max(1, R((1 - u) * 5)); for (let j = 1; j <= ll; j++) { g.px(xx - j, yy + 1 - (j >> 1), j === ll ? cols[2] : cols[1]); g.px(xx + j, yy + 1 - (j >> 1), j === ll ? cols[2] : cols[1]); } }
    }
  }
}
export { hex, mix, bayer };
