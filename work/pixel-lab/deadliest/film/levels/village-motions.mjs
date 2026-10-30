// Audible motions of LV6 · village (dog) for the 8-bit sound design. Every entry spans exactly the motion it
// accompanies, computed from the level's own timing table (village-time.mjs, the same one village.mjs animates with).
// Not listed (silent idle loops): breathing, blinks, panting, ear sway, the slow tail wag, lantern flicker, the moth,
// chimney smoke, twinkling string lights, fireflies; dissolves of the ✕ and the tag.
// Entry: { t0, t1, kind, level, note }.
import { T } from "./village-time.mjs";

const M = [], add = (t0, t1, kind, level, note) => M.push({ t0, t1, kind, level, note });
const S = T.syringe;
add(T.tilt[0], T.tilt[1], "tilt", 0.35, "dog tilts its head, ear perks");
add(T.wag[0], T.wag[3], "swish", 0.3, "tail wags faster");
add(T.tilt[2], T.tilt[3], "tilt", 0.18, "head tilts back");
add(T.grin[0], T.grin[1], "boing", 0.3, "cheeky grin shows its little teeth");
add(T.cross.pop[0], T.cross.pop[1], "pop", 0.5, "red pixel ✕ pops over the teeth");
add(T.germ[0], T.germ[1], "squish", 0.45, "mean green rabies germ appears by its mouth");
add(T.tag[0], T.tag[1], "blip", 0.3, "RABIES tag fades in");
add(T.worry[0], T.worry[1], "uhoh", 0.4, "dog looks worried at the germ, ears droop");
add(T.pulse[0], T.pulse[1], "bounce", 0.3, "germ throbs on 'virus'");
add(T.hop[0], T.hop[1], "bounce", 0.35, "germ hops on 'bite'");
add(S.in[0], S.in[1], "whoosh", 0.5, "syringe zips in from the left");
add(S.poke[0], S.poke[1], "sting", 0.5, "syringe pushes the vaccine: zap");
add(T.pop[0], T.pop[1], "pop", 0.6, "germ pops");
add(T.sparkles[0], T.sparkles[1], "sparkle", 0.45, "germ bursts into sparkles");
add(S.out[0], S.out[1], "whoosh", 0.3, "syringe zips away");
add(T.happy[0], T.happy[1], "chime", 0.4, "dog brightens: happy closed eyes, big smile");
add(T.wag2[0], T.wag2[3], "swish", 0.3, "happy fast tail wag");
add(T.heart[0], T.heart[1], "rise", 0.3, "a heart floats up");
add(T.pickup[0], T.pickup[0] + (T.pickup[1] - T.pickup[0]) / 1.6, "twinkle", 0.4, "+VACCINE rises (pickup)");
export const MOTIONS = M.sort((a, b) => a.t0 - b.t0);
