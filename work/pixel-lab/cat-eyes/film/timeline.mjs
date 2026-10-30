// «Why your cat's eyes glow» timeline: every event is anchored to a measured word of the single voice take.
// Loop film: the last voice sound ends at 54.84 s and the first starts at 0.10 s; END = 55.167 s gives a 0.43 s seam
// pause, a sentence pause of this take. Anything periodic (the phone beam's sway, the glow pulse) has whole cycles in END.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
// the aligner placed the last word late; the waveform shows "remember" at 54.32–54.82 s
VOICE.words[VOICE.words.length - 1].start = 54.32; VOICE.words[VOICE.words.length - 1].end = 54.82;
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1655 / FPS; // 55.167 s

export const EV = {
  glow: W("glow"), dark1: W("dark."), mirror: W("mirror"), inside: W("inside"),
  behind: W("behind"), retina: W("retina,"), catches: W("catches"), light1: W("light,"), shiny: W("shiny"), layer: W("layer"), tapetum: W("tapetum."),
  light2: W("light", 2), passes: W("passes"), once: W("once."),
  whatever: W("whatever"), misses: W("misses"), hits: W("hits"), mirror2: W("mirror", 2), bounces: W("bounces"), back1: W("back"), second: W("second"), tryW: W("try."),
  some: W("some"), comes: W("comes"), out: W("out"), again: W("again."),
  glow2: W("glow", 2), see1: W("see:"), lamp: W("lamp"), phone: W("phone,"), bouncing: W("bouncing"), back2: W("back", 2),
  pupils: W("pupils"), help: W("help"), inDark: W("dark", 2), open: W("open"), circles: W("circles."),
  sun: W("sun,"), close: W("close"), slits: W("slits."),
  from: W("from", 2), slit: W("slit"), circle: W("circle,"), hundred: W("hundred"), times1: W("times"), more: W("more"), lightEnd: W("light", 4, "end"),
  your: W("your", 3), pupils2: W("pupils", 2), fifteen: W("fifteen."),
  withW: W("with"), six: W("six"), dimmer: W("dimmer"), need: W("need."),
  price: W("price."), detail: W("detail."),
  sharply: W("sharply"), seven: W("seven"), closer: W("closer."), closerEnd: W("closer.", 1, "end"),
  dont2: W("don't", 2), thisMirror: W("mirror", 4), why: W("why"), red: W("red"), flash: W("flash"), photos: W("photos."),
  so: W("so"), green: W("green"), lights: W("lights"), stare: W("stare"), dark3: W("dark", 3), remember: W("remember:"),
};

// ---------------------------------------------------------------- scenes (windows in real seconds)
// world: the cat on a ledge under the moon; section: inside the eye; compare / meter / detail / photo: panels
export const SC = {
  sectionIn: [EV.inside - 0.1, EV.behind + 0.6],          // zoom into the eye, dissolve into the cross-section
  sectionOut: [EV.again - 0.1, EV.glow2 + 0.25],           // back out to the face
  day: [EV.circles + 0.25, EV.sun + 0.15],                 // night → day (sunrise) before "in the sun"
  compare: [EV.from - 0.35, EV.fifteen + 0.75],
  night: [EV.fifteen + 0.2, EV.withW + 0.6],               // day → night again for "dimmer"
  meter: [EV.withW - 0.1, EV.need + 0.55],
  detail: [EV.price - 0.4, EV.closerEnd + 0.5],
  photo: [EV.dont2 - 0.2, EV.photos + 0.7],
};
