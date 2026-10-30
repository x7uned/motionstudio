// ed138 «ceres» (new, 2026-10-28): Ceres, the dwarf planet of the asteroid belt — dusty grey, crowded with craters, two tiny
// bright salt spots in one crater. Illustration, not a map. lib/sphere.mjs.
import { body, craters, n3 } from "../lib/sphere.mjs";

const GREY = ["#121216", "#222228", "#34343C", "#4A4A54", "#62626E", "#7E7E8A", "#9E9EAA", "#C2C2CC"];
const CR = (() => { const out = []; let h = 7; const r = () => ((h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 26; i++) { const z = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - z * z); out.push([s * Math.cos(a), z, s * Math.sin(a), 0.06 + r() * 0.16, 0.16 + r() * 0.2]); } out.push([0.15, 0.32, 0.94, 0.15, 0.3]); return out; })();

export function drawCeres(c, cx, cy, r, o) {
  return body(c, cx, cy, {
    r, a: o.a, spin: o.spin, tilt: 0.05, phi: 0.12, amb: 0.08, rim: 0.25, glow: o.glow ?? 0, glowCol: "#C8C8D8", dot: "#D8D8E2",
    surface(P) {
      let v = 0.06 * (n3(P[0] * 3, P[1] * 3 + 2, P[2] * 3, 2) - 0.5) + craters(P, CR, 0.9);
      const spot = Math.hypot(P[0] - 0.15, P[1] - 0.32, P[2] - 0.94);
      if (spot < 0.035 || Math.hypot(P[0] - 0.2, P[1] - 0.27, P[2] - 0.94) < 0.022) return { ramp: GREY, v: 0.95, glint: 0.95 };
      return { ramp: GREY, v };
    },
  });
}

export default {
  kind: "ceres",
  covers: ["ceres", "dwarf planet ceres", "asteroid belt dwarf planet"],
  source: "ed138 (new)",
  desc: "Ceres: small dusty grey dwarf planet covered in craters, with two tiny bright spots",
  hw: 60, hh: 60, start: "turns slowly, craters pass through the light",
  states: { idle: [0.6, "turns slowly"], spin: [0.8, "spins faster", "whirr"], glow: [0.7, "a soft halo swells round it", "glow"] },
  base: { spin: 0, glow: 0 },
  st: { idle: { spin: 0, glow: 0 }, spin: { spin: 1 }, glow: { glow: 1 } },
  notes: "lib/sphere.mjs; the bright spots face the viewer near t 0",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, spin = 0.1 * t - 0.2 + s.integ((q) => 3 * q.spin);
    return drawCeres(c, cx, cy, 60 * z, { a: s.a, spin, glow: v.glow });
  },
};
