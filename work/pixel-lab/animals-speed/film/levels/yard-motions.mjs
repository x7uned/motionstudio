// LV4 · yard (cat): every audible motion as an 8-bit sound that lasts exactly as long as the motion. Computed from the
// same constants as the picture (yard-time.mjs), never hard-coded seconds.
import { EV } from "../timeline.mjs";
import { MOUSE_IN, MOUSE_WAIT, CROUCH, WIGGLE, LAUNCH, SKID, SKID_END, MOUSE_RUN, PROUD, SETTLE, TURNS } from "./yard-time.mjs";

export const MOTIONS = [
  { t0: EV.your2 - 0.2, t1: EV.cat2 + 0.1, kind: "swish", level: 0.2, note: "tabby flicks its tail" },
  { t0: MOUSE_IN[0], t1: MOUSE_IN[1], kind: "trill", level: 0.45, note: "wind-up toy mouse whirrs in along the fence" },
  { t0: MOUSE_WAIT[0], t1: MOUSE_WAIT[1], kind: "rattle", level: 0.2, note: "toy mouse's key ticking, it jitters" },
  { t0: CROUCH[0], t1: CROUCH[1], kind: "crouch", level: 0.3, note: "cat drops into a hunting crouch" },
  { t0: WIGGLE[0], t1: WIGGLE[1], kind: "wiggle", level: 0.45, note: "butt wiggle" },
  { t0: LAUNCH - 0.03, t1: LAUNCH + 0.25, kind: "whoosh", level: 0.8, note: "cat explodes into a sprint, dust poof" },
  { t0: LAUNCH, t1: SKID[0], kind: "dash", level: 0.7, note: "zoomies lap round the yard" },
  { t0: LAUNCH + 0.05, t1: SKID[0], kind: "patter", level: 0.5, note: "paws drumming the lawn" },
  { t0: MOUSE_RUN[0], t1: MOUSE_RUN[1], kind: "trill", level: 0.25, note: "toy mouse flees ahead" },
  ...TURNS.map((tt, i) => ({ t0: tt - 0.06, t1: tt + 0.06, kind: "swish", level: 0.4, note: `turn at the ${i ? "right" : "left"} end of the lawn` })),
  { t0: TURNS[0] + 0.02, t1: TURNS[0] + 0.1, kind: "pop", level: 0.3, note: "yarn ball knocked rolling" },
  { t0: SKID[0], t1: SKID[1], kind: "slide", level: 0.7, note: "skids to a stop on the lawn" },
  { t0: SKID[0], t1: SKID[1], kind: "scratch", level: 0.35, note: "claws scrape, grass flies" },
  { t0: SKID_END - 0.02, t1: SKID_END + 0.1, kind: "squeak", level: 0.6, note: "toy mouse squeaks under the paw" },
  { t0: PROUD[0] - 0.06, t1: PROUD[0] + 0.3, kind: "puff", level: 0.4, note: "dust poof as it sits up" },
  { t0: PROUD[1], t1: PROUD[1] + 0.35, kind: "sparkle", level: 0.35, note: "proud cat, fur puffed" },
  { t0: PROUD[0], t1: SETTLE[0] + 0.7, kind: "wind", level: 0.3, note: "wind through the puffed fur" },
];
