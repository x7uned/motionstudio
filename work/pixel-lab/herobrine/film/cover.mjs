// Cover for «Herobrine was never in the game» (1080×1920): kicker y300, two-line pixel title ≤590, scene 590–1490,
// avatar + handle + chip in one row at y1545 — all inside Instagram's 3:4 grid crop.
// Scene: the figure with empty white eyes on the ridge, seen through the fog with a long lens.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, hex } from "../../../../renderer/pixel/raster.mjs";
import { H, RIDGE, CLEARING, groundY } from "./world.mjs";
import { makeState, renderPersp } from "./voxel.mjs";
import { drawPerson, usePersp } from "./actors.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", RD = "#E8344E";
const S = 2, R = Math.round, c = new Canvas(540, 960, "#3E4452");
const hx = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
{ const st = makeState(H), FOG = hx("#8E96A4"); st.demoFlag = false; st.grpA = new Float32Array(8).fill(1); st.skyTop = hx("#5A6478"); st.skyHor = FOG; st.noSun = true; st.fogColor = FOG; st.fog = { start: 5, end: 58 }; st.shadowK = 0.6;
  const depth = new Float32Array(540 * 960), neg = new Float32Array(540 * 960), rect = { x: 0, y: 0, w: 540, h: 960 };
  const ex = CLEARING.x + 0.5, ey = groundY(CLEARING.x, CLEARING.z) + 1.62, ez = CLEARING.z - 6, fx = RIDGE.x + 0.5, fz = RIDGE.z + 0.5, fy = groundY(RIDGE.x, RIDGE.z) + 1.2;
  const cam = { x: ex, y: ey, z: ez, yaw: Math.atan2(-(fx - ex), -(fz - ez)), pitch: Math.atan2(fy - ey, Math.hypot(fx - ex, fz - ez)) + 0.02, fov: 0.42 };
  const scene = new Canvas(540, 960, "#000"); renderPersp(scene, rect, [0, 0, 540, 960], cam, st, depth); for (let k = 0; k < depth.length; k++) neg[k] = -depth[k];
  usePersp(rect, (d) => ({ k: Math.max(0, Math.min(1, (d - 5) / 53)) * 0.85, col: FOG })); drawPerson(scene, cam, "herobrine", { x: fx, y: groundY(RIDGE.x, RIDGE.z), z: fz, face: 0, walk: null }, neg);
  for (let y = 0; y < 960; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3, k = y < 295 || y > 745 ? 0.78 : 0; c.d[i] = scene.d[i] * (1 - k) + 11 * k; c.d[i + 1] = scene.d[i + 1] * (1 - k) + 8 * k; c.d[i + 2] = scene.d[i + 2] * (1 - k) + 18 * k; } }
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("MINECRAFT LEGEND", 270, 150, L, P);
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "HE WAS NEVER", t2 = "IN THE GAME";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, RD, o);
const chip = "REMOVED x30+", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
const AX = R(270 - (38 + 10 + HW + 12 + CW) / 2), ROW = 772;
c.text(MAIN, "@KAGENAMI_AI", AX + 48, ROW + 12, IV, { scale: 2 });
{ const x = AX + 48 + HW + 12; c.rrect(x, ROW + 6, CW, 26, RD, 2); c.rrect(x + 2, ROW + 8, CW - 4, 22, CARD, 2); c.text(MAIN, chip, x + 14, ROW + 12, RD, { scale: 2 }); }
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
