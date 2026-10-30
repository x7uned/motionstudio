// Cover for «What happens if you forget airplane mode» (1080×1920): kicker y300, two-line pixel title ≤590,
// scene 590–1490, avatar + handle + chip in one row at y1545 — inside Instagram's 3:4 grid crop (earlier margins).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawWorld, view, towersNear } from "./world.mjs";
import { drawPlane, heroPhone } from "./plane.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", p6 = "#8D59DA";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);

const t = 30.95, cam = { cx: 20, cy: 225, z: 0.55 }, V = view(cam), ph = heroPhone(t);
drawWorld(c, cam, t, { lit: () => 1, beams: 0.6 });
// links to the towers far below (they leave the frame at the bottom: the phone is shouting at dozens of them)
for (const tw of towersNear(t, V.wx(-300), V.wx(840))) { const x0 = V.X(ph.x), y0 = V.Y(ph.y), x1 = V.X(tw.x), y1 = V.Y(tw.top - 10), n = R(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i < n; i++) if (i % 10 < 6) { const x = R(x0 + ((x1 - x0) * i) / n), y = R(y0 + ((y1 - y0) * i) / n); c.rect(x, y, 2, 2, Y); } }
drawPlane(c, V, t, { phonesLit: (r) => (r === 8 ? 1 : 0) });
for (const [r, a] of [[30, 0.95], [70, 0.8], [120, 0.6], [180, 0.4], [250, 0.25]]) { const rr = r, sx = V.X(ph.x), sy = V.Y(ph.y), g = fade(c, a), n = R(rr * 1.4); for (let k = 0; k < n; k++) { if (k % 3 === 2) continue; const an = (k / n) * Math.PI * 2; c.rect(R(sx + Math.cos(an) * rr), R(sy + Math.sin(an) * rr), 2, 2, Y); void g; } }
for (let y = 186; y < 960; y++) for (let x = 0; x < 540; x++) { const k = y < 295 ? 0 : y < 330 ? (y - 295) / 35 : y < 715 ? 1 : y < 745 ? (745 - y) / 30 : 0; if (k <= bayer(x, y)) c.px(x, y, K); }
c.rect(0, 0, 540, 186, K);

const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); };
pill("AIRPLANE MODE", 270, 150, L, p6);
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "YOUR PHONE IS", t2 = "SHOUTING UP HERE";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, Y, o);
const chip = "10 KM UP", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
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
