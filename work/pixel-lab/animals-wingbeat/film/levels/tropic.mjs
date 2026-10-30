// LV5 · tropic — a lush hummingbird garden at day (tod ≈ 2.6), RANGE BIOME.tropic = 2160..2700.
// Hazy distant palms and canopy behind a low cream garden wall with magenta bougainvillea; a coconut palm frames the left
// (a red hummingbird feeder hangs from a frond), a torn banana plant the right; a fuchsia shrub, salvia spikes,
// bromeliads and ferns along the ground; monstera, elephant ears, ferns and big red salvia fill the bottom edge.
// Anna's hummingbird (male, rose-magenta crown and gorget with a sliding sheen) hovers face-on under the sun disc with its
// bill in a red trumpet flower; its wings are a blur fan at 44 beats/s driven by wingPhase("hummingbird", t).
// "That low hum gave the bird its name" (EV.hum … EV.nameEnd): it backs off the flower and gives a happy head tilt with
// closed smiling eyes, then returns to the flower.
import { BIOME, LAND, EV, END, wingPhase, strokeAmt } from "../timeline.mjs";
import { tod } from "../world.mjs";
import { sign, fade, mix, bayer, sm, ease, win, lerp, rnd, blinkAt, clamp01 } from "../cute.mjs";
import { Layer, tuft, leafBall, grassAt, grade, osc, cyc } from "./meadow-kit.mjs";
import { Canvas } from "../../../../../renderer/pixel/raster.mjs";
import { P, leaf, stalk, coconutPalm, bananaPlant, salviaSpike, salviaFlower, fuchsiaBush, fuchsia, bougainvillea, bromeliad, fern, smallFlower, tubeFlower, feeder, caladium, calathea, stone, strelitzia, fadeEdges } from "./tropic-plants.mjs";
import { drawHummingbird } from "./tropic-hummingbird.mjs";
import { T } from "./tropic-motions.mjs";
export { T };

export const RANGE = BIOME.tropic;
const R = Math.round, [RX0, RX1] = RANGE;
// rest camera (2430, −180): screen = (wx − 2160, wy + 660). S() converts rest-screen coordinates to world.
const S = (sx, sy) => [sx + RX0, sy - 660];
const HB = S(270, 348);                          // hummingbird head centre
const HB_S = 1.5, HB_TURN = 0.5, HB_O = { beakLen: 52, wingLen: 76 };
const SIGN = S(86, 612);                         // LV 5 sign post foot
const HOOK = S(102, 206);                        // feeder hook on the palm frond
const CLUMP = S(446, 648);                       // the salvia clump the feeding stalk grows from

const GRASS_T = ["#B8E07C", "#A4D66E", "#8ECA60", "#7ABC54", "#68AE4A", "#589E42", "#4A8E3C", "#3E7E36", "#347032", "#2A622C", "#225426"];
const HAZE = ["#86B8A8", "#94C4B0", "#A4CEB8", "#B4D8C0"];
const STUCCO = ["#8A6A50", "#B49274", "#D2B494", "#E8D2B4", "#F4E4C8", "#FBF0DA"];
const TILE = ["#5A2414", "#8A3A20", "#B4522C", "#D0703A", "#E89050"];

// ---------------------------------------------------------------- the feeding flower: its mouth sits at the bill tip
let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const tmp = new Canvas(540, 960, "#000000"), o = drawHummingbird(tmp, 270, 348, { kind: "anna", s: HB_S, turn: HB_TURN, ...HB_O });
  const [tx, ty] = o.beakTip, ang = 0.32 + 0.12;                 // bill direction at the tip
  const mouth = [tx - Math.cos(ang) * 4 - 270 + HB[0], ty - Math.sin(ang) * 4 - 348 + HB[1]];
  GEO = { mouth, ang, tip: [tx - 270 + HB[0], ty - 348 + HB[1]] };
  return GEO;
}

// ---------------------------------------------------------------- static layers
let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(RX0 - 40, -660, RX1 + 40, 320); FRONT = new Layer(RX0 - 12, 30, RX1 + 12, 320);
  const g = BACK.g, f = FRONT.g, W = (sx, sy) => S(sx, sy);
  // far haze: rounded canopies and distant palms rising from the horizon (lower toward the pond seam)
  const env = (x) => 0.45 + 0.55 * sm(x, RX0 + 10, RX0 + 140);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 30; i++) {
    const x = RX0 - 10 + i * 20 + rnd(row * 97 + i) * 14, h = env(x) * (78 - row * 24 + rnd(row * 31 + i) * 24); if (h < 6 || x > RX1 + 6) continue;
    const r = 13 + rnd(i * 7 + row) * 10, cy = LAND - h + r * 0.6;
    const ramp = HAZE.map((c0, k) => mix(c0, ["#3E7A5E", "#4A8866", "#58966E", "#66A276"][k], row * 0.26));
    leafBall(g, x, cy, r, ramp, i + row * 50, { amp: 0.1, bumps: 7 });
  }
  for (const [sx, hh, lean] of [[150, 190, -6], [196, 150, 4], [330, 175, 8], [384, 140, -4]]) {
    const [x] = W(sx, 0), top = LAND - hh; for (let y = top; y < LAND; y++) { const k = (y - top) / hh; g.px(R(x + lean * (1 - k) * (1 - k)), y, "#8CB4A4"); g.px(R(x + lean * (1 - k) * (1 - k)) + 1, y, "#80AA9A"); }
    for (let k = 0; k < 9; k++) { const a = -Math.PI - 0.2 + (k / 8) * (Math.PI + 0.4), L = 18 + rnd(k + sx) * 6; for (let i = 0; i < L; i++) { const u = i / L; g.px(R(x + lean + Math.cos(a) * i), R(top + Math.sin(a) * i * 0.6 + u * u * 9), k % 2 ? "#7EA898" : "#94BCAC"); } }
  }
  // ground: lawn with perspective bands, a little darker under the shrubs
  for (let y = LAND; y < 320; y++) for (let x = RX0; x < RX1; x++) g.px(x, y, grassAt(x, y, y - LAND, GRASS_T));
  g.rect(RX0, LAND, RX1 - RX0, 1, "#CCEC90");
  for (let i = 0; i < 3800; i++) {
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 11), 1.4) * 316), x = R(RX0 + rnd(i * 3 + 12) * (RX1 - RX0 - 2)), d = y - LAND, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4;
    const col = rnd(i * 5 + 1) < 0.6 ? mix(g.get(x, y), "#14502A", 0.32) : mix(g.get(x, y), "#F0FFB0", 0.28);
    for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col);
  }
  // the low garden wall (cream stucco, terracotta coping), from the bougainvillea to the banana plant
  { const [x0] = W(124, 0), [x1] = W(478, 0), top = LAND - 50;
    for (let y = top; y < LAND + 2; y++) for (let x = x0; x <= x1; x++) {
      const v = (y - top) / 52, crack = ((x * 7 + y * 3) % 97 === 0) || ((x * 13 + R(y / 3)) % 211 === 0);
      let s = v < 0.12 ? 1 : v < 0.2 ? 5 : v < 0.7 ? 4 : (v - 0.7) / 0.3 > bayer(x, y) ? 3 : 4; if (x - x0 < 2 || x1 - x < 2) s = 2; if (crack) s = 2;
      if (((x - x0) % 46 === 0) && v > 0.18) s = 3;
      g.px(x, y, STUCCO[s]);
    }
    for (let x = x0 - 3; x <= x1 + 3; x++) for (let j = 0; j < 7; j++) { const yy = top - 6 + j, tile = R((x - x0) / 6) % 2, k = j < 2 ? 4 : j < 4 ? 3 - tile * 0 : j < 6 ? 2 : 0; g.px(x, yy, TILE[(x - x0) % 6 === 0 && j > 1 ? 1 : k]); }
    for (const px of [x0 - 4, x1 - 6]) { for (let y = top - 22; y < LAND + 2; y++) for (let x = px; x < px + 12; x++) { const v = (x - px) / 11; g.px(x, y, STUCCO[x === px || x === px + 11 ? 1 : v < 0.35 ? 5 : v < 0.75 ? 4 : 3]); } for (let x = px - 2; x < px + 14; x++) for (let j = 0; j < 5; j++) g.px(x, top - 26 + j, TILE[j < 2 ? 4 : j < 4 ? 2 : 0]); }
  }
  bougainvillea(g, ...W(178, 582), 36, 3); bougainvillea(g, ...W(240, 604), 26, 7); bougainvillea(g, ...W(132, 600), 22, 11);
  // the coconut palm on the left (curved trunk, crown behind the top-left corner) — the feeder hangs from a frond
  coconutPalm(g, [W(34, 662), W(6, 440), W(62, 186)], 5, [[-2.75, 78, 40], [-2.3, 96, 30], [-1.85, 90, 0], [-1.4, 80, -10], [-0.95, 110, 10], [-0.5, 140, 46], [-0.12, 136, 74], [-3.2, 70, 50]]);
  // the banana plant on the right (base just inside the range; leaves overlap the leaf garden by ≤ 30 px)
  bananaPlant(g, ...W(486, 662), 232, [[-2.15, 150, -26], [-2.65, 104, 44], [-1.62, 132, 34], [-1.12, 112, 20], [-0.6, 60, 18]], 9);
  // shrubs and flowers along the wall foot
  fuchsiaBush(g, ...W(392, 606), 48, 21, 22);
  for (const [sx, h, s0, sd] of [[300, 46, 1.1, 1], [318, 58, 1.2, 2], [336, 40, 1, 3], [470, 52, 1.2, 4], [58, 50, 1.1, 5]]) salviaSpike(g, ...W(sx, 650), h, s0, sd, (rnd(sd) - 0.5) * 6);
  bromeliad(g, ...W(212, 650), 1.2, 4, "#F0402E"); bromeliad(g, ...W(110, 652), 1, 9, "#FF6A2A");
  fern(g, ...W(150, 654), 1.3, 2); fern(g, ...W(262, 656), 1.2, 6); fern(g, ...W(424, 658), 1.3, 8); fern(g, ...W(20, 656), 1.1, 13);
  for (let i = 0; i < 70; i++) { const sx = 10 + rnd(i * 7 + 1) * 520, sy = 652 + rnd(i * 7 + 2) * 40, d = sy - 640; smallFlower(g, ...W(sx, sy), 1.4 + d / 30, ["#FF4A7A", "#FF8AB0", "#FFFFFF", "#E8304A", "#FF6A3A"][i % 5], "#FFE070"); }
  // the lawn in between: a curving stepping-stone path to the wall, bird-of-paradise clumps, flower drifts
  for (const [sy, rx, dx] of [[664, 7, 0], [676, 10, -6], [692, 13, -14], [712, 17, -20], [738, 22, -22], [770, 27, -16], [808, 33, -2], [852, 40, 16]]) { const [x, y] = W(328 + dx + Math.sin(sy * 0.02) * 4, sy); stone(g, x, y, rx, rx * 0.34, sy); }
  strelitzia(g, ...W(52, 716), 1.25, 3); strelitzia(g, ...W(494, 700), 1.1, 9);
  for (const [sx, sy, r, sd] of [[140, 742, 16, 5], [436, 760, 18, 8], [214, 700, 11, 13]]) { leafBall(g, ...W(sx, sy - r * 0.5), r, P.jungle.slice(1), sd, { amp: 0.14, bumps: 9 }); for (let i = 0; i < r * 1.2; i++) { const a = rnd(sd * 7 + i) * Math.PI * 2, q = Math.sqrt(rnd(sd * 7 + i + 50)) * r * 0.9; smallFlower(g, ...W(sx + Math.cos(a) * q, sy - r * 0.5 + Math.sin(a) * q * 0.8), 1.6 + r / 14, ["#FF4A7A", "#FFFFFF", "#FF8AB0", "#FFB040"][(i + sd) % 4], "#FFE070"); } }
  for (let p2 = 0; p2 < 6; p2++) { const cx = 40 + rnd(p2 * 23 + 1) * 460, cy = 690 + rnd(p2 * 29) * 120; for (let i = 0; i < 16; i++) { const sx = cx + (rnd(p2 * 100 + i) - 0.5) * 70, sy = cy + (rnd(p2 * 100 + i + 50) - 0.5) * 20, d = sy - 640; smallFlower(g, ...W(sx, sy), 1.2 + d / 60, ["#FF4A7A", "#FF8AB0", "#FFFFFF", "#E8304A", "#FFB040"][(p2 + (i % 2)) % 5], "#FFE070"); } }
  // FRONT: a planted bed toward the bottom edge — ferns and caladiums at the back, then monsteras, pink caladiums,
  // big red salvia, a striped calathea and elephant ears, each bigger the nearer it is
  for (let i = 0; i < 40; i++) { const [x, y] = W(-20 + rnd(i * 13 + 2) * 580, 820 + rnd(i * 13 + 5) * 150); tuft(f, R(x), R(y), 12 + rnd(i) * 14, 4 + Math.floor(rnd(i * 3) * 4), ["#1E5A2A", "#2E7032", "#4A9A40"], i * 5, (rnd(i * 9) - 0.5) * 6); }
  fern(f, ...W(34, 880), 1.7, 41, P.jungle, 6, 0.4); fern(f, ...W(286, 872), 1.5, 43, P.leaf, 6, 0.4); fern(f, ...W(520, 884), 1.7, 45, P.jungle, 6, 0.4);
  caladium(f, ...W(214, 888), 0.75, 61, 4); caladium(f, ...W(452, 900), 0.7, 63, 4);
  for (let i = 0; i < 26; i++) { const sx = rnd(i * 5 + 101) * 540, sy = 860 + rnd(i * 5 + 102) * 60; smallFlower(f, ...W(sx, sy), 2.6, ["#FF4A7A", "#FF8AB0", "#FFFFFF", "#E8304A", "#FFB040"][i % 5], "#FFE070"); }
  for (const [sx, sy, h, sd, ln] of [[244, 972, 128, 51, -6], [270, 980, 100, 52, 8], [392, 976, 112, 53, 10]]) salviaSpike(f, ...W(sx, sy), h, 2.2, sd, ln);
  leaf(f, ...W(-6, 1000), -0.9, 172, { shape: "heart", W: 0.66, ramp: P.jungle, slits: 7, holes: true, gloss: 0.7, bend: 14, seed: 3, veinAng: 0.34, pw: 1.1, slitW: 2.8, veinK: 1.4 });
  leaf(f, ...W(84, 1016), -1.42, 132, { shape: "heart", W: 0.64, ramp: P.leaf, slits: 6, holes: true, gloss: 0.6, bend: -10, seed: 8, veinAng: 0.36, pw: 1.1, slitW: 2.4, veinK: 1.4 });
  caladium(f, ...W(170, 990), 1.15, 71, 5);
  calathea(f, ...W(330, 1000), 1.05, 81, 5);
  fern(f, ...W(452, 982), 2.0, 37, P.jungle, 7, 0.36);
  leaf(f, ...W(552, 996), -2.15, 160, { shape: "heart", W: 0.6, ramp: P.lime, veinAng: 0.4, bend: -12, seed: 4, gloss: 0.4, tip: 0.3, veinK: 1.5 });
  leaf(f, ...W(500, 1012), -1.72, 118, { shape: "heart", W: 0.58, ramp: P.leaf, veinAng: 0.42, bend: 10, seed: 6, gloss: 0.3, tip: 0.3, veinK: 1.5 });
  fadeEdges(BACK); fadeEdges(FRONT, 10);
}

// ---------------------------------------------------------------- the hummingbird's state
// T (levels/tropic-motions.mjs): OUT backs off the flower, HAPPY closes the eyes in a smile and tilts the head, BACK
// returns the bill to the flower.
export function hbState(t) {
  const out = sm(t, T.OUT[0], T.OUT[1]) * (1 - sm(t, T.BACK[0], T.BACK[1])), e = ease(out);
  const sip = 1.6 * (0.5 + 0.5 * osc(t, END, 37, 0.6)) * (1 - e);                 // the bill slides a little in and out
  const bob = osc(t, END, 71) * 2 + osc(t, END, 29, 1.3) * 0.8;
  const cs = Math.cos(0.44), sn = Math.sin(0.44);
  return { x: HB[0] - cs * (sip + 22 * e) + osc(t, END, 43, 0.4) * 0.8, y: HB[1] - sn * (sip + 22 * e) + bob - 8 * e, happy: win(t, ...T.HAPPY), tilt: -0.14 * ease(win(t, T.HAPPY[0], T.HAPPY[1], 0.4, 0.35)) };
}

// ---------------------------------------------------------------- per-frame pieces
const off = (V) => V.x1 < RX0 - 140 || V.x0 > RX1 + 140;
function feedingFlower(c, V, t) {
  const G = geometry(), nod = osc(t, END, 23, 0.7) * 0.8, mx = V.X(G.mouth[0]) + nod * 0.4, my = V.Y(G.mouth[1]) + nod;
  // the stalk: from the salvia clump up to the calyx, with buds and two side flowers
  const base = [mx + Math.cos(G.ang) * 48, my + Math.sin(G.ang) * 48], cx = V.X(CLUMP[0]), cy = V.Y(CLUMP[1]);
  const pts = []; for (let i = 0; i <= 24; i++) { const k = i / 24, u = 1 - k; pts.push([u * u * base[0] + 2 * u * k * (base[0] + 34) + k * k * cx, u * u * base[1] + 2 * u * k * (base[1] + 60) + k * k * cy]); }
  stalk(c, pts, 1.6, 2.6, P.leaf);
  for (const [k, d, s0] of [[0.3, 1, 1.3], [0.48, -1, 1.2], [0.62, 1, 1.1]]) { const [px, py] = pts[R(k * 24)]; salviaFlower(c, R(px), R(py), d, s0); }
  for (const [k, d] of [[0.2, -1], [0.4, 1]]) { const [px, py] = pts[R(k * 24)]; leaf(c, px, py, d > 0 ? -0.5 : -2.6, 22, { shape: "ovate", W: 0.32, ramp: P.leaf, veins: 0, seed: R(k * 100) }); }
  tubeFlower(c, mx, my, G.ang, 34, 1.8);
}
function motes(c, V, t) {
  // drifting pollen / light motes in the sun (periodic)
  for (let i = 0; i < 14; i++) {
    const ph = cyc(t, END, 3 + (i % 4), rnd(i)), x = V.X(RX0 + 30 + rnd(i * 11 + 3) * 480) + osc(t, END, 7 + i, i) * 10, y = V.Y(-470 + rnd(i * 11 + 4) * 360) - ph * 60;
    const tw = (0.5 + 0.5 * osc(t, END, 60 + i * 7, i * 1.7)) * Math.sin(Math.PI * ph); if (tw < 0.35) continue;      // fades out before its drift wraps
    c.px(R(x), R(y), tw > 0.8 ? "#FFFFF0" : "#FFF6C0"); if (tw > 0.85) { c.px(R(x) + 1, R(y), "#FFF2B0"); c.px(R(x), R(y) - 1, "#FFF2B0"); }
  }
}

export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  BACK.blit(c, V, { grade: grade(tod(V.cx)) });
}
export function actors(c, V, t) {
  if (off(V)) return;
  sign(c, R(V.X(SIGN[0])), R(V.Y(SIGN[1])), "LV 5", "wood", 1, t);
  feeder(c, V.X(HOOK[0]), V.Y(HOOK[1]), 24, osc(t, END, 13, 0.2) * 0.06);
  const hs = hbState(t), hx = R(V.X(hs.x)), hy = R(V.Y(hs.y));
  drawHummingbird(c, hx, hy, {
    kind: "anna", s: HB_S, turn: HB_TURN, ...HB_O, tilt: hs.tilt, wing: wingPhase("hummingbird", t), amt: strokeAmt("hummingbird", t), buzz: 0.2,
    sheen: cyc(t, END, 19), look: [0.1, 0.05], blink: blinkAt(t, END / 17, 1.3) * (1 - hs.happy), happy: hs.happy, ghost: 0.55,
  });
  feedingFlower(c, V, t);
  motes(c, V, t);
}
export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  FRONT.blit(c, V, { grade: grade(tod(V.cx)) });
}

/** dev only: the cached layers (built on demand), for edge-clipping checks in dev/tropic-*.mjs */
export function _layers() { if (!BACK) build(); return { BACK, FRONT }; }
