// Dog series kit · shared helpers of the dog rig (dog.mjs side/front, dog-rest.mjs lying/curled, dog-turn.mjs turning).
// Pure geometry + small drawing helpers; moved verbatim out of dog.mjs (the film-1 drawings stay byte-identical).
import { blob, ell, fade } from "../../animals/film/cute.mjs";

export const R = Math.round, TAU = Math.PI * 2;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const rot = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
export const nrm = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
export const sm01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

export const RED = ["#3A0A10", "#6A1218", "#A01E22", "#D0342E", "#EC5A44", "#F8866A", "#FCB49C", "#FFE0D4"];
export const GOLD = ["#3A2604", "#7A5208", "#B07A10", "#D8A42A", "#F4CA50", "#FADD7A", "#FDF0A8", "#FFFBE0"];
export const SHADOW = "#0E2A12";

/** Two-bone IK: joint between A and B (segment lengths l1, l2); side +1 bends the joint backward (−x), −1 forward. */
export function ik(A, B, l1, l2, side) {
  const d0 = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1e-6, ux = (B[0] - A[0]) / d0, uy = (B[1] - A[1]) / d0;
  const st = Math.max(1, d0 / (l1 + l2 - 0.01)), L1 = l1 * st, L2 = l2 * st, d = Math.max(Math.abs(L1 - L2) + 1e-3, d0);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  return [A[0] + ux * a - uy * h * side, A[1] + uy * a + ux * h * side];
}
/** Curve by integrating heading: start, heading a0, length L, turn(s) = extra heading at s ∈ [0, 1]. */
export function chain(base, a0, L, turn, n = 12) {
  const out = [base.slice()]; let p = base.slice();
  for (let i = 1; i <= n; i++) { const s = (i - 0.5) / n, a = a0 + turn(s); p = [p[0] + (Math.cos(a) * L) / n, p[1] + (Math.sin(a) * L) / n]; out.push(p); }
  return out;
}
/** Fluffy tapered tube along pts: radius rf(s); tufts (little points) on the left (+1) / right (−1) side. */
export function plume(pts, rf, tufts = 0, side = 1, s0 = 0, s1 = 1) {
  const n = pts.length, Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], d = nrm(sub(b, a)), s = lerp(s0, s1, i / (n - 1)), r = rf(s);
    const tu = tufts && i > 0 && i < n - 1 && i % 2 === 0 ? tufts : 0;
    Lp.push([pts[i][0] - d[1] * (r + (side > 0 ? tu : 0)), pts[i][1] + d[0] * (r + (side > 0 ? tu : 0))]);
    Rp.push([pts[i][0] + d[1] * (r + (side < 0 ? tu : 0)), pts[i][1] - d[0] * (r + (side < 0 ? tu : 0))]);
  }
  const tip = pts[n - 1], a = pts[n - 2], ang = Math.atan2(tip[1] - a[1], tip[0] - a[0]), r1 = rf(s1), cap = [];
  for (let k = 1; k < 6; k++) { const q = ang - Math.PI / 2 + (Math.PI * k) / 6; cap.push([tip[0] + Math.cos(q) * r1, tip[1] + Math.sin(q) * r1]); }
  return [...Lp, ...cap.reverse(), ...Rp.reverse()];
}
export const tri = (a, b, c) => [a, b, c];
export const E = (c, rx, ry, a = 0, z = 1) => ell(c[0], c[1], rx, ry, a, Math.max(14, Math.min(48, Math.ceil((rx + ry) * z * 0.9))));

export const SENT = "#010203", SENT_L = "#010204";
export const inPolys = (X, Y, polys) => { for (const p of polys) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [ax, ay] = p[i], [bx, by] = p[j]; if ((ay > Y) !== (by > Y) && X < ((bx - ax) * (Y - ay)) / (by - ay) + ax) c = !c; } if (c) return true; } return false; };
/** A view that drops a part's outline pixels lying inside `under` (screen polygons) unless keep(X, Y) → crease colour. */
export function merge(g, under, keep, crease, out = "#07060E", lit = "#5A5490") {
  const v = Object.create(g);
  v.px = (X, Y, col) => {
    if (col !== SENT && col !== SENT_L) return g.px(X, Y, col);
    if (inPolys(X + 0.5, Y + 0.5, under)) { if (keep && keep(X, Y)) g.px(X, Y, crease); return; }
    g.px(X, Y, col === SENT ? out : lit);
  };
  return v;
}
export function lerp2(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
export function qbez(p0, p1, p2, n = 12) { const out = []; for (let i = 0; i <= n; i++) { const s = i / n, u = 1 - s; out.push([u * u * p0[0] + 2 * u * s * p1[0] + s * s * p2[0], u * u * p0[1] + 2 * u * s * p1[1] + s * s * p2[1]]); } return out; }
export const mirX = (pts, s) => pts.map(([px, py]) => [px * s, py]);

/** The gold tag hanging from screen point pa (anchor) to p (tag centre). */
export function drawTag(g, pa, p, z) {
  g.line(R(pa[0]), R(pa[1]), R(p[0]), R(p[1]), "#8A6418");
  blob(g, [ell(p[0], p[1] + 0.6 * z, 2.3 * z, 2.3 * z, 0, 16)], { ramp: GOLD, thick: 1.2 * z, base: 3.8, outline: "#5A3A08" });
  if (z >= 1.6) g.px(Math.floor(p[0] - 0.7 * z), Math.floor(p[1]), "#FFFBE0");
}
/** Three toe lines on a paw (screen points from T), dissolving in between zoom zlo and zlo + 0.5. */
export function toes(g0, T, P, pa, f, z, zlo = 1.3, spread = [-1.8, 0.6, 3.0], len = [0.4, 3.0]) {
  const v = sm01((z - zlo) / 0.5); if (v <= 0.02) return; const g = fade(g0, v);
  for (const dx of spread) {
    const a = T(add([P[0], P[1]], rot([dx, len[0]], pa))), b = T(add([P[0], P[1]], rot([dx, len[1]], pa)));
    g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#8A8AA0");
  }
}
/** A view that only writes pixels for which keep(X, Y) is true. */
export function clip(g, keep) { const v = Object.create(g); v.px = (X, Y, col) => { if (keep(Math.floor(X), Math.floor(Y))) g.px(X, Y, col); }; return v; }
