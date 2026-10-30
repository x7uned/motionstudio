// «Is my dog blind?» timeline: every scene, camera key and event is anchored to a measured word of the single take.
// Loop film: the last line («…you'll be asking:») runs into the first («Is my dog blind?»); END is chosen so the
// pause at the seam matches a sentence pause (~0.42 s), and the final throw lands the picture on frame 0.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) time of the n-th occurrence of a spoken word, e.g. W("red", 2) or W("grass", 3, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
// last audible sound of the take 48.82 s (−35 dBFS gate, 10 ms windows); first onset 0.07 s → seam pause 0.42 s
export const END = 1475 / FPS; // 49.167 s

export const EV = {
  // hook
  blind: W("blind?"), find: W("find"), red1: W("red", 1), ball1: W("ball", 1), green1: W("green", 1), grass1: W("grass", 1),
  // not quite
  not: W("not"), quite: W("quite"), canSee: W("can", 1), see1: W("see", 1), ballSee: W("ball", 2), just: W("just"), cant2: W("can't", 2), red2: W("red", 2),
  // cones
  eyes1: W("eyes", 1), three: W("three"), color1: W("color", 1), cells: W("cells"), coneR: W("red", 3), coneG: W("green", 2), coneB: W("blue", 1),
  dogs1: W("dog's"), eyes2: W("eyes", 2), only: W("only"), two: W("two"), oneB: W("one", 1), blue2: W("blue", 2), oneY: W("one", 2), yellow1: W("yellow", 1),
  // dog vision
  so1: W("so", 1), forDog: W("dog", 3), red4: W("red", 4), green3: W("green", 3), look: W("look"), same1: W("same", 1), dull: W("dull"), yellowish: W("yellowish"), brown: W("brown"),
  that: W("that"), red5: W("red", 5), ball3: W("ball", 3), same2: W("same", 2), colorSame: W("color", 2), grass2: W("grass", 2),
  // replay: flight vs still
  while: W("while"), flies: W("flies"), follow: W("follow"), but: W("but"), stops: W("stops"), lost: W("lost"), grass3: W("grass", 3),
  // detail
  dogsAlso: W("dogs"), less: W("less"), detail: W("detail"), what1: W("what", 1), clearly: W("clearly"), across: W("across"), park: W("park"),
  get: W("get", 1), almost2: W("almost", 2), four: W("four"), times: W("times"), closer: W("closer"), see4: W("see", 4),
  // nose
  so2: W("so", 2), best: W("best"), uses: W("uses"), nose: W("nose"), noseEnd: W("nose", 1, "end"),
  // the fix
  want: W("want"), easy1: W("easy", 1), fix: W("fix"), get2: W("get", 2), blue3: W("blue", 3), yellow2: W("yellow", 2), ball4: W("ball", 4),
  for3: W("for", 5), dog5: W("dog", 7), those: W("those"), colors: W("colors"), easy2: W("easy", 2), spot: W("spot"), green4: W("green", 4), grass4: W("grass", 4),
  // loop back
  and3: W("and", 3), red6: W("red", 6), ball5: W("ball", 5), throw: W("throw"), again: W("again"), asking: W("asking"),
};

// ---------------------------------------------------------------- the throw that loops
// The final throw (released after «again») is the same throw the film opens with: frame 0 shows the ball on its way
// down and the dog sprinting under it. Everything about that throw is a function of τ = time since release.
export const REL = 48.10;                    // release of the final throw
export const TAU0 = END - REL;               // τ at frame 0 (1.067 s into the flight)
export const tauHook = (t) => t + TAU0;      // τ during the hook
// the replay in «dog vision» shows the same throw again
export const REL_REPLAY = EV.flies - 0.18;   // the ball leaves the hand just before «flies»

// ---------------------------------------------------------------- scenes [start, end)
export const SC = {
  hook: [0, EV.not - 0.1],
  notQuite: [EV.not - 0.1, EV.eyes1 - 0.25],
  cones: [EV.eyes1 - 0.25, EV.so1 - 0.1],
  vision: [EV.so1 - 0.1, EV.while - 0.35],
  replay: [EV.while - 0.35, EV.dogsAlso - 0.2],
  detail: [EV.dogsAlso - 0.2, EV.so2 - 0.15],
  nose: [EV.so2 - 0.15, EV.want - 0.05],
  fix: [EV.want - 0.05, EV.and3 - 0.2],
  loop: [EV.and3 - 0.2, END],
};
