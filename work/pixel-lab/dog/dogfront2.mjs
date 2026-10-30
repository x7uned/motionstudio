// Front-facing Labrador v2 (smooth parts + volume shading). Origin = base of the neck; head group turned by a.
import { fade } from "../../../renderer/pixel/raster.mjs";
import { smooth, drawPart, FUR } from "./shade.mjs";

const HEADF = [[0, -33], [9, -32.5], [15.5, -29], [18, -22], [17, -15], [14, -9], [11, -4], [9, 1], [5, 4], [0, 5], [-5, 4], [-9, 1], [-11, -4], [-14, -9], [-17, -15], [-18, -22], [-15.5, -29], [-9, -32.5]];
const MUZ = [[0, -16], [6, -15], [10, -10], [10.5, -3], [8.5, 3], [4, 6.5], [0, 7], [-4, 6.5], [-8.5, 3], [-10.5, -3], [-10, -10], [-6, -15]];
const NOSE = [[0, -11], [4.5, -10.5], [5.5, -7.5], [3, -5], [0, -4], [-3, -5], [-5.5, -7.5], [-4.5, -10.5]];
const CHEST = [[0, -4], [9, -2], [15, 6], [17, 18], [15, 30], [10, 40], [4, 45], [0, 46], [-4, 45], [-10, 40], [-15, 30], [-17, 18], [-15, 6], [-9, -2]];
const BACKB = [[-27, 22], [-25, 10], [-17, 2], [-10, -4], [10, -4], [17, 2], [25, 10], [27, 22], [24, 34], [12, 40], [-12, 40], [-24, 34]];
const leg = (x) => [[x - 4, 36], [x + 4, 36], [x + 4.5, 58], [x + 5.5, 64], [x + 5.5, 67.5], [x - 5.5, 67.5], [x - 5.5, 64], [x - 4.5, 58]];
const DARK = "#2A1608";
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

export function drawDogFront2(g0, cx, cy, s, { a = 0.3, flap = 1, alpha = 1, light = [0, -1], litOutline = null, bodyToo = true } = {}) {
  const g = alpha < 1 ? fade(g0, alpha) : g0, R = Math.round;
  const P = ([x, y]) => [cx + x * s, cy + y * s];
  const Hd = ([x, y]) => { const [rx, ry] = rot(x, y - 2, a); return [cx + rx * s, cy + (ry + 2) * s]; };
  const opt = { light, litOutline, outline: DARK };
  if (bodyToo) {
    drawPart(g, [smooth(BACKB.map(P))], { ...opt, base: 2.6, gain: 1.4, thick: 8 * s });
    for (const x of [-9, 9]) drawPart(g, [smooth(leg(x).map(P), new Set([4, 5]))], { ...opt, base: 3.2, gain: 1.4, slope: 0.8, thick: 3 * s });
    for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1, yy = 6 + (i >> 1) * 7, bx = side * (24 - (i >> 1) * 0.8), tx = side * (26.5 - (i >> 1) * 0.5), ty = yy + 2 + (i % 3);
      const by = yy;
      drawPart(g, [[P([bx, by - 2]), P([bx, by + 2]), P([tx, ty])]], { ...opt, base: 2.8, gain: 0.3, thick: 2 * s, rimLit: 0.3, rimShade: 0.2 }); }
    drawPart(g, [smooth(CHEST.map(P))], { ...opt, base: 3.6, gain: 2.0, slope: 1.2, thick: 9 * s });
  }
  // ears flung sideways (behind the head), one higher than the other
  for (const side of [-1, 1]) {
    const up = side * Math.sin(a) * 6 + 7 * flap, ear = [[13, -30], [25, -33 - up * 0.4], [37, -33 - up], [43, -29 - up], [39, -24 - up * 0.6], [27, -21], [16, -19]].map(([x, y]) => [side * x, y]);
    drawPart(g, [smooth(ear.map(Hd))], { ...opt, base: 2.3, gain: 1.4, thick: 4 * s });
  }
  drawPart(g, [smooth(HEADF.map(Hd))], { ...opt, base: 3.6, gain: 2.2, slope: 1.0, thick: 10 * s });
  drawPart(g, [smooth(MUZ.map(Hd))], { ...opt, base: 4.4, gain: 1.4, slope: 0.6, thick: 5 * s, rimShade: 0.6 });
  drawPart(g, [smooth(NOSE.map(Hd))], { ramp: ["#0A0402", "#120804", "#1A0E06", "#2A1A10", "#4A3A34"], base: 1.8, gain: 1.6, thick: 2 * s, outline: "#0A0402", light });
  { const [x, y] = Hd([-1.5, -9.8]); g.rect(R(x), R(y), Math.max(1, R(s * 0.8)), 1, "#7A6A60"); }
  for (const side of [-1, 1]) {
    { const [sx, sy] = Hd([side * 7.5, -20]); g.tint(R(sx - 4 * s), R(sy - 3 * s), R(8 * s), R(6 * s), (px, py) => Math.max(0, 0.32 - Math.hypot(px - sx, (py - sy) * 1.3) / (4.5 * s)), FUR[1], 3); }
    const [ex, ey] = Hd([side * 7.5, -20]), r = Math.max(1, R(1.5 * s)); g.disc(R(ex), R(ey), r + 1, DARK); g.disc(R(ex), R(ey), r, "#1A0E06"); g.px(R(ex - r / 2), R(ey - r / 2), "#FDFEED");
    const [b0x, b0y] = Hd([side * 4.5, -24.5]), [b1x, b1y] = Hd([side * 10.5, -23.5]); g.line(R(b0x), R(b0y), R(b1x), R(b1y), FUR[6]);
    // flews swinging out with the shake
    const fl = [[side * 6, 2], [side * 10, -1], [side * (13 + 3 * flap), 5], [side * 7, 7]];
    drawPart(g, [smooth(fl.map(Hd))], { ...opt, base: 3.4, gain: 0.8, thick: 2 * s });
  }
  { const [x0, y0] = Hd([-4.5, 2.5]), [x1, y1] = Hd([0, 4]), [x2, y2] = Hd([4.5, 2.5]); g.line(R(x0), R(y0), R(x1), R(y1), FUR[1]); g.line(R(x1), R(y1), R(x2), R(y2), FUR[1]); }
}
