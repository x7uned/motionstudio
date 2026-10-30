// catalog-v1 item «dog-toy»: the heap of dog toys of the animals film yard (animals/film/levels/yard.mjs#toyPile: balls,
// frisbee, rope, bone, plush star, lamb, carrot) with the rubber duck of its summit (yard.mjs#duck). Both are baked once
// into world layers (lib/animals-toys.mjs); here they are resampled with a transform, so the poses are eased parameters:
// the duck squeaks (squash), is tossed (hop arc) and the whole heap can wobble. «scatter» (toys flying apart) is not
// offered: the film bakes the heap into one picture and splitting it would mean redrawing the parts.
import { toyLayers } from "./lib/animals-toys.mjs";
import { bayer } from "../../../../renderer/pixel/raster.mjs";

const K = 1.15;                                   // screen px per film px at z 1
const GX = 1794, GY = -16;                         // heap ground point (world) = bottom centre
const DX = 1810, DY = -113;                        // duck bottom (world)
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// draw a baked layer with its anchor world point at screen (ax, ay), scale S, per-axis squash (sx, sy about the anchor),
// extra screen offset (ox, oy) and a horizontal shear that grows with the height over the anchor (sh px per px).
function blitT(c, L, wx, wy, ax, ay, S, sx, sy, ox, oy, sh) {
  const W = L.c.w, H = L.c.h, d = L.c.d, m = L.c.m, ww = (L.wx0 | 0), wy0 = L.wy0;
  const bx0 = ax + ox + (L.wx0 - wx) * S * sx - Math.abs(sh) * H * S * sy, bx1 = ax + ox + (L.wx0 + W - wx) * S * sx + Math.abs(sh) * H * S * sy;
  const by0 = ay + oy + (wy0 - wy) * S * sy, by1 = ay + oy + (wy0 + H - wy) * S * sy;
  for (let Y = Math.floor(by0) - 1; Y <= Math.ceil(by1) + 1; Y++) {
    const wyy = wy + (Y + 0.5 - ay - oy) / (S * sy), lv = Math.floor(wyy - wy0); if (lv < 0 || lv >= H) continue;
    const shift = sh * (ay + oy - Y);                      // px of shear at this row
    for (let X = Math.floor(bx0) - 1; X <= Math.ceil(bx1) + 1; X++) {
      const wxx = wx + (X + 0.5 - ax - ox - shift) / (S * sx), lu = Math.floor(wxx - ww); if (lu < 0 || lu >= W) continue;
      const i = lv * W + lu; if (!m[i]) continue;
      c.px(X, Y, [d[i * 3], d[i * 3 + 1], d[i * 3 + 2]]);
    }
  }
}

export default {
  kind: "dog-toy",
  covers: ["dog-toy"],
  source: "animals/film/levels/yard.mjs#toyPile (+ duck)",
  desc: "heap of colourful dog toys (balls, frisbee, rope, bone, plush) topped by a rubber duck that squeaks and hops",
  hw: 93, hh: 76,
  start: "the heap sits still with the duck on top",
  states: {
    still: [0.4, "the heap sits still, the duck on top"],
    squeak: [0.5, "the duck is squeezed twice: it squashes flat and pops back", "pop"],
    toss: [0.7, "the duck hops off the summit in a high arc and lands back", "swish"],
    wobble: [0.8, "the whole heap sways side to side"],
  },
  // wob: sway amplitude · sw: sway rate (integrated phase)
  base: { wob: 0, sw: 0 },
  st: { still: { wob: 0, sw: 0 }, squeak: { wob: 0, sw: 0 }, toss: { wob: 0, sw: 0 }, wobble: { wob: 1, sw: 1.6 } },
  linear: [],
  notes: "No «scatter» state (the film bakes the heap into one picture). The film's grass tint line under the heap is dropped. Squeak and toss use s.acc so the duck always returns to rest; the heap is nearest-neighbour resampled, so a squash/shear re-spaces pixels like a scaled sprite.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = z * K, { LP, LD } = toyLayers();
    const ax = cx, ay = cy + 62 * S;                         // ground point on screen
    const ph = s.integ((q) => q.sw), sway = v.wob * Math.sin(ph * 2 * Math.PI);
    const a1 = s.acc("squeak", 0, 1), sq = Math.abs(Math.sin(2 * Math.PI * a1)) * Math.sin(Math.PI * a1) ** 0.5;
    const a2 = s.acc("toss", 0, 1), u = a2, hop = 4 * u * (1 - u), land = Math.sin(Math.PI * clamp01((u - 0.82) / 0.18));
    const sh = 0.05 * sway;                                  // shear: top moves more than the base
    // contact shadow (dithered ellipse, same footprint as the heap)
    const rx = 80 * S, ry = 8 * S;
    for (let Y = Math.floor(ay - ry); Y <= Math.ceil(ay + ry); Y++) for (let X = Math.floor(ax - rx); X <= Math.ceil(ax + rx); X++) {
      const e = ((X - ax) / rx) ** 2 + ((Y - ay + 2 * S) / ry) ** 2; if (e <= 1 && bayer(X, Y) < 0.38 * (1 - e * 0.5)) c.px(X, Y, "#0B0812");
    }
    blitT(c, LP, GX, GY, ax, ay, S, 1, 1, 0, 0, sh);
    // the duck: squash about its bottom, lifted by the hop arc, riding on the sway shear at the height of the summit
    const sy = 1 - 0.38 * sq - 0.16 * land, sxx = 1 + 0.3 * sq + 0.12 * land;
    const lift = -hop * 34 * S, shear = sh * (97 * S);
    blitT(c, LD, DX, DY, ax + (DX - GX) * S, ay + (DY - GY) * S, S, sxx, sy, shear, lift, 0);
    const top = ay + (-140 - GY) * S + lift;
    return { box: { x0: ax - 80 * S, y0: top, x1: ax + 80 * S, y1: ay }, pt: [ax + (DX - GX) * S, ay + (-118 - GY) * S + lift] };
  },
};
