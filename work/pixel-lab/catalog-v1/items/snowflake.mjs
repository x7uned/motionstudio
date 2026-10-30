// catalog-v1 item «snowflake»: falling snow in its slot, from the touch street (touch/film/street.mjs#snowLayer), drawn
// through items/lib/touch-street-snow.mjs. A column of flakes falls inside a box at the slot; light, heavy, swirl and stop
// change the flake count and speed and the sway as eased parameters. Flakes dissolve in and out with the count.
import { drawSnowfall } from "./lib/touch-street-snow.mjs";

const HW = 75, HH = 90;

export default {
  kind: "snowflake",
  covers: ["snowflake"],
  source: "touch/film/street.mjs#snowLayer (+ lib/touch-street-snow.mjs)",
  desc: "falling snowflakes in a column over its slot; few, many, swirling, or thinning out",
  hw: HW, hh: HH,
  start: "a few flakes drift down slowly",
  states: {
    light: [0.5, "a few flakes drift down slowly"],
    heavy: [0.6, "many flakes fall faster", "swish"],
    swirl: [0.6, "flakes sway and swirl in the wind", "whoosh"],
    stop: [0.6, "the flakes thin out and fade", "dim"],
  },
  // n: flake count 0..1 (each flake has its own order), sp: fall speed (integrated into the phase), sway: swirl amplitude
  base: { n: 0.4, sp: 0.22, sway: 0 },
  st: {
    light: { n: 0.4, sp: 0.22, sway: 0 },
    heavy: { n: 1, sp: 0.42, sway: 0 },
    swirl: { n: 0.8, sp: 0.3, sway: 1 },
    stop: { n: 0, sp: 0.3, sway: 0 },
  },
  demo: { tile: "heavy",  target: false },
  notes: "Film flake rule and colours kept (Bayer-dithered round flakes, two greys). Flakes keep the film's size classes (1, 2, 3 px) and do not grow with the zoom, so no size steps during a zoom; the box does scale with z. The box is a little taller than the drawn flakes, so the sheet footprint may read smaller than declared.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v;
    drawSnowfall(c, cx, cy, z, { n: v.n, phase: s.integ((q) => q.sp), sway: v.sway, t, hw: HW, hh: HH });
    return { box: { x0: cx - HW * z, y0: cy - HH * z, x1: cx + HW * z, y1: cy + HH * z }, pt: [cx, cy] };
  },
};
