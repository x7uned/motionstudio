// steve-real film2 · strongman (new, 2026-10-28, drawn for this film): a real-sized heavyweight lifter (1.88 m, broad,
// singlet, belt, chalked hands, short beard) beside a loaded barbell with stacks of big plates. lift: squats, grips the bar
// and stands up with it to the thighs, shaking with strain; lower: sets it down; look: turns his head. Uses the film's
// person rig (passerby.drawPerson) with a bulk look. Not a real athlete.
import { drawPerson } from "./passerby.mjs";
import { Spr } from "../lib/rig.mjs";
const clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;
export const LOOK = { h: 1.88, bulk: 1.32, skin: "skinA", top: "navy", legs: "navy", shoe: "black", hair: "dark", style: "short", beard: true, belt: true };
const PL = ["#141218", "#24202C", "#36303E", "#4C4456", "#6A6074"], RIM = ["#5A1A1E", "#8A2A2E", "#B03A3A", "#D05A50"], BAR = ["#5A5E6A", "#8A909E", "#C0C6D2", "#E8ECF2"];

/** feet (fx, fy), s px/m; p = { lift 0..1 (bar height), shake, turn, dir, a } */
export function drawStrongman(c, fx, fy, s, t, p = {}) {
  const lift = clamp01(p.lift ?? 0), H = LOOK.h, shake = (p.shake ?? 0) * Math.sin(t * 38) * 0.006 * H;
  // the bar: from 0.24 m (resting on the plates) up to the thighs (0.78 m) — squat before the pull
  const grip = clamp01(p.grip ?? 0), barY = lerp(0.24, 0.8, lift) + shake * 0.5, drop = grip * (1 - lift) * 0.2;
  const handsY = barY + 0.0, hands = [[-0.24 + shake, handsY], [0.24 + shake, handsY]];
  const pose = { dir: p.dir ?? 1, turn: p.turn ?? 0, mouth: lift > 0.1 && lift < 0.98 ? 1 : p.mouth ?? 0, drop: drop * grip };
  if (grip > 0.01) { pose.hands = hands.map((h, i) => [lerp((i ? 1 : -1) * 0.118 * H, h[0], grip), lerp(0.43 * H, h[1], grip)]); }
  // plates behind the body (far side) then the lifter then the near plates and bar
  const plates = (side) => { const sp = new Spr(fx - 1.6 * s, fy - (barY + 0.6) * s, 3.2 * s, 1.3 * s);
    for (let q = 0; q < 4; q++) { const x = side * (0.86 + q * 0.085) + shake, [px, py] = [fx + x * s, fy - barY * s]; sp.ell(px, py, Math.max(1.5, 0.05 * s), 0.225 * s, q % 2 ? RIM : PL, 16 + q); }
    const [x0] = [fx + side * 0.8 * s], [x1] = [fx + side * 1.25 * s]; sp.cap(Math.min(x0, x1), fy - barY * s, Math.max(x0, x1), fy - barY * s, Math.max(1, 0.025 * s), Math.max(1, 0.025 * s), BAR, 40);
    sp.blit(c, p.a ?? 1); };
  plates(-1);
  const r = drawPerson(c, fx, fy, s, t, LOOK, pose, { a: p.a });
  // belt
  { const y = fy - (0.53 * H - drop * H) * s, w = 0.13 * H * LOOK.bulk * s; for (let x = Math.round(fx - w); x <= Math.round(fx + w); x++) for (let j = 0; j < Math.max(2, Math.round(0.05 * s)); j++) c.px(x, Math.round(y) - j, j === 0 ? "#2A1C14" : "#6A3E22"); }
  { const sp = new Spr(fx - 1.0 * s, fy - (barY + 0.1) * s, 2 * s, 0.2 * s + 2); sp.cap(fx - 0.9 * s + shake * s, fy - barY * s, fx + 0.9 * s + shake * s, fy - barY * s, Math.max(1, 0.022 * s), Math.max(1, 0.022 * s), BAR, 40); sp.blit(c, p.a ?? 1); }
  plates(1);
  // chalk dust puffs at the grip
  return { ...r, bar: [fx, fy - barY * s] };
}
export default {
  kind: "strongman", covers: ["strongman", "weightlifter", "barbell", "deadlift"], source: "steve-real/film2 (new)",
  desc: "a real-sized heavyweight lifter with a loaded barbell; squats, grips and stands up with it, shaking; sets it down; turns his head",
  hw: 70, hh: 47, start: "stands by the loaded bar",
  states: { rest: [0.4, "stands by the loaded bar"], lift: [1.0, "grips and stands up with the bar, shaking", "strain"], lower: [0.8, "sets the bar down"], look: [0.4, "turns his head"] },
  base: { grip: 0, lift: 0, shake: 0, turn: 0 }, st: { rest: { grip: 0, lift: 0, shake: 0 }, lift: { grip: 1, lift: 1, shake: 1 }, lower: { grip: 0, lift: 0, shake: 0 }, look: { turn: -1 } }, linear: [],
  notes: "50 px per metre at z 1. The bar rises 0.24 → 0.8 m.",
  draw(c, cx, cy, z, t, s) { return drawStrongman(c, cx, cy + this.hh * z, 50 * z, t, { ...s.v, dir: s.dir ?? -1, a: s.a }); },
};
