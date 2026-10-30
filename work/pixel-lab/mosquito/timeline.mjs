// Mosquito film timeline: every event, camera key and the mosquito's flight are anchored to measured words of the single voice take.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = words[words.length - 1].end;
// the in-world ending (SEND → SENT ✓, the paper plane lands with the mosquito on it) runs ~3 s past the last word
export const END = Math.ceil((VOICE_END + 3.0) * FPS) / FPS;

// world layout (side view, ground y = 0, deck top y = -12; x grows to the right)
export const POS = { L: -80, R: 0, deck: -12, seat: -34, bite: [27, -52.6], landing: [36, -52.6], lantern: 105, flowers: 160, bucket: 212, can: 262, mailbox: 340, calendar: [-125, -150] };

export const EV = {
  // opening: she is already flying in, lands, bites, the bump swells, she lifts off, he scratches
  land1: 0.95, bump: [W("bite") - 0.05, W("bite") + 0.65], lift1: 2.15, scratch1: [2.3, 3.5], notbad: W("not"),
  labtest: W("in"), oneperson: W("one", 2), stack: [W("one", 2) + 0.1, W("times") + 0.35], x100: W("times"), least: W("least."),
  diveIn: [8.65, 9.95], female: W("females"), male: [W("only") + 0.15, W("they", 3) + 0.9], protein: W("protein"), blood: W("blood"), eggs: W("eggs."),
  diveOut: [12.6, 14.4], chips: W("choose"), awayStart: 12.85,
  breath: W("breath."), exhales: [W("breath.") + 0.15, W("breathe"), W("breathe") + 2.0, W("breathe") + 4.0], exhalesL: [W("breathe") + 1.0, W("breathe") + 3.0],
  co2: W("carbon"), follow: [W("follows") - 0.6, W("that") + 0.1],
  vision: [W("switches"), W("eyes.") + 0.25], visionOut: [W("final") - 0.1, W("smell.") - 0.15], eyes: W("eyes."),
  red: W("red"), orange: W("orange,"), skin: W("skin"), green: W("green,"), blue: W("blue"), purple: W("purple."),
  heat: W("feels"), up: W("up"), ignores: W("ignores"),
  smell: W("smell."), macroIn: [W("smell.") - 0.3, W("smell.") + 0.45], macroOut: [W("the", 6) - 0.25, W("the", 6) + 0.35],
  lab: W("scientists"), york: W("new"), n64: [W("sixty-four"), W("sixty-four") + 0.8], nylon: W("nylon"), sleeve: [W("nylon"), W("sleeves.") + 0.45],
  favorites: W("favorites"), much: W("much"), acids: W("fatty"),
  years: W("three", 2), flips: [W("three", 2) + 0.2, W("later,") + 0.15], still: W("still"),
  land2: [W("so") - 0.6, W("isn't") + 0.2], notblood: W("blood.", 2), yourskin: W("skin.", 3),
  phoneUp: [W("skin.", 3) + 0.5, W("send") + 0.15], ui: [W("send"), W("send") + 0.4], press: W("bitten") - 0.05, sent: W("bitten") + 0.05,
  fly: [W("bitten") + 0.15, W("first.", 3, "end") + 0.55], scratch2: [W("send") - 0.2, 99], hop: [W("first.", 3, "end") + 0.45, W("first.", 3, "end") + 1.05],
};

// The mosquito is drawn 1.8× larger than the world scale (an illustration, not to scale); landing offsets use the same factor.
export const BUGK = 1.8;
// Camera keys {t, cx, cy, z}: screen = (270 + (wx - cx)·z, 420 + (wy - cy)·z). Eased between keys, zoom in log space.
const TWO = { cx: -40, cy: -122, z: 2.0 }, WIDE = { cx: 130, cy: -191, z: 1.15 };
export const MOSQ_MACRO = [49, -101];
export const CAM = [
  { t: 0, cx: 24, cy: -70, z: 4.4 }, { t: 2.2, cx: 22, cy: -70, z: 4.2 }, { t: 3.7, cx: -34, cy: -112, z: 2.3 }, { t: 4.6, ...TWO }, { t: EV.diveIn[0], ...TWO },
  { t: EV.diveIn[1], cx: MOSQ_MACRO[0], cy: MOSQ_MACRO[1], z: 12 }, { t: EV.diveOut[0], cx: MOSQ_MACRO[0], cy: MOSQ_MACRO[1], z: 12 },
  { t: EV.diveOut[1], ...WIDE }, { t: W("ignores") - 0.25, ...WIDE }, { t: EV.green - 0.1, cx: 232, cy: -133, z: 1.5 }, { t: EV.purple + 0.3, cx: 190, cy: -133, z: 1.5 },
  { t: EV.heat + 0.2, cx: 20, cy: -88, z: 2.6 }, { t: EV.macroIn[0] - 0.55, cx: 20, cy: -88, z: 2.6 },
  { t: EV.macroIn[1], cx: 31, cy: -52, z: 10 }, { t: EV.macroOut[0], cx: 31, cy: -52, z: 10 },
  { t: EV.macroOut[1] + 0.7, ...TWO }, { t: EV.land2[0] - 0.2, ...TWO },
  { t: EV.land2[1] + 0.3, cx: 14, cy: -85, z: 3.0 }, { t: EV.yourskin + 0.25, cx: 14, cy: -85, z: 3.0 },
  { t: EV.phoneUp[1] + 0.1, cx: -36, cy: -117, z: 2.1 }, { t: EV.fly[1] + 0.2, cx: -36, cy: -117, z: 2.1 },
  // final beat: a slow push-in to R scratching the bite, the plane on his hand and the mosquito sitting on it
  { t: END - 0.3, cx: 30, cy: -80, z: 4.0 }, { t: 99, cx: 30, cy: -80, z: 4.0 },
];
