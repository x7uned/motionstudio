// Lead's cards of «You're not ugly»: the three causes on "So it's not your face. It's the distance, the mirror and your
// skull." — three tags with pixel icons inside the VIEW's bottom strip (screen y 326–390), each popping on its word, and a
// small "YOUR FACE ✗" crossed out on "not your face". All continuous (dissolves, eased drops), gone before the CTA card.
import { EV, VIEW, VIEW_OUT } from "../timeline.mjs";
import { fade, mix, sm, ease, C, MAIN, bayer } from "../cute.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const TAGS = [
  { word: EV.distance, label: "DISTANCE", col: "#7FE3F0", icon: "ruler" },
  { word: EV.mirror4, label: "MIRROR", col: "#E0CDF8", icon: "mirror" },
  { word: EV.skull, label: "SKULL", col: "#F4CA50", icon: "skull" },
];
export const NOT_FACE = [EV.so3 - 0.05, EV.distance - 0.15];
const OUT = VIEW_OUT - 0.05;

function icon(g, kind, x, y, col) {
  if (kind === "ruler") { g.rect(x, y + 4, 22, 9, "#0B0812"); g.rect(x + 1, y + 5, 20, 7, col); for (let i = 3; i < 20; i += 4) g.rect(x + i, y + 5, 1, i % 8 === 3 ? 4 : 2, "#0B0812"); }
  else if (kind === "mirror") { g.ellipse ? g.ellipse(x + 10, y + 8, 9, 11, "#0B0812") : g.disc(x + 10, y + 8, 10, "#0B0812"); g.disc(x + 10, y + 8, 8, mix(col, "#FFFFFF", 0.2)); g.rect(x + 6, y + 3, 2, 6, "#FFFFFF"); g.rect(x + 9, y + 19, 3, 4, "#0B0812"); g.rect(x + 5, y + 22, 11, 2, "#0B0812"); }
  else if (kind === "skull") { g.disc(x + 10, y + 8, 10, "#0B0812"); g.disc(x + 10, y + 8, 8, "#FDFEED"); g.rect(x + 5, y + 13, 11, 7, "#0B0812"); g.rect(x + 6, y + 13, 9, 6, "#FDFEED"); g.rect(x + 4, y + 6, 5, 5, "#0B0812"); g.rect(x + 12, y + 6, 5, 5, "#0B0812"); g.rect(x + 9, y + 12, 3, 2, "#0B0812"); for (let i = 7; i < 15; i += 2) g.rect(x + i, y + 17, 1, 3, "#0B0812"); }
}
export function hud(c, V, t) {
  if (t < NOT_FACE[0] || t > OUT + 0.4) return;
  const out = 1 - sm(t, OUT, OUT + 0.3);
  // "YOUR FACE" crossed out, small, above the three tags
  { const a = Math.min(sm(t, NOT_FACE[0], NOT_FACE[0] + 0.25), out); if (a > 0) {
    const g = fade(c, a), s = 2, str = "YOUR FACE", w = c.measure(MAIN, str, { scale: s }), x = R(270 - w / 2), y = VIEW.y + VIEW.h - 98;
    g.rrect(x - 10, y - 6, w + 20, 28, "#0B0812", 3); g.rrect(x - 9, y - 5, w + 18, 26, "#2A1F40", 3); g.text(MAIN, str, x, y, C.IV, { scale: s });
    const k = sm(t, EV.face3 - 0.05, EV.face3 + 0.25); for (let i = 0; i < R((w + 12) * k); i++) g.rect(x - 6 + i, y + 6 + R(i * 0.06), 2, 2, "#FF5468");
  } }
  // the three causes
  const W = 120, gap = 12, x0 = R(270 - (3 * W + 2 * gap) / 2), y0 = VIEW.y + VIEW.h - 64;
  TAGS.forEach((tg, i) => {
    const k = clamp01((t - tg.word + 0.06) / 0.4), a = Math.min(sm(k, 0, 0.5), out); if (a <= 0) return;
    const g = fade(c, a), x = x0 + i * (W + gap), y = R(y0 + (1 - back(k)) * 14);
    g.rrect(x, y, W, 46, tg.col, 3); g.rrect(x + 2, y + 2, W - 4, 42, "#140E24", 2);
    icon(g, tg.icon, x + 8, y + 10, tg.col);
    const s = 2, w = c.measure(MAIN, tg.label, { scale: s }), tx = x + 36 + R((W - 40 - w) / 2);
    g.text(MAIN, tg.label, tx + 1, y + 17, C.O, { scale: s }); g.text(MAIN, tg.label, tx, y + 16, tg.col, { scale: s });
    // a little sparkle burst on arrival
    if (k > 0 && k < 1) for (let q = 0; q < 8; q++) { const an = (q / 8) * Math.PI * 2, r = 30 + 26 * ease(k); const X = R(x + W / 2 + Math.cos(an) * r * 1.6), Y = R(y + 23 + Math.sin(an) * r * 0.6); if ((1 - k) > bayer(X, Y)) g.rect(X, Y, 2, 2, q % 2 ? tg.col : "#FFFFFF"); }
  });
}
