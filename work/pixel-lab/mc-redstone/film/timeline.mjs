// «Computers inside Minecraft» timeline: every event is anchored to a measured word of the single voice take.
// Loop film: the last words "And that's how" run on into the first "People have built real computers…", so the seam
// pause is a short in-sentence pause, and the camera lands on the exact first frame.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
// seam: the voice ends at W("how").end; the first word starts at 0.08 s; an in-sentence gap of ~0.2 s in total
export const END = Math.round((W("how", 1, "end") + 0.12) * FPS) / FPS;

export const EV = {
  people: W("people"), minecraft: W("minecraft,"), red: W("red"), dust1: W("dust."),
  they: W("they"), same: W("same"), chip: W("chip"), phone: W("phone."), phoneEnd: W("phone.", 1, "end"),
  called: W("called"), redstone: W("redstone,"), wire: W("wire."), wireEnd: W("wire.", 1, "end"),
  flip: W("flip"), lever: W("lever,"), power: W("power"), runs: W("runs"), lights: W("lights"), lamp: W("lamp."), lampEnd: W("lamp.", 1, "end"),
  on: W("on", 2), off: W("off:"), needs: W("needs."), needsEnd: W("needs.", 1, "end"),
  torch: W("torch"), opposite: W("opposite."), powerB: W("power", 2), block: W("block,"), dark: W("dark."), not: W("not"), gate1: W("gate."), gate1End: W("gate.", 1, "end"),
  three: W("three"), and: W("and", 5), gate2: W("gate:", 2), lampLights: W("lamp", 2), both: W("both"), on2: W("on.", 3), on2End: W("on.", 3, "end"),
  two: W("two"), join: W("join"), or: W("or", 2), gate3: W("gate:", 3), either: W("either"), works: W("works.", 2), worksEnd: W("works.", 2, "end"),
  put: W("put"), gates: W("gates"), add: W("add."), one1: W("one"), plus: W("plus"), one2: W("one", 2), gives: W("gives"), one3: W("one,", 3), zero: W("zero:"),
  twoN: W("two", 2), numbers: W("numbers."), numbersEnd: W("numbers.", 1, "end"),
  copy: W("copy"), thousands: W("thousands"), whole: W("whole"), computer2: W("computer.", 3), computer2End: W("computer.", 3, "end"),
  in2021: W("2021,"), player: W("player"), sammy1: W("sammyuri"), plays: W("plays"), tetris: W("tetris."), tetrisEnd: W("tetris.", 1, "end"),
  but: W("but"), ticks: W("ticks"), once: W("once"), second: W("second."), secondEnd: W("second.", 1, "end"),
  phoneChip: W("phone", 2), ticks2: W("ticks", 2), four: W("four"), billion: W("billion"), times: W("times.", 2), timesEnd: W("times.", 2, "end"),
  in2025: W("2025,"), sammy2: W("sammyuri", 2), tiny: W("tiny"), chatbot: W("chatbot"), redstone2: W("redstone.", 3), redstone2End: W("redstone.", 3, "end"),
  ownE: W("own,"), answer: W("answer"), ten: W("ten"), years: W("years."), yearsEnd: W("years.", 1, "end"),
  even: W("even"), server: W("server"), forty: W("forty"), faster: W("faster,"), takes: W("takes"), hours: W("hours."), hoursEnd: W("hours.", 1, "end"),
  every: W("every"), part: W("part"), lever3: W("lever,", 3), dust3: W("dust", 4), lamp3: W("lamp.", 3), lamp3End: W("lamp.", 3, "end"),
  andThats: W("and", 9), how: W("how"), howEnd: W("how", 1, "end"),
};
