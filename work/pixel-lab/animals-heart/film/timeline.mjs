// «From the slowest heartbeat to the fastest» timeline: every level, camera key, event AND every heartbeat is anchored to
// a measured word of the single voice take. The picture (pulsing hearts, ECG blips) and the bass heartbeat sound read
// the same BEATS list, so they always match. W() matches words without punctuation. Loop film.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) time of the n-th occurrence of a spoken word, e.g. W("mouse's") or W("thirty", 2, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
// last audible sound 79.32 s (voice-raw.wav, −35 dBFS gate); first onset 0.04 s → seam pause 0.39 s
export const END = 2390 / FPS; // 79.667 s

// ---------------------------------------------------------------- world layout (grid pixels, y grows down, z = 1)
// screen = (270 + (x - cx), 480 + (y - cy)). The world wraps: x = WORLD_W is the whale's ocean column at x = 0 again.
export const WORLD_W = 5130;
export const SURFACE = 0;          // sea level (ocean, lagoon, the sea under the Mediterranean wall)
export const LAND = -20;           // ground line of every land biome at its edges
export const BIOME = {
  ocean: [0, 540], snow: [540, 1080], lagoon: [1080, 1620], savanna: [1620, 2430], roofs: [2430, 2970],
  meadow: [2970, 3510], barn: [3510, 4050], gorge: [4050, 4590], wall: [4590, 5130],
};
// deep-water x ranges where the camera goes under (the ocean column and the lagoon)
export const SEA_RANGES = [[0, 540], [1080, 1620]];
export const REST = {
  whale: { cx: 270, cy: 900 }, groundhog: { cx: 810, cy: -180 }, burrow: { cx: 810, cy: 60 }, turtle: { cx: 1350, cy: 300 },
  elephant: { cx: 1890, cy: -180 }, human: { cx: 2160, cy: -180 }, cat: { cx: 2700, cy: -180 }, rabbit: { cx: 3240, cy: -180 },
  mouse: { cx: 3780, cy: -180 }, hummingbird: { cx: 4320, cy: -180 }, shrew: { cx: 4860, cy: -180 }, loop: { cx: WORLD_W + 270, cy: 900 },
};
// time of day by camera x: (deep ocean) → winter dawn on the snowy coast → morning lagoon → golden savanna → night
// rooftops under the full moon → next morning meadow → day barn → afternoon gorge → sunset over the sea → (deep ocean)
// (−0.2 ≡ 6.8 and 13.8 ≡ 6.8 in the 7-step cycle: the rise from the whale goes forward through dawn, and the dive ends
// on the same time of day as the first frame)
export const TOD_KEYS = [[270, -0.2], [810, 0.4], [1350, 1.4], [1890, 4], [2160, 4.4], [2700, 6], [3240, 8], [3780, 9], [4320, 10], [4860, 11.1], [5400, 13.8]];
export const DISC = { x: 270, y: 360 };

// ---------------------------------------------------------------- levels: [start, end)
export const LV = {
  whale: [0, W("but") - 0.1], groundhog: [W("but") - 0.1, W("resting") - 0.3], turtle: [W("resting") - 0.3, W("elephant's") - 0.35],
  elephant: [W("elephant's") - 0.35, W("yours") - 0.1], human: [W("yours") - 0.1, W("cat's") - 0.15], cat: [W("cat's") - 0.15, W("smaller") - 0.1],
  heat: [W("smaller") - 0.1, W("rabbit's") - 0.25], rabbit: [W("rabbit's") - 0.25, W("mouse's") - 0.15], mouse: [W("mouse's") - 0.15, W("hummingbird's") - 0.15],
  hummingbird: [W("hummingbird's") - 0.15, W("record") - 0.45], shrew: [W("record") - 0.45, W("now") - 0.1], twist: [W("now") - 0.1, W("we") - 0.1], loop: [W("we") - 0.1, END],
};

// ---------------------------------------------------------------- events (seconds)
export const EV = {
  // hook + LV1 · blue whale
  whale: W("whale's", 1), two: W("two", 1), beatsMin: W("beats", 1), shrew0: W("shrew's"), twentyFive: W("twenty-five"), second: W("second."), size: W("size"), speed: W("speed."),
  dive: W("dive,"), once: W("once"), thirtySec: W("thirty", 1), artery: W("artery"), moving: W("moving"), between: W("between"),
  // LV2 · groundhog
  slowDown: W("slow", 2), save: W("save"), groundhog: W("groundhog's"), eighty: W("eighty"), winter: W("winter"), hibernates: W("hibernates,"), months: W("months."),
  drops: W("drops"), five: W("five"), fat: W("fat"), spring: W("spring."),
  // LV3 · sea turtle
  turtle: W("turtle's"), eleven: W("eleven"), sleepWater: W("sleep", 2), underwater: W("underwater"), hours: W("hours."),
  // LV4 · elephant, LV5 · human (one savanna scene: the hero is on safari next to the elephant)
  elephant: W("elephant's"), thirty: W("thirty", 2), yours: W("yours"), seventy: W("seventy."),
  // LV6 · cat
  cat: W("cat's"), hundredThirty: W("thirty", 3), home: W("home."), vet: W("vet,"), jumps: W("jumps"), twoHundred: W("two", 2),
  // heat rule (pan from the night rooftops to the morning meadow)
  smaller: W("smaller"), loseHeat: W("heat"), burn: W("burn"), pump: W("pump"),
  // LV7 · rabbit, LV8 · mouse, LV9 · hummingbird, LV10 · Etruscan shrew
  rabbit: W("rabbit's"), twoFifty: W("fifty"), mouse: W("mouse's"), sixHundred: W("six"), ten: W("ten"), hummingbird: W("hummingbird's"), race: W("race"), twelve: W("twelve"),
  record: W("record"), etruscan: W("etruscan"), shrew: W("shrew:"), fifteen: W("fifteen"),
  // twist (in the shrew's scene) and the loop question
  twist: W("twist."), billion1: W("billion", 1), life: W("life."), fastMouse: W("fast"), twoYears: W("years."), slowElephant: W("slow", 3), sixty: W("sixty."),
  both: W("both"), close: W("close"), we: W("we"), threeBillion: W("three"), biggest: W("biggest"), earth: W("earth?"),
};

// ---------------------------------------------------------------- camera keys {t, cx, cy}
const K = (t, r) => ({ t, cx: r.cx, cy: r.cy });
export const CAM = [
  K(0, REST.whale), K(LV.whale[1] - 0.2, REST.whale),
  K(EV.groundhog + 0.2, REST.groundhog), K(EV.hibernates - 0.2, REST.groundhog),
  K(EV.months + 0.2, REST.burrow), K(LV.groundhog[1] - 0.15, REST.burrow),          // tilt down into the burrow
  K(EV.turtle + 0.5, REST.turtle), K(LV.turtle[1] - 0.15, REST.turtle),
  K(EV.elephant + 0.25, REST.elephant), K(LV.elephant[1] - 0.05, REST.elephant),
  K(EV.yours + 0.45, REST.human), K(LV.human[1] - 0.05, REST.human),
  K(EV.cat + 0.35, REST.cat), K(LV.cat[1], REST.cat),
  K(LV.heat[1] + 0.25, REST.rabbit), K(LV.rabbit[1] - 0.1, REST.rabbit),             // the long pan: night → sunrise → morning
  K(EV.mouse + 0.25, REST.mouse), K(LV.mouse[1] - 0.1, REST.mouse),
  K(EV.hummingbird + 0.25, REST.hummingbird), K(LV.hummingbird[1] - 0.05, REST.hummingbird),
  K(EV.record + 0.3, REST.shrew), K(LV.twist[1] + 0.1, REST.shrew),
  K(END - 0.2, REST.loop), K(END + 10, REST.loop),                                   // over the wall into the sea, down to the whale
];

// ---------------------------------------------------------------- heartbeats: one list for picture and sound
// who: which animal's heart; bpm: its rate at that beat (for the label and the sound's lub–dub spacing); g: loudness 0..1
export const BEATS = [];
const steady = (who, a, b, bpm, g = 1, phase = a) => { const rr = 60 / bpm; for (let t = phase; t < b; t += rr) if (t >= a) BEATS.push({ t, who, bpm, g }); };
const ramp = (who, a, b, bpm0, bpm1, g = 1) => { let t = a; while (t < b) { const k = (t - a) / (b - a), bpm = bpm0 * Math.pow(bpm1 / bpm0, k); BEATS.push({ t, who, bpm, g }); t += 60 / bpm; } };
// whale: ONE beat on "two beats a minute" (the next would come 30 s later); a short shrew teaser on "twenty-five times a second"
BEATS.push({ t: EV.two + 0.05, who: "whale", bpm: 2, g: 1 });
steady("shrew", EV.twentyFive, EV.second + 0.45, 1511, 0.55);
// groundhog: awake at 80 from "eighty", slows on "hibernates" … "drops to about five" (beats spread out to 12 s)
steady("groundhog", EV.eighty - 0.35, EV.hibernates, 80, 0.9);
ramp("groundhog", EV.hibernates, EV.five + 0.1, 80, 5, 0.9);
// turtle: 11 bpm (one beat every 5.5 s)
BEATS.push({ t: EV.eleven + 0.05, who: "turtle", bpm: 11, g: 1 });
// elephant 30 from "thirty", continues under the human's 70 (a polyrhythm on safari), both stop as the cat arrives
steady("elephant", EV.thirty - 0.2, LV.human[1] + 0.2, 30, 1);
steady("human", EV.seventy - 0.3, LV.human[1] + 0.2, 70, 0.85);
// cat 130 at home, rising to ~190 at the vet, then fading out during the heat-rule pan
steady("cat", EV.hundredThirty - 0.2, EV.vet, 130, 0.8);
ramp("cat", EV.vet, EV.twoHundred + 0.3, 130, 190, 0.8);
steady("cat", EV.twoHundred + 0.3, EV.smaller + 1.2, 190, 0.6);
steady("rabbit", EV.rabbit + 0.1, LV.rabbit[1], 250, 0.8);
steady("mouse", EV.mouse + 0.1, LV.mouse[1], 600, 0.7);
steady("hummingbird", EV.hummingbird + 0.1, LV.hummingbird[1], 1260, 0.6);
steady("shrew", EV.record, LV.shrew[1] + 0.3, 1511, 0.6);
// twist: soft reminders under each line — the mouse races, the elephant plods, then yours
steady("mouse", EV.fastMouse, EV.slowElephant - 0.2, 600, 0.35);
steady("elephant", EV.slowElephant, EV.both, 30, 0.6);
steady("human", EV.we - 0.1, EV.biggest - 0.3, 70, 0.6);
BEATS.sort((a, b) => a.t - b.t);
/** Pulse of a given animal's heart at time t: 1 right on a beat, decaying over ~0.25 s (or faster for fast hearts). */
export function pulse(who, t) { let v = 0; for (const b of BEATS) { if (b.who !== who) continue; const d = t - b.t; if (d < 0) break; const tau = Math.min(0.25, 15 / b.bpm); v = Math.max(v, Math.exp(-d / tau) * (d < 0.02 ? d / 0.02 : 1)); } return v; }
/** The bpm label value of an animal at time t (last beat's rate). */
export function bpmAt(who, t) { let v = null; for (const b of BEATS) { if (b.who !== who) continue; if (b.t > t) break; v = b.bpm; } return v; }
