// catalog-v1 backdrop «mountains»: the afternoon gorge of the animals-heart film (levels/gorge.mjs back; static layers copied to
// lib/animals-gorge.mjs): two layered sandstone walls with ledges, shrubs and red tube flowers, snow-tipped blue peaks in the gap,
// a green valley floor with a stream, and a waterfall that pours over a notch in the right wall into a pool, with foam and mist.
// Catalog changes: the right wall, waterfall and pool sit 40 px further right so the middle stays calm; a daylight sky with two
// slow clouds replaces the film's global sky; the waterfall is evaluated per screen pixel through the camera (crisp at any zoom);
// the film's farm/sea seam fades, the hummingbird and the heart pickups are not drawn.
import { bayer, mix, fade } from "../../../../renderer/pixel/raster.mjs";
import { layer, ramp, frac } from "../engine/layout.mjs";
import { buildGorge, FALL, streamX } from "./lib/animals-gorge.mjs";
import { rnd } from "./lib/cute.mjs";

const OX = 4080, OY = 585;          // stage = world − OX, world y + OY (valley floor line → y 565)
const SKY = ["#78AEE8", "#92C0EE", "#AED2F4", "#CCE4F6", "#E4F0F4"];
const CLOUD = ["#F8FAFE", "#E4ECF8", "#C8D6EC"];
const CLOUDS = [[-300, 2.4, 0.2, 1.0], [-205, 3.2, 0.63, 0.75]];
const BLOBS = [[0, 0, 20], [-22, 6, 14], [23, 5, 16], [7, -11, 14]];
const R = Math.round;
let L = null;

function blit(c, Ly, V) {
  const src = Ly.c, W = src.w, H = src.h, sd = src.d, sm_ = src.m, dd = c.d, CW = c.w;
  const xs = new Int32Array(CW);
  for (let x = 0; x < CW; x++) xs[x] = Math.floor(V.wx(x + 0.5) + OX - Ly.wx0);
  for (let y = 0; y < c.h; y++) {
    const j = Math.floor(V.wy(y + 0.5) - OY - Ly.wy0);
    if (j < 0 || j >= H) continue;
    const row = j * W;
    for (let x = 0; x < CW; x++) { let i = xs[x]; if (i < 0) i = 0; else if (i >= W) i = W - 1; const li = row + i; if (!sm_[li]) continue; const a = li * 3, b = (y * CW + x) * 3; dd[b] = sd[a]; dd[b + 1] = sd[a + 1]; dd[b + 2] = sd[a + 2]; }
  }
}
function sky(c, V, t) {
  const CL = CLOUDS.map(([cy, v, ph, s]) => [-120 + frac(ph + (t * v) / 900) * 900, cy, s]);
  for (let y = 0; y < c.h; y++) {
    const wy = V.wy(y + 0.5) - OY, near = CL.filter(([, ccy, s]) => Math.abs(wy - ccy) < 40 * s);
    for (let x = 0; x < c.w; x++) {
      let col = null, wx = 0;
      if (near.length) wx = V.wx(x + 0.5);
      for (const [ccx, ccy, s] of near) {
        const dx = (wx + 270 - ccx) / s, dy = (wy - ccy) / s; if (dx * dx + dy * dy > 1600) continue;
        for (const [bx, by, br] of BLOBS) { const ex = dx - bx, ey = dy - by; if (ex * ex + ey * ey <= br * br) { col = CLOUD[dy > 9 ? 2 : dy > 3 ? 1 : 0]; break; } }
        if (col) break;
      }
      c.px(x, y, col || ramp(SKY, (wy + 700) / 520, x, y));
    }
  }
}

// the film's waterfall (levels/gorge.mjs#waterfall), evaluated per screen pixel from world coordinates
function waterfall(c, V, t) {
  const fx = FALL[0], y0 = FALL[1], y1 = FALL[2], z = Math.max(1, Math.ceil(V.z));
  const sx0 = Math.max(0, R(V.X(fx - OX - 30)) - 2), sx1 = Math.min(c.w, R(V.X(fx - OX + 30)) + 2);
  const sy0 = Math.max(0, R(V.Y(y0 + OY)) - 2), sy1 = Math.min(c.h, R(V.Y(y1 + OY)) + 2);
  for (let y = sy0; y < sy1; y++) {
    const wy = Math.floor(V.wy(y + 0.5) - OY); if (wy < y0 || wy >= y1) continue;
    const k = (wy - y0) / (y1 - y0), w = 7 + k * 9 + Math.sin(wy * 0.11 + t * 6) * 0.8, cx = fx - 3 + R(k * 3);
    for (let x = sx0; x < sx1; x++) {
      const wx = Math.floor(V.wx(x + 0.5) + OX), dx = wx - cx, e = Math.abs(dx) / w;
      if (e > 1.35 || (e > 1 && (e - 1) * 3 > bayer(wx, wy) * 0.6)) continue;
      const lane = Math.floor((dx + 40) / 3), ph = ((wy - t * (150 + (lane % 3) * 30) + lane * 17) % 28 + 28) % 28;
      c.px(x, y, e > 0.82 ? ((wx + wy) & 1 ? "#9AD4EC" : "#D8F2FF") : ph < 3 ? "#FFFFFF" : ph < 10 ? "#DDF4FF" : (dx + wy) & 1 ? "#A4DAF2" : "#BAE4F8");
    }
  }
  const P = (g, wx, wy, w, h, col) => { const x0 = R(V.X(wx - OX)), y0_ = R(V.Y(wy + OY)), x1 = R(V.X(wx + w - OX)), y1_ = R(V.Y(wy + h + OY)); g.rect(x0, y0_, Math.max(1, x1 - x0), Math.max(1, y1_ - y0_), col); };
  for (let i = 0; i < 18; i++) { const ph = (t * 0.35 + rnd(i * 7 + 3)) % 1, yy = y1 + 8 + ph * (430 - y1 - 8), k = (yy - y1) / (430 - y1), w = 4 + k * k * 40, sx = R(streamX(yy) + (rnd(i * 5) - 0.5) * w * 1.4); const a = Math.min(1, ph * 8, (1 - ph) * 8); const g = fade(c, a); P(g, sx, R(yy), 1, 1, "#FFFFFF"); if (k > 0.3) P(g, sx + 1, R(yy), 1, 1, "#D8F4FF"); }
  for (let dx = -9; dx <= 9; dx++) { P(c, fx - 3 + dx, y0, 1, 1, "#FFFFFF"); if (Math.abs(dx) < 7) P(c, fx - 3 + dx, y0 + 1, 1, 1, "#E8F8FF"); }
  for (let i = 0; i < 28; i++) { const ph = (t * 0.9 + rnd(i * 3)) % 1, mx = fx + (rnd(i * 7) - 0.5) * 64, my = y1 - 4 - ph * 28, g = fade(c, Math.min((1 - ph) * 0.85, ph * 6)); P(g, R(mx), R(my), 2 + (i % 2), 2, "#F4FCFF"); }
  for (let dx = -30; dx <= 30; dx++) { const yy = y1 - 2 + R(Math.sin(dx * 0.6 + t * 9) * 1.2); P(c, fx + dx, yy, 1, 1, "#FFFFFF"); if (Math.abs(dx) < 22) P(c, fx + dx, yy - 1, 1, 1, "#E8F8FF"); }
}

export default {
  kind: "mountains",
  backdrop: true,
  covers: ["mountains"],
  source: "animals-heart/film/levels/gorge.mjs#back",
  desc: "sunny mountain valley: sandstone cliffs, snowy blue peaks, green meadow, waterfall and pool",
  theme: { accent: "#F08A3C", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#2E1E22", "#4A3032", "#1E1418"], beam: "#F7C86A" },
  draw(c, cam, t) {
    if (!L) L = buildGorge();
    const V = layer(cam, 1);
    sky(c, V, t);
    blit(c, L.BACK, V);
    waterfall(c, V, t);
  },
  front(c, cam, t) {
    if (!L) L = buildGorge();
    blit(c, L.FRONT, layer(cam, 1));
  },
  notes: "Film gorge layers at 1×, nearest-sampled through the camera (non-integer zoom makes pixel columns uneven). Wide shot: valley floor line y 565, walls at the left edge (x 0–150) and right (x 370–540), the waterfall falls at x≈360 from the right wall's notch, snow-tipped peaks in the gap. Not ported: hummingbird, heart pickups, farm/sea seams. Cliff palette is brown/sandstone, props with brown outlines need their own dark outline to read.",
};
