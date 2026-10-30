// «How to say "I love you" in cat» — timeline: every event is anchored to a measured word of the single voice take.
// Loop film: the voice runs from 0.10 s to 45.09 s; END = 1363 frames = 45.433 s gives a 0.44 s seam pause.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
// the aligner stretched the last word to the end of the file; the waveform shows the voice ending at 45.09 s
VOICE.words[VOICE.words.length - 1].end = 45.09;
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1363 / FPS; // 45.433 s

export const EV = {
  i1: W("i", 1), love: W("love"), you1: W("you", 1), eyes1: W("eyes", 1), eyes1End: W("eyes", 1, "end"), miss: W("miss"), missEnd: W("it", 1, "end"),
  watch: W("watch"), trusts: W("trusts"), looks1: W("looks", 1), slowly1: W("slowly", 1), narrows: W("narrows"), closes: W("closes"), moment: W("moment"), momentEnd: W("moment", 1, "end"),
  slow: W("slow"), blink: W("blink"), blinkEnd: W("blink", 1, "end"),
  cats1: W("cats", 1), long: W("long"), hard: W("hard"), stare: W("stare"), threat: W("threat"), threatEnd: W("threat", 1, "end"),
  closing: W("closing"), means: W("means"), safe: W("safe"), safeEnd: W("you", 5, "end"),
  y2020: W("2020"), scientists: W("scientists"), uk: W("uk"), tested: W("tested"), testedEnd: W("it", 3, "end"),
  owners: W("owners"), slowBlinked: W("slow-blinked"), blinkedBack1: W("blinked", 1), back1End: W("back", 1, "end"),
  stranger1: W("stranger", 1), tried: W("tried"), blinked2: W("blinked", 2), stranger2: W("stranger", 2), too1: W("too", 1),
  likely: W("likely"), walk: W("walk"), hand: W("hand"), handEnd: W("hand", 1, "end"),
  want: W("want"), try: W("try"), tryEnd: W("try", 1, "end"), soft: W("soft"), eyes4: W("eyes", 4), relaxed: W("relaxed"), smile: W("smile"), smileEnd: W("smile", 1, "end"),
  slowly2: W("slowly", 2), close2: W("close"), second: W("second"), two: W("two"), open: W("open"), openEnd: W("them", 2, "end"),
  if: W("if"), blinksBack: W("blinks"), back3: W("back", 3), said: W("said"), too2: W("too", 2), too2End: W("too", 2, "end"),
  so: W("so"), looks2: W("looks", 2), this: W("this"), remember: W("remember"),
};
export const loopTau = (t) => (t > END - 3 ? t - END : t);
