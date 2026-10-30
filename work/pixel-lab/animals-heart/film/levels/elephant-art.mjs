// Shared art of the series' African elephant (the same chubby elephant as in the first film, levels/savanna.mjs of
// work/pixel-lab/animals/film), plus the small offscreen-layer helpers the savanna levels use. The file is identical in
// animals-weight/film/levels and animals-heart/film/levels: edit both copies together.
// The elephant faces the camera: big ears, glossy amber eyes with lashes, blush, tusks, a trunk with wrinkle rings.
// Parts are cached sprites (body, ears per tilt/flap step, head per tilt step) blitted every frame; the trunk, face and
// props are drawn live. Pure functions of their inputs: the caches only memoise.
import { Canvas, hex } from "../../../../../renderer/pixel/raster.mjs";
import { blob, ell, tube, eye, blush, RAMP, fade, mix, bayer, lerp, ease, smooth } from "../cute.mjs";

const R = Math.round;

// ---------------------------------------------------------------- offscreen layers (static scenery, sprites)
/** Offscreen canvas with a coverage mask. Draw on `.g` (any cute.mjs / raster call), then blit with `.blit`. */
export class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m, base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    c.has = (x, y) => { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1; };
    this.g = c;
  }
  /** Copy the covered pixels with the layer's top-left at screen (sx, sy). o.a dissolves, o.x0/o.x1/o.y0/o.y1 clip,
   *  o.flip mirrors horizontally, o.tint + o.k (0..1) recolours every pixel toward a colour. */
  blit(c, sx, sy, o = {}) {
    sx = R(sx); sy = R(sy);
    const W = this.w, H = this.h, s = this.c.d, m = this.m, d = c.d, CW = c.w, a = o.a ?? 1, dm = c._mask;
    if (a <= 0) return;
    const xa = Math.max(o.x0 ?? 0, sx, 0), xb = Math.min(o.x1 ?? CW, sx + W, CW), ya = Math.max(0, sy, o.y0 ?? 0), yb = Math.min(c.h, sy + H, o.y1 ?? c.h);
    const tint = o.tint ? hex(o.tint) : null, tk = o.k ?? 0, flip = o.flip;
    for (let y = ya; y < yb; y++) {
      const row = (y - sy) * W;
      for (let x = xa; x < xb; x++) {
        const lx = flip ? W - 1 - (x - sx) : x - sx, li = row + lx; if (!m[li]) continue;
        if (a < 1 && a <= bayer(x, y)) continue;
        const q = li * 3, p = (y * CW + x) * 3;
        if (tint) { d[p] = s[q] + (tint[0] - s[q]) * tk; d[p + 1] = s[q + 1] + (tint[1] - s[q + 1]) * tk; d[p + 2] = s[q + 2] + (tint[2] - s[q + 2]) * tk; }
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
/** Gaze keyframes: [[t0, [x, y]], [t1, [x, y]], …] → the look at time t, easing over `dur` seconds after each key. */
export function gaze(t, keys, dur = 0.2) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [tk, v] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / dur), e = k * k * (3 - 2 * k); cur = [cur[0] + (v[0] - cur[0]) * e, cur[1] + (v[1] - cur[1]) * e]; }
  return cur;
}
/** Smooth piecewise profile y(x) through [x, y] keys (cosine-eased between keys). */
export function profile(keys) {
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [a, ya] = keys[i], [b, yb] = keys[i + 1]; if (x <= b) { const k = (x - a) / (b - a), e = (1 - Math.cos(Math.PI * k)) / 2; return ya + (yb - ya) * e; } }
    return keys[keys.length - 1][1];
  };
}

// ---------------------------------------------------------------- palette
export const GRAY = RAMP.gray;
export const EAR_IN = ["#2A1E2A", "#46303E", "#664452", "#865A66", "#A4727C", "#BE8C92", "#D4A8AA", "#E8C8C6"];
export const TUSK = ["#3A3020", "#6A5A40", "#9A8A68", "#C4B490", "#DED2B0", "#EEE6CC", "#F8F4E4", "#FFFFFF"];

// ---------------------------------------------------------------- cached parts (rim = warm light from the low sun)
const SPR = spriteCache(80);
const EAR = [[-52, -46], [-98, -74], [-146, -54], [-164, -6], [-152, 48], [-118, 86], [-80, 92], [-58, 60], [-50, 20]];
const EAR_IN_P = [[-60, -34], [-96, -56], [-134, -42], [-148, -4], [-138, 40], [-110, 70], [-82, 74], [-64, 48], [-58, 14]];
function earPoly(P, sd, flap, pts) { const a = flap * sd, ax = sd * 56, ay = 0, cs = Math.cos(a), sn = Math.sin(a); return smooth(pts.map(([x, y]) => { x *= sd; const dx = x - ax, dy = y - ay; return P(ax + (dx * cs - dy * sn) * (1 + flap * 0.25), ay + dx * sn + dy * cs); }), new Set(), 5); }
const RIM = (rim, k) => (rim ? mix(rim, "#FFFFFF", k) : null);
function bodySprite(s, rim) {
  return SPR(`B${s}|${rim}`, R(300 * s), R(220 * s), R(150 * s), R(20 * s), (g, ox, oy) => {
    const P = xf(ox, oy, s, 0);                        // anchor = head centre + (0, 110)
    for (const sd of [-1, 1]) blob(g, [smooth(P.poly([[sd * 66, 50], [sd * 104, 54], [sd * 108, 150], [sd * 100, 158], [sd * 70, 158], [sd * 64, 150]]), new Set(), 4)], { ramp: GRAY, thick: 12, base: 2.4, gain: 1.6, litOutline: rim });
    blob(g, [P.poly(ell(0, 60, 112, 78))], { ramp: GRAY, thick: 40, base: 2.8, gain: 2.4, slope: 0.8, litOutline: RIM(rim, 0.08) });
    for (const sd of [-1, 1]) {
      blob(g, [smooth(P.poly([[sd * 14, 50], [sd * 60, 50], [sd * 64, 152], [sd * 60, 160], [sd * 14, 160], [sd * 10, 152]]), new Set(), 4)], { ramp: GRAY, thick: 16, base: 3.0, gain: 2.0, litOutline: RIM(rim, 0.08) });
      for (const k of [-1, 0, 1]) { const p = P(sd * 37 + k * 14, 156); for (let j = -4; j <= 4; j++) { g.px(R(p[0] + j * s), R(p[1]), TUSK[j * j < 9 ? 6 : 4]); g.px(R(p[0] + j * s), R(p[1] - 1), j * j < 4 ? TUSK[7] : TUSK[5]); } g.px(R(p[0] - 5 * s), R(p[1]), GRAY[1]); g.px(R(p[0] + 5 * s), R(p[1]), GRAY[1]); }
      for (let j = 0; j < 3; j++) { const p = P(sd * 37, 100 + j * 10); for (let k = -12; k <= 12; k += 1) if (Math.abs(k) < 10 - j) g.px(R(p[0] + k * s), R(p[1] + Math.abs(k) * 0.1), GRAY[2]); }
    }
  });
}
function earSprite(s, rot, flap, rim) {
  const qr = R(rot / 0.02), qf = R(flap / 0.025);
  return SPR(`E${s}|${qr}|${qf}|${rim}`, R(380 * s), R(240 * s), R(190 * s), R(110 * s), (g, ox, oy) => {
    const P = xf(ox, oy, s, qr * 0.02);
    for (const sd of [-1, 1]) { blob(g, [earPoly(P, sd, qf * 0.025, EAR)], { ramp: GRAY, thick: 14, base: 3.0, gain: 1.8, litOutline: RIM(rim, 0.12) }); blob(g, [earPoly(P, sd, qf * 0.025, EAR_IN_P)], { ramp: EAR_IN, thick: 12, base: 3.4, gain: 1.6, outline: GRAY[2] }); }
  });
}
function headSprite(s, rot, rim) {
  const qr = R(rot / 0.02);
  return SPR(`H${s}|${qr}|${rim}`, R(220 * s), R(200 * s), R(110 * s), R(100 * s), (g, ox, oy) => {
    const P = xf(ox, oy, s, qr * 0.02);
    blob(g, [P.poly(ell(0, 4, 74, 64)), P.poly(ell(0, -16, 62, 56)), P.poly(ell(-40, 30, 32, 28)), P.poly(ell(40, 30, 32, 28))], { ramp: GRAY, thick: 30, base: 3.1, gain: 2.4, slope: 0.6, litOutline: RIM(rim, 0.15) });
    for (const [y, w] of [[-44, 16], [-38, 22]]) for (let k = -w; k <= w; k++) { const p = P(k, y + (k * k) / 120); g.px(R(p[0]), R(p[1]), GRAY[3]); }
    for (const sd of [-1, 1]) blob(g, [tube([P(sd * 20, 42), P(sd * 26, 56), P(sd * 24, 70)], 6 * s, 3 * s)], { ramp: TUSK, thick: 4, base: 4.2, outline: TUSK[1] });
  });
}

// ---------------------------------------------------------------- trunk poses (head-local, root at the nose)
/** Trunk control polylines: hang (resting, tip curled up), up (touches the forehead), reachL (down-left to a pile on the
 *  ground, ≈ 150 px left of and 190 px below the head centre), feed (curls under and brings the tip to the mouth). */
export const TRUNK = {
  hang: [[0, 6], [-2, 60], [0, 100], [6, 132], [16, 150], [28, 150], [32, 140]],
  up: [[0, 6], [-16, 58], [-44, 70], [-66, 42], [-62, 2], [-52, -24], [-40, -36]],
  reachL: [[0, 6], [-8, 58], [-30, 104], [-66, 140], [-104, 164], [-136, 182], [-150, 200]],
  grabL: [[0, 6], [-8, 58], [-30, 104], [-66, 140], [-104, 162], [-134, 176], [-144, 188]],
  feed: [[0, 6], [-2, 44], [-10, 76], [-26, 90], [-40, 78], [-36, 60], [-22, 52]],
};
/** Blend two trunk polylines (k 0..1, eased by the caller). */
export function trunkMix(a, b, k) { return a.map(([x, y], i) => [lerp(x, b[i][0], k), lerp(y, b[i][1], k)]); }
function trunkPts(P, pts, t, sway) {
  pts = pts.map(([x, y], i) => { const sw = Math.sin(t * 1.7 + i * 0.5) * sway * (i / 6); return [x + sw * 8, y + Math.abs(sw) * 2]; });
  const out = []; for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < 4; j++) { const u = j / 4, a = pts[Math.max(0, i - 1)], b = pts[i], c2 = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)]; out.push([0, 1].map((q) => 0.5 * (2 * b[q] + (-a[q] + c2[q]) * u + (2 * a[q] - 5 * b[q] + 4 * c2[q] - d[q]) * u * u + (-a[q] + 3 * b[q] - 3 * c2[q] + d[q]) * u * u * u))); }
  out.push(pts[pts.length - 1]); return out.map(([x, y]) => P(x, y));
}

/**
 * The elephant: head centre (x, y); feet at y + 268·s. o: s (scale), rot (head tilt about the neck), dip (head drops
 * by dip px), flap (ear flap), blink, look, trunk (a TRUNK polyline or a 0..1 hang → up blend), sway (trunk idle),
 * happy (smile), mouth (0..1 open mouth under the trunk, centred at mouthX), rim (warm lit-outline colour), a, noBody, before(P) (drawn
 * between the head and the trunk, e.g. food in the mouth). Returns { P, tp, tip } (head transform, trunk points, tip).
 */
export function drawElephant(c, x, y, t, o = {}) {
  const s = o.s ?? 1, rot = o.rot ?? 0, dip = o.dip ?? 0, rim = o.rim ?? "#F0A070", a = o.a ?? 1;
  const pv = [x, y + 60 * s + dip];
  const cs = Math.cos(rot), sn = Math.sin(rot), P = (dx, dy) => { const px = dx * s, py = dy * s - 60 * s; return [pv[0] + px * cs - py * sn, pv[1] + px * sn + py * cs]; };
  if (!o.noBody) bodySprite(s, rim).blit(c, x, y + 110 * s, { a });
  const hx = P(0, 0); earSprite(s, rot, o.flap ?? 0, rim).blit(c, hx[0], hx[1], { a }); headSprite(s, rot, rim).blit(c, hx[0], hx[1], { a });
  const g = fade(c, a);
  const lk = o.look ?? [0, 0.1], bl = o.blink ?? 0, happy = o.happy ?? 0;
  for (const sd of [-1, 1]) {
    const e = P(sd * 32, -4); eye(g, e[0], e[1], 12.5 * s, { iris: RAMP.amber, pupil: "round", ry: 13.5 * s, look: lk, blink: bl, lid: GRAY[4] });
    for (const [lx, ly] of [[13, -12], [15, -9], [16, -5]]) { const p = P(sd * (32 + lx), -4 + ly); g.px(R(p[0]), R(p[1]), GRAY[0]); g.px(R(p[0] + sd), R(p[1] - 1), GRAY[0]); }
    const b = P(sd * 48, 20); blush(g, b[0], b[1], 9 * s, 4 * s, "#F27A9A");
    for (let k = 0; k <= 7; k++) { const p = P(sd * (20 + k), 48 - (k > 4 ? k - 4 : 0) * 0.8 + happy * 1); g.px(R(p[0]), R(p[1]), GRAY[0]); }
  }
  // open mouth under the trunk root (eating): a dark-pink oval with a lighter tongue
  const mo = o.mouth ?? 0;
  if (mo > 0.05) {
    const m = P(o.mouthX ?? 0, 50), rx = 10 * s, ry = (3 + 7 * mo) * s;
    for (let Y = R(m[1] - ry); Y <= R(m[1] + ry); Y++) for (let X = R(m[0] - rx); X <= R(m[0] + rx); X++) { const d = ((X - m[0]) / rx) ** 2 + ((Y - m[1]) / ry) ** 2; if (d > 1) continue; g.px(X, Y, d > 0.72 ? GRAY[0] : Y > m[1] + ry * 0.25 ? "#E06A88" : "#5A1A2E"); }
  }
  o.before?.(P);
  const tpCtl = Array.isArray(o.trunk) ? o.trunk : trunkMix(TRUNK.hang, TRUNK.up, ease(o.trunk ?? 0));
  const tp = trunkPts(P, tpCtl, t, o.sway ?? 1);
  const root = P(0, 8);
  blob(g, [tube(tp, 19 * s, 8.5 * s), ell(root[0], root[1], 18 * s, 15 * s)], { ramp: GRAY, thick: 9, base: 3.3, gain: 1.6, outline: GRAY[1], litOutline: RIM(rim, 0.15) });
  for (let i = 3; i < tp.length - 2; i += 2) { const [ax, ay] = tp[i - 1], [bx, by] = tp[i + 1], dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy) || 1, r = lerp(19, 8.5, i / (tp.length - 1)) * s * 0.75; for (let k = -r; k <= r; k++) g.px(R(tp[i][0] - (dy / n) * k), R(tp[i][1] + (dx / n) * k), GRAY[2]); }
  const tip = tp[tp.length - 1]; g.px(R(tip[0]), R(tip[1]), GRAY[0]); g.px(R(tip[0]) + 1, R(tip[1]), GRAY[0]);
  return { P, tp, tip };
}
