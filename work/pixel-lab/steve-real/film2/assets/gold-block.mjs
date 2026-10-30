// steve-real · gold-block (new, 2026-10-28): a 1 m cube of gold in our own 16×16 texel painting (bevelled edge, soft
// sheen); idle / spin (item form, turning) / shine (a glint sweeps). Block form stands on its bottom face.
import { cube, goldTex } from "../lib/blocks.mjs";
const TAU = Math.PI * 2;
export default {
  kind: "gold-block", covers: ["gold block", "gold", "gold cube"], source: "steve-real/film (new)", demo: { side: 64 },
  desc: "a 1 m cube of shiny gold, bevelled edges; can turn like a game item and glint",
  hw: 40, hh: 40, start: "stands still, a faint glint",
  states: { idle: [0.4, "stands still"], spin: [0.5, "turns slowly like a game item", "swish"], shine: [0.5, "a bright glint sweeps across", "sparkle"] },
  base: { spin: 0, shine: 0, yaw: 0.62 }, st: { idle: { spin: 0, shine: 0 }, spin: { spin: 1 }, shine: { shine: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const side = (s.side ?? 64) * z, yaw = s.v.yaw + s.integ((p) => p.spin * 1.6), y = cy + 40 * z;
    const r = cube(c, cx, y, side, { tex: goldTex, yaw, light: 0.06 * s.v.shine * Math.sin(TAU * t) + 0.02, crack: s.crack ?? 0 });
    return { box: r ? r.box : { x0: cx - 30, y0: cy - 30, x1: cx + 30, y1: cy + 30 }, pt: [cx, y - side * 0.6] };
  },
};
