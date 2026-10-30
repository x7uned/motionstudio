// catalog-v1 backdrop «city-skyline»: the distant dawn skyline of the speed film (animals-speed/film/levels/city-sky.mjs
// drawFar, copy in lib/speed-skyline.mjs): 22 mauve tower blocks with a warm sunrise rim, sparse lit windows and
// spires whose red aircraft beacons pulse slowly. Catalog additions: a pale dawn sky gradient behind, a dark rooftop band
// below the skyline (the film's skyline ends on the ground), the painting sampled nearest through the camera.
import { farLayer, FAR, CX0 } from "./lib/speed-skyline.mjs";
import { layer, band, clamp01 } from "../engine/layout.mjs";
import { hex, mix } from "../../../../renderer/pixel/raster.mjs";

const SKY = ["#7E9CD2", "#9CB0DC", "#BCC0E0", "#D8C8DE", "#EBCDD6", "#F6D8D0"].map(hex);
const ROOF = ["#4A3A5E", "#3A2E4E", "#2A2140"].map(hex);
const WXO = -270, WYO = -20;          // layer (lx, ly) → catalog world: wx = lx + WXO, wy = ly + WYO (skyline base y 580)
const P = 0.85, BASE = 600 + WYO;
let LY = null;

export default {
  kind: "city-skyline",
  backdrop: true,
  covers: ["city-skyline"],
  source: "animals-speed/film/levels/city-sky.mjs#drawFar",
  desc: "distant dawn city skyline: tower blocks, lit windows, spires with red beacons",
  theme: { accent: "#F08A3C", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#2A2140", "#3A2E4E", "#1E1832"], beam: "#F7B04A" },
  draw(c, cam, t) {
    if (!LY) LY = farLayer(false);
    const L = layer(cam, P), sd = LY.c.d, m = LY.m, W = LY.w, H = LY.h, d = c.d, GW = c.w, GH = c.h;
    const CX = new Int32Array(GW);
    for (let x = 0; x < GW; x++) CX[x] = Math.max(0, Math.min(W - 1, Math.floor(L.wx(x + 0.5) - WXO)));
    for (let y = 0; y < GH; y++) {
      const wy = L.wy(y + 0.5), ly = Math.floor(wy - WYO), sv = clamp01((wy + 100) / 700);
      for (let x = 0; x < GW; x++) {
        const q = (y * GW + x) * 3;
        let col = null;
        if (ly >= 0 && ly < H) { const li = ly * W + CX[x]; if (m[li]) { const p = li * 3; d[q] = sd[p]; d[q + 1] = sd[p + 1]; d[q + 2] = sd[p + 2]; continue; } }
        if (ly >= H) col = band(ROOF, clamp01((ly - H) / 260), x, y); else col = band(SKY, sv, x, y);
        d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2];
      }
    }
    // aircraft beacons on the spires: slow smooth pulse (film code)
    for (let i = 0; i < FAR.length; i++) {
      const [a, b, top, spire] = FAR[i]; if (!spire) continue;
      const sx = Math.round(L.X(CX0 + Math.round((a + b) / 2) + WXO)), sy = Math.round(L.Y(top - spire + WYO)), z = Math.max(1, Math.round(L.z));
      if (sx < 1 || sx > c.w - 2) continue;
      const p = 0.5 + 0.5 * Math.sin(t * 3.1 + i * 1.7), col = mix("#5A1A2A", "#FF4A4A", p);
      for (let k = 0; k < z; k++) for (let j = 0; j < z; j++) c.px(sx + k, sy - 1 - j, col);
      if (p > 0.55) { const g = mix(c.get(sx - 1, sy - 1), "#FF6A5A", (p - 0.55) * 1.6), h = mix(c.get(sx + z, sy - 1), "#FF6A5A", (p - 0.55) * 1.6); c.px(sx - 1, sy - 1, g); c.px(sx + z, sy - 1, h); }
    }
  },
  notes: "Skyline base y 580 (wide); tower tops y 270-470 so the middle slot area sits against buildings (calm mauve, windows sparse). Camera sampled nearest at 1x (close-ups enlarge pixels). Dawn palette only. Beacon pulse is a continuous sine.",
};
