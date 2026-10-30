// mario-real · city (new, 2026-10-29, drawn for this film): one evening street of our city through the pinhole camera of
// lib/cam.mjs, full 9:16 frame at every zoom. Sky by elevation angle (warm horizon glow → lilac → deep blue, lit cloud
// streaks) → far city silhouettes with lit windows (two planes) → flat roofs seen from above (gravel, chimneys, antenna,
// pigeons' parapet) → the street wall at Z 0: a cafe house (sage), OUR three-storey house (apricot stucco, stone plinth,
// rusticated ground floor, string courses, dentil cornice at 10 m, quoins, 4 window columns with cream frames, shutters,
// sills and lintels, lit rooms with curtains, balconies, flower boxes, wall lanterns) and a blue-grey neighbour → pavement
// slabs, cobble strip, granite curb, gutter grates, asphalt with markings, lamp light pools. Window reveals and balconies
// are real 3D (they shift with the camera). All shading is ramps + ordered dither; pure functions of the camera and t.
import { hex } from "../../../../../renderer/pixel/raster.mjs";
import { R, RG, pk, put, tint, quad, box3, rnd, h2, clamp01, lerp, BY } from "../lib/cam.mjs";

// ---------------------------------------------------------------- palette (evening: warm light from the low sun behind the camera)
const P = {
  skyHi: hex("#2E2E6E"), skyMid: hex("#6A4E96"), skyLo: hex("#C27896"), glow: hex("#F2A070"), haze: hex("#F6C08C"),
  cloud: RG(["#8A5A8E", "#B87A9A", "#E29E9A", "#F8C4A0"]),
  far1: RG(["#5A4E86", "#6C5C94", "#7E6AA0"]), far2: RG(["#3E3466", "#4A3E74", "#584A80"]), lit: RG(["#E8A65A", "#FFD27A", "#FFE6A8"]),
  roof: RG(["#3A3038", "#4A3E44", "#5A4C50", "#6A5C5E"]), roofEdge: RG(["#8A6A5A", "#B08C74", "#D2AE90"]),
  stucco: RG(["#9A4E3E", "#BE6A4C", "#DC8A5E", "#F0A874", "#FAC690"]), rust: RG(["#8E4A3C", "#B06248", "#CE8058", "#E49C6C", "#F2B886"]),
  plinth: RG(["#4A3A3E", "#625056", "#7C686A", "#968284", "#B09C98"]), trim: RG(["#B08A7A", "#D2B09C", "#EED4BC", "#FFF0DC"]),
  frame: RG(["#9A8C8C", "#C8BAB4", "#ECE2D8", "#FFF8EE"]), shutter: RG(["#1E4A3E", "#2A6450", "#3A8064", "#56A07C"]),
  sage: RG(["#4A6A5A", "#5E8270", "#789C86", "#94B6A0", "#B2CEBA"]), blueW: RG(["#465276", "#5A6890", "#7282AA", "#8E9EC2", "#ACBAD8"]),
  room: RG(["#5A2E24", "#8E4A2C", "#C87A3C", "#F2AE58", "#FFD88A", "#FFF0C0"]), dark: RG(["#1A1A3A", "#262A50", "#363E6A", "#4E5A8A"]),
  curt: [RG(["#6A2A36", "#9A3E4A", "#C25E62"]), RG(["#2E5A5A", "#3E7A74", "#5E9A8E"]), RG(["#7A5A2A", "#A87E3A", "#D2A85A"]), RG(["#4A3A6A", "#6A5A8E", "#8E7EB0"])],
  pave: RG(["#5E5260", "#766878", "#8E8090", "#A698A4", "#BEB0B8"]), cob: RG(["#3E3444", "#524656", "#665A6A", "#7C6E7C"]),
  curb: RG(["#6A6470", "#8E8894", "#B2ACB4", "#D2CCD2"]), asph: RG(["#262634", "#30303E", "#3A3A4A", "#464656", "#545464"]), line: RG(["#B8B4B8", "#E2DED8", "#FFFCF0"]),
  awn: RG(["#1E4A3A", "#2C6450", "#3C7E64"]), awnL: RG(["#C8BCA4", "#E8DCC2", "#FFF4DC"]), wood: RG(["#3A1E14", "#5A3020", "#7A4630", "#9A6040"]),
  iron: RG(["#16141E", "#24202E", "#36303E", "#4A4252"]), leaf: RG(["#1E4A2A", "#2E6A36", "#448A44", "#68AA56"]), flower: RG(["#8A1E3A", "#C8304A", "#F25A62", "#FF96A0"]),
  flower2: RG(["#8A4A9A", "#B06AC0", "#D898E0"]), box: RG(["#5A2E1E", "#7E4428", "#A05E36"]), lamp: RG(["#FFB24A", "#FFD27A", "#FFF0B8"]), lampH: hex("#FFC870"),
  brick: RG(["#6A2E24", "#8E3E2C", "#B0543A", "#C8704C", "#DC8E66"]), mort: RG(["#8A7A78", "#A89894"]), gold: hex("#FFD27A"),
};
export { P as CITY };

// ---------------------------------------------------------------- the street wall (Z = 0)
export const HOUSE = { x0: -5.2, x1: 5.2, top: 10.0, floors: [[0.55, 3.4], [3.55, 6.6], [6.72, 9.55]], cols: [-3.75, -1.25, 1.25, 3.75], ww: 1.16 };
export const WIN = { 0: [0.95, 2.65], 1: [4.3, 6.12], 2: [7.4, 9.18] };       // sill → top per floor
export const BUILD = [
  { x0: -16, x1: -5.2, top: 7.6, kind: "sage" },
  { x0: -5.2, x1: 5.2, top: 10.0, kind: "hero" },
  { x0: 5.2, x1: 17, top: 8.6, kind: "blue" },
];
const OPEN = { "1,1.25": "grandma", "2,1.25": "boy" };                           // open windows with residents (floor, column)
export const winRect = (fl, col) => ({ x0: col - HOUSE.ww / 2, x1: col + HOUSE.ww / 2, y0: WIN[fl][0], y1: WIN[fl][1] });
const BALC = [[-3.75, 1], [3.75, 1], [-3.75, 2], [3.75, 2]];                      // balconies (French doors) at the outer columns
const LANTERNS = [[-2.25, 2.55], [2.5, 2.55]];

/** the colour of the hero house at facade point (X, Y), screen (x, y), camera C */
function heroPx(X, Y, x, y, C) {
  const lt = 0.1 * (Y / 10) - 0.06;                                              // warm light grows toward the top (street shade below)
  // quoins at the corners
  const edge = Math.min(X - HOUSE.x0, HOUSE.x1 - X);
  // cornice, string courses
  if (Y > 9.55) {
    if (Y > 9.86) return pk(P.trim, 0.75 + lt, x, y);
    if (Y > 9.82) return pk(P.trim, 0.2, x, y);
    if (Y > 9.68) return pk(P.trim, 0.62 - (9.82 - Y) * 2, x, y);
    const dn = ((X + 20) * 6.25) % 1; return dn < 0.55 ? pk(P.trim, 0.55, x, y) : pk(P.stucco, 0.12, x, y);   // dentils
  }
  if ((Y > 3.4 && Y < 3.55) || (Y > 6.6 && Y < 6.72)) { const top = Y > 6.6 ? 6.72 : 3.55, u = (top - Y) / 0.13; return pk(P.trim, u < 0.25 ? 0.85 : u > 0.82 ? 0.15 : 0.55 + lt, x, y); }
  if ((Y > 3.32 && Y <= 3.4) || (Y > 6.52 && Y <= 6.6)) return pk(P.stucco, 0.12, x, y);                     // shadow under the courses
  if (Y < 0.55) { const row = Math.floor(Y / 0.275), bx = ((X + 20 + (row % 2) * 0.3) / 0.6) % 1, by = (Y / 0.275) % 1; if (bx < 0.04 || by < 0.06) return pk(P.plinth, 0.12, x, y); return pk(P.plinth, 0.45 + 0.25 * h2(Math.floor((X + 20 + (row % 2) * 0.3) / 0.6), row, 3) - 0.3 * by, x, y); }
  // which window column / floor
  const fl = Y < 3.4 ? 0 : Y < 6.6 ? 1 : 2;
  let col = null, dx = 9; for (const cx of HOUSE.cols) { const q = X - cx; if (Math.abs(q) < Math.abs(dx)) { dx = q; col = cx; } }
  const hw = HOUSE.ww / 2, [s0, s1] = WIN[fl], isBal = BALC.some(([bc, bf]) => bc === col && bf === fl), isDoor = fl === 0 && col === -1.25;
  const wy0 = isBal ? s0 - 0.65 : isDoor ? 0.55 : s0, wy1 = isDoor ? 2.85 : s1, whw = isDoor ? 0.66 : hw;
  // lintel with keystone above the opening, sill below
  if (Math.abs(dx) < whw + 0.1 && Y > wy1 && Y < wy1 + 0.16) { const key = Math.abs(dx) < 0.09; return pk(P.trim, (key ? 0.85 : 0.6) + lt - (Y - wy1 < 0.03 ? 0.4 : 0), x, y); }
  if (!isDoor && !isBal && Math.abs(dx) < hw + 0.09 && Y < wy0 && Y > wy0 - 0.09) return pk(P.trim, Y > wy0 - 0.025 ? 0.9 : 0.5 + lt, x, y);
  if (!isDoor && !isBal && Math.abs(dx) < hw + 0.07 && Y <= wy0 - 0.09 && Y > wy0 - 0.15) return pk(P.stucco, 0.1, x, y);          // sill shadow
  // shutters on the upper floors
  if (fl > 0 && !isBal && Math.abs(dx) > hw + 0.04 && Math.abs(dx) < hw + 0.42 && Y > wy0 && Y < wy1) {
    const u = (Math.abs(dx) - hw - 0.04) / 0.38, slat = ((Y - wy0) / 0.075) % 1;
    if (u < 0.06 || u > 0.94 || (Y - wy0) < 0.05 || (wy1 - Y) < 0.05) return pk(P.shutter, 0.15, x, y);
    return pk(P.shutter, slat < 0.3 ? 0.25 : 0.62 + lt, x, y);
  }
  if (Math.abs(dx) < whw && Y >= wy0 && Y <= wy1) return openingPx(X - col, Y, wy0, wy1, whw, fl, col, isDoor, isBal, x, y, C, X);
  // wall: rusticated ground floor or smooth stucco, quoins near the corners
  if (edge < 0.5 && fl > 0) { const q = Math.floor((Y - 3.55) / 0.42), wq = q % 2 ? 0.32 : 0.48, by = ((Y - 3.55) / 0.42) % 1; if (edge < wq) return pk(P.trim, by < 0.08 ? 0.2 : 0.6 + lt, x, y); }
  if (fl === 0) { const g = ((Y - 0.55) / 0.36) % 1; if (g < 0.07) return pk(P.rust, 0.12, x, y); return pk(P.rust, 0.55 + lt + 0.06 * (rnd(Math.floor(X * 9) * 31 + Math.floor(Y * 9)) - 0.5) - (g > 0.85 ? 0.12 : 0), x, y); }
  return pk(P.stucco, 0.56 + lt + 0.08 * (rnd(Math.floor(X * 7) * 131 + Math.floor(Y * 7)) - 0.5), x, y);
}
/** inside a window / door / French door: frame, mullion, transom, reveals, glass with a lit room and curtains (or the open sash) */
function openingPx(dx, Y, y0, y1, hw, fl, col, isDoor, isBal, x, y, C, X) {
  const W = 2 * hw, u = (dx + hw) / W, v = (Y - y0) / (y1 - y0), fr = 0.07;
  // reveals: the recessed jamb on the side away from the camera, the soffit above
  const rw = clamp01(Math.abs(0.14 * (C.x - X) / C.d) / W) * Math.sign(C.x - X), rt = clamp01((0.14 * (y1 - C.h)) / C.d / (y1 - y0));
  if (rw > 0 && u < rw * 1.2) return pk(P.stucco, 0.22, x, y);
  if (rw < 0 && u > 1 + rw * 1.2) return pk(P.stucco, 0.3, x, y);
  if (rt > 0 && v > 1 - rt * 1.2) return pk(P.stucco, 0.08, x, y);
  if (isDoor) {
    const ex = Math.abs(dx), arch = Y > y1 - 0.5;
    if (ex > hw - 0.07 || (Y > y1 - 0.08)) return pk(P.wood, 0.15, x, y);
    if (arch) return Math.abs(dx) < 0.03 ? pk(P.wood, 0.2, x, y) : pk(P.room, 0.62 + 0.1 * (1 - (y1 - Y) / 0.5), x, y);
    if (Math.abs(dx) < 0.025 || Math.abs(Y - (y1 - 0.53)) < 0.03) return pk(P.wood, 0.1, x, y);
    const pu = ((ex) / (hw - 0.07)), pv = (Y - y0) / (y1 - 0.5 - y0), panel = (pu > 0.18 && pu < 0.85) && ((pv > 0.1 && pv < 0.42) || (pv > 0.52 && pv < 0.9));
    return pk(P.wood, panel ? 0.68 - 0.3 * pu : 0.45, x, y);
  }
  const key = OPEN[`${fl},${col}`];
  if (u < fr / W || u > 1 - fr / W || v < 0.03 || v > 1 - fr / (y1 - y0)) return pk(P.frame, 0.7 - (v < 0.03 ? 0.4 : 0), x, y);
  if (key) { // an open window: dark-warm room, the inner sash folded to the right
    if (u > 0.82) return pk(P.frame, 0.55, x, y);
    return pk(P.room, 0.18 + 0.32 * v + 0.12 * Math.sin(u * 3), x, y);
  }
  if (Math.abs(u - 0.5) < 0.025 || (Math.abs(v - 0.72) < 0.018 && !isBal)) return pk(P.frame, 0.6, x, y);
  // glass: lit room (warm) or dark (sky reflection); curtains at the sides
  const n = h2(Math.round(col * 4), fl, 7), lit = n > 0.22 || isBal, cu = P.curt[Math.floor(n * 3.99)];
  if (lit) {
    const side = Math.min(u, 1 - u);
    if (side < 0.17 + 0.05 * Math.sin(v * 20)) return pk(cu, 0.35 + 0.4 * Math.sin(v * 31 + u * 9) * 0.5 + 0.2 * (1 - side * 4), x, y);
    if (v > 0.92) return pk(cu, 0.5, x, y);
    const lamp = 1 - Math.min(1, Math.hypot((u - (0.3 + 0.4 * n)) * 1.4, v - 0.7) * 1.6);
    return pk(P.room, 0.32 + 0.5 * lamp + 0.1 * v, x, y);
  }
  const refl = ((u * 1.3 + v) % 0.5) < 0.08 ? 0.35 : 0;
  return pk(P.dark, 0.25 + 0.4 * v + refl, x, y);
}
/** the sage cafe house on the left */
function sagePx(X, Y, x, y) {
  const lt = 0.1 * (Y / 8) - 0.05;
  if (Y > 7.25) return Y > 7.45 ? pk(P.trim, 0.72, x, y) : pk(P.trim, Y > 7.4 ? 0.2 : 0.55, x, y);
  if (Y < 0.45) return pk(P.plinth, 0.4, x, y);
  if (Y < 3.3) { // cafe front: big lit window, door
    if (X > -11.8 && X < -6.0 && Y > 0.5 && Y < 2.9) { const u = (X + 11.8) / 5.8, v = (Y - 0.5) / 2.4; if (((u * 5.8) % 1.45) < 0.06 || v < 0.03 || v > 0.97) return pk(P.iron, 0.5, x, y); return pk(P.room, 0.42 + 0.35 * v + 0.12 * Math.sin(u * 17), x, y); }
    return pk(P.sage, 0.4 + lt, x, y);
  }
  if (Y > 3.3 && Y < 3.42) return pk(P.trim, 0.6, x, y);
  for (const cx of [-13.4, -10.9, -8.4, -6.4]) { const dx = X - cx; if (Math.abs(dx) < 0.5 && Y > 4.3 && Y < 6.3) { const u = (dx + 0.5), v = (Y - 4.3) / 2; if (u < 0.07 || u > 0.93 || v < 0.04 || v > 0.96 || Math.abs(u - 0.5) < 0.03) return pk(P.frame, 0.55, x, y); return h2(Math.round(cx), 3, 1) > 0.4 ? pk(P.room, 0.4 + 0.4 * v, x, y) : pk(P.dark, 0.3 + 0.4 * v, x, y); }
    if (Math.abs(dx) < 0.62 && Y > 4.18 && Y <= 4.3) return pk(P.trim, 0.6, x, y); }
  return pk(P.sage, 0.55 + lt + 0.06 * (rnd(Math.floor(X * 7) * 17 + Math.floor(Y * 7)) - 0.5), x, y);
}
/** the blue-grey house on the right */
function bluePx(X, Y, x, y) {
  const lt = 0.1 * (Y / 9) - 0.05;
  if (Y > 8.2) return Y > 8.45 ? pk(P.trim, 0.7, x, y) : pk(P.blueW, 0.15, x, y);
  if (Y < 0.5) return pk(P.plinth, 0.35, x, y);
  if (X < 5.45) return pk(P.iron, 0.5, x, y);                                     // drainpipe at the party wall
  const fl = Y < 2.9 ? 0 : Y < 5.6 ? 1 : 2, s0 = [1.0, 3.8, 6.5][fl];
  for (const cx of [6.6, 8.6, 10.6, 12.6, 14.6]) { const dx = X - cx; if (Math.abs(dx) < 0.45 && Y > s0 && Y < s0 + 1.7) { const u = dx + 0.45, v = (Y - s0) / 1.7; if (u < 0.06 || u > 0.84 || v < 0.04 || v > 0.95 || Math.abs(u - 0.45) < 0.03) return pk(P.frame, 0.55, x, y); return h2(Math.round(cx), fl, 2) > 0.35 ? pk(P.room, 0.35 + 0.45 * v, x, y) : pk(P.dark, 0.3 + 0.35 * v, x, y); }
    if (Math.abs(dx) < 0.55 && Y > s0 - 0.1 && Y <= s0) return pk(P.trim, 0.6, x, y); }
  return pk(P.blueW, 0.56 + lt + 0.06 * (rnd(Math.floor(X * 7) * 23 + Math.floor(Y * 7)) - 0.5), x, y);
}

// ---------------------------------------------------------------- sky, far city, roofs
function skyPx(C, x, y) {
  const e = (C.hy - (y + 0.5)) / C.f;                                               // ~elevation (tan)
  let col;
  if (e < 0.0) col = P.haze;
  else { const u = Math.min(1, e / 0.55), k = u < 0.06 ? u / 0.06 : 1;
    const a = u < 0.06 ? mixA(P.haze, P.glow, k) : u < 0.25 ? mixA(P.glow, P.skyLo, (u - 0.06) / 0.19) : u < 0.55 ? mixA(P.skyLo, P.skyMid, (u - 0.25) / 0.3) : mixA(P.skyMid, P.skyHi, (u - 0.55) / 0.45);
    col = a; }
  // cloud streaks at fixed elevations, slow drift with the camera X
  if (e > 0.07 && e < 0.5) { const band = Math.sin(e * 46) , q = band > 0.82 ? (band - 0.82) / 0.18 : 0; if (q > 0) { const xx = (x - 270) / C.f + C.x * 0.004 + e * 3, ln = Math.sin(xx * 9 + Math.floor(e * 46 / 6.28) * 2.1) + Math.sin(xx * 23) * 0.4; if (ln > 0.15) return pk(P.cloud, 0.25 + q * 0.5 + (1 - e * 2) * 0.3, x, y); } }
  return quant(col, x, y);
}
const mixA = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const quant = (c, x, y) => { const b = BY[(y & 3) * 4 + (x & 3)] - 0.5; return [Math.round((c[0] + b * 10) / 6) * 6, Math.round((c[1] + b * 10) / 6) * 6, Math.round((c[2] + b * 10) / 6) * 6]; };
/** far city silhouettes on plane Zp (heights from a hash per lot), lit windows */
function farCity(c, C, Zp, ramp, seed, hmin, hmax, lotW) {
  const k = C.k(Zp); if (k <= 0) return;
  const gy = C.sy(0, Zp);
  for (let x = 0; x < c.w; x++) {
    const X = C.x + (x + 0.5 - 270) / k, lot = Math.floor(X / lotW), hh = hmin + (hmax - hmin) * Math.pow(rnd(lot * 7 + seed), 1.7), tower = rnd(lot * 13 + seed) > 0.86 ? 1.8 : 1, H = hh * tower;
    const yTop = Math.max(0, Math.round(C.sy(H, Zp))), yb = Math.min(c.h, Math.round(gy));
    for (let y = yTop; y < yb; y++) {
      const Y = C.h - (y + 0.5 - C.hy) / k, wx = ((X / 2.2) % 1 + 1) % 1, wy = (Y / 3.1) % 1, litW = wx > 0.35 && wx < 0.65 && wy > 0.3 && wy < 0.7 && rnd(Math.floor(X / 2.2) * 31 + Math.floor(Y / 3.1) * 7 + seed) > 0.62;
      put(c, x, y, litW && k > 3 ? pk(P.lit, 0.4 + 0.3 * rnd(Math.floor(X / 2.2) + seed), x, y) : pk(ramp, 0.3 + 0.5 * (1 - Y / (H + 1)) * 0 + (x - 270 > 0 ? 0 : 0) + 0.4 * Math.min(1, Y / (H)), x, y));
    }
  }
}
/** flat roofs (plane Y = top, Z −9..0) seen from above */
function roofs(c, C) {
  for (const b of BUILD) {
    if (C.h <= b.top) continue;
    const k0 = C.k(0), yFront = C.sy(b.top, 0), yBack = C.sy(b.top, -9);
    for (let y = Math.max(0, Math.floor(yBack)); y < Math.min(c.h, Math.ceil(yFront)); y++) {
      const Z = C.planeZ(y, b.top); if (Z === null || Z > 0 || Z < -9) continue;
      const k = C.k(Z), xa = Math.max(0, Math.round(C.sx(b.x0, Z))), xb = Math.min(c.w, Math.round(C.sx(b.x1, Z)));
      for (let x = xa; x < xb; x++) { const X = C.x + (x + 0.5 - 270) / k; let v = 0.4 + 0.15 * (h2(Math.floor(X * 3), Math.floor(Z * 3), 5) - 0.5); if (((X + 30) % 3) < 0.05) v -= 0.2; if (Z > -0.28) { put(c, x, y, pk(P.roofEdge, 0.7, x, y)); continue; } put(c, x, y, pk(P.roof, v, x, y)); }
    }
  }
  // roof furniture on the hero house: two chimneys, an aerial, a vent box
  if (C.h > 10.0) {
    const box = (X0, X1, H0, H1, Z0, Z1, ramp) => box3(c, C, X0, X1, H0, H1, Z0, Z1, { front: (x, y) => pk(ramp, 0.55, x, y), top: (x, y) => pk(ramp, 0.85, x, y), side: (x, y) => pk(ramp, 0.25, x, y) });
    box(-3.4, -2.6, 10, 11.2, -4.4, -3.6, P.brick); box(2.4, 3.1, 10, 11.0, -6.0, -5.3, P.brick); box(-0.6, 0.6, 10, 10.5, -2.4, -1.4, P.curb);
    for (const [X0, Z0] of [[-3.4, -4.4], [2.4, -6.0]]) box3(c, C, X0 - 0.06, X0 + 0.86, 11.2 - (X0 > 0 ? 0.2 : 0), 11.32 - (X0 > 0 ? 0.2 : 0), Z0 - 0.06, Z0 + 0.86, { front: (x, y) => pk(P.plinth, 0.6, x, y), top: (x, y) => pk(P.plinth, 0.8, x, y), side: (x, y) => pk(P.plinth, 0.3, x, y) });
    const [ax, ay] = C.P(1.6, 10, -7), [bx, by] = C.P(1.6, 12.4, -7); c.line(R(ax), R(ay), R(bx), R(by), "#24202E");
    for (const [w, hgt] of [[0.7, 12.2], [0.5, 11.8]]) { const [p0, q0] = C.P(1.6 - w, hgt, -7), [p1, q1] = C.P(1.6 + w, hgt, -7); c.line(R(p0), R(q0), R(p1), R(q1), "#24202E"); }
  }
}

// ---------------------------------------------------------------- the street wall + 3D trims
function facade(c, C) {
  const k = C.k(0), yb = Math.min(c.h, Math.ceil(C.sy(0, 0)));
  for (let y = 0; y < yb; y++) {
    const Y = C.h - (y + 0.5 - C.hy) / k; if (Y < 0) continue;
    for (let x = 0; x < c.w; x++) {
      const X = C.x + (x + 0.5 - 270) / k;
      let col = null;
      if (X >= HOUSE.x0 && X < HOUSE.x1) { if (Y <= HOUSE.top) col = heroPx(X, Y, x, y, C); }
      else if (X < HOUSE.x0) { if (Y <= BUILD[0].top) col = sagePx(X, Y, x, y); }
      else if (Y <= BUILD[2].top) col = bluePx(X, Y, x, y);
      if (col) put(c, x, y, col);
    }
  }
}
/** balconies, the cafe awning, wall lanterns and their glow (3D, after the facade) */
function wallThings(c, C, t) {
  // lantern glow on the wall (drawn first)
  for (const [X, Y] of LANTERNS) { const [x, y] = C.P(X, Y, 0.18), r = 1.1 * C.k(0); if (x < -r || x > c.w + r) continue;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const q = Math.hypot(i, j * 1.15) / r; if (q < 1) tint(c, R(x + i), R(y + j), P.lampH, 0.42 * (1 - q) ** 1.6, 4); } }
  // balconies: slab, iron railing, flower box
  for (const [cx, fl] of BALC) {
    const Yf = fl === 1 ? 3.62 : 6.78, X0 = cx - 0.9, X1 = cx + 0.9, Zf = 0.85;
    box3(c, C, X0, X1, Yf - 0.16, Yf, 0, Zf, { front: (x, y) => pk(P.trim, 0.55, x, y), top: (x, y) => pk(P.trim, 0.8, x, y), bottom: (x, y) => pk(P.stucco, 0.1, x, y), side: (x, y) => pk(P.trim, 0.35, x, y) });
    // railing: posts and a top rail on the front + sides
    const rail = (pts, col) => { const [a, b] = pts.map((p) => C.P(...p)); c.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), col); };
    const kz = C.k(Zf), step = 0.12, ironC = "#26202E";
    for (let X = X0 + 0.03; X <= X1; X += step) { const [a, b] = [C.P(X, Yf, Zf), C.P(X, Yf + 1.0, Zf)]; const w = Math.max(1, R(0.025 * kz)); for (let q = 0; q < w; q++) c.line(R(a[0]) + q, R(a[1]), R(b[0]) + q, R(b[1]), ironC); }
    box3(c, C, X0 - 0.03, X1 + 0.03, Yf + 0.96, Yf + 1.04, Zf - 0.04, Zf + 0.04, { front: (x, y) => pk(P.iron, 0.55, x, y), top: (x, y) => pk(P.iron, 0.8, x, y), side: (x, y) => pk(P.iron, 0.3, x, y) });
    for (const Xs of [X0, X1]) for (let Z = 0.05; Z < Zf; Z += step) { const [a, b] = [C.P(Xs, Yf, Z), C.P(Xs, Yf + 1.0, Z)]; c.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), ironC); }
    flowerBox(c, C, X0 + 0.1, X1 - 0.1, Yf + 1.04, Zf - 0.12, Zf + 0.12, 13 + fl * 3 + cx, t);
  }
  // flower boxes on some window sills
  for (const [fl, col] of [[1, 1.25], [2, -1.25], [1, -1.25], [2, 1.25], [0, 3.75]]) { const r = winRect(fl, col); flowerBox(c, C, r.x0 - 0.02, r.x1 + 0.02, r.y0, 0.02, 0.24, fl * 7 + col, t); }
  // wall lanterns
  for (const [X, Y] of LANTERNS) {
    box3(c, C, X - 0.03, X + 0.03, Y + 0.2, Y + 0.24, 0, 0.2, { front: (x, y) => pk(P.iron, 0.4, x, y), top: (x, y) => pk(P.iron, 0.6, x, y), side: (x, y) => pk(P.iron, 0.3, x, y) });
    box3(c, C, X - 0.11, X + 0.11, Y - 0.2, Y + 0.18, 0.08, 0.3, { front: (x, y) => { const [lx] = C.P(X, Y, 0.3), dd = Math.abs(x - lx) / (0.11 * C.k(0.3)); return dd > 0.82 ? pk(P.iron, 0.4, x, y) : pk(P.lamp, 0.95 - dd * 0.7, x, y); }, top: (x, y) => pk(P.iron, 0.65, x, y), side: (x, y) => pk(P.lamp, 0.35, x, y) });
    box3(c, C, X - 0.15, X + 0.15, Y + 0.18, Y + 0.26, 0.05, 0.33, { front: (x, y) => pk(P.iron, 0.45, x, y), top: (x, y) => pk(P.iron, 0.75, x, y), side: (x, y) => pk(P.iron, 0.25, x, y) });
  }
  // cafe awning (sloped, striped)
  { const X0 = -12.0, X1 = -5.8; quad(c, C, [[X0, 3.0, 0], [X1, 3.0, 0], [X1, 2.45, 1.5], [X0, 2.45, 1.5]], (x, y) => { const X = C.wX(x, 0.75); return ((Math.floor((X + 40) / 0.45)) % 2 ? pk(P.awn, 0.7, x, y) : pk(P.awnL, 0.6, x, y)); });
    quad(c, C, [[X0, 2.45, 1.5], [X1, 2.45, 1.5], [X1, 2.2, 1.5], [X0, 2.2, 1.5]], (x, y) => { const X = C.wX(x, 1.5); return ((Math.floor((X + 40) / 0.45)) % 2 ? pk(P.awn, 0.45, x, y) : pk(P.awnL, 0.35, x, y)); }); }
}
/** a planter / window box with geraniums and leaves (deterministic clumps) */
function flowerBox(c, C, X0, X1, Yb, Z0, Z1, seed, t) {
  box3(c, C, X0, X1, Yb, Yb + 0.2, Z0, Z1, { front: (x, y) => pk(P.box, 0.55, x, y), top: (x, y) => pk(P.box, 0.2, x, y), side: (x, y) => pk(P.box, 0.3, x, y) });
  const n = Math.max(3, Math.round((X1 - X0) / 0.11)), Zm = (Z0 + Z1) / 2, k = C.k(Zm);
  for (let i = 0; i < n; i++) {
    const X = X0 + ((i + 0.5) / n) * (X1 - X0), sway = 0.01 * Math.sin(t * 1.3 + i), hgt = 0.12 + 0.12 * rnd(i * 7 + seed * 13), [x, y] = C.P(X + sway, Yb + 0.2 + hgt, Zm), r = Math.max(1.2, 0.075 * k);
    const [lx, ly] = C.P(X, Yb + 0.2 + hgt * 0.4, Zm + 0.03); c.ellipse(R(lx), R(ly), Math.max(1, R(r * 1.1)), Math.max(1, R(r * 0.8)), pk(P.leaf, 0.4 + 0.3 * rnd(i + seed), R(lx), R(ly)));
    if (rnd(i * 3 + seed) > 0.25) { const fl2 = rnd(i * 5 + seed) > 0.75 ? P.flower2 : P.flower; for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let q = -Math.ceil(r); q <= Math.ceil(r); q++) { const d2 = (q * q + j * j) / (r * r); if (d2 < 1) put(c, R(x + q), R(y + j), pk(fl2, 0.9 - d2 * 0.6 - (q + j) / (4 * r), R(x + q), R(y + j))); } }
  }
}

// ---------------------------------------------------------------- the ground: pavement, curb, gutter, road
function ground(c, C, t) {
  const y0 = Math.max(0, Math.floor(C.sy(0, 0)));
  for (let y = y0; y < c.h; y++) {
    const Z = C.planeZ(y, 0); if (Z === null || Z < 0) continue;
    const k = C.k(Z);
    for (let x = 0; x < c.w; x++) {
      const X = C.x + (x + 0.5 - 270) / k;
      let col;
      if (Z < 0.28) { const bx = ((X + 40) / 0.14) + (Math.floor(Z / 0.14) % 2) * 0.5, by = Z / 0.14; col = (bx % 1 < 0.12 || by % 1 < 0.14) ? P.cob[0] : pk(P.cob, 0.45 + 0.4 * h2(Math.floor(bx), Math.floor(by), 9), x, y); }
      else if (Z < 4.4) { const sx = (X + 40) / 0.6 + (Math.floor((Z - 0.28) / 0.6) % 2) * 0.5, sz = (Z - 0.28) / 0.6, ix = Math.floor(sx), iz = Math.floor(sz), jx = sx % 1, jz = sz % 1, jw = 0.02 / 0.6 * Math.max(1, 30 / k);
        col = (jx < jw || jz < jw * 1.2) ? P.pave[0] : pk(P.pave, 0.5 + 0.14 * (h2(ix, iz, 4) - 0.5) - 0.12 * jz + 0.05 * (1 - Z / 4.4), x, y); }
      else if (Z < 4.62) col = pk(P.curb, Z < 4.46 ? 0.85 : 0.5, x, y);
      else if (Z < 4.86) { const gx = ((X + 40) / 4.5) % 1; col = gx < 0.12 && Z > 4.66 && Z < 4.84 ? (((X * 25) % 1) < 0.4 ? P.iron[0] : P.iron[2]) : pk(P.asph, 0.2, x, y); }
      else { const ln = (Z > 5.15 && Z < 5.27) || (Z > 9.1 && Z < 9.24 && ((X + 40) % 3) < 1.6), bay = Z > 5.27 && Z < 7.2 && ((X + 40) % 5.5) < 0.12;
        col = ln || bay ? pk(P.line, 0.6, x, y) : pk(P.asph, 0.45 + 0.18 * (h2(Math.floor(X * 6), Math.floor(Z * 6), 11) - 0.5), x, y); }
      put(c, x, y, col);
    }
  }
  // lantern light pools on the pavement
  for (const [X] of LANTERNS) { const [x, y] = C.P(X, 0, 0.6), rx = 1.4 * C.k(0.6); if (y > c.h + 20 || x < -rx || x > c.w + rx) continue; const ry = Math.max(4, rx * 0.25);
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) { const q = Math.hypot(i / rx, j / ry); if (q < 1) tint(c, R(x + i), R(y + j), P.lampH, 0.28 * (1 - q), 4); } }
}

/** The whole street at camera C (everything except the movable props, people and Mario). */
export function drawCity(c, C, t) {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) put(c, x, y, skyPx(C, x, y));
  farCity(c, C, -95, P.far1, 3, 8, 34, 9);
  farCity(c, C, -40, P.far2, 5, 6, 14, 7);
  roofs(c, C);
  facade(c, C);
  wallThings(c, C, t);
  ground(c, C, t);
}
/** a brick planter on the pavement (X0..X1, Z0..Z1, height 0.6) with flowers */
export function planter(c, C, X0, X1, Z0, Z1, t) {
  const brick = (Xa, Ya, Za, face) => (x, y) => { const X = face === "side" ? Za : C.wX(x, Z1), Y = C.wY(y, face === "side" ? (Z0 + Z1) / 2 : Z1), row = Math.floor(Y / 0.075), bx = ((X + 40 + (row % 2) * 0.11) / 0.22) % 1, by = (Y / 0.075) % 1; return bx < 0.06 || by < 0.14 ? P.mort[0] : pk(P.brick, 0.5 + 0.3 * h2(Math.floor((X + 40 + (row % 2) * 0.11) / 0.22), row, 2) - 0.2 * by, x, y); };
  box3(c, C, X0, X1, 0, 0.6, Z0, Z1, { front: brick(0, 0, 0, "front"), top: (x, y) => pk(P.trim, 0.55, x, y), side: (x, y) => pk(P.brick, 0.25, x, y) });
  flowerBox(c, C, X0 + 0.06, X1 - 0.06, 0.42, Z0 + 0.1, Z1 - 0.1, 41, t);
}
export { flowerBox };
