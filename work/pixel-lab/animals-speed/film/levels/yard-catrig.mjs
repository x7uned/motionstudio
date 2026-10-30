// Poses of the cat actor (cat.mjs) → a rig in LOCAL world units: facing right (+x = forward), y up negative,
// origin = the floor point under the middle of the body. Every pose is a pure function of its continuous parameters.
// A pose is first written as a numeric key (spine, head, paws, tail, ears, eyes); keys interpolate component-wise, so
// pounce/skid/run are smooth curves through a few keys. build() turns a key into joints (two-bone IK for the legs).
import { clamp01, lerp, s01, smr, frac, TAU, add, sub, mul, len, nrm, rot, L2, dir, curve, chain, ik2, arcs } from "./yard-catkit.mjs";

// ---------------------------------------------------------------- body constants (world units)
export const LF1 = 10.5, LF2 = 10;          // front: upper arm, forearm
export const LH1 = 10.5, LH2 = 11;          // hind: thigh, shin
const WRIST = [0.5, 2.8];                   // wrist → paw centre (paw flat)
const META = [-3.2, -7.6];                  // hind paw centre → hock (foot standing)
export const PAW_Y = -2.4;                  // paw centre height when planted
export const WALK_STRIDE = 14 / 0.62;       // world units the root must advance per walk cycle (planted paws don't slide)
export const runStride = (stretch = 0) => lerp(85, 120, clamp01(stretch)); // per gallop cycle
export const CLIMB_STRIDE = 12;             // the root rises this much per climb cycle

const PI = Math.PI;
const FLAT = -1.1;                          // metatarsal angle that lays the hind foot flat (sitting / crouching)

// ---------------------------------------------------------------- key helpers
/** Interpolate two keys component-wise (numbers and arrays of numbers). */
export function mixKey(a, b, k) {
  const o = {};
  for (const n of Object.keys(a)) {
    const x = a[n], y = b[n] ?? x;
    o[n] = Array.isArray(x) ? x.map((v, i) => lerp(v, y[i] ?? v, k)) : typeof x === "number" ? lerp(x, y, k) : k < 0.5 ? x : y;
  }
  return o;
}
/** Catmull-Rom through keys at parameters ts (non-periodic) — value at u. */
function crKeys(keys, ts, u) {
  const n = keys.length; let i = 0; while (i < n - 2 && ts[i + 1] <= u) i++;
  const t0 = ts[i], t1 = ts[i + 1], k = clamp01((u - t0) / (t1 - t0 || 1));
  const a = keys[Math.max(0, i - 1)], b = keys[i], c = keys[i + 1], d = keys[Math.min(n - 1, i + 2)];
  const h = (x0, x1, x2, x3) => { const t = k, t2 = t * t, t3 = t2 * t; return 0.5 * (2 * x1 + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (-x0 + 3 * x1 - 3 * x2 + x3) * t3); };
  const o = {};
  for (const nm of Object.keys(b)) {
    const B = b[nm];
    if (Array.isArray(B)) o[nm] = B.map((_, j) => h(a[nm][j], B[j], c[nm][j], d[nm][j]));
    else if (typeof B === "number") o[nm] = h(a[nm], B, c[nm], d[nm]);
    else o[nm] = k < 0.5 ? B : c[nm];
  }
  return o;
}
/** Periodic Hermite through [phase, ...values] keys (phases in [0,1), sorted): finite-difference tangents scaled by the
 *  real time spans, so evenly spaced collinear keys give exactly linear (planted-paw) motion. */
export function cyc(keys, p) {
  p = frac(p); const n = keys.length;
  let i = n - 1; for (let j = 0; j < n; j++) if (keys[j][0] <= p) i = j;
  const k0 = keys[(i - 1 + n) % n], k1 = keys[i], k2 = keys[(i + 1) % n], k3 = keys[(i + 2) % n];
  const t1 = k1[0], t2 = k2[0] + (i + 1 >= n ? 1 : 0), t0 = k0[0] - (i - 1 < 0 ? 1 : 0), t3 = k3[0] + (i + 2 >= n ? 1 : 0);
  const h = t2 - t1, u = ((p < t1 ? p + 1 : p) - t1) / h, u2 = u * u, u3 = u2 * u;
  const out = [];
  for (let j = 1; j < k1.length; j++) {
    const m1 = ((k2[j] - k0[j]) / (t2 - t0)) * h, m2 = ((k3[j] - k1[j]) / (t3 - t1)) * h;
    out.push((2 * u3 - 3 * u2 + 1) * k1[j] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * k2[j] + (u3 - u2) * m2);
  }
  return out;
}

// ---------------------------------------------------------------- base keys
// sp: rump, mid, chest centres · rad · chest [dx dy rx ry] · sh shoulder offset from chest · hip offset from rump ·
// hd [x y angle(+ = nose down)] · fn/ff front paws [x y pawAngle] · hn/hf hind paws [x y metatarsalAngle] ·
// th thigh [extra length, half-height] · tl tail [bx by (from rump) heading length bend bendEnd curl] ·
// ear [tilt(+ back) height open] · eye [open big lookX lookY] · mouth · tongue · puff
const STAND = {
  sp: [-26, -23, -6, -24.6, 12, -24], rad: [9.6, 10.2, 9.8], chest: [3, 2, 8, 10.4], sh: [1, -1], hip: [1, 1],
  hd: [25, -39.5, 0.04], fn: [16, PAW_Y, 0], ff: [11.5, PAW_Y, 0], hn: [-23.5, PAW_Y, 0], hf: [-19, PAW_Y, 0],
  th: [4.5, 8.2], tl: [-7, -5, -PI / 2 - 0.55, 36, 0.45, 1, 1.5], ear: [0.12, 1, 0.7], eye: [1, 0, 0.45, 0],
  mouth: 0, tongue: 0, puff: 0,
};
const SIT = {
  sp: [-12, -13, -8, -27, 3, -35.5], rad: [11.8, 10.6, 9.8], chest: [4, 3, 7.4, 10], sh: [2.5, 10.5], hip: [1, -2],
  hd: [11, -47.5, 0], fn: [10, PAW_Y, 0], ff: [6.5, PAW_Y, 0], hn: [4, PAW_Y, FLAT], hf: [0, PAW_Y, FLAT],
  th: [6.5, 11], tl: [-10, 8, PI / 2 + 0.9, 46, -2.5, 0.32, -1.0], ear: [0.1, 1, 0.75], eye: [1, 0, 0.45, 0],
  mouth: 0, tongue: 0, puff: 0,
};

/** Sitting tail: from under the rump, down to the floor, forward round the front paws, tip curling up (w = tip sway). */
function sitTail(w = 0) {
  return curve([[-21, -9], [-26, -5.5], [-24.5, -2.6], [-15, -2.4], [-1, -2.4], [11, -2.6], [16.5 + 0.6 * w, -4.6 - 0.4 * w], [18 + 1.6 * w, -8 - 0.8 * Math.abs(w)]], 3);
}

// ---------------------------------------------------------------- build: key → rig (local units)
/**
 * ext: { tailLayer: "back"|"front", hintF, hintH (IK side hints), frontOver (near front leg drawn over the head),
 *        farFront/farHind: false to hide, bib: extra cream ellipses [cx cy rx ry rot], extra: extra torso ellipses,
 *        tailWave: [amp, phase], earFlick, shadow (floor pose) }
 */
export function build(K, ext = {}) {
  const [rx, ry, mx, my, cx, cy] = K.sp, Rp = [rx, ry], Mp = [mx, my], Cp = [cx, cy];
  const spine = curve([Rp, Mp, Cp], 7), rr = K.rad;
  const radF = (t) => (t < 0.5 ? lerp(rr[0], rr[1], s01(t * 2)) : lerp(rr[1], rr[2], s01(t * 2 - 1)));
  const axis = nrm(sub(Cp, Rp));
  const chestE = [cx + K.chest[0], cy + K.chest[1], K.chest[2], K.chest[3], Math.atan2(axis[1], axis[0])];
  const S0 = add(Cp, K.sh), H0 = add(Rp, K.hip);
  const hintF = ext.bendF ?? 1, hintH = ext.bendH ?? -1;   // +1: elbow on the left of shoulder→wrist (back when hanging); −1: knee forward
  const legs = [];
  const front = (P, pa, far) => {
    const S = far ? add(S0, [-2.5, -0.5]) : S0;
    const W = sub(P.slice(0, 2), rot(WRIST, pa));
    const r = ik2(S, W, LF1, LF2, hintF), Wc = r.c, Pc = add(Wc, rot(WRIST, pa));
    return { kind: "front", far, pts: [S, r.j, Wc, Pc], P: Pc, target: P.slice(0, 2), pa, over: !far && !!ext.frontOver };
  };
  const hind = (P, ma, far) => {
    const H = far ? add(H0, [2.5, -0.5]) : H0;
    const A = add(P.slice(0, 2), rot(META, ma));
    const r = ik2(H, A, LH1, LH2, hintH), Ac = r.c, Pc = sub(Ac, rot(META, ma));
    const Kn = r.j, d = sub(Kn, H), thx = len(d) / 2 + K.th[0];
    const thigh = { c: L2(H, Kn, 0.42), rx: thx, ry: K.th[1] * (far ? 0.85 : 1), rot: Math.atan2(d[1], d[0]) };
    return { kind: "hind", far, pts: [H, Kn, Ac, Pc], P: Pc, target: P.slice(0, 2), pa: ma, thigh };
  };
  if (ext.farHind !== false) legs.push(hind(K.hf, K.hf[2], true));
  if (ext.farFront !== false) legs.push(front(K.ff, K.ff[2], true));
  legs.push(hind(K.hn, K.hn[2], false));
  legs.push(front(K.fn, K.fn[2], false));
  // tail
  const [tbx, tby, ta0, tL, tb, tbe, tc] = K.tl, wave = ext.tailWave ?? [0, 0];
  const tbase = add(Rp, [tbx, tby]);
  const turn = (t) => tb * s01(t / tbe) + tc * s01((t - 0.55) / 0.45) + wave[0] * t * Math.sin(wave[1] - 3.2 * t);
  const tail = { pts: ext.tailPts ?? chain(tbase, ta0, tL, turn, 16), r0: 3.3, r1: 2.2, layer: ext.tailLayer ?? "back" };
  const head = { c: [K.hd[0], K.hd[1]], a: K.hd[2] };
  const neckTo = add(head.c, rot([-3, 2.5], head.a));
  return {
    spine, radF, extra: [chestE, ...(ext.extra ?? [])], bibs: ext.bib ?? [], neck: [add(Cp, mul(axis, 1.5)), neckTo, 6.6],
    legs, tail, head, puff: K.puff ?? 0, shadow: ext.shadow ?? true,
    face: { open: K.eye[0], big: K.eye[1], look: [K.eye[2], K.eye[3]], mouth: K.mouth ?? 0, tongue: K.tongue ?? 0,
      ear: { tilt: K.ear[0], h: K.ear[1], open: K.ear[2], flick: ext.earFlick ?? 0, swivel: ext.earSwivel ?? 0 } },
  };
}

// ---------------------------------------------------------------- face params shared by all poses
function faceMods(K, st, d = {}) {
  const blink = clamp01(st.blink ?? 0), open = clamp01(st.eye ?? d.eye ?? K.eye[0]) * (1 - blink);
  const big = clamp01(st.eyeBig ?? d.big ?? K.eye[1]);
  K.eye = [open, big, K.eye[2] + (st.lookX ?? 0), K.eye[3] + (st.lookY ?? 0)];
  if (st.mouth != null) K.mouth = clamp01(st.mouth);
  return K;
}
const copy = (K) => JSON.parse(JSON.stringify(K));

// ---------------------------------------------------------------- poses
function stand(st) {
  const K = copy(STAND);
  K.hd[2] += -0.2 * (st.look ?? 0);
  const perk = clamp01(st.ear ?? 0); K.ear = [lerp(0.12, -0.1, perk), lerp(1, 1.08, perk), lerp(0.7, 0.9, perk)];
  return build(faceMods(K, st), { bib: [[19, -21, 5.5, 8.5, 0]], tailWave: [0.12, TAU * (st.tail ?? 0)] });
}

function sit(st) {
  const K = copy(SIT), look = Math.max(-1, Math.min(1, st.look ?? 0)), perk = clamp01(st.ear ?? 0);
  K.hd[2] = -0.3 * look; K.hd[1] -= 0.8 * look; K.hd[0] += 0.4 * look;
  K.ear = [lerp(0.1, -0.12, perk), lerp(1, 1.1, perk), lerp(0.75, 0.95, perk)];
  K.eye[3] = -0.5 * look;
  const tw = Math.sin(TAU * (st.tail ?? 0)) * clamp01(st.tailAmt ?? 1);
  return build(faceMods(K, st), { tailLayer: "front", tailPts: sitTail(tw), bib: [[9, -32, 6.2, 9.5, -0.2]] });
}

function walk(st) {
  const p = st.p ?? 0, K = copy(STAND), D = 7, beta = 0.62, lift = 4.2;
  const foot = (ph, x0, front) => {
    ph = frac(ph);
    if (ph < beta) return [x0 + D - 2 * D * (ph / beta), PAW_Y, 0];
    const s = (ph - beta) / (1 - beta), e = s01(s);
    return [x0 - D + 2 * D * e, PAW_Y - lift * Math.sin(PI * s), front ? 1.25 * Math.sin(PI * s) : 0.5 * Math.sin(PI * s)];
  };
  const bob = 0.55 * Math.cos(2 * TAU * p);
  K.sp = K.sp.map((v, i) => (i % 2 ? v + bob : v)); K.sp[1] += 0.5 * Math.sin(TAU * p); K.sp[5] += 0.5 * Math.sin(TAU * (p + 0.25));
  K.hd[1] += 0.4 * Math.cos(2 * TAU * (p - 0.08)); K.hd[2] += 0.02 * Math.sin(TAU * 2 * p);
  K.hn = foot(p, -23.5); K.fn = foot(p + 0.25 - 0.0, 15.5, true); K.hf = foot(p + 0.5, -19.5); K.ff = foot(p + 0.75, 11.5, true);
  K.hn[2] = K.hn[2] * 1; K.hf[2] *= 1;
  K.tl[2] -= 0.1; K.tl[6] = 1.6; K.sh = [1, 0.4];
  return build(faceMods(K, st), { bib: [[19, -21, 5.5, 8.5, 0]], tailWave: [0.22, TAU * p] });
}

// gallop paw keys [phase, x, y, angle] — normal and zoomies (stretch = 1)
const RUN = {
  fN: [[0, 2, -10, 1.3], [0.22, 20, -15, 0.2], [0.45, 30, -9, -0.25], [0.6, 20, PAW_Y, 0], [0.7, 11.5, PAW_Y, 0], [0.8, 3, PAW_Y, 0.15]],
  hN: [[0, -6, -8, 0.1], [0.12, -8, PAW_Y, 0], [0.22, -16.5, PAW_Y, 0], [0.32, -25, PAW_Y, 0.5], [0.5, -40, -9, 1.1], [0.75, -24, -14, -0.2]],
  fZ: [[0, 0, -9, 1.4], [0.22, 26, -16, 0.1], [0.45, 44, -10, -0.4], [0.6, 26, PAW_Y, 0], [0.7, 14, PAW_Y, 0], [0.8, 2, PAW_Y, 0.2]],
  hZ: [[0, -4, -8, 0.1], [0.12, -6, PAW_Y, 0], [0.22, -18, PAW_Y, 0], [0.32, -30, PAW_Y, 0.6], [0.5, -56, -10, 1.3], [0.75, -28, -15, -0.2]],
};
function run(st) {
  const p = st.p ?? 0, z = clamp01(st.stretch ?? 0), K = copy(STAND);
  const f = Math.cos(TAU * p), bob = -1.5 * Math.cos(2 * TAU * p), tilt = -0.1 * Math.sin(TAU * p) * (1 - 0.3 * z);
  const C = [-3, lerp(-25, -23.5, z) + bob], Lh = lerp(19 - 3 * f, 20.5 - 5.5 * f, z), arch = lerp(3 + 4 * f, 2 + 5 * f, z);
  const Rp = add(C, rot([-Lh, 0], tilt)), Cp = add(C, rot([Lh, 0], tilt)), Mp = add(C, rot([0, -arch], tilt));
  K.sp = [...Rp, ...Mp, ...Cp];
  const thin = lerp(0, 0.9, s01(-f * 0.5 + 0.5));
  K.rad = [9.4 - thin, 9.6 - thin, 9.4 - thin * 0.6];
  K.sh = rot([-1, 0], tilt); K.hip = rot([2, 0.5], tilt);
  const paw = (keysN, keysZ, ph) => { const a = cyc(keysN, ph), b = cyc(keysZ, ph); return a.map((v, i) => lerp(v, b[i], z)); };
  K.fn = paw(RUN.fN, RUN.fZ, p); K.ff = paw(RUN.fN, RUN.fZ, p - 0.07);
  K.hn = paw(RUN.hN, RUN.hZ, p); K.hf = paw(RUN.hN, RUN.hZ, p - 0.07);
  const hb = 0.6 * Math.cos(2 * TAU * (p - 0.1));
  K.hd = [Cp[0] + lerp(12.5, 13.5, z), Cp[1] - lerp(12.5, 9.5, z) + hb, lerp(0.05, 0.12, z) + tilt * 0.3];
  K.ear = [lerp(0.35, 0.95, z), lerp(1, 0.84, z), lerp(0.6, 0.15, z)];
  K.eye = [1, lerp(0.2, 0.85, z), 0.6, 0];
  const tb = add(sub(Rp, Rp), rot([-3, -4], tilt));
  K.tl = [tb[0], tb[1], PI + lerp(0.38, 0.12, z) + tilt, lerp(33, 34, z), lerp(-0.1, 0.02, z), 1, lerp(-0.5, 0.05, z)];
  K.puff = z;
  return build(faceMods(K, st), { bib: [[Cp[0] + 6, Cp[1] + 3, 5, 7.5, tilt]], tailWave: [lerp(0.45, 0.08, z), TAU * p] });
}

function crouch(st) {
  const T = clamp01(st.tension ?? 0), w = Math.sin(TAU * (st.wiggle ?? 0)), fl = Math.sin(TAU * (st.tailFlick ?? 0)), K = copy(STAND);
  const wa = 1.1 * (0.6 + 0.4 * T);
  K.sp = [-23 + T, -17.5 - 1.5 * T + wa * w, -6, -13.5 + 1.2 * T, 11, -11.8 + 1.6 * T];
  K.rad = [9.0, 8.7 - 0.2 * T, 8.4 - 0.2 * T];
  K.chest = [3, 1.5, 7.4, 8.4]; K.sh = [-1, -1]; K.hip = [2, 1];
  K.hd = [27.5, -14 + 1.6 * T, -0.03];
  K.fn = [22, PAW_Y, 0]; K.ff = [18, PAW_Y, 0];
  K.hn = [-11 - 0.6 * T, PAW_Y - 1.2 * Math.max(0, w), FLAT]; K.hf = [-8 - 0.6 * T, PAW_Y - 1.2 * Math.max(0, -w), FLAT];
  K.th = [5, 9];
  K.tl = [-8, -1, PI - 0.22, 38, 0.27, 0.8, -0.9 + 0.75 * fl];
  K.ear = [lerp(-0.25, -0.4, T), 1.02, 0.95];
  K.eye = [1, lerp(0.55, 0.9, T), 0.7, 0];
  return build(faceMods(K, st), { bib: [[16, -9, 5, 5.5, 0]], extra: [[8, -18.5 + 1.4 * T, 5.2, 4.2, -0.1]], tailWave: [0.15, TAU * (st.tailFlick ?? 0)] });
}

const POUNCE = [
  { sp: [-14, -17, -1, -25.5, 12, -34], rad: [9.2, 9.6, 9.3], hd: [23, -46, -0.35], fn: [27, -37, -0.4], ff: [24, -33, -0.2], hn: [-22, PAW_Y, 0.9], hf: [-18, PAW_Y, 0.8], tl: [-6, 2, PI - 0.55, 38, 0.3, 1, -0.3], ear: [-0.25, 1, 0.9], eye: [1, 0.55, 0.7, -0.3] },
  { sp: [-23, -26, -3.5, -29, 16, -28], rad: [8.8, 9.1, 9], hd: [28.5, -36, -0.04], fn: [48, -21, -0.55], ff: [45, -18, -0.35], hn: [-44, -18, 1.3], hf: [-41, -14, 1.2], tl: [-6, -1, PI + 0.08, 40, 0.06, 1, 0], ear: [-0.2, 1, 0.9], eye: [1, 0.6, 0.7, 0] },
  { sp: [-17, -33, -3, -30.5, 11, -19], rad: [9.4, 9.6, 9.4], hd: [25, -22, 0.42], fn: [21, PAW_Y, 0], ff: [17.5, PAW_Y, 0], hn: [-8, -19, -0.3], hf: [-4, -16, -0.3], tl: [-5, -4, -PI / 2 - 0.85, 38, 0.6, 1, 0.8], ear: [-0.22, 1, 0.9], eye: [1, 0.65, 0.6, 0.5] },
];
function pounce(st) {
  const k = clamp01(st.k ?? 0), base = { ...copy(STAND), chest: [3, 2, 7.6, 9.6], sh: [1, -1], hip: [1, 1], th: [4.5, 8] };
  const K = { ...base, ...crKeys(POUNCE, [0, 0.5, 1], k) };
  K.puff = 0.25 * Math.sin(PI * k);
  return build(faceMods(K, st), { bib: [[K.sp[4] + 6, K.sp[5] + 3, 5, 7.5, 0]], shadow: false });
}

const SKID = {
  sp: [-19, -11, -5, -18.5, 9, -23.5], rad: [9.8, 10, 9.5], chest: [3, 2.5, 7.6, 9.8], sh: [1, 3], hip: [2, 1],
  hd: [18.5, -38, -0.3], fn: [24.8, PAW_Y, -0.45], ff: [21.5, PAW_Y, -0.4], hn: [-2, PAW_Y, FLAT], hf: [1, PAW_Y, FLAT],
  th: [5.5, 9.4], tl: [-6, -4, -PI / 2 - 0.35, 36, 0.9, 1, 0.7], ear: [0.85, 0.9, 0.3], eye: [1, 0.8, -0.2, 0], mouth: 0.35, tongue: 0, puff: 0.35,
};
function skid(st) {
  const k = clamp01(st.k ?? 0), b = k >= 1 ? 1 : s01(k) * (1 + 0.16 * Math.sin(PI * k));
  const S = copy(STAND), perk = 0; S.ear = [lerp(0.12, -0.1, perk), 1, 0.7];
  const K = mixKey(SKID, S, b);
  K.puff = SKID.puff * (1 - s01(k * 1.4));
  return build(faceMods(K, st, {}), { bib: [[lerp(16, 19, b), lerp(-17, -21, b), 5.5, 8.5, 0]], tailWave: [0.12 * clamp01(b), TAU * (st.tail ?? 0)] });
}

function eat(st) {
  const p = st.p ?? 0, c = 0.5 - 0.5 * Math.cos(TAU * p), K = copy(STAND);
  K.sp = [-28, -23.5, -8, -23.5, 11, -19.5]; K.rad = [9.6, 10, 9.4]; K.chest = [3, 2, 7.5, 9]; K.sh = [1, -1];
  K.hd = [36.5, -14 - 0.9 * c, 0.62 - 0.07 * c];
  K.fn = [21, PAW_Y, 0]; K.ff = [17, PAW_Y, 0]; K.hn = [-24, PAW_Y, 0]; K.hf = [-20, PAW_Y, 0];
  K.tl = [-7, -3, PI - 0.15, 36, 0.25, 1, -1.1];
  K.ear = [0.3 + 0.15 * Math.sin(TAU * p), 1, 0.6];
  K.eye = [1, 0, 0.6, 0.7];
  K.mouth = 0.55 * Math.max(0, Math.sin(TAU * p));
  return build(faceMods(K, st), { bib: [[16, -16, 5.5, 7, 0.3]], tailWave: [0.15, TAU * p] });
}

// groom: the near paw follows a path in HEAD-local coordinates (lick in front of the mouth, then a wash over the face)
const GROOM_PATH = [[0, 12.5, 9, -1.3], [0.2, 12.8, 8.2, -1.3], [0.4, 12.5, 9, -1.3], [0.52, 8, -3, -1.6], [0.64, -2.5, -9.5, -2.0], [0.78, 2.5, -2.5, -1.6], [0.9, 10, 4.5, -1.3]];
function groom(st) {
  const p = frac(st.p ?? 0), K = copy(SIT);
  const wash = smr(p, 0.42, 0.52) * (1 - smr(p, 0.88, 0.98));
  K.hd = [10.5 + 0.8 * wash, -47.5 + 0.8 * wash, 0.28 + 0.22 * wash + 0.04 * Math.sin(TAU * 2 * p)];
  const [hx, hy, pa] = cyc(GROOM_PATH, p), hc = [K.hd[0], K.hd[1]], P = add(hc, rot([hx, hy], K.hd[2]));
  K.fn = [P[0], P[1], pa + K.hd[2]];
  const lick = (1 - wash) * Math.max(0, Math.sin(TAU * p / 0.21));
  K.tongue = lick; K.mouth = 0.25 * lick;
  K.eye = [0, 0, 0.5, 0.3];
  K.ear = [0.15 + 0.35 * wash, 1, 0.75];
  return build(faceMods(K, st, { eye: 0 }), { tailLayer: "front", tailPts: sitTail(0.4 * Math.sin(TAU * p)), frontOver: true, bib: [[9, -32, 6.2, 9.5, -0.2]] });
}

function swat(st) {
  const p = frac(st.p ?? 0), fc = (st.facing ?? 1) < 0 ? -1 : 1, r0 = st.reach ?? [22 * fc, -64], tgt = [r0[0] * fc, r0[1]], K = copy(SIT); // reach is world-relative
  const rump0 = [-8, -12];
  // how far must the body rise for the paw to reach the target?
  const lean = (lift) => {
    const rp = [rump0[0], rump0[1] - lift], th = Math.max(-PI / 2 - 0.3, Math.min(-PI / 2 + 0.38, Math.atan2(tgt[1] - rp[1], tgt[0] - rp[0])));
    const ax = dir(th), pf = [-ax[1], ax[0]];        // pf: perpendicular towards the belly side (forward)
    const C = add(rp, mul(ax, 27)), S = add(add(C, mul(ax, -5)), mul(pf, 3.5));
    return { rp, th, ax, pf, C, S };
  };
  let g = lean(0); const need = len(sub(tgt, g.S)) - 21.5; const lift = Math.max(0, Math.min(15, need * 0.9)); g = lean(lift);
  const { rp, th, ax, pf, C, S } = g;
  const Mp = add(add(rp, mul(ax, 14)), mul(pf, 1.8));
  K.sp = [...rp, ...Mp, ...C]; K.rad = [11, 9.8, 9]; K.chest = [0, 0, 7, 9.5]; K.sh = sub(S, C); K.hip = [-1, -2 + lift * 0.1];
  K.hn = [3, PAW_Y, lerp(FLAT, -0.2, clamp01(lift / 12))]; K.hf = [0, PAW_Y, lerp(FLAT, -0.2, clamp01(lift / 12))];
  K.th = [5.5, lerp(11, 9, clamp01(lift / 15))];
  const hd = add(add(C, mul(ax, 12)), mul(pf, -6.5)), look = Math.atan2(tgt[1] - hd[1], tgt[0] - hd[0]);
  K.hd = [hd[0], hd[1], Math.max(-1.1, Math.min(0.5, look)) * 0.75];
  const swipe = (ph) => { ph = frac(ph); return ph < 0.33 ? s01(ph / 0.33) : 1 - s01((ph - 0.33) / 0.67); };
  const rest = add(add(S, mul(ax, 8)), mul(pf, -8));
  const pawAt = (s, t) => { const q = L2(rest, t, s), d = nrm(sub(t, rest)); return add(q, mul([d[1], -d[0]], 5 * Math.sin(PI * s))); };
  const sn = swipe(p), sf = swipe(p + 0.5), Pn = pawAt(sn, tgt), Pf = pawAt(sf, add(tgt, [-5, 6]));
  K.fn = [Pn[0], Pn[1], -0.4 - 0.5 * sn]; K.ff = [Pf[0], Pf[1], -0.4 - 0.5 * sf];
  const fl = Math.sin(TAU * p);
  const swatTail = curve([add(rp, [-2, 6]), [-19, Math.min(-3.2, rp[1] + 11)], [-30, -2.6], [-40, -2.8], [-46 - 0.6 * fl, -5.5 - 1.6 * fl], [-47.5 - 1.2 * fl, -9.5 - 2.4 * fl]], 3);
  K.ear = [-0.2, 1.04, 0.92]; K.eye = [1, 0.5, 0.5, -0.6];
  K.mouth = 0.2 * sn;
  return build(faceMods(K, st), { tailLayer: "back", tailPts: swatTail, frontOver: true, bib: [[C[0] + 4, C[1] + 4, 5.5, 8, th + PI / 2]] });
}

function climb(st) {
  // clinging to the fabric BEHIND the cat (curtain plane): body vertical, belly towards `facing`, near arm reaching up
  // past the chin, hind feet flat on the cloth. Planted paws slide down in local space at CLIMB_STRIDE per cycle, so a
  // root rising by CLIMB_STRIDE per cycle keeps the claws fixed on the fabric.
  const p = frac(st.p ?? 0), K = copy(STAND), beta = 0.6, D = CLIMB_STRIDE * beta;
  const paw = (ph, x, y0, front, out = 2.6) => {
    ph = frac(ph);
    if (ph < beta) return [x, y0 - D / 2 + D * (ph / beta), front ? -1.5 : 3.67];
    const s = (ph - beta) / (1 - beta);
    return [x + out * Math.sin(PI * s), y0 + D / 2 - D * s01(s), front ? -1.5 + 0.8 * Math.sin(PI * s) : 3.67 - 0.5 * Math.sin(PI * s)];
  };
  const oy = -0.9 * Math.cos(2 * TAU * p);
  K.sp = [-2, -20 + oy, 0, -36 + oy, 3, -50 + oy]; K.rad = [9, 9.5, 9]; K.chest = [3.5, 0.5, 7, 8.4]; K.sh = [4, -2]; K.hip = [2, 0];
  K.fn = paw(p, 12.5, -68.2, true, 2); K.ff = paw(p + 0.5, 8.5, -69.8, true, 1.5);
  K.hn = paw(p + 0.5, 11, -13.6, false, 1.5); K.hf = paw(p, 9.5, -15.5, false, 1);
  K.hd = [-3, -62 + oy * 0.6, -1.2];
  K.tl = [-4, 6, PI / 2 + 0.25, 34, -0.2, 1, -0.45];
  K.ear = [-0.05, 1.05, 0.9]; K.eye = [1, 0.5, 0.6, -0.6];
  K.th = [4.5, 8];
  return build(faceMods(K, st), { tailWave: [0.3, TAU * p], shadow: false, bib: [[9.5, -50 + oy, 4.6, 8, -1.3]] });
}

export const POSES = { stand, sit, walk, run, crouch, pounce, skid, eat, groom, swat, climb };
export function poseRig(st) { const f = POSES[st.pose ?? "stand"] ?? stand; return f(st); }
