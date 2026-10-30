// catalog-v1 copy (2026-10-26) of work/pixel-lab/dog/film/props.mjs#droplet (+ WATER ramp, TOP/BOT unused): the blue water
// droplet with shaded rim and a white glint. Changes: the glint colour IV is the cute kit's C.IV (#FDFEED, same value as the
// film's C.IV); import paths; `gateG` is a new helper (Bayer-gated view) so a droplet can dissolve in or out without a
// one-frame change.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

export const WATER = ["#1E2A5A", "#33458A", "#5470B8", "#7E98DA", "#A9C4FF", "#D8E4FF"];
const IV = "#FDFEED", R = Math.round;

// a droplet centred (x, y), radius r, stretch > 1 flattens it, < 1 elongates it; ang unused (kept from the film)
export function droplet(g, x, y, r, stretch = 1, ang = 0) {
  const rx = r * stretch, ry = r / Math.sqrt(stretch), ca = Math.cos(ang), sa = Math.sin(ang);
  const x0 = R(x - rx - 2), x1 = R(x + rx + 2), y0 = R(y - rx - 2), y1 = R(y + rx + 2);
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const dx = px - x, dy = py - y, u = (dx * ca + dy * sa) / rx, v = (-dx * sa + dy * ca) / ry, d = u * u + v * v;
    if (d > 1) continue;
    const edge = d > 0.82, k = Math.min(5, Math.max(0, Math.round(1 + 2.2 * (v * 0.5 + 0.5) + 1.2 * (1 - d) + (bayer(px, py) - 0.5) * 0.8)));
    g.px(px, py, edge ? (dy < 0 ? WATER[2] : WATER[0]) : WATER[k]);
  }
  g.disc(R(x - rx * 0.35), R(y - ry * 0.4), Math.max(1, R(r * 0.22)), IV);
  g.px(R(x + rx * 0.35), R(y + ry * 0.45), WATER[5]);
}

// a view of g that draws only the pixels whose Bayer threshold lies in [lo, hi)
export function gateG(g, lo, hi) {
  if (lo <= 0 && hi >= 1) return g;
  const o = Object.create(g);
  o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) g.px(x, y, col); };
  return o;
}
