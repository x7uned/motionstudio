// Shore (x 540..1080), seen only while the camera pans from the octopus to the meadow (≈ EV.jar → EV.bees): dawn →
// morning. A sandy slope rises out of the sea: underwater at x 540 (y 300, continuing the shelf of the sea column),
// it reaches the waterline at x ≈ 760 and turns into a dry beach seen as a ground plane (like the meadow: light at
// the horizon line y = LAND, warmer in front), with shells, a driftwood log, a little crab and dune grass that turns
// into meadow grass at x = 1080. The ground is one static cache; waves, grass, crab and fish move periodically.
import { BIOME, LAND, SURFACE } from "../timeline.mjs";
import { drawWater } from "../world.mjs";
import { blob, ell, RAMP, fade } from "../cute.mjs";
import { makeCache, blit, stamp, tintAt, R, clamp01, sm, lerp, rnd, osc, ang, cyc, mix, bayer, hex, SAND } from "./sea-common.mjs";
import { slopeTop, sandPx, texel, LAYERS } from "./sea-terrain.mjs";
import { drawCrab, drawFish, drawGrass } from "./sea-life.mjs";
import { GRASS } from "./meadow-kit.mjs";

export const RANGE = BIOME.shore;
const X0 = RANGE[0], X1 = RANGE[1], WL = 760;            // waterline x
const SAND_T = 34;
// periodic motions (shared with levels/sea-motions.mjs): waves [n per END, phase], the crab's back-and-forth
export const SHORE_T = { waves: [[24, 0, 10], [31, 0.45, 16]], crab: { n: 7, ph: 0.6 } };
/** Ground surface line (world y) at x: the underwater slope (slightly concave), the waterline, then the beach at the land line. */
export function surf(x) {
  if (x <= WL) return slopeTop(x) + 16 * Math.sin((Math.PI * (x - X0)) / (WL - X0)) * sm(x, X0, X0 + 30) + (x % 13 >= 5 && x % 13 <= 8 && x > X0 + 20 ? -1 : 0);
  if (x <= 850) { const k = (x - WL) / 90; return lerp(slopeTop(WL), LAND, k * k * (3 - 2 * k)); }
  return LAND;
}
/** The water's edge on the beach plane: from the waterline point it sweeps toward the viewer (down-left). */
export const shoreX = (y) => WL + 6 - 170 * Math.pow(Math.max(0, y) / 860, 0.75) + 6 * Math.sin(y * 0.02);
// beach plane palette by perspective depth (light far → warm near), same spacing law as the meadow grass
const SANDP = ["#FCF2D8", "#F8E8C4", "#F2DCAE", "#ECD09A", "#E4C488", "#DAB67C", "#CEA870", "#C29A64", "#B48C5A"];
const pIdx = (d) => Math.min(SANDP.length - 1.001, Math.sqrt(Math.max(0, d) / 330) * 6.6);
const grassAt = (x, y, d) => { const v = Math.min(GRASS.length - 1.001, Math.sqrt(Math.max(0, d) / 330) * 6.6), lo = Math.floor(v); return GRASS[v - lo > 0.5 + 0.45 * (bayer(x, y) - 0.5) ? lo + 1 : lo]; };

function groundPx(x, y) {
  const s = surf(x), d = y - Math.ceil(s), dl = y - LAND;
  const v = pIdx(dl), lo = Math.floor(v);
  let plane = SANDP[v - lo > 0.5 + 0.45 * (bayer(x, y) - 0.5) ? lo + 1 : lo];
  // ripple marks across the beach, spaced wider toward the viewer
  const rp = Math.sqrt(Math.max(0, dl) + 30) * 2.2 + Math.sin(x * 0.045 + dl * 0.01) * 0.6;
  if (dl > 6 && rp % 1 < 0.08 + Math.min(0.06, dl / 6000)) plane = mix(plane, "#A07A50", 0.3);
  else if (dl > 6 && rp % 1 > 0.92) plane = mix(plane, "#FFFFFF", 0.35);
  if (d === 0) plane = "#FFF6DE"; else if (d === 1) plane = "#F6E2B4";
  const q = rnd(x * 97 + y * 31); if (d > 1 && q < 0.03) plane = mix(plane, "#8A6A40", 0.35); else if (d > 1 && q > 0.984) plane = "#FFFFFF";
  // the meadow seam: by x 1040 the sand becomes the meadow's sandy grass (it blends its first 40 px back into sand)
  const gk = sm(x, 930, 1040); if (gk > 0 && dl >= 0) plane = mix(plane, mix(grassAt(x, y, dl), "#E2D29A", 0.7 * (0.75 + 0.25 * bayer(x, y))), gk);
  let col = hex(plane);
  if (y >= 0) {
    // seabed seen through the water left of the water's edge; wet sand just beside it
    const e = shoreX(y), T = tintAt(y), under = 1 - sm(x, e - 26, e + 2), wet = sm(x, e - 4, e + 4) * (1 - sm(x, e + 6, e + 46));
    if (wet > 0) col = mix(col, "#B89064", 0.5 * wet);
    if (under > 0) col = mix(col, mix(T[0], "#2A8AB8", 0.3), (T[1] + 0.2) * under);
    // next to the sea column: the same strata + sand cap as its shelf, blended out over 100 px
    const kS = 1 - sm(x, X0, X0 + 100);
    if (kS > 0 && kS > bayer(x, y) * 0.98) { const dd = y - Math.ceil(slopeTop(x)); const sc = dd <= 0 ? SAND.lip : dd < SAND_T + 2 ? sandPx(x, y, dd) : texel(LAYERS.at(y), x, y); col = mix(sc, T[0], T[1]); }
  }
  return col;
}

let K = null;
function build() {
  const C = makeCache(X0, -140, X1 - X0, 1000), g = C.g;
  for (let x = X0; x < X1; x++) { const s = Math.ceil(surf(x)); for (let y = Math.max(-140, s); y < 860; y++) g.px(x, y, groundPx(x, y)); if (x > WL) g.px(x, s - 1, "#C89A64"); }
  // shells, pebbles and a starfish on the beach plane / slope (bigger in front)
  const items = [[858, 4, "scallop"], [868, 40, "spiral"], [930, 120, "scallop2"], [1000, 70, "pebble"], [880, 230, "pebble"], [960, 300, "scallop"], [820, 150, "pebble"], [1040, 200, "spiral"], [700, 200, "star"], [630, 330, "pebble"], [905, 380, "star2"]];
  for (const [x, y, k] of items) {
    const sy = Math.max(Math.ceil(surf(x)) + 2, y), s = 0.7 + (sy - LAND) / 260;
    if (k.startsWith("scallop")) { const col = k === "scallop" ? "#F4B8C8" : "#F8D8A8", w = R(8 * s), h = R(6 * s); stamp(g, x - w, sy - h, w * 2, h + 1, (m) => { for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; m.line(w, h, R(w + Math.cos(a) * w), R(h + Math.sin(a) * h), "#fff"); } }, { base: col, light: mix(col, "#FFFFFF", 0.5), shade: mix(col, "#5A2030", 0.35), outline: "#5A3030", fill: (X, Y, top) => top ? mix(col, "#FFFFFF", 0.5) : (X - x) % 3 === 0 ? mix(col, "#8A3050", 0.3) : col }); }
    else if (k === "spiral") { const w = R(6 * s), h = R(7 * s); stamp(g, x - w, sy - h, w * 2, h, (m) => m.poly([[0, h], [w * 0.5, h * 0.3], [w, 0], [w * 1.6, h * 0.35], [w * 2, h]], "#fff"), { base: "#E8C890", light: "#FFF0D0", shade: "#B08A5A", outline: "#5A3A20", fill: (X, Y, top) => top ? "#FFF0D0" : (X + Y) % 4 === 0 ? "#B08A5A" : "#E8C890" }); }
    else if (k === "pebble") { const r = R(3 * s) + 1, base = ["#A89A8C", "#8C8A9A", "#B4A08C"][x % 3]; stamp(g, x - r, sy - r, r * 2, r + 1, (m) => m.ellipse(r, r, r, r, "#fff"), { base, light: mix(base, "#FFFFFF", 0.4), shade: mix(base, "#2A2030", 0.3), outline: "#4A3A34" }); }
    else if (k.startsWith("star")) { const r = 7 * s, col = k === "star" ? "#F59A3A" : "#F07A8A"; stamp(g, R(x - r), R(sy - r * 1.8), R(r * 2), R(r * 2), (m) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; p.push([r + Math.cos(a) * rr, r + Math.sin(a) * rr]); } m.poly(p, "#fff"); }, { base: col, light: mix(col, "#FFF4D0", 0.5), shade: mix(col, "#5A1010", 0.3), outline: "#4A1A10" }); g.px(x, R(sy - r * 0.8), "#FFF4D0"); }
  }
  // driftwood log lying on the beach
  stamp(g, 884, 14, 70, 14, (m) => { m.poly([[2, 6], [10, 1], [60, 2], [68, 6], [64, 12], [8, 13]], "#fff"); m.line(46, 2, 54, -2, "#fff"); m.line(47, 2, 55, -2, "#fff"); }, {
    outline: "#3A2418", fill: (X, Y, top, bot) => top ? "#D8C0A0" : bot ? "#7A5E48" : (Y - 14) % 4 === 0 ? "#9C8068" : (X % 9 === 0 ? "#8A6E58" : "#B89C80") });
  g.ellipse(889, 21, 3, 4, "#7A5E48"); g.ellipse(889, 21, 1, 2, "#D8C0A0");
  // soft dune humps with marram grass toward the meadow (lit from the upper left, no outline)
  for (const [x, y, w, H] of [[968, 2, 42, 12], [1034, -6, 36, 10], [1004, 62, 50, 16], [900, -18, 30, 7]]) for (let X = x - w; X <= x + w; X++) {
    const u = (X - x) / w, h = H * Math.pow(Math.max(0, 1 - u * u), 1.5);
    for (let Y = R(y - h); Y <= y; Y++) { const k = (y - Y) / Math.max(1, h); let col = Y <= R(y - h) + 1 ? "#FFF8E4" : u < -0.2 ? "#FCEED0" : u > 0.35 ? ((u - 0.35) * 2.5 > bayer(X, Y) ? "#E2C48E" : "#F0DCB0") : "#F6E4C0"; if (k < 0.15 && u > 0) col = mix(col, "#C8A472", 0.35); g.px(X, Y, col); }
  }
  K = C;
}

// ---------------------------------------------------------------- module passes
const vis = (V) => V.X(X0) < 540 + 40 && V.X(X1) > -40;
export function fill(c, V, t) { if (!vis(V)) return; drawWater(c, V, t, X0, WL + 40, SURFACE); }
export function back(c, V, t) {
  if (!vis(V)) return; if (!K) build();
  blit(c, V, K);
  // the water's edge: foam lines that wash up over the wet sand and slide back (periodic waves)
  { const y0 = Math.max(0, V.y0), y1 = Math.min(860, V.y1);
    for (let k = 0; k < 2; k++) { const [wn, wph, wr] = SHORE_T.waves[k], ph = cyc(t, wn, wph), reach = Math.sin(Math.PI * ph) * wr, a = Math.min(1, Math.sin(Math.PI * ph) * 2.5);
      for (let y = Math.ceil(y0); y < y1; y++) { const xe = shoreX(y) + reach + Math.sin(y * 0.09 + ang(t, 40, k)) * 2, X = R(V.X(xe)), Y = R(V.Y(y)); if (X < 0 || X >= 540 || y < surf(xe)) continue; if (a > bayer(X, Y) * 0.9) { c.px(X, Y, "#FFFFFF"); c.px(X - 1, Y, "#DFFAFF"); if (k === 0) c.px(X - 2, Y, "#BFEFF4"); } } }
    // the waterline itself on the slope top
    for (let x = WL - 40; x <= WL + 8; x++) { const y = surf(x) - 1, X = R(V.X(x)), Y = R(V.Y(y)); if (X >= 0 && X < 540 && Y >= 0 && Y < 960 && (x + Math.floor(cyc(t, 90) * 6)) % 3) c.px(X, Y, "#F4FFFF"); } }
  // sea grass on the underwater slope
  for (const [x, n, h, ph] of [[580, 5, 30, 1], [640, 6, 24, 2], [700, 4, 18, 3]]) { const X = R(V.X(x)), Y = R(V.Y(surf(x) + 2)); if (X > -30 && X < 570 && Y > -10 && Y < 1000) drawGrass(c, X, Y, n, h, t, ph + 10, surf(x)); }
  // marram grass on the dunes and the back of the beach (sways in the morning breeze)
  for (const [x, y, h, n, ph] of [[952, 0, 26, 7, 1], [984, 2, 22, 5, 2], [1024, -6, 30, 8, 3], [1056, -10, 24, 6, 4], [990, 58, 34, 7, 5], [1020, 60, 28, 5, 6], [930, -16, 16, 4, 7], [880, -18, 12, 3, 8]]) marram(c, V, x, y, h, n, t, ph);
}
function marram(c, V, x, y, h, n, t, ph) {
  const X = V.X(x), Y = V.Y(y); if (X < -40 || X > 580 || Y < -10 || Y > 1000) return;
  const cols = ["#8A9A48", "#AABA5A", "#CCD478", "#6A7A38"];
  for (let i = 0; i < n; i++) {
    const bx = X + (i - (n - 1) / 2) * 3 + rnd(i * 5 + ph) * 2, hh = h * (0.65 + rnd(i * 3 + ph) * 0.45), lean = (i - (n - 1) / 2) * 0.12 + (rnd(i + ph) - 0.5) * 0.2;
    for (let s = 0; s < hh; s++) { const k = s / hh, px = bx + lean * s + Math.sin(ang(t, 19, ph + i * 0.6)) * 4 * k * k; c.px(R(px), R(Y - s), k > 0.75 ? cols[2] : k > 0.35 ? cols[1] : cols[0]); if (k < 0.5) c.px(R(px) + 1, R(Y - s), cols[3]); }
  }
}
export function actors(c, V, t) {
  if (!vis(V)) return;
  // a little crab scuttles sideways along the wet sand (back and forth, periodic)
  { const p = osc(t, SHORE_T.crab.n, SHORE_T.crab.ph), y = 30, x = shoreX(y) + 34 + p * 20, X = R(V.X(x)), Y = R(V.Y(y)); if (X > -30 && X < 570 && Y > 0 && Y < 990) drawCrab(c, X, Y, { t, up: 0.5 + 0.5 * osc(t, 31), s: 1.1, ramp: RAMP.coral }); }
  // two small fish in the shallows
  for (let i = 0; i < 2; i++) { const a = ang(t, 6 + i, i * 2), x = 640 + Math.cos(a) * 50, y = 130 + i * 40 + Math.sin(a * 2) * 10; if (y < surf(x) - 8) drawFish(c, R(V.X(x)), R(V.Y(y)), Math.max(-1, Math.min(1, -4 * Math.sin(a))), 12, i ? "teal" : "yellow", ang(t, 260, i)); }
}
export function front(c, V, t) {
  if (!vis(V)) return;
  // big foreground tufts low on the beach plane (closer = bigger)
  for (const [x, y, h, n, ph] of [[860, 420, 70, 9, 11], [1046, 470, 84, 11, 12], [950, 600, 96, 12, 13]]) marram(c, V, x, y, h, n, t, ph);
}
