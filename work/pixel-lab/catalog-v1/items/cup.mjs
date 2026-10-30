// catalog-v1 item «cup»: the glass of water of «Why your cat sleeps» (cat-zoomies/film/person.mjs#drawGlass, lib/cat-zoomies-glass.mjs):
// the film's straight-sided glass with a water column, two wall glints and a pale rim. Changes: the glass is drawn at the
// item's size through G.X / G.Y; the fill level, the tilt and the surface ripple are eased parameters; the ripple wobbles the
// water line per column (a new optional parameter of the lib copy).
import { drawGlass } from "./lib/cat-zoomies-glass.mjs";

const S = 3.2;   // screen px per world unit at z 1 (the glass is 54 × 77 px)
export default {
  kind: "cup",
  covers: ["cup"],
  source: "cat-zoomies/film/person.mjs#drawGlass (+ segD, sline)",
  desc: "glass of water: full and still, tips over and sloshes, the level drops as it is drunk, or the surface ripples",
  hw: 41, hh: 47, start: "stands full and still",
  states: {
    full: [0.4, "full glass, still water"],
    tilt: [0.7, "tips over toward the target, the water sloshes", "swish"],
    sip: [0.9, "the water level drops as it is drunk", "blip"],
    ripple: [0.6, "the surface ripples", "sonar"],
  },
  // fill 0..1 water level · rot tilt (rad) · wob surface ripple amplitude
  base: { fill: 0.88, rot: 0, wob: 0 },
  st: {
    full: { fill: 0.88, rot: 0, wob: 0 },
    tilt: { fill: 0.7, rot: 0.5, wob: 0.5 },
    sip: { fill: 0.25, rot: 0, wob: 0.2 },
    ripple: { fill: 0.6, rot: 0, wob: 1 },
  },
  linear: [],
  demo: {},
  notes: "Film glass kept (outline, wall shading, water ramp, glints). Tilt rotates the glass, and the water line stays horizontal as in the film, so a tilted glass looks spilled rather than poured; the item box covers the tilt corners (hw 41, hh 47, measured). Ripple: the surface line wobbles per column (lib copy, wob). Checker: see batches/W.md.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = S * z;
    const G = { X: (x) => cx + x * k, Y: (y) => cy + y * k, z: Math.max(1, z) };
    drawGlass(c, G, 0, 0, v.rot, v.fill, v.wob, 5 * t);
    return { box: { x0: cx - 8.4 * k - 1, y0: cy - 12 * k - 1, x1: cx + 8.4 * k + 1, y1: cy + 12 * k + 1 }, pt: [cx, cy - 12 * k] };
  },
};
