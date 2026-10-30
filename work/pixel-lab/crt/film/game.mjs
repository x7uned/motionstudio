// The game picture inside both screens: OUR OWN 64×48 "green hills" level (blue sky bands, clouds, far hills and a lake,
// a checkered cliff with a waterfall drawn as 1-px vertical stripes — water, background, water, background — a palm-ish
// tree, checkered ground) and OUR OWN fast blue hedgehog with yellow shoes. Not Sega sprites, no logos.
// gameImage(t) → Float32Array(64·48·3), values 0..1; a pure function of t (the same picture for the CRT and the flat).
import { hex } from "../../../../renderer/pixel/raster.mjs";
import { RUN, EV } from "./timeline.mjs";

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
};
// ---------------------------------------------------------------- scroll (level pixels): run, decelerate, stand, run again
const V0 = 40, DEC = RUN.stop - RUN.decel, S_STOP = 200;
export function scroll(t) {
  if (t >= RUN.resume) { const u = t - RUN.resume, acc = 0.8; return S_STOP + (u < acc ? (V0 * u * u) / (2 * acc) : (V0 * acc) / 2 + V0 * (u - acc)); }
  if (t >= RUN.stop) return S_STOP;
  if (t >= RUN.decel) { const r = RUN.stop - t; return S_STOP - (V0 / DEC) * r * r * 0.5; }
  return S_STOP - (V0 * DEC) / 2 - V0 * (RUN.decel - t);
}
export function speed(t) { const d = 1 / 120; return (scroll(t + d) - scroll(t - d)) / (2 * d); }

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
export function gameImage(t) {
  const img = new Float32Array(GW * GH * 3), s = scroll(t), ds = s - S_STOP;
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
  for (let x = 0; x < GW; x++) { const q = x + ds * 0.45; for (let y = 27; y < 31; y++) put(img, x, y, (y === 28 && mod(Math.round(q * 0.7 + t * 2), 7) < 2) || (y === 30 && mod(Math.round(q * 0.5 - t * 1.5), 9) < 2) ? K.lakeL : K.lake);
    const hh = 24 + Math.round(2.6 * Math.sin(q * 0.11) + 1.6 * Math.sin(q * 0.27 + 1.3)); for (let y = hh; y < 28; y++) put(img, x, y, y === hh ? K.farHillL : K.farHill); }
  // foreground (scrolls with the level)
  for (let x = 0; x < GW; x++) {
    const q = mod(x + ds, P), gtop = ground(q);
    // cliff + waterfall at q 24..47
    if (q >= 24 && q < 36) { for (let y = 10; y < gtop; y++) put(img, x, y, y < 12 ? (y === 10 ? K.grass : K.grassD) : y === 12 ? K.dirtTop : (Math.floor(q / 3) + Math.floor((y - 13) / 3)) % 2 ? K.dirtA : K.dirtB); }
    if (q >= 36 && q < 48) {
      for (let y = 10; y < 13; y++) put(img, x, y, y === 10 ? K.grass : y === 11 ? K.grassD : K.dirtTop);   // the ledge the water spills from
      if (Math.round(q - 36) % 2 === 0) for (let y = WATER_Y[0]; y < gtop; y++) {
        const streak = mod(y - Math.floor(t * 22) + Math.round(q) * 3, 7);
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
  // the hedgehog: run cycle while moving, standing pose when stopped (crossfaded by speed), blinks while standing
  const v = speed(t), runK = Math.max(0, Math.min(1, v / 14)), fr = ["run0", "run1", "run2", "run3"][Math.floor(s / 3.2) % 4 < 0 ? 0 : Math.floor(s / 3.2) % 4];
  const bob = runK > 0.5 && Math.floor(s / 3.2) % 2 ? -1 : 0, hx = HEDGE.x, hy = HEDGE.y + bob;
  const bp = mod(t - 7.3, 3.4), blinkK = runK < 0.5 && bp < 0.24 ? Math.sin((Math.PI * bp) / 0.24) : 0;
  sprite(img, hx, hy, BODY, 1, blinkK);
  if (runK < 1) sprite(img, hx, hy + 9, LEGS.stand, 1 - runK);
  if (runK > 0) sprite(img, hx, hy + 9, LEGS[fr], runK);
  return img;
}
/** Game pixel of the white-cloud / blue-sky edge the macro zooms into (right edge of the big cloud, while standing). */
export const MACRO_PX = { u: 14.0, v: 10.5 };
export const WATER_CENTER = { u: 42, v: 24 };
