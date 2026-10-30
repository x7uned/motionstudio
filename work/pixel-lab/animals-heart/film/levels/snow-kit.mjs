// Shared helpers for LV2 snow (levels/snow.mjs) and LV10 wall (levels/wall.mjs): masked offscreen layers (static
// scenery drawn once in world coordinates, copied row by row each frame), memoised sprites, clipped canvas views, a sea
// strip that matches world.mjs drawWater pixel for pixel (without its light shafts, so a narrow strip next to a sea
// column does not glow), a pixel heart icon, sleeping Z's and the "≈" glyph the MAIN font lacks. Pure functions of t.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { tod, drawWater, view } from "../world.mjs";
import { END, WORLD_W } from "../timeline.mjs";
import * as OCEAN from "./ocean.mjs";

export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const cyc = (T) => ((T % 7) + 7) % 7;
const mixHex = (a, b, k) => mix(a, b, clamp01(k));

/** Offscreen canvas with a coverage mask: draw on `.g` (any raster / cute.mjs call), blit the covered pixels. */
export class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m, base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    this.g = c;
  }
  /** Copy covered pixels with the layer's top-left at screen (sx, sy); o.a dissolves, o.y0/o.y1/o.x0/o.x1 clip. */
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
  /** Same as blit but through dst.px (so clipped / faded canvas views apply). */
  blitPx(dst, sx, sy) {
    sx = R(sx); sy = R(sy); const W = this.w, s = this.c.d, m = this.m;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < W; x++) { const li = y * W + x; if (!m[li]) continue; const q = li * 3; dst.px(sx + x, sy + y, [s[q], s[q + 1], s[q + 2]]); }
  }
  /** Is the layer pixel at local (x, y) covered? */
  has(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] === 1; }
}

/** World-anchored static layer for world x wx0..wx0+w, y wy0..wy0+h; `paint(g)` draws with WORLD coordinates. */
export function worldLayer(wx0, wy0, w, h, paint) {
  const L = new Layer(w, h), g = Object.create(L.g);
  g.px = (x, y, col) => L.g.px(x - wx0, y - wy0, col);
  g.get = (x, y) => L.g.get(x - wx0, y - wy0);
  g.has = (x, y) => L.has(Math.floor(x - wx0), Math.floor(y - wy0));
  paint(g, L);
  return { L, g, wx0, wy0, blit(c, V, o) { L.blit(c, V.X(wx0), V.Y(wy0), o); }, has: (x, y) => L.has(Math.floor(x - wx0), Math.floor(y - wy0)) };
}

/** Memoised sprite: key → layer drawn once with its anchor at (ox, oy); `.blit(c, x, y, o)` puts the anchor at (x, y). */
export function spriteCache(max = 40) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new Layer(w, h); paint(L.g, ox, oy);
    s = { L, blit(c, x, y, o) { L.blit(c, x - ox, y - oy, o); }, blitPx(c, x, y) { L.blitPx(c, x - ox, y - oy); } };
    map.set(key, s); if (map.size > max) map.delete(map.keys().next().value);
    return s;
  };
}

/** A view of canvas c that only lets pixels through where keep(x, y) is true (clip masks for holes, portraits). */
export function clipped(c, keep) { const o = Object.create(c); o.px = (x, y, col) => { if (keep(Math.floor(x), Math.floor(y))) c.px(x, y, col); }; return o; }

/** Smooth piecewise profile y(x) through [x, y] keys (cosine-eased between keys). */
export function profile(keys) {
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [a, ya] = keys[i], [b, yb] = keys[i + 1]; if (x <= b) { const k = (x - a) / (b - a), e = (1 - Math.cos(Math.PI * k)) / 2; return ya + (yb - ya) * e; } }
    return keys[keys.length - 1][1];
  };
}

/** Gaze keyframes [[t, [x, y]], …] → look vector, easing over `dur` after each key. */
export function gaze(t, keys, dur = 0.25) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [tk, v] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / dur), e = k * k * (3 - 2 * k); cur = [cur[0] + (v[0] - cur[0]) * e, cur[1] + (v[1] - cur[1]) * e]; }
  return cur;
}

// ---------------------------------------------------------------- water that matches world.mjs drawWater exactly
/** Water colours of drawWater for a time of day T0 (0..7) → [shallow, mid, deep, abyss] (rgb arrays). */
export function waterCols(T0) {
  const T = T0 > 6.5 ? 0 : T0, night = sm(T, 5, 6) * (T0 > 6.5 ? 1 - sm(T0, 6.5, 7) : 1), dusk = sm(T, 3.6, 5) * (1 - night);
  return [mixHex(mixHex("#3ACCD8", "#5A6AB0", dusk), "#24306A", night), mixHex(mixHex("#1A6EAA", "#2A3E86", dusk), "#16205A", night), hex("#0A1A3A"), hex("#06102A")];
}
/** The time of day drawWater would use for this view (or for the wrapped view `cxOverride`). */
export const waterT = (cx) => cyc(tod(cx));
/** Water body between world x0..x1 below surfaceY: same banded depth gradient and surface line as drawWater, no shafts.
 *  edge(wy) (optional) → world x where solid rock starts on the right (fills x0..edge); edgeL(wy) → rock ends on the left. */
export function seaStrip(c, V, t, x0, x1, surfaceY = 0, T0 = waterT(V.cx), edge = null, edgeL = null) {
  const sx0 = Math.max(0, R(V.X(x0))), sx1 = Math.min(c.w, R(V.X(x1))), sy0 = Math.max(0, R(V.Y(surfaceY)));
  if (sx0 >= sx1 || sy0 >= c.h) return;
  const [shallow, midc, deep, abyss] = waterCols(T0), steps = [shallow, midc, deep, abyss], d = c.d, W = c.w;
  for (let y = sy0; y < c.h; y++) {
    const wy = y - 480 + V.cy - surfaceY, v = wy < 900 ? (wy / 900) * 2 : 2 + Math.min(1, (wy - 900) / 900), lo = Math.floor(v), f = v - lo;
    const sub = f * 4, sl = Math.floor(sub), sf = sub - sl;
    const A = steps[Math.min(3, lo)], B = steps[Math.min(3, lo + 1)], ca = hex(mix(A, B, sl / 4)), cb = hex(mix(A, B, Math.min(4, sl + 1) / 4));
    const xe = edge ? Math.min(sx1, R(V.X(edge(y - 480 + V.cy)))) : sx1, xs = edgeL ? Math.max(sx0, R(V.X(edgeL(y - 480 + V.cy)))) : sx0;
    for (let x = xs; x < xe; x++) { const cc = sf > bayer(x, y) ? cb : ca, i = (y * W + x) * 3; d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; }
  }
  const xs0 = edgeL ? Math.max(sx0, R(V.X(edgeL(surfaceY)))) : sx0;
  if (sy0 > 0 && sy0 < c.h) for (let x = xs0; x < sx1; x++) { const wv = R(Math.sin((x + V.cx) * 0.09 + t * 2.2) * 1.5); c.px(x, sy0 + wv, "#E8FFFF"); c.px(x, sy0 + wv + 1, mixHex(shallow, "#FFFFFF", 0.4)); }
}
/** The view (with its tod) and the clock that levels/ocean.mjs hands to drawWater for its column drawn with view Vo.
 *  If ocean.mjs exports waterLook(Vo, t) → { V, t }, that is used (one source of truth); otherwise this copy of its
 *  current waterView / clock (2026-10-23 05:54: tod = the main camera's time of day, t → loop-wrapped → wave warp). */
export function oceanWater(Vo, t) {
  if (typeof OCEAN.waterLook === "function") return OCEAN.waterLook(Vo, t);
  const tl = ((t % END) + END) % END;
  return { V: { ...Vo, tod: Math.round(cyc(tod(Vo.cx + (Vo.wrap ? WORLD_W : 0))) * 1e6) / 1e6 }, t: (tl * 2 * Math.PI * 4) / END / 0.35 };
}
const SCR = new Canvas(540, 960, "#010203");
/** Water strip that is the ocean column's own drawWater, extended over world x0..x1 of view V: drawWater runs on a
 *  scratch canvas in the ocean's frame (Vo = the view the ocean is drawn with, shifted by dx = V.cx − Vo.cx), over a
 *  range reaching 5000 px further left so its light shafts all fall outside the strip; only the strip's columns are
 *  copied, xa(wy)..xb(wy) world (V frame) per row. Waves, dither and colours then continue the ocean's exactly. */
export function seaStripExact(c, V, Vo, t, x0, x1, xa = () => -1e9, xb = () => 1e9) {
  const sx0 = Math.max(0, R(V.X(x0))), sx1 = Math.min(c.w, R(V.X(x1))); if (sx0 >= sx1 || V.Y(0) >= c.h) return;
  const s = SCR.d; for (let i = 0; i < s.length; i += 3) { s[i] = 1; s[i + 1] = 2; s[i + 2] = 3; }
  const dx = V.cx - Vo.cx, look = oceanWater(Vo, t);
  drawWater(SCR, look.V, look.t, x0 - dx - 5000, x1 - dx, 0);
  const d = c.d, W = c.w;
  for (let y = 0; y < c.h; y++) {
    const wy = y - 480 + V.cy, a = Math.max(sx0, R(V.X(xa(wy)))), b = Math.min(sx1, R(V.X(xb(wy))));
    for (let x = a; x < b; x++) { const i = (y * W + x) * 3; if (s[i] === 1 && s[i + 1] === 2 && s[i + 2] === 3) continue; d[i] = s[i]; d[i + 1] = s[i + 1]; d[i + 2] = s[i + 2]; }
  }
}
/** Water tint (colour, amount) for things seen under the surface at world depth wy (rock faces, plants). */
export function underTint(wy, T0 = 0) {
  if (wy < 0) return null;
  const [s, m, d, a] = waterCols(T0), v = wy < 900 ? (wy / 900) * 2 : 2 + Math.min(1, (wy - 900) / 900), lo = Math.min(3, Math.floor(v)), f = v - Math.floor(v);
  const col = mix([s, m, d, a][lo], [s, m, d, a][Math.min(3, lo + 1)], lo >= 3 ? 0 : f);
  return [col, Math.min(0.62, 0.16 + wy / 1500)];
}

// ---------------------------------------------------------------- small UI-ish pixel props
/** Pixel heart of radius r centred at (x, y); col body colour, a dissolve; outlined, with a highlight. */
export function heartIcon(c, x, y, r, col = "#E83A5C", a = 1, out = "#2A0A14") {
  if (a <= 0 || r < 1) return; const g = a < 1 ? fadeView(c, a) : c;
  const ins = (X, Y) => { const u = (X + 0.5 - x) / r, v = -(Y + 0.5 - y) / r + 0.15; return (u * u + v * v - 1) ** 3 - u * u * v * v * v <= 0; };
  for (let Y = R(y - r * 1.4) - 1; Y <= R(y + r * 1.4) + 1; Y++) for (let X = R(x - r * 1.35) - 1; X <= R(x + r * 1.35) + 1; X++) {
    if (ins(X, Y)) { const u = (X - x) / r, v = (Y - y) / r; g.px(X, Y, u < -0.25 && v < -0.2 && u > -0.95 && v > -0.75 ? mix(col, "#FFFFFF", 0.45) : v > 0.35 ? mix(col, "#000000", 0.22) : col); }
    else if (ins(X - 1, Y) || ins(X + 1, Y) || ins(X, Y - 1) || ins(X, Y + 1)) g.px(X, Y, out);
  }
}
function fadeView(c, a) { const o = Object.create(c); o.px = (x, y, col) => { if (a > bayer(Math.floor(x), Math.floor(y))) c.px(x, y, col); }; return o; }

/** The "≈" sign (two pixel tildes) at (x, y), scale s, width 5·s; returns its width. */
export function approx(c, x, y, s, col) {
  const rows = ["......", ".##..#", "#..##.", "......", ".##..#", "#..##.", "......"];
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#") c.rect(x + i * s, y + j * s, s, s, col); }));
  return 6 * s;
}
export { hex, mix, bayer };
