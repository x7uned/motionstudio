// LV7 · clover (bumblebee, 150 beats/s) — a clover and lavender field in the late afternoon (tod 3.6, RANGE
// BIOME.clover = 3240..3780). The hills of the hive meadow run on from the right (same profile, palettes re-graded to
// 3.6); on the mid hill a lavender farm draws purple rows along the slope; a weathered split-rail fence crosses the
// field, the "LV 7" sign stands in front of it; lavender bushes and red/white clover fill the meadow and grow big toward
// the bottom edge (cached clover heads and lavender spikes sway in the foreground). The meadow floor near x 3780 is the
// same graded neutral meadow as LV8's left edge, so the field continues into the bee meadow.
// The buff-tailed bumblebee (levels/clover-bumblebee.mjs) hovers in front of the sun disc: heavy slow hover, small
// smoky wings as a blur fan at e = cos(2π·wingPhase("bumblebee", t))·strokeAmt; it glances down at the clover, up at the
// meter on "a hundred and fifty", and on "a deep buzz" (40.1 s) does a happy little bounce with "^ ^" eyes and buzz
// lines. Everything idle is periodic over END (whole cycles).
import { BIOME, LAND, EV, END, wingPhase, strokeAmt } from "../timeline.mjs";
import { tod } from "../world.mjs";
import { sign, fade, mix, bayer, sm, win, lerp, rnd, blinkAt, clamp01 } from "../cute.mjs";
import { Layer, gradeView, osc } from "./meadow-kit.mjs";
import { drawBumblebee } from "./clover-bumblebee.mjs";
import * as K from "./hive-kit.mjs";

export const RANGE = BIOME.clover;
const R = Math.round, [RX0, RX1] = RANGE, BASE_T = 3.6, SX = 3510;
// rest camera (3510, -180): screen = (wx − 3240, wy + 660)
const BX = 3510, BY = -308, S = 1.3;               // bumblebee head centre (screen 270, 352)
const SIGN = [3330, LAND + 14];                    // LV 7 sign post foot (screen 90, 654)
const FENCE = { x0: 3256, x1: 3520, y: LAND + 6, step: 44 };

// ---------------------------------------------------------------- palette (late afternoon)
const GR = K.grassRamp(BASE_T);
const H = K.regrade(K.HILL42, BASE_T, 4.2);        // the hive's hills as they look at 3.6
const SHADOW = "#2A2A54";
const LAVROW = ["#7A62B0", "#6A549E", "#5E4A8E", "#54447E"], LAVGAP = ["#7E8A5A", "#707C50", "#646E48", "#5A6242"];
const WOOD = ["#2A1A12", "#4A3022", "#6A4A34", "#8A6648", "#A8845E", "#C4A27A", "#DEC29A"];
const BLADE = ["#3A5226", "#5E7A32", "#F2DC86"], BLADE_D = ["#24401E", "#3E5A28", "#E2C870"];
const envL = (x) => sm(x, RX0 + 6, RX0 + 170);    // hills fade out toward the leaf garden
const shadowDir = (bx, by) => [(bx - SX) / (by - LAND + 170), 1];

// ---------------------------------------------------------------- static layers
let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(RX0 - 40, -420, RX1 + 40, 320); FRONT = new Layer(RX0 - 40, 100, RX1 + 40, 320);
  const g = BACK.g, f = FRONT.g;
  K.paintHill(g, RX0, RX1, LAND, (x) => K.hillFar(x) * (0.35 + 0.65 * envL(x)), H.FAR, H.FAR_RIM, null);
  // mid hill with the lavender farm: purple rows following the slope (fading out toward the seam with LV8)
  const lavW = (x) => (1 - sm(x, 3560, 3700)) * sm(x, RX0 + 10, RX0 + 60);
  for (let x = RX0; x < RX1; x++) {
    const hh = K.hillMid(x) * envL(x); if (hh < 0.5) continue; const top = R(LAND - hh), lw = lavW(x);
    for (let y = top; y < LAND; y++) {
      const k = (y - top) / Math.max(1, hh), v = k * 3, lo = Math.floor(v), f2 = v - lo, band = Math.min(3, f2 > 0.55 + 0.4 * (bayer(x, y) - 0.5) ? lo + 1 : lo);
      let col = H.MID[band];
      if (lw > 0.02 && y > top + 1) { const row = Math.sin(k * k * 46 + x * 0.004) > 0.15; if (lw > bayer(x + 2, y) * 0.999) col = row ? LAVROW[band] : LAVGAP[band]; }
      if (y === top) col = H.MID_RIM;
      g.px(x, y, col);
    }
  }
  for (let i = 0; i < 10; i++) {
    const x = R(RX0 + 30 + rnd(i * 13 + 2805) * (RX1 - RX0 - 60)), hm = K.hillMid(x) * envL(x); if (hm < 14 || Math.abs(x - BX) < 96) continue;
    const y = R(LAND - hm + 4 + rnd(i * 3 + 2) * 4), r = 4 + rnd(i * 7 + 1) * 4; g.rect(x, R(y - 2), 1, R(r + 3), "#3A2A20");
    K.backlitBall(g, x, y - r * 0.7, r, H.TREE, H.TREE_RIM, i * 7 + 3, { amp: 0.1, bumps: 6, sunX: SX });
  }
  K.paintHill(g, RX0, RX1, LAND, (x) => K.hillNear(x) * envL(x), H.NEAR, H.NEAR_RIM, "#F0DA90");
  // a farmhouse-side poplar row on the near hill, left
  for (const [x, r, sd] of [[3290, 9, 2], [3306, 11, 4], [3324, 8, 6], [3700, 15, 8]]) { const y = LAND - K.hillNear(x) * envL(x) + 2; g.rect(x, R(y - r), 2, R(r * 1.2), "#2A1E16"); K.backlitBall(g, x, y - r * 1.6, r, H.TREE, H.TREE_RIM, sd, { amp: 0.1, bumps: 6, sy: 1.5, sunX: SX }); }
  // meadow floor: the graded neutral meadow + a soft warm glow under the sun (fading out at both seams)
  const w = (x) => sm(x, RX0, RX0 + 90) * (1 - sm(x, RX1 - 110, RX1));
  const ground = (x, y, d, col) => { const ww = w(x), dx = (x - SX) / 220, haze = (Math.exp(-dx * dx) * Math.exp(-d / 40) * 0.7 + Math.exp(-d / 12) * 0.35) * ww; return K.dmix(col, "#FFE6A8", haze, x, y, 0.75); };
  K.paintGround(g, RX0, RX1, LAND, 320, GR, ground);
  for (let x = RX0; x < RX1; x++) g.px(x, LAND, ((x & 1) ? "#F8EAB0" : "#E8D890"));
  // shadows: fence, sign, the poplars
  for (let x = FENCE.x0; x <= FENCE.x1; x += FENCE.step) { const [vx] = shadowDir(x, FENCE.y); K.shadowStreak(g, x, FENCE.y + 1, 6, 40, vx, 1, SHADOW, 0.8, null, 0.42); }
  { const [vx] = shadowDir(FENCE.x0, FENCE.y); for (let x = FENCE.x0; x < FENCE.x1; x += 3) { const [v2] = shadowDir(x, FENCE.y); K.shadowStreak(g, x + v2 * 16, FENCE.y + 17, 4, 14, v2, 1, SHADOW, 0.5, null, 0.3); } void vx; }
  { const [vx] = shadowDir(SIGN[0], SIGN[1]); K.shadowStreak(g, SIGN[0], SIGN[1] + 1, 6, 44, vx, 1, SHADOW, 0.9, null, 0.48); }
  K.grassStrokes(g, RX0, RX1, LAND, 320, 5200, 2811, "#22381C", "#FFF0B0", 0.3);
  // white clover carpet with leaves, then lavender bushes, then red clover drifts
  for (let p = 0; p < 10; p++) {
    const cx = RX0 + 10 + rnd(p * 23 + 2901) * (RX1 - RX0 - 20), cy = LAND + 16 + rnd(p * 29 + 2903) * 220;
    for (let i = 0; i < 30; i++) { const x = R(cx + (rnd(p * 100 + i + 2905) - 0.5) * 90), y = R(cy + (rnd(p * 100 + i + 2955) - 0.5) * 26); if (x < RX0 || x >= RX1) continue; K.trefoil(g, x, y, (y - LAND) > 140 ? 3 : 2, "#2E5A2E", "#78A850"); if (rnd(p * 7 + i + 3) < 0.4) K.cloverHead(g, x + 1, y - 3, (y - LAND) > 120 ? 2 : 1.2, rnd(i + p) < 0.5 ? K.CLOVER_P : K.CLOVER_W, i); }
  }
  const skip = (x, y) => x < RX0 + 1 || x > RX1 - 1 || (Math.abs(x - SIGN[0]) < 24 && y < SIGN[1] + 4 && y > SIGN[1] - 30);
  const flowerShadow = (x, y, s) => { if (s < 2.5) return; const [vx] = shadowDir(x, y); K.shadowStreak(g, x + 1, y + R(s * 2.4), 2, s * 3.6, vx, 1, SHADOW, 0.6, null, 0.36); };
  const KINDS = [
    { w: 7, draw: (q, x, y, s, i) => { flowerShadow(x, y, s); if (s >= 2) K.blade(q, x, y + R(s * 2.2), R(s * 2.2), (rnd(i) - 0.5) * 2, BLADE); const r = Math.max(1, s * 0.62); K.cloverHead(q, x, y, r < 1.6 ? 1.2 : r, K.CLOVER_P, i); } },
    { w: 3, draw: (q, x, y, s, i) => { if (s >= 2) K.blade(q, x, y + R(s * 1.6), R(s * 1.6), 0, BLADE); const r = Math.max(1, s * 0.5); K.cloverHead(q, x, y, r < 1.6 ? 1.2 : r, K.CLOVER_W, i); } },
    { w: 2, draw: (q, x, y, s, i, d) => { if (s < 2) { q.px(x, y, K.LAV[3]); q.px(x, y - 1, K.LAV[4]); return; } K.lavender(q, x, y + R(s * 3), s * 4 + d * 0.04, (rnd(i) - 0.5) * 3, i); } },
    { w: 1, draw: (q, x, y, s) => { if (s < 2) { q.px(x, y, "#FFD21E"); return; } K.blade(q, x, y + R(s * 2), R(s * 2), 0, BLADE); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 0]]) q.px(x + dx, y + dy, "#FFCC1A"); q.px(x, y - 1, "#FFF6A0"); } },
    { w: 1, draw: (q, x, y, s, i) => { flowerShadow(x, y, s); if (s >= 2) K.blade(q, x, y + R(s * 2.2), R(s * 2.2), 0, BLADE); K.daisy(q, x, y, s * 1.05, i); } },
  ];
  // lavender bushes: clumps of spikes (shadow first), mid meadow
  for (const [bx, by, n, hgt] of [[3410, LAND + 34, 26, 16], [3620, LAND + 52, 32, 20], [3300, LAND + 96, 30, 24], [3700, LAND + 130, 34, 28], [3460, LAND + 168, 36, 30], [3590, LAND + 236, 30, 36]]) {
    const [vx] = shadowDir(bx, by); K.shadowStreak(g, bx, by + 2, n * 0.9, hgt * 1.2, vx, 1, SHADOW, 0.7, null, 0.4);
    { const rx = n * 0.62, ry = hgt * 0.32; for (let Y = R(by - ry); Y <= R(by + 1); Y++) for (let X = R(bx - rx); X <= R(bx + rx); X++) { const u = (X - bx) / rx, v = (Y - by) / ry; if (u * u + v * v > 1) continue; g.px(X, Y, v < -0.6 ? "#9AB488" : u * u + v * v > 0.8 ? "#3E5A40" : v < -0.2 ? "#7A9A70" : "#5A7A5A"); } }
    for (let i = 0; i < n; i++) { const u = (i / (n - 1) - 0.5) * 2, x = R(bx + u * n * 0.55 + (rnd(i * 3 + bx) - 0.5) * 3), y = R(by + (rnd(i * 5 + by) - 0.3) * 4), h = hgt * (0.7 + 0.3 * (1 - u * u)) * (0.85 + rnd(i * 7 + bx) * 0.3); K.lavender(g, x, y, h, u * hgt * 0.35, i + bx); }
  }
  // the clover carpet: many heads, bigger toward the viewer (pink, violet and white), trefoils under some
  for (let i = 0; i < 900; i++) {
    const y = R(LAND + 4 + Math.pow(rnd(i * 7 + 3701), 1.15) * 236), x = R(RX0 + 2 + rnd(i * 7 + 3702) * (RX1 - RX0 - 4)), d = y - LAND; if (skip(x, y)) continue;
    const r = d < 26 ? 1.2 : d < 90 ? 1.6 + rnd(i) * 0.6 : d < 170 ? 2.2 + rnd(i * 3) * 0.9 : 2.8 + rnd(i * 5) * 1.3, q = rnd(i * 11 + 3);
    const pal = q < 0.62 ? K.CLOVER_P : q < 0.8 ? K.CLOVER_V : K.CLOVER_W;
    if (r >= 2.2) { flowerShadow(x, y, r * 1.6); K.blade(g, x, y + R(r * 2.6), R(r * 2.6), (rnd(i * 13) - 0.5) * 2, BLADE); if (rnd(i * 17) < 0.5) K.trefoil(g, x + (rnd(i) < 0.5 ? -3 : 3), y + R(r * 2), r > 3 ? 3 : 2, "#2E5A2E", "#78A850"); }
    K.cloverHead(g, x, y, r, pal, i);
  }
  const drifts = [[3360, LAND + 50, 80, 0, 90], [3560, LAND + 90, 100, 0, 110], [3440, LAND + 200, 90, 0, 80], [3680, LAND + 30, 60, 1, 50], [3290, LAND + 170, 60, 1, 50], [3640, LAND + 210, 80, 0, 70]];
  for (const [dx, dy, rr, kk, cnt] of drifts) for (let i = 0; i < cnt; i++) {
    const an = rnd(i * 7 + dx) * 6.283, q = Math.sqrt(rnd(i * 7 + dy + 1)), x = R(dx + Math.cos(an) * rr * q), y = R(dy + Math.sin(an) * rr * q * (0.22 + (dy - LAND) / 900));
    if (skip(x, y) || y < LAND + 3) continue; const d = y - LAND, s = d < 24 ? 1 : d < 80 ? 1.8 + rnd(i) : d < 170 ? 2.6 + rnd(i * 3) * 1.2 : 3.4 + rnd(i * 5) * 1.6;
    (rnd(i * 13 + dx) < 0.75 ? KINDS[kk] : KINDS[Math.floor(rnd(i * 17 + dy) * KINDS.length)]).draw(g, x, y, s, i + dx, d);
  }
  K.scatterFlowers(g, RX0 + 2, RX1 - 2, LAND, 300, 300, 2977, KINDS, skip);
  for (let i = 0; i < 120; i++) { const y = R(LAND + 30 + Math.pow(rnd(i * 7 + 3501), 0.9) * 190), x = R(RX0 + 4 + rnd(i * 7 + 3502) * (RX1 - RX0 - 8)), d = y - LAND; if (skip(x, y)) continue; K.seedGrass(g, x, y, 6 + d * 0.09 + rnd(i) * 6, (rnd(i * 3) - 0.5) * 3); }
  fence(g);
  sign(g, SIGN[0], SIGN[1], "LV 7", "wood", 1, 0);
  for (const dx of [-9, -5, 4, 8]) K.blade(g, SIGN[0] + dx, SIGN[1] + 2, 6 + (dx & 3), dx > 0 ? 1 : -1, BLADE);
  // FRONT: dense backlit blades, clover leaves, seed plumes, small heads; big swaying heads are per frame (BIG)
  for (let i = 0; i < 600; i++) {
    const x = R(RX0 - 30 + rnd(i * 13 + 3201) * (RX1 - RX0 + 60)), y = R(LAND + 206 + Math.pow(rnd(i * 13 + 3205), 0.7) * 118), h = 10 + (y - LAND - 206) * 0.36 + rnd(i * 3 + 7) * 22;
    K.blade(f, x, y, h, (rnd(i * 9 + 3) - 0.5) * h * 0.5, rnd(i * 5) < 0.5 ? BLADE : BLADE_D, h > 30 ? 2 : 1);
  }
  for (let i = 0; i < 50; i++) { const x = R(RX0 - 20 + rnd(i * 17 + 3601) * (RX1 - RX0 + 40)), y = R(LAND + 230 + rnd(i * 17 + 3603) * 96), h = 24 + (y - LAND - 230) * 0.5 + rnd(i) * 22; K.seedGrass(f, x, y, h, (rnd(i * 5 + 1) - 0.5) * 10); }
  for (let i = 0; i < 60; i++) { const x = R(RX0 - 20 + rnd(i * 19 + 3301) * (RX1 - RX0 + 40)), y = R(LAND + 236 + rnd(i * 19 + 3303) * 88); K.trefoil(f, x, y, 3 + rnd(i) * 3, "#244A26", "#5E8A3A", "#A8C880"); }
  for (let i = 0; i < 34; i++) {
    const x = R(RX0 - 10 + rnd(i * 23 + 3401) * (RX1 - RX0 + 20)), y = R(LAND + 216 + rnd(i * 23 + 3403) * 56), h = 12 + rnd(i * 5 + 1) * 16, kind = i % 4;
    if (kind === 3) { K.lavender(f, x, y + h, h * 2.2, (rnd(i) - 0.5) * 6, i); continue; }
    K.blade(f, x, y + h, h, (rnd(i + 3) - 0.5) * 6, BLADE_D, 1);
    K.cloverHead(f, x, y, 3 + rnd(i * 7) * 1.6, kind === 2 ? K.CLOVER_W : K.CLOVER_P, i);
  }
}

/** Weathered split-rail fence: posts every FENCE.step px, two rails; the sun behind lights the top edges. */
function fence(g) {
  const { x0, x1, y, step } = FENCE, O = WOOD[0];
  for (const ry of [y - 30, y - 15]) { g.rect(x0 - 2, ry - 1, x1 - x0 + 4, 6, O); g.rect(x0 - 1, ry, x1 - x0 + 2, 4, WOOD[3]); g.rect(x0 - 1, ry + 3, x1 - x0 + 2, 1, WOOD[2]); for (let x = x0 - 1; x <= x1; x++) g.px(x, ry, (x & 3) ? "#FFE2A0" : WOOD[5]); for (let x = x0 + 5; x < x1; x += 13) g.px(x, ry + 2, WOOD[1]); }
  for (let x = x0; x <= x1; x += step) {
    g.rect(x - 4, y - 40, 8, 42, O); g.rect(x - 3, y - 39, 6, 40, WOOD[3]); g.rect(x - 3, y - 39, 2, 40, WOOD[2]); g.rect(x + 2, y - 39, 1, 40, "#F2C878");
    g.rect(x - 3, y - 40, 6, 1, "#FFE6A8"); g.px(x - 1, y - 30, WOOD[1]); g.px(x, y - 22, WOOD[1]);
    for (const dx of [-6, -3, 3, 6]) K.blade(g, x + dx, y + 2, 5 + (dx & 3), dx > 0 ? 1 : -1, BLADE);
  }
  // lavender and clover tucked along the fence line
  for (let i = 0; i < 40; i++) { const x = R(x0 + rnd(i * 3 + 4001) * (x1 - x0)), yy = y + 1 + R(rnd(i * 5 + 4002) * 3); if (i % 3 === 0) K.lavender(g, x, yy, 10 + rnd(i) * 8, (rnd(i * 7) - 0.5) * 3, i); else K.cloverHead(g, x, yy - 3, 1.6, i % 2 ? K.CLOVER_P : K.CLOVER_W, i); }
}

// ---------------------------------------------------------------- the bumblebee
const BOUNCE = EV.deep + 0.02;                                    // "a deep buzz": a happy little bounce
const GAZE = [[0, [0, 0]], [EV.bumblebee + 0.55, [-0.6, 0.6]], [EV.hundred150 - 0.05, [0.1, -0.85]], [EV.deep - 0.2, [0, 0]]];
function gaze(t) { let cur = GAZE[0][1]; for (let i = 1; i < GAZE.length; i++) { const [tk, v] = GAZE[i]; if (t <= tk) break; const e = sm(t, tk, tk + 0.28); cur = [lerp(cur[0], v[0], e), lerp(cur[1], v[1], e)]; } return cur; }
export const T = { BOUNCE: [BOUNCE, 0.5], HAPPY: [BOUNCE - 0.04, BOUNCE + 0.95], BUZZ: [BOUNCE, BOUNCE + 0.8], BEE: { x: BX, y: BY } };
function beeState(t) {
  const hk = clamp01((t - T.BOUNCE[0]) / T.BOUNCE[1]), hop = Math.sin(Math.PI * hk) ** 2 * 12, buzz = win(t, T.BUZZ[0], T.BUZZ[1], 0.1, 0.3);
  const x = BX + osc(t, END, 23, 0.3) * 2.6 + buzz * Math.sin(t * 2 * Math.PI * 14) * 1.2;
  const y = BY + osc(t, END, 47, 1.2) * 3 - hop;
  const tilt = 0.03 * osc(t, END, 19, 0.7) + 0.05 * Math.sin(Math.PI * hk) * Math.sin(Math.PI * 2 * hk);
  return { x, y, tilt, buzz };
}
/** short curved buzz lines beside the bumblebee on "a deep buzz" */
function buzzLines(c, x, y, t, a) {
  if (a <= 0) return; const g = fade(c, a);
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
    const ph = ((t * 3.2 + i / 3) % 1), r = 96 + i * 9 + ph * 10, q = fade(g, Math.sin(Math.PI * ph));
    for (let j = -6; j <= 6; j++) { const an = (j / 6) * 0.32, px = x + sd * Math.cos(an) * r, py = y + 44 + Math.sin(an) * r; q.px(R(px), R(py), "#FFF4D0"); q.px(R(px + sd), R(py), "#F8D890"); }
  }
}

// ---------------------------------------------------------------- module passes
const off = (V) => V.x1 < RX0 - 140 || V.x0 > RX1 + 140;
const gradeAt = (V) => K.relGrade(tod(V.cx), BASE_T);
const near = (V) => 1 - sm(Math.abs(V.cx - SX), 40, 200);
export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  const nk = near(V); if (nk > 0) K.sunRays(c, 270, 360, 100, 280, 14, 3517, "#FFF6D8", 0.55 * nk);
  BACK.blit(c, V, { grade: gradeAt(V) });
}
export function actors(c, V, t) {
  if (off(V)) return;
  const st = beeState(t), sx = R(V.X(st.x)), sy = R(V.Y(st.y)); if (sx < -200 || sx > 740) return;
  const gr = gradeAt(V), view = gr ? gradeView(c) : null, d = view ? view.g : c;
  const e = Math.cos(2 * Math.PI * (wingPhase("bumblebee", t) % 1)) * strokeAmt("bumblebee", t), happy = win(t, T.HAPPY[0], T.HAPPY[1], 0.12, 0.3);
  drawBumblebee(d, sx, sy, { s: S, tilt: st.tilt, e, look: gaze(t), blink: blinkAt(t, END / 14, 1.3), happy, open: 0.35 + 0.5 * happy, antSway: 3 * osc(t, END, 31, 0.9) });
  buzzLines(d, sx, sy, t, st.buzz);
  view?.apply(gr);
}
export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  const gr = gradeAt(V);
  FRONT.blit(c, V, { grade: gr });
  const view = gr ? gradeView(c) : null, d = view ? view.g : c;
  for (const [wx, wy, h, kind, r, n] of BIG) {
    const sw = osc(t, END, n, wx * 0.01) * 2.5 + osc(t, END, n * 2 + 3, wx) * 0.8, x = V.X(wx), y = V.Y(wy); if (x < -40 || x > 580) continue;
    if (kind === 2) { K.lavender(d, x, y, h, sw * 3, n, "#F8E6FF"); continue; }
    for (let j = 0; j <= h; j++) { const k = j / h, px = R(x + sw * k * k); d.px(px, R(y - j), "#2E3E1C"); d.px(px + 1, R(y - j), k > 0.5 ? "#566A2A" : "#3A4E22"); }
    K.bigClover(d, x + sw, y - h - r * 0.4, r, n, 1, kind === 1 ? K.CLOVER_W : K.CLOVER_P);
  }
  view?.apply(gr);
  K.motes(c, 18, END, t, [V.X(SX) - 220, 260, V.X(SX) + 220, 620], 77, near(V), ["#FFF8DC", "#FFE7A0"]);
}
// [world x, ground y, stem height, kind (0 red clover · 1 white clover · 2 lavender spike), head radius, sway cycles]
const BIG = [[RX0 + 20, LAND + 320, 40, 0, 14, 41], [RX0 + 58, LAND + 334, 96, 2, 0, 47], [RX0 + 96, LAND + 330, 26, 1, 10, 53], [RX0 + 176, LAND + 338, 20, 0, 11, 61],
  [RX0 + 246, LAND + 344, 70, 2, 0, 43], [RX0 + 330, LAND + 332, 24, 1, 10, 59], [RX0 + 404, LAND + 326, 36, 0, 13, 37], [RX0 + 470, LAND + 336, 110, 2, 0, 39], [RX0 + 514, LAND + 318, 44, 0, 15, 45]];
