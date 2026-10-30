// sonic-real · our hilly seaside city in the afternoon (new, 2026-10-30, drawn for this film; nothing from the Mario or Pac-Man
// films or the catalog). Fine «32-bit» pixels through the pinhole camera of lib/cam.mjs (3/4 high angle, full 9:16 frame). World
// in metres: X along the street (→), Y up, Z toward the camera.
//   Back to front: terraced pastel houses (Z −9: shop floors with awnings, shuttered windows, balconies, cornices) → a narrow
//   back pavement → a two-lane road with traffic (Z −8 … −4.2) → granite kerb → the seaside promenade in black-and-white wave
//   cobbles (Z −3.9 … 4.6; Sonic's lane ZM = 2.2) with lamps, palm planters and benches.
//   Ground height is a pure function of X: flat promenade, then a steep street (30 %) climbing X 48 → 70 to a 7 m terrace; the
//   houses step up the hill and the road and promenade climb with it.
//   The square (X < −38): no road; light plaza stone, a skatepark (quarter pipe, fun box, rail), a garden wall with trees, a
//   two-story house (X −70.5 … −64.5, front Z −6.5) and, on «add», the 6 m loop (built by props.mjs/scene.mjs at LX −60, LZ −6.5).
//   Far behind: a painted hill of the old town and the afternoon sky (only in wide shots).
//   The electronics kiosk with two TVs in its window (X 36 … 42, front Z −1.6) stands on the promenade near the hill foot.
// Afternoon light from the front-left: warm facades, soft shadows to the right. Ramps + ordered dither; pure functions of (cam, t).
import { hex } from "../../../../../renderer/pixel/raster.mjs";
import { R, RG, pk, put, tint, quad, box3, rnd, h2, clamp01, lerp, BY } from "../lib/cam.mjs";

export const CT = { ZF: -9.0, ZR0: -8.0, ZR1: -4.2, ZK: -3.9, ZM: 2.2, ZE: 4.6, HF: 48, HT: 70, HH: 7, SQ: -38, LX: -60, LZ: -6.5, KX0: 36, KX1: 42, KZ: -1.6 };
/** ground height (m) at X */
export const gY = (X) => (X <= CT.HF ? 0 : X >= CT.HT ? CT.HH : (X - CT.HF) * (CT.HH / (CT.HT - CT.HF)));
export const SLOPE = CT.HH / (CT.HT - CT.HF);
export const P = {
  sky: RG(["#5C9CE8", "#7EB4F0", "#A6CCF4", "#D2E2F2", "#F4E6CC"]),
  hillFar: RG(["#8C9AB4", "#A2AEC4", "#B8C2D2"]), roofFar: RG(["#B4786A", "#C8907E"]), wallFar: RG(["#D8D2C8", "#EAE4D8"]),
  walls: [RG(["#C49A6A", "#DDB888", "#EED0A2", "#F8E2BC", "#FFF2DA"]), RG(["#C07E70", "#D89A8A", "#EAB6A4", "#F6CEBE", "#FFE4D8"]), RG(["#7EA2B0", "#98BAC6", "#B2CED8", "#CCE0E6", "#E6F0F2"]),
    RG(["#98AE84", "#B2C69C", "#C8D8B4", "#DCE8CC", "#EEF6E2"]), RG(["#D0A84E", "#E4C068", "#F0D488", "#F8E4AA", "#FFF2CC"]), RG(["#A894B4", "#BEACC8", "#D2C2DA", "#E4D8EA", "#F4EEF6"])],
  trim: RG(["#B8AC98", "#D4CAB6", "#ECE4D2", "#FCF8EE"]), glass: RG(["#243042", "#34445C", "#4C607C", "#7088A6", "#A8C0D8"]), glassWarm: RG(["#3A3226", "#5A4A32", "#8A7048", "#C8A464"]),
  shut: [RG(["#2C5C4A", "#3C7A62", "#56987E", "#7AB89C"]), RG(["#2E4C7C", "#40669C", "#5A84B8", "#80A6D2"]), RG(["#7C3A30", "#9C5040", "#BC6C58", "#D88C76"])],
  iron: RG(["#1E1C24", "#2E2A34", "#46404E", "#5E5868"]), tile: RG(["#8A3E2A", "#A8523A", "#C46A4C", "#DC8A68"]),
  awn: [[hex("#D84A3A"), hex("#F6EEE0")], [hex("#2E7A9A"), hex("#F2F0E6")], [hex("#E0A030"), hex("#FAF2DC")], [hex("#4C8A48"), hex("#F2EEE0")]],
  stone: RG(["#A89C8C", "#C0B4A2", "#D6CCBA", "#E8E0D0", "#F6F0E4"]), cobW: RG(["#D8D2C6", "#E8E4DA", "#F6F4EE"]), cobB: RG(["#3A3844", "#4C4A56", "#5E5C68"]),
  asph: RG(["#3A3A44", "#474752", "#555560", "#64646E", "#74747E"]), line: RG(["#CFCBBE", "#EEEADD", "#FFFFF4"]), curb: RG(["#7E7C82", "#A2A0A4", "#C4C2C2", "#E2E0DA"]),
  plaza: RG(["#B4A894", "#CABFAB", "#DCD2C0", "#EAE2D4", "#F6F0E6"]), plazaB: RG(["#9C8E7A", "#B0A28C"]), concrete: RG(["#8E9098", "#A8AAB2", "#C2C4CA", "#D8DADE", "#EEEFF2"]),
  pole: RG(["#24303A", "#34444E", "#4C5E6A", "#6C808C"]), leaf: RG(["#24502A", "#346E34", "#4C8E40", "#6EAE52", "#9ACC6C"]), trunk: RG(["#5A4030", "#7A5A40", "#9A7656", "#B8946E"]),
  pot: RG(["#7E6A58", "#9A8470", "#B4A08A", "#CCBAA2"]), wood: RG(["#5A3A26", "#7A5236", "#9A6C48", "#B88A5E"]), graffiti: RG(["#E05A8A", "#46B8D8", "#F0C040"]),
  shade: hex("#3E3650"),
};
// ---------------------------------------------------------------- the house row (procedural, hashed per house index)
export const HOUSES = (() => {
  const out = []; let X = -130, i = 0;
  while (X < 150) {
    const w = 5.2 + Math.round(rnd(i * 13 + 1) * 4) * 0.8, inSquare = X + w > -96 && X < CT.SQ;
    if (!inSquare) { const onHill = X > CT.HF - 4, fl = onHill ? 3 + Math.floor(rnd(i * 7 + 2) * 2) : 2 + Math.floor(rnd(i * 7 + 2) * 3);
      out.push({ i, X0: X, X1: X + w, fl, wall: Math.floor(rnd(i * 5 + 3) * 6), shut: Math.floor(rnd(i * 3 + 4) * 3), awn: Math.floor(rnd(i * 11 + 5) * 4), shop: rnd(i * 17 + 6) < 0.72, balc: rnd(i * 19 + 7) < 0.6 }); }
    X += inSquare ? Math.max(w, CT.SQ - X) : w; i++;
  }
  return out;
})();
const base = (h) => Math.min(gY(h.X0), gY(h.X1));
/** the square's back row: taller houses behind the garden wall and the trees (Z −14) */
export const HOUSES_SQ = (() => { const out = []; let X = -104, i = 200; while (X < CT.SQ + 2) { const w = 6 + Math.round(rnd(i * 13 + 1) * 3) * 0.8; out.push({ i, X0: X, X1: X + w, fl: 2 + Math.floor(rnd(i * 7 + 2) * 2), wall: Math.floor(rnd(i * 5 + 3) * 6), shut: Math.floor(rnd(i * 3 + 4) * 3), awn: Math.floor(rnd(i * 11 + 5) * 4), shop: rnd(i * 17 + 6) < 0.5, balc: rnd(i * 19 + 7) < 0.7 }); X += w; i++; } return out; })();
/** facade material at local (u from the left, v above the house base) → rgb | null (sky) */
function facadePx(h, u, v, x, y) {
  const W = h.X1 - h.X0, wall = P.walls[h.wall], H = h.fl * 3.1 + 0.6, top = H + 0.45;
  if (v > top) return null;
  if (v > H) { if (v > H + 0.32) return pk(P.trim, 0.85, x, y); return pk(P.trim, v > H + 0.18 ? 0.55 : 0.25, x, y); }        // cornice
  if (u < 0.12 || u > W - 0.12) return pk(wall, 0.25, x, y);                                                               // party-wall seam
  // ground floor (0 … 3.4 m): shop window + door + awning, or a residential door and a plinth
  if (v < 3.4) {
    if (v < 0.35) return pk(P.stone, 0.35, x, y);
    if (h.shop) {
      if (v > 2.72 && v < 3.18 && u > 0.3 && u < W - 0.3) { const st = Math.floor((u - 0.3) / 0.42) % 2, a = P.awn[h.awn]; return (v < 2.78 || ((v - 2.78) / 0.4 > 0.92 && st)) ? hex("#3A2A2A") : st ? a[0] : a[1]; }
      if (v > 2.6 && v <= 2.72 && u > 0.3 && u < W - 0.3) return P.shade;                                                  // the awning's shadow line
      const door = u > W - 1.55 && u < W - 0.55;
      if (door) { if (v > 2.35) return pk(wall, 0.4, x, y); if (u < W - 1.5 || u > W - 0.6) return pk(P.iron, 0.5, x, y); return pk(P.glassWarm, 0.35 + 0.25 * ((u * 3 + v) % 1 > 0.7 ? 1 : 0), x, y); }
      if (u > 0.45 && u < W - 1.75 && v > 0.55 && v < 2.4) {
        if (u < 0.52 || u > W - 1.82 || v < 0.62 || v > 2.33) return pk(P.iron, 0.6, x, y);
        // goods behind the glass: shelves with blocky colourful items, a warm interior, a sky reflection streak
        const refl = ((u * 1.4 - v * 0.9) % 1.6 + 1.6) % 1.6 < 0.18, shelf = Math.abs(((v - 0.62) % 0.55) - 0.52) < 0.03;
        if (refl) return pk(P.glass, 0.85, x, y); if (shelf) return pk(P.wood, 0.55, x, y);
        const item = h2(Math.floor(u / 0.22), Math.floor((v - 0.62) / 0.55), h.i), iu = (u / 0.22) % 1, iv = ((v - 0.62) / 0.55) % 1;
        if (item > 0.35 && iu > 0.15 && iu < 0.85 && iv > 0.3) return pk(P.walls[Math.floor(item * 6)], 0.3 + iv * 0.5, x, y);
        return pk(P.glassWarm, 0.25 + 0.2 * v / 2.4, x, y);
      }
      return pk(wall, 0.55 + (v > 2.4 ? 0.1 : 0), x, y);
    }
    const dc = W / 2; if (Math.abs(u - dc) < 0.55 && v < 2.4) { if (Math.abs(u - dc) > 0.48 || v > 2.33) return pk(P.trim, 0.4, x, y); return pk(P.wood, 0.35 + 0.15 * (Math.abs(u - dc) < 0.03 ? 0 : 1) + 0.2 * (v > 1.6 && v < 2.1 ? 1 : 0), x, y); }
    if (v > 3.2) return pk(P.trim, 0.6, x, y);
    return pk(wall, 0.5, x, y);
  }
  // upper floors: windows with shutters and sills, iron balconies on some floors
  const fv = (v - 3.4) % 3.1, floor = Math.floor((v - 3.4) / 3.1), nwin = Math.max(2, Math.round(W / 2.0)), cell = W / nwin, cu = (u % cell) - cell / 2;
  if (fv > 3.0) return pk(P.trim, 0.55, x, y);                                                                                  // floor band
  const win = Math.abs(cu) < 0.42 && fv > 0.8 && fv < 2.45, sill = Math.abs(cu) < 0.55 && fv > 0.68 && fv <= 0.8;
  const shutL = cu > -0.78 && cu <= -0.42 && fv > 0.8 && fv < 2.45, shutR = cu >= 0.42 && cu < 0.78 && fv > 0.8 && fv < 2.45;
  const balc = h.balc && (floor + h.i) % 2 === 0 && Math.abs(cu) < 0.72 && fv > 0.0 && fv < 1.05;
  if (balc) { if (fv < 0.1) return pk(P.trim, 0.45, x, y); if (fv > 0.98 || Math.abs((cu * 10) % 1) < 0.18) return pk(P.iron, 0.35 + (fv > 0.98 ? 0.3 : 0), x, y); }
  if (sill) return pk(P.trim, 0.9, x, y);
  if (shutL || shutR) { const sh = P.shut[h.shut], slat = Math.floor(fv / 0.12) % 2; return pk(sh, (slat ? 0.45 : 0.7) + (shutL ? 0.1 : 0), x, y); }
  if (win) { const frame = Math.abs(cu) > 0.37 || fv < 0.86 || fv > 2.39 || Math.abs(cu) < 0.03 || Math.abs(fv - 1.85) < 0.03; if (frame) return pk(P.trim, 0.75, x, y);
    const curtain = h2(floor, Math.floor(u / cell), h.i + 9) > 0.6 && cu > 0.05; return curtain ? pk(P.walls[(h.wall + 2) % 6], 0.65, x, y) : pk(P.glass, 0.35 + 0.45 * (((cu + fv * 0.6) % 0.7 + 0.7) % 0.7 < 0.12 ? 1 : 0) + 0.12 * fv / 2.4, x, y); }
  if (fv > 2.45 && fv < 2.62 && Math.abs(cu) < 0.6) return pk(wall, 0.2, x, y);                                                 // lintel shadow
  return pk(wall, 0.48 + 0.08 * (v / H) + (((x >> 1) + (y >> 2)) % 7 === 0 ? -0.06 : 0), x, y);
}
/** fill the projected rect of a facade-plane box (X0..X1, Y0..Y1 at depth Z) with fn(X, Y, x, y) */
function facade(c, C, X0, X1, Y0, Y1, Z, fn) {
  const [sx0, sy1] = C.P(X0, Y0, Z), [sx1, sy0] = C.P(X1, Y1, Z), k = C.k(Z);
  const xa = Math.max(0, Math.floor(sx0)), xb = Math.min(c.w, Math.ceil(sx1)), ya = Math.max(0, Math.floor(sy0)), yb = Math.min(c.h, Math.ceil(sy1));
  for (let y = ya; y < yb; y++) { const Y = C.h - (y + 0.5 - C.hy) / k; for (let x = xa; x < xb; x++) { const X = C.x + (x + 0.5 - 270) / k, col = fn(X, Y, x, y); if (col) put(c, x, y, col); } }
}
// ---------------------------------------------------------------- sky, far hill of the old town
function drawSky(c, C) {
  for (let y = 0; y < c.h; y++) { const v = clamp01((y - (C.hy - 520)) / 520); for (let x = 0; x < c.w; x++) put(c, x, y, pk(P.sky, v, x, y, 0.8)); }
  // a few flat afternoon clouds
  const k = C.k(-300); for (let i = 0; i < 5; i++) { const cx = C.sx(-200 + i * 95 + rnd(i) * 40, -300), cy = C.sy(60 + rnd(i + 3) * 50, -300), w = (50 + rnd(i + 9) * 60) * k / 1.5, h = w * 0.18;
    for (let y = R(cy - h); y < R(cy + h); y++) for (let x = R(cx - w); x < R(cx + w); x++) { const q = ((x - cx) / w) ** 2 + ((y - cy) / h) ** 2 * (y < cy ? 1 : 3); if (q < 1) tint(c, x, y, hex("#FFF8EC"), 0.75 * (1 - q * 0.5), 4); } }
  // the old town on a far hill rising to the right (Z −140): a silhouette with tiny pastel houses and red roofs
  const ZH = -140, kH = C.k(ZH);
  for (let x = 0; x < c.w; x++) { const X = C.wX(x, ZH), hTop = 30 + Math.max(-20, X + 64) * 0.4 + 6 * Math.sin(X / 23), sy = C.sy(hTop, ZH), syB = C.sy(-2, ZH);
    for (let y = Math.max(0, R(sy)); y < Math.min(c.h, R(syB)); y++) { const Y = C.wY(y, ZH), hx = Math.floor(X / 4.5), hy2 = Math.floor((Y + 100) / 3.6), lu = ((X / 4.5) % 1 + 1) % 1, lv = (((Y + 100) / 3.6) % 1 + 1) % 1, house = h2(hx, hy2, 3) > 0.25 && Y < hTop - 1.2;
      put(c, x, y, house ? (lv > 0.72 ? pk(P.roofFar, lv, x, y) : lu < 0.12 ? pk(P.hillFar, 0.4, x, y) : (lv > 0.3 && lv < 0.55 && lu > 0.3 && lu < 0.5 && kH > 3 ? pk(P.hillFar, 0.1, x, y) : pk(P.wallFar, 0.3 + 0.5 * h2(hx, hy2, 5), x, y))) : pk(P.hillFar, 0.3 + 0.4 * (Y / Math.max(1, hTop)), x, y)); } }
}
// ---------------------------------------------------------------- ground (sloped piecewise plane, per-pixel ray hit)
const PIECES = [[0, 0, -1e9, CT.HF], [-CT.HF * SLOPE, SLOPE, CT.HF, CT.HT], [CT.HH, 0, CT.HT, 1e9]];
/** world point (X, Z) seen at pixel (x, y), or null */
export function groundHit(C, x, y) {
  const f = C.f, u = (x + 0.5 - 270) / f, v = (y + 0.5 - C.hy) / f; let best = null;
  for (const [a, b, xa, xb] of PIECES) { const den = v + b * u; if (den <= 1e-6) continue; const t = (C.h - a - b * C.x) / den; if (t <= 0.05) continue; const X = C.x + u * t; if (X < xa - 1e-6 || X > xb + 1e-6) continue; if (!best || t < best.t) best = { t, X, Z: C.d - t }; }
  return best;
}
function groundCol(X, Z, x, y, t) {
  const sq = X < CT.SQ;
  if (Z < CT.ZF) return null;
  if (!sq && Z < CT.ZR0) return pk(P.stone, 0.55 + ((Math.floor(X / 0.6) + Math.floor(Z / 0.6)) % 2 ? 0.08 : -0.04), x, y);                 // back pavement
  if (!sq && Z < CT.ZR1) {                                                                                                                       // road
    const dash = Math.abs(Z - (CT.ZR0 + CT.ZR1) / 2) < 0.07 && ((X % 3.2) + 3.2) % 3.2 < 1.8;
    if (dash) return pk(P.line, 0.7, x, y);
    const near = Z - CT.ZR0 < 0.25 || CT.ZR1 - Z < 0.25; return pk(P.asph, 0.42 + (near ? -0.1 : 0) + 0.12 * (h2(Math.floor(X * 3), Math.floor(Z * 3), 1) - 0.5), x, y);
  }
  if (!sq && Z < CT.ZK) return pk(P.curb, Z - CT.ZR1 > 0.18 ? 0.85 : 0.45, x, y);                                                              // kerb
  if (sq) {                                                                                                                                        // plaza stone, a rosette and the skatepark slab
    if (X < -82 && Z > -8.6 && Z < -1.0) return pk(P.concrete, 0.55 + 0.1 * (((X * 1.7) % 1 + 1) % 1 < 0.04 || ((Z * 1.7) % 1 + 1) % 1 < 0.04 ? -1 : 0), x, y);
    const gx = ((X % 1.2) + 1.2) % 1.2, gz = ((Z % 1.2) + 1.2) % 1.2, joint = gx < 0.05 || gz < 0.05;
    const ring = Math.abs(Math.hypot(X + 52, (Z + 1) * 1.0) - 3.2) < 0.18; if (ring) return pk(P.plazaB, 0.6, x, y);
    return pk(P.plaza, joint ? 0.3 : 0.6 + 0.1 * (h2(Math.floor(X / 1.2), Math.floor(Z / 1.2), 2) - 0.5), x, y);
  }
  // the promenade: black-and-white wave cobbles (our wave)
  const wave = Math.sin((Z + 0.22 * Math.sin(X * Math.PI / 1.1)) * Math.PI / 0.42), cob = ((Math.floor(X / 0.11) + Math.floor(Z / 0.11) * 3) % 5 === 0);
  if (Z > CT.ZE) return pk(P.stone, 0.4, x, y);
  return wave > 0.72 ? pk(P.cobB, 0.5 + (cob ? -0.3 : 0), x, y) : pk(P.cobW, 0.55 + (cob ? -0.35 : 0), x, y);
}
// ---------------------------------------------------------------- props on the ground
/** a vertical pole from (X, Z) on the ground, height H, radius r metres */
function pole(c, C, X, Z, H, r, RAMP) { const y0 = gY(X); quad(c, C, [[X - r, y0, Z], [X + r, y0, Z], [X + r, y0 + H, Z], [X - r, y0 + H, Z]], (x, y) => pk(RAMP, 0.35 + 0.5 * ((C.wX(x, Z) - X + r) / (2 * r)), x, y)); }
function lamp(c, C, X, Z) {
  pole(c, C, X, Z, 4.6, 0.07, P.pole); const y0 = gY(X);
  box3(c, C, X - 0.16, X + 0.16, y0 + 4.45, y0 + 4.9, Z - 0.16, Z + 0.16, { front: (x, y) => pk(P.pole, 0.6, x, y), side: (x, y) => pk(P.pole, 0.3, x, y), bottom: (x, y) => hex("#FFF2C8") });
  box3(c, C, X - 0.2, X + 0.2, y0 + 4.9, y0 + 4.98, Z - 0.2, Z + 0.2, { front: (x, y) => pk(P.pole, 0.8, x, y), top: (x, y) => pk(P.pole, 0.9, x, y) });
  box3(c, C, X - 0.13, X + 0.13, y0, y0 + 0.35, Z - 0.13, Z + 0.13, { front: (x, y) => pk(P.pole, 0.45, x, y), top: (x, y) => pk(P.pole, 0.7, x, y) });
}
function palmTree(c, C, X, Z, t, seed) {
  const y0 = gY(X); box3(c, C, X - 0.5, X + 0.5, y0, y0 + 0.6, Z - 0.5, Z + 0.5, { front: (x, y) => pk(P.pot, 0.55 + (C.wY(y, Z + 0.5) - y0 > 0.5 ? 0.3 : 0), x, y), top: (x, y) => pk(P.leaf, 0.15, x, y), side: (x, y) => pk(P.pot, 0.3, x, y) });
  const H = 4.6 + rnd(seed) * 0.8, lean = 0.35 * (rnd(seed + 1) - 0.5), k = C.k(Z);
  let topX = 0, topY = 0;
  for (let s = 0; s < 1; s += 0.01) { const X1 = X + lean * s * s, Y1 = y0 + 0.6 + (H - 0.6) * s, [sx, sy] = C.P(X1, Y1, Z), rr = Math.max(1, 0.16 * k * (1 - 0.3 * s));
    for (let i = -Math.ceil(rr); i <= Math.ceil(rr); i++) { const ring = Math.floor(s * 26) % 2; put(c, R(sx + i), R(sy), pk(P.trunk, 0.35 + 0.4 * ((i + rr) / (2 * rr)) - (ring ? 0.12 : 0), R(sx + i), R(sy))); } topX = X1; topY = Y1; }
  // fronds: drooping arcs of leaflets, sway gently
  for (let f = 0; f < 7; f++) { const ang = (f / 7) * Math.PI * 2 + seed, dir = Math.cos(ang), dep = Math.sin(ang) * 0.6, L = 2.0 + 0.4 * rnd(seed + f), sw = 0.06 * Math.sin(t * 1.3 + f);
    for (let s = 0; s <= 1; s += 0.015) { const X1 = topX + dir * L * s, Y1 = topY + 0.5 * s - 1.5 * s * s + sw * s, Z1 = Z + dep * L * s * 0.4, [sx, sy] = C.P(X1, Y1, Z1), w = Math.max(1, 0.28 * C.k(Z1) * Math.sin(Math.PI * Math.min(1, s * 1.2)));
      for (let j = -Math.ceil(w); j <= Math.ceil(w * 0.6); j++) { const xx = R(sx + (j & 1 ? 1 : 0) * dir), yy = R(sy + j); put(c, xx, yy, pk(P.leaf, 0.3 + 0.5 * (1 - Math.abs(j) / (w + 1)) + 0.1 * (dep > 0 ? 1 : 0), xx, yy)); } } }
}
function bench(c, C, X, Z) {
  const y0 = gY(X); box3(c, C, X - 0.9, X + 0.9, y0 + 0.42, y0 + 0.48, Z - 0.22, Z + 0.22, { front: (x, y) => pk(P.wood, 0.4, x, y), top: (x, y) => pk(P.wood, 0.75 + ((y >> 1) % 2 ? 0.1 : 0), x, y) });
  box3(c, C, X - 0.9, X + 0.9, y0 + 0.55, y0 + 0.85, Z - 0.26, Z - 0.2, { front: (x, y) => pk(P.wood, 0.6 + (((C.wY(y, Z - 0.2) - y0) * 10) % 1 < 0.25 ? -0.25 : 0), x, y) });
  for (const dx of [-0.75, 0.75]) box3(c, C, X + dx - 0.04, X + dx + 0.04, y0, y0 + 0.45, Z - 0.2, Z + 0.2, { front: (x, y) => pk(P.iron, 0.4, x, y), side: (x, y) => pk(P.iron, 0.2, x, y) });
}
// ---------------------------------------------------------------- cars (our own little hatchbacks and a van; sheared along the slope)
export const CARS = [RG(["#7A1E24", "#A02C30", "#C8443E", "#E8705E"]), RG(["#1E4A74", "#2C6696", "#4486B8", "#6CA8D4"]), RG(["#B8A07A", "#D2BC94", "#E8D6B2", "#F6EAD0"]), RG(["#2C6A4E", "#3C8A64", "#58A87E", "#80C69C"]), RG(["#E0A024", "#F0BC3E", "#F8D466", "#FFE89A"])];
/** a car centred at Xc on lane Z (centre), body colour ramp, facing dir (±1); o: { L, van, spin (wheel phase) }. Sheared along the slope. */
export function car(c, C, Xc, Z, body, dir = 1, o = {}) {
  const L = o.L ?? 3.9, Wd = 1.72, Zn = Z + Wd / 2, Zf = Z - Wd / 2, G = gY, glass = P.glass;
  const rear = Xc - (L / 2) * dir, front = Xc + (L / 2) * dir, fx = (u) => lerp(rear, front, u), W = (u, y, Zz) => [fx(u), G(fx(u)) + y, Zz];
  const Q = (pts, sh) => quad(c, C, pts, sh);
  const yB = 0.3, yS = 0.88, top = o.van ? 1.82 : 1.46, cr = o.van ? 0.04 : 0.2, cf = o.van ? 0.78 : 0.68, rr = o.van ? 0.05 : 0.28, rf = o.van ? 0.74 : 0.58;
  const lit = (v) => (x, y) => pk(body, v, x, y);
  // the end face the camera sees (rear or front), the hood / trunk tops, the near side
  const endU = (C.x < Math.min(rear, front)) === (dir > 0) ? 0 : 1, endX = fx(endU);
  Q([W(endU, yB, Zf), W(endU, yB, Zn), W(endU, yS, Zn), W(endU, yS, Zf)], (x, y) => { const Y = C.wY(y, Z) - G(endX); return Y < yB + 0.12 ? pk(P.iron, 0.4, x, y) : pk(body, 0.32, x, y); });
  Q([W(0, yS, Zf), W(cr, yS, Zf), W(cr, yS, Zn), W(0, yS, Zn)], lit(0.8)); Q([W(cf, yS, Zf), W(1, yS, Zf), W(1, yS, Zn), W(cf, yS, Zn)], lit(0.82));
  Q([W(0, yB, Zn), W(1, yB, Zn), W(1, yS, Zn), W(0, yS, Zn)], (x, y) => { const X = C.wX(x, Zn), Y = C.wY(y, Zn) - G(X), u = (X - rear) / (front - rear);
    if (Y < yB + 0.12) return pk(P.iron, 0.45, x, y); if (Y > yS - 0.07) return pk(body, 0.9, x, y);
    if (Math.abs(u - (cr + cf) / 2) < 0.006 * 3 / L * 4 || Math.abs(Y - 0.6) < 0.012) return pk(body, 0.25, x, y);
    return pk(body, 0.5 + (Y > 0.7 ? 0.12 : 0), x, y); });
  // cabin: windscreen / back window slopes, the near side glass with a pillar, the roof
  Q([W(cr, yS, Zf + 0.08), W(rr, top, Zf + 0.14), W(rr, top, Zn - 0.14), W(cr, yS, Zn - 0.08)], (x, y) => pk(glass, 0.55 + ((x + y) % 9 < 2 ? 0.3 : 0), x, y));
  Q([W(rf, top, Zf + 0.14), W(cf, yS, Zf + 0.08), W(cf, yS, Zn - 0.08), W(rf, top, Zn - 0.14)], (x, y) => pk(glass, 0.6 + ((x - y) % 9 < 2 ? 0.3 : 0), x, y));
  Q([W(cr, yS, Zn - 0.08), W(cf, yS, Zn - 0.08), W(rf, top, Zn - 0.14), W(rr, top, Zn - 0.14)], (x, y) => { const X = C.wX(x, Zn - 0.1), u = (X - rear) / (front - rear), Y = C.wY(y, Zn - 0.1) - G(X);
    if (Y < yS + 0.06 || Y > top - 0.06 || Math.abs(u - (rr + rf) / 2) < 0.025) return pk(body, 0.62, x, y); return pk(glass, 0.38 + 0.4 * (((u * 7 + Y * 3) % 1) < 0.18 ? 1 : 0), x, y); });
  Q([W(rr, top, Zf + 0.14), W(rf, top, Zf + 0.14), W(rf, top, Zn - 0.14), W(rr, top, Zn - 0.14)], lit(0.97));
  // wheels (near side): dark tyre, light hub with spokes that turn
  for (const u of [0.17, 0.82]) { const X = fx(u), [x, y] = C.P(X, G(X) + 0.32, Zn + 0.01), r = 0.32 * C.k(Zn); for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) { const q = Math.hypot(i, j) / r; if (q > 1) continue; const an = Math.atan2(j, i) + (o.spin ?? 0) * dir; put(c, R(x + i), R(y + j), q < 0.48 ? (Math.cos(an * 5) > 0.2 ? hex("#D0D4DC") : hex("#868A94")) : q < 0.58 ? hex("#2A2A30") : hex("#141418")); } }
  // lights on the near corners
  { const [x, y] = C.P(fx(0.995), G(fx(0.995)) + 0.66, Zn); for (let j = 0; j < 3; j++) for (let i = -2; i < 2; i++) put(c, R(x) + i, R(y) + j, hex("#FFF4C8")); }
  { const [x, y] = C.P(fx(0.005), G(fx(0.005)) + 0.66, Zn); for (let j = 0; j < 3; j++) for (let i = -2; i < 2; i++) put(c, R(x) + i, R(y) + j, hex("#E83A3A")); }
}
// ---------------------------------------------------------------- the kiosk with two TVs (X 46 … 52, front Z −1.6)
export const TV = [{ X: 37.7, Y0: 0.42, Y1: 1.3, w: 1.56 }, { X: 40.3, Y0: 0.42, Y1: 1.3, w: 1.56 }];
function kiosk(c, C, t, o) {
  const X0 = CT.KX0, X1 = CT.KX1, Zf = CT.KZ, Zb = -3.6, H = 3.0;
  box3(c, C, X0, X1, 0, H, Zb, Zf, { side: (x, y) => pk(P.walls[2], 0.3, x, y), top: (x, y) => pk(P.trim, 0.5, x, y), front: (x, y) => {
    const X = C.wX(x, Zf), Y = C.wY(y, Zf), u = X - X0;
    if (Y > 2.55) { const st = Math.floor((u) / 0.5) % 2; return Y > 2.95 ? hex("#3A2A2A") : st ? hex("#2E5E9A") : hex("#F4F2EA"); }       // striped fascia
    if (Y > 2.42) return P.shade;
    if (Y < 0.3) return pk(P.trim, 0.35, x, y);
    if (u < 0.2 || u > X1 - X0 - 0.2) return pk(P.iron, 0.5, x, y);
    if (Y > 2.25 || Y < 0.4) return pk(P.iron, 0.55, x, y);
    // the display window: a dark interior with a back shelf and the two TVs (drawn on top), a glass reflection streak
    const refl = (((u * 1.2 - Y * 0.8) % 1.9) + 1.9) % 1.9 < 0.12;
    if (refl) return pk(P.glass, 0.9, x, y);
    if (Math.abs(Y - 0.36) < 0.05) return pk(P.wood, 0.6, x, y);
    return pk(P.glass, 0.12 + 0.12 * (Y / 2.2), x, y);
  } });
  // TVs: dark bezels and stands; the screens are filled by the scene (o.screen(i, rect, k))
  for (const [i, tv] of TV.entries()) {
    const [x0, y1] = C.P(tv.X - tv.w / 2, tv.Y0, Zf - 0.05), [x1, y0] = C.P(tv.X + tv.w / 2, tv.Y1, Zf - 0.05);
    const g = (x, y, w, h, col) => { for (let yy = R(y); yy < R(y + h); yy++) for (let xx = R(x); xx < R(x + w); xx++) put(c, xx, yy, col); };
    const b = Math.max(2, R(0.05 * C.k(Zf))); g(x0 - b, y0 - b, x1 - x0 + 2 * b, y1 - y0 + 2 * b, hex("#141218")); g(x0 - b, y0 - b, x1 - x0 + 2 * b, 1, hex("#3A3844"));
    const cx = (x0 + x1) / 2; g(cx - 3 * b, y1 + b, 6 * b, R(0.06 * C.k(Zf)), hex("#26242C"));
    const scr = { x0: R(x0), y0: R(y0), x1: R(x1), y1: R(y1) };
    if (o.screen) o.screen(c, i, scr); else for (let y = scr.y0; y < scr.y1; y++) for (let x = scr.x0; x < scr.x1; x++) put(c, x, y, pk(P.glass, 0.1, x, y));
  }
}
// ---------------------------------------------------------------- the square: garden wall + trees, skatepark, the two-story house
export const HOUSE2 = { X0: -70.5, X1: -64.5, Zf: -6.5, Zb: -10.5, H: 6.4 };
function square(c, C, t) {
  // garden wall along the back with round trees behind it
  for (let X = -96; X < CT.SQ; X += 3.3) { const k = C.k(-11), [sx, sy] = C.P(X + 1.6, 3.2 + rnd(Math.floor(X)) * 0.8, -11), r = (1.5 + rnd(Math.floor(X) + 3) * 0.5) * k;
    pole(c, C, X + 1.6, -11, 2.4, 0.12, P.trunk);
    for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r * 1.1); i <= Math.ceil(r * 1.1); i++) { const q = Math.hypot(i / 1.1, j) / r; if (q > 1 + 0.12 * Math.sin(i * 0.7 + j * 0.9)) continue; const xx = R(sx + i), yy = R(sy + j); put(c, xx, yy, pk(P.leaf, 0.75 - 0.45 * ((i + j * 1.4) / r + 1) / 2.4 + 0.1 * (h2(xx >> 2, yy >> 2, 4) - 0.5), xx, yy)); } }
  for (let X = -92; X < CT.SQ; X += 7.5) { const k = C.k(-8.8), [sx, sy] = C.P(X + 3.4, 0.5, -8.8), r = 0.7 * k; for (let j = -Math.ceil(r); j <= Math.ceil(r * 0.3); j++) for (let i = -Math.ceil(r * 1.4); i <= Math.ceil(r * 1.4); i++) { const q = Math.hypot(i / 1.4, j) / r; if (q > 1 + 0.1 * Math.sin(i * 0.9 + j)) continue; const xx = R(sx + i), yy = R(sy + j); put(c, xx, yy, pk(P.leaf, 0.85 - 0.5 * ((j / r) + 1) / 1.4 + 0.12 * (h2(xx >> 1, yy >> 1, 7) - 0.5), xx, yy)); } }
  box3(c, C, -96, CT.SQ, 0, 1.1, -9.3, -9.0, { front: (x, y) => { const X = C.wX(x, -9), Y = C.wY(y, -9); return Y > 0.95 ? pk(P.trim, 0.8, x, y) : pk(P.walls[0], 0.4 + ((Math.floor(X / 0.5) + Math.floor(Y / 0.25)) % 2 ? 0.08 : 0) + (Math.abs((Y % 0.25)) < 0.02 ? -0.2 : 0), x, y); }, top: (x, y) => pk(P.trim, 0.9, x, y) });
  for (let X = -88; X < CT.SQ - 2; X += 7.5) bench(c, C, X, -8.4);
  // the skatepark: a quarter pipe, a fun box with a rail, our own graffiti blobs (no words)
  quad(c, C, [[-94, 0, -8.2], [-86, 0, -8.2], [-86, 1.8, -8.2], [-94, 1.8, -8.2]], (x, y) => { const X = C.wX(x, -8.2), Y = C.wY(y, -8.2), blob = Math.hypot((X + 90) / 1.6, (Y - 0.9) / 0.6) < 1 && h2(Math.floor(X * 2), Math.floor(Y * 3), 9) > 0.2; return blob ? pk(P.graffiti, ((X + 92) / 3) % 1, x, y) : pk(P.concrete, 0.45 + 0.2 * Y / 1.8, x, y); });
  quad(c, C, [[-94, 1.8, -8.2], [-86, 1.8, -8.2], [-86, 0, -5.6], [-94, 0, -5.6]], (x, y) => { const Y = C.wY(y, -7); return pk(P.concrete, 0.8 - 0.25 * Y / 1.8, x, y); });
  box3(c, C, -86, -82, 0, 0.5, -6.0, -3.6, { front: (x, y) => pk(P.concrete, 0.5, x, y), top: (x, y) => pk(P.concrete, 0.85, x, y), side: (x, y) => pk(P.concrete, 0.3, x, y) });
  box3(c, C, -85.6, -82.4, 0.5, 0.56, -4.85, -4.75, { front: (x, y) => pk(P.pole, 0.8, x, y), top: (x, y) => hex("#F0F2F4") });
  // the two-story house (6.4 m to the eaves): two floors of windows, a front door, a tiled roof edge
  const h = HOUSE2;
  box3(c, C, h.X0, h.X1, 0, h.H, h.Zb, h.Zf, { side: (x, y) => pk(P.walls[1], 0.28, x, y), front: (x, y) => {
    const X = C.wX(x, h.Zf), Y = C.wY(y, h.Zf), u = X - h.X0, W = h.X1 - h.X0;
    if (Y > h.H - 0.3) return pk(P.trim, 0.8, x, y);
    if (Y < 0.3) return pk(P.stone, 0.4, x, y);
    const fl = Y < 3.2 ? 0 : 1, fv = Y - fl * 3.2, door = fl === 0 && Math.abs(u - W / 2) < 0.55 && fv < 2.4;
    if (door) return Math.abs(u - W / 2) > 0.48 || fv > 2.32 ? pk(P.trim, 0.5, x, y) : pk(P.shut[1], 0.45 + (fv > 1.5 && fv < 2.0 ? 0.3 : 0), x, y);
    if (Math.abs(fv - 3.15) < 0.06) return pk(P.trim, 0.6, x, y);
    for (const wu of fl === 0 ? [1.2, W - 1.2] : [1.2, W / 2, W - 1.2]) { const du = u - wu; if (Math.abs(du) < 0.48 && fv > 0.9 && fv < 2.3) return Math.abs(du) > 0.42 || fv < 0.96 || fv > 2.24 || Math.abs(du) < 0.03 ? pk(P.trim, 0.85, x, y) : pk(P.glass, 0.4 + 0.4 * (((du + fv * 0.5) % 0.6 + 0.6) % 0.6 < 0.1 ? 1 : 0), x, y);
      if (Math.abs(du) < 0.8 && Math.abs(du) >= 0.48 && fv > 0.9 && fv < 2.3) return pk(P.shut[0], Math.floor(fv / 0.12) % 2 ? 0.45 : 0.7, x, y); }
    return pk(P.walls[1], 0.5 + 0.06 * Y / h.H, x, y);
  } });
  // the roof: a tiled slope seen from below/front (a band) and a chimney
  quad(c, C, [[h.X0 - 0.3, h.H, h.Zf + 0.3], [h.X1 + 0.3, h.H, h.Zf + 0.3], [h.X1 - 0.6, h.H + 1.5, (h.Zf + h.Zb) / 2], [h.X0 + 0.6, h.H + 1.5, (h.Zf + h.Zb) / 2]], (x, y) => pk(P.tile, 0.4 + ((y >> 1) % 3 === 0 ? -0.2 : 0.15) + ((x >> 2) % 2 ? 0.05 : 0), x, y));
  box3(c, C, h.X1 - 1.6, h.X1 - 1.0, h.H + 0.6, h.H + 2.1, -8.8, -8.2, { front: (x, y) => pk(P.walls[1], 0.4, x, y), top: (x, y) => pk(P.iron, 0.4, x, y), side: (x, y) => pk(P.walls[1], 0.2, x, y) });
}
// ---------------------------------------------------------------- the whole city through camera C
/** o: { t, screen (TV filler), cars: [{ X, Z, body, dir, L, van, spin }], extraBack(c, C) (things behind the lane: people) } */
export function drawCity(c, C, o = {}) {
  const t = o.t ?? 0;
  drawSky(c, C);
  // the house row (Z −9), terraced up the hill
  for (const h of HOUSES) { const [sx0] = C.P(h.X0, 0, CT.ZF), [sx1] = C.P(h.X1, 0, CT.ZF); if (sx1 < -2 || sx0 > c.w + 2) continue;
    const b = base(h) - 0.6; facade(c, C, h.X0, h.X1, b, b + h.fl * 3.1 + 1.2, CT.ZF, (X, Y, x, y) => facadePx(h, X - h.X0, Y - b - 0.6, x, y)); }
  for (const h of HOUSES_SQ) { const [sx0] = C.P(h.X0, 0, -14), [sx1] = C.P(h.X1, 0, -14); if (sx1 < -2 || sx0 > c.w + 2) continue;
    facade(c, C, h.X0, h.X1, -0.6, h.fl * 3.1 + 0.6, -14, (X, Y, x, y) => facadePx(h, X - h.X0, Y, x, y)); }
  // ground (all pieces), drawn only where the ray lands in front of the house row
  const yTop = Math.max(0, Math.floor(C.hy + 1));
  for (let y = yTop; y < c.h; y++) for (let x = 0; x < c.w; x++) { const g = groundHit(C, x, y); if (!g) continue; const col = groundCol(g.X, g.Z, x, y, t); if (!col) continue; put(c, x, y, col);
    if (g.Z < CT.ZF + 1.4 && g.X >= CT.SQ) tint(c, x, y, P.shade, 0.32 * (1 - (g.Z - CT.ZF) / 1.4), 3); }               // soft afternoon shade at the foot of the houses
  // the square
  const xa = C.wX(-60, -9), xb = C.wX(c.w + 60, -9);
  if (xa < CT.SQ + 4) square(c, C, t);
  // cars on the road (far lane first)
  const cars = [...(o.cars ?? [])].sort((p, q) => p.Z - q.Z);
  for (const k of cars) { const [sx] = C.P(k.X, 0, k.Z), kk = C.k(k.Z); if (sx < -3 * kk || sx > c.w + 3 * kk) continue; car(c, C, k.X, k.Z, k.body, k.dir, k); }
  // street furniture along the kerb side of the promenade: lamps every 14 m, palm planters, benches
  const items = [];
  for (let n = Math.floor(C.wX(-120, -3.4) / 14) - 1; n <= Math.ceil(C.wX(c.w + 120, -3.4) / 14) + 1; n++) { const X = n * 14 + 3; if (X < CT.SQ + 1 || (X > CT.KX0 - 1.5 && X < CT.KX1 + 1.5)) continue;
    items.push([-3.4, () => lamp(c, C, X, -3.4)]);
    if (rnd(n * 7) > 0.35 && !(X + 6 > CT.KX0 - 1 && X + 6 < CT.KX1 + 1)) items.push([-3.0, () => palmTree(c, C, X + 6, -3.0, t, n)]);
    else if (!(X + 7 > CT.KX0 - 1 && X + 7 < CT.KX1 + 1)) items.push([-2.6, () => bench(c, C, X + 7, -2.6)]); }
  if (xb > CT.KX0 - 4 && xa < CT.KX1 + 4) items.push([CT.KZ, () => kiosk(c, C, t, o)]);
  if (o.extraBack) items.push(...o.extraBack);
  items.sort((p, q) => p[0] - q[0]); for (const [, f] of items) f();
}
