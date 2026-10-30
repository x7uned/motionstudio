// Three flat (non-isometric) 32-bit pixel takes on «How a dog shakes dry»: side-scroller wide shot, cinematic slow-mo
// close-up, front-facing game cut-scene. 540×960 grid ×2, our header and karaoke captions.
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex, fade } from "../../../renderer/pixel/raster.mjs";
import { COLORS as C } from "../tap-film/iso.mjs";
import { drawDog2 } from "./dog2.mjs";
import { drawDogFront2 } from "./dogfront2.mjs";
import { FUR } from "./shade.mjs";
const GOLD = FUR;

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const { O, CARD, IV, Y, YL, GR, MU, L, P, p1, p2, p3, p4, p5, p6, p7, p8 } = C;
const K = "#000000", R = Math.round, TOP = 190, BOT = 680;
const WATER = "#A9C4FF";
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const band = (c, y0, y1, cols) => { for (let y = y0; y < y1; y++) { const k = (y - y0) / (y1 - y0) * (cols.length - 1), i = Math.floor(k); for (let x = 0; x < 540; x++) c.px(x, y, k - i > bayer(x, y) ? cols[Math.min(cols.length - 1, i + 1)] : cols[i]); } };

// ---------------------------------------------------------------- shared scenery: dusk river
function sunsetSky(c, horizon, sunX) {
  band(c, TOP, horizon, ["#0E0A22", "#1D1438", "#33204E", "#5A2E5E", "#8A4466", "#C8665A", "#F2A65A"]);
  for (let i = 0; i < 40; i++) { const x = R(rnd(i * 7) * 540), y = TOP + R(rnd(i * 11) * (horizon - TOP) * 0.45); c.px(x, y, i % 5 ? "#5E5478" : IV); }
  // retro striped sun on the horizon
  const r = 40; for (let y = -r; y <= 0; y++) { const w = Math.sqrt(r * r - y * y); if ((-y) % 7 < 2 && y > -26) continue; for (let x = -w; x <= w; x++) c.px(R(sunX + x), horizon + y, mix("#FAE375", "#F28A4A", (y + r) / r)); }
}
function hills(c, horizon) {
  const layer = (base, amp, freq, col, seed) => { for (let x = 0; x < 540; x++) { const h = base + Math.sin(x * freq + seed) * amp + Math.sin(x * freq * 2.7 + seed * 3) * amp * 0.4; for (let y = R(horizon - h); y < horizon + 2; y++) c.px(x, y, col); } };
  layer(26, 9, 0.012, "#3A2550", 1); layer(14, 6, 0.02, "#271A3C", 4);
}
function forest(c, y, col, rim, step, hmin, hmax, seed) {
  for (let x = -10; x < 560; x += step) { const h = hmin + rnd(x * 3 + seed) * (hmax - hmin), w = h * 0.38; c.poly([[x - w, y], [x + w, y], [x, y - h]], col); c.line(R(x), R(y - h), R(x + w), y, rim); c.rect(R(x) - 1, y, 3, 4, col); }
}
function river(c, y0, y1, sunX) {
  band(c, y0, y1, ["#3A2C66", "#2B2D76", "#22215E", "#1A1748"]);
  for (let y = y0 + 3; y < y1; y += 5) for (let x = (y * 7) % 23; x < 540; x += 23 + (y % 11)) c.rect(x, y, 6 + (x % 5), 1, (Math.abs(x - sunX) < 40 - (y - y0) * 0.2) ? "#FAE375" : "#4A58B8");
  for (let y = y0; y < y1; y += 3) { const w = 26 - (y - y0) * 0.15; if (w > 2) for (let x = -w; x < w; x += 4 + (y % 3)) c.rect(R(sunX + x + Math.sin(y) * 3), y, 2, 1, "#F6C860"); }
}
function bank(c, yTop, slopeTo, col, hi) {
  for (let x = 0; x < 540; x++) { const yt = R(yTop + (x / 540) * (slopeTo - yTop) + Math.sin(x * 0.05) * 2); for (let y = yt; y < BOT + 4; y++) c.px(x, y, y === yt ? hi : bayer(x, y) < 0.15 ? hi : col); }
  for (let k = 0; k < 60; k++) { const x = R(rnd(k * 5) * 540), yt = R(yTop + (x / 540) * (slopeTo - yTop)) + R(rnd(k * 9) * 30); for (let j = -2; j <= 2; j++) c.line(x, yt, x + j * 2, yt - 4 - Math.abs(j) * 2 - R(rnd(k + j) * 3), j % 2 ? "#6E58A8" : "#4E3B7C"); }
}
function spray(c, cx, cy, n, rx, ry, seed, front, big = 1) {
  for (let i = 0; i < n; i++) {
    const a0 = rnd(i * 3 + seed) * Math.PI * 2, d = 0.35 + rnd(i * 3 + seed + 1) * 0.9, a = a0 + d * 0.9;
    if ((Math.sin(a) > 0.1) !== front) continue;
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d; if (y < TOP + 4 || y > BOT - 2) continue;
    const sz = R((d < 0.7 ? 3 : 2) * big);
    for (let t = 1; t <= 3; t++) { const b = a - 0.07 * t, tx = cx + Math.cos(b) * rx * (d - 0.05 * t), ty = cy + Math.sin(b) * ry * (d - 0.05 * t); fade(c, 0.55 - t * 0.15).rect(R(tx), R(ty), Math.max(1, R(big)), Math.max(1, R(big)), WATER); }
    c.rect(R(x), R(y), sz, sz, WATER); c.px(R(x), R(y), IV); if (sz >= 3) c.rect(R(x) + sz - 1, R(y) + sz - 1, 1, 1, "#6A78D0");
  }
}

// ---------------------------------------------------------------- overlay: header, captions, avatar
function chrome(c, title, caption, spokenWords, fillChars, dur = "60 S") {
  c.rect(0, 0, 540, TOP - 2, K); c.rect(0, BOT + 2, 540, 960 - BOT - 2, K);
  for (let x = 0; x < 540; x++) for (let j = 0; j < 8; j++) { if (bayer(x, TOP - 2 + j) > j / 8) c.px(x, TOP - 2 + j, K); if (bayer(x, BOT + 2 - j) > j / 8) c.px(x, BOT + 2 - j, K); }
  c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 }); c.text(MAIN, dur, 469 - c.measure(MAIN, dur, { scale: 2 }), 136, MU, { scale: 2 });
  c.text(MAIN, title, 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
  const o = { scale: 3 }, w = c.measure(MAIN, caption, o), x0 = R(270 - w / 2), words = caption.split(" ");
  const spoken = x0 + c.measure(MAIN, words.slice(0, spokenWords).join(" ") + " ", o), fill = spoken + c.measure(MAIN, words[spokenWords].slice(0, fillChars), o);
  c.text(MAIN, caption, x0 + 1, 691, O, o); c.text(MAIN, caption, x0, 690, IV, { ...o, colorAt: (X) => (X < spoken ? IV : X < fill ? Y : mix(IV, K, 0.62)) });
}
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
const AV = await avatar(66);
async function save(c, name) { const base = HERE + `.${name}.png`; await c.save(base, 2); await sharp(base).composite([{ input: AV, left: 76, top: 254 }]).png().toFile(HERE + name + ".png"); (await import("node:fs")).unlinkSync(base); console.log(name); }
// rim light: brighten dog pixels whose upper/right neighbour is not dog (backlit by the sunset)
function rim(c, x0, y0, x1, y1, col) {
  const isDog = (x, y) => { const p = c.get(x, y); return GOLD.some((g) => { const q = hex(g); return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) < 30; }); };
  const marks = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (isDog(x, y) && (!isDog(x, y - 2) || !isDog(x + 2, y))) marks.push([x, y]);
  for (const [x, y] of marks) c.px(x, y, col);
}
function furTexture(c, x0, y0, x1, y1, n, seed) {
  const isDog = (x, y) => { const p = c.get(x, y); return GOLD.some((g) => { const q = hex(g); return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) < 30; }); };
  for (let i = 0; i < n; i++) { const x = R(x0 + rnd(i * 2 + seed) * (x1 - x0)), y = R(y0 + rnd(i * 2 + seed + 1) * (y1 - y0)); if (!isDog(x, y) || !isDog(x + 4, y + 2)) continue; const p = c.get(x, y); c.line(x, y, x + 3 + (i % 3), y + 1 + (i % 2), mix(p, i % 2 ? GOLD[4] : GOLD[1], 0.55)); }
}

// ================================================================ A · side-scroller wide shot: the Labrador climbs out of the river
{
  const c = new Canvas(540, 960, K), H = 452, SX = 400;
  sunsetSky(c, H, SX); hills(c, H); forest(c, H + 6, "#1D1430", "#8A4466", 17, 22, 42, 3);
  river(c, H + 6, 600, SX);
  forest(c, 470, "#140E24", "#5A2E5E", 23, 34, 64, 9);  // far bank trees reflected? (front row of far bank)
  river(c, 470, 612, SX);
  bank(c, 606, 640, "#231A36", "#3B2C5C");
  // reeds on both sides
  for (let k = 0; k < 22; k++) { const x = R(rnd(k * 13) * 540), y = 606 + R(rnd(k * 17) * 8), h = 18 + rnd(k) * 22; c.line(x, y, x + R((rnd(k * 3) - 0.5) * 6), R(y - h), k % 3 ? "#2E2445" : "#4E3B7C"); if (k % 4 === 0) c.rect(x - 1, R(y - h) - 3, 3, 5, "#6E4632"); }
  // the dog: front paws on the bank, hind legs still in the shallows
  const GX = 236, GY = 652, SC = 2.0;
  drawDog2(c, GX, GY, SC, { phase: 0.4, shake: 0.25, light: [0.8, -0.6], litOutline: "#FAE375" });
  // water around the hind legs + ripples + drips
  for (let x = GX + 40; x < GX + 130; x++) for (let y = 628; y < 662; y++) if (bayer(x, y) < 0.62 - (y - 628) * 0.004) c.px(x, y, mix("#22215E", "#2B2D76", (x % 5) / 5));
  for (const r of [18, 30, 44]) c.ering(GX + 84, 640, r, R(r * 0.22), mix("#6A78D0", K, r / 60));
  for (let k = 0; k < 16; k++) { const x = GX - 70 + rnd(k * 3) * 160, y = GY - 60 + rnd(k * 5) * 70; c.rect(R(x), R(y), 2, 3, WATER); c.px(R(x), R(y) + 4, mix(WATER, K, 0.5)); }
  { const x = 22, y = 202; c.rrect(x, y, 128, 26, p6, 1); c.rect(x + 1, y + 1, 126, 24, CARD); c.text(MAIN, "70% IN SEC", x + 9, y + 6, Y, { scale: 2 }); }
  chrome(c, "HOW A DOG SHAKES DRY", "A WET DOG CAN FLING", 3, 2);
  await save(c, "variant-1-side");
}

// ================================================================ B · cinematic slow-motion close-up, backlit droplets
{
  const c = new Canvas(540, 960, K);
  band(c, TOP, BOT, ["#0E0A22", "#1D1438", "#2A1A44", "#3A2050", "#2A1A44", "#140E24"]);
  // out-of-focus lights (pixel bokeh)
  for (let i = 0; i < 26; i++) { const x = R(rnd(i * 5 + 1) * 540), y = TOP + 20 + R(rnd(i * 5 + 2) * 460), r = 6 + R(rnd(i) * 16), col = i % 3 ? "#5A2E5E" : "#C8665A"; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { const d = Math.hypot(xx, yy) / r; if (d <= 1 && (0.35 + (1 - d) * 0.25) > bayer(x + xx, y + yy)) c.px(x + xx, y + yy, mix(c.get(x + xx, y + yy), col, 0.45)); } }
  // speed arcs of the swing behind the dog
  for (let k = 0; k < 6; k++) c.ering(300, 470, 160 + k * 14, 70 + k * 6, mix("#FAE375", K, 0.55 + k * 0.07), Math.PI * 1.05, Math.PI * 1.7);
  const SC = 4.4, GX = 420, GY = 830;
  spray(c, 230, 430, 140, 300, 190, 11, false, 2);
  drawDog2(c, GX, GY, SC, { phase: 0.2, sway: -30, legs: false, alpha: 0.22, light: [0.8, -0.6] });
  drawDog2(c, GX, GY, SC, { phase: 1.3, light: [0.8, -0.6], litOutline: "#FAE375" });
  furTexture(c, 0, 250, 540, 680, 1800, 5);
  spray(c, 230, 430, 120, 300, 190, 23, true, 2.2);
  for (let i = 0; i < 9; i++) { const x = 40 + rnd(i * 7) * 460, y = 230 + rnd(i * 9) * 200, r = 4 + R(rnd(i) * 4); c.disc(R(x), R(y), r + 1, "#6A78D0"); c.disc(R(x), R(y), r, WATER); c.disc(R(x) - 1, R(y) - 1, Math.max(1, r - 2), "#D8E4FF"); c.px(R(x) - r / 2, R(y) - r / 2, IV); }
  { const x = 22, y = 202; c.rrect(x, y, 120, 26, p6, 1); c.rect(x + 1, y + 1, 118, 24, CARD); c.text(MAIN, "SLOW-MO", x + 10, y + 6, p8, { scale: 2 }); for (let i = 0; i < 3; i++) c.rect(x + 102 + i * 4, y + 8, 2, 10, i === 2 ? Y : p7); }
  { const x = 352, y = 202; c.rrect(x, y, 168, 26, Y, 1); c.rect(x + 1, y + 1, 166, 24, CARD); c.text(MAIN, "SKIN ±90° ×3", x + 9, y + 6, Y, { scale: 2 }); }
  chrome(c, "HOW A DOG SHAKES DRY", "ITS LOOSE SKIN WHIPS", 3, 3);
  await save(c, "variant-2-closeup");
}

// ================================================================ C · front-facing game cut-scene with a shake meter
{
  const c = new Canvas(540, 960, K), H = 430, SX = 270;
  sunsetSky(c, H, SX); hills(c, H); forest(c, H + 4, "#1D1430", "#8A4466", 15, 20, 40, 7);
  river(c, H + 4, 560, SX);
  bank(c, 556, 562, "#231A36", "#3B2C5C");
  const CX = 270, CY = 488, SC = 3.0;
  spray(c, CX, CY - 30, 120, 250, 150, 41, false, 1.8);
  drawDogFront2(c, CX, CY, SC, { a: -0.42, flap: 1, alpha: 0.2, bodyToo: false });
  drawDogFront2(c, CX, CY, SC, { a: 0.05, flap: 0.6, alpha: 0.2, bodyToo: false });
  drawDogFront2(c, CX, CY, SC, { a: 0.3, flap: 1, litOutline: "#FAE375" });
  spray(c, CX, CY - 30, 110, 250, 150, 57, true, 1.8);
  // ring of spray around the head
  for (let i = 0; i < 36; i++) { const t = (i / 36) * Math.PI * 2, d = 128 + (i % 3) * 8, x = CX + Math.cos(t) * d * 1.05, y = CY - 40 + Math.sin(t) * d * 0.7; c.rect(R(x), R(y), 3, 3, WATER); c.px(R(x), R(y), IV); c.line(R(x), R(y), R(x - Math.cos(t + 1.2) * 6), R(y - Math.sin(t + 1.2) * 4), mix(WATER, K, 0.5)); }
  // game HUD: shake meter
  { const x = 22, y = 200, w = 496; c.rrect(x, y, w, 52, Y, 2); c.rrect(x + 2, y + 2, w - 4, 48, CARD, 2);
    c.text(MAIN, "SHAKE", x + 12, y + 10, IV, { scale: 2 }); c.text(MAIN, "LABRADOR", x + 12, y + 32, MU);
    for (let i = 0; i < 18; i++) { const on = i < 13, h = 6 + i; c.rect(x + 104 + i * 12, y + 44 - h, 8, h, on ? (i < 10 ? Y : YL) : p3); }
    c.text(MAIN, "4.5/S", x + 330, y + 12, Y, { scale: 4 }); }
  chrome(c, "HOW A DOG SHAKES DRY", "FOUR AND A HALF TIMES", 2, 3);
  await save(c, "variant-3-front");
}
