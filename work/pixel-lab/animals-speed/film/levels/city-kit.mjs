// Shared helpers for LV7 · bat cave and LV8 · city rooftop (both levels are built by the same hand):
// masked offscreen canvases (static scenery drawn once, copied row by row into the frame with clipping, a dissolve
// and an optional colour grade), a memoised sprite cache, clip views, polygon transforms, the camera curve (same
// formula as render.mjs, so the hero's screen box can be answered without importing the harness) and small pixel
// helpers. Deterministic: caches only memoise.
import { Canvas, hex, bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { CAM } from "../timeline.mjs";

export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOut = (x) => { x = clamp01(x); return 1 - Math.pow(1 - x, 3); };
export const easeIn = (x) => { x = clamp01(x); return x * x * x; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, [a, b]) => clamp01((t - a) / (b - a));

/** Canvas that also records which pixels were painted (the layer's alpha). */
export class MaskCanvas extends Canvas {
  constructor(w, h) { super(w, h, "#000000"); this.m = new Uint8Array(w * h); }
  px(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex(c), i = y * this.w + x; this.d[i * 3] = r; this.d[i * 3 + 1] = g; this.d[i * 3 + 2] = b;
    if (this.m) this.m[i] = 1;
  }
  has(x, y) { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] === 1; }
}

/** Copy the masked pixels of `src` with its top-left at screen (ox, oy). o.a dissolves; o.grade = {mul, add}; o.x0..y1 clip. */
export function blitMasked(src, dst, ox, oy, o = {}) {
  const W = src.w, a = o.a ?? 1; if (a <= 0) return;
  const y0 = Math.max(0, oy, o.y0 ?? 0), y1 = Math.min(dst.h, oy + src.h, o.y1 ?? dst.h), x0 = Math.max(0, ox, o.x0 ?? 0), x1 = Math.min(dst.w, ox + W, o.x1 ?? dst.w);
  if (x1 <= x0 || y1 <= y0) return;
  const sd = src.d, sm_ = src.m, dd = dst.d, DW = dst.w, gr = o.grade;
  const m0 = gr ? gr.mul[0] : 1, m1 = gr ? gr.mul[1] : 1, m2 = gr ? gr.mul[2] : 1, a0 = gr ? gr.add[0] : 0, a1 = gr ? gr.add[1] : 0, a2 = gr ? gr.add[2] : 0;
  for (let y = y0; y < y1; y++) {
    let li = (y - oy) * W + (x0 - ox), ci = y * DW + x0;
    for (let x = x0; x < x1; x++, li++, ci++) {
      if (!sm_[li]) continue; if (a < 1 && a <= bayer(x, y)) continue;
      const p = li * 3, q = ci * 3;
      if (gr) { dd[q] = sd[p] * m0 + a0; dd[q + 1] = sd[p + 1] * m1 + a1; dd[q + 2] = sd[p + 2] * m2 + a2; }
      else { dd[q] = sd[p]; dd[q + 1] = sd[p + 1]; dd[q + 2] = sd[p + 2]; }
    }
  }
}

/** World-space cached layer: paint with world coordinates through `g` (offset applied), blit each frame. */
export class Layer {
  constructor(wx0, wy0, wx1, wy1) {
    this.wx0 = wx0; this.wy0 = wy0; this.wx1 = wx1; this.wy1 = wy1; this.c = new MaskCanvas(wx1 - wx0, wy1 - wy0);
    const L = this, c = this.c, g = Object.create(c);
    g.px = (x, y, col) => c.px(x - L.wx0, y - L.wy0, col);
    g.get = (x, y) => c.get(x - L.wx0, y - L.wy0);
    g.has = (x, y) => c.has(x - L.wx0, y - L.wy0);
    this.g = g;
  }
  blit(dst, V, o = {}) {
    const ox = R(V.X(this.wx0)), oy = R(V.Y(this.wy0));
    const q = { ...o };
    if (o.wxa != null) q.x0 = Math.max(q.x0 ?? 0, R(V.X(o.wxa)));
    if (o.wxb != null) q.x1 = Math.min(q.x1 ?? dst.w, R(V.X(o.wxb)));
    blitMasked(this.c, dst, ox, oy, q);
  }
}

/** Memoised sprite: key → layer drawn once by paint(g, ox, oy) with the anchor at (ox, oy); blit(c, x, y, o). Small LRU. */
export function spriteCache(max = 48) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new MaskCanvas(w, h); paint(L, ox, oy);
    s = { c: L, ox, oy, blit(c, x, y, o) { blitMasked(L, c, R(x) - ox, R(y) - oy, o); } };
    map.set(key, s); if (map.size > max) map.delete(map.keys().next().value);
    return s;
  };
}

/** View of c that only writes inside [x0, x1) × [y0, y1) (screen pixels). */
export function clip(c, x0, y0, x1, y1) {
  const o = Object.create(c);
  o.px = (x, y, col) => { if (x >= x0 && x < x1 && y >= y0 && y < y1) c.px(x, y, col); };
  return o;
}
/** View of c that only writes where keep(x, y) is true. */
export function mask(c, keep) { const o = Object.create(c); o.px = (x, y, col) => { if (keep(Math.floor(x), Math.floor(y))) c.px(x, y, col); }; return o; }

/** Rotate/scale a polygon around (ox, oy), then move it by (dx, dy). */
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
/** Dotted path through points (screen), drawn up to fraction k of its length, dots every `gap` px with a dark rim. */
export function dotted(c, pts, k, col, { gap = 7, size = 2, dark = "#0B0812", from = 0, phase = 0 } = {}) {
  if (k <= 0) return;
  let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  const end = L * Math.min(1, k);
  for (let s = from * L + (((phase % gap) + gap) % gap); s <= end; s += gap) {
    let acc = 0, i = 0; while (i < seg.length - 1 && acc + seg[i] < s) acc += seg[i++];
    const f = seg[i] ? (s - acc) / seg[i] : 0, x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
    const X = R(x - size / 2), Y = R(y - size / 2);
    if (dark) c.rect(X - 1, Y - 1, size + 2, size + 2, dark); c.rect(X, Y, size, size, col);
  }
}
/** Point on a polyline at fraction f (0..1) with its direction. */
export function along(pts, f) {
  let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let s = clamp01(f) * L, i = 0; while (i < seg.length - 1 && s > seg[i]) s -= seg[i++];
  const k = seg[i] ? s / seg[i] : 0, a = pts[i], b = pts[i + 1];
  return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dx: b[0] - a[0], dy: b[1] - a[1], len: L };
}
/** Smooth Catmull-Rom path through control points, sampled n per segment (open curve). */
export function spline(pts, n = 10) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  out.push(pts[pts.length - 1]); return out;
}

// ---------------------------------------------------------------- colour grades for cached scenery
/** Blend between the identity grade and g by k. */
export function gradeK(g, k) { if (!g || k <= 0.002) return null; return { mul: g.mul.map((v) => 1 + (v - 1) * k), add: g.add.map((v) => v * k) }; }
export function graded(col, g) { if (!g) return col; const c = hex(col); return [0, 1, 2].map((j) => Math.max(0, Math.min(255, R(c[j] * g.mul[j] + g.add[j])))); }

// ---------------------------------------------------------------- camera (identical to render.mjs camera(), rounded like view())
export function camAt(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: R(a.cx + (b.cx - a.cx) * k), cy: R(a.cy + (b.cy - a.cy) * k) };
}

/** Soft dithered ellipse glow (adds light toward col by k at the centre). */
export function glow(c, x, y, rx, ry, col, k = 0.5, steps = 4) {
  c.tint(R(x - rx), R(y - ry), R(rx * 2) + 1, R(ry * 2) + 1, (X, Y) => { const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; return d >= 1 ? 0 : k * (1 - d) ** 1.4; }, col, steps);
}
export { mix, hex, bayer };
