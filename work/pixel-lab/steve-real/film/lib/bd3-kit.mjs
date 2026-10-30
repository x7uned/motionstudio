// steve-real copy (2026-10-28) of the catalog lib/bd3-kit.mjs; + blitS (the hole fill also gets the screen pixel). Original:
// bd3 kit: static world painting (1× grid, world coords = wide-shot screen coords) + camera blit with a live "hole" fill
// (sky with drifting clouds), plus flat-tone pixel helpers. Everything is a pure function of (cam, t); the world is built once.
import { Canvas, hex, bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { layer, band, rnd, clamp01, lerp } from "./layout.mjs";

export const OL = "#07060E";
export const R = Math.round;
export { rnd, band, clamp01, lerp, bayer, mix };
export const arr = (a) => a.map(hex);

/** Canvas in world coordinates with a coverage mask: unpainted pixels are "holes" (filled live by blit). */
export class World extends Canvas {
  constructor(x0, y0, w, h) { super(w, h, "#000000"); this.ox = x0; this.oy = y0; this.m = new Uint8Array(w * h); }
  px(x, y, c) {
    if (!c || !this.m) return;
    const X = Math.floor(x) - this.ox, Y = Math.floor(y) - this.oy;
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return;
    const [r, g, b] = hex(c), i = Y * this.w + X;
    this.d[i * 3] = r; this.d[i * 3 + 1] = g; this.d[i * 3 + 2] = b; this.m[i] = 1;
  }
  get(x, y) { const X = Math.max(0, Math.min(this.w - 1, Math.floor(x) - this.ox)), Y = Math.max(0, Math.min(this.h - 1, Math.floor(y) - this.oy)), i = (Y * this.w + X) * 3; return [this.d[i], this.d[i + 1], this.d[i + 2]]; }
  /** make a rectangle a hole again (window glass showing the live sky) */
  hole(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const X = i - this.ox, Y = j - this.oy; if (X >= 0 && Y >= 0 && X < this.w && Y < this.h) this.m[Y * this.w + X] = 0; } }
  holeF(x0, y0, x1, y1, inside) { for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) if (inside(i, j)) { const X = i - this.ox, Y = j - this.oy; if (X >= 0 && Y >= 0 && X < this.w && Y < this.h) this.m[Y * this.w + X] = 0; } }
}
export function build(paint, x0 = -200, y0 = -200, w = 940, h = 1360) { const g = new World(x0, y0, w, h); paint(g); return g; }

/** Copy the world through the camera (nearest); holes are filled by holeFn(wx, wy, ix, iy) → [r,g,b]. */
export function blit(c, cam, g, holeFn) {
  const V = layer(cam, 1), W = g.w, HH = g.h, d = c.d, s = g.d, m = g.m, CW = c.w;
  const xs = new Int32Array(CW), wxs = new Float64Array(CW);
  for (let x = 0; x < CW; x++) { const wx = V.wx(x + 0.5); wxs[x] = wx; let i = Math.floor(wx) - g.ox; xs[x] = i < 0 ? 0 : i >= W ? W - 1 : i; }
  for (let y = 0; y < c.h; y++) {
    const wy = V.wy(y + 0.5); let j = Math.floor(wy) - g.oy; j = j < 0 ? 0 : j >= HH ? HH - 1 : j;
    const row = j * W, iy = Math.floor(wy);
    for (let x = 0; x < CW; x++) {
      const li = row + xs[x], q = (y * CW + x) * 3;
      if (m[li]) { const p = li * 3; d[q] = s[p]; d[q + 1] = s[p + 1]; d[q + 2] = s[p + 2]; }
      else if (holeFn) { const col = holeFn(wxs[x], wy, Math.floor(wxs[x]), iy); d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2]; }
    }
  }
  return V;
}

/** A live sky: banded ramp over world y0..y1 and drifting clouds [wy, speed px/s, phase, scale]. Returns holeFn for blit. */
export function skyFill(SKY, y0, y1, clouds, t, span = 1000) {
  const CL = clouds.map(([cy, v, ph, sc]) => [-200 - 80 + (((ph + (t * v) / span) % 1) + 1) % 1 * span, cy, sc]);
  const BL = [[0, 0, 20], [-22, 6, 14], [23, 5, 16], [7, -11, 14]], COL = arr(["#FFFFFF", "#EEF4FC", "#CFDEF2"]);
  return (wx, wy, ix, iy) => {
    for (const [ccx, ccy, sc] of CL) {
      const dx = (wx - ccx) / sc, dy = (wy - ccy) / sc;
      if (dx < -48 || dx > 48 || dy < -26 || dy > 20) continue;
      for (const [bx, by, br] of BL) { const ex = dx - bx, ey = dy - by; if (ex * ex + ey * ey <= br * br) return COL[dy > 9 ? 2 : dy > 3 ? 1 : 0]; }
    }
    return band(SKY, (wy - y0) / (y1 - y0), ix, iy);
  };
}

// ------------------------------------------------------------------ flat-tone helpers (all in world coords)
export function fillF(g, x0, y0, x1, y1, f) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g.px(x, y, f(x, y)); }
/** vertical tone bands through ramp RAMP (array of rgb) from v0 at y0 to v1 at y1, narrow dithered seams */
export function vBand(g, x0, y0, x1, y1, RAMP, v0, v1, w) { const h = Math.max(1, y1 - y0); fillF(g, x0, y0, x1, y1, (x, y) => band(RAMP, lerp(v0, v1, (y - y0) / h), x, y, w)); }
export function hBand(g, x0, y0, x1, y1, RAMP, v0, v1, w) { const ww = Math.max(1, x1 - x0); fillF(g, x0, y0, x1, y1, (x, y) => band(RAMP, lerp(v0, v1, (x - x0) / ww), x, y, w)); }
/** chunky slab: R = [shade2, shade, base, light, hi] hex; light from the upper left; optional outline */
export function slab(g, x, y, w, h, Rm, ol = OL) {
  g.rect(x, y, w, h, Rm[2]);
  if (w > 3 && h > 3) { g.rect(x, y, w, 1, Rm[3]); g.rect(x, y, 1, h, Rm[3]); g.rect(x + w - 1, y + 1, 1, h - 1, Rm[1]); g.rect(x + 1, y + h - 1, w - 1, 1, Rm[1]); g.px(x, y, Rm[4]); }
  if (ol) g.frame(x - 1, y - 1, w + 2, h + 2, ol);
}
export const outline = (g, x, y, w, h, c = OL) => g.frame(x - 1, y - 1, w + 2, h + 2, c);
/** sparse speckles for texture */
export function speckle(g, x0, y0, x1, y1, col, dens, seed = 1) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (rnd(x * 977 + y * 131 + seed * 7919) < dens) g.px(x, y, col); }
/** dithered darkening/lightening of what is there */
export function wash(g, x0, y0, x1, y1, col, f, steps = 4) { g.tint(x0, y0, x1 - x0, y1 - y0, f, col, steps); }
export const bricks = (g, x0, y0, x1, y1, cols, mortar, bw = 12, bh = 6, seed = 3) => {
  for (let y = y0, r = 0; y < y1; y += bh, r++) for (let x = x0 - (r % 2 ? bw / 2 : 0); x < x1; x += bw) {
    const k = rnd(Math.floor(x / bw) * 31 + r * 17 + seed), c = cols[Math.floor(k * cols.length) % cols.length];
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) { const X = Math.floor(x) + i, Y = y + j; if (X < x0 || X >= x1 || Y >= y1) continue; g.px(X, Y, j === bh - 1 || i === bw - 1 ? mortar : c); }
  }
};
export function ellFill(g, cx, cy, rx, ry, f) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.02) g.px(cx + x, cy + y, f(cx + x, cy + y)); }

/** blit, but holeFn(wx, wy, ix, iy, x, y) also receives the screen pixel (skyline layers behind the roofs). */
export function blitS(c, cam, g, holeFn) {
  const V = layer(cam, 1), W = g.w, HH = g.h, d = c.d, s = g.d, m = g.m, CW = c.w;
  const xs = new Int32Array(CW), wxs = new Float64Array(CW);
  for (let x = 0; x < CW; x++) { const wx = V.wx(x + 0.5); wxs[x] = wx; let i = Math.floor(wx) - g.ox; xs[x] = i < 0 ? 0 : i >= W ? W - 1 : i; }
  for (let y = 0; y < c.h; y++) {
    const wy = V.wy(y + 0.5); let j = Math.floor(wy) - g.oy; j = j < 0 ? 0 : j >= HH ? HH - 1 : j;
    const row = j * W, iy = Math.floor(wy);
    for (let x = 0; x < CW; x++) {
      const li = row + xs[x], q = (y * CW + x) * 3;
      if (m[li]) { const p = li * 3; d[q] = s[p]; d[q + 1] = s[p + 1]; d[q + 2] = s[p + 2]; }
      else { const col = holeFn(wxs[x], wy, Math.floor(wxs[x]), iy, x, y); d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2]; }
    }
  }
  return V;
}
