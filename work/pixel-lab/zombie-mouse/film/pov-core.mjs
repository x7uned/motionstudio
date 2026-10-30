// «The last person alive» · Builder P — shared helpers for the first-person shots (pov.mjs).
// Fast value noise from a precomputed grid, ordered-dither quantisation, a pinhole camera, direct RGB writes,
// and a scanline polygon filler with a per-pixel shader. Pure functions; no Math.random.
import { rnd } from "./layout.mjs";

export const GW = 540, GH = 960;
const R = Math.round;

// ---------------------------------------------------------------- Bayer 4×4 thresholds (same as raster.mjs bayer)
const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export const BT = new Float32Array(16);
for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) BT[(y << 2) | x] = (BAY[y][x] + 0.5) / 16;
export const bay = (x, y) => BT[((y & 3) << 2) | (x & 3)];

/** Quantise v to n steps with an ordered dither between steps (threshold b). */
export const qd = (v, n, b) => { const s = v * n, lo = Math.floor(s); return (s - lo > b ? lo + 1 : lo) / n; };

// ---------------------------------------------------------------- value noise on a 256² grid (wrapping)
const NG = 256, NOISE = new Float32Array(NG * NG);
for (let i = 0; i < NG * NG; i++) NOISE[i] = rnd(i * 7 + 13);
export function vn(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let xf = x - xi, yf = y - yi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf);
  const x0 = xi & 255, y0 = yi & 255, x1 = (x0 + 1) & 255, y1 = (y0 + 1) & 255;
  const a = NOISE[(y0 << 8) | x0], b = NOISE[(y0 << 8) | x1], c = NOISE[(y1 << 8) | x0], d = NOISE[(y1 << 8) | x1];
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
export const fbm = (x, y) => 0.55 * vn(x, y) + 0.3 * vn(x * 2.07 + 17.3, y * 2.07 + 5.1) + 0.15 * vn(x * 4.3 + 3.7, y * 4.3 + 29.9);
/** 1-D noise (smooth). */
export const n1 = (x) => vn(x, 7.31);

// ---------------------------------------------------------------- colours
export const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };

/** Write an [r,g,b] (0..255 floats ok) at (x, y). */
export function put(c, x, y, r, g, b) {
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const k = (y * c.w + x) * 3; c.d[k] = r; c.d[k + 1] = g; c.d[k + 2] = b;
}
/** Blend toward colour col by a (0..1) at (x, y). */
export function blend(c, x, y, col, a) {
  x |= 0; y |= 0; if (a <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const k = (y * c.w + x) * 3, d = c.d; d[k] += (col[0] - d[k]) * a; d[k + 1] += (col[1] - d[k + 1]) * a; d[k + 2] += (col[2] - d[k + 2]) * a;
}
/** Dithered coverage: paint col where a beats the Bayer threshold. */
export function dput(c, x, y, col, a) {
  x |= 0; y |= 0; if (a <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  if (a < 1 && a <= BT[((y & 3) << 2) | (x & 3)]) return;
  const k = (y * c.w + x) * 3; c.d[k] = col[0]; c.d[k + 1] = col[1]; c.d[k + 2] = col[2];
}

/**
 * Scanline fill of a polygon [[x,y],…] (screen). shade(X, Y) → [r,g,b] | null; or a fixed colour. alpha (dither) optional.
 */
export function fillPoly(c, pts, col, alpha = 1) {
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(c.h - 1, Math.ceil(maxY));
  const xs = [];
  const fn = typeof col === "function";
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5; xs.length = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, R(xs[k])), xb = Math.min(c.w, R(xs[k + 1]));
      for (let x = xa; x < xb; x++) {
        if (alpha < 1 && alpha <= BT[((y & 3) << 2) | (x & 3)]) continue;
        const cc = fn ? col(x, y) : col; if (!cc) continue;
        const i = (y * c.w + x) * 3; c.d[i] = cc[0]; c.d[i + 1] = cc[1]; c.d[i + 2] = cc[2];
      }
    }
  }
}

/** Thick line (screen), round-ish: a stamped disc of radius rad along the segment. */
export function thick(c, x0, y0, x1, y1, rad, col, alpha = 1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const rr = rad * rad + rad * 0.5, ri = Math.ceil(rad);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    if (rad < 0.75) { dput(c, R(x), R(y), col, alpha); continue; }
    for (let dy = -ri; dy <= ri; dy++) for (let dx = -ri; dx <= ri; dx++) if (dx * dx + dy * dy <= rr) dput(c, R(x + dx), R(y + dy), col, alpha);
  }
}

/** Soft additive-ish glow: blend toward col by a·falloff inside radius rad (ellipse ry/rx = sy), quantised + dithered. */
export function glow(c, cx, cy, rad, col, a, sy = 1, steps = 4) {
  if (a <= 0 || rad <= 0) return;
  const x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(c.w - 1, Math.ceil(cx + rad));
  const y0 = Math.max(0, Math.floor(cy - rad * sy)), y1 = Math.min(c.h - 1, Math.ceil(cy + rad * sy));
  const d = c.d, w = c.w;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x + 0.5 - cx) / rad, dy = (y + 0.5 - cy) / (rad * sy), q = 1 - (dx * dx + dy * dy);
    if (q <= 0) continue;
    const vv = a * q * q * steps, lo = vv | 0, fr = vv - lo, v = (fr < 0.36 ? lo : fr > 0.64 ? lo + 1 : (fr - 0.36) * 3.57 > BT[((y & 3) << 2) | (x & 3)] ? lo + 1 : lo) / steps;
    if (v <= 0) continue;
    const k = (y * w + x) * 3, m = Math.min(1, v);
    d[k] += (col[0] - d[k]) * m; d[k + 1] += (col[1] - d[k + 1]) * m; d[k + 2] += (col[2] - d[k + 2]) * m;
  }
}

/** An offscreen RGBA-like layer (rgb + alpha mask) for pre-rendered sprites. */
export class Sprite {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Float32Array(w * h * 3); this.m = new Uint8Array(w * h); }
  px(x, y, col) {
    x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x, k = i * 3; this.d[k] = col[0]; this.d[k + 1] = col[1]; this.d[k + 2] = col[2]; this.m[i] = 1;
  }
  get(x, y) { x = Math.max(0, Math.min(this.w - 1, x | 0)); y = Math.max(0, Math.min(this.h - 1, y | 0)); const k = (y * this.w + x) * 3; return [this.d[k], this.d[k + 1], this.d[k + 2]]; }
}
