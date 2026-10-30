// «Infinite aura» (full brainrot film for the friend's pixel channel, 2026-10-25) — timeline. One voice take (Dennis · v4,
// [excited]); word times moved onto Scribe. The music is the user's TikTok track (music/source.mp3), edited to the voice
// (music.mjs): track 15.19 s at film 0 so its first drop (track 24.01) lands on "Ten thousand aura" (film 8.82); on
// "Time" it tape-stops; the end of its break leads into the second drop (track 45.49) on "One billion" (film 27.62).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { clamp01, sm } from "./layout.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;

export const EV = {
  every: W("every"), up: W("up."),
  hundred: W("one", 1), watching: W("watching"), watchingEnd: W("you", 2, "end"),
  thousand: W("one", 2), lasers: W("lasers"), lasersEnd: W("now.", 1, "end"),
  ten: W("ten"), dinosaurs: W("dinosaurs"), wake: W("wake"), wakeEnd: W("up.", 2, "end"),
  fifteen: W("fifteen"), meteors: W("meteors"), falling: W("falling."),
  twenty: W("twenty"), everything: W("everything"), explodes: W("explodes."), dont1: W("don't", 1), look: W("look."), lookEnd: W("look.", 1, "end"),
  fifty: W("fifty"), moon: W("moon"), staring: W("staring"), starEnd: W("you", 4, "end"),
  hundredK: W("one", 3), aliens: W("aliens"), autograph: W("autograph."), autographEnd: W("autograph.", 1, "end"),
  million: W("one", 4), millionAura: W("aura", 5), time: W("time"), stops: W("stops."), you2: W("you", 5), dont2: W("don't", 2),
  billion: W("one", 5), planet: W("planet"), small: W("small"), smallEnd: W("you", 6, "end"),
  infinite: W("infinite"), infiniteEnd: W("aura", 6, "end"),
  how: W("how"), honest: W("honest."), honestEnd: W("honest.", 1, "end"),
};
export const MUSIC = { file: "music/source.mp3", A: { from: 15.19, film: 0, to: EV.time }, B: { from: 44.0, film: EV.billion - 0.04 - 1.49 }, C: { from: 45.49, film: EV.billion - 0.04 } };
export const END = Math.round((MUSIC.C.film + 4 * 2.664) * FPS) / FPS;      // four bars of the second drop: ≈ 38.3 s

// ---------------------------------------------------------------- the time stop: world time τ freezes on "Time", resumes in space
export const STOP = { a: EV.time - 0.05, b: EV.time + 0.3, c: EV.billion - 0.1, d: EV.billion + 0.25 };
const rate = (t) => 1 - 0.985 * sm(t, STOP.a, STOP.b) * (1 - sm(t, STOP.c, STOP.d));
const TAU = []; { let s = 0; for (let i = 0; i <= Math.ceil(END * 1000) + 1000; i++) { TAU.push(s); s += rate((i + 0.5) / 1000) / 1000; } }
/** World time: everything in the world (pigeons, lasers, dinosaurs, meteors, explosions, UFOs) runs on τ; he runs on t. */
export const tau = (t) => { const x = Math.max(0, t) * 1000, i = Math.floor(x); return t <= 0 ? t : TAU[Math.min(TAU.length - 2, i)] + (TAU[Math.min(TAU.length - 1, i + 1)] - TAU[Math.min(TAU.length - 2, i)]) * (x - i); };
export const frozen = (t) => sm(t, STOP.a, STOP.b) * (1 - sm(t, STOP.c, STOP.d));   // 0..1 how grey/frozen the world is

// ---------------------------------------------------------------- his steps (on the beat): build-up 0.577 s, first drop grid 0.666 s, second drop 0.656 s
export const LAND = (() => { const L = []; for (let k = 0; k <= 14; k++) L.push(0.3 + 0.577 * k); for (let t = 9.04; t < MUSIC.C.film; t += 0.666) L.push(+t.toFixed(3)); for (let t = MUSIC.C.film + 0.13; t < END + 1; t += 0.656) L.push(+t.toFixed(3)); return L; })();
export const Q0 = 0.55;
export function stairQ(t) {
  if (t <= LAND[0]) return Q0 + (1 - Q0) * blend(t / LAND[0]);
  for (let i = 0; i + 1 < LAND.length; i++) if (t <= LAND[i + 1]) return i + 1 + blend((t - LAND[i]) / (LAND[i + 1] - LAND[i]));
  return LAND.length;
}
function blend(u) { u = clamp01(u); const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; return 0.45 * u + 0.55 * e; }

// ---------------------------------------------------------------- the aura counter: milestones on their words, staircase of steps between
export const MILES = [[0, 0], [EV.hundred, 100], [EV.thousand, 1000], [EV.ten, 10000], [EV.fifteen, 15000], [EV.twenty, 20000], [EV.fifty, 50000], [EV.hundredK, 100000], [EV.million, 1e6], [EV.billion, 1e9]];
export function auraCount(t) {
  if (t >= EV.infinite) return Infinity;
  let i = 0; while (i + 1 < MILES.length && t >= MILES[i + 1][0]) i++;
  const [t0, v0] = MILES[i]; if (i + 1 >= MILES.length) return v0;
  const [t1, v1] = MILES[i + 1];
  // between milestones each landed step adds a share (log-spaced), and the last 0.25 s rolls up to the next value
  const steps = LAND.filter((l) => l > t0 && l < t1 - 0.25), done = steps.filter((l) => l <= t).length, k = steps.length ? done / (steps.length + 1) : 0;
  const base = v0 <= 0 ? 0 : Math.log10(v0), top = Math.log10(v1), cur = v0 <= 0 ? v1 * k * 0.6 : Math.pow(10, base + (top - base) * k * 0.7);
  return Math.round(cur + (v1 - cur) * sm(t, t1 - 0.25, t1));
}
/** Aura level 0 … 10 (colour/size of the aura): one per milestone, continuous ramp. */
export function level(t) { let L = 0; for (const [m] of MILES.slice(1)) L += sm(t, m - 0.05, m + 0.3); return L + sm(t, EV.infinite - 0.05, EV.infinite + 0.4); }
