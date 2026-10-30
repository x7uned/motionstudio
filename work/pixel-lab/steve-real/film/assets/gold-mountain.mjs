// steve-real · gold-mountain (new, 2026-10-28): a stepped pile of gold blocks (flat bevelled squares, glints) standing on its
// base line. States: down (sunk below its base) / rise (rises) / shine (glints run over it). s.part = 0.5 draws only the
// left half (half a pile). Labels come from the film.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
const R = Math.round, TAU = Math.PI * 2;
const G = { f: "#F2C23A", d: "#C8901C", l: "#FFE680", o: "#6A4208", s: "#FFFBE0" };
export default {
  kind: "gold-mountain", covers: ["gold pile", "gold mountain", "heap of gold"], source: "steve-real/film (new)",
  desc: "a stepped pile of gold blocks that rises into view and glints; can be half a pile", hw: 48, hh: 36, start: "stands, glints",
  states: { down: [0.3, "hidden below its base"], rise: [0.7, "rises into view", "rise"], shine: [0.5, "glints run over it", "sparkle"] },
  base: { up: 1, shine: 0 }, st: { down: { up: 0 }, rise: { up: 1 }, shine: { up: 1, shine: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const rows = 6, b = Math.max(3, R(16 * z * 0.6)), base = R(cy + this.hh * z), part = s.part ?? 1, off = R((1 - s.v.up) * rows * b);
    const xmax = cx + (part < 1 ? 0 : 1e9);
    for (let r = 0; r < rows; r++) {
      const n = rows - r, y = base - (r + 1) * b + off;
      for (let q = 0; q < n; q++) {
        const x = R(cx - (n * b) / 2 + q * b); if (x + b / 2 > xmax + 0.5 && part < 1) continue;
        c.rect(x, y, b, b, G.f); c.rect(x, y, b, 1, G.l); c.rect(x, y, 1, b, G.l); c.rect(x, y + b - 1, b, 1, G.d); c.rect(x + b - 1, y, 1, b, G.d);
        const gl = Math.sin(TAU * (t * 0.7 - q * 0.13 - r * 0.21)) * s.v.shine; if (gl > 0.8) c.rect(x + 2, y + 2, Math.max(1, R(b / 4)), Math.max(1, R(b / 4)), G.s);
      }
      const x0 = R(cx - (n * b) / 2), x1 = Math.min(R(cx + (n * b) / 2), part < 1 ? R(cx) : 1e9);
      c.rect(x0 - 1, y, 1, b, G.o); if (part >= 1) c.rect(x1, y, 1, b, G.o); c.rect(x0 - 1, y - 1, Math.min(x1, x0 + n * b) - x0 + 2, 1, G.o);
    }
    if (part < 1) c.rect(R(cx), base - rows * b + off, 1, rows * b, G.o);
    return { box: { x0: R(cx - (rows * b) / 2), y0: base - rows * b + off, x1: R(cx + (rows * b) / 2), y1: base }, pt: [cx, base - rows * b * 0.5 + off] };
  },
};
