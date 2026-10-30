// Shared helpers for LV3 river (hippo) and LV4 swamp (crocodile): masked offscreen layers (static scenery drawn once
// and copied row by row into the frame), cached sprites, tinted canvas views (things seen through water), and small
// water / comic effects (waterline foam, splashes, ripple rings, bubbles, wakes, chomp lines, the "!" pop).
// Layer / worldLayer / spriteCache / xf / thick / profile / gaze / tuft are copied from
// ../../animals-weight/film/levels/pasture-kit.mjs (that folder is never edited). Pure functions; caches only memoise.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, fade, sm, ease, clamp01, lerp, MAIN } from "../cute.mjs";

export const R = Math.round;

/** Offscreen canvas with a coverage mask. Draw on `.g` (any cute.mjs / raster call), then copy with `.blit`. */
export class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m, base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    this.g = c;
  }
  /** Copy covered pixels with the layer's top-left at screen (sx, sy). o.a dissolves, o.x0/o.x1/o.y0/o.y1 clip,
   *  o.below + o.tint + o.k(y) recolour rows below a screen line (water), o.flip mirrors horizontally. */
  blit(c, sx, sy, o = {}) {
    sx = R(sx); sy = R(sy);
    const W = this.w, H = this.h, s = this.c.d, m = this.m, d = c.d, CW = c.w, a = o.a ?? 1;
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

/** A view of canvas c that recolours every pixel drawn through it: f(x, y, rgb) → rgb (or null to skip the pixel). */
export function tinted(c, f) {
  const o = Object.create(c);
  o.px = (x, y, col) => { if (!col) return; const p = f(Math.floor(x), Math.floor(y), hex(col)); if (p) c.px(x, y, p); };
  return o;
}
/** Underwater look below screen row `sy`: mix toward `col` by k (deeper → more). */
export function underwater(c, sy, col, k0 = 0.4, k1 = 0.58, depth = 240) {
  const W = hex(col);
  return tinted(c, (x, y, p) => { if (y <= sy) return p; const k = k0 + (k1 - k0) * Math.min(1, (y - sy) / depth); return [R(p[0] + (W[0] - p[0]) * k), R(p[1] + (W[1] - p[1]) * k), R(p[2] + (W[2] - p[2]) * k)]; });
}
/** A view that only paints where keep(x, y) is true. */
export function clipView(c, keep) { const o = Object.create(c); o.px = (x, y, col) => { if (keep(Math.floor(x), Math.floor(y))) c.px(x, y, col); }; return o; }

/** Rotate + scale + translate points: local [x, y] → screen, about the local origin, then offset by (ox, oy). */
export function xf(ox, oy, s = 1, rot = 0, sy = 1) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (x, y) => [ox + (x * cs - y * sy * sn) * s, oy + (x * sn + y * sy * cs) * s];
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

/** Keyframed value: [[t0, v], [t1, v], …] → value at t, easing over `dur` seconds after each key (numbers or [x, y]). */
export function gaze(t, keys, dur = 0.25) {
  let cur = keys[0][1];
  const step = (a, b, e) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * e) : a + (b - a) * e);
  for (let i = 1; i < keys.length; i++) { const [tk, v, d] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / (d ?? dur)), e = k * k * (3 - 2 * k); cur = step(cur, v, e); }
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

/** Mix the screen rows below `sy` between screen x sx0..sx1 toward `col` by k0 (surface) → k1 (depth px deeper). */
export function murk(c, sx0, sx1, sy, col, k0, k1, depth = 420) {
  sx0 = Math.max(0, R(sx0)); sx1 = Math.min(c.w, R(sx1)); sy = Math.max(0, R(sy)); if (sx0 >= sx1) return;
  const M = hex(col), d = c.d, W = c.w;
  for (let y = sy; y < c.h; y++) { const k = k0 + (k1 - k0) * Math.min(1, (y - sy) / depth); for (let x = sx0; x < sx1; x++) { const i = (y * W + x) * 3; d[i] += (M[0] - d[i]) * k; d[i + 1] += (M[1] - d[i + 1]) * k; d[i + 2] += (M[2] - d[i + 2]) * k; } }
}

// ---------------------------------------------------------------- water effects (screen space)
/** Foam line where something breaks the surface: half-width hw around x, a dissolves. */
export function waterline(c, x, wly, hw, t, a = 1, col = "#FFFFFF", soft = "#D8F4EC") {
  if (a <= 0) return; const g = fade(c, a);
  for (let k = -hw - 6; k <= hw + 6; k++) { const yy = wly + R(Math.sin(k * 0.5 + t * 6) * 0.8); g.px(R(x + k), yy, Math.abs(k) > hw ? soft : col); if ((k + R(t * 10)) % 5 === 0) g.px(R(x + k), yy + 1, soft); }
}
/** Ballistic splash of droplets from (x, wly); u = seconds since the splash, life = its duration, size scales it. */
export function splash(c, x, wly, u, life, size, seed, cols = ["#F4FFFA", "#B8E8DC"], n = 18) {
  if (u < 0 || u > life) return; const g = fade(c, 1 - sm(u, life * 0.55, life));
  for (let i = 0; i < n; i++) { const vx = (rnd(seed * 97 + i) - 0.5) * 140 * size, vy = -(80 + rnd(seed * 31 + i * 7) * 120) * size, sx = x + (rnd(seed + i * 13) - 0.5) * 60 * size;
    const px = R(sx + vx * u), py = R(wly + vy * u + 520 * u * u); if (py > wly + 1) continue; const s = size > 0.7 && i % 4 === 0 ? 3 : 2; g.rect(px, py, s, s, i % 3 ? cols[0] : cols[1]); }
}
/** Ripple rings on the surface seen from the side: flat ellipses that grow and fade. */
export function ripples(c, x, wly, u, life, rMax, n = 2, col = "#E8FFF8") {
  if (u < 0 || u > life) return;
  for (let k = 0; k < n; k++) { const uk = u - k * (life / (n + 1.5)); if (uk <= 0) continue; const f = uk / life, r = 6 + rMax * ease(Math.min(1, f * 1.2)), a = (1 - f) * 0.9; if (a <= 0) continue;
    const g = fade(c, a), ry = Math.max(1.5, r * 0.09);
    for (let i = -r; i <= r; i += 1) { const v = i / r, yy = ry * Math.sqrt(Math.max(0, 1 - v * v)); if ((R(i) & 1) === 0) { g.px(R(x + i), R(wly + yy), col); if (Math.abs(v) > 0.55) g.px(R(x + i), R(wly - yy), col); } } }
}
/** One rising bubble at (x, y) of radius r. */
export function bubble(c, x, y, r, a = 1, rim = "#D8F6F0") { const g = fade(c, a); for (let q = 0; q < Math.PI * 2; q += 0.4 / Math.max(1, r * 0.5)) g.px(R(x + Math.cos(q) * r), R(y + Math.sin(q) * r), rim); g.px(R(x - r * 0.4), R(y - r * 0.4), "#FFFFFF"); }
/** V-shaped wake on the surface behind something gliding at (x, wly) with velocity dir (−1 / +1); k = strength. */
export function wake(c, x, wly, dir, k, t, col = "#E8FFF8") {
  if (k <= 0.02) return; const g = fade(c, Math.min(1, k));
  for (let i = 0; i < 30; i++) { const d = i * 2, yy = wly + R(Math.min(3, d * 0.08)); if (((i + R(t * 18)) % 3) === 0) continue; g.px(R(x - dir * d), yy, col); if (i > 6 && i % 2) g.px(R(x - dir * d), wly - 1, col); }
}
/** Comic chomp lines: bold short strokes radiating around (x, y); u = 0..1 over their life. */
export function chomp(c, x, y, u, rad = 46, col = "#FFF4C8", n = 7, spread = Math.PI * 1.2, dir = -Math.PI / 2) {
  if (u <= 0 || u >= 1) return; const g = fade(c, 1 - sm(u, 0.55, 1)), r0 = rad + 10 * ease(u), len = 11 * (1 - u * 0.45);
  for (let i = 0; i < n; i++) { const a = dir - spread / 2 + (spread * i) / Math.max(1, n - 1), ca = Math.cos(a), sa = Math.sin(a);
    for (let s = -1; s <= len + 1; s++) { const px = R(x + ca * (r0 + s)), py = R(y + sa * (r0 + s) * 0.85); g.px(px, py + 1, "#0B0812"); g.px(px + 1, py + 1, "#0B0812"); }
    for (let s = 0; s <= len; s++) { const px = R(x + ca * (r0 + s)), py = R(y + sa * (r0 + s) * 0.85); g.px(px, py, col); g.px(px + 1, py, s < len * 0.5 ? "#FFFFFF" : col); } }
}
/** "!" pop: k = 0..1 progress of its pop (back-eased bounce), a = dissolve. Centered at (x, y) = bottom of the mark. */
export function exclaim(c, x, y, k, a, col = "#FFE04A") {
  if (a <= 0 || k <= 0) return; const c1 = 1.70158 * 1.4, c3 = c1 + 1, kk = clamp01(k), b = 1 + c3 * Math.pow(kk - 1, 3) + c1 * Math.pow(kk - 1, 2);
  const s = Math.max(1, R(4 * b)), w = c.measure(MAIN, "!", { scale: s }), h = 7 * s, x0 = R(x - w / 2), y0 = R(y - h - 6 * b), g = fade(c, a * sm(k, 0, 0.25));
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [2, -2], [-2, 2], [3, 3]]) g.text(MAIN, "!", x0 + dx, y0 + dy, "#0B0812", { scale: s });
  g.text(MAIN, "!", x0, y0, col, { scale: s });
  for (let i = 0; i < 6; i++) { const ang = -Math.PI / 2 + (i - 2.5) * 0.5, r0 = h * 0.6 + 6 + 10 * kk; for (let q = 0; q < 4; q++) g.px(R(x + Math.cos(ang) * (r0 + q)), R(y0 + h / 2 + Math.sin(ang) * (r0 + q)), q < 2 ? col : "#FFFFFF"); }
}
export { hex, mix, bayer, rnd, fade, sm, ease, clamp01, lerp };
