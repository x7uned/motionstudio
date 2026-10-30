// init · space group kit: sprite buffer with outline pass, 3-D value noise, shaded ball, shared light.
// Everything is a pure function of its arguments (no hidden state), no anti-aliasing.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
import { clamp01, band } from "./layout.mjs";

export const OUT = "#07060E";
/** shared light (screen space: x right, y UP, z toward the viewer): upper left, a little toward the viewer */
export const LIGHT = (() => { const l = [-0.55, 0.6, 0.58], n = Math.hypot(...l); return l.map((v) => v / n); })();

// ---------------------------------------------------------------- noise (periodic 16³ value lattice: fast, deterministic)
const LAT = (() => { const a = new Float32Array(4096); let h = 12345; for (let i = 0; i < 4096; i++) { h = (Math.imul(h, 1664525) + 1013904223) | 0; a[i] = ((h >>> 8) & 0xffff) / 65536; } return a; })();
/** smooth 3-D value noise in 0..1 (period 16 per axis; seed shifts the lattice) */
export function n3(x, y, z, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const i0 = (ix + s * 7) & 15, i1 = (i0 + 1) & 15, j0 = ((iy + s * 3) & 15) << 4, j1 = (((iy + s * 3) + 1) & 15) << 4, k0 = ((iz + s * 11) & 15) << 8, k1 = (((iz + s * 11) + 1) & 15) << 8;
  const a = LAT[i0 | j0 | k0], b = LAT[i1 | j0 | k0], c = LAT[i0 | j1 | k0], d = LAT[i1 | j1 | k0], e = LAT[i0 | j0 | k1], f = LAT[i1 | j0 | k1], g = LAT[i0 | j1 | k1], h = LAT[i1 | j1 | k1];
  const x1 = a + (b - a) * u, x2 = c + (d - c) * u, x3 = e + (f - e) * u, x4 = g + (h - g) * u, y1 = x1 + (x2 - x1) * v, y2 = x3 + (x4 - x3) * v;
  return y1 + (y2 - y1) * w;
}
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- sprite buffer with an outline pass
/** Colour buffer around (cx, cy): set pixels, then outline() and flush(c). Keeps overlapping shapes in one silhouette. */
export class Spr {
  constructor(cx, cy, hw, hh) { this.x0 = Math.floor(cx - hw) - 2; this.y0 = Math.floor(cy - hh) - 2; this.w = Math.ceil(hw * 2) + 5; this.h = Math.ceil(hh * 2) + 5; this.a = new Array(this.w * this.h); this.cx = cx; this.cy = cy; }
  set(x, y, col) { const i = (y - this.y0) * this.w + (x - this.x0); if (x >= this.x0 && y >= this.y0 && x < this.x0 + this.w && y < this.y0 + this.h) this.a[i] = col; }
  get(x, y) { if (x < this.x0 || y < this.y0 || x >= this.x0 + this.w || y >= this.y0 + this.h) return undefined; return this.a[(y - this.y0) * this.w + (x - this.x0)]; }
  /** 1-px outline round the silhouette; pixels on the upper-left side of the centre use the lighter litCol */
  outline(col = OUT, litCol = col) {
    const { w, h, a } = this, add = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (a[j * w + i]) continue;
      if ((i > 0 && a[j * w + i - 1]) || (i < w - 1 && a[j * w + i + 1]) || (j > 0 && a[(j - 1) * w + i]) || (j < h - 1 && a[(j + 1) * w + i])) add.push(j * w + i, (i + this.x0 - this.cx) + (j + this.y0 - this.cy) < -2 ? litCol : col);
    }
    for (let k = 0; k < add.length; k += 2) a[add[k]] = add[k + 1];
  }
  flush(c) { const { w, h, a } = this; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const col = a[j * w + i]; if (col) c.px(this.x0 + i, this.y0 + j, col); } }
}

// ---------------------------------------------------------------- shaded ball (atoms, molecule): dark ring, banded sphere, specular
/** ramp = 8 colours dark → light; light from the upper left; draws straight to c */
export function ball(c, x, y, r, ramp, { gloss = 1, flash = 0, lift = 0 } = {}) {
  const X = Math.round(x), Y = Math.round(y), R = Math.max(2, r);
  for (let j = -Math.ceil(R) - 1; j <= Math.ceil(R) + 1; j++) for (let i = -Math.ceil(R) - 1; i <= Math.ceil(R) + 1; i++) {
    const dx = (i + 0.0) / R, dy = (j + 0.0) / R, d = Math.hypot(dx, dy);
    if (d > 1 + 0.5 / R) continue;
    if (d > 1 - 1.15 / R) { c.px(X + i, Y + j, OUT); continue; }
    const nz = Math.sqrt(Math.max(0, 1 - d * d)), lam = -dx * 0.55 - dy * 0.6 + nz * 0.58;      // y down on screen
    let v = 0.2 + 0.6 * clamp01(lam) + lift + 0.28 * flash;
    const hl = Math.hypot(dx + 0.38, dy + 0.4) / 0.2;
    c.px(X + i, Y + j, gloss > 0 && hl < 1 ? ramp[7] : band(ramp, v, X + i, Y + j, 0.4));
  }
}

// ---------------------------------------------------------------- shaded stick (bonds): round capsule with flat bands and a dark outline
/** capsule from (x0,y0) to (x1,y1) with radius r; alpha 0..1 dissolves it by ordered dither */
export function stick(c, x0, y0, x1, y1, r, ramp, alpha = 1) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, L = Math.sqrt(L2), px = -dy / L, py = dx / L;
  const bx0 = Math.floor(Math.min(x0, x1) - r - 1), bx1 = Math.ceil(Math.max(x0, x1) + r + 1), by0 = Math.floor(Math.min(y0, y1) - r - 1), by1 = Math.ceil(Math.max(y0, y1) + r + 1);
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    if (alpha < 1 && alpha <= bayer(x, y)) continue;
    const qx = x + 0.5 - x0, qy = y + 0.5 - y0, u = Math.max(0, Math.min(1, (qx * dx + qy * dy) / L2)), ex = qx - dx * u, ey = qy - dy * u, d = Math.hypot(ex, ey);
    if (d > r) continue;
    if (d > r - 1.1) { c.px(x, y, OUT); continue; }
    const e = (ex * px + ey * py) / r, nz = Math.sqrt(Math.max(0, 1 - e * e)), nxs = px * e, nys = -py * e;     // normal, y up
    const lam = nxs * LIGHT[0] + nys * LIGHT[1] + nz * LIGHT[2];
    c.px(x, y, band(ramp, 0.15 + 0.8 * clamp01(lam), x, y, 0.4));
  }
}
