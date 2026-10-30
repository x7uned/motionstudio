// Sound motions of the actors (character, console prop, traffic, pedestrians), computed from the same constants and
// visibility functions as the picture: every 8-bit sound lasts exactly as long as its motion.
import { drawnAt, CAM } from "../timeline.mjs";
import * as T from "./actors-time.mjs";
import { _debug as A } from "./actors.mjs";
import { CAR_DIM } from "./actors-sprites.mjs";

const L = "actors", M = [], add = (t0, t1, kind, note) => M.push({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), kind, level: L, note });
const { EV, END } = T;

// ---- the character
add(EV.november - 0.12, EV.november - 0.12 + T.XF, "blip", "hero winks on November");
add(T.MIRROR[0].sq[0], T.MIRROR[0].sq[1], "swish", "hero turns around to the left with the game camera");
add(T.MIRROR[1].sq[0], T.MIRROR[1].sq[1], "swish", "hero turns back to the right");
add(T.MIRROR[2].sq[0], T.MIRROR[2].sq[1], "whoosh", "hero turns around really fast (6 frames)");
add(T.HOP[0], T.HOP[1], "boing", "startled little hop as the city pops in late");
add(EV.follow - 0.12, EV.follow - 0.12 + 7 * T.WAVE, "swish", "hero waves on follow");

// ---- the console prop
const C = T.CONSOLE;
add(C.pop[0], C.pop[0] + 0.2, "fall", "console drops onto the sidewalk");
add(C.pop[0] + 0.2, C.pop[1], "pop", "console lands with a squash");
add(C.strain[0], C.strain[1], "engine", "console fan spins hard (whine), it shakes and sweats — not a car");
add(C.bubble[0], C.bubble[0] + 0.24, "uhoh", "LAG? speech bubble pops up");
add(C.out[0], C.out[1], "dissolve", "console dissolves away with a small poof");

// ---- traffic: a passing car is heard while it is on screen AND drawn (inside the view)
const rest = (t) => { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1], k = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t || 1))), e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2; return a.cx + (b.cx - a.cx) * e; };
for (const car of A.CARS) {
  let on = null;
  for (let f = 0; f <= Math.round(END * 30); f++) {
    const t = f / 30, x = car.x(t), cx = rest(t), vis = Math.abs(x - cx) < 270 - 10 && drawnAt(x, t) > 0.5 && A.presence(car.x, car.hw, t) > 0.5;
    if (vis && on === null) on = t; if (!vis && on !== null) { if (t - on > 0.3) add(on, t, "engine", `${car.kind} ${car.col} drives ${car.dir > 0 ? "right" : "left"} (${car.lane} lane), drawn`); on = null; }
  }
  if (on !== null && END - on > 0.3) add(on, END, "engine", `${car.kind} ${car.col} drives ${car.dir > 0 ? "right" : "left"} (${car.lane} lane), drawn`);
}
// cars leaving the view: the dissolve into the blueprint and the vanish (presence 1 → 0) while on screen
for (const car of A.CARS) {
  let hi = false, t0 = null;
  for (let f = 0; f <= Math.round(END * 30); f++) {
    const t = f / 30, x = car.x(t), cx = rest(t), ex = A.presence(car.x, car.hw, t), onScr = Math.abs(x - cx) < 300;
    if (ex >= 0.98) { hi = true; t0 = null; continue; }
    if (hi && ex < 0.98 && t0 === null) t0 = t;
    if (hi && t0 !== null && ex <= 0.02) { if (onScr) add(t0, t, "dissolve", `${car.kind} ${car.col} leaves the view → blueprint → gone`); hi = false; t0 = null; }
  }
}

// ---- "They appear in front of you and vanish behind you"
for (const p of A.SPAWNS) {
  add(p.t, p.t + 0.5, "sparkle", `spawn: ${p.kind} pops into existence ahead of him`);
  let t0 = null; for (let f = Math.ceil(p.t * 30) + 6; f <= Math.round(END * 30); f++) { const t = f / 30, ex = A.ghostAfter(p.xf, p.hw, t); if (ex < 0.98 && t0 === null) t0 = t; if (t0 !== null && ex <= 0.02) { add(t0, t, "dissolve", `${p.kind} vanishes behind him`); break; } }
}
add(T.HONK.t[0], T.HONK.t[1], "horn", "the spawned taxi honks once");

// ---- "cars were deleted as soon as they were out of sight"
const D = T.DELETE;
add(D.stamp[0], D.stamp[1], "delete", "red DELETED stamp slams on the car that just left the view");
add(D.can[0], D.can[1], "pop", "little trash can pops up");
add(D.drop[0], D.drop[1], "fall", "the ghost car flips into the trash can");
add(D.lid[0], D.lid[1], "click", "trash can lid shuts");
add(D.fade[0], D.fade[1], "dissolve", "stamp and trash can fade out");

// ---- the T-pose glitch after the fast turn
add(T.TPOSE.pop[0], T.TPOSE.slide[1], "glitch", "pedestrian pops in late, stuck in a T-pose, sliding");
add(T.TPOSE.snap[0], T.TPOSE.snap[1], "pop", "T-pose snaps into the walk cycle");

M.sort((a, b) => a.t0 - b.t0);
export const MOTIONS = M;
