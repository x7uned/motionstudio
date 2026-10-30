// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-boxes/film/props-ui.mjs#thermometer (+ its card, RED, WARM, COOL).
// Changes: drawn on a half-size grid (82 × 150 = the film's 164 × 300 halved) and blitted by lib/raster-buffer.mjs, so it
// fits a prop slot; the tick numbers and the texts (°C, CATS, 30-38°C, ROOM, 21°C) are removed (catalog text rule: only
// s.label and s.value); the comfort band and the room marker are dropped with them; the mercury level is a parameter
// (lev), its colour crossfades red → blue (cold) through a Bayer gate (no colour swap in one frame); the bulb glow (glow)
// is a dithered warm halo around the bulb. Ticks and tube as in the film.
import { bayer, toHex, mix } from "../../../../../renderer/pixel/raster.mjs";
import { C } from "./cute.mjs";

export const W = 82, H = 150, TX = 21, TW = 8, YTOP = 17, YBOT = 122, BY = 132, BR = 7, BX = TX + TW / 2;
const RED = ["#5A0E1E", "#A01E34", "#E0344A", "#F2484E", "#FF7A7A", "#FFB4B4"];
const BLUE = ["#14306A", "#23509A", "#3A78C8", "#5A9CE6", "#8CC8F4", "#CDEBFF"];
const WARM = "#F59A3A", WARM2 = "#B8601E", GLASS = "#B8AEDA", DARK = "#1A1430";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const yAt = (T) => YBOT - (T / 40) * (YBOT - YTOP);
export const levelY = (lev) => YBOT - clamp01(lev) * (YBOT - YTOP);

// a disc whose colour crossfades from a (k = 0) to b (k = 1) through the Bayer gate
function discMix(g, cx, cy, r, a, b, k) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y > r * r + r * 0.8) continue;
    g.px(cx + x, cy + y, k > bayer(cx + x, cy + y) ? b : a);
  }
}

// o = { lev 0..1 mercury level, glow 0..1 bulb halo, cold 0..1 mercury turns blue }
export function thermoBuf(g, o) {
  // card (film `card`, on the grid): gradient body, lilac outline, inner rim
  for (let j = 0; j < H; j++) {
    const ins = j === 0 || j === H - 1 ? 2 : j === 1 || j === H - 2 ? 1 : 0, row = toHex(mix(C.CARD, "#1D1430", j / H));
    for (let i = ins; i < W - ins; i++) {
      const e = Math.min(i, W - 1 - i, j, H - 1 - j);
      const corner = (i <= 2 || i >= W - 3) && (j <= 2 || j >= H - 3);
      g.px(i, j, e === 0 ? C.p7 : e === 1 || (corner && e === 2 && (i === 2 || i === W - 3) && (j === 2 || j === H - 3)) ? C.p5 : row);
    }
  }
  // scale ticks every 5 (major every 10), no numbers
  for (let T = 0; T <= 40; T += 5) {
    const yy = Math.round(yAt(T)), major = T % 10 === 0;
    g.rect(TX - (major ? 5 : 3), yy, major ? 4 : 2, 1, major ? C.IV : C.L);
  }
  // bulb glow: warm dithered halo just outside the bulb (drawn before the tube so the tube covers it)
  if (o.glow > 0) for (let y = BY - BR - 9; y <= BY + BR + 9; y++) for (let x = BX - BR - 9; x <= BX + BR + 9; x++) {
    const d = Math.hypot(x - BX, y - BY) - BR;
    if (d < 1 || d > 9) continue;
    const a = o.glow * (1 - (d - 1) / 8) * 0.8;
    if (a > bayer(x, y)) g.px(x, y, d < 4 ? WARM : WARM2);
  }
  // glass tube and bulb
  g.rrect(TX - 1, YTOP - 4, TW + 2, BY - YTOP + 4, C.O, 1);
  g.rrect(TX, YTOP - 3, TW, BY - YTOP + 2, GLASS, 1);
  g.rect(TX + 2, YTOP - 1, TW - 4, BY - YTOP - 2, DARK);
  g.disc(BX, BY, BR + 1, C.O); g.disc(BX, BY, BR, GLASS); g.disc(BX, BY, BR - 2, DARK);
  // mercury column (partial top row dithered), crossfading red → blue
  const my = levelY(o.lev), mx0 = TX + 2, mx1 = TX + TW - 2, top = Math.floor(my);
  // the blue colour rises from the bulb as a wipe (a row moves per frame, its edge dithered over two rows), so cold
  // changes never flip a whole Bayer level at once
  const wipe = BY - o.cold * (BY - my);
  const blueAt = (yy, xx) => clamp01(0.5 + (wipe - yy) / 2) > bayer(xx, yy);
  for (let yy = top; yy <= BY; yy++) for (let xx = mx0; xx < mx1; xx++) {
    if (yy === top && my - yy > bayer(xx, yy)) continue;
    const u = (xx - mx0) / (mx1 - mx0), ramp = blueAt(yy, xx) ? BLUE : RED;
    g.px(xx, yy, u < 0.25 ? ramp[4] : u > 0.75 ? ramp[1] : ramp[3]);
  }
  // bulb mercury and a small glint, both crossfading with the mercury colour
  discMix(g, BX, BY, BR - 4, RED[3], BLUE[3], o.cold);
  discMix(g, BX - 2, BY - 2, 1, RED[5], BLUE[5], o.cold);
  // the film's thin highlight along the mercury column
  for (let yy = YTOP - 1; yy < BY - 6; yy++) if ((yy & 3) !== 0) g.px(TX + 3, yy, yy < my ? "#4A4070" : (blueAt(yy, TX + 3) ? BLUE[5] : RED[5]));
  return { my };
}
