// LV8 · night camp: every time of the finale, derived from the measured words (EV) — shared by the picture
// (camp.mjs, camp-hero.mjs, camp-mosq.mjs) and the sound list (camp-motions.mjs). No hard-coded seconds.
import { EV, LV, END } from "../timeline.mjs";

export const XF = 0.24;                       // sprite frame / pose crossfade (≥ 6 frames at 30 fps)

// ---------------------------------------------------------------- the comic beat in the silent pause (mosquito1End → yes)
const pause0 = EV.mosquito1End, pause1 = EV.yes, pd = pause1 - pause0;
export const BEAT = {
  buzz: [pause0 + 0.02, pause0 + 0.62 * pd],  // the mosquito dives past his face and zips around his head
  swat: pause0 + 0.3 * pd,                     // hands up: he swats at it (the crossfade starts XF earlier)
  clap: pause0 + 0.36 * pd,                    // the moment his hands meet — empty
  smug: [pause0 + 0.62 * pd, pause1],          // it hovers back at the moon, smug
};

// ---------------------------------------------------------------- the character's poses (sprite sheet rows), in order
// [t0, row, frame sequence, seconds per frame]; every change crossfades over XF.
export const POSES = [
  [-1e9, 0, [0, 1, 3, 4, 5, 6, 4, 3], 0.72],             // idle by the fire while the camera arrives
  [EV.number - 0.06, 5, [0, 4, 5, 3], 0.5],              // "…number one?" → thinking, hand on the chin
  [EV.great - 0.14, 2, [1, 2, 1, 4], 0.36],              // "A great white shark?" → talks, gestures at the cards
  [EV.hungry - 0.14, 3, [1, 0, 4, 1], 0.34],             // "A hungry lion?" → explains
  [EV.giant - 0.14, 2, [2, 1, 4, 2], 0.36],              // "A giant snake?"
  [EV.nope - 0.08, 3, [2], 9],                           // "Nope." → big shrug
  [EV.little - 0.12, 4, [0, 1, 2, 3, 4, 5], 0.42],       // "It's this little guy" → points up at the mosquito
  [BEAT.swat - XF, 7, [2, 3, 0], 0.32],                  // swats at it (hands up) — and misses
  [EV.yes - 0.32, 6, [0, 1, 4, 5], 0.66],                // arms crossed: annoyed while it gets its crown
  [EV.every - 0.12, 0, [0, 1, 3, 4], 0.78],              // arms down, idle: doesn't notice it landing on his arm
  [EV.die, 7, [2, 3, 0, 5], 0.34],                       // bitten → surprised, hands up
  [EV.well + 0.08, 8, [0, 1, 4, 3, 5, 1], 0.62],         // "Well, from the malaria it carries." → sad, getting sick
  [EV.fall - 0.3, 7, [2], 9],                            // "whoa" — and he tips over stiff as a plank
];

// ---------------------------------------------------------------- the character's state changes
export const HERO = {
  bite: EV.die,                                // the red bump starts to swell
  bumpGrow: [EV.die, EV.die + 0.3],
  sick: [EV.well + 0.15, EV.carriesEnd],       // turns slightly greenish
  sweat: [EV.malaria + 0.05, EV.malaria + 1.0],// a sweat drop slides down the temple
  sway: [EV.carries, EV.fall],                 // starts to sway, more and more
  dizzy: [EV.liked + 0.2, EV.liked + 0.6],     // dizzy stars fade in (they keep circling to the end)
  fall: [EV.fall, EV.fall + 0.45],             // tips over (ease-in rotation to lying)
  bounce: [EV.fall + 0.45, EV.fall + 0.8],     // little bounce on landing + dust puff
  ghost: [EV.ghost, END],                      // the little ghost rises from the body and waves
};

// ---------------------------------------------------------------- the mosquito
export const MQ = {
  flyIn: [EV.little - 0.2, EV.guy + 0.5],           // whines in from the reeds to the centre under the moon
  loop: [EV.mosquito1 + 0.04, EV.mosquito1End - 0.02],   // a proud little loop on "the mosquito"
  sign: [EV.mosquito1, EV.mosquito1 + 0.8],   // the LV 8 neon sign flickers on
  crown: [EV.yes, EV.yes + 0.36],              // a tiny crown pops onto its head
  sparkles: [EV.yes, EV.deadliest, EV.earth, EV.mosquito2],
  toArm: [EV.every + 0.12, EV.thousand5 + 0.04],// sneaks down and lands on his arm
  sit: [EV.thousand5 + 0.04, EV.die + 0.14],   // sits on the arm (folds wings, rubs its hands)
  bite: [EV.die - 0.1, EV.die + 0.14],         // leans in and bites
  hop: [EV.die + 0.14, EV.die + 0.62],         // pops off the arm as he jerks his hands up
  tag: [EV.malaria - 0.12, EV.carriesEnd + 0.2],// MALARIA tag with the parasite blob near the bite
  away: [EV.liked + 0.02, EV.liked + 1.25],    // flies off happily toward the moon (getting smaller)
  laps: [EV.liked + 1.25, END + 1],            // tiny victory laps in front of the moon
};
export { EV, LV, END };
