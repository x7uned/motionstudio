// catalog-v1 item «pet-food»: the glazed blue pet bowl of cat-drink's kitchen (cat-drink/film/kitchen.mjs#drawBowl, copy in
// lib/catdrink-kitchen.mjs: back half with the water surface + ripples, front wall with highlight band). The film bowl always
// held water; here the dry interior (empty) dissolves into water, and kibble (catalog addition at the film's palette scale:
// small brown pieces) piles up between the back and front halves from the bottom of the heap upward, each piece dissolving
// in on its own threshold, and leaves again from the top when eaten. Dog feeder stand not used.
import { drawBowl } from "./lib/catdrink-kitchen.mjs";
import { fade } from "../../../../renderer/pixel/raster.mjs";

const S0 = 2.8, R = Math.round, clamp = (v) => Math.max(0, Math.min(1, v));
const RIM = -10, RAD = 19;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// kibble pieces: position in the unit ellipse (u, v), heap height fraction h (high in the middle), colour step
const PIECES = [];
for (let i = 0; i < 70; i++) {
  const a = rnd(i * 3 + 1) * Math.PI * 2, rr = Math.sqrt(rnd(i * 3 + 2)) * 0.92, u = Math.cos(a) * rr, v = Math.sin(a) * rr;
  PIECES.push({ u, v, h: clamp(1 - (u * u + v * v)) * (0.8 + 0.2 * rnd(i * 3 + 3)), k: i % 3, ph: rnd(i + 99) });
}
PIECES.sort((p, q) => p.v - q.v || p.h - q.h);
const KIB = ["#5A2E14", "#8A4A22", "#B8743A", "#DDA063"];
const DRY = ["#6E5242", "#8A6A58", "#A98672"];

export default {
  kind: "pet-food",
  covers: ["pet-food", "food-bowl", "water-bowl"],
  source: "cat-drink/film/kitchen.mjs#drawBowl",
  desc: "blue pet bowl: empty, filled with rippling water, or heaped with kibble that gets eaten",
  hw: 58, hh: 36, start: "stands empty",
  states: {
    empty: [0.5, "the bowl is empty"],
    water: [0.9, "water fills the bowl and ripples", "swell"],
    full: [0.9, "the bowl is heaped with kibble", "pop"],
    eaten: [1.4, "the kibble is eaten away until almost nothing is left", "fall"],
  },
  base: { water: 0, rip: 0, fill: 0 },
  st: {
    empty: { water: 0, rip: 0, fill: 0 },
    water: { water: 1, rip: 1, fill: 0 },
    full: { water: 0, rip: 0, fill: 1 },
    eaten: { water: 0, rip: 0, fill: 0.1 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "Economy port: film bowl drawn as is (z>=2.5 paw print shows at close-up). Dry interior is a catalog addition (three brown-grey tones) that a dither dissolve turns into the film's water; kibble pieces are a catalog addition (70 deterministic pieces, bottom of the heap first). Ripple rings use a sine envelope so they never pop at wrap.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = S0 * z, rimY = cy - 4 * z;
    const G = { z: S, X: (wx) => cx + wx * S, Y: (wy) => rimY + (wy - RIM) * S };
    const rx = RAD * S, ry = 3 * S, cyy = R(G.Y(RIM));
    drawBowl(c, G, 0, "back", { rim: RIM, r: RAD });
    // dry interior over the water, dissolving away as the water rises
    const dry = fade(c, 1 - clamp(v.water));
    if (v.water < 1) {
      dry.ellipse(R(cx), R(cyy + 0.5 * S), R(rx - 1.5 * S), R(ry - 0.8 * S), DRY[1]);
      dry.ellipse(R(cx - rx * 0.08), R(cyy - 0.1 * S), R(rx * 0.8), R(ry * 0.6), DRY[2]);
      dry.ellipse(R(cx + rx * 0.2), R(cyy + 1.2 * S), R(rx * 0.7), R(ry * 0.4), DRY[0]);
    }
    // ripples (water state)
    if (v.rip > 0.001) for (let i = 0; i < 3; i++) {
      const ph = (t * 0.7 + i / 3) % 1, a = v.rip * clamp(v.water) * Math.sin(Math.PI * ph) * 0.9, r = 2.5 + ph * 13;
      if (a > 0.02) fade(c, a).ering(R(cx + (i - 1) * 2.5 * S), R(cyy + 0.5 * S), R(r * S), Math.max(1, R(r * 0.16 * S)), "#A9C4FF");
    }
    // kibble heap
    const top = cyy - 0.5 * S;
    for (const p of PIECES) {
      const a = clamp((v.fill - p.h * 0.88 + 0.06) / 0.16);
      if (a <= 0.01) continue;
      const wob = 0.35 * Math.sin(1.3 * t + p.ph * 6) * 0 , x = R(cx + p.u * rx * 0.8), y = R(top + p.v * ry * 0.75 - p.h * 4.2 * S - wob);
      const f = fade(c, a), q = Math.max(1, R(0.95 * S)), r2 = Math.max(1, R(0.5 * S));
      f.ellipse(x, y, q, r2, KIB[0]); f.ellipse(x, y, Math.max(1, q - 1), Math.max(0, r2 - 1), KIB[1 + (p.k === 2 ? 0 : p.k)]);
      f.px(x - 1, y - 1, KIB[3]);
    }
    drawBowl(c, G, 0, "front", { rim: RIM, r: RAD });
    const y1 = R(G.Y(0));
    return { box: { x0: R(cx - rx), y0: R(top - 4.5 * S * clamp(v.fill) - ry - 3), x1: R(cx + rx), y1 }, pt: [R(cx), R(cyy - 4 * S)] };
  },
};
