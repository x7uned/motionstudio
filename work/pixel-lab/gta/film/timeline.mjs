// «GTA 6: the city behind you» timeline: every beat, camera key and the game camera's view are anchored to measured words
// of the single voice take (voice/words.json). W() matches words without punctuation. Not a loop.
//
// The film is ONE sunset street in a pixel "Vice City" (side view). The channel's character stands on the sidewalk;
// above him floats the GAME CAMERA, a little pixel camera with a view cone. Everything inside the cone is DRAWN (full
// pixel art); everything outside is NOT DRAWN (a dark blueprint wireframe). VIEW(t) is the single source of truth for
// that: every module asks drawnAt(wx, t) to decide how much of a thing is drawn (0 → wireframe, 1 → full art).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) time of the n-th occurrence of a spoken word, e.g. W("gta", 2) or W("one", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = words[words.length - 1].end;
export const END = Math.ceil((VOICE_END + 1.6) * FPS) / FPS;

// ---------------------------------------------------------------- world layout (grid pixels, y grows down, z = 1)
// screen = (270 + (x - cx), 480 + (y - cy)). One street, two screens wide.
export const WORLD_W = 1080;
export const LAND = -20;                    // the front sidewalk (the character's feet) — screen y 640 at REST
export const ROAD = -60;                    // the road surface behind him (cars drive here, seen from the side)
export const BACKWALK = -96;                // the far sidewalk in front of the buildings
export const REST = { street: { cx: 540, cy: -180 } };
export const HERO_X = 540;                  // the character's world x (screen x 270 at REST): feet at (HERO_X, LAND)
export const CAM_ICON = { x: HERO_X + 6, y: LAND - 232 };   // where the game camera floats (world), above his head
export const TOD_KEYS = [[0, 4.7], [1080, 4.7]];            // golden sunset over the whole street
export const SEA_RANGES = [];                               // the camera never goes under water
export const DISC = { x: 270, y: 360 };

// ---------------------------------------------------------------- events (seconds)
export const EV = {
  // hook: "GTA 6 comes out this November, and its city looks almost real."
  gta1: W("gta", 1), november: W("november"), city1: W("city", 1), almost: W("almost"), real: W("real"),
  // "So how can a PS5 run it without lag?"
  so1: W("so", 1), ps5: W("ps5"), run: W("run"), without: W("without"), lag: W("lag"),
  // "Here's the trick: most of the city isn't there."
  heres: W("here's"), trick: W("trick"), most: W("most"), city2: W("city", 2), isnt: W("isn't"), there: W("there"),
  // "Your console only draws what your camera can see."
  console: W("console"), draws: W("draws"), camera: W("camera"), see: W("see"),
  // "Turn around, and the street behind you is no longer drawn."
  turn1: W("turn", 1), around1: W("around", 1), street: W("street"), behind1: W("behind", 1), longer: W("longer"), drawn1: W("drawn", 1),
  // "A building hidden behind another building? Not drawn either."
  building1: W("building", 1), hidden: W("hidden"), another: W("another"), building2: W("building", 2), not: W("not"), drawn2: W("drawn", 2), either: W("either"),
  // "Far away, a tower is just a simple box. It gets its details only when you come close."
  far: W("far"), away: W("away"), tower: W("tower"), simple: W("simple"), box: W("box"), details: W("details"), come: W("come"), close: W("close"),
  // "And the people and cars? They appear in front of you and vanish behind you."
  people: W("people"), cars1: W("cars", 1), appear: W("appear"), front: W("front"), vanish: W("vanish"), behind3: W("behind", 3),
  // "A former Rockstar technical director said that in the old GTA games, cars were deleted as soon as they were out of sight."
  former: W("former"), rockstar1: W("rockstar", 1), director: W("director"), old: W("old"), gta2: W("gta", 2), games: W("games"),
  cars2: W("cars", 2), deleted: W("deleted"), soon: W("soon"), sight: W("sight"),
  // "Rockstar has used tricks like this since GTA 3."
  rockstar2: W("rockstar", 2), tricks: W("tricks"), since: W("since"), gta3: W("gta", 3), three: W("3"),
  // "Now GTA 6 has to do it for a whole state."
  now: W("now"), gta4: W("gta", 4), whole: W("whole"), state: W("state"),
  // "So next time, turn around really fast."
  so2: W("so", 2), nextTime: W("next", 1), turn2: W("turn", 2), around2: W("around", 2), really: W("really"), fast: W("fast"),
  // call to action: "Liked this video? Send it to a friend, and follow so you don't miss the next one."
  liked: W("liked"), video: W("video"), send: W("send"), friend: W("friend"), follow: W("follow"), miss: W("miss"), next: W("next", 2), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- the game camera's view
// dir: +1 looks right (east), −1 looks left; the cone's half-angle is fixed; "trick" turns the culling ON (before it the
// whole street is drawn, like the player believes); the quick turn at the end swings the camera too fast for the city to
// keep up, so the drawing lags behind the cone (LAG) — "turn around really fast".
const sm = (x, a, b) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const CULL_ON = [EV.isnt - 0.2, EV.there + 0.35];           // the illusion breaks: the city outside the view dissolves
export const TURN1 = [EV.turn1 - 0.1, EV.around1 + 0.75];          // first turn (slow, ~1.2 s): right → left
export const TURN_BACK = [EV.building1 - 0.7, EV.building1 + 0.3];  // back to the right for the hidden building and the tower (1 s)
export const TURN2 = [EV.turn2, EV.turn2 + 0.22];                   // "turn around really fast": right → left in 0.22 s
export const LAG = 0.55;                                           // how long the city takes to catch up after TURN2
/** −1..+1 facing of the game camera at time t (eased). */
export function camDir(t) {
  let d = 1;
  d = 1 - 2 * sm(t, TURN1[0], TURN1[1]);
  if (t >= TURN_BACK[0]) d = -1 + 2 * sm(t, TURN_BACK[0], TURN_BACK[1]);
  if (t >= TURN2[0]) d = 1 - 2 * sm(t, TURN2[0], TURN2[1]);
  return d;
}
/** How much of the world at x is DRAWN at time t (0 = wireframe … 1 = full art). Before CULL_ON everything is drawn.
 *  The cone covers the side the camera faces, from about 40 px behind the hero to the far edge; the boundary is soft
 *  (a 70 px dithered edge) and, after TURN2, lags behind the camera by up to LAG seconds (things pop in late). */
export function drawnAt(wx, t) {
  const on = sm(t, CULL_ON[0], CULL_ON[1]);
  if (on <= 0) return 1;
  const lagged = t >= TURN2[0] ? Math.max(TURN2[0], t - LAG * (1 - sm(t, TURN2[1] + LAG, TURN2[1] + LAG + 0.6))) : t;
  // the camera turns about the vertical axis: mid-turn it faces the viewer, so the cone's footprint on the street shrinks
  // to a band around the hero, then opens to the other side — a continuous sweep, never an all-dark frame
  const d = camDir(lagged), a = Math.abs(d), rel = (wx - HERO_X) * (d < 0 ? -1 : 1);
  const near = -40 - (1 - a) * 90, far = 130 + a * 640;
  const inCone = sm(rel, near - 60, near + 60) * (1 - sm(rel, far - 60, far + 60));
  return 1 - on * (1 - inCone);
}

// ---------------------------------------------------------------- camera keys {t, cx, cy}: the street, almost static
const K = (t, cx, cy) => ({ t, cx, cy });
export const CAM = [
  K(0, 690, -180), K(EV.so1, 540, -180),                       // a slow drift along the neon street during the hook
  K(EV.far - 0.2, 540, -180), K(EV.tower + 0.3, 540, -190),
  K(END + 10, 540, -190),
];
