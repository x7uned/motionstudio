// «Is my dog blind?» — direction: where the camera, the owner, the dog and the balls are at time t.
// Pure functions of t. The throw is a function of τ (time since release) and is shared by the hook, the replay in dog
// vision and the final throw, so frame 0 and frame END are the same picture.
import { EV, SC, END, REL, REL_REPLAY, TAU0 } from "./timeline.mjs";
import { LAYOUT, CAMS, clamp01, sm, ease, lerp } from "../../kit-v1/layout.mjs";
import { DOG } from "../../kit-v1/dog.mjs";

export const OWNER_X = LAYOUT.owner.x;          // −230
export const LAND = LAYOUT.ball.land;           // 60: where the thrown red ball comes to rest
export const BR = LAYOUT.ball.r;                // 7
export const REST_Y = -BR + 2;                  // a ball resting in the grass sits a little low (blades hide its bottom)
export const FDX = DOG.align.frontDx;           // side (facing f) at x ↔ front sitting at x + f·FDX keeps the faces aligned
export const STOP_X = 120;                      // the dog overshoots the ball and stops here (facing right)
export const HAND_X = -130;                     // the dog stands here (facing left) to drop / hand over the ball
export const DOG_START = HAND_X - 2 * FDX;      // −190.4: ready to sprint (facing right) after sitting at HAND_X − FDX

/** piecewise-linear interpolation over [[x, y], …] with eased segments when `smooth` */
export function keys(k, t, smooth = true) {
  if (t <= k[0][0]) return k[0][1]; if (t >= k[k.length - 1][0]) return k[k.length - 1][1];
  let i = 0; while (k[i + 1][0] < t) i++; const u = (t - k[i][0]) / (k[i + 1][0] - k[i][0]);
  return lerp(k[i][1], k[i + 1][1], smooth ? ease(u) : u);
}

// ---------------------------------------------------------------- the throw (τ = seconds since release)
export const FLIGHT = 1.5, APEX = 230;          // release → first touch; apex height above the straight line
/** owner throw progress k (0 hold → 0.5 release → 1 done) by τ; the wind-up starts 0.74 s before release */
export const throwK = (tau) => tau < -0.74 ? 0 : tau < 0 ? 0.5 * ease((tau + 0.74) / 0.74) : tau < 0.6 ? 0.5 + 0.5 * sm(tau, 0, 0.6) : 1;
/** red ball during a throw: {x, y, spin, h (height above lawn), squash, inHand}; `hand(k)` gives the hand position */
export function throwBall(tau, hand) {
  const rel = hand(0.5);
  if (tau < 0) { const p = hand(throwK(tau)); return { x: p[0], y: p[1], spin: 0, inHand: true }; }
  const T1 = FLIGHT, X1 = 40;
  if (tau < T1) {
    const u = tau / T1, x = lerp(rel[0], X1, u), y = lerp(rel[1], REST_Y, u) - APEX * 4 * u * (1 - u);
    return { x, y, spin: tau * 9, h: REST_Y - y, squash: 0 };
  }
  // one small bounce, then a short roll into the grass
  const T2 = T1 + 0.36, T3 = T2 + 0.5;
  if (tau < T2) { const u = (tau - T1) / (T2 - T1), x = lerp(X1, 53, u), y = REST_Y - 16 * 4 * u * (1 - u); return { x, y, spin: T1 * 9 + (tau - T1) * 6, h: REST_Y - y, squash: Math.max(0, 1 - (tau - T1) / 0.07) * 0.5 }; }
  if (tau < T3) { const u = (tau - T2) / (T3 - T2), e = 1 - (1 - u) * (1 - u), x = lerp(53, LAND, e); return { x, y: REST_Y, spin: T1 * 9 + 0.36 * 6 + (x - 53) / BR, h: 0, squash: Math.max(0, 1 - (tau - T2) / 0.06) * 0.25 }; }
  return { x: LAND, y: REST_Y, spin: T1 * 9 + 0.36 * 6 + (LAND - 53) / BR, h: 0, squash: 0 };
}
export const BALL_REST_TAU = FLIGHT + 0.36 + 0.5;          // 2.36 s

/** the dog during a throw (τ since release): runs under the ball, overshoots past it and stops at STOP_X */
const RUN = [[0, DOG_START], [0.25, DOG_START + 12], [0.6, -125], [TAU0, -25], [1.35, 45], [1.7, 105], [1.95, STOP_X]];
export function dogRun(tau) {
  if (tau < 0) return { x: DOG_START, speed: 0 };
  const x = keys(RUN, Math.min(tau, 1.95), false), x2 = keys(RUN, Math.min(tau + 1 / 60, 1.95), false);
  return { x, speed: (x2 - x) * 60 };
}

// ---------------------------------------------------------------- camera {cx, cy, z}
// the hook camera is close (z 1.6: the owner is ≈ 240 px tall) and follows the action; frame 0 = frame END
export const HOOK0 = { cx: -125, cy: -62, z: 1.6 };
const CK = (t, cx, cy, z) => ({ t, cx, cy, z });
export const CAM = [
  CK(0, HOOK0.cx, HOOK0.cy, HOOK0.z), CK(0.9, -20, -62, 1.6), CK(1.5, 92, -64, 1.6), CK(3.5, 84, -64, 1.6), CK(SC.hook[1], 58, -62, 1.66),
  CK(SC.hook[1] + 1.0, 32, -56, 2.4), CK(SC.cones[1], 34, -56, 2.45),                 // push in to the sitting dog + the ball
  CK(SC.vision[0] + 1.1, 20, -70, 1.75), CK(EV.that - 0.15, 22, -68, 1.8),            // dog + ball + lawn for the wipe
  CK(EV.ball3 + 0.25, 56, -22, 3.0), CK(SC.vision[1], 57, -22, 3.05),                // the ball in the grass, close
  CK(SC.replay[0] + 0.4, HOOK0.cx, HOOK0.cy, HOOK0.z), CK(REL_REPLAY + 0.9, -20, -62, 1.6), CK(REL_REPLAY + 1.9, 62, -64, 1.6), CK(SC.replay[1], 66, -64, 1.6),
  CK(SC.detail[0] + 0.9, 120, -118, 1.45), CK(SC.detail[1], 122, -118, 1.45),        // the dog under the two panels
  CK(SC.nose[0] + 0.8, 128, -62, 1.9), CK(SC.nose[1], 96, -60, 1.9),                  // sniffing close-up
  CK(SC.fix[0] + 1.1, -100, -70, 1.55), CK(SC.fix[1], -96, -70, 1.55),                  // wide: owner, dog, three balls
  CK(SC.loop[0] + 0.6, -150, -66, 1.55), CK(REL - 0.2, -148, -64, 1.6), CK(END, HOOK0.cx, HOOK0.cy, HOOK0.z),
];
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: lerp(a.z, b.z, k) };
}
