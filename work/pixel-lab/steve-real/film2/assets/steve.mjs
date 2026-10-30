// steve-real · steve (new, 2026-10-28): a blocky game hero in OUR pixel drawing — square head with brown hair, light-blue
// tee, dark-blue trousers, grey shoes — made of six textured cuboids (lib/box3d.mjs, our own 8×8 / 8×12 / 4×12 texel
// paintings, no game files). Blocky motion: arms and legs swing stiffly from shoulder / hip, the head turns as a box, the
// body yaws, tumbles, leans into a run, punches with the near arm, lifts a block overhead in one hand, lifts a leg and sinks
// into the ground. All parameters are continuous (eased by the engine). Extra film parameters may override s.v (yaw, head,
// gait phase via s.gait). Footprint: 1.8 m tall hero at 50 px / m → about 90 px at z 1.
import { render, chain, T, RX, RY, RZ, grain } from "../lib/box3d.mjs";

export const U = 2.8125;            // px per model unit at z 1 (32 units = 1.8 m = 90 px)
const C = {
  S: ["#C48E6C", "#B9835F", "#CE9A78"], N: "#A6705A", M: "#5E3A26", m: "#77482F", H: ["#3E2716", "#352113", "#4A3020"],
  W: "#F2F2F2", E: "#4F3FA8", T: ["#2FB4C8", "#29A3B8", "#3CC2D2"], P: ["#3434A0", "#2C2C8C", "#3E3EAE"], G: ["#5A5A66", "#4E4E58", "#66666F"],
};
const FACE = ["HHHHHHHH", "HHHHHHHH", "HSSSSSSH", "SSSSSSSS", "SWESSEWS", "SSSNNSSS", "SSMMMMSS", "SSSmmSSS"];
const col = (ch, iu, iv, seed) => ch === "H" ? grain(C.H, iu, iv, seed) : ch === "S" ? grain(C.S, iu, iv, seed, [0.8, 0.92]) : ch === "N" ? C.N : ch === "M" ? C.M : ch === "m" ? C.m : ch === "W" ? C.W : ch === "E" ? C.E : C.S[0];
function headTex(face, iu, iv) {
  if (face === "front") return col(FACE[iv][iu], iu, iv, 1);
  if (face === "top") return grain(C.H, iu, iv, 2);
  if (face === "bottom") return grain(C.S, iu, iv, 3);
  if (face === "back") return iv < 7 ? grain(C.H, iu, iv, 4) : grain(C.S, iu, iv, 4);
  const fd = face === "right" ? iu : 7 - iu;          // texel columns from the face edge (0) to the back (7)
  const hair = iv < 2 || (iv === 2 && fd > 0) || (iv < 5 && fd > 5) || (iv < 4 && fd > 4) || fd === 7;
  if (hair) return grain(C.H, iu, iv, 5);
  if (fd === 4 && (iv === 4 || iv === 5)) return C.N;                    // ear
  return grain(C.S, iu, iv, 6, [0.8, 0.92]);
}
const torsoTex = (face, iu, iv) => (face === "front" && iv === 0 && (iu === 3 || iu === 4)) || (face === "front" && iv === 1 && (iu === 3 || iu === 4) && false) ? C.S[0] : grain(C.T, iu, iv, 7);
const armTex = (face, iu, iv) => face === "top" ? grain(C.T, iu, iv, 8) : face === "bottom" ? C.S[1] : iv < 4 ? grain(C.T, iu, iv, 9) : grain(C.S, iu, iv, 10, [0.8, 0.92]);
const legTex = (face, iu, iv) => face === "top" ? C.P[0] : face === "bottom" ? C.G[1] : iv < 10 ? grain(C.P, iu, iv, 11) : grain(C.G, iu, iv, 12);

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const TAU = Math.PI * 2;

/** Build the six parts for a pose. p: { yaw, head, swingL, swingR, armL, armR, armRside, roll, lean, bob, sinkU } */
export function parts(p) {
  const root = chain(T(0, p.bob - p.sinkU, 0), RY(p.yaw), T(0, 16, 0), RZ(p.roll || 0), RX(p.lean || 0), T(0, -16, 0));
  const legL = chain(root, T(2, 12, 0), RX(-p.swingL), T(-2, -12, -2)), legR = chain(root, T(-2, 12, 0), RX(-p.swingR), T(-2, -12, -2));
  const torso = chain(root, T(-4, 12, -2));
  const armL = chain(root, T(6, 22, 0), RZ(p.armLside || 0), RX(-p.armL), T(-2, -10, -2)), armR = chain(root, T(-6, 22, 0), RZ(-(p.armRside || 0)), RX(-p.armR), T(-2, -10, -2));
  const head = chain(root, T(0, 24, 0), RY(p.head), RX(p.nod || 0), T(-4, 0, -4));
  return {
    list: [
      { X: legL, size: [4, 12, 4], tex: legTex, group: 1 }, { X: legR, size: [4, 12, 4], tex: legTex, group: 2 },
      { X: torso, size: [8, 12, 4], tex: torsoTex, group: 3 }, { X: armL, size: [4, 12, 4], tex: armTex, group: 4 },
      { X: armR, size: [4, 12, 4], tex: armTex, group: 5 }, { X: head, size: [8, 8, 8], tex: headTex, group: 6 },
    ],
    hand: chain(root, T(-6, 22, 0), RZ(-(p.armRside || 0)), RX(-p.armR)),          // right shoulder frame: hand end at (0, -10, 0)
  };
}

/** The pose from the item parameters at time t (gait phase g in cycles). */
export function pose(v, t, g, acc) {
  const walkA = 0.55 * v.walk + 0.95 * v.run, sw = Math.sin(TAU * g);
  const idle = 0.04 * Math.sin(TAU * 0.4 * t);
  let armR = -sw * (0.5 * v.walk + 1.05 * v.run) + idle, armL = sw * (0.5 * v.walk + 1.05 * v.run) - idle;
  // punch: the near (right) arm comes up forward and swings in a short arc (≈ 4 swings / s, like breaking a block)
  armR = armR * (1 - v.punch) + v.punch * (1.35 + 0.42 * Math.sin(TAU * 4 * t));
  // hold overhead: the right arm straight up, a small strain-free sway
  armR = armR * (1 - v.hold) + v.hold * (Math.PI - 0.06 + 0.03 * Math.sin(TAU * 0.5 * t));
  const stepK = acc ? acc("step") : 0, lift = v.lift * (1 - clamp01((stepK - 0.35) / 0.25));
  return {
    yaw: v.yaw, head: v.head * (1 - v.look) + (-v.yaw * 0.9) * v.look, nod: 0.35 * v.down,
    swingL: sw * walkA, swingR: -sw * walkA + 0.75 * lift, armL, armR, armRside: 0.12 * v.hold, armLside: 0.08 * v.hold + 0.25 * v.sink,
    roll: v.roll, lean: 0.16 * v.run - 0.12 * lift, bob: Math.abs(Math.cos(TAU * g)) * (0.5 * v.walk + 1.4 * v.run), sinkU: 6.8 * v.sink,
  };
}

export default {
  kind: "steve", covers: ["steve", "blocky hero", "game hero", "block man"],
  source: "steve-real/film (new)",
  desc: "blocky game hero: square head, light-blue tee, dark-blue trousers; walks, runs, punches, lifts a block, sinks",
  hw: 26, hh: 45, start: "stands, arms sway a little",
  states: {
    idle: [0.4, "stands, arms sway a little"],
    walk: [0.35, "stiff-leg walk, arms swing", "tick"],
    run: [0.3, "leans into a stiff-leg run", "tick"],
    punch: [0.25, "punches with the near arm, short arcs", "thump"],
    hold: [0.6, "lifts a block overhead in one hand", "rise"],
    step: [1.6, "lifts a leg, steps down and sinks to the knees", "thud"],
    look: [0.45, "turns the head to the camera", "blip"],
  },
  base: { yaw: 0.95, head: 0, walk: 0, run: 0, punch: 0, hold: 0, lift: 0, sink: 0, look: 0, roll: 0, down: 0 },
  st: {
    idle: { walk: 0, run: 0, punch: 0, look: 0 }, walk: { walk: 1, run: 0, punch: 0 }, run: { run: 1, walk: 0, punch: 0 }, punch: { punch: 1, walk: 0, run: 0 },
    hold: { hold: 1, punch: 0, walk: 0, run: 0 }, step: { lift: 1, sink: 1, walk: 0, run: 0 }, look: { look: 1 },
  },
  linear: ["sink"], slots: null, hud: false, value: false, text: false,
  notes: "Gait phase: s.gait (cycles) from the film (distance / stride) or ∫(1.9 walk + 3 run) dt. The step state lifts the leg in its first third, then sinks (clip at the feet line).",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = U * z, feet = cy + this.hh * z;
    const g = s.gait ?? s.integ((p) => 1.9 * p.walk + 3.0 * p.run);
    const p = pose(v, t, g, s.acc);
    const { list, hand } = parts(p);
    const clipY = v.sink > 0.001 ? Math.round(feet + (s.clipDy ?? 1)) : undefined;
    const r = render(c, list, { ox: cx, oy: feet, k, pitch: 0.24, clipY });
    const h = (pp) => { const cp = Math.cos(0.24), sp = Math.sin(0.24), q = [0, 1, 2].map((i) => hand.m[i * 3] * pp[0] + hand.m[i * 3 + 1] * pp[1] + hand.m[i * 3 + 2] * pp[2] + hand.t[i]); return [cx + k * q[0], feet - k * (q[1] * cp - q[2] * sp)]; };
    const box = r ? r.box : { x0: cx - 20, y0: feet - 90 * z, x1: cx + 20, y1: feet };
    return { box, pt: h([0, -10, 0]), hand: h([0, -10, 0]), handFar: h([0, -14, 0]), head: [cx, feet - k * 28 + k * p.sinkU] };
  },
};
