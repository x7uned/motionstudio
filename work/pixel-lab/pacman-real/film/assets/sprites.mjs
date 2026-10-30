// pacman-real · sprites (new, 2026-10-29, drawn for this film): Pac-Man and the four ghosts as low-res GAME SPRITES in the
// arcade spirit, drawn by us from hand-made string grids (not the original sprites, not traced). Flat colours, hard square
// cells, no outline, no gradient, no anti-aliasing, no arcs: every frame is a char grid rendered as exact N × N squares at an
// integer scale N (nearest-neighbour on the 540 × 960 grid).
//   Pac-Man: a 13 × 13 cell body (diameter 13 = 1.7 m in our world) in a 15 × 13 slot; frames wide / half / closed facing
//   right, mirrored for left, transposed for up and down; a squashed 15 × 11 «gulp» frame.
//   Ghosts: 14 × 14 cells, two skirt frames, eyes that look right / left / up / down, frightened (blue, two skirts, white
//   flashing) and eyes-only.
// The mouth steps at game cadence (a new frame every 3 video frames; the change frame is a 50 % cell dither of the two
// frames). Pose / colour changes go through a 2–3 frame ordered (Bayer) dissolve on SPRITE cells, so the squares stay clean.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const PAC_H = 1.7, PAC_CELLS = 13, GHOST_CELLS = 14;
export const PAL = {
  Y: [255, 226, 26],                                        // Pac-Man
  W: [246, 246, 255], P: [36, 52, 232],                      // eye white, pupil
  F: [255, 196, 160], f: [255, 48, 48],                      // frightened face (peach) / flashing face (red)
  blue: [40, 56, 255], flash: [242, 242, 255],
  blinky: [255, 40, 36], pinky: [255, 150, 222], inky: [36, 236, 255], clyde: [255, 172, 64],
  sonic: [36, 92, 232],
};

// ---------------------------------------------------------------- Pac-Man (facing right; 13 × 13 inside a 15-wide slot)
const WIDE = [
  "....#####....",
  "..#########..",
  ".#########...",
  ".########....",
  "########.....",
  "#######......",
  "######.......",
  "#######......",
  "########.....",
  ".########....",
  ".#########...",
  "..#########..",
  "....#####....",
];
const HALF = [
  "....#####....",
  "..#########..",
  ".###########.",
  ".###########.",
  "###########..",
  "#########....",
  "#######......",
  "#########....",
  "###########..",
  ".###########.",
  ".###########.",
  "..#########..",
  "....#####....",
];
const SHUT = [
  "....#####....",
  "..#########..",
  ".###########.",
  ".###########.",
  "#############",
  "#############",
  "#############",
  "#############",
  "#############",
  ".###########.",
  ".###########.",
  "..#########..",
  "....#####....",
];
const GULP = [                                              // squashed: the swallow
  ".....#####.....",
  "...#########...",
  ".#############.",
  "###############",
  "###############",
  "###############",
  "###############",
  "###############",
  ".#############.",
  "...#########...",
  ".....#####.....",
];
const pad15 = (g) => g.map((r) => "." + r + ".");
const lift = (g, rows) => [...Array.from({ length: rows }, () => ".".repeat(g[0].length)), ...g];
const mirror = (g) => g.map((r) => [...r].reverse().join(""));
/** up: the mouth opens to the top (rotate the right-facing grid 90° counter-clockwise); down: clockwise */
const up = (g) => g[0].split("").map((_, r) => g.map((row) => row[row.length - 1 - r]).join(""));        // 90° counter-clockwise
const down = (g) => g[0].split("").map((_, r) => g.map((row, j) => g[g.length - 1 - j][r]).join(""));      // 90° clockwise
export const PAC = {};
for (const [k, g] of Object.entries({ wide: WIDE, half: HALF, shut: SHUT })) {
  PAC[k + "R"] = pad15(g); PAC[k + "L"] = pad15(mirror(g)); PAC[k + "U"] = pad15(up(g)); PAC[k + "D"] = pad15(down(g));
}
PAC.gulp = lift(GULP, 2);
for (const [k, g] of Object.entries(PAC)) { if (g.length !== 13 || g.some((r) => r.length !== 15)) throw new Error(`pac ${k}`); }
/** the mouth frame at film time t while chomping (wide → half → shut → half …, 3 video frames each); change frame = 50 % dither */
const MOUTH = ["wide", "half", "shut", "half"], MSTEP = 3;
export function mouthFrame(t, t0 = 0) {
  const f = Math.round((t - t0) * 30), i = Math.floor(f / MSTEP), ph = ((f % MSTEP) + MSTEP) % MSTEP, cur = MOUTH[((i % 4) + 4) % 4], prev = MOUTH[(((i - 1) % 4) + 4) % 4];
  return ph === 0 && cur !== prev ? { a: prev, b: cur, k: 0.5, idx: ((i % 4) + 4) % 4, change: true } : { a: cur, b: cur, k: 0, idx: ((i % 4) + 4) % 4, change: false };
}

// ---------------------------------------------------------------- ghosts (14 × 14; body B, skirt frames A / B)
const GBODY = [
  ".....####.....",
  "...########...",
  "..##########..",
  ".############.",
  ".############.",
  ".############.",
  "##############",
  "##############",
  "##############",
  "##############",
  "##############",
  "##############",
];
const SKIRT = { a: ["##.###..###.##", "#...##..##...#"], b: ["####.####.####", ".##...##...##."] };
const EYE = [".WW.", "WWWW", "WWWW", "WWWW", ".WW."];
const EYE_ANGRY = [["W...", "WWW.", "WWWW", "WWWW", ".WW."], ["...W", ".WWW", "WWWW", "WWWW", ".WW."]];   // brows slanting down to the middle
/** eye placement per look: [sclera col, row] ×2 and the pupil offset inside the sclera */
const LOOK = { r: { s: [[3, 3], [9, 3]], p: [2, 2] }, l: { s: [[1, 3], [7, 3]], p: [0, 2] }, u: { s: [[2, 2], [8, 2]], p: [1, 0] }, d: { s: [[2, 4], [8, 4]], p: [1, 3] } };
const FRIGHT_FACE = { 5: "....FF..FF....", 6: "....FF..FF....", 9: "...FF..FF..FF.", 10: ".FF..FF..FF..." };
/** a ghost grid (14 × 14 chars): mode "normal" | "blue" | "flash" | "eyes"; skirt "a" | "b"; look r/l/u/d. Chars: # body, W, P, F */
export function ghostGrid(mode, skirt, look, angry = false) {
  const g = [...GBODY, ...SKIRT[skirt]].map((r) => [...r]);
  if (mode === "eyes") for (const r of g) r.fill(".");
  if (mode === "blue" || mode === "flash") { for (const [j, row] of Object.entries(FRIGHT_FACE)) [...row].forEach((ch, i) => { if (ch === "F") g[j][i] = "F"; }); return g.map((r) => r.join("")); }
  const L = LOOK[look] || LOOK.r;
  L.s.forEach(([sx, sy], e) => (angry ? EYE_ANGRY[e] : EYE).forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "W") g[sy + j][sx + i] = "W"; })));
  for (const [sx, sy] of L.s) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) g[sy + L.p[1] + j][sx + L.p[0] + i] = "P";
  return g.map((r) => r.join(""));
}
/** skirt frame at time t (the game alternates the skirt every ~8 video frames; the change frame is a 50 % cell dither) */
export function skirtFrame(t, seed = 0) {
  const f = Math.round(t * 30) + seed * 3, i = Math.floor(f / 8), ph = ((f % 8) + 8) % 8, cur = i % 2 ? "b" : "a", prev = i % 2 ? "a" : "b";
  return ph === 0 ? { a: prev, b: cur, k: 0.5 } : { a: cur, b: cur, k: 0 };
}

// ---------------------------------------------------------------- a blue spiky runner silhouette (our own, no face; 18 × 20)
export const SPIKY = [
  "........#####.....",
  "....##########....",
  "..#############...",
  "##############....",
  "..##############..",
  "#################.",
  "...###############",
  "..##############..",
  "#############.....",
  "...##########.....",
  ".....########.....",
  "......#######.....",
  ".....#########....",
  "....###########...",
  "....####..#####...",
  "....###....####...",
  "...####.....###...",
  "..#####.....####..",
  ".######....######.",
  ".######....######.",
];

// ---------------------------------------------------------------- composite + draw
/** cell-dither choice between grids: a list [[grid, weight], …] (two strongest used) → one char grid */
function blend(list, salt = 0) {
  const w = list.filter(([, x]) => x > 0.001).sort((p, q) => q[1] - p[1]);
  if (w.length === 1 || w[1] === undefined) return w[0][0];
  const [A, wa] = w[0], [B, wb] = w[1], k = wb / (wa + wb), H = Math.max(A.length, B.length), Wd = Math.max(A[0].length, B[0].length), out = [];
  for (let j = 0; j < H; j++) { let row = ""; for (let i = 0; i < Wd; i++) row += bayer(i + salt, j + 2 * salt) < k ? (B[j]?.[i] ?? ".") : (A[j]?.[i] ?? "."); out.push(row); }
  return out;
}
/** draw a char grid at (x0, y0) with cell size N; colour(ch) → rgb | null; a = presence (cell dither); veil: blend toward rgb */
export function drawGrid(c, G, x0, y0, N, colour, o = {}) {
  const a = o.a ?? 1; let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
  for (let j = 0; j < G.length; j++) for (let i = 0; i < G[j].length; i++) {
    const ch = G[j][i]; if (ch === ".") continue;
    if (a < 1 && a <= bayer(i + 2, j + 1)) continue;
    const col = colour(ch); if (!col) continue;
    const X = x0 + i * N, Y = y0 + j * N;
    if (o.veil !== undefined) { const k = o.veil; for (let y = Math.max(0, Y); y < Math.min(c.h, Y + N); y++) for (let x = Math.max(0, X); x < Math.min(c.w, X + N); x++) { const q = (y * c.w + x) * 3; c.d[q] += (col[0] - c.d[q]) * k; c.d[q + 1] += (col[1] - c.d[q + 1]) * k; c.d[q + 2] += (col[2] - c.d[q + 2]) * k; } }
    else for (let y = Y; y < Y + N; y++) for (let x = X; x < X + N; x++) c.px(x, y, col);
    bx0 = Math.min(bx0, X); by0 = Math.min(by0, Y); bx1 = Math.max(bx1, X + N); by1 = Math.max(by1, Y + N);
  }
  return bx1 > bx0 ? { x0: bx0, y0: by0, x1: bx1, y1: by1 } : null;
}

/**
 * Pac-Man with the bottom of his body on fy and the slot centre on fx, integer scale N.
 * st: { dir: "R"|"L"|"U"|"D" (or dirK = [[dirA, w], [dirB, w]] for a turn dither), chomp (0..1: mouth cycles at game cadence;
 *       0 = rest frame `rest`), rest ("half"), gulp (0..1 squash weight), t0 (cycle phase) }
 * o: { a (presence), veil, ghost (flat rgb) }. Returns { box, x0, y0, N, s (px per metre) }.
 */
/** mouth frame from a continuous step phase: ph = steps now, pp = steps one video frame ago (a new step → one 50 % dither frame) */
export function mouthAt(ph, pp) {
  const i = Math.floor(ph), j = Math.floor(pp), cur = MOUTH[((i % 4) + 4) % 4], prev = MOUTH[((j % 4) + 4) % 4];
  return i !== j && cur !== prev ? { a: prev, b: cur, k: 0.5, change: true } : { a: cur, b: cur, k: 0, change: false };
}
export function pacGrid(t, st) {
  const dir = st.dir ?? "R", m = st.ph !== undefined ? mouthAt(st.ph, st.pp ?? st.ph) : mouthFrame(t, st.t0 ?? 0), ch = clamp01(st.chomp ?? 1);
  const mouthG = (d) => { const cyc = m.k > 0 ? blend([[PAC[m.a + d], 1 - m.k], [PAC[m.b + d], m.k]], 1) : PAC[m.a + d], rest = PAC[(st.rest ?? "half") + d];
    return ch >= 1 ? cyc : ch <= 0 ? rest : blend([[cyc, ch], [rest, 1 - ch]], 2); };
  let G = st.dirK ? blend(st.dirK.map(([d, w]) => [mouthG(d), w]), 3) : mouthG(dir);
  const gk = clamp01(st.gulp ?? 0); if (gk > 0) G = gk >= 1 ? PAC.gulp : blend([[G, 1 - gk], [PAC.gulp, gk]], 4);
  return G;
}
export function drawPac(c, fx, fy, N, t, st = {}, o = {}) {
  N = Math.max(1, Math.round(N));
  const G = o.grid ?? pacGrid(t, st), x0 = Math.round(fx) - Math.round(7.5 * N), y0 = Math.round(fy) - 13 * N;
  const box = drawGrid(c, G, x0, y0, N, (ch) => o.ghost ?? PAL.Y, o);
  return { box, x0, y0, N, s: (13 * N) / PAC_H, cols: 15, rows: 13 };
}
/**
 * A ghost with the bottom of its skirt on fy, centre fx, scale N. name: blinky | pinky | inky | clyde.
 * st: { look r/l/u/d (or lookK [[a, w], [b, w]]), blue (0..1 → frightened), flash (0..1 → white), eyes (0..1 → eyes only), seed }
 */
export function ghostGridAt(t, st = {}) {
  const sk = skirtFrame(t, st.seed ?? 0), mk = (mode, look, ang = false) => (sk.k > 0 ? blend([[ghostGrid(mode, sk.a, look, ang), 0.5], [ghostGrid(mode, sk.b, look, ang), 0.5]], 5) : ghostGrid(mode, sk.a, look, ang));
  let normal = st.lookK ? blend(st.lookK.map(([l, w]) => [mk("normal", l), w]), 6) : mk("normal", st.look ?? "r");
  const ak = clamp01(st.angry ?? 0); if (ak > 0) normal = ak >= 1 ? mk("normal", st.look ?? "r", true) : blend([[normal, 1 - ak], [mk("normal", st.look ?? "r", true), ak]], 10);
  const bk = clamp01(st.blue ?? 0), fk = clamp01(st.flash ?? 0), ek = clamp01(st.eyes ?? 0);
  // colour modes are encoded in the grid chars: # body, B frightened body, X flashing body, F face, f flashing face
  const blue = mk("blue").map((r) => r.replace(/#/g, "B")), flash = mk("flash").map((r) => r.replace(/#/g, "X").replace(/F/g, "f"));
  let G = normal;
  if (bk > 0) G = bk >= 1 ? blue : blend([[normal, 1 - bk], [blue, bk]], 7);
  if (fk > 0 && bk > 0) G = blend([[G, 1 - fk], [flash, fk]], 8);
  if (ek > 0) G = ek >= 1 ? mk("eyes", st.look ?? "r") : blend([[G, 1 - ek], [mk("eyes", st.look ?? "r"), ek]], 9);
  return G;
}
export function drawGhost(c, name, fx, fy, N, t, st = {}, o = {}) {
  N = Math.max(1, Math.round(N));
  const G = o.grid ?? ghostGridAt(t, st), x0 = Math.round(fx) - 7 * N, y0 = Math.round(fy) - 14 * N, body = PAL[name];
  const colour = (ch) => o.ghost ?? (ch === "#" ? body : ch === "B" ? PAL.blue : ch === "X" ? PAL.flash : PAL[ch]);
  const box = drawGrid(c, G, x0, y0, N, colour, o);
  return { box, x0, y0, N, cols: 14, rows: 14 };
}
/** the blue spiky silhouette (flat, one colour), bottom-centre (fx, fy) */
export function drawSpiky(c, fx, fy, N, o = {}) {
  N = Math.max(1, Math.round(N)); const x0 = Math.round(fx) - 9 * N, y0 = Math.round(fy) - SPIKY.length * N;
  return drawGrid(c, SPIKY, x0, y0, N, () => o.col ?? PAL.sonic, o);
}
/** a flat dark shadow under a sprite: `rows` grid rows tall (1–2 cells of N), dithered ends; k = presence, wc = width in cells */
export function spriteShadow(c, fx, fy, N, k = 1, wc = 11, rows = 1) {
  if (k <= 0.02) return; N = Math.max(1, Math.round(N));
  const half = Math.round((wc / 2) * N), y0 = Math.round(fy) - Math.ceil(N / 3), h = Math.max(2, Math.round(N * 0.6 * rows)), X = Math.round(fx);
  for (let y = y0; y < y0 + h; y++) for (let x = X - half - N; x < X + half + N; x++) {
    if (x < 0 || y < 0 || x >= c.w || y >= c.h) continue;
    const edge = x < X - half || x >= X + half; let p = k * (edge ? 0.45 : 1); if (p < 1 && p <= bayer(x, y)) continue;
    const i = (y * c.w + x) * 3; c.d[i] = c.d[i] * 0.45 + 16; c.d[i + 1] = c.d[i + 1] * 0.45 + 12; c.d[i + 2] = c.d[i + 2] * 0.45 + 30;
  }
}

// ---------------------------------------------------------------- catalog contract (the lead may port these after QA)
export const pacmanSprite = {
  kind: "chomper-sprite", covers: ["pac-man-like hero", "chomping sprite", "arcade hero sprite"], source: "pacman-real/film (new, 2026-10-29)",
  desc: "13×13 flat yellow chomping sprite (wide / half / shut, 4 directions, gulp), integer scale", hw: 7.5, hh: 13, start: "half mouth, facing right",
  states: { idle: [0.1, "half mouth"], chomp: [0.1, "mouth cycles at game cadence", "chomp"], gulp: [0.08, "squash: swallows", "gulp"] },
  base: { chomp: 0, gulp: 0 }, st: { idle: { chomp: 0, gulp: 0 }, chomp: { chomp: 1, gulp: 0 }, gulp: { gulp: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) { const r = drawPac(c, cx, cy + 6.5 * z, z, t, { ...s.v, dir: s.dir ?? "R" }, { a: s.a }); return { box: r.box, pt: [cx, cy] }; },
};
export const ghostSprite = {
  kind: "arcade-ghost-sprite", covers: ["ghost", "arcade ghost", "chaser sprite"], source: "pacman-real/film (new, 2026-10-29)",
  desc: "14×14 flat ghost sprite: two skirts, eyes look r/l/u/d, frightened blue, white flash, eyes only; red/pink/cyan/orange", hw: 7, hh: 14, start: "red, looks right",
  states: { idle: [0.1, "skirt flutters"], blue: [0.09, "frightened blue", "hum"], flash: [0.09, "white flash"], eyes: [0.09, "eyes only"] },
  base: { blue: 0, flash: 0, eyes: 0 }, st: { idle: { blue: 0, flash: 0, eyes: 0 }, blue: { blue: 1 }, flash: { flash: 1 }, eyes: { eyes: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) { const r = drawGhost(c, s.name ?? "blinky", cx, cy + 7 * z, z, t, { ...s.v, look: s.look ?? "r" }, { a: s.a }); return { box: r.box, pt: [cx, cy] }; },
};
