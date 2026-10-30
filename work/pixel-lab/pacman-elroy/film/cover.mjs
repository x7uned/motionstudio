// Cover for «Pac-Man's red ghost gets faster when you're almost done» (1080×1920): kicker y300, two-line pixel title
// ≤590, scene 590–1490, avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex } from "../../../../renderer/pixel/raster.mjs";
import { drawMaze, drawPac, drawGhost, toS } from "./sprites.mjs";
import { DOTS } from "./maze.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", p6 = "#8D59DA", PK = "#E03056", RED = "#FF4D5E";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);

// scene: the bottom corridor near the end of a level — 3 dots left ahead of Pac-Man, Blinky (Elroy) right behind him
const wv = new Canvas(540, 960, K), cam = { cx: 10.0, cy: 22.6 + (380 - 520) / 40, z: 40 };
const keep = new Set(["15,24", "17,24", "19,24"]);
drawMaze(wv, cam, 0.3, { list: DOTS, alpha: (d) => (keep.has(`${d.x},${d.y}`) ? 1 : 0), blink: () => 1 });
const pac = [12.6, 24.5], red = [8.6, 24.5];
drawGhost(wv, cam, red[0], red[1], "red", [1, 0], 0.45);
// speed lines behind Blinky
for (let i = 0; i < 3; i++) { const [x0, y0] = toS(cam, red[0] - 0.9, red[1] + (i - 1) * 0.36), len = 1.4 - i * 0.2; for (let k = 0; k < len * 40; k += 2) wv.rect(R(x0 - k), R(y0), 2, 2, k < 18 ? "#FFC2C2" : "#F2283C"); }
// his frown
{ const [X, Y0] = toS(cam, red[0], red[1]); for (const s of [-1, 1]) for (let k = 0; k <= 8; k++) wv.rect(R(X + s * (5 + k)), R(Y0 - 20 + k * 0.45), 2, 2, "#5C0F1E"); }
drawPac(wv, cam, pac[0], pac[1], 0, 0.85);
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3; c.px(x, y, [wv.d[i], wv.d[i + 1], wv.d[i + 2]]); }
// the counter and the two speeds over the scene
const box = (x, y, w, h, edge) => { c.rrect(x, y, w, h, edge, 2); c.rrect(x + 2, y + 2, w - 4, h - 4, CARD, 2); };
box(30, 320, 190, 96, Y); c.text(MAIN, "DOTS LEFT", 46, 334, L, { scale: 2 }); c.text(MAIN, "3", 46, 356, PK, { scale: 7 });
box(240, 320, 270, 96, Y);
const bar = (y, lab, v, col) => { c.text(MAIN, lab, 254, y, col, { scale: 2 }); c.rect(338, y - 1, 120, 14, "#2A1F48"); c.rect(338, y - 1, R(120 * v / 100), 14, col); c.text(MAIN, String(v), 466, y, IV, { scale: 2 }); };
bar(340, "YOU", 80, "#FFD000"); bar(372, "BLINKY", 85, RED);
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const k = y < 330 ? (y - 295) / 35 : y < 715 ? 1 : (745 - y) / 30; if (k <= bayer(x, y)) c.px(x, y, K); }
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("PAC-MAN SECRET", 270, 150, L, p6);
const o5 = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "RED GETS FASTER", t2 = "AT THE END";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o5) / 2), 194, RED, o5);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o5) / 2), 244, IV, o5);
const chip = "CRUISE ELROY", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
const AX = R(270 - (38 + 10 + HW + 12 + CW) / 2), ROW = 772;
c.text(MAIN, "@KAGENAMI_AI", AX + 48, ROW + 12, IV, { scale: 2 });
{ const x = AX + 48 + HW + 12; c.rrect(x, ROW + 6, CW, 26, RED, 2); c.rrect(x + 2, ROW + 8, CW - 4, 22, CARD, 2); c.text(MAIN, chip, x + 14, ROW + 12, RED, { scale: 2 }); }
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
