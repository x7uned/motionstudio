// LV9 · porch (mosquito, 500 beats/s) — a wooden house porch at dusk (tod ≈ 5.0) under the red dusk sun.
// Left: the house corner (blue clapboard, a warm lit window with curtains and a cat on the sill, a wall lantern, a
// shingled awning), the channel's hero relaxing on a bench with a mug. Right of the house the deck runs on with a white
// railing and a newel post carrying a thermometer; behind it dusk hills, a tree line and a neighbour's lit windows; the
// yard ends at a picket fence where the marsh reeds begin (LV10). Floor boards in front, then three steps down to the
// bottom edge between lattice skirting, potted plants and big leaves in the foreground.
// Story: "That's the whine in your ear" → the mosquito drifts to the hero's ear (smaller with depth), he winces and
// swats lazily, she dodges back to the sun. "On a warm night it gets even higher" → the thermometer's red column rises.
// Rest camera (4590, −180): screen = (wx − 4320, wy + 660). All art is drawn in those rest-screen coordinates.
import { BIOME, LAND, EV, END, wingPhase, strokeAmt } from "../timeline.mjs";
import { tod } from "../world.mjs";
import { sign, fade, mix, bayer, sm, ease, win, lerp, rnd, blinkAt, clamp01, leafPoly } from "./porch-kit.mjs";
import { Layer, grade, osc, cyc, grassAt, GRASS, tuft, flower, leafBall } from "./meadow-kit.mjs";
import { drawMosquito } from "./porch-mosquito.mjs";
import { drawSitHero } from "./porch-hero.mjs";
import { paintLawn, firefly, paintDuskHills, clipX } from "./porch-kit.mjs";
import { T } from "./porch-motions.mjs";

export const RANGE = BIOME.porch;
const R = Math.round, OX = RANGE[0], OY = -660, W = RANGE[1] - RANGE[0];
const X = (V, x) => R(V.X(OX + x)), Y = (V, y) => R(V.Y(OY + y));

// ---------------------------------------------------------------- palette (dusk)
const SID = ["#161830", "#1E2240", "#272C52", "#313863", "#3C4574", "#4A5484", "#5C6696", "#707CAA"];   // blue clapboard
const TRIM = ["#2A2640", "#3E3858", "#565074", "#706A90", "#8C86AA", "#A8A2C2", "#C4BED8", "#DCD8EA"];  // white paint at dusk
const WOOD = ["#1E1218", "#2E1C22", "#42282C", "#583634", "#70463E", "#8A584A", "#A66E58", "#C48A6C"];  // deck & bench
const SHIN = ["#160E1C", "#22142A", "#301C38", "#3E2446", "#4E2E56", "#603A66"];
const POT = ["#3A1A14", "#5E2A1E", "#86402A", "#AA5A36", "#C67648", "#DA9462"];
const LEAF = ["#0E1A1E", "#142428", "#1C3032", "#243C3C", "#2E4A46", "#3A5A50", "#4A6C5A", "#5E8066"];
const WARM = "#F6A45A", GLASS = ["#FFF4C8", "#FFE29A", "#FFC874", "#F6A456", "#E08446"];
const LAMP = [22, 372];                                                 // lantern glass centre
const HERO = [100, 639], HS = 1.15;                                     // hero floor point, scale
const MOSQ = [270, 350];                                                // mosquito head at rest
const THERMO = { x: 437, top: 514, bulb: 604 };                          // on the newel post
export const SIGN = [244, 638];

// warm light falloff from the lantern and the window (0..1)
const lampK = (x, y) => clamp01(1 - Math.hypot((x - LAMP[0]) * 0.9, (y - LAMP[1]) * 1.1) / 190) ** 1.5;
const winK = (x, y) => (y > 430 ? clamp01(1 - Math.hypot((x - 98) / 120, (y - 430) / 260)) ** 1.4 * 0.8 : 0);
/** mix a colour toward warm lamplight by k, quantised in 4 steps with ordered dither */
function warm(col, k, x, y, hue = WARM, max = 0.62) { if (k <= 0.01) return col; const s = k * 4, lo = Math.floor(s), q = (s - lo > bayer(x, y) ? lo + 1 : lo) / 4; return q > 0 ? mix(col, hue, q * max) : col; }
const pick = (ramp, v, x, y) => { const lo = Math.floor(v), f = v - lo; return ramp[Math.max(0, Math.min(ramp.length - 1, f > 0.5 + 0.4 * (bayer(x, y) - 0.5) ? lo + 1 : lo))]; };

// ---------------------------------------------------------------- static layers
let BACK = null, LAWN = null, FRONT = null;
const deckL = (y) => 10 - (y - 640) * 0.1, deckR = (y) => 446 + (y - 640) * 0.19;
const BOARDS = [640, 650, 661, 673, 686, 700, 715, 731, 748, 766, 784, 800];
const STEPS = [[812, 826, 852], [852, 868, 898], [898, 916, 950]];      // [riser top, tread top, tread bottom]
const stepL = (y) => 198 - (y - 812) * 0.14, stepR = (y) => 382 + (y - 812) * 0.14;

function build() {
  BACK = new Layer(OX, OY, OX + W + 20, OY + 960); LAWN = new Layer(OX, OY, OX + W, OY + 960); FRONT = new Layer(OX, OY, OX + W + 20, OY + 960);
  const g = BACK.c, f = FRONT.c;
  // ---- the yard lawn (graded with the time of day like the neighbours' meadows), left sliver and right yard
  paintLawn(LAWN.c, 0, W, 640, 960, (x, y) => x < deckL(y) - 1 || x > (y < 813 ? deckR(y) + 1 : deckR(800) + 2 + (y - 813) * 0.05) || y > 950);
  // ---- far hills, a tree line and a neighbour's house behind the deck (right of the house corner)
  paintDuskHills(g, 186, W, OX);
  // neighbour's house (far, small): roof, two lit windows, a chimney
  { const hx = 330, hy = 600; g.poly([[hx - 26, hy - 26], [hx, hy - 44], [hx + 26, hy - 26]], "#3A2242"); g.line(hx - 26, hy - 26, hx, hy - 44, "#6E3A68"); g.rect(hx - 22, hy - 26, 44, 30, "#40264A"); g.rect(hx + 10, hy - 46, 5, 12, "#3A2242");
    for (const wx of [hx - 15, hx + 5]) { g.rect(wx, hy - 19, 9, 8, "#FFC874"); g.rect(wx + 1, hy - 18, 7, 3, "#FFE29A"); g.rect(wx + 4, hy - 19, 1, 8, "#C87A3A"); } }
  const TREE = ["#1E1028", "#281634", "#321C40", "#3E244C", "#4A2C58", "#5A3666"];
  for (let i = 0; i < 26; i++) {
    const x = 196 + rnd(i * 7 + 3) * (W - 190), r = 10 + rnd(i * 5 + 1) * 13; if (Math.abs(x - 330) < 40) continue;
    const y = 640 - r * 0.6 - rnd(i * 3) * 10;
    leafBall(g, x, y, r, TREE, i * 3 + 1, { amp: 0.14, bumps: 7, outline: "#140A1C" });
  }
  // a taller tree at the far right (frames the yard), trunk behind the fence
  g.rect(520, 560, 4, 80, "#22142A"); for (const [dx, dy, r] of [[0, -96, 22], [-14, -76, 18], [14, -78, 20], [0, -62, 20]]) leafBall(g, 522 + dx, 640 + dy, r, TREE, dx + dy, { amp: 0.15, bumps: 8, outline: "#140A1C" });
  // ---- the house corner: clapboard wall lit by the lantern and the window
  for (let y = 100; y < 640; y++) for (let x = 0; x < 186; x++) {
    const r = (y - 100) % 7; let v = 3.6 - (y - 100) / 900;
    if (r === 0) v += 1.1; else if (r === 6) v -= 1.4; else if (r === 5) v -= 0.5;
    v += x > 170 ? -0.3 : 0;
    g.px(x, y, warm(pick(SID, v, x, y), lampK(x, y) * 1.15 + winK(x, y) * 0.5 + 0.18 * clamp01(1 - Math.abs(y - 376) / 70) * clamp01(1 - Math.abs(x - 98) / 70), x, y));
  }
  // the main roof: a little hip roof (the house is a small two-storey cottage), gutter line, an upper window
  for (let y = 34; y < 100; y++) { const k = (y - 34) / 66, xa = R(lerp(56, -6, k)), xb = R(lerp(144, 206, k));
    for (let x = Math.max(0, xa); x < Math.min(W, xb); x++) {
      const row = Math.floor((y - 34) / 8), ry = (y - 34) % 8, tx = (x + (row % 2) * 6) % 12, edge = x === Math.max(0, xa) || x === xb - 1;
      g.px(x, y, y > 96 ? (y === 99 ? "#0E0812" : TRIM[2]) : edge ? "#9A5A80" : pick(SHIN, 2.2 + (ry < 2 ? 1 : 0) - (ry > 5 ? 1 : 0) - (tx === 0 ? 1 : 0) + (rnd(Math.floor((x + (row % 2) * 6) / 12) * 7 + row) - 0.5) * 0.7 - k * 0.5 + (x > xb - 10 ? 0.8 : 0), x, y));
    } }
  for (let x = 56; x < 144; x++) g.px(x, 34, x % 3 ? "#7A4A70" : "#9A5A80");
  g.rect(118, 18, 12, 18, "#2A1A30"); g.rect(118, 18, 12, 2, "#4A2E4A"); g.rect(116, 16, 16, 3, "#3A2440"); g.rect(128, 18, 2, 18, "#6E3A68");
  for (let y = 124; y < 196; y++) for (let x = 64; x < 134; x++) { const fr = x < 68 || x > 129 || y < 128 || y > 191 || (x >= 97 && x <= 100) || (y >= 158 && y <= 160); g.px(x, y, fr ? (x < 66 || y < 126 ? TRIM[5] : TRIM[3]) : y < 140 ? "#3A2E5A" : (x + y) % 9 === 0 ? "#5A4A7A" : "#2E2650"); }
  for (let y = 100; y < 640; y++) for (let x = 0; x < 5; x++) g.px(x, y, x === 0 ? TRIM[1] : x === 4 ? TRIM[1] : warm(TRIM[3], lampK(x, y) * 0.8, x, y));
  // corner board (its right face catches the red sky), sill board
  for (let y = 100; y < 640; y++) { for (let x = 184; x < 194; x++) g.px(x, y, x > 190 ? (x === 193 ? TRIM[2] : TRIM[5]) : x === 184 ? TRIM[1] : TRIM[3]); }
  for (let x = 0; x < 194; x++) for (let y = 628; y < 640; y++) g.px(x, y, warm(y === 628 ? TRIM[4] : y > 637 ? TRIM[1] : TRIM[2], lampK(x, y) * 0.8, x, y));
  // shingled awning with a fascia board and two corbels
  for (let y = 226; y < 262; y++) for (let x = 0; x < 206; x++) {
    const row = Math.floor((y - 226) / 9), ry = (y - 226) % 9, tab = Math.floor((x + (row % 2) * 7) / 14), tx = (x + (row % 2) * 7) % 14;
    let v = 2.6 + (ry < 2 ? 1 : 0) - (ry > 6 ? 1.2 : 0) + (rnd(tab * 13 + row) - 0.5) * 0.8 - (tx === 0 ? 1.2 : 0);
    g.px(x, y, warm(pick(SHIN, v, x, y), lampK(x, y + 40) * 0.6, x, y));
  }
  for (let x = 0; x < 208; x++) { g.px(x, 225, "#120A16"); for (let y = 262; y < 270; y++) g.px(x, y, y === 262 ? TRIM[5] : y === 269 ? TRIM[0] : warm(TRIM[3], lampK(x, y) * 0.7, x, y)); }
  g.rect(206, 225, 2, 45, TRIM[1]);
  for (const cx of [12, 172]) { for (let y = 270; y < 298; y++) { const w = R(5 - (y - 270) * 0.12); for (let x = cx - w; x <= cx + w; x++) g.px(x, y, x === cx - w ? TRIM[4] : x === cx + w ? TRIM[1] : warm(TRIM[3], lampK(x, y) * 0.7, x, y)); } g.rect(cx - 2, 298, 5, 2, TRIM[1]); }
  // the window: frame, warm interior with curtains, a lamp, a plant and a cat on the inner sill
  window_(g);
  // the wall lantern (static metal + glass; its glow halo is drawn per frame)
  lantern(g);
  // ---- the deck: floor boards (lamplight near the house, cool dusk to the right), front beam, right side face
  for (let b = 0; b < BOARDS.length - 1; b++) {
    const y0 = BOARDS[b], y1 = BOARDS[b + 1], seed = b * 31 + 7, joints = [];
    for (let k = 0; k < 6; k++) joints.push(R(rnd(seed + k) * 140 + k * 100 - 40));
    for (let y = y0; y < y1; y++) for (let x = R(deckL(y)); x <= R(deckR(y)); x++) {
      const k = (y - y0) / (y1 - y0); let v = 4.1 + (rnd(seed) - 0.5) * 0.7 - (y - 640) / 400;
      if (y === y0) v -= 1.6; else if (y === y0 + 1) v += 0.9; else if (k > 0.82) v -= 0.6;
      if (joints.some((j) => Math.abs(x - (j + (y - 640) * 0.1)) < 0.6)) v -= 1.4;
      const grain = Math.sin(x * 0.11 + seed) * Math.sin(x * 0.031 + seed * 2) > 0.55 ? -0.4 : 0;
      const lk = clamp01(1 - Math.hypot((x - 70) / 260, (y - 640) / 210)) ** 1.3 * 0.9 + winK(x, y) * 0.45;
      g.px(x, y, warm(pick(WOOD, v + grain, x, y), lk, x, y));
    }
  }
  for (let y = 800; y < 813; y++) for (let x = R(deckL(y)) - 1; x <= R(deckR(y)) + 1; x++) g.px(x, y, y < 802 ? WOOD[6] : y > 810 ? WOOD[0] : warm(WOOD[3], clamp01(1 - Math.abs(x - 80) / 260) * 0.5, x, y));
  for (let y = 640; y < 813; y++) { const x0 = R(deckR(y)) + 1, h = R(3 + (y - 640) * 0.06); for (let x = x0; x <= x0 + 1; x++) g.px(x, y, WOOD[2]); for (let j = 1; j <= h; j++) g.px(x0 + 2, y + j, WOOD[1]); }
  // ---- steps down to the bottom edge between lattice skirting
  lattice(g, -10, 813, 960, (y) => stepL(y) - 2);
  lattice(g, (y) => stepR(y) + 2, 813, 960, (y) => deckR(800) + 2 + (y - 813) * 0.05);
  for (const [r0, t0, t1] of STEPS) {
    for (let y = r0; y < t0; y++) for (let x = R(stepL(y)); x <= R(stepR(y)); x++) g.px(x, y, y === r0 ? WOOD[0] : pick(WOOD, 1.7 + (y - r0) / (t0 - r0) * 0.8, x, y));      // riser in shadow
    for (let y = t0; y < t1; y++) for (let x = R(stepL(y)); x <= R(stepR(y)); x++) {                                                                                   // tread
      const k = (y - t0) / (t1 - t0); let v = 4.4 - k * 0.9 + (y < t0 + 2 ? 1.6 : 0); if ((x - 198) % 61 === 0 && y > t0 + 2) v -= 1.2;
      g.px(x, y, warm(pick(WOOD, v, x, y), clamp01(1 - Math.abs(x - 210) / 200) * 0.35 * (1 - k * 0.5), x, y, "#F09A6A", 0.5));
    }
    for (let y = r0; y < t1; y++) { g.px(R(stepL(y)) - 1, y, WOOD[0]); g.px(R(stepR(y)) + 1, y, WOOD[0]); }
  }
  for (let y = 950; y < 960; y++) for (let x = R(stepL(y)); x <= R(stepR(y)); x++) g.px(x, y, pick(WOOD, 1.6, x, y));
  // ---- railing behind the deck (house corner → newel post), the newel post with a ball finial
  for (let x = 196; x < 434; x++) { for (let y = 582; y < 590; y++) g.px(x, y, y === 582 ? TRIM[6] : y === 583 ? TRIM[5] : y > 587 ? TRIM[1] : TRIM[3]); for (let y = 628; y < 633; y++) g.px(x, y, y === 628 ? TRIM[4] : TRIM[2]); }
  for (let x = 202; x < 430; x += 11) for (let y = 590; y < 628; y++) for (let i = 0; i < 4; i++) g.px(x + i, y, i === 0 ? TRIM[5] : i === 3 ? TRIM[1] : TRIM[3]);
  for (let y = 560; y < 640; y++) for (let x = 194; x < 201; x++) g.px(x, y, x === 194 ? TRIM[1] : x === 200 ? TRIM[2] : TRIM[4]);
  g.rect(193, 556, 9, 4, TRIM[5]);
  for (let y = 500; y < 640; y++) for (let x = 430; x < 445; x++) g.px(x, y, x === 430 ? TRIM[2] : x > 441 ? (x === 444 ? TRIM[1] : TRIM[6]) : x < 433 ? TRIM[3] : TRIM[4]);
  for (let y = 492; y < 500; y++) for (let x = 427; x < 448; x++) g.px(x, y, y === 492 ? TRIM[6] : y === 499 ? TRIM[1] : x > 444 ? TRIM[6] : TRIM[4]);
  for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) { const d = Math.hypot(xx, yy); if (d <= 6) g.px(437 + xx, 484 + yy, d > 5.2 ? TRIM[1] : xx + yy < -3 ? TRIM[7] : xx > 2 || yy > 2 ? TRIM[3] : TRIM[5]); }
  // ---- picket fence at the end of the yard (where the marsh begins)
  for (let x = 452; x < 538; x++) { for (const ry of [602, 626]) for (let y = ry; y < ry + 4; y++) g.px(x, y, y === ry ? TRIM[4] : TRIM[2]); }
  for (let x = 454; x < 536; x += 9) for (let y = 590; y < 642; y++) for (let i = 0; i < 6; i++) { const top = 590 + Math.abs(i - 2.5) * 1.2; if (y < top) continue; g.px(x + i, y, i === 0 ? TRIM[2] : i === 5 ? TRIM[1] : i < 3 ? TRIM[4] : TRIM[3]); }
  for (let y = 582; y < 644; y++) for (let x = 532; x < 540; x++) g.px(x, y, x === 532 ? TRIM[2] : x > 537 ? TRIM[5] : TRIM[3]);
  g.rect(531, 578, 10, 4, TRIM[5]);
  // ---- the bench (lamplit wood) and a mug on it
  bench(g);
  // ---- potted plant on the deck by the house corner, little pots on the window sill
  pot(g, 218, 646, 30, 26); fern(g, 218, 622, 1);
  // ---- a braided rug in front of the bench and a watering can by the newel post
  for (let y = 650; y < 700; y++) for (let x = 20; x < 190; x++) {
    const d = Math.hypot((x - 104) / 80, (y - 672) / 17); if (d > 1) continue;
    const ring = Math.floor(d * 7), tw = ((x + (y % 2) * 2) >> 1) % 2; const cols = ["#C8706A", "#5A7A8C", "#E0A060", "#8A4A6A", "#4A6878", "#C8706A", "#6A3A54"];
    g.px(x, y, d > 0.96 ? "#3A1E2A" : warm(tw ? cols[ring] : mix(cols[ring], "#000000", 0.18), clamp01(1 - Math.hypot((x - 70) / 200, (y - 640) / 120)) * 0.6, x, y));
  }
  wateringCan(g, 404, 662);
  // ---- foreground: hydrangea bushes at both bottom corners, a geranium pot, grass by the fence
  hydrangea(f, 60, 930, 1.25, 1, ["#3E3E8A", "#5A5AB0", "#7E7ED0", "#A8A6EA", "#D0CCF8"]);
  hydrangea(f, 520, 950, 1.0, 2, ["#6A2E6A", "#9A4A8E", "#C46AAE", "#E094C8", "#F6C4E2"]);
  pot(f, 436, 962, 60, 42); geranium(f, 436, 922);
  for (let i = 0; i < 9; i++) tuft(f, R(470 + rnd(i * 5) * 70), R(908 + rnd(i * 3) * 30), 14 + rnd(i) * 12, 5, ["#1E3226", "#284234", "#36543E"], i * 7, (rnd(i * 9) - 0.5) * 6);
}

function window_(g) {
  const x0 = 42, x1 = 154, y0 = 312, y1 = 430;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g.px(x, y, x < x0 + 2 || y < y0 + 2 ? TRIM[6] : x > x1 - 3 || y > y1 - 3 ? TRIM[2] : warm(TRIM[4], 0.5, x, y));
  const gx0 = 50, gx1 = 146, gy0 = 320, gy1 = 422;
  for (let y = gy0; y < gy1; y++) for (let x = gx0; x < gx1; x++) {
    const v = (y - gy0) / (gy1 - gy0); let col = v < 0.3 ? GLASS[1] : v < 0.62 ? (v - 0.3) / 0.32 > bayer(x, y) ? GLASS[2] : GLASS[1] : v < 0.85 ? GLASS[2] : GLASS[3];
    const lamp = Math.hypot(x - 98, y - 344); if (lamp < 18) col = lamp < 10 ? GLASS[0] : (18 - lamp) / 8 > bayer(x, y) ? GLASS[0] : col;
    g.px(x, y, col);
  }
  // hanging lamp inside, a back wall shelf line, plant at the left, the cat on the inner sill at the right
  g.line(98, gy0, 98, 334, "#B8703A"); g.poly([[90, 340], [98, 333], [106, 340]], "#C0682E"); g.rect(90, 340, 17, 2, "#8A4A26");
  g.rect(gx0, 396, gx1 - gx0, 2, "#E89A52");
  { const px = 62; g.rect(px - 6, 408, 12, 12, "#C66A3C"); g.rect(px - 7, 406, 14, 3, "#D88048"); for (const [dx, dy, r] of [[-5, 398, 6], [5, 396, 6], [0, 390, 7]]) for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) g.px(px + dx + xx, dy + yy, (xx + yy) < -3 ? "#7A8A3A" : "#5A6A2A"); }
  { const cx = 128, cy = 418, K = "#2A1830"; for (let yy = -16; yy <= 0; yy++) { const half = R(7 * Math.sqrt(Math.max(0, 1 - ((yy + 6) / 11) ** 2)) + (yy > -4 ? 2 : 0)); g.rect(cx - half, cy + yy, half * 2 + 1, 1, K); }
    for (let yy = -26; yy <= -15; yy++) { const half = R(6 * Math.sqrt(Math.max(0, 1 - ((yy + 20) / 6.5) ** 2))); g.rect(cx - half, cy + yy, half * 2 + 1, 1, K); }
    g.poly([[cx - 6, cy - 23], [cx - 5, cy - 31], [cx - 1, cy - 25]], K); g.poly([[cx + 6, cy - 23], [cx + 5, cy - 31], [cx + 1, cy - 25]], K);
    for (let i = 0; i < 12; i++) g.px(cx + 8 + R(Math.sin(i * 0.4) * 3) + R(i * 0.3), cy - i, K); g.px(cx - 3, cy - 21, "#F4D060"); g.px(cx + 2, cy - 21, "#F4D060"); }
  // curtains (rose, gathered at the sides) and the mullions
  for (const [xa, xb, sd] of [[gx0, gx0 + 20, -1], [gx1 - 20, gx1, 1]]) for (let y = gy0; y < gy1; y++) {
    const pinch = y > 372 && y < 384 ? 0.55 : y > 384 ? 0.55 + (y - 384) / 80 : 1, w = (xb - xa) * pinch;
    for (let x = xa; x < xb; x++) { const u = sd < 0 ? x - xa : xb - 1 - x; if (u > w) continue; const fold = Math.sin(u * 0.9 + y * 0.02) > 0.3; g.px(x, y, u > w - 1.2 ? "#7A2840" : fold ? "#E07A8C" : "#C45470"); }
  }
  for (let y = gy0; y < gy1; y++) { g.px(97, y, TRIM[3]); g.px(98, y, TRIM[5]); g.px(99, y, TRIM[2]); }
  for (let x = gx0; x < gx1; x++) { g.px(x, 369, TRIM[5]); g.px(x, 370, TRIM[3]); g.px(x, 371, TRIM[2]); }
  // outside sill with two tiny flower pots
  for (let y = 430; y < 438; y++) for (let x = 36; x < 160; x++) g.px(x, y, y === 430 ? TRIM[7] : y > 435 ? TRIM[1] : warm(TRIM[4], 0.4, x, y));
  for (const [px, col] of [[58, "#F27A9A"], [136, "#F4CA50"]]) { g.rect(px - 5, 421, 11, 9, POT[3]); g.rect(px - 6, 419, 13, 3, POT[4]); g.rect(px + 3, 422, 2, 7, POT[2]); for (const [dx, dy] of [[-3, 414], [1, 411], [4, 415], [-1, 416]]) { g.rect(px + dx - 1, dy, 3, 3, col); g.px(px + dx, dy + 1, "#FFF2C8"); } for (const dx of [-2, 2]) g.rect(px + dx, 416, 1, 4, "#3A5A3A"); }
}

function lantern(g) {
  const [cx, cy] = LAMP, M = "#14101C", M2 = "#2E2838";
  g.rect(cx - 9, cy - 2, 2, 4, M); g.rect(cx - 12, cy - 10, 4, 22, M2); g.rect(cx - 12, cy - 10, 1, 22, "#4A4258");     // wall plate + arm
  g.poly([[cx - 9, cy - 13], [cx, cy - 20], [cx + 9, cy - 13]], M); g.rect(cx - 10, cy - 13, 21, 3, M2); g.rect(cx - 1, cy - 24, 3, 4, M);
  for (let y = cy - 10; y < cy + 12; y++) for (let x = cx - 7; x <= cx + 7; x++) {
    const edge = x === cx - 7 || x === cx + 7 || x === cx; let col = Math.hypot(x - cx, y - cy - 2) < 4 ? GLASS[0] : Math.hypot(x - cx, y - cy - 2) < 7 ? GLASS[1] : GLASS[2];
    g.px(x, y, edge ? M : col);
  }
  g.rect(cx - 9, cy + 12, 19, 3, M2); g.rect(cx - 2, cy + 15, 5, 2, M);
}

function bench(g) {
  const L = 20, Rr = 182;
  const lit = (x, y, v) => warm(pick(WOOD, v, x, y), clamp01(1 - Math.hypot((x - 30) / 200, (y - 400) / 300)) * 0.9, x, y);
  for (const [y0, y1] of [[540, 552], [558, 570]]) for (let y = y0; y < y1; y++) for (let x = L + 4; x < Rr - 4; x++) g.px(x, y, lit(x, y, y === y0 ? 6 : y === y1 - 1 ? 2 : 4.4));
  for (const px of [L + 4, Rr - 11]) for (let y = 532; y < 604; y++) for (let x = px; x < px + 7; x++) g.px(x, y, lit(x, y, x === px ? 6 : x === px + 6 ? 2.2 : 4.2));
  for (let y = 592; y < 606; y++) for (let x = L; x < Rr; x++) g.px(x, y, lit(x, y, y < 594 ? 6.2 : y < 598 ? 5.2 : y === 598 ? 6.4 : y > 604 ? 1.5 : 3.6));
  for (const px of [L + 4, Rr - 11]) for (let y = 606; y < 648; y++) for (let x = px; x < px + 7; x++) g.px(x, y, lit(x, y, x === px ? 5.2 : x === px + 6 ? 1.8 : 3.4));
  for (const [ax, sd] of [[L - 2, -1], [Rr - 14, 1]]) { for (let y = 574; y < 580; y++) for (let x = ax; x < ax + 16; x++) g.px(x, y, lit(x, y, y === 574 ? 6.4 : y === 579 ? 2 : 4.6)); }
  for (let x = L + 8; x < Rr - 8; x++) { const yy = R(642 + Math.sin(x * 0.2) * 0.5); g.px(x, yy, "#1A1014"); g.px(x, yy + 1, mix("#1A1014", WOOD[3], 0.5)); }
  // mug (coral, a white heart) on the seat
  const mx = 156, my = 592; g.rrect(mx - 6, my - 13, 13, 13, "#5A1A2E", 2); g.rrect(mx - 5, my - 12, 11, 11, "#E0565A", 1); g.rect(mx - 5, my - 12, 11, 2, "#F08070"); g.rect(mx - 5, my - 12, 2, 10, "#F8A890");
  g.rect(mx + 6, my - 10, 3, 1, "#5A1A2E"); g.rect(mx + 8, my - 10, 1, 6, "#5A1A2E"); g.rect(mx + 6, my - 5, 3, 1, "#5A1A2E"); g.px(mx - 1, my - 7, "#FFE2EA"); g.px(mx + 1, my - 7, "#FFE2EA"); g.rect(mx - 1, my - 6, 3, 1, "#FFE2EA"); g.px(mx, my - 5, "#FFE2EA");
  g.rect(mx - 4, my - 13, 9, 1, "#3A1A10");
}

function lattice(g, xa, y0, y1, xb) {
  const A = typeof xa === "function" ? xa : () => xa, B = typeof xb === "function" ? xb : () => xb;
  for (let y = y0; y < y1; y++) for (let x = R(A(y)); x <= R(B(y)); x++) {
    const d1 = ((x + y) % 14 + 14) % 14, d2 = ((x - y) % 14 + 14) % 14;
    g.px(x, y, d1 < 2 ? (d1 === 0 ? TRIM[3] : TRIM[2]) : d2 < 2 ? (d2 === 0 ? TRIM[2] : TRIM[1]) : y < y0 + 3 ? "#0A0610" : "#140C1A");
  }
}
function pot(g, cx, by, w, h) {
  for (let y = by - h; y < by; y++) { const k = (y - (by - h)) / h, half = (w / 2) * (1 - k * 0.18); for (let x = R(cx - half); x <= R(cx + half); x++) { const u = (x - cx) / half; g.px(x, y, y < by - h + 4 ? (y === by - h ? POT[5] : POT[4]) : u < -0.82 ? POT[1] : u > 0.6 ? POT[1] : u < -0.4 ? POT[4] : POT[3]); } }
  g.rect(R(cx - w / 2) - 1, by - h + 3, w + 3, 1, POT[0]);
}
function fern(g, cx, by, s) {
  for (let i = 0; i < 11; i++) {
    const an = -Math.PI / 2 + (i - 5) * 0.28, len = (40 - Math.abs(i - 5) * 3) * s;
    for (let j = 0; j < len; j++) { const u = j / len, bend = u * u * 14 * Math.sign(i - 5 || 1), x = cx + Math.cos(an) * j + bend * 0.6, y = by + Math.sin(an) * j + u * u * 10; g.px(R(x), R(y), LEAF[3]);
      if (j % 3 === 0 && j > 3) { const w = (1 - u) * 6 + 1; for (const sd of [-1, 1]) for (let k = 1; k <= w; k++) g.px(R(x + sd * k * Math.cos(an + 1.2)), R(y + sd * k * Math.sin(an + 1.2) + k * 0.3), k < 2 ? LEAF[4] : sd < 0 ? LEAF[6] : LEAF[5]); } }
  }
}
function hydrangea(g, cx, by, sc, seed, FL) {
  for (let i = 0; i < 14; i++) { const x = cx + (rnd(seed * 50 + i) - 0.5) * 170 * sc, y = by - 10 - rnd(seed * 50 + i + 20) * 70 * sc; leafBall(g, x, y, (16 + rnd(i * 3 + seed) * 10) * sc, LEAF.slice(1, 8), i * 7 + seed, { amp: 0.2, bumps: 7, outline: LEAF[0] }); }
  for (let i = 0; i < 9; i++) {
    const x = cx + (rnd(seed * 70 + i) - 0.5) * 150 * sc, y = by - 30 * sc - rnd(seed * 70 + i + 30) * 80 * sc, r = (11 + rnd(i * 5 + seed) * 6) * sc;
    for (let Y = R(y - r); Y <= R(y + r); Y++) for (let X = R(x - r); X <= R(x + r); X++) { const d = Math.hypot(X - x, Y - y) / r; if (d > 1) continue; g.px(X, Y, d > 0.9 ? FL[0] : pick(FL, 0.6 + ((-(X - x) - (Y - y)) / r * 0.5 + 0.5) * 1.2, X, Y)); }
    const n = Math.round(r * r * 0.32);
    for (let k = 0; k < n; k++) {
      const a = rnd(i * 300 + k + seed * 7) * 6.283, q = Math.sqrt(rnd(i * 300 + k + 150 + seed * 7)) * (r - 2), fx = R(x + Math.cos(a) * q), fy = R(y + Math.sin(a) * q);
      const lit = (-(fx - x) - (fy - y)) / r * 0.5 + 0.5 - (q / r) * 0.25, hi = FL[Math.max(2, Math.min(4, R(2 + lit * 2.4)))], mid = FL[Math.max(1, Math.min(3, R(1.5 + lit * 2)))];
      g.px(fx, fy, FL[1]); g.px(fx - 1, fy, mid); g.px(fx + 1, fy, mid); g.px(fx, fy - 1, hi); g.px(fx, fy + 1, mid);
    }
  }
}
function wateringCan(g, x, y) {
  const C0 = "#14303A", C1 = "#2A5A64", C2 = "#3E7A82", C3 = "#5A9AA0";
  g.rrect(x - 11, y - 14, 22, 15, C0, 2); g.rrect(x - 10, y - 13, 20, 13, C2, 2); g.rect(x - 10, y - 13, 20, 2, C3); g.rect(x + 6, y - 12, 4, 12, C1);
  g.line(x - 11, y - 9, x - 21, y - 19, C0); g.line(x - 10, y - 9, x - 20, y - 19, C2); g.rect(x - 24, y - 22, 5, 3, C0); g.rect(x - 23, y - 21, 3, 1, C3);
  g.line(x - 6, y - 14, x - 2, y - 22, C0); g.line(x - 2, y - 22, x + 6, y - 22, C0); g.line(x + 6, y - 22, x + 8, y - 14, C0);
  for (let i = -9; i <= 9; i++) g.px(x + i, y + 1, "#1A1014");
}
function bigLeaf(g, x, y, r, ang, seed) {
  const poly = leafPoly(x, y, r, ang);
  g.poly(poly, LEAF[1]);
  for (let Y = R(y - r * 1.3); Y <= R(y + r * 1.3); Y++) for (let X = R(x - r * 1.3); X <= R(x + r * 1.3); X++) {
    const dx = X - x, dy = Y - y, u = dx * Math.cos(ang) + dy * Math.sin(ang), v = -dx * Math.sin(ang) + dy * Math.cos(ang);
    if (u < -r * 0.05 || u > r * 1.25) continue; const half = Math.sin(Math.PI * Math.min(1, u / (r * 1.2))) * r * 0.48; if (Math.abs(v) > half - 1) continue;
    const vein = Math.abs(v) < 1 || (Math.abs(Math.abs(v) - (u * 0.5 - r * 0.1) % 9) < 0.7 && u > r * 0.15);
    const lit = 0.5 - v / (r * 0.5) * 0.4 + (u / r) * 0.2;
    g.px(X, Y, vein ? LEAF[2] : pick(LEAF, 3 + lit * 2.5, X, Y));
  }
}
function geranium(g, cx, by) {
  for (const [dx, dy, r] of [[-18, 6, 12], [16, 4, 13], [0, -6, 14], [-8, -18, 10], [12, -16, 10]]) leafBall(g, cx + dx, by + dy, r, LEAF.slice(1, 7), dx * 3 + dy, { amp: 0.18, bumps: 9, outline: LEAF[0] });
  for (const [dx, dy] of [[-14, -16], [2, -26], [16, -14], [-4, -8], [10, -2]]) { for (let k = 0; k < 7; k++) { const a = k * 0.9 + dx, px = cx + dx + Math.cos(a) * 3.2, py = by + dy + Math.sin(a) * 3; g.rect(R(px) - 1, R(py) - 1, 3, 3, k % 2 ? "#D8304A" : "#F0506A"); } g.px(cx + dx, by + dy, "#FFB0B8"); }
}

// ---------------------------------------------------------------- story state
// idle hover at the sun: a tiny figure-eight and a slight tilt (periodic over the film)
function idleState(t) { return { x: MOSQ[0] + osc(t, END, 37) * 2.5, y: MOSQ[1] + osc(t, END, 71) * 2, s: 1, prob: 0.5, tilt: 0.035 * osc(t, END, 23), look: [0.12 * osc(t, END, 11), 0.1 * osc(t, END, 17)] }; }
// approach: an arc from the sun down to the hero's ear on "whine", smaller with depth, needle turned toward the ear
function approachState(t, I) {
  const ear = earAt(t), tx = ear[0] + 50, ty = ear[1] - 44, k = ease(clamp01((t - T.go[0]) / (T.go[1] - T.go[0]))), hov = sm(t, T.go[1] - 0.15, T.go[1] + 0.1);
  return { x: lerp(lerp(I.x, 238, k), lerp(238, tx, k), k) + hov * osc(t, END, 520) * 1.5, y: lerp(lerp(I.y, 318, k), lerp(318, ty, k), k) + hov * osc(t, END, 860) * 1.2,
    s: lerp(1, 0.56, k), prob: lerp(0.5, -0.9, k), tilt: lerp(I.tilt, 0, k) - 0.16 * Math.sin(Math.PI * k) + hov * 0.02 * osc(t, END, 300), look: [lerp(I.look[0], -0.9, k), lerp(I.look[1], 0.5, k)] };
}
// the whole flight: idle → approach → (the swat) dodge back up to the sun; every quantity continuous
function mosquitoCore(t) {
  const I = idleState(t); if (t <= T.go[0]) return I;
  const A = approachState(t, I), k2 = clamp01((t - T.dodge[0]) / (T.dodge[1] - T.dodge[0])); if (k2 <= 0) return A;
  const e = 1 - (1 - k2) ** 3, ee = ease(k2), bx = lerp(lerp(A.x, A.x + 8, e), lerp(A.x + 8, I.x, e), e), by = lerp(lerp(A.y, 300, e), lerp(300, I.y, e), e);
  return { x: bx, y: by, s: lerp(A.s, 1, e), prob: lerp(A.prob, I.prob, ee), tilt: lerp(A.tilt, I.tilt, e) + 0.2 * Math.sin(Math.PI * k2) * (1 - k2), look: [lerp(A.look[0], I.look[0], ee), lerp(A.look[1], I.look[1], ee)] };
}
function mosquitoState(t) {
  const m = mosquitoCore(t), vx = t < T.go[0] - 0.1 || t > T.dodge[1] + 0.1 ? 0 : (mosquitoCore(t + 1 / 60).x - mosquitoCore(t - 1 / 60).x) * 30;
  return { ...m, legSway: 2 * osc(t, END, 29) - vx * 0.06, antSway: 2 * osc(t, END, 53) - vx * 0.04 };
}
function heroState(t) {
  const wince = win(t, T.wince[0], T.wince[1], 0.3, 0.55), swat = sm(t, T.swat[0], T.swat[1]) * (1 - sm(t, T.swat[2], T.swat[3]));
  const wave = Math.sin(2 * Math.PI * clamp01((t - T.swat[1] + 0.05) / (T.swat[2] - T.swat[1] + 0.05)) * 1.5) * 7 * win(t, T.swat[1] - 0.05, T.swat[2], 0.1, 0.2);
  return { wince, swat, wave, lean: -3 * wince };
}
function earAt(t) { const h = heroState(t); return [HERO[0] + h.lean + 27 * HS, HERO[1] - 124 * HS + 4 * HS]; }
const thermoLevel = (t) => 0.3 + 0.52 * ease(clamp01((t - T.thermo[0]) / (T.thermo[1] - T.thermo[0])));

// ---------------------------------------------------------------- module passes
const off = (V) => V.x1 < RANGE[0] - 140 || V.x0 > RANGE[1] + 140 || V.X(RANGE[0]) >= 550 || V.X(RANGE[1]) <= -10;   // (also skip when only the 140-px margin is in view)
export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  const clip = { x0: Math.max(0, X(V, 0)), x1: Math.min(540, X(V, W + 20)) };
  LAWN.blit(c, V, { grade: grade(tod(V.cx)), x0: clip.x0, x1: Math.min(540, X(V, W)) });
  BACK.blit(c, V, clip);
}

export function actors(c0, V, t) {
  if (off(V)) return;
  const c = clipX(c0, X(V, 0), X(V, W));
  // lantern glow halo (soft flicker, periodic) and the window's warm spill on the deck
  const fl = 0.86 + 0.08 * osc(t, END, 173) + 0.05 * osc(t, END, 411);
  { const cx = X(V, LAMP[0]), cy = Y(V, LAMP[1] + 1), rr = 34; for (let y = cy - rr; y <= cy + rr; y++) for (let x = Math.max(0, cx - rr); x <= Math.min(539, cx + rr); x++) { const d = Math.hypot(x - cx, (y - cy) * 1.1); if (d < 9 || d > rr) continue; const k = (1 - d / rr) ** 1.8 * 0.85 * fl; if (k > bayer(x, y)) c.px(x, y, mix(c.get(x, y), "#FFD890", 0.35)); } }
  // fireflies over the yard and by the trees (periodic glow)
  for (let i = 0; i < 7; i++) { const ph = (2 * Math.PI * (5 + i * 2) * t) / END + i * 1.7, x = 300 + i * 34 + Math.sin(ph) * 18, y = 560 + (i % 3) * 22 + Math.sin(ph * 2 + i) * 8, glow = Math.max(0, osc(t, END, 31 + i * 7, i * 2.3)) ** 2; firefly(c, X(V, x), Y(V, y), glow); }
  // the thermometer on the newel post: the red column rises on "on a warm night it gets even higher"
  thermometer(c, X(V, THERMO.x), Y(V, THERMO.top), Y(V, THERMO.bulb), thermoLevel(t), win(t, T.thermo[0] + 0.2, T.thermo[1] + 0.9, 0.3, 0.6), t);
  sign(c, X(V, SIGN[0]), Y(V, SIGN[1]), "LV 9", "wood", 1, t);
  // steam from the mug (three periodic wisps)
  for (let i = 0; i < 3; i++) { const p = cyc(t, END, 17 + i * 4, i / 3), a = Math.sin(Math.PI * p) * 0.85, g = fade(c, a); for (let j = 0; j < 12; j++) { const yy = 577 - p * 24 - j * 1.5, xx = 156 + (i - 1) * 3 + Math.sin(yy * 0.3 + i * 2) * 2.4, col = j < 4 ? "#FFF6FF" : j < 8 ? "#E4DAF6" : "#BCB0D8"; g.px(X(V, xx), Y(V, yy), col); if (j < 8) g.px(X(V, xx) + 1, Y(V, yy), "#D0C4EA"); } }
  // the hero on the bench (a soft shadow under his dangling boots)
  const h = heroState(t), m = mosquitoState(t);
  { const sx = X(V, HERO[0]), sy = Y(V, 647); c.tint(sx - 34, sy - 5, 68, 10, (x, y) => { const d = ((x - sx) / 34) ** 2 + ((y - sy) / 5) ** 2; return d >= 1 ? 0 : 0.5 * (1 - d); }, "#120810", 3); }
  const hx = HERO[0], hy = HERO[1] - 124 * HS, dx = m.x - hx, dy = m.y + 40 * m.s - hy, dl = Math.hypot(dx, dy) || 1;
  const look = [clamp01(Math.abs(dx / dl)) * Math.sign(dx) * 0.9, (dy / dl) * 0.8];
  drawSitHero(c, X(V, hx), Y(V, HERO[1]), { scale: HS, breath: cyc(t, END, 13), swing: osc(t, END, 19) * (1 - h.wince), look, blink: blinkAt(t, END / 13, 0.7), brows: h.wince, squint: h.wince * 0.9, tsk: sm(h.wince, 0.2, 0.55), swat: ease(h.swat), wave: h.wave, lean: h.lean });
  // the mosquito: wing blur fan from her own wing phase; a little brighter buzz once the night gets warm
  const e = Math.cos(2 * Math.PI * wingPhase("mosquito", t)) * strokeAmt("mosquito", t), buzz = 0.25 + 0.55 * sm(t, T.thermo[0], T.thermo[1]) * (1 - sm(t, T.thermo[1] + 1.2, T.thermo[1] + 2.4));
  // comic "whine" marks between her and his ear while she hovers there
  const wm = win(t, T.go[1] - 0.3, T.dodge[0] + 0.05, 0.15, 0.2);
  if (wm > 0) {
    const ear = earAt(t), ox = ear[0] + 26, oy = ear[1] - 16, g = fade(c, wm);
    for (let i = 0; i < 3; i++) { const p = cyc(t, END, 180, i / 3), r = 5 + p * 16, a2 = Math.sin(Math.PI * p); if (a2 < 0.15) continue; const q = fade(c, wm * a2);
      for (let k = -6; k <= 6; k++) { const an = 2.45 + k * 0.09, x = ox + Math.cos(an) * r, y = oy + Math.sin(an) * r; q.px(X(V, x), Y(V, y), "#FFFFFF"); q.px(X(V, x) + 1, Y(V, y), "#D8CCF8"); } }
  }
  drawMosquito(c, X(V, m.x), Y(V, m.y), { s: m.s, tilt: m.tilt, look: m.look, blink: blinkAt(t, END / 16, 2.1), wing: e, amt: strokeAmt("mosquito", t), prob: m.prob, legSway: m.legSway, antSway: m.antSway, buzz, open: 0.15 + 0.5 * win(t, T.dodge[0], T.dodge[0] + 0.9, 0.15, 0.4) });
}

function thermometer(c, x, top, bulb, lv, heat, t) {
  const O = "#1A1222";
  c.rrect(x - 8, top - 6, 17, bulb - top + 16, O, 2); c.rrect(x - 7, top - 5, 15, bulb - top + 14, "#E8E2F0", 2); c.rect(x - 6, top - 4, 1, bulb - top + 10, "#FFFFFF");
  for (let y = top + 4; y < bulb - 8; y += 8) { c.rect(x - 5, y, 3, 1, "#7A7090"); c.rect(x + 3, y, 3, 1, "#7A7090"); if ((y - top - 4) % 16 === 0) { c.rect(x - 6, y, 4, 1, "#4A4060"); c.rect(x + 3, y, 4, 1, "#4A4060"); } }
  c.rrect(x - 3, top - 1, 7, bulb - top + 1, O, 1); c.rect(x - 2, top, 5, bulb - top, "#FFFFFF"); c.rect(x + 1, top + 1, 1, bulb - top - 2, "#D8D2E8");
  const colTop = R(lerp(bulb - 6, top + 3, lv));
  for (let y = colTop; y < bulb; y++) { c.px(x - 2, y, "#FF7A70"); c.px(x - 1, y, "#FF4A4A"); c.px(x, y, "#F03A40"); c.px(x + 1, y, "#C82434"); c.px(x + 2, y, "#9A1A2A"); }
  c.rect(x - 1, colTop - 1, 3, 1, "#FF9A90");
  for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) { const d = Math.hypot(xx, yy); if (d > 6.2) continue; c.px(x + xx, bulb + yy, d > 5.2 ? O : xx + yy < -4 ? "#FF9A90" : d < 3 ? "#FF5050" : "#D82838"); }
  c.px(x - 2, bulb - 2, "#FFFFFF");
  // heat waves rising above the post's finial while the column climbs (periodic wiggle)
  if (heat > 0.02) for (let i = 0; i < 3; i++) { const q = fade(c, heat * (i === 1 ? 1 : 0.8)), ph = cyc(t, END, 90, i * 0.3) * 2 * Math.PI, bx = x - 8 + i * 8, by = top - 50 - (i === 1 ? 6 : 0);
    for (let j = 0; j < 18; j++) { const yy = by - j, xx = bx + Math.sin(j * 0.55 - ph) * 2.2; q.px(R(xx), yy, j < 4 || j > 14 ? "#FF9A70" : "#FFD2A0"); if (j > 3 && j < 15) q.px(R(xx) + 1, yy, "#FF8A60"); } }
}

export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  FRONT.blit(c, V, { x0: Math.max(0, X(V, 0)), x1: Math.min(540, X(V, W)) });
}
