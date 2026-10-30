// LV4 · banded demoiselle (20 beats/s) — a garden pond in the early afternoon (RANGE BIOME.pond = 1620..2160, tod ≈ 2.3).
// The garden's striped lawn runs in from the left and slopes down to a muddy bank; the far bank has a weeping willow,
// alders, cattails, rushes and yellow irises (reflected, wobbling, in the water); lily pads in perspective with a pink
// water lily, a mossy stone and a small cute frog peeking out of the water and watching the damselfly; slow ripple
// rings, drifting surface glints and the sun's glitter path; swaying reeds and cattails in the bottom corners; on the
// right a grassy bank leads on to the tropical garden. The damselfly hovers under the sun disc: its wings are a strong
// motion-blur fan with two ghost wings from wingPhase("damselfly", t) — right at the threshold where clicks blur.
// On screen 20.6–35.1 s; on air 22.2–29.5 s; the camera pans slowly on to the tropic from 27.0 s. Periodic over END.
import { BIOME, LAND, EV, END, wingPhase, strokeAmt } from "../timeline.mjs";
import { tod } from "../world.mjs";
import { sign, fade, mix, bayer, sm, rnd, blinkAt, win } from "../cute.mjs";
import { Layer, grassAt, GRASS, grade, gradeView, osc, cyc, leafBall, paintHills } from "./meadow-kit.mjs";
import { hillFar, hillNear, FAR, NEAR, lawnAt } from "./garden.mjs";
import { cosmos, PETALS, LEAF } from "./garden-flora.mjs";
import { willow, alder, cattail, rushes, iris, lilyPad, waterLily, mossStone, peekFrog, ripple, loosestrife, marigold, blade } from "./pond-kit.mjs";
import { drawDamselfly } from "./pond-damselfly.mjs";

export const RANGE = BIOME.pond;
const R = Math.round, [RX0, RX1] = RANGE;
// rest camera (1890, −180): screen = (wx − 1620, wy + 660). S converts a rest-screen point to world.
const S = (x, y) => [RX0 + x, y - 660];
const DF = S(270, 348);                       // damselfly head centre
const SIGN = S(140, 630);                     // LV 4 sign post foot (far bank, left)
const FROG = S(186, 872), STONE = S(96, 884);
// ---------------------------------------------------------------- shoreline (rest-screen coords)
const keys = (K) => (v) => { if (v <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) { const [a, ya] = K[i], [b, yb] = K[i + 1]; if (v <= b) { const k = (v - a) / (b - a), e = (1 - Math.cos(Math.PI * k)) / 2; return ya + (yb - ya) * e; } } return K[K.length - 1][1]; };
const bankY = (x) => 646 + 1.5 * Math.sin(x * 0.07);                       // far bank waterline
const shoreL = keys([[644, 112], [652, 94], [672, 78], [720, 64], [800, 56], [880, 60], [960, 78]]);  // lawn | water (left): a rounded bank
const shoreR = keys([[644, 446], [654, 464], [690, 478], [780, 486], [880, 480], [960, 466]]);   // water | grassy bank (right)
const inWater = (x, y) => y > bankY(x) && x > shoreL(y) && x < shoreR(y);
const H_ENV = (x) => 1 - sm(x, RX1 - 200, RX1 - 10);                       // hills sink toward the tropic seam
const WATER = ["#CDEEF4", "#ABDEEA", "#88CADC", "#68B2CA", "#5098B6", "#3E82A2", "#326E8E"];
// row-only dither (horizontal ripple lines): invariant under the camera's horizontal moves, so a 1-px pan shifts the water
// by exactly nothing instead of flipping a checkerboard
const ROWB = [0, 4, 2, 6, 1, 5, 3, 7].map((v) => (v + 0.5) / 8), rowB = (y) => ROWB[((y % 8) + 8) % 8];
function waterAt(x, y) {                                                     // rest-screen coords; depth bands + dither
  const v = Math.min(5.999, Math.pow(Math.max(0, y - 644) / 316, 0.8) * 6), lo = Math.floor(v), f = v - lo;
  return WATER[f > 0.3 + 0.4 * rowB(y) ? lo + 1 : lo];
}

// ---------------------------------------------------------------- static layers
let BACK = null, FRONT = null;
const PADS = [   // [x, y, rx] rest-screen; ry from depth
  [150, 690, 14], [184, 701, 11], [126, 712, 10], [228, 684, 9], [356, 699, 13], [392, 688, 10], [424, 711, 15], [306, 716, 9],
  [104, 776, 22], [154, 800, 18], [336, 788, 24], [394, 768, 20], [440, 822, 18], [240, 842, 16],
  [290, 914, 40], [410, 904, 34], [230, 958, 30], [372, 978, 46],
];
const LILY = [394, 762, 14];
function build() {
  BACK = new Layer(RX0, -300, RX1, 300); FRONT = new Layer(RX0 - 10, 0, RX1 + 10, 300);
  const g = BACK.g, f = FRONT.g, P = (x, y) => S(x, y);
  paintHills(g, RX0, RX1, LAND, (x) => hillFar(x) * H_ENV(x), (x) => hillNear(x) * H_ENV(x), FAR, NEAR);
  // background trees on the far bank: alders (hazy) right, the weeping willow left
  for (const [x, sc, s] of [[236, 0.7, 1], [300, 0.62, 2], [380, 0.8, 3], [446, 0.9, 4], [520, 0.75, 5]]) alder(g, ...P(x, 640), sc, s * 17);
  willow(g, ...P(62, 640), 1.05, 5);
  // the ground: lawn from the garden on the left (darkening as it slopes to the bank), water, grassy bank on the right
  for (let sy = 640; sy < 960; sy++) for (let sx = 0; sx < 540; sx++) {
    const [wx, wy] = P(sx, sy);
    if (sy < bankY(sx)) { g.px(wx, wy, grassAt(wx, wy, wy - LAND)); continue; }
    const dl = shoreL(sy) - sx, dr = sx - shoreR(sy);
    if (dl > 0) {                                                              // lawn sloping down to the left bank
      const lip = 1.5 + (sy - 646) * 0.02; let col = lawnAt(wx, wy);
      const slope = Math.max(0, 1 - (dl - lip) / (10 + (sy - 646) * 0.08)); if (slope > 0) col = mix(col, "#2A5A26", slope * 0.3 * (0.8 + 0.4 * bayer(sx, sy)));
      if (dl < lip) col = dl < lip * 0.5 ? "#4A3420" : ((sx + sy) & 1) ? "#7A5C3A" : "#64482E";
      g.px(wx, wy, col); continue;
    }
    if (dr > 0) {                                                              // grassy right bank
      const lip = 1.5 + (sy - 646) * 0.02; let col = grassAt(wx, wy, wy - LAND);
      if (dr < lip) col = dr < lip * 0.5 ? "#4A3420" : ((sx + sy) & 1) ? "#7A5C3A" : "#64482E"; else if (dr < lip + 8 + (sy - 646) * 0.05) col = mix(col, "#2A5A26", 0.22);
      g.px(wx, wy, col); continue;
    }
    // water: depth bands, the far bank and willow reflected (wobbling rows), a soft glow under the sun
    let col = waterAt(sx, sy);
    const ry = 2 * bankY(sx) - sy, wob = R(2 * Math.sin(sy * 0.9) + Math.sin(sy * 0.37)), [qx, qy] = P(sx + wob, ry);
    if (sy - 646 < 190 && g.has(qx, qy)) {                                  // reflections are soft: an 11-px horizontal average of the far scene
      let r = 0, gg = 0, b = 0, n = 0; for (let k = -5; k <= 5; k++) if (g.has(qx + k, qy)) { const q = g.get(qx + k, qy); r += q[0]; gg += q[1]; b += q[2]; n++; }
      const src = [r / n, gg / n, b / n].map(Math.round), lum = src[0] * 0.3 + src[1] * 0.59 + src[2] * 0.11, k = (lum < 150 ? 0.62 : 0.16) * Math.pow(1 - (sy - 646) / 190, 1.4) * (n / 11); col = mix(col, mix(src, "#3A86A8", 0.25), k);
    }
    if (sx - shoreL(sy) < 3 || shoreR(sy) - sx < 3) col = mix(col, "#3A5A3A", 0.35);                       // the bank's dark reflection at the waterline
    const glow = Math.max(0, 1 - Math.abs(sx - 270) / (14 + (sy - 646) * 0.12)) * Math.max(0, 1 - Math.abs(sy - 760) / 80);
    if (glow > 0) col = mix(col, "#FFF8D8", Math.round(glow * 4) / 8);
    g.px(wx, wy, col);
  }
  g.rect(RX0, LAND, RX1 - RX0, 1, "#C8EC8E");
  // grass texture on the banks
  for (let i = 0; i < 1600; i++) {
    const sy = R(642 + Math.pow(rnd(i * 3 + 7), 1.3) * 318), sx = R(rnd(i * 3 + 8) * 540); if (inWater(sx, sy) || (sy < bankY(sx) + 1 && sy > 646)) continue; const [wx, wy] = P(sx, sy);
    const d = sy - 640, h = d < 40 ? 1 : d < 140 ? 2 : 3, col = rnd(i * 5) < 0.6 ? mix(g.get(wx, wy), "#1E5A2A", 0.3) : mix(g.get(wx, wy), "#E8FFB0", 0.26);
    for (let j = 0; j < h; j++) g.px(wx, wy - j, col);
  }
  // far bank vegetation: rushes, irises, cattails along the waterline (reflected above already? no — drawn after, small)
  for (let i = 0; i < 26; i++) { const sx = 150 + i * 13 + rnd(i * 5) * 8; if (sx > 470) break; const [wx, wy] = P(sx, bankY(sx) - 1), k = rnd(i * 7 + 2); if (k < 0.4) rushes(g, wx, wy, 12 + rnd(i) * 8, 7, i * 9); else if (k < 0.65) iris(g, wx, wy, 16 + rnd(i * 3) * 6, i); else cattail(g, wx, wy, 26 + rnd(i * 11) * 14, 0, i, 0.8); }
  for (let i = 0; i < 6; i++) { const sx = 86 + i * 9; const [wx, wy] = P(sx, bankY(sx)); rushes(g, wx, wy, 10 + rnd(i) * 6, 6, i * 13 + 4); }
  // daisies on the lawn bank (continuing the garden), lily pads, the lily, the stone
  for (let i = 0; i < 14; i++) { const sy = 652 + rnd(i * 17 + 4) * 160, sx = rnd(i * 17 + 3) * (shoreL(sy) - 14); if (sx < 2) continue; cosmos(g, ...P(sx, sy), sy - 640 < 40 ? 1.6 : 2.6, PETALS.white, i); }
  for (const [x, y, rx] of PADS) lilyPad(g, ...P(x, y), rx, rx * (0.26 + ((y - 646) / 314) * 0.24), x * 7 + y);
  waterLily(g, ...P(LILY[0], LILY[1]), LILY[2]);
  { const [bx, by] = P(LILY[0] + 30, LILY[1] - 4); for (let i = 0; i < 6; i++) g.px(bx, by - i, i > 3 ? "#F4A0C4" : "#3C7A34"); g.px(bx - 1, by - 5, "#E87AAE"); g.px(bx + 1, by - 5, "#E87AAE"); }
  mossStone(g, STONE[0], STONE[1], 52, 30, 3);
  for (let X = -56; X <= 56; X++) { const k = X / 56; g.px(R(STONE[0] + X), R(STONE[1] + 16 + 2 * Math.sin(X * 0.3)), ((X & 3) === 0) ? "#9AD8E8" : "#E8FCFF"); void k; }
  // duckweed specks along the left and right shores, bank flowers (loosestrife, marsh marigolds, irises)
  for (let i = 0; i < 260; i++) { const sy = 660 + Math.pow(rnd(i * 5 + 1), 0.9) * 290, side = i & 1, sx = side ? shoreR(sy) - 2 - Math.pow(rnd(i * 5 + 2), 2) * (14 + (sy - 646) * 0.06) : shoreL(sy) + 2 + Math.pow(rnd(i * 5 + 2), 2) * (14 + (sy - 646) * 0.06); if (!inWater(sx, sy)) continue; const [wx, wy] = P(sx, sy); g.px(wx, wy, rnd(i) < 0.5 ? "#7CBE4A" : "#5AA03A"); if (sy > 800) g.px(wx + 1, wy, "#8CCC58"); }
  const bank = [[34, 668, "loose", 1], [70, 688, "mari", 0.8], [20, 720, "iris", 1.1], [48, 760, "loose", 1.25], [62, 806, "mari", 1.1], [500, 676, "loose", 1], [470, 700, "mari", 0.9], [512, 742, "iris", 1.2], [494, 800, "loose", 1.3], [478, 846, "mari", 1.2], [8, 850, "iris", 1.3]];
  for (const [sx, sy, kind, sc] of bank) { const [wx, wy] = P(sx, sy); if (kind === "loose") loosestrife(g, wx, wy, 34 * sc, sx, sc); else if (kind === "mari") marigold(g, wx, wy, sc * 1.2, sx); else iris(g, wx, wy, 26 * sc, sx); }
  // FRONT: stones along the bottom edge and lush bank grass in the corners
  mossStone(f, ...P(18, 968), 40, 26, 7); mossStone(f, ...P(524, 978), 34, 22, 9); mossStone(f, ...P(478, 990), 22, 14, 11);
  loosestrife(f, ...P(104, 978), 150, 11, 1.7); loosestrife(f, ...P(430, 982), 160, 13, 1.8);
  for (let i = 0; i < 22; i++) { const sx = 14 + rnd(i * 7) * 110, [wx, wy] = P(sx, 966 + rnd(i * 3) * 10); blade(f, wx, wy, 50 + rnd(i * 5) * 80, (rnd(i * 9) - 0.3) * 40, 2.5 + rnd(i) * 1.5); }
  for (let i = 0; i < 22; i++) { const sx = 430 + rnd(i * 7 + 1) * 126, [wx, wy] = P(sx, 966 + rnd(i * 3 + 1) * 10); blade(f, wx, wy, 50 + rnd(i * 5 + 1) * 80, (rnd(i * 9 + 1) - 0.6) * 40, 2.5 + rnd(i + 1) * 1.5); }
  marigold(f, ...P(44, 950), 2.4, 5); marigold(f, ...P(150, 980), 2.0, 6); marigold(f, ...P(500, 948), 2.2, 8); marigold(f, ...P(396, 984), 1.9, 9);
}

// ---------------------------------------------------------------- per-frame life
const REEDS = [   // foreground cattails/reeds that sway: [rest-screen x, foot y, height, cattail?, cycles over END]
  [40, 984, 330, 1, 31], [56, 990, 270, 0, 37], [74, 978, 300, 1, 29], [28, 994, 240, 0, 41], [92, 996, 210, 0, 34],
  [486, 984, 312, 1, 33], [506, 992, 260, 0, 39], [528, 980, 290, 1, 27], [470, 998, 220, 0, 43], [548, 990, 240, 0, 35],
];
function reeds(d, V, t) {
  for (const [sx, sy, h, ct, n] of REEDS) {
    const [wx, wy] = S(sx, sy), x = V.X(wx), y = V.Y(wy); if (x < -60 || x > 600) continue;
    const sw = osc(t, END, n, sx) * 5 + osc(t, END, n * 3 + 2, sy) * 1.5;
    if (ct) cattail(d, x, y, h, sw, sx, 2);
    else for (let k = 0; k < 3; k++) blade(d, x + k * 4 - 4, y, h * (1 - k * 0.14), (k - 1) * 14 + sw, 3.2 - k * 0.4);
  }
}
// ripple sources: [rest-screen x, y, max radius, cycles over END, phase]
const RIPPLES = [[212, 712, 26, 11, 0.1], [436, 846, 40, 9, 0.55], [186, 876, 34, 13, 0.3], [318, 760, 30, 7, 0.8]];
function waterLife(d, V, t) {
  for (const [sx, sy, rmax, n, ph] of RIPPLES) {
    const [wx, wy] = S(sx, sy), x = V.X(wx), y = V.Y(wy); if (x < -60 || x > 600) continue;
    for (const lag of [0, 0.18]) { const k = cyc(t, END, n, ph) - lag; if (k <= 0 || k >= 0.85) continue; const q = k / 0.85; ripple(d, x, y, 3 + rmax * Math.sqrt(q), Math.min(sm(q, 0, 0.08), 1 - sm(q, 0.45, 1)) * 0.9); }
  }
  // drifting surface glints and the sun's glitter path
  for (let i = 0; i < 34; i++) {
    const sy = 652 + Math.pow(rnd(i * 13 + 1), 1.2) * 290, base = 20 + rnd(i * 13 + 2) * 480, sx = base + 7 * osc(t, END, 5 + (i % 7), i), [wx, wy] = S(sx, sy), x = R(V.X(wx)), y = R(V.Y(wy));
    if (!inWater(sx, sy)) continue; const a = 0.5 + 0.5 * osc(t, END, 23 + (i % 9) * 4, i * 1.7); if (a < 0.35) continue;
    const w = 2 + R((sy - 646) / 60); for (let k = 0; k < w; k++) d.px(x + k, y, k === 0 || k === w - 1 ? "#BFE8F2" : "#F4FFFF");
  }
  for (let i = 0; i < 26; i++) {
    const sy = 690 + rnd(i * 7 + 3) * 130, spread = 6 + (sy - 646) * 0.11, sx = 270 + (rnd(i * 7 + 4) - 0.5) * 2 * spread, [wx, wy] = S(sx, sy);
    const on = osc(t, END, 97 + i * 13, i * 2.1); if (on < 0.2) continue; const x = R(V.X(wx)), y = R(V.Y(wy));
    d.px(x, y, "#FFFFFF"); if (on > 0.7) { d.px(x - 1, y, "#FFF6C8"); d.px(x + 1, y, "#FFF6C8"); }
  }
}

const N_BOB = 23, N_SWAY = 11, N_TILT = 13;
/** damselfly state at t (pure): wing elevations from wingPhase only, gentle periodic hover */
export function damselState(t) {
  const ph = wingPhase("damselfly", t), amt = strokeAmt("damselfly", t);
  const e = Math.cos(2 * Math.PI * ph) * amt, ePrev = Math.cos(2 * Math.PI * (ph - 1 / 6)) * amt;
  const x = DF[0] + osc(t, END, 9, 0.4) * 3, y = DF[1] + osc(t, END, N_BOB) * 2.5 + osc(t, END, 61, 1) * 0.8;
  return { x, y, e, ePrev, tilt: 0.035 * osc(t, END, N_TILT, 0.7), sway: R(3 * osc(t, END, N_SWAY, 2.0)), look: [0.3 * osc(t, END, 7, 1.0), 0.2 * osc(t, END, 5, 0.3)] };
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
  waterLife(d, V, t);
  // the frog peeks out by the stone and watches the damselfly (eyes follow it), throat pulsing, slow blink
  const st = damselState(t), [fx, fy] = FROG, bob = R(osc(t, END, 19, 0.5) * 1.2);
  peekFrog(d, V.X(fx), V.Y(fy) + bob, { look: [0.35 + 0.15 * osc(t, END, 7, 1.0), -0.9], blink: blinkAt(t, END / 13, 0.7), throat: 0.5 + 0.5 * osc(t, END, 71) });
  sign(d, R(V.X(SIGN[0])), R(V.Y(SIGN[1])), "LV 4", "wood", 1, t);
  const happy = win(t, EV.twenty1 - 0.05, EV.twenty1 + 0.9, 0.2, 0.4);
  drawDamselfly(d, V.X(st.x), V.Y(st.y), { e: st.e, ePrev: st.ePrev, tilt: st.tilt, sway: st.sway, look: st.look, blink: blinkAt(t, END / 19, 2.2), open: 0.3 + 0.45 * happy });
  view?.apply(gr);
}
export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  const gr = grade(tod(V.cx));
  FRONT.blit(c, V, { grade: gr });
  const view = gr ? gradeView(c) : null, d = view ? view.g : c;
  reeds(d, V, t);
  view?.apply(gr);
}
