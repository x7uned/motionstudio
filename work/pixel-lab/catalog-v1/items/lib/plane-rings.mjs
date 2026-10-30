// catalog-v1 copy (2026-10-26) of work/pixel-lab/plane/film/render.mjs#rings (L50–53, the yellow rings of the plane's radio).
// Changes: the film's emission list (RING_TIMES, a fixed timeline) becomes an integrated phase: ring k is born at phase
// k·SPACING and lives LIFE phase units, so a rate change never moves a ring by a jump. A ring fades in from its birth (the
// film's ring starts as a 2-px dot), and its dots are gated per pixel by a dither alpha, so an arc cone can narrow
// continuously. Colour, the radius law (u^0.8) and the 2×2 dot pattern (every third dot skipped) are the film's.
import { fade } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round, TAU = Math.PI * 2, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const SPACING = 0.5, LIFE = 2, MAX_RINGS = 6;

/** Rings around (sx, sy). ph = integrated emission phase (≥ 0), maxR = radius at the end of a ring's life (grid px),
 *  on = strength 0..1, aim / half = cone of arcs (half = PI means all round). */
export function rings(c, sx, sy, ph, maxR, on, col, aim = 0, half = Math.PI) {
  if (on <= 0.005 || maxR < 2) return;
  const k0 = Math.floor(ph / SPACING);
  for (let j = 0; j <= MAX_RINGS; j++) {
    const pk = (k0 - j) * SPACING;
    if (pk < 0) break;                                   // nothing is emitted before the start: no ring pops in
    const u = (ph - pk) / LIFE;
    if (u < 0 || u >= 1) continue;
    const a = on * (1 - u) * sm(u, 0, 0.12), rr = maxR * Math.pow(u, 0.8);
    if (a <= 0.005 || rr < 2) continue;
    const n = Math.max(24, R(rr * 1.4));
    for (let k = 0; k < n; k++) {
      if (k % 3 === 2) continue;
      const an = (k / n) * TAU;
      const d = Math.abs(Math.atan2(Math.sin(an - aim), Math.cos(an - aim)));
      const al = a * clamp01((half - d) / 0.12 + 1);     // 1 inside the cone, dithers out over 0.12 rad at its edge
      if (al <= 0.005) continue;
      fade(c, al).rect(R(sx + Math.cos(an) * rr), R(sy + Math.sin(an) * rr), 2, 2, col);
    }
  }
}
