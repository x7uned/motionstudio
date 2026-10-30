// «Your cat sleeps all day…» — direction: camera, the room's state, and every actor's pose as a function of time.
// Tracks are lists of segments {a, xf, f(t) → {x, y, st} | null, vis(t)}; neighbouring segments crossfade with
// complementary dither gates over xf seconds centred on the boundary, so no pose ever changes in one frame.
import { LAYOUT, sm, ease, lerp, win, clamp01 } from "./layout.mjs";
import { sunPatch, toGround } from "./apartment.mjs";
import { Canvas } from "../../../../renderer/pixel/raster.mjs";
import { ground } from "./layout.mjs";
import { drawPerson } from "./person.mjs";
import { runStride } from "./cat.mjs";
import { EV, END, HOOK, hookTau } from "./timeline.mjs";

const per = (t, n, ph = 0) => Math.sin((2 * Math.PI * n * t) / END + ph);   // periodic over the loop (n whole cycles)
const ramp = (t, keys) => { // piecewise eased ramp through [t, v] keys
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) return lerp(va, vb, ease((t - a) / (b - a))); }
  return keys[keys.length - 1][1];
};
const lin = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) return lerp(va, vb, (t - a) / (b - a)); } return keys[keys.length - 1][1]; };

// ---------------------------------------------------------------- where the sleeping cat lies: in the sun patch
const SPOT = (tod) => { const p = sunPatch(tod); return (p.x0 + p.x1) / 2; };
export const SP = { s1: SPOT(9.6), s2: SPOT(12.6), s3: SPOT(16.3) };
const BOWL_EAT = LAYOUT.bowl.x - 46;                    // where the cat stands to eat (the bowl in front of its nose)

// ---------------------------------------------------------------- the hook: the owner walks, the cat launches, he falls
const PX = (tau) => HOOK.personX0 + HOOK.walkV * tau;
export const HIT_X = PX(HOOK.hit);
function catHookX(tau) {
  const { catX0: x0, launch, launchV: V, ramp: r } = HOOK;
  if (tau < launch) return x0; const dt = tau - launch;
  return dt < r ? x0 - (0.5 * V * dt * dt) / r : x0 - 0.5 * V * r - V * (dt - r);
}
const SKID = { a: 2.38, T: 0.4 };
const skidX = (t) => { const x0 = catHookX(SKID.a), dt = clamp01((t - SKID.a) / SKID.T) * SKID.T; return x0 - HOOK.launchV * dt + (HOOK.launchV / (2 * SKID.T)) * dt * dt; };
export const CAT_STOP = skidX(SKID.a + SKID.T);

// ---------------------------------------------------------------- camera
const HOOKCAM = { cx: -50, cy: -56, z: 1.6 };
export const CAMS = {
  HOOK: HOOKCAM,
  S1: { cx: -30, cy: -52, z: 1.6 },
  HUNT: { cx: CAT_STOP + 14, cy: -26, z: 3.0 },
  WIDE: { cx: 20, cy: -150, z: 0.85 },
  CLOSE: { cx: SP.s3 + 14, cy: -16, z: 4.0 },
  DREAM: { cx: SP.s3 + 8, cy: -38, z: 2.2 },
  WAKE: { cx: SP.s3 + 16, cy: -34, z: 2.5 },
  BOWL: { cx: LAYOUT.bowl.x - 22, cy: -40, z: 2.2 },
  BED: { cx: -500, cy: -90, z: 1.15 },
  ZOOM: { cx: 0, cy: -70, z: 1.35 },
  PLAY: { cx: -95, cy: -55, z: 1.75 },
};
const C = CAMS, CAM = [
  { t: 0, ...C.HOOK }, { t: 3.05, ...C.HOOK }, { t: 4.6, ...C.S1 },
  { t: EV.isnt, ...C.S1 }, { t: EV.built + 0.2, ...C.HUNT },
  { t: 8.3, ...C.HUNT }, { t: 9.85, ...C.WIDE },
  { t: 10.25, ...C.WIDE }, { t: EV.light + 0.25, ...C.CLOSE },
  { t: EV.jumpEnd - 0.2, ...C.CLOSE }, { t: EV.wild + 0.3, ...C.DREAM },
  { t: EV.energy1End - 0.45, ...C.DREAM }, { t: EV.dusk + 0.4, ...C.WIDE },
  { t: EV.body - 0.6, ...C.WIDE }, { t: EV.ready2 + 0.2, ...C.WAKE },
  { t: EV.hunt3End - 0.1, ...C.WAKE }, { t: EV.bowl + 0.1, ...C.BOWL },
  { t: EV.goEnd - 0.1, ...C.BOWL }, { t: EV.quiet + 0.1, ...C.BED },
  { t: EV.once - 0.05, ...C.BED }, { t: EV.vets + 0.3, ...C.ZOOM },
  { t: EV.zoomiesEnd + 0.15, ...C.ZOOM }, { t: EV.fix + 0.45, ...C.PLAY },
  { t: EV.feed - 0.3, ...C.PLAY }, { t: EV.sEat + 0.05, ...C.BOWL },
  { t: EV.skip + 0.2, ...C.BOWL }, { t: END - 0.35, ...C.HOOK }, { t: END + 10, ...C.HOOK },
];
let inCam = false;   // the tracking camera samples the cat, whose sofa jumps ask the (untracked) camera
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  const c = { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) };
  // the zoomies: the camera follows the cat (its x averaged over the last 0.45 s), blended in and out
  const fz = inCam ? 0 : win(t, EV.once + 0.2, EV.zoomiesEnd + 0.1, 0.6, 0.5);
  if (fz > 0) { inCam = true; let sx = 0; for (let k = 0; k < 6; k++) { const e = catTrack(t - k * 0.09)[0]; sx += e ? e.x : 0; } c.cx = lerp(c.cx, Math.max(-190, Math.min(110, sx / 6)), fz); inCam = false; }
  // a slow breathing drift (whole cycles over the loop), quieter in close-ups
  const q = 2.4 / c.z; c.cx += q * per(t, 3); c.cy += q * 0.7 * per(t, 2, 1.3);
  // the thud when he lands, and a rattle under the zoomies' title
  const land = HOOK.hit + HOOK.fall; if (t > land && t < land + 0.55) { const e = 1 - (t - land) / 0.55; c.cy += 4.5 * e * e * Math.sin((t - land) * 26) / c.z; }
  return c;
}

// ---------------------------------------------------------------- the room
export function world(t) {
  const tod = ramp(t, [[0, 27], [8.35, 27], [9.6, 32], [11.0, 40], [27.8, 40.8], [29.6, 43.6], [32.4, 44], [37.7, 44.6], [38.7, 50.5], [46.9, 50.5], [47.6, 46], [54.9, 46], [55.8, 51], [END, 51]]);
  const clock = ramp(t, [[0, 27], [8.35, 27], [9.6, 32], [11.0, 40], [27.8, 40.8], [29.6, 43.6], [32.4, 44], [37.7, 44.6], [38.7, 50.5], [46.9, 50.5], [47.6, 70], [54.9, 70], [55.8, 75], [END, 75]]);
  const lampLiving = win(t, EV.dinner - 0.5, EV.goEnd + 0.1, 0.6, 0.45) + win(t, EV.fix - 0.3, EV.sSleep + 0.05, 0.5, 0.6);
  const bedVis = sm(t, 38.0, 38.6) * (1 - sm(t, 41.8, 42.2));
  const kibble = Math.max(0, lin(t, [[0, 0], [33.0, 0], [34.0, 1], [34.3, 1], [36.1, 0.35], [52.0, 0.35], [52.75, 1], [53.25, 1], [53.7, 0.55], [54.9, 0.55], [55.6, 0]]));
  const pour = win(t, 32.9, 34.0, 0.25, 0.3) + win(t, 51.95, 52.75, 0.2, 0.3);
  const glow = (t < 9 ? 1 - 0.4 * sm(t, 3.2, 3.9) - 0.6 * sm(t, 8.0, 8.7) : 0) + win(t, 38.4, 46.9, 0.6, 0.4) * 0.9 + sm(t, 55.4, 56.1);
  return { t, tod: ((tod % 24) + 24) % 24, clock: ((clock % 24) + 24) % 24, lampLiving, lampBed: 0, bedBlanket: 1 - bedVis, curtainSwing: win(t, 41.8, 44.6, 0.25, 1.6), kibble, pour, pourT: t, glow: clamp01(glow) };
}

// ---------------------------------------------------------------- generic tracks
function runTrack(segs, t) {
  const out = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i], n = segs[i + 1], xi = s.xf || 0, xn = n ? n.xf || 0 : 0;
    if (t < s.a - xi / 2 || (n && t >= n.a + xn / 2)) continue;
    const kin = xi ? sm(t, s.a - xi / 2, s.a + xi / 2) : 1, kout = n ? (xn ? sm(t, n.a - xn / 2, n.a + xn / 2) : 0) : 0;
    const r = s.f(t); if (!r) continue;
    const a = s.vis ? s.vis(t) : 1; if (a <= 0) continue;
    out.push({ ...r, lo: kout, hi: kin, a, prop: !!s.prop });
  }
  return out;
}
const at = (x, y, st) => ({ x, y, st });
const PERSON_CYCLE = 60;   // person.mjs: one walk cycle (two steps) = 60 world units, planted feet stay put

// ---------------------------------------------------------------- the cat
const wig = (t, f = 2.6) => (t * f) % 1;
const sleepSt = (t, extra = {}) => ({ pose: "sleep", facing: 1, breath: t / 3.2, ear: 0, earTwitch: 0, eye: 0, tailAmt: 0, tail: t * 0.7, ...extra });
const twitch = (t, a) => (t > a && t < a + 0.3 ? Math.sin((Math.PI * (t - a)) / 0.3) : 0);
const ZP = { // the zoomies path
  run1: { a: EV.once, b: 41.7, x0: -290, x1: 212 },
  climb: { a: 41.7, b: 42.45, y1: -300 },
  drop: { a: 42.45, b: 42.95, x1: 140 },
  run2: { a: 42.95, b: 43.85, x1: -190 },
  jump1: { a: 43.85, b: 44.25, x1: -90, y1: LAYOUT.sofa.backTop },
  run3: { a: 44.25, b: 44.75, x1: -232 },
  jump2: { a: 44.75, b: 45.2, x1: -300 },
  run4: { a: 45.2, b: 46.3, x1: 150 },
  skid: { a: 46.3, b: 46.95, x1: 205 },
};
const arc = (k, x0, y0, x1, y1, h) => [lerp(x0, x1, k), lerp(y0, y1, k) - h * 4 * k * (1 - k)];
export const PLAY = { catX: -10, toyX: -62 };

const CAT = [
  // hook: crouched at the kitchen side, wiggling, eyes glowing … launch on 1.3 s … runs into his ankles … skids … sits
  { a: -99, f: (t) => { const u = hookTau(t); return at(HOOK.catX0, 0, { pose: "crouch", facing: -1, wiggle: wig(u), tension: 0.5 + 0.4 * sm(u, -1.5, HOOK.launch), tailFlick: u * 1.3 }); } },
  { a: HOOK.launch, xf: 0.16, f: (t) => at(catHookX(t), 0, { pose: "run", facing: -1, p: (HOOK.catX0 - catHookX(t)) / runStride(1), stretch: 1 }) },
  { a: SKID.a, xf: 0.14, f: (t) => at(skidX(t), 0, { pose: "skid", facing: -1, k: clamp01((t - SKID.a) / SKID.T) }) },
  { a: 3.15, xf: 0.32, f: (t) => at(CAT_STOP, 0, { pose: "sit", facing: 1, blink: twitch(t, 4.9) + twitch(t, 6.95), eyeBig: win(t, EV.isnt - 0.2, EV.getYouEnd, 0.4, 0.3), look: -0.15, ear: 0.6 }) },
  { a: EV.built - 0.1, xf: 0.3, f: (t) => at(CAT_STOP, 0, { pose: "crouch", facing: 1, wiggle: wig(t), tension: 0.7, tailFlick: t * 1.4 }) },
  // the day: asleep in the sun patch, following it across the floor (time-lapse hops)
  { a: 8.85, xf: 0.45, f: (t) => at(SP.s1, 0, sleepSt(t)) },
  { a: 9.75, xf: 0.3, f: (t) => at(SP.s2, 0, sleepSt(t)) },
  { a: 10.4, xf: 0.3, f: (t) => at(SP.s3, 0, sleepSt(t, {
      ear: Math.max(win(t, EV.ears - 0.05, EV.every - 0.2, 0.3, 0.35), win(t, EV.every, EV.ready1 + 0.4, 0.25, 0.45)),
      earTwitch: twitch(t, EV.ears + 0.05) + twitch(t, EV.every + 0.1) + twitch(t, EV.sound + 0.15),
      eye: win(t, EV.ready1 - 0.05, EV.jump + 0.05, 0.18, 0.5), tailAmt: win(t, EV.ready1 - 0.1, EV.jumpEnd, 0.2, 0.4) })) },
  // dusk: it wakes, ready to hunt
  { a: EV.body - 0.6, xf: 0.4, f: (t) => at(SP.s3, 0, { pose: "sit", facing: 1, ear: sm(t, EV.body - 0.4, EV.body), eyeBig: 0.7, blink: twitch(t, EV.body + 0.25), look: 0.1 }) },
  { a: EV.ready2 - 0.05, xf: 0.3, f: (t) => at(SP.s3, 0, { pose: "crouch", facing: 1, wiggle: wig(t, 3), tension: 0.85, tailFlick: t * 1.6 }) },
  // the kibble rattles: it runs to the bowl, eats, washes
  { a: EV.dinner - 0.25, xf: 0.2, f: (t) => { const k = ease(clamp01((t - (EV.dinner - 0.25)) / (EV.bowl + 0.1 - (EV.dinner - 0.25)))), x = lerp(SP.s3, BOWL_EAT, k); return at(x, 0, { pose: "run", facing: 1, p: (x - SP.s3) / runStride(0.35), stretch: 0.35 }); } },
  { a: EV.bowl + 0.1, xf: 0.25, f: (t) => at(BOWL_EAT, 0, { pose: "eat", facing: 1, p: t * 2.2 }) },
  { a: 36.1, xf: 0.35, f: (t) => at(BOWL_EAT, 0, { pose: "groom", facing: 1, p: t * 1.6 }) },
  // night: it sits in the bedroom door, staring at the sleeping owner … then bolts on "once"
  { a: 38.45, xf: 0.4, f: (t) => at(-296, 0, { pose: "sit", facing: -1, eyeBig: 0.9, blink: twitch(t, 39.3), ear: 1 }) },
  { a: 40.0, xf: 0.3, f: (t) => at(-296, 0, { pose: "crouch", facing: 1, wiggle: wig(t, 3.4), tension: 0.95, tailFlick: t * 2 }) },
  // the zoomies
  { a: ZP.run1.a, xf: 0.14, f: (t) => { const s = ZP.run1, k = clamp01((t - s.a) / (s.b - s.a)), x = lerp(s.x0, s.x1, k * (0.6 + 0.4 * k)); return at(x, 0, { pose: "run", facing: 1, p: (x - s.x0) / runStride(1), stretch: 1 }); } },
  { a: ZP.climb.a, xf: 0.14, f: (t) => { const s = ZP.climb, k = ease(clamp01((t - s.a) / (s.b - s.a))); return at(ZP.run1.x1, lerp(0, s.y1, k), { pose: "climb", facing: 1, p: (t - s.a) * 3.2 }); } },
  { a: ZP.drop.a, xf: 0.14, f: (t) => { const s = ZP.drop, k = clamp01((t - s.a) / (s.b - s.a)), [x, y] = arc(k * k, ZP.run1.x1, ZP.climb.y1, s.x1, 0, 30); return at(x, y, { pose: "pounce", facing: -1, k: 0.35 + 0.65 * k }); } },
  { a: ZP.run2.a, xf: 0.12, f: (t) => { const s = ZP.run2, x = lerp(ZP.drop.x1, s.x1, clamp01((t - s.a) / (s.b - s.a))); return at(x, 0, { pose: "run", facing: -1, p: (ZP.drop.x1 - x) / runStride(1), stretch: 1 }); } },
  { a: ZP.jump1.a, xf: 0.12, f: (t) => { const s = ZP.jump1, k = clamp01((t - s.a) / (s.b - s.a)), e = toGround(camera(t), s.x1, s.y1), [x, y] = arc(k, ZP.run2.x1, 0, e.wx, e.wy, 60); return at(x, y, { pose: "pounce", facing: -1, k }); } },
  { a: ZP.run3.a, xf: 0.12, prop: true, f: (t) => { const s = ZP.run3, x = lerp(ZP.jump1.x1, s.x1, clamp01((t - s.a) / (s.b - s.a))); return at(x, ZP.jump1.y1, { pose: "run", facing: -1, p: (ZP.jump1.x1 - x) / runStride(1), stretch: 1 }); } },
  { a: ZP.jump2.a, xf: 0.12, f: (t) => { const s = ZP.jump2, k = clamp01((t - s.a) / (s.b - s.a)), e = toGround(camera(t), ZP.run3.x1, ZP.jump1.y1), [x, y] = arc(k, e.wx, e.wy, s.x1, 0, 24); return at(x, y, { pose: "pounce", facing: -1, k }); } },
  { a: ZP.run4.a, xf: 0.16, f: (t) => { const s = ZP.run4, k = clamp01((t - s.a) / (s.b - s.a)), x = lerp(ZP.jump2.x1, s.x1, k); return at(x, 0, { pose: "run", facing: 1, p: (x - ZP.jump2.x1) / runStride(1), stretch: 1 }); } },
  { a: ZP.skid.a, xf: 0.14, f: (t) => { const s = ZP.skid, k = clamp01((t - s.a) / (s.b - s.a)); return at(lerp(ZP.run4.x1, s.x1, 1 - (1 - k) * (1 - k)), 0, { pose: "skid", facing: 1, k }); } },
  // the fix: a new evening, the wand toy … it swats, pounces, gets tired … runs to dinner, eats, washes, sleeps
  { a: 47.05, xf: 0.45, f: (t) => at(PLAY.catX, 0, { pose: "crouch", facing: -1, wiggle: wig(t, 2.2), tension: 0.6 + 0.3 * sm(t, EV.toy, EV.string), tailFlick: t * 1.5 }) },
  { a: EV.toy + 0.15, xf: 0.25, f: (t) => { const toy = toyAt(t); return at(PLAY.catX, 0, { pose: "swat", facing: -1, p: (t - EV.toy) * 2.4, reach: [toy[0] - PLAY.catX, toy[1]] }); } },
  { a: EV.string + 0.25, xf: 0.16, f: (t) => { const k = clamp01((t - (EV.string + 0.25)) / 0.45), [x, y] = arc(k, PLAY.catX, 0, PLAY.toyX + 18, 0, 26); return at(x, y, { pose: "pounce", facing: -1, k }); } },
  { a: EV.tired - 0.05, xf: 0.3, f: (t) => at(PLAY.toyX + 18, 0, { pose: "sit", facing: -1, blink: 0.35 + 0.65 * win(t, EV.tired + 0.2, EV.feed - 0.2, 0.25, 0.25), look: -0.25, ear: 0.2 }) },
  { a: EV.feed - 0.2, xf: 0.3, f: (t) => { const a = EV.feed - 0.2, b = EV.sEat - 0.05, k = ease(clamp01((t - a) / (b - a))), x = lerp(PLAY.toyX + 18, BOWL_EAT, k); return at(x, 0, { pose: "run", facing: 1, p: (x - PLAY.toyX) / runStride(0.25), stretch: 0.25 }); } },
  { a: EV.sEat - 0.05, xf: 0.22, f: (t) => at(BOWL_EAT, 0, { pose: "eat", facing: 1, p: t * 2.2 }) },
  { a: EV.sWash - 0.05, xf: 0.25, f: (t) => at(BOWL_EAT, 0, { pose: "groom", facing: 1, p: t * 1.6 }) },
  { a: EV.sSleep - 0.05, xf: 0.4, f: (t) => at(BOWL_EAT - 10, 0, sleepSt(t)) },
  // skip the game: the alternative night — back to the crouch at the kitchen side (= the first frame)
  { a: 55.85, xf: 0.6, f: (t) => { const u = hookTau(t); return at(HOOK.catX0, 0, { pose: "crouch", facing: -1, wiggle: wig(u), tension: 0.5 + 0.4 * sm(u, -1.5, HOOK.launch), tailFlick: u * 1.3 }); } },
];
export const catTrack = (t) => runTrack(CAT, t);

// ---------------------------------------------------------------- the owner
const walkSt = (tau) => ({ pose: "walk", facing: 1, face: "sleepy", p: (PX(tau) - HOOK.personX0) / PERSON_CYCLE, glass: 1, yawn: win(tau, -1.3, -0.55, 0.3, 0.3) });
const PERSON = [
  { a: -99, f: (t) => { const u = hookTau(t); return at(PX(u), 0, walkSt(u)); } },
  { a: HOOK.hit, xf: 0.1, f: (t) => at(HIT_X, 0, { pose: "trip", facing: 1, face: "surprised", k: TRIP_K(t) }) },
  { a: HOOK.hit + HOOK.fall + 0.05, xf: 0.12, f: (t) => at(HIT_X, 0, { pose: "floor", facing: 1, face: "surprised", k: sm(t, 3.55, 4.7), rub: t * 1.7 }) },
  { a: EV.annoying - 0.3, xf: 0.3, vis: (t) => 1 - sm(t, 8.3, 8.9), f: (t) => at(HIT_X, 0, { pose: "floor", facing: 1, face: "annoyed", k: sm(t, 3.55, 4.7), rub: t * 1.7 }) },
  { a: 9.0, f: () => null },
  { a: 38.0, prop: true, vis: (t) => sm(t, 38.0, 38.6) * (1 - sm(t, 41.8, 42.2)), f: (t) => at(0, 0, { pose: "bed", face: "asleep", breath: t / 3.6 }) },
  { a: 42.2, f: () => null },
  { a: 46.9, prop: true, vis: (t) => sm(t, 46.9, 47.5) * (1 - sm(t, 55.0, 55.5)), f: (t) => at(-168, 0, { pose: "sit", facing: 1, face: "happy", seatY: LAYOUT.sofa.seatTop, wand: sm(t, 47.0, 47.6) * (1 - sm(t, EV.sSleep - 0.3, EV.sSleep + 0.3)), p: t * 1.3 }) },
  { a: 55.5, vis: (t) => sm(t, 55.45, 55.95), f: (t) => { const u = hookTau(t); return at(PX(u), 0, walkSt(u)); } },
];
export const personTrack = (t) => runTrack(PERSON, t);

// the feather toy on its string (world point)
export function toyAt(t) {
  const sw = Math.sin(2 * Math.PI * 1.3 * t), base = [PLAY.toyX + 18 * sw, -14 - 10 * Math.abs(Math.sin(2 * Math.PI * 0.9 * t))];
  const up = win(t, EV.toy + 0.1, EV.string + 0.3, 0.25, 0.25), down = sm(t, EV.string + 0.3, EV.string + 0.6);
  return [lerp(base[0], PLAY.toyX - 4, down), lerp(lerp(base[1], -46 + 8 * sw, up), -2, down)];
}

// ---------------------------------------------------------------- the glass of water
const TRIP_K = (t) => Math.pow(clamp01((t - HOOK.hit) / HOOK.fall), 1.15);
const REL = HOOK.hit + Math.pow(0.25, 1 / 1.15) * HOOK.fall;
const GR = (() => { const an = drawPerson(new Canvas(540, 960), ground({ cx: 0, cy: 0, z: 1 }), HIT_X, 0, { pose: "trip", facing: 1, k: 0.25, glass: 1 }); return an.glassRelease; })();
const G0 = { x: GR.wx, y: GR.wy, rot: GR.rot, fill: GR.fill, vx: 105, vy: -190, g: 1100 };
const FLY = (() => { const a = 0.5 * G0.g, b = G0.vy, c = G0.y; return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); })();
export const GLASS_LAND = REL + FLY, GLASS_X = G0.x + G0.vx * FLY;
export function glassAt(t) {
  const u = hookTau(t); if (u < REL || t > 9.2) return null;
  const vis = 1 - sm(t, 8.3, 8.9), drops = [];
  if (u < GLASS_LAND) { const d = u - REL; return { x: G0.x + G0.vx * d, y: G0.y + G0.vy * d + 0.5 * G0.g * d * d, rot: G0.rot + d * 9, fill: G0.fill * (1 - 0.5 * d / FLY), a: vis, drops, puddle: 0, px: GLASS_X }; }
  const d = u - GLASS_LAND;
  for (let i = 0; i < 9; i++) { const vx = -120 + i * 30, vy = -140 - (i % 3) * 50, tt = Math.min(d, 0.6); const y = vy * tt + 0.5 * G0.g * tt * tt; if (y < 2) drops.push({ x: GLASS_X + vx * tt, y: Math.min(0, y), a: (1 - sm(d, 0.35, 0.6)) * vis }); }
  return { x: GLASS_X + 6, y: -6, rot: Math.PI / 2, fill: 0, a: vis, drops, puddle: Math.min(1, d / 0.3) * vis, px: GLASS_X };
}

// ---------------------------------------------------------------- energy bars
const BLINK = (t) => 0.5 + 0.5 * Math.sin((2 * Math.PI * 142 * t) / END);
export function energy(t) {
  const a = (1 - sm(t, 3.6, 4.1)) + win(t, 8.95, 46.95, 0.35, 0.35) + win(t, 47.6, 55.1, 0.35, 0.3) + sm(t, 55.7, 56.2);
  let level;
  if (t < 8) level = lin(t, [[0, 1.25], [HOOK.launch, 1.25], [3.0, 0.9]]);
  else if (t < 47.3) level = lin(t, [[8.9, 0.18], [11.1, 0.82], [27.5, 0.92], [27.95, 1.0], [35.5, 1.0], [37.6, 1.3], [40.8, 1.3], [46.8, 0.35]]);
  else if (t < 55.4) level = lin(t, [[47.3, 1.0], [EV.play, 1.0], [EV.tired + 0.1, 0.1], [EV.sSleep, 0.12], [55.4, 0.3]]);
  else level = 1.25;
  return { a: clamp01(a), level, blink: level > 1 ? BLINK(t) : 0 };
}

// ---------------------------------------------------------------- the dream (the wildcat's world; burrow at x = 0)
export const BUBBLE = (t) => ({ cx: 270, cy: 318, r: 178, k: ease(sm(t, EV.wild - 0.3, EV.wild + 0.45)) * (1 - ease(sm(t, EV.energy1End - 0.35, EV.mice + 0.3))) });
export function dreamCam(t) { const k = ease(sm(t, EV.sprint - 0.2, EV.power)); return { cx: lerp(-22, 70, k), cy: -40, z: lerp(2.4, 2.2, k) }; }
const D = { crouchX: -78, catch1: -14, chaseEnd: 70, catch2: 122 };
const WILD = [
  { a: -99, f: (t) => at(D.crouchX, 0, { pose: "crouch", facing: 1, palette: "wild", wiggle: wig(t, 2.2), tension: 0.8, tailFlick: t * 1.2 }) },
  { a: EV.mouse + 0.15, xf: 0.12, f: (t) => { const k = clamp01((t - (EV.mouse + 0.15)) / 0.45), [x, y] = arc(k, D.crouchX, 0, D.catch1, 0, 36); return at(x, y, { pose: "pounce", facing: 1, palette: "wild", k }); } },
  { a: EV.mouse + 0.6, xf: 0.2, f: () => at(D.catch1, 0, { pose: "stand", facing: 1, palette: "wild", blink: 0 }) },
  { a: EV.meal + 0.1, xf: 0.35, f: (t) => at(D.catch1, 0, { pose: "groom", facing: 1, palette: "wild", p: t * 1.5 }) },
  { a: EV.every2, xf: 0.35, f: (t) => at(D.crouchX, 0, { pose: "crouch", facing: 1, palette: "wild", wiggle: wig(t, 1.4), tension: 0.9, tailFlick: t }) },
  { a: EV.sprint - 0.15, xf: 0.12, f: (t) => { const a = EV.sprint - 0.15, b = EV.full - 0.2, k = clamp01((t - a) / (b - a)), x = lerp(D.crouchX, D.chaseEnd, k * (0.5 + 0.5 * k)); return at(x, 0, { pose: "run", facing: 1, palette: "wild", p: (x - D.crouchX) / runStride(1), stretch: 1 }); } },
  { a: EV.full - 0.2, xf: 0.12, f: (t) => { const k = clamp01((t - (EV.full - 0.2)) / 0.4), [x, y] = arc(k, D.chaseEnd, 0, D.catch2, 0, 30); return at(x, y, { pose: "pounce", facing: 1, palette: "wild", k }); } },
  { a: EV.full + 0.2, xf: 0.2, f: () => at(D.catch2, 0, { pose: "stand", facing: 1, palette: "wild" }) },
  { a: EV.between + 0.3, xf: 0.45, f: (t) => at(D.catch2, 0, { pose: "sleep", facing: 1, palette: "wild", breath: t / 3.0 }) },
];
export const wildTrack = (t) => runTrack(WILD, t);
const MOUSE = [
  { a: -99, f: (t) => at(0, 0, { pose: "peek", facing: 1, peek: sm(t, EV.mouse - 0.45, EV.mouse - 0.05), sniff: t * 3 }) },
  { a: EV.mouse + 0.2, xf: 0.12, f: (t) => { const x = lerp(4, 30, clamp01((t - (EV.mouse + 0.2)) / 0.35)); return at(x, 0, { pose: "run", facing: 1, p: t * 6 }); } },
  { a: EV.mouse + 0.55, xf: 0.12, vis: (t) => 1 - sm(t, EV.meal - 0.1, EV.meal + 0.3), f: () => at(30, 0, { pose: "caught", facing: 1 }) },
  { a: EV.meal + 0.35, f: () => null },
  { a: EV.wait, vis: (t) => sm(t, EV.wait - 0.1, EV.wait + 0.2), f: (t) => at(0, 0, { pose: "peek", facing: 1, peek: sm(t, EV.wait, EV.waitEnd + 0.1) * 0.8, sniff: t * 3 }) },
  { a: EV.short - 0.05, xf: 0.12, f: (t) => { const a = EV.short - 0.05, b = EV.full + 0.2, x = lerp(4, D.catch2 + 26, clamp01((t - a) / (b - a))); return at(x, 0, { pose: "run", facing: 1, p: t * 7 }); } },
  { a: EV.full + 0.2, xf: 0.12, vis: (t) => 1 - sm(t, EV.power + 0.1, EV.between + 0.2), f: () => at(D.catch2 + 26, 0, { pose: "caught", facing: 1 }) },
  { a: EV.between + 0.25, f: () => null },
];
export const mouseTrack = (t) => (t > EV.wild - 0.4 && t < EV.mice + 0.4 ? runTrack(MOUSE, t) : []);
export function dreamEnergy(t) {
  const a = win(t, EV.every2 - 0.2, EV.energy1End + 0.1, 0.3, 0.3);
  const level = lin(t, [[0, 1], [EV.sprint - 0.15, 1], [EV.full + 0.25, 0.15], [EV.sleeps3, 0.15], [EV.energy1End - 0.1, 1]]);
  return { a, level };
}
