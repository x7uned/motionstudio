// catalog-v1 item «spider-web»: the corner web of the night scene (six spokes fanning from a window corner, six sagging
// rings), ported from work/pixel-lab/trial-10s/engine/night.mjs#drawWeb (copy in lib/trial10s-web.mjs; the trial folder
// is not imported). Every change is an eased state parameter: sway, shake, ring sag, glint.
import { drawWebAt } from "./lib/trial10s-web.mjs";

const K = 0.8;                       // film units → screen px at z 1 (the web's radius 120 → 96 px)
const CW = 57, CH = 54;              // centre of the web's box in film units (anchor at (−6, −6), reach 120)
export default {
  kind: "spider-web",
  covers: ["spider-web"],
  source: "trial-10s/engine/night.mjs#drawWeb",
  desc: "corner spider web: spokes and sagging rings in violet; sways, shakes, sags, glints silver",
  hw: 52, hh: 52,
  start: "sways gently in the air",
  states: {
    sway: [0.6, "sways gently in the air, the film's breeze"],
    still: [0.5, "hangs still, the threads taut"],
    shake: [0.5, "shakes hard, the threads trembling", "whirr"],
    sag: [0.7, "rings sag under a weight, the web creaks", "creak"],
    glint: [0.6, "threads catch the light and glint silver", "sparkle"],
  },
  // amp: sway (1 = the film) · jr: shake rate (rad/s, integrated) · jit: shake amplitude · sag: ring sag · glint: silver 0..1
  base: { amp: 1, jr: 0, jit: 0, sag: 0, glint: 0 },
  st: {
    sway: { amp: 1, jr: 0, jit: 0, sag: 0, glint: 0 },
    still: { amp: 0, jr: 0, jit: 0, sag: 0, glint: 0 },
    shake: { amp: 0.6, jr: 16, jit: 2.6, sag: 0, glint: 0 },
    sag: { amp: 1, jr: 0, jit: 0, sag: 1, glint: 0 },
    glint: { amp: 1, jr: 0, jit: 0, sag: 0, glint: 1 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: false },
  notes: "Film lines, colours and spoke/ring geometry kept; the film's night projection is replaced by the item's scale. The film has no dew or droplets: the brief's dew state is a silver glint of the same lines (no new parts). The shake phase is integrated, so it starts and stops with its amplitude.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = K * z;
    const ph = s.integ((q) => q.jr);
    const ox = cx - CW * S, oy = cy - CH * S;
    const out = drawWebAt(c, ox, oy, S, { t, amp: v.amp, jit: v.jit, jph: ph, sag: v.sag, glint: v.glint });
    return { box: { x0: ox - 2, y0: oy - 2, x1: ox + 120 * S + 2, y1: oy + 114 * S + 2 }, pt: out.anchor };
  },
};
