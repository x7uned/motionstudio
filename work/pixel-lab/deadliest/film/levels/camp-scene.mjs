// LV8 · night camp scenery, in rest-screen coordinates (see camp-kit S/WX/WY): the moonlit clearing at the jungle's edge.
// Static parts are painted once into two masked layers (back: far tree lines, the jungle-edge tree, the right tree with
// the sign branch, the tent, the reeds of the marsh, the ground plane with grass, the still puddle; front: tall grass
// along the bottom, corner leaves, a few reeds in front of the puddle). Live parts are drawn per frame: the campfire
// (flames, embers, sparks, smoke) and its flickering warm light, the tent lamp, the LV 8 neon sign, fireflies, the
// puddle's glints, a tiny mosquito swarm above the reeds. Nothing pops: every live element moves or fades continuously.
import { mix, bayer, hex } from "../../../../../renderer/pixel/raster.mjs";
import { blob, flat, ell, tube, bez, fade, sm, rnd, lerp, clamp01, MAIN, smooth } from "../cute.mjs";
import { Layer, S, OX, OY } from "./camp-kit.mjs";
import { flicker } from "./camp-hero.mjs";
import { MQ } from "./camp-time.mjs";

const R = Math.round;
export const GROUND = 640;                 // the land line (LAND) in rest-screen rows
export const FIRE = { x: 100, y: 642 };    // campfire centre at the ground
export const SIGN = { x: 424, y: 486 };    // LV 8 neon sign: bottom-centre of the board (hangs from the branch)
export const PUDDLE = { x0: 352, x1: 600, y0: 651, y1: 690 };
export const REEDS = [492, 600];   // where the hero mosquito lives (in the reeds over the puddle)

// ---------------------------------------------------------------- palettes (night)
const LEAF = ["#04070C", "#08101A", "#0D1824", "#13212E", "#1A2C3A", "#233A48", "#2F4C58", "#3E6068"];
const LEAF2 = ["#05080A", "#0A1414", "#0F1D1C", "#152824", "#1C342E", "#24423A", "#2E5246", "#3C6656"];
const BARK = ["#06050A", "#0D0B14", "#14111E", "#1C1828", "#262034", "#302942", "#3C3452", "#4C4466"];
const TENT = ["#1C0A0E", "#340F14", "#561A1A", "#7E2A20", "#A63E26", "#CC5A30", "#E8823E", "#F8AE5C"];
const STONE = ["#0A0A12", "#16141E", "#22202C", "#302C3A", "#40384A", "#56485A", "#74606A", "#9A7C7A"];
const LOG = ["#120806", "#22120A", "#341C10", "#4A2A16", "#62381E", "#7C4A28", "#9A6036", "#B87A4A"];
const REED = ["#06090A", "#0C1412", "#121E1A", "#182822", "#1F342A", "#284234", "#33523E", "#42644A"];
const CATT = ["#120806", "#241008", "#38180C", "#4E2410", "#663218", "#7E4222", "#98582E", "#B4703E"];
const MOONRIM = "#7C86B8", WARMRIM = "#E09A58";

// ---------------------------------------------------------------- the static layers
const LX0 = -40, LW = 860;                 // layer covers rest-screen x −40..820 (world 3740..4600), y 0..960
function offset(L) { const g = Object.create(L.g); g.px = (x, y, col) => L.g.px(x - LX0, y, col); g.get = (x, y) => L.g.get(x - LX0, y); g.has = (x, y) => { x = Math.floor(x - LX0); y = Math.floor(y); return x >= 0 && y >= 0 && x < L.w && y < L.h && L.m[y * L.w + x] === 1; }; return g; }

/** Rounded crown silhouette row (far tree lines): heights from a smooth noise. */
function treeline(g, y0, col, rimCol, seed, hmin, hmax, step, x0 = LX0, x1 = LX0 + LW, calm = null) {
  const H = (x) => { let h = 0; for (let k = 1; k <= 3; k++) h += Math.sin(x * 0.013 * k * (1 + rnd(seed + k) * 0.6) + rnd(seed * 7 + k) * 6) / k; return hmin + (hmax - hmin) * (0.5 + 0.35 * h); };
  const tops = [];
  for (let x = x0; x < x1; x++) {
    let h = H(x); if (calm) h *= calm(x); h *= sm(x, x0, x0 + 40);
    // bumpy crowns: half-circles every `step` px
    const cx = Math.round(x / step) * step, b = Math.sqrt(Math.max(0, 1 - ((x - cx) / (step * 0.62)) ** 2)) * step * 0.35 * (0.7 + 0.6 * rnd(cx * 3 + seed)) * sm(x, x0, x0 + 40);
    tops.push(R(y0 - h - b));
  }
  for (let i = 0; i < tops.length; i++) { const x = x0 + i, top = tops[i]; for (let y = top; y <= y0; y++) g.px(x, y, col); if (rimCol && (i === 0 || tops[i - 1] > top || tops[i + 1] > top || true)) g.px(x, top, rimCol); }
}
/** Pointed conifer silhouette. */
function conifer(g, x, y, h, w, col, rim) {
  for (let j = 0; j < h; j++) { const q = j / h, tier = (j % R(h / 5 + 1)) / (h / 5 + 1), half = R(w * q * (0.75 + 0.35 * tier)); g.rect(x - half, y - h + j, half * 2 + 1, 1, col); if (rim) g.px(x + half, y - h + j, rim); }
  g.rect(x - 1, y - 2, 3, 3, col);
}
/** A foliage clump: shaded blob made of overlapping round lobes. */
function clump(g, x, y, rx, ry, seed, ramp, light, rim) {
  const polys = []; const n = 7 + R(rnd(seed) * 4);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rnd(seed + i) * 0.6, d = 0.55 + rnd(seed * 3 + i) * 0.3; polys.push(ell(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, rx * (0.38 + rnd(seed + i * 5) * 0.2), ry * (0.38 + rnd(seed + i * 9) * 0.2))); }
  polys.push(ell(x, y, rx * 0.7, ry * 0.7));
  blob(g, polys, { ramp, base: 2.2, gain: 1.6, slope: 0.6, thick: Math.min(rx, ry) * 0.7, light, litOutline: rim, rimLit: 0.9 });
}
/** Long jungle leaf (pointed, with a midrib), along angle ang from (x, y). */
function frond(g, x, y, len, wid, ang, ramp, rim, droop = 0.25) {
  const pts = [], n = 18;
  for (let i = 0; i <= n; i++) { const u = i / n, a = ang + droop * u * u * Math.sign(Math.cos(ang) || 1), px = x + Math.cos(ang) * len * u + Math.cos(a) * 0, py = y + Math.sin(ang) * len * u + droop * len * u * u * 0.6; pts.push([px, py, Math.sin(Math.PI * Math.min(1, u * 1.15)) * wid]); }
  const L = [], Rr = [];
  for (let i = 0; i <= n; i++) { const p = pts[i], q = pts[Math.min(n, i + 1)], o = pts[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], d = Math.hypot(dx, dy) || 1; L.push([p[0] - (dy / d) * p[2], p[1] + (dx / d) * p[2]]); Rr.push([p[0] + (dy / d) * p[2], p[1] - (dx / d) * p[2]]); }
  blob(g, [[...L, ...Rr.reverse()]], { ramp, base: 2.6, gain: 1.5, thick: wid * 0.7, light: [0.6, -0.8], litOutline: rim });
  for (let i = 2; i < n - 1; i++) g.px(R(pts[i][0]), R(pts[i][1]), ramp[1]);
}

function paintBack(g) {
  // ---- far tree lines (hazy purple), lower in the middle so the moon stays free
  const calm = (x) => 1 - 0.55 * Math.exp(-(((x - 280) / 150) ** 2));
  treeline(g, GROUND, "#2A2452", "#3A3470", 11, 34, 70, 22, LX0, LX0 + LW, calm);
  for (const [x, h] of [[-4, 80], [150, 70], [398, 84], [432, 104], [610, 92], [700, 120]]) conifer(g, x, GROUND - 26, h, h * 0.22, "#272150", "#38326C");
  treeline(g, GROUND, "#1A1638", "#2C2858", 23, 12, 34, 16, LX0, LX0 + LW, calm);
  for (const [x, h] of [[30, 64], [214, 48], [362, 58], [470, 76], [560, 84]]) conifer(g, x, GROUND - 8, h, h * 0.24, "#17142F", "#2A2656");

  // ---- the right tree: trunk off the top, crowns, a branch reaching left where the LV 8 sign hangs
  blob(g, [[[502, GROUND + 2], [512, 360], [516, 200], [522, 0], [580, 0], [570, 220], [566, 380], [574, GROUND + 2]], ell(538, GROUND, 46, 8)], { ramp: BARK, base: 2.4, gain: 1.6, thick: 16, light: [-0.9, -0.3], litOutline: MOONRIM });
  blob(g, [tube(bez([516, 452], [470, 446], [404, 470], 12), 6, 3)], { ramp: BARK, base: 2.6, gain: 1.2, thick: 3, light: [-0.3, -0.9], litOutline: MOONRIM });
  blob(g, [tube(bez([520, 318], [472, 300], [446, 262], 10), 7, 3)], { ramp: BARK, base: 2.6, thick: 3, light: [-0.3, -0.9], litOutline: MOONRIM });
  for (const [x, y, rx, ry, s] of [[560, 120, 70, 60, 1], [500, 196, 58, 42, 2], [452, 252, 38, 28, 3], [548, 280, 52, 40, 4], [440, 444, 26, 16, 5], [492, 432, 34, 22, 6], [580, 400, 50, 36, 7]]) clump(g, x, y, rx, ry, s * 13, LEAF, [-0.8, -0.5], MOONRIM);

  // ---- the jungle-edge tree on the left (continues the jungle): buttress trunk, big leaves, a hanging vine
  blob(g, [smooth([[-30, GROUND + 3], [-14, 560], [-10, 300], [-14, 0], [22, 0], [20, 260], [26, 520], [44, GROUND + 3]]), [[-4, GROUND + 3], [30, 560], [60, GROUND + 3]]], { ramp: BARK, base: 2.2, gain: 1.6, thick: 14, light: [0.9, -0.4], litOutline: MOONRIM });
  for (let y = 20; y < GROUND - 10; y += 9) { const x = R(2 + Math.sin(y * 0.05) * 3); g.line(x, y, x + 1, y + 5, BARK[1]); if (y % 27 === 2) g.line(x + 10, y + 2, x + 11, y + 6, BARK[2]); }
  for (const [x, y, rx, ry, s] of [[16, 228, 50, 42, 21], [52, 298, 42, 32, 22], [4, 372, 34, 28, 23], [76, 250, 28, 21, 24]]) clump(g, x, y, rx, ry, s * 7, LEAF2, [0.8, -0.6], MOONRIM);
  for (const [x, y, len, ang] of [[20, 330, 74, 0.35], [10, 360, 66, 0.75], [30, 300, 60, -0.1], [-10, 410, 58, 0.95]]) frond(g, x, y, len, 9, ang, LEAF2, MOONRIM, 0.35);
  { const v = bez([46, 300], [62, 400], [52, 470], 24); for (let i = 1; i < v.length; i++) g.line(R(v[i - 1][0]), R(v[i - 1][1]), R(v[i][0]), R(v[i][1]), "#0F1D1C"); for (let i = 3; i < v.length; i += 4) { const [x, y] = v[i]; flat(g, [ell(x + 3, y, 3.5, 2, 0.5)], "#1C342E"); g.px(R(x) + 4, R(y) - 1, "#3C6656"); } }

  // ---- the tent (front view, door open; its warm lamp is drawn live): orange canvas, darker side away from the fire
  const T0 = [2, GROUND + 1], T1 = [98, GROUND + 1], TA = [50, 546];
  blob(g, [[[TA[0], TA[1]], [T1[0], T1[1]], [T0[0], T0[1]]]], { ramp: TENT, base: 2.2, gain: 1.8, slope: 0.4, thick: 18, light: [0.9, -0.3], litOutline: "#F2A060" });
  // seams and the ridge pole tip
  g.line(TA[0], TA[1] + 2, 26, GROUND, TENT[2]); g.line(TA[0], TA[1] + 2, 74, GROUND, TENT[3]); g.rect(TA[0] - 1, TA[1] - 5, 2, 6, LOG[2]); g.px(TA[0] - 1, TA[1] - 6, LOG[5]);
  // door: dark inner triangle, flaps tied back
  g.poly([[TA[0], TA[1] + 22], [TA[0] + 17, GROUND + 1], [TA[0] - 17, GROUND + 1]], "#120608");
  flat(g, [[[TA[0], TA[1] + 20], [TA[0] - 19, GROUND + 1], [TA[0] - 9, GROUND + 1], [TA[0] - 4, GROUND - 40]]], TENT[3]);
  flat(g, [[[TA[0], TA[1] + 20], [TA[0] + 19, GROUND + 1], [TA[0] + 9, GROUND + 1], [TA[0] + 4, GROUND - 40]]], TENT[5]);
  g.line(TA[0] - 6, GROUND - 30, TA[0] - 15, GROUND - 22, "#F2D8A0"); g.line(TA[0] + 6, GROUND - 30, TA[0] + 15, GROUND - 22, "#F2D8A0");
  // sleeping bag peeking out of the door
  flat(g, [ell(TA[0] + 1, GROUND - 4, 11, 5)], "#3A4A8A"); g.rect(TA[0] - 9, GROUND - 7, 18, 1, "#5A6AB0");
  // guy line and pegs
  g.line(TA[0] - 2, TA[1] + 4, -16, GROUND + 2, "#8A7A6A"); g.rect(-17, GROUND - 2, 2, 5, LOG[3]);

  // ---- reeds and cattails of the marsh (behind the puddle), heads lit by the moon
  for (let i = 0; i < 26; i++) {
    const x = 432 + i * 7 + R(rnd(i * 3) * 6), base = 652 + R(rnd(i * 5) * 4), h = 46 + R(rnd(i * 7) * 50), lean = (rnd(i * 11) - 0.5) * 16, col = i % 3 ? REED[3] : REED[4];
    const top = [x + lean, base - h], mid = [x + lean * 0.3, base - h * 0.5];
    const pts = bez([x, base], mid, top, 10); for (let k = 1; k < pts.length; k++) g.line(R(pts[k - 1][0]), R(pts[k - 1][1]), R(pts[k][0]), R(pts[k][1]), col);
    if (i % 3 === 0) { const [cx, cy] = top; blob(g, [capsule2([cx, cy + 4], [cx + lean * 0.02, cy + 16], 2.6)], { ramp: CATT, thick: 2, light: [-0.4, -0.9], litOutline: "#C08A5A" }); g.line(R(cx), R(cy) - 5, R(cx), R(cy) + 3, col); }
    else if (i % 3 === 1) { // long blade leaf
      const p2 = bez([x + 1, base], [x + lean + 8, base - h * 0.6], [x + lean * 1.6 + 10, base - h * 0.8], 10); for (let k = 1; k < p2.length; k++) g.line(R(p2[k - 1][0]), R(p2[k - 1][1]), R(p2[k][0]), R(p2[k][1]), REED[5]);
    }
  }

  // ---- the ground plane: dark moonlit grass (the first rows at x 0 match the jungle's blend), deeper rows bigger,
  //      moonlit grass patches, a worn path from the fire toward the viewer, tufts, moon-flowers, stones, the puddle
  for (let y = GROUND; y < 960; y++) {
    const q = (y - GROUND) / (960 - GROUND), v = q * 3, lo = Math.floor(v), f = v - lo, cols = ["#161E2C", "#18242E", "#1B2A30", "#1E3032", "#203432"];
    for (let x = 0; x < LX0 + LW; x++) {
      let col = f > bayer(x, y) ? cols[Math.min(4, lo + 1)] : cols[lo];
      // soft moonlit patches (perspective: wider and taller toward the viewer), faded in away from the seam
      const fx = 0.05 / (0.35 + q), n = Math.sin(x * fx + Math.sin(y * 0.09) * 1.7) + Math.sin(x * fx * 0.43 + y * 0.05 + 1.3) * 0.9 + Math.sin(y * (0.16 - 0.1 * q) + x * 0.011) * 0.6;
      const k = sm(x, 0, 60) * clamp01((n - 0.6) * 0.7) * (0.55 + 0.45 * q);
      if (k > bayer(x + 1, y)) col = mix(col, "#2E4C48", 0.55);
      g.px(x, y, col);
    }
  }
  // ground lip: a slightly lighter moonlit band with blades poking up
  for (let x = 0; x < LX0 + LW; x++) { g.px(x, GROUND, "#2A3C48"); if (rnd(x * 13) < 0.55) { const h = 1 + R(rnd(x * 7) * 4); for (let j = 1; j <= h; j++) g.px(x, GROUND - j, j === h ? "#30465A" : "#1E2C38"); } }
  // the worn path (moonlit dirt with pebbles along its edges)
  const pathC = (y) => { const q = (y - GROUND) / 320; return [FIRE.x + 46 + 120 * q * q + 26 * Math.sin(q * 3), 9 + 62 * q]; };
  for (let y = GROUND + 3; y < 960; y++) {
    const [cx, half] = pathC(y), q = (y - GROUND) / 320;
    for (let x = R(cx - half); x <= R(cx + half); x++) { const e = Math.abs(x - cx) / half; if (e < 0.75 || (1 - e) * 4 > bayer(x, y)) g.px(x, y, e < 0.45 && 0.35 > bayer(x, y + 1) ? mix("#3A3246", "#463C52", q) : mix("#2E2838", "#3A3246", q)); }
    if (rnd(y * 7) < 0.35) for (const sd of [-1, 1]) { const x = R(cx + sd * half * (0.9 + rnd(y * 3 + sd) * 0.2)), r = R(0.6 + q * 2.4); g.ellipse(x, y, r + 1, Math.max(0, r), "#24202E"); g.px(x - 1, y - Math.max(0, r), "#5A5270"); }
  }
  // tufts, stones, moon-flowers and bells, growing with depth (not on the path)
  const onPath = (x, y) => { const [cx, half] = pathC(y); return Math.abs(x - cx) < half * 0.95; };
  for (let i = 0; i < 1300; i++) {
    const y = GROUND + 3 + R(Math.pow(rnd(i * 17 + 1), 0.85) * 316), q = (y - GROUND) / 320, x = R(rnd(i * 17 + 2) * (LX0 + LW));
    if (y > PUDDLE.y0 - 3 && y < PUDDLE.y1 + 3 && x > PUDDLE.x0 - 4 && x < PUDDLE.x1) continue;
    if (onPath(x, y)) continue;
    if (x < 70 && rnd(i * 5 + 9) * 70 > x) continue;          // thin out toward the jungle seam (its soil blends in there)
    const s = 2 + q * 8, kind = rnd(i * 17 + 3);
    if (kind < 0.8) { const n = 3 + R(rnd(i) * 3); for (let b = 0; b < n; b++) { const bx = x + (b - n / 2) * (1 + q * 1.6), h = s * (0.8 + rnd(i * 5 + b) * 0.9), lean = (rnd(i * 9 + b) - 0.5) * s * 0.9; g.line(R(bx), y, R(bx + lean), R(y - h), b % 2 ? "#12202A" : "#24383C"); if (h > 3) g.line(R(bx + lean * 0.7), R(y - h * 0.7), R(bx + lean), R(y - h), "#36524E"); g.px(R(bx + lean), R(y - h), "#4C6C66"); } }
    else if (kind < 0.86) { const rx = 1 + q * 4.5, ry = 0.6 + q * 2.6; g.ellipse(x, y, R(rx), R(ry), "#262636"); g.ellipse(x, y - 1, Math.max(0, R(rx) - 1), Math.max(0, R(ry) - 1), "#34344A"); g.rect(x - R(rx * 0.5), y - R(ry), Math.max(1, R(rx * 0.8)), 1, "#5C5C7A"); }
    else if (kind < 0.95) { const h = 3 + q * 9, r = q < 0.35 ? 1 : 2; g.line(x, y, x, R(y - h), "#1C3030"); const fy = R(y - h); if (r === 1) { g.rect(x - 1, fy - 1, 3, 2, "#C8C4E8"); g.px(x, fy - 2, "#F0EEFF"); } else { for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) g.px(x + dx, fy + dy, "#DCD8F4"); g.px(x, fy, "#FFE89A"); g.px(x - 2, fy - 1, "#FFFFFF"); } }
    else { const h = 4 + q * 9; g.line(x, y, x + 1, R(y - h), "#1C3030"); g.rect(x, R(y - h), 2 + (q > 0.4 ? 1 : 0), 2 + (q > 0.4 ? 1 : 0), "#8A7AD8"); g.px(x, R(y - h), "#B8A8F4"); }
  }
  // the still puddle of the marsh: the sky reflected (a lighter far band from the horizon glow), reed reflections,
  // a few star glints and lily pads (one with a little pink flower)
  for (let y = PUDDLE.y0; y <= PUDDLE.y1; y++) {
    const v = (y - PUDDLE.y0) / (PUDDLE.y1 - PUDDLE.y0), half = (PUDDLE.x1 - PUDDLE.x0) / 2 * Math.sqrt(Math.max(0, 1 - (2 * v - 1) ** 2)) * (0.92 + 0.08 * Math.sin(y * 0.7)), cx = (PUDDLE.x0 + PUDDLE.x1) / 2 + 20 * v;
    for (let x = R(cx - half); x <= R(cx + half); x++) { const col = v < 0.22 ? (v / 0.22 > bayer(x, y) ? "#4A3C84" : "#5E4C9A") : v < 0.5 ? ((v - 0.22) * 3.6 > bayer(x, y) ? "#2E2462" : "#4A3C84") : (v - 0.5) * 2 > bayer(x, y) ? "#181238" : "#2E2462"; g.px(x, y, col); }
    if (half > 2) { g.px(R(cx - half) - 1, y, "#0E1218"); g.px(R(cx + half) + 1, y, "#0E1218"); g.px(R(cx - half), y, "#232A3A"); }
  }
  for (let i = 0; i < 20; i++) { const x = 440 + i * 7 + R(rnd(i * 3) * 6), h = 6 + R(rnd(i * 7) * 12); if (x > 560) break; g.line(x, PUDDLE.y0 + 1, x + R((rnd(i * 11) - 0.5) * 3), PUDDLE.y0 + 1 + h, "#1A1440"); }
  for (const [x, y] of [[372, 664], [404, 657], [455, 680], [520, 668], [388, 683]]) { g.px(x, y, "#E8E4FF"); g.px(x + 1, y, "#8A80C8"); }
  for (const [x, y, r] of [[392, 676, 6], [420, 684, 4.5], [470, 671, 5]]) { flat(g, [ell(x, y, r, r * 0.42)], "#1E3A2E"); g.rect(R(x - r * 0.6), R(y - r * 0.42), R(r * 0.9), 1, "#3A6050"); g.px(R(x + 1), R(y), "#0E1A16"); }
  { const x = 393, y = 674; g.rect(x - 1, y - 2, 3, 2, "#F08AB0"); g.px(x, y - 3, "#FFD0E4"); g.px(x, y - 1, "#FFE89A"); }

  // ---- a log seat in the foreground (left of the path): bark ridges, moss on top, a cut end with rings, a tin mug
  { const A = [6, 862], B = [150, 846], r = 17;
    for (let x = A[0] - 6; x < B[0] + 12; x++) { const y = R(A[1] + r - 1 + (B[1] - A[1]) * (x - A[0]) / (B[0] - A[0])); for (let j = -2; j <= 3; j++) if (Math.abs(j) < 2 || 0.5 > bayer(x, y + j)) g.px(x, y + j, "#0C1018"); }
    blob(g, [tube([A, B], r, r - 1)], { ramp: LOG, base: 2.5, gain: 1.7, slope: 0.3, thick: 10, light: [0.4, -1], litOutline: "#C49A78" });
    for (let k = 0; k < 9; k++) { const v = -r + 5 + k * 3.6, y0 = A[1] + v, y1 = B[1] + v * 0.94; for (let x = A[0] + 3; x < B[0] - 2; x++) { const y = R(y0 + (y1 - y0) * (x - A[0]) / (B[0] - A[0]) + Math.sin(x * 0.21 + k) * 0.7); if (rnd(x * 7 + k * 131) < 0.62) g.px(x, y, v < -6 ? LOG[3] : LOG[1]); } }
    for (let x = A[0] + 8; x < B[0] - 8; x++) { const top = R(A[1] - r + 1 + (B[1] - A[1]) * (x - A[0]) / (B[0] - A[0])), m = Math.sin(x * 0.13) + Math.sin(x * 0.05 + 2); if (m > 0.2) { g.px(x, top, "#3E6A46"); g.px(x, top + 1, "#2A4A32"); if (m > 1) g.px(x, top - 1, "#5A8A5A"); } }
    const cx = B[0], cy = B[1]; for (let j = -r; j <= r; j++) for (let i = -7; i <= 7; i++) { const d = (i / 7.5) ** 2 + (j / (r + 0.5)) ** 2; if (d > 1) continue; const ring = Math.floor(Math.sqrt(d) * 5); g.px(cx + i, cy + j, d > 0.8 ? LOG[2] : ring % 2 ? "#A87A52" : "#C8986A"); }
    g.rect(cx - 1, cy - 1, 2, 2, LOG[4]); g.line(cx - 1, cy, cx + 4, cy - 6, LOG[3]);
    const mx = 86, my = 836; g.rect(mx - 6, my - 12, 12, 13, "#141620"); g.rect(mx - 5, my - 11, 10, 11, "#7A8AA8"); g.rect(mx - 5, my - 11, 3, 11, "#AAB8D0"); g.rect(mx + 2, my - 11, 3, 11, "#56627E"); g.rect(mx - 5, my - 11, 10, 1, "#D4DEEE"); g.rect(mx - 4, my - 10, 8, 2, "#2A1A12");
    for (let j = -3; j <= 3; j++) { g.px(mx + 6 + (Math.abs(j) < 3 ? 2 : 1), my - 6 + j, "#141620"); g.px(mx + 6 + (Math.abs(j) < 3 ? 1 : 0), my - 6 + j, Math.abs(j) < 3 ? "#56627E" : "#141620"); } }

  // ---- the lantern standing in the grass on the right (its flame and glow are drawn live)
  { const x = LANTERN.x, y = LANTERN.y, K = (v) => R(v * 1.4);
    g.ellipse(x, y + 1, K(15), K(3), "#0C1218");
    g.rect(x - K(11), y - K(4), K(22), K(5), "#1A1418"); g.rect(x - K(10), y - K(3), K(20), K(3), "#5A3A28"); g.rect(x - K(10), y - K(3), K(20), 1, "#8A5A3A");
    for (const dx of [-9, 8]) g.rect(x + K(dx), y - K(26), K(2), K(22), "#2A1C18");
    g.rect(x - K(10), y - K(30), K(21), K(5), "#1A1418"); g.rect(x - K(9), y - K(29), K(19), K(3), "#6A4430"); g.rect(x - K(6), y - K(33), K(13), K(3), "#1A1418"); g.rect(x - K(5), y - K(32), K(11), 1, "#8A5A3A");
    g.ering(x, y - K(37), K(6), K(6), "#3A2C28", Math.PI, 2 * Math.PI); g.ering(x, y - K(37), K(5), K(5), "#7A6A62", Math.PI * 1.1, Math.PI * 1.5); }
}
export const LANTERN = { x: 432, y: 866 };
// tube helper (capsule) without importing it twice
function capsule2(p, q, r) { return tube([p, q], r, r); }

function paintFront(g) {
  // tall foreground grass along the bottom edge (dark, moonlit tips)
  for (let i = 0; i < 110; i++) {
    const x = R(rnd(i * 31 + 5) * 560) - 10, base = 962, h = 18 + rnd(i * 31 + 6) * 46, lean = (rnd(i * 31 + 7) - 0.5) * 34, w = 2 + R(rnd(i * 31 + 8) * 2);
    const pts = bez([x, base], [x + lean * 0.2, base - h * 0.6], [x + lean, base - h], 8);
    for (let k = 0; k < pts.length; k++) { const ww = Math.max(1, R(w * (1 - k / pts.length))), [px, py] = pts[k]; g.rect(R(px) - (ww >> 1), R(py), ww, 2, k > pts.length - 3 ? "#3E5E58" : k > pts.length - 5 ? "#24383A" : i % 3 ? "#121E24" : "#18282C"); }
  }
  // corner leaves (bottom left, bottom right)
  for (const [x, y, len, ang] of [[-14, 960, 90, -0.85], [-22, 924, 80, -0.35], [10, 975, 70, -1.25], [560, 960, 86, -2.25], [570, 925, 76, -2.8]]) frond(g, x, y, len, 11, ang, LEAF2, "#3C6656", -0.2);
  // a few reeds in front of the puddle (the mosquito comes out from between them)
  for (let i = 0; i < 6; i++) {
    const x = 506 + i * 7, base = 694 + (i % 2) * 3, h = 62 + R(rnd(i * 41) * 40), lean = (rnd(i * 43) - 0.6) * 18;
    const pts = bez([x, base], [x + lean * 0.3, base - h * 0.5], [x + lean, base - h], 12); for (let k = 1; k < pts.length; k++) { g.line(R(pts[k - 1][0]), R(pts[k - 1][1]), R(pts[k][0]), R(pts[k][1]), REED[2]); g.px(R(pts[k][0]) + 1, R(pts[k][1]), REED[4]); }
    if (i % 2 === 0) { const [cx, cy] = pts[pts.length - 1]; blob(g, [capsule2([cx, cy + 3], [cx, cy + 15], 2.6)], { ramp: CATT, thick: 2, light: [-0.4, -0.9], litOutline: "#C08A5A" }); g.line(R(cx), R(cy) - 4, R(cx), R(cy) + 2, REED[2]); }
  }
}

let BACK = null, FRONT = null;
function layers() {
  if (BACK) return;
  BACK = new Layer(LW, 960); paintBack(offset(BACK));
  FRONT = new Layer(LW, 960); paintFront(offset(FRONT));
}
export function drawBack(c, V) { layers(); const [x, y] = S(V, LX0, 0); BACK.blit(c, x, y, { x0: Math.max(0, R(S(V, -40, 0)[0])) }); }
export function drawFront(c, V) { layers(); const [x, y] = S(V, LX0, 0); FRONT.blit(c, x, y); }

// ---------------------------------------------------------------- live: the fire's warm light on the scenery
export function fireGlow(c, V, t) {
  const [fx, fy] = S(V, FIRE.x, FIRE.y - 14), fk = flicker(t), rx = 168 * (0.96 + 0.04 * fk), ry = 120 * (0.96 + 0.04 * fk);
  const x0 = Math.max(0, R(fx - rx)), x1 = Math.min(c.w, R(fx + rx)), y0 = Math.max(0, R(fy - ry)), y1 = Math.min(c.h, R(fy + ry * 0.85));
  if (x1 <= x0 || y1 <= y0) return;
  c.tint(x0, y0, x1 - x0, y1 - y0, (X, Y) => { const dy = Y > fy ? (Y - fy) * 1.25 : (Y - fy), d = Math.hypot((X - fx) / rx, dy / ry); return d >= 1 ? 0 : 0.5 * fk * Math.pow(1 - d, 1.6); }, "#FF8E3C", 6);
}

// ---------------------------------------------------------------- live: the campfire (stones, logs, flames, embers, sparks, smoke)
function stones(g, x, y, front) {
  const list = front ? [[-22, 1, 8, 6], [-9, 3, 9, 6], [6, 3, 9, 6], [21, 1, 8, 6]] : [[-28, -2, 7, 5], [28, -2, 7, 5], [-14, -4, 6, 4], [14, -4, 6, 4]];
  for (const [dx, dy, rx, ry] of list) blob(g, [ell(x + dx, y + dy, rx, ry)], { ramp: STONE, base: 2.4, gain: 1.6, thick: 4, light: [dx < 0 ? 0.6 : -0.6, -0.8], litOutline: WARMRIM });
}
function logs(g, x, y) {
  blob(g, [tube([[x - 24, y + 1], [x + 6, y - 14]], 4, 3.5)], { ramp: LOG, base: 2.6, thick: 3, light: [0.3, -0.9], litOutline: WARMRIM });
  blob(g, [tube([[x + 24, y + 1], [x - 6, y - 14]], 4, 3.5)], { ramp: LOG, base: 2.6, thick: 3, light: [-0.3, -0.9], litOutline: WARMRIM });
  blob(g, [tube([[x - 18, y + 3], [x + 18, y + 3]], 4, 4)], { ramp: LOG, base: 2.4, thick: 3, light: [0, -1], litOutline: WARMRIM });
  for (const [dx, dy] of [[-24, 1], [24, 1], [-18, 3], [18, 3]]) { g.rect(x + dx - 1, y + dy - 1, 3, 3, "#3A1A0C"); g.px(x + dx, y + dy, "#E0601C"); }
}
const FL = ["#7A1A10", "#C8341A", "#F06A1E", "#FFA22E", "#FFD45A", "#FFF4B8"];
/** One flame tongue: a tapered teardrop from (x, y) up to height h, swaying; drawn in nested colour bands. */
function tongue(c, x, y, h, w, sway, t, seed) {
  for (let band = 0; band < 4; band++) {
    const k = 1 - band * 0.24, hh = h * k, ww = w * (1 - band * 0.22), col = FL[1 + band];
    for (let j = 0; j < hh; j++) {
      const q = j / hh, half = ww * Math.sqrt(Math.max(0, 1 - q)) * (q < 0.25 ? 0.75 + q : 1) * (1 - q * 0.35), cx = x + sway * q * q * h * 0.5 + Math.sin(t * 9 + seed + q * 4) * q * 1.6;
      if (half < 0.35) continue;
      for (let X = R(cx - half); X <= R(cx + half); X++) c.px(X, R(y - j - band * 1.2), col);
    }
  }
}
export function drawFire(c, V, t) {
  const [fx, fy] = S(V, FIRE.x, FIRE.y); if (fx < -80 || fx > c.w + 80) return;
  const x = R(fx), y = R(fy);
  stones(c, x, y - 3, false); logs(c, x, y - 3);
  // embers bed
  for (let i = -12; i <= 12; i++) { const glow = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7); c.px(x + i, y - 4, glow > 0.6 ? "#FFB040" : "#C8441A"); if (Math.abs(i) < 9) c.px(x + i, y - 5, glow > 0.3 ? "#FF8A2A" : "#A02A14"); }
  // flames: a tall middle tongue and side tongues, all breathing at different rates
  const fk = flicker(t);
  const T = [[-2, 46, 12, 0], [-12, 32, 9.5, 1.7], [11, 35, 9.5, 3.1], [-20, 18, 6.5, 4.4], [20, 19, 6.5, 5.2], [5, 27, 8.5, 6.6], [-6, 24, 8, 7.9]];
  // the flame body: a low glowing mound over the logs that the tongues rise from
  for (let j = 0; j < 12; j++) { const half = R(24 * Math.sqrt(1 - (j / 12) ** 2) * (0.92 + 0.08 * Math.sin(t * 7 + j))); for (let X = -half - 1; X <= half + 1; X++) c.px(x + X, y - 5 - j, Math.abs(X) > half - 1 ? FL[1] : j < 5 && Math.abs(X) < half * 0.6 ? FL[4] : FL[2]); }
  // outer dark-red rim first (a slightly bigger silhouette), then the tongues
  for (const [dx, h0, w, s] of T) { const h = h0 * (0.85 + 0.15 * Math.sin(t * (6.3 + s) + s)) * (0.95 + 0.08 * fk), sway = Math.sin(t * 2.3 + s) * 0.22 + 0.12 * Math.sin(t * 5.1 + s * 2); tongueRim(c, x + dx, y - 5, h + 2, w + 1.5, sway, t, s); }
  for (const [dx, h0, w, s] of T) { const h = h0 * (0.85 + 0.15 * Math.sin(t * (6.3 + s) + s)) * (0.95 + 0.08 * fk), sway = Math.sin(t * 2.3 + s) * 0.22 + 0.12 * Math.sin(t * 5.1 + s * 2); tongue(c, x + dx, y - 5, h, w, sway, t, s); }
  // detached flame licks rising off the top
  for (let i = 0; i < 3; i++) { const p = ((t * 1.6 + i / 3) % 1), lx = x + Math.sin(t * 3 + i * 2) * 4 + (i - 1) * 5, ly = y - 44 - p * 26, s = R(2.5 * (1 - p)); if (s > 0) { c.rect(R(lx) - (s >> 1), R(ly), s, s + 1, p < 0.4 ? FL[3] : FL[2]); } }
  stones(c, x, y - 1, true);
  // sparks drifting up (each lives ~1.4 s), and a little smoke
  for (let i = 0; i < 14; i++) {
    const life = 1.2 + rnd(i * 7) * 0.8, p = (((t + rnd(i * 3) * life) / life) % 1), sx = x + (rnd(i * 5) - 0.5) * 20 + Math.sin(t * 2 + i) * 6 * p + 14 * p * p, sy = y - 20 - p * (70 + rnd(i * 9) * 50);
    const a = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85; if (a > bayer(R(sx), R(sy)) * 0.9) c.px(R(sx), R(sy), p < 0.5 ? "#FFE07A" : "#FF8A3A");
  }
  for (let i = 0; i < 5; i++) {
    const p = ((t * 0.32 + i / 5) % 1), sx = x + 4 + p * 26 + Math.sin(t * 0.9 + i) * 5, sy = y - 58 - p * 90, r = 4 + p * 10, a = 0.22 * Math.sin(Math.PI * p);
    c.tint(R(sx - r), R(sy - r), R(2 * r), R(2 * r), (X, Y) => { const d = Math.hypot(X - sx, Y - sy) / r; return d >= 1 ? 0 : a * (1 - d); }, "#7A74A0", 3);
  }
}
function tongueRim(c, x, y, h, w, sway, t, seed) {
  for (let j = 0; j < h; j++) { const q = j / h, half = w * Math.sqrt(Math.max(0, 1 - q)) * (q < 0.25 ? 0.75 + q : 1) * (1 - q * 0.35), cx = x + sway * q * q * h * 0.5 + Math.sin(t * 9 + seed + q * 4) * q * 2.2; if (half < 0.35) continue; for (let X = R(cx - half); X <= R(cx + half); X++) c.px(X, R(y - j + 1), FL[0]); }
}

// ---------------------------------------------------------------- live: the lamp inside the tent (warm, breathing)
export function drawTentLamp(c, V, t) {
  const [x, y] = S(V, 50, GROUND - 16); if (x < -60 || x > c.w + 60) return;
  const k = 0.85 + 0.15 * Math.sin(t * 1.7) * Math.sin(t * 0.6 + 1);
  c.tint(R(x - 16), R(y - 24), 33, 40, (X, Y) => { const inDoor = Math.abs(X - x) < (Y - (y - 26)) * 0.62; const d = Math.hypot((X - x) / 16, (Y - y) / 20); return inDoor && d < 1 ? 0.75 * k * (1 - d) : 0; }, "#FFB860", 4);
  c.rect(R(x) - 2, R(y) - 2, 5, 6, "#3A2410"); c.rect(R(x) - 1, R(y) - 1, 3, 4, k > 0.9 ? "#FFF0B0" : "#FFD070");
}

// ---------------------------------------------------------------- live: the lantern's flame and warm pool of light
export function drawLantern(c, V, t) {
  const [x, y] = S(V, LANTERN.x, LANTERN.y); if (x < -100 || x > c.w + 100) return;
  const X = R(x), Y = R(y), k = 0.9 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1);
  c.tint(X - 96, Y - 70, 192, 92, (xx, yy) => { const d = Math.hypot((xx - X) / 96, (yy - Y + 14) / (yy > Y ? 22 : 60)); return d >= 1 ? 0 : 0.34 * k * Math.pow(1 - d, 1.5); }, "#FFB050", 5);
  // glass with the glowing flame
  for (let j = -35; j <= -6; j++) for (let i = -10; i <= 10; i++) { const d = Math.hypot(i / 10.5, (j + 20) / 16); c.px(X + i, Y + j, d < 0.35 ? "#FFF6C8" : d < 0.6 ? "#FFD27A" : d < 0.85 ? "#F0A048" : "#B8662A"); }
  const fh = R(7 + 2 * k); for (let j = 0; j < fh; j++) { const w = j < fh - 3 ? 1 : 0; c.rect(X - w, Y - 15 - j, 1 + 2 * w, 1, j > fh - 4 ? "#FFFFFF" : "#FFF0A0"); }
  c.rect(X - 10, Y - 35, 1, 29, "#FFE8B0"); c.px(X + 7, Y - 31, "#FFFFFF"); c.px(X + 7, Y - 30, "#FFFFFF");
}

// ---------------------------------------------------------------- live: the LV 8 neon sign hanging from the branch
/** lit 0..1: dark tubes → glowing pink neon (crossfade with a short flicker when it switches on). */
export function drawSign(c, V, t) {
  const [x, y] = S(V, SIGN.x, SIGN.y); if (x < -80 || x > c.w + 80) return;
  const on = MQ.sign, u = (t - on[0]) / (on[1] - on[0]);
  // switch-on flicker: two soft pulses then steady (all continuous ramps)
  const lit = u <= 0 ? 0 : u >= 1 ? 1 : Math.max(sm(u, 0, 0.14) * (1 - sm(u, 0.18, 0.3)) * 0.7, sm(u, 0.36, 0.48) * (1 - sm(u, 0.52, 0.62)) * 0.85, sm(u, 0.68, 0.92));
  const hum = lit * (0.93 + 0.07 * Math.sin(t * 9.1) * Math.sin(t * 3.3));
  const text = "LV 8", s = 2, tw = c.measure(MAIN, text, { scale: s }), w = tw + 16, h = 24, bx = R(x - w / 2), by = R(y - h);
  // chains to the branch
  for (const dx of [6, w - 7]) for (let yy = by - 1; yy > by - 24 + (dx > 10 ? 4 : 0); yy -= 2) { c.px(bx + dx, yy, "#8A82AA"); c.px(bx + dx, yy - 1, "#4A4466"); }
  // glow on the surroundings
  if (hum > 0.02) c.tint(bx - 22, by - 18, w + 44, h + 36, (X, Y) => { const dx = Math.max(0, Math.abs(X - x) - w / 2) / 22, dy = Math.max(0, Math.abs(Y - (by + h / 2)) - h / 2) / 18, d = Math.hypot(dx, dy); return d >= 1 ? 0 : 0.5 * hum * (1 - d) ** 1.5; }, "#FF4AC8", 4);
  // board
  c.rrect(bx - 2, by - 2, w + 4, h + 4, "#0E0818", 2); c.rrect(bx - 1, by - 1, w + 2, h + 2, "#1A0E2A", 2);
  const tubeOff = "#4A2A56", tubeOn = mix("#FF5AD8", "#FFB4F0", 0.3 + 0.2 * Math.sin(t * 7));
  c.rframe(bx, by, w, h, tubeOff, 2); c.text(MAIN, text, bx + 8, by + 5, tubeOff, { scale: s });
  if (hum > 0) {
    const g = fade(c, Math.min(1, hum * 1.15));
    g.rframe(bx, by, w, h, mix("#C02AA0", "#FF6AE0", hum), 2);
    g.text(MAIN, text, bx + 8, by + 6, "#7A1A6A", { scale: s }); g.text(MAIN, text, bx + 8, by + 5, mix("#FF8AE8", "#FFF0FC", 0.5 * hum), { scale: s });
  }
}

// ---------------------------------------------------------------- live: fireflies, puddle glints, the swarm in the reeds
const FLIES = Array.from({ length: 16 }, (_, i) => ({ x: i < 7 ? 380 + rnd(i * 5) * 150 : 150 + rnd(i * 5) * 330, y: i < 7 ? 590 + rnd(i * 7) * 60 : 560 + rnd(i * 7) * 380, ph: rnd(i * 11) * 6.28, sp: 0.3 + rnd(i * 13) * 0.4, per: 2.2 + rnd(i * 17) * 1.8 }));
export function drawFireflies(c, V, t, a = 1) {
  for (const f of FLIES) {
    const x = f.x + Math.sin(t * f.sp + f.ph) * 22 + Math.sin(t * f.sp * 2.3 + f.ph * 2) * 7, y = f.y + Math.cos(t * f.sp * 0.8 + f.ph) * 12;
    if (y > 636 && y < 790) continue;                                  // keep the caption row clean
    const p = ((t + f.ph) % f.per) / f.per, glow = a * Math.max(0, Math.sin(Math.PI * Math.min(1, p * 1.6)));
    if (glow < 0.05) continue;
    const [sx, sy] = S(V, x, y), X = R(sx), Y = R(sy); if (X < 2 || X > c.w - 3) continue;
    c.tint(X - 4, Y - 4, 9, 9, (xx, yy) => { const d = Math.hypot(xx - X, yy - Y) / 4.5; return d >= 1 ? 0 : glow * 0.55 * (1 - d); }, "#C8F070", 3);
    fade(c, glow).px(X, Y, "#FBFFC8"); if (glow > 0.6) { fade(c, glow - 0.4).px(X + 1, Y, "#D8F07A"); fade(c, glow - 0.4).px(X, Y + 1, "#B0D850"); }
  }
}
export function drawPuddleLife(c, V, t) {
  for (let i = 0; i < 5; i++) {
    const p = ((t * 0.15 + i / 5) % 1), x = PUDDLE.x0 + 30 + i * 38 + p * 20, y = PUDDLE.y0 + 4 + (i % 3) * 7, len = R(6 + 4 * Math.sin(Math.PI * p)), a = Math.sin(Math.PI * p);
    const [sx, sy] = S(V, x, y); const g = fade(c, a * 0.8); g.rect(R(sx), R(sy), len, 1, "#8A7AC8"); g.px(R(sx) + (len >> 1), R(sy), "#D0C8F8");
  }
}
/** Tiny swarm of mosquito specks hovering over the reeds (the marsh is where they breed). a fades it. */
export function drawSwarm(c, V, t, a = 1) {
  if (a <= 0) return;
  for (let i = 0; i < 6; i++) {
    const x = 462 + rnd(i * 3) * 64 + Math.sin(t * (5 + i) + i) * 4 + Math.sin(t * 1.3 + i * 2) * 6, y = 548 + rnd(i * 7) * 50 + Math.cos(t * (6.2 + i * 0.7) + i) * 3;
    const [sx, sy] = S(V, x, y), g = fade(c, a); g.px(R(sx), R(sy), "#0A0812"); g.px(R(sx) + 1, R(sy), "#0A0812"); if (((t * 30 + i) | 0) % 2) g.px(R(sx), R(sy) - 1, "#8A86B4"); else g.px(R(sx) + 1, R(sy) - 1, "#8A86B4");
  }
}
