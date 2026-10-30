// Cover for «Pac-Man has a hiding spot the ghosts can't find» (1080×1920): kicker y300, two-line pixel title ≤590,
// scene 590–1490, avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawMaze, drawPac, drawGhost, toS } from "./sprites.mjs";
import { DOTS } from "./maze.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", p6 = "#8D59DA", PK = "#E03056";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);

// scene: the hiding spot — Pac-Man parked facing up, Red right under him on the forbidden tile, Pink above the wall
const wv = new Canvas(540, 960, K), cam = { cx: 11.5, cy: 15.0 + (380 - 520) / 44, z: 44 };
const EATEN = new Set(["10,16", "11,16", "11,15", "11,14", "9,16", "12,16", "13,16", "8,16", "12,14", "13,14", "14,14"]);
drawMaze(wv, cam, 0.3, { list: DOTS, alpha: (d) => (EATEN.has(`${d.x},${d.y}`) ? 0 : 1), blink: () => 1 });
drawGhost(wv, cam, 9.3, 12.5, "pink", [1, 0], 0.3);
drawGhost(wv, cam, 11.9, 16.5, "red", [-0.4, -0.9], 0.45);
drawPac(wv, cam, 11.5, 14.5, -Math.PI / 2, 0.42);
// the struck-through up arrows on the two forbidden tiles of the start row
for (const x of [9]) { const [X, Y0] = toS(cam, x + 0.5, 16.5); const s = 15; wv.rect(R(X) - 2, R(Y0 - s * 0.2), 5, R(s * 1.1), PK); for (let k = 0; k <= 8; k++) wv.rect(R(X) - k, R(Y0 - s * 0.75 + k), 1 + 2 * k, 4, PK); for (let k = -11; k <= 11; k++) wv.rect(R(X) + k - 1, R(Y0 + k * 0.9) - 1, 4, 4, IV); }
// over Red: the "up" square he is not allowed to take
{ const [X, Y0] = toS(cam, 11.5, 15.5), s = 30; for (let i = 0; i < 3; i++) wv.frame(R(X - s / 2) + i, R(Y0 - s / 2) + i, s - 2 * i, s - 2 * i, PK); wv.text(MAIN, "×", R(X) - 9, R(Y0) - 10, PK, { scale: 3 }); }
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3; c.px(x, y, [wv.d[i], wv.d[i + 1], wv.d[i + 2]]); }
// tags
const tagc = (txt, cx, y, col) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 20, x = R(cx - w / 2); c.rrect(x, y, w, 26, col, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 10, y + 6, col, { scale: 2 }); };
{ const [X, Y0] = toS(cam, 11.5, 14.5); tagc("HIDE HERE", X + 96, Y0 - 34, Y); const [X2, Y2] = toS(cam, 11.9, 16.5); tagc("CAN'T TURN UP", X2 - 10, Y2 + 30, PK); }
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const k = y < 330 ? (y - 295) / 35 : y < 715 ? 1 : (745 - y) / 30; if (k <= bayer(x, y)) c.px(x, y, K); }
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("PAC-MAN SECRET", 270, 150, L, p6);
const o5 = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "THE SPOT GHOSTS", t2 = "CAN'T FIND";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o5) / 2), 194, IV, o5);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o5) / 2), 244, Y, o5);
const chip = "NO TURNING UP", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
const AX = R(270 - (38 + 10 + HW + 12 + CW) / 2), ROW = 772;
c.text(MAIN, "@KAGENAMI_AI", AX + 48, ROW + 12, IV, { scale: 2 });
{ const x = AX + 48 + HW + 12; c.rrect(x, ROW + 6, CW, 26, PK, 2); c.rrect(x + 2, ROW + 8, CW - 4, 22, CARD, 2); c.text(MAIN, chip, x + 14, ROW + 12, PK, { scale: 2 }); }
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
