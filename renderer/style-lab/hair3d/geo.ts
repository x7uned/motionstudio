// Shared procedural world for the hair films: strand paths, ropes, heightfields and the neighbourhood layout.
// Deterministic (fixed seeds), pure functions of time — the five styles only change how it is drawn.
import { EV, clamp01, sm, lerp, hairLen, moundH, moundR, fillLevel, heroLift, ropeLen, blanketR, type V3 } from "./timeline";

// ---- deterministic noise ---------------------------------------------------------------------------------------------
export const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const h2 = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function noise2(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), u), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v);
}
export const fbm = (x: number, y: number) => noise2(x, y) * .55 + noise2(x * 2.1 + 5, y * 2.1 + 3) * .3 + noise2(x * 4.3 + 9, y * 4.3 + 1) * .15;

// ---- the hero (local frame: feet at origin, facing +z) ------------------------------------------------------------
export const HEAD = { y: 1.42, r: .24 };
export const ROOM = { half: 3, wall: 3.0 };
export const CAT_AT: [number, number] = [.82, .62];

export type Poly = { pts: Float32Array; cum: Float32Array; n: number; len: number };
function poly(points: V3[]): Poly {
  const n = points.length, pts = new Float32Array(n * 3), cum = new Float32Array(n);
  points.forEach((p, i) => { pts.set(p, i * 3); if (i) cum[i] = cum[i - 1] + Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1], p[2] - points[i - 1][2]); });
  return { pts, cum, n, len: cum[n - 1] };
}
/** Point at arc length s along a polyline (clamped). */
export function along(pl: Poly, s: number, out: V3 = [0, 0, 0]): V3 {
  if (s <= 0) { out[0] = pl.pts[0]; out[1] = pl.pts[1]; out[2] = pl.pts[2]; return out; }
  let lo = 0, hi = pl.n - 1;
  if (s >= pl.len) { out[0] = pl.pts[hi * 3]; out[1] = pl.pts[hi * 3 + 1]; out[2] = pl.pts[hi * 3 + 2]; return out; }
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pl.cum[m] < s) lo = m; else hi = m; }
  const k = (s - pl.cum[lo]) / Math.max(1e-6, pl.cum[hi] - pl.cum[lo]);
  for (let j = 0; j < 3; j++) out[j] = lerp(pl.pts[lo * 3 + j], pl.pts[hi * 3 + j], k);
  return out;
}

export type Strand = { pl: Poly; k: number; r: number; tone: number; alpha: number };
/** Strands from the scalp: over the head, down around the body, then out across the floor (front ±55° stays clear for the face). */
export function makeStrands(count: number, radius: number): Strand[] {
  const out: Strand[] = [];
  for (let i = 0; i < count; i++) {
    const alpha = (55 + 250 * ((i + rnd(i) * .7) / count)) * Math.PI / 180; // azimuth from the front (+z), sides and back
    const th0 = (6 + 88 * rnd(i + 91)) * Math.PI / 180, ca = Math.sin(alpha), cz = Math.cos(alpha);
    const R = HEAD.r + .012, pts: V3[] = [];
    // 1) along the meridian over the scalp to just below the head's equator
    for (let s = 0; s <= 10; s++) { const th = lerp(th0, 100 * Math.PI / 180, s / 10); pts.push([R * Math.sin(th) * ca, HEAD.y + R * Math.cos(th), R * Math.sin(th) * cz]); }
    // 2) falls around the body, flaring out, with a gentle per-strand wave
    const y0 = pts[pts.length - 1][1], ph = rnd(i + 7) * 6.28;
    for (let s = 1; s <= 28; s++) {
      const y = y0 * (1 - s / 28), q = 1 - y / y0, r = R * Math.sin(100 * Math.PI / 180) + .2 * Math.pow(q, .6) + .02 * Math.sin(q * 9 + ph);
      const a = alpha + .07 * Math.sin(q * 5 + ph);
      pts.push([r * Math.sin(a), Math.max(.015, y), r * Math.cos(a)]);
    }
    // 3) across the floor, outward along the azimuth with a slow curl
    const last = pts[pts.length - 1], r0 = Math.hypot(last[0], last[2]);
    for (let s = 1; s <= 30; s++) {
      const d = r0 + 2.3 * s / 30, a = alpha + .35 * Math.sin(s / 30 * 3 + ph) * (s / 30);
      pts.push([d * Math.sin(a), .015, d * Math.cos(a)]);
    }
    out.push({ pl: poly(pts), k: .88 + .24 * rnd(i + 3), r: radius * (.75 + .5 * rnd(i + 11)), tone: rnd(i + 17), alpha });
  }
  return out;
}
/** Visible strand length at time t. */
export const strandLen = (s: Strand, t: number) => Math.min(s.pl.len, hairLen(t) * s.k);

// ---- surfaces ----------------------------------------------------------------------------------------------------
/** Hair surface height inside the room (world y): mound around the feet, then the rising fill with slow waves. */
export function roomSurface(x: number, z: number, t: number): number {
  if (z > ROOM.half - .05) { const edge = roomSurface(x, ROOM.half - .05, t); return edge < .03 ? -.1 : lerp(edge, .05, sm(ROOM.half - .05, ROOM.half + 1.3, z) ** .7); }
  const d = Math.hypot(x, z), mR = moundR(t), mH = moundH(t);
  const mound = mH * Math.exp(-(d * d) / (mR * mR)) * (1 + .25 * (fbm(x * 1.7, z * 1.7) - .5));
  const F = fillLevel(t), wave = F > 0 ? (.07 * Math.sin(x * 2.1 + t * 2.3) * Math.cos(z * 1.7 - t * 1.9) + .1 * (fbm(x * .9 + t * .3, z * .9) - .5)) * sm(0, .4, F) : 0;
  return Math.max(mound, F + wave) - .02;
}
export const heroBase = (t: number) => heroLift(t);
export const catY = (t: number) => Math.max(roomSurface(CAT_AT[0], CAT_AT[1], t), heroLift(t) * .9);

// ---- neighbourhood ----------------------------------------------------------------------------------------------
export type House = { x: number; z: number; w: number; d: number; h: number; roof: number; hue: number; face: 1 | -1; ours?: boolean };
export const STREETS_Z = [36, 8, -20, -48], STREETS_X = [-51, -17, 17, 51];
export const HOUSES: House[] = (() => {
  const xs = [-44, -34, -24, -10, 0, 10, 24, 34, 44], rows: [number, 1 | -1][] = [[28, -1], [16, 1], [0, 1], [-12, -1], [-28, 1], [-40, -1]];
  const out: House[] = []; let i = 0;
  for (const [z, face] of rows) for (const x of xs) {
    i++;
    if (x === 0 && z === 0) { out.push({ x: 0, z: 0, w: 6, d: 6, h: ROOM.wall, roof: 1.6, hue: 0, face: 1, ours: true }); continue; }
    out.push({ x: x + (rnd(i) - .5) * 1.5, z: z + (rnd(i + 40) - .5) * 1.2, w: 5.2 + rnd(i + 5) * 1.8, d: 5 + rnd(i + 9) * 1.5, h: 2.6 + rnd(i + 13) * 1.4, roof: 1.2 + rnd(i + 21) * .9, hue: rnd(i + 33), face });
  }
  return out;
})();
export const TREES: { x: number; z: number; s: number }[] = (() => {
  const out: { x: number; z: number; s: number }[] = [];
  for (let i = 0; i < 70; i++) {
    const x = (rnd(i * 3 + 500) - .5) * 104, z = (rnd(i * 3 + 501) - .5) * 100 - 6;
    if (HOUSES.some(h => Math.abs(x - h.x) < h.w / 2 + 1.2 && Math.abs(z - h.z) < h.d / 2 + 1.2)) continue;
    if (STREETS_Z.some(s => Math.abs(z - s) < 3.2) || STREETS_X.some(s => Math.abs(x - s) < 3.2)) continue;
    out.push({ x, z, s: .8 + rnd(i + 900) * .6 });
  }
  return out;
})();
/** Ground-level obstacle height (roof ridges, tree tops) on a coarse lookup, so the blanket drapes over them. */
export function obstacle(x: number, z: number) {
  let h = 0;
  for (const b of HOUSES) {
    if (b.ours) continue;
    const dx = Math.abs(x - b.x) - b.w / 2, dz = Math.abs(z - b.z) - b.d / 2;
    if (dx < 1.8 && dz < 1.8) { const ridge = b.h + .4 + b.roof * clamp01(1 - Math.abs(z - b.z) / (b.d / 2 + .5)); h = Math.max(h, ridge * clamp01(1 - Math.max(dx - .4, dz - .4, 0) / 1.4)); }
  }
  for (const tr of TREES) { const d = Math.hypot(x - tr.x, z - tr.z); if (d < 1.8 * tr.s) h = Math.max(h, 3.2 * tr.s * (1 - d / (1.8 * tr.s))); }
  return h;
}
/** Bias: the hair runs further toward −x / −z (into the frame) so «half the neighbourhood» is a clear half. */
const reach = (x: number, z: number) => { const a = Math.atan2(z, x); return .72 + .36 * Math.max(0, -Math.cos(a - Math.PI * 1.15)) + .18 * (fbm(Math.cos(a) * 2 + 3, Math.sin(a) * 2 + 7) - .5); };
/** Coverage 0…1 of the outdoor hair blanket. */
export function coverage(x: number, z: number, t: number) {
  const inOurs = Math.abs(x) < ROOM.half + .05 && Math.abs(z) < ROOM.half + .05;
  if (inOurs) return 0;
  const d = Math.max(Math.abs(x), Math.abs(z)) * .5 + Math.hypot(x, z) * .5, R = blanketR(t) * reach(x, z);
  return sm(-2.2, 1.2, R - d);
}
/** Outdoor blanket height (0 = no hair). obstacles(x,z) is precomputed per grid vertex by the caller. */
export function blanketH(x: number, z: number, t: number, obs: number) {
  const c = coverage(x, z, t); if (c <= 0) return 0;
  const d = Math.hypot(x, z), R = blanketR(t) * reach(x, z), ridge = .9 * Math.exp(-((d - R + 1.6) ** 2) / 4);
  return c * (Math.max(.45, obs + .55) + .35 * fbm(x * .35 + t * .25, z * .35) + ridge);
}

// ---- ropes out of windows / the open front / the chimney --------------------------------------------------------------
export type Rope = { pl: Poly; delay: number; r: number };
export const ROPES: Rope[] = (() => {
  const H = ROOM.half, out: Rope[] = [];
  const mk = (start: V3, dir: [number, number], drop: number, wig: number, delay: number, r: number, up = 0) => {
    const pts: V3[] = []; let [x, y, z] = start;
    for (let s = 0; s <= 160; s++) {
      const u = s / 160, len = 26 * u;
      const fall = up ? start[1] + up * Math.sin(Math.min(1, len / 4) * Math.PI) - Math.max(0, len - 2) * .9 : start[1] - drop * sm(0, 2.2, len);
      const a = Math.atan2(dir[1], dir[0]) + wig * Math.sin(len * .35 + delay * 9) * sm(1, 4, len);
      if (s) { x += Math.cos(a) * 26 / 160; z += Math.sin(a) * 26 / 160; }
      y = Math.max(r * .7, fall);
      pts.push([x, y, z]);
    }
    out.push({ pl: poly(pts), delay, r });
  };
  // side windows (y 1.6) — left, right, back
  mk([-H, 1.55, -1.1], [-1, -.15], 1.4, .35, 0, .26); mk([-H, 1.55, 1.2], [-1, .25], 1.4, .3, .15, .24);
  mk([H, 1.55, -1.1], [1, -.2], 1.4, .35, .08, .26); mk([H, 1.55, 1.2], [1, .3], 1.4, .3, .22, .24);
  mk([0, 1.55, -H], [-.2, -1], 1.4, .3, .12, .26);
  // the open front: three thick falls onto the lawn
  mk([-1.7, .55, H + .9], [-.35, 1], .3, .4, .05, .34); mk([0, .6, H + 1], [0, 1], .3, .3, 0, .4); mk([1.7, .55, H + .9], [.4, 1], .3, .4, .1, .34);
  return out;
})();
export const ropeVisible = (r: Rope, t: number) => Math.min(r.pl.len, Math.max(0, ropeLen(t - r.delay)));

export { EV };
