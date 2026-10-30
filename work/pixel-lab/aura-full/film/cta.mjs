// «Infinite aura» · builder X · the end card (2026-10-25). From "How much aura do you have?" (31.82) to the end (≈ 38.27):
// right of him (the lead moves him to sx ≈ 170) a dark translucent dithered panel with a gold bevel frame unrolls and
// lists the ten milestones of the film (number in gold, what it unlocked in ivory; ∞ drawn by hand — the font has none).
// A blinking "YOU" tag hops down the list, one row every ~0.6 s with a little hop arc, and lands on ∞ at the end; the
// row under it glows. Faded in by X.cta (dithered). Captions (the question) are the lead's. Readable at phone size:
// MAIN font ×2. Safe zones: x 230–442 (≤ 440 below y 400 except the 2-px frame), y 258–622.
import { MAIN, fade, mix, bayer } from "../../../../renderer/pixel/raster.mjs";
import { clamp01, sm, ease, lerp } from "./layout.mjs";
import { EV } from "./timeline.mjs";
import { prof } from "./X-fx.mjs";

const R = Math.round, PI = Math.PI;
export const ROWS = [["100", "PIGEONS WATCHING"], ["1,000", "LASER PIGEONS"], ["10,000", "DINOSAURS"], ["15,000", "METEORS"], ["20,000", "EXPLOSIONS"],
  ["50,000", "MOON STARES"], ["100,000", "ALIENS"], ["1,000,000", "TIME STOPS"], ["1,000,000,000", "PLANET TOO SMALL"], ["∞", "INFINITE AURA"]];
export const PANEL = { x0: 230, y0: 258, x1: 442, y1: 622 };
const PITCH = 34, TOP = PANEL.y0 + 12, TX = PANEL.x0 + 10;
const INK = "#0B0812", IV = "#FDFEED", GOLD = "#F4CA50", GOLD_L = "#FAE375", GOLD_D = "#A06A10", DIM_N = "#B89A48", DIM_L = "#B4AECB";
// the marker: appears on row 0, hops one row per HOP seconds, lands on ∞
const M0 = EV.how + 0.55, HOP = 0.58, TRAVEL = 0.24;
export const markerAt = (t) => {
  const u = (t - M0) / HOP, i = Math.max(0, Math.min(ROWS.length - 1, Math.floor(u))), into = (u - Math.floor(u)) * HOP;
  if (u < 0) return { row: 0, y: TOP, k: 0, i: 0 };
  if (i >= ROWS.length - 1) return { row: ROWS.length - 1, y: TOP + (ROWS.length - 1) * PITCH, k: 0, i: ROWS.length - 1 };
  const k = clamp01((into - (HOP - TRAVEL)) / TRAVEL), e = ease(k);                       // dwell, then hop to the next row
  return { row: i, y: TOP + (i + e) * PITCH - 7 * Math.sin(PI * k), k, i: e > 0.5 ? i + 1 : i };
};

function textShadow(g, str, x, y, col, a = 1) {
  const gg = a < 1 ? fade(g, a) : g;
  gg.text(MAIN, str, x + 1, y + 1, INK, { scale: 2 }); gg.text(MAIN, str, x, y, col, { scale: 2 });
}
/** ∞ drawn as a pixel lemniscate, w px wide, centred at (cx, cy). */
function infinity(g, cx, cy, w, col) {
  const a = w / 2 - 2, pts = [];
  for (let i = 0; i < 90; i++) { const s = (2 * PI * i) / 90, d = 1 + Math.sin(s) ** 2; pts.push([cx + (a * Math.cos(s)) / d, cy + (a * Math.sin(s) * Math.cos(s)) / d * 1.5]); }
  for (const [x, y] of pts) g.disc(R(x) + 1, R(y) + 1, 2, INK);
  for (const [x, y] of pts) { g.disc(R(x), R(y), 2, INK); g.disc(R(x) + 1, R(y), 2, INK); }
  for (const [x, y] of pts) g.rect(R(x) - 1, R(y) - 1, 3, 2, col);
  for (const [x, y] of pts) if (y < cy - 1) g.px(R(x) - 1, R(y) - 1, GOLD_L);
}

export const hud = prof("cta.hud", (c, X) => {
  const t = X.t, A = X.cta ?? 0; if (A <= 0) return;
  const g = fade(c, A), { x0, y0, x1, y1 } = PANEL, W = x1 - x0;
  const open = ease(sm(t, EV.how - 0.15, EV.how + 0.4)), H = Math.max(6, R((y1 - y0) * open)), yb = y0 + H;
  // the panel: dark translucent (dithered) body, gold bevel frame, little corner studs
  g.tint(x0 + 2, y0 + 2, W - 4, H - 4, () => 0.8, INK, 5);
  g.rframe(x0, y0, W, H, INK, 2); g.rframe(x0 + 1, y0 + 1, W - 2, H - 2, GOLD, 2); g.rframe(x0 + 2, y0 + 2, W - 4, H - 4, GOLD_D, 1);
  g.rect(x0 + 3, y0 + 1, W - 6, 1, GOLD_L); g.rect(x0 + 1, y0 + 3, 1, H - 6, GOLD_L);
  for (const [sx, sy] of [[x0 - 1, y0 - 1], [x1 - 4, y0 - 1], [x0 - 1, yb - 4], [x1 - 4, yb - 4]]) { g.rect(sx, sy, 5, 5, INK); g.rect(sx + 1, sy + 1, 3, 3, GOLD); g.px(sx + 1, sy + 1, GOLD_L); }
  if (open < 0.12) return;
  // the marker's row highlight (behind the text), following the hop
  const m = markerAt(t), mA = sm(t, M0 - 0.25, M0) * A, pulse = 0.5 + 0.5 * Math.sin(2 * PI * 2.4 * t);
  if (mA > 0) { const hy = R(m.y) - 4, land = m.row === ROWS.length - 1 && m.k === 0 ? 0.12 * pulse : 0; fade(g, mA).tint(x0 + 4, Math.max(y0 + 4, hy), W - 8, 33, (x, y) => (y < yb - 4 ? 0.26 + land : 0), GOLD, 4); }
  // the rows: each slides in (dithered), passed rows bright, coming rows a little dimmer
  ROWS.forEach(([num, label], i) => {
    const y = TOP + i * PITCH, ra = sm(t, EV.how + 0.08 + i * 0.05, EV.how + 0.3 + i * 0.05); if (ra <= 0 || y + 30 > yb) return;
    const dx = R((1 - ra) * 12), lit = i <= m.i && t >= M0 ? 1 : 0, here = i === m.i && mA > 0;
    const nCol = here ? GOLD_L : lit ? GOLD : DIM_N, lCol = here ? "#FFFFFF" : lit ? IV : DIM_L;
    if (num === "∞") infinity(fade(g, ra), TX + dx + 17, y + 7, 34, nCol);
    else textShadow(g, num, TX + dx, y, nCol, ra);
    textShadow(g, label, TX + dx, y + 16, lCol, ra);
    if (i < ROWS.length - 1) for (let x = x0 + 8; x < x1 - 8; x += 3) if (ra > bayer(x, y + 32)) g.px(x, y + 32, "#3A3258");
  });
  // the YOU tag: blinking white ↔ gold, an arrow pointing at the row, hopping down the right column
  if (mA > 0) {
    const gg = fade(g, mA), tx = x1 - 50, ty = R(m.y) - 3, fill = mix(GOLD_L, "#FFFFFF", pulse), land = m.row === ROWS.length - 1 && m.k === 0;
    const sq = land ? R(1.5 * pulse) : R(2 * Math.sin(PI * m.k));          // a little squash & stretch on the hop
    gg.rrect(tx - 1, ty - 1 - sq, 46, 20 + sq, INK, 2);
    gg.rrect(tx, ty - sq, 44, 18 + sq, fill, 2);
    gg.rect(tx + 1, ty + 16, 42, 1, GOLD_D);
    for (let k = 0; k < 6; k++) { gg.rect(tx - 2 - k, ty + 9 - (6 - k), 1, 2 * (6 - k) - 1, INK); if (k < 5) gg.rect(tx - 2 - k, ty + 10 - (5 - k), 1, 2 * (5 - k) - 1, fill); }   // ◀
    gg.text(MAIN, "YOU", tx + 5, ty + 2, INK, { scale: 2 });
    if (land) for (let k = 0; k < 4; k++) { const a = t * 3 + k * PI / 2, sx = R(tx + 22 + Math.cos(a) * 30), sy = R(ty + 8 + Math.sin(a) * 15); if (sx <= x1 - 3 && pulse > 0.3) { gg.px(sx, sy, "#FFFFFF"); gg.px(sx + 1, sy, GOLD); gg.px(sx, sy + 1, GOLD); } }
  }
});

// ---------------------------------------------------------------- sound: the panel unrolls, a blip on every hop
export const MOTIONS = [
  { t0: +(EV.how - 0.15).toFixed(3), t1: +(EV.how + 0.4).toFixed(3), kind: "whoosh", level: 0.4, note: "end card unrolls" },
  { t0: +(M0 - 0.25).toFixed(3), t1: +M0.toFixed(3), kind: "blip", level: 0.5, note: "YOU appears on row 1" },
  ...ROWS.slice(1).map((_, i) => { const t0 = M0 + (i + 1) * HOP - TRAVEL; return { t0: +t0.toFixed(3), t1: +(t0 + TRAVEL).toFixed(3), kind: "blip", level: i === ROWS.length - 2 ? 0.8 : 0.35, note: i === ROWS.length - 2 ? "YOU lands on ∞" : `YOU hops to row ${i + 2}` }; }),
];
