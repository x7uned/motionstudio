// One timeline for picture and sound: every event is anchored to a measured word of the single voice take.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word. */
export function W(text, n = 1, edge = "start") {
  let k = 0;
  for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge];
  throw new Error(`word not found: ${text} #${n}`);
}
export const FPS = 30;
const lastEnd = words[words.length - 1].end;
export const END = Math.ceil((lastEnd + 1.25) * FPS) / FPS;

// Camera: z = 1 diorama, 0 globe overview. Each zoom has its exact start/end, shared with its sound.
export const ZOOMS = [
  { city: "tokyo", from: 1, to: 0, t0: W("you're") , t1: W("you're") + 2.3 },          // pull back to the planet
  { city: "tokyo", from: 0, to: 1, t0: W("london") + 0.75, t1: W("london") + 2.2 },       // back into Tokyo
  { city: "tokyo", from: 1, to: 0, t0: W("passes") - 0.05, t1: W("passes") + 1.75 },      // out to the network
  { city: "london", from: 0, to: 1, t0: W("london", 2) + 0.25, t1: W("london", 2) + 1.85 }, // into night London
  { city: "london", from: 1, to: 0, t0: W("approved", 2) + 0.3, t1: W("approved", 2) + 1.3 }, // out for the race back
];
export const EV = {
  tally: [W("ten"), W("day.") + 0.1],
  question: W("approved"),
  tap: { move: W("follow"), contact: W("follow") + 0.36, release: W("follow") + 0.86, back: W("follow") + 1.1 },
  tokyoPin: W("tokyo,") + 0.55,
  londonPin: W("london."),
  arc: [W("london."), W("london.") + 0.7],
  stamp: W("one-time"),
  sendLocal: [W("sends"), W("sends") + 1.35],
  unknown: W("doesn't"),
  hud: [W("passes") + 0.6, W("but") + 0.35],
  nodes: [W("network,"), W("network,") + 0.6],
  visa: W("visa"), mastercard: W("mastercard:"), logosOut: W("floor.") + 0.35,
  web: [W("web"), W("centers")],
  cables: [W("cables"), W("floor.") + 0.3],
  travel: [W("sends", 2), W("sends", 2) + 2.2],
  panel: W("london", 2) + 1.85,
  checks: [W("code,", 2), W("balance,"), W("you", 3)],
  approved: W("approved", 2),
  race: [W("approved", 2) + 1.3, W("beep.")],
  beep: W("beep."),
  counter: [W("more"), W("more") + 1.6],
  seconds: W("few"),
  counterOut: W("but"),
  hold: W("hold"),
  days: [W("day", 2) - 0.1, W("later,")],
  settle: [W("settle") - 0.2, W("settle") + 2.7],
  unlock: W("settle") - 0.2,
  fee: W("fee"),
  outroIn: [W("want") - 0.4, W("want")],
  point: W("follow", 2) - 0.35,
  kagenamiEnd: W("kagenami.", 1, "end"),
};
EV.click = EV.kagenamiEnd + 0.08;
EV.toggle = EV.click + 0.16;
export const WORDS = words;
