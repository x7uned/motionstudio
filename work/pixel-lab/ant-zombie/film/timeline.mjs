// «Zombie ants» (Halloween) timeline: every event is anchored to a measured word of the single voice take.
// Loop film: the last words "Give it a few days, and" run on into the first "this ant is a zombie…", so the seam pause
// is a short in-sentence pause, and the camera lands on the exact first frame (the next ant on the path, a spore on it).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = Math.round((Math.min(W("and", lastAnd(), "end"), VOICE.duration) + 0.12) * FPS) / FPS;
function lastAnd() { let k = 0; for (const w of words) if (norm(w.text) === "and") k++; return k; }

export const EV = {
  ant0: W("ant"), zombie: W("zombie"), fungus0: W("fungus"), never0: W("never"), touches: W("touches"), brain0: W("brain"), brain0End: W("brain", 1, "end"),
  starts: W("starts"), one: W("one"), spore1: W("spore"), tiny: W("tiny"), seed: W("seed"), seedEnd: W("seed", 1, "end"),
  lands1: W("lands"), ant2: W("ant", 2), rainforest: W("rainforest"), grows1: W("grows"), shell: W("shell"), shellEnd: W("shell", 1, "end"),
  forDays: W("for"), days1: W("days"), acts: W("acts"), normal: W("normal"), normalEnd: W("normal", 1, "end"),
  then: W("then"), leaves1: W("leaves"), nest: W("nest"), high: W("high"), trees: W("trees"), shakes: W("shakes"), falls: W("falls"), forest: W("forest"), floor: W("floor"), floorEnd: W("floor", 1, "end"),
  climbs: W("climbs"), small: W("small"), plant: W("plant"), about: W("about"), twentyfive: W("twenty-five"), cm: W("centimeters"), up: W("up"), where: W("where"), air: W("air"), warm: W("warm"), wet: W("wet"), wetEnd: W("wet", 1, "end"),
  right: W("right"), around: W("around"), noon: W("noon"), bites: W("bites"), bottom: W("bottom"), leaf: W("leaf"), never2: W("never", 2), lets: W("lets"), go: W("go"), goEnd: W("go", 1, "end"),
  inside: W("inside", 2), fungus3: W("fungus", 3), wrapped: W("wrapped"), muscles: W("muscles"), all: W("all"), body: W("body"), bodyEnd: W("body", 1, "end"),
  y2017: W("2017"), scientists: W("scientists"), looked: W("looked"), closer: W("closer"), fungus4: W("fungus", 4), everywhere: W("everywhere"), but1: W("but"), not: W("not"), brain2: W("brain", 2), brain2End: W("brain", 2, "end"),
  how: W("how"), controls: W("controls"), still: W("still"), mystery: W("mystery"), mysteryEnd: W("mystery", 1, "end"),
  dies: W("dies"), diesEnd: W("dies", 1, "end"), few1: W("few"), days2: W("days", 2), later: W("later"), stalk: W("stalk"), grows2: W("grows", 2), head: W("head"), rains: W("rains"), spores: W("spores"), path1: W("path"), below1: W("below"), below1End: W("below", 1, "end"),
  bite: W("bite"), marks: W("marks"), found: W("found"), fossil: W("fossil"), leaves2: W("leaves", 2), fortyeight: W("forty-eight"), million: W("million"), years: W("years"), old: W("old"), oldEnd: W("old", 1, "end"),
  fungus5: W("fungus", 5), inspired: W("inspired"), last: W("last"), us: W("us"), usEnd: W("us", 1, "end"), but2: W("but", 2), game: W("game"), takes: W("takes"), brain3: W("brain", 3), brain3End: W("brain", 3, "end"),
  cant: W("can't"), grow: W("grow"), people: W("people"), were: W("we're"), hot: W("hot"),
  on2: W("on", 4), path2: W("path", 2), below2: W("below", 2), spore2: W("spore", 2), lands2: W("lands", 2), next: W("next"), ant6: W("ant", 6), ant6End: W("ant", 6, "end"),
  give: W("give"), few2: W("few", 2), days3: W("days", 3), andLast: W("and", lastAnd()),
};
EV.hotEnd = W("hot") + 0.6;
