// LV5 · racecourse timing (shared by the picture in racecourse.mjs and the sound list in racecourse-motions.mjs).
// "A racehorse gallops at about seventy." Everything is anchored to measured words (EV) and the level range (LV).
import { EV, LV } from "../timeline.mjs";
import { treadmill, integral, sm } from "./racecourse-kit.mjs";

export const HORSE_X = 2430;                       // world x of the ground point under the horse's body
// gait weights: stand → gallop (on "gallops") → proud prance (on "seventy") → stand
export const G0 = EV.gallops - 0.08;               // launch
export const G_RAMP = 0.22;                         // stand → full gallop
export const G1 = EV.seventy + 0.02;                // gallop starts to ease into the prance
export const G_OUT = 0.36;
export const P1 = LV.horse[1] + 0.55;               // prance settles back into a proud stand (camera is gone by then)
export const P_OUT = 0.45;
export const wGallop = (t) => sm(t, G0, G0 + G_RAMP) * (1 - sm(t, G1, G1 + G_OUT));
export const wPrance = (t) => sm(t, G1 + 0.08, G1 + G_OUT + 0.06) * (1 - sm(t, P1, P1 + P_OUT));
// stride frequency (Hz): gallop 2.5, prance 1.8; the gait phase is its integral (pure function of t)
const F_GALLOP = 2.8, F_PRANCE = 1.8, PH0 = LV.horse[0] - 1.5, PH1 = LV.horse[1] + 3;
export const phase = integral((t) => wGallop(t) * F_GALLOP + wPrance(t) * F_PRANCE, PH0, PH1);
// the treadmill: the rail fence, turf and grass stream past behind the horse while it gallops on the spot; the ground
// scroll ends on whole texture periods (540 px at parallax 1), so every streamed layer is back at rest afterwards
export const SCROLL = treadmill((t) => sm(t, G0 + 0.04, G0 + 0.3) * (1 - sm(t, G1 - 0.05, G1 + 0.3)), G0, G1 + 0.4, 540);
// intro on "racehorse": an eager head toss + one front-hoof paw scrape, ears prick
export const INTRO = { toss: EV.racehorse1 + 0.02, tossDur: 0.42, paw: EV.racehorse1 + 0.18, pawDur: 0.36 };
// legs: phase offsets inside one stride (transverse gallop: hind pair, then fore pair; prance: diagonal pairs)
export const LEGS = [
  { id: "hindFar", fore: false, near: false, gal: 0.0, pra: 0.5 },
  { id: "hindNear", fore: false, near: true, gal: 0.1, pra: 0.0 },
  { id: "foreFar", fore: true, near: false, gal: 0.38, pra: 0.0 },
  { id: "foreNear", fore: true, near: true, gal: 0.48, pra: 0.5 },
];
/** Hoof-down events {t, leg, gait: "gallop" | "prance", w} from the gait phase: dust puffs and hoof sounds share them. */
export const CONTACTS = (() => {
  const out = [];
  for (const L of LEGS) for (let n = 0; n < 40; n++) {
    for (const [gait, off, wf] of [["gallop", L.gal, wGallop], ["prance", L.pra, wPrance]]) {
      const t = phase.when(n + (1 - off) % 1 + 0.001); if (t == null) continue; const w = wf(t);
      if (w > 0.45) out.push({ t, leg: L.id, near: L.near, fore: L.fore, gait, w });
    }
  }
  return out.sort((a, b) => a.t - b.t);
})();
export const PUFF_LIFE = 0.5;
// proud sparkles around the head while it prances on "seventy"
export const SPARKLES = [0, 1, 2, 3].map((i) => ({ t: G1 + 0.22 + i * 0.2, life: 0.5, dx: [-70, 62, -54, 74][i], dy: [-62, -36, -96, -86][i] }));
export const LEAVE = [LV.horse[1] + 0.2, LV.horse[1] + 0.6];   // hud bits dissolve as the camera leaves
