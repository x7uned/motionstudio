// LV5 · dog + LV6 · human — a town park on a warm afternoon (RANGE BIOME.park = 2160..2970). From the left: the last
// village roofs behind a stone gate pillar, a big tree and a tiered fountain, the border collie sitting under the sun
// (x 2430), an iron lamp post under a tall tree, the hero holding the collie's long red leash (x 2700), a bench, a tree,
// and green hills rising toward the horse pasture. Below the grass: the soil in cross-section (same strata as the
// pasture), with tree roots, the fountain's pipe, a buried bone, an earthworm and a sleeping mole.
// Events: "twenty kilograms" → 20 KG; "dogs … mammals" → a hanging brass balance: ALL DOGS (a heap of tiny dogs) vs
// WILD LAND MAMMALS (deer, bear, wolf, rabbit, fox, boar) swings to level, "="; "people" → 62 KG at the hero and a second
// balance where ALL PEOPLE sink the wild mammals' pan, "×20". Pure functions of t.
import { BIOME, LAND, EV, LV } from "../timeline.mjs";
import { blob, ell, shadow, sign, pickup, RAMP, C, MAIN, sm, ease, lerp, win, rnd, fade, mix, bayer, blinkAt, clamp01, panel } from "../cute.mjs";
import { drawHero } from "../hero.mjs";
import { Layer, flower, stem, tuft, clover, leafBall } from "./park-kit.mjs";
import { drawDog, COLLAR, tiny, TINY_W } from "./park-dog.mjs";

export const RANGE = BIOME.park;
const R = Math.round, [X0, X1] = RANGE;
const DX = 2430, DY = -268;                     // collie head centre (screen 270, 392 at its rest camera)
const HX = 2700;                                // hero feet (ground LAND)
const FX = 2222, LAMP = 2602, BENCH = 2872;     // fountain, lamp post, bench
const SIGN5 = 2278, SIGN6 = 2806;

// ---------------------------------------------------------------- palette (afternoon light from the upper left)
const LEAVES = ["#1C4428", "#245632", "#2E6A38", "#3A7E40", "#4C944A", "#62A856", "#80BE68", "#A6D486"];
const FAR = ["#7EA88E", "#8EB898", "#A2C8A6", "#B8D8B6"];
const STONE = ["#3A3A44", "#5A5A66", "#7A7A86", "#9A98A2", "#B8B4B8", "#D2CCC8", "#E6E0D8", "#F6F2EA"];
const WOOD = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488", "#F0D2A8"];
const IRON = "#1E2A26", IRON_L = "#4A5E56";
const ROOF = ["#5A1C14", "#8A2E20", "#B4442E", "#D45E40", "#E87C58"];
const BRASS = ["#3A2408", "#6A4410", "#9A6A1A", "#C8962E", "#E8BA48", "#F8D870", "#FCEAA8", "#FFF8DC"];

// ---------------------------------------------------------------- static layers
let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(X0 - 40, -560, X1 + 40, 330); FRONT = new Layer(X0 - 40, -60, X1 + 40, 330);
  const g = BACK.g, f = FRONT.g;
  // far: hills rising toward the pasture (right), a distant soft tree line, village roofs (left)
  const hillF = (x) => (12 + 60 * sm(x, 2600, 2990) + 10 * Math.sin(x * 0.019 + 1)) * sm(x, 2520, 2700), hillN = (x) => (8 + 34 * sm(x, 2740, 2990) + 7 * Math.sin(x * 0.033)) * sm(x, 2700, 2840);
  for (let x = X0; x < X1; x++) {
    const a = hillF(x), b = hillN(x);
    for (let y = R(LAND - a); y < LAND; y++) { const k = (y - (LAND - a)) / Math.max(1, a); g.px(x, y, k < 0.08 ? "#C6E2C0" : k < 0.4 ? ((k - 0.08) / 0.32 > bayer(x, y) ? "#A8CCA4" : "#B6D8B0") : "#A8CCA4"); }
    for (let y = R(LAND - b); y < LAND; y++) { const k = (y - (LAND - b)) / Math.max(1, b); g.px(x, y, k < 0.1 ? "#9CCC7C" : k < 0.5 ? "#86BC6C" : "#76AE60"); }
  }
  for (let i = 0; i < 40; i++) {                                                // distant tree line (bumps)
    const x = X0 + 30 + i * 17 + rnd(i * 5) * 9, r = 9 + rnd(i * 7) * 9; if (x > 2820) continue;
    leafBall(g, x, LAND - r * 0.7, r, FAR, i + 300, { amp: 0.1, bumps: 6 });
  }
  roofs(g);
  // big trees: left (behind the fountain), middle (behind the lamp), right (by the bench)
  bigTree(g, 2214, 92, [[0, -150, 52], [-40, -128, 40], [40, -126, 42], [-22, -186, 40], [26, -184, 38], [0, -214, 30]], 1);
  bigTree(g, 2562, 200, [[0, -240, 46], [-34, -214, 36], [36, -212, 38], [-18, -272, 34], [20, -270, 32], [0, -298, 24]], 2);
  // low trimmed hedge along the back of the lawn (gap where the path starts)
  for (let x = X0 + 6; x < X1 - 4; x += 11) { if (Math.abs(x - 2566) < 26) continue; const h = 11 + rnd(x) * 4; leafBall(g, x, LAND - h * 0.55, h * 0.75, LEAVES, x, { amp: 0.06, bumps: 5, lift: 0.08 }); }
  gate(g); fountain(g); lamp(g); bench(g);
  // ground: a grass lip, then the soil cross-section (same strata as the pasture next door, so the seam is invisible)
  for (let x = X0; x < X1; x++) for (let y = LAND; y < 330; y++) {
    const d = y - LAND; let col;
    if (d < 2) col = d < 1 ? "#B4D468" : "#7EAE48"; else if (d < 5 + Math.sin(x * 0.37) * 1.5) col = "#4A7A34"; else if (d < 9 + Math.sin(x * 0.21) * 2) col = "#4E3020"; else col = soil(x, y, d);
    g.px(x, y, col);
  }
  underground(g);
  // a stone retaining wall where the park terrace meets the village (left edge), with a lit coping stone
  for (let y = LAND - 2; y < 330; y++) for (let x = X0; x < X0 + 12; x++) { const row = Math.floor((y - LAND + 2) / 9), brick = (y - LAND + 2) % 9 === 0 || (x - X0 + (row & 1) * 6) % 12 === 0; g.px(x, y, x === X0 + 11 ? STONE[1] : brick ? STONE[2] : y < LAND + 1 ? STONE[7] : x < X0 + 3 ? STONE[5] : STONE[4]); }
  // flowers along the ground line: tulip clumps in front of the hedge, daisies and clover in the grass
  for (const [x0, n, seed] of [[2486, 7, 3], [2756, 6, 9], [2168, 5, 5]]) for (let i = 0; i < n; i++) tulip(g, x0 + i * 7 + R(rnd(seed + i) * 3), LAND + 1, (seed + i) % 4, 9 + R(rnd(seed * 3 + i) * 5));
  for (let i = 0; i < 60; i++) { const x = R(X0 + rnd(i * 7 + 202) * (X1 - X0)); if (Math.abs(x - DX) < 100 || Math.abs(x - HX) < 50) continue; if (rnd(i * 3) < 0.4) clover(g, x, LAND - 2, "#3E8A3E", "#7CC85E"); else { stem(g, x, LAND - 4, LAND, "#3A7A36", 0, false); flower(g, x, LAND - 5, 1 + (i % 2), i % 5 === 0 ? "#F8E070" : "#FFFFFF", "#F8C840"); } }
  // FRONT: grass blades over the ground line, big foreground tufts and daisies along the bottom of the frame
  for (let i = 0; i < 74; i++) { const x = R(X0 + 6 + i * 11 + rnd(i * 3) * 6); if (x > X1 - 6) continue; if (Math.abs(x - DX) < 60 && rnd(i) < 0.6) continue; tuft(f, x, LAND + 3, 6 + rnd(i * 5) * 8, 3 + (i % 3), ["#3E8A3A", "#5AA444", "#8ACC5E"], i * 7 + 11, (rnd(i * 9) - 0.5) * 2); }
  for (let i = 0; i < 25; i++) { const x = R(X0 + 12 + i * 32 + rnd(i * 13 + 302) * 14), y = R(LAND + 296 + (i % 3) * 6); tuft(f, x, y, 24 + rnd(i) * 22, 5 + Math.floor(rnd(i * 3) * 3), ["#24542C", "#3A7A36", "#5A9E44", "#86C45E"], i * 5 + 300, (rnd(i * 9) - 0.5) * 6); }
  for (let i = 0; i < 9; i++) { const x = R(X0 + 30 + rnd(i * 19 + 401) * (X1 - X0 - 60)), y = R(LAND + 300), h = 18 + rnd(i * 5) * 16; stem(f, x, y - h, y, "#2E6A30", 0, true); flower(f, x, y - h, 4, i % 3 ? "#FFFFFF" : "#F8E070", "#F8C840"); }
}

// ---------------------------------------------------------------- soil cross-section (copied from the pasture's strata)
const SOIL = ["#7A4A2A", "#6C4026", "#835232", "#62391F", "#77482A", "#8A5A36"];
function soil(wx, wy, d) {
  const wv = Math.sin(wx * 0.029) * 5 + Math.sin(wx * 0.12) * 2, v = (wy + wv + 400) / 21, band = Math.floor(v), f = v - band;
  let col = SOIL[((band % SOIL.length) + SOIL.length) % SOIL.length];
  if (f < 0.09 && bayer(wx, wy) > 0.35) col = mix(col, "#3A2010", 0.3);
  if (wy > 100) col = mix(col, "#2E1A10", Math.min(0.42, (wy - 100) / 700));
  if (d > 6 && rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#E8C8A0", 0.45); else if (d > 6 && rnd(wx * 29 + wy * 17) < 0.006) col = mix(col, "#24140A", 0.5);
  return col;
}
function underground(g) {
  // tree roots, the fountain's water pipe, a buried bone under the collie, an earthworm, a sleeping mole, stones
  for (const [x, n, seed] of [[2214, 7, 1], [2562, 8, 2]]) for (let i = 0; i < n; i++) { let px = x + (i - n / 2) * 4, py = LAND + 6; const dir = (i - n / 2) * 0.5; for (let k = 0; k < 26 + rnd(seed * 9 + i) * 40; k++) { g.px(R(px), R(py), "#3E2412"); if (k < 12) g.px(R(px) + 1, R(py), "#3E2412"); px += dir * 0.6 + (rnd(seed * 50 + i * 7 + k) - 0.5) * 1.6; py += 0.9; } }
  const PIPE = ["#2A3440", "#4A5A6A", "#7A8A9A", "#A8B8C4"];
  const pipe = (x0, y0, x1, y1) => { if (x0 === x1) for (let y = y0; y <= y1; y++) for (let k = -3; k <= 3; k++) g.px(x0 + k, y, PIPE[Math.abs(k) === 3 ? 0 : k < 0 ? 3 : k === 0 ? 2 : 1]); else for (let x = x0; x <= x1; x++) for (let k = -3; k <= 3; k++) g.px(x, y0 + k, PIPE[Math.abs(k) === 3 ? 0 : k < 0 ? 3 : k === 0 ? 2 : 1]); };
  pipe(FX, LAND + 9, FX, 66); pipe(X0 + 12, 66, FX, 66);
  for (const [x, y] of [[FX, 30], [FX - 60, 66], [FX - 120, 66]]) { g.rect(x - 5, y - 5, 11, 11, PIPE[0]); g.rect(x - 4, y - 4, 9, 9, PIPE[2]); g.rect(x - 4, y - 4, 9, 2, PIPE[3]); }
  // the bone: two knobs at each end, cream with a shadow
  const bx = 2470, by = 92;
  g.rect(bx - 14, by - 3, 28, 7, "#5A4A3A"); g.rect(bx - 13, by - 2, 26, 5, "#F2E8D2"); g.rect(bx - 13, by - 2, 26, 1, "#FFFFFF");
  for (const s of [-1, 1]) for (const dy of [-3, 3]) { const cx = bx + s * 15, cy = by + dy; for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const d = i * i + j * j; if (d <= 16) g.px(cx + i, cy + j, d > 11 ? "#5A4A3A" : i + j < -2 ? "#FFFFFF" : "#F2E8D2"); } }
  // earthworm (pink, curled)
  for (let k = 0; k < 26; k++) { const x = R(2660 + k * 1.1), y = R(40 + Math.sin(k * 0.45) * 4); g.px(x, y, "#E890A0"); g.px(x, y + 1, "#C86A80"); if (k % 4 === 0) g.px(x, y, "#F8B8C4"); }
  // a mole asleep in its burrow (dark chamber, round body, pink nose and hands)
  const mx = 2862, my = 150;
  for (let j = -18; j <= 16; j++) for (let i = -30; i <= 30; i++) { const d = (i / 30) ** 2 + (j / 18) ** 2; if (d <= 1) g.px(mx + i, my + j, d > 0.82 ? "#3A2414" : "#24160C"); }
  const tun = bezier([mx + 22, my - 6], [mx + 70, my - 20], [mx + 64, LAND + 2], 80);
  for (const [x, y] of tun) for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) { const d = i * i + j * j; if (d <= 49 && !(y + j < LAND + 3)) g.px(R(x) + i, R(y) + j, d > 34 ? "#3A2414" : "#24160C"); }
  for (let j = 0; j < 9; j++) { const half = R(16 * Math.sqrt(1 - (j / 9) ** 2)); for (let i = -half; i <= half; i++) g.px(mx + 64 + i, LAND - j, j === 8 || Math.abs(i) === half ? "#4A2C18" : (i + j) % 3 === 0 ? "#6A4428" : "#7A5032"); }
  blob(g, [ell(mx - 2, my + 4, 22, 13)], { ramp: ["#141018", "#22202A", "#32303C", "#44424E", "#585664", "#706E7C", "#8A8896", "#A6A4B0"], thick: 8, base: 3.2, gain: 1.8, outline: "#0C0A10", litOutline: "#8A8896" });
  for (const s of [-1, 1]) { g.rect(mx - 2 + s * 14 - 3, my + 13, 7, 3, "#F2A0B0"); g.px(mx - 2 + s * 14 - 2, my + 12, "#F8C0CC"); }
  g.rect(mx - 23, my + 2, 5, 4, "#F2A0B0"); g.px(mx - 24, my + 3, "#F8C0CC");
  for (const dx of [-14, -6]) { g.px(mx + dx, my - 1, "#0C0A10"); g.px(mx + dx + 1, my, "#0C0A10"); g.px(mx + dx + 2, my - 1, "#0C0A10"); }
  for (let i = 0; i < 10; i++) { const wx = X0 + 30 + rnd(i * 7 + 3) * (X1 - X0 - 60), wy = 30 + rnd(i * 5 + 2) * 260, r = 3 + rnd(i) * 6; if (Math.abs(wx - mx) < 60 && Math.abs(wy - my) < 40) continue; blob(g, [ell(wx, wy, r * 1.4, r)], { ramp: ["#2A1A14", "#4A3024", "#6A4A38", "#8A6650", "#A6826A", "#C09E84", "#D6B89E", "#EAD2B8"], thick: 4 }); }
}
function tulip(g, x, y, ci, h) {
  const cols = [["#E8344A", "#FF8A96", "#A01828"], ["#F8C830", "#FFF0A0", "#C8901A"], ["#F07AB0", "#FFC8E0", "#B8407A"], ["#FFFFFF", "#FFFFFF", "#C8C8D8"]], [c1, c2, c3] = cols[ci];
  for (let j = 0; j < h; j++) g.px(x, y - j, j < 2 ? "#2E6A30" : "#3A8A3A");
  g.px(x - 1, y - 2, "#4A9A44"); g.px(x - 2, y - 3, "#4A9A44"); g.px(x + 1, y - 3, "#58A84C"); g.px(x + 2, y - 4, "#58A84C");
  const ty = y - h - 4;
  for (let j = 0; j < 5; j++) for (let k = -2; k <= 2; k++) { if (j === 4 && Math.abs(k) === 2) continue; g.px(x + k, ty + j, k === 2 ? c3 : k < 0 && j < 3 ? c2 : c1); }
  g.px(x - 2, ty - 1, c1); g.px(x, ty - 1, c1); g.px(x + 2, ty - 1, c3);
}

function roofs(g) {
  // the last village houses peeking over the park wall: cream walls, terracotta tile roofs, a chimney
  for (const [x, w, h, ry] of [[X0 + 8, 58, 52, 30], [X0 + 58, 46, 32, 22]]) {
    const top = LAND - h;
    for (let y = top; y < LAND; y++) for (let X = x; X < x + w; X++) g.px(X, y, X > x + w - 8 ? "#D8C0A0" : "#F0DCBC");
    for (let j = 0; j < 2; j++) { const wx = x + 12 + j * 22; if (wx + 10 > x + w - 6) continue; g.rect(wx - 1, top + 9, 12, 14, "#7A5A3A"); g.rect(wx, top + 10, 10, 12, "#9ACCE8"); g.rect(wx, top + 10, 10, 4, "#C8E8F8"); g.rect(wx + 4, top + 10, 1, 12, "#7A5A3A"); }
    const ax = x + w / 2;
    for (let y = top - ry; y <= top + 2; y++) { const k = (y - (top - ry)) / (ry + 2), half = (w / 2 + 6) * k; for (let X = R(ax - half); X <= R(ax + half); X++) { const row = (y - top + ry) % 5, edge = Math.abs(X - ax) > half - 1.5; g.px(X, y, edge ? ROOF[0] : row === 4 ? ROOF[1] : X > ax + half * 0.3 ? ROOF[2] : X < ax - half * 0.5 && row < 2 ? ROOF[4] : ROOF[3]); } }
  }
  g.rect(X0 + 40, LAND - 98, 9, 20, "#7A3A2A"); g.rect(X0 + 41, LAND - 98, 3, 20, "#A85A44"); g.rect(X0 + 38, LAND - 100, 13, 3, "#5A2A1E");
}
function bigTree(g, x, h, balls, seed) {
  // trunk with a lit left side and two branches, canopy of leaf clusters (darker at the back)
  for (let y = LAND - h; y < LAND + 2; y++) { const w = 6 + Math.max(0, (y - LAND + 22) * 0.35); for (let X = R(x - w); X <= R(x + w); X++) { const u = (X - x + w) / (2 * w); g.px(X, y, u < 0.12 ? WOOD[0] : u < 0.38 ? WOOD[4] : u < 0.78 ? WOOD[3] : u < 0.92 ? WOOD[2] : WOOD[0]); } }
  for (const s of [-1, 1]) for (let k = 0; k < 34; k++) { const X = R(x + s * k * 0.8), Y = R(LAND - h + 10 - k * 0.9); for (let j = -2; j <= 2; j++) g.px(X + j, Y, j === -2 ? WOOD[4] : WOOD[2]); }
  for (const [i, [dx, dy, r]] of balls.entries()) leafBall(g, x + dx, LAND + dy, r, LEAVES, seed * 10 + i, { amp: 0.1, bumps: 8, lift: i > 2 ? 0.05 : -0.05 });
  for (let i = 0; i < 26; i++) { const [dx, dy, r] = balls[i % balls.length], an = rnd(seed * 50 + i) * 6.28, rr = rnd(seed * 70 + i) * r * 0.8, X = R(x + dx + Math.cos(an) * rr), Y = R(LAND + dy + Math.sin(an) * rr); if (g.has(X, Y) && Math.sin(an) < 0.2) { g.px(X, Y, "#C8E89A"); g.px(X + 1, Y, "#A6D486"); } }
}
function gate(g) {
  // a stone gate pillar at the park entrance (left edge) with a little lamp ball on top
  const x = X0 + 2, top = LAND - 74;
  for (let y = top; y < LAND; y++) for (let X = x - 10; X <= x + 10; X++) { const u = (X - x + 10) / 20, brick = ((y - top) % 10 === 0) || ((X - x + ((Math.floor((y - top) / 10) & 1) * 5)) % 10 === 0); g.px(X, y, X === x - 10 || X === x + 10 ? STONE[1] : brick ? STONE[3] : u < 0.3 ? STONE[6] : u > 0.8 ? STONE[4] : STONE[5]); }
  g.rect(x - 13, top - 5, 27, 6, STONE[2]); g.rect(x - 12, top - 5, 25, 2, STONE[6]);
  for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) { const d = i * i + j * j; if (d <= 36) g.px(x + i, top - 12 + j, d > 28 ? STONE[1] : i + j < -3 ? STONE[7] : STONE[5]); }
}
function fountain(g) {
  // tiered stone fountain: wide basin with water, a column, a middle bowl, a small top bowl (water animated per frame)
  const x = FX, by = LAND;
  for (let y = by - 24; y < by; y++) for (let X = x - 62; X <= x + 62; X++) { const k = (X - x) / 62, top = by - 24 + R(k * k * 3); if (y < top) continue; const u = (X - x + 62) / 124; g.px(X, y, y < top + 3 ? (y === top ? STONE[2] : STONE[7]) : u < 0.2 ? STONE[6] : u > 0.85 ? STONE[3] : STONE[5]); }
  for (let X = x - 58; X <= x + 58; X++) { g.px(X, by - 22, "#7CC8E8"); g.px(X, by - 23, "#A8E0F4"); }
  for (let X = x - 62; X <= x + 62; X++) g.px(X, by - 1, STONE[2]);
  for (let y = by - 66; y < by - 22; y++) for (let X = x - 7; X <= x + 7; X++) g.px(X, y, X < x - 4 ? STONE[6] : X > x + 4 ? STONE[3] : STONE[5]);
  bowl(g, x, by - 66, 32, 9); for (let y = by - 96; y < by - 66; y++) for (let X = x - 4; X <= x + 4; X++) g.px(X, y, X < x - 1 ? STONE[6] : X > x + 2 ? STONE[3] : STONE[5]);
  bowl(g, x, by - 96, 16, 6);
  for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j <= 16) g.px(x + i, by - 104 + j, i * i + j * j > 11 ? STONE[2] : i + j < -2 ? STONE[7] : STONE[5]);
}
function bowl(g, x, y, w, h) {
  for (let j = 0; j <= h; j++) { const half = R(w * Math.sqrt(Math.max(0, 1 - (j / (h + 1)) ** 2))); for (let X = x - half; X <= x + half; X++) g.px(X, y + j, j === 0 ? STONE[7] : X === x - half || X === x + half || j === h ? STONE[2] : (X - x) / w < -0.4 ? STONE[6] : (X - x) / w > 0.5 ? STONE[3] : STONE[5]); }
  for (let X = x - w + 2; X <= x + w - 2; X++) g.px(X, y + 1, "#8ED4EE");
}
function lamp(g) {
  const x = LAMP, top = LAND - 150;
  g.rect(x - 6, LAND - 8, 13, 8, IRON); g.rect(x - 5, LAND - 8, 3, 8, IRON_L);
  g.rect(x - 2, top + 22, 5, 130, IRON); g.rect(x - 2, top + 22, 1, 130, IRON_L);
  for (const y of [LAND - 46, top + 30]) g.rect(x - 4, y, 9, 3, IRON);
  g.poly([[x - 11, top + 22], [x + 12, top + 22], [x + 8, top + 2], [x - 7, top + 2]], IRON);
  g.poly([[x - 8, top + 20], [x + 9, top + 20], [x + 6, top + 4], [x - 5, top + 4]], "#FFF4C8"); g.rect(x - 4, top + 6, 3, 12, "#FFFFFF");
  g.poly([[x - 12, top + 3], [x + 13, top + 3], [x, top - 8]], IRON); g.rect(x - 1, top - 12, 3, 5, IRON);
}
function bench(g) {
  const x = BENCH, w = 40;
  for (const s of [-1, 1]) { g.rect(x + s * (w - 6) - 2, LAND - 20, 4, 20, IRON); g.rect(x + s * (w - 6) - 2, LAND - 46, 4, 26, IRON); }
  for (const [y, hh] of [[LAND - 46, 6], [LAND - 37, 6]]) { g.rect(x - w, y, 2 * w, hh, WOOD[1]); g.rect(x - w + 1, y + 1, 2 * w - 2, hh - 2, WOOD[4]); g.rect(x - w + 1, y + 1, 2 * w - 2, 1, WOOD[6]); }
  g.rect(x - w - 3, LAND - 22, 2 * w + 6, 6, WOOD[1]); g.rect(x - w - 2, LAND - 21, 2 * w + 4, 4, WOOD[5]); g.rect(x - w - 2, LAND - 21, 2 * w + 4, 1, WOOD[7]);
  for (let X = x - w - 2; X <= x + w + 2; X++) g.px(X, LAND, mix(g.get(X, LAND), "#1E4A2A", 0.4));
}
// ---------------------------------------------------------------- per-frame details: fountain water, butterflies, leash
function fountainWater(c, V, t) {
  const x = V.X(FX), by = V.Y(LAND);
  if (x < -80 || x > 620) return;
  const g = c, cols = ["#E8FAFF", "#A8E0F4", "#7CC8E8"];
  // top jet: a small arc falling into the top bowl, the overflow streaming from both bowls
  for (let k = 0; k < 18; k++) { const u = ((t * 1.6 + k / 18) % 1), s = k % 2 ? 1 : -1, px = x + s * u * 14, py = by - 106 - 10 * Math.sin(Math.PI * u) + u * 12; g.px(R(px), R(py), cols[k % 3]); }
  for (const [w, top, len] of [[16, 96, 30], [32, 66, 42]]) for (const s of [-1, 1]) for (let j = 0; j < len; j++) { const ph = (j - t * 40) % 6, xx = R(x + s * (w + 1 + Math.sqrt(j) * 1.6)), yy = R(by - top + 2 + j); if (yy > by - 22) break; g.px(xx, yy, ph < -3 || (ph > 0 && ph < 3) ? cols[0] : cols[1]); }
  // ripples on the basin water
  for (let k = 0; k < 3; k++) { const u = (t * 0.6 + k / 3) % 1, rx = 6 + u * 46, ga = 1 - u; for (let X = -R(rx); X <= R(rx); X += 2) if (rnd(k * 31 + X) < ga) g.px(R(x + X), R(by - 22), "#E8FAFF"); }
}
function butterflies(c, V, t) {
  for (let i = 0; i < 3; i++) {
    const wx = 2300 + i * 260 + Math.sin(t * 0.7 + i * 2) * 40 + Math.sin(t * 1.9 + i) * 10, wy = -120 - i * 20 + Math.sin(t * 1.3 + i * 3) * 24, x = R(V.X(wx)), y = R(V.Y(wy)); if (x < -5 || x > 545) continue;
    const flap = Math.abs(Math.sin(t * 14 + i * 2)), col = ["#F8E070", "#F7A0C8", "#FFFFFF"][i], dark = ["#C88A20", "#C8508A", "#A8A8C8"][i];
    for (const s of [-1, 1]) { const w = 1 + R(flap * 3); c.rect(x + (s < 0 ? -w : 1), y - 2, w, 3, col); c.px(x + s * (w > 1 ? w : 1), y - 2, dark); c.rect(x + (s < 0 ? -2 : 1), y + 1, 2, 2, col); }
    c.px(x, y - 2, "#2A1A20"); c.px(x, y - 1, "#2A1A20"); c.px(x, y, "#2A1A20"); c.px(x, y + 1, "#2A1A20");
  }
}
function bezier(p0, p1, p2, n) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } return out; }
function leash(c, a, b, t) {
  const mid = [(a[0] + b[0]) / 2 + Math.sin(t * 1.3) * 5, Math.max(a[1], b[1]) + 64 + Math.sin(t * 0.9) * 3], pts = bezier(a, mid, b, 400);
  for (const [x, y] of pts) { c.px(R(x), R(y) - 1, COLLAR[0]); c.px(R(x), R(y) + 2, COLLAR[0]); }
  for (const [x, y] of pts) { c.px(R(x), R(y), COLLAR[3]); c.px(R(x), R(y) + 1, COLLAR[2]); }
  for (const [i, [x, y]] of pts.entries()) if (i % 9 < 3) c.px(R(x), R(y), COLLAR[5]);
}

// ---------------------------------------------------------------- the balances (screen-space HUD anchored to a world x)
const PIVOT_Y = 238, HB = 150, STR = 56;
// heaps: [kind, variant] in landing order (bottom row first); positions are laid out once per heap
const DOGS = [["dog", 0], ["dog", 1], ["pup", 2], ["dog", 3], ["dog", 4], ["pup", 0], ["dog", 2], ["dog", 1], ["pup", 3], ["dog", 0], ["dog", 4], ["pup", 1], ["dog", 2], ["dog", 3], ["pup", 4]];
const WILD = [["bear", 0], ["deer", 0], ["wolf", 0], ["boar", 0], ["fox", 0], ["rabbit", 0], ["deer", 0], ["wolf", 0], ["rabbit", 0]];
const PEOPLE = Array.from({ length: 22 }, (_, i) => (i === 17 ? ["hero", 0] : ["person", (i * 5 + 2) % 6]));
function heap(items, rowsN) {
  const out = []; let i = 0, row = 0;
  while (i < items.length) { const n = rowsN[row] ?? 1, wsum = 13 * n; for (let k = 0; k < n && i < items.length; k++, i++) out.push([items[i][0], items[i][1], -wsum / 2 + 6.5 + k * 13 + (rnd(i * 7) - 0.5) * 2, -row * 9 - (rnd(i * 3) < 0.5 ? 0 : 1)]); row++; }
  return out;
}
const H_DOGS = heap(DOGS, [7, 5, 3]), H_WILD = heap(WILD, [5, 3, 1]), H_PEOPLE = heap(PEOPLE, [7, 6, 5, 3, 1]);
const landed = (t, t0) => sm(t, t0, t0 + 0.08);
function dropTimes(n, t0, step) { return Array.from({ length: n }, (_, i) => t0 + i * step); }
// timings (from words)
const S1_IN = EV.dogs - 0.12, S1_OUT = LV.dog[1] - 0.15, D_T = dropTimes(DOGS.length, EV.dogs + 0.05, 0.066), W_T = dropTimes(WILD.length, EV.wild - 0.62, 0.075);
const S2_IN = EV.people - 0.25, S2_OUT = LV.human[1] - 0.22, P_T = dropTimes(PEOPLE.length, EV.people + 0.05, 0.042);
const BAL_FADE = [0.3, 0.35], DROP_FALL = 0.22, DROP_BOUNCE = 0.16, PICKUP_LIFE = 1.6;
const LBL = { dogs: [EV.dogs, EV.dogs + 0.3], wild: [EV.wild - 0.1, EV.wild + 0.2], people: [EV.people, EV.people + 0.3] };   // label fade-ins [start, end]
const EQ = [EV.mammals, EV.mammals + 0.25], X20 = { fade: [EV.twentyTimes - 0.05, EV.twentyTimes + 0.2], slide: 0.35 };   // "=" fade; "×20" fade + slide-up (from fade[0])
// pan loads (weights) of each balance, in units of all the wild land mammals
const W1L = (s) => D_T.reduce((acc, t0) => acc + landed(s, t0), 0) / DOGS.length, W1R = (s) => W_T.reduce((acc, t0) => acc + landed(s, t0), 0) / WILD.length;
const W2L = (s) => 20 * P_T.reduce((acc, t0) => acc + landed(s, t0), 0) / PEOPLE.length, W2R = () => 1;
/** One integration step of the beam: damped spring toward the weight balance, with mechanical stops at ±0.21 rad. */
export function beamStep(th, v, s, wL, wR, dt) {
  const L = wL(s), Rr = wR(s), target = 0.19 * Math.tanh(2.2 * (L - Rr) / Math.max(0.35, Math.min(L, Rr) + 0.35)); v += (-70 * (th - target) - 7.5 * v) * dt; th += v * dt; if (Math.abs(th) > 0.21) { th = Math.sign(th) * 0.21; v *= -0.3; }
  return [th, v];
}
export const BEAM_DT = 1 / 240;
/** Beam angle (positive = left pan down) by integrating a damped spring toward the weight balance. */
function beam(t, t0, theta0, wL, wR) {
  let th = theta0, v = 0; const dt = BEAM_DT, end = Math.max(t0, t);
  for (let s = t0; s < end; s += dt) [th, v] = beamStep(th, v, s, wL, wR, dt);
  return th;
}
/** Timing tables of this level (for the sound cues in park-motions.mjs); the drawing below reads the same values. */
export const TIMING = {
  balances: [{ id: "dogs", t0: S1_IN, out: S1_OUT, theta0: 0, wL: W1L, wR: W1R }, { id: "people", t0: S2_IN, out: S2_OUT, theta0: -0.19, wL: W2L, wR: W2R }],
  D_T, W_T, P_T, BAL_FADE, DROP_FALL, DROP_BOUNCE, PICKUP_LIFE, LBL, EQ, X20,
};
function dish(g, x, y, a) {
  // brass pan: strings from the beam end, a shallow bowl
  for (const s of [-1, 1]) g.line(R(x), R(y - STR), R(x + s * 44), R(y), "#6A4410");
  g.px(R(x), R(y - STR), BRASS[6]);
  for (let j = 0; j <= 9; j++) { const half = R(48 * Math.sqrt(Math.max(0, 1 - (j / 10) ** 2))); for (let X = -half; X <= half; X++) g.px(R(x + X), R(y + j), j === 0 ? BRASS[6] : j === 1 ? BRASS[5] : Math.abs(X) >= half - 1 || j === 9 ? BRASS[1] : X < -half * 0.4 ? BRASS[5] : X > half * 0.5 ? BRASS[3] : BRASS[4]); }
  for (let X = -40; X <= -24; X++) g.px(R(x + X), R(y + 3), BRASS[7]);
}
function label(c, lines, cx, y, a, col) {
  if (a <= 0) return; const s = 2, w = Math.max(...lines.map((l) => c.measure(MAIN, l, { scale: s }))) + 16, h = lines.length * 20 + 6, x = R(Math.max(12, Math.min(528 - w, cx - w / 2)));
  panel(c, x, R(y), w, h, a, col); const g = fade(c, a);
  lines.forEach((l, i) => { const lw = c.measure(MAIN, l, { scale: s }); g.text(MAIN, l, R(x + (w - lw) / 2), R(y) + 5 + i * 20, col, { scale: s }); });
}
function balance(c, cx, a, th, left, right, t) {
  if (a <= 0) return;
  const g = fade(c, a), cs = Math.cos(th), sn = Math.sin(th), L = [cx - HB * cs, PIVOT_Y + HB * sn], Rt = [cx + HB * cs, PIVOT_Y - HB * sn];
  // hanger: ring, fork, pointer (upright when level)
  g.ring(R(cx), PIVOT_Y - 26, 4, BRASS[1]); g.ring(R(cx), PIVOT_Y - 26, 3, BRASS[5]);
  for (const s of [-1, 1]) { g.line(R(cx + s * 2), PIVOT_Y - 22, R(cx + s * 9), PIVOT_Y - 2, BRASS[1]); g.line(R(cx + s * 3), PIVOT_Y - 22, R(cx + s * 10), PIVOT_Y - 2, BRASS[4]); }
  g.px(R(cx), PIVOT_Y - 16, "#FFFFFF");
  // beam (outline, body, highlight), pans hanging plumb under the ends
  const bp = (u) => [lerp(L[0], Rt[0], u), lerp(L[1], Rt[1], u)];
  for (let i = 0; i <= 300; i++) { const [x, y] = bp(i / 300), taper = 2 + R(1.2 * Math.cos(Math.PI * (i / 300 - 0.5))); for (let j = -taper - 1; j <= taper + 1; j++) g.px(R(x), R(y + j), Math.abs(j) > taper ? BRASS[0] : j < -taper + 1 ? BRASS[6] : j < 0 ? BRASS[5] : BRASS[3]); }
  const nx = cx - Math.sin(th) * 0 + Math.sin(-th) * -14, ny = PIVOT_Y - Math.cos(th) * 14; g.line(R(cx), PIVOT_Y, R(cx + Math.sin(-th) * 14), R(PIVOT_Y - Math.cos(th) * 14), "#C83A2E");
  for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) { const d = i * i + j * j; if (d <= 25) g.px(R(cx) + i, PIVOT_Y + j, d > 18 ? BRASS[0] : i + j < -2 ? BRASS[7] : BRASS[4]); }
  for (const [end, side] of [[L, left], [Rt, right]]) {
    const px = end[0], py = end[1] + STR;
    dish(g, px, py, a);
    for (const [kind, v, dx, dy, t0] of side.items) { if (t < t0) continue; const k = clamp01((t - t0) / DROP_FALL), fall = (1 - k) * (1 - k) * 34, bounce = k >= 1 ? Math.max(0, Math.sin(Math.PI * clamp01((t - t0 - DROP_FALL) / DROP_BOUNCE))) * 2 : 0; tiny(fade(c, a * sm(k, 0, 0.5)), kind, v, px + dx, py - 1 + dy - fall - bounce); }
    label(c, side.label, px, py + 14, a * side.la, side.col);
  }
  return { L, Rt };
}
function scaleItems(H, T) { return H.map(([k, v, dx, dy], i) => [k, v, dx, dy, T[i]]); }

// ---------------------------------------------------------------- level exports
const off = (V) => V.x1 < X0 - 60 || V.x0 > X1 + 60;
export function back(c, V, t) { if (off(V)) return; if (!BACK) build(); BACK.blit(c, V); fountainWater(c, V, t); }

export function actors(c, V, t) {
  if (off(V)) return;
  // level signs: blue park plates on short posts
  for (const [wx, txt] of [[SIGN5, "LV 5"], [SIGN6, "LV 6"]]) { const x = R(V.X(wx)), y = R(V.Y(LAND)); c.rect(x - 2, y - 26, 5, 26, IRON); c.rect(x - 2, y - 26, 1, 26, IRON_L); sign(c, x, y - 22, txt, "plate", 1, t); }
  // the collie: looks up at the balance while the heaps land, tilts its head at the wild animals
  const atDogs = win(t, EV.dogs + 0.1, EV.dogs + 1.4, 0.2, 0.35), atWild = win(t, EV.wild - 0.5, EV.mammals + 0.2, 0.2, 0.35), atHero = win(t, EV.people - 0.3, EV.people + 1.2, 0.25, 0.4);
  const look = [-0.5 * atDogs + 0.55 * atWild + 0.8 * atHero, -0.85 * atDogs - 0.8 * atWild];
  const dog = drawDog(c, R(V.X(DX)), R(V.Y(DY)), t, { look, blink: blinkAt(t, 3.9, 2.9), open: 0.75, tilt: 0.1 * atWild, earPerk: Math.max(atDogs, win(t, EV.dog - 0.1, EV.dog + 1.4, 0.2, 0.4)), wag: 1 + 0.6 * atHero });
  // the hero (scale 2) holds the long red leash with his left mitten
  const hx = R(V.X(HX)), hy = R(V.Y(LAND)), hand = [hx - 60, hy - 100];
  leash(c, dog.ring, [hand[0] + 2, hand[1] + 2], t);
  c.tint(hx - 64, hy - 5, 128, 10, (x, y) => { const d = ((x - hx) / 62) ** 2 + ((y - hy) / 4) ** 2; return d < 1 ? 0.42 * (1 - d) : 0; }, "#0E2A12", 3);
  const lookS = win(t, EV.people + 0.1, EV.that - 0.2, 0.25, 0.35), lookD = win(t, LV.dog[0], EV.dogs, 0.3, 0.3);
  drawHero(c, hx, hy, { scale: 2, look: [-0.7 * lookD - 0.5 * lookS, -0.8 * lookS], blink: blinkAt(t, 3.4, 1.1) });
}

export function front(c, V, t) { if (off(V)) return; if (!FRONT) build(); FRONT.blit(c, V); butterflies(c, V, t); }

export function hud(c, V, t) {
  if (off(V)) return;
  pickup(c, R(V.X(DX)), 262, "20 KG", (t - EV.twentyKg) / PICKUP_LIFE);
  // balance 1 over the collie: ALL DOGS = WILD LAND MAMMALS
  const a1 = win(t, S1_IN, S1_OUT, ...BAL_FADE);
  if (a1 > 0) {
    const th = beam(t, S1_IN, 0, W1L, W1R), cx = R(V.X(DX));
    balance(c, cx, a1, th, { items: scaleItems(H_DOGS, D_T), label: ["ALL DOGS"], la: sm(t, ...LBL.dogs), col: C.Y }, { items: scaleItems(H_WILD, W_T), label: ["WILD LAND", "MAMMALS"], la: sm(t, ...LBL.wild), col: C.CY }, t);
    const ea = Math.min(a1, sm(t, ...EQ)); if (ea > 0) { const g = fade(c, ea), y = PIVOT_Y + 14 + R((1 - ea) * 4); g.rrect(cx - 13, y, 27, 22, C.O, 2); g.rrect(cx - 12, y + 1, 25, 20, "#2A6A3A", 2); g.text(MAIN, "=", cx - 4, y + 4, "#FDFEED", { scale: 2 }); }
  }
  // balance 2 over the hero: ALL PEOPLE sink the wild mammals' pan, ×20
  const a2 = win(t, S2_IN, S2_OUT, ...BAL_FADE);
  if (a2 > 0) {
    const th = beam(t, S2_IN, -0.19, W2L, W2R), cx = R(V.X(HX));
    const res = balance(c, cx, a2, th, { items: scaleItems(H_PEOPLE, P_T), label: ["ALL PEOPLE"], la: sm(t, ...LBL.people), col: C.Y }, { items: scaleItems(H_WILD, W_T.map(() => -10)), label: ["WILD LAND", "MAMMALS"], la: 1, col: C.CY }, t);
    const xa = Math.min(a2, sm(t, ...X20.fade));
    if (xa > 0) { const s = 3, txt = "×20", w = c.measure(MAIN, txt, { scale: s }), x = R(res.L[0] - w / 2), y = R(res.L[1] + STR + 50 + 8 * (1 - ease(clamp01((t - EV.twentyTimes + 0.05) / X20.slide)))), g = fade(c, xa);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 2]]) g.text(MAIN, txt, x + dx, y + dy, C.O, { scale: s }); g.text(MAIN, txt, x, y, C.Y, { scale: s }); }
  }
  pickup(c, R(V.X(HX)) + 112, 452, "62 KG", (t - EV.people) / PICKUP_LIFE);
}
