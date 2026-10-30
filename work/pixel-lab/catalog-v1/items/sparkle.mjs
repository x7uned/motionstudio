// catalog-v1 item «sparkle»: the four-ray star with a bright core of the desert film (deadliest/film/levels/desert-kit.mjs
// #sparkle, copied to items/lib/deadliest-desert-sparkle.mjs) as the village spell and the desert poke draw it: a ring of
// glints round the slot. Changes: the film fires a burst once (a sine of the key) around one point; here seven glints sit on
// their own angles and radii, each twinkles on its own phase (a pulse of size and strength), the count (n) and the
// strength (amp) are eased weights so a glint is never switched on or off in one frame, and burst pushes them outward
// and makes them flare. Stars are sized by their pulse, so a size change is a ray step of one pixel, not a pop.
import { sparkle } from "./lib/deadliest-desert-sparkle.mjs";
import { sm, clamp01 } from "./lib/cute.mjs";

const N = 7, TAU = Math.PI * 2, R = Math.round;
const COL = ["#FFF07A", "#FFF4A0", "#FFE060"];          // the film's yellows (desert poke / village spell)
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// fixed scatter: every glint keeps its own angle, radius, base size and twinkle phase
const ANG = [], RAD = [], SZ = [], OFF = [], SPD = [];
for (let i = 0; i < N; i++) { ANG.push(i * TAU / N + (rnd(i + 1) - 0.5) * 0.9); RAD.push(16 + rnd(i + 9) * 12); SZ.push(2.2 + rnd(i + 17) * 2.6); OFF.push(rnd(i + 33) * TAU); SPD.push(1.6 + 0.6 * rnd(i + 5)); }

export default {
  kind: "sparkle",
  covers: ["sparkle"],
  source: "deadliest/film/levels/desert-kit.mjs#sparkle (+ village.mjs spell ring, desert.mjs poke); copy in items/lib/deadliest-desert-sparkle.mjs",
  desc: "a ring of twinkling yellow four-point sparkles around its slot; can burst outward and fade",
  hw: 57, hh: 52,
  start: "a few faint glints flicker around the slot",
  demo: { tile: "twinkle" },
  states: {
    faint: [0.45, "a few faint glints flicker"],
    twinkle: [0.5, "glints twinkle in turn", "sparkle"],
    burst: [0.6, "glints fly outward and flare", "rise"],
    fade: [0.5, "the glints dissolve away", "dim"],
  },
  // n: glints present (0..7) · amp: strength (0..1) · burst: outward push and flare (0..1) · rate: twinkle speed
  base: { n: 3, amp: 0.5, burst: 0, rate: 1.0 },
  st: {
    faint: { n: 3, amp: 0.5, burst: 0, rate: 1.0 },
    twinkle: { n: 6, amp: 1, burst: 0, rate: 2.4 },
    burst: { n: 7, amp: 1, burst: 1, rate: 3.2 },
    fade: { amp: 0 },
  },
  linear: [],
  notes: "Film star drawn unchanged (sparkle from desert-kit). Twinkle phase is the integral of the rate, so a rate change is not a jump. Glints fade through the Bayer dissolve by weight w = n-step × amp. Size floor is 0.77 px at z 1, above the film's 0.6 cut-off.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, ph = s.integ((q) => q.rate), burst = clamp01(v.burst), amp = clamp01(v.amp);
    for (let i = 0; i < N; i++) {
      const w = sm(v.n - i, 0, 1) * amp;                       // this glint's presence: count × strength, eased
      if (w <= 0) continue;
      const pulse = 0.5 + 0.5 * Math.sin(ph * SPD[i] + OFF[i]); // 0..1 twinkle
      const size = SZ[i] * (0.35 + 0.65 * pulse) * (1 + 0.5 * burst) * z;
      const r = RAD[i] * z * (1 + 0.9 * burst);
      const x = cx + Math.cos(ANG[i]) * r, y = cy + Math.sin(ANG[i]) * r * 0.9;
      sparkle(c, R(x), R(y), size, COL[i % 3], w * (0.45 + 0.55 * pulse), "#FFFFFF");
    }
    const ext = 60 * z;
    return { box: { x0: cx - ext, y0: cy - ext, x1: cx + ext, y1: cy + ext }, pt: [cx, cy] };
  },
};
