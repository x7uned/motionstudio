// catalog-v1 (2026-10-26), new helpers shared by the effect items scent-trail and air-flow (not a film copy).
// A flow frame (along / across an aim angle), a variable-alpha ribbon stroke (dark outline, fill, light core toward the
// upper left) and a small round «bit» that dissolves through a dither pattern fixed to the bit itself, so a moving
// particle fades in and out pixel by pixel instead of twinkling against the screen Bayer grid. Pure functions.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

export const R = Math.round, TAU = Math.PI * 2;
export const clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k, frac = (v) => v - Math.floor(v);
export const sm = (x, a = 0, b = 1) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;   // shortest way round

/** frame at (cx, cy) along angle ang: P(a, b) = point a px along the aim and b px across it (b > 0 = left of travel on screen when ang = −π/2 … i.e. +normal) */
export function flowFrame(cx, cy, ang) {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  return { ux, uy, nx, ny, P: (a, b) => [cx + ux * a + nx * b, cy + uy * a + ny * b] };
}

/** round brush of radius r (screen px) through an alpha gate a (screen Bayer), with an optional threshold offset */
function dab(c, x, y, r, col, a) {
  if (a <= 0.004 || r < 0.35) return;
  const r2 = r * r, X0 = Math.floor(x - r), X1 = Math.ceil(x + r), Y0 = Math.floor(y - r), Y1 = Math.ceil(y + r);
  for (let Y = Y0; Y <= Y1; Y++) { const dy = Y + 0.5 - y; for (let X = X0; X <= X1; X++) { const dx = X + 0.5 - x; if (dx * dx + dy * dy <= r2 && a > bayer(X, Y)) c.px(X, Y, col); } }
}

/**
 * Ribbon along pts = [[x, y, a, r]] (samples about 1 px apart; a = alpha 0..1, r = fill radius). Passes: dark outline
 * (r + 1, alpha × o.outA), fill, light core (r − 1.1, shifted half a pixel to the upper left). cols = { out, fill, lite }.
 */
export function ribbon(c, pts, cols, o = {}) {
  const outA = o.outA ?? 0.85;
  for (const [x, y, a, r] of pts) dab(c, x, y, r + 1, cols.out, a * outA);
  for (const [x, y, a, r] of pts) dab(c, x, y, r, cols.fill, a);
  if (cols.lite) for (const [x, y, a, r] of pts) dab(c, x - 0.5, y - 0.5, r - 1.1, cols.lite, a);
}

/**
 * Round bit centred at (x, y) with radius r: rim = whole disc, fill = disc 0.75 r shifted to the upper left, light =
 * 0.3 r further up-left (at r 1.5 this is the films' 3×3 rim + 2×2 fill + 1 highlight). cols = [rim, fill, light|null].
 * Alpha a dissolves it through a Bayer pattern anchored to the bit (seed picks the anchor phase).
 */
export function bitL(c, x, y, r, cols, a, seed = 0, fillK = 0.75, shift = 0.33) {
  if (a <= 0.004 || r < 0.4) return;
  const ox = R(x), oy = R(y), sx = seed & 3, sy = (seed >> 2) & 3, n = Math.ceil(r) + 1;
  const fx = x - shift * r, fy = y - shift * r, fr2 = (fillK * r) ** 2, lx = x - 0.5 * r, ly = y - 0.5 * r, lr2 = Math.max(0.2, (0.3 * r) ** 2), r2 = r * r;
  for (let Y = oy - n; Y <= oy + n; Y++) for (let X = ox - n; X <= ox + n; X++) {
    const px = X + 0.5, py = Y + 0.5, d2 = (px - x) ** 2 + (py - y) ** 2; if (d2 > r2) continue;
    if (!(a > bayer(X - ox + sx, Y - oy + sy))) continue;
    const col = cols[2] && (px - lx) ** 2 + (py - ly) ** 2 <= lr2 ? cols[2] : (px - fx) ** 2 + (py - fy) ** 2 <= fr2 ? cols[1] : cols[0];
    c.px(X, Y, col);
  }
}
