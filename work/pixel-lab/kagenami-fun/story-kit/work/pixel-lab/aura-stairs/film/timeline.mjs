// «Aura stairs» — timeline. The voice is one ElevenLabs take (Dennis · v4, [excited]); word times moved onto Scribe.
// The music is the user's TikTok track (music/source.mp3) from its drop: film t = 0 is source 24.000 s. Its 808 accents
// fall on a 0.666 s grid (24.23 + 0.666·k); every step lands on one of them. "time" starts the slow-down: world time τ
// slows to 8 %, the music tape-slows to 55 %.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { clamp01, sm } from "./layout.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 156 / FPS; // 5.2 s

export const EV = {
  every: W("every"), step: W("step"), take: W("take,"), aura: W("aura"), goes: W("goes"), up: W("up."), upEnd: W("up.", 1, "end"),
  then: W("then"), time: W("time"), slows: W("slows"), down: W("down."), downEnd: W("down.", 1, "end"),
};
export const MUSIC = { file: "music/source.mp3", from: 24.0 };
/** Step landings (world time τ; = film time before the slow-down): music accents 24.27, 24.90, 25.56, 26.22, 26.89 (grid). */
export const LAND = [0.27, 0.90, 1.56, 2.22, 2.89, 3.80];   // the 6th lands only after the film: time stops with his foot in the air
export const Q0 = 0.55;                      // stair progress at t = 0: he is already mid-stride when the film opens

// ---------------------------------------------------------------- the slow-down
export const SLOW = { a: EV.time - 0.06, b: EV.time + 0.34, rate: 0.08 };
const rate = (t) => 1 - (1 - SLOW.rate) * sm(t, SLOW.a, SLOW.b);
/** World time τ(t) = ∫ rate dt (numeric, exact enough at 1 ms). */
export function tau(t) {
  if (t <= SLOW.a) return t;
  let s = SLOW.a; const dt = 0.001; for (let x = SLOW.a; x < t; x += dt) s += rate(Math.min(t, x + dt / 2)) * Math.min(dt, t - x);
  return s;
}
export const slowK = (t) => sm(t, SLOW.a, SLOW.b);            // 0 → 1 as time stops
export const musicRate = (t) => 1 - 0.45 * sm(t, SLOW.a, SLOW.a + 0.5);

/** Stair progress q(τ): q = n exactly when the n-th step lands (LAND[n − 1]); eased between, so each step is planted. */
export function stairQ(T) {
  // segment before the first landing: q goes Q0 → 1 over [0, LAND[0]]
  if (T <= LAND[0]) return Q0 + (1 - Q0) * blend((T - (LAND[0] - (LAND[1] - LAND[0]))) / (LAND[1] - LAND[0]), (0 - (LAND[0] - (LAND[1] - LAND[0]))) / (LAND[1] - LAND[0]));
  for (let i = 0; i + 1 < LAND.length; i++) if (T <= LAND[i + 1]) return i + 1 + blend((T - LAND[i]) / (LAND[i + 1] - LAND[i]));
  return LAND.length;
}
// half eased: deliberate, heavy steps that still keep moving
function blend(u, u0 = 0) {
  const f = (x) => { x = clamp01(x); const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; return 0.45 * x + 0.55 * e; };
  if (u0 === 0) return f(u);
  return (f(u) - f(u0)) / (1 - f(u0));
}
/** How many steps have landed by world time T (continuous ramp 0.22 s after each landing). */
export function level(T) { let L = 0; for (const l of LAND) L += sm(T, l - 0.02, l + 0.22); return L; }
