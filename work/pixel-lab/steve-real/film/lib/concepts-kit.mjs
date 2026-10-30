// init catalog · group «concepts»: shared helpers for the concept icons (book, pencil, bulb, gear, key, padlock, scales,
// shield, warning sign): ramps, local→screen transform, polygon builders, dithered glow, sparkles.
import { mix, toHex, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { blob, bez, tube, ell } from "./cat-cute.mjs";
import { tintPx, clamp01, sm, ease, TAU, band, ramp, lerp, noise1 } from "./layout.mjs";
export { mix, toHex, bayer, fade, blob, bez, tube, ell, tintPx, clamp01, sm, ease, TAU, band, ramp, lerp, noise1 };

export const OUT = "#07060E";
export const RP = {
  brass: ["#2E1A06", "#6B3E0C", "#A5640F", "#D18F1C", "#EDB32E", "#F9D257", "#FFE88F", "#FFF8CF"],
  steel: ["#141A26", "#262F42", "#3C4960", "#566782", "#7488A4", "#9BAEC6", "#C3D2E2", "#EEF4FA"],
  teal: ["#0C1C26", "#173444", "#245062", "#386F82", "#508EA0", "#74B0BE", "#A2D2DA", "#D8F2F4"],
  yellow: ["#3A2A04", "#7A5A08", "#B88A0C", "#E8B418", "#F8D030", "#FCE45C", "#FFF08C", "#FFFBCC"],
  tan: ["#2A1608", "#5A3416", "#8C5A28", "#C48A48", "#E0AC6C", "#F0CC96", "#F8E2BC", "#FFF4DC"],
  graphite: ["#0A0A10", "#1A1A24", "#2E2E3C", "#444456", "#5E5E72", "#7E7E92", "#A4A4B8", "#CACADA"],
  pink: ["#3A0E1E", "#6A1A34", "#9C2A4C", "#C84468", "#E26A88", "#F094AA", "#F8BCCB", "#FFE2EA"],
  glassOff: ["#1E3040", "#34526A", "#4F7894", "#6E9CB8", "#92BDD4", "#B6D8E8", "#D8EEF6", "#F6FCFF"],
  glassOn: ["#B8620C", "#E08A18", "#F8B02C", "#FFCC48", "#FFE070", "#FFEFA0", "#FFF8CC", "#FFFFF0"],
  paper: ["#4A4040", "#7C6C62", "#A8978A", "#CBBBA8", "#E4D8C2", "#F2EAD6", "#FAF4E6", "#FFFEF8"],
  navy: ["#0A1430", "#14285A", "#1E3E86", "#2C58B0", "#4478D2", "#6C9CEC", "#9CC2FA", "#D2E6FF"],
  crimson: ["#2A0610", "#560E1E", "#841A2C", "#B02A3C", "#D44A52", "#EC7470", "#F8A298", "#FFD6CC"],
  white: ["#2A2A3A", "#4A4A60", "#6E6E88", "#9494AE", "#B8B8CE", "#D4D4E4", "#EAEAF4", "#FFFFFF"],
};
/** Ramp that is a per-step blend of two ramps (k quantised to 1/24 so the hex strings stay cheap). */
export function mixRamp(a, b, k) { k = Math.round(clamp01(k) * 24) / 24; return a.map((c, i) => toHex(mix(c, b[i], k))); }
export const mixCol = (a, b, k) => toHex(mix(a, b, clamp01(k)));

/** Local→screen transform: origin (cx, cy), scale z, rotation ang, optional axis scales. T(x,y) → [X,Y]; T.m(pts). */
export function xf(cx, cy, z, ang = 0, sx = 1, sy = 1) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const T = (x, y) => { x *= sx; y *= sy; return [cx + (x * ca - y * sa) * z, cy + (x * sa + y * ca) * z]; };
  T.m = (pts) => pts.map((q) => T(q[0], q[1]));
  return T;
}
export const rectP = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export function circP(cx, cy, r, n = 0) { n = n || Math.max(20, Math.ceil(r * 1.6)); const o = []; for (let i = 0; i < n; i++) { const a = (TAU * i) / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
/** Rounded polygon: each corner of `pts` replaced by an arc of tangent length rad. */
export function roundPoly(pts, rad, seg = 6) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[(i + n - 1) % n], v = pts[i], q = pts[(i + 1) % n];
    const d1 = Math.hypot(p[0] - v[0], p[1] - v[1]), d2 = Math.hypot(q[0] - v[0], q[1] - v[1]);
    const a = [v[0] + ((p[0] - v[0]) / d1) * rad, v[1] + ((p[1] - v[1]) / d1) * rad], b = [v[0] + ((q[0] - v[0]) / d2) * rad, v[1] + ((q[1] - v[1]) / d2) * rad];
    out.push(...bez(a, v, b, seg));
  }
  return out;
}
export const rrectP = (x0, y0, x1, y1, r) => roundPoly(rectP(x0, y0, x1, y1), r, 5);
/** One simple polygon = outer outline with a hole cut by a zero-width slit (even-odd fill leaves the hole empty). */
export function holed(outer, inner) { return [...outer, outer[0], inner[0], ...inner.slice(1).reverse(), inner[0]]; }
export const ringP = (cx, cy, ro, ri) => holed(circP(cx, cy, ro), circP(cx, cy, ri));
export const scaleP = (pts, k, ox = 0, oy = 0) => pts.map(([x, y]) => [ox + (x - ox) * k, oy + (y - oy) * k]);

/** Outline of a polygon with 1-px lines. */
export function outline(c, pts, col = OUT) { for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; c.line(Math.round(p[0]), Math.round(p[1]), Math.round(q[0]), Math.round(q[1]), col); } }
/** Flat polygon fill + optional outline. */
export function flat(c, pts, col, ol = null) { c.poly(pts, col); if (ol) outline(c, pts, ol); }
/** Volume part with the house defaults (thickness is given in local units and scaled by z). */
export function part(c, polys, ramp, z, o = {}) { blob(c, polys, { ramp, thick: (o.thick ?? 10) * z, base: o.base ?? 3.3, gain: o.gain ?? 2.3, slope: o.slope ?? 0.8, light: o.light, rimLit: o.rimLit ?? 0.9, rimShade: o.rimShade ?? 0.8, outline: o.outline, litOutline: o.litOutline }); }

/** Dithered radial glow (adds light to what is already on the canvas). k is the peak strength (scale by s.a yourself). */
export function glow(c, x, y, r, col, k, power = 2, steps = 5) {
  if (k <= 0.004 || r < 2) return;
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(c.w - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(c.h - 1, Math.ceil(y + r));
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const d = Math.hypot(X - x, Y - y) / r; if (d >= 1) continue;
    tintPx(c, X, Y, col, k * Math.pow(1 - d, power), steps);
  }
}
/** Four-point pixel sparkle, size r (px), strength a 0..1 through dithered fade. */
export function sparkle(c, x, y, r, col = "#FFFFFF", a = 1, core = null) {
  if (a <= 0.02 || r < 1) return; const g = fade(c, a), X = Math.round(x), Y = Math.round(y), R = Math.round(r);
  for (let i = 1; i <= R; i++) { const w = R - i; g.px(X + i, Y, col); g.px(X - i, Y, col); g.px(X, Y + i, col); g.px(X, Y - i, col); if (w > R * 0.5) { g.px(X + 1, Y + i, col); g.px(X - 1, Y - i, col); } }
  g.px(X, Y, core ?? "#FFFFFF");
}
/** Soft dithered contact shadow. */
export function contact(c, x, y, rx, ry, k = 0.4) { c.tint(Math.round(x - rx), Math.round(y - ry), Math.round(rx * 2), Math.round(ry * 2), (X, Y) => { const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; return d >= 1 ? 0 : k * (1 - d); }, "#000000", 3); }
/** Small shiny dot with white core. */
export function shine(c, x, y, r = 1, col = "#FFFFFF") { c.disc(Math.round(x), Math.round(y), Math.max(0, Math.round(r)), col); }

/** View of c in which colours of ramp `a` are swapped for the same step of ramp `b` on the pixels whose Bayer threshold is below k
 *  (a dithered crossfade: a tone change spreads over the picture pixel by pixel instead of changing it in one frame). */
export function swapView(c, a, b, k) {
  if (k <= 0.002) return c;
  const map = new Map(a.map((col, i) => [col, b[i]])), o = Object.create(c);
  o.px = (x, y, col) => { const m = typeof col === "string" ? map.get(col) : undefined; c.px(x, y, m !== undefined && k > bayer(Math.floor(x), Math.floor(y)) ? m : col); };
  return o;
}
