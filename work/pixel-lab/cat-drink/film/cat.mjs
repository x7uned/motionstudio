// Side-view tabby cat crouched over a bowl, facing right, lapping. Local units: ground at y = 60, nose near x = 100.
// gx, gy = screen point of local (50, 60); s = px per local unit. Shading via the shared pixel shading engine.
import { fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth, drawPart } from "../../dog/shade.mjs";

export const CAT = ["#2A1206", "#5A2A10", "#8A4418", "#B8642A", "#D9873E", "#EDA95A", "#F6C982", "#FCE6BC"];
const CREAM = ["#3A2414", "#7A5A3A", "#B8946A", "#DCC096", "#EEDDB8", "#F8EED6", "#FDF7EA", "#FFFFFF"];
const PINK = ["#3A0A18", "#6A1A30", "#9A2E48", "#C84A62", "#E26E80", "#F29AA6", "#FAC6CC", "#FDE8EA"];
const DARK = "#24100A", MOON = "#E0CDF8";
export const TONGUE_RAMP = PINK, CAT_RAMP = CAT, CREAM_RAMP = CREAM;

const TORSO = [[20, 30], [28, 23], [40, 20], [52, 20], [62, 22], [70, 26], [75, 31], [78, 39], [74, 46], [66, 51], [52, 54], [38, 55], [26, 54], [18, 49], [15, 42], [16, 35]];
const HEAD = [[73, 30], [79, 25.5], [87, 25], [93.5, 29], [97.5, 35], [100, 41], [98.5, 45.5], [93, 47.5], [85, 47], [78, 43.5], [73.5, 37.5]];
const EAR_N = [[79, 27], [82, 17.5], [88, 25.5]], EAR_F = [[86, 27], [91.5, 19.5], [93, 29]];
const HAUNCH = [[15, 41], [21, 32], [33, 30], [42, 35], [45, 45], [42, 53], [46, 56], [48, 60], [30, 60], [20, 58], [14, 51]];
const FORE_F = [[66, 40], [72, 39], [79, 55], [84, 57.5], [84, 60], [74, 60], [71, 53]];
const FORE_N = [[61, 38], [68, 37], [75, 55], [80, 57.5], [80, 60], [70, 60], [66, 52]];
const MUZZLE = [[92, 38], [97.5, 36.5], [100, 41], [98.5, 45.5], [93, 46.5], [90.5, 42.5]];
const CHEST = [[71, 33], [76.5, 34], [77.5, 41], [73, 47], [69, 45], [69, 38]];

/** Lap cycle at phase p ∈ [0,1): tongue reach 0..1, jaw gap 0..1, water column 0..1 (rides up with the tongue). */
export function lapState(p) {
  const sm = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const reach = sm(0.02, 0.3, p) * (1 - sm(0.45, 0.78, p));
  const jaw = sm(0.0, 0.18, p) * (1 - sm(0.76, 0.92, p));
  const column = sm(0.42, 0.5, p) * (1 - sm(0.74, 0.84, p));
  return { reach, jaw, column, touch: sm(0.26, 0.32, p) * (1 - sm(0.44, 0.5, p)), bob: Math.sin(2 * Math.PI * p) };
}

/** Draws the cat; returns T(local)→screen and the mouth/tongue anchors for overlays. */
export function drawCat(g0, gx, gy, s, { p = 0, alpha = 1, waterY = null } = {}) {
  const g = alpha < 1 ? fade(g0, alpha) : g0, R = Math.round, st = lapState(p);
  const T = ([x, y]) => [gx + (x - 50) * s, gy + (y - 60) * s];
  const headDy = -0.35 * st.bob - 0.25 * st.reach;
  const H = ([x, y]) => T([86 + (x - 86) * 1.14, 38 + (y - 38) * 1.14 + headDy]);
  const opt = { light: [-0.7, -0.75], litOutline: MOON, outline: DARK };
  // far front leg, far ear first (behind)
  drawPart(g, [smooth(FORE_F.map(T), new Set([3, 4]))], { ...opt, ramp: CAT, base: 2.0, gain: 0.9, thick: 3 * s, litOutline: null });
  // tail on the floor, curling round in front of the paws (drawn later); base part behind the haunch
  drawPart(g, [smooth(TORSO.map(T), new Set(), 6)], { ...opt, ramp: CAT, base: 3.3, gain: 2.0, slope: 1.4, thick: 9 * s });
  // tabby stripes across the back
  for (const [x, w] of [[29, 5], [36, 6], [43, 6], [50, 6], [57, 5], [64, 4]]) {
    const a = T([x, 20.6 + Math.abs(x - 46) * 0.05]), b = T([x - 1.5, 20.6 + w + 1]);
    for (let k = 0; k < Math.max(1, R(s * 0.9)); k++) g.line(R(a[0] + k), R(a[1]), R(b[0] + k), R(b[1]), CAT[2]);
  }
  drawPart(g, [smooth(CHEST.map(T))], { ...opt, ramp: CREAM, base: 3.6, gain: 1.0, thick: 3 * s, litOutline: null, outline: CAT[2] });
  drawPart(g, [smooth(FORE_N.map(T), new Set([3, 4]))], { ...opt, ramp: CAT, base: 3.0, gain: 1.3, slope: 1.0, thick: 3.5 * s });
  drawPart(g, [smooth(HAUNCH.map(T), new Set([6, 7]))], { ...opt, ramp: CAT, base: 3.2, gain: 1.8, slope: 1.2, thick: 7 * s });
  for (const [x0, y0, x1, y1] of [[24, 36, 28, 44], [31, 33.5, 35, 41]]) { const a = T([x0, y0]), b = T([x1, y1]); for (let k = 0; k < Math.max(1, R(s * 0.9)); k++) g.line(R(a[0] + k), R(a[1]), R(b[0] + k), R(b[1]), CAT[2]); }
  // tail: from the rump round the front of the hind paw
  { const C = [[17, 47], [9, 52], [7, 57.5], [14, 59.2], [26, 59.4], [38, 59.2], [50, 58.6], [58, 57.4]], L = [], Rr = [];
    for (let i = 0; i < C.length; i++) { const [x, y] = C[i], [nx, ny] = C[Math.min(C.length - 1, i + 1)], [px, py] = C[Math.max(0, i - 1)], dx = nx - px, dy = ny - py, d = Math.hypot(dx, dy) || 1, w = 3.1 - 1.6 * (i / (C.length - 1)); L.push(T([x - (dy / d) * w, y + (dx / d) * w])); Rr.unshift(T([x + (dy / d) * w, y - (dx / d) * w])); }
    drawPart(g, [smooth([...L, ...Rr], new Set([C.length - 1, C.length]))], { ...opt, ramp: CAT, base: 3.4, gain: 1.0, thick: 2.5 * s });
    for (const i of [2, 4, 6]) { const a = T([C[i][0], C[i][1] - 2.6]), b = T([C[i][0] + 0.6, C[i][1] + 2.4]); for (let k = 0; k < Math.max(1, R(s * 0.9)); k++) g.line(R(a[0] + k), R(a[1]), R(b[0] + k), R(b[1]), CAT[2]); } }
  // head
  drawPart(g, [smooth(EAR_F.map(H), new Set([1]))], { ...opt, ramp: CAT, base: 2.2, gain: 0.8, thick: 2 * s, litOutline: null });
  drawPart(g, [smooth(HEAD.map(H), new Set(), 6)], { ...opt, ramp: CAT, base: 3.4, gain: 2.0, slope: 1.2, thick: 7 * s });
  drawPart(g, [smooth(MUZZLE.map(H))], { ...opt, ramp: CREAM, base: 3.8, gain: 0.8, thick: 2.5 * s, litOutline: null, outline: CAT[3] });
  drawPart(g, [smooth(EAR_N.map(H), new Set([1]))], { ...opt, ramp: CAT, base: 3.2, gain: 1.2, thick: 2.5 * s });
  { const [a, b, c] = [H([81, 26]), H([82.6, 20.5]), H([86, 26])]; g.poly([a, b, c], PINK[3]); }
  // forehead "M", half-closed eye, nose, whiskers
  for (const [x0, y0, x1, y1] of [[84, 27.5, 85, 31], [87, 26.8, 87.6, 30.5], [90, 27.2, 89.8, 30.6]]) { const a = H([x0, y0]), b = H([x1, y1]); g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), CAT[2]); }
  { const a = H([88.6, 35.2]), b = H([93, 36.2]); for (let k = 0; k < Math.max(1, R(s * 0.6)); k++) g.line(R(a[0]), R(a[1] + k), R(b[0]), R(b[1] + k), DARK); }
  { const [x, y] = H([99.2, 40.4]); g.disc(R(x), R(y), Math.max(1, R(0.9 * s)), PINK[2]); }
  for (const dy of [-1.2, 0.4, 2]) { const a = H([95.5, 42 + dy * 0.6]), b = H([104 + Math.abs(dy), 41 + dy * 1.6]); g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#FDFEED"); }
  // jaw and tongue: the lower jaw drops a little each lap; the tongue reaches down to the water and the column rides up
  const mouth = H([97.6, 46.2]), jawGap = st.jaw * 1.4 * s;
  { const a = H([91.5, 47.6]), b = H([97.8, 46.4]); g.line(R(a[0]), R(a[1] + jawGap), R(b[0]), R(b[1] + jawGap), DARK); if (jawGap >= 1) g.rect(R(Math.min(a[0], b[0]) + 2), R(b[1]), R(Math.abs(b[0] - a[0]) - 2), R(jawGap), PINK[1]); }
  const wy = waterY ?? (mouth[1] + 6 * s), tipY = mouth[1] + (wy - mouth[1]) * st.reach;
  if (st.reach > 0.04) { const w = Math.max(2, R(1.6 * s)), x = R(mouth[0] - w / 2); g.rect(x, R(mouth[1] + jawGap * 0.5), w, Math.max(1, R(tipY - mouth[1] - jawGap * 0.5)), PINK[4]); g.rect(x, R(tipY) - 1, w + Math.max(1, R(s * 0.5)), 2, PINK[3]); g.px(x, R(mouth[1] + jawGap), PINK[6]); }
  if (st.column > 0.04) { const top = mouth[1] + (wy - mouth[1]) * (1 - 0.85 * st.column), w = Math.max(1, R(1.1 * s)); g.rect(R(mouth[0] - w / 2), R(top), w, Math.max(1, R(wy - top)), "#A9C4FF"); g.px(R(mouth[0]), R(top), "#FDFEED"); }
  return { T, H, mouth, st };
}

/** Flat silhouette of the cat for its shadow on the wall (same pose, lapping bob). */
export function catSilhouette(T, bob = 0) {
  const H = ([x, y]) => T([86 + (x - 86) * 1.14, 38 + (y - 38) * 1.14 - 0.4 * bob]);
  return [smooth(TORSO.map(T), new Set(), 4), smooth(HAUNCH.map(T), new Set([6, 7]), 3), smooth(FORE_N.map(T), new Set([3, 4]), 3), smooth(FORE_F.map(T), new Set([3, 4]), 3), smooth(HEAD.map(H), new Set(), 4), EAR_N.map(H), EAR_F.map(H),
    [[17, 46], [8, 52], [6, 58], [16, 60], [40, 60], [40, 57.5], [17, 57.5], [11, 55], [13, 51], [19, 49]].map(T)];
}
