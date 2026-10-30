// steve-real · shulker-box (new, 2026-10-28): a purple storage box with a lid seam and a latch, our own drawing in the
// spirit of the game (not its texture). States: closed / open (lid lifts and tips back, dark inside) / shrink (closes and
// shrinks into a small turning icon). The 3×9 contents grid is a separate UI (inventory-grid).
import { cube, shulkerTex } from "../lib/blocks.mjs";
export default {
  kind: "shulker-box", covers: ["shulker box", "storage box", "chest"], source: "steve-real/film (new)",
  desc: "purple storage box with a lid; lid lifts open, then it shrinks into a small icon", hw: 40, hh: 40, start: "stands closed",
  states: { closed: [0.4, "stands closed"], open: [0.6, "lid lifts and tips back", "creak"], shrink: [0.7, "closes and shrinks into a small icon", "pop"] },
  base: { lid: 0, shrink: 0 }, st: { closed: { lid: 0, shrink: 0 }, open: { lid: 1 }, shrink: { lid: 0, shrink: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = 1 - 0.75 * v.shrink, side = (s.side ?? 64) * z * k, y = cy + 40 * z - 30 * z * v.shrink;
    const r = cube(c, cx, y, side, { tex: shulkerTex, yaw: 0.5 + v.shrink * 2.4, lid: v.lid > 0.002 ? v.lid : 0, light: 0.02 });
    return { box: r ? r.box : { x0: cx - 30, y0: cy - 30, x1: cx + 30, y1: cy + 30 }, pt: [cx, y - side * 0.5] };
  },
};
