// Style B · 16-bit: 270×480 grid ×4, shaded ramps + ordered dithering, dollhouse cutaway, RPG dialog captions.
import { Canvas, MAIN, loadImage, mix, bayer } from "./pixel.mjs";

const ROOT = "/Users/rv/Desktop/Motion Studio/";
const S = 4, W = 270, H = 480;
const K = "#000000", O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", YL = "#FAE375", GR = "#65DA41", PK = "#E03056", MU = "#959595", L = "#E0CDF8", P = "#8D59DA";
// Purple ramp (dark → light) built around the brand purple.
const p1 = "#1D1628", p2 = "#2A1F40", p3 = "#3B2C5C", p4 = "#523D82", p5 = "#6E4FB0", p6 = P, p7 = "#B08AE8", p8 = L;
const y0 = "#6B4A12", y1 = "#B88A2A";
const c = new Canvas(W, H, K);

// ---- Sky: dithered night gradient, stars, moon, distant skyline.
c.dither(0, 94, W, 230, (x, y) => (y - 94) / 230 * 1.2, CARD);
c.dither(0, 200, W, 124, (x, y) => (y - 200) / 124, p1);
for (const [x, y, b] of [[12, 104, 1], [40, 120, 0], [70, 100, 0], [96, 132, 1], [160, 104, 0], [186, 126, 0], [250, 140, 1], [24, 160, 0], [244, 104, 0], [120, 98, 0], [8, 200, 0], [260, 190, 0]]) {
  c.px(x, y, b ? IV : MU); if (b) { c.px(x - 1, y, p5); c.px(x + 1, y, p5); c.px(x, y - 1, p5); c.px(x, y + 1, p5); }
}
c.disc(226, 116, 10, "#F6E7A8"); c.disc(226, 116, 9, YL);
c.tint(216, 106, 20, 20, (x, y) => (Math.hypot(x - 231, y - 112) < 7 ? 0.35 : 0), y1, 2);
c.disc(222, 120, 2, "#E9C964"); c.disc(229, 112, 1, "#E9C964");
// Skyline behind the house.
for (const [x, w, h] of [[0, 18, 46], [16, 14, 70], [242, 16, 64], [256, 14, 40]]) {
  c.rect(x, 318 - h, w, h, CARD);
  for (let j = 318 - h + 4; j < 314; j += 6) for (let i = x + 3; i < x + w - 2; i += 4) if ((i * 7 + j * 3) % 5 === 0) c.rect(i, j, 2, 2, y0);
}

// ---- House shell.
const box = (x, y, w, h, base, hi, lo) => { c.rect(x, y, w, h, base); c.rect(x, y, w, 1, hi); c.rect(x, y, 1, h, hi); c.rect(x, y + h - 1, w, 1, lo); c.rect(x + w - 1, y, 1, h, lo); };
// Roof: tiled triangle with overhang, dark attic inside.
const roofPts = [[26, 176], [135, 120], [244, 176]];
c.poly(roofPts, p4, (x, y) => ((y - 120) % 5 === 0 ? p3 : (y - 120) % 5 === 1 ? p5 : ((x + Math.floor((y - 120) / 5) * 3) % 9 === 0 ? p3 : p4)));
c.line(26, 176, 135, 120, p7); c.line(244, 176, 135, 120, p3); c.line(25, 177, 135, 121, O);
c.poly([[50, 172], [135, 130], [220, 172]], p1);
c.dither(50, 130, 170, 42, (x, y) => 0.25, p2);
c.disc(135, 156, 7, p3); c.disc(135, 156, 6, CARD); c.rect(129, 156, 13, 1, p4); c.rect(135, 150, 1, 13, p4);
c.tint(130, 151, 5, 5, () => 0.6, "#2F3F7A", 2);
// Chimney + antenna.
box(196, 128, 12, 26, p3, p5, p2); box(194, 126, 16, 4, p4, p6, p2);
c.rect(160, 112, 1, 18, p7); c.rect(159, 110, 3, 3, Y); c.px(160, 111, IV);
for (const r of [4, 7, 10]) c.ering(160, 111, r, r, r === 4 ? L : p5, Math.PI * 1.2, Math.PI * 1.8);
// Ceiling slab, floor slab, side walls, ground floor.
box(36, 172, 199, 8, p4, p6, p2);
box(36, 244, 199, 8, p4, p6, p2);
box(36, 172, 6, 146, p3, p5, p2); box(229, 172, 6, 146, p3, p5, p2);
// Wallpapers (each room its own tone) with a faint stripe.
const paper = (x, y, w, h, a, b) => { c.rect(x, y, w, h, a); for (let i = x + 3; i < x + w; i += 8) c.dither(i, y, 2, h, () => 0.5, b); };
paper(42, 180, 91, 64, "#221935", "#271D3D");   // bedroom
paper(138, 180, 91, 64, "#1E1730", "#231B37");  // study
paper(42, 252, 91, 66, "#2A1E40", "#2F2347");   // living room
paper(138, 252, 91, 66, "#1F1832", "#241C38");  // kitchen + hall
// Partition walls with skirting.
box(133, 180, 5, 64, p3, p5, p2); box(133, 252, 5, 66, p3, p5, p2);
for (const [x, y, w] of [[42, 241, 91], [138, 241, 91], [42, 315, 91], [138, 315, 91]]) c.rect(x, y, w, 3, p3);
// Ground.
c.rect(0, 318, W, 22, p1); c.rect(0, 318, W, 1, p4); c.dither(0, 319, W, 21, (x, y) => 0.18, p2);
for (let x = 4; x < W; x += 13) c.rect(x, 322 + (x % 3), 5, 1, p3);

// Idle routes hub → blinds / thermostat run behind the furniture.
const route = (pts, col, gap = 3) => { let n = 0; for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let s = 0; s < len; s++) if (n++ % gap === 0) c.px(Math.round(ax + (bx - ax) * s / len), Math.round(ay + (by - ay) * s / len), col); } };
route([[166, 268], [163, 220]], p6); route([[158, 270], [86, 220]], p6);
// ---- Bedroom (top left): window with half-closed smart blinds, bed.
box(56, 190, 34, 30, p5, p7, p3); c.rect(59, 193, 28, 24, "#141A3A");
c.dither(59, 193, 28, 24, (x, y) => (y - 193) / 30, "#1E2A55");
c.px(66, 210, IV); c.px(80, 200, MU); c.px(72, 214, MU);
for (let j = 0; j < 6; j++) { c.rect(59, 193 + j * 2, 28, 1, p7); c.rect(59, 194 + j * 2, 28, 1, p5); }
c.rect(86, 205, 1, 6, MU); c.rect(85, 211, 3, 2, p7);
c.tint(52, 220, 50, 22, (x, y) => (x > 56 && x < 92 + (y - 220) ? 0.22 : 0), "#3B4A8A", 2);
// Bed.
box(92, 222, 38, 10, p5, p7, p3); box(92, 214, 5, 26, p3, p5, p2); c.rect(98, 218, 12, 5, IV); c.rect(98, 222, 12, 1, MU);
box(108, 219, 22, 7, "#4A3A8A", "#6E5FC0", "#2E2460"); c.rect(96, 232, 2, 9, p2); c.rect(126, 232, 2, 9, p2);
c.text(MAIN, "BLINDS", 52, 228, L, { shadow: O, shadowOffset: 1 });

// ---- Study (top right): thermostat + radiator + desk.
c.disc(162, 208, 10, p5); c.disc(162, 208, 9, p3); c.disc(162, 208, 8, CARD);
c.ering(162, 208, 8, 8, GR, Math.PI * 0.75, Math.PI * 2.25); c.text(MAIN, "21", 156, 205, GR); c.px(167, 205, GR);
box(146, 226, 30, 14, p3, p5, p2); for (let i = 149; i < 174; i += 4) c.rect(i, 228, 2, 10, p5);
c.tint(140, 214, 40, 28, (x, y) => Math.max(0, 0.45 - Math.hypot(x - 161, y - 233) / 40), "#E07A3A", 3);
c.text(MAIN, "HEAT", 180, 198, L, { shadow: O, shadowOffset: 1 });
box(184, 222, 38, 4, p5, p7, p3); c.rect(188, 226, 2, 15, p3); c.rect(216, 226, 2, 15, p3);
box(196, 212, 16, 10, p2, p4, O); c.rect(198, 214, 12, 6, "#2F3F7A"); c.dither(198, 214, 12, 6, () => 0.3, "#4A5FA8");

// ---- Kitchen + hall (bottom right): counter with the hub, robot vacuum, front door with smart lock.
box(142, 288, 46, 30, p4, p6, p2); c.rect(142, 288, 46, 3, p7); for (const x of [150, 165, 180]) c.rect(x, 296, 1, 18, p2), c.rect(x - 4, 300, 2, 2, p6);
// Hub on the counter.
box(158, 272, 14, 16, p5, p7, p3); c.rect(160, 272, 10, 2, Y); for (let j = 277; j < 286; j += 2) c.rect(160, j, 10, 1, p4);
for (const [r, col] of [[9, L], [14, p6], [19, p4]]) c.ering(165, 281, r, r, col, -Math.PI * 0.8, -Math.PI * 0.2);
c.text(MAIN, "HUB", 156, 255, L, { shadow: O, shadowOffset: 1 });
// Robot vacuum.
c.ellipse(204, 314, 9, 3, O); c.ellipse(204, 312, 9, 3, p4); c.ellipse(204, 311, 8, 2, p6); c.rect(203, 310, 3, 1, GR);
// Front door + lock keypad.
box(208, 262, 20, 52, p3, p5, O); box(211, 265, 14, 22, p2, p4, O); box(211, 290, 14, 22, p2, p4, O); c.rect(222, 290, 2, 2, Y);
box(198, 278, 7, 10, p2, p5, O); c.rect(200, 280, 3, 3, GR); c.rect(200, 284, 3, 2, p5);
c.text(MAIN, "LOCK", 205, 254, L, { shadow: O, shadowOffset: 1 });

// ---- Living room (bottom left): character, sofa, lamp ON by the partition, warm light.
// Warm light: a cone under the shade plus a soft radial glow, dithered between steps.
c.tint(42, 252, 91, 66, (x, y) => {
  const cone = y > 272 && Math.abs(x - 119) < 4 + (y - 272) * 0.55 ? 0.42 - (y - 272) / 160 : 0;
  return Math.max(cone, 0.5 - Math.hypot(x - 119, (y - 268) * 1.3) / 46);
}, "#F4B850", 4);
// Sofa.
box(70, 294, 40, 11, p5, p7, p3); box(70, 285, 40, 10, p4, p6, p3); box(66, 291, 7, 17, p5, p7, p3); box(107, 291, 7, 17, p5, p7, p3);
c.rect(72, 305, 3, 9, p2); c.rect(105, 305, 3, 9, p2); c.rect(90, 286, 1, 9, p3);
// Floor lamp by the partition.
c.rect(118, 272, 2, 42, p6); c.rect(119, 272, 1, 42, p7); box(113, 313, 12, 3, p5, p7, p3);
c.poly([[111, 272], [127, 272], [124, 262], [114, 262]], Y); c.rect(114, 262, 10, 1, IV); c.line(111, 272, 114, 262, YL); c.rect(111, 272, 17, 1, y1);
for (const [x, y] of [[106, 262], [131, 260], [119, 255], [108, 255], [128, 268]]) c.px(x, y, YL);
// Character on the left, turned toward the lamp.
const hero = await loadImage(ROOT + "data/branding/xtuned-outro/v1/spritesheet.png", 48, 52, { extract: { left: 3 * 192, top: 2 * 208, width: 192, height: 208 } });
c.ellipse(60, 316, 12, 2, "#140E22");
c.blit(hero, 36, 266, { outline: O, flip: true });

// Hub → lamp: dashed yellow route through the wall, packet arriving at the shade.
const arc = (cx, cy, rx, ry, a0, a1, col, gap) => { const n = 120; for (let i = 0; i <= n; i++) { if (i % gap) continue; const a = a0 + (a1 - a0) * i / n; c.px(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), col); } };
arc(146, 272, 20, 12, -Math.PI * 0.05, -Math.PI * 0.95, Y, 3);
const pk = ["OYYYYYO", "YIYYYIY", "YYIYIYY", "YYYIYYY", "OYYYYYO"];
c.sprite(124, 255, pk, { Y, I: IV, O });
// Idle routes to the other devices: faint dotted lavender.
route([[174, 280], [197, 282]], p6);
// Callout window "LAMP · ON" above the sofa.
const win = (x, y, w, h) => { c.rrect(x, y, w, h, p8, 1); c.rect(x + 1, y + 1, w - 2, h - 2, p6); c.rect(x + 2, y + 2, w - 4, h - 4, CARD); };
win(66, 258, 42, 13); c.text(MAIN, "LAMP", 69, 261, IV); c.text(MAIN, "ON", 69 + c.measure(MAIN, "LAMP "), 261, GR);
c.line(108, 264, 111, 266, p8);

// ---- Header (overlay v2, TikTok-safe): avatar (head from the outro sprite), handle, duration, title.
const head = await loadImage(ROOT + "data/branding/xtuned-outro/v1/spritesheet.png", 13, 13, { extract: { left: 50, top: 4, width: 92, height: 92 } });
c.disc(27, 66, 8, P); c.disc(27, 66, 7, O); c.blit(head, 21, 60);
c.text(MAIN, "@KAGENAMI_AI", 38, 63, IV, { shadow: p2, shadowOffset: 1 });
c.text(MAIN, "10 S", 234 - c.measure(MAIN, "10 S"), 63, MU);
c.text(MAIN, "HOW A SMART HOME THINKS", 20, 80, IV, { bold: true, shadow: p3, shadowOffset: 1 });

// ---- RPG dialog box with karaoke caption.
const bx = 16, by = 342, bw = 238, bh = 44;
c.rrect(bx, by, bw, bh, p8, 2); c.rrect(bx + 1, by + 1, bw - 2, bh - 2, p6, 2); c.rrect(bx + 2, by + 2, bw - 4, bh - 4, CARD, 1);
c.dither(bx + 3, by + 3, bw - 6, bh - 6, (x, y) => 0.5 - (y - by) / bh, p1);
const lines = ["THE HUB WAKES", "THE LAMP"], o = { scale: 2, shadow: O, shadowOffset: 1 };
let spoken = "THE HUB WAKES THE ".length, k = 0;
lines.forEach((ln, i) => {
  const w = c.measure(MAIN, ln, o), x0 = Math.round(135 - w / 2), yy = by + 6 + i * 17;
  const fillTo = i === 1 ? x0 + c.measure(MAIN, "THE LA", o) : 0;
  const before = i === 0 ? Infinity : x0 + c.measure(MAIN, "THE ", o);
  c.text(MAIN, ln, x0, yy, (x) => (x < before ? IV : x < fillTo ? Y : mix(IV, CARD, 0.6)), o);
});
c.sprite(244, 378, ["#####", ".###.", "..#.."], { "#": Y });

await c.save(ROOT + "work/pixel-lab/style-b-16bit.png", S);
console.log("ok");
