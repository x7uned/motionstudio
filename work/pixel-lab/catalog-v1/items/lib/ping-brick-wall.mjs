// catalog-v1 copy (2026-10-26) of work/pixel-lab/ping/film/world.mjs#brickWall: the BRICK ramp, the rnd hash, the per-pixel
// brick colour rule (mortar on each brick's top and left edge at zoom > 0.7, the per-brick shade, the light falloff from the
// left, the edge fade, the Bayer dither on the ramp step) and the wrect fill. Changes: the wall is painted brick by brick in
// world units (screen = centre + world × z), so single bricks can crack, drop and dissolve; each pixel's colour is still
// computed from its brick's own row and column and from its SOURCE position, so a falling brick keeps its look.
// New: crack lines spread from one point (eased progress), a crumble (bricks fall and dissolve one by one, eased), and a
// warm lamp light (dithered, grows with the eased amount). Only the film's brick palette is used, no text.
import { bayer, fade } from "../../../../../renderer/pixel/raster.mjs";

const FALLERS = 0.3, R = Math.round, X0 = -100, X1 = 100, Y0 = -70, Y1 = 70, BW = 12, BH = 5, SEED = 11, FALL = 28;
const BRICK = ["#140F20", "#1C1530", "#251C3E", "#2E2350", "#3A2D62"];          // the film's BRICK ramp
const WARM = ["#2A1A22", "#4A2A24", "#6E3A26", "#8E5230", "#B07238"];           // same steps, lamp-lit
const HOLE = "#0A0712", CRACK = "#07050C";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const rnd = (n) => { let h = (n * 374761393 + 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// the film's per-pixel brick rule; wx, wy world, px, py screen pixel (for the dither), row/col/off of its brick
function brickStep(wx, wy, px, py, z, row, col, off) {
  const rowY = Y0 + row * BH, fy = wy - rowY, fx = wx - (X0 - off + col * BW);
  const mortar = (fy < 0.8 || fx < 0.8) && z > 0.7;
  const v = rnd(SEED + row * 131 + col * 17), edge = clamp01((wx - X0) / 40) * clamp01((X1 - wx) / 40);
  let k = 2 + (v > 0.8 ? 1 : v < 0.15 ? -1 : 0) + (1 - clamp01((wx - X0) / 60)) * 0.9;
  if (mortar) k -= 1.4;
  return Math.max(0, Math.min(BRICK.length - 1, Math.floor(k + 0.5 * (1 - edge) * -1 + (k % 1 > bayer(px, py) ? 1 : 0))));
}

// the cracks: six polylines from one impact point, a random walk with 6 world px steps (fixed seeds, pure)
const IMPACT = [-24, -18];
const CRACKS = Array.from({ length: 6 }, (_, i) => {
  const pts = [IMPACT.slice()]; let a = (i / 6) * Math.PI * 2 + (rnd(i * 5 + 1) - 0.5) * 0.7, x = IMPACT[0], y = IMPACT[1];
  const n = 9 + Math.floor(rnd(i * 9 + 2) * 6);
  for (let s = 0; s < n; s++) { a += (rnd(i * 100 + s * 3 + 7) - 0.5) * 0.9; x += Math.cos(a) * 6; y += Math.sin(a) * 6; pts.push([x, y]); }
  return pts;
});
const ORDER = []; for (let r = 0; r < 28; r++) for (let j = 0; j < 20; j++) ORDER.push({ r, j, o: rnd(r * 71 + j * 29 + 3) });

/** Draw the brick wall centred at (cx, cy). p: cr (cracks 0..1), cm (crumble 0..1), lt (lamp light 0..1). */
export function drawBrickWall(c, cx, cy, z, p) {
  const sx = (wx) => cx + wx * z, sy = (wy) => cy + wy * z;
  // the hole behind the wall (what a dropped brick leaves)
  for (let py = R(sy(Y0)); py < R(sy(Y1)); py++) for (let px = R(sx(X0)); px < R(sx(X1)); px++) c.px(px, py, HOLE);
  const bricks = ORDER.slice().sort((a, b) => a.r - b.r || a.j - b.j);
  for (const b of bricks) {
    const off = b.r % 2 ? BW / 2 : 0, bx0 = X0 - off + b.j * BW, cx0 = Math.max(bx0, X0), cx1 = Math.min(bx0 + BW, X1);
    if (cx1 <= cx0) continue;
    // only the bricks with o < FALLERS drop; each drops in its own window of the eased crumble, so at cm = 1 they are all
    // gone and no brick is left half-fallen (a settled state never freezes a brick in mid-air)
    const u = b.o / FALLERS, pr = b.o < FALLERS ? clamp01((p.cm - u * 0.75) / 0.25) : 0, fall = pr * pr * FALL, a = 1 - pr;
    if (a <= 0) continue;
    const dst = a < 1 ? fade(c, a) : c, rowY = Y0 + b.r * BH;
    for (let py = Math.floor(sy(rowY)); py < Math.ceil(sy(rowY + BH + fall)); py++) for (let px = Math.floor(sx(cx0)); px < Math.ceil(sx(cx1)); px++) {
      const wx = (px + 0.5 - cx) / z, wy = (py + 0.5 - cy) / z - fall;
      if (wx < cx0 || wx >= cx1 || wy < rowY || wy >= rowY + BH) continue;
      let q = brickStep(wx, wy, px, py, z, b.r, b.j, off);
      const g = clamp01(1 - Math.hypot(wx - X0, wy - Y0) / 170);
      const col = p.lt > 0 && p.lt * g * 0.75 > bayer(px, py) ? WARM[q] : BRICK[q];
      dst.px(px, py, col);
    }
  }
  // cracks spread out from the impact, each one a little after the one before (progress eased by cr)
  CRACKS.forEach((pts, i) => {
    const f = clamp01((p.cr - i * 0.1) / 0.6); if (f <= 0) return;
    const tot = f * (pts.length - 1), whole = Math.floor(tot);
    for (let s = 0; s < Math.min(whole, pts.length - 1); s++) seg(c, cx, cy, z, pts[s], pts[s + 1]);
    if (whole < pts.length - 1) { const u = tot - whole, a = pts[whole], b = pts[whole + 1]; seg(c, cx, cy, z, a, [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
  });
}
function seg(c, cx, cy, z, a, b) {
  const x0 = cx + a[0] * z, y0 = cy + a[1] * z, x1 = cx + b[0] * z, y1 = cy + b[1] * z;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let k = 0; k <= n; k++) {
    const x = R(x0 + ((x1 - x0) * k) / n), y = R(y0 + ((y1 - y0) * k) / n);
    if (x < R(cx + X0 * z) || x >= R(cx + X1 * z) || y < R(cy + Y0 * z) || y >= R(cy + Y1 * z)) continue;
    c.px(x, y, CRACK);
  }
}
