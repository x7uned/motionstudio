// Audible motions of the heart film's savanna (LV4 elephant, LV5 human on safari) for the 8-bit sound design: every
// entry spans exactly the motion it accompanies, computed from the level's own timing table (savanna.mjs TIMING) and
// the timeline's events — no hard-coded seconds. Heartbeats (icon pulses, rings, the chest glow) are NOT listed: their
// sound comes from BEATS. Static props have no motion: the binoculars hang still on the strap, the safari jeep is parked.
// Entry: { t0, t1, kind, level, note }.
import { EV } from "../timeline.mjs";
import { TIMING as S } from "./savanna.mjs";

const M = [], add = (t0, t1, kind, level, note) => M.push({ t0, t1, kind, level, note });
const rise = (life) => life / 1.6;                     // cute.mjs pickup(): the text rises during the first 1/1.6 of its life

// LV4 · elephant
add(S.E_IN, S.E_IN + S.HEART_FADE, "pop", "elephant", "elephant's heart icon dissolves in (beside its head)");
add(EV.thirty, EV.thirty + rise(S.PICKUP_LIFE), "pickup", "elephant", `30 BPM rises from under the elephant's heart (visible ${S.PICKUP_LIFE} s, fades from ${(0.75 * S.PICKUP_LIFE).toFixed(3)} s)`);
add(S.LABEL_T.e, S.LABEL_T.e + S.LABEL_FADE, "tag", "elephant", "small 30 BPM label settles under the elephant's heart");
// LV5 · human
add(S.H_IN, S.H_IN + S.HEART_FADE, "pop", "human", "hero's heart icon dissolves in (beside his head)");
add(S.T_HAND, S.T_HAND + S.HAND_IN, "rustle", "human", "hero lifts his right mitten onto his chest (puffer-coat swish)");
add(EV.seventy, EV.seventy + rise(S.PICKUP_LIFE), "pickup", "human", `70 BPM rises from under the hero's heart (visible ${S.PICKUP_LIFE} s)`);
add(S.LABEL_T.h, S.LABEL_T.h + S.LABEL_FADE, "tag", "human", "small 70 BPM label settles under the hero's heart");

export const MOTIONS = M.sort((a, b) => a.t0 - b.t0);
