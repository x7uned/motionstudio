// The game itself. Pac-Man follows a closed route at constant speed; the four ghosts are SIMULATED with the arcade rules
// (The Pac-Man Dossier): at every tile they take the open exit (never the reverse) whose next tile is closest in a
// straight line to their target tile; ties go up > left > down > right; every chase↔scatter switch reverses them.
// Chase targets: red = Pac-Man's tile; pink = 4 tiles ahead (up-bug: also 4 left); blue = red's tile mirrored through
// the tile 2 ahead (up-bug: also 2 left); orange = Pac-Man while farther than 8 tiles, else his corner.
// Loop: the ghosts start the film in G0 and live by the rules until they turn back at the end of scatter (τ_s). From
// there each takes the path back to its G0 that agrees best with the chase rule (speed within a few %), so the last
// frame flows into the first. Everything the narration explains happens under the plain rules.
// The configuration (route, opening states) is found by dev/search.mjs and stored in game.json.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { isOpen, DIRS, ORDER, REV, exits, CORNER } from "./maze.mjs";
// names film: the lap has its own game length cfg.Tg (s) and runs in chase mode only (no scatter switches);
// the film maps its clock onto the lap later (timeline.mjs), so the search does not depend on the voice take.

export const GHOSTS = ["red", "pink", "blue", "orange"];
export const DT = 1 / 240;
// scatter from "stop hunting" to "trap": the ghosts reach their corner loops, and turn back on "trap you"
// chase everywhere except an optional scatter window cfg.scatter = [a, b] (game seconds); see makeGame
export function modeFor(SC) { return (ta, Tg) => { const m = ((ta % Tg) + Tg) % Tg; return SC && m >= SC[0] && m < SC[1] ? "scatter" : "chase"; }; }
const tileOf = (p) => [Math.floor(p.x), Math.floor(p.y)];

export function targetOf(name, m, P, gx, gy, red) {
  if (m === "scatter") return CORNER[name];
  const [px, py] = tileOf(P), d = DIRS[P.dir], up = P.dir === "up";
  if (name === "red") return [px, py];
  if (name === "pink") return [px + d[0] * 4 - (up ? 4 : 0), py + d[1] * 4];
  if (name === "blue") { const ax = px + d[0] * 2 - (up ? 2 : 0), ay = py + d[1] * 2; return [ax + (ax - red[0]), ay + (ay - red[1])]; }
  const dx = gx - px, dy = gy - py; return dx * dx + dy * dy >= 64 ? [px, py] : CORNER.orange;
}
export function choose(gx, gy, dir, T) {
  const opts = exits(gx, gy).filter((d) => d !== REV[dir]);
  if (!opts.length) return REV[dir];
  let best = opts[0], bd = Infinity;
  for (const d of ORDER) { if (!opts.includes(d)) continue; const nx = gx + DIRS[d][0], ny = gy + DIRS[d][1], dd = (nx - T[0]) ** 2 + (ny - T[1]) ** 2; if (dd < bd) { bd = dd; best = d; } }
  return best;
}

export function makeGame(cfg) {
  const TAU_END = cfg.Tg, SCATTER = cfg.scatter ?? [cfg.Tg + 1, cfg.Tg + 2], mode0 = modeFor(cfg.scatter), mode = (ta) => mode0(ta, TAU_END);
  // ---------------------------------------------------------------- Pac-Man
  const SEG = []; let L = 0;
  for (let i = 0; i < cfg.route.length - 1; i++) {
    const [ax, ay] = cfg.route[i], [bx, by] = cfg.route[i + 1];
    if (ax !== bx && ay !== by) throw new Error(`route segment ${i} not straight`);
    const len = Math.abs(bx - ax) + Math.abs(by - ay), dir = ORDER.find((d) => DIRS[d][0] === Math.sign(bx - ax) && DIRS[d][1] === Math.sign(by - ay));
    for (let k = 0; k <= len; k++) if (!isOpen(ax + DIRS[dir][0] * k, ay + DIRS[dir][1] * k)) throw new Error(`route segment ${i} hits a wall at step ${k}`);
    SEG.push({ ax, ay, len, dir, s: L }); L += len;
  }
  // Phase lock: a ghost's signed travel over the lap is V·(τ_END − 2·scatter) (the two reversals cancel the scatter part);
  // it must be a whole number of tiles, or no lap can ever end where it began.
  const TEFF = TAU_END - 2 * (SCATTER[1] - SCATTER[0]) * (cfg.scatter ? 1 : 0);
  const PAC_V = L / TAU_END, GHOST_V = Math.round((cfg.ghostRatio ?? 0.92) * PAC_V * TEFF) / TEFF, S0 = cfg.s0 ?? 0.5;
  function pac(ta) {
    const s = (((S0 + PAC_V * ta) % L) + L) % L; let i = SEG.length - 1;
    while (i > 0 && SEG[i].s > s) i--;
    const g = SEG[i], k = s - g.s, d = DIRS[g.dir];
    return { x: g.ax + 0.5 + d[0] * k, y: g.ay + 0.5 + d[1] * k, dir: g.dir, s };
  }
  // ---------------------------------------------------------------- ghosts under the rules (exact, event-driven)
  // Between events every ghost moves in a straight line at GHOST_V. Events: arriving at a tile centre (decide), and the
  // two mode switches (reverse in place). A ghost's "tile" for the rules is the tile that holds its centre.
  const SW = cfg.scatter ? [SCATTER[0], SCATTER[1]] : [];
  function runLap(G0) {
    const st = {}, segs = {}, dec = [], atS = {};
    for (const n of GHOSTS) { const [x, y, dir, u] = G0[n]; st[n] = { x, y, dir, u, t: 0, T: [x, y] }; segs[n] = []; }
    const pos = (s, t) => { const k = s.u + (t - s.t) * GHOST_V; return [s.x + 0.5 + DIRS[s.dir][0] * k, s.y + 0.5 + DIRS[s.dir][1] * k]; };
    const tileNow = (s, t) => { const [px, py] = pos(s, t); return [Math.floor(px), Math.floor(py)]; };
    const push = (n, t1) => { const s = st[n], [x0, y0] = pos(s, s.t); segs[n].push({ t0: s.t, t1, x0, y0, dir: s.dir, T: s.T }); };
    let t = 0;
    for (;;) {
      // next event
      let next = TAU_END, who = null, sw = null;
      for (const n of GHOSTS) { const s = st[n], ta = s.t + (1 - s.u) / GHOST_V; if (ta < next - 1e-12) { next = ta; who = n; sw = null; } }
      for (const w of SW) if (w > t + 1e-12 && w < next - 1e-12) { next = w; who = null; sw = w; }
      if (next >= TAU_END - 1e-12) { for (const n of GHOSTS) { const s = st[n]; push(n, TAU_END); s.u += (TAU_END - s.t) * GHOST_V; s.t = TAU_END; } break; }
      t = next;
      if (sw !== null) { for (const n of GHOSTS) { const s = st[n]; push(n, t); s.u += (t - s.t) * GHOST_V; s.t = t; s.x += DIRS[s.dir][0]; s.y += DIRS[s.dir][1]; s.dir = REV[s.dir]; s.u = 1 - s.u; if (sw === SW[1]) atS[n] = { x: s.x, y: s.y, dir: s.dir, u: s.u }; } continue; }
      const s = st[who]; push(who, t);
      s.x += DIRS[s.dir][0]; s.y += DIRS[s.dir][1]; s.u = 0; s.t = t;
      const m = mode(t + 1e-9), P = pac(t);
      s.T = targetOf(who, m, P, s.x, s.y, tileNow(st.red, t));
      const was = s.dir; s.dir = choose(s.x, s.y, s.dir, s.T);
      const opts = exits(s.x, s.y).filter((d) => d !== REV[was]);
      if (opts.length > 1) dec.push({ ta: t, n: who, x: s.x, y: s.y, from: was, opts, took: s.dir, T: s.T, m, red: tileNow(st.red, t), pac: [P.x, P.y, P.dir] });
    }
    const end = Object.fromEntries(GHOSTS.map((n) => { const s = st[n]; let { x, y, dir, u } = s; while (u >= 1 - 1e-9) { u -= 1; x += DIRS[dir][0]; y += DIRS[dir][1]; } return [n, [x, y, dir, +u.toFixed(9)]]; }));
    return { segs, dec, end, atS };
  }
  cfg = { ...cfg, offscreenSeam: true };
  let G0 = cfg.g0, lap = runLap(G0), iters = 0;
  if (cfg.offscreenSeam) cfg = { ...cfg, iterate: 0 };
  const same = (a, b) => GHOSTS.every((n) => a[n][0] === b[n][0] && a[n][1] === b[n][1] && a[n][2] === b[n][2] && Math.abs(a[n][3] - b[n][3]) < 1e-6);
  while (!same(lap.end, G0) && iters < (cfg.iterate ?? 8)) { G0 = lap.end; lap = runLap(G0); iters++; }
  const converged = same(lap.end, G0);
  const segs = lap.segs, dec = lap.dec.filter((d) => d.ta < SCATTER[1] || converged);
  // ---------------------------------------------------------------- fallback: a searched return path for ghosts whose
  // lap does not end where it began (period-2 orbits). From the scatter→chase reversal (τ_s) to τ(END) the ghost takes
  // the path to its opening state that agrees best with the chase rule, at a speed within ±10 %.
  const TS = SCATTER[1], span = TAU_END - TS, want = GHOST_V * span, RET = {};
  const retPos = (n, ta) => {
    const r = RET[n], k = (ta - TS) / span; let d = k * r.len;
    for (let j = 0; j + 1 < r.pts.length; j++) { const [ax, ay] = r.pts[j], [bx, by] = r.pts[j + 1], l = Math.abs(bx - ax) + Math.abs(by - ay);
      if (d <= l + 1e-9 || j + 2 === r.pts.length) { const f = l ? Math.min(1, d / l) : 0, dir = ORDER.find((q) => DIRS[q][0] === Math.sign(bx - ax) && DIRS[q][1] === Math.sign(by - ay)) || G0[n][2]; return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f, dir }; }
      d -= l; }
  };
  for (const n of (cfg.offscreenSeam ? [] : GHOSTS)) {
    if (lap.end[n][0] === G0[n][0] && lap.end[n][1] === G0[n][1] && lap.end[n][2] === G0[n][2] && Math.abs(lap.end[n][3] - G0[n][3]) < 1e-6) continue;
    const s = lap.atS[n], [x0, y0, d0, u0] = G0[n], first = [s.x + DIRS[s.dir][0], s.y + DIRS[s.dir][1]], base = 1 - s.u + u0;
    let best = null, budget = 80000;
    const walk = (x, y, dir, path) => {
      if (--budget < 0) return;
      const len = base + path.length - 1; if (len > want * 1.2) return;
      if (x === x0 && y === y0 && dir !== REV[d0] && isOpen(x + DIRS[d0][0], y + DIRS[d0][1]) && len >= want * 0.8) {
        const v = len / span; let agree = 0, nd = 0;
        for (let j = 0; j + 1 < path.length; j++) {
          const [px, py] = path[j], opts = exits(px, py).filter((q) => q !== REV[path[j].dir]); if (opts.length < 2) continue; nd++;
          const arr = TS + (1 - s.u + j) / v, P = pac(arr), rr = n !== "red" && RET.red && !RET.red.fail ? retPos("red", arr) : ghost("red", arr);
          const T = targetOf(n, "chase", P, px, py, [Math.floor(rr.x), Math.floor(rr.y)]), w = choose(px, py, path[j].dir, T), took = ORDER.find((q) => DIRS[q][0] === path[j + 1][0] - px && DIRS[q][1] === path[j + 1][1] - py);
          if (w === took) agree++;
        }
        const off = Math.abs(len / want - 1), score = agree - nd - off * 6;
        if (!best || score > best.score) best = { score, path: path.map((p) => [p[0], p[1]]), len, agree, dec: nd, speed: v / GHOST_V };
      }
      for (const d of exits(x, y)) { if (d === REV[dir]) continue; const nx = x + DIRS[d][0], ny = y + DIRS[d][1], p = [nx, ny]; p.dir = d; walk(nx, ny, d, [...path, p]); }
    };
    const p0 = [...first]; p0.dir = s.dir; walk(first[0], first[1], s.dir, [p0]);
    if (!best) { RET[n] = { fail: true, from: [s.x, s.y, s.dir, +s.u.toFixed(2)], to: G0[n], want: +want.toFixed(2) }; continue; }
    best.pts = [[s.x + 0.5 + DIRS[s.dir][0] * s.u, s.y + 0.5 + DIRS[s.dir][1] * s.u], ...best.path.map(([x, y]) => [x + 0.5, y + 0.5]), [x0 + 0.5 + DIRS[d0][0] * u0, y0 + 0.5 + DIRS[d0][1] * u0]];
    RET[n] = best;
  }
  const returns = Object.fromEntries(Object.entries(RET).map(([n, r]) => [n, r.fail ? { fail: true, from: r.from, to: r.to, want: r.want } : { len: +r.len.toFixed(2), speed: +r.speed.toFixed(3), agree: `${r.agree}/${r.dec}` }]));
  const loopOK = Object.values(RET).every((r) => !r.fail);
  // ---------------------------------------------------------------- lookups
  function ghost(name, ta) {
    ta = ((ta % TAU_END) + TAU_END) % TAU_END;
    if (RET[name] && !RET[name].fail && ta >= TS) return { ...retPos(name, ta), T: tileOf(pac(ta)) };
    const L2 = segs[name]; let lo = 0, hi = L2.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (L2[m].t0 <= ta) lo = m; else hi = m - 1; }
    const g = L2[lo], k = (ta - g.t0) * GHOST_V;
    return { x: g.x0 + DIRS[g.dir][0] * k, y: g.y0 + DIRS[g.dir][1] * k, dir: g.dir, T: g.T };
  }
  function liveTarget(name, ta) { const G = ghost(name, ta), r = ghost("red", ta); return targetOf(name, mode(ta), pac(ta), Math.floor(G.x), Math.floor(G.y), [Math.floor(r.x), Math.floor(r.y)]); }
  return { cfg, G0, converged, loopOK, returns, iters, pac, ghost, liveTarget, mode, ROUTE_LEN: L, PAC_V, GHOST_V, DECISIONS: dec, SEG };
}

// ---------------------------------------------------------------- the film's game (game.json)
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const GAME = fs.existsSync(HERE + "game.json") ? makeGame(JSON.parse(fs.readFileSync(HERE + "game.json", "utf8"))) : null;
