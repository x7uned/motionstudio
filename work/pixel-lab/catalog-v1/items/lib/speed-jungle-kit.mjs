// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-speed/film/levels/jungle-kit.mjs; changes: import ./cute.mjs.
// Shared helpers of LV2 · jungle (sloth) and LV4 · yard (cat): masked offscreen layers (static scenery drawn once, then
// copied row by row into the frame), memoised sprites, a few plant painters and small pixel helpers.
// Adapted from ../../../animals/film/levels/bay-kit.mjs (same series). Pure functions of their inputs: caches only memoise.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { blob, rnd } from "./cute.mjs";

const R = Math.round;

/** Offscreen canvas with a coverage mask. Draw on `.g` (any cute.mjs / raster call), then blit with `.blit`. */
export class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m, base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    this.g = c;
  }
  has(x, y) { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] === 1; }
  /** Copy covered pixels with the layer's top-left at screen (sx, sy). o.a dissolves (Bayer), o.x0/o.x1/o.y0/o.y1 clip,
   *  o.flip mirrors, o.pick(x, y, li) → 0 skip | 1 own colour | [r,g,b] replacement (per-pixel effects, e.g. algae). */
  blit(c, sx, sy, o = {}) {
    sx = R(sx); sy = R(sy);
    const W = this.w, H = this.h, s = this.c.d, m = this.m, d = c.d, CW = c.w, a = o.a ?? 1;
    if (a <= 0) return;
    const xa = Math.max(o.x0 ?? 0, sx, 0), xb = Math.min(o.x1 ?? CW, sx + W, CW), ya = Math.max(o.y0 ?? 0, sy, 0), yb = Math.min(o.y1 ?? c.h, sy + H, c.h);
    if (xa >= xb || ya >= yb) return;
    const flip = o.flip, pick = o.pick;
    for (let y = ya; y < yb; y++) {
      const row = (y - sy) * W;
      for (let x = xa; x < xb; x++) {
        const lx = flip ? W - 1 - (x - sx) : x - sx, li = row + lx; if (!m[li]) continue;
        if (a < 1 && a <= bayer(x, y)) continue;
        const p = (y * CW + x) * 3;
        if (pick) { const r = pick(x, y, li); if (!r) continue; if (r !== 1) { d[p] = r[0]; d[p + 1] = r[1]; d[p + 2] = r[2]; continue; } }
        const q = li * 3; d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2];
      }
    }
  }
}

/** World-anchored static layer covering world x wx0..wx0+w, y wy0..wy0+h; `paint(g, L, T)` draws with L(wx)/T(wy). */
export function worldLayer(wx0, wy0, w, h, paint) {
  const L = new Layer(w, h); paint(L.g, (wx) => wx - wx0, (wy) => wy - wy0, L);
  return { layer: L, wx0, wy0, w, h, blit(c, V, o) { L.blit(c, V.X(wx0), V.Y(wy0), o); } };
}

/** Memoised sprite: key → { layer, ox, oy, blit(c, x, y, o) } where (ox, oy) is the anchor inside the layer. Small LRU. */
export function spriteCache(max = 48) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new Layer(w, h); paint(L.g, ox, oy, L);
    s = { layer: L, ox, oy, w, h, blit(c, x, y, o) { L.blit(c, x - (o?.flip ? w - 1 - ox : ox), y - oy, o); } };
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
/** 1-px polyline. */
export function pline(g, pts, col) { for (let i = 0; i < pts.length - 1; i++) g.line(R(pts[i][0]), R(pts[i][1]), R(pts[i + 1][0]), R(pts[i + 1][1]), col); }

/** Rotate + translate points: local [x, y] → screen, about the local origin, then offset by (ox, oy), scaled by s. */
export function xf(ox, oy, s = 1, rot = 0) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (x, y) => [ox + (x * cs - y * sn) * s, oy + (x * sn + y * cs) * s];
  P.poly = (pts) => pts.map(([x, y]) => P(x, y)); P.s = s; P.rot = rot;
  return P;
}

/** A big pointed leaf (lens along `ang`, midrib and side veins), volume-shaded with `ramp`. */
export function leaf(g, x, y, len, wid, ang, ramp, { vein = true, a = 1, lit = null, bend = 0 } = {}) {
  const ca = Math.cos(ang), sa = Math.sin(ang), pts = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push([u * len, Math.sin(Math.PI * Math.pow(u, 0.8)) * wid + bend * u * u * len]); }
  for (let i = 16; i >= 0; i--) { const u = i / 16; pts.push([u * len, -Math.sin(Math.PI * Math.pow(u, 0.8)) * wid + bend * u * u * len]); }
  const P = pts.map(([u, v]) => [x + u * ca - v * sa, y + u * sa + v * ca]);
  blob(g, [P], { ramp, thick: Math.max(3, wid * 0.6), base: 3.2, gain: 1.8, outline: ramp[0], litOutline: lit ?? ramp[5], a });
  if (vein) {
    const at = (u, v) => [R(x + u * ca - (v + bend * (u / len) * (u / len) * len) * sa), R(y + u * sa + (v + bend * (u / len) * (u / len) * len) * ca)];
    for (let u = 2; u < len - 2; u++) { const [px, py] = at(u, 0); g.px(px, py, ramp[2]); }
    for (let k = 1; k < 5; k++) { const u0 = (k / 5) * len; for (let j = 1; j < wid * 0.7; j++) for (const sd of [-1, 1]) { const [px, py] = at(u0 + j * 0.7, sd * j); g.px(px, py, ramp[3]); } }
  }
}

/** Fern frond: a curved rachis with alternating filled leaflets (two tones, lit upper side). (x, y) base, ang initial
 *  heading, len, curl (rad over the length). */
export function fern(g, x, y, ang, len, curl, ramp, seed = 0) {
  let px = x, py = y, a = ang; const n = Math.max(6, R(len / 3.2));
  const pts = [[px, py]];
  for (let i = 1; i <= n; i++) { a += curl / n; px += Math.cos(a) * (len / n); py += Math.sin(a) * (len / n); pts.push([px, py]); }
  for (let i = 1; i < pts.length; i++) {
    const u = i / pts.length, [qx, qy] = pts[i], [ox, oy] = pts[i - 1], dx = qx - ox, dy = qy - oy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
    const L = (1 - u * 0.85) * Math.min(12, len * 0.22) + 1.5;
    for (const sd of [-1, 1]) {
      const tip = [qx + nx * sd * L + ux * L * 0.55, qy + ny * sd * L + uy * L * 0.55], b0 = [ox, oy], b1 = [qx + ux * 1.2, qy + uy * 1.2];
      const lit = (ny * sd < 0) ? 1 : 0;                                   // leaflet pointing up = lit
      g.poly([b0, tip, b1], ramp[lit ? 5 : 3]);
      g.line(R(b0[0]), R(b0[1]), R(tip[0]), R(tip[1]), ramp[lit ? 6 : 4]);
      g.px(R(tip[0]), R(tip[1]), ramp[lit ? 4 : 2]);
    }
  }
  pline(g, pts, ramp[2]);
}

/** Gaze keyframes: [[t0, [x, y]], [t1, [x, y]], …] → the look at time t, easing over `dur` seconds after each key. */
export function gaze(t, keys, dur = 0.2) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [tk, v] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / dur), e = k * k * (3 - 2 * k); cur = [cur[0] + (v[0] - cur[0]) * e, cur[1] + (v[1] - cur[1]) * e]; }
  return cur;
}
/** Multiply-grade a hex colour (time-of-day tint of static art). */
export const grade = (col, mul, add = [0, 0, 0]) => hex(col).map((v, i) => Math.max(0, Math.min(255, R(v * mul[i] + add[i]))));
export { hex, mix, bayer };
