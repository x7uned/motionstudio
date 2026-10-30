// «Pumpkin face» (effort experiment, high) — the single source of truth for time. 10.0 s, 300 frames at 30 fps.
// One shared voice take (common/voice), placed at VOICE_AT; every beat below is anchored to a measured word.
// Picture (render.mjs) and sound (synth.mjs) both read these windows, so each sound lasts exactly its motion.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE_DIR = HERE + "../../common/voice/";
export const VOICE = JSON.parse(fs.readFileSync(VOICE_DIR + "words.json", "utf8"));
export const FPS = 30, FRAMES = 300, END = FRAMES / FPS, VOICE_AT = 0.3;
export const WORDS = VOICE.words.map((w) => ({ ...w, start: w.start + VOICE_AT, end: w.end + VOICE_AT }));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of WORDS) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }

export const EV = {
  two: W("two"), holes: W("holes"), line: W("line,"), lineEnd: W("line,", 1, "end"),
  brain: W("brain"), sees: W("sees"), face: W("face."), faceEnd: W("face.", 1, "end"),
  sixth: W("sixth"), second: W("second,"), secondEnd: W("second,", 1, "end"),
  area: W("area"), reads: W("reads"), faces: W("faces"), facesEnd: W("faces", 1, "end"),
  lights: W("lights"), up: W("up"), upEnd: W("up", 1, "end"),
  for: W("for"), pumpkin: W("pumpkin."), pumpkinEnd: W("pumpkin.", 1, "end"),
};

/** Beat windows [t0, t1] (seconds of film time). */
export const B = {
  eye1: [EV.two - 0.06, EV.two + 0.3],          // left hole: moon-blue outline draws round it
  eye2: [EV.holes - 0.06, EV.holes + 0.3],      // right hole
  line: [EV.line, EV.line + 0.55],              // the slit is traced left → right
  brainIn: [EV.brain - 0.15, EV.brain + 0.3],   // the brain card rises in (0.45 s)
  detect: [EV.sees, EV.face],                   // face brackets close in on the holes and the line
  hiOut: [EV.face, EV.face + 0.35],             // the blue diagram outlines dissolve: it is a face now
  ignite: [EV.face - 0.02, EV.face + 0.45],     // the candle inside catches: holes glow
  smile: [EV.face + 0.05, EV.face + 0.6],       // the line bends into a grin
  detectOut: [EV.face + 0.75, EV.face + 1.15],  // brackets dissolve
  timerIn: [EV.sixth - 0.3, EV.sixth + 0.15],   // the timer card rises in
  count: [EV.sixth, EV.secondEnd],              // 0 → 165 ms, the pie fills one sixth
  area: [EV.area, EV.area + 0.35],              // the face area is outlined on the brain
  label: [EV.reads - 0.05, EV.reads + 0.3],     // "FACE AREA" label
  glow: [EV.lights, EV.upEnd],                  // the face area lights up
  ring: [EV.lights + 0.08, EV.lights + 0.7],    // one ring of light spreads from it
  beam: [EV.for, EV.pumpkin + 0.35],            // light travels from the face area to the pumpkin
  flare: [EV.pumpkin + 0.3, EV.pumpkinEnd + 0.1], // the pumpkin's glow answers
  hop: [8.2, 8.62],                             // payoff: a happy little hop
  wink: [8.66, 9.06],                           // and a wink at the viewer
  timerOut: [9.12, 9.57], brainOut: [9.27, 9.72], // cards fold away
  dim: [9.25, 9.97],                            // candle goes out, grin flattens to a line: back to frame 0 (loop)
  camIn: [0, 7.6], camOut: [9.1, 9.97],         // slow push-in on the pumpkin and back
};
export const COUNT_MS = 165;

/** Sound events: one per visible motion, durations straight from B. */
export const MOTIONS = [
  { t0: B.eye1[0] + 0.06, t1: B.eye1[1], kind: "blip", note: 69 },
  { t0: B.eye2[0] + 0.06, t1: B.eye2[1], kind: "blip", note: 72 },
  { t0: B.line[0], t1: B.line[1], kind: "trace" },
  { t0: B.brainIn[0], t1: B.brainIn[1], kind: "whoosh" },
  { t0: B.detect[0], t1: B.detect[1], kind: "detect" },
  { t0: B.ignite[0], t1: B.ignite[1], kind: "ignite" },
  { t0: B.timerIn[0], t1: B.timerIn[1], kind: "whoosh", pan: 0.35 },
  { t0: B.count[0], t1: B.count[1], kind: "count" },
  { t0: B.count[1], t1: B.count[1] + 0.3, kind: "ding" },               // the readout settles on 165 and warms
  { t0: B.area[0], t1: B.area[1], kind: "sparkle" },
  { t0: B.glow[0], t1: B.glow[1], kind: "glow" },
  { t0: B.ring[0], t1: B.ring[1], kind: "ring" },
  { t0: B.beam[0], t1: B.beam[1], kind: "beam" },
  { t0: B.hop[0], t1: B.hop[1], kind: "boing" },
  { t0: B.wink[0], t1: B.wink[1], kind: "wink" },
  { t0: B.timerOut[0], t1: B.brainOut[1], kind: "fold" },
  { t0: B.dim[0], t1: B.dim[1], kind: "fall" },
];
