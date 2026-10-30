// «Pumpkin face» (effort experiment, sonnet-high) — timeline. One voice take (Dennis · Eleven v4), placed at t = 0.30 s.
// Every beat is anchored to a measured word. END = 10.0 s = 300 frames.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE_AT = 0.30;
const raw = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
export const VOICE = { ...raw, words: raw.words.map((w) => ({ ...w, start: +(w.start + VOICE_AT).toFixed(3), end: +(w.end + VOICE_AT).toFixed(3) })) };
export const WORDS = VOICE.words;
export const FPS = 30, END = 10.0;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of WORDS) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }

export const EV = {
  two: W("Two"), holes: W("holes"), holesEnd: W("holes", 1, "end"), line: W("line,"), lineEnd: W("line,", 1, "end"),
  your: W("your"), brain: W("brain"), sees: W("sees"), face: W("face."), faceEnd: W("face.", 1, "end"),
  in: W("In"), sixth: W("sixth"), second: W("second,"), secondEnd: W("second,", 1, "end"),
  area: W("area"), reads: W("reads"), faces: W("faces"), lights: W("lights"), up: W("up"), upEnd: W("up", 1, "end"),
  forW: W("for"), thisW: W("this"), pumpkin: W("pumpkin."), pumpkinEnd: W("pumpkin.", 1, "end"),
};
/** Beats (seconds). Each one starts on its word and its length is the length of its motion (the sound copies it). */
export const B = {
  hole1: [EV.two - 0.04, EV.two + 0.30],             // left hole dissolves open
  hole2: [EV.holes - 0.04, EV.holes + 0.30],         // right hole
  line:  [EV.line, EV.lineEnd - 0.12],               // the mouth line is drawn across
  guide: [EV.brain - 0.1, EV.face - 0.04],           // dotted "perception" guides join the three marks
  decide:[EV.face, EV.face + 0.42],                  // the brain decides: face box snaps in, candle lights, grin
  clock: [EV.in, EV.secondEnd],                      // a sixth of a second: pie fills, 0 → 165 ms
  cam:   [EV.second + 0.2, EV.reads - 0.14],         // pumpkin settles smaller, brain dithers in
  beam:  [EV.reads - 0.1, EV.lights + 0.02],         // signals travel from the eyes to the face area
  label: [EV.faces, EV.faces + 0.4],
  glow:  [EV.lights, EV.up + 0.1],                   // the face area lights up
  answer:[EV.thisW + 0.06, EV.pumpkin + 0.38],       // light answers back to the pumpkin, both glow together
  wink:  [8.45, 8.85],
  back:  [9.0, 9.85],                                // payoff: the brain lets go, the camera returns to the big grinning pumpkin
};
