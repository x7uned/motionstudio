// money group · shared helpers for the init catalog (coin, banknote, bank-card, wallet, piggy-bank, bank, cart, document).
import { blob, RAMP, ell, bez } from "./cat-cute.mjs";
import { fade, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { band } from "./layout.mjs";
export { blob, RAMP, ell, bez, fade, mix, bayer, band };

export const OL = "#07060E", R = Math.round, TAU = Math.PI * 2;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);

// 8-step ramps, dark -> light
export const RP = {
  gold: ["#3A2204", "#7A4A08", "#B8780E", "#E0A01C", "#F5C238", "#FBD95E", "#FDEB92", "#FFF8CE"],
  note: ["#10331E", "#1B5230", "#2A7040", "#3C8E50", "#58AC62", "#7CC878", "#A6E09A", "#D4F4BC"],
  cream: ["#5A4A38", "#8A7658", "#B49C74", "#D2BC90", "#E6D4A8", "#F2E6C0", "#FAF2D8", "#FFFBEC"],
  card: ["#0C1648", "#142468", "#1E3A98", "#2C58C4", "#4478E0", "#6898F0", "#98BEF8", "#D0E6FF"],
  leather: RAMP.brown,
  pink: RAMP.pink,
  stone: ["#4A4252", "#6E6676", "#948C9A", "#B8B0B4", "#D6CEC6", "#EAE2D4", "#F6F0E2", "#FFFCF2"],
  paper: ["#6C6888", "#9692B0", "#BCB8D2", "#D8D6E8", "#EAE8F4", "#F6F5FB", "#FFFFFF", "#FFFFFF"],
  steel: RAMP.gray,
  red: ["#3A0A12", "#6E1422", "#A02034", "#D03048", "#EC5468", "#F68090", "#FAAEB8", "#FFDCE0"],
  teal: ["#06303A", "#0E4E5C", "#187080", "#2494A4", "#3CB4C0", "#66D0D8", "#9AE6E8", "#D2F6F4"],
  ok: ["#0C3A1C", "#16602C", "#22863C", "#34AA50", "#52CC68", "#7EE890", "#B0F6B8", "#E0FFE2"],
};
/** Flat tone band on ramp index idx (0..len-1) with a narrow dithered seam. */
export const bd = (rp, idx, x, y, w = 0.3) => band(rp, clamp01(idx / (rp.length - 1)), x, y, w);

/** Pixel buffer: set pixels, then flush with an automatic 1-px outline on the transparent neighbours. */
export class Buf {
  constructor(x0, y0, w, h) { this.x0 = Math.floor(x0); this.y0 = Math.floor(y0); this.w = Math.ceil(w) + 2; this.h = Math.ceil(h) + 2; this.col = new Array(this.w * this.h).fill(null); }
  set(x, y, c) { x -= this.x0; y -= this.y0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.col[y * this.w + x] = c; }
  get(x, y) { x -= this.x0; y -= this.y0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.col[y * this.w + x]; }
  flush(c, outline = OL) {
    const { w, h, col } = this;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = col[y * w + x];
      if (k) c.px(this.x0 + x, this.y0 + y, k);
      else if (outline && ((x > 0 && col[y * w + x - 1]) || (x < w - 1 && col[y * w + x + 1]) || (y > 0 && col[(y - 1) * w + x]) || (y < h - 1 && col[(y + 1) * w + x]))) c.px(this.x0 + x, this.y0 + y, outline);
    }
  }
}

/** Rounded rectangle polygon. */
export function rrP(x0, y0, x1, y1, r, n = 5) {
  const out = [], cs = [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI / 2) * (i / n); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}
export const xfP = (pts, f) => pts.map(([x, y]) => f(x, y));
export function starP(cx, cy, ro, ri, n = 5, rot = -Math.PI / 2) { const o = []; for (let i = 0; i < n * 2; i++) { const a = rot + (Math.PI * i) / n, r = i % 2 ? ri : ro; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
/** Thick line as a quad (w px wide). */
export function tline(c, x0, y0, x1, y1, w, col) {
  if (w <= 1.2) { c.line(R(x0), R(y0), R(x1), R(y1), col); return; }
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2;
  c.poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], col);
}
/** Four-point sparkle, arm length r. */
export function sparkle(c, x, y, r, col = "#FFFFFF", mid = "#FFF2B8") {
  x = R(x); y = R(y); r = R(r); if (r < 1) return;
  for (let i = 1; i <= r; i++) { const th = i > r * 0.55 ? 0 : 1; c.px(x + i, y, i > r * 0.4 ? mid : col); c.px(x - i, y, i > r * 0.4 ? mid : col); c.px(x, y + i, i > r * 0.4 ? mid : col); c.px(x, y - i, i > r * 0.4 ? mid : col); if (th && i < r * 0.5) { c.px(x + i, y + 1, mid); c.px(x - i, y + 1, mid); c.px(x + i, y - 1, mid); c.px(x - i, y - 1, mid); c.px(x + 1, y + i, mid); c.px(x - 1, y + i, mid); c.px(x + 1, y - i, mid); c.px(x - 1, y - i, mid); } }
  c.px(x, y, col); if (r >= 3) { c.px(x + 1, y, col); c.px(x - 1, y, col); c.px(x, y + 1, col); c.px(x, y - 1, col); }
}
/** Dithered contact shadow (ellipse). */
export function cshadow(c, x, y, rx, ry, k = 0.4) {
  rx = Math.max(1, R(rx)); ry = Math.max(1, R(ry));
  c.tint(R(x - rx), R(y - ry), rx * 2 + 1, ry * 2 + 1, (X, Y) => { const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; return d >= 1 ? 0 : k * Math.min(1, (1 - d) * 2.2); }, "#000000", 3);
}
/** Soft coloured halo (dithered tint) around a centre. */
export function halo(c, x, y, rx, ry, col, k) {
  if (k <= 0.01) return; rx = R(rx); ry = R(ry);
  c.tint(R(x - rx), R(y - ry), rx * 2 + 1, ry * 2 + 1, (X, Y) => { const d = Math.sqrt(((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2); return d >= 1 ? 0 : k * (1 - d) * (1 - d); }, col, 5);
}

// ---- offscreen sprite cache: paint a costly shaded object once per (quantised) parameter set, blit it every frame.
import { Canvas } from "../../../../../renderer/pixel/raster.mjs";
const KEYC = "#FF00FE", CACHE = new Map();
/** cached(key, w, h, paint) → { cv, info }; paint(offCanvas) may return an info object kept with the sprite. */
export function cached(key, w, h, paint) {
  let e = CACHE.get(key);
  if (!e) { if (CACHE.size > 300) CACHE.clear(); const cv = new Canvas(Math.ceil(w), Math.ceil(h), KEYC); const info = paint(cv); e = { cv, info }; CACHE.set(key, e); }
  return e;
}
/** Blit an offscreen sprite with its top-left at (x, y) through canvas view c (key colour = transparent). */
export function blit(c, cv, x, y) {
  const d = cv.d, w = cv.w, h = cv.h;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = (j * w + i) * 3; if (d[k] === 255 && d[k + 1] === 0 && d[k + 2] === 254) continue; c.px(x + i, y + j, [d[k], d[k + 1], d[k + 2]]); }
}
