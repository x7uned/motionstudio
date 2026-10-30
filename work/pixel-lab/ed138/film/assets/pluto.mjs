// ed138 «pluto» (new, 2026-10-28): Pluto as a lit pixel sphere — tan-orange crust, the bright heart-shaped plain (left lobe
// smoother and brighter), the dark reddish equatorial belt and a few craters. No face. Illustration, not a map. lib/sphere.mjs.
import { body, craters, n3 } from "../lib/sphere.mjs";

const TAN = ["#1C100C", "#341E16", "#523020", "#74462E", "#986240", "#B88058", "#D4A27A", "#ECC8A4"];
const HEART = ["#2A2634", "#4A4656", "#6E6A7C", "#9692A2", "#BCB8C6", "#DAD6E0", "#EEEAF2", "#FFFFFF"];
const BELT = ["#160806", "#28100C", "#401A12", "#5A2418", "#743020", "#8E402C", "#A8543C", "#C06C52"];
const CR = [[0.6, 0.5, 0.62, 0.12, 0.2], [-0.7, 0.4, 0.6, 0.1, 0.2], [0.4, -0.75, 0.5, 0.11, 0.2], [-0.3, 0.8, -0.5, 0.12, 0.2]]
  .map(([x, y, z, r, d]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l, r, d]; });
/** classic implicit heart, (x²+y²−1)³ − x²y³ ≤ 0, y up */
const heart = (x, y) => { const q = x * x + y * y - 1; return q * q * q - x * x * y * y * y; };

export function drawPluto(c, cx, cy, r, o) {
  return body(c, cx, cy, {
    r, a: o.a, spin: o.spin, tilt: 0.12, phi: 0.18, amb: 0.08, rim: 0.28, glow: o.glow ?? 0, glowCol: "#E8C8A8", dot: "#F2DCC0",
    surface(P, lat, lon) {
      const f = n3(P[0] * 3 + 2, P[1] * 3, P[2] * 3, 4), g = n3(P[0] * 8, P[1] * 8, P[2] * 8 + 1, 6);
      let ramp = TAN, v = 0.08 * (f - 0.5) + 0.04 * (g - 0.5);
      // heart: centred at lon 0.15, lat 0.12 (slightly north of the equator)
      const hx = (lon - 0.15) / 0.62, hy = (lat - 0.02) / 0.56 + 0.15, h = heart(hx * 1.25, hy * 1.25 + 0.1);
      const hEdge = h + 0.06 * (g - 0.5);
      if (hEdge < 0) { ramp = HEART; v = 0.1 + (hx < -0.05 ? 0.08 : 0) + 0.05 * (g - 0.5); }
      else if (lat < -0.12 && lat > -0.5 && Math.abs(lon - 0.15) > 0.55 + 0.25 * (f - 0.5)) { ramp = BELT; v -= 0.02; }  // dark belt
      if (ramp !== HEART) v += craters(P, CR, 1);
      if (Math.abs(lat) > 1.05) v += 0.08;                                                                   // pale polar haze
      return { ramp, v };
    },
  });
}

export default {
  kind: "pluto",
  covers: ["pluto", "dwarf planet pluto"],
  source: "ed138 (new)",
  desc: "Pluto: tan-orange dwarf planet with a bright heart-shaped plain and a dark reddish belt; no face",
  hw: 62, hh: 62, start: "turns slowly, the bright heart faces the viewer",
  states: {
    idle: [0.6, "turns slowly, heart in view"],
    spin: [0.8, "spins faster", "whirr"],
    glow: [0.7, "a soft pale halo swells round it", "glow"],
  },
  base: { spin: 0, glow: 0 },
  st: { idle: { spin: 0, glow: 0 }, spin: { spin: 1 }, glow: { glow: 1 } },
  notes: "heart is centred near the sub-viewer longitude at t 0 and drifts slowly; lib/sphere.mjs",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, spin = -0.1 + 0.05 * Math.sin(t * 0.3) + s.integ((q) => 3 * q.spin);
    return drawPluto(c, cx, cy, 62 * z, { a: s.a, spin, glow: v.glow });
  },
};
