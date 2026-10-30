// catalog-v1 item «mosquito»: the deadliest film's chibi female mosquito facing the camera (big glossy eyes, blush,
// needle proboscis, feathery antennae, blurred flutter wings), ported from work/pixel-lab/deadliest/film/levels/
// camp-mosq.mjs drawMosquito (copy in lib/deadliest-mosquito.mjs). Every film option is an eased state parameter.
import { drawMosquito } from "./lib/deadliest-mosquito.mjs";
import { blinkAt } from "./lib/cute.mjs";

// The drawing spans x −30…+30, y −24…+38 around the head centre at scale 1; the head sits HY above the footprint centre.
const S0 = 2.4, HY = 7, FLAP = 5.6;   // wing cycles/s: a smooth 5-frame sweep with the 3-layer blur trail (the film's 14 Hz strobes at 30 fps)
export default {
  kind: "mosquito",
  covers: ["mosquito"],
  source: "deadliest/film/levels/camp-mosq.mjs#drawMosquito",
  desc: "cute chibi mosquito facing the camera: big pink eyes, needle nose, feathery antennae, buzzing wings",
  hw: 76, hh: 74, start: "hovers, wings buzz, bobs gently",
  states: {
    hover: [0.5, "hovers in place, wings buzzing"],
    fly: [0.6, "flies little loops around its spot, banking", "whoosh"],
    look: [0.45, "turns its big eyes to the target prop", "blip"],
    bite: [0.55, "dips down, legs reach forward, the needle stabs: bites", "thump"],
    full: [0.9, "belly swells and fills red, eyes close happily: full of blood", "swell"],
    crown: [0.5, "smug grin, a little gold crown pops on: the winner", "sparkle"],
  },
  base: { loop: 0, look: 0, legs: 0, prob: 0, dip: 0, full: 0, happy: 0, smug: 0, crown: 0 },
  st: {
    hover: { loop: 0, look: 0, legs: 0, prob: 0, dip: 0, happy: 0 },
    fly: { loop: 1, look: 0, legs: 0, prob: 0, dip: 0, happy: 0 },
    look: { look: 1, loop: 0, legs: 0, prob: 0, dip: 0 },
    bite: { legs: 0.7, prob: 1, dip: 1, loop: 0, happy: 0 },
    full: { full: 1, happy: 1, dip: 0.3, loop: 0 },
    crown: { crown: 1, smug: 1, happy: 0, loop: 0, dip: 0, prob: 0 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "wings always flutter (the film's folded-wing landed pose not used: there is nothing to land on); bite = dip + needle push in mid-air; flap slowed from 14 to 5.6 Hz (14 Hz at 30 fps strobes, 7.3 Hz alternates big/small frames = jumps); the fly loop swings ±34 px beyond hw; front-on the needle lies over the abdomen, so the bite reads mostly by the dip",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = S0 * z, air = 1 - v.legs;
    const lx = 34 * z * Math.sin(1.9 * t) * v.loop, ly = 14 * z * Math.sin(3.8 * t) * v.loop;
    const bob = (Math.sin(t * 2.3) * 3 + Math.sin(t * 5.1)) * z * air;
    const hx = cx + lx, hy = cy - HY * S + ly + bob + v.dip * 8 * S;
    let look = [0, 0], tilt = 0;
    if (s.look && v.look > 0) { const dx = s.look[0] - hx, dy = s.look[1] - hy, d = Math.hypot(dx, dy) || 1, k = v.look * s.lookK; look = [(dx / d) * k, (dy / d) * 0.8 * k]; tilt = 0.16 * (dx / d) * k; }
    const rot = tilt + 0.2 * Math.cos(1.9 * t) * v.loop + 0.05 * Math.sin(t * 1.7) * air;
    const ck = v.crown * (1 + 0.3 * Math.sin(Math.PI * s.acc("crown")));
    const blink = blinkAt(t, 3.3, 1.3) * (1 - v.happy);
    drawMosquito(c, hx, hy, { s: S, rot, flap: t * FLAP, fly: 1, blink, happy: v.happy, smug: v.smug, look, crown: ck, legs: v.legs, prob: v.prob, full: v.full, t });
    return { box: { x0: hx - 30 * S, y0: hy - 24 * S, x1: hx + 30 * S, y1: hy + 38 * S }, pt: [hx, hy], face: [hx, hy],
      faceBox: { x0: hx - 12 * S, y0: hy - 11 * S, x1: hx + 12 * S, y1: hy + 11 * S } };
  },
};
