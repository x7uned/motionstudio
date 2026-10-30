// «Fake buttons» timeline: every beat, camera key and state is anchored to measured words of the single voice take
// (voice/words.json, retimed on Scribe). W() matches words without punctuation ("3,250" → "3250"). Not a loop.
//
// ONE side-view world: a New York-style street corner at golden hour (front sidewalk, road with a zebra crossing, far
// sidewalk, city behind) and, to the right of the corner, an office building cut open like a dollhouse (lobby with an
// elevator at street level, an office on floor 2, the building's control room on floor 3). The channel's character
// stands at the corner and presses the crosswalk button. The camera visits: corner → lobby/elevator → rides up with the
// elevator to the office (thermostat) → back down to the corner (phone camera, the ending).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) time of the n-th occurrence of a spoken word, e.g. W("buttons", 3) or W("all", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = words[words.length - 1].end;
export const END = Math.ceil((VOICE_END + 1.6) * FPS) / FPS;

// ---------------------------------------------------------------- world layout (grid px, y grows down, z = 1)
// screen = (270 + (x − cx), 480 + (y − cy)). At the street keys (cy = −160) the sidewalk top y = 0 is at screen y 640.
export const WORLD_W = 1600;
export const LAND = 0;                       // front sidewalk top = the hero's feet = the building's ground floor
export const ROAD = -40;                     // road surface behind the hero (cars drive here, seen from the side)
export const BACKWALK = -84;                 // far sidewalk (the pedestrian signal head stands here, facing us)
export const HERO_X = -330;                  // the channel's character (feet at HERO_X, LAND), faces right
// the crosswalk push-button box on its pole, right of the hero: the box's button sits where his pointing fingertip is
// (sprite row 4, fingertip ≈ cell (148, 38) → +47, −163 from his feet). Builders: keep the button exactly here.
export const BUTTON = { x: HERO_X + 47, y: LAND - 158, pole: HERO_X + 60 };   // frame 4 fingertip ≈ cell (150, 43)
export const ZEBRA = { x0: -560, x1: -400 };   // the zebra crossing across the road (left of the hero, he waits to cross)
export const PED_SIGNAL = { x: -470, y: BACKWALK - 210 };   // the WALK / DON'T WALK head on the far side (faces us)
export const CABINET = { x: -200 };            // the traffic-signal controller cabinet on the front sidewalk ("the computer")
// the office building (cut open, front wall removed): x from BLD.x0 to BLD.x1; floors are FLOOR px tall
export const FLOOR = 300;
export const BLD = { x0: -90, x1: 620, f1: 0, f2: -FLOOR, f3: -2 * FLOOR, roof: -3 * FLOOR };   // floor levels (world y of each floor's surface)
export const SHAFT = { x0: 420, x1: 560 };     // the elevator shaft (car is 140 wide, ~250 tall); lobby doors face us
export const THERMO = { x: 250, y: BLD.f2 - 150 };  // the office thermostat on the back wall (centre)
export const TOD_KEYS = [[-2000, 4.3], [2000, 4.3]];  // warm late-afternoon light over the whole scene
export const SEA_RANGES = [];
export const DISC = { x: 120, y: 250 };        // the low sun behind the skyline (screen), only seen at the corner

// ---------------------------------------------------------------- events (seconds), by narration
export const EV = {
  // "You've been pressing fake buttons your whole life."
  pressing: W("pressing"), fake1: W("fake"), buttons1: W("buttons"), life: W("life"),
  // "Start with the crosswalk button."
  start: W("start"), crosswalk: W("crosswalk"), button1: W("button"),
  // "In New York, computers took over the traffic lights, and most buttons were switched off."
  newYork: W("new"), computers: W("computers"), traffic: W("traffic"), lights: W("lights"), most: W("most"), switched: W("switched"), off: W("off"),
  // "In 2004, more than 2,500 of the city's 3,250 buttons did nothing at all."
  y2004: W("2004"), more: W("more"), n2500: W("2500"), n3250: W("3250"), buttons3: W("buttons", 3), nothing: W("nothing"), allEnd: W("all", 1, "end"),
  // "The elevator's close button? In the US, for the first few seconds it can't do anything:"
  elevator: W("elevator's"), close: W("close"), button2: W("button", 2), us: W("us"), first: W("first"), seconds: W("seconds"), cant: W("can't"), anything: W("anything"),
  // "by law, the doors stay open for people who move slowly."
  law: W("law"), doors: W("doors"), stay: W("stay"), open: W("open"), people1: W("people"), move: W("move"), slowly: W("slowly"), slowlyEnd: W("slowly", 1, "end"),
  // "It's really there for firefighters, who use it with a special key."
  firefighters: W("firefighters"), use: W("use"), special: W("special"), key: W("key"), keyEnd: W("key", 1, "end"),
  // "The thermostat in your office? In one poll of heating technicians, 51 out of 70 said they had installed fake ones."
  thermostat: W("thermostat"), office: W("office"), poll: W("poll"), technicians: W("technicians"), n51: W("51"), n70: W("70"), installed: W("installed"), fake2: W("fake", 2), ones: W("ones"),
  // "People turn the dial, feel better, and stop complaining."
  people2: W("people", 2), turn: W("turn"), dial: W("dial"), better: W("better"), stop: W("stop"), complaining: W("complaining"), complainingEnd: W("complaining", 1, "end"),
  // "Even your phone's camera click is fake. There's no shutter inside, no moving part. It's a recorded sound."
  even: W("even"), phones: W("phone's"), camera: W("camera"), click: W("click"), fake3: W("fake", 3), shutter: W("shutter"), inside: W("inside"), moving: W("moving"), part: W("part"),
  recorded: W("recorded"), sound: W("sound"), soundEnd: W("sound", 1, "end"),
  // "So why keep them? Pressing something makes you feel in control, and that feels good."
  so: W("so"), why: W("why"), keep: W("keep"), pressing2: W("pressing", 2), something: W("something"), control: W("control"), feels: W("feels"), good: W("good"),
  // "The button doesn't change the light. It changes how you feel."
  button3: W("button", 3), doesnt: W("doesn't"), change: W("change"), light: W("light"), changes: W("changes"), feel3: W("feel", 3), feelEnd: W("feel", 3, "end"),
  // call to action: "Liked this video? Send it to a friend, and follow so you don't miss the next one."
  liked: W("liked"), video: W("video"), send: W("send"), friend: W("friend"), follow: W("follow"), miss: W("miss"), next: W("next"), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- the stations and the moves between them
// corner (hook → crosswalk → New York numbers) · lobby (elevator) · elevator ride up · office (thermostat) · corner again
export const PAN_TO_LOBBY = [EV.allEnd + 0.05, EV.elevator + 0.45];          // street → lobby (≈ 0.8 s, along the street)
export const RIDE = [EV.keyEnd + 0.1, EV.office - 0.05];                      // the elevator car rises floor 1 → 2 with the camera
export const BACK_TO_CORNER = [EV.complainingEnd + 0.05, EV.phones - 0.05];   // office → corner (diagonal glide down-left)
export const STATION = { corner: { cx: -300, cy: -160 }, lobby: { cx: 330, cy: -160 }, office: { cx: 250, cy: -160 - FLOOR } };

// ---------------------------------------------------------------- the crosswalk signal (one schedule, run by the cabinet's computer)
// "walk" windows: the WALK light comes on by itself on the computer's timer, never because of a press.
export const WALK_ON = [[EV.traffic - 0.1, EV.off + 0.2], [EV.light + 0.25, END + 1]];
export function walkAt(t) { for (const [a, b] of WALK_ON) if (t >= a && t < b) return 1; return 0; }   // 0 = DON'T WALK (red hand), 1 = WALK
// the hero's presses on the crosswalk button (the box flashes WAIT, nothing else happens)
export const PRESSES = [EV.pressing, EV.fake1 + 0.08, EV.buttons1 + 0.1, EV.life + 0.05, EV.crosswalk, EV.button1 + 0.05, EV.pressing2 + 0.05, EV.something + 0.1, EV.button3 - 0.05, EV.doesnt + 0.05];

// ---------------------------------------------------------------- camera keys {t, cx, cy}
const K = (t, cx, cy) => ({ t, cx, cy });
export const CAM = [
  K(0, -260, -160), K(EV.start, STATION.corner.cx, STATION.corner.cy),                  // a slow drift onto the corner during the hook
  K(PAN_TO_LOBBY[0], STATION.corner.cx, STATION.corner.cy), K(PAN_TO_LOBBY[1], STATION.lobby.cx, STATION.lobby.cy),
  K(RIDE[0], STATION.lobby.cx, STATION.lobby.cy), K(RIDE[1], STATION.office.cx, STATION.office.cy),
  K(BACK_TO_CORNER[0], STATION.office.cx, STATION.office.cy), K(BACK_TO_CORNER[1], STATION.corner.cx, STATION.corner.cy),
  K(EV.so, STATION.corner.cx, STATION.corner.cy), K(EV.liked, -280, -160), K(END + 10, -280, -160),
];
