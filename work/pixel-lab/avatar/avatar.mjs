// Pixel profile picture: the channel character (face + upper body from the outro sprite, ×2 nearest) on a dark space
// background with a nebula and stars (no planet), close-up so the figure fills the frame with small margins. 360×360 grid ×3 = 1080×1080.
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, mix, bayer } from "../../../renderer/pixel/raster.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const N = 360, rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

async function make(name, row, col) {
  const c = new Canvas(N, N, "#05030C");
  // deep space gradient (banded + dithered)
  const cols = ["#05030C", "#0A0618", "#120A26", "#1A1034", "#22143E"];
  for (let y = 0; y < N; y++) { const k = (y / N) * (cols.length - 1), i = Math.floor(k); for (let x = 0; x < N; x++) c.px(x, y, k - i > bayer(x, y) ? cols[Math.min(cols.length - 1, i + 1)] : cols[i]); }
  // nebula clouds
  const cloud = (cx, cy, rx, ry, col, a) => c.tint(cx - rx, cy - ry, rx * 2, ry * 2, (x, y) => { const d = Math.hypot((x - cx) / rx, (y - cy) / ry); return d < 1 ? a * (1 - d) * (0.7 + 0.3 * Math.sin(x * 0.21 + y * 0.13)) : 0; }, col, 4);
  cloud(80, 90, 120, 66, "#5A2E8A", 0.55); cloud(280, 66, 106, 60, "#7A2E6A", 0.4); cloud(200, 160, 146, 80, "#3B2470", 0.45);
  // stars: dust, bright and a few twinkles
  for (let i = 0; i < 160; i++) { const x = Math.floor(rnd(i * 2 + 1) * N), y = Math.floor(rnd(i * 2 + 2) * N); c.px(x, y, i % 9 === 0 ? "#FDFEED" : i % 4 === 0 ? "#B08AE8" : "#5E5478"); }
  for (const [x, y, col] of [[46, 40, "#FDFEED"], [310, 128, "#FAE375"], [262, 30, "#E0CDF8"], [30, 200, "#E0CDF8"], [334, 224, "#FDFEED"], [70, 262, "#FAE375"]]) {
    c.px(x, y, col); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.px(x + dx, y + dy, mix(col, "#05030C", 0.35)); for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) c.px(x + dx, y + dy, mix(col, "#05030C", 0.7));
  }
  // character: face + upper body, ×2 nearest, with a dark outline and a soft purple glow
  const { data, info } = await sharp(SHEET).extract({ left: col * 192 + 46, top: row * 208 + 4, width: 100, height: 124 }).resize(300, 372, { kernel: "nearest" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, ox = Math.round((N - W) / 2), oy = 20;
  const on = (i, j) => i >= 0 && j >= 0 && i < W && j < H && data[(j * W + i) * 4 + 3] >= 128;
  for (let j = -6; j < H + 6; j++) for (let i = -6; i < W + 6; i++) {
    if (on(i, j)) continue; let d = 99; for (let b = -5; b <= 5; b++) for (let a = -5; a <= 5; a++) if (on(i + a, j + b)) d = Math.min(d, Math.hypot(a, b));
    if (d <= 1.5) c.px(ox + i, oy + j, "#0B0812"); else if (d <= 5 && (5 - d) / 4 * 0.5 > bayer(ox + i, oy + j)) c.px(ox + i, oy + j, mix(c.get(ox + i, oy + j), "#8D59DA", 0.6));
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (on(i, j)) { const k = (j * W + i) * 4; c.px(ox + i, oy + j, [data[k], data[k + 1], data[k + 2]]); }
  await c.save(HERE + name, 3);
  console.log(name);
}
await make("avatar-pixel-space.png", 6, 2);
