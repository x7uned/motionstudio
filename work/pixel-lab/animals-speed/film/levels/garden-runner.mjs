// The film's sprinter (hook in the garden + LV3 stadium): a generic cute chibi runner — teal running vest with a race
// number, navy shorts, white socks, coral spikes, a red headband whose tails stream in the wind, spiky brown hair, big
// glossy eyes. NOT a likeness of any real athlete (no real face, no signature pose).
// A small angle rig (facing right, +x forward, y down, local px at s = 1): poses are plain parameter sets, so any two
// interpolate continuously (set → drive → run → stop → pant / cheer). Limbs are volume-shaded tubes (cute.mjs blob),
// the face is drawn live (eyes, brows, mouth weights dissolve into each other — no one-frame swaps).
//
//   runPose(p, lean?)            gait at phase p (0 = near foot touches down; far leg half a cycle later)
//   POSES.stand / set / pant / cheer / stop     static keys;  mixPose(A, B, k)
//   drawRunner(c, x, y, { s, pose, face, a, wind, t })   (x, y) = screen ground point under the hip
//   runnerHead(c, cx, cy, s, face, o)            the head alone (ICON, crowds)
import { blob, flat, ell, tube, bez, eye, blush, smile, RAMP, fade, mix, clamp01, lerp, bayer, MAIN } from "../cute.mjs";

const R = Math.round, TAU = Math.PI * 2;
export const SKIN = ["#2A1410", "#55281E", "#834430", "#AE6648", "#CC8660", "#E2A47C", "#F0C29C", "#FADFC2"];
export const VEST = ["#061E26", "#0C3640", "#11545E", "#18767E", "#2298A0", "#46BABA", "#82D8D0", "#C6F2EA"];
export const SHORTS = ["#0A0A1A", "#141634", "#1E2250", "#2A306C", "#3A428A", "#5058A6", "#6A74BE", "#8E98D6"];
export const SHOE = ["#3A0A14", "#6A1424", "#9C2234", "#CE3446", "#EE5A5E", "#F88A84", "#FCB8AC", "#FFE4DA"];
export const BAND = ["#34060E", "#5E0C1A", "#8E1424", "#BE1E30", "#E2363E", "#F2686A", "#F8A09A", "#FFD8D2"];
export const HAIR = ["#0E0806", "#1E120C", "#2E1C12", "#40281A", "#543422", "#6A442C", "#86583A", "#A2724C"];
const WHITE = ["#2A2C3A", "#4E5268", "#7A7E96", "#A4A8BE", "#C6C8DA", "#E0E2EE", "#F2F4FA", "#FFFFFF"];
const OUT = "#1A0C0C", SKIN_LIT = "#FFE8D0";
const IRIS = ["#120804", "#2A1408", "#4A2410", "#6E3A18", "#945424", "#B87434", "#D89A52", "#F2C27C"];

// ---------------------------------------------------------------- rig constants (px at s = 1)
const L_TH = 41, L_SH = 39, L_UA = 30, L_FA = 28, TORSO = 70, ANK = 8, HEAD_R = 52;
export const HIP_H = L_TH + L_SH + ANK - 2;   // hip height of a standing runner
export const HEIGHT = HIP_H + TORSO + 44 + HEAD_R + 10;
const dirA = (a) => [Math.sin(a), Math.cos(a)];              // angle from straight down, positive = forward (+x)
const addv = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k];

// ---------------------------------------------------------------- poses
// { hx, hy: hip (local), lean (torso, rad, + = forward), n/f leg: Th Kn Ft, n/f arm: Sh El, hd: [dx, dy] head offset, ht: head tilt }
const KEYS = ["hx", "hy", "lean", "nTh", "nKn", "nFt", "fTh", "fKn", "fFt", "nSh", "nEl", "fSh", "fEl", "hdx", "hdy"];
export function mixPose(A, B, k) { k = clamp01(k); const o = {}; for (const n of KEYS) o[n] = lerp(A[n] ?? 0, B[n] ?? 0, k); return o; }

/** Two-bone IK in angle form: hip→ankle target, knee forward (legs) or elbow back (arms). */
function ikAngles(root, target, L1, L2, bendFwd) {
  const dx = target[0] - root[0], dy = target[1] - root[1], d = Math.min(L1 + L2 - 0.01, Math.max(Math.abs(L1 - L2) + 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(dx, dy);                              // angle from down, + forward
  const a1 = Math.acos(clamp01((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const th = bendFwd ? base + a1 : base - a1;
  const a2 = Math.atan2(target[0] - (root[0] + Math.sin(th) * L1), target[1] - (root[1] + Math.cos(th) * L1));
  return [th, th - a2];                                          // [upper angle, flexion]  (lower = upper − flexion)
}
function legFrom(hip, ankle) { return ikAngles(hip, ankle, L_TH, L_SH, true); }
function armFrom(sh, hand) { const [a, f] = ikAngles(sh, hand, L_UA, L_FA, false); return [a, -f]; }  // elbow back → forearm = sh + el
function shoulderOf(P) { const up = [Math.sin(P.lean), -Math.cos(P.lean)]; return [P.hx + up[0] * (TORSO - 12), P.hy + up[1] * (TORSO - 12)]; }
function staticPose(P, feet, hands) {
  const o = { ...P }, hipN = [P.hx + 2, P.hy], hipF = [P.hx - 6, P.hy - 2];
  [o.nTh, o.nKn] = legFrom(hipN, feet[0]); [o.fTh, o.fKn] = legFrom(hipF, feet[1]);
  const S = shoulderOf(P); [o.nSh, o.nEl] = armFrom([S[0] + 3, S[1]], hands[0]); [o.fSh, o.fEl] = armFrom([S[0] - 7, S[1] - 2], hands[1]);
  return o;
}
export const POSES = {
  stand: staticPose({ hx: 0, hy: -HIP_H + 1, lean: 0.02, nFt: 0, fFt: 0, hdx: 0, hdy: 0 }, [[4, -ANK], [-10, -ANK]], [[16, -HIP_H + 8], [-20, -HIP_H + 10]]),
  // in the blocks ("set"): hips up, torso pitched forward, fingertips on the line, front foot in the front block
  set: staticPose({ hx: -20, hy: -62, lean: 1.2, nFt: 0.55, fFt: 0.75, hdx: 8, hdy: 2 }, [[12, -ANK - 3], [-46, -ANK - 5]], [[52, -9], [42, -9]]),
  // "on your marks": hips low, back knee almost on the track
  marks: staticPose({ hx: -24, hy: -44, lean: 1.32, nFt: 0.5, fFt: 1.1, hdx: 8, hdy: 4 }, [[12, -ANK - 3], [-46, -ANK - 4]], [[50, -9], [40, -9]]),
  // hands on knees, panting
  pant: staticPose({ hx: -6, hy: -HIP_H + 12, lean: 0.62, nFt: 0, fFt: 0, hdx: 4, hdy: 6 }, [[10, -ANK], [-16, -ANK]], [[30, -HIP_H + 46], [20, -HIP_H + 44]]),
  // both arms up, a happy finish (generic cheer)
  cheer: staticPose({ hx: 0, hy: -HIP_H + 2, lean: -0.04, nFt: 0, fFt: 0, hdx: -2, hdy: -2 }, [[10, -ANK], [-14, -ANK]], [[36, -HIP_H - 50], [2, -HIP_H - 56]]),
};
// skid to a stop: leaning back, front heel planted
POSES.stop = staticPose({ hx: -10, hy: -HIP_H + 10, lean: -0.22, nFt: -0.3, fFt: 0.4, hdx: -6, hdy: 2 }, [[34, -ANK], [-26, -ANK - 6]], [[30, -HIP_H - 40], [-36, -HIP_H - 30]]);

// gait keys [phase, thigh, knee, foot] for the near leg (phase 0 = touch-down); the far leg runs half a cycle later
const GAIT = [[0.0, 0.42, 0.32, 0.05], [0.12, 0.06, 0.6, -0.05], [0.27, -0.55, 0.22, 0.55], [0.42, -0.42, 1.7, 0.5],
  [0.57, 0.36, 2.15, 0.3], [0.72, 1.05, 1.5, 0.2], [0.87, 0.86, 0.62, 0.12]];
function cycKeys(keys, p) {
  p = ((p % 1) + 1) % 1; const n = keys.length; let i = n - 1; for (let j = 0; j < n; j++) if (keys[j][0] <= p) i = j;
  const k0 = keys[(i - 1 + n) % n], k1 = keys[i], k2 = keys[(i + 1) % n], k3 = keys[(i + 2) % n];
  const t1 = k1[0], t2 = k2[0] + (i + 1 >= n ? 1 : 0), u = ((p < t1 ? p + 1 : p) - t1) / (t2 - t1), u2 = u * u, u3 = u2 * u, out = [];
  for (let j = 1; j < k1.length; j++) out.push(0.5 * (2 * k1[j] + (-k0[j] + k2[j]) * u + (2 * k0[j] - 5 * k1[j] + 4 * k2[j] - k3[j]) * u2 + (-k0[j] + 3 * k1[j] - 3 * k2[j] + k3[j]) * u3));
  return out;
}
/** Sprint gait at phase p. amp 0..1 scales the stride (jog → sprint). */
export function runPose(p, amp = 1) {
  const [nTh, nKn, nFt] = cycKeys(GAIT, p), [fTh, fKn, fFt] = cycKeys(GAIT, p + 0.5), q = amp;
  const sw = Math.sin(TAU * (p - 0.03)), bob = 4.5 * Math.cos(2 * TAU * (p - 0.12));
  return {
    hx: 0, hy: -HIP_H + 6 + bob * q, lean: 0.06 + 0.24 * q + 0.03 * Math.sin(2 * TAU * p),
    nTh: nTh * q, nKn: lerp(0.3, nKn, q), nFt: nFt * q, fTh: fTh * q, fKn: lerp(0.3, fKn, q), fFt: fFt * q,
    nSh: (0.12 + 0.95 * sw) * q, nEl: lerp(0.4, 1.5 + 0.35 * sw, q), fSh: (0.12 - 0.95 * sw) * q, fEl: lerp(0.4, 1.5 - 0.35 * sw, q),
    hdx: 2 * q, hdy: 1.5 * Math.cos(2 * TAU * (p - 0.2)) * q,
  };
}
/** Is the near/far foot on the ground at gait phase p? (for dust puffs and footstep sounds) */
export const STEP_PHASES = [0.0, 0.5];

// ---------------------------------------------------------------- joints
export function joints(P) {
  const up = [Math.sin(P.lean), -Math.cos(P.lean)], hip = [P.hx, P.hy];
  const leg = (hp, th, kn, ft) => { const k = addv(hp, dirA(th), L_TH), a2 = th - kn, an = addv(k, dirA(a2), L_SH), fa = a2 + Math.PI / 2 - ft; return { hip: hp, knee: k, ankle: an, shin: a2, foot: fa }; };
  const arm = (sp, sh, el) => { const e = addv(sp, dirA(sh), L_UA), h = addv(e, dirA(sh + el), L_FA); return { sh: sp, elbow: e, hand: h }; };
  const S = [P.hx + up[0] * (TORSO - 12), P.hy + up[1] * (TORSO - 12)];
  const neck = [P.hx + up[0] * TORSO, P.hy + up[1] * TORSO];
  const hl = P.lean * 0.45, head = [neck[0] + Math.sin(hl) * 46 + 6 + (P.hdx ?? 0), neck[1] - Math.cos(hl) * 46 + (P.hdy ?? 0)];
  return {
    up, hip, neck, head,
    legN: leg([P.hx + 2, P.hy], P.nTh, P.nKn, P.nFt), legF: leg([P.hx - 6, P.hy - 2], P.fTh, P.fKn, P.fFt),
    armN: arm([S[0] + 3, S[1]], P.nSh, P.nEl), armF: arm([S[0] - 7, S[1] - 2], P.fSh, P.fEl),
  };
}

// ---------------------------------------------------------------- drawing
const shoeLocal = (an, fa) => { const d = dirA(fa), n = [d[1], -d[0]]; // d = toe direction; n = "up" of the foot
  const heel = [an[0] - d[0] * 6 + n[0] * -ANK * 0.55, an[1] - d[1] * 6 + n[1] * -ANK * 0.55];
  return { d, n, heel, toe: [heel[0] + d[0] * 27, heel[1] + d[1] * 27] }; };

/**
 * Draw the runner. (x, y) = screen ground point under the hip at rest; o.s scale; o.pose (from runPose/POSES/mixPose);
 * o.face {brow, grin, o, pant, flat, blink, wide, sweat, look, jaw}; o.wind 0..1 (headband tails, hair); o.t time; o.a dissolve.
 */
export function drawRunner(c, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const s = o.s ?? 1, P = o.pose ?? POSES.stand, J = joints(P), t = o.t ?? 0, wind = o.wind ?? 0;
  const T = (p) => [x + p[0] * s, y + p[1] * s];
  const opt = (ramp, extra = {}) => ({ ramp, a, outline: OUT, litOutline: null, thick: 6 * s, base: 3.3, gain: 1.6, ...extra });
  const limbLeg = (L, far) => {
    const k = far ? 0.82 : 1;
    // skin leg (thigh + shin), white sock, spike shoe; shorts leg on the upper thigh
    blob(c, [tube([T(L.hip), T(L.knee)], 12 * s * k, 9.6 * s * k), tube([T(L.knee), T(L.ankle)], 9.4 * s * k, 6.8 * s * k), ell(...T(L.knee), 9.6 * s * k, 9.6 * s * k)], opt(SKIN, { base: far ? 2.4 : 3.4, thick: 7 * s }));
    const sk = addv(L.ankle, dirA(L.shin), -9);
    blob(c, [tube([T(sk), T(L.ankle)], 7.4 * s * k, 7.2 * s * k)], opt(WHITE, { base: far ? 3.2 : 4.6, gain: 1.2, thick: 4 * s }));
    const sh = shoeLocal(L.ankle, L.foot);
    blob(c, [tube([T(sh.heel), T(addv(sh.heel, sh.d, 14)), T(sh.toe)], 8 * s * k, 6 * s * k)], opt(SHOE, { base: far ? 2.6 : 3.6, gain: 1.4, thick: 5 * s }));
    // white sole + little spikes under the toe
    const g = fade(c, a), sole = (q) => T(addv(addv(sh.heel, sh.d, q), sh.n, 5.6 * k));
    for (let q = 0; q <= 25; q += 0.5) { const p = sole(q); g.px(R(p[0]), R(p[1]), far ? WHITE[4] : WHITE[6]); }
    for (const q of [16, 21, 26]) { const p = T(addv(addv(sh.heel, sh.d, q), sh.n, 8.6 * k)); g.px(R(p[0]), R(p[1]), "#2A2A36"); if (s > 0.9) g.px(R(p[0]), R(p[1]) + 1, "#2A2A36"); }
    // a lighter stripe on the shoe side
    if (!far) { const p0 = T(addv(addv(sh.heel, sh.d, 7), sh.n, 1)), p1 = T(addv(addv(sh.heel, sh.d, 16), sh.n, -2.5)); g.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), SHOE[6]); }
  };
  const shortsLeg = (L, far) => [tube([T(addv(L.hip, [0, -4], 1)), T(addv(L.hip, dirA(Math.atan2(L.knee[0] - L.hip[0], L.knee[1] - L.hip[1])), 21))], 14.5 * s * (far ? 0.85 : 1), 13.6 * s * (far ? 0.85 : 1))];
  const limbArm = (A, far) => {
    const k = far ? 0.84 : 1;
    blob(c, [tube([T(A.sh), T(A.elbow)], 8.2 * s * k, 7 * s * k), tube([T(A.elbow), T(A.hand)], 7 * s * k, 6.2 * s * k), ell(...T(A.elbow), 7 * s * k, 7 * s * k)], opt(SKIN, { base: far ? 2.4 : 3.5, thick: 5 * s }));
    blob(c, [ell(...T(A.hand), 9 * s * k, 8.6 * s * k)], opt(SKIN, { base: far ? 2.6 : 3.8, thick: 5 * s }));
  };
  // torso polygon in torso coordinates (u up the spine, v forward)
  const up = J.up, fw = [-up[1], up[0]];   // forward = up rotated clockwise
  const TV = (u, v) => T([P.hx + up[0] * u + fw[0] * v, P.hy + up[1] * u + fw[1] * v]);
  const torsoPts = [[-6, -26], [8, -28], [30, -26], [52, -29], [64, -27], [72, -17], [75, 0], [72, 17], [64, 26], [52, 28], [30, 25], [8, 27], [-6, 24]].map(([u, v]) => TV(u, v));
  const vestPts = [[-2, -25], [8, -27], [30, -25], [50, -26], [60, -20], [69, -12], [71, -5], [64, 0], [62, 7], [69, 12], [66, 17], [56, 23], [46, 26], [30, 24], [8, 26], [-2, 23]].map(([u, v]) => TV(u, v));

  // --- back to front
  // headband tails behind the head
  const H = J.head, HS = T(H);
  bandTails(c, HS, s, wind, t, a);
  limbArm(J.armF, true);
  blob(c, shortsLeg(J.legF, true), opt(SHORTS, { base: 2.4, thick: 6 * s }));
  limbLeg(J.legF, true);
  blob(c, [torsoPts], opt(SKIN, { base: 3.3, thick: 14 * s }));
  blob(c, [vestPts], opt(VEST, { base: 3.4, gain: 1.8, thick: 14 * s }));
  // vest: white side stripe and the race bib with the number
  { const g = fade(c, a);
    for (let u = 4; u < 60; u++) { const p = TV(u, 21.5 - (u > 46 ? (u - 46) * 0.3 : 0)); g.px(R(p[0]), R(p[1]), VEST[6]); if (s > 0.9) g.px(R(p[0]) + 1, R(p[1]), VEST[7]); }
    const bib = [[20, -5], [20, 18], [46, 18], [46, -5]].map(([u, v]) => TV(u, v));
    g.poly(bib, "#F6F2E6"); for (let i = 0; i < 4; i++) { const p = bib[i], q = bib[(i + 1) % 4]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#7A7A86"); }
    for (const [u, v] of [[43, -2], [43, 15]]) { const p = TV(u, v); g.px(R(p[0]), R(p[1]), "#C8C8D2"); }
    // number "8" drawn in the bib's frame (upright enough at every lean the poses use)
    const cxy = TV(33, 6.5), sc = s >= 0.95 ? 2 : 1, tw = c.measure(MAIN, "8", { scale: sc });
    g.text(MAIN, "8", R(cxy[0] - tw / 2), R(cxy[1] - 3.5 * sc), "#1A1A2A", { scale: sc });
  }
  blob(c, [...shortsLeg(J.legN, false), [[-4, -27], [14, -28], [14, 28], [-4, 26], [-10, 0]].map(([u, v]) => TV(u, v))], opt(SHORTS, { base: 3.2, thick: 8 * s }));
  { const g = fade(c, a), p0 = TV(13, -23), p1 = TV(13, 23); g.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), SHORTS[5]); }
  limbLeg(J.legN, false);
  drawHead(c, HS[0], HS[1], s, o.face ?? {}, { a, wind, t, tilt: P.lean * 0.08 });
  limbArm(J.armN, false);
  return { J, T, head: HS, feet: [T(J.legN.ankle), T(J.legF.ankle)] };
}

/** Two headband tails streaming back from the knot (wind 0 hangs down, 1 flies straight back with a flutter). */
function bandTails(c, HS, s, wind, t, a) {
  const knot = [HS[0] - 47 * s, HS[1] - 10 * s];
  for (const [k, len, ph] of [[0, 30, 0], [1, 24, 1.7]]) {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, ang = lerp(0.25 + 0.15 * k, 1.45 - 0.18 * k, wind) + (0.18 + 0.22 * wind) * Math.sin(t * lerp(3, 17, wind) - u * 4 + ph) * u;
      const prev = pts.length ? pts[pts.length - 1] : knot, step = (len * s) / 8;
      pts.push(i === 0 ? knot : [prev[0] - Math.sin(ang) * step, prev[1] + Math.cos(ang) * step]);
    }
    blob(c, [tube(pts, 4.2 * s, 3 * s)], { ramp: BAND, a, outline: OUT, thick: 3 * s, base: k ? 2.6 : 3.2, gain: 1.2 });
  }
}

/** The head (also used alone for ICON): (cx, cy) = head centre. face: see drawRunner. */
export function drawHead(c, cx, cy, s, face = {}, o = {}) {
  const a = o.a ?? 1, wind = o.wind ?? 0, t = o.t ?? 0, g = fade(c, a);
  const H = (dx, dy) => [cx + dx * s, cy + dy * s];
  const opt = (ramp, extra = {}) => ({ ramp, a, outline: OUT, litOutline: null, ...extra });
  // ear (back of the head, 3/4 view facing right)
  blob(c, [ell(...H(-39, 10), 9 * s, 12 * s, -0.2)], opt(SKIN, { base: 3.4, thick: 6 * s }));
  // head: round skull + a soft cheek/chin toward the front
  blob(c, [ell(...H(0, 0), 50 * s, 47 * s), ell(...H(9, 16), 38 * s, 30 * s)], opt(SKIN, { base: 3.9, gain: 1.7, thick: 22 * s, litOutline: null }));
  { const p = H(-39, 10); g.line(R(p[0] + 2 * s), R(p[1] - 5 * s), R(p[0] + 3 * s), R(p[1] + 5 * s), SKIN[2]); }
  // hair: cap over the top and the back, spiky tufts above the band blown back by the wind
  const wb = wind * 6;
  const hair = [H(-52, 6), H(-53, -10), H(-47, -30), H(-36, -44), H(-18, -52), H(4, -53), H(24, -48), H(40, -36), H(49, -20), H(46, -14), H(30, -18), H(10, -20), H(-10, -16), H(-30, -10), H(-42, -2), H(-46, 8)];
  const tufts = [];
  for (const [bx, by, h, lean] of [[-40, -38, 16, -0.9], [-24, -50, 18, -0.6], [-6, -54, 19, -0.35], [12, -52, 17, -0.15], [28, -44, 14, 0.15]]) {
    const L = lean - wind * 0.35, b0 = H(bx - 7, by + 4), b1 = H(bx + 7, by + 4), tip = H(bx + Math.sin(L) * h - wb * 0.4, by - Math.cos(L) * h + wb * 0.1);
    tufts.push([b0, tip, b1]);
  }
  blob(c, [hair, ...tufts], opt(HAIR, { base: 3.2, gain: 2.2, thick: 10 * s, litOutline: HAIR[6] }));
  // headband across the forehead (follows the skull curve)
  const band = [], bandB = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14, xx = lerp(-49, 49, u), yy = -22 + 7 * u * u - 16 * Math.pow(Math.abs(u - 0.15), 2) * 0.4; band.push(H(xx, yy)); bandB.push(H(xx, yy + 12)); }
  blob(c, [[...band, ...bandB.reverse()]], opt(BAND, { base: 3.6, gain: 1.4, thick: 5 * s }));
  for (let i = 0; i <= 28; i++) { const u = i / 28, xx = lerp(-48, 48, u), yy = -22 + 7 * u * u - 16 * Math.pow(Math.abs(u - 0.15), 2) * 0.4 + 6; const p = H(xx, yy); g.px(R(p[0]), R(p[1]), "#FFF4EC"); if (s > 0.9) g.px(R(p[0]) + 1, R(p[1]), "#FFF4EC"); }
  { const k = H(-47, -10); blob(c, [ell(k[0], k[1], 6 * s, 7 * s)], opt(BAND, { base: 2.8, thick: 4 * s })); }
  drawFace(c, cx, cy, s, face, a, t);
}

/** Face: eyes, brows, nose, mouth weights (flat / grin / o / pant), blush, sweat drops. */
export function drawFace(c, cx, cy, s, f = {}, a = 1, t = 0) {
  const g = fade(c, a), F = (dx, dy) => [cx + dx * s, cy + dy * s];
  const brow = f.brow ?? 0, wide = clamp01(f.wide ?? 0), blink = clamp01(f.blink ?? 0), look = f.look ?? [0.2, 0.1], lid = f.lid ?? 0;
  const ex = [-9, 27], ey = 9 + (f.eyeDy ?? 0), er = (10 + wide * 2.2) * s, ery = (11.8 + wide * 2.6) * s;
  for (let i = 0; i < 2; i++) { const [px, py] = F(ex[i], ey); eye(c, px, py, i ? er * 0.9 : er, { ry: ery, iris: IRIS, pupil: "round", look, blink: Math.max(blink, lid), lid: SKIN[3], a }); }
  // brows: −1 determined (down toward the middle) · 0 relaxed · +1 raised in surprise
  for (let i = 0; i < 2; i++) {
    const [bx, by] = F(ex[i], ey - 18 - Math.max(0, brow) * 6), inner = i === 0 ? 1 : -1, w = 9 * s * (i ? 0.9 : 1);
    for (let k = -1; k <= 1; k += 0.08) { const xx = bx + k * w, yy = by - brow * 3.5 * s * (k * inner) * (brow < 0 ? 1.4 : 0.6) - (brow > 0 ? (1 - k * k) * 2.5 * s * brow : 0); g.px(R(xx), R(yy), HAIR[2]); g.px(R(xx), R(yy) + 1, HAIR[2]); if (s > 0.9) g.px(R(xx), R(yy) + 2, HAIR[4]); }
  }
  // nose: a small shaded nub
  { const [nx, ny] = F(10, 21); g.px(R(nx), R(ny), SKIN[3]); g.px(R(nx) + 1, R(ny), SKIN[3]); g.px(R(nx) - 1, R(ny) - 1, SKIN[5]); }
  blush(c, ...F(-27, 25), 7 * s, 3.5 * s, "#F07A86", a); blush(c, ...F(42, 25), 5 * s, 3.2 * s, "#F07A86", a);
  // mouths (weights dissolve into each other)
  const [mx, my] = F(9, 33), W = (k) => clamp01(k);
  if (W(f.flat) > 0.02) { const q = fade(c, a * W(f.flat)), w = R(6 * s); for (let i = -w; i <= w; i++) { q.px(mx + i, R(my + 1 + Math.abs(i) * 0.12 * (f.frown ?? 1)), "#3A1414"); } }
  if (W(f.grin) > 0.02) smile(c, mx, my - 1, Math.max(3, 9 * s), { open: 0.55 + 0.25 * (f.grinOpen ?? 0), a: a * W(f.grin), col: "#3A1414", tongue: "#F0707E" });
  if (W(f.o) > 0.02) {
    // jaw drop: a tall rounded "O" that opens with f.jaw (0..1)
    const q = fade(c, a * W(f.o)), jw = clamp01(f.jaw ?? 1), rx = (4.5 + 2 * jw) * s, ry = (4 + 12 * jw) * s, oy = my + ry * 0.7 - 2 * s;
    for (let Y = R(oy - ry); Y <= R(oy + ry); Y++) for (let X = R(mx - rx); X <= R(mx + rx); X++) { const d = ((X - mx) / rx) ** 2 + ((Y - oy) / ry) ** 2; if (d > 1) continue; q.px(X, Y, d > 0.72 ? "#3A1414" : Y > oy + ry * 0.45 ? "#E8607A" : "#5A1A24"); }
    q.px(R(mx - rx * 0.4), R(oy - ry * 0.55), "#FFFFFF");
  }
  if (W(f.pant) > 0.02) {
    const q = fade(c, a * W(f.pant)), ph = 0.5 + 0.5 * Math.sin(t * 14), rx = 5.4 * s, ry = (4.4 + 2.2 * ph) * s, oy = my + 2 * s;
    for (let Y = R(oy - ry); Y <= R(oy + ry); Y++) for (let X = R(mx - rx); X <= R(mx + rx); X++) { const d = ((X - mx) / rx) ** 2 + ((Y - oy) / ry) ** 2; if (d <= 1) q.px(X, Y, d > 0.7 ? "#3A1414" : "#5A1A24"); }
    q.poly([[mx - 3.4 * s, oy + ry * 0.2], [mx + 3.4 * s, oy + ry * 0.2], [mx + 3 * s, oy + ry + 3.5 * s], [mx - 3 * s, oy + ry + 3.5 * s]], "#F0707E"); q.px(R(mx), R(oy + ry + 1 * s), "#C04A60");
  }
  // sweat drops at the temples (fall and re-form)
  const sw = clamp01(f.sweat ?? 0);
  if (sw > 0.02) for (const [dx, dy, ph] of [[-44, -14, 0], [50, 0, 0.5]]) {
    const k = ((t * 1.1 + ph) % 1), q = fade(c, a * sw * (1 - Math.max(0, k - 0.75) * 4)), [px, py] = F(dx, dy + k * 14);
    q.poly([[px, py - 5 * s], [px + 3.2 * s, py + 1], [px, py + 4 * s], [px - 3.2 * s, py + 1]], "#BFEFFF"); q.px(R(px - 1), R(py), "#FFFFFF"); q.line(R(px + 3 * s), R(py + 1), R(px), R(py + 4 * s), "#5AB4D0");
  }
}
