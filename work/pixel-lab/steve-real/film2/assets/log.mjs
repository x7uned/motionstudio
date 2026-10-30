// steve-real · log (new, 2026-10-28): a bark-covered log block with rings on the ends; can crack and turn into a small spinning item. Our own 16×16 texel painting (lib/blocks.mjs).
// States: block (stands) / crack (10 crack stages dither in over the state's time) / item (shrinks to a small turning item).
import { cube, TEX } from "../lib/blocks.mjs";
export default {
  kind: "log", covers: "log,wood,tree trunk".split(","), source: "steve-real/film (new)",
  desc: "a bark-covered log block with rings on the ends; can crack and turn into a small spinning item", hw: 40, hh: 40, start: "stands still",
  states: { block: [0.4, "stands still"], crack: [3, "cracks grow in 10 stages", "tick"], item: [0.6, "shrinks into a small turning item", "pop"] },
  base: { crack: 0, item: 0 }, st: { block: { crack: 0, item: 0 }, crack: { crack: 1 }, item: { item: 1, crack: 1 } }, linear: ["crack"],
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = 1 - 0.72 * v.item, side = (s.side ?? 64) * z * k, y = cy + 40 * z - 22 * z * Math.sin(Math.PI * v.item) * 0.6;
    const r = cube(c, cx, y, side, { tex: TEX["log"], yaw: (s.yaw ?? 0.45) + v.item * (0.8 + 1.8 * t), crack: v.crack * (1 - v.item), clipY: s.clipY });
    return { box: r ? r.box : { x0: cx - 30, y0: cy - 30, x1: cx + 30, y1: cy + 30 }, pt: [cx, y - side * 0.5] };
  },
};
