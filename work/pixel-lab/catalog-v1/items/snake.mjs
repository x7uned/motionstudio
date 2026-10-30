// catalog-v1 item «snake»: the deadliest film's chibi cobra (green hood with yellow belly scutes, big amber eyes, blush,
// a little smile): a 2.5-turn coil on the ground, the neck rising from it, the hood spreading, the hiss with fangs and
// a forked tongue. Ported from work/pixel-lab/deadliest/film/levels/jungle-snake.mjs (copy in lib/deadliest-snake.mjs).
// Every film clock is replaced by eased state parameters: rise, hood, amp (sway), mouth, brows, aim (eyes to the target),
// happy; the tongue flick is an integrated phase, so it only flicks while the mouth is open.
import { drawSnake, snakeHead, coilBox } from "./lib/deadliest-snake.mjs";
import { blinkAt } from "./lib/cute.mjs";

const K = 0.7;          // film units → screen px at z 1 (the coil is ±119 film units wide: ±83 px here)
const RISE = 0.6;       // head height of the raised states (1 = the film's full stand, 290 film units; cut to the slot)
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export default {
  kind: "snake",
  covers: ["snake"],
  source: "deadliest/film/levels/jungle-snake.mjs#drawSnake (+ snakePose timing turned into state parameters)",
  desc: "cute green cobra coiled on the ground, lifts its head, spreads its hood, hisses with a flicking tongue",
  hw: 90, hh: 150,
  start: "coiled on the ground, head low, slow sway, blinking",
  states: {
    coil: [0.5, "coiled on the ground, head low, slow sway"],
    raise: [0.7, "lifts its head up off the coil, eyes open", "rise"],
    hood: [0.5, "spreads its hood wide into flat wings", "swell"],
    hiss: [0.5, "opens its mouth, fangs out, forked tongue flicks, angry brows", "whoosh"],
    look: [0.45, "turns its eyes to the target prop", "blip"],
    relax: [0.6, "hood folds a little, a happy blink and a smile", "wink"],
  },
  // rise: head height · hood: hood spread (0.16 flat … 1 wide) · amp: sway · mouth: open hiss · brows: angry brows
  // flick: tongue flicks per second while hissing · aim: eyes toward the target · happy: smile
  base: { rise: 0, hood: 0.16, amp: 3, mouth: 0, brows: 0, flick: 0, aim: 0, happy: 0 },
  st: {
    coil: { rise: 0, hood: 0.16, amp: 3, mouth: 0, brows: 0, flick: 0, aim: 0, happy: 0 },
    raise: { rise: RISE, hood: 0.16, amp: 4, mouth: 0, brows: 0, flick: 0, aim: 0, happy: 0 },
    hood: { rise: RISE, hood: 1, amp: 9, mouth: 0, brows: 0, flick: 0, aim: 0, happy: 0 },
    hiss: { rise: RISE, hood: 1, amp: 9, mouth: 1, brows: 1, flick: 6, aim: 0, happy: 0 },
    look: { rise: RISE, hood: 1, amp: 3, mouth: 0, brows: 0, flick: 0, aim: 1, happy: 0 },
    relax: { rise: RISE, hood: 0.84, amp: 0, mouth: 0, brows: 0, flick: 0, aim: 0, happy: 1 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "Film colours, coil, neck, hood shading and head kept; the film's time-keyed pose is now state parameters. The coil is rasterised once per scale (cached by 1 %), so a camera zoom rebuilds it. At RISE 0.6 the raised head makes the item about 200 px tall (the film stands 290 units tall; cut to the slot), so hh is the raised measure, centred on the coil. Eye and mouth loops are film-pixel loops placed through the scale (crisp at z 1, may leave dots at z 2 and more).",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = K * z;
    const cb = coilBox(S);
    const gx = cx - (cb.x0 + cb.x1) / 2, gy = cy - (cb.y0 + cb.y1) / 2;      // the coil's box is centred on the footprint
    const ph = s.integ((q) => q.flick), tongue = v.mouth * Math.pow(Math.max(0, Math.sin(Math.PI * ph)), 0.7);
    const closed = Math.sin(Math.PI * s.acc("relax"));                         // one happy blink as it settles
    const blink = blinkAt(t, 3.4, 0.5) * (1 - closed);
    const basePose = { t, rise: v.rise, hood: v.hood * Math.min(1, v.rise * 1.2), amp: v.amp, closed, happy: v.happy, mouth: v.mouth, tongue, brows: v.brows, blink };
    // eyes: an idle gaze, turning toward the target by aim × target presence (no snap when it enters)
    let look = [0, 0.1];
    if (s.look) {
      const head = snakeHead({ ...basePose, look: [0, 0] }, gx, gy, S), dx = s.look[0] - head[0], dy = s.look[1] - head[1], d = Math.hypot(dx, dy) || 1;
      const k = v.aim * (s.lookK ?? 0);
      look = [(dx / d) * k, 0.1 * (1 - k) + (dy / d) * 0.8 * k];
    }
    const P = { ...basePose, look };
    const out = drawSnake(c, gx, gy, S, P, 1);
    const [hx, hy] = out.head;
    return { box: out.box, pt: [hx, hy], face: [hx, hy], faceBox: { x0: hx - 54 * S, y0: hy - 41 * S, x1: hx + 54 * S, y1: hy + 41 * S } };
  },
};
