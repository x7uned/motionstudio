// Dog series kit · shared helpers for the «wet nose» diagram drawings (nosebio.mjs): box fitting, clipped / dissolved
// canvas views, a palette-indexed offscreen layer for caching the static parts, the dark diagram background and
// small pixel marks (dots, thick strokes). Pure functions; caches are keyed by box size only.
import { Canvas, bayer, mix, fade, hex, toHex } from "../../../../renderer/pixel/raster.mjs";
import { clamp01, sm, lerp, rnd } from "./layout.mjs";
export { bayer, mix, fade, hex, clamp01, sm, lerp, rnd };

export const R = Math.round, TAU = Math.PI * 2;
export const sm01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const frac = (x) => x - Math.floor(x);

/** Integer box {x, y, w, h}. */
export const ibox = (b) => ({ x: R(b.x), y: R(b.y), w: Math.max(8, R(b.w)), h: Math.max(8, R(b.h)) });

/** View of c that only writes inside [x0, x1) × [y0, y1). */
export function clipView(c, x0, y0, x1, y1) {
  const o = Object.create(c);
  o.px = (x, y, col) => { x = Math.floor(x); y = Math.floor(y); if (x < x0 || y < y0 || x >= x1 || y >= y1) return; c.px(x, y, col); };
  return o;
}
/** The box-clipped, dissolved (alpha a) view every drawing paints through. */
export const boxView = (c, b, a = 1) => clipView(a >= 1 ? c : fade(c, Math.max(0, a)), b.x, b.y, b.x + b.w, b.y + b.h);
/** View of c that only writes where test(x, y) is true. */
export function maskView(c, test) {
  const o = Object.create(c);
  o.px = (x, y, col) => { x = Math.floor(x); y = Math.floor(y); if (test(x, y)) c.px(x, y, col); };
  return o;
}

/** Uniform fit of a nominal W×H design into a w×h area (centred). Coordinates are local to the area. */
export function fit(w, h, W = 500, H = 420) {
  const s = Math.min(w / W, h / H), ox = (w - W * s) / 2, oy = (h - H * s) / 2;
  return { s, ox, oy, X: (x) => ox + x * s, Y: (y) => oy + y * s, P: (p) => [ox + p[0] * s, oy + p[1] * s], poly: (pts) => pts.map(([x, y]) => [ox + x * s, oy + y * s]) };
}

/**
 * Offscreen layer (a Canvas whose pixels are palette indices; index 0 = transparent). Every Canvas drawing method works
 * on it; blit() copies the opaque pixels to a target view at an offset.
 */
export class Layer extends Canvas {
  constructor(w, h, share = null) { super(w, h); this.idx = new Uint16Array(w * h); this.pal = share ? share.pal : [null]; this.pmap = share ? share.pmap : new Map(); }
  px(x, y, c) {
    if (!this.idx || !c) return;
    x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const key = typeof c === "string" ? c : toHex(c);
    let k = this.pmap.get(key); if (k === undefined) { k = this.pal.length; this.pal.push(key); this.pmap.set(key, k); }
    this.idx[y * this.w + x] = k;
  }
  get(x, y) { x = Math.max(0, Math.min(this.w - 1, x | 0)); y = Math.max(0, Math.min(this.h - 1, y | 0)); const k = this.idx[y * this.w + x]; return k ? hex(this.pal[k]) : [0, 0, 0]; }
  has(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.idx[y * this.w + x] > 0; }
  /** RGB triplets of the palette (for fast blits). */
  rgb() { if (!this._rgb || this._rgb.length !== this.pal.length) this._rgb = this.pal.map((p) => (p ? hex(p) : null)); return this._rgb; }
  /** Copy the opaque pixels of another layer (same size, shared palette) on top of this one. */
  over(L) { for (let i = 0; i < this.idx.length; i++) if (L.idx[i]) this.idx[i] = L.pal === this.pal ? L.idx[i] : this.key(L.pal[L.idx[i]]); }
  key(c) { let k = this.pmap.get(c); if (k === undefined) { k = this.pal.length; this.pal.push(c); this.pmap.set(c, k); } return k; }
}

/** Fast copy of a layer to (bx, by) of c. Writes the raw buffer when c is a plain Canvas and nothing dissolves. */
export function blit(c, L, bx, by, a = 1, pick = null) {
  const rgb = L.rgb(), W = L.w, H = L.h, idx = L.idx;
  const raw = a >= 1 && Object.prototype.hasOwnProperty.call(c, "d") && c instanceof Canvas && !(c instanceof Layer);
  if (raw) {
    const d = c.d, cw = c.w, ch = c.h;
    for (let y = 0; y < H; y++) {
      const Y = by + y; if (Y < 0 || Y >= ch) continue;
      for (let x = 0; x < W; x++) {
        const X = bx + x; if (X < 0 || X >= cw) continue;
        const i = y * W + x, k = pick ? pick(i, x, y) : idx[i]; if (!k) continue;
        const p = rgb[k], o = (Y * cw + X) * 3; d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2];
      }
    }
    return;
  }
  const g = a >= 1 ? c : fade(c, a);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, k = pick ? pick(i, x, y) : idx[i]; if (k) g.px(bx + x, by + y, rgb[k]); }
}

/** Small LRU cache keyed by string. */
export function lru(n = 6) {
  const m = new Map();
  return (key, make) => { let v = m.get(key); if (v) { m.delete(key); m.set(key, v); return v; } v = make(); m.set(key, v); if (m.size > n) m.delete(m.keys().next().value); return v; };
}

// ---------------------------------------------------------------- shared diagram palette
export const PAL = {
  out: "#07060E",
  bg: ["#222B56", "#1C244A", "#171E3F", "#131934", "#0F142A"],     // dark diagram air, top → bottom
  mucus: ["#123048", "#1C4A66", "#2A6A8C", "#3C8EB0", "#56B2CE", "#7FD6E8", "#AEEEF6", "#E8FCFF"],
  air: "#9CEFFF", airHi: "#FFFFFF", breath: "#FFCFA8",
  smell: ["#3A2A08", "#6A4A10", "#A8741A", "#E0A030", "#F4CA50", "#FBDD78", "#FDEEA8", "#FFF8DC"],
  tissue: ["#2A2440", "#4A4468", "#6E6890", "#9A92BE", "#BDB4DE", "#D2CAEC", "#E4DEF6", "#F4F0FC"],
  bone: ["#5A5674", "#8E8AA8", "#C4C0D8", "#E6E4F0", "#FAF9FD"],
  pink: ["#3A0E1E", "#6A1A34", "#9C2A4C", "#C84468", "#E26A88", "#F094AA", "#F8BCCB", "#FFE2EA"],
  mouth: ["#22060E", "#3A0A18", "#541426"],
};

/** Dark diagram background over the whole box: banded vertical gradient with dithered steps and a soft centre glow. */
export function darkBg(g, b, ramp = PAL.bg) {
  const n = ramp.length - 1;
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const u = (x + 0.5) / b.w - 0.5, v = (y + 0.5) / b.h;
      const s = clamp01(v * 0.85 + (u * u) * 1.1) * n, lo = Math.floor(s), k = s - lo > bayer(x, y) ? Math.min(n, lo + 1) : lo;
      g.px(b.x + x, b.y + y, ramp[k]);
    }
  }
}

/** Disc stroke along a polyline (radius r), for thick lines with round caps. */
export function stroke(g, pts, r, col) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.5));
    for (let k = 0; k <= n; k++) discF(g, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, r, col);
  }
}
/** Disc with a fractional centre/radius (pixel centres inside). */
export function discF(g, cx, cy, r, col) {
  const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r), rr = r * r;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rr) g.px(x, y, col);
}
/** Ellipse fill with fractional centre. */
export function ellF(g, cx, cy, rx, ry, col, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot), m = Math.max(rx, ry) + 1;
  for (let y = Math.floor(cy - m); y <= Math.ceil(cy + m); y++) for (let x = Math.floor(cx - m); x <= Math.ceil(cx + m); x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
    if (u * u + v * v <= 1) g.px(x, y, col);
  }
}

/**
 * A readable moving air/particle dot: dark outline, coloured body, white glint. r ≥ 1 (pixels).
 */
export function airDot(g, x, y, r, col, { outline = PAL.out, glint = true } = {}) {
  if (r < 1.2) { g.px(Math.floor(x), Math.floor(y), col); return; }
  discF(g, x, y, r + 1, outline);
  discF(g, x, y, r, col);
  if (glint && r >= 1.6) g.px(Math.floor(x - r * 0.35), Math.floor(y - r * 0.35), "#FFFFFF");
}

/** Points of a polyline sampled at arc length d; returns [x, y, angle] or null beyond the end. */
export function polyLen(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return cum; }
export function polyAt(pts, cum, d) {
  if (d < 0 || d > cum[cum.length - 1]) return null;
  let k = 1; while (k < cum.length - 1 && cum[k] < d) k++;
  const f = (d - cum[k - 1]) / (cum[k] - cum[k - 1] || 1), [ax, ay] = pts[k - 1], [bx, by] = pts[k];
  return [ax + (bx - ax) * f, ay + (by - ay) * f, Math.atan2(by - ay, bx - ax)];
}
/** Catmull-Rom open curve through control points (n samples per segment). */
export function curve(pts, n = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** Point-in-polygon (even-odd). */
export function inPoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[i], [bx, by] = poly[j]; if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) c = !c; }
  return c;
}
/** Rasterised polygon mask (w×h, local coordinates). */
export function polyMask(w, h, poly) {
  const m = new Uint8Array(w * h);
  let y0 = Infinity, y1 = -Infinity; for (const [, y] of poly) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(h - 1, Math.ceil(y1)); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < poly.length; i++) { const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(w, Math.round(xs[k + 1])); x++) m[y * w + x] = 1;
  }
  return m;
}
/** Chamfer distance (to the outside) of a mask. */
export function chamfer(m, w, h) {
  const INF = 1e9, d = new Float32Array(w * h); for (let i = 0; i < d.length; i++) d[i] = m[i] ? INF : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!d[i]) continue; if (x > 0) d[i] = Math.min(d[i], d[i - 1] + 1); if (y > 0) d[i] = Math.min(d[i], d[i - w] + 1); if (x > 0 && y > 0) d[i] = Math.min(d[i], d[i - w - 1] + 1.414); if (x < w - 1 && y > 0) d[i] = Math.min(d[i], d[i - w + 1] + 1.414); }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!d[i]) continue; if (x < w - 1) d[i] = Math.min(d[i], d[i + 1] + 1); if (y < h - 1) d[i] = Math.min(d[i], d[i + w] + 1); if (x < w - 1 && y < h - 1) d[i] = Math.min(d[i], d[i + w + 1] + 1.414); if (x > 0 && y < h - 1) d[i] = Math.min(d[i], d[i + w - 1] + 1.414); }
  return d;
}
/** Quantise a continuous tone level to a ramp with a narrow dithered transition (the kit's flat-band look). */
export function band(ramp, v, x, y, lo = 0) {
  const fl = Math.floor(v), f = v - fl, q = f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > bayer(x, y) ? fl + 1 : fl;
  return ramp[Math.max(lo, Math.min(ramp.length - 1, q))];
}
