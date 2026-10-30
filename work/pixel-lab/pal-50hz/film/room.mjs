// One persistent world: two identical 90s living rooms side by side, split by a thin wall — USA · JAPAN (left) and
// EUROPE (right, the mirror image). Each has a curved CRT TV on a low bench, a wall socket with the TV's cable, our own
// console and pad on the carpet. The pyjama kid (person.mjs, read-only copy of cat-zoomies/film/person.mjs) sits on a
// pouf in the Europe room and plays. Later: the 60 switch goes into the Europe console, then our own white «1999»
// console takes its place. Everything is drawn in world units through the camera (cam(t)), crisp at every zoom.
// Both TVs show the same game (game.mjs) through the CRT pass (crt.mjs); the Europe picture runs 5/6 as fast.
// Frozen copy of crt/film/room.mjs, rebuilt for this film.
import { bayer, hex, mix, MAIN, TINY, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawPicture, look } from "./crt.mjs";
import { GW, GH, ffw, rate } from "./game.mjs";
import { EV, WAVE, BARS, KID, MOD, DC, sm, ease } from "./timeline.mjs";
import { drawPerson } from "./person.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v)), R = Math.round;
// ---------------------------------------------------------------- layout (world = screen grid at zoom 1)
export const PIC = { x0: 44, y0: 252, w: 192, h: 144 };                      // left TV picture; s = 3 screen px per game px
export const S_PIC = PIC.w / GW;
const MIRROR = { L: (x) => x, R: (x) => 540 - x };
/** World rect of one TV picture. */
export function picRect(side) { const x0 = side === "L" ? PIC.x0 : 540 - PIC.x0 - PIC.w; return { x0, y0: PIC.y0, x1: x0 + PIC.w, y1: PIC.y0 + PIC.h }; }
export const SOCKET = { x: 256, y: 453 };                                    // socket centre (left room; mirrored on the right)
export const CABLE = [[256, 440], [256, 318], [246, 318]];                   // plug → up the wall → into the TV side
export const CONSOLE = { x0: 100, x1: 180, y0: 488, y1: 516 };               // left room console (right: mirrored 360–440)
export const KIDPOS = { x: 312, y: 552, k: 0.6 };                            // the kid's hips on the pouf (world), scale

// ---------------------------------------------------------------- camera
const outE = (x) => 1 - (1 - x) * (1 - x);
const KEYS = [
  [0, 1.08, 270, 400, 270, 455, outE],
  [2.8, 1.0, 270, 400, 270, 460],
  [KID.in, 1.0, 270, 400, 270, 460],
  [KID.in + 1.0, 1.55, 425, 420, 270, 420],
  [MOD.cam0, 1.55, 425, 420, 270, 420],
  [MOD.cam1, 2.5, 398, 500, 270, 440],
  [MOD.back0, 2.5, 398, 500, 270, 440],
  [MOD.back1, 1.0, 270, 400, 270, 460],
  [DC.in1 + 0.2, 1.0, 270, 400, 270, 460],
  [EV.follow + 1.6, 1.03, 270, 400, 270, 461],
];
export function cam(t) {
  if (t <= KEYS[0][0]) return { z: KEYS[0][1], fx: KEYS[0][2], fy: KEYS[0][3], px: KEYS[0][4], py: KEYS[0][5] };
  for (let i = 1; i < KEYS.length; i++) if (t <= KEYS[i][0]) {
    const A = KEYS[i - 1], B = KEYS[i], e = (A[6] ?? ease)(Math.max(0, Math.min(1, (t - A[0]) / (B[0] - A[0]))));
    const z = Math.exp(Math.log(A[1]) + (Math.log(B[1]) - Math.log(A[1])) * e);
    if (Math.abs(B[1] - A[1]) < 0.05) return { z, fx: A[2] + (B[2] - A[2]) * e, fy: A[3] + (B[3] - A[3]) * e, px: A[4] + (B[4] - A[4]) * e, py: A[5] + (B[5] - A[5]) * e };
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
export const wr = (c, V, x0, y0, x1, y1, col, a = 1) => fill(c, X(V, Math.min(x0, x1)), Y(V, y0), X(V, Math.max(x0, x1)), Y(V, y1), col, a);
export function wrr(c, V, x0, y0, x1, y1, r, col, a = 1) {
  if (x1 < x0) [x0, x1] = [x1, x0];
  const X0 = X(V, x0), Y0 = Y(V, y0), X1 = X(V, x1), Y1 = Y(V, y1), rr = r * V.z, [cr, cg, cb] = RGB(col), d = c.d;
  for (let y = Math.max(0, R(Y0)); y < Math.min(c.h, R(Y1)); y++) for (let x = Math.max(0, R(X0)); x < Math.min(c.w, R(X1)); x++) {
    const dx = Math.max(X0 + rr - (x + 0.5), 0, x + 0.5 - (X1 - rr)), dy = Math.max(Y0 + rr - (y + 0.5), 0, y + 0.5 - (Y1 - rr));
    if (dx * dx + dy * dy > rr * rr) continue; if (a < 1 && a <= bayer(x, y)) continue; const p = (y * c.w + x) * 3; d[p] = cr; d[p + 1] = cg; d[p + 2] = cb; }
}
export function wtint(c, V, x0, y0, x1, y1, k, col, steps = 5) {
  if (x1 < x0) [x0, x1] = [x1, x0];
  const [cr, cg, cb] = RGB(col), d = c.d;
  for (let y = Math.max(0, R(Y(V, y0))); y < Math.min(c.h, R(Y(V, y1))); y++) { const wy = WY(V, y + 0.5);
    for (let x = Math.max(0, R(X(V, x0))); x < Math.min(c.w, R(X(V, x1))); x++) { const v = clamp01(k(WX(V, x + 0.5), wy)); if (v <= 0) continue;
      const s = v * steps, lo = Math.floor(s), q = (s - lo > bayer(x, y) ? lo + 1 : lo) / steps; if (q <= 0) continue; const p = (y * c.w + x) * 3;
      d[p] += (cr - d[p]) * q; d[p + 1] += (cg - d[p + 1]) * q; d[p + 2] += (cb - d[p + 2]) * q; } }
}
/** World line (thickness in world units). */
export function wline(c, V, x0, y0, x1, y1, w, col, a = 1) {
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L * V.z)), hw = (w * V.z) / 2;
  for (let i = 0; i <= n; i++) { const u = i / n, x = X(V, x0 + (x1 - x0) * u), y = Y(V, y0 + (y1 - y0) * u); fill(c, x - hw, y - hw, x + hw, y + hw, col, a); }
}

// ---------------------------------------------------------------- one room (local coordinates of the left room; m mirrors)
function room(c, V, t, side) {
  const m = MIRROR[side], r = (x0, y0, x1, y1, col, a) => wr(c, V, m(x0), y0, m(x1), y1, col, a), rr = (x0, y0, x1, y1, rad, col, a) => wrr(c, V, m(x0), y0, m(x1), y1, rad, col, a);
  // wall + wallpaper stripes, lit by the ceiling lamp and the TV
  r(-300, -400, 266, 474, side === "L" ? "#2B2142" : "#2A2240");
  for (let x = -300; x < 266; x += 24) r(x, -400, x + 3, 468, "#31264A");
  const lx = m(135);
  wtint(c, V, m(-300), -400, m(266), 474, (x, y) => 0.5 * Math.exp(-((x - lx) ** 2 + ((y - 90) * 1.1) ** 2) / (2 * 140 * 140)), "#8A5A58", 6);
  wtint(c, V, m(-300), -400, m(266), 474, (x, y) => 0.28 * Math.exp(-((x - lx) ** 2 + ((y - 330) * 1.3) ** 2) / (2 * 120 * 120)), "#4A5AA8", 5);
  // ceiling lamp (background zone)
  r(134, -400, 136, 70, "#1A1226");
  for (let y = 70; y < 94; y++) { const k = (y - 70) / 24, hw = 10 + 14 * k; r(135 - hw, y, 135 + hw, y + 1, k > 0.86 ? "#FFF0C0" : y % 6 < 3 ? "#F6D69A" : "#EAC488"); }
  // a small framed print (our own mountains)
  r(196, 60, 250, 112, "#1A1226"); r(199, 63, 247, 109, "#C89A5A"); r(201, 65, 245, 107, "#F4C88A");
  for (let i = 0; i < 44; i++) { const h = 14 + 10 * Math.sin(i * 0.14) - Math.abs(i - 22) * 0.4; r(201 + i, 107 - Math.max(3, h), 202 + i, 107, i % 7 < 3 ? "#7A5A8A" : "#6A4A7A"); }
  r(20, 60, 64, 112, "#1A1226"); r(23, 63, 61, 109, "#3A5A8A"); r(25, 65, 59, 107, "#5A8ABA"); for (let i = 0; i < 34; i++) r(25 + i, 92 + Math.round(4 * Math.sin(i * 0.3)), 26 + i, 107, "#4A7A4A");
  // skirting, floor boards, rug
  r(-300, 468, 266, 476, "#3E2C46");
  r(-300, 476, 266, 1400, "#3A2433");
  for (let y = 476; y < 1400; y += 22) r(-300, y, 266, y + 1, "#2A1826");
  r(14, 528, 252, 700, "#5A2438"); r(19, 533, 247, 695, "#7A3048");
  for (let i = 0; i < 6; i++) { const cx = 40 + i * 38, cy = 600; for (let j = 0; j < 14; j++) for (const sx of [-1, 1]) { r(cx + sx * (14 - j) - 1, cy - j, cx + sx * (14 - j) + 1, cy - j + 2, "#9A4858"); r(cx + sx * (14 - j) - 1, cy + j, cx + sx * (14 - j) + 1, cy + j + 2, "#9A4858"); } }
  r(19, 545, 247, 548, "#9A4858"); r(19, 680, 247, 683, "#9A4858");
  // the TV's cool light on the bench and the floor
  wtint(c, V, m(-60), 430, m(266), 700, (x, y) => 0.34 * Math.exp(-((x - m(137)) ** 2 / (2 * 110 * 110) + (y - 470) ** 2 / (2 * 60 * 60))), "#6A7ADA", 5);
  // the bench: top board, a door, an open shelf with our own cartridges (coloured shells, no names)
  r(16, 432, 247, 441, "#9A6248"); r(16, 439, 247, 441, "#6A3E2E");
  r(20, 441, 243, 468, "#5A3428");
  r(30, 445, 118, 465, "#6A3E30"); r(32, 447, 116, 463, "#5A3428"); r(70, 453, 82, 456, "#C8A060");
  r(126, 445, 239, 466, "#24161C");
  [["#C84848", 130], ["#4A78C8", 150], ["#E8C048", 170], ["#58B868", 190], ["#B868C8", 210]].forEach(([col, x], i) => { const h = 17 - (i % 2) * 3; r(x, 466 - h, x + 16, 466, col); r(x + 2, 466 - h + 2, x + 14, 466 - h + 6, "#F4F0E8"); });
  r(20, 468, 28, 474, "#3A2018"); r(235, 468, 243, 474, "#3A2018");
  // wall socket + plug + the TV cable up the wall into the TV
  r(SOCKET.x - 8, SOCKET.y - 9, SOCKET.x + 8, SOCKET.y + 9, "#1A1424"); r(SOCKET.x - 7, SOCKET.y - 8, SOCKET.x + 7, SOCKET.y + 8, "#E4DCCC"); r(SOCKET.x - 7, SOCKET.y + 6, SOCKET.x + 7, SOCKET.y + 8, "#B8AE9C");
  r(SOCKET.x - 4, SOCKET.y - 2, SOCKET.x - 2, SOCKET.y + 3, "#3A3040"); r(SOCKET.x + 2, SOCKET.y - 2, SOCKET.x + 4, SOCKET.y + 3, "#3A3040");
  r(SOCKET.x - 3, 439, SOCKET.x + 3, 447, "#2A2632"); r(SOCKET.x - 2, 440, SOCKET.x + 2, 446, "#4A4656");
  r(CABLE[0][0] - 1, CABLE[1][1], CABLE[0][0] + 1, CABLE[0][1], "#15101A"); r(CABLE[2][0], CABLE[1][1] - 1, CABLE[1][0] + 1, CABLE[1][1] + 1, "#15101A");
}

// ---------------------------------------------------------------- the CRT TV body
function tvBody(c, V, side) {
  const m = MIRROR[side], r = (x0, y0, x1, y1, col) => wr(c, V, m(x0), y0, m(x1), y1, col), rr = (x0, y0, x1, y1, rad, col) => wrr(c, V, m(x0), y0, m(x1), y1, rad, col);
  rr(30, 238, 250, 434, 11, "#141218");
  rr(32, 240, 248, 432, 10, "#3C3A46");
  r(44, 241, 236, 244, "#5E5C6A"); r(242, 252, 247, 426, "#2E2C36");
  rr(37, 245, 243, 402, 12, "#24222C"); rr(41, 249, 239, 399, 11, "#18161E");
  for (let y = 404; y < 426; y += 4) r(48, y, 120, y + 2, "#26242E");
  for (let i = 0; i < 3; i++) r(140 + i * 14, 409, 150 + i * 14, 417, "#2A2832");
  rr(196, 404, 216, 422, 3, "#2A2832"); rr(198, 406, 214, 420, 3, "#55525F"); r(184, 411, 188, 414, "#58F070");
}
const glassInside = (V, G, rad) => (x, y) => { const wx = WX(V, x + 0.5), wy = WY(V, y + 0.5); const dx = Math.max(G.x0 + rad - wx, 0, wx - (G.x1 - rad)), dy = Math.max(G.y0 + rad - wy, 0, wy - (G.y1 - rad)); return dx * dx + dy * dy <= rad * rad && wx >= G.x0 && wx < G.x1 && wy >= G.y0 && wy < G.y1; };
/** Europe picture squash (0 full … 1 squashed between black bars); back to full height when the console runs at 60 Hz. */
export const squash = (t) => sm(t, BARS.squash0, BARS.squash1) * (1 - sm(t, MOD.click + 0.05, MOD.click + 0.6));
export const SQ = 0.14;
/** Refresh sweep (only while the waves flow): one bright band runs down the picture per arriving wave crest. */
export const SWEEP_T = { L: 0.4, R: 0.48 };      // illustration, slowed 24×: the ratio stays 60 : 50 (one wave crest = one picture)
function sweepAt(t, side) { const a = clamp01(Math.min(sm(t, WAVE.in + 0.6, WAVE.in + 1.0), 1 - sm(t, WAVE.out - 0.4, WAVE.out))); if (a <= 0) return null; const ph = ((t - WAVE.in) / SWEEP_T[side]) % 1; return { row: -4 + ph * (GH + 8), a }; }
export function tvPicture(c, V, img, t, side) {
  const G = picRect(side), s = S_PIC * V.z, L = look(1, s), cx = (G.x0 + G.x1) / 2, cy = (G.y0 + G.y1) / 2, hw = PIC.w / 2, hh = PIC.h / 2;
  const q = side === "R" ? squash(t) * SQ : 0, sy = s * (1 - q), oy = Y(V, G.y0) + (s - sy) * GH / 2, sw = sweepAt(t, side);
  drawPicture(c, img, { clip: [X(V, G.x0), Y(V, G.y0), X(V, G.x1), Y(V, G.y1)], map: { ox: X(V, G.x0), oy, gu: 0, gv: 0, s, sy }, ...L, gain: 1 - 0.38 * ffw(t),
    beam: sw ? (r) => 1 + 0.45 * sw.a * Math.exp(-(((r - sw.row) / 2.2) ** 2)) : null,
    inside: glassInside(V, G, 9),
    shade: (x, y) => { const nx = (WX(V, x + 0.5) - cx) / hw, ny = (WY(V, y + 0.5) - cy) / hh; return 1 - (0.26 * nx ** 4 + 0.34 * ny ** 4); } });
  wtint(c, V, G.x0, G.y0, G.x1, G.y1, (x, y) => { if (!glassInside(V, G, 9)(X(V, x) - 0.5, Y(V, y) - 0.5)) return 0; const d = (x - G.x0) * 0.55 + (y - G.y0) - 24; return 0.16 * Math.exp(-(d * d) / 120) * (1 - (x - G.x0) / 200); }, "#FFF0D8", 4);
}

// ---------------------------------------------------------------- consoles (our own drawings, no marks)
/** The old console (local L coords, mirrored). open 0..1 = lid lifted on its back hinge; sw = 60-switch state. */
function oldConsole(c, V, side, t, o = {}) {
  const m = MIRROR[side], dx = o.dx ?? 0, a = o.a ?? 1, mm = (x) => m(x) + dx;
  const r = (x0, y0, x1, y1, col) => wr(c, V, mm(x0), y0, mm(x1), y1, col, a), rr = (x0, y0, x1, y1, rad, col) => wrr(c, V, mm(x0), y0, mm(x1), y1, rad, col, a);
  const { x0, x1, y0, y1 } = CONSOLE, open = o.open ?? 0, GREY = "#6A6878";
  // cables to the TV and the pad
  for (let i = 0; i <= 20; i++) { const u = i / 20, x = x0 + 10 + 6 * Math.sin(u * 3), y = 474 + u * 14; wr(c, V, mm(x), y, mm(x + 2), y + 2, "#15101A", a); }
  rr(x0 - 2, y0 - 2, x1 + 2, y1 + 2, 4, "#16141C");
  rr(x0, y0, x1, y1, 4, "#4A4858");
  r(x0 + 2, y1 - 5, x1 - 2, y1 - 2, "#3A3846");
  r(x0 + 8, y1 - 11, x0 + 14, y1 - 8, "#FF5040");                                 // power light
  r(x1 - 26, y1 - 12, x1 - 16, y1 - 7, "#2A2632"); r(x1 - 13, y1 - 12, x1 - 3, y1 - 7, "#2A2632");   // pad ports
  // top face (y0 … y0+12) under the lid: a green board with chips and the slot for the switch, revealed as the lid lifts
  if (open > 0) {
    r(x0 + 3, y0 + 1, x1 - 3, y0 + 12, "#1E5A34"); r(x0 + 3, y0 + 1, x1 - 3, y0 + 2, "#2E7A44");
    r(x0 + 8, y0 + 3, x0 + 26, y0 + 9, "#16141C"); r(x0 + 32, y0 + 4, x0 + 44, y0 + 10, "#16141C"); r(x1 - 22, y0 + 4, x1 - 12, y0 + 10, "#B8A050");
    for (let i = 0; i < 6; i++) r(x0 + 10 + i * 3, y0 + 9, x0 + 11 + i * 3, y0 + 10, "#C8C8A8");
  }
  // the lid: hinged at the back. Closed it covers the top face; opening, its bottom edge rises (the board shows) and the
  // plate tilts up behind the console, showing its darker underside
  const k = ease(open), yBot = y0 + 12 - 12.5 * k, yTop = y0 - 1 - 22 * Math.sin(k * 1.4), swFirst = side === "R" && k < 0.9;
  if (swFirst) sixtySwitch(c, V, t, dx, a);
  rr(x0 + 1, yTop - 1, x1 - 1, Math.max(yTop + 3, yBot), 3, "#16141C");
  rr(x0 + 2, yTop, x1 - 2, Math.max(yTop + 2, yBot - 1), 3, mix(GREY, "#4A4858", sm(k, 0.25, 0.5)));
  if (k < 0.3) { const g0 = 1 - sm(k, 0.05, 0.3); r(x0 + 3, yTop + 1, x1 - 3, yTop + 3, mix("#8A889A", GREY, 1 - g0)); }
  if (k > 0.35) { r(x0 + 6, yTop + 3, x1 - 6, yTop + 4, "#5E5C6C"); r(x0 + 6, (yTop + yBot) / 2, x1 - 6, (yTop + yBot) / 2 + 1, "#3A3846"); }
  // screws on the lid corners (on the plate)
  for (const sx of [x0 + 5, x1 - 5]) r(sx - 1, yTop + 3, sx + 1, yTop + 5, "#C8C8D8");
  if (side === "R" && !swFirst) sixtySwitch(c, V, t, dx, a);
  // the cartridge: lifted out before the lid opens (slides up and dissolves; Europe console only)
  const out = side === "R" ? sm(t, MOD.screw0 - 0.35, MOD.screw0 + 0.1) : 0, ca = a * (1 - out);
  if (ca > 0) { const cy = y0 - 12 - out * 18, mx = (x0 + x1) / 2;
    wrr(c, V, mm(mx - 13), cy, mm(mx + 13), y0 + 3, 2, "#2A2632", ca); wr(c, V, mm(mx - 12), cy + 1, mm(mx + 12), y0 + 2, "#C04040", ca); wr(c, V, mm(mx - 9), cy + 3, mm(mx + 9), cy + 8, "#E8D8C8", ca); }
}
/** Our own white «1999» console (rounded, a round lid, one small coloured dot; no logo). */
function whiteConsole(c, V, t, dx, a) {
  if (a <= 0) return; const m = MIRROR.R, mm = (x) => m(x) + dx, cx0 = 96, cx1 = 184, y0 = 490, y1 = 518;
  for (let i = 0; i <= 20; i++) { const u = i / 20, x = 150 + 6 * Math.sin(u * 3), y = 474 + u * 16; wr(c, V, mm(x), y, mm(x + 2), y + 2, "#15101A", a); }
  wrr(c, V, mm(cx0 - 2), y0 - 2, mm(cx1 + 2), y1 + 2, 7, "#2A2A34", a);
  wrr(c, V, mm(cx0), y0, mm(cx1), y1, 6, "#E6E6EE", a);
  wrr(c, V, mm(cx0 + 2), y1 - 7, mm(cx1 - 2), y1 - 1, 4, "#C4C4D0", a);
  // the round lid
  const ccx = (cx0 + cx1) / 2 + 6;
  for (let j = 0; j < 7; j++) { const hw = 22 * Math.sqrt(1 - ((j - 3) / 3.6) ** 2); wr(c, V, mm(ccx - hw), y0 + 2 + j, mm(ccx + hw), y0 + 3 + j, j < 2 ? "#FFFFFF" : "#D4D4DE", a); }
  wr(c, V, mm(cx0 + 8), y1 - 13, mm(cx0 + 12), y1 - 9, "#F08A3A", a);
  for (let i = 0; i < 4; i++) wr(c, V, mm(cx0 + 18 + i * 9), y1 - 6, mm(cx0 + 24 + i * 9), y1 - 3, "#9A9AAA", a);
}
/** The Europe console's swap: old (modded) console slides away, the white one slides into its place. */
export const swapK = (t) => ease((t - DC.in0) / (DC.in1 - DC.in0));

// ---------------------------------------------------------------- the 60 switch (only in the Europe console)
export const lidOpen = (t) => ease((t - MOD.lid0) / (MOD.lid1 - MOD.lid0)) * (1 - ease((t - MOD.lidClose0) / (MOD.lidClose1 - MOD.lidClose0)));
export const swDrop = (t) => ease((t - MOD.sw0) / (MOD.sw1 - MOD.sw0));          // 0 above → 1 seated in the board
export const swFlip = (t) => ease((t - MOD.click) / 0.14);                        // 0 = 50, 1 = 60
export function switchWorld() { const m = MIRROR.R; return { x: m((CONSOLE.x0 + CONSOLE.x1) / 2) + 6, y: CONSOLE.y0 + 8 }; }
function sixtySwitch(c, V, t, dx = 0, a0 = 1) {
  if (t < MOD.sw0 - 0.3) return;
  const d = swDrop(t), a = a0 * sm(t, MOD.sw0 - 0.3, MOD.sw0);
  const { x, y } = switchWorld(), xx = x + dx, yy = y - (1 - d) * 46, f = swFlip(t);
  wrr(c, V, xx - 10, yy - 5, xx + 10, yy + 4, 2, "#16141C", a); wrr(c, V, xx - 9, yy - 4, xx + 9, yy + 3, 2, "#E04848", a);
  const lx = xx - 4 + 8 * f; wline(c, V, xx, yy - 1, lx, yy - 6, 2.2, "#DADAE6", a); wr(c, V, lx - 1.5, yy - 7.5, lx + 1.5, yy - 4.5, "#FDFEED", a);
}
function screwdriver(c, V, t) {
  const a = Math.min(sm(t, MOD.screw0 - 0.3, MOD.screw0), 1 - sm(t, MOD.lid0 + 0.05, MOD.lid0 + 0.35)); if (a <= 0) return;
  const m = MIRROR.R, tx = m(CONSOLE.x0 + 5), ty = CONSOLE.y0 + 4, come = 1 - ease((t - MOD.screw0 + 0.3) / 0.45), tw = Math.sin((t - MOD.screw0) * 22) * sm(t, MOD.screw0, MOD.screw0 + 0.1);
  const ox = come * 36, oy = -come * 36, sx0 = tx + ox, sy0 = ty + oy, hx = sx0 + 9, hy = sy0 - 12;      // tip on the screw, shaft up-right
  wline(c, V, sx0, sy0, hx, hy, 1.6, "#16141C", a); wline(c, V, sx0, sy0, hx, hy, 1.0, "#D8D8E6", a);
  for (let i = 0; i <= 10; i++) { const u = i / 10, w = (i === 0 || i === 10 ? 4.5 : 6) + tw * 0.5; wline(c, V, hx + u * 10, hy - u * 13, hx + u * 10 + 0.5, hy - u * 13 - 0.5, w + 1.2, "#16141C", a); }
  for (let i = 0; i <= 10; i++) { const u = i / 10, w = (i === 0 || i === 10 ? 4.5 : 6) + tw * 0.5; wline(c, V, hx + u * 10, hy - u * 13, hx + u * 10 + 0.5, hy - u * 13 - 0.5, w, (i + Math.round(tw * 2)) % 3 ? "#E8C048" : "#B88A20", a); }
}

// ---------------------------------------------------------------- the kid (pyjamas, purple bobble hat) on a pouf, playing
function kid(c, V, t) {
  const { x: AX, y: AY, k } = KIDPOS, G = { z: V.z * k, X: (px) => X(V, AX + px * k), Y: (py) => Y(V, AY + py * k), wx: (sx) => (WX(V, sx) - AX) / k, wy: (sy) => (WY(V, sy) - AY) / k };
  // pouf
  for (let j = 0; j < 30; j++) { const v = (j - 15) / 15, hw = 34 * Math.sqrt(Math.max(0, 1 - v * v * 0.8)); wr(c, V, AX - hw * k - 2 * k, AY - 46 * k + j * k * 1.55, AX + hw * k - 2 * k, AY - 46 * k + (j + 1) * k * 1.55, j < 6 ? "#E08A3A" : j < 22 ? "#C86A2A" : "#9A4A1C"); }
  const happy = sm(t, KID.in + 0.6, KID.in + 1.0), bounce = 0.5 + 0.5 * Math.sin(t * 5.2);
  const o = drawPerson(c, G, 0, 0, { pose: "sit", seatY: -44, facing: 1, face: "happy", p: t * 0.7 + happy * bounce * 0.15, dim: 0.12, toy: [60, -150] });
  // the pad in his hands (our own), a cord to the console
  if (o && o.hand) { const [hx, hy] = o.hand; const g = c; g.rect(R(hx - 7), R(hy - 3), 15, 7, "#16121C"); g.rect(R(hx - 6), R(hy - 2), 13, 5, "#3A3644"); g.rect(R(hx + 3), R(hy - 1), 2, 2, "#D84848"); g.rect(R(hx - 4), R(hy - 1), 3, 2, "#8A8698"); }
  return o;
}

export function drawRoom(c, t, imgL, imgR) {
  const V = cam(t);
  room(c, V, t, "L"); room(c, V, t, "R");
  // the thin dividing wall
  wr(c, V, 266, -400, 274, 476, "#120C1A"); wr(c, V, 266, -400, 267, 476, "#3A2E4E"); wr(c, V, 273, -400, 274, 476, "#2A2038");
  for (const s of ["L", "R"]) { tvBody(c, V, s); tvPicture(c, V, s === "L" ? imgL : imgR, t, s); }
  oldConsole(c, V, "L", t, {});
  const sk = swapK(t);
  if (sk < 1) oldConsole(c, V, "R", t, { open: lidOpen(t), dx: sk * 70, a: 1 - sm(sk, 0.2, 0.9) });
  whiteConsole(c, V, t, -(1 - sk) * 70 + 4, sm(sk, 0.1, 0.8));
  screwdriver(c, V, t);
  // left room: the pad lies on the rug
  { const m = MIRROR.L; for (let i = 0; i <= 24; i++) { const u = i / 24, x = 180 + u * 22, y = 504 + Math.sin(u * Math.PI) * 12; wr(c, V, m(x), y, m(x + 2), y + 2, "#15101A"); }
    wrr(c, V, 196, 516, 238, 532, 5, "#16121C"); wrr(c, V, 197, 517, 237, 530, 5, "#3A3644"); wr(c, V, 203, 521, 213, 524, "#16121C"); wr(c, V, 206, 518, 209, 528, "#16121C"); wr(c, V, 224, 520, 229, 525, "#D84848"); }
  const k = kid(c, V, t);
  return { V, kid: k };
}
export { MIRROR };
