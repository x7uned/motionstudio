// Static world of LV3 river (1080..1620, afternoon) and LV4 swamp (1620..2160, golden hour), painted once into one
// world-anchored layer and blitted per frame (each module clips the blit to its own range): the savanna's green bank
// sloping into a deep, muddy-green river (water down to the bottom of the frame), a grassy papyrus spit between the
// river and the swamp, a shallow golden swamp with the crocodile's mud hump and a muddy bottom, and a wet mud bank on
// the right that rises into the desert's dry sand at x 2160 (ground y = LAND at both outer edges). Far banks, far
// water bands (sky reflections, the sun's glitter path) and the underwater slopes are part of the layer.
import { LAND } from "../timeline.mjs";
import { blob, ell, bez, mix, bayer, rnd } from "../cute.mjs";
import { worldLayer, profile, thick, sm, lerp, R } from "./river-kit.mjs";

export const WX0 = 1040, WX1 = 2200, WY0 = -330, WY1 = 470;
// warmth: 0 = afternoon river look, 1 = golden swamp look (blends over the spit)
export const warm = (x) => sm(x, 1560, 1780);

// ---------------------------------------------------------------- ground (world y of the bank / bottom surface; y > 0 under water)
export const GROUND = profile([
  [WX0 - 40, LAND], [1110, LAND], [1128, -15], [1142, -6], [1152, 2], [1162, 34], [1172, 120], [1180, 260], [1188, 480],
  [1540, 480], [1554, 300], [1564, 160], [1575, 48], [1586, 6], [1598, -10], [1610, -18], [1622, LAND], [1640, -21], [1652, -14],
  [1662, -3], [1672, 8], [1688, 64], [1706, 150], [1726, 236], [1748, 292], [1762, 304], [1772, 270], [1780, 170], [1786, 70], [1791, 10],
  [1800, -26], [1812, -38], [1840, -41], [1890, -42], [1914, -40], [1924, -24], [1930, -6], [1935, 6], [1946, 80], [1960, 190], [1980, 270], [2010, 300], [2020, 286],
  [2030, 190], [2036, 90], [2040, 30], [2043, 2], [2050, -5], [2072, -11], [2104, -16], [2140, LAND], [WX1 + 40, LAND],
]);
export const SPIT = [1586, 1662];       // land between the river and the swamp (above the surface)
export const SHORE = 2042;              // the swamp's right water edge
export const HUMP = [1792, 1934];       // the croc's mud hump (above the surface)
// far banks across the water (world y of their top)
export const farLine = (x) => lerp(lerp(-46, -50, warm(x)) + Math.sin(x * 0.045) * 1.6 + Math.sin(x * 0.13) * 0.7, LAND - 4, sm(x, 2080, 2156));   // dips to the desert's horizon
const FAR_WATER = -34;                  // where the far bank meets the far water band

// ---------------------------------------------------------------- palettes (river → swamp by warmth)
const GRASS_R = ["#2E4A1C", "#4A6E28", "#6A9234", "#8EB444", "#B6D266"], GRASS_S = ["#3A4418", "#5E6820", "#8A8A2A", "#B8A63A", "#E2C45A"];
const grass = (x, i) => mix(GRASS_R[i], GRASS_S[i], warm(x));
const SOIL_R = ["#6A4428", "#5E3C24", "#74492A", "#563420", "#6C4428", "#7E5232"], SOIL_S = ["#7A4E26", "#6C4422", "#86582C", "#60391C", "#7A4C26", "#946232"];
/** Soil at world (wx, wy) with depth d below the local surface. */
function soil(wx, wy, d) {
  const wv = Math.sin(wx * 0.029) * 5 + Math.sin(wx * 0.12) * 2, v = (wy + wv + 400) / 19, band = Math.floor(v), f = v - band, i = ((band % 6) + 6) % 6;
  let col = mix(SOIL_R[i], SOIL_S[i], warm(wx));
  if (f < 0.1 && bayer(wx, wy) > 0.35) col = mix(col, "#2A1408", 0.3);
  if (wy > 60) col = mix(col, "#24140C", Math.min(0.4, (wy - 60) / 700));
  if (d > 6 && rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#F0D0A0", 0.45); else if (d > 6 && rnd(wx * 29 + wy * 17) < 0.006) col = mix(col, "#1A0C06", 0.5);
  return col;
}
// the desert's damp sand plane at the 2160 seam (ramp and depth curve copied from levels/desert-kit.mjs so the seam matches)
const MUD_PLANE = ["#E2B486", "#D8A478", "#CC946C", "#C08662", "#B47A5A", "#A86E52", "#9C644C", "#905A46", "#845242"];
function mudPlane(wx, wy) { const d = Math.max(0, wy - LAND), v = Math.min(MUD_PLANE.length - 1.001, Math.sqrt(d / 360) * (MUD_PLANE.length - 1.4)), lo = Math.floor(v), f = v - lo; return MUD_PLANE[Math.min(MUD_PLANE.length - 1, f > 0.5 + 0.42 * (bayer(wx, wy) - 0.5) ? lo + 1 : lo)]; }
const plane = (x) => sm(x, SHORE - 4, SHORE + 34);
// water tints of things under the surface (river: muddy green, swamp: golden olive)
export const UW_R = "#3E6A4A", UW_S = "#6A6A34";
export const uwCol = (x) => mix(UW_R, UW_S, warm(x));

// ---------------------------------------------------------------- the painter
function paint(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // far banks + far water bands (behind everything near)
  for (let wx = WX0; wx < WX1; wx++) {
    const w = warm(wx), top = R(farLine(wx));
    for (let wy = top; wy < FAR_WATER; wy++) { const d = wy - top; px(wx, wy, d < 1 ? mix("#DCE6A8", "#FFE09A", w) : d < 3 ? mix("#8EAA5A", "#C49A48", w) : d / 10 > bayer(wx, wy) ? mix("#5E7A3E", "#7A6232", w) : mix("#6E8A46", "#8E7038", w)); }
    // far water band: sky reflection, brighter toward the far bank, with soft horizontal streaks; the sun's glitter path
    for (let wy = FAR_WATER; wy < 0; wy++) {
      const v = (wy - FAR_WATER) / -FAR_WATER, row = wy - FAR_WATER, band = Math.sin(wx * (0.08 + row * 0.004) + row * 2.1);
      const a0 = mix("#E4F0F0", "#FFE2A8", w), a1 = mix("#B4D6DC", "#F2B478", w), a2 = mix("#8AB8C0", "#C88A64", w);
      let col = v < 0.3 ? a0 : v < 0.6 ? ((v - 0.3) / 0.3 > bayer(wx, wy) ? a1 : a0) : (v - 0.6) / 0.4 > bayer(wx, wy) ? a2 : a1;
      if (band > 0.84) col = mix(col, "#FFFFFF", 0.5); else if (band < -0.88) col = mix(col, mix("#5A8A9A", "#8A5A5A", w), 0.3);
      if (row === 0) col = mix("#4E6A34", "#6A5428", w);
      px(wx, wy, col);
    }
  }
  // far vegetation: papyrus / reed clumps along the far banks, acacias + a doum palm across the river, mangroves across the swamp
  for (let i = 0; i < 70; i++) { const wx = WX0 + rnd(i * 7 + 1) * (WX1 - WX0), top = farLine(wx), w = warm(wx), h = 5 + rnd(i * 3) * 11, col = mix("#4E6A30", "#5E5226", w), tip = mix("#B4B860", "#E8C060", w);
    for (let k = 0; k < h; k++) px(R(wx + Math.sin(k * 0.3 + i) * 0.6), R(top - k + 1), k > h - 3 ? tip : col);
    if (i % 3 === 0) for (let dx = -3; dx <= 3; dx++) px(R(wx + dx), R(top - h - Math.abs(dx) * 0.4), mix("#6E8A40", "#8A7A34", w)); }
  for (const [wx, h, wd] of [[1112, 52, 40], [1196, 34, 26], [1520, 46, 34], [1588, 30, 22]]) acacia(g, L(wx), T(farLine(wx) + 2), h, wd, "#4E5A3A", "#6E8048");
  doum(g, L(1470), T(farLine(1470) + 1), 64, "#46503A", "#5E6E3E");
  for (const [wx, h, wd] of [[1700, 40, 46], [1750, 30, 34], [2036, 44, 48], [2090, 34, 36]]) mangroveFar(g, L(wx), T(farLine(wx) + 2), h, wd);
  // the ground: grass on dry tops, mud at the waterline, tinted slopes and bottoms under water, strata below
  for (let wx = WX0; wx < WX1; wx++) {
    const gy = GROUND(wx), w = warm(wx), wetC = uwCol(wx), sand = sm(wx, 2090, 2150);
    for (let wy = Math.max(WY0, R(gy)); wy < WY1; wy++) {
      const d = wy - gy, b = bayer(wx, wy); let col = soil(wx, wy, d);
      if (gy > 2) {                                                             // under water: silt on top, darker mud below, water tint
        const silt = d < 2 ? mix("#A8A278", "#C8A86A", w) : d < 4 ? mix("#7E7656", "#94784A", w) : d < 9 ? mix("#5E5440", "#6A5236", w) : null;
        col = mix(silt ?? mix(col, "#2A1A10", 0.2), wetC, silt ? 0.4 : 0.5 + Math.min(0.2, Math.max(0, wy) / 900));
      } else if (wx > HUMP[0] - 10 && wx < HUMP[1] + 12) {                       // the croc's mud hump: wet glossy mud, a golden lit top
        col = d < 1 ? "#E8B868" : d < 3 ? (b > 0.5 ? "#B8803E" : "#C88E48") : d < 7 ? "#8A5A30" : d < 20 ? (d / 20 > b ? "#5E3C20" : "#704828") : mix(col, "#3A2414", 0.3);
        if (wy > -4 && wy < 4) col = mix(col, "#2A1A10", 0.35 + (wy + 4) * 0.04);  // wet dark band at the waterline
        if (wy >= 4) col = mix(soil(wx, wy, d), "#3A2A18", 0.25);                   // the mound's inside below the surface
      } else if (d < 2) col = sand > b ? (d < 1 ? "#F2D49A" : "#DDB476") : wx > SHORE - 4 ? (d < 1 ? "#B0864E" : "#8A6236") : (d < 1 ? grass(wx, 4) : grass(wx, 3));
      else if (d < 5 + Math.sin(wx * 0.37) * 1.5) col = sand > b ? "#C4965C" : wx > SHORE - 4 ? "#6E4A28" : grass(wx, 1);
      else if (wx > SHORE - 4 && d < 14) col = sand > b ? mix("#B08250", "#8A5E34", d / 14) : mix("#5A3A20", "#4A2E18", d / 14);
      if (gy <= 2 && wy > -5 && wy < 3 && !(wx > HUMP[0] - 10 && wx < HUMP[1] + 12)) col = mix(col, "#2A1A10", 0.32);   // wet line at the waterline
      // the swamp is seen through its murky water: everything below the surface there (the hump's flanks, the floor, the
      // banks' feet) is mud tinted by the water and darker with depth, not a cut-away soil column
      const sw = sm(wx, 1598, 1640) * (1 - sm(wx, 2060, 2090));
      if (sw > 0 && wy > 2 && sw > bayer(wx + 1, wy + 3) * 0.98) {
        const floor = gy > 2 && d < 3, base = floor ? "#A89A64" : d % 23 < 1 && bayer(wx, wy) > 0.5 ? "#4A3A22" : rnd(wx * 7 + wy * 3) < 0.03 ? "#7A6440" : "#5E4C30";
        col = mix(base, "#66845A", Math.min(0.9, (floor ? 0.4 : 0.5) + Math.max(0, wy) / 340));
      }
      const pk = plane(wx); if (pk > 0 && gy <= 2 && d >= 2 && pk > bayer(wx + 2, wy + 1) * 0.98) col = mudPlane(wx, wy);
      px(wx, wy, col);
    }
  }
  // pebbles and shells on the swamp bottom, a sunken log, stones buried in the banks, roots in the river walls
  for (let i = 0; i < 26; i++) { const wx = 1700 + rnd(i * 3 + 7) * 340, gy = GROUND(wx); if (gy < 40) continue; const k = rnd(i * 5 + 1), tint = (col) => mix(col, UW_S, 0.32);
    if (k < 0.55) { for (let dx = -2; dx <= 2; dx++) px(R(wx) + dx, R(gy) - (Math.abs(dx) < 2 ? 2 : 1), tint("#8A8070")); px(R(wx) - 1, R(gy) - 2, tint("#B4AA94")); }
    else if (k < 0.8) { px(R(wx), R(gy) - 1, tint("#E8D8C0")); px(R(wx) + 1, R(gy) - 1, tint("#F4E8D8")); px(R(wx), R(gy) - 2, tint("#D8C8B0")); }
    else { px(R(wx), R(gy) - 1, tint("#5A6A4A")); px(R(wx) + 1, R(gy) - 1, tint("#5A6A4A")); } }
  { const pts = bez([L(1726), T(268)], [L(1744), T(254)], [L(1760), T(262)], 16); thick(g, pts, 3, mix("#4A3424", UW_S, 0.35)); for (const [x, y] of pts.slice(2, 14)) g.px(R(x), R(y) - 2, mix("#7A5A3A", UW_S, 0.35)); }
  for (let i = 0; i < 14; i++) { const wx = WX0 + 10 + rnd(i * 7 + 3) * (WX1 - WX0 - 20), wy = Math.max(GROUND(wx) + 34, 40) + rnd(i * 5 + 2) * 300; if (wy > WY1 - 10) continue; const r = 3 + rnd(i) * 5, uw = GROUND(wx) > 2;
    blob(g, [ell(L(wx), T(wy), r * 1.4, r)], { ramp: ["#20181A", "#3A2C28", "#564236", "#705848", "#8A705A", "#A48A70", "#BCA488", "#D4BEA2"].map((c) => (uw ? mix(c, uwCol(wx), 0.3) : c)), thick: 4 }); }
  for (const [wx0, wy0, dir] of [[1180, 60, 1], [1214, 190, 1], [1548, 150, -1], [1576, 40, -1], [1690, 70, 1]]) {   // roots sticking out of the river walls
    const p = bez([L(wx0), T(wy0)], [L(wx0 + dir * 10), T(wy0 + 12)], [L(wx0 + dir * 16), T(wy0 + 30)], 10); for (const [x, y] of p) g.px(R(x), R(y), mix("#3A2A1A", uwCol(wx0), 0.3)); }
}
function acacia(g, x, y, h, w, col, lit) {
  const tr = Math.max(1, R(h / 30));
  for (const [dx, k] of [[-w * 0.3, 0.62], [w * 0.26, 0.7], [0, 0.5]]) thick(g, bez([x, y], [x + dx * 0.15, y - h * 0.45], [x + dx, y - h * k], 10), tr, col);
  const cy = y - h * 0.8;
  for (const [dx, dy, rx, ry] of [[0, 0, w, w * 0.15], [-w * 0.45, w * 0.05, w * 0.5, w * 0.12], [w * 0.5, w * 0.06, w * 0.48, w * 0.12], [w * 0.1, -w * 0.07, w * 0.6, w * 0.12]])
    for (let yy = R(cy + dy - ry); yy <= R(cy + dy + ry); yy++) for (let xx = R(x + dx - rx); xx <= R(x + dx + rx); xx++) { const d = ((xx - x - dx) / rx) ** 2 + ((yy - cy - dy) / ry) ** 2; if (d > 1 || ((xx * 7 + yy * 3) % 5 === 0 && d > 0.75)) continue; g.px(xx, yy, yy < cy + dy - ry * 0.4 ? lit : col); }
}
function doum(g, x, y, h, col, leaf) {
  const pts = bez([x, y], [x + 4, y - h * 0.55], [x - 2, y - h], 20); for (const [px0, py0] of pts) { g.px(R(px0), R(py0), col); g.px(R(px0) + 1, R(py0), mix(col, "#8A8A6A", 0.3)); }
  for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.08 + i * 0.105), len = 13 + (i % 3) * 4; for (let k = 0; k < len; k++) { const u = k / len; g.px(R(x - 2 + Math.cos(a) * k), R(y - h + Math.sin(a) * k + u * u * 7), leaf); } }
}
function mangroveFar(g, x, y, h, w) {   // far mangrove: a dark rounded canopy on stilt roots, warm rim on top
  for (let i = -3; i <= 3; i++) { const fx = x + i * w * 0.16; thick(g, bez([fx, y], [x + i * w * 0.06, y - h * 0.25], [x, y - h * 0.4], 8), 0, "#4A3A26"); }
  for (const [dx, dy, rx, ry] of [[0, -h * 0.72, w * 0.62, h * 0.3], [-w * 0.42, -h * 0.58, w * 0.36, h * 0.22], [w * 0.44, -h * 0.6, w * 0.34, h * 0.22], [w * 0.1, -h * 0.9, w * 0.36, h * 0.2]])
    for (let yy = R(y + dy - ry); yy <= R(y + dy + ry); yy++) for (let xx = R(x + dx - rx); xx <= R(x + dx + rx); xx++) { const d = ((xx - x - dx) / rx) ** 2 + ((yy - y - dy) / ry) ** 2; if (d > 1 || ((xx * 5 + yy * 3) % 7 === 0 && d > 0.7)) continue; g.px(xx, yy, yy < y + dy - ry * 0.5 ? "#9A8A40" : d > 0.6 && xx < x + dx ? "#4A4A24" : "#5E5A2C"); }
}

let LAYER = null;
/** The painted layer (built on first use, ~0.3 s). Blit with o.x0/o.x1 to clip to a module's own range. */
export const worldBack = () => (LAYER ??= worldLayer(WX0, WY0, WX1 - WX0, WY1 - WY0, paint));
