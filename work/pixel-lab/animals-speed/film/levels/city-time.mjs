// LV8 · city rooftop at dawn: every time of the finale, derived from the measured words (EV) — shared by the picture
// (city.mjs, city-hero.mjs, city-falcon.mjs) and the sound list (city-motions.mjs). No hard-coded seconds.
import { EV, LV, END } from "../timeline.mjs";

export const XF = 0.2;                                    // sprite frame / pose crossfade (6 frames at 30 fps)

// ---------------------------------------------------------------- the falcon
export const FAL = {
  land: [EV.bird - 0.12, EV.bird + 0.62],                 // "It's this bird": drops in from above, wings raised, lands on the parapet
  fold: [EV.bird + 0.62, EV.bird + 1.0],                  // folds its wings, settles, faces the camera
  sign: [EV.peregrine, EV.peregrine + 0.55],              // the LV 8 neon flickers on
  proud: [EV.falcon - 0.04, EV.falconEnd + 0.1],          // "the peregrine falcon": puffs its chest, happy eyes, sparkle
  crouch: [EV.dives - 0.3, EV.dives - 0.02],              // "When it dives": crouches, wings open
  launch: [EV.dives - 0.02, EV.dives + 0.26],             // shoots straight up out of the frame
  stoop: [EV.prey - 0.3, EV.prey + 0.2],                  // "at its prey": the stoop — a teardrop streak from the top down past the roof
  ring: EV.prey - 0.1,                                    // the "sonic" ring bursts around it mid-dive
  race: [EV.bullet - 0.52, EV.train + 0.3],              // "That's as fast as a bullet train": neck and neck with the train's nose
  back: [EV.liked + 0.12, EV.video + 0.5],                // circles back up over the skyline …
  perch: [EV.video + 0.5, EV.video + 0.9],                // … flares and lands on the radio mast
  leave: [EV.lastEnd - 0.5, EV.lastEnd - 0.2],            // hops off the mast to the right (out of frame)
  pass: [EV.gust - 0.06, EV.gust + 0.3],                  // the last super-fast pass right past the hero (left → right)
};
// prey pigeon (far off, beyond the roof edge) and the parapet pigeons
export const PIG = {
  flee: [EV.bird - 0.02, EV.bird + 0.9],                  // the two parapet pigeons flap away as the falcon drops in
  prey: [EV.dives - 0.5, EV.prey + 1.2],                  // a far-off pigeon flies past below the roof edge …
  dodge: EV.prey - 0.04,                                  // … and dodges the stoop at the last moment (escapes)
};
// the train
export const TRAIN = { run: [EV.bullet - 0.52, EV.train + 1.5], speed: 620 };   // the nose passes the centre on "bullet"

// ---------------------------------------------------------------- the hero (the channel's character, sprite sheet rows)
// [t0, row, frame sequence, seconds per frame]; every change crossfades over XF.
export const POSES = [
  [-1e9, 5, [0, 1, 4, 5, 3, 1], 0.6],                     // "So which animal is the fastest?" — thinking, hand on the chin
  [EV.cheetah2 - 0.14, 2, [1, 2, 4], 0.46],            // "The cheetah?" — talks, gestures at the guess card
  [EV.racehorse2 - 0.14, 3, [1, 4, 1], 0.46],          // "A racehorse?" — explains
  [EV.nope - 0.1, 3, [2], 9],                             // "Nope." — big shrug
  [EV.bird - 0.1, 4, [0, 1, 3, 5, 4], 0.5],               // "It's this bird" — points up at the falcon dropping in
  [EV.falcon - 0.06, 9, [0, 3, 5, 1], 0.48],              // "the peregrine falcon" — excited
  [EV.dives - 0.36, 4, [0, 3, 0, 5], 0.5],                // "When it dives" — aims the radar gun up at the stoop
  [EV.three - 0.06, 7, [2, 3, 0, 5, 1], 0.52],            // "over three hundred" — surprised, hands up, gun still flashing
  [EV.bullet - 0.22, 9, [2, 1, 3, 4, 0], 0.46],           // "as fast as a bullet train" — cheers the race
  [EV.liked - 0.06, 0, [0, 1, 3, 4, 0, 2, 0, 5, 6], 0.6],// recovers: idle (with the wink) under the share card
  [EV.gust - 0.24, 7, [2], 9],                            // the falcon comes in — hands up — and the gust blows him over
];
// gun: pulled out when he aims; flies off in the gust
export const GUN = {
  show: [EV.dives - 0.5, EV.dives - 0.2],                 // slides from his hip to his raised hand
  count: [EV.over - 0.02, EV.over + 0.36],                // the display counts up to 300+
  flash: EV.over + 0.36,                                  // "300+" flashes (keeps blinking to the end)
};
// the knock-over
export const HIT = {
  t: EV.gust + 0.06,                                      // the wind blast reaches him (falcon's head passes his x)
  spin: [EV.gust + 0.06, EV.gust + 0.36],                 // a quick spin on the spot
  fall: [EV.gust + 0.36, EV.gust + 0.76],                 // tips over (ease-in rotation to lying on the roof)
  bounce: [EV.gust + 0.76, EV.gust + 1.08],               // little bounce on landing + dust puff
  gunFly: [EV.gust + 0.1, EV.gust + 0.86],                // the radar gun flies off and lands, still blinking "300+"
  feathers: [EV.gust + 0.1, END],                         // a few feathers float down
};
export { EV, LV, END };
