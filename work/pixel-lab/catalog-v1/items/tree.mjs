// catalog-v1 item «tree»: the apple tree of animals-wingbeat's garden level (levels/garden-flora.mjs appleTree, copy in
// lib/wingbeat-flora.mjs): a short two-tone trunk and a round crown of six bumpy leaf balls lit from the upper left, with
// red apples. Drawn per frame in screen pixels at scale 1.7 (the tallest prop). States move only what the film tree has:
// the crown bends with height (sway / strong wind lean + flutter of the balls), and its little dots — apples or pink
// blossoms (the film's petal palette) — dither in and out spot by spot (a crossfade, never a swap).
import { appleTree } from "./lib/wingbeat-flora.mjs";

const SC = 1.7, TOP = 130;                  // scale at z 1, crown top above the trunk foot (film px)
export default {
  kind: "tree",
  covers: ["tree"],
  source: "animals-wingbeat/film/levels/garden-flora.mjs#appleTree",
  desc: "round green apple tree with a short trunk and red apples; sways, bends in strong wind, blossoms pink",
  hw: 96, hh: 112, start: "stands, the crown stirs slightly",
  states: {
    still: [0.7, "stands calmly"],
    sway: [0.7, "the crown sways gently in a breeze", "swish"],
    wind: [0.8, "strong wind: the crown leans hard and its leaves shake", "whoosh"],
    blossom: [1.0, "the apples give way to pink blossoms", "sparkle"],
    fruit: [1.0, "red apples ripen all over the crown", "pop"],
  },
  base: { sway: 0, wind: 0, fruit: 1, bloom: 0 },
  st: {
    still: { sway: 0, wind: 0 },
    sway: { sway: 1, wind: 0 },
    wind: { wind: 1, sway: 0 },
    blossom: { bloom: 1, fruit: 0 },
    fruit: { fruit: 1, bloom: 0 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "Economy port: film appleTree as is (trunk + six leaf balls + apples), trunk width now scales with size. Blossoms are a catalog addition built from the film petal palette at the apple-dot technique; a few dots sit on the crown edge (random spots, as the film apples). Wind lean is moderate (top ~16 px at z 1) and reads best in motion. Measured 101×112 incl. wind lean. 22 ms/frame.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = SC * z, foot = cy + TOP * S * 0.5;
    const A = S * (0.5 * Math.sin(1.1 * t) + v.sway * (3.2 * Math.sin(1.7 * t + 0.4) + 0.8 * Math.sin(3.9 * t))
      + v.wind * (9.5 + 2.5 * Math.sin(3.1 * t) + 1.2 * Math.sin(7.3 * t + 1)));
    const bend = (h) => { const k = Math.max(0, h) / (TOP * S); return A * k * k; };
    const jit = (b) => [S * (v.wind * 1.2 * Math.sin(6.1 * t + b * 1.7) + v.sway * 0.3 * Math.sin(3.3 * t + b)), S * v.wind * 0.8 * Math.sin(5.3 * t + b * 2.3)];
    appleTree(c, cx, foot, S, 0, { bend, jit, fruit: v.fruit, bloom: v.bloom });
    return { box: { x0: cx - 56 * S + Math.min(0, A), y0: foot - (TOP + 1) * S, x1: cx + 56 * S + Math.max(0, A), y1: foot }, pt: [cx + A * 0.5, foot - 88 * S] };
  },
};
