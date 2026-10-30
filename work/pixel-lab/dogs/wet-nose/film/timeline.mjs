// «Why is a dog's nose always cold and wet?» timeline: every scene, camera key and event is anchored to a measured word
// of the single take. Loop film: «…and then:» runs into «Boop!»; END makes the seam pause ≈ a sentence pause (0.39 s),
// and the dog's wake-up boop lands the picture on frame 0.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) time of the n-th occurrence of a spoken word, e.g. W("nose", 3) or W("cold", 2, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
// last audible sound 51.56 s (−35 dBFS gate, 10 ms windows); first onset 0.05 s → seam pause 0.39 s
export const END = 1557 / FPS; // 51.9 s

export const EV = {
  boop: W("boop"), why: W("why"), nose1: W("nose", 1), cold1: W("cold", 1), wet1: W("wet", 1),
  notA: W("not"), cold2: W("cold", 2), tool: W("tool"),
  inside: W("inside"), glands: W("glands"), covered: W("covered"), thin: W("thin"), layer: W("layer"), mucus: W("mucus"),
  smells1: W("smells", 1), tiny: W("tiny"), bits: W("bits"), floating: W("floating"), air1: W("air", 1),
  wet2: W("wet", 2), catches1: W("catches", 1), sticky: W("sticky"), tape: W("tape"), dust: W("dust"),
  then1: W("then", 1), licks: W("licks"), nose3: W("nose", 4), tongue: W("tongue"), carries: W("carries"), smells2: W("smells", 2),
  second: W("second"), organ: W("organ"), roof: W("roof"), mouth: W("mouth"),
  dogHas: W("dog", 2), three: W("three"), hundred: W("hundred"), million1: W("million", 1), cells: W("cells"),
  you: W("you"), six: W("six"), million2: W("million", 2),
  even: W("even"), breathing: W("breathing"), out1: W("out", 1), helps: W("helps"), air2: W("air", 2), leaves: W("leaves"), slits: W("slits"), sides: W("sides"),
  blow: W("blow"), away1: W("away", 1),
  wet3: W("wet", 3), stays: W("stays"), cold3: W("cold", 3), colder: W("colder"), around: W("around"),
  in2020: W("2020"), scientists: W("scientists"), sense: W("sense"), faint: W("faint"), heat: W("heat"), warm: W("warm"), object: W("object"),
  meter: W("meter"), half: W("half"), away2: W("away", 2), cold4: W("cold", 4), may: W("may"), how: W("how"),
  so: W("so", 2), dry1: W("dry", 1), mean: W("mean"), sick: W("sick"), noses: W("noses"), dry2: W("dry", 2), nap: W("nap"),
  one: W("one"), lick: W("lick"), wakes: W("wakes"), up: W("up", 2), and: W("and", 5), then2: W("then", 2),
};

export const SC = {
  boop: [0, EV.notA - 0.25],
  tool: [EV.notA - 0.25, EV.inside - 0.3],
  mucus: [EV.inside - 0.3, EV.smells1 - 0.3],
  smell: [EV.smells1 - 0.3, EV.then1 - 0.35],
  lick: [EV.then1 - 0.35, EV.dogHas - 0.3],
  count: [EV.dogHas - 0.3, EV.even - 0.3],
  breath: [EV.even - 0.3, EV.wet3 - 0.3],
  coldNose: [EV.wet3 - 0.3, EV.in2020 - 0.25],
  heat: [EV.in2020 - 0.25, EV.so - 0.25],
  nap: [EV.so - 0.25, EV.one - 0.2],
  wake: [EV.one - 0.2, END],
};
