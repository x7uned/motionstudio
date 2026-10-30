// «Old games really did look better on old TVs» timeline: every beat is anchored to a measured word of the single voice
// take (voice/words.json = ElevenLabs alignment moved onto Scribe's word starts by shared/retime.mjs; words-el.json =
// original). Not a loop: the film ends on the follow card over the final room shot, holding ~0.85 s after the last word.
// Harness: frozen copy of breakout/film/timeline.mjs.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("water", 2), W("dots.", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  old: W("old"), tvs1: W("tvs"), many: W("many"), planned: W("planned"), way: W("way"),
  an: W("an"), sharp1: W("sharp"), squares: W("squares"), beam: W("beam"), electrons: W("electrons"), painted: W("painted"),
  line1: W("line"), line2: W("line", 2), onto: W("onto"), tiny: W("tiny"), red: W("red"), green: W("green"), blue: W("blue"), dots: W("dots"), dotsEnd: W("dots", 1, "end"),
  so1: W("so"), pixels: W("pixels"), next1: W("next"), blurred: W("blurred"), together: W("together"), artists2: W("artists", 2), used: W("used"), blur: W("blur"),
  look: W("look", 2), waterfalls: W("waterfalls"), sonic: W("sonic"), hedgehog: W("hedgehog"), console: W("console"), couldnt: W("couldn't"), see: W("see-through"), water1: W("water"),
  so2: W("so", 2), drew1: W("drew"), thin: W("thin"), stripes1: W("stripes"), water2: W("water", 2), back1: W("background"), water3: W("water", 3), back2: W("background", 2), back2End: W("background", 2, "end"),
  on1: W("on", 2), tv2: W("tv", 2), stripes2: W("stripes", 2), melted: W("melted"), clear: W("clear"), water4: W("water", 4), water4End: W("water", 4, "end"),
  sonics: W("sonic's"), designer: W("designer"), naoto: W("naoto"), said: W("said"), made: W("made"), blurriness: W("blurriness"), blurrinessEnd: W("blurriness", 1, "end"),
  other: W("other", 2), teams: W("teams"), drew2: W("drew", 2), checker: W("checkerboards"), colors: W("colors"), soft: W("soft"), lights: W("lights"), lightsEnd: W("lights", 1, "end"),
  now: W("now"), put: W("put"), same: W("same"), modern: W("modern"), screen1: W("screen"),
  every: W("every"), pixel: W("pixel"), becomes: W("becomes"), hard: W("hard"), square: W("square"),
  the_s: W("stripes", 3), stay: W("stay"), stripes4: W("stripes", 4), thats: W("that's"), releases: W("releases"), add: W("add"), crt: W("crt"), filter: W("filter"),
  collectors: W("collectors"), buy: W("buy"), tvs2: W("tvs", 2), again: W("again"),
  game2: W("game", 2), change: W("change"), your: W("your"), screen2: W("screen", 2), did2: W("did", 2),
  follow: W("follow"), miss: W("miss"), next2: W("next", 2), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- beats (film seconds)
export const RUN = { decel: 4.9, stop: 6.3, resume: EV.game2 - 0.2 };              // the hedgehog runs, stops by the waterfall, runs again at the end
export const MACRO = { in0: EV.an - 0.1, in1: EV.beam - 0.12, out0: EV.artists2 - 0.05, out1: EV.look + 0.1 };
export const SWEEP = { a: EV.beam - 0.05, b: EV.dots - 0.1 };                       // the beam paints the visible rows, line by line
export const BLURDEMO = { a: EV.pixels - 0.1, b: EV.artists2 + 0.2 };
export const WF = { in0: EV.console - 0.2, in1: EV.water1 + 0.25, out0: EV.sonics - 0.3, out1: EV.designer + 0.3 };
export const LENS = { in: EV.so2 - 0.08, melt0: EV.stripes2 - 0.05, melt1: EV.water4 + 0.15, out: EV.water4End + 0.35 };
export const QUOTE = { in: EV.sonics - 0.05, out: EV.other - 0.25 };
export const CHECK = { in: EV.other - 0.05, m1: EV.colors - 0.2, m2: EV.lights - 0.25, out: EV.now - 0.1 };
export const WIDE = { a: EV.now - 0.15, b: EV.same + 0.55 };
export const FLAT = { in0: EV.put - 0.05, in1: EV.modern + 0.05, on: EV.modern + 0.1 };
export const LOUPE = { in: EV.every - 0.1, pan0: EV.the_s - 0.1, pan1: EV.stay + 0.2, out: EV.collectors - 0.45 };
export const FILTER = { in: EV.thats - 0.05, flip0: EV.crt - 0.05, flip1: EV.filter + 0.2, out: EV.game2 - 0.3 };
export const COLL = { in: EV.collectors + 0.05, out: EV.follow - 0.4 };
export const ENDW = { a: EV.game2 - 0.25, b: EV.change + 0.6 };

const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
/** Keyframe track: keys [[t, v], …]; eased between keys, held outside. */
export function track(keys, t, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + (v1 - v0) * e((t - t0) / (t1 - t0)); }
  return keys[keys.length - 1][1];
}
