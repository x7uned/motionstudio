// Shared helpers for LV5 racecourse (racehorse) and LV6 savanna (cheetah): masked offscreen layers (static scenery drawn
// once, copied row by row), cached sprites, a treadmill (a ground-scroll integral that ends on whole texture periods, so the
// streamed layers come back to rest exactly), a gait-phase integrator, two-bone IK for legs, dust puffs and speed streaks.
// Layer / worldLayer / spriteCache / xf / thick / gaze / profile / tuft are copied from animals-weight/film/levels/pasture-kit.mjs.
// Everything is a pure function of its inputs; the caches only memoise.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, fade, sm, ease, clamp01, lerp, smile } from "../cute.mjs";

const R = Math.round;

/** Offscreen canvas with a coverage mask. Draw on `.g` (any cute.mjs / raster call), then copy with `.blit`. */
export class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m, base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    this.g = c;
  }
  /** Copy covered pixels with the layer's top-left at screen (sx, sy). o.a dissolves, o.x0/o.x1/o.y0/o.y1 clip (screen),
   *  o.flip mirrors, o.wrap (layer px) samples the layer periodically with o.shift (layer px, + = content moves left),
   *  o.rowShift(layerRow) overrides the shift per row (perspective bands), o.smear (px) stretches pixels into horizontal streaks (speed blur) with per-row offsets o.smearOff. */
  blit(c, sx, sy, o = {}) {
    sx = R(sx); sy = R(sy);
    const W = this.w, H = this.h, s = this.c.d, m = this.m, d = c.d, CW = c.w, a = o.a ?? 1;
    if (a <= 0) return;
    const wrap = o.wrap ?? 0, shift = R(o.shift ?? 0), L = Math.max(1, R(o.smear ?? 1)), soff = o.smearOff ?? 0;
    const xa = Math.max(o.x0 ?? 0, wrap ? 0 : sx, 0), xb = Math.min(o.x1 ?? CW, wrap ? CW : sx + W, CW), ya = Math.max(0, sy, o.y0 ?? 0), yb = Math.min(c.h, sy + H, o.y1 ?? c.h), flip = o.flip;
    for (let y = ya; y < yb; y++) {
      const row = (y - sy) * W, ro = L > 1 ? R(rnd(y * 7 + 3) * L + soff) : 0, rsh = o.rowShift ? R(o.rowShift(y - sy)) : shift;
      for (let x = xa; x < xb; x++) {
        let lx = flip ? W - 1 - (x - sx) : x - sx;
        if (L > 1) lx -= (((x + ro) % L) + L) % L;
        if (wrap) { lx = (((lx + rsh) % wrap) + wrap) % wrap; } else if (lx < 0 || lx >= W) continue;
        const li = row + lx; if (!m[li]) continue;
        if (a < 1 && a <= bayer(x, y)) continue;
        const q = li * 3, p = (y * CW + x) * 3;
        d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2];
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

/** Smooth piecewise profile y(x) through [x, y] keys (cosine-eased between keys). */
export function profile(keys) {
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [a, ya] = keys[i], [b, yb] = keys[i + 1]; if (x <= b) { const k = (x - a) / (b - a), e = (1 - Math.cos(Math.PI * k)) / 2; return ya + (yb - ya) * e; } }
    return keys[keys.length - 1][1];
  };
}

/** Gaze keyframes: [[t0, [x, y]], [t1, [x, y]], …] → the look at time t, easing over `dur` seconds after each key. */
export function gaze(t, keys, dur = 0.25) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [tk, v] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / dur), e = k * k * (3 - 2 * k); cur = [cur[0] + (v[0] - cur[0]) * e, cur[1] + (v[1] - cur[1]) * e]; }
  return cur;
}

/** Grass tuft of n blades (h tall) at ground point x, y; cols dark → light; sway shifts the tips. */
export function tuft(g, x, y, h, n, cols, seed = 0, sway = 0) {
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 2 + R((rnd(seed + i * 3) - 0.5) * 2), bh = h * (0.6 + rnd(seed + i * 7) * 0.5), lean = (rnd(seed + i * 11) - 0.5) * h * 0.5 + sway;
    const col = cols[Math.min(cols.length - 2, i % (cols.length - 1))];
    for (let j = 0; j <= bh; j++) { const k = j / bh; g.px(R(bx + lean * k * k), R(y - j), j > bh * 0.7 ? cols[cols.length - 1] : col); }
  }
}

/** Tube along a polyline with a radius profile rad(u) (u 0..1 along the line): tails, manes, flowing locks. */
export function ribbon(pts, rad) {
  const n = pts.length, Lft = [], Rgt = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, r = rad(i / (n - 1));
    Lft.push([pts[i][0] - (dy / d) * r, pts[i][1] + (dx / d) * r]); Rgt.push([pts[i][0] + (dy / d) * r, pts[i][1] - (dx / d) * r]);
  }
  return [...Lft, ...Rgt.reverse()];
}
/** Points along a quadratic Bézier p0→p1→p2 with a travelling sideways wave: amp(u), phase ph, k waves per length. */
export function wavy(p0, p1, p2, n, amp, ph, k = 1.2) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t, x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
    const tx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), ty = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]), d = Math.hypot(tx, ty) || 1, w = amp(t) * Math.sin(ph - t * k * 2 * Math.PI);
    out.push([x - (ty / d) * w, y + (tx / d) * w]);
  }
  return out;
}

// ---------------------------------------------------------------- integrators (tables built once; pure functions of t)
/**
 * Numerical integral of a rate function rate(t) from t0 (value 0) to t1, sampled every dt; returns F(t) (clamped at the
 * ends: constant before t0 and after t1) and its inverse search `when(v)` (first t with F(t) >= v).
 */
export function integral(rate, t0, t1, dt = 1 / 600) {
  const n = Math.ceil((t1 - t0) / dt), v = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) { const a = t0 + (i - 1) * dt, b = t0 + i * dt; v[i] = v[i - 1] + 0.5 * (rate(a) + rate(b)) * dt; }
  const F = (t) => { if (t <= t0) return 0; if (t >= t1) return v[n]; const x = (t - t0) / dt, i = Math.floor(x), f = x - i; return v[i] + (v[Math.min(n, i + 1)] - v[i]) * f; };
  F.total = v[n];
  F.when = (target) => { if (target <= 0) return t0; if (target > v[n]) return null; let lo = 0, hi = n; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (v[mid] >= target) hi = mid; else lo = mid; } const f = (target - v[lo]) / ((v[hi] - v[lo]) || 1); return t0 + (lo + f) * dt; };
  return F;
}
/** Treadmill: ground scroll s(t) (px) whose speed follows shape(t) (0..1) and whose total equals exactly `total`. */
export function treadmill(shape, t0, t1, total) {
  const F = integral(shape, t0, t1), k = total / (F.total || 1);
  const s = (t) => F(t) * k; s.total = total; s.speed = (t) => shape(t) * k; s.t0 = t0; s.t1 = t1;
  return s;
}

/** Two-bone IK: from pivot P to target T with bone lengths a, b; bend = +1/−1 picks the knee side (screen). Returns knee. */
export function ik(P, T, a, b, bend) {
  let dx = T[0] - P[0], dy = T[1] - P[1], d = Math.hypot(dx, dy) || 1e-6;
  const dmax = a + b - 0.01; if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; }
  const dmin = Math.abs(a - b) + 0.01; if (d < dmin) { dx *= dmin / d; dy *= dmin / d; d = dmin; }
  const ca = (a * a + d * d - b * b) / (2 * a * d), ang = Math.acos(Math.max(-1, Math.min(1, ca))), base = Math.atan2(dy, dx), k = base - bend * ang;
  return { knee: [P[0] + Math.cos(k) * a, P[1] + Math.sin(k) * a], foot: [P[0] + dx, P[1] + dy] };
}

// ---------------------------------------------------------------- effects
/** Dust puff kicked up at (x, y): age u (s) in [0, life]; drift = px it has slid sideways (ground scroll); s = size. */
export function dustPuff(c, x, y, u, life, drift = 0, s = 1, cols = ["#F4E2C0", "#D8C098", "#B89A74"], seed = 0) {
  if (u < 0 || u > life) return; const k = u / life, a = (1 - sm(k, 0.35, 1)) * sm(u, 0, 0.08), g = fade(c, a);
  for (let i = 0; i < 7; i++) {
    const ang = Math.PI * (0.15 + 0.7 * rnd(seed * 31 + i * 7)), sp = (6 + rnd(seed * 13 + i) * 12) * s, e = ease(Math.min(1, k * 1.4));
    const px = x - drift - Math.cos(ang) * sp * e * (i % 2 ? 1 : -0.6), py = y - 2 - Math.sin(ang) * sp * 0.55 * e - k * 6 * s, r = (1 + (i % 3) * 0.7 + Math.min(1, k * 3) * 2 + k * 3) * s;
    for (let Y = -R(r); Y <= R(r); Y++) for (let X = -R(r); X <= R(r); X++) { const dd = X * X + Y * Y; if (dd > r * r) continue; if (((R(px) + X + R(py) + Y + i) & 1) && dd > r * r * 0.45) continue; g.px(R(px) + X, R(py) + Y, Y < -r * 0.3 ? cols[0] : Y < r * 0.3 ? cols[1] : cols[2]); }
  }
}
/** A four-point twinkle star at (x, y), size 0..1 (grows and shrinks continuously), colour col. */
export function twinkle(c, x, y, size, col = "#FFF6C0", a = 1, edge = "#B8541E") {
  if (size <= 0.05 || a <= 0) return; const g = fade(c, a), r = Math.max(1, R(size * 9)), X = R(x), Y = R(y);
  const on = (i, j) => (j === 0 && Math.abs(i) <= r) || (i === 0 && Math.abs(j) <= r) || (Math.abs(i) <= 1 && Math.abs(j) <= 1 && r >= 3) || (r >= 6 && ((Math.abs(i) <= 1 && Math.abs(j) <= R(r * 0.45)) || (Math.abs(j) <= 1 && Math.abs(i) <= R(r * 0.45))));
  for (let j = -r - 1; j <= r + 1; j++) for (let i = -r - 1; i <= r + 1; i++) {
    if (on(i, j)) g.px(X + i, Y + j, Math.abs(i) + Math.abs(j) <= 2 ? "#FFFFFF" : col);
    else if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) g.px(X + i, Y + j, edge);
  }
}
/** Horizontal speed streak (a short bright line with a dithered tail) from x to x + len at row y. */
export function streak(c, x, y, len, col, tail, a = 1) {
  if (a <= 0 || len < 2) return; const g = fade(c, a);
  for (let i = 0; i < len; i++) { const u = i / len; if (u < 0.45 && u * 2.2 < bayer(R(x) + i, R(y))) continue; g.px(R(x) + i, R(y), u < 0.6 ? tail : col); }
}
/** smile() that opens continuously: the closed arc dissolves into the open mouth instead of switching in one frame. */
export function softSmile(g, x, y, w, open, o = {}) {
  const k = sm(open, 0.03, 0.22);
  if (k < 1) smile(fade(g, 1 - k), x, y, w, { ...o, open: 0 });
  if (k > 0) smile(fade(g, k), x, y, w, { ...o, open: Math.max(open, 0.08) });
}
export { R, sm, ease, clamp01, lerp, rnd, fade, mix, bayer, hex };
