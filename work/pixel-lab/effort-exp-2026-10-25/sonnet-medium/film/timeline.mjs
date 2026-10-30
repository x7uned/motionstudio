// «Pumpkin face» (effort experiment, sonnet-medium). One take, voice placed at 0.30 s. All beats are anchored to measured words.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const OFF = 0.30, FPS = 30, END = 10.0, GW = 540, GH = 960;
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
export const WORDS = VOICE.words.map((w) => ({ ...w, start: +(w.start + OFF).toFixed(3), end: +(w.end + OFF).toFixed(3) }));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of WORDS) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error("word not found " + text); }
export const EV = {
  two: W("two"), holes: W("holes"), line: W("line,"), lineEnd: W("line,", 1, "end"), brain: W("brain"), sees: W("sees"), face: W("face."), faceEnd: W("face.", 1, "end"),
  sixth: W("sixth"), second: W("second,"), secondEnd: W("second,", 1, "end"), area: W("area"), reads: W("reads"), faces: W("faces"), lights: W("lights"), up: W("up"), upEnd: W("up", 1, "end"),
  pumpkin: W("pumpkin."), pumpkinEnd: W("pumpkin.", 1, "end"),
};
// Beat windows (seconds). The picture and the synth both read these, so every sound lasts exactly its motion.
export const B = {
  eyeL: [EV.two, EV.two + 0.36], eyeR: [EV.holes, EV.holes + 0.36], mouth: [W("and", 1) + 0.04, EV.lineEnd],
  brainIn: [W("and", 2), EV.brain + 0.5],
  sig1: [EV.sees, EV.face + 0.45], ignite: [EV.face - 0.25, EV.face + 0.2], ring: [EV.face + 0.02, EV.face + 0.62],
  card: [EV.sixth - 0.38, EV.sixth - 0.14], count: [EV.sixth - 0.14, EV.secondEnd], sig2: [EV.sixth - 0.1, EV.secondEnd + 0.1],
  glow: [EV.area, EV.lights - 0.22], label: [EV.area + 0.15, EV.reads + 0.15], surge: [EV.lights - 0.04, EV.up + 0.14],
  dim: [8.35, 8.95], relight: [9.2, 9.75],
};
