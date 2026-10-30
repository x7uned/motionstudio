// «Pac-Man's ghost names got lost in translation» — pixel film, top-down arcade maze, loop. 540×960 grid ×2 → 1080×1920.
// No overlay: the picture runs to every edge (the maze, then the cabinet down to the bottom); captions sit over a soft
// dithered shade. The game (Pac-Man's lap and the rule-driven ghosts) comes from sim.mjs + game.json; the film's clock
// is warped onto the lap (timeline.mjs makeClock) so each ghost's moment happens on its words.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { Canvas } from "../../../../renderer/pixel/raster.mjs";
import { MW, MH, DOTS, DIRS, REV, exits, CORNER, cell, isOpen } from "./maze.mjs";
import { makeGame, GHOSTS, choose } from "./sim.mjs";
import { EV, END, FPS, WORDS, VOICE, makeClock } from "./timeline.mjs";
import { drawMaze, drawPac, drawGhost, toS, PAL, SX, SY } from "./sprites.mjs";
import { GW, GH, K, R, C, GC, clamp01, smooth, ease, lerp, win, panel, dtext, tw, tag, dash, marker, ring, drawCabinet, captionShade, captionGroups, captions, fade, mix, bayer, MAIN } from "./hud.mjs";
import { ROWS } from "./roster.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GAMECFG = JSON.parse(fs.readFileSync(HERE + "game.json", "utf8"));
export const G = makeGame(GAMECFG), Tg = GAMECFG.Tg;
export const CLOCK = makeClock(GAMECFG.clockKeys, Tg);
const tauOf = (t) => ((CLOCK.tau(t) % Tg) + Tg) % Tg;
const wrapT = (t) => ((t % END) + END) % END;
const NAME = { red: "BLINKY", pink: "PINKY", blue: "INKY", orange: "CLYDE" };

// ---------------------------------------------------------------- the game at film time t
const S0 = G.cfg.s0 ?? 0.5;
const pacAt = (t) => G.pac(tauOf(t));
const ghostAt = (n, t) => G.ghost(n, tauOf(t));
function facing(t) { const ta = tauOf(t), a = G.pac(ta - 0.07), b = G.pac(ta + 0.07); let dx = b.x - a.x, dy = b.y - a.y; if (Math.hypot(dx, dy) < 1e-6 || Math.hypot(dx, dy) > 3) { const d = DIRS[G.pac(ta).dir]; dx = d[0]; dy = d[1]; } return Math.atan2(dy, dx); }
function look(n, t) { const ta = tauOf(t); let x = 0, y = 0; for (let k = 0; k < 7; k++) { const d = DIRS[G.ghost(n, ta - k * 0.025).dir]; x += d[0] * (7 - k); y += d[1] * (7 - k); } const l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
const avg = (fn, t) => { let x = 0, y = 0; for (let k = 0; k < 6; k++) { const v = fn(t - k * 0.025); x += v[0]; y += v[1]; } return [x / 6, y / 6]; };
const liveT = (n, t) => avg((u) => G.liveTarget(n, tauOf(u)), t);
function headingSteady(t) { const d0 = pacAt(t).dir; let back = 0.4, fwd = 0.4; for (let k = 1; k <= 12; k++) { if (back === 0.4 && pacAt(t - k / 30).dir !== d0) back = (k - 1) / 30; if (fwd === 0.4 && pacAt(t + k / 30).dir !== d0) fwd = (k - 1) / 30; } return Math.min(smooth(back, 0, 0.2), smooth(fwd, 0, 0.2)); }
const tileD = (a, b) => Math.hypot(Math.floor(a.x) - Math.floor(b.x), Math.floor(a.y) - Math.floor(b.y));

// ---------------------------------------------------------------- dots: when Pac-Man first reaches each tile in the lap
const VISIT = new Map();
for (const s of G.SEG) for (let k = 0; k <= s.len; k++) { const x = s.ax + DIRS[s.dir][0] * k, y = s.ay + DIRS[s.dir][1] * k, arc = s.s + k; let ta = (arc - S0) / G.PAC_V; if (ta < 0) ta += Tg; const key = `${x},${y}`; if (!VISIT.has(key) || VISIT.get(key) > ta) VISIT.set(key, ta); }
const P0 = G.pac(0), SEAMR = { x0: P0.x - 4.6, x1: P0.x + 4.6, y0: P0.y - 5.2, y1: P0.y + 7.4 };
const PRE = new Set([...VISIT.keys()].filter((k) => { const [x, y] = k.split(",").map(Number); return x + 0.5 > SEAMR.x0 && x + 0.5 < SEAMR.x1 && y + 0.5 > SEAMR.y0 && y + 0.5 < SEAMR.y1; }));
const BLINK_HZ = Math.round(2.2 * END) / END;
const dotState = {
  list: DOTS,
  alpha(d, t) { const k = `${d.x},${d.y}`; if (d.big) return 1; if (PRE.has(k)) return 0; const v = VISIT.get(k); if (v === undefined) return 1; const ta = tauOf(wrapT(t)), eat = v - 0.3 / G.PAC_V; return 1 - smooth(ta, eat, eat + 0.06); },
  blink(t) { return clamp01(0.5 + 1.6 * Math.sin(2 * Math.PI * BLINK_HZ * t)); },
};
export const EATS = [...VISIT.entries()].filter(([k]) => !PRE.has(k) && cell(...k.split(",").map(Number)) === ".").map(([k, ta]) => ta - 0.3 / G.PAC_V).sort((a, b) => a - b);

// ---------------------------------------------------------------- camera
const SAFE = { x0: 26, x1: 514, y0: 64, y1: 628 };
function frameOn(pts, { zmax = 70, zmin = 18, pad = 1.6, at = 0.5, safe = SAFE } = {}) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x - pad); x1 = Math.max(x1, x + pad); y0 = Math.min(y0, y - pad); y1 = Math.max(y1, y + pad); }
  const z = Math.max(zmin, Math.min(zmax, (safe.x1 - safe.x0) / (x1 - x0), (safe.y1 - safe.y0) / (y1 - y0)));
  const midY = lerp(safe.y0, safe.y1, at);
  return { cx: (x0 + x1) / 2 + (SX - (safe.x0 + safe.x1) / 2) / z, cy: (y0 + y1) / 2 + (SY - midY) / z, z };
}
const pp = (o) => [o.x, o.y];
// under the card: the whole maze, its top at y 356
const LOW = { cx: 10.5, cy: (SY - 354) / 18.5, z: 18.5 };
const CARD_SAFE = { x0: 26, x1: 514, y0: 168, y1: 628 };
function seamCam(t) { const P = pacAt(t), right = Math.cos(facing(t)) > 0; return { cx: P.x + (right ? 30 : -30) / 96, cy: P.y, z: 96 }; }
const BEATS = [
  { a: 0, b: 0.45, cam: seamCam },
  { a: 1.6, b: 20.0, cam: () => LOW },
  { a: 20.9, b: 24.9, cam: (t) => frameOn([pp(pacAt(t)), pp(ghostAt("red", t))], { zmax: 56, pad: 2.2, safe: CARD_SAFE }) },
  { a: 25.5, b: 29.3, cam: (t) => { const P = pacAt(t), d = DIRS[P.dir]; return frameOn([pp(P), [P.x + d[0] * 4.2, P.y + d[1] * 4.2], pp(ghostAt("pink", t))], { zmax: 52, pad: 2.2, safe: CARD_SAFE }); } },
  { a: 30.1, b: 35.7, cam: (t) => { const T = liveT("blue", t); return frameOn([pp(pacAt(t)), pp(ghostAt("blue", t)), pp(ghostAt("red", t)), [T[0] + 0.5, T[1] + 0.5]], { zmax: 46, zmin: 20, pad: 1.8, safe: CARD_SAFE }); } },
  { a: 36.5, b: 45.4, cam: (t) => { const P = pacAt(t); return frameOn([[P.x - 8.4, P.y - 8.4], [P.x + 8.4, P.y + 8.4], pp(ghostAt("orange", t))], { zmax: 40, zmin: 20, pad: 0.6, safe: CARD_SAFE }); } },
  { a: 46.2, b: 51.5, cam: (t) => frameOn([[0.5, MH - 1], [9.5, 15.5], pp(pacAt(t)), pp(ghostAt("orange", t))], { zmax: 44, zmin: 20, pad: 1.2, safe: CARD_SAFE }) },
  { a: 52.9, b: END, cam: seamCam },
];
function rawCam(t) {
  let i = 0; while (i < BEATS.length - 1 && BEATS[i + 1].a <= t) i++;
  const A = BEATS[i], ca = A.cam(Math.min(t, A.b));
  if (t <= A.b || i === BEATS.length - 1) return ca;
  const B = BEATS[i + 1], cb = B.cam(B.a), k = ease((t - A.b) / (B.a - A.b));
  return { cx: lerp(ca.cx, cb.cx, k), cy: lerp(ca.cy, cb.cy, k), z: Math.exp(lerp(Math.log(ca.z), Math.log(cb.z), k)) };
}
// the big camera moves (for the sound: a sweep exactly as long as each move)
export const camMoves = BEATS.slice(0, -1).map((A, i) => { const B = BEATS[i + 1], za = A.cam(A.b).z, zb = B.cam(B.a).z; return { a: A.b, b: B.a, zoomIn: zb > za, k: Math.max(za, zb) / Math.min(za, zb) }; }).filter((m) => m.k > 1.35);
const NF = Math.round(END * FPS), CAMS = []; for (let f = 0; f < NF; f++) CAMS.push(rawCam(f / FPS));
const SM = 7;
export function camera(t) {
  const f = Math.round(wrapT(t) * FPS) % NF;
  let cx = 0, cy = 0, lz = 0, w = 0;
  for (let k = -SM; k <= SM; k++) { const c = CAMS[(((f + k) % NF) + NF) % NF], q = Math.exp(-(k * k) / (2 * (SM / 2) ** 2)); cx += c.cx * q; cy += c.cy * q; lz += Math.log(c.z) * q; w += q; }
  const s = { cx: cx / w, cy: cy / w, z: Math.exp(lz / w) };
  const tt = wrapT(t), exact = Math.max(1 - smooth(tt, 0.35, 0.8), smooth(tt, END - 0.7, END - 0.2));
  if (exact <= 0) return s;
  const e = seamCam(tt); return { cx: lerp(s.cx, e.cx, exact), cy: lerp(s.cy, e.cy, exact), z: Math.exp(lerp(Math.log(s.z), Math.log(e.z), exact)) };
}
const sc = (cam, x, y) => toS(cam, x, y);

// ---------------------------------------------------------------- the name card (intro: all four rows)
const CARD = { x: 22, y: 64, w: 496, rowH: 62 };
function strike(c, x, y, w, k, col, a) { if (a <= 0 || k <= 0) return; fade(c, a).rect(R(x - 3), R(y), R((w + 6) * k), 3, col); }
function miniGhost(c, n, gx, gy, a, t, z = 26) { drawGhost(c, { cx: -(gx - SX) / z, cy: -(gy - SY) / z, z }, 0, 0, n, [1, 0], t * 2 + GHOSTS.indexOf(n) * 0.3, a); }
const NAMEAT = [EV.blinky, EV.pinky, EV.inky, EV.clyde], USAT = [EV.shadow, EV.speedy, EV.bashful, EV.pokey];
function drawRoster(c, t) {
  // the intro card (names → U.S. words → Japanese words) and the summary at the end
  const intro = win(t, EV.names - 0.2, EV.blinky2 - 0.45, 0.4, 0.45), summary = win(t, EV.never - 0.25, END - 0.55, 0.35, 0.3), a = Math.max(intro, summary);
  if (a <= 0) return;
  const { x, y, w, rowH } = CARD, h = 48 + rowH * 4 + 6;
  panel(c, x, y, w, h, a, C.p7);
  const jp = summary > 0 ? 1 : smooth(t, EV.japanese - 0.1, EV.japanese + 0.5), us = summary > 0 ? 0 : smooth(t, EV.screen, EV.screen + 0.4);
  const colEn = x + 76, colW = x + 232, colBar = x + 392;
  dtext(c, "NAME", colEn, y + 16, C.L, a, 2);
  if (us * (1 - jp) > 0) dtext(c, "ARCADE SCREEN", colW, y + 16, C.L, a * us * (1 - jp), 2);
  if (jp > 0) dtext(c, "JAPAN: HOW IT HUNTS", colW, y + 16, C.Y, a * jp, 2);
  const bars = win(t, EV.faster - 0.2, EV.slowerEnd + 0.3, 0.35, 0.4) * (summary > 0 ? 0 : 1);
  if (bars > 0) dtext(c, "SPEED", colBar + 8, y + 16, C.L, a * bars, 2);
  ROWS.forEach((row, i) => {
    const ry = y + 48 + i * rowH, show = summary > 0 ? 1 : smooth(t, NAMEAT[i] - 0.15, NAMEAT[i] + 0.2), ra = a * show;
    if (summary <= 0 && show < 1) { const q = a * (1 - show); miniGhost(c, row.n, x + 40, ry + 26, q * 0.75, t); dtext(c, "?", colEn + 8, ry + 15, C.GREY, q, 3); }
    if (ra <= 0) return;
    // the row in focus during the speed sentence (Speedy, Pokey) stands out; the others dim
    const foc = i === 1 ? win(t, EV.speedy2 - 0.1, EV.pokey2 - 0.1, 0.25, 0.3) : i === 3 ? win(t, EV.pokey2 - 0.1, EV.slowerEnd + 0.2, 0.25, 0.3) : 0;
    const anyF = Math.max(win(t, EV.speedy2 - 0.1, EV.slowerEnd + 0.2, 0.25, 0.3) * (summary > 0 ? 0 : 1)), dim = 1 - 0.5 * anyF * (1 - foc);
    miniGhost(c, row.n, x + 40, ry + 26, ra * dim, t);
    if (foc > 0) fade(c, ra * foc).rect(x + 6, ry + 4, 3, rowH - 10, GC[row.n]);
    dtext(c, row.en, colEn, ry + 15, GC[row.n], ra * dim, 3);
    const uw = summary > 0 ? 0 : smooth(t, USAT[i] - 0.1, USAT[i] + 0.25) * (1 - jp);
    if (uw > 0) { dtext(c, row.us, colW, ry + 15, C.IV, ra * uw * dim, 3); if (i === 1) strike(c, colW, ry + 25, tw(c, row.us, 3), smooth(t, EV.faster, EV.faster + 0.4), C.PK, ra * uw); if (i === 3) strike(c, colW, ry + 25, tw(c, row.us, 3), smooth(t, EV.slower, EV.slower + 0.4), C.PK, ra * uw); }
    // the Japanese column: "?" after "really hunts", the words themselves only in the summary (each ghost gets its own card)
    if (jp > 0) { if (summary > 0) { dtext(c, row.jp, colW, ry + 6, C.Y, ra, 3); dtext(c, "= " + row.mean, colW, ry + 36, C.IV, ra, 2); } else dtext(c, "?", colW + 8, ry + 15, C.Y, ra * jp * dim, 3); }
    // speed bars: all four the same
    if (bars > 0) { const g = fade(c, ra * bars), bw = R(96 * smooth(t, EV.faster - 0.1 + i * 0.08, EV.faster + 0.5 + i * 0.08)); g.rect(colBar + 8, ry + 18, 96, 12, "#2A1F48"); g.rect(colBar + 8, ry + 18, bw, 12, GC[row.n]); g.rect(colBar + 8, ry + 18, bw, 3, mix(GC[row.n], "#FFFFFF", 0.4)); }
  });
  if (bars > 0) { const s = smooth(t, EV.others - 0.1, EV.others + 0.3) * bars; tag(c, ["SAME SPEED"], colBar + 56, y + h + 8, a * s, C.GR, 2); }
}

// ---------------------------------------------------------------- the focus card (one ghost at a time, at the top)
const FOCUS = [
  { n: "red", a: EV.blinky2, jpAt: EV.oikake, meanAt: EV.chaser, b: EV.pinky2 },
  { n: "pink", a: EV.pinky2, jpAt: EV.machibuse, meanAt: EV.ambusher, b: EV.inky2 },
  { n: "blue", a: EV.inky2, jpAt: EV.kimagure, meanAt: EV.moody, b: EV.clyde2 },
  { n: "orange", a: EV.clyde2, jpAt: EV.otoboke, meanAt: EV.playing, b: EV.never - 0.3 },
];
function drawFocus(c, t) {
  for (const F of FOCUS) {
    const a = win(t, F.a - 0.3, F.b - 0.35, 0.35, 0.35); if (a <= 0) continue;
    const row = ROWS.find((r) => r.n === F.n), x = 22, y = 64, w = 496, h = 92;
    panel(c, x, y, w, h, a, GC[F.n]);
    miniGhost(c, F.n, x + 42, y + 48, a, t, 30);
    dtext(c, row.en, x + 84, y + 14, GC[F.n], a, 3);
    const j = smooth(t, F.jpAt - 0.1, F.jpAt + 0.25) * a, m = smooth(t, F.meanAt - 0.1, F.meanAt + 0.25) * a;
    if (j > 0) { dtext(c, row.jp, x + 84, y + 50, C.Y, j, 4); }
    if (m > 0) { const mw = tw(c, "= " + row.mean, 2); dtext(c, "JAPANESE FOR", x + w - 16 - Math.max(mw, tw(c, "JAPANESE FOR", 2)), y + 18, C.L, m * 0.8, 2); dtext(c, "= " + row.mean, x + w - 16 - mw, y + 56, C.IV, m, 2); }
  }
}

// ---------------------------------------------------------------- captions
const GROUPS = captionGroups(VOICE, WORDS, END);

// ---------------------------------------------------------------- world + story overlays
function world(c, t) {
  const cam = camera(t), ta = tauOf(t);
  drawMaze(c, cam, t, dotState);
  drawCabinet(c, cam, MH, { MW });
  const focus = FOCUS.find((F) => t >= F.a - 0.3 && t < F.b)?.n, order = ["orange", "blue", "pink", "red"].filter((n) => n !== focus); if (focus) order.push(focus);
  for (const n of order) { const g = ghostAt(n, t); drawGhost(c, cam, g.x, g.y, n, look(n, t), ta * 2.2 + GHOSTS.indexOf(n) * 0.25); }
  const P = pacAt(t); drawPac(c, cam, P.x, P.y, facing(t), 0.5 - 0.5 * Math.cos(2 * Math.PI * (P.s - S0)));
  return { cam, ta, P };
}

// a trail of where a ghost has been over the last `span` film seconds (fading dots)
function trail(c, cam, n, t, span, a, col) { if (a <= 0) return; const g = fade(c, a); for (let k = 1; k <= 40; k++) { const u = t - (k / 40) * span, p = ghostAt(n, u), q = 1 - k / 40; if (q * a <= bayer(k, 3) * 0.9) continue; const [x, y] = sc(cam, p.x, p.y), s = Math.max(2, R(cam.z / 9)); fade(c, a * q).rect(R(x - s / 2), R(y - s / 2), s, s, col); } }
// the way the ghost will go to target T by the rule, from its current tile (up to n tiles)
function wayTo(n, t, T, steps = 14) { const g = ghostAt(n, t); let x = Math.floor(g.x), y = Math.floor(g.y), dir = g.dir; const pts = [[g.x, g.y]]; for (let i = 0; i < steps; i++) { const nx = x + DIRS[dir][0], ny = y + DIRS[dir][1]; if (!isOpen(nx, ny)) break; x = nx; y = ny; pts.push([x + 0.5, y + 0.5]); dir = choose(x, y, dir, T); } return pts; }

function story(c, t, w) {
  const { cam, P } = w, pacS = sc(cam, P.x, P.y), gS = (n) => { const g = ghostAt(n, t); return sc(cam, g.x, g.y); };
  const aim = (n, a, label = null) => { if (a <= 0) return; const T = liveT(n, t), [gx, gy] = gS(n), [tx, ty] = sc(cam, T[0] + 0.5, T[1] + 0.5); dash(c, gx, gy, tx, ty, GC[n], a * 0.9, t); marker(c, cam, T[0], T[1], GC[n], a, t, label); };
  // intro: each ghost pulses in the maze as its name is said
  NAMEAT.forEach((tn, i) => { const n = ROWS[i].n, a = win(t, tn - 0.1, tn + 0.9, 0.15, 0.5); if (a <= 0) return; const [x, y] = gS(n); ring(c, x, y, cam.z * (0.9 + 0.5 * smooth(t, tn - 0.1, tn + 0.9)), GC[n], a, t); });
  // Blinky: the chaser aims at your square
  { const a = win(t, EV.aims - 0.1, EV.pinky2 - 0.3, 0.3, 0.35); aim("red", a, a > 0.5 ? "YOUR SQUARE" : null); }
  // Pinky: four squares ahead
  { const a = win(t, EV.aiming - 0.15, EV.inky2 - 0.3, 0.3, 0.35);
    if (a > 0) { const st = headingSteady(t) * (P.dir === "up" ? 0 : 1), d = DIRS[P.dir];
      for (let k = 1; k <= 4; k++) { const on = smooth(t, EV.four + (k - 1) * 0.12, EV.four + (k - 1) * 0.12 + 0.15) * a * st; if (on <= 0) continue; const [x0, y0] = sc(cam, P.x + d[0] * k, P.y + d[1] * k), s2 = R(cam.z * 0.8), g = fade(c, on * 0.9); g.frame(R(x0 - s2 / 2), R(y0 - s2 / 2), s2, s2, GC.pink); g.frame(R(x0 - s2 / 2) + 1, R(y0 - s2 / 2) + 1, s2 - 2, s2 - 2, GC.pink); dtext(c, String(k), x0 - 7, y0 - 10, GC.pink, on, 3); }
      const b = smooth(t, EV.ahead, EV.ahead + 0.35) * a * st; aim("pink", b, b > 0.5 ? "4 AHEAD" : null); } }
  // Inky: the target depends on Blinky — the line from Blinky through 2 ahead, doubled; then his changing path
  { const a = win(t, EV.target - 0.1, EV.clyde2 - 0.3, 0.3, 0.35);
    if (a > 0) { const A = avg((u) => { const Q = pacAt(u), d = DIRS[Q.dir], up = Q.dir === "up"; return [Math.floor(Q.x) + d[0] * 2 - (up ? 2 : 0), Math.floor(Q.y) + d[1] * 2]; }, t), Rr = avg((u) => { const g = ghostAt("red", u); return [Math.floor(g.x), Math.floor(g.y)]; }, t), [ax, ay] = A, [rx, ry] = Rr, bx = 2 * ax - rx, by = 2 * ay - ry;
      const [Ax, Ay] = sc(cam, ax + 0.5, ay + 0.5), [Rx, Ry] = sc(cam, rx + 0.5, ry + 0.5), [Bx, By] = sc(cam, bx + 0.5, by + 0.5);
      const l = win(t, EV.blinky3 - 0.2, EV.changingEnd + 0.2, 0.3, 0.4) * a; if (l > 0) { dash(c, Rx, Ry, Bx, By, GC.red, l * 0.8, 0, 2, 5, 4, clamp01((t - (EV.blinky3 - 0.2)) / 0.7)); }
      marker(c, cam, bx, by, GC.blue, a * smooth(t, EV.target - 0.1, EV.target + 0.3), t, "TARGET");
      const [gx, gy] = gS("blue"); dash(c, gx, gy, Bx, By, GC.blue, a * 0.8, t);
      trail(c, cam, "blue", t, 3.2, win(t, EV.path - 0.2, EV.clyde2 - 0.3, 0.3, 0.35), GC.blue); } }
  // Clyde: the 8-square ring; chases from far away; inside he aims at his corner; he keeps circling
  { const a = win(t, EV.far - 0.3, EV.does - 0.2, 0.35, 0.4);
    if (a > 0) { const G2 = ghostAt("orange", t), inside = tileD(G2, P) < 8, ringA = a, [cx, cy] = pacS;
      ring(c, cx, cy, 8 * cam.z, inside ? GC.orange : "#B98A50", ringA * 0.95, t);
      const e8 = win(t, EV.eight - 0.1, EV.does - 0.2, 0.25, 0.4); tag(c, ["8 SQUARES"], cx + 8 * cam.z * 0.45, cy - 8 * cam.z * 0.95, e8, GC.orange, 2);
      let ins = 0; for (let k = -6; k <= 6; k++) { const u = t + k * 0.033; ins += tileD(ghostAt("orange", u), pacAt(u)) < 8 ? 1 : 0; } ins /= 13;
      aim("orange", a); { const T = liveT("orange", t); if (ins < 1) { const [tx, ty] = sc(cam, T[0] + 0.5, T[1] + 0.5); dtext(c, "YOU", tx - tw(c, "YOU", 2) / 2, ty - cam.z * 0.5 - 22, GC.orange, a * (1 - ins), 2); } if (ins > 0) { const cx2 = Math.max(-0.6, CORNER.orange[0]), cy2 = Math.min(MH - 0.25, CORNER.orange[1]), [kx, ky] = sc(cam, cx2, cy2); dtext(c, "HIS CORNER", Math.max(8, Math.min(GW - 8 - tw(c, "HIS CORNER", 2), kx - 10)), Math.min(626, ky - 34), GC.orange, a * ins, 2); } }
      trail(c, cam, "orange", t, 4.0, win(t, EV.circling - 0.3, EV.does - 0.2, 0.3, 0.4), GC.orange); } }
  // "Does Clyde do nothing, then?"
  { const a = win(t, EV.does - 0.1, EV.corner2 - 0.1, 0.25, 0.35); if (a > 0) { const [x, y] = gS("orange"); tag(c, ["?"], x, y - cam.z * 1.1 - 40, a, GC.orange, 4); } }
  // his corner is the bottom left; down there his way home runs through you
  { const a = win(t, EV.corner2 - 0.2, EV.never - 0.2, 0.3, 0.4);
    if (a > 0) { const cx = Math.max(-0.6, CORNER.orange[0]), cy = Math.min(MH - 0.25, CORNER.orange[1]); marker(c, cam, cx - 0.5, cy - 0.5, GC.orange, a, t, null); const [kx, ky] = sc(cam, cx, cy); tag(c, ["CLYDE'S CORNER"], kx + 70, ky - 64, a * smooth(t, EV.bottom - 0.1, EV.bottom + 0.3), GC.orange, 2, { maxY: 640 });
      const wy = win(t, EV.home - 0.2, EV.never - 0.2, 0.3, 0.4) * a;
      if (wy > 0) { const pts = wayTo("orange", t, CORNER.orange, 22); for (let i = 0; i + 1 < pts.length; i++) { const [x0, y0] = sc(cam, ...pts[i]), [x1, y1] = sc(cam, ...pts[i + 1]); dash(c, x0, y0, x1, y1, GC.orange, wy, t, Math.max(3, R(cam.z / 9)), 7, 3, clamp01((t - EV.home + 0.2) * 3 - i * 0.25)); }
        tag(c, ["HIS WAY HOME"], pacS[0], pacS[1] - cam.z * 1.2 - 44, wy * smooth(t, EV.runs - 0.1, EV.runs + 0.3), GC.orange, 2); } } }
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  t = wrapT(t);
  const c = new Canvas(GW, GH, K);
  const w = world(c, t);
  story(c, t, w);
  drawRoster(c, t);
  drawFocus(c, t);
  captionShade(c);
  captions(c, t, GROUPS);
  return c;
}

// ---------------------------------------------------------------- output
const FULLBUF = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULLBUF.set(row, y * 2 * 3240); FULLBUF.set(row, (y * 2 + 1) * 3240); }
  return FULLBUF;
}
const args = process.argv.slice(2);
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (args[0] === "--stills") {
    fs.mkdirSync(HERE + "stills", { recursive: true });
    for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
  } else if (args[0] === "--video") {
    const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4", from = Number(args[1] || 0), upto = Number(args[2] || to);
    const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", args[3] || out], { stdio: ["pipe", "inherit", "inherit"] });
    const t0 = Date.now();
    for (let f = from; f < upto; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
    ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
  }
}
