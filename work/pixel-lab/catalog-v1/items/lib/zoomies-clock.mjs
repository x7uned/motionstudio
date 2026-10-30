// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-zoomies/film/apartment-props.mjs drawClockFace + hand (the analog
// wall clock above the sofa). Changes: draws through the caller's canvas view `c` (raster primitives / c.px, so it
// dissolves) instead of the apartment scratch buffer; centre/zoom passed in (film units × Z, film radius 26); the soft
// wall shadow darkens the pixels under it (was dim()); numerals 12/3/6/9 removed (catalog rule: no digits except s.value);
// the hands take angles instead of an hour value so the item can blend them.
import { mix } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;
export const CLOCK_R = 26;
const WOOD = ["#3A2214", "#5C3620", "#7C4C2A", "#9A6436", "#B47C46", "#CA9860", "#DEB682"];
const CREAM = ["#4A4038", "#8A8070", "#ACA494", "#CAC2B4", "#E0DACE", "#F0ECE4", "#FCFAF6"];
const CORAL = ["#4A1A1A", "#7A2E2A", "#A64236", "#C85A46", "#DE7A5E", "#EE9C80", "#F8C4AC"];
const INK = "#2A1E26";

function fill(c, cx, cy, r0, r1, col) {      // pixels with r0 ≤ distance < r1 (pixel centres)
  for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++) for (let x = Math.floor(cx - r1); x <= Math.ceil(cx + r1); x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d < r1 && d >= r0) c.px(x, y, typeof col === "function" ? col(x, y) : col);
  }
}
function thick(c, x0, y0, x1, y1, col, w) {
  if (w < 1.5) { c.line(R(x0), R(y0), R(x1), R(y1), col); return; }
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2;
  c.poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], col);
}
function hand(c, cx, cy, a, len, w, col) {
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, tail = len * 0.18;
  if (w < 2.2) { thick(c, cx - dx * tail, cy - dy * tail, cx + dx * len, cy + dy * len, col, w < 1.5 ? 1 : 2); return; }
  c.poly([[cx - dx * tail + nx * w * 0.5, cy - dy * tail + ny * w * 0.5], [cx + dx * len * 0.85 + nx * w * 0.45, cy + dy * len * 0.85 + ny * w * 0.45], [cx + dx * len, cy + dy * len], [cx + dx * len * 0.85 - nx * w * 0.45, cy + dy * len * 0.85 - ny * w * 0.45], [cx - dx * tail - nx * w * 0.5, cy - dy * tail - ny * w * 0.5]], col);
}
/** Clock at (cx, cy), Z = scale (film units → px), ha / ma = hour / minute hand angles (0 = 12 o'clock, clockwise). */
export function drawClockFace(c, cx, cy, Z, ha, ma) {
  const r = CLOCK_R * Z;
  // soft drop shadow on the wall (25 % darker), rim, face
  const sx = cx + 1.5 * Z, sy = cy + 2.5 * Z;
  for (let y = Math.floor(sy - r); y <= Math.ceil(sy + r); y++) for (let x = Math.floor(sx - r); x <= Math.ceil(sx + r); x++) {
    const ds = Math.hypot(x + 0.5 - sx, y + 0.5 - sy), d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (ds < r && d >= r) c.px(x, y, mix(c.get(x, y), "#000000", 0.25));
  }
  fill(c, cx, cy, 0, r, WOOD[0]);
  fill(c, cx, cy, r - 4.2 * Z, r - 0.8 * Z, (x, y) => WOOD[(x - cx) + (y - cy) < -r * 0.5 ? 5 : (x - cx) + (y - cy) > r * 0.6 ? 2 : 4]);
  fill(c, cx, cy, 0, r - 4.2 * Z, CREAM[6]);
  fill(c, cx, cy, r - 5.4 * Z, r - 4.2 * Z, CREAM[3]);
  const rf = CLOCK_R - 4.2;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 - Math.PI / 2, big = k % 3 === 0, r0 = rf - (big ? 5.2 : 3), r1 = rf - 1.2;
    thick(c, cx + Math.cos(a) * r0 * Z, cy + Math.sin(a) * r0 * Z, cx + Math.cos(a) * r1 * Z, cy + Math.sin(a) * r1 * Z, INK, big ? Math.max(1, 1.8 * Z) : Math.max(1, 1.0 * Z));
  }
  hand(c, cx, cy, ha - Math.PI / 2, 11.5 * Z, Math.max(1.6, 2.8 * Z), INK);
  hand(c, cx, cy, ma - Math.PI / 2, 17.5 * Z, Math.max(1.2, 1.9 * Z), INK);
  fill(c, cx, cy, 0, Math.max(1, 2.2 * Z), CORAL[3]);
  return r;
}
export { CREAM, WOOD, CORAL, INK };
