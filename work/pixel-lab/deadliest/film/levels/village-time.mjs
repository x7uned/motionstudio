// LV6 · village timing: every motion of the dog level, derived from the measured words (timeline EV) — shared by the
// picture (village.mjs) and the sound list (village-motions.mjs), so both always agree.
import { EV, LV, CAM, W } from "../timeline.mjs";

const keys = CAM.filter((k) => k.cx === 2970);
export const T = {
  arrive: keys[0].t, leave: keys[1].t, end: LV.dog[1],
  // "Dogs": a happy head tilt with an ear perk and a faster tail wag
  tilt: [EV.dogs, EV.dogs + 0.35, EV.dogs + 1.15, EV.dogs + 1.55], wag: [EV.dogs, EV.dogs + 0.2, EV.dogs + 1.4, EV.dogs + 2.0],
  // "Not with their teeth": a cheeky grin shows its little teeth; a pixel ✕ pops over them and dissolves
  grin: [EV.teeth - 0.16, EV.teeth + 0.06, EV.teeth + 0.5, EV.teeth + 0.76],
  cross: { pop: [EV.teeth + 0.06, EV.teeth + 0.26], out: [EV.teeth + 0.56, EV.teeth + 0.86] },
  // "but with rabies, a virus in the bite": a mean little germ fades in by its mouth with a RABIES tag; the dog worries
  germ: [EV.rabies, EV.rabies + 0.32], tag: [EV.rabies + 0.06, EV.rabies + 0.32], worry: [EV.rabies + 0.12, EV.rabies + 0.42],
  pulse: [EV.virus, EV.virus + 0.32], hop: [EV.bite, EV.bite + 0.26],
  // "A vaccine stops it": a syringe zips in and zaps the germ, which pops into sparkles; the dog brightens, a heart
  syringe: { in: [EV.vaccine - 0.12, EV.vaccine + 0.16], poke: [EV.vaccine + 0.2, EV.vaccine + 0.4], out: [EV.stops + 0.12, EV.stops + 0.5] },
  pop: [EV.stops, EV.stops + 0.18], sparkles: [EV.stops, EV.stops + 0.7],
  calm: [EV.stops + 0.02, EV.stops + 0.3], happy: [EV.stops + 0.06, EV.stops + 0.32, W("it", 3, "end") + 0.5, W("it", 3, "end") + 0.85],
  heart: [EV.stops + 0.12, EV.stops + 1.25], pickup: [EV.stops + 0.06, EV.stops + 0.06 + 1.5],
  wag2: [EV.stops + 0.06, EV.stops + 0.3, EV.stops + 1.4, EV.stops + 2.0],
  // natural blinks placed between the beats
  blinks: [EV.sixty + 0.35, EV.teeth - 0.55, EV.virus + 0.55, W("it", 3, "end") + 1.0],
};
