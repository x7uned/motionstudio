// LV6 · leaf — a kitchen garden in warm afternoon light (tod ≈ 3.0), RANGE BIOME.leaf = 2700..3240.
// Behind: a hazy hedge and two fruit trees, a little greenhouse, a white picket fence. Left: a bamboo teepee of scarlet
// runner beans (trifoliate leaves, red flower sprays, hanging pods; a row of aphids on one cane). Right: a staked tomato
// plant with red, orange and green fruit. A raised bed of lettuces and carrots with the LV 6 marker sign and a watering
// can; giant mottled squash leaves, a yellow squash blossom and a pumpkin fill the bottom edge, dew drops twinkle.
// The seven-spot ladybug flies face-on under the afternoon sun disc: red wing cases lifted in a V, the clear brownish hind
// wings a blur fan at 75 beats/s (wingPhase("ladybug", t)); near the end it glances at the aphids on the bean cane.
import { BIOME, LAND, EV, END, wingPhase, strokeAmt } from "../timeline.mjs";
import { tod } from "../world.mjs";
import { sign, fade, mix, sm, win, rnd, blinkAt } from "../cute.mjs";
import { Layer, tuft, leafBall, grassAt, grade, osc, cyc, clover as cloverLeaf } from "./meadow-kit.mjs";
import { leaf, P, stalk, dewDrop, smallFlower, fern, nasturtium, fadeEdges } from "./tropic-plants.mjs";
import { G, ball, beanTeepee, tomatoPlant, picketFence, greenhouse, raisedBed, lettuce, carrotTops, squashFlower, pumpkin, wateringCan, aphid } from "./leaf-garden.mjs";
import { drawLadybug } from "./leaf-ladybug.mjs";
import { T } from "./leaf-motions.mjs";
export { T };

export const RANGE = BIOME.leaf;
const R = Math.round, [RX0, RX1] = RANGE;
// rest camera (2970, −180): screen = (wx − 2700, wy + 660). S() converts rest-screen coordinates to world.
const S = (sx, sy) => [sx + RX0, sy - 660];
const LB = S(270, 372), LB_S = 1.1;              // ladybug head centre and scale
const SIGN = S(198, 618);                        // LV 6 marker: post foot (a longer stake continues into the bed)
const APHIDS = [[103, 508], [101, 516], [99, 525], [104, 531], [97, 540], [102, 547], [96, 556]].map(([x, y]) => S(x, y));
const DEW = [[160, 900, 4], [226, 926, 4], [300, 911, 3], [350, 945, 4], [416, 920, 3], [124, 948, 3], [262, 880, 2], [54, 902, 3], [500, 900, 3]].map(([x, y, r]) => [...S(x, y), r]);

const GRASS_A = ["#BCDC78", "#A8D26A", "#94C45C", "#80B650", "#6EA846", "#5E983E", "#508838", "#447A34", "#3A6C30", "#305E2A", "#285024"];
const HAZE = ["#A2BE94", "#AEC89C", "#BCD2A6", "#CADCB2"];

// ---------------------------------------------------------------- static layers
let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(RX0 - 40, -660, RX1 + 40, 320); FRONT = new Layer(RX0 - 12, 30, RX1 + 12, 320);
  const g = BACK.g, f = FRONT.g, W = (sx, sy) => S(sx, sy);
  // far hedge and canopies in warm afternoon haze; two fruit trees
  for (let row = 0; row < 3; row++) for (let i = 0; i < 30; i++) {
    const x = RX0 - 10 + i * 20 + rnd(row * 71 + i + 500) * 14, h = (62 - row * 20 + rnd(row * 37 + i + 500) * 22) * (1 - 0.4 * sm(x, RX1 - 120, RX1)); if (h < 6 || x > RX1 + 4) continue;
    const r = 12 + rnd(i * 5 + row + 500) * 9, cy = LAND - h + r * 0.6;
    leafBall(g, x, cy, r, HAZE.map((c0, k) => mix(c0, ["#4E7A44", "#5A884C", "#669654", "#74A25C"][k], row * 0.28)), i + row * 40 + 500, { amp: 0.1, bumps: 7 });
  }
  for (const [sx, top, r] of [[150, 486, 34], [392, 498, 30]]) {
    const [x] = W(sx, 0), [, ty] = W(0, top); thick(g, [[x, LAND], [x - 2, ty + r]], 2, "#6A5440");
    leafBall(g, x, ty + r * 0.6, r, ["#2E5A2E", "#3A6E36", "#4A823E", "#5C9448", "#72A856", "#8CBC68"], sx, { amp: 0.12, bumps: 9 });
    for (let i = 0; i < 14; i++) { const a = rnd(sx + i) * Math.PI * 2, q = Math.sqrt(rnd(sx + i * 3)) * r * 0.8; g.rect(R(x + Math.cos(a) * q), R(ty + r * 0.6 + Math.sin(a) * q * 0.8), 2, 2, i % 3 ? "#F08A2A" : "#E04A2A"); }
  }
  // greenhouse and picket fence
  greenhouse(g, ...[W(186, 0)[0], W(330, 0)[0]], LAND + 2, 40, 22);
  // ground: warm lawn
  for (let y = LAND; y < 320; y++) for (let x = RX0; x < RX1; x++) g.px(x, y, grassAt(x, y, y - LAND, GRASS_A));
  g.rect(RX0, LAND, RX1 - RX0, 1, "#D4EC94");
  for (let i = 0; i < 3800; i++) {
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 711), 1.4) * 316), x = R(RX0 + rnd(i * 3 + 712) * (RX1 - RX0 - 2)), d = y - LAND, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4;
    const col = rnd(i * 5 + 701) < 0.6 ? mix(g.get(x, y), "#2A4A16", 0.3) : mix(g.get(x, y), "#FFF4B0", 0.3);
    for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col);
  }
  picketFence(g, W(-2, 0)[0], W(512, 0)[0], LAND + 6, 34, 3);
  // clover and little flowers toward the clover field at the right edge
  for (let i = 0; i < 70; i++) { const [x, y] = W(400 + rnd(i * 7 + 801) * 140, 646 + Math.pow(rnd(i * 7 + 802), 1.3) * 140); cloverLeaf(g, R(x), R(y), "#3E8A3E", "#7CC85E"); if (rnd(i) < 0.25) { g.px(R(x), R(y) - 3, "#FFFFFF"); g.px(R(x) + 1, R(y) - 3, "#F4C8DA"); } }
  // the bean teepee (left) — no leaves where the ladybug's left wing fan sweeps
  const avoid = (x, y) => x > W(108, 0)[0] && y < W(0, 440)[1] && y > W(0, 200)[1];
  beanTeepee(g, [W(18, 676), W(64, 686), W(118, 672)], W(66, 214), 7, avoid);
  for (const [x, y] of APHIDS) aphid(g, x, y, rnd(x) < 0.5 ? 1 : -1);
  // the tomato plant (right)
  tomatoPlant(g, ...W(478, 678), 332, 5, [
    [...W(446, 468), [[-7, 8, 9, G.fruit], [6, 11, 10, G.fruit], [-1, 22, 8.5, G.orange]]],
    [...W(504, 560), [[-5, 7, 9, G.green], [8, 9, 8, G.green], [2, 19, 9, G.orange]]],
    [...W(458, 610), [[-4, 6, 8, G.fruit], [7, 8, 7, G.green]]],
  ]);
  // raised bed with lettuces and carrots, the watering can beside it
  raisedBed(g, ...[W(150, 0)[0], W(402, 0)[0]], W(0, 666)[1], 22, 4);
  for (let i = 0; i < 5; i++) lettuce(g, ...W(176 + i * 50, 660), 13 + (i % 2) * 2, 900 + i * 13);
  for (let i = 0; i < 4; i++) carrotTops(g, ...W(200 + i * 50, 662), 950 + i);
  wateringCan(g, ...W(434, 694), 1.2);
  for (const [sx, sy] of [[140, 690], [416, 704], [300, 700], [40, 700], [520, 690]]) fern(g, ...W(sx, sy), 0.9, sx, G.bean, 5, 0.45);
  for (let i = 0; i < 40; i++) { const [x, y] = W(10 + rnd(i * 9 + 901) * 520, 694 + rnd(i * 9 + 902) * 80); smallFlower(g, x, y, 1.6 + (y - W(0, 690)[1]) / 50, ["#FFFFFF", "#FFE070", "#F8B0D0", "#B8A0F0"][i % 4], "#FFD040"); }
  // FRONT: giant squash leaves to the bottom edge, a blossom, a pumpkin, curly tendrils, grass
  for (let i = 0; i < 40; i++) { const [x, y] = W(-20 + rnd(i * 13 + 702) * 580, 800 + rnd(i * 13 + 705) * 170); tuft(f, R(x), R(y), 12 + rnd(i + 3) * 14, 4 + Math.floor(rnd(i * 3 + 1) * 4), ["#2E5A22", "#3E7228", "#5A9234"], i * 5 + 3, (rnd(i * 9 + 2) - 0.5) * 6); }
  // squash leaves (lobed, silver-mottled along the veins), a pumpkin, the yellow blossom, nasturtiums with water beads
  const SQ = { shape: "lobed", W: 0.62, ramp: P.squash, veinAng: 0.6, lobe: 0.24, mottle: 1, subVeins: 1, serr: 0.025, pw: 1.1, tip: 0.12, veinK: 1.4, lobeShade: 0.5 };
  for (const [sx, sy, ex, ey] of [[64, 1000, 70, 868], [470, 1000, 466, 858], [190, 1000, 182, 846]]) stalk(f, [W(sx, sy), W((sx + ex) / 2 + 6, (sy + ey) / 2), W(ex, ey)], 3.6, 2.6, G.green);
  leaf(f, ...W(70, 868), -1.25, 118, { ...SQ, seed: 21, bend: 6 });
  leaf(f, ...W(466, 858), -1.95, 122, { ...SQ, seed: 22, bend: -8 });
  pumpkin(f, ...W(380, 876), 24);
  squashFlower(f, ...W(182, 840), 1.6);
  const NL = ["#16341A", "#204A22", "#2C622A", "#3A7A34", "#4C9240", "#64A850", "#82BE66", "#A6D488"];
  const NAST = [[256, 884, 22], [190, 872, 19], [322, 882, 18], [150, 908, 30], [292, 918, 28], [410, 926, 26], [216, 934, 34], [342, 952, 32], [118, 954, 26], [470, 958, 24]];
  for (const [sx, sy, r] of NAST) stalk(f, [W(sx + 4, 990), W(sx + 2, sy + 8), W(sx, sy)], 1.6, 1.2, ["#24461A", "#36602A", "#4A7A36", "#5E9244", "#76AA56", "#92C26C", "#B0D688", "#CEE8AA"]);
  NAST.forEach(([sx, sy, r], i) => { leaf(f, ...W(sx, sy), 0, r, { shape: "round", W: 0.38 + (i % 3) * 0.04, ramp: NL, veinAng: 0.55, rib: -1, seed: 31 + i * 7, gloss: 0.4, base: 3.8 }); });
  for (const [sx, sy, s0, col] of [[236, 904, 2.2, "o"], [304, 898, 2, "r"], [176, 932, 2.4, "y"], [380, 942, 2.4, "o"], [262, 958, 2.6, "r"], [438, 902, 2, "y"], [130, 884, 1.8, "o"], [350, 916, 1.8, "y"]]) nasturtium(f, ...W(sx, sy), s0, col);
  leaf(f, ...W(-14, 1008), -0.95, 160, { ...SQ, seed: 23, bend: 12 });
  leaf(f, ...W(560, 1006), -2.2, 164, { ...SQ, seed: 25, bend: -12 });
  for (const [sx, sy, d] of [[120, 836, 1], [420, 826, -1], [300, 852, 1]]) { const [x, y] = W(sx, sy); let px = x, py = y; for (let i = 0; i < 40; i++) { const a = i * 0.32 * d, rr = 8 - i * 0.16; const nx = x + Math.cos(a) * rr + i * 0.6 * d, ny = y - i * 0.5 + Math.sin(a) * rr * 0.7; f.line(R(px), R(py), R(nx), R(ny), "#6AA040"); px = nx; py = ny; } }
  fadeEdges(BACK); fadeEdges(FRONT, 10);
}
function thick(g, pts, r, col) { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n; for (let j = -r; j <= r; j++) g.px(R(x) + j, R(y), j < 0 ? mix(col, "#FFFFFF", 0.15) : col); } } }

// ---------------------------------------------------------------- the ladybug's state
// T (levels/leaf-motions.mjs): GLANCE — on its way out it peeks at the aphids on the bean cane (eyes only, eased).
export function lbState(t) {
  return { x: LB[0] + osc(t, END, 31, 0.8) * 1.6, y: LB[1] + osc(t, END, 67, 0.3) * 2.4 + osc(t, END, 23, 1.1) * 1, tilt: osc(t, END, 19, 0.5) * 0.035, glance: win(t, ...T.GLANCE) };
}

// ---------------------------------------------------------------- per-frame pieces
const off = (V) => V.x1 < RX0 - 140 || V.x0 > RX1 + 140;
function motes(c, V, t) {
  for (let i = 0; i < 12; i++) {
    const ph = cyc(t, END, 2 + (i % 3), rnd(i + 9)), x = V.X(RX0 + 20 + rnd(i * 17 + 5) * 500) + osc(t, END, 5 + i, i * 2) * 12, y = V.Y(-480 + rnd(i * 17 + 6) * 380) - ph * 50;
    const tw = (0.5 + 0.5 * osc(t, END, 50 + i * 9, i * 1.3)) * Math.sin(Math.PI * ph); if (tw < 0.35) continue;      // fades out before its drift wraps
    c.px(R(x), R(y), tw > 0.8 ? "#FFF8E0" : "#FFE8A8"); if (tw > 0.85) { c.px(R(x) + 1, R(y), "#FFE0A0"); c.px(R(x), R(y) + 1, "#FFE0A0"); }
  }
}

export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  BACK.blit(c, V, { grade: grade(tod(V.cx)) });
}
export function actors(c, V, t) {
  if (off(V)) return;
  // the LV 6 marker: a long stake into the raised bed, the sign on top
  { const x = R(V.X(SIGN[0])), y = R(V.Y(SIGN[1])); c.rect(x - 2, y, 5, 46, "#4A2C18"); c.rect(x - 2, y, 2, 46, "#6A4024"); sign(c, x, y, "LV 6", "wood", 1, t); }
  const st = lbState(t), gl = st.glance;
  drawLadybug(c, V.X(st.x), V.Y(st.y), {
    s: LB_S, tilt: st.tilt, wing: wingPhase("ladybug", t), amt: strokeAmt("ladybug", t), look: [-0.85 * gl, 0.5 * gl], blink: blinkAt(t, END / 16, 0.7) * (1 - gl), open: 0.3 + 0.2 * gl, antSway: osc(t, END, 53, 0.2) * 1.5,
  });
  motes(c, V, t);
}
export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  FRONT.blit(c, V, { grade: grade(tod(V.cx)) });
  // dew drops on the squash leaves (twinkle, periodic)
  for (let i = 0; i < DEW.length; i++) { const [x, y, r] = DEW[i], tw = Math.max(0, osc(t, END, 29 + i * 5, i * 1.9)) ** 6; dewDrop(c, V.X(x), V.Y(y), r, c.get(R(V.X(x)), R(V.Y(y))), tw); }
}

/** dev only: the cached layers (built on demand), for edge-clipping checks in dev/leaf-*.mjs */
export function _layers() { if (!BACK) build(); return { BACK, FRONT }; }
