// «Only the red ghost is chasing you» timeline: every event is anchored to a measured word of the single voice take.
// Loop film: END is chosen so the pause at the seam (last voice sound 48.72 s → END → first sound 0.06 s) is a sentence
// pause (0.41 s). The game runs on its own clock τ: dτ/dt = SCALE(t) slows the maze down for the explanations (never a
// one-frame stop), and the loop needs τ(END) − τ(0) to be one whole lap of Pac-Man's route.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1472 / FPS; // 49.067 s

export const EV = {
  red: W("red"), chasing: W("chasing"),
  other: W("other"), rules: W("rules."),
  every: W("every"), aims: W("aims"), target: W("target"), square: W("square."),
  turn: W("turn,"), picks: W("picks"), closest: W("closest"), never: W("never"), back: W("back."),
  redT: W("red's"), you2: W("you.", 2),
  pink: W("pink"), four: W("four"), squares: W("squares"), front: W("front"), cut: W("cut"), off: W("off."),
  blue: W("blue"), strangest: W("strangest."), takes: W("takes"), two: W("two"), ahead: W("ahead"), draws: W("draws"), line: W("line"), fromRed: W("red", 2), doubles: W("doubles"), doublesEnd: W("doubles", 1, "end"),
  so: W("so", 2), both: W("both"), sides: W("sides."),
  orange: W("orange"), far: W("far"), away: W("away."), within: W("within"), eight: W("eight"), turns: W("turns", 2), heads: W("heads"), corner: W("corner."),
  why: W("why"), chase: W("chase"), toru: W("toru"), designed: W("designed"), oneLine: W("one", 2), boring: W("boring."), boringEnd: W("boring.", 1, "end"),
  level: W("level,"), stop: W("stop"), run: W("run"), corners: W("corners"), seconds: W("seconds."),
  breathe: W("breathe."), next: W("next"), trap: W("trap"), remember: W("remember:"),
};

// ---------------------------------------------------------------- game clock
// Slow-motion windows {a, b, k}: the clock eases from 1 down to k over 0.45 s after a, holds, and eases back by b.
export const SLOW = [
  { a: EV.turn - 0.55, b: EV.back + 0.2, k: 0.16 },        // the decision at a crossing
  { a: EV.pink + 0.1, b: EV.off + 0.1, k: 0.55 },          // counting four squares ahead
  { a: EV.takes - 0.45, b: EV.so - 0.05, k: 0.05 },        // Blue's construction: almost a freeze
  { a: EV.within - 0.3, b: EV.corner + 0.3, k: 0.6 },      // Orange crossing the circle
];
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export function SCALE(t) {
  let s = 1;
  for (const w of SLOW) { const into = ease((t - w.a) / 0.45), out = ease((t - (w.b - 0.45)) / 0.45), d = Math.min(into, 1 - out); s = Math.min(s, 1 - (1 - w.k) * d); }
  return s;
}
// τ(t) by integration at 1/600 s; τ(0) = 0
const STEP = 1 / 600, TAU = new Float64Array(Math.ceil((END + 2) / STEP) + 2);
for (let i = 1; i < TAU.length; i++) { const t = (i - 0.5) * STEP; TAU[i] = TAU[i - 1] + SCALE(t) * STEP; }
export function tau(t) { const u = t / STEP, i = Math.max(0, Math.min(TAU.length - 2, Math.floor(u))), k = u - i; return TAU[i] + (TAU[i + 1] - TAU[i]) * k; }
export const TAU_END = tau(END);
