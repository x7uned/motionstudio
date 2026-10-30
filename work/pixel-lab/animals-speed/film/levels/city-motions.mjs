// LV8 · city rooftop: sounds for every audible motion, from the same timing table as the picture (city-time.mjs).
import { FAL, PIG, TRAIN, HIT, GUN, POSES, XF, EV, END } from "./city-time.mjs";

const pose = (row, after = -1e9) => POSES.find((p) => p[1] === row && p[0] >= after)[0];
// landing wingbeats (the picture beats at 3.2 Hz while dropping in): one flap sound per downstroke
const beats = []; for (let t = FAL.land[0] + 0.08; t < FAL.land[1] - 0.12; t += 1 / 3.2) beats.push({ t0: t, t1: t + 0.12, kind: "flap", level: 0.55, note: "falcon wingbeat, dropping in" });
const backBeats = []; for (let t = FAL.back[0] + 0.05; t < FAL.back[1] - 0.1; t += 0.25) backBeats.push({ t0: t, t1: t + 0.1, kind: "flap", level: 0.25, note: "falcon wingbeat far away" });

export const MOTIONS = [
  // the hero's gestures during the guesses
  { t0: pose(3), t1: pose(3) + XF, kind: "swish", level: 0.3, note: "hero explains (gesture)" },
  { t0: EV.nope - 0.1, t1: EV.nope - 0.1 + XF, kind: "boing", level: 0.35, note: "hero shrugs: nope" },
  // the falcon drops in, the pigeons flee
  ...beats,
  { t0: PIG.flee[0], t1: PIG.flee[0] + 0.5, kind: "flutter", level: 0.4, note: "two pigeons flap away" },
  { t0: FAL.land[1] - 0.04, t1: FAL.land[1] + 0.1, kind: "land", level: 0.6, note: "falcon lands on the parapet" },
  { t0: FAL.fold[0], t1: FAL.fold[1], kind: "swish", level: 0.35, note: "falcon folds its wings" },
  { t0: FAL.sign[0], t1: FAL.sign[1], kind: "click", level: 0.4, note: "neon LV 8 sign flickers on" },
  { t0: FAL.proud[0] + 0.1, t1: FAL.proud[0] + 0.6, kind: "sparkle", level: 0.45, note: "falcon puffs its chest, proud" },
  // dive
  { t0: GUN.show[0], t1: GUN.show[1], kind: "swish", level: 0.3, note: "hero pulls out the radar gun" },
  { t0: FAL.crouch[0], t1: FAL.crouch[1], kind: "creak", level: 0.25, note: "falcon crouches" },
  { t0: FAL.launch[0], t1: FAL.launch[1], kind: "rise", level: 0.6, note: "falcon shoots straight up" },
  { t0: FAL.stoop[0], t1: FAL.stoop[1], kind: "dive", level: 0.85, note: "falcon stoop: long falling whistle" },
  { t0: FAL.ring, t1: FAL.ring + 0.4, kind: "whoosh", level: 0.6, note: "sonic ring bursts mid-dive" },
  { t0: PIG.dodge, t1: PIG.dodge + 0.4, kind: "flutter", level: 0.45, note: "pigeon dodges and escapes" },
  // radar gun
  { t0: GUN.count[0], t1: GUN.count[1], kind: "count", level: 0.5, note: "radar gun counts up" },
  { t0: GUN.flash, t1: GUN.flash + 0.14, kind: "alert", level: 0.55, note: "radar gun beeps 300+" },
  { t0: pose(7), t1: pose(7) + XF, kind: "uhoh", level: 0.35, note: "hero surprised" },
  // train race
  { t0: TRAIN.run[0], t1: TRAIN.run[1], kind: "train", level: 0.8, note: "bullet train passes on the viaduct" },
  { t0: FAL.race[0], t1: FAL.race[1], kind: "whoosh", level: 0.55, note: "falcon zips beside the train" },
  // back to the mast
  ...backBeats,
  { t0: FAL.perch[0] + 0.25, t1: FAL.perch[0] + 0.35, kind: "land", level: 0.2, note: "falcon lands on the radio mast (far)" },
  { t0: FAL.leave[0], t1: FAL.leave[1], kind: "flap", level: 0.3, note: "falcon hops off the mast" },
  // the gust
  { t0: FAL.pass[0], t1: FAL.pass[1], kind: "dash", level: 0.9, note: "falcon zooms right past the hero" },
  { t0: HIT.t, t1: HIT.t + 0.6, kind: "wind", level: 0.7, note: "wind blast from the pass" },
  { t0: HIT.spin[0], t1: HIT.spin[1], kind: "swish", level: 0.5, note: "hero spins" },
  { t0: HIT.fall[0], t1: HIT.fall[1], kind: "fall", level: 0.5, note: "hero tips over" },
  { t0: HIT.fall[1], t1: HIT.fall[1] + 0.12, kind: "thud", level: 0.7, note: "hero lands on the roof (comic)" },
  { t0: HIT.bounce[0], t1: HIT.bounce[1], kind: "bounce", level: 0.4, note: "little bounce" },
  { t0: HIT.gunFly[0], t1: HIT.gunFly[1], kind: "swish", level: 0.35, note: "radar gun flies off" },
  { t0: HIT.gunFly[1], t1: HIT.gunFly[1] + 0.05, kind: "clack", level: 0.5, note: "radar gun lands" },
  { t0: HIT.gunFly[1] + 0.25, t1: HIT.gunFly[1] + 0.3, kind: "blip", level: 0.3, note: "gun still beeping 300+" },
  { t0: HIT.feathers[0] + 0.2, t1: END - 0.05, kind: "feather", level: 0.2, note: "feathers float down" },
];
