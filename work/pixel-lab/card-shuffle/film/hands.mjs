// The player's two hands seen from above (our own drawing): backs of the hands, fingers pointing up the table, forearms
// running down to the bottom edge in purple sweater sleeves. Each hand follows an eased keyframe track tied to the deck
// (timeline.mjs / deck.mjs constants): it sweeps the first frame's spread together, holds the two riffle packets, squares
// the deck, rests at the bottom corners, runs the overhand pass, pulls the old deck away and brings the fresh one in.
// `grip` (0 = flat, 1 = fingers curled over the deck edge) changes the finger length continuously; nothing jumps.
import { blob, ell, tube, RAMP } from "./cute.mjs";
import { EV, T, HOME, HOOK } from "./timeline.mjs";
import { LPK, UPK, LPKH, OVER_TIMES } from "./deck.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const SLEEVE = ["#140E24", "#22163C", "#33245A", "#46327A", "#5A4296", "#6E52B0", "#8A6CC8", "#A88CDC"];
const ELBOW = { L: [10, 1150], R: [530, 1150] };
const REST = { L: [192, 860], R: [348, 860] };
const SIDE = 46;
const FING = [[-20, 38, -0.1], [-6.8, 46, -0.03], [6.8, 45, 0.03], [19.6, 35, 0.1]];                                                          // palm centre ↔ deck centre

// keyframes [t, x, y, grip]; the right hand mirrors the left where the action is symmetric
const mirror = (K) => K.map(([t, x, y, g]) => [t, 540 - x, y, g]);
const sweepIn = (t0, t1, at = HOME) => [[t0 - 0.3, 46, 436, 0.2], [t0 + (t1 - t0) * 0.7, 216, Math.min(at.y, 548), 0.6], [t1, at.x - SIDE, at.y + 4, 1]];
const L0 = [
  ...sweepIn(T.gather[0], T.gather[1], HOOK),
  [T.cut1[0], HOOK.x - SIDE, HOOK.y + 4, 1], [T.cut1[1], LPKH.x - SIDE - 4, HOOK.y + 6, 1], [T.drops[1], LPKH.x - SIDE, HOOK.y + 6, 1],
  [T.square[1], HOOK.x - SIDE, HOOK.y + 4, 1], [T.toHome[0], HOOK.x - SIDE, HOOK.y + 4, 1], [T.toHome[1], HOME.x - SIDE, HOME.y + 4, 1], [T.cloud[0] - 0.25, HOME.x - SIDE, HOME.y + 4, 1], [T.cloud[0] + 0.45, ...REST.L, 0.5],
  [EV.but1 - 0.15, ...REST.L, 0.5], [EV.but1 + 0.5, HOME.x - SIDE, HOME.y + 4, 1], [T.spreadR[0] + 0.1, HOME.x - SIDE, HOME.y + 4, 1], [T.spreadR[0] + 0.8, ...REST.L, 0.5],
  [T.gatherR[0] - 0.8, ...REST.L, 0.5], ...sweepIn(T.gatherR[0], T.gatherR[1]),
];
const R0 = mirror(L0);
const L = [...L0,
  [T.over0 - 0.22, HOME.x - SIDE, HOME.y + 4, 1], [T.over0 - 0.02, LPK.x - SIDE, HOME.y + 6, 1], [T.swapOut[0] - 0.3, LPK.x - SIDE, HOME.y + 6, 1],
  [T.swapOut[0] - 0.02, -70, HOME.y + 14, 0.4], [T.swapIn[0], -40 - SIDE, HOME.y + 6, 1], [T.swapIn[1], HOME.x - SIDE, HOME.y + 4, 1],
  [T.swapIn[1] + 0.12, HOME.x - SIDE, HOME.y + 4, 1], [T.swapIn[1] + 0.75, ...REST.L, 0.5],
];
const R = [...R0,
  [T.over0 - 0.22, HOME.x + SIDE, HOME.y + 4, 1], [T.over0 - 0.02, UPK.x + SIDE, HOME.y + 6, 1], [OVER_TIMES[OVER_TIMES.length - 1] + T.overDur + 0.02, UPK.x + SIDE - 6, HOME.y + 6, 0.7],
  [T.swapOut[0] - 0.02, LPK.x + SIDE, HOME.y + 4, 1], [T.swapOut[1], 640 + SIDE, HOME.y + 4, 1], [T.swapOut[1] + 0.12, 610, 700, 0.3], [T.swapIn[1] + 0.6, ...REST.R, 0.5],
];
const TRACK = { L: L.sort((a, b) => a[0] - b[0]), R: R.sort((a, b) => a[0] - b[0]) };

export function handAt(side, t) {
  const K = TRACK[side]; let i = 0; while (i < K.length - 1 && K[i + 1][0] <= t) i++;
  let x, y, g;
  if (t <= K[0][0]) [, x, y, g] = K[0];
  else if (i >= K.length - 1) [, x, y, g] = K[K.length - 1];
  else { const a = K[i], b = K[i + 1], k = ease((t - a[0]) / (b[0] - a[0])); x = lerp(a[1], b[1], k); y = lerp(a[2], b[2], k); g = lerp(a[3], b[3], k); }
  // the riffle: thumbs let the cards go, the packets lean in a little; overhand: the right hand feeds each packet
  if (t > T.drops[0] && t < T.drops[1]) { const u = (t - T.drops[0]) / (T.drops[1] - T.drops[0]); x += (side === "L" ? 1 : -1) * 2 * Math.sin(Math.PI * u); y += Math.sin(u * 40) * 0.6; }
  if (side === "R") for (const t0 of OVER_TIMES) if (t > t0 - 0.02 && t < t0 + T.overDur + 0.04) { const u = (t - t0 + 0.02) / (T.overDur + 0.06); x -= 12 * Math.sin(Math.PI * u); y -= 3 * Math.sin(Math.PI * u); }
  const br = Math.sin(t * 1.9 + (side === "L" ? 0 : 2.1));
  return { x, y: y + br * 0.8, grip: g };
}

/** Draw one hand + forearm. */
export function drawHand(c, side, t) {
  const { x, y, grip } = handAt(side, t), [ex, ey] = ELBOW[side];
  let ux = x - ex, uy = y - ey; const n = Math.hypot(ux, uy); ux /= n; uy /= n;      // up the forearm towards the fingers
  const sx = -uy, sy = ux, inner = side === "L" ? 1 : -1;                         // sideways (screen right for an upright hand)
  const P = (a, b) => [x + sx * a + ux * b, y + sy * a + uy * b];
  // forearm ends just below the frame (keeps the shading box small)
  const far = Math.max(0, (980 - y) / -uy), elb = P(0, -Math.min(far, 900));
  const arm = tube([P(0, -26), P(0, -120), elb], 24, 29);
  const sleeve = tube([P(0, -165), elb], 33, 37);
  const palm = ell(x, y, 29, 32, Math.atan2(uy, ux) + Math.PI / 2, 36).map(([px, py]) => [px, py]);
  const fl = FING.map(([a, L0, sp]) => {
    const Lf = lerp(L0, L0 * 0.42, grip), b0 = 20, dir = [sp, 1];
    return tube([P(a, b0), P(a + dir[0] * Lf * 0.5, b0 + Lf * 0.5), P(a + dir[0] * Lf, b0 + Lf)], 7.8, 6.8);
  });
  const thL = lerp(32, 20, grip), thumb = tube([P(inner * 22, -14), P(inner * (28 + thL * 0.25), 4), P(inner * (26 + thL * 0.45), -11 + thL)], 8.8, 7.6);
  const o = { ramp: RAMP.skin, base: 3.7, gain: 1.6, slope: 0.25, thick: 9, light: [-0.55, -0.85], outline: "#1A0C10" };
  blob(c, [arm, palm, ...fl], o);
  blob(c, [sleeve], { ...o, ramp: SLEEVE, base: 3.6, gain: 1.5, thick: 10, outline: "#0B0812" });
  // sleeve cuff rib
  for (let a = -32; a <= 32; a++) { const [qx, qy] = P(a, -165); c.px(qx, qy, SLEEVE[2]); const [rx, ry] = P(a, -169); c.px(rx, ry, SLEEVE[6]); const [sx2, sy2] = P(a, -173); c.px(sx2, sy2, SLEEVE[2]); }
  blob(c, [thumb], o);
  // knuckles and nails
  for (const [a, L0] of FING) {
    const Lf = lerp(L0, L0 * 0.42, grip), [kx, ky] = P(a, 20), [nx, ny] = P(a, 20 + Lf - 3);
    c.px(kx, ky, RAMP.skin[3]); c.px(kx + 1, ky, RAMP.skin[3]); c.px(kx, ky + 1, RAMP.skin[4]);
    if (grip < 0.75) { c.rect(Math.round(nx) - 1, Math.round(ny), 3, 2, "#F8D8D0"); c.px(nx, ny + 2, "#E8B8B0"); }
  }
}
export function drawHands(c, t) { drawHand(c, "L", t); drawHand(c, "R", t); }
export { EV };
