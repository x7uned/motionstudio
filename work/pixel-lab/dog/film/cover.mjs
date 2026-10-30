// Cover for «How a dog shakes dry» (1080×1920): kicker y300, two-line pixel title ≤590, scene 590–1490,
// avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawScenery } from "./scenery.mjs";
import { drawDog3 } from "./dog3.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", p6 = "#8D59DA";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// scene: the dusk riverbank, camera framed so the dog fills the 590–1490 band
const cam = { cx: 18, cy: -113, z: 1.5 }, t = 1.2;
drawScenery(c, cam, t);
const gx = 270 + (0 - cam.cx) * cam.z, gy = 520 + (0 - cam.cy) * cam.z, s = 2 * cam.z;
c.ellipse(R(gx), R(gy + 2), R(56 * s), R(4 * s), "#1A1328");
// spray behind
const spray = (front) => { for (let i = 0; i < 220; i++) {
  const ang = -Math.PI * (0.02 + 0.96 * rnd(i * 3 + 1)), r = rnd(i * 5), ox = gx + Math.cos(ang) * (44 + 6 * r) * s, oy = gy + (42 - 78 + Math.sin(ang) * (17 + 3 * r)) * s;
  const tau = 0.06 + rnd(i * 7) * 0.42, vx = Math.cos(ang) * (150 + 170 * rnd(i * 11)) * cam.z, vy = (Math.sin(ang) * (120 + 160 * rnd(i * 13)) - 40) * cam.z;
  const x = ox + vx * tau, y = oy + vy * tau + 300 * cam.z * tau * tau; if ((rnd(i * 17) < 0.5) !== front || y < 300 || y > 740) continue;
  const sz = rnd(i * 19) < 0.3 ? 4 : 3, vn = Math.hypot(vx, vy + 600 * tau) || 1;
  for (let k = 1; k <= 3; k++) fade(c, 0.6 - k * 0.15).rect(R(x - vx / vn * k * 3 * sz), R(y - (vy + 600 * tau) / vn * k * 3 * sz), sz - 1, sz - 1, "#A9C4FF");
  c.rect(R(x), R(y), sz, sz, "#A9C4FF"); c.px(R(x), R(y), IV);
} };
spray(false);
drawDog3(c, gx, gy, s, { phase: 1.1, shake: 1, sway: -10 * s, legs: false, alpha: 0.22 });
drawDog3(c, gx, gy, s, { phase: 1.1 + 2.8, shake: 1, sway: 10 * s, legs: false, alpha: 0.22 });
drawDog3(c, gx, gy, s, { phase: 1.1, shake: 1, sway: 3 * s });
spray(true);
// fade the scene band (295–745 on the grid) into black at both edges
for (let y = 186; y < 960; y++) for (let x = 0; x < 540; x++) { const k = y < 295 ? 0 : y < 330 ? (y - 295) / 35 : y < 715 ? 1 : y < 745 ? (745 - y) / 30 : 0; if (k <= bayer(x, y)) c.px(x, y, K); }
c.rect(0, 0, 540, 186, K);

// kicker + title
const pill = (txt, cx, y, col, edge, w0) => { const w = w0 ?? c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("WET-DOG PHYSICS", 270, 150, L, p6);
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "THIS DOG IS A", t2 = "WASHING MACHINE";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, Y, o);
// bottom row at y1545 (grid 772): avatar + handle + chip
const chip = "4.5 SHAKES/SEC", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
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
