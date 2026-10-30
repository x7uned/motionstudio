// catalog-v1 item «crocodile»: the deadliest film's chibi swamp crocodile (green scaled back, cream belly, golden eyes on top
// of a long snout, a row of teeth, blush), ported from work/pixel-lab/deadliest/film/levels/swamp-croc.mjs drawCroc (copy in
// lib/deadliest-croc.mjs). The film's drawing has a fixed scale, so it is painted at film scale and resampled at K
// (lib/deadliest-scaled.mjs). Its water (underwater tint, the wet rows) is dropped: the croc stands in air.
import { drawCroc } from "./lib/deadliest-croc.mjs";
import { drawScaled } from "./lib/deadliest-scaled.mjs";

// Film anchor (AX, AY) in the offscreen layer (the film's own units, SC 1.2 included). The art spans x −230…+190 and
// y −120…+130 around the anchor; its centre (−20, +5) sits on the footprint centre. K = 0.5 × camera zoom at size m.
const AX = 280, AY = 150, LW = 480, LH = 300, K0 = 0.5;
// a slower blink than blinkAt (0.4 s, eased in and out: zero speed at both ends): the film's 0.2 s sine snaps the lids
const slowBlink = (t) => { const P = 3.3, p = (((t + 0.8) % P) + P) % P, d = 0.4; return p < d ? 0.5 - 0.5 * Math.cos((2 * Math.PI * p) / d) : 0; };
export default {
  kind: "crocodile",
  covers: ["crocodile"],
  source: "deadliest/film/levels/swamp-croc.mjs#drawCroc",
  desc: "side-view chibi crocodile lying low, eyes on top of its head: green back, toothy grin, golden eyes, blush",
  hw: 105, hh: 62, start: "lies low with a closed toothy grin, eyes peeking up",
  states: {
    rest: [0.5, "lies low with a closed toothy grin, eyes peeking up"],
    look: [0.45, "turns its golden eyes to the target prop", "blip"],
    snap: [0.5, "jaws snap wide open showing teeth, then shut", "thump"],
    swish: [0.6, "whips its tail side to side", "swish"],
    worry: [0.6, "snout sinks, eyes glance down with half-shut lids", "creak"],
  },
  base: { aim: 0, pitch: 0, tail: 0, snap: 0, lid: 0, gaze: 0 },
  st: {
    rest: { aim: 0, pitch: 0, tail: 0, snap: 0, lid: 0, gaze: 0 },
    look: { aim: 1, pitch: 0, tail: 0, snap: 0, lid: 0, gaze: 0 },
    snap: { aim: 0, pitch: 0, tail: 0, snap: 0, lid: 0, gaze: 0 },
    swish: { aim: 0, pitch: 0, tail: 1, snap: 0, lid: 0, gaze: 0 },
    worry: { aim: 0, pitch: -0.1, tail: 0, snap: 0, lid: 0.45, gaze: 1 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "the film's options are used as they are (snap, pitch, look, blink, tail); the snap is an accent on the snap key (sin of its progress), so the jaws open and shut in one motion and the state rests closed; the tail wag is the eased tail parameter times a sine, so it never starts from a wagged pose; the worry state is the half-shut lid plus a lowered snout and eyes glancing down (the film has no worried face); the film's underwater look, wet rows and floating eyes are not ported (the croc is on land); the scaled drawing is nearest-neighbour (1-px outlines thin out at the wide shot)",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, K = K0 * z, ax = cx + 20 * K, ay = cy - 5 * K;
    const snap = Math.max(v.snap, 0.26 * Math.sin(Math.PI * s.acc("snap")));
    let aim = [0, 0];
    if (s.look && v.aim > 0) { const ex = ax + 24 * K, ey = ay - 38 * K, dx = s.look[0] - ex, dy = s.look[1] - ey, d = Math.hypot(dx, dy) || 1, k = v.aim * s.lookK; aim = [(dx / d) * k, (dy / d) * 0.8 * k]; }
    const look = [aim[0] - 0.5 * v.gaze, aim[1] + 0.8 * v.gaze];
    const blink = Math.min(0.9, Math.max(slowBlink(t), v.lid));   // capped: the eye code adds a lash line above 0.95 (a pop)
    const tail = v.tail * Math.sin(t * 5.5);
    drawScaled(c, ax, ay, K, LW, LH, AX, AY, (g, px, py) => drawCroc(g, g, px, py, 0, { snap, pitch: v.pitch, look, blink, tail }));
    return { box: { x0: ax - 230 * K, y0: ay - 120 * K, x1: ax + 190 * K, y1: ay + 130 * K }, pt: [ax + 40 * K, ay - 35 * K], face: [ax + 40 * K, ay - 35 * K],
      faceBox: { x0: ax - 10 * K, y0: ay - 70 * K, x1: ax + 130 * K, y1: ay + 10 * K } };
  },
};
