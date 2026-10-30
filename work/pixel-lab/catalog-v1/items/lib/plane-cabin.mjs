// catalog-v1 copy (2026-10-26) of work/pixel-lab/plane/film/plane.mjs#drawCabin, drawSeatRow, drawPassenger (palette, row layout and
// figures as in the film). Changes: re-laid out for the 9:16 stage (the cut-away hull, cockpit, hero seat, picocell, cargo hold and
// the hard edge bands are gone; the cabin wall/bins/ceiling are extended to fill every edge, a carpet aisle runs to the bottom),
// the film's per-second star flicker became a smooth twinkle, seats may be empty (about half), no hero figure.
import { mix, fade, hex } from "../../../../../renderer/pixel/raster.mjs";
import { band } from "../../engine/layout.mjs";

const GLOWC = hex("#47356C"), R = Math.round, CARPET_HEX = ["#2A1F40", "#241A38", "#1E1630", "#18112A", "#140F22"].map(hex);
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const ROW0 = -128, PITCH = 17, rowX = (r) => ROW0 + r * PITCH;
export const FIRST = 2, LAST = 23;           // rows drawn: film x −94 … 263 → stage x −300 … 840 at scale 3.2
export const S = 3.2, FLOOR_Y = 570;         // stage px per film unit; stage y of the cabin floor line

/** film-coordinate view over a layer transform Vl = layer(cam, p): u → screen x, v → screen y (film floor v = 0 sits at FLOOR_Y). */
export function filmView(Vl) { return { z: Vl.z * S, X: (u) => Vl.X(u * S), Y: (v) => Vl.Y(FLOOR_Y + v * S) }; }
const rectOf = (c, V) => (u0, v0, u1, v1, col) => { let x0 = R(V.X(u0)), y0 = R(V.Y(v0)), x1 = Math.max(R(V.X(u1)), x0 + 1), y1 = Math.max(R(V.Y(v1)), y0 + 1); x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(c.w, x1); y1 = Math.min(c.h, y1); if (x1 > x0 && y1 > y0) c.rect(x0, y0, x1 - x0, y1 - y0, col); };

/** far wall layer: ceiling, bins, windows with the night outside. V = filmView(layer(cam, 0.9)). */
export function drawWall(c, V, t) {
  const rect = rectOf(c, V), s = V.z, U0 = -90, U1 = 270, TOPV = -330;
  rect(U0, TOPV, U1, 130, "#231C3E");
  // ceiling ribs + mood light along the bin line
  rect(U0, TOPV, U1, -112, "#2A2248");
  for (let u = U0; u < U1; u += 22) { rect(u, TOPV, u + 1, -112, "#1E1834"); rect(u + 1, TOPV, u + 1.8, -112, "#3A3060"); }
  // bins
  rect(U0, -112, U1, -44, "#2E2546");
  for (let u = U0 + 8; u < U1; u += 22) { rect(u, -110, u + 1, -45, "#1E1834"); rect(u + 9, -52, u + 14, -50.5, "#4E4870"); }
  rect(U0, -112, U1, -110.5, "#4E4870"); rect(U0, -45, U1, -44, "#4E4870");
  rect(U0, -110.5, U1, -109.5, "#6E4FB0");
  { const y0 = R(V.Y(-109.5)), y1 = R(V.Y(-109.5 + 9)), xa = Math.max(0, R(V.X(U0))), xb = Math.min(c.w, R(V.X(U1)));
    for (let y = Math.max(0, y0); y < Math.min(c.h, y1); y++) { const f = 1 - (y - y0) / (y1 - y0); for (let x = xa; x < xb; x++) { if (f * 0.5 > ((x * 7 + y * 13) % 16) / 16) c.px(x, y, GLOWC); } } }
  // windows
  for (let r = FIRST - 1; r <= LAST + 1; r++) {
    const wx = rowX(r) + 4;
    rect(wx - 1, -41, wx + 8, -27, "#3A3060"); rect(wx, -40, wx + 7, -28, "#0E0C26");
    for (let k = 0; k < 3; k++) {
      const sx = wx + 1 + rnd(r * 11 + k) * 5, sy = -39 + rnd(r * 17 + k * 5) * 9, tw = 0.5 + 0.5 * Math.sin(t * (0.7 + 0.4 * rnd(r + k)) + rnd(r * 3 + k) * 6.28);
      c.rect(R(V.X(sx)), R(V.Y(sy)), Math.max(1, R(0.5 * s)), Math.max(1, R(0.5 * s)), mix("#1C1A44", "#B08AE8", 0.25 + 0.75 * tw));
    }
    rect(wx, -40, wx + 7, -39, "#2A2350");
  }
  for (let r = FIRST; r <= LAST; r++) if (rnd(r * 13) < 0.3) rect(rowX(r) + 6, -43, rowX(r) + 8, -42, "#FFE9A8");
}

/** floor + seats layer. V = filmView(layer(cam, 1)). */
export function drawSeats(c, V, t) {
  const rect = rectOf(c, V), U0 = -90, U1 = 270;
  rect(U0, 0, U1, 3, "#2A1F40"); for (let u = -128 + 6; u < U1; u += 12) rect(u, 0.6, u + 1.5, 1.4, "#E03056");
  // carpet running toward the viewer, flat bands with narrow dithered seams
  const CARPET = CARPET_HEX, y0 = Math.max(0, R(V.Y(3))), xa = Math.max(0, R(V.X(U0))), xb = Math.min(c.w, R(V.X(U1)));
  for (let y = y0; y < c.h; y++) {   // same tones as band(); rows outside the narrow dithered seams are one rect
    const sv = Math.min(1, (y - y0) / Math.max(1, c.h - y0)) * (CARPET.length - 1), i = Math.min(CARPET.length - 2, Math.floor(sv)), f = sv - i, lo = 0.33;
    if (f <= lo) c.rect(xa, y, xb - xa, 1, CARPET[i]); else if (f >= 1 - lo) c.rect(xa, y, xb - xa, 1, CARPET[i + 1]);
    else for (let x = xa; x < xb; x++) c.px(x, y, band(CARPET, (y - y0) / Math.max(1, c.h - y0), x, y));
  }
  { const dv = 14; for (let u = U0 + 4; u < U1; u += 10) { const x = R(V.X(u)), a = R(V.Y(5)), b = R(V.Y(5 + dv)); if (a < c.h) c.rect(x, a, Math.max(1, R(V.z * 0.15)), Math.max(0, Math.min(b, c.h) - a), "#2E2446"); } }
  rect(U0, 3, U1, 3.6, "#3A3456");
  for (let r = FIRST; r <= LAST; r++) { const x = rowX(r); if (V.X(x + 20) < -10 || V.X(x - 10) > c.w + 10) continue; seatRow(c, V, t, r, rect); }
}

function seatRow(c, V, t, r, rect) {
  const x = rowX(r), P = (u) => [V.X(u[0]), V.Y(u[1])];
  const seat = "#3B2C5C", seatL = "#523D82", head = "#6E4FB0";
  c.poly([[x - 1, -12], [x + 2.5, -12], [x - 1.5, -37], [x - 5, -37]].map(P).map(([a, b]) => [R(a), R(b)]), seat);
  c.poly([[x - 6, -42], [x - 1, -42], [x - 1.2, -36], [x - 5.5, -36]].map(P).map(([a, b]) => [R(a), R(b)]), head);
  rect(x - 1, -13, x + 11, -9, seatL); rect(x - 1, -13, x + 11, -12.3, "#6E4FB0"); rect(x + 1, -9, x + 2, 0, "#2A1F40"); rect(x + 8, -9, x + 9, 0, "#2A1F40");
  if (rnd(r * 17 + 3) > 0.45) passenger(c, V, t, x, r);
  rect(x + 1, -18, x + 10, -16.5, "#2A1F40");
}

function passenger(c, V, t, x, r) {
  const s = V.z, P = (u) => [V.X(u[0]), V.Y(u[1])], poly = (pts, col) => c.poly(pts.map(P).map(([a, b]) => [R(a), R(b)]), col);
  const shirts = [["#2C4670", "#3E5A8A"], ["#5E2A3A", "#7A3A4E"], ["#2E4A3A", "#3E6A50"], ["#4A3A6A", "#5E4A86"], ["#6A5A3A", "#8A7650"], ["#3A3A4A", "#4E4E62"]], sh = shirts[R(rnd(r * 5) * 5)];
  const skins = ["#CF8A6A", "#A86A4A", "#E6AD8A", "#7A4A30", "#F3CBAA"], sk = skins[R(rnd(r * 7) * 4)], hair = ["#1A120C", "#3E2818", "#806040", "#C8A060", "#2A2A30", "#9A9AA8"][R(rnd(r * 9) * 5)];
  const sleep = rnd(r * 23) < 0.35;
  poly([[x + 3, -12], [x + 14, -13.5], [x + 14.5, -9.5], [x + 3, -9]], "#22204A");
  poly([[x + 12.5, -11], [x + 15, -11], [x + 15, -1], [x + 12.5, -1]], "#22204A"); { const a = P([x + 12, -1.6]), b = P([x + 17, 0]); c.rect(R(a[0]), R(a[1]), Math.max(1, R(b[0] - a[0])), Math.max(1, R(b[1] - a[1])), "#120A06"); }
  poly([[x - 3.5, -12], [x + 4, -12], [x + 3.5, -30], [x - 2.5, -31]], sh[0]); poly([[x + 1, -12], [x + 4, -12], [x + 3.5, -29], [x + 1.5, -30]], sh[1]);
  const hx = x + 0.8 + (sleep ? 1.2 : 0), hy = -35.5 + (sleep ? 0.8 : 0), hr = 4 + 0.8 * rnd(r * 31 + 5), ha = 1 + 0.12 * rnd(r * 41 + 2);
  const [cx, cy] = P([hx, hy]); c.disc(R(cx), R(cy), Math.max(1, R(hr * s)), sk); c.rect(R(cx + hr * s * 0.85), R(cy - 0.2 * s), Math.max(1, R(1.2 * s)), Math.max(1, R(1.4 * s)), sk);
  const [hx2, hy2] = P([hx - 1, hy - 1.8]); c.ellipse(R(hx2), R(hy2), Math.max(1, R(4.3 * ha * s)), Math.max(1, R(3 * ha * s)), hair);
  { const [ex, ey] = P([hx + 2.6, hy - 0.4]); c.rect(R(ex), R(ey), Math.max(1, R(0.8 * s)), Math.max(1, R((sleep ? 0.3 : 0.9) * s)), "#1A0E10"); }
  const hand = sleep ? [x + 9, -14] : [x + 10.5, -22];
  poly([[x - 0.5, -28], [x + 2.5, -28.5], [hand[0] + 1, hand[1] + 1], [hand[0] - 1, hand[1] + 2]], sh[1]);
  const [hx3, hy3] = P(hand); c.disc(R(hx3), R(hy3), Math.max(1, R(1.3 * s)), sk);
  if (!sleep) { const ph = P([hand[0] + 0.5, hand[1] - 4]), k = 0.8 + 0.2 * Math.sin(t * 1.3 + r); c.rect(R(ph[0]), R(ph[1]), Math.max(1, R(1.6 * s)), Math.max(2, R(3.6 * s)), "#5470B8"); fade(c, 0.35 * k).rect(R(ph[0]), R(ph[1]), Math.max(1, R(1.6 * s)), Math.max(2, R(3.6 * s)), "#A9C4FF"); }
}
