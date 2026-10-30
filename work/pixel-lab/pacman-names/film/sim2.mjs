// Fixed-step arcade ghost rules (The Pac-Man Dossier), for films where speeds change (Cruise Elroy, dot pauses) or
// Pac-Man stands still. At every tile centre a ghost takes the open exit (never the reverse) whose next tile is closest
// in a straight line to its target; ties go up > left > down > right; on the no-up tiles a ghost in chase or scatter
// may not choose "up"; every chase↔scatter switch reverses all ghosts.
// The simulation is a pure function of its inputs; samples are stored every 1/SAMPLE s of game time for lookups.
import { DIRS, ORDER, REV } from "./maze.mjs";

export const GHOSTS = ["red", "pink", "blue", "orange"];

// standard chase targets (Pac-Man P = {x, y, dir} in tile units, centres at +0.5)
export function chaseTarget(name, P, gx, gy, red, corner) {
  const px = Math.floor(P.x), py = Math.floor(P.y), d = DIRS[P.dir], up = P.dir === "up";
  if (name === "red") return [px, py];
  if (name === "pink") return [px + d[0] * 4 - (up ? 4 : 0), py + d[1] * 4];
  if (name === "blue") { const ax = px + d[0] * 2 - (up ? 2 : 0), ay = py + d[1] * 2; return [2 * ax - red[0], 2 * ay - red[1]]; }
  const dx = gx - px, dy = gy - py; return dx * dx + dy * dy >= 64 ? [px, py] : corner;
}

export function pickDir(maze, x, y, dir, T, noUpHere) {
  let opts = maze.exits(x, y).filter((d) => d !== REV[dir]);
  if (noUpHere) opts = opts.filter((d) => d !== "up");
  if (!opts.length) return REV[dir];
  let best = opts[0], bd = Infinity;
  for (const d of ORDER) { if (!opts.includes(d)) continue; const nx = x + DIRS[d][0], ny = y + DIRS[d][1], dd = (nx - T[0]) ** 2 + (ny - T[1]) ** 2; if (dd < bd) { bd = dd; best = d; } }
  return best;
}

/**
 * runGhosts({ maze, G0, t0, t1, dt, pacAt, modeAt, speedOf, targetOf, noUp, sample })
 *   G0: { name: [x, y, dir, u] } at t0; pacAt(τ) → {x, y, dir}; modeAt(τ) → "chase" | "scatter" | "fright";
 *   speedOf(name, τ) → tiles/s; targetOf(name, mode, P, gx, gy, redTile, τ) → [tx, ty]; noUp: Set("x,y").
 * Returns { at(name, τ) → {x, y, dir, T}, decisions: [...], end: G at t1 }.
 */
export function runGhosts(o) {
  const dt = o.dt ?? 1 / 480, SAMPLE = o.sample ?? 120, st = {}, rec = {}, decisions = [];
  for (const n of GHOSTS) { if (!o.G0[n]) continue; const [x, y, dir, u] = o.G0[n]; st[n] = { x, y, dir, u, T: [x, y] }; rec[n] = []; }
  const names = Object.keys(st);
  const tileOf = (s) => { const k = s.u >= 0.5 ? 1 : 0; return [s.x + DIRS[s.dir][0] * k, s.y + DIRS[s.dir][1] * k]; };
  const posOf = (s) => [s.x + 0.5 + DIRS[s.dir][0] * s.u, s.y + 0.5 + DIRS[s.dir][1] * s.u];
  let mPrev = o.modeAt(o.t0), nextSample = o.t0;
  const steps = Math.ceil((o.t1 - o.t0) / dt);
  for (let i = 0; i <= steps; i++) {
    const τ = Math.min(o.t1, o.t0 + i * dt);
    // mode switch: chase ↔ scatter reverses everyone in place
    const m = o.modeAt(τ);
    if (m !== mPrev && m !== "fright" && mPrev !== "fright") for (const n of names) { const s = st[n]; s.x += DIRS[s.dir][0]; s.y += DIRS[s.dir][1]; s.dir = REV[s.dir]; s.u = 1 - s.u; }
    mPrev = m;
    while (nextSample <= τ + 1e-9) { for (const n of names) { const s = st[n], [px, py] = posOf(s); rec[n].push([px, py, s.dir, s.T[0], s.T[1]]); } nextSample += 1 / SAMPLE; }
    if (i === steps) break;
    const P = o.pacAt(τ), redS = st.red, redT = redS ? tileOf(redS) : [0, 0];
    for (const n of names) {
      const s = st[n]; let dist = o.speedOf(n, τ) * dt;
      for (let guard = 0; dist > 1e-12 && guard < 8; guard++) {
        const rem = 1 - s.u;
        if (dist < rem) { s.u += dist; dist = 0; break; }
        dist -= rem; s.x += DIRS[s.dir][0]; s.y += DIRS[s.dir][1]; s.u = 0;
        const T = o.targetOf(n, m, P, s.x, s.y, redT, τ), was = s.dir;
        s.T = T; s.dir = m === "fright" && o.frightDir ? o.frightDir(n, s.x, s.y, s.dir, τ) : pickDir(o.maze, s.x, s.y, s.dir, T, m !== "fright" && o.noUp?.has(`${s.x},${s.y}`));
        const opts = o.maze.exits(s.x, s.y).filter((d) => d !== REV[was]);
        if (opts.length > 1) decisions.push({ τ, n, x: s.x, y: s.y, from: was, opts, took: s.dir, T, m, noUp: !!o.noUp?.has(`${s.x},${s.y}`) });
      }
    }
  }
  const end = Object.fromEntries(names.map((n) => { const s = st[n]; return [n, [s.x, s.y, s.dir, s.u]]; }));
  function at(n, τ) {
    const L = rec[n], f = (τ - o.t0) * SAMPLE, i = Math.max(0, Math.min(L.length - 2, Math.floor(f))), k = Math.max(0, Math.min(1, f - i)), a = L[i], b = L[i + 1];
    // across a turn the straight blend would cut the corner: snap to the nearer sample's axis
    let x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k;
    if (a[2] !== b[2] && Math.abs(b[0] - a[0]) > 1e-6 && Math.abs(b[1] - a[1]) > 1e-6) { const c = k < 0.5 ? a : b; if (DIRS[c[2]][0] === 0) x = c[0]; else y = c[1]; }
    const c = k < 0.5 ? a : b;
    return { x, y, dir: c[2], T: [c[3], c[4]] };
  }
  return { at, decisions, end, rec };
}

/**
 * Pac-Man on a fixed route of waypoints [[x, y], ...] (tile coords), moving at `speed(τ)` tiles/s, stopping for
 * `pause` s on every uneaten dot he reaches (dot set: "x,y" keys). A dot is eaten when his centre is 0.3 tiles before
 * the dot's centre. Returns { at(τ) → {x, y, dir, s}, eats: [{key, τ}], dotsLeftAt(τ) }.
 */
export function runPac({ route, t0, t1, speed, pause = 0, dots, start = 0, dt = 1 / 960, sample = 240, stopAt = null }) {
  const SEG = []; let L = 0;
  for (let i = 0; i + 1 < route.length; i++) { const [ax, ay] = route[i], [bx, by] = route[i + 1], len = Math.abs(bx - ax) + Math.abs(by - ay), dir = ORDER.find((d) => DIRS[d][0] === Math.sign(bx - ax) && DIRS[d][1] === Math.sign(by - ay)); SEG.push({ ax, ay, len, dir, s: L }); L += len; }
  const where = (s) => { s = Math.max(0, Math.min(L, s)); let i = SEG.length - 1; while (i > 0 && SEG[i].s > s) i--; const g = SEG[i], k = s - g.s, d = DIRS[g.dir]; return { x: g.ax + 0.5 + d[0] * k, y: g.ay + 0.5 + d[1] * k, dir: g.dir }; };
  // the arc position of each tile centre along the route (first visit only)
  const visits = [];
  for (const g of SEG) for (let k = 1; k <= g.len; k++) visits.push({ key: `${g.ax + DIRS[g.dir][0] * k},${g.ay + DIRS[g.dir][1] * k}`, s: g.s + k - 0.3 });
  const left = new Set(dots), eats = [], rec = [];
  let s = start, hold = 0, vi = 0, next = t0;
  while (vi < visits.length && visits[vi].s < s) vi++;
  const steps = Math.ceil((t1 - t0) / dt);
  for (let i = 0; i <= steps; i++) {
    const τ = Math.min(t1, t0 + i * dt);
    while (next <= τ + 1e-9) { const p = where(s); rec.push([p.x, p.y, p.dir, s]); next += 1 / sample; }
    if (i === steps) break;
    if (stopAt !== null && s >= stopAt) { s = stopAt; continue; }
    if (hold > 0) { hold -= dt; continue; }
    s += speed(τ) * dt;
    while (vi < visits.length && visits[vi].s <= s) { const v = visits[vi++]; if (left.has(v.key)) { left.delete(v.key); eats.push({ key: v.key, τ }); hold += pause; } }
  }
  function at(τ) { const f = (τ - t0) * sample, i = Math.max(0, Math.min(rec.length - 2, Math.floor(f))), k = Math.max(0, Math.min(1, f - i)), a = rec[i], b = rec[i + 1]; const sx = a[3] + (b[3] - a[3]) * k, p = where(sx); return { ...p, s: sx }; }
  const total = dots.length ?? dots.size;
  function dotsLeftAt(τ) { let n = 0; for (const e of eats) if (e.τ <= τ) n++; return total - n; }
  return { at, eats, dotsLeftAt, L, SEG };
}
