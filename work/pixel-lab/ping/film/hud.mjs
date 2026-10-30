// Screen-space overlays for the ping film: tags, screen bubbles, stamps, ping badges, the rewind clock, the server picker,
// the paper plane. Everything fades in/out through fade() (dither) — never a one-frame change.
import { MAIN, TINY, mix, fade, bayer } from "../../../../renderer/pixel/raster.mjs";
import { P, stext, textW } from "./world.mjs";

const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));

export function panel(c, x, y, w, h, a = 1, edge = P.p7, fill = P.card) {
  if (a <= 0) return; const g = fade(c, a); x = R(x); y = R(y); w = R(w); h = R(h);
  g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, mix(edge, P.ink, 0.45), 2);
  for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(fill, "#1D1430", (j - y) / h));
}
/** a label box: lines of text, first line in `col`, the rest ivory. Returns the box. */
export function tag(c, lines, cx, y, a, col = P.y, ps = 2, { minX = 10, maxX = 530 } = {}) {
  if (a <= 0) return null;
  const w = Math.max(...lines.map((l) => textW(MAIN, l, ps))) + 14, lh = 9 * ps, h = lines.length * lh + 8;
  const x = R(Math.max(minX, Math.min(maxX - w, cx - w / 2)));
  y = R(y + (1 - a) * 4); panel(c, x, y, w, h, a, col);
  lines.forEach((l, i) => stext(c, MAIN, l, x + 7, y + 4 + i * lh, ps, i ? P.iv : col, { alpha: a }));
  return { x, y, w, h };
}
/** a pointer line from (x0,y0) to (x1,y1) with a dot */
export function pointer(c, x0, y0, x1, y1, a, col) { if (a <= 0) return; const g = fade(c, a); g.line(R(x0), R(y0), R(x1), R(y1), col); g.disc(R(x1), R(y1), 2, col); }

/** a big rotated-free stamp: thick border + text, scales from 1.4× to 1× as it lands */
export function stamp(c, text, cx, cy, a, col, ps = 4, land = 1) {
  if (a <= 0) return; const k = 1 + 0.4 * (1 - easeOut(land)), s = ps * k, w = textW(MAIN, text, s) + 6 * s, h = 9 * s + 4 * s;
  const x = R(cx - w / 2), y = R(cy - h / 2), g = fade(c, a);
  g.rect(x - 2, y - 2, R(w) + 4, R(h) + 4, P.ink); g.rect(x, y, R(w), R(h), col); g.rect(x + R(s), y + R(s), R(w - 2 * s), R(h - 2 * s), P.ink);
  stext(c, MAIN, text, cx, y + 2.6 * s, s, col, { align: 0.5, alpha: a });
}

/** signal bars icon */
export function bars(c, x, y, n, col, off = "#3B2C5C", a = 1, s = 2) {
  const g = fade(c, a); for (let i = 0; i < 4; i++) { const h = (i + 1) * 2 * s; g.rect(R(x + i * 3 * s), R(y + 8 * s - h), 2 * s, h, i < n ? col : off); }
}
/** ping badge: [bars] LABEL  NN MS */
export function pingBadge(c, cx, y, label, ms, col, a, { ps = 2, pulse = 0, strike = 0 } = {}) {
  if (a <= 0) return null; const txt = `${label} ${Math.round(ms)} MS`, w = textW(MAIN, txt, ps) + 16 + 12 * ps, h = 9 * ps + 10, x = R(cx - w / 2);
  panel(c, x, R(y), w, h, a, mix(col, P.iv, pulse * 0.5));
  const n = ms < 30 ? 4 : ms < 70 ? 3 : ms < 120 ? 2 : 1; bars(c, x + 7, R(y) + 5, n, col, "#3B2C5C", a, ps / 2 + 0.5 | 0 || 1);
  stext(c, MAIN, txt, x + 12 + 12 * ps * 0.6, R(y) + 5, ps, col, { alpha: a });
  if (strike > 0) { const g = fade(c, a * strike); for (let k = 0; k < 3; k++) g.line(x + 4, R(y) + h - 4 + k, x + R((w - 8) * strike) + 4, R(y) + 3 + k, P.pk); }
  return { x, y: R(y), w, h };
}

/** a screen bubble: frame + title bar; content drawn by fill(rect, clip); pops from (fromX, fromY) with a tail */
export function bubble(c, rect, title, a, col, fill, { fromX = null, fromY = null, pop = 1 } = {}) {
  if (a <= 0) return null;
  const k = 0.35 + 0.65 * easeOut(pop), cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const ox = fromX == null ? 0 : (fromX - cx) * (1 - easeOut(pop)), oy = fromY == null ? 0 : (fromY - cy) * (1 - easeOut(pop));
  const r = { x: R(cx + ox - (rect.w * k) / 2), y: R(cy + oy - (rect.h * k) / 2), w: R(rect.w * k), h: R(rect.h * k) };
  const bar = Math.max(12, R(22 * k)), g = fade(c, a);
  // tail toward the source
  if (fromX != null) { const tx = R(Math.max(r.x + 14, Math.min(r.x + r.w - 14, fromX))); g.poly([[tx - 8, r.y + r.h + 2], [tx + 8, r.y + r.h + 2], [fromX, fromY]], col); g.poly([[tx - 5, r.y + r.h], [tx + 5, r.y + r.h], [fromX, fromY - 3]], P.ink); }
  g.rrect(r.x - 3, r.y - bar - 3, r.w + 6, r.h + bar + 6, col, 2); g.rect(r.x - 1, r.y - bar - 1, r.w + 2, bar, mix(col, P.ink, 0.25));
  stext(c, MAIN, title, r.x + 6, r.y - bar + (bar - 9 * Math.max(1, Math.min(2, bar / 11))) / 2, Math.max(1, Math.min(2, bar / 11)), P.ink, { alpha: a });
  // window dots
  for (let i = 0; i < 3; i++) g.disc(r.x + r.w - 10 - i * 11, R(r.y - bar / 2), 3, P.ink);
  g.rect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, P.ink);
  if (a >= 1) fill(r, [r.x, r.y, r.x + r.w, r.y + r.h]);
  else { // dissolve the content with the bubble
    const tmp = c.__tmp; tmp.d.set(c.d); fill(r, [r.x, r.y, r.x + r.w, r.y + r.h]);
    for (let y = Math.max(0, r.y); y < Math.min(960, r.y + r.h); y++) for (let x = Math.max(0, r.x); x < Math.min(540, r.x + r.w); x++) if (a <= bayer(x, y)) { const i = (y * 540 + x) * 3; c.d[i] = tmp.d[i]; c.d[i + 1] = tmp.d[i + 1]; c.d[i + 2] = tmp.d[i + 2]; }
  }
  return r;
}

/** rewind clock: dial + hand turning backwards + double left arrows */
export function rewindClock(c, cx, cy, r, ang, a, col = P.l) {
  if (a <= 0) return; const g = fade(c, a); cx = R(cx); cy = R(cy);
  g.disc(cx, cy, r + 3, P.ink); g.disc(cx, cy, r + 1, col); g.disc(cx, cy, r - 1, P.card);
  for (let k = 0; k < 12; k++) { const an = (k / 12) * 2 * Math.PI; g.px(R(cx + Math.cos(an) * (r - 3)), R(cy + Math.sin(an) * (r - 3)), col); }
  g.line(cx, cy, R(cx + Math.cos(ang) * (r - 4)), R(cy + Math.sin(ang) * (r - 4)), P.y); g.line(cx, cy, R(cx + Math.cos(ang * 12) * (r - 8)), R(cy + Math.sin(ang * 12) * (r - 8)), P.iv); g.disc(cx, cy, 1, P.y);
  // ◀◀ under the clock
  const ax = cx, ay = cy + r + 10;
  for (const o of [-8, 4]) g.poly([[ax + o + 7, ay - 6], [ax + o + 7, ay + 6], [ax + o - 3, ay]], col);
}

/** paper plane at (x, y) heading angle `ang`, size s */
export function paperPlane(c, x, y, ang, s, a = 1) {
  if (a <= 0) return; const g = fade(c, a), ca = Math.cos(ang), sa = Math.sin(ang), T = (u, v) => [x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s];
  g.poly([T(8, 0), T(-6, -5), T(-3, 0)], "#FDFEED"); g.poly([T(8, 0), T(-3, 0), T(-6, 4)], "#CFC6E2"); g.poly([T(8, 0), T(-4, 0.5), T(-5, 2)], "#9A8CB8");
  g.line(R(T(8, 0)[0]), R(T(8, 0)[1]), R(T(-6, -5)[0]), R(T(-6, -5)[1]), "#0B0812");
}

/** server picker panel: rows [name, ms]; sel = fractional selected index (moves smoothly) */
export function picker(c, x, y, w, rows, sel, a, chosen = 0) {
  if (a <= 0) return; const rh = 30, h = 34 + rows.length * rh; panel(c, x, y, w, h, a, P.l);
  stext(c, MAIN, "SERVERS", x + 10, y + 8, 2, P.l, { alpha: a });
  const g = fade(c, a), sy = y + 30 + sel * rh; g.rect(x + 6, R(sy), w - 12, rh - 4, mix(P.card, P.gr, 0.22)); g.rframe(x + 6, R(sy), w - 12, rh - 4, P.gr, 1);
  rows.forEach(([name, ms], i) => { const ry = y + 30 + i * rh, col = ms < 30 ? P.gr : ms < 70 ? P.y : P.pk;
    stext(c, MAIN, name, x + 14, ry + 7, 2, P.iv, { alpha: a }); const t = `${ms} MS`; stext(c, MAIN, t, x + w - 16 - textW(MAIN, t, 2), ry + 7, 2, col, { alpha: a });
    bars(c, x + w - 32 - textW(MAIN, t, 2) - 18, ry + 6, ms < 30 ? 4 : ms < 70 ? 3 : 1, col, "#3B2C5C", a, 1); });
  if (chosen > 0) { const ry = y + 30 + Math.round(sel) * rh; stext(c, MAIN, "✓", x + w - 2, ry + 7, 2, P.gr, { alpha: a * chosen }); }
}
