// catalog-v1 item «paper-sheet»: the sheet of paper on the floor from the «Why do cats love boxes?» film
// (cat-boxes/film/props-paper.mjs#drawPaper, copied into items/lib/cat-boxes-paper.mjs with the kit in
// items/lib/cat-boxes-kit.mjs). Changes: the square ink and the disc ink (the taped Kanizsa illusion) are two separate
// Bayer-gated dissolves (sq, dk) instead of one kind switch, so the states crossfade; a blank sheet is kind "blank".
// Flutter is an eased amplitude on a slow rotation of the sheet. The dog-ear and the two tape corners stay as drawn.
// No fold state: the film's dog-ear is a fixed corner, not an animated fold (noted below).
import { drawPaper } from "./lib/cat-boxes-paper.mjs";

const S = 96;            // sheet size in screen px at z 1 (the sheet is 1.3 S wide, 1.15 S deep, seen flat)

export default {
  kind: "paper-sheet",
  covers: ["paper-sheet", "kanizsa-square"],
  source: "cat-boxes/film/props-paper.mjs#drawPaper (kind square / kanizsa; kit in props-kit.mjs)",
  desc: "white sheet of paper lying flat on the floor, tape on two corners; can flutter, show a square, or the taped Kanizsa illusion",
  hw: 72, hh: 28,
  start: "lies flat on the floor, still",
  states: {
    flat: [0.5, "lies flat, blank, tape on two corners"],
    flutter: [0.7, "flutters, lifting its far corner in a draught", "flutter"],
    square: [0.6, "an ink square dissolves onto the paper", "appear"],
    kanizsa: [0.9, "four ink wedges appear; the square between them glows, an illusion", "sparkle"],
  },
  // flut: flutter amplitude · sq: square ink · dk: disc ink · glow: illusory-square glow
  base: { flut: 0, sq: 0, dk: 0, glow: 0 },
  st: {
    flat: { flut: 0, sq: 0, dk: 0, glow: 0 },
    flutter: { flut: 1, sq: 0, dk: 0, glow: 0 },
    square: { flut: 0, sq: 1, dk: 0, glow: 0 },
    kanizsa: { flut: 0, sq: 0, dk: 1, glow: 1 },
  },
  linear: [],
  notes: "One flag left: 108 px for one frame at 4.6 s (the end of the kanizsa key). It follows the illusion glow (the same flag stays with the edge shimmer and with a linear or earlier-saturating glow; it is gone with glow 0), not the wedges, so it is a glow threshold step. Not ported: the fold state (the film's dog-ear is a fixed corner in drawPaper, not an animated fold); the wonky sheet. The Kanizsa wedges are the film's pac-style inducers (a generic illusion shape, not a game sprite). Flutter is a rotation of the flat sheet, not a bend. Tape corners are drawn in every state, as in the film.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v;
    const G = { z, X: (u) => cx + u * z, Y: (w) => cy + w * z, wx: (X) => (X - cx) / z, wy: (Y) => (Y - cy) / z };
    // the flutter is a sum of two slow sines scaled by the eased amplitude: it starts and ends at rest
    const rot = -0.035 + v.flut * (0.12 * Math.sin(t * 2.6) + 0.04 * Math.sin(t * 4.1 + 1));
    const r = drawPaper(c, G, 0, "blank", { size: S, rot, sq: v.sq, dk: v.dk, glow: v.glow, t });
    return { box: { x0: r.x0 - 1, y0: r.y0 - 1, x1: r.x1 + 1, y1: r.y1 + 1 }, pt: [cx, cy] };
  },
};
