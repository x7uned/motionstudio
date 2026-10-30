// ed138 «makemake» (new, 2026-10-28): Makemake — a reddish-brown dwarf planet with darker rust patches and pale frost streaks.
// Illustration, not a map. lib/sphere.mjs.
import { body, n3 } from "../lib/sphere.mjs";

const RUST = ["#1C0C0A", "#341812", "#50261A", "#703824", "#904E32", "#AE6A46", "#C88A62", "#E0AE88"];
const FROST = ["#2A2228", "#463A42", "#665660", "#887680", "#A898A0", "#C6B8BE", "#E0D6DA", "#F6F0F2"];

export function drawMakemake(c, cx, cy, r, o) {
  return body(c, cx, cy, {
    r, a: o.a, spin: o.spin, tilt: -0.18, phi: 0.2, amb: 0.08, rim: 0.26, glow: o.glow ?? 0, glowCol: "#F0C8A8", dot: "#F4D4BC",
    surface(P, lat) {
      const f = n3(P[0] * 2.6 + 3, P[1] * 2.6, P[2] * 2.6, 12), g = n3(P[0] * 7, P[1] * 9, P[2] * 7, 4);
      if (g > 0.76 && f < 0.55 && Math.abs(lat) < 0.9) return { ramp: FROST, v: 0.02 };
      return { ramp: RUST, v: (f > 0.58 ? -0.1 : f < 0.4 ? 0.06 : 0) + 0.04 * (g - 0.5) };
    },
  });
}

export default {
  kind: "makemake",
  covers: ["makemake", "dwarf planet makemake"],
  source: "ed138 (new)",
  desc: "Makemake: reddish-brown dwarf planet with darker rust patches and pale frost streaks",
  hw: 60, hh: 60, start: "turns slowly",
  states: { idle: [0.6, "turns slowly"], spin: [0.8, "spins faster", "whirr"], glow: [0.7, "a soft halo swells round it", "glow"] },
  base: { spin: 0, glow: 0 },
  st: { idle: { spin: 0, glow: 0 }, spin: { spin: 1 }, glow: { glow: 1 } },
  notes: "lib/sphere.mjs",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, spin = 0.09 * t + 1 + s.integ((q) => 3 * q.spin);
    return drawMakemake(c, cx, cy, 60 * z, { a: s.a, spin, glow: v.glow });
  },
};
