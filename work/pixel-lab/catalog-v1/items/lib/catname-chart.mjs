// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-name/film/name-hud.mjs chart() (the «Your cat knows its name» response
// chart: cute-kit panel, lilac bars with a dark outline, a light top row and a shaded right edge, one yellow highlighted
// bar, a baseline). Changes: drawn into an offscreen card (mask) so the HUD item can composite it at its size; no per-bar
// labels (the catalog has no free text) — the title is the plan's label and the only number is the plan's value, printed
// above the highlighted bar's column; per-bar heights come in as continuous values (`hs`) and the highlight colour crossfades by a
// Bayer gate (`hi`), the flash by a second gate (`flash`), so no bar changes colour in one frame.
import { Canvas, MAIN, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { C } from "./cute.mjs";
/** cute.mjs panel() with its background quantised: the film blended CARD → #1D1430 row by row (a unique colour per row);
 *  here the two colours are ordered-dithered, so moving bars uncover colours that already exist around them. */
function panel(c, x, y, w, h, a = 1, edge = C.p7) { c.rrect(x, y, w, h, edge, 2); c.rrect(x + 1, y + 1, w - 2, h - 2, C.p5, 2); for (let j = y + 2; j < y + h - 2; j++) for (let i = x + 2; i < x + w - 2; i++) c.px(i, j, (j - y) / h > bayer(i, j) ? "#1D1430" : C.CARD); }

const R = Math.round;
export const CW = 216, CH = 156, BASE = 136, PLOT_H = 84, BW = 30, GAP = 9, X0 = 15;
/** Paint the chart card. o = { hs: [0..1 per bar], hiI, hi 0..1, flash 0..1, title, valueText } → { card, mask } */
export function chartCard(o) {
  const card = new Canvas(CW, CH, "#000000"), m = new Uint8Array(CW * CH), tw = (s, sc) => card.measure(MAIN, s, { scale: sc });
  const g = Object.create(card); g.px = (x, y, col) => { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= CW || y >= CH) return; card.px(x, y, col); m[y * CW + x] = 1; };
  panel(g, 0, 0, CW, CH, 1, C.p7);
  if (o.title) { let sc = 2; while (sc > 1 && tw(o.title, sc) > CW - 20) sc--; g.text(MAIN, o.title, R((CW - tw(o.title, sc)) / 2), sc === 2 ? 10 : 13, C.L, { scale: sc }); }
  g.rect(X0 - 4, BASE + 1, CW - 2 * X0 + 8, 2, C.p5);
  const bars = [];
  o.hs.forEach((hk, i) => {
    const bx = X0 + i * (BW + GAP), bh = R(hk * PLOT_H), isHi = i === o.hiI;
    bars.push({ x: bx + BW / 2, top: BASE - bh });
    if (bh <= 0) return;
    const colAt = (x, y) => { if (!isHi || o.hi <= bayer(x, y)) return C.p7; return o.flash > bayer(x + 2, y + 1) ? "#FFF6CE" : C.Y; };
    const lit = (x, y) => mix(colAt(x, y), "#FFFFFF", 0.45), shade = (x, y) => mix(colAt(x, y), C.O, 0.3);
    for (let y = BASE - bh - 1; y < BASE + 1; y++) for (let x = bx - 1; x < bx + BW + 1; x++) {
      const out = x === bx - 1 || x === bx + BW || y === BASE - bh - 1;
      g.px(x, y, out ? C.O : y < BASE - bh + Math.min(bh, 2) ? lit(x, y) : x >= bx + BW - 2 && y >= BASE - bh + 2 ? shade(x, y) : colAt(x, y));
    }
  });
  // the value above the highlighted bar, dissolving in with the highlight
  if (o.valueText && o.hi > 0 && o.hiI != null) {
    // catalog-v1: a fixed place under the title, above the highlighted bar's column (the tallest bar tops out below it),
    // so the number never moves while it dissolves in
    const b = bars[o.hiI], sc = 2, w = tw(o.valueText, sc), x = R(Math.max(6, Math.min(CW - 6 - w, b.x - w / 2))), y = 33;
    const gv = Object.create(g); gv.px = (X, Y, col) => { if (o.hi > bayer(Math.floor(X), Math.floor(Y))) g.px(X, Y, col); };
    gv.text(MAIN, o.valueText, x + 1, y + 1, C.O, { scale: sc }); gv.text(MAIN, o.valueText, x, y, C.Y, { scale: sc });
  }
  return { card, mask: m };
}
/** Composite the card centred at (cx, cy) at scale s (nearest), through canvas c (a dissolve view in the engine). */
export function blitCard(c, { card, mask }, cx, cy, s) {
  const x0 = Math.floor(cx - (CW / 2) * s), x1 = Math.ceil(cx + (CW / 2) * s), y0 = Math.floor(cy - (CH / 2) * s), y1 = Math.ceil(cy + (CH / 2) * s);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const u = Math.floor((x + 0.5 - cx) / s + CW / 2), v = Math.floor((y + 0.5 - cy) / s + CH / 2);
    if (u < 0 || v < 0 || u >= CW || v >= CH || !mask[v * CW + u]) continue; c.px(x, y, card.get(u, v)); }
  return { x0, y0, x1, y1 };
}
