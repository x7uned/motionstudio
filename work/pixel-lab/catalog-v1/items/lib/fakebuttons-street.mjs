// catalog-v1 copy (2026-10-26) of fake-buttons/film/levels/street-kit.mjs (Layer, vgrad, hline, vline, tintRect, glow) and
// street-props.mjs (BOXART button box, drawSignals icons/lamps). Changes: no film imports/timeline; text removed (plate and
// WAIT window carry pictograms only); the layer is composited with c.px (dissolve-safe) at a continuous scale; glows are
// scaled by the presence s.a; the lamp levels are parameters instead of film time functions.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
export { mix, bayer };
export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const INK = "#1A0E1C", RIM = "#FFC27A";

export class Layer {
  constructor(w, h, ox = 0, oy = 0) {
    this.w = w; this.h = h; this.ox = ox; this.oy = oy;
    this.d = new Uint8ClampedArray(w * h * 3); this.m = new Uint8Array(w * h);
    const self = this, g = Object.create(Canvas.prototype);
    g.w = 1e9; g.h = 1e9; g.d = this.d;
    g.px = (x, y, c) => {
      if (!c) return; x = Math.floor(x - self.ox); y = Math.floor(y - self.oy); if (x < 0 || y < 0 || x >= w || y >= h) return;
      const p = hex(c), i = y * w + x; self.d[i * 3] = p[0]; self.d[i * 3 + 1] = p[1]; self.d[i * 3 + 2] = p[2]; self.m[i] = 1;
    };
    this.g = g;
  }
  clone() { const L = new Layer(this.w, this.h, this.ox, this.oy); L.d.set(this.d); L.m.set(this.m); return L; }
}
/** Composite layer L at scale S with the layer origin (paint coordinate 0,0) at screen (cx, cy), through c.px. */
export function blitS(c, L, cx, cy, S) {
  const x0 = Math.floor(cx + L.ox * S), y0 = Math.floor(cy + L.oy * S), x1 = Math.ceil(cx + (L.ox + L.w) * S), y1 = Math.ceil(cy + (L.oy + L.h) * S);
  for (let Y = y0; Y < y1; Y++) {
    const v = Math.floor((Y + 0.5 - cy) / S - L.oy); if (v < 0 || v >= L.h) continue;
    for (let X = x0; X < x1; X++) {
      const u = Math.floor((X + 0.5 - cx) / S - L.ox); if (u < 0 || u >= L.w) continue;
      const i = v * L.w + u; if (!L.m[i]) continue; const q = i * 3;
      c.px(X, Y, "#" + ((1 << 24) | (L.d[q] << 16) | (L.d[q + 1] << 8) | L.d[q + 2]).toString(16).slice(1));
    }
  }
}
export function tintRect(c, x0, y0, w, h, kf, col, steps = 4) {
  const C = hex(col), d = c.d, W = c.w;
  const xa = Math.max(0, x0 | 0), xb = Math.min(W, (x0 + w) | 0), ya = Math.max(0, y0 | 0), yb = Math.min(c.h, (y0 + h) | 0);
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
    const v = kf(x, y); if (!(v > 0)) continue;
    const sV = Math.min(1, v) * steps, lo = Math.floor(sV), q = (sV - lo > bayer(x, y) ? lo + 1 : lo) / steps; if (q <= 0) continue;
    const p = (y * W + x) * 3; d[p] += (C[0] - d[p]) * q; d[p + 1] += (C[1] - d[p + 1]) * q; d[p + 2] += (C[2] - d[p + 2]) * q;
  }
}
/** Glow in screen px, strength k already multiplied by the presence. */
export function glow(c, x, y, r, col, k) { if (k <= 0.01) return; tintRect(c, x - r, y - r, 2 * r + 1, 2 * r + 1, (X, Y) => { const q = Math.hypot(X - x, Y - y) / r; return q >= 1 ? 0 : k * (1 - q) ** 1.4; }, col, 8); }
export function vgrad(g, x, y, w, h, a, b, steps = 4) {
  for (let j = 0; j < h; j++) { const v = (j / Math.max(1, h - 1)) * steps, lo = Math.floor(v), fr = v - lo; for (let i = 0; i < w; i++) { const s = fr > bayer(x + i, y + j) ? lo + 1 : lo; g.px(x + i, y + j, mix(a, b, Math.min(steps, s) / steps)); } }
}
export function hline(g, x, y, w, c) { for (let i = 0; i < w; i++) g.px(x + i, y, c); }
export function vline(g, x, y, h, c) { for (let j = 0; j < h; j++) g.px(x, y + j, c); }

// ---------------------------------------------------------------- crosswalk push-button box (street-props.mjs BOXART)
export const BOX = { x0: -14, x1: 15, y0: -31, y1: 21 }, PLATE = { x0: -24, x1: 25, y0: -84, y1: -54 }, POLE_X = 13;
let _box = null;
export function boxArt() {
  if (_box) return _box;
  const L = new Layer(70, 168, -32, -97), g = L.g;     // plate (−84) down to the pole foot (+62)
  g.rect(POLE_X - 2, -84, 5, 139, "#3A4440"); vline(g, POLE_X - 2, -84, 139, RIM); vline(g, POLE_X + 2, -84, 139, "#1E2624");
  g.rect(POLE_X - 6, 55, 13, 7, "#2A3230"); hline(g, POLE_X - 6, 55, 13, RIM); g.rect(POLE_X - 4, 51, 9, 4, "#3A4440");
  const { x0, x1, y0, y1 } = PLATE; g.rect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2, INK); g.rect(x0, y0, x1 - x0, y1 - y0, "#F4F0E6"); g.frame(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2, "#2A2430");
  hline(g, x0, y0, x1 - x0, "#FFFFFF");
  // the film's three text lines become unreadable grey bars (no readable text), the red arrow stays
  hline(g, x0 + 8, y0 + 5, 32, "#9A96A2"); hline(g, x0 + 12, y0 + 12, 24, "#9A96A2"); hline(g, x0 + 7, y0 + 20, 22, "#9A96A2");
  { const ax = x1 - 9, ay = y0 + 21; hline(g, ax - 2, ay, 5, "#C8343A"); g.px(ax - 1, ay - 1, "#C8343A"); g.px(ax - 1, ay + 1, "#C8343A"); g.px(ax - 2, ay - 1, "#C8343A"); g.px(ax - 2, ay + 1, "#C8343A"); }
  g.rect(x1 - 4, y1, 3, 4, "#2A3230");
  const b = BOX; g.rect(b.x0 - 1, b.y0 - 1, b.x1 - b.x0 + 2, b.y1 - b.y0 + 2, INK);
  vgrad(g, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, "#F6D04A", "#D8A42A", 3); vline(g, b.x0, b.y0, b.y1 - b.y0, "#FFE890"); hline(g, b.x0, b.y0, b.x1 - b.x0, "#FFF0B0"); vline(g, b.x1 - 1, b.y0, b.y1 - b.y0, "#A87A1E"); hline(g, b.x0, b.y1 - 1, b.x1 - b.x0, "#A87A1E");
  g.px(b.x0 - 1, b.y0 - 1, null); for (const [cx, cy] of [[b.x0 + 2, b.y0 + 2], [b.x1 - 3, b.y0 + 2], [b.x0 + 2, b.y1 - 3], [b.x1 - 3, b.y1 - 3]]) g.px(cx, cy, "#8A6A1A");
  for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) { const d = Math.hypot(i, j); if (d <= 9.2 && d > 7.2) g.px(i, j, d > 8.4 ? INK : i + j < 0 ? "#B8B8C4" : "#6E6E7E"); }
  hline(g, -4, 14, 9, "#2A2430"); g.px(-3, 13, "#2A2430"); g.px(-3, 15, "#2A2430"); g.px(-2, 12, "#2A2430"); g.px(-2, 16, "#2A2430");
  g.rect(-10, -28, 21, 9, INK);      // lamp window
  return (_box = L);
}
/** Live parts into a layer clone: the dome (press 0..1) and the lamp window (w 0..1 orange, gr 0..1 green). */
export function boxLive(L, press, w, gr) {
  const g = L.g, sink = press * 1.6;
  for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) {
    const d = Math.hypot(i, j); if (d > 7.2) continue;
    const yy = j + (d < 6.2 ? Math.floor(sink) + (sink - Math.floor(sink) > bayer(i + 9, j + 9) ? 1 : 0) : 0), lightK = clamp01(1 - Math.hypot(i + 3, j + 3) / 8) - press * 0.25;
    let col = d > 6.2 ? "#4A4A58" : lightK > 0.55 ? "#FFFFFF" : lightK > 0.3 ? "#D8D8E4" : lightK > 0.1 ? "#A8A8BA" : "#7A7A8E";
    if (d <= 6.2 && d > 5.2 && i + j > 2) col = "#5A5A6C";
    g.px(i, yy, col);
  }
  if (sink > 0.5) for (let i = -5; i <= 5; i++) g.px(i, -6, "#2A2A34");
  // lamp window: dark red base, a row of lit cells (the film's WAIT letters turned into a plain bar)
  g.rect(-9, -27, 19, 7, "#2A0E10");
  for (let j = 0; j < 5; j++) for (let i = 0; i < 15; i++) {
    const X = -7 + i, Y = -26 + j; if (j === 0 || j === 4) { if (i % 2) continue; }
    const base = "#5A2420";
    if (gr > 0 && gr > bayer(X + 40, Y) * 0.98) g.px(X, Y, (X + Y) & 1 ? "#B8FFC8" : "#5AF08A");
    else if (w > bayer(X, Y) * 0.98) g.px(X, Y, (X + Y) & 1 ? "#FFD8A0" : "#FF8A4A");
    else g.px(X, Y, base);
  }
}

// ---------------------------------------------------------------- signals (street-props.mjs drawSignals)
export const HAND = ["....##........", "..#.##.##.....", ".##.##.##.....", ".##.##.##.##..", ".##.##.##.##..", ".##.##.##.##..", ".##.##.##.##..", ".###########.#", ".###########.#", ".############.", ".###########..", "..##########..", "..#########...", "...#######....", "...#######...."];
export const MAN = [".....##.....", ".....##.....", "............", "....###.....", "...#####....", "..#.###.#...", ".#..###..#..", "#...###...#.", "....###.....", "....#.##....", "...##..#....", "..##...##...", ".##.....#...", "##......##.."];
export function icon(g, rows, x0, y0, on, colOn, colOff) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== "#") return; const X = x0 + i, Y = y0 + j, led = ((X + Y) & 1) === 0;
    const lit = on > bayer(X, Y) * 0.98; g.px(X, Y, lit ? (led ? colOn[0] : colOn[1]) : (led ? colOff[0] : colOff[1]));
  }));
}
