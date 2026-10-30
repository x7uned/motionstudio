// Test frame «How a dog shakes dry» (pixel-film style): lake-shore diorama, a Labrador mid-shake with spiral spray,
// x-ray swing gauge (spine vs loose skin) and the 4.5 shakes/sec counter. 540×960 grid ×2.
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex, fade } from "../../../renderer/pixel/raster.mjs";
import { iso, COLORS as C } from "../tap-film/iso.mjs";
import { drawDog } from "./dog.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const { O, CARD, IV, Y, YL, GR, MU, L, P, p1, p2, p3, p4, p5, p6, p7, p8 } = C;
const K = "#000000", S = 2, c = new Canvas(540, 960, K), R = Math.round;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- stage background
for (let i = 0; i < 70; i++) c.px(Math.floor(rnd(i * 2 + 1) * 540), 190 + Math.floor(rnd(i * 2 + 2) * 490), i % 6 ? "#3B3352" : MU);
c.tint(0, 190, 540, 490, (x, y) => Math.max(0, 0.35 - Math.hypot(x - 270, (y - 470) * 1.1) / 360), "#2A1B4A", 10);

// ---------------------------------------------------------------- lake-shore diorama (iso units 160×120)
const U = 1.75, CX = 80, CY = 60, ax = 270, ay = 500, ox = ax - (CX - CY) * U, oy = ay - ((CX + CY) / 2) * U;
const I = iso(c, ox, oy, U), { P3, quad, seg, box, onLeft, onRight } = I;
{ const [sx, sy] = P3(80, 60, -10); c.ellipse(R(sx), R(sy + 8), R(150 * U), R(48 * U), "#0A0714"); }
box(0, 0, -10, 160, 120, 10, { top: "#3A3252", left: p3, right: p2, hi: p5, grad: 0 });
// water (back), dithered ripples
quad([[0, 0, 0], [160, 0, 0], [160, 58, 0], [0, 58, 0]], null, (x, y) => (((x * 3 + y * 7) % 23) < 2 ? "#4A58B8" : bayer(x, y) < 0.18 ? "#2B2D76" : "#22215E"));
for (let k = 0; k < 9; k++) { const x0 = 10 + rnd(k * 3) * 130, y0 = 6 + rnd(k * 5) * 44; seg([x0, y0, 0.2], [x0 + 10, y0, 0.2], "#6A78D0"); }
// shoreline + stones + grass tufts
quad([[0, 58, 0], [160, 58, 0], [160, 120, 0], [0, 120, 0]], null, (x, y) => (bayer(x, y) < 0.12 ? "#62567E" : "#4E4468"));
seg([0, 58, 0.3], [160, 58, 0.3], "#8A7EB0");
for (let k = 0; k < 26; k++) { const [sx, sy] = P3(4 + rnd(k * 7) * 152, 62 + rnd(k * 11) * 54, 0); c.ellipse(R(sx), R(sy), R(2 + rnd(k) * 3), R(1 + rnd(k + 9) * 1.5), k % 3 ? "#6E6290" : "#3B3252"); }
for (let k = 0; k < 14; k++) { const [sx, sy] = P3(6 + rnd(k * 13) * 148, 64 + rnd(k * 17) * 50, 0); for (let j = -2; j <= 2; j++) c.line(R(sx), R(sy), R(sx + j * 2), R(sy - 5 - Math.abs(j)), j % 2 ? "#6E58A8" : "#4E3B7C"); }
// wooden dock into the water
for (let x = 104; x < 128; x += 4) box(x, 8, 0, 3.4, 52, 3, { top: "#7A5A8C", left: "#5E4472", right: "#45325A", grad: 0 });
for (const [x, y] of [[104, 10], [124, 10], [104, 34], [124, 34]]) box(x, y, -6, 3, 3, 8, { top: "#45325A", left: "#3A2850", right: "#2A1D3A", grad: 0 });
// reeds along the water edge, trees at the back
for (let k = 0; k < 18; k++) { const [sx, sy] = P3(4 + k * 5.2, 56 + rnd(k) * 3, 0), h = 10 + rnd(k * 3) * 10; c.line(R(sx), R(sy), R(sx + (rnd(k * 7) - 0.5) * 4), R(sy - h), k % 3 ? "#3E2F66" : "#5E4A96"); if (k % 4 === 0) c.rect(R(sx) - 1, R(sy - h) - 2, 2, 4, "#6E4632"); }
const tree = (x, y, h) => { const [bx, by] = P3(x, y, 0), [, ty] = P3(x, y, h); c.rect(R(bx) - 1, R(ty), 3, R(by - ty), "#3B2C3A"); c.ellipse(R(bx), R(ty - 6 * U), R(12 * U), R(10 * U), "#3E2F66"); c.ellipse(R(bx - 3 * U), R(ty - 8 * U), R(8 * U), R(7 * U), "#5E4A96"); c.ellipse(R(bx - 5 * U), R(ty - 10 * U), R(3 * U), R(3 * U), "#8A76C4"); };
tree(10, 4, 22); tree(24, 0, 28); tree(152, 2, 20);
// puddle where the dog stands
const [dx, dy] = P3(66, 92, 0);
c.ellipse(R(dx + 6), R(dy + 4), 70, 13, "#2B2D76"); c.ellipse(R(dx + 6), R(dy + 3), 62, 10, "#36398E");

// ---------------------------------------------------------------- the dog (anatomical silhouette, mid-shake)
const SC = 1.65, PH = 1.2, GX = R(dx + 6), GY = R(dy + 4), DX = GX, DY = GY - R(44 * SC);
// motion smear: ghost copies either side, dithered
drawDog(fade(c, 0.24), GX, GY, SC, { phase: PH - 1.5, sway: -16, legs: false }); drawDog(fade(c, 0.24), GX, GY, SC, { phase: PH + 1.5, sway: 16, legs: false });
const spray = (front) => { for (let i = 0; i < 110; i++) {
  const a0 = rnd(i * 3 + 1) * Math.PI * 2, d = 70 + rnd(i * 3 + 2) * 120, a = a0 + 0.01 * d;
  const x = DX + Math.cos(a) * d * 1.1, y = DY + Math.sin(a) * d * 0.62; if ((Math.sin(a) > 0.15) !== front) continue; if (y > 676 || y < 200) continue;
  const sz = d < 110 ? 3 : 2; for (let t = 1; t <= 3; t++) { const b = a - 0.045 * t, tx = DX + Math.cos(b) * (d - 8 * t) * 1.1, ty = DY + Math.sin(b) * (d - 8 * t) * 0.62; fade(c, 0.6 - t * 0.17).px(R(tx), R(ty), "#A9C4FF"); }
  c.rect(R(x), R(y), sz, sz, "#A9C4FF"); c.px(R(x), R(y), IV); if (sz === 3) c.px(R(x) + 2, R(y) + 2, "#6A78D0");
} };
spray(false);
drawDog(c, GX, GY, SC, { phase: PH });
spray(true);
for (let k = 0; k < 8; k++) { const x = GX - 70 + k * 18, y = GY - 18 + rnd(k) * 14; c.rect(R(x), R(y), 2, 3, "#A9C4FF"); }

// ---------------------------------------------------------------- x-ray swing gauge above the back
{ const gx = DX - 4, gy = DY - 34;
  const arc = (r, deg, col, thick) => { for (let t = 0; t < thick; t++) c.ering(gx, gy, r + t, R((r + t) * 0.55), col, -Math.PI / 2 - (deg * Math.PI) / 180, -Math.PI / 2 + (deg * Math.PI) / 180); };
  arc(40, 30, p8, 2); arc(78, 90, Y, 2);
  for (const sgn of [-1, 1]) { const a1 = -Math.PI / 2 + sgn * Math.PI / 6, a2 = -Math.PI / 2 + sgn * Math.PI / 2;
    c.line(gx, gy, R(gx + Math.cos(a1) * 40), R(gy + Math.sin(a1) * 22), mix(p8, K, 0.4), [2, 2]); c.line(gx, gy, R(gx + Math.cos(a2) * 78), R(gy + Math.sin(a2) * 43), mix(Y, K, 0.4), [2, 2]); }
  const tag = (x, y, t1, t2, col) => { const w = Math.max(c.measure(MAIN, t1), c.measure(MAIN, t2)) + 12; c.rrect(x, y, w, 26, col, 1); c.rect(x + 1, y + 1, w - 2, 24, CARD); c.text(MAIN, t1, x + 6, y + 4, col); c.text(MAIN, t2, x + 6, y + 14, IV); };
  tag(gx - 150, gy - 52, "SPINE", "±30°", p8); tag(gx + 86, gy - 52, "LOOSE SKIN", "±90° ×3", Y);
}

// ---------------------------------------------------------------- HUD: counter + slow-motion badge + place tag
{ const x = 326, y = 202, w = 194, h = 64; c.rrect(x, y, w, h, Y, 2); c.rrect(x + 2, y + 2, w - 4, h - 4, CARD, 2);
  c.text(MAIN, "4.5", x + 12, y + 10, Y, { scale: 4 }); c.text(MAIN, "SHAKES", x + 96, y + 14, IV, { scale: 2 }); c.text(MAIN, "PER SEC", x + 96, y + 34, IV, { scale: 2 });
  c.text(MAIN, "LABRADOR", x + 12, y + 50, MU); }
{ const x = 20, y = 202, w = 120; c.rrect(x, y, w, 26, p6, 1); c.rect(x + 1, y + 1, w - 2, 24, CARD); c.text(MAIN, "SLOW-MO", x + 10, y + 6, p8, { scale: 2 });
  for (let i = 0; i < 3; i++) c.rect(x + 100 + i * 4, y + 8, 2, 10, i === 2 ? Y : p7); }

// ---------------------------------------------------------------- header + karaoke caption
c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 });
c.text(MAIN, "60 S", 469 - c.measure(MAIN, "60 S", { scale: 2 }), 136, MU, { scale: 2 });
c.text(MAIN, "HOW A DOG SHAKES DRY", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
{ const o = { scale: 3 }, cap = "ITS LOOSE SKIN WHIPS", w = c.measure(MAIN, cap, o), x0 = R(270 - w / 2), spoken = x0 + c.measure(MAIN, "ITS LOOSE SKIN ", o), fill = x0 + c.measure(MAIN, "ITS LOOSE SKIN WHI", o);
  c.text(MAIN, cap, x0 + 1, 691, O, o); c.text(MAIN, cap, x0, 690, IV, { ...o, colorAt: (X) => (X < spoken ? IV : X < fill ? Y : mix(IV, K, 0.62)) }); }
// stage edges
c.rect(0, 0, 540, 188, K); c.rect(0, 682, 540, 4, K);
for (let x = 0; x < 540; x++) for (let j = 0; j < 8; j++) if (bayer(x, 188 + j) > j / 8) c.px(x, 188 + j, K);
c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 }); c.text(MAIN, "60 S", 469 - c.measure(MAIN, "60 S", { scale: 2 }), 136, MU, { scale: 2 });
c.text(MAIN, "HOW A DOG SHAKES DRY", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });

// ---------------------------------------------------------------- avatar (full resolution) and save
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
const base = HERE + ".frame-base.png";
await c.save(base, S);
await sharp(base).composite([{ input: await avatar(66), left: 76, top: 254 }]).png().toFile(HERE + "frame-dog.png");
console.log("frame-dog.png");
