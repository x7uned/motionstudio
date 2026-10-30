// mario-real · cam (new, 2026-10-29): a pinhole street camera with a vertical image plane and lens shift (verticals stay
// vertical, the horizon row hy is free). World in metres: X along the street (→), Y up, Z from the facade (0) toward the
// camera, which stands at (x, h, d) looking at −Z with focal length f (px). Things nearer the camera are bigger: k(Z) = f/(d−Z).
// Pure functions; fast pixel helpers write straight into the canvas buffer.
import { bayer, hex } from "../../../../../renderer/pixel/raster.mjs";

export const R = Math.round, TAU = Math.PI * 2;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const eio = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const eout = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const ein = (x) => Math.pow(clamp01(x), 3);
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const h2 = (i, j, s = 0) => rnd((i * 73856093) ^ (j * 19349663) ^ (s * 83492791));
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
export const BY = new Float32Array(16); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) BY[y * 4 + x] = bayer(x, y);

export function makeCam({ x, h, d, f, hy }) {
  const C = { x, h, d, f, hy };
  C.k = (Z) => f / (d - Z);
  C.sx = (X, Z = 0) => 270 + (f / (d - Z)) * (X - x);
  C.sy = (Y, Z = 0) => hy - (f / (d - Z)) * (Y - h);
  C.P = (X, Y, Z = 0) => [C.sx(X, Z), C.sy(Y, Z)];
  /** depth Z of the plane Y = Yp seen at screen row sy (null if that row does not see the plane) */
  C.planeZ = (sy, Yp = 0) => { const dy = sy + 0.5 - hy, dh = h - Yp; if (dy * dh <= 0) return null; return d - (f * dh) / dy; };
  /** facade-plane (Z) inverse: screen → world X, Y */
  C.wX = (sx, Z = 0) => x + (sx + 0.5 - 270) / (f / (d - Z));
  C.wY = (sy, Z = 0) => h - (sy + 0.5 - hy) / (f / (d - Z));
  return C;
}

/** ramps → rgb arrays */
export const RG = (ramp) => ramp.map(hex);
/** dithered pick from an rgb ramp at level v (0..1), narrow seam */
export function pk(RAMP, v, x, y, w = 0.5) {
  const n = RAMP.length - 1, s = Math.max(0, Math.min(1, v)) * n, i = Math.floor(s), f = s - i, lo = 0.5 - w / 2, k = f <= lo ? 0 : f >= 1 - lo ? 1 : (f - lo) / w;
  return RAMP[Math.min(n, k > BY[(y & 3) * 4 + (x & 3)] ? i + 1 : i)];
}
/** write an rgb array into the canvas buffer */
export function put(c, x, y, rgb) { if (x < 0 || y < 0 || x >= c.w || y >= c.h) return; const i = (y * c.w + x) * 3; c.d[i] = rgb[0]; c.d[i + 1] = rgb[1]; c.d[i + 2] = rgb[2]; }
/** dithered tint of a canvas pixel toward rgb by k (quantised to `steps`) */
export function tint(c, x, y, rgb, k, steps = 4) {
  if (k <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const s = Math.min(1, k) * steps, lo = Math.floor(s), q = (s - lo > BY[(y & 3) * 4 + (x & 3)] ? lo + 1 : lo) / steps; if (q <= 0) return;
  const i = (y * c.w + x) * 3; c.d[i] += (rgb[0] - c.d[i]) * q; c.d[i + 1] += (rgb[1] - c.d[i + 1]) * q; c.d[i + 2] += (rgb[2] - c.d[i + 2]) * q;
}
/** a world quad (4 points [X, Y, Z]) filled with a colour or shade(x, y) → rgb|null, clipped to the canvas */
export function quad(c, C, pts, shade) {
  const sp = pts.map(([X, Y, Z]) => C.P(X, Y, Z));
  if (sp.some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return;
  let y0 = Infinity, y1 = -Infinity; for (const p of sp) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const col = typeof shade === "function" ? null : (Array.isArray(shade) ? shade : hex(shade));
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(c.h - 1, Math.ceil(y1)); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < sp.length; i++) { const [ax, ay] = sp[i], [bx, by] = sp[(i + 1) % sp.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) for (let x = Math.max(0, R(xs[q])); x < Math.min(c.w, R(xs[q + 1])); x++) { const cc = col || shade(x, y); if (cc) put(c, x, y, cc); }
  }
  return sp;
}
/** an axis box X0..X1, Y0..Y1, Z0..Z1 seen by camera C: visible side face, top or bottom, front face. cols {front, top, side, bottom} rgb or fn */
export function box3(c, C, X0, X1, Ya, Yb, Z0, Z1, cols) {
  if (C.d - Z1 < 0.05) return;
  if (cols.side) { if (C.x < X0) quad(c, C, [[X0, Ya, Z0], [X0, Yb, Z0], [X0, Yb, Z1], [X0, Ya, Z1]], cols.side); else if (C.x > X1) quad(c, C, [[X1, Ya, Z0], [X1, Yb, Z0], [X1, Yb, Z1], [X1, Ya, Z1]], cols.side); }
  if (cols.top && C.h > Yb) quad(c, C, [[X0, Yb, Z0], [X1, Yb, Z0], [X1, Yb, Z1], [X0, Yb, Z1]], cols.top);
  if (cols.bottom && C.h < Ya) quad(c, C, [[X0, Ya, Z0], [X1, Ya, Z0], [X1, Ya, Z1], [X0, Ya, Z1]], cols.bottom);
  if (cols.front) quad(c, C, [[X0, Ya, Z1], [X1, Ya, Z1], [X1, Yb, Z1], [X0, Yb, Z1]], cols.front);
}
/** soft contact shadow ellipse on the ground plane at (X, Z), radius rx metres */
export function contact(c, C, X, Z, rx, k = 0.5, col = SHADOW) {
  const [x, y] = C.P(X, 0, Z), s = C.k(Z), px = rx * s, py = Math.max(1.5, Math.abs((C.f * C.h) / (C.d - Z) - (C.f * C.h) / (C.d - Z + rx * 0.8)));
  for (let j = -Math.ceil(py); j <= Math.ceil(py); j++) for (let i = -Math.ceil(px); i <= Math.ceil(px); i++) { const q = (i / px) ** 2 + (j / py) ** 2; if (q < 1) tint(c, R(x + i), R(y + j), col, k * (1 - q * 0.6), 3); }
}
export const SHADOW = hex("#2A1E40");
