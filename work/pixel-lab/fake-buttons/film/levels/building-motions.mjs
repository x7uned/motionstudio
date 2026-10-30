// Audible motions of the BUILDING level («Fake buttons») for the 8-bit sound design. Each entry spans exactly the
// motion it accompanies and is computed from the same constants as the picture (building-kit.mjs T, the cast's own
// walk/jab functions). Not listed (no sound of their own): the colleague's shiver, the timer arc's slow fill, the
// counterweight/ropes (they move with the ride, which has one engine hum), the BRR wobble, the X-ray closing as the
// camera leaves. Entry: { t0, t1, kind, level, note }.
import { EV } from "../timeline.mjs";
import { T, DIAL_STEP, RING_LEN } from "./building-kit.mjs";
import { JAB, worker, oldMan } from "./building-cast.mjs";

const M = [], add = (t0, t1, kind, note) => { if (t1 > t0) M.push({ t0: +t0.toFixed(4), t1: +t1.toFixed(4), kind, level: "building", note }); };
/** Times in [a, b] where f(t) crosses a multiple of `period` + `phase` going up (sampled at 1/600 s). */
function crossings(f, a, b, period, phase = 0) { const out = []; let prev = f(a); for (let t = a + 1 / 600; t <= b; t += 1 / 600) { const v = f(t), k0 = Math.floor((prev - phase) / period), k1 = Math.floor((v - phase) / period); if (k1 > k0) out.push(t); prev = v; } return out; }

// lobby — the worker jabs CLOSE again and again: one click per press (finger lands, the button lights, nothing happens)
for (const tj of T.jabs) add(tj, tj + JAB.hold, "click", "the worker jabs the elevator's CLOSE button; it lights, nothing happens");
// the X-ray lens over the car's panel
add(T.lens[0], T.lens[0] + 0.34, "zap", "X-ray lens opens over the car's button panel");
for (const tj of T.jabs) if (tj > T.lens[0] + 0.2 && tj < T.lens[1] - 0.4) add(tj + 0.28, tj + 0.46, "wrong", "inside the lens the CLOSE pulse dies at the timer chip (red flash)");
add(T.lens[1] - 0.34, T.lens[1], "dissolve", "X-ray lens closes");
// the door timer arc
add(T.arc[0], T.arc[0] + 0.3, "pop", "door-timer arc appears above the doors (WAIT)");
add(T.arc[1] - 0.05, T.arc[1] + 0.12, "chime", "the timer completes (green check)");
// the older man: cane taps while he is on screen, the step over the sill on "slowly"
{ const O = (t) => oldMan(t).side.ph; for (const tc of crossings(O, EV.law - 0.2, T.oldWalk[1], 1)) add(tc, tc + 0.06, "tap", "the older man's cane taps the marble (\"people who move slowly\")"); }
add(EV.slowly - 0.08, EV.slowly + 0.06, "step", "he steps over the sill into the car");
add(T.doorsClose[0], T.doorsClose[1], "door", "the elevator doors close smoothly");
// the firefighter
add(T.ffIn[0], T.ffIn[1], "dissolve", "a firefighter dissolves in at the call panel");
add(T.ffReach[0], T.ffReach[1], "swish", "he lifts the key to the FIRE keyswitch");
add(T.ffTurn[0], T.ffTurn[1], "click", "the key turns (on \"key\")");
add(T.ffRed[0], T.ffRed[1], "alert", "the panel's CLOSE icon lights red");
add(T.ffOut[0], T.ffOut[1], "dissolve", "the firefighter dissolves away");
// the ride
add(T.ride[0], T.ride[1], "engine", "the car rises floor 1 → 2 with the camera (hum, not a car)");
add(T.ride[1] - 0.02, T.ride[1] + 0.2, "chime", "arrival ding at floor 2");
add(T.doorsOpen[0], T.doorsOpen[1], "door", "doors open on the office");
// the worker walks to the thermostat: one step per footfall
{ const X = (t) => -worker(t).side.x; const s = 17 * 2; for (const tf of crossings(X, T.wWalk[0], T.wWalk[1] + 0.05, s, -520 + 17)) add(tf, tf + 0.05, "step", "the worker's quick steps to the thermostat"); }
add(T.doorsClose2[0], T.doorsClose2[1], "door", "the car doors close again behind him (quiet)");
// the dial: one tick per notch 22 → 21 → 20 → 19
T.dial.forEach((td, i) => add(td, td + DIAL_STEP, "tick", `dial notch ${22 - i}° → ${21 - i}°`));
// the X-ray strip in the wall
add(T.xray[0], T.xray[1], "zap", "X-ray strip opens the wall above the thermostat (on \"fake\")");
add(T.notConnected[0], T.notConnected[1], "wrong", "red NOT CONNECTED: the wire ends in a capped stub");
add(T.xray[1], T.xray[1] + 0.25, "screen", "the building computer's AUTO 22° screen pulses (it really runs the air)");
// the cold colleague and the phone
add(T.brrIn[0], T.brrIn[1], "pop", "the cold colleague's BRR bubble pops up");
for (const tr of T.ring) { const t1 = Math.min(tr + RING_LEN, T.ringStop[0]); add(tr, t1, "alert", "the desk phone rings (complaints)"); }
add(T.smile[0], T.smile[1], "glow", "both feel better: the worker smiles");
for (const th of T.hearts) add(th, th + 0.3, "heart", "a little heart floats up");
add(T.brrHeart[0], T.brrHeart[1], "heart", "BRR turns into a heart");

M.sort((a, b) => a.t0 - b.t0);
export const MOTIONS = M;
