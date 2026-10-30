// LV3 · green sea turtle — a warm turquoise lagoon in the morning, seen underwater (RANGE BIOME.lagoon = 1080..1620, surface
// y 0; REST.turtle cx 1350, cy 300 → screen = (wx − 1080, wy + 180); the harness draws the bright sun window behind).
// The snowy coast melts into a sandy beach that runs under the water at the left; the far shore rises to dry golden grass
// at x 1620 (the savanna). Between them a sandy bowl with sea grass, a coral reef shelf in the middle and a rocky ledge on
// each side. The series' cute sea turtle sleeps on the shelf under the ledges, facing the camera: closed eyes, blush,
// little bubbles and floating Z's, its shell rising and settling slowly. "Turtle's heart … eleven": a heart icon beside it
// beats ONCE on its beat (pulse("turtle")) + 11 BPM; "sleep underwater for hours": a little clock with spinning hands.
// Pure function of t; everything enters and leaves by dissolves/eases.
import { BIOME, EV, LV, LAND, pulse } from "../timeline.mjs";
import { drawWater } from "../world.mjs";
import { sign, pickup, panel, blob, ell, sm, ease, win, rnd, fade, mix, bayer, MAIN, C } from "../cute.mjs";
import { Canvas, hex } from "../../../../../renderer/pixel/raster.mjs";
import { drawHeart } from "./whale-art.mjs";
import { drawTurtle } from "./lagoon-turtle.mjs";

export const RANGE = BIOME.lagoon;
const R = Math.round, [X0, X1] = RANGE;
const TX = 1350, TY = 356;                      // turtle: middle of the shell's front rim (world) → screen (270, 536)
const SHELF = 410;                              // the reef shelf top it sleeps on (screen 590)
const BUBBLES = { n: 4, period: 2.3, phase: 0.55, life: 0.92 }, ZS = { n: 3, period: 2.1, fadeIn: 0.15 }, BREATH = 4.6;
const HEART_WIN = [EV.turtle - 0.1, EV.sleepWater + 0.4], PICK = [EV.eleven, 1.6];
const CLOCK = { win: [EV.sleepWater - 0.1, LV.turtle[1] + 0.3], start: EV.sleepWater - 0.1, hour: 1.3, minute: 15.6 };   // hand speeds (rad/s)
/** Timing shared with levels/ocean-motions.mjs (sound design): the picture reads the same constants. */
export const TIMING = { BUBBLES, ZS, BREATH, HEART_WIN, PICK, CLOCK, TX };

// ---------------------------------------------------------------- terrain
const prof = (keys) => (x) => { if (x <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const [a, ya] = keys[i], [b, yb] = keys[i + 1]; if (x <= b) { const k = (x - a) / (b - a), e = (1 - Math.cos(Math.PI * k)) / 2; return ya + (yb - ya) * e; } } return keys[keys.length - 1][1]; };
export const ground = prof([[X0, LAND], [1090, -15], [1100, -8], [1110, -1], [1118, 6], [1130, 30], [1145, 80], [1160, 150], [1172, 230], [1182, 320], [1190, 420], [1197, 500], [1204, 546], [1214, 560],
  [1300, 562], [1400, 558], [1518, 560], [1528, 520], [1538, 450], [1548, 360], [1560, 250], [1574, 150], [1588, 70], [1600, 18], [1608, 2], [1614, -10], [X1, LAND]]);
const shelfLeft = (wy) => 1218 - 26 * Math.sqrt(Math.max(0, (wy - SHELF) / 156)) - 3 * Math.sin(wy * 0.15), shelfRight = (wy) => 1482 + 26 * Math.sqrt(Math.max(0, (wy - SHELF) / 156)) + 3 * Math.sin(wy * 0.13 + 1);
/** Top of the reef mound at x: flat sand where the turtle lies, rounded rocky shoulders at both ends. */
const shelfTop = (wx) => { const e = Math.max(0, Math.abs(wx - 1350) - 104); return SHELF + (e * e) / 36 + (e > 0 ? 2 * Math.sin(wx * 0.4) : 0); };
const LEDGE_L = { y0: 208, y1: 236, x1: 1250 }, LEDGE_R = { y0: 214, y1: 240, x0: 1452 };              // rock ledges (overhangs)
const inLedgeL = (wx, wy) => wy >= LEDGE_L.y0 + 4 * Math.sin(wx * 0.11) && wy < LEDGE_L.y1 - 6 * sm(wx, LEDGE_L.x1 - 40, LEDGE_L.x1) && wx < LEDGE_L.x1 - 8 * sm(wy, LEDGE_L.y0, LEDGE_L.y1) - Math.max(0, 6 - (wy - LEDGE_L.y0)) * 1.5;
const inLedgeR = (wx, wy) => wy >= LEDGE_R.y0 + 3 * Math.sin(wx * 0.13) && wy < LEDGE_R.y1 - 6 * sm(wx, LEDGE_R.x0 + 40, LEDGE_R.x0) && wx > LEDGE_R.x0 + 8 * sm(wy, LEDGE_R.y0, LEDGE_R.y1) + Math.max(0, 6 - (wy - LEDGE_R.y0)) * 1.5;

// palettes
const STRATA = ["#EAD0A0", "#DCC08E", "#D0B282", "#E2C696", "#C8A878", "#D8BC8A"];
const REEF = ["#2A1E34", "#3E2C4A", "#56405E", "#6E5674", "#886E8A", "#A08AA2", "#BCA8BC", "#D8C8D6"];
const LROCK = ["#2A2A36", "#3A3A48", "#4E4E5E", "#64647A", "#7A7A92", "#9494A8", "#B0B0C2", "#CCCCDA"];
const SNOW_SAND = ["#E2CC9C", "#D4BA86", "#C6A874"], SNOW_SOIL = ["#4A3634", "#42302E", "#56403A"], SNOW_CLAY = ["#5A4034", "#50392E", "#64483A"], SNOW_ROCK = ["#3E4558", "#454C60", "#4B5266", "#41475A", "#50586C", "#3A4052"];
const SAV_SAND = ["#F0CC94", "#E4BC84", "#D8AE78", "#EAC48C", "#D0A06A", "#E0B47E"], SAV_ROCK = ["#5A4A5A", "#4E4050", "#665464", "#46384A", "#5E4C5C", "#706070"];
const DRY = ["#4A3410", "#6E4E18", "#94701E", "#B89030", "#D2AE48", "#E4C664", "#F0DA8A", "#FAEDB8"];
const CORAL = [["#E85A7A", "#FF9AB0", "#9A2A4A"], ["#F08A3A", "#FFC070", "#9A4A1A"], ["#9A6AE0", "#C8A0FF", "#4A2A8A"], ["#F4D04A", "#FFF0A0", "#9A7A1A"], ["#4AC8B0", "#A0F0E0", "#1A6A5A"]];
/** Turquoise veil by depth for everything under the surface (warm shallow lagoon). */
const veil = (col, wy) => (wy <= 0 ? hex(col) : mix(col, wy < 200 ? "#3ACAD0" : "#24A2BC", Math.min(0.5, 0.12 + wy / 1300)));

// neighbour seams: the snow coast's cutaway at x 1080 (snow lip, sand, soil, clay, granite) and the savanna's coast strata at x 1620
function snowCol(wx, wy, d) {
  if (d < 1) return "#FFF8F2"; if (d < 22) return SNOW_SAND[d < 3 ? 0 : rnd(wx * 7 + wy * 3) < 0.2 ? 2 : 1];
  if (wy >= 330 + (rnd(Math.floor(wx / 5) * 5) - 0.5) * 8) { const k = Math.floor(rnd(Math.floor(wx / 38) * 7919 + Math.floor(wy / 30) * 104729) * 6); return (wx % 38 < 2 || wy % 30 < 2) ? "#1E2230" : SNOW_ROCK[k]; }
  return wy < 150 ? SNOW_SOIL[rnd(wx * 5 + wy * 29) < 0.18 ? 1 : rnd(wx * 3 + wy * 11) < 0.1 ? 2 : 0] : SNOW_CLAY[rnd(wx * 5 + wy * 29) < 0.18 ? 1 : rnd(wx * 3 + wy * 11) < 0.1 ? 2 : 0];
}
function savCol(wx, wy, d) {
  if (d < 1) return "#FFE8B8"; if (d < 3) return "#F0CC94"; if (d < 9 + Math.sin(wx * 0.4) * 2) return "#D8AE78";
  const wv = Math.sin(wx * 0.027) * 6 + Math.sin(wx * 0.13) * 2, v = (wy + wv + 400) / 24, band = Math.floor(v), f = v - band, b = bayer(wx, wy);
  let col = SAV_SAND[band % SAV_SAND.length]; if (f < 0.09 && b > 0.35) col = mix(col, "#4A2210", 0.28);
  const deep = sm(wy + wv * 2, 300, 360); if (deep > 0) { const rv = (wy + wv + 400) / 30, rb = Math.floor(rv); col = mix(col, SAV_ROCK[rb % SAV_ROCK.length], deep); }
  if (wy > 120) col = mix(col, "#3A1A18", Math.min(0.45, (wy - 120) / 900));
  return col;
}

let LAYER = null;
function layer() {
  if (LAYER) return LAYER;
  const x0 = X0, y0 = -60, w = X1 - X0, h = 900, cv = new Canvas(w, h, "#000000"), m = new Uint8Array(w * h), base = Canvas.prototype.px;
  const g = Object.create(cv); g.px = (x, y, col) => { x = Math.floor(x) - x0; y = Math.floor(y) - y0; if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(cv, x, y, col); m[y * w + x] = 1; };
  const has = (x, y) => { x = Math.floor(x) - x0; y = Math.floor(y) - y0; return x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1; };
  // sandy bowl in cross-section
  for (let wx = X0; wx < X1; wx++) {
    const gy = ground(wx);
    for (let wy = R(gy); wy < y0 + h; wy++) {
      const d = wy - gy, b = bayer(wx, wy), wv = Math.sin(wx * 0.031) * 4 + Math.sin(wx * 0.1) * 2, v = (wy + wv + 400) / 20, band = Math.floor(v), f = v - band;
      let col = STRATA[band % STRATA.length]; if (f < 0.08 && b > 0.4) col = mix(col, "#9A7A50", 0.25);
      col = mix(col, "#8A6A48", Math.min(0.42, Math.max(0, wy - 300) / 700));
      if (rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#FFF8E8", 0.5); else if (rnd(wx * 29 + wy * 17) < 0.006) col = mix(col, "#6A4A30", 0.45);
      if (d < 2) col = wy > 0 ? (Math.sin(wx * 0.5 + wy * 0.3) > 0.2 ? "#FFF0C8" : "#F2DCA8") : "#FFF4D4"; else if (d < 4) col = "#E8CC98";
      const sb = X0 + 10 + 7 * Math.sin(wy * 0.09) + 5 * Math.sin(wy * 0.023 + 1) + (wy > 0 ? wy * 0.02 : 0), vb = X1 - 12 - 6 * Math.sin(wy * 0.08 + 2) - 4 * Math.sin(wy * 0.031);
      if (wx < sb) col = snowCol(wx, wy, wy - LAND);
      else if (wx < X0 + 40 && wy < 0 && d < 3 && rnd(wx * 3 + 1) < 0.5 * (1 - (wx - X0) / 40)) col = d < 1 ? "#FFF8F2" : "#E8F0FF";   // last melting snow
      if (wx > vb) col = savCol(wx, wy, wy - LAND);
      g.px(wx, wy, wy > 0 ? (d < 4 ? veil(col, wy) : mix(col, "#5AB8C0", 0.16)) : col);
    }
  }
  // the reef shelf: a rounded mound of porous reef rock with a sandy top where the turtle sleeps
  for (let wy = SHELF - 4; wy < 566; wy++) for (let wx = 1196; wx <= 1506; wx++) {
    const top = shelfTop(wx); if (wy < top || wx < shelfLeft(wy) || wx > shelfRight(wy)) continue;
    const d = wy - top, b = bayer(wx, wy), n = Math.sin(wx * 0.21 + wy * 0.07) + Math.sin(wx * 0.07 - wy * 0.19) * 0.8 + Math.sin(wx * 0.5 + wy * 0.45) * 0.4;
    let col = REEF[Math.max(1, Math.min(6, R(3.6 + n * 0.9 - d / 80 + (b - 0.5) * 0.8)))];
    if (rnd(wx * 17 + wy * 7) < 0.06) col = REEF[1]; else if (rnd(wx * 5 + wy * 13) < 0.03) col = REEF[6];
    const sandy = top <= SHELF + 1;
    if (d < 2) col = sandy ? (d < 1 ? "#FFF2CC" : "#EED8A8") : REEF[6]; else if (sandy && d < 6 && b < 0.6) col = "#D8BE8E";
    const edge = wx - shelfLeft(wy) < 1.5 || shelfRight(wy) - wx < 1.5; if (edge && d > 2) col = REEF[0];
    g.px(wx, wy, veil(col, wy));
  }
  // ledges on both sides (grey rock), sand and corals on their tops
  for (let wy = 196; wy < 244; wy++) for (let wx = 1140; wx < 1580; wx++) {
    const L = wx < 1300 && inLedgeL(wx, wy), Rr = wx > 1400 && inLedgeR(wx, wy); if (!L && !Rr) continue;
    const top = L ? LEDGE_L.y0 + 4 * Math.sin(wx * 0.11) : LEDGE_R.y0 + 3 * Math.sin(wx * 0.13), d = wy - top, b = bayer(wx, wy);
    let col = LROCK[Math.max(1, Math.min(6, R(4.2 - d / 9 + (b - 0.5) * 0.9 + Math.sin(wx * 0.3 + wy * 0.5) * 0.5)))];
    if (d < 2) col = "#F2DCA8"; else if (d > 20 && b < 0.5) col = LROCK[1];
    g.px(wx, wy, veil(col, wy));
  }
  // corals: brain corals, branching corals, sea fans on the shelf face and the ledge tops; sea grass roots, shells, a starfish
  const brain = (cx, cy, r, ci) => { const [c0, c1, c2] = CORAL[ci]; for (let y = -r; y <= 0; y++) for (let x = -r * 1.3; x <= r * 1.3; x++) { if ((x / (r * 1.3)) ** 2 + (y / r) ** 2 > 1) continue; const ridge = Math.sin((x * 0.9 + Math.sin(y * 0.8) * 2)) > 0.4; g.px(R(cx + x), R(cy + y), veil(y > -2 ? c2 : ridge ? c1 : c0, cy)); } };
  const branch = (cx, cy, h, ci, seed) => { const [c0, c1, c2] = CORAL[ci]; const arm = (x, y, a, len, dep) => { for (let k = 0; k < len; k++) { const X = x + Math.cos(a) * k, Y = y + Math.sin(a) * k; g.px(R(X), R(Y), veil(k < len - 2 ? c0 : c1, cy)); g.px(R(X) + 1, R(Y), veil(c2, cy)); } if (dep > 0) { const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; arm(ex, ey, a - 0.45 - rnd(seed + dep) * 0.2, len * 0.72, dep - 1); arm(ex, ey, a + 0.45 + rnd(seed * 3 + dep) * 0.2, len * 0.72, dep - 1); } else { g.px(R(x + Math.cos(a) * len), R(y + Math.sin(a) * len), veil(c1, cy)); } }; arm(cx, cy, -Math.PI / 2, h * 0.4, 3); };
  const fan = (cx, cy, r, ci) => { const [c0, c1, c2] = CORAL[ci]; for (let a = -Math.PI * 0.95; a <= -Math.PI * 0.05; a += 0.05) for (let k = 0; k < r; k++) { const X = cx + Math.cos(a) * k, Y = cy + Math.sin(a) * k * 1.1; if (bayer(R(X), R(Y)) < 0.55 || k > r - 2) g.px(R(X), R(Y), veil(k > r - 3 ? c1 : (R(k) % 5 === 0 ? c2 : c0), cy)); } for (let k = 0; k < 4; k++) g.px(R(cx), R(cy + k), veil(c2, cy)); };
  brain(1236, SHELF + 2, 11, 3); brain(1468, SHELF + 2, 9, 0); brain(1290, 470, 9, 4); brain(1420, 492, 10, 1); brain(1350, 528, 12, 2);
  branch(1246, 470, 40, 0, 3); branch(1458, 455, 36, 1, 7); branch(1384, 548, 30, 4, 11); branch(1318, 540, 26, 3, 5);
  fan(1262, 520, 22, 2); fan(1440, 535, 20, 0);
  // more reef life on the mound: brain corals, staghorn branches, anemones, a sea fan, little tube sponges
  brain(1232, 446, 8, 0); brain(1472, 452, 9, 3); brain(1268, 498, 7, 1); brain(1438, 470, 7, 2); brain(1398, 520, 8, 0); brain(1300, 556, 9, 3); brain(1460, 552, 8, 4); brain(1214, 552, 9, 1);
  branch(1290, 512, 28, 1, 21); branch(1412, 506, 30, 2, 23); branch(1226, 528, 26, 3, 25); branch(1488, 524, 28, 4, 27); branch(1346, 500, 22, 0, 29);
  fan(1372, 556, 18, 3); fan(1236, 488, 14, 0); fan(1468, 494, 15, 4);
  for (const [tx, ty, ci] of [[1252, 456, 2], [1258, 458, 2], [1446, 444, 0], [1452, 446, 0], [1330, 470, 4]]) { const [c0, c1, c2] = CORAL[ci]; for (let k = 0; k < 10; k++) { g.px(tx, ty - k, veil(k > 8 ? c1 : c0, ty)); g.px(tx + 1, ty - k, veil(c2, ty)); } g.px(tx, ty - 10, veil("#1A1020", ty)); }
  brain(1196, LEDGE_L.y0 + 2, 7, 1); branch(1224, LEDGE_L.y0 + 1, 30, 2, 13); fan(1166, LEDGE_L.y0 + 2, 16, 4);
  brain(1498, LEDGE_R.y0 + 2, 8, 2); branch(1530, LEDGE_R.y0 + 1, 32, 0, 17); fan(1474, LEDGE_R.y0 + 2, 15, 3);
  for (let i = 0; i < 22; i++) { const wx = R(1214 + rnd(i * 3 + 1) * 304), gy = R(ground(wx)); if (wx > shelfLeft(gy) - 2 && wx < shelfRight(gy) + 2) continue; const k = rnd(i * 5); if (k < 0.5) { g.px(wx, gy - 1, veil("#F8EAE0", gy)); g.px(wx + 1, gy - 1, veil("#E8C8C0", gy)); } else { g.px(wx, gy - 1, veil("#8A9890", gy)); g.px(wx - 1, gy, veil("#6A7870", gy)); } }
  { const wx = 1560, wy = R(ground(1560)) + 4, col = veil("#F08A5A", wy), hi = veil("#FFC48A", wy); for (let a = 0; a < 5; a++) { const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5 + 0.3; for (let r = 0; r < 6; r++) g.px(R(wx + Math.cos(ang) * r), R(wy + Math.sin(ang) * r * 0.8), r < 2 ? hi : col); } }
  // dry golden grass where the far shore meets the savanna; a little snow on the near beach
  for (let i = 0; i < 9; i++) { const wx = X1 - 26 + i * 3 + rnd(i) * 2, gy = ground(wx), hh = 6 + rnd(i * 5) * 10 * sm(wx, X1 - 30, X1 - 8); for (let s = -2; s <= 2; s++) for (let k = 0; k < hh; k++) g.px(R(wx + s * 1.4 + (s * k) / 5), R(gy - k), DRY[k > hh - 3 ? 6 : k > hh / 2 ? 5 : 3]); }
  LAYER = { cv, m, x0, y0, w, h, has };
  return LAYER;
}
function blitLayer(c, V) {
  const K = layer(), ox = R(V.X(K.x0)), oy = R(V.Y(K.y0)), xa = Math.max(0, ox), xb = Math.min(c.w, ox + K.w), ya = Math.max(0, oy), yb = Math.min(c.h, oy + K.h), d = c.d, s = K.cv.d;
  for (let y = ya; y < yb; y++) { let li = (y - oy) * K.w + (xa - ox), p = (y * c.w + xa) * 3; for (let x = xa; x < xb; x++, li++, p += 3) { if (!K.m[li]) continue; const q = li * 3; d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2]; } }
}

// ---------------------------------------------------------------- per-frame life
const GRASS = [[1222, 0], [1232, 1], [1508, 2], [1500, 3], [1176, 4], [1186, 5], [1540, 6], [1552, 7], [1300, 8], [1205, 9], [1515, 10]];
function seaGrass(c, V, t) {
  for (const [gx, i] of GRASS) {
    const gy = ground(gx); if (gx > shelfLeft(gy) - 4 && gx < shelfRight(gy) + 4) continue;
    for (let b = 0; b < 4; b++) {
      const x0 = gx + b * 3 - 4, h = 22 + rnd(i * 9 + b) * 30, ph = t * (1.1 + rnd(i + b) * 0.6) + i + b;
      for (let k = 0; k < h; k++) { const u = k / h, x = R(V.X(x0 + Math.sin(ph + u * 2) * u * u * 7)), y = R(V.Y(gy - k)); c.px(x, y, u > 0.85 ? "#9AE07A" : b % 2 ? "#3E9A5A" : "#58B46A"); }
    }
  }
}
function caustics(c, V, t) {
  // soft moving light lines on the sand of the shelf top and on the floor
  for (const [x0, x1, wy] of [[1226, 1474, SHELF], [1214, 1518, 560]]) for (let wx = x0; wx < x1; wx++) {
    const gy = wy === 560 ? ground(wx) : wy, v = Math.sin(wx * 0.19 + t * 1.7) + Math.sin(wx * 0.07 - t * 1.1 + 2); if (v < 1.1) continue;
    if (wy === 560 && wx > shelfLeft(gy) - 1 && wx < shelfRight(gy) + 1) continue;
    const x = R(V.X(wx)), y = R(V.Y(gy)); if (x >= 0 && x < 540 && y >= 0 && y < 960) c.px(x, y, "#FFFCE8");
  }
}
function fish(c, V, t) {
  // a small school of yellow tangs drifting across behind the turtle, back and forth
  for (let i = 0; i < 6; i++) {
    const ph = t * 0.11 + i * 0.07, u = (ph % 2 + 2) % 2, dir = u < 1 ? 1 : -1, k = u < 1 ? u : 2 - u;
    const wx = 1150 + ease(k) * 340 + (i % 3) * 14, wy = 120 + (i >> 1) * 12 + Math.sin(t * 1.6 + i) * 4, x = R(V.X(wx)), y = R(V.Y(wy));
    if (x < -10 || x > 550) continue;
    const body = "#F4D04A", fin = "#E0A020";
    for (let j = -4; j <= 4; j++) for (let q = -6; q <= 6; q++) { if ((q / 6.5) ** 2 + (j / 4.5) ** 2 > 1) continue; c.px(x + q * dir, y + j, Math.abs(j) >= 3 ? fin : body); }
    c.px(x + 4 * dir, y - 1, "#101018"); c.px(x + 4 * dir, y - 2, "#FFFFFF"); c.px(x + 6 * dir, y + 1, "#E0A020"); for (const j of [-3, -2, -1, 0, 1, 2, 3]) c.px(x - 7 * dir - (Math.abs(j) > 1 ? dir : 0), y + j, fin); c.px(x - 6 * dir, y, "#F8F8F8");
  }
}

// ---------------------------------------------------------------- layers
export function fill(c, V, t) {
  if (V.x1 < X0 || V.x0 > X1) return;
  drawWater(c, V, t, X0, X1, 0);
  // warm the deep water toward the lagoon's turquoise (the sand floor lights it up)
  const sx0 = Math.max(0, R(V.X(X0))), sx1 = Math.min(c.w, R(V.X(X1))), sy0 = Math.max(0, R(V.Y(0)) + 2), T = hex("#22B6C2"), d = c.d;
  for (let y = sy0; y < c.h; y++) { const wy = y - 480 + V.cy, k = 0.55 * sm(wy, 90, 520); if (k <= 0) continue; for (let x = sx0; x < sx1; x++) { const i = (y * c.w + x) * 3; d[i] += (T[0] - d[i]) * k; d[i + 1] += (T[1] - d[i + 1]) * k; d[i + 2] += (T[2] - d[i + 2]) * k; } }
}

export function back(c, V, t) {
  if (V.x1 < X0 || V.x0 > X1) return;
  blitLayer(c, V);
  fish(c, V, t);
  seaGrass(c, V, t);
  caustics(c, V, t);
}

/** Breathing (shell rising slowly) and the sleepy idle life. */
export function actors(c, V, t) {
  if (V.x1 < X0 - 60 || V.x0 > X1 + 60) return;
  const x = R(V.X(TX)), y = R(V.Y(TY)); if (x < -260 || x > 800) return;
  const breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / BREATH);
  drawTurtle(c, x, y, { breath, haze: 0.1, hazeCol: "#2AA8C0" });
  // little bubbles from the nostrils, rising and wobbling
  for (let i = 0; i < BUBBLES.n; i++) { const P = BUBBLES.period, u = (((t + i * BUBBLES.phase) / P) % 1 + 1) % 1, bx = x + (i % 2 ? 3 : -3) + Math.sin(u * 9 + i) * 3, by = y + 22 - R(breath * 2.5) - 4 - u * 120, r = u < 0.3 ? 1 : 2; if (u > BUBBLES.life) continue; c.ring(R(bx), R(by), r, "#C8F4FF"); c.px(R(bx) - 1, R(by) - r, "#FFFFFF"); }
  // Z's floating up to the right of the head
  for (let i = 0; i < ZS.n; i++) {
    const P = ZS.period, u = (((t / P + i / ZS.n) % 1) + 1) % 1, s = u < 0.4 ? 2 : 3, zx = x - 60 - u * 50 + Math.sin(u * 6 + i) * 4, zy = y + 4 - u * 92, a = Math.min(sm(u, 0, ZS.fadeIn), 1 - sm(u, 0.7, 1)); if (a <= 0) continue;
    const g = fade(c, a); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) g.text(MAIN, "Z", R(zx) + dx, R(zy) + dy, "#123A4A", { scale: s }); g.text(MAIN, "Z", R(zx), R(zy), "#E8FCFF", { scale: s });
  }
}

export function front(c, V, t) {
  if (V.x1 < X0 || V.x0 > X1) return;
}

export function hud(c, V, t) {
  if (V.x1 < X0 - 60 || V.x0 > X1 + 60) return;
  // level sign: a stone sign on the left ledge
  sign(c, R(V.X(1214)), R(V.Y(LEDGE_L.y0 + 1)), "LV 3", "stone");
  // the heart beside the sleeping turtle: it beats ONCE (on its beat), then rests
  const hx = R(V.X(1490)), hy = R(V.Y(TY - 38)), ha = win(t, HEART_WIN[0], HEART_WIN[1], 0.4, 0.5);
  if (ha > 0) {
    const p = pulse("turtle", t), r = 13 * (1 + 0.28 * p);
    drawHeart(c, hx, hy, r, { a: ha, glow: 0.25 + 1.0 * p, bright: p });
    if (p > 0.02) { const g = fade(c, ha * p); g.ering(hx, hy + 2, R(18 + (1 - p) * 26), R(16 + (1 - p) * 22), "#FFD8DC"); }
  }
  pickup(c, hx, hy - 24, "11 BPM", (t - PICK[0]) / PICK[1]);
  // a little clock with spinning hands: it sleeps underwater for hours
  const ca = win(t, CLOCK.win[0], CLOCK.win[1], 0.35, 0.4);
  if (ca > 0) {
    const cx = R(V.X(1170)), cy = R(V.Y(84)), g = fade(c, ca), rr = 21, spin = Math.max(0, t - CLOCK.start);
    for (let y = -rr - 2; y <= rr + 2; y++) for (let x = -rr - 2; x <= rr + 2; x++) { const d = Math.hypot(x, y); if (d <= rr + 2) g.px(cx + x, cy + y, d > rr + 1 ? "#14202A" : d > rr - 2 ? "#E05A44" : d > rr - 3 ? "#9A2A20" : y < -rr * 0.3 && x < 0 ? "#FFFFFF" : "#F4F0E4"); }
    g.rect(cx - 3, cy - rr - 6, 7, 4, "#E05A44"); g.rect(cx - 2, cy - rr - 7, 5, 1, "#14202A");
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.px(R(cx + Math.cos(a) * (rr - 5)), R(cy + Math.sin(a) * (rr - 5)), k % 3 === 0 ? "#14202A" : "#8A8A9A"); }
    const hand = (ang, len, col) => { for (let k = 0; k <= len; k++) g.px(R(cx + Math.cos(ang) * k), R(cy + Math.sin(ang) * k), col); };
    hand(-Math.PI / 2 + spin * CLOCK.hour, 9, "#14202A"); hand(-Math.PI / 2 + spin * CLOCK.minute, 14, "#E05A44"); g.rect(cx - 1, cy - 1, 3, 3, "#14202A");
    const lw = c.measure(MAIN, "HOURS", { scale: 2 }) + 20, lx = cx - R(lw / 2), ly = cy + rr + 8;
    panel(c, lx, ly, lw, 26, ca, C.Y); fade(c, ca).text(MAIN, "HOURS", lx + 10, ly + 7, C.Y, { scale: 2 });
  }
}
