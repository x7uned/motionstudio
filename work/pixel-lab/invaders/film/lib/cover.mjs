// Cover (1080×1920) for a Kagenami pixel film: kicker pill y300, two-line pixel title ≤y590, scene y590–1490,
// avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop (y 240–1680). Grid units are half.
// makeCover({ out, scene(canvas), kicker, t1, t2, c2, chip }) — scene draws the full 540×960 picture; the band outside
// y 295–745 (grid) is darkened so the title and the handle row read.
import fs from "node:fs";
import sharp from "sharp";
import { Canvas, MAIN, mix, hex } from "./raster.mjs";

const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", PU = "#8D59DA", p3 = "#3B2C5C";
const R = Math.round;
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(SHEET).extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null; if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } } else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(PU); if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; } }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}
export async function makeCover({ out, scene, kicker, t1, t2, c1 = IV, c2 = "#E8344E", chip, darken = 0.8 }) {
  const c = new Canvas(540, 960, O), s = new Canvas(540, 960, "#000"); scene(s);
  for (let y = 0; y < 960; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3, k = y < 295 || y > 745 ? darken : 0; c.d[i] = s.d[i] * (1 - k) + 11 * k; c.d[i + 1] = s.d[i + 1] * (1 - k) + 8 * k; c.d[i + 2] = s.d[i + 2] * (1 - k) + 18 * k; }
  const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); };
  pill(kicker, 270, 150, L, PU);
  const o = { scale: 5, shadow: p3, shadowOffset: 2 };
  c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, c1, o);
  c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, c2, o);
  const HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28, AX = R(270 - (38 + 10 + HW + 12 + CW) / 2), ROW = 772;
  c.text(MAIN, "@KAGENAMI_AI", AX + 48, ROW + 12, IV, { scale: 2 });
  { const x = AX + 48 + HW + 12; c.rrect(x, ROW + 6, CW, 26, Y, 2); c.rrect(x + 2, ROW + 8, CW - 4, 22, CARD, 2); c.text(MAIN, chip, x + 14, ROW + 12, Y, { scale: 2 }); }
  const base = out + ".base.png"; await c.save(base, 2);
  await sharp(base).composite([{ input: await avatar(76), left: AX * 2, top: ROW * 2 }]).png().toFile(out); fs.unlinkSync(base);
}
