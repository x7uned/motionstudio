// EXPLAIN · the tiny flight-profile strip (screen space, top, y ≈ 100–190, during "On every flight … when you land").
// A small card: "CABIN PRESSURE" with a balloon that inflates and deflates with pressure(t); below it the flight profile
// (takeoff → climb → cruise → descent → landing) drawn as the plane flies it: a tiny jet moves along the path, the path
// behind it is solid with a cyan "pressure" fill under it, the rest of the flight waits as a faint dotted line.
import { EV, PRESS, pressure } from "../timeline.mjs";
import { MAIN, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { R, clamp01, sm, ease, lerp, put, blend, rgb } from "./explain-geo.mjs";

export const STRIP = { x: 48, y: 100, w: 444, h: 88, in: [EV.every1 - 0.2, EV.every1 + 0.2], out: [EV.landEnd + 0.3, EV.landEnd + 0.7] };
// time → fraction of the path (piecewise linear: short ground rolls, the climb and the descent take most of the width)
const KN = [[EV.flight1 - 0.1, 0], [PRESS.up[0], 0.1], [PRESS.up[1], 0.43], [PRESS.down[0], 0.56], [PRESS.down[1], 0.92], [EV.landEnd + 0.35, 1]];
export function pathU(t) { if (t <= KN[0][0]) return 0; for (let i = 0; i + 1 < KN.length; i++) if (t <= KN[i + 1][0]) return lerp(KN[i][1], KN[i + 1][1], (t - KN[i][0]) / (KN[i + 1][0] - KN[i][0])); return 1; }
function timeAt(u) { for (let i = 0; i + 1 < KN.length; i++) if (u <= KN[i + 1][1]) return lerp(KN[i][0], KN[i + 1][0], (u - KN[i][1]) / (KN[i + 1][1] - KN[i][1])); return KN[KN.length - 1][0]; }
const alt = (t) => sm(t, ...PRESS.up) * (1 - sm(t, ...PRESS.down));       // the flight's altitude = the pressure curve's shape
const CY = rgb("#7FE3F0"), CYD = rgb("#2A8AA0"), O = rgb("#0B0812"), IV = rgb("#FDFEED");

export function drawStrip(c, V, t) {
  const a = sm(t, ...STRIP.in) * (1 - sm(t, ...STRIP.out)); if (a <= 0) return;
  const { x, w, h } = STRIP, y = R(STRIP.y - (1 - ease(clamp01((t - STRIP.in[0]) / 0.45))) * 10), g = fade(c, a);
  // card
  g.rrect(x, y + 3, w, h, "#0B0812", 3); g.rrect(x, y, w, h, "#7FE3F0", 3); g.rrect(x + 2, y + 2, w - 4, h - 4, "#14223A", 2);
  for (let j = y + 3; j < y + h - 3; j++) g.rect(x + 3, j, w - 6, 1, mix("#120C1D", "#16243C", (j - y) / h));
  g.text(MAIN, "CABIN PRESSURE", x + 13, y + 10, "#0B0812", { scale: 2 }); g.text(MAIN, "CABIN PRESSURE", x + 12, y + 9, "#7FE3F0", { scale: 2 });
  // the balloon (inflates with the cabin pressure)
  const p = pressure(t), bx = x + 206, by = y + 15, rx = 4 + 6 * p, ry = 5 + 7 * p;
  for (let k = 0; k < 9; k++) g.px(R(bx + Math.sin(k * 0.9 + t * 3) * 1), R(by + ry + 1 + k), "#B8A8D8");
  for (let Y = R(by - ry - 1); Y <= R(by + ry + 1); Y++) for (let X = R(bx - rx - 1); X <= R(bx + rx + 1); X++) {
    const d = ((X + 0.5 - bx) / (rx + 0.7)) ** 2 + ((Y + 0.5 - by) / (ry + 0.7)) ** 2; if (d > 1) continue;
    const din = ((X + 0.5 - bx) / rx) ** 2 + ((Y + 0.5 - by) / ry) ** 2, hl = ((X + 0.5 - bx + rx * 0.4) / (rx * 0.3)) ** 2 + ((Y + 0.5 - by + ry * 0.45) / (ry * 0.25)) ** 2;
    g.px(X, Y, din > 1 ? "#0B0812" : hl < 1 ? "#FFE2EA" : (X - bx) + (Y - by) * 0.6 > rx * 0.4 + bayer(X, Y) * 2 ? "#C8445E" : "#F0607A");
  }
  g.px(R(bx) - 1, R(by + ry + 1), "#0B0812"); g.px(R(bx) + 1, R(by + ry + 1), "#0B0812"); g.px(R(bx), R(by + ry + 1), "#C8445E");
  // UP / DOWN hint next to the balloon (crossfades with the direction of change)
  const up = sm(t, PRESS.up[0], PRESS.up[0] + 0.2) * (1 - sm(t, PRESS.up[1] - 0.1, PRESS.up[1] + 0.2)), dn = sm(t, PRESS.down[0], PRESS.down[0] + 0.2) * (1 - sm(t, PRESS.down[1] - 0.1, PRESS.down[1] + 0.25));
  if (up > 0) { const ga = fade(c, a * up); ga.text(MAIN, "UP", x + 232, y + 10, "#0B0812", { scale: 2 }); ga.text(MAIN, "UP", x + 231, y + 9, "#65DA41", { scale: 2 }); tri(ga, x + 264, y + 15, -1, "#65DA41"); }
  if (dn > 0) { const ga = fade(c, a * dn); ga.text(MAIN, "DOWN", x + 232, y + 10, "#0B0812", { scale: 2 }); ga.text(MAIN, "DOWN", x + 231, y + 9, "#F4CA50", { scale: 2 }); tri(ga, x + 290, y + 15, 1, "#F4CA50"); }
  // the profile: ground line, runways, path (done = solid + fill, to come = dotted), the jet
  const px0 = x + 18, px1 = x + w - 18, gy = y + h - 12, top = y + 40, PX = (u) => px0 + (px1 - px0) * u, PY = (tt) => gy - (gy - top) * alt(tt);
  g.rect(x + 8, gy + 1, w - 16, 1, "#3B5070");
  for (const rx0 of [px0 - 8, px1 - 30]) { g.rect(rx0, gy + 1, 38, 2, "#6A7A96"); for (let k = 0; k < 38; k += 6) g.rect(rx0 + k, gy + 1, 3, 1, "#D8E0EE"); }
  const uNow = pathU(t);
  let prev = null;
  for (let X = R(px0); X <= R(px1); X++) {
    const u = (X - px0) / (px1 - px0), Y = R(PY(timeAt(u)));
    if (u <= uNow) {
      for (let yy = Y + 2; yy <= gy; yy++) blend(c, X, yy, CY, 0.32 * (1 - (yy - Y) / (gy - top + 4)) + 0.06, a, 3);
      const y0 = prev == null ? Y : Math.min(Y, prev), y1 = prev == null ? Y : Math.max(Y, prev);
      for (let yy = y0; yy <= y1; yy++) { put(c, X, yy, CY, a); put(c, X, yy + 1, CYD, a); }
    } else if (X % 4 === 0) put(c, X, Y, rgb("#5A7090"), a);
    prev = Y;
  }
  // the jet on the path, nose along the slope
  const tt = timeAt(uNow), jx = PX(uNow), jy = PY(tt) - 3, du = 0.01, slope = (PY(timeAt(Math.min(1, uNow + du))) - PY(timeAt(Math.max(0, uNow - du)))) / ((px1 - px0) * 2 * du), ang = Math.atan(slope);
  jet(c, jx, jy, ang, a);
}
/** Small triangle centred at (x, y): dir −1 points up, +1 points down. */
function tri(g, x, y, dir, col) { for (let j = 0; j < 5; j++) { const half = dir < 0 ? j : 4 - j; g.rect(x - half, y - 2 + j, half * 2 + 1, 1, col); } }
/** A tiny side-view jet (≈ 18 px) centred at (x, y), rotated by ang (radians, + = nose down). */
function jet(c, x, y, ang, a) {
  const ca = Math.cos(ang), sa = Math.sin(ang), P = (u, v) => [x + u * ca - v * sa, y + u * sa + v * ca];
  const g = fade(c, a);
  const body = [P(-9, -1.5), P(6, -2), P(9, -0.5), P(9.5, 1), P(7, 2), P(-8, 2)], fin = [P(-9, -1), P(-11, -6), P(-8, -6), P(-5, -1.5)], wing = [P(2, 1), P(-4, 5), P(-6, 5), P(-2, 1)];
  const out = (pts) => pts.map(([px, py]) => [px, py]);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { for (const s of [body, fin, wing]) g.poly(out(s).map(([px, py]) => [px + dx, py + dy]), "#0B0812"); }
  g.poly(fin, "#B08AE8"); g.poly(body, "#FDFEED"); g.poly(wing, "#8D59DA");
  const w1 = P(3, -0.5); g.px(R(w1[0]), R(w1[1]), "#2A3A5A"); const w2 = P(0, -0.5); g.px(R(w2[0]), R(w2[1]), "#2A3A5A"); const w3 = P(-3, -0.5); g.px(R(w3[0]), R(w3[1]), "#2A3A5A");
}
