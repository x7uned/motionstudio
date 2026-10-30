// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-name/film/name-hud.mjs speech() (identical in mosquito-buzz): the
// film's speech bubble — dark card fill, lilac 2-px edge, dark 1-px outline, corner-cut rounded box, pointed tail,
// ivory MAIN text with a dark drop shadow. Changes:
//   - the tail is a triangle along any angle (base hidden under the body, tip `L` past the edge), so it can swing toward
//     the target continuously (the film's tail only went straight up/down from a horizontal edge);
//   - every size is base units × Z (any float), text through ping-text stextXY (nearest from a 1× bitmap), so pop, bounce
//     and size never step; the film's "text only when z > 0.9" switch is gone (text scales with the body);
//   - continuous looks: `loud` (yellow text through a Bayer gate, action strokes at the top corners), `think` (a cloud
//     body of scalloped bumps and a trail of three dots, crossfaded per pixel against the speech body and tail by
//     complementary Bayer gates), `quiet` (dashed edge, lilac text); no label → three bouncing dots, no text;
//   - 1 or 2 lines, chosen once per label (never per frame).
import { MAIN, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { C } from "./cute.mjs";
import { stextXY, textW, splitLines } from "./ping-text.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const TH = 9;   // ping-text bitmap height (MAIN 7 + 1-px margins)

/** layout in base units, decided once per label: { lines, ps, w0, h0 } */
export function bubbleLayout(label) {
  if (!label) return { lines: [], ps: 3, w0: 66, h0: 39 };
  const tries = [[3, 1, 156], [3, 2, 156], [2, 1, 200], [2, 2, 220]];
  for (const [ps, n, max] of tries) {
    const lines = splitLines(MAIN, label, n), tw = Math.max(...lines.map((s) => textW(MAIN, s, ps)));
    if (tw <= max || (ps === 2 && n === 2)) return { lines, ps, w0: tw + 24, h0: lines.length * TH * ps + 14 };
  }
}
function brush(g, x, y, r, col) { const s = Math.max(1, R(2 * r)); g.rect(Math.floor(x - s / 2 + 0.5), Math.floor(y - s / 2 + 0.5), s, s, col); }
function stroke(g, a, b, w, col) { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.5)); for (let k = 0; k <= n; k++) brush(g, a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, w / 2, col); }
/** a view that only writes where `keep(x, y)` */
const gated = (c, keep) => { const o = Object.create(c); o.px = (x, y, col) => { if (keep(Math.floor(x), Math.floor(y))) c.px(x, y, col); }; return o; };

/**
 * Draw the bubble centred at (cx, cy), base scale Z. ang = tail direction (radians, screen), L = tail length (base units).
 * o = { loud, think, quiet, flash, t } (0..1 each). Returns { box, tip }.
 */
export function drawBubble(c, lay, cx, cy, Z, ang, o = {}) {
  const loud = o.loud ?? 0, think = o.think ?? 0, quiet = o.quiet ?? 0, t = o.t ?? 0;
  const w = Math.max(12, R(lay.w0 * Z)), h = Math.max(8, R(lay.h0 * Z));
  const x = R(Math.max(6, Math.min(540 - 6 - w, cx - w / 2))), y = R(cy - h / 2), mx = x + w / 2, my = y + h / 2;
  const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
  // distance from the centre to the box edge along the tail direction (continuous as the angle passes a corner)
  const tB = Math.min(Math.abs(dx) > 1e-6 ? w / 2 / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? h / 2 / Math.abs(dy) : 1e9);
  const at = (d, side = 0) => [mx + dx * d + px * side, my + dy * d + py * side];
  const speechG = gated(c, (X, Y) => think <= bayer(X, Y)), cloudG = gated(c, (X, Y) => think > bayer(X, Y));
  const fill = C.CARD, edge = C.p7;
  // quiet: the edge breaks into dashes (every other 3-px run along the outline turns into fill)
  const dashed = (g) => { if (quiet <= 0) return g; const o2 = Object.create(g); o2.px = (X, Y, col) => g.px(X, Y, (((Math.floor(X) + Math.floor(Y)) >> 2) & 1) && quiet > bayer(Math.floor(X) + 1, Math.floor(Y) + 2) ? fill : col); return o2; };
  // ---- speech body + pointed tail (the film's layering: tail outline, tail edge, body, then the tail's fill over the edge)
  if (think < 1) {
    const g = speechG, B = tB - 8 * Z, half = 10.5 * Z, tip = tB + 21 * Z;
    const tri = (gr) => [at(B, half + gr), at(B, -half - gr), at(tip + gr * 1.3)];
    g.poly(tri(2), C.O); dashed(g).poly(tri(1), edge);
    g.rrect(x - 1, y - 1, w + 2, h + 2, C.O, 4); dashed(g).rrect(x, y, w, h, edge, 4); g.rrect(x + 2, y + 2, w - 4, h - 4, fill, 3);
    g.poly(tri(-1), fill);
  }
  // ---- thought cloud: scalloped bumps on an inner box (bump count fixed by the base size), a trail of three dots
  if (think > 0) {
    const g = cloudG, rb = Math.max(3, 9 * Z), ix = x + rb * 0.75, iy = y + rb * 0.75, iw = w - rb * 1.5, ih = h - rb * 1.5;
    const nx = Math.max(1, R((lay.w0 - 14) / 13)), ny = Math.max(1, R((lay.h0 - 14) / 13)), bumps = [];
    for (let i = 0; i <= nx; i++) { bumps.push([ix + (iw * i) / nx, iy]); bumps.push([ix + (iw * i) / nx, iy + ih]); }
    for (let j = 1; j < ny; j++) { bumps.push([ix, iy + (ih * j) / ny]); bumps.push([ix + iw, iy + (ih * j) / ny]); }
    const dots = [[tB + 10 * Z, 4.8 * Z], [tB + 19.5 * Z, 3.4 * Z], [tB + 27 * Z, 2.3 * Z]].map(([d, r]) => [...at(d), r]);
    for (const [bx, by] of bumps) g.disc(R(bx), R(by), R(rb + 1), C.O);
    for (const [bx, by, r] of dots) g.disc(R(bx), R(by), Math.max(1, R(r + 1)), C.O);
    const dg = dashed(g);
    for (const [bx, by] of bumps) dg.disc(R(bx), R(by), R(rb), edge);
    for (const [bx, by, r] of dots) dg.disc(R(bx), R(by), Math.max(1, R(r)), edge);
    for (const [bx, by] of bumps) g.disc(R(bx), R(by), Math.max(1, R(rb - 2)), fill);
    for (const [bx, by, r] of dots) if (r > 2.2) g.disc(R(bx), R(by), Math.max(0, R(r - 2)), fill);
    g.rect(R(ix), R(iy), R(iw) + 1, R(ih) + 1, fill);
  }
  // ---- shout: three action strokes out of each top corner, growing with `loud`
  if (loud > 0.01) {
    const g = fade(c, clamp01(loud * 1.6)), len = 11 * Z * loud;
    for (const sgn of [-1, 1]) for (const a of [-0.35, -0.85, -1.35]) {
      const ux = sgn * Math.cos(a), uy = Math.sin(a), ox = sgn < 0 ? x - 2 : x + w + 1, oy = y - 1, s0 = 5 * Z;
      const p0 = [ox + ux * s0, oy + uy * s0], p1 = [ox + ux * (s0 + len), oy + uy * (s0 + len)];
      stroke(g, p0, p1, Math.max(2, 3.4 * Z), C.O); stroke(g, p0, p1, Math.max(1, 1.6 * Z), C.Y);
    }
  }
  // ---- text (or typing dots): ivory → yellow when loud, → lilac when quiet, bright flash on `flash`
  const col = (X, Y) => (o.flash > bayer(X + 2, Y + 1) ? "#FFF6CE" : loud > bayer(X, Y) ? C.Y : quiet > bayer(X + 1, Y + 3) ? C.L : C.IV);
  if (lay.lines.length) {
    const ps = lay.ps * Z, lh = TH * ps, top = my - (lay.lines.length * TH * ps) / 2;
    lay.lines.forEach((s, i) => { const ly = top + i * lh; stextXY(c, MAIN, s, mx + Math.max(1, R(ps * 0.5)), ly + Math.max(1, R(ps * 0.5)), ps, ps, C.O, { align: 0.5 }); stextXY(c, MAIN, s, mx, ly, ps, ps, col, { align: 0.5 }); });
  } else {
    for (let i = 0; i < 3; i++) { const hop = Math.max(0, Math.sin(t * 6.2 - i * 0.9)) * 3 * Z, ddx = mx + (i - 1) * 13 * Z, ddy = my - hop, r = Math.max(1, R(3.2 * Z));
      c.disc(R(ddx) + 1, R(ddy) + 1, r, C.O); c.disc(R(ddx), R(ddy), r, col(R(ddx), R(ddy))); }
  }
  const tipD = tB + 21 * Z;
  return { box: { x0: x - 2, y0: y - 2, x1: x + w + 2, y1: y + h + 2 }, tip: at(tipD), centre: [mx, my] };
}
