// «The last person alive» — the people of the 3rd-person shots. Frozen adaptation of aura-stairs/film/guy.mjs (which
// adapts cat-zoomies/film/person.mjs): the same rig, volume shading, face and eyes.
//  · HIM: the friend's channel hero from «Aura stairs» (spiky dark hair, charcoal hoodie, joggers, white sneakers) with
//    a brown backpack and a rusty crowbar; poses: walk, stand, startle → fall on his back → sit on the ground, rub head.
//  · HER: long wavy auburn hair, olive parka with a cream fur hood rim, dark-red scarf, jeans, brown boots; sits on a
//    log with her hands to the fire; smiles, laughs, goes quiet.
//  · THE MOUSE: a small field mouse (2× life size against them — an illustration).
// Side view, hero units (feet on y = 0, up negative, +x = the way they face) × K (layout.mjs) → world units.
import { mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth } from "./shade.mjs";
import { gate, clamp01, lerp, K } from "./layout.mjs";

const R = Math.round, PI = Math.PI;
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
const HAIR = ["#08060C", "#110C16", "#1C1420", "#2A1E2C", "#3A2A3A", "#4E3A4C", "#665064", "#82697E"];
const GOLD = ["#3A2206", "#6A4208", "#A06A10", "#D29A1C", "#F4CA50", "#FAE375", "#FDF0A8", "#FFFBE0"];
export const HOOD = ["#0A0910", "#141220", "#1F1C2E", "#2B273E", "#393350", "#494266", "#5D5682", "#77709E"];
const PANTS = ["#09090E", "#13131C", "#1D1D2A", "#282838", "#35354A", "#46465E", "#5A5A76", "#727292"];
const SNEAK = ["#2E2E3C", "#5A5A70", "#8A8AA2", "#B6B6CA", "#D8D8E6", "#ECECF4", "#F8F8FC", "#FFFFFF"];
const SOLE = ["#3A0A16", "#6A1024", "#A01A34", "#D02844", "#E03056", "#F0607A", "#F890A2", "#FCC0CA"];
const HAIR_W = ["#140806", "#1E0C08", "#3A160E", "#5A2416", "#7A3A22", "#9A5230", "#B86E44", "#D08E60"];
const PARKA = ["#12150A", "#1A1E0E", "#2C331A", "#424C26", "#5E6B3A", "#7A8A4E", "#9AAA6A", "#BCC88E"];
const FUR = ["#4A4030", "#6E604A", "#968866", "#BCAE8A", "#D8CCAA", "#ECE2C8", "#F6F0E0", "#FFFFFF"];
const SCARF = ["#2A0A0C", "#4A1216", "#6A1C22", "#8A2A2E", "#AA3C3C", "#C65650", "#DA7A6A", "#EAA090"];
const JEANS = ["#0C1220", "#151E34", "#1F2C4A", "#2B3C60", "#3A4E78", "#4E6492", "#687EAC", "#8A9CC4"];
const BOOT = ["#1A0E08", "#2E1A0E", "#4A2C16", "#6A4220", "#8A5A2E", "#A87440", "#C49058", "#DCB07A"];
const PACK = ["#1C1008", "#2E1C0E", "#462C16", "#62401E", "#7E5628", "#9A6E36", "#B68A4C", "#D0A86A"];
const MOUSE = ["#1A1410", "#2E241C", "#46382C", "#5E4C3E", "#6E5A4E", "#8A7464", "#A8927E", "#C8B4A0"];
const skinAt = (xf, i) => SKIN[Math.max(1, Math.min(7, R(i - xf.dim)))];
const INK = "#1E0E0C", BROW = "#1C1420", WHITE = "#FDF6EE", IRIS = ["#3A1608", "#6A3216", "#94502A", "#B8743E"], BLUSH = "#E8807A";
const LIGHT = [-0.3, -0.95];
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
/** The hair cap (head-local). Indices 2, 4, 6, 8, 10 are spike tips, 12 the fringe tip, 15 the sideburn. */
function hairCap(sp, wob) {
  const w = (k) => 0.6 * Math.sin(wob * 2 * PI + k * 1.7);
  return [[-7.8, -5.2], [-10.4, -9.6], [-14.2 - 1.2 * sp + w(0), -12.6 - 5.5 * sp], [-10.8, -14.6], [-13.0 - 0.6 * sp + w(1), -20.2 - 6.5 * sp], [-7.6, -18.6],
    [-6.6 + w(2) * 0.6, -25.2 - 7 * sp], [-2.6, -20.8], [1.6 + 0.6 * sp + w(3) * 0.6, -25.8 - 7 * sp], [3.4, -20.4], [9.0 + 0.6 * sp + w(4) * 0.5, -22.6 - 6 * sp], [7.8, -18.0],
    [11.8, -16.4 - 1.5 * sp], [9.0, -15.2], [9.6, -12.2], [7.0, -14.0], [5.2, -12.6], [3.8, -14.6], [0.8, -15.0], [-2.0, -13.6], [-3.2, -10.8], [-4.4, -8.6], [-6.0, -6.4]];
}
// her long wavy hair: a curtain behind the head and neck down past the shoulders, and a crown with a side-swept fringe
const LONG_BACK = [[-3.0, -12.4], [-8.8, -17.4], [-11.8, -12.4], [-12.6, -5.0], [-13.4, 1.6], [-12.4, 7.6], [-13.6, 12.4], [-10.2, 16.4], [-7.6, 13.6], [-6.4, 9.0], [-5.2, 4.6], [-4.6, -0.6], [-3.6, -6.0]];
const LONG_CROWN = [[-9.4, -6.6], [-10.9, -11.6], [-9.0, -17.2], [-4.0, -20.4], [2.2, -20.6], [7.4, -18.2], [10.4, -14.6], [10.9, -11.2], [9.6, -12.0], [8.4, -14.4], [5.6, -15.8], [2.2, -15.6], [-0.8, -14.4], [-2.6, -11.8], [-3.2, -8.6], [-4.8, -5.8], [-7.0, -4.4]];
const HAIR_TUFT = [[6.6, -13.4], [10.3, -14.9], [9.9, -13.2], [8.9, -12.7], [8.0, -13.2], [7.2, -12.8]];
const EYE = [5.75, -9.0];

/** Expression table: lids (0 open → 1 closed), slant, eye scale, brows (two ends + arch), mouth kind. */
const FACES = {
  scream: { lid: 0, slant: 0, low: 0, scale: 1.38, pupil: 0.42, brow: [[3.6, -13.4], [7.4, -13.9], 0.8], mouth: "scream", blush: 0.4 },
  laugh: { laughEyes: true, brow: [[3.8, -12.6], [7.2, -12.9], 0.6], mouth: "laugh", blush: 1.1 },
  warm: { lid: 0.2, slant: 0, low: 0.24, scale: 1.08, center: 1, brow: [[3.9, -12.0], [7.1, -12.3], 0.4], mouth: "smile", blush: 1 },
  worried: { lid: 0.04, slant: -0.12, low: 0, scale: 1.16, brow: [[3.8, -12.2], [7.3, -13.5], -0.1], mouth: "small", blush: 0.4 },
  sheepish: { lid: 0.35, slant: 0, low: 0.18, scale: 1, brow: [[3.8, -12.4], [7.2, -12.8], 0.5], mouth: "smile", blush: 1.4 },
  cool: { lid: 0.5, slant: -0.06, low: 0.12, scale: 1, brow: [[3.9, -11.4], [7.2, -11.9], 0.04], mouth: "flat", blush: 0.35 },
  sleepy: { lid: 0.56, slant: 0.0, low: 0.1, scale: 1, brow: [[3.9, -11.7], [7.1, -12.0], 0.15], mouth: "flat", blush: 0.8 },
  surprised: { lid: 0, slant: 0, low: 0, scale: 1.3, pupil: 0.5, brow: [[3.7, -12.9], [7.4, -13.3], 0.75], mouth: "o", hat: 1.4, blush: 0.6 },
  annoyed: { lid: 0.42, slant: 0.32, low: 0.12, scale: 1, brow: [[3.8, -12.9], [7.3, -11.4], -0.05], mouth: "frown", blush: 1, vein: 1 },
  happy: { lid: 0.04, slant: 0, low: 0.2, scale: 1.12, center: 1, brow: [[3.9, -12.1], [7.1, -12.3], 0.45], mouth: "smile", blush: 1 },
  asleep: { closed: true, brow: [[3.9, -11.5], [7.1, -11.6], 0.1], mouth: "sleep", blush: 0.8 },
};

function drawHead(g, xf, N, ha, o) {
  const fwd = (u) => add(rot(u, ha), N), back = (l) => rot(sub(l, N), -ha), P = (u) => xf.P(fwd(u)), pp = 1 / xf.s;
  const F = FACES[o.face] ?? FACES.sleepy, yawn = clamp01(o.yawn ?? 0), blink = clamp01(o.blink ?? 0);
  // hair at the back of the head, then the head itself (the jaw drops when he yawns)
  const jawA = yawn * 0.3, piv = [-1.0, -7.4];
  const head = HEAD.map((p, i) => (JAW.has(i) ? add(rot(sub(p, piv), jawA * (i === 14 ? 0.4 : 1)), piv) : p));
  const sharpN = new Set([8]);
  const longHair = o.hair === "long", sw = o.sway ?? 0;
  if (longHair) shape(g, xf, LONG_BACK.map(([x, y]) => [x - (y > 0 ? sw * 0.08 * y : 0), y]).map(fwd), { ramp: HAIR_W, base: 3.2, gain: 1.4, thick: 3 * xf.s, slope: 0.9, rimLit: 0.9 }, new Set([7]));
  shape(g, xf, head.map(fwd), { ramp: SKIN, base: 4.4, gain: 1.4, slope: 1.0, thick: 5 * xf.s, rimLit: 0.6 }, sharpN);
  if (!longHair) { const gk = clamp01(o.gold ?? 0), bo = (ramp) => ({ ramp, base: 3.4, gain: 1.4, thick: 2.2 * xf.s, slope: 0.8, rimLit: 0.9 });
    if (gk < 1) shape(gk > 0 ? gate(g, gk, 1) : g, xf, HAIR_BACK.map(fwd), bo(HAIR));
    if (gk > 0) shape(gk < 1 ? gate(g, 0, gk) : g, xf, HAIR_BACK.map(fwd), bo(GOLD)); }
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
  // spiky hair: a cap over the skull with five spikes swept back and a fringe over the brow; o.spike 0..1 lifts the tips
  // (the aura blows them up), o.gold 0..1 turns it gold by a pixel crossfade
  const sp = clamp01(o.spike ?? 0), gold = clamp01(o.gold ?? 0), wob = o.wob ?? 0;
  const cap = hairCap(sp, wob), sharpH = new Set([2, 4, 6, 8, 10, 12, 14]);
  const hopt = (ramp) => ({ ramp, base: 3.6, gain: 1.5, slope: 1.1, thick: 3.2 * xf.s, rimLit: 1.0, rimShade: 0.8 });
  if (longHair) shape(g, xf, LONG_CROWN.map(fwd), { ramp: HAIR_W, base: 3.8, gain: 1.5, slope: 1.1, thick: 3.2 * xf.s, rimLit: 1.0, rimShade: 0.8 }, new Set([10]));
  else if (gold < 1) shape(gold > 0 ? gate(g, gold, 1) : g, xf, cap.map(fwd), hopt(HAIR), sharpH);
  if (!longHair && gold > 0) shape(gold < 1 ? gate(g, 0, gold) : g, xf, cap.map(fwd), hopt(GOLD), sharpH);
  // anger vein (comic) when annoyed
  if (F.vein && o.vein) {
    const c = [11.6, -13.6], s2 = 1.2;
    paint(g, xf, fwd, back, [c[0] - 2, c[1] - 2, c[0] + 2, c[1] + 2], (u, v) => {
      const a = u - c[0], b = v - c[1], w = Math.max(0.28, pp * 0.6);
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const p0 = [sx * 0.35, sy * 0.35], p1 = [sx * s2, sy * 0.35], p2 = [sx * 0.35, sy * s2]; if (segD(a, b, p0, p1) < w || segD(a, b, p0, p2) < w) return "#E03056"; }
      return null; });
  }
  const hc = P([1.5, -9.5]);
  return { center: hc, mouth: P([9.2, -4.2]), top: P([-2, -24 - 6 * sp]), eye: P(EYE) };
}

function drawEye(g, xf, fwd, back, pp, F, yawn, blink, o) {
  const [ex, ey] = EYE;
  if (F.laughEyes) {                  // laughing: an upward arc (^)
    const pts = bezPts([ex - 1.5, ey + 0.5], [ex, ey - 1.3], [ex + 1.4, ey + 0.5], 10), w = Math.max(0.32, pp * 0.7);
    paint(g, xf, fwd, back, [ex - 2.6, ey - 2, ex + 2, ey + 1.6], (u, v) => (polyD(u, v, pts) <= w || (o.fem && segD(u, v, [ex - 1.4, ey + 0.3], [ex - 2.3, ey - 0.1]) <= w * 0.9) ? INK : null));
    return;
  }
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
  // a lash flick at the outer corner (two for her)
  if (lid < 0.95 && o.fem) { const y = ey - ry + 2 * ry * lid + slant * (-rx), w = Math.max(0.3, pp * 0.7); paint(g, xf, fwd, back, [ex - rx - 2, y - 1.6, ex - rx + 0.6, y + 1], (u, v) => (segD(u, v, [ex - rx * 0.7, y - 0.1], [ex - rx - 1.1, y - 1.0]) <= w ? INK : null)); }
  if (lid < 0.95) { const y = ey - ry + 2 * ry * lid + slant * (-rx), w = Math.max(0.28, pp * 0.6); paint(g, xf, fwd, back, [ex - rx - 1.4, y - 1, ex - rx + 0.6, y + 1], (u, v) => (segD(u, v, [ex - rx * 0.85, y + 0.25], [ex - rx - 0.75, y - 0.35]) <= w ? INK : null)); }
}

function drawMouth(g, xf, fwd, back, pp, F, yawn, o) {
  const w = Math.max(0.3, pp * 0.7), box = [5.2, -7.2, 11.2, 0.5];
  if (yawn > 0.04) {                  // a big yawn: tall dark oval with the tongue, as the jaw drops
    const c = [8.2, -3.3 + 1.0 * yawn], rx = 0.7 + 1.1 * yawn, ry = 0.6 + 1.9 * yawn;
    paint(g, xf, fwd, back, box, (u, v) => { const a = (u - c[0]) / rx, b = (v - c[1]) / ry, d = a * a + b * b; if (d > 1) return null; const ai = (u - c[0]) / Math.max(0.1, rx - pp), bi = (v - c[1]) / Math.max(0.1, ry - pp); if (ai * ai + bi * bi > 1) return INK; return b > 0.35 ? "#E06A80" : "#4A1420"; });
    return;
  }
  const k = F.mouth, lip = o.fem ? "#B04A5A" : INK;
  if (k === "scream" || k === "laugh") {     // wide open: tall dark oval (scream) or a wide open grin (laugh)
    const c = k === "scream" ? [8.4, -3.2] : [8.3, -4.1], rx = k === "scream" ? 1.6 : 1.9, ry = k === "scream" ? 2.3 : 1.3 + 0.35 * (o.open ?? 1);
    paint(g, xf, fwd, back, [5, -8, 11.6, 1.2], (u, v) => { const a = (u - c[0]) / rx, b = (v - c[1]) / ry; if (a * a + b * b > 1 || (k === "laugh" && b < -0.25)) return null; const ai = (u - c[0]) / Math.max(0.1, rx - pp), bi = (v - c[1]) / Math.max(0.1, ry - pp); if (ai * ai + bi * bi > 1 || (k === "laugh" && b < -0.25 + pp / ry)) return INK; return b > 0.35 ? "#E06A80" : k === "laugh" && b < 0.05 ? "#FFF6F0" : "#4A1420"; });
    return;
  }
  if (k === "small") {
    const c = [8.7, -4.0], rx = 0.65, ry = 0.75;
    paint(g, xf, fwd, back, [6, -6, 10.5, -2], (u, v) => { const a = (u - c[0]) / Math.max(rx, pp * 0.9), b = (v - c[1]) / Math.max(ry, pp * 0.9); return a * a + b * b <= 1 ? "#4A1420" : null; });
    return;
  }
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

// ---------------------------------------------------------------- body renderer
/** Soft contact shadow as an ordered dither of one dark colour (writes only, so it also works on actor layers). */
function shadowAt(g, xf, x0l, x1l, yl, k = 0.5) {
  const a = xf.P([x0l, yl]), b = xf.P([x1l, yl]), cx = (a[0] + b[0]) / 2, rx = Math.abs(b[0] - a[0]) / 2 + 2, ry = Math.max(1.5, xf.s * 1.3);
  for (let Y = Math.floor(a[1] - ry); Y <= Math.ceil(a[1] + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
    const d = ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - a[1]) / ry) ** 2; if (d < 1 && k * (1 - d * d) > bayer(X, Y)) g.px(X, Y, "#100A1C");
  }
}


// ---------------------------------------------------------------- rigs from person.mjs (walk, stand, key poses, spline)
export const STRIDE = 40 * K;             // world units per walk cycle (p 0 → 1 = two steps): a careful survivor's walk
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


// ---------------------------------------------------------------- his poses
/** Startle → fall on his back → sit on the ground (k 0 → 1). k = 0 is standRig({ p: 0 }). */
const FALL_T = [0, 0.22, 0.5, 0.78, 1];
const FALL_KEYS = [
  key({ hx: -3, hy: -33.4, lean: -0.32, headA: -0.25, lN: [0.85, 1.25, -0.2], lF: [-0.12, 0.1, 0.05], aN: [2.55, 0.35], aF: [2.85, 0.25] }),
  key({ hx: -12, hy: -21, lean: -0.75, headA: 0.05, lN: [1.3, 0.55, -0.3], lF: [1.12, 0.32, -0.2], aN: [2.2, 0.4], aF: [-2.6, -0.3] }),
  key({ hx: -18, hy: -6.4, lean: -0.62, headA: 0.32, lN: [1.5, 0.12, 0.25], lF: [1.42, 0.3, 0.3], aN: { ik: [-31, -2.8], bend: -1 }, aF: { ik: [-33, -2.8], bend: -1 } }),
  key({ hx: -18, hy: -6.0, lean: -0.42, headA: 0.22, lN: [1.48, 0.25, 0.25], lF: [1.4, 0.45, 0.3], aN: { ik: [-29, -2.8], bend: -1 }, aF: { ik: [-31, -2.8], bend: -1 } }),
];
function fallRig(k) { return unflat(spline([flat(standRig({ p: 0 })), ...FALL_KEYS.map(flat)], FALL_T, k)); }
/** Sitting on the ground after the fall: rub 0..1 (near hand to the back of his head, rubbing), ph (rub cycle), lean
 *  forward 0..1 (he sits up and stares, hands off the ground), look -1..1 (head down/up). */
function groundRig(st) {
  const r = unflat(flat(FALL_KEYS[FALL_KEYS.length - 1])), T0 = torsoT(r), rub = clamp01(st.rub ?? 0), fw = clamp01(st.forward ?? 0);
  r.lean = lerp(r.lean, 0.12, fw) + 0.02 * Math.sin(2 * PI * (st.breath ?? 0)); r.headA = lerp(r.headA, -0.05, fw) + 0.12 * (st.look ?? 0);
  const T = torsoT(r);
  // hands: behind on the ground → on the knees when he sits up
  for (const [side, back] of [["n", [-29, -2.8]], ["f", [-31, -2.8]]]) {
    const knee = add(T(HJ[side]), sc(dir(r["l" + side.toUpperCase()][0]), D.thigh)), onKnee = add(knee, [side === "n" ? -1 : -2.5, -3.5]);
    r["a" + side.toUpperCase()] = armIK(T(SH[side]), L2(back, onKnee, fw), fw > 0.5 ? 1 : -1);
  }
  if (rub > 0) {   // near hand to the back of the head, rubbing in small circles
    const N = T(NECK), ha = r.lean + r.headA, ph = 2 * PI * (st.ph ?? 0);
    const tgt = add(rot([-7.4 + 0.75 * Math.cos(ph), -8.6 + 0.65 * Math.sin(ph)], ha), N), cur = fkArm(r, "n").W;
    r.aN = armIK(T(SH.n), L2(cur, tgt, sm(rub, 0, 1)), -1);
  }
  return r;
}

// ---------------------------------------------------------------- her poses (sitting on the log; seat height from places)
function logRig(st) {
  const seat = -(st.seatH ?? 22) / K, laugh = clamp01(st.laugh ?? 0), lp = st.lp ?? 0, still = clamp01(st.still ?? 0);
  const bounce = laugh * (0.55 * Math.abs(Math.sin(2 * PI * lp))), sway = 0.03 * Math.sin(2 * PI * (st.breath ?? 0));
  const r = { hx: 0, hy: seat - 4.6 - bounce, lean: 0.16 + sway - 0.2 * laugh + 0.06 * still, headA: 0.1 - 0.28 * laugh * (0.75 + 0.25 * Math.sin(2 * PI * lp)) + 0.05 * still + (st.turn ?? 0) * 0.1, legSx: 1 };
  const T = torsoT(r);
  for (const side of ["n", "f"]) {
    const Hj = T(HJ[side]), A = [Hj[0] + (side === "n" ? 17.5 : 15.5), -D.ank], reach = D.thigh + D.shin - 0.6, dd = Math.hypot(A[0] - Hj[0], A[1] - Hj[1]);
    const Aa = dd > reach ? add(Hj, sc(sub(A, Hj), reach / dd)) : A;
    r["l" + side.toUpperCase()] = legIK(Hj, Aa, PI / 2);
  }
  // hands to the fire (forward, chest height, slight warming wiggle) → to her belly while laughing
  const wig = 0.4 * Math.sin(2 * PI * (st.breath ?? 0) * 2);
  const fireN = T([17.5, -17 + wig]), fireF = T([16, -15.5 - wig]), bellyN = T([7, -11 - bounce * 0.4]), bellyF = T([5.5, -9.5]);
  r.aN = armIK(T(SH.n), L2(fireN, bellyN, laugh), 1); r.aF = armIK(T(SH.f), L2(fireF, bellyF, laugh), 1);
  return r;
}

// ---------------------------------------------------------------- outfits
function crowbarAt(g, xf, grip, axis) {
  // a rusty crowbar through the fist along `axis` (unit, hero-local): short end above the fist, long shaft below, hooked tip
  const a = add(grip, sc(axis, -3.5)), b = add(grip, sc(axis, 25)), nrm = [axis[1], -axis[0]], hook = add(b, add(sc(axis, 2.2), sc(nrm, -3.2))), claw = add(hook, sc(nrm, -1.4));
  const w = Math.max(2, xf.s * 1.6);
  sline(g, xf.P(a), xf.P(b), w + 2, "#1A0E0A"); sline(g, xf.P(b), xf.P(hook), w + 2, "#1A0E0A"); sline(g, xf.P(hook), xf.P(claw), w + 1, "#1A0E0A");
  sline(g, xf.P(a), xf.P(b), w, "#5E3828"); sline(g, xf.P(b), xf.P(hook), w, "#4E2E20"); sline(g, xf.P(hook), xf.P(claw), Math.max(1, w - 1), "#6A3E28");
  if (xf.s > 1.2) sline(g, xf.P(add(a, sc(nrm, 0.45))), xf.P(add(b, sc(nrm, 0.45))), 1, "#A8684A");
}
/** A dropped crowbar lying / tumbling in world space: centre (wx, wy), angle rot (radians). */
export function drawCrowbar(g, G, wx, wy, rot0) {
  const xf = { z: G.z, s: K * G.z, dim: 0, bb: [Infinity, Infinity, -Infinity, -Infinity], P: (u) => [G.X(wx + K * u[0]), G.Y(wy + K * u[1])] };
  const ax = [Math.cos(rot0), Math.sin(rot0)]; crowbarAt(g, xf, sc(ax, -10.75), ax);
}

function renderPerson(g, G, wx, wy, f, r, st, who) {
  const xf = frame(G, wx, wy, f, st.dim ?? 0), P = xf.P, s = xf.s, T = torsoT(r), her = who === "her";
  const opt = (ramp, base, thick, more = {}) => ({ ramp, base, gain: 1.4, slope: 1.0, thick: thick * s, rimLit: 0.8, rimShade: 0.8, ...more });
  const TOP = her ? PARKA : HOOD, LEGS = her ? JEANS : PANTS;
  const legs = {}, arms = {};
  for (const side of ["n", "f"]) {
    const [t, kb, fr] = side === "n" ? r.lN : r.lF, Hj = T(HJ[side]);
    const Kn = add(Hj, sc(dir(t), D.thigh)), sa = t - kb, A = add(Kn, sc(dir(sa), D.shin)), fa = sa + PI / 2 + fr, d = dir(fa), nrm = rot(d, PI / 2);
    legs[side] = { Hj, Kn, A, M: (p) => p, d, nrm };
    arms[side] = fkArm(r, side);
  }
  if (st.shadow !== false) { const xs = [legs.n.A[0], legs.f.A[0], r.hx]; if (r.hy > -15) xs.push(T([0, -30])[0], arms.n.W[0], arms.f.W[0]); shadowAt(g, xf, Math.min(...xs) - 6, Math.max(...xs) + 6, 0, 0.55); }
  const drawSleeve = (side, dark, handKind) => {
    const { S, E, W } = arms[side], bone = [S, E, W], wd = her ? [8.4, 7.6, 7.0] : [7.8, 7.0, 6.6];
    part(g, xf, smooth(limb(bone, wd).map(P), new Set(), SEG(xf)), opt(TOP, 4.4 + dark, 3.4));
    const dv = sub(W, E), dn = Math.hypot(dv[0], dv[1]) || 1, nv = [-dv[1] / dn, dv[0] / dn], c0 = L2(E, W, 0.82);
    shape(g, xf, [add(c0, sc(nv, 3.5)), add(W, sc(nv, 3.3)), add(W, sc(nv, -3.3)), add(c0, sc(nv, -3.5))], { ...opt(TOP, 3.6 + dark, 1.0), slope: 0.3 }, new Set([0, 1, 2, 3]));
    return hand(g, xf, W, E, handKind, null, dark);
  };
  const drawLeg = (side, dark) => {
    const { Hj, Kn, A, d, nrm, M } = legs[side];
    const cuffP = add(A, sc(nrm, -0.4)), bone = [Hj, Kn, cuffP], wd = her ? [11.0, 8.8, 7.8] : [11.6, 9.4, 7.6];
    if (her) boot(g, xf, A, d, nrm, M, dark); else sneaker(g, xf, A, d, nrm, M, dark);
    part(g, xf, smooth(limb(bone, wd).map(P), new Set(), SEG(xf)), opt(LEGS, 4.3 + dark, 4.0));
    if (!her) { const dv = sub(cuffP, Kn), dn = Math.hypot(dv[0], dv[1]) || 1, nv = [-dv[1] / dn, dv[0] / dn], c0 = L2(Kn, cuffP, 0.84);
      shape(g, xf, [add(c0, sc(nv, 4.0)), add(cuffP, sc(nv, 3.9)), add(cuffP, sc(nv, -3.9)), add(c0, sc(nv, -4.0))], { ...opt(PANTS, 3.7 + dark, 1.0), slope: 0.3 }, new Set([0, 1, 2, 3])); }
    else { // boot shaft over the jeans hem
      const top = add(A, sc(sub(Kn, A), 0.32)); shape(g, xf, [add(A, sc(nrm, 3.4)), add(top, sc(nrm, 3.6)), add(top, sc(nrm, -3.6)), add(A, sc(nrm, -3.4))], opt(BOOT, 3.8 + dark, 1.4), new Set([0, 1, 2, 3])); }
  };
  drawSleeve("f", -1.1, her ? "open" : "open");
  drawLeg("f", -1.0);
  drawLeg("n", 0);
  if (her) {
    // fur-rimmed hood down behind the neck, parka body to mid-thigh, hem band
    shape(g, xf, [[-2.2, -35.4], [-8.2, -35.0], [-12.0, -31.0], [-12.2, -26.0], [-8.4, -24.8], [-4.8, -28.4], [-1.2, -31.4]].map(T), opt(FUR, 4.2, 2.6));
    const BODY = [[-4.8, -33.6], [-9.0, -30.0], [-10.6, -22.6], [-11.2, -12.0], [-11.4, -1.0], [-11.0, 3.6], [10.6, 3.6], [11.6, -1.5], [11.2, -12.5], [10.0, -21.6], [7.6, -28.4], [3.6, -33.8]].map(T);
    part(g, xf, smooth(BODY.map(P), new Set([5, 6]), SEG(xf)), opt(PARKA, 4.5, 8));
    shape(g, xf, [[-11.0, 1.2], [-10.8, 4.0], [10.7, 4.0], [11.2, 1.0]].map(T), { ...opt(PARKA, 3.7, 1.2), slope: 0.2 }, new Set([0, 1, 2, 3]));
    if (s > 1.2) { sline(g, P(T([9.6, -27])), P(T([10.8, 2.0])), 1, PARKA[2]); for (const y of [-20, -12, -4]) { const [X, Y] = P(T([9.0, y])); g.px(R(X), R(Y), PARKA[1]); } }
    // scarf: wrap at the neck and a tail hanging in front
    shape(g, xf, [[-4.6, -36.2], [3.8, -36.6], [6.0, -33.6], [2.2, -31.0], [-4.2, -31.6]].map(T), opt(SCARF, 4.4, 1.8));
    shape(g, xf, [[2.6, -33.0], [6.0, -32.0], [7.4, -20.0], [4.4, -19.4]].map(T), opt(SCARF, 4.0, 1.4), new Set([2, 3]));
  } else {
    // backpack behind (straps over the shoulder later), hood bunch, hoodie body
    shape(g, xf, [[-9.0, -31.0], [-17.6, -30.0], [-19.4, -22.0], [-19.0, -8.0], [-15.6, -5.6], [-8.6, -6.4]].map(T), opt(PACK, 4.3, 3.0));
    shape(g, xf, [[-16.4, -20.0], [-19.8, -19.2], [-20.2, -11.0], [-16.6, -10.4]].map(T), opt(PACK, 3.6, 1.2));
    shape(g, xf, [[-2.6, -35.0], [-7.6, -34.4], [-11.0, -30.8], [-11.0, -26.4], [-7.6, -25.6], [-4.6, -28.6], [-1.4, -31.2]].map(T), opt(HOOD, 4.0, 3.0));
    const BODY = [[-4.6, -33.4], [-8.4, -30.0], [-9.8, -22.6], [-10.3, -13.0], [-10.4, -3.0], [-10.0, 4.2], [10.0, 4.2], [10.8, -3.5], [10.6, -13.5], [9.6, -21.6], [7.4, -28.4], [3.4, -33.6]].map(T);
    part(g, xf, smooth(BODY.map(P), new Set([5, 6]), SEG(xf)), opt(HOOD, 4.5, 8));
    shape(g, xf, [[-10.2, 0.8], [-10.0, 4.4], [10.1, 4.4], [10.7, 0.6]].map(T), { ...opt(HOOD, 3.7, 1.2), slope: 0.2 }, new Set([0, 1, 2, 3]));
    if (s > 1.2) for (let k = 0; k < 9; k++) { const x = -8.6 + k * 2.2; sline(g, P(T([x, 1.2])), P(T([x, 4.0])), 1, HOOD[2]); }
    shape(g, xf, [[-5.0, -35.6], [2.8, -36.0], [5.0, -33.2], [1.2, -31.6], [-3.6, -32.2]].map(T), opt(HOOD, 5.0, 1.4));
    for (const [x0, x1] of [[2.6, 3.4], [4.4, 5.4]]) sline(g, P(T([x0, -33.0])), P(T([x1, -23.6])), Math.max(1, s * 0.5), "#E8E6F0");
    // backpack strap over the shoulder
    shape(g, xf, [[-3.6, -33.6], [0.4, -33.2], [0.8, -18.0], [-2.4, -17.6]].map(T), opt(PACK, 3.4, 1.0), new Set([0, 1, 2, 3]));
    shape(g, xf, [[0.6, -10.0], [9.8, -10.4], [10.6, -3.4], [0.0, -3.2]].map(T), opt(HOOD, 4.8, 2.0, { slope: 0.6 }));
  }
  // near arm (and his crowbar), then the head
  const holding = !her && st.crowbar === "hand";
  const hn = drawSleeve("n", 0, holding ? "fist" : "open");
  if (holding) { const ax = dir(ang(sub(arms.n.W, arms.n.E))); crowbarAt(g, xf, add(arms.n.W, sc(ax, 2.0)), ax); }
  const N = T(NECK), ha = r.lean + r.headA;
  const hd = drawHead(g, xf, N, ha, { face: st.face ?? (her ? "warm" : "sleepy"), blink: st.blink, hair: her ? "long" : "spiky", fem: her, sway: st.hairSway ?? 0, open: st.open });
  const ft = legs.n.A[0] * f >= legs.f.A[0] * f ? legs.n : legs.f;
  return { head: hd.center, eye: hd.eye, top: hd.top, mouth: hd.mouth, hip: P([r.hx, r.hy]), chest: P(T([2, -20])), foot: P(add(ft.A, [0, D.ank])), hand: P(arms.n.W), bbox: xf.bb.map(R) };
}
function sneaker(g, xf, A0, d, nrm, M, dark) {
  const F = (u, v) => M(add(A0, add(sc(d, u), sc(nrm, v))));
  shape(g, xf, [F(-3.2, -2.4), F(-4.0, 0.2), F(-3.8, 1.8), F(6.8, 1.8), F(8.6, 1.0), F(8.0, -0.8), F(4.6, -1.8), F(1.4, -2.9)], { ramp: SNEAK, base: 4.3 + dark, gain: 1.2, slope: 0.9, thick: 2.2 * xf.s, rimLit: 0.8 }, new Set([2, 3]));
  shape(g, xf, [F(-4.0, 1.3), F(-3.9, 2.9), F(8.2, 2.9), F(8.9, 1.2)], { ramp: SOLE, base: 4.0 + dark, gain: 0.6, slope: 0.5, thick: 0.8 * xf.s }, new Set([0, 1, 2, 3]));
  // a red heel tab and a side stripe
  shape(g, xf, [F(-3.5, -2.2), F(-4.1, 0.0), F(-2.0, 0.2), F(-1.6, -2.4)], { ramp: SOLE, base: 4.2 + dark, gain: 0.5, slope: 0.3, thick: 0.6 * xf.s });
  if (xf.s > 1.2) sline(g, xf.P(F(0.6, 0.6)), xf.P(F(5.4, -0.6)), Math.max(1, xf.s * 0.45), SOLE[3]);
}

function boot(g, xf, A0, d, nrm, M, dark) {
  const F = (u, v) => M(add(A0, add(sc(d, u), sc(nrm, v))));
  shape(g, xf, [F(-3.2, -2.6), F(-3.9, 0.2), F(-3.8, 2.0), F(6.6, 2.0), F(8.0, 1.0), F(7.4, -0.8), F(4.2, -1.8), F(1.4, -2.9)], { ramp: BOOT, base: 4.0 + dark, gain: 1.2, slope: 0.9, thick: 2.2 * xf.s, rimLit: 0.8 }, new Set([2, 3]));
  shape(g, xf, [F(-4.0, 1.4), F(-3.9, 2.8), F(7.8, 2.8), F(8.4, 1.2)], { ramp: BOOT, base: 1.8 + dark, gain: 0.4, slope: 0.3, thick: 0.8 * xf.s }, new Set([0, 1, 2, 3]));
}

// ---------------------------------------------------------------- public API
/**
 * HIM. (wx, wy) = world ground point under his hips. st = { pose, f (facing ±1), ...pose params, face, blink, dim, crowbar ("hand" | null) }
 *   walk: p (cycle, 1 = two steps = STRIDE) · stand: p (sway) · fall: k 0..1 · ground: rub, ph, forward, look, breath
 */
export function drawHim(g, G, wx, wy, st) {
  const f = (st.f ?? 1) < 0 ? -1 : 1;
  const r = st.pose === "walk" ? walkRig(st) : st.pose === "fall" ? fallRig(clamp01(st.k ?? 0)) : st.pose === "ground" ? groundRig(st) : standRig(st);
  if (st.pose === "walk" || st.pose === "stand") r.headA += st.headDy ?? 0;
  return renderPerson(g, G, wx, wy, f, r, st, "him");
}
/** HER on the log. st = { f, seatH, laugh 0..1, lp (laugh bounce phase), still 0..1, breath, face, blink, hairSway, turn } */
export function drawHer(g, G, wx, wy, st) { const f = (st.f ?? -1) < 0 ? -1 : 1; return renderPerson(g, G, wx, wy, f, logRig(st), st, "her"); }
/** Crossfade between two drawings of the same person (complementary dither gates). draw(g) must draw one state. */
export function blend(g, k, drawA, drawB) { k = clamp01(k); if (k <= 0) return drawA(g); if (k >= 1) return drawB(g); const b = drawB(gate(g, 0, k)); drawA(gate(g, k, 1)); return b; }

// ---------------------------------------------------------------- the mouse (world units; ≈ 3× life size against them — an illustration)
/** st = { f (facing ±1), pose: "run" | "sit", p (run cycle), up 0..1 (sitting up on its hind legs), sniff (phase), look 0..1 } */
export function drawMouse(g, G, wx, wy, st) {
  const f = (st.f ?? 1) < 0 ? -1 : 1, S = st.scale ?? 1.6, up = clamp01(st.up ?? 0), run = st.pose === "run", p = st.p ?? 0;
  const xf = { z: G.z, s: S * G.z, dim: 0, bb: [Infinity, Infinity, -Infinity, -Infinity], P: (u) => [G.X(wx + f * S * u[0]), G.Y(wy + S * u[1])], inv: (X, Y) => [((G.wx(X) - wx) / (f * S)), (G.wy(Y) - wy) / S] };
  const o = (ramp, base, thick) => ({ ramp, base, gain: 1.3, slope: 0.8, thick: thick * xf.s, rimLit: 0.8, rimShade: 0.7 });
  const bob = run ? 0.9 * Math.abs(Math.sin(2 * PI * p)) : 0, stretch = run ? 1 + 0.12 * Math.sin(2 * PI * p) : 1;
  // tail (thin, pink-grey), body, legs, head, ear, eye, whiskers
  const tail = bezPts([-5.5, -2.6 - bob], [-13, -0.5 + (run ? 2 * Math.sin(2 * PI * p) : 0)], [-19, -4 - 3 * up + (run ? 0 : Math.sin((st.sniff ?? 0) * 0.7))], 12);
  for (let i = 0; i + 1 < tail.length; i++) sline(g, xf.P(tail[i]), xf.P(tail[i + 1]), Math.max(1, xf.s * (0.9 - i * 0.05)), i < 3 ? "#8A6A62" : "#B88A80");
  const cx = lerp(0, -1.2, up), cy = lerp(-4.4, -6.6, up) - bob, rx = lerp(6.4 * stretch, 3.9, up), ry = lerp(3.9, 5.6, up), tilt = lerp(0, -0.9, up);
  // feet
  for (const [dx, ph] of [[-3.5, 0], [3.0, 0.5]]) { const lift = run ? Math.max(0, Math.sin(2 * PI * (p + ph))) * 1.6 : 0, sw = run ? 2.2 * Math.cos(2 * PI * (p + ph)) : 0; const a = xf.P([dx + sw, -0.6 - lift]); g.rect(R(a[0]) - 1, R(a[1]) - 1, Math.max(2, R(xf.s * 2.2)), Math.max(1, R(xf.s * 1)), "#C8968A"); }
  shape(g, xf, ellPts([cx, cy], rx, ry, 20, tilt), o(MOUSE, 4.4, 3));
  // belly patch
  shape(g, xf, ellPts([cx + 1.2, cy + ry * 0.45], rx * 0.6, ry * 0.4, 14, tilt), o(MOUSE, 6.0, 1.4));
  if (up > 0.3) { const pa = xf.P([cx + 2.6, cy - 0.6]); g.rect(R(pa[0]) - 1, R(pa[1]), Math.max(2, R(xf.s * 1.6)), Math.max(2, R(xf.s * 1.4)), "#D8A49A"); }
  const sn = st.sniff ?? 0, nod = run ? 0 : 0.35 * Math.sin(sn * 2 * PI * 1.0);
  const hx = cx + rx * 0.82 + (up ? -0.6 * up : 0), hy = cy - ry * 0.35 - 1.6 * up + nod;
  shape(g, xf, [[hx - 3.2, hy + 1.6], [hx - 2.6, hy - 2.4], [hx + 0.6, hy - 3.0], [hx + 3.2, hy - 1.0], [hx + 5.6, hy + 0.6 + nod * 0.3], [hx + 2.4, hy + 2.6], [hx - 1.0, hy + 2.8]], o(MOUSE, 4.7, 2.2), new Set([4]));
  // ear (big, round, pink inside)
  const ex = hx - 0.6, ey = hy - 3.6;
  shape(g, xf, ellPts([ex, ey], 2.3, 2.6, 16), o(MOUSE, 4.2, 1.2));
  shape(g, xf, ellPts([ex + 0.3, ey + 0.2], 1.3, 1.6, 12), { ramp: ["#5A2A30", "#8A4A50", "#B8707A", "#D8949C", "#EAB0B6", "#F4CACE", "#FAE0E2", "#FFF4F4"], base: 4.2, gain: 0.8, slope: 0.4, thick: 0.6 * xf.s });
  // nose and eye
  const nz = xf.P([hx + 5.6, hy + 0.5 + nod * 0.3]); g.rect(R(nz[0]) - 1, R(nz[1]) - 1, 2, 2, "#E07A8A");
  const ey2 = xf.P([hx + 1.6, hy - 0.6]), er = Math.max(1, R(xf.s * 0.95)); g.disc(R(ey2[0]), R(ey2[1]), er, "#0A0608"); g.px(R(ey2[0]) - (f > 0 ? 0 : 0) + (er > 1 ? -1 : 0), R(ey2[1]) - (er > 1 ? 1 : 0), "#FFFFFF");
  if (xf.s > 1.4) for (const dy of [-0.4, 0.8]) sline(g, xf.P([hx + 4.6, hy + 0.6]), xf.P([hx + 8.6, hy + dy + 0.4 * Math.sin(sn * 9)]), 1, "#D8C8C0");
  return { head: xf.P([hx, hy]), center: xf.P([cx, cy]) };
}
