// Small helpers shared by my two levels (LV9 porch, LV10 marsh): the graded yard/bank lawn, fireflies, leaf shapes.
// Re-exports the cute.mjs helpers both levels use. Deterministic (rnd only), no state.
import { GRASS, grassAt } from "./meadow-kit.mjs";
import { sign, fade, mix, bayer, sm, ease, win, lerp, rnd, blinkAt, clamp01 } from "../cute.mjs";
export { sign, fade, mix, bayer, sm, ease, win, lerp, rnd, blinkAt, clamp01 };
const R = Math.round;

/** Lawn ground (the shared meadow GRASS look, perspective tone bands + short blades) into canvas g where inside(x, y). */
export function paintLawn(g, x0, x1, y0, y1, inside, seed = 0) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (inside(x, y)) g.px(x, y, grassAt(x, y, y - y0, GRASS));
  for (let i = 0; i < (x1 - x0) * (y1 - y0) * 0.02; i++) {
    const y = R(y0 + 2 + Math.pow(rnd(seed + i * 3 + 1), 1.3) * (y1 - y0 - 2)), x = R(x0 + rnd(seed + i * 3 + 2) * (x1 - x0)), d = y - y0, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4;
    if (!inside(x, y)) continue;
    const col = rnd(seed + i * 5) < 0.6 ? mix(g.get(x, y), "#1E5A2A", 0.32) : mix(g.get(x, y), "#E8FFB0", 0.3);
    for (let j = 0; j < h; j++) if (inside(x, y - j)) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col);
  }
}
/** A firefly: a tiny yellow-green core with a dithered halo; glow 0..1. */
export function firefly(c, x, y, glow) {
  if (glow < 0.03) return;
  for (let Y = y - 5; Y <= y + 5; Y++) for (let X = x - 5; X <= x + 5; X++) { const d = Math.hypot(X - x, Y - y); if (d > 5) continue; const k = (1 - d / 5) ** 1.5 * glow; if (k > bayer(X, Y) + 0.05) c.px(X, Y, mix(c.get(X, Y), "#D8FF7A", 0.45)); }
  if (glow > 0.25) { c.px(x, y, "#FFFFD0"); c.px(x + 1, y, "#E8FF90"); if (glow > 0.6) { c.px(x, y + 1, "#E8FF90"); c.px(x + 1, y + 1, "#C8F060"); } }
  else c.px(x, y, "#A8C850");
}
/** Outline polygon of a pointed leaf from its base (x, y) along angle ang, length ≈ 1.2 r. */
export function leafPoly(x, y, r, ang) {
  const pts = [], n = 16, L = r * 1.25, cs = Math.cos(ang), sn = Math.sin(ang);
  for (let i = 0; i <= n; i++) { const u = (i / n) * L, half = Math.sin(Math.PI * Math.min(1, u / (r * 1.2))) * r * 0.48 + 0.6; pts.push([u, -half]); }
  for (let i = n; i >= 0; i--) { const u = (i / n) * L, half = Math.sin(Math.PI * Math.min(1, u / (r * 1.2))) * r * 0.48 + 0.6; pts.push([u, half]); }
  return pts.map(([u, v]) => [x + u * cs - v * sn, y + u * sn + v * cs]);
}

// ---------------------------------------------------------------- far hills shared by the porch and the marsh
// One height profile and one colour blend by WORLD x, so the dusk hills behind the porch run on into the darker
// late-dusk hills of the marsh without a seam at x 4860.
const hillFar = (wx) => 46 + 13 * Math.sin(wx * 0.013 + 1.2) + 7 * Math.sin(wx * 0.037 + 0.4);
const hillNear = (wx) => 22 + 8 * Math.sin(wx * 0.021 + 3.1) + 4 * Math.sin(wx * 0.07);
const smooth = (x, a, b) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const HF = [["#A85C88", "#9A5080", "#8A4676"], ["#5E3A70", "#4A3064", "#3E2858"]], HN = [["#6E3A68", "#5C305C", "#4C2850"], ["#3A264E", "#2C1E44", "#271A40"]];
/** Paint the far and near hills into g (local x0..x1, world x = ox + x) down to the ground line `land` (local y). */
export function paintDuskHills(g, x0, x1, ox, land = 640) {
  for (let x = x0; x < x1; x++) {
    const wx = ox + x, k = smooth(wx, 4700, 4990), F = HF[0].map((c, i) => mix(c, HF[1][i], k)), N = HN[0].map((c, i) => mix(c, HN[1][i], k)), hf = hillFar(wx), hn = hillNear(wx);
    for (let y = R(land - hf); y < land; y++) { const q = (y - (land - hf)) / hf; g.px(x, y, q < 0.05 ? F[0] : q < 0.3 ? ((q - 0.05) / 0.25 > bayer(x, y) ? F[2] : F[1]) : F[2]); }
    for (let y = R(land - hn); y < land; y++) { const q = (y - (land - hn)) / hn; g.px(x, y, q < 0.08 ? N[0] : q < 0.4 ? N[1] : N[2]); }
  }
}
/** A view of canvas c that drops pixel writes outside screen columns [x0, x1) (keeps per-frame art inside my range). */
export function clipX(c, x0, x1) { if (x0 <= 0 && x1 >= c.w) return c; const o = Object.create(c); o.px = (x, y, col) => { if (x >= x0 && x < x1) c.px(x, y, col); }; return o; }

