// catalog-v1 copy (2026-10-26) of work/pixel-lab/dogs/kit/dog-rest.mjs; changes: import paths only (cute kit = catalog lib/cute.mjs, sibling files = lib/dogs-*.mjs).
// Dog series kit · the border collie RESTING (films 2 and 3): lying sphinx facing the camera (sleep on the crossed
// paws) and the curled-up donut seen from the side. Same dog, palette and scale as drawDogFront / drawDogSide; drawn
// from world units through G (G.z px per unit). Pure functions of their arguments; draw through any canvas view.
//
//   drawDogLie(c, G, x, y, t, o)    lying on the belly, facing the camera; o.sleep 0..1 lowers the head onto the paws
//   drawDogCurl(c, G, x, y, t, o)   lying side-on (curl 0) → curled-up donut asleep (curl 1)
import { blob, ell, tube, shadow, smooth, fade, mix, bayer } from "./cute.mjs";
import { BLK, WHT, LIT, EDGE, drawHead, mapper, qmix, coatOf } from "./dogs-dog-head.mjs";
import { R, TAU, clamp01, lerp, add, sub, mul, rot, nrm, sm01, RED, SHADOW, plume, tri, E, SENT, SENT_L, merge, lerp2, qbez, drawTag, toes, interior } from "./dogs-dog-parts.mjs";

const HS = 1.2;                                  // head scale (same as the side/front views)
export const LIE_HEAD = { awake: [0, -50], asleep: [0, -30.5] };

/**
 * Lying on the belly (sphinx), facing the camera: front paws forward, haunches at the sides, tail curled round the
 * right hip. (x, y) = lawn point under the chest. o: rise 0..1 (1 = chest, forearms and head up at the sitting
 * height — head exactly where drawDogFront has it — for the sit ↔ lie dissolve; animate rise 1 → 0 to lie down), sleep 0..1 (head lowers onto the crossing front paws, eyes close,
 * ears relax, breathing slows and deepens), look [dx, dy], blink, tilt −1..1, ears, wag (tail-tip sweep when awake),
 * lick, wet, dry, mouth, pant, sniff, brows, boop, happy, a. Returns screen anchors { nose, mouth, eyes, head, top }.
 */
export function drawDogLie(c, G, x, y, t = 0, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const g = fade(c, a), z = G.z, ox = G.X(x), oy = G.Y(y);
  const T = (p) => [ox + p[0] * z, oy + p[1] * z], TP = (pts) => pts.map(T);
  const sl = clamp01(o.sleep ?? 0), s = sm01(sl), s2 = sm01((sl - 0.25) / 0.75);
  const rs = sm01(clamp01(o.rise ?? 0)), CO = coatOf(o.coat), TW = CO.tail;          // rise 1: chest and head up at the sitting height (lying down from sitting)
  // breathing: awake ≈ 0.5 Hz shallow, asleep ≈ 0.27 Hz deeper (blended, so no phase jump while falling asleep)
  const br = lerp(0.45 * Math.sin(t * TAU * 0.5), 0.95 * Math.sin(t * TAU * 0.27), s);
  shadow(g, ox, oy - 1 * z, 46 * z, Math.max(2, 4.6 * z), SHADOW, 0.46);

  // haunches (folded hind legs) at the sides, with the white hind paws peeking forward
  const hn = [[-23.5, -12.4], [23.5, -12.4]];
  blob(g, hn.map((p) => TP(E(p, 12.6, 12.0 + 0.15 * br, 0, z))), { ramp: CO.body, thick: 7 * z, base: 2.6, gain: 2.1, outline: CO.out, litOutline: CO.lit });
  for (const sx of [-1, 1]) {
    const P = [sx * lerp(32.5, 27, rs), -2.9 + 0.6 * rs], hk = 1 - rs;
    if (hk <= 0.02) continue;
    blob(g, [TP(E(P, 5.6 * hk, 3.2 * hk, 0, z))], { ramp: CO.leg, thick: 2 * z, base: 3.9, gain: 1.4, outline: CO.edge });
    toes(g, T, P, 0, 1, z, 1.6, [-1.6, 0.2, 2.0], [-1.2, 0.6], CO.toe);
  }
  // tail: round the right hip, lying on the grass, white tip curling in toward the paws; sweeps a little when awake
  {
    const wag = clamp01(o.wag ?? 0.5) * (1 - s), sw = Math.sin(t * TAU * 2.0) * wag;
    const p0 = [29, -17], p1 = [45 + 1.5 * sw, -9], p2 = [38 + 3.5 * sw, 0.5], p3 = [25 + 5 * sw, 1.6 - 1.2 * Math.abs(sw)];
    const pts = cubic(p0, p1, p2, p3, 14), rf0 = (q) => lerp(4.6, 3.5, q) + 0.9 * Math.sin(Math.PI * q), rf = TW ? (q) => rf0(q) * TW.r : rf0;
    const tf = TW ? Math.round(14 * TW.tipFrac) : 9, tu = TW?.tufts ?? 1;
    blob(g, [TP(plume(pts, rf, 1.2 * tu, 1))], { ramp: CO.body, thick: 3 * z, base: 2.7, outline: CO.out, litOutline: CO.lit });
    blob(g, [TP(plume(pts.slice(tf), rf, 1.0 * tu, 1, tf / 14, 1))], TW ? { ramp: TW.tip, thick: 2 * z, base: TW.tipBase, outline: TW.tipOut } : { ramp: WHT, thick: 2 * z, base: 4.2, outline: EDGE });
  }
  // back / shoulders behind the chest
  blob(g, [TP(E([0, lerp(-21 + 1.5 * s, -35, rs) - 0.25 * br], lerp(25, 26.5, rs), lerp(17.5 - 1.2 * s, 26, rs) + 0.55 * br, 0, z))], { ramp: CO.body, thick: 9 * z, base: 2.6, gain: 2.3, outline: CO.out, litOutline: CO.lit });
  // the head: up (sphinx) → lowered onto the paws, a little tilted when asleep
  const tilt = Math.max(-1, Math.min(1, o.tilt ?? 0)), sniff = clamp01(o.sniff ?? 0);
  const HL = lerp2(lerp2(LIE_HEAD.awake, LIE_HEAD.asleep, s), [0, -69], rs), Hb = [HL[0], HL[1] + 0.35 * br * (0.3 + 0.7 * s)];
  const ta = tilt * 0.3 * (1 - 0.5 * s) + 0.1 * s2 + sniff * 0.012 * Math.sin(t * TAU * 5.1);
  // chest bib (white, between the forearms) + collar: visible below the chin while the head is up
  const chinY = Hb[1] + 19;
  const hy = lerp(-14, -25, rs), hem = []; for (let i = 0; i <= 6; i++) hem.push([10 - i * (20 / 6), hy + (i % 2 ? 2.6 : 0) - Math.abs(i - 3) * 0.5]);
  const bib = [[-8.5, chinY - 4], [0, chinY - 6], [8.5, chinY - 4], [lerp(12.5, 15, rs), lerp(chinY, hy - 2, 0.5)], [lerp(13.2, 15.5, rs), hy - 1], ...hem, [-lerp(13.2, 15.5, rs), hy - 1], [-lerp(12.5, 15, rs), lerp(chinY, hy - 2, 0.5)]];
  const bibS = [TP(smooth(bib, new Set([4, 5, 6, 7, 8, 9, 10, 11, 12]), 4))];
  blob(g, bibS, { ramp: CO.white, thick: 6 * z, base: 4.4, gain: 1.9, outline: CO.edge });
  // forearms + front paws; asleep the right paw slides over the left one (crossed paws)
  const paw = { l: lerp2(lerp2([-11.5, -3.6], [-7.5, -3.4], s), [-8.8, -2.6], rs), r: lerp2(lerp2([11.5, -3.6], [-0.5, -6.6], s), [8.8, -2.6], rs) };
  const arm = (P, sx, gg) => {
    const top = [sx * lerp(10.5, 8, rs), lerp(-21, -33, rs)], mid = lerp2(top, P, 0.55);
    blob(merge(gg, bibS, null, null, CO.edge, CO.edge), [TP(tube([top, [mid[0] + sx * 0.6, mid[1]], [P[0], P[1] - 1.5]], 5.4, 5.8))], { ramp: CO.leg, thick: 3 * z, base: 4.2, outline: SENT, litOutline: SENT_L });
  };
  const pawDraw = (P, gg, ang = 0) => {
    blob(gg, [TP(E(P, 7.6, 4.3, ang, z))], { ramp: CO.leg, thick: 2 * z, base: 4.6, gain: 1.4, outline: CO.edge });
    toes(gg, T, P, ang, 1, z, 1.1, [-3.4, -0.4, 2.6], [-0.4, 1.6], CO.toe);
  };
  arm(paw.l, -1, g); pawDraw(paw.l, g);
  // collar (under the chin; hidden by the lowered head)
  const cp = [0, chinY + lerp(0.8, -5, s)];
  if (CO.collar) blob(g, [TP(E(cp, lerp(12.4, 9, s), 2.3, 0, z))], { ramp: RED, thick: 1.4 * z, base: 3.5, outline: "#3A0A10" });
  if (CO.collar) { const sw = Math.sin(t * 3.2) * 0.25 * (1 - s), at = add(cp, [0, 2]), tg = add(at, [Math.sin(sw) * 2.4, Math.cos(sw) * 2.4]); drawTag(g, T(at), T(tg), z); }
  arm(paw.r, 1, g); pawDraw(paw.r, g, -0.12 * s);
  // head (eyes close, ears relax, the chin rests on the crossed paws)
  const hs = T(Hb), M = mapper(hs[0], hs[1], z, 1, ta, HS);
  const blink = Math.max(clamp01(o.blink ?? 0), sm01((sl - 0.2) / 0.5));
  const look = o.look ?? [0, 0], lk = [lerp(look[0], 0, s), lerp(look[1], 0.4, s)];
  const an = drawHead(g, M, { yaw: 1, t, ears: lerp(o.ears ?? 0.5, 0.04, s), earSwing: [0.2 * tilt - 0.1 * s, 0.24 * tilt + 0.1 * s], blink, look: lk, mouth: o.mouth ?? 0, pant: (o.pant ?? 0) * (1 - s), sniff, wet: o.wet ?? 0.5, dry: o.dry, brows: o.brows ?? 0, lick: o.lick, boop: o.boop, happy: o.happy, coat: o.coat });
  return { nose: an.nose, mouth: an.mouth, eyes: an.eyes, head: an.head, top: an.top };
}
function cubic(p0, p1, p2, p3, n) { const out = []; for (let i = 0; i <= n; i++) { const s = i / n, u = 1 - s; out.push([0, 1].map((j) => u * u * u * p0[j] + 3 * u * u * s * p1[j] + 3 * u * s * s * p2[j] + s * s * s * p3[j])); } return out; }

// ---------------------------------------------------------------- curled up (film 3)
// Three keys, seen from the side and a little from above: 0 = lying on the belly side-on (head up, facing +x, front
// paws forward, tail behind), 0.5 = the front half swung toward the camera (head facing the camera, lowered), 1 = the
// donut (back arched behind, head resting in front facing the tail, the tail wrapped round the front over the nose).
// Every number is interpolated by a monotone cubic through the three keys (C1, no overshoot), so curl is continuous.
const CURL = [
  { C: [6, -15], Cr: [17, 14.5], Rp: [-26, -14], Rr: [16.5, 14], arch: 0, H: [27, -38], psi: 0, ha: -0.04,
    fE: [12, -7], fP: [31, -4.2], gE: [8, -7], gP: [25, -4.0], hc: [-24, -13.5], hr: [11, 11.5], hk: [-28, -4.2], hP: [-17, -3.8], kE: [-21, -4.4], kP: [-10, -3.6],
    t0: [-41, -19], t1: [-54, -17], t2: [-63, -5], t3: [-74, -4.2], bib: [8.5, 1], bibR: [8.5, 11.5] },
  { C: [11, -14], Cr: [15.5, 13.5], Rp: [-22, -14.5], Rr: [16.5, 14.5], arch: 1.5, H: [16, -28], psi: Math.PI / 2, ha: 0,
    fE: [12, -6.5], fP: [20, -4.0], gE: [14, -6.5], gP: [27, -3.8], hc: [-21, -13], hr: [11.2, 11.2], hk: [-26, -4.2], hP: [-16, -3.8], kE: [-20, -4.2], kP: [-9, -3.6],
    t0: [-37, -18], t1: [-52, -13], t2: [-51, 2], t3: [-36, 2.4], bib: [4, 3], bibR: [9, 10] },
  { C: [13, -14.5], Cr: [15, 14], Rp: [-19, -15], Rr: [16.5, 15], arch: 3.2, H: [3, -18.5], psi: 0.7 * Math.PI, ha: -0.42,
    fE: [7, -6], fP: [-5, -3.8], gE: [12, -6], gP: [4, -3.6], hc: [-18.5, -12.5], hr: [11.5, 11], hk: [-24, -4], hP: [-14, -3.7], kE: [-18, -4], kP: [-8, -3.5],
    t0: [-33, -17], t1: [-50, -10], t2: [-34, 5.5], t3: [-8.5, -4.5], bib: [-5, 4], bibR: [7, 8] },
];
function curlKey(u) { return qmix(CURL[0], CURL[1], CURL[2], clamp01(u)); }
/** Standing side view (dog.mjs drawDogSide stand, t 0) in curl-rig terms: rise 1 → the lead dissolves from drawDogSide. */
const STAND = { C: [7, -35], Cr: [18.5, 17.6], Rp: [-29, -36], Rr: [17.6, 16.8], arch: 0, H: [30.2, -58.8], psi: 0, ha: 0,
  fE: [8, -20], fP: [13.4, -3.7], gE: [3, -20], gP: [6.4, -3.7], hc: [-27.5, -30.5], hr: [10.6, 12], hk: [-34, -13], hP: [-30.5, -3.8], kE: [-27, -13], kP: [-23.5, -3.8],
  t0: [-43, -43], t1: [-56, -40], t2: [-66, -44], t3: [-71, -53], bib: [9.5, 2.5], bibR: [10.2, 13.2] };
const mixK = (a, b, k) => (typeof a === "number" ? lerp(a, b, k) : Array.isArray(a) ? a.map((v, i) => mixK(v, b[i], k)) : Object.fromEntries(Object.keys(a).map((n) => [n, mixK(a[n], b[n], k)])));
/**
 * Lying side-on (curl 0) → curled up in a donut (curl 1), seen from the side and slightly above; (x, y) = lawn point
 * under the middle of the body. o: curl 0..1 (default 1), rise 0..1 (1 = standing up, matching drawDogSide's standing
 * dog for the stand ↔ lie dissolve; animate rise 1 → 0 at curl 0 to lie down), sleep 0..1 (eyes close, ears relax, slower deeper breathing), breath
 * 0..1 (breathing amplitude, default 1; driven by t), facing ±1 (+1: head starts on the right), look, blink, ears,
 * wet, dry, wag (tail-tip twitch while awake), a. Returns screen anchors { nose, mouth, eyes, head, top, tail }.
 */
export function drawDogCurl(c, G, x, y, t = 0, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const g = fade(c, a), f = (o.facing ?? 1) < 0 ? -1 : 1, z = G.z, ox = G.X(x), oy = G.Y(y);
  const T = (p) => [ox + f * p[0] * z, oy + p[1] * z], TP = (pts) => pts.map(T);
  const u = clamp01(o.curl ?? 1), rs = sm01(clamp01(o.rise ?? 0)), K = rs > 0 ? mixK(curlKey(u), STAND, rs) : curlKey(u), sl = clamp01(o.sleep ?? 0), s = sm01(sl);
  const CO = coatOf(o.coat), TW = CO.tail;
  const bA = o.breath ?? 1, br = bA * lerp(0.5 * Math.sin(t * TAU * 0.45), 0.9 * Math.sin(t * TAU * 0.27), s);
  shadow(g, T([lerp(-14, -3, u), 0])[0], oy, lerp(52, 44, u) * z, Math.max(2, 4.4 * z), SHADOW, 0.44);
  // tail: lying behind (curl 0) → wrapped round the front (curl 1); drawn behind, and dissolved in front as it comes round
  const wag = clamp01(o.wag ?? 0.3) * (1 - s), tw = Math.sin(t * TAU * 1.6) * wag;
  const tp = cubic(K.t0, K.t1, K.t2, add(K.t3, [1.5 * tw, -1.2 * Math.abs(tw)]), 16);
  const rf0 = (q) => lerp(4.6, 3.6, q) + lerp(1.1, 1.8, u) * Math.sin(Math.PI * q), rf = TW ? (q) => rf0(q) * TW.r : rf0;
  const tf = TW ? Math.round(16 * TW.tipFrac) : 10, tu = TW?.tufts ?? 1;
  const tail = (gg) => {
    blob(gg, [TP(plume(tp, rf, 1.3 * tu, -1))], { ramp: CO.body, thick: 3 * z, base: 2.7, outline: CO.out, litOutline: CO.lit });
    blob(gg, [TP(plume(tp.slice(tf), rf, 1.1 * tu, -1, tf / 16, 1))], TW ? { ramp: TW.tip, thick: 2 * z, base: TW.tipBase, outline: TW.tipOut } : { ramp: WHT, thick: 2 * z, base: 4.2, outline: EDGE });
  };
  const tailFront = sm01((u - 0.42) / 0.3);
  if (tailFront < 1) tail(g);
  // far front leg (darker, behind the body)
  const leg = (E0, P, gg, near) => {
    const fb = near ? 1 : sm01(Math.sin(K.psi) * 1.6 - 0.6);    // the far paw brightens while the chest faces the camera
    const st = { ramp: CO.leg, thick: 3 * z, base: lerp(2.6, 4.3, fb), gain: lerp(1.3, 1.5, fb), slope: lerp(0.6, 0.9, fb), outline: fb > 0.5 ? CO.edge : CO.farOut };
    blob(gg, [TP(tube([E0, lerp2(E0, P, 0.6), [P[0] - 3, P[1] - 0.4]], lerp(4.3, 6.0, rs), lerp(3.5, 5.0, rs))), TP(E([P[0] + 0.5, P[1]], 6.9, 4.2, 0, z))], st);
    if (near) toes(gg, T, P, 0, f, z, 1.4, [-0.6, 1.8, 4.0], [-1.2, 0.8], CO.toe);
  };
  leg(K.gE, K.gP, g, false);
  // far hind leg (only shows while standing up / lying down)
  if (rs > 0.001) blob(g, [TP(tube([add(K.hc, [2, 6]), add(K.kE, [0, -1])], 5.0 * rs, 4.3 * rs))], { ramp: CO.body, thick: 3 * z, base: 2.0, outline: CO.farTopOut });
  blob(g, [TP(tube([K.kE, [K.kP[0] - 2.5, K.kP[1] - 0.3]], lerp(3.6, 4.3, rs), 3.2)), TP(E(K.kP, 6.0, 3.8, 0, z))], { ramp: CO.leg, thick: 3 * z, base: 2.5, gain: 1.3, slope: 0.6, outline: CO.farOut });
  // body: chest + rump + the back between them (arched up as the spine curls away from us) + neck
  const hsc = HS, fh = K.psi <= Math.PI / 2 ? 1 : -1, yaw = fh > 0 ? K.psi / (Math.PI / 2) : (Math.PI - K.psi) / (Math.PI / 2);
  const H = add(K.H, [0, 0.35 * br]);
  // K.ha is the head's screen roll (facing +1 convention): 0 while it faces the camera, so the facing flip is seamless
  const am = fh * K.ha, hp = (q) => add(H, rot([fh * q[0] * hsc, q[1] * hsc], fh * am));
  const mid = add(lerp2(K.C, K.Rp, 0.5), [0, -K.arch]), dist = K.C[0] - K.Rp[0];
  const Np = add(K.C, [4, -8.5]), neckEnd = hp([-3, 4]);
  const torso = [E(add(K.C, [0, -0.3 * br]), K.Cr[0], K.Cr[1] + 0.4 * br, 0, z), E(K.Rp, K.Rr[0], K.Rr[1] + 0.25 * br, 0, z), E(add(mid, [0, -0.4 * br]), dist / 2 + 3, Math.min(K.Cr[1], K.Rr[1]) + K.arch * 0.6 + 0.5 * br, 0, z), tube([Np, neckEnd], 9.5, 9)];
  const torsoS = torso.map(TP);
  blob(g, torsoS, { ramp: CO.body, thick: 9 * z, base: 2.6, gain: 2.2, slope: 1.0, outline: CO.out, litOutline: CO.lit });
  if (CO.saddle) {                                         // wolf: darker saddle along the arched back, cream underside
    const v = interior(g, torsoS);
    blob(v, [TP(E(add(mid, [0, -K.arch * 0.6 - 9.5]), dist / 2 + 8, 8.5, 0, z)), TP(E(add(Np, [-2, -3]), 8, 6, -0.5, z))], { ramp: CO.saddle, thick: 6 * z, base: 3.0, gain: 1.6, slope: 0.6, rimShade: 0, outline: CO.saddle[4], litOutline: CO.saddle[5] });
    if (CO.belly) blob(v, [TP(E(add(mid, [0, 11.5 - 2 * u]), dist / 2 + 1, 5.5, 0, z))], { ramp: CO.white, thick: 4 * z, base: 3.6, gain: 1.2, slope: 0.4, outline: CO.white[3], litOutline: CO.white[4] });
  }
  // white chest + throat (shrinks as the chest turns under the head)
  const bc = add(K.C, K.bib), chin = hp([9, 12]);
  const bibS = [TP(E(bc, K.bibR[0], K.bibR[1], 0, z)), TP(tube([add(K.C, [lerp(10, 2, u), -6]), chin], 5.6, 5.2))];
  blob(g, bibS, { ramp: CO.white, thick: 5 * z, base: 4.4, gain: 1.8, outline: CO.edge, litOutline: CO.litEdge });
  // near haunch (crease where it meets the body) + hind foot along the ground
  {
    const hcS = T(K.hc), crease = (X, Y) => { const an = Math.atan2(Y + 0.5 - hcS[1], (X + 0.5 - hcS[0]) * f); return an > -0.4 && an < 1.9; };
    const hpo = [TP(E(K.hc, K.hr[0], K.hr[1] + 0.2 * br, 0.2, z))];
    if (rs > 0.001) hpo.push(TP(tube([add(K.hc, [-3, 6]), add(K.hk, [0, -1])], 5.2 * rs, 4.4 * rs)));   // black lower thigh while standing
    blob(merge(g, torsoS, crease, CO.body[1], CO.out ?? "#07060E", CO.lit), hpo, { ramp: CO.body, thick: 6 * z, base: 2.7, gain: 2.0, outline: SENT, litOutline: SENT_L });
    blob(g, [TP(tube([K.hk, [K.hP[0] - 2.5, K.hP[1] - 0.3]], lerp(3.6, 4.3, rs), 3.2)), TP(E(K.hP, 6.0, 3.8, 0, z))], { ramp: CO.leg, thick: 2.6 * z, base: 4.2, gain: 1.4, outline: CO.edge });
    toes(g, T, K.hP, 0, f, z, 1.4, [-0.4, 1.6, 3.6], [-1.0, 0.8], CO.toe);
  }
  // collar on the neck
  if (CO.collar) { const cc = lerp2(Np, neckEnd, 0.45), d = nrm(sub(neckEnd, Np)), na = Math.atan2(d[1], d[0] * f);
    blob(g, [TP(E(cc, 3.2, 10.6, na, z))], { ramp: RED, thick: 1.5 * z, base: 3.6, outline: "#3A0A10" }); }
  // near front leg (in front of the chest)
  leg(K.fE, K.fP, g, true);
  // head
  const hs = T(H), M = mapper(hs[0], hs[1], z, f * fh, am, HS);
  const blink = Math.max(clamp01(o.blink ?? 0), sm01((sl - 0.2) / 0.5));
  const look = o.look ?? [0, 0];
  const an = drawHead(g, M, { yaw, t, ears: lerp(o.ears ?? 0.5, 0.02, Math.max(s, 0.6 * u)), earSwing: [0.15 * u, 0.15 * u], blink, look: [lerp(look[0], 0, s), lerp(look[1], 0.4, s)], mouth: 0, pant: 0, sniff: clamp01(o.sniff ?? 0), wet: o.wet ?? 0.5, dry: o.dry, brows: o.brows ?? 0, coat: o.coat });
  if (tailFront > 0) tail(fade(g, tailFront));
  return { nose: an.nose, mouth: an.mouth, eyes: an.eyes, head: an.head, top: an.top, tail: T(tp[tp.length - 1]) };
}
