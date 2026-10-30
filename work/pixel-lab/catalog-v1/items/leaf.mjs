// catalog-v1 item «leaf»: one big shaded leaf (ovate, lit from the upper left, banded tones, lateral veins, light midrib,
// gloss, droop) — the general leaf painter of animals-wingbeat LV5/LV6 (levels/tropic-plants.mjs leaf + stalk, copy in
// lib/wingbeat-flora.mjs), drawn per frame in screen pixels so it stays crisp at any zoom. States move only what the film
// painter already has: angle, droop (bend), base tone / gloss and its palettes (leaf → lime when sunlit, → red in autumn,
// crossfaded per pixel with ordered dither). The fall is an eased drift down with a damped side-to-side rock.
import { leaf, stalk, P } from "./lib/wingbeat-flora.mjs";

const L0 = 170, W0 = 0.36, ANG = -1.02;     // length (grid px at z 1), half width / length, rest direction (tip up-right)
export default {
  kind: "leaf",
  covers: ["leaf"],
  source: "animals-wingbeat/film/levels/tropic-plants.mjs#leaf (+ stalk)",
  desc: "big shaded green leaf with veins and gloss, tip up-right; sways, droops, glows in sun, turns red, falls",
  hw: 66, hh: 86, start: "rests, its tip trembles slightly",
  states: {
    still: [0.6, "rests calmly"],
    sway: [0.6, "sways in the wind", "swish"],
    droop: [0.8, "wilts: the tip bends down heavily", "dim"],
    glow: [0.7, "sunlit: turns bright lime-green and glossy", "glow"],
    autumn: [1.0, "turns red like an autumn leaf", "swell"],
    fall: [1.4, "lets go and drifts down, rocking side to side, and lies tilted", "fall"],
  },
  base: { sway: 0, droop: 0, glow: 0, red: 0, fall: 0 },
  st: {
    still: { sway: 0, droop: 0, fall: 0 },
    sway: { sway: 1, fall: 0 },
    droop: { droop: 1, sway: 0, glow: 0 },
    glow: { glow: 1, droop: 0 },
    autumn: { red: 1, glow: 0 },
    fall: { fall: 1, sway: 0 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "Economy port: the film leaf() as is (ovate, veins, gloss), one shape. Palette changes (lime sunlit, red autumn) are per-pixel dither crossfades added to the copy. droop bends the tip mostly to the right (the painter bends along the normal), not straight down. In the fall pose the petiole flattens to a 1-px line (stalk() spans are horizontal). Fall drifts ~34 px down and rocks; measured footprint 99×101 includes it. 19 ms/frame.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, ff = v.fall, idle = 1 - ff, L = L0 * z;
    const ph = ff * Math.PI * 2.5, rock = Math.sin(ph) * (1 - 0.6 * ff);
    const ang = ANG + 0.24 * v.droop + 0.6 * ff + 0.3 * rock
      + idle * (0.025 * Math.sin(1.3 * t) + v.sway * (0.15 * Math.sin(2.3 * t) + 0.05 * Math.sin(5.1 * t + 1)));
    const bend = L * (0.06 + 0.26 * v.droop + 0.05 * v.red + 0.04 * ff + idle * v.sway * 0.05 * Math.sin(2.3 * t - 0.7));
    const mx = cx + (17 * rock - 6 * ff - 16 * v.droop) * z, my = cy + 34 * z * ff;
    const fx = Math.cos(ang), fy = Math.sin(ang), nx = -fy, ny = fx;
    const bx = mx - fx * L * 0.5, by = my - fy * L * 0.5;
    stalk(c, [[bx - fx * 18 * z + nx * 3 * z, by - fy * 18 * z + ny * 3 * z], [bx + fx * 2 * z, by + fy * 2 * z]], 2.3 * z, 1.7 * z, P.leaf);
    const gk = Math.sin(Math.PI * s.acc("glow"));
    leaf(c, bx, by, ang, L, { shape: "ovate", W: W0, bend, seed: 3, veins: Math.max(5, 7 * z), gloss: 0.5 + 0.6 * v.glow,
      base: 3.4 + 0.8 * v.glow + 0.3 * gk - 0.2 * v.droop, mixes: [[P.lime, 0.75 * v.glow], [P.red, v.red]] });
    const ex = Math.abs(fx) * L * 0.55 + Math.abs(nx) * W0 * L + Math.abs(bend) * 0.5, ey = Math.abs(fy) * L * 0.55 + Math.abs(ny) * W0 * L + Math.abs(bend) * 0.5;
    return { box: { x0: mx - ex, y0: my - ey, x1: mx + ex, y1: my + ey }, pt: [mx + nx * bend * 0.25, my + ny * bend * 0.25] };
  },
};
