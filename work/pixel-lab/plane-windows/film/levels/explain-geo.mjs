// Shared helpers of the EXPLAIN builder («Why airplane windows are round»): masks, polygon fill, oblique pane projection.
// Pure functions; screen space (540×960 grid).
import { mix, bayer } from "../../../../../renderer/pixel/raster.mjs";

export const GW = 540, GH = 960;
export const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
/** 0 → 1 → 0 window: in over [a, a + fi], out over [b − fo, b]. */
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b - fo, b));
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- a full-screen bit mask (reused, cleared per bounding box)
export const MASK = new Uint8Array(GW * GH);
export function bbox(polys, pad = 2) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x0: Math.max(0, Math.floor(x0) - pad), y0: Math.max(0, Math.floor(y0) - pad), x1: Math.min(GW - 1, Math.ceil(x1) + pad), y1: Math.min(GH - 1, Math.ceil(y1) + pad) };
}
export function clearMask(b) { for (let y = b.y0; y <= b.y1; y++) MASK.fill(0, y * GW + b.x0, y * GW + b.x1 + 1); }
/** Scanline polygon fill into MASK (same rule as Canvas.poly), OR-ing `bit`. */
export function fillMask(pts, bit) {
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of pts) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const xs = [];
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(GH - 1, Math.ceil(maxY)); y++) {
    const yc = y + 0.5; xs.length = 0;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.round(xs[k])), b = Math.min(GW, Math.round(xs[k + 1]));
      for (let x = a; x < b; x++) MASK[y * GW + x] |= bit;
    }
  }
}
/** Rounded rectangle outline (local coords, centred), corner radius r, n segments per corner. */
export function rrect(w, h, r, n = 7) {
  const out = [], cs = [[w / 2 - r, -h / 2 + r, -Math.PI / 2], [w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI / 2) * (i / n); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}

// ---------------------------------------------------------------- pixel helpers
/** Write colour [r,g,b] at (x, y) through a dither gate a (0..1). */
export function put(c, x, y, col, a = 1) {
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= GW || y >= GH) return; if (a < 1 && a <= bayer(x, y)) return;
  const i = (y * GW + x) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2];
}
/** Blend the pixel toward col by k (quantised to `steps`, Bayer-dithered), through a dither gate a. */
export function blend(c, x, y, col, k, a = 1, steps = 4) {
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= GW || y >= GH || k <= 0) return; if (a < 1 && a <= bayer(x, y)) return;
  const s = Math.min(1, k) * steps, lo = Math.floor(s), q = (s - lo > bayer(x + 1, y + 2) ? lo + 1 : lo) / steps; if (q <= 0) return;
  const i = (y * GW + x) * 3; c.d[i] += (col[0] - c.d[i]) * q; c.d[i + 1] += (col[1] - c.d[i + 1]) * q; c.d[i + 2] += (col[2] - c.d[i + 2]) * q;
}
export const rgb = (h) => mix(h, h, 0);
/** Thick dot/line helpers through a dither gate. */
export function line(c, x0, y0, x1, y1, col, a = 1, w = 1, dash = null) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) {
    if (dash && i % (dash[0] + dash[1]) >= dash[0]) continue;
    const x = R(x0 + ((x1 - x0) * i) / n), y = R(y0 + ((y1 - y0) * i) / n);
    for (let dy = 0; dy < w; dy++) for (let dx = 0; dx < w; dx++) put(c, x + dx - (w >> 1), y + dy - (w >> 1), col, a);
  }
}
