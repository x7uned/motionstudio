// ed138 «neptune» (new, 2026-10-28): Neptune, the blue ice giant — deep blue latitude bands, a dark oval storm with a white
// companion cloud, thin white cloud streaks drifting faster than the planet turns, a cold blue halo. lib/sphere.mjs.
import { body, n3 } from "../lib/sphere.mjs";

const BLUE = ["#060A26", "#0A1644", "#122A68", "#1C448E", "#2A60B2", "#3E80CE", "#62A2E4", "#9CC8F4"];
const WHITE = ["#2A3450", "#46546E", "#66748E", "#8A98AE", "#AEBACC", "#CED8E4", "#E8EEF4", "#FFFFFF"];

export function drawNeptune(c, cx, cy, r, o) {
  const t = o.t ?? 0;
  return body(c, cx, cy, {
    r, a: o.a, spin: o.spin, tilt: 0.1, phi: 0.12, amb: 0.07, rim: 0.3, glow: 0.35 + (o.glow ?? 0), glowCol: "#5C8CF0", dot: "#8CB4FF", edge: "#1A2A5A",
    surface(P, lat, lon) {
      const wob = 0.05 * (n3(P[0] * 4, P[1] * 2, P[2] * 4, 3) - 0.5);
      const bands = Math.sin((lat + wob) * 9) * 0.05 + (Math.abs(lat) > 0.9 ? -0.06 : 0);
      const ds = Math.hypot((lon - 0.35) * 0.9, (lat + 0.35) * 1.6);
      if (ds < 0.16) return { ramp: BLUE, v: -0.2 };
      if (Math.hypot(lon - 0.42, (lat + 0.52) * 1.8) < 0.07) return { ramp: WHITE, v: 0.05 };
      const sl = lon + t * 0.25;                                                        // cloud streaks drift with the wind
      const streak = Math.abs(lat - 0.42) < 0.035 && Math.sin(sl * 5 + 1) > 0.55 || Math.abs(lat + 0.12) < 0.025 && Math.sin(sl * 4.2) > 0.75;
      if (streak) return { ramp: WHITE, v: -0.05 };
      return { ramp: BLUE, v: bands };
    },
  });
}

export default {
  kind: "neptune",
  covers: ["neptune", "ice giant", "blue planet"],
  source: "ed138 (new)",
  desc: "Neptune: deep blue banded ice giant with a dark storm spot and white cloud streaks",
  hw: 64, hh: 64, start: "turns slowly, white streaks drift",
  states: { idle: [0.6, "turns slowly, clouds drift"], spin: [0.8, "spins faster", "whirr"], glow: [0.7, "the blue halo swells", "glow"] },
  base: { spin: 0, glow: 0 },
  st: { idle: { spin: 0, glow: 0 }, spin: { spin: 1 }, glow: { glow: 1 } },
  notes: "lib/sphere.mjs",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, spin = 0.1 * t + s.integ((q) => 3 * q.spin);
    return drawNeptune(c, cx, cy, 64 * z, { a: s.a, spin, glow: v.glow, t });
  },
};
