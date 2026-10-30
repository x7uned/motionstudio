// «Pumpkin face» (effort experiment, medium) — timeline: the single source of truth for picture and sound.
// Voice = common/voice/voice-raw.wav placed at t = 0.30 s; every beat is anchored to a measured word.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE_FILE = HERE + "../../common/voice/voice-raw.wav";
export const VOICE_AT = 0.3;
const RAW = JSON.parse(fs.readFileSync(HERE + "../../common/voice/words.json", "utf8"));
export const VOICE = { text: RAW.text };
export const WORDS = RAW.words.map((w) => ({ ...w, start: w.start + VOICE_AT, end: w.end + VOICE_AT }));
export const FPS = 30, END = 10.0, FRAMES = 300;
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of WORDS) if (norm(w.text) === text && ++k === n) return w[edge]; throw new Error("word " + text); }

export const EV = {
  two: W("two"), holes: W("holes"), line: W("line"), lineEnd: W("line", 1, "end"),
  brain: W("brain"), face: W("face"), faceEnd: W("face", 1, "end"),
  sixth: W("sixth"), second: W("second"), secondEnd: W("second", 1, "end"),
  area: W("area"), reads: W("reads"), faces: W("faces"), lights: W("lights"), up: W("up"),
  pumpkin: W("pumpkin"), pumpkinEnd: W("pumpkin", 1, "end"),
};

// Beat windows [t0, t1] (seconds). Sound (synth.mjs) uses the same numbers: each sound lasts its motion.
export const B = {
  eyeL: [EV.two - 0.04, EV.two + 0.36],          // left hole carved
  eyeR: [EV.holes - 0.02, EV.holes + 0.38],      // right hole carved
  mouth: [EV.line - 0.02, EV.line + 0.5],        // the line cut left → right
  brain: [EV.brain - 0.1, EV.brain + 0.4],       // the brain grows in above
  counter: [EV.sixth - 0.25, EV.sixth + 0.05],   // counter card enters
  signal: [EV.sixth + 0.04, EV.secondEnd],       // signal travels eyes → face area while the counter runs 0 → 165 ms
  label: [EV.faces - 0.1, EV.faces + 0.3],       // "FACE AREA" tag
  light: [EV.lights - 0.08, EV.up + 0.18],       // the area lights up fully
  ring: [EV.lights, EV.lights + 0.7],            // pulse ring
  pumpGlow: [EV.pumpkin - 0.1, EV.pumpkin + 0.45], // the pumpkin flares on "this pumpkin"
  smile: [EV.pumpkinEnd + 0.15, EV.pumpkinEnd + 0.75], // payoff: the line bends into a grin
  wink: [EV.pumpkinEnd + 1.0, EV.pumpkinEnd + 1.45],   // and it winks
};
B.lock = [W("sees") - 0.05, EV.face + 0.15];     // face-detect brackets close in on "sees a face"
B.lockOut = [EV.faceEnd + 0.25, EV.faceEnd + 0.6];
B.trailOut = [EV.area + 0.35, EV.area + 0.8];
