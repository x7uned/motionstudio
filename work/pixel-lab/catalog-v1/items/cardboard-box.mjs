// catalog-v1 item «cardboard-box»: the brown cardboard box of the «Why do cats love boxes?» film
// (cat-boxes/film/props-box.mjs#drawBox with props-kit helpers, copied into items/lib/cat-boxes-box.mjs and
// items/lib/cat-boxes-kit.mjs). Changes: the film draws it in its world units; here the slot centre is the box centre
// and one film unit is K screen px at z 1. The flaps (fl), the one-off wobble (acc("wobble")) and the sit-down squash
// (acc("squash"), an offset to the same geometry) are eased, so nothing jumps; the film's «this side up» label and the
// cat-bed doodle stay as they are (no logo, no brand).
import { drawBox, BOX } from "./lib/cat-boxes-box.mjs";

const K = 1.2;           // screen px per film unit at z 1
const OFF = 22;          // the body's middle sits on the slot centre (film y −22)

export default {
  kind: "cardboard-box",
  covers: ["cardboard-box"],
  source: "cat-boxes/film/props-box.mjs#drawBox (+ props-kit.mjs helpers)",
  desc: "brown cardboard box on the floor with a «this side up» label; its flaps can swing open, it can wobble or squash",
  hw: 93, hh: 73,
  start: "sits closed on the floor, still",
  states: {
    closed: [0.5, "sits closed, flat lid"],
    open: [0.9, "flaps swing open, the tape peels back", "creak"],
    wobble: [0.7, "wobbles side to side and settles", "thump"],
    squash: [0.4, "squashes down under a weight, springs back", "thud"],
  },
  // fl: 0 closed (flaps lie flat), 1 fully open
  base: { fl: 0 },
  st: { closed: { fl: 0 }, open: { fl: 1 }, wobble: {}, squash: {} },
  linear: [],
  notes: "Film colours, flutes, tape and label kept; the prop is the box alone (no floor scene). Wobble and squash are one-off accents from the latest key (sin of the key's progress, zero at both ends), so a repeated key replays from rest. Side flaps swing with the open state. Front flap and tape share the film's shading.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, Z = z * K;
    const G = { z: Z, X: (u) => cx + u * Z, Y: (w) => cy + (w + OFF) * Z, wx: (X) => (X - cx) / Z, wy: (Y) => (Y - cy) / Z - OFF };
    // the wobble runs over the first 85 % of its key and then rests exactly (no sub-pixel creep after the swing)
    const pw = Math.min(1, s.acc("wobble") / 0.85), ws = Math.sin(Math.PI * pw);
    const o = { flaps: v.fl, tape: 1, label: true, t, wobble: pw, wobbleAmt: 2 * ws, squash: 0.2 * Math.sin(Math.PI * s.acc("squash")) };
    drawBox(c, G, 0, "back", o);
    const r = drawBox(c, G, 0, "front", o);
    return { box: { x0: r.x0 - 1, y0: r.top - 1, x1: r.x1 + 1, y1: G.Y(BOX.frontWy) + 1 }, pt: [cx, cy] };
  },
};
