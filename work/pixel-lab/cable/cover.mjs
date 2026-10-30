// Cover for «How your text crosses the ocean» (1080×1920): kicker y300, two-line pixel title ≤590, scene 590–1490,
// avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop (same margins as earlier covers).
// node cover.mjs [z cx cy charScale]
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex } from "../../../renderer/pixel/raster.mjs";
import { drawWorld, toScreen, FRIEND_W, ME_W, O, CARD, IV, Y, YL, L, P, p3, CAB, Glow } from "./world.mjs";
const p6 = P;

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ME = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png", BUDDY = HERE + "assets/pixel-buddy-spritesheet.png";
const K = "#000000", S = 2, R = Math.round;
const [zA, cxA, cyA, csA] = process.argv.slice(2).map(Number);
const cam = { z: zA || 0.7, cx: cxA || 270, cy: cyA || 560 }, charScale = csA || 1;
const c = new Canvas(540, 960, K);

// the world at the replay moment: a long streak of light runs along the whole cable
const T = 46.72;
drawWorld(c, cam, T);
// the message's path: a glowing gold line along the whole cable, a bright pulse with its trail mid-ocean
{ const g = new Glow(), pts = CAB.map((p) => toScreen(cam, p.w)), head = Math.round(pts.length * 0.42);
  for (let i = 0; i < pts.length; i += 3) g.add(pts[i][0], pts[i][1], 7, 0.55);
  for (let i = head; i < Math.min(pts.length, head + 260); i += 2) g.add(pts[i][0], pts[i][1], 12, 0.9 * (1 - (i - head) / 260));
  g.add(pts[head][0], pts[head][1], 22, 1); g.apply(c, "#F4CA50", 4);
  for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i]; c.px(R(x), R(y) - 1, i >= head && i < head + 260 ? IV : YL); }
  c.disc(R(pts[head][0]), R(pts[head][1]) - 1, 3, IV); }
// "YOU UP?" bubble over you
const foot = toScreen(cam, ME_W), head = [foot[0], foot[1] - 98 * charScale];
{ const txt = "YOU UP?", w = c.measure(MAIN, txt, { scale: 2 }) + 18, h = 26, x = R(head[0] - w + 10), y = R(head[1] - 40), tx = x + w - 26;
  c.rrect(x - 1, y - 1, w + 2, h + 2, O, 3); c.rrect(x, y, w, h, IV, 3); c.rect(x + 2, y + h - 3, w - 4, 1, "#D8D2E8");
  for (let j = 0; j < 7; j++) { c.rect(tx + j, y + h + j, 7 - j, 1, IV); c.px(tx + j - 1, y + h + j, O); c.px(tx + 7, y + h + j, O); }
  c.text(MAIN, txt, x + 9, y + 7, O, { scale: 2 }); }
// fade the scene band (295–745 on the grid) into black at both edges
for (let y = 186; y < 960; y++) for (let x = 0; x < 540; x++) { const k = y < 295 ? 0 : y < 330 ? (y - 295) / 35 : y < 715 ? 1 : y < 745 ? (745 - y) / 30 : 0; if (k <= bayer(x, y)) c.px(x, y, K); }
c.rect(0, 0, 540, 186, K);

// kicker + title
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); };
pill("UNDERSEA CABLES", 270, 150, L, p6);
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "YOUR TEXT GOES", t2 = "UNDER THE OCEAN";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, Y, o);
// bottom row at y1545 (grid 772): avatar + handle + chip
const chip = "4 KM DEEP", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
const AX = R(270 - (38 + 10 + HW + 12 + CW) / 2), ROW = 772;
c.text(MAIN, "@KAGENAMI_AI", AX + 48, ROW + 12, IV, { scale: 2 });
{ const x = AX + 48 + HW + 12; c.rrect(x, ROW + 6, CW, 26, Y, 2); c.rrect(x + 2, ROW + 8, CW - 4, 22, CARD, 2); c.text(MAIN, chip, x + 14, ROW + 12, Y, { scale: 2 }); }

async function cell(sheet, col, row) { const { data, info } = await sharp(sheet).extract({ left: col * 192, top: row * 208, width: 192, height: 208 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, data: new Uint8ClampedArray(data) }; }
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(ME).extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null; if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } } else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P); if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; } }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}
// characters at full resolution: you with the phone, the friend waving
const me = await cell(ME, 0, 8);
{ const put = (x, y, col) => { const k = (y * me.w + x) * 4; me.data[k] = col[0]; me.data[k + 1] = col[1]; me.data[k + 2] = col[2]; me.data[k + 3] = 255; };
  for (let y = 112; y < 132; y++) for (let x = 92; x < 106; x++) { const edge = x === 92 || x === 105 || y === 112 || y === 131; put(x, y, edge ? hex("#141018") : y < 115 || y > 128 ? hex("#2A2434") : mix("#BFD4FF", "#7FA0F0", (y - 115) / 13)); } }
const friend = await cell(BUDDY, 1, 3);
const full = Buffer.alloc(1080 * 1920 * 3);
for (let y = 0; y < 960; y++) for (let x = 0; x < 540; x++) { const s = (y * 540 + x) * 3; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const o2 = ((y * 2 + dy) * 1080 + x * 2 + dx) * 3; full[o2] = c.d[s]; full[o2 + 1] = c.d[s + 1]; full[o2 + 2] = c.d[s + 2]; } }
function blitScaled(img, footX, footY, s) {
  const x0 = footX - 96 * s, y0 = footY - 201 * s, w = Math.ceil(img.w * s), h = Math.ceil(img.h * s);
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(1920, y0 + h); y++) { const j = Math.floor((y - y0) / s); if (j < 0 || j >= img.h) continue;
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(1080, x0 + w); x++) { const i = Math.floor((x - x0) / s); if (i < 0 || i >= img.w) continue; const k = (j * img.w + i) * 4; if (img.data[k + 3] < 128) continue;
      // keep the characters inside the faded scene band
      const gy = y / 2, band = gy < 295 ? 0 : gy < 330 ? (gy - 295) / 35 : gy < 715 ? 1 : gy < 745 ? (745 - gy) / 30 : 0; if (band <= bayer(x >> 1, y >> 1)) continue;
      const o2 = (y * 1080 + x) * 3; full[o2] = img.data[k]; full[o2 + 1] = img.data[k + 1]; full[o2 + 2] = img.data[k + 2]; } }
}
{ const [fx, fy] = toScreen(cam, FRIEND_W); blitScaled(friend, fx * S, fy * S, charScale); }
{ const [mx, my] = toScreen(cam, ME_W); blitScaled(me, mx * S, my * S, charScale); }
const base = HERE + ".cover-base.png";
await sharp(full, { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(base);
await sharp(base).composite([{ input: await avatar(76), left: AX * S, top: ROW * S }]).png().toFile(HERE + "cover.png");
fs.unlinkSync(base);
console.log("cover.png", JSON.stringify(cam), charScale);
