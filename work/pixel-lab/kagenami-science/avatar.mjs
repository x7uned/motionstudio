// @kagenami_science avatar: the channel character in a lab coat + goggles (coat.mjs) on a night-lab background:
// dithered navy gradient, faint graph-paper grid, atom orbits behind the head, two small molecules, sparkles.
// Same framing as work/pixel-lab/avatar/avatar.mjs (360×360 grid ×3 = 1080×1080, sprite ×3 at 30,20).
import { fileURLToPath } from "node:url";
import { Canvas, mix, bayer } from "../../../renderer/pixel/raster.mjs";
import { coatSprite, SW, SH } from "./coat.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const N = 360, rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const CYAN = "#5FE3F0", CYAN_D = "#2A8FB0", VIOLET = "#B48CF0", BG0 = "#05040E";

export function scienceBackground(c, w, h, { orbitC = [w / 2, h * 0.36], orbitR = 168, seed = 0 } = {}) {
  const cols = ["#05040E", "#080A1C", "#0C1029", "#111536", "#161A42"];
  for (let y = 0; y < h; y++) { const k = (y / h) * (cols.length - 1), i = Math.floor(k); for (let x = 0; x < w; x++) c.px(x, y, k - i > bayer(x, y) ? cols[Math.min(cols.length - 1, i + 1)] : cols[i]); }
  // graph paper: faint lines every 15 px, a brighter one every 60
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const major = x % 60 === 0 || y % 60 === 0, minor = x % 15 === 0 || y % 15 === 0;
    if (major) c.px(x, y, mix(c.get(x, y), CYAN_D, 0.22)); else if (minor && (x + y) % 2 === 0) c.px(x, y, mix(c.get(x, y), CYAN_D, 0.12));
  }
  // soft glows behind the figure
  const glow = (cx, cy, rx, ry, col, a) => c.tint(cx - rx, cy - ry, rx * 2, ry * 2, (x, y) => { const d = Math.hypot((x - cx) / rx, (y - cy) / ry); return d < 1 ? a * (1 - d) : 0; }, col, 4);
  glow(orbitC[0], orbitC[1] + 40, orbitR * 1.0, orbitR * 0.8, "#4A2A8A", 0.55); glow(orbitC[0] - 60, orbitC[1] - 30, orbitR * 0.7, orbitR * 0.45, "#16607A", 0.4);
  // sparkles
  for (let i = 0; i < Math.round(w * h / 900); i++) { const x = Math.floor(rnd(seed + i * 2 + 1) * w), y = Math.floor(rnd(seed + i * 2 + 2) * h); c.px(x, y, i % 9 === 0 ? "#FDFEED" : i % 3 === 0 ? "#7FD8E8" : "#4A4A72"); }
}

export function atom(c, cx, cy, r, { tilt = 0.33, electrons = [0.3, 2.4, 4.4], thick = 2, spread = Math.PI / 3 } = {}) {
  for (const [k, rot] of [[0, 0], [1, spread], [2, -spread]]) {
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let t = 0; t < Math.PI * 2; t += 0.6 / r) {
      const ex = Math.cos(t) * r, ey = Math.sin(t) * r * tilt, x = cx + ex * cr - ey * sr, y = cy + ex * sr + ey * cr;
      const back = Math.sin(t) < 0, col = k === 0 ? CYAN : k === 1 ? VIOLET : "#7FB8FF";
      for (let a = 0; a < thick; a++) for (let b = 0; b < thick; b++) { const X = Math.round(x) + a, Y = Math.round(y) + b; c.px(X, Y, back ? mix(col, c.get(X, Y), 0.55) : col); }
    }
    const t = electrons[k], ex = Math.cos(t) * r, ey = Math.sin(t) * r * tilt, x = Math.round(cx + ex * cr - ey * sr), y = Math.round(cy + ex * sr + ey * cr);
    c.disc(x, y, thick + 4, mix(c.get(x, y), CYAN, 0.35)); c.disc(x, y, thick + 2, mix("#FDFEED", CYAN, 0.3)); c.disc(x, y, thick, "#FDFEED");
    for (let a = -2; a <= 2; a++) { c.px(x + a * 4, y, mix("#FDFEED", c.get(x + a * 4, y), 0.3)); }
  }
}

export function molecule(c, x, y, s, col) { // benzene-ish hexagon ring with two bonds out
  const pts = [...Array(6)].map((_, i) => [x + Math.cos(i * Math.PI / 3 + Math.PI / 6) * s, y + Math.sin(i * Math.PI / 3 + Math.PI / 6) * s]);
  for (let i = 0; i < 6; i++) c.line(Math.round(pts[i][0]), Math.round(pts[i][1]), Math.round(pts[(i + 1) % 6][0]), Math.round(pts[(i + 1) % 6][1]), col);
  const [ax, ay] = pts[0], [bx, by] = pts[3];
  c.line(Math.round(ax), Math.round(ay), Math.round(ax + s * 0.8), Math.round(ay + s * 0.45), col); c.line(Math.round(bx), Math.round(by), Math.round(bx - s * 0.8), Math.round(by - s * 0.45), col);
  for (const [px, py] of pts) c.disc(Math.round(px), Math.round(py), 1, "#FDFEED");
}

// character ×k nearest with dark outline and a soft violet glow
export async function drawCharacter(c, ox, oy, k = 3) {
  const src = await coatSprite();
  const W = SW * k, H = SH * k, on = (i, j) => i >= 0 && j >= 0 && i < W && j < H && src[(Math.floor(j / k) * SW + Math.floor(i / k)) * 4 + 3] >= 128;
  for (let j = -6; j < H + 6; j++) for (let i = -6; i < W + 6; i++) {
    if (on(i, j)) continue; let d = 99; for (let b = -5; b <= 5; b++) for (let a = -5; a <= 5; a++) if (on(i + a, j + b)) d = Math.min(d, Math.hypot(a, b));
    if (d <= 1.5) c.px(ox + i, oy + j, "#0B0812"); else if (d <= 5 && (5 - d) / 4 * 0.5 > bayer(ox + i, oy + j)) c.px(ox + i, oy + j, mix(c.get(ox + i, oy + j), "#8D59DA", 0.6));
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (on(i, j)) { const q = (Math.floor(j / k) * SW + Math.floor(i / k)) * 4; c.px(ox + i, oy + j, [src[q], src[q + 1], src[q + 2]]); }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const c = new Canvas(N, N, BG0);
  scienceBackground(c, N, N, { orbitC: [180, 132], orbitR: 150 });
  atom(c, 178, 132, 172, { tilt: 0.3, electrons: [0.25, 3.6, 5.5], thick: 2, spread: 0.62 });
  molecule(c, 52, 268, 13, "#4FB9D6"); molecule(c, 300, 292, 10, "#9A78D8");
  await drawCharacter(c, 30, 20);
  await c.save(HERE + "avatar.png", 3);
  console.log("avatar.png");
}
