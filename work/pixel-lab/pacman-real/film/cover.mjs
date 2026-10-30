// Cover for «How much would Pac-Man eat in our world» (1080×1920), harness: frozen copy of mario-real/film2/cover.mjs. Kicker
// «IN OUR WORLD #3» y300, two-line pixel title «HOW MUCH WOULD / PAC-MAN EAT?» ≤ 590, scene 590–1490 = the film's own noon
// market through a still cover camera: the Pac-Man sprite (N = 14, integer squares) biting a watermelon of the line, the
// «≈7 🍉/s» chip; avatar + handle + chip in one row at y1545 (Instagram 3:4 crop).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN as MAIN0, mix, hex, fade } from "../../../../renderer/pixel/raster.mjs";
import { makeCam } from "./lib/cam.mjs";
import { drawMarket, melon3, MK } from "./assets/market.mjs";
import { drawPac, drawGhost, spriteShadow } from "./assets/sprites.mjs";
import { melonIcon } from "./assets/maze.mjs";
import { MAIN as HUDMAIN, plate, lc } from "./lib/hud.mjs";
const MAIN = { ...MAIN0, glyphs: { ...MAIN0.glyphs, "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."] } };

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", P = "#8D59DA", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", p3 = "#3B2C5C", p6 = "#8D59DA";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);

// scene: rows SRC..SRC+450 of a 540×960 street canvas → cover rows 295–745
const SRC = 230, f = new Canvas(540, 960, K), NC = 14, kM = (13 * NC) / 1.7, ZM = MK.ZM, PX = 12.4;
const Cm = makeCam({ x: PX + 0.05, h: 3, d: ZM + 7, f: kM * 7, hy: SRC + 400 - kM * 3 });
drawMarket(f, Cm, 3.0, {});
for (let X = 13; X < 18; X++) { melon3(f, Cm, X, 0, ZM + 0.05, 0.26, 1, X * 1.7); }
{ const [gx, gy] = Cm.P(PX - 1.95, 0, ZM); spriteShadow(f, gx, gy, NC, 0.85, 12); drawGhost(f, "blinky", gx, gy, NC, 0.2, { look: "r", angry: 1 }); }
melon3(f, Cm, PX + 0.36, 0.72, ZM + 0.02, 0.26, 1, 3);
{ const [px, py] = Cm.P(PX, 0, ZM); spriteShadow(f, px, py, NC, 0.9, 11); drawPac(f, px, py, NC, 0, { dir: "R", ph: 0.2, pp: 0.2, chomp: 1 }); }
{ const sc = 3, t1 = "≈7", t2 = "/s", w1 = f.measure(HUDMAIN, t1, { scale: sc }), w2 = f.measure(HUDMAIN, lc(t2), { scale: sc }), iw = 24, w = w1 + iw + w2 + 30, x = Math.round(300 - w / 2), y = SRC + 112;
  plate(f, x, y, w, 31, 1, "#7FE3A0"); f.text(HUDMAIN, t1, x + 9, y + 5, "#FDFEED", { scale: sc }); melonIcon(f, x + 9 + w1 + 6 + iw / 2, y + 15, 3, 1); f.text(HUDMAIN, lc(t2), x + 9 + w1 + iw + 12, y + 5, "#FDFEED", { scale: sc }); }
for (let y = 0; y < 450; y++) for (let x = 0; x < 540; x++) c.px(x, 295 + y, f.get(x, SRC + y));
for (let x = 0; x < 540; x++) { c.px(x, 294, L); c.px(x, 745, L); c.px(x, 293, p3); c.px(x, 746, p3); }
const pillC = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); };
pillC("IN OUR WORLD #3", 270, 150, L, p6);
const o = { scale: 4, shadow: p3, shadowOffset: 2 }, t1 = "HOW MUCH WOULD", t2 = "PAC-MAN EAT?";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 198, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, Y, o);
// bottom row at y1545 (grid 772): avatar + handle + chip
const chip = "25 KM/H", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
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
