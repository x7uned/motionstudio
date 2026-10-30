// LV9 porch: the timing table of its visible events (porch.mjs draws from it) and the sound cues for the lead.
import { EV } from "../timeline.mjs";
export const T = {
  go: [EV.whine - 0.27, EV.ear - 0.03],                                // the mosquito drifts from the sun to the hero's ear
  wince: [EV.ear - 0.33, EV.ear + 0.87],                               // brows + squint + "tsk" mouth (fade in 0.3, out 0.55)
  swat: [EV.ear + 0.07, EV.ear + 0.37, EV.ear + 0.74, EV.ear + 1.22], // mitten up · lazy wave · back down
  dodge: [EV.ear + 0.3, EV.ear + 1.22],                                // she zips back up to the sun
  thermo: [EV.warm, EV.higher1],                                       // the red column rises
};
export const MOTIONS = [
  { t0: T.swat[1], t1: T.swat[2], kind: "whoosh", note: "LV9: the hero's lazy swat at his ear (one slow wave of the mitten)" },
  { t0: T.thermo[0], t1: T.thermo[1], kind: "rise", note: "LV9: the thermometer's red column climbs on 'on a warm night it gets even higher'" },
];
