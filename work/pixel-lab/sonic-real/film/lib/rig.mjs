// steve-real film2 · rig (new, 2026-10-28): a tiny sprite buffer for characters and creatures — parts are painted as shaded
// capsules, ellipses and polygons (light from the upper left), each with a group id; then contour lines are drawn where two
// groups meet and a dark outline goes round the whole silhouette, and the sprite is blitted with an ordered-dither alpha.
import { bayer, hex } from "../../../../../renderer/pixel/raster.mjs";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const OUTLINE = [33, 24, 44];
const hh = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export class Spr {
  constructor(x0, y0, w, h) { this.x0 = Math.floor(x0); this.y0 = Math.floor(y0); this.w = Math.ceil(w) + 2; this.h = Math.ceil(h) + 2; this.c = new Uint8ClampedArray(this.w * this.h * 3); this.g = new Int16Array(this.w * this.h).fill(-1); this.dk = new Uint8ClampedArray(this.w * this.h * 3); }
  set(x, y, col, g, dark) { x = Math.floor(x) - this.x0; y = Math.floor(y) - this.y0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x, c = hex(col), d = hex(dark ?? col); this.c.set(c, i * 3); this.dk.set(d, i * 3); this.g[i] = g; }
  /** shaded capsule from (ax, ay) radius ra to (bx, by) radius rb with a ramp (dark → light) */
  cap(ax, ay, bx, by, ra, rb, RAMP, g, o = {}) {
    const x0 = Math.floor(Math.min(ax - ra, bx - rb)) - 1, x1 = Math.ceil(Math.max(ax + ra, bx + rb)) + 1, y0 = Math.floor(Math.min(ay - ra, by - rb)) - 1, y1 = Math.ceil(Math.max(ay + ra, by + rb)) + 1;
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-6, lx = o.lx ?? -0.8, ly = o.ly ?? -0.55;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5, u = clamp01(((px - ax) * dx + (py - ay) * dy) / L2), qx = ax + dx * u, qy = ay + dy * u, r = ra + (rb - ra) * u, d = Math.hypot(px - qx, py - qy);
      if (d > r) continue;
      const nx = (px - qx) / Math.max(0.5, r), ny = (py - qy) / Math.max(0.5, r), v = 0.55 + 0.5 * (nx * lx + ny * ly) * Math.min(1, d / Math.max(0.5, r) + 0.2) + (o.bias ?? 0) + (o.tex ? o.tex(x, y, u, nx) : 0);
      this.set(x, y, pick(RAMP, v, x, y), g, RAMP[0]);
    }
  }
  /** shaded ellipse (rotation a) */
  ell(cx, cy, rx, ry, RAMP, g, o = {}) {
    const a = o.a ?? 0, ca = Math.cos(a), sa = Math.sin(a), m = Math.max(rx, ry) + 1, lx = o.lx ?? -0.8, ly = o.ly ?? -0.55;
    for (let y = Math.floor(cy - m); y <= Math.ceil(cy + m); y++) for (let x = Math.floor(cx - m); x <= Math.ceil(cx + m); x++) {
      const px = x + 0.5 - cx, py = y + 0.5 - cy, u = (px * ca + py * sa) / rx, w = (-px * sa + py * ca) / ry, d = u * u + w * w; if (d > 1) continue;
      if (o.clip && !o.clip(x, y)) continue;
      const nx = u * ca - w * sa, ny = u * sa + w * ca, v = 0.55 + 0.5 * (nx * lx + ny * ly) * Math.min(1, Math.sqrt(d) + 0.25) + (o.bias ?? 0) + (o.noise ? (hh(x, y, o.seed ?? 0) - 0.5) * o.noise : 0) + (o.tex ? o.tex(x, y, u, w) : 0);
      this.set(x, y, pick(RAMP, v, x, y), g, RAMP[0]);
    }
  }
  /** polygon shaded across x (left lit) or flat */
  poly(pts, RAMP, g, o = {}) {
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity; for (const [x, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) { const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) {
        const u = (x + 0.5 - xs[k]) / Math.max(1, xs[k + 1] - xs[k]), vy = (y - minY) / Math.max(1, maxY - minY);
        const v = o.flat != null ? o.flat : 0.82 - 0.75 * Math.pow(u, 1.3) * (o.side ?? 1) - 0.12 * vy * (o.vfall ?? 1) + (o.bias ?? 0) + (u < 0.12 ? 0.08 : 0);
        this.set(x, y, typeof RAMP === "string" ? RAMP : pick(RAMP, v, x, y), g, typeof RAMP === "string" ? RAMP : RAMP[0]);
      }
    }
  }
  px(x, y, col, g) { const xx = Math.floor(x) - this.x0, yy = Math.floor(y) - this.y0; if (xx < 0 || yy < 0 || xx >= this.w || yy >= this.h) return; const i = yy * this.w + xx; if (g === undefined && this.g[i] < 0) return; this.c.set(hex(col), i * 3); if (g !== undefined) { this.g[i] = g; this.dk.set(hex(col), i * 3); } }
  has(x, y) { const xx = Math.floor(x) - this.x0, yy = Math.floor(y) - this.y0; return xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && this.g[yy * this.w + xx] >= 0; }
  /** contours between groups, outline round the silhouette, dithered blit (alpha a); clipY: only rows < clipY */
  blit(c, a = 1, o = {}) {
    const W = this.w, H = this.h, G = this.g, out = o.outline ?? OUTLINE, noLine = o.noLine ?? new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, X = x + this.x0, Y = y + this.y0; if (o.clipY !== undefined && Y >= o.clipY) continue;
      if (a < 1 && a <= bayer(X & 3, Y & 3)) continue;
      const g = G[i];
      if (g < 0) { const n = (x > 0 && G[i - 1] >= 0) || (x < W - 1 && G[i + 1] >= 0) || (y > 0 && G[i - W] >= 0) || (y < H - 1 && G[i + W] >= 0); if (n && o.outline !== null) c.px(X, Y, out); continue; }
      const gr = x < W - 1 ? G[i + 1] : -1, gd = y < H - 1 ? G[i + W] : -1, gu = y > 0 ? G[i - W] : -1;
      const line = (gr >= 0 && gr !== g && !noLine.has(g) && !noLine.has(gr) && (g >> 4) !== (gr >> 4)) || (gd >= 0 && gd !== g && !noLine.has(g) && !noLine.has(gd) && (g >> 4) !== (gd >> 4)) || (gu >= 0 && gu !== g && g > gu && (g >> 4) !== (gu >> 4) && !noLine.has(g) && !noLine.has(gu));
      c.px(X, Y, line ? [this.dk[i * 3], this.dk[i * 3 + 1], this.dk[i * 3 + 2]] : [this.c[i * 3], this.c[i * 3 + 1], this.c[i * 3 + 2]]);
    }
  }
}
export function pick(RAMP, v, x, y) { const s = clamp01(v) * (RAMP.length - 1), i = Math.floor(s), f = s - i, lo = 0.3, k = f <= lo ? 0 : f >= 1 - lo ? 1 : (f - lo) / (1 - 2 * lo); return RAMP[Math.min(RAMP.length - 1, k > bayer(x & 3, y & 3) ? i + 1 : i)]; }
