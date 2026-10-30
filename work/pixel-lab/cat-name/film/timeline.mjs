// «Your cat knows its name. It just ignores you.» — timeline: every event is anchored to a measured word of the single
// voice take. Loop film: the voice runs from 0.10 s to 54.23 s (waveform, −40 dBFS); END = 1638 frames = 54.6 s gives a
// 0.47 s seam pause (this take's sentence pauses are 0.33–0.59 s).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
// the aligner stretched the last word; the waveform shows the voice ending at 54.23 s
VOICE.words[VOICE.words.length - 1].end = 54.23;
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1638 / FPS; // 54.6 s

export const EV = {
  // hook
  knows: W("knows"), name1: W("name.", 1), name1End: W("name.", 1, "end"), ignores: W("ignores"), you1End: W("you.", 1, "end"),
  // 2019 study
  y2019: W("twenty"), scientists: W("scientists"), tokyo: W("tokyo"), tested: W("tested"), cats77: W("seventy-seven"), cats1End: W("cats.", 1, "end"),
  hidden: W("hidden"), speaker1: W("speaker", 1), played1: W("played", 1), four: W("four"), words1: W("words,"), words1End: W("words,", 1, "end"),
  same: W("same", 1), rhythm: W("rhythm"), catsName: W("cat's"), name2End: W("name", 2, "end"),
  every: W("every"), ears1: W("ears", 1), little: W("little"), less: W("less."), lessEnd: W("less.", 1, "end"),
  bored: W("bored."), boredEnd: W("bored.", 1, "end"),
  then1: W("then", 1), speaker2: W("speaker", 2), said: W("said"), itsName: W("name", 3), ears2: W("ears", 2), head1: W("head"), turned1: W("turned", 1), again: W("again."), againEnd: W("again.", 1, "end"),
  so1: W("so", 1), tell: W("tell"), other: W("other"), words2End: W("words", 2, "end"),
  even: W("even"), stranger: W("stranger's"), voice: W("voice."), voiceEnd: W("voice.", 1, "end"),
  look: W("look"), did: W("did."), didEnd: W("did.", 1, "end"),
  most1: W("most", 1), ears3: W("ears", 3), head2: W("head", 2), head2End: W("head", 2, "end"),
  few: W("few"), meowed: W("meowed"), tail: W("tail,"), most2: W("most", 2), single: W("single"), step: W("step."), stepEnd: W("step.", 1, "end"),
  years: W("years"), team: W("team"), three: W("three"), strangers: W("strangers"), calling: W("calling"), name3End: W("name", 5, "end"),
  owner1: W("owner.", 1), owner1End: W("owner.", 1, "end"), perked: W("perked"), owner2: W("owner.", 2), owner2End: W("owner.", 2, "end"),
  still: W("still"), turned2: W("turned", 2), heads: W("heads."), headsEnd: W("heads.", 1, "end"),
  think: W("think"), dogs: W("dogs,"), never: W("never"), bred: W("bred"), obey: W("obey"), usEnd: W("us.", 1, "end"),
  answer: W("answer"), want: W("want"), toEnd: W("to", 2, "end"),
  so2: W("so", 2), deaf: W("deaf,"), confused: W("confused."), confusedEnd: W("confused.", 1, "end"),
  heard: W("heard"), you2End: W("you.", 2, "end"),
  and3: W("and", 6), one: W("one"), ear: W("ear"), tells: W("tells"), truth: W("truth:"),
};

// ---------------------------------------------------------------- the words played by the hidden speaker
// (illustrative English nouns with the cat's rhythm: two syllables, stress on the first, like MI·LO)
export const CALLS = [
  { t: EV.four + 0.05, text: "PILLOW", resp: 1.0 },
  { t: EV.same - 0.05, text: "WINDOW", resp: 0.68 },
  { t: EV.every - 0.02, text: "BUTTER", resp: 0.42 },
  { t: EV.little - 0.05, text: "TABLE", resp: 0.22 },
  { t: EV.said - 0.1, text: "MILO", resp: 0.95, name: true },
  // 2019 experiment 4: a stranger's voice
  { t: EV.stranger - 0.05, text: "MILO", resp: 0.8, name: true, who: "stranger" },
  // 2013: three strangers call the name, then the owner
  { t: EV.three - 0.05, text: "MILO", resp: 0.7, who: "stranger" },
  { t: EV.strangers + 0.2, text: "MILO", resp: 0.45, who: "stranger" },
  { t: EV.calling + 0.15, text: "MILO", resp: 0.25, who: "stranger" },
  { t: EV.owner1 - 0.05, text: "MILO!", resp: 1.0, who: "owner" },
];
export const BUBBLE_LIFE = 1.15;   // seconds a speaker bubble stays (in, hold, out)
