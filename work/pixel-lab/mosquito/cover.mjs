// Cover for «Why mosquitoes bite you» (1080×1920): kicker y300, two-line pixel title ≤590, scene 590–1490,
// avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop. Picture from the film's own world.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex, fade } from "../../../renderer/pixel/raster.mjs";
import { drawSky, drawFence, drawHouse, drawBenchBack, drawArmrests, drawYard, drawForeground, drawFireflies } from "./scenery.mjs";
import { drawFriends } from "./people.mjs";
import { drawMosquito } from "./mosquito.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", p6 = "#8D59DA";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// scene: the porch at dusk, both friends, the bite already swelling on R's arm, the mosquito coming in close to the camera
const cam = { cx: -38, cy: -66, z: 2.8 }, t = 3.2;
drawSky(c, cam, t); drawFence(c, cam); drawHouse(c, cam, t); drawBenchBack(c, cam); drawArmrests(c, cam); drawYard(c, cam, t); drawFireflies(c, cam, t, 1);
drawFriends(c, cam, t, { look: { R: [0.9, -0.3], L: [0.9, -0.2] }, bump: 1, rReach: 0, lPhone: 0 });
const X = (wx) => 270 + (wx - cam.cx) * cam.z, Yw = (wy) => 420 + (wy - cam.cy) * cam.z;
for (let i = 0; i < 60; i++) { const wx = 22 + rnd(i) * 26 + (rnd(i * 3) - 0.5) * 8, wy = -54 - rnd(i * 5) * 34, s = 3; fade(c, 0.4 + 0.5 * rnd(i * 7)).rect(R(X(wx)), R(Yw(wy)), s, s, ["#F4CA50", "#F27A9A", "#8EE6FF"][i % 3]); }
drawForeground(c, cam, t);
drawMosquito(c, 296, 392, 12.5, { face: 1, fly: 1, tilt: 0.18, t: 0.031 });
// fade the scene band (295–745 on the grid) into black at both edges
for (let y = 0; y < 960; y++) for (let x = 0; x < 540; x++) { const k = y < 295 ? 0 : y < 330 ? (y - 295) / 35 : y < 715 ? 1 : y < 745 ? (745 - y) / 30 : 0; if (k <= bayer(x, y)) c.px(x, y, K); }

// kicker + title
const pill = (txt, cx, y, col, edge, w0) => { const w = w0 ?? c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("MOSQUITO SCIENCE", 270, 150, L, p6);
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "WHY MOSQUITOES", t2 = "BITE YOU";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, Y, o);
// bottom row at y1545 (grid 772): avatar + handle + chip
const chip = "NOT BAD LUCK", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
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
