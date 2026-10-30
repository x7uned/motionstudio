// One persistent world: a 90s living room in the evening (warm floor lamp, dusk window, striped wallpaper, rug — the
// apartment look of cat-zoomies/film, redrawn here procedurally so the camera can push in), a curved CRT TV on a low
// bench, our own console and pad on the carpet. Later a flat modern screen slides in beside the TV (same room, no cut).
// Everything is drawn in world units through the camera (cam(t): zoom + focus), so edges stay pixel-crisp at every zoom.
// The two screens show the same game picture (game.mjs) through crt.mjs: TV = CRT pass, flat = hard squares (until the
// CRT FILTER toggle dissolves it into the CRT pass).
import { bayer, hex } from "../../../../renderer/pixel/raster.mjs";
import { drawPicture, look } from "./crt.mjs";
import { GW, GH, MACRO_PX, WATER_CENTER } from "./game.mjs";
import { EV, MACRO, WF, WIDE, ENDW, FLAT, FILTER, sm, ease } from "./timeline.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v)), R = Math.round;
export const GLASS = { x0: 62, y0: 364, x1: 206, y1: 472, r: 9 };            // TV picture (world), 144×108 = 64×48 × 2.25
export const FLATG = { x0: 262, y0: 382, x1: 390, y1: 478 };                  // flat picture (world), 128×96 = 64×48 × 2
const STV = (GLASS.x1 - GLASS.x0) / GW, SFL = (FLATG.x1 - FLATG.x0) / GW;
export const tvWorld = (u, v) => [GLASS.x0 + u * STV, GLASS.y0 + v * STV];

// ---------------------------------------------------------------- camera
const MW = tvWorld(MACRO_PX.u, MACRO_PX.v), WC = tvWorld(WATER_CENTER.u, WATER_CENTER.v);
const outE = (x) => 1 - (1 - x) * (1 - x);                                     // already moving at frame 0, settles gently
const KEYS = [
  [0, 1.75, 140, 432, 270, 480, outE],
  [MACRO.in0, 2.3, 138, 425, 270, 480],
  [MACRO.in1, 22 / STV, MW[0], MW[1], 270, 300],
  [MACRO.out0, 22 / STV, MW[0], MW[1], 270, 300],
  [MACRO.out1, 7.65 / STV, tvWorld(40, 24)[0], WC[1], 270, 400],
  [WF.in0, 7.65 / STV, tvWorld(40, 24)[0], WC[1], 270, 400],
  [WF.in1, 14 / STV, WC[0], WC[1], 270, 400],
  [WF.out0, 14 / STV, WC[0], WC[1], 270, 400],
  [WF.out1, 2.3, 140, 430, 270, 480],
  [WIDE.a, 2.3, 140, 430, 270, 480],
  [WIDE.b, 1, 222, 395, 270, 480],
  [ENDW.a, 1, 222, 395, 270, 480],
  [ENDW.b, 0.92, 222, 400, 270, 480],
];
export function cam(t) {
  if (t <= KEYS[0][0]) return { z: KEYS[0][1], fx: KEYS[0][2], fy: KEYS[0][3], px: KEYS[0][4], py: KEYS[0][5] };
  for (let i = 1; i < KEYS.length; i++) if (t <= KEYS[i][0]) {
    const A = KEYS[i - 1], B = KEYS[i], e = (A[6] ?? ease)(Math.max(0, Math.min(1, (t - A[0]) / (B[0] - A[0]))));
    const z = Math.exp(Math.log(A[1]) + (Math.log(B[1]) - Math.log(A[1])) * e);
    if (Math.abs(B[1] - A[1]) < 1e-6) return { z, fx: A[2] + (B[2] - A[2]) * e, fy: A[3] + (B[3] - A[3]) * e, px: A[4] + (B[4] - A[4]) * e, py: A[5] + (B[5] - A[5]) * e };
    const k = (Math.log(z) - Math.log(A[1])) / (Math.log(B[1]) - Math.log(A[1]));      // progress in log-zoom: the focus moves with the zoom
    if (B[1] > A[1]) { const sx = A[4] + (B[2] - A[2]) * A[1], sy = A[5] + (B[3] - A[3]) * A[1]; return { z, fx: B[2], fy: B[3], px: sx + (B[4] - sx) * k, py: sy + (B[5] - sy) * k }; }
    const sx = B[4] + (A[2] - B[2]) * B[1], sy = B[5] + (A[3] - B[3]) * B[1]; return { z, fx: A[2], fy: A[3], px: A[4] + (sx - A[4]) * k, py: A[5] + (sy - A[5]) * k };
  }
  const L = KEYS[KEYS.length - 1]; return { z: L[1], fx: L[2], fy: L[3], px: L[4], py: L[5] };
}
export const X = (V, wx) => V.px + (wx - V.fx) * V.z, Y = (V, wy) => V.py + (wy - V.fy) * V.z;
export const WX = (V, sx) => V.fx + (sx - V.px) / V.z, WY = (V, sy) => V.fy + (sy - V.py) / V.z;

// ---------------------------------------------------------------- fast fills (screen grid, RGB arrays)
const cache = new Map(), RGB = (h) => { if (typeof h !== "string") return h; let v = cache.get(h); if (!v) { v = hex(h); cache.set(h, v); } return v; };
function fill(c, x0, y0, x1, y1, col, a = 1) {
  const X0 = Math.max(0, R(x0)), Y0 = Math.max(0, R(y0)), X1 = Math.min(c.w, R(x1)), Y1 = Math.min(c.h, R(y1)), [r, g, b] = RGB(col), d = c.d;
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) { if (a < 1 && a <= bayer(x, y)) continue; const p = (y * c.w + x) * 3; d[p] = r; d[p + 1] = g; d[p + 2] = b; }
}
/** World rect → screen. */
const wr = (c, V, x0, y0, x1, y1, col, a = 1) => fill(c, X(V, x0), Y(V, y0), X(V, x1), Y(V, y1), col, a);
/** World rounded rect (corner radius in world units). */
function wrr(c, V, x0, y0, x1, y1, r, col, a = 1) {
  const X0 = X(V, x0), Y0 = Y(V, y0), X1 = X(V, x1), Y1 = Y(V, y1), rr = r * V.z, [cr, cg, cb] = RGB(col), d = c.d;
  for (let y = Math.max(0, R(Y0)); y < Math.min(c.h, R(Y1)); y++) for (let x = Math.max(0, R(X0)); x < Math.min(c.w, R(X1)); x++) {
    const dx = Math.max(X0 + rr - (x + 0.5), 0, x + 0.5 - (X1 - rr)), dy = Math.max(Y0 + rr - (y + 0.5), 0, y + 0.5 - (Y1 - rr));
    if (dx * dx + dy * dy > rr * rr) continue; if (a < 1 && a <= bayer(x, y)) continue; const p = (y * c.w + x) * 3; d[p] = cr; d[p + 1] = cg; d[p + 2] = cb; }
}
/** Dithered blend toward col by k(wx, wy) inside a world rect (light pools, glows). */
function wtint(c, V, x0, y0, x1, y1, k, col, steps = 5) {
  const [cr, cg, cb] = RGB(col), d = c.d;
  for (let y = Math.max(0, R(Y(V, y0))); y < Math.min(c.h, R(Y(V, y1))); y++) { const wy = WY(V, y + 0.5);
    for (let x = Math.max(0, R(X(V, x0))); x < Math.min(c.w, R(X(V, x1))); x++) { const v = clamp01(k(WX(V, x + 0.5), wy)); if (v <= 0) continue;
      const s = v * steps, lo = Math.floor(s), q = (s - lo > bayer(x, y) ? lo + 1 : lo) / steps; if (q <= 0) continue; const p = (y * c.w + x) * 3;
      d[p] += (cr - d[p]) * q; d[p + 1] += (cg - d[p + 1]) * q; d[p + 2] += (cb - d[p + 2]) * q; } }
}

// ---------------------------------------------------------------- the room
const LAMP = [23, 244];
function room(c, V, t) {
  // wall with vertical wallpaper stripes, lit by the lamp and (faintly blue) by the TV
  wr(c, V, -400, -400, 900, 566, "#2B2142");
  for (let wx = -400; wx < 900; wx += 24) wr(c, V, wx, -400, wx + 3, 556, "#31264A");
  wtint(c, V, -400, -400, 900, 566, (x, y) => 0.62 * Math.exp(-((x - LAMP[0]) ** 2 + ((y - LAMP[1]) * 1.2) ** 2) / (2 * 150 * 150)), "#8A5A58", 6);
  wtint(c, V, -400, -400, 900, 566, (x, y) => 0.32 * Math.exp(-((x - 134) ** 2 + ((y - 410) * 1.3) ** 2) / (2 * 120 * 120)), "#4A5AA8", 5);
  // picture on the wall (our own mountain print)
  wr(c, V, 64, 168, 152, 240, "#1A1226"); wr(c, V, 68, 172, 148, 236, "#C89A5A"); wr(c, V, 71, 175, 145, 233, "#F4C88A");
  for (let i = 0; i < 74; i++) { const h = 22 + 16 * Math.sin(i * 0.09) - Math.abs(i - 38) * 0.5; wr(c, V, 71 + i, 233 - Math.max(4, h), 72 + i, 233, i % 9 < 4 ? "#7A5A8A" : "#6A4A7A"); }
  wr(c, V, 118, 184, 128, 194, "#FFF4D0");
  // window: dusk sky, a far skyline, mullions, curtains
  wr(c, V, 330, 52, 528, 306, "#1A1228");
  for (let y = 60; y < 298; y += 2) { const k = (y - 60) / 238; wr(c, V, 338, y, 520, y + 2, k < 0.45 ? "#3A2C6A" : k < 0.62 ? "#5A3878" : k < 0.76 ? "#9A4C78" : k < 0.88 ? "#D86A6A" : "#F0A060"); }
  for (let i = 0; i < 12; i++) { const bx = 340 + i * 16, bh = 18 + ((i * 37) % 30); wr(c, V, bx, 298 - bh, bx + 14, 298, "#2A1E3A"); if (i % 2) wr(c, V, bx + 4, 298 - bh + 6, bx + 6, 298 - bh + 8, "#F6D070"); }
  for (const [sx, sy] of [[360, 80], [410, 96], [470, 72], [500, 110], [388, 124]]) wr(c, V, sx, sy, sx + 2, sy + 2, "#E8E0FF");
  wr(c, V, 426, 60, 432, 298, "#1A1228"); wr(c, V, 338, 176, 520, 182, "#1A1228"); wr(c, V, 326, 300, 532, 310, "#3E2E52");
  for (let i = 0; i < 6; i++) wr(c, V, 310 + i * 6, 40, 314 + i * 6, 330 - (i % 2) * 6, i % 2 ? "#5A2440" : "#74304E");
  // skirting + floor + rug
  wr(c, V, -400, 556, 900, 566, "#3E2C46");
  wr(c, V, -400, 566, 900, 1400, "#3A2433");
  for (let y = 566; y < 1400; y += 22) wr(c, V, -400, y, 900, y + 1, "#2A1826");
  wr(c, V, 8, 582, 532, 770, "#5A2438"); wr(c, V, 14, 588, 526, 764, "#7A3048");
  for (let i = 0; i < 13; i++) { const cx = 30 + i * 40, cy = 676; for (let j = 0; j < 14; j++) for (const sx of [-1, 1]) { wr(c, V, cx + sx * (14 - j) - 1, cy - j, cx + sx * (14 - j) + 1, cy - j + 2, "#9A4858"); wr(c, V, cx + sx * (14 - j) - 1, cy + j, cx + sx * (14 - j) + 1, cy + j + 2, "#9A4858"); } }
  wr(c, V, 14, 600, 526, 603, "#9A4858"); wr(c, V, 14, 749, 526, 752, "#9A4858");
  // the TV's cool light on the bench and the floor in front of it
  wtint(c, V, -100, 520, 400, 780, (x, y) => 0.38 * Math.exp(-((x - 140) ** 2 / (2 * 110 * 110) + (y - 560) ** 2 / (2 * 60 * 60))), "#6A7ADA", 5);
  // the floor lamp (left): warm shade, pole, base, light cone
  wtint(c, V, -60, 262, 140, 566, (x, y) => (Math.abs(x - LAMP[0]) < 18 + (y - 262) * 0.42 ? 0.2 * (1 - (y - 262) / 304) : 0), "#F6C87A", 4);
  wr(c, V, 20, 262, 25, 558, "#2A2030"); wr(c, V, 21, 262, 22, 558, "#5A4A60");
  wr(c, V, 6, 556, 40, 566, "#1E1624"); wr(c, V, 9, 554, 37, 557, "#4A3A50");
  for (let y = 222; y < 262; y++) { const k = (y - 222) / 40, hw = 13 + 9 * k; wr(c, V, LAMP[0] - hw, y, LAMP[0] + hw, y + 1, k > 0.85 ? "#FFF0C0" : y % 6 < 3 ? "#F6D69A" : "#EAC488"); }
  // the bench: top board, doors, an open middle shelf with our own cartridge boxes
  wr(c, V, 26, 522, 474, 531, "#9A6248"); wr(c, V, 26, 529, 474, 531, "#6A3E2E");
  wr(c, V, 30, 531, 470, 562, "#5A3428");
  for (const [a, b] of [[34, 150], [330, 466]]) { wr(c, V, a, 535, b, 558, "#6A3E30"); wr(c, V, a + 2, 537, b - 2, 556, "#5A3428"); wr(c, V, (a + b) / 2 - 6, 545, (a + b) / 2 + 6, 548, "#C8A060"); }
  wr(c, V, 156, 535, 324, 558, "#24161C");
  [["#C84848", 162], ["#4A78C8", 186], ["#E8C048", 208], ["#58B868", 230], ["#B868C8", 252]].forEach(([col, x], i) => { const h = 16 - (i % 2) * 3; wr(c, V, x, 558 - h, x + 18, 558, col); wr(c, V, x + 2, 558 - h + 2, x + 16, 558 - h + 6, "#F4F0E8"); });
  wr(c, V, 30, 562, 40, 568, "#3A2018"); wr(c, V, 460, 562, 470, 568, "#3A2018");
  // console + pad on the carpet (our own drawing, no marks), cables
  for (let i = 0; i <= 20; i++) { const u = i / 20, x = 124 + 8 * Math.sin(u * 3), y = 568 + u * 12; wr(c, V, x, y, x + 2, y + 2, "#15101A"); }
  for (let i = 0; i <= 30; i++) { const u = i / 30, x = 164 + u * 24, y = 596 + Math.sin(u * Math.PI) * 10; wr(c, V, x, y, x + 2, y + 2, "#15101A"); }
  wr(c, V, 82, 578, 166, 606, "#2A2632"); wr(c, V, 84, 579, 164, 604, "#8E8E9E"); wr(c, V, 84, 579, 164, 583, "#B4B4C4");
  wr(c, V, 104, 580, 146, 585, "#26222E"); wr(c, V, 110, 568, 140, 582, "#2A2632"); wr(c, V, 112, 569, 138, 582, "#C04040"); wr(c, V, 115, 572, 135, 578, "#E8D8C8");
  wr(c, V, 92, 595, 96, 598, "#FF5040"); wr(c, V, 140, 594, 152, 599, "#5A5A68"); wr(c, V, 124, 594, 136, 599, "#5A5A68");
  wrr(c, V, 186, 598, 234, 616, 5, "#16121C"); wrr(c, V, 187, 599, 233, 614, 5, "#3A3644");
  wr(c, V, 194, 604, 206, 608, "#16121C"); wr(c, V, 198, 600, 202, 612, "#16121C");
  wr(c, V, 220, 602, 225, 607, "#D84848"); wr(c, V, 226, 606, 231, 611, "#D84848"); wr(c, V, 211, 606, 215, 608, "#8A8698");
}

// ---------------------------------------------------------------- the CRT TV
function tvBody(c, V) {
  wrr(c, V, 46, 346, 234, 524, 10, "#141218");
  wrr(c, V, 48, 348, 232, 522, 9, "#3C3A46");
  wr(c, V, 56, 349, 224, 352, "#5E5C6A"); wr(c, V, 226, 360, 231, 516, "#2E2C36");
  wrr(c, V, 54, 356, 214, 480, 12, "#24222C"); wrr(c, V, 58, 360, 210, 476, 11, "#18161E");
  // control strip: speaker grille, buttons, a green power light
  for (let y = 488; y < 514; y += 4) wr(c, V, 64, y, 128, y + 2, "#26242E");
  for (let i = 0; i < 3; i++) wr(c, V, 148 + i * 14, 496, 158 + i * 14, 504, "#2A2832");
  wrr(c, V, 196, 492, 214, 508, 3, "#2A2832"); wrr(c, V, 198, 494, 212, 506, 3, "#55525F"); wr(c, V, 188, 498, 192, 501, "#58F070");
}
const glassInside = (V, G, r) => (x, y) => { const wx = WX(V, x + 0.5), wy = WY(V, y + 0.5); const dx = Math.max(G.x0 + r - wx, 0, wx - (G.x1 - r)), dy = Math.max(G.y0 + r - wy, 0, wy - (G.y1 - r)); return dx * dx + dy * dy <= r * r && wx >= G.x0 && wx < G.x1 && wy >= G.y0 && wy < G.y1; };
/** The TV picture: CRT pass, curved-glass falloff, the lamp's reflection (fades on close-ups). beam = macro painting. */
export function tvPicture(c, V, img, t, beam) {
  const s = STV * V.z, L = look(1, s), cx = (GLASS.x0 + GLASS.x1) / 2, cy = (GLASS.y0 + GLASS.y1) / 2, hw = (GLASS.x1 - GLASS.x0) / 2, hh = (GLASS.y1 - GLASS.y0) / 2;
  const curve = clamp01((7 - V.z) / 4);
  drawPicture(c, img, { clip: [X(V, GLASS.x0), Y(V, GLASS.y0), X(V, GLASS.x1), Y(V, GLASS.y1)], map: { ox: X(V, GLASS.x0), oy: Y(V, GLASS.y0), gu: 0, gv: 0, s }, ...L, beam,
    inside: glassInside(V, GLASS, GLASS.r),
    shade: (x, y) => { const nx = (WX(V, x + 0.5) - cx) / hw, ny = (WY(V, y + 0.5) - cy) / hh; return 1 - curve * (0.28 * nx ** 4 + 0.36 * ny ** 4); } });
  // glass reflection: a soft warm band from the lamp, top-left (world)
  const gl = 0.22 * curve;
  if (gl > 0.01) wtint(c, V, GLASS.x0, GLASS.y0, GLASS.x1, GLASS.y1, (x, y) => { if (!glassInside(V, GLASS, GLASS.r)(X(V, x) - 0.5, Y(V, y) - 0.5)) return 0; const d = (x - GLASS.x0) * 0.55 + (y - GLASS.y0) - 26; return gl * Math.exp(-(d * d) / 120) * (1 - (x - GLASS.x0) / 160); }, "#FFF0D8", 4);
}

// ---------------------------------------------------------------- the flat screen (slides in from the right, then turns on)
export function flatDX(t) { return (1 - ease((t - FLAT.in0) / (FLAT.in1 - FLAT.in0))) * 300; }
export const flatOn = (t) => sm(t, FLAT.on, FLAT.on + 0.45);
export const filterK = (t) => sm(t, FILTER.flip0, FILTER.flip1);
function flatScreen(c, V, img, t) {
  if (t < FLAT.in0) return;
  const dx = flatDX(t), a = sm(t, FLAT.in0, FLAT.in0 + 0.5), G = { x0: FLATG.x0 + dx, y0: FLATG.y0, x1: FLATG.x1 + dx, y1: FLATG.y1 };
  wr(c, V, 296 + dx, 512, 356 + dx, 522, "#16141C", a); wr(c, V, 298 + dx, 512, 354 + dx, 514, "#4A4856", a); wr(c, V, 321 + dx, 480, 331 + dx, 512, "#1E1C26", a);
  wr(c, V, G.x0 - 3, G.y0 - 3, G.x1 + 3, G.y1 + 4, "#0C0C10", a); wr(c, V, G.x0 - 3, G.y0 - 3, G.x1 + 3, G.y0 - 2, "#3A3A48", a);
  wr(c, V, G.x0, G.y0, G.x1, G.y1, "#07070B", a);
  const on = flatOn(t);
  if (on > 0) { const s = SFL * V.z, k = filterK(t);
    drawPicture(c, img, { clip: [X(V, G.x0), Y(V, G.y0), X(V, G.x1), Y(V, G.y1)], map: { ox: X(V, G.x0), oy: Y(V, G.y0), gu: 0, gv: 0, s }, ...look(k, s), alpha: on * a }); }
  wr(c, V, G.x1 - 6, G.y1 + 1, G.x1 - 4, G.y1 + 3, on > 0.5 ? "#F0F0FF" : "#3A3A48", a);
}

export function drawRoom(c, t, img, beam) {
  const V = cam(t);
  room(c, V, t);
  tvBody(c, V);
  tvPicture(c, V, img, t, beam);
  flatScreen(c, V, img, t);
  return V;
}
export { STV, SFL };
