// «The red ghost gets faster when you're almost done» — the game engine. Fixed-step and deterministic.
// Arcade rules (The Pac-Man Dossier, level 1), on our own maze:
//  - speeds on one scale where 100 = Pac-Man's top speed: Pac-Man 80, ghosts 75, Blinky 80 with 20 dots left
//    ("Elroy 1") and 85 with 10 left ("Elroy 2"); every dot Pac-Man eats stops him for one frame (1/60 s), a power
//    pellet for three — so in a row of dots he averages about 71;
//  - ghosts: at every tile centre the open exit (never the reverse) whose next tile is closest in a straight line to the
//    target; ties up > left > down > right; chase↔scatter switches reverse everyone;
//  - chase targets: red = Pac-Man's tile, pink = 4 ahead (up-bug), blue = red mirrored through 2 ahead (up-bug),
//    orange = Pac-Man while farther than 8 tiles, else his corner; scatter = corners, except Blinky once he is Elroy:
//    he keeps aiming at Pac-Man.
// The film plays the game slower than the arcade (V100 tiles/s instead of 9.47) and stretches the one-frame pause by
// the same factor, so every ratio stays the arcade's.
import { MW, MH, DIRS, ORDER, REV, exits, isOpen, CORNER, cell } from "./maze.mjs";

export const GHOSTS = ["red", "pink", "blue", "orange"];
export const ARCADE_V100 = 75.75757625 / 8;   // tiles per second (Dossier: 100% = 75.75757625 px/s, 8 px per tile)
export const SPEED = { pac: 0.8, ghost: 0.75, elroy1: 0.8, elroy2: 0.85 };
export const ELROY = [20, 10];
// level-1 scatter/chase (s of level time): scatter 7, chase 20, scatter 7, chase 20, scatter 5, chase 20, scatter 5, chase ∞
export const SCHEDULE = [[0, "scatter"], [7, "chase"], [27, "scatter"], [34, "chase"], [54, "scatter"], [59, "chase"], [79, "scatter"], [84, "chase"]];

export function chaseTarget(name, P, gx, gy, red) {
  const px = P.x, py = P.y, d = DIRS[P.dir], up = P.dir === "up";
  if (name === "red") return [px, py];
  if (name === "pink") return [px + d[0] * 4 - (up ? 4 : 0), py + d[1] * 4];
  if (name === "blue") { const ax = px + d[0] * 2 - (up ? 2 : 0), ay = py + d[1] * 2; return [2 * ax - red[0], 2 * ay - red[1]]; }
  const dx = gx - px, dy = gy - py; return dx * dx + dy * dy >= 64 ? [px, py] : CORNER.orange;
}
function pick(x, y, dir, T) {
  const opts = exits(x, y).filter((d) => d !== REV[dir]); if (!opts.length) return REV[dir];
  let best = opts[0], bd = Infinity;
  for (const d of ORDER) { if (!opts.includes(d)) continue; const nx = x + DIRS[d][0], ny = y + DIRS[d][1], dd = (nx - T[0]) ** 2 + (ny - T[1]) ** 2; if (dd < bd) { bd = dd; best = d; } }
  return best;
}

export class Engine {
  // cfg: { dots: [keys], pac: [x, y, dir, u], ghosts: { n: [x, y, dir, u] }, V100, levelT0 }
  constructor(cfg, copy = null) {
    if (copy) { Object.assign(this, copy); return; }
    this.V = cfg.V100; this.pause = (1 / 60) * (ARCADE_V100 / cfg.V100); this.levelT0 = cfg.levelT0;
    this.τ = 0; this.dots = new Set(cfg.dots); this.total = this.dots.size;
    const [x, y, dir, u] = cfg.pac; this.P = { x, y, dir, u, hold: 0, ate: false };
    this.g = {}; for (const n of GHOSTS) { const [gx, gy, gd, gu] = cfg.ghosts[n]; this.g[n] = { x: gx, y: gy, dir: gd, u: gu, T: [gx, gy] }; }
    this.mode = this.modeAt(0); this.eats = []; this.caught = null;
  }
  clone() { const c = new Engine(null, { ...this }); c.dots = new Set(this.dots); c.P = { ...this.P }; c.g = Object.fromEntries(GHOSTS.map((n) => [n, { ...this.g[n] }])); c.eats = []; return c; }
  modeAt(τ) { const L = this.levelT0 + τ; let m = "scatter"; for (const [t, k] of SCHEDULE) if (L >= t) m = k; return m; }
  elroy() { const n = this.dots.size; return n <= ELROY[1] ? 2 : n <= ELROY[0] ? 1 : 0; }
  speedOf(n) { if (n === "pac") return this.V * SPEED.pac; const e = n === "red" ? this.elroy() : 0; return this.V * (e === 2 ? SPEED.elroy2 : e === 1 ? SPEED.elroy1 : SPEED.ghost); }
  pacTile() { const P = this.P, k = P.u >= 0.5 ? 1 : 0; return { x: P.x + DIRS[P.dir][0] * k, y: P.y + DIRS[P.dir][1] * k, dir: P.dir }; }
  pacPos() { const P = this.P; return [P.x + 0.5 + DIRS[P.dir][0] * P.u, P.y + 0.5 + DIRS[P.dir][1] * P.u]; }
  ghostPos(n) { const s = this.g[n]; return [s.x + 0.5 + DIRS[s.dir][0] * s.u, s.y + 0.5 + DIRS[s.dir][1] * s.u]; }
  ghostTile(n) { const s = this.g[n], k = s.u >= 0.5 ? 1 : 0; return [s.x + DIRS[s.dir][0] * k, s.y + DIRS[s.dir][1] * k]; }
  targetOf(n, m) {
    const P = this.pacTile(), s = this.g[n];
    if (m === "scatter" && !(n === "red" && this.elroy() > 0)) return CORNER[n];
    return chaseTarget(n, P, s.x, s.y, this.ghostTile("red"));
  }
  // one step; policy(E) is asked for Pac-Man's heading at every tile centre (it may reverse)
  step(dt, policy) {
    const m = this.modeAt(this.τ + dt);
    if (m !== this.mode) { for (const n of GHOSTS) { const s = this.g[n]; s.x += DIRS[s.dir][0]; s.y += DIRS[s.dir][1]; s.dir = REV[s.dir]; s.u = 1 - s.u; } this.mode = m; }
    // Pac-Man
    const P = this.P;
    if (P.hold > 0) P.hold -= dt;
    else {
      let dist = this.speedOf("pac") * dt;
      for (let guard = 0; dist > 1e-12 && guard < 6; guard++) {
        if (!isOpen(P.x + DIRS[P.dir][0], P.y + DIRS[P.dir][1])) { const o = exits(P.x, P.y); P.dir = policy ? policy(this, o) : o[0]; P.u = 0; if (!isOpen(P.x + DIRS[P.dir][0], P.y + DIRS[P.dir][1])) break; }
        const before = P.u, rem = 1 - P.u, mv = Math.min(dist, rem);
        P.u += mv; dist -= mv;
        if (before < 0.7 && P.u >= 0.7) { const k = `${P.x + DIRS[P.dir][0]},${P.y + DIRS[P.dir][1]}`; if (this.dots.has(k)) { this.dots.delete(k); this.eats.push({ key: k, τ: this.τ }); P.hold = this.pause * (cell(P.x + DIRS[P.dir][0], P.y + DIRS[P.dir][1]) === "o" ? 3 : 1); dist = 0; } }
        if (P.u >= 1 - 1e-12) { P.x += DIRS[P.dir][0]; P.y += DIRS[P.dir][1]; P.u = 0; const o = exits(P.x, P.y); P.dir = policy ? policy(this, o) : (o.includes(P.dir) ? P.dir : o[0]); }
      }
    }
    // ghosts
    for (const n of GHOSTS) {
      const s = this.g[n]; let dist = this.speedOf(n) * dt;
      for (let guard = 0; dist > 1e-12 && guard < 6; guard++) {
        const rem = 1 - s.u; if (dist < rem) { s.u += dist; break; }
        dist -= rem; s.x += DIRS[s.dir][0]; s.y += DIRS[s.dir][1]; s.u = 0;
        s.T = this.targetOf(n, this.mode); s.dir = pick(s.x, s.y, s.dir, s.T);
      }
    }
    this.τ += dt;
    const [px, py] = this.pacPos();
    for (const n of GHOSTS) { const [gx, gy] = this.ghostPos(n); if (Math.hypot(gx - px, gy - py) < 0.9 && !this.caught) this.caught = { n, τ: this.τ }; }
  }
}
