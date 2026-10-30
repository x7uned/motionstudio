// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals/film/levels/sea-common.mjs (stamp, makeCache, depth tint), sea-life.mjs (drawKelp,
// drawGrass, drawTubeWorm, drawAnemone) and sea-terrain.mjs (sandPx, scallop, spiral, brainCoral, staghorn, plateCoral, tubes).
// Changes: END (loop clock) is a local constant (30 s), imports point to catalog libs; the code is otherwise unchanged.
import { Canvas, mix, hex, bayer } from "../../../../../renderer/pixel/raster.mjs";

const END = 30;
export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- loop clock: every ambient motion is periodic over END
/** Angle of a motion that repeats n times per film (integer n) → identical at t = 0 and t = END. */
export const ang = (t, n, ph = 0) => (2 * Math.PI * n * t) / END + ph;
export const osc = (t, n, ph = 0) => Math.sin(ang(t, n, ph));
/** Phase 0..1 of a cycle that repeats n times per film. */
export const cyc = (t, n, ph = 0) => { const v = (t * n) / END + ph; return v - Math.floor(v); };
/** Periodic blink (0 open → 1 closed, ~0.2 s), n blinks per film. */
export function blinkP(t, n, ph = 0) { const every = END / n, p = (((t + ph) % every) + every) % every, d = 0.2; return p < d ? Math.sin((Math.PI * p) / d) : 0; }

// ---------------------------------------------------------------- static caches
const SENT = [1, 2, 3];
/** Offscreen world-space layer: draw on K.g with world coordinates; blit(c, V, K) copies the non-empty pixels. */
export function makeCache(x0, y0, w, h) {
  const cv = new Canvas(w, h, "#010203"), g = Object.create(cv);
  g.px = (x, y, col) => cv.px(x - x0, y - y0, col);
  g.get = (x, y) => cv.get(x - x0, y - y0);
  return { cv, g, x0, y0, w, h };
}
export function blit(c, V, K) {
  const ox = V.X(K.x0), oy = V.Y(K.y0), sx0 = Math.max(0, ox), sx1 = Math.min(c.w, ox + K.w), sy0 = Math.max(0, oy), sy1 = Math.min(c.h, oy + K.h);
  if (sx0 >= sx1 || sy0 >= sy1) return;
  const d = c.d, s = K.cv.d, W = c.w, KW = K.w;
  for (let y = sy0; y < sy1; y++) {
    let si = ((y - oy) * KW + (sx0 - ox)) * 3, di = (y * W + sx0) * 3;
    for (let x = sx0; x < sx1; x++, si += 3, di += 3) { const r = s[si], g = s[si + 1], b = s[si + 2]; if (r === 1 && g === 2 && b === 3) continue; d[di] = r; d[di + 1] = g; d[di + 2] = b; }
  }
}
/** Is the pixel of the cache at world (x, y) empty? */
export function empty(K, x, y) { const kx = x - K.x0, ky = y - K.y0; if (kx < 0 || ky < 0 || kx >= K.w || ky >= K.h) return true; const i = (ky * K.w + kx) * 3, s = K.cv.d; return s[i] === 1 && s[i + 1] === 2 && s[i + 2] === 3; }

// ---------------------------------------------------------------- underwater depth tint (fixed to the world, dawn sea)
// Things under the surface drift toward the water colour of their depth: bright teal near the surface, navy at the floor.
const TINT = [[0, "#4AB8D0", 0.1], [260, "#2A8AB8", 0.2], [800, "#1A5490", 0.32], [1400, "#13336A", 0.4], [1900, "#0E2452", 0.44]];
// the wrapped copy under the night city (V.dive): night water near the surface, identical to the dawn tint below y 1150
const TINT_N = [[0, "#3A4488", 0.34], [300, "#26306E", 0.4], [800, "#182A62", 0.42], [1150, null, null]];
function lerpT(tab, wy) {
  for (let i = 0; i < tab.length - 1; i++) { const [a, ca, ka] = tab[i], [b, cb, kb] = tab[i + 1]; if (wy <= b) { const k = (wy - a) / (b - a); return [mix(ca, cb, k), lerp(ka, kb, k)]; } }
  const L = tab[tab.length - 1]; return [hex(L[1]), L[2]];
}
export function tintAt(wy, night = false) {
  if (wy < 0) return null;
  if (night && wy < 1150) { const day = lerpT(TINT, 1150); const tab = TINT_N.map((r) => (r[1] ? r : [r[0], day[0], day[1]])); return lerpT(tab, wy); }
  return lerpT(TINT, wy);
}
const dcache = new Map();
/** Colour `col` seen at world depth wy (quantised to 20 px bands, cached); night = the dive copy. */
export function dcol(col, wy, night = false) {
  const band = wy < 0 ? -1 : Math.floor(wy / 20), key = col + "|" + band + (night ? "n" : ""); let v = dcache.get(key);
  if (!v) { const T = tintAt(band * 20 + 10, night); v = T ? mix(col, T[0], T[1]) : hex(col); dcache.set(key, v); }
  return v;
}
/** Apply the depth tint to every filled pixel of a cache below the surface. */
export function tintCache(K, extra = 0, night = false) {
  const s = K.cv.d;
  for (let ky = 0; ky < K.h; ky++) {
    const wy = K.y0 + ky, T = tintAt(wy, night); if (!T) continue; const [tc, k] = T, kk = Math.min(1, k + extra);
    for (let kx = 0; kx < K.w; kx++) { const i = (ky * K.w + kx) * 3; if (s[i] === 1 && s[i + 1] === 2 && s[i + 2] === 3) continue; s[i] = R(s[i] + (tc[0] - s[i]) * kk); s[i + 1] = R(s[i + 1] + (tc[1] - s[i + 1]) * kk); s[i + 2] = R(s[i + 2] + (tc[2] - s[i + 2]) * kk); }
  }
}

// ---------------------------------------------------------------- stamp: crisp outlined shape (bones, shells, small props)
/**
 * Draw a shape mask with `draw(m)` (m is a small Canvas in local coords, paint with any colour), then composite it onto g at
 * (ox, oy): filled pixels get `fill(x, y, edgeTop, edgeBottom)` (or a 3-tone top-lit default), outside neighbours `outline`.
 */
export function stamp(g, ox, oy, w, h, draw, { base = "#E8DCC0", light = "#FFF6E0", shade = "#B8A888", outline = "#2A2030", fill = null, a = 1 } = {}) {
  const m = new Canvas(w + 2, h + 2, "#000000"), mm = Object.create(m); mm.px = (x, y, col) => m.px(x + 1, y + 1, col); draw(mm);
  const on = (x, y) => x >= 0 && y >= 0 && x < w + 2 && y < h + 2 && m.d[(y * (w + 2) + x) * 3] > 0;
  for (let y = 0; y < h + 2; y++) for (let x = 0; x < w + 2; x++) {
    const X = ox + x - 1, Y = oy + y - 1; if (a < 1 && a <= bayer(X, Y)) continue;
    if (on(x, y)) { const top = !on(x, y - 1), bot = !on(x, y + 1); g.px(X, Y, fill ? fill(X, Y, top, bot) : top ? light : bot ? shade : base); }
    else if (outline && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) g.px(X, Y, outline);
  }
}

// ---------------------------------------------------------------- shared sand palette (sea floor ↔ shore slope)
export const SAND = { lip: "#F6E2B4", top: "#E8CC94", mid: "#D6B47C", low: "#BE9866", deep: "#A07E54", dark: "#7E6040", wet: "#B89468", wetDark: "#8E7050" };
export { mix, hex, bayer };
const dcolD = (col, wy) => dcol(col, wy, false);
/** Kelp stalk from (x, y) up to height h; t for sway. */
export function drawKelp(c, x, y, h, t, ph, wy) {
  const stem = dcolD("#5A6A1A", wy), leaf = dcolD("#8AA03A", wy), leafL = dcolD("#B8CC5A", wy), dark = dcolD("#2E3A10", wy), bulb = dcolD("#C8B84A", wy);
  const X = (s) => x + Math.sin(ang(t, 7, ph) + s * 0.018) * 12 * (s / h) ** 1.3 + Math.sin(ang(t, 17, ph * 2) + s * 0.05) * 2 * (s / h);
  for (let s = 0; s < h; s++) { const px = R(X(s)), py = y - s; c.px(px - 1, py, dark); c.px(px, py, stem); c.px(px + 1, py, dark); }
  for (let s = 14, k = 0; s < h - 6; s += 15, k++) {
    const side = k % 2 ? 1 : -1, px = X(s), py = y - s, len = 16 + (k % 3) * 4, lift = 0.55 + 0.2 * Math.sin(ang(t, 11, ph + k));
    for (let i = 0; i < len; i++) { const lx = px + side * i * Math.cos(lift), ly = py - i * Math.sin(lift) + Math.sin(i * 0.5) * 0.6, wdt = Math.max(0, Math.sin((i / len) * Math.PI) * 3.4); for (let j = -R(wdt); j <= R(wdt); j++) c.px(R(lx), R(ly + j), Math.abs(j) === R(wdt) ? dark : j < 0 ? leafL : leaf); }
    c.px(R(px + side * 2), R(py - 1), bulb); c.px(R(px + side * 2), R(py), bulb);
  }
}
/** Sea grass clump at (x, y): n blades. */
export function drawGrass(c, x, y, n, hgt, t, ph, wy, cols = ["#2E8A6A", "#4AB48A", "#1A5A48"]) {
  const [mid, lit, dark] = cols.map((q) => dcolD(q, wy));
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 4 + rnd(i + ph * 7) * 3, h = hgt * (0.6 + rnd(i * 3 + ph) * 0.5), lean = (rnd(i * 5 + ph) - 0.5) * 0.6;
    for (let s = 0; s < h; s++) { const k = s / h, px = bx + lean * s + Math.sin(ang(t, 13, ph + i * 0.7) + s * 0.08) * 5 * k * k; c.px(R(px), y - s, k > 0.7 ? lit : mid); if (k < 0.75) c.px(R(px) + 1, y - s, dark); }
  }
}
/** Christmas-tree tube worm pair at (x, y): out 0..1 (extended). */
export function drawTubeWorm(c, x, y, col, out, wy) {
  const C1 = dcolD(col, wy), C2 = dcolD(mix(col, "#FFFFFF", 0.45), wy), T = dcolD("#E8DCC8", wy), TD = dcolD("#9A8C7C", wy);
  c.rect(x - 2, y - 6, 5, 6, T); c.rect(x + 2, y - 6, 1, 6, TD); c.rect(x - 2, y - 7, 5, 1, TD);
  if (out < 0.05) return;
  for (const s of [-1, 1]) { const h = 11 * out, cx = x + s * 3.2; for (let j = 0; j < h; j++) { const w = (1 - j / h) * 3.6 * out; for (let i = -R(w); i <= R(w); i++) c.px(R(cx + i), R(y - 7 - j), (j + i + 20) % 3 === 0 ? C2 : C1); } }
}
/** Sea anemone at (x, y): column + swaying tentacles. */
export function drawAnemone(c, x, y, t, ph, wy, col = "#F07AA8", tip = "#FFE2EA") {
  const C = dcolD(col, wy), T = dcolD(tip, wy), D = dcolD(mix(col, "#2A0A18", 0.45), wy), body = dcolD(mix(col, "#F8C890", 0.35), wy);
  for (let j = 0; j < 9; j++) { const w = 7 - j * 0.15; for (let i = -R(w); i <= R(w); i++) c.px(x + i, y - j, Math.abs(i) === R(w) ? D : i < -2 ? mix(body, "#FFFFFF", 0.2) : body); }
  for (let k = 0; k < 15; k++) {
    const a0 = -Math.PI / 2 + (k / 14 - 0.5) * 2.4, len = 14 + (k % 3) * 3, sw = Math.sin(ang(t, 15, ph + k * 0.4)) * 0.25;
    for (let s = 0; s < len; s++) { const a = a0 + sw * (s / len) + Math.sin(s * 0.3 + k) * 0.08, X = R(x + Math.cos(a) * (s * 0.95) + (k - 7) * 0.6), Y = R(y - 9 + Math.sin(a) * s); c.px(X, Y, s > len - 3 ? T : C); if (s < len - 3) c.px(X + 1, Y, D); }
  }
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
export function scallop(g, x, y, col) {
  stamp(g, x - 8, y - 9, 16, 10, (m) => { for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; m.line(8, 9, R(8 + Math.cos(a) * 8), R(9 + Math.sin(a) * 9), "#fff"); } m.rect(6, 8, 5, 2, "#fff"); },
    { base: col, light: mix(col, "#FFFFFF", 0.45), shade: mix(col, "#5A2030", 0.35), outline: "#4A2030", fill: (X, Y, top) => top ? mix(col, "#FFFFFF", 0.45) : (X - x) % 3 === 0 ? mix(col, "#8A3050", 0.3) : col });
}
export function spiral(g, x, y) {
  stamp(g, x - 7, y - 10, 14, 10, (m) => { m.poly([[0, 10], [3, 3], [8, 0], [12, 3], [14, 10]], "#fff"); }, { base: "#E8C890", light: "#FFF0D0", shade: "#B08A5A", outline: "#4A3020", fill: (X, Y, top) => top ? "#FFF0D0" : (X + Y) % 5 === 0 ? "#B08A5A" : "#E8C890" });
}

export function brainCoral(g, x, y, r, col) {
  stamp(g, x - r, y - r, r * 2, r + 1, (m) => m.ellipse(r, r, r, r, "#fff"), { outline: "#2A2030", fill: (X, Y, top) => { const v = Math.sin((X - x) * 0.9 + Math.sin((Y - y) * 0.7) * 2); return top ? mix(col, "#FFFFFF", 0.4) : v > 0.55 ? mix(col, "#2A4020", 0.35) : (Y - (y - r)) / r > 0.7 ? mix(col, "#2A4020", 0.18) : col; } });
}
export function staghorn(g, x, y, col, s = 1) {
  const branches = [[0, 0, -4, -26], [-4, -26, -12, -38], [-4, -26, 2, -40], [0, -10, 10, -24], [10, -24, 14, -34], [10, -24, 6, -32], [-2, -14, -12, -20]];
  stamp(g, x - 18, y - 44, 36, 46, (m) => { for (const [a, b, c2, d] of branches) { const p = [R(18 + a * s), R(44 + b * s)], q = [R(18 + c2 * s), R(44 + d * s)]; m.line(p[0], p[1], q[0], q[1], "#fff"); m.line(p[0] + 1, p[1], q[0] + 1, q[1], "#fff"); m.line(p[0] + 2, p[1], q[0] + 2, q[1], "#fff"); } },
    { base: col, light: mix(col, "#FFF4E0", 0.5), shade: mix(col, "#3A1020", 0.3), outline: "#3A1828", fill: (X, Y, top) => top ? mix(col, "#FFF4E0", 0.55) : (X & 1) ? col : mix(col, "#3A1020", 0.15) });
}
export function plateCoral(g, x, y, col) { stamp(g, x - 16, y - 4, 26, 8, (m) => { m.ellipse(12, 3, 12, 3, "#fff"); }, { base: col, light: mix(col, "#FFFFFF", 0.45), shade: mix(col, "#2A1040", 0.35), outline: "#2A1838" }); }
export function tubes(g, x, y, col) {
  for (const [dx, h, w] of [[-6, 22, 5], [0, 30, 6], [7, 18, 5]]) stamp(g, x + dx - w, y - h, w * 2, h, (m) => m.rect(0, 0, w * 2, h, "#fff"), {
    outline: "#2A1838", fill: (X, Y, top) => { const u = (X - (x + dx - w)) / (2 * w); return top ? "#2A1838" : Y - (y - h) < 2 ? mix(col, "#FFFFFF", 0.4) : u < 0.3 ? mix(col, "#FFFFFF", 0.25) : u > 0.75 ? mix(col, "#2A1040", 0.3) : col; } });
  for (const [dx, h, w] of [[-6, 22, 5], [0, 30, 6], [7, 18, 5]]) g.ellipse(x + dx, y - h + 1, w - 2, 1, "#2A1838");
}