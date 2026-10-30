// catalog-v1 copy (2026-10-26) of work/pixel-lab/mosquito-buzz/film/fx.mjs#cloud (soft dithered breath cloud) and of
// work/pixel-lab/plane-windows/film/levels/explain-panes.mjs#airDot (white air dot with a teal rim, COL from that file).
// Changes: import path; airDot writes through c.px (the film's put() wrote c.d directly, so it ignored dissolve views);
// `puff` = the film's three-cloud exhale (render.mjs fx: one big cloud + two smaller side lobes) as one call.
import { mix, bayer } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;
export const AIR = { W: "#FFFFFF", CY: "#7FE3F0", CYD: "#2A8AA0", CLOUD: "#DDE8FF", CLOUD_EDGE: "#9FB4E8" };

/** a soft dithered cloud (screen px) */
export function cloud(c, x, y, r, a, col = AIR.CLOUD, edge = AIR.CLOUD_EDGE) {
  if (a <= 0 || r < 1) return;
  for (let Y = R(y - r); Y <= R(y + r); Y++) for (let X = R(x - r * 1.3); X <= R(x + r * 1.3); X++) {
    const d = Math.hypot((X - x) / 1.3, Y - y) / r; if (d > 1) continue;
    const k = a * (1 - d * d) * (0.75 + 0.25 * Math.sin(X * 0.7 + Y * 0.5)); if (k <= bayer(X, Y)) continue;
    c.px(X, Y, mix(c.get(X, Y), d > 0.8 ? edge : col, d > 0.8 ? 0.55 : 0.72));
  }
}
/** the mosquito film's exhale puff: a cloud with two smaller lobes; s = 0..1 growth (lobes spread), z = scale */
export function puff(c, x, y, r, a, s = 0.5, z = 1) {
  cloud(c, x, y, r, a); cloud(c, x - (6 + 4 * s) * z, y + 3 * z, r * 0.6, a * 0.9); cloud(c, x + (7 + 5 * s) * z, y + 2 * z, r * 0.55, a * 0.9);
}
/** the plane-windows air dot (4×4 minus corners: teal rim, white 2×2 core, one cyan-tinted pixel), dithered by a */
export function airDot(c, x, y, a, col = AIR.W, rim = AIR.CYD) {
  const put = (X, Y, q, k) => { if (k >= 1 || k > bayer(X, Y)) c.px(X, Y, q); };
  for (const [dx, dy] of [[0, -1], [1, -1], [-1, 0], [2, 0], [-1, 1], [2, 1], [0, 2], [1, 2]]) put(x + dx, y + dy, rim, a * 0.85);
  put(x, y, col, a); put(x + 1, y, col, a); put(x, y + 1, col, a); put(x + 1, y + 1, mix(col, "#7FE3F0", 0.4), a);
}
