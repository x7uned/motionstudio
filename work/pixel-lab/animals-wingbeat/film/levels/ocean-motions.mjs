// LV1 sound events for the lead's mix (computed from the same constants as the picture in ocean.mjs).
// The albatross's wing clicks are the lead's (from the shared phase); this only adds the sea wind under the long glide:
// it rises as the bird settles from its glide-in and fades as the first big downstroke begins ("When it flaps").
import { EV } from "../timeline.mjs";
import { TIMING } from "./ocean.mjs";

export const MOTIONS = [
  { t0: TIMING.ARRIVE[0] + 0.9, t1: TIMING.FLAP + 0.25, kind: "wind", note: "LV1: soft sea wind under the albatross's glide (held-out wings, slow banking) — fade in on arrival, fade out as it starts to flap" },
];
export const EVENTS = { glides: EV.glides, flaps: EV.flaps1 };
