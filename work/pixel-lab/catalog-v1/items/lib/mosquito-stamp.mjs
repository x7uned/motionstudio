// catalog-v1 copy (2026-10-26) of two film pieces, joined into one verdict stamp:
//   - work/pixel-lab/mosquito-buzz/film/name-hud.mjs mark() (= cat-name): the ✓ / ✗ drawn stroke by stroke with a dark
//     outline stroke under a coloured one (red #FF4D5E / green C.GR);
//   - work/pixel-lab/ping/film/hud.mjs stamp(): the stamp plate — dark 2-px outline, a thick coloured border of one pixel
//     size `s`, dark inside, the word in the border colour, landing from a larger scale.
// Changes: the word is the plan's label (never a fixed "MYTH"); a ✓ / ✗ column left of it (or the mark alone when there
// is no label); every size is base units × scale (floats; text via ping-text stextXY) with separate x / y squash; the
// ink colour is a per-pixel function: neutral lilac before the stamp lands, then red / green flooding out from the centre
// through a Bayer gate, red ↔ green crossfading by share; fixed wear holes in the ink (rubber-stamp look, in plate
// coordinates so they move with it); a dithered drop shadow while lifted; dust puffs dissolving out at the sides.
import { MAIN, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { C } from "./cute.mjs";
import { stextXY, textW, splitLines } from "./ping-text.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
export const RED = "#FF4D5E", GREEN = C.GR, NEUTRAL = C.L, FILL = C.CARD;
const TH = 9;
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** plate layout in base units (decided once per label): { lines, ps, w0, h0, col0 (text column left), tw } */
export function stampLayout(label) {
  if (!label) return { lines: [], ps: 4, w0: 54, h0: 54, tw: 0 };
  const tries = [[4, 1, 200], [3, 1, 230], [3, 2, 230], [2, 1, 230], [2, 2, 1e9]];
  for (const [ps, n, max] of tries) {
    const lines = splitLines(MAIN, label, n), tw = Math.max(...lines.map((s) => textW(MAIN, s, ps)));
    const w0 = 3 * ps + 8 * ps + 1.5 * ps + tw + 3 * ps, h0 = lines.length * TH * ps - (lines.length - 1) * ps + 4 * ps;
    if (w0 <= max) return { lines, ps, w0, h0, tw };
  }
}
function brush(g, x, y, r, col) { const s = Math.max(1, R(2 * r)); g.rect(Math.floor(x - s / 2 + 0.5), Math.floor(y - s / 2 + 0.5), s, s, col); }
function stroke(g, pts, w, col) { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.5)); for (let k = 0; k <= n; k++) brush(g, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, w / 2, col); } }
/** the film's ✓ / ✗ (stroke by stroke, k 0 → 1), centred at (x, y), size s px, separate x / y scale for squash */
export function mark(c, x, y, ok, k, s, sx = 1, sy = 1) {
  if (k <= 0) return;
  const P = (u, v) => [x + u * s * sx, y + v * s * sy];
  const segs = ok ? [[P(-0.45, 0), P(-0.12, 0.35)], [P(-0.12, 0.35), P(0.5, -0.4)]] : [[P(-0.4, -0.4), P(0.4, 0.4)], [P(0.4, -0.4), P(-0.4, 0.4)]];
  const parts = segs.map(([p, q], i) => { const kk = clamp01(k * 2 - i); return kk > 0 ? [p, [p[0] + (q[0] - p[0]) * kk, p[1] + (q[1] - p[1]) * kk]] : null; }).filter(Boolean);
  for (const p of parts) stroke(c, p, Math.max(3, s * 0.5), C.O); for (const p of parts) stroke(c, p, Math.max(2, s * 0.29), ok ? GREEN : RED);
}
/** dust puffs out of both sides of a plate (u 0 → 1: burst, drift, dissolve), amp = strength. Each side is a cluster of
 *  overlapping puffs sharing one outline (all outlines, then all bodies, then highlights), a little different per side. */
export function dust(c, mx, my, pw, ph, Z, u, amp = 1) {
  if (u <= 0 || u >= 1 || amp <= 0) return;
  // solid puffs: they burst out (growing), drift, then shrink away; the dither is only a short fade at both ends
  const k = clamp01(u / 0.3), rin = k * k * (3 - 2 * k), a = Math.min(clamp01(u / 0.12), clamp01((1 - u) / 0.15)), g = fade(c, a), eo = 1 - Math.pow(1 - u, 3), P = [];
  // [outward, down, start height (−0.5 top … 0.5 bottom edge), base radius, growth]
  const puffs = [[1, -0.1, 0.4, 6.5, 5.5], [0.7, 0.4, 0.5, 7.5, 6], [1, -0.6, 0.1, 4.8, 4], [0.25, 0.9, 0.5, 5.5, 4.5], [0.6, -0.9, -0.4, 3.6, 3]];
  for (const sgn of [-1, 1]) puffs.forEach(([ux, uy, oy, r0, gr], j) => {
    const jit = sgn < 0 ? 1 + 0.12 * ((j % 2) * 2 - 1) : 1, ox = mx + sgn * (pw / 2 - (j === 3 ? pw * 0.18 : 2)), oyy = my + oy * ph;
    const d = (1 + 15 * eo * jit) * Z * amp, r = (r0 * (0.35 + 0.65 * rin) + gr * u) * Math.pow(1 - u, 0.7) * jit * Z * (0.55 + 0.45 * amp);
    if (r >= 0.6) P.push([ox + sgn * ux * d, oyy + uy * d * 0.7 - 4 * Z * u, Math.max(1, R(r))]);
  });
  for (const [x, y, r] of P) g.disc(R(x), R(y), r + 1, C.p5);
  for (const [x, y, r] of P) g.disc(R(x), R(y), r, NEUTRAL);
  for (const [x, y, r] of P) if (r >= 3) g.disc(R(x - r * 0.3), R(y - r * 0.35), Math.max(1, R(r * 0.45)), C.IV);
}
/**
 * The stamp plate centred at (cx, cy). S = lift scale (1 = on the surface), sx / sy = squash, lift = 0..1 (shadow),
 * land = ink flood 0..1, inked = 0..1, share = green share 0..1, xK / cK = ✗ / ✓ stroke progress.
 */
export function drawStamp(c, lay, cx, cy, Z, o) {
  const S = Z * o.S, kx = S * o.sx, ky = S * o.sy, pw = Math.max(6, R(lay.w0 * kx)), ph = Math.max(6, R(lay.h0 * ky));
  const x0 = R(cx - pw / 2), y0 = R(cy - ph / 2), mx = x0 + pw / 2, my = y0 + ph / 2, th = Math.max(1, R(lay.ps * Math.min(kx, ky)));
  // shadow on the surface while lifted (rest size, offset down-right away from the upper-left light)
  if (o.lift > 0.002) {
    const sw = R(lay.w0 * Z), sh = R(lay.h0 * Z), g = fade(c, 0.55 * clamp01(o.lift * 2.5)), ox = R(7 * Z * o.lift), oy = R(11 * Z * o.lift);
    g.rect(R(cx - sw / 2) + ox - 2, R(cy - sh / 2) + oy - 2, sw + 4, sh + 4, C.O);
  }
  const ink = (X, Y) => {
    const rn = Math.hypot((X - mx) / (pw / 2), (Y - my) / (ph / 2)) / 1.42, f = clamp01((o.land * 1.4 - rn) / 0.4);
    if (!(f * o.inked > bayer(X, Y))) return NEUTRAL;
    if (hash(Math.floor((X - x0) / kx), Math.floor((Y - y0) / ky)) < 0.07) return FILL;    // rubber-stamp wear
    return clamp01((o.share * 1.4 - rn) / 0.4) > bayer(X + 2, Y + 1) ? GREEN : RED;   // re-inking floods out from the centre too
  };
  c.rect(x0 - 2, y0 - 2, pw + 4, ph + 4, C.O);
  for (let y = y0; y < y0 + ph; y++) for (let x = x0; x < x0 + pw; x++) if (x < x0 + th || x >= x0 + pw - th || y < y0 + th || y >= y0 + ph - th) c.px(x, y, ink(x, y));
  c.rect(x0 + th, y0 + th, pw - 2 * th, ph - 2 * th, FILL);
  // the seal ring around the mark slot (blank lilac while lifted, then inked), the mark inside it
  const mxc = lay.lines.length ? x0 + (3 + 4) * lay.ps * kx : mx, rr = (lay.lines.length ? 3.75 : 4.6) * lay.ps * S, rt = Math.max(1.5, 0.6 * lay.ps * S);
  for (let y = Math.floor(my - rr * o.sy) - 1; y <= Math.ceil(my + rr * o.sy) + 1; y++) for (let x = Math.floor(mxc - rr * o.sx) - 1; x <= Math.ceil(mxc + rr * o.sx) + 1; x++) {
    const d = Math.hypot((x + 0.5 - mxc) / o.sx, (y + 0.5 - my) / o.sy); if (d <= rr && d > rr - rt) c.px(x, y, ink(x, y)); }
  const ms = (lay.lines.length ? 4.1 : 5.1) * lay.ps * S;   // the mark (and its dark outline stroke) stays inside the ring
  mark(c, mxc, my, false, o.xK, ms, o.sx, o.sy); mark(c, mxc, my, true, o.cK, ms, o.sx, o.sy);
  if (lay.lines.length) {
    const psx = lay.ps * kx, psy = lay.ps * ky, colX = x0 + (12.5 * lay.ps + lay.tw / 2) * kx, bh = (lay.lines.length * TH * lay.ps - (lay.lines.length - 1) * lay.ps) * ky;
    lay.lines.forEach((s, i) => stextXY(c, MAIN, s, colX, my - bh / 2 + i * (TH - 1) * psy, psx, psy, ink, { align: 0.5 }));
  }
  return { box: { x0: x0 - 2, y0: y0 - 2, x1: x0 + pw + 2, y1: y0 + ph + 2 }, centre: [mx, my], pw, ph };
}
