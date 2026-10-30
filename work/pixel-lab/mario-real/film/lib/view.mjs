// steve-real film2 · view (new, 2026-10-28): the street's stylised 3/4 high-angle projection and drawing helpers.
// World in metres: X along the street (→), Y up, Z from the facade line (0) toward the camera (sidewalk 0–4.6, curb, road
// 5.1–12). At zoom 1 the facade plane is 30 px per metre; things nearer the camera grow (k = 1 + 0.09 Z) and the ground
// opens out below the facades like an RPG street (gy). The camera {cx, fy, z} tracks along X, zooms around the screen
// centre and pans vertically (fy = the base-screen row that sits at screen row 480). All pure functions of their inputs.
import { bayer, hex, mix } from "../../../../../renderer/pixel/raster.mjs";

export const U = 30, KAP = 0.09, Y0 = 430, G1 = 39, G2 = 1.0;
export const R = Math.round, TAU = Math.PI * 2;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const eio = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const eout = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const h2 = (i, j, s = 0) => rnd(i * 73856093 ^ j * 19349663 ^ s * 83492791);
export const kZ = (Z) => 1 + KAP * Z;
export const gyZ = (Z) => G1 * Z + G2 * Z * Z;
export const OL = "#21182C";

/** A view for camera cam = { cx (m), fy (base row at screen 480), z (zoom) }. */
export function makeView(cam) {
  const { cx, fy, z } = cam;
  const V = {
    cam, z, cx, fy,
    s: (Z) => U * kZ(Z) * z,                                             // px per metre at depth Z
    sx: (X, Z = 0) => 270 + z * (X - cx) * U * kZ(Z),
    sy: (Y, Z = 0) => 480 + z * (Y0 + gyZ(Z) - Y * U * kZ(Z) - fy),
    P: (X, Y, Z) => [V.sx(X, Z), V.sy(Y, Z)],
    /** base row → ground depth Z (rows below the facade base) */
    rowZ: (sy) => { const d = fy + (sy - 480) / z - Y0; return d <= 0 ? d / G1 : (-G1 + Math.sqrt(G1 * G1 + 4 * G2 * d)) / (2 * G2); },
    colX: (sx, Z) => cx + (sx - 270) / (z * U * kZ(Z)),
    /** facade-plane inverse at depth Z: screen → world X, Y */
    wX: (sx, Z = 0) => cx + (sx - 270) / (z * U * kZ(Z)),
    wY: (sy, Z = 0) => (Y0 + gyZ(Z) - (fy + (sy - 480) / z)) / (U * kZ(Z)),
  };
  return V;
}

/** dithered pick from a ramp at level v ∈ [0,1] */
export function ramp(RAMP, v, x, y) { const s = clamp01(v) * (RAMP.length - 1), i = Math.floor(s), f = s - i; return RAMP[Math.min(RAMP.length - 1, f > bayer(x & 3, y & 3) ? i + 1 : i)]; }
/** flat tone bands with a narrow dithered seam */
export function band(RAMP, v, x, y, w = 0.4) { const s = clamp01(v) * (RAMP.length - 1), i = Math.floor(s), f = s - i, lo = 0.5 - w / 2, k = f <= lo ? 0 : f >= 1 - lo ? 1 : (f - lo) / w; return RAMP[Math.min(RAMP.length - 1, k > bayer(x & 3, y & 3) ? i + 1 : i)]; }

/** Fill a front-facing world rect (X0..X1, Y0..Y1) on plane Z with shade(X, Y, x, y) → colour | null. Returns the screen rect. */
export function wfill(c, V, X0, X1, Ya, Yb, Z, shade) {
  const x0 = Math.max(0, R(V.sx(X0, Z))), x1 = Math.min(c.w, R(V.sx(X1, Z))), y0 = Math.max(0, R(V.sy(Yb, Z))), y1 = Math.min(c.h, R(V.sy(Ya, Z)));
  if (x1 <= x0 || y1 <= y0) return null;
  const k = V.s(Z);
  for (let y = y0; y < y1; y++) { const Y = V.wY(y + 0.5, Z); for (let x = x0; x < x1; x++) { const col = typeof shade === "function" ? shade(V.wX(x + 0.5, Z), Y, x, y) : shade; if (col) c.px(x, y, col); } }
  return { x0, x1, y0, y1 };
}
/** a plain front rect */
export const wrect = (c, V, X0, X1, Ya, Yb, Z, col) => wfill(c, V, X0, X1, Ya, Yb, Z, col);
/** a world polygon on the facade-parallel plane Z given as [[X, Y], …] */
export function wpoly(c, V, pts, Z, col, shade) { c.poly(pts.map(([X, Y]) => [V.sx(X, Z), V.sy(Y, Z)]), col, shade); }
/** a general world polygon [[X, Y, Z], …] */
export function gpoly(c, V, pts, col, shade) { c.poly(pts.map(([X, Y, Z]) => [V.sx(X, Z), V.sy(Y, Z)]), col, shade); }
/** an axis box X0..X1, Y0..Y1, Z0..Z1: the visible end face, the top, then the near face. cols = { top, front, side } or shade fns */
export function box(c, V, X0, X1, Ya, Yb, Z0, Z1, cols) {
  const end = V.sx(X0, Z1) > V.sx(X0, Z0) ? null : X0;                    // left end visible when it opens out to the left
  const endR = V.sx(X1, Z1) < V.sx(X1, Z0) ? null : X1;
  const sideF = (Xe) => gpoly(c, V, [[Xe, Ya, Z0], [Xe, Yb, Z0], [Xe, Yb, Z1], [Xe, Ya, Z1]], typeof cols.side === "string" ? cols.side : null, typeof cols.side === "function" ? cols.side : undefined);
  if (end !== null && V.sx(X0, Z0) > V.sx(X0, Z1)) sideF(X0);
  if (endR !== null && V.sx(X1, Z1) > V.sx(X1, Z0)) sideF(X1);
  if (cols.top) gpoly(c, V, [[X0, Yb, Z0], [X1, Yb, Z0], [X1, Yb, Z1], [X0, Yb, Z1]], typeof cols.top === "string" ? cols.top : null, typeof cols.top === "function" ? cols.top : undefined);
  if (cols.front) wfill(c, V, X0, X1, Ya, Yb, Z1, cols.front);
}
/** dithered tint of the screen pixel toward col by k (quantised) */
export function tintPx(c, x, y, col, k, steps = 4) {
  if (k <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const s = Math.min(1, k) * steps, lo = Math.floor(s), q = (s - lo > bayer(x & 3, y & 3) ? lo + 1 : lo) / steps; if (q <= 0) return;
  const i = (y * c.w + x) * 3, t = typeof col === "string" ? hex(col) : col; c.d[i] += (t[0] - c.d[i]) * q; c.d[i + 1] += (t[1] - c.d[i + 1]) * q; c.d[i + 2] += (t[2] - c.d[i + 2]) * q;
}
/** a ground shadow: polygon in ground coords [[X, Z], …] tinted toward the shadow colour */
export const SHADOW = "#3A2C58";
export function gshadow(c, V, pts, k = 0.42) {
  const sp = pts.map(([X, Z]) => [V.sx(X, Z), V.sy(0, Z)]);
  let y0 = Infinity, y1 = -Infinity; for (const p of sp) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(c.h - 1, Math.ceil(y1)); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < sp.length; i++) { const [ax, ay] = sp[i], [bx, by] = sp[(i + 1) % sp.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) for (let x = Math.max(0, R(xs[q])); x < Math.min(c.w, R(xs[q + 1])); x++) tintPx(c, x, y, SHADOW, k, 3);
  }
}
/** the long late-afternoon shadow of an upright thing of height H standing at (X, Z) with half-width w (m) */
export const SUN = { dx: 0.95, dz: -0.42 };
export function castShadow(c, V, X, Z, H, w, k = 0.4, lean = 1) {
  const ex = X + SUN.dx * H * lean, ez = Math.max(0.05, Z + SUN.dz * H * lean);
  gshadow(c, V, [[X - w, Z + w * 0.4], [X + w, Z - w * 0.2], [ex + w * 0.5, ez - w * 0.2], [ex - w * 0.4, ez + w * 0.3]], k);
}
/** a soft contact shadow ellipse on the ground */
export function contact(c, V, X, Z, rx, k = 0.45) {
  const [x, y] = V.P(X, 0, Z), px = rx * V.s(Z), py = Math.max(1.5, px * 0.32);
  for (let j = -Math.ceil(py); j <= Math.ceil(py); j++) for (let i = -Math.ceil(px); i <= Math.ceil(px); i++) { const d = (i / px) ** 2 + (j / py) ** 2; if (d < 1) tintPx(c, R(x + i), R(y + j), SHADOW, k * (1 - d * 0.7), 3); }
}
export { bayer, hex, mix };
/** A view that puts world (0, 0, 0) at screen (x, y) with 50·z px per metre at Z 0 (for asset sheets / catalog-contract draws). */
export function localView(x, y, z) {
  const zz = (50 * z) / U, cam = { cx: 0, fy: 480 - (y - 480) / zz + (Y0 - 480) * 0, z: zz };
  const V = makeView({ cx: 0, fy: 0, z: zz }), dy = y - V.sy(0, 0), dx = x - 270;
  const W = Object.create(V);
  W.sx = (X, Z = 0) => V.sx(X, Z) + dx; W.sy = (Y, Z = 0) => V.sy(Y, Z) + dy; W.P = (X, Y, Z) => [W.sx(X, Z), W.sy(Y, Z)];
  W.rowZ = (sy) => V.rowZ(sy - dy); W.colX = (sx, Z) => V.colX(sx - dx, Z); W.wX = (sx, Z = 0) => V.wX(sx - dx, Z); W.wY = (sy, Z = 0) => V.wY(sy - dy, Z); W.cx = V.cx - dx / (zz * U);
  return W;
}
