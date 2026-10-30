// «How to say "I love you" in cat» — direction: camera, the room, the front-facing cat (catface.mjs), and the side-view
// scenes with the owner and the stranger's hand (cat.mjs / person.mjs from ../../cat-zoomies/film).
import { LAYOUT, sm, ease, lerp, win, clamp01 } from "../../cat-zoomies/film/layout.mjs";
import { WALK_STRIDE } from "../../cat-zoomies/film/cat.mjs";
import { EV, END } from "./timeline.mjs";

const per = (t, n, ph = 0) => Math.sin((2 * Math.PI * n * t) / END + ph);
const lin = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) return lerp(va, vb, (t - a) / (b - a)); } return keys[keys.length - 1][1]; };
const keys = (t, ks) => { if (t <= ks[0][0]) return ks[0][1]; for (let i = 0; i < ks.length - 1; i++) { const [a, va] = ks[i], [b, vb] = ks[i + 1]; if (t < b) return lerp(va, vb, ease((t - a) / (b - a))); } return ks[ks.length - 1][1]; };
const twitch = (t, a, d = 0.3) => (t > a && t < a + d ? Math.sin((Math.PI * (t - a)) / d) : 0);

export const SET = { front: 60, sideCat: -100, person: -168, strangerCat: -34, hand: [96, -12] };
const HEAD_Y = -46;

// ---------------------------------------------------------------- camera
export const CAMS = {
  FACE: { cx: SET.front, cy: -30, z: 7 },
  MED: { cx: SET.front, cy: -34, z: 3.4 },
  STARE: { cx: SET.front, cy: -33, z: 6.2 },
  SIDE: { cx: -135, cy: -62, z: 2.3 },
  STRANGER: { cx: 44, cy: -45, z: 2.5 },
};
const C = CAMS, CAM = [
  { t: 0, ...C.FACE }, { t: EV.missEnd - 0.2, ...C.FACE }, { t: EV.trusts + 0.4, ...C.MED },
  { t: EV.blinkEnd - 0.2, ...C.MED }, { t: EV.hard, ...C.STARE },
  { t: EV.safeEnd - 0.1, ...C.STARE }, { t: EV.tested, ...C.SIDE },
  { t: EV.back1End, ...C.SIDE }, { t: EV.tried + 0.3, ...C.STRANGER },
  { t: EV.handEnd, ...C.STRANGER }, { t: EV.tryEnd, ...C.MED },
  { t: EV.too2End, ...C.MED }, { t: END - 0.4, ...C.FACE }, { t: END + 10, ...C.FACE },
];
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  const c = { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) };
  const q = 1.6 / c.z; c.cx += q * per(t, 3); c.cy += q * 0.7 * per(t, 2, 1.3);
  return c;
}

// ---------------------------------------------------------------- the room: warm late afternoon
export function world(t) { return { t, tod: 16.4, clock: 16.4, lampLiving: 0, lampBed: 0, bedBlanket: 1, curtainSwing: 0 }; }

// ---------------------------------------------------------------- the front-facing cat's face (lids, stare, pupils, ears)
const LID = [ // hand-keyed lids on the words (0 open, 0.55 soft eyes, 1 closed)
  [0, 0], [EV.i1 - 0.3, 0], [EV.love - 0.1, 0.55], [EV.you1 + 0.1, 1], [EV.eyes1 + 0.35, 1], [EV.miss - 0.2, 0.2], [EV.missEnd, 0],
  [EV.narrows - 0.05, 0], [EV.narrows + 0.55, 0.55], [EV.closes, 0.6], [EV.closes + 0.4, 1], [EV.moment, 1], [EV.momentEnd, 0],
  [EV.closing - 0.05, 0], [EV.closing + 0.7, 1], [EV.safe + 0.1, 1], [EV.safeEnd, 0.5],
  [EV.tested, 0.3], [EV.tryEnd, 0.15], [EV.soft, 0.15], [EV.smileEnd, 0.4],
  [EV.blinksBack - 0.1, 0.4], [EV.back3 + 0.2, 1], [EV.said + 0.1, 1], [EV.too2End, 0.3], [EV.this, 0], [END, 0],
];
export function face(t) {
  return {
    lid: clamp01(keys(t, LID)),
    stare: win(t, EV.hard - 0.1, EV.closing + 0.1, 0.35, 0.4),
    pupil: lin(t, [[0, 0.62], [EV.hard - 0.1, 0.62], [EV.stare + 0.2, 0.15], [EV.closing, 0.15], [EV.closing + 0.5, 0.62], [END, 0.62]]),
    ear: -0.55 * win(t, EV.hard, EV.closing, 0.35, 0.4) + 0.4 * win(t, EV.want, EV.smile, 0.3, 0.4),
    earTwitch: twitch(t, 5.2) + twitch(t, 34.0) + twitch(t, 43.3),
    tilt: 0.25 * win(t, EV.want, EV.relaxed, 0.4, 0.5) + 0.15 * Math.sin((2 * Math.PI * 2 * t) / END),
    look: [0, 0], breath: (13 * t) / END, tail: (17 * t) / END, tailAmt: 0.6,   // whole cycles over the loop
    purrAmt: win(t, EV.means, EV.safeEnd, 0.3, 0.4) + win(t, EV.said, EV.too2End, 0.3, 0.3),
  };
}
// the front-facing cat is on screen except in the side-view study scenes
export const frontVis = (t) => 1 - win(t, EV.tested - 0.15, EV.tryEnd - 0.4, 0.5, 0.55);

// ---------------------------------------------------------------- the side-view study scenes
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
const slowLid = (t, t0) => keys(t, [[t0, 0], [t0 + 0.35, 0.55], [t0 + 0.7, 1], [t0 + 1.3, 1], [t0 + 1.8, 0]]);
const WALK = { a: EV.walk - 0.1, b: EV.hand - 0.05, x1: SET.hand[0] - 42 };
const SIDECAT = [
  { a: -99, f: () => null },
  { a: EV.tested - 0.4, vis: (t) => sm(t, EV.tested - 0.4, EV.tested + 0.1), f: (t) => at(SET.sideCat, 0, { pose: "sit", facing: -1, blink: slowLid(t, EV.blinkedBack1 - 0.05), ear: 0.7, look: 0.6 }) },
  { a: EV.stranger1 - 0.1, xf: 0.5, f: (t) => at(SET.strangerCat, 0, { pose: "sit", facing: 1, blink: slowLid(t, EV.blinked2 - 0.1), ear: 0.8, look: 0.1 }) },
  { a: WALK.a, xf: 0.25, f: (t) => { const k = ease(clamp01((t - WALK.a) / (WALK.b - WALK.a))), x = lerp(SET.strangerCat, WALK.x1, k); return at(x, 0, { pose: "walk", facing: 1, p: (x - SET.strangerCat) / WALK_STRIDE }); } },
  { a: WALK.b, xf: 0.25, vis: (t) => 1 - sm(t, EV.handEnd + 0.2, EV.tryEnd - 0.3), f: (t) => at(WALK.x1, 0, { pose: "stand", facing: 1, look: -0.35 + 0.2 * Math.sin(t * 5), blink: 0.4 * win(t, EV.hand, EV.handEnd + 0.3, 0.2, 0.3) }) },
  { a: EV.tryEnd, f: () => null },
];
export const sideCatTrack = (t) => runTrack(SIDECAT, t);
const PERSON = [
  { a: -99, f: () => null },
  { a: EV.tested - 0.4, prop: true, vis: (t) => sm(t, EV.tested - 0.4, EV.tested + 0.2) * (1 - sm(t, EV.stranger1 - 0.2, EV.stranger1 + 0.3)), f: (t) => at(SET.person, 0, { pose: "sit", facing: 1, face: "happy", seatY: LAYOUT.sofa.seatTop, wand: 0, blink: slowLid(t, EV.slowBlinked - 0.05), p: 0 }) },
  { a: EV.stranger1 + 0.3, f: () => null },
];
export const personTrack = (t) => runTrack(PERSON, t);
// the stranger's arm (a lab-coat sleeve reaching in from the right edge), 0..1
export const strangerArm = (t) => win(t, EV.stranger1, EV.tryEnd - 0.2, 0.7, 0.6);

// ---------------------------------------------------------------- the viewer's own eyes in the tutorial (lids 0..1)
export function youEyes(t) {
  const a = win(t, EV.soft - 0.3, EV.openEnd + 0.3, 0.3, 0.4);
  const lid = keys(t, [[EV.soft - 0.1, 0], [EV.soft + 0.5, 0.5], [EV.close2 - 0.05, 0.5], [EV.close2 + 0.5, 1], [EV.open - 0.05, 1], [EV.open + 0.45, 0]]);
  return { a, lid };
}
