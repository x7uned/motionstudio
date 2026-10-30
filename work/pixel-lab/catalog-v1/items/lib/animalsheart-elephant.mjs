// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-heart/film/levels/elephant-art.mjs (drawElephant; identical in
// animals-weight). Changes: import paths; the film's own Layer / spriteCache replaced by lib/roofs-kit.mjs (its blit
// writes through the engine's dissolve views), offscreen helpers it no longer needs removed; the ears are drawn live
// (the film cached them in 0.025-rad flap steps: 3–5 px jumps of the ear rims at catalog sizes) and the head sprite is
// cached in 0.005-rad tilt steps (was 0.02); the open mouth dissolves in over mouth 0.02–0.3 (it used to appear at
// 0.05 with a 3-px-high oval in one frame); `trunk` also accepts { up, feed } weights (blended continuously from the
// hanging pose) plus a new raised «trumpet» pose blended as a joint chain; a chest dome fills the gap between head and
// body that the film hid behind the hanging trunk; `smile` deepens the mouth curve continuously; lid colour and rim are options.
// The elephant faces the camera: big ears, glossy amber eyes with lashes, blush, tusks, a trunk with wrinkle rings.
import { blob, ell, tube, eye, blush, RAMP, fade, mix, lerp, ease, smooth, sm } from "./cute.mjs";
import { spriteCache } from "./roofs-kit.mjs";

const R = Math.round;

// ---------------------------------------------------------------- palette
export const GRAY = RAMP.gray;
export const EAR_IN = ["#2A1E2A", "#46303E", "#664452", "#865A66", "#A4727C", "#BE8C92", "#D4A8AA", "#E8C8C6"];
export const TUSK = ["#3A3020", "#6A5A40", "#9A8A68", "#C4B490", "#DED2B0", "#EEE6CC", "#F8F4E4", "#FFFFFF"];

/** Rotate + translate points: local [x, y] → screen, about the local origin, then offset by (ox, oy), scaled by s. */
function xf(ox, oy, s = 1, rot = 0) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (x, y) => [ox + (x * cs - y * sn) * s, oy + (x * sn + y * cs) * s];
  P.poly = (pts) => pts.map(([x, y]) => P(x, y)); P.s = s; P.rot = rot;
  return P;
}

// ---------------------------------------------------------------- cached parts (rim = warm lit outline)
const SPR = spriteCache(160);
const EAR = [[-52, -46], [-98, -74], [-146, -54], [-164, -6], [-152, 48], [-118, 86], [-80, 92], [-58, 60], [-50, 20]];
const EAR_IN_P = [[-60, -34], [-96, -56], [-134, -42], [-148, -4], [-138, 40], [-110, 70], [-82, 74], [-64, 48], [-58, 14]];
function earPoly(P, sd, flap, pts) { const a = flap * sd, ax = sd * 56, ay = 0, cs = Math.cos(a), sn = Math.sin(a); return smooth(pts.map(([x, y]) => { x *= sd; const dx = x - ax, dy = y - ay; return P(ax + (dx * cs - dy * sn) * (1 + flap * 0.25), ay + dx * sn + dy * cs); }), new Set(), 5); }
const RIM = (rim, k) => (rim ? mix(rim, "#FFFFFF", k) : null);
function bodySprite(s, rim) {
  return SPR(`EB${s}|${rim}`, R(300 * s), R(280 * s), R(150 * s), R(80 * s), (g) => {
    const P = xf(0, 0, s, 0);                         // anchor = head centre + (0, 110)
    for (const sd of [-1, 1]) blob(g, [smooth(P.poly([[sd * 66, 50], [sd * 104, 54], [sd * 108, 150], [sd * 100, 158], [sd * 70, 158], [sd * 64, 150]]), new Set(), 4)], { ramp: GRAY, thick: 12, base: 2.4, gain: 1.6, litOutline: rim });
    // catalog-v1: a higher chest dome joins the body to the head (the film hid the gap behind the hanging trunk)
    blob(g, [P.poly(ell(0, 60, 112, 78)), P.poly(ell(0, 10, 84, 70))], { ramp: GRAY, thick: 40, base: 2.8, gain: 2.4, slope: 0.8, litOutline: RIM(rim, 0.08) });
    for (const sd of [-1, 1]) {
      blob(g, [smooth(P.poly([[sd * 14, 50], [sd * 60, 50], [sd * 64, 152], [sd * 60, 160], [sd * 14, 160], [sd * 10, 152]]), new Set(), 4)], { ramp: GRAY, thick: 16, base: 3.0, gain: 2.0, litOutline: RIM(rim, 0.08) });
      for (const k of [-1, 0, 1]) { const p = P(sd * 37 + k * 14, 156); for (let j = -4; j <= 4; j++) { g.px(R(p[0] + j * s), R(p[1]), TUSK[j * j < 9 ? 6 : 4]); g.px(R(p[0] + j * s), R(p[1] - 1), j * j < 4 ? TUSK[7] : TUSK[5]); } g.px(R(p[0] - 5 * s), R(p[1]), GRAY[1]); g.px(R(p[0] + 5 * s), R(p[1]), GRAY[1]); }
      for (let j = 0; j < 3; j++) { const p = P(sd * 37, 100 + j * 10); for (let k = -12; k <= 12; k += 1) if (Math.abs(k) < 10 - j) g.px(R(p[0] + k * s), R(p[1] + Math.abs(k) * 0.1), GRAY[2]); }
    }
  });
}
/** Ears, live (flap is continuous). P = head transform (origin at the head centre). */
function drawEars(c, P, flap, rim) {
  for (const sd of [-1, 1]) {
    blob(c, [earPoly(P, sd, flap, EAR)], { ramp: GRAY, thick: 14, base: 3.0, gain: 1.8, litOutline: RIM(rim, 0.12) });
    blob(c, [earPoly(P, sd, flap, EAR_IN_P)], { ramp: EAR_IN, thick: 12, base: 3.4, gain: 1.6, outline: GRAY[2] });
  }
}
function headSprite(s, rot, rim) {
  const qr = R(rot / 0.005);
  return SPR(`EH${s}|${qr}|${rim}`, R(220 * s), R(200 * s), R(110 * s), R(100 * s), (g) => {
    const P = xf(0, 0, s, qr * 0.005);
    blob(g, [P.poly(ell(0, 4, 74, 64)), P.poly(ell(0, -16, 62, 56)), P.poly(ell(-40, 30, 32, 28)), P.poly(ell(40, 30, 32, 28))], { ramp: GRAY, thick: 30, base: 3.1, gain: 2.4, slope: 0.6, litOutline: RIM(rim, 0.15) });
    for (const [y, w] of [[-44, 16], [-38, 22]]) for (let k = -w; k <= w; k++) { const p = P(k, y + (k * k) / 120); g.px(R(p[0]), R(p[1]), GRAY[3]); }
    for (const sd of [-1, 1]) blob(g, [tube([P(sd * 20, 42), P(sd * 26, 56), P(sd * 24, 70)], 6 * s, 3 * s)], { ramp: TUSK, thick: 4, base: 4.2, outline: TUSK[1] });
  });
}

// ---------------------------------------------------------------- trunk poses (head-local, root at the nose)
/** Trunk control polylines: hang (resting, tip curled up), up (raised against the forehead, tip up-left), reachL (down-left),
 *  feed (curls under and brings the tip to the mouth). */
export const TRUNK = {
  hang: [[0, 6], [-2, 60], [0, 100], [6, 132], [16, 150], [28, 150], [32, 140]],
  up: [[0, 6], [-16, 58], [-44, 70], [-66, 42], [-62, 2], [-52, -24], [-40, -36]],
  reachL: [[0, 6], [-8, 58], [-30, 104], [-66, 140], [-104, 164], [-136, 182], [-150, 200]],
  grabL: [[0, 6], [-8, 58], [-30, 104], [-66, 140], [-104, 162], [-134, 176], [-144, 188]],
  feed: [[0, 6], [-2, 44], [-10, 76], [-26, 90], [-40, 78], [-36, 60], [-22, 52]],
};
/** catalog-v1: trumpet pose, the trunk raised in front of the forehead and hooked over to the right, tip flared up. */
export const TRUMPET = [[0, 6], [-4.7, -47.8], [5.7, -86.4], [29, -109.7], [49.7, -113.3], [61, -109.2], [69.4, -116.3]];
/** catalog-v1: blend two trunk polylines as joint chains (segment angles and lengths interpolate), so a raise swings the
 *  trunk out to the side and up instead of squashing it through the face. Angles are not wrapped (hang → trumpet goes
 *  through «pointing right»). */
export function chainMix(a, b, k) {
  let x = lerp(a[0][0], b[0][0], k), y = lerp(a[0][1], b[0][1], k); const out = [[x, y]];
  for (let i = 1; i < a.length; i++) {
    const ax = a[i][0] - a[i - 1][0], ay = a[i][1] - a[i - 1][1], bx = b[i][0] - b[i - 1][0], by = b[i][1] - b[i - 1][1];
    const ang = lerp(Math.atan2(ay, ax), Math.atan2(by, bx), k), len = lerp(Math.hypot(ax, ay), Math.hypot(bx, by), k);
    x += Math.cos(ang) * len; y += Math.sin(ang) * len; out.push([x, y]);
  }
  return out;
}
/** Blend two trunk polylines (k 0..1, eased by the caller). */
export function trunkMix(a, b, k) { return a.map(([x, y], i) => [lerp(x, b[i][0], k), lerp(y, b[i][1], k)]); }
function trunkPts(P, pts, t, sway) {
  pts = pts.map(([x, y], i) => { const sw = Math.sin(t * 1.7 + i * 0.5) * sway * (i / 6); return [x + sw * 8, y + Math.abs(sw) * 2]; });
  const out = []; for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < 4; j++) { const u = j / 4, a = pts[Math.max(0, i - 1)], b = pts[i], c2 = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)]; out.push([0, 1].map((q) => 0.5 * (2 * b[q] + (-a[q] + c2[q]) * u + (2 * a[q] - 5 * b[q] + 4 * c2[q] - d[q]) * u * u + (-a[q] + 3 * b[q] - 3 * c2[q] + d[q]) * u * u * u))); }
  out.push(pts[pts.length - 1]); return out.map(([x, y]) => P(x, y));
}

/**
 * The elephant: head centre (x, y); feet at y + 268·s. o: s (scale, quantise it: parts are cached per scale), rot (head
 * tilt about the neck), dip (head drops by dip px), flap (ear flap), blink, look, trunk (a TRUNK polyline, a 0..1
 * hang → up blend, or { up, feed, raise } weights; raise → TRUMPET), sway (trunk idle), happy (mouth line lower), smile (0..1 deeper curve),
 * mouth (0..1 open mouth under the trunk, centred at mouthX), lid (lid colour), rim (warm lit-outline colour),
 * before(P) (drawn between the head and the trunk). Returns { P, tp, tip } (head transform, trunk points, tip).
 */
export function drawElephant(c, x, y, t, o = {}) {
  const s = o.s ?? 1, rot = o.rot ?? 0, dip = o.dip ?? 0, rim = o.rim ?? "#F0A070";
  const pv = [x, y + 60 * s + dip];
  const cs = Math.cos(rot), sn = Math.sin(rot), P = (dx, dy) => { const px = dx * s, py = dy * s - 60 * s; return [pv[0] + px * cs - py * sn, pv[1] + px * sn + py * cs]; };
  if (!o.noBody) bodySprite(s, rim).blit(c, x, y + 110 * s);
  const hx = P(0, 0);
  drawEars(c, xf(hx[0], hx[1], s, rot), o.flap ?? 0, rim);
  headSprite(s, rot, rim).blit(c, hx[0], hx[1]);
  const g = c;
  const lk = o.look ?? [0, 0.1], bl = o.blink ?? 0, happy = o.happy ?? 0, smileK = o.smile ?? 0;
  for (const sd of [-1, 1]) {
    const e = P(sd * 32, -4); eye(g, e[0], e[1], 12.5 * s, { iris: RAMP.amber, pupil: "round", ry: 13.5 * s, look: lk, blink: bl, lid: o.lid ?? GRAY[4] });
    for (const [lx, ly] of [[13, -12], [15, -9], [16, -5]]) { const p = P(sd * (32 + lx), -4 + ly); g.px(R(p[0]), R(p[1]), GRAY[0]); g.px(R(p[0] + sd), R(p[1] - 1), GRAY[0]); }
    const b = P(sd * 48, 20); blush(g, b[0], b[1], (9 + 3 * smileK) * s, (4 + smileK) * s, "#F27A9A");
    for (let k = 0; k <= 7; k++) { const up = k > 4 ? (k - 4) * 0.8 * (1 + 1.6 * smileK) : 0, dn = smileK * 1.6 * Math.sin((Math.PI * k) / 9); const p = P(sd * (20 + k), 48 - up + happy * 1 + dn); g.px(R(p[0]), R(p[1]), GRAY[0]); }
  }
  // open mouth under the trunk root: a dark-pink oval with a lighter tongue; it dissolves in instead of popping
  const mo = o.mouth ?? 0, ma = sm(mo, 0.02, 0.3);
  if (ma > 0) {
    const gm = fade(c, ma), m = P(o.mouthX ?? 0, 50), rx = 10 * s, ry = (3 + 7 * mo) * s;
    for (let Y = R(m[1] - ry); Y <= R(m[1] + ry); Y++) for (let X = R(m[0] - rx); X <= R(m[0] + rx); X++) { const d = ((X - m[0]) / rx) ** 2 + ((Y - m[1]) / ry) ** 2; if (d > 1) continue; gm.px(X, Y, d > 0.72 ? GRAY[0] : Y > m[1] + ry * 0.25 ? "#E06A88" : "#5A1A2E"); }
  }
  o.before?.(P);
  const tr = o.trunk ?? 0;
  const tpCtl = Array.isArray(tr) ? tr : typeof tr === "number" ? trunkMix(TRUNK.hang, TRUNK.up, ease(tr)) : chainMix(trunkMix(trunkMix(TRUNK.hang, TRUNK.feed, tr.feed ?? 0), TRUNK.up, tr.up ?? 0), TRUMPET, tr.raise ?? 0);
  const tp = trunkPts(P, tpCtl, t, o.sway ?? 1);
  const root = P(0, 8);
  blob(g, [tube(tp, 19 * s, 8.5 * s), ell(root[0], root[1], 18 * s, 15 * s)], { ramp: GRAY, thick: 9, base: 3.3, gain: 1.6, outline: GRAY[1], litOutline: RIM(rim, 0.15) });
  for (let i = 3; i < tp.length - 2; i += 2) { const [ax, ay] = tp[i - 1], [bx, by] = tp[i + 1], dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy) || 1, r = lerp(19, 8.5, i / (tp.length - 1)) * s * 0.75; for (let k = -r; k <= r; k++) g.px(R(tp[i][0] - (dy / n) * k), R(tp[i][1] + (dx / n) * k), GRAY[2]); }
  const tip = tp[tp.length - 1]; g.px(R(tip[0]), R(tip[1]), GRAY[0]); g.px(R(tip[0]) + 1, R(tip[1]), GRAY[0]);
  return { P, tp, tip };
}
