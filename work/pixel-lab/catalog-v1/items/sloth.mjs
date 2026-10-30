// catalog-v1 item «sloth»: the LV2 jungle sloth of the animals-speed series, hanging upside down under a branch with its big
// round head turned up to the camera (pale face mask, dark eye stripes, round eyes, sleepy smile). Ported from
// work/pixel-lab/animals-speed/film/levels/jungle-sloth.mjs#drawSloth (copy in lib/animals-speed-jungle-sloth.mjs). The film's
// branch piece under the claws (jungle.mjs, colours and wave copied, cut to the grip span) is drawn here so the hands hook
// onto something. The film's moth, its warm/algae timeline and the scenery are left out. Every option is an eased parameter.
import { drawSloth, BR } from "./lib/animals-speed-jungle-sloth.mjs";
import { blinkAt } from "./lib/cute.mjs";

const S0 = 0.9;                                          // scale at size m, camera z 1
const HX = -45, HY = 24;                                 // head centre relative to the footprint centre, scale 1
const BARK = ["#160F0A", "#261A12", "#3A2A1C", "#4E3826", "#634832", "#7A5A40", "#94704E", "#AE8A62"];   // film jungle.mjs
const MOSS = ["#24400E", "#355A14", "#4A7618", "#62921E", "#7EAC2A", "#9CC43E", "#BCDA5E"];
const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;

/** The film's branch (x −40…140 at scale 1): a 15 px bark stroke with a moss top, behind the sloth's claws. */
function branch(c, S, hx, hy) {
  const by = hy + BR * S, th = 15 * S;
  for (let sx = -40; sx <= 140; sx++) {
    const X = R(hx + sx * S), top = by + (Math.sin(sx * 0.021) * 2.2 + Math.sin(sx * 0.07) * 0.8) * S;
    for (let k = 0; k < th; k++) {
      const v = k / th, idx = Math.max(0, Math.min(7, Math.round(5.4 - v * 3.6 + (Math.sin(sx * 0.4 + k * 0.9) > 0.85 ? -1 : 0))));
      c.px(X, R(top + k), BARK[idx]);
    }
    const mh = Math.max(1, R((2 + 1.5 * Math.sin(sx * 0.13)) * S));
    for (let k = 0; k < mh; k++) c.px(X, R(top - k + S), MOSS[Math.min(6, 3 + k)]);
  }
}

export default {
  kind: "sloth",
  covers: ["sloth"],
  source: "animals-speed/film/levels/jungle-sloth.mjs#drawSloth (+ the branch of jungle.mjs)",
  desc: "three-toed sloth hanging upside down under a branch, round face turned up to us: big round eyes, sleepy smile",
  hw: 86, hh: 80,
  start: "hangs under the branch, breathes slowly, eyes half open, blinks slowly",
  states: {
    hang: [0.6, "hangs still, breathes slowly, eyes half open"],
    reach: [1.2, "reaches its near arm toward its target and looks at it", "swish"],
    sleepy: [1.0, "eyes slowly close, head sinks a little", "dim"],
    algae: [1.5, "green algae spreads through its fur", "glow"],
  },
  base: { reach: 0, look: 0, sleep: 0, algae: 0 },
  st: {
    hang: { reach: 0, look: 0, sleep: 0, algae: 0 },
    reach: { reach: 1, look: 1, sleep: 0, algae: 0 },
    sleepy: { reach: 0, look: 0, sleep: 1, algae: 0 },
    algae: { reach: 0, look: 0, sleep: 0, algae: 1 },
  },
  linear: [],
  notes: "the film's moth, the snail on the branch and the warm/algae timeline are not in this item; the algae spreads with the film's arrival field (growth from the fur roots), eased over 1.5 s; the film's blink and reach keys are replaced by eased parameters",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = Math.round(S0 * z * 100) / 100;
    const hx = cx + HX * S, hy = cy + HY * S;
    branch(c, S, hx, hy);
    // the near arm reaches toward the target (local units, from the head centre), eased from the default reach point
    let to = [-60, -64];
    if (s.look && s.lookK > 0) to = [lerp(-60, (s.look[0] - hx) / S, s.lookK), lerp(-64, (s.look[1] - hy) / S, s.lookK)];
    // the eyes turn to the target, blended by the target's presence
    const k = v.look * (s.look ? s.lookK : 0);
    let look = [0, 0];
    if (k > 0) { const dx = s.look[0] - hx, dy = s.look[1] - hy, d = Math.hypot(dx, dy) || 1; look = [(dx / d) * k, (dy / d) * 0.8 * k]; }
    const blink = Math.max(v.sleep, blinkAt(t, 5.2, 1.6) * (1 - v.sleep));
    const H = drawSloth(c, hx, hy, {
      s: S, a: 1, t, breath: 1 + 0.9 * Math.sin((t * 2 * Math.PI) / 4.4), reach: clamp01(v.reach), reachTo: to,
      algae: v.algae * 7.5, blink, look, headDy: 6 * v.sleep * S,
    });
    return {
      box: { x0: hx - 50 * S, y0: hy - 113 * S, x1: hx + 140 * S, y1: hy + 54 * S },
      pt: [H.head[0], H.head[1]], face: [H.head[0], H.head[1] + 6 * S],
      faceBox: { x0: H.head[0] - 44 * S, y0: H.head[1] - 44 * S, x1: H.head[0] + 44 * S, y1: H.head[1] + 44 * S },
    };
  },
};
