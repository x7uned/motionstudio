// catalog-v1 backdrop «village»: the dusk village entrance of the deadliest film's dog level (deadliest/film/levels/village.mjs
// back/front, copy in lib/deadliest-village.mjs): a low adobe gate post, a lilac cottage with chimney smoke and a warm window,
// a peach cottage with a striped awning, a stone well, far rooftops and round trees, a dirt road with a rose puddle and
// pebbles, banana leaves at the right edge, string lights, a wall lantern, a few fireflies. Plum/rose dusk sky.
// Catalog changes: the film's painted layer is sampled nearest through the camera (film x = stage x + 2700, film y = stage y − 560,
// so the road line sits at y 560); a dusk sky replaces the film's global sky; the dog, the «LV 6» sign and the cutscene
// effects are not drawn; the moth around the lantern is dropped; the lantern/bulb glows, smoke and fireflies are dynamic.
import { buildVillage, LANTERN } from "./lib/deadliest-village.mjs";
import { layer, band, clamp01, lerp, rnd } from "../engine/layout.mjs";
import { hex, mix, bayer } from "../../../../renderer/pixel/raster.mjs";

const OX = 2700, OY = 560, R = Math.round;
const SKY = ["#35205E", "#4C2C70", "#6A3A7C", "#8E4A80", "#B65C80", "#DA7684", "#F09A84", "#FFC090"].map(hex);
const GLOWS = [[2738, -132, 30, 34], [3170, -128, 28, 30]];

function sample(c, V, Ly, sky) {
  const sd = Ly.c.d, m = Ly.c.m, W = Ly.c.w, H = Ly.c.h, d = c.d, GW = c.w, GH = c.h;
  const CX = new Int32Array(GW);
  for (let x = 0; x < GW; x++) CX[x] = Math.max(0, Math.min(W - 1, Math.floor(V.wx(x + 0.5) + OX) - Ly.wx0));
  for (let y = 0; y < GH; y++) {
    const wy = V.wy(y + 0.5), ry = Math.floor(wy - OY) - Ly.wy0, inside = ry >= 0 && ry < H, row = ry * W, sv = clamp01(wy / 560);
    for (let x = 0; x < GW; x++) {
      const q = (y * GW + x) * 3;
      if (inside) { const li = row + CX[x]; if (m[li]) { const p = li * 3; d[q] = sd[p]; d[q + 1] = sd[p + 1]; d[q + 2] = sd[p + 2]; continue; } }
      if (!sky) continue;
      const col = band(SKY, sv, x, y); d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2];
    }
  }
}
function glow(c, x, y, r, col, k, steps = 4) { c.tint(R(x - r), R(y - r), R(2 * r) + 1, R(2 * r) + 1, (X, Y) => { const d = Math.hypot(X - x, Y - y) / r; return d >= 1 ? 0 : k * (1 - d) ** 1.4; }, col, steps); }

export default {
  kind: "village",
  backdrop: true,
  covers: ["village"],
  source: "deadliest/film/levels/village.mjs#back",
  desc: "dusk village: adobe cottages, stone well, dirt road, string lights, warm windows",
  theme: { accent: "#FFC860", gold: "#F4CA50", hot: "#FFE08A", core: "#FFF6C8", stone: ["#2A1630", "#3E2444", "#1E1024"], beam: "#FFC870" },
  draw(c, cam, t) {
    const V = layer(cam, 1), B = buildVillage(), z = V.z;
    sample(c, V, B.BACK, true);
    const X = (wx) => V.X(wx - OX), Y = (wy) => V.Y(wy + OY);
    // lit windows and the wall lantern breathe
    for (const [wx, wy, ww, wh] of GLOWS) glow(c, X(wx + ww / 2), Y(wy + wh / 2), 34 * z, "#FFC870", 0.28 + 0.03 * Math.sin(t * 3 + wx));
    const fl = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 5.3);
    glow(c, X(LANTERN[0]), Y(LANTERN[1] + 8), 30 * z, "#FFC060", 0.42 * fl);
    // string lights along the eaves: the wire is part of the cached layer? no — drawn here as sagging dots that twinkle
    const spans = [[[3104, -158], [3150, -150], 5], [[3150, -150], [3200, -158], 5], [[3200, -158], [3252, -176], 7], [[2722, -166], [2846, -166], 4]];
    const cols = ["#FFD86A", "#FF8A7A", "#8AE0FF", "#B8F08A", "#FFB0E0"]; let n = 0;
    for (const [[ax, ay], [bx, by], sag] of spans) {
      const x0 = X(ax), y0 = Y(ay), x1 = X(bx), y1 = Y(by);
      if (Math.max(x0, x1) < -10 || Math.min(x0, x1) > 550) { n += 6; continue; }
      const pts = []; for (let i = 0; i <= 24; i++) { const k = i / 24; pts.push([lerp(x0, x1, k), lerp(y0, y1, k) + sag * z * 4 * k * (1 - k) + Math.sin(t * 1.2 + ax) * k * (1 - k) * 1.5]); }
      for (let i = 0; i < 24; i++) c.line(R(pts[i][0]), R(pts[i][1]), R(pts[i + 1][0]), R(pts[i + 1][1]), "#2A1A2A");
      for (let i = 2; i < 24; i += 4) {
        const [px, py] = pts[i], col = cols[n % cols.length], tw = 0.75 + 0.25 * Math.sin(t * 2.2 + n * 1.7); n++;
        glow(c, px, py + 3 * z, 7 * z, col, 0.3 * tw, 3);
        const s = Math.max(1, R(z)); c.rect(R(px) - s, R(py) + 2 * s, 3 * s, 3 * s, mix(col, "#FFFFFF", 0.3 * tw)); c.px(R(px), R(py) + 3 * s, "#FFFFFF");
      }
    }
    // chimney smoke: six puffs rise, drift left and dissolve
    for (let i = 0; i < 6; i++) {
      const p = ((t * 0.32 + i / 6) % 1 + 1) % 1, x = X(2754 - p * 26 + Math.sin(p * 6 + i) * 3), y = Y(-254 - p * 70), r = (3 + p * 7) * z, a = 0.55 * Math.sin(Math.PI * p);
      if (x < -40 || x > 580) continue;
      for (let yy = R(y - r); yy <= R(y + r); yy++) for (let xx = R(x - r); xx <= R(x + r); xx++) { const dd = ((xx - x) ** 2 + (yy - y) ** 2) / (r * r); if (dd <= 1 && ((xx + yy) & 1) === 0 && a > bayer(xx, yy)) c.px(xx, yy, dd < 0.5 ? "#C8A8C0" : "#A888A8"); }
    }
    // fireflies near the jungle edge, blinking slowly
    for (let i = 0; i < 7; i++) {
      const wx = 3150 + rnd(i * 3) * 100 + Math.sin(t * 0.7 + i * 2) * 12, wy = -30 - rnd(i * 7) * 120 + Math.sin(t * 1.1 + i) * 8, x = R(X(wx)), y = R(Y(wy));
      const b = Math.max(0, Math.sin(t * 1.7 + i * 2.3)); if (b < 0.02 || x < -10 || x > 550) continue;
      glow(c, x, y, 5 * z, "#E8FF8A", 0.35 * b, 3); if (b > 0.25) c.px(x, y, b > 0.6 ? "#FFFFC8" : "#D8F070");
    }
  },
  front(c, cam) { sample(c, layer(cam, 1), buildVillage().FRONT, false); },
  notes: "Film painting at 1×, sampled nearest through the camera (close-ups enlarge its pixels). Wide shot: road line y 560, lilac cottage + gate post at the left edge (x 10–155), the well and peach cottage at the right (x 410–540), far rooftops/trees behind, calm road in the middle. Plum-to-peach dusk sky replaces the film's global sky (no stars). Not ported: dog, «LV 6» sign, lantern moth, cutscene effects. Ground and layers extend to y 580+ so zooms never uncover them; the string lights are redrawn every frame (z-scaled).",
};
