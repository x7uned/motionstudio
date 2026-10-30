// Static terrain of the sea column, drawn once into world-space caches. One set of rock strata (by world y) runs
// through the left cliff, the right shelf wall, under the sandy floor and under the shore, so every cut matches.
// Caches: the cliff with fossils (two variants: the opening column, and the wrapped copy under the night city which also
// holds the human skull and has nothing above the sea), the deep floor, the shelf drop-off on the right (meets the shore
// slope at x 540, y 300) and the sunlit reef rock of the octopus. All coordinates are world pixels.
import { makeCache, tintCache, stamp, rnd, R, sm, mix, bayer, SAND } from "./sea-common.mjs";
import { Canvas } from "../../../../../renderer/pixel/raster.mjs";
import { drawPart } from "../../../dog/shade.mjs";
import { smooth } from "../cute.mjs";

// ---------------------------------------------------------------- strata
export const CLIFF_TOP = -60;
const STRATA = ["#B47A52", "#CDA673", "#8E7C6C", "#A48496", "#7C8C88", "#D6BE94", "#9C6A5C", "#6E6E82", "#B8946C", "#8A7290"];
const TEX = ["plain", "lines", "pebble", "plain", "lines", "dots", "pebble"];
export const DARK = "#1C1424";
// special layers (y0, y1): fossil beds in pale stone so the bones read
const SPECIAL = [
  { y0: -60, y1: -40, col: "#8A6A4A", tex: "soil", edge: 104 },
  { y0: 760, y1: 796, col: "#B6A486", tex: "plain", edge: 100, key: "ammo" },
  { y0: 1004, y1: 1040, col: "#BBA98A", tex: "plain", edge: 106, key: "ammo2" },
  { y0: 1266, y1: 1338, col: "#DCC9A2", tex: "plain", edge: 114, key: "dino" },
  { y0: 1520, y1: 1550, col: "#A89A84", tex: "plain", edge: 102, key: "trilo" },
  { y0: 1672, y1: 1722, col: "#CDB894", tex: "plain", edge: 110, key: "spongef" },
];
const SKULL_LAYER = { y0: 446, y1: 498, col: "#D8C7A2", tex: "plain", edge: 108, key: "skull" };
const Y_MIN = -100, Y_MAX = 2300;

function layersFor(dive) {
  let b = []; let y = -40, i = 0;
  while (y < Y_MAX) { b.push(y); y += 14 + Math.floor(rnd(i * 13 + 5) * 30); i++; }
  const specials = dive ? [...SPECIAL, SKULL_LAYER] : SPECIAL;
  for (const s of specials) { b = b.filter((v) => v <= s.y0 || v >= s.y1); b.push(s.y0, s.y1); }
  b = [...new Set(b)].sort((p, q) => p - q);
  const out = [];
  for (let k = 0; k < b.length - 1; k++) {
    const y0 = b[k], y1 = b[k + 1], s = specials.find((q) => q.y0 === y0);
    if (s) { out.push({ ...s, y1, seed: y0 }); continue; }
    if (y1 - y0 < 6 && out.length) { out[out.length - 1].y1 = y1; continue; }
    const h = rnd(y0 * 7 + 3), col = STRATA[Math.floor(h * STRATA.length)], tex = TEX[Math.floor(rnd(y0 * 11 + 1) * TEX.length)];
    out.push({ y0, y1, col, tex, edge: 88 + Math.floor(rnd(y0 * 5 + 9) * 24), jut: Math.floor(rnd(y0 * 3 + 5) * 12), seed: y0, period: 3 + Math.floor(rnd(y0 + 77) * 3) });
  }
  // the band around the reef root (y 470..770) leans out so the reef sits against the wall
  for (const L of out) if (L.y1 > 470 && L.y0 < 770) L.edge = Math.max(L.edge, 104);
  for (const L of out) { L.dark = mix(L.col, DARK, 0.42); L.shade = mix(L.col, DARK, 0.2); L.light = mix(L.col, "#FFF4E0", 0.28); L.rim = mix(L.col, "#FFF8EC", 0.45); }
  const idx = new Int16Array(Y_MAX - Y_MIN).fill(-1);
  out.forEach((L, i) => { for (let y = Math.max(Y_MIN, L.y0); y < Math.min(Y_MAX, L.y1); y++) idx[y - Y_MIN] = i; });
  out.at = (y) => (y < Y_MIN || y >= Y_MAX ? null : out[idx[y - Y_MIN]] ?? null);
  return out;
}
export const LAYERS = layersFor(false), LAYERS_DIVE = layersFor(true);

/** Strata colour at world (x, y) before the depth tint (texture only). */
export function texel(L, x, y) {
  if (!L) return "#6E6E82";
  if (L.tex === "soil") return y - L.y0 < 3 ? mix("#6A9A3A", L.col, (y - L.y0) / 3) : rnd(x * 31 + y * 7) < 0.08 ? L.dark : rnd(x * 17 + y * 3) < 0.05 ? L.light : L.col;
  let col = L.col; const v = (y - L.y0) / (L.y1 - L.y0);
  if (v > 0.5 && (v - 0.5) * 1.3 > bayer(x, y)) col = L.shade;
  if (L.tex === "plain") { const q = rnd(x * 131 + y * 71 + L.seed); if (q < 0.04) col = L.dark; else if (q > 0.968) col = L.light; }
  else if (L.tex === "lines") { const yy = y - L.y0 + R(Math.sin(x * 0.19 + L.seed) * 0.8); if (yy % L.period === 0 && rnd(x * 3 + y * 101) < 0.8) col = L.shade; if (rnd(x * 7 + y * 13) < 0.025) col = L.dark; }
  else if (L.tex === "dots") { if (((x + 2 * y) & 3) === 0 && ((x >> 1) + y) % 2 === 0) col = L.shade; if (rnd(x * 5 + y * 29) < 0.03) col = L.light; }
  else if (L.tex === "pebble") { const q = rnd(x * 41 + y * 23 + L.seed); if (q < 0.035) col = L.dark; else if (q > 0.975) col = L.light; }
  if (y === L.y0) col = L.dark; else if (y === L.y0 + 1) col = L.light;
  return col;
}
/** Pebbles embedded in "pebble" layers between x0 and x1. */
function pebbles(g, layers, x0, x1, yFrom, yTo, inside) {
  for (const L of layers) {
    if (L.tex !== "pebble" || L.y1 < yFrom || L.y0 > yTo) continue; const th = L.y1 - L.y0;
    for (let k = 0; k < Math.floor(((x1 - x0) * th) / 330); k++) {
      const px = x0 + 4 + rnd(L.seed * 3 + k + x0) * (x1 - x0 - 8), py = L.y0 + 3 + rnd(L.seed * 5 + k * 7 + x0) * (th - 6), r = 1.5 + rnd(k * 11 + L.seed) * 2.2;
      if (py < yFrom + 2 || py > yTo - 2) continue;
      for (let yy = R(py - r); yy <= R(py + r); yy++) for (let xx = R(px - r * 1.3); xx <= R(px + r * 1.3); xx++) { const d = ((xx - px) / (r * 1.3)) ** 2 + ((yy - py) / r) ** 2; if (d <= 1 && inside(xx, yy)) g.px(xx, yy, d > 0.6 ? (yy < py ? L.light : L.dark) : mix(L.col, k % 2 ? "#EDE4D4" : "#6A5A5A", 0.4)); }
    }
  }
}

// ---------------------------------------------------------------- walls: the cliff (rock left of its edge) and the shelf (rock right of its edge)
function drawWall(g, layers, E, side, yFrom, yTo, xLim, skip = () => false) {
  for (let y = yFrom; y < yTo; y++) {
    const L = layers.at(y); if (!L) continue;
    const e = E(y), eu = y > yFrom ? E(y - 1) : side === "L" ? 0 : xLim, ed = E(y + 1);
    const xa = side === "L" ? 0 : e, xb = side === "L" ? e : xLim;
    for (let x = xa; x < xb; x++) {
      if (skip(x, y)) continue;
      let col = texel(L, x, y); const k = side === "L" ? e - 1 - x : x - e;          // distance from the face
      if (k === 0) col = DARK;
      else if (side === "L" ? x >= eu && y > yFrom : x < eu && y > yFrom) col = L.light;            // lit top of a ledge that sticks out
      else if (side === "L" ? x >= ed : x < ed) col = L.dark;                                       // underside of an overhang
      else if (k === 1) col = L.rim; else if (k === 2 && L.tex !== "soil") col = mix(col, L.rim, 0.4);
      g.px(x, y, col);
    }
    if (y > yFrom) { const a = side === "L" ? eu : e, b = side === "L" ? e : eu; for (let x = a; x < b; x++) if (!skip(x, y - 1)) g.px(x, y - 1, DARK); }
  }
}

// ---------------------------------------------------------------- cliff (x 0..~118, top y −60, base under the floor)
function cliffEdge(layers) {
  const e = new Map();
  for (const L of layers) for (let y = Math.max(L.y0, CLIFF_TOP); y < Math.min(L.y1, 1900); y++) {
    let v = L.edge + R(1.4 * Math.sin(y * 0.37 + L.seed) + (rnd(Math.floor(y / 3) * 17 + L.seed) - 0.5) * 2);
    if (y < CLIFF_TOP + 14) { const k = 14 - (y - CLIFF_TOP); v = R(L.edge - 14 + Math.sqrt(Math.max(0, 196 - k * k))); }  // rounded top corner
    e.set(y, v);
  }
  return (y) => e.get(y) ?? 0;
}
export function buildCliff(dive) {
  const K = makeCache(0, -100, 150, 2000), g = K.g, layers = dive ? LAYERS_DIVE : LAYERS, E = cliffEdge(layers);
  const y0 = dive ? 0 : CLIFF_TOP;
  drawWall(g, layers, E, "L", y0, 1900, 0);
  pebbles(g, layers, 0, 110, y0, 1900, (x, y) => x < E(y) - 3);
  // grass cap on top of the cliff (opening column only; the city covers the wrapped copy above the sea)
  if (!dive) {
    const top = CLIFF_TOP;
    for (let x = 0; x < E(top) - 1; x++) {
      g.px(x, top - 1, "#2A4A20"); g.px(x, top, "#8CCB5A"); g.px(x, top + 1, "#5EA040"); if (rnd(x * 3) < 0.6) g.px(x, top + 2, "#4A8A34");
      if (rnd(x * 7 + 1) < 0.5) { const h = 2 + Math.floor(rnd(x * 13) * 6); for (let j = 1; j <= h; j++) g.px(x, top - 1 - j, j === h ? "#BEE88A" : j > h / 2 ? "#8CCB5A" : "#5EA040"); g.px(x - 1, top - 1 - h, "#2A4A20"); }
    }
    for (const [fx, col] of [[18, "#F8A8C8"], [47, "#FFF4D8"], [71, "#F8D058"], [90, "#F8A8C8"]]) { const fy = top - 7 - Math.floor(rnd(fx) * 4); g.px(fx, fy + 1, "#3E7A3A"); g.px(fx, fy + 2, "#3E7A3A"); g.px(fx - 1, fy, col); g.px(fx + 1, fy, col); g.px(fx, fy - 1, col); g.px(fx, fy + 1, col); g.px(fx, fy, "#F4CA50"); }
    stamp(g, 30, top - 7, 12, 7, (m) => m.ellipse(6, 4, 6, 3, "#fff"), { base: "#9A8C8A", light: "#C8BCB4", shade: "#6E6266", outline: "#2A2030" });
    stamp(g, 80, top - 5, 8, 5, (m) => m.ellipse(4, 3, 4, 2, "#fff"), { base: "#A48E7E", light: "#D0BCA8", shade: "#76645A", outline: "#2A2030" });
  }
  fossils(g, layers, dive);
  tintCache(K, 0, dive);
  return { K, E, layers };
}

const BONE = { base: "#E6DABA", light: "#FFF6DE", shade: "#B8A684", outline: "#3A2A24" };
function fossils(g, layers, dive) {
  // T-rex skeleton lying in the pale bed (x 10..106, y 1276..1330): skull right, tail left
  stamp(g, 6, 1272, 104, 62, dinoDraw, BONE);
  // eye socket, nostril and teeth on the skull
  g.disc(90, 1288, 2, "#3A2A24"); g.px(89, 1287, "#5A4434"); g.px(102, 1287, "#3A2A24");
  for (let x = 86; x <= 100; x += 2) g.px(x, 1297, "#FFFFFF");
  // ammonites (spiral shells)
  for (const [ax, ay, r] of [[34, 778, 9], [76, 1022, 8], [24, 1024, 5]]) ammonite(g, ax, ay, r);
  // trilobite
  stamp(g, 40, 1528, 18, 14, (m) => { m.ellipse(9, 6, 8, 6, "#fff"); m.rect(1, 6, 17, 1, "#fff"); }, { base: "#8A7A6A", light: "#B8A890", shade: "#5E5048", outline: "#2A2030", fill: (x, y, top, bot) => top ? "#C4B49C" : bot ? "#5E5048" : (y - 1528) % 3 === 0 ? "#6E6052" : x === 49 ? "#A89A84" : "#8A7A6A" });
  // fossil sponges: little cups with pores
  for (const [sx, sy, s] of [[20, 1686, 1], [52, 1692, 0.8], [82, 1684, 1.1]]) {
    const w = R(12 * s), h = R(18 * s);
    stamp(g, sx, sy, w, h, (m) => m.poly([[0, 0], [w, 0], [w - 2, h * 0.6], [w * 0.62, h], [w * 0.38, h], [2, h * 0.6]], "#fff"), { base: "#B8A07C", light: "#E8D4AE", shade: "#8A7458", outline: "#3A2A24" });
    g.rect(sx + 2, sy, w - 4, 2, "#5E4A36");
    for (let j = 4; j < h - 3; j += 3) for (let i = 3; i < w - 3; i += 3) if (((i + j) / 3) % 2 === 0) g.px(sx + i, sy + j, "#7A6248");
  }
  if (dive) humanSkull(g, 40, 458);
}
/** T-rex skeleton shape in local coords of a 104×62 box whose origin is world (6, 1272). */
export function dinoDraw(m) {
    const o = (x, y) => [x - 6, y - 1272], W = "#fff";
    const P = (pts) => m.poly(pts.map(([x, y]) => o(x, y)), W);
    // skull + jaw
    P([[80, 1287], [86, 1282], [97, 1281], [104, 1285], [105, 1292], [100, 1296], [88, 1298], [81, 1295]]);
    P([[84, 1298], [101, 1298], [99, 1303], [88, 1304], [84, 1301]]);
    // neck + spine + tail (vertebrae)
    const spine = [[80, 1293], [75, 1297], [69, 1299], [63, 1298], [57, 1297], [51, 1297], [45, 1298], [40, 1300], [35, 1302], [30, 1304], [25, 1306], [20, 1308], [15, 1310], [11, 1312]];
    spine.forEach(([x, y], i) => { const r = i < 8 ? 2.4 : Math.max(1.1, 2.4 - (i - 7) * 0.2); m.ellipse(R(x - 6), R(y - 1272), R(r + 0.4), R(r), W); if (i > 1 && i < 9) m.rect(R(x - 6), R(y - 1272 - r - 2), 1, 2, W); });
    for (let i = 0; i < spine.length - 1; i++) m.line(R(spine[i][0] - 6), R(spine[i][1] - 1272), R(spine[i + 1][0] - 6), R(spine[i + 1][1] - 1272), W);
    // ribs
    for (const rx of [47, 52, 57, 62, 67]) { const top = 1299, len = 12 - Math.abs(rx - 57) * 0.4; for (let j = 0; j < len; j++) m.px(R(rx - 6 + Math.sin(j / len * 1.6) * 3), R(top - 1272 + j), W); }
    // pelvis + hind legs
    m.ellipse(40 - 6, 1303 - 1272, 5, 3, W);
    for (const [dx, k] of [[0, 1], [5, 0.8]]) { m.line(40 - 6 + dx, 1303 - 1272, 46 - 6 + dx, 1314 - 1272, W); m.line(41 - 6 + dx, 1303 - 1272, 47 - 6 + dx, 1314 - 1272, W); m.line(46 - 6 + dx, 1314 - 1272, 41 - 6 + dx, 1323 - 1272, W); m.line(41 - 6 + dx, 1323 - 1272, 50 - 6 + dx, 1326 - 1272, W); m.px(51 - 6 + dx, 1325 - 1272, W); m.px(51 - 6 + dx, 1327 - 1272, W); }
    // tiny arms
    m.line(70 - 6, 1302 - 1272, 73 - 6, 1308 - 1272, W); m.line(73 - 6, 1308 - 1272, 77 - 6, 1307 - 1272, W);
}
/** World pixels of a soft ring 2–3 px outside the bones (highlight outline at "dinosaurs"). */
export function dinoRing() {
  const w = 104 + 2, h = 62 + 2, mk = new Canvas(w, h, "#000000"), mm = Object.create(mk); mm.px = (x, y, col) => mk.px(x + 1, y + 1, col); dinoDraw(mm);
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mk.d[(y * w + x) * 3] > 0, near = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (on(x + i, y + j)) return true; return false; };
  const ring = [];
  for (let y = -3; y < h + 3; y++) for (let x = -3; x < w + 3; x++) if (!near(x, y, 1) && near(x, y, 3)) ring.push([6 + x - 1, 1272 + y - 1, near(x, y, 2) ? 1 : 0]);
  return ring;
}
function ammonite(g, x, y, r) {
  const steps = 160;
  for (let i = 0; i < steps; i++) { const a = (i / steps) * Math.PI * 5.2, rr = r * Math.exp(-a * 0.16); g.px(R(x + Math.cos(a) * rr), R(y + Math.sin(a) * rr), i % 9 < 2 ? "#5A4636" : "#E2D2B0"); }
  g.ering(x, y, r + 1, r + 1, "#3A2A24"); g.px(x, y, "#3A2A24");
}
/** Fossil human skull (dive copy only) with a flint hand-axe beside it. */
function humanSkull(g, x, y) {
  const rows = [
    "......#######.......",
    "....##hhhhhhh##.....",
    "...#hhhbbbbbbbb#....",
    "..#hhbbbbbbbbbbb#...",
    ".#hbbbbbbbbbbbbbb#..",
    ".#hbbbbbbbbbbbbbbs#.",
    "#hbbbbbbbbbbbbbbbs#.",
    "#bbbb###bbbb###bbs#.",
    "#bbb#ddd#bb#ddd#bs#.",
    "#bbb#ddd#bb#ddd#bs#.",
    "#sbbb###bbbb###bbs#.",
    ".#sbbbbbb#d#bbbbs#..",
    "..#sbbbbb###bbbs#...",
    "...#sbbbbbbbbbs#....",
    "....#w#w#w#w#w#.....",
    ".....#########......",
  ];
  const S2 = (ox, oy, rws, map) => rws.forEach((row, j) => [...row].forEach((ch, i) => { const col = map[ch]; if (col) g.rect(ox + i * 2, oy + j * 2, 2, 2, col); }));
  S2(x - 20, y - 4, rows, { "#": "#3A2A24", h: "#FFF6DE", b: "#E6DABA", s: "#B8A684", d: "#4A3A30", w: "#FFFFFF" });
  // hand-axe (flint, faceted teardrop)
  const axe = ["...##...", "..#lm#..", ".#lmmd#.", ".#lmmd#.", "#lmmmdd#", "#lmmddd#", ".#mmdd#.", "..####.."];
  S2(x + 26, y + 6, axe, { "#": "#1E1A2A", l: "#B8C4D8", m: "#7E8AA8", d: "#56607E" });
}

// ---------------------------------------------------------------- deep floor (y ≈ 1800): a sand bed over the strata, x 0..540
export function floorY(x) {
  let y = 1800 - R(26 * sm(150 - x, 0, 64)) - R(22 * sm(x, 430, 510));
  const far = sm(Math.abs(x - 270), 40, 80);
  y += R((1.6 * Math.sin(x * 0.05) + 0.8 * Math.sin(x * 0.13 + 1)) * far);
  if (x % 15 >= 6 && x % 15 <= 9 && far > 0.5) y -= 1;                         // sand ripples
  return y;
}
const SAND_T = 34;
/** Sand of a bed whose surface is at fy, pixel depth d = y − fy (shared look with the shore). */
export function sandPx(x, y, d, wet = false) {
  if (d === 0) return SAND.lip; if (d < 3) return SAND.top;
  if (d < 10) return (d - 3) / 7 > bayer(x, y) ? SAND.mid : SAND.top;
  const band = (y + R(Math.sin(x * 0.045 + y * 0.01) * 3)) % 13;
  let col = band === 0 ? SAND.low : SAND.mid;
  if (d > SAND_T - 9) col = (d - (SAND_T - 9)) / 9 > bayer(x, y) ? SAND.low : col;
  const q = rnd(x * 97 + y * 31); if (q < 0.03) col = SAND.low; else if (q > 0.985) col = SAND.lip;
  return col;
}
export function bedPx(x, y, fy) {
  const d = y - fy, wave = R(2 * Math.sin(x * 0.06) + Math.sin(x * 0.17));
  if (d < SAND_T + wave) return sandPx(x, y, d);
  if (d === SAND_T + wave) return DARK;
  return mix(texel(LAYERS.at(y), x, y), "#1C1424", 0.22);
}
export function buildFloor() {
  const K = makeCache(0, 1720, 540, 440), g = K.g;
  for (let x = 0; x < 540; x++) { const fy = floorY(x); for (let y = fy; y < 2160; y++) g.px(x, y, bedPx(x, y, fy)); }
  pebbles(g, LAYERS, 0, 540, 1840, 2160, (x, y) => y > floorY(x) + SAND_T + 4);
  // half-buried pebbles sitting on the surface (left talus = cliff rubble)
  const peb = [[112, 7, "#9C7A62"], [128, 5, "#7C8C88"], [146, 4, "#B47A52"], [96, 6, "#8E7C6C"], [196, 4, "#8A8098"], [352, 5, "#9A90A8"], [372, 3, "#B4A494"], [440, 4, "#8A8098"], [478, 7, "#7C7488"], [500, 5, "#9A90A8"], [16, 8, "#A48496"], [58, 6, "#CDA673"]];
  for (const [x, r, base] of peb) { const fy = floorY(x); stamp(g, R(x - r * 1.5), fy - r + 1, R(r * 3), r + 2, (m) => m.ellipse(R(r * 1.5), r, R(r * 1.5), r, "#fff"), { base, light: mix(base, "#FFFFFF", 0.35), shade: mix(base, "#1C1424", 0.3), outline: "#2A2030" }); }
  // shells on the sand, and two fossil shells in the bed below
  scallop(g, 330, floorY(330) - 1, "#F4B8C8");
  spiral(g, 196, floorY(196) - 1);
  scallop(g, 470, floorY(470) - 1, "#F8D8A8");
  for (const [ax, ay, r] of [[90, 1930, 7], [404, 2010, 8], [250, 2090, 6]]) ammonite(g, ax, ay, r);
  // a starfish and a purple sea urchin on the sand
  { const x = 207, y = floorY(207) - 1, r = 8; stamp(g, x - r, y - r - 3, r * 2, r * 2, (m) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; p.push([r + Math.cos(a) * rr, r + Math.sin(a) * rr * 0.9]); } m.poly(p, "#fff"); }, { base: "#F59A3A", light: "#FFD08A", shade: "#B85A1A", outline: "#4A1A08" }); for (const [dx, dy] of [[0, -6], [-4, -2], [4, -2], [-2, 3], [2, 3]]) g.px(x + dx, y - r + 6 + dy, "#FFE0A0"); }
  { const x = 498, y = floorY(498); for (let k = 0; k < 18; k++) { const a = Math.PI + (k / 17) * Math.PI; g.line(x, y - 5, R(x + Math.cos(a) * 11), R(y - 5 + Math.sin(a) * 10), k % 2 ? "#7A4AB0" : "#5A2E8A"); } stamp(g, x - 7, y - 9, 14, 9, (m) => m.ellipse(7, 7, 7, 6, "#fff"), { base: "#8A5AC8", light: "#C8A0F0", shade: "#5A2E8A", outline: "#24103A" }); }
  tintCache(K, -0.12);
  return K;
}
function scallop(g, x, y, col) {
  stamp(g, x - 8, y - 9, 16, 10, (m) => { for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; m.line(8, 9, R(8 + Math.cos(a) * 8), R(9 + Math.sin(a) * 9), "#fff"); } m.rect(6, 8, 5, 2, "#fff"); },
    { base: col, light: mix(col, "#FFFFFF", 0.45), shade: mix(col, "#5A2030", 0.35), outline: "#4A2030", fill: (X, Y, top) => top ? mix(col, "#FFFFFF", 0.45) : (X - x) % 3 === 0 ? mix(col, "#8A3050", 0.3) : col });
}
function spiral(g, x, y) {
  stamp(g, x - 7, y - 10, 14, 10, (m) => { m.poly([[0, 10], [3, 3], [8, 0], [12, 3], [14, 10]], "#fff"); }, { base: "#E8C890", light: "#FFF0D0", shade: "#B08A5A", outline: "#4A3020", fill: (X, Y, top) => top ? "#FFF0D0" : (X + Y) % 5 === 0 ? "#B08A5A" : "#E8C890" });
}

// ---------------------------------------------------------------- shelf drop-off on the right (x ≈ 470..540, y 300..1800)
// Its sandy shoulder continues the shore slope (surface y = 300 at x = 540, rising 1.36 px per px to the right).
const SHELF_E = (() => {
  const a = new Int16Array(1900);
  for (let y = 0; y < 1900; y++) {
    let x;
    if (y < 300) x = 541;
    else if (y < 352) x = R(540 - (y - 300) / 1.36);
    else if (y < 430) { const k = (y - 352) / 78; x = R(502 - 12 * Math.sin((k * Math.PI) / 2)); }
    else { const L = LAYERS.at(y); x = 490 + R(5 * Math.sin(y * 0.021) + 3 * Math.sin(y * 0.063 + 1)) - (L?.jut ?? 6) + R(1.2 * Math.sin(y * 0.41) + (rnd(Math.floor(y / 3) * 23) - 0.5) * 2); x -= R(30 * sm(y, 1640, 1790)); }
    a[y] = x;
  }
  return a;
})();
export const shelfEdge = (y) => (y < 0 ? 541 : y >= 1900 ? 460 : SHELF_E[y]);
export const slopeTop = (x) => 300 + (540 - x) * 1.36;      // the shore slope line (world), continued under the shelf shoulder
export function buildShelf(night = false) {
  const K = makeCache(440, 290, 100, 1560), g = K.g;
  drawWall(g, { at: (y) => LAYERS.at(y) }, shelfEdge, "R", 300, 1840, 540, (x, y) => y < slopeTop(x));
  // sand cap on the shoulder (same sand bed as the shore)
  for (let x = 470; x < 540; x++) { const st = slopeTop(x); for (let y = Math.ceil(st); y < st + SAND_T + 2 && y < 470; y++) { if (x < shelfEdge(y)) continue; const d = y - Math.ceil(st), col = d === 0 || x === shelfEdge(y) ? (d === 0 ? SAND.lip : DARK) : sandPx(x, y, d); g.px(x, y, col); } }
  for (let x = 470; x < 540; x++) { const st = Math.ceil(slopeTop(x)); if (x >= shelfEdge(st)) g.px(x, st - 1, DARK); }
  pebbles(g, LAYERS, 470, 540, 420, 1840, (x, y) => x > shelfEdge(y) + 3);
  tintCache(K, 0, night);
  return K;
}

// ---------------------------------------------------------------- reef rock (top y ≈ 490, x 110..450), wedged against the cliff
export const REEF_TOP = 490;
const REEF_POLY = smooth([[60, 474], [120, 481], [180, 487], [240, 490], [300, 491], [360, 489], [408, 486], [434, 491], [450, 506], [453, 526], [444, 546], [424, 560], [402, 572], [380, 590], [352, 598], [326, 604], [298, 620], [262, 636], [226, 650], [196, 676], [166, 706], [134, 744], [96, 796], [60, 760]], new Set(), 6);
const REEF_MASK = (() => {
  const m = new Canvas(420, 360, "#000000"); m.poly(REEF_POLY.map(([x, y]) => [x - 50, y - 460]), "#FFFFFF");
  const top = new Int16Array(540).fill(9999), under = new Int16Array(540).fill(-1);
  for (let x = 0; x < 420; x++) for (let y = 0; y < 360; y++) if (m.d[(y * 420 + x) * 3] > 0) { top[x + 50] = Math.min(top[x + 50], y + 460); under[x + 50] = Math.max(under[x + 50], y + 460); }
  return { top, under };
})();
export const reefTop = (x) => REEF_MASK.top[Math.max(0, Math.min(539, R(x)))];
export const reefUnder = (x) => REEF_MASK.under[Math.max(0, Math.min(539, R(x)))];
const STONE = ["#241A2C", "#3A2E44", "#54465C", "#706274", "#8C7E8C", "#AA9AA4", "#C8B8B8", "#E6D6CC"];
export function buildReef(night = false) {
  const K = makeCache(50, 440, 420, 380), g = K.g;
  drawPart(g, [REEF_POLY], { ramp: STONE, base: 3.6, gain: 2.0, slope: 2.6, thick: 34, light: [-0.35, -1], rimLit: 1.3, rimShade: 0.7, outline: "#1E1626", litOutline: "#3E3248" });
  const inside = (x, y) => y > reefTop(x) && y < reefUnder(x);
  // speckle texture + sunlit top band
  for (let x = 56; x < 456; x++) for (let y = reefTop(x) + 1; y < reefUnder(x); y++) {
    const q = rnd(x * 71 + y * 37), d = y - reefTop(x);
    if (d <= 2) g.px(x, y, d === 1 ? "#F4E4D4" : "#E6D6CC");
    else if (q < 0.04) g.px(x, y, mix(g.get(x, y), "#1E1626", 0.4)); else if (q > 0.975) g.px(x, y, mix(g.get(x, y), "#FFF4E0", 0.35));
  }
  // holes and crevices in the front face
  for (const [hx, hy, r] of [[230, 560, 5], [300, 548, 4], [180, 590, 6], [360, 540, 3], [150, 640, 5], [262, 600, 4], [404, 530, 3], [120, 700, 4]]) {
    if (!inside(hx, hy)) continue;
    g.ellipse(hx, hy, r + 1, R(r * 0.7), "#3A2E44"); g.ellipse(hx, hy, r, R(r * 0.55), "#1E1626"); g.rect(hx - r + 1, hy + R(r * 0.6), r * 2 - 1, 1, "#AA9AA4");
  }
  // encrusting coralline algae (pink / purple / green dithered patches)
  const patches = [[168, 500, 22, 8, "#F090B4"], [250, 520, 26, 9, "#C8A0E8"], [330, 512, 22, 8, "#F090B4"], [410, 520, 18, 10, "#9AD078"], [205, 548, 16, 7, "#9AD078"], [384, 552, 20, 6, "#C8A0E8"], [140, 610, 14, 12, "#F090B4"], [300, 590, 18, 8, "#F8B070"]];
  for (const [px, py, rx, ry, col] of patches) for (let y = py - ry; y <= py + ry; y++) for (let x = px - rx; x <= px + rx; x++) {
    const dd = ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2; if (dd > 1 || y <= reefTop(x) + 2 || y >= reefUnder(x) - 1 || y > reefTop(x) + 34) continue;
    if ((1 - dd) * 1.4 > bayer(x, y) + 0.2) g.px(x, y, ((x * 3 + y) & 7) === 0 ? mix(col, "#FFFFFF", 0.4) : col);
  }
  // things hanging under the overhang: little orange tube sponges and a purple soft coral
  for (const [hx, h, col] of [[250, 16, "#F59A3A"], [262, 10, "#F59A3A"], [338, 12, "#C890F0"], [190, 14, "#F07AA0"], [410, 9, "#F59A3A"]]) {
    const uy = reefUnder(hx); stamp(g, hx - 3, uy - 1, 6, h, (m) => { m.rect(0, 0, 6, h - 2, "#fff"); m.rect(1, h - 2, 4, 2, "#fff"); }, { base: col, light: mix(col, "#FFFFFF", 0.4), shade: mix(col, "#2A1020", 0.4), outline: "#1E1626" });
    g.rect(hx - 1, uy + h - 3, 2, 1, "#2A1020");
  }
  // static corals on the rock top: brain coral, staghorn, plate coral, tube sponges
  brainCoral(g, 214, reefTop(214), 9, "#B8C860");
  staghorn(g, 330, reefTop(330), "#F59A5A", 0.6);
  plateCoral(g, 438, 528, "#C8A0E8");
  tubes(g, 444, reefTop(444) + 2, "#9A70D8");
  staghorn(g, 112, reefTop(112) + 2, "#F07AA0", 0.75);
  tintCache(K, -0.04, night);
  return K;
}
function brainCoral(g, x, y, r, col) {
  stamp(g, x - r, y - r, r * 2, r + 1, (m) => m.ellipse(r, r, r, r, "#fff"), { outline: "#2A2030", fill: (X, Y, top) => { const v = Math.sin((X - x) * 0.9 + Math.sin((Y - y) * 0.7) * 2); return top ? mix(col, "#FFFFFF", 0.4) : v > 0.55 ? mix(col, "#2A4020", 0.35) : (Y - (y - r)) / r > 0.7 ? mix(col, "#2A4020", 0.18) : col; } });
}
function staghorn(g, x, y, col, s = 1) {
  const branches = [[0, 0, -4, -26], [-4, -26, -12, -38], [-4, -26, 2, -40], [0, -10, 10, -24], [10, -24, 14, -34], [10, -24, 6, -32], [-2, -14, -12, -20]];
  stamp(g, x - 18, y - 44, 36, 46, (m) => { for (const [a, b, c2, d] of branches) { const p = [R(18 + a * s), R(44 + b * s)], q = [R(18 + c2 * s), R(44 + d * s)]; m.line(p[0], p[1], q[0], q[1], "#fff"); m.line(p[0] + 1, p[1], q[0] + 1, q[1], "#fff"); m.line(p[0] + 2, p[1], q[0] + 2, q[1], "#fff"); } },
    { base: col, light: mix(col, "#FFF4E0", 0.5), shade: mix(col, "#3A1020", 0.3), outline: "#3A1828", fill: (X, Y, top) => top ? mix(col, "#FFF4E0", 0.55) : (X & 1) ? col : mix(col, "#3A1020", 0.15) });
}
function plateCoral(g, x, y, col) { stamp(g, x - 16, y - 4, 26, 8, (m) => { m.ellipse(12, 3, 12, 3, "#fff"); }, { base: col, light: mix(col, "#FFFFFF", 0.45), shade: mix(col, "#2A1040", 0.35), outline: "#2A1838" }); }
function tubes(g, x, y, col) {
  for (const [dx, h, w] of [[-6, 22, 5], [0, 30, 6], [7, 18, 5]]) stamp(g, x + dx - w, y - h, w * 2, h, (m) => m.rect(0, 0, w * 2, h, "#fff"), {
    outline: "#2A1838", fill: (X, Y, top) => { const u = (X - (x + dx - w)) / (2 * w); return top ? "#2A1838" : Y - (y - h) < 2 ? mix(col, "#FFFFFF", 0.4) : u < 0.3 ? mix(col, "#FFFFFF", 0.25) : u > 0.75 ? mix(col, "#2A1040", 0.3) : col; } });
  for (const [dx, h, w] of [[-6, 22, 5], [0, 30, 6], [7, 18, 5]]) g.ellipse(x + dx, y - h + 1, w - 2, 1, "#2A1838");
}
