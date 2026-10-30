// catalog-v1 item «hummingbird»: Anna's hummingbird of the tropic film (rose crown and gorget with a sliding sheen, big
// bead eyes, a long thin bill, a blurred wing fan), ported from work/pixel-lab/animals-wingbeat/film/levels/
// tropic-hummingbird.mjs#drawHummingbird (copy in lib/animals-wingbeat-tropic-hummingbird.mjs, art unchanged). The states
// are the film's own moments (tropic.mjs hbState): hovering, the gaze at the target, the bill pulled out of the flower and
// the bird backing off, the wing hum, and the closed smiling eyes with a head tilt.
import { drawHummingbird } from "./lib/animals-wingbeat-tropic-hummingbird.mjs";
import { blinkAt, ease } from "./lib/cute.mjs";

const S0 = 0.62, HY = 35, WING_HZ = 5.6;   // S0 at camera z 1; the head sits HY·S above the footprint centre; wing cycles/s (the film's 44 beats/s would strobe at 30 fps)
export default {
  kind: "hummingbird",
  covers: ["hummingbird"],
  source: "animals-wingbeat/film/levels/tropic-hummingbird.mjs#drawHummingbird",
  desc: "chubby hummingbird hovering face-on: big round eyes, shiny rose throat, long thin bill, blurred wings",
  hw: 86, hh: 76, start: "hovers, wings a blur, bobs gently",
  states: {
    hover: [0.5, "hovers in place, wings a blur fan"],
    look: [0.45, "turns its big eyes to the target prop", "blip"],
    bill: [0.7, "pulls its bill out of the flower and backs off", "whoosh"],
    hum: [0.5, "wings blur harder into a hum", "flutter"],
    smile: [0.6, "closes its eyes in a happy smile, head tilts", "sparkle"],
  },
  base: { look: 0, out: 0, buzz: 0.2, happy: 0 },
  st: {
    hover: { look: 0, out: 0, buzz: 0.2, happy: 0 },
    look: { look: 1, out: 0, buzz: 0.2, happy: 0 },
    bill: { look: 0, out: 1, buzz: 0.2, happy: 0 },
    hum: { look: 0, out: 0, buzz: 0.8, happy: 0 },
    smile: { look: 0, out: 0, buzz: 0.2, happy: 1 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = S0 * z, e = ease(v.out);
    const bob = (Math.sin(t * 2.6) * 2 + Math.sin(t * 4.9) * 0.8) * z;
    // the bill pulls out: the whole bird backs off ≈ 22 px along the bill (film: hbState x/y), with a little lift
    const hx = cx + (-Math.cos(0.44) * 22 * e + 0.8 * Math.sin(t * 1.7)) * z, hy = cy - HY * S + bob - (Math.sin(0.44) * 22 + 8) * e * z;
    let look = [0, 0], tilt = -0.14 * v.happy;
    if (s.look && v.look > 0) { const dx = s.look[0] - hx, dy = s.look[1] - hy, d = Math.hypot(dx, dy) || 1, k = v.look * s.lookK; look = [(dx / d) * k, (dy / d) * 0.8 * k]; tilt += 0.08 * (dx / d) * k; }
    drawHummingbird(c, hx, hy, { kind: "anna", s: S, turn: 0.5, beakLen: 52, wingLen: 76, tilt, wing: t * WING_HZ, amt: 1, buzz: v.buzz,
      sheen: (t * 0.3) % 1, look, blink: blinkAt(t, 4.6, 1.3) * (1 - v.happy), happy: v.happy, ghost: 0.55, a: s.a });
    return { box: { x0: hx - 90 * S, y0: hy - 42 * S, x1: hx + 90 * S, y1: hy + 112 * S }, pt: [hx, hy + 30 * S], face: [hx, hy],
      faceBox: { x0: hx - 26 * S, y0: hy - 18 * S, x1: hx + 26 * S, y1: hy + 22 * S } };
  },
};
