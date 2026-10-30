// «Doom runs on a lawn mower, a light bulb, and even bacteria» timeline: every beat is anchored to a measured word of the
// single voice take (voice/words.json = ElevenLabs alignment moved onto Scribe's word starts by dev/retime.mjs;
// words-el.json = original). Not a loop: the film ends on the follow card over the empty 8th pedestal, ~0.85 s hold.
// World: one long museum stand (side view). Pedestals left → right in ranking order; the camera dollies along it.
// The TIME PER FRAME log scale (1/35 s … 12 days) hangs fixed at the top of the frame with its slider.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("twelve", 3), W("days.", 2, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  doom1: W("doom"), mower1: W("mower,"), light1: W("light"), bulb1: W("bulb,"), and1: W("and"), bacteria1: W("bacteria."),
  lets: W("let's"), rank: W("rank"), picture: W("picture"), blink: W("blink"), twelve1: W("twelve"), days1: W("days."), days1End: W("days.", 1, "end"),
  doom2: W("doom", 2), y1993: W("1993"), code1: W("code"), free: W("free,"), small: W("small,"), people: W("people"), everything: W("everything."), everythingEnd: W("everything.", 1, "end"),
  normal: W("normal"), pc: W("pc,"), draws: W("draws"), f35: W("thirty-five"), frames: W("frames"), second: W("second."),
  robot: W("robot"), official: W("official"), update: W("update,"), own: W("own"), screen1: W("screen."),
  smart: W("smart"), bulb2: W("bulb's"), tiny: W("tiny"), chip1: W("chip"), f30: W("thirty,"), added: W("added"), screen2: W("screen.", 2),
  inside: W("inside"), pdf: W("pdf"), file: W("file,"), f12: W("twelve", 2),
  famous: W("famous"), pregnancy: W("pregnancy"), test: W("test"), plastic: W("plastic"), shell: W("shell."), chip2: W("chip", 2), screen3: W("screen", 3), isNew: W("new."),
  minecraft: W("minecraft,"), redstone: W("redstone"), drew: W("drew"), s23: W("twenty-three"), seconds: W("seconds,"), sped: W("sped-up"), server: W("server."),
  glowing: W("glowing"), bacteria2: W("bacteria", 2), pixels: W("pixels,"), model: W("computer", 2), m70: W("seventy"), minutes: W("minutes"), frame2: W("frame", 2),
  whole: W("whole"), six: W("six"), years: W("years."),
  slowest: W("slowest:"), computer3: W("computer", 3), typescript: W("typescript's"), rules: W("rules"), checking: W("checking"), code2: W("code", 2),
  its: W("its", 4), first: W("first"), took: W("took"), twelve3: W("twelve", 3), days2: W("days.", 2), days2End: W("days.", 2, "end"),
  someone: W("someone"), try: W("try"), something: W("something"), stranger: W("stranger."),
  follow: W("follow,"), miss: W("miss"), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- world layout (540×960 grid; world x along the stand)
export const PED = { info: 150, pc: 450, mower: 750, bulb: 1050, pdf: 1350, test: 1650, mc: 1950, bact: 2250, ts: 2550, q: 2850 };
export const ORDER = ["info", "pc", "mower", "bulb", "pdf", "test", "mc", "bact", "ts", "q"];
export const WORLD_W = 3100, FOCUS_X = 240;          // the focused pedestal lands at screen x 240 (main zone x 35–440)
export const TOP = 540, FLOOR = 760;                 // pedestal top surface, floor line

const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const sine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
/** Keyframe track: keys [[t, v], …]; eased between keys, held outside. */
export function track(keys, t, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + (v1 - v0) * e((t - t0) / (t1 - t0)); }
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------- camera: world x of the focus point (screen x 240)
// Frame 0: the mower already driving; flyby to the bulb and the petri dish; back to the start for the scale; then one
// pedestal per sentence; finally the empty 8th pedestal. Sine easing keeps the peak speed low; fast moves get a motion blur.
export const CAM = [
  [0, PED.mower], [1.45, PED.mower], [2.05, PED.bulb], [2.4, PED.bulb], [3.3, PED.bact], [4.05, PED.bact], [5.6, 260],
  [14.3, 260], [15.0, PED.pc], [17.45, PED.pc], [18.15, PED.mower], [21.45, PED.mower], [22.1, PED.bulb], [25.85, PED.bulb], [26.5, PED.pdf],
  [28.45, PED.pdf], [29.1, PED.test], [33.45, PED.test], [34.15, PED.mc], [39.55, PED.mc], [40.25, PED.bact], [46.75, PED.bact], [47.45, PED.ts],
  [54.6, PED.ts], [55.7, PED.q],
];
export const camFocus = (t) => track(CAM, t, sine);
export const camX = (t) => camFocus(t) - FOCUS_X;     // world x at screen x 0
/** When each pedestal is "revealed" (its spotlight comes on and stays): the camera arrives on its sentence. */
export const REVEAL = { info: EV.doom2 - 0.3, pc: 14.5, mower: -1, bulb: 21.7, pdf: 26.0, test: 28.7, mc: 33.7, bact: 39.8, ts: 47.0, q: EV.someone - 0.1 };

// ---------------------------------------------------------------- TIME PER FRAME log scale (fixed panel at the top)
const L0 = Math.log10(1 / 35), L1 = Math.log10(12 * 86400);
export const uOf = (sec) => (Math.log10(sec) - L0) / (L1 - L0);
export const SCALE = { x0: 36, x1: 504, y0: 150, y1: 238, tx0: 66, tx1: 474, ty: 206, in: EV.lets - 0.1 };
export const SLIDER = [
  [0, 0], [EV.f30 + 0.05, 0], [EV.f30 + 0.5, uOf(1 / 30)], [EV.f12 - 0.05, uOf(1 / 30)], [EV.f12 + 0.45, uOf(1 / 12)],
  [EV.s23 - 0.05, uOf(1 / 12)], [EV.s23 + 0.85, uOf(23)], [EV.m70 - 0.05, uOf(23)], [EV.m70 + 0.9, uOf(70 * 60)],
  [EV.first, uOf(70 * 60)], [EV.days2 + 0.3, 1],
];
/** Ranked dots left on the track: [time placed, u, colour]. The mower has no measured number (press retelling only). */
export const DOTS = [
  [EV.f35 + 0.1, 0, "#7FE3F0"], [EV.f30 + 0.5, uOf(1 / 30), "#F4CA50"], [EV.f12 + 0.45, uOf(1 / 12), "#F59A3A"],
  [EV.s23 + 0.85, uOf(23), "#E0443C"], [EV.m70 + 0.9, uOf(70 * 60), "#65DA41"], [EV.days2 + 0.3, 1, "#B08AE8"],
];
