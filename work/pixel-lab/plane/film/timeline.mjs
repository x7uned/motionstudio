// Airplane-mode film timeline: every event and camera key is anchored to a measured word of the single voice take.
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
  ding: 0.25, toggleShow: [0.3, W("spoiler:") - 0.2],
  crashOk: [W("plane"), W("sky.", 1, "end") + 0.3],
  badFlight: [W("phone"), W("flight.", 1, "end") + 0.2], bars: [W("phone"), W("about") - 0.1],
  tenKm: [W("ten"), W("shouting:") - 0.2], weak: [W("barely"), W("tower,", 1, "end")],
  shout: W("shouting:"), power: [W("turns"), W("power")], rings: [W("radio"), W("again", 2, "end") + 0.4], again: [W("again", 1), W("and", 2), W("again", 2)],
  battery: [W("battery"), W("flight.", 2, "end") + 0.3],
  towers: [W("cell"), W("ground,")], car: [W("expects"), W("car,", 1, "end")], handoff: W("few"),
  fly: [W("not"), W("hour.", 1, "end")], speed: W("nine"),
  many: [W("reach"), W("once,", 1, "end")], confuse: [W("confuses"), W("below.", 1, "end") + 0.4],
  fcc: [W("us,"), W("aviation.", 1, "end") + 0.4], fccLogo: W("fcc,"), banned: W("ban"),
  cockpit: [W("then"), W("cockpit.")], bursts: [W("short"), W("bursts,", 1, "end") + 0.3],
  buzz: [W("buzz"), W("talking.", 1, "end") + 0.2], mosquito: [W("mosquito,"), W("talking.", 1, "end")], atc: [W("air"), W("talking.", 1, "end") + 0.5],
  one: W("one"), annoyance: W("annoyance."), twoHundred: [W("two"), W("hundred.", 2, "end") + 0.6],
  pico: [W("tiny"), W("cabin,", 1, "end")], sat: [W("linked"), W("satellite,", 1, "end")], whisper: [W("whisper"), W("shout.", 1, "end")],
  flip: W("flip"), sleep: [W("switch.") + 0.1, W("want") - 0.4],
  outroIn: [W("want") - 0.4, W("want")], point: W("follow") - 0.35, kagenamiEnd: W("kagenami.", 1, "end"),
};
EV.click = EV.kagenamiEnd + 0.08; EV.toggle = EV.click + 0.16;

// World: plane floor at y = 0 (plane-local x −220 … 240, nose to the right), clouds 160…360 below, ground y = 900,
// satellite y = −820. Camera {cx, cy, z}: screen = (270 + (wx − cx)·z, 520 + (wy − cy)·z), log-z eased between keys.
export const SEAT = { x: 12, y: 0 };      // the hero's seat
export const COCKPIT = { x: 196, y: -22 };
const close = { cx: 17, cy: -24, z: 6.2 }, plane = { cx: 10, cy: -30, z: 1.15 }, high = { cx: 30, cy: 420, z: 0.46 };
export const CAM = [
  { t: 0, ...close }, { t: W("spoiler:") - 0.1, ...close }, { t: W("plane") + 0.2, ...plane }, { t: W("phone") - 0.2, ...plane },
  { t: W("just") + 0.2, cx: 16, cy: -26, z: 3.2 }, { t: W("flight.", 1, "end") - 0.1, cx: 16, cy: -26, z: 3.2 },
  { t: W("ten") + 0.3, ...high }, { t: W("battery") - 0.2, ...high }, { t: W("battery") + 0.3, cx: 10, cy: 300, z: 0.6 },
  { t: W("cell") - 0.2, cx: 10, cy: 300, z: 0.6 }, { t: W("antennas") + 0.1, cx: -60, cy: 830, z: 1.5 },
  { t: W("car,", 1, "end"), cx: 20, cy: 830, z: 1.5 }, { t: W("dozens") + 0.2, ...high }, { t: W("aviation.", 1, "end") + 0.2, ...high },
  { t: W("cockpit.") + 0.1, cx: COCKPIT.x - 6, cy: COCKPIT.y - 4, z: 4.2 }, { t: W("talking.", 1, "end") + 0.4, cx: COCKPIT.x - 6, cy: COCKPIT.y - 4, z: 4.2 },
  { t: W("plane", 2) + 0.2, ...plane }, { t: W("tiny") - 0.1, ...plane }, { t: W("satellite,") + 0.1, cx: 30, cy: -186, z: 0.43 },
  { t: W("satellite,", 1, "end") + 0.1, cx: 30, cy: -186, z: 0.43 }, { t: W("whisper") + 0.2, cx: 40, cy: -32, z: 1.6 }, { t: W("shout.", 1, "end") + 0.1, cx: 40, cy: -32, z: 1.6 },
  { t: W("flip") - 0.15, ...close }, { t: 80, ...close },
];
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * k) };
}
