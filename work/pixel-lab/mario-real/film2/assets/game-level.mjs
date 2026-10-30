// mario-real · game-level v2 (film2, 2026-10-29; replaces v1's shaded level): a flat side-scrolling level «in the spirit of»
// the 1985 game in the SAME blocky look as the Mario sprite — every tile is a hand-made 16 × 16 string grid of flat colours,
// rendered as exact N × N squares (N = B / 16, the shot's integer scale). Our own drawing of ground blocks, brick blocks,
// «?» blocks (with a used state), pipes, bushes, clouds and hills; not World 1-1 and not Nintendo tiles.
// Units: blocks (1 block = 0.775 m). cam = { x (block at screen x 270), gy (screen row of the ground top), B (px / block) }.
// opts.clip = { x0, y0, x1, y1 } limits drawing to a screen rect (the «game window» inset). Pure functions of (cam, t, opts).
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const GPAL = {
  sky: [104, 150, 252],
  // ground: earth orange, light top, dark seams
  e: [206, 92, 30], E: [252, 168, 96], k: [74, 26, 8],
  // brick
  b: [196, 74, 28], B: [244, 140, 80], m: [40, 12, 4],
  // ? block
  q: [244, 172, 16], Q: [255, 230, 140], d: [110, 54, 0],
  // used block
  u: [150, 92, 54], U: [196, 136, 92],
  // pipe
  g: [40, 160, 40], G: [150, 232, 100], n: [8, 56, 12],
  // bush / hill
  h: [52, 168, 52], H: [128, 220, 92], j: [14, 74, 24],
  // cloud
  w: [255, 255, 255], W: [176, 206, 255], c: [40, 72, 160],
  // coin
  y: [252, 200, 36], Y: [255, 246, 170], o: [130, 76, 0],
};
const GROUND = [
  "EEEEEEEEkEEEEEEk",
  "EeeeeeeekEeeeeek",
  "EeeeeeeekEeeeeek",
  "Eeeeeeeek.eeeeek".replace(".", "E"),
  "EeeeeeeekkEeeeek",
  "Eeeeeeeek.kkeeek".replace(".", "E"),
  "kkeeeeeek...kkkk".replace(/\./g, "E"),
  "EEkkeeeekEEEEEEk",
  "EeeekkkkkEeeeeek",
  "EeeeeeeekEeeeeek",
  "EeeeeeeekEeeeeek",
  "EeeeeeekEeeeeeek",
  "EeeeeeekEeeeeeek",
  "EeeeeekkEeeeeeek",
  "keeeekkEeeeeeekk",
  "kkkkkEEkkkkkkkkk",
];
const BRICK = [
  "mmmmmmmmmmmmmmmm",
  "BBBBBBBmBBBBBBBm",
  "bbbbbbbmbbbbbbbm",
  "bbbbbbbmbbbbbbbm",
  "mmmmmmmmmmmmmmmm",
  "BBBmBBBBBBBmBBBB",
  "bbbmbbbbbbbmbbbb",
  "bbbmbbbbbbbmbbbb",
  "mmmmmmmmmmmmmmmm",
  "BBBBBBBmBBBBBBBm",
  "bbbbbbbmbbbbbbbm",
  "bbbbbbbmbbbbbbbm",
  "mmmmmmmmmmmmmmmm",
  "BBBmBBBBBBBmBBBB",
  "bbbmbbbbbbbmbbbb",
  "bbbmbbbbbbbmbbbb",
];
const QBLOCK = [
  ".QQQQQQQQQQQQQQ.",
  "QqqqqqqqqqqqqqqD",
  "QqdqqqqqqqqqqdqD",
  "QqqqqQQQQQqqqqqD",
  "QqqqQQddQQQqqqqD",
  "QqqqQQdqqQQdqqqD",
  "QqqqqddqqQQdqqqD",
  "QqqqqqqqQQQdqqqD",
  "QqqqqqqQQddqqqqD",
  "QqqqqqqQQdqqqqqD",
  "QqqqqqqqddqqqqqD",
  "QqqqqqqQQqqqqqqD",
  "QqqqqqqQQdqqqqqD",
  "QqdqqqqqddqqqdqD",
  "QqqqqqqqqqqqqqqD",
  "DDDDDDDDDDDDDDDD",
].map((r) => r.replace(/D/g, "d"));
const USED = [
  ".UUUUUUUUUUUUUU.",
  "UuuuuuuuuuuuuuuU".replace(/U$/, "m"),
  "UumuuuuuuuuuumuM",
  "UuuuuuuuuuuuuuuM",
  "UuuuuuuuuuuuuuuM",
  "UuuuuuuuuuuuuuuM",
  "UuuuuuuuuuuuuuuM",
  "UuuuuuuuuuuuuuuM",
  "UuuuuuuuuuuuuuuM",
  "UuuuuuuuuuuuuuuM",
  "UuuuuuuuuuuuuuuM",
  "UuuuuuuuuuuuuuuM",
  "UuuuuuuuuuuuuuuM",
  "UumuuuuuuuuuumuM",
  "UuuuuuuuuuuuuuuM",
  "MMMMMMMMMMMMMMMM",
].map((r) => r.replace(/M/g, "m"));
// pipe: a 2-block-wide rim (32 × 14 sprite px) and a body column pattern (28 wide)
const PIPE_RIM_ROW = "nGGgggggggggggggggggggggggggggnn".slice(0, 32);
const PIPE_BODY_ROW = "..nGGggggggggggggggggggggggnn..".padEnd(32, ".");
const pipeCol = (i, rim) => { // colour index across the pipe width (light stripe left, dark right)
  const w = rim ? 32 : 28, o = rim ? 0 : 2, x = i - o; if (x < 0 || x >= w) return null;
  if (x === 0 || x === w - 1) return "n"; if (x === 1 || x === 4 || x === 5) return "G"; if (x >= w - 6 && x < w - 1) return x % 2 ? "n" : "g"; return "g";
};
void PIPE_RIM_ROW; void PIPE_BODY_ROW;

export { GPAL as GAME };
/** a canvas view that only writes inside clip */
export function clipView(c, clip) {
  if (!clip) return c; const o = Object.create(c);
  o.px = (x, y, col) => { if (x >= clip.x0 && x < clip.x1 && y >= clip.y0 && y < clip.y1) c.px(x, y, col); };
  return o;
}
const inClip = (clip, x, y) => !clip || (x >= clip.x0 && x < clip.x1 && y >= clip.y0 && y < clip.y1);
function P(c, x, y, col, clip) { if (x < 0 || y < 0 || x >= c.w || y >= c.h || !inClip(clip, x, y)) return; if (c.__fade !== undefined && !(c.__fade > bayer(x, y))) return; c.px(x, y, col); }
/** fill sprite cell (i, j) of a tile whose origin is (x0, y0) with cell size n (may be fractional while a block flies) */
function cell(c, x0, y0, n, i, j, col, clip) {
  const xa = Math.round(x0 + i * n), xb = Math.round(x0 + (i + 1) * n), ya = Math.round(y0 + j * n), yb = Math.round(y0 + (j + 1) * n);
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) P(c, x, y, col, clip);
}
/** draw a 16 × 16 grid tile with its top-left at (x0, y0) and block size B */
export function tile(c, grid, x0, y0, B, clip) {
  const n = B / 16; x0 = Math.round(x0); y0 = Math.round(y0);
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const ch = grid[j][i]; if (ch === ".") continue; cell(c, x0, y0, n, i, j, GPAL[ch], clip); }
}

/** default level (blocks): pipes, block rows, bushes; the film adds the portal and Mario itself */
export const LEVEL = {
  pipes: [[1, 3, 2]],
  bricks: [[6, 3], [8, 3], [13, 3], [15, 3]],
  qs: [[7, 3, "q1"], [14, 3, "q2"]],
  bushes: [[4, 3], [10, 2], [16, 3], [21, 2]],
  hills: [[-2, 5, 2], [9, 7, 3], [20, 5, 2], [28, 7, 3]],
  clouds: [[0.5, 6, 3], [6.5, 7, 2], [13, 6, 3], [19, 7, 2], [25, 6, 3]],
};

/** screen helpers */
export const gx = (cam, x) => 270 + (x - cam.x) * cam.B, gyy = (cam, y) => cam.gy - y * cam.B;

/** draw the level background + tiles. opts: { level, clip, bump: {id: k 0..1}, usedK: {id: 0..1}, coins: [{x, y, spin, a}] } */
export function drawLevel(c, cam, t, opts = {}) {
  const L = opts.level ?? LEVEL, clip = opts.clip, B = cam.B, n = B / 16;
  const X0 = clip ? clip.x0 : 0, X1 = clip ? clip.x1 : c.w, Y0 = clip ? clip.y0 : 0, Y1 = clip ? clip.y1 : c.h;
  // flat sky
  for (let y = Math.max(0, Y0); y < Math.min(c.h, Y1); y++) for (let x = Math.max(0, X0); x < Math.min(c.w, X1); x++) c.px(x, y, GPAL.sky);
  // hills (parallax 0.5): stepped mounds on the sprite grid, flat green, dark rim and two dark spots
  const gyR = Math.round(cam.gy);
  for (const [hx, w, hh] of L.hills) {
    const cx = 270 + (hx - cam.x * 0.5) * B * 0.62, ox = Math.round(cx) - Math.round(cx - Math.floor(cx / n) * n) * 0, rw = (w / 2) * 16, rh = hh * 16 * 0.62;
    for (let j = 0; j < Math.ceil(rh); j++) for (let i = -Math.ceil(rw); i < Math.ceil(rw); i++) {
      const u = (i + 0.5) / rw, v = (j + 0.5) / rh, q = u * u + v * v; if (q > 1) continue;
      const rim = ((i + 1.5) / rw) ** 2 + v * v > 1 || ((i - 0.5) / rw) ** 2 + v * v > 1 || u * u + ((j + 1.5) / rh) ** 2 > 1;
      const spot = (Math.abs(i - Math.round(rw * 0.3)) <= 0 && Math.abs(j - Math.round(rh * 0.45)) <= 1) || (Math.abs(i + Math.round(rw * 0.25)) <= 0 && Math.abs(j - Math.round(rh * 0.3)) <= 1);
      cell(c, ox, gyR - n, n, i, -j, rim || spot ? GPAL.j : GPAL.h, clip);
    }
  }
  // clouds (parallax 0.3): three-lobe puffs on the sprite grid
  for (const [cxw, cyb, w] of L.clouds) puff(c, 270 + (cxw - cam.x * 0.3) * B * 0.9, gyR - cyb * B * 0.62, n, w, clip, "cloud");
  // bushes on the ground line
  for (const [bx, w] of L.bushes) puff(c, gx(cam, bx + w / 2), gyR, n, w, clip, "bush");
  // ground: rows of ground blocks (top row flush with gy)
  for (let row = 0; row < 3; row++) { const ya = gyR + row * B; if (ya > Y1) break;
    const i0 = Math.floor(cam.x - 270 / B) - 1, i1 = Math.ceil(cam.x + 270 / B) + 1;
    for (let i = i0; i <= i1; i++) tile(c, GROUND, gx(cam, i), ya, B, clip); }
  // pipes
  for (const [a, b, h] of L.pipes) pipe(c, cam, a, b, h, clip);
  // bricks and ? blocks
  for (const [bx, by] of L.bricks) tile(c, BRICK, gx(cam, bx), gyy(cam, by + 1), B, clip);
  for (const [bx, by, id] of L.qs) { const k = opts.bump?.[id] ?? 0, lift = Math.round(Math.sin(Math.PI * clamp01(k)) * 4) * n, used = opts.usedK?.[id] ?? 0;
    qblock(c, gx(cam, bx), gyy(cam, by + 1) - lift, B, t, used, clip); }
  for (const cn of opts.coins ?? []) coin(c, gx(cam, cn.x), gyy(cam, cn.y), B, cn.spin, cn.a ?? 1, clip);
}
/** a puff (cloud or bush) w blocks wide, base row at y (screen), cell n */
function puff(c, cx, base, n, w, clip, kind) {
  const W = w * 16, lobes = [];
  const k = Math.max(2, Math.round(w * 1.3)); for (let i = 0; i < k; i++) lobes.push([((i + 0.5) / k - 0.5) * (W - 10), i % 2 ? 6.5 : 8.5]);
  const x0 = Math.round(cx - (W / 2) * n), cxs = W / 2, top = kind === "bush" ? 0 : 3;
  const inside = (i, j) => { if (kind === "cloud" && j > 3) return false; for (const [lx, r] of lobes) { if (Math.hypot(i + 0.5 - cxs - lx, j + 0.5 - (top + 0)) < r) return true; } return false; };
  for (let j = -12; j <= (kind === "cloud" ? 4 : 0); j++) for (let i = 0; i < W; i++) {
    const jj = kind === "bush" ? j - 0.5 : j; if (!inside(i, jj)) continue;
    const rim = !inside(i - 1, jj) || !inside(i + 1, jj) || !inside(i, jj - 1) || (kind === "cloud" && !inside(i, jj + 1));
    const col = kind === "bush" ? (rim ? GPAL.j : (!inside(i, jj - 2) ? GPAL.H : GPAL.h)) : (rim ? GPAL.c : (!inside(i, jj + 2) ? GPAL.W : GPAL.w));
    cell(c, x0, Math.round(base) - n, n, i, j, col, clip);
  }
}
/** a «?» block: bump lift is applied by the caller; used → brown through a cell dither */
function qblock(c, x0, y0, B, t, used, clip) {
  const n = B / 16; x0 = Math.round(x0); y0 = Math.round(y0);
  const glint = (Math.floor(t * 4) % 4) === 0 ? 0 : 1;           // the «?» stays; only a 1-cell glint row shifts (no flash)
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    const useU = used > 0 && used > bayer(i, j), ch = (useU ? USED : QBLOCK)[j][i]; if (ch === ".") continue;
    cell(c, x0, y0, n, i, j, GPAL[ch], clip); void glint;
  }
}
function pipe(c, cam, a, b, h, clip) {
  const B = cam.B, n = B / 16, xa = Math.round(gx(cam, a)), yTop = Math.round(gyy(cam, h)), gyR = Math.round(cam.gy), rimH = 7, rows = Math.round((gyR - yTop) / n);
  for (let j = 0; j < rows; j++) for (let i = 0; i < 32; i++) {
    const rim = j < rimH, ch = rim && (j === 0 || j === rimH - 1) ? (i < 32 ? "n" : null) : pipeCol(i, rim); if (!ch) continue;
    cell(c, xa, yTop, n, i, j, GPAL[ch], clip);
  }
}
/** a spinning coin (spin = phase in turns), centred at (x, y): its width in sprite cells follows |cos| */
export function coin(c, x, y, B, spin, a = 1, clip) {
  const n = B / 16, hw = Math.max(1, Math.round(Math.abs(Math.cos(spin * Math.PI * 2)) * 4)), hh = 7, x0 = Math.round(x - hw * n), y0 = Math.round(y - hh * n);
  for (let j = 0; j < 2 * hh; j++) for (let i = 0; i < 2 * hw; i++) {
    if (a < 1 && a <= bayer(i + 1, j)) continue;
    const corner = (j === 0 || j === 2 * hh - 1) && (i === 0 || i === 2 * hw - 1); if (corner && hw > 1) continue;
    const edge = i === 0 || i === 2 * hw - 1 || j === 0 || j === 2 * hh - 1, shine = hw > 1 && i === 1 && j > 2 && j < 2 * hh - 3;
    cell(c, x0, y0, n, i, j, edge ? GPAL.o : shine ? GPAL.Y : GPAL.y, clip);
  }
}
/** a brick block at (x0, y0), block size B (may be fractional while it flies out of the game window) */
export function drawBrick(c, x0, y0, B, clip) { tile(c, BRICK, x0, y0, B, clip); }
export function drawQ(c, x0, y0, B, t, used, clip) { qblock(c, x0, y0, B, t, used, clip); }
export const TILES = { GROUND, BRICK, QBLOCK, USED };
