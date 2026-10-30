// «Holding jump makes gravity weaker» timeline: every event is anchored to a measured word of the single voice take
// (ElevenLabs alignment moved onto Scribe's word timings; voice/words-el.json keeps the original).
// Loop: "…So that button is really a gravity switch:" runs on into "In Super Mario Bros., holding jump makes gravity
// weaker." The voice ends at 49.17 s and starts at 0.07 s; END = 49.50 s gives a 0.40 s sentence pause.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1485 / FPS; // 49.50 s
const all = (text) => words.filter((w) => norm(w.text) === norm(text)).map((w) => w.start);
export const EV = {
  holding: W("holding"), jump1: W("jump"), gravity1: W("gravity"), weaker: W("weaker."), weakerEnd: W("weaker.", 1, "end"),
  but1: W("but"), only: W("only"), way: W("way"), upEnd: W("up.", 1, "end"),
  every: W("every"), standing: W("standing"), starts: W("starts"), same: W("same"), speedEnd: W("speed.", 1, "end"),
  button1: W("button"), doesnt: W("doesn't"), push: W("push"), higher: W("higher."), changes1: W("changes"), fast: W("fast"), gravity2: W("gravity", 2), slows: W("slows"), downEnd: W("down.", 1, "end"),
  while1: W("while"), hold: W("hold"), stays: W("stays"), weak: W("weak,"), keeps: W("keeps"), rising1: W("rising,"), four: W("four"), highEnd: W("high.", 1, "end"),
  let: W("let"), go: W("go"), early: W("early,"), gravity4: W("gravity", 4), more: W("more"), three: W("three"), stronger: W("stronger"), away: W("away."),
  stops: W("stops"), rising2: W("rising", 2), sooner: W("sooner."), soonerEnd: W("sooner.", 1, "end"),
  quick: W("quick"), tap: W("tap"), lifts: W("lifts"), two: W("two"), blocks2End: W("blocks", 2, "end"),
  thats: W("that's"), button2: W("button", 2), tiny: W("tiny"), hop: W("hop"), big: W("big"), jumpBigEnd: W("jump", 3, "end"),
  top1: W("top,"), strong: W("strong"), comes1: W("comes"), even: W("even"), keep: W("keep"), holdingEnd: W("holding", 2, "end"),
  goes: W("goes"), half: W("half"), second: W("second,"), but2: W("but", 2), comes2: W("comes", 2), third: W("third."), thirdEnd: W("third.", 1, "end"),
  running1: W("running"), changes2: W("changes", 2), checks: W("checks"), speed2: W("speed", 2), moment: W("moment"), leave: W("leave"), groundEnd: W("ground.", 1, "end"),
  running2: W("running", 2), launches: W("launches"), faster: W("faster"), five: W("five"), high2End: W("high.", 2, "end"),
  speeding: W("speeding"), air: W("air"), change: W("change"), itEnd: W("it", 3, "end"),
  so2: all("so")[1], button3: W("button", 3), really: W("really"), switch: W("switch:"), switchEnd: W("switch:", 1, "end"),
};
