// catalog-v1 adaptation (2026-10-26) of work/pixel-lab/zombie-mouse/film/pov-hands.mjs (drawHands1: the survivor's
// first-person hands) and its pov-shade.mjs volume shader. Kept from the film: the SKIN and HOOD ramps, the warm knuckle
// outline (KN / KN_LIT), the pillow volume shading in flat bands (vol, limb, smooth copied; vol now writes through
// c.px so the engine's dissolve views reach it), the back-of-hand fist with knuckle highlights and tendon creases, the
// ribbed hoodie cuff. Changed: the film baked one fixed crowbar grip into a full-frame sprite; here the right hand is a
// live rig seen from the back (thumb on the left): four fingers as joint chains whose flex foreshortens them into the
// knuckle bumps of a fist (bent segments fold behind the back of the hand), a thumb that swings out or tucks, finger
// spread, a press that shortens the index, a whole-hand rotation about the palm and a wave rotation about the wrist. The
// crowbar and the left hand are not ported. Ribs, creases and nails are drawn in hand-local space, so they turn with it.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;
const ramp = (...hexes) => hexes.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
export const HOOD = ramp("#0A0910", "#141220", "#1F1C2E", "#2B273E", "#393350", "#494266", "#5D5682", "#77709E");
export const SKIN = ramp("#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC");
const OUT = [10, 8, 14], KN = [42, 20, 20], KN_LIT = [156, 84, 58], NAIL = [246, 214, 192];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------- pov-shade.mjs (copied; vol draws through c.px)
/** Smooth closed outline through control points (Catmull-Rom). */
export function smooth(pts, seg = 4) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  return out;
}
/** A tapered limb (capsule chain) as a polygon: pts [[x,y],…], radii [r,…]. */
export function limb(pts, radii, seg = 6) {
  const L = [], Rr = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const r = radii[i]; L.push([pts[i][0] - dy * r, pts[i][1] + dx * r]); Rr.push([pts[i][0] + dy * r, pts[i][1] - dx * r]);
  }
  const capA = [], capB = [];
  const p0 = pts[0], p1 = pts[pts.length - 1], r0 = radii[0], r1 = radii[radii.length - 1];
  const a0 = Math.atan2(pts[1][1] - p0[1], pts[1][0] - p0[0]), a1 = Math.atan2(p1[1] - pts[pts.length - 2][1], p1[0] - pts[pts.length - 2][0]);
  for (let k = 1; k < seg; k++) { const a = a1 - Math.PI / 2 + (Math.PI * k) / seg; capB.push([p1[0] + Math.cos(a) * r1, p1[1] + Math.sin(a) * r1]); }
  for (let k = 1; k < seg; k++) { const a = a0 + Math.PI / 2 + (Math.PI * k) / seg; capA.push([p0[0] + Math.cos(a) * r0, p0[1] + Math.sin(a) * r0]); }
  return [...L, ...capB.reverse(), ...Rr.reverse(), ...capA.reverse()];
}
/** Fill the union of polygons with volume shading (flat bands, dither only in transitions, selective outline). */
export function vol(c, polys, o) {
  const rp = o.ramp, base = o.base ?? 3, gain = o.gain ?? 1.4, thick = o.thick ?? 8, slope = o.slope ?? 0.6;
  const [lx, ly] = o.light ?? [-0.8, -0.4], ln = Math.hypot(lx, ly) || 1, ux = lx / ln, uy = ly / ln, dirG = o.dir ?? 0;
  const rimLit = o.rimLit ?? 0.9, rimShade = o.rimShade ?? 0.8;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  x0 = Math.floor(x0) - 2; y0 = Math.floor(y0) - 2; x1 = Math.ceil(x1) + 2; y1 = Math.ceil(y1) + 2;
  const W = x1 - x0, H = y1 - y0; if (W <= 0 || H <= 0 || W * H > 4e6) return null;
  const m = new Uint8Array(W * H), xs = [];
  for (const poly of polys) for (let y = 0; y < H; y++) {
    const yc = y0 + y + 0.5; xs.length = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k]) - x0); x < Math.min(W, Math.round(xs[k + 1]) - x0); x++) m[y * W + x] = 1;
  }
  const INF = 1e9, d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = m[i] ? INF : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 1.414); } d[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x < W - 1) v = Math.min(v, d[i + 1] + 1); if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + W - 1] + 1.414); } d[i] = v; }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]);
  const cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2, hx = Math.max(1, (x1 - x0) / 2), hy = Math.max(1, (y1 - y0) / 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!m[i]) continue;
    const X = x0 + x, Y = y0 + y, b = bayer(X, Y);
    const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
    let col;
    if (edge && o.outline) {
      const litSide = !at(Math.round(x + ux * 1.6), Math.round(y + uy * 1.6));
      col = litSide && o.litOutline ? o.litOutline : o.outline;
    } else {
      const t = Math.min(1, d[i] / thick), yN = (Y - cym) / hy, xN = (X - cxm) / hx;
      let v = base + gain * Math.pow(t, 0.6) - slope * (yN * 0.5 + 0.5) + dirG * (xN * ux + yN * uy);
      if (!at(Math.round(x + ux * 2.5), Math.round(y + uy * 2.5))) v += rimLit;
      if (!at(Math.round(x - ux * 3.5), Math.round(y - uy * 3.5))) v -= rimShade;
      const fl = Math.floor(v), f = v - fl, qv = f < 0.34 ? fl : f > 0.66 ? fl + 1 : (f - 0.34) / 0.32 > b ? fl + 1 : fl;
      col = rp[Math.max(0, Math.min(rp.length - 1, qv))];
    }
    c.px(X, Y, col);
  }
  return true;
}

// ---------------------------------------------------------------- the rig (hand-local units, wrist at 0,0, fingers up)
const L = [-0.7, -0.7];
// fingers: knuckle (MCP) point, rest direction (deg from up, clockwise), spread direction, segment lengths, radii
const FINGERS = [
  { k: [-14, -45], a: -6, sp: -12, len: [20, 14, 11], r: [6.4, 5.9, 5.4, 5.0] },     // index
  { k: [-3.5, -48], a: 0, sp: -3, len: [22, 15, 12], r: [6.6, 6.1, 5.6, 5.2] },      // middle
  { k: [7, -46.5], a: 5, sp: 8, len: [20, 14, 11], r: [6.2, 5.7, 5.2, 4.8] },        // ring
  { k: [16.5, -41], a: 12, sp: 18, len: [15, 11, 9], r: [5.3, 4.9, 4.5, 4.1] },      // pinky
];
const FLEX = [82, 100, 68];                                    // joint flex at curl 1 (deg): MCP, PIP, DIP
const PALM = [[-21, 0], [-25, -18], [-24, -36], [-18, -46], [-6, -50], [6, -50], [16, -47], [22, -40], [24, -22], [20, -4], [12, 2], [-10, 3]];
const CUFF = [[-26, -2], [-8, -6], [10, -6], [26, -2], [28, 12], [27, 24], [0, 27], [-27, 24], [-28, 12]];
const THUMB = { b: [-21, -15], len: [16, 12], r: [7.4, 6.4, 5.6], out: [-56, -42], tuck: [-10, 18] };
export const PIVOT = [0, -30];                                 // rotation centre (palm middle)

/** Joint points of a finger (hand-local) for curl 0..1 (flex folds the segments away from the viewer). */
function fingerPts(F, curl, spread, press) {
  const al = ((F.a + F.sp * spread) * Math.PI) / 180, ux = Math.sin(al), uy = -Math.cos(al), pts = [F.k.slice()];
  let phi = 0, [x, y] = F.k;
  for (let j = 0; j < 3; j++) {
    phi += (FLEX[j] * curl * Math.PI) / 180;
    const l = F.len[j] * (j === 2 ? 1 - 0.25 * press : 1) * Math.cos(phi);
    x += ux * l; y += uy * l; pts.push([x, y]);
  }
  return { pts, phi, dir: [ux, uy] };
}

/**
 * Draw the hand. (x, y) = screen point of the palm pivot. o: s (scale), ang (rotation, rad; 0 = fingers up), wave
 * (extra rotation about the wrist), curl [index, middle, ring, pinky] 0..1, thumb 0 out → 1 tucked, spread 0..1,
 * press 0..1 (index tip pushes in). Returns { tip (index fingertip), dir (index direction), box, P }.
 */
export function drawHand(c, x, y, o = {}) {
  const s = o.s ?? 1, ang = o.ang ?? 0, wv = o.wave ?? 0, curl = o.curl ?? [0, 0, 0, 0], th = clamp01(o.thumb ?? 0), spread = o.spread ?? 0, press = o.press ?? 0;
  const cw = Math.cos(wv), sw = Math.sin(wv), ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (lx, ly) => {                                      // wrist wave, then the rotation about the pivot, then scale
    const wx = lx * cw - ly * sw, wy = lx * sw + ly * cw, dx = wx - PIVOT[0], dy = wy - PIVOT[1];
    return [x + (dx * ca - dy * sa) * s, y + (dx * sa + dy * ca) * s];
  };
  const PL = (pts) => pts.map(([a, b]) => P(a, b));
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }, grow = (p, r = 0) => { box.x0 = Math.min(box.x0, p[0] - r); box.y0 = Math.min(box.y0, p[1] - r); box.x1 = Math.max(box.x1, p[0] + r); box.y1 = Math.max(box.y1, p[1] + r); };
  // fingers first: their bent segments fold behind the back of the hand, which is drawn over them
  const fs = FINGERS.map((F, i) => fingerPts(F, curl[i], spread, i === 0 ? press : 0));
  for (let i = 3; i >= 0; i--) {
    const F = FINGERS[i], { pts } = fs[i], sp = PL(pts), polys = [];
    for (let j = 0; j < 3; j++) polys.push(limb([sp[j], sp[j + 1]], [F.r[j] * s, F.r[j + 1] * s], 6));
    vol(c, polys, { ramp: SKIN, base: 2.7 - i * 0.12, gain: 1.2, thick: 4 * s, light: L, dir: 1.0, rimLit: 1.2, rimShade: 0.9, slope: 0.3, outline: KN, litOutline: KN_LIT });
    for (const p of sp) grow(p, F.r[0] * s);
    // nail on the fingertip while the last segment still faces us; it shrinks and dissolves as the finger folds
    const na = 1 - sm(fs[i].phi, 0.35, 1.1);
    if (na > 0) {
      const [ux, uy] = fs[i].dir, tip = pts[3], nr = F.r[3] * 0.56, ru = nr * 0.8 * Math.max(0, Math.cos(fs[i].phi));
      const ncx = tip[0] - ux * (ru + 1.2), ncy = tip[1] - uy * (ru + 1.2), st = 0.45 / s;
      if (ru > 0.3) for (let q = -nr; q <= nr; q += st) for (let u = -ru; u <= ru; u += st) {
        const e = (q / nr) ** 2 + (u / ru) ** 2; if (e > 1) continue;
        const p = P(ncx - uy * q + ux * u, ncy + ux * q + uy * u), X = R(p[0]), Y = R(p[1]);
        if (na > bayer(X, Y)) c.px(X, Y, e > 0.45 ? SKIN[5] : u < 0 && q < 0 ? NAIL : SKIN[6]);
      }
    }
  }
  // back of the hand (pov-hands fist: base 2.9, gain 1.4, dir 1.3) with knuckle highlights and tendon creases
  const palm = PL(smooth(PALM, 4));
  vol(c, [palm], { ramp: SKIN, base: 2.9, gain: 1.4, thick: 10 * s, light: L, dir: 1.3, rimLit: 1.3, rimShade: 1.0, slope: 0.4, outline: KN, litOutline: KN_LIT });
  for (const p of palm) grow(p);
  for (let i = 0; i < 4; i++) {
    const k = FINGERS[i].k, h = P(k[0] - 1, k[1] + 5), X = R(h[0]), Y = R(h[1]);
    c.px(X, Y, SKIN[6]); c.px(X + 1, Y, SKIN[5]); c.px(X, Y + 1, SKIN[5]);
    if (i < 3) { const a = P(k[0] + 1, k[1] + 12), b = P(k[0] * 0.55 + 1, -14), n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let q = 0; q <= n; q += 2) c.px(R(a[0] + ((b[0] - a[0]) * q) / n), R(a[1] + ((b[1] - a[1]) * q) / n), SKIN[3]); }
  }
  // thumb: swings from out (open hand) to tucked along the index; drawn over the back of the hand
  {
    const T = THUMB, a1 = (lerp(T.out[0], T.tuck[0], th) * Math.PI) / 180, a2 = (lerp(T.out[1], T.tuck[1], th) * Math.PI) / 180;
    const p0 = T.b, p1 = [p0[0] + Math.sin(a1) * T.len[0], p0[1] - Math.cos(a1) * T.len[0]], p2 = [p1[0] + Math.sin(a2) * T.len[1], p1[1] - Math.cos(a2) * T.len[1]];
    const sp = PL([p0, p1, p2]);
    vol(c, [limb([sp[0], sp[1]], [T.r[0] * s, T.r[1] * s], 6), limb([sp[1], sp[2]], [T.r[1] * s, T.r[2] * s], 6)], { ramp: SKIN, base: 3.1, gain: 1.2, thick: 4 * s, light: L, dir: 1.0, rimLit: 1.4, rimShade: 0.9, slope: 0.3, outline: KN, litOutline: KN_LIT });
    for (const p of sp) grow(p, T.r[0] * s);
    const nl = P(p2[0] - Math.sin(a2) * 3 + 1.5, p2[1] + Math.cos(a2) * 3);
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 1]]) c.px(R(nl[0]) + dx, R(nl[1]) + dy, [238, 196, 170]);
  }
  // ribbed hoodie cuff over the wrist (ribs in hand-local space, so they turn with the hand)
  const cuff = PL(smooth(CUFF, 4));
  vol(c, [cuff], { ramp: HOOD, base: 3.0, gain: 1.1, thick: 6 * s, light: L, dir: 1, rimLit: 1.2, rimShade: 0.7, slope: 0.3, outline: OUT, litOutline: [82, 74, 112] });
  for (const p of cuff) grow(p);
  for (let rx = -21; rx <= 21; rx += 4.2) { const a = P(rx, 1.5), b = P(rx * 1.03, 22.5), n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let q = 0; q <= n; q++) c.px(R(a[0] + ((b[0] - a[0]) * q) / n), R(a[1] + ((b[1] - a[1]) * q) / n), HOOD[2]); }
  const F0 = fs[0], t0 = F0.pts[3], tipL = [t0[0] + F0.dir[0] * FINGERS[0].r[3] * Math.max(0, Math.cos(F0.phi)), t0[1] + F0.dir[1] * FINGERS[0].r[3] * Math.max(0, Math.cos(F0.phi))];
  const tip = P(tipL[0], tipL[1]), d0 = P(F0.pts[0][0], F0.pts[0][1]), dl = Math.hypot(tip[0] - d0[0], tip[1] - d0[1]) || 1;
  return { tip, dir: [(tip[0] - d0[0]) / dl, (tip[1] - d0[1]) / dl], box, P };
}
