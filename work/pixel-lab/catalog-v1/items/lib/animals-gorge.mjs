// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-heart/film/levels/gorge.mjs (static BACK/FRONT layers: build, wall,
// tubeCluster, tubeFlower, olive, streamX; the per-frame waterfall lives in items/mountains.mjs). Changes: imports point to
// catalog libs; the strip is widened to XA..XB and its distant blue peaks run across all of it; the right wall + waterfall
// + pool are pushed 40 px right (OFS) and both walls get an outer copy so side camera moves stay filled; the farm/Mediterranean
// seam fades, dry tufts and the film's two-tone floor are removed; floor and front strip go down to world y 430.
import { mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { blob, ell, rnd, sm } from "./cute.mjs";
import { Layer, tuft, leafBall, GRASS } from "./animals-forest.mjs";
import { thick } from "./speed-jungle-kit.mjs";

const GRASS_AT = (x, y, d, ramp, shift = 0) => { const v = Math.min(ramp.length - 1.001, Math.sqrt(Math.max(0, d) / 330) * 6.6 + shift), lo = Math.floor(v), fr = v - lo; return ramp[Math.min(ramp.length - 1, fr > 0.5 + 0.45 * (bayer(x, y) - 0.5) ? lo + 1 : lo)]; };

const R = Math.round;
export const RX0 = 4050, RX1 = 4590, XA = 3940, XB = 4740, LAND = -20, OFS = 40;   // XA..XB = painted strip; OFS = right wall + waterfall pushed right

export const FALL = [4446 + OFS, -372, -52];                 // waterfall x, top y (a notch in the right wall), pool y


const ROCK = ["#2E1E22", "#4A3032", "#684840", "#86604E", "#A47A5E", "#C09470", "#D8B086", "#ECCCA2"];

const ROCK_FAR = ["#7A6E8A", "#8C819C", "#A096AE", "#B4ACC0"];

const PEAK = ["#8A9CC8", "#9EAED4", "#B4C2E0", "#CAD6EC", "#E4ECF8"];

const DRY = ["#C8B46A", "#B8A45A", "#A8944E", "#988446", "#88763E"];

const GRASS_G = ["#B8DA74", "#A6D066", "#92C45A", "#7EB64E", "#6CA846", "#5C9A40", "#4E8A3A", "#427A36", "#386C32", "#2E5E2C", "#265026"];

const OLIVE = ["#2E3A22", "#3E4C2C", "#506036", "#647444", "#7A8A56", "#94A06C", "#AEB888", "#C8CEA4"];


const LEFT_WALL = [[4086, -100, 52, 96], [4100, -270, 44, 112], [4116, -420, 36, 84], [4128, -520, 24, 44], [4152, -190, 44, 90], [4178, -70, 54, 58], [4140, -340, 30, 70]].concat([[4086, -100, 52, 96], [4100, -270, 44, 112], [4116, -420, 36, 84], [4128, -520, 24, 44], [4152, -190, 44, 90], [4178, -70, 54, 58], [4140, -340, 30, 70]].map(([x,y,rx,ry])=>[x-80,y+14,rx+6,ry]));

const RIGHT_WALL = [[4486, -96, 60, 86], [4462, -250, 44, 104], [4472, -400, 34, 70], [4466, -490, 22, 40], [4512, -200, 44, 90], [4552, -70, 46, 56], [4430, -110, 40, 70]].concat([[4486, -96, 60, 86], [4462, -250, 44, 104], [4472, -400, 34, 70], [4466, -490, 22, 40], [4512, -200, 44, 90], [4552, -70, 46, 56], [4430, -110, 40, 70]].map(([x,y,rx,ry])=>[x+70,y+10,rx+6,ry])).map(([x,y,rx,ry])=>[x+OFS,y,rx,ry]);

let BACK = null, FRONT = null;

export function buildGorge() { build(); return { BACK, FRONT }; }
function build() {
  BACK = new Layer(XA, -760, XB, 430); FRONT = new Layer(XA, 150, XB, 430);
  const g = BACK.g, f = FRONT.g;
  // distant blue peaks in the gap of the gorge (below the sun disc), with snow tips
  for (let x = XA; x < XB; x++) {
    const h = 150 + 60 * Math.sin(x * 0.019 + 1) + 34 * Math.sin(x * 0.051) + 20 * Math.abs(Math.sin(x * 0.009 + 2)), top = R(LAND - h);
    for (let y = top; y < LAND; y++) { const k = (y - top) / h; let s = k < 0.04 ? 4 : k < 0.12 && Math.sin(x * 0.4) > -0.3 ? 4 : k < 0.3 ? 3 : k < 0.6 ? 2 : 1; if ((x * 3 + y) % 17 === 0 && s > 1) s--; g.px(x, y, PEAK[s]); }
  }
  for (let x = XA; x < XB; x++) { const h = 70 + 28 * Math.sin(x * 0.033 + 4) + 12 * Math.sin(x * 0.11), top = R(LAND - h); for (let y = top; y < LAND; y++) { const k = (y - top) / h; g.px(x, y, ROCK_FAR[k < 0.08 ? 3 : k < 0.4 ? 2 : (k - 0.4) * 2 > bayer(x, y) ? 0 : 1]); } }
  // gorge floor: farm grass at the barn seam → green meadow grass → dry golden grass at the Mediterranean seam
  for (let y = LAND; y < 430; y++) for (let x = XA; x < XB; x++) {
    let col = GRASS_AT(x, y, y - LAND, GRASS_G);
    g.px(x, y, col);
  }
  g.rect(XA, LAND, XB - XA, 1, "#D0EC90");
  for (let i = 0; i < 6400; i++) { const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 201), 1.4) * 420), x = R(XA + rnd(i * 3 + 202) * (XB - XA - 4)), d = y - LAND, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4; const col = rnd(i * 5 + 7) < 0.6 ? mix(g.get(x, y), "#2A4A1A", 0.3) : mix(g.get(x, y), "#FFF4B0", 0.28); for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col); }
  // the two gorge walls (sandstone masses with soft strata, cracks, sunlit ledges)
  wall(g, LEFT_WALL, 3); wall(g, RIGHT_WALL, 9);
  // a little stream runs from the pool toward us, widening with perspective (sparkles are drawn per frame)
  for (let y = FALL[2] + 4; y < 430; y++) { const k = (y - FALL[2]) / (430 - FALL[2]), cx = streamX(y), w = 4 + k * k * 40; for (let x = R(cx - w - 2); x <= R(cx + w + 2); x++) { const e = Math.abs(x - cx) / w; if (e > 1.12) continue; g.px(x, y, e > 1 ? "#6A5A3A" : e > 0.86 ? "#8AD0E8" : ((x + y) & 1) && e < 0.5 ? "#5AB4D8" : "#4AA0CC"); } }
  // pool at the foot of the waterfall
  for (let y = FALL[2] - 10; y <= FALL[2] + 10; y++) for (let x = FALL[0] - 54; x <= FALL[0] + 54; x++) { const d = ((x - FALL[0]) / 54) ** 2 + ((y - FALL[2]) / 10) ** 2; if (d <= 1) g.px(x, y, d > 0.8 ? ROCK[2] : y < FALL[2] - 3 ? "#7AC8E0" : "#4AA0C8"); }
  // shrubs on ledges and flowers on the cliffs
  for (const [x, y, r] of [[4122, -360, 9], [4160, -232, 11], [4196, -116, 8], [4466 + OFS, -440, 8], [4500 + OFS, -280, 10], [4530 + OFS, -150, 9]]) leafBall(g, x, y, r, ["#24401E", "#305426", "#3E6A2E", "#4E8238", "#62984A", "#7CAE5C"], x, { amp: 0.12, bumps: 7 });
  for (const [x, y, n] of [[4128, -350, 4], [4166, -222, 5], [4200, -108, 4], [4506 + OFS, -272, 5], [4536 + OFS, -142, 4], [4232, LAND + 2, 6], [4396, LAND + 4, 5], [4560 + OFS, LAND + 3, 4]]) tubeCluster(g, x, y, n, x * 7);
  // olive sapling and dry tufts at the right edge, toward the Mediterranean wall
  olive(g, RX1 + 60, LAND + 2);
  // FRONT: rocks and red tube flowers along the bottom, grass blades
  for (let i = 0; i < 80; i++) { const x = R(XA + 10 + rnd(i * 13 + 302) * (XB - XA - 20)), y = R(LAND + 250 + rnd(i * 13 + 305) * 150); tuft(f, x, y, 14 + rnd(i + 31) * 16, 4 + Math.floor(rnd(i * 3 + 11) * 4), ["#2E5A26", "#3E7230", "#5A9440"], i * 5 + 13, (rnd(i * 9 + 12) - 0.5) * 6); }
  for (const [x, y, rx, ry] of [[RX0 - 20, 330, 46, 26], [RX0 + 30, 345, 30, 18], [RX1 + 60, 340, 44, 24]]) blob(f, [ell(x, y, rx, ry)], { ramp: ROCK, thick: 14, base: 3.4, gain: 2.2, litOutline: ROCK[4] });
  for (const [x, y, n] of [[RX0 + 90, 360, 8], [RX0 + 420, 380, 6], [RX0 + 250, 392, 6]]) tubeCluster(f, x, y, n, x * 3, 1.6);
}

export const streamX = (y) => FALL[0] + 6 + Math.sin((y - FALL[2]) * 0.018) * 22 + ((y - FALL[2]) / 372) ** 2 * 40;

function wall(g, masses, seed) {
  const polys = masses.map(([x, y, rx, ry], i) => ell(x, y, rx, ry, (rnd(seed + i) - 0.5) * 0.3, 40).map(([u, v], k) => [u + Math.sin(k * 1.7 + i) * 2.5, v + Math.cos(k * 2.3 + i) * 2.5]));
  const top = Math.min(...masses.map(([, y, , ry]) => y - ry)), x0 = Math.min(...masses.map(([x, , rx]) => x - rx)) - 4, x1 = Math.max(...masses.map(([x, , rx]) => x + rx)) + 4;
  blob(g, polys, { ramp: ROCK, thick: 46, base: 2.9, gain: 2.4, slope: 0.9, light: [-0.7, -0.6], litOutline: ROCK[3] });
  // soft wavy strata, vertical cracks, lit ledge lips (only on the rock just painted)
  const has = (x, y) => masses.some(([mx, my, rx, ry]) => ((x - mx) / (rx - 1)) ** 2 + ((y - my) / (ry - 1)) ** 2 <= 1);
  for (let y = R(top); y < LAND + 2; y++) for (let x = R(x0); x <= R(x1); x++) {
    if (!has(x, y) || !has(x, y - 2) || !has(x - 2, y) || !has(x + 2, y)) continue;
    const sy = y + Math.sin(x * 0.06 + seed) * 5 + Math.sin(x * 0.17) * 1.5;
    if (((R(sy) % 26) + 26) % 26 === 0) { g.px(x, y, mix(g.get(x, y), ROCK[1], 0.45)); if (has(x, y + 1)) g.px(x, y + 1, mix(g.get(x, y + 1), ROCK[7], 0.18)); }
    else if (Math.abs(((x * 5 + Math.floor(sy / 26) * 37 + seed * 11) % 53) - 26) < 0.6 && ((y + x) % 3)) g.px(x, y, mix(g.get(x, y), ROCK[0], 0.4));
  }
  // grass and moss tufts on the top edges
  for (let x = R(x0); x <= R(x1); x += 3) { let y = R(top) - 1; while (y < LAND && !has(x, y)) y++; if (y >= LAND - 4 || rnd(x * 7 + seed) < 0.45) continue; tuft(g, x, y + 1, 5 + rnd(x) * 4, 3, ["#3E6A2E", "#5A8A3A", "#86B058"], x, 0); }
}

function tubeCluster(g, x, y, n, seed, s = 1) {
  for (let i = 0; i < n; i++) {
    const sx = x + (rnd(seed + i * 3) - 0.5) * 26 * s, h = (16 + rnd(seed + i * 5) * 18) * s, lean = (rnd(seed + i * 7) - 0.5) * 6;
    for (let j = 0; j <= h; j++) g.px(R(sx + lean * (j / h) ** 2), R(y - j), j % 7 < 4 ? "#3E6A2E" : "#2E5424");
    for (let k = 0; k < 4; k++) { const fy = y - h + k * 4 * s, fx = sx + lean + (k % 2 ? 2 : -2) * s; tubeFlower(g, fx, fy, k % 2 ? 1 : -1, s); }
  }
}

export function tubeFlower(g, x, y, dir, s = 1) {
  // a drooping red tube: dark base, bright body, a pale flared mouth
  const L = R(7 * s), w = Math.max(1, R(1.6 * s));
  for (let i = 0; i <= L; i++) { const px = R(x + dir * i * 0.55), py = R(y + i * 0.85); for (let j = -w; j <= w; j++) g.px(px + j, py, i < 2 ? "#8A1A22" : j === -w ? "#FF6A5A" : "#E0282E"); }
  const mx = R(x + dir * L * 0.55), my = R(y + L * 0.85) + 1; g.rect(mx - w - 1, my, w * 2 + 3, 1, "#FF9A8A"); g.px(mx, my + 1, "#FFE0A0");
}

function olive(g, x, y) {
  thick(g, [[x, y], [x - 3, y - 18], [x + 2, y - 34], [x - 4, y - 52]], 2, "#5A4A3A"); thick(g, [[x - 1, y - 30], [x + 14, y - 44]], 1, "#5A4A3A"); thick(g, [[x - 2, y - 40], [x - 18, y - 52]], 1, "#5A4A3A");
  for (const [dx, dy, r] of [[-4, -58, 16], [12, -50, 12], [-18, -52, 11], [2, -70, 11]]) leafBall(g, x + dx, y + dy, r, OLIVE, dx * 3 + 7, { amp: 0.18, bumps: 9 });
}


