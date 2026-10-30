// catalog-v1 item «scorpion»: the deadliest film's chibi desert scorpion facing the camera (round chestnut head, big glossy
// eyes with blush, two pincers with boxer-glove claws, three stubby legs a side, a segmented tail that rises over the head
// to a golden bulb and a hooked stinger), ported from work/pixel-lab/deadliest/film/levels/desert-scorpion.mjs drawScorpion
// (copy in lib/deadliest-scorpion.mjs). The film's own options are eased state parameters; the film is drawn natively at
// scale s, so no resampling is needed.
import { drawScorpion } from "./lib/deadliest-scorpion.mjs";
import { blinkAt } from "./lib/cute.mjs";

// The drawing spans x −120…+120 (claws, legs), y −292…+8 (tail tip to the feet) around the body origin at scale 1; the
// origin sits OY above the footprint centre so the box is centred on it. S0 0.8 = the item scale at size m, camera z 1.
const S0 = 0.8, OY = 142;
export default {
  kind: "scorpion",
  covers: ["scorpion"],
  source: "deadliest/film/levels/desert-scorpion.mjs#drawScorpion",
  desc: "cute chibi scorpion facing the camera: round brown head, big glossy eyes, pincers, tail curling over the back",
  hw: 100, hh: 120, start: "stands on its legs, claws open, tail low, blinks",
  states: {
    calm: [0.5, "stands on its legs, claws open, tail low, blinks"],
    look: [0.45, "turns its big eyes to the target prop", "blip"],
    scuttle: [0.6, "scuttles sideways in tiny steps, legs taking turns", "tick"],
    rise: [0.7, "raises its tail high over its head, stinger aimed forward", "whoosh"],
    clack: [0.5, "pincers snap shut in a quick clack", "thump"],
    worry: [0.6, "tail sinks, claws tuck in, brows lift at the inner ends", "creak"],
  },
  base: { walk: 0, raise: 0.1, arms: 0.2, open: 0.35, grin: 0.25, brows: 0, look: 0 },
  st: {
    calm: { walk: 0, raise: 0.1, arms: 0.2, open: 0.35, grin: 0.25, brows: 0, look: 0 },
    look: { walk: 0, raise: 0.1, arms: 0.2, open: 0.35, grin: 0.3, brows: 0, look: 1 },
    scuttle: { walk: 1, raise: 0.1, arms: 0.2, open: 0.35, grin: 0.25, brows: 0, look: 0 },
    rise: { walk: 0, raise: 1, arms: 0.2, open: 0.6, grin: 0.45, brows: 0, look: 0 },
    clack: { walk: 0, raise: 0.1, arms: 0.8, open: 0.8, grin: 0.4, brows: 0.2, look: 0 },
    worry: { walk: 0, raise: 0, arms: 0, open: 0, grin: 0, brows: -1, look: 0 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "the film's options are used as they are (raise, walk, arms, open, grin, brows, look); the gait phase is integrated from the walk parameter so the legs never jump; the clack is an accent on the open claw (sin of its key), so claws close and reopen in one motion; the worry brows use the film's negative brow sign (inner ends raised); the brows are only 2 px strokes at scale 1, so at the wide shot the worry reads mostly by the sunk tail and tucked claws (a stronger face cue would be a new part, not ported); the film's happy/angry faces were not used because the film has none for this pose",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = S0 * z, ax = cx, ay = cy + OY * S;
    const ph = s.integ((q) => 1.6 * q.walk);
    const cl = Math.sin(Math.PI * s.acc("clack"));
    const open = clamp01(v.open * (1 - 0.8 * cl));
    let look = [0, 0];
    if (s.look && v.look > 0) { const dx = s.look[0] - ax, dy = s.look[1] - (ay - 54 * S), d = Math.hypot(dx, dy) || 1, k = v.look * s.lookK; look = [(dx / d) * k, (dy / d) * 0.8 * k]; }
    const sway = 0.6 * Math.sin(t * 1.3) * (1 - v.raise * 0.5), bob = Math.sin(t * 2.1) * 0.6 * (1 - v.walk);
    drawScorpion(c, ax, ay, t, { s: S, raise: v.raise, walk: v.walk, phase: ph, arms: v.arms, open, grin: v.grin, brows: v.brows, look, blink: blinkAt(t, 3.4, 0.7), sway, bob });
    const hy = ay - 54 * S;
    return { box: { x0: ax - 120 * S, y0: ay - 292 * S, x1: ax + 120 * S, y1: ay + 8 * S }, pt: [ax, hy], face: [ax, hy],
      faceBox: { x0: ax - 44 * S, y0: hy - 40 * S, x1: ax + 44 * S, y1: hy + 34 * S } };
  },
};

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
