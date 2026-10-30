// «The Minecraft ghast's cry came from a real cat» timeline: every beat is anchored to a measured word of the single voice
// take (voice/words.json = ElevenLabs alignment moved onto Scribe's word starts by shared/retime.mjs; words-el.json =
// original). The take honoured the five [pause]/[long pause] tags with 0.76–1.06 s gaps: the sound demos start in those
// gaps; a demo longer than its gap runs on under the voice (mix.mjs ducks it to about −4 dB under speech).
// Not a loop: the film ends on the follow card over the Nether, holding ~0.85 s after the last word.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("cat", 2), W("meow", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  cry: W("cry"), cat1: W("cat"), cat1End: W("cat", 1, "end"), that: W("that"), giant: W("giant"), ghost: W("ghost"), nether: W("nether"), netherEnd: W("nether", 1, "end"),
  part: W("part"), grumpy: W("grumpy"), sleepy: W("sleepy"), cat2: W("cat", 2), cat2End: W("cat", 2, "end"),
  arrived: W("arrived"), y2010: W("2010"), halloween: W("halloween"), update: W("update"), updateEnd: W("update", 1, "end"),
  its: W("its", 2), sounds1: W("sounds"), made: W("made"), c418: W("c-four-eighteen"), composer: W("composer"), composerEnd: W("composer", 1, "end"),
  he1: W("he"), only1: W("only"), voice2: W("voice", 2), cats1: W("cats"), involved: W("involved"), involvedEnd: W("involved", 1, "end"),
  his1: W("his", 2), human: W("human"), woken: W("woken"), up: W("up"), once: W("once"), microphone: W("microphone"), right: W("right"), next1: W("next"), it1End: W("it.", 1, "end"),
  heres: W("here's"), copy: W("copy"), meow1: W("meow"), meow1End: W("meow", 1, "end"),
  short: W("short"), high: W("high"), highEnd: W("high", 1, "end"),
  dont: W("don't"), exactly: W("exactly"), recording: W("recording"), recordingEnd: W("recording", 1, "end"),
  play1: W("play"), half: W("half"), speed: W("speed"), twice: W("twice"), long1: W("long"), long1End: W("long", 1, "end"), much1: W("much"), deeper: W("deeper"), deeperEnd: W("deeper", 1, "end"),
  your: W("your"), brain: W("brain"), bigger: W("bigger"), throat: W("throat"), throatEnd: W("throat", 1, "end"),
  add: W("add"), echo: W("echo"), sounds2: W("sounds", 2), far: W("far"), giant2: W("giant", 2), cave: W("cave"), caveEnd: W("cave", 1, "end"),
  and3: W("and", 6), real2: W("real", 2), ghast3: W("ghast", 2), ghast3End: W("ghast", 2, "end"),
  game2: W("game"), every: W("every"), cry2: W("cry", 2), higher: W("higher"), lower: W("lower"), no: W("no"), same: W("same"), sameEnd: W("same", 1, "end"),
  funny: W("funny"), part2End: W("part", 2, "end"), when2: W("when", 2), minecraft2: W("minecraft", 2), real3: W("real", 3), cats3: W("cats", 2), catsEnd: W("cats", 2, "end"),
  his3: W("his", 4), wouldnt: W("wouldn't"), meow2: W("meow", 2), them: W("them"), only3: W("only", 2), purred: W("purred"), purredEnd: W("purred", 1, "end"),
  minecraft3: W("minecraft", 3), hides: W("hides"), more: W("more"), sounds3: W("sounds", 3), thisEnd: W("this.", 1, "end"),
  follow: W("follow"), miss: W("miss"), next2: W("next", 2), oneEnd: VOICE_END,
};

// ---------------------------------------------------------------- the sound demos (the point of the film)
// our copy (formant synth) → half speed → + long echo; then the real ghast (Mojang files, user-approved): moan3 as is,
// moan1 three times at pitch 0.8 / 1.0 / 1.2 by resampling. t0 = start, len = played length (s).
export const DEMO = {
  meow: { t0: EV.meow1End + 0.06, len: 0.84 },
  half: { t0: EV.deeperEnd + 0.04, len: 1.68 },
  echo: { t0: EV.caveEnd + 0.04, len: 2.12 },               // dry 1.68 s + tail, faded out before the real ghast
  real: { t0: EV.ghast3End + 0.06, len: 0.78 },
  p08: { t0: EV.cry2, len: 0.69 / 0.8, pitch: 0.8 },
  p10: { t0: EV.cry2 + 1.58, len: 0.69, pitch: 1.0 },
  p12: { t0: EV.sameEnd + 0.06, len: 0.69 / 1.2, pitch: 1.2 },
};
export const DEMO_ORDER = ["meow", "half", "echo", "real", "p08", "p10", "p12"];

// ---------------------------------------------------------------- portal passes: zoom into one portal, swirl covers the switch, out of the other
export const PASSES = [
  { from: "N", to: "S", t0: EV.its - 0.25, tm: EV.its + 0.4, t1: EV.c418 + 0.15 },
  { from: "S", to: "N", t0: EV.sounds2 - 0.1, tm: EV.far + 0.05, t1: EV.giant2 + 0.05 },
  { from: "N", to: "S", t0: EV.funny - 0.2, tm: EV.part2End, t1: EV.minecraft2 + 0.1 },
  { from: "S", to: "N", t0: EV.minecraft3 - 0.15, tm: EV.hides + 0.2, t1: EV.sounds3 + 0.25 },
];
