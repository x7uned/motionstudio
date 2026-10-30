// «Why do cats love boxes?» — small shared kit for the props: math, tone bands, the lit/faded view, a face rasteriser
// with selective 1-px outlines (planar props: the box), and a volume-shading pass with per-pixel paint (plush: the bed).
// Pure functions; module scratch buffers are only reused for speed and never carry state between calls.
import { bayer, fade, mix, hex } from "../../../../renderer/pixel/raster.mjs";
import { lightAt, litView } from "../../cat-zoomies/film/apartment.mjs";
export { bayer, fade, mix, hex };

export const R = Math.round, TAU = Math.PI * 2;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const s01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const sm = (t, a, b) => s01((t - a) / (b - a));
export const frac = (v) => v - Math.floor(v);
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

/** Flat tone bands with a narrow Bayer transition (the dog/shade.mjs rule). */
export function band(v, X, Y) { const fl = Math.floor(v), f = v - fl; return f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl; }
export const pick = (ramp, v, X, Y) => ramp[Math.max(0, Math.min(ramp.length - 1, band(v, X, Y)))];

/** The canvas view a world prop draws through: optional room light (o.light from lightAt, or o.st), then o.alpha. */
export function view(c, o, wx, wy) {
  let g = c;
  const light = o.light ?? (o.st ? lightAt(o.st, wx, wy) : null);
  if (light) g = litView(g, light);
  const a = o.alpha ?? 1;
  if (a < 1) g = fade(g, a);
  return g;
}

/** Zoom-dependent detail weight (details dissolve in over a zoom range, never pop during a camera zoom). */
export const zDetail = (z, a, b) => s01((z - a) / (b - a));

// ---------------------------------------------------------------- face rasteriser (planar props)
let IDS = new Int16Array(0);
/**
 * faces: [{ pts: [[X, Y], …] screen polygon, shade(X, Y) → colour, out: silhouette colour | null, crease: { [faceIndex]: colour } }]
 * Faces are filled in order (later ones cover earlier ones) into a shared id buffer; then every pixel is painted once:
 * a pixel whose 4-neighbour is empty gets face.out (the dark outline), a pixel touching face j listed in face.crease
 * gets that crease colour (1 px, only on this face's side), everything else face.shade(X, Y).
 * clip = [x0, y0, x1, y1] screen clip (defaults to the canvas). Returns the painted bbox or null.
 */
export function faces(g, list, clip) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of list) if (f) for (const [x, y] of f.pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  const cw = clip ? clip : [0, 0, g.w ?? 4000, g.h ?? 4000];
  x0 = Math.max(Math.floor(x0) - 1, cw[0] - 1); y0 = Math.max(Math.floor(y0) - 1, cw[1] - 1);
  x1 = Math.min(Math.ceil(x1) + 2, cw[2] + 1); y1 = Math.min(Math.ceil(y1) + 2, cw[3] + 1);
  const W = x1 - x0, H = y1 - y0; if (W <= 0 || H <= 0) return null;
  if (IDS.length < W * H) IDS = new Int16Array(W * H * 2);
  const id = IDS; id.fill(-1, 0, W * H);
  list.forEach((f, k) => {
    if (!f) return; const pts = f.pts;
    for (let y = 0; y < H; y++) {
      const yc = y0 + y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
      if (xs.length < 2) continue; xs.sort((a, b) => a - b);
      for (let q = 0; q + 1 < xs.length; q += 2) { const xa = Math.max(0, Math.round(xs[q]) - x0), xb = Math.min(W, Math.round(xs[q + 1]) - x0); for (let x = xa; x < xb; x++) id[y * W + x] = k; }
    }
  });
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : id[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = id[y * W + x]; if (k < 0) continue;
    const X = x0 + x, Y = y0 + y; if (X < cw[0] || Y < cw[1] || X >= cw[2] || Y >= cw[3]) continue;
    const f = list[k], n0 = at(x - 1, y), n1 = at(x + 1, y), n2 = at(x, y - 1), n3 = at(x, y + 1);
    if (f.out && (n0 < 0 || n1 < 0 || n2 < 0 || n3 < 0)) { g.px(X, Y, typeof f.out === "function" ? f.out(X, Y, n2 < 0, n3 < 0) : f.out); continue; }
    if (f.crease) {
      const cr = f.crease, cc = (n0 !== k && cr[n0]) || (n1 !== k && cr[n1]) || (n2 !== k && cr[n2]) || (n3 !== k && cr[n3]);
      if (cc) { g.px(X, Y, cc); continue; }
    }
    const col = f.shade(X, Y); if (col) g.px(X, Y, col);
  }
  return [x0, y0, x1, y1];
}

// ---------------------------------------------------------------- volume shading with paint (plush)
let MASK = new Uint8Array(0), DIST = new Float32Array(0), SEED = new Uint8Array(0);
/**
 * Pillow shading of a mask built from polygons (union), quantised to a ramp with flat bands + narrow dither, lit/shadow
 * rims and a 1-px outline (dog/shade.mjs drawPart) — plus:
 *   seed(X, Y) → true marks extra "outside" pixels for the distance field only (so two halves of one torus can be shaded
 *     as separate rounded volumes without a seam where they meet);
 *   only(X, Y) → false skips painting a pixel (part splits: back/front);
 *   paint(X, Y, P) may set P.dv (tone offset), P.ramp, P.col (final colour) or P.skip;
 *   edgeIf(X, Y) → false turns an outline pixel into a plain shaded one (hidden seams).
 */
export function volume(g, polys, o = {}) {
  const { ramp, base = 3.4, gain = 1.6, slope = 1.0, thick = 12, light = [-0.7, -0.7], rimLit = 1, rimShade = 1, outline = ramp[0], litOutline = null, paint = null, only = null, seed = null, edgeIf = null, clip = null } = o;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  const cw = clip ?? [-8, -8, (g.w ?? 4000) + 8, (g.h ?? 4000) + 8];
  x0 = Math.max(Math.floor(x0) - 3, cw[0] - 40); y0 = Math.max(Math.floor(y0) - 3, cw[1] - 40); x1 = Math.min(Math.ceil(x1) + 3, cw[2] + 40); y1 = Math.min(Math.ceil(y1) + 3, cw[3] + 40);
  const W = x1 - x0, H = y1 - y0; if (W <= 0 || H <= 0) return null;
  const N = W * H;
  if (MASK.length < N) { MASK = new Uint8Array(N * 2); DIST = new Float32Array(N * 2); SEED = new Uint8Array(N * 2); }
  const m = MASK, d = DIST; m.fill(0, 0, N);
  for (const poly of polys) { let py0 = Infinity, py1 = -Infinity; for (const q of poly) { if (q[1] < py0) py0 = q[1]; if (q[1] > py1) py1 = q[1]; }
  for (let y = Math.max(0, Math.floor(py0) - y0 - 1); y < Math.min(H, Math.ceil(py1) - y0 + 1); y++) {
    const yc = y0 + y + 0.5, xs = [];
    for (let i = 0; i < poly.length; i++) { const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    if (xs.length < 2) continue; xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k]) - x0); x < Math.min(W, Math.round(xs[k + 1]) - x0); x++) m[y * W + x] = 1;
  } }
  const INF = 1e9;
  for (let i = 0; i < N; i++) d[i] = m[i] ? INF : 0;
  if (seed) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (m[i] && seed(x0 + x, y0 + y)) d[i] = 0; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x > 0 && d[i - 1] + 1 < v) v = d[i - 1] + 1; if (y > 0) { if (d[i - W] + 1 < v) v = d[i - W] + 1; if (x > 0 && d[i - W - 1] + 1.414 < v) v = d[i - W - 1] + 1.414; if (x < W - 1 && d[i - W + 1] + 1.414 < v) v = d[i - W + 1] + 1.414; } d[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x < W - 1 && d[i + 1] + 1 < v) v = d[i + 1] + 1; if (y < H - 1) { if (d[i + W] + 1 < v) v = d[i + W] + 1; if (x < W - 1 && d[i + W + 1] + 1.414 < v) v = d[i + W + 1] + 1.414; if (x > 0 && d[i + W - 1] + 1.414 < v) v = d[i + W - 1] + 1.414; } d[i] = v; }
  const inside = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]);
  const deep = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x] && d[y * W + x] > 0.5);
  const [lx, ly] = light, ln = Math.hypot(lx, ly) || 1, ux = lx / ln, uy = ly / ln;
  const P = { dv: 0, ramp: null, col: null, skip: false };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!m[i]) continue;
    const X = x0 + x, Y = y0 + y;
    if (X < cw[0] || Y < cw[1] || X >= cw[2] || Y >= cw[3]) continue;
    if (only && !only(X, Y)) continue;
    let edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    if (edge && edgeIf && !edgeIf(X, Y)) edge = false;
    if (edge) { const litSide = !inside(Math.round(x + ux * 1.5), Math.round(y + uy * 1.5)); g.px(X, Y, litSide && litOutline ? litOutline : outline); continue; }
    const t = Math.min(1, d[i] / thick), yN = y / H;
    let v = base + gain * Math.pow(t, 0.6) - slope * yN;
    if (!deep(Math.round(x + ux * 3), Math.round(y + uy * 3))) v += rimLit * (d[i] < thick ? 1 : 0.4);
    if (!deep(Math.round(x - ux * 4), Math.round(y - uy * 4))) v -= rimShade;
    P.dv = 0; P.ramp = null; P.col = null; P.skip = false;
    if (paint) { paint(X, Y, P, t); if (P.skip) continue; if (P.col) { g.px(X, Y, P.col); continue; } }
    const rp = P.ramp ?? ramp;
    g.px(X, Y, pick(rp, Math.max(1, v + P.dv), X, Y));
  }
  return [x0, y0, x1, y1];
}

/** Ellipse polygon. */
export function ellP(cx, cy, rx, ry, n = 0, a0 = 0, a1 = TAU) {
  n = n || Math.max(16, Math.min(96, Math.ceil((rx + ry) * 1.3)));
  const out = [], full = Math.abs(a1 - a0 - TAU) < 1e-6;
  for (let i = 0; i < (full ? n : n + 1); i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return out;
}
/** Soft dithered contact shadow (darkens what is already there). */
export function contact(g, cx, cy, rx, ry, k = 0.4, col = "#1A0E08") {
  if (rx < 1 || ry < 0.5) return;
  g.tint(R(cx - rx), R(cy - ry), R(2 * rx) + 1, R(2 * ry) + 1, (X, Y) => { const q = ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2; return q >= 1 ? 0 : k * (1 - q) * 1.25; }, col, 3);
}
/** 4-point twinkle star of radius r px (r ≥ 1), colour core/arms. */
export function twinkle(g, x, y, r, core = "#FFFFFF", arm = "#FFF2B8") {
  x = R(x); y = R(y); r = Math.max(1, R(r));
  for (let q = -r; q <= r; q++) { const c = Math.abs(q) <= Math.max(0, R(r * 0.3)) ? core : arm; g.px(x + q, y, c); g.px(x, y + q, c); }
  if (r >= 3) { g.px(x - 1, y - 1, arm); g.px(x + 1, y - 1, arm); g.px(x - 1, y + 1, arm); g.px(x + 1, y + 1, arm); }
}
