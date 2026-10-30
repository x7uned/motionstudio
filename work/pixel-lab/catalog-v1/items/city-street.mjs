// catalog-v1 backdrop «city-street»: the harbour-town square of the wingbeat film's level 2 (animals-wingbeat/film/levels/
// city-scene.mjs cityLayer, copy in lib/wingbeat-city.mjs): a row of warm house fronts (brick harbour house, cream house
// with green shutters and geraniums, the low café with its striped awning and a blank board, the ochre bakery with a slate
// mansard and bread in the window, the tall brick house with a clock), a hazy far skyline, cobbles in perspective to the
// bottom edge, two rain puddles, the quay coping on the left and a hedge with a little tree on the right.
// Catalog changes: the painted square sits 80 rows higher (ground line y 560), the 1× painting is sampled through the
// camera (nearest), a morning sky with three drifting clouds replaces the film's global sky, the puddles shimmer.
import { cityLayer, PUDDLES } from "./lib/wingbeat-city.mjs";
import { layer, band, clamp01, frac } from "../engine/layout.mjs";
import { fade, hex } from "../../../../renderer/pixel/raster.mjs";

const R = Math.round, TAU = Math.PI * 2, SHIFT = 80;          // catalog world y = rest-screen y − SHIFT
const SKY = ["#6A96D6", "#82AAE2", "#9CC0EC", "#B8D4F2", "#D4E2F2", "#EEE6D8"].map(hex);
const CLOUD = ["#F8FAFE", "#E4ECF8", "#C8D6EC"].map(hex);
const CLOUDS = [[60, 3.2, 0, 1.15], [128, 2.1, 0.37, 0.9], [196, 4.0, 0.71, 0.75]];   // world y, px/s, phase, scale
const BLOBS = [[0, 0, 20], [-22, 6, 14], [23, 5, 16], [7, -11, 14]];

export default {
  kind: "city-street",
  backdrop: true,
  covers: ["city-street"],
  source: "animals-wingbeat/film/levels/city-scene.mjs#cityLayer",
  desc: "sunny old-town square: house fronts, café awning, bakery, clock house, cobbles, puddles",
  theme: { accent: "#F08A3C", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#2A2230", "#3A3042", "#1E1824"], beam: "#F7B04A" },
  draw(c, cam, t) {
    const L = layer(cam, 1), Lc = cityLayer(), d = c.d, sd = Lc.c.d, m = Lc.m, W = Lc.W, H = Lc.H, GW = c.w, GH = c.h;
    const CX = new Int32Array(GW), WX = new Float64Array(GW);
    for (let x = 0; x < GW; x++) { const wx = L.wx(x + 0.5); WX[x] = wx; CX[x] = Math.max(0, Math.min(W - 1, Math.floor(wx) - Lc.x0)); }
    const CL = CLOUDS.map(([cy, v, ph, s]) => [-150 + frac(ph + (t * v) / 900) * 900, cy, s]);
    for (let y = 0; y < GH; y++) {
      const wy = L.wy(y + 0.5), ry = Math.floor(wy + SHIFT), row = Math.max(0, Math.min(H - 1, ry)) * W, sv = clamp01((wy + 40) / 480);
      for (let x = 0; x < GW; x++) {
        const li = row + CX[x], q = (y * GW + x) * 3;
        if (ry >= 0 && m[li]) { const p = li * 3; d[q] = sd[p]; d[q + 1] = sd[p + 1]; d[q + 2] = sd[p + 2]; continue; }
        let col = null;
        for (const [ccx, ccy, s] of CL) {
          const dx = (WX[x] - ccx) / s, dy = (wy - ccy) / s; if (dx * dx + dy * dy > 1600) continue;
          for (const [bx, by, br] of BLOBS) { const ex = dx - bx, ey = dy - by; if (ex * ex + ey * ey <= br * br) { col = CLOUD[dy > 9 ? 2 : dy > 3 ? 1 : 0]; break; } }
          if (col) break;
        }
        if (!col) col = band(SKY, sv, x, y);
        d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2];
      }
    }
    // the puddles mirror the sky: a slow ripple ring and a twinkling glint (as in the film's level 2)
    for (const [px, py, rx, ry] of PUDDLES) {
      const x = L.X(px), y = L.Y(py - SHIFT), ph = frac(t / 4.3 + px * 0.01), rr = 0.25 + 0.7 * ph, g = fade(c, Math.sin(Math.PI * ph) * 0.8);
      g.ering(R(x - rx * 0.2 * L.z), R(y + L.z), R(rx * 0.5 * rr * L.z), Math.max(1, R(ry * 0.5 * rr * L.z)), "#FFFFFF");
      const gl = fade(c, 0.5 + 0.5 * Math.sin((TAU * t) / 3.1 + px)), gx = R(x + rx * 0.35 * L.z), gy = R(y - ry * 0.35 * L.z);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [0, 1], [-1, 0]]) gl.px(gx + dx, gy + dy, "#FFFFFF");
    }
  },
  notes: "The film's 1× painting is sampled nearest through the camera: at close-ups its pixels are 1.4–2.4× bigger than the props' and they crawl slightly during zoom moves. At the wide shot the house row fills y ≈ 270–560 and the upper quarter is sky with three slow clouds; the cobbles run to the bottom edge (both puddles lie in the caption row). Bright morning palette: dark props read well, cream props need their outlines. Not ported: the film's pigeons, the lamp post with its level-number plate (text), the planter, the chimney smoke. The café board is blank.",
};
