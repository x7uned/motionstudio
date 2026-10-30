// «Why mosquitoes buzz right in your ear» — timeline: every event is anchored to a measured word of the single voice
// take. Loop film: the voice runs 0.08–45.65 s (waveform, −40 dBFS); END = 1381 frames = 46.033 s gives a 0.46 s seam
// pause (this take's sentence pauses are 0.44–0.63 s).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
VOICE.words[VOICE.words.length - 1].end = 45.65;   // the aligner stretched the last word
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1381 / FPS; // 46.033 s

export const EV = {
  whine0: W("whine", 1), ear0: W("ear", 1), love: W("love"), song: W("song."), songEnd: W("song.", 1, "end"), notFor: W("not", 1), you0End: W("you.", 1, "end"),
  every: W("every"), breathe: W("breathe"), out1: W("out,"), cloud: W("cloud"), carbon: W("carbon"), dioxide: W("dioxide."), dioxideEnd: W("dioxide.", 1, "end"),
  female: W("female"), follows: W("follows"), face1: W("face.", 1), face1End: W("face.", 1, "end"),
  night: W("night,"), only: W("only", 1), blanket: W("blanket."), blanketEnd: W("blanket.", 1, "end"),
  up: W("up"), close: W("close,"), warmth: W("warmth."), warmthEnd: W("warmth.", 1, "end"),
  now: W("now"), listen: W("listen."), listenEnd: W("listen.", 1, "end"),
  whine1: W("whine", 2), voice: W("voice."), wings: W("wings."), wingsEnd: W("wings.", 1, "end"),
  beat: W("beat"), five: W("five"), second: W("second,"), note1: W("note", 1), hear1End: W("hear.", 1, "end"),
  quiet: W("quiet"), right: W("right"), ear1: W("ear", 2), ear1End: W("ear", 2, "end"),
  circles: W("circles"), head: W("head,"), comes: W("comes"), goes: W("goes."), goesEnd: W("goes.", 1, "end"),
  note2: W("note", 2), meant: W("meant"), males: W("males."), malesEnd: W("males.", 1, "end"),
  male: W("male", 1), hears2: W("hears"), fluffy: W("fluffy"), antennae: W("antennae."), antennaeEnd: W("antennae.", 1, "end"),
  meet: W("meet,"), both: W("both"), change: W("change"), fit: W("fit"), together: W("together."), togetherEnd: W("together.", 1, "end"),
  so1: W("so", 3), singing: W("singing"), you1End: W("you", 6, "end"),
  whine2: W("whine", 3), suddenly: W("suddenly"), stops: W("stops,"), landed: W("landed."), landedEnd: W("landed.", 1, "end"),
  so2: W("so", 4), dark: W("dark,"), remember: W("remember:"),
};

// ---------------------------------------------------------------- the bedroom (world units of the frozen apartment kit)
// the hero lies in LAYOUT.bed, face up on the pillow; his ear and mouth (measured from person.mjs drawBedPose)
export const EAR = [-649, -124], MOUTH = [-635, -146], HEADC = [-650, -129];
// the mosquito's flight tone (B4, "about five hundred a second") and the love song: her 3rd harmonic meets his 2nd
export const TONE = { female: 493.88, maleStart: 718, male: 740.8, femaleStart: 503 };
