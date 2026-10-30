// catalog-v1 copy (2026-10-26) of animals-speed/film/levels/city-sky.mjs FAR + paintFar (distant skyline, dawn palette).
// Changes: painted into a local roofs-kit Layer (CX0 = 260, CY0 = 0: buildings span x 10..1072, base at y 600); the film's
// night/dawn grade is dropped (dawn palette only); beacons are drawn in items/city-skyline.mjs.
import { Layer } from "./roofs-kit.mjs";
import { rnd } from "../../engine/layout.mjs";
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
const CX0 = 260, CY0 = 0;
export const FAR = [
  [-250, -200, 470, 0], [-205, -160, 452, 0], [-165, -120, 430, 0], [-125, -78, 398, 24], [-82, -40, 440, 0], [-44, 22, 338, 0], [18, 70, 398, 0], [66, 118, 300, 46],
  [114, 166, 420, 0], [162, 206, 456, 0], [202, 244, 474, 0], [240, 302, 488, 0], [298, 342, 466, 0], [338, 378, 432, 0], [374, 424, 362, 0],
  [420, 470, 400, 18], [466, 522, 318, 40], [518, 566, 412, 0], [562, 626, 372, 0], [622, 680, 430, 0], [676, 740, 350, 30], [736, 812, 410, 0],
];
function paintFar(L, night) {
  const g = L.g;
  for (let i = 0; i < FAR.length; i++) {
    const [a, b, top, spire] = FAR[i], x0 = CX0 + a, x1 = CX0 + b, y0 = CY0 + top, yb = CY0 + 600;
    const sunSide = (a + b) / 2 < 270 ? 1 : -1;              // the edge that faces the sunrise gets a warm rim
    for (let y = y0; y < yb; y++) for (let x = x0; x < x1; x++) {
      const h = (y - y0) / (yb - y0);
      let col = night ? (h < 0.5 ? "#1C1A3E" : (h - 0.5) * 2 > bayer(x, y) ? "#24204A" : "#1C1A3E") : (h < 0.35 ? "#8A6A9C" : h < 0.7 ? ((h - 0.35) / 0.35 > bayer(x, y) ? "#9C78A4" : "#8A6A9C") : "#9C78A4");
      const edge = sunSide > 0 ? x === x1 - 1 : x === x0;
      if (y === y0) col = night ? "#3A3466" : "#C89AB0";
      else if (edge) col = night ? "#2C2856" : "#E4AAB0";
      g.px(x, y, col);
    }
    // window grid (sparse, deterministic); night: many warm lights, dawn: a few dim ones left on
    for (let y = y0 + 6; y < yb - 4; y += 7) for (let x = x0 + 4; x < x1 - 4; x += 6) {
      const r = rnd(x * 13 + y * 7 + i), lit = night ? r < 0.34 : r < 0.07;
      if (lit) { const c = night ? (r < 0.08 ? "#FFE8A0" : "#E8B04A") : "#F4C890"; g.px(x, y, c); g.px(x + 1, y, c); g.px(x, y + 1, night ? "#A07A3A" : "#C8A088"); g.px(x + 1, y + 1, night ? "#A07A3A" : "#C8A088"); }
      else if (!night && r > 0.8) { g.px(x, y, "#806494"); g.px(x + 1, y, "#806494"); }
    }
    if (spire) { const sx = Math.round((x0 + x1) / 2); for (let y = y0 - spire; y < y0; y++) g.px(sx, y, night ? "#2C2856" : "#9C78A4"); g.px(sx - 1, y0 - 3, night ? "#2C2856" : "#9C78A4"); g.px(sx + 1, y0 - 3, night ? "#2C2856" : "#9C78A4"); }
  }
}
export function farLayer(night = false) { const L = new Layer(1080, 600); paintFar(L, night); return L; }
export { CX0, CY0 };
