// catalog-v1 backdrop «desert»: the desert level of the deadliest film (deadliest/film/levels/desert.mjs back/front, copy in
// lib/deadliest-desert.mjs): golden sand with wind ripples, hazy rose mesa and butte, soft far dunes with a small oasis
// (two palms, a sliver of water), sharp-crested golden mid dunes, a balanced hoodoo rock at the left edge, a sandstone
// boulder cluster at the right edge, dry shrubs and pebbles. Wind-blown sand grains drift across the floor in front.
// Catalog changes: no scorpion, ruler, "LV 5" sign or film timing; the film's global sunset sky is replaced by a rose-to-gold
// dithered sky; film y shifted so the sand line sits at y 560; the layers are sampled nearest through the camera.
import { layer, band, clamp01 } from "../engine/layout.mjs";
import { buildDesert, X0, X1, LAND } from "./lib/deadliest-desert.mjs";
import { rnd } from "./lib/cute.mjs";

const OX = 2160, OY = 580;           // film world → catalog stage: sx = wx - OX, sy = wy + OY (sand line LAND → y 560)
const SKY = ["#8E6AA6", "#B27AA8", "#D58FA0", "#EEA79A", "#F8C29C", "#FFDDAE"];
const R = Math.round;
let L = null;

function blit(c, Ly, V) {
  const src = Ly.c, W = src.w, H = src.h, sd = src.d, sm_ = src.m, dd = c.d, CW = c.w, xs = new Int32Array(CW);
  for (let x = 0; x < CW; x++) xs[x] = Math.floor(V.wx(x + 0.5) + OX - Ly.wx0);
  for (let y = 0; y < c.h; y++) {
    const j = Math.floor(V.wy(y + 0.5) - OY - Ly.wy0); if (j < 0 || j >= H) continue;
    const row = j * W;
    for (let x = 0; x < CW; x++) { let i = xs[x]; if (i < 0) i = 0; else if (i >= W) i = W - 1; const li = row + i; if (!sm_[li]) continue; const a = li * 3, b = (y * CW + x) * 3; dd[b] = sd[a]; dd[b + 1] = sd[a + 1]; dd[b + 2] = sd[a + 2]; }
  }
}
function sky(c, V) { for (let y = 0; y < c.h; y++) { const v = clamp01(V.wy(y + 0.5) / 500 + 0.0) ; for (let x = 0; x < c.w; x++) c.px(x, y, band(SKY, clamp01((V.wy(y + 0.5) - 20) / 540), x, y)); } }

export default {
  kind: "desert",
  backdrop: true,
  covers: ["desert"],
  source: "deadliest/film/levels/desert.mjs#back",
  desc: "golden sand desert at sunset: rose mesa, dunes, small oasis, rocks",
  theme: { accent: "#FFD27A", gold: "#F4CA50", hot: "#FFE9A0", core: "#FFF6D8", stone: ["#3A1A1E", "#5A2A26", "#2A1014"], beam: "#FFD08A" },
  draw(c, cam, t) {
    if (!L) L = buildDesert();
    const V = layer(cam, 1);
    sky(c, V);
    blit(c, L.BACK, V);
  },
  front(c, cam, t) {
    if (!L) L = buildDesert();
    const V = layer(cam, 1);
    blit(c, L.FRONT, V);
    // sand grains in the low wind (world-anchored, wrap far outside the frame)
    for (let i = 0; i < 26; i++) {
      const sp = 30 + rnd(i * 7) * 50, wx = X0 + ((((rnd(i * 3) * 900 - t * sp) % 660) + 660) % 660), wy = LAND + 8 + rnd(i * 11) * 360;
      const x = R(V.X(wx - OX)), y = R(V.Y(wy + Math.sin(t * 2 + i) * 3 + OY));
      if (x < 0 || x >= c.w || y < 0 || y >= c.h) continue;
      c.px(x, y, i % 3 ? "#FFF0C8" : "#F8D49A"); if (wy - LAND > 150) c.px(x + 1, y, "#FFE6B0");
    }
  },
  notes: "Film layers copied (mesa, butte, far/mid dunes, oasis, hoodoo, boulders, shrubs, pebbles, ripple sand), strip widened to world 2100..2760. Sand line y 560, mesa/hoodoo/boulder stand at the side edges only (x<80 and x>390); the centre (x 100–380) is open dunes and sand. Sky is a 6-band dithered rose-to-gold gradient (the film's sky/sun are global and not part of the level). Camera zoom is a nearest-neighbour scale of the cached layer, so at non-integer zoom pixel columns are uneven.",
};
