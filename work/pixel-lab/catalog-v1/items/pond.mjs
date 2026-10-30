// catalog-v1 backdrop «pond»: the wingbeat film's pond level (animals-wingbeat/film/levels/pond.mjs, copy in
// lib/wingbeat-pond.mjs + lib/wingbeat-pond-kit.mjs): hazy hills and alders across the water, a weeping willow at the left,
// a lawn bank with daisies on the left and a grassy bank on the right, a still blue pond with soft reflections, lily pads,
// a pink water lily and a mossy stone; cattails, irises, loosestrife and marsh marigolds along the banks.
// Catalog changes: far waterline at y 560, strip wider than the frame, no frog/damselfly/ripples/film grade; a daylight sky
// with drifting clouds and slow sun glitter on the water replace the film's global sky.
import { layer, ramp, frac, clamp01 } from "../engine/layout.mjs";
import { bayer, hex } from "../../../../renderer/pixel/raster.mjs";
import { pondLayers, SH, inWater } from "./lib/wingbeat-pond.mjs";

const SKY = ["#7CB4E8", "#94C6EE", "#AED6F2", "#C8E6F4", "#E2F2F0"].map(hex);
const CLOUD = ["#F8FAFE", "#E4ECF8", "#C8D6EC"].map(hex);
const CLOUDS = [[80, 3.0, 0.12, 1.1], [175, 2.2, 0.48, 0.85], [265, 3.8, 0.79, 0.7]];
const BLOBS = [[0, 0, 20], [-22, 6, 14], [23, 5, 16], [7, -11, 14]];
const R = Math.round;

function blit(c, Ly, V, sky, t) {
  const sd = Ly.c.d, m = Ly.c.m, W = Ly.c.w, H = Ly.c.h, d = c.d, GW = c.w, GH = c.h;
  const CX = new Int32Array(GW), WX = new Float64Array(GW);
  for (let x = 0; x < GW; x++) { const wx = V.wx(x + 0.5); WX[x] = wx; CX[x] = Math.max(0, Math.min(W - 1, Math.floor(wx) - Ly.wx0)); }
  const CL = sky ? CLOUDS.map(([cy, v, ph, s]) => [-150 + frac(ph + (t * v) / 900) * 900, cy, s]) : null;
  for (let y = 0; y < GH; y++) {
    const wy = V.wy(y + 0.5), ry = Math.floor(wy) - Ly.wy0, inside = ry >= 0 && ry < H, row = ry * W, sv = clamp01((wy + 40) / 640);
    for (let x = 0; x < GW; x++) {
      const q = (y * GW + x) * 3;
      if (inside) { const li = row + CX[x]; if (m[li]) { const p = li * 3; d[q] = sd[p]; d[q + 1] = sd[p + 1]; d[q + 2] = sd[p + 2]; continue; } }
      if (!sky) continue;
      let col = null;
      for (const [ccx, ccy, s] of CL) {
        const dx = (WX[x] - ccx) / s, dy = (wy - ccy) / s; if (dx * dx + dy * dy > 1600) continue;
        for (const [bx, by, br] of BLOBS) { const ex = dx - bx, ey = dy - by; if (ex * ex + ey * ey <= br * br) { col = CLOUD[dy > 9 ? 2 : dy > 3 ? 1 : 0]; break; } }
        if (col) break;
      }
      if (!col) col = ramp(SKY, sv, x, y);
      d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2];
    }
  }
}
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// slow sun glitter on the open water (world anchored; each glint fades in and out through the dither)
function glitter(c, V, t) {
  for (let i = 0; i < 46; i++) {
    const sy = 660 + rnd(i * 3 + 1) * 300, sx = 130 + rnd(i * 3 + 2) * 300; if (!inWater(sx, sy)) continue;
    const a = 0.5 + 0.5 * Math.sin(t * (0.6 + rnd(i) * 0.5) + i * 2.1), x = R(V.X(sx)), y = R(V.Y(sy - SH));
    if (x < 1 || x >= c.w - 1 || y < 0 || y >= c.h || a * 0.9 <= bayer(x, y) + 0.25) continue;
    c.px(x, y, "#F4FCFF"); if (V.z > 1.4 || sy > 800) { c.px(x - 1, y, "#D2EEF6"); c.px(x + 1, y, "#D2EEF6"); }
  }
}

export default {
  kind: "pond",
  backdrop: true,
  covers: ["pond"],
  source: "animals-wingbeat/film/levels/pond.mjs#back",
  desc: "sunny garden pond: willow, lily pads, reeds, banks, still blue water",
  theme: { accent: "#F08A3C", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#1C3440", "#28485A", "#12242E"], beam: "#F7E8A0" },
  draw(c, cam, t) { const L = pondLayers(), V = layer(cam, 1); blit(c, L.BACK, V, true, t); glitter(c, V, t); },
  front(c, cam, t) { blit(c, pondLayers().FRONT, layer(cam, 1), false, t); },
  notes: "Film painting sampled nearest through the camera (close-ups enlarge its pixels). Wide shot: far waterline y 560, willow + alders on the far bank, lawn bank left, grassy bank right, lily pads and the stone in the water; upper half is plain sky (calm for props). Sky is repainted; frog, damselfly and ripples are not ported. Water has visible row banding at the bottom (film look).",
};
