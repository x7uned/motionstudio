// «From the slowest wingbeat to the fastest» timeline: every level, camera key, event AND every wingbeat is anchored to a
// measured word of the single voice take. The picture (wings, the meter) and the sound (the wing voice) read the same
// rate curve RATE(t) and its integral PHASE(t), so every visible flap of the slow wings is one audible beat.
// Loop film: the voice runs 0.05–59.43 s; END = 1795 frames = 59.833 s (seam pause 0.45 s). The film opens and ends on
// the honeybee (LV8): the camera rewinds to LV1 after the hook and comes back to LV8 at the end.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
VOICE.words[VOICE.words.length - 1].end = 59.43;   // the aligner stretched the last word; waveform: voice ends 59.43 s
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) time of the n-th occurrence of a spoken word (punctuation ignored). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1795 / FPS; // 59.833 s

// ---------------------------------------------------------------- world layout (grid pixels, y grows down, z = 1)
// screen = (270 + (x − cx), 480 + (y − cy)). Ten biomes, 540 px each, left → right by wingbeat rate. No wrap.
export const WORLD_W = 5400;
export const LAND = -20;           // ground / sea line of every biome at its edges (screen y 640 at the rest camera)
export const SURFACE = LAND;
export const BIOME = {
  ocean: [0, 540], city: [540, 1080], garden: [1080, 1620], pond: [1620, 2160], tropic: [2160, 2700],
  leaf: [2700, 3240], clover: [3240, 3780], hive: [3780, 4320], porch: [4320, 4860], marsh: [4860, 5400],
};
export const SEA_RANGES = [];
const mid = (b) => (BIOME[b][0] + BIOME[b][1]) / 2;
export const REST = {
  albatross: { cx: mid("ocean"), cy: -180 }, pigeon: { cx: mid("city"), cy: -180 }, butterfly: { cx: mid("garden"), cy: -180 },
  damselfly: { cx: mid("pond"), cy: -180 }, hummingbird: { cx: mid("tropic"), cy: -180 }, ladybug: { cx: mid("leaf"), cy: -180 },
  bumblebee: { cx: mid("clover"), cy: -180 }, honeybee: { cx: mid("hive"), cy: -180 }, mosquito: { cx: mid("porch"), cy: -180 },
  midge: { cx: mid("marsh"), cy: -180 },
};
// time of day by camera x (0 dawn · 1 morning · 2 day · 3 afternoon · 4 golden · 5 dusk · 6 night)
export const TOD_KEYS = [[270, 0.9], [810, 1.5], [1350, 2.0], [1890, 2.3], [2430, 2.6], [2970, 3.0], [3510, 3.6], [4050, 4.2], [4590, 5.0], [5130, 5.7]];
export const DISC = { x: 270, y: 360 };

// ---------------------------------------------------------------- events (seconds)
export const EV = {
  // hook (the honeybee)
  bee0: W("bee's"), buzz0: W("buzz"), wings0: W("wings,", 1), two0: W("two", 1), thirty0: W("thirty", 1), second0End: W("second.", 1, "end"),
  every0: W("every", 1), flap0: W("flap"), pushes: W("pushes"), air: W("air,"), sound0: W("sound.", 1), sound0End: W("sound.", 1, "end"),
  lets: W("let's"), slow: W("slow"), fast: W("fast,"), listen: W("listen."), listenEnd: W("listen.", 1, "end"),
  // LV1 · albatross
  albatross: W("albatross"), glides: W("glides."), when: W("when"), flaps1: W("flaps,"), twoHalf: W("half"), second1End: W("second.", 2, "end"),
  count: W("count"), beat: W("beat."), beatEnd: W("beat.", 1, "end"),
  // LV2–LV4
  pigeon: W("pigeon"), six: W("six"), butterfly: W("butterfly,"), ten: W("ten."), damselfly: W("damselfly,"), twenty1: W("twenty.", 1),
  // the threshold
  around: W("around"), twenty2: W("twenty", 2), changes: W("changes:"), blur: W("blur"), oneSound: W("one"), sound2End: W("sound.", 2, "end"),
  // LV5 · hummingbird
  hummingbird: W("hummingbird"), fortyFour: W("forty-four"), low: W("low"), hum: W("hum"), name: W("name."), nameEnd: W("name.", 1, "end"),
  // LV6–LV8
  ladybug: W("ladybug:"), seventyFive: W("seventy-five."), bumblebee: W("bumblebee:"), hundred150: W("fifty,"), deep: W("deep"), buzz2: W("buzz", 2),
  honeybee: W("honeybee:"), two230: W("two", 3), thirty230: W("thirty", 2),
  // LV9 · mosquito
  mosquito: W("mosquito:"), five: W("five"), whine: W("whine"), ear: W("ear,"), warm: W("warm"), higher1: W("higher."), higher1End: W("higher.", 1, "end"),
  // LV10 · midge
  tiny: W("tiny"), midge: W("midge"), thousand: W("thousand"), second3End: W("second", 6, "end"),
  // outro
  faster: W("faster"), higherNote: W("higher", 2), note: W("note."), noteEnd: W("note.", 1, "end"),
  everyAnimal: W("every", 3), different: W("different,"), rough: W("rough."), roughEnd: W("rough.", 1, "end"),
  thatBee: W("bee", 1), garden: W("garden?"),
};

// ---------------------------------------------------------------- levels: [start, end) — who is "on air"
export const LV = {
  hook: [0, EV.lets - 0.05], rewind: [EV.lets - 0.05, EV.albatross - 0.1],
  albatross: [EV.albatross - 0.1, EV.pigeon - 0.15], pigeon: [EV.pigeon - 0.15, EV.butterfly - 0.15], butterfly: [EV.butterfly - 0.15, EV.damselfly - 0.15],
  damselfly: [EV.damselfly - 0.15, EV.hummingbird - 0.15], hummingbird: [EV.hummingbird - 0.15, EV.ladybug - 0.15], ladybug: [EV.ladybug - 0.15, EV.bumblebee - 0.15],
  bumblebee: [EV.bumblebee - 0.15, EV.honeybee - 0.15], honeybee: [EV.honeybee - 0.15, EV.mosquito - 0.15], mosquito: [EV.mosquito - 0.15, EV.tiny - 0.4],
  midge: [EV.tiny - 0.4, EV.everyAnimal - 0.2], outro: [EV.everyAnimal - 0.2, END],
};

// ---------------------------------------------------------------- camera keys {t, cx, cy}
const K = (t, r) => ({ t, cx: r.cx, cy: r.cy });
export const CAM = [
  K(0, REST.honeybee), K(EV.lets, REST.honeybee),
  K(EV.albatross - 0.15, REST.albatross),                                            // the rewind: LV8 → LV1 (motion-blurred)
  K(EV.pigeon - 0.45, REST.albatross), K(EV.pigeon + 0.1, REST.pigeon),
  K(EV.butterfly - 0.4, REST.pigeon), K(EV.butterfly + 0.1, REST.butterfly),
  K(EV.damselfly - 0.45, REST.butterfly), K(EV.damselfly + 0.1, REST.damselfly),
  K(EV.blur - 0.4, REST.damselfly), K(EV.hummingbird + 0.05, REST.hummingbird),       // slow pan while the clicks blur into a hum
  K(EV.ladybug - 0.45, REST.hummingbird), K(EV.ladybug + 0.1, REST.ladybug),
  K(EV.bumblebee - 0.45, REST.ladybug), K(EV.bumblebee + 0.1, REST.bumblebee),
  K(EV.honeybee - 0.45, REST.bumblebee), K(EV.honeybee + 0.1, REST.honeybee),
  K(EV.mosquito - 0.45, REST.honeybee), K(EV.mosquito + 0.15, REST.mosquito),
  K(EV.tiny - 0.55, REST.mosquito), K(EV.midge, REST.midge),
  K(EV.different, REST.midge), K(EV.thatBee + 0.2, REST.honeybee),                    // back to the bee: the first frame
  K(END + 10, REST.honeybee),
];

// ---------------------------------------------------------------- wingbeats: one rate curve for picture and sound
// Shown numbers (rounded, defensible; see ../facts.md). TONE = the synthesised fundamental: the shown number tuned to the
// nearest equal-tempered note for the tonal levels (within the measured spread), so the wing tones also work as music.
// The honeybee's tone is nudged by 0.001 Hz so that its own wing phase is a whole number of beats at END (loop seam).
export const RATE = { albatross: 2.5, pigeon: 6, butterfly: 10, damselfly: 20, hummingbird: 44, ladybug: 75, bumblebee: 150, honeybee: 230, mosquito: 500, midge: 1000 };
export const TONE = { albatross: 2.5, pigeon: 6, butterfly: 10, damselfly: 20, hummingbird: 43.65, ladybug: 73.42, bumblebee: 146.83, honeybee: Math.round(233.08 * (1795 / 30)) / (1795 / 30), mosquito: 493.88, midge: 987.77 };
export const ORDER = ["albatross", "pigeon", "butterfly", "damselfly", "hummingbird", "ladybug", "bumblebee", "honeybee", "mosquito", "midge"];
// keyed rate of the "wing voice" (the animal on air): [t, rate] with log-glides between keys
const RK = [
  [0, TONE.honeybee], [EV.lets + 0.05, TONE.honeybee], [EV.albatross - 0.25, TONE.albatross],   // rewind: the buzz slows into clicks
  [EV.pigeon - 0.3, TONE.albatross], [EV.pigeon + 0.05, TONE.pigeon], [EV.butterfly - 0.3, TONE.pigeon], [EV.butterfly + 0.05, TONE.butterfly],
  [EV.damselfly - 0.3, TONE.butterfly], [EV.damselfly + 0.05, TONE.damselfly],
  [EV.blur - 0.1, TONE.damselfly], [EV.hummingbird, TONE.hummingbird],                     // the clicks speed up and blur into a hum
  [EV.ladybug - 0.3, TONE.hummingbird], [EV.ladybug + 0.05, TONE.ladybug], [EV.bumblebee - 0.3, TONE.ladybug], [EV.bumblebee + 0.05, TONE.bumblebee],
  [EV.honeybee - 0.3, TONE.bumblebee], [EV.honeybee + 0.05, TONE.honeybee], [EV.mosquito - 0.3, TONE.honeybee], [EV.mosquito + 0.05, TONE.mosquito],
  [EV.warm, TONE.mosquito], [EV.higher1 + 0.3, TONE.mosquito * 1.08], [EV.tiny - 0.5, TONE.mosquito * 1.08], [EV.midge, TONE.midge],
  [EV.different + 0.1, TONE.midge], [EV.thatBee + 0.15, TONE.honeybee], [END, TONE.honeybee],
];
function rateRaw(t) {
  if (t <= RK[0][0]) return RK[0][1]; if (t >= RK[RK.length - 1][0]) return RK[RK.length - 1][1];
  let i = 0; while (RK[i + 1][0] <= t) i++;
  const [a, ra] = RK[i], [b, rb] = RK[i + 1], k = (t - a) / (b - a), e = k * k * (3 - 2 * k);
  return Math.exp(Math.log(ra) + (Math.log(rb) - Math.log(ra)) * e);
}
// phase = ∫ rate dt on a 1 ms grid; a tiny correction spread over the last glide makes PHASE(END) a whole number of
// beats, so the honeybee's buzz runs through the seam without a click
const DT = 0.001, NPH = Math.ceil(END / DT) + 2, PH = new Float64Array(NPH);
for (let i = 1; i < NPH; i++) PH[i] = PH[i - 1] + rateRaw((i - 0.5) * DT) * DT;
const fixA = EV.different + 0.1, fixB = EV.thatBee + 0.15, xE = END / DT, iE = Math.floor(xE), rawEnd = PH[iE] + (PH[iE + 1] - PH[iE]) * (xE - iE), fixN = Math.ceil(rawEnd) - rawEnd;
const fixK = (t) => { const x = Math.max(0, Math.min(1, (t - fixA) / (fixB - fixA))); return x * x * (3 - 2 * x); };
/** wing-voice rate (beats per second) at time t */
export function rate(t) { const extra = t > fixA && t < fixB ? (fixN * 6 * ((t - fixA) / (fixB - fixA)) * (1 - (t - fixA) / (fixB - fixA))) / (fixB - fixA) : 0; return rateRaw(t) + extra; }
/** wing-voice phase in beats (integer = one wingbeat) */
export function phase(t) { const x = Math.max(0, Math.min(NPH - 1.001, t / DT)), i = Math.floor(x), f = x - i; return PH[i] + (PH[i + 1] - PH[i]) * f + fixN * fixK(t); }

/** Which animal is on air at t (its sound plays, the meter shows it). */
export function onAir(t) {
  if (t < LV.rewind[0] || t >= LV.outro[0] + 1.6) return "honeybee";
  for (const k of ORDER) if (t >= LV[k][0] && t < LV[k][1]) return k;
  if (t < LV.albatross[0]) return "rewind";
  return "midge";
}
/** Wing stroke amount of an animal at t (0 folded / gliding … 1 full stroke). The albatross glides until "flaps". */
export function strokeAmt(who, t) {
  if (who === "albatross") { const k = Math.max(0, Math.min(1, (t - (EV.flaps1 - 0.15)) / 0.45)); return t < EV.albatross - 2 ? 1 : k * k * (3 - 2 * k); }
  return 1;
}
/** Each animal's own wing phase (beats): its constant rate, offset so that while it is on air it equals phase(t)
 *  exactly — every visible flap of the slow wings is one audible beat. */
const PHASE_AT = Object.fromEntries(ORDER.map((k) => { const t0 = k === "honeybee" ? 0 : (LV[k][0] + LV[k][1]) / 2; return [k, phase(t0) - TONE[k] * t0]; }));
export function wingPhase(who, t) { return TONE[who] * t + PHASE_AT[who]; }
