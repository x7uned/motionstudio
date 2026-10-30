// LV1 · honeybee + the hook — a spring meadow in soft morning light (RANGE BIOME.meadow = 0..540), the FIRST and LAST
// frame of the loop (the dawn shore lies to the left through the wrap, the Cuban forest edge to the right). Distant
// hills, clover and flower drifts, a white box hive on the left, a hibiscus bush leading into the tropics on the right.
// The series' chubby honeybee hovers under the sun disc facing the camera.
// Hook: "billion honeybees" → a seesaw appears; bees stream out of the hive and pile up on its left end (it tips);
// "blue whale" → a whale drops onto the right end and the plank swings level (1,000,000,000+ BEES = 1 BLUE WHALE);
// "climb from light to heavy" → LIGHT → HEAVY. LV1: "tenth of a gram" → 0.1 G; "nectar … half as heavy as itself" →
// the bee lifts a nectar drop almost half its size (sags, wings work harder, worried brows) → 40% OF ITS WEIGHT.
// Loop: every idle motion is periodic over END (integer cycles), all events are over long before the camera returns,
// so t = END draws exactly the t = 0 frame.
import { BIOME, LAND, EV, END, WORLD_W } from "../timeline.mjs";
import { tod } from "../world.mjs";
import { RAMP, C, sign, pickup, panel, fade, mix, bayer, sm, ease, win, lerp, rnd, blinkAt, clamp01, MAIN } from "../cute.mjs";
import { Layer, flower, stem, tuft, clover, leafBall, paintHills, grassAt, grade, gradeView, osc, cyc, MAINC as FONT, pickupC } from "./meadow-kit.mjs";
import { drawBee, miniBee, pileBee } from "./meadow-bee.mjs";

export const RANGE = BIOME.meadow;
const R = Math.round, [RX0, RX1] = RANGE;
// rest camera (270, -180): screen = (wx, wy + 660)
const BX = 270, BY = -300;                       // bee head centre (screen 270, 360)
const HX = 84;                                   // hive centre x (ground LAND)
const SIGN = [424, -12];                         // LV 1 sign post foot (screen 424, 648)
const PIV = [270, LAND - 58], HALF = 192;        // seesaw pivot and half plank length

// ---------------------------------------------------------------- palette (morning)
const WOOD = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488", "#F0D2A8"];
const PAINT = ["#4A4238", "#7A7060", "#A89C88", "#C8BEA8", "#DED6C4", "#ECE6D8", "#F7F3EA", "#FFFFFF"];
const FLW = [["#F48AB0", "#FFE070"], ["#FFD84A", "#E08A20"], ["#FFFFFF", "#F8C840"], ["#B07CE8", "#FFE890"], ["#FF9E7A", "#FFF0A0"]];
const HIB = ["#5A0A14", "#8E1420", "#C0202C", "#E23A3C", "#F4605A", "#FF8E84", "#FFC0B4"];
const BUSH = ["#16381E", "#204A26", "#2C5E30", "#3A743A", "#4C8A44", "#64A050", "#82B864", "#A6D07E"];

// shared hill profile of the meadow → Cuba stretch (cuba.mjs uses the same functions, so the seam at x 540 matches)
const env = (x) => sm(x, 40, 170) * (1 - sm(x, 520, 760));
export const hillFar = (x) => (62 + 24 * Math.sin(x * 0.0105 + 0.7) + 12 * Math.sin(x * 0.031 + 2.1)) * env(x);
export const hillNear = (x) => (30 + 13 * Math.sin(x * 0.017 + 4.0) + 7 * Math.sin(x * 0.043)) * env(x);

// ---------------------------------------------------------------- static layers (built once)
let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(RX0 - 40, -380, RX1 + 40, 320); FRONT = new Layer(RX0 - 40, 120, RX1 + 40, 320);
  const g = BACK.g, f = FRONT.g;
  paintHills(g, RX0 - 40, RX1, LAND, hillFar, hillNear);
  // tiny trees and hedgerows on the near hills (none behind the bee)
  for (let i = 0; i < 9; i++) {
    const x = R(RX0 + 120 + rnd(i * 13 + 5) * (RX1 - RX0 - 160)), hn = hillNear(x);
    if (hn < 14 || Math.abs(x - BX) < 70) continue; const y = R(LAND - hn + 3 + rnd(i) * 6), r = 3 + rnd(i * 7) * 3;
    g.rect(x, R(y), 1, R(r + 2), "#4A6A3A"); leafBall(g, x, y - r * 0.6, r, ["#3E7A48", "#4E8C52", "#5E9E5C", "#74B068", "#8CC27A"], i, { amp: 0.08, bumps: 5 });
  }
  // meadow floor: perspective tone bands, dithered; sandy toward the shore seam at the left edge
  for (let y = LAND; y < 320; y++) for (let x = RX0 - 40; x < RX1; x++) {
    const sand = (1 - sm(x, RX0 - 40, RX0 + 26)) * 0.8; let col = grassAt(x, y, y - LAND);
    if (sand > 0.02) col = mix(col, "#E2D29A", sand * (0.75 + 0.25 * bayer(x, y)));
    g.px(x, y, col);
  }
  g.rect(RX0 - 40, LAND, RX1 - RX0 + 40, 1, "#C6E88A");
  for (let i = 0; i < 4200; i++) {
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 1), 1.4) * 336), x = R(RX0 - 40 + rnd(i * 3 + 2) * (RX1 - RX0 + 36)), d = y - LAND, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4;
    const dark = rnd(i * 5) < 0.6, col = dark ? mix(g.get(x, y), "#1E5A2A", 0.32) : mix(g.get(x, y), "#E8FFB0", 0.3);
    for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col);
  }
  for (let i = 0; i < 10; i++) { const x = R(RX0 - 36 + rnd(i * 17 + 3) * 50), y = R(LAND + 2 + rnd(i * 19) * 60); tuft(g, x, y, 9 + rnd(i) * 10, 5, ["#7A8A48", "#9AAA58", "#C2C878"], i * 9, -3); }
  for (let p = 0; p < 7; p++) {
    const cx = RX0 + 40 + rnd(p * 23 + 1) * (RX1 - RX0 - 80), cy = LAND + 30 + rnd(p * 29) * 220;
    for (let i = 0; i < 26; i++) { const x = R(cx + (rnd(p * 100 + i) - 0.5) * 70), y = R(cy + (rnd(p * 100 + i + 50) - 0.5) * 26); clover(g, x, y, "#3E8A3E", "#7CC85E"); if (rnd(p * 7 + i) < 0.18) { g.px(x, y - 3, "#FFFFFF"); g.px(x + 1, y - 3, "#F4C8DA"); g.px(x, y - 4, "#FFFFFF"); } }
  }
  const drifts = []; for (let i = 0; i < 16; i++) drifts.push([RX0 + 20 + rnd(i * 53 + 1) * (RX1 - RX0 - 40), LAND + 8 + Math.pow(rnd(i * 53 + 2), 1.3) * 300, 30 + rnd(i * 53 + 3) * 50, Math.floor(rnd(i * 53 + 4) * FLW.length)]);
  for (let i = 0; i < 340; i++) {
    let x, y, ci;
    if (i < 280) { const [dx, dy, rr, c0] = drifts[i % drifts.length], an = rnd(i * 7 + 3) * 6.283, q = Math.sqrt(rnd(i * 7 + 4)); x = R(dx + Math.cos(an) * rr * q); y = R(dy + Math.sin(an) * rr * q * (0.25 + (dy - LAND) / 900)); ci = rnd(i * 11) < 0.7 ? c0 : Math.floor(rnd(i * 13) * FLW.length); }
    else { x = R(RX0 + 8 + rnd(i * 7 + 4) * (RX1 - RX0 - 16)); y = R(LAND + 3 + Math.pow(rnd(i * 7 + 3), 1.25) * 320); ci = Math.floor(rnd(i * 11) * FLW.length); }
    if (y < LAND + 2 || (Math.abs(x - HX) < 52 && y < LAND + 10) || x > RX1 - 2) continue;
    const d = y - LAND, s = d < 30 ? 1 : d < 110 ? 2 : d < 220 ? 3 : 4, [pc, ec] = FLW[ci], haze = Math.max(0, 0.35 - d / 200);
    if (s >= 2) stem(g, x, y + s, y + s + 2 + s * 2, "#3A7A36", 0, s >= 3);
    flower(g, x, y, s, haze > 0 ? mix(pc, "#DDEFC8", haze) : pc, ec);
  }
  hibiscusBush(g, 506, LAND + 4);
  hive(g);
  // FRONT: big foreground flowers and grass blades along the bottom
  for (let i = 0; i < 60; i++) {
    const x = R(RX0 - 30 + rnd(i * 13 + 2) * (RX1 - RX0 + 50)), y = R(LAND + 250 + rnd(i * 13 + 5) * 90);
    tuft(f, x, y, 14 + rnd(i) * 16, 4 + Math.floor(rnd(i * 3) * 4), ["#2E6A30", "#3E8238", "#58A044"], i * 5, (rnd(i * 9) - 0.5) * 6);
  }
  for (let i = 0; i < 18; i++) {
    const x = R(RX0 + rnd(i * 19 + 1) * (RX1 - RX0)), y = R(LAND + 244 + rnd(i * 19 + 3) * 90), h = 18 + rnd(i * 5) * 22, [pc, ec] = FLW[(i * 3) % FLW.length];
    stem(f, x, y - h, y, "#2E6A30", (rnd(i) - 0.5) * 8, true); flower(f, x, y - h, 5 + (rnd(i * 7) < 0.4 ? 1 : 0), pc, ec);
  }
  for (const dx of [-46, -34, -12, 6, 30, 44]) tuft(f, HX + dx, LAND + 3, 7, 3, ["#4E9A42", "#6AB04E", "#8ECC62"], dx + 99, 0);
}

/** Hibiscus shrub (red five-petal blooms) — the first tropical plant before the Cuban forest edge. */
export function hibiscusBush(g, x, y, sc = 1, seed = 3) {
  for (const [dx, dy, r, s] of [[-26, -26, 22, 1], [10, -34, 26, 2], [34, -20, 20, 3], [-6, -56, 22, 4], [24, -60, 18, 5]]) leafBall(g, x + dx * sc, y + dy * sc, r * sc, BUSH, s + seed * 7, { amp: 0.16, bumps: 8 });
  for (let i = 0; i < 7; i++) { const fx = x + (rnd(i * 7 + seed) - 0.5) * 70 * sc, fy = y - 18 * sc - rnd(i * 11 + seed) * 50 * sc; hibiscus(g, fx, fy, (4 + rnd(i * 3 + seed) * 2) * sc, i); }
}
/** One hibiscus bloom: five round red petals, darker heart, a long stamen with a yellow tip. */
export function hibiscus(g, x, y, r, seed = 0) {
  x = R(x); y = R(y);
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5 + seed, px = x + Math.cos(a) * r * 0.8, py = y + Math.sin(a) * r * 0.8, pr = r * 0.72;
    for (let Y = R(py - pr); Y <= R(py + pr); Y++) for (let X = R(px - pr); X <= R(px + pr); X++) { const d = ((X - px) ** 2 + (Y - py) ** 2) / (pr * pr); if (d > 1.05) continue; g.px(X, Y, d > 0.8 ? HIB[1] : Y < py - pr * 0.2 ? HIB[4] : HIB[3]); }
  }
  for (let Y = y - 2; Y <= y + 2; Y++) for (let X = x - 2; X <= x + 2; X++) if (Math.abs(X - x) + Math.abs(Y - y) <= 2) g.px(X, Y, HIB[0]);
  const sx = Math.cos(seed * 2.3) > 0 ? 1 : -1; for (let i = 1; i <= R(r * 1.2); i++) g.px(x + R(i * 0.6 * sx), y - R(i * 0.8), "#F6D2A0");
  g.px(x + R(r * 0.72 * sx), y - R(r * 0.96), "#FFD040"); g.px(x + R(r * 0.72 * sx) + 1, y - R(r * 0.96), "#FFE880");
}

function hive(g) {
  const x0 = HX - 42, x1 = HX + 42, O = "#3A2A20";
  for (const lx of [HX - 32, HX + 28]) { g.rect(lx, LAND - 16, 5, 16, O); g.rect(lx + 1, LAND - 15, 3, 15, WOOD[3]); g.rect(lx + 1, LAND - 15, 1, 15, WOOD[4]); }
  g.rect(HX - 48, LAND - 22, 96, 7, O); g.rect(HX - 47, LAND - 21, 94, 5, WOOD[4]); g.rect(HX - 47, LAND - 21, 94, 1, WOOD[6]);
  g.poly([[HX + 58, LAND - 22], [HX + 44, LAND - 27], [HX + 44, LAND - 22]], WOOD[5]); g.line(HX + 58, LAND - 22, HX + 44, LAND - 27, O);
  const box = (y0, h) => {
    g.rect(x0 - 1, y0 - 1, x1 - x0 + 2, h + 2, O);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x1; x++) {
      const u = (x - x0) / (x1 - x0), v = (y - y0) / h; let s = 6 - (u > 0.78 ? 1 + (u > 0.9 ? 1 : 0) : 0) - (v > 0.82 ? 1 : 0) + (v < 0.1 ? 1 : 0);
      if (u > 0.74 && u < 0.78 && (u - 0.74) / 0.04 > bayer(x, y)) s -= 1; g.px(x, y, PAINT[Math.max(1, Math.min(7, s))]);
    }
    g.rect(HX - 9, y0 + R(h * 0.38), 18, 3, PAINT[2]); g.rect(HX - 9, y0 + R(h * 0.38), 18, 1, PAINT[1]);
  };
  box(LAND - 62, 39); box(LAND - 96, 33);
  g.rect(x0, LAND - 63, x1 - x0, 1, PAINT[3]);
  g.rect(HX - 10, LAND - 29, 34, 5, "#20140C"); g.rect(HX - 10, LAND - 29, 34, 1, "#0E0806");
  for (const [dx, len] of [[-30, 7], [-25, 4], [16, 9], [21, 5]]) { g.rect(HX + dx, LAND - 63, 2, len, "#E8A21C"); g.px(HX + dx, LAND - 63 + len, "#F4C040"); g.px(HX + dx, LAND - 63, "#FFE07A"); }
  const ry = LAND - 97, ax = HX, ay = ry - 30;
  g.poly([[x0 - 12, ry + 2], [ax, ay - 2], [x1 + 12, ry + 2]], O);
  g.poly([[x0 - 9, ry], [ax, ay + 1], [x1 + 9, ry]], WOOD[4]);
  for (let y = ay + 2; y < ry; y++) { const half = ((y - ay) / (ry - ay)) * (x1 - x0 + 18) / 2; if ((y - ay) % 6 === 0) g.line(R(ax - half + 1), y, R(ax + half - 1), y, WOOD[3]); g.px(R(ax - half + 1), y, WOOD[6]); g.px(R(ax - half + 2), y, WOOD[5]); }
  g.rect(x0 - 10, ry, x1 - x0 + 20, 3, WOOD[2]); g.rect(x0 - 10, ry, x1 - x0 + 20, 1, WOOD[5]);
  for (const [dx, dy] of [[-2, 0], [-1, -1], [1, -1], [2, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [0, 2], [1, 2], [0, 3], [-1, 0], [0, 0], [1, 0]]) g.px(ax + dx, ry - 12 + dy, "#E05A6A");
}
const ENTRANCE = [HX + 6, LAND - 27];

// ---------------------------------------------------------------- hook: the seesaw (world coords)
const PILE = (() => { const out = []; [8, 7, 6, 5, 3, 1].forEach((n, row) => { for (let i = 0; i < n; i++) out.push([(i - (n - 1) / 2) * 14 + (row % 2) * 0.5, -8 - row * 11]); }); return out; })();
const ARRIVE0 = EV.billion + 0.12, STEP = (EV.blueWhale1 - 0.5 - ARRIVE0) / PILE.length, FLY = 0.5;
const DROP = EV.blueWhale1 + 0.05, LAND_T = DROP + 0.32;                // whale falls onto the plank
const SEE_IN = [EV.billion - 0.05, EV.billion + 0.3], SEE_OUT = [EV.heavy + 0.1, EV.heavy + 0.7];
function plankAngle(t) {
  if (t < LAND_T) { const n = clamp01((t - ARRIVE0 - FLY) / (STEP * PILE.length)); return -0.15 * ease(n); }
  const tau = t - LAND_T; return -0.15 * Math.exp(-tau * 2.6) * Math.cos(2 * Math.PI * 1.25 * tau);
}
const onPlank = (th, d, h = 0) => [PIV[0] + Math.cos(th) * d + Math.sin(th) * h, PIV[1] + Math.sin(th) * d - Math.cos(th) * h - 4];

function whale(g, x, y, th, a) {
  // cute blue whale silhouette lying on the plank, facing left (towards the bees); local coords → rotate by th
  const q = fade(g, a), WS = 1.25, P = (u, v) => [x + (u * Math.cos(th) - v * Math.sin(th)) * WS, y + (u * Math.sin(th) + v * Math.cos(th)) * WS];
  const body = [[-62, -12], [-56, -26], [-40, -33], [-10, -34], [20, -28], [40, -18], [52, -12], [62, -9], [70, -16], [80, -24], [78, -12], [72, -4], [80, 4], [82, 12], [68, 2], [56, -2], [40, 0], [10, 0], [-30, 0], [-56, -2]].map(([u, v]) => P(u, v));
  q.poly(body.map(([u, v]) => [u - 1, v - 1]), "#0E1A36"); q.poly(body.map(([u, v]) => [u + 1, v + 1]), "#0E1A36"); q.poly(body, "#2A4A84");
  q.poly([[-58, -8], [-40, -2], [10, -1], [36, -4], [10, -10], [-30, -10]].map(([u, v]) => P(u, v)), "#4A74B0");
  for (let i = 0; i < 4; i++) { const a0 = P(-50 + i * 7, -6), a1 = P(-26 + i * 7, -3); q.line(R(a0[0]), R(a0[1]), R(a1[0]), R(a1[1]), "#7AA0D0"); }
  q.poly([[-14, -8], [-4, -10], [6, 2], [-6, 0]].map(([u, v]) => P(u, v)), "#1C3460");
  q.poly([[-40, -32], [-10, -33], [12, -29], [-12, -30]].map(([u, v]) => P(u, v)), "#5A84C0");
  const [ex, ey] = P(-44, -18); q.rect(R(ex) - 2, R(ey) - 2, 4, 4, "#0E1A36"); q.px(R(ex) - 1, R(ey) - 2, "#FFFFFF"); q.px(R(ex), R(ey) - 1, "#FFFFFF");
  for (const [u, v] of [[-50, -10], [-49, -9], [-47, -8], [-45, -8], [-43, -9]]) { const [mx, my] = P(u, v); q.px(R(mx), R(my), "#0E1A36"); }
  for (const s of [-1, 1]) { const [bx, by] = P(-36 + s * 4, -10); q.px(R(bx), R(by), "#F27A9A"); q.px(R(bx) + 1, R(by), "#F27A9A"); }
}

function seesaw(c, V, t) {
  const a = Math.min(sm(t, SEE_IN[0], SEE_IN[1]), 1 - sm(t, SEE_OUT[0], SEE_OUT[1])); if (a <= 0) return;
  const th = plankAngle(t), g = fade(c, a), X = (x) => R(V.X(x)), Y = (y) => R(V.Y(y));
  // A-frame fulcrum with a little shadow
  const [px, py] = [X(PIV[0]), Y(PIV[1])], gy = Y(LAND);
  for (let x = -40; x <= 40; x++) for (let y = -3; y <= 3; y++) if ((x / 40) ** 2 + (y / 3) ** 2 <= 1 && 0.5 > bayer(px + x, gy + y)) g.px(px + x, gy + 1 + y, "#2C5A2A");
  g.poly([[px - 24, gy + 1], [px - 2, py + 2], [px + 2, py + 2], [px + 24, gy + 1]], WOOD[1]);
  g.poly([[px - 20, gy], [px - 1, py + 4], [px + 1, py + 4], [px + 20, gy]], WOOD[3]);
  g.poly([[px - 20, gy], [px - 1, py + 4], [px, py + 4], [px - 12, gy]], WOOD[5]);
  g.rect(px - 22, gy - 3, 44, 4, WOOD[2]); g.rect(px - 21, gy - 3, 42, 1, WOOD[5]);
  // plank
  const p = (d, h) => { const [u, v] = onPlank(th, d, h); return [V.X(u), V.Y(v)]; };
  g.poly([p(-HALF, 0), p(HALF, 0), p(HALF, 12), p(-HALF, 12)], WOOD[1]);
  g.poly([p(-HALF + 1, 1), p(HALF - 1, 1), p(HALF - 1, 10), p(-HALF + 1, 10)], WOOD[4]);
  g.poly([p(-HALF + 1, 1), p(HALF - 1, 1), p(HALF - 1, 3), p(-HALF + 1, 3)], WOOD[6]);
  g.poly([p(-HALF + 1, 8), p(HALF - 1, 8), p(HALF - 1, 10), p(-HALF + 1, 10)], WOOD[3]);
  for (const d of [-130, -60, 60, 130]) { const [u0, v0] = p(d, 1), [u1, v1] = p(d, 10); g.line(R(u0), R(v0), R(u1), R(v1), WOOD[2]); }
  for (const d of [-HALF + 6, HALF - 6]) { const [u, v] = p(d, 5); g.px(R(u), R(v), WOOD[1]); }
  g.rect(px - 3, py - 3, 6, 6, WOOD[1]); g.rect(px - 2, py - 2, 4, 4, "#B8B0A0"); g.px(px - 1, py - 1, "#FFFFFF");
  // the bee pile on the left end: each bee flies out of the hive and lands in its slot
  const pileC = -HALF + 66;
  PILE.forEach(([dx, dy], i) => {
    const t0 = ARRIVE0 + i * STEP, k = (t - t0) / FLY; if (k <= 0) return;
    const up = Math.sin(t * 50 + i * 2.1) > 0;
    const [sx, sy] = onPlank(th, pileC + dx, -dy);
    if (k < 1) { // flying from the hive entrance in an arc
      const e = ease(k), x = lerp(ENTRANCE[0], sx, e), y = lerp(ENTRANCE[1], sy, e) - Math.sin(Math.PI * e) * (40 + (i % 5) * 8);
      miniBee(c, V.X(x), V.Y(y), up, 1, a * sm(k, 0, 0.15));
    } else pileBee(c, V.X(sx), V.Y(sy), up, a, i % 3 === 0 ? 1 : 0);
  });
  // a little cloud of bees keeps buzzing over the heap (more than a billion of them, after all)
  const sw = sm(t, T.SWARM[0], T.SWARM[1]) * a;
  if (sw > 0) { const [hx, hy] = onPlank(th, pileC, 0); for (let i = 0; i < 16; i++) { const ph = t * (1.6 + rnd(i * 3) * 1.4) + i * 2.3, x = hx + Math.cos(ph) * (34 + rnd(i * 7) * 30), y = hy - 70 - rnd(i * 5) * 34 + Math.sin(ph * 1.7) * 12; miniBee(c, V.X(x), V.Y(y), Math.sin(t * 47 + i) > 0, Math.cos(ph + 1.57) > 0 ? -1 : 1, sw * sm(rnd(i * 11), 0, 0.2 + 0.8 * sw)); } }
  // the whale: falls onto the right end on "blue whale", then rides the plank
  if (t > DROP) {
    const k = clamp01((t - DROP) / (LAND_T - DROP)), [wx, wy] = onPlank(th, HALF - 78, 0), fall = (1 - k * k) * 70, wa = a * sm(t, DROP, DROP + T.WHALE_FADE);
    whale(c, V.X(wx), V.Y(wy) - fall, th, wa);
    if (t > LAND_T && t < LAND_T + T.DUST) { const q = (t - LAND_T) / T.DUST, g2 = fade(c, a * (1 - q)); for (const s of [-1, 1]) for (let j = 0; j < 3; j++) { const x0 = V.X(wx) + s * (70 + q * 26 + j * 4), y0 = V.Y(wy) - 6 - j * 5 - q * 8; g2.rect(R(x0), R(y0), 3, 2, "#FFFFFF"); } }
  }
}

// ---------------------------------------------------------------- the bee's state (periodic idle + the nectar load)
const LOAD = [EV.nectar, EV.nectar + 0.55, LV1_END() + 4, LV1_END() + 5];   // grows on "nectar", gone long after the camera left
function LV1_END() { return EV.hummingbird; }
const load = (t) => sm(t, LOAD[0], LOAD[1]) * (1 - sm(t, LOAD[2], LOAD[3]));
// timing table of every visible change (used by the picture below AND by levels/meadow-motions.mjs for the sound)
export const T = {
  SEE_IN, SEE_OUT, ARRIVE0, STEP, FLY, PILE_N: PILE.length, DROP, LAND_T, WHALE_FADE: 0.14, DUST: 0.5, HALF,
  SWARM: [ARRIVE0 + STEP * PILE.length * 0.6, ARRIVE0 + STEP * PILE.length + 0.3],
  LBL_BEES: [EV.honeybees - 0.05, EV.honeybees + 0.25], LBL_WHALE: [LAND_T, LAND_T + 0.25],
  TAG_LH: [EV.climb - 0.1, EV.honeybee + 0.3, 0.3, 0.4], HEAVY_IN: [EV.heavy - 0.05, EV.heavy + 0.2], ARROW: [EV.lightW, EV.heavy],
  HOP: [EV.climb, 0.6], PICKUP: [EV.tenth, 1.6], LOAD, TAG_40: [EV.half + 0.05, LV1_END() - 0.6, 0.3, 0.5], SWEAT: [EV.half, EV.half + 0.3],
  BEE: { x: BX, y: BY, half: 96 }, HIVE: { x: HX, half: 70 }, DRIFT: { x0: 170 - 60, x1: 410 + 90 }, FLAP_N: 562, EXTRA_CYCLES: () => EXTRA.cycles,
};
export { plankAngle, beeState, load, onPlank };
// extra wing cycles while loaded, normalised so the total over the loop is a whole number (keeps t = END ≡ t = 0)
const EXTRA = (() => { const n = 2000, out = new Float32Array(n + 1); let acc = 0; for (let i = 1; i <= n; i++) { const t = (END * i) / n; acc += load(t) * (END / n); out[i] = acc; } const total = acc, cycles = Math.round(total * 4.5); return { out, total, cycles }; })();
const extraPhase = (t) => { const f = clamp01(t / END) * 2000, i = Math.floor(f), k = f - i, v = EXTRA.out[Math.min(2000, i)] * (1 - k) + EXTRA.out[Math.min(2000, i + 1)] * k; return (v / EXTRA.total) * EXTRA.cycles; };
const GAZE = [[0, [0, 0]], [EV.billion + 0.2, [-0.6, 0.7]], [EV.blueWhale1 + 0.1, [0.7, 0.75]], [EV.climb - 0.4, [0, 0]], [EV.climb, [0, -0.7]], [EV.heavy + 0.7, [0, 0]],
  [EV.yet1 + 0.4, [-0.8, 0.25]], [EV.nectar + 0.25, [0, 0.85]], [EV.half - 0.1, [0, 0]], [EV.itself + 0.9, [0.7, 0]], [EV.hummingbird + 1.5, [0, 0]]];
function gaze(t) { let cur = GAZE[0][1]; for (let i = 1; i < GAZE.length; i++) { const [tk, v] = GAZE[i]; if (t <= tk) break; const e = sm(t, tk, tk + 0.25); cur = [lerp(cur[0], v[0], e), lerp(cur[1], v[1], e)]; } return cur; }
function beeState(t) {
  const L = load(t), climbHop = Math.sin(clamp01((t - T.HOP[0]) / T.HOP[1]) * Math.PI) * 9;
  const x = BX + osc(t, END, 41, 1.0) * 1.5, y = BY + osc(t, END, 82) * 2.5 + L * (7 + 1.5 * osc(t, END, 240)) - climbHop;
  const tilt = 0.03 * osc(t, END, 127) + L * 0.02 * osc(t, END, 180);
  return { x, y, tilt, L };
}
/** Nectar drop held under the bee (screen coords of the bee head, size 0..1): a glossy golden teardrop, tip up. */
function nectar(c, x, y, k, t, a = 1) {
  if (k <= 0.01) return; const g = fade(c, a), r = 31 * k, wob = osc(t, END, 150) * 0.9 * k, tipY = y + 100, cx = x, cy = tipY + 1.9 * r + 4 * (1 - k);
  const rx = r - wob * 0.5, ry = r + wob * 0.4, tanA = Math.tan(Math.asin(1 / 1.9));
  const inD = (X, Y) => (((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1) || (Y >= tipY && Y <= cy && Math.abs(X - cx) <= (Y - tipY) * tanA);
  for (let Y = R(tipY) - 1; Y <= R(cy + ry + 2); Y++) for (let X = R(cx - rx - 2); X <= R(cx + rx + 2); X++) {
    if (!inD(X + 0.5, Y + 0.5)) continue;
    const edge = !inD(X - 0.5, Y + 0.5) || !inD(X + 1.5, Y + 0.5) || !inD(X + 0.5, Y - 0.5) || !inD(X + 0.5, Y + 1.5);
    if (edge) { g.px(X, Y, "#9A5A0A"); continue; }
    const u = (X - cx) / r, v = (Y - cy) / r, lit = -u * 0.55 - v * 0.6, rr = Math.hypot(u, v * 0.9);
    let col = lit > 0.55 ? "#FFE88E" : lit > 0.1 ? "#FDD050" : lit > -0.35 ? "#F6B432" : "#E8981E";
    if (rr > 0.8 && v > -0.2 && (rr - 0.8) * 5 > bayer(X, Y)) col = "#D27E14";
    if (v > 0.5 && u > -0.2 && u < 0.55 && rr < 0.86) col = ((X + Y) & 1) ? "#FFE070" : col;          // light gathered at the bottom
    g.px(X, Y, col);
  }
  const hx = cx - r * 0.5, hy = cy - r * 0.42;
  for (let Y = -3; Y <= 3; Y++) for (let X = -2; X <= 2; X++) if ((X / 2.4) ** 2 + (Y / 3.6) ** 2 <= 1) g.px(R(hx + X * k + Y * 0.3), R(hy + Y * k), "#FFFDF0");
  g.px(R(cx - r * 0.18), R(cy - r * 0.7), "#FFFFFF"); g.px(R(cx + r * 0.42), R(cy + r * 0.3), "#FFF6C8");
  // little legs gripping the top of the drop
  for (const s of [-1, 1]) for (const [lx, ly, dy] of [[9, 100, 10], [17, 96, 18]]) { const x0 = cx + s * lx, y0 = y + ly, x1 = cx + s * (dy * tanA + 1), y1 = tipY + dy; g.line(R(x0), R(y0), R(x1), R(y1), "#140E1C"); g.px(R(x1) + s, R(y1), "#140E1C"); }
}

// ---------------------------------------------------------------- module passes
const off = (V) => V.x1 < RX0 - 60 || V.x0 > RX1 + 60;
const loopT = (t) => ((t % END) + END) % END;                  // t = END is exactly t = 0 (no float drift at the seam)
const todOf = (V) => tod(V.cx + (V.wrap ? WORLD_W : 0));
export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  BACK.blit(c, V, { grade: grade(todOf(V)), x1: R(V.X(RX1 + 40)) });
}

export function actors(c, V, t) {
  if (off(V)) return; t = loopT(t);
  const gr = grade(todOf(V)), view = gr ? gradeView(c) : null, d = view ? view.g : c;
  sign(d, R(V.X(SIGN[0])), R(V.Y(SIGN[1])), "LV 1", "wood", 1, t);
  // hive workers: three tiny bees circling the entrance (periodic)
  for (let i = 0; i < 3; i++) { const ph = (2 * Math.PI * (23 + i * 5) * t) / END + i * 2.1, x = ENTRANCE[0] + Math.cos(ph) * (12 + i * 6), y = ENTRANCE[1] - 10 + Math.sin(ph * 2) * (6 + i * 3) - i * 10; miniBee(d, V.X(x), V.Y(y), osc(t, END, 640 + i * 17) > 0, -Math.sin(ph) > 0 ? -1 : 1); }
  // a few worker bees drifting over the flowers (closed periodic paths)
  for (let i = 0; i < 3; i++) { const ph = (2 * Math.PI * (7 + i * 3) * t) / END + i * 2.4, x = 170 + i * 120 + Math.sin(ph) * (60 + i * 10), y = LAND - 40 - i * 22 + Math.sin(ph * 2 + i) * 14; miniBee(d, V.X(x), V.Y(y), osc(t, END, 660 + i * 23) > 0, Math.cos(ph) > 0 ? 1 : -1); }
  seesaw(d, V, t);
  // the bee
  const st = beeState(t), sx = R(V.X(st.x)), sy = R(V.Y(st.y)), look = gaze(t);
  const surprise = win(t, LAND_T, LAND_T + 0.6, 0.08, 0.35), joy = win(t, EV.tenth + 0.1, EV.tenth + 1.3, 0.2, 0.4);
  const flap = cyc(t, END, 562) + extraPhase(t);
  nectar(d, sx, sy, ease(clamp01((t - LOAD[0]) / (LOAD[1] - LOAD[0]))) * (1 - sm(t, LOAD[2], LOAD[3])), t, 1);
  drawBee(d, sx, sy, { tilt: st.tilt, look, blink: blinkAt(t, END / 20, 2.0), open: 0.35 + 0.5 * Math.max(surprise, joy), flap, amp: 1 + 0.45 * st.L, antSway: 3 * osc(t, END, 195), worry: st.L * 0.8, sweat: sm(t, T.SWEAT[0], T.SWEAT[1]) * st.L });
  view?.apply(gr);
}

export function front(c, V, t) {
  if (off(V)) return; t = loopT(t); if (!FRONT) build();
  const gr = grade(todOf(V));
  FRONT.blit(c, V, { grade: gr });
  // three tall swaying flowers in the foreground corners (periodic sway)
  const view = gr ? gradeView(c) : null, d = view ? view.g : c;
  for (const [wx, wy, h, ci, n] of [[RX0 + 22, 262, 64, 0, 101], [RX0 + 505, 250, 70, 3, 89], [RX0 + 470, 282, 46, 2, 113]]) {
    const sw = osc(t, END, n, wx) * 3, x = V.X(wx), y = V.Y(wy);
    for (let j = 0; j <= h; j++) { const k = j / h; d.px(R(x + sw * k * k), R(y - j), "#2E6A30"); d.px(R(x + sw * k * k) + 1, R(y - j), j % 9 < 4 ? "#3E8238" : "#2E6A30"); }
    flower(d, x + sw, y - h, 6, FLW[ci][0], FLW[ci][1]);
  }
  view?.apply(gr);
}

export function hud(c, V, t) {
  if (off(V) || V.wrap) return; t = loopT(t);
  const ox = R(V.X(BX)) - 270;                                                    // tags ride with the world during pans
  // labels of the seesaw
  const sa = Math.min(sm(t, SEE_IN[0], SEE_IN[1]), 1 - sm(t, SEE_OUT[0], SEE_OUT[1])), th = plankAngle(t);
  const la = Math.min(sa, sm(t, T.LBL_BEES[0], T.LBL_BEES[1])), ra = Math.min(sa, sm(t, T.LBL_WHALE[0], T.LBL_WHALE[1]));
  const [lx, ly] = onPlank(th, -HALF + 66, 0), [rx, ry] = onPlank(th, HALF - 78, 0);
  label(c, ["1,000,000,000+", "BEES"], R(V.X(lx)), R(V.Y(ly)) - 136, la, C.Y);
  label(c, ["1 BLUE WHALE"], R(V.X(rx)) + 4, R(V.Y(ry)) - 96, ra, C.CY);
  // LIGHT → HEAVY
  const ta = win(t, ...T.TAG_LH);
  if (ta > 0) {
    const s = 3, wL = c.measure(MAIN, "LIGHT", { scale: s }), wH = c.measure(MAIN, "HEAVY", { scale: s }), gap = 52, W = wL + gap + wH + 28, x0 = 270 + ox - R(W / 2), y0 = 204;
    panel(c, x0, y0, W, 38, ta, C.Y);
    const g = fade(c, ta), tx = x0 + 14, ty = y0 + 9, ha = Math.min(ta, sm(t, T.HEAVY_IN[0], T.HEAVY_IN[1]));
    g.text(MAIN, "LIGHT", tx + 1, ty + 1, C.O, { scale: s }); g.text(MAIN, "LIGHT", tx, ty, C.CY, { scale: s });
    const ak = ease(clamp01((t - T.ARROW[0]) / (T.ARROW[1] - T.ARROW[0]))), ax0 = tx + wL + 10, ax1 = ax0 + R((gap - 20) * ak);
    if (ak > 0) { g.rect(ax0, ty + 9, ax1 - ax0 + 1, 3, C.IV); for (let i = 0; i < 6; i++) g.rect(ax1 - i, ty + 10 - i, 1, 1 + i * 2, C.IV); }
    const h = fade(c, ha); h.text(MAIN, "HEAVY", tx + wL + gap + 1, ty + 1, C.O, { scale: s }); h.text(MAIN, "HEAVY", tx + wL + gap, ty, C.OR, { scale: s });
  }
  // +0.1 G on "tenth"
  const st = beeState(t), k = (t - T.PICKUP[0]) / T.PICKUP[1]; if (k > 0 && k < 1) pickupC(c, R(V.X(st.x)), R(V.Y(st.y)) - 98, "0.1 G", k);
  // 40% OF ITS WEIGHT
  const wa = win(t, ...T.TAG_40);
  if (wa > 0) { const s = 2, w = c.measure(MAIN, "40% OF ITS WEIGHT", { scale: s }) + 24, x0 = 270 + ox - R(w / 2), y0 = 206; panel(c, x0, y0, w, 30, wa, C.Y); const g = fade(c, wa); g.text(MAIN, "40%", x0 + 13, y0 + 9, C.O, { scale: s }); g.text(MAIN, "40%", x0 + 12, y0 + 8, C.Y, { scale: s }); const w4 = c.measure(MAIN, "40% ", { scale: s }); g.text(MAIN, "OF ITS WEIGHT", x0 + 12 + w4, y0 + 8, C.IV, { scale: s }); }
}
function label(c, lines, cx, y, a, col) {
  if (a <= 0) return; const s = 2, w = Math.max(...lines.map((l) => c.measure(FONT, l, { scale: s }))) + 16, h = lines.length * 20 + 10, x0 = Math.max(12, Math.min(528 - w, cx - R(w / 2))), y0 = R(y + (1 - a) * 6);
  panel(c, x0, y0, w, h, a, col); const g = fade(c, a);
  lines.forEach((l, i) => { const lw = c.measure(FONT, l, { scale: s }), tx = x0 + R((w - lw) / 2); g.text(FONT, l, tx + 1, y0 + 6 + i * 20 + 1, C.O, { scale: s }); g.text(FONT, l, tx, y0 + 6 + i * 20, i ? C.IV : col, { scale: s }); });
}
