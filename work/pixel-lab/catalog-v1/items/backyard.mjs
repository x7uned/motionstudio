// catalog-v1 backdrop «backyard»: the dog level's house yard of the animals film (animals/film/levels/yard.mjs back/front,
// copy in lib/animals-yard.mjs): red-roofed cream cottage with a blue door, flower box and attic window on the left,
// a flowering hedge, the white picket fence across the back, the blue doghouse with its food bowl on the right, low
// green hills, a mown lawn with fanning stripes, daisies and stepping stones, grass tufts along the bottom edge.
// Catalog changes: the film's 1× painting is sampled nearest through the camera (film x = world x + 1620, film y =
// world y − 580, so the lawn line sits at y 560); a daylight sky with three drifting clouds replaces the film's global
// sky; the toy pile and the duck (live props of the film) are not drawn.
import { yardLayers } from "./lib/animals-yard.mjs";
import { layer, band, clamp01, frac } from "../engine/layout.mjs";
import { hex } from "../../../../renderer/pixel/raster.mjs";

const OX = 1620, OY = -580;
const SKY = ["#6A9EDC", "#80B0E6", "#98C2EE", "#B2D4F4", "#CCE4F6", "#E4F0F2"].map(hex);
const CLOUD = ["#F8FAFE", "#E4ECF8", "#C8D6EC"].map(hex);
const CLOUDS = [[70, 3.0, 0.12, 1.1], [150, 2.2, 0.48, 0.85], [230, 3.8, 0.79, 0.7]];   // world y, px/s, phase, scale
const BLOBS = [[0, 0, 20], [-22, 6, 14], [23, 5, 16], [7, -11, 14]];

function sample(c, cam, Ly, sky, t) {
  const L = layer(cam, 1), sd = Ly.c.d, m = Ly.c.m, W = Ly.c.w, H = Ly.c.h, d = c.d, GW = c.w, GH = c.h;
  const CX = new Int32Array(GW), WX = new Float64Array(GW);
  for (let x = 0; x < GW; x++) { const wx = L.wx(x + 0.5); WX[x] = wx; CX[x] = Math.max(0, Math.min(W - 1, Math.floor(wx + OX) - Ly.wx0)); }
  const CL = sky ? CLOUDS.map(([cy, v, ph, s]) => [-150 + frac(ph + (t * v) / 900) * 900, cy, s]) : null;
  for (let y = 0; y < GH; y++) {
    const wy = L.wy(y + 0.5), ry = Math.floor(wy + OY) - Ly.wy0, inside = ry >= 0 && ry < H, row = ry * W, sv = clamp01((wy + 40) / 560);
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
      if (!col) col = band(SKY, sv, x, y);
      d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2];
    }
  }
}

export default {
  kind: "backyard",
  backdrop: true,
  covers: ["backyard"],
  source: "animals/film/levels/yard.mjs#back",
  desc: "sunny house yard: red-roof cottage, picket fence, striped lawn, blue doghouse",
  theme: { accent: "#F08A3C", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#1E2A22", "#2A3A2E", "#162018"], beam: "#F7B04A" },
  draw(c, cam, t) { sample(c, cam, yardLayers().BACK, true, t); },
  front(c, cam, t) { sample(c, cam, yardLayers().FRONT, false, t); },
  notes: "Film painting at 1×, sampled nearest through the camera (close-ups enlarge its pixels and they crawl slightly during zoom moves). Wide shot: lawn line y 560, cottage + hedge at the left edge (x 0–155), fence across the back, doghouse at the right edge, upper half is a plain daylight sky with three slow clouds (the scenery is low; the calm sky is where props read). Not ported: toy pile, duck, the film sun. Lawn/hills painted 40 px wider than the film so side drift never shows an unpainted column. Bright palette: dark props read well, white/cream props need their outlines against the fence and clouds.",
};
