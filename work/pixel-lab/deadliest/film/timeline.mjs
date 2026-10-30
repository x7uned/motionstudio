// «Which animal kills the most people?» timeline: every level, camera key and event is anchored to a measured word of the
// single voice take (voice/words-master.json: the take with the requested 1.5 s pause after "…the mosquito.").
// W() matches words without punctuation. Not a loop: the film ends on the night camp (the hero's comic K.O.).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words-master.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) time of the n-th occurrence of a spoken word, e.g. W("shark", 2) or W("one", 3, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = words[words.length - 1].end;
// after the last word: ~1.9 s for the hero's fall and the ghost (no loop, no outro scene)
export const END = Math.ceil((VOICE_END + 1.9) * FPS) / FPS;

// ---------------------------------------------------------------- world layout (grid pixels, y grows down, z = 1)
// screen = (270 + (x - cx), 480 + (y - cy)). One continuous side-view world, left to right, morning → night.
export const WORLD_W = 4590;
export const SURFACE = 0;          // water level of the sea, the river and the swamp
export const LAND = -20;           // ground line of every land biome at its edges
export const BIOME = {
  ocean: [0, 540], savanna: [540, 1080], river: [1080, 1620], swamp: [1620, 2160],
  desert: [2160, 2700], village: [2700, 3240], jungle: [3240, 3780], camp: [3780, 4590],
};
export const SEA_RANGES = [];      // the camera never goes under water in this film
// resting camera of each level: the animal sits centred under the sky disc (screen 270, 360); land ground at screen y 640
export const REST = {
  shark: { cx: 270, cy: -60 }, lion: { cx: 810, cy: -180 }, hippo: { cx: 1350, cy: -60 }, croc: { cx: 1890, cy: -60 },
  scorpion: { cx: 2430, cy: -180 }, dog: { cx: 2970, cy: -180 }, snake: { cx: 3510, cy: -180 }, camp: { cx: 4050, cy: -180 },
};
// time of day by camera x: morning sea → day savanna → afternoon river → golden swamp/desert → dusk village → night
export const TOD_KEYS = [[270, 1], [810, 2], [1350, 2.8], [1890, 3.6], [2430, 4.3], [2970, 5.1], [3510, 5.7], [4050, 6], [4600, 6]];
export const DISC = { x: 270, y: 360 };   // screen position of the sun / moon behind every animal's head

// ---------------------------------------------------------------- levels: [start, end) of each animal's stretch
export const LV = {
  shark: [0, W("lions") - 0.3], lion: [W("lions") - 0.3, W("hippo") - 0.35], hippo: [W("hippo") - 0.35, W("crocodiles") - 0.3],
  croc: [W("crocodiles") - 0.3, W("scorpion") - 0.45], scorpion: [W("scorpion") - 0.45, W("dogs") - 0.35], dog: [W("dogs") - 0.35, W("snakes") - 0.35],
  snake: [W("snakes") - 0.35, W("so") - 0.1], camp: [W("so") - 0.1, END],
};

// ---------------------------------------------------------------- events (seconds), grouped per level
export const EV = {
  // hook at the sea: "Which animal kills the most people? The shark? No! The shark is the safest one on this list. Sharks kill about ten people a year."
  which: W("which", 1), people1: W("people", 1), shark1: W("shark", 1), no: W("no"), shark2: W("shark", 2), safest: W("safest"), list: W("list"),
  sharks: W("sharks"), ten: W("ten"), year1: W("year", 1),
  // LV2 · lion: "Lions kill about a hundred."
  lions: W("lions"), hundred1: W("hundred", 1),
  // LV3 · hippo: "A hippo looks lazy, but it kills about five hundred. It attacks boats that come too close."
  hippo: W("hippo"), lazy: W("lazy"), but1: W("but", 1), five: W("five"), hundred2: W("hundred", 2), attacks: W("attacks"), boats: W("boats"), close: W("close"),
  // LV4 · crocodile: "Crocodiles kill up to a thousand. They wait under the water, right by the shore."
  crocodiles: W("crocodiles"), thousand1: W("thousand", 1), wait: W("wait"), under: W("under"), water: W("water"), shore: W("shore"),
  // LV5 · scorpion: "A scorpion is tiny. Still, its sting kills about three thousand people a year, mostly children."
  scorpion: W("scorpion"), tiny: W("tiny"), still: W("still"), sting: W("sting"), three: W("three"), thousand2: W("thousand", 2), mostly: W("mostly"), children: W("children"),
  // LV6 · dog: "Dogs kill about sixty thousand. Not with their teeth, but with rabies, a virus in the bite. A vaccine stops it."
  dogs: W("dogs"), sixty: W("sixty"), thousand3: W("thousand", 3), teeth: W("teeth"), rabies: W("rabies"), virus: W("virus"), bite: W("bite"), vaccine: W("vaccine"), stops: W("stops"),
  // LV7 · snake: "Snakes kill about a hundred thousand people every year."
  snakes: W("snakes"), hundred3: W("hundred", 3), thousand4: W("thousand", 4), year3: W("year", 3),
  // guesses (camera on its way into the night camp): "So which animal is number one? A great white shark? A hungry lion? A giant snake? Nope."
  so: W("so"), number: W("number"), one2: W("one", 2), great: W("great"), shark3: W("shark", 3), hungry: W("hungry"), lion2: W("lion"), giant: W("giant"), snake2: W("snake"), nope: W("nope"),
  // LV8 · mosquito: "It's this little guy: the mosquito." [1.5 s pause] "Yes. The deadliest animal on Earth is the mosquito."
  little: W("little"), guy: W("guy"), mosquito1: W("mosquito", 1), mosquito1End: W("mosquito", 1, "end"), yes: W("yes"), deadliest: W("deadliest"), earth: W("earth"), mosquito2: W("mosquito", 2),
  // "Every year, about six hundred thousand people die from it. Well, from the malaria it carries."
  every: W("every", 2), six: W("six"), thousand5: W("thousand", 5), die: W("die"), well: W("well"), malaria: W("malaria"), carries: W("carries"), carriesEnd: W("carries", 1, "end"),
  // call to action over the same scene: "Liked this video? Send it to a friend, and follow so you don't miss the next one."
  liked: W("liked"), video: W("video"), send: W("send"), friend: W("friend"), follow: W("follow"), miss: W("miss"), next: W("next"), lastEnd: VOICE_END,
  // the hero's comic K.O. after the last word
  fall: VOICE_END + 0.15, ghost: VOICE_END + 0.75,
};

// ---------------------------------------------------------------- camera keys {t, cx, cy}: eased between keys
const K = (t, r) => ({ t, cx: r.cx, cy: r.cy });
export const CAM = [
  K(0, REST.shark), K(LV.shark[1] - 0.15, REST.shark),
  K(EV.lions + 0.35, REST.lion), K(LV.lion[1] - 0.05, REST.lion),
  K(EV.hippo + 0.45, REST.hippo), K(LV.hippo[1] - 0.15, REST.hippo),
  K(EV.crocodiles + 0.35, REST.croc), K(LV.croc[1] - 0.15, REST.croc),
  K(EV.scorpion + 0.35, REST.scorpion), K(LV.scorpion[1] - 0.2, REST.scorpion),
  K(EV.dogs + 0.3, REST.dog), K(LV.dog[1] - 0.2, REST.dog),
  K(EV.snakes + 0.3, REST.snake), K(LV.snake[1] + 0.05, REST.snake),
  K(EV.one2 + 0.3, REST.camp), K(END + 10, REST.camp),
];
