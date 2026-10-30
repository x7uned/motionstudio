// Trial 10 s — shared helpers, copied from effort-exp-2026-10-25/xhigh/film/layout.mjs (camera keys now come from the plan).
// two-shot at camera zoom 1 (that composition is the world). Layers with depth p parallax around the wide-shot centre.
import { bayer, hex } from "../../../../../renderer/pixel/raster.mjs";


export const GW = 540, GH = 960, TAU = Math.PI * 2, R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeIn = (x) => Math.pow(clamp01(x), 3);
export const backOut = (x, s = 1.6) => { x = clamp01(x) - 1; return 1 + x * x * ((s + 1) * x + s); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
export const kOf = (t, w) => clamp01((t - w[0]) / (w[1] - w[0]));
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const frac = (x) => x - Math.floor(x);
/** Smooth value noise in 1D (for flicker): continuous, deterministic. */
export const noise1 = (x, seed = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rnd(i * 7 + seed * 131), rnd((i + 1) * 7 + seed * 131), u); };
/** Candle flicker around 1 (smooth, no one-frame jumps). */
export const flicker = (t, seed = 0) => 0.95 + 0.045 * noise1(t * 3.2, seed) + 0.025 * noise1(t * 7.5, seed + 3) - 0.02 * Math.max(0, Math.sin(t * 2.3 + seed));

/** Layer transform for depth p (1 = the pumpkin / hay plane). X(wx) → screen. */
export function layer(cam, p) {
  const z = 1 + (cam.z - 1) * p, cx = 270 + (cam.cx - 270) * p, cy = 450 + (cam.cy - 450) * p;
  return { z, p, X: (wx) => 270 + (wx - cx) * z, Y: (wy) => 450 + (wy - cy) * z, wx: (sx) => cx + (sx - 270) / z, wy: (sy) => cy + (sy - 450) / z };
}

/** A view of canvas c that only writes pixels whose Bayer threshold lies in [lo, hi): complementary gates crossfade. */
export function gate(c, lo, hi) {
  if (lo <= 0 && hi >= 1) return c;
  const o = Object.create(c);
  o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) c.px(x, y, col); };
  return o;
}
/** Pick a colour from a ramp at level v ∈ [0,1] with ordered dithering between neighbours. */
export function ramp(RAMP, v, x, y) {
  const s = clamp01(v) * (RAMP.length - 1), i = Math.floor(s), f = s - i;
  return RAMP[Math.min(RAMP.length - 1, f > bayer(x, y) ? i + 1 : i)];
}
/** Flat tone bands: like ramp() but only a narrow dithered seam (width w of a step) between neighbouring tones. */
export function band(RAMP, v, x, y, w = 0.34) {
  const s = clamp01(v) * (RAMP.length - 1), i = Math.floor(s), f = s - i, lo = 0.5 - w / 2;
  const k = f <= lo ? 0 : f >= 1 - lo ? 1 : (f - lo) / w;
  return RAMP[Math.min(RAMP.length - 1, k > bayer(x, y) ? i + 1 : i)];
}
/** Blend rgb toward colour c by k (no dithering), returns rgb array. */
export const toward = (p, c, k) => { const q = hex(c); return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k]; };
/** Dithered quantised tint of the pixel at (x, y) of canvas c toward colour col by k (steps levels). */
export function tintPx(c, x, y, col, k, steps = 4) {
  if (k <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const s = Math.min(1, k) * steps, lo = Math.floor(s), q = (s - lo > bayer(x, y) ? lo + 1 : lo) / steps;
  if (q <= 0) return;
  const i = (y * c.w + x) * 3, t = hex(col);
  c.d[i] += (t[0] - c.d[i]) * q; c.d[i + 1] += (t[1] - c.d[i + 1]) * q; c.d[i + 2] += (t[2] - c.d[i + 2]) * q;
}
