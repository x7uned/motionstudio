// «Pac-Man has a hiding spot the ghosts can't find» timeline: every event is anchored to a measured word of the single
// voice take. Loop film: END makes the pause at the seam (last voice sound 48.38 s → END → first sound 0.10 s) a
// sentence pause (0.42 s). Game time τ (tile steps, game.mjs) runs on the film clock: τ(t) = τ0 + K·∫SCALE, slowed
// (never stopped) for the two explanations; K makes the film exactly three periods of the ghosts' loops (240 tiles),
// and τ0 puts Red on the forbidden tile under Pac-Man on "under".
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1461 / FPS; // 48.700 s

export const EV = {
  hiding: W("hiding"), spot: W("spot"), find: W("find."), findEnd: W("find.", 1, "end"),
  next: W("next"), start: W("start."), startEnd: W("start.", 1, "end"),
  go: W("go"), right: W("right,", 2), up: W("up"), hall: W("hall,"), stop: W("stop"), facing: W("facing"), up2: W("up.", 2), up2End: W("up.", 2, "end"),
  now: W("now"), watch: W("watch."), every: W("every"), takes: W("takes"), way: W("way"), closest: W("closest"), target: W("target,"), never: W("never"), back: W("back."), backEnd: W("back.", 1, "end"),
  four: W("four"), squares: W("squares,"), game: W("game"), turn: W("turn"), upR: W("up.", 3), upREnd: W("up.", 3, "end"),
  two: W("two"), above: W("above"), house: W("house."), other: W("other"), here: W("here,"), starting: W("starting"), row: W("row."), rowEnd: W("row.", 1, "end"),
  so: W("so"), red: W("red"), coming: W("coming"), passes: W("passes"), under: W("under"), cant: W("can't", 2), turnIn: W("turn", 2), in: W("in.", 2), inEnd: W("in.", 2, "end"),
  pink: W("pink"), blue: W("blue"), circle: W("circle"), house2: W("house.", 2), orange: W("orange"), loops: W("loops"), blocks: W("blocks"), left: W("left."), leftEnd: W("left.", 1, "end"),
  side: W("side"), open: W("open,"), rules: W("rules"), never2: W("never", 2), there: W("there."), thereEnd: W("there.", 1, "end"),
  only: W("only"), follows: W("follows"), in2: W("in.", 4), in2End: W("in.", 4, "end"),
  when: W("when"), blue2: W("blue,", 2), rule: W("rule"), off: W("off."), offEnd: W("off.", 1, "end"),
  head: W("head"), corners: W("corners,"), break: W("break."), breakEnd: W("break.", 1, "end"),
  level: W("level"), one: W("one,"), after: W("after"), minute: W("minute"), half: W("half,"), stopDoing: W("stop", 2), chase: W("chase"), nonstop: W("nonstop."), nonstopEnd: W("nonstop.", 1, "end"),
  then: W("then"), stay: W("stay"), long: W("long"), like: W("like."), likeEnd: W("like.", 1, "end"),
  secret: W("secret:"), secretEnd: W("secret:", 1, "end"),
};

// ---------------------------------------------------------------- the game clock
export const SLOW = [
  { a: EV.takes - 0.45, b: EV.back + 0.35, k: 0.32 },   // a ghost picks the way closest to its target
  { a: EV.passes - 0.5, b: EV.inEnd + 0.25, k: 0.28 },  // Red under Pac-Man: up is closest, but forbidden
];
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export function SCALE(t) {
  let s = 1;
  for (const w of SLOW) { const into = ease((t - w.a) / 0.45), out = ease((t - (w.b - 0.45)) / 0.45), d = Math.min(into, 1 - out); s = Math.min(s, 1 - (1 - w.k) * d); }
  return s;
}
const STEP = 1 / 600, SI = new Float64Array(Math.ceil((END + 2) / STEP) + 2);
for (let i = 1; i < SI.length; i++) SI[i] = SI[i - 1] + SCALE((i - 0.5) * STEP) * STEP;
const S = (t) => { const u = t / STEP, i = Math.max(0, Math.min(SI.length - 2, Math.floor(u))), k = u - i; return SI[i] + (SI[i + 1] - SI[i]) * k; };
export const PERIODS = 3, TILES = 80 * PERIODS, K = TILES / S(END);
// Red reaches the tile under Pac-Man (11,16) at τ = 9 + 16k in the steady loops (game.mjs DECISIONS)
export const T_UNDER = EV.under + 0.05;
export const TAU0 = (() => { const want = 9 + 16 * Math.round((K * S(T_UNDER) - 9) / 16); return want - K * S(T_UNDER); })();
export function tau(t) { const k = Math.floor(t / END), r = t - k * END; return TAU0 + k * TILES + K * S(r); }
export const rate = (t) => K * SCALE(((t % END) + END) % END);
