// Dog film timeline: every event and camera key is anchored to a measured word of the single voice take.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = Math.ceil((words[words.length - 1].end + 1.25) * FPS) / FPS;

export const EV = {
  walk: [0, 2.2], shake1: [2.3, 5.05], meter: [1.5, 2.3, 4.4], seconds: W("seconds."),
  freeze: [4.86, 7.3], physics: W("physics."),
  macroIn: [7.35, 8.55], macroOut: [17.45, 18.6],
  evap: W("evaporation"), lb60: W("sixty-pound"), lb1: W("one"), drain: [W("burn"), W("calories") + 0.45], fifth: W("fifth"),
  shake2: [W("spins") + 0.05, W("away.") + 0.5],
  slowmo: W("labrador"), counter: W("four"),
  spine: W("spine"), skin: W("skin"), x3: W("three"), flung: W("flung"),
  dropIn: [31.5, 32.5], dropOut: [37.55, 38.4], force: W("that"), detach: W("pulls"), gmeter: [W("ten"), W("gravity.") + 0.2],
  lineup: W("smaller"), circle: W("tighter"), lbl30: W("thirty"), lbl18: W("eighteen."), lbl4: W("four", 2),
  dots: [W("thirty-three"), W("mammals") + 0.45], trend: [W("rule:"), W("rule:") + 0.7], rule: W("smaller", 2),
  soak: [W("soaks") - 0.1, W("soaks") + 1.2], surprised: W("soaks") + 0.35, washer: [W("washing"), W("cycle.") + 0.7],
  outroIn: [W("want") - 0.4, W("want")], point: W("follow") - 0.35, kagenamiEnd: W("kagenami.", 1, "end"),
};
EV.click = EV.kagenamiEnd + 0.08; EV.toggle = EV.click + 0.16;

// Camera keys {t, cx, cy, z}: screen = (270 + (wx - cx)·z, 520 + (wy - cy)·z). Eased between keys.
export const CAM = [
  { t: 0, cx: 46, cy: -132, z: 1.0 }, { t: 2.3, cx: 12, cy: -130, z: 1.08 }, { t: 4.8, cx: 0, cy: -126, z: 1.16 }, { t: 7.35, cx: 0, cy: -126, z: 1.16 },
  { t: 8.55, cx: 24, cy: -104, z: 7 }, { t: 17.45, cx: 24, cy: -104, z: 7 }, { t: 18.6, cx: 0, cy: -96, z: 1.7 }, { t: 20.2, cx: 0, cy: -96, z: 1.7 },
  { t: 21.0, cx: -6, cy: -88, z: 2.3 }, { t: 31.5, cx: -6, cy: -88, z: 2.3 }, { t: 32.5, cx: 40, cy: -102, z: 7 }, { t: 37.55, cx: 40, cy: -102, z: 7 },
  { t: 38.9, cx: 36, cy: -150, z: 0.66 }, { t: W("droplet", 2) - 0.2, cx: 36, cy: -150, z: 0.66 }, { t: W("tighter") + 0.2, cx: -262, cy: -42, z: 2.4 },
  { t: W("second.", 2) + 0.1, cx: -262, cy: -42, z: 2.4 }, { t: W("rat,") + 0.2, cx: -110, cy: -100, z: 0.95 }, { t: W("bear,") - 0.1, cx: -110, cy: -100, z: 0.95 },
  { t: W("bear,") + 0.6, cx: 200, cy: -150, z: 0.8 }, { t: W("researchers", 2) - 0.1, cx: 200, cy: -150, z: 0.8 }, { t: W("filmed", 2) + 0.2, cx: 600, cy: -112, z: 1.35 },
  { t: W("shake", 2) + 0.3, cx: 600, cy: -112, z: 1.35 }, { t: W("soaks") - 0.15, cx: -64, cy: -122, z: 1.25 }, { t: 70, cx: -64, cy: -122, z: 1.25 },
];
