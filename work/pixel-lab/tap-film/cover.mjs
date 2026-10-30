// Cover for the pixel film (1080×1920): topic pill, two-line pixel title, the planet with the lit Tokyo → London route,
// handle row at the bottom. Same grid (540×960 ×2), palette and fonts as the film.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex, fade } from "../pixel.mjs";
import { drawGlobe, project, routeSamples } from "./world.mjs";
import { packetSprite, COLORS as C } from "./iso.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const { O, CARD, IV, Y, YL, GR, MU, L, P, p2, p3, p4, p5, p6, p7, p8 } = C;
const K = "#000000", S = 2, c = new Canvas(540, 960, K);
const MEDIA = JSON.parse(fs.readFileSync(HERE + "media.json", "utf8")).assets;
const mediaFile = (kind, subj) => HERE + "media/" + MEDIA.find((a) => a.kind === kind && a.subject === subj).file.split("/").pop();
const overlays = [];

// background glow + stars
c.tint(0, 0, 540, 960, (x, y) => Math.max(0, 0.45 - Math.hypot(x - 270, (y - 500) * 1.05) / 380), "#2A1B4A", 12);
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
for (let i = 0; i < 70; i++) c.px(Math.floor(rnd(i * 2 + 1) * 540), 300 + Math.floor(rnd(i * 2 + 2) * 450), i % 6 ? "#3B3352" : MU);

// topic pill
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = Math.round(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); return [x, w]; };
pill("WHAT HAPPENS WHEN YOU TAP", 270, 150, p8, p6);
// title: two lines, second in yellow
const t1 = "YOUR TAP FLIES", t2 = "20 000+ KM", o = { scale: 5, shadow: p3, shadowOffset: 2 };
c.text(MAIN, t1, Math.round(270 - c.measure(MAIN, t1, o) / 2), 200, IV, o);
c.text(MAIN, t2, Math.round(270 - c.measure(MAIN, t2, o) / 2), 248, Y, o);

// planet with the route
const view = { lat0: 38, lon0: 72, R: 200, cx: 270, cy: 522 };
drawGlobe(c, view, { lat: -11, lon: 150 }, { clip: [0, 296, 540, 746] });
const ROUTE = routeSamples([[139.7, 35.7], [138.5, 33.8], [130, 29.5], [125, 28], [114.2, 22.3], [110, 12], [103.8, 1.3], [95, 5.5], [80, 5], [72.8, 19], [60, 17], [55, 13.5], [47, 12.3], [43.4, 12.6], [40.5, 16.5], [37.5, 21], [34.6, 27.5], [32.5, 29.9], [30, 31.6], [22, 34], [15, 37], [8, 40.5], [5.4, 43.3], [3, 47], [1.5, 49.5], [-0.1, 51.5]]);
const path = (k0, k1, col, dy = 0) => { let prev = null; ROUTE.pts.forEach((p, i) => { const f = ROUTE.cum[i] / ROUTE.km; if (f < k0 || f > k1) { prev = null; return; } const q = project(view, p[1], p[0]); if (!q.visible) { prev = null; return; } if (prev) { c.line(Math.round(prev.x), Math.round(prev.y) + dy, Math.round(q.x), Math.round(q.y) + dy, col); c.line(Math.round(prev.x), Math.round(prev.y) + dy + 1, Math.round(q.x), Math.round(q.y) + dy + 1, col); } prev = q; }); };
path(0, 1, Y); path(0.52, 1, GR, 4);
for (const [la, lo] of [[22.3, 114.2], [1.3, 103.8], [19.1, 72.9], [25.2, 55.3], [30.0, 31.2], [43.3, 5.4]]) { const q = project(view, la, lo); const x = Math.round(q.x), y = Math.round(q.y); c.rect(x - 2, y - 2, 5, 5, O); c.rect(x - 1, y - 1, 3, 3, p8); c.px(x, y, IV); }
{ const k = 0.36, d = k * ROUTE.km; let i = 1; while (ROUTE.cum[i] < d) i++; const p = ROUTE.pts[i], q = project(view, p[1], p[0]); c.tint(Math.round(q.x - 24), Math.round(q.y - 30), 48, 40, (x, y) => Math.max(0, 0.5 - Math.hypot(x - q.x, y - q.y + 8) / 22), YL, 10); packetSprite(c, q.x, q.y - 8, 1.6, { lock: true }); }
// pins + city labels with flags (full-resolution flags)
async function rgba(file, w, h) { const { data, info } = await sharp(file).resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, data }; }
const flags = { tokyo: await rgba(mediaFile("flag", "Japan"), 54, 36), london: await rgba(mediaFile("flag", "United Kingdom"), 60, 36) };
const label = (lat, lon, name, flag, side, col) => {
  const q = project(view, lat, lon), x0 = Math.round(q.x), y0 = Math.round(q.y);
  c.rect(x0 - 1, y0 - 12, 3, 12, O); c.rect(x0, y0 - 11, 1, 11, IV); c.disc(x0, y0 - 14, 5, O); c.disc(x0, y0 - 14, 4, col); c.px(x0 - 1, y0 - 16, IV);
  const w = 34 + c.measure(MAIN, name, { scale: 2 }) + 10, x = side < 0 ? x0 - w - 6 : x0 + 8, y = y0 - 46;
  c.rrect(x, y, w, 26, p7, 1); c.rect(x + 1, y + 1, w - 2, 24, p5); c.rect(x + 2, y + 2, w - 4, 22, CARD);
  overlays.push({ img: flag, x: (x + 4) * S, y: (y + 4) * S + 1 }); c.text(MAIN, name, x + 34, y + 6, IV, { scale: 2 });
};
label(35.68, 139.69, "TOKYO", flags.tokyo, -1, Y); label(51.5, -0.12, "LONDON", flags.london, 1, p8);

// bottom row (one line at y 1545 like the earlier covers): avatar + handle + yellow chip
const chip = "TOKYO > LONDON", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
const AX = Math.round(270 - (38 + 10 + HW + 12 + CW) / 2), ROW = 772;
c.text(MAIN, "@KAGENAMI_AI", AX + 48, ROW + 12, IV, { scale: 2 });
{ const x = AX + 48 + HW + 12; c.rrect(x, ROW + 6, CW, 26, Y, 2); c.rrect(x + 2, ROW + 8, CW - 4, 22, CARD, 2); c.text(MAIN, chip, x + 14, ROW + 12, Y, { scale: 2 }); }
// avatar (face + upper body), full resolution
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(SHEET).extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null;
    if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } }
    else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P);
    if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; }
  }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}
const base = HERE + ".cover-base.png";
await c.save(base, S);
const comps = [{ input: await avatar(76), left: AX * S, top: ROW * S }];
for (const ov of overlays) comps.push({ input: await sharp(Buffer.from(ov.img.data), { raw: { width: ov.img.w, height: ov.img.h, channels: 4 } }).png().toBuffer(), left: ov.x, top: ov.y });
await sharp(base).composite(comps).png().toFile(HERE + "cover.png");
fs.unlinkSync(base);
console.log("cover.png");
