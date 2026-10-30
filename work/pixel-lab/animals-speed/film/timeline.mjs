// «From the slowest animal to the fastest» timeline: every level, camera key and event is anchored to a measured word of
// the single voice take (voice/words.json). W() matches words without punctuation. Not a loop: the film ends on a city
// rooftop at dawn, where the falcon's dive blows the hero over under the share/follow card.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) time of the n-th occurrence of a spoken word, e.g. W("cat", 2) or W("one", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = words[words.length - 1].end;
// after the last word: ~1.7 s for the hero's tumble (no loop, no outro scene)
export const END = Math.ceil((VOICE_END + 1.7) * FPS) / FPS;

// ---------------------------------------------------------------- world layout (grid pixels, y grows down, z = 1)
// screen = (270 + (x - cx), 480 + (y - cy)). One continuous side-view world, left to right, morning → night → dawn.
export const WORLD_W = 4590;
export const SURFACE = 0;
export const LAND = -20;           // ground line of every biome at its edges
export const BIOME = {
  garden: [0, 540], jungle: [540, 1080], stadium: [1080, 1620], yard: [1620, 2160],
  racecourse: [2160, 2700], savanna: [2700, 3240], cave: [3240, 3780], city: [3780, 4590],
};
export const SEA_RANGES = [];
// resting camera of each level: the animal sits centred under the sky disc (screen 270, 360); ground at screen y 640
export const REST = {
  snail: { cx: 270, cy: -180 }, sloth: { cx: 810, cy: -180 }, human: { cx: 1350, cy: -180 }, cat: { cx: 1890, cy: -180 },
  horse: { cx: 2430, cy: -180 }, cheetah: { cx: 2970, cy: -180 }, bat: { cx: 3510, cy: -180 }, city: { cx: 4050, cy: -180 },
};
// time of day by camera x: morning garden → day jungle and stadium → afternoon yard → golden racecourse → sunset savanna
// → night over the bat cave → dawn over the city (tod 7 = the next dawn)
export const TOD_KEYS = [[270, 1], [810, 1.8], [1350, 2.2], [1890, 2.9], [2430, 3.7], [2970, 4.6], [3510, 6], [4050, 7], [4600, 7]];
export const DISC = { x: 270, y: 360 };

// ---------------------------------------------------------------- levels: [start, end) of each animal's stretch
export const LV = {
  snail: [0, W("sloth") - 0.35], sloth: [W("sloth") - 0.35, W("usain") - 0.3], human: [W("usain") - 0.3, W("your", 2) - 0.3],
  cat: [W("your", 2) - 0.3, W("racehorse", 1) - 0.35], horse: [W("racehorse", 1) - 0.35, W("cheetah", 1) - 0.35],
  cheetah: [W("cheetah", 1) - 0.35, W("tiny") - 0.4], bat: [W("tiny") - 0.4, W("so", 2) - 0.1], city: [W("so", 2) - 0.1, END],
};

// ---------------------------------------------------------------- events (seconds), grouped per level
export const EV = {
  // hook in the garden: "Your cat can outrun the fastest human who ever lived. Let's line up animals from the slowest to the fastest."
  your1: W("your", 1), cat1: W("cat", 1), outrun: W("outrun"), fastest1: W("fastest", 1), human1: W("human", 1), lived: W("lived"),
  lets: W("let's"), line: W("line"), slowest: W("slowest"), fastest2: W("fastest", 2),
  // LV1 · snail: "The record in snail racing is thirty-three centimetres in two minutes."
  record: W("record"), snail: W("snail"), racing: W("racing"), thirtyThree: W("thirty-three"), centimetres: W("centimetres"), two: W("two"), minutes: W("minutes"),
  // LV2 · sloth: "A sloth moves at about a quarter of a kilometre an hour. It's so slow that green algae grow in its fur."
  sloth: W("sloth"), moves: W("moves"), quarter: W("quarter"), kilometre: W("kilometre"), slow: W("slow"), green: W("green"), algae: W("algae"), fur: W("fur"),
  // LV3 · human: "Usain Bolt, the fastest human ever, hit about forty-four kilometres an hour."
  usain: W("usain"), bolt: W("bolt"), fastest3: W("fastest", 3), ever2: W("ever", 2), hit: W("hit"), fortyFour: W("forty-four"),
  // LV4 · cat: "Your cat can sprint at about forty-eight."
  your2: W("your", 2), cat2: W("cat", 2), sprint: W("sprint"), fortyEight: W("forty-eight"),
  // LV5 · horse: "A racehorse gallops at about seventy."
  racehorse1: W("racehorse", 1), gallops: W("gallops"), seventy: W("seventy"),
  // LV6 · cheetah: "A cheetah hits ninety-three, but only in short bursts. Then it has to rest."
  cheetah1: W("cheetah", 1), hits: W("hits"), ninetyThree: W("ninety-three"), short: W("short"), bursts: W("bursts"), then: W("then"), rest: W("rest"),
  // LV7 · bat: "A tiny bat, the free-tailed bat, was tracked at a hundred and sixty."
  tiny: W("tiny"), bat1: W("bat", 1), freeTailed: W("free-tailed"), bat2: W("bat", 2), tracked: W("tracked"), hundred1: W("hundred", 1), sixty: W("sixty"),
  // guesses (camera on its way into the city): "So which animal is the fastest? The cheetah? A racehorse? Nope."
  so: W("so", 2), fastest4: W("fastest", 4), cheetah2: W("cheetah", 2), racehorse2: W("racehorse", 2), nope: W("nope"),
  // LV8 · falcon: "It's this bird: the peregrine falcon. When it dives at its prey, it goes over three hundred kilometres an hour.
  // That's as fast as a bullet train."
  bird: W("bird"), peregrine: W("peregrine"), falcon: W("falcon"), falconEnd: W("falcon", 1, "end"), dives: W("dives"), prey: W("prey"),
  over: W("over"), three: W("three"), hundred2: W("hundred", 2), kilometres2: W("kilometres", 2), bullet: W("bullet"), train: W("train"),
  // call to action over the same scene: "Liked this video? Send it to a friend, and follow so you don't miss the next one."
  liked: W("liked"), video: W("video"), send: W("send"), friend: W("friend"), follow: W("follow"), miss: W("miss"), next: W("next"), lastEnd: VOICE_END,
  // the falcon's second pass after the last word blows the hero over
  gust: VOICE_END + 0.1,
};

// ---------------------------------------------------------------- camera keys {t, cx, cy}: eased between keys
const K = (t, r) => ({ t, cx: r.cx, cy: r.cy });
export const CAM = [
  K(0, REST.snail), K(LV.snail[1] - 0.15, REST.snail),
  K(EV.sloth + 0.35, REST.sloth), K(LV.sloth[1] - 0.1, REST.sloth),
  K(EV.usain + 0.35, REST.human), K(LV.human[1] - 0.05, REST.human),
  K(EV.cat2 + 0.25, REST.cat), K(LV.cat[1] - 0.05, REST.cat),
  K(EV.racehorse1 + 0.3, REST.horse), K(LV.horse[1] - 0.05, REST.horse),
  K(EV.cheetah1 + 0.3, REST.cheetah), K(LV.cheetah[1] - 0.15, REST.cheetah),
  K(EV.bat1 + 0.2, REST.bat), K(LV.bat[1] + 0.05, REST.bat),
  K(EV.fastest4 + 0.6, REST.city), K(END + 10, REST.city),
];
