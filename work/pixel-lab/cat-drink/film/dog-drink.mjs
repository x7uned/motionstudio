// Side-view Labrador from «How a dog shakes dry» (dog3.mjs), copied for the cat film with one addition: `nod` lowers the head to drink.
// shake, sway for the motion smear, optional x-ray points. Facing left; units 120×78, ground at y = 78.
import { fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth, drawPart, FUR } from "../../dog/shade.mjs";

const TORSO = [[2, 18], [3, 15], [9, 13.6], [14.5, 12.6], [17.5, 8.6], [22, 6], [29, 5], [35, 8], [38, 13], [42, 20], [47, 25],
  [56, 27], [68, 27], [80, 27], [92, 28], [100, 30], [106, 33], [110, 38], [110, 45], [107, 52], [103, 57], [96, 59], [88, 56],
  [80, 53], [68, 54], [56, 55], [46, 56], [40, 59], [33, 57], [31, 52], [29, 46], [27, 40], [24, 35], [19, 31], [14, 30], [8, 29], [4, 27], [2, 24], [1, 21]];
const SHARP = new Set([0, 3, 4, 38]);
const HEAD = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 33, 34, 35, 36, 37, 38]);
const BACK = [11, 12, 13, 14, 15, 16], BELLY = [23, 24, 25, 26];
const LEGS = {
  nearFore: { pts: [[34, 52], [44, 52], [44, 62], [43, 68], [43.5, 77], [34, 78], [34, 74], [35, 66]], pivot: [39, 55], off: 0 },
  farFore: { pts: [[43, 54], [50, 55], [51, 66], [52, 77], [43, 78], [43, 72], [42, 63]], pivot: [47, 57], off: Math.PI },
  nearHind: { pts: [[90, 48], [106, 50], [104, 58], [101, 64], [100, 70], [102, 77], [94, 78], [93, 74], [93, 68], [91, 62], [88, 56]], pivot: [98, 53], off: Math.PI },
  farHind: { pts: [[82, 50], [92, 53], [91, 63], [90, 70], [92, 77], [83, 78], [84, 72], [83, 62]], pivot: [87, 54], off: 0 },
};
const EAR = [[26, 7], [35, 9], [38, 17], [35, 26], [29, 26], [25, 16]];
const rot = ([x, y], [cx, cy], a) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
const DARK = "#2A1608";

/** gx, gy = ground point under the middle of the dog; s = px per unit. walk = gait phase (radians) or null. */
export function drawDog3(g0, gx, gy, s, { phase = 0, shake = 0, sway = 0, walk = null, legs = true, alpha = 1, light = [0.8, -0.6], litOutline = "#FAE375", wet = 1, earLift = null, nod = 0 } = {}) {
  const g = alpha < 1 ? fade(g0, alpha) : g0, R = Math.round;
  const T = ([x, y]) => [gx + (x - 60) * s + sway * Math.max(0, Math.min(1, (60 - y) / 30)), gy + (y - 78) * s];
  const headA = 0.2 * shake * Math.sin(phase) + nod, neck = [38, 18];
  const opt = { light, litOutline, outline: DARK };
  const legPts = (L) => { const a = walk == null ? 0 : 0.32 * Math.sin(walk + L.off); return L.pts.map((p) => T(rot(p, L.pivot, a))); };
  if (legs) {
    drawPart(g, [smooth(legPts(LEGS.farFore), new Set([3, 4]))], { ...opt, base: 2.2, gain: 1.0, thick: 3 * s, litOutline: null });
    drawPart(g, [smooth(legPts(LEGS.farHind), new Set([4, 5]))], { ...opt, base: 2.2, gain: 1.0, thick: 3 * s, litOutline: null });
  }
  // tail
  { const L = [], Rr = [], wag = walk == null ? 0 : Math.sin(walk * 0.5) * 3;
    for (let k = 0; k <= 12; k++) { const u = k / 12, c = [108 + u * 16, 36 - u * 10 + (Math.sin(phase * 1.6 + u * 3) * 5 * shake + wag) * u], w = 3.3 - u * 2.2; L.push(T([c[0], c[1] - w])); Rr.unshift(T([c[0], c[1] + w])); }
    drawPart(g, [smooth([...L, ...Rr], new Set([12, 13]))], { ...opt, base: 3.4, gain: 1.0, thick: 3 * s }); }
  if (legs) {
    drawPart(g, [smooth(legPts(LEGS.nearHind), new Set([5, 6]))], { ...opt, base: 3.0, gain: 1.6, slope: 1.2, thick: 5 * s });
    drawPart(g, [smooth(legPts(LEGS.nearFore), new Set([4, 5]))], { ...opt, base: 3.0, gain: 1.4, slope: 1.2, thick: 4 * s });
  }
  const body = TORSO.map((p, i) => {
    let q = HEAD.has(i) ? rot(p, neck, headA) : p;
    if (BACK.includes(i)) q = [q[0], q[1] - shake * (2.2 + 1.6 * Math.sin(phase * 1.3 + q[0] * 0.16))];
    if (BELLY.includes(i)) q = [q[0], q[1] + shake * (1.5 + 1.4 * Math.sin(phase * 1.1 + q[0] * 0.2))];
    return T(q);
  });
  // wet fur clumps (shorter when the coat is drier)
  if (wet > 0) for (let i = 0; i < 12; i++) {
    const u = (i + 0.5 * Math.sin(i * 2.3)) / 11, top = i % 2 === 0, x = 50 + u * 52, yb = top ? 27.8 - shake * (2.2 + 1.6 * Math.sin(phase * 1.3 + x * 0.16)) : 54.8 + shake * (1.5 + 1.4 * Math.sin(phase * 1.1 + x * 0.2));
    const dir = top ? -1 : 1, len = (0.9 + 1.8 * Math.abs(Math.sin(phase + i * 1.7))) * Math.max(0.35, shake) * wet, w = 1.6 + Math.abs(Math.sin(i * 3.1)) * 1.2;
    drawPart(g, [[T([x - w, yb]), T([x + w, yb]), T([x + Math.sin(phase + i) * 1.4, yb + dir * len])]], { ...opt, base: top ? 4.6 : 3.2, gain: 0.4, thick: 2 * s, rimLit: 0.5, rimShade: 0.3 });
  }
  drawPart(g, [smooth(body, SHARP, 6)], { ...opt, base: 3.3, gain: 2.2, slope: 1.5, thick: 9 * s });
  const H = (p) => T(rot(p, neck, headA));
  { const a = H([5, 25.5]), b = H([11, 27.5]), c = H([16, 28]); g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), FUR[1]); g.line(R(b[0]), R(b[1]), R(c[0]), R(c[1]), FUR[2]); }
  drawPart(g, [smooth([[0.5, 17.5], [4, 16], [6.5, 18.5], [5.5, 22], [2, 22.5]].map(H))], { ramp: ["#120804", "#1A0E06", "#2A1A10", "#4A3A34"], base: 1.6, gain: 1.2, thick: 1.5 * s, outline: "#0A0402", light });
  { const [x, y] = H([21, 11]), r = Math.max(1, R(1.5 * s)); g.disc(R(x), R(y), r + 1, DARK); g.disc(R(x), R(y), r, "#1A0E06"); g.px(R(x - r / 2), R(y - r / 2), "#FDFEED"); }
  { const a = H([18, 8.5]), b = H([24, 7.5]); g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), FUR[6]); }
  if (s >= 2.5) {
    drawPart(g, [smooth([[4, 26], [10, 27.5], [16, 29], [18, 31.5], [12, 32], [6, 30]].map(H))], { ...opt, base: 2.6, gain: 0.8, thick: 2 * s, rimLit: 0.4 });
    { const [x, y] = H([22, 11.6]); g.tint(R(x - 4 * s), R(y - 3 * s), R(8 * s), R(6 * s), (px, py) => Math.max(0, 0.35 - Math.hypot(px - x, (py - y) * 1.2) / (4 * s)), FUR[1], 3); }
    { const [x, y] = H([3, 16.8]); g.rect(R(x), R(y), Math.max(1, R(s * 0.8)), 1, "#6E5A50"); }
  }
  { const lift = earLift ?? -1.15 * shake * (0.75 + 0.25 * Math.sin(phase * 2)), base = [30, 9];
    drawPart(g, [smooth(EAR.map((p) => H(rot(p, base, lift))))], { ...opt, base: 2.4, gain: 1.4, thick: 4 * s }); }
  return { T, H, body };
}
/** Screen point of a body landmark for overlays (spine, back, droplet on the fur). */
export function dogPoint(gx, gy, s, p, sway = 0) { return [gx + (p[0] - 60) * s + sway * Math.max(0, Math.min(1, (60 - p[1]) / 30)), gy + (p[1] - 78) * s]; }
