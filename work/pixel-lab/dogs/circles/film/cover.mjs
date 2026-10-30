// Cover for «Why do dogs spin before lying down?» (1080×1920): kicker y300, two-line pixel title ≤590, scene 590–1490,
// avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop.
// Scene: the collie mid-circle on its bed (3/4 view), a dotted orbit arrow around it.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex } from "../../../../../renderer/pixel/raster.mjs";
import { ground } from "../../kit-v3/layout.mjs";
import * as park from "../../kit-v3/park.mjs";
import { drawDogSide } from "../../kit-v3/dog.mjs";
import * as nest from "../../kit-v3/nest.mjs";
import { END } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", RED = "#FF5A6A";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);

// scene band: grid y 295–745
const cam = { cx: 0, cy: -46, z: 3.0 }, G = ground(cam), wv = new Canvas(540, 960, K);
park.back(wv, cam, 3.0, { period: END });
nest.bedBack(wv, G, 0, 0, 3.0, { press: 0.15, period: END });
// the orbit: a dotted ellipse around the dog, its far half behind the dog, with an arrowhead
const ox = G.X(0), oy = G.Y(-44), rx = 50 * G.z, ry = 12 * G.z;
const orbit = (front) => { for (let i = 0; i < 120; i++) { const an = (i / 120) * Math.PI * 2, x = ox + Math.cos(an) * rx, y = oy + Math.sin(an) * ry; if ((Math.sin(an) > 0) !== front || i % 3 === 2) continue; wv.rect(Math.round(x) - 1, Math.round(y) - 1, 5, 5, "#0B0812"); wv.rect(Math.round(x) - 1, Math.round(y) - 1, 4, 4, Y); } };
orbit(false);
drawDogSide(wv, G, 0, 0, 3.0, { facing: 1, gait: "walk", phase: 0.3, turn: 0.32, back: 0, ears: 0.8, pant: 0.4, tail: { wag: 0.6, height: 0.4 } });
nest.bedFront(wv, G, 0, 0, 3.0, { press: 0.15, period: END });
orbit(true);
{ const an = 0.5, x = ox + Math.cos(an) * rx, y = oy + Math.sin(an) * ry; for (let k = 0; k < 10; k++) { wv.rect(Math.round(x - 14 + k), Math.round(y - 4 - 10 + k), 5, 5, "#0B0812"); wv.rect(Math.round(x - 14 + k), Math.round(y - 4 + 10 - k), 5, 5, "#0B0812"); wv.rect(Math.round(x - 14 + k), Math.round(y - 4 - 10 + k), 4, 4, Y); wv.rect(Math.round(x - 14 + k), Math.round(y - 4 + 10 - k), 4, 4, Y); } }
park.front(wv, cam, 3.0, { period: END });
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3; c.px(x, y, [wv.d[i], wv.d[i + 1], wv.d[i + 2]]); }
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const k = y < 330 ? (y - 295) / 35 : y < 715 ? 1 : (745 - y) / 30; if (k <= bayer(x, y)) c.px(x, y, K); }
// kicker + title
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("DOG SCIENCE", 270, 150, L, P);
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "WHY DOES MY DOG", t2 = "SPIN AROUND?";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, Y, o);
// bottom row at y1545 (grid 772): avatar + handle + chip
const chip = "MAKING A BED", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
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
