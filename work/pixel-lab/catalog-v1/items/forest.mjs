// catalog-v1 backdrop «forest»: a daylight forest clearing, ported from work/pixel-lab/animals/film/levels/forest.mjs
// (static layers copied to lib/animals-forest.mjs, without the film's crow, hero and nailed sign). Two big trees with
// canopies at the sides, far forest silhouettes, ferns, mushrooms, bluebells, a dirt path across the floor and a fallen
// log with a grub hole; soft light shafts breathe through the canopy gap, a few leaves drift down in front.
import { bayer, mix } from "../../../../renderer/pixel/raster.mjs";
import { layer, ramp, sm } from "../engine/layout.mjs";
import { buildForest, RX0, LAND } from "./lib/animals-forest.mjs";

const OX = RX0, OY = 590;           // layer world → catalog stage: sx = wx - OX, sy = wy + OY (floor line LAND → y 570)
const SKY = ["#8CCBEA", "#A4D8F0", "#C0E6F2", "#DDF2EA"];
let L = null;
const R = Math.round;

// nearest-neighbour scaled copy of a masked layer into the frame (camera zoom); V = layer(cam, 1)
function blit(c, Ly, V) {
  const src = Ly.c, W = src.w, H = src.h, sd = src.d, sm_ = src.m, dd = c.d, CW = c.w;
  const xs = new Int32Array(CW), x0w = Ly.wx0;
  for (let x = 0; x < CW; x++) xs[x] = Math.floor(V.wx(x + 0.5) + OX - x0w);
  for (let y = 0; y < c.h; y++) {
    const j = Math.floor(V.wy(y + 0.5) - OY - Ly.wy0);
    if (j < 0 || j >= H) continue;
    const row = j * W;
    for (let x = 0; x < CW; x++) { let i = xs[x]; if (i < 0) i = 0; else if (i >= W) i = W - 1; const li = row + i; if (!sm_[li]) continue; const a = li * 3, b = (y * CW + x) * 3; dd[b] = sd[a]; dd[b + 1] = sd[a + 1]; dd[b + 2] = sd[a + 2]; }
  }
}
function sky(c) { for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) c.px(x, y, ramp(SKY, y / 700, x, y)); }

export default {
  kind: "forest",
  backdrop: true,
  covers: ["forest"],
  source: "animals/film/levels/forest.mjs#back",
  desc: "sunlit forest clearing: big trees, ferns, mushrooms, dirt path, fallen log",
  theme: { accent: "#F4CA50", gold: "#F4CA50", hot: "#FFF0A0", core: "#FFFBE0", stone: ["#1E3A1C", "#2E5A2A", "#142A14"], beam: "#F4F8C0" },
  draw(c, cam, t) {
    if (!L) L = buildForest();
    const V = layer(cam, 1);
    sky(c);
    blit(c, L.BACK, V);
    // light shafts through the canopy gap, slowly breathing (dither), same as the film (world coords shifted to the stage)
    const X = (wx) => V.X(wx - OX), Y = (wy) => V.Y(wy + OY);
    for (const [wx, w, sl, ph] of [[2330, 26, 0.42, 0], [2410, 16, 0.38, 1.7], [2500, 22, 0.45, 3.1]]) {
      const k = 0.18 + 0.06 * Math.sin(t * 0.8 + ph);
      for (let wy = -520; wy < LAND + 40; wy += 1) {
        const y = R(Y(wy)); if (y < 0 || y >= c.h) continue;
        const cx = X(wx + (wy + 520) * sl), fall = 1 - (wy + 520) / 600, ww = w * V.z;
        for (let x = R(cx - ww); x <= R(cx + ww); x++) { if (x < 0 || x >= c.w) continue; const e = 1 - Math.abs(x - cx) / ww; if (e * k * fall * 1.6 > bayer(x, y) + 0.12) c.px(x, y, mix(c.get(x, y), "#F4F8C0", 0.35)); }
      }
    }
  },
  front(c, cam, t) {
    if (!L) L = buildForest();
    const V = layer(cam, 1);
    blit(c, L.FRONT, V);
    // a few leaves drifting down (world-anchored, smooth entry/exit through a dither fade)
    for (let i = 0; i < 4; i++) {
      const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
      const ph = ((t * 0.09 + rnd(i * 5 + 1)) % 1), wx = RX0 + 60 + rnd(i * 9) * 420 + Math.sin(t * 1.3 + i) * 16, wy = -600 + ph * 620, x = R(V.X(wx - OX)), y = R(V.Y(wy + OY)), a = Math.min(1, ph * 6, (1 - ph) * 6);
      if (a <= bayer(x, y)) continue;
      const flip = Math.sin(t * 3 + i) > 0, z = Math.max(1, R(V.z));
      c.rect(x, y, 3 * z, 2 * z, i % 2 ? "#E0A040" : "#8AB43A"); c.rect(x + (flip ? z : 0), y + z, 2 * z, z, i % 2 ? "#B87A2A" : "#5E8A2A");
    }
  },
  notes: "Film layers copied (trees, canopies, ferns, mushrooms, log, path, bluebells), widened by 180 px each side and with the seam fades to the neighbouring biomes removed; floor line at y 570 (film 640 shifted up). Sky is a plain 4-band dithered blue (the film's sun disc and hero/crow are not part of it). Camera zoom is a nearest-neighbour scale of the cached layer, so at non-integer zoom pixel columns are uneven.",
};
