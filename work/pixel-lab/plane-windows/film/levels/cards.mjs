// Lead's cards of «Why airplane windows are round»:
// · PRESSURE CYCLES (top left, during "Flight after flight … tore open"): one tick box fills with each fast pressure pulse
//   (the same N_CYCLES pulses the fuselage breathes) — an illustration of repeated cycles, not a count of real flights;
// · SAFETY FEATURE ✓ badge on "It's a safety feature" (top centre).
// All continuous (dissolves, eased drops); gone before the share/follow card.
import { EV, CYCLES, N_CYCLES } from "../timeline.mjs";
import { fade, mix, sm, ease, panel, C, MAIN, TINY, bayer } from "../cute.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b - fo, b));
export const CYCLE_CARD = [CYCLES[0] - 0.15, EV.round2 + 0.2];
export const BADGE = [EV.safety - 0.12, EV.liked - 0.2];
/** Peak time of pulse k (the fuselage is most inflated): pressure(t) = 0.5 − 0.5·cos(2π·N·u) peaks at u = (k + 0.5)/N. */
export const PULSES = [...Array(N_CYCLES).keys()].map((k) => CYCLES[0] + ((k + 0.5) / N_CYCLES) * (CYCLES[1] - CYCLES[0]));

export function hud(c, V, t) {
  // pressure cycles
  { const a = win(t, ...CYCLE_CARD, 0.3, 0.35); if (a > 0) {
    const k = clamp01((t - CYCLE_CARD[0]) / 0.4), x0 = 20, y0 = R(104 - (1 - back(k)) * 14), w = 236, h = 70;
    panel(c, x0, y0, w, h, a, "#7FE3F0");
    const g = fade(c, a); g.text(MAIN, "PRESSURE CYCLES", x0 + 13, y0 + 13, C.O, { scale: 2 }); g.text(MAIN, "PRESSURE CYCLES", x0 + 12, y0 + 12, "#7FE3F0", { scale: 2 });
    for (let i = 0; i < N_CYCLES; i++) {
      const bx = x0 + 14 + i * 36, by = y0 + 36, f = sm(t, PULSES[i] - 0.18, PULSES[i] + 0.05);
      g.rrect(bx, by, 28, 22, "#0B0812", 2); g.rrect(bx + 1, by + 1, 26, 20, "#1E2A4A", 2);
      if (f > 0) { const gf = fade(c, a * f); gf.rrect(bx + 2, by + 2, 24, 18, i === N_CYCLES - 1 ? "#FF5468" : "#7FE3F0", 1); gf.text(MAIN, "+", bx + 9, by + 5, "#0B0812", { scale: 2 }); }
    }
    const ma = a * sm(t, EV.metal - 0.1, EV.metal + 0.2); if (ma > 0) fade(c, ma).text(TINY, "...AND MORE", x0 + w - 86, y0 + h - 12, "#B8D8FF", { scale: 1 });
  } }
  // SAFETY FEATURE ✓
  { const a = win(t, ...BADGE, 0.25, 0.3); if (a > 0) {
    const k = clamp01((t - BADGE[0]) / 0.45), s = 3, str = "SAFETY FEATURE", tw = c.measure(MAIN, str, { scale: s }), w = tw + 70, h = 50, x0 = R(270 - w / 2), y0 = R(118 - (1 - back(k)) * 22);
    const g = fade(c, a);
    g.rrect(x0, y0 + 4, w, h, "#0E3A1C", 4); g.rrect(x0, y0, w, h, "#1E6A34", 4); g.rrect(x0 + 2, y0 + 2, w - 4, h - 8, "#3CB85A", 3); g.rect(x0 + 8, y0 + 4, w - 16, 2, "#8CF0A0");
    // the check mark draws itself
    const ck = sm(t, EV.safety + 0.05, EV.safety + 0.4), cx = x0 + 16, cy = y0 + 24, pts = [[0, 0], [7, 8], [22, -10]];
    for (let u = 0; u < ck; u += 0.02) { const seg = u < 0.35 ? 0 : 1, uu = seg === 0 ? u / 0.35 : (u - 0.35) / 0.65, p = pts[seg], q = pts[seg + 1]; g.rect(R(cx + p[0] + (q[0] - p[0]) * uu) - 1, R(cy + p[1] + (q[1] - p[1]) * uu) - 1, 4, 4, "#FDFEED"); }
    g.text(MAIN, str, x0 + 52, y0 + 15, "#0E3A1C", { scale: s }); g.text(MAIN, str, x0 + 51, y0 + 14, "#FDFEED", { scale: s });
    // shine sweep on arrival
    const sh = (t - BADGE[0] - 0.3) / 0.5; if (sh > 0 && sh < 1) { const gx = fade(c, a * 0.5); const xx = R(x0 + sh * (w + 40) - 20); for (let j = 2; j < h - 6; j++) for (let q = 0; q < 5; q++) { const X = xx + q - R(j * 0.5); if (X > x0 + 2 && X < x0 + w - 2) gx.px(X, y0 + j, "#FFFFFF"); } }
  } }
}
