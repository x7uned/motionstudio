// steve-real film2 · gold-pile (new, 2026-10-28, drawn for this film): a huge far-off mountain of gold for the skyline —
// a rounded heap built of stacked bars (rows of small bricks with lit tops), nuggets along the foot, warm haze on its far
// side and slow glints running over it. rise (comes up from behind the roofs), shine (glints), part (0..1: keep the left
// share — half a pile). Illustration of all mined gold, not to scale with the street.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const G = ["#6A4208", "#8E5E10", "#B07C1A", "#D09C28", "#E8BC3E", "#F8DA6A", "#FFF2B0"];
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** heap profile: height fraction at u ∈ [-1, 1] */
export const prof = (u) => Math.max(0, Math.pow(Math.max(0, 1 - u * u), 1.6) * (1 + 0.08 * Math.cos(u * 7)) - 0.03 * Math.abs(Math.sin(u * 29)) * (1 - Math.abs(u)));
export function drawPile(c, cx, base, W, H, t, o = {}) {
  const up = clamp01(o.up ?? 1), part = o.part ?? 1, shine = o.shine ?? 0, off = (1 - up) * H, hz = o.haze ?? 0;
  const bh = Math.max(2, R(H / 14)), bw = bh * 2.6;
  for (let x = R(cx - W); x <= R(cx + W); x++) {
    const u = (x - cx) / W; if ((u + 1) / 2 > part + 1e-6) continue;
    const h = prof(u) * H; if (h < 1) continue;
    for (let y = R(base - h); y <= R(base); y++) {
      const yy = y + R(off), dy = base - y, row = Math.floor(dy / bh), fx = ((x - cx) + (row % 2) * bw / 2) / bw, col = Math.floor(fx), fr = fx - col, fy = (dy % bh) / bh;
      const edge = y <= R(base - h) + 1, slopeLit = clamp01(0.5 - u * 0.55);
      let v = 0.32 + slopeLit * 0.45 + (fy > 0.7 ? 0.18 : 0) - (fr < 0.08 ? 0.22 : 0) + (rnd(col * 31 + row * 7) - 0.5) * 0.18 - (dy / H) * -0.05;
      const glint = shine * Math.max(0, 1 - Math.abs(((t * 0.35 + rnd(col + row * 13)) % 1) * 2.4 - 1.2) * 6) * (rnd(col * 3 + row) > 0.82 ? 1 : 0);
      v += glint * 0.5 - hz * 0.25;
      if (edge) v = 0.95;
      const s = clamp01(v) * (G.length - 1), i = Math.floor(s), f = s - i;
      c.px(x, yy, G[Math.min(G.length - 1, f > bayer(x & 3, yy & 3) ? i + 1 : i)]);
    }
    // a dark rim on the right edge for shape
    const yt = R(base - h) + R(off); if (u > 0.2) c.px(x, yt - 1, "#5A3606");
  }
  if (part < 1) { const xe = R(cx - W + 2 * W * part); for (let y = R(base - prof(-1 + 2 * part) * H); y <= R(base); y++) if ((y & 1) === 0) c.px(xe, y + R(off), "#FFF2B0"); }
  return { top: [cx, base - H + off], box: { x0: cx - W, y0: base - H + off, x1: cx - W + 2 * W * part, y1: base } };
}
export default {
  kind: "gold-pile", covers: ["gold", "gold mountain", "pile of gold", "treasure"], source: "steve-real/film2 (new)",
  desc: "a huge far-off heap of stacked gold bars that rises behind the roofs and glints; can be half a heap", hw: 90, hh: 50, start: "stands, glints",
  states: { down: [0.3, "hidden below its base"], rise: [0.7, "rises into view", "rise"], shine: [0.6, "glints run over it", "glint"] },
  base: { up: 1, shine: 0 }, st: { down: { up: 0 }, rise: { up: 1 }, shine: { up: 1, shine: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) { return drawPile(c, cx, cy + this.hh * z, this.hw * z, 2 * this.hh * z, t, { up: s.v.up, shine: s.v.shine, part: s.part ?? 1 }); },
};
