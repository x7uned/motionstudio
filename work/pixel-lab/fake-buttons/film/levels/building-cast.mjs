// Who is where, doing what, at time t («Fake buttons», builder BUILDING). Pure functions of t that return the pose for
// drawPerson() plus the layer the person belongs to ("in" = inside the car, behind its doors; "out" = in front).
// Every value is a continuous function of t (positions eased, view/pose changes crossfaded by the caller via `k`).
import { EV } from "../timeline.mjs";
import { T, DIAL_STEP, carY, CAR, CLOSE_BTN, KEYSW, THERMO_P, COLLEAGUE, sm, lerp, ease, clamp01, win } from "./building-kit.mjs";
import { CAST, reach, mixArm } from "./building-people.mjs";

const blink = (t, every = 3.4, ph = 0) => { const p = (((t + ph) % every) + every) % every, d = 0.18; return p < d ? Math.sin((Math.PI * p) / d) : 0; };
/** Expression track: keys [[t, {eyes, mouth, brow}], …] (sorted). Returns the face at t, crossfading over `dur` after each key. */
export function expr(t, keys, dur = 0.22) {
  let i = -1; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  if (i < 0) return { ...keys[0][1] };
  const cur = keys[i][1], prev = i > 0 ? keys[i - 1][1] : cur, k = clamp01((t - keys[i][0]) / dur);
  return k >= 1 ? { ...cur } : { ...prev, face2: { ...cur }, faceK: k };
}
const F = (eyes, mouth, brow = 0) => ({ eyes, mouth, brow });
/** Jab envelope: 0 → 1 (arm out, finger on the button) → 0, for one press at tj. */
export const JAB = { out: 0.09, hold: 0.07, back: 0.16 };
export function jabAt(t) { let v = 0; for (const tj of T.jabs) { const u = t - tj; if (u < -JAB.out || u > JAB.hold + JAB.back) continue; v = Math.max(v, u < 0 ? ease(1 + u / JAB.out) : u < JAB.hold ? 1 : 1 - ease((u - JAB.hold) / JAB.back)); } return v; }
/** How lit the CLOSE button is (it lights on every press, then fades: nothing else happens). */
export function closeLit(t) { let v = 0; for (const tj of T.jabs) { const u = t - tj; if (u >= -0.02 && u < 0.45) v = Math.max(v, u < 0.04 ? (u + 0.02) / 0.06 : 1 - sm(u, 0.12, 0.45)); } return v; }

// ---------------------------------------------------------------- the office worker
const W_LOBBY = 512, W_BACK = 532, W_OFFICE = THERMO_P.x + 50;
export const WORKER_X = { lobby: W_LOBBY, back: W_BACK, office: W_OFFICE };
const W_STRIDE = 17;   // stride amplitude while walking to the thermostat (brisk, determined little steps)
export function worker(t) {
  const c = CAST.worker, y0 = carY(t);
  const base = { dir: -1, y: y0, stride: W_STRIDE, blink: blink(t, 3.1, 0.4), look: [0.7, 0.1], blush: 0.5 };
  // ---- lobby: facing the panel (left), jabbing; then a polite step back when the older man comes in
  if (t < T.doorsOpen[0] + 0.12) {
    const turnK = sm(t, T.workerBack[0], T.workerBack[0] + 0.3);           // side (facing the panel) → front (facing out)
    const x = lerp(W_LOBBY, W_BACK, ease((t - T.workerBack[0]) / (T.workerBack[1] - T.workerBack[0])));
    const j = jabAt(t), p = { ...base, x };
    const ready = [0.9, 1.0], jab = reach(c, { ...p }, CLOSE_BTN.x + 2, CLOSE_BTN.y), rest = [0.1, 0.15];
    const engaged = 1 - sm(t, T.jabs[T.jabs.length - 1] + 0.3, T.jabs[T.jabs.length - 1] + 0.7);
    p.armF = mixArm(mixArm(rest, ready, engaged), jab, j);
    p.armB = [-0.12, 0.25];
    // face: annoyed while jabbing, impatient (foot tap) while waiting, polite smile for the older man
    Object.assign(p, expr(t, [[0, F("open", "frown", -1)], [EV.us, F("open", "flat", -1)], [T.workerBack[0], F("open", "smile", 0)], [T.doorsClose[1], F("open", "flat", 0)]]));
    const tap = t > EV.us + 0.3 && t < T.workerBack[0] ? Math.max(0, Math.sin((t - EV.us) * Math.PI * 4)) * sm(t, EV.us + 0.3, EV.us + 0.6) * (1 - sm(t, T.workerBack[0] - 0.3, T.workerBack[0])) : 0;
    p.tap = tap * 3;
    const front = { ...base, x, view: "front", armF: [-0.15, 0.1], armB: [-0.15, 0.1], blush: 0.8, look: [-0.5, 0.1],
      ...expr(t, [[0, F("open", "smile")], [T.workerBack[1] + 0.2, F("happy", "smile")], [T.workerBack[1] + 0.9, F("open", "smile")], [T.doorsClose[1], F("open", "flat")]]) };
    return { side: p, front, k: turnK, layer: "in", cfg: c };
  }
  // ---- office: turn left, walk out to the thermostat, reach up, turn the dial, then turn to us and smile
  const tw0 = T.wWalk[0], tw1 = T.wWalk[1], wk = clamp01((t - tw0) / (tw1 - tw0));
  const walkE = (u) => (u < 0.15 ? (u * u) / 0.3 : u > 0.85 ? 0.85 - ((1 - u) * (1 - u)) / 0.3 : u - 0.075) / 0.85;   // ease in/out, constant middle
  const x = lerp(W_BACK, W_OFFICE, walkE(wk)) + 10 * ease((t - T.wDown[0]) / (T.wDown[1] - T.wDown[0]));
  const dist = Math.abs(x - W_BACK), ph = dist / (4 * W_STRIDE), walking = Math.min(sm(t, tw0 - 0.05, tw0 + 0.15), 1 - sm(t, tw1 - 0.12, tw1 + 0.05));
  const p = { ...base, x, y: -300, ph, walk: walking, lean: 0.08 * walking };
  // arm: swing while walking → reach to the dial → turn it notch by notch (the hand follows the rim) → lower
  const swing = Math.sin(2 * Math.PI * ph) * 0.55 * walking;
  const dialA = dialAngle(t), grip = [THERMO_P.x + Math.cos(dialA - 0.25) * 15, THERMO_P.y + Math.sin(dialA - 0.25) * 15];
  const up = sm(t, T.wReach[0], T.wReach[1]) * (1 - sm(t, T.wDown[0], T.wDown[1])), tip = 4 * up;
  p.bob = -tip;
  const reachA = reach(c, { ...p, bob: -tip }, grip[0], grip[1]);
  p.armF = mixArm([0.15 + swing, 0.25], reachA, up); p.armB = [0.1 - swing, 0.3]; p.armBehind = up > 0.35;
  Object.assign(p, expr(t, [[0, F("open", "flat")], [T.wReach[0], F("open", "flat", -1)], [T.wDown[0], F("open", "smile", 0)]]));
  p.look = up > 0.3 ? [0.6, -0.8] : [0.7, 0.1];
  const toFront = sm(t, T.wDown[1] + 0.2, T.wDown[1] + 0.5);
  const happy = sm(t, T.smile[0], T.smile[1]);
  const front = { ...base, x, y: -300, view: "front", armF: [-0.2 - 0.25 * happy, 0.2], armB: [-0.2 - 0.25 * happy, 0.2], blush: 0.6 + 0.5 * happy, look: [-0.2, 0],
    ...expr(t, [[0, F("open", "smile")], [T.smile[0], F("open", "grin")], [EV.better - 0.05, F("happy", "grin")], [EV.better + 0.9, F("open", "grin")]]) };
  // turning left after the doors open: front (in the car) → side (walking)
  const turn1 = sm(t, T.wTurn[0], T.wTurn[1]);
  if (t < T.wDown[1] + 0.1) {
    const f0 = { ...base, x, y: -300, view: "front", armF: [-0.15, 0.1], armB: [-0.15, 0.1], mouth: "flat", look: [-0.5, 0.1], blush: 0.8 };
    return { side: p, front: f0, k: 1 - turn1, layer: x > 505 ? "in" : "out", cfg: c };
  }
  return { side: p, front, k: toFront, layer: "out", cfg: c };
}
/** Dial angle (radians, screen): 22° → 21 → 20 → 19, one notch per step. */
export const DIAL0 = -Math.PI / 2 - 0.15, NOTCH = -0.42;
export function dialAngle(t) { let a = DIAL0; for (const td of T.dial) a += NOTCH * ease((t - td) / DIAL_STEP); return a; }
export function dialValue(t) { let v = 22; for (const td of T.dial) v -= ease((t - td) / DIAL_STEP); return v; }   // continuous 22 → 19

// ---------------------------------------------------------------- the older man with a cane
const O_SPEED = 33, O_STRIDE = 8.5, O_DOOR = 470, O_IN = 470, O_X0 = 150;
export function oldMan(t) {
  const c = CAST.old, [w0, w1] = T.oldWalk;
  const tStart = w1 - (O_DOOR - O_X0) / O_SPEED;
  const x = t < tStart ? O_X0 : t < w1 ? O_DOOR - O_SPEED * (w1 - t) : O_DOOR;
  const ph = (x - O_X0) / (4 * O_STRIDE);
  const walking = Math.min(sm(t, tStart - 0.2, tStart + 0.1), 1 - sm(t, w1 - 0.25, w1));
  const k = sm(t, T.oldStep[0] + 0.05, T.oldStep[1]);                      // step in + turn to face out
  const xs = lerp(x, O_IN, k), ys = carY(t) + 0 - 6 * sm(t, T.oldStep[0], EV.slowly) * (t < T.ride[0] ? 1 : 1);
  // the cane: planted ahead, swung forward once per walk cycle
  const n = Math.floor(ph), f = ph - n, plant = (m) => O_X0 + 4 * O_STRIDE * m + 15;
  const caneX = f < 0.72 ? plant(n) : lerp(plant(n), plant(n + 1), ease((f - 0.72) / 0.28));
  const side = { x: xs, y: ys, dir: 1, ph, walk: walking, stride: O_STRIDE, lean: 0.16, bob: -1, armF: [0.55, -0.35], armB: [-0.1, 0.25], hold: "cane", caneX: walking > 0.01 ? lerp(xs + 14, caneX, walking) : xs + 14,
    mouth: "smile", blush: 0.7, blink: blink(t, 3.8, 1.1), look: [0.6, 0.2] };
  const front = { x: xs, y: ys, view: "front", armF: [0.45, -0.35], armB: [-0.12, 0.15], hold: "cane", caneX: xs + 14, mouth: "smile", blush: 0.9, blink: blink(t, 3.8, 1.1),
    look: [0, 0.1], ...expr(t, [[0, F("open", "smile")], [T.ride[1] + 0.3, F("happy", "smile")], [T.ride[1] + 1.1, F("open", "smile")]]) };
  return { side, front, k, layer: k >= 0.7 ? "in" : "out", cfg: c };
}

// ---------------------------------------------------------------- the firefighter
export const FF = { x: KEYSW.x - 54 };
export function firefighter(t) {
  const c = CAST.fire, a = Math.min(sm(t, T.ffIn[0], T.ffIn[1]), 1 - sm(t, T.ffOut[0], T.ffOut[1]));
  if (a <= 0) return null;
  const p = { x: FF.x, y: 0, dir: 1, blink: blink(t, 3.0, 0.2), mouth: "smile", blush: 0.4, look: [0.8, 0.1], hold: "key" };
  const r = sm(t, T.ffReach[0], T.ffReach[1]), key = reach(c, p, KEYSW.x - 7, KEYSW.y);
  p.armF = mixArm([0.95, 1.05], key, r); p.armB = [-0.08, 0.2];
  p.keyTurn = ease((t - T.ffTurn[0]) / (T.ffTurn[1] - T.ffTurn[0]));
  Object.assign(p, expr(t, [[0, F("open", "smile")], [T.ffReach[0] + 0.25, F("open", "smile", -1)], [T.ffTurn[1], F("open", "grin", 0)]]));
  return { side: p, front: null, k: 0, layer: "out", cfg: c, a };
}

// ---------------------------------------------------------------- the cold colleague (seated behind desk A, front view)
export function colleague(t) {
  const c = CAST.colleague, warm = sm(t, T.brrHeart[0], T.brrHeart[1]);
  const shiver = (1 - warm) * Math.sin(t * 2 * Math.PI * 6.5) * 1.2;
  const p = { x: COLLEAGUE.x, y: COLLEAGUE.y, view: "front", seated: 1, armsCross: 1 - 0.55 * warm, armF: [-0.2, 0.3], armB: [-0.2, 0.3], shiver,
    cold: 1 - warm, blush: 0.3 + 0.7 * warm, blink: blink(t, 2.9, 0.7), look: [0.5, 0.2],
    ...expr(t, [[0, F("open", "wavy", -2)], [T.brrHeart[0] + 0.05, F("happy", "grin", 0)]], 0.26) };
  // she glances at the worker turning the dial (eyes follow), then smiles
  if (t > T.wReach[0] && t < T.brrHeart[0]) p.look = [1, -0.2];
  return { side: p, front: null, k: 0, layer: "mid", cfg: c };
}
