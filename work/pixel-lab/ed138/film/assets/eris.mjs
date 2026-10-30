// ed138 «eris» (new, 2026-10-28): Eris, the far bright dwarf planet — almost white frost, very smooth, faint grey mottling and a
// soft cold glow. Illustration, not a map. lib/sphere.mjs.
import { body, n3 } from "../lib/sphere.mjs";

const SNOW = ["#202230", "#383A4C", "#585A6E", "#7C7E92", "#A0A2B4", "#C2C4D2", "#E0E2EC", "#FCFCFF"];

export function drawEris(c, cx, cy, r, o) {
  return body(c, cx, cy, {
    r, a: o.a, spin: o.spin, tilt: -0.1, phi: 0.2, amb: 0.1, rim: 0.32, spec: 0.5, glow: 0.25 + (o.glow ?? 0), glowCol: "#DCE4FF", dot: "#F0F4FF", edge: "#30344C",
    surface(P) {
      const m = n3(P[0] * 2.4 + 1, P[1] * 2.4, P[2] * 2.4 + 5, 9), f = n3(P[0] * 7, P[1] * 7, P[2] * 7, 3);
      return { ramp: SNOW, v: 0.06 + (m > 0.62 ? -0.08 : 0) + 0.04 * (f - 0.5) };
    },
  });
}

export default {
  kind: "eris",
  covers: ["eris", "dwarf planet eris"],
  source: "ed138 (new)",
  desc: "Eris: a far, almost white frosty dwarf planet with a soft cold glow",
  hw: 60, hh: 60, start: "turns slowly, glows faintly",
  states: { idle: [0.6, "turns slowly, glowing softly"], spin: [0.8, "spins faster", "whirr"], glow: [0.7, "the cold glow swells", "glow"] },
  base: { spin: 0, glow: 0 },
  st: { idle: { spin: 0, glow: 0 }, spin: { spin: 1 }, glow: { glow: 1 } },
  notes: "lib/sphere.mjs",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, spin = 0.08 * t + s.integ((q) => 3 * q.spin);
    return drawEris(c, cx, cy, 60 * z, { a: s.a, spin, glow: v.glow });
  },
};
