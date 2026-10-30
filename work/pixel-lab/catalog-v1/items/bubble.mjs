// catalog-v1 item «bubble»: the rising bubbles of the river film (deadliest/film/levels/river-kit.mjs#bubble, copied to
// items/lib/deadliest-river-bubble.mjs; river.mjs draws them rising from a river bed with a sway). Changes: the film draws
// a short string of six bubbles at fixed heights; here a column of up to eight bubbles rises from the slot, each on its own
// loop: born in the slot by a dissolve, wobbling as it rises, and dissolving out near the top. Rise is the integral of the
// rate, so the speed changes smoothly. The count (n) is an eased weight. «pop» eases a threshold (pop) that moves the
// point where bubbles swell and burst lower, so the bubbles pop in turn instead of all at once. Bubble size is ×2.2 of the
// film's radius (the film's bubbles are 1.5–3 px in a 540 px frame).
import { bubble } from "./lib/deadliest-river-bubble.mjs";
import { sm, clamp01 } from "./lib/cute.mjs";

const N = 8, K = 2.2, H = 104, TAU = Math.PI * 2, R = Math.round;
const fract = (x) => x - Math.floor(x);
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// fixed scatter: every bubble keeps its own rise time, offset, column and size
const PER = [], OFF = [], X = [], RR = [];
for (let i = 0; i < N; i++) { PER.push(2.2 + rnd(i + 4) * 0.9); OFF.push(rnd(i + 21)); X.push((rnd(i + 31) - 0.5) * 26); RR.push((1.6 + rnd(i * 3 + 5) * 1.2) * K); }

export default {
  kind: "bubble",
  covers: ["bubble"],
  source: "deadliest/film/levels/river-kit.mjs#bubble (+ river.mjs rising string); copy in items/lib/deadliest-river-bubble.mjs",
  desc: "a column of pale rising bubbles from its slot; can pop at the top and stop",
  hw: 22, hh: 76,
  start: "a few bubbles drift up from the slot",
  demo: { tile: "stream" },
  states: {
    few: [0.4, "a few bubbles drift up"],
    stream: [0.55, "a steady stream rises", "flutter"],
    pop: [0.7, "bubbles swell and pop near the top", "pop"],
    stop: [0.5, "no new bubbles; the rising ones dissolve", "dim"],
  },
  // n: bubbles present (0..8, eased weights) · rate: rise speed · pop: 0 = bubbles rise to the top, 1 = they pop mid-rise
  base: { n: 3, rate: 1.0, pop: 0 },
  st: {
    few: { n: 3, rate: 1.0, pop: 0 },
    stream: { n: 8, rate: 1.5, pop: 0 },
    pop: { n: 8, rate: 1.5, pop: 1 },
    stop: { n: 0, rate: 0.5 },
  },
  linear: [],
  notes: "Film bubble drawn unchanged (river-kit). Phases come from one integral of the rate, so speed changes never jump. Pop: a bubble swells by 45% and dissolves over 0.14 of its rise, starting at 0.84 of the rise (0.38 with pop 1), so the threshold glides as the parameter eases.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, I = s.integ((q) => q.rate), pop = clamp01(v.pop);
    const uPop = 0.84 - 0.46 * pop;                                // where bubbles start to pop (eased)
    for (let i = 0; i < N; i++) {
      const w = sm(v.n - i, 0, 1); if (w <= 0) continue;
      const u = fract(I / PER[i] + OFF[i]);                        // 0 = at the slot, 1 = back at the slot
      const wob = Math.sin(u * TAU * 1.5 + i * 2.1) * 3 * z;
      const x = cx + X[i] * z + wob, y = cy + 30 * z - u * H * z;
      const born = sm(u, 0, 0.14), dk = sm(u, uPop, uPop + 0.14);   // dissolve in at the slot, pop and dissolve out at the top
      const a = w * born * (1 - dk);
      if (a <= 0) continue;
      bubble(c, R(x), R(y), RR[i] * z * (1 + 0.45 * dk), a, "#D8F6F0");
    }
    return { box: { x0: cx - 26 * z, y0: cy - 80 * z, x1: cx + 26 * z, y1: cy + 40 * z }, pt: [cx, cy - 30 * z] };
  },
};
