// catalog-v1 item «radio-wave»: the yellow signal rings of «Plane windows» (plane/film/render.mjs#rings) as a world effect
// prop: rings going out from a small radio point, or a cone of rings travelling toward its target (aim eased by lookK).
// Copy of the ring routine in lib/plane-rings.mjs; the only addition is the small point the rings leave from.
import { rings } from "./lib/plane-rings.mjs";

const YEL = "#F4CA50", IV = "#FDFEED", O = "#0B0812";
const clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;
const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;   // shortest way round
export default {
  kind: "radio-wave",
  covers: ["radio-wave"],
  source: "plane/film/render.mjs#rings (+ its point of origin)",
  desc: "radio signal rings pulsing out from a small radio point; a cone of rings toward its target",
  hw: 70, hh: 70, start: "soft rings pulse out from the point",
  states: {
    quiet: [0.5, "a few faint, small rings, slow"],
    send: [0.5, "rings travel out one after another", "sonar"],
    strong: [0.6, "big bright rings, fast", "swell"],
    toward: [0.6, "the rings narrow into a cone travelling toward the target", "whoosh"],
    stop: [0.6, "the rings fade away: signal off", "dim"],
  },
  base: { amp: 0.4, rate: 0.6, on: 0.6, tw: 0 },
  st: {
    quiet: { amp: 0.4, rate: 0.6, on: 0.6, tw: 0 },
    send: { amp: 0.8, rate: 1.4, on: 1, tw: 0 },
    strong: { amp: 1.3, rate: 1.1, on: 1, tw: 0 },
    toward: { amp: 0.9, rate: 1.4, on: 1, tw: 1 },
    stop: { amp: 0.4, rate: 0, on: 0, tw: 0 },
  },
  linear: [],
  demo: { tile: "strong",  target: true },
  notes: "Film rings (yellow, 2x2 dots, radius u^0.8, every third dot skipped) with the emission made a phase accumulator so rate changes never jump. Only addition: a 4-px yellow point with a dark outline where they leave (≈ 40 novel px). Toward = arcs gated to a cone aimed at s.look; the cone and the aim blend by s.lookK. Rings are born faded, not at a radius of 2 px. Quiet and stop keep the same rings, only smaller or fading. Footprint 70×70 covers the rings at amp 1.3.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, ph = s.integ((q) => q.rate), maxR = (26 + 34 * v.amp) * z;
    const aim = lerpAng(-Math.PI / 2, s.look ? Math.atan2(s.look[1] - cy, s.look[0] - cx) : -Math.PI / 2, s.lookK);
    const half = lerp(Math.PI, 0.45, v.tw * s.lookK);     // half-angle of the cone: all round unless toward a target
    rings(c, cx, cy, ph, maxR, v.on, YEL, aim, half);
    c.disc(Math.round(cx), Math.round(cy), 3, O);
    c.disc(Math.round(cx), Math.round(cy), 2, YEL);
    c.px(Math.round(cx) - 1, Math.round(cy) - 1, IV);
    return { box: { x0: cx - maxR - 1, y0: cy - maxR - 1, x1: cx + maxR + 1, y1: cy + maxR + 1 }, pt: [cx, cy] };
  },
};
