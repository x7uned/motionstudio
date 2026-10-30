// LV6 · the cheetah: a cute chibi cheetah (golden spotted coat, black "tear lines" from the eyes to the mouth, glossy amber
// eyes, blush, white muzzle, ringed tail with a white tip). The body is seen from the side running right, the big head is
// turned to the camera. One continuous rig: crouch → sprint (rotary gallop on the spot, the spine flexes and stretches) →
// skid → wobbly stand; a second rig lies on its side panting (they crossfade during the flop). Ghost copies (flat
// silhouettes) make the blur trail behind the sprint. ICON(): the same head, ~56 px.
import { blob, flat, ell, tube, eye, blush, smile, mouthW, nose, RAMP, sm, ease, lerp, rnd, fade, mix, bayer, clamp01, smooth } from "../cute.mjs";
import { spriteCache, xf, ik, ribbon, wavy, softSmile } from "./racecourse-kit.mjs";

const R = Math.round;
// ---------------------------------------------------------------- palette (sunset light)
export const COAT = ["#2A1206", "#5A2C0C", "#8A4A14", "#B86C1E", "#DA902C", "#EEB246", "#F8CE74", "#FFE6A8"];
const COAT_FAR = ["#1E0C04", "#3E1E08", "#62340E", "#844C16", "#A46620", "#BE8030", "#D49A48", "#E6B468"];
const CREAM = ["#4A3424", "#7A6048", "#A88E70", "#CCB496", "#E6D2B4", "#F4E6CE", "#FCF4E6", "#FFFFFF"];
const SPOT = "#1E0E06", SPOT2 = "#3A1C0A", OUT = "#160A04", LIT = "#FFE0A0", TEAR = "#100804";
const IRIS = RAMP.amber;

// ---------------------------------------------------------------- the head (drawn per frame: it may tilt when the cheetah flops)
/** Cheetah head at (x, y), rotation rot, scale s. o: look, blink, open (mouth), tongue (0..1 hanging out), tired (half lids), a. */
export function drawHead(c, x, y, o = {}) {
  const { rot = 0, s = 1, look = [0, 0], blink = 0, open = 0, tongue = 0, tired = 0, a = 1, earBack = 0, squint = 0, brows = 0 } = o, g = fade(c, a), P = xf(x, y, s, rot);
  // ears: small, round, dark backs with a cream inner
  for (const sd of [-1, 1]) {
    const E = xf(...P(sd * 31, -30), s, rot + sd * (0.32 + earBack * 0.5));
    blob(g, [E.poly(ell(0, -6, 13, 13))], { ramp: COAT, thick: 6, base: 3.0, gain: 1.6, outline: OUT, litOutline: LIT });
    flat(g, [E.poly(ell(0, -4, 7.5, 8))], "#F4E2C4");
    flat(g, [E.poly(ell(0, -1, 4, 4))], "#E8B8A0");
  }
  blob(g, [P.poly(ell(0, -2, 44, 38)), P.poly(ell(-27, 14, 21, 20)), P.poly(ell(27, 14, 21, 20)), P.poly(ell(0, 20, 28, 22))], { ramp: COAT, thick: 24, base: 3.0, gain: 2.4, slope: 0.4, outline: OUT, litOutline: LIT });
  // white cheeks and muzzle, white "eyeliner" under the eyes
  blob(g, [P.poly(ell(-11, 24, 15, 13)), P.poly(ell(11, 24, 15, 13)), P.poly(ell(0, 32, 13, 9))], { ramp: CREAM, thick: 8, base: 4.4, gain: 1.6, outline: COAT[3], litOutline: CREAM[6] });
  for (const sd of [-1, 1]) flat(g, [smooth(P.poly([[sd * 6, 8], [sd * 18, 12], [sd * 30, 7], [sd * 28, 10], [sd * 18, 16], [sd * 8, 12]]), new Set(), 3)], CREAM[5]);
  // forehead spots
  for (const [dx, dy, r] of [[-12, -26, 2.2], [-3, -31, 1.8], [7, -27, 2.2], [15, -32, 1.6], [-20, -19, 1.6], [20, -20, 1.8], [0, -21, 1.6], [-8, -36, 1.4], [10, -38, 1.3], [-34, 0, 1.6], [34, 2, 1.6], [-37, 10, 1.2], [37, 12, 1.2]]) { const p = P(dx, dy), rr = r * s; for (let Y = -2; Y <= 2; Y++) for (let X = -2; X <= 2; X++) if (X * X + Y * Y <= rr * rr) g.px(R(p[0]) + X, R(p[1]) + Y, SPOT2); }
  // eyes
  const half = Math.max(blink, tired * 0.5, squint * 0.35);
  for (const sd of [-1, 1]) { const e = P(sd * 18, -3); eye(g, e[0], e[1], 11 * s, { ry: 12.5 * s, iris: IRIS, pupil: "round", look, blink: half, lid: COAT[4], outline: OUT }); }
  // determined brows (sprint): short slanted strokes over the inner eye corners
  if (brows > 0.05) { const gb = fade(g, Math.min(1, brows * 1.5)); for (const sd of [-1, 1]) for (let k = 0; k <= 9; k++) { const p = P(sd * (8 + k), -18 - k * 0.45 * brows - 2); gb.px(R(p[0]), R(p[1]), OUT); gb.px(R(p[0]), R(p[1]) + 1, k < 7 ? OUT : COAT[3]); } }
  // tear lines: from the inner eye corners down along the muzzle to the mouth corners
  for (const sd of [-1, 1]) { for (let k = 0; k <= 14; k++) { const u = k / 14, p = P(sd * (9 + u * 8 + Math.sin(u * 3) * 1.5), 6 + u * 24); g.px(R(p[0]), R(p[1]), TEAR); g.px(R(p[0]) + sd, R(p[1]), u < 0.75 ? TEAR : COAT[2]); } }
  // nose, mouth (closed "w" smile / open pant with a tongue)
  { const n = P(0, 17); nose(g, n[0], n[1], 5 * s, "#2A1410"); g.px(R(n[0]) - 2, R(n[1]), "#6A4A40"); }
  const m = P(0, 27), mo = Math.max(open, tongue * 0.6), km = sm(mo, 0.02, 0.16);
  if (km < 1) mouthW(fade(g, 1 - km), m[0], m[1], "#2A1208", 3);
  if (km > 0) {
    const gm = fade(g, km); softSmile(gm, m[0], m[1] - 1, 6 * s, mo, { col: "#2A1208", tongue: "#F07090" });
    if (tongue * 13 >= 1) { const tl = tongue * 13, tx = m[0] + 1, ty = m[1] + 3 + mo * 4; for (let Y = 0; Y <= tl; Y++) { const hw = Y < tl - 2 ? 4 : Y < tl - 1 ? 3 : 2; for (let X = -hw; X <= hw; X++) gm.px(R(tx + X), R(ty + Y), Math.abs(X) === hw || Y === R(tl) ? "#8A2040" : X === 0 && Y > 2 ? "#D85078" : "#F07898"); } }
  }
  for (const sd of [-1, 1]) { const b = P(sd * 31, 15); blush(g, b[0], b[1], 7 * s, 3.6 * s); }
  // whisker dots
  for (const sd of [-1, 1]) for (const [dx, dy] of [[10, 25], [13, 28], [9, 30]]) { const p = P(sd * dx, dy); g.px(R(p[0]), R(p[1]), CREAM[2]); }
}

// ---------------------------------------------------------------- body rig
const SPOTS = (() => { const out = []; for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) { const k = i * 4 + j; out.push([(i + 0.25 + (j & 1) * 0.5 + (rnd(k * 7 + 1) - 0.5) * 0.4) / 9.4, -0.78 + j * 0.5 + (rnd(k * 13 + 5) - 0.5) * 0.22, 1.5 + rnd(k * 3) * 0.9]); } return out; })();
const LEGSPOTS = (() => { const out = []; for (let i = 0; i < 5; i++) out.push([0.15 + i * 0.17 + rnd(i) * 0.06, (rnd(i * 5) - 0.5) * 0.9]); return out; })();
const FORE = [38, 38], HIND = [38, 40], PAW = 6;
/**
 * The standing / running cheetah with the ground point at screen (gx, gy). pose: { hip: [x, y], sh: [x, y], arch, head: [x, y],
 * headRot, feet: {id: [x, y]} (local foot points, y ≤ 0), tail: {w (wind 0..1), curl, ph}, face, lean }.
 * ghost: draw a flat silhouette in `ghost.col` dissolved by ghost.a (blur trail).
 */
export function drawCheetah(c, gx, gy, pose, ghost = null) {
  const Lc = (p) => [gx + p[0], gy + p[1]];
  const Hp = Lc(pose.hip), Sh = Lc(pose.sh), mid = [(Hp[0] + Sh[0]) / 2, (Hp[1] + Sh[1]) / 2 - pose.arch];
  const spine = [], N = 14; for (let i = 0; i <= N; i++) { const t = i / N, u = 1 - t; spine.push([u * u * Hp[0] + 2 * u * t * mid[0] + t * t * Sh[0], u * u * Hp[1] + 2 * u * t * mid[1] + t * t * Sh[1]]); }
  const rad = (u) => lerp(31, 34, u) - 3 * Math.sin(Math.PI * u) * (1 - u * 0.3);
  const torso = [ribbon(spine, rad), ell(Hp[0] - 2, Hp[1], 32, 32), ell(Sh[0] + 4, Sh[1] + 2, 35, 35)];
  const H = Lc(pose.head), neck = tube([[Sh[0] + 4, Sh[1] - 6], [lerp(Sh[0], H[0], 0.5) + 4, lerp(Sh[1], H[1], 0.5)], [H[0] - 6, H[1] + 24]], 22, 19);
  const legs = {};
  for (const [id, piv] of [["hindFar", [Hp[0] + 10, Hp[1] + 8]], ["foreFar", [Sh[0] + 12, Sh[1] + 10]], ["hindNear", [Hp[0] - 2, Hp[1] + 12]], ["foreNear", [Sh[0] + 2, Sh[1] + 14]]]) {
    const fore = id.startsWith("fore"), near = id.endsWith("Near"), [a, b] = fore ? FORE : HIND, F = Lc(pose.feet[id]);
    const k = ik(piv, F, a, b, fore ? 1 : -1), K = k.knee, Fo = k.foot, r0 = near ? 16 : 13.5, r1 = near ? 9.5 : 8;
    const up = tube([piv, K], r0, near ? 11 : 9.5), lo = tube([K, Fo], near ? 10.5 : 9, r1), paw = ell(Fo[0] + (fore ? 3 : 2), Fo[1] + 1, near ? 12 : 10, PAW + 1);
    legs[id] = { up, lo, paw, K, F: Fo, piv };
  }
  // tail: long, thick, streaming back with an S-wave; dark rings toward the end and a white tip
  const tw = pose.tail, tr = [Hp[0] - 22, Hp[1] - 8];
  const tp1 = [tr[0] - lerp(30, 60, tw.w), tr[1] + lerp(46, -10, tw.w) + tw.curl * 10], tp2 = [tr[0] - lerp(18, 128, tw.w) + tw.curl * 6, tr[1] + lerp(72, -8, tw.w) - tw.curl * 40];
  const tpts = wavy(tr, tp1, tp2, 20, (u) => u * lerp(3, 13, tw.w), tw.ph, lerp(0.5, 1.0, tw.w)), tail = ribbon(tpts, (u) => lerp(10, 7, u));
  if (ghost) {
    const g = fade(c, ghost.a);
    for (const p of [tail, legs.hindFar.up, legs.hindFar.lo, legs.foreFar.up, legs.foreFar.lo, ...torso, neck, legs.hindNear.up, legs.hindNear.lo, legs.foreNear.up, legs.foreNear.lo, legs.hindNear.paw, legs.foreNear.paw]) g.poly(p, ghost.col);
    g.poly(ell(H[0], H[1], 44, 40), ghost.col);
    return;
  }
  const farO = { ramp: COAT_FAR, thick: 7, base: 2.6, gain: 1.4, outline: OUT, litOutline: COAT_FAR[5] };
  for (const id of ["hindFar", "foreFar"]) { const q = legs[id]; blob(c, [q.up, q.lo, q.paw], farO); spotsOnLeg(c, q, 0.8); }
  blob(c, [tail], { ramp: COAT, thick: 6, base: 3.0, gain: 1.6, outline: OUT, litOutline: LIT });
  for (let i = 0; i < tpts.length; i++) { const u = i / (tpts.length - 1), [x, y] = tpts[i];
    if (u > 0.55 && u < 0.92 && (i % 3 === 0)) { const r = lerp(8, 5, u); for (let k = -R(r); k <= R(r); k++) { const nx = tpts[Math.min(tpts.length - 1, i + 1)][0] - tpts[Math.max(0, i - 1)][0], ny = tpts[Math.min(tpts.length - 1, i + 1)][1] - tpts[Math.max(0, i - 1)][1], d = Math.hypot(nx, ny) || 1; c.px(R(x - (ny / d) * k), R(y + (nx / d) * k), SPOT); c.px(R(x - (ny / d) * k + nx / d), R(y + (nx / d) * k + ny / d), SPOT); } }
    else if (u > 0.2 && u <= 0.55 && i % 3 === 1) { c.px(R(x), R(y) - 2, SPOT2); c.px(R(x) + 1, R(y) - 2, SPOT2); c.px(R(x), R(y) + 2, SPOT2); } }
  { const tip = tpts[tpts.length - 1]; for (let Y = -5; Y <= 5; Y++) for (let X = -5; X <= 5; X++) if (X * X + Y * Y <= 22) c.px(R(tip[0]) + X, R(tip[1]) + Y, X * X + Y * Y > 15 ? OUT : X + Y < -2 ? "#FFFFFF" : CREAM[5]); }
  // torso + neck (one shaded mass), a cream chest bib, spots along the spine-relative coordinates
  blob(c, [...torso, neck], { ramp: COAT, thick: 30, base: 2.7, gain: 2.2, slope: 0.6, outline: OUT, litOutline: LIT });
  blob(c, [ell(Sh[0] + 26, Sh[1] + 10, 14, 22), ell(H[0] - 2, H[1] + 40, 17, 14)], { ramp: CREAM, thick: 8, base: 4.2, gain: 1.4, outline: COAT[3], litOutline: CREAM[6] });
  for (const [u, v, r] of SPOTS) {
    const i = Math.min(N - 1, Math.floor(u * N)), f = u * N - i, p = [lerp(spine[i][0], spine[i + 1][0], f), lerp(spine[i][1], spine[i + 1][1], f)];
    const dx = spine[i + 1][0] - spine[i][0], dy = spine[i + 1][1] - spine[i][1], d = Math.hypot(dx, dy) || 1, rr = rad(u) * 0.92 * v;
    const x = p[0] - (dy / d) * rr, y = p[1] + (dx / d) * rr; if (v > 0.3 && u > 0.78) continue;   // keep the chest bib clean
    for (let Y = -2; Y <= 2; Y++) for (let X = -2; X <= 2; X++) if (X * X + Y * Y <= r * r) c.px(R(x) + X, R(y) + Y, Y < 0 || X < 0 ? SPOT : SPOT2);
  }
  for (const id of ["hindNear", "foreNear"]) { const q = legs[id]; blob(c, [q.up, q.lo], { ramp: COAT, thick: 9, base: 3.0, gain: 1.8, outline: OUT, litOutline: LIT }); spotsOnLeg(c, q, 1); blob(c, [q.paw], { ramp: COAT, thick: 5, base: 3.6, gain: 1.4, outline: OUT, litOutline: LIT }); for (let k = -1; k <= 1; k++) { c.px(R(q.F[0] + 4 + k * 4), R(q.F[1] + 4), COAT[2]); c.px(R(q.F[0] + 4 + k * 4), R(q.F[1] + 5), COAT[2]); } }
  drawHead(c, H[0], H[1], { ...pose.face, rot: pose.headRot ?? 0 });
  return { H, legs, Hp, Sh };
}
function spotsOnLeg(c, q, k) {
  for (const [u, v] of LEGSPOTS) { const A = u < 0.5 ? q.piv : q.K, B = u < 0.5 ? q.K : q.F, w = u < 0.5 ? u * 2 : (u - 0.5) * 2; if (u > 0.85) continue; const x = lerp(A[0], B[0], w) + v * 6 * k, y = lerp(A[1], B[1], w); c.px(R(x), R(y), SPOT); c.px(R(x) + 1, R(y), SPOT2); c.px(R(x), R(y) + 1, SPOT2); }
}

// ---------------------------------------------------------------- lying on its side, panting (after the flop)
/** The exhausted cheetah lying on its side under the acacia, ground point (gx, gy); br = breath 0..1, t for the tail tip. */
export function drawLying(c, gx, gy, o) {
  const { br = 0, t = 0, a = 1, face = {} } = o, g = fade(c, a), P = (x, y) => [gx + x, gy + y];
  const heave = br * 2.5;
  // far legs (hind and fore) stick out limp behind the body
  const farO = { ramp: COAT_FAR, thick: 7, base: 2.6, gain: 1.4, outline: OUT, litOutline: COAT_FAR[5], a };
  blob(c, [tube([P(-70, -30), P(-104, -22), P(-128, -14)], 10, 7), ell(...P(-130, -12), 9, 6), tube([P(52, -34), P(86, -30), P(112, -22)], 10, 7), ell(...P(114, -20), 9, 6)], farO);
  // tail lying flat behind, the white tip twitching
  const tw = Math.sin(t * 2.4) * 0.6 + Math.sin(t * 5.1) * 0.3, tpts = wavy(P(-92, -30), P(-136, -14), P(-150, -54 - 10 * tw), 18, (u) => u * 2, t * 2, 0.6);
  blob(c, [ribbon(tpts, (u) => lerp(9, 6, u))], { ramp: COAT, thick: 6, base: 3.0, gain: 1.6, outline: OUT, litOutline: LIT, a });
  for (let i = 11; i < 17; i += 3) { const [x, y] = tpts[i]; for (let k = -6; k <= 6; k++) g.px(R(x), R(y) + k, SPOT); }
  { const tip = tpts[tpts.length - 1]; for (let Y = -5; Y <= 5; Y++) for (let X = -5; X <= 5; X++) if (X * X + Y * Y <= 22) g.px(R(tip[0]) + X, R(tip[1]) + Y, X * X + Y * Y > 15 ? OUT : X + Y < -2 ? "#FFFFFF" : CREAM[5]); }
  // the body: a long soft oval lying on the ground, the cream belly toward us, heaving with each pant
  const body = [ell(...P(-6, -36 - heave * 0.5), 92, 32 + heave), ell(...P(-70, -36), 32, 30), ell(...P(50, -40), 34, 34 + heave * 0.6)];
  blob(c, body, { ramp: COAT, thick: 28, base: 2.8, gain: 2.2, slope: 0.5, outline: OUT, litOutline: LIT, a });
  blob(c, [ell(...P(-4, -18 - heave * 0.3), 66, 13 + heave * 0.8)], { ramp: CREAM, thick: 8, base: 4.0, gain: 1.4, outline: COAT[3], litOutline: CREAM[6], a });
  for (const [u, v, r] of SPOTS) { if (v > 0.35) continue; const x = -90 + u * 170, y = -46 - v * 22 - heave * 0.5; for (let Y = -2; Y <= 2; Y++) for (let X = -2; X <= 2; X++) if (X * X + Y * Y <= r * r) g.px(R(gx + x) + X, R(gy + y) + Y, Y < 0 ? SPOT : SPOT2); }
  // near legs flopped out toward us: hind leg forward-down, fore legs stretched out
  const nearO = { ramp: COAT, thick: 9, base: 3.0, gain: 1.8, outline: OUT, litOutline: LIT, a };
  blob(c, [tube([P(-66, -24), P(-92, -8), P(-118, -6)], 12, 7.5), tube([P(46, -24), P(80, -12), P(110, -8)], 11, 7)], nearO);
  blob(c, [ell(...P(-120, -6), 10, 6), ell(...P(112, -7), 10, 6)], { ramp: CREAM, thick: 5, base: 3.8, gain: 1.2, outline: OUT, litOutline: CREAM[6], a });
  // head resting on the ground at the front, tilted, facing the camera
  drawHead(c, gx + 92, gy - 52 - heave * 0.3, { ...face, rot: -0.22, a });
}

// ---------------------------------------------------------------- ICON: the cheetah's head, ~56 px
const ICON_SPR = spriteCache(4);
export function ICON(c, cx, cy, a = 1) {
  const s = ICON_SPR("icon", 64, 64, 32, 34, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0);
    for (const sd of [-1, 1]) { const E = xf(...P(sd * 17, -15), 1, sd * 0.32); blob(g, [E.poly(ell(0, -3, 7, 7))], { ramp: COAT, thick: 4, base: 3.0, gain: 1.6, outline: OUT, litOutline: LIT }); flat(g, [E.poly(ell(0, -2, 4, 4))], "#F4E2C4"); }
    blob(g, [P.poly(ell(0, -1, 23, 20)), P.poly(ell(-14, 8, 11, 10)), P.poly(ell(14, 8, 11, 10)), P.poly(ell(0, 10, 15, 12))], { ramp: COAT, thick: 12, base: 3.0, gain: 2.3, slope: 0.4, outline: OUT, litOutline: LIT });
    blob(g, [P.poly(ell(-6, 13, 8, 7)), P.poly(ell(6, 13, 8, 7)), P.poly(ell(0, 17, 7, 5))], { ramp: CREAM, thick: 4, base: 4.4, gain: 1.4, outline: COAT[3], litOutline: CREAM[6] });
    for (const [dx, dy] of [[-6, -13], [0, -16], [6, -13], [-11, -10], [11, -10], [-3, -10], [4, -9], [-19, 1], [19, 1], [-17, -6], [17, -6]]) { const p = P(dx, dy); g.px(R(p[0]), R(p[1]), SPOT); g.px(R(p[0]) + 1, R(p[1]), SPOT2); g.px(R(p[0]), R(p[1]) + 1, SPOT2); }
    for (const sd of [-1, 1]) eye(g, ox + sd * 9, oy - 1, 6, { ry: 6.5, iris: IRIS, pupil: "round", lid: COAT[4], outline: OUT });
    for (const sd of [-1, 1]) for (let k = 0; k <= 9; k++) { const u = k / 9, x = R(ox + sd * (4 + u * 4.5)), y = R(oy + 3 + u * 13); g.px(x, y, TEAR); g.px(x + sd, y, u < 0.8 ? TEAR : COAT[2]); }
    nose(g, ox, oy + 9, 3, "#2A1410"); mouthW(g, ox, oy + 14, "#2A1208", 2);
    for (const sd of [-1, 1]) blush(g, ox + sd * 16, oy + 8, 4, 2);
  });
  s.blit(c, R(cx), R(cy), { a });
}
