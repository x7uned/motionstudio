// steve-real · speedometer (new, 2026-10-28): a round pixel gauge (0–30) with ticks and an eased needle, the value under it
// (s.value, odometer) and s.unit. States: idle (needle at 0) / up (needle sweeps to the value) / hold (needle trembles).
import { plate, odo, odoW, label, C } from "../lib/hud.mjs";
import { fade, bayer } from "../../../../../renderer/pixel/raster.mjs";
const R = Math.round;
export default {
  kind: "speedometer", covers: ["speedometer", "speed", "gauge"], source: "steve-real/film (new)", demo: { value: 20, unit: "km/h" }, hud: true, value: true,
  desc: "round speed gauge, needle sweeps to the value, value and unit under it", hw: 52, hh: 50, start: "needle at zero",
  states: { idle: [0.3, "needle at zero"], up: [0.8, "needle sweeps up to the value", "rise"], hold: [0.3, "needle trembles at the value"] },
  base: { k: 0 }, st: { idle: { k: 0 }, up: { k: 1 }, hold: { k: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const a = s.a ?? 1, g = fade(c, a), r = 50, x0 = R(cx), y0 = R(cy + 4), max = 30, val = (s.value ?? 20) * s.v.k;
    plate(c, x0 - 70, y0 - 60, 140, 112, a, C.B);
    for (let j = -r; j <= 2; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j); if (d <= r && d > r - 3) g.px(x0 + i, y0 + j, C.IV); else if (d <= r - 3 && j < 0) g.px(x0 + i, y0 + j, (i + j) % 7 === 0 ? "#221C3C" : "#1C1734"); }
    for (let q = 0; q <= 6; q++) { const an = Math.PI + (q / 6) * Math.PI; for (let rr = r - 9; rr < r - 4; rr++) g.px(R(x0 + Math.cos(an) * rr), R(y0 + Math.sin(an) * rr), q >= 4 ? C.R : C.IV); }
    const tr = val > 0.5 ? 0.25 * Math.sin(t * 20) * s.v.k : 0, an = Math.PI + ((val + tr) / max) * Math.PI;
    for (let rr = 0; rr < r - 8; rr++) { const px = x0 + Math.cos(an) * rr, py = y0 + Math.sin(an) * rr; g.rect(R(px), R(py), 2, 2, C.Y); }
    g.rect(x0 - 3, y0 - 3, 7, 6, C.IV); g.rect(x0 - 2, y0 - 2, 5, 4, C.O);
    const w = odoW(c, s.value ?? 20, { scale: 3, suffix: s.unit ?? "km/h" }); odo(c, val, R(x0 - w / 2), y0 + 12, a, { scale: 3, digits: 2, suffix: s.unit ?? "km/h", suffixCol: C.Y });
    return { box: { x0: x0 - 70, y0: y0 - 60, x1: x0 + 70, y1: y0 + 52 }, pt: [x0, y0] };
  },
};
