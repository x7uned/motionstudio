// «How your cat drinks» timeline: every event and camera key is anchored to a measured word of the single voice take.
// Loop film: END is chosen so the pause at the seam (last sound → END → first word) matches a sentence pause (~0.43 s).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1397 / FPS; // 46.567 s; last sound 46.22 s + onset 0.08 s → seam pause 0.43 s

// the cat laps continuously at about 4 per second; the rate is nudged so whole laps fill the loop
export const LAP_HZ = Math.round(4 * END) / END;

export const EV = {
  scoop: W("scooping"), drop: W("drop.", 1, "end"),
  four: W("four"), see: W("see.", 1, "end"),
  camIn: [W("so") - 0.05, W("mit") + 0.35], mit: W("mit"), rec: W("filmed"), name: W("cutta"), hs: W("high-speed"),
  diveIn: [W("camera.", 1, "end") - 0.35, W("saw.") + 0.25], macroIn: [W("here's") + 0.15, W("saw.") + 0.4],
  slow: W("here's"),
  curl: W("curls"), top: W("top"), touch: W("touches", 2),
  pull: W("pulls"), fast: W("fast", 2),
  sticks: W("sticks"), rises: W("rises"), column: W("column."),
  gravity: W("gravity"), down: W("down."),
  shuts: W("shuts"), moment: W("moment,"), before: W("before"), falls: W("falls."),
  late: W("too", 2), empty: W("empty."),
  macroOut: [W("empty.", 1, "end") - 0.1, W("lions") + 0.55],
  lions: W("lions"), tigers: W("tigers"), slower: W("slower,"), bigger: W("bigger."),
  dogsPan: [W("bigger.", 1, "end") - 0.05, W("water", 5) + 0.25], dogs: W("dogs"), sameWay: W("same", 2), harder: W("harder."), splash: W("splash"),
  backPan: [W("much", 2) + 0.1, END],
  lap1: W("lap,", 1), lap2: W("lap,", 2), lap3: W("lap,", 3), remember: W("remember:"),
};
// the jaw pinches the column just before the lower part falls back
EV.pinch = EV.before + 0.05;
// the zoom out from the macro lands on the wide kitchen by "same trick"
EV.wideAt = W("same");

// Camera keys {t, cx, cy, z}: screen = (270 + (wx - cx)·z, 520 + (wy - cy)·z). Eased between keys; zoom in log space.
export const K0 = { cx: -35, cy: -24, z: 4.2 };
export const CAM = [
  { t: 0, ...K0 }, { t: EV.camIn[0], ...K0 },
  { t: EV.camIn[1] + 0.3, cx: -78, cy: -44, z: 2.0 }, { t: EV.diveIn[0], cx: -78, cy: -44, z: 2.0 },
  { t: EV.diveIn[1], cx: -5, cy: -10, z: 9 }, { t: EV.macroOut[0], cx: -5, cy: -10, z: 9 },
  { t: EV.wideAt, cx: -40, cy: -128, z: 1.05 }, { t: EV.dogsPan[0], cx: -40, cy: -128, z: 1.05 },
  { t: EV.dogsPan[1], cx: 312, cy: -50, z: 2.8 }, { t: EV.backPan[0], cx: 312, cy: -50, z: 2.8 },
  { t: END, ...K0 }, { t: END + 10, ...K0 },
];
