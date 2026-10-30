// Actors (the channel's character, the console prop, traffic, pedestrians): every time and place, derived from the measured
// words (EV) and the shared view constants of timeline.mjs. Shared by the picture (actors*.mjs) and the sound list
// (actors-motions.mjs). No hard-coded seconds except small offsets around words.
import { EV, END, HERO_X, LAND, ROAD, BACKWALK, TURN1, TURN_BACK, TURN2, LAG, CULL_ON, drawnAt } from "../timeline.mjs";

export const XF = 0.2;                       // sprite frame / pose crossfade (≥ 6 frames at 30 fps)

// ---------------------------------------------------------------- the character's poses (sprite sheet rows)
// [t0, row, frame sequence, seconds per frame]; every change crossfades over XF.
export const WAVE = 0.3;                      // seconds per wave frame
export const POSES = [
  [-1e9, 0, [0, 1, 3, 4, 5, 4, 3, 1], 0.55],              // hook: idle, looking at the city
  [EV.november - 0.12, 0, [2], 0.8],                      // "…this November" → a wink
  [EV.november + 0.68, 0, [3, 4, 5, 4, 3, 1], 0.5],
  [EV.almost - 0.12, 9, [1, 2, 3, 2, 4, 3], 0.32],        // "almost real" → excited
  [EV.ps5 - 0.1, 3, [0, 1, 2, 4, 2, 1], 0.42],          // "PS5 … without lag?" → shrugs at the console
  [EV.trick - 0.14, 4, [0, 1, 2, 3, 4, 5], 0.4],          // "Here's the trick" → points up
  [EV.isnt - 0.1, 3, [2, 4, 2, 1], 0.45],                 // "…isn't there" → open hands at the vanishing street
  [EV.camera - 0.5, 4, [1, 2, 3, 4, 5, 0], 0.4],          // "…your camera can see" → points up at the game camera
  [EV.turn1 - 0.3, 0, [0, 1, 3, 4], 0.5],                 // gets ready to turn
  [TURN1[1] - 0.05, 2, [0, 1, 2, 3, 4, 2, 1], 0.38],      // facing left: "the street behind you is no longer drawn"
  [EV.building1 - 0.05, 3, [1, 2, 4, 2, 1, 0], 0.42],     // back to the right: "hidden behind another building?"
  [EV.far - 0.12, 5, [0, 1, 2, 3, 4, 5], 0.55],           // "Far away, a tower…" → thinking
  [EV.details - 0.14, 4, [2, 3, 4, 5, 1], 0.42],          // "details only when you come close" → points at it
  [EV.people - 0.12, 2, [1, 2, 3, 4, 2, 5], 0.38],        // "people and cars…" → talks
  [EV.former - 0.12, 6, [0, 1, 2, 3, 4, 5], 0.6],        // the former technical director → arms crossed
  [EV.rockstar2 - 0.12, 9, [1, 2, 3, 2, 4, 3], 0.34],     // "Rockstar has used tricks…" → excited
  [EV.so2 - 0.08, 0, [0, 1, 3, 4], 0.45],                 // "So next time…"
  [TURN2[0] + 0.1, 7, [2, 3, 1, 3, 2, 4], 0.32],          // turned too fast → surprised, hands up, as the city pops in late
  [EV.liked - 0.12, 0, [0, 1, 3, 4, 5, 4], 0.5],          // "Liked this video?"
  [EV.follow - 0.12, 1, [1, 2, 1, 2, 1, 2, 1], WAVE],     // "…and follow" → waves
  [EV.follow - 0.12 + 7 * WAVE, 0, [0, 1, 3, 4, 5, 4, 3], 0.55],   // idle to the end
];

// ---------------------------------------------------------------- facing (mirror) — he turns with the game camera
// Each turn is a dithered crossfade between the normal sprite (faces right) and its mirror, with a small squash.
const mid1 = (TURN1[0] + TURN1[1]) / 2, midB = EV.building1 - 0.15;
export const MIRROR = [   // t = the dithered crossfade (6 frames), sq = the squash window around it (he narrows as he turns)
  { t: [mid1 - 0.1, mid1 + 0.1], sq: [mid1 - 0.24, mid1 + 0.24], to: 1 },                   // turn around → left
  { t: [midB - 0.1, midB + 0.1], sq: [midB - 0.2, midB + 0.2], to: 0 },                     // back → right
  { t: [TURN2[0], TURN2[0] + 0.2], sq: [TURN2[0] - 0.04, TURN2[0] + 0.24], to: 1 },         // "really fast" → left in 6 frames
]
export const HOP = [TURN2[0] + 0.18, TURN2[0] + 0.62];   // the startled little hop when the city pops in late

// ---------------------------------------------------------------- the console prop (next to him on the sidewalk)
export const CONSOLE = {
  x: HERO_X + 82,                             // world x of its centre, feet on LAND
  pop: [EV.ps5, EV.ps5 + 0.34],               // drops in with a squash
  strain: [EV.without - 0.04, EV.heres - 0.08], // "without lag?": fan spins hard, sweats, shakes
  bubble: [EV.lag - 0.04, EV.trick - 0.1],    // "LAG?" speech bubble
  out: [EV.trick + 0.12, EV.most - 0.02],     // dissolves away (gone by ≈ 8.1)
};

// ---------------------------------------------------------------- street lines (world y)
export const LANE = { far: ROAD - 6, near: ROAD + 18 };   // wheel bottoms: far lane drives left, near lane drives right
export const WALK = { back: BACKWALK, front: LAND - 3 };  // pedestrian feet

// ---------------------------------------------------------------- traffic: [kind, colour, lane, tA, speed]
// tA = when the car's centre passes the character (x = HERO_X); x(t) = HERO_X + dir·speed·(t − tA), dir = far ? −1 : +1.
// Cars only exist where the camera can see them (drawnAt): they materialise driving into the view cone and dissolve
// into the blueprint, then vanish, when they leave it.
export const CARS = [
  // hook: the whole street is drawn and busy
  ["coupe", "pink", "far", 3.1, 112],
  ["sport", "lilac", "far", 0.9, 118],
  ["convertible", "mint", "near", 0.2, 96],
  ["bus", "aqua", "near", 2.2, 72],
  ["taxi", "yellow", "far", 7.75, 100],          // still on the left when the culling starts → dissolves, vanishes
  // "your console only draws what your camera can see": a car materialises as it drives into the view
  ["sport", "sunset", "near", 10.9, 98],         // both on the right when he turns around → dissolve
  ["muscle", "lilac", "far", 14.0, 92],
  // the turn: the left side gets drawn — cars there now exist
  ["coupe", "teal", "near", 15.0, 92],
  // back to the right: cars driving into the view get drawn, cars leaving it vanish behind him
  ["taxi", "yellow", "near", 18.3, 90],
  ["convertible", "peach", "far", 20.6, 104],
  ["coupe", "white", "near", 20.8, 96],
  // the people/cars beat is scripted (SPAWN); the deleted car is scripted (DELETE)
  ["sport", "mint", "near", 29.0, 104],
  ["bus", "aqua", "near", 37.0, 70],             // "a whole state" — the big bus materialises out of the blueprint
  ["coupe", "pink", "far", 36.2, 110],
  ["convertible", "lilac", "far", 39.6, 104],
  ["sport", "sunset", "far", 41.6, 112],         // on the right when he turns fast → dissolves
  // after the fast turn: the left side pops in late
  ["taxi", "yellow", "near", 42.7, 92],
  ["coupe", "teal", "far", 44.0, 100],           // appears behind his back as it drives into the view, then away
  ["convertible", "mint", "near", 46.4, 96],
];

// ---------------------------------------------------------------- pedestrians: [kind, walk, tA, speed]
// x(t) = HERO_X + speed·(t − tA) (speed signed: + walks right, − walks left)
export const PEOPLE = [
  ["tourist", "back", 2.6, 26],
  ["dress", "back", 6.0, -22],                    // on the left when the culling starts → dissolves
  ["jogger", "front", -2.0, 52],                  // runs ahead of him during the hook
  ["dogwalker", "front", 14.67, 24],              // on the left front walk when the culling starts
  ["retiree", "back", 12.0, 20],
  ["skater", "back", 13.5, -62],
  ["tourist", "back", 21.5, 24],                  // left side, seen after the turn
  ["dress", "back", 16.0, 24],
  ["jogger", "back", 32.5, -48],
  ["dress", "front", 32.0, 26],
  ["skater", "back", 39.0, 60],
  ["dogwalker", "back", 50.0, 22],                // left side after the fast turn (pops in late)
  ["retiree", "back", 44.0, -18],
  ["jogger", "back", 47.6, -50],
];

// ---------------------------------------------------------------- "They appear in front of you and vanish behind you"
// Scripted spawns ahead of him (inside the view, right part of the screen) with a sparkle; all head left, pass behind
// him and dissolve where the view ends. [kind, colour/walk, lane, spawn time, spawn x, speed (signed)]
export const SPAWN = [
  { what: "person", kind: "tourist", walk: "back", t: EV.people, x: HERO_X + 92, v: -40 },
  { what: "person", kind: "jogger", walk: "back", t: EV.people + 0.16, x: HERO_X + 120, v: -60 },
  { what: "car", kind: "sport", col: "mint", lane: "far", t: EV.cars1, x: HERO_X + 158, v: -96 },
  { what: "car", kind: "taxi", col: "yellow", lane: "far", t: EV.appear, x: HERO_X + 180, v: -110 },
  { what: "person", kind: "skater", walk: "front", t: EV.front, x: HERO_X + 130, v: -100 },
]

export const HONK = { spawn: 3, t: [EV.front + 0.34, EV.front + 0.7] };   // the spawned taxi honks once ("…in front of you")

// ---------------------------------------------------------------- "cars were deleted as soon as they were out of sight"
// One car drives left out of the view: the moment its tail leaves the cone it is a blueprint ghost, a red DELETED stamp
// slams on it and a little trash can pops up; on "soon" the ghost drops into the can, the lid shuts; both fade on "sight".
export const DELETE = {
  kind: "coupe", col: "red", lane: "far", v: 118,
  out: EV.deleted,                             // tail leaves the view (centre at OUT_X)
  stop: [EV.deleted, EV.deleted + 0.42],       // the ghost rolls to a stop
  stamp: [EV.deleted - 0.02, EV.deleted + 0.16],
  can: [EV.deleted + 0.22, EV.deleted + 0.5],
  drop: [EV.soon - 0.02, EV.soon + 0.5],       // ghost flips into the can
  lid: [EV.soon + 0.5, EV.soon + 0.66],
  fade: [EV.sight + 0.1, EV.sight + 0.55],
};

// ---------------------------------------------------------------- "turn around really fast": the T-pose glitch
// On the late-drawn left side a pedestrian pops in stuck in a T-pose, slides a bit, then snaps into a walk cycle.
const TP_X = HERO_X - 196;
const tpPop = (() => { for (let t = TURN2[0]; t < TURN2[0] + 3; t += 1 / 240) if (drawnAt(TP_X, t) > 0.5) return t; return TURN2[1] + LAG; })();
export const TPOSE = {
  kind: "tourist", walk: "front", x: TP_X, v: 30,
  pop: [tpPop - 0.04, tpPop + 0.16],           // pops in exactly when the late city reaches it (≈ 41.15)
  slide: [tpPop, tpPop + 0.6],                 // T-pose sliding along the pavement without walking
  snap: [tpPop + 0.6, tpPop + 0.84],           // snaps (crossfade) into its walk cycle
};

export { EV, END, HERO_X, LAND, ROAD, BACKWALK, TURN1, TURN_BACK, TURN2, LAG, CULL_ON };
