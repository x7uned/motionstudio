// LV6 · savanna timing (shared by the picture in savanna.mjs and the sound list in savanna-motions.mjs).
// "A cheetah hits ninety-three, but only in short bursts. Then it has to rest." Everything comes from measured words (EV).
import { EV, LV } from "../timeline.mjs";
import { treadmill, integral, sm } from "./racecourse-kit.mjs";

export const CHEETAH_X = 2952;                      // world x of the ground point under the crouching cheetah
export const WIGGLE = [EV.hits - 0.02, EV.ninetyThree - 0.1];   // butt wiggle before the launch ("hits")
export const S0 = EV.ninetyThree - 0.1;              // launch
export const S_RAMP = 0.2;                           // crouch → full sprint
export const SK0 = EV.bursts + 0.42;                 // stamina empty → the skid starts
export const SK1 = SK0 + 0.3;                        // skid ends (it slid SKID_DX px forward)
export const SKID_DX = 60;
export const WOB = [SK1, EV.then + 0.32];            // dizzy wobble, panting on its feet
export const FLOP = [EV.then + 0.32, EV.rest + 0.02]; // legs give way, it rolls onto its side; thud on "rest"
export const PANT0 = EV.rest + 0.02;                 // lying, panting
export const REST_TAG = EV.rest + 0.12;              // "+REST" rises
export const REST_LIFE = 1.4;
export const wSprint = (t) => sm(t, S0, S0 + S_RAMP) * (1 - sm(t, SK0, SK0 + 0.16));
export const wSkid = (t) => sm(t, SK0, SK0 + 0.08) * (1 - sm(t, SK1 + 0.04, SK1 + 0.24));
export const wCrouch = (t) => 1 - sm(t, S0, S0 + 0.12);
// stride frequency 3 Hz while sprinting; the phase is its integral
const F = 3.0;
export const phase = integral((t) => wSprint(t) * F, LV.cheetah[0] - 1, LV.cheetah[1] + 3);
// treadmill: the near ground and grass stream past (3 whole 540-px periods, so the savanna is back at rest afterwards)
export const SCROLL = treadmill((t) => sm(t, S0 + 0.02, S0 + 0.3) * (1 - sm(t, SK0 - 0.04, SK1 - 0.02)), S0, SK1 + 0.1, 1620);
// stamina: full at the launch, drains a little during "ninety-three", then fast during "short bursts", empty → skid
export const STAM = { in: S0 + 0.08, k1: EV.short - 0.1, empty: SK0 - 0.02, refill: PANT0 + 0.25, out: [EV.rest + 0.55, EV.rest + 0.9] };
export function stamina(t) {
  if (t < STAM.k1) return 1 - 0.28 * sm(t, STAM.in, STAM.k1);
  if (t < STAM.empty) return 0.72 * (1 - sm(t, STAM.k1, STAM.empty));
  return 0.42 * sm(t, STAM.refill, STAM.refill + 1.4);
}
// legs: rotary gallop offsets (hind pair touches down at phase 0, fore pair at 0.5); stance fraction D
export const LEGS = [
  { id: "hindFar", fore: false, near: false, off: 0.95 },
  { id: "hindNear", fore: false, near: true, off: 0.0 },
  { id: "foreFar", fore: true, near: false, off: 0.45 },
  { id: "foreNear", fore: true, near: true, off: 0.5 },
];
export const D = 0.3;
/** Paw-down events while sprinting {t, leg, fore, near}: dust, sounds. */
export const CONTACTS = (() => {
  const out = [];
  for (const L of LEGS) for (let n = 0; n < 40; n++) { const t = phase.when(n + ((1 - L.off) % 1) + 0.001); if (t == null) continue; if (wSprint(t) > 0.5) out.push({ t, leg: L.id, fore: L.fore, near: L.near }); }
  return out.sort((a, b) => a.t - b.t);
})();
export const PANT_HZ = 3.2;                          // panting breaths per second while lying
export const LEAVE = [LV.cheetah[1] + 0.3, LV.cheetah[1] + 0.8];
