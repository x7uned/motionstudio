// Copied from ../../../cat-zoomies/film/cat-kit.mjs (orange tabby rig kit) for the garden hook; do not edit the original.
// Kit for the cat actor (cat.mjs): 2-D vector helpers, curves, tubes, two-bone IK and a volume-shading engine.
// The engine is the dog/shade.mjs drawPart idea (mask → chamfer distance → pillow shading in flat tone bands with a
// narrow Bayer transition → lit/shadow rims → 1-px outline) plus three things the cat needs:
//   • paint(X, Y, P): per-pixel markings (stripes, cream muzzle, pink inner ear) as a tone offset or a ramp swap, so the
//     markings are shaded with the same volume and stay locked to the body in world units at every zoom;
//   • a coverage buffer shared by all parts of one actor: an edge pixel whose outside neighbours are already cat becomes
//     a soft inner line (or no line at all) instead of the dark silhouette outline (selective outlining);
//   • shapes as unions of simple polygons (tube quads, ellipses), so curled tails never punch even-odd holes.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const s01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const smr = (x, a, b) => s01((x - a) / (b - a));
export const frac = (x) => x - Math.floor(x);
export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- vectors (plain [x, y] arrays)
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const len = (a) => Math.hypot(a[0], a[1]);
export const nrm = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
export const rot = (a, t) => { const c = Math.cos(t), s = Math.sin(t); return [a[0] * c - a[1] * s, a[0] * s + a[1] * c]; };
export const L2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
export const dir = (t) => [Math.cos(t), Math.sin(t)];

/** Ellipse polygon (rx, ry, rotation rot) with n vertices. */
export function ell(cx, cy, rx, ry, r = 0, n = 0) {
  n = n || Math.max(14, Math.min(48, Math.ceil((rx + ry) * 1.6)));
  const c = Math.cos(r), s = Math.sin(r), out = [];
  for (let i = 0; i < n; i++) { const a = (TAU * i) / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}

/** Open Catmull-Rom curve through pts, seg samples per span (end points duplicated). */
export function curve(pts, seg = 6) {
  const n = pts.length, out = [];
  if (n < 2) return pts.slice();
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[n - 1].slice());
  return out;
}

/** Closed smooth outline through control points (sharp indices stay corners). Same as dog/shade.mjs smooth. */
export function closed(pts, sharp = null, seg = 5) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (sharp && (sharp.has(i) || sharp.has((i + 1) % n))) { out.push(p1); continue; }
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  return out;
}

/** Curve by integrating curvature: start at `base`, heading a0 (rad, screen: 0 = +x, −π/2 = up), total length L;
 *  turn(t) = extra heading (rad) accumulated at parameter t ∈ [0,1] (absolute, not a rate). n segments. */
export function chain(base, a0, L, turn, n = 14) {
  const out = [base.slice()]; let p = base.slice();
  for (let i = 1; i <= n; i++) { const t = (i - 0.5) / n, a = a0 + turn(t); p = [p[0] + (Math.cos(a) * L) / n, p[1] + (Math.sin(a) * L) / n]; out.push(p); }
  return out;
}

/** Arc-length table of a polyline. */
export function arcs(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + len(sub(pts[i], pts[i - 1]))); return c; }
/** Point at arc length s along a polyline (with its table c). */
export function along(pts, c, s) {
  if (s <= 0) return pts[0].slice(); const L = c[c.length - 1]; if (s >= L) return pts[pts.length - 1].slice();
  let i = 1; while (c[i] < s) i++; const k = (s - c[i - 1]) / (c[i] - c[i - 1] || 1); return L2(pts[i - 1], pts[i], k);
}
/** Resample a polyline into n+1 points evenly spaced by arc length. */
export function resample(pts, n) { const c = arcs(pts), L = c[c.length - 1], out = []; for (let i = 0; i <= n; i++) out.push(along(pts, c, (L * i) / n)); return out; }

/**
 * Tube along a polyline as a union of quads (no self-intersection holes) + round caps.
 * radii: number, [r0, r1] (linear taper) or a function r(t) with t ∈ [0,1] along the length.
 */
export function tubeQ(pts, radii, caps = [true, true]) {
  const n = pts.length, c = arcs(pts), L = c[n - 1] || 1;
  const rf = typeof radii === "function" ? radii : Array.isArray(radii) ? (t) => lerp(radii[0], radii[1], t) : () => radii;
  const Lp = [], Rp = [], rs = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], d = nrm(sub(b, a)), r = rf(c[i] / L);
    rs.push(r); Lp.push([pts[i][0] - d[1] * r, pts[i][1] + d[0] * r]); Rp.push([pts[i][0] + d[1] * r, pts[i][1] - d[0] * r]);
  }
  const polys = [];
  for (let i = 0; i < n - 1; i++) polys.push([Lp[i], Lp[i + 1], Rp[i + 1], Rp[i]]);
  if (caps[0]) polys.push(ell(pts[0][0], pts[0][1], rs[0], rs[0]));
  if (caps[1]) polys.push(ell(pts[n - 1][0], pts[n - 1][1], rs[n - 1], rs[n - 1]));
  // joint discs where the polyline bends sharply (fills the outer wedge gap)
  for (let i = 1; i < n - 1; i++) {
    const d0 = nrm(sub(pts[i], pts[i - 1])), d1 = nrm(sub(pts[i + 1], pts[i]));
    if (d0[0] * d1[0] + d0[1] * d1[1] < 0.93) polys.push(ell(pts[i][0], pts[i][1], rs[i], rs[i], 0, 14));
  }
  return polys;
}

/** Two-bone IK: joint between a and target c with bone lengths L1, L2; picks the solution on the `hint` side. */
export function ik2(a, c, L1, L2_, hint) {
  let d = sub(c, a), D = len(d);
  const maxD = L1 + L2_ - 0.01, minD = Math.abs(L1 - L2_) + 0.01;
  if (D > maxD) { c = add(a, mul(d, maxD / D)); D = maxD; d = sub(c, a); }
  if (D < minD) { c = add(a, mul(nrm(d), minD)); D = minD; d = sub(c, a); }
  const x = (L1 * L1 - L2_ * L2_ + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - x * x)), u = nrm(d), n = [-u[1], u[0]];
  const j1 = add(add(a, mul(u, x)), mul(n, h)), j2 = add(add(a, mul(u, x)), mul(n, -h));
  if (typeof hint === "number") return { j: hint >= 0 ? j1 : j2, c };   // fixed bend side: no flips as the limb swings
  const s1 = (j1[0] - a[0]) * hint[0] + (j1[1] - a[1]) * hint[1], s2 = (j2[0] - a[0]) * hint[0] + (j2[1] - a[1]) * hint[1];
  return { j: s1 >= s2 ? j1 : j2, c };
}

/** Projection of point p onto a polyline (pts + arc table c): s = arc length, v = signed distance (+ = left of travel
 *  direction in screen coordinates, i.e. "up" for a polyline running towards +x), t = s / L. */
export function project(pts, c, p) {
  let best = Infinity, bs = 0, bv = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const k = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    const qx = a[0] + dx * k, qy = a[1] + dy * k, ex = p[0] - qx, ey = p[1] - qy, dd = ex * ex + ey * ey;
    if (dd < best) { best = dd; bs = c[i] + k * Math.sqrt(l2); const l = Math.sqrt(l2); bv = (ex * dy - ey * dx) / l; }
  }
  return { s: bs, v: bv, t: bs / (c[c.length - 1] || 1), d: Math.sqrt(best) };
}

/** Fur tufts along a closed polygon: every `period` units of arc the rim pokes out by amt (pointing along `lean`). */
export function furry(poly, amt, period = 3, seed = 0, lean = 0.5) {
  if (amt <= 0.05) return poly;
  const n = poly.length, c = [0]; for (let i = 1; i <= n; i++) c.push(c[i - 1] + len(sub(poly[i % n], poly[i - 1])));
  const per = period, out = [];   // fixed spacing: tufts slide continuously as the outline stretches (no count jumps)
  let area = 0; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n], d = nrm(sub(b, a)), no = [d[1] * sgn, -d[0] * sgn];
    const ph = frac(c[i] / per), hgt = amt * (0.65 + 0.7 * frac(Math.sin((Math.floor(c[i] / per) + seed) * 12.9898) * 43758.5453));
    const tuft = ph < 0.7 ? (ph / 0.7) * hgt : hgt * (1 - (ph - 0.7) / 0.3);
    out.push([poly[i][0] + no[0] * tuft + d[0] * tuft * lean, poly[i][1] + no[1] * tuft + d[1] * tuft * lean]);
  }
  return out;
}

// ---------------------------------------------------------------- coverage (one per actor draw)
export function coverage(x0, y0, x1, y1) { x0 = Math.floor(x0); y0 = Math.floor(y0); const W = Math.max(1, Math.ceil(x1) - x0), H = Math.max(1, Math.ceil(y1) - y0); return { x0, y0, W, H, m: new Uint8Array(W * H) }; }
const covAt = (cov, X, Y) => { const x = X - cov.x0, y = Y - cov.y0; return x >= 0 && y >= 0 && x < cov.W && y < cov.H && cov.m[y * cov.W + x] === 1; };

/** Rasterise the union of polygons into a mask over its bbox (+3 px). Returns null when empty/off-screen-small. */
export function rasterise(polys, clip = null) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const q of p) { if (q[0] < x0) x0 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[0] > x1) x1 = q[0]; if (q[1] > y1) y1 = q[1]; }
  if (!isFinite(x0)) return null;
  x0 = Math.floor(x0) - 3; y0 = Math.floor(y0) - 3; x1 = Math.ceil(x1) + 3; y1 = Math.ceil(y1) + 3;
  if (clip) { x0 = Math.max(x0, clip[0] - 3); y0 = Math.max(y0, clip[1] - 3); x1 = Math.min(x1, clip[2] + 3); y1 = Math.min(y1, clip[3] + 3); }
  const W = x1 - x0, H = y1 - y0; if (W <= 0 || H <= 0) return null;
  const m = new Uint8Array(W * H), xs = [];
  for (const poly of polys) {
    let py0 = Infinity, py1 = -Infinity; for (const q of poly) { if (q[1] < py0) py0 = q[1]; if (q[1] > py1) py1 = q[1]; }
    const ya = Math.max(0, Math.floor(py0) - y0), yb = Math.min(H - 1, Math.ceil(py1) - y0), np = poly.length;
    for (let y = ya; y <= yb; y++) {
      const yc = y0 + y + 0.5; xs.length = 0;
      for (let i = 0; i < np; i++) { const a = poly[i], b = poly[(i + 1) % np]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
      if (xs.length < 2) continue; xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.max(0, R(xs[k]) - x0), xb = Math.min(W, R(xs[k + 1]) - x0); for (let x = xa; x < xb; x++) m[y * W + x] = 1; }
    }
  }
  return { x0, y0, W, H, m };
}

const P = { dv: 0, ramp: null, col: null };
/**
 * Draw the union of polygons (screen px) with volume shading.
 * o: ramp, base, gain, slope, thick (px), light [x,y] (direction light comes FROM), rimLit, rimShade,
 *    outline (dark silhouette line), litOutline (line on the lit side, null = outline), inner (line colour where the
 *    outside neighbour is already cat; "fill" = no line, null = outline), paint(X, Y, P) (P.dv tone offset, P.ramp swap,
 *    P.col flat colour), clip [x0,y0,x1,y1] screen rect worth drawing.
 */
export function shade(g, polys, o, cov = null) {
  const mk = rasterise(polys, o.clip); if (!mk) return null;
  const { x0, y0, W, H, m } = mk;
  const ramp = o.ramp, base = o.base ?? 3.4, gain = o.gain ?? 1.6, slope = o.slope ?? 1, thick = Math.max(1, o.thick ?? 12);
  const light = o.light ?? [-0.7, -0.75], rimLit = o.rimLit ?? 1, rimShade = o.rimShade ?? 1, outline = o.outline ?? ramp[0];
  const litOutline = o.litOutline ?? null, inner = o.inner ?? null, paint = o.paint ?? null;
  const d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = m[i] ? 1e9 : 0;
  if (cov && o.dtCov) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!m[i] && covAt(cov, x0 + x, y0 + y)) d[i] = 1e9; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 1.414); } d[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x < W - 1) v = Math.min(v, d[i + 1] + 1); if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + W - 1] + 1.414); } d[i] = v; }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]);
  const yr = o.yRange, yN = yr ? (Y) => (Y - yr[0]) / (yr[1] - yr[0] || 1) : (Y) => (Y - y0) / H;
  const ln = Math.hypot(light[0], light[1]) || 1, ux = light[0] / ln, uy = light[1] / ln;
  const lx3 = R(ux * 3), ly3 = R(uy * 3), sx4 = R(-ux * 4), sy4 = R(-uy * 4), lx1 = R(ux * 1.5), ly1 = R(uy * 1.5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!m[i]) continue;
    const X = x0 + x, Y = y0 + y;
    const oL = !at(x - 1, y), oR = !at(x + 1, y), oU = !at(x, y - 1), oD = !at(x, y + 1);
    if (oL || oR || oU || oD) {
      let innerEdge = false;
      if (cov && inner) innerEdge = (!oL || covAt(cov, X - 1, Y)) && (!oR || covAt(cov, X + 1, Y)) && (!oU || covAt(cov, X, Y - 1)) && (!oD || covAt(cov, X, Y + 1));
      if (!innerEdge) { const lit = litOutline && !at(x + lx1, y + ly1); g.px(X, Y, lit ? litOutline : outline); continue; }
      if (inner !== "fill" && inner !== "shade") { g.px(X, Y, inner); continue; }
      if (inner === "shade" && ((o.mergeTop && oU && !oD) || (o.lineIf && !o.lineIf(X, Y)))) {
        // top edge over the body: merge (no crease line) so limbs grow out of the body
      } else if (inner === "shade") {
        // soft inner line: the local fill tone, darker by innerDv (selective outline)
        let v = base + gain * Math.pow(Math.min(1, d[i] / thick), 0.6) - slope * yN(Y) + (o.innerDv ?? -1.7);
        if (!at(x + lx3, y + ly3)) v += rimLit * 0.5;
        g.px(X, Y, ramp[Math.max(1, Math.min(ramp.length - 1, Math.round(v)))]); continue;
      }
    }
    const t = Math.min(1, d[i] / thick);
    let v = base + gain * Math.pow(t, 0.6) - slope * yN(Y);
    if (!at(x + lx3, y + ly3) && !(cov && o.rimCov !== false && covAt(cov, X + lx3, Y + ly3))) v += rimLit;
    if (!at(x + sx4, y + sy4)) v -= rimShade;
    let rp = ramp;
    if (paint) { P.dv = 0; P.ramp = null; P.col = null; paint(X, Y, P); if (P.col) { g.px(X, Y, P.col); continue; } v += P.dv; if (P.ramp) rp = P.ramp; }
    const fl = Math.floor(v), f = v - fl, q = f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl;
    g.px(X, Y, rp[Math.max(1, Math.min(rp.length - 1, q))]);
  }
  if (cov) for (let y = 0; y < H; y++) { const Y = y0 + y - cov.y0; if (Y < 0 || Y >= cov.H) continue; for (let x = 0; x < W; x++) { if (!m[y * W + x]) continue; const X = x0 + x - cov.x0; if (X >= 0 && X < cov.W) cov.m[Y * cov.W + X] = 1; } }
  return mk;
}

/** A view of canvas c that only writes pixels whose Bayer threshold lies in [lo, hi) (copied from cat-zoomies layout.mjs):
 *  gate(c, 0, k) for the new state and gate(c, k, 1) for the old one give a clean pixel crossfade between two drawings. */
export function gate(c, lo, hi) {
  if (lo <= 0 && hi >= 1) return c;
  const o = Object.create(c);
  o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) c.px(x, y, col); };
  return o;
}
