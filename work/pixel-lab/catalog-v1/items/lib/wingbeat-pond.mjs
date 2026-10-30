// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-wingbeat/film/levels/pond.mjs#build (back + front layers).
// Changes: painted in stage coordinates (film rest-screen y − 86, so the far waterline sits at y 560); the strip is 660 px
// wide (x −60..600) and the water/banks run down to y 1000 so every camera stays filled; hills use a constant envelope
// (no seam to the tropic); lawn stripes centre on x 270; film grade (time of day), frog, damselfly, ripples and the global
// sky are not copied; the foreground stones/reeds sit on the bottom edge (stage y ≈ 975).
import { mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { rnd } from "./cute.mjs";
import { Layer, grassAt } from "./animals-forest.mjs";
import { willow, alder, cattail, rushes, iris, lilyPad, waterLily, mossStone, loosestrife, marigold, blade, cosmos, PETALS } from "./wingbeat-pond-kit.mjs";

const R = Math.round, SH = 86, LANDY = 640 - SH, X0 = -60, X1 = 600, Y0 = 250, Y1 = 1010;
const sm = (x, a, b) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const keys = (K) => (v) => { if (v <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) { const [a, ya] = K[i], [b, yb] = K[i + 1]; if (v <= b) { const k = (v - a) / (b - a), e = (1 - Math.cos(Math.PI * k)) / 2; return ya + (yb - ya) * e; } } return K[K.length - 1][1]; };
export const bankY = (x) => 646 + 1.5 * Math.sin(x * 0.07);
const shoreL = keys([[644, 112], [652, 94], [672, 78], [720, 64], [800, 56], [880, 60], [960, 78]]);
const shoreR = keys([[644, 446], [654, 464], [690, 478], [780, 486], [880, 480], [960, 466]]);
const inWater = (x, y) => y > bankY(x) && x > shoreL(y) && x < shoreR(y);
const WATER = ["#CDEEF4", "#ABDEEA", "#88CADC", "#68B2CA", "#5098B6", "#3E82A2", "#326E8E"];
const ROWB = [0, 4, 2, 6, 1, 5, 3, 7].map((v) => (v + 0.5) / 8), rowB = (y) => ROWB[((y % 8) + 8) % 8];
function waterAt(x, y) { const v = Math.min(5.999, Math.pow(Math.max(0, y - 644) / 316, 0.8) * 6), lo = Math.floor(v), f = v - lo; return WATER[f > 0.3 + 0.4 * rowB(y) ? lo + 1 : lo]; }
const FAR = ["#94C4B4", "#A2D0BA", "#B2DAC0", "#C4E4CA"], NEAR = ["#64AA6C", "#74B874", "#86C67E", "#9AD48C"];
const hillFar = (x) => 72 + 20 * Math.sin(x * 0.011 + 0.4) + 10 * Math.sin(x * 0.029 + 1.3);
const hillNear = (x) => 34 + 11 * Math.sin(x * 0.019 + 2.2) + 6 * Math.sin(x * 0.047);
function lawnAt(x, y) {
  const d = y - LANDY, xg = (x - 270) / (d + 60) / 0.2, f = xg - Math.floor(xg), st = Math.abs(f - 0.5) < 0.25 ? 0 : 1, edge = Math.abs(Math.abs(f - 0.5) - 0.25) < 0.04;
  return grassAt(x, y, d, st ? -0.45 : 0.35 + (edge && bayer(x, y) > 0.5 ? -0.3 : 0));
}
const PADS = [[150, 690, 14], [184, 701, 11], [126, 712, 10], [228, 684, 9], [356, 699, 13], [392, 688, 10], [424, 711, 15], [306, 716, 9], [104, 776, 22], [154, 800, 18], [336, 788, 24], [394, 768, 20], [440, 822, 18], [240, 842, 16], [290, 914, 40], [410, 904, 34], [230, 958, 30], [372, 978, 46], [250, 1030, 44], [120, 1010, 36], [440, 1030, 40]];
const LILY = [394, 762, 14], STONE = [96, 884];
let CACHE = null;

function paintBack() {
  const BACK = new Layer(X0, Y0, X1, Y1), g = BACK.g, P = (x, y) => [x, y - SH];
  // paintHills uses its own hill curves in animals-forest; the pond's own far/near hill curves are drawn here instead
  for (let x = X0; x < X1; x++) {
    const hf = hillFar(x), hn = hillNear(x);
    for (let y = R(LANDY - hf); y < LANDY; y++) { const k = (y - (LANDY - hf)) / Math.max(1, hf); const s = k < 0.06 ? 3 : k < 0.3 ? ((k - 0.06) / 0.24 > bayer(x, y) ? 2 : 3) : k < 0.7 ? 2 - ((k - 0.3) / 0.4 > bayer(x, y) ? 1 : 0) : 1; g.px(x, y, FAR[s]); }
    for (let y = R(LANDY - hn); y < LANDY; y++) { const k = (y - (LANDY - hn)) / Math.max(1, hn); const s = k < 0.08 ? 3 : k < 0.35 ? 2 : k < 0.75 ? ((k - 0.35) / 0.4 > bayer(x, y) ? 1 : 2) : 0; g.px(x, y, NEAR[s]); }
  }
  for (const [x, sc, s] of [[-30, 0.8, 7], [236, 0.7, 1], [300, 0.62, 2], [380, 0.8, 3], [446, 0.9, 4], [520, 0.75, 5], [586, 0.8, 6]]) alder(g, ...P(x, 640), sc, s * 17);
  willow(g, ...P(62, 640), 1.05, 5);
  for (let sy = 640; sy < Y1 + SH; sy++) for (let sx = X0; sx < X1; sx++) {
    const [wx, wy] = P(sx, sy);
    if (sy < bankY(sx)) { g.px(wx, wy, grassAt(wx, wy, wy - LANDY)); continue; }
    const dl = shoreL(sy) - sx, dr = sx - shoreR(sy);
    if (dl > 0) {
      const lip = 1.5 + (sy - 646) * 0.02; let col = lawnAt(wx, wy);
      const slope = Math.max(0, 1 - (dl - lip) / (10 + (sy - 646) * 0.08)); if (slope > 0) col = mix(col, "#2A5A26", slope * 0.3 * (0.8 + 0.4 * bayer(sx, sy)));
      if (dl < lip) col = dl < lip * 0.5 ? "#4A3420" : ((sx + sy) & 1) ? "#7A5C3A" : "#64482E";
      g.px(wx, wy, col); continue;
    }
    if (dr > 0) {
      const lip = 1.5 + (sy - 646) * 0.02; let col = grassAt(wx, wy, wy - LANDY);
      if (dr < lip) col = dr < lip * 0.5 ? "#4A3420" : ((sx + sy) & 1) ? "#7A5C3A" : "#64482E"; else if (dr < lip + 8 + (sy - 646) * 0.05) col = mix(col, "#2A5A26", 0.22);
      g.px(wx, wy, col); continue;
    }
    let col = waterAt(sx, sy);
    const ry = 2 * bankY(sx) - sy, wob = R(2 * Math.sin(sy * 0.9) + Math.sin(sy * 0.37)), [qx, qy] = P(sx + wob, ry);
    if (sy - 646 < 190 && g.has(qx, qy)) {
      let r = 0, gg = 0, b = 0, n = 0; for (let k = -5; k <= 5; k++) if (g.has(qx + k, qy)) { const q = g.get(qx + k, qy); r += q[0]; gg += q[1]; b += q[2]; n++; }
      const src = [r / n, gg / n, b / n].map(Math.round), lum = src[0] * 0.3 + src[1] * 0.59 + src[2] * 0.11, k = (lum < 150 ? 0.62 : 0.16) * Math.pow(1 - (sy - 646) / 190, 1.4) * (n / 11); col = mix(col, mix(src, "#3A86A8", 0.25), k);
    }
    if (sx - shoreL(sy) < 3 || shoreR(sy) - sx < 3) col = mix(col, "#3A5A3A", 0.35);
    g.px(wx, wy, col);
  }
  g.rect(X0, LANDY, X1 - X0, 1, "#C8EC8E");
  for (let i = 0; i < 2200; i++) {
    const sy = R(642 + Math.pow(rnd(i * 3 + 7), 1.3) * 365), sx = R(X0 + rnd(i * 3 + 8) * (X1 - X0)); if (inWater(sx, sy) || (sy < bankY(sx) + 1 && sy > 646)) continue; const [wx, wy] = P(sx, sy);
    if (!g.has(wx, wy)) continue;
    const d = sy - 640, h = d < 40 ? 1 : d < 140 ? 2 : 3, col = rnd(i * 5) < 0.6 ? mix(g.get(wx, wy), "#1E5A2A", 0.3) : mix(g.get(wx, wy), "#E8FFB0", 0.26);
    for (let j = 0; j < h; j++) g.px(wx, wy - j, col);
  }
  for (let i = 0; i < 26; i++) { const sx = 150 + i * 13 + rnd(i * 5) * 8; if (sx > 470) break; const [wx, wy] = P(sx, bankY(sx) - 1), k = rnd(i * 7 + 2); if (k < 0.4) rushes(g, wx, wy, 12 + rnd(i) * 8, 7, i * 9); else if (k < 0.65) iris(g, wx, wy, 16 + rnd(i * 3) * 6, i); else cattail(g, wx, wy, 26 + rnd(i * 11) * 14, 0, i, 0.8); }
  for (let i = 0; i < 6; i++) { const sx = 86 + i * 9; const [wx, wy] = P(sx, bankY(sx)); rushes(g, wx, wy, 10 + rnd(i) * 6, 6, i * 13 + 4); }
  for (let i = 0; i < 14; i++) { const sy = 652 + rnd(i * 17 + 4) * 160, sx = rnd(i * 17 + 3) * (shoreL(sy) - 14); if (sx < 2) continue; cosmos(g, ...P(sx, sy), sy - 640 < 40 ? 1.6 : 2.6, PETALS.white, i); }
  for (const [x, y, rx] of PADS) lilyPad(g, ...P(x, y), rx, rx * (0.26 + Math.min(1, (y - 646) / 314) * 0.24), x * 7 + y);
  waterLily(g, ...P(LILY[0], LILY[1]), LILY[2]);
  { const [bx, by] = P(LILY[0] + 30, LILY[1] - 4); for (let i = 0; i < 6; i++) g.px(bx, by - i, i > 3 ? "#F4A0C4" : "#3C7A34"); g.px(bx - 1, by - 5, "#E87AAE"); g.px(bx + 1, by - 5, "#E87AAE"); }
  mossStone(g, ...P(STONE[0], STONE[1]), 52, 30, 3);
  for (let X = -56; X <= 56; X++) g.px(...P(R(STONE[0] + X), R(STONE[1] + 16 + 2 * Math.sin(X * 0.3))), ((X & 3) === 0) ? "#9AD8E8" : "#E8FCFF");
  for (let i = 0; i < 300; i++) { const sy = 660 + Math.pow(rnd(i * 5 + 1), 0.9) * 340, side = i & 1, sx = side ? shoreR(sy) - 2 - Math.pow(rnd(i * 5 + 2), 2) * (14 + (sy - 646) * 0.06) : shoreL(sy) + 2 + Math.pow(rnd(i * 5 + 2), 2) * (14 + (sy - 646) * 0.06); if (!inWater(sx, sy)) continue; const [wx, wy] = P(sx, sy); g.px(wx, wy, rnd(i) < 0.5 ? "#7CBE4A" : "#5AA03A"); if (sy > 800) g.px(wx + 1, wy, "#8CCC58"); }
  const bank = [[34, 668, "loose", 1], [70, 688, "mari", 0.8], [20, 720, "iris", 1.1], [48, 760, "loose", 1.25], [62, 806, "mari", 1.1], [500, 676, "loose", 1], [470, 700, "mari", 0.9], [512, 742, "iris", 1.2], [494, 800, "loose", 1.3], [478, 846, "mari", 1.2], [8, 850, "iris", 1.3], [-30, 700, "loose", 1], [570, 720, "loose", 1.1]];
  for (const [sx, sy, kind, sc] of bank) { const [wx, wy] = P(sx, sy); if (kind === "loose") loosestrife(g, wx, wy, 34 * sc, sx, sc); else if (kind === "mari") marigold(g, wx, wy, sc * 1.2, sx); else iris(g, wx, wy, 26 * sc, sx); }
  return BACK;
}
function paintFront() {
  const FRONT = new Layer(X0, 700, X1, Y1), f = FRONT.g, B = 975;       // stage y of the bottom edge
  mossStone(f, 18, B - 4, 40, 26, 7); mossStone(f, 524, B + 6, 34, 22, 9); mossStone(f, 478, B + 18, 22, 14, 11);
  loosestrife(f, 104, B + 6, 150, 11, 1.7); loosestrife(f, 430, B + 10, 160, 13, 1.8);
  for (let i = 0; i < 22; i++) blade(f, 14 + rnd(i * 7) * 110, B - 6 + rnd(i * 3) * 10, 50 + rnd(i * 5) * 80, (rnd(i * 9) - 0.3) * 40, 2.5 + rnd(i) * 1.5);
  for (let i = 0; i < 22; i++) blade(f, 430 + rnd(i * 7 + 1) * 126, B - 6 + rnd(i * 3 + 1) * 10, 50 + rnd(i * 5 + 1) * 80, (rnd(i * 9 + 1) - 0.6) * 40, 2.5 + rnd(i + 1) * 1.5);
  marigold(f, 44, B - 24, 2.4, 5); marigold(f, 150, B + 6, 2.0, 6); marigold(f, 500, B - 26, 2.2, 8); marigold(f, 396, B + 10, 1.9, 9);
  return FRONT;
}
export const pondLayers = () => (CACHE ??= { BACK: paintBack(), FRONT: paintFront() });
export { SH, LANDY, inWater, shoreL, shoreR, bankY as bank };
