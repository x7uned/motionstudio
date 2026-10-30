// steve-real · item-drop (new, 2026-10-28): a small block item (gold / concrete / log / shulker texture) that floats, turns
// and bobs like a dropped game item; state fly eases it along an arc to a target (s.look) and shrinks it into the hand.
import { cube, TEX } from "../lib/blocks.mjs";
const TAU = Math.PI * 2, lerp = (a, b, k) => a + (b - a) * k;
export default {
  kind: "item-drop", covers: ["item drop", "dropped item", "pickup"], source: "steve-real/film (new)", demo: { label: "log" },
  desc: "a small turning block item that bobs, then flies in an arc to a hand", hw: 16, hh: 16, start: "floats, turns and bobs",
  states: { float: [0.4, "floats, turns and bobs"], fly: [0.55, "flies in an arc to its target and shrinks", "plip"] },
  base: { fly: 0 }, st: { float: { fly: 0 }, fly: { fly: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const f = s.v.fly, tx = s.look ? s.look[0] : cx, ty = s.look ? s.look[1] : cy, k = f * (s.lookK ?? 1);
    const x = lerp(cx, tx, k), y = lerp(cy, ty, k) - 28 * z * Math.sin(Math.PI * k) + 3 * z * Math.sin(TAU * 0.9 * t) * (1 - k);
    const side = (s.side ?? 22) * z * (1 - 0.6 * k);
    const r = cube(c, x, y + side / 2, side, { tex: TEX[s.label ?? "gold"], yaw: 1.7 * t, light: 0.03 });
    return { box: r ? r.box : { x0: x - 10, y0: y - 10, x1: x + 10, y1: y + 10 }, pt: [x, y] };
  },
};
