// «From the dumbest animal to the smartest» timeline: every level, camera key and event is anchored to a measured word
// of the single voice take. Loop film: END is chosen so the pause at the seam matches a sentence pause (~0.4 s).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) time of the n-th occurrence of a spoken word, e.g. W("jar.") or W("brain", 3, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
// last audible sound of the take 75.52 s (measured from voice-raw.wav, −35 dBFS gate); first onset 0.07 s → seam pause 0.42 s
export const END = 2276 / FPS; // 75.867 s

// ---------------------------------------------------------------- world layout (grid pixels, y grows down, z = 1)
// screen = (270 + (x - cx), 480 + (y - cy)). The world wraps: x = WORLD_W is the same sea column as x = 0.
export const WORLD_W = 4860;
export const SURFACE = 0;          // sea level
export const LAND = -20;           // ground line of every land biome at its edges
export const SEA_FLOOR = 1800;     // deep floor under the sponge
// biome x-ranges [x0, x1)
export const BIOME = {
  sea: [0, 540], shore: [540, 1080], meadow: [1080, 1620], yard: [1620, 2160], forest: [2160, 2700],
  bay: [2700, 3240], savanna: [3240, 3780], jungle: [3780, 4320], city: [4320, 4860],
};
// resting camera of each level: the animal sits centred under the sky disc (screen 270, 360); land ground at screen y 640
export const REST = {
  sponge: { cx: 270, cy: 1640 }, jelly: { cx: 270, cy: 1000 }, octopus: { cx: 270, cy: 330 },
  bee: { cx: 1350, cy: -180 }, dog: { cx: 1890, cy: -180 }, crow: { cx: 2430, cy: -180 }, dolphin: { cx: 2970, cy: -60 },
  elephant: { cx: 3510, cy: -180 }, chimp: { cx: 4050, cy: -180 }, human: { cx: 4590, cy: -180 }, dive: { cx: WORLD_W + 270, cy: 1640 },
};
export const DISC = { x: 270, y: 360 };   // screen position of the sun / moon / glow behind every animal's head

// ---------------------------------------------------------------- levels: [start, end) of each animal's stretch
export const LV = {
  sponge: [0, W("jellyfish") - 0.2], jelly: [W("jellyfish") - 0.2, W("octopus") - 0.2], octopus: [W("octopus") - 0.2, W("bee's") - 0.25],
  bee: [W("bee's") - 0.25, W("dog") - 0.2], dog: [W("dog") - 0.2, W("some")], crow: [W("some"), W("each")],
  dolphin: [W("each"), W("then")], elephant: [W("then"), W("chimp") - 0.2], chimp: [W("chimp") - 0.2, W("top,") - 0.3],
  human: [W("top,") - 0.3, W("we've")], dive: [W("we've"), END],
};

// ---------------------------------------------------------------- events (seconds), grouped per level
export const EV = {
  // LV1 · sponge
  dumbest: W("dumbest"), zero: W("zero"), cells1: W("cells,"), dinosaurs: W("dinosaurs."), sponge: W("sponge"), sits: W("sits"),
  filters: W("filters"), food: W("food"), water1: W("water."), step: W("step"), unlocks: W("unlocks"), skill: W("skill."),
  // LV2 · jellyfish
  jellyfish: W("jellyfish"), noBrain: W("no"), net: W("net"), nerves: W("nerves."), now: W("now"), swim: W("swim."),
  // LV3 · octopus
  octopus: W("octopus"), five: W("five"), million: W("million"), arms: W("arms."), solves: W("solves"), problems: W("problems,"),
  opening: W("opening"), jar: W("jar."),
  // LV4 · bee
  bees: W("bee's"), sesame: W("sesame"), learn: W("learn."), dances: W("dances"), show: W("show"), flowers: W("flowers"),
  // LV5 · dog
  dog: W("dog"), words: W("words."), collie: W("collie"), chaser: W("chaser"), names: W("names"), thousand: W("thousand"), toys: W("toys."),
  // LV6 · crow
  crows: W("crows"), carve: W("carve"), hooks: W("hooks"), twigs: W("twigs."), scare: W("scare"), remembers: W("remembers"), face: W("face"), years1: W("years.", 1),
  // LV7 · dolphin
  dolphin: W("dolphin"), whistle: W("whistle,"), name: W("name."), friend: W("friend"), knows: W("knows"), twenty: W("twenty"), apart: W("apart."),
  // LV8 · elephant
  twist: W("twist:"), elephant: W("elephant"), three: W("three"), times: W("times"), weDo: W("we", 1), almost: W("almost"), control: W("control"), body: W("body."),
  still: W("still,", 2), know: W("know"), mirror: W("mirror."),
  // LV9 · chimp
  chimp: W("chimp", 1), beat: W("beat"), young: W("young"), ayumu: W("ayumu"), won: W("won"), memory: W("memory"), students: W("students."),
  // LV10 · human + dive
  top: W("top,"), us: W("us:", 2), eightySix: W("eighty-six"), billion: W("billion"), plan: W("plan"), ahead: W("ahead,"), lists: W("lists"), thisOne: W("one.", 4),
  here: W("here", 2), only: W("only", 2), threeHundred: W("three", 2), years2: W("years.", 4), animal: W("animal", 2), bottom: W("bottom"), list: W("list?"),
};

// ---------------------------------------------------------------- camera keys {t, cx, cy}: eased between keys
const K = (t, r) => ({ t, cx: r.cx, cy: r.cy });
export const CAM = [
  K(0, REST.sponge), K(EV.step - 0.3, REST.sponge),
  K(EV.jellyfish + 0.1, REST.jelly), K(EV.now + 0.15, REST.jelly),                 // "every step up": the camera climbs
  K(EV.octopus + 0.25, REST.octopus), K(EV.jar - 0.05, REST.octopus),               // the jellyfish swims up, we follow it
  K(EV.bees + 0.25, REST.bee), K(EV.flowers + 0.35, REST.bee),                      // out of the water, over the shore, onto the meadow
  K(EV.dog + 0.2, REST.dog), K(EV.toys + 0.1, REST.dog),
  K(EV.crows + 0.15, REST.crow), K(EV.years1 + 0.15, REST.crow),
  K(EV.dolphin + 0.2, REST.dolphin), K(EV.apart + 0.3, REST.dolphin),
  K(EV.elephant, REST.elephant), K(EV.mirror + 0.25, REST.elephant),
  K(EV.chimp + 0.2, REST.chimp), K(EV.students + 0.1, REST.chimp),
  K(EV.us + 0.1, REST.human), K(EV.thisOne + 0.25, REST.human),
  K(EV.list + 0.35, REST.dive), K(END + 10, REST.dive),                             // the dive back to the deep floor = first frame
];
