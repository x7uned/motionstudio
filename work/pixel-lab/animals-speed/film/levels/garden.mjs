// HOOK + LV1 · snail — a sunny cottage garden in the morning (RANGE BIOME.garden = 0..540; rest camera (270, −180):
// screen = (wx, wy + 660)). A white cottage gable on the left, a picket fence with hollyhocks and sunflowers, a big
// leafy tree on the right whose undergrowth (monstera, ferns, banana leaves) turns into the rainforest at x 540, a
// mowed lawn with stepping stones, a watering can, and in the middle a wooden table with the snail-race board: a damp
// cloth with a chalk start ring and a chalk finish circle (real snail races: from the centre to a 33 cm circle).
// Hook (frame 0 already moving): the sprinter (garden-runner.mjs) runs in from the left; on "outrun" the orange tabby
// (garden-cat.mjs, the cat of «How your cat drinks») zooms past him under the table line with dust and speed lines; his
// jaw drops, he skids to a stop, stares at the camera ("who ever lived"), then dashes off to the right after the cat.
// "Let's line up …": a SLOWEST → FASTEST banner unrolls from the bunting; the snail's eye stalks peek over the back of
// the table, it climbs up and crawls to the start ring. "record … snail racing": it smiles at the camera (race
// sticker "1" on its shell) and sets off with a shiny slime trail; "33 CM / 2 MIN" tag with a stopwatch; it strains
// (sweat, squint) and crosses the chalk finish line just before "minutes".
import { BIOME, LAND, EV, W } from "../timeline.mjs";
import { RAMP, C, sign, panel, fade, mix, bayer, sm, ease, lerp, rnd, blinkAt, clamp01, MAIN, blob, ell, tube, bez, shadow } from "../cute.mjs";
import { Layer, flower, stem, tuft, clover, leafBall, paintHills, grassAt, GRASS, thick, spriteCache } from "./garden-kit.mjs";
import { drawRunner, runPose, POSES, mixPose, drawHead } from "./garden-runner.mjs";
import { drawSnail } from "./garden-snail.mjs";
import { drawCat, runStride } from "./garden-cat.mjs";

export const RANGE = BIOME.garden;
const R = Math.round, [RX0, RX1] = RANGE;
const off = (V) => RANGE[1] + 140 < V.x0 || RANGE[0] - 140 > V.x1;

// ---------------------------------------------------------------- layout (world)
const TB = { y0: -170, y1: -110, face: 9, xb0: 150, xb1: 392, xf0: 128, xf1: 414 };   // table top: back edge y0, front edge y1
const TBX = (y, side) => { const k = (y - TB.y0) / (TB.y1 - TB.y0); return side < 0 ? lerp(TB.xb0, TB.xf0, k) : lerp(TB.xb1, TB.xf1, k); };
const RING = { cx: 262, cy: -140, rx: 112, ry: 21 };                                    // chalk finish circle (centre = start)
const SIGN = [440, -12];
const RUN_Y = 14, CAT_Y = -2;                                                          // ground lines of the hook runners
export const SNAIL_S = 1.05;

// ---------------------------------------------------------------- timing (all from word times)
export const GT = {
  dashOff: EV.lived + 0.42,                         // the runner dashes off after the cat
  catIn: EV.cat1 + 0.1, catV: 780,                  // cat enters from the left, constant zoom speed
  bannerIn: EV.lets, bannerUp: EV.lets + 0.62,
  peek0: W("animals") + 0.05, peek1: EV.slowest + 0.42, toStart: EV.fastest2 + 0.7,
  hello: EV.snail, race0: EV.racing + 0.04, finish: EV.minutes - 0.16,
  strain0: EV.thirtyThree + 0.1, tag0: EV.thirtyThree, tag2: EV.two, tagOut: EV.minutes + 0.45,
};
const VR = 225, X0R = 34;                                                              // runner sprint speed, x at t = 0

/** Runner speed (px/s) at time t: sprint → skid to a stop on "outrun"/"human" → stands shocked → dash off. */
function runnerV(t) {
  const a = EV.outrun + 0.25, b = EV.fastest1 + 0.35;
  if (t < GT.dashOff) return VR * (1 - sm(t, a, b));
  return 920 * sm(t, GT.dashOff, GT.dashOff + 0.55);
}
const DT = 1 / 240;
/** Runner state by integration (pure function of t): x, gait phase, speed. */
export function runnerAt(t) {
  let x = X0R, p = 0.15, v = runnerV(0);
  const n = Math.max(0, Math.floor(t / DT));
  for (let i = 0; i < n; i++) { const tt = i * DT; v = runnerV(tt); x += v * DT; p += (v < VR ? 2.55 * v / VR : 2.55 + 1.0 * (v - VR) / VR) * DT; }
  const r = t - n * DT; v = runnerV(t); x += v * r; p += (v < VR ? 2.55 * v / VR : 2.55 + (v - VR) / VR) * r;
  return { x, p, v };
}
export const catX = (t) => -110 + GT.catV * (t - GT.catIn);
export const CAT_Z = 1.8;
/** Snail state: origin (foot under the head), crawl phase, strain, clip line. */
export function snailAt(t) {
  const sx = 248, sy = RING.cy + 1, fx = 308, fy = RING.cy + 14;
  if (t < GT.peek0) return null;
  let x = sx, y, clip = null, crawl = 0;
  if (t < GT.peek1) { const k = ease((t - GT.peek0) / (GT.peek1 - GT.peek0)); y = lerp(TB.y0 + 152, TB.y0, k); clip = TB.y0; crawl = (t - GT.peek0) * 1.6; }
  else if (t < GT.toStart) { const k = (t - GT.peek1) / (GT.toStart - GT.peek1); y = lerp(TB.y0, sy, ease(k)); clip = TB.y0 + 22 * sm(k, 0, 0.35) + (k > 0.35 ? 60 : 0); crawl = (GT.peek1 - GT.peek0) * 1.6 + (t - GT.peek1) * 1.2; }
  else if (t < GT.race0) { y = sy; crawl = (GT.peek1 - GT.peek0) * 1.6 + (GT.toStart - GT.peek1) * 1.2; }
  else {
    // surging crawl: progress advances on each surge (peristaltic waves), eased into the finish
    const span = GT.finish + 0.25 - GT.race0, u = clamp01((t - GT.race0) / span), waves = 4.5, q = u * waves;
    const surge = (Math.floor(q) + ease(q - Math.floor(q))) / waves, k = Math.min(1, surge * 1.0);
    x = lerp(sx, fx, k); y = lerp(sy, fy, k);
    crawl = (GT.peek1 - GT.peek0) * 1.6 + (GT.toStart - GT.peek1) * 1.2 + Math.min(t - GT.race0, span) * (waves / span);
  }
  const strain = sm(t, GT.strain0, GT.strain0 + 0.4) * (1 - sm(t, GT.finish, GT.finish + 0.35));
  return { x, y, clip, crawl, strain };
}

// ---------------------------------------------------------------- palette
const WOOD = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488", "#F0D2A8"];
const PLASTER = ["#5A5048", "#8A7E70", "#B4A894", "#D2C8B2", "#E8E0CC", "#F4EEE0", "#FBF8EE", "#FFFFFF"];
const ROOF = ["#3A160E", "#5E2416", "#86341E", "#A84428", "#C85A34", "#DE7A4A", "#EE9C6A", "#F8C4A0"];
const LEAF = ["#12301A", "#1A4222", "#24582C", "#307034", "#40883E", "#58A04A", "#76B85A", "#9CD072"];
const JUNG = ["#0C2618", "#123620", "#1A4A28", "#226032", "#2E783C", "#3E9048", "#58A858", "#7EC070"];
const FLW = [["#F48AB0", "#FFE070"], ["#FFD84A", "#E08A20"], ["#FFFFFF", "#F8C840"], ["#B07CE8", "#FFE890"], ["#FF9E7A", "#FFF0A0"]];
const CLOTH = { base: "#BCC8D4", damp: "#A8B6C4", lit: "#DCE6EE", hem: "#8C9AAA", wet: "#E8F2F8" };
const CHALK = "#F6F8FA";

// ---------------------------------------------------------------- static layers
let BACK = null, FRONT = null, LEGS = null;
const hillFar = (x) => (50 + 18 * Math.sin(x * 0.012 + 0.4) + 9 * Math.sin(x * 0.033 + 2)) * (1 - sm(x, 470, 560));
const hillNear = (x) => (24 + 10 * Math.sin(x * 0.02 + 3.1) + 6 * Math.sin(x * 0.05)) * (1 - sm(x, 470, 560));
function build() {
  BACK = new Layer(RX0 - 40, -500, RX1 + 40, 320); FRONT = new Layer(RX0 - 40, 100, RX1 + 40, 320); LEGS = new Layer(100, -120, 440, 20);
  const g = BACK.g, f = FRONT.g;
  paintHills(g, RX0 - 40, RX1 + 40, LAND - 30, hillFar, hillNear);
  // hedge behind the fence
  for (let i = 0; i < 26; i++) { const x = RX0 + 60 + i * 17 + rnd(i * 3) * 8, r = 13 + rnd(i * 7) * 8; leafBall(g, x, LAND - 44 + rnd(i) * 6, r, LEAF, i * 5, { amp: 0.14, bumps: 7 }); }
  // lawn (perspective bands + mowing stripes), stepping stones, daisies, clover
  for (let y = LAND; y < 320; y++) for (let x = RX0 - 40; x < RX1 + 40; x++) {
    let col = grassAt(x, y, y - LAND); const d = y - LAND, stripe = Math.floor((x * 0.9 + d * 1.25) / 58) & 1;
    if (stripe) col = mix(col, "#E6F8A0", 0.08 + 0.04 * Math.min(1, d / 120)); g.px(x, y, col);
  }
  g.rect(RX0 - 40, LAND, RX1 - RX0 + 80, 1, "#C6E88A");
  for (let i = 0; i < 3600; i++) {
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 1), 1.3) * 318), x = R(RX0 - 40 + rnd(i * 3 + 2) * (RX1 - RX0 + 76)), d = y - LAND, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4;
    const dark = rnd(i * 5) < 0.6, col = dark ? mix(g.get(x, y), "#1E5A2A", 0.3) : mix(g.get(x, y), "#E8FFB0", 0.28);
    for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col);
  }
  for (const [x, y, r] of [[96, 252, 30], [168, 196, 25], [232, 150, 21], [292, 112, 18], [344, 80, 15]]) stone(g, x, y, r);
  for (let p = 0; p < 6; p++) { const cx = RX0 + 40 + rnd(p * 23 + 1) * 460, cy = LAND + 40 + rnd(p * 29) * 240; for (let i = 0; i < 22; i++) { const x = R(cx + (rnd(p * 100 + i) - 0.5) * 70), y = R(cy + (rnd(p * 100 + i + 50) - 0.5) * 24); clover(g, x, y, "#3E8A3E", "#7CC85E"); } }
  for (let i = 0; i < 160; i++) { const x = R(RX0 + rnd(i * 7 + 4) * 540), y = R(LAND + 6 + Math.pow(rnd(i * 7 + 3), 1.2) * 300), d = y - LAND, s = d < 40 ? 1 : d < 140 ? 2 : 3; if (Math.abs(x - 270) < 130 && d < 34) continue; flower(g, x, y, s, rnd(i) < 0.75 ? "#FFFFFF" : FLW[i % 5][0], "#F8D040"); }
  // cottage gable on the left (white plaster, terracotta roof, window with a flower box, climbing rose)
  cottage(g);
  // picket fence along the back with hollyhocks and sunflowers in front of it
  fence(g, 92, 470);
  for (const [x, h, col] of [[108, 120, "#F48AB0"], [124, 150, "#E05A8A"], [138, 110, "#F8B0C8"]]) hollyhock(g, x, LAND + 2, h, col, x);
  for (const [x, h, r] of [[404, 150, 15], [424, 118, 13], [446, 160, 16]]) sunflower(g, x, LAND + 2, h, r, x);
  // flower bed soil strip
  for (let x = 96; x < 470; x++) for (let y = LAND - 3; y < LAND + 4; y++) if (rnd(x * 13 + y) < 0.7) g.px(x, y, mix("#5A3A22", "#7A5232", rnd(x + y * 7)));
  // big leafy tree on the right (bunting tied to it), undergrowth becoming rainforest at x 540
  bigTree(g, 498, LAND);
  undergrowth(g);
  // the table (top + front face + back legs); the front legs go into LEGS (drawn over the cat, under the runner)
  table(g, LEGS.g);
  watering(g, 52, 38);
  // FRONT: foreground grass blades and flowers along the bottom, bigger leaves at the right edge
  for (let i = 0; i < 70; i++) { const x = R(RX0 - 30 + rnd(i * 13 + 2) * (RX1 - RX0 + 60)), y = R(LAND + 262 + rnd(i * 13 + 5) * 80); tuft(f, x, y, 14 + rnd(i) * 18, 4 + Math.floor(rnd(i * 3) * 4), ["#2E6A30", "#3E8238", "#58A044"], i * 5, (rnd(i * 9) - 0.5) * 6); }
  for (let i = 0; i < 16; i++) { const x = R(RX0 + rnd(i * 19 + 1) * (RX1 - RX0)), y = R(LAND + 258 + rnd(i * 19 + 3) * 80), h = 18 + rnd(i * 5) * 22, [pc, ec] = FLW[(i * 3) % FLW.length]; stem(f, x, y - h, y, "#2E6A30", (rnd(i) - 0.5) * 8, true); flower(f, x, y - h, 5 + (rnd(i * 7) < 0.4 ? 1 : 0), pc, ec); }
  for (const [x, y, len, ang] of [[548, 300, 120, -2.2], [520, 310, 96, -1.9], [560, 250, 90, -2.5]]) bigLeaf(f, x, y, len, ang, x);
}
function stone(g, x, y, r) {
  const ry = r * 0.36; for (let Y = R(y - ry - 1); Y <= R(y + ry + 2); Y++) for (let X = R(x - r - 1); X <= R(x + r + 1); X++) {
    const d = ((X - x) / r) ** 2 + ((Y - y) / ry) ** 2, d2 = ((X - x) / r) ** 2 + ((Y - y - 2) / ry) ** 2; if (d > 1 && d2 <= 1) { g.px(X, Y, "#4A5A44"); continue; } if (d > 1) continue;
    const v = (X - x) / r * 0.4 + (Y - y) / ry * 0.6; g.px(X, Y, d > 0.82 ? "#7E8478" : v < -0.25 ? "#D2D4C8" : v < 0.25 ? (bayer(X, Y) > 0.5 ? "#B8BCB0" : "#C4C8BC") : "#A4A89C");
  }
}
function cottage(g) {
  const x1 = 92, top = -330, eave = -300;
  // wall
  for (let y = eave; y < LAND; y++) for (let x = RX0 - 40; x < x1; x++) { const u = (x1 - x) / 40; let s = 5 + (x > x1 - 6 ? -1 : 0) + (y > LAND - 10 ? -1 : 0); if (rnd(x * 7 + y * 13) < 0.06) s -= 1; g.px(x, y, PLASTER[Math.max(2, s)]); }
  for (let y = eave; y < LAND; y++) g.px(x1, y, PLASTER[1]);
  // stone plinth
  for (let y = LAND - 22; y < LAND; y++) for (let x = RX0 - 40; x <= x1; x++) { const row = Math.floor((y - LAND + 22) / 7), bx = Math.floor((x + row * 9) / 18); const edge = (y - LAND + 22) % 7 === 0 || (x + row * 9) % 18 === 0; g.px(x, y, edge ? "#6A6458" : ["#A49C8C", "#B4AC9A", "#968E80"][(bx + row) % 3]); }
  // window with shutters and a flower box
  const wx = 20, wy = -230, ww = 48, wh = 62;
  g.rect(wx - 3, wy - 3, ww + 6, wh + 6, "#5A4030"); g.rect(wx, wy, ww, wh, "#3A5A7A");
  for (let y = wy; y < wy + wh; y++) for (let x = wx; x < wx + ww; x++) { const k = (x - wx + (y - wy) * 0.6) / (ww + wh * 0.6); g.px(x, y, k < 0.28 ? "#9CC8E8" : k < 0.4 ? (bayer(x, y) > 0.5 ? "#9CC8E8" : "#6A9AC4") : y < wy + wh * 0.5 ? "#6A9AC4" : "#4E7AA4"); }
  g.rect(wx + ww / 2 - 1, wy, 3, wh, "#F4EEE0"); g.rect(wx, wy + wh / 2 - 1, ww, 3, "#F4EEE0"); g.frame(wx, wy, ww, wh, "#F4EEE0");
  for (const sx of [wx - 18, wx + ww + 3]) { g.rect(sx, wy - 2, 15, wh + 4, "#3E6E5A"); for (let y = wy; y < wy + wh; y += 6) g.rect(sx + 2, y, 11, 2, "#5A9078"); g.frame(sx, wy - 2, 15, wh + 4, "#244436"); }
  g.rect(wx - 6, wy + wh + 2, ww + 12, 12, "#7A4A2A"); g.rect(wx - 6, wy + wh + 2, ww + 12, 2, "#A06A40");
  for (let i = 0; i < 9; i++) { const fx = wx - 2 + i * 6.5, fy = wy + wh - 2 - rnd(i) * 6; leafBall(g, fx, fy + 4, 5, LEAF, i, { amp: 0.2 }); flower(g, fx + 1, fy, 2, ["#F4605A", "#FFD84A", "#F48AB0"][i % 3], "#FFF0A0"); }
  // climbing rose up the wall edge
  for (let i = 0; i < 26; i++) { const y = LAND - 20 - i * 9, x = x1 - 8 + Math.sin(i * 0.9) * 5; leafBall(g, x, y, 5 + rnd(i) * 3, LEAF, i * 3, { amp: 0.25 }); if (rnd(i * 5) < 0.55) flower(g, x + (rnd(i) - 0.5) * 6, y - 2, 2, "#E8405A", "#FFD0A0"); }
  // roof: gable slope from the eave up to the top-left, tiles in rows
  for (let y = top - 100; y <= eave + 8; y++) for (let x = RX0 - 40; x <= x1 + 12; x++) {
    const edgeY = eave + 8 - (x1 + 12 - x) * 0.85; if (y < edgeY || y > edgeY + 30 && x < x1 - 40) continue; if (y < edgeY) continue;
    const dy = y - edgeY; if (dy > 26) continue;
    const row = Math.floor(dy / 6), tile = Math.floor((x + row * 6) / 12), edge = dy % 6 === 0 || (x + row * 6) % 12 === 0;
    g.px(x, y, dy < 2 ? ROOF[6] : edge ? ROOF[1] : ROOF[3 + ((tile + row) % 3 === 0 ? 1 : 0) - (dy > 20 ? 1 : 0)]);
  }
  // gable wall under the roof slope
  for (let x = RX0 - 40; x < x1; x++) { const edgeY = eave + 8 - (x1 + 12 - x) * 0.85 + 26; for (let y = R(edgeY); y < eave; y++) g.px(x, y, PLASTER[4]); }
  g.rect(x1 - 6, eave + 8 - 18 * 0.85 + 22, 10, 6, "#5A4030");   // hook for the bunting
}
function fence(g, x0, x1) {
  for (let x = x0; x < x1; x++) for (const yy of [LAND - 40, LAND - 18]) { g.px(x, yy, "#7A6450"); g.px(x, yy + 1, "#D8CCB8"); g.px(x, yy + 2, "#C2B49E"); g.px(x, yy + 3, "#8A7660"); }
  for (let x = x0; x < x1; x += 13) {
    const h = 54 + (Math.floor(x / 13) % 2) * 3;
    for (let y = LAND - h; y < LAND; y++) for (let k = 0; k < 9; k++) { const tip = LAND - h + Math.abs(k - 4); if (y < tip) continue; g.px(x + k, y, k === 0 || k === 8 || y === tip ? "#6A5844" : k < 3 ? "#FBF6EA" : k < 6 ? "#ECE4D4" : "#D4C8B4"); }
  }
}
function hollyhock(g, x, y, h, col, seed) {
  for (let j = 0; j < h; j++) g.px(x + R(Math.sin(j * 0.05 + seed) * 1.5), y - j, "#3A7A36");
  for (let k = 0; k < 9; k++) { const yy = y - 26 - k * (h - 30) / 9, r = 5.5 - k * 0.4; leafBall(g, x + (k % 2 ? 3 : -3) + Math.sin(seed + k) * 1.5, yy, r, [mix(col, "#000000", 0.5), mix(col, "#000000", 0.3), col, mix(col, "#FFFFFF", 0.3), mix(col, "#FFFFFF", 0.55)], seed + k, { amp: 0.18, bumps: 5 }); g.px(R(x + (k % 2 ? 3 : -3)), R(yy), "#FFE070"); }
  for (const k of [0, 1]) leafBall(g, x + (k ? 8 : -8), y - 10 - k * 6, 7, LEAF, seed + 30 + k, { amp: 0.2, bumps: 5 });
}
function sunflower(g, x, y, h, r, seed) {
  for (let j = 0; j < h; j++) { g.px(x, y - j, "#3A7A2E"); g.px(x + 1, y - j, "#4E9238"); }
  for (const [k, dir] of [[0.4, -1], [0.62, 1]]) leafBall(g, x + dir * 9, y - h * k, 8, LEAF, seed + k * 10, { amp: 0.15, bumps: 4, sy: 0.6 });
  const cx = x + 1, cy = y - h;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, px = cx + Math.cos(a) * r * 1.05, py = cy + Math.sin(a) * r * 0.95; leafBall(g, px, py, r * 0.42, ["#8A5A08", "#C88A10", "#F0B820", "#F8D040", "#FCE680"], seed + i, { amp: 0.05, bumps: 3 }); }
  for (let Y = R(cy - r * 0.62); Y <= R(cy + r * 0.62); Y++) for (let X = R(cx - r * 0.62); X <= R(cx + r * 0.62); X++) { const d = ((X - cx) ** 2 + (Y - cy) ** 2) / (r * r * 0.38); if (d <= 1) g.px(X, Y, d > 0.8 ? "#3A2208" : ((X + Y) & 1) ? "#5A3410" : "#7A4A18"); }
}
function bigTree(g, x, y) {
  // trunk with a slight lean, roots
  for (let j = 0; j < 300; j++) { const yy = y - j, w = 13 - j * 0.02 + (j < 18 ? (18 - j) * 0.5 : 0), cx = x + Math.sin(j * 0.012) * 6; for (let X = R(cx - w); X <= R(cx + w); X++) { const u = (X - cx) / w; g.px(X, yy, Math.abs(u) > 0.9 ? "#2A1A10" : u < -0.4 ? "#7A5A3E" : u < 0.3 ? "#5E4430" : "#46321F"); } if (j % 23 === 7) g.line(R(cx - 4), yy, R(cx + 2), yy - 3, "#3A281A"); }
  // branch toward the left (the bunting is tied to it)
  thick(g, [[x - 4, y - 236], [x - 30, y - 262], [x - 52, y - 272]], 4, "#5E4430");
  thick(g, [[x + 6, y - 250], [x + 30, y - 282]], 4, "#5E4430");
  // canopy
  const balls = [[x - 54, y - 300, 34], [x - 18, y - 324, 42], [x + 26, y - 316, 40], [x + 54, y - 284, 34], [x - 70, y - 270, 26], [x + 2, y - 282, 36], [x + 40, y - 254, 26], [x - 36, y - 248, 24]];
  balls.forEach(([bx, by, r], i) => leafBall(g, bx, by, r, LEAF, i * 9 + 2, { amp: 0.1, bumps: 9 }));
  for (let i = 0; i < 14; i++) { const bx = x - 70 + rnd(i * 3) * 130, by = y - 320 + rnd(i * 5) * 80; flower(g, bx, by, 2, "#FFFFFF", "#F8C840"); }
}
function bigLeaf(g, x, y, len, ang, seed) {
  // a broad tropical leaf (banana/monstera-like) from (x, y) along angle ang
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  for (let i = 0; i <= len; i++) {
    const u = i / len, w = Math.sin(Math.PI * Math.min(1, u * 1.1)) * len * 0.26 * (u < 0.15 ? u / 0.15 : 1), cx = x + dx * i + nx * Math.sin(u * 2.2) * 6, cy = y + dy * i + ny * Math.sin(u * 2.2) * 6;
    for (let k = -w; k <= w; k += 0.6) { const X = R(cx + nx * k), Y = R(cy + ny * k), side = k / (w || 1); const slit = u > 0.25 && Math.abs(side) > 0.55 && ((i + R(seed)) % 9) < 1; if (slit) continue; g.px(X, Y, Math.abs(side) > 0.92 ? JUNG[1] : side < -0.2 ? JUNG[5] : side < 0.3 ? JUNG[4] : JUNG[3]); }
    g.px(R(cx), R(cy), JUNG[6]);
  }
}
function undergrowth(g) {
  // ferns and broad leaves rising toward the rainforest edge (x 480 → 580)
  for (const [x, len, ang] of [[470, 70, -1.2], [486, 92, -1.6], [512, 120, -1.35], [530, 106, -1.95], [556, 128, -1.5], [574, 96, -1.15], [500, 64, -2.4]]) bigLeaf(g, x, LAND + 4, len, ang, x * 3);
  for (let i = 0; i < 10; i++) { const x = 470 + i * 11, h = 30 + rnd(i * 7) * 40; fern(g, x, LAND + 2, h, -0.4 + rnd(i) * 0.8, i); }
}
function fern(g, x, y, h, lean, seed) {
  const pts = bez([x, y], [x + lean * h * 0.3, y - h * 0.7], [x + lean * h, y - h], 12);
  for (let i = 1; i < pts.length; i++) { g.line(R(pts[i - 1][0]), R(pts[i - 1][1]), R(pts[i][0]), R(pts[i][1]), JUNG[2]); const L = (1 - i / pts.length) * 9 + 2; for (const sd of [-1, 1]) g.line(R(pts[i][0]), R(pts[i][1]), R(pts[i][0] + sd * L), R(pts[i][1] - L * 0.4), i % 2 ? JUNG[5] : JUNG[4]); }
}
function table(g, legs) {
  const { y0, y1, face } = TB;
  // back legs (seen under the top between the front legs)
  for (const x of [160, 374]) for (let y = y1 + face; y < LAND + 6; y++) for (let k = 0; k < 8; k++) g.px(x + k, y, k === 0 || k === 7 ? WOOD[1] : k < 3 ? WOOD[3] : WOOD[2]);
  // apron (stretcher) under the top
  for (let x = TB.xf0 + 8; x < TB.xf1 - 8; x++) for (let y = y1 + face; y < y1 + face + 8; y++) g.px(x, y, y === y1 + face + 7 ? WOOD[0] : WOOD[2]);
  // top surface (boards running left→right, seen from above) + front face
  for (let y = y0; y < y1; y++) { const xa = R(TBX(y, -1)), xb = R(TBX(y, 1)); for (let x = xa; x <= xb; x++) { const board = Math.floor((y - y0) / 12), seam = (y - y0) % 12 === 11, grain = Math.sin(x * 0.21 + board * 3 + Math.sin(x * 0.05) * 2) > 0.85; g.px(x, y, x === xa || x === xb ? WOOD[1] : seam ? WOOD[3] : grain ? WOOD[4] : WOOD[5 - (board % 2)]); } }
  for (let y = y1; y < y1 + face; y++) for (let x = TB.xf0; x <= TB.xf1; x++) g.px(x, y, y === y1 ? WOOD[6] : y === y1 + face - 1 ? WOOD[0] : x === TB.xf0 || x === TB.xf1 ? WOOD[1] : WOOD[3]);
  // damp cloth over the middle of the top, hanging a little over the front edge
  const cl = (y) => [R(TBX(y, -1) + 14 + (y - y0) * 0.1), R(TBX(y, 1) - 12 - (y - y0) * 0.05)];
  for (let y = y0 + 4; y < y1 + 7; y++) {
    const yy = Math.min(y, y1 - 1), [xa, xb] = cl(yy);
    for (let x = xa; x <= xb; x++) {
      if (y >= y1) { const hang = y - y1; if (hang > 5 + Math.sin(x * 0.3) * 1.5) continue; g.px(x, y, hang > 3 ? CLOTH.hem : mix(CLOTH.damp, CLOTH.hem, hang / 6)); continue; }
      const n = Math.sin(x * 0.07 + y * 0.31) + Math.sin(x * 0.023 - y * 0.17) * 1.3, damp = n > 0.9 ? CLOTH.damp : n < -1.5 ? CLOTH.lit : CLOTH.base;
      g.px(x, y, x === xa || x === xb || y === y0 + 4 ? CLOTH.hem : (damp === CLOTH.base && bayer(x, y) < 0.08 ? CLOTH.lit : damp));
    }
  }
  // chalk: outer finish circle (dashed, hand-drawn), inner start ring, a dashed radius along the race line
  const { cx, cy, rx, ry } = RING;
  for (let i = 0; i < 360; i++) { const a = (i / 360) * Math.PI * 2, wob = Math.sin(a * 5) * 0.8; if ((i % 12) > 8) continue; const X = R(cx + Math.cos(a) * (rx + wob)), Y = R(cy + Math.sin(a) * (ry + wob * 0.3)); g.px(X, Y, CHALK); if (Math.sin(a) > 0) g.px(X, Y + 1, mix(CHALK, CLOTH.base, 0.5)); }
  for (let i = 0; i < 90; i++) { const a = (i / 90) * Math.PI * 2; g.px(R(cx - 4 + Math.cos(a) * 15), R(cy + Math.sin(a) * 3.5), CHALK); }
  // front legs (separate layer: the cat runs behind them, the runner in front)
  for (const x of [TB.xf0 + 6, TB.xf1 - 16]) for (let y = y1 + face; y < 8; y++) for (let k = 0; k < 10; k++) legs.px(x + k, y, k === 0 || k === 9 ? WOOD[0] : k < 3 ? WOOD[5] : k < 7 ? WOOD[4] : WOOD[3]);
}
function watering(g, x, y) {
  // green metal watering can on the lawn (body, handle, spout, rose)
  const O = "#1E3A2E";
  for (let Y = y - 34; Y <= y; Y++) for (let X = x - 22; X <= x + 22; X++) { const u = (X - x) / 22, top = y - 34 + Math.abs(u) * 3; if (Y < top) continue; g.px(X, Y, Math.abs(u) > 0.94 || Y === R(top) || Y === y ? O : u < -0.45 ? "#8ED0A8" : u < 0.2 ? "#5AA87E" : "#3E8A62"); }
  for (let X = x - 22; X <= x + 22; X++) { g.px(X, y - 26, "#2E6A4C"); g.px(X, y - 8, "#2E6A4C"); }
  thick(g, bez([x - 16, y - 34], [x, y - 58], [x + 14, y - 34], 10), 2, O); for (const p of bez([x - 16, y - 34], [x, y - 56], [x + 14, y - 34], 10)) g.px(R(p[0]), R(p[1]) - 1, "#7ABE96");
  thick(g, [[x + 20, y - 14], [x + 46, y - 40]], 2, O); g.line(x + 20, y - 15, x + 45, y - 41, "#6AB48A");
  for (let Y = y - 47; Y <= y - 37; Y++) for (let X = x + 44; X <= x + 52; X++) if (Math.abs(X - x - 48) + Math.abs(Y - y + 42) * 0.8 < 6) g.px(X, Y, Math.abs(X - x - 48) + Math.abs(Y - y + 42) * 0.8 > 4.6 ? O : "#9AD4B0");
  shadow(g, x + 6, y + 1, 30, 4, "#000000", 0.35);
}

// ---------------------------------------------------------------- per-frame helpers
/** Bunting string (screen) with swaying pennants; returns the string's y at screen x. */
const BUNT = { x0: 86, y0: -446, x1: 446, y1: -452, sag: 16 };
const buntY = (wx) => { const u = (wx - BUNT.x0) / (BUNT.x1 - BUNT.x0); return lerp(BUNT.y0, BUNT.y1, u) + BUNT.sag * 4 * u * (1 - u); };
function bunting(c, V, t) {
  const g = c, cols = ["#E8404A", "#F8C83A", "#3A8AE0", "#5AB84A", "#F48AB0"];
  for (let wx = BUNT.x0; wx <= BUNT.x1; wx++) { const X = R(V.X(wx)), Y = R(V.Y(buntY(wx))); g.px(X, Y, "#5A4636"); }
  for (let i = 0, wx = BUNT.x0 + 10; wx < BUNT.x1 - 8; wx += 22, i++) {
    const sw = Math.sin(t * 2.1 + i * 0.9) * 2, X = V.X(wx), Y = V.Y(buntY(wx)), col = cols[i % 5];
    g.poly([[X - 6, Y + 1], [X + 6, Y + 1], [X + sw, Y + 14]], col); g.line(R(X - 6), R(Y + 1), R(X + sw), R(Y + 14), mix(col, "#000000", 0.35)); g.px(R(X - 3), R(Y + 3), mix(col, "#FFFFFF", 0.5));
  }
}
/** The SLOWEST → FASTEST banner unrolling from the bunting. */
function banner(c, V, t) {
  const k = sm(t, GT.bannerIn, GT.bannerUp); if (k <= 0) return;
  const bx0 = 104, bx1 = 436, H = 50, top = V.Y(buntY(274)) + 4, X0 = R(V.X(bx0)), X1 = R(V.X(bx1)), w = X1 - X0;
  const bounce = Math.sin(clamp01((t - GT.bannerUp) / 0.5) * Math.PI) * 3 * (1 - clamp01((t - GT.bannerUp) / 0.5));
  const h = R(H * ease(k) + bounce), y0 = R(top);
  const g = c;
  // cords from the string to the banner corners
  for (const wx of [bx0 + 6, bx1 - 6]) { const sy = R(V.Y(buntY(wx))); g.line(R(V.X(wx)), sy, R(V.X(wx)), y0, "#5A4636"); }
  // cloth (cream, red hem), text clipped to the unrolled part
  const cloth = Object.create(c); cloth.px = (x, y, col) => { if (y >= y0 && y < y0 + h) c.px(x, y, col); };
  cloth.rect(X0, y0, w, H, "#2E1A12"); cloth.rect(X0 + 1, y0 + 1, w - 2, H - 2, "#FBF2DC"); cloth.rect(X0 + 1, y0 + 1, w - 2, 3, "#E8404A"); cloth.rect(X0 + 1, y0 + H - 4, w - 2, 3, "#E8404A");
  for (let x = X0 + 2; x < X1 - 2; x++) if (bayer(x, y0 + 5) < 0.3) cloth.px(x, y0 + 5, "#F2E2C2");
  const s = 3, t1 = "SLOWEST", t2 = "FASTEST", w1 = c.measure(MAIN, t1, { scale: s }), w2 = c.measure(MAIN, t2, { scale: s }), aw = 26, gap = 9, tot = w1 + aw + w2 + gap * 2, tx = R(X0 + (w - tot) / 2), ty = y0 + 15;
  cloth.text(MAIN, t1, tx + 1, ty + 2, "#B8D8A0", { scale: s }); cloth.text(MAIN, t1, tx, ty, "#3A7A36", { scale: s });
  const ax = tx + w1 + gap; for (let i = 0; i < aw - 8; i++) { cloth.rect(ax + i, ty + 9, 1, 4, "#2E1A12"); } for (let j = 0; j < 10; j++) cloth.rect(ax + aw - 10 + j, ty + 1 + j, 1, 20 - 2 * j, "#2E1A12");
  cloth.text(MAIN, t2, ax + aw + gap + 1, ty + 2, "#F8C0A0", { scale: s }); cloth.text(MAIN, t2, ax + aw + gap, ty, "#D8342E", { scale: s });
  // the roll at the bottom of the unrolled part
  if (k < 1 || bounce > 0.2) { const ry = y0 + h - 2; c.rect(X0 - 2, ry - 2, w + 4, 6, "#2E1A12"); c.rect(X0 - 1, ry - 1, w + 2, 4, "#FBF2DC"); c.rect(X0 - 1, ry + 1, w + 2, 2, "#D8C8A8"); }
}
/** Dust puffs: soft dithered clouds that rise and fade (age 0..1). */
function puff(c, x, y, r, age, col = "#E8DCC0") {
  if (age <= 0 || age >= 1) return; const rr = r * (0.5 + age), a = (1 - age) * 0.85, cy = y - age * 8;
  for (let Y = R(cy - rr); Y <= R(cy + rr * 0.6); Y++) for (let X = R(x - rr); X <= R(x + rr); X++) { const d = ((X - x) / rr) ** 2 + ((Y - cy) / (rr * 0.7)) ** 2; if (d <= 1 && a * (1 - d * 0.6) > bayer(X, Y)) c.px(X, Y, d > 0.6 ? mix(col, "#A89878", 0.4) : col); }
}
/** Speed lines: horizontal streaks trailing to the left of (x, y), length L, density k. */
function speedLines(c, x, y, h, L, k, seed, t) {
  if (k <= 0.02) return;
  for (let i = 0; i < 7; i++) { const yy = R(y - h * rnd(seed + i * 3)), len = L * (0.5 + rnd(seed + i * 7) * 0.6) * k * (0.85 + 0.15 * Math.sin(t * 9 + i * 2.1)), x0 = x - 10 - rnd(seed + i * 11) * 20; for (let X = R(x0 - len); X <= R(x0); X++) { const u = (x0 - X) / len; if (u < 1 && (1 - u) * k > bayer(X, yy) + 0.15) c.px(X, yy, u < 0.3 ? "#FFFFFF" : "#E8F4FF"); } }
}

// ---------------------------------------------------------------- module interface
export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  BACK.blit(c, V);
  bunting(c, V, t);
  banner(c, V, t);
}

export function actors(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  // --- the snail on the race board (slime trail on the cloth first)
  const S = snailAt(t);
  if (S) {
    if (t > GT.race0) { const st = snailAt(GT.race0), tail0 = [st.x - 101 * SNAIL_S, st.y + 3], tail1 = [S.x - 101 * SNAIL_S, S.y + 3];
      const n = Math.ceil(Math.hypot(tail1[0] - tail0[0], tail1[1] - tail0[1]) * 1.5) + 1;
      for (let i = 0; i <= n; i++) { const u = i / n, X = V.X(lerp(tail0[0], tail1[0], u)), Y = V.Y(lerp(tail0[1], tail1[1], u)); for (let k = -4; k <= 3; k++) { const px = R(X), py = R(Y + k * 0.7 - 3); c.px(px, py, mix(c.get(px, py), "#E8F6FF", Math.abs(k) > 2 ? 0.3 : 0.55)); } if (i % 5 === 2) c.px(R(X), R(Y - 3), "#FFFFFF"); }
    }
    const look = t < GT.race0 ? [0.1, 0.3] : [0.35, 0.2], sw = Math.sin(t * 1.7) * 2 + (t > GT.peek0 && t < GT.peek1 + 0.6 ? Math.sin((t - GT.peek0) * 5) * 3 : 0);
    const hello = sm(t, GT.hello - 0.05, GT.hello + 0.15) * (1 - sm(t, GT.hello + 0.3, GT.hello + 0.6)), finishHappy = sm(t, GT.finish, GT.finish + 0.3);
    shadow(c, V.X(S.x - 30), V.Y(S.y) + 1, 70, 6, "#1A2A3A", 0.25 * sm(t, GT.peek1, GT.peek1 + 0.4));
    drawSnail(c, V.X(S.x), V.Y(S.y - hello * 4), { s: SNAIL_S, crawl: S.crawl, strain: S.strain, sway: sw, blink: blinkAt(t, 3.1, 0.7), look, clip: S.clip == null ? null : V.Y(S.clip), num: "1", sweat: sm(t, GT.strain0 + 0.5, GT.strain0 + 0.9) * (1 - sm(t, GT.finish + 0.1, GT.finish + 0.4)), t, open: 0.3 + 0.5 * Math.max(hello, finishHappy) });
    // finish sparkle where its front crosses the chalk circle
    const kf = (t - GT.finish) / 0.8; if (kf > 0 && kf < 1) { const fx = V.X(RING.cx + RING.rx * Math.cos(0.85)), fy = V.Y(RING.cy + RING.ry * Math.sin(0.85)); for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.3, rr = 6 + kf * 22, px = R(fx + Math.cos(a) * rr), py = R(fy - 8 + Math.sin(a) * rr * 0.7); if (Math.sin(Math.PI * kf) > bayer(px, py)) { c.px(px, py, i % 2 ? "#FFF6B0" : "#FFFFFF"); c.px(px + 1, py, "#F8D040"); } } }
  }
  // level sign (stands at the back of the lawn, behind the hook runners)
  sign(c, V.X(SIGN[0]), V.Y(SIGN[1]), "LV 1", "wood");
  // --- hook: the cat zooms past behind the table's front legs, the runner in front
  const cx = catX(t);
  if (t > GT.catIn - 0.05 && cx < RX1 + 200) {
    const sx = V.X(cx), sy = V.Y(CAT_Y);
    for (let i = 0; i < 6; i++) { const tt = t - i * 0.07, wx = catX(tt) - 40; const age = (t - tt) / 0.5 + 0.1; puff(c, V.X(wx), sy - 2, 7 + i, age); }
    speedLines(c, sx - 60, sy - 18, 50, 150, 1, 11, t);
    const G = { z: CAT_Z, X: (wx) => sx + (wx - cx) * CAT_Z, Y: (wy) => sy + (wy - CAT_Y) * CAT_Z };
    drawCat(c, G, cx, CAT_Y, { pose: "run", facing: 1, p: (cx + 110) / runStride(1), stretch: 1, lookX: -0.2, eyeBig: 1 });
  }
  LEGS.blit(c, V);
  const Rn = runnerAt(t);
  if (Rn.x < RX1 + 160) drawRunnerHook(c, V, t, Rn);
}

function drawRunnerHook(c, V, t, Rn) {
  const S = 0.82, sx = V.X(Rn.x), sy = V.Y(RUN_Y), vk = Rn.v / VR;
  const wStop = sm(t, EV.outrun + 0.3, EV.fastest1 + 0.05) * (1 - sm(t, EV.human1 - 0.2, EV.human1 + 0.25));
  const wPant = sm(t, EV.human1 - 0.25, EV.human1 + 0.3) * (1 - sm(t, GT.dashOff - 0.12, GT.dashOff + 0.12));
  let P = runPose(Rn.p, Math.max(0.45, Math.min(1, vk)));
  P = mixPose(P, POSES.stop, wStop); P = mixPose(P, POSES.pant, wPant);
  if (wPant > 0) P.hy += Math.sin(t * 9) * 1.6 * wPant;
  // face: confident → jaw drop when the cat passes → staring at the camera → determined → dash
  const shock = sm(t, EV.outrun + 0.12, EV.outrun + 0.3) * (1 - sm(t, GT.dashOff - 0.35, GT.dashOff - 0.1));
  const det = sm(t, GT.dashOff - 0.35, GT.dashOff - 0.1);
  const lookCat = sm(t, EV.outrun - 0.05, EV.outrun + 0.1) * (1 - sm(t, EV.fastest1 + 0.2, EV.human1));
  const face = { grin: (1 - shock) * (1 - det), o: shock, jaw: sm(t, EV.outrun + 0.12, EV.outrun + 0.45), brow: lerp(lerp(0.1, 1, shock), -1, det), wide: shock,
    flat: det, look: [lerp(0.15, 1, lookCat), lerp(0.15, 0.1, lookCat)], sweat: sm(t, EV.human1, EV.human1 + 0.3) * (1 - sm(t, GT.dashOff + 0.2, GT.dashOff + 0.5)), blink: blinkAt(t, 2.9, 1.3) };
  // dust at each footfall while moving
  if (Rn.v > 30) for (let i = 1; i <= 5; i++) { const tt = t - i * 0.06, st = runnerAt(Math.max(0, tt)); puff(c, V.X(st.x - 14), sy - 1, 5, (i * 0.06) / 0.4); }
  { const k = clamp01(0.45 * Math.min(1, Rn.v / VR) + 0.55 * clamp01((Rn.v - VR) / 400)); if (k > 0.05) speedLines(c, sx - 34, sy - 40, 150, 70 + 100 * clamp01((Rn.v - VR) / 400), k, 23, t); }
  shadow(c, sx, sy + 1, 40 * S, 5, "#1A3A1A", 0.35);
  drawRunner(c, sx, sy, { s: S, pose: P, face, wind: Math.min(1, Rn.v / VR), t });
}

export function front(c, V, t) { if (off(V)) return; if (!BACK) build(); FRONT.blit(c, V); }

export function hud(c, V, t) {
  if (off(V)) return;
  // 33 CM / 2 MIN tag with a running stopwatch (tied to the world, left of the snail)
  const a = sm(t, GT.tag0 - 0.05, GT.tag0 + 0.25) * (1 - sm(t, GT.tagOut, GT.tagOut + 0.3)); if (a <= 0) return;
  const x = R(V.X(18)), y = R(V.Y(-370)) + R((1 - sm(t, GT.tag0 - 0.05, GT.tag0 + 0.3)) * 6), w = 150, h = 62;
  panel(c, x, y, w, h, a, C.Y);
  const g = fade(c, a);
  // stopwatch: two laps of the hand = two minutes (time-lapse), stops at the finish
  const sxc = x + 28, syc = y + 34, rr = 16, run = clamp01((t - GT.race0) / (GT.finish - GT.race0)), ang = -Math.PI / 2 + run * 2 * 2 * Math.PI;
  g.rect(sxc - 3, syc - rr - 6, 7, 4, "#B8BCC8"); g.rect(sxc - 2, syc - rr - 7, 5, 2, "#E8404A"); g.rect(sxc + 9, syc - rr - 2, 4, 3, "#B8BCC8");
  g.disc(sxc, syc, rr, "#3A3E4A"); g.disc(sxc, syc, rr - 2, "#F4F4F0"); g.disc(sxc, syc, rr - 3, "#FFFFFF");
  for (let i = 0; i < 12; i++) { const q = (i / 12) * 2 * Math.PI; g.px(R(sxc + Math.cos(q) * (rr - 5)), R(syc + Math.sin(q) * (rr - 5)), i % 3 ? "#9A9EA8" : "#3A3E4A"); }
  g.line(sxc, syc, R(sxc + Math.cos(ang) * (rr - 5)), R(syc + Math.sin(ang) * (rr - 5)), "#D8342E"); g.px(sxc, syc, "#2A2E3A");
  const a2 = sm(t, GT.tag2 - 0.05, GT.tag2 + 0.25);
  g.text(MAIN, "33 CM", x + 54, y + 12, C.Y, { scale: 2 });
  fade(c, a * a2).text(MAIN, "2 MIN", x + 54, y + 36, C.IV, { scale: 2 });
}

// ---------------------------------------------------------------- ICON: the snail's head portrait (eye stalks + shell) in ~56×56
export function ICON(c, cx, cy, a = 1) {
  drawSnail(c, cx + 8, cy + 23, { s: 0.33, crawl: 0.25, look: [0.1, 0.3], a, num: "1" });
}
