// catalog-v1 item «frog»: the animals-wingbeat pond's small cute frog peeking out of the water (pond-kit.mjs#peekFrog, copy in
// lib/wingbeat-frog.mjs). The film's pixel drawing is kept as is; blockView scales each film pixel to K×K screen px, so the
// zoom keeps the film's pixel look. Its states use the film's own options: the eyes turn (look), the throat swells (throat),
// and the head sinks under the water (only the eyes stay above the waterline).
import { peekFrog } from "./lib/wingbeat-frog.mjs";
import { blockView } from "./lib/wingbeat-scale.mjs";
import { blinkAt } from "./lib/cute.mjs";

const K0 = 3;   // screen px per film pixel at z 1 (the dome is 48 film px wide)
export default {
  kind: "frog",
  covers: ["frog"],
  source: "animals-wingbeat/film/levels/pond-kit.mjs#peekFrog",
  desc: "small cute green frog peeking out of the pond, big yellow eyes, pink cheeks",
  hw: 74, hh: 68, start: "peeks out of the water, blinks slowly",
  states: {
    peek: [0.6, "peeks out of the water, eyes just above the surface"],
    look: [0.45, "turns its big yellow eyes to the target prop", "blip"],
    croak: [0.6, "throat puffs up in a croak", "swell"],
    sink: [0.8, "sinks under the water, only the eyes stay above", "fall"],
  },
  base: { look: 0, throat: 0, dip: 0 },
  st: {
    peek: { look: 0, throat: 0, dip: 0 },
    look: { look: 1, throat: 0, dip: 0 },
    croak: { look: 0, throat: 1, dip: 0 },
    sink: { look: 0, throat: 0, dip: 1 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "peekFrog is the film drawing unchanged; each film pixel becomes a K×K block (lib/wingbeat-scale.mjs). FLAG (explained): one jump at the start of the look state (about 2.5 s in the sheet): the pupils step by one film pixel (3 screen px) when the aim crosses a rounding threshold; a dissolve would fade the whole body for that frame, so the step stays. croak: the film throat option only raises the dome by 0.8 px per unit, so the puff is scaled x4 and cross-dissolved between half-unit levels (the outline steps otherwise). sink: the head moves down 6 film px, cross-dissolved between the two neighbouring pixel rows; the waterline moves with it. The idle blink is the only idle motion (the film frog is still).",
  draw(c0, cx, cy, z, t, s) {
    // the presence s.a is applied here (raw canvas + alpha). The outline of a shape change flips in steps (the film's ell/
    // blob rounding), and the sink moves in whole film pixels: both are cross-dissolved between the two neighbouring levels
    // (4 draws at most), so nothing shifts or flips in one frame.
    const c = s.raw ?? c0, pa = s.a ?? 1, v = s.v, K = K0 * z;
    let look = [0, 0];
    if (s.look && v.look > 0) { const dx = s.look[0] - cx, dy = s.look[1] - cy, d = Math.hypot(dx, dy) || 1, k = v.look * s.lookK; look = [(dx / d) * k, (dy / d) * 0.8 * k]; }
    const d = v.dip * 6, d0 = Math.floor(d), w = d - d0, oy = cy + d * K;
    const tg = v.throat * 4, tl = Math.floor(tg / 0.5) * 0.5, tw = (tg - tl) / 0.5;
    const blink = blinkAt(t, 3.3, 1.3), V = blockView(c, K, cx, cy);
    for (const [dy, wy] of [[d0, 1 - w], [d0 + 1, w]]) for (const [th, wt] of [[tl, 1 - tw], [tl + 0.5, tw]]) {
      const a = wy * wt * pa; if (a > 0.001) peekFrog(V, 0, dy, { look, blink, throat: th, a });
    }
    return { box: { x0: cx - 24 * K, y0: oy - 17 * K, x1: cx + 24 * K, y1: oy + 16 * K }, pt: [cx, oy - 9 * K], face: [cx, oy - 1 * K],
      faceBox: { x0: cx - 22 * K, y0: oy - 16 * K, x1: cx + 22 * K, y1: oy - 2 * K } };
  },
};
