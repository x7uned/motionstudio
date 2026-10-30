// Sound-design cue list for LV7 bay, LV8 savanna, LV9 jungle: one entry per audible motion, { t0, t1, kind, level, note }
// (+ optional fields), computed from the SAME constants the level modules draw with, so every 8-bit sound can last
// exactly as long as its motion. Seconds on the film clock. No hard-coded times: everything comes from EV / the modules.
import { EV } from "../timeline.mjs";
import { ease } from "../cute.mjs";
import * as bay from "./bay.mjs";
import * as sav from "./savanna.mjs";
import * as jun from "./jungle.mjs";

const M = [];
const add = (level, t0, t1, kind, note, extra = {}) => M.push({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), kind, level, note, ...extra });
const span = (level, [t0, t1], kind, note, extra) => add(level, t0, t1, kind, note, extra);

// whistle pitch contour over the sound's own time: [k 0..1, pitch (relative, 1 = highest), amp]. The pen follows ease(k);
// pitch = the drawn wave's local frequency d(cycles)/du, amp = its drawn envelope (silent at both ends)
function contour() {
  const out = [], h = 1e-3, d = (u) => { u = Math.min(1 - h, Math.max(h, u)); return (bay.whistleCycles(u + h) - bay.whistleCycles(u - h)) / (2 * h); };
  let max = 0; for (let i = 0; i <= 100; i++) max = Math.max(max, d(i / 100));
  for (let i = 0; i <= 8; i++) { const k = i / 8, u = ease(k); out.push([+k.toFixed(3), +(d(u) / max).toFixed(2), +bay.whistleEnv(u).toFixed(2)]); }
  return out;
}
const WHISTLE = contour();

// ---------------------------------------------------------------- LV7 · bay
{
  const L = "bay", { T_APOP, T_BPOP, T_BDIVE, T_BBACK, T_BUP, T_LEAP, LEAP_D, POP_A, POP_B, DIVE_D, SWIM0, SWIM_D, B_LEAP_DELAY } = bay;
  add(L, T_APOP, T_APOP + POP_A, "rise", "dolphin A pops up out of the water under the sun");
  add(L, T_BPOP, T_BPOP + POP_A, "rise", "dolphin B (the friend) pops up beside A");
  const what = ["A breaks the surface", "B breaks the surface", "B dives under", "B comes back up", "A leaps out", "B leaps out", "A falls back in", "B falls back in"];
  bay.SPLASHES.forEach(([t0, who, size], i) => add(L, t0, t0 + bay.SPLASH_LIFE, "splash", `${what[i]} (size ${size}; foam crown first 0.45 s, droplets fall until the end)`));
  add(L, EV.whistle, EV.name, "whistle", "A's whistle = its name: the pink waveform draws itself left → right (pitch: mid, small dip, then sweeps up and stays high)", { contour: WHISTLE });
  add(L, EV.name, EV.name + bay.PICKUP_LIFE, "pickup", "+NAMES rises and dissolves");
  add(L, T_BDIVE, T_BDIVE + DIVE_D, "dive", "B sinks under the surface");
  add(L, T_BDIVE + SWIM0, T_BDIVE + SWIM0 + SWIM_D, "swim", "B swims away right underwater, behind the rocks, out of frame");
  add(L, bay.CAL.show, bay.CAL.show + bay.CAL.fadeIn, "pop", "tear-off calendar appears (YEAR 1)");
  bay.CAL.flips.forEach((f, k) => add(L, f, f + bay.CAL.flipDur, "flip", `page flip ${k + 1}/${bay.CAL.flips.length}: page ${bay.CAL.years[k]} flies off, ${bay.CAL.years[k + 1]} revealed`, { index: k }));
  add(L, bay.CAL.tag, bay.CAL.tag + bay.CAL.tagIn, "tag", "\"20 YEARS\" tag appears");
  add(L, T_BBACK, T_BUP, "swim", "B swims back in from the right underwater");
  add(L, T_BUP, T_BUP + POP_B, "rise", "B pops up again beside A");
  add(L, EV.apart, EV.apart + bay.WB_DRAW, "whistle", "B whistles A's name: the same waveform (cyan) draws itself above B", { contour: WHISTLE });
  add(L, EV.apart + bay.WB_SLIDE0, EV.apart + bay.WB_SLIDE0 + bay.WB_SLIDE, "slide", "B's waveform slides onto A's and matches it");
  add(L, bay.MATCH[0], bay.WA_OUT[1], "glow", "both waveforms glow white (match), then dissolve as the dolphins leap");
  add(L, bay.HEART[0], bay.HEART[0] + bay.HEART[1], "pop", "a pink heart pops between the friends and floats up");
  add(L, T_LEAP, T_LEAP + LEAP_D, "leap", "A leaps out of the water and falls back in");
  add(L, T_LEAP + B_LEAP_DELAY, T_LEAP + B_LEAP_DELAY + LEAP_D, "leap", "B leaps out of the water and falls back in");
}

// ---------------------------------------------------------------- LV8 · savanna
{
  const L = "savanna", S = sav.SPAN;
  span(L, S.twistPop, "pop", "\"!?\" pops up over the elephant (\"Then a twist:\")");
  span(L, S.tilt, "tilt", "the elephant tilts its head and back");
  span(L, S.brainE, "pop", "the elephant's brain appears with \"257 BILLION\"");
  span(L, S.dotsE, "sparkle", "257 cell dots light up one by one in the elephant brain");
  span(L, S.brainH, "pop", "our brain appears with \"86 BILLION\"");
  span(L, S.dotsH, "sparkle", "86 cell dots light up in our brain");
  span(L, S.times3, "tag", "\"3×\" tag appears between the brains");
  span(L, S.slide, "slide", "249 of the 257 dots slide into the cerebellum (staggered; our brain fades meanwhile)");
  span(L, S.glow, "glow", "the cerebellum glows full of cells");
  span(L, S.lines, "zap", "light lines run from the cerebellum into the trunk and the four legs");
  add(L, S.lines[1], S.linesOut[1], "buzz", "light pulses keep running along the lines until they dissolve");
  span(L, S.tag97, "tag", "\"97% OF THEM / MOVE ITS BODY\" tag appears");
  span(L, S.mirror, "shimmer", "a tall mirror appears by the watering hole (reflection inside)");
  span(L, S.mark, "dab", "a white mark appears on the elephant's forehead");
  span(L, S.turn, "turn", "the elephant turns its head and eyes to the mirror");
  span(L, S.touch, "trunk", "the trunk curls up and touches the mark (contact at the end); the reflection copies it");
  span(L, S.self, "pickup", "+SELF rises and dissolves");
  span(L, S.trunkDown, "trunk", "the trunk lowers again (camera already moving on)");
}

// ---------------------------------------------------------------- LV9 · jungle
{
  const L = "jungle", S = jun.SPAN;
  span(L, S.pull, "pull", "the chimp pulls the stick out of the termite mound");
  span(L, S.lift, "lift", "it lifts the stick with clinging termites up beside its face");
  span(L, S.grin, "grin", "big toothy grin, happy squinting eyes (\"can even beat us\")");
  span(L, S.munch, "munch", "the termites on the stick are eaten, one after another");
  span(L, S.drop, "drop", "the hand goes back down, the stick dissolves");
  span(L, S.screenOn, "power", "the touchscreen on the crate turns on");
  span(L, S.numbers, "blip", "numbers 1–9 flash at scattered places (\"young\")");
  span(L, S.squares, "flip", "the numbers turn into white squares");
  span(L, S.ayumu, "tag", "\"AYUMU\" name tag appears");
  span(L, S.reach, "reach", "the chimp's left arm reaches to the screen");
  jun.TAPS.forEach((tt, i) => add(L, tt + S.tapLight[0], tt + S.tapLight[1], "tap", `tap ${i + 1}/9: square ${i + 1} lights up (ripple ring until +${S.tapRing[1]} s)`, { pitch: i }));
  span(L, S.green, "chime", "all nine squares turn green (won)");
  span(L, S.armBack, "reach", "the arm goes back to rest");
  span(L, S.memory, "pickup", "+MEMORY rises and dissolves");
  span(L, S.question, "huh", "the student gets confused: \"?\" over his head, mouth \"o\"");
  span(L, S.numbers2, "blip", "second round for the student: numbers flash again");
  span(L, S.squares2, "flip", "they turn into squares");
  span(L, S.red, "buzz", "his wrong square turns red (error)");
  span(L, S.stamp, "stamp", "a red X stamps next to the student (shrinks into place)");
}

M.sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
export const MOTIONS = M;
