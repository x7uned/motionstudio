// catalog-v1 item «lion»: the deadliest film's chibi savanna lion sitting face-on (fluffy mane, round cream-muzzled face,
// tufted ears, big amber eyes, blush, a tufted tail), ported from work/pixel-lab/deadliest/film/levels/savanna-lion.mjs
// drawLion (copy in lib/deadliest-lion.mjs). The film's drawing has a fixed scale, so it is painted at film scale and
// resampled at K (lib/deadliest-scaled.mjs). Its states are the film's own: idle, the ROAR (mane puff, open mouth with
// fangs), the proud smug grin (happy arcs, deeper blush).
import { drawLion } from "./lib/deadliest-lion.mjs";
import { drawScaled } from "./lib/deadliest-scaled.mjs";

// Film anchor (AX, AY) = the head centre in the offscreen layer. The art spans x −105…+168 and y −95…+129 around the
// anchor (mane, ears, body, swaying tail); its centre (+31, +17) sits on the footprint centre. K = 0.6 × camera zoom at size m.
const AX = 170, AY = 170, LW = 380, LH = 320, K0 = 0.6;
// a slower blink than blinkAt (0.4 s, eased at both ends): the film's 0.2 s sine snaps the lids
const slowBlink = (t) => { const P = 3.3, p = (((t + 1.4) % P) + P) % P, d = 0.4; return p < d ? 0.5 - 0.5 * Math.cos((2 * Math.PI * p) / d) : 0; };
export default {
  kind: "lion",
  covers: ["lion"],
  source: "deadliest/film/levels/savanna-lion.mjs#drawLion",
  desc: "chibi savanna lion sitting face-on: fluffy golden mane, cream muzzle, tufted ears, big amber eyes, blush",
  hw: 88, hh: 78, start: "sits with a soft smile, mane still, tail swaying",
  states: {
    idle: [0.5, "sits with a soft smile, mane still, tail swaying"],
    look: [0.45, "turns its head and amber eyes to the target prop", "blip"],
    roar: [0.55, "roars: the mane puffs up, the mouth opens wide with fangs", "swell"],
    proud: [0.6, "smug proud grin, eyes close into happy arcs, cheeks blush deeper", "sparkle"],
    worry: [0.6, "head sinks, eyes half-shut, small mouth", "creak"],
  },
  base: { aim: 0, roar: 0, proud: 0, puff: 0, squint: 0, hdx: 0, hdy: 0 },
  st: {
    idle: { aim: 0, roar: 0, proud: 0, puff: 0, squint: 0, hdx: 0, hdy: 0 },
    look: { aim: 1, roar: 0, proud: 0, puff: 0, squint: 0, hdx: 0, hdy: 0 },
    roar: { aim: 0, roar: 1, proud: 0, puff: 1, squint: 0, hdx: 0, hdy: 0 },
    proud: { aim: 0, roar: 0, proud: 1, puff: 0.2, squint: 0, hdx: 0, hdy: -3 },
    worry: { aim: 0, roar: 0, proud: 0, puff: 0, squint: 0.45, hdx: 0, hdy: 8 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "the film's options are used as they are (roar, proud, puff, squint, head, look, blink, tail); the film's ocean-kit layers are replaced by roofs-kit's view-aware layer and the drawing is resampled at K (the film has no scale option); the tail sway is a sine on the tail parameter; the tail, mane puff and ears keys are quantised finer than the film's integers so no step pops; the worry state is the film's squint plus a sunk head (the film has no worried face, so it reads mostly by the head); the film's ear twist is only on one side, so the ears are not flattened",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, K = K0 * z, ax = cx - 31 * K, ay = cy - 17 * K;
    let aim = [0, 0];
    if (s.look && v.aim > 0) { const hx = ax + 0, hy = ay - 0, dx = s.look[0] - hx, dy = s.look[1] - hy, d = Math.hypot(dx, dy) || 1, k = v.aim * s.lookK; aim = [(dx / d) * k, (dy / d) * k]; }
    const head = [v.hdx + 6 * aim[0], v.hdy + 4 * aim[1]];
    const look = [0.6 * aim[0], 0.1 + 0.6 * aim[1]];
    const blink = Math.min(0.9, slowBlink(t) + 0.45 * v.squint);
    const tail = 1.2 * Math.sin(t * 2.2);
    drawScaled(c, ax, ay, K, LW, LH, AX, AY, (g, px, py) => drawLion(g, px, py, { roar: v.roar, proud: v.proud, puff: v.puff, squint: v.squint, head, look, blink, tail }));
    return { box: { x0: ax - 105 * K, y0: ay - 95 * K, x1: ax + 168 * K, y1: ay + 129 * K }, pt: [ax, ay - 10 * K], face: [ax, ay - 10 * K],
      faceBox: { x0: ax - 70 * K, y0: ay - 70 * K, x1: ax + 70 * K, y1: ay + 20 * K } };
  },
};
