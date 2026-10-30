// steve-real · timer (new, 2026-10-28): a stopwatch chip — pixel stopwatch with a sweeping hand and an odometer value in
// seconds (s.value, rolling, never jumping), «s» unit. States: idle / run (the hand sweeps) / done (the chip flashes once).
import { plate, odo, odoW, C } from "../lib/hud.mjs";
import { fade } from "../../../../../renderer/pixel/raster.mjs";
const R = Math.round;
export default {
  kind: "timer", covers: ["timer", "stopwatch", "seconds"], source: "steve-real/film (new)", demo: { value: 3, final: 9, unit: "s" }, hud: true, value: true,
  desc: "stopwatch chip with a rolling seconds counter", hw: 46, hh: 16, start: "shows 0 s",
  states: { idle: [0.3, "shows the time"], run: [0.3, "the hand sweeps, the seconds roll", "tick"], done: [0.4, "a bright flash on the final time", "ding"] },
  base: { flash: 0 }, st: { idle: { flash: 0 }, run: { flash: 0 }, done: { flash: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const a = s.a ?? 1, sc = s.scale ?? 2, val = s.value ?? 0, w = 22 * sc + odoW(c, Math.max(9, val), { scale: sc, suffix: s.unit ?? "s" }), h = 7 * sc + 16, x = R(cx - w / 2), y = R(cy - h / 2);
    const fl = Math.sin(Math.PI * s.acc("done")); plate(c, x, y, w, h, a, fl > 0.05 ? "#FFF2A6" : C.Y);
    const g = fade(c, a), wx = x + 8 + 4.5 * sc, wy = y + h / 2 + 1, rr = 4.5 * sc;
    g.rect(R(wx) - 2, R(wy - rr) - 4, 5, 3, C.IV); for (let j = -R(rr); j <= R(rr); j++) for (let i = -R(rr); i <= R(rr); i++) { const d = i * i + j * j; if (d <= rr * rr) g.px(R(wx) + i, R(wy) + j, d > (rr - 1) ** 2 ? C.O : d > (rr - 2.2) ** 2 ? C.IV : "#2A2448"); }
    const an = (val % 1) * Math.PI * 2 - Math.PI / 2; for (let r = 0; r < rr - 2; r++) g.rect(R(wx + Math.cos(an) * r), R(wy + Math.sin(an) * r), 2, 2, C.Y);
    odo(c, val, x + 14 + 9 * sc, y + 8, a, { scale: sc, digits: String(Math.floor(s.final ?? val)).length, suffix: s.unit ?? "s", col: C.IV, suffixCol: C.Y });
    return { box: { x0: x, y0: y, x1: x + w, y1: y + h }, pt: [cx, cy] };
  },
};
