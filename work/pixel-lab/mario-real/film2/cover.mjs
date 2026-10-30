// Cover (film2: the sprite Mario) for «How high can Mario jump in our world» (1080×1920), harness from steve-real/film2/cover.mjs: kicker «IN OUR WORLD #2»
// y300, two-line pixel title «HOW HIGH CAN / MARIO JUMP?» ≤ 590, scene 590–1490 = the film's own evening street through a
// still cover camera: Mario large in mid-air above the roof of the three-storey house with his white trail, the tape on the
// wall up to 11 m with the «11 m» mark, pigeons taking off; avatar + handle + chip in one row at y1545 (Instagram 3:4 crop).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN as MAIN0, mix, hex } from "../../../../renderer/pixel/raster.mjs";
import { makeCam } from "./lib/cam.mjs";
import { drawCity } from "./assets/city.mjs";
import { drawSprite, POSES } from "./assets/mario.mjs";
import { tape, pigeon } from "./assets/props.mjs";
import { MAIN as HUDMAIN, pill } from "./lib/hud.mjs";
const MAIN = { ...MAIN0, glyphs: { ...MAIN0.glyphs, "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."] } };

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", P = "#8D59DA", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", p3 = "#3B2C5C", p6 = "#8D59DA";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);

// scene: rows SRC..SRC+450 of a 540×960 street canvas → cover rows 295–745
const SRC = 240, f = new Canvas(540, 960, K), NC = 7, ZC = 8 - (380 * 1.55) / (32 * NC), XC = 0.62, YC = 10.8, Cm = makeCam({ x: 0.55, h: 10.3, d: 8, f: 380, hy: 0 });
{ const kM = Cm.f / (Cm.d - ZC); Cm.hy = 0; const want = SRC + 268; const hy = want + kM * (YC - Cm.h); Object.assign(Cm, makeCam({ x: 0.55, h: 10.3, d: 8, f: 380, hy })); }
drawCity(f, Cm, 47.9);
tape(f, Cm, 0.0, 11.0, 47.9, { font: HUDMAIN });
for (const [X0, i] of [[1.6, 0], [2.3, 1], [3.0, 2], [3.6, 3]]) { const u = 0.25 + 0.12 * i, [x, y] = Cm.P(X0 + 1.2 * u, 10.0 + 2.2 * u, -0.1 + 0.6 * u); pigeon(f, x, y, Cm.k(0.4), 3.1 + i, 1, i % 2 ? 1 : -1, i); }
// film2: the 16×32 game sprite in the jump pose at the integer scale N = 7 (his depth ZC is chosen so the world agrees), with
// flat translucent after-images below
{ const [fx, fy] = Cm.P(XC, YC - 0.24, ZC);
  for (let i = 3; i >= 1; i--) drawSprite(f, fx, fy + i * 0.62 * 32 * NC, NC, 0, {}, { grid: POSES.jump, ghost: [255, 255, 255], veil: 0.42 * (1 - i / 4) });
  drawSprite(f, fx, fy, NC, 0, {}, { grid: POSES.jump }); }
{ const [tx, ty] = Cm.P(0.0, 11.0, 0); f.rect(R(tx - 9), R(ty) - 1, 18, 3, "#FF4A4A"); pill(f, "11 m", R(tx - 44), R(ty - 13), 1, { edge: "#FF6A5A", scale: 2 }); }
for (let y = 0; y < 450; y++) for (let x = 0; x < 540; x++) c.px(x, 295 + y, f.get(x, SRC + y));
for (let x = 0; x < 540; x++) { c.px(x, 294, L); c.px(x, 745, L); c.px(x, 293, p3); c.px(x, 746, p3); }
const pillC = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); };
pillC("IN OUR WORLD #2", 270, 150, L, p6);
const o = { scale: 4, shadow: p3, shadowOffset: 2 }, t1 = "HOW HIGH CAN", t2 = "MARIO JUMP?";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 198, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, Y, o);
// bottom row at y1545 (grid 772): avatar + handle + chip
const chip = "11 M", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
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
