// Builder PLANE · shared constants and helpers (window geometry, bob, colour ramps, a clipped canvas view).
import { EV, WIN, WIN_Y, PITCH, HERO_WIN, BODY, EXPLODE, STRESS_VIEW, cornerR, pressure } from "../timeline.mjs";
import { bayer, mix, hex } from "../../../../../renderer/pixel/raster.mjs";
export { EV, WIN, WIN_Y, PITCH, HERO_WIN, BODY, EXPLODE, STRESS_VIEW, cornerR, pressure, bayer, mix, hex };

export const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b - fo, b));
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- window geometry (grid px)
export const HW = WIN.w / 2, HH = WIN.h / 2;   // glass opening half sizes (the seal ring sits outside, the cabin bezel inside)
export const RING = 7, BEZ = 8;                // seal ring width outside the opening, cabin-side bezel width inside it
/** Signed distance to a rounded rectangle centred at 0 (negative inside). */
export function sdRR(x, y, hw, hh, r) {
  const qx = Math.abs(x) - hw + r, qy = Math.abs(y) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
/** Outward unit normal of that rounded rectangle at (x, y) (for ring shading). */
export function nRR(x, y, hw, hh, r) {
  const qx = Math.abs(x) - hw + r, qy = Math.abs(y) - hh + r, sx = x < 0 ? -1 : 1, sy = y < 0 ? -1 : 1;
  if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy); return [sx * qx / l, sy * qy / l]; }
  return qx > qy ? [sx, 0] : [0, sy];
}
/** Corner radius of window k (0 = the hero window). */
export const radiusOf = (k, t) => (k === 0 ? cornerR(t) : WIN.r);
export const winX = (k) => HERO_WIN.x + k * PITCH;

// ---------------------------------------------------------------- the fuselage bob (±1 px), held still while the panes are out
export function bob(t) {
  const hold = sm(t, EXPLODE.out[0] - 0.6, EXPLODE.out[0]) * (1 - sm(t, EXPLODE.back[1], EXPLODE.back[1] + 0.6));
  const u = t - EV.tore2, jolt = u > 0 && u < 0.6 ? 2.4 * Math.sin(2 * Math.PI * 11 * u) * Math.exp(-u / 0.16) : 0;   // "tore open": a short jolt
  return R(Math.sin((2 * Math.PI * t) / 3.4) * 1.3 * (1 - hold) + jolt);
}
/** Screen centre of window k at time t. */
export function winScreen(V, t, k) { return [V.X(winX(k)), V.Y(WIN_Y) + bob(t)]; }

// ---------------------------------------------------------------- the hero window's glass (leaves while the exploded panes are out)
export function glassA(t) { return 1 - sm(t, EXPLODE.out[0], EXPLODE.out[0] + 0.4) + sm(t, EXPLODE.back[1] - 0.4, EXPLODE.back[1]); }

// ---------------------------------------------------------------- palette
export const SKIN = ["#2A2640", "#4E4A6A", "#77749A", "#9896B6", "#B6B5CF", "#CFCFE2", "#E3E3EF", "#F2F2F8", "#FFFFFF"];   // pearl fuselage
export const LIV = { P: "#8D59DA", P5: "#6E4FB0", P3: "#3B2C5C", P7: "#B08AE8", L: "#E0CDF8" };
export const CY = "#7FE3F0", CYD = "#0E4A5E";

/** A view of canvas c that only writes where clip(X, Y) is true (and optionally dithers by alpha a). */
export function clipped(c, clip, a = 1) {
  const o = Object.create(c);
  o.px = (x, y, col) => { x = Math.floor(x); y = Math.floor(y); if ((a >= 1 || a > bayer(x, y)) && clip(x, y)) c.px(x, y, col); };
  return o;
}
/** Write an [r,g,b] array straight into the canvas buffer (bounds-checked). */
export function put(c, x, y, rgb) { if (x < 0 || y < 0 || x >= c.w || y >= c.h) return; const i = (y * c.w + x) * 3; c.d[i] = rgb[0]; c.d[i + 1] = rgb[1]; c.d[i + 2] = rgb[2]; }
/** Blend the pixel toward colour col by k (0..1), dithered into `steps` levels. */
export function blend(c, x, y, col, k, steps = 4) {
  if (k <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const s = Math.min(1, k) * steps, lo = Math.floor(s), q = (s - lo > bayer(x, y) ? lo + 1 : lo) / steps; if (q <= 0) return;
  const i = (y * c.w + x) * 3, h = hex(col); c.d[i] += (h[0] - c.d[i]) * q; c.d[i + 1] += (h[1] - c.d[i + 1]) * q; c.d[i + 2] += (h[2] - c.d[i + 2]) * q;
}
/** Pick from a ramp with flat bands and a narrow dithered transition (v in ramp-index units). */
export function band(ramp, v, x, y, soft = 0.24) {
  const fl = Math.floor(v), f = v - fl, lo = 0.5 - soft / 2, q = f < lo ? fl : f > 1 - lo ? fl + 1 : (f - lo) / soft > bayer(x, y) ? fl + 1 : fl;
  return ramp[Math.max(0, Math.min(ramp.length - 1, q))];
}
