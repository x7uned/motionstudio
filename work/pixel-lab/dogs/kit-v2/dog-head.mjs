// Dog series kit · the border collie's HEAD, shared by the side view (yaw 0 → 1) and the front view.
// The head is a 2-D puppet with three hand-tuned keys — side profile (yaw 0), three-quarter (0.5) and front (1, the
// yard.mjs drawDog face scaled to this dog) — and every coordinate is interpolated by a quadratic through the three keys,
// so turning toward the camera is a continuous morph (no dissolve). Units: world units, head-local, centre (0, 0),
// +x = forward (toward the nose when facing right), +y = down. A mapper M turns head-local points into screen pixels.
import { blob, ell, eye, blush, smooth, fade, mix, bayer, RAMP } from "../../animals/film/cute.mjs";

const R = Math.round;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
const TAU = Math.PI * 2;
const sm01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

// ---------------------------------------------------------------- palette (yard.mjs collie)
export const BLK = ["#07060C", "#0E0C18", "#181528", "#24203C", "#302B50", "#3E3866", "#4E4880", "#6A64A0"];
export const WHT = RAMP.white;
export const LIT = "#5A5490", EDGE = "#3A3A50", OUT = "#07060E";
export const EAR_IN = ["#2A1420", "#4A2434", "#6A3448", "#8A4A60", "#A8667A", "#C48496", "#DCA4B4", "#F0C8D4"];
export const DOG_EYE = ["#1A0C04", "#3A1E0A", "#6A3A14", "#9A5A20", "#C8842E", "#E8A84A", "#F8CC7A"];
export const NOSE = ["#030206", "#0A0810", "#12101C", "#1C1828", "#282338", "#363048", "#4A445E", "#625C7A"];
export const TONGUE = RAMP.pink;
export const MOUTH_IN = "#3A0A18";
export const BROW = ["#6E6E88", "#B8B8CE", "#EAEAF4"];

// ---------------------------------------------------------------- keys
const S3 = 0.354;                                     // yard.mjs head units → this dog's world units
const Y = (pts) => pts.map(([x, y]) => [x * S3, y * S3]);
const MX = (pts) => pts.map(([x, y]) => [-x, y]);

// nose outline (12 points, relative to the nose centre): index 0 = near/back corner … 4 = far/front corner
const NOSE_F = [[-3.9, -2.1], [-2.0, -2.75], [0, -2.9], [2.0, -2.75], [3.9, -2.1], [4.2, -0.8], [3.3, 0.9], [1.6, 2.1], [0, 2.45], [-1.6, 2.1], [-3.3, 0.9], [-4.2, -0.8]];
const NOSE_S = [[-3.0, -1.7], [-1.4, -2.75], [0.5, -3.0], [2.3, -2.5], [3.5, -1.3], [3.8, 0.3], [3.2, 1.7], [1.9, 2.4], [0.3, 2.6], [-1.3, 2.3], [-2.7, 1.4], [-3.4, -0.1]];

// ears: 6-point outline (0 base back/outer … 2, 3 the fold line … 5 base front/inner), inner pink, folded flap
const EAR_O = [[-17.7, -5], [-19.4, -13.5], [-20.5, -21.9], [-12, -25.5], [-8.4, -19.5], [-5.7, -13.5]];
const EAR_I = [[-15.9, -8.5], [-17.0, -14.5], [-18.1, -20.5], [-13.1, -22.7], [-11.0, -18.5], [-8.9, -14.2]];
const EAR_F = [[-20.9, -21.9], [-11.7, -25.8], [-21.9, -15.6]];

/** Front key: drawDog of yard.mjs, scaled. Index conventions: N = near eye/ear/cheek (screen-left in front view). */
const FRONT = {
  skull: [0, -1.4, 18.4, 15.6],
  cheekN: Y([[-30, 2], [-50, 4], [-62, 16], [-56, 22], [-64, 30], [-50, 38], [-30, 40]]),
  cheekF: MX(Y([[-30, 2], [-50, 4], [-62, 16], [-56, 22], [-64, 30], [-50, 38], [-30, 40]])),
  earN: { piv: [-12, -9.9], o: EAR_O, i: EAR_I, f: EAR_F, dir: -1, inner: 1, dark: 0 },
  // far ear: mirrored AND reversed so its points run left → right like every other key (no flip while turning)
  earF: { piv: [12, -9.9], o: MX(EAR_O).reverse(), i: MX(EAR_I).reverse(), f: [MX(EAR_F)[1], MX(EAR_F)[0], MX(EAR_F)[2]], dir: 1, inner: 1, dark: 0 },
  // blaze: 0 near-top, 1 far-top, 2..6 far side down, 7 chin, 8..12 near side up
  blaze: Y([[-4, -47], [4, -47], [9, -22], [20, -2], [34, 18], [36, 32], [22, 44], [0, 48], [-22, 44], [-36, 32], [-34, 18], [-20, -2], [-9, -22]]),
  muz: [0, 8.6, 8.6, 5.4],
  jaw: [0, 11.8, 6.2, 3.4],
  nose: [0, 4.3], nosePts: NOSE_F,
  nostN: [-1.85, 0.55, 1], nostF: [1.85, 0.55, 1],    // relative to the nose centre; vis
  eyeN: [-7.8, -2.6, 5.3, 5.7], eyeF: [7.8, -2.6, 5.3, 5.7, 1],
  blushN: [-13.4, 5.2, 3.3, 1.5], blushF: [13.4, 5.2, 3.3, 1.5, 1],
  browN: [-7.4, -10.7], browF: [7.4, -10.7, 1],
  padN: [-4.6, 7.4], padF: [4.6, 7.4, 1],             // whisker-pad dots (close-ups)
  mouthU: [[-2.9, 8.9], [-1.5, 9.85], [0, 10.15], [1.5, 9.85], [2.9, 8.9]],
  mouthL: [[-3.3, 9.0], [-2.9, 12.6], [0, 13.9], [2.9, 12.6], [3.3, 9.0]],
  tongueIn: [0, 12.0, 2.3, 1.5, 0], tongueOut: [0, 15.0, 2.5, 3.4, 0],
  ball: [0, 13.6], phil: 1,
};

/** Side ear: built in an ear frame (base B, leaning back 20°, fold on top, the tip folded forward). */
function sideEar(B, dark) {
  const w = [0.94, -0.34], up = [-0.34, -0.94], P = ([a, b]) => [B[0] + a * w[0] + b * up[0], B[1] + a * w[1] + b * up[1]];
  return {
    piv: B, dir: -1, inner: dark ? 0 : 1, dark,
    o: [[-5.6, 0], [-5.4, 7], [-3.4, 13.2], [2.4, 14.2], [3.9, 7.4], [4.7, 0]].map(P),
    i: [[1.8, 1.2], [2.2, 4.8], [2.4, 7.9], [3.2, 8.1], [3.5, 4.8], [3.8, 1.2]].map(P),
    f: [[-3.4, 13.4], [2.6, 14.4], [4.7, 7.6]].map(P),
  };
}

/** Side key: profile facing +x. Far-side features are tucked behind the profile with vis 0. */
const SIDE = {
  skull: [-0.5, -1.6, 18.0, 15.6],
  cheekN: [[-4, 1], [-12, 2], [-18.5, 5], [-16.5, 7.5], [-19, 10.5], [-13, 14], [-5, 14]],
  cheekF: [[4, 2], [8, 3], [10, 6], [9, 8], [10, 10], [7, 12], [4, 12]],
  earN: sideEar([-7, -14.5], 0),
  earF: sideEar([-4.2, -14.8], 1),
  blaze: [[6.0, -16.4], [8.0, -16.0], [12.6, -9.5], [17.8, -4.4], [23.8, -2.2], [26.4, 4.4], [23.0, 9.8], [15.4, 12.8], [7.5, 12.6], [4.5, 9.0], [8.5, 3.8], [12.0, -1.6], [10.0, -8.6]],
  muz: [16.6, 4.4, 9.0, 6.9],
  jaw: [15.4, 9.6, 7.6, 3.6],
  nose: [24.0, 0.8], nosePts: NOSE_S,
  nostN: [2.5, 0.7, 1], nostF: [3.7, 0.2, 0],
  eyeN: [6.2, -3.6, 5.0, 6.0], eyeF: [14.6, -3.4, 2.2, 3.4, 0],
  blushN: [5.8, 5.4, 3.0, 1.4], blushF: [16.0, 6.0, 2.0, 1.4, 0],
  browN: [6.0, -11.8], browF: [11.5, -12.0, 0],
  padN: [18.5, 6.0], padF: [23.0, 6.0, 0],
  mouthU: [[9.2, 5.9], [12.6, 8.5], [20.6, 8.8], [21.4, 8.5], [21.8, 8.2]],
  mouthL: [[9.2, 5.9], [12.4, 10.6], [19.2, 14.6], [19.8, 14.3], [20.2, 14.0]],
  tongueIn: [16.5, 11.6, 3.0, 1.4, 0.15], tongueOut: [14.8, 15.6, 2.8, 3.6, 0.35],
  ball: [24.2, 12.6], phil: 0,
};

const avg = (a, b) => (typeof a === "number" ? (a + b) / 2 : Array.isArray(a) ? a.map((v, i) => avg(v, b[i])) : Object.fromEntries(Object.keys(a).map((k) => [k, avg(a[k], b[k])])));
/** Three-quarter key: the mean of side and front, with the features that need a real 3/4 placement overridden. */
const TQ = (() => {
  const k = avg(SIDE, FRONT);
  k.skull = [-0.4, -1.5, 18.3, 15.6];
  k.eyeN = [-1.6, -3.2, 5.3, 5.9]; k.eyeF = [11.8, -3.4, 3.7, 5.5, 1];
  k.browN = [-1.6, -11.6]; k.browF = [11.4, -11.6, 1];
  k.muz = [9.8, 6.9, 9.6, 6.2]; k.jaw = [9.0, 10.8, 7.2, 3.5];
  k.nose = [15.2, 3.0];
  k.blushN = [-7.0, 5.6, 3.3, 1.5]; k.blushF = [13.6, 5.0, 2.2, 1.4, 0.9];
  k.padN = [5.5, 7.2]; k.padF = [14.5, 7.0, 1];
  k.nostN = [-0.3, 0.6, 1]; k.nostF = [2.9, 0.4, 0.8];
  k.mouthU = [[3.8, 8.4], [7.3, 9.6], [11.6, 9.4], [14.6, 9.1], [16.4, 8.4]];
  k.mouthL = [[3.6, 8.5], [6.5, 12.2], [11.0, 14.6], [14.0, 13.6], [16.2, 8.6]];
  k.blaze = [[1.4, -16.6], [4.4, -16.4], [6.6, -9.0], [8.0, 0.4], [16.0, 3.8], [20.0, 9.4], [15.0, 13.8], [8.0, 15.4], [0.5, 14.4], [-4.4, 10.6], [-2.4, 5.2], [2.4, -1.2], [2.4, -8.6]];
  k.tongueIn = [10.4, 12.0, 2.6, 1.5, 0.05]; k.tongueOut = [9.8, 15.4, 2.6, 3.5, 0.15];
  k.ball = [13.0, 13.4];
  k.cheekF = [[8, 2], [13, 3], [15.5, 6], [14, 8], [15.5, 10.5], [12, 13], [8, 13]];
  k.earN = { piv: [-8.5, -11], o: [[-15.5, -6.5], [-16.6, -15], [-17, -23], [-8.5, -27], [-5.4, -20], [-2.5, -12.5]], i: [[-12.8, -9.4], [-13.8, -15.4], [-14.6, -21.4], [-9.6, -24], [-7.6, -18.8], [-5.4, -13.6]], f: [[-17.2, -22.6], [-8.5, -27.2], [-14.5, -17.5]], dir: -1, inner: 1, dark: 0 };
  k.earF = { piv: [7.5, -12], o: [[2.5, -11.5], [3.4, -18], [4.5, -24.5], [11.5, -27], [13.4, -18], [15, -9.5]], i: [[5, -13], [5.7, -17.7], [6.5, -22.5], [10.5, -24.5], [11.5, -18], [12.4, -11.6]], f: [[4.4, -24], [11.6, -27.2], [15, -18]], dir: 0, inner: 1, dark: 0.3 };
  return k;
})();

/** Monotone cubic (Fritsch–Carlson) through a (u 0), b (0.5), c (1): C1, never overshoots the keys. */
function mono(a, b, c, u) {
  const d0 = (b - a) * 2, d1 = (c - b) * 2, mm = d0 * d1 > 0 ? (2 * d0 * d1) / (d0 + d1) : 0;
  const seg = u < 0.5, s = seg ? u * 2 : u * 2 - 1, p0 = seg ? a : b, p1 = seg ? b : c, m0 = (seg ? d0 : mm) * 0.5, m1 = (seg ? mm : d1) * 0.5;
  const s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * m1;
}
export function qmix(a, b, c, u) {
  if (typeof a === "number") return mono(a, b, c, u);
  if (Array.isArray(a)) return a.map((v, i) => qmix(v, b[i], c[i], u));
  const o = {}; for (const k in a) o[k] = qmix(a[k], b[k], c[k], u); return o;
}
/** The head key for a yaw 0 (profile) … 1 (front). */
export function headKey(yaw) { const u = clamp01(yaw); return u <= 0 ? SIDE : u >= 1 ? FRONT : qmix(SIDE, TQ, FRONT, u); }
export const HEAD_KEYS = { SIDE, TQ, FRONT };

// ---------------------------------------------------------------- mapper
/**
 * Head-local → screen mapper. ox, oy = screen point of the head centre; z = px per unit; f = facing (±1); ang = head
 * rotation in local space (+ = nose down for f = 1).
 */
export function mapper(ox, oy, zw, f, ang, hs = 1) {
  const c = Math.cos(ang), s = Math.sin(ang), z = zw * hs;
  const P = (q) => [ox + f * (q[0] * c - q[1] * s) * z, oy + (q[0] * s + q[1] * c) * z];
  const inv = (X, Y) => { const lx = (X + 0.5 - ox) / (f * z), ly = (Y + 0.5 - oy) / z; return [lx * c + ly * s, -lx * s + ly * c]; };
  return { P, inv, z, zw, hs, f, ang, poly: (pts) => pts.map(P) };
}
/** Like mapper, with the head-local x axis squeezed by sx (a head turning away: the snout foreshortens). */
export function mapperX(ox, oy, zw, f, ang, hs = 1, sx = 1) {
  const c = Math.cos(ang), s = Math.sin(ang), z = zw * hs;
  const P = (q) => [ox + f * sx * (q[0] * c - q[1] * s) * z, oy + (q[0] * s + q[1] * c) * z];
  const inv = (X, Y) => { const lx = (X + 0.5 - ox) / (f * z * sx), ly = (Y + 0.5 - oy) / z; return [lx * c + ly * s, -lx * s + ly * c]; };
  return { P, inv, z, zw, hs, f, ang, poly: (pts) => pts.map(P) };
}
const rotAbout = (pts, pv, a) => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => { const dx = x - pv[0], dy = y - pv[1]; return [pv[0] + dx * c - dy * s, pv[1] + dx * s + dy * c]; }); };
const eAt = (e, z) => ell(e[0], e[1], e[2], e[3], e[4] ?? 0, Math.max(14, Math.min(44, Math.ceil((e[2] + e[3]) * z * 0.9))));

// ---------------------------------------------------------------- the wet nose
function nose(g, M, k, st) {
  const z = M.z, [ncx, ncy] = k.nose, sn = st.sniffW, wet = st.wet;
  const sc = (1 + 0.035 * sn) * (st.ns ?? 1), dry = st.dry ?? 0;
  const pts = smooth(k.nosePts.map(([x, y]) => [ncx + x * sc, ncy + y * sc + 0.25 * sn]), new Set(), z >= 3 ? 5 : 3);
  const poly = M.poly(pts);
  if (dry < 1) blob(g, [poly], { ramp: NOSE, base: 2.0 + 0.4 * wet, gain: 2.6, slope: 1.2, thick: 2.6 * z, outline: "#020104", rimLit: 1.2 + 0.6 * wet, rimShade: 0.8 });
  // pebbled leather (close-ups): darker creases between little cells
  const loc = (X, Y) => { const q = M.inv(X, Y); return [(q[0] - ncx) / sc, (q[1] - ncy - 0.25 * sn) / sc]; };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
  const inside = (X, Y) => { const p = [X + 0.5, Y + 0.5]; let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[i], [bx, by] = poly[j]; if ((ay > p[1]) !== (by > p[1]) && p[0] < ((bx - ax) * (p[1] - ay)) / (by - ay) + ax) c = !c; } return c; };
  const cell = 0.62;
  const hl = (u, v) => { // highlight field: a glossy band upper-left, a glint upper-right, a wet rim along the bottom
    const a = ((u + 1.2) / (1.5 + 0.5 * wet)) ** 2 + ((v + 1.5) / (0.75 + 0.2 * wet)) ** 2, b = ((u - 2.2) / 0.7) ** 2 + ((v + 1.3) / 0.48) ** 2;
    const rim = wet > 0.4 ? Math.max(0, 1 - Math.abs(v - (1.75 - 0.18 * u * u)) / 0.32) * Math.max(0, 1 - Math.abs(u + 0.6) / 2.2) * (wet - 0.4) * 0.95 : 0;
    return Math.max(Math.max(0, 1 - a) * (0.8 + 0.5 * wet), Math.max(0, 1 - b) * (0.45 + 0.7 * wet), rim);
  };
  const front = clamp01((st.yaw - 0.2) / 0.6), zc = sm01((z - 3.0) / 1.4);   // pebble texture fades in with the zoom
  if (dry < 1) for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    if (!inside(X, Y)) continue;
    const [u, v] = loc(X, Y);
    // skip the 1-px outline ring: only paint where all 4 neighbours are inside too
    if (!inside(X - 1, Y) || !inside(X + 1, Y) || !inside(X, Y - 1) || !inside(X, Y + 1)) continue;
    let crease = 0, glint = 0;
    if (zc > 0) {
      const cu = u / cell, cv = v / (cell * 0.87), row = Math.floor(cv), cuo = cu + (row & 1) * 0.5, fx = cuo - Math.floor(cuo) - 0.5, fy = cv - row - 0.5;
      const dd = Math.hypot(fx, fy * 1.1); crease = dd > 0.42 ? 1 : 0; glint = dd < 0.22 ? 1 : 0;
    }
    const h = hl(u * (front ? 1 : 1), v);
    if (h > 0.55 && (!crease || h > 0.9 || zc <= bayer(X, Y))) { g.px(X, Y, h > 0.95 || (glint && h > 0.75) ? "#FFFFFF" : h > 0.75 ? "#C9D3F2" : "#7A86B0"); continue; }
    if (h > 0.3 && glint && wet > 0.3) { g.px(X, Y, "#5E6890"); continue; }
    if (crease && h < 0.3 && zc > bayer(X, Y)) g.px(X, Y, mix(g.get(X, Y), "#000000", 0.22));
  }
  // dry (matte) leather dissolved over the wet one: lighter grey-brown, no gloss, cracked at high zoom
  if (dry > 0) dryLeather(fade(g, dry), M, poly, loc, inside, [x0, y0, x1, y1], z, zc);
  // nostrils: commas opening outward and slightly down; flare while sniffing
  const flare = 1 + 0.32 * Math.max(0, sn) + 0.08 * st.sniffAmt;
  for (const [nn, side] of [[k.nostN, -1], [k.nostF, 1]]) {
    const vis = clamp01(nn[2] ?? 1); if (vis < 0.05) continue;
    const gg = fade(g, vis), cx = ncx + nn[0] * sc, cy = ncy + 0.25 * sn + nn[1] * sc;
    // outward direction in head space: in front view ±x; in profile the near nostril opens back-down
    const out = lerp(side < 0 ? 2.6 : 0.2, side < 0 ? Math.PI : 0, front), r = 0.74 * flare;
    const dir = [Math.cos(out), Math.sin(out)], perp = [-dir[1], dir[0]];
    const comma = [];
    for (let i = 0; i < 10; i++) { const a = (TAU * i) / 10; comma.push([cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 0.9]); }
    const tail = [[cx + dir[0] * r * 0.4 - perp[0] * r * 0.6, cy + dir[1] * r * 0.4 - perp[1] * r * 0.6], [cx + dir[0] * r * 1.9 - perp[0] * r * 0.9 * side, cy + dir[1] * r * 1.9 - perp[1] * r * 0.9 * side + 0.25], [cx + dir[0] * r * 2.3 - perp[0] * r * 0.2 * side, cy + dir[1] * r * 2.3 + 0.55], [cx + dir[0] * r * 0.9, cy + dir[1] * r * 0.9 + r * 0.7]];
    const sp = M.poly(comma), tp = M.poly(tail);
    const big = sm01((z - 1.4) / 0.5);               // tiny nose: one dark pixel; close-up: the comma (dissolves in with zoom)
    if (big < 1) { const p = M.P([cx, cy]); gg.px(Math.floor(p[0]), Math.floor(p[1]), "#000000"); }
    if (big <= 0) continue;
    const gb = fade(gg, big); gb.poly(sp, "#000000"); gb.poly(tp, "#000000");
    if (z >= 4) { const p = M.P([cx - dir[0] * r * 0.5, cy - r * 0.75]); gg.px(Math.floor(p[0]), Math.floor(p[1]), "#4A445E"); }
  }
  // philtrum: the little groove from the nose to the mouth (front-ish views, close-ups)
  const pv = clamp01((k.phil - 0.3) / 0.5) * sm01((z - 1.5) / 0.6);
  if (pv > 0.02) {
    const a = M.P([ncx, ncy + 2.3 * sc + 0.25 * sn]), b = M.P(k.mouthU[2]);
    fade(g, pv).line(R(a[0]), R(a[1]), R(b[0]), R(b[1]) - 1, "#5A5A74");
  }
}

export const NOSE_DRY = ["#140E10", "#241A1C", "#36282A", "#4A3A3A", "#5C4A48", "#6E5C58", "#827068", "#96847A"];
const hash2 = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** The dry nose: matte lighter leather (soft sheen, no gloss) and, at high zoom, a network of fine cracks with pale flakes. */
function dryLeather(g, M, poly, loc, inside, [x0, y0, x1, y1], z, zc) {
  blob(g, [poly], { ramp: NOSE_DRY, base: 2.9, gain: 1.5, slope: 1.0, thick: 2.6 * z, outline: "#120C0E", rimLit: 0.5, rimShade: 0.9 });
  const cw = 0.85 / z, cs = 1.6;                                  // crack width ≈ 1 px; cell size in nose units
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    if (!inside(X, Y) || !inside(X - 1, Y) || !inside(X + 1, Y) || !inside(X, Y - 1) || !inside(X, Y + 1)) continue;
    const [u, v] = loc(X, Y);
    // matte sheen: a soft lighter patch upper-left (dithered, never white)
    const a = ((u + 1.3) / 2.3) ** 2 + ((v + 1.2) / 1.2) ** 2;
    if (a < 1 && (1 - a) * 0.9 > bayer(X, Y)) g.px(X, Y, a < 0.35 ? NOSE_DRY[6] : NOSE_DRY[5]);
    if (zc <= 0) continue;
    // cracks: edges of a jittered Voronoi tiling of the leather
    const gu = u / cs, gv = v / (cs * 0.8), iu = Math.floor(gu), iv = Math.floor(gv);
    let d1 = 9, d2 = 9;
    for (let j = iv - 1; j <= iv + 1; j++) for (let i = iu - 1; i <= iu + 1; i++) {
      const pu = (i + 0.15 + 0.7 * hash2(i, j)) * cs, pv = (j + 0.15 + 0.7 * hash2(i + 71, j - 33)) * cs * 0.8, d = Math.hypot(u - pu, v - pv);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const e = d2 - d1;
    if (e < cw && zc > bayer(X, Y)) g.px(X, Y, "#1C1416");
    else if (e < cw * 2.4 && v < 1.6 && zc * 0.8 > bayer(X + 1, Y)) g.px(X, Y, mix(g.get(X, Y), "#C8B4A8", 0.3));
  }
}

// ---------------------------------------------------------------- mouth (closed smile line … open with tongue)
function mouth(g, M, k, st) {
  const z = M.z, open = st.open, pant = st.pant;
  const L = k.mouthU.map((p, i) => [lerp(p[0], k.mouthL[i][0], open), lerp(p[1], k.mouthL[i][1], open)]);
  const lw = Math.max(1, R(z * 0.42));
  if (open > 0.06) {
    const poly = M.poly(smooth([...k.mouthU, ...L.slice().reverse()], new Set([0, 4, 5, 9]), 3));
    g.poly(poly, MOUTH_IN);
    // tongue: inside the open mouth, sliding out and down while panting
    const tg = k.tongueIn.map((v, i) => lerp(v, k.tongueOut[i], pant));
    const bob = pant * Math.sin(st.t * TAU * 2.6) * 0.45;
    const ty = tg[1] + bob, tr = [tg[2] * lerp(0.75, 1, open), tg[3] * lerp(0.7, 1, Math.max(open, pant))];
    const tp = M.poly(ell(tg[0], ty, tr[0], tr[1], tg[4], 22));
    // the tongue stays inside the mouth; the part hanging out dissolves in as the pant grows
    const outA = sm01((pant - 0.08) / 0.3);
    const inMouth = (X, Y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[i], [bx, by] = poly[j]; if ((ay > Y) !== (by > Y) && X < ((bx - ax) * (Y - ay)) / (by - ay) + ax) c = !c; } return c; };
    const o = Object.create(g); o.px = (X, Y, col) => { if (outA >= 1 || inMouth(X + 0.5, Y + 0.5) || outA > bayer(Math.floor(X), Math.floor(Y))) g.px(X, Y, col); };
    blob(o, [tp], { ramp: TONGUE, base: 4.2, gain: 1.4, thick: 1.6 * z, outline: "#6A1A34" });
    if (pant > 0.3 && z >= 1.5) { const a = M.P([tg[0], ty - tr[1] * 0.6]), b = M.P([tg[0], ty + tr[1] * 0.45]); fade(g, clamp01((pant - 0.3) * 3)).line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#C84468"); }
    // outline the lips
    const up = M.poly(k.mouthU), lo = M.poly(L);
    for (const line of [up, lo]) for (let i = 0; i + 1 < line.length; i++) thick(g, line[i], line[i + 1], OUT, lw);
  } else {
    const up = M.poly(k.mouthU);
    for (let i = 0; i + 1 < up.length; i++) thick(g, up[i], up[i + 1], OUT, lw);
  }
}
function thick(g, a, b, col, w) { for (let d = 0; d < w; d++) g.line(Math.floor(a[0]), Math.floor(a[1]) + d, Math.floor(b[0]), Math.floor(b[1]) + d, col); }

// ---------------------------------------------------------------- ears
function ear(g, M, E, perk, swing, z, front) {
  const rotA = E.dir * (1 - perk) * 0.42 + swing - E.dir * 0.06;
  const o = rotAbout(E.o, E.piv, rotA), i = rotAbout(E.i, E.piv, rotA), fo = rotAbout(E.f, E.piv, rotA + E.dir * (0.12 * (1 - perk)));
  const dk = clamp01(E.dark ?? 0);
  blob(g, [M.poly(smooth(o, new Set([2, 3]), 3))], { ramp: BLK, thick: 3.2 * z, base: 2.9 - 0.8 * dk, litOutline: mix(LIT, OUT, dk) });
  if (E.inner > 0.3) blob(fade(g, sm01((E.inner - 0.3) / 0.4)), [M.poly(smooth(i, new Set([2, 3]), 3))], { ramp: EAR_IN, thick: 1.8 * z, base: 3.0 - 1.2 * dk, outline: "#14101C" });
  blob(g, [M.poly(smooth(fo, new Set([0, 1]), 3))], { ramp: BLK, thick: 1.8 * z, base: 3.9 - 1.3 * dk, litOutline: mix("#7A74B0", OUT, dk) });
}

// ---------------------------------------------------------------- boop (head toward the lens) and the nose lick
/** The key pushed toward the camera: bigger nose and muzzle (closer to the lens), wider smile, eyes a little apart. */
function boopKey(k0, b) {
  const k = { ...k0 }, mc = k0.mouthU[2];
  k.nose = [k0.nose[0], k0.nose[1] - 0.75 * b];
  k.muz = [k0.muz[0], k0.muz[1] - 0.35 * b, k0.muz[2] * (1 + 0.16 * b), k0.muz[3] * (1 + 0.14 * b)];
  k.jaw = [k0.jaw[0], k0.jaw[1] + 0.2 * b, k0.jaw[2] * (1 + 0.16 * b), k0.jaw[3] * (1 + 0.08 * b)];
  const sm = ([x, y]) => [mc[0] + (x - mc[0]) * (1 + 0.3 * b), mc[1] + (y - mc[1]) * (1 + 0.12 * b) + 0.3 * b];
  k.mouthU = k0.mouthU.map(sm); k.mouthL = k0.mouthL.map(sm);
  k.padN = [k0.padN[0] * (1 + 0.16 * b), k0.padN[1] + 0.2 * b, ...k0.padN.slice(2)]; k.padF = [k0.padF[0] * (1 + 0.16 * b), k0.padF[1] + 0.2 * b, ...k0.padF.slice(2)];
  k.eyeN = [k0.eyeN[0] - 0.7 * b, k0.eyeN[1] - 0.3 * b, ...k0.eyeN.slice(2)]; k.eyeF = [k0.eyeF[0] + 0.7 * b, k0.eyeF[1] - 0.3 * b, ...k0.eyeF.slice(2)];
  return k;
}
/** One nose lick u 0..1: mouth opens, the tongue rises over the nose (full at 0.5) sweeping right → left, and goes back in. */
function lickState(u) {
  const ext = u <= 0.5 ? sm01(u / 0.42) : sm01((1 - u) / 0.42);
  const open = 0.72 * sm01(u / 0.12) * sm01((1 - u) / 0.12);
  return { u, ext, open, sw: Math.sin(TAU * u) * sm01(ext / 0.5) };
}
const TONGUE_OUT = "#6A1A34";
function lickTongue(g, M, k, L, open) {
  const z = M.z, ext = L.ext, mc = k.mouthU[2];
  // lower lip line at the current opening (head-local); the tongue only shows above it (it leaves over the upper lip)
  const low = k.mouthU.map((p, i) => [lerp(p[0], k.mouthL[i][0], open), lerp(p[1], k.mouthL[i][1], open)]);
  const lowAt = (x) => { for (let i = 0; i + 1 < low.length; i++) { const [ax, ay] = low[i], [bx, by] = low[i + 1]; if ((x - ax) * (x - bx) <= 0 && bx !== ax) return lerp(ay, by, (x - ax) / (bx - ax)); } return low[2][1]; };
  const B = [mc[0], lerp(mc[1], low[2][1], 0.75)], top = k.nose[1] - 1.4, len = (B[1] - top) * ext;
  const tip = [B[0] + 2.6 * L.sw, B[1] - len], ctl = [B[0] - 0.4 * L.sw, B[1] - len * 0.5];
  const pts = qb(B, ctl, tip, 10);
  const w0 = lerp(0.8, 1.95, sm01(ext / 0.3)), w1 = lerp(0.8, 3.75, sm01(ext / 0.45));
  const poly = M.poly(tubeP(pts, w0, w1));
  const view = Object.create(g);
  view.px = (X, Y, col) => { const q = M.inv(X, Y); if (q[1] < lowAt(q[0]) - 0.15) g.px(X, Y, col); };
  blob(view, [poly], { ramp: TONGUE, base: 4.3, gain: 1.5, slope: 0.9, thick: 1.7 * z, outline: TONGUE_OUT, rimLit: 1.0 });
  // the groove down the middle and a wet glint near the tip (close-ups)
  const gz = sm01((z - 1.4) / 0.6) * sm01((ext - 0.25) / 0.3);
  if (gz > 0.02) { const gg = fade(view, gz); for (let i = 3; i < 9; i++) { const a = M.P(pts[i]), b = M.P(pts[i + 1]); gg.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#C84468"); } }
  const hz = sm01((z - 1.8) / 0.5) * sm01((ext - 0.3) / 0.3);
  if (hz > 0.02) { const p = M.P([tip[0] - w1 * 0.42, tip[1] - w1 * 0.3]), s = Math.max(1, R(z * 0.4)); const gg = fade(g, hz); gg.rect(Math.floor(p[0]), Math.floor(p[1]), s + 1, s, "#FFE2EA"); if (z >= 4) gg.px(Math.floor(p[0]) + s + 1, Math.floor(p[1]) + s, "#FFFFFF"); }
}
function qb(p0, p1, p2, n) { const out = []; for (let i = 0; i <= n; i++) { const s = i / n, u = 1 - s; out.push([u * u * p0[0] + 2 * u * s * p1[0] + s * s * p2[0], u * u * p0[1] + 2 * u * s * p1[1] + s * s * p2[1]]); } return out; }
/** Tapered tube with round caps at both ends. */
function tubeP(pts, r0, r1) {
  const L = [], Rr = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, r = lerp(r0, r1, i / (n - 1));
    L.push([pts[i][0] - (dy / d) * r, pts[i][1] + (dx / d) * r]); Rr.push([pts[i][0] + (dy / d) * r, pts[i][1] - (dx / d) * r]);
  }
  const cap = (p, q, r) => { const ang = Math.atan2(p[1] - q[1], p[0] - q[0]), o = []; for (let k = 1; k < 8; k++) { const a = ang - Math.PI / 2 + (Math.PI * k) / 8; o.push([p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r]); } return o; };
  return [...L, ...cap(pts[n - 1], pts[n - 2], r1).reverse(), ...Rr.reverse(), ...cap(pts[0], pts[1], r0).reverse()];
}

/**
 * Draw the head through mapper M (head-local → screen).
 * st: { yaw, t, ears 0..1, earSwing [near, far] (rad), blink, look [dx (+ = forward/screen-right), dy], mouth, pant,
 *       sniff, wet, brows, carry (ramp | fn | null), farDark }
 * Returns head-local anchor points mapped to screen.
 */
export function drawHead(g, M, st) {
  const boop = clamp01(st.boop ?? 0), lick = clamp01(st.lick ?? 0), dry = clamp01(st.dry ?? 0);
  const LK = lick > 0 && lick < 1 ? lickState(lick) : null;
  const k = boop > 0 ? boopKey(headKey(st.yaw), boop) : headKey(st.yaw), z = M.z, t = st.t ?? 0, front = clamp01(st.yaw);
  const sniffAmt = clamp01(st.sniff ?? 0);
  const sniffW = sniffAmt * (0.6 * Math.sin(t * TAU * 6.3) + 0.4 * Math.sin(t * TAU * 9.7 + 1.3));
  const pant = clamp01(st.pant ?? 0), carry = st.carry ?? null;
  const open = Math.max(clamp01(st.mouth ?? 0), 0.62 * pant, carry ? 0.5 : 0, LK ? LK.open : 0);
  const perk = boop > 0 ? lerp(clamp01(st.ears ?? 0.5), 0.12, 0.85 * sm01(boop / 0.7)) : clamp01(st.ears ?? 0.5), sw = st.earSwing ?? [0, 0];
  const S = { yaw: st.yaw, t, sniffW, sniffAmt, wet: clamp01(st.wet ?? 0.5), open, pant };
  if (boop > 0) S.ns = 1 + 0.3 * boop;
  if (dry > 0) S.dry = dry;

  const look = st.look ?? [0, 0], blink = clamp01(st.blink ?? 0), lookS = [look[0] * M.f, look[1]];
  const eyeO = { iris: DOG_EYE, pupil: "round", look: lookS, blink, z };
  const happy = Math.max(clamp01(st.happy ?? 0), boop > 0 ? sm01((boop - 0.12) / 0.68) : 0, LK ? 0.22 * LK.ext : 0);
  if (happy > 0) eyeO.happy = happy;
  // the far eye comes out from behind the brow/snout: drawn under the blaze and muzzle, and dissolved on top of
  // them only toward the front view (where it overlaps the blaze edge like yard.mjs)
  const farIn = sm01((front - 0.06) / 0.2), farTop = sm01((front - 0.55) / 0.3);
  const farEye = (gg) => { const e = k.eyeF, p = M.P([e[0], e[1]]); if (e[2] * z >= 1.2) dogEye(gg, p[0], p[1], e[2] * z, e[3] * z, eyeO); };
  // the carried ball: between the jaws in profile (the upper snout overlaps it), in front of the muzzle from the front
  const ballC = [k.ball[0], k.ball[1] + 0.3 * open], ballTop = sm01((front - 0.3) / 0.4);
  const ball = (gg) => { const p = M.P(ballC), r = 7 * M.zw; if (typeof carry === "function") carry(gg, p[0], p[1], r); else drawBall(gg, p[0], p[1], r, carry); };

  // ears behind the skull (far first)
  ear(g, M, k.earF, perk, sw[1] + 0.03 * Math.sin(t * 1.7 + 1), z, front);
  ear(g, M, k.earN, perk, sw[0] + 0.03 * Math.sin(t * 1.7 - 1), z, front);
  // skull + fluffy cheeks (black)
  blob(g, [M.poly(eAt(k.skull, z)), M.poly(smooth(k.cheekN, new Set([2, 3, 4]), 3)), M.poly(smooth(k.cheekF, new Set([2, 3, 4]), 3))], { ramp: BLK, thick: 9 * z, base: 2.7, gain: 2.3, litOutline: LIT });
  if (farIn > 0.02 && farTop < 1) farEye(fade(g, farIn));
  // white blaze, lower jaw, mouth (opening + tongue), [ball], muzzle bulge with the upper lip line
  const jawDrop = open * 2.6;
  const blz = k.blaze.map(([x, y], i) => (i >= 5 && i <= 9 ? [x, y + jawDrop * (i === 7 ? 1 : 0.7)] : [x, y]));
  blob(g, [M.poly(smooth(blz, new Set(), 3))], { ramp: WHT, thick: 5.5 * z, base: 4.5, gain: 1.6, outline: "#2A2A40", litOutline: "#9494AE" });
  // blush on the cheeks (under the snout and the nose)
  for (const [b, vis] of [[k.blushN, 1], [k.blushF, sm01((front - 0.45) / 0.25)]]) {
    if (vis < 0.05) continue; const p = M.P([b[0], b[1]]);
    blush(fade(g, clamp01(vis)), p[0], p[1], b[2] * z * (1 + 0.2 * boop), Math.max(1, b[3] * z * (1 + 0.25 * boop)), "#F27A9A");
  }
  blob(g, [M.poly(eAt([k.jaw[0], k.jaw[1] + jawDrop, k.jaw[2], k.jaw[3]], z))], { ramp: WHT, thick: 2.4 * z, base: 4.3, gain: 1.4, outline: "#5A5A74" });
  const mz = k.muz, muzP = M.poly(eAt([mz[0], mz[1] - 0.2 * open, mz[2], mz[3]], z));
  // profile: the opening sits under the snout bulge; toward the front view it is dissolved on top of the bulge
  const mouthTop = sm01((front - 0.38) / 0.24);
  if (mouthTop < 1) mouth(g, M, k, { open, pant, t });
  if (carry && ballTop < 1) ball(g);
  blob(g, [muzP], { ramp: WHT, thick: 3.6 * z, base: 4.9, gain: 1.4, outline: "#5A5A74" });
  upperLip(g, M, k, open);
  if (mouthTop > 0) mouth(fade(g, mouthTop), M, k, { open, pant, t });
  if (carry && ballTop > 0) ball(fade(g, ballTop));
  // whisker-pad dots (close-ups)
  const padZ = sm01((z - 1.5) / 0.6);
  if (padZ > 0.02) for (const [p, vis] of [[k.padN, 1], [k.padF, clamp01(k.padF[2])]]) {
    const v = vis * padZ; if (v < 0.02) continue; const gg = fade(g, v), s = Math.max(1, R(z * 0.35));
    for (const [dx, dy] of [[-1.3, -0.6], [0, 0], [-1.1, 1.0], [0.3, -1.2]]) { const q = M.P([p[0] + dx * lerp(1, Math.sign(p[0]) || 1, front), p[1] + dy]); gg.rect(Math.floor(q[0]), Math.floor(q[1]), s, s, "#A2A2BA"); }
  }
  if (farTop > 0.02) farEye(fade(g, farTop));          // under the nose: the nose is always in front of the far eye
  nose(g, M, k, S);
  if (LK && LK.ext > 0.003) lickTongue(g, M, k, LK, open);
  // near eye (always on top)
  { const e = k.eyeN, p = M.P([e[0], e[1]]); dogEye(g, p[0], p[1], e[2] * z, e[3] * z, eyeO); }
  // little eyebrow dots (worried / confused)
  const brows = clamp01(st.brows ?? 0);
  if (brows > 0.02) for (const [b, vis, side] of [[k.browN, 1, -1], [k.browF, sm01((front - 0.45) / 0.2), 1]]) {
    const v = clamp01(vis) * brows; if (v < 0.05) continue;
    const lift = -1.2 * brows, inner = front > 0.5 ? -side : 1;
    const a = -0.35 * brows * inner * (front > 0.5 ? 1 : -1);
    const poly = M.poly(ell(b[0], b[1] + lift, 1.9, 1.05, a, 14));
    blob(fade(g, v), [poly], { ramp: WHT, thick: 0.8 * z, base: 4.6, gain: 1.4, outline: "#14101C" });
  }
  const A = headAnchors(st.yaw, open);
  return { nose: M.P(A.nose), mouth: M.P(A.mouth), ball: M.P(A.ball), eye: M.P(A.eye), eyes: A.eyes.map(M.P), head: M.P(A.head), top: M.P(A.top) };
}
/**
 * The head TURNING AWAY from the camera (side view → seen from behind), one silhouette: skull, cheeks and ears follow
 * the yaw keys toward the symmetric key (st.away 0 = profile … 1 = straight from behind), the ears lose their pink and
 * come in front of the skull, and the face (blaze, muzzle, nose, eye) foreshortens through Mf and dissolves away.
 * At away 0 it draws exactly what drawHead draws at yaw 0. Returns anchors (face ones flagged hidden once it is gone).
 */
export function drawHeadAway(g, M, Mf, st) {
  const ub = clamp01(st.away ?? 0), kS = headKey(ub), k = SIDE, z = M.z, t = st.t ?? 0;
  const sniffAmt = clamp01(st.sniff ?? 0), sniffW = sniffAmt * (0.6 * Math.sin(t * TAU * 6.3) + 0.4 * Math.sin(t * TAU * 9.7 + 1.3));
  const pant = clamp01(st.pant ?? 0), open = Math.max(clamp01(st.mouth ?? 0), 0.62 * pant);
  const perk = clamp01(st.ears ?? 0.5), sw = st.earSwing ?? [0, 0];
  const S = { yaw: 0, t, sniffW, sniffAmt, wet: clamp01(st.wet ?? 0.5), open, pant };
  if ((st.dry ?? 0) > 0) S.dry = clamp01(st.dry);
  const fv = 1 - sm01(ub / 0.5), inner = 1 - sm01(ub / 0.6), earsFront = sm01((ub - 0.3) / 0.4);
  const EB = (e) => (ub <= 0 ? e : { ...e, inner: e.inner * inner, dark: lerp(e.dark ?? 0, 0.2, 1 - inner) });
  const ears = (gg) => { ear(gg, M, EB(kS.earF), perk, sw[1] + 0.03 * Math.sin(t * 1.7 + 1), z, 0); ear(gg, M, EB(kS.earN), perk, sw[0] + 0.03 * Math.sin(t * 1.7 - 1), z, 0); };
  if (earsFront < 1) ears(g);
  blob(g, [M.poly(eAt(kS.skull, z)), M.poly(smooth(kS.cheekN, new Set([2, 3, 4]), 3)), M.poly(smooth(kS.cheekF, new Set([2, 3, 4]), 3))], { ramp: BLK, thick: 9 * z, base: 2.7, gain: 2.3, litOutline: LIT });
  if (fv > 0.01) {
    const gf = fade(g, fv), zf = Mf.z;
    const jawDrop = open * 2.6;
    const blz = k.blaze.map(([x, y], i) => (i >= 5 && i <= 9 ? [x, y + jawDrop * (i === 7 ? 1 : 0.7)] : [x, y]));
    blob(gf, [Mf.poly(smooth(blz, new Set(), 3))], { ramp: WHT, thick: 5.5 * zf, base: 4.5, gain: 1.6, outline: "#2A2A40", litOutline: "#9494AE" });
    { const b = k.blushN, p = Mf.P([b[0], b[1]]); blush(gf, p[0], p[1], b[2] * zf, Math.max(1, b[3] * zf), "#F27A9A"); }
    blob(gf, [Mf.poly(eAt([k.jaw[0], k.jaw[1] + jawDrop, k.jaw[2], k.jaw[3]], zf))], { ramp: WHT, thick: 2.4 * zf, base: 4.3, gain: 1.4, outline: "#5A5A74" });
    const mz = k.muz, muzP = Mf.poly(eAt([mz[0], mz[1] - 0.2 * open, mz[2], mz[3]], zf));
    mouth(gf, Mf, k, { open, pant, t });
    blob(gf, [muzP], { ramp: WHT, thick: 3.6 * zf, base: 4.9, gain: 1.4, outline: "#5A5A74" });
    upperLip(gf, Mf, k, open);
    const padZ = sm01((zf - 1.5) / 0.6);
    if (padZ > 0.02) { const gg = fade(gf, padZ), s = Math.max(1, R(zf * 0.35)), p = k.padN; for (const [dx, dy] of [[-1.3, -0.6], [0, 0], [-1.1, 1.0], [0.3, -1.2]]) { const q = Mf.P([p[0] + dx, p[1] + dy]); gg.rect(Math.floor(q[0]), Math.floor(q[1]), s, s, "#A2A2BA"); } }
    nose(gf, Mf, k, S);
    const look = st.look ?? [0.4, 0], e = k.eyeN, p = Mf.P([e[0], e[1]]);
    dogEye(gf, p[0], p[1], e[2] * zf, e[3] * zf, { iris: DOG_EYE, pupil: "round", look: [look[0] * Mf.f, look[1]], blink: clamp01(st.blink ?? 0), z: zf });
  }
  if (earsFront > 0) ears(fade(g, earsFront));
  const A = headAnchors(0, open), hidden = fv < 0.5;
  return { nose: Mf.P(A.nose), mouth: Mf.P(A.mouth), ball: Mf.P(A.ball), eye: Mf.P(A.eye), eyes: A.eyes.map(Mf.P), head: M.P([0, 0]), top: M.P([lerp(-6, 0, ub), lerp(-27.9, -25.8, ub)]), hidden };
}
/** Head-local anchor points (head units, before the head scale) for a yaw and a mouth opening. */
export function headAnchors(yaw, open = 0) {
  const k = headKey(yaw), front = clamp01(yaw);
  return {
    nose: [k.nose[0] + lerp(3.8, 0, front), k.nose[1] + lerp(0, 1.0, front)], mouth: [k.mouthU[2][0], lerp(k.mouthU[2][1], (k.mouthU[2][1] + k.mouthL[2][1]) / 2, Math.max(open, 0.35))],
    ball: [k.ball[0], k.ball[1] + 0.3 * open], eye: [k.eyeN[0], k.eyeN[1]], eyes: [[k.eyeN[0], k.eyeN[1]], [k.eyeF[0], k.eyeF[1]]],
    head: [0, 0], top: [lerp(-6, 0, front), lerp(-27.9, -25.8, front)],
  };
}
function upperLip(g, M, k, open) { const up = M.poly(k.mouthU), lw = Math.max(1, R(M.z * 0.42)); for (let i = 0; i + 1 < up.length; i++) thick(g, up[i], up[i + 1], OUT, lw); }

/**
 * cute.mjs eye; closing it: the lid comes down (blink 0 … 0.8), then the whole eye dissolves into a soft closed-eye
 * lash curve ⌣ (0.8 … 1), so a held closed eye leaves only fur and the curve (no disc).
 */
function dogEye(g, x, y, r, ry, o) {
  if ((o.happy ?? 0) > 0) return happyEye(g, x, y, r, ry, o);
  const b = clamp01(o.blink ?? 0), z = o.z ?? 1;
  const open = 1 - sm01((b - 0.78) / 0.22), shut = 1 - open;
  if (open > 0.01) {
    const gg = fade(g, open), bb = Math.min(b, 0.8);
    if (bb <= 0.005) eye(gg, x, y, r, { ...o, ry, blink: 0, lid: BLK[3] });
    else {
      // the open eye clipped below the lid line (highlights disappear pixel by pixel); above it the fur that is already
      // there shows through, so the lid always matches the head; only the dark lid edge is drawn
      const lidY = y - ry + 2 * (ry + 0.6) * bb, lw = Math.max(1, R((o.z ?? 1) * 0.34));
      const lidAt = (X) => { const u = Math.max(-1, Math.min(1, (X + 0.5 - x) / (r + 0.6))); return lidY + 0.16 * ry * Math.sin(Math.PI * bb) * (1 - u * u); };
      const below = Object.create(gg); below.px = (X, Y, col) => { if (Y + 0.5 >= lidAt(X) + lw) gg.px(X, Y, col); };
      eye(below, x, y, r, { ...o, ry, blink: 0 });
      for (let X = Math.floor(x - r - 1); X <= Math.ceil(x + r + 1); X++) { const ly = Math.floor(lidAt(X)); for (let Y = ly; Y < ly + lw; Y++)
        if (((X + 0.5 - x) / (r + 0.6)) ** 2 + ((Y + 0.5 - y) / (ry + 0.6)) ** 2 <= 1) gg.px(X, Y, "#07060E"); }
    }
  }
  if (shut > 0.01) {
    const gg = fade(g, shut), lw = Math.max(1, R(z * 0.34)), n = Math.max(6, Math.ceil(r * 3));
    for (let i = 0; i <= n; i++) { const u = -1 + (2 * i) / n, X = x + u * r * 0.95, Y = y + ry * (0.28 + 0.32 * (1 - u * u)); for (let d = 0; d < lw; d++) gg.px(Math.floor(X), Math.floor(Y) + d, "#07060E"); }
    if (r >= 3) { const X = x - r * 0.95, Y = y + ry * 0.28; for (let d = 0; d < lw; d++) { gg.px(Math.floor(X - r * 0.12), Math.floor(Y - r * 0.12) + d, "#07060E"); } }
  }
}

/**
 * Happy squint (boop, lick): the lower lid rises as an arch ◠ (the eye becomes a smiling crescent with its highlight on
 * top) and at the end dissolves into a soft ∩ arc. Combines with a normal blink (upper lid) — the larger one wins.
 */
function happyEye(g, x, y, r, ry, o) {
  const b = clamp01(o.blink ?? 0), h = clamp01(o.happy ?? 0), z = o.z ?? 1, lw = Math.max(1, R(z * 0.34));
  const m = Math.max(b, h), open = 1 - sm01((m - 0.78) / 0.22), shut = 1 - open;
  if (open > 0.01) {
    const gg = fade(g, open), bb = Math.min(b, 0.8), hh = Math.min(h, 0.8);
    const lidY = y - ry + 2 * (ry + 0.6) * bb;
    const upAt = (X) => { const u = Math.max(-1, Math.min(1, (X + 0.5 - x) / (r + 0.6))); return lidY + 0.16 * ry * Math.sin(Math.PI * bb) * (1 - u * u); };
    const lowAt = (X) => { const u = Math.max(-1, Math.min(1, (X + 0.5 - x) / (r + 0.6))); return y + ry + 0.6 - 2 * (ry + 0.6) * hh * 0.92 - 0.42 * ry * Math.sin(Math.PI * Math.min(1, hh * 1.1)) * (1 - u * u); };
    const inE = (X, Y) => ((X + 0.5 - x) / (r + 0.6)) ** 2 + ((Y + 0.5 - y) / (ry + 0.6)) ** 2 <= 1;
    const v = Object.create(gg); v.px = (X, Y, col) => { const Y5 = Y + 0.5; if ((bb <= 0.005 || Y5 >= upAt(X) + lw) && Y5 <= lowAt(X) - lw) gg.px(X, Y, col); };
    eye(v, x, y, r, { ...o, ry, blink: 0, lid: BLK[3] });
    for (let X = Math.floor(x - r - 1); X <= Math.ceil(x + r + 1); X++) {
      if (bb > 0.005) { const ly = Math.floor(upAt(X)); for (let Y = ly; Y < ly + lw; Y++) if (inE(X, Y)) gg.px(X, Y, "#07060E"); }
      if (hh > 0.005) { const ly = Math.ceil(lowAt(X)) - lw; for (let Y = ly; Y < ly + lw; Y++) if (inE(X, Y) && (bb <= 0.005 || Y + 0.5 >= upAt(X))) gg.px(X, Y, "#07060E"); }
    }
  }
  if (shut > 0.01) {
    const wb = b >= h ? 1 : 0, n = Math.max(6, Math.ceil(r * 3));
    for (const [w, sgn] of [[wb, 1], [1 - wb, -1]]) {
      if (w <= 0) continue; const gg = fade(g, shut);
      for (let i = 0; i <= n; i++) {
        const u = -1 + (2 * i) / n, X = x + u * r * 0.95;
        const Y = sgn > 0 ? y + ry * (0.28 + 0.32 * (1 - u * u)) : y - ry * (0.05 + 0.5 * (1 - u * u)) + ry * 0.12;
        for (let d = 0; d < lw; d++) gg.px(Math.floor(X), Math.floor(Y) + d, "#07060E");
      }
    }
  }
}

/** A shaded ball (radius r px) in a ramp of 8 colours, with a specular glint. */
export function drawBall(g, x, y, r, ramp) {
  blob(g, [ell(x, y, r, r, 0, Math.max(16, Math.ceil(r * 2.4)))], { ramp, thick: r * 0.9, base: 3.2, gain: 2.4, slope: 0.8, outline: ramp[0], litOutline: null });
  const hx = x - r * 0.38, hy = y - r * 0.42, hr = Math.max(0.8, r * 0.22);
  for (let Y = Math.floor(hy - hr); Y <= Math.ceil(hy + hr); Y++) for (let X = Math.floor(hx - hr); X <= Math.ceil(hx + hr); X++) if (((X + 0.5 - hx) / hr) ** 2 + ((Y + 0.5 - hy) / (hr * 0.8)) ** 2 <= 1) g.px(X, Y, ramp[7]);
  g.px(Math.floor(hx), Math.floor(hy), "#FFFFFF");
}
