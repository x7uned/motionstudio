// Pixel crossfade gate (copied from ../../../cat-zoomies/film/layout.mjs, same series): a view of canvas c that only
// writes pixels whose Bayer threshold lies in [lo, hi). gate(c, 0, k) for the new state + gate(c, k, 1) for the old one
// give a clean crossfade between two drawings.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
export function gate(c, lo, hi) {
  if (lo <= 0 && hi >= 1) return c;
  const o = Object.create(c);
  o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) c.px(x, y, col); };
  return o;
}
