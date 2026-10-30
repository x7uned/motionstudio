// catalog-v1 backdrop «jungle»: the rainforest level of the animals-speed film (animals-speed/film/levels/jungle.mjs back/front,
// copy in lib/speed-jungle.mjs): pale far canopy skyline and rounder near trees, undergrowth of big leaves, ferns and hedges,
// red heliconia and orchids, two huge mossy trunks with vines and one thick branch across the top (bromeliad, orchids), a
// hanging leaf canopy, mossy forest floor with sunflecks, leaf litter, roots, a fallen log with mushrooms and rocks; huge
// leaves and ferns in front at the edges. Ambient: breathing light shafts, two swaying lianas, a blue morpho butterfly.
// Catalog changes: no sloth, snail, moth or hanging twig; scene shifted up 60 px so the ground line sits at y 580 (floor
// extended 60 rows); a green-teal sky replaces the film's global sky/sun; layers are sampled nearest through the camera.
import { layer, band } from "../engine/layout.mjs";
import { buildJungle, lianas, morpho, shafts } from "./lib/speed-jungle.mjs";

const SHIFT = 60;                                          // film rest-screen y → stage y = film y − SHIFT
const SKY = ["#5FB0A2", "#78C2AA", "#98D4B2", "#B8E4BA", "#D2EEC6", "#E8F6D4"];
let L = null;

function blit(c, Ly, V, oy) {   // layer (x + 40, y) → stage (x, y − oy)
  const src = Ly.c, W = src.w, H = src.h, sd = src.d, sm_ = Ly.m, dd = c.d, CW = c.w, xs = new Int32Array(CW);
  for (let x = 0; x < CW; x++) xs[x] = Math.floor(V.wx(x + 0.5) + 40);
  for (let y = 0; y < c.h; y++) {
    const j = Math.floor(V.wy(y + 0.5) + oy); if (j < 0 || j >= H) continue;
    const row = j * W;
    for (let x = 0; x < CW; x++) { let i = xs[x]; if (i < 0) i = 0; else if (i >= W) i = W - 1; const li = row + i; if (!sm_[li]) continue; const a = li * 3, b = (y * CW + x) * 3; dd[b] = sd[a]; dd[b + 1] = sd[a + 1]; dd[b + 2] = sd[a + 2]; }
  }
}

export default {
  kind: "jungle",
  backdrop: true,
  covers: ["jungle"],
  source: "animals-speed/film/levels/jungle.mjs#back",
  desc: "dense green rainforest: mossy trunks, branch, ferns, flowers, leafy floor",
  theme: { accent: "#B8F070", gold: "#F4CA50", hot: "#F2F8A0", core: "#FFFBE0", stone: ["#0E2C16", "#16421C", "#081C10"], beam: "#F4F8C0" },
  draw(c, cam, t) {
    if (!L) L = buildJungle();
    const V = layer(cam, 1), W = { X: V.X, Y: (sy) => V.Y(sy - SHIFT), z: V.z };
    for (let y = 0; y < c.h; y++) { for (let x = 0; x < c.w; x++) c.px(x, y, band(SKY, Math.max(0, Math.min(1, (V.wy(y + 0.5) + 20) / 520)), x, y)); }
    blit(c, L.BACK, V, SHIFT);
    shafts(c, W, t); lianas(c, W, t); morpho(c, W, t);
  },
  front(c, cam, t) {
    if (!L) L = buildJungle();
    blit(c, L.FRONT, layer(cam, 1), 0);
  },
  notes: "Film layers copied, scene shifted up 60 px: ground line y 580, big trunks at x 0–80 and 460–540, a thick mossy branch across the top at y 185, canopy leaves hang from the top, far canopy skyline at y 300–400; the middle (x 100–400, y 250–560) is far forest and undergrowth, calm enough for props but busier than the other backdrops (heliconia and orchids at y 500–600 are bright red/pink). Sky is a plain green-teal 6-band dithered gradient (the film's sun is global and not drawn). Fallen log and rocks sit low at y 800–850 (under the caption row). Nearest-neighbour camera scaling: at non-integer zoom pixel columns are uneven.",
};
