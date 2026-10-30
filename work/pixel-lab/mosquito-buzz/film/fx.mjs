// «Why mosquitoes buzz right in your ear» — the film's own effects and screen pieces: breath clouds of CO₂, the warmth
// shimmer over the face, the wingbeat meter, the "at your ear" volume meter, the love-song panel (her note and his note
// sliding until 3 of her waves fit 2 of his), hearts and notes. Same palette and panel look as hud.mjs / cute.mjs.
// Everything takes a (0..1, dithered dissolve) and continuous values: nothing pops in one frame.
import { MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { C, panel } from "./cute.mjs";

const R = Math.round, TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const tw = (c, s, scale) => c.measure(MAIN, s, { scale });

/** a soft dithered cloud (screen px) */
export function cloud(c, x, y, r, a, col = "#DDE8FF", edge = "#9FB4E8") {
  if (a <= 0 || r < 1) return;
  for (let Y = R(y - r); Y <= R(y + r); Y++) for (let X = R(x - r * 1.3); X <= R(x + r * 1.3); X++) {
    const d = Math.hypot((X - x) / 1.3, Y - y) / r; if (d > 1) continue;
    const k = a * (1 - d * d) * (0.75 + 0.25 * Math.sin(X * 0.7 + Y * 0.5)); if (k <= bayer(X, Y)) continue;
    c.px(X, Y, mix(c.get(X, Y), d > 0.8 ? edge : col, d > 0.8 ? 0.55 : 0.72));
  }
}
/** rising heat shimmer: wavy dithered orange lines above (x, y) over width w (screen px), phase ph */
export function shimmer(c, x, y, w, h, ph, a) {
  if (a <= 0) return;
  for (let k = 0; k < 6; k++) {
    const x0 = x - w / 2 + (k + 0.5) * (w / 6);
    for (let j = 0; j < h; j++) { const u = j / h, q = (((u + ph * 0.8 + k * 0.17) % 1) + 1) % 1, al = a * Math.sin(Math.PI * u) * (q < 0.55 ? 1 : 0.25);
      const xx = R(x0 + 4 * Math.sin(TAU * (u * 2.2 + ph + k * 0.3))), yy = R(y - j); if (al > bayer(xx, yy)) c.px(xx, yy, mix(c.get(xx, yy), q < 0.3 ? "#FFB070" : "#FF7A48", 0.55)); }
  }
}
/** a pixel heart (screen px), k pops it in (0..1) */
export function heart(c, x, y, size, k, a = 1) {
  if (k <= 0 || a <= 0) return; const s = size * (0.5 + 0.5 * Math.min(1, k * 1.25) - 0.08 * Math.max(0, k * 1.25 - 1)), g = fade(c, a * Math.min(1, k * 2));
  for (let Y = R(y - s); Y <= R(y + s); Y++) for (let X = R(x - s * 1.2); X <= R(x + s * 1.2); X++) {
    const u = (X - x) / s, v = -(Y - y) / s + 0.15, f = (u * u + v * v - 1) ** 3 - u * u * v * v * v; if (f > 0) continue;
    const edge = (((u + 0.08) ** 2 + (v - 0.05) ** 2 - 1) ** 3 - (u + 0.08) ** 2 * (v - 0.05) ** 3) > -0.02;
    g.px(X, Y, edge ? "#8A1A3A" : u < -0.25 && v > 0.25 ? "#FFB0C4" : "#FF5A84");
  }
}
/** an eighth note (screen px) */
export function note(c, x, y, a, col = C.Y) { if (a <= 0) return; const g = fade(c, a); g.ellipse(R(x), R(y), 4, 3, C.O); g.ellipse(R(x), R(y), 3, 2, col); g.rect(R(x + 2), R(y - 12), 2, 12, C.O); g.rect(R(x + 3), R(y - 12), 1, 11, col); g.rect(R(x + 3), R(y - 12), 5, 2, C.O); g.rect(R(x + 3), R(y - 12), 4, 1, col); }

/** wingbeat meter panel (top band): "WINGBEATS", a fused scope band, "≈500 /S", "WHINE" (same look as the wingbeat film) */
export function wingMeter(c, t, a) {
  if (a <= 0) return; const g = fade(c, a), X = 18, Y = 100, Wd = 504, H = 92, SX = X + 74, SW = 256;
  g.rrect(X, Y, Wd, H, "#1A1430", 3); g.rrect(X + 2, Y + 2, Wd - 4, H - 4, "#3B2C5C", 3); g.rect(X + 4, Y + 3, Wd - 8, 1, "#6E4FB0"); g.rrect(X + 8, Y + 8, Wd - 16, H - 16, "#0B0812", 2);
  g.text(MAIN, "WINGBEATS", X + 14, Y + 12, "#8D7AB8", { scale: 1 }); g.text(MAIN, "ABOUT", X + Wd - 150, Y + 12, "#8D7AB8", { scale: 1 });
  const base = Y + H / 2 + 6;
  for (let x = 0; x < SW; x++) { const h = 22 + 4 * Math.sin(x * 1.9 + t * 40); for (let y = R(base - h); y <= R(base + h * 0.35); y++) g.px(SX + x, y, (x + y) % 2 ? mix("#7FE3F0", "#1E3A5A", (1 - x / SW) * 0.8) : mix("#5ABACC", "#16304A", (1 - x / SW) * 0.8)); }
  // wing icon: a blurred fan
  for (let k = 0; k < 7; k++) { const ang = -0.6 + (1.5 * k) / 6, L = 22; g.line(X + 44, Y + 58, R(X + 44 + Math.cos(ang) * L), R(Y + 58 - Math.sin(ang) * L), k === 0 || k === 6 ? "#FDFEED" : "#9A92C0"); }
  g.disc(X + 44, Y + 58, 3, "#F4CA50");
  const txt = "500", w2 = c.measure(MAIN, txt, { scale: 4 }), rx = X + Wd - 16;
  g.text(MAIN, txt, R(rx - w2 - 30) + 1, Y + 19, "#04121A", { scale: 4 }); g.text(MAIN, txt, R(rx - w2 - 30), Y + 18, "#9AF0FF", { scale: 4 });
  g.text(MAIN, "/S", rx - 24, Y + 32, "#5AA8C0", { scale: 2 });
  const ww = c.measure(MAIN, "WHINE", { scale: 2 }); g.text(MAIN, "WHINE", R(rx - ww), Y + 62, "#FF8AA6", { scale: 2 });
}
/** "at your ear" volume meter: a speaker and 8 bars lit by v (0..1) */
export function volumeMeter(c, v, a) {
  if (a <= 0) return; const g = fade(c, a), X = 120, Y = 104, Wd = 300, H = 64;
  panel(c, X, Y, Wd, H, a, C.p7);
  g.text(MAIN, "AT YOUR EAR", X + 14, Y + 10, C.L, { scale: 2 });
  // speaker icon
  g.rect(X + 16, Y + 34, 8, 12, C.IV); g.poly([[X + 24, Y + 34], [X + 34, Y + 26], [X + 34, Y + 54], [X + 24, Y + 46]], C.IV);
  for (let i = 0; i < 8; i++) { const on = clamp01(v * 8 - i), h = 8 + i * 2.6, bx = X + 52 + i * 28, by = Y + 54 - h, col = i < 4 ? C.GR : i < 6 ? C.Y : C.PK;
    g.rect(bx, R(by), 20, R(h), "#2A2440"); if (on > 0) fade(c, a * Math.min(1, on * 1.5)).rect(bx, R(by), 20, R(h), col); }
}
/**
 * The love-song panel: her wave (3 humps in the box when fitted) and his wave (2 humps), the box edges dashed. k = 0 apart
 * … 1 fitted: his wave slides from 2.15 humps to exactly 2, hers from 2.9 to exactly 3; at k = 1 their ends meet the box
 * edges and "FIT!" lights up. (Overtones, simplified: 3 of her waves = 2 of his.)
 */
export function songPanel(c, t, k, a) {
  if (a <= 0) return; const g = fade(c, a), X = 40, Y = 100, Wd = 460, H = 176, BX = X + 96, BW = 300;
  panel(c, X, Y, Wd, H, a, C.p7);
  const row = (label, col, yy, humps, drift) => {
    g.text(MAIN, label, X + 12, yy - 6, col, { scale: 2 });
    for (let x = 0; x <= BW; x++) { const u = x / BW, v = Math.sin(TAU * (humps * u / 2) + drift), y = R(yy - 18 * v); g.rect(BX + x, y - 1, 1, 3, col); }
  };
  const fh = 2.9 + 0.1 * k, mh = 2.15 - 0.15 * k, drift = (1 - k) * Math.sin(t * 3) * 0.6;
  row("HER", "#FF8AA6", Y + 52, fh * 2, drift);
  row("HIS", "#7FE3F0", Y + 112, mh * 2, -drift);
  for (const bx of [BX, BX + BW]) for (let y = Y + 26; y < Y + 136; y += 6) g.rect(bx, y, 1, 3, k > 0.95 ? C.GR : C.p7);
  const lab = k > 0.98 ? "3 OF HERS = 2 OF HIS" : "CHANGING NOTES...", lw = tw(c, lab, 2);
  g.text(MAIN, lab, R(X + Wd / 2 - lw / 2), Y + H - 26, k > 0.98 ? C.GR : C.L, { scale: 2 });
}
