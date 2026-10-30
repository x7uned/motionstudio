// A Pac-Man "player" that plays one lap against the rule-driven ghosts: at every crossing it looks ahead (a short
// rollout of the real ghost rules) and takes the exit that keeps the ghosts far, preferring uneaten dots and going
// straight; it closes the lap at (12,4) heading left after exactly L tiles (REACH table).
// aiRoute(L, g0, ghostRatio, seed) → { wp, minD }.
import { MW, MH, isOpen, DIRS, ORDER, REV, exits, cell } from "../maze.mjs";
import { TAU_END } from "../timeline.mjs";
import { GHOSTS, SCATTER, mode, targetOf, choose } from "../sim.mjs";

const PELLET = (x, y) => cell(x, y) === "o";
export const BLOCK = new Set();
for (let changed = true; changed; ) { changed = false; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const k = `${x},${y}`; if (BLOCK.has(k) || !isOpen(x, y)) continue; if (PELLET(x, y) || ORDER.filter((d) => isOpen(x + DIRS[d][0], y + DIRS[d][1]) && !BLOCK.has(`${x + DIRS[d][0]},${y + DIRS[d][1]}`) && !PELLET(x + DIRS[d][0], y + DIRS[d][1])).length < 2) { BLOCK.add(k); changed = true; } } }
const pOpen = (x, y) => isOpen(x, y) && !BLOCK.has(`${x},${y}`);
const pexits = (x, y) => ORDER.filter((d) => pOpen(x + DIRS[d][0], y + DIRS[d][1]));
const SK = (x, y, d) => `${x},${y},${d}`;
// REACH[k]: states (tile, heading) that can reach the start state in exactly k more steps without reversing
const REACHES = new Map();
function reachFor(sx, sy, sd) {
  const key = SK(sx, sy, sd); if (REACHES.has(key)) return REACHES.get(key);
  const R = [new Set([key])];
  for (let k = 1; k <= 240; k++) { const S = new Set(); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (pOpen(x, y)) for (const d of ORDER) { for (const e of pexits(x, y)) { if (e === REV[d]) continue; if (R[k - 1].has(SK(x + DIRS[e][0], y + DIRS[e][1], e))) { S.add(SK(x, y, d)); break; } } } R.push(S); }
  REACHES.set(key, R); return R;
}

export function aiRoute(L, g0, ghostRatio, seed = 1, opts0 = {}) {
  const [sx, sy, sdir] = opts0.start ?? [12, 4, "left"], REACH = reachFor(sx, sy, sdir);
  let sd = seed; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  const TEFF = TAU_END - 2 * (SCATTER[1] - SCATTER[0]), PAC_V = L / TAU_END, GV = Math.round(ghostRatio * PAC_V * TEFF) / TEFF;
  const H = opts0.horizon ?? 2.6;
  const make = () => { const S = { t: 0, P: { x: sx, y: sy, dir: sdir, u: 0.5, t: 0, n: 0 }, g: {} }; for (const n of GHOSTS) { const [x, y, dir, u] = g0[n]; S.g[n] = { x, y, dir, u, t: 0 }; } return S; };
  const clone = (S) => ({ t: S.t, P: { ...S.P }, g: Object.fromEntries(GHOSTS.map((n) => [n, { ...S.g[n] }])) });
  const gpos = (s, t) => { const k = s.u + (t - s.t) * GV; return [s.x + 0.5 + DIRS[s.dir][0] * k, s.y + 0.5 + DIRS[s.dir][1] * k]; };
  const ppos = (P, t) => { const k = P.u + (t - P.t) * PAC_V; return { x: P.x + 0.5 + DIRS[P.dir][0] * k, y: P.y + 0.5 + DIRS[P.dir][1] * k, dir: P.dir }; };
  const feasible = (P, left) => pexits(P.x, P.y).filter((d) => d !== REV[P.dir] && REACH[left - 1]?.has(SK(P.x + DIRS[d][0], P.y + DIRS[d][1], d)));
  // advance S to time tEnd; Pac-Man decisions by policy(S, options) ; returns min distance seen
  function run(S, tEnd, policy, onPac, probe) {
    let minD = 99;
    for (;;) {
      let next = tEnd, who = null, sw = null;
      for (const n of GHOSTS) { const s = S.g[n], ta = s.t + (1 - s.u) / GV; if (ta < next - 1e-12) { next = ta; who = n; } }
      { const ta = S.P.t + (1 - S.P.u) / PAC_V; if (ta < next - 1e-12) { next = ta; who = "pac"; } }
      for (const w of SCATTER) if (w > S.t + 1e-12 && w < next - 1e-12) { next = w; who = null; sw = w; }
      for (let k = 1; k <= 3; k++) { const tt = S.t + ((next - S.t) * k) / 3, pp = ppos(S.P, tt); if (probe) probe(tt, (next - S.t) / 3, pp, Object.fromEntries(GHOSTS.map((n) => { const [gx, gy] = gpos(S.g[n], tt); return [n, { x: gx, y: gy, dir: S.g[n].dir }]; }))); for (const n of GHOSTS) { const [gx, gy] = gpos(S.g[n], tt); const dd = Math.hypot(gx - pp.x, gy - pp.y); if (dd < minD) { minD = dd; if (onPac) S.hit = { t: tt, n, left: L - S.P.n }; } } }
      if (next >= tEnd - 1e-12) { S.t = tEnd; return minD; }
      S.t = next;
      if (sw !== null) { for (const n of GHOSTS) { const s = S.g[n]; s.u += (S.t - s.t) * GV; s.t = S.t; s.x += DIRS[s.dir][0]; s.y += DIRS[s.dir][1]; s.dir = REV[s.dir]; s.u = 1 - s.u; } continue; }
      if (who === "pac") {
        const P = S.P; P.x += DIRS[P.dir][0]; P.y += DIRS[P.dir][1]; P.u = 0; P.t = S.t; P.n++;
        if (onPac) onPac(P);
        if (P.n >= L) { P.dir = sdir; continue; }
        const o = feasible(P, L - P.n); if (!o.length) return -1;
        P.dir = o.length === 1 ? o[0] : policy(S, o);
        continue;
      }
      const s = S.g[who]; s.x += DIRS[s.dir][0]; s.y += DIRS[s.dir][1]; s.u = 0; s.t = S.t;
      const m = mode(S.t + 1e-9), pp = ppos(S.P, S.t), rr = gpos(S.g.red, S.t);
      s.dir = choose(s.x, s.y, s.dir, targetOf(who, m, pp, s.x, s.y, [Math.floor(rr[0]), Math.floor(rr[1])]));
    }
  }
  // rollout policy: one-step greedy away from the nearest ghost
  const greedy = (S, o) => { let best = o[0], bv = -1; for (const d of o) { const nx = S.P.x + DIRS[d][0], ny = S.P.y + DIRS[d][1]; let v = 99; for (const n of GHOSTS) { const [gx, gy] = gpos(S.g[n], S.t); v = Math.min(v, Math.hypot(gx - nx - 0.5, gy - ny - 0.5)); } if (v > bv) { bv = v; best = d; } } return best; };
  const eaten = new Set(), tiles = [[sx, sy]];
  const S = make();
  // story probe: rewards the moments the narration needs (only when opts0.story is on)
  const lineOf = (G, P) => (Math.abs(G.y - P.y) < 0.35 ? "row" : Math.abs(G.x - P.x) < 0.35 ? "col" : null);
  const clearL = (G, P) => { const n = Math.ceil(Math.abs(G.x - P.x) + Math.abs(G.y - P.y)) * 2; for (let i = 0; i <= n; i++) { const x = P.x + ((G.x - P.x) * i) / Math.max(1, n), y = P.y + ((G.y - P.y) * i) / Math.max(1, n); if (!isOpen(Math.floor(x), Math.floor(y))) return false; } return true; };
  const along = (G, P) => { const d = DIRS[P.dir]; return (G.x - P.x) * d[0] + (G.y - P.y) * d[1]; };
  const W = opts0.story || {};
  const story = (acc) => (tt, dt, P, G) => {
    const behind = (n, a, b) => lineOf(G[n], P) && clearL(G[n], P) && along(G[n], P) < -a && along(G[n], P) > -b;
    if (tt > 0.8 && tt < 3.4 && behind("red", 2.5, 8)) acc.v += (W.open ?? 0) * dt;
    if (tt > 11.0 && tt < 12.95) { const K = G.pink, a = along(K, P), dd = Math.hypot(K.x - P.x, K.y - P.y); if (a > 1.2 && dd < 9) acc.v += (W.pink ?? 0) * dt * (lineOf(K, P) && clearL(K, P) && K.dir === REV[P.dir] ? 2 : 1); }
    if (tt > 14.6 && tt < 15.7 && behind("red", 1.5, 7)) acc.v += (W.blue ?? 0) * dt;
    if (tt > 15.85 && tt < 17.8 && along(G.red, P) < -0.8 && along(G.blue, P) > 0.8 && Math.hypot(G.red.x - P.x, G.red.y - P.y) < 8 && Math.hypot(G.blue.x - P.x, G.blue.y - P.y) < 8) acc.v += (W.pincer ?? 0) * dt * (lineOf(G.blue, P) && clearL(G.blue, P) ? 2 : 1);
    const od = Math.hypot(Math.floor(G.orange.x) - Math.floor(P.x), Math.floor(G.orange.y) - Math.floor(P.y));
    if (tt > 18.8 && tt < 21.3 && od > 8.2 && od < 12) acc.v += (W.orangeFar ?? 0) * dt;
    if (tt > 21.4 && tt < 21.9 && od <= 8 && od > 6) acc.v += (W.orangeIn ?? 0) * dt;
  };
  const main = (St, o) => {
    let best = o[0], bv = -1e9;
    for (const d of o) {
      const R = clone(St); R.P.dir = d; const acc = { v: 0 }; const md = run(R, Math.min(TAU_END, St.t + H), greedy, null, opts0.story ? story(acc) : null);
      let food = 0, x = St.P.x + DIRS[d][0], y = St.P.y + DIRS[d][1]; for (let k = 0; k < 6 && isOpen(x, y); k++) { if (cell(x, y) === "." && !eaten.has(`${x},${y}`)) food++; x += DIRS[d][0]; y += DIRS[d][1]; }
      const v = Math.min(md, 3.2) * 10 + food * 0.7 + (d === St.P.dir ? 1 : 0) + acc.v + rnd() * (opts0.noise ?? 2);
      if (v > bv) { bv = v; best = d; }
    }
    return best;
  };
  const minD = run(S, TAU_END, main, (P) => { tiles.push([P.x, P.y]); eaten.add(`${P.x},${P.y}`); });
  if (minD < 0 || S.P.n !== L || S.P.x !== sx || S.P.y !== sy) return null;
  const wp = [tiles[0]];
  for (let i = 1; i < tiles.length - 1; i++) { const [ax, ay] = tiles[i - 1], [bx, by] = tiles[i], [cx, cy] = tiles[i + 1]; if (bx - ax !== cx - bx || by - ay !== cy - by) wp.push(tiles[i]); }
  wp.push(tiles[tiles.length - 1]);
  return { wp, minD, hit: S.hit };
}
