// STREET kit: offscreen layers painted once (colour + mask), a fast masked blit, and small painting helpers.
// A Layer's surface `L.g` is a Canvas-compatible painter in the layer's own coordinates (world px for world layers),
// so every Canvas method (rect, poly, disc, text, line, tint…) paints into the layer. Pure: caches only memoise.
import { Canvas, hex, mix, bayer, MAIN, TINY, fade } from "../../../../../renderer/pixel/raster.mjs";
export { Canvas, hex, mix, bayer, MAIN, TINY, fade };

export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const lerp = (a, b, k) => a + (b - a) * k;

export class Layer {
  /** w×h pixels; (ox, oy) = the paint coordinate of pixel (0, 0). */
  constructor(w, h, ox = 0, oy = 0) {
    this.w = w; this.h = h; this.ox = ox; this.oy = oy;
    this.d = new Uint8ClampedArray(w * h * 3); this.m = new Uint8Array(w * h);
    const self = this, g = Object.create(Canvas.prototype);
    g.w = 1e9; g.h = 1e9; g.d = this.d;
    g.px = (x, y, c) => {
      if (!c) return; x = Math.floor(x - self.ox); y = Math.floor(y - self.oy); if (x < 0 || y < 0 || x >= w || y >= h) return;
      const p = hex(c), i = y * w + x; self.d[i * 3] = p[0]; self.d[i * 3 + 1] = p[1]; self.d[i * 3 + 2] = p[2]; self.m[i] = 1;
    };
    g.get = (x, y) => { x = Math.floor(x - self.ox); y = Math.floor(y - self.oy); if (x < 0 || y < 0 || x >= w || y >= h) return [0, 0, 0]; const i = (y * w + x) * 3; return [self.d[i], self.d[i + 1], self.d[i + 2]]; };
    g.has = (x, y) => { x = Math.floor(x - self.ox); y = Math.floor(y - self.oy); return x >= 0 && y >= 0 && x < w && y < h && self.m[y * w + x] === 1; };
    /** Recolour an already painted pixel toward c by k (keeps the mask). */
    g.tintPx = (x, y, c, k) => { x = Math.floor(x - self.ox); y = Math.floor(y - self.oy); if (x < 0 || y < 0 || x >= w || y >= h || k <= 0 || !self.m[y * w + x]) return; const i = (y * w + x) * 3, p = hex(c); for (let j = 0; j < 3; j++) self.d[i + j] = R(self.d[i + j] + (p[j] - self.d[i + j]) * Math.min(1, k)); };
    g.erase = (x, y) => { x = Math.floor(x - self.ox); y = Math.floor(y - self.oy); if (x < 0 || y < 0 || x >= w || y >= h) return; self.m[y * w + x] = 0; };
    this.g = g;
  }
}

/**
 * Copy layer L into canvas c with the layer's pixel (0, 0) at screen (sx, sy). Masked. o.x0/x1/y0/y1 clip in screen px;
 * o.a < 1 dissolves with an ordered dither; o.dim(x, y) → [col, k] optional per-pixel tint hook (rare).
 */
export function blit(c, L, sx, sy, o = {}) {
  sx = R(sx); sy = R(sy);
  const W = L.w, s = L.d, m = L.m, d = c.d, CW = c.w, a = o.a ?? 1;
  const xa = Math.max(o.x0 ?? 0, sx, 0), xb = Math.min(o.x1 ?? CW, sx + W, CW), ya = Math.max(o.y0 ?? 0, sy, 0), yb = Math.min(o.y1 ?? c.h, sy + L.h, c.h);
  if (xa >= xb || ya >= yb || a <= 0) return;
  for (let y = ya; y < yb; y++) {
    const row = (y - sy) * W - sx, out = y * CW;
    for (let x = xa; x < xb; x++) {
      const li = row + x; if (!m[li]) continue;
      if (a < 1 && a <= bayer(x, y)) continue;
      const p = (out + x) * 3, q = li * 3; d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2];
    }
  }
}

/** Nearest-scaled masked blit (sprites drawn bigger in the foreground); flip mirrors; a dissolves. */
export function blitScaled(c, L, sx, sy, scale, o = {}) {
  const a = o.a ?? 1, flip = !!o.flip, d = c.d, CW = c.w, w = L.w * scale, h = L.h * scale;
  const xa = Math.max(o.x0 ?? 0, Math.floor(sx), 0), xb = Math.min(o.x1 ?? CW, Math.ceil(sx + w), CW), ya = Math.max(o.y0 ?? 0, Math.floor(sy), 0), yb = Math.min(o.y1 ?? c.h, Math.ceil(sy + h), c.h);
  for (let y = ya; y < yb; y++) {
    const v = Math.floor((y + 0.5 - sy) / scale); if (v < 0 || v >= L.h) continue;
    for (let x = xa; x < xb; x++) {
      let u = Math.floor((x + 0.5 - sx) / scale); if (u < 0 || u >= L.w) continue; if (flip) u = L.w - 1 - u;
      const li = v * L.w + u; if (!L.m[li]) continue; if (a < 1 && a <= bayer(x + 1, y + 2)) continue;
      const p = (y * CW + x) * 3, q = li * 3; d[p] = L.d[q]; d[p + 1] = L.d[q + 1]; d[p + 2] = L.d[q + 2];
    }
  }
}

/** Tint screen pixels toward col by k(x, y) (quantised, Bayer-dithered). Fast integer path. */
export function tintRect(c, x0, y0, w, h, kf, col, steps = 4) {
  const C = hex(col), d = c.d, W = c.w;
  const xa = Math.max(0, x0 | 0), xb = Math.min(W, (x0 + w) | 0), ya = Math.max(0, y0 | 0), yb = Math.min(c.h, (y0 + h) | 0);
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
    const v = kf(x, y); if (!(v > 0)) continue;
    const sV = Math.min(1, v) * steps, lo = Math.floor(sV), q = (sV - lo > bayer(x, y) ? lo + 1 : lo) / steps; if (q <= 0) continue;
    const p = (y * W + x) * 3; d[p] += (C[0] - d[p]) * q; d[p + 1] += (C[1] - d[p + 1]) * q; d[p + 2] += (C[2] - d[p + 2]) * q;
  }
}

// ---------------------------------------------------------------- painting helpers (on any Canvas-like surface g)
/** Vertical gradient fill of a rect from colour a (top) to b (bottom) in `steps` dithered bands. */
export function vgrad(g, x, y, w, h, a, b, steps = 4) {
  for (let j = 0; j < h; j++) { const v = (j / Math.max(1, h - 1)) * steps, lo = Math.floor(v), fr = v - lo; for (let i = 0; i < w; i++) { const s = fr > bayer(x + i, y + j) ? lo + 1 : lo; g.px(x + i, y + j, mix(a, b, Math.min(steps, s) / steps)); } }
}
export function hline(g, x, y, w, c) { for (let i = 0; i < w; i++) g.px(x + i, y, c); }
export function vline(g, x, y, h, c) { for (let j = 0; j < h; j++) g.px(x, y + j, c); }
/** Thick polyline (radius r) in one colour. */
export function thick(g, pts, r, col) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n; for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i2 = -Math.ceil(r); i2 <= Math.ceil(r); i2++) if (i2 * i2 + j * j <= r * r + 0.3) g.px(R(x) + i2, R(y) + j, col); }
  }
}
/** Text with a 1-px dark drop shadow. */
export function stext(g, font, str, x, y, col, sh = "#140C18", o = {}) { g.text(font, str, x + 1, y + 1, sh, o); g.text(font, str, x, y, col, o); }
/** Darken/lighten helper on hex colours. */
export const shade = (c, k, to = "#2A1838") => mix(c, to, k);
export const light = (c, k, to = "#FFF2D8") => mix(c, to, k);
