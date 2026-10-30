// LV6 · savanna: an 8-bit sound for every audible motion, from the same timing table as the picture (savanna-time.mjs).
import { WIGGLE, S0, SK0, SK1, WOB, FLOP, PANT0, PANT_HZ, REST_TAG, STAM, LEAVE } from "./savanna-time.mjs";

const pants = [];
for (let t = PANT0 + 0.05; t < LEAVE[1] + 0.3; t += 1 / PANT_HZ) pants.push({ t0: t, t1: t + 0.14, kind: "puff", level: 0.25, note: "cheetah pants, belly heaving" });
export const MOTIONS = [
  { t0: WIGGLE[0], t1: WIGGLE[1], kind: "wiggle", level: 0.35, note: "cheetah butt wiggle before the launch" },
  { t0: S0, t1: S0 + 0.3, kind: "whoosh", level: 0.7, note: "cheetah launches into a sprint, dust burst" },
  { t0: S0 + 0.1, t1: SK0, kind: "patter", level: 0.45, note: "paws drumming at full sprint" },
  { t0: S0 + 0.05, t1: SK0 + 0.1, kind: "wind", level: 0.35, note: "speed lines, ground and grass stream past" },
  { t0: STAM.in, t1: STAM.in + 0.12, kind: "pop", level: 0.35, note: "stamina bar appears" },
  { t0: STAM.k1, t1: STAM.empty, kind: "slide", level: 0.35, note: "stamina bar drains" },
  { t0: STAM.empty, t1: STAM.empty + 0.14, kind: "alert", level: 0.45, note: "stamina empty, bar flashes red" },
  { t0: SK0, t1: SK1, kind: "scratch", level: 0.6, note: "paws skid in the dust" },
  { t0: WOB[0] + 0.05, t1: WOB[0] + 0.29, kind: "uhoh", level: 0.4, note: "dizzy wobble" },
  { t0: FLOP[0], t1: FLOP[1] - 0.04, kind: "fall", level: 0.3, note: "legs give way" },
  { t0: FLOP[1] - 0.04, t1: FLOP[1] + 0.08, kind: "thud", level: 0.55, note: "cheetah flops onto its side, dust cloud" },
  { t0: REST_TAG, t1: REST_TAG + 0.12, kind: "pop", level: 0.45, note: "+REST pickup" },
  ...pants,
];
