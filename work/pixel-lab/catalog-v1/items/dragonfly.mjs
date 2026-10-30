// catalog-v1 item «dragonfly»: the pond film's blue-metal damselfly (clear wings with a blue band, big glossy eyes, a
// small smile), ported from work/pixel-lab/animals-wingbeat/film/levels/pond-damselfly.mjs#drawDamselfly (copy in
// lib/animals-wingbeat-pond-damselfly.mjs: the art is unchanged, every size takes the scale k). The states are the film's
// own moments (pond.mjs damselState and actors): hovering with the wings beating, the gaze at the target, the happy smile.
import { drawDamselfly } from "./lib/animals-wingbeat-pond-damselfly.mjs";
import { blinkAt } from "./lib/cute.mjs";

const S0 = 0.6, HY = 50, FLAP = 5.6;   // S0 at camera z 1; the head sits HY·S above the footprint centre; wing cycles/s (the film's 20 beats/s would strobe at 30 fps)
export default {
  kind: "dragonfly",
  covers: ["dragonfly"],
  source: "animals-wingbeat/film/levels/pond-damselfly.mjs#drawDamselfly",
  desc: "blue metal damselfly facing the camera: big glossy eyes, clear wings with blue bands, small smile",
  hw: 78, hh: 86, start: "hovers, wings beat, sways gently",
  states: {
    hover: [0.5, "hovers over the pond, wings beating, a gentle sway"],
    look: [0.45, "turns its big eyes to the target prop", "blip"],
    smile: [0.6, "opens a big happy smile", "sparkle"],
  },
  base: { look: 0, open: 0.3 },
  st: {
    hover: { look: 0, open: 0.3 },
    look: { look: 1, open: 0.3 },
    smile: { look: 0, open: 0.75 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = S0 * z;
    const hx = cx + Math.sin(t * 1.3) * 2 * z, hy = cy - HY * S + (Math.sin(t * 2.1) * 2.2 + Math.sin(t * 4.3) * 0.7) * z;
    const ph = t * FLAP, e = Math.cos(2 * Math.PI * ph), ePrev = Math.cos(2 * Math.PI * (ph - 1 / 6));   // one wing stroke, with a ghost a sixth of a beat back
    let look = [0, 0], tilt = 0.035 * Math.sin(t * 0.9);
    if (s.look && v.look > 0) { const dx = s.look[0] - hx, dy = s.look[1] - hy, d = Math.hypot(dx, dy) || 1, k = v.look * s.lookK; look = [(dx / d) * k, (dy / d) * 0.8 * k]; tilt += 0.1 * (dx / d) * k; }
    drawDamselfly(c, hx, hy, { k: S, e, ePrev, tilt, sway: 3 * Math.sin(t * 2.0), look, blink: blinkAt(t, 4.9, 2.2), open: v.open, a: s.a });
    return { box: { x0: hx - 100 * S, y0: hy - 80 * S, x1: hx + 100 * S, y1: hy + 180 * S }, pt: [hx, hy + 28 * S], face: [hx, hy],
      faceBox: { x0: hx - 44 * S, y0: hy - 22 * S, x1: hx + 44 * S, y1: hy + 22 * S } };
  },
};
