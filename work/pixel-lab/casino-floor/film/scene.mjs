// «Casinos don't hide the clocks to trap you»: the film's own layer over the casino kit — the whole casino as a dollhouse
// (casino-house.mjs) through one perspective camera, the hero «you» walking in and through it, and the story overlays: the
// clock that vanishes and comes back with MYTH?, the ghost clock and windows crossed out, the design book, «NO CLOCKS,
// PLEASE», O2 puffs from the vent and the air meter (NORMAL AIR, MYTH), the straight arrow that hits a slot wall, the dotted
// maze path with something new at every corner, the door row lighting up, the HOTEL / FOOD routes past the machines, the
// scent swirls, the music that speeds up with the bets, the new bright casino growing next door, the sun setting while the
// clocks run, the dotted cage. Everything is a pure function of t and the timeline.
import { MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, sm, ease, lerp, win, rnd, mix, fade, glow, makeView, camAt } from "./casino-core.mjs";
import { chipStack, CHIP_RAMPS } from "./casino-props.mjs";
import { drawPerson, idlePose, cheerPose, walkPose, LOOKS } from "./casino-people.mjs";
import { musicNote } from "./casino-slot.mjs";
import { drawHouse, vfScale, OLD, NEW, ARCH, DOOR, ISLANDS, COLUMNS, islandMachines, sunOnWall } from "./casino-house.mjs";
import { TOP } from "./casino-roulette.mjs";
import { EV, END, CAM, CLOCK1, NOPE, BOOK, BUBBLE, AIR, ARROW, MAZE, DOORWAVE, ROUTES, SMELL, MUSIC, GROW, CALM, DUSK, CAGE, WALK1, WALK2, SEAT1, SEAT2 } from "./timeline.mjs";

const O = "#0B0812", RED = "#E8384A";
const P2 = (V, x, y, z) => { const p = V.P(x, y, z); return [p[0], p[1]]; };
const clampX = (x, w, x0 = 40, x1 = 436) => Math.max(x0, Math.min(x1 - w, x));
const clampY = (y, h, y0 = 154, y1 = 620) => Math.max(y0, Math.min(y1 - h, y));

// ---------------------------------------------------------------- the hero's walk
function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function polyAt(pts, s) { for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (s <= l || i === pts.length - 1) { const u = clamp01(s / l); return { x: lerp(pts[i - 1][0], pts[i][0], u), z: lerp(pts[i - 1][1], pts[i][1], u), dx: pts[i][0] - pts[i - 1][0], dz: pts[i][1] - pts[i - 1][1] }; } s -= l; } }
/** Distance along a walk with a short ramp-up and slow-down (trapezoid speed). */
function walkS(wk, t) { const L = polyLen(wk.pts), T = wk.t1 - wk.t0, r = 0.45, v = L / (T - r); const u = t - wk.t0; if (u <= 0) return 0; if (u >= T) return L;
  if (u < r) return (v * u * u) / (2 * r); if (u > T - r) { const w = T - u; return L - (v * w * w) / (2 * r); } return v * r / 2 + v * (u - r); }
export function heroAt(t) {
  for (const wk of [WALK2, WALK1]) if (t >= wk.t0) { const s = walkS(wk, t), p = polyAt(wk.pts, s), moving = t < wk.t1 - 0.02; return { ...p, s, moving, speed: moving ? (walkS(wk, t + 0.02) - walkS(wk, t - 0.02)) / 0.04 : 0, wk }; }
  return { x: WALK1.pts[0][0], z: WALK1.pts[0][1], s: 0, moving: false, speed: 0, dx: 1, dz: 0 };
}
/** Bets at the card table: times speed up with the music (the hand puts a chip on each). */
export const BETS = (() => { const out = []; let t = MUSIC.t0 + 0.1, gap = 0.56; while (t < MUSIC.t1 - 0.4) { out.push(t); t += gap; gap = Math.max(0.19, gap * 0.8); } return out; })();
export const PRESSES = (() => { const out = []; for (let t = DUSK.t0 + 0.4; t < CAGE.t0; t += 1.15) out.push(t); return out; })();
const BET_SPOT = [866, TOP + 0.6, -786];
function heroPose(t, h, G, V) {
  let p = idlePose(t, 3, { near: [12, -44], far: [6, -37] });
  if (h.moving && h.speed > 5) { const w = walkPose(h.s, clamp01(h.speed / 90)); p = { ...p, ph: w.ph, amp: w.amp, bob: w.bob, near: w.near, far: w.far }; }
  const reach = (pt, k, dy = 0) => { if (k <= 0) return; const [sx, sy] = V.P(pt[0], pt[1] + dy, pt[2]), tg = V.toRig(G, sx, sy); p.near = [lerp(p.near[0], tg[0], k), lerp(p.near[1], tg[1], k)]; };
  // bets: the near hand dips to the felt on each bet time
  for (const tb of BETS) { const k = win(t, tb - 0.16, tb + 0.06, 0.12, 0.14); if (k > 0) reach(BET_SPOT, k, 6 * (1 - k)); }
  // calm: a slow happy stretch; then pressing the machine while the sun sets
  { const k = win(t, CALM.t0 + 0.1, CALM.t1, 0.5, 0.6); if (k > 0) { p = cheerPose(t * 0.4, p, 0.75 * k, 0.6); p.mouth = 0; } }
  for (const tp of PRESSES) { const k = win(t, tp - 0.25, tp + 0.15, 0.2, 0.25); if (k > 0) { reach([SEAT2[0] - 22, 80, -1000 + 18], k, 4 * (1 - k)); p.press = sm(t, tp - 0.05, tp) * (1 - sm(t, tp + 0.05, tp + 0.15)); } }
  return p;
}

// ---------------------------------------------------------------- the world
let LAST = null;
export function drawWorld(c, t) {
  const cam = camAt(CAM, t), V = makeView(cam), s = vfScale(cam.pitch), ob = V.bill;
  V.bill = (x, z, unit = 1.72, vf = 0.86, mirror = false, y = 0) => ob(x, z, unit, vf * s, mirror, y);
  const h = heroAt(t), facingLeft = t > WALK1.t1 - 0.3 && t < WALK2.t0 + 0.2 ? true : h.moving ? h.dx < -1 : false;
  const items = [];
  items.push({ x: h.x, z: h.z + 0.5, draw: () => { const G = V.bill(h.x, h.z, 1.75, 0.86, facingLeft), p = heroPose(t, h, G, V); drawPerson(c, V, h.x, h.z, t, p, LOOKS.hero, { mirror: facingLeft }); V.heroHead = [G.X(2), G.Y(-104)]; V.heroFeet = [G.bx, G.by]; V.heroZ = G.z; V.hand = [G.X(p.near[0]), G.Y(p.near[1] + (p.bob || 0))]; } });
  // the bets: a growing stack on the felt, a chip flying from the hand on each bet
  const nBet = BETS.filter((b) => t > b + 0.05).length;
  if (t > MUSIC.t0 - 0.5 && t < WALK2.t0 + 1.2) items.push({ x: BET_SPOT[0], z: BET_SPOT[2] + 1, draw: () => chipStack(c, V, BET_SPOT[0], BET_SPOT[1], BET_SPOT[2], 2 + nBet, CHIP_RAMPS.purple, { a: 1 - sm(t, WALK2.t0 + 0.4, WALK2.t0 + 1.1) }) });
  const st = {
    items, life: 1,
    dark: win(t, NOPE.dim0, NOPE.undim1, NOPE.dim1 - NOPE.dim0, NOPE.undim1 - NOPE.undim0) * 0.75,
    clockA: Math.max(1 - sm(t, CLOCK1.out0, CLOCK1.out1), sm(t, CLOCK1.back0, CLOCK1.back1)) * (1 - sm(t, NOPE.clock, NOPE.clock + 0.4)),
    clockT: 11.3 + t / 3600,
    low: sm(t, GROW.arch0, GROW.walls1), arch: sm(t, GROW.arch0, GROW.arch1),
    grow: ease(clamp01((t - GROW.floor0) / (GROW.floor1 - GROW.floor0))), walls: ease(clamp01((t - GROW.walls0) / (GROW.walls1 - GROW.walls0))),
    day: sm(t, GROW.day0, GROW.day1), plants: clamp01((t - GROW.plants0) / (GROW.plants1 - GROW.plants0)), clocks: sm(t, GROW.clocks0, GROW.clocks1),
    sun: sm(t, DUSK.t0, DUSK.t1 + 0.6), newClockT: 14.1 + 5.6 * ease(clamp01((t - DUSK.t0) / (DUSK.t1 - DUSK.t0 + 0.4))), lampsNew: sm(t, DUSK.t0 + 2.2, DUSK.t1 + 0.4),
    flash: (x, z) => flashAt(x, z, t),
  };
  drawHouse(c, V, t, st);
  LAST = { V, h };
  return V;
}

// ---------------------------------------------------------------- flashes: the door row, the maze corners, the routes
const MAZE_PTS = [[0, 30], [0, -330], [-260, -330], [-260, -950], [20, -950], [20, -1330], [-160, -1330], [-160, -1800], [-90, -2000], [-90, -2150]];
const FOOD_PTS = [[-40, 30], [-40, -300], [-280, -300], [-280, -600], [-420, -600], [-420, -1020], [-480, -1020], [-480, -1420], [-610, -1420], [-610, -1930], [-560, -2010], [-640, -2160]];
const HOTEL_PTS = [[40, 30], [40, -330], [-240, -330], [-240, -930], [40, -930], [40, -1320], [-140, -1320], [-140, -1790], [-70, -1990], [-70, -2150]];
const MAZE_L = polyLen(MAZE_PTS), FOOD_L = polyLen(FOOD_PTS), HOTEL_L = polyLen(HOTEL_PTS);
const mazeHead = (t) => MAZE_L * ease(clamp01((t - MAZE.t0) / (MAZE.t1 - MAZE.t0)));
export const CORNERS = (() => { const out = []; let s = 0; for (let i = 1; i < MAZE_PTS.length - 1; i++) { s += Math.hypot(MAZE_PTS[i][0] - MAZE_PTS[i - 1][0], MAZE_PTS[i][1] - MAZE_PTS[i - 1][1]); out.push({ s, x: MAZE_PTS[i][0], z: MAZE_PTS[i][1] }); } return out; })();
const sAtTime = (target) => { let lo = MAZE.t0, hi = MAZE.t1; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (mazeHead(m) < target) lo = m; else hi = m; } return lo; };
CORNERS.forEach((cn) => (cn.t = sAtTime(cn.s)));
function nearPath(pts, x, z, d) { for (let i = 1; i < pts.length; i++) { const [ax, az] = pts[i - 1], [bx, bz] = pts[i], ex = bx - ax, ez = bz - az, L2 = ex * ex + ez * ez, u = clamp01(((x - ax) * ex + (z - az) * ez) / L2); if (Math.hypot(ax + ex * u - x, az + ez * u - z) < d) return true; } return false; }
const PAST = new Map();
function flashAt(x, z, t) {
  let f = 0;
  // the door row lights up in a wave from the door
  if (t > DOORWAVE.t0 - 0.1 && t < DOORWAVE.t1 + 1.2 && z > -560) { const d = Math.hypot(x, z) / 700, tt = DOORWAVE.t0 + d * 0.8; f = Math.max(f, 1.6 * win(t, tt, DOORWAVE.t1 + 0.4 + d * 0.3, 0.15, 0.6)); }
  // maze corners: the nearest machines light up as the dotted head turns each corner
  for (const cn of CORNERS) if (Math.hypot(x - cn.x, z - cn.z) < 260) f = Math.max(f, 1.4 * win(t, cn.t - 0.05, cn.t + 0.7, 0.12, 0.5));
  // past the machines: machines along the HOTEL / FOOD routes pulse
  if (t > ROUTES.past - 0.2 && t < ROUTES.pastEnd + 0.6) { const key = x * 10000 + z; let on = PAST.get(key); if (on === undefined) { on = nearPath(HOTEL_PTS, x, z, 150) || nearPath(FOOD_PTS, x, z, 150); PAST.set(key, on); } if (on) f = Math.max(f, (0.9 + 0.5 * Math.sin((t - ROUTES.past) * 9)) * win(t, ROUTES.past, ROUTES.pastEnd, 0.2, 0.5)); }
  return f;
}

// ---------------------------------------------------------------- overlay helpers (screen space)
function plaque(c, x, y, w, h, a, edge = RAMP.gold) {
  const g = fade(c, a); g.rrect(x, y + 3, w, h, "#05030A", 3); g.rrect(x, y, w, h, edge[2], 3); g.rrect(x + 2, y + 2, w - 4, h - 4, edge[5], 2); g.rrect(x + 4, y + 4, w - 8, h - 8, "#160E22", 2);
}
function bigText(c, txt, cx, y, scale, col, a, shadowCol = "#05030A") { const g = fade(c, a), w = c.measure(MAIN, txt, { scale }); g.text(MAIN, txt, R(cx - w / 2) + Math.max(1, scale / 2 | 0), y + Math.max(1, scale / 2 | 0), shadowCol, { scale }); g.text(MAIN, txt, R(cx - w / 2), y, col, { scale }); return w; }
function tinyText(c, txt, cx, y, col, a, scale = 2) { const g = fade(c, a), w = c.measure(TINY, txt, { scale }); g.text(TINY, txt, R(cx - w / 2), y, col, { scale }); }
/** A rubber stamp: red double frame + text; drops in (slam) and shakes once. */
function stamp(c, txt, cx, cy, t0, a, scale = 4) {
  if (a <= 0) return; const u = clamp01((t0 >= 0 ? 1 : 0)), w = c.measure(MAIN, txt, { scale }) + 22, h = 7 * scale + 18;
  const x = R(clampX(cx - w / 2, w)), y = R(clampY(cy - h / 2, h)); void u;
  const g = fade(c, a);
  g.rrect(x + 2, y + 3, w, h, "#2A0408", 3); g.rrect(x, y, w, h, RED, 3); g.rrect(x + 3, y + 3, w - 6, h - 6, "#FFF2E4", 2); g.rrect(x + 5, y + 5, w - 10, h - 10, RED, 2); g.rrect(x + 7, y + 7, w - 14, h - 14, "#FFF2E4", 2);
  // worn ink: a few dithered gaps
  g.text(MAIN, txt, x + 11, y + 9 + (scale - 3), RED, { scale, colorAt: (X, Y) => ((X * 7 + Y * 13) % 23 === 0 ? null : RED) });
}
const stampA = (t, t0, t1) => Math.min(sm(t, t0, t0 + 0.12), 1 - sm(t, t1, t1 + 0.3));
const stampDrop = (t, t0) => R(-14 * (1 - ease(clamp01((t - t0) / 0.14))) + (t > t0 + 0.14 && t < t0 + 0.3 ? Math.sin((t - t0) * 60) * 2 * (1 - (t - t0 - 0.14) / 0.16) : 0));
function dashedPoly(c, pts, col, a, dash = [3, 3], w = 1) { const g = fade(c, a); for (let i = 0; i < pts.length - 1; i++) for (let d = 0; d < w; d++) g.line(R(pts[i][0]), R(pts[i][1]) + d, R(pts[i + 1][0]), R(pts[i + 1][1]) + d, col, dash); }
function xMark(c, cx, cy, s, a) { const g = fade(c, a); for (let d = -1; d <= 1; d++) { g.line(R(cx - s) + d, R(cy - s), R(cx + s) + d, R(cy + s), RED); g.line(R(cx + s) + d, R(cy - s), R(cx - s) + d, R(cy + s), RED); } }

// ---------------------------------------------------------------- 1. the clock myth
function clockMyth(c, V, t) {
  const [cx, cy] = P2(V, -95, 266, OLD.z0 + 13);
  { const a = stampA(t, CLOCK1.stamp, CLOCK1.stampOut); if (a > 0) stamp(c, "MYTH?", cx + 6, cy + 70 + stampDrop(t, CLOCK1.stamp), CLOCK1.stamp, a); }
  // no clocks: a ghost circle with an X where the clock was; no windows: ghost windows crossed out
  const ga = win(t, NOPE.clock, NOPE.out, 0.35, 0.5);
  if (ga > 0) { const ring = []; for (let i = 0; i <= 30; i++) { const an = (i / 30) * Math.PI * 2; ring.push(P2(V, -95 + Math.cos(an) * 44, 266 + Math.sin(an) * 44, OLD.z0 + 13)); } dashedPoly(c, ring, "#FFF2E4", ga, [2, 2]); xMark(c, cx, cy, 9, ga * sm(t, NOPE.clock + 0.2, NOPE.clock + 0.4)); }
  const wa = win(t, NOPE.win, NOPE.out, 0.35, 0.5);
  if (wa > 0) for (const wx of [-760, 300]) { const pts = [[wx - 70, 110], [wx + 70, 110], [wx + 70, 250], [wx - 70, 250], [wx - 70, 110]].map(([x, y]) => P2(V, x, y, OLD.z0 + 13)); dashedPoly(c, pts, "#BFE6FF", wa, [3, 2]);
    const m = P2(V, wx, 180, OLD.z0 + 13); xMark(c, m[0], m[1], 10, wa * sm(t, NOPE.win + 0.25, NOPE.win + 0.45)); }
}
// ---------------------------------------------------------------- 2. the design book + the player's bubble
function book(c, t) {
  const a = win(t, BOOK.in, BOOK.out, 0.3, 0.4); if (a <= 0) return;
  const g = fade(c, a), y0 = R(176 - 12 * (1 - ease(clamp01((t - BOOK.in) / 0.35)))), cx = 170, w = 76, h = 100, open = ease(clamp01((t - BOOK.open) / 0.5));
  // pages (right half always; the cover swings from the right half over to the left)
  { const lw = R(w * sm(open, 0.3, 0.7)); g.rrect(cx - lw - 4, y0 + 4, lw + w + 8, h + 6, "#05030A", 3); }
  const pageL = open > 0.5;
  g.rect(cx, y0, w, h, "#F4EAD2"); g.rect(cx, y0, 2, h, "#C8B898");
  if (open > 0.02) { // right page: a tiny floor plan of a maze
    const pg = fade(c, a * sm(open, 0.1, 0.6)); pg.rect(cx + 10, y0 + 12, w - 20, 1, "#6A5A48"); tinyTextG(pg, "MAZE", cx + w / 2, y0 + 16, "#6A5A48");
    for (const [x0, y, l] of [[14, 34, 30], [40, 34, 22], [14, 48, 18], [36, 48, 26], [20, 62, 34], [14, 76, 22], [44, 76, 20]]) pg.rect(cx + x0, y0 + y, l, 4, ["#B8303A", "#2C42AE", "#108236"][(x0 + y) % 3]);
    for (let s = 0; s < 18; s++) pg.px(cx + 12 + ((s * 7) % 50), y0 + 30 + ((s * 11) % 60), "#E8A030");
  }
  if (pageL) { g.rect(cx - w, y0, w, h, "#F4EAD2"); g.rect(cx - 2, y0, 2, h, "#C8B898"); for (let i = 0; i < 8; i++) g.rect(cx - w + 10, y0 + 14 + i * 10, w - 20 - (i % 3) * 8, 2, "#8A7A64"); }
  // the cover: a maroon board with the gold title, flipping around the spine
  const cw = R(w * Math.abs(Math.cos(Math.PI * open))), front = !pageL, x0 = front ? cx : cx - cw;
  if (cw > 1) { g.rect(x0, y0 - 2, cw, h + 4, front ? "#6A1420" : "#4A0E18"); g.rect(x0 + (front ? 0 : cw - 2), y0 - 2, 2, h + 4, "#3A0810");
    if (front && cw > 50) { const tg = fade(c, a * clamp01((cw - 50) / 20)); tinyTextG(tg, "CASINO", x0 + cw / 2, y0 + 30, RAMP.gold[6]); tinyTextG(tg, "DESIGN", x0 + cw / 2, y0 + 44, RAMP.gold[6]); tg.rect(R(x0 + cw / 2 - 18), y0 + 60, 36, 2, RAMP.gold[5]); tg.rect(R(x0 + 8), y0 + 6, cw - 16, 1, RAMP.gold[4]); tg.rect(R(x0 + 8), y0 + h - 7, cw - 16, 1, RAMP.gold[4]); } }
}
function tinyTextG(g, txt, cx, y, col) { const w = g.measure(TINY, txt, { scale: 2 }); g.text(TINY, txt, R(cx - w / 2), y, col, { scale: 2 }); }
const PLAYER = [458, -2010];
function bubble(c, V, t) {
  const a = win(t, BUBBLE.in, BUBBLE.out, 0.25, 0.35); if (a <= 0) return;
  const G = V.bill(PLAYER[0], PLAYER[1], 1.75, 0.86), hx = G.X(0), hy = G.Y(-104);
  const lines = ["NO CLOCKS,", "PLEASE!"], w = 150, h = 50, pop = ease(clamp01((t - BUBBLE.in) / 0.25));
  const x = R(clampX(hx - w / 2 - 30, w)), y = R(clampY(hy - h - 26 + (1 - pop) * 8, h)), g = fade(c, a);
  g.rrect(x + 2, y + 3, w, h, "#05030A", 4); g.rrect(x, y, w, h, O, 4); g.rrect(x + 2, y + 2, w - 4, h - 4, "#FFF8E8", 3);
  const tx = Math.max(x + 14, Math.min(x + w - 14, hx)); g.poly([[tx - 7, y + h - 2], [tx + 7, y + h - 2], [hx, Math.min(hy - 4, y + h + 18)]], "#FFF8E8"); g.line(tx - 7, y + h - 1, R(hx), R(Math.min(hy - 4, y + h + 18)), O); g.line(tx + 7, y + h - 1, R(hx), R(Math.min(hy - 4, y + h + 18)), O);
  lines.forEach((ln, i) => { const tw = c.measure(MAIN, ln, { scale: 2 }); g.text(MAIN, ln, R(x + w / 2 - tw / 2), y + 9 + i * 18, i ? RED : O, { scale: 2 }); });
}
// ---------------------------------------------------------------- 3. the air: O2 puffs, the meter, MYTH
const VENT = [560, 286, OLD.z0 + 13];
function air(c, V, t) {
  const [vx, vy] = P2(V, ...VENT);
  // O2 bubbles drift out of the vent into the hall
  if (t > AIR.puff0 && t < AIR.stamp + 0.8) for (let i = 0; i < 10; i++) {
    const t0 = AIR.puff0 + i * 0.16, u = clamp01((t - t0) / 1.9); if (u <= 0) continue;
    const a = Math.min(sm(u, 0, 0.15), 1 - sm(t, AIR.stamp + 0.2, AIR.stamp + 0.7)) * (1 - sm(u, 0.85, 1)); if (a <= 0) continue;
    const th = Math.PI * (0.45 + 0.62 * ((i * 7) % 10) / 9), dist = ease(u) * (150 + 40 * (i % 3)), x = vx - 10 + Math.cos(th) * dist * 1.2 + Math.sin(u * 6 + i) * 6, y = vy + 16 + Math.sin(th) * dist * 0.8 + 20 * u, r = 12 + (i % 3) * 2, g = fade(c, a);
    g.disc(R(x), R(y), r + 1, "#0E3A48"); g.disc(R(x), R(y), r, "#9AE6F0"); g.disc(R(x), R(y), r - 2, "#D8FAFF"); g.text(MAIN, "O", R(x) - 7, R(y) - 6, "#1E6A80", { scale: 2 }); g.text(TINY, "2", R(x) + 4, R(y) + 1, "#1E6A80", { scale: 1 }); g.px(R(x) - r + 3, R(y) - r + 3, "#FFFFFF");
  }
  // the meter: a dial swinging, settling on NORMAL
  const ma = win(t, AIR.meter, AIR.out, 0.3, 0.4);
  if (ma > 0) {
    const w = 150, h = 112, x = R(clampX(vx - 210, w)), y = R(clampY(vy + 60, h, 160, 600)), g = fade(c, ma), cx = x + w / 2, cy = y + 74;
    plaque(c, x, y, w, h, ma, RAMP.teal);
    tinyText(c, "AIR TEST", cx, y + 9, "#BFE6F0", ma);
    for (let i = 0; i <= 20; i++) { const an = Math.PI * (1 + i / 20), col = i < 6 ? "#5A8AE0" : i > 14 ? "#E05A5A" : "#65DA41"; g.rect(R(cx + Math.cos(an) * 44), R(cy + Math.sin(an) * 44), 3, 3, col); }
    const swing = t < AIR.needle ? 0.1 : t < AIR.read ? 0.5 + 0.38 * Math.sin((t - AIR.needle) * 7) * Math.exp(-(t - AIR.needle) * 1.6) : 0.5 + 0.38 * Math.sin((AIR.read - AIR.needle) * 7) * Math.exp(-(AIR.read - AIR.needle) * 1.6) * Math.exp(-(t - AIR.read) * 6);
    const an = Math.PI * (1 + swing); for (let s2 = 0; s2 <= 14; s2++) { const u = s2 / 14; g.rect(R(cx + Math.cos(an) * 38 * u) - 1, R(cy + Math.sin(an) * 38 * u) - 1, 2, 2, "#FFF6DA"); }
    g.disc(cx, cy, 4, RAMP.gold[5]);
    const ra = ma * sm(t, AIR.read, AIR.read + 0.25); if (ra > 0) bigText(c, "NORMAL AIR", cx, y + 86, 2, UI.GR, ra);
  }
  { const a = stampA(t, AIR.stamp, AIR.out); if (a > 0) stamp(c, "MYTH", vx - 10, vy - 14 + stampDrop(t, AIR.stamp), AIR.stamp, a); }
}
// ---------------------------------------------------------------- 4. no straight path; the maze
function floorLine(V, pts, y = 2) { return pts.map(([x, z]) => P2(V, x, y, z)); }
function dots(c, V, pts, s1, col, a, step = 30, head = true, t = 0) {
  if (a <= 0 || s1 <= 0) return; const g = fade(c, a); let s = 0, next = 0;
  for (let i = 1; i < pts.length; i++) { const [ax, az] = pts[i - 1], [bx, bz] = pts[i], l = Math.hypot(bx - ax, bz - az);
    while (next <= s + l && next <= s1) { const u = (next - s) / l, [px, py, k] = V.P(ax + (bx - ax) * u, 2, az + (bz - az) * u), r = Math.max(2, R(6 * k)); g.disc(R(px), R(py) + 1, r + 1, "#05030A"); g.disc(R(px), R(py), r, col); next += step; }
    s += l; }
  if (head) { const p = polyAt(pts, s1), [hx, hy, k] = V.P(p.x, 2, p.z); glow(c, hx, hy, 30, 22, col, 0.6 * a); fade(c, a).disc(R(hx), R(hy), Math.max(4, R(9 * k)), O); fade(c, a).disc(R(hx), R(hy), Math.max(3, R(8 * k)), "#FFFFFF"); }
}
function arrowMaze(c, V, t) {
  // the straight arrow from the door hits the slot wall
  const aa = win(t, ARROW.t0, ARROW.out, 0.2, 0.4);
  if (aa > 0) {
    const u = ease(clamp01((t - ARROW.t0) / (ARROW.hit - ARROW.t0))), z1 = lerp(10, -412, u), bump = t > ARROW.hit ? Math.sin((t - ARROW.hit) * 30) * 10 * Math.exp(-(t - ARROW.hit) * 8) : 0;
    const a0 = P2(V, 0, 3, 20), a1 = P2(V, 0, 3, z1 + bump), g = fade(c, aa);
    for (let d = -2; d <= 2; d++) g.line(R(a0[0]) + d, R(a0[1]), R(a1[0]) + d, R(a1[1]), d === -2 || d === 2 ? O : "#FFF2E4");
    const tip = a1; g.poly([[tip[0] - 9, tip[1] + 9], [tip[0] + 9, tip[1] + 9], [tip[0], tip[1] - 5]], "#FFF2E4"); g.line(R(tip[0] - 9), R(tip[1] + 9), R(tip[0]), R(tip[1] - 5), O); g.line(R(tip[0] + 9), R(tip[1] + 9), R(tip[0]), R(tip[1] - 5), O);
    const xa = aa * sm(t, ARROW.hit, ARROW.hit + 0.15); if (xa > 0) { xMark(c, tip[0], tip[1] - 14, 12, xa); glow(c, tip[0], tip[1] - 14, 30, 24, RED, 0.4 * xa); }
  }
  // the dotted maze path with something new at every corner
  const ma = win(t, MAZE.t0, MAZE.out, 0.2, 0.5);
  if (ma > 0) {
    dots(c, V, MAZE_PTS, mazeHead(t), UI.Y, ma, 30, t < MAZE.t1 + 0.2);
    for (const cn of CORNERS) { const k = win(t, cn.t - 0.05, cn.t + 0.9, 0.12, 0.5) * ma; if (k <= 0) continue; const [px, py] = P2(V, cn.x, 150, cn.z), up = ease(clamp01((t - cn.t) / 0.4)) * 10;
      sparkle(c, px + 14, py - 6 - up, t - cn.t, k); bigText(c, "!", px + 14, R(py - 18 - up), 2, UI.Y, k); }
  }
}
function sparkle(c, x, y, u, a) { const g = fade(c, a); for (let i = 0; i < 6; i++) { const an = (i / 6) * Math.PI * 2 + u * 2, r = 6 + 10 * clamp01(u * 2); g.rect(R(x + Math.cos(an) * r) - 1, R(y + Math.sin(an) * r * 0.8) - 1, 2, 2, i % 2 ? "#FFFFFF" : UI.Y); } }
// ---------------------------------------------------------------- 5. HOTEL / FOOD routes
function sign(c, V, txt, wx, wy, wz, col, a) {
  if (a <= 0) return; const [px, py] = P2(V, wx, wy, wz), w = c.measure(MAIN, txt, { scale: 2 }) + 18, h = 26, x = R(clampX(px - w / 2, w)), y = R(clampY(py - h, h)), g = fade(c, a);
  g.line(R(px), y + h, R(px), R(py) + 6, col);
  g.rrect(x + 2, y + 3, w, h, "#05030A", 3); g.rrect(x, y, w, h, col, 3); g.rrect(x + 2, y + 2, w - 4, h - 4, "#160E22", 2); g.text(MAIN, txt, x + 9, y + 7, col, { scale: 2 });
}
function routes(c, V, t) {
  const out = 1 - sm(t, ROUTES.out, ROUTES.out + 0.5);
  const ra = sm(t, ROUTES.room, ROUTES.room + 0.3) * out, fa = sm(t, ROUTES.food, ROUTES.food + 0.3) * out;
  if (ra > 0) { dots(c, V, HOTEL_PTS, HOTEL_L * ease(clamp01((t - ROUTES.room) / 1.6)), UI.Y, ra, 34, t < ROUTES.room + 1.7); }
  if (fa > 0) { dots(c, V, FOOD_PTS, FOOD_L * ease(clamp01((t - ROUTES.food) / 1.6)), UI.CY, fa, 34, t < ROUTES.food + 1.7); }
  sign(c, V, "HOTEL", -90, 230, -2240, UI.Y, ra); sign(c, V, "FOOD", -760, 180, -2200, UI.CY, fa);
}
// ---------------------------------------------------------------- 6. the smell: scent swirls blown over the hall
const SWIRLS = (() => { const out = []; for (let i = 0; i < 22; i++) out.push({ x0: [-560, 560, -1000, 1000][i % 4] + (rnd(i * 3) - 0.5) * 200, z0: i % 4 < 2 ? -2380 : -500 - rnd(i * 5) * 1600, vx: i % 4 === 2 ? 1 : i % 4 === 3 ? -1 : (rnd(i) - 0.5) * 0.6, vz: i % 4 < 2 ? 1 : (rnd(i * 7) - 0.5) * 0.5, d: rnd(i * 11) * 0.9, col: ["#FF6FB0", "#B080FF", "#FFC040", "#50E0C0"][i % 4], ph: rnd(i * 13) * 6 }); return out; })();
function smell(c, V, t) {
  const A = win(t, SMELL.t0, SMELL.t1, 0.5, 0.6); if (A <= 0) return;
  for (const s of SWIRLS) {
    const u = clamp01((t - SMELL.t0 - s.d) / 2.6); if (u <= 0) continue;
    const a = A * sm(u, 0, 0.2) * (0.6 + 0.4 * sm(t, SMELL.blown, SMELL.blown + 0.4)), x = s.x0 + s.vx * u * 900, z = s.z0 + s.vz * u * 1100, y = 170 + 40 * Math.sin(u * 4 + s.ph), [px, py, k] = V.P(x, y, z);
    const g = fade(c, a * 0.95), R0 = Math.max(12, 40 * k + 6);
    // a curly scent ribbon: a short spiral trail
    for (let j = 0; j < 40; j++) { const v = j / 40, an = s.ph + t * 3 + v * 9, rr = R0 * (0.2 + 0.8 * v), qx = px - v * R0 * 2.2 * Math.sign(s.vx || 1) + Math.cos(an) * rr * 0.6, qy = py + Math.sin(an) * rr * 0.45; g.rect(R(qx), R(qy) + 1, 3, 2, "#2A1030"); g.rect(R(qx), R(qy), 3, 2, j % 6 === 0 ? "#FFFFFF" : s.col); }
  }
}
// ---------------------------------------------------------------- 7. faster music → faster bets
function music(c, V, t) {
  const A = win(t, MUSIC.t0, MUSIC.t1, 0.3, 0.5); if (A <= 0) return;
  const [tx, ty] = P2(V, 790, 150, -800);
  for (const [i, tb] of BETS.entries()) { const u = (t - tb + 0.3) / 1.5; if (u <= 0 || u >= 1) continue; const a = A * Math.min(sm(u, 0, 0.12), 1 - sm(u, 0.7, 1));
    const x = tx - 90 + ((i * 47) % 150) + Math.sin(u * 5 + i) * 8, y = ty - 10 - u * 110; musicNote(c, R(x), R(y), 3, ["#FFD860", "#F7A6D0", "#9AE6F0", "#C8A8FF"][i % 4], a); }
  // the tempo gauge: a little metronome whose arm swings with the bets
  const w = 70, h = 84, x = R(clampX(tx + 60, w)), y = R(clampY(ty - 160, h)), g = fade(c, A);
  plaque(c, x, y, w, h, A, RAMP.gold);
  g.poly([[x + 20, y + 72], [x + 50, y + 72], [x + 42, y + 14], [x + 28, y + 14]], RAMP.wood[4]); g.poly([[x + 24, y + 70], [x + 46, y + 70], [x + 40, y + 18], [x + 30, y + 18]], RAMP.wood[6]);
  let ph = 0; { let last = MUSIC.t0, side = -1; for (const tb of BETS) { if (t < tb) { const k = clamp01((t - last) / (tb - last)); ph = side * Math.cos(Math.PI * k); break; } last = tb; side = -side; ph = side; } }
  const an = ph * 0.5, bx = x + 35, by = y + 66; for (let s2 = 0; s2 <= 12; s2++) { const v = s2 / 12; g.rect(R(bx + Math.sin(an) * 50 * v), R(by - Math.cos(an) * 50 * v), 2, 2, "#F4EEDC"); }
  g.rect(R(bx + Math.sin(an) * 34) - 3, R(by - Math.cos(an) * 34) - 2, 7, 5, RAMP.gold[6]);
  const spd = BETS.filter((b) => b < t).length; for (let i = 0; i < Math.min(5, spd / 2); i++) g.rect(x + 8, y + 64 - i * 9, 6, 6, i > 2 ? RED : UI.GR);
}
// ---------------------------------------------------------------- 8. the new casino: small sparks on each word, the cage
function growSparks(c, V, t) {
  for (const [t0, x, y, z] of [[GROW.walls0, 2000, 860, -2390], [GROW.day0, 1766, 420, -2385], [GROW.plants0, 1820, 260, -640], [GROW.clocks0, 1840, 300, -930]]) {
    const k = win(t, t0, t0 + 0.9, 0.1, 0.5); if (k <= 0) continue; const [px, py] = P2(V, x, y, z); sparkle(c, clampX(px, 0, 50, 430), clampY(py, 0, 170, 600), t - t0, k);
  }
}
function cage(c, V, t) {
  const A = sm(t, CAGE.t0, CAGE.t1); if (A <= 0) return;
  const x0 = NEW.x0 - 40, x1 = NEW.x1 + 60, z0 = NEW.z0 - 60, z1 = NEW.z1 + 60, H = 1060, rise = ease(clamp01((t - CAGE.t0) / 0.9));
  const g = fade(c, A), col = "#FFE9A8";
  const bar = (x, z) => { const a0 = P2(V, x, 0, z), a1 = P2(V, x, H * rise, z); g.line(R(a0[0]) + 1, R(a0[1]), R(a1[0]) + 1, R(a1[1]), "#3A2A10", [5, 3]); g.line(R(a0[0]), R(a0[1]), R(a1[0]), R(a1[1]), col, [5, 3]); };
  for (let x = x0; x <= x1; x += 160) { bar(x, z0); bar(x, z1); }
  for (let z = z0 + 160; z < z1; z += 160) { bar(x0, z); bar(x1, z); }
  const ring = (y) => dashedPoly(c, [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]].map(([x, z]) => P2(V, x, y, z)), col, A, [5, 3], 2);
  ring(0); if (rise > 0.98) ring(H); else ring(H * rise);
  if (rise > 0.9) { const k = sm(rise, 0.9, 1); for (let x = x0 + 160; x < x1; x += 320) { const p = P2(V, x, H, (z0 + z1) / 2); void p; } void k; }
}
// ---------------------------------------------------------------- the hero marker in wide shots
function heroMarker(c, V, t) {
  if (!V.heroHead || t < WALK1.t0 - 0.2) return; const k = 1 - sm(V.heroZ ?? 1, 0.55, 0.8); if (k <= 0) return;
  const [hx, hy] = V.heroHead, bob = Math.sin(t * 5) * 2, g = fade(c, k), y = R(hy - 12 + bob);
  if (hx < 10 || hx > 530 || hy < 0 || hy > 960) return;
  g.poly([[hx - 7, y - 9], [hx + 7, y - 9], [hx, y]], O); g.poly([[hx - 5, y - 8], [hx + 5, y - 8], [hx, y - 2]], UI.Y);
  const [fx, fy] = V.heroFeet; for (let i = 0; i < 24; i++) { const an = (i / 24) * Math.PI * 2; g.px(R(fx + Math.cos(an) * 11), R(fy + Math.sin(an) * 4), i % 2 ? UI.Y : "#FFF6DA"); }
}

export function drawStory(c, V, t) {
  clockMyth(c, V, t); book(c, t); bubble(c, V, t); air(c, V, t); arrowMaze(c, V, t); routes(c, V, t); smell(c, V, t); music(c, V, t); growSparks(c, V, t); cage(c, V, t); heroMarker(c, V, t);
}
export { END, EV };
