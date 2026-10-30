// LV7 · bat cave: sounds for every audible motion, from the same timing table as the picture (cave-time.mjs).
import { BAT, LV } from "./cave-time.mjs";

export const MOTIONS = [
  { t0: BAT.out[0], t1: BAT.out[1], kind: "flutter", level: 0.55, note: "tiny bat flutters out of the cave" },
  { t0: BAT.squeak, t1: BAT.squeak + 0.34, kind: "squeak", level: 0.6, note: "tiny bat squeak, faces the camera" },
  { t0: BAT.stream[0], t1: BAT.stream[1], kind: "flutter", level: 0.45, note: "swarm of tiny bats pours out of the cave" },
  { t0: BAT.stream[1], t1: LV.bat[1] + 0.9, kind: "flutter", level: 0.12, note: "tiny bat swarm keeps streaming (soft)" },
  { t0: BAT.tail[0], t1: BAT.tail[1], kind: "wiggle", level: 0.35, note: "free tail wiggles" },
  { t0: BAT.tag[0], t1: BAT.tag[0] + 0.12, kind: "pop", level: 0.6, note: "radio tag pops on" },
  { t0: BAT.link[0], t1: BAT.link[1], kind: "blip", level: 0.4, note: "tracking signal beep" },
  { t0: BAT.plane[0], t1: BAT.plane[1], kind: "plane", level: 0.35, note: "small tracking plane crosses the sky and climbs away" },
  { t0: BAT.windup[0], t1: BAT.windup[1], kind: "rise", level: 0.35, note: "bat winds up" },
  { t0: BAT.dashOut[0], t1: BAT.dashOut[1], kind: "dash", level: 0.8, note: "tiny bat zooms off at 160" },
  { t0: BAT.dashBack[0], t1: BAT.dashBack[1], kind: "dash", level: 0.75, note: "tiny bat zooms back from the other side" },
  { t0: BAT.settle[0], t1: BAT.settle[1], kind: "squeak", level: 0.45, note: "tiny bat squeak, settles" },
];
