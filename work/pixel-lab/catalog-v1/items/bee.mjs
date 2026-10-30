// catalog-v1 item «bee»: the meadow film's chubby striped bee facing the camera (big round eyes, fuzzy body, see-through
// buzzing wings, antennae with round tips), ported from work/pixel-lab/animals-weight/film/levels/meadow-bee.mjs#drawBee
// (copy in lib/animals-weight-meadow-bee.mjs, art unchanged). The states are the film's own bee moments (meadow.mjs):
// hovering, the gaze at the target, the heavy nectar load (wings beat harder, it sinks and sweats) and the joyful open mouth.
import { drawBee } from "./lib/animals-weight-meadow-bee.mjs";
import { blinkAt } from "./lib/cute.mjs";

const S0 = 0.85, HY = 19, FLAP = 5.2;   // S0 at camera z 1; the head sits HY·S above the footprint centre; wing cycles/s (≤ 6 Hz: no strobe at 30 fps)
export default {
  kind: "bee",
  covers: ["bee"],
  source: "animals-weight/film/levels/meadow-bee.mjs#drawBee",
  desc: "chubby striped bee facing the camera: big round eyes, fuzzy body, see-through buzzing wings",
  hw: 79, hh: 88, start: "hovers, wings buzz, bobs gently",
  states: {
    hover: [0.5, "hovers in place, wings buzzing"],
    look: [0.45, "turns its big eyes to the target prop", "blip"],
    load: [0.9, "takes a heavy drop of nectar: wings beat harder, it sinks and sweats", "thud"],
    cheer: [0.5, "mouth opens wide in delight", "sparkle"],
  },
  base: { look: 0, load: 0, joy: 0 },
  st: {
    hover: { look: 0, load: 0, joy: 0 },
    look: { look: 1, load: 0, joy: 0 },
    load: { look: 0, load: 1, joy: 0 },
    cheer: { look: 0, load: 0, joy: 1 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = S0 * z;
    const bob = (Math.sin(t * 2.3) * 2.5 + Math.sin(t * 5.1) * 0.6) * z;
    const hx = cx, hy = cy - HY * S + bob + v.load * 7 * z;          // the load pulls the bee lower (film: L · 7 px)
    let look = [0, 0], tilt = 0.03 * Math.sin(t * 0.8) + 0.02 * v.load * Math.sin(t * 1.3);
    if (s.look && v.look > 0) { const dx = s.look[0] - hx, dy = s.look[1] - hy, d = Math.hypot(dx, dy) || 1, k = v.look * s.lookK; look = [(dx / d) * k, (dy / d) * 0.8 * k]; tilt += 0.12 * (dx / d) * k; }
    drawBee(c, hx, hy, { s: S, tilt, look, blink: blinkAt(t, 4.6, 2.0) * (1 - v.joy * 0.5), open: 0.35 + 0.5 * v.joy, flap: t * FLAP, amp: 1 + 0.45 * v.load, antSway: 3 * Math.sin(t * 1.9), worry: v.load * 0.8, sweat: v.load, a: s.a });
    return { box: { x0: hx - 62 * S, y0: hy - 44 * S, x1: hx + 62 * S, y1: hy + 112 * S }, pt: [hx, hy], face: [hx, hy],
      faceBox: { x0: hx - 24 * S, y0: hy - 20 * S, x1: hx + 24 * S, y1: hy + 22 * S } };
  },
};
