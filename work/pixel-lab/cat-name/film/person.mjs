// «Why your cat sleeps all day and goes crazy at 3 a.m.» — the recurring human hero at home at night.
// Same face, skin, brown hair and purple bobble hat as touch/film/hero.mjs (the hat is his night cap here), in soft
// light-blue striped pyjamas with navy piping and fluffy yellow slippers (they echo his yellow mittens).
// Side view. Built in "hero units" (the touch film's 98-unit body, feet on y = 0, up negative, +x = the way he faces)
// and scaled by K = 250 / 98 into world units, so he is ≈ 250 world units tall to the top of the bobble.
// Every part goes through G (ground(cam)) and the volume-shading engine, so he stays crisp at every zoom.
// Pure functions: the drawing depends only on the arguments. Every pose is continuous in its parameters.
import { mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth } from "./shade.mjs";
import { LAYOUT, gate, clamp01, lerp } from "./layout.mjs";

export const PERSON_K = 250 / 98;          // world units per hero unit
export const STRIDE = 60;                  // world units travelled per walk cycle (p 0 → 1 = two steps)
export const TRIP_P = 0.55;                // walk phase that trip k = 0 reproduces exactly (near = back foot, late stance)
const K = PERSON_K, R = Math.round, PI = Math.PI;
const sm = (x, a, b) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const add = (p, q) => [p[0] + q[0], p[1] + q[1]], sub = (p, q) => [p[0] - q[0], p[1] - q[1]], sc = (p, s) => [p[0] * s, p[1] * s];
const rot = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const L2 = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
const dir = (a) => [Math.sin(a), Math.cos(a)];            // limb angle: 0 = straight down, +π/2 = forward, ±π = up
const ang = (v) => Math.atan2(v[0], v[1]);
const wrap = (a) => a - 2 * PI * Math.round(a / (2 * PI));
const frac = (x) => x - Math.floor(x);

// ---------------------------------------------------------------- palettes (8 steps, dark → light)
export const SKIN = ["#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC"];
export const HAT = ["#1A1030", "#2A1F40", "#3B2C5C", "#523D82", "#6E4FB0", "#8D59DA", "#B08AE8", "#E0CDF8"];
const HAIR = ["#120A06", "#1E120A", "#2E1C10", "#3E2818", "#523620", "#6A4628", "#806040", "#9A7A58"];
export const PJ = ["#141A3E", "#232F66", "#37498F", "#5069B6", "#7090D6", "#94B2EC", "#BCD2F8", "#E4EEFF"];
const PIPE = ["#0C0A18", "#181430", "#22204A", "#2E2E66", "#3E4284", "#5258A0", "#6A74BC", "#8A94D4"];
export const SLIP = ["#3A2A08", "#6A4A10", "#A07418", "#C99A2A", "#F4CA50", "#FAE375", "#FDF0A8", "#FFF8D8"];
const POM = ["#3A3254", "#5A5276", "#7A7298", "#9C94B8", "#BEB6D6", "#D8D2EA", "#EEEAF8", "#FFFFFF"];
export const BLANKET = ["#22102A", "#3E1C46", "#5E2C62", "#80427E", "#A05E98", "#BE80B2", "#D8A8CC", "#F0D4E6"];
const SHEET = ["#2A2436", "#4E465E", "#766E88", "#9E96B0", "#C2BCD2", "#DCD8E8", "#EEEBF6", "#FFFFFF"];
const skinAt = (xf, i) => SKIN[Math.max(1, Math.min(7, R(i - xf.dim)))];
const INK = "#1E0E0C", BROW = "#3A2414", WHITE = "#FDF6EE", IRIS = ["#3A1608", "#6A3216", "#94502A", "#B8743E"], BLUSH = "#E8807A";
const LIGHT = [-0.3, -0.95], GLASS_UP = 2.2;            // glass centre sits GLASS_UP hero units above the fist
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
/** Local polygon → screen, Catmull-Rom smoothed, shaded. */
function shape(g, xf, pts, o, sharp = new Set()) { part(g, xf, smooth(pts.map(xf.P), sharp, SEG(xf)), o); }
/** Tube polygon along a polyline with per-point widths (local units). */
function limb(pts, widths) {
  const Lt = [], Rt = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n, w = widths[i] / 2;
    Lt.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); Rt.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return [...Lt, ...Rt.reverse()];
}
const ellPts = (c, rx, ry, n = 18, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + (2 * PI * i) / n; return [c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry]; });
/** Stripes running along a tube (screen-space bone polyline, half-widths in px), denser toward the edges like a cylinder. */
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
/** Per-pixel painter in a local frame (fwd: local → hero-local); fn(u, v, X, Y) returns a colour or null. */
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
/** Screen-space thick line (≥ 1 px) between two screen points. */
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

/** Expression table: lids (0 open → 1 closed), slant, eye scale, brows (two ends + arch), mouth kind. */
const FACES = {
  sleepy: { lid: 0.56, slant: 0.0, low: 0.1, scale: 1, brow: [[3.9, -11.7], [7.1, -12.0], 0.15], mouth: "flat", blush: 0.8 },
  surprised: { lid: 0, slant: 0, low: 0, scale: 1.3, pupil: 0.5, brow: [[3.7, -12.9], [7.4, -13.3], 0.75], mouth: "o", hat: 1.4, blush: 0.6 },
  annoyed: { lid: 0.42, slant: 0.32, low: 0.12, scale: 1, brow: [[3.8, -12.9], [7.3, -11.4], -0.05], mouth: "frown", blush: 1, vein: 1 },
  happy: { lid: 0.04, slant: 0, low: 0.2, scale: 1.12, center: 1, brow: [[3.9, -12.1], [7.1, -12.3], 0.45], mouth: "smile", blush: 1 },
  asleep: { closed: true, brow: [[3.9, -11.5], [7.1, -11.6], 0.1], mouth: "sleep", blush: 0.8 },
};

function drawHead(g, xf, N, ha, o) {
  const fwd = (u) => add(rot(u, ha), N), back = (l) => rot(sub(l, N), -ha), P = (u) => xf.P(fwd(u)), pp = 1 / xf.s;
  const F = FACES[o.face] ?? FACES.sleepy, yawn = clamp01(o.yawn ?? 0), blink = clamp01(o.blink ?? 0);
  const hatLift = (F.hat ?? 0) + (o.hatLift ?? 0);
  // hair at the back of the head, then the head itself (the jaw drops when he yawns)
  const jawA = yawn * 0.3, piv = [-1.0, -7.4];
  const head = HEAD.map((p, i) => (JAW.has(i) ? add(rot(sub(p, piv), jawA * (i === 14 ? 0.4 : 1)), piv) : p));
  const sharpN = new Set([8]);
  shape(g, xf, head.map(fwd), { ramp: SKIN, base: 4.4, gain: 1.4, slope: 1.0, thick: 5 * xf.s, rimLit: 0.6 }, sharpN);
  shape(g, xf, HAIR_BACK.map(fwd), { ramp: HAIR, base: 3.4, gain: 1.4, thick: 2.2 * xf.s, slope: 0.8, rimLit: 0.9 });
  shape(g, xf, HAIR_TUFT.map(fwd), { ramp: HAIR, base: 3.6, gain: 1.0, thick: 1.0 * xf.s, slope: 0.5, rimLit: 0.9 }, new Set([1]));
  // ear
  shape(g, xf, ellPts([-1.4, -8.0], 1.75, 2.35, 14).map(fwd), { ramp: SKIN, base: 3.9, gain: 1.0, thick: 1.4 * xf.s, slope: 0.6 });
  paint(g, xf, fwd, back, [-2.6, -9.8, -0.2, -6.2], (u, v) => (((u + 1.25) / 0.75) ** 2 + ((v + 7.9) / 1.3) ** 2 < 1 ? skinAt(xf, 3) : null));
  // cheek blush (dithered)
  const bl = F.blush ?? 0.8;
  paint(g, xf, fwd, back, [2.4, -7.4, 6.8, -4.2], (u, v, X, Y) => { const dd = ((u - 4.6) / 2.0) ** 2 + ((v - 5.8 + 11.6) / 1.15) ** 2; return dd < 1 && (1 - dd) * 1.6 * bl > bayer(X, Y) && ((X + Y) & 1) === 0 ? (o.face === "annoyed" ? "#E86060" : BLUSH) : null; });
  // eye
  drawEye(g, xf, fwd, back, pp, F, yawn, blink, o);
  // brows
  { const [b0, b1, arch] = F.brow, lift = yawn * 0.5, mid = [(b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2 - arch - lift], pts = bezPts([b0[0], b0[1] - lift], mid, [b1[0], b1[1] - lift], 8), w = Math.max(0.42, pp * 0.75);
    paint(g, xf, fwd, back, [Math.min(b0[0], b1[0]) - 1, Math.min(b0[1], b1[1], mid[1]) - 1.5, Math.max(b0[0], b1[0]) + 1, Math.max(b0[1], b1[1]) + 1], (u, v) => {
      const dd = polyD(u, v, pts), t = clamp01((u - b0[0]) / (b1[0] - b0[0])), ww = w * (1.15 - 0.35 * Math.abs(t - 0.45));
      return dd <= ww ? BROW : null; }); }
  // mouth
  drawMouth(g, xf, fwd, back, pp, F, yawn, o);
  // the night cap: crown, ribbed cuff, bobble (lags behind the head's motion)
  const hl = (u) => fwd([u[0] + hatLift * 0.25, u[1] - hatLift]);
  shape(g, xf, CROWN.map(hl), { ramp: HAT, base: 3.6, gain: 1.4, slope: 1.0, thick: 4 * xf.s });
  shape(g, xf, CUFF.map(hl), { ramp: HAT, base: 4.4, gain: 0.9, slope: 0.6, thick: 1.6 * xf.s }, new Set([0, 1, 2, 3]));
  for (let k = 0; k < 11; k++) { const x = -9.6 + k * 1.95, a = P([x + hatLift * 0.25, cuffY(x, false) - 0.55 - hatLift]), b = P([x + hatLift * 0.25, cuffY(x, true) + 0.6 - hatLift]); sline(g, a, b, Math.max(1, xf.s * 0.32), HAT[3]); }
  if (xf.s > 4) for (let k = 0; k < 5; k++) { const x = -7 + k * 3.6, y = lerp(cuffY(x, true), -22.5, 0.45) - (k % 2) * 1.4, a = P([x + hatLift * 0.25, y - hatLift]); sline(g, a, [a[0] + xf.s * 0.6, a[1] + xf.s * 0.4], 1, HAT[3]); }
  const pom = o.pom ?? [0, 0], pc = [POMC[0] + pom[0] + hatLift * 0.25, POMC[1] + pom[1] - hatLift];
  const fuzz = Array.from({ length: 30 }, (_, i) => { const a = (2 * PI * i) / 30, r = 3.7 + (i % 2 ? 0.14 : -0.08) + 0.1 * Math.sin(i * 2.3); return add(pc, [Math.cos(a) * r, Math.sin(a) * r]); });
  shape(g, xf, fuzz.map(fwd), { ramp: POM, base: 4.0, gain: 1.6, slope: 0.9, thick: 2.6 * xf.s, rimLit: 1.0 });
  if (xf.s > 2) for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 1.2 + (i % 3) * 0.7, [X, Y] = P(add(pc, [Math.cos(a) * r, Math.sin(a) * r])); g.px(R(X), R(Y), POM[3]); }
  // anger vein (comic) when annoyed
  if (F.vein && o.vein) {
    const c = [11.6, -13.6], s2 = 1.2;
    paint(g, xf, fwd, back, [c[0] - 2, c[1] - 2, c[0] + 2, c[1] + 2], (u, v) => {
      const a = u - c[0], b = v - c[1], w = Math.max(0.28, pp * 0.6);
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const p0 = [sx * 0.35, sy * 0.35], p1 = [sx * s2, sy * 0.35], p2 = [sx * 0.35, sy * s2]; if (segD(a, b, p0, p1) < w || segD(a, b, p0, p2) < w) return "#E03056"; }
      return null; });
  }
  const hc = P([1.5, -9.5]);
  return { center: hc, mouth: P([9.2, -4.2]), top: P(add(pc, [0, -3.6])) };
}

function drawEye(g, xf, fwd, back, pp, F, yawn, blink, o) {
  const [ex, ey] = EYE;
  if (F.closed && yawn < 0.01) {      // asleep: a soft downward arc with a lash at the outer end
    const pts = bezPts([ex - 1.45, ey - 0.1], [ex, ey + 1.5], [ex + 1.35, ey - 0.2], 10), w = Math.max(0.3, pp * 0.65);
    paint(g, xf, fwd, back, [ex - 2.6, ey - 1.6, ex + 2, ey + 1.6], (u, v) => (polyD(u, v, pts) <= w || segD(u, v, [ex - 1.4, ey - 0.05], [ex - 2.2, ey + 0.55]) <= w * 0.9 ? INK : null));
    return;
  }
  const scl = (F.scale ?? 1) * lerp(1, 0.92, yawn), rx = 1.3 * scl, ry = 1.65 * scl, lid = Math.max(F.lid ?? 0, blink, yawn), slant = F.slant ?? 0, low = F.low ?? 0;
  const ir = rx * (F.pupil ? 0.62 : F.center ? 0.84 : 0.78), I = [ex + rx * (F.center ? 0.12 : 0.3) + (o.look?.[0] ?? 0) * rx * 0.2, ey + ry * 0.1 + (o.look?.[1] ?? 0) * ry * 0.15], pr = ir * (F.pupil ?? 0.55), hr = Math.max(pp * 0.55, ir * 0.36);
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
  // a lash flick at the outer corner
  if (lid < 0.95) { const y = ey - ry + 2 * ry * lid + slant * (-rx), w = Math.max(0.28, pp * 0.6); paint(g, xf, fwd, back, [ex - rx - 1.4, y - 1, ex - rx + 0.6, y + 1], (u, v) => (segD(u, v, [ex - rx * 0.85, y + 0.25], [ex - rx - 0.75, y - 0.35]) <= w ? INK : null)); }
}

function drawMouth(g, xf, fwd, back, pp, F, yawn, o) {
  const w = Math.max(0.3, pp * 0.7), box = [5.2, -7.2, 11.2, 0.5];
  if (yawn > 0.04) {                  // a big yawn: tall dark oval with the tongue, as the jaw drops
    const c = [8.2, -3.3 + 1.0 * yawn], rx = 0.7 + 1.1 * yawn, ry = 0.6 + 1.9 * yawn;
    paint(g, xf, fwd, back, box, (u, v) => { const a = (u - c[0]) / rx, b = (v - c[1]) / ry, d = a * a + b * b; if (d > 1) return null; const ai = (u - c[0]) / Math.max(0.1, rx - pp), bi = (v - c[1]) / Math.max(0.1, ry - pp); if (ai * ai + bi * bi > 1) return INK; return b > 0.35 ? "#E06A80" : "#4A1420"; });
    return;
  }
  const k = F.mouth;
  if (k === "o") {
    const c = [8.75, -3.9], rx = 1.05, ry = 1.4;
    paint(g, xf, fwd, back, box, (u, v) => { const a = (u - c[0]) / rx, b = (v - c[1]) / ry; if (a * a + b * b > 1) return null; const ai = (u - c[0]) / Math.max(0.1, rx - pp), bi = (v - c[1]) / Math.max(0.1, ry - pp); return ai * ai + bi * bi > 1 ? INK : b > 0.3 ? "#E06A80" : "#4A1420"; });
  } else if (k === "smile") {
    const top = (u) => -4.75 - 0.75 * clamp01((9.4 - u) / 2.8) ** 1.6, bot = (u) => top(u) + 1.55 * clamp01((u - 6.7) / 2.7) ** 0.8;
    paint(g, xf, fwd, back, box, (u, v) => {
      if (u < 6.3 || u > 9.75) return null;
      const t = top(u), bb = bot(u);
      if (v >= t - w * 0.5 && v <= bb + w * 0.6) { if (v < t + w * 0.6 || v > bb - w * 0.5 || u < 6.3 + w * 1.2) return INK; return v > (t + bb) / 2 + 0.15 ? "#E06A80" : "#4A1420"; }
      return null; });
  } else if (k === "frown") {
    const pts = bezPts([9.55, -4.35], [8.2, -4.75], [6.9, -3.75], 8);
    paint(g, xf, fwd, back, box, (u, v) => (polyD(u, v, pts) <= w ? INK : null));
  } else if (k === "sleep") {
    const c = [8.95, -3.95], rx = 0.55, ry = 0.62 + 0.12 * (o.breathK ?? 0);
    paint(g, xf, fwd, back, box, (u, v) => { const a = (u - c[0]) / Math.max(rx, pp * 0.9), b = (v - c[1]) / Math.max(ry, pp * 0.9); return a * a + b * b <= 1 ? "#4A1420" : null; });
  } else {                            // flat, a little slack
    const pts = bezPts([9.5, -4.2], [8.3, -3.85], [7.3, -4.05], 8);
    paint(g, xf, fwd, back, box, (u, v) => (polyD(u, v, pts) <= w ? INK : null));
  }
}

// ---------------------------------------------------------------- hands, slippers, glass, wand
function hand(g, xf, W, from, kind = "open", grip = null, dark = 0) {
  // W = wrist (local), from = elbow (local); the hand extends along the forearm
  const a = ang(sub(W, from)), dvec = dir(a), n = [dvec[1], -dvec[0]];     // n: the "thumb" side (+90° from the forearm)
  const L = (u, v) => add(W, add(sc(dvec, u), sc(n, v)));
  if (kind === "fist") {
    const c = grip ?? L(2.2, 0);
    shape(g, xf, [add(c, [-1.9, -2.2]), add(c, [1.4, -2.4]), add(c, [2.2, -0.8]), add(c, [2.1, 1.6]), add(c, [0.6, 2.4]), add(c, [-1.9, 2.0])], { ramp: SKIN, base: 4.5 + dark, gain: 1.0, slope: 0.6, thick: 1.4 * xf.s, rimLit: 0.5 });
    if (xf.s > 1.6) for (const y of [-0.9, 0.4, 1.6]) { const p0 = xf.P(add(c, [0.0, y])), p1 = xf.P(add(c, [1.9, y - 0.05])); sline(g, p0, p1, 1, skinAt(xf, 3)); }
    shape(g, xf, [add(c, [-1.4, -2.9]), add(c, [0.6, -3.4]), add(c, [1.6, -2.4]), add(c, [0.0, -1.6])], { ramp: SKIN, base: 4.9 + dark, gain: 0.6, slope: 0.4, thick: 0.8 * xf.s });
    return c;
  }
  const s = 3.1;
  const pts = [L(-0.6, -1.7), L(1.6, -1.9), L(3.6, -1.3), L(4.6, -0.1), L(4.2, 1.2), L(2.0, 1.7), L(-0.6, 1.6)];
  shape(g, xf, pts, { ramp: SKIN, base: 4.4 + dark, gain: 1.1, slope: 0.6, thick: s * 0.5 * xf.s, rimLit: 0.5 });
  shape(g, xf, [L(0.8, -1.3), L(2.0, -2.9), L(3.0, -2.6), L(2.3, -1.1)], { ramp: SKIN, base: 4.8 + dark, gain: 0.6, slope: 0.4, thick: 0.7 * xf.s });
  return L(2.2, 0);
}
/** A glass of water. (wx, wy) = world centre of the glass, rot = radians (screen clockwise), fill 0..1 of water.
 *  Only writes pixels (never reads the canvas), so it works on actor layers: the clear glass is a sparse dither that
 *  lets the background show through; the water surface stays level whatever the tilt. */
export function drawGlass(g, G, wx, wy, rot = 0, fill = 0.7) {
  const z = G.z, X = (x) => G.X(x), Y = (y) => G.Y(y);
  const Hh = 12, Wt = 8.4, Wb = 6.8;                                    // world half-height, half-widths (≈ 24 × 17 units)
  const loc = (u, v) => { const p = rot === 0 ? [u, v] : [u * Math.cos(rot) - v * Math.sin(rot), u * Math.sin(rot) + v * Math.cos(rot)]; return [X(wx + p[0]), Y(wy + p[1])]; };
  const outer = [loc(-Wt, -Hh), loc(Wt, -Hh), loc(Wb, Hh), loc(-Wb, Hh)];
  const inner = [loc(-Wt + 1.2, -Hh + 0.4), loc(Wt - 1.2, -Hh + 0.4), loc(Wb - 1.1, Hh - 2.4), loc(-Wb + 1.1, Hh - 2.4)];
  const bbx = outer.map((p) => p[0]), bby = outer.map((p) => p[1]);
  const x0 = Math.floor(Math.min(...bbx)) - 1, x1 = Math.ceil(Math.max(...bbx)) + 1, y0 = Math.floor(Math.min(...bby)) - 1, y1 = Math.ceil(Math.max(...bby)) + 1;
  const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  // water level: horizontal screen line holding `fill` of the inner area
  const area = (lv) => { let a = 0, t = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(inner, x + 0.5, y + 0.5)) { t++; if (y + 0.5 >= lv) a++; } return t ? a / t : 0; };
  let lv = y1 + 1; fill = clamp01(fill);
  if (fill > 0.01) { let lo = y0 - 1, hi = y1 + 1; for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (area(mid) > fill) lo = mid; else hi = mid; } lv = (lo + hi) / 2; }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const cx = x + 0.5, cy = y + 0.5; if (!inside(outer, cx, cy)) continue;
    const inn = inside(inner, cx, cy), bt = bayer(x, y);
    if (!inn) {   // the glass wall and base
      const edge = !inside(outer, cx - 1, cy) || !inside(outer, cx + 1, cy) || !inside(outer, cx, cy - 1) || !inside(outer, cx, cy + 1);
      if (edge) g.px(x, y, "#DCE8FF"); else if (bt < 0.55) g.px(x, y, "#A8BEEA");
      continue;
    }
    if (cy >= lv) { const surf = cy < lv + Math.max(1, z * 1.2), deep = (cy - lv) / Math.max(1, y1 - lv); g.px(x, y, surf ? "#E8F4FF" : deep > 0.45 && bt < (deep - 0.45) * 1.6 ? "#3E74C8" : "#5590E4"); }
    else if (bt < 0.07) g.px(x, y, "#C8D8F8");
  }
  // highlights: a long glint on the left wall, a short one on the right
  const a = loc(-Wt + 2.2, -Hh + 2), b = loc(-Wb + 2.0, Hh - 4), c = loc(Wt - 2.4, -Hh + 2.2), d = loc(Wt - 2.6, -Hh + 5);
  sline(g, a, b, Math.max(1, z * 1.2), "#FFFFFF"); sline(g, c, d, Math.max(1, z * 0.9), "#F0F6FF");
  return { top: loc(0, -Hh), bottom: loc(0, Hh) };
}


// ---------------------------------------------------------------- rigs (angles; hero-local, facing +x)
// rig = { hx, hy, lean, headA, legSx, lN:[thigh, knee, foot], lF:[…], aN:[upper, elbow], aF:[…], pom:[dx,dy] }
const flat = (r) => [r.hx, r.hy, r.lean, r.headA, r.legSx ?? 1, ...r.lN, ...r.lF, ...r.aN, ...r.aF, ...(r.pom ?? [0, 0])];
const unflat = (a) => ({ hx: a[0], hy: a[1], lean: a[2], headA: a[3], legSx: a[4], lN: [a[5], a[6], a[7]], lF: [a[8], a[9], a[10]], aN: [a[11], a[12]], aF: [a[13], a[14]], pom: [a[15], a[16]] });
const torsoT = (r) => (u) => add(rot(u, r.lean), [r.hx, r.hy]);
const SH = { n: [0.9, -25.6], f: [-0.9, -25.6] }, HJ = { n: [1.0, -0.6], f: [-1.0, -0.6] }, NECK = [1.2, -33.6];

function ik(S, T, l1, l2, bend) {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.min(l1 + l2 - 0.02, Math.max(0.1, Math.hypot(dx, dy))), a = Math.atan2(dy, dx);
  const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), off = Math.acos(Math.max(-1, Math.min(1, c))), an = a + bend * off;
  return [S[0] + Math.cos(an) * l1, S[1] + Math.sin(an) * l1];
}
/** Leg angles that put the ankle at A (reachable or as close as possible), knee forward. */
function legIK(Hj, A, fa) {
  const Kn = ik(Hj, A, D.thigh, D.shin, -1), t = ang(sub(Kn, Hj)), sa = ang(sub(A, Kn));
  return [t, wrap(t - sa), wrap(fa - sa - PI / 2)];
}
/** Arm angles that put the wrist at W, elbow down/back. */
function armIK(S, W, bend = 1) { const E = ik(S, W, D.upper, D.fore, bend), u = ang(sub(E, S)); return [u, wrap(ang(sub(W, E)) - u)]; }
function fkArm(r, side) { const T = torsoT(r), S = T(SH[side]), [u, e] = side === "n" ? r.aN : r.aF, E = add(S, sc(dir(u), D.upper)), W = add(E, sc(dir(u + e), D.fore)); return { S, E, W }; }

function walkRig(st) {
  const p = st.p ?? 0, yawn = clamp01(st.yawn ?? 0), glass = clamp01(st.glass ?? 0);
  const STR = STRIDE / K, SIG = 0.62, LS = STR * SIG, HL = 0.32, HLY = 4.5 * Math.sin(HL), m = (-LS * (1 - SIG)) / SIG;
  const foot = (ph) => {
    ph = frac(ph);
    if (ph < SIG) { const s = ph / SIG, hl = HL * sm(s, 0.7, 1); return { x: LS / 2 - LS * s, y: -D.ank - 4.5 * Math.sin(hl), fa: PI / 2 - hl }; }
    const s = (ph - SIG) / (1 - SIG), s2 = s * s, s3 = s2 * s;
    const x = (2 * s3 - 3 * s2 + 1) * (-LS / 2) + (s3 - 2 * s2 + s) * m + (-2 * s3 + 3 * s2) * (LS / 2) + (s3 - s2) * m;
    return { x, y: -D.ank - 2.1 * Math.sin(PI * s) - HLY * (1 - sm(s, 0, 0.5)), fa: PI / 2 - HL * (1 - sm(s, 0, 0.45)) + 0.16 * sm(s, 0.35, 0.8) * (1 - sm(s, 0.82, 1)) };
  };
  const bob = Math.cos(4 * PI * (p - SIG / 2));
  const r = { hx: 0, hy: -33.1 - 0.45 * bob, lean: 0.075 + 0.012 * bob - 0.05 * yawn, headA: 0.17 + 0.02 * bob - 0.6 * yawn, legSx: 1 };
  const T = torsoT(r);
  for (const [side, ph] of [["n", p], ["f", p + 0.5]]) { const ft = foot(ph); r["l" + side.toUpperCase()] = legIK(T(HJ[side]), [ft.x, ft.y], ft.fa); }
  r.aF = [0.05 + 0.15 * Math.cos(2 * PI * (p - 0.12)), 0.32 + 0.07 * Math.cos(2 * PI * (p - 0.12))];
  r.aN = [0.05 + 0.15 * Math.cos(2 * PI * (p - 0.62)), 0.32 + 0.07 * Math.cos(2 * PI * (p - 0.62))];
  if (glass > 0) { const S = T(SH.n), W0 = fkArm(r, "n").W, Wg = T([12.6, -19.6 + 0.3 * bob]); r.aN = armIK(S, L2(W0, Wg, sm(glass, 0, 1)), 1); }
  r.pom = [-0.25 + 0.25 * Math.sin(4 * PI * (p - SIG / 2) - 1.3), 0.55 * Math.cos(4 * PI * (p - SIG / 2) - 1.3)];
  return r;
}
function standRig(st) {
  const p = st.p ?? 0, sw = Math.sin(2 * PI * p), yawn = clamp01(st.yawn ?? 0), glass = clamp01(st.glass ?? 0);
  const r = { hx: 0.5 * sw, hy: -33.9 + 0.2 * Math.cos(4 * PI * p), lean: 0.06 + 0.02 * sw - 0.05 * yawn, headA: 0.2 + 0.05 * Math.sin(2 * PI * p - 0.8) - 0.6 * yawn, legSx: 1 };
  const T = torsoT(r);
  r.lN = legIK(T(HJ.n), [2.6, -D.ank], PI / 2); r.lF = legIK(T(HJ.f), [-2.4, -D.ank], PI / 2);
  r.aN = [0.06 + 0.03 * sw, 0.28]; r.aF = [0.02 + 0.03 * sw, 0.3];
  if (glass > 0) { const S = T(SH.n), W0 = fkArm(r, "n").W, Wg = T([12.6, -19.6]); r.aN = armIK(S, L2(W0, Wg, sm(glass, 0, 1)), 1); }
  r.pom = [-0.3 * sw, 0.2 * Math.cos(2 * PI * p)];
  return r;
}

// key poses resolve IK targets ({ik:[x,y]} for arms/legs) against their own torso
function key(o) {
  const r = { legSx: 1, pom: [0, 0], ...o }, T = torsoT(r);
  for (const side of ["n", "f"]) {
    const a = r["a" + side.toUpperCase()]; if (a && a.ik) r["a" + side.toUpperCase()] = armIK(T(SH[side]), a.ik, a.bend ?? 1);
    const l = r["l" + side.toUpperCase()]; if (l && l.ik) r["l" + side.toUpperCase()] = legIK(T(HJ[side]), l.ik, l.fa ?? PI / 2);
  }
  return r;
}
/** Non-uniform Catmull-Rom (cardinal) through key vectors at times ts. */
function spline(keys, ts, k) {
  const n = keys.length; k = clamp01(k);
  let i = 0; while (i < n - 2 && k > ts[i + 1]) i++;
  const t0 = ts[i], t1 = ts[i + 1], s = (k - t0) / (t1 - t0), dt = t1 - t0;
  const P0 = keys[Math.max(0, i - 1)], P1 = keys[i], P2 = keys[i + 1], P3 = keys[Math.min(n - 1, i + 2)];
  const tm = ts[Math.max(0, i - 1)], tp = ts[Math.min(n - 1, i + 2)];
  const s2 = s * s, s3 = s2 * s, h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  return P1.map((_, j) => {
    const m1 = i > 0 ? ((P2[j] - P0[j]) / (t1 - tm)) * dt : 0, m2 = i + 2 < n ? ((P3[j] - P1[j]) / (tp - t0)) * dt : 0;
    return h00 * P1[j] + h10 * m1 + h01 * P2[j] + h11 * m2;
  });
}

const TRIP_T = [0, 0.2, 0.4, 0.56, 0.76, 0.87, 1];
// k = 0 is walk(TRIP_P); then: pitch forward (glass arm flung forward-up, far arm windmills back), dive, belly-flop
// with a squash and a small bounce; slippers end up in the air. Near arm windmills back to lie along his side,
// far arm comes round to land forward on the floor beyond his face.
const TRIP_KEYS = [
  key({ hx: 6, hy: -33.6, lean: 0.48, headA: -0.42, lN: [-0.6, 1.15, -0.35], lF: [0.04, 0.12, 0.0], aN: [1.72, 0.32], aF: [-2.5, -0.35], pom: [-1.6, 0.9] }),
  key({ hx: 16, hy: -32.2, lean: 1.0, headA: -0.62, lN: [-1.05, 1.4, -0.45], lF: [-0.5, 0.55, -0.5], aN: [0.55, 0.3], aF: [-1.0, -0.2], pom: [-2.4, 0.7] }),
  key({ hx: 26, hy: -26.5, lean: 1.4, headA: -0.72, lN: [-1.55, 1.15, -0.55], lF: [-1.3, 0.95, -0.55], aN: [-0.75, -0.1], aF: [0.85, 0.2], pom: [-2.7, 0.0] }),
  key({ hx: 36, hy: -9.6, lean: 1.6, headA: -0.5, lN: [-1.62, 1.3, -0.6], lF: [-1.6, 1.55, -0.6], aN: [-1.42, -0.05], aF: [1.28, 0.18], pom: [0.6, -1.2] }),
  key({ hx: 36.6, hy: -12.4, lean: 1.52, headA: -0.74, lN: [-1.62, 1.75, -0.6], lF: [-1.58, 2.05, -0.6], aN: [-1.3, -0.22], aF: [1.4, 0.3], pom: [-1.6, 0.9] }),
  key({ hx: 37, hy: -10.2, lean: 1.58, headA: -0.62, lN: [-1.55, 0.6, -0.7], lF: [-1.55, 1.05, -0.6], aN: [-1.48, -0.06], aF: [1.25, 0.2], pom: [-1.0, 0.4] }),
];
const FLOOR_T = [0, 0.14, 0.32, 0.52, 0.74, 1];
// belly → elbows up (hands come under the shoulders) → push-up → legs swing round toward the camera → sits up,
// legs stretched out, far hand propping behind, near hand rubbing the back of his head (blended in by k).
const FLOOR_KEYS = [
  null,
  key({ hx: 36.8, hy: -10.5, lean: 1.45, headA: -0.62, lN: [-1.56, 0.45, -0.8], lF: [-1.56, 0.7, -0.75], aN: [-2.4, 2.7], aF: { ik: [66, -2.6], bend: 1 }, pom: [-0.8, 0.5] }),
  key({ hx: 36.4, hy: -10.0, lean: 1.05, headA: -0.6, lN: [-1.57, 0.25, -0.9], lF: [-1.57, 0.35, -0.9], aN: { ik: [61.5, -2.6], bend: 1 }, aF: { ik: [63.5, -2.6], bend: 1 }, pom: [-0.6, 0.6] }),
  key({ hx: 34.5, hy: -9.0, lean: 0.55, headA: -0.3, legSx: 0.25, lN: [-1.2, 1.7, -0.2], lF: [-1.25, 1.8, -0.2], aN: { ik: [50, -2.6], bend: 1 }, aF: { ik: [52, -2.6], bend: 1 }, pom: [0.4, 0.2] }),
  key({ hx: 33.5, hy: -7.0, lean: 0.06, headA: -0.05, legSx: -0.6, lN: [-1.85, -1.3, 0.35], lF: [-1.9, -1.4, 0.35], aN: { ik: [44, -2.6], bend: 1 }, aF: { ik: [24.5, -2.6], bend: 1 }, pom: [0.8, 0.3] }),
  key({ hx: 33, hy: -6.6, lean: -0.13, headA: 0.14, legSx: -1, lN: [-1.62, -0.22, 0.28], lF: [-1.6, -0.3, 0.3], aN: [2.6, 1.4], aF: { ik: [22, -2.6], bend: 1 }, pom: [0.6, 0.4] }),
];

function tripRig(st) {
  const k = clamp01(st.k ?? 0), k0 = walkRig({ p: TRIP_P, glass: st.glass ?? 0 });
  return unflat(spline([flat(k0), ...TRIP_KEYS.map(flat)], TRIP_T, k));
}
function floorRig(st) {
  const k = clamp01(st.k ?? 0), keys = [TRIP_KEYS[TRIP_KEYS.length - 1], ...FLOOR_KEYS.slice(1)];
  return unflat(spline(keys.map(flat), FLOOR_T, k));
}
function sitRig(st, wx, wy, f) {
  const seat = ((st.seatY ?? -62) - wy) / K, p = st.p ?? 0, wand = clamp01(st.wand ?? 0);
  const toyL = st.toy ? [(st.toy[0] - wx) / (f * K), (st.toy[1] - wy) / K] : [40, -10];
  const r = { hx: 0, hy: seat - 4.6, lean: 0.12 + 0.02 * Math.sin(2 * PI * p), headA: 0, legSx: 1 };
  const T = torsoT(r);
  // feet planted on the floor in front of the seat (he perches on its front edge, thighs sloping down); if the seat is
  // too high for his short legs (bed edge) the feet dangle with the toes pointing down
  for (const side of ["n", "f"]) {
    const Hj = T(HJ[side]), A = [Hj[0] + (side === "n" ? 13.5 : 11.5), -D.ank], reach = D.thigh + D.shin - 0.6, dd = Math.hypot(A[0] - Hj[0], A[1] - Hj[1]);
    const dangle = clamp01((dd - reach) / 3), Aa = dd > reach ? add(Hj, sc(sub(A, Hj), reach / dd)) : A;
    r["l" + side.toUpperCase()] = legIK(Hj, Aa, PI / 2 - 0.55 * dangle);
  }
  // head looks at the toy
  const N = T(NECK), look = Math.atan2(toyL[1] - (N[1] - 8), toyL[0] - N[0]);
  r.headA = Math.max(-0.35, Math.min(0.5, look * 0.6)) - r.lean;
  // near hand: rests on the knee → holds the wand out toward the toy
  const S = T(SH.n), kn = add(T(HJ.n), sc(dir(r.lN[0]), D.thigh)), rest = add(kn, [0.5, -4.2]);
  const dv = sub(toyL, S), da = Math.max(0.55, Math.min(2.2, ang(dv))), reach = add(S, sc(dir(da), 19));
  const wig = [0, 0.6 * Math.sin(2 * PI * p)], Wt = add(L2(rest, reach, sm(wand, 0, 1)), sc(wig, wand));
  r.aN = armIK(S, Wt, 1);
  const knf = add(T(HJ.f), sc(dir(r.lF[0]), D.thigh));
  r.aF = armIK(T(SH.f), add(knf, [-2.5, -4.0]), 1);
  r.pom = [0.3 * Math.sin(2 * PI * p - 1), 0.3 * Math.cos(2 * PI * p - 1)];
  r.toyL = toyL;
  return r;
}

// ---------------------------------------------------------------- body renderer
/** Soft contact shadow as an ordered dither of one dark colour (writes only, so it also works on actor layers). */
function shadowAt(g, xf, x0l, x1l, yl, k = 0.5) {
  const a = xf.P([x0l, yl]), b = xf.P([x1l, yl]), cx = (a[0] + b[0]) / 2, rx = Math.abs(b[0] - a[0]) / 2 + 2, ry = Math.max(1.5, xf.s * 1.3);
  for (let Y = Math.floor(a[1] - ry); Y <= Math.ceil(a[1] + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
    const d = ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - a[1]) / ry) ** 2; if (d < 1 && k * (1 - d * d) > bayer(X, Y)) g.px(X, Y, "#100A1C");
  }
}

function renderRig(g, G, wx, wy, f, r, st, extra = {}) {
  const xf = frame(G, wx, wy, f, st.dim ?? 0), P = xf.P, s = xf.s, T = torsoT(r);
  const face = st.face ?? extra.face ?? "sleepy";
  const opt = (ramp, base, thick, more = {}) => ({ ramp, base, gain: 1.4, slope: 1.0, thick: thick * s, rimLit: 0.8, rimShade: 0.8, ...more });
  // joints
  const legs = {}, arms = {};
  for (const side of ["n", "f"]) {
    const [t, kb, fr] = side === "n" ? r.lN : r.lF, Hj = T(HJ[side]);
    const Kn = add(Hj, sc(dir(t), D.thigh)), sa = t - kb, A = add(Kn, sc(dir(sa), D.shin)), fa = sa + PI / 2 + fr, d = dir(fa), nrm = rot(d, PI / 2);
    const sx = r.legSx ?? 1, M = (p) => [Hj[0] + (p[0] - Hj[0]) * sx, p[1]];
    legs[side] = { Hj, Kn: M(Kn), A: M(A), M, A0: A, d, nrm, Kn0: Kn };
    arms[side] = fkArm(r, side);
  }
  // contact shadow
  if (extra.shadow !== false) {
    const xs = [legs.n.A[0], legs.f.A[0], r.hx, T([0, -30])[0]];
    if (r.lean > 0.8) xs.push(T([0, -48])[0], arms.n.W[0], arms.f.W[0]);
    shadowAt(g, xf, Math.min(...xs) - 6, Math.max(...xs) + 6, 0, 0.5);
  }
  const drawArm = (side, dark) => {
    const { S, E, W } = arms[side], cuff = L2(E, W, 0.86);
    const bone = [S, E, cuff], wd = [7.2, 6.4, 6.7];
    const poly = smooth(limb(bone, wd).map(P), new Set(), SEG(xf));
    part(g, xf, poly, { ...opt(PJ, 4.5 + dark, 3.2), pattern: stripes(bone.map(P), wd.map((w) => (w / 2) * s), 4.2 * s, 0.3, 1.25) });
    // navy cuff band
    const dv = sub(W, E), dn = Math.hypot(dv[0], dv[1]) || 1, nv = [-dv[1] / dn, dv[0] / dn], c0 = L2(E, W, 0.8);
    shape(g, xf, [add(c0, sc(nv, 3.5)), add(cuff, sc(nv, 3.6)), add(cuff, sc(nv, -3.6)), add(c0, sc(nv, -3.5))], { ...opt(PIPE, 4.4 + dark, 1.0), slope: 0.3 }, new Set([0, 1, 2, 3]));
  };
  const drawLeg = (side, dark) => {
    const { Hj, Kn, M, A0, d, nrm } = legs[side];
    const cuffP = M(add(A0, sc(nrm, -0.6))), bone = [Hj, Kn, cuffP], wd = [11.2, 9.4, 9.8];
    slipperM(g, xf, A0, d, nrm, M, dark);                 // slipper first: the trouser cuff hangs over it
    const poly = smooth(limb(bone, wd).map(P), new Set(), SEG(xf));
    part(g, xf, poly, { ...opt(PJ, 4.4 + dark, 4.0), pattern: stripes(bone.map(P), wd.map((w) => (w / 2) * s), 4.2 * s, 0.3, 1.25) });
    // piping band at the trouser cuff
    const dv = sub(cuffP, Kn), dn = Math.hypot(dv[0], dv[1]) || 1, nv = [-dv[1] / dn, dv[0] / dn], c0 = L2(Kn, cuffP, 0.9);
    shape(g, xf, [add(c0, sc(nv, 4.75)), add(cuffP, sc(nv, 4.95)), add(cuffP, sc(nv, -4.95)), add(c0, sc(nv, -4.75))], { ...opt(PIPE, 4.3 + dark, 1.0), slope: 0.3 }, new Set([0, 1, 2, 3]));
  };
  drawArm("f", -1.0);
  hand(g, xf, arms.f.W, arms.f.E, "open", null, -0.9);
  drawLeg("f", -0.9);
  drawLeg("n", 0);
  // seat of the trousers (shows when he sits or lies)
  shape(g, xf, ellPts([0.0, 0.6], 8.4, 5.8, 18).map(T), opt(PJ, 4.2, 4.0));
  // pyjama shirt: stripes along the spine, navy collar, buttons
  const SHIRT = [[-4.4, -33.2], [-7.9, -29.8], [-9.1, -22.6], [-9.5, -13.0], [-9.5, -4.0], [-9.4, 2.6], [9.5, 2.6], [10.0, -4.5], [9.7, -13.5], [8.8, -21.6], [6.9, -28.4], [3.4, -33.4]].map(T);
  const spine = [T([0, 3]), T([0, -33])], sw = 9.7 * s;
  part(g, xf, smooth(SHIRT.map(P), new Set([5, 6]), SEG(xf)), { ...opt(PJ, 4.6, 8), pattern: stripes(spine.map(P), [sw, sw], 4.2 * s, 0.3, 1.25) });
  shape(g, xf, [[-6.0, -33.0], [-4.8, -35.3], [2.4, -35.6], [3.8, -33.4], [-1.0, -32.4]].map(T), opt(PIPE, 4.0, 1.2));
  shape(g, xf, [[2.6, -34.4], [7.8, -27.8], [6.8, -26.4], [5.0, -27.0], [1.0, -31.6]].map(T), opt(PIPE, 4.6, 1.2), new Set([1]));
  for (const y of [-21.5, -14.5, -7.5, -0.5]) { const ex = y < -20 ? 7.3 : y < -12 ? 8.1 : 8.4; const [X, Y] = P(T([ex, y])), rr = Math.max(0.5, s * 0.55); if (rr < 1) g.px(R(X), R(Y), "#FDFEED"); else { g.disc(R(X), R(Y), R(rr), PIPE[4]); g.disc(R(X - rr * 0.3), R(Y - rr * 0.3), Math.max(0, R(rr * 0.6)), "#FDFEED"); } }
  // head
  const N = T(NECK), ha = r.lean + r.headA;
  const hd = drawHead(g, xf, N, ha, { face, yawn: st.yawn, blink: st.blink, pom: r.pom, look: st.look, vein: st.vein });
  // near side, in front of everything: glass (under the fingers), sleeve, wand, hand
  const handF = arms.f.W, handN = arms.n.W;
  const out = { glass: null };
  // glass held in the near hand
  const glassA = extra.glass ?? 0;
  const gripN = add(handN, sc(dir(ang(sub(handN, arms.n.E))), 2.0));
  if (glassA > 0) {
    const rotG = (extra.glassRot ?? 0) * f, up = rot([0, -GLASS_UP], rotG * f), gw = [wx + f * K * (gripN[0] + up[0]), wy + K * (gripN[1] + up[1])];
    if (glassA >= 1) drawGlass(g, G, gw[0], gw[1], rotG, st.fill ?? 0.7);
    else drawGlass(fade(g, glassA), G, gw[0], gw[1], rotG, st.fill ?? 0.7);
    out.glass = { wx: gw[0], wy: gw[1], rot: rotG, fill: st.fill ?? 0.7, x: G.X(gw[0]), y: G.Y(gw[1]) };
  }
  drawArm("n", 0);
  if (extra.wand > 0) out.wand = drawWandFull(g, G, xf, wx, wy, f, handN, arms.n.E, extra.wand, st.toy, st.p ?? 0, r);
  const open = clamp01(extra.handOpen ?? (glassA > 0 ? 1 - glassA : extra.wand > 0 ? 1 - extra.wand : 1));
  let hn;
  if (open >= 1) hn = hand(g, xf, handN, arms.n.E, "open");
  else if (open <= 0) hn = hand(g, xf, handN, arms.n.E, "fist", gripN);
  else { const a = hand(gate(g, open, 1), xf, handN, arms.n.E, "fist", gripN), b = hand(gate(g, 0, open), xf, handN, arms.n.E, "open"); hn = L2(a, b, open); }
  // anchors
  const footFront = legs.n.A[0] >= legs.f.A[0] ? legs.n : legs.f, footBack = footFront === legs.n ? legs.f : legs.n;
  return {
    head: hd.center, hatTop: hd.top, mouth: hd.mouth,
    hand: P(hn), handBack: P(add(handF, sc(dir(ang(sub(handF, arms.f.E))), 2.2))),
    footFront: P(add(footFront.A, [0, D.ank])), footBack: P(add(footBack.A, [0, D.ank])),
    hip: P([r.hx, r.hy]), bbox: xf.bb.map(R), ...out,
    world: { hand: [wx + f * K * hn[0], wy + K * hn[1]], neck: [wx + f * K * N[0], wy + K * N[1]] },
  };
}
function slipperM(g, xf, A0, d, nrm, M, dark) {
  const F = (u, v) => M(add(A0, add(sc(d, u), sc(nrm, v))));
  const pts = [F(-2.8, -1.4), F(-3.7, 0.6), F(-3.2, 2.7), F(6.2, 2.7), F(8.1, 1.4), F(7.6, -0.8), F(4.0, -1.9), F(0.8, -2.2)];
  shape(g, xf, pts, { ramp: SLIP, base: 3.9 + dark, gain: 1.3, slope: 1.0, thick: 2.2 * xf.s, rimLit: 0.7 }, new Set([2, 3]));
  shape(g, xf, [F(-3.1, -2.0), F(1.4, -2.9), F(2.4, -1.5), F(-2.6, -0.6)], { ramp: SLIP, base: 5.4 + dark, gain: 0.8, slope: 0.3, thick: 0.9 * xf.s });
  sline(g, xf.P(F(-2.9, 2.3)), xf.P(F(6.1, 2.3)), Math.max(1, xf.s * 0.4), SLIP[2]);
}

function drawWandFull(g, G, xf, wx, wy, f, Wl, El, alpha, toyW, p, r) {
  const gg = alpha < 1 ? fade(g, sm(alpha, 0.15, 0.85)) : g;
  const toy = toyW ? [(toyW[0] - wx) / (f * K), (toyW[1] - wy) / K] : r.toyL;
  const dvec = dir(ang(sub(Wl, El))), grip = add(Wl, sc(dvec, 2.2));
  const aim = add(toy, [0, -22]), base = ang(sub(aim, grip)), a = Math.max(0.7, Math.min(2.6, base)) + 0.12 * Math.sin(2 * PI * p);
  const tip = add(grip, sc(dir(a), 27)), back = add(grip, sc(dir(a), -3.5));
  sline(gg, xf.P(back), xf.P(tip), Math.max(1, xf.s * 0.7), "#4A2C18");
  if (xf.s > 1.5) sline(gg, xf.P(L2(back, tip, 0.05)), xf.P(L2(back, tip, 0.95)), 1, "#A87448");
  // string: sags under its own slack
  const dist = Math.hypot(toy[0] - tip[0], toy[1] - tip[1]), sag = 2.5 + dist * 0.18, mid = add(L2(tip, toy, 0.5), [0, sag]);
  const pts = bezPts(tip, mid, toy, 16).map(xf.P);
  for (let i = 0; i + 1 < pts.length; i++) gg.line(R(pts[i][0]), R(pts[i][1]), R(pts[i + 1][0]), R(pts[i + 1][1]), "#E0CDF8");
  // feather lure: bead + three feathers fanning away from the string
  const endA = Math.atan2(pts[pts.length - 1][1] - pts[pts.length - 3][1], pts[pts.length - 1][0] - pts[pts.length - 3][0]);
  drawLure(gg, G, toyW ?? [wx + f * K * toy[0], wy + K * toy[1]], endA, p);
  return { tip: xf.P(tip), toy: xf.P(toy) };
}
/** Feather lure at world point (wx, wy); a = screen angle the string arrives with. */
export function drawLure(g, G, w, a, p = 0) {
  const z = G.z, X = G.X(w[0]), Y = G.Y(w[1]), s = K * z * 0.5;
  const feathers = [["#F27A9A", "#FFC4D4", -0.42], ["#7FE3F0", "#D8FAFF", 0.0], ["#F4CA50", "#FFF2B8", 0.42]];
  for (const [c1, c2, off] of feathers) {
    const fa = a + off + 0.12 * Math.sin(2 * PI * p + off * 4), L = 13 * s, W = 3.0 * s;
    const ax = Math.cos(fa), ay = Math.sin(fa), nx = -ay, ny = ax;
    const x0 = Math.floor(X - L - 2), x1 = Math.ceil(X + L + 2), y0 = Math.floor(Y - L - 2), y1 = Math.ceil(Y + L + 2);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const dx = xx + 0.5 - X, dy = yy + 0.5 - Y, u = dx * ax + dy * ay, v = dx * nx + dy * ny;
      if (u < 0 || u > L) continue; const t = u / L, half = W * Math.sin(PI * Math.min(1, t * 1.15)) * (1 - 0.25 * t);
      if (Math.abs(v) > half) continue;
      const edge = Math.abs(v) > half - 1.1;
      g.px(xx, yy, Math.abs(v) < Math.max(0.5, s * 0.25) ? c2 : edge ? mix(c1, "#1A0E20", 0.45) : c1);
    }
  }
  g.disc(R(X), R(Y), Math.max(1, R(1.6 * s)), "#B8325A"); g.px(R(X - s * 0.6), R(Y - s * 0.6), "#FFD0DC");
}

// ---------------------------------------------------------------- bed pose (LAYOUT.bed)
function drawBedPose(g, G, st) {
  const b = Math.sin(2 * PI * (st.breath ?? 0)), xf = frame(G, 0, 0, 1, st.dim ?? 0), s = xf.s;
  const W = (x, y) => [x / K, y / K];                              // world → hero-local (root at the world origin)
  const bed = LAYOUT.bed, top = bed.blanketTop;
  // head on the pillow, face up, cap toward the headboard; the bobble flops onto the pillow
  const N = W(-627, -121 - 0.6 * b), ha = -PI / 2 + 0.12 + 0.01 * b;
  const hd = drawHead(g, xf, N, ha, { face: st.face ?? "asleep", pom: [-2.4, 0.6], breathK: 0.5 + 0.5 * b, blink: st.blink, yawn: st.yawn });
  // blanket: top surface rises over the body (chest, belly, knees, toes), drapes over the near side of the mattress
  const lift = (x) => 1.6 * b * sm(x, -650, -600) * (1 - sm(x, -560, -520));
  const prof = [[-636, -128], [-612, -133], [-586, -129], [-556, -121], [-526, -113], [-498, -107], [-472, -108], [-454, -105], [-442, -114], [-432, -111]].map(([x, y]) => [x, y - lift(x)]);
  const hemY = (x) => -60 + 2.4 * Math.sin(x * 0.11) + 1.4 * Math.sin(x * 0.047 + 1);
  const outline = [...prof, [-427, -102], [-425, -78], [-427, -60]];
  for (let x = -432; x >= -636; x -= 12) outline.push([x, hemY(x)]);
  outline.push([-640, -60], [-641, -100]);
  const poly = outline.map(([x, y]) => W(x, y));
  const starPat = (X, Y) => { const lc = xf.inv(X + 0.5, Y + 0.5), u = lc[0] / 7.5, v = lc[1] / 7.5, iu = Math.floor(u), iv = Math.floor(v), fu = u - iu - 0.5 - (rndH(iu, iv) - 0.5) * 0.4, fv = v - iv - 0.5 - (rndH(iv, iu + 7) - 0.5) * 0.4; if (rndH(iu * 3 + 1, iv) > 0.55) return 0; const r = Math.abs(fu) + Math.abs(fv), cross = Math.min(Math.abs(fu), Math.abs(fv)); return r < 0.16 || (cross < 0.035 && r < 0.3) ? 1.6 : 0; };
  part(g, xf, smooth(poly.map(xf.P), new Set([10, 11, 12]), SEG(xf)), { ramp: BLANKET, base: 4.3, gain: 1.5, slope: 1.3, thick: 9 * s, rimLit: 0.9, rimShade: 0.7, pattern: starPat });
  // quilting seams
  for (const x of [-604, -566, -528, -490, -456]) {
    const ty = prof.reduce((acc, [px, py], i) => (i && prof[i - 1][0] <= x && px >= x ? lerp(prof[i - 1][1], py, (x - prof[i - 1][0]) / (px - prof[i - 1][0])) : acc), top), y0 = ty + 6, y1 = hemY(x) - 4;
    for (let y = y0; y < y1; y += 5) { const a = xf.P(W(x + (y - y0) * 0.02, y)), c = xf.P(W(x + (y - y0) * 0.02, Math.min(y1, y + 2.6))); sline(g, a, c, Math.max(1, s * 0.3), BLANKET[2]); }
  }
  // near arm resting on top of the blanket
  const S = W(-626, -124 - 1.2 * b), E = W(-594, -136.5 - 1.6 * b), Wr = W(-563, -127 - 1.0 * b), cuff = L2(E, Wr, 0.86);
  const bone = [S, E, cuff], wd = [7.6, 6.7, 6.9];
  part(g, xf, smooth(limb(bone, wd).map(xf.P), new Set(), SEG(xf)), { ramp: PJ, base: 4.5, gain: 1.4, slope: 1.0, thick: 3.2 * s, rimLit: 0.8, rimShade: 0.8, pattern: stripes(bone.map(xf.P), wd.map((w) => (w / 2) * s), 4.2 * s, 0.3, 1.25) });
  { const dv = sub(Wr, E), dn = Math.hypot(dv[0], dv[1]) || 1, nv = [-dv[1] / dn, dv[0] / dn], c0 = L2(E, Wr, 0.8); shape(g, xf, [add(c0, sc(nv, 3.5)), add(cuff, sc(nv, 3.6)), add(cuff, sc(nv, -3.6)), add(c0, sc(nv, -3.5))], { ramp: PIPE, base: 4.4, gain: 1.4, slope: 0.3, thick: 1.0 * s }, new Set([0, 1, 2, 3])); }
  const hn = hand(g, xf, Wr, E, "open");
  // turned-down sheet along the head end of the blanket (covers the shoulder)
  const fold = [[-643, -126 - lift(-636)], [-626, -134.5 - lift(-626)], [-604, -134 - lift(-604)], [-598, -130 - lift(-598)], [-612, -118], [-630, -103], [-643, -96]].map(([x, y]) => W(x, y));
  part(g, xf, smooth(fold.map(xf.P), new Set([3]), SEG(xf)), { ramp: SHEET, base: 4.6, gain: 1.2, slope: 1.2, thick: 3 * s, rimLit: 0.8, rimShade: 0.7 });
  const bb = xf.bb.map(R);
  return { head: hd.center, hatTop: hd.top, mouth: hd.mouth, hand: xf.P(hn), handBack: xf.P(hn), footFront: xf.P(W(-440, -100)), footBack: xf.P(W(-452, -100)), bbox: bb, glass: null };
}
const rndH = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- public API
/**
 * Draws the hero through g (canvas, fade/gate view or actor layer; only g.px / g.line / g.disc are used, nothing is read
 * back). G = ground(cam). (wx, wy) = world floor point between his feet (trip/floor: where the feet were at trip k = 0;
 * sit: wx = his hips, wy = floor; bed: ignored, he lies in LAYOUT.bed).
 * st = { pose, facing = 1 (−1 faces left), face, dim = 0 (0..1 night tone shift), blink = 0 (0..1), look = [dx, dy] (−1..1),
 *        vein = 0 (1: red anger mark in front of the cap with face "annoyed"), ...pose params }
 *   face: "sleepy" | "surprised" | "annoyed" | "happy" | "asleep" (default per pose: walk/stand sleepy, trip surprised,
 *         floor annoyed, sit happy, bed asleep). Switch faces with drawPersonBlend.
 *   walk:  p (cycle, 1 cycle = two steps = STRIDE = 60 world units: move wx by 60 per unit of p and planted feet stay put),
 *          glass 0..1 (raises the near hand to chest height with a glass), fill 0..1 (water, default 0.7), yawn 0..1
 *   stand: p (slow sway cycle), glass, fill, yawn
 *   trip:  k 0..1 (k = 0 ≡ walk p = TRIP_P with the same glass; the near/back foot is the one the cat hits), glass, fill.
 *          The glass is drawn while k < 0.25; from k ≥ 0.25 anchors.glassRelease = { wx, wy, rot, fill } is where it left
 *          the hand (its state at k = 0.25) and the hand opens over k 0.25 → 0.36.
 *   floor: k 0..1 (k = 0 ≡ trip k = 1), rub (cycle; near hand rubs the back of the head, blended in over k 0.6 → 0.95)
 *   sit:   seatY (world y of the seat top, default −62), wand 0..1, toy [wx, wy] (world point of the feather lure), p (wiggle)
 *   bed:   breath (cycle)
 * Returns screen-pixel anchors { head, hatTop, mouth, hand, handBack, footFront, footBack, hip, bbox: [x0, y0, x1, y1],
 *   glass (held glass state or null), glassRelease (trip k ≥ 0.25), wand { tip, toy }, world { hand, neck } }.
 */
export function drawPerson(g, G, wx, wy, st = {}) {
  const pose = st.pose ?? "stand", f = (st.facing ?? 1) < 0 ? -1 : 1;
  if (pose === "bed") return drawBedPose(g, G, st);
  if (pose === "walk") return renderRig(g, G, wx, wy, f, walkRig(st), st, { face: "sleepy", glass: clamp01(st.glass ?? 0) });
  if (pose === "stand") return renderRig(g, G, wx, wy, f, standRig(st), st, { face: "sleepy", glass: clamp01(st.glass ?? 0) });
  if (pose === "trip") {
    const k = clamp01(st.k ?? 0), r = tripRig(st), held = k < 0.25 ? clamp01(st.glass ?? 0) : 0;
    const k0 = walkRig({ p: TRIP_P, glass: 1 }), fa0 = fkArm(k0, "n"), faNow = fkArm(r, "n");
    const glassRot = held ? wrap(ang(sub(faNow.W, faNow.E)) - ang(sub(fa0.W, fa0.E))) * -0.8 : 0;
    const handOpen = (st.glass ?? 0) > 0 ? (held ? 1 - held : sm(k, 0.25, 0.36) * 1 + (1 - clamp01(st.glass)) * (1 - sm(k, 0.25, 0.36))) : 1;
    const out = renderRig(g, G, wx, wy, f, r, st, { face: "surprised", glass: held, glassRot, handOpen });
    if (k >= 0.25 || !held) {   // where the glass was when it left the hand (k = 0.25): the lead launches it from here
      const rr = tripRig({ ...st, k: 0.25 }), a = fkArm(rr, "n"), dv = dir(ang(sub(a.W, a.E))), grip = add(a.W, sc(dv, 2.0));
      const rot0 = wrap(ang(sub(a.W, a.E)) - ang(sub(fa0.W, fa0.E))) * -0.8 * f;
      const up = rot([0, -GLASS_UP], rot0 * f); out.glassRelease = { wx: wx + f * K * (grip[0] + up[0]), wy: wy + K * (grip[1] + up[1]), rot: rot0, fill: st.fill ?? 0.7 };
    }
    return out;
  }
  if (pose === "floor") {
    const k = clamp01(st.k ?? 0), r = floorRig(st), w = sm(k, 0.6, 0.95);
    if (w > 0) {        // near hand to the back of the head, rubbing in small circles
      const T = torsoT(r), N = T(NECK), ha = r.lean + r.headA, ph = 2 * PI * (st.rub ?? 0);
      const tgt = add(rot([-7.4 + 0.75 * Math.cos(ph), -8.6 + 0.65 * Math.sin(ph)], ha), N);
      const S = T(SH.n), cur = fkArm(r, "n").W, via = add(rot([1.0, 3.5], ha), N), q = 1 - w, W2 = add(add(sc(cur, q * q), sc(via, 2 * q * w)), sc(tgt, w * w));
      r.aN = armIK(S, W2, -1);
    }
    return renderRig(g, G, wx, wy, f, r, st, { face: "annoyed", rub: w });
  }
  if (pose === "sit") { const r = sitRig(st, wx, wy, f); return renderRig(g, G, wx, wy, f, r, st, { face: "happy", wand: clamp01(st.wand ?? 0), shadow: false }); }
  return renderRig(g, G, wx, wy, f, standRig(st), st, { face: "sleepy", glass: clamp01(st.glass ?? 0) });
}

/** Pixel crossfade between two states: B through gate(g, 0, k), A through gate(g, k, 1). Anchors are interpolated. */
export function drawPersonBlend(g, G, wx, wy, stA, stB, k) {
  k = clamp01(k);
  if (k <= 0) return drawPerson(g, G, wx, wy, stA);
  if (k >= 1) return drawPerson(g, G, wx, wy, stB);
  const b = drawPerson(gate(g, 0, k), G, wx, wy, stB), a = drawPerson(gate(g, k, 1), G, wx, wy, stA);
  const mixA = (p, q) => (Array.isArray(p) && Array.isArray(q) ? p.map((v, i) => (typeof v === "number" && typeof q[i] === "number" ? lerp(v, q[i], k) : v)) : k < 0.5 ? p : q);
  const out = {};
  for (const key2 of new Set([...Object.keys(a), ...Object.keys(b)])) out[key2] = key2 === "bbox" ? [Math.min(a.bbox[0], b.bbox[0]), Math.min(a.bbox[1], b.bbox[1]), Math.max(a.bbox[2], b.bbox[2]), Math.max(a.bbox[3], b.bbox[3])] : mixA(a[key2], b[key2]);
  return out;
}
