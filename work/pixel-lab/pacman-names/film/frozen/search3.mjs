// Search v3 (off-screen seam): the ghosts live by the rules for the whole lap from a designed opening G0; the lap seam is
// a close-up of Pac-Man alone, so the ghosts (at their corners by then) never have to come back. Pac-Man is played by
// dev/ai.mjs against the exact same ghosts, so no collision can hide. Scored against the narration beats.
// node dev/search3.mjs [tries] [seed] → dev/best3.json
import fs from "node:fs";
import { MW, MH, isOpen, DIRS, REV, exits, CORNER, cell } from "../maze.mjs";
import { tau, TAU_END } from "../timeline.mjs";
import { makeGame, GHOSTS } from "../sim.mjs";
import { aiRoute, BLOCK } from "./ai.mjs";

const N = Number(process.argv[2] || 100); let seed = Number(process.argv[3] || 1);
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
export const STARTS = [[12, 16, "left"], [8, 16, "right"], [12, 18, "left"], [8, 18, "right"], [13, 14, "right"], [7, 14, "left"]];
// seam close-up: 96 px per tile, Pac-Man at screen (300, 380) of the 540×960 grid; mirrored when he runs right
export const seamRect = (P) => (P.dir === "right" ? { x0: P.x - 2.5, x1: P.x + 3.125, y0: P.y - 3.96, y1: P.y + 6.04 } : { x0: P.x - 3.125, x1: P.x + 2.5, y0: P.y - 3.96, y1: P.y + 6.04 });
const inRect = (G, r) => G.x > r.x0 - 0.8 && G.x < r.x1 + 0.8 && G.y > r.y0 - 0.8 && G.y < r.y1 + 0.8;

function genG0(start) {
  const [sx, sy, sd] = start, back = REV[sd], out = {};
  // red: 4.5–6.5 tiles behind Pac-Man in the same corridor, heading the same way
  // walk back along the corridors from Pac-Man (no reversing); red sits there heading toward him
  const k = 4 + Math.floor(rnd() * 3); let x = sx, y = sy, d = back;
  for (let i = 0; i < k; i++) { const o = exits(x, y).filter((e) => e !== REV[d]); if (!o.length) return null; d = o.includes(d) && rnd() < 0.7 ? d : pick(o); x += DIRS[d][0]; y += DIRS[d][1]; }
  out.red = [x, y, REV[d], +(rnd() * 0.6).toFixed(2)];
  const P = { x: sx + 0.5 - DIRS[sd][0] * -0.5, y: sy + 0.5 - DIRS[sd][1] * -0.5 }, r = seamRect(P);
  for (const n of ["pink", "blue", "orange"]) {
    for (let tries = 0; ; tries++) {
      if (tries > 200) return null;
      const x = 1 + Math.floor(rnd() * (MW - 2)), y = 1 + Math.floor(rnd() * (MH - 2));
      if (!isOpen(x, y) || cell(x, y) === "H") continue;
      if (inRect({ x: x + 0.5, y: y + 0.5 }, r)) continue;
      out[n] = [x, y, pick(exits(x, y)), +(rnd() * 0.95).toFixed(2)]; break;
    }
  }
  return out;
}

const TA = []; for (let f = 0; f < 1472; f++) TA.push(tau(f / 30));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lineOf = (G, P) => (Math.abs(G.y - P.y) < 0.35 ? "row" : Math.abs(G.x - P.x) < 0.35 ? "col" : null);
const clear = (G, P) => { const n = Math.ceil(Math.abs(G.x - P.x) + Math.abs(G.y - P.y)) * 2; for (let i = 0; i <= n; i++) { const x = P.x + ((G.x - P.x) * i) / Math.max(1, n), y = P.y + ((G.y - P.y) * i) / Math.max(1, n); if (!isOpen(Math.floor(x), Math.floor(y))) return false; } return true; };
const along = (G, P) => { const d = DIRS[P.dir]; return (G.x - P.x) * d[0] + (G.y - P.y) * d[1]; };
const tileD = (G, P) => Math.hypot(Math.floor(G.x) - Math.floor(P.x), Math.floor(G.y) - Math.floor(P.y));

// Orange must be outside the 8-square circle while the narration says "only from far away" (27.6 → 30.2) and inside after
const te0 = (st) => { let out = 0, n = 0, inn = 0, m = 0; for (let f = Math.round(27.6 * 30); f <= Math.round(30.1 * 30); f++) { n++; if (tileD(st[f].G.orange, st[f].P) > 8) out++; } for (let f = Math.round(30.9 * 30); f <= Math.round(32.6 * 30); f++) { m++; if (tileD(st[f].G.orange, st[f].P) <= 8.5) inn++; } return 5 * (out / n) + 2 * (inn / m) - 7; };
export function score3(game) {
  const st = TA.map((ta) => ({ P: game.pac(ta), G: Object.fromEntries(GHOSTS.map((n) => [n, game.ghost(n, ta)])) }));
  const frac = (a, b, fn) => { let n = 0, k = 0; for (let f = Math.round(a * 30); f <= Math.min(1471, Math.round(b * 30)); f++) { n++; if (fn(st[f], f)) k++; } return k / n; };
  for (let f = 0; f < st.length; f++) for (const n of GHOSTS) if (dist(st[f].P, st[f].G[n]) < 1.45) return { s: -1e9, why: `hit ${n} ${(f / 30).toFixed(1)}` };
  // seam: nobody but Pac-Man in the close-up at the end and the start
  const R0 = seamRect(st[0].P);
  for (const f of [...Array(16).keys()].map((i) => 1471 - i).concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])) for (const n of GHOSTS) if (inRect(st[f].G[n], seamRect(st[f].P))) return { s: -1e9, why: `seam ${n} ${f}` };
  const S = {};
  S.open = 3 * frac(1.2, 3.4, ({ P, G }) => along(G.red, P) < -1.5 && dist(G.red, P) < 8) + 2 * frac(1.2, 3.4, ({ P, G }) => lineOf(G.red, P) && clear(G.red, P) && along(G.red, P) < -2.5 && along(G.red, P) > -8);
  { let b = 0, best = null; for (const d of game.DECISIONS) if (d.ta >= 8.1 && d.ta <= 8.45 && d.m === "chase") { const P = game.pac(d.ta), gd = Math.hypot(d.x + 0.5 - P.x, d.y + 0.5 - P.y), td = Math.hypot(d.x - d.T[0], d.y - d.T[1]), ds = d.opts.map((o) => Math.hypot(d.x + DIRS[o][0] - d.T[0], d.y + DIRS[o][1] - d.T[1])).sort((x, y) => x - y);
      const v = 4 + (d.n === "red" ? 1.5 : d.n === "orange" ? 0.5 : 0) + (d.took !== d.from ? 1 : 0) + (d.opts.length > 2 ? 0.5 : 0) + (gd > 3.5 ? 1 : -1) + (td > 3 && td < 9 ? 1 : 0) + (ds[1] - ds[0] > 0.8 ? 1 : 0); if (v > b) { b = v; best = d; } } S.decide = b; S.decideAt = best && { n: best.n, ta: +best.ta.toFixed(3) }; }
  S.pinkUp = -5 * frac(14.6, 17.4, ({ P }) => P.dir === "up") - 3 * frac(19.9, 24.4, ({ P }) => P.dir === "up");
  S.orangeOut = te0(st);
  S.redT = frac(12.8, 14.4, ({ P, G }) => dist(G.red, P) < 6.5) * 2;
  S.pink = 5 * frac(14.8, 17.3, ({ P, G }) => { const K = G.pink, a = along(K, P); return a > 1.2 && dist(K, P) < 9; }) + 4 * frac(14.8, 17.3, ({ P, G }) => { const K = G.pink, a = along(K, P); return lineOf(K, P) && clear(K, P) && a > 1.8 && a < 9.5 && K.dir === REV[P.dir]; });
  { const f = Math.round(21.5 * 30), { P, G } = st[f], d = DIRS[P.dir], px = Math.floor(P.x), py = Math.floor(P.y), up = P.dir === "up", ax = px + d[0] * 2 - (up ? 2 : 0), ay = py + d[1] * 2, rx = Math.floor(G.red.x), ry = Math.floor(G.red.y), bx = 2 * ax - rx, by = 2 * ay - ry;
    const pts = [[P.x, P.y], [G.red.x, G.red.y], [ax + 0.5, ay + 0.5], [bx + 0.5, by + 0.5]], span = Math.max(...pts.map((p) => Math.max(...pts.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])))));
    S.blue = (span <= 14 ? 3 : span <= 17 ? 1 : 0) + (bx >= 0 && bx < MW && by >= 0 && by < MH ? 1 : 0) + (up ? -3 : 1) + (Math.hypot(G.blue.x - bx - 0.5, G.blue.y - by - 0.5) < 10 ? 2 : 0) + (lineOf(G.red, P) && clear(G.red, P) && along(G.red, P) < -1.5 ? 1 : 0); }
  S.pincer = 4 * frac(24.8, 26.9, ({ P, G }) => along(G.red, P) < -0.8 && along(G.blue, P) > 0.8 && dist(G.red, P) < 8 && dist(G.blue, P) < 8) + 3 * frac(24.8, 26.9, ({ P, G }) => along(G.red, P) < -0.8 && along(G.blue, P) > 0.8 && lineOf(G.blue, P) && clear(G.blue, P) && dist(G.blue, P) < 9);
  { let te = null; for (let f = Math.round(27.6 * 30); f < Math.round(33 * 30); f++) if (tileD(st[f - 1].G.orange, st[f - 1].P) > 8 && tileD(st[f].G.orange, st[f].P) <= 8) { te = f / 30; break; }
    S.orange = te === null ? 0 : (te >= 30.0 && te <= 30.9 ? 6 : te >= 29.5 && te <= 31.4 ? 3 : 0) + 2 * frac(27.8, Math.max(27.9, te - 0.1), ({ P, G }) => { const d = dist(G.orange, P); return d > 8 && d < 12.5; }) + (te !== null && dist(st[Math.round(32.8 * 30)].G.orange, st[Math.round(32.8 * 30)].P) > dist(st[Math.round(Math.min(32, te + 0.6) * 30)].G.orange, st[Math.round(Math.min(32, te + 0.6) * 30)].P) ? 2 : 0); S.te = te; }
  { const f = Math.round(45.6 * 30); S.scatter = GHOSTS.reduce((a, n) => { const c = CORNER[n], cx = Math.max(1, Math.min(MW - 2, c[0])), cy = Math.max(1, Math.min(MH - 2, c[1])); return a + (Math.hypot(st[f].G[n].x - cx, st[f].G[n].y - cy) < 7 ? 1 : 0); }, 0); }
  { const P = st[Math.round(45.2 * 30)].P; S.breathe = Math.abs(P.x - 10.5) < 6 && Math.abs(P.y - 14) < 6 ? 1 : 0; }
  { let k = 0; for (let f = 0; f < st.length; f += 3) for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) if (dist(st[f].G[GHOSTS[a]], st[f].G[GHOSTS[b]]) < 0.8) k++; S.stack = -k * 0.05; }
  let minD = 99, close = 0; for (const s of st) for (const n of GHOSTS) { const dd = dist(s.P, s.G[n]); minD = Math.min(minD, dd); if (dd < 2.2) close++; } S.safe = Math.min(0, (minD - 2) * 3) - close * 0.04;
  const s = Object.entries(S).filter(([k]) => !["te", "decideAt"].includes(k)).reduce((a, [, v]) => a + v, 0);
  return { s, S, minD };
}

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href && process.env.REFINE) {
  const base = JSON.parse(fs.readFileSync(new URL("./best3.json", import.meta.url))).slice(0, Number(process.env.REFINE));
  const top = [], why = {}; let ok = 0; const t0 = Date.now();
  for (const b of base) for (let c = 0; c < N; c++) {
    const start = [b.cfg.route[0][0], b.cfg.route[0][1], ({ '-1,0': 'left', '1,0': 'right', '0,-1': 'up', '0,1': 'down' })[`${Math.sign(b.cfg.route[1][0] - b.cfg.route[0][0])},${Math.sign(b.cfg.route[1][1] - b.cfg.route[0][1])}`]];
    const g0 = c % 3 === 0 ? b.cfg.g0 : (() => { const q = JSON.parse(JSON.stringify(b.cfg.g0)); const n = pick(['pink', 'blue', 'orange']); const alt = genG0(start); if (alt) q[n] = alt[n]; return q; })();
    const L = c % 2 ? b.len : 2 * (82 + Math.floor(rnd() * 12)), ratio = c % 2 ? b.cfg.ghostRatio : +(0.86 + rnd() * 0.08).toFixed(3);
    const story = { open: 2 + rnd() * 6, pink: 6 + rnd() * 14, blue: 10 + rnd() * 20, pincer: 6 + rnd() * 14, orangeFar: 2, orangeIn: 8 + rnd() * 10 };
    const r = aiRoute(L, g0, ratio, Math.floor(rnd() * 1e9), { horizon: 5 + rnd() * 3, noise: 0.5 + rnd() * 2, start, story }); if (!r || r.minD < 1.45) continue;
    let game; try { game = makeGame({ route: r.wp, s0: 0.5, g0, ghostRatio: ratio, offscreenSeam: true }); } catch { continue; }
    const sc = score3(game); if (sc.s < -1e8) continue; ok++;
    top.push({ s: +sc.s.toFixed(2), S: sc.S, minD: +sc.minD.toFixed(2), cfg: { route: r.wp, s0: 0.5, g0, ghostRatio: ratio, offscreenSeam: true }, len: game.ROUTE_LEN, v: +game.PAC_V.toFixed(2) });
    top.sort((a, b) => b.s - a.s); top.length = Math.min(top.length, 12);
  }
  fs.writeFileSync(new URL("./best3r.json", import.meta.url), JSON.stringify(top, null, 1));
  console.log(`refine ok ${ok} in ${((Date.now() - t0) / 1000).toFixed(0)} s`); for (const t of top.slice(0, 6)) console.log(t.s, JSON.stringify(t.S), 'minD', t.minD, 'len', t.len);
} else if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const top = [], why = {}; let ok = 0; const t0 = Date.now();
  for (let c = 0; c < N; c++) {
    const start = pick(STARTS), g0 = genG0(start); if (!g0) continue;
    const L = 2 * (82 + Math.floor(rnd() * 12)), ratio = +(0.86 + rnd() * 0.08).toFixed(3);
    const story = { open: 3, pink: 6 + rnd() * 10, blue: 15, pincer: 12 + rnd() * 25, orangeFar: 2, orangeIn: 12 };
    const r = aiRoute(L, g0, ratio, Math.floor(rnd() * 1e9), { horizon: 6, noise: 1.5, start, story }); if (!r) { why.ai = (why.ai || 0) + 1; continue; }
    if (r.minD < 1.45) { why.aihit = (why.aihit || 0) + 1; continue; }
    let game; try { game = makeGame({ route: r.wp, s0: 0.5, g0, ghostRatio: ratio, offscreenSeam: true }); } catch (e) { why.throw = (why.throw || 0) + 1; continue; }
    const sc = score3(game); if (sc.s < -1e8) { const w = sc.why.split(" ")[0]; why[w] = (why[w] || 0) + 1; continue; }
    ok++;
    top.push({ s: +sc.s.toFixed(2), S: sc.S, minD: +sc.minD.toFixed(2), cfg: { route: r.wp, s0: 0.5, g0, ghostRatio: ratio, offscreenSeam: true }, len: game.ROUTE_LEN, v: +game.PAC_V.toFixed(2) });
    if (!top.some((q) => JSON.stringify(q.cfg.route) === JSON.stringify(top[top.length - 1].cfg.route) && q !== top[top.length - 1])) {} top.sort((a, b) => b.s - a.s); top.length = Math.min(top.length, 30);
    if (c % 100 === 0) fs.writeFileSync(new URL(process.env.OUT || "./best3.json", import.meta.url), JSON.stringify(top, null, 1));
  }
  fs.writeFileSync(new URL(process.env.OUT || "./best3.json", import.meta.url), JSON.stringify(top, null, 1));
  console.log(JSON.stringify(why), `ok ${ok}/${N} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  for (const t of top.slice(0, 6)) console.log(t.s, JSON.stringify(t.S), "minD", t.minD, "len", t.len, "v", t.v);
}
