// Style C · hi-bit isometric diorama: 360×640 grid ×3, 2:1 pixel lines, rich ramps, dithered light.
import { Canvas, MAIN, TINY, loadImage, mix } from "./pixel.mjs";

const ROOT = "/Users/rv/Desktop/Motion Studio/";
const S = 3, W = 360, H = 640;
const K = "#000000", O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", YL = "#FAE375", GR = "#65DA41", MU = "#959595", L = "#E0CDF8", P = "#8D59DA";
const p1 = "#1D1628", p2 = "#2A1F40", p3 = "#3B2C5C", p4 = "#523D82", p5 = "#6E4FB0", p6 = P, p7 = "#B08AE8", p8 = L;
const c = new Canvas(W, H, K);

const OX = 180, OY = 250, R = 144;
const P3 = (x, y, z) => [OX + x - y, OY + (x + y) / 2 - z];
const quad = (pts, col, shade) => c.poly(pts.map((p) => P3(...p)), col, shade);
const seg = (a, b, col) => { const [x0, y0] = P3(...a), [x1, y1] = P3(...b); c.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), col); };
function box(x, y, z, w, d, h, { top, left, right, hi, edge }) {
  quad([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], left);
  quad([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], right);
  quad([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top);
  if (hi) { seg([x, y + d, z + h], [x + w, y + d, z + h], hi); seg([x + w, y, z + h], [x + w, y + d, z + h], hi); }
  if (edge) seg([x + w, y + d, z], [x + w, y + d, z + h], edge);
}
// Material presets (top / left face / right face / highlight).
const M = {
  purple: { top: p6, left: p5, right: p4, hi: p7 },
  dark: { top: p4, left: p3, right: p2, hi: p5 },
  deep: { top: p3, left: p2, right: p1, hi: p4 },
  lav: { top: p8, left: p7, right: p5, hi: IV },
};

// ---- Void: soft dithered glow behind the diorama.
c.dither(0, 120, W, 330, (x, y) => 0.42 - Math.hypot(x - 180, (y - 280) * 1.2) / 300, CARD);
for (const [x, y] of [[30, 150], [330, 170], [60, 420], [310, 400], [20, 300], [345, 260], [95, 140], [270, 132]]) c.px(x, y, MU);

// ---- Floor slab + planks.
box(0, 0, -10, R, R, 10, { top: "#3B2D57", left: p3, right: p2, hi: p5 });
for (let y = 0; y < R; y += 2) quad([[0, y, 0], [R, y, 0], [R, y + 2, 0], [0, y + 2, 0]], (y / 2) % 7 === 0 ? "#33264D" : (y / 2) % 7 === 3 ? "#3F305C" : "#3B2D57");
for (let y = 0; y < R - 4; y += 14) for (let x = (y / 14) % 2 ? 20 : 48; x < R; x += 56) seg([x, y, 0], [x, y + 14, 0], "#33264D");
// ---- Walls (interior faces) with caps.
box(-6, -6, -10, 6, R + 6, 116, { top: p5, left: p3, right: "#2A1F42", hi: p7 });     // left wall (interior = right face)
box(0, -6, -10, R, 6, 116, { top: p5, left: "#221936", right: p3, hi: p7 });      // right wall (interior = left face)
// Wallpaper stripes + skirting.
for (let y = 6; y < R; y += 12) quad([[0, y, 0], [0, y + 2, 0], [0, y + 2, 106], [0, y, 106]], "#2E2248");
for (let x = 6; x < R; x += 12) quad([[x, 0, 0], [x + 2, 0, 0], [x + 2, 0, 106], [x, 0, 106]], "#261C3B");
quad([[0, 0, 0], [0, R, 0], [0, R, 5], [0, 0, 5]], p3); quad([[0, 0, 0], [R, 0, 0], [R, 0, 5], [0, 0, 5]], p2);

// ---- Left wall: window with smart blinds half down, moonlight.
const wl = (y0, y1, z0, z1, col) => quad([[0, y0, z0], [0, y1, z0], [0, y1, z1], [0, y0, z1]], col);
const wr = (x0, x1, z0, z1, col) => quad([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], col);
wl(30, 78, 40, 92, p7); wl(33, 75, 43, 89, "#141A3A");
for (const [y, z] of [[40, 58], [52, 62], [46, 50], [70, 62]]) { const [sx, sy] = P3(0, y, z); c.px(sx, sy, IV); }
{ const [mx, my] = P3(0, 64, 54); c.disc(mx, my, 4, YL); c.disc(mx + 2, my - 1, 3, "#141A3A"); }
for (let z = 89; z > 66; z -= 3) { wl(33, 75, z - 2, z, p7); wl(33, 75, z - 3, z - 2, p5); }
seg([0, 72, 66], [0, 72, 58], MU);
// Moonlight on the floor.
{ const pts = [[6, 33, 0], [6, 75, 0], [60, 95, 0], [60, 53, 0]].map((p) => P3(...p)); c.poly(pts, null, (x, y) => mix(c.get(x, y), "#4A5A9A", 0.22 + 0.06 * ((x + y) % 2))); }
// Picture frame in the back corner.
wr(8, 18, 70, 86, p7); wr(9, 17, 71, 85, p3); wr(10, 16, 74, 80, p5);
// ---- Right wall: thermostat, TV, door with smart lock.
wr(22, 38, 60, 78, p4); wr(24, 36, 62, 76, CARD);
for (const [x, h] of [[26, 4], [29, 7], [32, 10]]) wr(x, x + 2, 65, 65 + h, GR);
wr(52, 100, 40, 70, O); wr(54, 98, 42, 68, "#1B2148");
for (let x = 56; x < 98; x += 4) seg([x, 0, 66], [x + 4, 0, 60], "#25306A");
// Door + lock.
wr(114, 138, 0, 66, p4); wr(116, 136, 0, 64, p2); wr(116, 136, 32, 33, p3);
{ const [dx, dy] = P3(131, 0, 32); c.rect(dx, dy, 2, 2, Y); }
wr(106, 112, 30, 42, O); wr(107, 111, 35, 40, GR);

// ---- Furniture, back to front.
// Media cabinet with the hub on it.
box(50, 0, 0, 52, 14, 16, M.dark); seg([76, 14, 2], [76, 14, 14], p2);
// Rug.
quad([[44, 54, 0], [106, 54, 0], [106, 114, 0], [44, 114, 0]], p5); quad([[47, 57, 0], [103, 57, 0], [103, 111, 0], [47, 111, 0]], "#5A3F96");
quad([[52, 62, 0], [98, 62, 0], [98, 106, 0], [52, 106, 0]], p5); quad([[54, 64, 0], [96, 64, 0], [96, 104, 0], [54, 104, 0]], "#5A3F96");
box(60, 4, 16, 14, 8, 4, M.deep); { const [gx, gy] = P3(74, 8, 18); c.px(gx, gy, GR); }
// Floor lamp ON between shelf and sofa.
{ const base = P3(10, 58, 0), top = P3(10, 58, 62); c.ellipse(base[0], base[1], 6, 3, O); c.ellipse(base[0], base[1] - 1, 5, 2, p5); c.rect(base[0], top[1], 1, base[1] - top[1], p7); c.rect(base[0] + 1, top[1], 1, base[1] - top[1], p5); }
{ const [sx, sy] = P3(10, 58, 70); c.poly([[sx - 10, sy + 6], [sx + 10, sy + 6], [sx + 7, sy - 6], [sx - 7, sy - 6]], Y); c.rect(sx - 7, sy - 6, 14, 1, IV); c.line(sx - 10, sy + 6, sx - 7, sy - 6, YL); c.rect(sx - 10, sy + 6, 21, 1, "#B88A2A"); }
// Sofa along the left wall.
box(0, 66, 0, 26, 58, 12, M.purple); box(0, 66, 0, 8, 58, 30, M.purple); box(0, 64, 0, 26, 6, 20, M.purple); box(0, 122, 0, 26, 6, 20, M.purple);
box(9, 72, 12, 15, 22, 3, M.lav); box(9, 96, 12, 15, 24, 3, M.lav);
// Coffee table.
box(60, 70, 0, 26, 30, 10, M.dark); box(58, 68, 10, 30, 34, 3, M.purple);
// Hub on the coffee table, broadcast rings at table height.
{ const [hx, hy] = P3(76, 88, 13); for (const [r, col] of [[9, p8], [14, p7], [19, p5]]) c.ering(hx, hy, r * 2, r, col, Math.PI * 0.02, Math.PI * 0.98); }
box(72, 84, 13, 8, 8, 14, M.purple);
quad([[72, 84, 27], [80, 84, 27], [80, 92, 27], [72, 92, 27]], Y); seg([72, 92, 27], [80, 92, 27], YL);
for (let z = 16; z < 26; z += 3) seg([72, 92, z], [80, 92, z], p4);
// Robot vacuum.
{ const [vx, vy] = P3(100, 126, 0); c.ellipse(vx, vy + 1, 12, 6, O); c.ellipse(vx, vy - 1, 12, 6, p4); c.ellipse(vx, vy - 2, 11, 5, p6); c.ellipse(vx, vy - 2, 7, 3, p5); c.rect(vx - 1, vy - 3, 3, 1, GR); }
// Character (from the outro sprite), standing on the floor.
{ const hero = await loadImage(ROOT + "data/branding/xtuned-outro/v1/spritesheet.png", 64, 69, { extract: { left: 3 * 192, top: 2 * 208, width: 192, height: 208 } });
  const [fx, fy] = P3(128, 76, 0); c.ellipse(fx, fy, 14, 4, "#160F26"); c.blit(hero, fx - 32, fy - 67, { outline: O, flip: true }); }

// Warm light after the furniture: it falls on the sofa, rug and table too.
{ const [lx, ly] = P3(10, 58, 0); c.tint(0, 120, 360, 300, (x, y) => Math.max(0, 0.34 - Math.hypot(x - lx, (y - ly) * 2) / 110), "#F6C860", 8); }
{ const [lx, ly] = P3(10, 58, 70); c.tint(0, 120, 360, 300, (x, y) => Math.max(0, 0.3 - Math.hypot(x - lx, y - ly) / 80), "#F6C860", 8); }
// ---- Routes from the hub: yellow (active) to the lamp, lavender dotted to the rest.
const curve = (a, b, lift, col, gap, from = 0) => {
  const [ax, ay] = P3(...a), [bx, by] = P3(...b), n = Math.ceil(Math.hypot(bx - ax, by - ay));
  for (let i = Math.round(n * from); i <= n; i++) { if (i % gap) continue; const t = i / n; c.px(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t - Math.sin(Math.PI * t) * lift), col); }
};
const HUB = [76, 88, 29];
curve(HUB, [10, 58, 74], 34, Y, 2);
curve(HUB, [100, 126, 4], 10, p7, 3); curve(HUB, [80, 0, 56], 14, p7, 3); curve(HUB, [30, 0, 78], 18, p7, 3); curve(HUB, [109, 0, 44], 14, p7, 3); curve(HUB, [0, 54, 62], 14, p7, 3);
{ const [sx, sy] = P3(10, 58, 74); const pk = ["OYYYYYO", "YIYYYIY", "YYIYIYY", "YYYIYYY", "OYYYYYO"]; c.sprite(sx + 10, sy - 12, pk, { Y, I: IV, O }); }

// ---- Callouts.
const tag = (x, y, label, state, sc) => {
  const w = c.measure(MAIN, label) + (state ? c.measure(MAIN, " " + state) : 0) + 8;
  c.rrect(x, y, w, 13, p8, 1); c.rect(x + 1, y + 1, w - 2, 11, p6); c.rect(x + 2, y + 2, w - 4, 9, CARD);
  c.text(MAIN, label, x + 4, y + 3, IV); if (state) c.text(MAIN, state, x + 4 + c.measure(MAIN, label + " "), y + 3, sc ?? GR);
  return w;
};
{ const [sx, sy] = P3(10, 58, 70); tag(sx - 46, sy - 34, "LAMP", "ON"); c.line(sx - 20, sy - 21, sx - 6, sy - 8, p8); }
tag(198, 146, "HEAT", "21°"); c.line(214, 159, 214, 176, p8);
tag(246, 190, "DOOR", "LOCKED"); c.line(290, 203, 290, 220, p8);
{ const [hx, hy] = P3(76, 88, 29); c.text(MAIN, "HUB", hx - 22, hy - 6, L, { shadow: O, shadowOffset: 1 }); }

// ---- Header: avatar ring with the sprite head, handle, duration, title.
const head = await loadImage(ROOT + "data/branding/xtuned-outro/v1/spritesheet.png", 17, 17, { extract: { left: 50, top: 4, width: 92, height: 92 } });
c.disc(36, 95, 10, P); c.disc(36, 95, 9, O); c.blit(head, 28, 87);
c.text(TINY, "@KAGENAMI_AI", 52, 90, IV, { scale: 2 });
c.text(TINY, "10 S", 313 - c.measure(TINY, "10 S", { scale: 2 }), 90, MU, { scale: 2 });
c.text(MAIN, "HOW A SMART HOME THINKS", 26, 110, IV, { scale: 2, shadow: p3, shadowOffset: 1 });

// ---- Karaoke caption.
{ const o = { scale: 2, shadow: O, shadowOffset: 1 }, cap = "THE HUB WAKES THE LAMP", w = c.measure(MAIN, cap, o), x0 = Math.round(180 - w / 2);
  const spoken = x0 + c.measure(MAIN, "THE HUB WAKES THE ", o), fill = x0 + c.measure(MAIN, "THE HUB WAKES THE LA", o);
  c.text(MAIN, cap, x0, 458, (x) => (x < spoken ? IV : x < fill ? Y : mix(IV, K, 0.6)), o); }

await c.save(ROOT + "work/pixel-lab/style-c-isometric.png", S);
console.log("ok");
