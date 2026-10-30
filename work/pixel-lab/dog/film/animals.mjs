// Mouse, rat and bear in side view (facing left), same shading engine as the Labrador. Units: ground at y = 0, x centre 0.
// sway shifts the upper body (shake), phase drives the skin wave. s = px per unit.
import { fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth, drawPart } from "../shade.mjs";

export const RAMPS = {
  mouse: ["#1E1A22", "#3A3440", "#5E5664", "#857C8C", "#ABA2B2", "#CFC8D6", "#ECE6F2"],
  rat: ["#1A1412", "#33291F", "#4F4034", "#6B5A4C", "#8A7766", "#AA9784", "#C8B7A2"],
  bear: ["#0E0805", "#1E120A", "#321E10", "#4A2E18", "#664024", "#845636", "#A2704A"],
};
const PINK = "#C98A9A";
function animal(g0, gx, gy, s, def, { sway = 0, phase = 0, shake = 1, alpha = 1, light = [0.8, -0.6], litOutline = "#FAE375" } = {}) {
  const g = alpha < 1 ? fade(g0, alpha) : g0, R = Math.round;
  const T = ([x, y]) => [gx + x * s + sway * Math.max(0, Math.min(1, (-y - def.legH) / def.bodyH)), gy + y * s];
  const opt = { ramp: def.ramp, light, litOutline, outline: def.ramp[0] };
  const wave = (pts, idx, amp) => pts.map((p, i) => (idx.includes(i) ? [p[0], p[1] - shake * amp * (0.6 + 0.4 * Math.sin(phase * 1.3 + p[0] * 0.5))] : p));
  if (def.tail) { const L = [], Rr = []; for (let k = 0; k <= 14; k++) { const u = k / 14, c = def.tail(u, phase, shake), w = def.tailW * (1 - u * 0.75); L.push(T([c[0], c[1] - w])); Rr.unshift(T([c[0], c[1] + w])); } drawPart(g, [smooth([...L, ...Rr], new Set([14, 15]))], { ...opt, ramp: def.tailRamp ?? def.ramp, base: 3, gain: 0.8, thick: def.tailW * s }); }
  for (const leg of def.farLegs) drawPart(g, [smooth(leg.map(T))], { ...opt, base: 2.0, gain: 0.8, thick: 2 * s, litOutline: null });
  for (const leg of def.nearLegs) drawPart(g, [smooth(leg.map(T))], { ...opt, base: 2.8, gain: 1.2, thick: 2.5 * s });
  drawPart(g, [smooth(wave(def.body, def.back, def.waveAmp).map(T), def.sharp ?? new Set())], { ...opt, base: 3.4, gain: 2.0, slope: 1.3, thick: def.thick * s });
  if (def.ear) drawPart(g, [smooth(def.ear.map(T))], { ...opt, base: 2.6, gain: 1.2, thick: 2 * s });
  if (def.muzzle) drawPart(g, [smooth(def.muzzle.map(T))], { ...opt, base: 4.2, gain: 1.2, thick: 3 * s, rimShade: 0.6 });
  if (def.earIn) drawPart(g, [smooth(def.earIn.map(T))], { ramp: ["#4A2A34", "#7A4A5A", PINK, "#E2B2BE"], base: 2, gain: 1, thick: 1.5 * s, outline: "#4A2A34", light });
  const [ex, ey] = T(def.eye), r = Math.max(1, R(def.eyeR * s)); g.disc(R(ex), R(ey), r + (s > 1.5 ? 1 : 0), def.ramp[0]); g.disc(R(ex), R(ey), r, "#0A0606"); g.px(R(ex - r / 2), R(ey - r / 2), "#FDFEED");
  const [nx, ny] = T(def.nose); g.rect(R(nx) - 1, R(ny) - 1, Math.max(2, R(def.noseR * s)), Math.max(2, R(def.noseR * s)), def.noseCol ?? "#120A0A");
  if (def.whiskers && s > 1.2) for (const [dx, dy] of [[-7, -1.5], [-7.5, 0], [-6.5, 1.5]]) { const [x1, y1] = T([def.nose[0] + 1, def.nose[1]]), [x2, y2] = T([def.nose[0] + dx, def.nose[1] + dy]); g.line(R(x1), R(y1), R(x2), R(y2), def.ramp[5]); }
  return T;
}
const MOUSE = {
  ramp: RAMPS.mouse, legH: 1.5, bodyH: 7, thick: 3.5, waveAmp: 0.8, eyeR: 0.8, noseR: 0.9, noseCol: "#7A4A5A", whiskers: true,
  body: [[-9, -4.5], [-7, -6.5], [-4, -8], [0, -8.6], [4, -8.2], [7, -6.5], [8.6, -4], [8, -1.8], [5, -1.2], [0, -1.2], [-5, -1.4], [-7.5, -2.2], [-10.5, -3.4]],
  back: [2, 3, 4], sharp: new Set([12]),
  ear: [[-4.5, -8], [-3.5, -11.5], [-1, -12], [0, -9.5], [-1.5, -8]], earIn: [[-3.6, -9], [-2.9, -11], [-1.3, -11], [-1, -9.5]],
  eye: [-6.5, -5.2], nose: [-10.6, -3.6],
  nearLegs: [[[-6, -2], [-4.5, -2], [-4.5, 0], [-7, 0]], [[3.5, -2.5], [6.5, -2.5], [6, 0], [3, 0]]], farLegs: [[[-4, -2], [-2.8, -2], [-2.8, 0], [-4.8, 0]], [[1.5, -2], [3.5, -2], [3.5, 0], [1.5, 0]]],
  tail: (u, ph, sh) => [8.5 + u * 14, -3 + Math.sin(u * 3 + ph * 2) * 1.5 * (0.3 + sh) - u * 1.5], tailW: 0.6, tailRamp: ["#4A2A34", "#7A4A5A", "#A06A7A", PINK, "#E2B2BE"],
};
const RAT = {
  ramp: RAMPS.rat, legH: 2.5, bodyH: 10, thick: 5, waveAmp: 1.2, eyeR: 1.0, noseR: 1.1, noseCol: "#7A4A5A", whiskers: true,
  body: [[-15, -6], [-12, -9], [-7, -11.5], [0, -12.5], [7, -12], [12, -9.5], [14, -6], [13, -2.8], [8, -2], [0, -2], [-7, -2.2], [-11.5, -3.2], [-16.5, -4.8]],
  back: [2, 3, 4], sharp: new Set([12]),
  ear: [[-8, -11], [-7, -14.5], [-4.5, -15], [-3.5, -12.5], [-5, -11]], earIn: [[-7, -12], [-6.4, -14], [-4.8, -14], [-4.4, -12.5]],
  eye: [-11, -8], nose: [-16.6, -5.3],
  nearLegs: [[[-10, -3], [-7.5, -3], [-7.5, 0], [-11, 0]], [[6, -4], [10.5, -4], [9.5, 0], [5.5, 0]]], farLegs: [[[-7, -3], [-5, -3], [-5, 0], [-8, 0]], [[3, -3], [6, -3], [6, 0], [3, 0]]],
  tail: (u, ph, sh) => [13.5 + u * 26, -4 + Math.sin(u * 2.4 + ph * 1.5) * 2 * (0.3 + sh) - Math.sin(u * 3) * 2], tailW: 1.0, tailRamp: ["#4A2A34", "#7A4A5A", "#A06A7A", PINK, "#E2B2BE"],
};
const BEAR = {
  ramp: RAMPS.bear, legH: 22, bodyH: 50, thick: 26, waveAmp: 3.5, eyeR: 1.6, noseR: 3, whiskers: false,
  body: [[-58, -50], [-54, -58], [-46, -63], [-38, -64], [-30, -72], [-16, -78], [0, -76], [16, -73], [32, -72], [44, -66], [52, -56], [54, -44], [50, -32], [38, -24], [24, -22], [0, -22], [-20, -22], [-32, -26], [-38, -34], [-46, -38], [-56, -42], [-62, -46]],
  back: [5, 6, 7, 8, 9], sharp: new Set([21]),
  ear: [[-38, -63], [-39, -69], [-34, -71], [-31, -67], [-33, -63]],
  eye: [-48, -55], nose: [-64, -50], muzzle: [[-65, -52], [-58, -55], [-51, -53], [-50, -47], [-56, -44], [-63, -45]],
  nearLegs: [[[-34, -30], [-18, -30], [-18, -6], [-17, 0], [-33, 0], [-33, -8]], [[22, -34], [44, -32], [42, -10], [43, 0], [27, 0], [26, -12]]],
  farLegs: [[[-22, -28], [-10, -28], [-10, -4], [-9, 0], [-23, 0]], [[16, -30], [32, -30], [31, -6], [32, 0], [17, 0]]],
  tail: null,
};
export const drawMouse = (g, gx, gy, s, o) => animal(g, gx, gy, s, MOUSE, o);
export const drawRat = (g, gx, gy, s, o) => animal(g, gx, gy, s, RAT, o);
export const drawBear = (g, gx, gy, s, o) => animal(g, gx, gy, s, BEAR, o);
