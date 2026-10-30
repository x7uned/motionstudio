// STREET art for «Fake buttons»: the New York corner at golden hour, painted ONCE into offscreen layers.
//   FAR   — hazy skyline silhouettes around the low sun (parallax 0.3 / 0.4), layer px (0,0) = screen FAR.at at the corner cam
//   MID   — closer towers with water tanks and lit windows (parallax 0.55 / 0.65)
//   NEAR  — the far side of the street (world px): tenements with fire escapes, a brownstone, a deli, a water tower, the
//           far sidewalk and the pedestrian signal pole (its lamps are live, street-props.mjs)
//   GROUND— road with the zebra crossing and stop lines, the front sidewalk (concrete flags), street furniture, the kerb
//   FORE  — the avenue's near lane at the very bottom (parallax 1.15)
// The sun sits at screen (120, 250) behind the skyline (the harness draws it); the buildings face us backlit: violet
// shade on the facades, warm rim light on the top/left edges, windows reflecting the warm sky, lit shop interiors.
// Illustration only: generic signs (DELI, PIZZA, CAFE, BAGELS, NEWS), no brands, no real buildings.
import { Layer, vgrad, hline, vline, thick, stext, shade, light, rnd, mix, bayer, hex, R, MAIN, TINY } from "./street-kit.mjs";
import { ZEBRA, PED_SIGNAL, BACKWALK } from "../timeline.mjs";

// ---------------------------------------------------------------- world bands (world y)
export const BASE = -92;                 // building base = back edge of the far sidewalk
export const FAR_WALK = [-92, -76];      // far sidewalk (BACKWALK −84 in its middle), kerb face −76..−74
export const ROAD_B = [-74, -18];        // road surface
export const LANE = { far: -54, near: -28 };   // car ground lines: far lane drives LEFT, near lane drives RIGHT
export const FRONT = [-18, 212];         // front sidewalk (the hero's feet at 0)
export const KERB = 212;                 // front kerb top; the avenue's near lane below (FORE)
export const FORE_P = 1.15;
export const X_MIN = -700, X_MAX = 20;   // painted world x range of the corner (the office building covers x ≥ −90; +110 px margin under it)
export const STOP = { near: ZEBRA.x0 - 16, far: ZEBRA.x1 + 16 };   // stop lines (front bumpers stop here)
export const POLE = { x: PED_SIGNAL.x, base: BACKWALK, top: PED_SIGNAL.y - 26 };

// ---------------------------------------------------------------- palette
const P = {
  ink: "#1A0E1C", rim: "#FFC27A", rim2: "#FF9E6A",
  glassTop: "#F7C59C", glassMid: "#C98A9C", glassLow: "#6E5888", glassDark: "#3E3050",
  litTop: "#FFE7A8", litLow: "#F0A85A",
  iron: "#1F2A2A", ironHi: "#4E5E5A", ironRim: "#D09A68",
};
const WALLS = {
  brick: { wall: "#9C5446", dark: "#7A3E38", light: "#B86C56", mortar: "#86483E", trim: "#D8C4AE", cornice: "#6A3A36" },
  slate: { wall: "#5E6684", dark: "#4A4F6C", light: "#7A82A0", mortar: "#545C78", trim: "#D4CCC4", cornice: "#3E4260" },
  brown: { wall: "#86584A", dark: "#6A4238", light: "#A26E58", mortar: "#764C40", trim: "#E2CDB2", cornice: "#583830" },
  cream: { wall: "#C8A88E", dark: "#A88A76", light: "#E2C4A6", mortar: "#B49680", trim: "#F2E2CC", cornice: "#8A6A5A" },
  red: { wall: "#A84A40", dark: "#843A36", light: "#C46452", mortar: "#923E38", trim: "#E8D2BA", cornice: "#6E2E2E" },
  olive: { wall: "#7E7458", dark: "#625A46", light: "#9A8E6C", mortar: "#6E664E", trim: "#E4D8BE", cornice: "#4E4636" },
};
// golden backlight: the facades face away from the sun → a violet shade over the albedo
const VIOLET = "#5A4878";
const lit = (c, k = 0.22) => mix(c, VIOLET, k);

// ---------------------------------------------------------------- facades
function brickTex(g, x0, y0, w, h, Wl, seed) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const row = Math.floor((y - y0) / 4), mort = (y - y0) % 4 === 3, vj = ((x - x0 + (row & 1) * 4) % 8) === 0;
    let col = Wl.wall; const r = rnd(x * 7 + y * 131 + seed);
    if (mort) col = bayer(x, y) > 0.35 ? Wl.mortar : Wl.wall; else if (vj && bayer(x, y) > 0.5) col = Wl.mortar;
    else if (r < 0.06) col = Wl.dark; else if (r > 0.96) col = Wl.light;
    g.px(x, y, lit(col));
  }
}
function stoneTex(g, x0, y0, w, h, Wl, seed) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const course = (y - y0) % 9 === 8, r = rnd(x * 13 + y * 71 + seed);
    let col = course ? Wl.mortar : r < 0.04 ? Wl.dark : r > 0.97 ? Wl.light : Wl.wall;
    g.px(x, y, lit(col));
  }
}
/** A window: frame, lintel and sill in trim, glass reflecting the warm sky (or a lit room / curtains / blinds). */
function windowAt(g, x, y, w, h, Wl, seed) {
  const v = rnd(seed), trim = lit(Wl.trim, 0.18);
  hline(g, x - 2, y - 3, w + 4, trim); hline(g, x - 1, y - 2, w + 2, lit(Wl.light, 0.3)); hline(g, x - 2, y - 1, w + 4, lit(Wl.dark, 0.25));   // lintel
  g.rect(x - 1, y, w + 2, h + 1, P.ink);                                                                                                     // frame
  if (v < 0.22) { vgrad(g, x, y, w, h, P.litTop, P.litLow, 3); if (v < 0.1) { g.rect(x + 1, y + h - 5, 3, 5, "#C47A3A"); g.rect(x + 1, y + h - 7, 3, 2, "#FFF4D0"); } }
  else if (v < 0.38) { vgrad(g, x, y, w, h, P.glassTop, P.glassLow, 3); g.rect(x, y, w, R(h * 0.45), mix("#C8605A", VIOLET, 0.25)); for (let i = 0; i < w; i += 2) g.px(x + i, y + R(h * 0.45), mix("#8A3A3A", VIOLET, 0.2)); }
  else if (v < 0.5) { vgrad(g, x, y, w, h, P.glassTop, P.glassLow, 3); for (let j = 1; j < R(h * 0.6); j += 2) hline(g, x, y + j, w, mix("#E8D8C8", VIOLET, 0.3)); }
  else { vgrad(g, x, y, w, h, P.glassTop, P.glassLow, 4); for (let k = 0; k < Math.min(w, h); k++) { const xx = x + 1 + k, yy = y + h - 3 - R(k * 1.4); if (yy >= y && xx < x + w) { g.px(xx, yy, "#FFF0DC"); if (xx + 1 < x + w) g.px(xx + 1, yy, "#FFD8C0"); } } }
  hline(g, x, y + R(h / 2), w, P.ink);                                                                                                        // sash bar
  hline(g, x - 2, y + h + 1, w + 4, trim); hline(g, x - 2, y + h + 2, w + 4, lit(Wl.dark, 0.3));                                              // sill
}
/** Fire escape over the given bay (x0..x1) from storey floor yTop down to yBottom, platforms every `step`. */
function fireEscape(g, x0, x1, yTop, yBottom, step, seed) {
  const plats = []; for (let y = yTop; y <= yBottom; y += step) plats.push(y);
  plats.forEach((py, i) => {
    hline(g, x0, py, x1 - x0, P.iron); hline(g, x0, py + 1, x1 - x0, P.ironHi); hline(g, x0, py - 1, x1 - x0, P.ironRim);
    hline(g, x0, py - 9, x1 - x0, P.iron); for (let x = x0; x < x1; x += 3) vline(g, x, py - 8, 8, P.iron); vline(g, x1 - 1, py - 9, 10, P.iron);
    for (let x = x0; x < x1; x += 3) g.px(x, py - 9, P.ironRim);
    // ladder down to the next platform (alternating direction)
    if (i < plats.length - 1) {
      const dir = i % 2 ? 1 : -1, lx0 = dir > 0 ? x0 + 4 : x1 - 6, lx1 = dir > 0 ? x1 - 10 : x0 + 8, ny = plats[i + 1];
      for (let k = 0; k <= 16; k++) { const u = k / 16, xx = R(lerp(lx0, lx1, u)), yy = R(lerp(py + 1, ny - 1, u)); g.px(xx, yy, P.iron); g.px(xx + 4, yy, P.iron); if (k % 3 === 0) hline(g, xx, yy, 5, P.ironHi); }
    }
  });
  // drop ladder hanging under the lowest platform
  const ly = plats[plats.length - 1], lx = x0 + R((x1 - x0) * 0.62);
  vline(g, lx, ly + 2, 14, P.iron); vline(g, lx + 4, ly + 2, 14, P.iron); for (let j = ly + 4; j < ly + 16; j += 3) hline(g, lx, j, 5, P.ironHi);
}
const lerp = (a, b, k) => a + (b - a) * k;
/** A storefront: awning with a word, glass with a warm lit interior, a door. */
function shopfront(g, x0, x1, y, h, awning, word, seed, Wl) {
  const w = x1 - x0;
  g.rect(x0, y, w, h, lit(Wl.cornice, 0.15));
  g.rect(x0 + 2, y + 2, w - 4, 4, lit("#2E2430", 0.1));                                                   // sign band
  vgrad(g, x0 + 3, y + 14, w - 6, h - 16, "#FFE6A4", "#E0904E", 4);                                           // lit interior
  for (let x = x0 + 3; x < x1 - 3; x += 14) vline(g, x, y + 14, h - 16, P.ink);                               // mullions
  hline(g, x0 + 3, y + 14 + R((h - 16) * 0.42), w - 6, mix(P.ink, "#E0904E", 0.3));
  // shelves / people silhouettes inside
  for (let k = 0; k < 3; k++) { const sx = x0 + 6 + R(rnd(seed + k) * (w - 16)); g.rect(sx, y + h - 9, 5, 7, "#9A5A3A"); g.disc(sx + 2, y + h - 12, 2, "#9A5A3A"); }
  const dx = x0 + R(w * 0.7); g.rect(dx, y + 12, 10, h - 12, P.ink); g.rect(dx + 1, y + 13, 8, h - 13, "#C8783E"); g.rect(dx + 2, y + 14, 6, R((h - 14) * 0.5), "#FFD890"); g.px(dx + 7, y + R(h * 0.6), "#FFF4C8");
  // awning (sloped, striped) with the word on its valance
  const [a1, a2] = awning, ay = y + 6;
  for (let j = 0; j < 9; j++) for (let x = x0 - 2 + R(j * 0.3); x < x1 + 2 - R(j * 0.3); x++) g.px(x, ay + j, Math.floor((x - x0) / 5) % 2 ? a2 : a1);
  hline(g, x0 - 2, ay, w + 4, light(a1, 0.5));
  g.rect(x0 - 2, ay + 9, w + 4, 7, a1); hline(g, x0 - 2, ay + 15, w + 4, shade(a1, 0.35));
  for (let x = x0 - 2; x < x1 + 2; x += 4) g.px(x, ay + 16, shade(a1, 0.35));
  if (word) { const tw = g.measure(TINY, word), tx = R((x0 + x1) / 2 - tw / 2); g.text(TINY, word, tx, ay + 10, "#FFF6E0"); }
}
/** One building on the far side of the street. */
function building(g, B) {
  const Wl = WALLS[B.mat], x0 = B.x0, x1 = B.x1, top = BASE - B.h, w = x1 - x0, GF = B.gf ?? 40, SH = B.sh ?? 30;
  (B.tex === "stone" ? stoneTex : brickTex)(g, x0, top, w, B.h, Wl, B.seed);
  // side return (depth) and the warm rim of the low sun behind (left/top edges)
  for (let y = top; y < BASE; y++) { g.px(x1 - 1, y, lit(Wl.dark, 0.35)); g.px(x1 - 2, y, lit(Wl.dark, 0.25)); g.px(x0, y, mix(lit(Wl.light), P.rim, 0.45)); }
  // storeys of windows
  const nS = Math.floor((B.h - GF - 12) / SH), nC = B.cols, pitch = w / nC, ww = B.winW ?? 10, wh = B.winH ?? 15;
  for (let s = 0; s < nS; s++) {
    const fy = BASE - GF - s * SH;                       // storey floor line
    hline(g, x0 + 1, fy, w - 3, lit(Wl.trim, 0.35));      // string course
    for (let k = 0; k < nC; k++) { const wx = R(x0 + pitch * (k + 0.5) - ww / 2); windowAt(g, wx, fy - SH + 9, ww, wh, Wl, B.seed * 31 + s * 7 + k); if (B.ac && rnd(B.seed + s * 5 + k * 3) < 0.25) { const ay = fy - SH + 9 + wh + 3; g.rect(wx + 1, ay, 8, 5, "#8A8C98"); g.rect(wx + 1, ay, 8, 1, "#C8CAD4"); for (let i = 2; i < 8; i += 2) g.px(wx + i, ay + 2, "#5A5C68"); } }
  }
  // cornice with brackets, sunlit top edge
  const cy = top; g.rect(x0 - 2, cy, w + 4, 7, lit(Wl.cornice, 0.12)); hline(g, x0 - 2, cy, w + 4, P.rim); hline(g, x0 - 2, cy + 1, w + 4, mix(Wl.trim, P.rim, 0.4));
  for (let x = x0; x < x1; x += 7) { g.rect(x, cy + 7, 3, 3, lit(Wl.cornice, 0.2)); g.px(x, cy + 7, mix(Wl.trim, VIOLET, 0.2)); }
  hline(g, x0 - 2, cy + 6, w + 4, P.ink);
  // fire escapes over chosen bays
  for (const [k0, k1] of B.fire ?? []) fireEscape(g, R(x0 + pitch * k0 + 2), R(x0 + pitch * (k1 + 1) - 2), BASE - GF - (nS - 1) * SH, BASE - GF, SH, B.seed);
  // ground floor
  const gy = BASE - GF;
  if (B.shop) shopfront(g, x0 + 2, x1 - 3, gy, GF, B.shop.awning, B.shop.word, B.seed, Wl);
  else if (B.stoop) {   // brownstone: raised door with a stoop on the left, a garden-level window
    g.rect(x0 + 1, gy, w - 3, GF, lit(Wl.dark, 0.1));
    const sx = x0 + 8; for (let k = 0; k < 6; k++) { g.rect(sx - k * 2, gy + 14 + k * 4, 22 + k * 2, 4, lit(Wl.trim, 0.25 + k * 0.03)); hline(g, sx - k * 2, gy + 14 + k * 4, 22 + k * 2, lit(Wl.light, 0.1)); }
    for (let k = 0; k < 6; k++) { g.px(sx - k * 2 - 1, gy + 12 + k * 4, P.iron); vline(g, sx - k * 2 - 1, gy + 12 + k * 4, 4, P.iron); }
    g.rect(sx + 4, gy - 4, 13, 18, P.ink); g.rect(sx + 5, gy - 3, 11, 17, "#6A3424"); g.rect(sx + 6, gy - 2, 4, 15, "#7E4430"); g.rect(sx + 11, gy - 2, 4, 15, "#7E4430"); g.px(sx + 14, gy + 6, "#FFD27A");
    g.rect(sx + 2, gy - 7, 17, 3, lit(Wl.trim, 0.15));
    windowAt(g, x1 - 26, gy + 16, 16, 12, Wl, B.seed + 999);
  }
  // roof furniture
  for (const r of B.roof ?? []) {
    if (r.kind === "tank") waterTower(g, r.x, top, r.s ?? 1);
    if (r.kind === "hut") { g.rect(r.x, top - 14, 22, 14, lit(Wl.dark, 0.2)); hline(g, r.x - 1, top - 15, 24, P.rim); g.rect(r.x + 4, top - 10, 7, 10, P.ink); }
    if (r.kind === "antenna") { vline(g, r.x, top - 26, 26, P.iron); hline(g, r.x - 4, top - 20, 9, P.iron); hline(g, r.x - 3, top - 14, 7, P.iron); g.px(r.x, top - 27, "#FF5A5A"); }
    if (r.kind === "vent") { g.rect(r.x, top - 6, 8, 6, "#6A6470"); hline(g, r.x, top - 6, 8, P.rim); }
  }
}
/** The classic wooden water tank on steel legs. */
function waterTower(g, cx, roofY, s = 1) {
  const tw = R(26 * s), th = R(30 * s), legs = R(14 * s), ty = roofY - legs - th, x0 = cx - (tw >> 1);
  for (const lx of [x0 + 2, x0 + tw - 3, x0 + R(tw * 0.35), x0 + R(tw * 0.65)]) vline(g, lx, ty + th, legs, P.iron);
  for (let k = 0; k < legs; k += 2) { g.px(x0 + 2 + R(k * 0.9), ty + th + k, P.iron); g.px(x0 + tw - 3 - R(k * 0.9), ty + th + k, P.iron); }
  hline(g, x0, ty + th, tw, P.iron);
  for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) { const plank = i % 4 === 0, edge = i < 2 ? 0.25 : i > tw - 4 ? 0.45 : 0.1; g.px(x0 + i, ty + j, mix(plank ? "#5E3C26" : "#7E5434", VIOLET, edge + 0.12)); }
  for (const by of [3, 11, 19, 26].map((v) => R(v * s))) { hline(g, x0, ty + by, tw, "#2E2626"); hline(g, x0, ty + by - 1, tw, "#6E5A50"); }
  for (let j = 0; j < th; j++) g.px(x0, ty + j, P.rim);
  // conical roof with a finial
  const rh = R(12 * s); for (let j = 0; j < rh; j++) { const half = R((tw / 2 + 2) * (j / rh)); hline(g, cx - half, ty - rh + j, half * 2 + 1, mix("#4A3A3A", VIOLET, 0.2)); g.px(cx - half, ty - rh + j, P.rim); }
  vline(g, cx, ty - rh - 4, 4, P.iron); g.px(cx, ty - rh - 5, P.rim);
}

// the far side of the street, left → right (world x); the office building starts at x −90 and covers anything beyond
export const BUILDINGS = [
  { x0: -700, x1: -560, h: 300, mat: "red", cols: 4, seed: 11, fire: [[1, 2]], ac: true, shop: { awning: ["#2E7A4A", "#F2EEE0"], word: "BAGELS" }, roof: [{ kind: "vent", x: -690 }] },
  { x0: -560, x1: -478, h: 190, mat: "cream", tex: "stone", cols: 3, seed: 12, shop: { awning: ["#C8343A", "#FFF0E0"], word: "PIZZA" }, roof: [{ kind: "antenna", x: -520 }] },
  { x0: -478, x1: -372, h: 152, mat: "brick", cols: 4, seed: 13, fire: [[0, 1]], ac: true, shop: { awning: ["#2A5A9A", "#F0F4FF"], word: "DELI" }, roof: [{ kind: "tank", x: -420, s: 1.15 }, { kind: "vent", x: -462 }] },
  { x0: -372, x1: -262, h: 336, mat: "slate", cols: 4, seed: 14, fire: [[2, 3]], ac: true, gf: 40, shop: { awning: ["#3A6A5A", "#E6F2EA"], word: "LAUNDRY" }, roof: [{ kind: "hut", x: -360 }, { kind: "antenna", x: -280 }] },
  { x0: -262, x1: -170, h: 214, mat: "brown", tex: "stone", cols: 3, seed: 15, stoop: true, gf: 44, roof: [{ kind: "tank", x: -200, s: 0.9 }] },
  { x0: -170, x1: 30, h: 168, mat: "olive", cols: 4, seed: 16, fire: [[0, 1]], shop: { awning: ["#8A2A4A", "#FBE8EE"], word: "CAFE" } },
];

// ---------------------------------------------------------------- NEAR: the far side + far sidewalk + signal pole (world layer)
export const NEAR = (() => {
  const top = BASE - 380, L = new Layer(X_MAX - X_MIN + 40, FAR_WALK[1] + 2 - top, X_MIN, top), g = L.g;
  for (const B of BUILDINGS) building(g, B);
  // far sidewalk: warm concrete lit by the low sun, joints, the kerb
  for (let y = FAR_WALK[0]; y < FAR_WALK[1]; y++) for (let x = X_MIN; x < X_MAX + 40; x++) { const j = (x - X_MIN) % 40 === 0 || y === FAR_WALK[0] + 7; g.px(x, y, j ? "#A48C80" : y < FAR_WALK[0] + 3 ? "#8A7276" : mix("#D2B49C", "#C4A48E", bayer(x, y) * ((y - FAR_WALK[0]) / 16))); }
  hline(g, X_MIN, FAR_WALK[1] - 1, X_MAX - X_MIN + 40, "#EAD2B8");
  // building shadow line at the base
  for (let x = X_MIN; x < X_MAX + 40; x++) { g.px(x, FAR_WALK[0], "#5A4458"); if (bayer(x, 0) > 0.5) g.px(x, FAR_WALK[0] + 1, "#7A6066"); }
  // the pedestrian signal's pole (head + lamps are live), a fire-alarm post and a street sign
  const px = POLE.x;
  g.rect(px - 2, POLE.top, 5, POLE.base - POLE.top, "#2A3434"); vline(g, px - 2, POLE.top, POLE.base - POLE.top, P.ironRim); vline(g, px + 2, POLE.top, POLE.base - POLE.top, "#1A2222");
  g.rect(px - 4, POLE.base - 6, 9, 6, "#2A3434"); hline(g, px - 4, POLE.base - 6, 9, P.ironRim);
  // mast arm over the road with the car signal hanging from it (lamps live)
  for (let x = px + 2; x < px + 74; x++) { const y = POLE.top + 6 - R((x - px) * 0.06); g.px(x, y, "#2A3434"); g.px(x, y + 1, "#2A3434"); g.px(x, y - 1, P.ironRim); }
  // green street-name blade (generic name)
  g.rect(px - 22, POLE.top - 10, 44, 9, "#1E5A3A"); g.frame(px - 22, POLE.top - 10, 44, 9, "#E8F2E8"); g.text(TINY, "5 AVE", px - 10, POLE.top - 8, "#F2FAF2");
  return L;
})();
export const CAR_SIGNAL = { x: POLE.x + 70, y: POLE.top + 6 - R(70 * 0.06) + 2 };   // top of the hanging car signal (world)

// ---------------------------------------------------------------- GROUND: road, zebra, front sidewalk, furniture (world layer)
export const GROUND = (() => {
  const L = new Layer(X_MAX - X_MIN + 40, KERB + 12 - ROAD_B[0], X_MIN, ROAD_B[0]), g = L.g;
  // road: warm violet asphalt, glare toward the sun, lane marks
  for (let y = ROAD_B[0]; y < ROAD_B[1]; y++) for (let x = X_MIN; x < X_MAX + 40; x++) {
    const v = (y - ROAD_B[0]) / (ROAD_B[1] - ROAD_B[0]), glare = Math.max(0, 1 - Math.abs(x + 440) / 160) * (1 - v) * 0.55, r = rnd(x * 3 + y * 977);
    let col = mix(mix("#5C4E62", "#4A3E52", v), "#C88A7A", glare * (bayer(x, y) > 0.3 ? 1 : 0.7));
    if (r < 0.05) col = mix(col, "#2E2636", 0.5); else if (r > 0.97) col = mix(col, "#8A7A8A", 0.5);
    g.px(x, y, col);
  }
  for (let x = X_MIN; x < X_MAX + 40; x++) { g.px(x, ROAD_B[0], "#3A2E3E"); g.px(x, ROAD_B[0] + 1, "#463848"); }   // far kerb's shadow on the road
  for (const y of [-48, -45]) for (let x = X_MIN; x < X_MAX + 40; x++) if (x < ZEBRA.x0 - 22 || x > ZEBRA.x1 + 22) g.px(x, y, bayer(x, y) > 0.12 ? "#E8B840" : "#B88A30");
  // zebra crossing (piano keys) + stop lines, slightly worn
  for (let bx = ZEBRA.x0 + 4; bx + 11 <= ZEBRA.x1; bx += 20) for (let y = ROAD_B[0] + 3; y < ROAD_B[1] - 2; y++) for (let x = bx; x < bx + 11; x++) {
    const wear = rnd(x * 17 + y * 29) < 0.07; g.px(x, y, wear ? "#B8AEB0" : y < ROAD_B[0] + 6 ? "#D8CCCC" : x === bx ? "#F8F2EA" : "#EEE6DE");
  }
  for (let y = -44; y < ROAD_B[1] - 2; y++) for (let x = STOP.near - 5; x < STOP.near - 1; x++) g.px(x, y, "#EEE6DE");
  for (let y = ROAD_B[0] + 3; y < -49; y++) for (let x = STOP.far + 1; x < STOP.far + 5; x++) g.px(x, y, "#EEE6DE");
  // manhole cover
  { const mx = -250, my = -34; for (let j = -3; j <= 3; j++) for (let i = -9; i <= 9; i++) if ((i / 9.5) ** 2 + (j / 3.5) ** 2 <= 1) g.px(mx + i, my + j, (i + j) % 3 === 0 ? "#3A3040" : "#54485A"); hline(g, mx - 6, my - 3, 13, "#8A7A86"); }
  // front sidewalk: big concrete flags, warm sunlight, joints (rows widen toward us)
  const ROWS = [FRONT[0], -2, 22, 52, 90, 136, 190, KERB];
  for (let y = FRONT[0]; y < KERB; y++) {
    let ri = 0; while (ri < ROWS.length - 2 && y >= ROWS[ri + 1]) ri++;
    const r0 = ROWS[ri], r1 = ROWS[ri + 1], v = (y - FRONT[0]) / (KERB - FRONT[0]), joint = y === r0 && ri > 0, pitch = 60 + ri * 6, off = (ri % 2) * (pitch >> 1);
    for (let x = X_MIN; x < X_MAX + 40; x++) {
      const vj = ((x - X_MIN + off) % pitch) === 0, r = rnd(x * 5 + y * 313);
      let col = mix(mix("#DCC0A6", "#C2A894", v), "#E8CCB0", (y - r0) / Math.max(1, r1 - r0) < 0.15 ? 0.35 : 0);
      if (joint || vj) col = "#9C8478"; else if (r < 0.04) col = mix(col, "#A8907E", 0.6); else if (r > 0.985) col = "#F2DCC4";
      if (joint && bayer(x, y) > 0.7) col = "#B49A8A";
      g.px(x, y, col);
    }
  }
  for (let x = X_MIN; x < X_MAX + 40; x++) { g.px(x, FRONT[0], "#F2DCC2"); g.px(x, FRONT[0] + 1, "#E6CCB2"); }       // back kerb edge (lit)
  // long shadows of the buildings' gaps (soft bands falling toward us from the far side's light)
  // front kerb (granite) and gutter
  for (let x = X_MIN; x < X_MAX + 40; x++) { for (let y = KERB; y < KERB + 4; y++) g.px(x, y, y === KERB ? "#F4E2CC" : "#C8B4A4"); for (let y = KERB + 4; y < KERB + 10; y++) g.px(x, y, y < KERB + 7 ? "#7A6A6E" : "#5A4C58"); }
  // street furniture at the front of the sidewalk
  poleShadows(g); hydrant(g, -508, 196); newsBox(g, -432, 186); bikeRack(g, -150, 192); litterBasket(g, -560, 176); subwayGrate(g, -318, 150);
  return L;
})();
function hydrant(g, x, y) {
  const red = "#C8343A", dk = "#8A2230", hi = "#F07A6A";
  g.rect(x - 9, y - 3, 19, 4, "#5A4A50"); g.rect(x - 7, y - 28, 15, 26, P.ink); g.rect(x - 6, y - 27, 13, 25, red); vline(g, x - 5, y - 27, 25, hi); vline(g, x + 5, y - 27, 25, dk);
  g.rect(x - 8, y - 31, 17, 4, P.ink); g.rect(x - 7, y - 30, 15, 2, red); g.rect(x - 4, y - 36, 9, 6, P.ink); g.rect(x - 3, y - 35, 7, 5, red); g.px(x - 2, y - 35, hi); g.rect(x - 1, y - 38, 3, 2, P.ink);
  g.rect(x - 12, y - 20, 6, 6, P.ink); g.rect(x - 11, y - 19, 4, 4, dk); g.rect(x + 7, y - 20, 6, 6, P.ink); g.rect(x + 8, y - 19, 4, 4, dk);
  g.rect(x - 2, y - 18, 5, 5, P.ink); g.rect(x - 1, y - 17, 3, 3, "#E8E0D8");
}
function newsBox(g, x, y) {
  g.rect(x - 12, y - 36, 25, 36, P.ink); g.rect(x - 11, y - 35, 23, 34, "#2A5AB0"); vline(g, x - 10, y - 35, 34, "#5A8AE0"); vline(g, x + 11, y - 35, 34, "#1A3A80");
  g.rect(x - 9, y - 31, 19, 12, "#E8EEF4"); for (let j = 0; j < 3; j++) hline(g, x - 7, y - 29 + j * 3, 15, "#8A96A8"); g.rect(x - 7, y - 30, 7, 5, "#3A4458");
  g.rect(x - 11, y - 39, 23, 4, P.ink); g.rect(x - 10, y - 38, 21, 2, "#E8C840"); g.text(TINY, "NEWS", x - 7, y - 16, "#FFF2C8");
  vline(g, x - 9, y, 3, P.ink); vline(g, x + 9, y, 3, P.ink);
}
function bikeRack(g, x, y) {
  for (let k = 0; k < 3; k++) { const bx = x + k * 18; for (let a = 0; a <= 20; a++) { const an = Math.PI * (a / 20), px = R(bx + 7 - Math.cos(an) * 7), py = R(y - 18 - Math.sin(an) * 7); g.px(px, py, "#3A3A48"); g.px(px, py - 1, "#B8B4C4"); } vline(g, bx, y - 18, 18, "#3A3A48"); vline(g, bx + 14, y - 18, 18, "#3A3A48"); vline(g, bx + 1, y - 18, 18, "#8A86A0"); vline(g, bx + 15, y - 18, 18, "#8A86A0"); }
}
function litterBasket(g, x, y) {
  g.rect(x - 9, y - 30, 19, 30, P.ink); for (let j = 0; j < 28; j++) for (let i = 0; i < 17; i++) g.px(x - 8 + i, y - 29 + j, (i + j) % 3 === 0 ? "#1E4A30" : (i - j + 30) % 3 === 0 ? "#2E6A44" : "#3E8A58");
  hline(g, x - 9, y - 30, 19, "#7ABA88"); hline(g, x - 9, y - 1, 19, "#1A3A26");
}
function subwayGrate(g, x, y) {
  g.rect(x - 34, y - 6, 68, 12, "#4A3E44"); hline(g, x - 34, y - 6, 68, "#8A7A78"); hline(g, x - 34, y + 5, 68, "#2E262C");
  for (let i = -32; i < 32; i += 3) vline(g, x + i, y - 5, 10, "#241C24");
  for (let i = -32; i < 32; i += 3) g.px(x + i + 1, y - 5, "#A89890");
}
/** Long golden-hour shadows of the push-button pole and the cabinet (the low sun is behind: they fall toward us, right). */
function poleShadows(g) {
  const sh = (x, y, k) => { if (!g.has(x, y) || k <= bayer(x, y)) return; g.tintPx(x, y, "#6A4A5A", 0.42); };
  for (let d = 0; d < 120; d++) { const k = 0.9 * (1 - d / 130), x = -270 + R(d * 0.38), y = -4 + d; for (let w = -1; w <= 1; w++) sh(x + w, y, k); }
  for (let d = 0; d < 70; d++) { const k = 0.85 * (1 - d / 80), x0 = -226 + R(d * 0.38), y = -6 + d; for (let x = x0; x < x0 + 52; x++) sh(x, y, k); }
}

// ---------------------------------------------------------------- FORE: the avenue's near lane at the very bottom (parallax 1.15)
// layer x = world x at the corner cam (cx −300) for parallax 1; screen x = 270 + (lx − cx) · FORE_P
export const FORE = (() => {
  const y0 = KERB + 10, h = 160, L = new Layer(1400, h, -1100, y0), g = L.g;
  for (let y = y0; y < y0 + h; y++) for (let x = -1100; x < 300; x++) {
    const v = (y - y0) / h, r = rnd(x * 11 + y * 401);
    let col = mix("#5A4C60", "#3E3448", v); if (r < 0.05) col = mix(col, "#2A2232", 0.5); else if (r > 0.975) col = mix(col, "#8A7C8C", 0.5);
    if (y < y0 + 3) col = "#3A2E40";
    g.px(x, y, col);
  }
  for (let x = -1100; x < 300; x++) if (((x % 48) + 48) % 48 < 26) for (let y = y0 + 64; y < y0 + 67; y++) g.px(x, y, "#E8E0D6");
  for (let k = 0; k < 6; k++) { const gx = -1060 + k * 230; g.rect(gx, y0 + 3, 26, 5, "#2A2230"); for (let i = 1; i < 26; i += 3) vline(g, gx + i, y0 + 4, 3, "#6A5E6E"); }
  return L;
})();

// ---------------------------------------------------------------- MID and FAR skyline (parallax), baked for the corner camera
export const MID_P = [0.55, 0.65], FAR_P = [0.3, 0.4];
export const MID = (() => {
  const L = new Layer(1500, 820, 0, 0), g = L.g, at = [-420, 190];   // layer px (0,0) at screen `at` for the corner cam
  let x = 0, i = 0;
  while (x < 1500) {
    const w = 34 + R(rnd(i * 7 + 1) * 46), topS = 236 + R(rnd(i * 13 + 2) * 120), y = topS - at[1], sx = x + at[0];
    // bodies: dark violet-brown, warm rim on the left edge and on top (sun behind)
    const base = mix("#6E4668", "#5E3E62", rnd(i * 3)), rim = mix("#F2A07A", "#FFD08A", rnd(i * 5));
    for (let yy = y; yy < 820; yy++) for (let xx = x; xx < Math.min(1500, x + w); xx++) {
      const sun = Math.max(0, 1 - Math.hypot(xx + at[0] - 120, yy + at[1] - 250) / 190);
      let col = mix(base, "#B86A80", sun * 0.6);
      if (xx === x || xx === x + 1 && bayer(xx, yy) > 0.5) col = mix(rim, base, 0.25 + 0.5 * (1 - sun));
      if (yy === y) col = rim;
      // window grid: tiny 2×3 cells, some lit
      const wx = (xx - x - 4) % 6, wy = (yy - y - 6) % 8;
      if (xx > x + 3 && xx < x + w - 3 && yy > y + 5 && wx >= 0 && wx < 2 && wy >= 0 && wy < 3) { const r = rnd(Math.floor((xx - x) / 6) * 97 + Math.floor((yy - y) / 8) * 131 + i * 7); col = r < 0.13 ? (wy === 0 ? "#FFE6A0" : "#F6B860") : mix(base, "#3A2246", 0.45); }
      g.px(xx, yy, col);
    }
    // roofs: a water tank, a stepped crown or an antenna
    const kind = rnd(i * 17 + 3);
    if (kind < 0.3) { const cx = x + R(w / 2), ty = y - 22; for (const lx of [cx - 8, cx + 7]) vline(g, lx, ty + 14, 9, "#3A2440"); for (let j = 0; j < 14; j++) hline(g, cx - 9, ty + j, 19, j < 1 ? rim : mix("#5E3E5A", "#7E5466", j / 14)); for (let j = 0; j < 7; j++) hline(g, cx - R(9 * j / 7) - 1, ty - 7 + j, R(18 * j / 7) + 3, j === 0 ? rim : "#4E344E"); }
    else if (kind < 0.55) { const sw = R(w * 0.6), sx2 = x + R((w - sw) / 2); for (let j = 0; j < 10; j++) hline(g, sx2, y - 10 + j, sw, j === 0 ? rim : base); vline(g, x + R(w / 2), y - 26, 16, "#3A2440"); }
    else if (kind < 0.7) { vline(g, x + R(w * 0.3), y - 18, 18, "#3A2440"); g.px(x + R(w * 0.3), y - 19, "#FF6A6A"); }
    x += w + (rnd(i * 23) < 0.25 ? 6 + R(rnd(i * 29) * 10) : 0); i++;
  }
  L.at = at; return L;
})();
export const FAR = (() => {
  const L = new Layer(1300, 780, 0, 0), g = L.g, at = [-380, 150];
  let x = 0, i = 0;
  while (x < 1300) {
    const w = 20 + R(rnd(i * 5 + 9) * 40), sx = x + at[0];
    // the one tall art-deco spire stands right of the sun (crossing its rim)
    const spire = Math.abs(sx - 178) < 20 && !L.spire;
    let topS = spire ? 182 : 200 + R(rnd(i * 11 + 4) * 110);
    if (Math.abs(sx + w / 2 - 110) < 70 && !spire) topS = Math.max(topS, 286 + R(rnd(i) * 30));   // keep most of the sun clear
    const y = topS - at[1];
    for (let yy = y; yy < 780; yy++) for (let xx = x; xx < Math.min(1300, x + w); xx++) {
      const sun = Math.max(0, 1 - Math.hypot(xx + at[0] - 120, yy + at[1] - 250) / 170), v = (yy - y) / 300;
      let col = mix(mix("#A2627E", "#BC7A86", Math.min(1, v)), "#F2B094", sun * 0.75);
      const wx = (xx - x - 3) % 4, wy = (yy - y - 5) % 6;
      if (xx > x + 2 && xx < x + w - 2 && yy > y + 4 && wx === 0 && wy === 0) col = rnd(xx * 7 + yy * 3) < 0.1 ? "#FFE2A8" : mix(col, "#7A4A6E", 0.35);
      if (xx === x) col = mix(col, "#FFD0A0", 0.35 + 0.4 * sun);
      g.px(xx, yy, col);
    }
    if (spire) {   // stepped crown + mast
      L.spire = true; const cx = x + R(w / 2);
      for (let k = 0; k < 4; k++) { const sw = R(w * (0.8 - k * 0.17)), yy = y - (k + 1) * 9; for (let j = 0; j < 9; j++) hline(g, cx - (sw >> 1), yy + j, sw, j === 0 ? "#FFD0A0" : "#A86680"); }
      vline(g, cx, y - 62, 26, "#8A5070"); vline(g, cx - 1, y - 48, 12, "#8A5070"); g.px(cx, y - 63, "#FF7A7A");
    } else if (rnd(i * 31) < 0.3) { vline(g, x + R(w * 0.5), y - 14, 14, "#9A5A78"); }
    x += w; i++;
  }
  L.at = at; return L;
})();
