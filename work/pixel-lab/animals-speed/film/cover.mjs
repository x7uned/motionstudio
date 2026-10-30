// Cover for «From the slowest animal to the fastest» (1080×1920): kicker y300, two-line pixel title ≤590,
// scene 590–1490 (eight round face portraits LV1 → LV8 taken from the film's own frames on a snake path like a game
// map; LV8 stays a "?" so the cover keeps the film's question), avatar + handle + chip in one row at y1545 — all inside
// Instagram's 3:4 grid crop.
// node cover.mjs [faces.json]   (faces.json optional: {"sponge": [t, x, y], …} crop centres; defaults below)
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, hex, bayer } from "../../../../renderer/pixel/raster.mjs";
import { frame } from "./render.mjs";
import { EV } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", P = "#8D59DA", p3 = "#3B2C5C", p6 = "#8D59DA";
const K = "#000000", S = 2, R = Math.round, c = new Canvas(540, 960, K);

// face crop centres (screen grid px) at a calm moment of each level; override with faces.json after looking at the art
const FACES = { ...(process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], "utf8")) : {}) };
const ORDER = ["snail", "sloth", "runner", "cat", "horse", "cheetah", "bat", "mystery"];
const RAD = 52, SCALE = 1;          // portrait radius on the cover (grid px); crop is 1:1 so the pixels stay crisp

// layout: bottom row LV1→4 left→right, top row LV5→8 right→left (a snake that climbs like a level map)
const pos = ORDER.map((_, i) => { const row = i < 4 ? 1 : 0, k = i < 4 ? i : 7 - i; return [R(78 + k * 128), row ? 622 : 418]; });
// snake path behind the portraits (dotted)
const path = [...pos.slice(0, 4), [pos[3][0] + 40, 520], ...pos.slice(4)];
for (let i = 0; i < path.length - 1; i++) { const [x0, y0] = path[i], [x1, y1] = path[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3); for (let k = 0; k <= n; k++) if (k % 3 !== 2) { const x = R(x0 + ((x1 - x0) * k) / n), y = R(y0 + ((y1 - y0) * k) / n); c.rect(x - 1, y - 1, 3, 3, p3); c.px(x, y, L); } }
for (let i = 0; i < ORDER.length; i++) {
  const last = i === ORDER.length - 1, [px, py] = pos[i];
  if (last) {   // the mystery number one: a dark disc with a big "?"
    for (let y = -RAD - 3; y <= RAD + 3; y++) for (let x = -RAD - 3; x <= RAD + 3; x++) { const d = Math.hypot(x + 0.5, y + 0.5); if (d > RAD + 3) continue; c.px(px + x, py + y, d > RAD + 2 ? O : d > RAD ? "#FF5A5A" : mix("#3A1028", "#160A1C", d / RAD)); }
    const q = { scale: 8 }, qw = c.measure(MAIN, "?", q); c.text(MAIN, "?", R(px - qw / 2) + 3, py - 30 + 3, O, q); c.text(MAIN, "?", R(px - qw / 2), py - 30, "#FF5A5A", q);
  } else {
    const [t, fx, fy, fr = RAD] = FACES[ORDER[i]], f = frame(t), z = fr / RAD;   // fr = source crop radius
    for (let y = -RAD; y <= RAD; y++) for (let x = -RAD; x <= RAD; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5); if (d > RAD + 3) continue;
      if (d > RAD) { c.px(px + x, py + y, d > RAD + 2 ? O : L); continue; }
      c.px(px + x, py + y, f.get(R(fx + x * z), R(fy + y * z)));
    }
  }
  // level badge under each portrait
  const lab = `LV ${i + 1}`, w = c.measure(MAIN, lab, { scale: 1 }) + 10, bx = R(px - w / 2), by = py + RAD - 4;
  c.rrect(bx, by, w, 13, last ? "#FF5A5A" : L, 1); c.rrect(bx + 1, by + 1, w - 2, 11, CARD, 1); c.text(MAIN, lab, bx + 5, by + 3, last ? "#FF8A8A" : IV, { scale: 1 });
}
// kicker + title
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 28, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 14, y + 6, col, { scale: 2 }); };
pill("ANIMAL SPEED", 270, 150, L, p6);
const o = { scale: 5, shadow: p3, shadowOffset: 2 }, t1 = "SLOWEST TO", t2 = "FASTEST";
c.text(MAIN, t1, R(270 - c.measure(MAIN, t1, o) / 2), 196, IV, o);
c.text(MAIN, t2, R(270 - c.measure(MAIN, t2, o) / 2), 244, Y, o);
// bottom row at y1545 (grid 772): avatar + handle + chip
const chip = "WHO IS NO. 1?", HW = c.measure(MAIN, "@KAGENAMI_AI", { scale: 2 }), CW = c.measure(MAIN, chip, { scale: 2 }) + 28;
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
