// @kagenami_science cover (1080×1920), same layout as our @kagenami_ai pixel covers (pal-50hz/film/cover.mjs):
// kicker y300, two-line pixel title ≤ y590, scene y590–1490 (a 900 px crop of a clean frame of the film),
// avatar + handle + chip in one row at y1545 — everything inside Instagram's 3:4 grid crop (y240–1680).
// Usage: node cover-example.mjs <frame.png 1080×1920, no captions> <cropTop px> "<KICKER>" "<LINE 1>" "<LINE 2>" "<CHIP>" [out.png]
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, hex } from "../../../renderer/pixel/raster.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const [FRAME, TOP = "300", KICKER = "SCIENCE SECRET", T1 = "LINE ONE", T2 = "LINE TWO", CHIP = "CHIP", OUT = HERE + "cover.png"] = process.argv.slice(2);
const HANDLE = "@KAGENAMI_SCIENCE", AVATAR = HERE + "avatar.png";
const CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", CY = "#5FE3F0";
const S = 2, R = Math.round, c = new Canvas(540, 960, "#000000");

// scene: frame rows TOP..TOP+900 (full res) → cover rows 590–1490, thin lavender/violet lines on both edges
const { data: f, info } = await sharp(FRAME).resize(540, 960, { kernel: "nearest", fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const top = R(Number(TOP) / 2);
for (let y = 0; y < 450; y++) for (let x = 0; x < 540; x++) { const k = ((top + y) * info.width + x) * 3; c.px(x, 295 + y, [f[k], f[k + 1], f[k + 2]]); }
for (let x = 0; x < 540; x++) { c.px(x, 294, L); c.px(x, 745, L); c.px(x, 293, p3); c.px(x, 746, p3); }

// kicker pill + title (scale 4; use 3 if a line is wider than ~500 grid px)
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); };
pill(KICKER, 270, 150, L, P);
const fit = (t) => (c.measure(MAIN, t, { scale: 4 }) > 500 ? 3 : 4);
for (const [t, y, col] of [[T1, 198, IV], [T2, 244, Y]]) { const o = { scale: fit(t), shadow: p3, shadowOffset: 2 }; c.text(MAIN, t, R(270 - c.measure(MAIN, t, o) / 2), y, col, o); }

// bottom row at y1545 (grid 772): avatar + handle + yellow chip
const HW = c.measure(MAIN, HANDLE, { scale: 2 }), CW = c.measure(MAIN, CHIP, { scale: 2 }) + 28;
const AX = R(270 - (38 + 10 + HW + 12 + CW) / 2), ROW = 772;
c.text(MAIN, HANDLE, AX + 48, ROW + 12, IV, { scale: 2 });
{ const x = AX + 48 + HW + 12; c.rrect(x, ROW + 6, CW, 26, Y, 2); c.rrect(x + 2, ROW + 8, CW - 4, 22, CARD, 2); c.text(MAIN, CHIP, x + 14, ROW + 12, Y, { scale: 2 }); }

// round avatar 76 px: the channel avatar cropped to a circle, 1 px ivory ring + cyan edge
async function avatar(size) {
  const r = size / 2, inner = r - 4, n = Math.round(inner * 2);
  const { data } = await sharp(AVATAR).extract({ left: 90, top: 30, width: 900, height: 900 }).resize(n, n, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size * 4), off = r - inner;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null;
    if (d <= inner) { const x = Math.min(n - 1, Math.max(0, Math.round(i - off))), y = Math.min(n - 1, Math.max(0, Math.round(j - off))), q = (y * n + x) * 3; col = [data[q], data[q + 1], data[q + 2]]; }
    else if (d <= inner + 1) col = hex(IV); else if (d <= r) col = hex(CY);
    if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; }
  }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}
const base = await sharp(Buffer.from(c.d), { raw: { width: 540, height: 960, channels: 3 } }).resize(1080, 1920, { kernel: "nearest" }).png().toBuffer();
await sharp(base).composite([{ input: await avatar(76), left: AX * S, top: ROW * S }]).png().toFile(OUT);
console.log(OUT);
