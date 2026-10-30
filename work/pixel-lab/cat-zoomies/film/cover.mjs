// Cover for «Your cat sleeps all day, then goes crazy at 3 a.m.» (1080×1920): kicker y300, two-line pixel title ≤590,
// scene 590–1490, avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex } from "../../../../renderer/pixel/raster.mjs";
import { ground, lerp } from "./layout.mjs";
import { drawApartment, lightAt, litView } from "./apartment.mjs";
import { drawCat } from "./cat.mjs";
import { drawPerson } from "./person.mjs";
import { clockTag, speedLines } from "./hud.mjs";
import { HIT_X } from "./direction.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", p6 = "#8D59DA", PK = "#FF7A8A";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);

// scene: the knock-over — he dives over the cat, which zooms out from under his feet; the room at 3 a.m.
const wv = new Canvas(540, 960, K), cam = { cx: HIT_X + 62, cy: -40 - 70 / 1.55, z: 1.55 }, G = ground(cam), W = { t: 2.6, tod: 3, clock: 3, lampLiving: 0, lampBed: 0, bedBlanket: 1, curtainSwing: 0 };
drawApartment(wv, cam, W);
const lit = (g, wx) => { const Lt = lightAt(W, wx, -60), q = Math.min(0.5, 0.7 * Lt.k); return litView(g, { mul: Lt.mul.map((m) => lerp(m, 1, q)), add: Lt.add.map((v) => v * (1 - q)), sat: lerp(Lt.sat, 1, q) }); };
drawPerson(lit(wv, HIT_X), G, HIT_X, 0, { pose: "trip", facing: 1, face: "surprised", k: 0.42, glass: 1 });
const an = drawCat(lit(wv, HIT_X - 52), G, HIT_X - 52, 0, { pose: "run", facing: -1, p: 0.55, stretch: 1 });
if (an && an.bbox) speedLines(wv, an.bbox[2] + 90, an.bbox[1] + 4, an.bbox[2] + 4, an.bbox[3] - 4, 0.3, 0.9);
if (an && an.eye) { const [ex, ey] = an.eye; for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = Math.hypot(x, y); if (d < 2.2) wv.px(R(ex + x), R(ey + y), "#C8FF9A"); else if (d < 6 && (1 - d / 6) * 0.8 > bayer(R(ex + x), R(ey + y))) wv.px(R(ex + x), R(ey + y), mix(wv.get(R(ex + x), R(ey + y)), "#65DA41", 0.45)); } }
clockTag(wv, 112, 345, "3:00 AM", 1);
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3; c.px(x, y, [wv.d[i], wv.d[i + 1], wv.d[i + 2]]); }
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const k = y < 330 ? (y - 295) / 35 : y < 715 ? 1 : (745 - y) / 30; if (k <= bayer(x, y)) c.px(x, y, K); }
// kicker + title
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("CAT SCIENCE", 270, 150, L, p6);
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "WHY CATS GO", t2 = "CRAZY AT 3 AM";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, Y, o);
// bottom row at y1545 (grid 772): avatar + handle + chip
const chip = "THE ZOOMIES", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
const AX = R(270 - (38 + 10 + HW + 12 + CW) / 2), ROW = 772;
c.text(MAIN, "@KAGENAMI_AI", AX + 48, ROW + 12, IV, { scale: 2 });
{ const x = AX + 48 + HW + 12; c.rrect(x, ROW + 6, CW, 26, PK, 2); c.rrect(x + 2, ROW + 8, CW - 4, 22, CARD, 2); c.text(MAIN, chip, x + 14, ROW + 12, PK, { scale: 2 }); }

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
