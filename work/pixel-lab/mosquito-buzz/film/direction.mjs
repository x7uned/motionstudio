// «Why mosquitoes buzz right in your ear» — direction: camera, the hero asleep in bed (person.mjs bed pose), the female
// mosquito's flight on the words, the male, and what the hero's ear hears (the whine's loudness from her distance to his
// ear). One world: the bedroom of the apartment kit at night, the nightstand lamp low. Everything is a pure function of t;
// at the seam (t = 0 ≡ END) the camera holds the ear close-up and the female circles the ear on a path of absolute t.
import { sm, ease, lerp, win, clamp01 } from "./layout.mjs";
import { EV, END, EAR, MOUTH, HEADC } from "./timeline.mjs";

const TAU = Math.PI * 2;
const per = (t, n, ph = 0) => Math.sin((TAU * n * t) / END + ph);
const keys = (t, ks) => { if (t <= ks[0][0]) return ks[0][1]; for (let i = 0; i < ks.length - 1; i++) { const [a, va] = ks[i], [b, vb] = ks[i + 1]; if (t < b) return lerp(va, vb, ease((t - a) / (b - a))); } return ks[ks.length - 1][1]; };
const L2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// ---------------------------------------------------------------- camera
export const CAMS = {
  EAR: { cx: -636, cy: -108, z: 6.2 },
  BED: { cx: -596, cy: -172, z: 2.6 },
  FACE: { cx: -636, cy: -128, z: 3.8 },
  MACRO: { cx: -627, cy: -156, z: 11 },
  MED: { cx: -592, cy: -150, z: 2.6 },
  SONG: { cx: -591, cy: -224, z: 7 },
};
const C = CAMS, CAM = [
  { t: 0, ...C.EAR }, { t: EV.you0End - 0.3, ...C.EAR }, { t: EV.out1, ...C.BED },
  { t: EV.blanketEnd - 0.4, ...C.BED }, { t: EV.close + 0.1, ...C.FACE }, { t: EV.warmthEnd - 0.3, ...C.FACE },
  { t: EV.listen + 0.5, ...C.MACRO }, { t: EV.hear1End - 0.2, ...C.MACRO }, { t: EV.quiet, ...C.MED },
  { t: EV.goesEnd - 0.2, ...C.MED }, { t: EV.males - 0.1, ...C.SONG }, { t: EV.togetherEnd, ...C.SONG },
  { t: EV.you1End - 0.2, ...C.FACE }, { t: EV.landedEnd, ...C.FACE }, { t: EV.dark, ...C.EAR }, { t: END + 10, ...C.EAR },
];
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  const c = { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) };
  const q = 1.2 / c.z; c.cx += q * per(t, 3); c.cy += q * 0.7 * per(t, 2, 1.3);
  return c;
}
export const CAM_MOVES = CAM.slice(0, -1).map((a, i) => [a, CAM[i + 1]]).filter(([a, b]) => a.z !== b.z || a.cx !== b.cx).map(([a, b]) => [a.t, b.t]);

// ---------------------------------------------------------------- the room: night, the nightstand lamp low
export function world(t) { return { t, tod: 1.0, clock: 1.0, lampLiving: 0, lampBed: 0.9, bedBlanket: 1, curtainSwing: 0 }; }

// ---------------------------------------------------------------- the hero: breathing, asleep; the eye opens when she lands
export const BREATH_N = 12;                                 // breaths over the film (period 3.84 s): whole cycles over END
export const breath = (t) => (BREATH_N * t) / END;
/** exhale strength 0..1 (the second half of each breath cycle) */
export const exhale = (t) => { const p = breath(t) % 1; return p > 0.5 ? Math.sin(Math.PI * (p - 0.5) * 2) : 0; };
export const awake = (t) => win(t, EV.landed - 0.1, EV.so2 + 0.5, 0.35, 0.6);   // 0 asleep … 1 eyes open wide

// ---------------------------------------------------------------- the female mosquito
// hover jitter: small fast zigzags that every flying mosquito does (periodic over the film)
const jit = (t, a = 1) => [a * (2.2 * per(t, 61) + 1.1 * per(t, 97, 1.1)), a * (1.6 * per(t, 73, 0.4) + 0.9 * per(t, 131, 2))];
// the hook / ending orbit around the ear (absolute t, 31 loops over the film)
const orbitEar = (t) => { const a = (TAU * 31 * t) / END; return [EAR[0] + 21 + 7 * Math.cos(a), EAR[1] - 9 + 4 * Math.sin(a)]; };
// the plume of breath from the mouth (world points along s = 0 … 1, up and a little to the right)
export const plume = (s) => [MOUTH[0] + 70 * s + 10 * Math.sin(s * 5), MOUTH[1] - 165 * s];
const FAR = [-498, -208], MEET = [-604, -234], LAND = [-641, -133], ORBIT = { c: HEADC, rx: 34, ry: 15 };
const PE_S = 0.18, PE = plume(PE_S);                       // where she ends up hovering above the face
const hoverFace = (a) => [PE[0] + 14 * Math.sin(a), PE[1] + 7 * Math.sin(2 * a)];
const OFF = [-400, -300];

/** female state at t: { p: [wx, wy], vis (0..1), fly (0 sitting … 1 flying), face (−1 left … 1 right, may be fractional = turning), behind (draw behind the head) } */
export function female(t) {
  let p, vis = 1, fly = 1, face = -1, behind = false;
  if (t < EV.you0End - 0.1 || t >= EV.dark - 0.3) { p = orbitEar(t); face = -1; }
  else if (t < EV.out1 + 0.2) { const k = ease((t - (EV.you0End - 0.1)) / (EV.out1 + 0.3 - EV.you0End)); p = L2(orbitEar(EV.you0End - 0.1), OFF, k); face = lerp(-1, 1, sm(k, 0, 0.25)); }
  else if (t < EV.dioxideEnd) { p = OFF; vis = 0; face = -1; }
  else if (t < EV.face1End) {                                                          // follows the plume down to the face
    const k = (t - EV.dioxideEnd) / (EV.face1End - EV.dioxideEnd);
    if (k < 0.3) p = L2([-390, -292], plume(1), ease(k / 0.3)); else { const q = (k - 0.3) / 0.7, s = lerp(1, PE_S, ease(q)); p = plume(s); p = [p[0] + 9 * Math.sin(q * 18) * (1 - q), p[1]]; }
    face = -1;
  }
  else if (t < EV.close - 0.2) { const a = (t - EV.face1End) * 1.9; p = hoverFace(a); face = Math.tanh(4 * Math.cos(a)) * sm(a, 0, 0.6) + -1 * (1 - sm(a, 0, 0.6)); }
  else if (t < EV.listen + 0.5) { const k = ease((t - (EV.close - 0.2)) / (EV.listen + 0.7 - EV.close)), a = (EV.close - 0.2 - EV.face1End) * 1.9; p = L2(hoverFace(a), [EAR[0] + 22, EAR[1] - 40], k); face = lerp(Math.tanh(4 * Math.cos(a)), -1, sm(k, 0, 0.3)); }
  else if (t < EV.hear1End - 0.2) { p = [EAR[0] + 22, EAR[1] - 40]; face = -1; }       // the macro: she hovers in front of the face
  else if (t < EV.quiet + 0.3) { const k = ease((t - (EV.hear1End - 0.2)) / (EV.quiet + 0.5 - EV.hear1End)); p = L2([EAR[0] + 22, EAR[1] - 40], FAR, k); face = lerp(-1, 1, sm(k, 0, 0.3)); }
  else if (t < EV.ear1 + 0.1) { const k = ease((t - (EV.quiet + 0.3)) / (EV.ear1 - EV.quiet - 0.2)); p = L2(FAR, [EAR[0] + 12, EAR[1] - 12], k); face = lerp(1, -1, sm(k, 0, 0.3)); }
  else if (t < EV.goesEnd - 0.1) {                                                     // circles the head (1.5 loops)
    const k = (t - (EV.ear1 + 0.1)) / (EV.goesEnd - EV.ear1 - 0.2), a = -0.6 + TAU * 1.5 * k, w = Math.min(1, k * 6);
    const ox = ORBIT.c[0] + ORBIT.rx * Math.cos(a), oy = ORBIT.c[1] - 8 + ORBIT.ry * Math.sin(a);
    p = L2([EAR[0] + 12, EAR[1] - 12], [ox, oy], w); face = lerp(-1, -Math.tanh(3 * Math.sin(a)), w); behind = Math.sin(a) < 0 && w > 0.5;
  }
  else if (t < EV.males) { const k = ease((t - (EV.goesEnd - 0.1)) / (EV.males - EV.goesEnd + 0.1)); const a = -0.6 + TAU * 1.5; p = L2([ORBIT.c[0] + ORBIT.rx * Math.cos(a), ORBIT.c[1] - 8 + ORBIT.ry * Math.sin(a)], MEET, k); face = Math.tanh(-2 + 4 * k); }
  else if (t < EV.togetherEnd) { p = MEET; face = Math.tanh(2); }                               // the meeting: she faces him
  else if (t < EV.stops) { const k = ease((t - EV.togetherEnd) / (EV.stops - EV.togetherEnd)); p = L2(MEET, LAND, k); face = Math.tanh(2 - 4 * k); }
  else if (t < EV.so2 + 0.05) { p = LAND; fly = 1 - sm(t, EV.stops, EV.stops + 0.15); face = -1; }   // landed: the wings stop
  else { const k = ease((t - (EV.so2 + 0.05)) / (EV.dark - 0.3 - EV.so2 - 0.05)); p = L2(LAND, orbitEar(EV.dark - 0.3), k); fly = sm(t, EV.so2 + 0.05, EV.so2 + 0.2); face = -1; }
  const j = jit(t, fly); p = [p[0] + j[0], p[1] + j[1]];
  return { p, vis, fly, face, behind };
}
// ---------------------------------------------------------------- the male (bushy antennae): in for the love song, out again
export function male(t) {
  const a = sm(t, EV.males - 1.2, EV.males - 0.6) * (1 - sm(t, EV.singing - 0.2, EV.singing + 0.6)); if (a <= 0) return null;
  const IN = [-470, -300], AT = [MEET[0] + 26, MEET[1] - 3], OUT = [-430, -330];
  let p;
  if (t < EV.males + 0.4) p = L2(IN, AT, ease((t - (EV.males - 1.2)) / 1.6));
  else if (t < EV.togetherEnd) p = AT;
  else p = L2(AT, OUT, ease((t - EV.togetherEnd) / (EV.singing + 0.6 - EV.togetherEnd)));
  const j = jit(t + 3.1); return { p: [p[0] + j[0], p[1] + j[1]], a, face: t < EV.togetherEnd ? -1 : Math.tanh(-1 + 4 * sm(t, EV.togetherEnd, EV.togetherEnd + 0.4)) };
}

// ---------------------------------------------------------------- what the ear hears (and the macro shots, where the listener is the camera)
/** whine loudness 0..1: inverse distance to the hero's ear (≈ 1 within 16 world units), full in the macro shots */
export function loudness(t) {
  const f = female(t), d = Math.hypot(f.p[0] - EAR[0], f.p[1] - EAR[1]), ear = Math.min(1, 16 / Math.max(16, d));
  const macro = win(t, EV.now, EV.hear1End - 0.3, 0.4, 0.5) + win(t, EV.males - 0.4, EV.togetherEnd, 0.4, 0.4) + (t < EV.you0End + 0.2 ? 1 - sm(t, EV.you0End - 0.3, EV.you0End + 0.2) : 0) + sm(t, EV.dark - 0.6, EV.dark);   // hook + ending: right by the ear
  return f.fly * f.vis * Math.max(ear, clamp01(macro) * 0.9);
}
/** the love song: her and his tone during the meeting (both change until her 3rd harmonic meets his 2nd) */
export const songK = (t) => sm(t, EV.both, EV.fit + 0.1);          // 0 apart … 1 fitted
