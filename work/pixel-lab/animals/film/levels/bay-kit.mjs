// Shared helpers for LV7 bay, LV8 savanna and LV9 jungle: masked offscreen layers (static scenery drawn once, then
// copied row by row into the frame), cached sprites (an animal part rendered once per pose key and blitted at any
// offset), a "tinted view" of a canvas (everything drawn through it is recoloured, e.g. seen through water) and small
// pixel helpers. Pure functions of their inputs: the caches only memoise.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;

/** Offscreen canvas with a coverage mask. Draw on `.g` (any cute.mjs / raster call), then blit with `.blit`. */
export class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m, base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    c._mask = m; this.g = c;
  }
  /** Copy the covered pixels with the layer's top-left at screen (sx, sy). o.a dissolves, o.x0/o.x1 clip columns,
   *  o.below + o.tint + o.k(y) recolour rows below a screen line (water), o.flip mirrors horizontally. */
  blit(c, sx, sy, o = {}) {
    sx = R(sx); sy = R(sy);
    const W = this.w, H = this.h, s = this.c.d, m = this.m, d = c.d, CW = c.w, a = o.a ?? 1, dm = c._mask;
    if (a <= 0) return;
    const xa = Math.max(o.x0 ?? 0, sx, 0), xb = Math.min(o.x1 ?? CW, sx + W, CW), ya = Math.max(0, sy, o.y0 ?? 0), yb = Math.min(c.h, sy + H, o.y1 ?? c.h);
    const below = o.below ?? 1e9, tint = o.tint ? hex(o.tint) : null, kf = o.k, flip = o.flip;
    for (let y = ya; y < yb; y++) {
      const row = (y - sy) * W, wet = tint && y > below ? kf(y) : 0;
      for (let x = xa; x < xb; x++) {
        const lx = flip ? W - 1 - (x - sx) : x - sx, li = row + lx; if (!m[li]) continue;
        if (a < 1 && a <= bayer(x, y)) continue;
        const q = li * 3, p = (y * CW + x) * 3;
        if (wet > 0) { d[p] = s[q] + (tint[0] - s[q]) * wet; d[p + 1] = s[q + 1] + (tint[1] - s[q + 1]) * wet; d[p + 2] = s[q + 2] + (tint[2] - s[q + 2]) * wet; }
        else { d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2]; }
        if (dm) dm[y * CW + x] = 1;
      }
    }
  }
}

/** World-anchored static layer covering world x wx0..wx0+w, y wy0..wy0+h; `paint(g, L, T)` draws with L(wx)/T(wy). */
export function worldLayer(wx0, wy0, w, h, paint) {
  const L = new Layer(w, h); paint(L.g, (wx) => wx - wx0, (wy) => wy - wy0, L);
  return { layer: L, wx0, wy0, blit(c, V, o) { L.blit(c, V.X(wx0), V.Y(wy0), o); } };
}

/** Memoised sprite: key → { layer, ox, oy } where (ox, oy) is the anchor inside the layer. Small LRU. */
export function spriteCache(max = 48) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new Layer(w, h); paint(L.g, ox, oy); s = { layer: L, ox, oy, blit(c, x, y, o) { L.blit(c, x - (o?.flip ? w - 1 - ox : ox), y - oy, o); } };
    map.set(key, s); if (map.size > max) map.delete(map.keys().next().value);
    return s;
  };
}

/** A view of canvas c that recolours every pixel drawn through it: f(x, y, rgb) → rgb (or the original colour). */
export function tinted(c, f) {
  const o = Object.create(c);
  o.px = (x, y, col) => { if (!col) return; c.px(x, y, f(Math.floor(x), Math.floor(y), hex(col))); };
  return o;
}
/** Underwater look below screen row `sy`: mix toward `col` by k (deeper → more). */
export function underwater(c, sy, col = "#2AA8C0", k0 = 0.42, k1 = 0.62, depth = 260) {
  const W = hex(col);
  return tinted(c, (x, y, p) => { if (y <= sy) return p; const k = k0 + (k1 - k0) * Math.min(1, (y - sy) / depth); return [p[0] + (W[0] - p[0]) * k, p[1] + (W[1] - p[1]) * k, p[2] + (W[2] - p[2]) * k].map(R); });
}

/** Rotate + translate points: local [x, y] → screen, about the local origin, then offset by (ox, oy), scaled by s. */
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

/** Dithered ellipse fill (k = coverage 0..1). */
export function ditherEll(g, cx, cy, rx, ry, col, k = 0.5) {
  for (let y = R(cy - ry); y <= R(cy + ry); y++) for (let x = R(cx - rx); x <= R(cx + rx); x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d <= 1 && k * (1 - d * 0.6) > bayer(x, y)) g.px(x, y, col); }
}

/** Smooth piecewise profile y(x) through [x, y] keys (cosine-eased between keys). */
export function profile(keys) {
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [a, ya] = keys[i], [b, yb] = keys[i + 1]; if (x <= b) { const k = (x - a) / (b - a), e = (1 - Math.cos(Math.PI * k)) / 2; return ya + (yb - ya) * e; } }
    return keys[keys.length - 1][1];
  };
}

/** Gaze keyframes: [[t0, [x, y]], [t1, [x, y]], …] → the look at time t, easing over `dur` seconds after each key. */
export function gaze(t, keys, dur = 0.2) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [tk, v] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / dur), e = k * k * (3 - 2 * k); cur = [cur[0] + (v[0] - cur[0]) * e, cur[1] + (v[1] - cur[1]) * e]; }
  return cur;
}
export { hex, mix, bayer };
