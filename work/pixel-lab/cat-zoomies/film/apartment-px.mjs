// Scratch raster for the apartment background (cat-zoomies film). The whole background is painted into this private
// 540×960 buffer in ALBEDO colours (D) together with a per-pixel kind byte (K), then lit in one pass and copied into the
// caller's canvas. Every primitive here clips to the frame, so cost is proportional to what is visible at any zoom.
// Kinds: 0 wall · 1 floor · 2 object (lit like the wall) · 3 sky (painted by the sky pass, never lit) · 4 emissive.
import { bayer, hex } from "../../../../renderer/pixel/raster.mjs";

export const W = 540, H = 960;
export const D = new Uint8ClampedArray(W * H * 3);
export const K = new Uint8Array(W * H);
export const BY = new Float32Array(16);
for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) BY[y * 4 + x] = bayer(x, y);
export const by = (x, y) => BY[(y & 3) * 4 + (x & 3)];

/** Drawing state: kind written with each pixel, dissolve alpha (Bayer gate), optional mask (only write where K === mask). */
export const P = { kind: 2, alpha: 1, mask: -1 };
export const rgb = (c) => (typeof c === "string" ? hex(c) : c);
export const ramp = (arr) => arr.map(rgb);

export function put(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = y * W + x;
  if (P.mask >= 0 && K[i] !== P.mask) return;
  if (P.alpha < 1 && P.alpha <= BY[(y & 3) * 4 + (x & 3)]) return;
  const j = i * 3; D[j] = c[0]; D[j + 1] = c[1]; D[j + 2] = c[2]; K[i] = P.kind;
}

/** Fill [xa, xb) on row y; c is an [r,g,b] or fn(x, y) → [r,g,b] | null. */
export function span(y, xa, xb, c) {
  if (y < 0 || y >= H) return;
  xa = Math.max(0, xa); xb = Math.min(W, xb); if (xb <= xa) return;
  const fn = typeof c === "function", a = P.alpha, m = P.mask, kd = P.kind, row = y * W, br = (y & 3) * 4;
  for (let x = xa; x < xb; x++) {
    const i = row + x;
    if (m >= 0 && K[i] !== m) continue;
    if (a < 1 && a <= BY[br + (x & 3)]) continue;
    const v = fn ? c(x, y) : c; if (!v) continue;
    const j = i * 3; D[j] = v[0]; D[j + 1] = v[1]; D[j + 2] = v[2]; K[i] = kd;
  }
}

/** Axis-aligned rectangle between screen points (rounded). */
export function rect(x0, y0, x1, y1, c) {
  const ya = Math.max(0, Math.round(y0)), yb = Math.min(H, Math.round(y1)), xa = Math.round(x0), xb = Math.round(x1);
  for (let y = ya; y < yb; y++) span(y, xa, xb, c);
}
/** Rectangle at least 1 px thick in each direction (for trims and lines that must survive low zoom). */
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

/** Darken what is already there by up to `k` inside a rectangle, amount(x, y) 0..1 quantised to two dithered steps. */
export function dim(x0, y0, x1, y1, amount, k = 0.35) {
  const xa = Math.max(0, Math.round(x0)), xb = Math.min(W, Math.round(x1)), ya = Math.max(0, Math.round(y0)), yb = Math.min(H, Math.round(y1));
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
    let v = amount(x, y); if (v <= 0) continue; v = v * 2; const n = Math.floor(v), f = v - n, q = (n + (f > BY[(y & 3) * 4 + (x & 3)] ? 1 : 0)) / 2; if (q <= 0) continue;
    const j = (y * W + x) * 3, m = 1 - k * Math.min(1, q); D[j] *= m; D[j + 1] *= m; D[j + 2] *= m;
  }
}

// ---------------------------------------------------------------- volume shading (clone of dog/shade.mjs drawPart, clipped)
let MB = new Uint8Array(1), DB = new Float32Array(1);
/** Fill the union of polygons with pillow shading quantised to a ramp (index 0 = outline). Same parameters as drawPart. */
export function vol(polys, rp, { base = 3.4, gain = 1.6, slope = 1.0, thick = 12, light = [-0.7, -0.7], rimLit = 1, rimShade = 1, outline = rp[0], litOutline = null } = {}, target = null) {
  const out = target ? (x, y, c) => target.px(x, y, c) : put;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const q of p) { if (q[0] < x0) x0 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[0] > x1) x1 = q[0]; if (q[1] > y1) y1 = q[1]; }
  const M = Math.ceil(thick) + 6;
  x0 = Math.max(-M, Math.floor(x0) - 2); y0 = Math.max(-M, Math.floor(y0) - 2); x1 = Math.min(W + M, Math.ceil(x1) + 2); y1 = Math.min(H + M, Math.ceil(y1) + 2);
  if (x1 <= x0 || y1 <= y0 || x1 < 0 || y1 < 0 || x0 >= W || y0 >= H) return;
  const w = x1 - x0, h = y1 - y0, n = w * h;
  if (MB.length < n) { MB = new Uint8Array(n); DB = new Float32Array(n); }
  const m = MB, d = DB; m.fill(0, 0, n);
  const xs = [];
  for (const poly of polys) for (let y = 0; y < h; y++) {
    const yc = y0 + y + 0.5; xs.length = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k]) - x0); x < Math.min(w, Math.round(xs[k + 1]) - x0); x++) m[y * w + x] = 1;
  }
  const INF = 1e9;
  for (let i = 0; i < n; i++) d[i] = m[i] ? INF : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!d[i]) continue; let v = d[i]; if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) { v = Math.min(v, d[i - w] + 1); if (x > 0) v = Math.min(v, d[i - w - 1] + 1.414); if (x < w - 1) v = Math.min(v, d[i - w + 1] + 1.414); } d[i] = v; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!d[i]) continue; let v = d[i]; if (x < w - 1) v = Math.min(v, d[i + 1] + 1); if (y < h - 1) { v = Math.min(v, d[i + w] + 1); if (x < w - 1) v = Math.min(v, d[i + w + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + w - 1] + 1.414); } d[i] = v; }
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x]);
  const ln = Math.hypot(light[0], light[1]) || 1, ux = light[0] / ln, uy = light[1] / ln;
  const ya = Math.max(0, -y0), yb = Math.min(h, H - y0), xa = Math.max(0, -x0), xb = Math.min(w, W - x0);
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
    const i = y * w + x; if (!m[i]) continue;
    const X = x0 + x, Y = y0 + y;
    const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
    if (edge) { const lit = !at(Math.round(x + ux * 1.5), Math.round(y + uy * 1.5)); out(X, Y, lit && litOutline ? litOutline : outline); continue; }
    const t = Math.min(1, d[i] / thick), yN = y / h;
    let v = base + gain * Math.pow(t, 0.6) - slope * yN;
    if (!at(Math.round(x + ux * 3), Math.round(y + uy * 3))) v += rimLit;
    if (!at(Math.round(x - ux * 4), Math.round(y - uy * 4))) v -= rimShade;
    const fl = Math.floor(v), f = v - fl, q = f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > BY[(Y & 3) * 4 + (X & 3)] ? fl + 1 : fl;
    out(X, Y, rp[Math.max(1, Math.min(rp.length - 1, q))]);
  }
}

/** Catmull-Rom closed outline (same as dog/shade.mjs smooth) — local copy so this module has no cross-film import. */
export function smooth(pts, sharp = new Set(), seg = 5) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (sharp.has(i) || sharp.has((i + 1) % n)) { out.push(p1); continue; }
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  return out;
}

/** Rounded rectangle outline polygon (screen units) for vol(). */
export function rr(x0, y0, x1, y1, r, n = 4) {
  r = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2)); const out = [];
  const c = [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]];
  for (const [cx, cy, a0] of c) for (let k = 0; k <= n; k++) { const a = a0 + (k / n) * (Math.PI / 2); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}
