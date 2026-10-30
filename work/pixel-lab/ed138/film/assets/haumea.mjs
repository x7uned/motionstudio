// ed138 «haumea» (new, 2026-10-28): Haumea, the egg-shaped dwarf planet — a fast-spinning stretched ellipsoid (so its outline
// lengthens and shortens as it turns) of bright crystalline ice with one dark red spot. Illustration. lib/sphere.mjs (ellipsoid).
import { body, n3 } from "../lib/sphere.mjs";

const ICE = ["#1C2030", "#30364C", "#4A526C", "#6A7490", "#8E98B2", "#B2BCD2", "#D6DEEC", "#F6FAFF"];
const RED = ["#1E0A0E", "#341218", "#501C24", "#6C2830", "#88363C", "#A2484C", "#BA5E5E", "#D07A76"];

export function drawHaumea(c, cx, cy, r, o) {
  return body(c, cx, cy, {
    r, a: o.a, spin: o.spin, tilt: 0.08, phi: 0.22, axes: [1, 0.52, 0.72], amb: 0.09, rim: 0.3, spec: 0.35, glow: o.glow ?? 0, glowCol: "#C8D8FF", dot: "#E8F0FF",
    surface(P, lat, lon) {
      const f = n3(P[0] * 3.4, P[1] * 3.4 + 3, P[2] * 3.4, 6);
      const spot = Math.hypot(P[0] - 0.62, P[1] - 0.1, P[2] - 0.77) < 0.32 + 0.08 * (f - 0.5);
      return spot ? { ramp: RED, v: 0.02 } : { ramp: ICE, v: 0.05 * (f - 0.5) + (f > 0.66 ? -0.06 : 0) };
    },
  });
}

export default {
  kind: "haumea",
  covers: ["haumea", "dwarf planet haumea", "egg-shaped dwarf planet"],
  source: "ed138 (new)",
  desc: "Haumea: an egg-shaped icy dwarf planet that spins fast, with one dark red spot",
  hw: 64, hh: 40, start: "spins end over end around its short axis, outline breathing longer and shorter",
  states: { idle: [0.6, "spins steadily"], spin: [0.8, "spins much faster", "whirr"], glow: [0.7, "a soft halo swells round it", "glow"] },
  base: { spin: 0, glow: 0 },
  st: { idle: { spin: 0, glow: 0 }, spin: { spin: 1 }, glow: { glow: 1 } },
  notes: "ray-traced ellipsoid 1 : 0.52 : 0.72 (long axis in the equator)",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, spin = 0.9 * t + s.integ((q) => 4 * q.spin);
    return drawHaumea(c, cx, cy, 62 * z, { a: s.a, spin, glow: v.glow });
  },
};
