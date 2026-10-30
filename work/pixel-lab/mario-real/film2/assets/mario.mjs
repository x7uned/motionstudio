// mario-real · mario v2 (new, 2026-10-29, drawn for film2 — replaces v1's round drawing completely): the plumber hero as a
// real low-res GAME SPRITE in the NES spirit, drawn by us (not Nintendo's sprite, no letter or logo on the cap). Big Mario is
// 16 × 32 sprite pixels (= two 16 × 16 game blocks = 1.55 m), three flat colours + transparency: red (cap, overalls), olive
// (hair, moustache, shirt, shoes), skin orange (face, hands, buttons). No outline, no gradient, no dither inside, no AA, no
// circles: every pose is a hand-made string grid rendered as exact N × N squares (integer scale N on the 540 × 960 grid).
// Pose changes and turns go through a 2–3 frame ordered (Bayer) dissolve on SPRITE cells (each cell is wholly one pose or the
// other, so the squares stay clean). The run cycle steps at the game's cadence: a new frame every 5 video frames, the change
// frame is a 50 % cell dither of the two frames. Catalog contract: kind/covers/desc/hw/hh/start/states/base/st/linear/draw.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

export const H = 1.55, SW = 16, SH = 32;
export const PAL = { R: [228, 40, 16], O: [136, 116, 22], S: [255, 164, 68] };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------- the pose grids (facing right; row 31 = the soles)
const HEAD = [
  "......RRRRR.....",
  "....RRRRRRRRR...",
  "....RRRRRRRRRRRR",
  "....OOOSSSOS....",
  "...OSOSSSSOSSS..",
  "...OSOOSSSSOSSSS",
  "...OOSSSSSOOOOO.",
  "....OSSSSSSOOOO.",
  ".....SSSSSSSS...",
  ".......SSSS.....",
];
const IDLE = [
  ...HEAD,
  "......OOROO.....",
  "....OOOORROOO...",
  "...OOOOORRROOOO.",
  "..OOOOOORSRRSOOO",
  "..OOOOORRRRRROOO",
  "..OOOORRRRRRRROO",
  "..SSSORRRRRRRSSS",
  "..SSSRRRRRRRRSSS",
  "..SSRRRRRRRRRRSS",
  "....RRRRRRRRRR..",
  "....RRRRRRRRRR..",
  "....RRRR..RRRR..",
  "....RRRR..RRRR..",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "..OOOO.....OOOO.",
  ".OOOOO.....OOOOO",
  "OOOOOO.....OOOOO",
];
// run 1: long stride, front arm forward, back hand behind
const RUN1 = [
  ...HEAD,
  "......OOROO.....",
  "....OOOORROOO...",
  "...OOOOORRROOOSS",
  "..OOOOOORSRRSOSS",
  ".SSOOOORRRRRRR..",
  ".SSSOORRRRRRRR..",
  "..S..RRRRRRRRR..",
  ".....RRRRRRRRRR.",
  "....RRRRRRRRRRR.",
  "...RRRRRRR.RRRR.",
  "...RRRRRR...RRRR",
  "..RRRRRR....RRRR",
  "..RRRRR.....RRRR",
  ".RRRRR......RRRR",
  ".RRRR.......RRRR",
  "RRRR........RRRR",
  "RRR.........RRRR",
  "RRR.........RRRR",
  "RRR.........RRRR",
  "OOOO.......OOOOO",
  "OOOO........OOOO",
  "OOO.........OOOO",
];
// run 2: legs passing, arms close to the body
const RUN2 = [
  ...HEAD,
  "......OOROO.....",
  "....OOOORROOO...",
  "...OOOOORRROO...",
  "...OOOOORSRSO...",
  "...OOOORRRRRR...",
  "...SSORRRRRRS...",
  "...SSSRRRRRSS...",
  "....SRRRRRRRR...",
  "....RRRRRRRRR...",
  "....RRRRRRRRR...",
  ".....RRRRRRRR...",
  ".....RRRRRRRR...",
  "....RRRRRRRRR...",
  "...RRRR.RRRRR...",
  "..RRRR..RRRR....",
  ".OOOO...RRRR....",
  ".OOOO...RRRR....",
  "..OOO...RRRR....",
  "........RRRR....",
  ".......OOOOOO...",
  ".......OOOOOOO..",
  ".......OOOOOOO..",
];
// run 3: short stride
const RUN3 = [
  ...HEAD,
  "......OOROO.....",
  "....OOOORROOO...",
  "...OOOOORRROOO..",
  "..SOOOOORSRSOSS.",
  "..SSOOORRRRRRSS.",
  "..SSORRRRRRRRR..",
  "....RRRRRRRRRR..",
  "....RRRRRRRRRR..",
  "....RRRRRRRRRR..",
  "....RRRRRRRRRR..",
  "....RRRRR.RRRR..",
  "...RRRRR..RRRR..",
  "...RRRR....RRRR.",
  "..RRRR.....RRRR.",
  "..RRRR.....RRRR.",
  ".RRRR......RRRR.",
  ".RRR.......RRRR.",
  ".RRR.......RRRR.",
  "RRR........RRRR.",
  "OOOO......OOOOO.",
  "OOOOO.....OOOOOO",
  "OOOO......OOOOOO",
];
// skid: braking, leans back against the motion, arms out front
const SKID = [
  "........RRRRR...",
  "......RRRRRRRRR.",
  ".....RRRRRRRRRRR",
  ".....OOOSSSOS...",
  "....OSOSSSSOSSS.",
  "....OSOOSSSSOSSS",
  "....OOSSSSSOOOOO",
  ".....OSSSSSSOOOO",
  "......SSSSSSSS..",
  "........SSSS....",
  ".......OORO.....",
  ".....OOOORROOSS.",
  "....OOOOORRROSSS",
  "...OOOOOORSRRSSS",
  "...OOOOORRRRRR..",
  "...OOOORRRRRRR..",
  "....RRRRRRRRRR..",
  "....RRRRRRRRRR..",
  "....RRRRRRRRRR..",
  "....RRRRRRRRRR..",
  "....RRRRR.RRRRR.",
  "...RRRRR...RRRR.",
  "...RRRR.....RRRR",
  "..RRRR......RRRR",
  "..RRRR.......RRR",
  ".RRRR........RRR",
  ".RRR.........RRR",
  ".RRR.........RRR",
  "OOOO........OOOO",
  "OOOOO.......OOOO",
  "OOOOOO......OOOO",
  "................",
];
// jump: front fist up, front knee up, back leg reaching down
const JUMP = [
  ".............SS.",
  "......RRRRR..SSS",
  "....RRRRRRRRROSS",
  "....RRRRRRRRRROO",
  "....OOOSSSOS..OO",
  "...OSOSSSSOSSSOO",
  "...OSOOSSSSOSSOO",
  "...OOSSSSSOOOOOO",
  "....OSSSSSSOOOOO",
  ".....SSSSSSSSOO.",
  "......OOROOOOO..",
  "....OOOORROOOO..",
  "...OOOOORRROOO..",
  "..OOOOOORSRRSR..",
  ".SOOOOORRRRRRRR.",
  "SSOOOORRRRRRRRRR",
  "SSS.RRRRRRRRRRRR",
  "SS.RRRRRRRRRRRRR",
  "..RRRRRRRRR.RRRR",
  ".RRRRRRRRR...OOO",
  ".RRRRRRR.....OOO",
  "RRRRRR.......OOO",
  "RRRR..........OO",
  "RRR.............",
  "OOO.............",
  "OOOO............",
  "OOO.............",
  "................",
  "................",
  "................",
  "................",
  "................",
];
// duck: knees bent before the take-off, arms swung back (22 rows tall)
const DUCK = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......RRRRR.....",
  "....RRRRRRRRR...",
  "....RRRRRRRRRRRR",
  "....OOOSSSOS....",
  "...OSOSSSSOSSS..",
  "...OSOOSSSSOSSSS",
  "...OOSSSSSOOOOO.",
  "....OSSSSSSOOOO.",
  "..OOOSSSSSSSS...",
  ".OOOOOOORROO....",
  "SSOOOOOORRROO...",
  "SSOOOOORSRRSOO..",
  "SS.OORRRRRRRRO..",
  "...RRRRRRRRRRRR.",
  "..RRRRRRRRRRRRRR",
  "..RRRRRRRRRRRRRR",
  "..RRRRR...RRRRRR",
  "..RRRR.....RRRR.",
  "..RRRR.....RRRR.",
  "..RRRR.....RRRR.",
  "..RRRR.....RRRR.",
  "..OOOO.....OOOO.",
  ".OOOOO.....OOOOO",
  "OOOOOO.....OOOOO",
  "................",
].map((r, i, a) => i === a.length - 1 ? r : r);
// win / proud: both feet down, front fist up, back hand on the hip
const WIN = [
  ".............SS.",
  "......RRRRR..SSS",
  "....RRRRRRRRROSS",
  "....RRRRRRRRRROO",
  "....OOOSSSOS..OO",
  "...OSOSSSSOSSSOO",
  "...OSOOSSSSOSSOO",
  "...OOSSSSSOOOOOO",
  "....OSSSSSSOOOOO",
  ".....SSSSSSSSOO.",
  ".......SSSS.OO..",
  "......OOROOOO...",
  "....OOOORROOO...",
  "...OOOOORRRO....",
  "..OOOOOORSRRS...",
  "..OOSSRRRRRRR...",
  "..OSSSRRRRRRR...",
  "...SSRRRRRRRR...",
  "....RRRRRRRRRR..",
  "....RRRRRRRRRR..",
  "....RRRRRRRRRR..",
  "....RRRR..RRRR..",
  "....RRRR..RRRR..",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "..OOOO.....OOOO.",
  ".OOOOO.....OOOOO",
  "OOOOOO.....OOOOO",
];
// point: front arm reaching forward and down (at his knees)
const POINT = [
  ...HEAD,
  "......OOROO.....",
  "....OOOORROOO...",
  "...OOOOORRROOOO.",
  "..OOOOOORSRRSOOO",
  "..OOOOORRRRRR.OO",
  "..OOOORRRRRRR.OO",
  "..SSSORRRRRRR.SS",
  "..SSSRRRRRRRR.SS",
  "..SSRRRRRRRRR..S",
  "....RRRRRRRRR..S",
  "....RRRRRRRRRR..",
  "....RRRR..RRRR..",
  "....RRRR..RRRR..",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "...RRRR....RRRR.",
  "..OOOO.....OOOO.",
  ".OOOOO.....OOOOO",
  "OOOOOO.....OOOOO",
];
/** look-up: idle with the head (rows 0–9) one sprite pixel higher and the eye one pixel up */
const LOOK = (() => {
  const g = IDLE.map((r) => r.split(""));
  for (let j = 0; j < 10; j++) g[j] = (IDLE[j + 1] ?? "").split("");
  g[9] = ".....SSSSSSSS...".split(""); g[10 - 1] = g[9];
  g[0] = "......RRRRR.....".split(""); g[1] = "....RRRRRRRRR...".split(""); g[2] = "....RRRRRRRRRRRR".split("");
  g[3] = "....OOOSSSOO....".split(""); g[4] = "...OSOSSSSSSSS..".split("");
  g[5] = "...OSOOSSSSSSSSS".split(""); g[6] = "...OOSSSSSOOOOO.".split(""); g[7] = "....OSSSSSSOOOO.".split(""); g[8] = ".....SSSSSSSS...".split("");
  g[9] = ".......SSSS.....".split("");
  return g.map((r) => r.join(""));
})();
/** land: one squash frame — head and torso sink three rows, the knees bend out */
const LAND = [
  "................", "................", "................",
  ...IDLE.slice(0, 20),
  "....RRRRRRRRRR..",
  "...RRRRR..RRRRR.",
  "..RRRRR....RRRRR",
  "..RRRR......RRRR",
  "..RRRR......RRRR",
  "..RRRR......RRRR",
  "..OOOO......OOOO",
  ".OOOOO......OOOOO".slice(0, 16),
  "OOOOOO......OOOO",
].slice(0, 32);

export const POSES = { idle: IDLE, run1: RUN1, run2: RUN2, run3: RUN3, skid: SKID, jump: JUMP, duck: DUCK, win: WIN, look: LOOK, point: POINT, land: LAND };
for (const [k, g] of Object.entries(POSES)) { if (g.length !== SH) throw new Error(`pose ${k}: ${g.length} rows`); g.forEach((r, j) => { if (r.length !== SW) throw new Error(`pose ${k} row ${j}: ${r.length} cols «${r}»`); }); }

// ---------------------------------------------------------------- run cadence (game-like: a new frame every 5 video frames)
const RUN_SEQ = ["run1", "run2", "run3", "run2"].slice(0, 3), STEP = 5;
/** run frame at film time t: { a, b, k } (k = 0.5 on the change frame: a cell dither of the old and the new frame) */
export function runFrame(t, t0 = 0) {
  const f = Math.round((t - t0) * 30), i = Math.floor(f / STEP), ph = ((f % STEP) + STEP) % STEP, cur = RUN_SEQ[((i % 3) + 3) % 3], prev = RUN_SEQ[(((i - 1) % 3) + 3) % 3];
  return ph === 0 ? { a: prev, b: cur, k: 0.5, idx: ((i % 3) + 3) % 3, change: true } : { a: cur, b: cur, k: 0, idx: ((i % 3) + 3) % 3, change: false };
}

// ---------------------------------------------------------------- composite + draw
const cellB = (i, j) => bayer(i, j), cellB2 = (i, j) => bayer(i + 2, j + 1);
/** the pose weights in v → a composite 16 × 32 char grid (facing right) for time t */
export const POSE_KEYS = ["idle", "run", "skid", "jump", "duck", "win", "look", "point", "land"];
function poseGrid(name, t) {
  if (name !== "run") return { a: POSES[name], b: POSES[name], k: 0 };
  const r = runFrame(t); return { a: POSES[r.a], b: POSES[r.b], k: r.k };
}
function composite(v, t) {
  let w = POSE_KEYS.map((k) => [k, clamp01(v[k] ?? 0)]).filter(([, x]) => x > 0.001).sort((p, q) => q[1] - p[1]);
  if (!w.length) w = [["idle", 1]];
  const A = poseGrid(w[0][0], t), B = w[1] ? poseGrid(w[1][0], t) : null, kB = B ? w[1][1] / (w[0][1] + w[1][1]) : 0;
  const out = [];
  for (let j = 0; j < SH; j++) { let row = ""; for (let i = 0; i < SW; i++) {
    const pick = (G) => (G.k > 0 && cellB(i + 1, j + 3) < G.k ? G.b : G.a)[j][i];
    row += B && cellB(i, j) < kB ? pick(B) : pick(A); } out.push(row); }
  return out;
}
/**
 * Draw the sprite with its sole centre at (fx, fy) at integer scale N (grid px per sprite px).
 * v: pose weights (POSE_KEYS, 0..1; the two strongest are cell-dithered by their ratio).
 * o: { face (1 = facing right, 0 = left; between = cell-dithered turn), a (presence, cell dither), ghost (rgb: flat silhouette),
 *      veil (0..1: a flat translucent after-image — every pixel of the silhouette blends toward `ghost` by the same amount),
 *      grid (an explicit 16×32 grid instead of v) }
 * Returns { box, x0, y0, N, knee, kneeF, hand, top, s (px per metre) }.
 */
export function drawSprite(c, fx, fy, N, t, v, o = {}) {
  N = Math.max(1, Math.round(N));
  const G = o.grid ?? composite(v, t), face = o.face ?? 1, a = o.a ?? 1, x0 = Math.round(fx) - 8 * N, y0 = Math.round(fy) - SH * N;
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
  for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
    const right = face >= 1 || (face > 0 && cellB2(i, j) < face);
    const ch = right ? G[j][i] : G[j][SW - 1 - i];
    if (ch === "." || (a < 1 && a <= cellB(i + 2, j + 2))) continue;
    const col = o.ghost ?? PAL[ch], X = x0 + i * N, Y = y0 + j * N;
    if (o.veil !== undefined) { const k = o.veil; for (let y = Math.max(0, Y); y < Math.min(c.h, Y + N); y++) for (let x = Math.max(0, X); x < Math.min(c.w, X + N); x++) { const q = (y * c.w + x) * 3; c.d[q] += (col[0] - c.d[q]) * k; c.d[q + 1] += (col[1] - c.d[q + 1]) * k; c.d[q + 2] += (col[2] - c.d[q + 2]) * k; } }
    else for (let y = Y; y < Y + N; y++) for (let x = X; x < X + N; x++) c.px(x, y, col);
    bx0 = Math.min(bx0, X); by0 = Math.min(by0, Y); bx1 = Math.max(bx1, X + N); by1 = Math.max(by1, Y + N);
  }
  const box = bx1 > bx0 ? { x0: bx0, y0: by0, x1: bx1, y1: by1 } : { x0: x0, y0: y0, x1: x0 + SW * N, y1: y0 + SH * N };
  const fr = face >= 0.5 ? 1 : -1, cx = (i) => x0 + (fr > 0 ? i : SW - i) * N;
  return { box, x0, y0, N, s: (SH * N) / H, knee: [cx(5.5), y0 + 24 * N], kneeF: [cx(12.5), y0 + 24 * N], hand: [cx(15), y0 + 19 * N], top: [fx, y0], feet: [fx, fy] };
}
/** a flat dark shadow under the soles: one sprite row tall, 2 cells of dithered ends; k = presence (0..1), wk = width factor */
export function spriteShadow(c, fx, fy, N, k = 1, wk = 1) {
  if (k <= 0.02) return; N = Math.max(1, Math.round(N));
  const half = Math.round(7 * N * wk), y0 = Math.round(fy) - Math.ceil(N / 3), h = Math.max(2, Math.round(N * 0.75)), X = Math.round(fx);
  for (let y = y0; y < y0 + h; y++) for (let x = X - half - 2 * N; x < X + half + 2 * N; x++) {
    if (x < 0 || y < 0 || x >= c.w || y >= c.h) continue;
    const edge = x < X - half || x >= X + half, row2 = y >= y0 + h - Math.max(1, Math.round(N / 4));
    let p = k * (edge ? 0.45 : 1) * (row2 ? 0.5 : 1); if (p < 1 && p <= bayer(x, y)) continue;
    const i = (y * c.w + x) * 3; c.d[i] = c.d[i] * 0.42 + 42 * 0.58 * 0.35; c.d[i + 1] = c.d[i + 1] * 0.42 + 30 * 0.2; c.d[i + 2] = c.d[i + 2] * 0.42 + 64 * 0.2;
  }
}

// ---------------------------------------------------------------- catalog contract
const Z0 = Object.fromEntries(POSE_KEYS.map((k) => [k, 0]));
const only = (k) => ({ ...Z0, [k]: 1 });
const D = 0.09;   // every pose change: ~2.7 frames of cell dither
export default {
  kind: "mario-sprite", covers: ["mario", "plumber hero", "game hero sprite", "jumping hero"],
  source: "mario-real/film2 (new, 2026-10-29)",
  desc: "16×32 NES-spirit plumber sprite, 3 flat colours (red cap/overalls, olive hair/shirt/shoes, skin), integer scale",
  hw: 8, hh: 16, start: "stands (idle sprite)",
  states: {
    idle: [D, "stands"], run: [D, "runs: 3-frame cycle, a frame every 5 video frames", "tick"], skid: [D, "brakes, leans back", "swish"],
    crouch: [D, "ducks before the take-off", "swish"], "jump-up": [D, "jumps: fist up, knee up", "rise"], apex: [D, "jump sprite in the air", "glow"],
    fall: [D, "jump sprite falling", "fall"], land: [D, "one squash frame", "thud"], "dust-off": [D, "stands again"], "look-up": [D, "head and eye one pixel up", "blip"],
    point: [D, "points forward-down", "blip"], proud: [D, "win pose: fist up, feet down", "sparkle"], dive: [D, "jump sprite, diving", "whoosh"],
  },
  base: { ...Z0, idle: 1 },
  st: {
    idle: only("idle"), run: only("run"), skid: only("skid"), crouch: only("duck"), "jump-up": only("jump"), apex: only("jump"), fall: only("jump"),
    land: only("land"), "dust-off": only("idle"), "look-up": only("look"), point: only("point"), proud: only("win"), dive: only("jump"),
  },
  linear: [], slots: null, hud: false, value: false, text: false,
  notes: "z = N (integer scale). s.face 1 = right. Pose weights cross-dissolve on sprite cells; the run cadence comes from film time.",
  draw(c, cx, cy, z, t, s) { const r = drawSprite(c, cx, cy + this.hh * z, z, t, s.v, { face: s.face ?? 1, a: s.a }); return { box: r.box, pt: r.hand }; },
};
