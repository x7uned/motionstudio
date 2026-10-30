// Cover for «Infinite aura» (1080×1920), the usual margins so Instagram's 3:4 grid crop keeps everything: kicker y300,
// two-line pixel title ≤ 590, scene 590–1490 (the film's chaos peak at 23.7 s without HUD/captions: the aura, laser
// pigeons, the T-rex, the staring moon, the alien with "AUTOGRAPH?", an explosion), and at y1545 one row: the channel's
// avatar (the user's image, ../../kagenami-fun/avatar.png) + @KAGENAMI_FUN + a chip.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, bayer, mix, hex } from "../../../../renderer/pixel/raster.mjs";
import { frame } from "./render.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", RED = "#FF5A6A";
const K = "#000000", R = Math.round, c = new Canvas(540, 960, K);
// scene: rows SRC..SRC+450 of the clean film frame into the cover's band 295..745, soft dithered edges
const f = frame(23.7, { clean: true }), SRC = 172;
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const i = ((y - 295 + SRC) * 540 + x) * 3; c.px(x, y, [f.d[i], f.d[i + 1], f.d[i + 2]]); }
for (let y = 295; y < 745; y++) for (let x = 0; x < 540; x++) { const k = y < 330 ? (y - 295) / 35 : y < 715 ? 1 : (745 - y) / 30; if (k <= bayer(x, y)) c.px(x, y, K); }
// kicker + title
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); };
pill("EVERY STEP YOU TAKE", 270, 150, L, P);
const o = { scale: 6, shadow: p3, shadowOffset: 2 }, t1 = "YOUR AURA", t2 = "GOES UP";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 192, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 242, Y, o);
// bottom row at y1545 (grid 772): avatar + handle + chip
const HANDLE = "@KAGENAMI_FUN", chip = "PIGEONS HAVE LASERS", HW = c.measure(MAIN, HANDLE, { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
const AX = R(270 - (38 + 10 + HW + 12 + CW) / 2), ROW = 772;
c.text(MAIN, HANDLE, AX + 48, ROW + 12, IV, { scale: 2 });
{ const x = AX + 48 + HW + 12; c.rrect(x, ROW + 6, CW, 26, RED, 2); c.rrect(x + 2, ROW + 8, CW - 4, 22, CARD, 2); c.text(MAIN, chip, x + 14, ROW + 12, RED, { scale: 2 }); }
/** The channel avatar in a ring (full-res pixels): the user's square image, circle-cropped. */
async function avatar(size) {
  const r = size / 2, inner = r - 4, d0 = Math.round(inner * 2);
  const img = await sharp(HERE + "../../kagenami-fun/avatar.png").resize(d0, d0, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer();
  const out = Buffer.alloc(size * size * 4), off = r - inner;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null;
    if (d <= inner) { const x = Math.min(d0 - 1, Math.max(0, Math.round(i - off))), y = Math.min(d0 - 1, Math.max(0, Math.round(j - off))), q = (y * d0 + x) * 3; col = [img[q], img[q + 1], img[q + 2]]; }
    else if (d <= inner + 1.2) col = hex(IV); else if (d <= r) col = hex("#FF4FD8");
    if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; } }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}
const base = HERE + ".cover-base.png"; await c.save(base, 2);
await sharp(base).composite([{ input: await avatar(76), left: AX * 2, top: ROW * 2 }]).png().toFile(HERE + "cover.png");
fs.unlinkSync(base); console.log("cover.png");
