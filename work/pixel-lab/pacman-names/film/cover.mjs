// Cover for «Pac-Man's ghost names got lost in translation» (1080×1920): kicker y300, two-line pixel title ≤590,
// scene 590–1490, avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex } from "../../../../renderer/pixel/raster.mjs";
import { drawMaze, drawGhost, toS } from "./sprites.mjs";
import { DOTS } from "./maze.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", p6 = "#8D59DA", PK = "#E03056";
const GC = { red: "#FF4D5E", pink: "#FF9FD6", blue: "#45E3FF", orange: "#FFA638" };
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);

// scene: a dimmed stretch of the maze; the four ghosts in a row, the English name above, the Japanese word below
const wv = new Canvas(540, 960, K), cam = { cx: 10.5, cy: 14 + (380 - 520) / 30, z: 30 };
drawMaze(wv, cam, 0.3, { list: DOTS, alpha: () => 1, blink: () => 1 });
for (let i = 0; i < wv.d.length; i++) wv.d[i] = Math.round(wv.d[i] * 0.45);
const G4 = [["red", "BLINKY", "OIKAKE", "CHASER"], ["pink", "PINKY", "MACHIBUSE", "AMBUSHER"], ["blue", "INKY", "KIMAGURE", "MOODY"], ["orange", "CLYDE", "OTOBOKE", "PLAYS DUMB"]];
G4.forEach(([n], i) => { const gx = 72 + i * 132, gy = 500, z = 58; drawGhost(wv, { cx: -(gx - 270) / z, cy: -(gy - 380) / z, z }, 0, 0, n, [0, 0.6], 0.2 + i * 0.3); });
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3; c.px(x, y, [wv.d[i], wv.d[i + 1], wv.d[i + 2]]); }
const ctext = (s, cx, y, col, scale) => { const w = c.measure(MAIN, s, { scale }); c.text(MAIN, s, R(cx - w / 2) + 1, y + 1, O, { scale }); c.text(MAIN, s, R(cx - w / 2), y, col, { scale }); return w; };
G4.forEach(([n, en, jp, mean], i) => { const cx = 72 + i * 132; ctext(en, cx, 404, GC[n], 2); ctext(jp, cx, 566, Y, 2); ctext(mean, cx, 588, IV, 2); });
// the U.S. words, crossed out, above the names
[["SHADOW"], ["SPEEDY"], ["BASHFUL"], ["POKEY"]].forEach(([w], i) => { const cx = 72 + i * 132, ww = ctext(w, cx, 372, "#9AA0C8", 2); c.rect(R(cx - ww / 2) - 2, 377, ww + 4, 2, PK); });
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const k = y < 330 ? (y - 295) / 35 : y < 715 ? 1 : (745 - y) / 30; if (k <= bayer(x, y)) c.px(x, y, K); }
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("PAC-MAN SECRET", 270, 150, L, p6);
const o5 = { scale: 5, shadow: p3, shadowOffset: 2 }, o4 = { scale: 4, shadow: p3, shadowOffset: 2 }, t1 = "GHOST NAMES", t2 = "LOST IN TRANSLATION";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o5) / 2), 194, Y, o5);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o4) / 2), 246, IV, o4);
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
