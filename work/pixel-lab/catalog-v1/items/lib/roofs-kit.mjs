// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-heart/film/levels/roofs-kit.mjs.
// Shared helpers of the roofs / field / barn levels (both films keep an identical copy): masked offscreen layers
// (static scenery drawn once, then copied row by row into the frame, optionally colour-graded for the time of day),
// memoised sprites (an animal part rendered once per pose key, blitted at any offset with a dither dissolve),
// a time-of-day light (multiply grade + night factor) and small pixel helpers. Pure functions: caches only memoise.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const lerp = (a, b, k) => a + (b - a) * k;
// catalog-v1: copied from animals-heart/film/levels/roofs-kit.mjs; the film's time-of-day clock is not part of the catalog,
// so frameLight() needs an explicit V.tod (default 2 = day).
// Layer.blit writes through a dissolve view of the canvas and has a complementary-gate option (o.lo).
const tod = () => 2;

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };

/** Offscreen canvas with a coverage mask. Draw on `.g` (any cute.mjs / raster call), then copy with `.blit`. */
export class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m, base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    this.g = c;
  }
  has(x, y) { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] === 1; }
  /** Copy covered pixels with the layer's top-left at screen (sx, sy). o.a dissolves (Bayer), o.lut = [r, g, b] grade
   *  tables, o.x0/o.x1/o.y0/o.y1 clip, o.flip mirrors horizontally. */
  blit(c, sx, sy, o = {}) {
    sx = R(sx); sy = R(sy);
    const W = this.w, H = this.h, s = this.c.d, m = this.m, d = c.d, CW = c.w, a = o.a ?? 1;
    if (a <= 0) return;
    const xa = Math.max(o.x0 ?? 0, sx, 0), xb = Math.min(o.x1 ?? CW, sx + W, CW), ya = Math.max(o.y0 ?? 0, sy, 0), yb = Math.min(o.y1 ?? c.h, sy + H, c.h);
    if (xa >= xb || ya >= yb) return;
    const lut = o.lut, flip = o.flip, lo = o.lo ?? 0;
    // catalog-v1: a dissolve view (raster fade() / layout gate()) overrides px; blit then writes through it, so the
    // engine's enter/exit dissolve also reaches cached sprites. o.lo: draw only where the Bayer threshold ≥ lo
    // (complementary crossfade of two layers: A with { lo: k }, B with { a: k }).
    const view = Object.prototype.hasOwnProperty.call(c, "px");
    for (let y = ya; y < yb; y++) {
      const row = (y - sy) * W;
      for (let x = xa; x < xb; x++) {
        const li = row + (flip ? W - 1 - (x - sx) : x - sx); if (!m[li]) continue;
        if (a < 1 && a <= bayer(x, y)) continue;
        if (lo > 0 && bayer(x, y) < lo) continue;
        const q = li * 3, p = (y * CW + x) * 3;
        if (view) { c.px(x, y, lut ? [lut[0][s[q]], lut[1][s[q + 1]], lut[2][s[q + 2]]] : [s[q], s[q + 1], s[q + 2]]); continue; }
        if (lut) { d[p] = lut[0][s[q]]; d[p + 1] = lut[1][s[q + 1]]; d[p + 2] = lut[2][s[q + 2]]; }
        else { d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2]; }
      }
    }
  }
}

/** World-anchored static layer covering world x wx0..wx0+w, y wy0..wy0+h. `paint(g)` draws in WORLD coordinates. */
export function worldLayer(wx0, wy0, w, h, paint) {
  const L = new Layer(w, h), c = L.g, g = Object.create(c);
  g.px = (x, y, col) => c.px(x - wx0, y - wy0, col);
  g.get = (x, y) => c.get(x - wx0, y - wy0);
  g.has = (x, y) => L.has(x - wx0, y - wy0);
  paint(g, L);
  return { layer: L, wx0, wy0, w, h, blit(cv, V, o) { L.blit(cv, V.X(wx0), V.Y(wy0), o); } };
}

/** Memoised sprite: key → { layer, ox, oy, blit(c, x, y, o) } where (ox, oy) is the anchor inside the layer. LRU. */
export function spriteCache(max = 96) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new Layer(w, h), g = Object.create(L.g);
    g.px = (x, y, col) => L.g.px(x + ox, y + oy, col);         // paint in anchor-relative coordinates
    g.get = (x, y) => L.g.get(x + ox, y + oy);
    paint(g);
    s = { layer: L, ox, oy, blit(c, x, y, o) { L.blit(c, x - ox, y - oy, o); } };
    map.set(key, s); if (map.size > max) map.delete(map.keys().next().value);
    return s;
  };
}

// ---------------------------------------------------------------- time-of-day light (multiply + add grade) for cached scenery
// The same looks as the heart film's meadow / gorge levels, so neighbouring scenery shifts in step:
// tod T (cyclic 0..7): 0 dawn · 1 morning · 2 day · 3 afternoon · 4 golden · 5 dusk · 6 night; art is painted for day.
const LOOKS = [
  { mul: [0.9, 0.8, 0.86], add: [24, 8, 18] }, { mul: [1, 1, 1], add: [0, 0, 0] }, { mul: [1, 1, 1], add: [0, 0, 0] },
  { mul: [1.02, 0.97, 0.9], add: [6, 2, 0] }, { mul: [1.04, 0.86, 0.66], add: [18, 6, 0] }, { mul: [0.82, 0.58, 0.62], add: [22, 4, 16] },
  { mul: [0.34, 0.36, 0.6], add: [6, 6, 28] }, { mul: [0.9, 0.8, 0.86], add: [24, 8, 18] },
];
export function lightAt(T) {
  T = ((T % 7) + 7) % 7; const i = Math.floor(T), k = T - i, s = k * k * (3 - 2 * k), A = LOOKS[i], B = LOOKS[i + 1];
  return { mul: A.mul.map((v, j) => v + (B.mul[j] - v) * s), add: A.add.map((v, j) => v + (B.add[j] - v) * s) };
}
/** Night factor 0 (day) → 1 (deep night) by the 7-step time of day. */
export function nightAt(T) { T = ((T % 7) + 7) % 7; return T >= 6 ? 1 - sm(T, 6.3, 7) : sm(T, 4.7, 5.9); }
const lutCache = new Map();
/** Per-channel 256-entry tables for the grade (quantised so they are reused across frames). */
export function gradeLUT(L) {
  const key = [...L.mul.map((v) => Math.round(v * 200)), ...L.add.map((v) => Math.round(v))].join(",");
  let l = lutCache.get(key); if (l) return l;
  l = [0, 1, 2].map((j) => { const t = new Uint8Array(256); for (let i = 0; i < 256; i++) t[i] = Math.max(0, Math.min(255, Math.round(i * L.mul[j] + L.add[j]))); return t; });
  lutCache.set(key, l); if (lutCache.size > 400) lutCache.delete(lutCache.keys().next().value);
  return l;
}
const plainL = (L) => L.mul.every((v) => Math.abs(v - 1) < 0.004) && L.add.every((v) => Math.abs(v) < 0.5);
/** Light of the frame (by the camera x, like the sky): { T, mul (grade object for lit()), lut (null in daylight), night }. */
export function frameLight(V) {
  const T = V.tod ?? tod(V.cx), L = lightAt(T), plain = plainL(L);
  return { T, mul: L, lut: plain ? null : gradeLUT(L), night: nightAt(T) };
}
/** Blend a grade toward no grade by k (0 = unchanged grade, 1 = plain daylight colours). */
export function softer(L, k) { return { mul: L.mul.map((v) => v + (1 - v) * k), add: L.add.map((v) => v * (1 - k)) }; }
/** A view of canvas c that recolours every pixel drawn through it by the grade (for live actors). Sprite blits are not
 *  routed through px, so pass the lut to them instead. */
export function lit(c, L) {
  if (plainL(L)) return c;
  const o = Object.create(c);
  o.px = (x, y, col) => { if (!col) return; const p = hex(col); c.px(x, y, [0, 1, 2].map((j) => Math.max(0, Math.min(255, R(p[j] * L.mul[j] + L.add[j]))))); };
  return o;
}

// ---------------------------------------------------------------- small helpers
/** Rotate + translate points: local [x, y] → screen, about the local origin, then offset by (ox, oy), scaled by s. */
export function xf(ox, oy, s = 1, rot = 0, sx = 1, sy = 1) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (x, y) => [ox + (x * sx * cs - y * sy * sn) * s, oy + (x * sx * sn + y * sy * cs) * s];
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
/** Dithered ellipse fill (k = coverage 0..1, denser in the middle). */
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
/** Keyframed value: [[t, v], …] eased (smoothstep) between keys. */
export function keyed(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t <= b) { const k = (t - a) / (b - a || 1), e = k * k * (3 - 2 * k); return va + (vb - va) * e; } }
  return keys[keys.length - 1][1];
}
/** Gaze keyframes [[t, [x, y]], …] → the look at time t, easing over `dur` seconds after each key (eyes never jump in one frame). */
export function gaze(t, keys, dur = 0.22) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [tk, v] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / dur), e = k * k * (3 - 2 * k); cur = [cur[0] + (v[0] - cur[0]) * e, cur[1] + (v[1] - cur[1]) * e]; }
  return cur;
}
const HEART = ["#4A0A18", "#7A1028", "#B01E36", "#E0304A", "#F45A6A", "#FF8A94", "#FFC0C6", "#FFFFFF"];
/** Glossy pixel heart (half-width r at rest) centred at x, y; p = pulse 0..1 (from timeline pulse()) swells it and sends a
 *  ring; a dissolves. The same look as the other heart-film levels' icons. */
export function heart(c, x, y, r, p = 0, a = 1) {
  if (a <= 0) return;
  const g = a >= 1 ? c : Object.assign(Object.create(c), { px: (X, Y, col) => { if (a > bayer(Math.floor(X), Math.floor(Y))) c.px(X, Y, col); } });
  const s = r * (1 + 0.38 * p), inH = (u, v) => { const X = u * 1.18, Y = -v * 1.18 + 0.25; return (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y <= 0; };
  if (p > 0.04) { const rr = r * (1.4 + 1.3 * (1 - p)), gk = p * 0.85; for (let j = -R(rr) - 2; j <= R(rr) + 2; j++) for (let i = -R(rr) - 2; i <= R(rr) + 2; i++) { const d = Math.abs(Math.hypot(i, j) - rr); if (d < 1.6 && gk * (1 - d / 1.6) > bayer(R(x) + i, R(y) + j)) g.px(R(x) + i, R(y) + j, "#FFB4C0"); } }
  for (let j = -R(s * 1.3); j <= R(s * 1.3); j++) for (let i = -R(s * 1.3); i <= R(s * 1.3); i++) {
    const u = i / s, v = j / s; if (!inH(u, v)) continue;
    const edge = !inH((i - 1) / s, v) || !inH((i + 1) / s, v) || !inH(u, (j - 1) / s) || !inH(u, (j + 1) / s);
    if (edge) { g.px(R(x) + i, R(y) + j, HEART[0]); continue; }
    const lit = -u * 0.55 - v * 0.75, k = 3.6 + lit * 2.2 + p * 0.9, q = Math.max(1, Math.min(7, Math.floor(k + (bayer(R(x) + i, R(y) + j) - 0.5) * 0.7)));
    g.px(R(x) + i, R(y) + j, HEART[q]);
  }
  const hx = R(x - s * 0.45), hy = R(y - s * 0.35); g.px(hx, hy, "#FFFFFF"); g.px(hx + 1, hy, "#FFFFFF"); g.px(hx, hy + 1, "#FFFFFF"); if (s > 12) { g.px(hx - 1, hy + 1, "#FFE4E4"); g.px(hx + 2, hy - 1, "#FFE4E4"); }
}

// ---------------------------------------------------------------- perspective lawn (the ground plane in front), matching the
// meadow / gorge levels of the heart film: depth-banded grass (light at the ground line, deeper green toward the
// viewer), grass blades, clover patches, flowers that grow bigger toward the front, dandelion clocks, a dirt track.
const GRASS = ["#B4E07A", "#A2D86E", "#8ECC62", "#7CBE58", "#6AB04E", "#5AA046", "#4C9040", "#40803A", "#36713A", "#2C6234", "#24542E"];
const FLW = [["#FFFFFF", "#F8C840"], ["#FFD84A", "#E8A020"], ["#F48AB0", "#FFE070"], ["#B07CE8", "#FFE890"], ["#FFE24A", "#F0A818"]];
function grassCol(x, y, d) { const v = Math.min(GRASS.length - 1.001, Math.sqrt(Math.max(0, d) / 330) * 6.6), lo = Math.floor(v); return GRASS[Math.min(GRASS.length - 1, v - lo > 0.5 + 0.45 * (bayer(x, y) - 0.5) ? lo + 1 : lo)]; }
/** 5-petal flower (petal radius s) centred at x, y. */
export function flower(g, x, y, s, col, eye = "#F8D040") {
  x = R(x); y = R(y);
  if (s <= 1) { g.px(x, y, col); g.px(x - 1, y, col); g.px(x + 1, y, col); g.px(x, y - 1, col); g.px(x, y + 1, col); g.px(x, y, eye); return; }
  const dk = mix(col, "#000000", 0.25);
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5, px = x + Math.cos(a) * s * 0.95, py = y + Math.sin(a) * s * 0.95, r = s * 0.62; for (let Y = R(py - r); Y <= R(py + r); Y++) for (let X = R(px - r); X <= R(px + r); X++) if ((X - px) ** 2 + (Y - py) ** 2 <= r * r + 0.4) g.px(X, Y, Y > y + s * 0.3 ? dk : col); }
  const er = Math.max(1, s * 0.42); for (let Y = R(y - er); Y <= R(y + er); Y++) for (let X = R(x - er); X <= R(x + er); X++) if ((X - x) ** 2 + (Y - y) ** 2 <= er * er + 0.3) g.px(X, Y, eye);
  if (s >= 3) g.px(x - 1, y - 1, mix(eye, "#FFFFFF", 0.5));
}
function stem(g, x, y0, y1, col, lean = 0) { const n = Math.max(1, y1 - y0); for (let i = 0; i <= n; i++) { const k = i / n; g.px(R(x + lean * (1 - k) * (1 - k)), R(y0 + i), col); } }
/** Grass tuft of n blades (h tall) at x, y; cols dark → light; sway shifts the tips. */
export function tuft(g, x, y, h, n, cols, seed = 0, sway = 0) {
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 2 + R((rnd(seed + i * 3) - 0.5) * 2), bh = h * (0.6 + rnd(seed + i * 7) * 0.5), lean = (rnd(seed + i * 11) - 0.5) * h * 0.5 + sway, col = cols[i % cols.length];
    for (let j = 0; j <= bh; j++) { const k = j / bh; g.px(R(bx + lean * k * k), R(y - j), j > bh * 0.65 ? cols[cols.length - 1] : col); }
  }
}
/** Paint the lawn between world x0..x1 from the ground line y0 down to y1 (g must support get()).
 *  o.path [x at the top, x at the bottom, width at the bottom, bend] dirt track; o.mask(x, y) skips pixels; o.density. */
export function lawn(g, x0, x1, y0, y1, o = {}) {
  const path = o.path, dens = o.density ?? 1, W = x1 - x0, skip = (x, y) => o.mask && o.mask(x, y);
  const onPath = (x, y) => { if (!path) return 2; const d = (y - y0) / (y1 - y0), pc = lerp(path[0], path[1], d) + (path[3] ?? 0) * Math.sin(d * Math.PI), pw = 3 + path[2] * d; return Math.abs(x - pc) / pw; };
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (skip(x, y)) continue; let col = grassCol(x, y, y - y0);
    const u = onPath(x, y); if (u < 1) { const n = rnd(x * 7 + y * 131); col = u > 0.82 ? (n < 0.5 ? "#8A7448" : GRASS[6]) : n < 0.08 ? "#C8A878" : (y + (x >> 2)) % 5 === 0 ? "#A8865A" : "#B89466"; }
    g.px(x, y, col);
  }
  for (let x = x0; x < x1; x++) if (!skip(x, y0) && onPath(x, y0) >= 1) g.px(x, y0, "#C6E88A");
  const H = y1 - y0, nb = R(4200 * (W / 580) * dens);
  for (let i = 0; i < nb; i++) {
    const y = R(y0 + 2 + Math.pow(rnd(i * 3 + 101), 1.4) * (H - 4)), x = R(x0 + rnd(i * 3 + 102) * W), d = y - y0, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4;
    if (skip(x, y) || onPath(x, y) < 1.1) continue;
    const col = rnd(i * 5 + 3) < 0.6 ? mix(g.get(x, y), "#1E5A2A", 0.32) : mix(g.get(x, y), "#E8FFB0", 0.3);
    for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col);
  }
  for (let p = 0; p < R(6 * W / 580); p++) { const cx = x0 + 40 + rnd(p * 23 + 7) * (W - 80), cy = y0 + 30 + rnd(p * 29 + 3) * 220; for (let i = 0; i < 24; i++) { const x = R(cx + (rnd(p * 100 + i + 9) - 0.5) * 70), y = R(cy + (rnd(p * 100 + i + 59) - 0.5) * 26); if (skip(x, y) || onPath(x, y) < 1.2) continue; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2]]) { g.px(x + dx, y + dy, "#3E8A3E"); g.px(x + dx - 1, y + dy, "#3E8A3E"); g.px(x + dx, y + dy - 1, "#7CC85E"); } } }
  const nf = R(300 * (W / 580) * dens);
  for (let i = 0; i < nf; i++) {
    const x = R(x0 + 4 + rnd(i * 7 + 14) * (W - 8)), y = R(y0 + 3 + Math.pow(rnd(i * 7 + 13), 1.25) * (H - 6)), d = y - y0, s = d < 30 ? 1 : d < 110 ? 2 : d < 220 ? 3 : 4, [pc, ec] = FLW[Math.floor(rnd(i * 11 + 5) * FLW.length)];
    if (skip(x, y) || onPath(x, y) < 1.3) continue;
    if (s >= 2) stem(g, x, y + s, y + s + 2 + s * 2, "#3A7A36");
    flower(g, x, y, s, mix(pc, "#DDEFC8", Math.max(0, 0.35 - d / 200)), ec);
  }
  for (let i = 0; i < R(14 * W / 580); i++) { const x = R(x0 + 30 + rnd(i * 17 + 3) * (W - 60)), y = R(y0 + 40 + rnd(i * 5 + 1) * 200); if (skip(x, y) || onPath(x, y) < 1.3) continue; for (let k = 0; k < 14; k++) { const an = (k / 14) * 6.283; g.px(R(x + Math.cos(an) * 3), R(y - 9 + Math.sin(an) * 3), "#F4F4F0"); } g.px(x, y - 9, "#D8D8D0"); stem(g, x, y - 6, y + 2, "#4A8A3A"); }
}
/** Foreground of the lawn: tall blade tufts and big flowers on stems along the bottom (draw in front of the actors). */
export function lawnFront(g, x0, x1, y0, o = {}) {
  const W = x1 - x0, skip = (x) => o.skip && o.skip(x);
  for (let i = 0; i < R(60 * W / 580); i++) { const x = R(x0 + rnd(i * 13 + 72) * W), y = R(y0 + 250 + rnd(i * 13 + 75) * 90); if (skip(x)) continue; tuft(g, x, y, 14 + rnd(i + 3) * 16, 4 + Math.floor(rnd(i * 3 + 1) * 4), ["#2E6A30", "#3E8238", "#58A044"], i * 5 + 3, (rnd(i * 9 + 2) - 0.5) * 6); }
  for (let i = 0; i < R(16 * W / 580); i++) { const x = R(x0 + rnd(i * 19 + 31) * W), y = R(y0 + 244 + rnd(i * 19 + 33) * 90), h = 18 + rnd(i * 5 + 7) * 22, [pc, ec] = FLW[(i * 3) % FLW.length]; if (skip(x)) continue; stem(g, x, y - h, y, "#2E6A30", (rnd(i + 5) - 0.5) * 8); flower(g, x, y - h, 5 + (rnd(i * 7 + 1) < 0.4 ? 1 : 0), pc, ec); }
}

// ---------------------------------------------------------------- harvested wheat field seen at a slant (weight film's field)
const STUB = ["#F8E6A8", "#F2D88E", "#EACA76", "#E0BA62", "#D4AA50", "#C69944", "#B6873A", "#A47632", "#90662A"];
const GRASS_T = ["#AEDC6C", "#98CE5E", "#82C052", "#6CB046", "#5AA23E", "#4A9038", "#3C7E32", "#32702E", "#28602A", "#205224", "#18441E"];
/** Golden stubble plane between world x0..x1 from the ground line y0 to y1: depth bands, furrows converging to (vx, y0 − 260),
 *  straw ticks, poppies and cornflowers growing toward the front. o.green [xa, xb]: tropical lawn at xa dissolving into the
 *  field by xb (the Cuban forest edge). o.mask(x, y) skips pixels. */
export function stubble(g, x0, x1, y0, y1, o = {}) {
  const vx = o.vx ?? (x0 + x1) / 2, vy = y0 - 260, H = y1 - y0, W = x1 - x0, skip = (x, y) => o.mask && o.mask(x, y), gr = o.green;
  const greenK = (x) => (gr ? 1 - sm(x, gr[0], gr[1]) : 0);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (skip(x, y)) continue;
    const d = y - y0, v = Math.min(STUB.length - 1.001, Math.sqrt(d / 330) * 5.2), lo = Math.floor(v);
    const row = Math.floor(((x - vx) / (y - vy)) * 16), odd = row & 1, edgeRow = Math.abs(((x - vx) / (y - vy)) * 16 - row - 0.5) > 0.44 && d > 60;
    let k = Math.min(STUB.length - 1, (v - lo > 0.5 + 0.45 * (bayer(x, y) - 0.5) ? lo + 1 : lo) + odd + (edgeRow ? 1 : 0));
    let col = STUB[k];
    const gk = greenK(x); if (gk > 0 && gk > bayer(x, y) * 0.999) { const gv = Math.min(10.999, Math.sqrt(d / 330) * 6.6), gl = Math.floor(gv); col = GRASS_T[Math.min(10, gv - gl > 0.5 + 0.45 * (bayer(x, y) - 0.5) ? gl + 1 : gl)]; }
    g.px(x, y, col);
  }
  for (let x = x0; x < x1; x++) if (!skip(x, y0)) g.px(x, y0, greenK(x) > bayer(x, y0) ? "#C6E88A" : "#FBEFC0");
  // straw ticks (or grass blades on the green part)
  for (let i = 0; i < R(5200 * W / 580); i++) {
    const y = R(y0 + 2 + Math.pow(rnd(i * 3 + 201), 1.4) * (H - 4)), x = R(x0 + rnd(i * 3 + 202) * W), d = y - y0, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4;
    if (skip(x, y)) continue; const green = greenK(x) > bayer(x, y) * 0.999;
    const col = green ? (rnd(i * 5 + 3) < 0.6 ? "#2E6A30" : "#C6E88A") : rnd(i * 5 + 3) < 0.55 ? "#FBF0C8" : "#9A7030";
    for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col);
  }
  // poppies, cornflowers, a few weeds; bigger toward the front
  for (let i = 0; i < R(80 * W / 580); i++) {
    const x = R(x0 + 4 + rnd(i * 7 + 54) * (W - 8)), y = R(y0 + 3 + Math.pow(rnd(i * 7 + 53), 1.2) * (H - 6)), d = y - y0, s = d < 30 ? 1 : d < 110 ? 2 : d < 220 ? 3 : 4;
    if (skip(x, y)) continue; const kind = rnd(i * 11 + 5);
    if (s >= 2) stem(g, x, y + s, y + s + 2 + s * 2, "#5A8A3A");
    if (kind < 0.62) flower(g, x, y, s, "#E8342C", "#2A1414"); else if (kind < 0.86) flower(g, x, y, s, "#5A7AE0", "#2A2A6A"); else flower(g, x, y, s, "#FFFFFF", "#F8C840");
  }
}
export { hex, mix, bayer, R, clamp01, sm };
