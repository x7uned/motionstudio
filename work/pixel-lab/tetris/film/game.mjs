// «A 13-year-old "beat" Tetris» — the falling-blocks game on the TV, simulated (our own drawing and colours, a generic
// well of 10 × 20 cells; not the NES game's graphics). Pieces drop at the NES speed of their level (frames per row, NTSC),
// land by a simple greedy placement, full rows flash, dissolve and the stack above slides down (never a one-frame change).
// Segments: the 1989 climb (0 → 18, ending in a top-out), level 29 (one row per frame), the race past 29, the broken
// colours after 138, the last levels to 157 and the freeze. Everything is precomputed and deterministic.
import { EV, END } from "./timeline.mjs";

export const COLS = 10, ROWS = 20, CLEAR_D = 0.42;   // a cleared line: white, then it dissolves while the rows above slide down
const SHAPES = { I: [[0, 0], [1, 0], [2, 0], [3, 0]], O: [[0, 0], [1, 0], [0, 1], [1, 1]], T: [[0, 0], [1, 0], [2, 0], [1, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [1, 0], [2, 0], [2, 1]], L: [[0, 0], [1, 0], [2, 0], [0, 1]] };
const STYLE = { I: 1, O: 1, T: 1, S: 2, Z: 3, J: 2, L: 3 };   // cell style per piece: 1 white-centre, 2 colour A, 3 colour B
const rot = (cells) => cells.map(([x, y]) => [y, -x]);
const norm = (cells) => { const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1])); return cells.map(([x, y]) => [x - mx, y - my]); };
const ROTS = Object.fromEntries(Object.entries(SHAPES).map(([k, s]) => { const out = []; let c = s; for (let i = 0; i < 4; i++) { const n = norm(c); if (!out.some((o) => JSON.stringify(o) === JSON.stringify(n))) out.push(n); c = rot(c); } return [k, out]; }));
const ORDER = "TJZOSLI";
// NES (NTSC) frames per row by level
export function framesPerRow(L) { if (L >= 29) return 1; if (L >= 19) return 2; if (L >= 16) return 3; if (L >= 13) return 4; if (L >= 10) return 5; return [48, 43, 38, 33, 28, 23, 18, 13, 8, 6][L]; }
export const rowsPerSec = (L) => 60 / framesPerRow(L);
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

// replay: the board at time t (with the falling piece, flashing/dissolving rows and the slide)
export function boardAt(seg, t) {
  const board = seg.initBoard.map((r) => r.slice()); let falling = null, clear = null, top = null;
  for (const e of seg.events) {
    if (e.kind === "piece") { if (t >= e.t1) { for (const [cx, cy] of e.cells) if (e.y + cy >= 0) board[e.y + cy][e.x + cx] = e.style; } else if (t >= e.t0) { const yy = -2 + (t - e.t0) * (e.y + 2) / (e.t1 - e.t0); falling = { ...e, yy }; } }
    else if (e.kind === "clear") { if (t >= e.t + CLEAR_D) { for (const r of e.rows) { board.splice(r, 1); board.unshift(new Array(COLS).fill(0)); } } else if (t >= e.t) clear = { rows: e.rows, k: (t - e.t) / CLEAR_D }; }
    else if (e.kind === "top" && t >= e.t) top = { k: Math.min(1, (t - e.t) / 0.6) };
  }
  return { board, falling, clear, top };
}
function initBoardFor(fill, fillRows, s, well = -1) { seed = s; const b = Array.from({ length: ROWS }, () => new Array(COLS).fill(0)); for (let r = ROWS - fillRows; r < ROWS; r++) { const hole = well >= 0 ? well : Math.floor(rnd() * COLS); for (let c = 0; c < COLS; c++) if (c !== hole && (well >= 0 || rnd() < fill)) b[r][c] = 1 + Math.floor(rnd() * 3); } return b; }
// evaluate a board (the usual weights for a good stacker; "up" just builds high for the top-out)
function evalBoard(tmp, aim) {
  const h = []; let holes = 0; for (let c = 0; c < COLS; c++) { let top = ROWS; for (let r = 0; r < ROWS; r++) if (tmp[r][c]) { top = r; break; } h.push(ROWS - top); for (let r = top + 1; r < ROWS; r++) if (!tmp[r][c]) holes++; }
  let full = 0; for (let r = 0; r < ROWS; r++) if (tmp[r].every((q) => q)) full++;
  const agg = h.reduce((x, y) => x + y, 0); let bump = 0; for (let c = 0; c < COLS - 1; c++) bump += Math.abs(h[c] - h[c + 1]);
  if (aim === "up") return agg * 0.4 - holes * 0.1 + rnd() * 2;
  return -0.51 * agg + 0.76 * full - 0.36 * holes - 0.18 * bump + rnd() * 0.05;
}
// one segment of play from a starting board, on its own clock (sim time = t0 + (t − t0)·ff)
function simulateFrom(ib, t0, t1, levelAt, o) {
  const board = ib.map((r) => r.slice()), ff = o.ff ?? 1, ts1 = t0 + (t1 - t0) * ff, events = []; let t = t0, k = 0;
  const fits = (cells, x, y) => cells.every(([cx, cy]) => { const X = x + cx, Y = y + cy; return X >= 0 && X < COLS && Y < ROWS && (Y < 0 || !board[Y][X]); });
  const place = (want = null) => { let best = null;
    for (const type of want ? ORDER : [ORDER[(k + Math.floor(rnd() * 3)) % 7]]) for (const cells of ROTS[type]) { const w = Math.max(...cells.map((c) => c[0])) + 1; for (let x = 0; x <= COLS - w; x++) { let y = -2; while (fits(cells, x, y + 1)) y++; if (!fits(cells, x, y)) continue;
      const tmp = board.map((r) => r.slice()); for (const [cx, cy] of cells) if (y + cy >= 0) tmp[y + cy][x + cx] = 1; let full = 0; for (let r = 0; r < ROWS; r++) if (tmp[r].every((q) => q)) full++;
      if (want != null && full !== want) continue;
      const sc = evalBoard(tmp, o.upAfter != null && t > o.upAfter ? "up" : o.aim); if (!best || sc > best.score) best = { type, cells, x, y, score: sc }; } }
    return best; };
  const drop = (best, tStart, L) => { const v = o.speed ? o.speed(L) : rowsPerSec(L) * ff, fall = (best.y + 2) / v;
    events.push({ kind: "piece", type: best.type, cells: best.cells, x: best.x, y: best.y, t0: tStart, t1: tStart + fall, style: STYLE[best.type] });
    for (const [cx, cy] of best.cells) if (best.y + cy >= 0) board[best.y + cy][best.x + cx] = STYLE[best.type];
    const full = []; for (let r = 0; r < ROWS; r++) if (board[r].every((q) => q)) full.push(r);
    return { fall, full }; };
  while (t < ts1) {
    const L = levelAt(t);
    // the last piece of a segment may have to clear exactly one line at a given moment
    if (o.single && t > o.single - 0.8) { const best = place(1); if (best) { const v = rowsPerSec(L), fall = (best.y + 2) / v, tStart = Math.max(t, o.single - fall); const r = drop(best, tStart, L); events.push({ kind: "clear", rows: r.full, t: tStart + fall, final: true }); break; } }
    k++; const best = place(); if (!best || best.y < 0) { events.push({ kind: "top", t }); break; }
    const { fall, full } = drop(best, t, L); t += fall;
    if (full.length) { events.push({ kind: "clear", rows: full, t }); for (const r of full) { board.splice(r, 1); board.unshift(new Array(COLS).fill(0)); } t += CLEAR_D * ff; }
    t += Math.max(0.06, 0.18 - L * 0.004) * ff;
  }
  return { t0, t1, ff, levelAt, events };
}
function makeSeg(t0, t1, levelAt, o = {}) {
  const ib = initBoardFor(o.fill ?? 0, o.fillRows ?? 0, o.seed ?? 3, o.well ?? -1); seed = (o.seed ?? 3) * 977 + 5; const seg = simulateFrom(ib, t0, t1, levelAt, o); seg.initBoard = ib;
  // a forced top-out (game over) at a film time: pieces after it are dropped, the curtain closes the well
  if (o.topAt != null) { const ts = t0 + (o.topAt - t0) * (o.ff ?? 1); seg.events = seg.events.filter((e) => (e.t0 ?? e.t) < ts && e.kind !== "top"); seg.events.push({ kind: "top", t: ts }); }
  return seg;
}
const simT = (seg, t) => seg.t0 + (t - seg.t0) * (seg.ff ?? 1);

// ---------------------------------------------------------------- the film's segments
const lerpL = (a, b, ta, tb) => (t) => Math.max(a, Math.min(b, Math.floor(a + (b - a) * Math.max(0, Math.min(1, (t - ta) / (tb - ta))))));
const FF = 7, climb0 = EV.it + 0.2;
export const SEG = {
  // 1989 on fast-forward: levels climb (on the sim clock), the stack builds up and tops out on "lose"
  // (the counter climbs 0 → 18; the fall speed on screen rises smoothly to 30 rows a second, so nothing teleports)
  climb: makeSeg(climb0, EV.at - 0.3, lerpL(0, 18, climb0, EV.until2), { fill: 0.7, fillRows: 5, aim: "flat", upAfter: EV.blocks, seed: 11, speed: (L) => 7 + L * 1.3, topAt: EV.lose }),
  l29: makeSeg(EV.at - 0.3, EV.holding - 0.1, () => 29, { fill: 0.82, fillRows: 6, seed: 23 }),
  // past 29 → 138 (the colours go wrong) → 146, the almost invisible one, on "almost invisible"
  race: makeSeg(EV.players2, EV.inside + 0.5, (t) => (t < EV.l138 ? lerpL(29, 138, EV.past, EV.l138)(t) : t < EV.almost ? lerpL(138, 146, EV.l138 + 0.6, EV.almost)(t) : t < EV.invisibleEnd ? 146 : 147), { fill: 0.8, fillRows: 5, seed: 31 }),
  late: makeSeg(EV.inside + 0.5, EV.froze + 1, lerpL(148, 157, EV.inside + 0.5, EV.cleared - 0.6), { fill: 0.8, fillRows: 7, seed: 47, single: EV.line + 0.05 }),
};
// the slow-motion demo at level 29: a deep well in column 0; the I piece can't get there in time
export const DEMO = { t0: EV.holding - 0.1, t1: EV.came - 0.1, slow: 0.06, spawn: EV.holding + 0.25, board: initBoardFor(1, 10, 61, 0) };
/** the demo I piece: falls one row per frame (60 rows/s of game time), moves one column left every 0.1 s; it reaches the
 *  stack (row 9) after 0.15 s, with only two of the four moves done, so it never gets to the well in column 0 */
export function demoPiece(t) {
  const g = Math.max(0, (t - DEMO.spawn) * DEMO.slow), yRaw = -3 + 60 * g, landed = yRaw >= 6, y = Math.min(yRaw, 6);
  const m = (t >= DEMO.spawn ? 1 : 0) + (g >= 0.1 ? 1 : 0);
  return { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], x: 4 - m, y, landed, g, shown: t >= DEMO.spawn - 0.3 };
}
export const DEMO_LAND = DEMO.spawn + 0.15 / DEMO.slow, DEMO_MOVE2 = DEMO.spawn + 0.1 / DEMO.slow;
export const FINAL = SEG.late.events.find((e) => e.final);
export const FREEZE_T = (FINAL ? FINAL.t : EV.line) + 0.14;   // the game freezes right after the single on 157; the loop opens on the same frozen screen
export function gameAt(t) {
  if (t >= FREEZE_T || t < SEG.climb.t0) return { seg: SEG.late, tg: FREEZE_T, frozen: true };
  if (t < SEG.l29.t0) return { seg: SEG.climb, tg: simT(SEG.climb, t), frozen: false };
  if (t < DEMO.t0) return { seg: SEG.l29, tg: t, frozen: false };
  if (t < SEG.race.t0) return { seg: null, demo: true, tg: t, frozen: false };
  if (t < SEG.late.t0) return { seg: SEG.race, tg: t, frozen: false };
  return { seg: SEG.late, tg: t, frozen: false };
}
export function levelAt(t) { const g = gameAt(t); if (g.frozen) return 157; if (g.demo) return 29; return g.seg.levelAt(g.tg); }
// ---------------------------------------------------------------- palettes (our own colours, not the NES's)
const BASE = [["#3A7BF0", "#7CC8FF"], ["#28A745", "#B6E36A"], ["#C23BD8", "#F38BF0"], ["#2E6BE6", "#5FE38C"], ["#D8336A", "#5FE3C8"], ["#36C9A0", "#7C8CFF"],
  ["#E2462E", "#9A9AAE"], ["#6A3BE0", "#A0285A"], ["#2E6BE6", "#E2462E"], ["#E2462E", "#F4B23A"]];
const hash = (a) => { let h = Math.imul(a ^ 0x9e3779b9, 2654435761); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
const GLITCH = ["#5A4A1A", "#8A6A2A", "#3A5A3A", "#6A6A7A", "#7A3A5A", "#2A4A6A", "#9A7A4A", "#4A2A1A", "#2A2A2A", "#6A8A3A"];
export function palette(L) {
  if (L === 146) return { a: "#141826", b: "#1A1F30", w: "#20263A", dusk: true };             // almost invisible
  if (L === 148) return { a: "#3A3A3E", b: "#8A8A90", w: "#E6E6EA" };                       // black, grey and white
  if (L > 138) return { a: GLITCH[Math.floor(hash(L) * 10)], b: GLITCH[Math.floor(hash(L * 7 + 3) * 10)], w: hash(L * 13) < 0.5 ? "#C8C0A8" : "#E6E6EA", glitch: true };
  const p = BASE[L % 10]; return { a: p[0], b: p[1], w: "#FFFFFF" };
}
