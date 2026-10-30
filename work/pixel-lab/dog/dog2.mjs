// Side-view Labrador v2: smooth anatomical outline + volume shading (shade.mjs). Facing left; units 120×78, ground y=78.
import { fade } from "../../../renderer/pixel/raster.mjs";
import { smooth, drawPart, FUR } from "./shade.mjs";

const BODY = [[2, 18], [3, 15], [9, 13.6], [14.5, 12.6], [17.5, 8.6], [22, 6], [29, 5], [35, 8], [38, 13], [42, 20], [47, 25],
  [56, 27], [68, 27], [80, 27], [92, 28], [100, 30], [106, 33], [110, 38], [110, 45], [107, 52],
  [104, 58], [101, 64], [100, 70], [102, 77], [94, 78], [93, 74], [93, 68], [91, 62], [88, 57],
  [80, 53], [68, 54], [56, 55], [46, 56], [43, 60], [42, 68], [43, 77], [34, 78], [34, 74], [35, 66], [34, 58],
  [31, 52], [29, 46], [27, 40], [24, 35], [19, 31], [14, 30], [8, 29], [4, 27], [2, 24], [1, 21]];
const SHARP = new Set([0, 3, 4, 23, 24, 35, 36, 49]);
const HEAD = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 44, 45, 46, 47, 48, 49]);
const BACK = [11, 12, 13, 14, 15, 16], BELLY = [29, 30, 31, 32];
const FAR_FORE = [[43, 58], [50, 58], [51, 68], [52, 77], [43, 78], [43, 72], [42, 64]];
const FAR_HIND = [[84, 55], [92, 58], [91, 64], [90, 70], [92, 77], [83, 78], [84, 72], [83, 64]];
const EAR = [[26, 7], [35, 9], [38, 17], [35, 26], [29, 26], [25, 16]];
const rot = ([x, y], [cx, cy], a) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
const DARK = "#2A1608";

export function drawDog2(g0, gx, gy, s, { phase = 0, shake = 1, sway = 0, legs = true, alpha = 1, light = [-0.6, -0.8], litOutline = null } = {}) {
  const g = alpha < 1 ? fade(g0, alpha) : g0, R = Math.round;
  const T = ([x, y]) => [gx + (x - 60) * s + sway * Math.max(0, Math.min(1, (62 - y) / 28)), gy + (y - 78) * s];
  const headA = 0.22 * shake * Math.sin(phase), neck = [38, 18];
  const opt = { light, litOutline, thick: 9 * s, outline: DARK };
  // far legs
  if (legs) for (const leg of [FAR_FORE, FAR_HIND]) drawPart(g, [smooth(leg.map(T), new Set([3, 4]))], { ...opt, base: 2.0, gain: 1.2, thick: 3 * s });
  // tail as a tapered tube along a whipping curve
  { const L = [], Rr = [];
    for (let k = 0; k <= 12; k++) { const u = k / 12, c = [108 + u * 16, 36 - u * 10 + Math.sin(phase * 1.6 + u * 3) * 5 * u * shake], w = 3.3 - u * 2.2; L.push(T([c[0], c[1] - w])); Rr.unshift(T([c[0], c[1] + w])); }
    drawPart(g, [smooth([...L, ...Rr], new Set([12, 13]))], { ...opt, base: 3.4, gain: 1.0, thick: 3 * s }); }
  // body with head and near legs
  const body = BODY.map((p, i) => {
    let q = HEAD.has(i) ? rot(p, neck, headA) : p;
    if (BACK.includes(i)) q = [q[0], q[1] - shake * (2.2 + 1.6 * Math.sin(phase * 1.3 + q[0] * 0.16))];
    if (BELLY.includes(i)) q = [q[0], q[1] + shake * (1.5 + 1.4 * Math.sin(phase * 1.1 + q[0] * 0.2))];
    return T(q);
  });
  // wet fur clumps first, so the body outline sits over their bases
  for (let i = 0; i < 12; i++) {
    const u = (i + 0.5 * Math.sin(i * 2.3)) / 11, top = i % 2 === 0, x = 50 + u * 52, yb = top ? 27.8 - shake * (2.2 + 1.6 * Math.sin(phase * 1.3 + x * 0.16)) : 54.8 + shake * (1.5 + 1.4 * Math.sin(phase * 1.1 + x * 0.2));
    const dir = top ? -1 : 1, len = (0.9 + 1.8 * Math.abs(Math.sin(phase + i * 1.7))) * shake, w = 1.6 + Math.abs(Math.sin(i * 3.1)) * 1.2;
    const tri = [T([x - w, yb]), T([x + w, yb]), T([x + Math.sin(phase + i) * 1.4, yb + dir * len])];
    drawPart(g, [tri], { ...opt, base: top ? 4.6 : 3.2, gain: 0.4, thick: 2 * s, rimLit: 0.5, rimShade: 0.3 });
  }
  drawPart(g, [smooth(body, SHARP, 6)], { ...opt, base: 3.3, gain: 2.2, slope: 1.5 });
  const H = (p) => T(rot(p, neck, headA));
  // muzzle shading + mouth, nose, eye, brow
  { const a = H([5, 25.5]), b = H([11, 27.5]), c = H([16, 28]); g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), FUR[1]); g.line(R(b[0]), R(b[1]), R(c[0]), R(c[1]), FUR[2]); }
  drawPart(g, [smooth([[0.5, 17.5], [4, 16], [6.5, 18.5], [5.5, 22], [2, 22.5]].map(H))], { ramp: ["#120804", "#1A0E06", "#2A1A10", "#4A3A34"], base: 1.6, gain: 1.2, thick: 1.5 * s, outline: "#0A0402", light });
  { const [x, y] = H([21, 11]), r = Math.max(1, R(1.5 * s)); g.disc(R(x), R(y), r + 1, DARK); g.disc(R(x), R(y), r, "#1A0E06"); g.px(R(x - r / 2), R(y - r / 2), "#FDFEED"); }
  { const a = H([18, 8.5]), b = H([24, 7.5]); g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), FUR[6]); }
  // close-up details: flews (hanging lips), eye socket, brow, nostril, cheek
  if (s >= 2.5) {
    drawPart(g, [smooth([[4, 26], [10, 27.5], [16, 29], [18, 31.5], [12, 32], [6, 30]].map(H))], { ...opt, base: 2.6, gain: 0.8, thick: 2 * s, rimLit: 0.4 });
    { const [x, y] = H([22, 11.6]); g.tint(Math.round(x - 4 * s), Math.round(y - 3 * s), Math.round(8 * s), Math.round(6 * s), (px, py) => Math.max(0, 0.35 - Math.hypot(px - x, (py - y) * 1.2) / (4 * s)), FUR[1], 3); }
    { const [x, y] = H([3, 16.8]); g.rect(Math.round(x), Math.round(y), Math.max(1, Math.round(s * 0.8)), 1, "#6E5A50"); const [nx, ny] = H([2.2, 20.5]); g.rect(Math.round(nx), Math.round(ny), Math.max(1, Math.round(s * 0.7)), Math.max(1, Math.round(s * 0.7)), "#000000"); }
    { const [x, y] = H([24, 20]); g.tint(Math.round(x - 7 * s), Math.round(y - 5 * s), Math.round(14 * s), Math.round(10 * s), (px, py) => Math.max(0, 0.18 - Math.hypot(px - x, py - y) / (8 * s)), FUR[6], 3); }
  }
  // ear lifted by the shake
  { const lift = -1.15 * shake * (0.75 + 0.25 * Math.sin(phase * 2)), base = [30, 9];
    drawPart(g, [smooth(EAR.map((p) => H(rot(p, base, lift))))], { ...opt, base: 2.4, gain: 1.4, thick: 4 * s }); }
}
