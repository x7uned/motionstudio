// catalog-v1 item «brick-wall»: a section of the brick wall of the ping film (ping/film/world.mjs#brickWall), drawn through
// items/lib/ping-brick-wall.mjs. Solid at first; cracks spread out from one point; bricks drop out one by one and dissolve
// as they fall; a warm lamp light falls over the wall. Every change is an eased parameter; no text.
import { drawBrickWall } from "./lib/ping-brick-wall.mjs";

export default {
  kind: "brick-wall",
  covers: ["brick-wall"],
  source: "ping/film/world.mjs#brickWall (+ BRICK ramp, rnd) (+ lib/ping-brick-wall.mjs)",
  desc: "section of dark purple brick wall; cracks spread from one point, bricks crumble and fall, warm light",
  hw: 100, hh: 98,
  start: "a solid brick wall",
  states: {
    solid: [0.5, "a solid brick wall"],
    crack: [0.8, "cracks spread out from one point", "creak"],
    crumble: [0.9, "bricks drop out one by one and fall away", "fall"],
    lit: [0.6, "warm light falls over the wall", "glow"],
  },
  // cr: crack progress 0..1, cm: crumble progress 0..1, lt: warm lamp light 0..1
  base: { cr: 0, cm: 0, lt: 0 },
  st: {
    solid: { cr: 0, cm: 0, lt: 0 },
    crack: { cr: 1, cm: 0 },
    crumble: { cr: 1, cm: 1 },
    lit: { lt: 1 },
  },
  demo: { target: false },
  notes: "Film brick rule, palette and mortar kept; bricks are 12 × 5 world px at z 1 (the film's size). The wall is painted per brick, so a crumbling brick keeps its colour. The hole left by a brick is a dark plate. Falling bricks drop up to 28 px below the wall while they dissolve, so the declared footprint includes that drop (hh 98).",
  draw(c, cx, cy, z, t, s) {
    const v = s.v;
    drawBrickWall(c, cx, cy, z, { cr: v.cr, cm: v.cm, lt: v.lt });
    return { box: { x0: cx - 100 * z, y0: cy - 70 * z, x1: cx + 100 * z, y1: cy + 98 * z }, pt: [cx, cy] };
  },
};
