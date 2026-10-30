// Screen-space effects for «Why is a dog's nose always cold and wet?»: the «thermal camera» palette, the lens smear of the
// boop, smell particles, counters. Pure functions; everything appears and disappears through dithered alpha.
import { bayer, mix, fade, MAIN } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- thermal palette (cold → hot), banded with Bayer dithering
export const THERMAL = ["#0A0624", "#1C0C5A", "#2A2296", "#2050C8", "#1EA0D8", "#6A3AA8", "#B0287A", "#E0403A", "#F67C1E", "#FCC02A", "#FFF07A", "#FFFFE0"];
const TH = THERMAL.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
/** palette colour for temperature v 0..1 at pixel (x, y) (dithered between neighbouring bands) */
export function thermalAt(v, x, y) { const s = clamp01(v) * (TH.length - 1), i = Math.floor(s), f = s - i; return TH[Math.min(TH.length - 1, f > bayer(x, y) ? i + 1 : i)]; }

/**
 * Re-colour canvas c as a thermal image. temp(x, y, lum) → 0..1 decides each pixel's temperature (lum = 0..1 brightness
 * of the normal picture, so textures still read). k 0..1 = how much of the frame is thermal (dithered dissolve);
 * region limits the work.
 */
export function thermal(c, temp, k = 1, x0 = 0, y0 = 0, x1 = c.w, y1 = c.h) {
  if (k <= 0) return; const d = c.d, w = c.w;
  for (let y = Math.max(0, y0); y < Math.min(c.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
    if (k < 1 && k <= bayer(x, y)) continue;
    const i = (y * w + x) * 3, lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255, col = thermalAt(temp(x, y, lum), x, y);
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
  }
}

/** A mask of where an actor is: draw it onto a key-coloured canvas and compare. Returns Uint8Array(w·h) (1 = actor). */
export function actorMask(Canvas, w, h, draw) {
  const k = new Canvas(w, h, "#FF00FF"); draw(k); const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { const r = k.d[i * 3], g = k.d[i * 3 + 1], b = k.d[i * 3 + 2]; m[i] = r === 255 && g === 0 && b === 255 ? 0 : 1; }
  return m;
}

// ---------------------------------------------------------------- the boop: wet smear on the «lens»
/** k 0..1 strength; a few soft wet blobs with highlights around the centre (screen space) */
export function smear(c, k, cx = 270, cy = 470) {
  if (k <= 0) return;
  const blobs = [[0, 0, 70], [-46, 30, 34], [52, -22, 30], [18, 58, 22], [-30, -50, 20], [64, 40, 14]];
  for (const [bx, by, r] of blobs) {
    const x0 = cx + bx, y0 = cy + by;
    for (let y = R(y0 - r); y <= R(y0 + r); y++) for (let x = R(x0 - r); x <= R(x0 + r); x++) {
      const dd = ((x - x0) ** 2 + (y - y0) ** 2) / (r * r); if (dd > 1) continue;
      const a = k * (1 - dd) * 0.5; if (a <= bayer(x, y) * 0.9) continue;
      const cur = c.get(x, y); c.px(x, y, mix(cur, "#E8F6FF", 0.35 + 0.25 * (1 - dd)));
      if (dd > 0.72 && dd < 0.86 && (x - x0) < 0 && (y - y0) < 0 && k > 0.4) c.px(x, y, "#FFFFFF");
    }
  }
}

// ---------------------------------------------------------------- smell particles
export const SMELL_COLS = ["#FF8AD8", "#7FE3F0", "#F4CA50", "#9CFF7A", "#C49AF0", "#FFB07A"];
/** n particles with stable random starts; each is {seed, x0, y0, col} in 0..1 box space */
export function particles(n, seed = 1) { const out = []; for (let i = 0; i < n; i++) out.push({ seed: seed * 100 + i, x0: rnd(seed * 31 + i * 7), y0: rnd(seed * 17 + i * 13), col: SMELL_COLS[i % SMELL_COLS.length], ph: rnd(i * 5 + seed) }); return out; }
/** draw a particle as a tiny glowing 2×2 bit with a lighter core */
export function bit(c, x, y, col, a = 1) { if (a <= 0) return; const g = fade(c, a); g.rect(R(x) - 1, R(y) - 1, 3, 3, mix(col, "#000000", 0.35)); g.rect(R(x) - 1, R(y) - 1, 2, 2, col); g.px(R(x) - 1, R(y) - 1, mix(col, "#FFFFFF", 0.6)); }

// ---------------------------------------------------------------- big comic word (BOOP!)
export function comic(c, text, x, y, a, col, scale = 7, tilt = 0) {
  if (a <= 0) return; const g = fade(c, a), w = c.measure(MAIN, text, { scale });
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2], [3, 3], [-2, -2], [2, -2], [-2, 2]]) g.text(MAIN, text, R(x - w / 2) + dx, R(y) + dy, "#0B0812", { scale });
  g.text(MAIN, text, R(x - w / 2), R(y), col, { scale });
}
