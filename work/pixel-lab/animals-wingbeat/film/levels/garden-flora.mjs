// LV3/LV4 garden + pond painters (draw through any canvas-like g: a Layer.g, a sprite canvas or the frame).
// Cosmos, zinnias, lavender, hollyhocks, hydrangea and rose bushes, a picket fence with a gate, a mint garden shed,
// an apple tree and a watering can — flat tone bands with Bayer dithering, dark outlines, light from the upper left.
// Everything is deterministic (rnd(seed)), no clock.
import { blob, ell, tube, bez, rnd, mix, bayer } from "../cute.mjs";
import { leafBall } from "./meadow-kit.mjs";

const R = Math.round;
export const PETALS = {
  pink: ["#6A1040", "#A01E5E", "#D23E84", "#EE66A6", "#F98EC2", "#FFB8D8", "#FFE0EE"],
  white: ["#5E5470", "#8E86A2", "#BEB8CC", "#DCD8E6", "#F0EEF6", "#FFFFFF", "#FFFFFF"],
  magenta: ["#4A0636", "#7A0E58", "#AE1C7E", "#D0349C", "#E85CB8", "#F48ED2", "#FCC0E8"],
  orange: ["#5A1A04", "#962E08", "#D04E10", "#F2701E", "#FF9234", "#FFB45A", "#FFD490"],
  scarlet: ["#4E0610", "#880E1E", "#BE1E2C", "#E23A3C", "#F4645A", "#FF9282", "#FFC4B4"],
  yellow: ["#5A3A04", "#946208", "#CC9010", "#F0B820", "#FAD040", "#FFE47A", "#FFF4BC"],
  coral: ["#5E1A1A", "#9A3028", "#D04E3C", "#F07254", "#FF9670", "#FFB894", "#FFDCC2"],
  lilac: ["#2A1050", "#44207A", "#6236A2", "#8452C4", "#A476DC", "#C49CEE", "#E2C8FA"],
};
export const LEAF = ["#0E2E14", "#16421C", "#205826", "#2C6E30", "#3C863A", "#52A044", "#6CB852", "#90CE6A"];
const STEM = "#2E6A2A", STEM_D = "#1E4E20";

/** Cosmos: 8 broad notched petals, a deeper ring round the yellow disc. r = petal reach (2..20). */
export function cosmos(g, x, y, r, P = PETALS.pink, seed = 0, tiltY = 1) {
  x = R(x); y = R(y);
  if (r < 3.5) { g.px(x, y, P[4]); g.px(x - 1, y, P[3]); g.px(x + 1, y, P[3]); g.px(x, y - 1, P[5]); g.px(x, y + 1, P[2]); if (r >= 2.5) { g.px(x - 2, y, P[3]); g.px(x + 2, y, P[3]); g.px(x, y - 2, P[4]); } g.px(x, y, "#F8C830"); return; }
  const rot = rnd(seed) * 0.8, n = 8, ry = tiltY;
  for (let Y = R(y - r * ry) - 1; Y <= R(y + r * ry) + 1; Y++) for (let X = R(x - r) - 1; X <= R(x + r) + 1; X++) {
    const dx = X - x, dy = (Y - y) / ry, d = Math.hypot(dx, dy); if (d > r + 0.5) continue;
    const a = Math.atan2(dy, dx) - rot, k = ((a / (2 * Math.PI)) * n % 1 + 1) % 1, off = Math.abs(k - 0.5) * 2;   // 0 at petal centre line … 1 at the gap
    const width = 0.92 - 0.25 * (d / r) ** 3;                         // petal half-width (fraction of the sector), narrower at the tip
    const notch = d > r * 0.84 && Math.abs(off - 0.0) < 0.5 && ((R(off * 6) & 1) === 1);  // little teeth at the petal tip
    if (off > width || notch) continue;
    const edge = off > width - 0.16 || d > r - 0.9;
    let s = d < r * 0.42 ? 2 : d < r * 0.55 ? 3 : 4 + (dx * -0.6 + dy * -0.8 > r * 0.25 ? 1 : 0);
    if (!edge && d > r * 0.5 && off < 0.18 && ((X + Y) & 1) && r > 7) s = Math.max(2, s - 1);   // fine stripe down the petal
    g.px(X, Y, edge ? P[1] : P[Math.min(6, s)]);
  }
  const cr = Math.max(1.4, r * 0.22);
  for (let Y = R(y - cr * ry) - 1; Y <= R(y + cr * ry) + 1; Y++) for (let X = R(x - cr) - 1; X <= R(x + cr) + 1; X++) {
    const d = Math.hypot(X - x, (Y - y) / ry); if (d > cr + 0.3) continue;
    g.px(X, Y, d > cr - 0.8 ? "#9A5A08" : (X - x) + (Y - y) < -cr * 0.3 ? "#FFE880" : ((X * 3 + Y) % 4 === 0 ? "#E8901C" : "#F8C830"));
  }
}

/** Zinnia: two rows of rounded petals and a raised dark cone with a ring of tiny yellow star florets. */
export function zinnia(g, x, y, r, P = PETALS.orange, seed = 0) {
  x = R(x); y = R(y);
  if (r < 3.5) { g.rect(x - 1, y - 1, 3, 3, P[4]); g.px(x, y - 1, P[5]); g.px(x, y, P[1]); return; }
  const rows = [[13, 0.66, 0.36, 0], [11, 0.44, 0.3, 1]];
  for (const [n, dist, pr, row] of rows) {
    const rot = rnd(seed + row) * 1.2;
    for (let k = 0; k < n; k++) {
      const a = rot + (k * 2 * Math.PI) / n, px = x + Math.cos(a) * r * dist, py = y + Math.sin(a) * r * dist * 0.94, rr = r * pr;
      for (let Y = R(py - rr) - 1; Y <= R(py + rr) + 1; Y++) for (let X = R(px - rr) - 1; X <= R(px + rr) + 1; X++) {
        const d = Math.hypot(X - px, Y - py) / rr; if (d > 1) continue;
        const lit = (-(X - px) * 0.6 - (Y - py) * 0.8) / rr, s = (row ? 4 : 3) + (lit > 0.25 ? 1 : 0) + (d < 0.45 && row ? 1 : 0);
        g.px(X, Y, d > 0.82 ? P[1] : P[Math.min(6, s)]);
      }
    }
  }
  const cr = r * 0.24;
  for (let Y = R(y - cr) - 1; Y <= R(y + cr) + 1; Y++) for (let X = R(x - cr) - 1; X <= R(x + cr) + 1; X++) {
    const d = Math.hypot(X - x, Y - y) / cr; if (d > 1.05) continue;
    g.px(X, Y, d > 0.8 ? "#3A1206" : d > 0.55 && ((X + Y) & 1) ? "#FFD84A" : (X - x + Y - y) < -cr * 0.3 ? "#8A3A18" : "#5A220C");
  }
}

/** Lavender: a grey-green stem and a tapering spike of purple bud whorls. h = height, sway shifts the tip. */
export function lavender(g, x, y, h, seed = 0, sway = 0) {
  const top = y - h, spike = h * (0.42 + rnd(seed) * 0.1), lean = (rnd(seed * 3) - 0.5) * h * 0.18 + sway;
  const at = (k) => [x + lean * k * k, y - h * k];
  for (let i = 0; i <= h; i++) { const [sx, sy] = at(i / h); g.px(R(sx), R(sy), i > h - spike ? "#4A5A3A" : "#5E7A4A"); }
  const big = h > 40;
  for (let j = 0; j < spike; j += big ? 3 : 2) {
    const k = (h - spike + j) / h, [sx, sy] = at(k), w = (big ? 3.2 : 2) * (1 - (j / spike) * 0.55);
    for (let X = R(sx - w); X <= R(sx + w); X++) for (let dy = 0; dy < (big ? 3 : 2); dy++) {
      const u = (X - sx) / (w + 0.5); if (Math.abs(u) > 1 || ((X + R(sy) + dy) & 1 && Math.abs(u) > 0.7)) continue;
      g.px(X, R(sy) + dy, u < -0.25 ? "#B496E6" : u > 0.4 ? "#5A3A9A" : dy === 0 ? "#9A74D8" : "#7A56C0");
    }
  }
  g.px(R(at(1)[0]), R(top) - 1, "#7A56C0");
  // two narrow grey leaves at the foot
  for (const s of [-1, 1]) for (let i = 0; i < Math.min(14, h * 0.25); i++) g.px(R(x + s * i * 0.6), R(y - i * 0.9 - 1), "#7A9A6A");
}

/** Hollyhock: tall stem with stacked cup-shaped blooms on alternating sides and buds at the top. */
export function hollyhock(g, x, y, h, P = PETALS.pink, seed = 0) {
  for (let i = 0; i <= h; i++) { const k = i / h; g.px(R(x + Math.sin(k * 3 + seed) * 1.5), y - i, STEM); g.px(R(x + Math.sin(k * 3 + seed) * 1.5) + 1, y - i, STEM_D); }
  for (let i = 0; i < 5; i++) { const ly = y - h * (0.08 + i * 0.07), s = i % 2 ? 1 : -1; leafShape(g, x, ly, s > 0 ? 0.3 : Math.PI - 0.3, 14 - i * 1.5, 6 - i * 0.6, LEAF); }
  const n = 7;
  for (let i = 0; i < n; i++) {
    const k = 0.36 + (i / n) * 0.6, by = y - h * k, s = i % 2 ? 1 : -1, bx = x + s * (4 - k * 2) + Math.sin(k * 3 + seed) * 1.5, rr = 7.5 - i * 0.8;
    if (i >= n - 2) { g.rect(R(bx) - 1, R(by) - 2, 3, 4, P[2]); g.px(R(bx), R(by) - 2, P[4]); g.px(R(bx) - 1, R(by) + 1, STEM); continue; }
    for (let Y = R(by - rr); Y <= R(by + rr); Y++) for (let X = R(bx - rr); X <= R(bx + rr); X++) {
      const d = Math.hypot(X - bx, Y - by) / rr; if (d > 1) continue; const a = Math.atan2(Y - by, X - bx), petal = 0.88 + 0.12 * Math.cos(a * 5 + seed + i);
      if (d > petal) continue; const lit = -(X - bx) * 0.6 - (Y - by) * 0.8;
      g.px(X, Y, d > petal - 0.14 ? P[1] : d < 0.3 ? (d < 0.16 ? "#F8E070" : P[1]) : P[lit > rr * 0.2 ? 5 : d < 0.55 ? 3 : 4]);
    }
  }
}

/** Simple pointed leaf from (x, y) along angle ang: length L, half-width w, ramp (dark → light). */
export function leafShape(g, x, y, ang, L, w, ramp = LEAF) {
  const cs = Math.cos(ang), sn = Math.sin(ang);
  for (let i = 0; i <= L * 2; i++) {
    const u = i / (L * 2), half = Math.sin(Math.PI * u) ** 0.8 * w, px = x + cs * u * L, py = y + sn * u * L - Math.sin(Math.PI * u) * L * 0.12;
    for (let j = -half; j <= half; j += 0.5) { const X = R(px - sn * j), Y = R(py + cs * j); g.px(X, Y, Math.abs(j) > half - 0.8 ? ramp[1] : Math.abs(j) < 0.5 ? ramp[6] : j < 0 ? ramp[5] : ramp[3]); }
  }
}

/** Hydrangea bush: a leafy mound carrying round heads of tiny four-petal florets (blue → violet → pink). */
export function hydrangea(g, x, y, sc = 1, seed = 0) {
  for (const [dx, dy, r] of [[-26, -18, 20], [6, -26, 24], [30, -16, 18], [-8, -40, 18], [18, -44, 16]]) leafBall(g, x + dx * sc, y + dy * sc, r * sc, LEAF, seed + dx, { amp: 0.14, bumps: 9 });
  const HY = [["#2A3A8A", "#4A5EC0", "#6E86E0", "#9AB0F2", "#C8D8FF"], ["#3A2A88", "#5E44BC", "#8466DC", "#A890EE", "#D2C4FA"], ["#7A2A6A", "#B0469A", "#D46CBC", "#EC98D6", "#FCC8EC"]];
  for (let i = 0; i < 7; i++) {
    const hx = x + (rnd(seed + i * 7) - 0.5) * 64 * sc, hy = y - 16 * sc - rnd(seed + i * 11) * 40 * sc, hr = (7 + rnd(seed + i * 3) * 3) * sc, P = HY[i % 3];
    for (let Y = R(hy - hr); Y <= R(hy + hr); Y++) for (let X = R(hx - hr); X <= R(hx + hr); X++) {
      const d = Math.hypot(X - hx, Y - hy) / hr; if (d > 1) continue;
      const fl = ((X >> 1) + (Y >> 1)) & 1, lit = (-(X - hx) * 0.6 - (Y - hy) * 0.8) / hr;
      g.px(X, Y, d > 0.9 ? P[0] : fl ? P[lit > 0.2 ? 4 : 3] : P[lit > 0.2 ? 3 : d > 0.6 ? 1 : 2]);
    }
  }
}

/** Rose bush: leafy mound with small spiral roses. */
export function roseBush(g, x, y, sc = 1, seed = 0, P = PETALS.scarlet) {
  for (const [dx, dy, r] of [[-22, -16, 18], [8, -22, 22], [28, -12, 16], [-4, -38, 16]]) leafBall(g, x + dx * sc, y + dy * sc, r * sc, LEAF, seed + dx * 3, { amp: 0.16, bumps: 8 });
  for (let i = 0; i < 9; i++) { const rx = x + (rnd(seed + i * 5) - 0.5) * 58 * sc, ry = y - 10 * sc - rnd(seed + i * 9) * 40 * sc; rose(g, rx, ry, (3.5 + rnd(i + seed) * 1.5) * sc, P); }
}
export function rose(g, x, y, r, P = PETALS.scarlet) {
  x = R(x); y = R(y);
  for (let Y = R(y - r); Y <= R(y + r); Y++) for (let X = R(x - r); X <= R(x + r); X++) {
    const d = Math.hypot(X - x, Y - y) / r; if (d > 1) continue; const a = Math.atan2(Y - y, X - x), sp = (a / (2 * Math.PI) + d * 1.6) % 1;
    g.px(X, Y, d > 0.86 ? P[1] : sp < 0.18 ? P[1] : (X - x) + (Y - y) < 0 ? P[4] : P[3]);
  }
  g.px(x - 1, y - 1, P[5]);
}

/** White picket fence along y (ground line) from x0 to x1, pickets h tall; gate = [gx0, gx1] (a little gate with a brace). */
export function picketFence(g, x0, x1, y, h, gate = null) {
  const OUT = "#5E5874", LIT = "#FFFFFF", MID = "#F2F0F4", SH = "#C6C2D8", RAIL = "#D8D4E4";
  // rails behind the pickets
  for (const ry of [y - R(h * 0.72), y - R(h * 0.3)]) { for (let x = x0; x <= x1; x++) { if (gate && x > gate[0] && x < gate[1]) continue; g.px(x, ry - 1, OUT); g.px(x, ry, RAIL); g.px(x, ry + 1, RAIL); g.px(x, ry + 2, SH); g.px(x, ry + 3, OUT); } }
  const picket = (px, top, w = 6) => {
    for (let yy = top; yy < y; yy++) {
      const tip = yy - top, half = tip < 3 ? tip : 99;
      for (let xx = 0; xx < w; xx++) {
        const cx = xx - (w - 1) / 2; if (Math.abs(cx) > half + 0.5) continue;
        const edge = xx === 0 || xx === w - 1 || Math.abs(Math.abs(cx) - half) < 0.6 || yy === y - 1;
        g.px(px + xx, yy, edge ? OUT : xx < 2 ? LIT : xx >= w - 2 ? SH : MID);
      }
    }
  };
  for (let x = x0; x <= x1 - 6; x += 10) { if (gate && x + 6 > gate[0] - 3 && x < gate[1] + 3) continue; picket(x, y - h + ((x / 10) & 1 ? 0 : 1)); }
  if (gate) {
    const [a, b] = gate;
    for (const px of [a - 7, b]) { for (let yy = y - h - 8; yy < y; yy++) for (let xx = 0; xx < 7; xx++) g.px(px + xx, yy, xx === 0 || xx === 6 ? OUT : xx < 3 ? LIT : xx > 4 ? SH : MID); for (let dy = -3; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= 9) g.px(px + 3 + dx, y - h - 11 + dy, dx * dx + dy * dy > 6 ? OUT : dx + dy < -1 ? LIT : MID); }
    for (let x = a + 1; x < b - 4; x += 8) picket(x, y - h + 6 + R(Math.abs(x - (a + b) / 2) * -0.15), 5);
    for (let i = 0; i <= b - a - 2; i++) { const yy = R(y - 6 - (i / (b - a)) * (h - 14)); g.px(a + i, yy, OUT); g.px(a + i, yy - 1, MID); }
    for (const ry of [y - h + 10, y - 7]) for (let x = a; x < b; x++) { g.px(x, ry, OUT); g.px(x, ry + 1, MID); g.px(x, ry + 2, OUT); }
  }
}

/** Mint garden shed with a white door, a little window with a flower box and a terracotta roof. (x, y) = bottom-left. */
export function shed(g, x, y, w = 92, h = 64) {
  const WALL = ["#2A4A46", "#3C6660", "#52827A", "#6AA096", "#86BCB0", "#A8D6CA"], ROOF = ["#4A1A12", "#7A2C1C", "#A8402A", "#C8583A", "#E07A54", "#F2A27A"];
  for (let yy = y - h; yy < y; yy++) for (let xx = x; xx < x + w; xx++) {
    const k = xx - x, plank = k % 9 === 0, lit = k < 6 ? 1 : k > w - 10 ? -1 : 0;
    g.px(xx, yy, k === 0 || k === w - 1 ? WALL[0] : plank ? WALL[2] : WALL[3 + lit + (yy < y - h + 6 ? -1 : 0)]);
  }
  // door
  const dx0 = x + R(w * 0.18), dw = 24;
  for (let yy = y - 46; yy < y; yy++) for (let xx = dx0; xx < dx0 + dw; xx++) { const e = xx === dx0 || xx === dx0 + dw - 1 || yy === y - 46; g.px(xx, yy, e ? "#5E5874" : (xx - dx0) % 6 === 0 ? "#D6D2E2" : xx - dx0 < 4 ? "#FFFFFF" : "#EEECF4"); }
  g.rect(dx0 + 18, y - 24, 3, 3, "#E2B040"); g.px(dx0 + 18, y - 24, "#FFF0A0");
  // window + flower box
  const wx = x + R(w * 0.58), wy = y - 46, ww = 24, wh = 18;
  g.rect(wx - 2, wy - 2, ww + 4, wh + 4, "#5E5874"); g.rect(wx - 1, wy - 1, ww + 2, wh + 2, "#FFFFFF");
  for (let yy = wy; yy < wy + wh; yy++) for (let xx = wx; xx < wx + ww; xx++) g.px(xx, yy, (xx - wx) === ww / 2 || (yy - wy) === wh / 2 ? "#FFFFFF" : (xx - wx) + (yy - wy) < 10 ? "#BDE4F6" : "#6AA8D4");
  g.rect(wx - 3, wy + wh + 2, ww + 6, 6, "#7A3A20"); g.rect(wx - 3, wy + wh + 2, ww + 6, 1, "#A85A34");
  for (let i = 0; i < 6; i++) { const fx = wx - 1 + i * 5, fy = wy + wh + 1; g.px(fx, fy - 1, "#3C863A"); g.px(fx + 1, fy - 2, i % 2 ? "#F46A9A" : "#FFE070"); g.px(fx + 2, fy - 1, i % 2 ? "#F46A9A" : "#FFE070"); g.px(fx + 1, fy, "#3C863A"); }
  // roof (pitched, seen from the side: a sloped band with tiles) and its overhang
  const rh = 26;
  for (let i = 0; i <= w + 12; i++) {
    const xx = x - 6 + i, k = i / (w + 12), top = y - h - rh * (1 - Math.abs(k - 0.5) * 2), bot = y - h + 2;
    for (let yy = R(top); yy <= bot; yy++) { const row = (yy - R(top)), tile = (row % 5 === 0) || ((i + (Math.floor((yy - y) / 5) & 1) * 4) % 8 === 0); g.px(xx, yy, yy === R(top) || yy === bot ? ROOF[0] : tile ? ROOF[2] : k < 0.5 ? ROOF[4] : ROOF[3]); }
  }
}

/** Apple tree: short trunk, a round crown from leaf balls with little red apples. (x, y) = trunk foot. */
export function appleTree(g, x, y, sc = 1, seed = 0) {
  const T = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834"];
  for (let yy = y - R(58 * sc); yy < y; yy++) { const w = 4 + (y - yy < 8 ? 2 : 0); for (let xx = -w; xx <= w; xx++) g.px(x + xx, yy, xx === -w || xx === w ? T[0] : xx < 0 ? T[3] : T[2]); }
  for (const [dx, dy, r] of [[-26, -70, 26], [22, -74, 28], [0, -96, 30], [-32, -96, 20], [30, -100, 20], [0, -64, 22]]) leafBall(g, x + dx * sc, y + dy * sc, r * sc, LEAF, seed + dx, { amp: 0.1, bumps: 9 });
  for (let i = 0; i < 14; i++) { const ax = R(x + (rnd(seed + i * 5) - 0.5) * 92 * sc), ay = R(y - 56 * sc - rnd(seed + i * 9) * 64 * sc); g.rect(ax - 1, ay - 1, 3, 3, "#C21E2A"); g.px(ax - 1, ay - 1, "#FF6A5A"); g.px(ax + 1, ay + 1, "#7A0E18"); g.px(ax, ay - 2, "#4A2A16"); }
}

/** Sage-green watering can (side view, spout to the right) with a sprinkler rose. (x, y) = bottom-left of the body. */
export function wateringCan(g, x, y, sc = 1) {
  const SAGE = ["#12302A", "#1E463C", "#2E6052", "#427A6A", "#5A9484", "#78AE9E", "#9CC8BA", "#C8E4DA"];
  const W = 54 * sc, H = 42 * sc, P = (u, v) => [x + u * sc, y - v * sc];
  // spout (behind the body), then the rose
  const sp = bez(P(44, 12), P(66, 22), P(84, 44), 14);
  blob(g, [tube(sp, 5 * sc, 3 * sc)], { ramp: SAGE, base: 3.6, thick: 4, litOutline: SAGE[2], outline: SAGE[0] });
  const [rx, ry] = P(86, 47); blob(g, [ell(rx, ry, 7 * sc, 9 * sc, -0.6)], { ramp: SAGE, base: 3.8, thick: 5, outline: SAGE[0], litOutline: SAGE[2] });
  for (let i = 0; i < 5; i++) g.px(R(rx + 2 + Math.cos(-0.6) * (i - 2) * 2.4), R(ry + Math.sin(-0.6) * (i - 2) * 2.4 + 3), SAGE[1]);
  // handle (arc over the top) and the back grip
  const hd = bez(P(4, 40), P(26, 66), P(48, 40), 16); blob(g, [tube(hd, 3.2 * sc, 3.2 * sc)], { ramp: SAGE, base: 3.8, thick: 3, outline: SAGE[0], litOutline: SAGE[3] });
  // body: a squat cylinder seen from the side, rim band and a little embossed ring
  const body = [P(0, 0), P(W, 0), P(W, H - 6), P(W - 4, H), P(4, H), P(0, H - 6)];
  blob(g, [body], { ramp: SAGE, base: 3.5, gain: 2.4, slope: 0.6, thick: 14 * sc, outline: SAGE[0], litOutline: SAGE[2] });
  for (let u = 2; u < W - 2; u++) { const [px, py] = P(u, H - 6); g.px(R(px), R(py), SAGE[2]); g.px(R(px), R(py) - 1, SAGE[6]); const [qx, qy] = P(u, 10); g.px(R(qx), R(qy), SAGE[2]); g.px(R(qx), R(qy) - 1, SAGE[5]); }
  const [ox, oy] = P(W / 2, H); for (let i = -10; i <= 10; i++) g.px(R(ox + i * sc), R(oy) - 1, i < -4 ? SAGE[7] : SAGE[5]);
}
export { R };
