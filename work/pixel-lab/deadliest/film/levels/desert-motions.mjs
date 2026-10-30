// Audible motions of LV5 · desert (scorpion) for the 8-bit sound design. Every entry spans exactly the motion it
// accompanies, computed from the level's own timing table (desert-time.mjs, the same one desert.mjs animates with).
// Not listed (silent idle loops): breathing bob, blinks, tail sway, drifting sand grains, the footprint trail fading.
// Entry: { t0, t1, kind, level, note }.
import { T } from "./desert-time.mjs";

const M = [], add = (t0, t1, kind, level, note) => M.push({ t0, t1, kind, level, note });
const R0 = T.ruler, click = T.clackClose + T.clackOpen;
add(T.emerge[0], T.emerge[1], "patter", 0.5, "scorpion scuttles out from behind the boulder to the centre (tiny legs)");
add(T.emerge[1] - 0.12, T.emerge[1] + 0.18, "bounce", 0.25, "little settle hop as it stops");
add(R0.drop, R0.land, "fall", 0.4, "wooden 5 CM ruler drops from above");
add(R0.land, R0.land + 0.12, "thud", 0.55, "ruler sticks into the sand (sand puff)");
add(R0.land, R0.land + 0.45, "boing", 0.3, "ruler wobbles and settles");
add(R0.land, R0.land + 0.28, "bounce", 0.3, "scorpion startled hop");
add(T.label[0], T.label[1], "blip", 0.3, "5 CM label pops in above the ruler");
add(T.lookUp[0], T.lookUp[1], "tilt", 0.25, "scorpion looks up at the ruler");
add(T.lookBack[0], T.lookBack[1], "tilt", 0.18, "looks back at the camera");
add(R0.out[0], R0.out[1], "swish", 0.15, "ruler and label dissolve away");
add(T.raise[0], T.raise[1], "rise", 0.55, "tail rises high over its head into the sun");
add(T.arms[0], T.arms[1], "swish", 0.3, "pincers go up (boxer pose), mischievous grin");
add(T.glint[0], T.glint[1], "sparkle", 0.5, "the stinger glints");
T.clacks.forEach((c0, i) => add(c0, c0 + click, "snap", 0.55, `pincer clack ${i + 1}/3`));
add(T.relax[0], T.relax[1], "swish", 0.2, "pose relaxes: tail lowers to a mid curl, pincers down");
add(T.sheepish[0], T.sheepish[1], "uhoh", 0.35, "sheepish face, tail droops, a sweat drop");
add(T.tag[0], T.tag[1], "blip", 0.3, "MOSTLY CHILDREN tag fades in");
export const MOTIONS = M.sort((a, b) => a.t0 - b.t0);
