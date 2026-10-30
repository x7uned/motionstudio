// «From the lightest animal to the heaviest» timeline: every level, camera key and event is anchored to a measured word
// of the single voice take. W() matches words without punctuation. Loop film: END makes the seam pause a sentence pause.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) time of the n-th occurrence of a spoken word, e.g. W("mouse") or W("people", 2, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
// last audible sound 74.56 s (voice-raw.wav, −35 dBFS gate); first onset 0.09 s → seam pause 0.43 s
export const END = 2247 / FPS; // 74.900 s

// ---------------------------------------------------------------- world layout (grid pixels, y grows down, z = 1)
// screen = (270 + (x - cx), 480 + (y - cy)). The world wraps: x = WORLD_W is the meadow at x = 0 again.
export const WORLD_W = 5670;
export const SURFACE = 0;          // water level of the river and the ocean
export const LAND = -20;           // ground line of every land biome at its edges
export const BIOME = {
  meadow: [0, 540], cuba: [540, 1080], field: [1080, 1620], roofs: [1620, 2160], park: [2160, 2970],
  pasture: [2970, 3510], river: [3510, 4050], savanna: [4050, 4590], ocean: [4590, 5130], shore: [5130, 5670],
};
// deep-water x ranges where the camera may go under (none in this film: the whale is shown at the surface)
export const SEA_RANGES = [];
// resting camera of each level: the animal sits centred under the sky disc (screen 270, 360); land ground at screen y 640
export const REST = {
  bee: { cx: 270, cy: -180 }, hummingbird: { cx: 810, cy: -180 }, mouse: { cx: 1350, cy: -180 }, cat: { cx: 1890, cy: -180 },
  dog: { cx: 2430, cy: -180 }, human: { cx: 2700, cy: -180 }, horse: { cx: 3240, cy: -180 }, hippo: { cx: 3780, cy: -60 },
  elephant: { cx: 4320, cy: -180 }, whale: { cx: 4860, cy: -60 }, loop: { cx: WORLD_W + 270, cy: -180 },
};
// time of day by camera x: morning meadow → day → afternoon park → golden pasture/river → sunset savanna → night ocean
// → dawn over the shore → morning meadow again (tod 8 ≡ 1, so the seam frame matches the first frame)
export const TOD_KEYS = [[270, 1], [810, 1.5], [1350, 2], [1890, 2.3], [2430, 2.8], [2700, 3], [3240, 3.6], [3780, 4.1], [4320, 4.8], [4860, 6], [5400, 7.2], [5940, 8]];
export const DISC = { x: 270, y: 360 };   // screen position of the sun / moon behind every animal's head

// ---------------------------------------------------------------- levels: [start, end) of each animal's stretch
export const LV = {
  bee: [0, W("hummingbird") - 0.55], hummingbird: [W("hummingbird") - 0.55, W("mouse") - 0.3], mouse: [W("mouse") - 0.3, W("cat") - 0.3],
  cat: [W("cat") - 0.3, W("dog") - 0.3], dog: [W("dog") - 0.3, W("and", 3) - 0.1], human: [W("and", 3) - 0.1, W("horse") - 0.3],
  horse: [W("horse") - 0.3, W("hippo") - 0.3], hippo: [W("hippo") - 0.3, W("elephant") - 0.35], elephant: [W("elephant") - 0.35, W("but", 2) - 0.1],
  whale: [W("but", 2) - 0.1, W("how") - 0.3], loop: [W("how") - 0.3, END],
};

// ---------------------------------------------------------------- events (seconds), grouped per level
export const EV = {
  // hook (at the bee): "More than a billion honeybees weigh as much as one blue whale. So let's climb from light to heavy."
  billion: W("billion"), honeybees: W("honeybees"), weigh1: W("weigh", 1), blueWhale1: W("blue", 1), climb: W("climb"), lightW: W("light", 1), heavy: W("heavy."),
  // LV1 · bee
  honeybee: W("honeybee"), tenth: W("tenth"), gram: W("gram."), yet1: W("yet", 1), nectar: W("nectar"), half: W("half", 1), itself: W("itself."),
  // LV2 · bee hummingbird
  hummingbird: W("hummingbird"), lessThanTwo: W("two", 1), grams1: W("grams,"), thinkBee: W("bee", 2), scientists: W("scientists"), lighter: W("lighter:"), heat: W("heat"), tooFast: W("fast."),
  // LV3 · mouse
  mouse: W("mouse"), twentyGrams: W("twenty", 1), grams2: W("grams", 2), soLight: W("light", 2), slows: W("slows"), fall: W("fall."), famous: W("famous"), drop: W("drop"), mine: W("mine"), walkAway: W("walk"),
  // LV4 · cat
  cat: W("cat"), twoHundred: W("two", 2), heavier1: W("heavier,"), falls: W("falls"), twists: W("twists"), lands: W("lands"), feet: W("feet."),
  // LV5 · dog
  dog: W("dog"), twentyKg: W("twenty", 2), kilograms: W("kilograms."), dogs: W("dogs"), earth: W("earth"), wild: W("wild"), mammals: W("mammals."),
  // LV6 · human
  people: W("people", 2), together: W("together"), twentyTimes: W("twenty", 3), more: W("more", 3), that: W("that.", 3),
  // LV7 · horse
  horse: W("horse"), halfTonne: W("half", 2), tonne: W("tonne,"), toe: W("toe"), leg: W("leg."),
  // LV8 · hippo
  hippo: W("hippo"), still: W("still."), swim: W("swim,"), float: W("float."), walks: W("walks"), bottom: W("bottom."),
  // LV9 · elephant
  elephant: W("elephant"), heaviest: W("heaviest"), six: W("six"), tonnes: W("tonnes."), eats: W("eats"), kgPlants: W("hundred", 2), plants: W("plants"),
  // LV10 · blue whale
  blueWhale2: W("blue", 2), twentyFive: W("twenty-five"), elephants: W("elephants."), heart: W("heart"), three: W("three"), people2: W("people.", 3),
  // loop: "So how many bees would it take to balance this giant?"
  how: W("how"), bees: W("bees"), balance: W("balance"), giant: W("giant?"),
};

// ---------------------------------------------------------------- camera keys {t, cx, cy}: eased between keys
const K = (t, r) => ({ t, cx: r.cx, cy: r.cy });
export const CAM = [
  K(0, REST.bee), K(LV.bee[1] - 0.15, REST.bee),
  K(EV.hummingbird + 0.25, REST.hummingbird), K(LV.hummingbird[1] - 0.2, REST.hummingbird),
  K(EV.mouse + 0.2, REST.mouse), K(LV.mouse[1] - 0.15, REST.mouse),
  K(EV.cat + 0.2, REST.cat), K(LV.cat[1] - 0.15, REST.cat),
  K(EV.dog + 0.2, REST.dog), K(LV.dog[1] - 0.1, REST.dog),
  K(EV.people + 0.1, REST.human), K(LV.human[1] - 0.2, REST.human),
  K(EV.horse + 0.2, REST.horse), K(LV.horse[1] - 0.15, REST.horse),
  K(EV.hippo + 0.25, REST.hippo), K(LV.hippo[1] - 0.15, REST.hippo),
  K(EV.elephant + 0.25, REST.elephant), K(LV.elephant[1] - 0.1, REST.elephant),
  K(EV.blueWhale2 + 0.3, REST.whale), K(LV.whale[1] - 0.05, REST.whale),
  K(END - 0.15, REST.loop), K(END + 10, REST.loop),                                  // over the shore at dawn, back to the bee
];
