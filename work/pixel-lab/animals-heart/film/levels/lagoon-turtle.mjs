// The cute green sea turtle of LV3 (heart film), seen from the front, asleep: olive-gold shell dome with radiating
// streaks and pale-rimmed scutes, a chubby sea-green head with pale scale pattern, closed sleepy eyes, blush, a tiny
// smile, long front flippers resting on the sand. Shell, head and flippers are cached sprites; the face is per frame.
import { blob, ell, tube, bez, blush, smooth, fade, mix, bayer, rnd } from "../cute.mjs";
import { Sprite, blitSprite } from "./whale-art.mjs";

const R = Math.round;
export const SHELL = ["#1C1608", "#36300E", "#504816", "#6C6220", "#8A7E2C", "#A89A3E", "#C6B65A", "#E2D688"];
export const SKIN = ["#10221A", "#1A3626", "#264E34", "#356842", "#478254", "#5E9C66", "#7CB880", "#A8D4A0"];
const PALE = "#D8E8B0", STREAK = "#E8C86A", RIM = "#B8D8A0";

let SH = null, HD = null, FL = new Map();
/** Shell dome sprite: anchor = middle of the front rim. */
function shell() {
  if (SH) return SH;
  const S = new Sprite(300, 140, 150, 112), g = S.c, T = (x, y) => [x + 150, y + 112];
  const dome = []; for (let i = 0; i <= 40; i++) { const a = Math.PI + (i / 40) * Math.PI, x = Math.cos(a) * 126, y = Math.sin(a) * 110 * (1 - 0.1 * Math.cos(a) ** 2); dome.push(T(x, y)); }
  dome.push(T(124, 8), T(80, 14), T(40, 10), T(0, 6), T(-40, 10), T(-80, 14), T(-124, 8));
  blob(g, [dome], { ramp: SHELL, thick: 40, base: 2.9, gain: 3.0, slope: 0.5, outline: "#120E06", litOutline: SHELL[6] });
  // scutes: marginal band along the rim, pleurals and the vertebral row (foreshortened), with dark seams and pale rims
  const inDome = (x, y) => S.m[R(y + 112) * 300 + R(x + 150)] === 1;
  const seam = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, R(Math.hypot(bx - ax, by - ay))); for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n; if (inDome(x, y)) { g.px(R(x + 150), R(y + 112), SHELL[0]); g.px(R(x + 151), R(y + 112), SHELL[2]); if (inDome(x, y - 1)) g.px(R(x + 150), R(y + 111), SHELL[7]); } } } };
  const ringPt = (a, k) => [Math.cos(a) * 126 * k, Math.sin(a) * 110 * k * (1 - 0.1 * Math.cos(a) ** 2)];
  const band = []; for (let i = 0; i <= 40; i++) band.push(ringPt(Math.PI + (i / 40) * Math.PI, 0.86)); seam(band);
  for (let i = 1; i < 14; i++) { const a = Math.PI + (i / 14) * Math.PI; seam([ringPt(a, 0.86), ringPt(a, 1.0)]); }
  const vert = [[-26, -6], [-30, -40], [-18, -70], [18, -70], [30, -40], [26, -6]]; seam([...vert, vert[0]]);
  seam([[-18, -70], [-14, -86]]); seam([[18, -70], [14, -86]]); seam([[-30, -40], [-84, -50]]); seam([[30, -40], [84, -50]]); seam([[-26, -6], [-90, -2]]); seam([[26, -6], [90, -2]]);
  seam([[-84, -50], [-104, -38]]); seam([[84, -50], [104, -38]]);
  // golden streaks radiating inside the scutes (green-turtle pattern)
  for (const [cx, cy, n] of [[0, -40, 9], [-58, -28, 8], [58, -28, 8], [-50, -72, 6], [50, -72, 6], [0, -84, 5]]) for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(cx * 3 + k) * 0.4, L = 7 + rnd(cy * 5 + k) * 9;
    for (let s = 2; s < L; s++) { const x = cx + Math.cos(a) * s, y = cy + Math.sin(a) * s * 0.8; if (inDome(x, y) && bayer(R(x), R(y)) < 0.7) g.px(R(x + 150), R(y + 112), s < L * 0.6 ? STREAK : SHELL[5]); }
  }
  // each scute bulges a little: lighter toward its upper-left, darker toward its seams
  for (const [cx, cy, rx, ry] of [[0, -40, 24, 26], [-58, -26, 26, 20], [58, -26, 26, 20], [-46, -70, 22, 14], [46, -70, 22, 14], [0, -84, 14, 10], [-96, -20, 10, 14], [96, -20, 10, 14]]) for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    const d = (x / rx) ** 2 + (y / ry) ** 2; if (d > 1 || !inDome(cx + x, cy + y)) continue; const X = R(cx + x + 150), Y = R(cy + y + 112), i = (Y * 300 + X) * 3;
    const lit = (x + y * 1.3) / (rx + ry) < -0.25 && d < 0.6, k = lit ? 0.22 : d > 0.75 ? -0.18 : 0; if (!k || bayer(X, Y) > 0.75) continue;
    const t = k > 0 ? [240, 230, 160] : [20, 16, 6], a = Math.abs(k); g.d[i] += (t[0] - g.d[i]) * a; g.d[i + 1] += (t[1] - g.d[i + 1]) * a; g.d[i + 2] += (t[2] - g.d[i + 2]) * a;
  }
  // lighter marginal scutes along the rim
  for (let i = 0; i <= 80; i++) { const a = Math.PI + (i / 80) * Math.PI; for (let k = 0.88; k < 0.985; k += 0.02) { const [x, y] = ringPt(a, k); if (inDome(x, y) && bayer(R(x), R(y)) < 0.45) g.px(R(x + 150), R(y + 112), SHELL[6]); } }
  return SH = S;
}
/** Head + neck + plastron edge sprite: anchor = head centre. */
function head() {
  if (HD) return HD;
  const S = new Sprite(160, 130, 80, 58), g = S.c, T = (pts) => pts.map(([x, y]) => [x + 80, y + 58]);
  blob(g, [T(ell(0, 46, 56, 16))], { ramp: ["#4A3A18", "#7A6428", "#A88E40", "#CCB060", "#E4CC80", "#F2E0A0", "#FAEEC4", "#FFF8E0"], thick: 8, base: 4.2, gain: 1.6, outline: "#2A2010" });   // plastron edge
  blob(g, [T(ell(0, 34, 32, 20))], { ramp: SKIN, thick: 12, base: 3.0, gain: 2.0, outline: SKIN[0] });                                                                                    // neck
  blob(g, [T(ell(0, 0, 48, 40)), T(ell(0, 16, 42, 28))], { ramp: SKIN, thick: 26, base: 3.0, gain: 2.6, slope: 0.6, outline: SKIN[0], litOutline: SKIN[7] });                           // head
  // pale-edged head scales on the top of the head and on the cheeks
  const inH = (x, y) => S.m[R(y + 58) * 160 + R(x + 80)] === 1;
  const seg = (ax, ay, bx, by) => { const n = Math.max(1, R(Math.hypot(bx - ax, by - ay))); for (let k = 0; k <= n; k++) { const x = R(ax + ((bx - ax) * k) / n), y = R(ay + ((by - ay) * k) / n); if (inH(x, y)) g.px(x + 80, y + 58, PALE); } };
  for (const p of [[[-14, -36], [-5, -24], [5, -24], [14, -36]], [[-5, -24], [-7, -12]], [[5, -24], [7, -12]], [[-14, -36], [-30, -24], [-28, -10]], [[14, -36], [30, -24], [28, -10]], [[-30, -24], [-42, -12]], [[30, -24], [42, -12]]]) for (let i = 0; i < p.length - 1; i++) seg(p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]);
  for (const [x, y] of [[-36, 16], [36, 16], [-39, 3], [39, 3], [-26, 32], [26, 32]]) { g.px(x + 80, y + 58, PALE); g.px(x + 81, y + 58, RIM); }
  // nostrils and the little beak smile
  g.px(76, 60, SKIN[0]); g.px(84, 60, SKIN[0]);
  for (let x = -8; x <= 8; x++) { const y = R(2.4 * (1 - (x / 8) ** 2)); g.px(80 + x, 58 + 26 + y, SKIN[0]); }
  g.px(71, 83, SKIN[0]); g.px(89, 83, SKIN[0]);
  return HD = S;
}
/** Front flipper sprite (side ±1): a long paddle with pale scale lines; anchor = its root under the shell. */
function flipper(side) {
  let S = FL.get(side); if (S) return S;
  S = new Sprite(240, 100, 120, 30);
  const P = (x, y) => [120 + x * side, 30 + y];
  const path = [P(0, 0), P(36, 10), P(72, 20), P(102, 30), P(122, 38)];
  blob(S.c, [tube(path, 17, 6)], { ramp: SKIN, thick: 9, base: 3.2, gain: 2.0, outline: SKIN[0], litOutline: SKIN[6] });
  for (let k = 1; k < 6; k++) { const [x, y] = P(14 + k * 18, 4 + k * 5.2); for (let j = -8; j <= 8; j += 1) { const X = R(x + j * 0.3 * side), Y = R(y + j); if (S.m[Y * 240 + X] && Math.abs(j) < 9 - k * 0.6) S.c.px(X, Y, PALE); } }
  FL.set(side, S); return S;
}

/**
 * Draw the sleeping turtle; (x, y) = screen point of the middle of the shell's front rim. o.breath 0..1 lifts shell+head,
 * o.haze/o.hazeCol water veil, o.lids 0..1 (1 = shut), o.a dissolve.
 */
export function drawTurtle(c, x, y, o = {}) {
  const a = o.a ?? 1, br = R((o.breath ?? 0) * 2.5), sub = { a, haze: o.haze ?? 0, hazeCol: o.hazeCol };
  for (const sd of [-1, 1]) blitSprite(c, flipper(sd), x + sd * 66, y + 10, sub);
  blitSprite(c, shell(), x, y - br, sub);
  blitSprite(c, head(), x, y + 24 - br, sub);
  // sleepy closed eyes: soft downward arcs with two tiny lashes, blush under them
  const g = fade(c, a), hy = y + 24 - br;
  for (const sd of [-1, 1]) {
    const ex = x + sd * 20, ey = hy - 2;
    for (let k = -8; k <= 8; k++) { const yy = R(ey + 3.4 * (1 - (k / 8) ** 2)); g.px(R(ex + k), yy, "#0E1A12"); g.px(R(ex + k), yy + 1, Math.abs(k) < 7 ? "#0E1A12" : SKIN[3]); if (Math.abs(k) < 7) g.px(R(ex + k), yy - 1, SKIN[5]); }
    g.px(R(ex + sd * 8) + sd, R(ey) - 1, "#0E1A12"); g.px(R(ex + sd * 9) + sd, R(ey) - 2, "#0E1A12");
    blush(c, ex + sd * 10, ey + 13, 9, 3.4, "#F27A9A", a);
  }
}
