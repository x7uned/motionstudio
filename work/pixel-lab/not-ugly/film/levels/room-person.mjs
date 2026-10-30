// «You're not ugly» — YOU: the recurring human hero (purple bobble hat, brown hair, light-blue striped pyjamas with navy
// piping, yellow slippers), adapted from cat-zoomies/film/person.mjs (side view, volume-shaded, same palettes and parts).
// Scaled to ≈ 204 px tall (hat pompom to soles) at z = 1. New here: a standing rig driven by blendable arm "modes"
// (phone low, selfie, chin, jaw, wave, chest), a hop/squat/slump, more faces (sad, worried, neutral, joy, wince, talk)
// blended continuously (numbers lerp, mouth/eye kinds crossfade through Bayer gates), a light direction per call, and a
// prop hook so the room can draw the phone in the near fist (under the fingers). Pure functions of the arguments.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
import { smooth } from "../../../dog/shade.mjs";

export const PERSON_H = 218;
export const PERSON_K = PERSON_H / 98;     // world px per hero unit
const K = PERSON_K, R = Math.round, PI = Math.PI;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
const sm = (x, a, b) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const add = (p, q) => [p[0] + q[0], p[1] + q[1]], sub = (p, q) => [p[0] - q[0], p[1] - q[1]], sc = (p, s) => [p[0] * s, p[1] * s];
const rot = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const L2 = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
const dir = (a) => [Math.sin(a), Math.cos(a)];            // limb angle: 0 = straight down, +π/2 = forward, ±π = up
const ang = (v) => Math.atan2(v[0], v[1]);
const wrap = (a) => a - 2 * PI * Math.round(a / (2 * PI));
const frac = (x) => x - Math.floor(x);

/** Canvas view that only writes pixels whose Bayer threshold lies in [lo, hi) (complementary gates = pixel crossfade). */
export function gate(c, lo, hi) {
  if (lo <= 0 && hi >= 1) return c;
  const o = Object.create(c);
  o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) c.px(x, y, col); };
  return o;
}

// ---------------------------------------------------------------- palettes (8 steps, dark → light), as person.mjs
export const SKIN = ["#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC"];
export const HAT = ["#1A1030", "#2A1F40", "#3B2C5C", "#523D82", "#6E4FB0", "#8D59DA", "#B08AE8", "#E0CDF8"];
export const HAIR = ["#120A06", "#1E120A", "#2E1C10", "#3E2818", "#523620", "#6A4628", "#806040", "#9A7A58"];
export const PJ = ["#141A3E", "#232F66", "#37498F", "#5069B6", "#7090D6", "#94B2EC", "#BCD2F8", "#E4EEFF"];
const PIPE = ["#0C0A18", "#181430", "#22204A", "#2E2E66", "#3E4284", "#5258A0", "#6A74BC", "#8A94D4"];
export const SLIP = ["#3A2A08", "#6A4A10", "#A07418", "#C99A2A", "#F4CA50", "#FAE375", "#FDF0A8", "#FFF8D8"];
const POM = ["#3A3254", "#5A5276", "#7A7298", "#9C94B8", "#BEB6D6", "#D8D2EA", "#EEEAF8", "#FFFFFF"];
const skinAt = (xf, i) => SKIN[Math.max(1, Math.min(7, R(i - xf.dim)))];
const INK = "#1E0E0C", BROW = "#3A2414", WHITE = "#FDF6EE", IRIS = ["#3A1608", "#6A3216", "#94502A", "#B8743E"], BLUSH = "#E8807A";
let LIGHT = [-0.3, -0.95];
const D = { thigh: 16.5, shin: 16, ank: 2.7, upper: 14.5, fore: 13.5 };

// ---------------------------------------------------------------- frame: hero-local → world → screen (and back)
function frame(G, wx, wy, f, dim = 0) {
  const z = G.z, X0 = G.X(0), Y0 = G.Y(0), fk = f * K;
  return {
    z, s: K * z, f, dim: clamp01(dim) * 1.3, bb: [Infinity, Infinity, -Infinity, -Infinity],
    P: (u) => [X0 + (wx + fk * u[0]) * z, Y0 + (wy + K * u[1]) * z],
    inv: (X, Y) => [((X - X0) / z - wx) / fk, ((Y - Y0) / z - wy) / K],
  };
}
const grow = (bb, x, y) => { if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (x > bb[2]) bb[2] = x; if (y > bb[3]) bb[3] = y; };

/** Volume-shaded part (the shade.mjs drawPart algorithm) with an optional tone pattern(X, Y) → Δtone for fabric. */
function part(g, xf, poly, o) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (!(x1 > x0) || !(y1 > y0)) return;
  grow(xf.bb, x0, y0); grow(xf.bb, x1, y1);
  x0 = Math.floor(x0) - 2; y0 = Math.floor(y0) - 2; x1 = Math.ceil(x1) + 2; y1 = Math.ceil(y1) + 2;
  const W = x1 - x0, H = y1 - y0; if (W * H > 4e6) return;
  const m = new Uint8Array(W * H), n = poly.length;
  for (let y = 0; y < H; y++) {
    const yc = y0 + y + 0.5, xs = [];
    for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) { const e = Math.min(W, Math.round(xs[k + 1]) - x0); for (let x = Math.max(0, Math.round(xs[k]) - x0); x < e; x++) m[y * W + x] = 1; }
  }
  const { ramp, base = 3.4, gain = 1.4, slope = 1.0, thick = 10, rimLit = 0.8, rimShade = 0.8, outline = ramp[0], litOutline = null, pattern = null } = o;
  const d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = m[i] ? 1e9 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 1.414); } d[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x < W - 1) v = Math.min(v, d[i + 1] + 1); if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + W - 1] + 1.414); } d[i] = v; }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]);
  const ln = Math.hypot(LIGHT[0], LIGHT[1]), ux = LIGHT[0] / ln, uy = LIGHT[1] / ln;
  const lx3 = R(ux * 3), ly3 = R(uy * 3), sx4 = R(-ux * 4), sy4 = R(-uy * 4), lx1 = R(ux * 1.5), ly1 = R(uy * 1.5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!m[i]) continue;
    const X = x0 + x, Y = y0 + y;
    if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) { g.px(X, Y, litOutline && !at(x + lx1, y + ly1) ? litOutline : outline); continue; }
    let v = base + gain * Math.pow(Math.min(1, d[i] / thick), 0.6) - slope * (y / H);
    if (!at(x + lx3, y + ly3)) v += rimLit;
    if (!at(x + sx4, y + sy4)) v -= rimShade;
    if (pattern) v += pattern(X, Y);
    v -= xf.dim;
    const fl = Math.floor(v), f = v - fl, q = f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl;
    g.px(X, Y, ramp[Math.max(1, Math.min(ramp.length - 1, q))]);
  }
}
const SEG = (xf) => Math.max(3, Math.min(9, R(xf.s * 1.1)));
function shape(g, xf, pts, o, sharp = new Set()) { part(g, xf, smooth(pts.map(xf.P), sharp, SEG(xf)), o); }
function limb(pts, widths) {
  const Lt = [], Rt = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n, w = widths[i] / 2;
    Lt.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); Rt.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return [...Lt, ...Rt.reverse()];
}
const ellPts = (c, rx, ry, n = 18, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + (2 * PI * i) / n; return [c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry]; });
function stripes(bone, halfW, period, width = 0.3, depth = 1.25, phase = 0.5) {
  const segs = [];
  for (let i = 0; i + 1 < bone.length; i++) { const a = bone[i], b = bone[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; segs.push([a[0], a[1], dx / L, dy / L, L, halfW[i], halfW[i + 1]]); }
  const wRef = halfW.reduce((s, v) => s + v, 0) / halfW.length;
  return (X, Y) => {
    let best = Infinity, s = 0;
    for (const [ax, ay, dx, dy, L, w0, w1] of segs) {
      const px = X + 0.5 - ax, py = Y + 0.5 - ay, t = Math.max(0, Math.min(L, px * dx + py * dy)), e = Math.hypot(px - dx * t, py - dy * t);
      if (e < best) { best = e; s = (px * -dy + py * dx) / (w0 + ((w1 - w0) * t) / L); }
    }
    s = Math.max(-1, Math.min(1, s));
    if (Math.abs(s) > 0.93) return 0;
    const u = (lerp(s, Math.asin(s) / (PI / 2), 0.55) * wRef) / period + phase;
    return frac(u) < width ? -depth : 0;
  };
}
function paint(g, xf, fwd, back, box, fn) {
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  for (const c of [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]]) { const [X, Y] = xf.P(fwd(c)); X0 = Math.min(X0, X); Y0 = Math.min(Y0, Y); X1 = Math.max(X1, X); Y1 = Math.max(Y1, Y); }
  for (let Y = Math.floor(Y0); Y <= Math.ceil(Y1); Y++) for (let X = Math.floor(X0); X <= Math.ceil(X1); X++) {
    const [u, v] = back(xf.inv(X + 0.5, Y + 0.5)), c = fn(u, v, X, Y); if (c) g.px(X, Y, c);
  }
}
const segD = (u, v, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2v = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((u - a[0]) * dx + (v - a[1]) * dy) / L2v)); return Math.hypot(u - a[0] - dx * t, v - a[1] - dy * t); };
const bezPts = (a, c, b, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = 1 - t; return [s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]; });
const polyD = (u, v, pts) => { let d = Infinity; for (let i = 0; i + 1 < pts.length; i++) d = Math.min(d, segD(u, v, pts[i], pts[i + 1])); return d; };
function sline(g, a, b, w, col) {
  const r = Math.max(0.5, w / 2), x0 = Math.floor(Math.min(a[0], b[0]) - r - 1), x1 = Math.ceil(Math.max(a[0], b[0]) + r + 1), y0 = Math.floor(Math.min(a[1], b[1]) - r - 1), y1 = Math.ceil(Math.max(a[1], b[1]) + r + 1);
  if (r <= 0.6) { g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), col); return; }
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) if (segD(X + 0.5, Y + 0.5, a, b) <= r) g.px(X, Y, col);
}

// ---------------------------------------------------------------- head (local frame: origin = top of the neck)
const HEAD = [[-7.6, -5.0], [-8.9, -10.4], [-7.0, -15.6], [-2.2, -18.3], [3.6, -17.7], [7.4, -14.8], [8.8, -11.6], [9.1, -9.9], [12.0, -7.4], [9.6, -6.1], [9.8, -4.6], [8.9, -3.6], [8.3, -1.7], [4.2, 0.0], [-0.8, -0.4], [-5.4, -2.4]];
const JAW = new Set([10, 11, 12, 13, 14]);
const HAIR_BACK = [[-9.5, -9.4], [-6.0, -10.9], [-2.9, -10.7], [-2.3, -9.3], [-3.3, -6.6], [-3.8, -4.0], [-5.6, -2.7], [-7.9, -4.1], [-9.3, -6.9]];
const HAIR_TUFT = [[6.6, -13.4], [10.3, -14.9], [9.9, -13.2], [8.9, -12.7], [8.0, -13.2], [7.2, -12.8]];
const CUFF = [[-10.5, -8.6], [-10.8, -12.6], [10.1, -18.0], [10.5, -14.3]];
const CROWN = [[-9.9, -11.8], [-9.8, -16.6], [-6.8, -21.8], [-1.0, -24.2], [4.8, -23.4], [8.5, -20.6], [9.7, -17.2], [0.0, -14.6]];
const EYE = [5.75, -9.0], POMC = [-1.8, -26.2];
const cuffY = (x, top) => { const t = (x + 10.5) / 21; return top ? lerp(-12.6, -18.0, t) : lerp(-8.6, -14.3, t); };

/** Expressions. Numbers blend; `mouth` and `closed` (eye kind) crossfade through Bayer gates. */
const FACES = {
  sleepy: { lid: 0.56, mouth: "flat", blush: 0.8, brow: [[3.9, -11.7], [7.1, -12.0], 0.15] },
  neutral: { lid: 0.14, low: 0.05, scale: 1.04, brow: [[3.9, -11.9], [7.1, -12.2], 0.3], mouth: "soft", blush: 0.75 },
  pose: { lid: 0.06, low: 0.12, scale: 1.08, ix: 0.2, brow: [[3.9, -12.1], [7.1, -12.4], 0.45], mouth: "soft", blush: 0.95 },
  sad: { lid: 0.44, slant: -0.42, low: 0.04, scale: 1.0, brow: [[3.7, -11.0], [7.3, -13.7], 0.2], mouth: "frown", blush: 0.35 },
  worried: { lid: 0.04, slant: -0.36, scale: 1.14, brow: [[3.8, -11.7], [7.2, -13.5], 0.12], mouth: "frown", blush: 0.55 },
  surprised: { lid: 0, scale: 1.3, irF: 0.62, prF: 0.5, brow: [[3.7, -12.9], [7.4, -13.3], 0.75], mouth: "o", hat: 1.4, blush: 0.6 },
  happy: { lid: 0.04, low: 0.2, scale: 1.12, irF: 0.84, ix: 0.12, brow: [[3.9, -12.1], [7.1, -12.3], 0.45], mouth: "smile", blush: 1 },
  joy: { closed: "joy", brow: [[3.9, -12.4], [7.1, -12.6], 0.55], mouth: "smile", blush: 1.25, hat: 0.3 },
  wince: { lid: 0.8, slant: 0.22, low: 0.28, brow: [[3.8, -12.2], [7.2, -11.2], -0.2], mouth: "grit", blush: 0.9 },
  talk: { lid: 0.1, low: 0.06, scale: 1.06, brow: [[3.9, -12.0], [7.1, -12.4], 0.4], mouth: "talk", blush: 0.8 },
  deep: { lid: 0.3, low: 0.1, scale: 1.0, brow: [[3.8, -11.4], [7.2, -11.3], -0.05], mouth: "talk", blush: 0.8 },
};
const NUM = { lid: 0, slant: 0, low: 0, scale: 1, irF: 0.78, prF: 0.55, ix: 0.3, blush: 0.8, hat: 0 };
function faceOf(name) { const F = FACES[name] ?? FACES.neutral, o = { ...NUM, ...F }; return o; }
function blendFace(A, B, k) {
  const o = { ...A };
  for (const key of Object.keys(NUM)) o[key] = lerp(A[key], B[key], k);
  o.brow = [L2(A.brow[0], B.brow[0], k), L2(A.brow[1], B.brow[1], k), lerp(A.brow[2], B.brow[2], k)];
  return o;
}

function drawHead(g, xf, N, ha, o) {
  const fwd = (u) => add(rot(u, ha), N), back = (l) => rot(sub(l, N), -ha), P = (u) => xf.P(fwd(u)), pp = 1 / xf.s;
  const FA = faceOf(o.faceA), FB = faceOf(o.faceB ?? o.faceA), fk = clamp01(o.faceK ?? 0), F = blendFace(FA, FB, fk);
  const blink = clamp01(o.blink ?? 0), hatLift = F.hat + (o.hatLift ?? 0);
  shape(g, xf, HEAD.map(fwd), { ramp: SKIN, base: 4.4, gain: 1.4, slope: 1.0, thick: 5 * xf.s, rimLit: 0.6 }, new Set([8]));
  shape(g, xf, HAIR_BACK.map(fwd), { ramp: HAIR, base: 3.4, gain: 1.4, thick: 2.2 * xf.s, slope: 0.8, rimLit: 0.9 });
  shape(g, xf, HAIR_TUFT.map(fwd), { ramp: HAIR, base: 3.6, gain: 1.0, thick: 1.0 * xf.s, slope: 0.5, rimLit: 0.9 }, new Set([1]));
  shape(g, xf, ellPts([-1.4, -8.0], 1.75, 2.35, 14).map(fwd), { ramp: SKIN, base: 3.9, gain: 1.0, thick: 1.4 * xf.s, slope: 0.6 });
  paint(g, xf, fwd, back, [-2.6, -9.8, -0.2, -6.2], (u, v) => (((u + 1.25) / 0.75) ** 2 + ((v + 7.9) / 1.3) ** 2 < 1 ? skinAt(xf, 3) : null));
  const bl = F.blush;
  paint(g, xf, fwd, back, [2.4, -7.4, 6.8, -4.2], (u, v, X, Y) => { const dd = ((u - 4.6) / 2.0) ** 2 + ((v - 5.8 + 11.6) / 1.15) ** 2; return dd < 1 && (1 - dd) * 1.6 * bl > bayer(X, Y) && ((X + Y) & 1) === 0 ? BLUSH : null; });
  // eye: one drawing with blended numbers, or two gated drawings when the eye kind changes (open ↔ closed arc)
  if ((FA.closed ?? "") !== (FB.closed ?? "") && fk > 0 && fk < 1) { drawEye(gate(g, fk, 1), xf, fwd, back, pp, FA, blink, o); drawEye(gate(g, 0, fk), xf, fwd, back, pp, FB, blink, o); }
  else drawEye(g, xf, fwd, back, pp, fk >= 0.5 ? { ...F, closed: FB.closed } : { ...F, closed: FA.closed }, blink, o);
  { const [b0, b1, arch] = F.brow, mid = [(b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2 - arch], pts = bezPts(b0, mid, b1, 8), w = Math.max(0.42, pp * 0.75);
    paint(g, xf, fwd, back, [Math.min(b0[0], b1[0]) - 1, Math.min(b0[1], b1[1], mid[1]) - 1.5, Math.max(b0[0], b1[0]) + 1, Math.max(b0[1], b1[1]) + 1], (u, v) => {
      const dd = polyD(u, v, pts), t = clamp01((u - b0[0]) / (b1[0] - b0[0])), ww = w * (1.15 - 0.35 * Math.abs(t - 0.45));
      return dd <= ww ? BROW : null; }); }
  if (FA.mouth !== FB.mouth && fk > 0 && fk < 1) { drawMouth(gate(g, fk, 1), xf, fwd, back, pp, FA.mouth, o); drawMouth(gate(g, 0, fk), xf, fwd, back, pp, FB.mouth, o); }
  else drawMouth(g, xf, fwd, back, pp, fk >= 0.5 ? FB.mouth : FA.mouth, o);
  const hl = (u) => fwd([u[0] + hatLift * 0.25, u[1] - hatLift]);
  shape(g, xf, CROWN.map(hl), { ramp: HAT, base: 3.6, gain: 1.4, slope: 1.0, thick: 4 * xf.s });
  shape(g, xf, CUFF.map(hl), { ramp: HAT, base: 4.4, gain: 0.9, slope: 0.6, thick: 1.6 * xf.s }, new Set([0, 1, 2, 3]));
  for (let k = 0; k < 11; k++) { const x = -9.6 + k * 1.95, a = P([x + hatLift * 0.25, cuffY(x, false) - 0.55 - hatLift]), b = P([x + hatLift * 0.25, cuffY(x, true) + 0.6 - hatLift]); sline(g, a, b, Math.max(1, xf.s * 0.32), HAT[3]); }
  const pom = o.pom ?? [0, 0], pc = [POMC[0] + pom[0] + hatLift * 0.25, POMC[1] + pom[1] - hatLift];
  const fuzz = Array.from({ length: 30 }, (_, i) => { const a = (2 * PI * i) / 30, r = 3.7 + (i % 2 ? 0.14 : -0.08) + 0.1 * Math.sin(i * 2.3); return add(pc, [Math.cos(a) * r, Math.sin(a) * r]); });
  shape(g, xf, fuzz.map(fwd), { ramp: POM, base: 4.0, gain: 1.6, slope: 0.9, thick: 2.6 * xf.s, rimLit: 1.0 });
  if (xf.s > 2) for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 1.2 + (i % 3) * 0.7, [X, Y] = P(add(pc, [Math.cos(a) * r, Math.sin(a) * r])); g.px(R(X), R(Y), POM[3]); }
  return { center: P([1.5, -9.5]), mouth: P([9.6, -4.0]), eye: P(EYE), nose: P([12.4, -7.5]), chin: P([8.3, -1.0]), ear: P([-1.4, -8.0]), top: P(add(pc, [0, -3.6])), back: P([-8.5, -9]) };
}

function drawEye(g, xf, fwd, back, pp, F, blink, o) {
  const [ex, ey] = EYE;
  if (F.closed) {   // "joy": a happy upward arc; otherwise a sleepy downward arc
    const up = F.closed === "joy", pts = up ? bezPts([ex - 1.5, ey + 0.5], [ex, ey - 1.5], [ex + 1.4, ey + 0.4], 10) : bezPts([ex - 1.45, ey - 0.1], [ex, ey + 1.5], [ex + 1.35, ey - 0.2], 10), w = Math.max(0.34, pp * 0.7);
    paint(g, xf, fwd, back, [ex - 2.6, ey - 2, ex + 2, ey + 1.6], (u, v) => (polyD(u, v, pts) <= w ? INK : null));
    return;
  }
  const scl = F.scale, rx = 1.3 * scl, ry = 1.65 * scl, lid = Math.max(F.lid, blink), slant = F.slant, low = F.low;
  const ir = rx * F.irF, I = [ex + rx * F.ix + (o.look?.[0] ?? 0) * rx * 0.22, ey + ry * 0.1 + (o.look?.[1] ?? 0) * ry * 0.18], pr = ir * F.prF, hr = Math.max(pp * 0.55, ir * 0.36);
  const lineW = Math.max(pp * 0.75, 0.32);
  paint(g, xf, fwd, back, [ex - rx - 1, ey - ry - 1, ex + rx + 1, ey + ry + 1], (u, v, X, Y) => {
    const a = (u - ex) / (rx + pp * 0.5), b = (v - ey) / (ry + pp * 0.5);
    if (a * a + b * b > 1) return null;
    const yl = ey - ry + 2 * ry * lid + slant * (u - ex), yb = ey + ry - 2 * ry * low - 1.1 * low * ry * (1 - ((u - ex) / rx) ** 2);
    if (v < yl - lineW * 0.5) return skinAt(xf, 5);
    if (v < yl + lineW * 0.6) return INK;
    if (low > 0 && v > yb) return v < yb + lineW * 0.8 ? INK : skinAt(xf, 5);
    const ai = (u - ex) / (rx - pp * 0.9), bi = (v - ey) / (ry - pp * 0.9);
    if (ai * ai + bi * bi > 1) return INK;
    const di = Math.hypot(u - I[0], (v - I[1]) * 0.92);
    if (Math.hypot(u - (I[0] - ir * 0.32), v - (I[1] - ir * 0.42)) < hr) return "#FFFFFF";
    if (di < pr) return INK;
    if (di < ir) { const t = (v - (I[1] - ir)) / (2 * ir); return IRIS[Math.min(3, Math.max(1, Math.floor(t * 3 + 0.6 + 0.3 * bayer(X, Y))))]; }
    if (Math.hypot(u - (I[0] + ir * 0.4), v - (I[1] + ir * 0.5)) < hr * 0.55) return "#FFFFFF";
    return v < ey - ry * 0.55 + slant * (u - ex) ? "#E6DCD4" : WHITE;
  });
  if (lid < 0.95) { const y = ey - ry + 2 * ry * lid + slant * (-rx), w = Math.max(0.28, pp * 0.6); paint(g, xf, fwd, back, [ex - rx - 1.4, y - 1, ex - rx + 0.6, y + 1], (u, v) => (segD(u, v, [ex - rx * 0.85, y + 0.25], [ex - rx - 0.75, y - 0.35]) <= w ? INK : null)); }
}

function drawMouth(g, xf, fwd, back, pp, k, o) {
  const w = Math.max(0.3, pp * 0.7), box = [5.2, -7.2, 11.2, 0.5];
  const oval = (c, rx, ry, tongue = 0.3) => paint(g, xf, fwd, back, box, (u, v) => { const a = (u - c[0]) / rx, b = (v - c[1]) / ry; if (a * a + b * b > 1) return null; const ai = (u - c[0]) / Math.max(0.1, rx - pp), bi = (v - c[1]) / Math.max(0.1, ry - pp); return ai * ai + bi * bi > 1 ? INK : b > tongue ? "#E06A80" : "#4A1420"; });
  if (k === "o") oval([8.75, -3.9], 1.05, 1.4);
  else if (k === "talk") {
    const op = clamp01(o.open ?? 0);
    if (op < 0.06) { const pts = bezPts([9.5, -4.15], [8.3, -3.95], [7.2, -4.4], 8); paint(g, xf, fwd, back, box, (u, v) => (polyD(u, v, pts) <= w ? INK : null)); }
    else oval([8.75 - 0.15 * op, -4.0 + 0.45 * op], 0.85 + 0.35 * op, 0.45 + 1.15 * op, 0.25);
  } else if (k === "smile") {
    const top = (u) => -4.75 - 0.75 * clamp01((9.4 - u) / 2.8) ** 1.6, bot = (u) => top(u) + 1.55 * clamp01((u - 6.7) / 2.7) ** 0.8;
    paint(g, xf, fwd, back, box, (u, v) => {
      if (u < 6.3 || u > 9.75) return null;
      const t = top(u), bb = bot(u);
      if (v >= t - w * 0.5 && v <= bb + w * 0.6) { if (v < t + w * 0.6 || v > bb - w * 0.5 || u < 6.3 + w * 1.2) return INK; return v > (t + bb) / 2 + 0.15 ? "#E06A80" : "#4A1420"; }
      return null; });
  } else if (k === "grit") {   // clenched teeth (cringe)
    paint(g, xf, fwd, back, box, (u, v) => {
      if (u < 6.6 || u > 9.7) return null; const t = -4.75 + 0.25 * clamp01((9.7 - u) / 3), bb = -3.3 - 0.15 * clamp01((9.7 - u) / 3);
      if (v < t - w * 0.5 || v > bb + w * 0.5) return null;
      if (v < t + w * 0.5 || v > bb - w * 0.5 || u < 6.6 + w * 1.1 || u > 9.7 - w * 0.9) return INK;
      return Math.abs(v - (t + bb) / 2) < w * 0.45 ? "#8A6A6A" : "#FDF6EE"; });
  } else if (k === "frown") {
    const pts = bezPts([9.55, -4.35], [8.2, -4.75], [6.9, -3.75], 8);
    paint(g, xf, fwd, back, box, (u, v) => (polyD(u, v, pts) <= w ? INK : null));
  } else if (k === "soft") {   // a small closed smile
    const pts = bezPts([9.55, -4.15], [8.3, -3.7], [7.0, -4.85], 8);
    paint(g, xf, fwd, back, box, (u, v) => (polyD(u, v, pts) <= w ? INK : null));
  } else {
    const pts = bezPts([9.5, -4.2], [8.3, -3.85], [7.3, -4.05], 8);
    paint(g, xf, fwd, back, box, (u, v) => (polyD(u, v, pts) <= w ? INK : null));
  }
}

// ---------------------------------------------------------------- hands, slippers
function hand(g, xf, W, from, kind = "open", grip = null) {
  const a = ang(sub(W, from)), dvec = dir(a), n = [dvec[1], -dvec[0]];
  const L = (u, v) => add(W, add(sc(dvec, u), sc(n, v)));
  if (kind === "fist") {
    const c = grip ?? L(2.2, 0), q = (p) => add(c, rot(p, -a + PI / 2));   // fist shape follows the forearm
    shape(g, xf, [q([-1.9, -2.2]), q([1.4, -2.4]), q([2.2, -0.8]), q([2.1, 1.6]), q([0.6, 2.4]), q([-1.9, 2.0])], { ramp: SKIN, base: 4.5, gain: 1.0, slope: 0.6, thick: 1.4 * xf.s, rimLit: 0.5 });
    shape(g, xf, [q([-1.4, -2.9]), q([0.6, -3.4]), q([1.6, -2.4]), q([0.0, -1.6])], { ramp: SKIN, base: 4.9, gain: 0.6, slope: 0.4, thick: 0.8 * xf.s });
    return c;
  }
  const pts = [L(-0.6, -1.7), L(1.6, -1.9), L(3.6, -1.3), L(4.6, -0.1), L(4.2, 1.2), L(2.0, 1.7), L(-0.6, 1.6)];
  shape(g, xf, pts, { ramp: SKIN, base: 4.4, gain: 1.1, slope: 0.6, thick: 1.55 * xf.s, rimLit: 0.5 });
  shape(g, xf, [L(0.8, -1.3), L(2.0, -2.9), L(3.0, -2.6), L(2.3, -1.1)], { ramp: SKIN, base: 4.8, gain: 0.6, slope: 0.4, thick: 0.7 * xf.s });
  return L(2.2, 0);
}
function slipperM(g, xf, A0, d, nrm, M, dark) {
  const F = (u, v) => M(add(A0, add(sc(d, u), sc(nrm, v))));
  const pts = [F(-2.8, -1.4), F(-3.7, 0.6), F(-3.2, 2.7), F(6.2, 2.7), F(8.1, 1.4), F(7.6, -0.8), F(4.0, -1.9), F(0.8, -2.2)];
  shape(g, xf, pts, { ramp: SLIP, base: 3.9 + dark, gain: 1.3, slope: 1.0, thick: 2.2 * xf.s, rimLit: 0.7 }, new Set([2, 3]));
  shape(g, xf, [F(-3.1, -2.0), F(1.4, -2.9), F(2.4, -1.5), F(-2.6, -0.6)], { ramp: SLIP, base: 5.4 + dark, gain: 0.8, slope: 0.3, thick: 0.9 * xf.s });
  sline(g, xf.P(F(-2.9, 2.3)), xf.P(F(6.1, 2.3)), Math.max(1, xf.s * 0.4), SLIP[2]);
}

// ---------------------------------------------------------------- the standing rig (angles; hero-local, facing +x)
const torsoT = (r) => (u) => add(rot(u, r.lean), [r.hx, r.hy]);
const SH = { n: [0.9, -25.6], f: [-0.9, -25.6] }, HJ = { n: [1.0, -0.6], f: [-1.0, -0.6] }, NECK = [1.2, -33.6];
function ik(S, T, l1, l2, bend) {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.min(l1 + l2 - 0.02, Math.max(0.1, Math.hypot(dx, dy))), a = Math.atan2(dy, dx);
  const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), off = Math.acos(Math.max(-1, Math.min(1, c))), an = a + bend * off;
  return [S[0] + Math.cos(an) * l1, S[1] + Math.sin(an) * l1];
}
function legIK(Hj, A, fa) { const Kn = ik(Hj, A, D.thigh, D.shin, -1), t = ang(sub(Kn, Hj)), sa = ang(sub(A, Kn)); return [t, wrap(t - sa), wrap(fa - sa - PI / 2)]; }
function armIK(S, W, bend = 1) { const E = ik(S, W, D.upper, D.fore, bend), u = ang(sub(E, S)); return [u, wrap(ang(sub(W, E)) - u)]; }
const shoulder = (r, side) => add(torsoT(r)(SH[side]), [0, -(r.shrug ?? 0)]);
function fkArm(r, side) { const S = shoulder(r, side), [u, e] = side === "n" ? r.aN : r.aF, E = add(S, sc(dir(u), D.upper)), W = add(E, sc(dir(u + e), D.fore)); return { S, E, W }; }

/** Wrist targets of the arm modes (hero-local), given the rig so far (torso, neck, head angle). */
function modeTarget(r, side, mode, st) {
  const T = torsoT(r), S = shoulder(r, side), N = T(NECK), ha = r.lean + r.headA;
  switch (mode) {
    case "phoneLow": return side === "n" ? T([11.2, -13.5]) : T([9.2, -12.5]);
    case "selfie": { const a = st.selfieA ?? 2.36; return add(S, sc(dir(a), 27.2)); }
    case "chin": return add(add(rot([7.6, -0.2], ha), N), [-1.4, 3.6]);
    case "jaw": return add(add(rot([3.6, -1.6], ha), N), [0.4, 4.6]);
    case "wave": { const a = PI - 1.12 + 0.2 * Math.sin(2 * PI * (st.waveP ?? 0)); return add(S, sc(dir(a), 21.5)); }
    case "chest": return side === "n" ? T([9.8, -18.5]) : T([7.8, -17.5]);
    case "fist": return side === "n" ? T([13.2, -13.5]) : T([11, -12.5]);   // a little "yay" fist at the hip
    default: return null;
  }
}

function standRig(st) {
  const p = st.p ?? 0, sw = Math.sin(2 * PI * p), slump = st.slump ?? 0, squat = st.squat ?? 0, lift = st.lift ?? 0;
  const r = {
    hx: 0.5 * sw, hy: -33.9 + 0.2 * Math.cos(4 * PI * p) + 1.1 * slump + 2.6 * squat - lift,
    lean: 0.06 + 0.02 * sw + 0.1 * slump + (st.lean ?? 0) + 0.06 * squat, headA: 0.2 + 0.05 * Math.sin(2 * PI * p - 0.8) + 0.2 * slump + (st.head ?? 0), legSx: 1,
    shrug: (st.shrug ?? 0) - 0.9 * slump,
  };
  const T = torsoT(r), fl = lift * 0.82;
  r.lN = legIK(T(HJ.n), [2.6 + 0.6 * squat, -D.ank - fl], PI / 2 - 0.25 * clamp01(lift / 3)); r.lF = legIK(T(HJ.f), [-2.4 + 0.6 * squat, -D.ank - fl * 0.9], PI / 2 - 0.25 * clamp01(lift / 3));
  r.aN = [0.06 + 0.03 * sw, 0.28]; r.aF = [0.02 + 0.03 * sw, 0.3];
  for (const side of ["n", "f"]) {
    const modes = st.arms?.[side]; if (!modes || !modes.length) continue;
    const rest = fkArm(r, side).W; let tot = 0, acc = [0, 0];
    for (const [m, w] of modes) { if (w <= 0) continue; const tg = modeTarget(r, side, m, st); if (!tg) continue; acc = add(acc, sc(sub(tg, rest), w)); tot += w; }
    if (tot <= 0) continue; if (tot > 1) acc = sc(acc, 1 / tot);
    const W = add(rest, acc), a = armIK(shoulder(r, side), W, 1);
    if (side === "n") r.aN = a; else r.aF = a;
  }
  r.pom = [-0.3 * sw + (st.pomK ?? 0) * 1.2, 0.2 * Math.cos(2 * PI * p) - 0.8 * (st.pomK ?? 0)];
  return r;
}

// ---------------------------------------------------------------- body renderer
function shadowAt(g, xf, x0l, x1l, yl, k = 0.5) {
  const a = xf.P([x0l, yl]), b = xf.P([x1l, yl]), cx = (a[0] + b[0]) / 2, rx = Math.abs(b[0] - a[0]) / 2 + 2, ry = Math.max(1.5, xf.s * 1.3);
  for (let Y = Math.floor(a[1] - ry); Y <= Math.ceil(a[1] + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
    const d = ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - a[1]) / ry) ** 2; if (d < 1 && k * (1 - d * d) > bayer(X, Y)) g.px(X, Y, "#100A1C");
  }
}

function renderRig(g, G, wx, wy, f, r, st) {
  const xf = frame(G, wx, wy, f, st.dim ?? 0), P = xf.P, s = xf.s, T = torsoT(r);
  const opt = (ramp, base, thick, more = {}) => ({ ramp, base, gain: 1.4, slope: 1.0, thick: thick * s, rimLit: 0.8, rimShade: 0.8, ...more });
  const legs = {}, arms = {};
  for (const side of ["n", "f"]) {
    const [t, kb, fr] = side === "n" ? r.lN : r.lF, Hj = T(HJ[side]);
    const Kn = add(Hj, sc(dir(t), D.thigh)), sa = t - kb, A = add(Kn, sc(dir(sa), D.shin)), fa = sa + PI / 2 + fr, d = dir(fa), nrm = rot(d, PI / 2);
    const M = (p) => p;
    legs[side] = { Hj, Kn, A, M, A0: A, d, nrm };
    arms[side] = fkArm(r, side);
  }
  if (st.shadow !== false) { const xs = [legs.n.A[0], legs.f.A[0], r.hx]; shadowAt(g, xf, Math.min(...xs) - 6, Math.max(...xs) + 6, 0, 0.5 * (1 - 0.5 * clamp01((st.lift ?? 0) / 6))); }
  const drawArm = (side, dark) => {
    const { S, E, W } = arms[side], cuff = L2(E, W, 0.86);
    const bone = [S, E, cuff], wd = [7.2, 6.4, 6.7];
    part(g, xf, smooth(limb(bone, wd).map(P), new Set(), SEG(xf)), { ...opt(PJ, 4.5 + dark, 3.2), pattern: stripes(bone.map(P), wd.map((w) => (w / 2) * s), 4.2 * s, 0.3, 1.25) });
    const dv = sub(W, E), dn = Math.hypot(dv[0], dv[1]) || 1, nv = [-dv[1] / dn, dv[0] / dn], c0 = L2(E, W, 0.8);
    shape(g, xf, [add(c0, sc(nv, 3.5)), add(cuff, sc(nv, 3.6)), add(cuff, sc(nv, -3.6)), add(c0, sc(nv, -3.5))], { ...opt(PIPE, 4.4 + dark, 1.0), slope: 0.3 }, new Set([0, 1, 2, 3]));
  };
  const drawLeg = (side, dark) => {
    const { Hj, Kn, M, A0, d, nrm } = legs[side];
    const cuffP = add(A0, sc(nrm, -0.6)), bone = [Hj, Kn, cuffP], wd = [11.2, 9.4, 9.8];
    slipperM(g, xf, A0, d, nrm, M, dark);
    part(g, xf, smooth(limb(bone, wd).map(P), new Set(), SEG(xf)), { ...opt(PJ, 4.4 + dark, 4.0), pattern: stripes(bone.map(P), wd.map((w) => (w / 2) * s), 4.2 * s, 0.3, 1.25) });
    const dv = sub(cuffP, Kn), dn = Math.hypot(dv[0], dv[1]) || 1, nv = [-dv[1] / dn, dv[0] / dn], c0 = L2(Kn, cuffP, 0.9);
    shape(g, xf, [add(c0, sc(nv, 4.75)), add(cuffP, sc(nv, 4.95)), add(cuffP, sc(nv, -4.95)), add(c0, sc(nv, -4.75))], { ...opt(PIPE, 4.3 + dark, 1.0), slope: 0.3 }, new Set([0, 1, 2, 3]));
  };
  const openF = clamp01(st.openF ?? 1);
  drawArm("f", -1.0);
  { const gF = arms.f.W; if (openF >= 1) hand(g, xf, gF, arms.f.E, "open"); else if (openF <= 0) hand(g, xf, gF, arms.f.E, "fist"); else { hand(gate(g, openF, 1), xf, gF, arms.f.E, "fist"); hand(gate(g, 0, openF), xf, gF, arms.f.E, "open"); } }
  drawLeg("f", -0.9);
  drawLeg("n", 0);
  shape(g, xf, ellPts([0.0, 0.6], 8.4, 5.8, 18).map(T), opt(PJ, 4.2, 4.0));
  const SHIRT = [[-4.4, -33.2], [-7.9, -29.8], [-9.1, -22.6], [-9.5, -13.0], [-9.5, -4.0], [-9.4, 2.6], [9.5, 2.6], [10.0, -4.5], [9.7, -13.5], [8.8, -21.6], [6.9, -28.4], [3.4, -33.4]].map(T);
  const spine = [T([0, 3]), T([0, -33])], sw = 9.7 * s;
  part(g, xf, smooth(SHIRT.map(P), new Set([5, 6]), SEG(xf)), { ...opt(PJ, 4.6, 8), pattern: stripes(spine.map(P), [sw, sw], 4.2 * s, 0.3, 1.25) });
  shape(g, xf, [[-6.0, -33.0], [-4.8, -35.3], [2.4, -35.6], [3.8, -33.4], [-1.0, -32.4]].map(T), opt(PIPE, 4.0, 1.2));
  shape(g, xf, [[2.6, -34.4], [7.8, -27.8], [6.8, -26.4], [5.0, -27.0], [1.0, -31.6]].map(T), opt(PIPE, 4.6, 1.2), new Set([1]));
  for (const y of [-21.5, -14.5, -7.5, -0.5]) { const ex = y < -20 ? 7.3 : y < -12 ? 8.1 : 8.4; const [X, Y] = P(T([ex, y])), rr = Math.max(0.5, s * 0.55); if (rr < 1) g.px(R(X), R(Y), "#FDFEED"); else { g.disc(R(X), R(Y), R(rr), PIPE[4]); g.px(R(X - rr * 0.3), R(Y - rr * 0.3), "#FDFEED"); } }
  const N = T(NECK), ha = r.lean + r.headA;
  const hd = drawHead(g, xf, N, ha, { faceA: st.faceA ?? "neutral", faceB: st.faceB, faceK: st.faceK, blink: st.blink, pom: r.pom, look: st.look, open: st.open, hatLift: st.hatLift });
  // near side in front of everything: the held prop (under the fingers), the sleeve, the hand
  const handN = arms.n.W, dvN = dir(ang(sub(handN, arms.n.E))), gripN = add(handN, sc(dvN, 2.0));
  const out = {};
  if (st.prop) { const gp = P(gripN), fa = Math.atan2(gp[1] - P(handN)[1], gp[0] - P(handN)[0]); st.prop(g, gp[0], gp[1], s, fa); }
  drawArm("n", 0);
  const open = clamp01(st.openN ?? 1);
  let hn;
  if (open >= 1) hn = hand(g, xf, handN, arms.n.E, "open");
  else if (open <= 0) hn = hand(g, xf, handN, arms.n.E, "fist", gripN);
  else { const a = hand(gate(g, open, 1), xf, handN, arms.n.E, "fist", gripN), b = hand(gate(g, 0, open), xf, handN, arms.n.E, "open"); hn = L2(a, b, open); }
  return {
    head: hd.center, hatTop: hd.top, mouth: hd.mouth, eye: hd.eye, nose: hd.nose, chin: hd.chin, ear: hd.ear, headBack: hd.back,
    hand: P(hn), grip: P(gripN), wrist: P(handN), shoulder: P(arms.n.S),
    hip: P([r.hx, r.hy]), bbox: xf.bb.map(R), ...out,
  };
}

/**
 * Draw YOU through g (only g.px / g.line / g.disc are used; nothing is read back). G = { z, X(wx), Y(wy) }.
 * (wx, wy) = the floor point between the feet. st = { f (facing scale: +1 right, −1 left, |f| < 1 squashed), p (sway),
 *   slump, squat, lift (hop, hero units), lean, head (added head angle), shrug, pomK, arms: { n: [[mode, w], …], f: […] }
 *   (modes phoneLow · selfie (selfieA) · chin · jaw · wave (waveP) · chest · fist), openN / openF (1 open hand → 0 fist),
 *   faceA, faceB, faceK, open (talk mouth), blink, look [dx, dy], light [lx, ly] (screen direction the light comes from),
 *   prop(g, gx, gy, s, ang) (drawn at the near fist before the fingers), shadow (false: none), dim (0..1) }.
 */
export function drawYou(g, G, wx, wy, st = {}) {
  const prev = LIGHT; if (st.light) LIGHT = st.light;
  const f = st.f ?? 1, r = standRig(st);
  try { return renderRig(g, G, wx, wy, f, r, st); } finally { LIGHT = prev; }
}
