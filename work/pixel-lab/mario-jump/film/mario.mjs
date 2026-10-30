// Where the plumber is, what he does and what gravity acts on him, as a pure function of film time. Every jump is run
// by physics.mjs (the SMB1 rules, frame by frame) and played back on its own clock: a smooth, monotone warp from film
// time to game frames (slow motion for the explanations, real speed where the feel matters). On the ground he stands,
// runs (with a speed ramp) or slows down. The world repeats every L px, so at END he stands at x = L in exactly the
// state he had at x = 0 in frame 0.
import { jump, TIERS } from "./physics.mjs";
import { EV, END } from "./timeline.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
/** monotone Hermite through knots [t, g]; slopes s0, s1 at the ends (Fritsch–Carlson) */
function warp(knots, s0, s1) {
  const n = knots.length, m = new Array(n);
  for (let i = 0; i < n; i++) { if (i === 0) { m[i] = s0 ?? (knots[1][1] - knots[0][1]) / (knots[1][0] - knots[0][0]); continue; } if (i === n - 1) { m[i] = s1 ?? (knots[i][1] - knots[i - 1][1]) / (knots[i][0] - knots[i - 1][0]); continue; }
    const d0 = (knots[i][1] - knots[i - 1][1]) / (knots[i][0] - knots[i - 1][0]), d1 = (knots[i + 1][1] - knots[i][1]) / (knots[i + 1][0] - knots[i][0]); m[i] = d0 * d1 <= 0 ? 0 : (2 * d0 * d1) / (d0 + d1); }
  for (let i = 0; i < n - 1; i++) { const d = (knots[i + 1][1] - knots[i][1]) / (knots[i + 1][0] - knots[i][0]); if (d === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d, b = m[i + 1] / d, s = a * a + b * b; if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d; m[i + 1] = tau * b * d; } }
  const f = (t) => { if (t <= knots[0][0]) return knots[0][1] + (t - knots[0][0]) * m[0]; if (t >= knots[n - 1][0]) return knots[n - 1][1] + (t - knots[n - 1][0]) * m[n - 1];
    let i = 0; while (i < n - 2 && t > knots[i + 1][0]) i++; const [t0, g0] = knots[i], [t1, g1] = knots[i + 1], h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * g0 + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * g1 + (u3 - u2) * h * m[i + 1]; };
  return f;
}
// ---------------------------------------------------------------- the jumps (film time of takeoff, tier, frames held, warp knots, x)
const RUN0 = EV.running1 + 0.07, RAMP = 0.9, VMAX = 150, T_TAKE = EV.leave + 0.07;
export const X_TAKE = VMAX * (T_TAKE - RUN0 - RAMP / 2);
export const L = 752;                                                                // the world repeats every 47 blocks
const J = (id, tier, hold, knots, x, extra = {}) => ({ id, tier, hold, sim: jump(tier, hold, 140), w: warp(knots, extra.s0, extra.s1), t0: knots[0][0], x, ...extra });
const tStand = jump("stand", Infinity), tEarly = jump("stand", 9), tTap = jump("stand", 1), tRun = jump("run", Infinity);
export const JUMPS = [
  J("hook", "stand", Infinity, [[-0.37, 0], [0, 3], [EV.but1 + 0.1, 32], [EV.way, 42], [EV.upEnd + 0.15, tStand.landF]], 0, { demo: "hook" }),
  J("dualHold", "stand", Infinity, [[EV.every + 0.25, 0], [EV.speedEnd + 0.9, tStand.landF]], 0, { demo: "dual" }),
  J("dualTap", "stand", 1, [[EV.every + 0.25, 0], [EV.speedEnd + 0.9, tStand.landF]], -30, { demo: "dual", ghost: true }),
  J("dual2Hold", "stand", Infinity, [[EV.changes1 - 0.05, 0], [EV.downEnd + 0.15, tStand.landF]], 0, { demo: "dual2" }),
  J("dual2Tap", "stand", 1, [[EV.changes1 - 0.05, 0], [EV.downEnd + 0.15, tStand.landF]], -30, { demo: "dual2", ghost: true }),
  J("four", "stand", Infinity, [[EV.hold - 0.05, 0], [EV.four, 32], [EV.highEnd + 0.35, tStand.landF]], 0, { demo: "four" }),
  J("early", "stand", 9, [[EV.let - 0.25, 0], [EV.early + 0.1, 10], [EV.stops + 0.1, tEarly.apexF], [EV.soonerEnd + 0.1, tEarly.landF]], 0, { demo: "early" }),
  J("tap", "stand", 1, [[EV.quick - 0.15, 0], [EV.lifts + 0.4, tTap.apexF], [EV.blocks2End + 0.1, tTap.landF]], 0, { demo: "tap" }),
  J("hop", "stand", 1, [[EV.tiny - 0.02, 0], [EV.tiny - 0.02 + tTap.landF / 60, tTap.landF]], 0, { demo: "hop", s0: 60, s1: 60 }),
  J("big", "stand", Infinity, [[EV.big - 0.15, 0], [EV.big - 0.15 + tStand.landF / 60, tStand.landF]], 0, { demo: "big", s0: 60, s1: 60 }),
  J("still", "stand", Infinity, [[EV.top1 - 0.35, 0], [EV.strong + 0.05, 32], [EV.holdingEnd + 0.15, tStand.landF]], 0, { demo: "still" }),
  J("timer", "stand", Infinity, [[EV.goes + 0.25, 0], [EV.goes + 0.25 + tStand.landF / 60, tStand.landF]], 0, { demo: "timer", s0: 60, s1: 60 }),
  J("run", "run", Infinity, [[T_TAKE, 0], [T_TAKE + 0.3, 6], [EV.running2, 8.5], [EV.faster, 14], [EV.five, 32], [EV.itEnd - 0.12, tRun.landF]], X_TAKE, { demo: "run", vx: 2.5, s0: 60 }),
];
const tLandRun = EV.itEnd - 0.12;
export const X_LAND = X_TAKE + 2.5 * tRun.landF;
const D_STOP = L - X_LAND, T_STOP = (2 * D_STOP) / VMAX;                               // ease out from full speed to a stop at x = L
if (tLandRun + T_STOP > END - 0.45) throw new Error("no time to stop before the loop jump: " + (tLandRun + T_STOP).toFixed(2));

/** the jump (and its game frame) active at film time t, or null */
export function activeJump(t) {
  for (const j of JUMPS) {
    let tt = t; if (j.id === "hook" && t > END - 1) tt = t - END;
    const gf = j.w(tt); if (tt < j.t0 - 0.02 || gf > j.sim.landF + 0.001) continue; if (gf < 0) continue;
    return { j, gf: Math.max(0, gf), tt, wrapped: tt !== t };
  }
  return null;
}
const hAt = (sim, gf) => { const p = sim.pts, i = Math.floor(gf); if (i >= p.length - 1) return 0; const k = gf - i; return p[i].h + (p[i + 1].h - p[i].h) * k; };
const gravAt = (j, gf) => { const p = j.sim.pts[Math.min(j.sim.pts.length - 1, Math.max(1, Math.ceil(gf)))]; const T = TIERS[j.tier]; return p && p.heavy ? T.strong : T.light; };
/** x on the ground (no jump): stand at 0 until the run, ramp up, run, take off; after landing ease to a stop at L */
function groundX(t) {
  if (t < RUN0) return 0;
  if (t < T_TAKE) { const u = t - RUN0; return u < RAMP ? (VMAX * u * u) / (2 * RAMP) : VMAX * (u - RAMP / 2); }
  if (t < tLandRun) return X_TAKE;
  const u = Math.min(1, (t - tLandRun) / T_STOP); return X_LAND + D_STOP * (2 * u - u * u);
}
/** the plumber's full state at film time t (t in [0, END)) */
export function marioAt(t) {
  const a = activeJump(t);
  if (a) {
    const { j, gf } = a, h = hAt(j.sim, gf), x = (j.id === "hook" && a.wrapped ? L : 0) + j.x + (j.vx ? j.vx * gf : 0) + (j.id === "hook" || j.ghost ? 0 : 0);
    const p = j.sim.pts, i = Math.min(p.length - 1, Math.floor(gf)), v = p[Math.min(p.length - 1, i + 1)].h - p[i].h;
    return { x, y: -h, h, air: smooth(h, 0, 5), rising: v > 0, vUp: v, jump: j, gf, g: gravAt(j, gf), heavy: gravAt(j, gf) === TIERS[j.tier].strong, run: j.vx ? 1 : 0 };
  }
  const x = groundX(t), vx = (groundX(t + 0.01) - groundX(t - 0.01)) / 0.02;
  return { x, y: 0, h: 0, air: 0, rising: false, vUp: 0, jump: null, gf: 0, g: 0, heavy: false, run: Math.min(1, Math.abs(vx) / 60), vx };
}
/** the ghost (the tapping twin) for the side-by-side demos: in the air during its jumps, otherwise standing at x = −30 */
export const GHOST_SPAN = [EV.every - 0.3, EV.downEnd + 0.6];
export function ghostAt(t) {
  for (const j of JUMPS) { if (!j.ghost) continue; const gf = j.w(t); if (t < j.t0 || gf > j.sim.landF) continue;
    const h = hAt(j.sim, gf), p = j.sim.pts, i = Math.floor(gf); return { x: j.x, y: -h, h, air: smooth(h, 0, 5), jump: j, gf, g: gravAt(j, gf), heavy: gravAt(j, gf) === TIERS[j.tier].strong, rising: (p[Math.min(p.length - 1, i + 1)].h - p[i].h) > 0 }; }
  return { x: -30, y: 0, h: 0, air: 0, jump: null, gf: 0, g: 0, heavy: false, rising: false };
}
/** A button held? (0..1, a 0.06 s press/release) — for the main plumber's jumps */
export function buttonAt(t) {
  let best = 0;
  for (const j of JUMPS) { if (j.ghost) continue; let tt = t; if (j.id === "hook" && t > END - 1) tt = t - END;
    const tOn = j.t0 - 0.06, gRel = j.hold === Infinity ? j.sim.landF + 2 : j.hold + 1;
    // film time when the button is released: solve w(t) = gRel by bisection
    let lo = j.t0, hi = j.t0 + 12; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (j.w(m) < gRel) lo = m; else hi = m; } const tOff = Math.max(lo, j.t0 + 0.12);
    best = Math.max(best, Math.min(smooth(tt, tOn, tOn + 0.06), 1 - smooth(tt, tOff, tOff + 0.06))); }
  return best;
}
export { warp };
