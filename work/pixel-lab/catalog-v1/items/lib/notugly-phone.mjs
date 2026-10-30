// catalog-v1 copy (2026-10-26) of work/pixel-lab/not-ugly/film/levels/room-props.mjs drawPhone; changes: o.on 0..1 turns the
// screen on from a dark glass (dithered crossfade), the screen gradient is quantised to 4 dithered bands (house style), the
// dark outline follows the rounded corners (the film's square ring showed at large sizes), the film's tiny face on the
// screen is removed (hero identity), o.torch 0..1 lights the camera LED on the back with the dithered flash glow of
// work/pixel-lab/cat-eyes/film/cat.mjs phone (glow strength scaled by o.a); import path fixed.
import { mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
export const INK = "#0B0812";

/**
 * The phone. (x, y) = centre (screen), ang = in-plane rotation (0 = upright), turn −1..1 (−1 screen to camera, 0 edge-on,
 * +1 back to camera), s = size factor (1 ≈ 9 × 17 px), o.rec 0..1 (red LED on the back), o.glow 0..1 (screen glow),
 * o.on 0..1 (screen on), o.torch 0..1 (camera LED on the back).
 */
export function drawPhone(c, x, y, ang = 0, turn = 0.6, s = 1, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const g = a < 1 ? fade(c, a) : c, H = 8.5 * s, half = Math.max(1.2, 4.6 * s * Math.abs(turn)), edge = 1.3 * s, back = turn >= 0;
  const ca = Math.cos(ang), sa = Math.sin(ang), ext = Math.ceil(H + half + edge + 3), on = clamp01(o.on ?? 1), rr = 1.6 * s;
  for (let Y = R(y - ext); Y <= R(y + ext); Y++) for (let X = R(x - ext); X <= R(x + ext); X++) {
    const dx = X + 0.5 - x, dy = Y + 0.5 - y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;   // u across, v along (down)
    // the slab = the face (|u| ≤ half) plus the edge strip on the side away from the light (u from half to half + edge)
    const corner = (uu, hw) => { const cx = Math.max(0, Math.abs(uu) - (hw - 1.6 * s)), cy = Math.max(0, Math.abs(v) - (H - 1.6 * s)); return Math.hypot(cx, cy) <= 1.6 * s + 0.01; };
    const inFace = Math.abs(u) <= half && Math.abs(v) <= H && corner(u, half);
    const ue = u - half, inEdge = !inFace && ue > 0 && ue <= edge && Math.abs(v) <= H - 0.6 && corner(u - edge * 0.5, half + edge);
    if (!inFace && !inEdge) {
      // dark outline ring (catalog: rounded like the slab)
      const uc = u - edge / 2, hw = half + edge / 2 + 1.2, qx = Math.max(0, Math.abs(uc) - (hw - rr)), qy = Math.max(0, Math.abs(v) - (H + 1.2 - rr));
      if (Math.abs(uc) <= hw && Math.abs(v) <= H + 1.2 && Math.hypot(qx, qy) <= rr + 0.01) g.px(X, Y, INK);
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
      const gl = o.glow ?? 1, bez = fv < 0.06 || fv > 0.94 || fu < 0.08 || fu > 0.92;
      if (bez) { g.px(X, Y, "#141022"); continue; }
      const lv = clamp01(0.35 + 0.6 * gl * (1 - fv * 0.5)) * 4, lo = Math.floor(lv), q = (lv - lo > bayer(X, Y) ? lo + 1 : lo) / 4;
      // dark glass: a faint diagonal reflection band (the film's "off" look of the ping monitor)
      const off = (fu * 0.6 - fv * 0.8 > -0.1 && fu * 0.6 - fv * 0.8 < -0.02 && bayer(X, Y) > 0.6) ? "#262238" : "#1A1630";
      g.px(X, Y, on >= 1 || on > bayer(X + 1, Y + 2) ? mix("#3A5A9A", "#BFEFFF", q) : off);
    }
  }
  if ((o.rec ?? 0) > 0 && back && half > 2) {   // red LED next to the lens
    const lx = x + (-0.2 * half) * ca - (-H * 0.42) * sa, ly = y + (-0.2 * half) * sa + (-H * 0.42) * ca, k = o.rec;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const d = Math.hypot(dx, dy); if (d > 1.3 && d < 3.4 && k * (1 - d / 3.4) * 1.2 > bayer(R(lx) + dx, R(ly) + dy)) g.px(R(lx) + dx, R(ly) + dy, "#FF6A6A"); }
    if (k > 0.2) { g.px(R(lx), R(ly), k > 0.6 ? "#FFE0E0" : "#FF3A4A"); g.px(R(lx) + 1, R(ly), "#E8203A"); g.px(R(lx), R(ly) + 1, "#E8203A"); g.px(R(lx) + 1, R(ly) + 1, "#B0102A"); }
  }
  // camera LED / torch on the back (cat-eyes phone flash: dithered radial glow toward white), only while the back faces us
  const tk = clamp01(o.torch ?? 0) * clamp01(turn * 3) * a;
  if (tk > 0.01) {
    const u = (0.32 * 2 - 1) * half, v = (0.15 * 2 - 1) * H, lx = x + u * ca - v * sa, ly = y + u * sa + v * ca, rad = (o.flashR ?? 46) * Math.max(0.4, s / 10);
    for (let Y = R(ly - rad); Y <= R(ly + rad); Y++) for (let X = R(lx - rad); X <= R(lx + rad); X++) { const d = Math.hypot(X - lx, Y - ly) / rad; if (d < 1 && (1 - d) ** 1.5 * tk > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), "#FFFFFF", 0.5 + 0.5 * tk)); }
    const lr = Math.max(1, 0.4 * s) * Math.min(1, tk * 2);
    if (lr > 0.6) c.disc(R(lx), R(ly), lr, "#FFF6D8");
  }
}
