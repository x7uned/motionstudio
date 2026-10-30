// LV6 · cat — night rooftops under the full moon (RANGE BIOME.roofs = 2430..2970, camera REST.cat): the user's reference
// come alive. The golden savanna ends at the city's first low buildings (a corner shop, a street lamp); a brick building's
// wooden roof ledge carries the black cat, sitting front-on with the moon disc behind its head; a water tower on the
// left, a rooftop stair hut with a door on the right, skyline silhouettes with lit windows on both sides; past the hut
// the city thins to a cottage, a hedge, a picket fence and a tree (seen in the long pan through sunrise). Everything is
// colour-graded by the time of day (night → dawn), lit windows and lamps fade with the night.
// Heart: a pixel heart beside the cat beats ONLY with pulse("cat", t) (130 → ~190 BPM). Events: "thirty" → +130 BPM;
// "home" → a slow cat blink; "at the vet" → the hut door opens, a little vet with a stethoscope and a carrier steps out;
// "jumps" → the cat's fur puffs up, eyes go wide, "!"; "two hundred" → tag 190 BPM AT THE VET.
import { BIOME, LAND, EV, LV, pulse } from "../timeline.mjs";
import { pickup, tag, sign, shadow, sm, ease, lerp, rnd, fade, mix, bayer, MAIN, C, blinkAt, clamp01, blob, ell, tube, eye, blush, smile, RAMP } from "../cute.mjs";
import { worldLayer, frameLight, lit, softer, thick, ditherEll, heart, lawn, gaze, R } from "./roofs-kit.mjs";
import { drawCat, warmCat } from "./cat-art.mjs";

export const RANGE = BIOME.roofs;
const [X0, X1] = RANGE, GY = LAND, STREET = 290;
const LEDGE = -62;                                       // top of the wooden roof ledge (the cat's paws)
const CITY = [2550, 2872];                               // the cat's building (facade down to the street)
const HUT = { x0: 2806, x1: 2868, top: -198, door: [2820, 2854] };
const CAT = { x: 2700, y: LEDGE }, VET = { from: 2838, to: 2812 };
const HEARTW = [2582, -424];                             // heart icon (world), screen (152, 236) at rest

// ---------------------------------------------------------------- albedo palette (graded by the time of day)
const P = {
  far: ["#6E6CA4", "#7C7AAE", "#8A88B8"], mid: ["#5A5690", "#66629C", "#74709E"],
  brick: ["#7A3A34", "#94483E", "#B0604C", "#C8785E"], ledge: ["#5A3418", "#8A5430", "#B07040", "#D89A60"],
  glass: "#4A5A8A", frame: "#C8C0B8", stone: ["#5E5A5A", "#7E7A78", "#A09A94"],
  soil: ["#3E2414", "#5E3A22", "#6E4A2C", "#8A5E38", "#5E5450"], metal: ["#2E2E3A", "#4A4A5A", "#6E6E80"],
  wood: ["#4A2C18", "#6A4024", "#8A5834", "#A87448"], hedge: ["#2E5A2E", "#3E7A3A", "#5A9A48", "#7CB85A"],
};
const LIT = ["#FFD86A", "#F4B040", "#FFF0B0"];

// ---------------------------------------------------------------- static scenery (albedo) + emissive window list
let SCENE = null; const WINDOWS = [];
function win(x, y, w, h, on = 0.7, seed = 0) { WINDOWS.push({ x, y, w, h, on, seed }); }
function build() {
  WINDOWS.length = 0;
  SCENE = worldLayer(X0 - 40, -470, X1 - X0 + 80, 790, (g) => {
    // far skyline (both sides of the moon, tapering at the seams), then a darker mid row
    const towers = [[2474, 40, -330], [2516, 46, -270], [2590, 30, -230], [2838, 36, -330], [2870, 54, -400], [2918, 40, -300], [2950, 34, -250]];
    for (const [x, w, top] of towers) {
      g.rect(x, top, w, GY + 40 - top, P.far[1]); g.rect(x, top, 2, GY + 40 - top, P.far[2]); g.rect(x, top - 2, w, 2, P.far[2]);
      if (w > 44) { g.rect(x + R(w / 2) - 1, top - 26, 2, 26, P.far[0]); g.px(x + R(w / 2) - 1, top - 27, "#FF5A6A"); }
      for (let y = top + 8; y < GY - 10; y += 12) for (let i = x + 5; i < x + w - 6; i += 9) { if (rnd(i * 7 + y * 3) < 0.38) win(i, y, 4, 6, 0.75, i + y); else g.rect(i, y, 4, 6, P.far[0]); }
    }
    for (const [x, w, top] of [[2474, 52, -186], [2600, 40, -150], [2790, 60, -190], [2900, 66, -150]]) {
      g.rect(x, top, w, GY + 40 - top, P.mid[0]); g.rect(x, top, w, 2, P.mid[2]);
      for (let y = top + 10; y < GY - 6; y += 14) for (let i = x + 6; i < x + w - 8; i += 11) { if (rnd(i * 13 + y) < 0.32) win(i, y, 5, 7, 0.8, i * 3 + y); else g.rect(i, y, 5, 7, "#4A4680"); }
    }
    // the first low buildings on the savanna edge: a corner shop with an awning and a street lamp, soil below
    const SOILR = ["#B4602E", "#A65428", "#BE6E3A", "#9A4C26", "#AE5C2E", "#C47640"], ROCKR = ["#5A4A5A", "#4E4050", "#665464", "#46384A"];
    for (let x = X0; x < CITY[0]; x++) for (let y = GY; y < 314; y++) {
      const d = y - GY, wv = Math.sin(x * 0.05 + Math.floor((d + 40) / 10)) * 1.5, band = Math.floor((d + wv) / 10);
      let col = d < 1 ? "#C8C4CC" : d < 6 ? ((x >> 3) & 1 ? "#A8A4B0" : "#B4B0BC") : d < 7 ? "#6A6670" : SOILR[band % 6];
      if (d > 300 + 20) col = ROCKR[band % 4]; if (d >= 7 && rnd(x * 13 + y * 71) < 0.006) col = "#F0C8A0";
      g.px(x, y, col);
    }
    const sx0 = 2476, sx1 = 2540, stop = -116;
    g.rect(sx0, stop, sx1 - sx0, GY - stop, "#D8B88A"); g.rect(sx0, stop, sx1 - sx0, 4, "#B8986A"); g.rect(sx0 - 3, stop - 4, sx1 - sx0 + 6, 5, "#8A6A4A");
    g.rect(sx0 + 6, -88, 32, 46, P.glass); win(sx0 + 8, -86, 28, 42, 1, 7); g.rect(sx0 + 44, -82, 16, 62, "#5A3A2A"); win(sx0 + 47, -79, 10, 16, 0.9, 8);
    for (let x = sx0 + 4; x < sx1 - 4; x++) for (let y = -102; y < -92; y++) g.px(x, y, Math.floor((x - sx0) / 8) % 2 ? "#3A8A6A" : "#F4EEE0");
    g.rect(2546, -150, 3, 130, P.metal[1]); g.rect(2540, -152, 14, 4, P.metal[2]);
    // retaining wall down to the street below the city
    stones(g, 2544, CITY[0] + 2, GY + 7, 314);
    // the cat's building: brick facade, rows of windows, a fire escape, a stone sill line, the street
    for (let y = LEDGE + 8; y < STREET; y++) for (let x = CITY[0]; x < CITY[1]; x++) {
      const row = Math.floor((y - LEDGE) / 6), off = (row % 2) * 7, mort = (y - LEDGE) % 6 === 0 || (x + off) % 14 === 0;
      g.px(x, y, mort ? P.brick[0] : x < CITY[0] + 5 ? P.brick[3] : x > CITY[1] - 6 ? P.brick[1] : rnd(row * 41 + Math.floor((x + off) / 14)) < 0.18 ? P.brick[1] : P.brick[2]);
    }
    for (let y = LEDGE + 8; y < LEDGE + 22; y++) for (let x = CITY[0]; x < CITY[1]; x++) if ((y - LEDGE - 8) / 14 < 1 - bayer(x, y) * 0.9) g.px(x, y, P.brick[0]);
    for (const [ri, wy] of [[0, -6], [1, 76], [2, 158], [3, 240]].map((v, i) => [i, v[1]])) for (let i = 0; i < 6; i++) {
      const wx = CITY[0] + 26 + i * 50; if (ri === 3 && i > 3) continue;
      g.rect(wx - 3, wy - 3, 28, 44, P.frame); g.rect(wx, wy, 22, 38, P.glass); g.rect(wx + 10, wy, 2, 38, P.frame); g.rect(wx - 5, wy + 41, 32, 4, P.stone[2]);
      if (rnd(ri * 17 + i * 5 + 3) < 0.45) win(wx, wy, 22, 38, 0.85, ri * 11 + i); else { g.rect(wx + 2, wy + 2, 7, 20, "#7A5A8A"); g.rect(wx + 13, wy + 2, 7, 20, "#7A5A8A"); }
    }
    fireEscape(g, CITY[0] + 18, 70);
    for (let x = CITY[0]; x < X1; x++) for (let y = STREET; y < 314; y++) g.px(x, y, y === STREET ? "#8A8478" : (x + (Math.floor((y - STREET) / 6) % 2) * 5) % 10 === 0 ? "#6A6460" : "#9A948A");
    // brick parapet + the wooden ledge the cat sits on
    for (let x = CITY[0] - 4; x < CITY[1] + 4; x++) { for (let y = LEDGE; y < LEDGE + 10; y++) g.px(x, y, y === LEDGE ? P.ledge[3] : y === LEDGE + 1 ? P.ledge[2] : y > LEDGE + 7 ? P.ledge[0] : (x % 46 === 0 ? P.ledge[0] : P.ledge[1])); }
    for (let x = CITY[0] + 6; x < CITY[1]; x += 46) { g.px(x + 3, LEDGE + 4, P.ledge[0]); g.px(x + 40, LEDGE + 4, P.ledge[0]); }
    // water tower on the left of the roof
    waterTower(g, 2566, LEDGE);
    // rooftop stair hut (its door is drawn live), a TV antenna and a vent pipe
    for (let y = HUT.top; y < LEDGE; y++) for (let x = HUT.x0; x < HUT.x1; x++) { const row = Math.floor((y - HUT.top) / 6), mort = (y - HUT.top) % 6 === 0 || (x + (row % 2) * 7) % 14 === 0; g.px(x, y, mort ? P.brick[0] : x < HUT.x0 + 4 ? P.brick[3] : P.brick[2]); }
    g.rect(HUT.x0 - 5, HUT.top - 6, HUT.x1 - HUT.x0 + 10, 7, P.stone[1]); g.rect(HUT.x0 - 5, HUT.top - 6, HUT.x1 - HUT.x0 + 10, 2, P.stone[2]);
    g.rect(HUT.door[0] - 3, LEDGE - 118, HUT.door[1] - HUT.door[0] + 6, 118, P.stone[2]);
    g.rect(HUT.x1 - 18, HUT.top - 40, 2, 34, P.metal[2]); g.line(HUT.x1 - 30, HUT.top - 34, HUT.x1 - 4, HUT.top - 34, P.metal[2]); g.line(HUT.x1 - 26, HUT.top - 26, HUT.x1 - 8, HUT.top - 26, P.metal[2]);
    // past the hut: the city thins out — a retaining wall up to the garden level, a hedge, a picket fence, a cottage, a tree
    stones(g, CITY[1] - 2, CITY[1] + 16, GY - 4, STREET);
    lawn(g, CITY[1] + 16, X1, GY, 314);
    cottage(g, 2898, GY);
    for (let x = CITY[1] + 14; x < 2896; x++) { const top = GY - 18 - Math.abs(Math.sin(x * 0.3)) * 4; for (let y = R(top); y < GY; y++) g.px(x, y, y - top < 2 ? P.hedge[3] : (x * 3 + y) % 9 === 0 ? P.hedge[0] : P.hedge[1]); }
    for (let x = 2946; x < X1 + 10; x += 9) { g.rect(x, GY - 22, 5, 22, "#E8E4DC"); g.px(x + 2, GY - 23, "#E8E4DC"); } g.rect(2944, GY - 16, X1 + 10 - 2944, 3, "#D8D4CC"); g.rect(2944, GY - 8, X1 + 10 - 2944, 3, "#D8D4CC");
    tree(g, 2978, GY);
    // a lamp post by the hedge
    g.rect(2884, GY - 118, 3, 118, P.metal[1]); g.rect(2880, GY - 124, 11, 6, P.metal[2]);
  });
}
function stones(g, x0, x1, top, bot) {
  for (let y = top; y < bot; y++) for (let x = x0; x < x1; x++) { const row = Math.floor((y - top) / 9), off = (row % 2) * 7, inRow = (y - top) % 9, inCol = (x - x0 + off) % 14; g.px(x, y, inRow === 0 || inCol === 0 ? P.stone[0] : inRow === 1 ? P.stone[2] : P.stone[1]); }
}
function waterTower(g, cx, base) {
  const legTop = base - 92, tankB = legTop, tankT = tankB - 70, w = 44;
  for (const dx of [-18, 18]) thick(g, [[cx + dx, base], [cx + dx * 0.7, legTop]], 1, P.metal[1]);
  g.line(cx - 17, base - 10, cx + 13, legTop + 6, P.metal[0]); g.line(cx + 17, base - 10, cx - 13, legTop + 6, P.metal[0]);
  g.rect(cx - 16, legTop + 40, 32, 2, P.metal[0]);
  for (let y = tankT; y < tankB; y++) for (let x = cx - w / 2; x < cx + w / 2; x++) { const u = (x - cx + w / 2) / w; g.px(x, y, (x - cx) % 6 === 0 ? P.wood[0] : u < 0.2 ? P.wood[3] : u > 0.8 ? P.wood[1] : P.wood[2]); }
  for (const yy of [tankT + 14, tankT + 38, tankT + 60]) g.rect(cx - w / 2, yy, w, 2, P.metal[0]);
  g.poly([[cx - w / 2 - 4, tankT], [cx, tankT - 22], [cx + w / 2 + 4, tankT]], P.wood[0]); g.line(cx - w / 2 - 4, tankT, cx, tankT - 22, P.wood[2]);
  g.line(cx + 4, tankB, cx + 4, base, P.metal[1]); for (let y = tankB + 4; y < base; y += 7) g.line(cx + 1, y, cx + 7, y, P.metal[1]);
}
function fireEscape(g, x, y0) {
  for (let k = 0; k < 3; k++) {
    const y = y0 + k * 82, left = k % 2 === 0;
    g.rect(x - 8, y + 40, 64, 3, P.metal[0]); for (let i = x - 8; i < x + 56; i += 4) g.rect(i, y + 26, 1, 14, P.metal[0]); g.rect(x - 8, y + 26, 64, 2, P.metal[1]);
    const a = left ? [x + 50, y + 42] : [x - 2, y + 42], b = left ? [x + 4, y + 122] : [x + 50, y + 122];
    if (y + 122 < STREET) { g.line(a[0], a[1], b[0], b[1], P.metal[1]); g.line(a[0], a[1] - 8, b[0], b[1] - 8, P.metal[0]); for (let s = 0; s < 1; s += 0.1) { const px = lerp(a[0], b[0], s), py = lerp(a[1], b[1], s); g.line(R(px), R(py), R(px), R(py - 8), P.metal[0]); } }
  }
}
function cottage(g, x0, gy) {
  const x1 = x0 + 46, top = gy - 52;
  g.rect(x0, top, x1 - x0, gy - top, "#E4D6C0"); g.rect(x0, top, 3, gy - top, "#F4EAD8");
  g.poly([[x0 - 6, top + 2], [x0 + 23, top - 26], [x1 + 6, top + 2]], "#A8483A"); for (let y = top - 22; y < top + 2; y += 4) for (let x = x0 - 6; x < x1 + 6; x++) if (g.has(x, y)) g.px(x, y, "#86382E");
  g.rect(x0 + 8, top + 14, 12, 12, "#FAF6EE"); g.rect(x0 + 9, top + 15, 10, 10, P.glass); win(x0 + 9, top + 15, 10, 10, 1, 31);
  g.rect(x0 + 28, top + 20, 12, gy - top - 20, "#5A7A9A"); g.px(x0 + 37, gy - 16, "#F4CA50");
  g.rect(x1 - 10, top - 18, 6, 14, "#8A4A3A");
}
function tree(g, x, gy) {
  g.rect(x - 3, gy - 46, 7, 46, "#6A4428"); g.rect(x - 3, gy - 46, 2, 46, "#8A5A34");
  for (const [dx, dy, r] of [[0, -70, 26], [-18, -56, 18], [17, -54, 19], [4, -88, 17]]) for (let y = gy + dy - r; y <= gy + dy + r; y++) for (let xx = x + dx - r; xx <= x + dx + r; xx++) { const d = Math.hypot(xx - x - dx, (y - gy - dy) * 1.1) / r; if (d <= 1) g.px(xx, y, d > 0.86 ? P.hedge[0] : (xx - x - dx) + (y - gy - dy) < -r * 0.3 ? P.hedge[3] : rnd(xx * 3 + y * 7) < 0.2 ? P.hedge[1] : P.hedge[2]); }
}

// ---------------------------------------------------------------- the little vet (chibi, ~104 px, feet at x, y)
const VSKIN = RAMP.skin, COATR = ["#3A3A4A", "#6A6A80", "#9A9AB0", "#C4C4D4", "#DEDEEA", "#EEEEF6", "#F8F8FC", "#FFFFFF"];
const SCRUB = ["#0E2A2A", "#164242", "#1E5A5A", "#2A7474", "#3A9090", "#56ACAC", "#7CC8C8", "#A8E2E2"];
function drawVet(c, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return; const g = fade(c, a), ph = o.ph ?? 0, walking = o.walk ?? 0;
  const bob = R(Math.abs(Math.sin(ph * Math.PI * 2)) * 2 * walking), st = Math.sin(ph * Math.PI * 2) * 4 * walking, reach = clamp01(o.reach ?? 0);
  const Y = y - bob, opt = (ramp, th = 8) => ({ ramp, thick: th, a, base: 3.4, gain: 1.6 });
  // shoes, scrub legs
  blob(c, [ell(x - 8 + st, y - 3, 7, 4), ell(x + 8 - st, y - 3, 7, 4)], opt(RAMP.ink, 3));
  blob(c, [tube([[x - 7 + st * 0.6, Y - 30], [x - 8 + st, y - 6]], 5, 5), tube([[x + 7 - st * 0.6, Y - 30], [x + 8 - st, y - 6]], 5, 5)], opt(SCRUB, 4));
  // carrier in the right hand (screen right), arm behind the coat edge
  const cx = x + 26, cy = Y - 24;
  g.rrect(cx - 13, cy, 28, 20, "#1E3A6A", 2); g.rrect(cx - 12, cy + 1, 26, 18, "#4A7AC8", 2); g.rect(cx - 11, cy + 2, 24, 2, "#7AA4E0");
  for (let i = 0; i < 4; i++) g.rect(cx - 8 + i * 5, cy + 6, 1, 10, "#1E3A6A"); g.rect(cx - 9, cy + 6, 17, 1, "#1E3A6A"); g.line(cx - 6, cy, cx - 2, cy - 7, "#1E3A6A"); g.line(cx - 2, cy - 7, cx + 6, cy - 7, "#1E3A6A"); g.line(cx + 6, cy - 7, cx + 10, cy, "#1E3A6A");
  blob(c, [tube([[x + 15, Y - 58], [x + 20, Y - 44], [x + 22, Y - 31]], 5, 4.5)], opt(COATR, 4)); blob(c, [ell(x + 22, Y - 30, 4, 4)], opt(VSKIN, 3));
  // lab coat with a teal scrub V, pockets and a green-cross badge
  blob(c, [[[x - 17, Y - 64], [x + 17, Y - 64], [x + 23, Y - 24], [x - 23, Y - 24]]], opt(COATR, 10));
  g.poly([[x - 6, Y - 64], [x + 6, Y - 64], [x, Y - 52]], SCRUB[3]); g.line(x, Y - 52, x, Y - 26, COATR[2]); g.line(x - 6, Y - 64, x - 1, Y - 50, COATR[2]); g.line(x + 6, Y - 64, x + 1, Y - 50, COATR[2]);
  g.rect(x - 16, Y - 38, 9, 7, COATR[3]); g.rect(x + 8, Y - 38, 9, 7, COATR[3]); g.rect(x + 9, Y - 41, 2, 4, "#3A6AC8");
  g.rect(x - 15, Y - 58, 8, 8, "#FFFFFF"); g.rect(x - 13, Y - 57, 4, 6, "#2EB86A"); g.rect(x - 14, Y - 56, 6, 4, "#2EB86A");
  // stethoscope round the neck; the left arm reaches out with the chest-piece
  for (let i = 0; i <= 12; i++) { const u = i / 12, px = x - 9 + 18 * u, py = Y - 63 + Math.sin(u * Math.PI) * 6; g.px(R(px), R(py), "#4A5060"); }
  const sh = [x - 15, Y - 58], hand = [lerp(x - 21, x - 46, reach), lerp(Y - 32, Y - 50, reach)];
  blob(c, [tube([sh, [lerp(x - 21, x - 32, reach), lerp(Y - 45, Y - 54, reach)], hand], 5, 4.5)], opt(COATR, 4)); blob(c, [ell(hand[0], hand[1], 4, 4)], opt(VSKIN, 3));
  const piece = [hand[0] - 5 * reach - 2, hand[1] + 2];
  for (let i = 0; i <= 14; i++) { const u = i / 14, px = lerp(x - 8, piece[0], u), py = lerp(Y - 58, piece[1], u) + Math.sin(u * Math.PI) * 9 * (1 - reach * 0.6); g.px(R(px), R(py), "#4A5060"); }
  g.disc(R(piece[0]), R(piece[1]), 4, "#8A90A0"); g.disc(R(piece[0]), R(piece[1]), 2, "#D8DCE8"); g.px(R(piece[0]) - 1, R(piece[1]) - 1, "#FFFFFF");
  // head: hair with a bun, round glasses, smile, blush
  const hx = x, hy = Y - 86;
  blob(c, [ell(hx, hy - 12, 9, 8)], opt(RAMP.brown, 4));
  blob(c, [ell(hx, hy, 23, 21)], opt(VSKIN, 10));
  blob(c, [[[hx - 23, hy + 2], [hx - 22, hy - 14], [hx - 8, hy - 22], [hx + 10, hy - 22], [hx + 22, hy - 12], [hx + 23, hy + 2], [hx + 16, hy - 8], [hx + 2, hy - 11], [hx - 12, hy - 6]]], opt(RAMP.brown, 5));
  const look = o.look ?? [-0.7, 0];
  for (const s of [-1, 1]) { eye(c, hx + s * 9, hy + 3, 4.2, { iris: RAMP.brown, pupil: "round", ry: 4.8, look, blink: o.blink ?? 0, a }); g.ering(hx + s * 9, hy + 3, 8, 8, "#3A2A2A"); }
  g.line(hx - 1, hy + 2, hx + 1, hy + 2, "#3A2A2A");
  blush(c, hx - 15, hy + 11, 5, 2.5, undefined, a); blush(c, hx + 15, hy + 11, 5, 2.5, undefined, a);
  smile(c, hx - 2, hy + 13, 4, { a, open: o.open ?? 0 });
}

// ---------------------------------------------------------------- choreography
const DOOR_OPEN = EV.vet - 0.3, VET_OUT = EV.vet - 0.05, VET_STOP = EV.vet + 0.55, REACH = EV.jumps - 0.15;
const PUFF = EV.jumps, CALM = EV.smaller + 0.4;
/** Timing of every motion in this level (seconds, from the word timings); levels/cat-motions.mjs reads it too. */
export const VT = {
  heartIn: [EV.cat + 0.1, EV.cat + 0.45], heartOut: [EV.smaller + 1.3, EV.smaller + 1.7], pick: EV.hundredThirty, blink: [EV.home + 0.05, EV.home + 0.95],
  door: [DOOR_OPEN, DOOR_OPEN + 0.4], notice: [DOOR_OPEN, DOOR_OPEN + 0.25], vetIn: [VET_OUT, VET_OUT + 0.25], vetWalk: [VET_OUT, VET_STOP], vetCycles: 2.2,
  reach: [REACH, REACH + 0.35], puff: [PUFF, PUFF + 0.3], bang: [PUFF + 0.05, PUFF + 0.2], bangOut: [PUFF + 0.9, PUFF + 1.2],
  tag: [EV.twoHundred + 0.05, EV.twoHundred + 0.4], tagOut: [LV.cat[1] + 0.15, LV.cat[1] + 0.5], calm: [CALM, CALM + 1.2], lower: [CALM, CALM + 0.6],
};
function catState(t) {
  const slow = Math.max(0, Math.sin(clamp01((t - VT.blink[0]) / (VT.blink[1] - VT.blink[0])) * Math.PI));          // the slow "cat kiss" blink
  const notice = sm(t, ...VT.notice), puff = Math.min(sm(t, ...VT.puff), 1 - 0.65 * sm(t, ...VT.calm));
  const look = gaze(t, [[0, [0, 0]], [EV.hundredThirty - 0.3, [-0.9, -0.7]], [EV.hundredThirty + 0.7, [0, 0]], [DOOR_OPEN + 0.1, [0.9, 0.05]], [PUFF + 0.1, [0, 0]], [PUFF + 0.5, [0.45, 0.05]]]);
  return { blink: Math.max(slow * 0.9, blinkAt(t, 3.7, 0.5) * (1 - puff)), look, puff, wide: Math.max(puff, notice * 0.25), worry: notice * 0.6 * (1 - puff), open: puff * 0.55, earsBack: notice * 0.12 + puff * 0.1 };
}

// ---------------------------------------------------------------- layers
const vis = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
export function back(c, V, t) {
  if (!vis(V)) return; if (!SCENE) build();
  const L = frameLight(V);
  SCENE.blit(c, V, { lut: L.lut });
  // while the golden savanna is on screen, the first metres of the city fade from its ungraded colours into the night
  const seam = clamp01((X0 - V.x0) / 120);
  if (seam > 0 && L.lut) for (let i = 0; i < 6; i++) SCENE.blit(c, V, { x0: Math.max(0, R(V.X(X0 + i * 8))), x1: Math.max(0, R(V.X(X0 + i * 8 + 8))), a: seam * (1 - i / 6) });
  // lit windows and lamps fade with the night; a few windows switch slowly on and off
  const night = L.night; if (night <= 0.01) return;
  const X = (wx) => R(V.X(wx)), Y = (wy) => R(V.Y(wy));
  for (const w of WINDOWS) {
    const sx = X(w.x); if (sx > 545 || sx + w.w < -5) continue;
    const slow = 0.5 + 0.5 * Math.sin(t * (0.15 + rnd(w.seed) * 0.25) + w.seed), k = night * w.on * (rnd(w.seed + 3) < 0.25 ? sm(slow, 0.25, 0.75) : 1);
    if (k <= 0.02) continue;
    const g = fade(c, k), col = rnd(w.seed + 9) < 0.3 ? LIT[1] : LIT[0], sy = Y(w.y);
    g.rect(sx, sy, w.w, w.h, col); if (w.w > 8) { g.rect(sx, sy, w.w, 2, LIT[2]); g.rect(sx + (w.w >> 1) - 1, sy, 2, w.h, mix(col, "#7A4A20", 0.45)); }
  }
  // street lamps: warm heads and soft pools of light
  for (const [lx, ly] of [[2547, -150], [2885, GY - 122]]) { const x = X(lx), y = Y(ly); ditherEll(fade(c, night * 0.55), x, y + 8, 22, 18, "#FFD27A", 0.5); fade(c, night).rect(x - 3, y + 2, 7, 4, "#FFF0B0"); }
}
export function actors(c, V, t) {
  if (!vis(V)) return;
  const L = frameLight(V), X = (wx) => R(V.X(wx)), Y = (wy) => R(V.Y(wy));
  // moonlight on the ledge's top edge
  if (L.night > 0.05) { const g = fade(c, L.night * 0.8); for (let x = X(CITY[0] - 4); x < X(CITY[1] + 4); x++) if (x >= 0 && x < 540) g.px(x, Y(LEDGE), "#E8D8C0"); }
  // the hut door: swings open (narrows to the hinge) and lets warm light spill out
  const open = sm(t, ...VT.door), dx0 = X(HUT.door[0]), dx1 = X(HUT.door[1]), dTop = Y(LEDGE - 114), dBot = Y(LEDGE), gl = lit(c, L.mul);
  if (dx1 > -10 && dx0 < 550) {
    gl.rect(dx0, dTop, dx1 - dx0, dBot - dTop, "#2A1E1A");
    if (open > 0) { const gg = fade(c, open); gg.rect(dx0 + 1, dTop + 1, dx1 - dx0 - 2, dBot - dTop - 1, "#FFD88A"); gg.rect(dx0 + 1, dTop + 1, dx1 - dx0 - 2, 6, "#FFF0C0"); for (let i = 0; i < 4; i++) gg.rect(dx0 + 5, dBot - 12 - i * 10, dx1 - dx0 - 10, 2, "#E8B060"); }
    const dw = R((dx1 - dx0) * (1 - open * 0.82)); gl.rect(dx1 - dw, dTop, dw, dBot - dTop, "#6A4A3A"); gl.rect(dx1 - dw, dTop, Math.max(1, R(dw * 0.12)), dBot - dTop, "#8A6A50"); if (dw > 8) gl.px(dx1 - dw + 4, dTop + 60, "#F4CA50");
    if (open > 0) { const gg = fade(c, open * 0.45); for (let y = dBot; y < dBot + 6; y++) for (let x = dx0 - 30; x < dx1 + 6; x++) if ((x - dx0 + 30) / 66 > bayer(x, y) * 0.8 && x >= 0 && x < 540) gg.px(x, y, mix(c.get(x, y), "#FFD88A", 0.5)); }
  }
  // the cat (its puffed-up parts are built a few frames before they are needed)
  const s = catState(t);
  if (t > EV.home && t < DOOR_OPEN) { const f = Math.floor(t * 30) % 6; if (f < 3) warmCat(f, { puff: 1, earsBack: R((0.12 + 0.1 * 0.05) * 40) / 40 }); }
  shadow(c, X(CAT.x), Y(CAT.y) + 1, 92, 5, "#000000", 0.45);
  drawCat(c, X(CAT.x), Y(CAT.y), { t, ...s, whisker: "#C8C0F0" });
  const ex = Math.min(sm(t, ...VT.bang), 1 - sm(t, ...VT.bangOut));
  if (ex > 0) { const g = fade(c, ex), x = X(CAT.x) + 96, y = Y(CAT.y) - 300 - R(ease(ex) * 6); g.text(MAIN, "!", x + 1, y + 1, C.O, { scale: 4 }); g.text(MAIN, "!", x, y, "#FFE45A", { scale: 4 }); }
  // the vet: steps out of the doorway and stops by the cat; reaches out with the stethoscope on "jumps"
  const va = sm(t, ...VT.vetIn);
  if (va > 0) {
    const u = clamp01((t - VET_OUT) / (VET_STOP - VET_OUT)), vx = lerp(VET.from, VET.to, ease(u)), walking = Math.min(sm(u, 0, 0.15), 1 - sm(u, 0.75, 1));
    const gv = lit(c, softer(L.mul, 0.5));
    shadow(gv, X(vx), Y(LEDGE) + 1, 22, 3, "#000000", 0.4 * va);
    drawVet(gv, X(vx), Y(LEDGE), { a: va, walk: walking, ph: (t - VET_OUT) * VT.vetCycles, reach: sm(t, ...VT.reach) * (1 - sm(t, ...VT.lower)), look: [-0.8, 0.1], blink: blinkAt(t, 3.1, 1.3), open: sm(t, EV.twoHundred, EV.twoHundred + 0.3) * 0.4 });
  }
  sign(c, X((HUT.x0 + HUT.x1) / 2), Y(LEDGE - 124), "LV 6", "neon", 1, t);
}
export function hud(c, V, t) {
  if (!vis(V)) return;
  const X = (wx) => R(V.X(wx)), Y = (wy) => R(V.Y(wy));
  // the cat's heart: in from "cat's", beating only with pulse("cat", t), out after the heat-rule line
  const ha = Math.min(sm(t, ...VT.heartIn), 1 - sm(t, ...VT.heartOut));
  if (ha > 0) heart(c, X(HEARTW[0]), Y(HEARTW[1]), 11, pulse("cat", t), ha);
  const kp = (t - VT.pick) / 1.6; if (kp > 0 && kp < 1) pickup(c, X(HEARTW[0]), Y(HEARTW[1]) + 52, "130 BPM", kp);
  const ta = Math.min(sm(t, ...VT.tag), 1 - sm(t, ...VT.tagOut));
  if (ta > 0) tag(c, ["190 BPM", "AT THE VET"], X(CAT.x) + 128, 204, ta, C.PK, 2);
}
