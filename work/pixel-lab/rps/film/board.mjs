// The classroom's live parts: chalk on the board (the R → P → S circle that stays all film, the 2014 study as 60 tables
// × 6 pupils with coins, the three move bars, STAY 50% against a dashed 33%, the losers' switch, the two rules, the edge
// gauge), the hanging scoreboard with rolling digits, the channel hero as the teacher behind his desk, the result tags
// under the hands, and the RANDOM robot cube. Everything is a pure function of t and dissolves or slides — no one-frame
// changes. All x are classroom-screen x; dx = the camera offset (0 while the camera rests in the classroom).
import { MAIN, TINY, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { EV, ROUNDS, SCORE, ROBOT } from "./timeline.mjs";
import { DESK } from "./scene.mjs";
import { moveIcon, handState } from "./hands.mjs";
import { panel } from "./cute.mjs";
import { makeHero } from "./hero.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const hash = (x, y) => { let h = (x * 73856093) ^ (y * 19349663); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const CK = { W: "#F2F0E2", Y: "#F4E08A", PK: "#F6A8BE", BL: "#A8DAF4", GR: "#BCF08E", WOOD: "#D8B888", SL: "#2C5A40" };
const O = "#0B0812", IV = "#FDFEED";

// ---------------------------------------------------------------- chalk helpers
/** Chalk text: written left to right over `w` seconds from t0 (dithered edge), slight dust speckle, dissolves with a. */
export const CHALK_LOG = new Map();   // (t0, w) of every chalk write seen (the synth replays the board to time its scratches)
export function chalk(c, str, x, y, col, t, t0, a = 1, s = 2, w = 0.35) {
  if (a <= 0 || t < t0) return 0; CHALK_LOG.set(t0.toFixed(3) + ":" + w, [t0, w, str.length]); const tw = c.measure(MAIN, str, { scale: s }), rev = x + (tw + 8) * clamp01((t - t0) / w);
  c.text(MAIN, str, x, y, col, { scale: s, colorAt: (X, Y) => (a < 1 && a <= bayer(X, Y)) || X > rev - 6 * bayer(X + 1, Y) ? null : hash(X, Y) < 0.12 ? mix(col, CK.SL, 0.45) : col });
  return tw;
}
const cdot = (c, x, y, col, a = 1, r = 1) => { const g = fade(c, a); g.rect(R(x), R(y), r + 1, r + 1, col); };
function cline(c, x0, y0, x1, y1, col, a = 1, k = 1, dash = 0, th = 2) {   // chalk line drawn up to fraction k
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)), g = fade(c, a);
  for (let i = 0; i <= n * k; i++) { if (dash && Math.floor(i / dash) % 2) continue; const x = R(x0 + ((x1 - x0) * i) / n), y = R(y0 + ((y1 - y0) * i) / n); if (hash(x, y) < 0.1) continue; g.rect(x, y, th, th, col); }
}

// ---------------------------------------------------------------- the R → P → S circle (top right of the board)
export const CIRCLE = { x: 440, y: 264, r: 46 };
const ANG = { R: -Math.PI / 2, P: Math.PI / 6, S: (5 * Math.PI) / 6 };
const NEXT = { R: "P", P: "S", S: "R" };                       // the arrow points to the move that beats it
// highlights: [kind, key, t0, t1]
export const HL = [
  ["arrow", "P", EV.switched - 0.1, EV.so1 - 0.1], ["icon", "S", EV.beat1 - 0.1, EV.so1 - 0.1],
  ["icon", "P", EV.lose + 0.05, EV.beats - 0.1], ["arrow", "P", EV.beats - 0.1, ROUNDS[5].at + 0.2], ["icon", "S", EV.last - 0.1, ROUNDS[5].at + 0.6],
  ["icon", "P", EV.lost - 0.1, ROUNDS[6].at + 0.6], ["arrow", "S", EV.try1 - 0.15, ROUNDS[6].at + 0.6],
];
const hl = (kind, key, t) => { let v = 0; for (const [k, m, a, b] of HL) if (k === kind && m === key) v = Math.max(v, win(t, a, b, 0.2, 0.3)); return v; };
function circle(c, t, dx) {
  const a = sm(t, EV.patterns - 0.15, EV.patterns + 0.25); if (a <= 0) return;
  const { x, y, r } = CIRCLE, X = x + dx, draw = clamp01((t - EV.patterns + 0.15) / 0.6);
  for (const m of ["R", "P", "S"]) {
    const a0 = ANG[m] + 0.42, a1 = ANG[m] + (2 * Math.PI) / 3 - 0.42, h = hl("arrow", m, t), pulse = h * (0.75 + 0.25 * Math.sin(t * 14));
    const col = h > 0.05 ? mix(CK.W, CK.Y, Math.min(1, h * 1.2)) : CK.W, th = h > 0.5 ? 3 : 2;
    const n = 40, upto = Math.floor(n * draw);
    for (let i = 0; i <= upto; i++) { const an = a0 + ((a1 - a0) * i) / n, px = R(X + Math.cos(an) * r), py = R(y + Math.sin(an) * r); if (hash(px, py) < 0.08) continue; fade(c, a).rect(px - 1, py - 1, th, th, col); }
    if (draw >= 1) { // arrowhead at a1, pointing along the circle (clockwise)
      const hx = X + Math.cos(a1) * r, hy = y + Math.sin(a1) * r, tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1), L = 8 + 2 * pulse;
      cline(c, hx, hy, hx - tx * L + nx * L * 0.7, hy - ty * L + ny * L * 0.7, col, a, 1, 0, th); cline(c, hx, hy, hx - tx * L - nx * L * 0.7, hy - ty * L - ny * L * 0.7, col, a, 1, 0, th);
    }
  }
  for (const m of ["R", "P", "S"]) {
    const ix = R(X + Math.cos(ANG[m]) * r), iy = R(y + Math.sin(ANG[m]) * r), h = hl("icon", m, t), k = sm(t, EV.patterns - 0.1 + (m === "R" ? 0 : m === "P" ? 0.12 : 0.24), EV.patterns + 0.2 + (m === "R" ? 0 : m === "P" ? 0.12 : 0.24));
    const g = fade(c, a * k); g.disc(ix, iy, 19, mix(CK.SL, "#000000", 0.25)); g.ring(ix, iy, 19, h > 0.05 ? mix(CK.W, CK.Y, h) : CK.W); if (h > 0.4) { g.ring(ix, iy, 20, CK.Y); g.ring(ix, iy, 21 + R(Math.sin(t * 12) * 0.6 + 0.6), mix(CK.Y, CK.SL, 0.4)); }
    moveIcon(c, ix, iy, m, a * k, 0.42);
  }
}

// ---------------------------------------------------------------- board blocks (left part of the board, x 44–372)
const X0 = 46, Y0 = 218;
function study(c, t, dx) {
  const a = win(t, EV.in2014 - 0.05, EV.overall - 0.2, 0.3, 0.3); if (a <= 0) return;
  const w1 = chalk(c, "2014", X0 + dx, Y0, CK.Y, t, EV.y2014 - 0.05, a); chalk(c, "· CHINA", X0 + dx + w1 + 10, Y0, CK.W, t, EV.china - 0.05, a);
  // 60 tables of 6 pupils: 10 columns × 6 rows, appearing in a wave during "three hundred sixty students"
  for (let i = 0; i < 60; i++) {
    const col = i % 10, row = Math.floor(i / 10), cx = R(X0 + 16 + col * 32.4) + dx, cy = R(252 + row * 26.4), ta = EV.three1 - 0.05 + (1.3 * (col + row * 1.6)) / 23.4;
    const k = a * sm(t, ta, ta + 0.25); if (k <= 0) continue;
    const g = fade(c, k); g.rect(cx - 9, cy - 2, 19, 5, CK.WOOD); g.rect(cx - 9, cy - 2, 19, 1, CK.W);
    for (let s = 0; s < 6; s++) { const sx = cx - 7 + (s % 3) * 7, sy = s < 3 ? cy - 7 : cy + 5, pc = [CK.W, CK.Y, CK.PK, CK.BL][(i * 7 + s * 3) % 4]; g.rect(sx, sy, 3, 3, pc); }
    // coins on "for real money"
    const tc = EV.real - 0.1 + ((i * 37) % 60) / 60 * 0.45, kc = sm(t, tc, tc + 0.15); if (kc > 0) { const q = fade(c, a * kc), yy = cy - 12 - R(3 * Math.sin(Math.PI * clamp01((t - tc) / 0.3))); q.disc(cx + 1, yy, 3, "#C99A2A"); q.disc(cx + 1, yy, 2, "#F4CA50"); q.px(cx, yy - 1, "#FFF6C2"); }
  }
  const w2 = chalk(c, "360", X0 + dx, 414, CK.Y, t, EV.three1 - 0.05, a, 3, 0.6); chalk(c, "STUDENTS", X0 + dx + w2 + 10, 418, CK.W, t, EV.students - 0.05, a);
  const w3 = chalk(c, "300", X0 + dx + 200, 414, CK.Y, t, EV.three2 - 0.05, a, 3, 0.5); chalk(c, "ROUNDS", X0 + dx + 200 + w3 + 10, 418, CK.W, t, EV.rounds - 0.05, a);
  chalk(c, "FOR REAL MONEY", X0 + dx, 446, CK.Y, t, EV.real - 0.1, a * sm(t, EV.real - 0.1, EV.real + 0.2), 2, 0.4);
}
function bars(c, t, dx) {
  const a = win(t, EV.overall - 0.1, EV.but1 - 0.5, 0.3, 0.3); if (a <= 0) return;
  chalk(c, "EACH MOVE", X0 + dx, Y0, CK.Y, t, EV.overall - 0.05, a);
  const rows = [["R", 36], ["P", 33], ["S", 32]], x0 = 104 + dx, ppx = 5.6;
  rows.forEach(([m, p], i) => {
    const y = 252 + i * 50, tk = EV.each2 - 0.05 + i * 0.18, k = ease(clamp01((t - tk) / 0.55)), w = R(p * ppx * k);
    moveIcon(c, X0 + dx + 22, y + 11, m, a * sm(t, tk - 0.2, tk), 0.42);
    const g = fade(c, a); for (let yy = 0; yy < 22; yy++) for (let xx = 0; xx < w; xx++) { const X = x0 + xx, Y = y + yy, edge = yy < 2 || yy > 19 || xx < 2 || xx > w - 3; if (edge ? hash(X, Y) > 0.1 : (X + Y) % 4 === 0 && hash(X, Y) > 0.2) g.px(X, Y, [CK.W, CK.Y, CK.BL][i]); }
    if (k > 0.6) chalk(c, `${p}%`, x0 + w + 8, y + 1, CK.W, t, tk + 0.35, a, 3);
  });
  const lx = x0 + R(33.3 * ppx), k = sm(t, EV.third - 0.15, EV.third + 0.35); cline(c, lx, 240, lx, 400, CK.PK, a, k, 4);
  chalk(c, "1/3", lx - 16, 406, CK.PK, t, EV.third + 0.1, a);
}
function stay(c, t, dx) {
  const a = win(t, EV.but1 - 0.2, EV.losers - 0.25, 0.3, 0.3); if (a <= 0) return;
  const w1 = chalk(c, "WINNERS:", X0 + dx, Y0, CK.Y, t, EV.winners1 - 0.05, a); chalk(c, "SAME MOVE", X0 + dx + w1 + 12, Y0, CK.W, t, EV.same - 0.05, a);
  chalk(c, "STAY", X0 + dx, 256, CK.W, t, EV.same + 0.2, a);
  const x0 = 112 + dx, full = 230, k = ease(clamp01((t - EV.half + 0.1) / 0.5)), w = R(full * 0.5 * k), g = fade(c, a);
  for (let yy = 0; yy < 22; yy++) for (let xx = 0; xx < w; xx++) { const X = x0 + xx, Y = 250 + yy, edge = yy < 2 || yy > 19 || xx < 2 || xx > w - 3; if (edge ? hash(X, Y) > 0.1 : (X + Y) % 4 === 0 && hash(X, Y) > 0.2) g.px(X, Y, CK.GR); }
  if (k > 0.7) chalk(c, "50%", x0 + w + 8, 251, CK.GR, t, EV.half + 0.35, a, 3);
  const lx = x0 + R(full * 0.333), kl = sm(t, EV.half - 0.55, EV.half - 0.15); cline(c, lx, 244, lx, 280, CK.PK, a, kl, 4);
  if (kl > 0) c.text(TINY, "CHANCE 33%", lx - 36, 288, CK.PK, { scale: 2, colorAt: (X, Y) => (a * kl < 1 && a * kl <= bayer(X, Y) ? null : CK.PK) });
}
function switchBlock(c, t, dx) {
  const a = win(t, EV.losers - 0.15, EV.so1 - 0.2, 0.3, 0.3); if (a <= 0) return;
  chalk(c, "LOSERS:", X0 + dx, Y0, CK.PK, t, EV.losers - 0.05, a);
  chalk(c, "SWITCH TO THE MOVE", X0 + dx, Y0 + 26, CK.W, t, EV.switched - 0.05, a, 2, 0.5);
  chalk(c, "THAT BEATS THE WINNER", X0 + dx, Y0 + 52, CK.W, t, EV.beat1 - 0.15, a, 2, 0.5);
}
function trick(c, t, dx) {
  const a = win(t, EV.so1 - 0.1, EV.small - 0.45, 0.3, 0.3); if (a <= 0) return;
  chalk(c, "THE TRICK", X0 + dx, Y0, CK.Y, t, EV.trick1 - 0.1, a);
  const w1 = chalk(c, "LOST?", X0 + dx, Y0 + 28, CK.PK, t, EV.lose - 0.05, a); chalk(c, "BEAT THEIR LAST MOVE", X0 + dx + 72, Y0 + 28, CK.W, t, EV.beats - 0.1, a, 2, 0.6);
  chalk(c, "WON?", X0 + dx, Y0 + 54, CK.GR, t, EV.win - 0.05, a); chalk(c, "PLAY THEIR LOSING MOVE", X0 + dx + 58, Y0 + 54, CK.W, t, EV.lost - 0.15, a, 2, 0.6);
  void w1;
}
const needleV = (t) => { const s = 0.32 * ease(clamp01((t - EV.small + 0.1) / 0.5)), r = ease(clamp01((t - EV.truly + 0.1) / 0.5)), b = ease(clamp01((t - EV.bad + 0.05) / 0.5));
  return s * (1 - r) + r * (1 - b) * 0.05 * Math.sin(t * 9) * Math.sin(t * 3.1 + 1) + b * 0.32; };
function edge(c, t, dx) {
  const a = win(t, EV.small - 0.35, EV.in2005 + 0.3, 0.3, 0.3); if (a <= 0) return;
  chalk(c, "YOUR EDGE", X0 + dx, Y0, CK.Y, t, EV.small - 0.25, a);
  const x0 = 70 + dx, x1 = 330 + dx, xm = (x0 + x1) / 2, y = 268; cline(c, x0, y, x1, y, CK.W, a, sm(t, EV.small - 0.3, EV.small + 0.1));
  for (const [x, s] of [[x0, "-"], [xm, "0"], [x1, "+"]]) { cline(c, x, y - 6, x, y + 6, CK.W, a); chalk(c, s, R(x - 5), y + 12, CK.W, t, EV.small - 0.2, a); }
  const v = needleV(t), nx = R(xm + v * (x1 - xm)), g = fade(c, a * sm(t, EV.small - 0.2, EV.small + 0.05));
  g.poly([[nx - 7, y - 20], [nx + 8, y - 20], [nx, y - 6]], CK.Y); g.rect(nx - 7, y - 21, 15, 1, CK.W);
  const lines = [["SMALL, NOT MAGIC", EV.not - 0.1, EV.against - 0.1, CK.W], ["VS RANDOM: ZERO", EV.nothing - 0.1, EV.but2 - 0.1, CK.BL], ["VS PEOPLE: AN EDGE", EV.bad - 0.05, EV.in2005 + 2, CK.GR]];
  for (const [s, t0, t1, col] of lines) { const k = a * win(t, t0, t1, 0.25, 0.25); if (k > 0) chalk(c, s, X0 + dx, 298, col, t, t0, k, 2, 0.45); }
}

// ---------------------------------------------------------------- scoreboard (hangs above the board)
const SB = { x: 104, y: 146, w: 332, h: 48 };
function scoreAt(t, side) { // → { v, old, k } (k = roll progress of the last change)
  const j = side === "you" ? 1 : 2; let v = 0, old = 0, tc = -10;
  for (let i = 0; i < SCORE.length; i++) if (SCORE[i][0] <= t) { if (i > 0 && SCORE[i][j] !== SCORE[i - 1][j]) { old = SCORE[i - 1][j]; tc = SCORE[i][0]; } v = SCORE[i][j]; }
  return { v, old, k: clamp01((t - tc) / 0.32), tc };
}
function scoreboard(c, t, dx) {
  const kin = clamp01((t - EV.use + 0.1) / 0.45); if (kin <= 0) return; const a = sm(kin, 0, 0.6), oy = R((1 - back(kin)) * -14), x = SB.x + dx, y = SB.y + oy;
  const g = fade(c, a); for (const sx of [x + 40, x + SB.w - 42]) { g.rect(sx, 96, 2, y - 96, "#5A4A3A"); g.rect(sx - 1, y - 3, 4, 4, "#8A7A60"); }
  g.rrect(x, y, SB.w, SB.h, "#2A1A10", 2); g.rrect(x + 2, y + 2, SB.w - 4, SB.h - 4, "#5A3418", 2); g.rrect(x + 6, y + 6, SB.w - 12, SB.h - 12, "#140C1C", 2); g.rect(x + 8, y + 7, SB.w - 16, 1, "#3A2A4A");
  g.text(MAIN, "YOU", x + 18, y + 17, "#FFFFFF", { scale: 2 }); const fw = c.measure(MAIN, "FRIEND", { scale: 2 }); g.text(MAIN, "FRIEND", x + SB.w - 18 - fw, y + 17, "#F08060", { scale: 2 });
  g.text(MAIN, ":", x + SB.w / 2 - 2, y + 13, "#F4CA50", { scale: 3 });
  for (const [side, cx] of [["you", x + SB.w / 2 - 34], ["friend", x + SB.w / 2 + 22]]) {
    const s = scoreAt(t, side), top = y + 8, bot = y + SB.h - 8, dy = R(16 * ease(s.k));
    g.rrect(cx - 4, top, 26, bot - top, "#2A1E3A", 2);
    const clip = (X, Y) => Y >= top + 1 && Y < bot - 1;
    const digit = (str, yy, al) => { if (al <= 0) return; c.text(MAIN, str, cx + 2, yy, "#F4CA50", { scale: 3, colorAt: (X, Y) => (!clip(X, Y) || (a * al < 1 && a * al <= bayer(X, Y)) ? null : "#F4CA50") }); };
    if (s.k < 1) { digit(String(s.old), y + 13 - dy, 1 - s.k); digit(String(s.v), y + 13 + 16 - dy, s.k); } else digit(String(s.v), y + 13, 1);
    // "+1" floats up from the digit after a point
    const u = (t - s.tc) / 0.9; if (u > 0 && u < 1) { const q = fade(c, a * Math.min(sm(u, 0, 0.15), 1 - sm(u, 0.7, 1))); const yy = R(y + SB.h + 4 - 26 * ease(u)); q.text(MAIN, "+1", cx - 2 + 1, yy + 1, O, { scale: 2 }); q.text(MAIN, "+1", cx - 2, yy, side === "you" ? "#BCF08E" : "#F08060", { scale: 2 }); }
  }
}

// ---------------------------------------------------------------- tags under the hands, bursts on every reveal
export const TAGS = [
  ["friend", "WINNER", EV.winners1 + 0.3, EV.same - 0.15, CK.Y], ["friend", "SAME MOVE", EV.same + 0.25, EV.losers + 0.2, CK.Y],
  ["you", "LOSER", EV.winners1 + 0.3, EV.switched - 0.2, CK.PK], ["you", "SWITCHES", EV.switched + 0.1, EV.so1 - 0.1, CK.PK],
  ["you", "YOU LOST", EV.lose + 0.05, EV.play2 + 0.3, CK.PK], ["you", "TRY SCISSORS", EV.last - 0.05, ROUNDS[5].at - 0.15, CK.BL],
  ["friend", "REPEATS", EV.repeat - 0.1, EV.win - 0.15, CK.Y], ["you", "+1 WIN", ROUNDS[5].at + 0.15, EV.win - 0.15, CK.GR],
  ["you", "YOU WON", EV.win + 0.05, EV.lost - 0.2, CK.GR], ["you", "TRY PAPER", EV.lost + 0.05, ROUNDS[6].at - 0.15, CK.BL],
  ["friend", "SWITCHES", ROUNDS[6].at + 0.05, EV.small - 0.25, CK.Y], ["you", "+1 WIN", ROUNDS[6].at + 0.15, EV.small - 0.25, CK.GR],
  ["robot", "RANDOM", ROBOT.in[1] - 0.1, ROBOT.out[0] - 0.05, CK.BL], ["friend", "SAME AGAIN", ROUNDS[7].at + 0.05, EV.in2005 + 0.8, CK.PK],
];
function tagUnder(c, text, cx, y, a, col) {
  const s = 2, w = c.measure(MAIN, text, { scale: s }) + 20, h = 30, x = R(Math.max(36, Math.min(440 - w, cx - w / 2)));
  panel(c, x, y, w, h, a, col); const g = fade(c, a); g.text(MAIN, text, x + 11, y + 9, O, { scale: s }); g.text(MAIN, text, x + 10, y + 8, col, { scale: s });
}
function tags(c, t, dx) {
  for (const [side, text, t0, t1, col] of TAGS) {
    const k = clamp01((t - t0) / 0.3), a = Math.min(sm(k, 0, 0.7), 1 - sm(t, t1, t1 + 0.25)); if (a <= 0) continue;
    const cx = side === "you" ? 150 : side === "friend" ? 392 : 400, y = 436 + R((1 - back(k)) * 8);
    tagUnder(c, text, cx + dx, y, a, col);
  }
  // a chalk-dust burst between the hands at every reveal
  for (const r of ROUNDS) { if (!r.at) continue; const u = (t - r.at) / 0.5; if (u <= 0 || u >= 1) continue;
    const mx = (handState("you", r.at).x + handState("friend", r.at).x) / 2 + dx, my = 378, g = fade(c, 1 - u);
    for (let i = 0; i < 10; i++) { const an = (i / 10) * 2 * Math.PI + 0.3, rr = 10 + 30 * ease(u); g.rect(R(mx + Math.cos(an) * rr), R(my + Math.sin(an) * rr * 0.8), 2, 2, i % 2 ? CK.Y : IV); } }
}

// ---------------------------------------------------------------- the RANDOM robot cube (takes the friend's place)
const RSEQ = ["P", "S", "R", "R", "P", "S", "P", "R", "S", "S", "R", "P", "S", "R", "P", "P"];
function robot(c, t, dx) {
  const p = ease(sm(t, ...ROBOT.in)) * (1 - ease(sm(t, ...ROBOT.out))); if (p <= 0) return;
  const x = R(392 + (1 - p) * 190) + dx, y = R(376 + Math.sin(t * 4.2) * 3), w = 96, h = 84, bx = x - w / 2, by = y - h / 2;
  c.rect(x - 1, by - 16, 3, 16, "#5A6684"); { const blink = Math.sin(t * 6) > 0 ? "#FF5A5A" : "#8A2A2A"; c.disc(x, by - 18, 4, "#1E2234"); c.disc(x, by - 18, 3, blink); }
  c.rrect(bx - 2, by - 2, w + 4, h + 4, "#1E2234", 3); c.rrect(bx, by, w, h, "#8A96B0", 3); c.rect(bx + 3, by + 3, w - 6, 3, "#C4CEDA"); c.rect(bx + 3, by + h - 8, w - 6, 5, "#647284");
  c.rect(bx - 8, y - 4, 8, 12, "#647284"); c.rect(bx + w, y - 4, 8, 12, "#647284");
  const sx = bx + 9, sy = by + 10, sw = w - 18, sh = h - 24; c.rrect(sx, sy, sw, sh, "#0E1A2E", 2); c.rect(sx + 2, sy + 2, sw - 4, 1, "#244870");
  // the screen cycles random moves (crossfaded), the cheeks are dice pips
  const step = 0.3, i = Math.floor((t - ROBOT.in[0]) / step), k = clamp01(((t - ROBOT.in[0]) % step) / 0.12);
  const A = RSEQ[((i - 1) % 16 + 16) % 16], B = RSEQ[((i % 16) + 16) % 16];
  moveIcon(c, x, sy + sh / 2, A, 1 - k, 0.5); moveIcon(c, x, sy + sh / 2, B, k, 0.5);
  for (const [px, py] of [[bx + 4, by + h - 14], [bx + w - 7, by + h - 14]]) c.rect(px, py, 3, 3, "#F4F1E4");
}

// ---------------------------------------------------------------- the channel hero, the teacher (stands behind the desk)
const HERO = makeHero({
  grade: "day", x: () => 270, y: () => 650,
  poses: [
    [0, 0, [0, 1, 0, 3], 0.45], [EV.patterns - 0.2, 2, [0, 1, 2, 3, 4, 5], 0.3], [EV.friends - 0.1, 0, [2], 0.6], [EV.friendsEnd + 0.25, 0, [0, 1, 0, 3], 0.45],
    [EV.y2014 - 0.1, 4, [1, 2, 3, 4, 5, 4], 0.32], [EV.students + 0.3, 2, [0, 1, 2, 3, 4, 5], 0.3], [EV.overall - 0.1, 5, [0, 1, 2, 3, 4, 5], 0.32],
    [EV.but1 - 0.05, 2, [0, 1, 2, 3, 4, 5], 0.3], [EV.losers - 0.05, 4, [1, 2, 3, 4, 5, 4], 0.32], [EV.so1 - 0.05, 9, [0, 1, 2, 3, 4, 5], 0.3],
    [EV.lose + 0.05, 7, [0, 1, 2, 3, 4, 5], 0.3], [EV.play2 - 0.05, 5, [0, 1, 2, 3, 4, 5], 0.32], [ROUNDS[5].at + 0.1, 9, [0, 1, 2, 3, 4, 5], 0.3],
    [EV.win + 0.1, 2, [0, 1, 2, 3, 4, 5], 0.3], [ROUNDS[6].at + 0.1, 9, [0, 1, 2, 3, 4, 5], 0.3], [EV.small - 0.1, 3, [0, 1, 2, 3, 4, 5], 0.3],
    [EV.truly - 0.1, 7, [0, 1, 2, 3, 4, 5], 0.3], [EV.but2 - 0.05, 6, [0, 1, 2, 3, 4, 5], 0.32], [EV.in2005 + 0.2, 2, [0, 1, 2, 3, 4, 5], 0.3],
    [EV.follow - 0.1, 1, [0, 1, 2, 3, 2, 3], 0.3], [EV.miss - 0.05, 9, [0, 1, 2, 3, 4, 5], 0.3], [EV.lastEnd + 0.1, 0, [0], 2],   // settles into a still idle pose for the final hold
  ],
});
export function drawHero(c, t, cam) {
  const V = { X: (wx) => wx - cam.cx + 270, Y: (wy) => wy };
  if (V.X(270) < -120) return;
  HERO.draw(c, V, t, { clip: (X, Y) => Y < DESK.y + 2 });
}

/** Board chalk + scoreboard (behind the hero and the hands). */
export function boardBack(c, t, dx) { if (dx < -560) return; study(c, t, dx); bars(c, t, dx); stay(c, t, dx); switchBlock(c, t, dx); trick(c, t, dx); edge(c, t, dx); circle(c, t, dx); scoreboard(c, t, dx); }
/** In front of the hands: tags, bursts; the robot sits where the friend's hand was. */
export function boardFront(c, t, dx) { if (dx < -560) return; robot(c, t, dx); tags(c, t, dx); }
