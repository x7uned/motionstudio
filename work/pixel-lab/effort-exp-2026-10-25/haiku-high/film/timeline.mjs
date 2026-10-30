// «Pumpkin face» (effort experiment, haiku-high) — timeline. One 10.0 s film, 30 fps, 540×960 grid ×2.
// The voice is the shared take ../../common/voice/voice-raw.wav; word times = words.json + VOICE_AT.
// Every visual and sound event is anchored to a word or to a motion that the sound follows.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const FPS = 30, END = 10, GW = 540, GH = 960, VOICE_AT = 0.30;
export const VOICE_FILE = HERE + "../../common/voice/voice-raw.wav";
const RAW = JSON.parse(fs.readFileSync(HERE + "../../common/voice/words.json", "utf8"));
export const WORDS = RAW.words.map((w) => ({ ...w, start: +(w.start + VOICE_AT).toFixed(3), end: +(w.end + VOICE_AT).toFixed(3) }));
export const VOICE_TEXT = RAW.text;

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
export function W(text, n = 1, edge = "start") {
  let k = 0;
  for (const w of WORDS) if (norm(w.text) === norm(text) && ++k === n) return w[edge];
  throw new Error(`word not found: ${text} #${n}`);
}
export const EV = {
  two: W("two"), holes: W("holes"), line: W("line"), lineEnd: W("line", 1, "end"),
  brain: W("brain"), sees: W("sees"), face: W("face"), faceEnd: W("face", 1, "end"),
  sixth: W("sixth"), second: W("second"), secondEnd: W("second", 1, "end"),
  area: W("area"), reads: W("reads"), lights: W("lights"), up: W("up", 1, "end"),
  forThis: W("for"), pumpkin: W("pumpkin"), pumpkinEnd: W("pumpkin", 1, "end"),
};

// Visual beats (film seconds). Holes start dark (just holes); they glow when the brain decides it is a face.
export const BEAT = {
  eyeL: [EV.two - 0.02, EV.two + 0.20],          // left hole cut in (dithered)
  eyeR: [EV.holes - 0.02, EV.holes + 0.20],      // right hole cut in
  mouth: [EV.line - 0.02, EV.line + 0.30],       // the line is drawn left→right
  brainIn: [EV.brain - 0.08, EV.brain + 0.32],   // the face-area brain fades in
  glowUp: [EV.sees + 0.08, EV.face + 0.02],      // holes and line light up: the decision
  brackets: [EV.face - 0.10, EV.face + 0.12],    // face box snaps around the face
  cardIn: [EV.sixth - 0.34, EV.sixth - 0.12],    // timer card fades in
  count: [EV.sixth, EV.sixth + 0.17],            // 0 → 165 ms, on "sixth"
  patchLit: [EV.sixth + 0.17, EV.sixth + 0.41],  // face area lights up at 165 ms
  labelIn: [EV.area - 0.04, EV.area + 0.16],     // "FACE AREA" tag on "area"
  pulse: [EV.lights, EV.up],                     // ring on "lights up"
  arc: [EV.forThis, EV.forThis + 0.76],          // light travels from the pumpkin to the face area
  pumpkinGlow: [EV.pumpkin, EV.pumpkin + 0.30],  // the pumpkin itself brightens on "pumpkin"
  outOut: [8.10, 8.36],                          // timer card, tag and box fade out
  dim: [8.40, 8.70],                             // features go dark: just holes
  back: [9.00, 9.30],                            // the face comes back
};
export const CAP_SHOW = 0.12;                    // captions appear 0.12 s before their first word

// motions → sound (each sound lasts exactly its motion; kinds are synthesised in synth.mjs)
export const MOTIONS = [
  { t0: BEAT.eyeL[0], t1: BEAT.eyeL[1], kind: "cut", gain: 1, note: "left hole cut" },
  { t0: BEAT.eyeR[0], t1: BEAT.eyeR[1], kind: "cut", gain: 0.9, note: "right hole cut" },
  { t0: BEAT.mouth[0], t1: BEAT.mouth[1], kind: "zip", gain: 1, note: "line drawn" },
  { t0: BEAT.brainIn[0], t1: BEAT.brainIn[1], kind: "blip", gain: 1, note: "brain appears" },
  { t0: BEAT.glowUp[0], t1: BEAT.glowUp[1], kind: "glow", gain: 1, note: "holes light up" },
  { t0: BEAT.brackets[0], t1: BEAT.brackets[1], kind: "chime", gain: 1, note: "face detected" },
  { t0: BEAT.cardIn[0], t1: BEAT.cardIn[1], kind: "blip", gain: 0.6, note: "timer card in" },
  { t0: BEAT.count[0], t1: BEAT.count[1], kind: "tick", gain: 1, note: "count to 165 ms" },
  { t0: BEAT.patchLit[0], t1: BEAT.patchLit[1], kind: "rise", gain: 0.8, note: "face area lit" },
  { t0: BEAT.labelIn[0], t1: BEAT.labelIn[1], kind: "blip", gain: 0.5, note: "FACE AREA tag" },
  { t0: BEAT.pulse[0], t1: BEAT.pulse[1], kind: "ping", gain: 1, note: "lights up pulse" },
  { t0: BEAT.arc[0], t1: BEAT.arc[1], kind: "whoosh", gain: 1, note: "light travels to the face area" },
  { t0: BEAT.dim[0], t1: BEAT.dim[1], kind: "fall", gain: 1, note: "just holes" },
  { t0: BEAT.back[0], t1: BEAT.back[1], kind: "rise", gain: 1, note: "face returns" },
];

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const frac = (x) => x - Math.floor(x);
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
