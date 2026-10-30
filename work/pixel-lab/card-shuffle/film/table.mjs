// The one persistent world: a green card table seen from above (our own drawing). Felt in flat tone bands under a soft
// lamp pool, a little dithered grain, padded rails top and bottom, a printed gold arc and two chip stacks in the bottom
// corners (background only, below the safe zone). Baked once into an offscreen layer and copied each frame.
import { Canvas, bayer, mix } from "../../../../renderer/pixel/raster.mjs";

const W = 540, H = 960, R = Math.round;
const hash = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const FELT = ["#061E15", "#0A2A1D", "#0E3725", "#13452E", "#185338", "#1E6142", "#256F4C", "#2D7D56"];
const WOOD = ["#1E0E06", "#3A1D0C", "#5A2E14", "#7A421E", "#98582A", "#B87038"];
const PAD = ["#0B0812", "#16101F", "#211A2E", "#2E2540", "#3D3254"];
let LAYER = null;
function bake() {
  const c = new Canvas(W, H, FELT[3]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - 270) / 360, dy = (y - 470) / 560, v = 1 - dx * dx - dy * dy;         // lamp pool
    let s = 2.3 + 3.4 * Math.max(0, v), fl = Math.floor(s), f = s - fl;
    let q = f < 0.15 ? fl : f > 0.85 ? fl + 1 : (f - 0.15) / 0.7 > bayer(x, y) ? fl + 1 : fl;
    const g = hash(x * 7919 + y * 104729); if (g < 0.035) q -= 1; else if (g > 0.975) q += 1; // felt grain
    c.px(x, y, FELT[Math.max(0, Math.min(FELT.length - 1, q))]);
  }
  // printed gold arc (like a casino layout), dim, in the bottom background
  for (let i = 0; i <= 1400; i++) { const a = Math.PI * (1.18 + 0.64 * (i / 1400)), x = 270 + Math.cos(a) * 470, y = 1240 + Math.sin(a) * 470; if (y < 960 && (i % 9) < 6) { c.px(R(x), R(y), mix(FELT[4], "#C8A048", 0.55)); c.px(R(x), R(y) + 1, mix(FELT[3], "#8A6A2A", 0.4)); } }
  // top rail: wood + padded bumper with its shadow on the felt
  for (let y = 0; y < 46; y++) for (let x = 0; x < W; x++) {
    let col;
    if (y < 26) { const band = y < 3 ? 1 : y < 20 ? 3 + ((hash(x * 3 + (y >> 2) * 97) < 0.12) ? -1 : 0) : 2; col = WOOD[band]; if (y === 25) col = WOOD[0]; if ((x + (y >> 3) * 37) % 61 === 0 && y > 4 && y < 20) col = WOOD[2]; }
    else if (y < 40) { const k = (y - 26) / 14, sh = Math.sin(Math.PI * k); col = PAD[Math.min(4, R(1 + sh * 3))]; if (y === 39) col = PAD[0]; }
    else { const k = (y - 40) / 6; if (k > bayer(x, y)) continue; col = mix(c.get(x, y), "#000000", 0.45); }
    c.px(x, y, col);
  }
  // bottom rail: padded bumper + wood
  for (let y = 888; y < H; y++) for (let x = 0; x < W; x++) {
    let col;
    if (y < 894) { const k = (894 - y) / 6; if (k > bayer(x, y)) continue; col = mix(c.get(x, y), "#000000", 0.4); }
    else if (y < 910) { const k = (y - 894) / 16, sh = Math.sin(Math.PI * k); col = PAD[Math.min(4, R(1 + sh * 3))]; if (y === 894) col = PAD[0]; }
    else { col = WOOD[y < 912 ? 1 : 3 + ((hash(x * 5 + (y >> 2) * 131) < 0.12) ? -1 : 0)]; if ((x + (y >> 3) * 53) % 67 === 0) col = WOOD[2]; }
    c.px(x, y, col);
  }
  // chip stacks (bottom corners, background)
  const chip = (cx, cy, base, n) => {
    for (let i = 0; i < n; i++) {
      const y0 = cy - i * 3;
      c.ellipse(cx, y0 + 2, 15, 9, "#000000");
      c.ellipse(cx, y0, 15, 9, mix(base, "#000000", 0.35));
      c.ellipse(cx, y0 - 1, 15, 9, base);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + i * 0.4, x = R(cx + Math.cos(a) * 13), y = R(y0 - 1 + Math.sin(a) * 7.5); c.rect(x - 1, y, 3, 1, "#F2EEE0"); }
    }
    const yt = cy - (n - 1) * 3 - 1; c.ellipse(cx, yt, 9, 5, mix(base, "#FFFFFF", 0.18)); c.ering(cx, yt, 9, 5, mix(base, "#000000", 0.3));
  };
  chip(40, 842, "#B8283A", 6); chip(76, 858, "#2A4FA8", 4); chip(498, 846, "#1E1A2A", 5); chip(466, 864, "#B8283A", 3);
  LAYER = c.d.slice();
}
export function drawTable(c) { if (!LAYER) bake(); c.d.set(LAYER); }
