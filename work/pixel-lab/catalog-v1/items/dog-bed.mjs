// catalog-v1 item «dog-bed»: the round caramel dog bed of the dog-series park (dogs/kit/nest-bed.mjs: bedBack + bedFront,
// the heightfield engine of nest-hf.mjs). Copied into items/lib/dogs-nest-bed.mjs and dogs-nest-hf.mjs (import paths only).
// Changes: the film draws it in world units through G; here the bed's ground centre sits at the footprint centre
// (GY units below it) and K px per world unit at z 1. Back and front layers are drawn in one item (a prop; nothing is
// placed in it). The states map the film's own pressed-in hollow: press (depth of the hollow, eased 0..1) and dent
// (where it sits, eased). Nothing is added to the film's geometry.
import { bedBack, bedFront } from "./lib/dogs-nest-bed.mjs";

const K = 0.9;        // screen px per world unit at z 1 (the bed is 150 units across, so ≈ 135 px)
const GY = 15.6;      // the bed's ground centre sits 15.6 units below the footprint centre (the bed is taller behind)

export default {
  kind: "dog-bed",
  covers: ["dog-bed"],
  source: "dogs/kit/nest-bed.mjs#bedBack,bedFront (+ dogs/kit/nest-hf.mjs engine)",
  desc: "round caramel dog bed with a cream fleece rim; a hollow can sink into the cushion",
  hw: 67, hh: 34,
  start: "lies still, the fleece cushion flat",
  states: {
    empty: [0.6, "empty round bed, the fleece cushion flat"],
    dent: [0.8, "a hollow sinks into the middle, as if pressed", "fold"],
    turn: [0.9, "the hollow slides to one side as the dog turns round", "swish"],
    spring: [0.8, "the cushion springs back up to flat", "swell"],
  },
  base: { press: 0, dent: 0 },
  st: {
    empty: { press: 0, dent: 0 },
    dent: { press: 1, dent: 0 },
    turn: { press: 1, dent: 24 },
    spring: { press: 0, dent: 24 },
  },
  linear: [],
  notes: "Film geometry and shading kept (fleece cushion, honey stuffed-tube bolster, piping, dark base, creases). Only press and dent are driven by states; a plump or glowing bed needs new geometry (not in the film's rig), so it is not offered. Heightfield render memoised per (press, dent): one render per frame while a state moves. Checker clean (67×34 measured = declared). The dent is subtle at 1× (about 9 px deep at z 1); it reads in the close-up.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, Z = z * K;
    const G = { z: Z, X: () => cx, Y: () => cy + GY * Z };
    const o = { press: v.press, dent: v.dent };
    bedBack(c, G, 0, 0, t, o);
    bedFront(c, G, 0, 0, t, o);
    return { box: { x0: cx - 75 * Z, y0: cy - 32.6 * Z, x1: cx + 75 * Z, y1: cy + 34.4 * Z }, pt: [cx, cy - 6 * Z] };
  },
};
