// catalog-v1 helper (2026-10-26, batch W): a prop is drawn on a small offscreen grid (renderer/pixel/raster.mjs Canvas) and
// blitted nearest-neighbour onto the frame through c.px, so the item's dissolve view still applies. KEY marks transparent
// grid pixels. Used by items/thermometer.mjs; new helper, no shared file changed.
import { Canvas, toHex } from "../../../../../renderer/pixel/raster.mjs";

export const KEY = "#FF00FF";
export const makeBuf = (w, h) => new Canvas(w, h, KEY);

// blit a grid of size buf.w × buf.h so that its centre lands on (cx, cy) with k screen px per grid px
export function blit(c, buf, cx, cy, k) {
  const x0 = Math.floor(cx - (buf.w * k) / 2), x1 = Math.ceil(cx + (buf.w * k) / 2);
  const y0 = Math.floor(cy - (buf.h * k) / 2), y1 = Math.ceil(cy + (buf.h * k) / 2);
  const cache = new Map();
  for (let y = y0; y < y1; y++) {
    const gy = Math.floor((y + 0.5 - cy) / k + buf.h / 2);
    if (gy < 0 || gy >= buf.h) continue;
    for (let x = x0; x < x1; x++) {
      const gx = Math.floor((x + 0.5 - cx) / k + buf.w / 2);
      if (gx < 0 || gx >= buf.w) continue;
      const i = (gy * buf.w + gx) * 3, r = buf.d[i], g = buf.d[i + 1], b = buf.d[i + 2];
      if (r === 255 && g === 0 && b === 255) continue;
      const key = (r << 16) | (g << 8) | b;
      let col = cache.get(key);
      if (!col) { col = toHex([r, g, b]); cache.set(key, col); }
      c.px(x, y, col);
    }
  }
  return { x0, y0, x1, y1 };
}
