// «Your Duck Hunt gun never fired a single shot» timeline: every event is anchored to a measured word of the single
// voice take (ElevenLabs alignment moved onto Scribe's word timings; voice/words-el.json keeps the original).
// Loop: "…So the old Zapper misses every time, because" runs on into "Your Duck Hunt gun never fired a single shot."
// The voice ends at 52.17 s and starts at 0.08 s; END = 52.50 s gives a 0.41 s sentence pause.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1575 / FPS; // 52.50 s

export const EV = {
  gun: W("gun"), never: W("never"), fired: W("fired"), single: W("single"), shotEnd: W("shot.", 1, "end"),
  only: W("only"), looks: W("looks"), screenEnd: W("screen.", 1, "end"),
  inside: W("inside"), barrel: W("barrel,"), lens: W("lens"), aims: W("aims"), tiny: W("tiny"), light1: W("light"), sensor1: W("sensor"), spot: W("spot"), tvEnd: W("tv.", 1, "end"),
  when: W("when"), pull: W("pull"), trigger: W("trigger,"), whole1: W("whole"), screen2: W("screen", 2), black1: W("black"), oneFrame: W("frame", 1), frameEnd: W("frame", 1, "end"),
  next: W("next"), frame2: W("frame", 2), white1: W("white"), box1: W("box"), appears: W("appears"), duck1: W("duck", 2), everything: W("everything"), stays: W("stays"), black2: W("black", 2), black2End: W("black", 2, "end"),
  if1: W("if"), sensor2: W("sensor", 2), sees: W("sees"), white2: W("white", 2), box2: W("box", 2), hit1: W("hit"), duck2: W("duck", 3), duck2End: W("duck", 3, "end"),
  two: W("two"), ducks: W("ducks,"), each: W("each"), flashes: W("flashes"), own: W("own"), frame3: W("frame", 3), timing: W("timing"), tells: W("tells"), which: W("which"), duck3: W("duck", 4), hit2: W("hit", 2), hit2End: W("hit", 2, "end"),
  whole2: W("whole", 2), test: W("test"), less: W("less"), tenth: W("tenth"), secondEnd: W("second.", 1, "end"),
  why: W("why"), black3: W("black", 3), first: W("first?"), catch: W("catch"), cheaters: W("cheaters."), cheatersEnd: W("cheaters.", 1, "end"),
  old1: W("old"), tube: W("tube"), draw: W("draw"), picture1: W("picture"), lineAt: W("line"), time1: W("time,"), nearly: W("nearly"), sixteen: W("sixteen"), lines: W("lines"), second2: W("second", 2),
  gun2: W("gun", 2), reacts: W("reacts"), fast: W("fast"), flicker1: W("flicker."), flicker1End: W("flicker.", 1, "end"),
  lamps: W("lamp's"), steady: W("steady"), nothing: W("nothing."), nothingEnd: W("nothing.", 1, "end"),
  and2: W("and", 2), and3: W("and", 3), any: W("any"), shows: W("shows"), while1: W("while"), black4: W("black", 4), calls: W("calls"), miss: W("miss."), missEnd: W("miss.", 1, "end"),
  modern: W("modern"), flat: W("flat"), dont: W("don't"), flicker2: W("flicker", 2), byLine: W("by"), show: W("show"), picture2: W("picture", 2), late: W("late."), lateEnd: W("late.", 1, "end"),
  zapper: W("zapper"), misses: W("misses"), every: W("every"), time2: W("time", 2), because: W("because"), becauseEnd: W("because", 1, "end"),
};
