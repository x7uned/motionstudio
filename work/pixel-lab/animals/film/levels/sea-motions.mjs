// Audible motions of the sea column and the shore for the 8-bit sound design: every sound lasts exactly as long as
// its motion. MOTIONS = [{ t0, t1, kind, level, note }], computed from the same timing the modules draw with
// (TIMING in levels/sea.mjs, SHORE_T in levels/shore.mjs, EV/W()/END/CAM) — no hard-coded seconds. Ambient loops
// (sponge outflow, idle jelly pulses, shore waves and crab) are periodic over END and listed only while on screen,
// so the loop seam stays clean. level 0..1 is a suggested loudness.
import { EV, END, CAM, WORLD_W, LV } from "../timeline.mjs";
import { ease, win } from "../cute.mjs";
import { TIMING as TM } from "./sea.mjs";
import { SHORE_T } from "./shore.mjs";

// the harness camera (render.mjs), same keys and easing
function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k };
}
/** Is the world box (x0..x1, y0..y1) of the sea column on screen at t (opening column or the wrapped dive copy)? */
function seaOn(t, x0, x1, y0, y1) {
  const { cx, cy } = camera(t);
  return [cx, cx - WORLD_W].some((lx) => x1 > lx - 270 && x0 < lx + 270 && y1 > cy - 480 && y0 < cy + 480);
}
const shoreOn = (t) => { const { cx } = camera(t); return cx + 270 > 540 && cx - 270 < 1080; };
const shoreWin = (() => { let a = null, b = null; for (let f = 0; f <= Math.round(END * 30); f++) { const t = f / 30; if (shoreOn(t)) { a ??= t; b = t + 1 / 30; } } return [a, b]; })();
const overlaps = (t0, t1, [a, b]) => t1 > a && t0 < b;

const M = [];
const add = (t0, t1, kind, level, note) => M.push({ t0: +t0.toFixed(4), t1: +t1.toFixed(4), kind, level, note });
/** A win() window → its fade-in and fade-out as two motions. */
const tagIO = ([a, b, fi, fo], note, kind = "tag", level = 0.5) => { add(a, a + fi, kind, level, note + " appears"); add(b, b + fo, kind + "out", level * 0.5, note + " dissolves"); };

// ---------------------------------------------------------------- LV1 · sponge
{ // outflow stream: one bubble burst per rising band of the outflow column (TM.stream.bands per END), louder while it filters
  const n = TM.stream.bands, P = END / n;
  for (let k = 0; k < n; k++) { const t0 = k * P, t1 = t0 + P; if (!seaOn(t0, 200, 340, 1440, 1600) && !seaOn(t1, 200, 340, 1440, 1600)) continue; add(t0, t1, "bubble", +(0.25 + 0.45 * win((t0 + t1) / 2, ...TM.stream.grow)).toFixed(3), "sponge outflow burst (periodic over END)"); }
}
{ // food specks: the whole drift, then each pair dissolving into the side pores
  const f = TM.food, s0 = EV.filters - f.lead, last = s0 + (f.pairs - 1) * f.stagger;
  add(s0, last + f.dur, "slide", 0.35, "food specks drift toward the side pores");
  for (let j = 0; j < f.pairs; j++) { const st = s0 + j * f.stagger; add(st + f.absorb * f.dur, st + f.dur, "tick", 0.3, `food specks pair ${j + 1} sucked into the pores`); }
}
{ const [a, b, , fo] = TM.fossil; add(a, b + fo, "glow", 0.45, "dinosaur fossil glow outline"); tagIO(TM.fossil, "DINOSAURS tag"); }
tagIO(TM.zeroTag, "0 BRAIN CELLS tag");
add(...TM.lv2.rise, "bubble", 0.6, "LV 2 bubble sign rises out of the stream to the jellyfish");

// ---------------------------------------------------------------- LV2 · jellyfish
{ // idle pulses (contraction phase of each idle cycle) while the resting jelly is on screen; it is idle again in the dive copy
  const J = TM.jelly, P = END / J.idleN;
  for (let k = 0; k < J.idleN; k++) {
    const t0 = k * P, t1 = t0 + J.idleContract * P, opening = t0 < J.swimFrom, dive = t0 >= LV.dive[0];
    if ((opening || dive) && (seaOn(t0, 190, 350, 840, 1040) || seaOn(t1, 190, 350, 840, 1040))) add(t0, t1, "pulse", 0.35, "jelly idle pulse (bell contracts)");
  }
  for (let k = 0; k < J.swimN; k++) { const t0 = J.swimFrom + k * J.swimD; add(t0, t0 + J.contract * J.swimD, "pulse", 0.9, `jelly swim pulse ${k + 1}/${J.swimN} (strong contraction, nerve net flashes)`); }
}
tagIO(TM.noBrainTag, "NO BRAIN tag");
add(...TM.net, "glow", 0.55, "nerve net lights up across the bell");
add(EV.swim, EV.swim + TM.pickup, "pickup", 0.8, "+SWIM pickup");

// ---------------------------------------------------------------- LV3 · octopus
{ const [a, b, fi, fo] = TM.octoWave; add(a, a + fi, "whoosh", 0.3, "octopus back arm lifts in a hello wave"); add(b, b + fo, "whoosh", 0.25, "octopus arm lowers"); }
tagIO(TM.cellsTag, "500,000,000 BRAIN CELLS tag");
{ const D = TM.dots; add(D.head[0], D.head[1] + D.fadeIn, "glow", 0.5, `${D.n} brain-cell dots light up in the head`);
  add(D.armFrom, D.armFrom + (D.groups - 1) * D.stagger + D.dur, "slide", 0.55, "most dots flow out along the arms");
  add(...D.out, "glow", 0.25, "brain-cell dots fade"); }
add(EV.solves, EV.solves + TM.pickup, "pickup", 0.8, "+SOLVE pickup");
add(...TM.wrap, "slide", 0.45, "two arms wrap around the jar");
add(...TM.twist, "twist", 0.6, `jar lid twists (${TM.twistTurns} turns, rotating thread lines)`);
add(...TM.lift, "pop", 0.8, "lid lifts off the jar");
add(...TM.crab, "squeak", 0.55, "crab in the jar perks up, eyes pop up");

// ---------------------------------------------------------------- shore (on screen only during the pan)
{ for (const [n, ph] of SHORE_T.waves) { const P = END / n; for (let m = 0; m <= n + 1; m++) { const t0 = (m - ph) * P, t1 = t0 + P; if (t1 > 0 && t0 < END && overlaps(t0, t1, shoreWin)) add(t0, t1, "splash", 0.4, `wave washes up the beach and back (period END/${n})`); } }
  const { n, ph } = SHORE_T.crab, ext = (m) => ((Math.PI / 2 + m * Math.PI - ph) / (2 * Math.PI * n)) * END;
  for (let m = -1; m <= 2 * n; m++) { const t0 = ext(m), t1 = ext(m + 1); if (t1 > 0 && t0 < END && overlaps(t0, t1, shoreWin)) add(t0, t1, "tick", 0.3, "shore crab scuttles sideways (one leg of its back-and-forth)"); }
}

// ---------------------------------------------------------------- the dive (wrapped column under the night city)
{ const [a, b, , fo] = TM.skullTag; tagIO(TM.skullTag, "300,000 YEARS tag"); add(a, b + fo, "glow", 0.4, "human skull fossil glow ring"); }
{ const [a, b, , fo] = TM.diveDinoTag; tagIO(TM.diveDinoTag, "DINOSAURS tag (dive)"); add(a, b + fo, "glow", 0.4, "dinosaur fossil glow outline (dive)"); }

export const MOTIONS = M.sort((p, q) => p.t0 - q.t0);
export const SHORE_ON_SCREEN = shoreWin;
