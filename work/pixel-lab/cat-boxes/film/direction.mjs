// «Why do cats love boxes?» — direction: camera, the room's state, and every actor's pose as a function of time.
// Same apartment, cat and owner as «Your cat sleeps all day…» (../../cat-zoomies/film). Tracks are lists of segments
// {a, xf, f(t) → {x, y, st} | null, vis(t)}; neighbours crossfade with complementary dither gates over xf seconds.
import { LAYOUT, sm, ease, lerp, win, clamp01 } from "../../cat-zoomies/film/layout.mjs";
import { WALK_STRIDE, runStride } from "../../cat-zoomies/film/cat.mjs";
import { EV, END, hookTau } from "./timeline.mjs";

const per = (t, n, ph = 0) => Math.sin((2 * Math.PI * n * t) / END + ph);
const lin = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) return lerp(va, vb, (t - a) / (b - a)); } return keys[keys.length - 1][1]; };
const twitch = (t, a, d = 0.3) => (t > a && t < a + d ? Math.sin((Math.PI * (t - a)) / d) : 0);
const wig = (t, f = 2.4) => (t * f) % 1;
const arc = (k, x0, y0, x1, y1, h) => [lerp(x0, x1, k), lerp(y0, y1, k) - h * 4 * k * (1 - k)];

// ---------------------------------------------------------------- where things are (living room, on the rug, in the sun)
export const SET = { bed: -60, box: 50, paper: 172, person: -205 };
const OPEN = { x0: -168, v: 30 };                             // the cat walks in from the left at the start (and the end)
const catOpenX = (tau) => OPEN.x0 + OPEN.v * tau;
const SNIFF = -124;                                          // where it stops, nose at the bed's rim

// ---------------------------------------------------------------- camera
export const CAMS = {
  OPEN: { cx: -26, cy: -24, z: 2.3 },
  BOX: { cx: SET.box + 4, cy: -36, z: 3.0 },
  ROOM: { cx: SET.box - 4, cy: -54, z: 2.2 },
  HUNT: { cx: -40, cy: -70, z: 1.55 },
  PAPER: { cx: SET.paper - 10, cy: -34, z: 2.5 },
};
const C = CAMS, CAM = [
  { t: 0, ...C.OPEN }, { t: EV.came, ...C.OPEN }, { t: EV.random + 0.5, ...C.BOX },
  { t: EV.box4 - 0.4, ...C.BOX }, { t: EV.warmEnd, ...C.ROOM },
  { t: EV.closeEnd, ...C.ROOM }, { t: EV.box6 + 0.6, ...C.HUNT },
  { t: EV.catEnd + 0.1, ...C.HUNT }, { t: EV.floor, ...C.PAPER },
  { t: EV.eyeEnd, ...C.PAPER }, { t: END - 0.45, ...C.OPEN }, { t: END + 10, ...C.OPEN },
];
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  const c = { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) };
  const q = 2.2 / c.z; c.cx += q * per(t, 3); c.cy += q * 0.7 * per(t, 2, 1.3);
  return c;
}

// ---------------------------------------------------------------- the room: a sunny day; the shelter study dims it
export function world(t) {
  const tod = 13;                                                  // one sunny early afternoon
  return { t, tod, clock: tod, lampLiving: 0, lampBed: 0, bedBlanket: 1, curtainSwing: 0,
    dim: win(t, EV.shelter - 0.35, EV.weeksEnd + 0.1, 0.45, 0.5) };
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
    out.push({ ...r, lo: kout, hi: kin, a, inBox: !!r.inBox });
  }
  return out;
}
const at = (x, y, st, inBox = false) => ({ x, y, st, inBox });

// ---------------------------------------------------------------- the cat
const walkIn = (t) => { const u = hookTau(t), x = Math.min(catOpenX(u), SNIFF); return at(x, 0, { pose: "walk", facing: 1, p: (x - OPEN.x0) / WALK_STRIDE }); };
const P1 = { a: EV.sits - 0.25, b: EV.sits + 0.27 };                  // the leap into the box
const P2 = { a: EV.floor - 0.7, b: EV.floor - 0.25 };                 // out of the box toward the paper
const P3 = { a: EV.keep - 0.3, b: EV.keep + 0.2 };                    // back into the box
const CAT = [
  { a: -99, f: walkIn },
  { a: EV.bed - 0.05, xf: 0.3, f: (t) => at(SNIFF, 0, { pose: "stand", facing: 1, look: -0.6 + 0.3 * Math.sin(t * 9), blink: 0 }) },
  { a: P1.a, xf: 0.12, f: (t) => { const k = clamp01((t - P1.a) / (P1.b - P1.a)), [x, y] = arc(k, SNIFF, 0, SET.box, 0, 54); return at(x, y, { pose: "pounce", facing: 1, k }); } },
  { a: P1.b, xf: 0.14, f: (t) => at(SET.box, 0, { pose: "sit", facing: 1, eyeBig: 0.5 + 0.5 * win(t, EV.random - 0.2, EV.randomEnd + 0.3, 0.3, 0.4), blink: twitch(t, 4.6) + twitch(t, EV.shelter - 0.6), ear: 1 - 0.9 * win(t, EV.stressed - 0.05, EV.hides, 0.15, 0.3), look: 0.05 }, true) },
  { a: EV.hides - 0.05, xf: 0.2, f: (t) => at(SET.box, 21 * ease(clamp01((t - EV.hides + 0.05) / 0.4)), { pose: "sit", facing: 1, ear: 0.15, eyeBig: 1, blink: 0 }, true) },
  // warm: it curls up and sleeps in the box
  { a: EV.warm - 0.2, xf: 0.45, f: (t) => at(SET.box, 0, { pose: "sleep", facing: 1, breath: t / 3.2, ear: 0, eye: 0 }, true) },
  // the hunter: low in the box, eyes over the rim, following the owner … swats at his slipper on "cat."
  { a: EV.hunter - 0.1, xf: 0.4, f: (t) => at(SET.box, 12, { pose: "sit", facing: -1, eyeBig: 0.9, ear: 1, blink: twitch(t, 33.0), lookX: 0.8 - 0.9 * sm(t, EV.sees1, EV.nobody), look: -0.2 }, true) },
  { a: EV.catEnd - 0.55, xf: 0.16, f: (t) => at(SET.box - 6, 0, { pose: "swat", facing: -1, p: (t - (EV.catEnd - 0.55)) * 2.2, reach: [-52, -52] }, true) },
  { a: EV.catEnd + 0.15, xf: 0.3, f: (t) => at(SET.box, 0, { pose: "sit", facing: -1, eyeBig: 0.8, ear: 1, blink: twitch(t, 38.9) }, true) },
  // the paper shapes: out of the box, sits in the drawn square, then in the illusory one
  { a: P2.a, xf: 0.14, f: (t) => { const k = clamp01((t - P2.a) / (P2.b - P2.a)), [x, y] = arc(k, SET.box, 0, SET.box + 52, 0, 40); return at(x, y, { pose: "pounce", facing: 1, k }); } },
  { a: P2.b, xf: 0.16, f: (t) => { const a = P2.b, b = EV.sat1 - 0.2, k = ease(clamp01((t - a) / (b - a))), x = lerp(SET.box + 52, SET.paper, k); return at(x, 0, { pose: "walk", facing: 1, p: (x - SET.box) / WALK_STRIDE }); } },
  { a: EV.sat1 - 0.2, xf: 0.3, f: (t) => at(SET.paper, 0, { pose: "sit", facing: 1, blink: twitch(t, 43.5), look: 0.1, ear: 0.8 }) },
  { a: EV.even - 0.4, xf: 0.3, f: (t) => at(SET.paper, 0, { pose: "stand", facing: 1, blink: 0, look: -0.3 }) },
  { a: EV.sat2 - 0.15, xf: 0.3, f: (t) => at(SET.paper, 0, { pose: "sit", facing: 1, blink: twitch(t, 47.9), look: 0.15, ear: 1 }) },
  { a: P3.a, xf: 0.14, f: (t) => { const k = clamp01((t - P3.a) / (P3.b - P3.a)), [x, y] = arc(k, SET.paper, 0, SET.box, 0, 46); return at(x, y, { pose: "pounce", facing: -1, k }); } },
  { a: P3.b, xf: 0.14, f: (t) => at(SET.box, 0, { pose: "sit", facing: -1, eyeBig: 0.6, blink: 0 }, true) },
  // "trust me": the same moment again — the cat walks in from the left (= the first frame)
  { a: END - 0.75, xf: 0.6, f: walkIn },
];
export const catTrack = (t) => runTrack(CAT, t);

// ---------------------------------------------------------------- the owner (walks past the hunter's box)
const PW = { a: EV.box6 - 0.2, x0: -300, x1: -12 };
const PERSON = [
  { a: -99, f: () => null },
  { a: PW.a, vis: (t) => sm(t, PW.a, PW.a + 0.35), f: (t) => { const k = clamp01((t - PW.a) / (EV.catEnd - 0.45 - PW.a)), x = lerp(PW.x0, PW.x1, k); return at(x, 0, { pose: "walk", facing: 1, face: "sleepy", p: (x - PW.x0) / 60, glass: 0 }); } },
  { a: EV.catEnd - 0.4, xf: 0.25, vis: (t) => 1 - sm(t, EV.floor - 0.6, EV.floor - 0.1), f: (t) => at(PW.x1, 0, { pose: "stand", facing: 1, face: "surprised", p: t }) },
  { a: EV.floor, f: () => null },
];
export const personTrack = (t) => runTrack(PERSON, t);

// ---------------------------------------------------------------- props state
export function props(t) {
  return {
    bedTag: 1, bedShine: 1,
    boxWobble: (t > EV.sits + 0.27 && t < EV.sits + 0.8 ? (t - EV.sits - 0.27) / 0.53 : 0) + (t > P3.b && t < P3.b + 0.53 ? (t - P3.b) / 0.53 : 0),
    paperSquare: win(t, EV.paper - 0.2, EV.even - 0.1, 0.45, 0.4),
    paperKanizsa: win(t, EV.even - 0.1, EV.keep + 0.4, 0.4, 0.5),
    glow: win(t, EV.wasnt - 0.1, EV.eyeEnd, 0.5, 0.4) * (0.75 + 0.25 * Math.sin(t * 7)),
    corners: win(t, EV.four - 0.05, EV.trick, 0.15, 0.4),
    cut: sm(t, EV.warm - 0.3, EV.warm + 0.4) * (1 - sm(t, EV.closeEnd, EV.closeEnd + 0.5)),
  };
}
// the shelter study: day counters and stress meters
export function shelter(t) {
  const a = win(t, EV.shelter - 0.1, EV.weeksEnd + 0.1, 0.45, 0.45);
  const dayL = Math.min(3, lin(t, [[EV.scientists1, 1], [EV.three, 3]])), dayR = lin(t, [[EV.scientists1, 1], [EV.three, 3], [EV.two, 14]]);
  const stressL = lin(t, [[0, 0.9], [EV.calmed, 0.85], [EV.daysEnd, 0.15]]), stressR = lin(t, [[0, 0.9], [EV.without, 0.85], [EV.weeks, 0.85], [EV.weeksEnd, 0.15]]);
  return { a, dayL, dayR, stressL, stressR, t, relaxL: sm(t, EV.three - 0.2, EV.daysEnd), relaxR: sm(t, EV.two - 0.2, EV.weeksEnd) };
}
export function thermo(t) {
  return { a: win(t, EV.catsBest - 0.3, EV.closeEnd, 0.35, 0.45), level: lin(t, [[0, 21], [EV.thirty, 21], [EV.thirtyEight + 0.4, 34]]), band: sm(t, EV.thirty - 0.1, EV.thirtyEight + 0.3), room: sm(t, EV.living - 0.2, EV.room + 0.2) };
}
