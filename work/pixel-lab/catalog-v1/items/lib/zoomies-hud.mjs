// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-zoomies/film/hud.mjs soundWaves (+ its helpers otext, brush, stroke).
// Changes: import paths (C from the catalog cute kit); every size is a parameter (reach, arc thickness, scale z) instead of
// the film's fixed 34-px HUD size; the arcs' half-spread is continuous (π = rings all round … ≈ 0.75 = a cone toward the
// target) so aiming eases in; `amp` scales reach and strength (0 = silent, the arcs dissolve out); the phase comes in as
// k (continuous); an optional burst ring (`burst` 0..1) travels once beyond the arcs.
import { MAIN, fade } from "../../../../../renderer/pixel/raster.mjs";
import { C } from "./cute.mjs";

const R = Math.round, frac = (v) => v - Math.floor(v);
export const tw = (c, s, scale = 2) => c.measure(MAIN, s, { scale });
/** Pixel text with a 1-step dark outline (readable over any picture). */
export function otext(c, s, x, y, col, a = 1, scale = 2, out = C.O) {
  if (a <= 0) return; const g = fade(c, a), X = R(x), Y = R(y), d = Math.max(1, R(scale / 2));
  for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d], [d, d], [-d, d], [d, -d], [-d, -d], [d, 2 * d], [0, 2 * d]]) g.text(MAIN, s, X + dx, Y + dy, out, { scale });
  g.text(MAIN, s, X, Y, col, { scale });
}
// chunky line of square brush (radius r) — for strokes, arcs, crosses
function brush(g, x, y, r, col) { const s = Math.max(1, R(2 * r)); g.rect(Math.floor(x - s / 2 + 0.5), Math.floor(y - s / 2 + 0.5), s, s, col); }
function stroke(g, pts, w, col) { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.5)); for (let k = 0; k <= n; k++) brush(g, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, w / 2, col); } }
function arc(g, x, y, rr, ang, sp, th, col) {
  const n = Math.max(6, Math.ceil(rr * sp * 2)), pts = [];
  for (let q = 0; q <= n; q++) { const aa = ang - sp + (2 * sp * q) / n; pts.push([x + Math.cos(aa) * rr, y + Math.sin(aa) * rr]); }
  stroke(g, pts, th + 2, C.O); stroke(g, pts, th, col);
}
/**
 * Arcs spreading from (x, y). k = phase (three arcs at k, k+⅓, k+⅔ grow and fade). o = { ang (rad), spread (half-angle,
 * π = full rings), reach (px), r0, th (px, near), amp 0..1, z, col, burst 0..1, burstCol }.
 */
export function soundWaves(c, x, y, k, o = {}) {
  const amp = o.amp ?? 1, z = o.z ?? 1, reach = o.reach ?? 34, r0 = (o.r0 ?? 5) * z, col = o.col ?? C.IV, ang = o.ang ?? 0, spread = o.spread ?? 0.8;
  if (amp > 0.01) for (let i = 0; i < 3; i++) {
    const ph = frac(k + i / 3), al = amp * Math.sin(Math.PI * ph); if (al <= 0.02) continue;
    const rr = r0 + (reach - r0) * ph, sp = Math.min(Math.PI, spread * (0.75 + 0.25 * ph) + (spread >= Math.PI - 1e-3 ? 1 : 0)), th = Math.max(1, R((ph < 0.5 ? o.th ?? 3 : (o.th ?? 3) - 1) * z));
    arc(fade(c, al), x, y, rr, ang, sp, th, col);
  }
  if (o.burst > 0 && o.burst < 1) {
    const b = o.burst, rr = r0 + (reach * 1.25 - r0) * (1 - (1 - b) * (1 - b)), al = Math.sin(Math.PI * b);
    arc(fade(c, al), x, y, rr, ang, Math.min(Math.PI, spread * 1.1 + (spread >= Math.PI - 1e-3 ? 1 : 0)), Math.max(2, R(4 * z)), o.burstCol ?? C.Y);
  }
}
