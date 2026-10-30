// «Pumpkin face» — the night world: purple sky, big moon, hills, a dead tree, a fence, dithered fog, bats, tiny pumpkins.
// Static layers are drawn once (BG, FG); everything that moves is a pure function of t.
import { Canvas, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { GW, GH, clamp01, sm, lerp, rnd } from "./layout.mjs";

export const COL = { n0: "#120C22", n1: "#1D1430", n2: "#2B2048", n3: "#3B2C5C", n4: "#4C3870", n5: "#5E4580", orange: "#F08A3C", gold: "#F4CA50", moon: "#B9C8F0", green: "#65DA41", ink: "#0B0812" };
export const MOON = { x: 414, y: 212, r: 34 };
export const GROUND_Y = 560;     // where the pumpkin's base sits
export const HORIZON = 506;

const SKY = [COL.n0, COL.n1, COL.n2, COL.n3, COL.n4, COL.n5];
function skyColor(x, y) {
  const k = Math.min(1, Math.max(0, y / 500)), p = Math.pow(k, 1.1) * (SKY.length - 1), i = Math.min(SKY.length - 2, Math.floor(p)), f = p - i;
  return mix(SKY[i], SKY[i + 1], f > bayer(x, y) ? 1 : 0);
}
// smooth value noise
const hash = (ix, iy, s) => { let h = (ix * 374761393 + iy * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function vnoise(x, y, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function copyInto(dst, src) { dst.d.set(src.d); }

// ---------------------------------------------------------------- static background
function buildBG() {
  const c = new Canvas(GW, GH, COL.n1);
  for (let y = 0; y < 520; y++) for (let x = 0; x < GW; x++) c.px(x, y, skyColor(x, y));
  // stars (static, dim) — the twinkling ones are added per frame
  for (let i = 0; i < 90; i++) { const x = Math.floor(rnd(i * 3 + 1) * GW), y = Math.floor(rnd(i * 3 + 2) * 420); if ((x - MOON.x) ** 2 + (y - MOON.y) ** 2 < 70 * 70) continue; c.px(x, y, mix(COL.n3, COL.moon, 0.35 + 0.4 * rnd(i * 3 + 3))); }
  // moon: dithered halo, disc, shaded limb and craters
  c.tint(MOON.x - 90, MOON.y - 90, 180, 180, (x, y) => 0.5 * Math.max(0, 1 - Math.hypot(x - MOON.x, y - MOON.y) / 88) ** 1.6, COL.moon, 5);
  for (let y = -MOON.r; y <= MOON.r; y++) for (let x = -MOON.r; x <= MOON.r; x++) { const d = Math.hypot(x, y); if (d > MOON.r + 0.2) continue;
    const lit = clamp01(0.55 + 0.45 * ((-x * 0.5 - y * 0.35) / MOON.r)), q = Math.round(lit * 4) / 4, qq = lit * 4 - Math.floor(lit * 4) > bayer(x, y) ? Math.ceil(lit * 4) / 4 : Math.floor(lit * 4) / 4;
    c.px(MOON.x + x, MOON.y + y, mix("#6D7FB4", "#E8EEFF", qq)); void q; }
  for (const [dx, dy, r] of [[-12, -8, 7], [10, 6, 9], [-6, 16, 5], [16, -14, 4], [-20, 8, 3]]) { c.disc(MOON.x + dx, MOON.y + dy, r, "#8D9CCB"); c.disc(MOON.x + dx + 1, MOON.y + dy + 1, Math.max(1, r - 2), "#A5B3DC"); }
  // far hills + a haunted house with two warm windows
  const hill = (base, amp, f, ph, col, off = 0) => { for (let x = 0; x < GW; x++) { const y = Math.round(base + amp * Math.sin(x * f + ph) + amp * 0.5 * Math.sin(x * f * 2.3 + ph * 1.7)); for (let yy = y; yy < 530; yy++) c.px(x, yy, col); } };
  hill(466, 12, 0.014, 0.4, "#2A1F47"); hill(484, 9, 0.02, 2.2, "#21183A");
  { const hx = 396, hy = 470; // house on the hill
    c.rect(hx, hy - 20, 44, 22, "#150F27"); c.poly([[hx - 4, hy - 20], [hx + 22, hy - 42], [hx + 48, hy - 20]], "#150F27"); c.rect(hx + 32, hy - 40, 5, 12, "#150F27"); c.rect(hx + 3, hy - 32, 4, 12, "#150F27"); c.poly([[hx + 1, hy - 32], [hx + 5, hy - 40], [hx + 9, hy - 32]], "#150F27");
    c.rect(hx + 10, hy - 14, 5, 6, "#C86A2C"); c.rect(hx + 26, hy - 14, 5, 6, "#C86A2C"); c.rect(hx + 11, hy - 13, 3, 4, "#F4A24C"); c.rect(hx + 27, hy - 13, 3, 4, "#F4A24C"); }
  hill(498, 5, 0.03, 1.1, "#1B1330");
  // ground
  for (let y = HORIZON - 4; y < GH; y++) { const k = clamp01((y - HORIZON + 4) / (GH - HORIZON)), a = mix("#2A2046", "#0E0919", Math.pow(k, 0.7));
    for (let x = 0; x < GW; x++) { const n = vnoise(x * 0.09, y * 0.2, 5) * 0.5 + vnoise(x * 0.31, y * 0.6, 6) * 0.5; c.px(x, y, mix(a, k < 0.3 ? "#3A2C5A" : "#1B1430", clamp01((n - 0.48) * 2.2) > bayer(x, y) ? 0.55 : 0)); } }
  // grass tufts along the horizon
  for (let i = 0; i < 90; i++) { const x = Math.floor(rnd(i * 5 + 11) * GW), y = HORIZON + Math.floor(rnd(i * 5 + 12) * 8); for (let k = 0; k < 3; k++) c.line(x + k * 2, y, x + k * 2 + (k - 1), y - 3 - (i % 3), "#1B1430"); }
  // fence behind the pumpkin
  for (let x = -6; x < GW + 20; x += 36) { const h = 34 + ((x / 36) % 2 ? 4 : 0); c.rect(x, HORIZON - h + 14, 6, h, "#140E26"); c.rect(x + 1, HORIZON - h + 14, 1, h, "#2A1F47"); c.poly([[x, HORIZON - h + 14], [x + 3, HORIZON - h + 9], [x + 6, HORIZON - h + 14]], "#140E26"); }
  c.rect(0, HORIZON - 14, GW, 4, "#140E26"); c.rect(0, HORIZON - 3, GW, 4, "#140E26"); c.rect(0, HORIZON - 14, GW, 1, "#2A1F47");
  // a dead tree on the left (background only)
  { const T = "#0D0818", br = (x0, y0, x1, y1, w) => { for (let i = 0; i < w; i++) c.line(x0 + i, y0, x1 + Math.round(i * 0.4), y1, T); };
    br(46, 520, 52, 330, 9); br(51, 400, 24, 342, 4); br(52, 372, 84, 318, 4); br(50, 440, 18, 410, 3); br(54, 350, 40, 296, 3); br(24, 342, 8, 328, 2); br(84, 318, 98, 322, 2); br(84, 318, 92, 296, 2); br(52, 420, 90, 390, 3); br(90, 390, 104, 396, 2);
    c.poly([[40, 520], [64, 520], [58, 490], [46, 490]], T); }
  // little pumpkins in the field (dim, unlit) so the night has more than one
  for (const [x, y, s] of [[96, 590, 0.34], [452, 604, 0.4], [506, 572, 0.26], [150, 640, 0.28]]) smallPumpkin(c, x, y, s);
  return c;
}
function smallPumpkin(c, x, y, s) {
  const rx = 40 * s, ry = 30 * s;
  c.ellipse(Math.round(x), Math.round(y), Math.round(rx + 1), Math.round(ry + 1), "#1A0A18");
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) { if ((i / rx) ** 2 + (j / ry) ** 2 > 1) continue; const lob = Math.abs(Math.sin(i / rx * Math.PI * 1.5)), lit = clamp01(0.5 + (-j / ry) * 0.2 + i / rx * 0.2 - lob * 0.25), q = lit * 4, k = Math.floor(q) + (q - Math.floor(q) > bayer(x + i, y + j) ? 1 : 0);
    c.px(x + i, y + j, ["#2A1020", "#5A2418", "#8A3A1C", "#B45A24", "#D2701F"][Math.min(4, k)]); }
  c.rect(Math.round(x) - 1, Math.round(y - ry - 3), 3, 4, "#2F4A1E");
}

let BGC = null, FGC = null;
const bg = () => (BGC ??= buildBG());

// ---------------------------------------------------------------- foreground (grass, leaves) — drawn over everything but the captions
function buildFG() {
  const m = { d: null }; void m;
  const c = new Canvas(GW, GH, "#000000"), mask = new Uint8Array(GW * GH);
  const px = (x, y, col) => { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= GW || y >= GH) return; c.px(x, y, col); mask[y * GW + x] = 1; };
  for (let i = 0; i < 120; i++) { // tall blades, bigger and denser toward the bottom edge and the corners
    const x = rnd(i * 7 + 3) * GW, base = 800 + rnd(i * 7 + 4) * 200, near = clamp01((base - 800) / 160), len = (30 + 90 * rnd(i * 7 + 5)) * (0.5 + near * 0.6), lean = (rnd(i * 7 + 6) - 0.5) * 36 + (x < 100 ? 14 : x > 440 ? -14 : 0);
    if (rnd(i * 7 + 8) > 0.35 + near * 0.6) continue;
    const col = i % 3 ? "#0E0A18" : "#171029";
    for (let k = 0; k < len; k++) { const u = k / len, bx = x + lean * u * u, by = base - k, w = Math.max(0, 3.2 * (1 - u)); for (let q = -w; q <= w; q++) px(bx + q, by, col); }
  }
  // fallen leaves
  for (let i = 0; i < 26; i++) { const x = rnd(i * 11 + 1) * GW, y = 830 + rnd(i * 11 + 2) * 110; px(x, y, "#5A2A1C"); px(x + 1, y, "#8A3A1C"); px(x + 1, y + 1, "#3A1A1C"); px(x - 1, y + 1, "#5A2A1C"); }
  return { c, mask };
}
function drawFG(c) { FGC ??= buildFG(); const { c: f, mask } = FGC; for (let i = 0; i < GW * GH; i++) if (mask[i]) { const k = i * 3; c.d[k] = f.d[k]; c.d[k + 1] = f.d[k + 1]; c.d[k + 2] = f.d[k + 2]; } }

// ---------------------------------------------------------------- moving pieces
function bat(c, x, y, ph, s, col = "#0B0714") {
  const f = Math.sin(ph), up = -6 * s * f, dn = 3 * s * f;
  for (const sg of [-1, 1]) c.poly([[x, y - 1 * s], [x + sg * 4 * s, y - 4 * s + up], [x + sg * 11 * s, y - 2 * s + up * 0.8 + dn], [x + sg * 9 * s, y + 1 * s + dn * 0.5], [x + sg * 6 * s, y - 0.5 * s + dn * 0.2], [x + sg * 3 * s, y + 2 * s]], col);
  c.ellipse(Math.round(x), Math.round(y), Math.round(1.6 * s) + 1, Math.round(2.2 * s), col); c.px(x - 1, y - 3 * s, col); c.px(x + 1, y - 3 * s, col);
}
const BATS = [[0.0, 5.2, -30, 580, 96, 150, 1.0, 11], [3.6, 9.0, 570, -30, 612, 560, 1.15, 12], [5.6, 10.4, 560, -20, 118, 96, 0.8, 13], [-0.8, 3.4, 600, 200, 118, 104, 0.7, 14]];
function bats(c, t) {
  for (const [a, b, x0, x1, y0, y1, s, sd] of BATS) { if (t < a || t > b) continue; const u = (t - a) / (b - a), e = u, x = lerp(x0, x1, e), y = lerp(y0, y1, e) + 12 * Math.sin(u * 7 + sd) + 6 * Math.sin(u * 17); bat(fade(c, Math.min(sm(t, a, a + 0.3), 1 - sm(t, b - 0.3, b))), x, y, t * 15 + sd, s); }
}
function twinkle(c, t) {
  for (let i = 0; i < 16; i++) { const x = Math.floor(rnd(i * 9 + 101) * GW), y = Math.floor(rnd(i * 9 + 102) * 400); if ((x - MOON.x) ** 2 + (y - MOON.y) ** 2 < 60 * 60) continue; const a = 0.5 + 0.5 * Math.sin(t * (1.2 + rnd(i + 7)) + i * 2.1);
    fade(c, a * 0.9).px(x, y, COL.moon); if (a > 0.85) { fade(c, (a - 0.85) * 5).px(x + 1, y, COL.moon); fade(c, (a - 0.85) * 5).px(x - 1, y, COL.moon); } }
}
function clouds(c, t) { // thin dark streaks drifting across the moon
  for (let i = 0; i < 3; i++) { const cy = 170 + i * 42 + 6 * Math.sin(t * 0.2 + i), cx = ((t * (5 + i * 2) + i * 230) % 780) - 120, rx = 110 + i * 30, ry = 6 + i * 2;
    c.tint(Math.floor(cx - rx), Math.floor(cy - ry), rx * 2, ry * 2, (x, y) => 0.5 * Math.max(0, 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2) ** 0.8, "#1D1430", 3); }
}
function fog(c, t, front) {
  const y0 = front ? 560 : 500, y1 = front ? 700 : 600, dir = front ? -1 : 1, sd = front ? 21 : 3, col = front ? "#7C68A8" : "#5A4A86";
  c.tint(0, y0, GW, y1 - y0, (x, y) => { const n = vnoise(x * 0.011 + t * 0.045 * dir, y * 0.03, sd) * 0.65 + vnoise(x * 0.03 - t * 0.07 * dir, y * 0.075, sd + 1) * 0.35, env = Math.sin(Math.PI * clamp01((y - y0) / (y1 - y0))); return clamp01((n - 0.4) * 1.5) * env * (front ? 0.5 : 0.62); }, col, 4);
}
export function drawBack(c, t) { copyInto(c, bg()); twinkle(c, t); clouds(c, t); bats(c, t); fog(c, t, false); }
function fireflies(c, t) {
  for (let i = 0; i < 16; i++) { const bx = rnd(i * 13 + 201) * GW, by = 590 + rnd(i * 13 + 202) * 190, x = bx + 26 * Math.sin(t * (0.3 + rnd(i) * 0.3) + i * 3) , y = by + 14 * Math.sin(t * (0.5 + rnd(i + 40) * 0.3) + i * 1.7), a = Math.max(0, Math.sin(t * (0.9 + rnd(i + 80) * 0.7) + i * 2.3)) ** 1.5;
    if (a <= 0.03) continue; c.tint(Math.floor(x) - 5, Math.floor(y) - 5, 11, 11, (X, Y) => a * 0.55 * Math.max(0, 1 - Math.hypot(X - x, Y - y) / 5), COL.green, 3); fade(c, Math.min(1, a * 1.4)).px(x, y, "#D8FFB0"); fade(c, a).px(x + 1, y, COL.green); }
}
export function drawFront(c, t) { fog(c, t, true); fireflies(c, t); drawFG(c); }
