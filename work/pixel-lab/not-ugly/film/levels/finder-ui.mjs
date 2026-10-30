// FINDER · small drawing kit for the VIEW panel (works on any Canvas or fade() view; screen-local coordinates):
// outlined pixel text, chips, rounded rects, a pixel heart (cat-blink/film/catface.mjs drawHeart), 5-point stars,
// 4-point sparkles, a speaker icon. Everything takes an alpha `a` (ordered-dither dissolve) — nothing pops in one frame.
import { mix, bayer, fade, MAIN, TINY } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const backOut = (x, c1 = 1.70158) => { x = clamp01(x); const c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
export const UI = { O: "#0B0812", CARD: "#120C1D", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", MU: "#959595", p3: "#3B2C5C", p5: "#6E4FB0", p7: "#B08AE8", GR: "#65DA41", CY: "#7FE3F0", OR: "#F59A3A", RED: "#FF4D5E" };
export { mix, bayer, fade, MAIN, TINY };

export const tw = (c, s, scale = 2, font = MAIN) => c.measure(font, s, { scale });
/** Text with a dark 1-px outline + drop shadow (readable over anything). align: "l" | "c" | "r". */
export function otext(c, s, x, y, col, { scale = 2, a = 1, align = "l", font = MAIN, out = UI.O, shadow = true } = {}) {
  if (a <= 0) return 0; const g = fade(c, a), w = c.measure(font, s, { scale }), x0 = R(align === "c" ? x - w / 2 : align === "r" ? x - w : x), y0 = R(y);
  const offs = shadow ? [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 2], [1, 2], [2, 1]] : [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dx, dy] of offs) g.text(font, s, x0 + dx, y0 + dy, out, { scale });
  g.text(font, s, x0, y0, col, { scale }); return w;
}
/** Filled rounded rectangle with radius r (any r). */
export function rrect(c, x, y, w, h, r, col) {
  x = R(x); y = R(y); w = R(w); h = R(h);
  for (let j = 0; j < h; j++) {
    const dy = j < r ? r - j - 0.5 : j >= h - r ? j - (h - r) + 0.5 : 0, inset = dy > 0 ? R(r - Math.sqrt(Math.max(0, r * r - dy * dy))) : 0;
    c.rect(x + inset, y + j, w - 2 * inset, 1, col);
  }
}
/** Chip: dark rounded label with a coloured border; returns its width. */
export function chip(c, s, x, y, col, { a = 1, scale = 2, align = "l", fill = UI.CARD, txt = null, padX = 7, h = null, icon = null, iconW = 0 } = {}) {
  if (a <= 0) return 0; const g = fade(c, a), w = c.measure(MAIN, s, { scale }) + padX * 2 + iconW, H = h ?? 7 * scale + 10, x0 = R(align === "c" ? x - w / 2 : align === "r" ? x - w : x), y0 = R(y);
  rrect(g, x0 - 1, y0 - 1, w + 2, H + 2, 4, UI.O); rrect(g, x0, y0, w, H, 3, col); rrect(g, x0 + 2, y0 + 2, w - 4, H - 4, 2, fill);
  if (icon) icon(g, x0 + padX, y0 + R(H / 2));
  g.text(MAIN, s, x0 + padX + iconW, y0 + R((H - 7 * scale) / 2), txt ?? col, { scale }); return w;
}

// ---------------------------------------------------------------- heart (catface.mjs drawHeart, pop-in with overshoot)
export const HEART = ["#3A0A18", "#7A1430", "#B81E44", "#E03056", "#F2607A", "#FA9AAE", "#FFD2DC", "#FFFFFF"];
export function heart(g, cx, cy, size, k, o = {}) {
  k = clamp01(k); const a = sm(k, 0, 0.5) * clamp01(o.a ?? 1); if (a <= 0) return;
  const s = backOut(clamp01(k / 0.8), 1.5), Wd = size * Math.max(0, s); if (Wd < 2) return;
  const gv = fade(g, a), ramp = o.ramp ?? HEART, out = o.outline ?? ramp[0];
  const sc = Wd / 2.28, f = (x, y) => { const q = x * x + y * y - 1; return q * q * q - x * x * y * y * y; };
  const at = (X, Y) => f((X + 0.5 - cx) / sc, -(Y + 0.5 - cy) / sc + 0.12) <= 0;
  const y0 = Math.floor(cy - 1.25 * sc) - 1, y1 = Math.ceil(cy + 1.2 * sc) + 1, x0 = Math.floor(cx - 1.2 * sc) - 1, x1 = Math.ceil(cx + 1.2 * sc) + 1, hr = Math.max(0.6, 0.2 * sc);
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    if (!at(X, Y)) continue;
    if (!at(X - 1, Y) || !at(X + 1, Y) || !at(X, Y - 1) || !at(X, Y + 1)) { gv.px(X, Y, out); continue; }
    const hx = (X + 0.5 - cx) / sc, hy = -(Y + 0.5 - cy) / sc + 0.12;
    if ((hx + 0.52) ** 2 + ((hy - 0.62) / 1.25) ** 2 <= (hr / sc) ** 2 * (sc < 5 ? 1.6 : 1)) { gv.px(X, Y, ramp[7]); continue; }
    let v = 4.2 + 0.9 * hy - 0.75 * hx;
    if (!at(X + 1, Y + 1) || !at(X + 2, Y + 2)) v -= 1.1;
    if (!at(X - 2, Y - 2)) v += 0.9;
    const fl = Math.floor(v), fr = v - fl, q = fr < 0.38 ? fl : fr > 0.62 ? fl + 1 : (fr - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl;
    gv.px(X, Y, ramp[Math.max(1, Math.min(6, q))]);
  }
}

// ---------------------------------------------------------------- 5-point star: empty (rim) → filled (pops in with fill k)
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
export function star(g, cx, cy, r, fill, { a = 1, col = UI.Y, empty = "#2A2046", out = UI.O, rim = "#8A7AB8" } = {}) {
  if (a <= 0) return; const gv = fade(g, a), f = clamp01(fill), rr = r * (1 + 0.28 * Math.sin(Math.PI * f) * (f < 1 ? 1 : 0));
  const P = Array.from({ length: 10 }, (_, i) => { const an = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? rr * 0.47 : rr; return [cx + Math.cos(an) * q, cy + 0.08 * rr + Math.sin(an) * q]; });
  const at = (X, Y) => inPoly(X + 0.5, Y + 0.5, P);
  for (let Y = Math.floor(cy - rr - 1); Y <= Math.ceil(cy + rr + 1); Y++) for (let X = Math.floor(cx - rr - 1); X <= Math.ceil(cx + rr + 1); X++) {
    if (!at(X, Y)) continue;
    const edge = !at(X - 1, Y) || !at(X + 1, Y) || !at(X, Y - 1) || !at(X, Y + 1);
    if (edge) { gv.px(X, Y, out); continue; }
    if (f > 0 && f > bayer(X, Y) * 0.999) { const u = X + 0.5 - cx, v = Y + 0.5 - cy, lit = u + v < -rr * 0.15; gv.px(X, Y, lit ? mix(col, "#FFFFFF", 0.4) : u + v > rr * 0.45 ? mix(col, "#B06A10", 0.4) : col); }
    else { const inner = at(X - 1, Y - 1) && at(X + 1, Y + 1) && at(X - 1, Y + 1) && at(X + 1, Y - 1); gv.px(X, Y, inner && r > 6 ? empty : rim); }
  }
}
/** 4-point twinkle: size r, brightness k 0..1. */
export function sparkle(g, x, y, r, k, col = "#FFF6C8") {
  if (k <= 0.02) return; const gv = fade(g, Math.min(1, k * 1.6)), L = Math.max(1, R(r * (0.5 + 0.5 * k)));
  for (let i = -L; i <= L; i++) { const e = Math.abs(i) === L ? mix(col, "#B08AE8", 0.5) : col; gv.px(R(x + i), R(y), e); gv.px(R(x), R(y + i), e); }
  if (L >= 3) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) gv.px(R(x + dx), R(y + dy), mix(col, "#FFFFFF", 0.5));
  gv.px(R(x), R(y), "#FFFFFF");
}
/** Little speaker icon with `waves` 0..3 sound arcs (continuous). */
export function speaker(g, x, y, col, waves = 0, a = 1) {
  if (a <= 0) return; const gv = fade(g, a); x = R(x); y = R(y);
  gv.rect(x, y - 2, 3, 5, col); for (let i = 0; i < 4; i++) gv.rect(x + 3 + i, y - 2 - i, 1, 5 + 2 * i, col);
  for (let k = 0; k < 3; k++) { const v = clamp01(waves - k); if (v <= 0) continue; const gw = fade(gv, v), r = 4 + k * 3; for (let j = -r; j <= r; j++) { const xx = R(Math.sqrt(Math.max(0, r * r - j * j))); if (Math.abs(j) < r * 0.8) gw.px(x + 6 + xx, y + j, col); } }
}
/** Copy a Canvas region onto another (optional per-pixel alpha dissolve and a key colour treated as transparent). */
export function blit(dst, src, x, y, a = 1) {
  const W = src.w, H = src.h;
  for (let j = 0; j < H; j++) { const Y = y + j; if (Y < 0 || Y >= dst.h) continue;
    for (let i = 0; i < W; i++) { const X = x + i; if (X < 0 || X >= dst.w) continue; if (a < 1 && a <= bayer(X, Y)) continue; const s = (j * W + i) * 3, d = (Y * dst.w + X) * 3; dst.d[d] = src.d[s]; dst.d[d + 1] = src.d[s + 1]; dst.d[d + 2] = src.d[s + 2]; } }
}
