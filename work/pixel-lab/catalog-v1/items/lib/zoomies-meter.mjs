// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-zoomies/film/hud.mjs energyBar + levelColor (the same code is in
// mosquito-buzz/film/hud.mjs). Changes: painted into an offscreen card (mask) so the HUD item composites it at its size
// (z), like lib/catname-chart.mjs; the overfull glow halo is a separate screen-space pass (it mixes with the picture
// under it); the film's fixed "ENERGY" label and blinking "MAX" word are gone (the catalog has no free text): the label
// is the plan's label, and the only number is the plan's value (+ unit), right-aligned above the bar end; the overfull
// look (glow, shimmer, bright frame) is driven by a continuous `ov` instead of level > 1; the red low-level frame pulse
// takes a `warn` strength as well (max of the film's automatic low-level pulse and warn); `bw` sets the bar width.
import { Canvas, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { C } from "./cute.mjs";
import { otext, tw } from "./zoomies-hud.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), frac = (v) => v - Math.floor(v);
const WHITE = "#FFFFFF", RED = "#FF4D5E";
const LEVEL_KEYS = [[0, "#E03056"], [0.22, "#F2484E"], [0.38, "#F59A3A"], [0.52, "#F4CA50"], [0.72, "#65DA41"], [1, "#7AEA52"]];
export function levelColor(level) {
  const v = clamp01(level); let i = 0; while (i < LEVEL_KEYS.length - 2 && v > LEVEL_KEYS[i + 1][0]) i++;
  const [a, ca] = LEVEL_KEYS[i], [b, cb] = LEVEL_KEYS[i + 1]; return mix(ca, cb, clamp01((v - a) / (b - a)));
}
export const BH = 26;
/** Card layout for a label / value pair (constant per prop): { CW, CH, bx, by, bw, lx, vx }. */
export function meterLayout(m, label, valueText, bw = 176) {
  const lw = label ? tw(m, label, 2) : 0, vw = valueText ? tw(m, valueText, 2) : 0, body = bw + 6;
  const row = label || valueText ? 20 : 0;
  let CW = Math.max(body + 6, lw + 6), lx, vx;
  if (label && valueText && lw + 12 + vw > body) CW = Math.max(CW, lw + 12 + vw + 6);
  const bx = R((CW - body) / 2);
  lx = label ? (lw <= body ? (valueText && lw + 12 + vw > body ? 3 : bx) : R((CW - lw) / 2)) : 0;
  vx = valueText ? Math.max(bx + body - vw, lx + (label ? lw + 12 : 0)) : 0;
  if (vx + vw > CW - 3) CW = vx + vw + 3;
  return { CW, CH: row + BH + 4, bx, by: row + 2, bw, lx, vx };
}
/**
 * Paint the meter card. o = { level 0..1, ov 0..1 (overfull look), low 0..1 (red frame pulse strength), blink 0..1,
 * t (shimmer phase, s), label, valueText, num 0..1 (value dissolve), bw } → { card, mask, L, fillX (card x of the fill edge) }.
 */
export function meterCard(o) {
  const probe = new Canvas(1, 1), L = meterLayout(probe, o.label, o.valueText, o.bw);
  const card = new Canvas(L.CW, L.CH, "#000000"), m = new Uint8Array(L.CW * L.CH);
  const g = Object.create(card); g.px = (x, y, col) => { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= L.CW || y >= L.CH) return; card.px(x, y, col); m[y * L.CW + x] = 1; };
  const { bx, by, bw: w } = L, bh = BH, level = clamp01(o.level), ov = clamp01(o.ov ?? 0), blink = clamp01(o.blink ?? 0), t = o.t ?? 0;
  const col = ov > 0 ? mix(levelColor(level), "#D8FF7A", ov) : levelColor(level), low = clamp01(o.low ?? 0);
  // label (+ the value, dissolving in with num through its own ordered-dither gate)
  if (o.label) otext(g, o.label, L.lx + 1, 2, C.IV, 1, 2);
  if (o.valueText && (o.num ?? 1) > 0) otext(g, o.valueText, L.vx + 1, 2, mix(C.Y, WHITE, 0.25 * ov * blink), o.num ?? 1, 2);
  // body: dark outline, edge, inner well; nub on the right (the film's battery look)
  const edge = mix(mix(C.p7, "#FFE07A", ov), RED, low * (0.4 + 0.6 * blink));
  g.rrect(bx - 1, by - 1, w + 2, bh + 2, C.O, 2); g.rrect(bx, by, w, bh, edge, 2); g.rrect(bx + 1, by + 1, w - 2, bh - 2, C.p5, 2);
  g.rect(bx + 2, by + 2, w - 4, bh - 4, "#0E0918");
  g.rect(bx + w, by + 7, 6, 12, C.O); g.rect(bx + w, by + 8, 5, 10, edge); g.rect(bx + w, by + 9, 4, 8, C.p5);
  // fill: continuous width, segment cuts every 10 px, lit top rows and darker bottom rows
  const fx0 = bx + 4, fy0 = by + 4, fw = w - 8, fh = bh - 8, fill = fw * level, lit = mix(col, WHITE, 0.38 + 0.25 * ov), dark = mix(col, C.O, 0.32);
  for (let i = 0; i < Math.ceil(fill); i++) {
    const cut = i % 10 === 9, part = Math.min(1, fill - i);
    if (part < 1 && part <= bayer(fx0 + i, fy0) * 0.999) continue;
    for (let j = 0; j < fh; j++) {
      let cc = j < 2 ? lit : j >= fh - 3 ? dark : col;
      if (ov > 0) { const sh = frac((i - j * 0.6) / 46 - t * 0.9); if (sh < 0.12 * ov) cc = mix(cc, WHITE, 0.55); }
      if (cut) cc = mix(cc, C.O, 0.55);
      g.px(fx0 + i, fy0 + j, cc);
    }
  }
  if (fill > 1) g.rect(fx0 + R(fill) - 1, fy0, 1, fh, mix(col, WHITE, 0.6));
  return { card, mask: m, L, fillX: fx0 + fill };
}
/** The film's overfull halo (dithered, 6 px round the body + nub), in screen space around the card placed at (cx, cy)
 *  with scale s: it mixes the picture under it toward a warm yellow. gk = strength 0..1. */
export function meterHalo(c, L, cx, cy, s, gk) {
  if (gk <= 0) return;
  const { CW, CH, bx, by, bw: w } = L, bh = BH, ox = cx - (CW / 2) * s, oy = cy - (CH / 2) * s;
  const X0 = Math.floor(ox + (bx - 7) * s), X1 = Math.ceil(ox + (bx + w + 12) * s), Y0 = Math.floor(oy + (by - 7) * s), Y1 = Math.ceil(oy + (by + bh + 7) * s);
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const u = (x + 0.5 - ox) / s, v = (y + 0.5 - oy) / s;
    const dx = Math.max(bx - u, 0, u - (bx + w + 5)), dy = Math.max(by - v, 0, v - (by + bh)), d = Math.hypot(dx, dy);
    if (d <= 0 || d > 6) continue;
    if (gk * (1 - d / 6) > bayer(x, y)) c.px(x, y, mix(c.get(x, y), "#FFE88A", 0.6));
  }
}
/** Composite the card centred at (cx, cy) at scale s (nearest), through canvas c (a dissolve view in the engine). */
export function blitMeter(c, { card, mask, L }, cx, cy, s) {
  const { CW, CH } = L, x0 = Math.floor(cx - (CW / 2) * s), x1 = Math.ceil(cx + (CW / 2) * s), y0 = Math.floor(cy - (CH / 2) * s), y1 = Math.ceil(cy + (CH / 2) * s);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const u = Math.floor((x + 0.5 - cx) / s + CW / 2), v = Math.floor((y + 0.5 - cy) / s + CH / 2);
    if (u < 0 || v < 0 || u >= CW || v >= CH || !mask[v * CW + u]) continue; c.px(x, y, card.get(u, v)); }
  return { x0, y0, x1, y1 };
}
