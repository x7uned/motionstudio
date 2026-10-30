// Cover for «How your cat drinks» (1080×1920): kicker y300, two-line pixel title ≤590, scene 590–1490,
// avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawMacroScene } from "./macro.mjs";
import { drawKitchen, drawBowl, ground } from "./kitchen.mjs";
import { drawCat } from "./cat.mjs";
import { EV } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", p6 = "#8D59DA";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// scene: the cat at its bowl in the 295–745 band, with a round magnifier showing the slow-motion tongue and water column
const wv = new Canvas(540, 960, K), cam = { cx: -34, cy: -42, z: 4.4 };
drawKitchen(wv, cam, 1.0, 46.5); const G = ground(cam);
wv.ellipse(Math.round(G.X(-42)), Math.round(G.Y(1)), Math.round(52 * G.z), Math.max(1, Math.round(3 * G.z)), "#15102A");
drawBowl(wv, G, 0, "back", { ripples: [{ x: -5.7, r: 9, a: 0.8 }, { x: -5.7, r: 15, a: 0.4 }] });
const cat = drawCat(wv, G.X(-50), G.Y(0), G.z * 0.9, { p: 0.36, waterY: G.Y(-8.6) });
drawBowl(wv, G, 0, "front", {});
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3; c.px(x, y, [wv.d[i], wv.d[i + 1], wv.d[i + 2]]); }
const m = new Canvas(540, 960, K); drawMacroScene(m, 21.0, EV);
const MX = 372, MY = 400, MR = 104, SX = 320, SY = 430;
for (let y = -MR; y <= MR; y++) for (let x = -MR; x <= MR; x++) { const d = Math.hypot(x, y); if (d > MR) continue; const px = MX + x, py = MY + y;
  if (d > MR - 4) { c.px(px, py, d > MR - 2 ? O : Y); continue; } const sx = Math.round(SX + x * 2), sy = Math.round(SY + y * 2), i = (Math.max(0, Math.min(959, sy)) * 540 + Math.max(0, Math.min(539, sx))) * 3; c.px(px, py, [m.d[i], m.d[i + 1], m.d[i + 2]]); }
{ const [mx, my] = cat.mouth, ang = Math.atan2(my - MY, mx - MX), x0 = MX + Math.cos(ang) * MR, y0 = MY + Math.sin(ang) * MR; c.line(Math.round(x0), Math.round(y0), Math.round(mx), Math.round(my - 6), Y, [3, 3]); c.line(Math.round(x0) + 1, Math.round(y0), Math.round(mx) + 1, Math.round(my - 6), Y, [3, 3]); }
{ const w = c.measure(MAIN, "SLOW-MO", { scale: 2 }) + 20, x = MX - w / 2, y = MY + MR - 14; c.rrect(Math.round(x), y, w, 24, Y, 2); c.rrect(Math.round(x) + 2, y + 2, w - 4, 20, CARD, 2); c.text(MAIN, "SLOW-MO", Math.round(x) + 10, y + 5, Y, { scale: 2 }); }
// fade the band edges into black
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const k = y < 330 ? (y - 295) / 35 : y < 715 ? 1 : (745 - y) / 30; if (k <= bayer(x, y)) c.px(x, y, K); }
// kicker + title
const pill = (txt, cx, y, col, edge, w0) => { const w = w0 ?? c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("CAT PHYSICS", 270, 150, L, p6);
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "HOW YOUR CAT", t2 = "REALLY DRINKS";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, Y, o);
// bottom row at y1545 (grid 772): avatar + handle + chip
const chip = "4 LAPS/SEC", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
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
