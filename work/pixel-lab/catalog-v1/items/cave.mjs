// catalog-v1 backdrop «cave»: the bat level's rocky hill and cave mouth of the animals-speed film (animals-speed/film/levels/
// cave.mjs#back, copy in lib/speed-cave.mjs): a purple boulder hill with a deep dark arch (stalactites, rim stones), glowing
// amethyst/teal crystals in the earth strata, golden savanna grass at the left edge, night grass tufts, a low stone wall and a
// street lamp (warm glow) at the right edge, glinting eyes in the dark mouth, dark boulders in the bottom corners.
// Catalog changes: ground line at y 560, strip wider than the frame, no bat/viaduct/far city/time-of-day grade; the film's
// night sky is redrawn as a deep-blue gradient with soft twinkling stars and a moon in the upper right.
import { layer, ramp, clamp01 } from "../engine/layout.mjs";
import { bayer, hex } from "../../../../renderer/pixel/raster.mjs";
import { caveLayers, OY } from "./lib/speed-cave.mjs";

const SKY = ["#07061A", "#0E0C2C", "#171540", "#241F58", "#352E70", "#4A4388"].map(hex);
const R = Math.round;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const blink = (t, every, ph) => { const p = (((t + ph) % every) + every) % every, d = 0.5; return p < d ? Math.sin((Math.PI * p) / d) : 0; };

function blit(c, Ly, V, sky) {
  const sd = Ly.c.d, m = Ly.c.m, W = Ly.c.w, H = Ly.c.h, d = c.d, GW = c.w, GH = c.h;
  const CX = new Int32Array(GW);
  for (let x = 0; x < GW; x++) CX[x] = Math.max(0, Math.min(W - 1, Math.floor(V.wx(x + 0.5)) - Ly.wx0));
  for (let y = 0; y < GH; y++) {
    const wy = V.wy(y + 0.5), ry = Math.floor(wy) - Ly.wy0, inside = ry >= 0 && ry < H, row = ry * W, sv = clamp01((wy - 20) / 560);
    for (let x = 0; x < GW; x++) {
      const q = (y * GW + x) * 3;
      if (inside) { const li = row + CX[x]; if (m[li]) { const p = li * 3; d[q] = sd[p]; d[q + 1] = sd[p + 1]; d[q + 2] = sd[p + 2]; continue; } }
      if (!sky) continue;
      const col = ramp(SKY, sv, x, y); d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2];
    }
  }
}
function night(c, V, t) {
  // stars: world anchored, each twinkles slowly through the dither (never fully off together)
  for (let i = 0; i < 70; i++) {
    const wx = -40 + rnd(i * 3 + 1) * 620, wy = rnd(i * 3 + 2) * 330; if (wy > 330) continue;
    const a = 0.55 + 0.45 * Math.sin(t * (0.5 + rnd(i) * 0.9) + i * 1.7), x = R(V.X(wx)), y = R(V.Y(wy));
    if (x < 0 || x >= c.w || y < 0 || y >= c.h || a <= bayer(x, y) * 0.9 || wy > 330) continue;
    c.px(x, y, i % 5 === 0 ? "#FFF2C0" : "#CFCDF4"); if (i % 9 === 0 && V.z > 1.3) { c.px(x - 1, y, "#8F8CC8"); c.px(x + 1, y, "#8F8CC8"); c.px(x, y - 1, "#8F8CC8"); c.px(x, y + 1, "#8F8CC8"); }
  }
  // moon
  const mx = V.X(430), my = V.Y(150), r = 26 * V.z;
  for (let y = R(my - r); y <= R(my + r); y++) for (let x = R(mx - r); x <= R(mx + r); x++) {
    if (x < 0 || x >= c.w || y < 0 || y >= c.h) continue;
    const dx = (x - mx) / r, dy = (y - my) / r, q = dx * dx + dy * dy; if (q > 1) continue;
    const cut = ((x - mx - r * 0.38) / r) ** 2 + ((y - my + r * 0.1) / r) ** 2;   // crescent: a darker disc offset to the right
    if (q <= 1 && cut < 0.82) { const k = 0.82 - cut; if (k * 3 > bayer(x, y)) c.px(x, y, "#2A2658"); else c.px(x, y, "#4A4682"); continue; }
    c.px(x, y, q > 0.8 ? "#C8C4F0" : -dx - dy > 0.2 ? "#FFFBE8" : "#E8E4FA");
  }
}
function lampAndEyes(c, V, t) {
  const lx = V.X(521), ly = V.Y(552 + OY) + 4 * V.z, k = 0.32 + 0.03 * Math.sin(t * 5.3);
  if (lx > -60 && lx < c.w + 60) { const rx = 26 * V.z, ry = 20 * V.z; c.tint(R(lx - rx), R(ly - ry), R(rx * 2) + 1, R(ry * 2) + 1, (X, Y) => { const d = ((X - lx) / rx) ** 2 + ((Y - ly) / ry) ** 2; return d >= 1 ? 0 : k * (1 - d) ** 1.4; }, "#FFC870", 4); }
  for (let i = 0; i < 4; i++) {
    const ex = 230 + i * 26 + R(rnd(i * 3) * 8), ey = 580 + R(rnd(i * 5) * 40), on = 0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.9) - 0.5 * blink(t, 3.4 + i * 0.9, i * 1.3);
    const x = R(V.X(ex)), y = R(V.Y(ey + OY)); if (on <= 0.05 || x < 0 || x >= c.w - 4 || y < 0 || y >= c.h) continue;
    if (on > bayer(x, y)) { c.px(x, y, "#F4D070"); c.px(x + 3, y, "#F4D070"); if (V.z > 1.5) { c.px(x + 1, y, "#F4D070"); c.px(x + 4, y, "#F4D070"); } }
  }
}

export default {
  kind: "cave",
  backdrop: true,
  covers: ["cave"],
  source: "animals-speed/film/levels/cave.mjs#back",
  desc: "moonlit rocky hill with a dark cave mouth, crystals, golden grass, lamp",
  theme: { accent: "#B48AF0", gold: "#F4CA50", hot: "#E8D8FF", core: "#FFF6CE", stone: ["#1A1530", "#2E2548", "#100C20"], beam: "#8A86BE" },
  draw(c, cam, t) { const V = layer(cam, 1), L = caveLayers(); blit(c, L.BACK, V, true); night(c, V, t); lampAndEyes(c, V, t); },
  front(c, cam, t) { const V = layer(cam, 1); blit(c, caveLayers().FRONT, V, false); },
  notes: "Film painting sampled nearest through the camera. Wide shot: ground line y 560, hill + cave mouth across x 20–520 (tops y 340–450), calm night sky above. Eye glints in the cave are tiny (4 px). A dark rock pillar and a stone wall + lamp sit at the right edge (film city edge, no readable text); a brown fade of golden savanna earth on the left edge. Stars and moon are new (film sky was global); the cave interior stays too dark to show a prop inside.",
};
