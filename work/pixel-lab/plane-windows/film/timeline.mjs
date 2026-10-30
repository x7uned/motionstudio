// «Why airplane windows are round» timeline: every beat is anchored to measured words of the single voice take
// (voice/words.json, retimed on Scribe). Not a loop.
//
// ONE scene: an airliner at cruise over a sea of clouds, seen from outside, side view, flying right. The camera is
// close on the fuselage: a row of big cartoon windows (not to scale); through one of them — the HERO WINDOW — the
// channel's own character looks out. The skin around that window becomes the "stress view" (flow lines, heat), the
// window turns square and back, cracks grow and heal, and later the window's three panes slide out as an exploded view.
// A sepia flashback inset shows the 1954 Comet. Illustrations, not a real aircraft, not to scale.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = words[words.length - 1].end;
export const END = Math.ceil((VOICE_END + 1.6) * FPS) / FPS;

// ---------------------------------------------------------------- world layout (grid px, y grows down, z = 1)
// screen = (270 + (x − cx), 480 + (y − cy)); the camera rests at cx 0, cy 0 → world (0, 0) is screen (270, 480).
// The fuselage is a long horizontal band; its window row is centred on WIN_Y. Windows sit every PITCH px; the hero
// window is centred at (HERO_WIN.x, WIN_Y). The sky/clouds scroll (the plane flies right at cruise speed).
export const WORLD_W = 2000;
export const BODY = { top: -260, bot: 200 };                 // fuselage skin, world y (screen 220 … 680 at rest)
export const WIN_Y = -60;                                    // window row centre (screen 420 at rest)
export const WIN = { w: 108, h: 150, r: 46 };                // hero-scale window: 108 × 150, corner radius 46 when ROUND (r → 4 when SQUARE)
export const PITCH = 170;                                    // window spacing
export const HERO_WIN = { x: 0 };                            // the hero window (centre x)
export const HERO_X = 0, HERO_FEET = WIN_Y + 145;            // the character inside, behind the window: his face is centred in it, shoulders at its bottom
export const REST = { cx: 0, cy: 0 };
export const TOD_KEYS = [[-5000, 2.4], [5000, 2.4]];        // bright day at cruise altitude
export const SEA_RANGES = [];
export const DISC = { x: 440, y: 120 };                     // the sun, top right (screen)

// ---------------------------------------------------------------- events (seconds), by narration
export const EV = {
  // "Airplane windows are round because square ones once tore planes apart."
  airplane: W("airplane"), windows1: W("windows"), round1: W("round"), because: W("because"), square: W("square"), tore1: W("tore"), apart1: W("apart"), apart1End: W("apart", 1, "end"),
  // "In 1954, two Comets, the world's first jet airliners, broke apart in the sky."
  y1954: W("1954"), two: W("two"), comets: W("comets"), first: W("first"), jet: W("jet"), airliners: W("airliners"), broke: W("broke"), sky: W("sky"), skyEnd: W("sky", 1, "end"),
  // "On every flight, the cabin is pumped up with air, like a balloon, and let down again when you land."
  every1: W("every"), flight1: W("flight"), cabin: W("cabin"), pumped: W("pumped"), air1: W("air"), balloon: W("balloon"), let: W("let"), down: W("down"), land: W("land"), landEnd: W("land", 1, "end"),
  // "Each time, the walls stretch a tiny bit."
  each: W("each"), walls: W("walls"), stretch: W("stretch"), tiny1: W("tiny"), bit: W("bit"),
  // "Sharp corners collect that stress in one spot."
  sharp1: W("sharp"), corners1: W("corners"), collect: W("collect"), stress1: W("stress"), spot: W("spot"),
  // "Flight after flight, tiny cracks grew from the sharp corner of a window, until the metal tore open."
  flight2: W("flight", 2), flight3: W("flight", 3), cracks: W("cracks"), grew: W("grew"), sharp2: W("sharp", 2), corner: W("corner"), window1: W("window"),
  until: W("until"), metal: W("metal"), tore2: W("tore", 2), open: W("open"), openEnd: W("open", 1, "end"),
  // "Round corners spread the stress evenly, so today every airliner has rounded windows."
  round2: W("round", 2), corners2: W("corners", 2), spread: W("spread"), evenly: W("evenly"), today: W("today"), airliner: W("airliner"), rounded: W("rounded"), windows2: W("windows", 2), windows2End: W("windows", 2, "end"),
  // "And that tiny hole? Your window has three layers."
  hole1: W("hole"), window2: W("window", 2), three: W("three"), layers: W("layers"),
  // "The hole in the middle one lets air through, so the outer layer carries all the pressure, and the middle one waits as a backup."
  hole2: W("hole", 2), middle1: W("middle"), lets1: W("lets"), air2: W("air", 2), through: W("through"), outer: W("outer"), carries: W("carries"), pressure: W("pressure"),
  middle2: W("middle", 2), waits: W("waits"), backup: W("backup"), backupEnd: W("backup", 1, "end"),
  // "It also lets moisture out, so your window doesn't fog up."
  also: W("also"), moisture: W("moisture"), out: W("out"), fog: W("fog"), fogEnd: W("up", 2, "end"),
  // "That little hole isn't a flaw. It's a safety feature."
  little: W("little"), hole3: W("hole", 3), flaw: W("flaw"), safety: W("safety"), feature: W("feature"), featureEnd: W("feature", 1, "end"),
  // call to action
  liked: W("liked"), video: W("video"), send: W("send"), friend: W("friend"), follow: W("follow"), miss: W("miss"), next: W("next"), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- one source of truth for the hero window's shape and the skin
/** Corner radius of the hero window at t: round (WIN.r) → square (4) on "square" (hook ghost) / "Sharp corners", back on "Round corners". */
const sm = (x, a, b) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const SQUARE_GHOST = [EV.square - 0.1, EV.y1954 - 0.2];       // hook: a red square ghost outline flickers over the round window, a crack zigzags from its corner, then fades
export const TO_SQUARE = [EV.sharp1 - 0.15, EV.sharp1 + 0.45];       // the hero window really becomes square (sharp corners)
export const TO_ROUND = [EV.round2 - 0.1, EV.round2 + 0.5];          // … and round again
export function cornerR(t) { return WIN.r + (4 - WIN.r) * (sm(t, ...TO_SQUARE) - sm(t, ...TO_ROUND)); }
/** Cabin pressure 0..1 (drives the fuselage "breathing": a small exaggerated bulge, pressure arrows inside). */
export const PRESS = { up: [EV.pumped - 0.05, EV.balloon + 0.4], down: [EV.let - 0.05, EV.landEnd + 0.1] };
export const CYCLES = [EV.flight2 - 0.05, EV.tore2 - 0.1];             // "Flight after flight": fast pressure cycles (whole number of pulses)
export const N_CYCLES = 6;
export function pressure(t) {
  let p = sm(t, ...PRESS.up) * (1 - sm(t, ...PRESS.down));
  if (t >= CYCLES[0] && t < CYCLES[1]) { const u = (t - CYCLES[0]) / (CYCLES[1] - CYCLES[0]); p = Math.max(p, 0.5 - 0.5 * Math.cos(2 * Math.PI * N_CYCLES * u)); }
  if (t >= EV.stretch - 0.2 && t < EV.sharp1) p = Math.max(p, sm(t, EV.stretch - 0.2, EV.stretch + 0.3) * (1 - sm(t, EV.bit + 0.2, EV.sharp1)));
  return p;
}
/** Stress view (0 off … 1 on): the skin around the hero window shows flow lines and heat. */
export const STRESS_VIEW = [EV.stretch - 0.3, EV.windows2End + 0.4];
/** Crack length 0..1 at the hero window's corner (grows during the cycles, "tore open" = 1), healed by "Round". */
export function crack(t) { const g = sm(t, EV.cracks - 0.1, EV.tore2) * 0.7 + 0.3 * sm(t, EV.tore2, EV.openEnd); return t < EV.round2 - 0.3 ? g : g * (1 - sm(t, EV.round2 - 0.3, EV.round2 + 0.3)); }
export const FLIGHT_COUNT = [EV.flight2 - 0.05, EV.openEnd];          // counter FLIGHTS 1 → 9,000 (lead's overlay)
// the exploded view of the hero window's three panes (builder B), from "three layers" to "safety feature"
export const EXPLODE = { out: [EV.three - 0.15, EV.layers + 0.35], back: [EV.featureEnd + 0.1, EV.liked + 0.3] };
export const AIRFLOW = [EV.lets1 - 0.1, EV.through + 0.6];
export const LOAD = [EV.outer - 0.1, EV.backup - 0.2];                  // pressure arrows on the OUTER pane
export const BACKUP_TEST = [EV.middle2 - 0.1, EV.backupEnd + 0.25];     // what-if: the outer pane cracks (dashed), the middle pane takes the load
export const FOG = [EV.moisture - 0.15, EV.fogEnd + 0.3];               // droplets fog the gap, vent through the hole, the pane clears
export const COMET = [EV.y1954 - 0.15, EV.every1 - 0.1];                // the sepia 1954 flashback inset (builder B)

// ---------------------------------------------------------------- camera: close on the hero window, gentle drifts
const K = (t, cx, cy) => ({ t, cx, cy });
export const CAM = [
  K(0, -60, 10), K(EV.y1954, 0, 0),
  K(EV.three - 0.3, 0, 0), K(EV.layers + 0.3, 80, 0),                  // a slide right to make room for the exploded panes (×1.8)
  K(EV.featureEnd, 80, 0), K(EV.liked + 0.4, 0, 0), K(END + 10, 0, 0),
];
