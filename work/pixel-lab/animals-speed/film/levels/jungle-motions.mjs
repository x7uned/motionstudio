// LV2 · jungle (sloth): every audible motion as an 8-bit sound that lasts exactly as long as the motion. Computed from
// the same constants as the picture (jungle-time.mjs), never hard-coded seconds.
import { REACH, SNAIL, SNAIL_PULSE, MUNCH, ALGAE0, ALGAE_TAG, MOTH } from "./jungle-time.mjs";

const pulses = [];
for (let i = 0; SNAIL[0] + i * SNAIL_PULSE < SNAIL[1]; i++) { const a = SNAIL[0] + i * SNAIL_PULSE; pulses.push({ t0: a + 0.25 * SNAIL_PULSE, t1: Math.min(SNAIL[1], a + 0.85 * SNAIL_PULSE), kind: "squish", level: 0.2, note: "tiny snail crawls along the branch" }); }
const nibbles = [];
for (let t = MUNCH[0] + Math.PI / 18; t < MUNCH[1]; t += (2 * Math.PI) / 9) nibbles.push({ t0: t, t1: t + 0.05, kind: "nibble", level: 0.15, note: "snail nibbles the leaf" });

export const MOTIONS = [
  { t0: REACH[0], t1: REACH[1], kind: "creak", level: 0.35, note: "sloth arm reaches out in super slow motion" },
  ...pulses,
  ...nibbles,
  { t0: ALGAE0, t1: ALGAE0 + 2.0, kind: "twinkle", level: 0.35, note: "green algae spreads through the fur" },
  { t0: ALGAE_TAG[0], t1: ALGAE_TAG[0] + 0.1, kind: "pop", level: 0.4, note: "ALGAE tag" },
  { t0: MOTH[0], t1: MOTH[1], kind: "flutter", level: 0.3, note: "tiny sloth moth flutters out of the fur" },
];
