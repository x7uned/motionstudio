// Style D · "32-bit" isometric diorama: the same room as C on a 540×960 grid ×2 (twice the pixels),
// smoother colour ramps, finer detail; avatar composited at full 1080 resolution (face + upper body).
import sharp from "sharp";
import { Canvas, MAIN, TINY, loadImage, mix, hex } from "./pixel.mjs";

const ROOT = "/Users/rv/Desktop/Motion Studio/";
const SHEET = ROOT + "data/branding/xtuned-outro/v1/spritesheet.png";
const S = 2, W = 540, H = 960, U = 1.5;
const K = "#000000", O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", YL = "#FAE375", GR = "#65DA41", MU = "#959595", L = "#E0CDF8", P = "#8D59DA";
const p1 = "#1D1628", p2 = "#2A1F40", p3 = "#3B2C5C", p4 = "#523D82", p5 = "#6E4FB0", p6 = P, p7 = "#B08AE8", p8 = L;
const c = new Canvas(W, H, K);

const OX = 270, OY = 375, R = 144;
const P3 = (x, y, z) => [OX + (x - y) * U, OY + ((x + y) / 2 - z) * U];
const quad = (pts, col, shade) => c.poly(pts.map((p) => P3(...p)), col, shade);
const seg = (a, b, col) => { const [x0, y0] = P3(...a), [x1, y1] = P3(...b); c.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), col); };
// Vertical gradient shade for faces: lighter at the top.
const vgrad = (top, bottom, y0, y1) => (x, y) => mix(top, bottom, Math.max(0, Math.min(1, (y - y0) / (y1 - y0))));
function box(x, y, z, w, d, h, { top, left, right, hi, edge, grad = 0.18 }) {
  const lo = (col) => mix(col, O, grad);
  const yl = [P3(x, y + d, z + h)[1], P3(x + w, y + d, z)[1]], yr = [P3(x + w, y, z + h)[1], P3(x + w, y + d, z)[1]];
  quad([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], left, vgrad(left, lo(left), yl[0], yl[1]));
  quad([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], right, vgrad(right, lo(right), yr[0], yr[1]));
  quad([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top);
  if (hi) { seg([x, y + d, z + h], [x + w, y + d, z + h], hi); seg([x + w, y, z + h], [x + w, y + d, z + h], hi); }
  seg([x + w, y + d, z], [x + w, y + d, z + h], edge ?? mix(right, IV, 0.12));
}
const M = {
  purple: { top: p6, left: p5, right: p4, hi: p7 },
  dark: { top: p4, left: p3, right: p2, hi: p5 },
  deep: { top: p3, left: p2, right: p1, hi: p4 },
  lav: { top: p8, left: p7, right: p5, hi: IV },
};
// Soft contact shadow on the floor under an object footprint.
const shadow = (x, y, w, d, k = 0.35) => { const pts = [[x - 2, y - 2, 0], [x + w + 3, y - 2, 0], [x + w + 3, y + d + 3, 0], [x - 2, y + d + 3, 0]].map((p) => P3(...p)); c.poly(pts, null, (sx, sy) => mix(c.get(sx, sy), O, k)); };
const ell = (x, y, z, r) => { const [cx, cy] = P3(x, y, z); return [Math.round(cx), Math.round(cy), Math.round(r * U * 1.414), Math.round(r * U * 0.707)]; };

// ---- Void: smooth glow behind the diorama + sparse stars.
c.tint(0, 170, W, 520, (x, y) => 0.5 - Math.hypot(x - 270, (y - 420) * 1.2) / 420, "#1A1230", 16);
for (const [x, y, b] of [[45, 225, 1], [495, 255, 0], [90, 630, 0], [465, 600, 1], [30, 450, 0], [518, 390, 0], [142, 210, 0], [405, 198, 0], [512, 700, 0], [20, 640, 0]]) { c.px(x, y, b ? IV : MU); if (b) { c.px(x - 1, y, p4); c.px(x + 1, y, p4); c.px(x, y - 1, p4); c.px(x, y + 1, p4); } }

// ---- Floor slab, planks with seams and grain, ambient occlusion along the walls.
box(0, 0, -10, R, R, 10, { top: "#3B2D57", left: p3, right: p2, hi: p5 });
for (let y = 0; y < R; y += 2) quad([[0, y, 0], [R, y, 0], [R, y + 2, 0], [0, y + 2, 0]], (y / 2) % 7 === 0 ? "#30234A" : (y / 2) % 7 === 3 ? "#41325F" : (y / 2) % 7 === 5 ? "#3E2F5B" : "#3B2D57");
for (let y = 0; y < R - 4; y += 14) for (let x = (y / 14) % 2 ? 20 : 48; x < R; x += 56) seg([x, y, 0], [x, y + 14, 0], "#2C2145");
const floorAO = (x, y) => { const wx = ((x - OX) / U + 2 * (y - OY) / U) / 2, wy = (2 * (y - OY) / U - (x - OX) / U) / 2; return Math.max(0, 0.38 - Math.min(wx, wy) / 26); };
c.tint(0, 300, W, 400, (x, y) => { const wx = ((x - OX) / U + 2 * (y - OY) / U) / 2, wy = (2 * (y - OY) / U - (x - OX) / U) / 2; return wx >= 0 && wy >= 0 && wx <= R && wy <= R ? floorAO(x, y) : 0; }, O, 12);

// ---- Walls with gradient (darker up top), stripes, skirting, corner AO.
box(-6, -6, -10, 6, R + 6, 116, { top: p5, left: p3, right: "#2A1F42", hi: p7, grad: 0 });
box(0, -6, -10, R, 6, 116, { top: p5, left: "#221936", right: p3, hi: p7, grad: 0 });
{ const pts = [[0, 0, 0], [0, R, 0], [0, R, 106], [0, 0, 106]].map((p) => P3(...p)); c.poly(pts, null, (x, y) => { const z = (P3(0, ((OX - x) / U), 0)[1] - y) / U; return mix("#2C2044", "#1C152E", Math.max(0, Math.min(1, z / 106))); }); }
{ const pts = [[0, 0, 0], [R, 0, 0], [R, 0, 106], [0, 0, 106]].map((p) => P3(...p)); c.poly(pts, null, (x, y) => { const z = (P3((x - OX) / U, 0, 0)[1] - y) / U; return mix("#241A3A", "#171126", Math.max(0, Math.min(1, z / 106))); }); }
for (let y = 6; y < R; y += 12) quad([[0, y, 0], [0, y + 1.4, 0], [0, y + 1.4, 106], [0, y, 106]], null, (x, yy) => mix(c.get(x, yy), "#3A2C58", 0.35));
for (let x = 6; x < R; x += 12) quad([[x, 0, 0], [x + 1.4, 0, 0], [x + 1.4, 0, 106], [x, 0, 106]], null, (xx, yy) => mix(c.get(xx, yy), "#30244C", 0.35));
quad([[0, 0, 0], [0, R, 0], [0, R, 5], [0, 0, 5]], p3); quad([[0, 0, 0], [R, 0, 0], [R, 0, 5], [0, 0, 5]], p2);
seg([0, 0, 5], [0, R, 5], p5); seg([0, 0, 5], [R, 0, 5], p4);
c.tint(OX - 30, OY - 170, 60, 180, (x, y) => Math.max(0, 0.4 - Math.abs(x - OX) / 30), O, 10);

// ---- Left wall: window, moon, stars, smart blinds half down; moonlight on the floor.
const wl = (y0, y1, z0, z1, col, shade) => quad([[0, y0, z0], [0, y1, z0], [0, y1, z1], [0, y0, z1]], col, shade);
const wr = (x0, x1, z0, z1, col, shade) => quad([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], col, shade);
wl(29, 79, 39, 93, p8); wl(30, 78, 40, 92, p7); wl(33, 75, 43, 89, "#141A3A", vgrad("#0E1230", "#232E66", P3(0, 54, 89)[1] - 20, P3(0, 54, 43)[1] + 20));
for (const [y, z, b] of [[38, 58, 1], [52, 64, 0], [46, 50, 0], [70, 62, 1], [60, 47, 0], [42, 66, 0]]) { const [sx, sy] = P3(0, y, z); c.px(sx, sy, b ? IV : MU); }
{ const [mx, my] = P3(0, 64, 54); c.disc(mx, my, 6, "#F8E6A0"); c.disc(mx, my, 5, YL); c.disc(mx + 3, my - 2, 5, "#18204A"); c.px(mx - 3, my + 1, "#E9C964"); }
for (let z = 89; z > 66; z -= 3) { wl(33, 75, z - 1.5, z, p8); wl(33, 75, z - 2.5, z - 1.5, p7); wl(33, 75, z - 3, z - 2.5, p5); }
seg([0, 72, 66], [0, 72, 56], MU); { const [sx, sy] = P3(0, 72, 56); c.rect(sx - 1, sy, 3, 3, p7); }
quad([[0, 28, 38], [0, 80, 38], [4, 80, 38], [4, 28, 38]], p7); seg([4, 28, 38], [4, 80, 38], p8);
{ const pts = [[6, 33, 0], [6, 75, 0], [62, 97, 0], [62, 55, 0]].map((p) => P3(...p)); c.poly(pts, null, (x, y) => mix(c.get(x, y), "#5266B0", 0.16 + 0.05 * Math.sin((x - y) * 0.9))); }
// Picture frame in the back corner.
wr(7, 19, 69, 87, p8); wr(8, 18, 70, 86, p7); wr(9, 17, 71, 85, p2);
wr(9, 17, 71, 77, "#2F3F7A"); wr(11, 15, 74, 80, p5); wr(13, 17, 72, 76, YL);

// ---- Right wall: thermostat, TV, door with smart lock.
wr(21, 39, 59, 79, p5); wr(22, 38, 60, 78, p4); wr(24, 36, 62, 76, CARD);
for (const [x, h] of [[25.5, 4], [28.5, 7], [31.5, 10]]) wr(x, x + 2, 65, 65 + h, GR, vgrad("#9BF07A", GR, P3(x, 0, 65 + h)[1], P3(x, 0, 65)[1]));
wr(51, 101, 39, 71, p2); wr(52, 100, 40, 70, O); wr(54, 98, 42, 68, "#1B2148", vgrad("#232C5E", "#141936", P3(76, 0, 68)[1], P3(76, 0, 42)[1]));
for (let x = 58; x < 92; x += 6) seg([x, 0, 67], [x + 6, 0, 60], "#2E3A78");
seg([60, 0, 46], [64, 0, 50], "#2E3A78");
{ const [lx, ly] = P3(96, 0, 41); c.px(lx, ly, GR); }
wr(114, 138, 0, 66, p4); wr(116, 136, 0, 64, p2, vgrad(p3, p1, P3(126, 0, 64)[1], P3(126, 0, 0)[1]));
wr(118, 134, 36, 61, p3); wr(119, 133, 37, 60, p2); wr(118, 134, 4, 30, p3); wr(119, 133, 5, 29, p2);
{ const [dx, dy] = P3(131, 0, 32); c.rect(dx, dy, 3, 3, Y); c.px(dx, dy, YL); }
wr(105, 113, 29, 43, p3); wr(106, 112, 30, 42, O); wr(107, 111, 36, 41, GR); wr(107, 111, 31, 34, p4);

// ---- Furniture, back to front.
shadow(50, 0, 52, 14);
box(50, 0, 0, 52, 14, 16, M.dark); seg([76, 14, 2], [76, 14, 14], p2); seg([63, 14, 9], [66, 14, 9], p5); seg([86, 14, 9], [89, 14, 9], p5);
box(60, 4, 16, 14, 8, 4, M.deep); { const [gx, gy] = P3(74, 8, 18); c.px(gx, gy, GR); c.px(gx + 1, gy, GR); }
// Rug with fringe.
quad([[44, 54, 0], [106, 54, 0], [106, 114, 0], [44, 114, 0]], p5); quad([[46, 56, 0], [104, 56, 0], [104, 112, 0], [46, 112, 0]], "#5A3F96");
quad([[52, 62, 0], [98, 62, 0], [98, 106, 0], [52, 106, 0]], p5); quad([[54, 64, 0], [96, 64, 0], [96, 104, 0], [54, 104, 0]], "#5A3F96");
quad([[70, 78, 0], [80, 78, 0], [80, 90, 0], [70, 90, 0]], "#634AA6");
for (let x = 46; x < 106; x += 3) seg([x, 114, 0], [x, 116, 0], p7);
// Floor lamp.
shadow(6, 54, 8, 8, 0.3);
{ const [bx, by] = P3(10, 58, 0), [, ty] = P3(10, 58, 62); c.ellipse(bx, by, 9, 4, O); c.ellipse(bx, by - 1, 8, 3, p5); c.ellipse(bx, by - 2, 6, 2, p7);
  c.rect(bx - 1, ty, 1, by - ty, p5); c.rect(bx, ty, 1, by - ty, p8); c.rect(bx + 1, ty, 1, by - ty, p4); }
// Sofa with seams and pillows.
shadow(0, 64, 26, 64, 0.4);
box(0, 66, 0, 26, 58, 12, M.purple); box(0, 66, 0, 8, 58, 30, M.purple); box(0, 64, 0, 26, 6, 20, M.purple); box(0, 122, 0, 26, 6, 20, M.purple);
box(8, 70, 12, 16, 25, 3, M.lav); box(8, 96, 12, 16, 25, 3, M.lav);
seg([8, 95.5, 15], [24, 95.5, 15], p7);
box(3, 76, 15, 5, 10, 8, { top: IV, left: "#D9CFEA", right: p7, hi: IV });
box(3, 108, 15, 5, 10, 8, { top: p8, left: p7, right: p5, hi: IV });
// Coffee table with the hub.
shadow(58, 68, 30, 34);
box(60, 70, 0, 26, 30, 10, M.dark); box(58, 68, 10, 30, 34, 3, M.purple);
{ const [cx, cy, rx, ry] = ell(76, 88, 13, 1); for (const [r, col] of [[9, p8], [14, p7], [19, p5]]) c.ering(cx, cy, r * 2 * U, r * U, col, Math.PI * 0.02, Math.PI * 0.98); }
// Hub: a cylinder with a glowing ring on top.
{ const [bx, by] = P3(76, 88, 13), [, ty] = P3(76, 88, 29), rx = 8, ry = 4;
  c.ellipse(bx, by, rx, ry, p3);
  for (let x = -rx; x <= rx; x++) { const col = mix(p6, p2, (x + rx) / (2 * rx)); const h = Math.round(ry * Math.sqrt(1 - (x * x) / (rx * rx))); c.rect(bx + x, ty, 1, by - ty + h, col); }
  for (let j = ty + 4; j < by - 1; j += 3) for (let x = -rx + 2; x <= rx - 2; x += 2) c.px(bx + x, j + Math.round(ry * 0.6 * Math.sqrt(1 - (x * x) / (rx * rx))), p3);
  c.ellipse(bx, ty, rx, ry, p6); c.ering(bx, ty, rx - 1, ry - 1, Y); c.ering(bx, ty, rx - 2, ry - 1, YL); c.ellipse(bx, ty, 3, 1, p5); }
// Robot vacuum.
shadow(92, 118, 16, 16, 0.3);
{ const [vx, vy] = P3(100, 126, 0); c.ellipse(vx, vy + 2, 18, 9, O); c.ellipse(vx, vy, 18, 9, p3); c.ellipse(vx, vy - 2, 18, 9, p5); c.ellipse(vx, vy - 3, 16, 8, p6);
  c.ellipse(vx, vy - 3, 10, 5, p5); c.ering(vx, vy - 3, 10, 5, p7, Math.PI, Math.PI * 2); c.rect(vx - 2, vy - 4, 5, 2, GR); c.px(vx - 1, vy - 4, "#B6F79A"); }
// Character, half of the sprite resolution (twice the C detail).
{ const hero = await loadImage(SHEET, 96, 104, { extract: { left: 3 * 192, top: 2 * 208, width: 192, height: 208 } });
  const [fx, fy] = P3(128, 76, 0); c.ellipse(fx, fy, 22, 6, "#140D22"); c.ellipse(fx, fy, 16, 4, "#0E0918"); c.blit(hero, fx - 48, fy - 101, { outline: O, flip: true }); }

// Warm light from the lamp: smooth ramps, falls on everything nearby.
{ const [lx, ly] = P3(10, 58, 0); c.tint(0, 180, W, 460, (x, y) => Math.max(0, 0.36 - Math.hypot(x - lx, (y - ly) * 2) / 170), "#F6C860", 16); }
{ const [lx, ly] = P3(10, 58, 70); c.tint(0, 180, W, 460, (x, y) => Math.max(0, 0.34 - Math.hypot(x - lx, y - ly) / 120), "#F6C860", 16); }
// Lamp shade on top of its own glow.
{ const [sx, sy] = P3(10, 58, 70); const sh = (x, y) => mix(mix(YL, Y, (x - sx + 15) / 30), "#D9A63A", Math.max(0, (y - sy + 9) / 18) * 0.4);
  c.poly([[sx - 15, sy + 9], [sx + 15, sy + 9], [sx + 10, sy - 9], [sx - 10, sy - 9]], null, sh);
  c.rect(sx - 10, sy - 9, 20, 1, IV); c.line(sx - 15, sy + 9, sx - 10, sy - 9, IV); c.rect(sx - 15, sy + 9, 31, 1, "#B88A2A"); c.ellipse(sx, sy + 10, 9, 2, "#FFF4C8"); }

// ---- Routes from the hub: yellow (active) to the lamp, lavender dotted to the rest.
const curve = (a, b, lift, col, gap, dot = 1) => {
  const [ax, ay] = P3(...a), [bx, by] = P3(...b), n = Math.ceil(Math.hypot(bx - ax, by - ay));
  for (let i = 0; i <= n; i++) { if (i % gap) continue; const t = i / n; c.rect(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t - Math.sin(Math.PI * t) * lift), dot, dot, col); }
};
const HUB = [76, 88, 29];
const bez = (a, b, ctl, col, gap, dot) => { const [ax, ay] = P3(...a), [bx, by] = P3(...b), [qx, qy] = ctl(ax, ay, bx, by); for (let i = 0; i <= 200; i++) { if (i % gap) continue; const t = i / 200, u = 1 - t; c.rect(Math.round(u * u * ax + 2 * u * t * qx + t * t * bx), Math.round(u * u * ay + 2 * u * t * qy + t * t * by), dot, dot, col); } };
const toLamp = (ax, ay, bx, by) => [ax + 10, by - 40];
bez(HUB, [12, 58, 76], toLamp, YL, 3, 2); bez(HUB, [12, 58, 76], toLamp, Y, 9, 2);
curve(HUB, [100, 126, 4], 15, p7, 4); curve(HUB, [80, 0, 56], 21, p7, 4); curve(HUB, [30, 0, 78], 27, p7, 4); curve(HUB, [109, 0, 44], 21, p7, 4); curve(HUB, [0, 54, 62], 21, p7, 4);
{ const [sx, sy] = P3(10, 58, 74);
  const pk = ["..OOOOOOOOO..", ".OYYYYYYYYYO.", "OYIYYYYYYYIYO", "OYYIYYYYYIYYO", "OYYYIYYYIYYYO", "OYYYYIYIYYYYO", "OYYYYYIYYYYYO", ".OYYYYYYYYYO.", "..OOOOOOOOO.."];
  c.tint(sx + 8, sy - 26, 30, 24, (x, y) => Math.max(0, 0.4 - Math.hypot(x - sx - 21, y - sy + 14) / 14), YL, 10);
  c.sprite(sx + 15, sy - 18, pk, { Y, I: IV, O }); }

// ---- Callouts (font ×2 on this grid = 28 px).
const tag = (x, y, label, state, sc) => {
  const o = { scale: 2 }, w = c.measure(MAIN, label, o) + (state ? c.measure(MAIN, " " + state, o) : 0) + 14;
  c.rrect(x, y, w, 24, p8, 2); c.rrect(x + 1, y + 1, w - 2, 22, p6, 2); c.rect(x + 3, y + 3, w - 6, 18, CARD);
  c.rect(x + 3, y + 3, w - 6, 1, "#1E1530");
  c.text(MAIN, label, x + 7, y + 5, IV, o); if (state) c.text(MAIN, state, x + 7 + c.measure(MAIN, label + " ", o), y + 5, sc ?? GR, o);
  return w;
};
{ const [sx, sy] = P3(10, 58, 70); tag(sx - 78, sy - 58, "LAMP", "ON"); c.line(sx - 30, sy - 34, sx - 10, sy - 13, p8); }
tag(290, 213, "HEAT", "21°"); c.line(321, 237, 321, 264, p8);
tag(356, 280, "DOOR", "LOCKED"); c.line(432, 304, 432, 330, p8);
{ const [hx, hy] = P3(76, 88, 29); c.text(MAIN, "HUB", hx - 48, hy - 12, L, { scale: 2, shadow: O, shadowOffset: 1 }); }

// ---- Header text (avatar is composited afterwards at full resolution).
c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 });
c.text(MAIN, "10 S", 469 - c.measure(MAIN, "10 S", { scale: 2 }), 136, MU, { scale: 2 });
c.text(MAIN, "HOW A SMART HOME THINKS", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
// ---- Karaoke caption.
{ const o = { scale: 3, shadow: O, shadowOffset: 1 }, cap = "THE HUB WAKES THE LAMP", w = c.measure(MAIN, cap, o), x0 = Math.round(270 - w / 2);
  const spoken = x0 + c.measure(MAIN, "THE HUB WAKES THE ", o), fill = x0 + c.measure(MAIN, "THE HUB WAKES THE LA", o);
  c.text(MAIN, cap, x0, 687, (x) => (x < spoken ? IV : x < fill ? Y : mix(IV, K, 0.6)), o); }

// ---- Avatar at full resolution: face + upper body from the outro sprite in a purple ring.
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(SHEET).extract({ left: 44, top: 6, width: 104, height: 104 })
    .resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size * 4), sw = img.info.width, off = r - inner;
  const sprite = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null;
    if (d <= inner) {
      col = sprite(i, j);
      if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sprite(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); }
    } else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P);
    if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; }
  }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}

const tmp = ROOT + "work/pixel-lab/.style-d-base.png";
await c.save(tmp, S);
await sharp(tmp).composite([{ input: await avatar(66), left: 76, top: 254 }]).png().toFile(ROOT + "work/pixel-lab/style-d-32bit.png");
console.log("ok");
