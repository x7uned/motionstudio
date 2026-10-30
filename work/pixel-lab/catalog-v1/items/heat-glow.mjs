// catalog-v1 item «heat-glow»: the warm aura of «Why do cats love boxes?» (cat-boxes/film/props-ui.mjs#heatAura, copy in
// lib/catboxes-heat.mjs) as a world effect prop: a soft orange dithered glow with wavy heat lines rising through it.
// Strength, rise speed and the extra «hot» lines are eased parameters; the rise phase is integrated, so heating up or
// cooling down never jumps.
import { heatAura } from "./lib/catboxes-heat.mjs";

export default {
  kind: "heat-glow",
  covers: ["heat-glow"],
  source: "cat-boxes/film/props-ui.mjs#heatAura",
  desc: "warm effect: soft orange glow with wavy heat lines rising (body heat, warmth, a hot spot)",
  hw: 76, hh: 96, start: "a faint warm glow, slow heat lines rise",
  states: {
    faint: [0.5, "a faint warm glow, a few slow heat lines"],
    warm: [0.6, "a warm orange aura, heat waves rising", "glow"],
    hot: [0.7, "a strong hot aura, more and faster heat waves", "swell"],
    pulse: [0.7, "the aura swells once like a warm breath", "glow"],
    cool: [0.9, "the glow cools and fades, the heat lines stop", "dim"],
  },
  base: { k: 0.45, ln: 0.5, hot: 0, rate: 0.7 },
  st: {
    faint: { k: 0.45, ln: 0.5, hot: 0, rate: 0.7 },
    warm: { k: 1, ln: 1, hot: 0, rate: 1 },
    hot: { k: 1.7, ln: 1, hot: 1, rate: 1.6 },
    pulse: {},
    cool: { k: 0, ln: 0, hot: 0, rate: 0.5 },
  },
  demo: { tile: "hot" },
  notes: "World effect prop (moves with the camera) in its own slot: the glow is centred a little low and the heat rises above it, so it reads as warmth from a thing in or behind it. pulse is a one-off swell (s.acc) on top of the held strength; cool leaves nothing visible (the item stays present but empty). Colours are the film's fixed oranges (no theme tint).",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, a = s.a ?? 1, w = 150 * z, h = 184 * z, pu = Math.sin(Math.PI * Math.max(0, Math.min(1, s.acc("pulse"))));
    heatAura(c, cx, cy, w * (1 + 0.12 * pu), h * (1 + 0.08 * pu), t, a, { k: v.k * (1 + 0.6 * pu), ln: v.ln, hot: v.hot, ph: s.integ((q) => q.rate) });
    return { box: { x0: cx - w / 2, y0: cy - h * 0.5, x1: cx + w / 2, y1: cy + h * 0.6 }, pt: [cx, cy] };
  },
};
