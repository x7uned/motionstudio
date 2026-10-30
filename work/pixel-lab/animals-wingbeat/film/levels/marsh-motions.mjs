// LV10 marsh: the timing table of its visible events (marsh.mjs draws from it) and the sound cues for the lead.
import { EV } from "../timeline.mjs";
export const T = {
  lens: [EV.tiny - 0.05, EV.midge + 0.45],          // the magnifying lens drifts in and settles in front of the moon
  lensIn: [EV.tiny - 0.05, EV.tiny + 0.25],         // …dissolving in while it moves
  focus: [EV.midge + 0.1, EV.midge + 0.6],          // the midge inside it comes into focus (dissolve + slight zoom)
};
export const MOTIONS = [
  { t0: T.lens[0], t1: T.lens[1], kind: "whoosh", note: "LV10: a magnifying lens glides in and stops in front of the moon on 'a tiny midge'" },
  { t0: T.focus[0], t1: T.focus[1], kind: "chime", note: "LV10: the midge comes into focus inside the lens" },
];
