// «Breakout's paddle shrinks at the worst moment» timeline: every beat is anchored to a measured word of the single voice
// take (voice/words.json = ElevenLabs alignment moved onto Scribe's word starts by shared/retime.mjs; words-el.json =
// original). Not a loop: the film ends on the follow card over the empty field, holding ~0.85 s after the last word.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("hits", 2), W("wall.", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  breakout: W("breakout"), cut: W("cut"), half: W("half"), worst: W("worst"), moment: W("moment"),
  happens: W("happens"), breaks: W("breaks"), red1: W("red"), row: W("row"), hits1: W("hits"), top1: W("top"), wall1: W("wall"),
  stays: W("stays"), small: W("small"), until: W("until"), lose: W("lose"), loseEnd: W("ball", 2, "end"),
  hidden: W("hidden"), rule: W("rule"), heres: W("here's"), another: W("another"),
  speeds: W("speeds"), three: W("three"), times: W("times"), once: W("once"), fourth: W("fourth"), again: W("again"), twelfth: W("twelfth"), hit12End: W("hit", 2, "end"),
  first: W("first"), touches: W("touches"), orange: W("orange"), brick: W("brick"), jumps: W("jumps"), top2: W("top", 2), speed: W("speed"),
  so1: W("so"), fastest: W("fastest"), right: W("right"), smallest: W("smallest"),
  but: W("but"), aim: W("aim"), your3: W("your", 5), four: W("four"), parts: W("parts"), part: W("part"), hits2: W("hits", 2), picks: W("picks"), goes: W("goes"), next1: W("next"),
  not1: W("not"), way: W("way"), came: W("came"), in2: W("in", 3),
  colors: W("colors"), fake: W("fake"), screen: W("screen"), black: W("black"), white: W("white"),
  strips: W("strips"), colored: W("colored"), plastic: W("plastic"), stuck: W("stuck"), glass: W("glass"), glassEnd: W("glass", 1, "end"),
  clear1: W("clear"), wall2: W("wall", 2), wall3: W("wall", 3), second: W("second"), appears: W("appears"),
  clear2: W("clear", 2), one3: W("one", 2), no: W("no"), more: W("more"), bricks: W("bricks"), come: W("come"),
  most: W("most"), score: W("score"), eight: W("eight"), hundred: W("hundred"), n896: W("ninety-six"), n896End: W("ninety-six", 1, "end"),
  follow: W("follow"), miss: W("miss"), arcade: W("arcade"), secret: W("secret"), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- beats (film seconds)
export const FF1 = { a: 12.6, b: 17.75 };                                       // fast-forward through hits 1–12 of serve 2
export const CUT = EV.clear1 - 0.06;                                            // live serve 2 ends; the wall-clearing fast-forward starts
export const CLEAR1 = [EV.clear1 - 0.02, EV.wall2 + 0.36];                      // wall 1 melts brick by brick (score → 448)
export const BUILD2 = [EV.second - 0.2, EV.appears + 0.3];                      // the second wall dissolves in, top row first
export const CLEAR2 = [EV.clear2 - 0.02, EV.no - 0.16];                         // wall 2 melts (score → 896)
export const SEG3 = EV.no - 0.1;                                                // the ball is back, on an empty field
export const STRIPS = { off: [EV.colors - 0.05, EV.fake + 0.45], back: [EV.strips - 0.1, EV.plastic + 0.35], tag: [EV.plastic - 0.05, CUT - 0.3] };
export const CARD4 = { in: EV.your3 - 0.08, out: EV.colors - 0.45 };
export const MAXT = { in: EV.eight - 0.12, max: EV.n896 + 0.25 };

const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
/** Keyframe track: keys [[t, v], …]; eased between keys, held outside. */
export function track(keys, t, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + (v1 - v0) * e((t - t0) / (t1 - t0)); }
  return keys[keys.length - 1][1];
}
