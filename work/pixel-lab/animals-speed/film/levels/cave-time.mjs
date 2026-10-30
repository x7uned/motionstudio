// LV7 · bat cave: every time of the level, derived from the measured words (EV) — shared by the picture (cave.mjs)
// and the sound list (cave-motions.mjs). No hard-coded seconds.
import { EV, LV } from "../timeline.mjs";

export const BAT = {
  out: [EV.tiny, EV.bat1 + 0.2],                 // "A tiny bat": flutters out of the cave mouth, settles in front of the moon
  squeak: EV.bat1 + 0.16,                        // a tiny happy squeak as it faces the camera (mouth opens)
  stream: [EV.freeTailed - 0.04, EV.bat2 + 0.5], // "the free-tailed bat": a swirling column of bats pours out of the cave
  tail: [EV.freeTailed + 0.02, EV.freeTailed + 0.62], // its little free tail wiggles on "free-tailed"
  tag: [EV.tracked - 0.04, EV.tracked + 0.3],    // "was tracked": a radio tag pops onto its back
  plane: [EV.tracked - 0.22, EV.so + 0.9],       // a small plane crosses the sky following the bats, then climbs away
  link: [EV.tracked + 0.06, EV.tracked + 0.42],  // the dotted tracking line grows from the plane to the tag
  windup: [EV.hundred1 - 0.16, EV.hundred1 + 0.02],// leans back, wings up
  dashOut: [EV.hundred1 + 0.02, EV.hundred1 + 0.3],// zooms off to the right (speed lines)
  dashBack: [EV.sixty - 0.14, EV.sixty + 0.3],    // comes back in from the left — it went all the way round
  settle: [EV.sixty + 0.3, EV.sixty + 0.66],      // overshoot and settle into the hover again
};
export const FLAP = 0.27;                         // hover wingbeat period (s)
export { EV, LV };
