// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-eyes/film/panels.mjs#bird (L26–36). Changes: the bird takes optional
// shift (dy), squash (sx, sy), beak opening (open, 0 = the film's closed beak) and pupil offset (px, py, in film units)
// so it can hop, sing and look; at the defaults the drawing is the film's. The film's single beak triangle is split along
// its (−14, 0.5)–(−22, 0) edge into the two mandibles, the lower one drops with `open`; a dark mouth opens behind them.
// Imports: the cute kit (lib/cute.mjs, identical to the film's animals kit). catEye / SHINE of the film's cat.mjs are not used.
import { blob, flat, ell } from "./cute.mjs";

const R = Math.round;
const BLUE = ["#0E2A5A", "#1A4A8A", "#2A6EB8", "#3E8EDA", "#62AEF0", "#8ECCF8", "#BCE4FC", "#E6F6FF"];
const WING = ["#0A1E44", "#123468", "#1E5296", "#2A6EB8", "#3E8EDA", "#62AEF0", "#8ECCF8", "#BCE4FC"];
export function bird(c, x, y, s, o = {}) {
  const { dy = 0, sx = 1, sy = 1, open = 0, px = 0, py = 0 } = o;
  const P = (pts) => pts.map(([u, v]) => [x + u * s * sx, y + v * s * sy + dy]);
  c.rect(R(x - 30 * s), R(y + 16 * s), R(60 * s), Math.max(1, R(3 * s)), "#6A4A2A");   // the twig stays put
  blob(c, [P(ell(0, 0, 16, 14)), P([[12, -4], [26, -10], [22, 2]])], { ramp: BLUE, thick: 6 * s });
  flat(c, [P(ell(-2, 4, 9, 7))], "#F2E6D0");
  if (open > 0.01) flat(c, [P([[-14, 0.5], [-22, 0], [-22, 3 * open]])], "#07060E");   // the mouth
  flat(c, [P([[-14, -2], [-22, 0], [-14, 0.5]])], "#F4A82A");                           // upper mandible (fixed)
  flat(c, [P([[-14, 0.5], [-22, 3 * open], [-14, 3]])], "#F4A82A");                     // lower mandible (drops)
  const ex = x + (-7 + px) * s * sx, ey = y + (-4 + py) * s * sy + dy;
  c.disc(R(ex), R(ey), Math.max(1, R(2.6 * s)), "#07060E");
  c.px(R(ex - s), R(ey - s), "#FFFFFF");
  blob(c, [P([[2, -2], [14, 2], [6, 10], [-2, 6]])], { ramp: WING, thick: 3 * s });
}
