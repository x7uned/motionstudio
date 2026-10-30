// Cover for «Zombie ants» (Halloween, 1080×1920): kicker y300, two-line pixel title ≤590, scene 590–1490, avatar +
// handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop. Scene: the dead ant under its leaf at
// night, the stalk out of its head glowing, spores falling, the moon and a bat behind.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, hex } from "../../../../renderer/pixel/raster.mjs";
import { drawSky, drawFar, drawMid, drawTrunk, drawGround, drawPlant, MOON, layer } from "./draw.mjs";
import { drawAnt } from "./ant.mjs";
import { leafState, OLD, AMBIENT, ambientSpore, T } from "./scene.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", OR = "#F08A3C", GRN = "#8CFF6A";
const S = 2, R = Math.round, c = new Canvas(540, 960, "#100A1C");
// the scene band
{ const t = 47.2, cam = { cx: -40, cy: -236, z: 9.5, ay: 540 }, scene = new Canvas(540, 960, "#000");
  // put the moon behind the leaf for this shot
  const F = layer(cam, MOON.q); MOON.x = F.wx(380); MOON.y = F.wy(380);
  drawSky(scene, cam, t, 0); drawFar(scene, cam, t, 0); drawMid(scene, cam, t, 0); drawTrunk(scene, cam, t, 0); drawGround(scene, cam, t, 0); drawPlant(scene, cam, t, 0);
  const st = leafState(T.stalk1 + 2); drawAnt(scene, cam, { ...st, light: 0, glow: 1 }, t);
  for (const p of AMBIENT) { const s = ambientSpore(p, t * 1.7), X = 270 + (s.x * 0.25 - 40 - cam.cx) * cam.z, Yy = 540 + ((s.y + 236) * 0.35 - 236 - cam.cy + 20) * cam.z; if (X > 0 && X < 540 && Yy > 300 && Yy < 740) { scene.disc(R(X), R(Yy), 3, "#1E4A1A"); scene.disc(R(X), R(Yy), 1, "#5FE04A"); } }
  for (let y = 0; y < 960; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3, k = y < 295 ? 0.82 : y > 745 ? 0.82 : 0; c.d[i] = scene.d[i] * (1 - k) + 11 * k; c.d[i + 1] = scene.d[i + 1] * (1 - k) + 8 * k; c.d[i + 2] = scene.d[i + 2] * (1 - k) + 18 * k; } }
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("THE FUNGUS INSIDE", 330, 318, GRN, "#3A8A2E");
pill("HALLOWEEN · SCIENCE", 270, 150, OR, "#C86A28");
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "ZOMBIE ANTS", t2 = "ARE REAL";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, OR, o);
const chip = "IT SPARES THE BRAIN", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
const AX = R(270 - (38 + 10 + HW + 12 + CW) / 2), ROW = 772;
c.text(MAIN, "@KAGENAMI_AI", AX + 48, ROW + 12, IV, { scale: 2 });
{ const x = AX + 48 + HW + 12; c.rrect(x, ROW + 6, CW, 26, OR, 2); c.rrect(x + 2, ROW + 8, CW - 4, 22, CARD, 2); c.text(MAIN, chip, x + 14, ROW + 12, OR, { scale: 2 }); }
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
