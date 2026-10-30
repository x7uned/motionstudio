// Audible motions of LV3 · stadium (stadium.mjs): { t0, t1, kind, level, note } from the same timing (ST, runState).
import { ST, runState } from "./stadium.mjs";

const list = [], r3 = (v) => Math.round(v * 1000) / 1000;
const add = (t0, t1, kind, level, note) => list.push({ t0: r3(t0), t1: r3(t1), kind, level, note });

add(ST.set0, ST.set1, "rise", 0.3, "the runner raises his hips from 'on your marks' to 'set'");
add(ST.bang, ST.bang + 0.08, "slap", 0.9, "starter's pistol: BANG!");
add(ST.bang, ST.bang + 0.5, "whoosh", 0.7, "he explodes out of the blocks in a burst of dust");
{ let prev = runState(ST.bang), n = 0;
  for (let t = ST.bang + 1 / 120; t < ST.dec1 + 0.3; t += 1 / 120) { const s = runState(t); if (Math.floor(2 * s.p) > Math.floor(2 * prev.p) && s.v > 30) add(t, t + 0.06, "step", 0.5, `sprinter footstep ${++n}`); prev = s; } }
add(ST.bang + 0.3, ST.dec1, "wind", 0.45, "air rushing past while the stadium streams by");
add(ST.bang, ST.finish, "count", 0.35, "speed board counts up to 44 KM/H");
add(ST.finish, ST.finish + 0.3, "chime", 0.6, "finish line crossed, board flashes TOP SPEED 44");
add(ST.finish + 0.05, ST.finish + 1.9, "sparkle", 0.4, "crowd cheers: camera flashes and confetti");
add(ST.dec0, ST.dec1, "slide", 0.35, "he slows down to a stop");
add(ST.dec1, ST.dec1 + 0.35, "bounce", 0.3, "happy little hop with fists up");

list.sort((a, b) => a.t0 - b.t0);
export const MOTIONS = list;
