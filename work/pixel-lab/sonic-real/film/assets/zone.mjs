// sonic-real · the game zone (new, 2026-10-30, drawn for this film): OUR OWN bright 16-bit zone in the spirit of the first
// game — not Green Hill, no Sega tiles or layout. Drawn on a 108 × 192 «game pixel» canvas and scaled ×5 (nearest) onto the
// 540 × 960 grid, so every game pixel is a clean 5 × 5 square, like the hero sprite (drawn into the same canvas at 1 cell = 1 game
// pixel). Layers with parallax: banded sky, flat clouds, far violet mountains, a shimmering sea band, round striped green hills
// with a checkered loop on one of them, palm trees, and the ground: a grass lip with tufts over checkered earth (our two-brown
// checker with a light corner tick). Terrain height is a pure function of world x (game px); a slope runs down to the portal.
import { Canvas, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { drawSonic } from "./sonic.mjs";

export const ZN = 5, ZW = 108, ZH = 192;
const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const Z = {
  sky: [[0, [40, 72, 200]], [22, [48, 92, 222]], [46, [60, 116, 240]], [66, [84, 144, 252]], [82, [120, 176, 255]], [94, [160, 204, 255]]],
  cloud: [250, 252, 255], cloudB: [190, 216, 255], cloudO: [120, 160, 236],
  mtn: [[96, 84, 170], [124, 112, 200], [160, 150, 226]], snow: [236, 240, 255],
  sea: [36, 120, 210], sea2: [64, 160, 232], sea3: [210, 240, 255],
  hill: [[34, 120, 40], [56, 160, 52], [92, 196, 72]], hillO: [18, 72, 30],
  grass: [[40, 150, 40], [88, 204, 64], [150, 236, 96]], grassO: [16, 70, 26],
  dirt: [[156, 84, 34], [118, 58, 24], [194, 116, 52], [80, 36, 16]],
  trunk: [[150, 90, 40], [196, 132, 64], [96, 54, 22]], leaf: [[30, 130, 50], [70, 186, 70], [140, 228, 110], [16, 70, 30]],
  flower: [[255, 80, 120], [255, 230, 90], [255, 255, 255]],
};
// ---------------------------------------------------------------- terrain (world x in game px → ground row on the 192-row canvas)
export const PORTAL_X = 1700, SLOPE = [1572, 1652], GROUND0 = 124, DROP = 26;
export function groundY(x) {
  let y = GROUND0 + 3 * Math.sin(x / 70) * clamp01((SLOPE[0] - 60 - x) / 200) * clamp01(x / 300);
  if (x > SLOPE[0]) { const u = clamp01((x - SLOPE[0]) / (SLOPE[1] - SLOPE[0])); y = GROUND0 + DROP * (u * u * (3 - 2 * u)); }
  return y;
}
// ---------------------------------------------------------------- hand-made small grids (palm crown, cloud, flower)
const PALM = [
  ".......aaaa.....aaa....",
  "....aabbbbba..aabbba...",
  "..abbbbbbbbbaabbbbbba..",
  ".abbbccaabbbbbbbccbbba.",
  "abbcc....abbbbba..ccbba",
  "abc.....abbcbbcba...cba",
  "ac.....abbc.a.cbba...ca",
  "a.....abc..a...cbba...a",
  ".....abc.........cba...",
  "....abc...........cba..",
  "....ac.............ca..",
  "....a...............a..",
];
const CLOUD = [
  "......wwww..........",
  "....wwwwwwww..wwww..",
  "..wwwwwwwwwwwwwwwwww",
  ".wwwwwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwwwwwww",
  "bbwwwwwwwwwwwwwwwwbb",
  ".bbbbbbwwwwwwbbbbbb.",
  "...oooobbbbbboooo...",
];
const FLOWER = [["..f..", ".fyf.", "..f..", "..g..", ".gg.."], ["..f..", ".fyf.", "..f..", "..g..", "..gg."]];
function grid(L, g, x0, y0, col, mir = false) {
  for (let j = 0; j < g.length; j++) for (let i = 0; i < g[j].length; i++) { const ch = g[j][mir ? g[j].length - 1 - i : i]; if (ch === ".") continue; const cc = col(ch); if (cc) L.px(x0 + i, y0 + j, cc); }
}
// ---------------------------------------------------------------- the zone frame at camera camX (world game px of the left edge)
let L = null;
/** draws the zone on the 540 × 960 canvas c. o: { camX, t, sonic: { x, poses, a }, portal(L, X, Y) } → returns screen data */
export function drawZone(c, o) {
  if (!L) L = new Canvas(ZW, ZH);
  const t = o.t, cam = o.camX;
  // sky bands (flat, with a dithered seam row between bands)
  for (let y = 0; y < ZH; y++) { let k = 0; while (k + 1 < Z.sky.length && Z.sky[k + 1][0] <= y) k++; const seam = k + 1 < Z.sky.length && Z.sky[k + 1][0] - y === 1; for (let x = 0; x < ZW; x++) L.px(x, y, seam && (x + y) % 2 ? Z.sky[k + 1][1] : Z.sky[k][1]); }
  // clouds (parallax 0.12, drifting)
  for (let i = -1; i < 6; i++) { const span = 70, base = Math.floor((cam * 0.12 + t * 4) / span), k = base + i, x = R(k * span - cam * 0.12 - t * 4 + rnd(k) * 30), y = 12 + R(rnd(k + 7) * 40);
    grid(L, CLOUD, x, y, (ch) => (ch === "w" ? Z.cloud : ch === "b" ? Z.cloudB : Z.cloudO)); }
  // far mountains (parallax 0.2)
  for (let x = 0; x < ZW; x++) { const wx = x + cam * 0.2, h = 18 + 14 * Math.abs(Math.sin(wx / 37)) + 8 * Math.sin(wx / 13 + 1); const top = R(112 - h);
    for (let y = top; y < 118; y++) { const d = y - top; L.px(x, y, d < 2 && h > 30 ? Z.snow : d < 5 ? Z.mtn[2] : (x + Math.floor(wx / 9)) % 7 === 0 && d > 6 ? Z.mtn[0] : Z.mtn[1]); } }
  // sea band with moving sparkle dashes
  for (let y = 116; y < 132; y++) for (let x = 0; x < ZW; x++) { const wx = Math.floor(x + cam * 0.25), sp = (wx * 7 + y * 13 + Math.floor(t * 6) * 5) % 37; L.px(x, y, y < 118 ? Z.sea3 : sp < 3 && y % 3 === 0 ? Z.sea3 : (y + Math.floor(wx / 6)) % 5 === 0 ? Z.sea2 : Z.sea); }
  // round striped hills (parallax 0.45) + a checkered loop on one of them
  const hp = cam * 0.45;
  for (let x = 0; x < ZW; x++) { const wx = x + hp, ph = ((wx % 150) + 150) % 150, bump = Math.max(0, Math.sqrt(Math.max(0, 1 - ((ph - 75) / 62) ** 2))) * 26 + Math.max(0, Math.sqrt(Math.max(0, 1 - ((((wx + 40) % 97 + 97) % 97 - 48) / 40) ** 2))) * 12, top = R(130 - bump);
    for (let y = top; y < 140; y++) { const d = y - top, stripe = Math.floor((y - top + 2) / 5) % 2; L.px(x, y, d === 0 ? Z.hillO : d < 3 ? Z.hill[2] : stripe ? Z.hill[0] : Z.hill[1]); } }
  { const lx = R(560 - hp + 0), ly = 92, r0 = 16, r1 = 21;   // the background loop (ours: a plain checkered ring on a hill)
    for (let y = ly - r1; y <= ly + r1; y++) for (let x = lx - r1; x <= lx + r1; x++) { if (x < 0 || x >= ZW) continue; const d = Math.hypot(x - lx, y - ly); if (d < r0 || d > r1 || y > ly + 12) continue; const a = Math.atan2(y - ly, x - lx); L.px(x, y, d > r1 - 1 || d < r0 + 1 ? Z.dirt[3] : (Math.floor((a + 4) * 3) + (d > (r0 + r1) / 2 ? 1 : 0)) % 2 ? Z.dirt[0] : Z.dirt[2]); } }
  // palms behind the ground (parallax 0.8) and in front (1.0)
  const palm = (wx, par, seed) => { const x = R(wx - cam * par), gy = R(groundY(wx)) - 1, hgt = 34 + R(rnd(seed) * 10); if (x < -30 || x > ZW + 30) return;
    for (let j = 0; j < hgt; j++) { const bend = R(Math.sin(j / hgt * 1.6) * 4), yy = gy - j; L.px(x + bend, yy, Math.floor(j / 3) % 2 ? Z.trunk[0] : Z.trunk[1]); L.px(x + bend + 1, yy, Z.trunk[2]); L.px(x + bend - 1, yy, Z.trunk[1]); }
    const sway = Math.sin(t * 2 + seed) > 0.6 ? 1 : 0, top = gy - hgt, bx = x + R(Math.sin(1.6) * 4);
    grid(L, PALM, bx - 11 + sway, top - 4, (ch) => (ch === "a" ? Z.leaf[3] : ch === "b" ? Z.leaf[1] : Z.leaf[2]));
    grid(L, PALM.map((r) => r), bx - 11 - sway, top - 2, (ch) => (ch === "b" ? Z.leaf[0] : null), true); };
  for (let k = Math.floor(cam / 230) - 1; k < Math.floor(cam / 230) + 3; k++) if (k >= 0) palm(k * 230 + 120 + rnd(k) * 60, 1.0, k);
  // ground: grass lip + checkered earth (8 × 8 checks, a light tick in each light check's corner)
  for (let x = 0; x < ZW; x++) { const wx = x + cam, gy = R(groundY(wx)), tuft = (Math.floor(wx / 3) * 7) % 5 === 0 ? 1 : 0;
    for (let y = gy - tuft; y < ZH; y++) { const d = y - gy; let col;
      if (d < 0) col = Z.grass[1]; else if (d === 0) col = Z.grass[2]; else if (d < 5) col = d === 4 ? Z.grassO : Z.grass[(d + Math.floor(wx / 4)) % 3 === 0 ? 0 : 1];
      else { const cx = Math.floor(wx / 8), cy = Math.floor((y - gy - 5) / 8), lit = (cx + cy) % 2 === 0, lx = ((wx % 8) + 8) % 8, ly = (y - gy - 5) % 8; col = lit ? (lx === 0 && ly < 2 || ly === 0 && lx < 2 ? Z.dirt[2] : Z.dirt[0]) : (ly === 7 ? Z.dirt[3] : Z.dirt[1]); }
      L.px(x, y, col); } }
  // flowers on the grass (2-frame sway at game cadence)
  for (let k = Math.floor(cam / 37) - 1; k < Math.floor(cam / 37) + 5; k++) { if (k < 0 || rnd(k * 3) < 0.45) continue; const wx = k * 37 + R(rnd(k) * 20), x = R(wx - cam), gy = R(groundY(wx)), fr = Math.floor(t * 4 + k) % 2, ci = Math.floor(rnd(k + 5) * 2);
    grid(L, FLOWER[fr], x - 2, gy - 5, (ch) => (ch === "f" ? Z.flower[ci === 0 ? 0 : 2] : ch === "y" ? Z.flower[1] : Z.grass[0])); }
  // the portal (drawn by the scene in game pixels) and the hero
  if (o.portal) o.portal(L, cam);
  let hero = null;
  if (o.sonic && o.sonic.a > 0) { const s = o.sonic, gy = groundY(s.x) + (s.dy ?? 0);
    // flat 1-row shadow under him
    for (let x = R(s.x - cam) - 9; x <= R(s.x - cam) + 10; x++) { const y = R(groundY(s.x)) + 1; if (x < 0 || x >= ZW) continue; const i = (y * ZW + x) * 3; if (s.a * 0.9 > bayer(x, y)) { L.d[i] *= 0.55; L.d[i + 1] *= 0.55; L.d[i + 2] *= 0.6; } }
    hero = drawSonic(L, R(s.x - cam), R(gy) + 1, 1, s.poses, { a: s.a }); }
  if (o.over) o.over(L, cam);
  // ×5 nearest onto the film grid
  const d = c.d, s = L.d;
  for (let y = 0; y < c.h; y++) { const sy = Math.floor(y / ZN), r0 = y * c.w * 3, s0 = sy * ZW * 3; for (let x = 0; x < c.w; x++) { const q = s0 + Math.floor(x / ZN) * 3, p = r0 + x * 3; d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2]; } }
  return { hero: hero ? { ...hero, x0: hero.x0 * ZN, y0: hero.y0 * ZN, N: ZN, box: hero.box && { x0: hero.box.x0 * ZN, y0: hero.box.y0 * ZN, x1: hero.box.x1 * ZN, y1: hero.box.y1 * ZN } } : null };
}
