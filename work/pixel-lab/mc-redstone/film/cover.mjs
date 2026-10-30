// Cover for «People built computers inside Minecraft» (1080×1920): kicker y300, two-line pixel title ≤590,
// scene 590–1490, avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop.
// Scene: the redstone computer with its lamp screen, the lab in front with the first wire lit.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, hex } from "../../../../renderer/pixel/raster.mjs";
import { RS, GROUND, B, outsideColor } from "./world.mjs";
import { makeState, renderIso, avgColor } from "./voxel.mjs";
import { paintDust, drawParts, setLoop } from "./redstone.mjs";
import { SIG, leverPos, lampLevel } from "./scene.mjs";
import { END } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", RD = "#E8344E";
const S = 2, R = Math.round, c = new Canvas(540, 960, "#1E3A18");
setLoop(END);
// the scene band
{ const st = makeState(RS), depth = new Float32Array(540 * 960), t = 0.4; st.hit = { x: new Float32Array(540 * 960), y: new Float32Array(540 * 960), z: new Float32Array(540 * 960), ax: new Uint8Array(540 * 960), ty: new Uint8Array(540 * 960) };
  const G = avgColor(B.GRASS, 0), Lf = avgColor(B.LEAVES, 0).map((v) => v * 1.05), LD = avgColor(B.LEAVES, 0).map((v) => v * 0.55);
  st.outsideY = GROUND + 1; st.outside = (out, wx, wz, bs, X, Y2) => outsideColor(out, wx, wz, bs, X, Y2, G, Lf, LD); st.lamp = (x, y, z) => lampLevel(x, y, z, t);
  const scene = new Canvas(540, 960, "#000"), cam = { x: -52, y: 22, z: -50, b: 2.55, ay: 500 };
  renderIso(scene, [0, 0, 540, 960], cam, st, depth); paintDust(scene, st, SIG, t); drawParts(scene, cam, depth, st, SIG, t, leverPos);
  for (let y = 0; y < 960; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3, k = y < 295 ? 0.82 : y > 745 ? 0.82 : 0; c.d[i] = scene.d[i] * (1 - k) + 11 * k; c.d[i + 1] = scene.d[i + 1] * (1 - k) + 8 * k; c.d[i + 2] = scene.d[i + 2] * (1 - k) + 18 * k; } }
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("THIS IS A COMPUTER", 330, 330, Y, "#C88A3A");
pill("MINECRAFT · REDSTONE", 270, 150, L, P);
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "A COMPUTER", t2 = "MADE OF DUST";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, RD, o);
const chip = "1 TICK / SEC", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
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
