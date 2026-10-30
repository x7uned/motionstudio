// Dog series park (2026-10-23) · private scratch raster for the park background.
// The whole background is painted FRONT-TO-BACK into a private RGB buffer with an occupancy byte per pixel: every
// primitive first asks «is this pixel still free?», so the expensive shading of far layers only runs where nothing nearer
// already covers the screen. Then the buffer is copied into the caller's canvas (fast row copy for a plain Canvas, per-pixel
// c.px for a gate/fade view so crossfades still work). Every primitive clips to the frame: cost ~ what is visible at any zoom.
import { Canvas, bayer, hex } from "../../../../renderer/pixel/raster.mjs";

export const BY = new Float32Array(16);
for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) BY[y * 4 + x] = bayer(x, y);
/** Bayer threshold (0..1) at integer x, y (works for negative numbers). */
export const by = (x, y) => BY[(y & 3) * 4 + (x & 3)];
export const rgb = (c) => (typeof c === "string" ? hex(c) : c);
export const ramp = (arr) => arr.map((c) => rgb(c).slice());
export const mixc = (a, b, k) => [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];
/** Ramp blended toward colour h by k (aerial haze). */
export const hazed = (R, h, k) => R.map((c) => mixc(c, rgb(h), k));
/** Integer hash → 0..1 (two keys). */
export const h2 = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const h1 = (a) => h2(a, 97531);
/** Pick a ramp index from a continuous value v with flat bands and a narrow dithered transition (dog/shade.mjs style). */
export const band = (v, n, X, Y) => { const fl = Math.floor(v), f = v - fl, q = f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > by(X, Y) ? fl + 1 : fl; return q < 0 ? 0 : q > n ? n : q; };
/** Plain dithered pick between two neighbouring indices. */
export const dith = (v, n, X, Y) => { const fl = Math.floor(v), q = v - fl > by(X, Y) ? fl + 1 : fl; return q < 0 ? 0 : q > n ? n : q; };

export class Scratch {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 3); this.o = new Uint8Array(w * h); }
  reset() { this.o.fill(0); }
  free(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.o[y * this.w + x] === 0; }
  /** Write only if the pixel is still free (front-to-back painting); marks it taken. x, y integers. */
  put(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x; if (this.o[i]) return; this.o[i] = 1;
    const j = i * 3; this.d[j] = c[0]; this.d[j + 1] = c[1]; this.d[j + 2] = c[2];
  }
  /** Overwrite (used inside one stage that paints back-to-front, e.g. blades over the lawn base); marks it taken. */
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x; this.o[i] = 1;
    const j = i * 3; this.d[j] = c[0]; this.d[j + 1] = c[1]; this.d[j + 2] = c[2];
  }
  /** Canvas-like adapter (px/get/w/h) so cute-kit helpers (blob, eye…) can paint into the scratch front-to-back. */
  view() {
    if (this._v) return this._v;
    const S = this, v = Object.create(Canvas.prototype);
    v.w = S.w; v.h = S.h; v.d = S.d;
    v.px = (x, y, c) => { if (c) S.put(Math.floor(x), Math.floor(y), rgb(c)); };
    v.get = (x, y) => { x = Math.max(0, Math.min(S.w - 1, x | 0)); y = Math.max(0, Math.min(S.h - 1, y | 0)); const i = (y * S.w + x) * 3; return [S.d[i], S.d[i + 1], S.d[i + 2]]; };
    return (this._v = v);
  }
  /** Copy everything into canvas c (plain Canvas → one typed-array copy; a gate/fade view → per-pixel px). */
  blitTo(c) {
    const plain = c.px === Canvas.prototype.px && c.d && c.w === this.w && c.h === this.h;
    if (plain) { c.d.set(this.d); return; }
    const W = Math.min(c.w, this.w), H = Math.min(c.h, this.h), col = [0, 0, 0], d = this.d;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const j = (y * this.w + x) * 3; col[0] = d[j]; col[1] = d[j + 1]; col[2] = d[j + 2]; c.px(x, y, col); }
  }
}

const POOL = new Map();
/** One scratch per canvas size (reused every frame). */
export function scratchFor(w, h) { const k = w * 10000 + h; let s = POOL.get(k); if (!s) { s = new Scratch(w, h); POOL.set(k, s); } s.reset(); return s; }

// ---------------------------------------------------------------- primitives (screen pixels; front-to-back via S.put)
/** Scanline polygon fill. col = [r,g,b] or fn(X, Y) → [r,g,b] | null. */
export function poly(S, pts, col) {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  const ya = Math.max(0, Math.floor(y0)), yb = Math.min(S.h - 1, Math.ceil(y1)), n = pts.length, xs = [];
  for (let y = ya; y <= yb; y++) {
    const yc = y + 0.5; xs.length = 0;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(S.w, Math.round(xs[k + 1]));
      for (let x = xa; x < xb; x++) { const c = typeof col === "function" ? col(x, y) : col; if (c) S.put(x, y, c); }
    }
  }
}
export function rect(S, x, y, w, h, col) {
  const xa = Math.max(0, Math.round(x)), xb = Math.min(S.w, Math.round(x + w)), ya = Math.max(0, Math.round(y)), yb = Math.min(S.h, Math.round(y + h));
  for (let Y = ya; Y < yb; Y++) for (let X = xa; X < xb; X++) { const c = typeof col === "function" ? col(X, Y) : col; if (c) S.put(X, Y, c); }
}
/** Thick line (round-ish brush of radius r px) from a to b; col as in poly. */
export function stroke(S, ax, ay, bx, by_, r, col) {
  const L = Math.hypot(bx - ax, by_ - ay), n = Math.max(1, Math.ceil(L));
  const xa = Math.floor(Math.min(ax, bx) - r - 1), xb = Math.ceil(Math.max(ax, bx) + r + 1), ya = Math.floor(Math.min(ay, by_) - r - 1), yb = Math.ceil(Math.max(ay, by_) + r + 1);
  if (xb < 0 || yb < 0 || xa >= S.w || ya >= S.h) return;
  const dx = bx - ax, dy = by_ - ay, l2 = dx * dx + dy * dy || 1;
  for (let Y = Math.max(0, ya); Y <= Math.min(S.h - 1, yb); Y++) for (let X = Math.max(0, xa); X <= Math.min(S.w - 1, xb); X++) {
    const px = X + 0.5 - ax, py = Y + 0.5 - ay, t = Math.max(0, Math.min(1, (px * dx + py * dy) / l2)), qx = px - t * dx, qy = py - t * dy;
    if (qx * qx + qy * qy <= r * r) { const c = typeof col === "function" ? col(X, Y, t, Math.sqrt(qx * qx + qy * qy) / (r || 1), qx / (r || 1), qy / (r || 1)) : col; if (c) S.put(X, Y, c); }
  }
  void n;
}

/**
 * Leafy ball / puff: volume shading in flat tone bands, bumpy outline, lit from the upper left.
 * (cx, cy) centre and r radius in screen px. R = ramp (rgb arrays, dark → light). o: seed, amp (bump depth), bumps,
 * lift (tone shift), gain, outline (rgb or null = R[0]), sparkle (0..1 light leaves on the lit side), flatBottom (y px).
 */
export function ball(S, cx, cy, r, R, o = {}) {
  if (r < 0.6) return;
  const amp = o.amp ?? 0.12, bumps = o.bumps ?? 9, seed = o.seed ?? 0, lift = o.lift ?? 0, gain = o.gain ?? 1, n = R.length - 1;
  const out = o.outline === undefined ? R[0] : o.outline, spark = o.sparkle ?? 0.5, hi = R[n], flat = o.flatBottom ?? Infinity;
  const ox = Math.round(cx), oy = Math.round(cy), rmax = r * (1 + amp * 1.6) + 1, rin = Math.max(0, r * (1 - amp * 1.6) - 1.5);
  const xa = Math.max(0, Math.floor(cx - rmax)), xb = Math.min(S.w - 1, Math.ceil(cx + rmax)), ya = Math.max(0, Math.floor(cy - rmax)), yb = Math.min(S.h - 1, Math.ceil(Math.min(cy + rmax, flat)));
  if (xa > xb || ya > yb) return;
  const ph1 = seed * 1.7, ph2 = seed * 2.9, b2 = bumps * 2 + 1, W = S.w, O = S.o, D = S.d, inv = 1 / r;
  for (let Y = ya; Y <= yb; Y++) {
    const dy = Y + 0.5 - cy;
    for (let X = xa; X <= xb; X++) {
      const i = Y * W + X; if (O[i]) continue;
      const dx = X + 0.5 - cx, d2 = dx * dx + dy * dy; if (d2 > rmax * rmax) continue;
      const d = Math.sqrt(d2);
      let rr = r;
      if (d > rin) { const a = Math.atan2(dy, dx); rr = r * (1 + amp * Math.sin(a * bumps + ph1) + amp * 0.5 * Math.sin(a * b2 + ph2)); if (d > rr) continue; }
      let c;
      if ((d > rr - 1.05 || Y + 1 > flat) && out) c = out;
      else {
        const nx = dx * inv, ny = dy * inv, l = -(nx * 0.6 + ny * 0.8);               // light from the upper left
        const lx = X - ox, ly = Y - oy, nz = h2(lx * 7 + seed * 131, ly * 13 + seed * 17);
        let v = (0.42 + l * 0.42 * gain - (d / rr) * 0.12 + lift) * n + (nz - 0.5) * 0.9;
        if (spark > 0 && l > 0.15 && nz > 1 - spark * 0.08 * (l + 0.3)) { c = hi; }
        else c = R[band(v, n, lx, ly)];
      }
      O[i] = 1; const j = i * 3; D[j] = c[0]; D[j + 1] = c[1]; D[j + 2] = c[2];
    }
  }
}

/**
 * Grass blade from the root (x0, y0) up hp px tall, wp px wide at the root, tip shifted by lean px.
 * cols = [outline/dark, mid, light]. put = S.put / S.set bound, or a canvas px function.
 */
export function blade(put, x0, y0, hp, wp, lean, cols) {
  const h = Math.max(1, hp);
  if (wp < 1.7) {
    const n = Math.round(h);
    for (let j = 0; j < n; j++) { const k = j / h; put(Math.round(x0 + lean * k * k - 0.5), Math.round(y0 - j - 0.5), k > 0.6 ? cols[2] : cols[1]); }
    return;
  }
  const n = Math.round(h);
  for (let j = 0; j < n; j++) {
    const k = j / h, xc = x0 + lean * k * k, hw = (wp / 2) * Math.pow(1 - k, 0.75), xa = Math.round(xc - hw), xb = Math.max(xa, Math.round(xc + hw) - 1), y = Math.round(y0 - j - 0.5);
    for (let x = xa; x <= xb; x++) put(x, y, x === xb && xb > xa ? cols[0] : x === xa && xb - xa >= 2 ? cols[2] : k > 0.7 ? cols[2] : cols[1]);
  }
}
