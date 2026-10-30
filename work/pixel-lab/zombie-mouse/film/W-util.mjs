// «The last person alive» — Builder W helpers: value noise, banded quantisation, masked strips (offscreen sprites with
// alpha) and a fast masked blit. Pure functions only (rnd from layout.mjs, never Math.random).
import { Canvas, hex, bayer } from "../../../../renderer/pixel/raster.mjs";
import { rnd, lerp, clamp01 } from "./layout.mjs";

// ---------------------------------------------------------------- noise
const h2 = (x, y) => rnd((x * 7919) ^ (y * 104729) ^ 0x5bd1e995);
export const hash2 = h2;
/** A well-mixed integer hash → [0, 1) (murmur-style finaliser; no streaks along rows or columns). */
export const hash2s = (x, y) => { let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul((y | 0) + 0x9e3779b9, 0x165667b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export const fbm = (x, y) => 0.55 * vnoise(x, y) + 0.3 * vnoise(x * 2.1 + 17, y * 2.1 + 5) + 0.15 * vnoise(x * 4.3 + 3, y * 4.3 + 29);
/** Cellular noise: [F1, F2] distances to the nearest two feature points (one per unit cell). */
export function cell(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y); let f1 = 9, f2 = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, px = cx + h2(cx, cy), py = cy + h2(cx + 31, cy + 17), d = Math.hypot(px - x, py - y);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return [f1, f2];
}

// ---------------------------------------------------------------- tone bands
/** Banded level: v in tone units → integer tone; flat bands with a narrow dithered seam (like shade.mjs drawPart). */
export function band(v, X, Y) {
  const fl = Math.floor(v), f = v - fl;
  return f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > bayer(X, Y) ? fl + 1 : fl;
}
/** Full ordered-dither quantisation (smooth gradients like skies). */
export const dq = (v, X, Y) => { const fl = Math.floor(v); return v - fl > bayer(X, Y) ? fl + 1 : fl; };
export const pick = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i))];
export const rgb = (c) => hex(c);
export const mixA = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const ramp = (...cs) => cs.map(hex);

// ---------------------------------------------------------------- strips: offscreen canvases with an alpha mask over a row band
/** A masked canvas covering columns [0, w) and screen rows [ya, ya + h). All Canvas drawing methods work on it. */
export class Strip extends Canvas {
  constructor(w, ya, h) {
    super(Math.max(1, w), Math.max(1, h), "#000000");
    this.ya = ya; this.m = new Uint8Array(this.w * this.h); this.top = Infinity; this.bot = -Infinity;
  }
  px(x, y, c) {
    if (!this.m) return;
    x = Math.floor(x); y = Math.floor(y) - this.ya;
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex(c), i = y * this.w + x, k = i * 3; this.d[k] = r; this.d[k + 1] = g; this.d[k + 2] = b; this.m[i] = 1;
    if (y < this.top) this.top = y; if (y > this.bot) this.bot = y;
  }
  get(x, y) { x = Math.max(0, Math.min(this.w - 1, x | 0)); y = Math.max(0, Math.min(this.h - 1, (y | 0) - this.ya)); const i = (y * this.w + x) * 3; return [this.d[i], this.d[i + 1], this.d[i + 2]]; }
  has(x, y) { x |= 0; y = (y | 0) - this.ya; return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] === 1; }
  erase(x, y) { x = Math.floor(x); y = Math.floor(y) - this.ya; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.m[y * this.w + x] = 0; }
  /** 1-px outline around everything drawn so far (outside pixels touching the mask). */
  outline(col, only = null) {
    const W = this.w, H = this.h, m = this.m, add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (m[y * W + x]) continue;
      if ((x > 0 && m[y * W + x - 1] === 1) || (x < W - 1 && m[y * W + x + 1] === 1) || (y > 0 && m[(y - 1) * W + x] === 1) || (y < H - 1 && m[(y + 1) * W + x] === 1)) add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) if (!only || only(add[i], add[i + 1] + this.ya)) this.px(add[i], add[i + 1] + this.ya, col);
  }
}

/** Composite strip s onto canvas c with its column 0 at screen x = ox (integer); rows keep their screen y. */
export function blit(c, s, ox, gateFn = null) {
  ox = Math.round(ox);
  const x0 = Math.max(0, ox), x1 = Math.min(c.w, ox + s.w); if (x1 <= x0 || s.top > s.bot) return;
  const y0 = Math.max(0, s.ya + s.top), y1 = Math.min(c.h - 1, s.ya + s.bot), cd = c.d, sd = s.d, m = s.m, W = s.w, CW = c.w;
  for (let y = y0; y <= y1; y++) {
    const sr = (y - s.ya) * W - ox, cr = y * CW;
    for (let x = x0; x < x1; x++) {
      const i = sr + x; if (m[i] !== 1) continue;
      if (gateFn && !gateFn(x, y)) continue;
      const k = i * 3, q = (cr + x) * 3; cd[q] = sd[k]; cd[q + 1] = sd[k + 1]; cd[q + 2] = sd[k + 2];
    }
  }
}

/** Write an rgb triple straight into the canvas buffer (no bounds check beyond the frame). */
export function put(c, x, y, r, g, b) { if (x < 0 || y < 0 || x >= c.w || y >= c.h) return; const q = ((y | 0) * c.w + (x | 0)) * 3; c.d[q] = r; c.d[q + 1] = g; c.d[q + 2] = b; }
export function blend(c, x, y, col, k) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h || k <= 0) return; const q = ((y | 0) * c.w + (x | 0)) * 3, d = c.d, cc = hex(col);
  d[q] += (cc[0] - d[q]) * k; d[q + 1] += (cc[1] - d[q + 1]) * k; d[q + 2] += (cc[2] - d[q + 2]) * k;
}
export { clamp01 };
