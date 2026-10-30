// LV5 · racecourse: an 8-bit sound for every audible motion, from the same timing table as the picture (racecourse-time.mjs).
// Every hoof beat of the gallop and the prance is a hoof-down event of the gait phase (CONTACTS), so the drum of the
// hooves is exactly the drum of the legs on screen.
import { G0, G1, G_OUT, INTRO, CONTACTS, LEAVE, SPARKLES } from "./racecourse-time.mjs";

export const MOTIONS = [
  { t0: INTRO.toss, t1: INTRO.toss + INTRO.tossDur, kind: "swish", level: 0.3, note: "racehorse tosses its head, mane flicks" },
  { t0: INTRO.paw + INTRO.pawDur * 0.45, t1: INTRO.paw + INTRO.pawDur, kind: "scratch", level: 0.4, note: "front hoof paws the turf, ready to race" },
  { t0: G0, t1: G1 + G_OUT * 0.6, kind: "wind", level: 0.25, note: "rail fence and grass stream past while it gallops" },
  { t0: SPARKLES[0].t, t1: SPARKLES[SPARKLES.length - 1].t + SPARKLES[SPARKLES.length - 1].life, kind: "twinkle", level: 0.3, note: "proud sparkles around the prancing horse's head" },
  // one sound per hoof-down; the prance sets a diagonal pair down together, so simultaneous hooves share one louder step
  ...CONTACTS.filter((e, i, all) => e.t < LEAVE[1] + 0.3 && !(i > 0 && Math.abs(all[i - 1].t - e.t) < 0.02)).map((e) => ({ t0: e.t, t1: e.t + (e.gait === "gallop" ? 0.08 : 0.1), kind: "stamp", level: e.gait === "gallop" ? (e.near ? 0.5 : 0.36) : 0.42, note: e.gait === "gallop" ? `hoof beat, gallop (${e.leg})` : "hoof steps, proud prance (diagonal pair)" })),
];
