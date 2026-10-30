// LV3 river choreography: every time is a word time (EV / LV) plus an offset or a duration, never a hard-coded second.
// levels/river.mjs draws from these tables and poses; levels/river-motions.mjs lists the audible motions from the same
// tables, so the sound can never drift from the picture.
// "A hippo looks lazy, but it kills about five hundred. It attacks boats that come too close."
import { EV, LV, W } from "../timeline.mjs";
import { ease, clamp01, lerp, sm } from "./river-kit.mjs";

const KILLS = W("kills", 2);           // "it KILLS about five hundred"
export const HX = 1350, HY = -130;                   // hippo head centre at rest (world); water surface = 0
export const SIGN_X = 1124;                          // LV 3 sign on the left bank
const U = (t, a, b) => clamp01((t - a) / (b - a));
const bump = (t, a, d) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));

export const RT = {
  hello: [EV.hippo + 0.3, 0.45],                                       // ear flick as the camera arrives
  yawn: { t0: EV.lazy - 0.06, open: 0.5, t1: EV.but1 - 0.03, shut: 0.13, gap: 58 },   // lazy yawn, snaps shut on "but"
  wide: [EV.but1 - 0.03, EV.but1 + 0.09, KILLS - 0.04],             // eyes pop wide … until they start to narrow
  narrow: [KILLS - 0.04, KILLS + 0.3],                           // suspicious squint ("don't be fooled")
  nod: [EV.five - 0.05, 0.5],                                          // a slow knowing nod on "five hundred"
  glance: EV.hundred2 + 0.32,                                          // the squint slides right, to the canoe
  canoe: { t0: EV.hundred2 - 0.42, xs: 1690, xb: 1516, kStroke: 0.78 }, // drifts in from behind the spit, slowing, paddled
  notice: EV.attacks - 0.12,                                           // the hero sees the hippo coming
  surge: [EV.attacks - 0.06, EV.boats],                                // lunge to the right, head down, gaping
  gape: [EV.attacks - 0.02, EV.attacks + 0.12, EV.boats - 0.06, EV.boats + 0.06],  // open → hold → snap shut on the bump
  hit: EV.boats,                                                       // contact: the canoe is shoved and pitches
  shove: 24,
  roll: [EV.boats + 0.24, EV.boats + 0.52],                            // the canoe rolls over (≈ 14.6), lands hull-up
  fly: [EV.boats + 0.22, EV.boats + 0.58],                             // the hero is tossed out … splashes in
  pop: EV.boats + 0.74,                                                // his head pops up
  swim: [EV.boats + 0.82, EV.close + 0.92],                            // frantic crawl to the far bank (and smaller)
  climb: [EV.close + 0.92, EV.close + 1.3],                            // climbs out on the far bank (camera already leaving)
  snort: [EV.close + 0.02, 0.5],                                       // satisfied snort (nostrils flare, spray)
  happy: [EV.close - 0.04, EV.close + 0.5],                            // ^ ^ eyes while snorting
  back: [EV.close + 0.45, LV.hippo[1] + 0.9],                          // glides back to its spot
  splash: 0.85, spray: 0.7,                                            // lives of a splash and of the snort spray
  leave: [LV.hippo[1] - 0.15, LV.hippo[1] + 0.12],                     // the level's HUD tag dissolves as the camera leaves
};

// ---------------------------------------------------------------- hippo
/** Hippo state at t: head centre (world), leg lifts, mouth gap, ear flick, expression. */
export function hippoAt(t) {
  const Y = RT.yawn, G = RT.gape;
  let x = HX, y = HY + Math.sin(t * 2.2) * 1.6;
  // surge to the right with the head lowered, recoil on the hit, glide back after the snort
  const s = ease(U(t, RT.surge[0], RT.surge[1])), rec = t > RT.hit ? Math.exp(-(t - RT.hit) * 7) * Math.sin((t - RT.hit) * 14) * 6 : 0;
  x += 40 * s - rec - 40 * ease(U(t, RT.back[0], RT.back[1]));
  y += 26 * s * (1 - ease(U(t, RT.hit + 0.1, RT.hit + 0.6))) - 4 * bump(t, RT.surge[0] - 0.12, 0.24);
  // yawn: rises a little and opens; snaps shut on "but"
  const yo = ease(U(t, Y.t0, Y.t0 + Y.open)) * (1 - ease(U(t, Y.t1, Y.t1 + Y.shut)));
  const go = ease(U(t, G[0], G[1])) * (1 - ease(U(t, G[2], G[3])));
  const gap = Y.gap * yo + 36 * go;
  y -= 5 * yo + 3 * bump(t, RT.nod[0], RT.nod[1]) - 5 * bump(t, RT.nod[0] + 0.2, RT.nod[1]);
  // legs paddle while it surges and drift slowly otherwise
  const pw = sm(t, RT.surge[0] - 0.1, RT.surge[0]) * (1 - sm(t, RT.hit + 0.3, RT.hit + 0.7)), ph = t * (6 + 10 * pw);
  const lf = 3 + Math.sin(ph) * (3 + 5 * pw), rf = 3 + Math.sin(ph + Math.PI) * (3 + 5 * pw);
  return { x, y, gap, yawn: yo, gape: go, lf, rf };
}

// ---------------------------------------------------------------- canoe
/** Canoe centre (world x, waterline y offset), pitch (rad, + = bow/left end down), roll (1 upright → −1 hull up). */
export function canoeAt(t) {
  const C = RT.canoe, k = U(t, C.t0, RT.hit);
  let x = C.xb + (C.xs - C.xb) * Math.pow(1 - k, 1.7), y = Math.sin(t * 3.1) * 0.8, pitch = Math.sin(t * 2.3) * 0.02, roll = 1;
  if (t > RT.hit) {
    const u = t - RT.hit;
    x += RT.shove * ease(Math.min(1, u / 0.3)) + Math.max(0, t - RT.roll[1]) * 7;
    pitch = -0.32 * Math.exp(-u * 5) * Math.sin(u * 15 + 0.6) - 0.12 * Math.exp(-u * 4);
    const r = U(t, RT.roll[0], RT.roll[1]); roll = Math.cos(Math.PI * ease(r)); y -= 14 * Math.sin(Math.PI * r);
    if (t > RT.roll[1]) { const v = t - RT.roll[1]; y += Math.exp(-v * 5) * Math.sin(v * 13) * 3; pitch = Math.sin(t * 2.3) * 0.03; }
  }
  return { x, y, pitch, roll };
}

// ---------------------------------------------------------------- hero
export const HERO_S = 0.62;          // hero scale in the canoe
/** Hero state: mode "sit" | "fly" | "under" | "swim" | "bank"; origin (world, feet point), scale, swim waterline. */
export function heroAt(t) {
  const cn = canoeAt(t);
  if (t < RT.fly[0]) return { mode: "sit", x: cn.x - 4, y: cn.y + 16, s: HERO_S, stroke: (t - RT.canoe.t0) / RT.canoe.kStroke, scared: sm(t, RT.notice, RT.notice + 0.15) };
  if (t < RT.fly[1]) { const u = U(t, RT.fly[0], RT.fly[1]), c0 = canoeAt(RT.fly[0]); return { mode: "fly", x: lerp(c0.x - 4, c0.x - 10, u), y: lerp(c0.y + 16, 120, u * u) - 92 * Math.sin(Math.PI * Math.min(1, u * 0.95)), s: HERO_S, u }; }
  if (t < RT.pop) return { mode: "under", x: canoeAt(RT.fly[0]).x - 10, u: U(t, RT.fly[1], RT.pop), s: HERO_S };
  const x0 = canoeAt(RT.fly[0]).x - 10;
  if (t < RT.swim[1]) { const u = U(t, RT.swim[0], RT.swim[1]), e = 1 - Math.pow(1 - u, 1.4), rise = ease(U(t, RT.pop, RT.pop + 0.22));
    return { mode: "swim", x: x0 - 30 * e, wl: lerp(0, -32, e), s: lerp(HERO_S, 0.3, e), rise, stroke: (t - RT.swim[0]) / 0.3, u }; }
  const u = ease(U(t, RT.climb[0], RT.climb[1]));
  return { mode: "bank", x: x0 - 30 - 4 * u, wl: -32, ground: lerp(-32 + 88 * 0.3, -38, u), s: 0.3, u };
}

// ---------------------------------------------------------------- the paddle: held while he paddles, tossed when he flies out
export const PADDLE = { vx: -95, vy: -235, g: 460, spin: 10.5, x0: -9.5, y0: -19, a0: 1.69 };   // starts where his hands held it
/** Paddle centre (world), angle (rad, 0 = horizontal) and whether it floats; null while the hero still holds it. */
export function paddleAt(t) {
  if (t < RT.fly[0]) return null;
  const P = PADDLE, c0 = canoeAt(RT.fly[0]), x0 = c0.x + P.x0, y0 = c0.y + P.y0, land = (-P.vy + Math.sqrt(P.vy * P.vy - 4 * P.g * y0)) / (2 * P.g);
  const u = Math.min(t - RT.fly[0], land), ang0 = P.a0 + P.spin * u;
  let x = x0 + P.vx * u, y = y0 + P.vy * u + P.g * u * u, ang = ang0, floats = false;
  if (t - RT.fly[0] > land) { const v = t - RT.fly[0] - land, rest = Math.round(ang0 / Math.PI) * Math.PI; floats = true; x += -6 * (1 - Math.exp(-v * 2)); y = Math.sin(t * 3 + 1) * 0.8; ang = rest + (ang0 - rest) * Math.exp(-v * 7); }
  return { x, y, ang, floats, land: RT.fly[0] + land };
}

