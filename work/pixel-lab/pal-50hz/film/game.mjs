// The game picture inside both screens: OUR OWN 64×48 "green hills" level (blue sky bands, clouds, far hills and a lake,
// a checkered cliff with a waterfall drawn as 1-px vertical stripes — water, background, water, background — a palm-ish
// tree, checkered ground) and OUR OWN fast blue hedgehog with yellow shoes. Not Sega sprites, no logos.
// gameImage(t) → Float32Array(64·48·3), values 0..1; a pure function of t (the same picture for the CRT and the flat).
import { hex } from "../../../../renderer/pixel/raster.mjs";
import { EV, FF, ACT2, MOD, DC, sm } from "./timeline.mjs";
import { TINY } from "../../../../renderer/pixel/raster.mjs";

export const GW = 64, GH = 48;
const P = 160;                                                     // level period (level pixels)
const col = (h) => hex(h).map((v) => v / 255);
const K = {
  sky0: col("#2C54D0"), sky1: col("#2A5CE2"), sky2: col("#5A92F6"), sky3: col("#86BAFC"), sky4: col("#B4DCFF"),
  cloud: col("#F8FCFF"), cloudS: col("#C4DCF6"),
  farHill: col("#2E8A4A"), farHillL: col("#46A85A"), lake: col("#3C86DA"), lakeL: col("#9ED4FF"),
  grass: col("#5CD444"), grassD: col("#349E30"), dirtA: col("#C87A34"), dirtB: col("#8A4E22"), dirtTop: col("#5E3414"),
  water: col("#8ECCFA"), waterL: col("#E6F6FF"), foam: col("#FFFFFF"),
  trunk: col("#A0602A"), trunkD: col("#6A3A18"), leaf: col("#3CB83A"), leafD: col("#1E7A2A"),
  flowerY: col("#FFE040"), flowerR: col("#F05070"),
  post: col("#C8C8D8"), postD: col("#5A5A6E"), flagW: col("#FFFFFF"), flagK: col("#18182A"),
  hudY: col("#FFE030"), hudW: col("#FFFFFF"), hudS: col("#10183A"), menu: col("#1C2C8A"), sel: col("#E83A3A"),
};
// ---------------------------------------------------------------- game time: exact steps, a pure function of t
// Φ(t) = real seconds since both levels started (they started C0 s before frame 0, together). Left (USA · JAPAN) advances
// 60 game steps per real second, right (EUROPE) 50 — until the 60 switch, then 60 too. The game clock counts steps/60
// (the game believes every picture is 1/60 s), so the right clock runs at 5/6 speed. During the labelled fast-forward
// (FF) real time runs K× faster for both rooms, so both reach the 0:59 goal: left at real 0:59, right at real 1:10.8.
// A video frame shows floor(steps): 2 steps per frame on the left, 2·2·1… on the right (5 per 3 frames).
export const C0 = 6, GOAL = 59 * 60, PX_PER_STEP = 40 / 60;
const S3 = (x) => x * x * x - (x * x * x * x) / 2;                         // ∫ smoothstep
const ramp = (t, a, r) => (t <= a ? 0 : t >= a + r ? r / 2 + (t - a - r) : r * S3((t - a) / r));  // ∫ of a smooth 0→1 step
const FF_B = FF.rightGoal + 0.22;
export const ffw = (t) => { const r = FF.ramp; return Math.min(sm(t, FF.a, FF.a + r), 1 - sm(t, FF_B - r, FF_B)); };
const ffInt = (t) => { const r = FF.ramp; if (t <= FF.a) return 0; if (t < FF_B - r) return ramp(t, FF.a, r); if (t < FF_B) return r / 2 + (FF_B - r - FF.a - r) + r * (0.5 - S3((FF_B - t) / r)); return FF_B - FF.a - r; };
let FFK = 1;
export const phi = (t) => C0 + t + (FFK - 1) * ffInt(t);
{ let lo = 1, hi = 60; for (let i = 0; i < 60; i++) { FFK = (lo + hi) / 2; if (phi(FF.rightGoal) < (GOAL / 50)) lo = FFK; else hi = FFK; } }
export const FF_K = FFK;
const solve = (f, target, a, b) => { for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (f(m) < target) a = m; else b = m; } return (a + b) / 2; };
export const GOAL_T = { L: solve(phi, GOAL / 60, 0, ACT2), R: solve(phi, GOAL / 50, 0, ACT2) };
const SWR = 0.4;                                                          // the 60 switch: the Europe game speeds up over 0.4 s
/** Raw (fractional) steps of one screen at film time t. side "L" | "R". */
export function stepsRaw(side, t) {
  if (t < ACT2) return Math.min(GOAL, (side === "L" ? 60 : 50) * phi(t));
  const u = ramp(t, ACT2, 0.3); if (side === "L") return GOAL + 60 * u;   // both start the next run together, 0.3 s to full speed
  return GOAL + 50 * u + 10 * ramp(t, MOD.click, SWR);
}
export const steps = (side, t) => Math.floor(stepsRaw(side, t) + 1e-9);
/** Steps per real second right now (60 or 50, 60 after the switch). */
export const rate = (side, t) => (side === "L" ? 60 : 50 + 10 * sm(t, MOD.click, MOD.click + SWR));
/** Level scroll in game pixels (softly braking into the goal so nothing stops in one frame). */
const B = 30, BE = B / Math.E;
export function scroll(side, t) {
  let s = steps(side, t);
  if (t < ACT2) { if (s > GOAL - B) s = GOAL - B * Math.exp(-(s - (GOAL - B)) / B); } else s -= BE;
  return s * PX_PER_STEP;
}
export const STOP_PX = (GOAL - BE) * PX_PER_STEP;                         // where both hedgehogs stand at the goal
/** Game clock (seconds the game believes have passed in this run). */
export const gameClock = (side, t) => (t < ACT2 ? steps(side, t) : Math.max(0, steps(side, t) - GOAL)) / 60;
export const fmt = (sec) => { const s = Math.floor(sec + 1e-6); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
/** 1 while running, 0 while standing at the goal (crossfaded). */
export const runK = (side, t) => Math.max(1 - sm(t, GOAL_T[side] - 0.05, GOAL_T[side] + 0.2), sm(t, ACT2, ACT2 + 0.25));

// ---------------------------------------------------------------- the hedgehog (our own: round, blue, back spikes, one big eye, yellow shoes)
const HEDGE_PAL = { O: col("#10183A"), D: col("#1A3CA8"), B: col("#2E64E8"), L: col("#78A8FF"), W: col("#FFFFFF"), K: col("#101020"), S: col("#F4C890"), Y: col("#F8D030"), y: col("#B88A10") };
const BODY = [
  "....OOOO....",
  "..OODBBBO...",
  ".ODDBBLLBOO.",
  "ODDBBBBWWWO.",
  ".ODBBBBWWKO.",
  "ODDBBBBSSSSO",
  ".ODBBBBSSSOO",
  "ODDBBBBSSO..",
  ".OODBBBBO...",
];
const LEGS = {
  stand: ["...OBO.OBO..", "..OYYO.OYYO.", "..OOOO.OOOO."],
  run0: ["..OOYYYYO...", ".OYyO.OOYO..", "..OOO.OOO..."],
  run1: ["...OYYYOO...", "..OYOOYyYO..", "...OOOOOO..."],
  run2: ["..OYYOOYO...", ".OyOO.OYYO..", "..OO..OOO..."],
  run3: ["...OOYYYO...", "..OYyOOOYO..", "...OOO.OO..."],
};
const BLINK = ["ODDBBBBDDDO.", ".ODBBBBDDKO."];
function sprite(img, x0, y0, rows, a, blinkK = 0) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === ".") return; let cc = HEDGE_PAL[ch];
    if (blinkK > 0 && (j === 3 || j === 4) && (ch === "W" || ch === "K")) cc = mixc(cc, HEDGE_PAL.D, blinkK);
    put(img, x0 + i, y0 + j, cc, a);
  }));
}
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
function put(img, x, y, c, a = 1) {
  if (x < 0 || y < 0 || x >= GW || y >= GH) return; const i = (y * GW + x) * 3;
  img[i] += (c[0] - img[i]) * a; img[i + 1] += (c[1] - img[i + 1]) * a; img[i + 2] += (c[2] - img[i + 2]) * a;
}
export const HEDGE = { x: 8, y: 24 };                             // top-left of the sprite in game pixels (feet on y 36)

// ---------------------------------------------------------------- level
const ground = (q) => { // ground top (game y) at level position q (0..P)
  if (q >= 76 && q < 130) { const u = (q - 76) / 54; return 36 - Math.round(6 * Math.sin(Math.PI * u)); }
  return 36;
};
const mod = (a, m) => ((a % m) + m) % m;
export const WATER_X = [36, 47];                                   // waterfall columns (screen x when stopped): even = water, odd = background
export const WATER_Y = [13, 36];
const CACHE = new Map();
/** The game picture of one screen ("L" USA · JAPAN, "R" EUROPE) at film time t. Every animation follows the game's own
 *  step clock gt (steps / 60), never the wall clock, so the Europe picture is the same game, 5/6 as fast. */
export function gameImage(t, side = "L") {
  const key = side + t.toFixed(4); if (CACHE.has(key)) return CACHE.get(key); if (CACHE.size > 8) CACHE.clear();
  const img = new Float32Array(GW * GH * 3), s = scroll(side, t), ds = s, gt = steps(side, t) / 60;
  // sky bands
  for (let y = 0; y < GH; y++) { const c = y < 5 ? K.sky0 : y < 11 ? K.sky1 : y < 17 ? K.sky2 : y < 22 ? K.sky3 : K.sky4; for (let x = 0; x < GW; x++) put(img, x, y, c); }
  // clouds (parallax 0.2): the big one sits at x 3..14, y 9..14 when the hedgehog stands
  const clouds = [[3, 9, 12, 6], [44, 3, 10, 4], [92, 6, 14, 5]];
  for (const [cx0, cy0, cw, ch] of clouds) for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const nx = (i + 0.5 - cw / 2) / (cw / 2), ny = (j + 0.5 - ch / 2) / (ch / 2), bump = 0.18 * Math.sin(i * 1.7) + (j === 0 ? 0.3 : 0);
    if (nx * nx + ny * ny * 0.9 > 1 - bump) continue; const x = mod(cx0 + i - Math.round(ds * 0.2), 128); if (x >= GW) continue;
    put(img, x, cy0 + j, j >= ch - 2 && ny > 0.3 ? K.cloudS : K.cloud);
  }
  // lake + far hills (parallax 0.45)
  for (let x = 0; x < GW; x++) { const q = x + ds * 0.45; for (let y = 27; y < 31; y++) put(img, x, y, (y === 28 && mod(Math.round(q * 0.7 + gt * 2), 7) < 2) || (y === 30 && mod(Math.round(q * 0.5 - gt * 1.5), 9) < 2) ? K.lakeL : K.lake);
    const hh = 24 + Math.round(2.6 * Math.sin(q * 0.11) + 1.6 * Math.sin(q * 0.27 + 1.3)); for (let y = hh; y < 28; y++) put(img, x, y, y === hh ? K.farHillL : K.farHill); }
  // foreground (scrolls with the level)
  for (let x = 0; x < GW; x++) {
    const q = mod(x + ds, P), gtop = ground(q);
    // cliff + waterfall at q 24..47
    if (q >= 24 && q < 36) { for (let y = 10; y < gtop; y++) put(img, x, y, y < 12 ? (y === 10 ? K.grass : K.grassD) : y === 12 ? K.dirtTop : (Math.floor(q / 3) + Math.floor((y - 13) / 3)) % 2 ? K.dirtA : K.dirtB); }
    if (q >= 36 && q < 48) {
      for (let y = 10; y < 13; y++) put(img, x, y, y === 10 ? K.grass : y === 11 ? K.grassD : K.dirtTop);   // the ledge the water spills from
      if (Math.round(q - 36) % 2 === 0) for (let y = WATER_Y[0]; y < gtop; y++) {
        const streak = mod(y - Math.floor(gt * 22) + Math.round(q) * 3, 7);
        put(img, x, y, y >= gtop - 2 ? K.foam : streak < 2 ? K.waterL : K.water);
      }
    }
    // a palm-ish tree at q 55 and q 128
    for (const tq of [56, 128]) { const dx = q - tq; if (dx >= -1 && dx <= 1) for (let y = 21; y < ground(tq); y++) put(img, x, y, dx === 1 || y % 3 === 0 ? K.trunkD : K.trunk); }
    // flowers on the grass
    if (q % 11 === 5 && !(q >= 24 && q < 48)) { put(img, x, gtop - 1, K.leafD); put(img, x, gtop - 2, q % 22 === 5 ? K.flowerR : K.flowerY); }
    // ground: grass + checkered earth
    for (let y = gtop; y < GH; y++) put(img, x, y, y === gtop ? K.grass : y === gtop + 1 ? K.grassD : y === gtop + 2 ? K.dirtTop : (Math.floor(q / 4) + Math.floor((y - gtop - 3) / 4)) % 2 ? K.dirtA : K.dirtB);
  }
  // palm fronds (after the trunks)
  for (const tq of [56, 128]) { const x0 = Math.round(tq - ds) - 0; for (let k = -1; k <= 1; k++) { const xb = mod(x0 + k * P, P); if (xb > GW + 6) continue;
    const fr = [[-5, 2], [-4, 1], [-3, 0], [-2, 0], [-1, -1], [0, -1], [1, -1], [2, 0], [3, 0], [4, 1], [5, 2], [-4, 3], [5, 3], [-2, 1], [2, 1], [0, 0]];
    for (const [fx, fy] of fr) put(img, xb + fx, 20 + fy, fy >= 2 || Math.abs(fx) >= 4 ? K.leafD : K.leaf); put(img, xb, 21, K.leafD); } }
  // the goal post (our own: a pole with a checkered flag board) where both runs end at game clock 0:59
  { const x = Math.round(STOP_PX - s) + HEDGE.x + 15; if (x > -6 && x < GW + 6) {
    for (let y = 22; y < 36; y++) put(img, x, y, y % 4 ? K.post : K.postD);
    for (let j = 0; j < 7; j++) for (let i = -3; i <= 3; i++) put(img, x + i, 15 + j, j === 0 || j === 6 || i === -3 || i === 3 ? K.postD : (i + j) % 2 ? K.flagW : K.flagK); } }
  // the hedgehog: run cycle while moving, standing pose at the goal (crossfaded), blinks while standing
  const rk = runK(side, t), q = Math.floor(s / 3.2), fr = ["run0", "run1", "run2", "run3"][((q % 4) + 4) % 4];
  const bob = rk > 0.5 && q % 2 ? -1 : 0, hx = HEDGE.x, hy = HEDGE.y + bob;
  const bp = mod(t - GOAL_T[side] - 0.5, 1.6), blinkK = rk < 0.5 && bp < 0.24 ? Math.sin((Math.PI * bp) / 0.24) : 0;
  sprite(img, hx, hy, BODY, 1, blinkK);
  if (rk < 1) sprite(img, hx, hy + 9, LEGS.stand, 1 - rk);
  if (rk > 0) sprite(img, hx, hy + 9, LEGS[fr], rk);
  // HUD: the game's own clock, top left (TIME m:ss). At the start of the next run 0:59 crossfades to 0:00.
  const hud = (txt, a) => { textImg(img, "TIME", 2, 2, K.hudY, a); textImg(img, txt, 22, 2, K.hudW, a); };
  const sw = sm(t, ACT2 - 0.05, ACT2 + 0.2);
  if (sw < 1) hud(fmt(t < ACT2 ? gameClock(side, t) : 59), 1 - sw);
  if (sw > 0) hud(fmt(gameClock(side, t)), sw);
  // Europe: the white console's start menu «60 HZ?  YES» (dissolves in and out)
  if (side === "R") { const a = Math.min(sm(t, DC.menu0, DC.menu0 + 0.3), 1 - sm(t, DC.menuOut - 0.3, DC.menuOut)); if (a > 0) menu(img, t, a); }
  CACHE.set(key, img);
  return img;
}
function textImg(img, str, x, y, col, a = 1) {
  let cx = x;
  for (const ch of str) { if (ch === " ") { cx += 3; continue; } const g = TINY.glyphs[ch] ?? TINY.glyphs["?"];
    g.forEach((row, j) => [...row].forEach((p, i) => { if (p === "#") { put(img, cx + i + 1, y + j + 1, K.hudS, a * 0.9); } }));
    g.forEach((row, j) => [...row].forEach((p, i) => { if (p === "#") put(img, cx + i, y + j, col, a); }));
    cx += g[0].length + 1; }
}
function menu(img, t, a) {
  for (let y = 12; y < 36; y++) for (let x = 10; x < 54; x++) put(img, x, y, y === 12 || y === 35 || x === 10 || x === 53 ? K.hudW : K.menu, a * (y === 12 || y === 35 || x === 10 || x === 53 ? 1 : 0.92));
  textImg(img, "60 HZ?", 21, 16, K.hudW, a);
  const yes = sm(t, DC.yes, DC.yes + 0.25), blink = 0.75 + 0.25 * Math.cos((t - DC.yes) * 9);
  for (let y = 24; y < 33; y++) for (let x = 13; x < 32; x++) put(img, x, y, K.sel, a * yes * (y === 24 || y === 32 ? 0.6 : blink));
  textImg(img, "YES", 17, 26, K.hudW, a); textImg(img, "NO", 38, 26, K.hudW, a * 0.7);
}
/** Game pixel of the white-cloud / blue-sky edge the macro zooms into (right edge of the big cloud, while standing). */
export const MACRO_PX = { u: 14.0, v: 10.5 };
export const WATER_CENTER = { u: 42, v: 24 };
/** The hedgehog as a small icon for the explainer overlays: rows + hex palette (same drawing as in the game). */
export const ICON = { rows: (frame) => [...BODY, ...(frame == null ? LEGS.stand : LEGS[["run0", "run1", "run2", "run3"][frame & 3]])],
  pal: Object.fromEntries(Object.entries(HEDGE_PAL).map(([k, v]) => [k, "#" + v.map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("")])) };
