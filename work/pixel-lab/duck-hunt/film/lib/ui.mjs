// Screen-space helpers for the retro-rules pixel films (frozen copy per film). Text that scales smoothly (nearest
// sampling of a 1× bitmap), the palette, tags, panels, stamps, pointers, easing. Copied from ../../ping/film/world.mjs
// and hud.mjs (2026-10-24) so the finished film stays byte-identical when those change.
import { Canvas, MAIN, TINY, mix, bayer, fade } from "./raster.mjs";

const GW = 540, GH = 960, R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
export const rnd = (n) => { let h = (n * 374761393 + 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export const P = {
  ink: "#0B0812", card: "#120C1D", iv: "#FDFEED", y: "#F4CA50", yl: "#FAE375", l: "#E0CDF8", p: "#8D59DA", pk: "#E03056", gr: "#65DA41",
  p1: "#1D1628", p3: "#3B2C5C", p5: "#6E4FB0", p7: "#B08AE8", cy: "#5FD3F0", cyD: "#2A6E9A", or: "#F08A3C", orD: "#8A3A18", red: "#E8344E",
};

const textCache = new Map();
function textBitmap(font, str) {
  const key = (font === TINY ? "T" : "M") + str; let b = textCache.get(key); if (b) return b;
  const w = Math.max(1, new Canvas(1, 1).measure(font, str)) + 2, h = font.height + 2, cv = new Canvas(w, h, "#000000");
  cv.text(font, str, 1, 1, "#FFFFFF"); const m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = cv.d[i * 3] > 128 ? 1 : 0;
  b = { w, h, m }; textCache.set(key, b); return b;
}
/** text with its left/top at (sx, sy), pixel size ps (any positive float). align: 0 left, 0.5 centre, 1 right. */
export function stext(c, font, str, sx, sy, ps, col, { align = 0, alpha = 1, shadow = null } = {}) {
  const b = textBitmap(font, str), W = b.w * ps, H = b.h * ps, x0 = sx - W * align;
  if (shadow) stext(c, font, str, sx + Math.max(1, R(ps * 0.6)), sy + Math.max(1, R(ps * 0.6)), ps, shadow, { align, alpha });
  const a = Math.max(0, Math.floor(x0)), e = Math.min(GW, Math.ceil(x0 + W)), top = Math.max(0, Math.floor(sy)), bot = Math.min(GH, Math.ceil(sy + H));
  for (let y = top; y < bot; y++) { const v = Math.floor((y - sy) / ps); if (v < 0 || v >= b.h) continue;
    for (let x = a; x < e; x++) { const u = Math.floor((x - x0) / ps); if (u < 0 || u >= b.w || !b.m[v * b.w + u]) continue; if (alpha < 1 && alpha <= bayer(x, y)) continue; c.px(x, y, typeof col === "function" ? col(x, y) : col); } }
  return { x: x0, w: W, h: H };
}
export const textW = (font, str, ps) => textBitmap(font, str).w * ps;

export function panel(c, x, y, w, h, a = 1, edge = P.p7, fill = P.card) {
  if (a <= 0) return; const g = fade(c, a); x = R(x); y = R(y); w = R(w); h = R(h);
  g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, mix(edge, P.ink, 0.45), 2);
  for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(fill, "#1D1430", (j - y) / h));
}
/** a label box: lines of text, first line in `col`, the rest ivory */
export function tag(c, lines, cx, y, a, col = P.y, ps = 2, { minX = 10, maxX = 530 } = {}) {
  if (a <= 0) return null;
  const w = Math.max(...lines.map((l) => textW(MAIN, l, ps))) + 14, lh = 9 * ps, h = lines.length * lh + 8;
  const x = R(Math.max(minX, Math.min(maxX - w, cx - w / 2)));
  y = R(y + (1 - a) * 4); panel(c, x, y, w, h, a, col);
  lines.forEach((l, i) => stext(c, MAIN, l, x + 7, y + 4 + i * lh, ps, i ? P.iv : col, { alpha: a }));
  return { x, y, w, h };
}
export function pointer(c, x0, y0, x1, y1, a, col) { if (a <= 0) return; const g = fade(c, a); g.line(R(x0), R(y0), R(x1), R(y1), col); g.disc(R(x1), R(y1), 2, col); }
/** a big stamp: thick border + text, scales from 1.4× to 1× as it lands */
export function stamp(c, text, cx, cy, a, col, ps = 4, land = 1) {
  if (a <= 0) return; const k = 1 + 0.4 * (1 - easeOut(land)), s = ps * k, w = textW(MAIN, text, s) + 6 * s, h = 9 * s + 4 * s;
  const x = R(cx - w / 2), y = R(cy - h / 2), g = fade(c, a);
  g.rect(x - 2, y - 2, R(w) + 4, R(h) + 4, P.ink); g.rect(x, y, R(w), R(h), col); g.rect(x + R(s), y + R(s), R(w - 2 * s), R(h - 2 * s), P.ink);
  stext(c, MAIN, text, cx, y + 2.6 * s, s, col, { align: 0.5, alpha: a });
}
