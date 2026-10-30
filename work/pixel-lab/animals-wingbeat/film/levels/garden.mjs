// LV3 · butterfly (~10 beats/s) — a sunny cottage flower garden at midday (RANGE BIOME.garden = 1080..1620, tod ≈ 2.0).
// Soft far hills and hazy trees, an apple tree and a mint garden shed behind a white picket fence with a little gate;
// hollyhocks, cosmos, lavender and a hydrangea along the fence; a striped lawn with stepping stones from the gate to the
// bottom edge between two flower beds (zinnias, cosmos, lavender, a sage-green watering can), bigger toward the bottom.
// The cute front-facing butterfly hovers under the sun disc. Its wings come ONLY from wingPhase("butterfly", t):
// e = cos(2π·phase) → clapped up over the body (+1) … open down to the sides (−1), real positions every frame, with a
// faint trailing smear sampled from the same stroke a moment earlier (a 180° shutter). Right edge: the lawn runs on
// into the pond level (pond.mjs slopes it down to the bank). All idle motion is periodic over END.
import { BIOME, LAND, EV, END, wingPhase, strokeAmt } from "../timeline.mjs";
import { tod } from "../world.mjs";
import { sign, fade, mix, bayer, sm, rnd, blinkAt, win, clamp01 } from "../cute.mjs";
import { Layer, tuft, paintHills, grassAt, GRASS, grade, gradeView, osc, leafBall } from "./meadow-kit.mjs";
import { cosmos, zinnia, lavender, hollyhock, leafShape, hydrangea, roseBush, picketFence, shed, appleTree, wateringCan, PETALS, LEAF } from "./garden-flora.mjs";
import { drawButterfly } from "./garden-butterfly.mjs";

export const RANGE = BIOME.garden;
const R = Math.round, [RX0, RX1] = RANGE;
// rest camera (1350, −180): screen = (wx − 1080, wy + 660). S(x, y) converts a rest-screen point to world.
const S = (x, y) => [RX0 + x, y - 660];
const BF = S(270, 350);                       // butterfly head centre (screen 270, 350)
const SIGN = S(392, 630);                     // LV 3 sign post foot
const GATE = [296, 336];                      // gate in the fence (screen x)
const CAN = S(26, 906);                       // watering can body bottom-left (screen)

// shared ground look: far hills for garden + pond (pond.mjs imports these so the seam at x 1620 matches)
const envL = (x) => sm(x, RX0 - 10, RX0 + 90);
export const hillFar = (x) => (72 + 20 * Math.sin(x * 0.011 + 0.4) + 10 * Math.sin(x * 0.029 + 1.3)) * envL(x);
export const hillNear = (x) => (34 + 11 * Math.sin(x * 0.019 + 2.2) + 6 * Math.sin(x * 0.047)) * envL(x);
export const FAR = ["#94C4B4", "#A2D0BA", "#B2DAC0", "#C4E4CA"], NEAR = ["#64AA6C", "#74B874", "#86C67E", "#9AD48C"];
/** Lawn colour at world (x, y): perspective tone bands + soft mowing stripes radiating from the garden's centre. */
export function lawnAt(x, y) {
  const d = y - LAND, xg = (x - 1350) / (d + 60) / 0.2, f = xg - Math.floor(xg), st = Math.abs(f - 0.5) < 0.25 ? 0 : 1, edge = Math.abs(Math.abs(f - 0.5) - 0.25) < 0.04;
  return grassAt(x, y, d, GRASS, st ? -0.45 : 0.35 + (edge && bayer(x, y) > 0.5 ? -0.3 : 0));
}

// ---------------------------------------------------------------- static layers (built once)
let BACK = null, FRONT = null;
const STONE = ["#3A3640", "#58525E", "#7C7682", "#A29CA6", "#C4BEC6", "#E0DCE2"];
function path() {                                 // stepping stones from the gate to the bottom edge (rest-screen coords)
  const out = []; const n = 10;
  for (let i = 0; i < n; i++) { const s = (i + 0.35) / n, y = 646 + 330 * Math.pow(s, 1.55), x = 316 - 112 * Math.pow(s, 1.25) + 18 * Math.sin(s * Math.PI * 1.4), rx = 5 + 30 * Math.pow(s, 1.2), ry = rx * (0.32 + 0.16 * s); out.push([x, y, rx, ry, i]); }
  return out;
}
function stone(g, x, y, rx, ry, seed) {
  // soft shadow on the grass, then a flat stone with a lit upper-left rim
  for (let Y = R(y - ry); Y <= R(y + ry + 2); Y++) for (let X = R(x - rx - 1); X <= R(x + rx + 1); X++) {
    const dx = (X - x) / rx, dy = (Y - y - 1.5) / ry, d = dx * dx + dy * dy; if (d <= 1.05 && d > 0.7 && Y > y) g.blend(X, Y, "#1E4A22", 0.35);
  }
  for (let Y = R(y - ry); Y <= R(y + ry); Y++) for (let X = R(x - rx); X <= R(x + rx); X++) {
    const wob = 1 + 0.06 * Math.sin(Math.atan2(Y - y, X - x) * 5 + seed), dx = (X - x) / (rx * wob), dy = (Y - y) / (ry * wob), d = dx * dx + dy * dy; if (d > 1) continue;
    const lit = -dx * 0.6 - dy * 0.8, s = d > 0.82 ? (lit > 0.3 ? 4 : 1) : lit > 0.45 ? 5 : lit > -0.1 ? 4 : 3;
    g.px(X, Y, ((X * 7 + Y * 13 + seed) % 23 === 0 && s > 2) ? STONE[s - 1] : STONE[s]);
  }
}
function build() {
  BACK = new Layer(RX0, -260, RX1, 300); FRONT = new Layer(RX0, 20, RX1, 300);
  const g = BACK.g, f = FRONT.g, P = (x, y) => S(x, y);
  // far hills + hazy tree crowns on them
  paintHills(g, RX0, RX1, LAND, hillFar, hillNear, FAR, NEAR);
  for (let i = 0; i < 14; i++) {
    const x = R(RX0 + 30 + i * 38 + rnd(i * 13 + 5) * 20), hn = hillNear(x); if (hn < 8) continue; const y = R(LAND - hn + 4), r = 6 + rnd(i * 7) * 6;
    g.rect(x, R(y - r * 0.2), 2, R(r * 0.8 + 4), "#5A8A64"); leafBall(g, x, y - r * 0.7, r, ["#4E8E5E", "#5E9E68", "#70AE72", "#86BE80", "#9CCC90"], i, { amp: 0.08, bumps: 6 });
  }
  // apple tree (left) and the mint shed (right) behind the fence; low bushes along it
  appleTree(g, ...P(54, 630), 1, 7);
  shed(g, ...P(420, 632), 92, 62);
  for (const [x, r, s] of [[118, 16, 1], [214, 14, 2], [262, 12, 3], [372, 15, 4], [520, 13, 5]]) leafBall(g, ...P(x, 640 - r * 0.7), r, LEAF, s * 9, { amp: 0.14, bumps: 8 });
  // lawn with soft mowing stripes and grass texture
  for (let y = LAND; y < 300; y++) for (let x = RX0; x < RX1; x++) g.px(x, y, lawnAt(x, y));
  g.rect(RX0, LAND, RX1 - RX0, 1, "#C8EC8E");
  for (let i = 0; i < 4200; i++) {
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 1), 1.4) * 300), x = R(RX0 + rnd(i * 3 + 2) * (RX1 - RX0)), d = y - LAND, h = d < 40 ? 1 : d < 140 ? 2 : d < 240 ? 3 : 4;
    const col = rnd(i * 5) < 0.6 ? mix(g.get(x, y), "#1E5A2A", 0.3) : mix(g.get(x, y), "#E8FFB0", 0.28);
    for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col);
  }
  // daisies dotted over the lawn (tiny, bigger toward the bottom)
  for (let i = 0; i < 70; i++) { const x = R(RX0 + 6 + rnd(i * 17 + 3) * (RX1 - RX0 - 12)), y = R(LAND + 8 + Math.pow(rnd(i * 17 + 4), 1.3) * 130), d = y - LAND; cosmos(g, x, y, d < 40 ? 1.6 : d < 90 ? 2.6 : 3.2, PETALS.white, i); }
  // stepping stones from the gate to the bottom edge
  for (const [x, y, rx, ry, i] of path()) stone(g, ...P(x, y), rx, ry, i);
  // the white picket fence with its gate, then the border in front of it
  picketFence(g, RX0, RX1 - 4, LAND, 46, [RX0 + GATE[0], RX0 + GATE[1]]);
  for (const px of [RX0 + 1, RX1 - 10]) { for (let yy = LAND - 54; yy < LAND; yy++) for (let xx = 0; xx < 7; xx++) g.px(px + xx, yy, xx === 0 || xx === 6 || yy === LAND - 54 ? "#5E5874" : xx < 3 ? "#FFFFFF" : xx > 4 ? "#C6C2D8" : "#F2F0F4"); }   // end post by the pond
  hydrangea(g, ...P(150, 646), 0.85, 3);
  for (const [x, h, p, s] of [[14, 120, PETALS.pink, 1], [34, 96, PETALS.magenta, 2], [522, 112, PETALS.pink, 3], [500, 88, PETALS.white, 4]]) hollyhock(g, ...P(x, 650), h, p, s);
  const border = [];
  for (let i = 0; i < 46; i++) { const x = 60 + rnd(i * 29 + 1) * 440; if (x > GATE[0] - 6 && x < GATE[1] + 6) continue; if (x > 120 && x < 186) continue; border.push([x, 638 + rnd(i * 29 + 2) * 16, i]); }
  border.sort((a, b) => a[1] - b[1]);
  for (const [x, y, i] of border) {
    const kind = rnd(i * 7 + 3);
    if (kind < 0.45) { const h = 22 + rnd(i * 5) * 26, sx = x + (rnd(i * 3) - 0.5) * 6; for (let j = 0; j <= h; j++) g.px(R(x + (sx - x) * (j / h) ** 2), R(y - j), "#3C7A34"); for (let j = 0; j < 4; j++) g.px(R(x + (rnd(i + j) - 0.5) * 8), R(y - h * (0.3 + j * 0.15)), "#5AA048"); cosmos(g, ...P(sx, y - h), 4 + rnd(i * 9) * 1.5, [PETALS.pink, PETALS.white, PETALS.magenta][i % 3], i); }
    else if (kind < 0.75) lavender(g, ...P(x, y), 16 + rnd(i * 11) * 10, i);
    else { const h = 10 + rnd(i) * 10; for (let j = 0; j <= h; j++) g.px(R(RX0 + x), R(y - 660 - j), "#2E6A2A"); leafShape(g, RX0 + x, y - 660 - 3, -0.4, 6, 2.5); leafShape(g, RX0 + x, y - 660 - 5, Math.PI + 0.4, 6, 2.5); zinnia(g, ...P(x, y - h), 4 + rnd(i * 13) * 1.5, [PETALS.orange, PETALS.scarlet, PETALS.yellow, PETALS.coral][i % 4], i); }
  }
  // flower beds left and right of the path: dark soil, a row of little edging stones, dense foliage, then flowers
  const bedL = (y) => 168 - (y - 790) * 0.2 + 6 * Math.sin(y * 0.05), bedR = (y) => 292 - (y - 770) * 0.12 + 5 * Math.sin(y * 0.06 + 1);
  const topL = (x) => 800 + 10 * Math.sin(x * 0.05) + x * 0.06, topR = (x) => 782 + 8 * Math.sin(x * 0.04 + 2) - (x - 292) * 0.02, bedE = (y) => 504 - (y - 780) * 0.08 + 4 * Math.sin(y * 0.07);   // the right bed ends before the pond seam
  for (let sy = 760; sy < 960; sy++) for (let sx = 0; sx < 540; sx++) {
    const inL = sx < bedL(sy) && sy > topL(sx), inR = sx > bedR(sy) && sx < bedE(sy) && sy > topR(sx); if (!inL && !inR) continue;
    const e = inL ? Math.min(bedL(sy) - sx, sy - topL(sx)) : Math.min(sx - bedR(sy), sy - topR(sx), bedE(sy) - sx), [wx, wy] = P(sx, sy);
    g.px(wx, wy, e < 2 ? "#3A2414" : e < 4 ? ((wx + wy) & 1 ? "#6A4A2C" : "#4E3420") : rnd(wx * 31 + wy * 17) < 0.12 ? "#7A5A38" : (wx * 3 + wy) % 7 === 0 ? "#3E2818" : "#5A3E26");
  }
  // edging stones along the bed borders (small, bigger toward the bottom)
  const edge = [];
  for (let sx = 2; sx < 176; sx += 0) { const sy = topL(sx), w = 6 + (sy - 790) * 0.04; edge.push([sx, sy, w]); sx += w * 1.9; }
  for (let sy = topL(150) + 4; sy < 975; sy += 0) { const sx = bedL(sy), w = 6 + (sy - 790) * 0.07; edge.push([sx, sy, w]); sy += w * 0.9; }
  for (let sy = topR(292) + 2; sy < 975; sy += 0) { const sx = bedR(sy), w = 6 + (sy - 780) * 0.07; edge.push([sx, sy, w]); sy += w * 0.9; }
  for (let sx = 300; sx < bedE(topR(sx)); sx += 0) { const sy = topR(sx), w = 6 + (sy - 780) * 0.04; edge.push([sx, sy, w]); sx += w * 1.9; }
  for (let sy = topR(500) + 3; sy < 975; sy += 0) { const sx = bedE(sy), w = 6 + (sy - 780) * 0.07; edge.push([sx, sy, w]); sy += w * 0.9; }
  edge.forEach(([sx, sy, w], i) => stone(g, ...P(sx, sy), w, w * 0.5, i * 3));
  const FOL = ["#0E2C14", "#163E1C", "#1E5224", "#28662C", "#347C36", "#46923E", "#5EA84C", "#7CBE5E"];
  const clumps = [];
  for (let i = 0; i < 110; i++) { const sy = 806 + Math.pow(rnd(i * 61 + 1), 0.75) * 170, sx = 2 + rnd(i * 61 + 2) * (bedL(sy) - 8); if (sx > 22 && sx < 146 && sy > 880 && sy < 912) continue; clumps.push([sx, sy]); }
  for (let i = 0; i < 170; i++) { const sy = 788 + Math.pow(rnd(i * 67 + 3), 0.75) * 190, sx = bedR(sy) + 8 + rnd(i * 67 + 4) * (bedE(sy) - 8 - bedR(sy)); clumps.push([sx, sy]); }
  clumps.sort((a, b) => a[1] - b[1]).forEach(([sx, sy], i) => { const sc = 0.4 + Math.pow(Math.max(0, sy - 780) / 190, 1.2) * 1.2; leafBall(f, ...P(sx, sy - 4 * sc), (6 + rnd(i * 5) * 4) * sc + 2, FOL, i * 7, { amp: 0.22, bumps: 7, sy: 0.8 }); });
  // FRONT: flowers on stems above the foliage, the watering can; much bigger toward the bottom edge
  const plant = (sx, sy, kind, i) => {
    const sc = 0.45 + Math.pow(Math.max(0, sy - 780) / 180, 1.3) * 1.15, [wx, wy] = P(sx, sy);
    if (kind === "zin") { const h = R(12 + 20 * sc); for (let j = 0; j <= h; j++) { f.px(wx, wy - j, "#2E6A2A"); f.px(wx + 1, wy - j, "#1E4E20"); } leafShape(f, wx, wy - R(h * 0.3), -0.35, 10 * sc, 4 * sc); leafShape(f, wx, wy - R(h * 0.55), Math.PI + 0.35, 9 * sc, 3.5 * sc); zinnia(f, wx, wy - h, 5 + 9 * sc, [PETALS.orange, PETALS.scarlet, PETALS.pink, PETALS.yellow, PETALS.coral][i % 5], i); }
    else if (kind === "cos") { const h = R(20 + 30 * sc); for (let j = 0; j <= h; j++) f.px(R(wx + Math.sin(j * 0.08 + i) * 1.5), wy - j, "#3C7A34"); for (let j = 0; j < 6; j++) { const ly = wy - R(h * (0.15 + j * 0.12)), lx = R(wx + Math.sin(ly * 0.08 + i) * 1.5); for (let k = 1; k < 5 * sc + 2; k++) f.px(lx + (j % 2 ? k : -k), ly - (k >> 1), "#52A044"); } cosmos(f, wx + R(Math.sin(h * 0.08 + i) * 1.5), wy - h, 6 + 9 * sc, [PETALS.pink, PETALS.white, PETALS.magenta][i % 3], i); }
    else if (kind === "lav") { for (let k = 0; k < 4; k++) lavender(f, wx + (k - 1.5) * 4 * sc, wy, R(22 + 32 * sc + rnd(i * 3 + k) * 10), i * 4 + k); }
  };
  const L = [], RB = [];
  for (let i = 0; i < 26; i++) { const sy = 812 + Math.pow(rnd(i * 41 + 1), 0.8) * 150, sx = 6 + rnd(i * 41 + 2) * (bedL(sy) - 14); L.push([sx, sy, i]); }
  for (let i = 0; i < 50; i++) { const sy = 798 + Math.pow(rnd(i * 43 + 5), 0.8) * 165, sx = bedR(sy) + 8 + rnd(i * 43 + 6) * (bedE(sy) - 14 - bedR(sy)); RB.push([sx, sy, i + 100]); }
  const all = [...L.map((p) => [...p, "L"]), ...RB.map((p) => [...p, "R"])].sort((a, b) => a[1] - b[1]);
  let canDone = false;
  for (const [sx, sy, i, side] of all) {
    if (!canDone && sy > 900) { wateringCan(f, CAN[0], CAN[1], 1.15); canDone = true; }
    if (side === "L" && sx > 10 && sx < 156 && sy > 884) continue;                     // nothing tall in front of the watering can
    const k = rnd(i * 13 + 7), kind = k < 0.36 ? "zin" : k < 0.68 ? "cos" : "lav";
    plant(sx, sy, kind, i);
  }
  if (!canDone) wateringCan(f, CAN[0], CAN[1], 1.15);
  // lush leaves along the bottom edge (in front of everything, not over the path)
  for (let i = 0; i < 14; i++) { const sx = (i + rnd(i * 5) * 0.6) * 40, [wx, wy] = P(sx, 972); if ((sx > 190 && sx < 285) || sx > 486) continue; leafShape(f, wx, wy, -Math.PI / 2 - 0.6 + rnd(i) * 1.2, 26 + rnd(i * 3) * 12, 9, FOL); }
}

// ---------------------------------------------------------------- per-frame plants (swaying) and the butterfly
const SWAY = [   // tall foreground stems that sway: [rest-screen x, foot y, height, kind, colour index, cycles over END]
  [432, 968, 150, "cos", 0, 41], [470, 975, 126, "cos", 1, 37], [352, 972, 110, "cos", 2, 43], [400, 990, 94, "lav", 0, 47], [314, 968, 92, "lav", 0, 39],
  [150, 980, 118, "cos", 2, 44], [116, 984, 84, "lav", 0, 38], [12, 962, 136, "cos", 1, 46],
];
function swayPlants(d, V, t, gr) {
  const COS = [PETALS.pink, PETALS.white, PETALS.magenta];
  for (const [sx, sy, h, kind, ci, n] of SWAY) {
    const [wx, wy] = S(sx, sy), x = V.X(wx), y = V.Y(wy); if (x < -40 || x > 580) continue;
    const sw = osc(t, END, n, sx * 0.1) * 4 + osc(t, END, n * 2 + 1, sy) * 1.2;
    if (kind === "lav") { for (let k = 0; k < 3; k++) lavender(d, R(x + (k - 1) * 5), R(y), R(h - k * 12), 900 + sx + k, sw * (1 - k * 0.2)); continue; }
    for (let j = 0; j <= h; j++) { const k = j / h, px = R(x + sw * k * k); d.px(px, R(y - j), "#2E6A2A"); d.px(px + 1, R(y - j), j % 11 < 5 ? "#3E8238" : "#2E6A2A"); }
    for (let j = 1; j < 5; j++) { const k = 0.2 + j * 0.14, ly = R(y - h * k), lx = R(x + sw * k * k); for (let q = 1; q < 10; q++) d.px(lx + (j % 2 ? q : -q), ly - (q >> 1) - (q > 6 ? 1 : 0), "#4A9640"); }
    cosmos(d, x + sw, y - h, 15 + (h > 130 ? 3 : 0), COS[ci], sx);
  }
}

// a drip from the watering can's rose: forms, falls into the bed and dissolves (periodic, 5 cycles over the film)
const DRIP_N = Math.round(END / 3.4);
function drip(d, V, t) {
  const k = ((t * DRIP_N) / END) % 1, [rx, ry] = S(CAN[0] - RX0 + 101, CAN[1] + 660 - 46);
  const x = R(V.X(rx)), y0 = V.Y(ry); if (x < -10 || x > 550) return;
  if (k < 0.55) { const s = k / 0.55, a = sm(s, 0, 0.3); fade(d, a).px(x, R(y0 + s * 2), "#BFEFFF"); if (s > 0.5) fade(d, a).px(x, R(y0 + s * 2) + 1, "#7FD0F0"); }
  else if (k < 0.8) { const s = (k - 0.55) / 0.25, y = y0 + 3 + s * s * 46, g = fade(d, 1 - sm(s, 0.85, 1)); g.px(x, R(y), "#BFEFFF"); g.px(x, R(y) + 1, "#7FD0F0"); g.px(x, R(y) - 1, "#E8FCFF"); }
}

const N_BOB = 29, N_TILT = 17, N_LOOK = 7;
/** butterfly state at t (pure; periodic idle + the beat) */
export function butterflyState(t) {
  const ph = wingPhase("butterfly", t), amt = strokeAmt("butterfly", t), e = Math.cos(2 * Math.PI * ph) * amt;
  const smear = [Math.cos(2 * Math.PI * (ph - 1 / 12)) * amt, Math.cos(2 * Math.PI * (ph - 1 / 6)) * amt];
  const x = BF[0] + osc(t, END, N_LOOK + 4, 0.6) * 3, y = BF[1] + osc(t, END, N_BOB) * 3 + e * 1.2;
  return { x, y, e, smear, tilt: 0.04 * osc(t, END, N_TILT, 1.1), look: [0.35 * osc(t, END, N_LOOK, 2.0), 0.15 * osc(t, END, N_LOOK + 2)] };
}

// ---------------------------------------------------------------- module passes
const off = (V) => V.x1 < RX0 - 140 || V.x0 > RX1 + 140;
export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  BACK.blit(c, V, { grade: grade(tod(V.cx)) });
}
export function actors(c, V, t) {
  if (off(V)) return;
  const gr = grade(tod(V.cx)), view = gr ? gradeView(c) : null, d = view ? view.g : c;
  sign(d, R(V.X(SIGN[0])), R(V.Y(SIGN[1])), "LV 3", "wood", 1, t);
  const st = butterflyState(t), joy = win(t, EV.ten - 0.05, EV.ten + 0.9, 0.2, 0.4);
  drawButterfly(d, V.X(st.x), V.Y(st.y), { e: st.e, smear: st.smear, smearA: 0.28, tilt: st.tilt, look: st.look, blink: blinkAt(t, END / 17, 1.3), open: 0.25 + 0.5 * joy, antSway: 3 * osc(t, END, 23) - st.e * 1.5 });
  view?.apply(gr);
}
export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  const gr = grade(tod(V.cx));
  FRONT.blit(c, V, { grade: gr });
  const view = gr ? gradeView(c) : null, d = view ? view.g : c;
  swayPlants(d, V, t, gr); drip(d, V, t);
  view?.apply(gr);
}
export { clamp01 };
