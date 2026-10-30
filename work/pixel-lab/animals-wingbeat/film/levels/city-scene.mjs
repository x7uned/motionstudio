// LV2's static scenery, painted once into a cached world layer (city.mjs blits it every frame): a harbour-town square in
// the morning — the quay edge on the left (where LV1's sea ends), a row of warm house fronts across the square (brick
// harbour house, cream house with green shutters and geraniums, the low café with its striped awning under the sun,
// the ochre bakery house with a slate mansard, the tall brick house with a clock), a hazy far skyline (dome, campanile),
// cobbles in perspective down to the bottom edge, and a hedge with a little tree at the right edge leading into LV3's
// garden. Painted in "rest-screen" coordinates (sx = world x − 540, sy = world y + 660); the layer adds the offsets.
// Deterministic; caches only memoise.
import { Layer, leafBall } from "./meadow-kit.mjs";
import { mix, bayer, MAIN } from "../cute.mjs";
import { LAND } from "../timeline.mjs";

const R = Math.round;
const hash = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const WX0 = 500, WX1 = 1120, GY = R(LAND + 660);      // layer world span; GY = ground line in rest-screen rows (640)
const OX = 540 - WX0;                                           // rest-screen x → layer x

// ---------------------------------------------------------------- paint helpers (g = canvas in rest-screen coordinates)
function rect(g, x, y, w, h, col) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g.px(i, j, col); }
function hline(g, x0, x1, y, col) { for (let i = x0; i <= x1; i++) g.px(i, y, col); }
function vline(g, x, y0, y1, col) { for (let j = y0; j <= y1; j++) g.px(x, j, col); }
/** Facade: base colour, lit left edge, shaded right edge, optional brick courses or stucco speckle, cornice on top. */
function facade(g, x0, x1, top, col, o = {}) {
  const lit = mix(col, "#FFF4DC", 0.22), dark = mix(col, "#2A1A20", 0.28), mortar = mix(col, "#3A2420", 0.35), hi = mix(col, "#FFE8CC", 0.12);
  for (let y = top; y < GY; y++) for (let x = x0; x < x1; x++) {
    let c = col;
    if (o.brick) { const row = Math.floor((y - top) / 5), off = (row & 1) * 6, bx = (x - x0 + off) % 12; if ((y - top) % 5 === 4 || bx === 0) c = mortar; else if (hash(row * 97 + Math.floor((x - x0 + off) / 12) * 13 + x0) < 0.18) c = hi; else if (hash(row * 31 + Math.floor((x - x0 + off) / 12) * 7 + x0) < 0.12) c = mix(col, "#2A1A20", 0.12); }
    else if (o.stucco && hash(x * 7919 + y * 104729) < 0.035) c = mix(col, "#8A6A4A", 0.12);
    if (x - x0 < 2) c = lit; else if (x1 - x <= 3) c = dark;
    g.px(x, y, c);
  }
  // ground plinth
  rect(g, x0, GY - 6, x1 - x0, 6, mix(col, "#4A3A34", 0.45)); hline(g, x0, x1 - 1, GY - 6, mix(col, "#FFF0D8", 0.1));
  // cornice
  if (!o.noCornice) { const cx0 = Math.max(0, x0 - 2); rect(g, cx0, top - 3, x1 + 2 - cx0, 3, mix(col, "#FFF6E4", 0.45)); hline(g, cx0, x1 + 1, top, mix(col, "#2A1A20", 0.45)); }
}
/** Window with frame, sky-reflecting glass (diagonal highlight), sill; o.shutters colour, o.box (flower box), o.curtain, o.arch. */
function windowAt(g, x, y, w, h, o = {}) {
  const frame = o.frame ?? "#F2EADA", dark = "#2A2230";
  if (o.shutters) for (const sx of [x - 8, x + w + 1]) { rect(g, sx, y, 7, h, o.shutters); for (let j = y + 2; j < y + h - 1; j += 3) hline(g, sx + 1, sx + 5, j, mix(o.shutters, "#000000", 0.3)); vline(g, sx, y, y + h - 1, mix(o.shutters, "#000000", 0.45)); vline(g, sx + 6, y, y + h - 1, mix(o.shutters, "#000000", 0.45)); hline(g, sx, sx + 6, y, mix(o.shutters, "#FFFFFF", 0.3)); }
  rect(g, x - 1, y - 1, w + 2, h + 2, dark);
  const arch = o.arch ? Math.floor(w / 2) : 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (arch && j < arch) { const dx = i - (w - 1) / 2, dy = arch - j; if (dx * dx + dy * dy > arch * arch + 1) { g.px(x + i, y + j, o.wall ?? dark); continue; } }
    const edge = i === 0 || i === w - 1 || j === 0 || j === h - 1 || i === Math.floor(w / 2) || j === Math.floor(h * 0.45);
    if (edge) { g.px(x + i, y + j, frame); continue; }
    const v = j / h, diag = (i + j * 0.8) % (w + 6);
    let col = mix("#BFE0F4", "#4A6E98", v * 0.9);
    if (diag > 3 && diag < 6) col = mix(col, "#FFFFFF", 0.55);
    if (o.curtain && (i < w * 0.3 || i > w * 0.7) && j > 1) col = o.curtain;
    g.px(x + i, y + j, col);
  }
  rect(g, x - 2, y + h + 1, w + 4, 2, mix(frame, "#7A6A5A", 0.3)); hline(g, x - 2, x + w + 1, y + h + 1, frame);
  if (o.box) { rect(g, x - 1, y + h - 3, w + 2, 4, "#8A4A2A"); hline(g, x - 1, x + w, y + h - 3, "#B06A3A");
    for (let i = 0; i < w + 2; i += 2) { const fy = y + h - 5 - R(hash(i + x * 13) * 3); g.px(x - 1 + i, fy, "#3E7A3A"); g.px(x - 1 + i, fy + 1, "#2E5E2E"); if (hash(i * 7 + x) < 0.6) { g.px(x - 1 + i, fy - 1, "#E83A4A"); g.px(x + i, fy - 1, "#FF6A6A"); g.px(x - 1 + i, fy - 2, "#C82A3A"); } } }
}
/** Pitched tile roof seen from the front: trapezoid from (x0..x1, base) up to the ridge (rx0..rx1, top), tile rows. */
function tileRoof(g, x0, x1, base, rx0, rx1, top, col = "#C4623C") {
  const dark = mix(col, "#3A1410", 0.4), lit = mix(col, "#FFE0B8", 0.25);
  for (let y = top; y < base; y++) {
    const k = (y - top) / (base - top), a = R(rx0 + (x0 - rx0) * k), b = R(rx1 + (x1 - rx1) * k);
    for (let x = a; x <= b; x++) { const row = Math.floor((y - top) / 4), sc = (x + (row & 1) * 3) % 6; let c = (y - top) % 4 === 3 ? dark : sc === 0 ? mix(col, "#3A1410", 0.2) : (y - top) % 4 === 0 ? lit : col; if (x <= a + 1) c = lit; if (x >= b - 1) c = dark; g.px(x, y, c); }
  }
  hline(g, rx0, rx1, top - 1, dark); hline(g, rx0, rx1, top, lit);
  rect(g, x0 - 2, base - 1, x1 - x0 + 5, 2, mix(col, "#2A1010", 0.55));
}
function slateRoof(g, x0, x1, base, rx0, rx1, top) { tileRoof(g, x0, x1, base, rx0, rx1, top, "#5E6A82"); }
function chimneyAt(g, x, top, w, h, col = "#A85238") {
  for (let y = top; y < top + h; y++) for (let i = 0; i < w; i++) { let c = (y - top) % 4 === 3 ? mix(col, "#2A1410", 0.35) : col; if (i < 2) c = mix(col, "#FFE8CC", 0.25); if (i >= w - 2) c = mix(col, "#2A1410", 0.3); g.px(x + i, y, c); }
  rect(g, x - 2, top - 3, w + 4, 3, "#6E3A2A"); hline(g, x - 2, x + w + 1, top - 3, "#C88A6A");
  for (const px of [x + 1, x + w - 5]) { rect(g, px, top - 8, 4, 5, "#B8643C"); hline(g, px, px + 3, top - 8, "#E09A6A"); vline(g, px + 3, top - 8, top - 4, "#6E3A2A"); }
}

// ---------------------------------------------------------------- far skyline (hazy morning blue), behind the houses
function farSkyline(g) {
  const C1 = "#A9B7D2", C2 = "#BCC8DE", C3 = "#98A7C6";
  // a band of far roofs above the low café, a dome on the left and a slim campanile on the right (kept under the disc)
  for (let x = 186; x <= 348; x++) { const top = 454 + R(5 * Math.sin(x * 0.11) + 3 * Math.sin(x * 0.31)); for (let y = top; y < 500; y++) g.px(x, y, y < top + 2 ? C2 : C1); }
  for (let y = 432; y < 470; y++) for (let x = 192; x <= 244; x++) { const dx = (x - 218) / 26, dy = (y - 470) / 36; if (dx * dx + dy * dy > 1) continue; g.px(x, y, dx < -0.35 ? C2 : dx > 0.45 ? C3 : C1); }
  rect(g, 214, 422, 9, 12, C1); vline(g, 214, 422, 433, C2); rect(g, 217, 415, 3, 7, C3); g.px(218, 413, C3);
  for (let x = 200; x <= 236; x += 7) vline(g, x, 458, 469, C3);
  rect(g, 318, 426, 14, 50, C1); vline(g, 318, 426, 475, C2); vline(g, 331, 426, 475, C3);
  for (let j = 0; j < 8; j++) hline(g, 318 + 7 - j, 324 + j, 419 + j, C3);
  rect(g, 321, 432, 3, 7, "#7E8EB0"); rect(g, 326, 432, 3, 7, "#7E8EB0");
}

// ---------------------------------------------------------------- the houses across the square
function houses(g) {
  // B1 · harbour house (warm brick, gable), sx −2..104
  facade(g, 0, 104, 420, "#B4583C", { brick: true });
  tileRoof(g, 2, 108, 420, 44, 56, 374, "#A84A30");
  for (const wy of [440, 498]) for (const wx of [14, 66]) windowAt(g, wx, wy, 22, 34, { box: wy === 498, curtain: wx === 66 && wy === 440 ? "#F2D8A8" : null });
  windowAt(g, 46, 386, 12, 14, { arch: true, wall: "#A84A30" });                 // little attic window in the gable
  // arched harbour door + a lantern bracket
  for (let j = 0; j < 52; j++) for (let i = 0; i < 30; i++) { const dx = i - 14.5, dy = 15 - j; if (j < 15 && dx * dx + dy * dy > 225) continue; const edge = i < 2 || i > 27 || (j < 15 && dx * dx + dy * dy > 180); g.px(36 + i, 582 + j, edge ? "#5A3A2A" : i % 7 === 0 ? "#22503A" : "#2E6A4A"); }
  g.px(58, 610, "#F2C24A"); g.px(59, 610, "#F2C24A");
  // B2 · cream house with green shutters, sx 104..188
  facade(g, 104, 188, 444, "#EAD6AE", { stucco: true });
  tileRoof(g, 102, 190, 444, 112, 180, 424, "#C8663E");
  for (const wy of [460, 512, 564]) windowAt(g, 136, wy, 20, 30, { shutters: "#4E8A5C", box: true });
  // B3 · the café (low, terracotta roof, striped awning), sx 188..346
  facade(g, 188, 346, 494, "#F0C98E", { stucco: true });
  tileRoof(g, 184, 350, 494, 206, 328, 466, "#C8663E");
  for (const wx of [206, 246, 286, 318]) windowAt(g, wx, 510, 16, 26, { shutters: "#4A6EA8" });
  // shop front: glass, door, the CAFE board and the awning
  rect(g, 196, 586, 142, 4, "#5A3A2A");
  for (let x = 198; x <= 336; x++) for (let y = 604; y < GY - 6; y++) { const pane = (x - 198) % 28 === 0 || y === 604; g.px(x, y, pane ? "#5A3A2A" : mix("#F8E0A8", "#7A5A3A", (y - 604) / 34)); }
  rect(g, 256, 606, 20, 28, "#7A3A24"); g.px(272, 620, "#F2C24A");
  rect(g, 226, 556, 80, 22, "#2E3A5A"); rect(g, 228, 558, 76, 18, "#3E4E78");
  g.text(MAIN, "CAFE", 236, 560, "#1E2640", { scale: 2 }); g.text(MAIN, "CAFE", 236, 559, "#FCE6A8", { scale: 2 });
  for (let x = 192; x <= 342; x++) for (let y = 588; y < 604; y++) { const st = Math.floor((x - 192) / 10) & 1, scal = y >= 600 && ((x - 192) % 10 < 2 || (x - 192) % 10 > 7); if (scal) continue; g.px(x, y, y < 590 ? (st ? "#B02A2A" : "#D8D0C0") : st ? (y > 597 ? "#B82E30" : "#D8383A") : y > 597 ? "#E2DACA" : "#F6F0E4"); }
  // B4 · ochre bakery house with a slate mansard and two dormers, sx 346..446
  facade(g, 346, 446, 426, "#D9934E", { stucco: true });
  slateRoof(g, 342, 450, 426, 352, 440, 398);
  for (const dx of [362, 410]) { rect(g, dx - 2, 396, 20, 16, "#5E6A82"); windowAt(g, dx, 400, 14, 14, { frame: "#F4F0E8" }); tileRoof(g, dx - 5, dx + 18, 398, dx + 4, dx + 9, 388, "#4E5A72"); }
  for (const wy of [444, 500]) for (const wx of [362, 412]) windowAt(g, wx, wy, 18, 32, { box: wy === 500 && wx === 362, curtain: wy === 444 && wx === 412 ? "#E8B8C8" : null });
  rect(g, 356, 560, 50, 74, "#2C5A44"); rect(g, 358, 562, 46, 70, "#3C7456");
  for (let y = 566; y < 600; y++) for (let x = 362; x < 400; x++) g.px(x, y, mix("#FBE6B8", "#A8743C", (y - 566) / 40));
  for (const [bx, by] of [[368, 590], [378, 588], [390, 591], [372, 596], [386, 597]]) { rect(g, bx, by, 6, 4, "#C8843C"); hline(g, bx + 1, bx + 4, by, "#F0B868"); }   // bread loaves in the window
  rect(g, 412, 574, 18, 60, "#5A2E1E"); rect(g, 414, 576, 14, 56, "#7A4228"); g.px(426, 604, "#F2C24A");
  // B5 · tall brick house with a clock, sx 446..536
  facade(g, 446, 538, 394, "#9E4A36", { brick: true });
  rect(g, 470, 356, 46, 38, "#9E4A36"); rect(g, 468, 353, 50, 3, "#D8C0A8"); for (let j = 0; j < 14; j++) hline(g, 470 + j, 515 - j, 352 - j, j === 0 ? "#6E3A2A" : "#5E6A82");
  for (let Y = -14; Y <= 14; Y++) for (let X = -14; X <= 14; X++) { const d = Math.hypot(X, Y); if (d > 14) continue; g.px(493 + X, 375 + Y, d > 12.5 ? "#2A2230" : d > 11 ? "#E0C27A" : "#FBF6E6"); }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.px(R(493 + Math.cos(a) * 9), R(375 + Math.sin(a) * 9), "#4A3A3A"); }
  for (let i = 0; i <= 6; i++) g.px(493, 375 - i, "#2A2230"); for (let i = 0; i <= 5; i++) g.px(493 + i, 375 + R(i * 0.3), "#2A2230");   // ten past seven-ish
  for (const wy of [408, 462, 516]) for (const wx of [460, 506]) windowAt(g, wx, wy, 18, 32, { shutters: wy === 462 ? "#4E8A5C" : null, box: wy === 516 });
  rect(g, 458, 572, 60, 62, "#3A2A2A"); for (let x = 460; x < 516; x++) for (let y = 574; y < 634; y++) g.px(x, y, (x - 460) % 14 === 0 ? "#5A4232" : mix("#D8E8F0", "#5A6E88", (y - 574) / 60));
  // chimneys
  chimneyAt(g, 70, 360, 12, 22); chimneyAt(g, 300, 448, 12, 22); chimneyAt(g, 432, 380, 10, 20, "#8A4430");
}

// ---------------------------------------------------------------- the square: cobbles in perspective, quay coping, right verge
export const CB = { D0: 5, K: 15 };
function cobbleRows() { return (d) => Math.log(1 + d / CB.D0) * CB.K; }
const STONE = ["#CDBFA6", "#BFB094", "#B1A286", "#C6B69A", "#D6C9B0", "#A99A7E"];
function plaza(g) {
  const rowAt = cobbleRows();
  // sidewalk strip in front of the houses
  for (let x = -2; x <= 540; x++) for (let y = GY; y < GY + 5; y++) g.px(x, y, y === GY ? "#E6DCC6" : y === GY + 4 ? "#8E806C" : "#CFC3AA");
  for (let y = GY + 5; y < 960; y++) {
    const d = y - GY - 5 + 0.5, r = rowAt(d), n = Math.floor(r), fr = r - n;
    // stone size from the row index (constant across one row of stones)
    const dTop = CB.D0 * (Math.exp(n / CB.K) - 1), dBot = CB.D0 * (Math.exp((n + 1) / CB.K) - 1), rowPx = dBot - dTop, sw = Math.max(4, rowPx * 1.45);
    for (let x = 0; x < 548; x++) {
      if (x >= 512) { const grass = verge(g, x, y, d); if (grass) continue; }
      if (rowPx < 3.2) { const h = hash(R(x / 3) * 31 + n * 7); g.px(x, y, bayer(x, y) < 0.3 + 0.2 * h ? "#B8AA90" : (h < 0.5 ? "#CDBFA6" : "#C4B59A")); continue; }
      const off = (n & 1) * 0.5 * sw + hash(n * 7) * sw, k = Math.floor((x + off) / sw), fx = (x + off) / sw - k;
      const h = hash(n * 7919 + k * 104729), base = STONE[Math.floor(h * STONE.length)];
      const px = fx * sw, py = fr * rowPx, gx = Math.max(1, R(sw * 0.08)), gy = Math.max(1, R(rowPx * 0.1)), rr = Math.min(4, rowPx * 0.3);
      // distance inside the stone's rounded rectangle
      const ix = Math.min(px - gx, sw - px), iy = Math.min(py - gy, rowPx - py);
      let col;
      const inCorner = ix < rr && iy < rr && (rr - ix) ** 2 + (rr - iy) ** 2 > rr * rr;
      if (ix < 0 || iy < 0 || inCorner) col = hash(x * 7 + y * 13 + n) < 0.06 && rowPx > 10 ? "#6E8A4A" : "#6A5E50";
      else if (py - gy < 1.3 || (px - gx < 1.3 && py < rowPx * 0.7)) col = mix(base, "#FFF6E2", 0.42);   // lit top / left rim
      else if (rowPx - py < 1.6 + rowPx * 0.06 || sw - px < 1.4) col = mix(base, "#3A2E24", 0.3);          // shaded bottom / right rim
      else { const sh = (py / rowPx) * 0.5 + (px / sw) * 0.3; col = sh > 0.55 + 0.2 * bayer(x, y) ? mix(base, "#5A4A3A", 0.1) : base; if (hash(x * 31 + y * 17 + n) < 0.03 && rowPx > 8) col = mix(base, "#7A6A58", 0.3); }
      g.px(x, y, col);
    }
    // the quay coping along the harbour edge (left)
    const cw = Math.max(2, R(2 + ((d + CB.D0) / CB.K) * 0.18));
    for (let x = 0; x < cw; x++) g.px(x, y, x === 0 ? "#F2EAD8" : "#DCD0B8");
    g.px(cw, y, "#7A6E5C");
  }
}
/** grass verge + kerb at the right edge of the square (into the garden); returns true when it painted the pixel */
function verge(g, x, y, d) {
  const edge = 520 - Math.min(10, d * 0.04);
  if (x < edge - 3) return false;
  if (x < edge) { g.px(x, y, x === R(edge) - 3 ? "#F0E6D0" : "#A89A82"); return true; }
  const v = Math.min(1, Math.sqrt(d / 320)), G = ["#B4E07A", "#9CD06A", "#86C05C", "#72AE50", "#5E9C46", "#4C8A3E"], s = v * 5 + (bayer(x, y) - 0.5) * 0.8;
  g.px(x, y, G[Math.max(0, Math.min(5, Math.floor(s)))]);
  if (hash(x * 13 + y * 7) < 0.04 * (0.4 + v)) g.px(x, y - 1, "#C8EC8C");
  return true;
}

/** Two rain puddles on the cobbles mirroring the morning sky (the sparkle is drawn per frame by city.mjs). */
export const PUDDLES = [[352, 770, 58, 9], [118, 812, 34, 7]];
function puddles(g) {
  for (const [cx, cy, rx, ry] of PUDDLES) for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + 0.12 * Math.sin(x * 0.4) * Math.sin(y * 0.9); if (q > 1) continue;
    const v = (y - (cy - ry)) / (2 * ry);
    let col = q > 0.82 ? "#7A6E5E" : v < 0.3 ? "#E6F2FA" : v < 0.6 ? "#A8D0F0" : "#6EA8E0";
    if (q <= 0.82 && q > 0.6 && y < cy) col = "#F2F8FC";
    g.px(x, y, col);
  }
}

// ---------------------------------------------------------------- the hedge and the little tree at the garden gate (right edge)
function gate(g) {
  // low iron fence posts on the verge line
  for (let x = 518; x <= 574; x += 8) { vline(g, x, GY - 26, GY + 2, "#2A2A34"); g.px(x, GY - 27, "#5A5A6A"); }
  hline(g, 516, 578, GY - 20, "#2A2A34"); hline(g, 516, 578, GY - 8, "#2A2A34");
  // hedge
  const H = ["#1E4A26", "#265A2C", "#2E6C32", "#3A803A", "#4A9444", "#5EA852", "#78BC62", "#98D07A"];
  for (let k = 0; k < 6; k++) leafBall(g, 520 + k * 8.4, GY - 14 + (k % 2) * 3, 11.5, H, k * 3 + 1, { bumps: 7, amp: 0.15 });
  // tree trunk + crown overlapping the garden a little
  for (let y = GY - 70; y < GY - 10; y++) for (let x = 546; x < 553; x++) g.px(x, y, x < 548 ? "#8A5A3A" : x > 551 ? "#4A2E1E" : "#6A4028");
  leafBall(g, 534, GY - 96, 25, H, 11, { bumps: 9, amp: 0.13 }); leafBall(g, 553, GY - 84, 18, H, 5, { bumps: 8, amp: 0.14 }); leafBall(g, 544, GY - 120, 19, H, 7, { bumps: 8, amp: 0.13 });
  for (const [x, y] of [[530, 540], [556, 530], [542, 520], [566, 556], [526, 566]]) { g.px(x, y, "#F4D040"); g.px(x + 1, y, "#FFF0A0"); }   // a few blossoms
}

// ---------------------------------------------------------------- the cached layer
let LAYER = null;
export function cityLayer() {
  if (LAYER) return LAYER;
  const L = new Layer(WX0, -660, WX1, 300), c = L.c, g = Object.create(c);
  g.px = (x, y, col) => c.px(x + OX, y, col);
  g.get = (x, y) => c.get(x + OX, y);
  g.text = function (font, str, x, y, col, o) { return c.text.call(this, font, str, x, y, col, o); };
  farSkyline(g); houses(g); plaza(g); puddles(g); gate(g);
  LAYER = L; return L;
}
export { hash };
