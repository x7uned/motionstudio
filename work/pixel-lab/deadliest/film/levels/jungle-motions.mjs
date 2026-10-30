// LV7 · jungle (snake): audible motions for the 8-bit sound design — one entry per motion { t0, t1, kind, level, note },
// computed from the same choreography table the picture uses (levels/jungle-time.mjs JT), so every sound lasts exactly
// as long as its motion. Idle life (breathing, the S-sway, the tail-tip wiggle, vines, fireflies, falling leaves,
// periodic blinks) is deliberately silent.
import { JT } from "./jungle-time.mjs";

const r3 = (v) => Math.round(v * 1000) / 1000;
const list = [];
const add = (t0, t1, kind, level, note) => list.push({ t0: r3(t0), t1: r3(t1), kind, level, note });

add(JT.rise[0], JT.rise[1], "rise", 0.55, "the cobra wakes and rises out of its coil to face the camera (little overshoot)");
add(JT.hood[0], JT.hood[1], "swish", 0.55, "the hood spreads wide like a little umbrella (\"hundred\")");
add(JT.hiss[0], JT.hiss[1], "hiss", 0.75, "cute angry hiss: mouth open, tiny fangs (\"thousand\")");
JT.flicks.forEach(([a, b], i) => add(a, b, "flutter", 0.25, `forked tongue flick ${i + 1} of 2 (inside the hiss)`));
add(JT.pickup.t0, JT.pickup.t0 + JT.pickup.dur / 1.6, "sparkle", 0.45, "+VENOM pickup rises beside the hood");
add(JT.happyBlink[0], JT.happyBlink[1], "twinkle", 0.25, "settles: the hood relaxes a little, a slow happy blink (\"year\")");

list.sort((a, b) => a.t0 - b.t0);
export const MOTIONS = list;
