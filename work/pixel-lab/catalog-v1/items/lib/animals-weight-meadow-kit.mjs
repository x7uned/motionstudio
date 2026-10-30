// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-weight/film/levels/meadow-kit.mjs (byte-identical in animals-wingbeat/film/levels); changes: cute import re-pointed to ./cute.mjs (catalog lib).
// Helpers for my levels (meadow / cuba here; meadow / gorge in the heart film — the same file is copied there):
// world-space cached layers (offscreen canvas + coverage mask, copied row by row into the frame with clipping and an
// optional time-of-day colour grade), memoised sprites, and small pixel-art props (flowers, tufts, clover, leaf balls,
// dotted paths). Adapted from the first film's meadow-kit / bay-kit. Deterministic: caches only memoise.
import { Canvas, hex, bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, fade, MAIN } from "./cute.mjs";

const R = Math.round;

/** Canvas that also records which pixels were painted (the layer's alpha). */
export class MaskCanvas extends Canvas {
  constructor(w, h) { super(w, h, "#000000"); this.m = new Uint8Array(w * h); }
  px(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex(c), i = y * this.w + x; this.d[i * 3] = r; this.d[i * 3 + 1] = g; this.d[i * 3 + 2] = b;
    if (this.m) this.m[i] = 1;
  }
  blend(x, y, col, k) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h || !this.m[y * this.w + x]) return; this.px(x, y, mix(this.get(x, y), col, k)); }
}

/** Copy the masked pixels of `src` (MaskCanvas) with its top-left at screen (ox, oy). o.a dissolves; o.grade = {mul, add}. */
function blitMasked(src, dst, ox, oy, o = {}) {
  const W = src.w, a = o.a ?? 1; if (a <= 0) return;
  const y0 = Math.max(0, oy, o.y0 ?? 0), y1 = Math.min(dst.h, oy + src.h, o.y1 ?? dst.h), x0 = Math.max(0, ox, o.x0 ?? 0), x1 = Math.min(dst.w, ox + W, o.x1 ?? dst.w);
  if (x1 <= x0 || y1 <= y0) return;
  const sd = src.d, sm = src.m, dd = dst.d, DW = dst.w, gr = o.grade, mk = dst._mk;
  const m0 = gr ? gr.mul[0] : 1, m1 = gr ? gr.mul[1] : 1, m2 = gr ? gr.mul[2] : 1, a0 = gr ? gr.add[0] : 0, a1 = gr ? gr.add[1] : 0, a2 = gr ? gr.add[2] : 0;
  for (let y = y0; y < y1; y++) {
    let li = (y - oy) * W + (x0 - ox), ci = y * DW + x0;
    for (let x = x0; x < x1; x++, li++, ci++) {
      if (!sm[li]) continue; if (a < 1 && a <= bayer(x, y)) continue;
      const p = li * 3, q = ci * 3; if (mk) mk[ci] = 1;
      if (gr) { dd[q] = sd[p] * m0 + a0; dd[q + 1] = sd[p + 1] * m1 + a1; dd[q + 2] = sd[p + 2] * m2 + a2; }
      else { dd[q] = sd[p]; dd[q + 1] = sd[p + 1]; dd[q + 2] = sd[p + 2]; }
    }
  }
}

/** World-space cached layer: draw with world coordinates through `g` (offset applied), blit each frame. */
export class Layer {
  constructor(wx0, wy0, wx1, wy1) {
    this.wx0 = wx0; this.wy0 = wy0; this.c = new MaskCanvas(wx1 - wx0, wy1 - wy0);
    const L = this, c = this.c, g = Object.create(c);
    g.px = (x, y, col) => c.px(x - L.wx0, y - L.wy0, col);
    g.get = (x, y) => c.get(x - L.wx0, y - L.wy0);
    g.blend = (x, y, col, k) => c.blend(x - L.wx0, y - L.wy0, col, k);
    g.has = (x, y) => { x = Math.floor(x - L.wx0); y = Math.floor(y - L.wy0); return x >= 0 && y >= 0 && x < c.w && y < c.h && c.m[y * c.w + x] === 1; };
    this.g = g;
  }
  blit(dst, V, o) { blitMasked(this.c, dst, R(V.X(this.wx0)), R(V.Y(this.wy0)), o); }
}

/** Memoised sprite: key → layer drawn once by paint(g, ox, oy) with the anchor at (ox, oy); blit(c, x, y, o). Small LRU. */
export function spriteCache(max = 48) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new MaskCanvas(w, h); paint(L, ox, oy);
    s = { c: L, blit(c, x, y, o) { blitMasked(L, c, R(x) - ox, R(y) - oy, o); } };
    map.set(key, s); if (map.size > max) map.delete(map.keys().next().value);
    return s;
  };
}

// ---------------------------------------------------------------- time-of-day colour grade for cached scenery
// tod T (cyclic 0..7): 0 dawn · 1 morning · 2 day · 3 afternoon · 4 golden · 5 dusk · 6 night. Art is painted for `base`;
// grade(T) returns {mul, add} that shifts it toward the look of T (null when it is the base look).
const LOOKS = {
  0: { mul: [0.9, 0.8, 0.86], add: [24, 8, 18] }, 1: { mul: [1, 1, 1], add: [0, 0, 0] }, 2: { mul: [1, 1, 1], add: [0, 0, 0] },
  3: { mul: [1.02, 0.97, 0.9], add: [6, 2, 0] }, 4: { mul: [1.04, 0.86, 0.66], add: [18, 6, 0] }, 5: { mul: [0.82, 0.58, 0.62], add: [22, 4, 16] },
  6: { mul: [0.34, 0.36, 0.6], add: [6, 6, 28] }, 7: { mul: [0.9, 0.8, 0.86], add: [24, 8, 18] },
};
export function grade(T) {
  T = ((T % 7) + 7) % 7; const i = Math.floor(T), k = T - i, A = LOOKS[i], B = LOOKS[i + 1], s = k * k * (3 - 2 * k);
  const g = { mul: A.mul.map((v, j) => v + (B.mul[j] - v) * s), add: A.add.map((v, j) => v + (B.add[j] - v) * s) };
  return Math.abs(g.mul[0] - 1) + Math.abs(g.mul[1] - 1) + Math.abs(g.mul[2] - 1) + Math.abs(g.add[0]) + Math.abs(g.add[2]) < 0.01 ? null : g;
}
/** Apply a grade to an arbitrary colour (for per-frame props drawn outside the cached layers). */
export function graded(col, g) { if (!g) return col; const c = hex(col); return [0, 1, 2].map((j) => Math.max(0, Math.min(255, R(c[j] * g.mul[j] + g.add[j])))); }

// ---------------------------------------------------------------- small props (draw through any canvas-like g)
/** Small 5-petal flower (s = petal radius 1..6) at x, y (centre), petals col, centre eye. */
export function flower(g, x, y, s, col, eye = "#F8D040", dark = null) {
  x = R(x); y = R(y);
  if (s <= 1) { g.px(x, y, col); g.px(x - 1, y, col); g.px(x + 1, y, col); g.px(x, y - 1, col); g.px(x, y + 1, dark ?? col); g.px(x, y, eye); return; }
  const d = dark ?? mix(col, "#000000", 0.25);
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5, px = x + Math.cos(a) * s * 0.95, py = y + Math.sin(a) * s * 0.95, r = s * 0.62;
    for (let Y = R(py - r); Y <= R(py + r); Y++) for (let X = R(px - r); X <= R(px + r); X++) if ((X - px) ** 2 + (Y - py) ** 2 <= r * r + 0.4) g.px(X, Y, Y > y + s * 0.3 ? d : col);
  }
  const er = Math.max(1, s * 0.42);
  for (let Y = R(y - er); Y <= R(y + er); Y++) for (let X = R(x - er); X <= R(x + er); X++) if ((X - x) ** 2 + (Y - y) ** 2 <= er * er + 0.3) g.px(X, Y, eye);
  if (s >= 3) g.px(x - 1, y - 1, mix(eye, "#FFFFFF", 0.5));
}
/** Stem from (x, y0) down to (x + lean, y1), with an optional leaf. */
export function stem(g, x, y0, y1, col, lean = 0, leaf = true) {
  const n = Math.max(1, y1 - y0);
  for (let i = 0; i <= n; i++) { const k = i / n; g.px(R(x + lean * (1 - k) * (1 - k)), y0 + i, col); }
  if (leaf && n > 8) { const ly = R(y0 + n * 0.6), lx = R(x + lean * 0.16); g.px(lx + 1, ly, col); g.px(lx + 2, ly - 1, col); g.px(lx + 3, ly - 1, col); g.px(lx - 1, ly + 2, col); g.px(lx - 2, ly + 1, col); }
}
/** Grass tuft of n blades (h tall) at the ground point x, y. cols = [dark, mid, light]. sway shifts the tips. */
export function tuft(g, x, y, h, n, cols, seed = 0, sway = 0) {
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 2 + R((rnd(seed + i * 3) - 0.5) * 2), bh = h * (0.6 + rnd(seed + i * 7) * 0.5), lean = (rnd(seed + i * 11) - 0.5) * h * 0.5 + sway;
    const col = cols[Math.min(cols.length - 1, i % cols.length)];
    for (let j = 0; j <= bh; j++) { const k = j / bh; g.px(R(bx + lean * k * k), R(y - j), j > bh * 0.65 ? cols[cols.length - 1] : col); }
  }
}
/** Clover: three round leaflets (r ~2) around x, y. */
export function clover(g, x, y, col, hi) {
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2]]) { const cx = x + dx, cy = y + dy; for (let Y = cy - 1; Y <= cy + 1; Y++) for (let X = cx - 1; X <= cx + 1; X++) if (Math.abs(X - cx) + Math.abs(Y - cy) <= 1 || (X === cx - 1 && Y === cy - 1)) g.px(X, Y, col); g.px(cx - 1 + (dx < 0 ? 0 : 1), cy - 1, hi); }
  g.px(x, y + 2, col);
}
/** Leafy cluster ball (canopy/hedge chunk): dithered tone bands lit from the upper left, bumpy outline. */
export function leafBall(g, cx, cy, r, ramp, seed = 0, o = {}) {
  const out = o.outline ?? ramp[0], bumps = o.bumps ?? 9, amp = o.amp ?? 0.12, sy = o.sy ?? 1;
  const rad = (a) => r * (1 + amp * Math.sin(a * bumps + seed) + amp * 0.5 * Math.sin(a * (bumps * 2 + 1) + seed * 2.3));
  for (let Y = R(cy - r * 1.25 * sy); Y <= R(cy + r * 1.25 * sy); Y++) for (let X = R(cx - r * 1.25); X <= R(cx + r * 1.25); X++) {
    const dx = X - cx, dy = (Y - cy) / sy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), rr = rad(a);
    if (d > rr) continue;
    if (d > rr - 1.1) { g.px(X, Y, out); continue; }
    const lx = (-dx * 0.6 - dy * 0.8) / r, v = 0.5 + lx * 0.45 - (d / rr) * 0.18 + (o.lift ?? 0);
    const n = ramp.length - 1, s = Math.max(1, Math.min(n, v * n + (rnd((X * 31 + Y * 17) ^ seed) - 0.5) * 0.9)), lo = Math.floor(s);
    g.px(X, Y, ramp[Math.min(n, s - lo > bayer(X, Y) ? lo + 1 : lo)]);
  }
}
/** Dotted path through points (screen), drawn up to fraction k (0..1) of its length, dots every `gap` px. */
export function dotted(c, pts, k, col, { gap = 7, size = 2, a = 1, dark = "#0B0812", from = 0 } = {}) {
  if (k <= 0 || a <= 0) return; const g = fade(c, a);
  let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  const end = L * Math.min(1, k);
  for (let s = from * L; s <= end; s += gap) {
    let acc = 0, i = 0; while (i < seg.length - 1 && acc + seg[i] < s) acc += seg[i++];
    const f = seg[i] ? (s - acc) / seg[i] : 0, x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
    const X = R(x - size / 2), Y = R(y - size / 2);
    g.rect(X - 1, Y - 1, size + 2, size + 2, dark); g.rect(X, Y, size, size, col);
  }
}
/** Point and tangent at fraction f of a polyline. */
export function along(pts, f) {
  let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let s = Math.max(0, Math.min(1, f)) * L, i = 0; while (i < seg.length - 1 && s > seg[i]) s -= seg[i++];
  const k = seg[i] ? s / seg[i] : 0, a = pts[i], b = pts[i + 1];
  return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dx: b[0] - a[0], dy: b[1] - a[1] };
}
/** Rotate/scale a polygon around (ox, oy). */
export function xform(poly, ox, oy, ang = 0, sx = 1, sy = sx, dx = 0, dy = 0) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return poly.map(([x, y]) => { const u = (x - ox) * sx, v = (y - oy) * sy; return [ox + dx + u * c - v * s, oy + dy + u * s + v * c]; });
}
/** Thick pixel polyline (radius r, round caps) in one colour. */
export function thick(g, pts, r, col) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n; for (let j = -r; j <= r; j++) for (let i2 = -r; i2 <= r; i2++) if (i2 * i2 + j * j <= r * r + 0.5) g.px(R(x) + i2, R(y) + j, col); }
  }
}
/** Periodic helpers for loop films: integer cycles over the loop length `P` (so f(0) = f(P)). */
export const osc = (t, P, n, ph = 0) => Math.sin((2 * Math.PI * n * t) / P + ph);
export const cyc = (t, P, n, ph = 0) => { const v = (n * t) / P + ph; return v - Math.floor(v); };

// ---------------------------------------------------------------- ground look shared by my land levels
export const GRASS = ["#B4E07A", "#A2D86E", "#8ECC62", "#7CBE58", "#6AB04E", "#5AA046", "#4C9040", "#40803A", "#36713A", "#2C6234", "#24542E"];
/** Ground ramp by depth below the ground line (perspective: narrow bands near the horizon). */
export function grassAt(x, y, d, ramp = GRASS, shift = 0) {
  const v = Math.min(ramp.length - 1.001, Math.sqrt(Math.max(0, d) / 330) * 6.6 + shift), lo = Math.floor(v), fr = v - lo;
  return ramp[Math.min(ramp.length - 1, fr > 0.5 + 0.45 * (bayer(x, y) - 0.5) ? lo + 1 : lo)];
}
/** Two rows of soft distant hills behind the ground line `land` for world columns x0..x1; heights from far(x)/near(x). */
export function paintHills(g, x0, x1, land, farH, nearH, far = ["#9CCBB0", "#AAD6B6", "#BBE2BE", "#CDEBC8"], near = ["#6FB06A", "#7EBE72", "#90CC7C", "#A6DA8C"]) {
  for (let x = x0; x < x1; x++) {
    const hf = farH(x), hn = nearH(x);
    if (hf > 0.5) for (let y = Math.round(land - hf); y < land; y++) { const k = (y - (land - hf)) / Math.max(1, hf); const s = k < 0.06 ? 3 : k < 0.3 ? ((k - 0.06) / 0.24 > bayer(x, y) ? 2 : 3) : k < 0.7 ? 2 - ((k - 0.3) / 0.4 > bayer(x, y) ? 1 : 0) : 1; g.px(x, y, far[s]); }
    if (hn > 0.5) for (let y = Math.round(land - hn); y < land; y++) { const k = (y - (land - hn)) / Math.max(1, hn); const s = k < 0.08 ? 3 : k < 0.35 ? 2 : k < 0.75 ? ((k - 0.35) / 0.4 > bayer(x, y) ? 1 : 2) : 0; g.px(x, y, near[s]); }
  }
}
export { R };

/**
 * Grade-able drawing view: draw through `view.g` (writes go to c and mark a mask), then `view.apply(grade)` recolours
 * every marked pixel once (time-of-day tint for per-frame actors). Sprite blits mark the mask too (via c._mk).
 */
let MK = null;
export function gradeView(c) {
  const n = c.w * c.h; if (!MK || MK.length !== n) MK = new Uint8Array(n); else MK.fill(0);
  const mk = MK, g = Object.create(c), W = c.w;
  g.px = (x, y, col) => { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= W || y >= c.h) return; c.px(x, y, col); mk[y * W + x] = 1; };
  g._mk = mk;
  return { g, apply(gr) { if (!gr) return; const d = c.d; for (let i = 0; i < n; i++) if (mk[i]) { const q = i * 3; d[q] = d[q] * gr.mul[0] + gr.add[0]; d[q + 1] = d[q + 1] * gr.mul[1] + gr.add[1]; d[q + 2] = d[q + 2] * gr.mul[2] + gr.add[2]; } } };
}

// ---------------------------------------------------------------- text with a readable comma
/** MAIN with a taller comma (a dot plus a tail below the baseline), so 1,260 never reads as 1.260. */
export const MAINC = { ...MAIN, glyphs: { ...MAIN.glyphs, ",": ["..", "..", "..", "..", "..", "##", "##", ".#", "#."] } };
/** cute.pickup() with the MAINC font: "1,260 BPM" rises from (x, y) and dissolves; k = 0..1 over its ~1.6 s life. */
export function pickupC(c, x, y, text, k, col = "#F4CA50") {
  if (k <= 0 || k >= 1) return; const sm = (v, a, b) => { const q = Math.max(0, Math.min(1, (v - a) / (b - a))); return q * q * (3 - 2 * q); };
  const e = (q) => { q = Math.max(0, Math.min(1, q)); return q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2; };
  const a = Math.min(sm(k, 0, 0.18), 1 - sm(k, 0.75, 1)), yy = R(y - 26 * e(Math.min(1, k * 1.6))), s = 3, w = c.measure(MAINC, text, { scale: s }), x0 = R(x - w / 2), g = fade(c, a);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 2]]) g.text(MAINC, text, x0 + dx, yy + dy, "#0B0812", { scale: s });
  g.text(MAINC, text, x0, yy, col, { scale: s });
  for (let i = 0; i < 6; i++) { const ang = i * 1.047 + k * 3, rr = w * 0.55 + 8 * k; const px = R(x + Math.cos(ang) * rr), py = R(yy + 10 + Math.sin(ang) * 18); if (rnd(i + 7) < 0.8) { g.px(px, py, "#FFFFFF"); g.px(px + 1, py, col); } }
}
