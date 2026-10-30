// catalog-v1 backdrop «snow»: a snowy dawn, re-laid out from work/pixel-lab/animals-heart/film/levels/snow.mjs#back (the film's
// cutaway winter: pink-lit and lavender far mountains with snowy crests, near white hills with tiny pines, big snow-laden
// pines, a snow top over frozen soil, clay and granite blocks, and the falling snow). The groundhog, burrow, shore and
// thermometer are not used. Drawing code is copied in lib/snow-kit.mjs; the mountains are re-placed (tall at the sides,
// low in the middle) and the snow top sits at stage y 565 (film y −20 + 585).
import { bayer } from "../../../../renderer/pixel/raster.mjs";
import { layer, ramp } from "../engine/layout.mjs";
import { makeCache, rnd, sm, R } from "./lib/sea-kit.mjs";
import { G, GY, ground, pine, snowT } from "./lib/snow-kit.mjs";

const OFF = -585, WX0 = -170, WX1 = 710, WY0 = -785, H = 1300;     // stage y = wy + 585
const SKY = ["#6F7FC8", "#8E92D2", "#B7A6DC", "#E2B8D6", "#F6CCD2", "#FFE2D6"];
const PEAKS = [[-30, 236, 1.1], [60, 190, 1.05], [140, 112, 1.1], [270, 62, 1.2], [400, 120, 1.1], [478, 205, 1.0], [560, 256, 0.95], [640, 190, 1.0]];
function peakAt(x) { let best = -1e9, pk = null; for (const p of PEAKS) { const h = p[1] - Math.abs(x - p[0]) * p[2] - 8 * Math.sin(x * 0.11 + p[0]) * (Math.abs(x - p[0]) > 14 ? 0.35 : 0); if (h > best) { best = h; pk = p; } } return [best, pk]; }
const nearRidge = (x) => -20 - (34 + 14 * Math.sin(x * 0.021 + 1.3) + 8 * Math.sin(x * 0.07));
let K = null;

function build() {
  const k = makeCache(WX0, WY0, WX1 - WX0, H), g = k.g;
  for (let y = WY0; y < -20; y++) { const v = (y + 585) / 585; for (let x = WX0; x < WX1; x++) g.px(x, y, ramp(SKY, v, x, y)); }
  for (let x = WX0; x < WX1; x++) {
    // far mountains: pink-lit on the faces toward the sun, lavender in shadow, snowy crests
    const [h, pk] = peakAt(x), top = R(-24 - Math.max(0, h)), lit = pk ? x > pk[0] : false;
    for (let y = top; y < -20; y++) {
      const v = (y - top) / Math.max(1, -20 - top), cap = pk ? y < -24 - pk[1] * 0.62 + 6 * Math.sin(x * 0.3) : false;
      let col = lit ? (v < 0.4 ? "#F2CCD8" : v < 0.55 ? ((v - 0.4) / 0.15 > bayer(x, y) ? "#D6BCD8" : "#F2CCD8") : "#D6BCD8") : v < 0.5 ? "#B6A8D8" : "#A698CC";
      if (cap) col = lit ? "#FFF2F2" : "#D8D0F0";
      if (y < top + 1) col = lit ? "#FFFFFF" : "#E8E2F8";
      g.px(x, y, col);
    }
  }
  for (let x = WX0; x < WX1; x++) {
    // near snowy hills with tiny pines
    const top = R(nearRidge(x));
    for (let y = top; y < -18; y++) { const v = (y - top) / Math.max(1, -18 - top); g.px(x, y, y === top ? "#FFFFFF" : v < 0.3 ? "#F4EEF8" : v < 0.65 ? (v - 0.3 > bayer(x, y) * 0.35 ? "#E2DCF0" : "#F4EEF8") : "#D4CEEA"); }
  }
  for (let i = 0; i < 34; i++) { const x = WX0 + 20 + rnd(i * 3 + 1) * (WX1 - WX0 - 40); if (x > 90 && x < 450 && i % 2) continue; const b = nearRidge(x) + 4 + rnd(i) * 10, h = 14 + rnd(i * 5) * 16; for (let j = 0; j < h; j++) { const half = R((j / h) * (3 + h * 0.18)); g.rect(R(x) - half, R(b - h + j), half * 2 + 1, 1, j < 2 ? "#E8E4F4" : j % 4 === 0 ? "#3A5A6A" : "#2A4656"); } }
  // ground: snow over frozen soil, clay and granite blocks, down to the bottom edge
  for (let x = WX0; x < WX1; x++) for (let y = Math.ceil(G(x)); y < WY0 + H; y++) g.px(x, y, ground(x, y));
  // big pines on the cut plane at both sides
  pine(g, 14, GY - 2, 232, 54, 1); pine(g, -50, GY - 4, 168, 40, 2); pine(g, 512, GY - 2, 252, 58, 3); pine(g, 580, GY, 186, 44, 4); pine(g, -2, GY, 110, 28, 5); pine(g, 492, GY, 100, 26, 6);
  return k;
}

function blit(c, V, Kc, sentinel = true) {
  const x0 = Math.max(0, Math.floor(V.X(Kc.x0))), x1 = Math.min(c.w, Math.ceil(V.X(Kc.x0 + Kc.w))), y0 = Math.max(0, Math.floor(V.Y(Kc.y0 - OFF))), y1 = Math.min(c.h, Math.ceil(V.Y(Kc.y0 + Kc.h - OFF)));
  if (x0 >= x1 || y0 >= y1) return;
  const s = Kc.cv.d, d = c.d, CW = c.w, xs = new Int32Array(x1 - x0);
  for (let x = x0; x < x1; x++) xs[x - x0] = Math.min(Kc.w - 1, Math.max(0, Math.floor(V.wx(x + 0.5) - Kc.x0)));
  for (let y = y0; y < y1; y++) {
    const j = Math.floor(V.wy(y + 0.5) + OFF - Kc.y0); if (j < 0 || j >= Kc.h) continue;
    for (let x = x0; x < x1; x++) { const a = (j * Kc.w + xs[x - x0]) * 3; if (sentinel && s[a] === 1 && s[a + 1] === 2 && s[a + 2] === 3) continue; const b = (y * CW + x) * 3; d[b] = s[a]; d[b + 1] = s[a + 1]; d[b + 2] = s[a + 2]; }
  }
}

export default {
  kind: "snow",
  backdrop: true,
  covers: ["snow"],
  source: "animals-heart/film/levels/snow.mjs#back",
  desc: "snowy dawn: pink mountains, snow-laden pines, frozen ground, falling snow",
  theme: { accent: "#FFB4C4", gold: "#F4CA50", hot: "#FFFFFF", core: "#FFFFFF", stone: ["#3E4558", "#50586C", "#2A3042"], beam: "#FFE2D6" },
  draw(c, cam, t) {
    K ??= build();
    const V = layer(cam, 1);
    blit(c, V, K, false);
    // falling snow: world-anchored, looping (as the film's snowfall); each flake fades out before it reaches the snow top
    const z = Math.max(1, Math.round(V.z));
    for (let i = 0; i < 220; i++) {
      const sp = 22 + rnd(i * 7) * 30, x0 = WX0 + rnd(i * 3 + 1) * (WX1 - WX0), span = 1250;
      const wy = -800 + ((rnd(i * 11) * span + (t + 30) * sp) % span), wx = x0 + Math.sin((t + 30) * (0.6 + rnd(i) * 0.8) + i) * 8;
      const a = 1 - sm(wy, G(wx) - 40, G(wx) - 4); if (a <= 0) continue;
      const sx = Math.round(V.X(wx)), sy = Math.round(V.Y(wy + 585)); if (sx < 0 || sx >= c.w || sy < 0 || sy >= c.h || a <= bayer(sx, sy)) continue;
      const size = rnd(i * 17);
      if (size < 0.2) { c.rect(sx - z, sy, 3 * z, z, "#FFFFFF"); c.rect(sx, sy - z, z, 3 * z, "#FFFFFF"); }
      else if (size < 0.65) { c.rect(sx, sy, 2 * z, 2 * z, "#FFFFFF"); c.rect(sx + z, sy + z, z, z, "#C8C8F0"); }
      else c.rect(sx, sy, z, z, "#FFFFFF");
    }
  },
  notes: "Film layers re-placed for the stage (mountains low in the middle, tall pines at the edges, snow top at y 565, frozen soil/clay/granite to the bottom edge). Sky is a pastel dawn ramp (the film's sky comes from its world renderer). Flakes dissolve (dither) before the ground, so nothing vanishes in one frame. The groundhog, burrow, shore and thermometer are omitted.",
};
