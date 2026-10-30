// «A chatbot built inside Minecraft» timeline: every event is anchored to a measured word of the single voice take.
// Loop film: the last words "So type your question, press enter, and wait, because" run on into the first "this chatbot
// is built inside Minecraft…", so the seam pause is a short in-sentence pause, and the camera lands on the first frame.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
// seam: the voice ends at W("because").end; the first word starts at 0.08 s; an in-sentence gap of ~0.2 s in total
export const END = Math.round((Math.min(W("because", 1, "end"), VOICE.duration) + 0.12) * FPS) / FPS;

export const EV = {
  this0: W("this"), chatbot0: W("chatbot"), minecraft0: W("minecraft"), one0: W("one"), answer0: W("answer"), takes0: W("takes"), two0: W("two"), hours0: W("hours"), hours0End: W("hours", 1, "end"),
  player: W("player"), sammy: W("sammyuri"), made: W("made"), y2025: W("2025"), out: W("out"), redstone: W("redstone"), with: W("with"), no: W("no"), command: W("command"), blocks0: W("blocks"), blocks0End: W("blocks", 1, "end"),
  chatbot1: W("chatbot", 2), doesnt: W("doesn't"), think: W("think"), sentences: W("sentences"), sentencesEnd: W("sentences", 1, "end"),
  only: W("only"), guesses: W("guesses"), next: W("next"), token1: W("token"), small: W("small"), piece: W("piece"), word: W("word"), wordEnd: W("word", 1, "end"),
  then: W("then"), guesses2: W("guesses", 2), again1: W("again"), and1: W("and", 2), again2: W("again", 2), again2End: W("again", 2, "end"),
  every: W("every"), guess: W("guess"), math: W("math"), five1: W("five"), million1: W("million"), numbers1: W("numbers"), numbers1End: W("numbers", 1, "end"),
  those: W("those"), learned: W("learned"), normal: W("normal"), computer: W("computer"), thenBuilt: W("then", 2), built2: W("built", 2), world: W("world"), blocks2: W("blocks", 2), blocks2End: W("blocks", 2, "end"),
  most: W("most"), eight: W("eight"), onoff: W("on-off"), bits: W("bits"), bitsEnd: W("bits", 1, "end"),
  you: W("you"), type1: W("type"), question1: W("question"), question1End: W("question", 1, "end"),
  each: W("each"), token2: W("token", 2), turns: W("turns"), list1: W("list"), twoH: W("two", 2), hundred: W("hundred"), forty1: W("forty"), numbers3: W("numbers", 3), numbers3End: W("numbers", 3, "end"),
  theList: W("the", 3), list2: W("list", 2), goes: W("goes"), through: W("through"), six: W("six"), layers: W("layers"), mix: W("mix"), mixEnd: W("it", 4, "end"),
  thats: W("that's"), about: W("about"), five2: W("five", 2), million2: W("million", 2), mults: W("multiplications"), single: W("single"), token3: W("token", 3), token3End: W("token", 3, "end"),
  atEnd: W("at"), end: W("end"), machine: W("machine"), picks: W("picks"), next2: W("next", 2), token4: W("token", 4), prints: W("prints"), screen: W("screen"), starts: W("starts"), over1: W("over"), over1End: W("over", 1, "end"),
  hold: W("hold"), sixtyfour: W("sixty-four"), tokens: W("tokens"), once1: W("once"), once1End: W("once", 1, "end"),
  whole: W("whole"), build: W("build", 1), kilometer: W("kilometer"), long: W("long"), tooBig: W("too"), game: W("game"), show: W("show"), once2: W("once", 2), once2End: W("once", 2, "end"),
  minecraft2: W("minecraft", 2), moves: W("moves"), twenty: W("twenty"), steps: W("steps"), second: W("second"), secondEnd: W("second", 1, "end"),
  atThat: W("at", 4), speed: W("speed"), one2: W("one", 2), answer2: W("answer", 2), ten: W("ten"), years: W("years"), yearsEnd: W("years", 1, "end"),
  special: W("special"), server: W("server"), forty2: W("forty", 2), thousand: W("thousand"), faster: W("faster"), still: W("still"), two3: W("two", 3), hours2: W("hours", 2), hours2End: W("hours", 2, "end"),
  sometimes: W("sometimes"), answer3: W("answer", 3), nonsense: W("nonsense"), nonsenseEnd: W("nonsense", 1, "end"),
  so: W("so"), type2: W("type", 2), your: W("your"), question2: W("question", 2), press: W("press"), enter: W("enter"), wait: W("wait"), because: W("because"), becauseEnd: W("because", 1, "end"),
};
