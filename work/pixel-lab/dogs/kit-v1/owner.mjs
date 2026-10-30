// Dog series (Kagenami, 2026-10-23) — the owner: the recurring human hero of ../../animals/film/hero.mjs (coral puffer,
// purple bobble hat, blue scarf, yellow knitted mittens, navy trousers, brown boots), rebuilt as a rig in world units.
//
// drawOwner(c, G, x, y, t, o) — G = ground(cam) (layout.mjs); (x, y) = WORLD point between the feet (lawn wy = 0).
// The figure is built in hero units (hu: hero.mjs at scale 1, 174 hu to the bobble top) and scaled by
// OWNER.K = 150 / 174 world units per hu, so he is 150 world units tall to the top of the bobble (× o.scale).
// Every part is volume-shaded through G.z, so he stays crisp from z 0.7 to z 4. Pure function of its arguments.
//
// Options (all continuous; poses blend, nothing switches in one frame):
//   facing  −1 | 0 | 1 (continuous; face shift as hero.mjs; knees bend outward at 0, forward at ±1). Asymmetric poses
//           (throw, crouch, scratch) mirror by sign(facing); facing 0 acts as +1 for them — keep facing at ±1 while
//           those poses are active.
//   look [dx, dy] −1..1 (default [facing·0.6, 0]); blink 0..1; mouth "smile" | "o" | "flat" | "grin" (crossfade with
//           gate to change); brows 0..1 (worried, fades in); a 0..1 dissolve; scale (default 1);
//   shadow  contact-shadow strength on the lawn (default .4, 0 = none); shadowCol (default #10261A).
//   walk    phase (p and p + 1 identical); walking 0..1 blends the gait in (feet planted for 60 % of the cycle, bob,
//           opposite arm swing). One cycle = two steps = OWNER.stride = 28 world units × scale: advance x by
//           28·scale per unit of phase (facing sign gives the direction).
//   throw   k 0..1 (0 ball held at the chest with both mittens → .15 arm drops back → .3 wind-up: arm back and up,
//           body leans back, free arm points forward, front knee lifts → .4 arm whips up behind the head → .5 release:
//           mitten front-high beside the head, body leans forward, front foot steps forward → .6–.8 follow-through
//           across the body → 1 rest). throwW 0..1 blends the throw layer in (default 1 when `throw` is given).
//           The throwing arm is the back arm (screen-left when facing right). throwHand / throwBall / throwRelease.
//   hold    { L: rampOrNull, R: rampOrNull, k 0..1, a? } — both arms raise (elbows down, "ta-da"), each mitten shows a
//           ball (radius 7) on its palm with the thumb over it; the balls dissolve in with hold.a (default smooth over
//           k 0..0.35). L / R = screen sides.
//   crouch  k 0..1 — squat with bent knees and a slight forward lean; the front mitten grips from above a ball whose
//           centre is at (x + 30·facing, y − 28) world (o.crouchReach [dx, dy] overrides); the back arm hangs relaxed.
//   scratch k 0..1 — the front mitten rises (elbow tucked) and rubs the side of the head under the hat brim, elbow out
//           (3.5 Hz rub from t once k > .75), head tilts toward it. The mitten is drawn over the head only while
//           k > .5, when it is already clear of the head, so the draw-order switch never shows.
//   shrug   k 0..1 — shoulders up, elbows in, forearms and mittens out to the sides, head sinks a little.
//   point   { k, tx, ty } — the arm on the target's side extends straight toward the world point (tx, ty).
//   holdBall rampOrNull — a ball held in a mitten; ballHand 0..1 slides it from the throwing hand (0) to the front
//           hand (1); holdBallA 0..1 dissolves it; ballSpin its seam angle. Throwing hand: use it while throw k < .5,
//           at k .5 hand the ball to a flight starting exactly at throwBall(.5, …). Front hand + crouch 1: the ball sits
//           exactly on the reach point, so the lead can take it over from the dog's mouth without a jump.
// Returns anchors in SCREEN pixels { head, handL, handR, top, ball, balls: {L, R}, chest, feet } and the same in
// WORLD units under .world { head, handL, handR, top, ball, balls }.
import { blob, flat, ell, eye, blush, RAMP, fade, mix } from "../../animals/film/cute.mjs";
import { COAT, MITT } from "../../animals/film/hero.mjs";
import { drawBall, BALL, contactShadow } from "./ball.mjs";

const R = Math.round, PI = Math.PI;
const HAT = ["#1A1030", "#2A1F40", "#3B2C5C", "#523D82", "#6E4FB0", "#8D59DA", "#B08AE8", "#E0CDF8"];
const SCARF = ["#10183A", "#1E2A5A", "#33458A", "#5470B8", "#7E98DA", "#A9C4FF", "#D8E4FF", "#F4F8FF"];
const PANTS = ["#0C0A18", "#181430", "#22204A", "#2E2E66", "#3E4284", "#5258A0", "#6A74BC", "#8A94D4"];
const BOOT = ["#120A06", "#2E1A10", "#4A2C18", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488"];
const SKIN = RAMP.skin, HAIR = "#4A2A1A", BROW = "#3A2014", INK = "#07060E", MOUTH_IN = "#5A1424", TONGUE = "#F07090";
export { COAT, MITT, HAT, SCARF, PANTS, BOOT };

/** K = world units per hero unit; height to the bobble top; stride = world units per walk cycle (two steps). */
export const OWNER = { K: 150 / 174, height: 150, stride: 28, ballR: BALL.r };
const BALL_OFF = 5.2;                                     // held ball centre: this far beyond the mitten along shoulder → hand
const STRIDE_HU = OWNER.stride / OWNER.K, DUTY = 0.6, ARM = 38, LEG = 40.5;
// joint bend: a smooth bulge (ARM/2)·(1 − (d/ARM)²) instead of exact IK, so a limb never snaps straight (finite slope at full reach)
const bendOf = (d, L) => (d >= L ? 0 : (L / 2) * (1 - (d / L) ** 2));

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smt = (x, a, b) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const lerp = (a, b, k) => a + (b - a) * k;
const rot = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const add = (p, q) => [p[0] + q[0], p[1] + q[1]], sub = (p, q) => [p[0] - q[0], p[1] - q[1]], mul = (p, s) => [p[0] * s, p[1] * s];
const len = (p) => Math.hypot(p[0], p[1]), unit = (p) => { const l = len(p) || 1; return [p[0] / l, p[1] / l]; };

// ---------------------------------------------------------------- monotone cubic tracks (PCHIP, C1, no overshoot)
function track(ks, vs) {
  const n = ks.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h.push(ks[i + 1] - ks[i]); d.push((vs[i + 1] - vs[i]) / h[i]); }
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue;
    const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  return (k) => {
    if (k <= ks[0]) return vs[0]; if (k >= ks[n - 1]) return vs[n - 1];
    let i = 0; while (k > ks[i + 1]) i++;
    const t = (k - ks[i]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * vs[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * vs[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
}
const track2 = (ks, xs, ys) => { const fx = track(ks, xs), fy = track(ks, ys); return (k) => [fx(k), fy(k)]; };

// ---------------------------------------------------------------- the throw (canonical: facing right, B = throwing arm)
// Angles: 0 = arm straight down, +π/2 = forward (toward facing), −π/2 = back, ±π = up. The arm circles backward:
// chest → down → back → up → over → forward-high (release) → down-forward → down at the side (rest = −6.47).
const TK = [0, 0.15, 0.3, 0.4, 0.5, 0.6, 0.8, 1];
const THROW = {
  lean: track(TK, [0, -0.05, -0.15, -0.06, 0.1, 0.2, 0.1, 0]),
  bdx: track(TK, [0, -2, -5, -1, 5, 9, 4, 0]),
  bdy: track(TK, [0, 1, 2, 2, -1, 2, 1, 0]),
  a: track(TK, [0.96, -0.3, -2.3, -3.15, -4.18, -4.78, -5.6, -6.468]),
  l: track(TK, [25, 32, 38, 36, 44, 47, 34, 32.56]),
  tw: track2(TK, [4, 0, -4, 4, 18, 20, 12, 0], [0, 0, -2, -3, -2, 0, 0, 0]),
  free: track2(TK, [15, 30, 58, 56, 36, 28, 30, 30], [-60, -62, -86, -80, -62, -56, -52, -50]),
  footF: track2([0, 0.15, 0.3, 0.4, 0.5, 0.8, 0.9, 1], [9, 8, 5, 14, 24, 24, 16, 9], [0, -1, -8, -5, 0, 0, -5, 0]),
  footB: track2([0, 0.5, 0.6, 0.8, 1], [-9, -9, -7, -7, -9], [0, 0, -2, -1, 0]),
};
// scratch path of the front hand (torso-local, canonical) and head tilt
const SCR = { hand: track2([0, 0.5, 0.8, 1], [30, 44, 30, 28], [-50, -104, -132, -134]), tilt: track([0, 0.5, 1], [0, 0.03, 0.1]), sh: track2([0, 0.5, 1], [0, 1, 2], [0, -4, -8]) };

// ---------------------------------------------------------------- rig: every joint in feet-frame hero units
const PIV = [0, -46];                                    // torso pivot (hip centre) in torso-local coordinates
const SHL = [-24, -82], SHR = [24, -82];
// eL / eR: preferred elbow directions (torso-local), blended between layers and projected ⟂ to each arm, so elbows
// never flip in one frame
const REST = { lean: 0, bdx: 0, bdy: 0, tilt: 0, hdx: 0, hdy: 0, shL: [0, 0], shR: [0, 0], hL: [-30, -50], hR: [30, -50], fL: [-9, 0], fR: [9, 0], eL: [-1, 0.3], eR: [1, 0.3] };
/** Elbow by IK inside one layer (torso-local): bends toward the preferred direction e, projected ⟂ to the arm. */
function elbowOf(sh, hd, e, side, AL = ARM) {
  const v = sub(hd, sh), d = len(v), u = unit(v), mid = mul(add(sh, hd), 0.5);
  if (d >= AL) return mid;
  let out;
  if (typeof e === "string") out = e === "cw" ? [-u[1], u[0]] : [u[1], -u[0]];     // fixed bend sense along a path
  else { const eu = e[0] * u[0] + e[1] * u[1], pe = [e[0] - eu * u[0], e[1] - eu * u[1]]; out = len(pe) > 1e-3 ? unit(pe) : (side === "L" ? [-u[1], u[0]] : [u[1], -u[0]]); }
  return add(mid, mul(out, bendOf(d, AL)));
}
const fin = (P) => { P.elL = elbowOf(add(SHL, P.shL), P.hL, P.eL, "L", P.aL ?? ARM); P.elR = elbowOf(add(SHR, P.shR), P.hR, P.eR, "R", P.aR ?? ARM); return P; };
fin(REST);
const KEYS = Object.keys(REST).filter((k) => k !== "eL" && k !== "eR");

/** Torso transform for a layer: torso-local → feet frame. */
const torsoT = (P) => (p) => add([P.bdx, PIV[1] + P.bdy], rot(sub(p, PIV), P.lean));
const torsoInv = (P) => (q) => add(PIV, rot(sub(q, [P.bdx, PIV[1] + P.bdy]), -P.lean));

/** Throw layer at k in screen orientation (fs = ±1). Exported pieces reuse it. */
function throwLayer(k, fs) {
  const a = THROW.a(k), l = THROW.l(k), tw = THROW.tw(k), fr = THROW.free(k), ff = THROW.footF(k), fb = THROW.footB(k);
  const shB = [SHL[0] + tw[0], SHL[1] + tw[1]], hB = [shB[0] + l * Math.sin(a), shB[1] + l * Math.cos(a)];
  const m = (p) => [p[0] * fs, p[1]];                     // canonical → screen
  const P = { ...REST, lean: THROW.lean(k) * fs, bdx: THROW.bdx(k) * fs, bdy: THROW.bdy(k), tilt: THROW.lean(k) * 0.35 * fs };
  const u = unit(sub(hB, shB)), eB = [-u[1], u[0]];       // the throwing elbow keeps one bend sense all the way round
  if (fs > 0) { P.shL = tw; P.hL = hB; P.hR = fr; P.eL = eB; P.fR = [ff[0], Math.min(0, ff[1])]; P.fL = [fb[0], Math.min(0, fb[1])]; }
  else { P.shR = [-tw[0], tw[1]]; P.hR = m(hB); P.hL = m(fr); P.eR = m(eB); P.fL = [-ff[0], Math.min(0, ff[1])]; P.fR = [-fb[0], Math.min(0, fb[1])]; }
  P.throwSide = fs > 0 ? "L" : "R";
  return fin(P);
}

function rig(o, t) {
  const f = o.facing ?? 0, fs = f < 0 ? -1 : 1, Kc = OWNER.K * (o.scale ?? 1);
  const layers = [];
  const throwSide = fs > 0 ? "L" : "R", frontSide = fs > 0 ? "R" : "L", backSide = throwSide;
  let armW = 0, legW = 0, lateMitten = null;
  // throw
  if (o.throw != null) {
    const w = clamp01(o.throwW ?? 1);
    if (w > 0) { layers.push([w, throwLayer(clamp01(o.throw), fs)]); armW += w; legW += w; }
  }
  // crouch: hips down, soft lean, front hand to the dog's mouth, back hand on the thigh
  if ((o.crouch ?? 0) > 0) {
    const k = clamp01(o.crouch), P = { ...REST, lean: 0.22 * fs, bdx: -2 * fs, bdy: 16, tilt: 0.06 * fs, hdy: 1 };
    const reach = o.crouchReach ?? [30, -28], inv = torsoInv(P), T = torsoT(P), target = [reach[0] / Kc * fs, reach[1] / Kc];
    const shF = T(add(frontSide === "L" ? SHL : SHR, [2 * fs, 2])), dir = unit(sub(target, shF));
    P[frontSide === "L" ? "hL" : "hR"] = inv(sub(target, mul(dir, BALL_OFF)));   // a ball held in this mitten sits on the reach point
    P[backSide === "L" ? "hL" : "hR"] = [-28 * fs, -54];
    P.fL = fs > 0 ? [-8, 0] : [-14, 0]; P.fR = fs > 0 ? [14, 0] : [8, 0];
    P[frontSide === "L" ? "shL" : "shR"] = [2 * fs, 2];
    layers.push([smt(k, 0, 1), fin(P)]); armW += k; legW += k;
  }
  // hold two balls up
  if (o.hold && (o.hold.k ?? 0) > 0) {
    const k = clamp01(o.hold.k), P = { ...REST, shL: [-1, -3], shR: [1, -3], hL: [-42, -110], hR: [42, -110], hdy: -1, eL: [-0.5, 1], eR: [0.5, 1] };
    layers.push([smt(k, 0, 1), fin(P)]); armW += k;
  }
  // shrug
  if ((o.shrug ?? 0) > 0) {
    const k = clamp01(o.shrug), P = { ...REST, shL: [-1, -5], shR: [1, -5], hL: [-45, -74], hR: [45, -74], hdy: 3, tilt: 0.05 * fs, eL: [0, 1], eR: [0, 1] };
    layers.push([smt(k, 0, 1), fin(P)]); armW += k;
  }
  // scratch (path from rest; drawn over the head from k > .5)
  if ((o.scratch ?? 0) > 0) {
    const k = clamp01(o.scratch), m = (p) => [p[0] * fs, p[1]], wig = smt(k, 0.75, 1);
    const P = { ...REST, tilt: SCR.tilt(k) * fs };
    P[frontSide === "L" ? "eL" : "eR"] = fs > 0 ? "cw" : "ccw";          // elbow tucked down while the hand rises
    P[frontSide === "L" ? "aL" : "aR"] = lerp(ARM, 54, smt(k, 0.45, 1));   // … and sticks out sideways at the head
    const h = add(SCR.hand(k), [Math.sin(t * 2 * PI * 3.5) * 1.2 * wig, Math.cos(t * 2 * PI * 3.5) * 1.6 * wig]);
    P[frontSide === "L" ? "hL" : "hR"] = m(h); P[frontSide === "L" ? "shL" : "shR"] = m(SCR.sh(k));
    layers.push([smt(k, 0, 0.25), fin(P)]); armW += k;
    if (k > 0.5) lateMitten = frontSide;
  }
  // point at a world target with the arm on its side
  if (o.point && (o.point.k ?? 0) > 0) {
    const k = clamp01(o.point.k), tgt = [((o.point.tx ?? 0) - (o.x ?? 0)) / Kc, ((o.point.ty ?? 0) - (o.y ?? 0)) / Kc];
    const side = tgt[0] >= 0 ? "R" : "L", sh = add(side === "R" ? SHR : SHL, [0, -2]);
    const P = { ...REST, lean: 0.04 * Math.sign(tgt[0] || 1), tilt: 0.04 * Math.sign(tgt[0] || 1) };
    const inv = torsoInv(P), T = torsoT(P), shF = T(sh), dir = unit(sub(tgt, shF));
    P[side === "L" ? "hL" : "hR"] = inv(add(shF, mul(dir, 40))); P[side === "L" ? "shL" : "shR"] = [0, -2];
    layers.push([smt(k, 0, 1), fin(P)]); armW += k;
  }
  // blend: rest + Σ w (layer − rest), normalised when the weights add up to more than 1
  const W = layers.reduce((s, [w]) => s + w, 0), nrm = Math.max(1, W), B = {};
  for (const key of KEYS) {
    const r = REST[key];
    if (Array.isArray(r)) { let v0 = r[0], v1 = r[1]; for (const [w, L] of layers) { v0 += (w / nrm) * (L[key][0] - r[0]); v1 += (w / nrm) * (L[key][1] - r[1]); } B[key] = [v0, v1]; }
    else { let v = r; for (const [w, L] of layers) v += (w / nrm) * (L[key] - r); B[key] = v; }
  }
  // walk (additive): gait on the feet, bob, opposite arm swing
  const wk = clamp01(o.walking ?? 0);
  let bob = 0, liftL = 0, liftR = 0;
  if (wk > 0) {
    const ph = o.walk ?? 0, amp = lerp(0.3, 1, Math.min(1, Math.abs(f))) * wk * (1 - Math.min(1, legW)), fwd = fs;
    const A = STRIDE_HU * DUTY / 2, gait = (p) => {
      const u = ((p % 1) + 1) % 1;
      if (u < DUTY) return [A * (1 - 2 * u / DUTY), 0];
      const v = (u - DUTY) / (1 - DUTY), e = v * v * (3 - 2 * v);
      return [-A + 2 * A * e, -6 * Math.sin(PI * v)];
    };
    const gR = gait(ph), gL = gait(ph + 0.5);
    B.fR = [B.fR[0] + gR[0] * fwd * amp, B.fR[1] + gR[1] * wk * (1 - Math.min(1, legW))];
    B.fL = [B.fL[0] + gL[0] * fwd * amp, B.fL[1] + gL[1] * wk * (1 - Math.min(1, legW))];
    bob = 2 * (0.5 - 0.5 * Math.cos(4 * PI * (ph - 0.05))) * wk;
    const as = wk * (1 - Math.min(1, armW));
    B.hR = [B.hR[0] - gR[0] * 0.65 * fwd * as, B.hR[1] - Math.abs(gR[0]) * 0.12 * as];
    B.hL = [B.hL[0] - gL[0] * 0.65 * fwd * as, B.hL[1] - Math.abs(gL[0]) * 0.12 * as];
    B.elR = [B.elR[0] - gR[0] * 0.3 * fwd * as, B.elR[1]];
    B.elL = [B.elL[0] - gL[0] * 0.3 * fwd * as, B.elL[1]];
    B.lean += 0.03 * fwd * wk;
    liftL = gL[1]; liftR = gR[1];
  }
  B.bdy -= bob;
  const T = torsoT(B);
  const shL = T(add(SHL, B.shL)), shR = T(add(SHR, B.shR)), hL = T(B.hL), hR = T(B.hR), elL = T(B.elL), elR = T(B.elR);
  const head = T([f * 3 + B.hdx, -124 + B.hdy]), tilt = B.lean * 0.5 + B.tilt;
  const hipY = PIV[1] + B.bdy, hipL = [B.bdx - 9, hipY], hipR = [B.bdx + 9, hipY];
  const throwK = o.throw != null ? clamp01(o.throw) : 1, throwW = o.throw != null ? clamp01(o.throwW ?? 1) : 0;
  return { throwK, throwW, B, T, f, fs, Kc, shL, shR, hL, hR, elL, elR, head, tilt, hipL, hipR, fL: B.fL, fR: B.fR, throwSide, frontSide, lateMitten, liftL, liftR };
}

/** World position of the throwing mitten at throw k (pure throw pose, no walk/crouch). */
export function throwHand(k, x, y, facing = 1, scale = 1) {
  const r = rig({ throw: k, facing, scale }, 0), h = r.throwSide === "L" ? r.hL : r.hR;
  return [x + h[0] * r.Kc, y + h[1] * r.Kc];
}
/** World centre of the ball held in the throwing mitten at throw k (where drawOwner draws holdBall). */
export function throwBall(k, x, y, facing = 1, scale = 1) {
  const r = rig({ throw: k, facing, scale }, 0), b = heldBall(r, 0);
  return [x + b[0] * r.Kc, y + b[1] * r.Kc];
}
/** Release helper: position and velocity (world units per unit of k) of the held ball at k (default .5). */
export function throwRelease(x, y, facing = 1, scale = 1, k = 0.5) {
  const e = 1e-3, p = throwBall(k, x, y, facing, scale), q = throwBall(k + e, x, y, facing, scale), m = throwBall(k - e, x, y, facing, scale);
  return { x: p[0], y: p[1], vx: (q[0] - m[0]) / (2 * e), vy: (q[1] - m[1]) / (2 * e) };
}
function heldBall(r, ballHand = 0) {
  const at = (side) => { const sh = side === "L" ? r.shL : r.shR, h = side === "L" ? r.hL : r.hR; return [h, unit(sub(h, sh))]; };
  const [h, d] = at(r.throwSide);
  const th = r.throwW * (1 - smt(r.throwK, 0.02, 0.22)) * 1.0 * r.fs;   // at the chest the ball sits up-front of the mitten
  const pT = add(h, mul(rot(d, -th), BALL_OFF));
  if (ballHand <= 0) return pT;
  const [hf, df] = at(r.frontSide), pF = add(hf, mul(df, BALL_OFF)), k = clamp01(ballHand);
  return [lerp(pT[0], pF[0], k), lerp(pT[1], pF[1], k)];
}

// ---------------------------------------------------------------- drawing
export function drawOwner(c, G, x, y, t = 0, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const r = rig({ ...o, x, y }, t), { T, f, fs, Kc } = r;
  const s = Kc * G.z, X0 = G.X(x), Y0 = G.Y(y);
  const P = (p) => [X0 + p[0] * s, Y0 + p[1] * s];               // feet frame (hu) → screen
  const TP = (p) => P(T(p));                                      // torso-local → screen
  const nE = (rx, ry) => Math.max(16, Math.ceil((rx + ry) * s * 0.9));
  const E = (cx, cy, rx, ry, ro = 0, map = P) => ell(cx, cy, rx, ry, ro, nE(rx, ry)).map((p) => map(p));
  const LW = (k) => Math.max(1, Math.round(s * k));
  const g = fade(c, a), th = (v) => v * s;                      // thick (px) scales with zoom like hero.mjs did at scale 1
  const thickLine = (p, q, col, w, gg = g) => { const d = unit(sub(q, p)), n = [-d[1], d[0]]; for (let i = 0; i < w; i++) { const o2 = (i - (w - 1) / 2); gg.line(R(p[0] + n[0] * o2), R(p[1] + n[1] * o2), R(q[0] + n[0] * o2), R(q[1] + n[1] * o2), col); } };

  // ---- soft contact shadow on the lawn (o.shadow strength, default .4; 0 = none)
  const shK = o.shadow ?? 0.4;
  if (shK > 0) { const cx = (r.fL[0] + r.fR[0]) / 2 + f * 3, w = 26 + Math.abs(r.fR[0] - r.fL[0]) * 0.5; contactShadow(g, X0 + cx * s, Y0 + 0.5 * s, w * s, Math.max(1.2, 4.5 * s), shK, o.shadowCol ?? "#10261A"); }
  // ---- legs + boots
  for (const side of ["L", "R"]) {
    const hip = side === "L" ? r.hipL : r.hipR, fp = side === "L" ? r.fL : r.fR, foot = [fp[0], -6 + fp[1]];
    const d = len(sub(foot, hip)), mid = mul(add(hip, foot), 0.5);
    let knee = mid;
    // knees bend forward when facing a side and outward (each to its own side) when facing the camera — continuous in f
    if (d < LEG) { const u = unit(sub(foot, hip)), nrm = [-u[1], u[0]], px = nrm[0] >= 0 ? nrm : mul(nrm, -1), dx = Math.max(-1, Math.min(1, (side === "L" ? -1 : 1) * (1 - Math.abs(f)) + f)); knee = add(mid, mul(px, bendOf(d, LEG) * dx)); }
    blob(c, [tubeP(P(hip), P(knee), th(7), th(6.8)), tubeP(P(knee), P(foot), th(6.8), th(6.5))], { ramp: PANTS, thick: th(5), a });
    const lift = -fp[1], br = clamp01(lift / 8) * 0.35 * fs;
    blob(c, [E(foot[0] + f * 3, foot[1] + 1, 10, 6, br)], { ramp: BOOT, thick: th(4), a });
  }

  // ---- puffer body, quilt lines, zipper
  blob(c, [E(0, -66, 30, 30, 0, TP), E(0, -50, 27, 14, 0, TP)], { ramp: COAT, thick: th(16), base: 3.4, a });
  const lw = LW(0.45);
  for (const qy of [-80, -66, -52]) {
    const half = Math.sqrt(Math.max(0, 900 - (qy + 66) ** 2)) * 0.92 - 3 / Math.max(1, s);
    thickLine(TP([-half, qy]), TP([half, qy]), COAT[2], lw);
  }
  if (Math.abs(f) < 0.999) { const za = (1 - Math.abs(f)) * a, gz = fade(c, za); const p = TP([0, -92]), q = TP([0, -40]); gz.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), COAT[1]); }
  puff(c, g, r, s, P, TP, a);

  // ---- arms, held balls, mittens
  const holdA = o.hold ? (o.hold.a ?? smt(o.hold.k ?? 0, 0, 0.35)) : 0;
  const hb = {}, hbW = {};
  const arm = (side) => {
    const sh = side === "L" ? r.shL : r.shR, hd = side === "L" ? r.hL : r.hR, el = side === "L" ? r.elL : r.elR;
    // a smooth sleeve: quadratic curve through the elbow, built from short capsules (rounded bend, never self-intersects)
    const ctl = sub(mul(el, 2), mul(add(sh, hd), 0.5)), N = 6, pts = [];
    for (let i = 0; i <= N; i++) { const q = i / N, u2 = 1 - q; pts.push(P([u2 * u2 * sh[0] + 2 * u2 * q * ctl[0] + q * q * hd[0], u2 * u2 * sh[1] + 2 * u2 * q * ctl[1] + q * q * hd[1]])); }
    const caps = []; for (let i = 0; i < N; i++) caps.push(tubeP(pts[i], pts[i + 1], th(lerp(8, 7, i / N)), th(lerp(8, 7, (i + 1) / N))));
    blob(c, caps, { ramp: COAT, thick: th(6), a });
    const fa = sub(hd, el), u = len(fa) > 1 ? unit(fa) : unit(sub(hd, sh));
    const inn = side === "L" ? [u[1], -u[0]] : [-u[1], u[0]];   // thumb side: inward for a hanging arm, fixed sense
    return { sh, hd, u, inn };
  };
  const arms = { L: arm("L"), R: arm("R") };
  const mitten = (side) => {
    const { hd, u, inn } = arms[side], ang = Math.atan2(u[1], u[0]), thumb = add(hd, add(mul(inn, 4.6), mul(u, -0.6)));
    blob(c, [E(hd[0], hd[1], 7, 6.5, ang), E(thumb[0], thumb[1], 2.9, 2.5, ang)], { ramp: MITT, thick: th(4), a });
    knit(c, g, P, hd, u, s, a);
  };
  for (const side of ["L", "R"]) if (r.lateMitten !== side) mitten(side);
  // ball in the throwing hand, in front of the palm
  let ballS = null, ballW = null;
  if (o.holdBall) {
    const b = heldBall(r, o.ballHand ?? 0), ba = (o.holdBallA ?? 1) * a;
    ballW = [x + b[0] * Kc, y + b[1] * Kc];
    drawBall(c, G, ballW[0], ballW[1], { ramp: o.holdBall, r: OWNER.ballR, a: ba, spin: o.ballSpin ?? -0.4 });
    ballS = P(b);
  }
  // two balls shown to the viewer in the raised mittens
  if (o.hold && holdA > 0) for (const side of ["L", "R"]) {
    const ramp = o.hold[side]; if (!ramp) continue;
    const hd = arms[side].hd, b = [hd[0] + (side === "L" ? 1 : -1), hd[1] - 7.5];
    drawBall(c, G, x + b[0] * Kc, y + b[1] * Kc, { ramp, r: OWNER.ballR, a: holdA * a, spin: side === "L" ? 0.5 : -0.5 });
    const thumb = [hd[0] + (side === "L" ? 5 : -5), hd[1] - 4];
    blob(c, [E(thumb[0], thumb[1], 3, 2.6, side === "L" ? -0.8 : 0.8)], { ramp: MITT, thick: th(3), a });
    hb[side] = P(b); hbW[side] = [x + b[0] * Kc, y + b[1] * Kc];
  }

  // ---- scarf (torso frame; the tail hangs on the screen-right side as in hero.mjs)
  const sl = r.B.shL[1] * 0.3 + r.B.shR[1] * 0.3;
  blob(c, [E(0, -96 + sl, 24, 8, 0, TP), tubeP(TP([10, -94 + sl]), TP([14 + r.B.lean * -8, -72 + sl]), th(5), th(4.5))], { ramp: SCARF, thick: th(5), a });

  // ---- head (tilts about its centre)
  const hc = r.head, tl = r.tilt, HP = (p) => P(add(hc, rot(p, tl)));
  const HE = (cx, cy, rx, ry) => ell(cx, cy, rx, ry, 0, nE(rx, ry)).map((p) => HP(p));
  blob(c, [HE(0, 0, 27, 26)], { ramp: SKIN, thick: th(14), base: 4.2, a });
  flat(c, [[[-25, -10], [-20, -2], [-10, -8], [0, -1], [10, -8], [20, -2], [25, -10], [20, -20], [-20, -20]].map(HP)], HAIR, { a });
  blob(c, [HE(0, -20, 28, 17), HE(0, -41, 9, 9)], { ramp: HAT, thick: th(10), a });
  g.poly([[-27, -11], [27, -11], [27, -6], [-27, -6]].map(HP), HAT[5]);
  thickLine(HP([-27, -10.6]), HP([26.5, -10.6]), HAT[6], LW(0.4));
  { const kb = smt(s, 1.3, 2.0) * a; if (kb > 0) thickLine(HP([-26.5, -6.4]), HP([26.5, -6.4]), HAT[4], LW(0.35), fade(c, kb)); }   // shaded lower edge, fades in with zoom
  // face
  const fx = f * 4, look = o.look ?? [f * 0.6, 0], er = 5.6 * s;
  for (const sd of [-1, 1]) { const e = HP([sd * 10 + fx, 5]); eye(c, e[0], e[1], er, { iris: SCARF, pupil: "round", look, blink: o.blink ?? 0, lid: SKIN[4], a }); }
  const br = o.brows ?? 0;
  if (br > 0.01) {
    const gb = fade(c, a * smt(br, 0, 0.35));
    for (const sd of [-1, 1]) {
      const bx = sd * 10 + fx, p = HP([bx - 5, -4 + (sd < 0 ? 2.4 * br : -0.6 * br)]), q = HP([bx + 5, -4 + (sd > 0 ? 2.4 * br : -0.6 * br)]);
      const w = LW(0.5); for (let i = 0; i < w; i++) gb.line(R(p[0]), R(p[1]) + i, R(q[0]), R(q[1]) + i, BROW);
    }
  }
  for (const sd of [-1, 1]) { const b = HP([sd * 16 + fx, 12]); blush(c, b[0], b[1], 5 * s, 2.5 * s, "#F07A8A", a); }
  mouth(g, HP, fx, o.mouth ?? "smile", s);
  // late mitten (scratching over the head)
  if (r.lateMitten) mitten(r.lateMitten);

  const top = HP([0, -50]);
  const W = (p) => [x + p[0] * Kc, y + p[1] * Kc];
  return { head: P(hc), handL: P(r.hL), handR: P(r.hR), top, ball: ballS, balls: hb, chest: TP([0, -70]), feet: [X0, Y0],
    world: { head: W(hc), handL: W(r.hL), handR: W(r.hR), top: W(add(hc, rot([0, -50], r.tilt))), ball: ballW, balls: hbW } };
}

// ---------------------------------------------------------------- parts
/** Capsule-ish tapered tube between two screen points (radius r0 → r1). */
function tubeP(p, q, r0, r1) {
  const d = unit(sub(q, p)), n = [-d[1], d[0]], out = [], N = 7;
  for (let i = 0; i <= N; i++) { const a = -PI / 2 + (PI * i) / N, c = Math.cos(a), s = Math.sin(a); out.push(add(q, add(mul(d, c * r1), mul(n, s * r1)))); }
  for (let i = 0; i <= N; i++) { const a = PI / 2 + (PI * i) / N, c = Math.cos(a), s = Math.sin(a); out.push(add(p, add(mul(d, c * r0), mul(n, s * r0)))); }
  return out;
}

/** Mouth at head-local (fx, 14); sizes scale with s (px per hu). */
function mouth(g, HP, fx, type, s) {
  const c0 = HP([fx, 14]), X = c0[0], Y = c0[1], lw = Math.max(1, Math.round(s * 0.45));
  if (type === "flat") { const p = HP([fx - 3, 16]), q = HP([fx + 3, 16]); for (let i = 0; i < lw; i++) g.line(R(p[0]), R(p[1]) + i, R(q[0]), R(q[1]) + i, INK); return; }
  if (type === "o") {
    const rx = Math.max(1.6, 2.3 * s), ry = Math.max(2, 2.8 * s), cx = X, cy = Y + ry * 0.55;
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2; if (d > 1) continue;
      const inner = ((x + 0.5 - cx) / Math.max(0.5, rx - lw)) ** 2 + ((y + 0.5 - cy) / Math.max(0.5, ry - lw)) ** 2;
      g.px(x, y, inner > 1 ? INK : y + 0.5 > cy + ry * 0.25 ? TONGUE : MOUTH_IN);
    }
    return;
  }
  if (type === "grin") {
    const w = Math.max(3, 5 * s), h = Math.max(2.5, 4.2 * s), cx = X, cy = Y - s * 0.6;
    for (let y = Math.floor(cy); y <= Math.ceil(cy + h + 1); y++) for (let x = Math.floor(cx - w - 1); x <= Math.ceil(cx + w + 1); x++) {
      const dx = (x + 0.5 - cx) / w, dy = (y + 0.5 - cy) / h; if (dy < 0 || dx * dx + dy * dy > 1) continue;
      const iw = Math.max(0.5, w - lw), ih = Math.max(0.5, h - lw), idx = (x + 0.5 - cx) / iw, idy = (y + 0.5 - cy - lw) / ih;
      let col = MOUTH_IN;
      if (y < cy + lw || idx * idx + Math.max(0, idy) ** 2 > 1) col = INK;
      else if (s >= 1.6 && y < cy + lw + Math.max(1, R(s * 0.9))) col = "#FFF6EE";
      else if (dy > 0.55) col = TONGUE;
      g.px(x, y, col);
    }
    return;
  }
  // smile
  const w = Math.max(2, 3.5 * s), h = Math.max(1, w * 0.42);
  for (let i = -R(w); i <= R(w); i++) { const u = i / w, yy = Y + h * (1 - u * u); for (let j = 0; j < lw; j++) g.px(R(X + i), R(yy) + j, INK); }
}

/** Puffy quilt bands: a soft darker tone beside each seam (fades in from z ≈ 1.6 so it never pops). */
const COAT_IDX = new Map(COAT.map((h, i) => [parseInt(h.slice(1), 16), i]));
function puff(c, g, r, s, P, TP, a) {
  const k = smt(s, 1.4, 2.3) * a; if (k <= 0) return;
  const gp = fade(c, k), inv = (X, Y) => { const q = [(X - P([0, 0])[0]) / s, (Y - P([0, 0])[1]) / s]; return add(PIV, rot(sub(q, [r.B.bdx, PIV[1] + r.B.bdy]), -r.B.lean)); };
  const pts = [TP([-31, -97]), TP([31, -97]), TP([-31, -35]), TP([31, -35])];
  const x0 = Math.floor(Math.min(...pts.map((p) => p[0]))), x1 = Math.ceil(Math.max(...pts.map((p) => p[0]))), y0 = Math.floor(Math.min(...pts.map((p) => p[1]))), y1 = Math.ceil(Math.max(...pts.map((p) => p[1])));
  const d = c.d, W = c.w, Hh = c.h, seam = 1.0 / s;
  for (let Y = Math.max(0, y0); Y <= Math.min(Hh - 1, y1); Y++) for (let X = Math.max(0, x0); X <= Math.min(W - 1, x1); X++) {
    const i = (Y * W + X) * 3, idx = COAT_IDX.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    if (idx == null || idx < 3) continue;
    const q = inv(X + 0.5, Y + 0.5); let dv = 9;
    for (const qy of [-80, -66, -52]) dv = Math.min(dv, Math.abs(q[1] - qy));
    if (dv < seam * 0.9 || dv > 2.6) continue;
    const below = [-80, -66, -52].some((qy) => q[1] > qy && q[1] - qy < 2.6);
    const kk = 1 - dv / 2.6;
    if (kk * (below ? 1.0 : 0.7) > 0.35) gp.px(X, Y, COAT[idx - 1]);
  }
}

/** Knit stitches + ribbed cuff on a mitten, fading in from z ≈ 1.8 (px per hu ≈ 1.5). */
const MITT_IDX = new Map(MITT.map((h, i) => [parseInt(h.slice(1), 16), i]));
function knit(c, g, P, hd, u, s, a) {
  const k = smt(s, 1.4, 2.4) * a; if (k <= 0) return;
  const gk = fade(c, k), C = P(hd), rad = 8 * s, d = c.d, W = c.w;
  const n = [-u[1], u[0]];
  for (let Y = Math.floor(C[1] - rad); Y <= Math.ceil(C[1] + rad); Y++) for (let X = Math.floor(C[0] - rad); X <= Math.ceil(C[0] + rad); X++) {
    if (X < 0 || Y < 0 || X >= W || Y >= c.h) continue;
    const i = (Y * W + X) * 3, idx = MITT_IDX.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); if (idx == null || idx < 2) continue;
    const dx = (X + 0.5 - C[0]) / s, dy = (Y + 0.5 - C[1]) / s, along = dx * u[0] + dy * u[1], across = dx * n[0] + dy * n[1];
    if (along < -4.2) { if (((Math.floor(across / 1.6) % 2) + 2) % 2 === 0) gk.px(X, Y, MITT[Math.max(1, idx - 1)]); continue; }   // ribbed cuff
    const cu = ((across % 2.4) + 2.4) % 2.4, ru = ((along % 2.2) + 2.2) % 2.2, vv = Math.abs(cu - 1.2);
    if (Math.abs(ru - (1.9 - vv * 0.9)) < 0.28) gk.px(X, Y, MITT[Math.max(1, idx - 1)]);
  }
}

export { rig as ownerRig, BALL, mix };
