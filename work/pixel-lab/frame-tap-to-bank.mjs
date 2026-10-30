// Pixel experiment · "What happens when you tap" — one 32-bit frame (scene 5: the whole route while your bank checks).
// 540×960 grid ×2, flat side view (not isometric), smooth ramps; avatar composited at full resolution.
import sharp from "sharp";
import { Canvas, MAIN, loadImage, mix, hex } from "./pixel.mjs";

const ROOT = "/Users/rv/Desktop/Motion Studio/";
const SHEET = ROOT + "data/branding/xtuned-outro/v1/spritesheet.png";
const S = 2, W = 540, H = 960;
const K = "#000000", O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", YL = "#FAE375", GR = "#65DA41", MU = "#959595", L = "#E0CDF8", P = "#8D59DA", PK = "#E03056";
const p1 = "#1D1628", p2 = "#2A1F40", p3 = "#3B2C5C", p4 = "#523D82", p5 = "#6E4FB0", p6 = P, p7 = "#B08AE8", p8 = L;
const c = new Canvas(W, H, K);
const vgrad = (a, b, y0, y1) => (x, y) => mix(a, b, Math.max(0, Math.min(1, (y - y0) / (y1 - y0))));
const hgrad = (a, b, x0, x1) => (x, y) => mix(a, b, Math.max(0, Math.min(1, (x - x0) / (x1 - x0))));
const fill = (x, y, w, h, shade) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) c.px(i, j, shade(i, j)); };
// Shaded block: light top/left edge, dark bottom/right edge, soft vertical gradient body.
const block = (x, y, w, h, base, { hi = mix(base, IV, 0.22), lo = mix(base, O, 0.45), grad = 0.2 } = {}) => {
  fill(x, y, w, h, vgrad(base, mix(base, O, grad), y, y + h));
  c.rect(x, y, w, 1, hi); c.rect(x, y, 1, h, mix(base, IV, 0.12)); c.rect(x, y + h - 1, w, 1, lo); c.rect(x + w - 1, y, 1, h, lo);
};
const sign = (x, y, text, col = L) => { const w = c.measure(MAIN, text, { scale: 2 }) + 14; c.rrect(x, y, w, 22, p4, 2); c.rrect(x + 1, y + 1, w - 2, 20, CARD, 2); c.text(MAIN, text, x + 7, y + 4, col, { scale: 2 }); };

// ---- Sky: dusk gradient, stars, distant city.
fill(0, 188, W, 492, vgrad(K, "#1C1430", 188, 680));
for (const [x, y, b] of [[30, 214, 1], [500, 230, 0], [470, 300, 1], [22, 330, 0], [512, 380, 0], [40, 260, 0], [480, 200, 0], [16, 420, 0]]) { c.px(x, y, b ? IV : MU); if (b) for (const [a, d] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.px(x + a, y + d, p4); }
for (const [x, w, h] of [[0, 30, 170], [24, 22, 120], [440, 34, 150], [470, 30, 210], [500, 40, 130]]) {
  fill(x, 670 - h, w, h, vgrad("#160F26", "#1E1534", 670 - h, 670));
  for (let j = 670 - h + 8; j < 664; j += 12) for (let i = x + 5; i < x + w - 4; i += 8) if ((i * 7 + j * 5) % 11 < 4) c.rect(i, j, 3, 4, (i + j) % 3 ? "#3A2C20" : "#5C4424");
}
fill(0, 670, W, 10, vgrad(p3, p1, 670, 680)); c.rect(0, 670, W, 1, p5);

// ---- Tower shell.
const X0 = 56, X1 = 428, PIPE = 330;
// Bank pediment + cornice.
c.poly([[44, 238], [236, 196], [440, 238]], null, vgrad(p5, p4, 196, 238));
c.line(44, 238, 236, 196, p7); c.line(236, 196, 440, 238, p3);
c.poly([[70, 234], [236, 204], [414, 234]], null, vgrad(p3, p2, 204, 234));
c.text(MAIN, "YOUR BANK", 236 - c.measure(MAIN, "YOUR BANK", { scale: 2 }) / 2, 218, YL, { scale: 2, shadow: O, shadowOffset: 1 });
block(44, 236, 396, 6, p6);
// Side walls.
block(X0 - 8, 242, 8, 428, p4); block(X1, 242, 8, 428, p3);
// Floors: [top, bottom, wall colour A, B].
const floors = [[242, 340, "#2A1D45", "#1D1430"], [348, 444, "#221B3E", "#17122B"], [452, 546, "#1E1A38", "#141127"], [554, 670, "#3A2438", "#24162A"]];
for (const [t, b, a, z] of floors) fill(X0, t, X1 - X0, b - t, vgrad(z, a, t, b));
for (const y of [340, 444, 546]) { block(X0 - 8, y, X1 - X0 + 16, 8, p5); c.rect(X0, y + 8, X1 - X0, 2, O); }
// Bank columns (pilasters) inside the top floor.
for (const x of [236, 280]) { fill(x, 246, 12, 92, hgrad(p4, p2, x, x + 12)); c.rect(x, 246, 12, 3, p5); c.rect(x - 2, 336, 16, 4, p4); }

// ---- The data pipe through the middle of the tower (route lit up to the bank).
fill(PIPE - 5, 300, 10, 340, hgrad(p3, p1, PIPE - 5, PIPE + 5));
for (let y = 302; y < 638; y++) if (y % 6 < 3) c.rect(PIPE - 1, y, 2, 1, (y % 12 < 6) ? Y : YL);
c.tint(PIPE - 16, 300, 32, 340, (x, y) => Math.max(0, 0.18 - Math.abs(x - PIPE) / 90), Y, 10);

// ---- Café (ground floor).
sign(X0 + 10, 572, "CAFE");
// Awning strip.
for (let x = X0; x < X1; x += 16) { fill(x, 554, 8, 10, vgrad(p6, p5, 554, 564)); fill(x + 8, 554, 8, 10, vgrad(p8, p7, 554, 564)); }
for (let x = X0; x < X1; x += 16) c.ellipse(x + 4, 564, 4, 2, p5), c.ellipse(x + 12, 564, 4, 2, p7);
// Menu board + coffee machine on the back wall.
block(232, 580, 70, 34, CARD, { hi: p5, lo: O }); for (let j = 588; j < 610; j += 6) { c.rect(240, j, 30, 2, p7); c.rect(280, j, 14, 2, YL); }
block(368, 584, 44, 38, p3); block(372, 590, 36, 14, p2); c.rect(380, 594, 6, 2, GR); c.rect(388, 604, 4, 10, p5); c.rect(386, 614, 8, 6, IV);
// Warm lamp light.
for (const lx of [150, 300]) { c.rect(lx, 566, 1, 10, MU); fill(lx - 6, 576, 13, 6, vgrad(YL, Y, 576, 582)); c.tint(X0, 576, X1 - X0, 94, (x, y) => Math.max(0, 0.32 - Math.hypot(x - lx, (y - 582) * 0.9) / 140), "#F6C860", 14); }
// Counter with the terminal.
block(244, 626, 184, 44, p5); c.rect(244, 626, 184, 4, p7); fill(250, 636, 172, 30, vgrad(p4, p3, 636, 666)); for (let x = 262; x < 420; x += 40) c.rect(x, 640, 1, 24, p3);
c.ellipse(276, 624, 8, 2, O); fill(270, 612, 12, 12, hgrad(IV, "#CFC6DA", 270, 282)); c.rect(270, 612, 12, 2, "#8A6A50"); c.rect(282, 615, 3, 5, IV);
block(PIPE - 12, 600, 24, 26, "#2C2440", { hi: p6 }); fill(PIPE - 9, 603, 18, 10, vgrad("#13261A", "#0E1C14", 603, 613));
for (const x of [PIPE - 6, PIPE - 1, PIPE + 4]) c.rect(x, 607, 2, 2, Y);
for (let j = 616; j < 624; j += 3) for (let i = PIPE - 8; i < PIPE + 8; i += 4) c.rect(i, j, 2, 1, p5);
for (const r of [16, 22, 28]) c.ering(PIPE, 606, r, r * 0.55, mix(L, CARD, r / 40), Math.PI * 1.1, Math.PI * 1.9);
// Small table + plant-free corner.
block(74, 640, 46, 5, p6); c.rect(95, 645, 4, 25, p4); c.rect(86, 668, 22, 2, p4);
// Character pointing up at the route.
{ const hero = await loadImage(SHEET, 96, 104, { extract: { left: 2 * 192, top: 4 * 208, width: 192, height: 208 } });
  c.ellipse(184, 669, 26, 4, "#160E1E"); c.blit(hero, 136, 566, { outline: O }); }

// ---- Shop's bank (acquirer): server racks + desk.
sign(X0 + 10, 458, "SHOP'S BANK");
block(76, 506, 90, 6, p6); c.rect(84, 512, 4, 32, p4); c.rect(154, 512, 4, 32, p4);
block(98, 482, 40, 24, O, { hi: p4 }); fill(101, 485, 34, 18, vgrad("#26306A", "#161C40", 485, 503)); for (let j = 488; j < 502; j += 4) c.rect(104, j, 18 + (j % 8), 1, p7);
for (const [x, hot] of [[268, 0], [PIPE - 22, 1], [370, 0]]) {
  block(x, 474, 44, 70, p2, { hi: p4 });
  for (let j = 480; j < 538; j += 8) { block(x + 4, j, 36, 6, p3, { hi: p4 }); c.px(x + 8, j + 2, (j + x) % 3 ? GR : p7); c.px(x + 11, j + 2, hot && j % 16 === 0 ? Y : p5); }
  if (hot) c.tint(x - 6, 470, 56, 78, (i, j) => Math.max(0, 0.22 - Math.abs(i - PIPE) / 80), Y, 8);
}
for (let y = 474; y < 546; y++) if (y % 6 < 3) c.rect(PIPE - 1, y, 2, 1, Y);

// ---- Card network: router reads the first digits, cables fan out to thousands of banks.
sign(X0 + 10, 354, "CARD NETWORK");
const miniBank = (x, y, lit) => { const col = lit ? YL : p6; c.poly([[x - 1, y + 6], [x + 10, y], [x + 21, y + 6]], col); c.rect(x, y + 6, 20, 2, col); for (const i of [2, 8, 14]) c.rect(x + i, y + 8, 3, 9, lit ? Y : p5); c.rect(x - 1, y + 17, 22, 2, col); };
const banks = [[76, 384], [108, 384], [140, 384], [172, 384], [204, 384], [76, 408], [108, 408], [140, 408], [172, 408], [204, 408]];
for (const [x, y] of banks) { c.line(PIPE - 34, 412, x + 10, y + 19, mix(p6, CARD, 0.35), [2, 2]); }
for (const [x, y] of banks) miniBank(x, y, false);
c.text(MAIN, "1000S OF BANKS", 76, 432, mix(L, CARD, 0.25));
block(PIPE - 34, 380, 68, 62, p3, { hi: p6 });
fill(PIPE - 28, 386, 56, 18, vgrad("#1A1430", "#0F0B1E", 386, 404));
c.text(MAIN, "4532", PIPE - 26, 389, YL); c.text(MAIN, "****", PIPE + 2, 389, mix(L, CARD, 0.45));
c.rect(PIPE - 26, 398, 23, 1, Y);
for (let j = 410; j < 438; j += 6) for (let i = PIPE - 28; i < PIPE + 28; i += 6) c.rect(i, j, 3, 3, (i + j) % 4 ? p2 : p5);
c.tint(PIPE - 40, 376, 80, 70, (x, y) => Math.max(0, 0.2 - Math.hypot(x - PIPE, y - 395) / 160), Y, 8);
// Route up to your bank.
for (let y = 342; y < 380; y++) if (y % 6 < 3) c.rect(PIPE - 1, y, 2, 1, Y);
c.text(MAIN, ">", PIPE + 38, 389, Y, { scale: 2 }); c.text(MAIN, "YOURS", PIPE + 52, 391, Y);

// ---- Your bank: vault, scanner with the one-time code, three checks.
// Vault door.
const VX = 394, VY = 292; c.disc(VX, VY, 32, p3); c.disc(VX, VY, 30, p6); c.disc(VX, VY, 26, p4); c.disc(VX, VY, 22, p5);
for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; c.rect(Math.round(VX + Math.cos(t) * 27) - 1, Math.round(VY + Math.sin(t) * 27) - 1, 3, 3, YL); }
c.ring(VX, VY, 9, p8); for (let a = 0; a < 3; a++) { const t = (a / 3) * Math.PI * 2 + 0.4; c.line(VX, VY, Math.round(VX + Math.cos(t) * 16), Math.round(VY + Math.sin(t) * 16), p8); }
c.disc(VX, VY, 3, YL);
c.tint(VX - 34, VY - 34, 68, 68, (x, y) => Math.max(0, 0.18 - Math.hypot(x - VX + 10, y - VY + 12) / 50), IV, 6);
// Scanner arch over the packet.
block(PIPE - 34, 316, 68, 22, p4, { hi: p6 }); c.rect(PIPE - 34, 316, 68, 3, p7);
c.ering(PIPE, 316, 32, 46, p7, Math.PI, Math.PI * 2); c.ering(PIPE, 316, 30, 44, p5, Math.PI, Math.PI * 2);
c.tint(PIPE - 30, 272, 60, 44, (x, y) => (Math.abs(y - 292) < 2 ? 0.55 : Math.max(0, 0.22 - Math.abs(y - 292) / 60)), L, 8);
c.rect(PIPE - 28, 292, 56, 1, p8);
// Packet: envelope with the one-time code and a lock badge.
{ const ex = PIPE - 13, ey = 286; c.tint(ex - 10, ey - 10, 46, 36, (x, y) => Math.max(0, 0.45 - Math.hypot(x - ex - 13, y - ey - 9) / 22), YL, 10);
  block(ex, ey, 26, 18, Y, { hi: IV, lo: "#B88A2A", grad: 0.1 }); c.line(ex + 1, ey + 1, ex + 13, ey + 10, "#B88A2A"); c.line(ex + 24, ey + 1, ex + 13, ey + 10, "#B88A2A");
  block(ex + 18, ey + 10, 11, 9, p6, { hi: p8 }); c.ering(ex + 23, ey + 10, 3, 4, p8, Math.PI, Math.PI * 2); c.rect(ex + 23, ey + 13, 1, 3, O); }
// Checks board.
{ const bx = 68, by = 252, bw = 150, bh = 84;
  c.rrect(bx, by, bw, bh, p7, 2); c.rrect(bx + 1, by + 1, bw - 2, bh - 2, p5, 2); fill(bx + 3, by + 3, bw - 6, bh - 6, vgrad("#140E24", "#0C0816", by, by + bh));
  const row = (y, icon, text, col, ic) => { c.text(MAIN, icon, bx + 10, y, ic ?? col, { scale: 2 }); c.text(MAIN, text, bx + 30, y, col, { scale: 2 }); };
  row(by + 9, "✓", "CODE", GR);
  row(by + 33, ">", "MONEY", Y); for (let i = 0; i < 6; i++) c.rect(bx + 104 + i * 6, by + 39, 4, 4, i < 3 ? Y : p3);
  row(by + 57, "?", "LIKE YOU", mix(L, CARD, 0.55)); }
// Erase the board's overlap with the right pilaster/column is fine: board sits in front of it.

// ---- Header text (avatar composited afterwards).
c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 });
c.text(MAIN, "90 S", 469 - c.measure(MAIN, "90 S", { scale: 2 }), 136, MU, { scale: 2 });
c.text(MAIN, "WHAT HAPPENS WHEN YOU TAP", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
// ---- Karaoke caption.
{ const o = { scale: 3, shadow: O, shadowOffset: 1 }, cap = "IS THERE ENOUGH MONEY", w = c.measure(MAIN, cap, o), x0 = Math.round(270 - w / 2);
  const spoken = x0 + c.measure(MAIN, "IS THERE ENOUGH ", o), f = x0 + c.measure(MAIN, "IS THERE ENOUGH MON", o);
  c.text(MAIN, cap, x0, 687, (x) => (x < spoken ? IV : x < f ? Y : mix(IV, K, 0.6)), o); }

// ---- Avatar at full resolution: face + upper body in a purple ring.
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(SHEET).extract({ left: 44, top: 6, width: 104, height: 104 })
    .resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size * 4), sw = img.info.width, off = r - inner;
  const sprite = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null;
    if (d <= inner) { col = sprite(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sprite(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } }
    else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P);
    if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; }
  }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}
const tmp = ROOT + "work/pixel-lab/.frame-base.png";
await c.save(tmp, S);
await sharp(tmp).composite([{ input: await avatar(66), left: 76, top: 254 }]).png().toFile(ROOT + "work/pixel-lab/frame-tap-to-bank.png");
console.log("ok");
