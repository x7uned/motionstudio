// «How to say "I love you" in cat» — the big glossy FRONT-facing eye of catface.mjs and its continuous lid model.
// One lid model for the whole blink: the upper-lid edge is an arc between the two eye corners whose middle moves from
// the top of the eye (open, ⌒ = the eye outline) through a nearly flat line (soft eyes) to a low ⌣ lash curve
// (closed); the lower lid rises a little (cheeks push up = cat smile) and meets the upper one exactly at lid = 1.
// Every quantity is a smooth (C¹) function of lid, so lid 0 → 0.55 → 1 → 0 never pops.
import { bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { clamp01, lerp, s01, smr } from "./cat-kit.mjs";

/** Monotone cubic (Fritsch–Carlson) through (xs, ys); endZero: flat ends (ease in/out), else one-sided secant ends. */
export function pchip(xs, ys, x, endZero = true) {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
  const h = (k) => xs[k + 1] - xs[k], d = (k) => (ys[k + 1] - ys[k]) / h(k);
  const slope = (k) => {
    if (k === 0) return endZero ? 0 : d(0);
    if (k === n - 1) return endZero ? 0 : d(n - 2);
    const a = d(k - 1), b = d(k); if (a * b <= 0) return 0;
    const w1 = 2 * h(k) + h(k - 1), w2 = h(k) + 2 * h(k - 1); return (w1 + w2) / (w1 / a + w2 / b);
  };
  const t = (x - xs[i]) / h(i), m0 = slope(i) * h(i), m1 = slope(i + 1) * h(i), t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * m1;
}

// lid keys (units of the eye's ry, + = down from the centre): m / n = middle of the upper / lower lid edge, cU / cL =
// height of that edge at the eye corners, pU / pL = shape exponent of the arc (0.5 = the eye outline, 1 = soft ⌣).
// Soft eyes: a relaxed almond (upper lid lowered, still gently ⌒, lower lid pushed up a little by the cheeks); the
// upper edge flattens and turns into the low ⌣ lash line only while the eye closes.
const LK = [0, 0.3, 0.55, 0.8, 1];
export const LID_KEYS = {
  m: [-1, -0.62, -0.28, 0.1, 0.27], cU: [0, -0.1, 0.02, 0.02, -0.08], pU: [0.5, 0.6, 0.7, 0.9, 1],
  n: [1, 0.985, 0.8, 0.5, 0.27], cL: [0, 0, 0.02, 0.02, -0.08], pL: [0.5, 0.5, 0.6, 0.75, 1],
};
/** Shape of both lids for a lid value 0 (open) … 0.55 (soft eyes) … 1 (closed): a C¹ function of lid; at lid = 1 the
 *  two edges coincide (closed lash line). */
export function lidShape(lid) {
  lid = clamp01(lid);
  const k = (name) => pchip(LK, LID_KEYS[name], lid, false);
  const s = 0.05 * s01((lid - 0.5) / 0.5);                       // closed line: outer corners a touch higher
  return { lid, m: k("m"), cU: k("cU"), pU: k("pU"), n: k("n"), cL: k("cL"), pL: k("pL"), s };
}
/** Upper / lower lid edge at u = x/rx ∈ [−1, 1] (uo = u · outer side), in units of ry. */
export const lidU = (L, u, uo) => { const w = Math.pow(Math.max(0, 1 - u * u), L.pU); return L.cU + (L.m - L.cU) * w - L.s * uo; };
export const lidL = (L, u, uo) => { const w = Math.pow(Math.max(0, 1 - u * u), L.pL); return L.cL + (L.n - L.cL) * w - L.s * uo; };

/** Pupil half-size (fractions of rx, ry): pupil 0 slit · 0.5 normal round · 1 huge; stare → small tense dot. */
export function pupilWH(pupil, stare = 0) {
  const p = clamp01(pupil), w = 0.12 + 0.68 * p, h = 0.84 - 0.86 * p + 0.84 * p * p;
  return [lerp(w, 0.2, stare), lerp(h, 0.34, stare)];
}

const q8 = (v, X, Y) => { const fl = Math.floor(v), f = v - fl; return f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl; };
const SL = (f, L, u, side, ry, rx) => { const du = 0.015, a = Math.min(1, u + du), b = Math.max(-1, u - du); const s = ((f(L, a, a * side) - f(L, b, b * side)) * ry) / ((a - b) * rx || 1); return Math.min(6, Math.abs(s)); };

/**
 * Draw one eye. e = { x, y (screen centre), rx, ry (px), ang (head tilt, rad), side (outer side: −1 screen-left eye,
 * +1 screen-right eye), L (lidShape), z (camera zoom, sets line widths and zoom-only detail), look [dx, dy],
 * pupil [w, h] (pupilWH), iris (8-step ramp), out (lid/outline colour), pupilCol, lowCol (lower-lid line) }.
 * Only the aperture and the lid lines are drawn; the lid fur around them is the head's own shading.
 */
export function drawEye(g, e) {
  const { x, y, rx, ry, side, L, z, iris, out } = e, ang = e.ang ?? 0, look = e.look ?? [0, 0];
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const tU = Math.max(1, 0.4 * z), tL = Math.max(1, 0.22 * z), tO = Math.max(1, 0.27 * z);
  const pw = e.pupil[0] * rx, ph = e.pupil[1] * ry, pcx = look[0] * 0.26 * rx, pcy = look[1] * 0.2 * ry + 0.03 * ry;
  const lowCol = e.lowCol ?? out, pupCol = e.pupilCol ?? "#170A05";
  const tex = 0.42 * smr(z, 2.4, 3.6);                        // radial iris fibres: zoom detail, dissolves in
  // big highlight: slides down under a lowering lid, shrinks only when the aperture gets too thin for it
  const hx = (-0.34 + 0.12 * look[0]) * rx, uH = Math.max(-1, Math.min(1, hx / rx));
  const topH = lidU(L, uH, uH * side) * ry + tU, botH = lidL(L, uH, uH * side) * ry - tL;
  const hrx0 = 0.25 * rx, hry0 = 0.28 * ry, hryE = Math.min(hry0, ((botH - topH) / 2 - 0.35) * 0.92);
  const hScale = hryE / hry0, hrx = hrx0 * hScale, hry = hryE;
  const hy = Math.min(botH - hry - 0.2, Math.max((-0.4 + 0.08 * look[1]) * ry, topH + hry + 0.18 * hry0));
  const bigOn = hry >= 0.55;
  const sx2 = (0.34 + 0.1 * look[0]) * rx, sy2 = 0.36 * ry, sr2 = Math.max(0.62, 0.1 * rx);
  const halo = smr(z, 3, 4.2);
  const R0 = Math.max(rx, ry) + 2;
  for (let Y = Math.floor(y - R0); Y <= Math.ceil(y + R0); Y++) for (let X = Math.floor(x - R0); X <= Math.ceil(x + R0); X++) {
    const dx = X + 0.5 - x, dy = Y + 0.5 - y, ex = dx * ca + dy * sa, ey = -dx * sa + dy * ca;
    if ((ex / (rx + 0.5)) ** 2 + (ey / (ry + 0.5)) ** 2 > 1) continue;
    const u = Math.max(-1, Math.min(1, ex / rx)), uo = u * side;
    const top = lidU(L, u, uo) * ry;
    if (ey < top) continue;                                     // upper lid fur (the head)
    const dT = (ey - top) / Math.sqrt(1 + SL(lidU, L, u, side, ry, rx) ** 2);
    if (dT < tU) { g.px(X, Y, out); continue; }                 // lid edge / lash line (also the closed eye)
    const bot = lidL(L, u, uo) * ry;
    if (ey > bot) continue;                                     // lower lid fur
    const dB = (bot - ey) / Math.sqrt(1 + SL(lidL, L, u, side, ry, rx) ** 2);
    if (dB < tL) { g.px(X, Y, lowCol); continue; }
    if ((ex / (rx - tO + 0.5)) ** 2 + (ey / (ry - tO + 0.5)) ** 2 > 1) { g.px(X, Y, out); continue; }
    // highlights
    if (bigOn) {
      const hq = ((ex - hx) / hrx) ** 2 + ((ey - hy) / hry) ** 2;
      if (hq <= 1) { g.px(X, Y, "#FFFFFF"); continue; }
      if (halo > 0 && hq <= (1 + 1.1 / hry) ** 2 && (ex - hx) * 0.6 + (ey - hy) > 0 && halo > bayer(X, Y) * 0.999) { g.px(X, Y, iris[7]); continue; }
    }
    if ((ex - sx2) ** 2 + (ey - sy2) ** 2 <= sr2 * sr2) { g.px(X, Y, "#FFFFFF"); continue; }
    // pupil
    const pq = ((ex - pcx) / pw) ** 2 + ((ey - pcy) / ph) ** 2;
    if (pq <= 1) {
      // faint warm reflection inside the pupil's lower edge (close-ups only)
      const refl = tex > 0.05 && ey > pcy + ph * 0.45 && pq > 0.55 && (ex - pcx) > -pw * 0.2;
      g.px(X, Y, refl && tex > bayer(X, Y) * 0.45 ? "#3A1A08" : pupCol); continue;
    }
    // iris: vertical tone bands (dark under the lid, bright amber below), limbal ring, light ring round the pupil
    const nx = ex / rx, ny = ey / ry, rn = Math.sqrt(nx * nx + ny * ny), dp = Math.sqrt(pq);
    let v = 2.0 + 4.3 * clamp01((ny + 1) / 2);
    v -= 1.25 * smr(rn, 0.74, 1.0);
    v -= 1.7 * (1 - smr(dT / ry, 0.0, 0.3)) * smr((bot - top) / ry, 0.2, 0.75);   // lid shadow follows the lid (lighter when narrow)
    v += 0.75 * (1 - smr(dp, 1.0, 1.5)) * (ny > pcy / ry - 0.2 ? 1 : 0.45);
    if (tex > 0) { const a = Math.atan2(ey - pcy, ex - pcx); v += tex * Math.sin(a * 17 + 2.2 * Math.sin(a * 5)) * smr(dp, 1.15, 1.7) * (1 - smr(rn, 0.8, 0.95)); }
    g.px(X, Y, iris[Math.max(1, Math.min(7, q8(v, X, Y)))]);
  }
  // lashes at the outer corner grow in as the eye closes (they hang from the closed ⌣ towards the cheek)
  const lash = s01((L.lid - 0.68) / 0.32);
  if (lash > 0.02 && rx >= 3) {
    const lwf = Math.max(1, 0.3 * z), lw = Math.ceil(lwf - 1e-9), last = fade(g, lwf - (lw - 1));   // extra rows dissolve in with the zoom
    for (const [uu, ox, oy] of [[0.7, 0.45, 0.9], [0.93, 0.85, 0.55]]) {
      const ue = uu, exa = ue * rx * side, eya = lidU(L, ue, ue) * ry + tU * 0.5;
      const exb = exa + ox * side * 0.3 * ry * lash, eyb = eya + oy * 0.3 * ry * lash;
      const A = [x + exa * ca - eya * sa, y + exa * sa + eya * ca], B = [x + exb * ca - eyb * sa, y + exb * sa + eyb * ca];
      for (let k = 0; k < lw; k++) (k === lw - 1 && k > 0 ? last : g).line(Math.floor(A[0]), Math.floor(A[1]) + k, Math.floor(B[0]), Math.floor(B[1]) + k, out);
    }
  }
}
