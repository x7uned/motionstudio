// The playfield of «The lowest aliens can't shoot you»: one persistent arcade screen in game pixels (224 × 256, y down)
// seen through a camera {cx, cy, z}: screen = (270 + (wx − cx)·z, SY + (wy − cy)·z). Space behind, the moon's ground
// under the field runs to the bottom edge of the 9:16 frame. Sprites are drawn as lit blocks (one block per game pixel).
import { mix, bayer, hex } from "./lib/raster.mjs";
import { rnd } from "./lib/ui.mjs";

export const GW = 540, GH = 960, SY = 400, FW = 224, FH = 256;
const R = Math.round;
export const view = (cam) => ({ ...cam, X: (wx) => 270 + (wx - cam.cx) * cam.z, Y: (wy) => SY + (wy - cam.cy) * cam.z, inv: (sx, sy) => [cam.cx + (sx - 270) / cam.z, cam.cy + (sy - SY) / cam.z] });

// ---------------------------------------------------------------- backdrop: deep space, a far planet, the moon's ground
export const GROUND_Y = 237;
const SPACE = ["#04030A", "#07061A", "#0C0A26", "#141034"];
const MOON = ["#2A2440", "#3A3256", "#4C436C", "#615784", "#7A70A0"];
export function drawBackdrop(c, V, t, END = 1) {
  const d = c.d, gy = V.Y(GROUND_Y);
  for (let y = 0; y < GH; y++) {
    if (y >= gy) break;
    const k = Math.max(0, Math.min(1, 1 - (gy - y) / 700)), q = k * 3, lo = Math.floor(q);
    for (let x = 0; x < GW; x++) { const col = hex(SPACE[Math.min(3, q - lo > bayer(x, y) ? lo + 1 : lo)]), i = (y * GW + x) * 3; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; }
  }
  // stars: a fixed field with mild parallax, twinkling (never on/off in one frame: brightness is continuous)
  const px = (V.cx - FW / 2) * 0.35 * V.z, py = (V.cy - 128) * 0.35 * V.z;
  for (let i = 0; i < 300; i++) {
    const x = ((rnd(i * 5 + 1) * 700 - px) % 700 + 700) % 700 - 80, y = rnd(i * 5 + 2) * 1100 - py - 70; if (x < 0 || x >= GW || y < 0 || y >= gy - 2) continue;
    const b = rnd(i * 5 + 3), tw = 0.55 + 0.45 * Math.sin((2 * Math.PI * t * (20 + Math.floor(rnd(i) * 60))) / END + i * 1.7);
    c.px(x, y, mix(SPACE[1], b > 0.8 ? "#FDFEED" : "#B9AEE8", tw * (0.35 + 0.65 * b)));
  }
  // a far ringed planet, deep parallax
  { const cx = R(430 - (V.cx - FW / 2) * 0.12 * V.z), cy = R(150 - (V.cy - 128) * 0.12 * V.z), r = 26;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const dd = x * x + y * y; if (dd > r * r || cy + y >= gy) continue; const l = (-x * 0.6 - y * 0.8) / r + 0.15, s = Math.max(0, Math.min(3, Math.floor(l * 2.2 + 1.6 + (bayer(cx + x, cy + y) - 0.5)))); c.px(cx + x, cy + y, ["#1C1438", "#2E2258", "#4A3880", "#6C58A8"][s]); }
    for (let a = 0; a < 360; a += 0.6) { const ang = (a * Math.PI) / 180, x = R(cx + Math.cos(ang) * 44), y = R(cy + Math.sin(ang) * 9 - Math.cos(ang) * 4); const front = Math.sin(ang) > 0; if (!front && (x - cx) ** 2 + (y - cy) ** 2 < r * r) continue; if (y < gy) c.px(x, y, front ? "#8E7CC8" : "#4A3880"); } }
  // the moon's ground: from the ground line to the bottom edge, craters and rocks, bigger toward the viewer
  for (let y = Math.max(0, R(gy)); y < GH; y++) {
    const depth = (y - gy) / Math.max(1, GH - gy), [wx0] = V.inv(0, y);
    for (let x = 0; x < GW; x++) {
      const wx = wx0 + x / V.z, u = wx / (14 + depth * 30), v = (y - gy) / (10 + depth * 26), cu = Math.floor(u), cv = Math.floor(v), h = rnd(cu * 131 + cv * 977 + 7);
      let s = 2 - Math.min(1.6, depth * 1.6) + (bayer(x, y) - 0.5) * 0.9;
      if (h > 0.7) { const ox = cu + 0.5 + (rnd(h * 1e4) - 0.5) * 0.3, oy = cv + 0.5, dx = u - ox, dy = (v - oy) * 1.6, rr = 0.25 + rnd(h * 7e3) * 0.2, dd = Math.hypot(dx, dy); if (dd < rr) s += dy < 0 ? -1.2 : 0.9; else if (dd < rr + 0.07) s += 1.1; }
      const col = MOON[Math.max(0, Math.min(4, Math.round(s)))], i = (y * GW + x) * 3, q = hex(col); c.d[i] = q[0]; c.d[i + 1] = q[1]; c.d[i + 2] = q[2];
    }
  }
}

// ---------------------------------------------------------------- lit blocks
/** draw a sprite (rows of chars) with its top-left at world (wx, wy); map char → colour; alpha via dither; scale = game px per char */
export function drawSprite(c, V, rows, wx, wy, map, { alpha = 1, flip = false, glow = 0, scale = 1, tint = null, k = 0, gate = null } = {}) {
  const z = V.z * scale, lit = z >= 3.5, on = (i, j) => { const r = rows[j]; if (!r || i < 0 || i >= r.length) return false; return !!map[r[flip ? r.length - 1 - i : i]]; };
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j], y0 = R(V.Y(wy + j * scale)), y1 = R(V.Y(wy + (j + 1) * scale)); if (y1 <= 0 || y0 >= GH) continue;
    for (let i = 0; i < row.length; i++) {
      const ch = row[flip ? row.length - 1 - i : i], base = map[ch]; if (!base) continue;
      const x0 = R(V.X(wx + i * scale)), x1 = R(V.X(wx + (i + 1) * scale)); if (x1 <= 0 || x0 >= GW) continue;
      const col = tint ? mix(base, tint, k) : hex(base), hi = mix(col, "#FFFFFF", 0.35), lo = mix(col, "#000000", 0.3);
      for (let y = Math.max(0, y0); y < Math.min(GH, y1); y++) for (let x = Math.max(0, x0); x < Math.min(GW, x1); x++) {
        if (alpha < 1 && alpha <= bayer(x, y)) continue; if (gate && !gate(x, y)) continue;
        let cc = col; if (lit) { if ((y === y0 && !on(i, j - 1)) || (x === x0 && !on(i - 1, j))) cc = hi; else if ((y === y1 - 1 && !on(i, j + 1)) || (x === x1 - 1 && !on(i + 1, j))) cc = lo; }
        c.px(x, y, cc);
      }
    }
  }
}
/** a world-space rectangle (game px) */
export function wrect(c, V, wx, wy, w, h, col, alpha = 1) {
  const x0 = Math.max(0, R(V.X(wx))), x1 = Math.min(GW, R(V.X(wx + w))), y0 = Math.max(0, R(V.Y(wy))), y1 = Math.min(GH, R(V.Y(wy + h)));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (alpha >= 1 || alpha > bayer(x, y)) c.px(x, y, col);
}
