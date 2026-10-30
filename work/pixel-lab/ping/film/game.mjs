// Ping film — GAME WORLD module (2026-10-22). A small desert-town corner (sandstone lane + cross corridor + blue doors)
// rendered (a) in first person by a heightfield raycaster and (b) as an oblique 3/4 top-down "server map".
// Everything is deterministic (integer hash, no Math.random) and every draw is a pure function of its parameters.
// No game/brand names or logos are drawn anywhere: the look is evoked only.
//
// drawFP(c, rect, clip, st) state (all optional, every effect is a continuous 0..1 parameter):
//   eye {x, y, ang (0 = east, π/2 = south), bob −1..1, pitch rad (+ = down), roll rad}, fov (vertical degrees, default 74;
//   changes only the projection), actors [{x, y, team 'ct'|'t', face rad, run cycle-phase|null, aim, alpha, hit}],
//   weapon 'm4'|'ak'|null, fire, crosshair, hitmark, tracer {from:[x,y(,z)], to:[x,y(,z)], alpha},
//   hud null | {hp, ammo:[30,90] (null hides), kill:{alpha, killer, victim, head}}, hit, tilt, gray, died.
// drawMap(c, rect, clip, st): cam {cx, cy, ppm}, actors (same fields). Both write only rect ∩ clip ∩ canvas and work
// through a fade() view (slow path) or straight into a Canvas buffer.
import { Canvas, MAIN, TINY, bayer, hex } from "../../../../renderer/pixel/raster.mjs";

// ───────────────────────────── constants ─────────────────────────────
export const YOU_PEEK = { x: 12.0, y: 4.5 };
export const YOU_COVER = { x: 15.4, y: 4.5 };
export const ENEMY_POS = { x: 12.0, y: 28.0 };
export const EYE_H = 1.65;            // standing eye height, m
export const WALL_H = 3.2;            // typical block height, m
export const FOV_V = (74 * Math.PI) / 180;
export const BODY_H = 1.8;            // soldier height, m
export const CHEST_H = 1.3;           // tracer / line-of-sight height, m
export const MAP_K = 0.55;            // oblique map: screen metres per metre of height
export const MAP_W = 28, MAP_H = 35;  // world size in metres (1 tile = 1 m)

const CPM = 4;                        // geometry cells per metre (0.25 m cells for frames, leaves, crates)
const GW = MAP_W * CPM, GH = MAP_H * CPM;
const H0 = new Float32Array(GW * GH); // solid from H0 ...
const H1 = new Float32Array(GW * GH); // ... to H1 (H1 = 0 → open floor)
const MAT = new Uint8Array(GW * GH);  // surface material
const OBJ = new Uint8Array(GW * GH);  // feature object id (door, window, arch, crate, leaf)
const M_FLOOR = 0, M_SAND = 1, M_BEAM = 2, M_LEAF = 3, M_CRATE = 4;

// ───────────────────────────── hashing / noise ─────────────────────────────
export function ihash(a, b = 0, c = 0) {
  let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x61c88647)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const sm = (t) => t * t * (3 - 2 * t);
function vnoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi);
  const a = ihash(xi, yi, seed), b = ihash(xi + 1, yi, seed), c = ihash(xi, yi + 1, seed), d = ihash(xi + 1, yi + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ───────────────────────────── the map ─────────────────────────────
const OBJS = [null];
const addObj = (o) => (OBJS.push(o), OBJS.length - 1);
function box(x0, y0, x1, y1, h1, mat = M_SAND, h0 = 0, obj = 0) {
  for (let cy = Math.round(y0 * CPM); cy < Math.round(y1 * CPM); cy++)
    for (let cx = Math.round(x0 * CPM); cx < Math.round(x1 * CPM); cx++) {
      if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) continue;
      const i = cy * GW + cx; H0[i] = h0; H1[i] = h1; MAT[i] = h1 > 0 ? mat : M_FLOOR; OBJ[i] = obj;
    }
}
const tagObj = (x0, y0, x1, y1, id) => {
  for (let cy = Math.round(y0 * CPM); cy < Math.round(y1 * CPM); cy++) for (let cx = Math.round(x0 * CPM); cx < Math.round(x1 * CPM); cx++) OBJ[cy * GW + cx] = id;
};

// Feature objects painted on faces: u = world coordinate along the face (x on N/S faces, y on E/W faces), z = height.
const O_NDOOR = addObj({ kind: "door", u0: 5.0, u1: 7.5, z0: 0, z1: 2.6 });          // blue double door, corridor north wall
const O_WIN = addObj({ kind: "window", u0: 12.4, u1: 13.4, z0: 3.3, z1: 4.55 });     // small window high in the tower
const O_ARCH = addObj({ kind: "arch", u0: 2.7, u1: 5.3, z0: 0, z1: 3.0 });           // dark arched passage, corridor west end
const O_WIN2 = addObj({ kind: "window", u0: 21.0, u1: 22.0, z0: 1.7, z1: 2.95 });    // window over the crates
const O_LEAF_L = addObj({ kind: "leaf", ox: 10.5, side: 0 });                        // south doors, closed left leaf
const O_LEAF_R = addObj({ kind: "leaf", oy: 30.5, side: 1 });                        // south doors, right leaf swung open
const O_CRATE_A = addObj({ kind: "crate", ox: 19.0, oy: 2.0, s: 1.25 });
const O_CRATE_B = addObj({ kind: "crate", ox: 20.5, oy: 2.0, s: 1.25 });
const O_CRATE_C = addObj({ kind: "crate", ox: 22.6, oy: 2.0, s: 1.0 });

box(0, 0, MAP_W, MAP_H, 3.2);                    // everything starts as solid sandstone
box(0, 0, MAP_W, 2, 3.6);                        // corridor north buildings
box(11.25, 0, 14.75, 2, 5.4);                    // a taller tower on the lane axis (skyline)
box(0, 6, 10, 30, 3.4);                          // west block
box(14, 6, MAP_W, 30, 3.2);                      // east block (its NW corner (14,6) is the cover corner)
box(0, 30, MAP_W, MAP_H, 3.6);                   // south wall with the big doors
box(3, 2, 25, 6, 0);                             // cross corridor (y 6..7 belongs to the blocks)
box(10, 6, 14, 30, 0);                           // the long lane
// lane pilasters (rhythm along the walls, clear of every line of sight used by the film)
box(10, 11.5, 10.25, 12.25, 3.75); box(10, 19.5, 10.25, 20.25, 3.75);
box(13.75, 15.5, 14, 16.25, 3.5); box(13.75, 23, 14, 23.75, 3.5);
// north door frame: posts + hanging wooden lintel
box(4.75, 2, 5, 2.25, 3.0); box(7.5, 2, 7.75, 2.25, 3.0); box(4.75, 2, 7.75, 2.25, 3.0, M_BEAM, 2.6);
tagObj(4, 1.75, 8.5, 2, O_NDOOR); tagObj(12, 1.75, 14, 2, O_WIN); tagObj(2.75, 2, 3, 6, O_ARCH); tagObj(20.5, 1.75, 22.5, 2, O_WIN2);
// south doors: passage through the wall, lintel beam, closed left leaf (face-on), right leaf swung inward
box(10.5, 30, 13.5, 31.5, 0);                    // the doorway passage
box(10.5, 30, 13.5, 30.25, 3.6, M_BEAM, 2.8);    // lintel over the doorway (sandstone above the beam)
box(7, 31.5, 17, 34, 0);                         // sunny yard beyond the doors
box(10.5, 30.5, 12, 30.75, 2.8, M_LEAF, 0, O_LEAF_L);
box(13.25, 30.5, 13.5, 32, 2.8, M_LEAF, 0, O_LEAF_R);
// crates in the corridor, away from the lines of sight
box(19, 2, 20.25, 3.25, 2.5, M_CRATE, 0, O_CRATE_A);
box(20.5, 2, 21.75, 3.25, 1.25, M_CRATE, 0, O_CRATE_B);
box(22.6, 2, 23.6, 3, 1.0, M_CRATE, 0, O_CRATE_C);
const HMAX = 5.4;

const cellAt = (x, y) => { const cx = Math.floor(x * CPM), cy = Math.floor(y * CPM); return cx < 0 || cy < 0 || cx >= GW || cy >= GH ? -1 : cy * GW + cx; };
/** Solid height at a world point (0 = open floor; outside the map counts as a 9 m wall). */
export function heightAt(x, y) { const i = cellAt(x, y); return i < 0 ? 9 : H1[i]; }

/** Line of sight between two map points at height z (default chest height), sampled every 2 cm. */
export function visible(ax, ay, bx, by, z = CHEST_H) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.02));
  for (let k = 0; k <= n; k++) {
    const t = k / n, i = cellAt(ax + (bx - ax) * t, ay + (by - ay) * t);
    if (i < 0) return false;
    if (H1[i] > 0 && H0[i] <= z && z < H1[i]) return false;
  }
  return true;
}

// ───────────────────────────── sun, shadows, contact darkening ─────────────────────────────
const SUN_EL = (55 * Math.PI) / 180, SUN_TAN = Math.tan(SUN_EL);
const SUN_DX = -0.5, SUN_DY = -0.866;            // horizontal direction TOWARD the sun (from the north-north-west)
const SPM = 16, SW = MAP_W * SPM, SH = MAP_H * SPM;
const SHADOW = new Float32Array(SW * SH);        // height below which the vertical line at this point is in shadow
const AOF = new Float32Array(SW * SH);           // floor contact darkening 0..1
(function bakeLight() {
  for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
    const x = (i + 0.5) / SPM, y = (j + 0.5) / SPM;
    let s = 0;
    for (let d = 0.04; d < HMAX / SUN_TAN + 0.1; d += 0.04) {
      const k = cellAt(x + SUN_DX * d, y + SUN_DY * d), h = k < 0 ? 9 : H0[k] === 0 ? H1[k] : 0;
      s = Math.max(s, h - d * SUN_TAN);
    }
    SHADOW[j * SW + i] = s;
    let dm = 9;
    for (let dy = -0.6; dy <= 0.6; dy += 0.125) for (let dx = -0.6; dx <= 0.6; dx += 0.125) {
      const k = cellAt(x + dx, y + dy); if (k >= 0 && H1[k] > 0.9 && H0[k] === 0) dm = Math.min(dm, Math.hypot(dx, dy));
    }
    AOF[j * SW + i] = clamp(1 - dm / 0.6, 0, 1);
  }
})();
const sampMap = (A, x, y) => {
  const fx = x * SPM - 0.5, fy = y * SPM - 0.5, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
  const i0 = i < 0 ? 0 : i >= SW ? SW - 1 : i, i1 = i + 1 < 0 ? 0 : i + 1 >= SW ? SW - 1 : i + 1;
  const r0 = (j < 0 ? 0 : j >= SH ? SH - 1 : j) * SW, r1 = (j + 1 < 0 ? 0 : j + 1 >= SH ? SH - 1 : j + 1) * SW;
  return (A[r0 + i0] * (1 - tx) + A[r0 + i1] * tx) * (1 - ty) + (A[r1 + i0] * (1 - tx) + A[r1 + i1] * tx) * ty;
};
/** 0 = in sun, 1 = in shadow, for a world point at height z (crisp edge a few cm wide). */
export function shadowAt(x, y, z = 0) { return clamp((sampMap(SHADOW, x, y) - z) / 0.05 + 0.5, 0, 1); }
// The surface shaders read shadows through shQ: the first-person view uses the bake above, the server map switches to
// its own lower-sun bake (longer shadows) while it draws.
let SH_CUR = SHADOW, SH_SOFT = 0.05;
const shQ = (x, y, z) => clamp((sampMap(SH_CUR, x, y) - z) / SH_SOFT + 0.5, 0, 1);
const DRIFT = new Float32Array(SW * SH);         // where wind-blown sand covers the paving (0..1)
for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
  const x = (i + 0.5) / SPM, y = (j + 0.5) / SPM;
  DRIFT[j * SW + i] = vnoise(x / 1.7, y / 1.7, 7) * 0.55 + vnoise(x / 0.6, y / 0.6, 8) * 0.18 + AOF[j * SW + i] * 0.55 + (x < 10.6 || x > 13.4 ? 0.12 : 0);
}

// ───────────────────────────── palettes ─────────────────────────────
const RAMPS = [
  // 0 sandstone
  ["#2a1a11", "#45301f", "#61452c", "#7c5a38", "#967045", "#ae8754", "#c29c65", "#d2af79", "#dfc18e", "#e9d1a5", "#f2e0bd", "#f9eed7"],
  // 1 paving stone (a touch cooler / greyer)
  ["#2c2119", "#443227", "#5c4636", "#735a45", "#896e55", "#9e8266", "#b29678", "#c4a98b", "#d3bb9e", "#e0cdb3", "#ecdec9", "#f6eee0"],
  // 2 packed sand (warmer)
  ["#33200f", "#4f3319", "#6b4623", "#875a2e", "#a06e3a", "#b68348", "#c99859", "#d8ac6c", "#e4bf82", "#edd09a", "#f5e0b6", "#faeed3"],
  // 3 door blue paint
  ["#0a1322", "#0f1d36", "#15294d", "#1c3766", "#244782", "#2d589c", "#3a6cb4", "#4d83c8", "#679cd8", "#88b6e4", "#acd0ef", "#cfe5f6"],
  // 4 wood
  ["#1e1008", "#32190c", "#472412", "#5c3018", "#723e1f", "#884d27", "#9d5e31", "#b0703d", "#c3854e", "#d49b63", "#e2b27e", "#eecb9e"],
  // 5 iron
  ["#0e0e10", "#18191c", "#232528", "#2f3236", "#3d4146", "#4e535a", "#636970", "#7d848c", "#9aa1a8", "#b8bec4", "#d3d8dc", "#eceff1"],
  // 6 deep interior shadow
  ["#0b0806", "#130d0a", "#1c140f", "#261b14", "#31231a", "#3d2c21", "#4a3629", "#584132", "#674d3c", "#775a47", "#876852", "#97775e"],
  // 7 rug red (map rooftop dressing only)
  ["#2a0a0a", "#4a1210", "#6b1d16", "#8c2a1c", "#a83a24", "#c04f2e", "#d4683c", "#e2864f", "#eca66a", "#f3c48c", "#f8dcb0", "#fcecd2"],
];
const R_SAND = 0, R_STONE = 1, R_DUST = 2, R_BLUE = 3, R_WOOD = 4, R_IRON = 5, R_DARK = 6, R_RUG = 7, R_BASE = 255;
const HZ = 6, HZ_MAX = 0.62;
const HAZE = hex("#d9e1df");
const pack = (c) => (c[0] << 16) | (c[1] << 8) | c[2];
const COOL = hex("#3f4378"), COOL_K = 0.2;   // shadows lean cool/violet (classic pixel-art shading)
const PAL = RAMPS.map((ramp) => {
  const n = ramp.length, out = new Int32Array(n * (HZ + 1) * 2);
  ramp.forEach((col, k) => {
    const c = hex(col);
    for (let h = 0; h <= HZ; h++) for (let cl = 0; cl < 2; cl++) {
      const t = (h / HZ) * HZ_MAX, base = cl ? c.map((v, q) => v + (COOL[q] - v) * COOL_K) : c;
      out[(k * (HZ + 1) + h) * 2 + cl] = pack(base.map((v, q) => Math.round(v + (HAZE[q] - v) * t)));
    }
  });
  return out;
});
const RLEN = RAMPS.map((r) => r.length);
// sky bands, zenith → horizon
const SKY = ["#2a74c6", "#3381cf", "#3f8dd6", "#4d9adc", "#5ea7e1", "#72b4e6", "#88c1ea", "#9fcdec", "#b6d8ec", "#cbe2ec", "#dbe9ec"].map((c) => pack(hex(c)));
const CLOUD = [pack(hex("#ffffff")), pack(hex("#f1f6f8")), pack(hex("#dce8ef")), pack(hex("#c3d6e3"))];

/** Narrow-band ordered dither of a continuous ramp position (flat bands, dither only near the band edge). */
function q(v, x, y, band = 0.26) {
  const fl = Math.floor(v), f = v - fl, lo = 0.5 - band / 2;
  if (band <= 0) return f < 0.5 ? fl : fl + 1;
  return f < lo ? fl : f > 1 - lo ? fl + 1 : (f - lo) / band > bayer(x, y) ? fl + 1 : fl;
}
let BAND = 0.26; // dither band for the next shadeRGB calls (narrower for far / minified surfaces)
const bandOf = (lev) => (lev <= 1 ? 0.26 : lev === 2 ? 0.14 : 0);
function shadeRGB(ramp, v, hz, x, y, cool = 0) {
  const n = RLEN[ramp], k = clamp(q(v, x, y, BAND), 0, n - 1);
  const h = clamp(q(hz * HZ, y + 1, x + 2, 0.3), 0, HZ);
  return PAL[ramp][(k * (HZ + 1) + h) * 2 + cool];
}

// ───────────────────────────── textures (64 texels per metre, v = height from the bottom) ─────────────────────────────
const TPM = 64;
function mkTex(w, h, fn) {
  const r = new Uint8Array(w * h), id = new Float32Array(w * h);
  // level 0 holds whole ramp steps (pixel-art clusters); only minified levels keep fractional averages
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = fn(x, y); r[y * w + x] = o[0]; id[y * w + x] = Math.round(o[1]); }
  const lv = [{ w, h, r, i: id }];
  let cur = lv[0];
  while (cur.w > 1 || cur.h > 1) {
    const nw = Math.max(1, cur.w >> 1), nh = Math.max(1, cur.h >> 1), nr = new Uint8Array(nw * nh), ni = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      const rr = [], ii = [];
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const k = Math.min(cur.h - 1, y * 2 + dy) * cur.w + Math.min(cur.w - 1, x * 2 + dx); rr.push(cur.r[k]); ii.push(cur.i[k]); }
      let best = rr[0], bc = 0;
      for (const a of rr) { const n = rr.filter((b) => b === a).length; if (n > bc || (n === bc && a < best)) { best = a; bc = n; } }
      let s = 0; for (let k = 0; k < 4; k++) if (rr[k] === best) s += ii[k];
      nr[y * nw + x] = best; ni[y * nw + x] = s / bc;
    }
    cur = { w: nw, h: nh, r: nr, i: ni }; lv.push(cur);
  }
  return { w, h, lv };
}
let _r = 0, _i = 0;
/** Sample a texture at texel coords (u right, v up) and mip level; result in _r (ramp) / _i (ramp position). */
function samp(T, u, v, lev) {
  const L = T.lv[lev < T.lv.length ? lev : T.lv.length - 1], s = 1 / (1 << lev);
  let x = Math.floor(u * s) % L.w, y = Math.floor(v * s) % L.h;
  if (x < 0) x += L.w; if (y < 0) y += L.h;
  const k = y * L.w + x; _r = L.r[k]; _i = L.i[k];
}
const lodOf = (texPerPx) => (texPerPx < 1.3 ? 0 : texPerPx < 2.6 ? 1 : texPerPx < 5.2 ? 2 : texPerPx < 10.4 ? 3 : texPerPx < 21 ? 4 : texPerPx < 42 ? 5 : 6);

// Cyclic block boundaries for one course of a wrapped texture.
function courses(w, seed, minL, varL) {
  const b = []; let p = Math.floor(ihash(seed, 1) * minL);
  while (p < w) { b.push(p); p += minL + Math.floor(ihash(seed, b.length + 2) * varL); }
  if (w + b[0] - b[b.length - 1] < minL * 0.6) b.pop();
  return b;
}
function blockOf(bnd, w, u) { // → [index, offset into block, block length]
  let k = bnd.length - 1; for (let i = 0; i < bnd.length; i++) if (bnd[i] <= u) k = i;
  const s = bnd[k], e = k + 1 < bnd.length ? bnd[k + 1] : bnd[0] + w; let o = u - s; if (o < 0) o += w;
  return [k, o, (e - s + w) % w || w];
}
function rowsOf(list) { const out = []; let y = 0; list.forEach((hgt, j) => { out.push([y, hgt, j]); y += hgt; }); return (v) => out.find(([y0, hh]) => v >= y0 && v < y0 + hh); }
function walks(n, W, H, seed, minL, varL) {
  const s = new Set();
  for (let c = 0; c < n; c++) {
    let x = Math.floor(ihash(c, seed) * W), y = Math.floor(ihash(c, seed + 1) * H);
    for (let k = 0; k < minL + ihash(c, seed + 2) * varL; k++) { s.add(((y + H) % H) * W + ((x + W) % W)); y += ihash(c, k, seed + 3) < 0.72 ? -1 : 0; const r = ihash(c, k, seed + 4); x += r < 0.3 ? -1 : r > 0.7 ? 1 : 0; }
  }
  return s;
}

// Sandstone wall: big ashlar courses, worn rounded edges, weathering streaks, plaster patches over the joints, cracks.
const T_SAND = (() => {
  const W = 256, H = 320, row = rowsOf([30, 36, 28, 34, 40, 30, 36, 28, 26, 32]), bnd = [];
  for (let j = 0; j < 10; j++) bnd.push(courses(W, 100 + j, 54, 62));
  const crack = walks(9, W, H, 900, 30, 50);
  return mkTex(W, H, (x, y) => {
    const [y0, CH, j] = row(y), fy = y - y0, [k, o, len] = blockOf(bnd[j], W, x), bh = ihash(j, k, 11);
    const plaster = vnoise(x / 52, y / 40, 9) * 0.92 + vnoise(x / 11, y / 11, 10) * 0.1;
    if (plaster > 0.86) { // smooth lime plaster patch hiding the joints
      let v = 6.6 + (vnoise(x / 9, y / 9, 14) - 0.5) * 0.4;
      if (plaster < 0.872) v = 4.6; else if (plaster < 0.884) v = 7.4;
      if (ihash(x, y, 15) > 0.985) v -= 0.8;
      return [R_SAND, v];
    }
    if (fy >= CH - 2 || o < 2) return [R_SAND, fy >= CH - 1 || o === 0 ? 3.0 : 3.7];   // mortar joint, 3 cm
    const ex = Math.min(o - 2, len - 1 - o), ey = Math.min(fy, CH - 3 - fy);
    if (ex + ey < 3 && ihash(j, k, ex < 4 ? 1 : 2, ey < 4 ? 3 : 4) > 0.35) return [R_SAND, 3.7];            // rounded worn corner
    let v = 6.0 + (bh - 0.5) * 1.3 + (vnoise(x / 9, y / 9, 3) - 0.5) * 0.55 + (vnoise(x / 60, y / 80, 4) - 0.5) * 0.6;
    if (ey === 0 && fy === CH - 3) v += 0.85; else if (fy === CH - 4) v += 0.4;    // sunlit top lip
    if (fy <= 1) v -= 0.75;                                                       // underside
    if (ex <= 1 && o < len / 2) v += 0.35; if (ex <= 1 && o > len / 2) v -= 0.55;
    if (vnoise(x / 2.5, j * 7.1, 5) > 0.8 && fy > CH * 0.35) v -= 0.4;            // weathering streaks
    const sp = ihash(x, y, 12);
    if (sp > 0.97) v -= 0.95; else if (sp > 0.955) v += 0.55;
    if (crack.has(y * W + x)) v = 3.3;
    return [R_SAND, v];
  });
})();
// Wall tops (roof slabs) for the map and for views from above.
const T_TOP = (() => {
  const crack = walks(6, 256, 256, 970, 20, 40);
  return mkTex(256, 256, (x, y) => {
    let v = 7 + (vnoise(x / 22, y / 22, 41) - 0.5) * 0.6;
    if ((x + Math.floor(y / 96) * 61) % 140 === 0 || y % 96 === 0) v -= 1;     // slab joints
    const sp = ihash(x, y, 43); if (sp > 0.985) v -= 1; else if (sp > 0.975) v += 1;
    if (crack.has(y * 256 + x)) v = 5;
    return [R_SAND, v];
  });
})();
// Paving: worn flagstones in uneven rows with sand-filled joints.
const T_STONE = (() => {
  const W = 256, H = 256, row = rowsOf([44, 56, 40, 60, 56]), bnd = [];
  for (let j = 0; j < 5; j++) bnd.push(courses(W, 200 + j, 44, 66));
  const crack = walks(10, W, H, 950, 16, 30);
  return mkTex(W, H, (x, y) => {
    const [y0, RH, j] = row(y), fy = y - y0, [k, o, len] = blockOf(bnd[j], W, x), sh = ihash(j, k, 21);
    const ex = Math.min(o, len - 1 - o) - 2, ey = Math.min(fy, RH - 1 - fy) - 2;
    if (ex < 0 || ey < 0 || (ex + ey < 5 && ex < 4 && ey < 4)) return [R_DUST, 6.2 + (vnoise(x / 3, y / 3, 22) - 0.5) * 0.9];
    let v = 5.8 + (sh - 0.5) * 1.5 + (vnoise(x / 8, y / 8, 23) - 0.5) * 0.8 + (vnoise(x / 30, y / 30, 24) - 0.5) * 0.5;
    if (ex < 2 || ey < 2) v -= 0.55;
    if (ey >= 2 && ey < 4 && fy > RH / 2) v += 0.35;
    const sp = ihash(x, y, 25); if (sp > 0.975) v -= 1.0; else if (sp > 0.965) v += 0.5;
    if (crack.has(y * W + x) && sh > 0.4) v -= 1.4;
    return [R_STONE, v];
  });
})();
// Packed sand with pebbles and faint wind ripples.
const T_DUST = mkTex(256, 256, (x, y) => {
  const cx = Math.floor(x / 7), cy = Math.floor(y / 7), p = ihash(cx, cy, 33);
  if (p > 0.93) { const px = cx * 7 + 3.5 + (ihash(cx, cy, 35) - 0.5) * 3, py = cy * 7 + 3.5, d = Math.hypot(x + 0.5 - px, (y + 0.5 - py) * 1.3); if (d < 2.4) return [R_STONE, y + 0.5 > py ? 6.6 : 3.8]; }
  let v = 6.0 + (vnoise(x / 12, y / 12, 31) - 0.5) * 0.9 + (Math.sin(x * 0.12 + y * 0.42 + vnoise(x / 20, y / 20, 32) * 7) > 0.86 ? 0.5 : 0);
  if (ihash(x, y, 34) > 0.96) v -= 0.8;
  return [R_DUST, v];
});
// Blue painted planks with battens, iron studs and worn paint (one leaf, w×h texels; mirrored for the right leaf).
function plankDoor(w, h, seed) {
  const bat = [Math.round(h * 0.16), Math.round(h * 0.76)];
  return (x, y, mirror) => {
    const xx = mirror ? w - 1 - x : x;
    if (xx < 6 || y < 4 || y >= h - 6) return [R_BLUE, xx < 2 || y >= h - 2 ? 1.2 : xx < 3 || y >= h - 3 ? 3.4 : 2.5];   // frame stile / rails
    const p = Math.floor((xx - 6) / 10), px = (xx - 6) % 10, ph = ihash(p, seed);
    let v = 5.4 + (ph - 0.5) * 0.9 + (vnoise(xx / 5, y / 18, seed + 1) - 0.5) * 0.7, r = R_BLUE;
    if (px >= 8) v = px === 9 ? 1.9 : 2.8; else if (px === 0) v += 0.7;
    for (const b of bat) if (y >= b && y < b + 10) {
      v = y >= b + 8 ? 6.9 : y <= b + 1 ? 2.9 : 5.9 + (vnoise(xx / 7, y, seed + 5) - 0.5) * 0.5;
      const sx = (xx - 9) % 16, sy = y - b - 3;
      if (sx >= 0 && sx < 3 && sy >= 0 && sy < 3) return [R_IRON, sx === 0 && sy === 2 ? 8.0 : sx === 2 || sy === 0 ? 2.6 : 5.0];
      if (xx > w - 30 && y >= b + 2 && y < b + 8) return [R_IRON, y === b + 7 ? 6.4 : 3.6]; // hinge strap
    }
    const wear = vnoise(xx / 8, y / 10, seed + 2) + (y < 22 ? 0.22 : 0) + (xx > w - 12 ? 0.15 : 0) + (vnoise(xx / 3, y / 3, seed + 6) - 0.5) * 0.12;
    if (wear > 0.84) { r = R_WOOD; v = 5.8 + (vnoise(xx / 2, y / 12, seed + 3) - 0.5) * 1.6; if (wear < 0.855) { r = R_BLUE; v = 7.2; } }
    if (ihash(xx, y, seed + 4) > 0.975) v -= 0.8;
    return [r, v];
  };
}
const T_DOOR = (() => { const lw = 80, f = plankDoor(lw, 166, 41); return mkTex(160, 166, (x, y) => (x < lw ? f(x, y, false) : f(x - lw, y, true))); })();
const T_LEAF = (() => { const f = plankDoor(96, 180, 51); return mkTex(96, 180, (x, y) => f(x, y, false)); })();
const T_CRATE = mkTex(80, 80, (x, y) => {
  const e = Math.min(x, y, 79 - x, 79 - y);
  if (e < 8) {
    if ((x < 8 || x > 71) && (y < 8 || y > 71) && e >= 3 && e <= 4) return [R_IRON, e === 3 ? 6.5 : 3.0];
    let v = 6.5 + (vnoise(x / 3, y / 14, 61) - 0.5) * 0.9; if (e <= 1) v = 2.8; if (e >= 6) v = 4.0 + (e - 6) * 0.6; return [R_WOOD, v];
  }
  const d1 = Math.abs(x - y), d2 = Math.abs(x - (79 - y));
  if (d1 < 6 || d2 < 6) { const d = Math.min(d1, d2); return [R_WOOD, d >= 5 ? 4.2 : d === 0 ? 7.4 : 6.7 + (vnoise(x / 12, y / 3, 62) - 0.5) * 0.6]; }
  let v = 5.0 + (ihash(Math.floor(y / 16), 63) - 0.5) * 0.8 + (vnoise(x / 18, y / 3, 64) - 0.5) * 1.0;
  if (y % 16 >= 14) v = y % 16 === 15 ? 2.8 : 3.6;
  return [R_WOOD, v];
});
const T_CRATETOP = mkTex(80, 80, (x, y) => {
  const e = Math.min(x, y, 79 - x, 79 - y);
  if (e < 8) return [R_WOOD, e <= 1 ? 2.8 : e >= 6 ? 5.2 : 7.0];
  let v = 5.7 + (ihash(Math.floor(x / 16), 65) - 0.5) * 0.8 + (vnoise(x / 3, y / 18, 66) - 0.5) * 1.0;
  if (x % 16 >= 14) v = x % 16 === 15 ? 2.8 : 3.6;
  if (x % 16 >= 5 && x % 16 <= 6 && (y === 12 || y === 67)) return [R_IRON, 6];
  return [R_WOOD, v];
});
const T_BEAM = mkTex(128, 32, (x, y) => {
  let v = 5.3 + (vnoise(x / 22, y / 2.5, 71) - 0.5) * 1.7;
  if (y <= 1) v = 2.8; if (y >= 25 && y <= 26) v = 7.2;
  if (ihash(x, y, 72) > 0.97) v -= 1.2;
  if (Math.abs(x % 64 - 32) < 2 && y > 8 && y < 18) return [R_IRON, Math.abs(x % 64 - 32) < 1 ? 6.5 : 3];
  return [R_WOOD, v];
});
// Window: wooden frame, iron bars, dark room, stone sill (1 m × 1.25 m).
const T_WIN = mkTex(64, 80, (x, y) => {
  if (y < 8) return [R_SAND, y >= 6 ? 9.8 : y <= 1 ? 3.4 : 8.0];
  if (x < 6 || x > 57 || y > 73) return [R_WOOD, x <= 1 || x >= 62 || y >= 78 ? 2.6 : x === 5 || x === 58 || y === 74 ? 3.6 : 5.4];
  const bx2 = (x - 6) % 13;
  if (bx2 >= 6 && bx2 <= 8) return [R_IRON, bx2 === 6 ? 6.0 : bx2 === 8 ? 2.4 : 4.2];
  return [R_DARK, 1.1 + (y > 60 ? 0 : 0.5) + (x < 14 ? 1.3 : 0)];
});
// Arched passage painted on a face: voussoirs around a dark tunnel (2.6 m × 3.0 m); outside → base sandstone.
const T_ARCH = mkTex(166, 192, (x, y) => {
  const cx = 83, r0 = 60, r1 = 76, sp = 124;
  const dx = x + 0.5 - cx, dy = Math.max(0, y + 0.5 - sp), d = Math.hypot(dx, dy);
  const inner = Math.abs(dx) < r0 && (y < sp || d < r0), ring = !inner && Math.abs(dx) < r1 && (y < sp || d < r1);
  if (inner) return [R_DARK, 1.0 + clamp((sp + r0 - y) / 80, 0, 1) * 2.4 + (Math.abs(dx) > r0 - 8 ? 1.4 : 0)];
  if (ring) {
    const a = Math.atan2(dy, dx), seg = y < sp ? Math.floor(y / 24) + 100 : Math.floor((a / Math.PI) * 9);
    const edge = y < sp ? y % 24 >= 22 : Math.abs((a / Math.PI) * 9 - Math.round((a / Math.PI) * 9)) * d < 1.2;
    return [R_SAND, edge ? 3.5 : 7.1 + (ihash(seg, 81) - 0.5) * 0.9 + ((y < sp ? Math.abs(dx) : d) > r1 - 3 ? -0.6 : (y < sp ? Math.abs(dx) : d) < r0 + 3 ? 0.6 : 0)];
  }
  return [R_BASE, 0];
});

// ───────────────────────────── render buffer ─────────────────────────────
// A colour + depth buffer over a canvas sub-rectangle, addressed in absolute canvas coordinates.
// It mimics the Canvas drawing API (px/get/rect/poly/text/…) so shared drawing code works on it.
class Buf {
  constructor(x0, y0, bw, bh, cw, ch, col, dep) {
    this.x0 = x0; this.y0 = y0; this.bw = bw; this.bh = bh; this.w = cw; this.h = ch; this.col = col; this.dep = dep;
  }
  px(x, y, c) {
    x = Math.floor(x) - this.x0; y = Math.floor(y) - this.y0;
    if (c == null || c === false || x < 0 || y < 0 || x >= this.bw || y >= this.bh) return;
    this.col[y * this.bw + x] = typeof c === "number" ? c : pack(hex(c));
  }
  get(x, y) {
    x = clamp(Math.floor(x) - this.x0, 0, this.bw - 1); y = clamp(Math.floor(y) - this.y0, 0, this.bh - 1);
    const v = this.col[y * this.bw + x]; return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
}
for (const k of ["rect", "frame", "rframe", "rrect", "line", "poly", "disc", "ring", "ellipse", "ering", "dither", "tint", "sprite", "text", "measure"]) Buf.prototype[k] = Canvas.prototype[k];
const POOL = new Map();
function scratch(key, n, withDepth) {
  let p = POOL.get(key);
  if (!p || p.col.length < n) { p = { col: new Int32Array(n), dep: new Float32Array(n) }; POOL.set(key, p); }
  if (withDepth) p.dep.fill(Infinity, 0, n);
  return p;
}
function regionOf(c, rect, clip) {
  const x0 = Math.max(0, Math.floor(rect.x), Math.floor(clip?.[0] ?? 0)), y0 = Math.max(0, Math.floor(rect.y), Math.floor(clip?.[1] ?? 0));
  const x1 = Math.min(c.w, Math.ceil(rect.x + rect.w), Math.ceil(clip?.[2] ?? c.w)), y1 = Math.min(c.h, Math.ceil(rect.y + rect.h), Math.ceil(clip?.[3] ?? c.h));
  return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : null;
}
function flush(c, b) {
  const direct = Object.getPrototypeOf(c) === Canvas.prototype && c.d;
  for (let y = 0; y < b.bh; y++) for (let x = 0; x < b.bw; x++) {
    const v = b.col[y * b.bw + x];
    if (direct) { const i = ((y + b.y0) * c.w + x + b.x0) * 3; c.d[i] = (v >> 16) & 255; c.d[i + 1] = (v >> 8) & 255; c.d[i + 2] = v & 255; }
    else c.px(x + b.x0, y + b.y0, [(v >> 16) & 255, (v >> 8) & 255, v & 255]);
  }
}

// ───────────────────────────── surface shading (shared by both views) ─────────────────────────────
// Face index: 0 = faces north (−y), 1 = faces south (+y), 2 = faces west (−x), 3 = faces east (+x).
const FACE_L = [1, -1, 1, -1], SHADE_L = -1;
const FNX = [0, 0, -1, 1], FNY = [-1, 1, 0, 0];
const hazeOf = (t) => clamp((t - 7) / 46, 0, 1);
function faceColor(cell, f, u, z, wx, wy, t, texPx, X, Y) {
  const mat = MAT[cell], lev = lodOf(texPx); BAND = bandOf(lev);
  let L = FACE_L[f], isSand = false;
  if (mat === M_LEAF) {
    const o = OBJS[OBJ[cell]];
    samp(T_LEAF, o.side === 0 ? (u - o.ox) * TPM : (1.5 - (u - o.oy)) * TPM, z * TPM, lev);
  } else if (mat === M_CRATE) {
    const o = OBJS[OBJ[cell]], uu = (u - (f < 2 ? o.ox : o.oy)) / o.s;
    samp(T_CRATE, uu * T_CRATE.w, ((z % o.s) / o.s) * T_CRATE.h, lev);
  } else if (mat === M_BEAM && z < H0[cell] + 0.42) {
    samp(T_BEAM, u * TPM, (z - H0[cell]) * TPM, lev);
  } else {
    _r = R_BASE; const o = OBJS[OBJ[cell]];
    if (o && o.u0 !== undefined && u >= o.u0 && u < o.u1 && z >= o.z0 && z < o.z1) {
      const T = o.kind === "door" ? T_DOOR : o.kind === "window" ? T_WIN : T_ARCH;
      samp(T, ((u - o.u0) / (o.u1 - o.u0)) * T.w, ((z - o.z0) / (o.z1 - o.z0)) * T.h, lev);
      if (_r === R_DARK) L = Math.min(L, -0.2);
    }
    if (_r === R_BASE) { samp(T_SAND, u * TPM + f * 77, z * TPM + (f & 1) * 13, lev); isSand = true; }
  }
  let cool = f === 1 || f === 3 ? 1 : 0;
  if (f === 0 || f === 2) { const s = shQ(wx + FNX[f] * 0.07, wy + FNY[f] * 0.07, z); if (s > 0 && s >= bayer(X + 1, Y)) { L = SHADE_L; cool = 1; } }
  if (isSand) { if (z < 0.5) L -= 0.85 * (1 - z / 0.5) ** 1.5; if (z > H1[cell] - 0.04 && H0[cell] === 0) L += 1; }
  return shadeRGB(_r, _i + L, hazeOf(t), X, Y, cool);
}
const FLOOR_LIT = 1, FLOOR_SHADE = -1;
function floorColor(wx, wy, t, texPx, X, Y) {
  const lev = lodOf(texPx), dr = sampMap(DRIFT, wx, wy); BAND = bandOf(lev);
  if (dr > 0.66 + (bayer(X, Y) - 0.5) * 0.1) samp(T_DUST, wx * TPM, wy * TPM, lev); else samp(T_STONE, wx * TPM, wy * TPM, lev);
  const s = shQ(wx, wy, 0);
  const sh = s > 0 && s >= bayer(X, Y + 2);
  const L = (sh ? FLOOR_SHADE : FLOOR_LIT) - sampMap(AOF, wx, wy) * 1.1;
  return shadeRGB(_r, _i + L, hazeOf(t), X, Y, sh ? 1 : 0);
}
function topColor(cell, wx, wy, h, t, texPx, X, Y) {
  const lev = lodOf(texPx), mat = MAT[cell]; BAND = bandOf(lev);
  let L = 1;
  if (mat === M_CRATE) { const o = OBJS[OBJ[cell]]; samp(T_CRATETOP, ((wx - o.ox) / o.s) * T_CRATETOP.w, ((wy - o.oy) / o.s) * T_CRATETOP.h, lev); L = 1; }
  else if (mat === M_LEAF) { samp(T_LEAF, 1, 4, lev); }
  else if (mat === M_BEAM) { samp(T_SAND, wx * TPM, wy * TPM + 11, lev); }
  else { samp(T_TOP, wx * TPM, wy * TPM, lev); }
  const sh = shQ(wx, wy, h) >= bayer(X + 2, Y) ? 1 : 0;
  if (sh) L = SHADE_L;
  return shadeRGB(_r, _i + L, hazeOf(t), X, Y, sh);
}
function undersideColor(wx, t, texPx, X, Y) { BAND = 0; samp(T_BEAM, wx * TPM, 6, lodOf(texPx)); return shadeRGB(_r, _i - 2.0, hazeOf(t), X, Y, 1); }

// Sky: banded gradient by elevation with dithered band edges, plus a few pixel clouds placed on the sky dome.
const CLOUDS = [
  { az: 1.62, el: 0.30, w: 0.20, h: 0.045, seed: 1 }, { az: 1.95, el: 0.42, w: 0.12, h: 0.03, seed: 2 },
  { az: -1.45, el: 0.33, w: 0.18, h: 0.04, seed: 3 }, { az: -1.9, el: 0.47, w: 0.11, h: 0.028, seed: 4 },
  { az: 0.4, el: 0.36, w: 0.15, h: 0.035, seed: 5 }, { az: 3.0, el: 0.31, w: 0.17, h: 0.04, seed: 6 },
];
function cloudAt(az, el, X, Y) {
  for (const cl of CLOUDS) {
    let da = az - cl.az; da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
    const nx = da / cl.w, ny = (el - cl.el) / cl.h;
    if (nx < -1.25 || nx > 1.25 || ny < -0.4 || ny > 2.2) continue;
    // lumpy top: sum of bumps; flat base at ny = 0
    let top = 0;
    for (let k = 0; k < 5; k++) { const bx = -0.8 + k * 0.4 + (ihash(cl.seed, k) - 0.5) * 0.2, r = 0.32 + ihash(cl.seed, k, 2) * 0.3; const d = (nx - bx) / r; if (d * d < 1) top = Math.max(top, Math.sqrt(1 - d * d) * (0.8 + r * 2.2)); }
    if (ny < 0 || ny > top) continue;
    const edge = top - ny;
    return ny < 0.22 ? CLOUD[ny < 0.1 ? 3 : 2] : edge < 0.12 ? CLOUD[0] : CLOUD[1];
  }
  return -1;
}
function skyColor(el, az, X, Y) {
  if (el > 0.15 && el < 0.62) { const cc = cloudAt(az, el, X, Y); if (cc >= 0) return cc; }
  const v = clamp((0.62 - el) / 0.62, 0, 1) * (SKY.length - 1) + 0.0001, k = clamp(q(v, X, Y), 0, SKY.length - 1);
  return SKY[k];
}

// ───────────────────────────── (a) first-person view ─────────────────────────────
function camOf(rect, eye, fovDeg, tilt = 0) {
  const ts = sm(clamp(tilt, 0, 1));
  const focal = rect.h / 2 / Math.tan(((fovDeg ?? 74) * Math.PI) / 360);
  const pitch = (eye.pitch ?? 0) + 0.2 * ts, roll = (eye.roll ?? 0) - 0.436 * ts;
  const eyeH = lerp(EYE_H, 0.3, ts) + 0.03 * (eye.bob ?? 0) * (1 - ts);
  const ang = eye.ang ?? 0, dx = Math.cos(ang), dy = Math.sin(ang);
  return {
    ex: eye.x, ey: eye.y, eyeH, focal, dx, dy, rx: -dy, ry: dx, ang, roll,
    cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, hor: rect.y + rect.h / 2 - Math.tan(pitch) * focal,
  };
}
// world → unrolled camera screen
function camProject(K, wx, wy, wz) {
  const vx = wx - K.ex, vy = wy - K.ey, depth = vx * K.dx + vy * K.dy, lat = vx * K.rx + vy * K.ry;
  return [K.cx + (lat / depth) * K.focal, K.hor + ((K.eyeH - wz) / depth) * K.focal, depth];
}
const rollPt = (K, x, y, sgn = 1) => {
  if (!K.roll) return [x, y];
  const c = Math.cos(K.roll * sgn), s = Math.sin(K.roll * sgn), dx = x - K.cx, dy = y - K.cy;
  return [K.cx + dx * c - dy * s, K.cy + dx * s + dy * c];
};

/** Project a world point (metres, wz = height) into the first-person rect. eye may carry fov (deg) and tilt (0..1). */
export function projectFP(rect, eye, wx, wy, wz = CHEST_H, fov = eye.fov ?? 74) {
  const K = camOf(rect, eye, fov, eye.tilt ?? 0);
  const [x0, y0, depth] = camProject(K, wx, wy, wz);
  const [x, y] = rollPt(K, x0, y0);
  return { x, y, depth, visible: depth > 0.1 && x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h };
}

const TMAX = 90;
function castScene(B, K, lim = null) {
  const { col, dep, bw, x0: bx0, y0: by0, bh } = B;
  const pcx = K.ex * CPM, pcy = K.ey * CPM, f = K.focal, H = K.eyeH, hor = K.hor;
  for (let X = bx0; X < bx0 + bw; X++) {
    const sy0 = lim ? Math.max(by0, lim[2 * (X - bx0)]) : by0, sy1 = lim ? Math.min(by0 + bh, lim[2 * (X - bx0) + 1]) : by0 + bh;
    if (sy1 <= sy0) continue;
    const camX = (X + 0.5 - K.cx) / f, rdx = K.dx + K.rx * camX, rdy = K.dy + K.ry * camX, colK = Math.hypot(1, camX);
    const az = Math.atan2(rdy, rdx);
    let mx = Math.floor(pcx), my = Math.floor(pcy);
    const stepX = rdx > 0 ? 1 : -1, stepY = rdy > 0 ? 1 : -1;
    const dX = rdx === 0 ? 1e30 : 1 / (Math.abs(rdx) * CPM), dY = rdy === 0 ? 1e30 : 1 / (Math.abs(rdy) * CPM);
    let sX = (rdx > 0 ? mx + 1 - pcx : pcx - mx) * dX, sY = (rdy > 0 ? my + 1 - pcy : pcy - my) * dY;
    let t = 0, yb = sy1, face = -1;
    const put = (Y, c, d) => { const k = (Y - by0) * bw + (X - bx0); if (dep[k] === Infinity) { col[k] = c; dep[k] = d; } };
    for (let guard = 0; guard < 2000; guard++) {
      const side = sX < sY ? 0 : 1, tE = Math.min(sX, sY, TMAX), cell = my * GW + mx;
      const h0 = H0[cell], h1 = H1[cell];
      if (h1 === 0 || h0 > 0) { // floor under an open (or roofed) cell
        const ya = Math.max(sy0, Math.ceil(hor + (H * f) / tE - 0.5)), yz = Math.min(yb - 1, t > 0 ? Math.floor(hor + (H * f) / t - 0.5) : sy1);
        for (let Y = ya; Y <= yz; Y++) {
          const tr = (H * f) / (Y + 0.5 - hor), wx = K.ex + rdx * tr, wy = K.ey + rdy * tr;
          put(Y, floorColor(wx, wy, tr, (tr * TPM) / f * Math.sqrt(Math.max(1, (tr * 0.5) / Math.max(H, 0.3))), X, Y), tr);
        }
        yb = Math.min(yb, Math.max(sy0, ya));
      }
      if (h1 > 0 && t > 0) {
        const wx = K.ex + rdx * t, wy = K.ey + rdy * t, u = face >= 2 ? wy : wx;
        const yTop = hor + ((H - h1) * f) / t, yBot = hor + ((H - h0) * f) / t;
        const ya = Math.max(sy0, Math.ceil(yTop - 0.5)), yz = Math.min((h0 === 0 ? yb : sy1) - 1, Math.ceil(yBot - 0.5) - 1);
        for (let Y = ya; Y <= yz; Y++) put(Y, faceColor(cell, face, u, H - ((Y + 0.5 - hor) * t) / f, wx, wy, t, (t * TPM) / f, X, Y), t);
        let cover = ya;
        if (H > h1) { // top surface seen from above
          const yt = Math.max(sy0, Math.ceil(hor + ((H - h1) * f) / tE - 0.5));
          for (let Y = yt; Y < Math.min(ya, h0 === 0 ? yb : sy1); Y++) {
            const tr = ((H - h1) * f) / (Y + 0.5 - hor);
            put(Y, topColor(cell, K.ex + rdx * tr, K.ey + rdy * tr, h1, tr, (tr * TPM) / f * 2, X, Y), tr);
          }
          cover = Math.min(cover, yt);
        }
        if (h0 > 0 && H < h0) { // underside of a lintel
          const yu = Math.min(sy1 - 1, Math.ceil(hor - ((h0 - H) * f) / tE - 0.5) - 1);
          for (let Y = Math.max(sy0, Math.ceil(yBot - 0.5)); Y <= yu; Y++) {
            const tr = ((h0 - H) * f) / (hor - Y - 0.5);
            put(Y, undersideColor(K.ex + rdx * tr, tr, (tr * TPM) / f, X, Y), tr);
          }
        }
        if (h0 === 0) yb = Math.min(yb, Math.max(sy0, cover));
      }
      if (yb <= sy0 || tE >= TMAX) break;
      t = tE;
      if (side === 0) { mx += stepX; sX += dX; face = stepX > 0 ? 2 : 3; } else { my += stepY; sY += dY; face = stepY > 0 ? 0 : 1; }
      if (mx < 0 || my < 0 || mx >= GW || my >= GH) break;
    }
    for (let Y = sy0; Y < yb; Y++) {
      const k = (Y - by0) * bw + (X - bx0);
      if (dep[k] === Infinity) { col[k] = skyColor(Math.atan2(hor - (Y + 0.5), f * colK), az, X, Y); dep[k] = 1e9; }
    }
  }
}

function drawActorsFP(B, K, actors) {
  const list = [];
  for (const a of actors ?? []) {
    if ((a.alpha ?? 1) <= 0) continue;
    const [sx, sy, depth] = camProject(K, a.x, a.y, 0);
    if (depth < 0.25) continue;
    const toCam = Math.atan2(K.ey - a.y, K.ex - a.x);
    list.push({ a, sx, sy, depth, yaw: toCam - (a.face ?? 0) });
  }
  list.sort((p, q2) => q2.depth - p.depth);
  for (const { a, sx, sy, depth, yaw } of list) {
    const hpx = (BODY_H * K.focal) / depth;
    if (sx + hpx < B.x0 || sx - hpx > B.x0 + B.bw) continue;
    const dim = shadowAt(a.x, a.y, 1.2) > 0.5 ? 0.85 : 0;
    // contact shadow on the floor
    const sw = Math.max(1, Math.round(hpx * 0.2)), shh = Math.max(1, Math.round(sw * 0.2));
    for (let j = -shh; j <= shh; j++) for (let i = -sw; i <= sw; i++) {
      if ((i * i) / (sw * sw) + (j * j) / (shh * shh) > 1) continue;
      const X = Math.round(sx) + i, Y = Math.round(sy) + j, k = (Y - B.y0) * B.bw + (X - B.x0);
      if (X < B.x0 || Y < B.y0 || X >= B.x0 + B.bw || Y >= B.y0 + B.bh || B.dep[k] < depth - 0.6 || ((i + j) & 1 && (a.alpha ?? 1) < 1)) continue;
      const v = B.col[k]; B.col[k] = (((v >> 16) & 255) * 0.62) << 16 | (((v >> 8) & 255) * 0.6) << 8 | ((v & 255) * 0.62);
    }
    drawSoldier(B, sx, sy, hpx, {
      team: a.team, yaw, run: a.run ?? null, aim: a.aim ?? 0, alpha: a.alpha ?? 1, hit: a.hit ?? 0, dim, haze: hazeOf(depth),
      depthGate: (x, y) => { const k = (Math.floor(y) - B.y0) * B.bw + (Math.floor(x) - B.x0); return k >= 0 && k < B.dep.length && B.dep[k] > depth - 0.3; },
    });
  }
}

function drawTracerFP(B, K, tr) {
  if (!tr || (tr.alpha ?? 1) <= 0) return;
  let A = [tr.from[0], tr.from[1], tr.from[2] ?? CHEST_H], Bp = [tr.to[0], tr.to[1], tr.to[2] ?? CHEST_H];
  const dOf = (p) => (p[0] - K.ex) * K.dx + (p[1] - K.ey) * K.dy, near = 0.15;
  let da = dOf(A), db = dOf(Bp);
  if (da < near && db < near) return;
  if (da < near) { const t = (near - da) / (db - da); A = A.map((v, i) => v + (Bp[i] - v) * t); da = near; }
  if (db < near) { const t = (near - db) / (da - db); Bp = Bp.map((v, i) => v + (A[i] - v) * t); db = near; }
  const [ax, ay] = camProject(K, ...A), [bx, by] = camProject(K, ...Bp);
  const n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))) + 1, al = tr.alpha ?? 1;
  const thick = K.focal > 500 ? 1 : 0;
  for (let i = 0; i <= n; i++) {
    const s = i / n, inv = (1 - s) / da + s / db, d = 1 / inv, X = Math.round(ax + (bx - ax) * s), Y = Math.round(ay + (by - ay) * s);
    // the streak fades toward the shooter so it reads as travelling to the target
    const k2 = al * (0.35 + 0.65 * s);
    for (let o = 0; o <= thick; o++) {
      const XX = X, YY = Y + o, k = (YY - B.y0) * B.bw + (XX - B.x0);
      if (XX < B.x0 || YY < B.y0 || XX >= B.x0 + B.bw || YY >= B.y0 + B.bh || B.dep[k] < d - 0.05 || k2 <= bayer(XX, YY)) continue;
      B.col[k] = o === 0 ? 0xfff4c4 : 0xf2b84a;
    }
  }
}

/** First-person game view. See the file header for the state fields. */
export function drawFP(c, rect, clip, st = {}) {
  const reg = regionOf(c, rect, clip); if (!reg) return;
  const [ox0, oy0, ox1, oy1] = reg, ow = ox1 - ox0, oh = oy1 - oy0;
  const eye = st.eye ?? { x: YOU_PEEK.x, y: YOU_PEEK.y, ang: Math.PI / 2 };
  const K = camOf(rect, eye, st.fov ?? 74, st.tilt ?? 0);
  // scene region (larger when the view is rolled: the rolled picture is resampled into the output)
  let sx0 = ox0, sy0 = oy0, sx1 = ox1, sy1 = oy1;
  if (K.roll) {
    const pts = [[ox0, oy0], [ox1, oy0], [ox0, oy1], [ox1, oy1]].map(([x, y]) => rollPt(K, x, y, -1));
    sx0 = Math.floor(Math.min(...pts.map((p) => p[0]))) - 1; sx1 = Math.ceil(Math.max(...pts.map((p) => p[0]))) + 1;
    sy0 = Math.floor(Math.min(...pts.map((p) => p[1]))) - 1; sy1 = Math.ceil(Math.max(...pts.map((p) => p[1]))) + 1;
  }
  const sw = sx1 - sx0, sh = sy1 - sy0, sp = scratch("scene", sw * sh, true);
  const S = new Buf(sx0, sy0, sw, sh, c.w, c.h, sp.col, sp.dep);
  let lim = null;
  if (K.roll) { // per scene column: only the rows that land inside the (rolled) output rectangle, plus a margin
    lim = new Int32Array(sw * 2);
    const poly = [[ox0, oy0], [ox1, oy0], [ox1, oy1], [ox0, oy1]].map(([x, y]) => rollPt(K, x, y, -1));
    for (let i = 0; i < sw; i++) {
      const X = sx0 + i + 0.5; let lo = Infinity, hi = -Infinity;
      for (let e = 0; e < 4; e++) {
        const [ax, ay] = poly[e], [bx2, by2] = poly[(e + 1) % 4];
        if ((ax <= X && bx2 >= X) || (bx2 <= X && ax >= X)) { const t = bx2 === ax ? 0 : (X - ax) / (bx2 - ax), y = ay + (by2 - ay) * t; lo = Math.min(lo, y); hi = Math.max(hi, y); }
      }
      lim[2 * i] = lo === Infinity ? 0 : Math.floor(lo) - 2; lim[2 * i + 1] = hi === -Infinity ? 0 : Math.ceil(hi) + 2;
    }
  }
  castScene(S, K, lim);
  drawActorsFP(S, K, st.actors);
  drawTracerFP(S, K, st.tracer);
  let O = S;
  if (K.roll) {
    const op = scratch("out", ow * oh, false);
    O = new Buf(ox0, oy0, ow, oh, c.w, c.h, op.col, op.dep);
    const cs = Math.cos(-K.roll), sn = Math.sin(-K.roll);
    for (let Y = oy0; Y < oy1; Y++) for (let X = ox0; X < ox1; X++) {
      const dx = X + 0.5 - K.cx, dy = Y + 0.5 - K.cy;
      const u = clamp(Math.floor(K.cx + dx * cs - dy * sn) - sx0, 0, sw - 1), v = clamp(Math.floor(K.cy + dx * sn + dy * cs) - sy0, 0, sh - 1);
      O.col[(Y - oy0) * ow + (X - ox0)] = S.col[v * sw + u];
    }
  }
  overlaysFP(O, rect, st, K);
  flush(c, O);
}

// ───────────────────────────── soldier figure ─────────────────────────────
// A posed 3D stick-and-volume figure (capsules in body space) projected for any yaw and shaded per pixel,
// so one function serves 8 px silhouettes and 200 px close-ups. Light comes from the upper left.
const rampP = (a) => Int32Array.from(a.map((c) => pack(hex(c))));
const TEAM = {
  ct: {
    top: rampP(["#0b1120", "#141f38", "#1e2f52", "#2a416c", "#3a5686", "#5574a6", "#7590bc"]),
    vest: rampP(["#0a0e14", "#121922", "#1c2533", "#283447", "#36455c", "#4a5b74", "#62758e"]),
    legs: rampP(["#0a0f1c", "#111a2e", "#1a2744", "#24365c", "#314774", "#435c8e", "#5a74a6"]),
    head: rampP(["#0c111b", "#151d2d", "#202b42", "#2d3b57", "#3f5072", "#56698d", "#7084a6"]),
    gun: "m4",
  },
  t: {
    top: rampP(["#2a1608", "#47260e", "#683915", "#8c4f1e", "#ae6728", "#cb8136", "#e3a052"]),
    vest: rampP(["#20140a", "#382411", "#523519", "#6c4722", "#865a2c", "#a07038", "#ba8848"]),
    legs: rampP(["#17120c", "#271f16", "#382e21", "#4a3d2c", "#5e4e38", "#746146", "#8c7656"]),
    head: rampP(["#0a0a0b", "#131315", "#1c1c1f", "#26262a", "#323237", "#414147", "#55555c"]),
    gun: "ak",
  },
};
const SKIN = rampP(["#3c2214", "#6a3f26", "#93603c", "#b98058", "#d8a07a", "#ecc09c", "#f6d7b8"]);
const GLOVE = rampP(["#0b0b0c", "#151517", "#202023", "#2c2c30", "#3a3a40", "#4c4c54", "#62626b"]);
const BOOT = rampP(["#0d0a08", "#18130f", "#241d17", "#312820", "#40352a", "#524436", "#665645"]);
const GUNM = rampP(["#060607", "#0e0f11", "#17181b", "#212328", "#2d3036", "#3c4047", "#545962"]);
const GUNW = rampP(["#241106", "#3d1d0b", "#5a2c12", "#78401b", "#955426", "#b06b34", "#c78648"]);
const MAGO = rampP(["#2e1406", "#4e220b", "#713312", "#94461a", "#b25b24", "#cc7533", "#df9249"]);
const OUTLINE = pack(hex("#0a0806"));
const VIEW_YAW = { front: 0, fr: Math.PI / 4, right: Math.PI / 2, br: (3 * Math.PI) / 4, back: Math.PI, bl: (-3 * Math.PI) / 4, left: -Math.PI / 2, fl: -Math.PI / 4 };
const LGT = (() => { const v = [-0.55, -0.62, 0.56], n = Math.hypot(...v); return v.map((a) => a / n); })();

const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: (a) => Math.hypot(a[0], a[1], a[2]) };
v3.norm = (a) => v3.mul(a, 1 / (v3.len(a) || 1));
function ik(S, Hd, a, b, pole) {
  let d = v3.sub(Hd, S); const L = Math.min(v3.len(d), (a + b) * 0.999); d = v3.norm(d);
  const along = (a * a - b * b + L * L) / (2 * L), hgt = Math.sqrt(Math.max(0, a * a - along * along));
  const perp = v3.norm(v3.sub(pole, v3.mul(d, v3.dot(pole, d))));
  return v3.add(S, v3.add(v3.mul(d, along), v3.mul(perp, hgt)));
}

/** Pose → list of parts in body space (lat = body right, fwd, up), units of body height. */
function posePartsOf(team, run, aim) {
  const T = TEAM[team] ?? TEAM.t, P = [];
  const ph = run == null ? null : run * 2 * Math.PI;
  const bob = ph == null ? 0 : 0.014 * Math.cos(2 * ph), lean = ph == null ? 0.0 : 0.04;
  const up = (p) => [p[0], p[1], p[2] + bob];
  // legs: thigh, shin, boot
  for (const side of [1, -1]) {
    const p = ph == null ? null : ph + (side > 0 ? 0 : Math.PI);
    const th = p == null ? 0.03 * side : 0.44 * Math.sin(p), kn = p == null ? 0.07 : 0.15 + 0.9 * Math.max(0, Math.cos(p));
    const hip = up([0.064 * side, 0, 0.495]), knee = v3.add(hip, [0.008 * side, 0.235 * Math.sin(th), -0.235 * Math.cos(th)]);
    const foot = v3.add(knee, [0.006 * side, 0.235 * Math.sin(th - kn), -0.235 * Math.cos(th - kn)]);
    const fa = th - kn * 0.35, toe = v3.add(foot, [0, 0.085 * Math.cos(fa), 0.085 * Math.sin(fa) * 0.4]);
    P.push({ a: hip, b: knee, r0: 0.058, r1: 0.047, ramp: T.legs, tone: 3.3 });
    P.push({ a: knee, b: [foot[0], foot[1], foot[2] + 0.04], r0: 0.045, r1: 0.039, ramp: T.legs, tone: 3.1 });
    if (team === "ct") P.push({ a: v3.add(knee, [0, 0.02, 0.02]), b: v3.add(knee, [0, 0.022, -0.03]), r0: 0.036, r1: 0.034, ramp: T.vest, tone: 2.6, pad: 1 });
    P.push({ a: [foot[0], foot[1] - 0.02, foot[2] + 0.03], b: [toe[0], toe[1], toe[2] + 0.02], r0: 0.04, r1: 0.032, ramp: BOOT, tone: 2.5 });
  }
  // torso (a soft box) + neck + head
  P.push({ torso: true, c0: up([0, lean * 0.3, 0.47]), c1: up([0, lean, 0.815]), hw: 0.122, hd: 0.08, ramp: T.top, vest: T.vest, team, tone: 3.4 });
  P.push({ neck: true, a: up([0, lean, 0.8]), b: up([0, lean + 0.005, 0.845]), r0: 0.034, r1: 0.032, ramp: team === "ct" ? SKIN : T.head, tone: team === "ct" ? 2.6 : 3.0 });
  P.push({ head: true, c: up([0, lean + 0.01, 0.9]), r: 0.066, ramp: T.head, team, tone: 3.4 });
  // rifle
  const k = sm(clamp(aim, 0, 1));
  const butt = up([lerp(0.09, 0.085, k), lerp(0.0, lean + 0.02, k), lerp(0.68, 0.785, k)]);
  const dir = v3.norm([lerp(-0.42, -0.1, k), lerp(0.78, 1, k), lerp(-0.5, 0, k)]);
  const dn = v3.norm(v3.sub([0, 0, -1], v3.mul(dir, v3.dot([0, 0, -1], dir))));
  const at = (s, d = 0) => v3.add(v3.add(butt, v3.mul(dir, s)), v3.mul(dn, d));
  const ak = T.gun === "ak", stock = ak ? GUNW : GUNM;
  P.push({ a: at(-0.02, 0.014), b: at(0.11, 0.0), r0: 0.025, r1: 0.019, ramp: stock, tone: 2.6, gun: 1 });        // stock
  P.push({ a: at(0.1), b: at(0.245), r0: 0.025, r1: 0.024, ramp: GUNM, tone: 2.4, gun: 1 });                      // receiver
  P.push({ a: at(0.155, 0.02), b: at(0.2, ak ? 0.1 : 0.105), r0: 0.017, r1: 0.019, ramp: ak ? MAGO : GUNM, tone: 3.0, gun: 1 }); // magazine
  if (ak) P.push({ a: at(0.2, 0.09), b: at(0.245, 0.125), r0: 0.018, r1: 0.016, ramp: MAGO, tone: 2.8, gun: 1 });
  P.push({ a: at(0.245), b: at(0.37), r0: 0.022, r1: 0.019, ramp: ak ? GUNW : GUNM, tone: 2.8, gun: 1 });         // handguard
  P.push({ a: at(0.37), b: at(0.5), r0: 0.009, r1: 0.008, ramp: GUNM, tone: 2.8, gun: 1 });                       // barrel
  P.push({ a: at(0.45, -0.012), b: at(0.45, -0.04), r0: 0.006, r1: 0.005, ramp: GUNM, tone: 2.6, gun: 1 });       // front sight
  // arms to the rifle
  const shR = up([0.128, lean, 0.785]), shL = up([-0.128, lean, 0.785]);
  const hR = at(0.13, 0.035), hL = at(0.31, 0.024);
  const eR = ik(shR, hR, 0.165, 0.165, [0.8, -0.2, -0.6]), eL = ik(shL, hL, 0.165, 0.19, [-0.8, -0.1, -0.6]);
  P.push({ a: shR, b: eR, r0: 0.042, r1: 0.034, ramp: T.top, tone: 3.4 }); P.push({ a: eR, b: hR, r0: 0.033, r1: 0.027, ramp: T.top, tone: 3.4 });
  P.push({ a: shL, b: eL, r0: 0.042, r1: 0.034, ramp: T.top, tone: 3.4 }); P.push({ a: eL, b: hL, r0: 0.033, r1: 0.027, ramp: T.top, tone: 3.4 });
  P.push({ a: hR, b: v3.add(hR, [0, 0.012, -0.012]), r0: 0.028, r1: 0.027, ramp: GLOVE, tone: 2.6 });
  P.push({ a: hL, b: v3.add(hL, [0, 0.012, -0.012]), r0: 0.028, r1: 0.027, ramp: GLOVE, tone: 2.6 });
  return P;
}

// Rasterise the posed figure (feet at x, y; h px tall) into a local colour / part-id buffer, painter's order.
function figure(x, y, h, yaw, team, run, aim) {
  const parts = posePartsOf(team, run, aim);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const pr = (p) => [x + (-p[0] * cy + p[1] * sy) * h, y - p[2] * h, -p[0] * sy - p[1] * cy];
  const bx0 = Math.floor(x - 0.62 * h) - 2, bx1 = Math.ceil(x + 0.62 * h) + 2, by0 = Math.floor(y - 1.02 * h) - 2, by1 = Math.ceil(y + 0.08 * h) + 2;
  const W = bx1 - bx0, H = by1 - by0, col = new Int32Array(W * H).fill(-1), pid = new Int16Array(W * H).fill(-1);
  const minR = 0.5;
  const items = parts.map((p) => {
    if (p.torso) return { p, d: (pr(p.c0)[2] + pr(p.c1)[2]) / 2 + 0.012 };
    if (p.head) return { p, d: pr(p.c)[2] - 0.004 };
    return { p, d: (pr(p.a)[2] + pr(p.b)[2]) / 2 + (p.gun ? -0.012 : p.neck ? 0.2 : p.pad ? -0.004 : 0) };
  }).sort((a, b) => b.d - a.d);
  const tones = (ramp, v, X, Y) => ramp[clamp(q(v, X, Y), 0, ramp.length - 1)];
  const plot = (X, Y, color, id) => { if (X >= bx0 && Y >= by0 && X < bx1 && Y < by1) { const i = (Y - by0) * W + (X - bx0); col[i] = color; pid[i] = id; } };
  const lamb = (nx, ny) => { const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); return nx * LGT[0] + ny * LGT[1] + nz * LGT[2]; };
  const detail = h >= 30;
  let ord = 0;
  for (const { p } of items) {
    ord++;
    if (p.torso) {
      const [ax, ay] = pr(p.c0), [bx, by] = pr(p.c1);
      const hw = Math.max(minR, Math.hypot(p.hw * cy, p.hd * sy) * h), top = Math.min(ay, by), bot = Math.max(ay, by);
      const front = cy > 0.3, back = cy < -0.3;
      for (let Y = Math.floor(top); Y <= Math.ceil(bot); Y++) {
        const t = clamp((Y + 0.5 - top) / Math.max(1, bot - top), 0, 1), mx = lerp(bx, ax, t);
        const w = hw * (t < 0.1 ? 0.8 + 2 * t : t < 0.45 ? 1 : 1 - 0.3 * (t - 0.45));
        for (let X = Math.floor(mx - w); X <= Math.ceil(mx + w); X++) {
          const nx = (X + 0.5 - mx) / w; if (Math.abs(nx) > 1) continue;
          const ny = t < 0.12 ? -(1 - t / 0.12) * 0.85 : 0;
          let v = p.tone + 2.4 * (lamb(nx * 0.9, ny) - 0.45), ramp = p.ramp;
          if (t > 0.86) { ramp = p.team === "ct" ? p.vest : TEAM.t.legs; v -= t > 0.9 && t < 0.95 && detail ? 1.3 : 0.4; } // belt
          else if (p.team === "ct" && t > 0.13 && Math.abs(nx) < 0.84) { // plate carrier with pouches
            ramp = p.vest;
            if (detail && (front || back) && t > 0.5 && t < 0.72 && Math.abs(nx) < 0.66) { const cell = Math.floor(((nx + 0.66) / 1.32) * 3); v += cell % 2 ? 0.5 : -0.2; if (Math.abs(((nx + 0.66) / 1.32) * 3 - Math.round(((nx + 0.66) / 1.32) * 3)) < 0.08) v -= 1.2; }
          } else if (p.team === "t" && front && t > 0.1 && t < 0.86 && Math.abs(nx) < 0.2) { ramp = TEAM.t.head; v -= 0.2; } // open jacket, dark shirt
          else if (p.team === "t" && detail && t > 0.25 && t < 0.4 && Math.abs(Math.abs(nx) - 0.5) < 0.16 && front) v -= 0.8; // chest pockets
          plot(X, Y, tones(ramp, v, X, Y), ord);
        }
      }
      continue;
    }
    if (p.head) {
      const [hx, hy] = pr(p.c), r = Math.max(minR + 0.4, p.r * h), side = sy, front = cy;
      const ct = p.team === "ct", R = ct ? r * 1.13 : r;
      for (let Y = Math.floor(hy - R - 1); Y <= Math.ceil(hy + R); Y++) for (let X = Math.floor(hx - R - 1); X <= Math.ceil(hx + R); X++) {
        const nx = (X + 0.5 - hx) / r, ny = (Y + 0.5 - hy) / r, d2 = nx * nx + ny * ny;
        const fx = nx - side * 0.6, faceVis = front > -0.25 && r >= 2.5;
        let v, ramp = p.ramp;
        if (ct) {
          const brim = -0.08 + 0.1 * Math.abs(side) - (front < -0.3 ? -0.25 : 0), hel = (nx * nx) / 1.28 + ((ny + 0.06) * (ny + 0.06)) / 1.2;
          if (ny < brim && hel <= 1) { v = p.tone + 2.4 * (lamb(nx / 1.13, (ny + 0.06) / 1.1) - 0.4); if (detail && Math.abs(ny - brim) < 0.12) v -= 1.0; }
          else if (d2 <= 1) {
            if (faceVis && Math.abs(fx) < 0.66 * Math.max(0.35, front + 0.45)) { ramp = SKIN; v = 3.5 + 1.6 * (lamb(nx, ny) - 0.4); if (r >= 4.5 && front > 0.2 && Math.abs(ny - (brim + 0.25)) < 0.12 && Math.abs(Math.abs(fx) - 0.27) < 0.12) { ramp = GLOVE; v = 1; } }
            else { ramp = TEAM.ct.vest; v = 2.6 + 1.4 * (lamb(nx, ny) - 0.4); }
          } else continue;
        } else {
          if (d2 > 1) continue;
          v = p.tone + 2.2 * (lamb(nx, ny) - 0.4);
          if (faceVis && Math.abs(ny + 0.04) < 0.17 && Math.abs(fx) < 0.52 * Math.max(0.3, front + 0.4)) { ramp = SKIN; v = 3.4; if (r >= 4.5 && front > 0.2 && Math.abs(Math.abs(fx) - 0.22) < 0.1) { ramp = GLOVE; v = 0.5; } }
        }
        plot(X, Y, tones(ramp, v, X, Y), ord);
      }
      continue;
    }
    const [ax, ay] = pr(p.a), [bx, by] = pr(p.b), r0 = Math.max(minR, p.r0 * h), r1 = Math.max(minR, p.r1 * h);
    const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1e-6, rm = Math.max(r0, r1);
    for (let Y = Math.floor(Math.min(ay, by) - rm - 1); Y <= Math.ceil(Math.max(ay, by) + rm); Y++)
      for (let X = Math.floor(Math.min(ax, bx) - rm - 1); X <= Math.ceil(Math.max(ax, bx) + rm); X++) {
        const px = X + 0.5 - ax, py = Y + 0.5 - ay, t = clamp((px * vx + py * vy) / L2, 0, 1), r = lerp(r0, r1, t);
        const dx = px - vx * t, dy = py - vy * t; if (dx * dx + dy * dy > r * r) continue;
        plot(X, Y, tones(p.ramp, p.tone + 2.2 * (lamb(dx / r, dy / r) - 0.4), X, Y), ord);
      }
  }
  return { bx0, by0, W, H, col, pid, head: pr(parts.find((p) => p.head).c) };
}

// Hand-built silhouette for tiny figures (h < 18 px): helmet/balaclava head, team torso, two legs, rifle line.
function tinyFigure(x, y, h, yaw, team, run, aim) {
  const T = TEAM[team], cy = Math.cos(yaw), sy = Math.sin(yaw), side = Math.abs(sy) > 0.72, dir = sy >= 0 ? 1 : -1, front = cy > 0;
  const hd = Math.max(2, Math.round(h * 0.17)), th = Math.max(2, Math.round(h * 0.33)), lh = Math.max(2, Math.round(h) - hd - th);
  const tw = side ? Math.max(2, Math.round(h * 0.2)) : Math.max(3, Math.round(h * 0.3)), lw = Math.max(1, Math.round(h * 0.1));
  const X0 = Math.round(x), Y0 = Math.round(y), bx0 = X0 - Math.ceil(h * 0.6) - 2, by0 = Y0 - Math.round(h) - 3, W = Math.ceil(h * 1.2) + 5, H = Math.round(h) + 5;
  const col = new Int32Array(W * H).fill(-1), pid = new Int16Array(W * H).fill(-1);
  const put = (X, Y, c) => { const i = X - bx0, j = Y - by0; if (i >= 0 && j >= 0 && i < W && j < H) col[j * W + i] = c; };
  const box = (x0, y0, w, hh, lit, dark) => { for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) put(x0 + i, y0 + j, i < Math.ceil(w / 2) ? lit : dark); };
  const ph = run == null ? null : run * 2 * Math.PI, sw = ph == null ? 0 : Math.sin(ph);
  const top = Y0 - Math.round(h), tx = X0 - Math.floor(tw / 2);
  // legs
  if (side) {
    const a = Math.round(sw * h * 0.12);
    box(X0 - Math.floor(lw / 2) + a, Y0 - lh, lw, lh, T.legs[3], T.legs[2]);
    box(X0 - Math.floor(lw / 2) - a, Y0 - lh, lw, lh, T.legs[3], T.legs[2]);
    put(X0 + a + dir * Math.ceil(lw / 2), Y0 - 1, BOOT[2]); put(X0 - a + dir * Math.ceil(lw / 2), Y0 - 1, BOOT[2]);
  } else {
    const up = ph == null ? [0, 0] : [Math.max(0, Math.round(sw)), Math.max(0, Math.round(-sw))];
    box(tx, Y0 - lh - up[0], lw, lh, T.legs[3], T.legs[3]); box(tx + tw - lw, Y0 - lh - up[1], lw, lh, T.legs[2], T.legs[2]);
    if (tw - 2 * lw > 0 && h >= 10) box(tx + lw, Y0 - lh, tw - 2 * lw, 1, T.legs[2], T.legs[2]);
  }
  // torso + head
  box(tx, top + hd, tw, th, (team === "ct" ? T.vest : T.top)[4], (team === "ct" ? T.vest : T.top)[3]);
  if (team === "ct" && !side) box(tx, top + hd, 1, th - 1, T.top[4], T.top[4]), box(tx + tw - 1, top + hd, 1, th - 1, T.top[3], T.top[3]);
  if (team === "t" && front && !side && tw >= 3) box(X0, top + hd + 1, 1, th - 1, T.head[2], T.head[2]);
  const hx = X0 - Math.floor(hd / 2) + (side ? dir : 0);
  box(hx, top, hd, hd, T.head[team === "ct" ? 4 : 3], T.head[team === "ct" ? 3 : 2]);
  if (front || side) { const fy = top + Math.floor(hd / 2) + (team === "ct" ? 0 : 0), fx = side ? (dir > 0 ? hx + hd - 1 : hx) : hx + Math.floor((hd - 1) / 2); if (cy > -0.3) put(fx, fy, SKIN[4]); }
  // rifle
  const ry = top + hd + Math.max(1, Math.round(th * (aim > 0.5 ? 0.15 : 0.5)));
  if (side) { const L = Math.max(2, Math.round(h * 0.36)); for (let i = 0; i < L; i++) put(X0 + dir * (Math.ceil(tw / 2) + i - 1), ry + (aim > 0.5 ? 0 : Math.floor(i / 3)), GUNM[1]); }
  else if (front) put(X0, ry, GUNM[1]);
  return { bx0, by0, W, H, col, pid, head: [hx + hd / 2, top + hd / 2] };
}

/**
 * Soldier figure, feet at (x, y), h pixels tall. o: {team:'ct'|'t', view (8 names) or yaw (rad, 0 = facing the viewer,
 * +π/2 = facing screen-right), run (stride phase in cycles, or null), aim 0..1, alpha 0..1 (dithered ghost), hit 0..1,
 * dim 0..1 (in shade), haze 0..1, depthGate(x,y) → bool}.
 */
export function drawSoldier(c, x, y, h, o = {}) {
  const alpha = o.alpha ?? 1; if (alpha <= 0 || h < 4) return;
  const yaw = o.yaw ?? VIEW_YAW[o.view ?? "front"] ?? 0, team = o.team === "ct" ? "ct" : "t", run = o.run ?? null, aim = o.aim ?? 0;
  let F;
  if (h < 18) F = tinyFigure(x, y, h, yaw, team, run, aim);
  else F = figure(x, y, h, yaw, team, run, aim);
  const { bx0, by0, W, H, col, pid } = F;
  // separation lines where a nearer part overlaps a farther one, then the outer outline
  const sep = h >= 36;
  const darker = (v) => (((v >> 16) & 255) * 0.62) << 16 | (((v >> 8) & 255) * 0.62) << 8 | ((v & 255) * 0.62);
  const out = new Int32Array(col);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i;
    if (col[k] < 0) {
      const n = (i > 0 && col[k - 1] >= 0) || (i < W - 1 && col[k + 1] >= 0) || (j > 0 && col[k - W] >= 0) || (j < H - 1 && col[k + W] >= 0);
      if (n) out[k] = OUTLINE;
      continue;
    }
    if (sep) {
      const me = pid[k], far = (nk) => pid[nk] >= 0 && pid[nk] < me;
      if ((i > 0 && far(k - 1)) || (i < W - 1 && far(k + 1)) || (j > 0 && far(k - W)) || (j < H - 1 && far(k + W))) out[k] = darker(col[k]);
    }
  }
  const hit = clamp(o.hit ?? 0, 0, 1), dim = o.dim ?? 0, hz = clamp(o.haze ?? 0, 0, 1);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const v = out[j * W + i]; if (v < 0) continue;
    const X = bx0 + i, Y = by0 + j;
    if (alpha < 1 && alpha <= bayer(X, Y)) continue;
    if (o.depthGate && !o.depthGate(X, Y)) continue;
    let r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    if (dim > 0) { const k2 = 1 - 0.3 * dim; r *= k2 * 0.97; g *= k2 * 0.98; b *= k2 * 1.04; }
    if (hz > 0) { const s = (clamp(q(hz * HZ, X + 3, Y, 0.3), 0, HZ) / HZ) * HZ_MAX; r += (HAZE[0] - r) * s; g += (HAZE[1] - g) * s; b += (HAZE[2] - b) * s; }
    if (hit > 0) { const s = (clamp(q(hit * 3, X, Y + 1), 0, 3) / 3) * 0.28; r += (255 - r) * s; g += (90 - g) * s; b += (70 - b) * s; }
    c.px(X, Y, [Math.round(clamp(r, 0, 255)), Math.round(clamp(g, 0, 255)), Math.round(clamp(b, 0, 255))]);
  }
  // hit puff: a few blood pixels thrown back from the head
  if (hit > 0 && h >= 8) {
    const [hx, hy] = F.head, n = Math.round(4 + hit * 10);
    for (let k = 0; k < n; k++) {
      const a = ihash(k, 501) * Math.PI * 2, d = (0.03 + ihash(k, 502) * 0.09) * h * (0.5 + hit), X = Math.round(hx + Math.cos(a) * d), Y = Math.round(hy + Math.sin(a) * d * 0.8);
      if (hit > bayer(X, Y) && (!o.depthGate || o.depthGate(X, Y))) c.px(X, Y, k % 3 ? "#b4141a" : "#e8343a");
    }
  }
}

// ───────────────────────────── viewmodel (a tiny box renderer in camera space) ─────────────────────────────
// Boxes: centre c, three half-axis vectors; camera at the origin looking +z, x right, y down.
const rotX = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
const rotY = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
const bx = (c, h, ramp, tone = 2.6, o = {}) => ({ c, ax: [[h[0], 0, 0], [0, h[1], 0], [0, 0, h[2]]].map((a) => rotX(a, o.rx ?? 0)), ramp, tone, ...o });
function segBox(a, b, w, t, ramp, tone, o = {}) { // box along a→b with half-width w (x-ish) and half-thickness t
  const d = v3.sub(b, a), L = v3.len(d), z = v3.mul(d, 1 / L), xr = v3.norm(v3.sub([1, 0, 0], v3.mul(z, z[0]))), y = [z[1] * xr[2] - z[2] * xr[1], z[2] * xr[0] - z[0] * xr[2], z[0] * xr[1] - z[1] * xr[0]];
  return { c: v3.mul(v3.add(a, b), 0.5), ax: [v3.mul(xr, w), v3.mul(y, t), v3.mul(z, L / 2)], ramp, tone, ...o };
}
const M4 = [
  bx([0, 0.0, 0.12], [0.018, 0.022, 0.12], GUNM, 2.6),
  bx([0, -0.03, 0.11], [0.011, 0.008, 0.1], GUNM, 2.9, { stripes: [2, 0.012, 1.2] }),
  bx([0, -0.046, 0.03], [0.012, 0.012, 0.016], GUNM, 2.6),
  bx([0, 0.036, 0.1], [0.017, 0.016, 0.06], GUNM, 2.3),
  bx([0, 0.1, 0.115], [0.012, 0.052, 0.026], GUNM, 2.2, { rx: -0.18 }),
  bx([0, 0.075, 0.015], [0.012, 0.042, 0.016], GUNM, 2.1, { rx: 0.3 }),
  bx([0, 0.004, 0.35], [0.024, 0.024, 0.11], GUNM, 2.8, { stripes: [2, 0.022, 0.8] }),
  bx([0, -0.006, 0.47], [0.012, 0.012, 0.012], GUNM, 2.6),
  bx([0, -0.032, 0.47], [0.005, 0.024, 0.008], GUNM, 2.4, { rx: 0.25 }),
  bx([0, 0.002, 0.53], [0.0065, 0.0065, 0.08], GUNM, 2.6),
  bx([0, 0.002, 0.625], [0.009, 0.009, 0.02], GUNM, 2.0),
];
const AK = [
  bx([0, 0.0, 0.12], [0.018, 0.024, 0.13], GUNM, 2.7),
  bx([0, -0.028, 0.12], [0.015, 0.006, 0.12], GUNM, 3.2),
  bx([0, -0.035, 0.255], [0.012, 0.009, 0.02], GUNM, 2.6),
  bx([0, 0.008, 0.36], [0.025, 0.02, 0.1], GUNW, 3.4, { stripes: [2, 0.06, 0.5] }),
  bx([0, -0.028, 0.34], [0.016, 0.013, 0.09], GUNW, 3.8),
  bx([0, -0.026, 0.45], [0.012, 0.012, 0.016], GUNM, 2.6),
  bx([0, 0.004, 0.52], [0.007, 0.007, 0.08], GUNM, 2.6),
  bx([0, -0.03, 0.575], [0.006, 0.026, 0.008], GUNM, 2.4),
  bx([0, 0.004, 0.615], [0.01, 0.01, 0.022], GUNM, 2.0),
  bx([0, 0.058, 0.18], [0.012, 0.036, 0.03], MAGO, 3.2, { rx: -0.12 }),
  bx([0, 0.118, 0.198], [0.012, 0.034, 0.028], MAGO, 3.0, { rx: -0.42 }),
  bx([0, 0.168, 0.232], [0.012, 0.03, 0.026], MAGO, 2.8, { rx: -0.72 }),
  bx([0, 0.072, 0.04], [0.012, 0.04, 0.016], GUNM, 2.1, { rx: 0.3 }),
];
function armBoxes(team) {
  const T = TEAM[team];
  return [
    bx([-0.004, 0.034, 0.36], [0.026, 0.013, 0.05], GLOVE, 2.0, { gain: 1.5 }),                      // left palm under the handguard
    ...[0, 1, 2, 3].map((k) => bx([-0.0275, 0.004 + k * 0.001, 0.326 + k * 0.022], [0.0085, 0.025, 0.0092], GLOVE, 2.6, { gain: 1.8 })), // fingers on the left side
    bx([-0.017, -0.021, 0.33], [0.008, 0.007, 0.022], GLOVE, 2.6, { gain: 1.8 }),                     // thumb over the top
    segBox([-0.008, 0.042, 0.335], [-0.03, 0.095, 0.285], 0.024, 0.02, GLOVE, 2.0, { gain: 1.5 }),      // wrist
    segBox([-0.03, 0.09, 0.288], [-0.044, 0.12, 0.262], 0.034, 0.03, T.vest, 2.2, { gain: 1.4 }),      // cuff
    segBox([-0.042, 0.115, 0.265], [-0.12, 0.33, 0.1], 0.042, 0.038, T.top, 2.3, { gain: 1.3, stripes: [2, 0.05, 0.6] }), // left sleeve
    bx([0.002, 0.07, 0.03], [0.026, 0.045, 0.03], GLOVE, 2.7, { rx: 0.3 }),                          // right hand on the grip
    segBox([0.02, 0.1, 0.02], [0.08, 0.28, -0.06], 0.045, 0.04, T.top, 2.4, { gain: 1.4 }),            // right sleeve
  ];
}
const LV = v3.norm([-0.45, -0.85, -0.3]);
function drawBoxes(O, boxes, fv, cx, cy) {
  const near = 0.04, proj = (p) => [cx + (p[0] / p[2]) * fv, cy + (p[1] / p[2]) * fv];
  const list = boxes.map((b) => ({ b, d: v3.len(b.c) })).sort((p, q2) => q2.d - p.d);
  for (const { b } of list) {
    const faces = [];
    for (let a = 0; a < 3; a++) for (const s of [1, -1]) {
      const n = v3.mul(b.ax[a], s), fc = v3.add(b.c, n), nn = v3.norm(n);
      if (v3.dot(nn, fc) >= 0) continue; // back face
      const u = b.ax[(a + 1) % 3], w = b.ax[(a + 2) % 3];
      const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([i, j]) => v3.add(fc, v3.add(v3.mul(u, i), v3.mul(w, j))));
      if (corners.some((p) => p[2] < near)) continue;
      faces.push({ a, nn, pts: corners.map(proj), corners });
    }
    for (const f of faces) {
      const lit = v3.dot(f.nn, LV), base = b.tone + 0.2 + (b.gain ?? 1.7) * lit;
      const st = b.stripes && f.a !== b.stripes[0] ? b.stripes : null, an = st ? v3.norm(b.ax[st[0]]) : null;
      const flat = b.ramp[clamp(Math.round(base), 0, b.ramp.length - 1)], alt = st ? b.ramp[clamp(Math.round(base - st[2]), 0, b.ramp.length - 1)] : flat;
      const D = st ? v3.dot(f.corners[0], f.nn) : 0, cA = st ? v3.dot(b.c, an) : 0, nn = f.nn;
      O.poly(f.pts, null, st ? (X, Y) => { // stripe pattern along a box axis: inverse-project the pixel onto the face plane
        const dx = (X + 0.5 - cx) / fv, dy = (Y + 0.5 - cy) / fv, tt = D / (dx * nn[0] + dy * nn[1] + nn[2]);
        const k = ((dx * an[0] + dy * an[1] + an[2]) * tt - cA) / st[1];
        return ((Math.floor(k) % 2) + 2) % 2 === 1 ? alt : flat;
      } : () => flat);
    }
    // crisp silhouette + lit top edges
    for (const f of faces) for (let i = 0; i < 4; i++) {
      const p = f.pts[i], r = f.pts[(i + 1) % 4];
      O.line(Math.round(p[0]), Math.round(p[1]), Math.round(r[0]), Math.round(r[1]), f.nn[1] < -0.5 && fv > 300 ? b.ramp[Math.min(b.ramp.length - 1, Math.round(b.tone + 2.6))] : OUTLINE);
    }
  }
}
function drawViewmodel(O, rect, st, K) {
  const kind = st.weapon; if (kind !== "m4" && kind !== "ak") return;
  const ts = sm(clamp(st.tilt ?? 0, 0, 1)); if (ts >= 0.98) return;
  const fv = rect.h * 0.9, cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const fire = clamp(st.fire ?? 0, 0, 1), bob = st.eye?.bob ?? 0;
  const team = kind === "m4" ? "ct" : "t";
  const T = (p) => {
    let r = [p[0], p[1] - 0.07, p[2] - 0.02];
    r = rotX(r, -0.075 * fire); r = [r[0], r[1] + 0.07, r[2] + 0.02];
    r = rotY(r, -0.2);
    return [r[0] + 0.15 + 0.006 * bob, r[1] + 0.128 + 0.005 * Math.abs(bob) + 0.006 * fire + ts * 0.4, r[2] + 0.37 - 0.03 * fire];
  };
  const tf = (b) => {
    const c = T(b.c), axs = b.ax.map((a) => v3.sub(T(v3.add(b.c, a)), c));
    return { ...b, c, ax: axs };
  };
  const boxes = [...(kind === "m4" ? M4 : AK), ...armBoxes(team)].map(tf);
  drawBoxes(O, boxes, fv, cx, cy);
  if (fire > 0.12) {
    const m = T([0, 0.002, 0.655]), [mx, my] = [cx + (m[0] / m[2]) * fv, cy + (m[1] / m[2]) * fv];
    const R = rect.h * 0.075 * (0.5 + 0.5 * fire), layers = [["#ff9a1f", 1], ["#ffd34d", 0.68], ["#fff3c2", 0.4], ["#ffffff", 0.2]];
    for (const [colr, k] of layers) {
      const pts = [];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + 0.2, spike = i % 2 === 0 ? 0.55 + 0.45 * ihash(i, kind === "m4" ? 701 : 702) : 0.3;
        const along = Math.cos(a - 3.6) > 0.6 ? 1.5 : 1; // longer toward the scene
        pts.push([mx + Math.cos(a) * R * k * spike * along, my + Math.sin(a) * R * k * spike * along * 0.8]);
      }
      O.poly(pts, colr);
    }
  }
}

// ───────────────────────────── overlays: crosshair, HUD, damage, death ─────────────────────────────
const ICON_RIFLE = [
  ".........#.++++....#.",
  "##..#################",
  "#######++++++++......",
  ".######..##.##.......",
  "........##...##......",
  "..............##.....",
];
const ICON_HEAD = ["..###..", ".#####.", "##.####", "#######", ".#####.", "..#.#..", "..###.."];
function gated(O, a) { if (a >= 1) return O; const g = Object.create(O); g.px = (x, y, c) => { if (a > bayer(Math.floor(x), Math.floor(y))) O.px(x, y, c); }; return g; }
function panel(O, x, y, w, h, k = 0.55, a = 1) {
  tintFast(O, x, y, x + w, y + h, (i, j) => ((i === x || i === x + w - 1) && (j === y || j === y + h - 1)) || a <= bayer(i, j) ? 0 : k, hex("#06080a"), 8);
}
// Blend buffer pixels toward rgb by k(x,y) (0..1), quantised to `steps` with ordered dither between steps.
function tintFast(O, x0, y0, x1, y1, kf, rgb, steps = 4) {
  x0 = Math.max(x0, O.x0); y0 = Math.max(y0, O.y0); x1 = Math.min(x1, O.x0 + O.bw); y1 = Math.min(y1, O.y0 + O.bh);
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    const v = kf(i, j); if (!(v > 0)) continue;
    const s0 = Math.min(1, v) * steps, lo = Math.floor(s0), t = (s0 - lo > bayer(i, j) ? lo + 1 : lo) / steps; if (t <= 0) continue;
    const k = (j - O.y0) * O.bw + (i - O.x0), c = O.col[k], r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    O.col[k] = (Math.round(r + (rgb[0] - r) * t) << 16) | (Math.round(g + (rgb[1] - g) * t) << 8) | Math.round(b + (rgb[2] - b) * t);
  }
}
function overlaysFP(O, rect, st, K) {
  const cx = Math.round(rect.x + rect.w / 2), cy = Math.round(rect.y + rect.h / 2);
  drawViewmodel(O, rect, st, K);
  // damage: red vignette + blood at the edges
  const hit = clamp(st.hit ?? 0, 0, 1);
  if (hit > 0) {
    const hw = rect.w / 2, hh = rect.h / 2;
    { // red vignette: a little everywhere, strong at the edges (6 dithered steps)
      const VR = 0x8e, VG = 0x0b, VB = 0x10;
      for (let j = 0; j < O.bh; j++) {
        const ny = (O.y0 + j + 0.5 - cy) / hh, ny2 = ny * ny;
        for (let i = 0; i < O.bw; i++) {
          const nx = (O.x0 + i + 0.5 - cx) / hw * 0.8, d = Math.sqrt(nx * nx + ny2), v = hit * (0.1 + 0.75 * clamp((d - 0.5) / 0.55, 0, 1));
          const s0 = v * 6, lo = Math.floor(s0), t = (s0 - lo > bayer(O.x0 + i, O.y0 + j) ? lo + 1 : lo) / 6; if (t <= 0) continue;
          const k = j * O.bw + i, c = O.col[k], r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
          O.col[k] = (Math.round(r + (VR - r) * t) << 16) | (Math.round(g + (VG - g) * t) << 8) | Math.round(b + (VB - b) * t);
        }
      }
    }
    // irregular splats hugging the edges: clustered droplets + a short drip streak, dissolved in one by one
    for (let s = 0; s < 10; s++) {
      const a = ihash(s, 801) * Math.PI * 2, ex = Math.cos(a), ey = Math.sin(a), m = Math.max(Math.abs(ex), Math.abs(ey));
      const bxp = cx + (ex / m) * hw * 0.97, byp = cy + (ey / m) * hh * 0.97, r = rect.h * (0.014 + 0.022 * ihash(s, 802)), thr = ihash(s, 803) * 0.55;
      const g = gated(O, clamp((hit - thr) * 3, 0, 1));
      for (let k = 0; k < 9; k++) {
        const aa = ihash(s, k, 804) * Math.PI * 2, dd = r * ihash(s, k, 805) * 1.1, rr = Math.max(1, Math.round(r * (0.35 + 0.5 * ihash(s, k, 806))));
        g.disc(Math.round(bxp + Math.cos(aa) * dd), Math.round(byp + Math.sin(aa) * dd), rr, "#5a060a");
      }
      for (let k = 0; k < 6; k++) {
        const aa = ihash(s, k, 807) * Math.PI * 2, dd = r * ihash(s, k, 808) * 0.8, rr = Math.max(0, Math.round(r * (0.2 + 0.3 * ihash(s, k, 809))));
        g.disc(Math.round(bxp + Math.cos(aa) * dd), Math.round(byp + Math.sin(aa) * dd), rr, "#86101a");
      }
      for (let k = 0; k < 8; k++) { // flung droplets toward the centre
        const aa = a + Math.PI + (ihash(s, k, 810) - 0.5) * 1.6, dd = r * (1.6 + ihash(s, k, 811) * 2.6);
        g.disc(Math.round(bxp + Math.cos(aa) * dd), Math.round(byp + Math.sin(aa) * dd), Math.max(0, Math.round(r * 0.14 * ihash(s, k, 812) + 0.3)), "#6e0810");
      }
      if (ey > 0.2) { const len = Math.round(r * (1 + 2 * ihash(s, 813))); g.rect(Math.round(bxp + r * 0.2), Math.round(byp), Math.max(1, Math.round(r * 0.18)), len, "#5a060a"); }
    }
  }
  // desaturate
  const gray = clamp(st.gray ?? 0, 0, 1);
  if (gray > 0) for (let j = 0; j < O.bh; j++) for (let i = 0; i < O.bw; i++) {
    const k = j * O.bw + i, v = O.col[k], r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255, l = 0.3 * r + 0.59 * g + 0.11 * b;
    const s = Math.floor(gray * 4 + bayer(i + O.x0, j + O.y0)) / 4; if (s <= 0) continue;
    O.col[k] = (Math.round(r + (l - r) * s) << 16) | (Math.round(g + (l - g) * s) << 8) | Math.round(b + (l - b) * s);
  }
  // crosshair + hit marker
  const ch = clamp(st.crosshair ?? 0, 0, 1);
  const th = Math.max(1, Math.round(rect.h / 480)), gap = Math.max(1, Math.round(rect.h * 0.0065)), len = Math.max(2, Math.round(rect.h * 0.014));
  if (ch > 0) {
    const g = gated(O, ch), o = Math.floor(th / 2);
    g.rect(cx - gap - len, cy - o, len, th, "#46f04a"); g.rect(cx + gap + 1, cy - o, len, th, "#46f04a");
    g.rect(cx - o, cy - gap - len, th, len, "#46f04a"); g.rect(cx - o, cy + gap + 1, th, len, "#46f04a");
  }
  const hm = clamp(st.hitmark ?? 0, 0, 1);
  if (hm > 0) {
    const g = gated(O, hm), r1 = gap + 2, r2 = gap + 2 + Math.round(len * 0.8);
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let d = r1; d <= r2; d++) for (let t = 0; t < th; t++) g.px(cx + sx * d + t, cy + sy * d, "#ffffff");
  }
  if (st.hud) drawHUD(O, rect, st.hud);
  const died = clamp(st.died ?? 0, 0, 1);
  if (died > 0) {
    const s = Math.max(1, Math.round(rect.h / 160)), txt = "YOU DIED", w = O.measure(MAIN, txt, { scale: s }), bh = Math.round(7 * s * 2.6);
    const g = gated(O, died);
    tintFast(O, Math.round(rect.x), cy - Math.round(bh / 2), Math.round(rect.x + rect.w), cy - Math.round(bh / 2) + bh, (i, j) => (died > bayer(i + 1, j + 3) ? 0.72 - 0.25 * Math.abs((j - cy) / (bh / 2)) ** 3 : 0), hex("#050203"), 6);
    g.text(MAIN, txt, Math.round(cx - w / 2), cy - Math.round((7 * s) / 2), "#d8212b", { scale: s, shadow: "#3e0507", shadowOffset: Math.max(1, Math.round(s / 2)) });
  }
}
function drawHUD(O, rect, hud) {
  const sF = rect.h / 320, tiny = sF < 0.75, F = tiny ? TINY : MAIN, s = tiny ? 1 : Math.max(1, Math.round(sF)), fh = F.height * s;
  const pad = Math.max(2, Math.round(rect.h * 0.022)), col = "#ffb52e", shd = "#4a2a06";
  const bot = Math.round(rect.y + rect.h - pad), L = Math.round(rect.x + pad), R = Math.round(rect.x + rect.w - pad);
  if (hud.hp != null) {
    const hp = String(Math.round(hud.hp)), ic = fh, tw = O.measure(F, hp, { scale: s }), w = ic + s * 3 + tw + s * 6, h = fh + s * 5;
    panel(O, L, bot - h, w, h);
    const ix = L + s * 3, iy = bot - h + Math.round((h - ic) / 2), t3 = Math.max(1, Math.round(ic / 3));
    O.rect(ix + t3, iy, ic - 2 * t3, ic, col); O.rect(ix, iy + t3, ic, ic - 2 * t3, col);
    O.text(F, hp, ix + ic + s * 3, bot - h + Math.round((h - fh) / 2), col, { scale: s, shadow: shd });
  }
  if (hud.ammo !== null) {
    const am = hud.ammo ?? [30, 90], txt = `${am[0]} / ${am[1]}`, tw = O.measure(F, txt, { scale: s }), w = tw + s * 6, h = fh + s * 5;
    panel(O, R - w, bot - h, w, h);
    O.text(F, txt, R - w + s * 3, bot - h + Math.round((h - fh) / 2), col, { scale: s, shadow: shd });
  }
  const kf = hud.kill;
  if (kf && (kf.alpha ?? 1) > 0) {
    const s2 = tiny ? 1 : Math.max(1, Math.round(rect.h / 480)), F2 = tiny ? TINY : MAIN, fh2 = F2.height * s2, g = gated(O, kf.alpha ?? 1);
    const killer = kf.killer ?? "ENEMY", victim = kf.victim ?? "YOU", gp = 3 * s2;
    const wk = O.measure(F2, killer, { scale: s2 }), wv = O.measure(F2, victim, { scale: s2 }), iw = ICON_RIFLE[0].length * s2, hw2 = kf.head ? ICON_HEAD[0].length * s2 + gp : 0;
    const w = wk + gp + iw + gp + hw2 + wv + 2 * gp, h = fh2 + 2 * gp, x0 = R - w, y0 = Math.round(rect.y + pad);
    panel(O, x0, y0, w, h, 0.68, kf.alpha ?? 1);
    const ol = Math.max(1, Math.round(s2 / 1.5));
    for (let k = 0; k < ol; k++) g.rframe(x0 + k, y0 + k, w - 2 * k, h - 2 * k, "#e2262e", 1);
    let x = x0 + gp; const ty = y0 + gp;
    g.text(F2, killer, x, ty, "#f2a33a", { scale: s2 }); x += wk + gp;
    const spr = (rows, X, Y, c1, c2) => rows.forEach((r, j) => [...r].forEach((chh, i) => { if (chh !== ".") g.rect(X + i * s2, Y + j * s2, s2, s2, chh === "#" ? c1 : c2); }));
    spr(ICON_RIFLE, x, ty + Math.round((fh2 - ICON_RIFLE.length * s2) / 2), "#e9e9e6", "#a9a9a4"); x += iw + gp;
    if (kf.head) { spr(ICON_HEAD, x, ty + Math.round((fh2 - ICON_HEAD.length * s2) / 2), "#e9e9e6", "#a9a9a4"); x += hw2; }
    g.text(F2, victim, x, ty, "#8cc6ff", { scale: s2 });
  }
}

// ───────────────────────────── (b) oblique 3/4 top-down "server map" ─────────────────────────────
// World (x, y, z) → screen: x' = x (+ z·MAP_SHEAR, 0 by default), y' = y − z·MAP_K (the viewer is south of the map and above).
// Visible: floor, block tops (rimmed) and south-facing fronts in a darker shade.
export const MAP_SHEAR = 0;
export const MAP_FIG = 0.9; // soldier height on the map = BODY_H · MAP_FIG · ppm (head ≈ feet − that many pixels)
export function projectMap(rect, cam, wx, wy, wz = 0) {
  return [rect.x + rect.w / 2 + (wx - cam.cx + wz * MAP_SHEAR) * cam.ppm, rect.y + rect.h / 2 + (wy - cam.cy - wz * MAP_K) * cam.ppm];
}
const mapDepth = (x, y, z) => MAP_SHEAR * x - MAP_K * y - z; // smaller = nearer to the viewer
// ── map-only rooftop dressing: parapets, plaster, sand drifts, props and a lower sun for long shadows ──
// (Props exist only on the server map; the first-person world and its shadows are untouched.)
const MSUN = (() => { const v = [-0.55, -0.835], n = Math.hypot(...v); return [v[0] / n, v[1] / n]; })(), MSUN_TAN = Math.tan((44 * Math.PI) / 180);
const ROOF_PROPS = [
  { k: "hatch", x0: 5.6, x1: 6.9, y0: 8.9, y1: 9.9, h: 0.95, door: 6.25 },
  { k: "room", x0: 4.2, x1: 7.4, y0: 12.4, y1: 15.6, h: 1.55, door: 5.3, win: 6.6 },
  { k: "tank", cx: 7.9, cy: 19.0, r: 0.56, h: 1.35, leg: 0.36 },
  { k: "rug", x0: 4.7, x1: 6.3, y0: 22.0, y1: 22.36, h: 0.32 },
  { k: "vent", x0: 8.3, x1: 8.85, y0: 25.5, y1: 26.05, h: 0.55 },
  { k: "crate", x0: 4.9, x1: 5.75, y0: 27.0, y1: 27.85, h: 0.85 },
  { k: "crate", x0: 16.0, x1: 16.9, y0: 9.9, y1: 10.8, h: 0.9 },
  { k: "crate", x0: 17.05, x1: 17.75, y0: 10.15, y1: 10.85, h: 0.7 },
  { k: "tank", cx: 20.7, cy: 13.0, r: 0.6, h: 1.4, leg: 0.36 },
  { k: "room", x0: 18.8, x1: 22.4, y0: 17.2, y1: 20.4, h: 1.6, win: 20.6 },
  { k: "vent", x0: 15.8, x1: 16.35, y0: 24.2, y1: 24.75, h: 0.5 },
  { k: "rug", x0: 18.6, x1: 20.2, y0: 26.3, y1: 26.66, h: 0.3, blue: true },
  { k: "hatch", x0: 20.9, x1: 22.1, y0: 27.5, y1: 28.4, h: 0.9 },
].map((p) => {
  const cx = p.cx ?? (p.x0 + p.x1) / 2, cy = p.cy ?? (p.y0 + p.y1) / 2, zb = heightAt(cx, cy);
  const q2 = { ...p, zb, zt: zb + p.h };
  if (p.k === "tank") Object.assign(q2, { x0: cx - p.r, x1: cx + p.r, y0: cy - p.r, y1: cy + p.r });
  return q2;
});
let ROOF = null;
function roofInit() {
  if (ROOF) return ROOF;
  const para = new Uint8Array(GW * GH), isRoof = (i) => H0[i] === 0 && H1[i] > 0 && MAT[i] === M_SAND;
  for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
    const i = cy * GW + cx; if (!isRoof(i)) continue;
    for (let dy = -1; dy <= 1 && !para[i]; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
      if (H1[y * GW + x] < H1[i] - 0.2) { para[i] = 1; break; }
    }
  }
  // lower-sun shadow heights (same azimuth family as the first-person sun, lower elevation → longer shadows)
  const sh = new Float32Array(SW * SH), drift = new Float32Array(SW * SH), plast = new Float32Array(SW * SH);
  for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
    const x = (i + 0.5) / SPM, y = (j + 0.5) / SPM;
    let s = 0;
    for (let d = 0.05; d < HMAX / MSUN_TAN + 0.1; d += 0.05) {
      const k = cellAt(x + MSUN[0] * d, y + MSUN[1] * d), h = k < 0 ? 9 : H0[k] === 0 ? H1[k] : 0;
      s = Math.max(s, h - d * MSUN_TAN);
    }
    sh[j * SW + i] = s;
    const c = cellAt(x, y); if (c < 0 || !isRoof(c) || para[c]) continue;
    const ccx = c % GW, ccy = (c / GW) | 0;
    const dist = (sx, sy) => { for (let n = 1; n <= 6; n++) { const xx = ccx + sx * n, yy = ccy + sy * n; if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) return 9; const k = yy * GW + xx; if (para[k] || !isRoof(k)) return sx > 0 ? xx / CPM - x : sx < 0 ? x - (xx + 1) / CPM : sy > 0 ? yy / CPM - y : y - (yy + 1) / CPM; } return 9; };
    const dX = Math.min(dist(1, 0), dist(-1, 0)), dY = Math.min(dist(0, 1), dist(0, -1)), dW = dist(-1, 0), dN = dist(0, -1);
    const corner = clamp(1 - dX / 0.95, 0, 1) * clamp(1 - dY / 0.95, 0, 1);
    const edge = clamp(1 - Math.min(dW, dN) / 0.45, 0, 1); // drifts pile against the windward (north / west) parapets
    drift[j * SW + i] = corner * 1.25 + edge * vnoise(x / 0.7, y / 0.7, 91) * 0.75 + (vnoise(x / 1.4, y / 1.4, 92) - 0.5) * 0.3;
    plast[j * SW + i] = vnoise(x / 2.3, y / 1.9, 93) + (vnoise(x / 0.6, y / 0.6, 94) - 0.5) * 0.12;
  }
  ROOF = { para, sh, drift, plast };
  return ROOF;
}
// Shadow from rooftop props (analytic, map sun): is the point at height z shaded by a prop?
function propShadow(x, y, z, list = ROOF_PROPS) {
  for (const p of list) {
    if (p.zt <= z) continue;
    const reach = (p.zt - z) / MSUN_TAN;
    // quick reject: the shadow lies within the prop footprint swept toward the lower right
    if (x < p.x0 - 0.05 || y < p.y0 - 0.05 || x > p.x1 - MSUN[0] * reach + 0.05 || y > p.y1 - MSUN[1] * reach + 0.05) continue;
    let dA, dB;
    if (p.k === "tank") {
      const ox = x - p.cx, oy = y - p.cy, b = ox * MSUN[0] + oy * MSUN[1], c2 = ox * ox + oy * oy - p.r * p.r, disc = b * b - c2;
      if (disc < 0) continue; dA = -b - Math.sqrt(disc); dB = -b + Math.sqrt(disc);
    } else {
      const tx0 = (p.x0 - x) / MSUN[0], tx1 = (p.x1 - x) / MSUN[0], ty0 = (p.y0 - y) / MSUN[1], ty1 = (p.y1 - y) / MSUN[1];
      dA = Math.max(Math.min(tx0, tx1), Math.min(ty0, ty1)); dB = Math.min(Math.max(tx0, tx1), Math.max(ty0, ty1));
    }
    if (dA <= dB && dB >= 0 && Math.max(0, dA) <= reach) return true;
  }
  return false;
}
// A prop surface hit along the pixel's line (x0, y0 + z·K, z). Returns the hit height or −1; fills _pc (packed colour).
let _pc = 0;
function propHit(p, x0, y0, X, Y, texPx) {
  const K = MAP_K;
  if (p.k === "tank") {
    const dx = x0 - p.cx; if (Math.abs(dx) > p.r) return -1;
    const zl = p.zb + p.leg, ty = y0 + p.zt * K - p.cy;
    if (dx * dx + ty * ty <= p.r * p.r) { // lid
      const rr = Math.hypot(dx, ty) / p.r;
      BAND = 0.26; _pc = shadeRGB(R_IRON, rr > 0.86 ? 6 : rr < 0.32 ? 6 + (ty < 0 ? 1 : 0) : 8 - (rr < 0.4 ? 2 : 0), 0, X, Y); return p.zt;
    }
    const yf = p.cy + Math.sqrt(p.r * p.r - dx * dx), zs = (yf - y0) / K;
    if (zs >= zl && zs <= p.zt) { // drum: cylindrical shading, light from the west, ribs
      const nx = dx / p.r; BAND = 0.26;
      let v = 5.6 - nx * 2.2 - Math.max(0, nx) * 0.6; if (Math.abs(((zs - zl) / (p.zt - zl)) * 3 % 1 - 0.5) > 0.44) v -= 1.2;
      _pc = shadeRGB(R_IRON, v, 0, X, Y, nx > 0.3 ? 1 : 0); return zs;
    }
    const lx = Math.abs(dx) / p.r, zs2 = (p.cy + p.r * 0.6 - y0) / K; // stand: two legs and a cross bar
    if (zs2 >= p.zb && zs2 <= zl && (lx > 0.62 && lx < 0.8 || (zs2 > zl - 0.08 && lx < 0.8))) { BAND = 0; _pc = shadeRGB(R_WOOD, 3, 0, X, Y, 1); return zs2; }
    return -1;
  }
  if (x0 < p.x0 || x0 > p.x1) return -1;
  const yt = y0 + p.zt * K;
  const top = yt >= p.y0 && yt <= p.y1, zs = (p.y1 - y0) / K, face = !top && zs >= p.zb && zs <= p.zt;
  if (!top && !face) return -1;
  const u = x0 - p.x0, w = p.x1 - p.x0, lev = lodOf(texPx), onePx = 1 / 28 * (28 / (TPM / texPx));
  BAND = bandOf(lev);
  if (p.k === "crate") {
    if (top) { samp(T_CRATETOP, (u / w) * T_CRATETOP.w, ((yt - p.y0) / (p.y1 - p.y0)) * T_CRATETOP.h, lev); _pc = shadeRGB(_r, _i + 1, 0, X, Y); }
    else { samp(T_CRATE, (u / w) * T_CRATE.w, ((zs - p.zb) / p.h) * T_CRATE.h, lev); _pc = shadeRGB(_r, _i - 1, 0, X, Y, 1); }
    return top ? p.zt : zs;
  }
  if (p.k === "rug") { // rolled rug: banded weave, rounded with light on top
    const band = Math.floor(u / 0.18), cream = (u % 0.18) < 0.03, ramp = p.blue ? R_BLUE : R_RUG;
    if (top) { const t = (yt - p.y0) / (p.y1 - p.y0); _pc = cream ? shadeRGB(R_DUST, 9, 0, X, Y) : shadeRGB(ramp, (band % 2 ? 6 : 5) + (t < 0.35 ? 1 : 0), 0, X, Y); }
    else _pc = cream ? shadeRGB(R_DUST, 6, 0, X, Y, 1) : shadeRGB(ramp, (band % 2 ? 4 : 3) - ((zs - p.zb) / p.h < 0.3 ? 1 : 0), 0, X, Y, 1);
    return top ? p.zt : zs;
  }
  if (p.k === "vent") {
    if (top) { const g = Math.floor(((yt - p.y0) / (p.y1 - p.y0)) * 6) % 2; _pc = shadeRGB(R_IRON, g ? 7 : 5, 0, X, Y); }
    else _pc = shadeRGB(R_IRON, Math.floor(((zs - p.zb) / p.h) * 5) % 2 ? 5 : 3, 0, X, Y, 1);
    return top ? p.zt : zs;
  }
  // hatch / roof room: sandstone box with a rimmed top, a dark doorway and a barred window
  if (top) {
    const e = Math.min(u, w - u, yt - p.y0, p.y1 - yt) * (TPM / texPx);
    samp(T_TOP, x0 * TPM, yt * TPM, lev);
    _pc = e < 1 ? shadeRGB(R_SAND, 2.4, 0, X, Y, 1) : e < 2 && (u < w / 2 || yt - p.y0 < 0.3) ? shadeRGB(R_SAND, 10, 0, X, Y) : e < 5 ? shadeRGB(R_SAND, 6, 0, X, Y) : shadeRGB(_r, _i + 1, 0, X, Y);
    return p.zt;
  }
  const zz = zs - p.zb;
  if (p.door != null && Math.abs(x0 - p.door) < 0.34 && zz < (p.k === "room" ? 1.15 : 0.72)) { _pc = Math.abs(x0 - p.door) > 0.29 || zz > (p.k === "room" ? 1.1 : 0.67) ? shadeRGB(R_WOOD, 3, 0, X, Y, 1) : shadeRGB(R_DARK, 1 + (zz > 0.4 ? 1 : 0), 0, X, Y); return zs; }
  if (p.win != null && Math.abs(x0 - p.win) < 0.3 && zz > 0.62 && zz < 1.12) { _pc = (Math.abs(x0 - p.win) > 0.25 || zz < 0.67 || zz > 1.07) ? shadeRGB(R_WOOD, 4, 0, X, Y, 1) : ((x0 - p.win + 0.3) % 0.15 < 0.04 ? shadeRGB(R_IRON, 4, 0, X, Y) : shadeRGB(R_DARK, 1.4, 0, X, Y)); return zs; }
  samp(T_SAND, x0 * TPM + 33, zz * TPM, lev);
  let v = _i - 1; if (zz < 0.25) v -= 1; if (zz > p.h - 0.05) v += 1;
  _pc = shadeRGB(R_SAND, v, 0, X, Y, 1);
  return zs;
}
// Roof surface (map): parapet band along every drop, lit outer edge, shadowed inner line, plaster, drifts, cracks.
const hAtC = (cx, cy) => H1[(cy < 0 ? 0 : cy >= GH ? GH - 1 : cy) * GW + (cx < 0 ? 0 : cx >= GW ? GW - 1 : cx)];
const pAtC = (R, cx, cy) => R.para[(cy < 0 ? 0 : cy >= GH ? GH - 1 : cy) * GW + (cx < 0 ? 0 : cx >= GW ? GW - 1 : cx)];
function roofColor(R, cell, cxi, cyi, wx, wy, h1, ppm, texPx, X, Y, shadowProps) {
  const lev = lodOf(texPx); BAND = bandOf(lev);
  const hAt = hAtC, P = R.para;
  const pAt = (cx, cy) => P[(cy < 0 ? 0 : cy >= GH ? GH - 1 : cy) * GW + (cx < 0 ? 0 : cx >= GW ? GW - 1 : cx)];
  const dN = (wy - cyi / CPM) * ppm, dS = ((cyi + 1) / CPM - wy) * ppm, dW = (wx - cxi / CPM) * ppm, dE = ((cxi + 1) / CPM - wx) * ppm;
  const shaded = shQ(wx, wy, h1) >= bayer(X + 2, Y) || (shadowProps.length > 0 && propShadow(wx, wy, h1, shadowProps));
  if (R.para[cell]) {
    const lowN = hAt(cxi, cyi - 1) < h1 - 0.2, lowS = hAt(cxi, cyi + 1) < h1 - 0.2, lowW = hAt(cxi - 1, cyi) < h1 - 0.2, lowE = hAt(cxi + 1, cyi) < h1 - 0.2;
    const inN = !lowN && !pAt(cxi, cyi - 1), inS = !lowS && !pAt(cxi, cyi + 1), inW = !lowW && !pAt(cxi - 1, cyi), inE = !lowE && !pAt(cxi + 1, cyi);
    BAND = 0;
    if ((lowN && dN < 1) || (lowE && dE < 1) || (lowW && dW < 1) || (lowS && dS < 1)) return shadeRGB(R_SAND, 2.4, 0, X, Y, 1);       // outline at the drop
    if ((lowN && dN < 2) || (lowW && dW < 2)) return shadeRGB(R_SAND, 10, 0, X, Y);                                                   // lit top edge
    if ((lowS && dS < 2) || (lowE && dE < 2)) return shadeRGB(R_SAND, 8, 0, X, Y, shaded ? 1 : 0);
    if ((inN && dN < 1) || (inS && dS < 1) || (inW && dW < 1) || (inE && dE < 1)) return shadeRGB(R_SAND, 3.4, 0, X, Y, 1);         // inner line
    const joint = ((Math.floor(wx * 2) + Math.floor(wy * 2)) & 1) === 0 && ((wx * 2) % 1) * ppm / 2 < 1 && (lowN || lowS || inN || inS);
    return shadeRGB(R_SAND, (joint ? 4 : 6) - (shaded ? 1 : 0) + (ihash(Math.floor(wx * 2), Math.floor(wy * 2), 95) > 0.8 ? -1 : 0), 0, X, Y, shaded ? 1 : 0);
  }
  // parapet shadow on the roof: wide below north / west parapets, a thin dark line below south / east ones
  const pN = pAt(cxi, cyi - 1), pW = pAt(cxi - 1, cyi), pS = pAt(cxi, cyi + 1), pE = pAt(cxi + 1, cyi);
  const k16 = clamp(Math.floor(wy * SPM), 0, SH - 1) * SW + clamp(Math.floor(wx * SPM), 0, SW - 1);
  let ramp = R_SAND, v;
  const dr = R.drift[k16];
  if (dr > 0.6 + (bayer(X, Y + 1) - 0.5) * 0.12) { samp(T_DUST, wx * TPM, wy * TPM, lev); ramp = R_DUST; v = _i + (dr > 1.0 ? 1 : 0); } // wind-blown sand
  else {
    samp(T_TOP, wx * TPM, wy * TPM, lev); v = _i;
    if (R.plast[k16] > 0.76 + (bayer(X + 1, Y) - 0.5) * 0.03) v += 1;   // smoother, paler plaster patch
  }
  let cool = 0;
  if (shaded) { v -= 2; cool = 1; }
  else if ((pN && dN < 3 + bayer(X, Y) * 2) || (pW && dW < 3 + bayer(X, Y) * 2)) { v -= 2; cool = 1; }
  if ((pS && dS < 1) || (pE && dE < 1) || (pN && dN < 1) || (pW && dW < 1)) { v = 3.4; ramp = R_SAND; cool = 1; }
  return shadeRGB(ramp, v, 0, X, Y, cool);
}
function castMap(B, rect, cam) {
  const R = roofInit();
  const ppm = cam.ppm, rcx = rect.x + rect.w / 2, rcy = rect.y + rect.h / 2, texPx = TPM / ppm, SH = MAP_SHEAR, K = MAP_K, Zs = HMAX + 0.01;
  // props whose screen box touches each row
  const pbox = ROOF_PROPS.map((p) => ({ p, sx0: rcx + (p.x0 - cam.cx) * ppm - 1, sx1: rcx + (p.x1 - cam.cx) * ppm + 1, sy0: rcy + (p.y0 - p.zt * K - cam.cy) * ppm - 1, sy1: rcy + (p.y1 - p.zb * K - cam.cy) * ppm + 1 }));
  for (let Y = B.y0; Y < B.y0 + B.bh; Y++) {
    const y0 = cam.cy + (Y + 0.5 - rcy) / ppm, rowProps = pbox.filter((b) => Y >= b.sy0 && Y <= b.sy1);
    // props whose shadow can reach a roof point seen on this row (roof heights ≥ 3 m)
    const ya = y0 + 3.0 * K - 0.1, yb2 = y0 + HMAX * K + 0.1;
    const rowShadow = ROOF_PROPS.filter((p) => p.y0 - 0.1 <= yb2 && p.y1 - MSUN[1] * ((p.zt - 3.0) / MSUN_TAN) + 0.1 >= ya);
    for (let X = B.x0; X < B.x0 + B.bw; X++) {
      const x0 = cam.cx + (X + 0.5 - rcx) / ppm, k = (Y - B.y0) * B.bw + (X - B.x0);
      let z = Zs, cx = Math.floor((x0 - z * SH) * CPM), cy = Math.floor((y0 + z * K) * CPM), entered = -1, colr = -1, dpt = 0, hz = 0;
      for (let guard = 0; guard < 64; guard++) {
        const zx = SH > 0 ? (x0 - (cx + 1) / CPM) / SH : -Infinity, zy = (cy / CPM - y0) / K, zN = Math.max(zx, zy, 0);
        const cell = clamp(cy, 0, GH - 1) * GW + clamp(cx, 0, GW - 1), h1 = H1[cell], h0 = H0[cell];
        if (h1 > 0) {
          if (entered >= 0 && z >= h0 && z <= h1) { // a vertical face
            const wx = x0 - z * SH, wy = y0 + z * K;
            colr = faceColor(cell, entered, entered === 2 ? wy : wx, z, wx, wy, 0, texPx, X, Y);
            if (z < 0.05) colr = shadeRGB(R_SAND, 2.2, 0, X, Y, 1);
            dpt = mapDepth(wx, wy, z); hz = z; break;
          }
          if (h1 < z && h1 >= zN) { // the top
            const wx = x0 - h1 * SH, wy = y0 + h1 * K, ccx = clamp(cx, 0, GW - 1), ccy = clamp(cy, 0, GH - 1);
            colr = MAT[cell] === M_SAND && h0 === 0 ? roofColor(R, cell, ccx, ccy, wx, wy, h1, ppm, texPx, X, Y, rowShadow) : topColor(cell, wx, wy, h1, 0, texPx, X, Y);
            dpt = mapDepth(wx, wy, h1); hz = h1; break;
          }
        }
        if (zN <= 0) break;
        if (zx >= zy) { cx++; entered = 2; } else { cy--; entered = 1; }
        z = zN;
      }
      if (colr < 0) { colr = floorColor(x0, y0, 0, texPx, X, Y); dpt = mapDepth(x0, y0, 0); }
      for (const b of rowProps) {
        if (X < b.sx0 || X > b.sx1) continue;
        const zh = propHit(b.p, x0, y0, X, Y, texPx);
        if (zh > hz) { hz = zh; colr = _pc; dpt = mapDepth(x0, y0 + zh * K, zh); }
      }
      B.col[k] = colr; B.dep[k] = dpt;
    }
  }
}
export function drawMap(c, rect, clip, st = {}) {
  const reg = regionOf(c, rect, clip); if (!reg) return;
  const [x0, y0, x1, y1] = reg, w = x1 - x0, h = y1 - y0, cam = st.cam ?? { cx: 12, cy: 17, ppm: 28 };
  const sp = scratch("map", w * h, false), B = new Buf(x0, y0, w, h, c.w, c.h, sp.col, sp.dep);
  SH_CUR = roofInit().sh; SH_SOFT = 0.1;
  try { castMap(B, rect, cam); } finally { SH_CUR = SHADOW; SH_SOFT = 0.05; }
  const actors = [...(st.actors ?? [])].filter((a) => (a.alpha ?? 1) > 0).sort((a, b) => mapDepth(b.x, b.y, 0) - mapDepth(a.x, a.y, 0));
  for (const a of actors) {
    const [fx, fy] = projectMap(rect, cam, a.x, a.y, 0), al = a.alpha ?? 1, ppm = cam.ppm, hpx = BODY_H * MAP_FIG * ppm, dFeet = mapDepth(a.x, a.y, 0);
    // soft cast shadow toward the lower right (sun from the north-west)
    const sx = fx + 0.22 * ppm, sy = fy + 0.12 * ppm, rx = 0.42 * ppm, ry = 0.17 * ppm;
    for (let j = Math.floor(sy - ry); j <= Math.ceil(sy + ry); j++) for (let i = Math.floor(sx - rx); i <= Math.ceil(sx + rx); i++) {
      const d = ((i + 0.5 - sx) / rx) ** 2 + ((j + 0.5 - sy) / ry) ** 2; if (d > 1) continue;
      if (i < B.x0 || j < B.y0 || i >= B.x0 + B.bw || j >= B.y0 + B.bh) continue;
      const kk = (j - B.y0) * B.bw + (i - B.x0); if (B.dep[kk] < dFeet - 0.3) continue;
      if (al * (d < 0.55 ? 1 : 0.6) <= bayer(i, j)) continue;
      const v = B.col[kk]; B.col[kk] = (Math.round(((v >> 16) & 255) * 0.6) << 16) | (Math.round(((v >> 8) & 255) * 0.58) << 8) | Math.round((v & 255) * 0.66);
    }
    drawSoldier(B, fx, fy, hpx, {
      team: a.team, yaw: Math.PI / 2 - (a.face ?? 0), run: a.run ?? null, aim: a.aim ?? 0, alpha: al, hit: a.hit ?? 0,
      depthGate: (X, Y) => {
        const kk = (Math.floor(Y) - B.y0) * B.bw + (Math.floor(X) - B.x0); if (kk < 0 || kk >= B.bw * B.bh) return true;
        const za = clamp(((fy - Y) / hpx) * BODY_H, 0, BODY_H);
        return B.dep[kk] >= dFeet - za - 0.15;
      },
    });
  }
  flush(c, B);
}
