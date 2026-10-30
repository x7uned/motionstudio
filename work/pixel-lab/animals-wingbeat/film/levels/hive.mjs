// LV8 · hive (honeybee, 230 beats/s) — THE FIRST AND LAST FRAME of the loop. A golden-hour meadow (tod 4.2, RANGE
// BIOME.hive = 3780..4320): layered hazy hills with glowing crests and backlit trees, a white wooden beehive with a
// gabled roof on the left, worker bees circling its entrance and drifting over the flowers, poppies / daisies / clover
// / buttercups that grow bigger toward the bottom edge, long soft shadows radiating toward the viewer from the low sun,
// sun rays and pollen glints. The series' honeybee (levels/hive-bee.mjs) hovers in front of the sun disc, backlit,
// its wings a motion-blur fan whose ghost sits at e = cos(2π·beePhase)·strokeAmt.
// Hook beats: "is just its wings" → the bee glances at its wing; "every flap pushes air" → little air wisps under the
// fans; "that makes a sound" → soft sound rings spread from the wings. 41.4 "A honeybee" → a happy little hop;
// "two hundred and thirty" → it glances up at the meter. Everything idle is periodic over END (whole cycles), the hook
// beats are over long before the camera returns, so frame(END) draws exactly frame(0).
// Wing phase and the loop: wingPhase("honeybee", END) is 13945.953 beats (not whole), so beePhase adds the missing
// 0.047 beat as a smooth ramp while LV8 is off screen (14–30 s): at t = 0 and t = END the ghost wing is at the same place.
import { BIOME, LAND, EV, END, wingPhase, strokeAmt } from "../timeline.mjs";
import { tod } from "../world.mjs";
import { sign, fade, mix, bayer, sm, win, lerp, rnd, blinkAt, clamp01 } from "../cute.mjs";
import { Layer, gradeView, osc, cyc } from "./meadow-kit.mjs";
import { drawBee, workerTurning } from "./hive-bee.mjs";
import * as K from "./hive-kit.mjs";

export const RANGE = BIOME.hive;
const R = Math.round, [RX0, RX1] = RANGE, BASE_T = 4.2, SX = 4050;
// rest camera (4050, -180): screen = (wx − 3780, wy + 660)
const BX = 4050, BY = -300, S = 1.36;            // bee head centre (screen 270, 360)
const HX = 3872, HY = LAND + 18;                 // hive: centre x, ground under the stand (screen 92, 658)
const SIGN = [4212, LAND + 2];                   // LV 8 sign post foot (screen 432, 642)
const ENTR = [HX + 2, HY - 30];                  // hive entrance (landing board)

// ---------------------------------------------------------------- palette (golden hour)
const GR = K.grassRamp(BASE_T);
const SHADOW = "#2C2050";
const HAZE = "#FFD98E";
const { FAR, FAR_RIM, MID, MID_RIM, NEAR, NEAR_RIM, TREE, TREE_RIM } = K.HILL42;
const PAINT = ["#4A3A50", "#7E6E84", "#9C8C9E", "#B6A6B4", "#CCBCC4", "#DED0D0", "#ECE0D8"], RIM = "#FFF2C8", RIM2 = "#FFD98A";
const WOOD = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488", "#F0D2A8"];
const BLADE = ["#3A4A22", "#5E6A2C", "#F8D878"], BLADE_D = ["#24361C", "#3E5226", "#E8C060"];

const { hillFar, hillMid, hillNear } = K;
const envR = (x) => 1 - sm(x, RX1 - 170, RX1 - 6);   // hills fade out toward the porch
const shadowDir = (bx, by) => [(bx - SX) / (by - LAND + 150), 1];

// ---------------------------------------------------------------- static layers
let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(RX0 - 40, -420, RX1 + 40, 320); FRONT = new Layer(RX0 - 40, 100, RX1 + 40, 320);
  const g = BACK.g, f = FRONT.g;
  // hills: far haze → mid → near (glowing crests); fading out toward the porch
  K.paintHill(g, RX0, RX1, LAND, (x) => hillFar(x) * (0.35 + 0.65 * envR(x)), FAR, FAR_RIM, null);
  K.paintHill(g, RX0, RX1, LAND, (x) => hillMid(x) * envR(x), MID, MID_RIM, null);
  // a row of small backlit trees and bushes on the mid hill (none straight under the bee)
  for (let i = 0; i < 12; i++) {
    const x = R(RX0 + 20 + rnd(i * 13 + 805) * (RX1 - RX0 - 60)), hm = hillMid(x) * envR(x); if (hm < 14 || Math.abs(x - BX) < 92) continue;
    const y = R(LAND - hm + 4 + rnd(i * 3 + 2) * 4), r = 4 + rnd(i * 7 + 1) * 4;
    g.rect(x, R(y - 2), 1, R(r + 3), "#3A2A20");
    K.backlitBall(g, x, y - r * 0.7, r, TREE, TREE_RIM, i * 7, { amp: 0.1, bumps: 6, sunX: SX });
  }
  K.paintHill(g, RX0, RX1, LAND, (x) => hillNear(x) * envR(x), NEAR, NEAR_RIM, "#F4D488");
  // two bigger trees on the near hill: left behind the hive, right toward the porch
  for (const [x, r, sd] of [[3824, 17, 3], [3842, 12, 5], [4250, 21, 9], [4278, 14, 11]]) {
    const y = LAND - hillNear(x) * envR(x) + 2; g.rect(x - 1, R(y - r * 0.6), 3, R(r * 0.9), "#2A1E16"); g.px(x, R(y - r * 0.6), "#4A3424");
    K.backlitBall(g, x, y - r * 1.15, r, TREE, TREE_RIM, sd, { amp: 0.13, bumps: 7, sunX: SX });
  }
  // meadow floor: golden bands, haze pooled under the low sun, a warm wash over the far meadow (fading out toward the
  // seam with LV7 at x 3780, where both levels show the same graded neutral meadow)
  const wE = (x) => sm(x, RX0, RX0 + 110);
  const ground = (x, y, d, col) => {
    const w = wE(x), dx = (x - SX) / 200, haze = (Math.exp(-dx * dx) * Math.exp(-d / 46) * 0.95 + Math.exp(-d / 14) * 0.5) * w, wash = (0.22 + 0.5 * Math.exp(-d / 120)) * w;
    return K.dmix(K.dmix(col, "#E8B04A", wash, x, y, 0.5), HAZE, haze, x, y, 0.8);
  };
  K.paintGround(g, RX0, RX1, LAND, 320, GR, ground);
  for (let x = RX0; x < RX1; x++) g.px(x, LAND, ((x & 1) ? "#FFE9A8" : "#F8D478"));
  // long shadows first (they lie on the grass under everything that stands)
  { const [vx] = shadowDir(HX, HY); K.shadowStreak(g, HX + 2, HY + 1, 84, 72, vx, 1, SHADOW, 0.95, null, 0.5); }
  { const [vx] = shadowDir(SIGN[0], SIGN[1]); K.shadowStreak(g, SIGN[0], SIGN[1] + 1, 6, 46, vx, 1, SHADOW, 0.9, null, 0.5); }
  for (const [x, r, len] of [[3824, 17, 40], [4250, 21, 150], [4278, 14, 120]]) { const [vx] = shadowDir(x, LAND); K.shadowStreak(g, x + vx * 4, LAND + 2, r * 1.5, len, vx, 1, SHADOW, 0.55, null, 0.36); }
  // a mown path winding from the bottom edge up to the hive (leads the eye: bottom → hive → bee)
  for (let y = LAND + 6; y < 320; y++) {
    const k = (y - LAND) / (320 - LAND), cxp = HX + 6 + 40 * Math.sin(k * 2.6 + 0.2) * k + 30 * k * k, hw = 3 + 34 * k * k + 6 * k;
    for (let x = R(cxp - hw - 3); x <= R(cxp + hw + 3); x++) {
      const e = (hw + 3 - Math.abs(x - cxp)) / 3; if (e <= 0) continue; if (Math.min(1, e) * 0.9 <= bayer(x, y) * (e < 1 ? 1 : 0)) continue;
      const mid = Math.abs(x - cxp) < hw * 0.45, base = g.get(x, y);
      g.px(x, y, mix(base, mid ? "#E2C070" : "#CDB25A", mid ? 0.62 : 0.45));
    }
  }
  const onPath = (x, y) => { const k = (y - LAND) / (320 - LAND), cxp = HX + 6 + 40 * Math.sin(k * 2.6 + 0.2) * k + 30 * k * k, hw = 3 + 34 * k * k + 6 * k; return y > LAND + 4 && Math.abs(x - cxp) < hw + 2; };
  K.grassStrokes(g, RX0, RX1, LAND, 320, 5200, 811, "#2A3818", "#FFE8A0");
  // clover patches (continuing from LV7) and drifts of wildflowers
  for (let p = 0; p < 7; p++) {
    const cx = RX0 + 20 + rnd(p * 23 + 901) * (RX1 - RX0 - 40), cy = LAND + 20 + rnd(p * 29 + 903) * 210;
    for (let i = 0; i < 22; i++) { const x = R(cx + (rnd(p * 100 + i + 905) - 0.5) * 80), y = R(cy + (rnd(p * 100 + i + 955) - 0.5) * 24); if (x < RX0 || x >= RX1) continue; K.trefoil(g, x, y, 2, "#3E5A28", "#9AA048"); if (rnd(p * 7 + i + 3) < 0.35) K.cloverHead(g, x + 1, y - 3, (y - LAND) > 120 ? 2 : 1.2, rnd(i + p) < 0.6 ? K.CLOVER_P : K.CLOVER_W, i); }
  }
  const hiveSkip = (x, y) => (Math.abs(x - HX) < 56 && y < HY + 8) || onPath(x, y) || x < RX0 + 1 || x > RX1 - 1 || (Math.abs(x - SIGN[0]) < 26 && y < SIGN[1] + 4 && y > SIGN[1] - 30);
  const flowerShadow = (x, y, s) => { if (s < 2.5) return; const [vx] = shadowDir(x, y); K.shadowStreak(g, x + 1, y + R(s * 2.4), 2, s * 4, vx, 1, SHADOW, 0.7, null, 0.4); };
  const KINDS = [
    { w: 5, draw: (q, x, y, s, i) => { flowerShadow(x, y, s); if (s >= 2) K.blade(q, x, y + R(s * 2.4), R(s * 2.4), (rnd(i) - 0.5) * 2, BLADE); K.poppy(q, x, y, s * 1.05, i); } },
    { w: 4, draw: (q, x, y, s, i) => { flowerShadow(x, y, s); if (s >= 2) K.blade(q, x, y + R(s * 2.2), R(s * 2.2), 0, BLADE); K.daisy(q, x, y, s * 1.1, i); } },
    { w: 3, draw: (q, x, y, s, i) => { if (s >= 2) K.blade(q, x, y + R(s * 1.8), R(s * 1.8), 0, BLADE); const r = Math.max(1, s * 0.55); K.cloverHead(q, x, y, r < 1.6 ? 1.2 : r, K.CLOVER_P, i); } },
    { w: 3, draw: (q, x, y, s) => { if (s < 2) { q.px(x, y, "#FFD21E"); q.px(x + 1, y, "#FFF27A"); return; } K.blade(q, x, y + R(s * 2), R(s * 2), 0, BLADE); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 0]]) q.px(x + dx, y + dy, "#FFCC1A"); q.px(x, y - 1, "#FFF6A0"); if (s >= 3.4) { q.px(x - 2, y, "#E8A810"); q.px(x + 2, y, "#E8A810"); q.px(x - 1, y - 2, "#FFE660"); q.px(x + 1, y - 2, "#FFE660"); } } },
    { w: 1, draw: (q, x, y, s) => { if (s >= 2) K.blade(q, x, y + R(s * 2.2), R(s * 2.2), 0, BLADE); const r = Math.max(1, R(s * 0.6)); for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283; q.px(R(x + Math.cos(a) * r), R(y + Math.sin(a) * r * 0.8), k % 2 ? "#4A6AE0" : "#7A9AFF"); } q.px(x, y, "#2A2A80"); } },
  ];
  // a few drifts (poppy fields, daisy patches), then a general scatter
  const drifts = [[3960, LAND + 40, 70, 0, 60], [4170, LAND + 80, 110, 0, 140], [3990, LAND + 180, 80, 0, 70], [4260, LAND + 30, 50, 2, 50], [3830, LAND + 150, 60, 1, 70], [4100, LAND + 250, 90, 0, 60], [4060, LAND + 30, 80, 1, 70], [4230, LAND + 200, 70, 1, 60]];
  for (const [dx, dy, rr, kk, cnt] of drifts) for (let i = 0; i < cnt; i++) {
    const an = rnd(i * 7 + dx) * 6.283, q = Math.sqrt(rnd(i * 7 + dy + 1)), x = R(dx + Math.cos(an) * rr * q), y = R(dy + Math.sin(an) * rr * q * (0.22 + (dy - LAND) / 900));
    if (hiveSkip(x, y) || y < LAND + 3) continue; const d = y - LAND, s = d < 24 ? 1 : d < 80 ? 1.8 + rnd(i) : d < 170 ? 2.6 + rnd(i * 3) * 1.2 : 3.4 + rnd(i * 5) * 1.6;
    (rnd(i * 13 + dx) < 0.75 ? KINDS[kk] : KINDS[Math.floor(rnd(i * 17 + dy) * KINDS.length)]).draw(g, x, y, s, i + dx, d);
  }
  K.scatterFlowers(g, RX0 + 2, RX1 - 2, LAND, 300, 820, 977, KINDS, hiveSkip);
  // foxglove spikes behind the hive and the hive itself, then the sign
  for (const [x, h, sd] of [[HX - 52, 56, 1], [HX - 44, 40, 2], [HX + 50, 48, 3], [HX + 58, 34, 4]]) foxglove(g, x, HY - 2, h, sd);
  hive(g);
  for (const dx of [-50, -40, -28, 30, 44, 54]) K.blade(g, HX + dx, HY + 3, 7 + (dx & 3), dx > 0 ? 1 : -1, BLADE);
  sign(g, SIGN[0], SIGN[1], "LV 8", "wood", 1, 0);
  for (const dx of [-8, -4, 5, 9]) K.blade(g, SIGN[0] + dx, SIGN[1] + 2, 6 + (dx & 3), dx > 0 ? 1 : -1, BLADE);
  // glowing seed grasses through the mid meadow (backlit plumes)
  for (let i = 0; i < 150; i++) { const y = R(LAND + 30 + Math.pow(rnd(i * 7 + 1501), 0.9) * 190), x = R(RX0 + 4 + rnd(i * 7 + 1502) * (RX1 - RX0 - 8)), d = y - LAND; if (hiveSkip(x, y)) continue; K.seedGrass(g, x, y, 6 + d * 0.09 + rnd(i) * 6, (rnd(i * 3) - 0.5) * 3); }
  // FRONT: the near meadow — dense backlit blades, clover leaves, seed plumes, buds, then flower heads toward the bottom
  for (let i = 0; i < 620; i++) {
    const x = R(RX0 - 30 + rnd(i * 13 + 1201) * (RX1 - RX0 + 60)), y = R(LAND + 206 + Math.pow(rnd(i * 13 + 1205), 0.7) * 118), h = (10 + (y - LAND - 206) * 0.36 + rnd(i * 3 + 7) * 24) * (onPath(x, y) ? 0.3 : 1);
    if (onPath(x, y) && rnd(i * 31) < 0.6) continue;
    K.blade(f, x, y, h, (rnd(i * 9 + 3) - 0.5) * h * 0.5, rnd(i * 5) < 0.5 ? BLADE : BLADE_D, h > 30 ? 2 : 1);
  }
  for (let i = 0; i < 70; i++) { const x = R(RX0 - 20 + rnd(i * 17 + 1601) * (RX1 - RX0 + 40)), y = R(LAND + 230 + rnd(i * 17 + 1603) * 96), h = 24 + (y - LAND - 230) * 0.5 + rnd(i) * 26; K.seedGrass(f, x, y, h, (rnd(i * 5 + 1) - 0.5) * 10); }
  for (let i = 0; i < 46; i++) { const x = R(RX0 - 20 + rnd(i * 19 + 1301) * (RX1 - RX0 + 40)), y = R(LAND + 240 + rnd(i * 19 + 1303) * 84); K.trefoil(f, x, y, 3 + rnd(i) * 3, "#2E4A22", "#7A8A3A", "#B8B070"); }
  for (let i = 0; i < 30; i++) {
    const x = R(RX0 - 10 + rnd(i * 23 + 1401) * (RX1 - RX0 + 20)), y = R(LAND + 218 + rnd(i * 23 + 1403) * 56), h = 12 + rnd(i * 5 + 1) * 18, kind = i % 4;
    K.blade(f, x, y + h, h, (rnd(i + 3) - 0.5) * 6, BLADE_D, 1);
    if (kind === 0) K.poppy(f, x, y, 4.5 + rnd(i * 7) * 2, i); else if (kind === 1) K.daisy(f, x, y, 5 + rnd(i * 7) * 2, i); else if (kind === 2) K.cloverHead(f, x, y, 3 + rnd(i * 7) * 1.5, K.CLOVER_P, i); else K.poppyBud(f, x, y, 3 + rnd(i));
  }
}

/** Foxglove spike: tall stem, nodding pink bells on one side, lit tips. */
function foxglove(g, x, y, h, seed) {
  for (let j = 0; j <= h; j++) g.px(x + R(Math.sin(j * 0.05 + seed) * 1.2), y - j, j > h * 0.85 ? "#8AA050" : "#4E6A30");
  for (let j = R(h * 0.35); j < h - 3; j += 4) {
    const k = j / h, bx = x + R(Math.sin(j * 0.05 + seed) * 1.2) + 1, by = y - j, w = R(3.4 - k * 2);
    for (let i = 0; i <= w; i++) { g.px(bx + i, by, i === w ? "#F8B8E0" : "#C8509A"); g.px(bx + i, by + 1, i === w ? "#E888C0" : "#9A2E6E"); }
    g.px(bx + w + 1, by + 1, "#5A1640");
  }
  g.px(x, y - h - 1, "#FFE7A0");
}

/** The white wooden beehive (front face in warm shade, the sun behind-right lights its edges): stand, landing board,
 *  deep box, super, gabled roof with a painted heart. World coords. */
function hive(g) {
  const x0 = HX - 42, x1 = HX + 42, O = "#2E2234";
  // stand: two legs and a rail
  for (const lx of [HX - 34, HX + 29]) { g.rect(lx, HY - 16, 6, 16, O); g.rect(lx + 1, HY - 15, 4, 15, WOOD[2]); g.rect(lx + 4, HY - 15, 1, 15, WOOD[5]); }
  g.rect(HX - 46, HY - 22, 92, 7, O); g.rect(HX - 45, HY - 21, 90, 5, WOOD[3]); g.rect(HX - 45, HY - 21, 90, 1, WOOD[6]); g.rect(HX + 42, HY - 21, 3, 5, WOOD[6]);
  // landing board (sloped wedge sticking out in front)
  g.poly([[HX - 22, HY - 24], [HX + 26, HY - 24], [HX + 30, HY - 19], [HX - 26, HY - 19]], O);
  g.poly([[HX - 21, HY - 23], [HX + 25, HY - 23], [HX + 28, HY - 20], [HX - 24, HY - 20]], WOOD[5]); g.rect(HX - 21, HY - 23, 46, 1, WOOD[7]);
  const box = (y0, h, hand) => {
    g.rect(x0 - 1, y0 - 1, x1 - x0 + 2, h + 2, O);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x1; x++) {
      const u = (x - x0) / (x1 - x0), v = (y - y0) / h;
      let s = 4 - (v > 0.8 ? 1 : 0) - (v > 0.93 ? 1 : 0) + (u < 0.12 ? 1 : 0) - (u > 0.88 ? 1 : 0);
      if (v > 0.66 && (v - 0.66) / 0.14 > bayer(x, y) && s > 2) s -= 1;
      if ((y - y0) % 7 === 3 && rnd(x * 3 + y) < 0.5) s -= 1;                 // board grain
      let col = PAINT[Math.max(1, Math.min(6, s))];
      if (x >= x1 - 2) col = x === x1 - 1 ? RIM : RIM2;                      // sun-side edge glows
      if (y === y0) col = u > 0.4 ? RIM : PAINT[6];
      g.px(x, y, col);
    }
    if (hand) { g.rect(HX - 10, y0 + R(h * 0.36), 20, 3, PAINT[1]); g.rect(HX - 10, y0 + R(h * 0.36), 20, 1, PAINT[0]); g.rect(HX - 10, y0 + R(h * 0.36) + 3, 20, 1, PAINT[5]); }
  };
  box(HY - 70, 44, true); box(HY - 100, 29, true);
  g.rect(x0, HY - 71, x1 - x0, 1, PAINT[5]);
  // entrance slot with a few bees in it
  g.rect(HX - 14, HY - 29, 30, 4, "#140C10"); g.rect(HX - 14, HY - 29, 30, 1, "#060406");
  for (const dx of [-9, -2, 7, 12]) { g.px(HX + dx, HY - 27, "#F2BE2A"); g.px(HX + dx + 1, HY - 27, "#1A1020"); }
  // drips of honey/wax at the box seam
  for (const [dx, len] of [[-30, 5], [18, 7], [24, 3]]) { g.rect(HX + dx, HY - 70, 2, len, "#E8A21C"); g.px(HX + dx, HY - 70 + len, "#F4C040"); g.px(HX + dx, HY - 70, "#FFE07A"); }
  // gabled roof: boards, overhang, ridge cap, glowing top edges
  const ry = HY - 101, ax = HX, ay = ry - 32;
  g.poly([[x0 - 13, ry + 3], [ax, ay - 3], [x1 + 13, ry + 3]], O);
  g.poly([[x0 - 10, ry + 1], [ax, ay], [x1 + 10, ry + 1]], WOOD[3]);
  for (let y = ay + 1; y <= ry; y++) {
    const half = ((y - ay) / (ry - ay)) * (x1 - x0 + 20) / 2;
    if ((y - ay) % 6 === 5) g.line(R(ax - half + 2), y, R(ax + half - 2), y, WOOD[2]);
    g.px(R(ax - half + 1), y, WOOD[5]); g.px(R(ax + half - 1), y, RIM); g.px(R(ax + half - 2), y, RIM2); g.px(R(ax + half - 3), y, WOOD[5]);
  }
  for (let i = 0; i <= 54; i++) { const k = i / 54, x = R(ax + (x1 + 12 - ax) * k), y = R(ay - 2 + (ry + 2 - ay + 2) * k); g.px(x, y, RIM); g.px(x, y - 1, RIM2); }
  for (let i = 0; i <= 54; i++) { const k = i / 54, x = R(ax + (x0 - 12 - ax) * k), y = R(ay - 2 + (ry + 2 - ay + 2) * k); g.px(x, y - 1, k < 0.4 ? RIM2 : WOOD[6]); }
  g.rect(x0 - 11, ry + 1, x1 - x0 + 22, 3, WOOD[1]); g.rect(x0 - 11, ry + 1, x1 - x0 + 22, 1, WOOD[4]); g.rect(x1 + 8, ry + 1, 3, 1, RIM);
  g.rect(ax - 2, ay - 4, 5, 3, O); g.px(ax, ay - 4, RIM);
  // a painted heart on the gable
  for (const [dx, dy] of [[-2, 0], [-1, -1], [1, -1], [2, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [0, 2], [1, 2], [0, 3], [-1, 0], [0, 0], [1, 0]]) g.px(ax + dx, ry - 13 + dy, "#E05A6A");
  g.px(ax - 1, ry - 14, "#FF9AA6");
}

// ---------------------------------------------------------------- the bee
const WP_END = wingPhase("honeybee", END), FIX = Math.ceil(WP_END - 1e-9) - WP_END;
/** The honeybee's wing phase: wingPhase plus the tiny loop fix (0 → FIX between 14 s and 30 s, while LV8 is off screen). */
export const beePhase = (t) => wingPhase("honeybee", t) + FIX * sm(t, 14, 30);
const HOP = EV.honeybee + 0.05;                                     // "A honeybee:" — a happy little hop
const GAZE = [[0, [0, 0]], [EV.wings0 - 0.15, [0.85, 0.3]], [EV.two0 - 0.1, [0, 0]], [EV.flap0 - 0.05, [0, 0.85]], [EV.sound0 - 0.3, [0, 0]],
  [EV.two230 - 0.15, [0.15, -0.9]], [EV.thirty230 + 0.55, [0, 0]]];
function gaze(t) { let cur = GAZE[0][1]; for (let i = 1; i < GAZE.length; i++) { const [tk, v] = GAZE[i]; if (t <= tk) break; const e = sm(t, tk, tk + 0.28); cur = [lerp(cur[0], v[0], e), lerp(cur[1], v[1], e)]; } return cur; }
export const T = { HOP: [HOP, 0.55], AIR: [EV.flap0 - 0.05, EV.sound0 + 0.1], RINGS: [EV.sound0 - 0.05, EV.sound0End + 0.6], BEE: { x: BX, y: BY } };
function beeState(t) {
  const hk = clamp01((t - T.HOP[0]) / T.HOP[1]), hop = Math.sin(Math.PI * hk) ** 2 * 10;
  const x = BX + osc(t, END, 29, 0.6) * 2.2, y = BY + osc(t, END, 61) * 2.6 - hop, tilt = 0.035 * osc(t, END, 23, 1.1) + 0.04 * Math.sin(Math.PI * hk);
  return { x, y, tilt, hk };
}
/** downwash wisps under the wing fans ("every flap pushes air") — screen space around the bee. */
function airWisps(c, bx, by, t) {
  const a = win(t, T.AIR[0], T.AIR[1], 0.3, 0.45); if (a <= 0) return; const g = fade(c, a);
  for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) {
    const ph = cyc(t, 0.42, 1, i / 5 + (sd > 0 ? 0.1 : 0)), x = bx + sd * (58 + i * 11 - ph * 8), y = by + 58 + ph * 74, w = 6 + i % 2 * 3, q = fade(g, Math.sin(Math.PI * ph));
    for (let k = -w; k <= w; k++) { const u = k / w, yy = y + u * u * 3; q.px(R(x + k), R(yy), Math.abs(u) < 0.5 ? "#FFF8E4" : "#FFE6B8"); }
  }
}
/** sound rings spreading from the bee ("that makes a sound"): three dithered arcs to the left and right. */
function soundRings(c, bx, by, t) {
  const a = win(t, T.RINGS[0], T.RINGS[1], 0.15, 0.4); if (a <= 0) return;
  for (let i = 0; i < 3; i++) {
    const k = ((t - T.RINGS[0]) / 0.75 - i * 0.33); if (k <= 0 || k >= 1) continue;
    const r = 96 + k * 110, q = fade(c, a * Math.sin(Math.PI * k) * 0.95), cy = by + 40;
    for (const sd of [-1, 1]) for (let j = -40; j <= 40; j++) {
      const an = (j / 40) * 0.62, x = bx + sd * Math.cos(an) * r, y = cy + Math.sin(an) * r;
      q.px(R(x), R(y), "#FFF4D0"); q.px(R(x + sd), R(y), "#FFD98A");
    }
  }
}

// ---------------------------------------------------------------- worker bees (periodic paths)
function workers(d, V, t, glow) {
  const ph0 = beePhase(t) % 1, WB = (x, y, i, f, pollen) => workerTurning(d, V.X(x), V.Y(y), Math.cos(2 * Math.PI * (ph0 + i * 0.37)), f, 1, pollen);
  // circling in front of the entrance (small loops), beside the hive and over the roof
  const LOOPS = [[ENTR[0] - 4, ENTR[1] + 2, 16, 4, 19], [ENTR[0] + 10, ENTR[1] - 3, 24, 6, 23], [ENTR[0] + 2, ENTR[1] + 6, 30, 5, 17],
    [HX + 62, HY - 70, 12, 14, 13], [HX + 74, HY - 98, 16, 10, 29], [HX - 8, HY - 150, 26, 8, 11]];
  LOOPS.forEach(([cx, cy, rx, ry, n], i) => { const ph = (2 * Math.PI * n * t) / END + i * 1.7, x = cx + Math.cos(ph) * rx, y = cy + Math.sin(ph) * ry + Math.sin(ph * 2) * 2; WB(x, y, i, -Math.sin(ph), i % 2 === 1); });
  // foragers drifting between the hive and the flowers (closed figure-of-eight paths)
  for (let i = 0; i < 4; i++) {
    const n = [7, 9, 5, 11][i], ph = (2 * Math.PI * n * t) / END + i * 2.2, cx = [3930, 4150, 4230, 3990][i], cy = [LAND - 40, LAND - 66, LAND - 30, LAND - 78][i], ax = [56, 70, 40, 60][i];
    const x = cx + Math.sin(ph) * ax, y = cy + Math.sin(2 * ph) * 12;     // all paths stay below the hero (screen y > 540)
    WB(x, y, i + 5, Math.cos(ph), true);
  }
  // two bees walking on the landing board
  for (let i = 0; i < 2; i++) { const u = 0.5 + 0.5 * Math.sin((2 * Math.PI * (4 + i * 3) * t) / END + i * 2), x = R(V.X(HX - 18 + u * 40)), y = R(V.Y(HY - 25)); d.rect(x - 2, y - 1, 5, 2, "#1A1020"); d.rect(x - 1, y - 1, 3, 1, "#F2BE2A"); d.px(x, y - 2, glow); }
}

// ---------------------------------------------------------------- module passes
const off = (V) => V.x1 < RX0 - 140 || V.x0 > RX1 + 140;
const gradeAt = (V) => K.relGrade(tod(V.cx), BASE_T);
const near = (V) => 1 - sm(Math.abs(V.cx - SX), 40, 200);
export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  const nk = near(V);
  if (nk > 0) K.sunRays(c, 270, 360, 112, 300, 16, 4211, "#FFF0C0", 0.75 * nk);
  BACK.blit(c, V, { grade: gradeAt(V) });
}
export function actors(c, V, t) {
  if (off(V)) return;
  const gr = gradeAt(V), view = gr ? gradeView(c) : null, d = view ? view.g : c;
  workers(d, V, t, "#FFE7A0");
  const st = beeState(t), sx = R(V.X(st.x)), sy = R(V.Y(st.y));
  if (sx > -200 && sx < 740) {
    const e = Math.cos(2 * Math.PI * (beePhase(t) % 1)) * strokeAmt("honeybee", t);
    const joy = win(t, HOP - 0.05, HOP + 0.9, 0.15, 0.35);
    airWisps(d, sx, sy, t);
    drawBee(d, sx, sy, { wing: { cols: ["#F4FBFF", "#C6DCF2", "#7896C8", "#AECAEA"] }, s: S, tilt: st.tilt, e, look: gaze(t), blink: blinkAt(t, END / 16, 0.7), open: 0.35 + 0.45 * joy, happy: 0, antSway: 3 * osc(t, END, 37, 0.5) });
    soundRings(d, sx, sy, t);
  }
  view?.apply(gr);
}
export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  const gr = gradeAt(V);
  FRONT.blit(c, V, { grade: gr });
  const view = gr ? gradeView(c) : null, d = view ? view.g : c;
  // big swaying flowers along the bottom edge (cached heads, per-frame stems; periodic sway)
  for (const [wx, wy, h, kind, r, n] of BIG) {
    const sw = osc(t, END, n, wx * 0.01) * 2.5 + osc(t, END, n * 2 + 3, wx) * 0.8, x = V.X(wx), y = V.Y(wy); if (x < -40 || x > 580) continue;
    for (let j = 0; j <= h; j++) { const k = j / h, px = R(x + sw * k * k); d.px(px, R(y - j), "#2E3E1C"); d.px(px + 1, R(y - j), k > 0.5 ? "#566A2A" : "#3A4E22"); }
    if (kind === 0) K.bigPoppy(d, x + sw, y - h, r, n); else if (kind === 1) K.bigDaisy(d, x + sw, y - h, r, n); else K.bigClover(d, x + sw, y - h, r, n);
  }
  view?.apply(gr);
  K.motes(c, 26, END, t, [V.X(SX) - 230, 250, V.X(SX) + 230, 620], 31, near(V));
}
// [world x, ground y, stem height, kind (0 poppy · 1 daisy · 2 clover), head radius, sway cycles]
const BIG = [[RX0 + 14, LAND + 318, 64, 0, 20, 41], [RX0 + 70, LAND + 332, 38, 1, 17, 47], [RX0 + 134, LAND + 324, 34, 2, 12, 53], [RX0 + 210, LAND + 336, 22, 0, 13, 61],
  [RX0 + 352, LAND + 328, 30, 2, 11, 43], [RX0 + 420, LAND + 330, 46, 1, 18, 37], [RX0 + 504, LAND + 316, 74, 0, 22, 39], [RX0 + 290, LAND + 342, 20, 1, 12, 59]];
