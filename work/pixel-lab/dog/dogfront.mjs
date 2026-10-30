// Front-facing pixel Labrador mid-shake (head and ears swung by angle a around the neck). Units ≈ px at s = 1; origin = neck.
import { bayer, mix } from "../../../renderer/pixel/raster.mjs";
import { GOLD } from "./dog.mjs";

const OUT = "#2A1608", NOSE = "#1A0E06";
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
export function drawDogFront(g, cx, cy, s, { a = 0.3, flap = 1 } = {}) {
  const R = Math.round, T = (x, y, turn = 0) => { const [rx, ry] = turn ? rot(x, y - 4, turn) : [x, y - 4]; return [cx + rx * s, cy + (ry + 4) * s]; };
  const shade = (y0, y1, base = 4) => (x, y) => GOLD[Math.max(1, Math.min(4, Math.round(base - ((y - y0) / (y1 - y0)) * 2.6 + (bayer(x, y) - 0.5) * 0.9)))];
  const ell = (x, y, rx, ry, fillFn, turn = 0, edge = true) => {
    const pts = []; for (let i = 0; i < 48; i++) { const t = (i / 48) * Math.PI * 2; pts.push(T(x + Math.cos(t) * rx, y + Math.sin(t) * ry, turn)); }
    if (edge) { const big = pts.map(([px, py]) => { const [ox, oy] = T(x, y, turn); return [ox + (px - ox) * (1 + 1.2 / (rx * s)), oy + (py - oy) * (1 + 1.2 / (ry * s))]; }); g.poly(big, OUT); }
    g.poly(pts, null, fillFn); return pts;
  };
  // body behind, chest, legs
  ell(0, 34, 27, 17, shade(cy + 18 * s, cy + 52 * s, 3));
  for (const lx of [-13, 6]) { const [x0, y0] = T(lx, 34), [, y1] = T(lx, 66), w = R(7 * s); g.rect(R(x0) - 1, R(y0), w + 2, R(y1 - y0) + 1, OUT); g.rect(R(x0), R(y0), w, R(y1 - y0), GOLD[3]); g.rect(R(x0), R(y0), Math.max(1, R(1.5 * s)), R(y1 - y0), GOLD[4]); const [px, py] = T(lx + 3.5, 66); g.ellipse(R(px), R(py), R(5.5 * s), R(2.5 * s), GOLD[2]); }
  ell(0, 22, 19, 21, shade(cy + 2 * s, cy + 44 * s, 4.4));
  // wet chest clumps
  for (let i = 0; i < 9; i++) { const t = Math.PI * (0.15 + i * 0.087), [bx, by] = T(Math.cos(t) * 18, 22 + Math.sin(t) * 20), [tx, ty] = T(Math.cos(t) * 22, 22 + Math.sin(t) * 25); g.poly([[bx - 2 * s, by], [bx + 2 * s, by], [tx, ty]], GOLD[3]); }
  // ears flung outward (behind the head)
  for (const side of [-1, 1]) {
    const base = [side * 13, -22], tip = [side * (36 + 6 * flap), -20 - side * 10 * Math.sin(a) - 8 * flap], mid = [side * 26, -12 + 3 * flap];
    const pts = [T(base[0] - side * 3, base[1] - 4, a), T(tip[0], tip[1], a), T(mid[0], mid[1] + 4, a), T(base[0] + side * 2, base[1] + 8, a)];
    const big = pts.map(([x, y]) => { const [ox, oy] = T(base[0], base[1], a); return [ox + (x - ox) * 1.08, oy + (y - oy) * 1.08]; });
    g.poly(big, OUT); g.poly(pts, null, (x, y) => (bayer(x, y) < 0.4 ? GOLD[1] : GOLD[2]));
  }
  // head, muzzle, face — turned by a
  ell(0, -14, 17, 16, shade(cy - 30 * s, cy + 2 * s, 4.4), a);
  ell(0, -2, 10.5, 8, shade(cy - 10 * s, cy + 6 * s, 4.6), a);
  { const nose = []; for (let i = 0; i < 24; i++) { const t = (i / 24) * Math.PI * 2; nose.push(T(Math.cos(t) * 4.2, -6 + Math.sin(t) * 3, a)); } g.poly(nose, NOSE); const [hx, hy] = T(-1.5, -7.5, a); g.px(R(hx), R(hy), "#7A6A60"); }
  { const [x0, y0] = T(-5, 2, a), [x1, y1] = T(0, 3.5, a), [x2, y2] = T(5, 2, a); g.line(R(x0), R(y0), R(x1), R(y1), GOLD[0]); g.line(R(x1), R(y1), R(x2), R(y2), GOLD[0]); }
  for (const side of [-1, 1]) { const [ex, ey] = T(side * 7, -16, a), w = Math.max(2, R(3 * s)); g.rect(R(ex - w / 2), R(ey - w / 2), w, w, NOSE); g.px(R(ex - w / 2), R(ey - w / 2), "#FDFEED"); const [bx, by] = T(side * 7, -20.5, a), [bx2, by2] = T(side * 11, -19.5, a); g.line(R(bx), R(by), R(bx2), R(by2), GOLD[4]); }
  // jowls flapping
  for (const side of [-1, 1]) { const [jx, jy] = T(side * 9, 3, a), [tx, ty] = T(side * (12 + 3 * flap), 7, a); g.poly([[jx, jy - 2 * s], [jx + side * 2 * s, jy + 2 * s], [tx, ty]], GOLD[3]); }
  return T(0, -14, a);
}
