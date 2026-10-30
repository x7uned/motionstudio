// «Pumpkin face» (effort experiment xhigh, 2026-10-25) — the film's single source of truth.
// One shared voice take (Dennis · Eleven v4, [thoughtful]) placed at t = 0.30 s: film time = words.json time + 0.30.
// Every beat below is anchored to a measured word; the picture, the sound (MOTIONS) and the captions read only these.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE_FILE = HERE + "../../common/voice/voice-raw.wav";
const RAW = JSON.parse(fs.readFileSync(HERE + "../../common/voice/words.json", "utf8"));
export const VOICE_AT = 0.3;
export const FPS = 30, FRAMES = 300, END = FRAMES / FPS;          // exactly 10.0 s
export const TEXT = RAW.text;
export const WORDS = RAW.words.map((w) => ({ ...w, start: w.start + VOICE_AT, end: w.end + VOICE_AT }));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of WORDS) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }

export const EV = {
  two: W("two"), holes: W("holes"), line: W("line,"), lineEnd: W("line,", 1, "end"),
  your: W("your"), brain: W("brain"), sees: W("sees"), face: W("face."), faceEnd: W("face.", 1, "end"),
  in: W("in"), sixth: W("sixth"), second: W("second,"), secondEnd: W("second,", 1, "end"),
  the: W("the"), area: W("area"), reads: W("reads"), faces: W("faces"), facesEnd: W("faces", 1, "end"),
  lights: W("lights"), up: W("up"), upEnd: W("up", 1, "end"), for: W("for"), this: W("this"), pumpkin: W("pumpkin."), pumpkinEnd: W("pumpkin.", 1, "end"),
};

/** Beat windows [t0, t1] (seconds). Each motion and its sound use the same window. */
export const B = {
  drop: [0, 0.26],                                   // the pumpkin is set down on the hay bale (already falling in frame 0)
  squash: [0.26, 0.6],                               // landing squash / settle + dust
  hole1: [EV.two - 0.02, EV.two + 0.22],             // first round hole punches out on "Two"
  hole2: [EV.holes, EV.holes + 0.24],                // second on "holes"
  line: [EV.line - 0.02, EV.lineEnd - 0.04],         // the slit is cut left → right across the word "line,"
  pull: [1.92, 2.86],                                // camera pulls back: the child looking at the pumpkin enters
  xray: [EV.brain - 0.04, EV.brain + 0.42],          // scan line sweeps down the head: the brain is revealed on "brain"
  sight: [EV.sees - 0.04, EV.sees + 0.5],            // light runs from the pumpkin's face into the child's eye on "sees"
  lock: [EV.sees + 0.16, EV.face],                   // face brackets close in and lock on "face."
  blink: [EV.face + 0.06, EV.face + 0.38],           // the pumpkin blinks: now it is a face
  unlock: [EV.in + 0.08, EV.in + 0.48],              // brackets fold away
  cardIn: [EV.in - 0.16, EV.in + 0.24],              // tombstone stopwatch card rises in
  sweep: [EV.in + 0.02, EV.secondEnd - 0.02],        // hand sweeps one sixth, counter 0 → 165 ms, signal runs eye → back → face area
  arrive: [EV.secondEnd - 0.02, EV.secondEnd + 0.3], // spark where the signal lands
  mark: [EV.the, EV.area + 0.24],                    // the face area is outlined and labelled on "the area"
  light: [EV.lights - 0.02, EV.upEnd - 0.06],        // it lights up on "lights up"
  link: [EV.for, EV.pumpkin + 0.04],                 // a dotted link runs from the face area to this pumpkin
  flare: [EV.pumpkin, EV.pumpkin + 0.48],            // the pumpkin's light surges on "pumpkin."
  cardOut: [7.72, 8.16],                             // the card folds away after the last word
  linkOut: [8.62, 9.02],
  wink: [8.42, 8.84],                                // payoff: the pumpkin winks at the child…
  smile: [8.5, 9.02],                                // …and its line bends into a smile
  bat: [8.2, 9.75],                                  // a bat crosses the moon
};

/** Camera keys: world = the wide composition at z = 1 (grid coords). Close-up on the pumpkin first, then the wide two-shot. */
export const CAM_KEYS = [
  [0.0, { cx: 354, cy: 478, z: 1.86 }],
  [B.pull[0], { cx: 354, cy: 484, z: 1.95 }],
  [B.pull[1], { cx: 270, cy: 450, z: 1.0 }],
  [7.9, { cx: 272, cy: 450, z: 1.025 }],
  [END, { cx: 282, cy: 448, z: 1.075 }],
];
