// Summer-evening porch in side view with depth layers (parallax): dusk sky, moon, far trees, a picket fence, the house
// with a lit window and a wall calendar, the porch deck and bench, the yard with a hanging orange lantern, purple flowers,
// a blue bucket, a green watering can and a red mailbox, and a foreground of grass and stones that grows towards the
// bottom edge. World: ground y = 0, deck top y = -12, x grows to the right. Illustration, not to scale.
import { mix, bayer, fade, MAIN } from "../../../renderer/pixel/raster.mjs";
import { smooth, drawPart, FUR } from "./shade.mjs";
import { POS } from "./timeline.mjs";

const W = 540, H = 960, SY = 420, BASE_CY = -150, R = Math.round;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** Layer transform for depth p (0 = infinitely far, 1 = the porch/yard plane). */
export function layer(cam, p) { const z = 1 + (cam.z - 1) * p, cx = cam.cx * p, cy = BASE_CY + (cam.cy - BASE_CY) * p; return { z, X: (wx) => 270 + (wx - cx) * z, Y: (wy) => SY + (wy - cy) * z, wx: (sx) => cx + (sx - 270) / z, wy: (sy) => cy + (sy - SY) / z }; }
export const ground = (cam) => layer(cam, 1);

// palettes (exported so the mosquito-vision pass can recognise the long-wavelength objects and skin)
export const SKY = ["#0D0A20", "#171232", "#231B48", "#36285E", "#523672", "#7A447A", "#A8547A", "#D46A6E", "#EE8E62"];
export const HOUSE = ["#120E22", "#1E1834", "#2A2348", "#382F5E", "#463C74", "#564B8A", "#6A5EA0"];
export const WOOD = ["#1E120C", "#33200F", "#4E3218", "#6B4622", "#8A5E30", "#A87A44", "#C49A62"];
export const LAWN = ["#121818", "#18241F", "#1F3027", "#283F2F", "#335038", "#426444", "#5A8050"];
export const REDBOX = ["#3A0A10", "#6A1420", "#A0202E", "#D0303C", "#EE5A50", "#FF9078"];
export const LANTERN = ["#4A2208", "#8A4210", "#C86A1C", "#EE922C", "#FFB850", "#FFE09A"];
export const CANG = ["#0C2814", "#164420", "#22682E", "#32903E", "#52B656", "#8ADA7A"];
export const BUCKETB = ["#0A1240", "#121F6A", "#1C3298", "#2A4AC8", "#4C6EE8", "#88A0FF"];
export const FLOWERP = ["#24093A", "#421464", "#62208E", "#8634BC", "#A858E0", "#CE94FA"];
const STEM = ["#12301A", "#1E4A24", "#2E6630"], METAL = ["#0E0C14", "#1C1826", "#2E2A3C", "#46405A"];
const band = (c, y0, y1, cols) => { y0 = R(y0); y1 = R(y1); for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) { const k = Math.max(0, Math.min(cols.length - 1.001, ((y - y0) / Math.max(1, y1 - y0)) * (cols.length - 1))), i = Math.floor(k); for (let x = 0; x < W; x++) c.px(x, y, k - i > bayer(x, y) ? cols[i + 1] : cols[i]); } };
const box = (c, G, x0, y0, x1, y1, col) => { const a = Math.max(-1, R(G.X(x0))), b = Math.max(-1, R(G.Y(y0))), e = Math.min(W + 1, R(G.X(x1))), f = Math.min(H + 1, R(G.Y(y1))); if (e > a && f > b) c.rect(a, b, e - a, f - b, col); };
const part = (c, G, pts, o) => drawPart(c, [pts.map(([x, y]) => [G.X(x), G.Y(y)])], { light: [-0.6, -0.8], ...o, thick: (o.thick ?? 4) * G.z });

// ---------------------------------------------------------------- far layers
export function drawSky(c, cam, t) {
  const L0 = layer(cam, 0.04), Hz = L0.Y(-40);
  band(c, L0.Y(-620), Hz, SKY); if (L0.Y(-620) > 0) c.rect(0, 0, W, R(L0.Y(-620)), SKY[0]);
  for (let i = 0; i < 70; i++) { const x = R((rnd(i * 7) * 1.3 - 0.15) * W - cam.cx * 0.03), y = R(L0.Y(-620) + rnd(i * 11) * (Hz - L0.Y(-620)) * 0.55); if (x >= 0 && x < W && y >= 0) c.px(x, y, i % 6 ? "#4E4870" : 0.5 + 0.5 * Math.sin(t * 1.7 + i) > 0.8 ? "#FDFEED" : "#B08AE8"); }
  // crescent moon
  { const mx = L0.X(330), my = L0.Y(-430), r = R(15 * L0.z); for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { if (x * x + y * y > r * r) continue; const cut = (x + r * 0.45) ** 2 + (y - r * 0.2) ** 2 < (r * 0.9) ** 2; if (cut) continue; c.px(R(mx + x), R(my + y), x * x + y * y > (r - 1.5) ** 2 ? "#E8D8A8" : "#FFF4CC"); } c.tint(R(mx - r * 3), R(my - r * 3), r * 6, r * 6, (x, y) => Math.max(0, 0.22 - Math.hypot(x - mx, y - my) / (r * 12)), "#FFF4CC", 4); }
  if (Hz < H) c.rect(0, Math.max(0, R(Hz)), W, H - Math.max(0, R(Hz)), SKY[SKY.length - 1]);
  // far hills and two tree lines
  for (const [p, base, amp, freq, col, seed] of [[0.12, 30, 10, 0.011, "#3E2752", 1], [0.2, 18, 7, 0.019, "#2C1D40", 4]]) {
    const Lh = layer(cam, p), Hy = Lh.Y(-40);
    for (let x = 0; x < W; x++) { const wx = Lh.wx(x), h = (base + Math.sin(wx * freq + seed) * amp + Math.sin(wx * freq * 2.7 + seed * 3) * amp * 0.4) * Lh.z; for (let y = Math.max(0, R(Hy - h)); y < Math.min(H, Hy + 3); y++) c.px(x, y, col); }
  }
  trees(c, layer(cam, 0.32), -36, "#1F1530", "#6A3A62", 26, 40, 80, 3);
  trees(c, layer(cam, 0.55), -30, "#160F24", "#4A2A52", 34, 60, 120, 9);
}
function trees(c, L, wy, col, rim, step, hmin, hmax, seed) {
  const y = L.Y(wy), x0 = Math.floor(L.wx(-60) / step) * step;
  for (let wx = x0; L.X(wx) < W + 60; wx += step) { const x = L.X(wx), h = (hmin + rnd(Math.round(wx) * 3 + seed) * (hmax - hmin)) * L.z, w = h * 0.34, round = rnd(Math.round(wx) + seed * 7) < 0.45;
    if (round) { c.rect(R(x - 1.5 * L.z), R(y - h * 0.4), Math.max(1, R(3 * L.z)), R(h * 0.4) + 2, col); c.disc(R(x), R(y - h * 0.62), R(w * 1.1), col); c.disc(R(x - w * 0.5), R(y - h * 0.5), R(w * 0.8), col); c.ering(R(x), R(y - h * 0.62), R(w * 1.1), R(w * 1.1), rim, -Math.PI * 0.95, -Math.PI * 0.45); }
    else { c.poly([[x - w, y], [x + w, y], [x, y - h]], col); c.line(R(x), R(y - h), R(x - w), R(y), rim); } }
}
export function drawFence(c, cam) {
  const L = layer(cam, 0.82), base = L.Y(-2), top = L.Y(-30), step = 9;
  if (base < 0 || top > H) return;
  const x0 = Math.floor(L.wx(-10) / step) * step;
  for (let wx = Math.max(60, x0); L.X(wx) < W + 10; wx += step) { const x = R(L.X(wx)), w = Math.max(2, R(5 * L.z)), tip = R(L.Y(-33)); c.rect(x, tip + R(2 * L.z), w, R(base - tip), "#4E4870"); c.rect(x, tip + R(2 * L.z), Math.max(1, R(w / 3)), R(base - tip), "#6E6894"); c.poly([[x, tip + 2 * L.z], [x + w, tip + 2 * L.z], [x + w / 2, tip]], "#5E588A"); }
  for (const ry of [-8, -24]) { const y = R(L.Y(ry)); c.rect(Math.max(0, R(L.X(58))), y, W, Math.max(1, R(2.5 * L.z)), "#3A3460"); }
}

// ---------------------------------------------------------------- the house and porch (world plane)
export function drawHouse(c, cam, t) {
  const G = ground(cam);
  // upper wall and gable roof
  { const xa = Math.max(-2, R(G.X(-520))), xb = Math.min(W + 2, R(G.X(60))), ya = Math.max(-2, R(G.Y(-330))), yb = Math.min(H + 2, R(G.Y(-12)));
    for (let y = ya; y < yb; y++) { const wy = G.wy(y), k = (wy + 330) / 318; for (let x = xa; x < xb; x++) c.px(x, y, k + (bayer(x, y) - 0.5) * 0.25 < 0.35 ? HOUSE[2] : HOUSE[3]); }
    if (xb > 0 && xb < W) c.rect(xb - Math.max(1, R(1.5 * G.z)), Math.max(0, ya), Math.max(1, R(1.5 * G.z)), yb - Math.max(0, ya), HOUSE[1]); }
  // siding: horizontal planks with a darker lap line every 9 units
  { const y0 = Math.max(0, G.Y(-330)), y1 = Math.min(H, G.Y(-12)), xr = Math.min(W, G.X(60)); if (xr > 0) for (let wy = -330; wy < -12; wy += 9) { const y = R(G.Y(wy)); if (y < y0 - 2 || y > y1) continue; c.rect(0, y, R(xr), Math.max(1, R(1.2 * G.z)), HOUSE[1]); if (G.z > 1.6) c.rect(0, y + Math.max(1, R(1.2 * G.z)), R(xr), 1, HOUSE[4]); } }
  // gable roof above the porch roof
  { const pts = [[-560, -330], [80, -330], [-240, -470]].map(([x, y]) => [G.X(x), G.Y(y)]); c.poly(pts, "#1E1430"); for (let k = 1; k < 9; k++) { const y = -330 - k * 15, xr = 80 - (320 * k * 15) / 140, xl = -560 + (320 * k * 15) / 140; if (xr > xl) c.line(R(G.X(xl)), R(G.Y(y)), R(G.X(xr)), R(G.Y(y)), "#2A1E44"); } c.line(R(pts[1][0]), R(pts[1][1]), R(pts[2][0]), R(pts[2][1]), "#4C3A72"); c.line(R(pts[0][0]), R(pts[0][1]), R(pts[2][0]), R(pts[2][1]), "#3A2C5C"); }
  // upstairs window (warm light)
  window_(c, G, -250, -300, -190, -236, t);
  // ground floor window left of the bench
  window_(c, G, -300, -150, -210, -66, t);
  // wall calendar between the friends (drawn by the film when the years flip; base page here)
  // porch roof: fascia board and shingles, the post at the corner
  part(c, G, [[-560, -246], [96, -246], [96, -232], [-560, -232]], { ramp: WOOD, base: 3.2, gain: 1.0, thick: 4, outline: WOOD[0] });
  for (let k = 0; k < 4; k++) box(c, G, -560, -262 + k * 4, 100 - k * 2, -260 + k * 4, k % 2 ? "#2A1E44" : "#3A2C5C");
  // deck, lattice skirt, steps
  part(c, G, [[-560, -12], [80, -12], [80, -8], [-560, -8]], { ramp: WOOD, base: 3.6, gain: 1.2, thick: 2, outline: WOOD[0] });
  { const y0 = G.Y(-8), y1 = G.Y(0), xa = G.X(-560), xb = G.X(80); if (y1 > 0 && y0 < H) { c.rect(Math.max(0, R(xa)), R(y0), R(Math.min(W, xb) - Math.max(0, xa)), R(y1 - y0), "#140C18");
    const sp = 4 * G.z; for (let x = Math.max(0, R(xa)); x < Math.min(W, R(xb)); x++) for (let y = Math.max(0, R(y0)); y < Math.min(H, R(y1)); y++) { const u = ((x - xa) + (y - y0)) % sp, v = ((x - xa) - (y - y0) + 1000 * sp) % sp; if (u < Math.max(1, G.z * 0.8) || v < Math.max(1, G.z * 0.8)) c.px(x, y, WOOD[2]); } } }
  for (let k = 0; k < 2; k++) part(c, G, [[80 + k * 12, -12 + k * 6], [104, -12 + k * 6], [104, -6 + k * 6], [80 + k * 12, -6 + k * 6]], { ramp: WOOD, base: 3.4, gain: 1.0, thick: 2, outline: WOOD[0] });
  part(c, G, [[60, -246], [68, -246], [68, -12], [60, -12]], { ramp: WOOD, base: 3.2, gain: 1.6, thick: 3, outline: WOOD[0], litOutline: WOOD[6] });
}
function window_(c, G, x0, y0, x1, y1, t) {
  part(c, G, [[x0 - 4, y0 - 4], [x1 + 4, y0 - 4], [x1 + 4, y1 + 5], [x0 - 4, y1 + 5]], { ramp: ["#E8E0F2", "#C8BEDC", "#A69CC2", "#8478A6"], base: 1.6, gain: 1.0, thick: 2, outline: "#2A2348" });
  const a = R(G.X(x0)), b = R(G.Y(y0)), w = R(G.X(x1)) - a, h = R(G.Y(y1)) - b;
  if (a > W || b > H || a + w < 0 || b + h < 0) return;
  for (let y = Math.max(0, b); y < Math.min(H, b + h); y++) { const k = (y - b) / h; for (let x = Math.max(0, a); x < Math.min(W, a + w); x++) c.px(x, y, k + (bayer(x, y) - 0.5) * 0.3 < 0.55 ? "#F6C860" : "#E39A48"); }
  // curtains and the cross bar
  for (const [cx, dir] of [[x0, 1], [x1, -1]]) for (let wy = y0; wy < y1; wy += 1 / Math.max(1, G.z)) { const sw = (10 + 3 * Math.sin(wy * 0.4)) * (1 - (wy - y0) / (y1 - y0) * 0.4); const xa = G.X(cx), xb = G.X(cx + dir * sw); c.line(R(Math.min(xa, xb)), R(G.Y(wy)), R(Math.max(xa, xb)), R(G.Y(wy)), "#8D59DA"); }
  box(c, G, x0, (y0 + y1) / 2 - 1.5, x1, (y0 + y1) / 2 + 1.5, "#C8BEDC"); box(c, G, (x0 + x1) / 2 - 1.5, y0, (x0 + x1) / 2 + 1.5, y1, "#C8BEDC");
  c.tint(R(G.X(x0 - 60)), R(G.Y(y0 - 30)), R((x1 - x0 + 120) * G.z), R((y1 - y0 + 120) * G.z), (x, y) => Math.max(0, 0.18 - Math.hypot(x - G.X((x0 + x1) / 2), (y - G.Y((y0 + y1) / 2)) * 0.8) / (G.z * 380)), "#F6C860", 3);
}

/** The bench: backrest (behind the people) and the seat, armrests and legs. */
export function drawBenchBack(c, cam) {
  const G = ground(cam);
  for (const k of [0, 1, 2]) part(c, G, [[-128, -64 + k * 8], [54, -64 + k * 8], [54, -58 + k * 8], [-128, -58 + k * 8]], { ramp: WOOD, base: 3.2 + k * 0.1, gain: 1.0, thick: 2, outline: WOOD[0], litOutline: WOOD[5] });
  for (const x of [-124, 48]) part(c, G, [[x, -66], [x + 5, -66], [x + 5, -12], [x, -12]], { ramp: WOOD, base: 2.4, gain: 1.0, thick: 2, outline: WOOD[0] });
  part(c, G, [[-132, -36], [58, -36], [58, -30], [-132, -30]], { ramp: WOOD, base: 3.8, gain: 1.2, thick: 2.5, outline: WOOD[0], litOutline: WOOD[6] });
  for (const x of [-118, -40, 40]) part(c, G, [[x, -30], [x + 5, -30], [x + 5, -12], [x, -12]], { ramp: WOOD, base: 2.0, gain: 0.8, thick: 2, outline: WOOD[0] });
}
export function drawArmrests(c, cam) {
  const G = ground(cam);
  for (const x of [-142, 36]) { part(c, G, [[x, -50], [x + 16, -50], [x + 16, -46], [x, -46]], { ramp: WOOD, base: 3.8, gain: 1.2, thick: 2, outline: WOOD[0], litOutline: WOOD[6] }); part(c, G, [[x + 6, -46], [x + 10, -46], [x + 10, -36], [x + 6, -36]], { ramp: WOOD, base: 2.6, gain: 0.8, thick: 2, outline: WOOD[0] }); }
}

// ---------------------------------------------------------------- the yard
export function drawYard(c, cam, t) {
  const G = ground(cam);
  // lawn plane from the back edge (y = 0) towards the camera
  { const top = G.Y(-1); for (let y = Math.max(0, R(top)); y < H; y++) { const wy = G.wy(y), k = Math.min(1, Math.max(0, wy / 120)); for (let x = 0; x < W; x++) { const wx = G.wx(x); if (wx < 80 && wy < 1) continue; const v = 4.6 - k * 2.4 + (bayer(x, y) - 0.5) * 0.9 + Math.sin(wx * 0.07 + wy * 0.3) * 0.25 + Math.sin(wx * 0.013 - wy * 0.05) * 0.35; c.px(x, y, LAWN[Math.max(1, Math.min(5, Math.floor(v)))]); } } }
  // shepherd hook with the orange lantern
  { const x = POS.lantern; part(c, G, [[x + 6, -96], [x + 8, -96], [x + 8, 0], [x + 6, 0]], { ramp: METAL, base: 2, gain: 1, thick: 1, outline: METAL[0] });
    const hk = []; for (let a = 0; a <= Math.PI; a += Math.PI / 10) hk.push([x + 3.5 + 3.5 * Math.cos(a), -96 - 4 * Math.sin(a)]);
    for (let i = 0; i + 1 < hk.length; i++) for (let w = 0; w < Math.max(1, R(G.z)); w++) c.line(R(G.X(hk[i][0])), R(G.Y(hk[i][1])) + w, R(G.X(hk[i + 1][0])), R(G.Y(hk[i + 1][1])) + w, METAL[3]);
    c.line(R(G.X(x)), R(G.Y(-96)), R(G.X(x)), R(G.Y(-84)), METAL[2]);
    part(c, G, [[x - 6, -84], [x + 6, -84], [x + 7, -82], [x - 7, -82]], { ramp: METAL, base: 2.5, gain: 1, thick: 1, outline: METAL[0] });
    part(c, G, [[x - 6, -82], [x + 6, -82], [x + 7, -66], [x - 7, -66]], { ramp: LANTERN, base: 3.6, gain: 1.8, thick: 4, outline: LANTERN[0], litOutline: LANTERN[5] });
    part(c, G, [[x - 7, -66], [x + 7, -66], [x + 5, -63], [x - 5, -63]], { ramp: METAL, base: 2.5, gain: 1, thick: 1, outline: METAL[0] });
    box(c, G, x - 0.6, -82, x + 0.6, -66, METAL[1]);
    const lx = G.X(x), ly = G.Y(-74), flick = 0.03 * Math.sin(t * 9) + 0.02 * Math.sin(t * 23);
    c.tint(R(lx - 60 * G.z), R(ly - 60 * G.z), R(120 * G.z), R(120 * G.z), (px, py) => Math.max(0, 0.3 + flick - Math.hypot(px - lx, py - ly) / (G.z * 60) * 0.3), "#FFB850", 4); }
  // purple flowers (stems are green, blossoms purple)
  { const x0 = POS.flowers; for (let k = 0; k < 9; k++) { const sx = x0 - 15 + k * 3.8 + rnd(k) * 2, h = 16 + rnd(k * 3) * 14, sway = Math.sin(t * 1.4 + k) * 0.8; c.line(R(G.X(sx)), R(G.Y(0)), R(G.X(sx + sway)), R(G.Y(-h)), STEM[k % 3]);
      if (G.z > 0.7) c.poly([[G.X(sx), G.Y(-h * 0.4)], [G.X(sx - 3), G.Y(-h * 0.5)], [G.X(sx), G.Y(-h * 0.55)]], STEM[2]); }
    for (let k = 0; k < 9; k++) { const sx = x0 - 15 + k * 3.8 + rnd(k) * 2 + Math.sin(t * 1.4 + k) * 0.8, h = 16 + rnd(k * 3) * 14; part(c, G, [[sx - 3.2, -h - 1], [sx, -h - 4], [sx + 3.2, -h - 1], [sx, -h + 2.5]], { ramp: FLOWERP, base: 3.4, gain: 1.6, thick: 1.6, outline: FLOWERP[0], litOutline: FLOWERP[5] }); } }
  // blue bucket with a handle
  { const x = POS.bucket; part(c, G, [[x - 11, -22], [x + 11, -22], [x + 8, 0], [x - 8, 0]], { ramp: BUCKETB, base: 3.2, gain: 1.6, thick: 4, outline: BUCKETB[0], litOutline: BUCKETB[5] });
    box(c, G, x - 11, -22, x + 11, -20.5, BUCKETB[1]); const hp = []; for (let a = 0; a <= Math.PI; a += Math.PI / 12) hp.push([x - 10 * Math.cos(a), -22 - 9 * Math.sin(a)]); for (let i = 0; i + 1 < hp.length; i++) c.line(R(G.X(hp[i][0])), R(G.Y(hp[i][1])), R(G.X(hp[i + 1][0])), R(G.Y(hp[i + 1][1])), METAL[3]); }
  // green watering can: body, spout, handle, rose
  { const x = POS.can; part(c, G, [[x - 12, -20], [x + 8, -20], [x + 9, 0], [x - 13, 0]], { ramp: CANG, base: 3.2, gain: 1.6, thick: 4, outline: CANG[0], litOutline: CANG[5] });
    part(c, G, [[x + 7, -8], [x + 24, -26], [x + 26, -24], [x + 9, -4]], { ramp: CANG, base: 3.0, gain: 1.0, thick: 1.5, outline: CANG[0] });
    part(c, G, [[x + 22, -30], [x + 28, -28], [x + 26, -22], [x + 21, -24]], { ramp: CANG, base: 3.6, gain: 1.0, thick: 1.5, outline: CANG[0], litOutline: CANG[5] });
    const hp = []; for (let a = 0; a <= Math.PI; a += Math.PI / 12) hp.push([x - 2 - 9 * Math.cos(a), -20 - 9 * Math.sin(a)]); for (let i = 0; i + 1 < hp.length; i++) { c.line(R(G.X(hp[i][0])), R(G.Y(hp[i][1])), R(G.X(hp[i + 1][0])), R(G.Y(hp[i + 1][1])), CANG[1]); if (G.z > 1.5) c.line(R(G.X(hp[i][0])), R(G.Y(hp[i][1])) + 1, R(G.X(hp[i + 1][0])), R(G.Y(hp[i + 1][1])) + 1, CANG[2]); } }
  // red mailbox on a wooden post, flag up
  { const x = POS.mailbox; part(c, G, [[x - 2.5, -48], [x + 2.5, -48], [x + 2.5, 0], [x - 2.5, 0]], { ramp: WOOD, base: 3, gain: 1, thick: 1.5, outline: WOOD[0] });
    const mb = [[x - 15, -50], [x + 15, -50], [x + 15, -64], [x + 12, -68], [x - 12, -68], [x - 15, -64]];
    part(c, G, mb, { ramp: REDBOX, base: 3.2, gain: 1.8, thick: 4, outline: REDBOX[0], litOutline: REDBOX[5] });
    box(c, G, x - 15.5, -68, x - 13.5, -50, REDBOX[1]);
    part(c, G, [[x + 10, -80], [x + 12, -80], [x + 12, -62], [x + 10, -62]], { ramp: REDBOX, base: 3.6, gain: 1, thick: 1, outline: REDBOX[0] });
    part(c, G, [[x + 12, -80], [x + 20, -80], [x + 20, -75], [x + 12, -75]], { ramp: REDBOX, base: 3.8, gain: 1, thick: 1, outline: REDBOX[0], litOutline: REDBOX[5] }); }
}

/** Foreground grass tufts and stones in front of everything, larger towards the bottom edge (drawn last in the world). */
export function drawForeground(c, cam, t) {
  const G = ground(cam);
  for (let k = -180; k < 320; k++) {
    const wx = k * 6.5 + rnd(k * 5) * 12, wy = 4 + rnd(k * 9) * 230; if (wx < 90 && wy < 10) continue;
    const x = G.X(wx), y = G.Y(wy), near = 1 + Math.max(0, wy) / 70; if (x < -40 || x > W + 40 || y < 0 || y > H + 30) continue;
    if (k % 4 === 0) { const rx = Math.max(1, R(3 * G.z * near)), ry = Math.max(1, R(1.6 * G.z * near)); c.ellipse(R(x), R(y) + 1, rx, ry, "#0A0C10"); c.ellipse(R(x), R(y), rx, ry, "#2E2A40"); c.ellipse(R(x - rx / 3), R(y - ry / 3), Math.max(1, R(rx / 2)), Math.max(1, R(ry / 2)), "#4E4870"); continue; }
    for (let j = -2; j <= 2; j++) c.line(R(x), R(y), R(x + j * 2 * G.z * near + Math.sin(t * 1.2 + k) * G.z * near * 0.6 * (Math.abs(j) + 1)), R(y - (4 + Math.abs(j) * 2 + rnd(k + j) * 3) * G.z * near), j % 2 ? LAWN[6] : LAWN[4]);
  }
}
/** Fireflies over the yard: slow drift, soft pulses (no blinking in one frame). */
export function drawFireflies(c, cam, t, a = 1) {
  if (a <= 0) return; const G = ground(cam);
  for (let i = 0; i < 14; i++) { const wx = 100 + rnd(i * 3) * 420 + Math.sin(t * 0.4 + i) * 14, wy = -12 - rnd(i * 5) * 70 + Math.sin(t * 0.7 + i * 2) * 6, pulse = Math.max(0, Math.sin(t * (1.1 + rnd(i) * 0.8) + i * 1.9));
    const x = R(G.X(wx)), y = R(G.Y(wy)), k = a * pulse; if (k <= 0.05) continue; fade(c, k * 0.5).disc(x, y, Math.max(1, R(1.6 * G.z)), "#B8D86A"); fade(c, k).rect(x, y, Math.max(1, R(0.8 * G.z)), Math.max(1, R(0.8 * G.z)), "#F2FF9A"); }
}
