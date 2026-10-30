// LV5 tropic: the timing table of its visible events (tropic.mjs draws from it) and the sound cues for the lead.
// OUT: Anna's hummingbird pulls its bill out of the red trumpet flower and backs off ~22 px on "low";
// HAPPY: closed smiling eyes + a little head tilt through "hum gave the bird its name" (fade in 0.28 s, out 0.3 s);
// BACK: the bill returns into the flower (mostly during the camera hop to LV6).
// No extra cues: the bill-out lands on "low hum", and the wing hum itself should carry that line. If the lead wants one,
// a very soft { t0: T.OUT[0], t1: T.OUT[0] + 0.12, kind: "pop" } matches the picture.
import { EV } from "../timeline.mjs";
export const T = {
  OUT: [EV.low - 0.05, EV.low + 0.4], HAPPY: [EV.hum - 0.15, EV.name + 0.35, 0.28, 0.3], BACK: [EV.name + 0.4, EV.nameEnd + 0.25],
};
export const MOTIONS = [];
