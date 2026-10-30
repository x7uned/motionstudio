// The film's game state as pure functions of film time t, built once at import from the deterministic simulation
// (sim.mjs, plans found by dev/search.mjs → game-params.json):
//   serve 1 (film = sim time): paddle hit at frame 3, breakout on "hits the top wall", red-row rattle, ball lost;
//   serve 2: served after the loss (paddle eases back to full width, speed back to SLOW), hits 1–12 under a smooth
//   fast-forward (film 12.6–17.75, sim time S(t) = t + Σ a_k·∫bump_k, solved so hit 4 lands on "fourth" and hit 12 on
//   "twelfth"), the first orange brick on "orange", breakout on "smallest"; live until CUT;
//   the wall-clearing fast-forward (bricks melt, the score counts exactly their points: 448, then the second wall, 896);
//   serve 3 segment: the ball on the empty field (still the same serve: half paddle, TOP speed).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { simulate, at, F, PW, SHRINK_S, VALUE, mulberry } from "./sim.mjs";
import { EV, FF1, CUT, CLEAR1, BUILD2, CLEAR2, SEG3, END } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const P = JSON.parse(fs.readFileSync(HERE + "game-params.json", "utf8"));
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

// ---------------------------------------------------------------- simulations
export const S1 = simulate({ ...P.serve1, alive: Uint8Array.from(P.serve1.alive) });
export const SERVE2 = P.serve2.t0;
export const S2 = simulate({ ...P.serve2, alive: S1.end.alive });

// ---------------------------------------------------------------- fast-forward time warp (serve 2)
const BUMPS = [[FF1.a, 15.95], [15.45, 17.4], [16.75, FF1.b]];
const bump = (t, [a, b]) => (t <= a || t >= b ? 0 : Math.sin((Math.PI * (t - a)) / (b - a)) ** 2);
const DTW = 1 / 600, TW0 = FF1.a, NW = Math.ceil((FF1.b - FF1.a) / DTW) + 1;
const I = BUMPS.map((bb) => { const out = new Float64Array(NW); for (let i = 1; i < NW; i++) out[i] = out[i - 1] + ((bump(TW0 + (i - 0.5) * DTW, bb)) * DTW); return out; });
const Iat = (k, t) => { const f = (t - TW0) / DTW; if (f <= 0) return 0; if (f >= NW - 1) return I[k][NW - 1]; const i = Math.floor(f); return I[k][i] + (I[k][i + 1] - I[k][i]) * (f - i); };
const A = (() => { // solve S(15.75)=h4, S(17.15)=h12, S(b)=h12+tail
  const w = P.warp, rows = [[15.75, w.h4], [17.15, w.h12], [FF1.b, w.h12 + w.tail]].map(([t, s]) => [BUMPS.map((_, k) => Iat(k, t)), s - t]);
  const M = rows.map((r) => [...r[0], r[1]]);
  for (let i = 0; i < 3; i++) { let p = i; for (let j = i + 1; j < 3; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j; [M[i], M[p]] = [M[p], M[i]]; for (let j = 0; j < 3; j++) if (j !== i) { const f = M[j][i] / M[i][i]; for (let k = i; k < 4; k++) M[j][k] -= f * M[i][k]; } }
  return M.map((r, i) => r[3] / r[i]);
})();
export const WARP_D = A.reduce((s, a, k) => s + a * I[k][NW - 1], 0);
export const rate = (t) => 1 + A.reduce((s, a, k) => s + a * bump(t, BUMPS[k]), 0);
/** Film → serve-2 sim time. */
export const S = (t) => (t <= FF1.a ? t : t >= FF1.b ? t + WARP_D : t + A.reduce((s, a, k) => s + a * Iat(k, t), 0));
/** Serve-2 sim → film time. */
export function Sinv(s) { if (s <= FF1.a) return s; if (s >= FF1.b + WARP_D) return s - WARP_D; let lo = FF1.a, hi = FF1.b; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (S(m) < s) lo = m; else hi = m; } return (lo + hi) / 2; }
{ let mn = 9; for (let t = FF1.a; t < FF1.b; t += 0.01) mn = Math.min(mn, rate(t)); if (mn <= 0.2) throw new Error("warp not monotone: min rate " + mn); }
export const RATE_MAX = (() => { let mx = 0; for (let t = FF1.a; t < FF1.b; t += 0.01) mx = Math.max(mx, rate(t)); return mx; })();

// ---------------------------------------------------------------- serve 3 (empty field)
export const S3 = simulate({ t0: SEG3, x: 232, y: 420, ang: (22 * Math.PI) / 180, down: true, level: 3, hits: S2.hits.length, alive: new Uint8Array(112), ...(() => { const r = mulberry(777); return { zones: Array.from({ length: 40 }, () => [1, 2, 0, 3][Math.floor(r() * 4)]), offs: Array.from({ length: 40 }, () => 0.25 + 0.5 * r()) }; })(), missAfter: null, half: true, tEnd: END + 0.5 });

// ---------------------------------------------------------------- events in film time
const f2 = (s) => Sinv(s);
export const LOST1 = S1.lost, OUT1 = S1.out;
export const SHRINK1 = S1.shrink, SHRINK2 = f2(S2.shrink);
export const HITS = [
  ...S1.hits.map((h) => ({ ...h, t: h.t, serve: 1 })),
  ...S2.hits.map((h) => ({ ...h, t: f2(h.t), serve: 2 })).filter((h) => h.t < CUT),
  ...S3.hits.map((h) => ({ ...h, serve: 3 })),
];
export const WALLS = [...S1.walls.filter((t) => t < OUT1), ...S2.walls.map(f2).filter((t) => t < CUT && t > SERVE2), ...S3.walls];
export const TOPS = [...S1.tops, ...S2.tops.map(f2).filter((t) => t < CUT), ...S3.tops];
export const LEVELS = [{ t: -10, level: P.serve1.level }, ...S1.levels, { t: SERVE2, level: 0, reset: true }, ...S2.levels.map((l) => ({ ...l, t: f2(l.t) })).filter((l) => l.t < CUT)];
export const ORANGE_T = f2(S2.levels.find((l) => l.level === 3).t);

// bricks: wall 1 removal time (−∞ = broken before the film), wall 2 appear/removal times
export const BRICKS = [];
for (let i = 0; i < 112; i++) BRICKS.push({ i, row: Math.floor(i / 14), col: i % 14, gone1: P.serve1.alive[i] ? null : -Infinity, hit1: false, in2: 0, gone2: 0 });
for (const b of S1.bricks) { BRICKS[b.i].gone1 = b.t; BRICKS[b.i].hit1 = true; }
for (const b of S2.bricks) { const t = f2(b.t); if (t < CUT) { BRICKS[b.i].gone1 = t; BRICKS[b.i].hit1 = true; } }
// the clearing fast-forward: remaining wall-1 bricks melt bottom row first, sweeping across; wall 2 builds top row first
{ const rest = BRICKS.filter((b) => b.gone1 == null).sort((a, b) => b.row - a.row || (b.row % 2 ? a.col - b.col : b.col - a.col));
  rest.forEach((b, k) => { b.gone1 = CLEAR1[0] + (CLEAR1[1] - CLEAR1[0] - 0.12) * ease((k + 0.5) / rest.length) * 0.98 + 0.0; b.ff = true; });
  for (const b of BRICKS) b.in2 = BUILD2[0] + b.row * 0.085 + b.col * 0.012;
  const order = [...BRICKS].sort((a, b) => b.row - a.row || (b.row % 2 ? a.col - b.col : b.col - a.col));
  order.forEach((b, k) => { b.gone2 = CLEAR2[0] + (CLEAR2[1] - CLEAR2[0] - 0.12) * ease((k + 0.5) / 112); }); }
export const POINTS = [];
for (const b of BRICKS) { if (b.gone1 > -Infinity) POINTS.push({ t: b.gone1, v: VALUE[b.row], ff: !!b.ff }); POINTS.push({ t: b.gone2, v: VALUE[b.row], ff: true }); }
POINTS.sort((a, b) => a.t - b.t);
export const SCORE0 = BRICKS.filter((b) => b.gone1 === -Infinity).reduce((s, b) => s + VALUE[b.row], 0);
/** Continuous score (odometer value): each brick's points roll in over 0.15 s (0.06 s in the fast-forwards). */
export function score(t) { let v = SCORE0; for (const p of POINTS) { if (p.t > t) break; v += p.v * clamp01((t - p.t) / (p.ff ? 0.06 : 0.15)); } return v; }
export const BRICK_FADE = 0.12;
/** Wall-1 / wall-2 brick visibility (1 = solid) and the hit flash (0..1). */
export function brickA(b, t) {
  let a1 = b.gone1 === -Infinity ? 0 : b.gone1 == null ? 1 : 1 - clamp01((t - b.gone1) / BRICK_FADE);
  const a2 = clamp01((t - b.in2) / 0.28) * (1 - clamp01((t - b.gone2) / BRICK_FADE));
  const fl = b.gone1 > -Infinity && b.gone1 != null ? Math.max(0, 1 - Math.abs(t - b.gone1 - 0.02) / 0.1) : 0;
  return { a: Math.max(a1, a2), flash: fl, two: a2 > a1 };
}

// ---------------------------------------------------------------- ball
export const BALL2_IN = [SERVE2, SERVE2 + 0.3], BALL2_OUT = [CUT - 0.2, CUT + 0.08], BALL3_IN = [SEG3, SEG3 + 0.3];
/** Ball top-left at film time t (null when it does not exist). */
export function ballAt(t) {
  if (t < SERVE2) return t <= OUT1 ? at(S1, t) : null;
  if (t < BALL2_OUT[1]) return at(S2, S(t));
  if (t >= SEG3) return at(S3, t);
  return null;
}
export function ballAlpha(t) {
  if (t < SERVE2) return 1;
  if (t < BALL2_OUT[1]) return Math.min(clamp01((t - BALL2_IN[0]) / 0.3), 1 - clamp01((t - BALL2_OUT[0]) / (BALL2_OUT[1] - BALL2_OUT[0])));
  if (t >= SEG3) return clamp01((t - BALL3_IN[0]) / 0.3);
  return 0;
}

// ---------------------------------------------------------------- paddle
const KEYS = []; // [t, centre x]
{ const h1 = S1.hits; KEYS.push([-1, h1[0].cx]); for (const h of HITS.filter((h) => h.serve === 1)) KEYS.push([h.t, h.cx]);
  // the miss: the paddle chases the ball and arrives just too late (a little short of it)
  const b = at(S1, LOST1), last = KEYS[KEYS.length - 1][1], side = Math.sign(last - (b[0] + 3)) || 1; KEYS.push([LOST1 + 0.06, b[0] + 3 + side * (PW[1] / 2 + 9)]);
  for (const h of HITS.filter((h) => h.serve === 2)) KEYS.push([h.t, h.cx]);
  for (const h of HITS.filter((h) => h.serve === 3)) KEYS.push([h.t, h.cx]); }
export function paddleX(t) {
  if (t <= KEYS[0][0]) return KEYS[0][1];
  for (let i = 1; i < KEYS.length; i++) if (t <= KEYS[i][0]) {
    const [ta, xa] = KEYS[i - 1], [tb, xb] = KEYS[i], gap = tb - ta, s0 = ta + Math.min(0.05, gap * 0.15), s1 = tb - Math.min(0.12, gap * 0.25);
    return xa + (xb - xa) * ease((t - s0) / Math.max(0.02, s1 - s0));
  }
  return KEYS[KEYS.length - 1][1];
}
export const REGROW = [SERVE2, SERVE2 + 0.32];
export function paddleW(t) {
  if (t < SERVE2) return t < SHRINK1 ? PW[0] : PW[0] + (PW[1] - PW[0]) * ease((t - SHRINK1) / SHRINK_S);
  if (t < SHRINK2) return PW[1] + (PW[0] - PW[1]) * ease((t - REGROW[0]) / (REGROW[1] - REGROW[0]));
  return PW[0] + (PW[1] - PW[0]) * ease((t - SHRINK2) / SHRINK_S);
}

// ---------------------------------------------------------------- HUD values
/** Speed gauge needle (0 SLOW … 3 TOP, continuous): each change sweeps in 0.25 s (the reset on a serve in 0.45 s). */
export function needle(t) { let v = LEVELS[0].level; for (let i = 1; i < LEVELS.length; i++) { const l = LEVELS[i]; if (t <= l.t) break; const d = l.reset ? 0.45 : 0.25; v = v + (l.level - v) * ease((t - l.t) / d); } return v; }
export const level = (t) => { let v = LEVELS[0].level; for (const l of LEVELS) if (t >= l.t) v = l.level; return v; };
/** Paddle-hit counter of the current serve (continuous, rolls 0.12 s per hit); serve 1 starts at its earlier hits. */
export function hitsValue(t) {
  if (t < SERVE2) { let v = P.serve1.hits; for (const h of HITS) if (h.serve === 1 && h.t <= t) v += clamp01((t - h.t) / 0.12); return v; }
  let v = 0; for (const h of HITS) if (h.serve >= 2 && h.t <= t) v += clamp01((t - h.t) / (h.t > FF1.a && h.t < FF1.b ? 0.06 : 0.12)); return v;
}
export const HIT4 = HITS.filter((h) => h.serve === 2)[3].t, HIT12 = HITS.filter((h) => h.serve === 2)[11].t;
