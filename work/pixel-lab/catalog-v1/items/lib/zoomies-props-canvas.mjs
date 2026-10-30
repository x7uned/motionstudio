// catalog-v1 adapter (2026-10-26, wave W): the cat-zoomies prop code (film scratch-raster primitives of apartment-px /
// zoomies-px, same names and signatures) drawn straight into a catalog canvas view. Call target(c, alpha) at the top of an
// item's draw; alpha < 1 dissolves everything drawn through it (fade view from renderer/pixel/raster.mjs). No film
// lighting pass: the item's own vol() shading is the light. smooth / rr / vol are re-used from zoomies-px.mjs unchanged
// (vol takes the target view as its 4th argument).
import { bayer, fade, hex } from "../../../../../renderer/pixel/raster.mjs";
import { vol as volPx, smooth, rr } from "./zoomies-px.mjs";

const W = 540, H = 960;
let V = null;
export function target(c, alpha = 1) { V = alpha >= 1 ? c : fade(c, alpha); }
export const rgb = (c) => (typeof c === "string" ? hex(c) : c);
export const ramp = (arr) => arr.map(rgb);
export { smooth, rr, bayer };

export function put(x, y, c) { if (c && x >= 0 && y >= 0 && x < W && y < H) V.px(x, y, c); }

export function span(y, xa, xb, c) {
  if (y < 0 || y >= H) return;
  xa = Math.max(0, xa); xb = Math.min(W, xb);
  const fn = typeof c === "function";
  for (let x = xa; x < xb; x++) { const v = fn ? c(x, y) : c; if (v) V.px(x, y, v); }
}

/** Axis-aligned rectangle between screen points (rounded). */
export function rect(x0, y0, x1, y1, c) {
  const ya = Math.max(0, Math.round(y0)), yb = Math.min(H, Math.round(y1)), xa = Math.round(x0), xb = Math.round(x1);
  for (let y = ya; y < yb; y++) span(y, xa, xb, c);
}
/** Rectangle at least 1 px thick in each direction. */
export function rect1(x0, y0, x1, y1, c) {
  let xa = Math.round(x0), xb = Math.round(x1), ya = Math.round(y0), yb = Math.round(y1);
  if (xb <= xa) xb = xa + 1; if (yb <= ya) yb = ya + 1;
  for (let y = Math.max(0, ya); y < Math.min(H, yb); y++) span(y, xa, xb, c);
}

/** Scanline polygon fill (even-odd), clipped. */
export function poly(pts, c) {
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  const ya = Math.max(0, Math.floor(minY)), yb = Math.min(H - 1, Math.ceil(maxY)), xs = [];
  for (let y = ya; y <= yb; y++) {
    const yc = y + 0.5; xs.length = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) span(y, Math.round(xs[k]), Math.round(xs[k + 1]), c);
  }
}

export function ellipse(cx, cy, rx, ry, c) {
  if (rx <= 0 || ry <= 0) return;
  const ya = Math.max(0, Math.floor(cy - ry)), yb = Math.min(H - 1, Math.ceil(cy + ry));
  for (let y = ya; y <= yb; y++) { const d = (y + 0.5 - cy) / ry; if (d * d > 1) continue; const w = rx * Math.sqrt(1 - d * d); span(y, Math.round(cx - w), Math.round(cx + w), c); }
}
export const disc = (cx, cy, r, c) => ellipse(cx, cy, Math.max(0.6, r), Math.max(0.6, r), c);

/** Line: 1 px Bresenham below w = 1.5, otherwise a quad of width w. */
export function line(x0, y0, x1, y1, c, w = 1) {
  if (w >= 1.5) { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * w / 2, ny = (dx / l) * w / 2; poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], c); return; }
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  if (Math.max(dx, -dy) > 4000) return;
  let err = dx + dy;
  for (;;) { put(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}

/** Annulus between radii r0 < r1 (screen px). */
export function ring(cx, cy, r0, r1, c) {
  const ya = Math.max(0, Math.floor(cy - r1)), yb = Math.min(H - 1, Math.ceil(cy + r1));
  for (let y = ya; y <= yb; y++) {
    const d = y + 0.5 - cy; if (Math.abs(d) > r1) continue;
    const wo = Math.sqrt(r1 * r1 - d * d), wi = Math.abs(d) < r0 ? Math.sqrt(r0 * r0 - d * d) : 0;
    if (wi <= 0) span(y, Math.round(cx - wo), Math.round(cx + wo), c);
    else { span(y, Math.round(cx - wo), Math.round(cx - wi), c); span(y, Math.round(cx + wi), Math.round(cx + wo), c); }
  }
}

/** Darken what is already drawn inside a rectangle by up to k; amount(x, y) 0..1, quantised to two dithered steps. */
export function dim(x0, y0, x1, y1, amount, k = 0.35) {
  const xa = Math.max(0, Math.round(x0)), xb = Math.min(W, Math.round(x1)), ya = Math.max(0, Math.round(y0)), yb = Math.min(H, Math.round(y1));
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
    let v = amount(x, y); if (v <= 0) continue; v *= 2; const n = Math.floor(v), f = v - n, q = (n + (f > bayer(x, y) ? 1 : 0)) / 2; if (q <= 0) continue;
    const m = 1 - k * Math.min(1, q), [r, g, b] = V.get(x, y); V.px(x, y, [r * m, g * m, b * m]);
  }
}

/** Pillow-shaded fill of polygons (film vol), written through the current view. */
export function vol(polys, rp, opts = {}) { return volPx(polys, rp, opts, V); }
