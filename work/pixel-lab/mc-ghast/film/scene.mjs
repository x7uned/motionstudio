// «The ghast's cry» — the story state as pure functions of t: the camera (two regions joined by portal passes), the ghast
// (eyes, mouth, fireball, the morph into a sleeping cat), the studio cat (asleep → woken → grumbles → awake → head shake →
// purrs), the two extra ghasts of the pitch demo, the critters at the end. All on the word times of timeline.mjs.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END, DEMO, PASSES } from "./timeline.mjs";
import { GHAST, PORTAL_N_FACE, PORTAL_S_FACE, CAT, MIC } from "./world.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));

// ---------------------------------------------------------------- demo envelopes (from the analysed audio, smoothed ±40 ms)
const SPEC = JSON.parse(fs.readFileSync(HERE + "audio/spec.json", "utf8"));
export function demoEnv(key, t) {
  const d = SPEC.demos[key], tau = t - d.t0; if (tau < -0.05 || tau > d.len + 0.05) return 0;
  let s = 0, n = 0; for (let k = -4; k <= 4; k++) { const f = Math.floor(tau / SPEC.hop) + k; s += f >= 0 && f < d.frames ? d.wave[f] : 0; n++; } return s / n;
}

// ---------------------------------------------------------------- camera
const G = GHAST, G2 = { x: -8.5, y: 24.5, z: 6.5 }, G3 = { x: 6.5, y: 25.5, z: -8.5 };
export const EXTRA = [G2, G3];
const NP = {
  hook: { x: G.x, y: G.y - 1.2, z: G.z, b: 40, ay: 430 }, hook2: { x: G.x, y: G.y - 1.0, z: G.z, b: 44, ay: 430 },
  face: { x: G.x + 1.4, y: G.y + 0.2, z: G.z + 1.4, b: 66, ay: 440 },
  morph: { x: G.x, y: G.y - 0.6, z: G.z, b: 36, ay: 450 },
  hall: { x: 3.2, y: 17.6, z: 0, b: 21, ay: 470 },
  cave: { x: -1.5, y: 20, z: -1.5, b: 15, ay: 560 },
  real: { x: G.x, y: G.y - 0.6, z: G.z, b: 25, ay: 545 },
  three: { x: -0.5, y: 23.2, z: -0.5, b: 12, ay: 560 },
  end: { x: G.x, y: G.y - 0.3, z: G.z, b: 19, ay: 560 }, end2: { x: G.x, y: G.y - 0.3, z: G.z, b: 20.5, ay: 560 },
  portal: { x: PORTAL_N_FACE.x, y: PORTAL_N_FACE.y, z: PORTAL_N_FACE.z, b: 300, ay: 480 },
};
const SP = {
  desk: { x: 12.2, y: 12.7, z: 9.3, b: 60, ay: 470 }, desk2: { x: 12.3, y: 12.7, z: 9.3, b: 64, ay: 470 },
  cat: { x: CAT.x + 0.6, y: CAT.y + 0.5, z: CAT.z, b: 118, ay: 500 },
  lab: { x: CAT.x + 0.55, y: CAT.y + 0.45, z: CAT.z, b: 100, ay: 545 },
  purr: { x: CAT.x + 0.55, y: CAT.y + 0.45, z: CAT.z, b: 108, ay: 550 },
  portal: { x: PORTAL_S_FACE.x, y: PORTAL_S_FACE.y, z: PORTAL_S_FACE.z, b: 300, ay: 480 },
};
const [P1, P2, P3, P4] = PASSES;
const KEYS = [
  ["N", 0, NP.hook], ["N", EV.that - 0.1, NP.hook2], ["N", EV.nether, NP.face], ["N", EV.part - 0.05, NP.face], ["N", EV.grumpy + 0.2, NP.morph],
  ["N", EV.cat2End + 0.3, NP.morph], ["N", EV.halloween, NP.hall], ["N", P1.t0, NP.hall], ["N", P1.tm, NP.portal],
  ["S", P1.tm, SP.portal], ["S", P1.t1, SP.desk], ["S", EV.involvedEnd, SP.desk2], ["S", EV.human, SP.cat], ["S", EV.it1End, SP.cat], ["S", EV.copy, SP.lab],
  ["S", P2.t0, SP.lab], ["S", P2.tm, SP.portal],
  ["N", P2.tm, NP.portal], ["N", P2.t1, NP.cave], ["N", EV.and3, NP.cave], ["N", EV.real2 + 0.1, NP.real], ["N", EV.ghast3End + 0.85, NP.real], ["N", EV.cry2 - 0.2, NP.three],
  ["N", P3.t0, NP.three], ["N", P3.tm, NP.portal],
  ["S", P3.tm, SP.portal], ["S", P3.t1, SP.purr], ["S", P4.t0, SP.purr], ["S", P4.tm, SP.portal],
  ["N", P4.tm, NP.portal], ["N", P4.t1, NP.end], ["N", END, NP.end2],
];
export function region(t) { let r = "N"; for (const p of PASSES) if (t >= p.tm) r = p.to; return r; }
export function camera(t) {
  const reg = region(t), ks = KEYS.filter((k) => k[0] === reg);
  // the last key at or before t (of this region) and the next one
  let i = 0; for (let k = 0; k < ks.length; k++) if (ks[k][1] <= t) i = k;
  const a = ks[i], b = ks[Math.min(ks.length - 1, i + 1)];
  const pass = PASSES.find((p) => (t >= p.t0 && t < p.tm && p.from === reg) || (t >= p.tm && t < p.t1 && p.to === reg));
  let k = b[1] > a[1] ? clamp01((t - a[1]) / (b[1] - a[1])) : 0;
  // into a portal: accelerate (ease-in); out of a portal: decelerate (ease-out); otherwise ease in-out
  k = pass ? (t < pass.tm ? k * k * k : 1 - Math.pow(1 - k, 3)) : ease(k);
  const A = a[2], Bp = b[2];
  return { x: lerp(A.x, Bp.x, k), y: lerp(A.y, Bp.y, k), z: lerp(A.z, Bp.z, k), b: Math.exp(lerp(Math.log(A.b), Math.log(Bp.b), k)), ay: lerp(A.ay, Bp.ay, k), reg };
}
/** the portal swirl over the switch: 1 for a few frames on each side of tm */
export function swirl(t) { let s = 0; for (const p of PASSES) s = Math.max(s, smooth(t, p.tm - 0.42, p.tm - 0.07) * (1 - smooth(t, p.tm + 0.07, p.tm + 0.45))); return s; }

// ---------------------------------------------------------------- the ghast
const blink = (t, every, ph) => { const p = ((t + ph) % every + every) % every; return p < 0.22 ? Math.sin((Math.PI * p) / 0.22) : 0; };
export const FIRE = { grow: [0.25, 2.55], shoot: [EV.cat1End + 0.05, EV.cat1End + 0.65] };
export const MORPH = { to: [EV.grumpy - 0.25, EV.grumpy + 0.6], back: [EV.arrived - 0.25, EV.arrived + 0.5] };
export function morph(t) { return smooth(t, MORPH.to[0], MORPH.to[1]) * (1 - smooth(t, MORPH.back[0], MORPH.back[1])); }
const SOB = [EV.miss - 0.05, EV.oneEnd + 0.1];
export function ghastState(t) {
  const bob = 0.28 * Math.sin(t * 1.25);
  // eyes: already opening at frame 0; close (sleepy) under the morph; open on "the real ghast"; close for the sob at the end
  const eo = Math.min(1, 0.5 + 0.5 * smooth(t, 0, 0.55)) * (1 - smooth(t, MORPH.to[0], MORPH.to[0] + 0.35)) + smooth(t, EV.real2 - 0.05, EV.real2 + 0.3) * (1 - smooth(t, SOB[0], SOB[0] + 0.3));
  let mo = smooth(t, 0.2, 1.3) * 0.9 * (1 - smooth(t, FIRE.shoot[0] + 0.1, FIRE.shoot[0] + 0.5));
  const real = demoEnv("real", t), p10 = demoEnv("p10", t);
  mo = Math.max(mo, smooth(t, DEMO.real.t0 - 0.12, DEMO.real.t0) * (0.25 + 0.75 * Math.min(1, real * 1.6)) * (1 - smooth(t, DEMO.real.t0 + DEMO.real.len - 0.05, DEMO.real.t0 + DEMO.real.len + 0.15)));
  mo = Math.max(mo, smooth(t, DEMO.p10.t0 - 0.12, DEMO.p10.t0) * (0.25 + 0.75 * Math.min(1, p10 * 1.6)) * (1 - smooth(t, DEMO.p10.t0 + DEMO.p10.len - 0.05, DEMO.p10.t0 + DEMO.p10.len + 0.15)));
  // the sob: two small gulps of the mouth with the eyes shut
  mo = Math.max(mo, t > SOB[0] ? 0.3 * Math.pow(Math.sin(Math.PI * clamp01((t - SOB[0] - 0.2) / 0.9) * 2), 2) * (1 - smooth(t, SOB[1] - 0.1, SOB[1] + 0.2)) : 0);
  const sob = t > SOB[0] ? 0.06 * Math.sin(Math.PI * clamp01((t - SOB[0] - 0.2) / 0.9) * 4) : 0;
  return { ...G, y: G.y + sob, t, eo: eo * (1 - 0.9 * blink(t, 4.3, 1.1) * (t < MORPH.to[0] || t > EV.real2 + 0.5 ? 1 : 0)), mo, bob, face: Math.PI / 4 };
}
/** the two extra ghasts of the pitch demo: dissolve in, cry with their own pitch (p08: left, p12: right) */
export function extraGhasts(t) {
  const a = win(t, EV.game2 - 0.1, P3.t0 + 0.1, 0.5, 0.3);
  return EXTRA.map((g, i) => { const key = i === 0 ? "p08" : "p12", d = DEMO[key], env = demoEnv(key, t);
    const mo = smooth(t, d.t0 - 0.12, d.t0) * (0.25 + 0.75 * Math.min(1, env * 1.6)) * (1 - smooth(t, d.t0 + d.len - 0.05, d.t0 + d.len + 0.15));
    return { ...g, t: t + i * 2.1, bob: 0.3 * Math.sin(t * 1.1 + i * 2), eo: smooth(t, d.t0 - 0.6, d.t0 - 0.3), mo, alpha: a, face: Math.PI / 4 + (i ? -0.12 : 0.12) }; });
}

// ---------------------------------------------------------------- the studio cat
export const WAKE = { up: [EV.woken + 0.05, EV.woken + 0.55], eyes: [EV.woken + 0.3, EV.woken + 0.55], grumble: [EV.up + 0.1, EV.up + 0.7] };
export const SHAKE = [EV.wouldnt - 0.05, EV.them + 0.1];
export const PURR = [EV.only3 - 0.1, P4.tm + 0.2];
export function catState(t) {
  const up = smooth(t, WAKE.up[0], WAKE.up[1]);
  let eo = smooth(t, WAKE.eyes[0], WAKE.eyes[1]) * (1 - 0.95 * blink(t, 3.9, 0.7) * (t > WAKE.eyes[1] + 0.5 ? 1 : 0));
  const g = clamp01((t - WAKE.grumble[0]) / (WAKE.grumble[1] - WAKE.grumble[0])), mo = t > WAKE.grumble[0] && t < WAKE.grumble[1] ? 0.85 * Math.pow(Math.sin(Math.PI * g * 2), 2) : 0;
  const happy = smooth(t, PURR[0], PURR[0] + 0.3); eo *= 1 - happy;
  const sh = t > SHAKE[0] && t < SHAKE[1] ? 0.32 * Math.sin(Math.PI * 3 * clamp01((t - SHAKE[0]) / (SHAKE[1] - SHAKE[0]))) * Math.sin(Math.PI * clamp01((t - SHAKE[0]) / (SHAKE[1] - SHAKE[0]))) : 0;
  return { ...CAT, t, up, eo, mo, happy, purr: happy * (1 - smooth(t, PURR[1] - 0.2, PURR[1])), face: Math.PI / 2 + sh };
}
/** the giant sleeping cat that the ghast turns into (same model ×7, centred on the ghast) */
export function giantCat(t) {
  const g = ghastState(t);
  return { x: G.x - 1.2, y: G.y - 2.1 + g.bob * 0.5, z: G.z + 0.6, s: 6.6, t, up: 0, eo: 0.4 * win(t, EV.grumpy + 0.2, EV.sleepy, 0.25, 0.3), mo: 0, face: Math.PI / 2 };
}
export const THROAT = { grow: [EV.bigger - 0.35, EV.throat + 0.3], show: [EV.your - 0.1, EV.add - 0.1] };
export const CRITTERS = { in: EV.hides - 0.1, waves: [EV.more, EV.thisEnd + 0.4] };
export { G2, G3, MIC };
