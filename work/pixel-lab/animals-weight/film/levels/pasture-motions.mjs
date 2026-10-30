// Choreography tables of LV7 pasture (horse) and LV8 river (hippo), the hippo's path, and MOTIONS: one entry per audible
// motion, for the 8-bit sound design (each sound lasts exactly as long as its motion). levels/pasture.mjs and
// levels/river.mjs draw from these same tables, so MOTIONS can never drift from the picture. No hard-coded seconds:
// every time is a word time (EV / LV) plus an offset or duration from the tables. Times are on the film clock (s).
import { EV, LV, CAM } from "../timeline.mjs";
import { sm, ease, lerp, clamp01, rnd } from "../cute.mjs";

// ---------------------------------------------------------------- LV7 pasture
const P_DROP0 = EV.horse + 0.38, P_DROP_DT = 0.14, P_FALL = 0.26;
export const PT = {
  x: { horse: 3240, seesaw: 3062 },                                   // world x of the horse and the seesaw pivot
  drop: { t0: P_DROP0, dt: P_DROP_DT, fall: P_FALL, n: 8, tilt: 0.2, level: P_DROP0 + 7 * P_DROP_DT + P_FALL },
  bounce: { k: 9, w: 22, amp: 2.5 },                                 // landing bounce of a dropped icon: exp(−k·u)·sin(w·u)·amp
  settle: { k: 6.5, w: 11 },                                         // seesaw spring (kit spring defaults)
  tap: { t: EV.toe - 0.05, up: 0.42, down: 0.08, end: 0.5, lift: 7 }, // hoof: rises for `up`, slams down over `down`
  puff: 0.7,                                                         // life of the hoof dust
  lens: { t0: EV.toe - 0.42, grow: 0.36, fade: 0.12 },               // X-ray magnifier grows out of the hoof
  glow: [EV.toe, EV.toe + 0.2],                                      // toe bones light up
  ancestor: [EV.leg - 0.12, EV.leg + 0.22],                          // three-toed ancestor lens + label dissolve in
  tagBalance: [P_DROP0 + 7 * P_DROP_DT + P_FALL + 0.05, P_DROP0 + 7 * P_DROP_DT + P_FALL + 0.3],
  tagToe: [EV.toe + 0.05, EV.toe + 0.3],
  pickup: { t0: EV.halfTonne, dur: 1.6 },
  ear: { every: 3.1, dur: 0.5 },                                     // periodic ear twitch
  leave: [LV.horse[1] - 0.15, LV.horse[1] + 0.12],                   // the level's HUD dissolves as the camera leaves
};

// ---------------------------------------------------------------- LV8 river
const R_RISE = EV.hippo - 0.3, R_SINK0 = EV.float - 0.1, R_SINK1 = EV.float + 0.62, R_WALK = EV.walks - 0.06;
const R_DROP0 = EV.still + 0.2, R_DROP_DT = 0.17, R_FALL = 0.26;
export const HIPPO = { x: 3772, wl: 0, bottom: 240, feet: 160, peek: 12 };   // start x, water line, river bottom, local feet / waterline when peeking
export const RT = {
  x: { seesaw: 3562 },
  rise: { t0: R_RISE, dur: 0.6, splash: R_RISE + 0.35 },
  sink: [R_SINK0, R_SINK1], landLead: 0.02,                         // sinks between the two times; the mud puff starts landLead early
  walk: { t0: R_WALK, hop: 0.82, dx: 17, h: 24, n: 4 },              // slow-motion gallop: n hops of `hop` s
  flick: { ts: [EV.hippo + 0.55, EV.still + 0.55, EV.swim + 0.9], dur: 0.45 },
  snort: { t0: EV.still - 0.25, flare: 0.5, delay: 0.1 },            // nostrils flare; the spray leaves `delay` later
  paddle: { ramp: [EV.swim - 0.05, EV.swim + 0.2], ref: EV.swim, w: 9, stroke0: EV.swim + 0.05, dt: 0.19, n: 6 },
  drop: { t0: R_DROP0, dt: R_DROP_DT, fall: R_FALL, n: 4, tilt: 0.24, level: R_DROP0 + 3 * R_DROP_DT + R_FALL },
  bubbles: { sink0: R_SINK0 - 0.05, sinkDt: 0.06, sinkN: 16, walk0: R_WALK + 0.3, walkDt: 0.9, walkN: 10 },
  splash: 0.9, spray: 0.7, puff: 1.1,                                 // lives of a surface splash, the snort spray, a mud puff
  pickup: { t0: EV.still, dur: 1.6 },
  tagBalance: [R_DROP0 + 3 * R_DROP_DT + R_FALL + 0.05, R_DROP0 + 3 * R_DROP_DT + R_FALL + 0.3],
  tagSwim: [EV.swim, EV.swim + 0.25], tagFloat: [EV.float, EV.float + 0.25],
  leave: [LV.hippo[1] - 0.15, LV.hippo[1] + 0.12],
};

/** Hippo pose at time t: head centre (world x, y) and left / right leg lifts (px). */
export function hippoPose(t) {
  const { x: HX, wl: WL, bottom: BOTTOM, feet: FEET, peek: PEEK } = HIPPO, [T_SINK0, T_SINK1] = RT.sink, W = RT.walk, PD = RT.paddle;
  const bobW = Math.sin(t * 2.4) * 2;
  const peekY = WL - PEEK, floatY = WL - PEEK + 70, botY = BOTTOM - FEET;
  let x = HX, y, lf = 0, rf = 0;
  if (t < T_SINK0) {
    const rise = ease(clamp01((t - RT.rise.t0) / RT.rise.dur));
    y = lerp(floatY, peekY, rise) + bobW * rise;
    const paddle = sm(t, PD.ramp[0], PD.ramp[1]);
    if (paddle > 0) { y += Math.sin((t - PD.ref) * PD.w) * 3 * paddle - 2 * paddle; lf = (1 + Math.sin((t - PD.ref) * PD.w)) * 5 * paddle; rf = (1 + Math.sin((t - PD.ref) * PD.w + Math.PI)) * 5 * paddle; }
  } else if (t < W.t0) {
    const k = clamp01((t - T_SINK0) / (T_SINK1 - T_SINK0)), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const y0 = peekY + Math.sin(T_SINK0 * 2.4) * 2;
    y = lerp(y0, botY, e) + (t > T_SINK1 ? -Math.exp(-(t - T_SINK1) * 8) * Math.sin((t - T_SINK1) * 16) * 3 : 0);
    lf = rf = (1 - e) * 6;
  } else {
    const u = t - W.t0, n = Math.floor(u / W.hop), f = u / W.hop - n, hops = Math.min(n, W.n);
    const fwd = hops * W.dx + (n < W.n ? ease(f) * W.dx : 0);
    x = HX + fwd;
    const air = n < W.n ? Math.sin(Math.PI * f) : 0, squash = n < W.n ? (f < 0.12 ? (0.12 - f) / 0.12 : f > 0.9 ? (f - 0.9) / 0.1 : 0) : 0;
    y = botY - air * W.h + squash * 3;
    lf = air * 8 * (n % 2 ? 0.4 : 1); rf = air * 8 * (n % 2 ? 1 : 0.4);
  }
  return { x, y, lf, rf };
}
/** Bubble i of the hippo's bubble stream: emission time and how long it rises before it pops at the surface. */
export function bubble(i) {
  const B = RT.bubbles, walk = i >= B.sinkN, t0 = walk ? B.walk0 + (i - B.sinkN) * B.walkDt : B.sink0 + i * B.sinkDt;
  const src = hippoPose(t0), life = (src.y + 4 - (HIPPO.wl + 2)) / (60 + rnd(i * 3) * 40);   // rises until 2 px under the surface
  return { t0, life, walk };
}

// ---------------------------------------------------------------- MOTIONS (sorted by t0)
// camera, same easing as render.mjs camera(): used only to skip motions that start while their object is off screen
const camX = (t) => { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1)); return Math.round(lerp(a.cx, b.cx, k)); };
const seen = (t, wx, half) => { const sx = 270 + wx - camX(t); return sx + half > 0 && sx - half < 540; };
const SETTLE = Math.log(50) / PT.settle.k;          // the seesaw spring is within 2 % of rest after this long
const LANDED = Math.PI / PT.bounce.w;                 // a dropped icon's visible bounce ends this long after it lands
const f2 = (v) => v.toFixed(2);
export const MOTIONS = (() => {
  const out = [], add = (t0, t1, kind, level, note) => out.push({ t0, t1, kind, level, note });
  // LV7 pasture -------------------------------------------------------------------------------------------------
  const D = PT.drop;
  for (let i = 0; i < D.n; i++) { const t0 = D.t0 + i * D.dt; add(t0, t0 + D.fall + LANDED, "drop", "pasture", `tiny person ${i + 1}/${D.n} falls onto the seesaw, lands at ${f2(t0 + D.fall)} and bounces`); }
  add(D.t0 + D.fall, D.level + SETTLE, "swing", "pasture", `seesaw board tips back a step at each of the ${D.n} landings, balances (level) at ${f2(D.level)} and settles`);
  add(PT.pickup.t0, PT.pickup.t0 + PT.pickup.dur, "pickup", "pasture", `"500 KG" pickup rises and dissolves`);
  add(PT.tagBalance[0], PT.tagBalance[1], "tag", "pasture", `"8 PEOPLE = 1 HORSE" label dissolves in`);
  for (let k = Math.ceil((LV.horse[0] - 1) / PT.ear.every); k * PT.ear.every < LV.horse[1] + 1; k++) { const t0 = k * PT.ear.every; if (seen(t0, PT.x.horse, 110)) add(t0, t0 + PT.ear.dur, "tick", "pasture", "horse's right ear twitches"); }
  add(PT.tap.t - PT.tap.up, PT.tap.t + PT.tap.down, "stamp", "pasture", `front hoof lifts, slams down at ${f2(PT.tap.t + PT.tap.down)}`);
  add(PT.tap.t, PT.tap.t + PT.puff, "puff", "pasture", "dust puff around the stamping hoof");
  add(PT.lens.t0, PT.lens.t0 + PT.lens.grow, "pop", "pasture", "X-ray magnifier grows out of the hoof to its place");
  add(PT.glow[0], PT.glow[1], "glow", "pasture", "toe bones light up in the magnifier (then pulse until the camera leaves)");
  add(PT.tagToe[0], PT.tagToe[1], "tag", "pasture", `"ONE TOE" label dissolves in`);
  add(PT.ancestor[0], PT.ancestor[1], "pop", "pasture", `three-toed ancestor magnifier and its "ANCESTOR / 3 TOES" label dissolve in`);
  // LV8 river ---------------------------------------------------------------------------------------------------
  const HX = HIPPO.x;
  add(RT.rise.t0, RT.rise.t0 + RT.rise.dur, "rise", "river", "hippo's head rises until ears, eyes and nostrils poke out");
  add(RT.rise.splash, RT.rise.splash + RT.splash, "splash", "river", "surface splash as the head breaks the water");
  for (const ts of RT.flick.ts) add(ts, ts + RT.flick.dur, "tick", "river", "hippo flicks its ears");
  add(RT.snort.t0 + RT.snort.delay, RT.snort.t0 + RT.snort.delay + RT.spray, "splash", "river", `snort: nostrils flare from ${f2(RT.snort.t0)}, two fans of spray`);
  add(RT.pickup.t0, RT.pickup.t0 + RT.pickup.dur, "pickup", "river", `"2 T" pickup rises and dissolves`);
  const RD = RT.drop;
  for (let i = 0; i < RD.n; i++) { const t0 = RD.t0 + i * RD.dt; add(t0, t0 + RD.fall + LANDED, "drop", "river", `pony ${i + 1}/${RD.n} falls onto the bank seesaw, lands at ${f2(t0 + RD.fall)} and bounces`); }
  add(RD.t0 + RD.fall, RD.level + SETTLE, "swing", "river", `bank seesaw tips back a step at each of the ${RD.n} landings, balances at ${f2(RD.level)} and settles`);
  add(RT.tagBalance[0], RT.tagBalance[1], "tag", "river", `"4 HORSES = 1 HIPPO" label dissolves in`);
  add(RT.tagSwim[0], RT.tagSwim[1], "tag", "river", `"CAN'T SWIM" tag dissolves in`);
  add(RT.paddle.ramp[0], RT.sink[0], "paddle", "river", "legs paddle in vain, the head bobs (until it starts to sink)");
  for (let n = 0; n < RT.paddle.n; n++) { const ts = RT.paddle.stroke0 + n * RT.paddle.dt; if (ts > RT.sink[0]) break; add(ts, ts + RT.splash, "splash", "river", `paddle stroke ${n + 1}: small splash ${n % 2 ? "right" : "left"} of the head`); }
  add(RT.tagFloat[0], RT.tagFloat[1], "tag", "river", `"CAN'T FLOAT" tag dissolves in`);
  { let last = 0; for (let i = 0; i < RT.bubbles.sinkN; i++) { const b = bubble(i); last = Math.max(last, b.t0 + b.life); }
    add(RT.bubbles.sink0, last, "bubbles", "river", `hippo sinks (${f2(RT.sink[0])}–${f2(RT.sink[1])}) in a stream of ${RT.bubbles.sinkN} bubbles; the last pops at the surface`); }
  add(RT.sink[1] - RT.landLead, RT.sink[1] - RT.landLead + RT.puff, "thud", "river", "lands on the river bottom; mud puff spreads and fades");
  for (let n = 0; n < RT.walk.n; n++) { const t0 = RT.walk.t0 + n * RT.walk.hop, t1 = t0 + RT.walk.hop; if (!seen(t0, HX + n * RT.walk.dx, 90)) continue;
    add(t0, t1, "bounce", "river", `slow-motion gallop hop ${n + 1}: pushes off the bottom, glides up ${RT.walk.h} px, lands at t1`);
    if (seen(t1, HX + (n + 1) * RT.walk.dx, 90)) add(t1, t1 + RT.puff, "puff", "river", `mud puff at gallop landing ${n + 1}`); }
  for (let i = RT.bubbles.sinkN; i < RT.bubbles.sinkN + RT.bubbles.walkN; i++) { const b = bubble(i); if (seen(b.t0, hippoPose(b.t0).x, 90)) add(b.t0, b.t0 + b.life, "bubbles", "river", "single small bubble while walking"); }
  return out.sort((a, b) => a.t0 - b.t0);
})();
