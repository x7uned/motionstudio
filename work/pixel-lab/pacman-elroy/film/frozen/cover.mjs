// Cover for «Only the red ghost is chasing you» (1080×1920): kicker y300, two-line pixel title ≤590, scene 590–1490,
// avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawMaze, drawPac, drawGhost, toS } from "./sprites.mjs";
import { DOTS } from "./maze.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", p6 = "#8D59DA", RED = "#FF4D5E";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);

// scene: the top corridor — Pac-Man runs right, Red right behind him and locked on; the other three elsewhere with "?"
const wv = new Canvas(540, 960, K), cam = { cx: 10.5, cy: 5.3 + (380 - 520) / 40, z: 40 };
const eaten = (d) => d.y === 4 && d.x >= 3 && d.x <= 12;
drawMaze(wv, cam, 0.3, { list: DOTS, alpha: (d) => (eaten(d) ? 0 : 1), blink: () => 1 });
const pac = [12.6, 4.5], red = [8.4, 4.5];
drawGhost(wv, cam, 16.6, 6.5, "pink", [-1, 0], 0.3);
drawGhost(wv, cam, 9.5, 7.6, "blue", [0, -1], 0.6);
drawGhost(wv, cam, 5.1, 6.5, "orange", [1, 0], 0.1);
drawGhost(wv, cam, red[0], red[1], "red", [1, 0], 0.45);
drawPac(wv, cam, pac[0], pac[1], 0, 0.85);
// red's lock: dashed line and the crosshair on Pac-Man's square
{ const [x0, y0] = toS(cam, red[0] + 0.7, red[1]), [x1, y1] = toS(cam, pac[0] - 0.9, pac[1]); for (let x = R(x0); x < x1; x++) if (((x - R(x0)) % 10) < 6) wv.rect(x, R(y0) - 1, 1, 3, RED);
  const [tx, ty] = toS(cam, 12, 4), s = cam.z, q = s * 0.62, cx = tx + s / 2, cy = ty + s / 2, Lk = 12; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const X = R(cx + sx * q), Y0 = R(cy + sy * q); wv.rect(sx < 0 ? X : X - Lk, Y0 - (sy < 0 ? 0 : 2), Lk, 3, RED); wv.rect(X - (sx < 0 ? 0 : 2), sy < 0 ? Y0 : Y0 - Lk, 3, Lk, RED); } }
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3; c.px(x, y, [wv.d[i], wv.d[i + 1], wv.d[i + 2]]); }
// question marks over the other three
const q = (wx, wy, col) => { const [x, y] = toS(cam, wx, wy - 1.35); c.text(MAIN, "?", R(x) - 7, R(y) - 10, O, { scale: 4 }); c.text(MAIN, "?", R(x) - 8, R(y) - 11, col, { scale: 4 }); };
q(16.6, 6.5, "#FF9FD6"); q(9.5, 7.6, "#45E3FF"); q(5.1, 6.5, "#FFA638");
// fade the band edges into black
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const k = y < 330 ? (y - 295) / 35 : y < 715 ? 1 : (745 - y) / 30; if (k <= bayer(x, y)) c.px(x, y, K); }
// kicker + title
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("PAC-MAN SECRET", 270, 150, L, p6);
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "ONLY RED", t2 = "CHASES YOU";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, RED, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, IV, o);
// bottom row at y1545 (grid 772): avatar + handle + chip
const chip = "4 GHOSTS 4 RULES", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
const AX = R(270 - (38 + 10 + HW + 12 + CW) / 2), ROW = 772;
c.text(MAIN, "@KAGENAMI_AI", AX + 48, ROW + 12, IV, { scale: 2 });
{ const x = AX + 48 + HW + 12; c.rrect(x, ROW + 6, CW, 26, Y, 2); c.rrect(x + 2, ROW + 8, CW - 4, 22, CARD, 2); c.text(MAIN, chip, x + 14, ROW + 12, Y, { scale: 2 }); }

async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(SHEET).extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null; if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } } else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P); if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; } }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}
const base = HERE + ".cover-base.png";
await c.save(base, S);
await sharp(base).composite([{ input: await avatar(76), left: AX * S, top: ROW * S }]).png().toFile(HERE + "cover.png");
fs.unlinkSync(base);
console.log("cover.png");
