// init/nature group · shared toolkit: ramps (dark → light), polygon builders (leaf, blade, petal), a shaded round stroke
// for stems / roots / branches, and tiny math helpers. All drawing goes through the canvas view `c` (dissolve-safe).
import { mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, noise1 } from "./layout.mjs";
export { mix, bayer, fade, rnd, noise1 };
export { blob, ell, tube, bez, shadow, RAMP } from "./cat-cute.mjs";

export const OUT = "#07060E", TAU = Math.PI * 2;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const sm3 = (t, a, b) => sm((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;
export const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// ---- 8-step ramps, dark → light ------------------------------------------------------------------------------
export const R8 = {
  leaf:   ["#0E2A1E", "#164030", "#1F5C38", "#2C7C3C", "#46A246", "#6CC352", "#9CDC66", "#D2F294"],
  lime:   ["#18381A", "#24521E", "#35701F", "#4E9024", "#72B230", "#9CD044", "#C4E864", "#EAF9A0"],
  autumn: ["#3A0F0C", "#6E1C12", "#A63416", "#D2561C", "#EE7E26", "#F7A83A", "#FBCB5A", "#FEEA9A"],
  bark:   ["#1A0F0A", "#2E1C12", "#47291A", "#63391F", "#82502B", "#A06C3C", "#BE8D55", "#DDB07C"],
  stone:  ["#1B1D28", "#2B2F3E", "#3E4454", "#545C6E", "#6D778A", "#8892A6", "#A8B1C2", "#CCD3DF"],
  water:  ["#0A2A5A", "#0F3F82", "#1658AC", "#2278CE", "#3A9AE6", "#62BBF4", "#98D8FA", "#D8F3FF"],
  flame:  ["#5A0A12", "#9A1A16", "#D2380E", "#F26A12", "#FB9A1E", "#FFC53A", "#FFE680", "#FFF8D2"],
  soil:   ["#1A110C", "#2C1C12", "#412819", "#5A3822", "#744C2C", "#926338", "#B07F4C", "#CFA064"],
  root:   ["#3A2818", "#634428", "#8C6438", "#B28A50", "#D2AC6E", "#E8C98E", "#F6E2B2", "#FFF6D8"],
  pink:   ["#4A0F2A", "#7E1A44", "#B02C5E", "#DC4880", "#F2709C", "#FA9CB8", "#FDC4D4", "#FFE8EE"],
  blossom:["#6A2A4A", "#A04A6E", "#D2709A", "#EE96B8", "#F8B4CC", "#FDCEDC", "#FFE4EC", "#FFF4F8"],
  red:    ["#3A0A18", "#6C1226", "#A01E34", "#D03244", "#EC5258", "#F6807A", "#FBAA9C", "#FFD4C6"],
  gold:   ["#3A1A04", "#7A3A08", "#B85E10", "#E08A1C", "#F5AE2E", "#FBC94A", "#FDE07A", "#FFF2B8"],
  seed:   ["#1E1208", "#3A2210", "#5C3A1A", "#7E5226", "#A06C36", "#C08C4C", "#DEB06C", "#F2D698"],
  cream:  ["#4A3E36", "#74665A", "#9E8E7C", "#C4B49A", "#DCCEB4", "#EDE2CC", "#F8F0DE", "#FFFAF0"],
  cloud:  ["#3A4C7A", "#5A70A4", "#7E94C6", "#A4B8DE", "#C4D4EE", "#DEE9F8", "#F0F6FE", "#FFFFFF"],
  storm:  ["#1C2238", "#2C3552", "#434E70", "#5C688C", "#7885A6", "#96A2BE", "#B4BFD6", "#D4DCEA"],
};
export const mixRamp = (a, b, k) => (k <= 0 ? a : k >= 1 ? b : a.map((c, i) => mix(c, b[i], k)));

// ---- polygons --------------------------------------------------------------------------------------------------
/** Quadratic bezier points. */
export const qb = (p0, p1, p2, n = 12) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } return o; };
/**
 * Polygon of a leaf / blade / petal from base (bx,by) toward angle `ang`, length `len`, half width `wid`, curved by
 * `bend` (px, sideways bulge of the axis). prof(u) 0..1 → width factor (default: pointed leaf). Returns { poly, axis }.
 */
export function shape(bx, by, ang, len, wid, bend = 0, prof = LEAF_PROF, n = 14) {
  const fx = Math.cos(ang), fy = Math.sin(ang), nx = -fy, ny = fx;
  const tip = [bx + fx * len, by + fy * len], ctl = [bx + fx * len * 0.5 + nx * bend * 2, by + fy * len * 0.5 + ny * bend * 2];
  const ax = qb([bx, by], ctl, tip, n), L = [], Rr = [];
  for (let i = 0; i <= n; i++) {
    const a = ax[Math.max(0, i - 1)], b = ax[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = wid * prof(i / n);
    L.push([ax[i][0] - (dy / d) * w, ax[i][1] + (dx / d) * w]); Rr.push([ax[i][0] + (dy / d) * w, ax[i][1] - (dx / d) * w]);
  }
  return { poly: [...L, ...Rr.reverse()], axis: ax };
}
export const LEAF_PROF = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.85);
export const BLADE_PROF = (u) => Math.pow(1 - u, 0.85) * (0.55 + 0.45 * Math.min(1, u * 6 + 0.4));
export const PETAL_PROF = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.62)), 0.7);

// ---- shaded round stroke (stems, roots, branches) ------------------------------------------------------------
function stamp(c, x, y, r, col) {
  const R = Math.max(0.55, r);
  for (let Y = Math.floor(y - R); Y <= Math.ceil(y + R); Y++) for (let X = Math.floor(x - R); X <= Math.ceil(x + R); X++) { const dx = X + 0.5 - x, dy = Y + 0.5 - y; if (dx * dx + dy * dy <= R * R) c.px(X, Y, col); }
}
/**
 * Round tube along polyline pts with radius r0 → r1: dark 1-px outline, 3 lit tone bands (light upper left).
 * col: [shadow, mid, light, glint] indices into ramp ramp.
 */
export function stroke(c, pts, r0, r1, ramp, { idx = [2, 4, 5, 6], outline = OUT, tint = null, tintK = null } = {}) {
  const seg = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), m = Math.max(1, Math.ceil(L / 0.9));
    for (let k = 0; k < m; k++) { const u = (i + k / m) / (pts.length - 1); seg.push([ax + (bx - ax) * k / m, ay + (by - ay) * k / m, lerp(r0, r1, u), u]); }
  }
  { const [x, y] = pts[pts.length - 1]; seg.push([x, y, r1, 1]); }
  const col = (i, u) => (tint && tintK ? mix(ramp[i], tint, tintK(u)) : ramp[i]);
  for (const [x, y, r] of seg) stamp(c, x, y, r + 1, outline);
  for (const [x, y, r, u] of seg) stamp(c, x, y, r, col(idx[0], u));
  for (const [x, y, r, u] of seg) if (r > 1.6) stamp(c, x - r * 0.18, y - r * 0.2, r * 0.74, col(idx[1], u));
  for (const [x, y, r, u] of seg) if (r > 2.4) stamp(c, x - r * 0.36, y - r * 0.38, r * 0.4, col(idx[2], u));
  for (const [x, y, r, u] of seg) if (r > 4.2) stamp(c, x - r * 0.46, y - r * 0.5, r * 0.17, col(idx[3], u));
}
/** Flat filled disc through the view (floating point centre). */
export const dot = stamp;

/**
 * Dithered recolour view: everything drawn through it with a colour of ramp A is written as A[i] or B[i] (ordered Bayer
 * dither by k 0..1) — a crossfade of two ramps with no gradient and no colour flipping across a whole area at once.
 * A and B must be arrays of "#rrggbb" strings (use hexRamp for mixed ones).
 */
export function dye(c, A, B, k) {
  if (k <= 0) return c;
  const o = Object.create(c), idx = new Map(A.map((col, i) => [col, i]));
  o.px = (x, y, col) => { const i = idx.get(col); if (i === undefined) return c.px(x, y, col); c.px(x, y, k > bayer(Math.floor(x), Math.floor(y)) ? B[i] : A[i]); };
  return o;
}
