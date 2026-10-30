// Street kit («GTA 6: the city behind you»): the two-look painting engine of the street.
// Every piece of scenery is painted ONCE into an Art layer that records, per pixel, its colour (the DRAWN look) and
// what it belongs to (object id, feature class, blueprint shade, kind). bakeBlue() turns those ids into the NOT-DRAWN
// look: a dark navy fill, a faint grid and thin cyan outlines of every object (feature lines dimmer), no colours, no
// lights. mixBlit() copies a layer into the frame choosing, per pixel, the drawn or the blueprint pixel from the
// timeline's drawnAt() (one value per screen column) against a dither threshold — never a redraw of the primitives.
// Pure: caches only memoise.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));

// kinds (what a pixel is, for live effects)
export const K_NONE = 0, K_WALL = 1, K_GLASS = 2, K_WATER = 3, K_GROUND = 4, K_NEON = 5, K_LAMP = 6, K_SKY = 7, K_PLANT = 8;

// blueprint looks per "bp" class: fill (navy), outline (cyan), feature line, grid
export const BP = [
  { fill: "#0E1634", edge: "#5FD8F4", feat: "#2C5C98", grid: "#16224A" },   // 0 buildings (near)
  { fill: "#0B1230", edge: "#3E86C4", feat: "#22447A", grid: "#131D40" },   // 1 far skyline / water
  { fill: "#0D1532", edge: "#4CB4E4", feat: "#244C86", grid: "#152046" },   // 2 ground (sidewalks, road)
  { fill: "#101A3C", edge: "#6CE4FA", feat: "#2E64A0", grid: "#18264E" },   // 3 props, palms (near, bright)
  { fill: "#0C1434", edge: "#58CCEE", feat: "#2A5690", grid: "#152044" },   // 4 foreground (beach)
];
const BPH = BP.map((b) => ({ fill: hex(b.fill), edge: hex(b.edge), feat: hex(b.feat), grid: hex(b.grid) }));

/** Offscreen layer with colour + mask + object ids. Paint through art.g (a Canvas-compatible surface) with art.pen set. */
export class Art {
  constructor(w, h, ox = 0, oy = 0) {
    this.w = w; this.h = h; this.ox = ox; this.oy = oy;              // (ox, oy): the paint coordinate of pixel (0, 0)
    const n = w * h; this.col = new Uint8ClampedArray(n * 3); this.m = new Uint8Array(n); this.id = new Uint16Array(n); this.f = new Uint8Array(n);
    this.bp = new Uint8Array(n); this.kind = new Uint8Array(n); this.blue = null;
    this.pen = { id: 1, f: 0, bp: 0, kind: K_WALL };
    const self = this, g = Object.create(Canvas.prototype);
    g.w = 1e9; g.h = 1e9; g.d = this.col;
    g.px = (x, y, c) => {
      if (!c) return; x = Math.floor(x - self.ox); y = Math.floor(y - self.oy); if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = y * w + x, p = hex(c), q = i * 3; self.col[q] = p[0]; self.col[q + 1] = p[1]; self.col[q + 2] = p[2];
      self.m[i] = 1; const pen = self.pen; self.id[i] = pen.id; self.f[i] = pen.f; self.bp[i] = pen.bp; self.kind[i] = pen.kind;
    };
    g.get = (x, y) => { x = Math.floor(x - self.ox); y = Math.floor(y - self.oy); if (x < 0 || y < 0 || x >= w || y >= h) return [0, 0, 0]; const q = (y * w + x) * 3; return [self.col[q], self.col[q + 1], self.col[q + 2]]; };
    g.has = (x, y) => { x = Math.floor(x - self.ox); y = Math.floor(y - self.oy); return x >= 0 && y >= 0 && x < w && y < h && self.m[y * w + x] === 1; };
    /** recolour an already painted pixel (keeps its ids): glows, grades, shadows */
    g.tintPx = (x, y, c, k) => {
      x = Math.floor(x - self.ox); y = Math.floor(y - self.oy); if (x < 0 || y < 0 || x >= w || y >= h || k <= 0) return; const i = y * w + x; if (!self.m[i]) return;
      const q = i * 3, p = hex(c); for (let j = 0; j < 3; j++) self.col[q + j] = R(self.col[q + j] + (p[j] - self.col[q + j]) * Math.min(1, k));
    };
    g.kindAt = (x, y) => { x = Math.floor(x - self.ox); y = Math.floor(y - self.oy); return x >= 0 && y >= 0 && x < w && y < h && self.m[y * w + x] ? self.kind[y * w + x] : -1; };
    this.g = g;
  }
  /** Run fn with the pen temporarily set (fields merged). */
  with(p, fn) { const old = this.pen; this.pen = { ...old, ...p }; fn(this.g); this.pen = old; }
  clear() { this.m.fill(0); this.blue = null; }
}

/** Build the NOT-DRAWN look of an Art layer: navy fill, grid aligned to (gx, gy) of paint space, cyan outlines. */
export function bakeBlue(A, grid = 12) {
  const { w, h, m, id, f, bp } = A, out = new Uint8ClampedArray(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!m[i]) continue;
    const B = BPH[bp[i]], q = i * 3;
    let c = B.fill;
    const gx = x + A.ox, gy = y + A.oy;
    if ((((gx % grid) + grid) % grid === 0 || ((gy % grid) + grid) % grid === 0) && ((gx + gy) & 1) === 0) c = B.grid;
    // outline: silhouette (any 4-neighbour empty) or an id change to the right / below (1-px lines)
    const L = x > 0 && m[i - 1], Rr = x < w - 1 && m[i + 1], U = y > 0 && m[i - w], D = y < h - 1 && m[i + w];
    if (!L || !Rr || !U || !D) c = B.edge;
    else if (id[i + 1] !== id[i] || id[i + w] !== id[i]) c = bp[i + 1] === bp[i] && bp[i + w] === bp[i] ? B.edge : BPH[Math.max(bp[i], bp[i + 1], bp[i + w])].edge;
    else if (f[i + 1] !== f[i] || f[i + w] !== f[i]) c = B.feat;
    out[q] = c[0]; out[q + 1] = c[1]; out[q + 2] = c[2];
  }
  A.blue = out; return A;
}

// ---------------------------------------------------------------- per-frame threshold fields
// "scan" threshold: Bayer mixed with a per-row-pair hash, so a dissolve front breaks into short scanlines (game pop-in).
const SCAN = new Float32Array(64 * 64);
for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) SCAN[y * 64 + x] = 0.55 * bayer(x, y) + 0.45 * rnd(1000 + (y >> 1) * 7 + (x >> 4) * 131);
export const scanThr = (x, y) => SCAN[(y & 63) * 64 + (x & 63)];

/**
 * Copy an Art layer into the frame with its top-left at screen (sx, sy). Per pixel: K[x] (0..1, drawn amount of the
 * screen column) against thr(x, y) picks the drawn colour or the blueprint colour. A pixel whose threshold sits right at
 * the dissolve front glows (construction sparkle). o: { thr, glow, edge, x0, x1, y0, y1, late(i) → extra delay mask,
 * shift(y) → horizontal source offset (glitch rows), fx(x, y, li, drawn, rgb) → final colour hook }
 */
export function mixBlit(c, A, sx, sy, K, o = {}) {
  sx = R(sx); sy = R(sy);
  const W = A.w, H = A.h, s = A.col, b = A.blue, m = A.m, d = c.d, CW = c.w;
  const xa = Math.max(o.x0 ?? 0, sx, 0), xb = Math.min(o.x1 ?? CW, sx + W, CW), ya = Math.max(o.y0 ?? 0, sy, 0), yb = Math.min(o.y1 ?? c.h, sy + H, c.h);
  if (xa >= xb || ya >= yb) return;
  const thr = o.thr ?? scanThr, EG = o.edge ?? 0.045, glow = hex(o.glow ?? "#B4F6FF"), shift = o.shift, KL = o.klate, fx = o.fx;
  for (let y = ya; y < yb; y++) {
    const off = shift ? shift(y) : 0, row = (y - sy) * W;
    for (let x = xa; x < xb; x++) {
      const k0 = K[x];
      let lx = x - sx + (off && k0 > 0 && k0 < 1 ? off : 0); if (lx < 0 || lx >= W) lx = x - sx;
      const li = row + lx; if (!m[li]) continue;
      let k = k0; if (KL) { k = KL(k, li, x, y); if (k < 0) continue; }
      const p = (y * CW + x) * 3, q = li * 3;
      let src, isD;
      if (k >= 1) { src = s; isD = true; }
      else if (k <= 0) { src = b; isD = false; }
      else {
        const th = thr(x, y), dd = k - th;
        if (dd > -EG && dd < EG) { d[p] = glow[0]; d[p + 1] = glow[1]; d[p + 2] = glow[2]; continue; }
        isD = dd > 0; src = isD ? s : b;
      }
      if (fx) { const r = fx(x, y, li, isD, src[q], src[q + 1], src[q + 2]); if (r) { d[p] = r[0]; d[p + 1] = r[1]; d[p + 2] = r[2]; continue; } }
      d[p] = src[q]; d[p + 1] = src[q + 1]; d[p + 2] = src[q + 2];
    }
  }
}

/** Tint screen pixels toward colour col by k(x, y) (quantised steps, Bayer-dithered). Fast integer path. */
export function tintRect(c, x0, y0, w, h, kf, col, steps = 4) {
  const C = hex(col), d = c.d, W = c.w;
  const xa = Math.max(0, x0 | 0), xb = Math.min(W, (x0 + w) | 0), ya = Math.max(0, y0 | 0), yb = Math.min(c.h, (y0 + h) | 0);
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
    const v = kf(x, y); if (!(v > 0)) continue;
    const sV = Math.min(1, v) * steps, lo = Math.floor(sV), q = (sV - lo > bayer(x, y) ? lo + 1 : lo) / steps; if (q <= 0) continue;
    const p = (y * W + x) * 3; d[p] += (C[0] - d[p]) * q; d[p + 1] += (C[1] - d[p + 1]) * q; d[p + 2] += (C[2] - d[p + 2]) * q;
  }
}

// ---------------------------------------------------------------- painting helpers (on an Art surface g)
/** Vertical gradient fill of a rect between colours a (top) and b (bottom) in `steps` dithered bands. */
export function vgrad(g, x, y, w, h, a, b, steps = 4) {
  for (let j = 0; j < h; j++) { const v = (j / Math.max(1, h - 1)) * steps, lo = Math.floor(v), fr = v - lo; for (let i = 0; i < w; i++) { const s = fr > bayer(x + i, y + j) ? lo + 1 : lo; g.px(x + i, y + j, mix(a, b, Math.min(steps, s) / steps)); } }
}
export function hline(g, x, y, w, c) { for (let i = 0; i < w; i++) g.px(x + i, y, c); }
export function vline(g, x, y, h, c) { for (let j = 0; j < h; j++) g.px(x, y + j, c); }
/** Dithered soft glow tint of already painted pixels around (x, y) (ellipse radius rx, ry). */
export function glowAt(g, x, y, rx, ry, col, k = 0.5) {
  for (let Y = R(y - ry); Y <= R(y + ry); Y++) for (let X = R(x - rx); X <= R(x + rx); X++) {
    const dd = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; if (dd >= 1) continue;
    const v = k * (1 - dd) ** 1.5; if (v > bayer(X, Y) * 0.9) g.tintPx(X, Y, col, 0.35 + 0.3 * v);
  }
}
/** Thick polyline (radius r) in one colour. */
export function thick(g, pts, r, col) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n; for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i2 = -Math.ceil(r); i2 <= Math.ceil(r); i2++) if (i2 * i2 + j * j <= r * r + 0.3) g.px(R(x) + i2, R(y) + j, col); }
  }
}
export { hex, mix, bayer, Canvas };
