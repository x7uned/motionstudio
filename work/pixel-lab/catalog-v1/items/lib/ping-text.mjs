// catalog-v1 copy (2026-10-26) of work/pixel-lab/ping/film/world.mjs textBitmap / stext / textW (pixel text that scales
// smoothly: nearest sampling of a 1× bitmap of the MAIN/TINY font). Changes: stext takes separate x / y pixel sizes
// (stextXY, for squash) and a colour function; drawing goes through c.px only, so dissolve views work.
import { Canvas, TINY, bayer } from "../../../../../renderer/pixel/raster.mjs";

const GW = 540, GH = 960, R = Math.round;
const textCache = new Map();
export function textBitmap(font, str) {
  const key = (font === TINY ? "T" : "M") + str; let b = textCache.get(key); if (b) return b;
  const w = Math.max(1, new Canvas(1, 1).measure(font, str)) + 2, h = font.height + 2, cv = new Canvas(w, h, "#000000");
  cv.text(font, str, 1, 1, "#FFFFFF"); const m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = cv.d[i * 3] > 128 ? 1 : 0;
  b = { w, h, m }; textCache.set(key, b); return b;
}
export function textW(font, str, ps) { return textBitmap(font, str).w * ps; }
/** text with its left/top at (sx, sy), pixel sizes psx × psy (any positive floats); col = colour or (x, y) => colour. */
export function stextXY(c, font, str, sx, sy, psx, psy, col, { align = 0, alpha = 1 } = {}) {
  const b = textBitmap(font, str), W = b.w * psx, H = b.h * psy, x0 = sx - W * align;
  const a = Math.max(0, Math.floor(x0)), e = Math.min(GW, Math.ceil(x0 + W)), top = Math.max(0, Math.floor(sy)), bot = Math.min(GH, Math.ceil(sy + H));
  for (let y = top; y < bot; y++) { const v = Math.floor((y - sy) / psy); if (v < 0 || v >= b.h) continue;
    for (let x = a; x < e; x++) { const u = Math.floor((x - x0) / psx); if (u < 0 || u >= b.w || !b.m[v * b.w + u]) continue; if (alpha < 1 && alpha <= bayer(x, y)) continue; const cc = typeof col === "function" ? col(x, y) : col; if (cc) c.px(x, y, cc); } }
  return { x: x0, w: W, h: H };
}
export function stext(c, font, str, sx, sy, ps, col, { align = 0, alpha = 1, shadow = null } = {}) {
  if (shadow) stextXY(c, font, str, sx + Math.max(1, R(ps * 0.6)), sy + Math.max(1, R(ps * 0.6)), ps, ps, shadow, { align, alpha });
  return stextXY(c, font, str, sx, sy, ps, ps, col, { align, alpha });
}
/** split a label into 1 or 2 lines (balanced at a word break); returns the line list with the widest first-fit width. */
export function splitLines(font, label, n) {
  const words = String(label).split(/\s+/).filter(Boolean);
  if (n === 1 || words.length < 2) return [words.join(" ")];
  let best = null;
  for (let i = 1; i < words.length; i++) { const L = [words.slice(0, i).join(" "), words.slice(i).join(" ")], w = Math.max(...L.map((s) => textW(font, s, 1))); if (!best || w < best.w) best = { L, w }; }
  return best.L;
}
