// «Pumpkin face» — every sounding motion, taken from the same beat windows as the picture (timeline.mjs B).
// Each 8-bit sound lasts exactly its motion: t0 → t1. Background motion (stars, fog, bats in the top band, the slow camera
// drift) has no sound on purpose; nothing in the platform UI zones gets an accent.
import { B, EV } from "./timeline.mjs";

export const MOTIONS = [
  { ...w(B.drop), kind: "fall", note: "the pumpkin drops onto the hay (already falling in frame 0)" },
  { ...w(B.squash), kind: "thud", note: "landing squash and settle, dust puff" },
  { ...w(B.hole1), kind: "pop", note: "first hole punches out on «Two»" },
  { ...w(B.hole2), kind: "pop", note: "second hole on «holes»" },
  { ...w(B.line), kind: "carve", note: "the slit is cut left → right across «line,»" },
  { ...w(B.pull), kind: "whoosh", note: "camera pulls back to the child" },
  { ...w(B.xray), kind: "scan", note: "scan line sweeps down the head on «brain»" },
  { ...w(B.sight), kind: "sparkle", note: "light runs from the pumpkin's face into the eye on «sees»" },
  { t0: B.lock[0], t1: B.lock[1], kind: "rise", note: "face brackets close in" },
  { t0: B.lock[1], t1: B.lock[1] + 0.3, kind: "lock", note: "brackets lock + FACE tag on «face.» (flash 0.3 s)" },
  { ...w(B.blink), kind: "blink", note: "the pumpkin blinks" },
  { ...w(B.cardIn), kind: "swish", note: "tombstone stopwatch rises in" },
  { ...w(B.sweep), kind: "tick", note: "hand sweeps one sixth, 0 → 165 ms; signal runs eye → back → face area" },
  { ...w(B.arrive), kind: "ding", note: "hand lands on 1/6, signal reaches the face area" },
  { ...w(B.mark), kind: "blip", note: "face area outlined, FACE AREA plate" },
  { ...w(B.light), kind: "glow", note: "the face area lights up on «lights up»" },
  { ...w(B.link), kind: "zap", note: "dotted link runs to this pumpkin on «for this»" },
  { ...w(B.flare), kind: "swell", note: "the pumpkin's light surges on «pumpkin.»" },
  { ...w(B.cardOut), kind: "fold", note: "stopwatch folds away" },
  { ...w(B.wink), kind: "wink", note: "the pumpkin winks at the child" },
  { ...w(B.smile), kind: "creak", note: "its slit bends into a smile" },
];
function w(win) { return { t0: win[0], t1: win[1] }; }
export const VOICE_END = EV.pumpkinEnd;
