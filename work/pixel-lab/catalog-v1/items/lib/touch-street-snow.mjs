// catalog-v1 copy (2026-10-26) of work/pixel-lab/touch/film/street.mjs#snowLayer: the hash rnd, the Bayer-dithered round
// flake (the film's (1 − d²)·alpha·1.2 > bayer rule) and the film's two flake colours. Changes: the flakes fall inside a
// box at the item's slot (box half extents × zoom z), not on a camera layer; each flake has a fixed presence order and
// fades in and out with the count n (no flake appears in one frame); the fall phase is an integral of the eased speed;
// flakes fade out at the top and bottom of the box, so a wrap-around is never a visible jump; the sway is an eased amplitude.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const FLAKES = 40;
const FL = Array.from({ length: FLAKES }, (_, i) => ({ r1: rnd(i * 31 + 3), r2: rnd(i * 17 + 9), r3: rnd(i * 7 + 15), order: rnd(i * 13 + 5) }));
const COL_SMALL = "#B4B4D2", COL_BIG = "#E8EEFF";

/** Draw the falling snow in the box centred at (cx, cy). p = { n: 0..1 count, phase: fall phase (integrated speed),
 *  sway: 0..1 amplitude, t: film time, hw, hh: half extents of the box at z 1 }. */
export function drawSnowfall(c, cx, cy, z, p) {
  const W = p.hw * z, H = p.hh * z;
  for (const f of FL) {
    const pres = clamp01((p.n * 1.15 - f.order) / 0.15);
    if (pres <= 0) continue;
    const yy = f.r2 + p.phase * (0.7 + 0.6 * f.r3), fy = yy - Math.floor(yy);      // 0..1 through the box, wraps
    const edge = sm(fy / 0.2) * sm((1 - fy) / 0.2);                                // invisible at both ends of the wrap
    const x = cx + (f.r1 * 2 - 1) * W * 0.92 + p.sway * 12 * z * Math.sin(p.t * (0.6 + f.r3) + f.r1 * 40);
    const y = cy - H + fy * 2 * H;
    const s = f.r3 < 0.45 ? 1 : f.r3 < 0.9 ? 2 : 3, col = s === 1 ? COL_SMALL : COL_BIG;
    const a = pres * edge;
    if (a <= 0) continue;
    const X = R(x), Y = R(y);
    for (let j = 0; j < s; j++) for (let k = 0; k < s; k++) {
      const d = Math.hypot(k - (s - 1) / 2, j - (s - 1) / 2) / (s / 2);
      if (d < 1 && (1 - d * d) * a * 1.2 > bayer(X + k, Y + j)) c.px(X + k, Y + j, col);
    }
  }
}
