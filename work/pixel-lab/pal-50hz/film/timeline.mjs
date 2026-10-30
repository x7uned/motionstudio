// «In Europe, your games ran slower» timeline: every beat is anchored to a measured word of the single voice take
// (voice/words.json = ElevenLabs alignment moved onto Scribe's word timings by dev/retime-pal.mjs; words-el.json =
// original). Not a loop: the film ends on the follow card over the final wide shot, holding ~0.85 s after the last word.
// Harness: frozen copy of crt/film/timeline.mjs.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("sixty", 2), W("slower", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  europe1: W("europe"), slower1: W("slower"), about: W("about"), seventeen: W("seventeen"), slower2: W("slower", 2), heres: W("here's"),
  old: W("old"), tvs: W("tvs"), drew: W("drew"), electricity: W("electricity"), wall: W("wall"), wallEnd: W("wall", 1, "end"),
  america: W("america"), japan: W("japan"), sixty1: W("sixty"), second1: W("second"), europe2: W("europe", 2), fifty1: W("fifty"), fifty1End: W("fifty", 1, "end"),
  many: W("many"), moved: W("moved"), one: W("one"), step: W("step"), picture2: W("picture", 2), so1: W("so"), fifty2: W("fifty", 2), steps: W("steps"), instead: W("instead"), sixty2: W("sixty", 2), sixty2End: W("sixty", 2, "end"),
  take: W("take"), sonic1: W("sonic"), hedgehog: W("hedgehog"), y1991: W("1991"), on: W("on"), european: W("european"), console1: W("console"),
  sonic2: W("sonic", 2), ran: W("ran"), slower3: W("slower", 3), music: W("music"), played: W("played"), slower4: W("slower", 4),
  even: W("even"), clock: W("clock"), ticked: W("ticked"), slower5: W("slower", 5), slower5End: W("slower", 5, "end"),
  so2: W("so", 2), best: W("best"), time: W("time", 2), took: W("took"), longer: W("longer"), real: W("real"), life: W("life"), lifeEnd: W("life", 1, "end"),
  picture3: W("picture", 3), made: W("made"), smaller: W("smaller"), so3: W("so", 3), black: W("black"), bars: W("bars"), rest: W("rest"), restEnd: W("rest", 1, "end"),
  most: W("most"), kids: W("kids"), never: W("never"), knew: W("knew"), there: W("there"), nothing: W("nothing"), faster: W("faster"), compare: W("compare"), withEnd: W("with", 2, "end"),
  some1: W("some"), fixed: W("fixed"), but: W("but"), many2: W("many", 2), werent: W("weren't"), werentEnd: W("weren't", 1, "end"),
  some2: W("some", 2), players: W("players"), opened: W("opened"), consoles: W("consoles"), added: W("added"), sixty3: W("sixty", 3), switch: W("switch"), switchEnd: W("switch", 1, "end"),
  first: W("first"), console2: W("console", 2), fix: W("fix"), dreamcast: W("dreamcast"), y1999: W("1999"), y1999End: W("1999", 1, "end"),
  follow: W("follow"), miss: W("miss"), next: W("next"), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- beats (film seconds)
export const RACE = { in: -0.5, out0: EV.heres + 0.3, out1: EV.old - 0.05 };                 // the hook's race bar (two lanes, 17% slower)
export const WAVE = { in: EV.drew - 0.1, out: EV.many - 0.25 };                              // waves flow from the sockets up into the TVs
export const HZ = { l: EV.sixty1 - 0.08, r: EV.fifty1 - 0.08, out: EV.many - 0.2 };
export const STRIP = { in: EV.many - 0.05, count0: EV.fifty2 - 0.1, out: EV.take - 0.05 };    // film strips; the 1-second count runs count0 → count0 + 1
export const Y91 = { in: EV.y1991 - 0.1, out: EV.european - 0.1 };
export const SLOW = { in: EV.sonic2 - 0.1, out: EV.music - 0.15 };
export const NOTES = { in: EV.music - 0.15, out: EV.even - 0.1 };
export const CLK = { in: EV.clock - 0.1, out: EV.so2 - 0.1 };
export const FF = { a: EV.so2 - 0.02, ramp: 0.3, rightGoal: EV.real + 0.02 };                // fast-forward to the 0:59 goal; K solved in game.mjs
export const WATCH = { in: EV.so2 - 0.1, out: EV.black - 0.25 };                              // real-time stopwatches above the TVs
export const ACT2 = EV.made - 0.05;                                                          // both games start the next run together
export const BARS = { squash0: EV.smaller - 0.05, squash1: EV.so3 - 0.05, in0: EV.black - 0.08, in1: EV.bars + 0.3, tagOut: EV.most - 0.2 };
export const KID = { in: EV.most - 0.25, out: EV.some2 - 0.2 };                               // camera into the Europe room
export const CARTS = { in: EV.some1 - 0.1, ok: [EV.fixed - 0.05, EV.fixed + 0.25], no: [EV.many2 - 0.05, EV.many2 + 0.2, EV.werent - 0.05], out: EV.some2 + 0.1 };
export const MOD = { cam0: EV.some2 - 0.2, cam1: EV.players + 0.15, screw0: EV.players, screw1: EV.opened - 0.05, lid0: EV.opened - 0.05, lid1: EV.consoles + 0.25, sw0: EV.added - 0.1, sw1: EV.sixty3 - 0.05, click: EV.switch - 0.02, lidClose0: EV.switchEnd + 0.15, lidClose1: EV.switchEnd + 0.55, back0: EV.switchEnd + 0.2, back1: EV.first + 0.6 };
export const DC = { in0: EV.console2 - 0.1, in1: EV.dreamcast + 0.1, menu0: EV.dreamcast + 0.15, yes: EV.y1999 - 0.05, menuOut: EV.follow - 0.15, tag: EV.y1999 - 0.08, tagOut: EV.follow - 0.2 };

const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
/** Keyframe track: keys [[t, v], …]; eased between keys, held outside. */
export function track(keys, t, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + (v1 - v0) * e((t - t0) / (t1 - t0)); }
  return keys[keys.length - 1][1];
}
