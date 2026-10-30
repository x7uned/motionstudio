// catalog-v1 copy (2026-10-26) of work/pixel-lab/zombie-mouse/film/layout.mjs; changes: import paths only.
// «The last person alive» (zombie-mouse story, friend's pixel channel, 2026-10-25) — shared conventions.
// Side view. World units: at camera zoom z = 1 one world unit is one grid pixel (grid 540×960, ×2 → 1080×1920).
// Up is negative; the ground (where feet stand) is wy = 0 everywhere.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

export const GW = 540, GH = 960, FPS = 30;
export const K = 1.55;                       // world units per hero unit (people.mjs): a standing adult is ≈ 136 units tall

/** Layer transform for depth p (1 = the stairs/actor plane; < 1 further back, parallax). cam = { cx, cy, z }. */
export function layer(cam, p) {
  const z = 1 + (cam.z - 1) * p, cx = cam.cx * p, cy = cam.cy * p;
  return { z, X: (wx) => cam.sx + (wx - cx) * z, Y: (wy) => cam.sy + (wy - cy) * z, wx: (sx) => cx + (sx - cam.sx) / z, wy: (sy) => cy + (sy - cam.sy) / z };
}
export const ground = (cam) => layer(cam, 1);

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const frac = (x) => x - Math.floor(x);

/** A view of canvas c that only writes pixels whose Bayer threshold lies in [lo, hi): two complementary gates crossfade. */
export function gate(c, lo, hi) {
  if (lo <= 0 && hi >= 1) return c;
  const o = Object.create(c);
  o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) c.px(x, y, col); };
  return o;
}
