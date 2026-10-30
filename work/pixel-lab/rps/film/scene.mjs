// The one persistent world of «Rock-paper-scissors isn't luck»: a school classroom (world x 0–590: cream wall, the big
// chalkboard, a wall clock, the teacher's desk, the backs of two pupils' desks in the foreground), a short corridor, and
// the auction room next door (world x 760–1300: burgundy wall, our own painting of trees in a gold frame and two small
// ones, a chandelier, the auction table, rows of chairs in front). Screen x = world x − cam.cx + 270.
// The static parts are drawn once into two strips (back, front with a key colour) and copied per frame.
import { Canvas, mix, bayer } from "../../../../renderer/pixel/raster.mjs";
import { CAM, ROOM } from "./timeline.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const STRIP_W = 1320, GH = 960, KEY = "#FF00FE";
export const BOARD = { x: 22, y: 202, w: 496, h: 274, in: [30, 210, 480, 258], col: "#2C5A40", col2: "#27513A" };
export const DESK = { x: 150, y: 566, w: 240 };
export const AUX = 760;   // world x where the auction room starts (its screen x = world − 760 when the camera rests there)

export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: a.cx + (b.cx - a.cx) * k };
}
/** Screen x offset of the classroom / the auction room for camera cx (0 when the camera rests there). */
export const offClass = (cam) => R(ROOM.class - cam.cx), offAuction = (cam) => R(ROOM.auction - cam.cx);

const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const band = (c, x, y, w, h, top, bot) => { for (let j = 0; j < h; j++) { const k = j / Math.max(1, h - 1); for (let i = 0; i < w; i++) c.px(x + i, y + j, k * 3 % 1 > bayer(x + i, y + j) ? mix(top, bot, Math.ceil(k * 3) / 3) : mix(top, bot, Math.floor(k * 3) / 3)); } };

// ---------------------------------------------------------------- classroom (world x 0..590)
function classroom(c) {
  // wall: cream, a soft top band, wainscot below the board
  band(c, 0, 0, 600, 40, "#C9B48C", "#E2CFA6");
  c.rect(0, 40, 600, 442, "#EAD8B0");
  for (let y = 40; y < 482; y++) for (let x = 0; x < 600; x++) if (((x >> 2) + (y >> 2)) % 9 === 0 && bayer(x, y) < 0.2) c.px(x, y, "#E2CEA4");
  c.rect(0, 40, 600, 3, "#B89C70");
  // two pendant lamps
  for (const lx of [130, 410]) { c.rect(lx, 0, 2, 26, "#5A4A3A"); c.poly([[lx - 26, 44], [lx - 12, 26], [lx + 14, 26], [lx + 28, 44]], "#3E4A5A"); c.rect(lx - 24, 42, 52, 3, "#2A323E");
    for (let j = 45; j < 120; j++) for (let i = -60; i <= 62; i++) { const w = 24 + (j - 45) * 0.5; if (Math.abs(i) < w && bayer(lx + i, j) < 0.13 * (1 - (j - 45) / 75)) c.px(lx + i, j, "#FFF4D0"); } c.rect(lx - 16, 44, 34, 2, "#FFF1B8"); }
  // wall clock (top left, background)
  { const cx = 270, cy = 82; c.disc(cx, cy, 24, "#3A2A20"); c.disc(cx, cy, 21, "#FBF6E8"); for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * Math.PI; c.px(R(cx + Math.cos(a) * 17), R(cy + Math.sin(a) * 17), "#3A2A20"); } }
  // chalkboard: wood frame, green slate with faint old smudges, the chalk tray with chalk and a sponge
  const B = BOARD; c.rrect(B.x - 4, B.y - 4, B.w + 8, B.h + 8, "#3A2210", 2); c.rrect(B.x, B.y, B.w, B.h, "#8A5834", 2); c.rect(B.x + 2, B.y + 2, B.w - 4, 2, "#B07A48");
  c.rect(B.x + 8, B.y + 8, B.w - 16, B.h - 16, B.col);
  for (let y = B.y + 8; y < B.y + B.h - 8; y++) for (let x = B.x + 8; x < B.x + B.w - 8; x++) { const s = Math.sin(x * 0.031 + y * 0.017) * Math.sin(x * 0.013 - y * 0.041); if (s > 0.55 && bayer(x, y) < 0.25) c.px(x, y, "#346A4C"); else if (bayer(x, y) < 0.06) c.px(x, y, B.col2); }
  c.rect(B.x + 8, B.y + 8, B.w - 16, 1, "#1E3E2C"); c.rect(B.x + 8, B.y + 8, 1, B.h - 16, "#1E3E2C");
  c.rect(B.x - 6, B.y + B.h + 2, B.w + 12, 6, "#6A4024"); c.rect(B.x - 6, B.y + B.h + 2, B.w + 12, 2, "#A87448");
  for (const [x, col] of [[64, "#F4F1E4"], [74, "#F4E08A"], [460, "#F4A0B8"]]) c.rect(x, B.y + B.h - 1, 9, 3, col);
  c.rect(420, B.y + B.h - 3, 26, 6, "#3A3A5A"); c.rect(420, B.y + B.h - 3, 26, 2, "#C8B47A");
  // wainscot and skirting
  c.rect(0, 482, 600, 158, "#9C6A3E"); for (let x = 0; x < 600; x += 60) { c.rframe(x + 6, 494, 48, 132, "#7A4E2A", 2); c.rect(x + 8, 496, 44, 1, "#B88456"); }
  c.rect(0, 482, 600, 4, "#6A4024"); c.rect(0, 632, 600, 8, "#5A3418");
  // floor: warm planks in perspective (lines run to a vanishing point above the desk), soft light falloff
  for (let y = 640; y < 960; y++) { const k = (y - 640) / 320; for (let x = 0; x < 600; x++) {
    const u = (x - 270) / (60 + (y - 640) * 2.6), plank = Math.floor(u * 9 + 100), f = u * 9 + 100 - plank, seam = f < 0.07 + 0.04 * k;
    const base = plank % 3 === 0 ? "#B47E4A" : plank % 3 === 1 ? "#C08A54" : "#BA844E", joint = ((y - 640) + plank * 53) % 140 < 2 && k > 0.05;
    c.px(x, y, seam || joint ? "#7A4E2A" : k < 0.08 && bayer(x, y) < 0.5 ? "#A87444" : base); } }
  // a bookshelf (left) and a potted plant (right) against the wainscot
  { const x0 = 34, y0 = 520; c.rect(x0, y0, 92, 120, "#5A3418"); c.rect(x0 + 4, y0 + 4, 84, 112, "#3A2210");
    for (const sy of [y0 + 40, y0 + 80]) c.rect(x0 + 4, sy, 84, 4, "#6A4024");
    const cols = ["#3C7AD0", "#D8443C", "#F4CA50", "#5E9A44", "#8D59DA", "#E08A1C", "#7FE3F0"];
    for (let r = 0; r < 3; r++) for (let i = 0, x = x0 + 7; x < x0 + 84; i++) { const w = 6 + ((i * 7 + r * 3) % 4) * 2, h = 26 + ((i * 5 + r) % 3) * 3, col = cols[(i * 3 + r * 2) % 7]; if (x + w > x0 + 86) break; c.rect(x, y0 + 4 + r * 40 + 36 - h, w, h, col); c.rect(x, y0 + 4 + r * 40 + 36 - h, w, 2, mix(col, "#FFFFFF", 0.35)); c.rect(x + w - 1, y0 + 4 + r * 40 + 36 - h, 1, h, mix(col, "#000000", 0.3)); x += w + 1; } }
  { const px = 470, py = 640; c.poly([[px - 22, py - 44], [px + 22, py - 44], [px + 16, py], [px - 16, py]], "#B85A30"); c.rect(px - 24, py - 48, 48, 6, "#D8744A");
    for (let i = 0; i < 9; i++) { const an = -Math.PI / 2 + (i - 4) * 0.32, L = 46 + (i % 3) * 14; for (let k = 0; k < L; k++) { const x = R(px + Math.cos(an) * k + Math.sin(k * 0.08) * 3), y = R(py - 48 + Math.sin(an) * k); const w = Math.max(1, R(4 * Math.sin(Math.PI * k / L) + 1)); c.rect(x - (w >> 1), y, w, 1, k / L > 0.5 ? "#6EB04E" : "#4E8A3A"); } } }
  // the doorway to the corridor on the right wall
  c.rect(590, 40, 12, 600, "#5A4030"); c.rect(588, 40, 3, 600, "#C9B48C");
}
// ---------------------------------------------------------------- corridor (world x 600..760)
function corridor(c) {
  c.rect(600, 0, 160, 640, "#6E8A86"); band(c, 600, 0, 160, 60, "#4E6662", "#6E8A86");
  for (let x = 610; x < 750; x += 46) { c.rframe(x, 160, 34, 70, "#5A726E", 2); }
  c.rect(600, 482, 160, 158, "#56706C"); c.rect(600, 632, 160, 8, "#3A4E4A");
  for (let y = 640; y < 960; y++) for (let x = 600; x < 760; x++) c.px(x, y, ((x >> 4) + (y >> 4)) % 2 ? "#C8C2B0" : "#B4AE9C");
  c.rect(748, 40, 14, 600, "#3A2418"); c.rect(746, 40, 3, 600, "#8A6A50");
}
// ---------------------------------------------------------------- auction room (world x 760..1320)
function painting(c, x, y, w, h, seed = 0, big = false) {
  c.rect(x - 8, y - 8, w + 16, h + 16, "#6A4A10"); c.rect(x - 6, y - 6, w + 12, h + 12, "#C99A2A"); c.rect(x - 6, y - 6, w + 12, 2, "#FAE375"); c.rect(x - 2, y - 2, w + 4, h + 4, "#8A6418");
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = j / h; c.px(x + i, y + j, v < 0.55 ? (v * 3 % 1 > bayer(i, j) ? mix("#8EC4E8", "#F4E8C8", Math.ceil(v * 3) / 3 / 0.55 * 0.55) : mix("#8EC4E8", "#F4E8C8", Math.floor(v * 3) / 3)) : "#7AA45A"); }
  // hills, a path, a little river (ours)
  const hill = (y0, amp, f, ph, col) => { for (let i = 0; i < w; i++) { const hy = R(y0 + amp * Math.sin(i * f + ph)); for (let j = Math.max(0, hy); j < h; j++) c.px(x + i, y + j, col); } };
  hill(h * 0.5, h * 0.06, 0.035, seed, "#9AB8A8"); hill(h * 0.6, h * 0.05, 0.05, seed + 2, "#86AE62"); hill(h * 0.72, h * 0.04, 0.07, seed + 4, "#6E9A4E");
  if (big) { for (let j = R(h * 0.72); j < h; j++) { const u = (j - h * 0.72) / (h * 0.28), cx = w * 0.42 + Math.sin(u * 3) * w * 0.06, hw = 2 + u * w * 0.07; for (let i = R(cx - hw); i <= R(cx + hw); i++) c.px(x + i, y + j, bayer(i, j) < 0.3 ? "#E8D8A8" : "#D8C48C"); } }
  // trees: round dithered canopies on trunks
  const trees = big ? [[0.16, 0.66, 0.11], [0.3, 0.6, 0.08], [0.7, 0.64, 0.12], [0.86, 0.7, 0.09], [0.55, 0.56, 0.06]] : [[0.5 + 0.18 * Math.sin(seed), 0.62, 0.2]];
  for (const [u, v, s] of trees) { const tx = x + R(u * w), ty = y + R(v * h), r = R(s * w * (big ? 1 : 0.55)); c.rect(tx - 1, ty, 3, R(r * 1.4), "#5A3A1E");
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = (i * i + j * j) / (r * r); if (d > 1) continue; const lit = (-i - j) / (r * 1.4) * 0.5 + 0.5; c.px(tx + i, ty - r + j, lit > 0.72 ? "#9CCB6A" : lit > 0.45 + 0.2 * bayer(i, j) ? "#5E9A44" : "#3E7034"); } }
}
function auction(c) {
  const X = AUX;
  // burgundy wall with a faint damask, gold rails
  c.rect(X, 0, 560, 640, "#5A1A28");
  for (let y = 0; y < 470; y++) for (let x = X; x < X + 560; x++) { const u = ((x - X) % 40) - 20, v = (y % 48) - 24; if (Math.abs(Math.abs(u) - Math.abs(v) * 0.6) < 1.2 && bayer(x, y) < 0.45) c.px(x, y, "#6A2434"); }
  band(c, X, 0, 560, 50, "#2E0A14", "#5A1A28");
  c.rect(X, 136, 560, 3, "#C99A2A"); c.rect(X, 139, 560, 1, "#6A4A10");
  // chandelier (top, background)
  { const cx = X + 270; c.rect(cx, 0, 2, 40, "#8A6418"); c.rect(cx - 40, 40, 82, 4, "#C99A2A"); for (const dx of [-40, -20, 0, 20, 40]) { c.rect(cx + dx, 44, 2, 12, "#C99A2A"); c.disc(cx + dx + 1, 60, 4, "#FFF1B8"); c.px(cx + dx + 1, 58, "#FFFFFF"); }
    for (let j = 60; j < 125; j++) for (let i = -90; i <= 90; i++) if (bayer(cx + i, j) < 0.1 * (1 - (j - 60) / 65) && Math.abs(i) < 30 + (j - 60)) c.px(cx + i, j, "#FFD9A0"); }
  // spotlights onto the paintings
  for (let y = 140; y < 400; y++) for (let x = X; x < X + 560; x++) { const u = (x - X - 270) / (60 + (y - 140) * 0.55); if (Math.abs(u) < 1 && bayer(x, y) < 0.12 * (1 - Math.abs(u))) c.px(x, y, "#7A3040"); }
  painting(c, X + 116, 196, 308, 176, 1, true);
  painting(c, X + 40, 214, 52, 64, 2); painting(c, X + 448, 214, 52, 64, 4);
  // wainscot, skirting, carpet
  c.rect(X, 470, 560, 170, "#3A1A12"); for (let x = X; x < X + 560; x += 56) { c.rframe(x + 6, 482, 44, 140, "#2A100A", 2); c.rect(x + 8, 484, 40, 1, "#5A2E1E"); }
  c.rect(X, 466, 560, 4, "#C99A2A"); c.rect(X, 632, 560, 8, "#1E0A06");
  for (let y = 640; y < 960; y++) for (let x = X; x < X + 560; x++) { const u = (x - X) % 32, v = (y - 640) % 32; c.px(x, y, (u < 2 || v < 2) && bayer(x, y) < 0.6 ? "#6A1420" : "#8A1E2A"); }
  // the auction table: dark green cloth with a gold fringe
  c.rect(X + 126, 516, 290, 8, "#1E3A2A"); c.rect(X + 126, 516, 290, 2, "#4E7A5A"); c.rect(X + 132, 524, 278, 108, "#244A34");
  for (let x = X + 132; x < X + 410; x += 6) { c.rect(x, 524, 2, 108, "#2A5440"); } c.rect(X + 132, 628, 278, 4, "#C99A2A");
  // the gavel's sound block
  c.rect(X + 372, 506, 30, 10, "#5A3418"); c.rect(X + 372, 506, 30, 2, "#8A5834");
}
// ---------------------------------------------------------------- front strip: teacher's desk, pupils' desks, auction chairs
function front(c) {
  c.rect(0, 0, STRIP_W, GH, KEY);
  // teacher's desk (the hero stands behind it)
  const D = DESK; c.rect(D.x - 6, D.y, D.w + 12, 10, "#5A3418"); c.rect(D.x - 6, D.y, D.w + 12, 3, "#B07A48");
  c.rect(D.x, D.y + 10, D.w, 92, "#8A5834"); c.rframe(D.x + 12, D.y + 22, D.w - 24, 64, "#6A4024", 2); c.rect(D.x + 14, D.y + 24, D.w - 28, 1, "#A87448");
  c.rect(D.x, D.y + 100, D.w, 4, "#3A2210");
  // on the desk: a stack of books and an apple
  for (const [i, col] of [[0, "#3C7AD0"], [1, "#D8443C"], [2, "#F4CA50"]]) { c.rect(D.x + 18 + i, D.y - 8 - i * 7, 46, 7, col); c.rect(D.x + 18 + i, D.y - 8 - i * 7, 46, 1, mix(col, "#FFFFFF", 0.4)); c.rect(D.x + 60 + i, D.y - 7 - i * 7, 3, 5, "#FBF6E8"); }
  c.disc(D.x + 214, D.y - 7, 7, "#C82A30"); c.disc(D.x + 212, D.y - 9, 2, "#F07A6A"); c.rect(D.x + 214, D.y - 17, 2, 5, "#5A3418"); c.rect(D.x + 216, D.y - 17, 4, 2, "#5E9A44");
  // two pupils' desks in the foreground (bottom corners, background only): tops in perspective with a notebook and a pencil
  for (const [x0, x1, flip] of [[-30, 170, 0], [370, 570, 1]]) { const top = 842;
    c.poly([[x0 + 30, top], [x1 - 30, top], [x1, top + 34], [x0, top + 34]], "#C08A54"); c.rect(x0, top + 34, x1 - x0, 6, "#8A5834"); c.rect(x0 + 10, top + 40, x1 - x0 - 20, 80, "#6A4024"); c.rect(x0 + 30, top, x1 - x0 - 60, 2, "#E2AC70");
    const nx = flip ? x0 + 40 : x0 + 70; c.poly([[nx + 8, top + 6], [nx + 64, top + 6], [nx + 70, top + 28], [nx, top + 28]], "#F4F1E4"); c.rect(nx + 35, top + 6, 1, 22, "#B8B0A0");
    for (let k = 0; k < 4; k++) c.rect(nx + 8 + k, top + 11 + k * 4, 22, 1, "#A8C8E8");
    c.line(nx + 80, top + 24, nx + 108, top + 12, "#F4CA50"); c.line(nx + 80, top + 25, nx + 108, top + 13, "#C99A2A"); c.px(nx + 79, top + 25, "#3A2A20"); }
  // auction chairs (rows of backs, gold frames, red velvet)
  for (const [y, sp, w, h] of [[790, 128, 96, 70], [870, 150, 118, 90]]) for (let x = AUX - 60 + (y > 800 ? 40 : 0); x < AUX + 600; x += sp) { c.rrect(x, y, w, h, "#6A4A10", 2); c.rrect(x + 4, y + 4, w - 8, h - 4, "#8A1E2A", 2); c.rect(x + 8, y + 8, w - 16, 3, "#B83A48"); }
}

let BACK = null, FRONT = null;
function build() { BACK = new Canvas(STRIP_W, GH, "#000000"); classroom(BACK); corridor(BACK); auction(BACK); FRONT = new Canvas(STRIP_W, GH, KEY); front(FRONT); }
/** Copy the static back strip into the frame for camera cx. */
export function drawBack(c, cam) { if (!BACK) build(); const x0 = R(cam.cx - 270); for (let y = 0; y < GH; y++) { const s = (y * STRIP_W + x0) * 3; c.d.set(BACK.d.subarray(s, s + 540 * 3), y * 540 * 3); } }
export function drawFront(c, cam) { if (!FRONT) build(); const x0 = R(cam.cx - 270), d = FRONT.d;
  for (let y = 520; y < GH; y++) for (let x = 0; x < 540; x++) { const s = (y * STRIP_W + x0 + x) * 3; if (d[s] === 0xff && d[s + 1] === 0 && d[s + 2] === 0xfe) continue; const p = (y * 540 + x) * 3; c.d[p] = d[s]; c.d[p + 1] = d[s + 1]; c.d[p + 2] = d[s + 2]; } }
