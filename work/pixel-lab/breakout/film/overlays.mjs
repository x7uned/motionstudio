// Explainer overlays above the tube (our usual cards, not part of the game picture): the "1/2" paddle tags, the FAST
// FORWARD pill, "ORANGE / RED = TOP", "FASTEST BALL / SMALLEST PADDLE", the four-part paddle card (two balls from
// different angles hit the same part and leave the same way), "PLASTIC STRIPS", "WALL 2" and the big "896 MAX".
import { fade, mix, MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { C, panel, tag } from "./cute.mjs";
import { F, ZONE_DEG } from "./sim.mjs";
import { EV, FF1, STRIPS, CARD4, MAXT, CUT, BUILD2, CLEAR2, SEG3, sm, ease } from "./timeline.mjs";
import * as G from "./game.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const win = (t, a, b, fi = 0.25, fo = 0.25) => Math.min(sm(t, a, a + fi), 1 - sm(t, b - fo, b));
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

function pill(c, text, cx, y, a, col = C.Y) {
  if (a <= 0) return; const g = fade(c, a), w = c.measure(MAIN, text, { scale: 2 }) + 20, x = R(cx - w / 2);
  g.rrect(x, y, w, 22, col, 2); g.rrect(x + 2, y + 2, w - 4, 18, C.CARD, 2); g.text(MAIN, text, x + 10, y + 5, col, { scale: 2 });
}
/** A tag that pops in with a small overshoot (rises 6 px) and dissolves out. */
function popTag(c, lines, cx, y, t, a0, a1, col = C.Y, scale = 2) {
  const a = win(t, a0, a1, 0.22, 0.25); if (a <= 0) return; const k = back((t - a0) / 0.32); tag(c, lines, cx, R(y + (1 - k) * 6), a, col, scale);
}

// ---------------------------------------------------------------- the four-part paddle card
const CD = { x: 48, y: 432, w: 384, h: 150 }, BIG = { x: 128, y: 556, w: 224, h: 12 };
const SEGC = ["#7FE3F0", "#65DA41", "#F4CA50", "#E03056"];
const segX = (i) => BIG.x + (i + 0.5) * (BIG.w / 4);
const dir = (i) => { const a = (ZONE_DEG[i] * Math.PI) / 180; return [Math.sin(a), -Math.cos(a)]; };
const HIT = { seg: 2, x: segX(2) - 8, y: BIG.y - 8 };
const SHOTS = [
  { from: [HIT.x - 150, CD.y + 22], in: [EV.part - 0.05, EV.hits2], out: [EV.hits2 + 0.02, EV.next1 + 0.1] },
  { from: [HIT.x + 70, CD.y + 18], in: [EV.not1 - 0.15, EV.came + 0.05], out: [EV.came + 0.07, EV.in2 + 0.45] },
];
function card4(c, t) {
  const a = win(t, CARD4.in, CARD4.out, 0.3, 0.3); if (a <= 0) return; const g = fade(c, a), k = back((t - CARD4.in) / 0.35);
  const dy = R((1 - k) * 12);
  panel(c, CD.x, CD.y + dy, CD.w, CD.h, a, C.Y);
  g.text(MAIN, "4 PARTS", CD.x + 12, CD.y + 10 + dy, C.Y, { scale: 2 });
  // the big paddle: white, then it divides into four coloured parts
  for (let i = 0; i < 4; i++) {
    const s = sm(t, EV.four - 0.05 + i * 0.1, EV.four + 0.25 + i * 0.1), x0 = R(BIG.x + (i * BIG.w) / 4), w = R(BIG.w / 4);
    const hl = SHOTS.reduce((m, sh) => Math.max(m, Math.max(0, 1 - Math.abs(t - sh.in[1]) / 0.35)), 0) * (i === HIT.seg ? 1 : 0);
    const col = mix(mix("#E9EEE8", SEGC[i], s), "#FFFFFF", hl * 0.6);
    g.rect(x0 + (s > 0.5 ? 1 : 0), BIG.y + dy, w - (s > 0.5 ? 2 : 0), BIG.h, col); g.rect(x0 + 1, BIG.y + BIG.h - 2 + dy, w - 2, 2, mix(col, "#000000", 0.35));
    // the part's fixed direction
    const ga = sm(t, EV.four + 0.15 + i * 0.12, EV.four + 0.6 + i * 0.12); if (ga <= 0) continue;
    const [ux, uy] = dir(i), L = 62 * ease(ga), sx = segX(i), sy = BIG.y - 4 + dy;
    for (let q = 0; q < L; q += 1) { if (q % 6 > 3) continue; g.rect(R(sx + ux * q), R(sy + uy * q), 2, 2, SEGC[i]); }
    if (ga > 0.6) { const hx = sx + ux * L, hy = sy + uy * L, px = -uy, py = ux; for (let s2 = 0; s2 < 6; s2++) { g.rect(R(hx - ux * s2 + px * s2 * 0.7), R(hy - uy * s2 + py * s2 * 0.7), 2, 2, SEGC[i]); g.rect(R(hx - ux * s2 - px * s2 * 0.7), R(hy - uy * s2 - py * s2 * 0.7), 2, 2, SEGC[i]); } }
  }
  // two balls from different angles hit the same part and leave the same way
  for (const [n, sh] of SHOTS.entries()) {
    const kin = clamp01((t - sh.in[0]) / (sh.in[1] - sh.in[0])), kout = clamp01((t - sh.out[0]) / (sh.out[1] - sh.out[0]));
    if (t < sh.in[0]) continue;
    const ia = 1;
    // the incoming path stays as a faint dotted line
    const [fx, fy] = sh.from, len = Math.hypot(HIT.x - fx, HIT.y - fy);
    for (let q = 0; q < len * kin; q += 5) { const u = q / len; g.rect(R(fx + (HIT.x - fx) * u) + 3, R(fy + (HIT.y - fy) * u) + 3 + dy, 2, 2, n ? "#B08AE8" : "#959595"); }
    const [ux, uy] = dir(HIT.seg), OUT = 74;
    let bx, by; if (kout <= 0) { bx = fx + (HIT.x - fx) * kin; by = fy + (HIT.y - fy) * kin; } else { bx = HIT.x + ux * OUT * kout; by = HIT.y + uy * OUT * kout; }
    if (kout > 0) for (let q = 0; q < OUT * kout; q += 4) g.rect(R(HIT.x + ux * q) + 3, R(HIT.y + uy * q) + 3 + dy, 2, 2, SEGC[HIT.seg]);
    const ba = (1 - sm(t, sh.out[1], sh.out[1] + 0.3)) * ia; if (ba <= 0) continue;
    const gb = fade(c, a * ba); gb.rect(R(bx), R(by) + dy, 8, 8, "#FFFFFF"); gb.rect(R(bx) - 1, R(by) + 1 + dy, 1, 6, "#959595"); gb.rect(R(bx) + 8, R(by) + 1 + dy, 1, 6, "#959595");
  }
  // "same part → same way" mark when the second ball has left
  const sa = sm(t, EV.in2 - 0.1, EV.in2 + 0.2); if (sa > 0) fade(c, a * sa).text(MAIN, "SAME WAY", CD.x + CD.w - 12 - c.measure(MAIN, "SAME WAY", { scale: 2 }), CD.y + 10 + dy, C.IV, { scale: 2 });
}

// ---------------------------------------------------------------- 896 MAX
function maxScore(c, t) {
  const a = sm(t, MAXT.in, MAXT.in + 0.35); if (a <= 0) return; const k = back((t - MAXT.in) / 0.4), s = 9, txt = "896", w = c.measure(MAIN, txt, { scale: s }), x = R(240 - w / 2), y = R(352 + (1 - k) * 10);
  const g = fade(c, a); for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [3, 3]]) g.text(MAIN, txt, x + dx, y + dy, C.O, { scale: s });
  g.text(MAIN, txt, x, y, null, { scale: s, colorAt: (X, Y) => (Y < y + 18 ? "#FFF6C8" : Y < y + 40 ? C.Y : "#F59A3A") });
  popTag(c, ["MAX"], 240, 426, t, MAXT.max, 99, C.Y, 2);
}

export function drawOverlays(c, t) {
  // serve 1: the paddle halves on the breakout; serve 2: again, on "smallest"
  for (const [s0, s1] of [[G.SHRINK1 + 0.05, G.LOST1 + 0.2], [G.SHRINK2 + 0.05, EV.aim + 0.3]]) popTag(c, ["1/2"], Math.max(70, Math.min(410, G.paddleX(Math.min(t, s1)))), F.PY - 36, t, s0, s1, C.Y, 2);
  // fast-forward pills
  pill(c, ">> FAST", 240, 154, win(t, FF1.a + 2.95, FF1.b - 0.05, 0.2, 0.25), C.CY);
  pill(c, ">> FAST", 240, 154, win(t, CUT - 0.05, SEG3 + 0.15, 0.2, 0.25), C.CY);
  // speed rules
  popTag(c, ["ORANGE / RED", "= TOP SPEED"], 240, 440, t, G.ORANGE_T + 0.05, EV.so1 - 0.05, C.OR, 2);
  popTag(c, ["FASTEST BALL"], 240, 440, t, EV.fastest - 0.1, EV.but + 0.2, C.PK, 2);
  popTag(c, ["SMALLEST PADDLE"], 240, 472, t, G.SHRINK2 + 0.05, EV.but + 0.2, C.PK, 2);
  card4(c, t);
  popTag(c, ["PLASTIC STRIPS"], 240, 440, t, STRIPS.tag[0], STRIPS.tag[1], C.Y, 2);
  popTag(c, ["WALL 2"], 240, 440, t, BUILD2[0] + 0.1, CLEAR2[0] + 0.1, C.CY, 2);
  maxScore(c, t);
}
