// catalog-v1 copy (2026-10-26) of not-ugly/film/levels/room-props.mjs#pill and #dimLine (+ INK, same code); changes: dimLine
// drew its start tick only from grow > 0 and its end tick only from grow ≥ 1, so both ticks popped in whole. Here the
// line runs from p to p + (q − p)·grow (the end tick travels with it), the start tick is always there (the item dissolves
// it in), and the dashes keep the film's 2-on/2-off pattern. Import path changed only.
import { fade, MAIN } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;
export const INK = "#0B0812";

/** A value/label pill centred on cx, its top at y (the film's pill, unchanged). */
export function pill(c, text, cx, y, a = 1, col = "#F4CA50", s = 2) {
  if (a <= 0) return null; const g = fade(c, a), tw = c.measure(MAIN, text, { scale: s }), w = tw + 12, h = 7 * s + 8, x0 = R(cx - w / 2), y0 = R(y);
  g.rrect(x0 - 1, y0 - 1, w + 2, h + 2, INK, 2); g.rrect(x0, y0, w, h, "#2A1F40", 2); g.rect(x0 + 2, y0 + 1, w - 4, 1, "#4A3A6A");
  g.text(MAIN, text, x0 + 6, y0 + 5, INK, { scale: s }); g.text(MAIN, text, x0 + 6, y0 + 4, col, { scale: s });
  return { x: x0, y: y0, w, h };
}

/** The dimension line from p toward q, drawn out to the fraction grow (0..1); end ticks at p and at the drawn end. */
export function dimLine(c, p, q, a = 1, grow = 1, col = "#FDFEED") {
  if (a <= 0) return; const g = fade(c, a), k = Math.max(0, Math.min(1, grow));
  const fx = q[0] - p[0], fy = q[1] - p[1], F = Math.hypot(fx, fy) || 1, ux = fx / F, uy = fy / F, nx = -uy, ny = ux;   // direction from the full line
  const ex = p[0] + fx * k, ey = p[1] + fy * k, L = F * k;
  const n = Math.floor(L);
  for (let i = 0; i <= n; i++) { if (i % 4 >= 2) continue; const X = R(p[0] + ux * i), Y = R(p[1] + uy * i); g.px(X + 1, Y + 1, INK); g.px(X, Y, col); }
  const tick = (P) => { for (let m = -4; m <= 4; m++) { const X = R(P[0] + nx * m), Y = R(P[1] + ny * m); g.px(X + 1, Y + 1, INK); g.px(X, Y, col); } };
  tick(p); if (k > 0) tick([ex, ey]);
}
