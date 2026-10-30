// bd1 kit (init catalog, group bd1): cached pixel layers for backdrops. A layer is painted ONCE in stage coordinates
// (wide shot = 540x960, with margins), then blitted per frame through the camera (nearest neighbour). Painting is a pure
// function of the code, so the result never depends on draw history.
import { hex, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { band } from "./layout.mjs";

export const R = Math.round, F = Math.floor;
const HC = new Map();
/** colour → [r,g,b] (hex strings cached, arrays passed through) */
export const C = (c) => (typeof c === "string" ? HC.get(c) || (HC.set(c, hex(c)), HC.get(c)) : c);
export const RGB = (arr) => arr.map(C);
export const mixc = (a, b, k) => { a = C(a); b = C(b); return [R(a[0] + (b[0] - a[0]) * k), R(a[1] + (b[1] - a[1]) * k), R(a[2] + (b[2] - a[2]) * k)]; };
export const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const sstep = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** deterministic hash noise */
export const hash = (ix, iy, s = 0) => { let h = (ix * 374761393 + iy * 668265263 + s * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const vn = (x, y, s = 0) => {
  const ix = F(x), iy = F(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x, y, s = 0, oct = 3) => { let a = 0.5, t = 0, n = 0; for (let i = 0; i < oct; i++) { t += a * vn(x, y, s + i * 17); n += a; x *= 2.03; y *= 2.03; a *= 0.5; } return t / n; };
/** seeded rng (sequence) */
export const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

export class Lay {
  constructor(x0, y0, w, h, opaque = false) { this.x0 = x0; this.y0 = y0; this.w = w; this.h = h; this.opaque = opaque; this.d = new Uint8ClampedArray(w * h * 3); this.m = new Uint8Array(w * h); if (opaque) this.m.fill(1); }
  put(x, y, c) {
    x = F(x) - this.x0; y = F(y) - this.y0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x; this.m[i] = 1; i3(this.d, i, typeof c === "string" ? C(c) : c);
  }
  has(x, y) { x = F(x) - this.x0; y = F(y) - this.y0; return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] === 1; }
  get(x, y) { x = F(x) - this.x0; y = F(y) - this.y0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; const i = y * this.w + x; return this.m[i] ? [this.d[i * 3], this.d[i * 3 + 1], this.d[i * 3 + 2]] : null; }
  paint(x, y, f) { const col = typeof f === "function" ? f(x, y) : f; if (col) this.put(x, y, C(col)); }
  rect(x0, y0, w, h, f) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.paint(x, y, f); }
  disc(cx, cy, r, f) { this.ell(cx, cy, r, r, f); }
  ell(cx, cy, rx, ry, f) {
    for (let y = F(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const v = (y + 0.5 - cy) / ry; if (v * v > 1) continue;
      const hw = rx * Math.sqrt(1 - v * v);
      for (let x = F(cx - hw + 0.5); x < F(cx + hw + 0.5); x++) this.paint(x, y, f);
    }
  }
  poly(pts, f) {
    let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = F(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = F(xs[k] + 0.5); x < F(xs[k + 1] + 0.5); x++) this.paint(x, y, f);
    }
  }
  /** columns: for each x in [xa, xb) fill from top(x) down to bottom(x) (default layer bottom) with f(x,y,top) */
  cols(xa, xb, top, f, bottom = null) {
    for (let x = xa; x < xb; x++) { const t = F(top(x)), b = bottom ? F(bottom(x)) : this.y0 + this.h; for (let y = t; y < b; y++) { const col = f(x, y, t); if (col) this.put(x, y, C(col)); } }
  }
  /** 1-px outline inside the silhouette; rim (optional) colours edges that face up/left (lit side). */
  outline(col, rim = null) {
    col = C(col); rim = rim && C(rim);
    const { w, h, m } = this, E = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!m[i]) continue;
      const up = y > 0 ? m[i - w] : 1, dn = y < h - 1 ? m[i + w] : 1, lf = x > 0 ? m[i - 1] : 1, rt = x < w - 1 ? m[i + 1] : 1;
      if (up && dn && lf && rt) continue;
      E.push(i, rim && (!up || !lf) && up + lf !== 0 && dn && rt ? 1 : 0);
    }
    for (let k = 0; k < E.length; k += 2) i3(this.d, E[k], E[k + 1] ? rim : col);
    return this;
  }
}
const i3 = (d, i, c) => { d[i * 3] = c[0]; d[i * 3 + 1] = c[1]; d[i * 3 + 2] = c[2]; };

/** blit a layer (stage coords, shifted by dx,dy) into canvas c through layer view V = layer(cam, p) */
export function blit(c, L, V, dx = 0, dy = 0) {
  if (!L.p) { const n = L.w * L.h, p = (L.p = new Int32Array(n)); for (let i = 0; i < n; i++) if (L.m[i]) p[i] = 0x1000000 | (L.d[i * 3] << 16) | (L.d[i * 3 + 1] << 8) | L.d[i * 3 + 2]; }
  const W = L.w, H = L.h, src = L.p, dd = c.d, CW = c.w, opq = L.opaque;
  const xs = new Int32Array(CW);
  for (let x = 0; x < CW; x++) xs[x] = F(V.wx(x + 0.5) - L.x0 - dx);
  for (let y = 0; y < c.h; y++) {
    let j = F(V.wy(y + 0.5) - L.y0 - dy);
    if (j < 0 || j >= H) { if (!opq) continue; j = j < 0 ? 0 : H - 1; }
    const row = j * W; let b = y * CW * 3;
    for (let x = 0; x < CW; x++, b += 3) {
      let i = xs[x]; if (i < 0) { if (!opq) continue; i = 0; } else if (i >= W) { if (!opq) continue; i = W - 1; }
      const v = src[row + i]; if (!v) continue;
      dd[b] = (v >> 16) & 255; dd[b + 1] = (v >> 8) & 255; dd[b + 2] = v & 255;
    }
  }
}

/** shaded ball: tone from the light direction (upper left). ramp = RGB array dark→light. bias shifts the tone. */
export function ball(L, cx, cy, rx, ry, rp, bias = 0, wob = 0, seed = 0) {
  L.ell(cx, cy, rx, ry, (x, y) => {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
    const t = 0.52 - 0.34 * u - 0.44 * v + bias + (wob ? (vn(x * 0.35, y * 0.35, seed) - 0.5) * wob : 0);
    return band(rp, t, x, y, 0.3);
  });
}

/** boulder: faceted blob with a dithered cast shadow to the right, shaded from the upper left. RP = RGB ramp dark→light */
export function boulder(L, cx, cy, s, seed, RP, shadow = ["#10101A", "#16161F"]) {
  const r = rng(seed), n = 9, pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, k = 0.78 + r() * 0.3; pts.push([cx + Math.cos(a) * s * k * 1.15, cy + Math.sin(a) * s * k * 0.8 - s * 0.35]); }
  L.ell(cx + s * 0.9, cy + s * 0.12, s * 1.35, s * 0.28, (x, y) => ((x + y) & 1 ? shadow[0] : hash(x, y, seed) < 0.6 ? shadow[1] : null));
  L.poly(pts, (x, y) => { const u = (x - cx) / s, v = (y - (cy - s * 0.35)) / s; return band(RP, 0.5 - 0.34 * u - 0.5 * v + (vn(x * 0.45, y * 0.45, seed) - 0.5) * 0.28, x, y, 0.3); });
}
