// «A casino doesn't need to cheat you»: the film's own layer over the casino kit — the hero table (dealer, wheel, ball,
// bets, the gold thread from the 0 to the bank, coins, the win, the doubling tower) and the explainer boards (37 ≠ 36,
// the line chart, the calendar). Everything is a pure function of t and the timeline.
import { MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, sm, ease, lerp, win, rnd, mix, fade, glow, shadow, makeView, camAt, drawCasino, TABLES } from "./casino.mjs";
import { drawRouletteTable, ballState, pocketRel, cellLocal, TOP, WHEEL, BANK } from "./casino-roulette.mjs";
import { chipStack, coin, stool, CHIP_RAMPS } from "./casino-props.mjs";
import { drawPerson, drawDealer, idlePose, cheerPose, clapPose, LOOKS } from "./casino-people.mjs";
import { REST } from "./hero.mjs";
import { EV, END, SPIN1, SPIN2, SWEEP1, CHASE, B37, B36, DIM0, THREAD, BETS2, CENTS, WIN, PULL, SPARK, CHART, TOWER, CAL, CAM } from "./timeline.mjs";

const T = { x: 0, z: 0 }, HERO = { x: -100, z: 55 }, NEIGH = { x: 100, z: 42 };
export const wheelAng = (t) => 0.4 + 1.15 * t;
export const ball = (t) => ballState(t, t < SPIN2.t0 ? SPIN1 : SPIN2, wheelAng);
const BANK_PT = (i) => [BANK.x0 + 10 + (i % 8) * 10.5, (BANK.z0 + BANK.z1) / 2];

// ---------------------------------------------------------------- bets (local table coords)
const BETS1 = [{ n: 4, count: 3, ramp: CHIP_RAMPS.blue }, { n: 8, count: 2, ramp: CHIP_RAMPS.red }, { n: 13, count: 3, ramp: CHIP_RAMPS.green }, { n: 17, count: 2, ramp: CHIP_RAMPS.yellow }, { n: 23, count: 4, ramp: CHIP_RAMPS.purple }, { n: 29, count: 2, ramp: CHIP_RAMPS.black }, { n: 11, count: 2, ramp: CHIP_RAMPS.red }];
const BETS2L = [{ n: 17, count: 3, ramp: CHIP_RAMPS.yellow, from: [-56, 50], hero: true }, { n: 5, count: 2, ramp: CHIP_RAMPS.green, from: [56, 40] }, { n: 22, count: 3, ramp: CHIP_RAMPS.purple, from: [-56, -40] }, { n: 31, count: 2, ramp: CHIP_RAMPS.blue, from: [56, 60] }, { n: 10, count: 2, ramp: CHIP_RAMPS.red, from: [56, -50] }];
const arc = (p, q, u, h) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u), Math.sin(Math.PI * u) * h];
export function chipsAt(t) {
  const out = [];
  // round 1: bets lie on the felt from frame 0; the 0 wins, every bet glides to the bank on "does all the work"
  BETS1.forEach((b, i) => { const t0 = SWEEP1.t0 + i * SWEEP1.stagger, u = ease(clamp01((t - t0) / SWEEP1.dur)); if (u >= 1) return;
    const [cx, cz] = cellLocal(b.n), [bx, bz] = BANK_PT(i), [x, z, y] = arc([cx, cz], [bx, bz], u, 34); out.push({ x, z, y: y + u * 6, count: b.count, ramp: b.ramp, a: 1 - sm(u, 0.85, 1) }); });
  // round 2: new bets slide in from the players' edges, a coin flies from each; 17 wins
  BETS2L.forEach((b, i) => { const t0 = BETS2.in + i * 0.12; if (t < t0) return; const u = ease(clamp01((t - t0) / BETS2.dur)), [cx, cz] = cellLocal(b.n);
    let x = lerp(b.from[0], cx, u), z = lerp(b.from[1], cz, u), y = 0, a = sm(t, t0, t0 + 0.15), glw = 0;
    if (b.hero) { glw = sm(t, WIN.land, WIN.land + 0.3) * (1 - sm(t, WIN.pay1, WIN.pay1 + 0.4)); const v = ease(clamp01((t - WIN.pay0) / (WIN.pay1 - WIN.pay0))); x = lerp(x, -50, v); z = lerp(z, 46, v); }
    else { const t1 = WIN.lose0 + i * 0.1, v = ease(clamp01((t - t1) / 0.7)); if (v >= 1) return; const [bx, bz] = BANK_PT(i + 3), p = arc([x, z], [bx, bz], v, 30); x = p[0]; z = p[1]; y = p[2] + v * 6; a *= 1 - sm(v, 0.85, 1); }
    out.push({ x, z, y, count: b.count, ramp: b.ramp, a, glow: glw }); });
  // the payout: a tall stack slides from the bank to the hero
  if (t > WIN.pay0 - 0.2) { const u = ease(clamp01((t - WIN.pay0) / (WIN.pay1 - WIN.pay0))), [bx, bz] = BANK_PT(4); const x = lerp(bx, -42, u), z = lerp(bz + 8, 50, u), y = Math.sin(Math.PI * u) * 22;
    out.push({ x, z, y, count: 12, ramp: CHIP_RAMPS.yellow, a: sm(t, WIN.pay0 - 0.2, WIN.pay0 + 0.05), glow: sm(t, WIN.pay1 - 0.2, WIN.pay1) * (1 - sm(t, WIN.end - 0.6, WIN.end)) }); }
  // the hero's resting stack (his own chips) on the rail edge
  out.push({ x: -50, z: 66, count: t > TOWER.cam0 ? 0 : 5, ramp: CHIP_RAMPS.yellow });
  return out;
}

// ---------------------------------------------------------------- wheel highlights
function wheelState(t) {
  const glw = {}, dim = {}, b = ball(t);
  glw[0] = Math.max(win(t, SPIN1.tLand - 0.05, CHASE.t0, 0.25, 0.4), win(t, EV.green2 - 0.1, THREAD.out, 0.3, 0.6) * (0.75 + 0.25 * Math.sin(t * 7)));
  glw[17] = win(t, SPIN2.tLand - 0.02, PULL.t0 + 0.6, 0.25, 0.8);
  if (t > CHASE.t0 && t < CHASE.out + 0.4) { const head = ((t - CHASE.t0) / (CHASE.t1 - CHASE.t0)) * 37; const POCK = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    POCK.forEach((n, i) => { const d = head - i, trail = d >= 0 ? (head >= 37 ? 0.3 : Math.max(0, 1 - d / 7)) : 0; const v = trail * (1 - sm(t, CHASE.out - 0.2, CHASE.out + 0.3)); if (v > 0) glw[n] = Math.max(glw[n] ?? 0, v); }); }
  dim[0] = sm(t, DIM0.in, DIM0.in + 0.4) * (1 - sm(t, DIM0.out, DIM0.out + 0.25));
  if (dim[0] > 0) glw[0] = 0;
  return { ang: wheelAng(t), ball: b, glow: glw, dim };
}

// ---------------------------------------------------------------- people at the hero table
function heroPose(t, G, V) {
  let p = idlePose(t, 3, { near: [12, -45], far: [5, -37] });
  // pushes his bet onto 17
  const b0 = BETS2.in, b1 = BETS2.in + BETS2.dur;
  if (t > b0 - 0.35 && t < b1 + 0.4) { const [cx, cz] = cellLocal(17), u = ease(clamp01((t - b0) / BETS2.dur)), x = lerp(-56, cx, Math.min(u, 0.25)), z = lerp(50, cz, Math.min(u, 0.25)), [sx, sy] = V.P(x - 4, TOP + 3, z), tgt = V.toRig(G, sx, sy), k = win(t, b0 - 0.35, b1 - 0.25, 0.3, 0.45); p.near = [lerp(p.near[0], tgt[0], k), lerp(p.near[1], tgt[1], k)]; p.press = k; }
  // cheers on the win
  const ck = win(t, WIN.cheer, WIN.end, 0.3, 0.5); if (ck > 0) p = cheerPose(t, p, ck, 0.4);
  // the doubling: pushes chips onto the tower on every step, then leans back surprised
  if (t > TOWER.cam0) {
    for (const [ts] of TOWER.steps) { const k = win(t, ts - 0.28, ts + 0.05, 0.2, 0.3); if (k > 0) { const [sx, sy] = V.P(TOWER_X - 9, TOP + 5, TOWER_Z + 2), tgt = V.toRig(G, sx, sy); p.near = [lerp(p.near[0], tgt[0], k), lerp(p.near[1], tgt[1], k)]; } }
    const s = sm(t, TOWER.wobble - 0.3, TOWER.wobble + 0.2) * (1 - sm(t, TOWER.out, TOWER.out + 0.6)); p.mouth = Math.max(p.mouth, s); p.lean = lerp(p.lean, -0.12, s); p.headTilt = lerp(p.headTilt, -0.3, s); p.brows = 1.5 * s;
    p.far = [lerp(p.far[0], 9, s), lerp(p.far[1], -70, s)];
  }
  return p;
}
const TOWER_X = -42, TOWER_Z = 74;
function towerCount(t) {
  let n = 0; for (const [ts, v] of TOWER.steps) if (t >= ts) n = v; return n;
}
function drawTower(c, V, t) {
  if (t < TOWER.steps[0][0] - 0.1 || t > TOWER.out + 0.7) return;
  const a = 1 - sm(t, TOWER.out, TOWER.out + 0.6), r = 6.5, h = 2.3;
  // the chips of each step fall in one after another (staggered), the whole tower sways after "fortune"
  let prev = 0; const amp = 7 * sm(t, TOWER.wobble - 0.2, TOWER.wobble + 0.6), sway = (i) => amp * Math.pow(i / 64, 2) * Math.sin(t * 3.4 + i * 0.015);
  const chips = [];
  for (const [ts, v] of TOWER.steps) { if (t < ts) break; const add = v - prev, dur = Math.min(0.42, 0.06 + add * 0.012); for (let i = prev; i < v; i++) { const ti = ts + ((i - prev) / Math.max(1, add)) * dur, u = clamp01((t - ti) / 0.12); if (t < ti) continue; chips.push({ i, drop: (1 - ease(u)) * 14, a: sm(t, ti, ti + 0.06) }); } prev = v; }
  const ramps = [CHIP_RAMPS.yellow, CHIP_RAMPS.yellow, CHIP_RAMPS.red, CHIP_RAMPS.yellow, CHIP_RAMPS.yellow, CHIP_RAMPS.purple];
  for (const ch of chips) chipStack(c, V, TOWER_X + sway(ch.i), TOP + 0.6 + ch.i * h + ch.drop, TOWER_Z, 1, ramps[ch.i % 6], { r, h, a: a * ch.a, spin: ch.i * 0.7 });
  // the single chip it would win back
  if (t > TOWER.one - 0.1) { const u = ease(clamp01((t - TOWER.one) / 0.5)); chipStack(c, V, lerp(TOWER_X + 40, TOWER_X + 22, u), TOP + 0.6, TOWER_Z + 6, 1, CHIP_RAMPS.green, { r, h, a: a * sm(t, TOWER.one - 0.1, TOWER.one + 0.15), glow: sm(t, TOWER.plus, TOWER.plus + 0.3) }); }
}

/** The hero table group: dealer, table + wheel + chips, players, the tower, the gold thread and coins. */
function heroTable(c, V, t) {
  // dealer: hands at the bank; the right hand flicks the ball on spin 2
  const flick = win(t, SPIN2.t0 - 0.45, SPIN2.t0 + 0.1, 0.3, 0.35), rh = [lerp(30, 34, flick), TOP + 2 + 4 * flick, lerp(-168, -140, flick)];
  const nod = 1.5 * win(t, THREAD.bank, THREAD.bank + 0.8, 0.2, 0.3) * Math.sin((t - THREAD.bank) * 9);
  drawDealer(c, V, T.x, T.z - 205, t, { hands: [[-30, TOP + 2, -168], rh], smile: 0.4 + 0.5 * win(t, THREAD.bank, THREAD.out, 0.3, 0.4), nod });
  drawRouletteTable(c, V, T, { wheel: wheelState(t), chips: chipsAt(t), cells: { 0: Math.max(win(t, SPIN1.tLand, CHASE.t0, 0.2, 0.4), win(t, EV.green2, THREAD.out, 0.3, 0.5)), 17: win(t, SPIN2.tLand, PULL.t0, 0.2, 0.6) }, bank: win(t, THREAD.bank, THREAD.bank + 1.2, 0.15, 0.6) + 0.6 * win(t, CENTS.t0 + 0.4, CENTS.t0 + 1.4, 0.2, 0.4) });
  // players: two far ones, then the hero and the neighbour
  drawPerson(c, V, -100, -48, t, idlePose(t, 11, { near: [13, -45] }), LOOKS.mustard);
  drawPerson(c, V, 100, -70, t, clapPose(t, idlePose(t, 12), 0.6 * win(t, WIN.clap + 0.2, WIN.end, 0.3, 0.5)), LOOKS.suit, { mirror: true });
  const G = V.bill(HERO.x, HERO.z, 1.75, 0.86, false);
  drawPerson(c, V, HERO.x, HERO.z, t, heroPose(t, G, V), LOOKS.hero);
  drawPerson(c, V, NEIGH.x, NEIGH.z, t, clapPose(t, idlePose(t, 13, { near: [13, -45] }), win(t, WIN.clap, WIN.end, 0.25, 0.5)), LOOKS.teal, { mirror: true });
  for (const x of [-40, 40]) stool(c, V, x, 190);
  drawTower(c, V, t);
  // the gold thread: from the green 0 (it turns with the wheel) to the casino's bank
  const ta = win(t, THREAD.in - 0.05, THREAD.out, 0.15, 0.5);
  if (ta > 0) { const a = wheelAng(t) + pocketRel(0), p0 = V.P(T.x + Math.cos(a) * 27, TOP, T.z + WHEEL.z + Math.sin(a) * 27), p1 = V.P(T.x, TOP + 7, T.z + (BANK.z0 + BANK.z1) / 2), mid = [(p0[0] + p1[0]) / 2, Math.min(p0[1], p1[1]) - 40 * p0[2] / 2];
    const head = ease(clamp01((t - THREAD.in) / (THREAD.full - THREAD.in))), g = fade(c, ta), n = 60, pts = [];
    for (let i = 0; i <= n * head; i++) { const u = i / n, x = (1 - u) ** 2 * p0[0] + 2 * u * (1 - u) * mid[0] + u * u * p1[0], y = (1 - u) ** 2 * p0[1] + 2 * u * (1 - u) * mid[1] + u * u * p1[1]; pts.push([x, y]); }
    for (let i = 0; i < pts.length - 1; i++) { g.line(R(pts[i][0]), R(pts[i][1]) + 2, R(pts[i + 1][0]), R(pts[i + 1][1]) + 2, "#7A4A10"); g.line(R(pts[i][0]), R(pts[i][1]) + 1, R(pts[i + 1][0]), R(pts[i + 1][1]) + 1, "#E8A830"); g.line(R(pts[i][0]), R(pts[i][1]), R(pts[i + 1][0]), R(pts[i + 1][1]), "#FFF2A8"); }
    for (let i = 0; i < pts.length; i += 6) glow(c, pts[i][0], pts[i][1], 7, 7, "#FFD060", 0.25 * ta);
    for (let k = 0; k < 4; k++) { const u = ((t * 0.8 + k / 4) % 1) * head, i = Math.floor(u * n); if (pts[i]) { glow(c, pts[i][0], pts[i][1], 9, 9, "#FFE27A", 0.5 * ta); g.px(R(pts[i][0]), R(pts[i][1]) - 1, "#FFFFFF"); } }
    if (head > 0.98) glow(c, p1[0], p1[1], 40, 22, "#FFD060", 0.4 * ta * win(t, THREAD.bank, THREAD.out, 0.2, 0.5));
  }
  // a little coin from every bet flies to the bank
  BETS2L.forEach((b, i) => { const t0 = CENTS.t0 + i * CENTS.stagger, u = clamp01((t - t0) / CENTS.dur); if (t < t0 || u >= 1) return; const [cx, cz] = cellLocal(b.n), [bx, bz] = BANK_PT(i * 2), x = lerp(cx, bx, ease(u)), z = lerp(cz, bz, ease(u)), y = TOP + 6 + Math.sin(Math.PI * u) * 34;
    coin(c, V, x, y, z, sm(u, 0, 0.12) * (1 - sm(u, 0.85, 1)), u * 14); });
}

// ---------------------------------------------------------------- the world for this frame
export function drawWorld(c, t) {
  const V = makeView(camAt(CAM, t));
  drawCasino(c, V, t, { skip: ["hero"], items: [{ z: 0, draw: () => heroTable(c, V, t) }] });
  // "millions of games": wins twinkle all over the floor
  if (t > SPARK.t0 && t < SPARK.t1 + 0.5) for (let i = 0; i < 46; i++) { const tb = TABLES[i % TABLES.length], ti = SPARK.t0 + rnd(i * 3 + 1) * (SPARK.t1 - SPARK.t0 - 0.4), u = (t - ti) / 0.5; if (u < 0 || u > 1) continue;
    const [sx, sy] = V.P(tb.x + (rnd(i * 5) - 0.5) * 160, 130 + rnd(i * 7) * 80, tb.z + (rnd(i * 11) - 0.5) * 140), s = Math.sin(Math.PI * u) * 6, g = fade(c, Math.sin(Math.PI * u));
    g.rect(R(sx - s), R(sy), R(2 * s) + 1, 1, "#FFF6C8"); g.rect(R(sx), R(sy - s), 1, R(2 * s) + 1, "#FFF6C8"); g.rect(R(sx - 1), R(sy - 1), 3, 3, "#FFE27A"); glow(c, sx, sy, 14, 14, "#FFD060", 0.4 * Math.sin(Math.PI * u)); }
  return V;
}

// ---------------------------------------------------------------- explainer boards (screen space)
function plaque(c, x, y, w, h, a, edge = RAMP.gold) {
  const g = fade(c, a); g.rrect(x, y + 3, w, h, "#05030A", 3); g.rrect(x, y, w, h, edge[2], 3); g.rrect(x + 2, y + 2, w - 4, h - 4, edge[5], 2); g.rrect(x + 4, y + 4, w - 8, h - 8, "#160E22", 2);
  g.rect(x + 8, y + 5, w - 16, 1, "#2A1E3A");
}
function bigText(c, txt, cx, y, scale, col, a, shadowCol = "#05030A") { const g = fade(c, a), w = c.measure(MAIN, txt, { scale }); g.text(MAIN, txt, R(cx - w / 2) + Math.max(1, scale / 2 | 0), y + Math.max(1, scale / 2 | 0), shadowCol, { scale }); g.text(MAIN, txt, R(cx - w / 2), y, col, { scale }); return w; }
function tinyText(c, txt, cx, y, col, a, scale = 2) { const g = fade(c, a), w = c.measure(TINY, txt, { scale }); g.text(TINY, txt, R(cx - w / 2), y, col, { scale }); }
function label(c, txt, cx, y, col, a, scale = 2) { const g = fade(c, a), w = c.measure(MAIN, txt, { scale }); g.text(MAIN, txt, R(cx - w / 2) + 1, y + 1, "#05030A", { scale }); g.text(MAIN, txt, R(cx - w / 2), y, col, { scale }); }

function badges(c, t) {
  const a37 = win(t, B37.in, B37.out, 0.25, 0.35); if (a37 <= 0) return;
  const k = ease(clamp01((t - B37.left) / 0.45)), cx = lerp(270, 150, k), y0 = 170 + R((1 - sm(t, B37.in, B37.in + 0.3)) * 10);
  plaque(c, R(cx - 70), y0, 140, 104, a37); bigText(c, "37", cx, y0 + 18, 7, UI.IV, a37); tinyText(c, "NUMBERS", cx, y0 + 80, "#E8D8A8", a37);
  const a36 = win(t, B36.in, B36.out, 0.25, 0.35);
  if (a36 > 0) { const y1 = 170 + R((1 - sm(t, B36.in, B36.in + 0.3)) * 10); plaque(c, 320, y1, 140, 104, a36); bigText(c, "36", 390, y1 + 18, 7, UI.Y, a36); tinyText(c, "PAYS LIKE", 390, y1 + 80, "#E8D8A8", a36); }
  const an = win(t, B36.neq, B36.out, 0.25, 0.35);
  if (an > 0) { const g = fade(c, an), s = 1 + 0.25 * (1 - sm(t, B36.neq, B36.neq + 0.25)), cx = 270, cy = 222;
    for (const [col, o] of [["#05030A", 2], [UI.PK, 0]]) { for (const dy of [-10, 5]) g.rect(R(cx - 22 * s), R(cy + dy * s) + o, R(44 * s), R(6 * s), col); for (let i = -4; i <= 4; i++) g.rect(R(cx + i * 3 * s) - 3, R(cy - i * 7 * s) - 3 + o, 6, 7, col); } }
}

// the chart board: thin table lines evening out into the casino's gap, then YOU vs CASINO
const PX = (u) => 86 + u * 360, PY = (v) => 430 - v * 150;
const zig = (i, u) => { let s = 0; for (let k = 1; k <= 4; k++) s += Math.sin(u * (5 + k * 3.7 + i * 0.9) * 2 + rnd(i * 13 + k) * 6.28) / k; return s * 0.55; };
const YOU = [[0, 0], [0.07, 0.55], [0.14, -0.25], [0.22, 0.75], [0.3, -0.45], [0.38, 0.35], [0.46, -0.85], [0.55, 0.6], [0.63, -0.35], [0.72, 0.8], [0.8, -0.65], [0.88, 0.25], [1, -0.4]];
export const youVal = (u) => { for (let i = 1; i < YOU.length; i++) if (u <= YOU[i][0]) { const [u0, v0] = YOU[i - 1], [u1, v1] = YOU[i]; return lerp(v0, v1, (u - u0) / (u1 - u0)); } return YOU[YOU.length - 1][1]; };
function thick(g, x0, y0, x1, y1, col, w) { for (let d = 0; d < w; d++) g.line(R(x0), R(y0) + d - (w >> 1), R(x1), R(y1) + d - (w >> 1), col); }
function chartBoard(c, t) {
  const a = win(t, CHART.in, CHART.out, 0.35, 0.4); if (a <= 0) return;
  const g = fade(c, a), x0 = 40, y0 = 160, w = 460, h = 440;
  plaque(c, x0, y0, w, h, a);
  // marquee bulbs around the frame
  for (let i = 0; i < 40; i++) { const per = 2 * (w + h), s = (i / 40) * per; let x, y; if (s < w) { x = x0 + s; y = y0 + 1; } else if (s < w + h) { x = x0 + w - 2; y = y0 + s - w; } else if (s < 2 * w + h) { x = x0 + w - (s - w - h); y = y0 + h - 2; } else { x = x0 + 1; y = y0 + h - (s - 2 * w - h); }
    const on = (i + Math.floor(t * 6)) % 3 === 0; g.rect(R(x) - 1, R(y) - 1, 3, 3, on ? "#FFF6C8" : "#B07A28"); if (on) glow(c, x, y, 6, 6, "#FFD060", 0.4 * a); }
  // grid + zero axis
  for (let i = 0; i <= 8; i++) g.rect(R(PX(i / 8)), 196, 1, 384, "#241A34");
  for (let v = -1; v <= 1.2; v += 0.5) g.rect(76, R(PY(v)), 380, 1, "#241A34");
  g.rect(76, R(PY(0)), 380, 2, "#5A4A6E"); g.rect(R(PX(0)), 196, 2, 384, "#5A4A6E");
  // phase 1: one thin line per table, drawn left to right, then they even out into the gap line
  const p1 = 1 - sm(t, CHART.clear0, CHART.clear1);
  if (p1 > 0) {
    const draw = ease(clamp01((t - CHART.draw0) / (CHART.draw1 - CHART.draw0))), merge = ease(clamp01((t - CHART.merge0) / (CHART.merge1 - CHART.merge0))), cols = ["#7FA8E8", "#E08A9A", "#8AD89A", "#C8A0E8", "#E8C070", "#70D0D8", "#E89A70", "#A0B0C0", "#D8D870"];
    const gp = fade(c, a * p1);
    for (let i = 0; i < 9; i++) { let px = PX(0), py = PY(0); for (let s = 1; s <= 60 * draw; s++) { const u = s / 60, v = 0.32 * u + (1 - merge) * zig(i, u) * Math.min(1, u * 4), X = PX(u), Y = PY(v); gp.line(R(px), R(py), R(X), R(Y), mix(cols[i], "#FFD060", merge * 0.7)); px = X; py = Y; } }
    if (merge > 0.6) { const ga = fade(c, a * p1 * sm(merge, 0.6, 1)); thick(ga, PX(0), PY(0), PX(1), PY(0.32), "#FFD060", 3); }
    const gk = a * p1 * sm(t, CHART.gap, CHART.gap + 0.3); if (gk > 0) { const gg = fade(c, gk), x = R(PX(1)) + 8; gg.rect(x, R(PY(0.32)), 2, R(PY(0) - PY(0.32)), UI.Y); gg.rect(x - 4, R(PY(0.32)), 6, 2, UI.Y); gg.rect(x - 4, R(PY(0)), 6, 2, UI.Y); label(c, "GAP", x - 16, R(PY(0.32)) - 24, UI.Y, gk); }
  }
  // phase 2: YOU zigzags, CASINO goes straight up
  const yu = ease(clamp01((t - CHART.you0) / (CHART.you1 - CHART.you0))), cu = ease(clamp01((t - CHART.cas0) / (CHART.cas1 - CHART.cas0)));
  if (t > CHART.you0) { let px = PX(0), py = PY(0); for (let s = 1; s <= 120 * yu; s++) { const u = s / 120, X = PX(u), Y = PY(youVal(u)); thick(g, px, py, X, Y, "#F08070", 3); px = X; py = Y; }
    g.disc(R(px), R(py), 4, "#FCD0B8"); label(c, "YOU", Math.min(R(px) + 6, 410), R(py) + (youVal(yu) > 0 ? -26 : 12), "#F8A890", a * sm(t, CHART.you0, CHART.you0 + 0.3)); }
  if (t > CHART.cas0) { const X = PX(cu), Y = PY(1.3 * cu); thick(g, PX(0), PY(0), X, Y, "#FFD060", 4); g.disc(R(X), R(Y), 5, "#FFF2B0"); glow(c, X, Y, 18, 18, "#FFD060", 0.5 * a); label(c, "CASINO", Math.min(R(X) - 16, 380), R(Y) - 28, UI.Y, a * sm(t, CHART.cas0, CHART.cas0 + 0.3)); }
}

function towerHud(c, V, t) {
  const a = win(t, TOWER.steps[0][0], TOWER.out, 0.2, 0.4); if (a <= 0) return;
  // the bet on the tower: the label rides next to the top of the tower
  const n = towerCount(t), top = V.P(TOWER_X, TOP + n * 2.3, TOWER_Z), y = Math.max(160, Math.min(560, top[1] - 12)), prevN = (() => { let p = 0; for (const [ts, v] of TOWER.steps) if (t >= ts + 0.25) p = v; return p; })();
  const x = R(top[0] + 36), flip = sm(t, (TOWER.steps.find(([, v]) => v === n) ?? [0])[0], (TOWER.steps.find(([, v]) => v === n) ?? [0])[0] + 0.22);
  plaque(c, x, R(y) - 4, 86, 44, a);
  if (prevN !== n && flip < 1 && prevN > 0) bigText(c, String(prevN), x + 43, R(y) + 6, 3, UI.IV, a * (1 - flip));
  bigText(c, String(n), x + 43, R(y) + 6 + R((1 - flip) * 4), 3, n >= 32 ? UI.PK : UI.IV, a * (prevN === n ? 1 : flip));
  // the losses in a row (red X discs)
  TOWER.losses.forEach((ts, i) => { const k = sm(t, ts, ts + 0.2) * a; if (k <= 0) return; const g = fade(c, k), cx = 62 + i * 34, cy = 176, s = 1 + 0.4 * (1 - sm(t, ts, ts + 0.2)); g.disc(cx, cy + 2, R(12 * s), "#05030A"); g.disc(cx, cy, R(12 * s), "#C8202E"); g.disc(cx - 2, cy - 2, R(8 * s), "#E03C40"); for (let d = -5; d <= 5; d++) { g.rect(cx + d - 1, cy + d - 1, 3, 3, "#FFF6E8"); g.rect(cx + d - 1, cy - d - 1, 3, 3, "#FFF6E8"); } });
  // +1: the single chip it wins back
  const pk = sm(t, TOWER.plus, TOWER.plus + 0.25) * (1 - sm(t, TOWER.out, TOWER.out + 0.4)); if (pk > 0) { const p = V.P(TOWER_X + 22, TOP + 8, TOWER_Z + 6); bigText(c, "+1", R(p[0]), R(p[1]) - 40 - R((1 - pk) * 8), 3, UI.GR, pk); }
}

function calendar(c, t) {
  const a = win(t, CAL.in, CAL.out, 0.35, 0.35); if (a <= 0) return;
  const g = fade(c, a), red = "#C8202E", green = "#2E9A4C", neutral = "#3A3048";
  plaque(c, 40, 156, 460, 450, a);
  const nk = sm(t, CAL.night, CAL.night + 0.3), mk = sm(t, CAL.month, CAL.month + 0.3), yk = sm(t, CAL.year, CAL.year + 0.3);
  // NIGHT
  g.rrect(62, 178, 130, 120, mix(neutral, red, nk), 3); g.rrect(66, 182, 122, 112, mix("#241A34", "#5A0E18", nk), 2); label(c, "NIGHT", 127, 188, "#E8D8A8", a);
  { const cx = 127, cy = 252; g.disc(cx, cy, 20, "#F4E6B0"); g.disc(cx + 9, cy - 6, 18, mix("#241A34", "#5A0E18", nk)); for (const [sx, sy] of [[84, 214], [168, 232], [96, 276], [160, 278]]) g.px(sx, sy, "#FFF6C8"); }
  
  // MONTH
  g.rrect(210, 178, 270, 120, mix(neutral, red, mk), 3); g.rrect(214, 182, 262, 112, mix("#241A34", "#5A0E18", mk), 2); label(c, "MONTH", 345, 188, "#E8D8A8", a);
  for (let i = 0; i < 30; i++) { const col = i % 7, row = Math.floor(i / 7), x = 230 + col * 34, y = 210 + row * 16, bad = i === 13; g.rect(x, y, 28, 13, mix(mix("#3A3050", "#5A1824", mk), red, bad ? nk : mk * 0.7)); g.rect(x, y, 28, 1, "#4A4062"); }
  // YEAR: 12 little months fill in; one stays red, the year ends green
  const yr = mix(neutral, green, yk); g.rrect(62, 318, 418, 270, yr, 3); g.rrect(66, 322, 410, 262, mix("#241A34", "#0E3A1E", yk * 0.8), 2); label(c, "YEAR", 271, 328, "#E8D8A8", a);
  for (let m = 0; m < 12; m++) { const col = m % 4, row = Math.floor(m / 4), x = 82 + col * 98, y = 356 + row * 75, ti = lerp(CAL.fill0, CAL.fill1, m / 11), mkk = sm(t, ti, ti + 0.25), bad = m === 4;
    const fill = bad ? mix("#3A3050", red, Math.max(mk, mkk)) : mix("#3A3050", green, mkk);
    g.rrect(x, y, 86, 64, mix("#140E1E", fill, 0.35), 2);
    for (let d = 0; d < 28; d++) g.rect(x + 5 + (d % 7) * 11, y + 6 + Math.floor(d / 7) * 14, 9, 10, fill); }
  if (yk > 0) { const gg = fade(c, a * yk), s = 3; const tick = [[0, 3], [1, 4], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1], [7, 0]]; for (const [dx, dy] of tick) gg.rect(430 + dx * s, 330 + dy * s - 6, s + 1, s + 1, "#8AF0A0"); glow(c, 271, 452, 230, 150, "#40E070", 0.18 * a * yk); }
}

/** Screen-space story layer (between the world and the follow card). */
export function drawStory(c, V, t) { badges(c, t); chartBoard(c, t); towerHud(c, V, t); calendar(c, t); }
export { towerCount };
