// «Pac-Man level 256» timeline: every event is anchored to a measured word of the single voice take.
// Loop film: "…So the only ending Pac-Man has is a bug. Funny, because" runs on into "Pac-Man has no last level. Yet
// level 256 breaks the screen in half." The seam pause is short (one phrase), and the picture lands on the first frame.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = Math.round((W("because", 1, "end") + 0.17) * FPS) / FPS;
export const EV = {
  no: W("no"), last: W("last"), yet: W("yet"), l256: W("256"), breaks: W("breaks"), half: W("half."), halfEnd: W("half.", 1, "end"),
  keeps: W("keeps"), byte: W("byte,"), tiny: W("tiny"), box: W("box"), from0: W("0"), to255: W("255."), to255End: W("255.", 1, "end"),
  stored: W("stored"), as0: W("0,", 2), so: W("so"), l256b: W("256", 2), is255: W("255,", 2), biggest: W("biggest"), fits: W("fits."), fitsEnd: W("fits.", 1, "end"),
  each: W("each"), draws: W("draws"), fruit: W("fruit"), bottom: W("bottom"), screen: W("screen.", 2), screenEnd: W("screen.", 2, "end"),
  count: W("count"), adds: W("adds"), one: W("one", 3), level3: W("level.", 7), levelEnd: W("level.", 7, "end"),
  on256: W("256,", 3), gives: W("gives"), n255: W("255", 3), plus: W("plus"), oneB: W("one,", 4), byteB: W("byte,", 2), zero: W("zero."), zeroEnd: W("zero.", 1, "end"),
  counter: W("counter"), starts: W("starts"), atZero: W("zero,", 2), loop: W("loop"), runs: W("runs"), n256: W("256", 4), times: W("times"), instead: W("instead"), seven: W("seven"), most: W("most."), mostEnd: W("most.", 1, "end"),
  runs2: W("runs", 2), past: W("past"), pictures: W("pictures"), draws2: W("draws", 2), memory: W("memory"), pictures2: W("pictures:", 2), letters: W("letters,"), numbers: W("numbers", 2), broken: W("broken"),
  right: W("right"), maze: W("maze."), mazeEnd: W("maze.", 1, "end"),
  side: W("side,"), walls: W("walls"), stop: W("stop"), dots: W("dots"), missing: W("missing."), missingEnd: W("missing.", 1, "end"),
  need: W("need"), n244: W("244"), finish: W("finish"), here: W("here"), eat: W("eat"), n168: W("168"), most2: W("most.", 3), most2End: W("most.", 3, "end"),
  ghosts: W("ghosts"), catch: W("catch"), you: W("you,", 3), over: W("over.", 2), overEnd: W("over.", 2, "end"),
  highest: W("highest"), score: W("score"), n3m: W("3,333,360."), n3mEnd: W("3,333,360.", 1, "end"),
  first: W("first"), perfect: W("perfect"), y1999: W("1999,"), took: W("took"), six: W("six"), hours: W("hours."), hoursEnd: W("hours.", 1, "end"),
  ending: W("ending"), pacman2: W("pac-man", 2), bug: W("bug."), bugEnd: W("bug.", 1, "end"), funny: W("funny,"), because: W("because"),
};
