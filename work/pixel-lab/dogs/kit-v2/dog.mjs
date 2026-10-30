// Dog series (Kagenami, 2026-10-23) · THE DOG: the black-and-white border collie of yard.mjs (drawDog) as a reusable rig
// for the three park films. Everything is drawn from world units through G = ground(cam) (G.z px per unit), so the same
// drawing stays pixel-crisp from z = 0.7 (wide) to z = 6 (nose close-up). Pure functions of their arguments.
//
//   drawDogSide(c, G, x, y, t, o)   side view standing / walking / trotting / galloping   → anchors
//   drawDogFront(c, G, x, y, t, o)  sitting, facing the camera (yard.mjs drawDog, same dog) → anchors
//   DOG                             sizes, strides, cadences, anchor offsets
//
// (x, y) = world point on the lawn under the middle of the dog. Draw through any canvas view (fade / gate).
import { blob, ell, tube, shadow, smooth, fade } from "../../animals/film/cute.mjs";
import { BLK, WHT, LIT, EDGE, drawHead, drawBall, mapper, headAnchors } from "./dog-head.mjs";
import { gaitKey, mixKeys, STRIDE, CADENCE, PAW_Y, BODY } from "./dog-gait.mjs";
import { R, TAU, clamp01, lerp, add, sub, mul, rot, nrm, sm01, RED, GOLD, SHADOW, ik, chain, plume, tri, E, SENT, SENT_L, inPolys, merge, lerp2, qbez, mirX, drawTag } from "./dog-parts.mjs";
export { drawBall, STRIDE, CADENCE, RED, GOLD };
export { drawDogLie, drawDogCurl, LIE_HEAD } from "./dog-rest.mjs";
/** Films 2/3 alignment (world units from the dog's (x, y), facing +1, t = 0): head centres of the new poses. */
export const DOG_POSES = {
  sitHead: [0, -69],                                                   // drawDogFront (DOG.front.head)
  lieHead: { awake: [0, -50], asleep: [0, -30.5], rise1: [0, -69] },  // drawDogLie sleep 0 / 1, rise 1 (= sitHead)
  standHead: [30.2, -58.8],                                            // drawDogSide stand (DOG.align.sideHead)
  curlHead: { curl0: [27, -38], curlHalf: [16, -28], curl1: [3, -18.5], rise1: [30.2, -58.8] },
  turnFrontHead: [0, -58.8],                                           // drawDogSide turn 0.5 (standing, facing the camera)
};
import { drawSideTurn } from "./dog-turn.mjs";

// ---------------------------------------------------------------- side rig (local units, facing +x)
export const HS = 1.2;                     // head scale over the yard.mjs face (chibi: big head)
const HEAD_LEVEL = { d: 23.4, a: -0.695 }, HEAD_UP = { d: 23.5, a: -0.98 }, HEAD_DOWN = { d: 19.7, a: 0.441 };
const NECK_PIV = [5, -9];

/** Geometry of the side view for options o at time t (no drawing). Exported through DOG.sideRig for the lead. */
function sideRig(t, o) {
  let K = gaitKey(o.gait ?? "stand", o.phase ?? 0, t);
  if (o.blend && o.blend.k > 0) K = mixKeys(K, gaitKey(o.blend.gait ?? "stand", o.blend.phase ?? 0, t), clamp01(o.blend.k));
  const pitch = Math.max(-0.4, Math.min(1, o.pitch ?? 0)), pd = Math.max(0, pitch), pu = Math.max(0, -pitch) / 0.4;
  const C = add(K.C, [1 * pd, 3 * pd]), Rp = add(K.Rp, [0, -1 * pd]);
  const ax = nrm(sub(C, Rp)), ang = Math.atan2(ax[1], ax[0]), up = [ax[1], -ax[0]];
  const Np = add(C, rot(NECK_PIV, ang));
  // head: swings on an arc around the neck pivot (level → nose down to the grass, or up)
  const e = sm01(pd);
  let hd = lerp(HEAD_LEVEL.d, HEAD_DOWN.d, e), ha0 = lerp(HEAD_LEVEL.a, HEAD_DOWN.a, e), ha = lerp(0, 1.0, e);
  if (pu > 0) { hd = lerp(HEAD_LEVEL.d, HEAD_UP.d, pu); ha0 = lerp(HEAD_LEVEL.a, HEAD_UP.a, pu); ha = lerp(0, -0.36, pu); }
  const sniff = clamp01(o.sniff ?? 0);
  const sw = sniff * (0.6 * Math.sin(t * TAU * 5.1) + 0.4 * Math.sin(t * TAU * 7.9 + 1));
  const gk = 1 - 0.6 * e;
  let H = add(add(Np, [Math.cos(ha0) * hd, Math.sin(ha0) * hd]), mul(K.head, gk));
  ha += K.ha * gk + 0.045 * sw;
  H = add(H, rot([0.5 * sw, 0], ha));
  // legs
  const legs = {};
  for (const n of ["hf", "ff", "hn", "fn"]) {
    const P = K.paws[n], far = n[1] === "f", front = n[0] === "f";
    if (front) {
      const S = add(C, rot(far ? [-1, 6.5] : [3, 7], ang)), W = add([P[0], P[1]], rot([-1.3, -2.6], P[2]));
      const El = ik(S, W, 12.5, 12, 1);
      legs[n] = { front, far, S, J: El, W, P, pa: P[2] };
    } else {
      const Hp = add(Rp, rot(far ? [1, 5] : [-2, 6], ang)), A = add([P[0], P[1]], rot([-3.4, -8.2], P[2] * 0.55));
      const Kn = ik(Hp, A, 11.5, 11, -1);
      legs[n] = { front, far, S: Hp, J: Kn, W: A, P, pa: P[2] };
    }
  }
  // tail
  const tl = o.tail ?? {}, wag = clamp01(tl.wag ?? 0.35), th = Math.max(-1, Math.min(1, (tl.height ?? 0) + K.tailH));
  const runK = K.tailRun ?? 0;
  const wg = Math.sin(t * TAU * 3.2), wg2 = Math.sin(t * TAU * 3.2 - 1.1);
  let a0, turn;
  if (th >= 0) { a0 = lerp(Math.PI - 0.32, Math.PI + 0.9, th); turn = lerp(0.95, 1.05, th); }
  else { a0 = lerp(Math.PI - 0.32, Math.PI / 2 + 0.3, -th); turn = lerp(0.95, -0.45, -th); }
  a0 = lerp(a0, Math.PI + 0.12, runK) + K.tailA + wag * 0.38 * wg; turn = lerp(turn, 0.3, runK) + wag * 0.4 * wg2;
  const Tb = add(Rp, rot([-14.5, -7.5], ang));
  const tailPts = chain(Tb, a0 + ang, 31, (s) => turn * Math.pow(s, 1.4), 12);
  return { K, C, Rp, ang, up, ax, Np, H, ha, legs, tailPts, pitch, sniff, e };
}

const legPoly = (L, z) => {
  const { S, J, W, P, pa, front } = L;
  if (front) return { top: [tube([S, J], 6.2, 5.6)], low: [tube([J, W], 5.6, 5.0), E([P[0] + 0.4, P[1]], 6.8, 4.0, pa * 0.85, z)] };
  return { top: [tube([J, W], 5.0, 4.3)], low: [tube([W, [P[0] - 0.5, P[1] - 1]], 4.3, 4.0), E([P[0], P[1]], 6.5, 3.9, pa * 0.6, z)] };
};

/**
 * Side view. o: facing ±1, gait "stand"|"walk"|"trot"|"run", phase, blend {gait, phase, k}, pitch −0.4..1, yaw 0..1,
 * sniff, ears, tail {wag, height}, blink, look [fwd, down], mouth, pant, carry (ramp | fn(g, sx, sy, rpx) | null),
 * wet, brows, a. Returns screen anchors { nose, mouth, eye, head, top, chest, ball, paws }.
 * Film 3 additions (absent = the film-1 drawing, byte for byte): turn 0..1 rotates the dog about its vertical axis —
 * 0 = facing (side), 0.5 = facing the camera (standing, front), 1 = facing −facing (exactly the plain side view with
 * the facing flipped); back 0..1 makes that rotation pass behind instead (back 1: turn 0.5 = seen from behind, tail
 * toward the camera; in-between values dissolve the two passes). Works with every gait/pose option; dry also passes.
 */
export function drawDogSide(c, G, x, y, t = 0, o = {}) {
  const tn = o.turn ?? 0;                                  // film 3: turning in place (dog-turn.mjs)
  if (tn > 0) return tn >= 1 ? drawDogSide(c, G, x, y, t, { ...o, turn: 0, facing: (o.facing ?? 1) < 0 ? 1 : -1 }) : drawSideTurn(c, G, x, y, t, o, DOG);
  const a = o.a ?? 1; if (a <= 0) return null;
  const g = fade(c, a), f = (o.facing ?? 1) < 0 ? -1 : 1, z = G.z, ox = G.X(x), oy = G.Y(y);
  const T = (p) => [ox + f * p[0] * z, oy + p[1] * z], TP = (pts) => pts.map(T);
  const r = sideRig(t, o), { C, Rp, ang, up, ax, Np, H, ha, legs, K } = r;
  const yaw = clamp01(o.yaw ?? 0);

  // contact shadow
  const mx = (C[0] + Rp[0]) / 2 + 4;
  shadow(g, T([mx, 0])[0], oy, 50 * z, Math.max(2, 4.2 * z), SHADOW, 0.42 * K.shadow);

  // tail (behind everything)
  const tp = r.tailPts;
  const tailRf = (s) => (s < 0.5 ? lerp(4.2, 6.6, sm01(s / 0.5)) : lerp(6.6, 2.6, sm01((s - 0.5) / 0.5)));
  blob(g, [TP(plume(tp, tailRf, 1.6, -1))], { ramp: BLK, thick: 4 * z, base: 2.8, litOutline: LIT });
  const tipFrom = 8;
  blob(g, [TP(plume(tp.slice(tipFrom), tailRf, 1.4, -1, tipFrom / (tp.length - 1), 1))], { ramp: WHT, thick: 3 * z, base: 4.2, outline: EDGE });

  // far legs (darker)
  for (const n of ["hf", "ff"]) {
    const L = legs[n], lp = legPoly(L, z);
    if (L.front) blob(g, [...lp.top, ...lp.low].map(TP), { ramp: WHT, thick: 3 * z, base: 2.5, gain: 1.3, slope: 0.6, outline: "#14121E" });
    else { blob(g, lp.top.map(TP), { ramp: BLK, thick: 3 * z, base: 2.0, outline: "#050409" }); blob(g, lp.low.map(TP), { ramp: WHT, thick: 3 * z, base: 2.5, gain: 1.3, slope: 0.6, outline: "#14121E" }); }
  }

  // torso + neck (one black union, so there is no seam), tufts on the belly and the chest
  const dist = Math.hypot(C[0] - Rp[0], C[1] - Rp[1]), mid = add(mul(add(C, Rp), 0.5), mul(up, r.K.arch));
  const down = mul(up, -1);
  const belly = [0.3, 0.55].map((k, i) => { const b = add(lerp2(Rp, C, k), mul(down, 14.6)); const d = ax; return tri(add(b, mul(d, -3)), add(b, add(mul(d, 1 + i * 0.5), mul(down, 2.6))), add(b, mul(d, 3))); });
  const hp = (q) => add(H, rot([q[0] * HS, q[1] * HS], ha));
  const neckEnd = hp([-3, 4]);
  const torso = [E(C, 18.5, 17.6, ang, z), E(Rp, 17.6, 16.8, ang, z), E(mid, dist / 2 + 2, 16.9, ang, z), tube([Np, neckEnd], 10.5, 10), ...belly];
  const torsoS = torso.map(TP);
  blob(g, torsoS, { ramp: BLK, thick: 10 * z, base: 2.6, gain: 2.2, slope: 1.0, litOutline: LIT });

  // white bib: chest front + throat up to the chin, with a fluffy hem
  const chin = hp([9, 12]), chestF = add(C, rot([9.5, 2.5], ang));
  const hem = [];
  for (let i = 0; i < 4; i++) { const b = add(C, rot([5 - i * 0.6, -6 + i * 6.2], ang)); hem.push(tri(add(b, rot([0, -3], ang)), add(b, rot([-4.2, 0.6], ang)), add(b, rot([0, 3], ang)))); }
  const bib = [E(chestF, 10.2, 13.2, ang - 0.1, z), tube([add(C, rot([12, -6], ang)), chin], 6.4, 6), ...hem,
    tri(add(chestF, rot([4, 9], ang)), add(chestF, rot([6.5, 15.5], ang)), add(chestF, rot([-1, 12.5], ang)))];
  const bibS = bib.map(TP);
  blob(g, bibS, { ramp: WHT, thick: 6 * z, base: 4.4, gain: 1.8, outline: EDGE, litOutline: "#9494AE" });

  // near hind leg: round haunch (black) + white sock and paw; near front leg: white
  {
    const L = legs.hn, lp = legPoly(L, z), hip = L.S, hc = add(hip, rot([3.5, -0.5], ang)), hcS = T(hc);
    // the round haunch shows its outline only where it leaves the body and as a crease along its front-lower edge
    const crease = (X, Y) => { const a = Math.atan2(Y + 0.5 - hcS[1], (X + 0.5 - hcS[0]) * f); return a > -0.55 && a < 1.75; };
    blob(merge(g, torsoS, crease, BLK[1]), [E(hc, 10.6, 12.0, ang + 0.3, z), ...lp.top].map(TP), { ramp: BLK, thick: 6 * z, base: 2.7, gain: 2.0, outline: SENT, litOutline: SENT_L });
    blob(g, lp.low.map(TP), { ramp: WHT, thick: 3 * z, base: 4.3, gain: 1.5, outline: EDGE });
  }
  {
    const L = legs.fn, lp = legPoly(L, z);
    // the white foreleg merges into the white bib (no seam line inside the bib)
    blob(merge(g, bibS, null, null, EDGE, "#9494AE"), [...lp.top, ...lp.low].map(TP), { ramp: WHT, thick: 3.4 * z, base: 4.3, gain: 1.6, outline: SENT, litOutline: SENT_L });
    toeLines(g, T, L.P, L.pa * 0.85, f, z);
  }
  toeLines(g, T, legs.hn.P, legs.hn.pa * 0.6, f, z);

  // collar on the neck + the gold tag hanging from the throat side
  collarSide(g, T, Np, neckEnd, ha, t, z, f, K);

  // head
  const hs = T(H), M = mapper(hs[0], hs[1], z, f, ha, HS);
  const lookD = [0.4 * (1 - yaw), 0.6 * Math.max(0, r.pitch) - 0.5 * Math.max(0, -r.pitch)];
  const earSw = [K.ear[0] + 0.18 * r.e, K.ear[1] + 0.18 * r.e];
  const an = drawHead(g, M, { yaw, t, ears: o.ears ?? 0.5, earSwing: earSw, blink: o.blink ?? 0, look: o.look ?? lookD, mouth: o.mouth ?? 0, pant: o.pant ?? 0, sniff: r.sniff, wet: o.wet ?? 0.5, dry: o.dry, brows: o.brows ?? 0, carry: o.carry ?? null });
  return { ...an, chest: T(add(C, rot([19, 2], ang))), paws: Object.fromEntries(Object.entries(legs).map(([n, L]) => [n, T([L.P[0], 0])])) };
}
function toeLines(g0, T, P, pa, f, z) {
  const v = sm01((z - 1.3) / 0.5); if (v <= 0.02) return; const g = fade(g0, v);   // toe lines dissolve in with the zoom
  for (const dx of [-1.8, 0.6, 3.0]) {
    const a = T(add([P[0], P[1]], rot([dx, 0.4], pa))), b = T(add([P[0], P[1]], rot([dx, 3.0], pa)));
    g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#8A8AA0");
  }
}
function collarSide(g, T, Np, neckEnd, ha, t, z, f, K) {
  const u = nrm(sub(neckEnd, Np)), na = Math.atan2(u[1], u[0]), cc = lerp2(Np, neckEnd, 0.5);
  blob(g, [E(cc, 3.4, 11.6, na, z).map(T)], { ramp: RED, thick: 1.6 * z, base: 3.7, outline: "#3A0A10" });
  const n = rot(u, Math.PI / 2), at = add(cc, mul(n, 10.2));
  const sw = 0.25 * Math.sin(t * TAU * 1.3) + 0.15 * (K.head?.[1] ?? 0) * 0.3;
  const tg = add(at, [Math.sin(sw) * 2.6, Math.cos(sw) * 2.6]);
  const p = T(tg), pa = T(at);
  g.line(R(pa[0]), R(pa[1]), R(p[0]), R(p[1]), "#8A6418");
  blob(g, [ell(p[0], p[1] + 0.6 * z, 2.3 * z, 2.3 * z, 0, 16)], { ramp: GOLD, thick: 1.2 * z, base: 3.8, outline: "#5A3A08" });
  if (z >= 1.6) g.px(Math.floor(p[0] - 0.7 * z), Math.floor(p[1]), "#FFFBE0");
}

// ---------------------------------------------------------------- front sitting (yard.mjs drawDog, 0.3 units per yard px)
const U = 0.3, HEAD_Y = -69;                // head centre above the ground (head top ≈ −100)
/**
 * Sitting, facing the camera. o: tilt −1..1, ears, look [dx, dy], blink, mouth, pant, sniff, wet, wag, carry, brows,
 * yaw (0 = default front; the head key used is always front here), a. Returns { nose, mouth, eyes, head, top, ball }.
 * Film 2 additions (absent = the film-1 drawing, byte for byte): lick 0..1 (one nose lick: 0 closed → 0.5 the tongue
 * covers the nose → 1 back in), boop 0..1 (head leans into the lens: bigger head and nose, happy squint, ears back),
 * dry 0..1 (matte, lighter, cracked nose — the opposite of wet), happy 0..1 (smiling squint on its own).
 */
export function drawDogFront(c, G, x, y, t = 0, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const g = fade(c, a), z = G.z, ox = G.X(x), oy = G.Y(y);
  const T = (p) => [ox + p[0] * z, oy + p[1] * z], TP = (pts) => pts.map(T);
  const Yd = (pts) => pts.map(([px, py]) => [px * U, py * U]);
  const br = Math.sin(t * TAU * 0.55) * U;
  shadow(g, ox, oy, 35 * z, Math.max(2, 3.4 * z), SHADOW, 0.5);
  // tail: curls up on the right with a white tip, wagging
  const wag = clamp01(o.wag ?? 0.5), ta = Math.sin(t * TAU * 2.2) * 0.42 * wag;
  const tb = [80, -16], tm = [122 + Math.cos(ta) * 3, -34 + Math.sin(ta) * 6], tt = [114 + Math.sin(ta) * 22, -88 + Math.cos(ta) * 4];
  const tail = Yd(qbez(tb, tm, tt, 14));
  blob(g, [TP(plume(tail, (s) => lerp(4.4, 3.4, s) + 1.0 * Math.sin(Math.PI * s), 1.2, -1))], { ramp: BLK, thick: 2.2 * z, litOutline: LIT });
  blob(g, [TP(plume(tail.slice(9), (s) => lerp(4.4, 3.4, s) + 1.0 * Math.sin(Math.PI * s), 1.0, -1, 9 / 14, 1))], { ramp: WHT, thick: 1.6 * z, base: 4.2, outline: EDGE });
  // body: plump pear with round haunches, white bib with a fluffy hem, chubby white front legs and big paws
  blob(g, [E([-70 * U, -44 * U], 46 * U, 46 * U, 0, z), E([70 * U, -44 * U], 46 * U, 46 * U, 0, z)].map(TP), { ramp: BLK, thick: 6 * z, base: 2.6, gain: 2.2, litOutline: LIT });
  const bodyPts = Yd(mirX([[-30, -206], [-58, -164], [-82, -104], [-96, -48], [-88, -4], [0, 2]], 1).concat([[88, -4], [96, -48], [82, -104], [58, -164], [30, -206]]));
  blob(g, [TP(smooth(bodyPts, new Set(), 4))], { ramp: BLK, thick: 10 * z, base: 2.5, gain: 2.4, litOutline: LIT });
  const hem = []; for (let i = 0; i <= 8; i++) hem.push([46 - i * 11.5, -82 + (i % 2 ? 9 : 0) - Math.abs(i - 4) * 2]);
  const bib = Yd([[-28, -212], [0, -220], [28, -212], [50, -164], [54, -116], ...hem, [-54, -116], [-50, -164]]).map(([px, py], i) => (i < 3 ? [px, py + br] : [px, py]));
  const bibS = [TP(smooth(bib, new Set([5, 6, 7, 8, 9, 10, 11, 12, 13]), 4))];
  blob(g, bibS, { ramp: WHT, thick: 7 * z, base: 4.4, gain: 2.0, outline: EDGE });
  for (const s of [-1, 1]) {
    // chubby front legs: slightly wider at the paw, merged into the bib (no seam inside it)
    const leg = [[s * 25 * U, -100 * U], [s * 26 * U, -50 * U], [s * 27.5 * U, -12 * U]];
    blob(merge(g, bibS, null, null, EDGE, EDGE), [TP(tube(leg, 17 * U, 18.5 * U))], { ramp: WHT, thick: 3 * z, base: 4.2, outline: SENT, litOutline: SENT_L });
    blob(g, [TP(E([s * 28 * U, -7 * U], 22 * U, 12 * U, 0, z))], { ramp: WHT, thick: 2 * z, base: 4.6, outline: EDGE });
    const tv = sm01((z - 1.1) / 0.5);
    if (tv > 0.02) for (const dx of [-7, 1, 9]) { const p = T([(s * 28 + dx * s - 1) * U, -11 * U]), q = T([(s * 28 + dx * s - 1) * U, -5 * U]); fade(g, tv).line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#8A8AA0"); }
  }
  // collar + tag
  const cp = [0, -50.5 + br * 0.5];
  blob(g, [TP(E(cp, 13.6, 2.4, 0, z))], { ramp: RED, thick: 1.4 * z, base: 3.5, outline: "#3A0A10" });
  { const sw = Math.sin(t * 3.2) * 0.25, at = add(cp, [0, 2]), tg = add(at, [Math.sin(sw) * 2.6, Math.cos(sw) * 2.6]), p = T(tg), pa = T(at);
    g.line(R(pa[0]), R(pa[1]), R(p[0]), R(p[1]), "#8A6418");
    blob(g, [ell(p[0], p[1] + 0.6 * z, 2.3 * z, 2.3 * z, 0, 16)], { ramp: GOLD, thick: 1.2 * z, base: 3.8, outline: "#5A3A08" });
    if (z >= 1.6) g.px(Math.floor(p[0] - 0.7 * z), Math.floor(p[1]), "#FFFBE0"); }
  // head: tilts around the neck; ears react to the tilt (upper ear perks, lower ear flops out)
  const tilt = Math.max(-1, Math.min(1, o.tilt ?? 0)), sniff = clamp01(o.sniff ?? 0);
  const ta2 = tilt * 0.35 + sniff * 0.012 * Math.sin(t * TAU * 5.1);
  const boop = clamp01(o.boop ?? 0), bp = sm01(boop);                 // boop: the head leans toward the lens
  const H = [0, HEAD_Y + br + 3.2 * bp], piv = [0, HEAD_Y + 14];
  const Hc = add(piv, rot(sub(H, piv), ta2)), hs = T(Hc);
  const M = mapper(hs[0], hs[1], z, 1, ta2, HS * (1 + 0.13 * bp));
  const an = drawHead(g, M, { yaw: 1, t, ears: o.ears ?? 0.5, earSwing: [0.22 * tilt, 0.28 * tilt], blink: o.blink ?? 0, look: o.look ?? [0, 0], mouth: o.mouth ?? 0, pant: o.pant ?? 0, sniff, wet: o.wet ?? 0.5, brows: o.brows ?? 0, carry: o.carry ?? null, lick: o.lick, boop, dry: o.dry, happy: o.happy });
  return { nose: an.nose, mouth: an.mouth, eyes: an.eyes, head: an.head, top: an.top, ball: an.ball };
}

// ---------------------------------------------------------------- constants for the lead
/** Local (facing +1) anchors of the side view at t = 0 for options o — the same points drawDogSide returns. */
function sideAnchorsLocal(o) {
  const r = sideRig(0, o), P = (q) => add(r.H, rot([q[0] * HS, q[1] * HS], r.ha));
  const open = Math.max(o.mouth ?? 0, 0.62 * (o.pant ?? 0), o.carry ? 0.5 : 0), A = headAnchors(o.yaw ?? 0, open);
  return { head: P(A.head), mouth: P(A.mouth), ball: P(A.ball), nose: P(A.nose), eye: P(A.eye), top: P(A.top) };
}
function frontAnchorsLocal(o = {}) {
  const open = Math.max(o.mouth ?? 0, 0.62 * (o.pant ?? 0), o.carry ? 0.5 : 0), A = headAnchors(1, open), P = (q) => [q[0] * HS, HEAD_Y + q[1] * HS];
  return { head: P(A.head), mouth: P(A.mouth), ball: P(A.ball), nose: P(A.nose), eyes: A.eyes.map(P), top: P(A.top) };
}
export const DOG = {
  len: 112, back: -52, headTop: -92, sitTop: -100, ballR: 7, pawY: PAW_Y,
  stride: STRIDE,                 // world units per cycle: walk 30, trot 54, run 104 → x += facing · stride · Δphase
  cadence: CADENCE,               // natural cycles per second (speed = stride · cadence)
  body: BODY,
  /** Local anchor offsets (facing +1; mirror x for facing −1) relative to (x, y), standing. */
  side: {
    pitch0: sideAnchorsLocal({ pitch: 0 }), pitch1: sideAnchorsLocal({ pitch: 1 }), pitchUp: sideAnchorsLocal({ pitch: -0.4 }),
    carry0: sideAnchorsLocal({ pitch: 0, carry: true }), carry1: sideAnchorsLocal({ pitch: 1, carry: true }), yaw1: sideAnchorsLocal({ yaw: 1 }),
    /** pitch at which the carried ball's centre rests on the lawn (wy = −ballR): pick up / drop a ball here. */
    pick: (() => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, b = sideAnchorsLocal({ pitch: m, carry: true }).ball; if (b[1] < -7) lo = m; else hi = m; } const p = (lo + hi) / 2; return { pitch: p, ball: sideAnchorsLocal({ pitch: p, carry: true }).ball }; })(),
  },
  /** Front sitting anchors relative to (x, y) at tilt 0 (no breathing); carry: the ball centre when carrying. */
  front: { ...frontAnchorsLocal(), carry: frontAnchorsLocal({ carry: true }) },
  /** side ↔ front crossfade alignment: the side head sits frontDx·facing units ahead of x and headDy units lower. */
  align: (() => { const s = sideAnchorsLocal({}), f = frontAnchorsLocal(); return { sideHead: s.head, frontHead: f.head, frontDx: s.head[0], headDy: s.head[1] - f.head[1] }; })(),
  sideRig: (t, o) => sideRig(t, o),
};
