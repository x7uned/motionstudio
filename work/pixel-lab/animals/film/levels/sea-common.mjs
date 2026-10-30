// Shared helpers for the sea column and the shore (levels/sea.mjs, levels/shore.mjs): static world-space caches
// (drawn once into an offscreen Canvas, copied row by row each frame), the underwater depth tint, and the loop clock.
import { Canvas, mix, hex, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { END } from "../timeline.mjs";

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
