// «A casino doesn't need to cheat you» timeline: every beat is anchored to a measured word of the single voice take
// (voice/words.json = ElevenLabs alignment moved onto Scribe's word timings by shared/retime.mjs; words-el.json = original).
// Not a loop: the film ends on the follow card over the roulette table, holding ~0.85 s after the last word.
// Harness: frozen copy of pal-50hz/film/timeline.mjs.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("green", 2), W("win", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  cheat: W("cheat"), one1: W("one"), green1: W("green"), number: W("number"), does1: W("does"), work: W("work"), workEnd: W("work", 1, "end"),
  roulette: W("roulette"), wheel: W("wheel"), n37: W("thirty-seven"), n37End: W("thirty-seven", 1, "end"), numbers: W("numbers"),
  but1: W("but"), win1: W("win"), pays: W("pays"), only1: W("only"), n36: W("thirty-six"), n36End: W("thirty-six", 1, "end"),
  that1: W("that"), green2: W("green", 2), zero: W("zero"), belongs: W("belongs"), casino2: W("casino", 2),
  its: W("it's"), tiny1: W("tiny"), gap1: W("gap"), cents: W("cents"), every1: W("every"), bet1: W("bet"), bet1End: W("bet", 1, "end"),
  tonight: W("tonight"), still: W("still"), win2: W("win", 2), someone: W("someone"), table: W("table"), usually: W("usually"), does2End: W("does", 2, "end"),
  but2: W("but", 2), casino3: W("casino", 3), playing: W("playing"), game: W("game"), plays: W("plays"), millions: W("millions"), games1: W("games"), every2: W("every", 2), day: W("day"), dayEnd: W("day", 1, "end"),
  over: W("over"), many: W("many"), luck: W("luck"), evens: W("evens"), out: W("out"), only2: W("only", 2), tiny2: W("tiny", 2), gap2: W("gap", 2), left: W("left"), leftEnd: W("left", 1, "end"),
  your: W("your"), line1: W("line"), jumps: W("jumps"), up1: W("up"), down: W("down"), downEnd: W("down", 1, "end"),
  casinos: W("casino's"), line2: W("line", 2), goes: W("goes"), up2: W("up", 2), up2End: W("up", 2, "end"),
  doubling: W("doubling"), bet2: W("bet", 2), loss: W("loss"), doesnt2: W("doesn't", 2), save: W("save"),
  lose1: W("lose"), times: W("times"), row: W("row"), betting: W("betting"), fortune: W("fortune"), win3: W("win", 3), back: W("back"), one3: W("one", 3), chip: W("chip"), chipEnd: W("chip", 1, "end"),
  a_casino4: W("casino", 4), lose2: W("lose", 2), night: W("night"), even: W("even"), month: W("month"), monthEnd: W("month", 1, "end"),
  almost: W("almost"), never: W("never"), loses: W("loses"), year: W("year"), yearEnd: W("year", 1, "end"),
  follow: W("follow"), miss: W("miss"), next: W("next"), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- beats (film seconds)
/** Spin 1: already flying at frame 0, drops on "one little", settles in the green 0 on "green". */
export const SPIN1 = { t0: -1.5, tDrop: EV.one1 - 0.55, tLand: EV.green1 + 0.1, from: 26, to: 0, turns: 4 };
/** Spin 2: the dealer flicks the ball on "tiny gap", it settles on the hero's 17 on "win". */
export const SPIN2 = { t0: EV.gap1 - 0.2, tDrop: EV.tonight - 0.35, tLand: EV.win2 + 0.06, from: 0, to: 17, turns: 6 };
export const SWEEP1 = { t0: EV.does1 - 0.1, dur: 0.75, stagger: 0.09 };                   // the losing chips glide to the bank
export const CHASE = { t0: EV.roulette - 0.05, t1: EV.n37 + 0.35, out: EV.numbers + 0.5 };   // the light runs round all 37 pockets
export const B37 = { in: EV.n37 - 0.12, left: EV.pays - 0.1, out: EV.that1 - 0.25 };        // badge «37»; slides left on "pays"
export const B36 = { in: EV.only1 - 0.15, neq: EV.n36 + 0.25, out: EV.that1 - 0.25 };      // badge «36» + «≠»
export const DIM0 = { in: EV.n36 - 0.05, out: EV.green2 - 0.1 };                           // the zero dims "as if it isn't there"
export const THREAD = { in: EV.zero, full: EV.belongs + 0.25, bank: EV.casino2 - 0.05, out: EV.tonight - 0.3 };
export const BETS2 = { in: EV.casino2 + 0.45, dur: 0.55 };                                 // new bets slide in from the players
export const CENTS = { t0: EV.cents - 0.12, stagger: 0.16, dur: 0.55 };                     // a coin from every bet flies to the bank
export const WIN = { land: SPIN2.tLand, cheer: EV.win2 + 0.08, pay0: EV.win2 + 0.35, pay1: EV.someone + 0.45, clap: EV.someone - 0.05, lose0: EV.win2 + 0.4, end: EV.but2 - 0.1 };
export const PULL = { t0: EV.but2 - 0.05, t1: EV.day + 0.1 };                               // the pull-back over the whole floor
export const SPARK = { t0: EV.millions - 0.05, t1: EV.dayEnd + 0.3 };                        // wins twinkle everywhere
export const CHART = { in: EV.over - 0.2, draw0: EV.over - 0.05, draw1: EV.many + 0.45, merge0: EV.luck - 0.05, merge1: EV.out + 0.2, gap: EV.gap2 - 0.05, clear0: EV.leftEnd + 0.15, clear1: EV.your - 0.05,
  you0: EV.line1 - 0.05, you1: EV.downEnd + 0.05, cas0: EV.casinos - 0.02, cas1: EV.up2End - 0.05, out: EV.doubling - 0.55 };
export const TOWER = { cam0: EV.up2End - 0.25, cam1: EV.doubling + 0.55, steps: [[EV.bet2 - 0.05, 1], [EV.doesnt2, 2], [EV.lose1, 4], [EV.times - 0.02, 8], [EV.row - 0.02, 16], [EV.betting - 0.02, 32], [EV.fortune, 64]],
  losses: [EV.loss + 0.05, EV.save, EV.lose1 + 0.25, EV.times + 0.18, EV.row + 0.12, EV.betting + 0.25], wobble: EV.fortune + 0.3, one: EV.win3 - 0.05, plus: EV.one3 - 0.05, out: EV.a_casino4 - 0.35 };
export const CAL = { in: EV.a_casino4 - 0.3, night: EV.night - 0.02, month: EV.month - 0.02, fill0: EV.almost - 0.1, fill1: EV.loses + 0.1, year: EV.year - 0.04, out: EV.follow - 0.25 };

// ---------------------------------------------------------------- camera keys [t0, t1, cam] (eased dolly between keys)
const close = { tx: 0, ty: 76, tz: -100, D: 330, pitch: 0.72, sy0: 405 };
export const CAM = [
  [0, 0, close],
  [0.2, 9.6, { ...close, D: 300 }],
  [EV.n36End - 0.1, EV.zero + 0.1, { tx: 0, ty: 92, tz: -150, D: 560, pitch: 0.7, sy0: 400 }],
  [EV.casino2 + 0.1, EV.tiny1 + 0.4, { tx: -10, ty: 60, tz: -60, D: 600, pitch: 0.7, sy0: 390 }],
  [EV.tonight - 0.3, EV.still + 0.2, { tx: -25, ty: 70, tz: -20, D: 590, pitch: 0.66, sy0: 385 }],
  [PULL.t0, PULL.t1, { tx: 0, ty: 0, tz: -430, D: 2900, pitch: 0.68, sy0: 400 }],
  [PULL.t1 + 0.4, TOWER.cam0, { tx: 0, ty: 0, tz: -300, D: 2650, pitch: 0.7, sy0: 400 }],
  [TOWER.cam0, TOWER.cam1, { tx: -62, ty: 140, tz: 74, D: 370, pitch: 0.55, sy0: 410 }],
  [TOWER.out - 0.2, CAL.in + 0.9, { tx: 0, ty: 70, tz: -60, D: 760, pitch: 0.7, sy0: 400 }],
  [CAL.out, END, { tx: 0, ty: 70, tz: -80, D: 700, pitch: 0.7, sy0: 430 }],
];
