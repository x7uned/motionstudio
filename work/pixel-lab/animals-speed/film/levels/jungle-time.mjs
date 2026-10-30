// LV2 · jungle (sloth): every time the picture and the sounds use, from the measured words (timeline.mjs).
// "A sloth moves at about a quarter of a kilometre an hour. It's so slow that green algae grow in its fur."
import { EV, LV, W } from "../timeline.mjs";

export const HOUR_END = W("hour", 1, "end");                  // end of "…a kilometre an hour."
export const BLINK1 = [EV.moves - 0.1, EV.moves + 0.75];       // a slow-motion blink on "moves"
export const REACH = [EV.quarter, HOUR_END];                   // the arm reaches out in super slow motion (comic: barely moves)
export const REACH_K = 0.13;                                   // how far it gets by "hour" (0..1 of the way to the leaf)
export const REACH_END = LV.sloth[1] + 0.6;                    // …and keeps creeping until the camera has left
export const SNAIL = [EV.moves + 0.2, EV.slow + 0.55];        // a tiny snail crawls along the branch and overtakes the hand
export const SNAIL_PULSE = 0.62;                               // one stretch-and-pull of the snail's foot (seconds)
export const MUNCH = [SNAIL[1] + 0.1, LV.sloth[1] + 0.4];      // …then nibbles the leaf the sloth was reaching for
export const BLINK2 = [EV.slow - 0.05, EV.slow + 1.0];         // a very slow blink on "slow"
export const ALGAE0 = EV.green;                                // green algae patches start spreading on "green"
export const ALGAE_TAG = [EV.algae, LV.sloth[1] + 0.25];       // "ALGAE" tag
export const MOTH = [EV.fur + 0.05, EV.fur + 1.05];            // a sloth moth flutters out of the fur on "fur"
export const SIGN_SWAY = [EV.sloth - 0.6, LV.sloth[1] + 0.8];
