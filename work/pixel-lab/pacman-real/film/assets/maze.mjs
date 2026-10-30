// pacman-real · maze (new, 2026-10-29, drawn for this film): HIS game world in the arcade spirit, our own layout (not the
// original maze). Tiles of 8 × 8 sprite cells, drawn at the sprite's integer scale N: a dark field, blue double-line walls
// that follow the corridors at 4 and 6 cells into the wall (rounded outer corners from a Euclidean cell distance), 2 × 2-cell
// dots, 8 × 8-cell big dots that flash through a 3-frame dither (never a one-frame blink), the ghost house with a pink door
// and a corridor that ends where the portal opens. Pure functions of (camera, t).
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

export const TILE = 8;
// corridors (tile rectangles [c0, r0, c1, r1] inclusive); everything else is wall
const CORR = [[1, 1, 22, 1], [1, 7, 19, 7], [1, 10, 22, 10], [1, 1, 1, 10], [8, 1, 8, 7], [17, 1, 17, 7], [5, 7, 5, 10], [12, 7, 12, 10], [22, 1, 22, 10]];
export const HOUSE = { c0: 11, r0: 3, c1: 14, r1: 4, door: [12, 13, 2] };
export const COLS = 25, ROWS = 13, ROW_MAIN = 7, PORTAL_COL = 19;
const BIG = [[1, 1], [1, 10], [22, 10], [22, 1], [5, 10]];
const open = new Uint8Array(COLS * ROWS);
for (const [c0, r0, c1, r1] of CORR) for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) open[r * COLS + c] = 1;
const house = (c, r) => c >= HOUSE.c0 && c <= HOUSE.c1 && r >= HOUSE.r0 && r <= HOUSE.r1;
export const isOpen = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && open[r * COLS + c] === 1;
// the cell distance field (cells, Euclidean, from the nearest open cell); open = corridors + the house interior
const CW = COLS * TILE, CH = ROWS * TILE, DIST = new Float32Array(CW * CH);
{ const op = (x, y) => { const c = Math.floor(x / TILE), r = Math.floor(y / TILE); return isOpen(c, r) || house(c, r); };
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    if (op(x, y)) { DIST[y * CW + x] = 0; continue; }
    let best = 99; for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= CW || Y >= CH) continue; if (op(X, Y)) best = Math.min(best, Math.hypot(dx, dy)); }
    DIST[y * CW + x] = best; } }
export const MZ = { bg: [6, 5, 16], wall: [52, 72, 255], wallHi: [120, 140, 255], dot: [255, 194, 168], door: [255, 160, 220], big: [255, 194, 168] };
/** which line (0 none, 1 outer, 2 inner) the wall cell (x, y) carries */
function wallLine(x, y) {
  if (x < 0 || y < 0 || x >= CW || y >= CH) { const d = 9; return d ? 0 : 0; }
  const d = DIST[y * CW + x]; if (d > 3.5 && d <= 4.5) return 1; if (d > 5.5 && d <= 6.5) return 2; return 0;
}
const isDoor = (x, y) => { const c = Math.floor(x / TILE), r = Math.floor(y / TILE); return r === HOUSE.door[2] && c >= HOUSE.door[0] && c <= HOUSE.door[1]; };

/** camera: { cx (tile column at screen x 270), cy (tile row at screen y 480), N } → screen of a tile coordinate */
export const tx = (cam, c) => 270 + (c - cam.cx) * TILE * cam.N, ty = (cam, r) => 480 + (r - cam.cy) * TILE * cam.N;
/** dot at tile (c, r) still there? eaten(c, r) → true when gone */
export function drawMaze(c, cam, t, o = {}) {
  const N = cam.N, eaten = o.eaten || (() => false), x0 = 270 - cam.cx * TILE * N, y0 = 480 - cam.cy * TILE * N;
  // field + walls at cell resolution
  const cx0 = Math.floor(-x0 / N), cx1 = Math.ceil((c.w - x0) / N), cy0 = Math.floor(-y0 / N), cy1 = Math.ceil((c.h - y0) / N);
  for (let cy = cy0; cy < cy1; cy++) for (let cx = cx0; cx < cx1; cx++) {
    let col = MZ.bg; const L = cx >= 0 && cy >= 0 && cx < CW && cy < CH ? wallLine(cx, cy) : (cy >= CH || cy < 0 || cx < 0 || cx >= CW ? 0 : 0);
    if (L) col = isDoor(cx, cy) ? (L === 1 ? MZ.door : MZ.bg) : MZ.wall;
    if (col === MZ.bg) continue;
    const X = Math.round(x0 + cx * N), Y = Math.round(y0 + cy * N);
    for (let y = Math.max(0, Y); y < Math.min(c.h, Y + N); y++) for (let x = Math.max(0, X); x < Math.min(c.w, X + N); x++) c.px(x, y, col);
  }
  // dots (2 × 2 cells at the tile centre) and big dots (8 × 8 cells, round), skipping the portal tile and the house
  const big = new Set(BIG.map(([cc, rr]) => cc + "," + rr));
  for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
    if (!isOpen(cc, r) || house(cc, r) || (r === ROW_MAIN && cc === PORTAL_COL) || eaten(cc, r)) continue;
    const X = Math.round(x0 + cc * TILE * N), Y = Math.round(y0 + r * TILE * N); if (X > c.w || Y > c.h || X + TILE * N < 0 || Y + TILE * N < 0) continue;
    const icon = o.icon ? o.icon(cc, r) : 0;
    if (big.has(cc + "," + r)) { const fl = 0.5 + 0.5 * Math.cos(t * Math.PI * 2 * 1.9), a = fl > 0.62 ? 1 : fl < 0.38 ? 0 : (fl - 0.38) / 0.24;
      const rows = ["..####..", ".######.", "########", "########", "########", "########", ".######.", "..####.."];
      rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#" && a > bayer(i, j)) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.px(X + i * N + x, Y + j * N + y, MZ.big); })); continue; }
    if (icon < 1) for (let j = 3; j < 5; j++) for (let i = 3; i < 5; i++) { if (icon > 0 && icon > bayer(i, j)) continue; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.px(X + i * N + x, Y + j * N + y, MZ.dot); }
    if (icon > 0) melonIcon(c, X + 4 * N, Y + 4 * N, Math.max(2, Math.round(N / 2)), icon);
  }
}
/** a small round watermelon icon (8 × 8 cells of size s), centre (x, y), presence a (cell dither) */
const MELON = ["..GGGG..", ".GgGgGG.", "GGgGGgGG", "gGGgGGgG", "GgGGgGGg", "GGgGGgGG", ".GgGGgG.", "..GGGG.."];
const MCOL = { G: [92, 184, 72], g: [28, 96, 40] };
export function melonIcon(c, x, y, s, a = 1) {
  const X = Math.round(x - 4 * s), Y = Math.round(y - 4 * s);
  MELON.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "." || a <= bayer(i + 1, j + 3)) return; for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) c.px(X + i * s + xx, Y + j * s + yy, MCOL[ch]); }));
  // a small light highlight cell
  if (a > bayer(2, 2)) for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) c.px(X + 2 * s + xx, Y + 1 * s + yy, [196, 240, 160]);
}
