// The game on the TV: our own marsh scene (not the original background): sky, a far tree line, a pond, reeds and a
// bare tree, in screen game units (256 × 192) mapped into the TV's screen rectangle. Ducks and boxes are drawn on top
// by render.mjs through the same mapping. mode: 0 normal picture, then black/white frames are drawn by render.mjs.
import { bayer, hex, mix } from "./lib/raster.mjs";
import { rnd } from "./lib/ui.mjs";
import { SCR, GW, GH } from "./room.mjs";

export const GWU = 256, GHU = 192, SK = SCR.w / GWU;
/** game units → room world units */
export const g2w = (gx, gy) => [SCR.x + gx * SK, SCR.y + gy * SK];
/** a view that maps game units straight to screen pixels through the room camera V */
export const gview = (V) => ({ z: V.z * SK, X: (gx) => V.X(SCR.x + gx * SK), Y: (gy) => V.Y(SCR.y + gy * SK) });

const SKY = ["#78B4F0", "#8CC2F4", "#A4D0F6", "#C0E0F8"], FAR = ["#3E7A5A", "#4E8E66"], GRASS = ["#2E7A2A", "#3E9A34", "#5EBA44", "#8ED85E"], WATER = ["#3A6AA8", "#4A82C0", "#7AAAD8"];
/** draw the marsh into the screen rectangle (clipped), dim = 0..1 darkening */
export function drawMarsh(c, V, t, dim = 0, mid = null) {
  drawPass(c, V, t, dim, false); if (mid) { mid(); drawPass(c, V, t, dim, true); }
}
function drawPass(c, V, t, dim, frontOnly) {
  const G = gview(V), x0 = Math.max(0, Math.round(V.X(SCR.x))), x1 = Math.min(GW, Math.round(V.X(SCR.x + SCR.w))), y0 = Math.max(0, Math.round(V.Y(SCR.y))), y1 = Math.min(GH, Math.round(V.Y(SCR.y + SCR.h)));
  for (let Y = y0; Y < y1; Y++) { const gy = (Y + 0.5 - G.Y(0)) / G.z;
    for (let X = x0; X < x1; X++) { const gx = (X + 0.5 - G.X(0)) / G.z; let col;
      const tree = 112 + 6 * Math.sin(gx / 9) + 4 * Math.sin(gx / 3.7 + 1) + 3 * Math.sin(gx / 1.9);
      const reed = 150 - 18 * Math.max(0, Math.sin(gx / 2.1) * Math.sin(gx / 5.3 + 0.7)) - 10 * rnd(Math.floor(gx / 1.5));
      if (gy < tree) { const k = gy / tree, q = k * 3, lo = Math.floor(q); col = SKY[Math.min(3, q - lo > bayer(X, Y) ? lo + 1 : lo)]; }
      else if (gy < 132) col = FAR[(gy - tree) / (132 - tree) > 0.5 + (bayer(X, Y) - 0.5) * 0.6 ? 0 : 1];
      else if (gy < reed && gy < 162) { const k = (gy - 132) / 30; col = WATER[Math.min(2, Math.floor((1 - k) * 2.2 + bayer(X, Y) * 0.8))]; if (Math.abs(((gy * 3 + Math.sin(gx / 6 + t) * 2) % 7)) < 0.6) col = "#A8C8EC"; }
      else { if (false) {} const k = Math.min(1, (gy - reed) / 30); col = GRASS[Math.max(0, Math.min(3, Math.floor((1 - k) * 3.2 + bayer(X, Y) * 0.9)))]; if ((gx * 1.3 + gy * 0.2) % 3 < 0.5 && gy > reed + 2) col = GRASS[0]; }
      // a bare tree on the left
      const tx = 40, trunk = Math.abs(gx - tx - (130 - gy) * 0.05) < 3.2 - (130 - gy) * 0.02 && gy > 60 && gy < 150;
      const branch = (gy > 70 && gy < 100 && Math.abs(gy - (100 - (gx - tx) * 0.9)) < 1.6 && gx > tx && gx < tx + 30) || (gy > 80 && gy < 106 && Math.abs(gy - (106 - (tx - gx) * 1.1)) < 1.5 && gx < tx && gx > tx - 22);
      if (trunk || branch) col = gx - tx < -0.5 ? "#5A3A26" : "#7A5236";
      if (frontOnly && !(gy >= 132 && (gy >= reed || gy >= 162))) continue; if (frontOnly && (trunk || branch)) continue;
      const q = hex(dim > 0 ? mix(col, "#000000", dim) : col), i = (Y * GW + X) * 3; c.d[i] = q[0]; c.d[i + 1] = q[1]; c.d[i + 2] = q[2]; } }
}
