// «You're not ugly» — small in-world props of the room (Builder ROOM): YOUR phone (lilac case with a star sticker, so it
// reads as the same phone when it floats over to the friend), pixel hearts, the measuring tag, the dotted dimension line,
// the talk rings and bone pulses, little sparkles. All take an existence `a` (0..1, dithered) — nothing pops in one frame.
import { Canvas, mix, bayer, fade, MAIN, TINY } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), PI = Math.PI;
export const INK = "#0B0812";

/**
 * The phone. (x, y) = centre (screen), ang = in-plane rotation (0 = upright), turn −1..1 (−1 screen to camera, 0 edge-on,
 * +1 back to camera), s = size factor (1 ≈ 9 × 17 px), o.rec 0..1 (red LED on the back), o.glow 0..1 (screen glow).
 */
export function drawPhone(c, x, y, ang = 0, turn = 0.6, s = 1, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const g = a < 1 ? fade(c, a) : c, H = 8.5 * s, half = Math.max(1.2, 4.6 * s * Math.abs(turn)), edge = 1.3 * s, back = turn >= 0;
  const ca = Math.cos(ang), sa = Math.sin(ang), ext = Math.ceil(H + half + edge + 3);
  for (let Y = R(y - ext); Y <= R(y + ext); Y++) for (let X = R(x - ext); X <= R(x + ext); X++) {
    const dx = X + 0.5 - x, dy = Y + 0.5 - y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;   // u across, v along (down)
    // the slab = the face (|u| ≤ half) plus the edge strip on the side away from the light (u from half to half + edge)
    const corner = (uu, hw) => { const cx = Math.max(0, Math.abs(uu) - (hw - 1.6 * s)), cy = Math.max(0, Math.abs(v) - (H - 1.6 * s)); return Math.hypot(cx, cy) <= 1.6 * s + 0.01; };
    const inFace = Math.abs(u) <= half && Math.abs(v) <= H && corner(u, half);
    const ue = u - half, inEdge = !inFace && ue > 0 && ue <= edge && Math.abs(v) <= H - 0.6 && corner(u - edge * 0.5, half + edge);
    if (!inFace && !inEdge) {
      // dark outline ring
      const d1 = Math.abs(u) <= half + edge + 1 && Math.abs(v) <= H + 1;
      if (d1) g.px(X, Y, INK);
      continue;
    }
    if (inEdge) { g.px(X, Y, back ? "#5A3E8A" : "#2A2440"); continue; }
    const fu = (u + half) / (2 * half), fv = (v + H) / (2 * H);
    if (back) {
      let col = fu < 0.18 ? "#E0CDF8" : fu > 0.85 ? "#8D59DA" : "#B08AE8";
      if (fv < 0.32 && fu < 0.62 && fu > 0.12 && fv > 0.06 && half > 2.4) col = "#2A2440";                  // camera block
      if (half > 2.4 && Math.hypot(fu - 0.32, fv - 0.15) < 0.09) col = "#7FE3F0";
      if (half > 2.4 && Math.abs(fu - 0.55) + Math.abs(fv - 0.62) * 0.55 < 0.14) col = "#F4CA50";            // star sticker
      g.px(X, Y, col);
    } else {
      const gl = o.glow ?? 1, scr = fv < 0.06 || fv > 0.94 || fu < 0.08 || fu > 0.92 ? "#141022" : mix("#3A5A9A", "#BFEFFF", clamp01(0.35 + 0.6 * gl * (1 - fv * 0.5)));
      let col = scr; if (half > 2.6 && Math.hypot(fu - 0.5, fv - 0.42) < 0.2) col = Math.hypot(fu - 0.5, fv - 0.33) < 0.12 ? "#8D59DA" : "#E6AD8A";   // a tiny face (you) on the screen
      g.px(X, Y, col);
    }
  }
  if ((o.rec ?? 0) > 0 && back && half > 2) {   // red LED next to the lens
    const lx = x + (-0.2 * half) * ca - (-H * 0.42) * sa, ly = y + (-0.2 * half) * sa + (-H * 0.42) * ca, k = o.rec;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const d = Math.hypot(dx, dy); if (d > 1.3 && d < 3.4 && k * (1 - d / 3.4) * 1.2 > bayer(R(lx) + dx, R(ly) + dy)) g.px(R(lx) + dx, R(ly) + dy, "#FF6A6A"); }
    if (k > 0.2) { g.px(R(lx), R(ly), k > 0.6 ? "#FFE0E0" : "#FF3A4A"); g.px(R(lx) + 1, R(ly), "#E8203A"); g.px(R(lx), R(ly) + 1, "#E8203A"); g.px(R(lx) + 1, R(ly) + 1, "#B0102A"); }
  }
}

/** A pixel heart of size s (1 ≈ 9 × 8 px) centred at (x, y). */
const HEART = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."];
export function heart(c, x, y, s = 1, a = 1, col = "#F27A9A") {
  if (a <= 0) return; const g = fade(c, a), k = Math.max(1, R(s)), w = 7 * k, h = 6 * k, x0 = R(x - w / 2), y0 = R(y - h / 2);
  const on = (i, j) => j >= 0 && j < 6 && i >= 0 && i < 7 && HEART[j][i] === "#";
  for (let j = -1; j <= 6; j++) for (let i = -1; i <= 7; i++) {
    const inside = on(i, j); if (!inside && !(on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) continue;
    const cc = !inside ? INK : (i === 1 && j === 1) || (i === 2 && j === 1 && k === 1) ? "#FFFFFF" : j >= 3 ? mix(col, "#9C2A4C", 0.35) : col;
    g.rect(x0 + i * k, y0 + j * k, k, k, cc);
  }
}

/** Little four-point sparkle. */
export function sparkle(c, x, y, r, a = 1, col = "#FFF2B8") {
  if (a <= 0) return; const g = fade(c, a); x = R(x); y = R(y);
  for (let i = -r; i <= r; i++) { const cc = Math.abs(i) <= 1 ? "#FFFFFF" : col; g.px(x + i, y, cc); g.px(x, y + i, cc); }
}

/** Tag: dark pill with a 2-px text (scale s) in `col`; (cx, y) = top centre. */
export function pill(c, text, cx, y, a = 1, col = "#F4CA50", s = 2) {
  if (a <= 0) return null; const g = fade(c, a), tw = c.measure(MAIN, text, { scale: s }), w = tw + 12, h = 7 * s + 8, x0 = R(cx - w / 2), y0 = R(y);
  g.rrect(x0 - 1, y0 - 1, w + 2, h + 2, INK, 2); g.rrect(x0, y0, w, h, "#2A1F40", 2); g.rect(x0 + 2, y0 + 1, w - 4, 1, "#4A3A6A");
  g.text(MAIN, text, x0 + 6, y0 + 5, INK, { scale: s }); g.text(MAIN, text, x0 + 6, y0 + 4, col, { scale: s });
  return { x: x0, y: y0, w, h };
}

/** Dotted dimension line from p to q (screen), drawn up to fraction `grow`, with end ticks. */
export function dimLine(c, p, q, a = 1, grow = 1, col = "#FDFEED") {
  if (a <= 0 || grow <= 0) return; const g = fade(c, a), dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const n = Math.floor(L * grow);
  for (let i = 0; i <= n; i++) { if (i % 4 >= 2) continue; const X = R(p[0] + ux * i), Y = R(p[1] + uy * i); g.px(X + 1, Y + 1, INK); g.px(X, Y, col); }
  const tick = (P) => { for (let k = -4; k <= 4; k++) { const X = R(P[0] + nx * k), Y = R(P[1] + ny * k); g.px(X + 1, Y + 1, INK); g.px(X, Y, col); } };
  tick(p); if (grow >= 1) tick(q);
}

/** A sound arc ")" opening toward dir (+1 right / −1 left) at (x, y), radius r. */
export function arc(c, x, y, r, dir = 1, a = 1, col = "#7FE3F0", span = 0.95, bold = false) {
  if (a <= 0 || r < 1) return; const g = fade(c, a), n = Math.ceil(r * 4);
  if (bold) for (let i = 0; i <= n; i++) { const t = -span + (2 * span * i) / n, X = R(x + dir * Math.cos(t) * (r + 1.5)), Y = R(y + Math.sin(t) * (r + 1.5)); g.px(X, Y, INK); g.px(X, Y + 1, INK); }
  for (let i = 0; i <= n; i++) { const t = -span + (2 * span * i) / n, X = R(x + dir * Math.cos(t) * r), Y = R(y + Math.sin(t) * r); g.px(X, Y, col); g.px(X + dir, Y, bold ? col : mix(col, "#FFFFFF", 0.4)); if (bold) g.px(X - dir, Y, mix(col, "#FFFFFF", 0.5)); }
}
/** A full ring (bone pulse) around (x, y). */
export function ring(c, x, y, r, a = 1, col = "#F59A3A") {
  if (a <= 0 || r < 1) return; const g = fade(c, a), n = Math.ceil(r * 6.4);
  for (let i = 0; i < n; i++) { const t = (2 * PI * i) / n; g.px(R(x + Math.cos(t) * r), R(y + Math.sin(t) * r), col); }
}
/** "REC" label with a red dot, (x, y) = top-left. */
export function recLabel(c, x, y, a = 1, pulse = 1) {
  if (a <= 0) return; const g = fade(c, a);
  g.rrect(R(x) - 1, R(y) - 1, 25, 10, INK, 1); g.rrect(R(x), R(y), 23, 8, "#2A1018", 1);
  const dc = mix("#7A1020", "#FF3A4A", pulse); g.rect(R(x) + 2, R(y) + 2, 4, 4, dc); g.px(R(x) + 2, R(y) + 2, mix(dc, "#FFFFFF", 0.4 * pulse));
  g.text(TINY, "REC", R(x) + 8, R(y) + 2, "#FFD8D8");
}
export { Canvas };
