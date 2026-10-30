// LV5 · desert timing: every motion of the scorpion level, derived from the measured words (timeline EV) — shared by the
// picture (desert.mjs) and the sound list (desert-motions.mjs), so both always agree.
import { EV, LV, CAM, W } from "../timeline.mjs";

const arrive = CAM.find((k) => k.cx === 2430).t;            // camera settles on the scorpion
const leave = CAM.filter((k) => k.cx === 2430)[1].t;         // camera starts toward the village
export const T = {
  arrive, leave, end: LV.scorpion[1],
  // "scorpion": scuttles out from behind the big sandstone boulder to the centre under the sun
  emerge: [EV.scorpion - 0.25, EV.scorpion + 0.66],
  // "tiny": a wooden 5 CM ruler drops into the sand beside it; it looks up at it; the ruler leaves before "still"
  ruler: { drop: EV.tiny - 0.2, land: EV.tiny + 0.02, settle: EV.tiny + 0.42, out: [EV.still - 0.08, EV.still + 0.3] },
  lookUp: [EV.tiny + 0.04, EV.tiny + 0.26], lookBack: [EV.still - 0.12, EV.still + 0.1],
  label: [EV.tiny + 0.02, EV.tiny + 0.2],
  // "Still, its sting": the tail rises high over its head into the sun, the pincers go up (boxer pose), the stinger glints
  raise: [EV.still, EV.still + 0.55], arms: [EV.still + 0.12, EV.still + 0.5], glint: [EV.sting, EV.sting + 0.5],
  // "three thousand": three pincer clacks (close 0.07 s, reopen 0.12 s)
  clacks: [EV.three, EV.thousand2, EV.thousand2 + 0.3], clackClose: 0.07, clackOpen: 0.12,
  // "people a year": the pose relaxes (tail to a mid curl, pincers down)
  relax: [EV.thousand2 + 0.6, EV.thousand2 + 1.1],
  // "mostly children": a sheepish face (brows up, looks aside, tail droops); the MOSTLY CHILDREN tag fades in and out
  // natural blinks placed between the beats (never during a look or a pose change)
  blinks: [EV.scorpion + 0.38, EV.sting + 0.6, EV.thousand2 + 0.75, W("year", 2) + 0.3, EV.children + 0.55],
  sheepish: [EV.mostly - 0.05, EV.mostly + 0.3], tag: [EV.mostly, EV.mostly + 0.3, EV.children + 0.42, EV.children + 0.72],
};
