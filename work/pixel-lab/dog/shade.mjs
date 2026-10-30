// Pixel-art shading engine for organic shapes: Catmull-Rom outlines → mask → chamfer distance field →
// volume (pillow) shading + lit/shadow rims + selective outline, quantised to a ramp with Bayer dithering.
import { bayer, hex } from "../../../renderer/pixel/raster.mjs";

export const FUR = ["#2E1A0C", "#4E2E14", "#7A4A20", "#A86A2C", "#CF9244", "#E6B464", "#F4D28E", "#FBE8BC"];

/** Smooth closed outline through control points; indices in `sharp` stay corners. */
export function smooth(pts, sharp = new Set(), seg = 5) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (sharp.has(i) || sharp.has((i + 1) % n)) { out.push(p1); continue; }
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  return out;
}

/** Fill the union of polygons with volume shading. light = direction the light comes FROM (screen units). */
export function drawPart(g, polys, { ramp = FUR, base = 3.4, gain = 1.6, slope = 1.0, thick = 12, light = [-0.7, -0.7], rimLit = 1, rimShade = 1, outline = ramp[0], litOutline = null, alpha = 1 } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 = Math.floor(x0) - 3; y0 = Math.floor(y0) - 3; x1 = Math.ceil(x1) + 3; y1 = Math.ceil(y1) + 3;
  const W = x1 - x0, H = y1 - y0, m = new Uint8Array(W * H);
  for (const poly of polys) for (let y = 0; y < H; y++) {
    const yc = y0 + y + 0.5, xs = [];
    for (let i = 0; i < poly.length; i++) { const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k]) - x0); x < Math.min(W, Math.round(xs[k + 1]) - x0); x++) m[y * W + x] = 1;
  }
  const INF = 1e9, d = new Float32Array(W * H).map((_, i) => (m[i] ? INF : 0));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; if (x > 0) d[i] = Math.min(d[i], d[i - 1] + 1); if (y > 0) d[i] = Math.min(d[i], d[i - W] + 1); if (x > 0 && y > 0) d[i] = Math.min(d[i], d[i - W - 1] + 1.414); if (x < W - 1 && y > 0) d[i] = Math.min(d[i], d[i - W + 1] + 1.414); }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; if (x < W - 1) d[i] = Math.min(d[i], d[i + 1] + 1); if (y < H - 1) d[i] = Math.min(d[i], d[i + W] + 1); if (x < W - 1 && y < H - 1) d[i] = Math.min(d[i], d[i + W + 1] + 1.414); if (x > 0 && y < H - 1) d[i] = Math.min(d[i], d[i + W - 1] + 1.414); }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]);
  const [lx, ly] = light, ln = Math.hypot(lx, ly) || 1, ux = lx / ln, uy = ly / ln;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!m[i]) continue;
    const X = x0 + x, Y = y0 + y;
    if (alpha < 1 && alpha <= bayer(X, Y)) continue;
    const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
    if (edge) { const litSide = !at(Math.round(x + ux * 1.5), Math.round(y + uy * 1.5)); g.px(X, Y, litSide && litOutline ? litOutline : outline); continue; }
    const t = Math.min(1, d[i] / thick), yN = y / H;
    let v = base + gain * Math.pow(t, 0.6) - slope * yN;
    if (!at(Math.round(x + ux * 3), Math.round(y + uy * 3))) v += rimLit;       // edge facing the light
    if (!at(Math.round(x - ux * 4), Math.round(y - uy * 4))) v -= rimShade;     // edge away from the light
    // flat tone bands; dither only in the narrow transition between two tones
    const fl = Math.floor(v), f = v - fl, q = f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl;
    const idx = Math.max(1, Math.min(ramp.length - 1, q));
    g.px(X, Y, ramp[idx]);
  }
}
