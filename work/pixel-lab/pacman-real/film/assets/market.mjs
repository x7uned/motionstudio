// pacman-real · market (new, 2026-10-29, drawn for this film): a sunny summer street market at noon seen by the pinhole
// camera of lib/cam.mjs from a 3/4 high angle (camera ≈ 3 m up), full 9:16 frame. World in metres: X along the street (→),
// Y up, Z toward the camera. Back to front: pastel town houses (Z −6: plinth with shop windows, cornices, shuttered windows,
// balconies with flower pots, drainpipes) → the stall row (back canvas Z −3, counters Z −0.75…0, striped awnings with
// scalloped valances, no brands, no words) with crates of fruit and vegetables, slates with chalk doodles, a table scale,
// vendors → the light paving (slabs, a shade band under the awnings) → the granite kerb (Z 4) → the asphalt road with a dashed
// line. Stalls repeat every 3.6 m with hashed colours and goods, so the street is as long as the film needs. Noon light from
// high front-left: short shadows straight down and a little to the right. Ramps + ordered dither; pure functions of (cam, t).
import { hex } from "../../../../../renderer/pixel/raster.mjs";
import { R, RG, pk, put, tint, quad, box3, rnd, h2, clamp01, lerp, BY } from "../lib/cam.mjs";
import { drawPerson } from "./passerby.mjs";

export const MK = { ZF: -6.0, ZB: -3.0, ZC0: -0.75, ZC1: 0.0, ZA: 0.55, ZM: 2.2, ZK: 4.0, STEP: 3.6, SW: 3.0 };
export const P = {
  sky: RG(["#7EC4F0", "#A6D8F6", "#CDEBFA"]),
  wallA: RG(["#B98A5E", "#D8AC7C", "#EBC898", "#F6DEB4", "#FFF0D4"]), wallB: RG(["#B07468", "#CE9484", "#E2B0A0", "#F0CABC", "#FADED4"]),
  wallC: RG(["#8E9A78", "#AAB892", "#C4D0AA", "#DAE4C2", "#ECF2DA"]), wallD: RG(["#8C9AB0", "#A8B8CC", "#C2D0E0", "#D8E4EE", "#EEF4F8"]),
  wallE: RG(["#C29A50", "#DCB468", "#ECCC86", "#F6E0A8", "#FFF0CC"]), wallF: RG(["#B08C9C", "#C8A6B4", "#DCC0CA", "#ECD8DE", "#F8ECEE"]),
  trim: RG(["#B4A894", "#D2C8B4", "#EAE2D0", "#FAF6EC"]), glass: RG(["#2A3448", "#3C4A64", "#56688A", "#7C90B0", "#B4C8DE"]),
  shutA: RG(["#2A5A48", "#3A7860", "#52967A", "#74B496"]), shutB: RG(["#2C4A78", "#3E6498", "#5880B4", "#7CA0CC"]), shutC: RG(["#7A4A2E", "#98603C", "#B47C50", "#CC9A6C"]),
  iron: RG(["#1E1C24", "#2E2A34", "#423C48", "#5A5260"]), plinth: RG(["#7E7468", "#98907E", "#B2AA96", "#CAC2AE"]),
  pave: RG(["#9E9282", "#B6AA98", "#CCC0AC", "#DED4C0", "#ECE4D2"]), paveJ: hex("#8A7E70"), shade: hex("#5E5468"),
  curb: RG(["#7E7C80", "#A2A0A2", "#C4C2C0", "#E0DED8"]), asph: RG(["#3E3E48", "#4A4A56", "#575764", "#666672", "#787884"]), line: RG(["#C8C6BE", "#ECEAE0", "#FFFFF6"]),
  wood: RG(["#4A2E1C", "#6A4228", "#8A5A36", "#A87448", "#C8945E"]), canvas: RG(["#6A5E54", "#857868", "#A0927E"]), cloth: RG(["#3A4A6A", "#4E6288", "#687EA6"]),
  pole: RG(["#3A3A44", "#5A5A66", "#82828E", "#ACACB6"]), slate: RG(["#1E2228", "#2A2F36", "#3A4048"]), chalk: hex("#E8E8E0"),
  leaf: RG(["#2A5A2A", "#3C7A34", "#58A044", "#86C458"]), flower: RG(["#B8283C", "#E04452", "#FF7A80"]), flower2: RG(["#C88A1E", "#F0B830", "#FFE070"]), pot: RG(["#8A4A2A", "#AE6238", "#CC804C"]),
};
const AWN = [["#C84A3C", "#F4EAD8"], ["#3E8A5A", "#F2EEDC"], ["#3C6EB4", "#F2F0E6"], ["#E0A030", "#FBF2DC"], ["#D86A3A", "#F6ECD8"], ["#2E9A9A", "#F2F2E6"], ["#9A4A8A", "#F6EEE8"]].map(([a, b]) => [RG([shade(a, -0.32), shade(a, -0.15), a, shade(a, 0.18)]), RG([shade(b, -0.3), shade(b, -0.15), b, "#FFFFFF"])]);
function shade(h, k) { const c = hex(h), t = k < 0 ? 0 : 255; const q = Math.abs(k); return "#" + c.map((v) => Math.round(v + (t - v) * q).toString(16).padStart(2, "0")).join(""); }
export const FRUIT = {
  orange: RG(["#B04A0A", "#E2780E", "#FFA02A", "#FFD08A"]), lemon: RG(["#B89A0A", "#E8C81E", "#FFE65A", "#FFF6B0"]), apple: RG(["#7A0E16", "#B8202A", "#E04640", "#FF9A8A"]),
  green: RG(["#3A6A12", "#5C9422", "#86BE3A", "#C4E68A"]), tomato: RG(["#8A1408", "#C8301A", "#F05A3A", "#FFA08A"]), grape: RG(["#2E1440", "#4E2464", "#764090", "#A878C0"]),
  peach: RG(["#B4584A", "#E08A6A", "#F6B48E", "#FFE0C4"]), eggpl: RG(["#1E0E2A", "#3A1E4A", "#5A3470", "#8A62A0"]), pepper: RG(["#8A1010", "#C82618", "#F04A2A", "#FF9A70"]),
  potato: RG(["#7A5A32", "#9C7848", "#BC9862", "#DCBE8A"]), banana: RG(["#B48A10", "#E2BC2A", "#FFE05A", "#FFF4B0"]), cuke: RG(["#1E4A16", "#2E6A22", "#4A8A34", "#7AB45A"]),
};
const GOODS = ["orange", "lemon", "apple", "green", "tomato", "grape", "peach", "eggpl", "pepper", "potato", "banana", "cuke"];
export const MELON = { rind: RG(["#16401A", "#1E5A22", "#2E7A2E", "#4E9A3E", "#8AC266"]), stripe: RG(["#0E2A10", "#16401A", "#1E5428"]), flesh: RG(["#B8202E", "#E83A44", "#FF6A6A"]), seed: hex("#2A1418"), white: hex("#F2F0D8") };

// ---------------------------------------------------------------- the town houses (Z = ZF)
const BLD = [];
{ let x = -60; for (let i = 0; x < 400; i++) { const w = 8 + Math.floor(rnd(i * 7 + 1) * 4) * 1.2, fl = 4 + Math.floor(rnd(i * 5 + 2) * 2); BLD.push({ x0: x, x1: x + w, floors: fl, wall: ["wallA", "wallB", "wallC", "wallD", "wallE", "wallF"][i % 6], shut: ["shutA", "shutB", "shutC"][Math.floor(rnd(i * 3 + 7) * 3)], balc: rnd(i * 11 + 3) > 0.35, i }); x += w; } }
const bldAt = (X) => { let lo = 0, hi = BLD.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (BLD[m].x0 <= X) lo = m; else hi = m - 1; } return BLD[lo]; };
const GF = 4.2, FH = 3.1;
function facadePx(X, Y, x, y, B) {
  const top = GF + B.floors * FH - FH + 0.6, W = P[B.wall];
  if (Y > top + 0.55) return null;                                          // sky
  const edge = Math.min(X - B.x0, B.x1 - X);
  if (edge < 0.06) return pk(W, 0.15, x, y);                                // party wall seam
  if (Y > top) { const u = (Y - top) / 0.55; return u > 0.8 ? pk(P.trim, 0.95, x, y) : u > 0.62 ? pk(P.trim, 0.25, x, y) : (((X + 40) * 4) % 1 < 0.5 && u < 0.45 ? pk(P.trim, 0.7, x, y) : pk(W, 0.2, x, y)); }   // cornice + dentils
  if (Y < GF) {                                                             // shop plinth (mostly behind the stalls)
    if (Y > GF - 0.35) return pk(P.trim, Y > GF - 0.12 ? 0.9 : 0.55, x, y);
    const bw = 2.4, k = ((X - B.x0 + 0.6) / bw) % 1, lx = (X - B.x0 + 0.6) % bw;
    if (lx > 0.35 && lx < bw - 0.35 && Y > 0.45 && Y < GF - 0.7) { const gy = (Y - 0.45) / (GF - 1.15); return pk(P.glass, 0.25 + 0.5 * gy + (((X * 3 + Y * 2) % 1) < 0.08 ? 0.35 : 0), x, y); }
    if (lx > 0.25 && lx < bw - 0.25 && Y > 0.35 && Y < GF - 0.6) return pk(P.trim, 0.45 + 0.4 * (lx < 0.3 ? 1 : 0), x, y);
    void k; return pk(P.plinth, 0.45 + 0.35 * (Y / GF) + (((Y * 3.3) % 1) < 0.05 ? -0.3 : 0), x, y);
  }
  // upper floors: string course, windows with shutters, sills, lintels
  const fy = (Y - GF) % FH, fl = Math.floor((Y - GF) / FH);
  if (fy > FH - 0.16) return pk(P.trim, fy > FH - 0.05 ? 0.9 : 0.6, x, y);
  if (fy > FH - 0.24) return pk(W, 0.18, x, y);
  const pitch = 2.3, off = ((B.x1 - B.x0) % pitch) / 2, lx = ((X - B.x0 - off) % pitch + pitch) % pitch, wx = lx - pitch / 2, ww = 0.55, wy0 = 0.55, wy1 = 2.25;
  const lt = 0.62 + 0.18 * (Y / 18) + (h2(Math.floor((X + 99) * 1.3), Math.floor(Y * 1.6), B.i) - 0.5) * 0.12;
  if (Math.abs(wx) < ww + 0.42 && fy > wy0 && fy < wy1) {
    if (Math.abs(wx) > ww) { const S = P[B.shut], v = ((fy * 9) % 1) < 0.2 ? 0.25 : 0.62; return pk(S, Math.abs(wx) > ww + 0.36 ? 0.2 : v, x, y); }      // shutters (louvres)
    if (Math.abs(wx) > ww - 0.07 || fy < wy0 + 0.07 || fy > wy1 - 0.07) return pk(P.trim, 0.82, x, y);                                                      // frame
    if (Math.abs(wx) < 0.03 || Math.abs(fy - 1.6) < 0.03) return pk(P.trim, 0.7, x, y);                                                                      // mullions
    const g = (fy - wy0) / (wy1 - wy0), refl = ((wx * 2 + fy) % 1 + 1) % 1 < 0.14 ? 0.3 : 0; return pk(P.glass, 0.15 + 0.35 * g + refl + (fy > wy1 - 0.3 ? -0.1 : 0), x, y);
  }
  if (Math.abs(wx) < ww + 0.1 && fy > wy0 - 0.12 && fy <= wy0) return pk(P.trim, 0.9, x, y);                                                                   // sill
  if (Math.abs(wx) < ww + 0.06 && fy >= wy1 && fy < wy1 + 0.18) return pk(P.trim, 0.55, x, y);                                                                // lintel
  if (Math.abs(wx) < ww + 0.06 && fy > wy0 - 0.25 && fy <= wy0 - 0.12) return pk(W, lt - 0.38, x, y);                                                        // sill shadow
  if (Math.abs(wx) < ww + 0.06 && fy >= wy1 + 0.18 && fy < wy1 + 0.22) return pk(W, lt - 0.25, x, y);
  // drainpipe
  if (Math.abs(X - B.x0 - 0.35) < 0.05) return pk(P.iron, 0.6 + (Math.abs(X - B.x0 - 0.35) < 0.02 ? 0.3 : 0), x, y);
  void fl; return pk(W, lt, x, y);
}
/** balconies with railings and flower pots (drawn after the facade, in front of it) */
function balconies(c, C, t) {
  const Z = MK.ZF, xa = C.wX(-20, Z), xb = C.wX(560, Z);
  for (const B of BLD) { if (B.x1 < xa || B.x0 > xb || !B.balc) continue;
    const pitch = 2.3, off = ((B.x1 - B.x0) % pitch) / 2;
    for (let fl = 1; fl < B.floors - 1; fl++) { const Yb = GF + fl * FH + 0.5; if (fl % 2 === (B.i % 2)) continue;
      for (let wx = B.x0 + off + pitch / 2; wx < B.x1 - 0.5; wx += pitch) {
        if (h2(Math.floor(wx * 3), fl, B.i + 5) < 0.4) continue;
        box3(c, C, wx - 0.85, wx + 0.85, Yb - 0.12, Yb, Z, Z + 0.45, { front: (x, y) => pk(P.trim, 0.55, x, y), top: (x, y) => pk(P.trim, 0.85, x, y), bottom: (x, y) => pk(P.trim, 0.2, x, y) });
        // railing: bars
        const k = C.k(Z + 0.45), [x0, y0] = C.P(wx - 0.85, Yb + 0.75, Z + 0.45), [x1, y1] = C.P(wx + 0.85, Yb, Z + 0.45);
        for (let x = R(x0); x <= R(x1); x++) { const bar = ((x - R(x0)) % Math.max(3, R(0.12 * k))) === 0; for (let y = R(y0); y < R(y1); y++) if (bar || y - R(y0) < Math.max(1, R(0.04 * k))) put(c, x, y, P.iron[1]); }
        // pots with flowers on the rail
        for (let q = 0; q < 3; q++) { const px = wx - 0.55 + q * 0.55, [fx, fy] = C.P(px, Yb + 0.85, Z + 0.4), r = Math.max(2, 0.16 * k), fcol = (q + B.i) % 2 ? P.flower : P.flower2;
          for (let j = -R(r); j <= 0; j++) for (let i = -R(r * 1.3); i <= R(r * 1.3); i++) { if ((i * i) / (r * r * 1.7) + (j * j) / (r * r) > 1) continue; const xx = R(fx + i), yy = R(fy + j - r * 0.2), v = h2(xx, yy, 7); put(c, xx, yy, v > 0.62 ? pk(fcol, 0.5 + 0.5 * v, xx, yy) : pk(P.leaf, 0.3 + 0.6 * (1 + j / r) * 0.5 + v * 0.3, xx, yy)); }
          for (let j = 0; j < R(r * 0.9); j++) for (let i = -R(r * 0.7); i <= R(r * 0.7); i++) put(c, R(fx + i), R(fy + j), pk(P.pot, 0.4 + 0.3 * (i < 0 ? 1 : 0), R(fx + i), R(fy + j))); }
      } } }
}

// ---------------------------------------------------------------- the ground (pavement, kerb, road) per screen row
function groundPx(X, Z, x, y, k) {
  if (Z < MK.ZK) {                                                          // paving slabs 0.5 × 0.5 (running bond)
    const row = Math.floor(Z / 0.5), sx = (X + (row % 2) * 0.25) / 0.5, jx = sx - Math.floor(sx), jz = Z / 0.5 - row, jw = Math.max(0.025, 0.9 / (k * 0.5));
    const tone = 0.62 + 0.14 * (h2(Math.floor(sx), row, 2) - 0.5) + 0.05 * (h2(R(X * 40), R(Z * 40), 9) - 0.5);
    let v = jx < jw || jz < jw ? null : tone;
    // the awnings' shade band (scalloped edge) and the cool shade under the stalls
    const sc = 0.35 + 0.06 * Math.abs(Math.sin(((X % MK.STEP) / 0.3) * Math.PI));
    const inStall = (((X - 0.3) % MK.STEP) + MK.STEP) % MK.STEP < MK.SW + 0.15;
    if (Z < sc && inStall) return v === null ? hex("#4E465A") : pk(RG(["#6A6070", "#7E7484", "#948A98"]), v - 0.2, x, y);
    if (v === null) return P.paveJ;
    return pk(P.pave, v, x, y);
  }
  if (Z < MK.ZK + 0.22) return pk(P.curb, 0.82 - (Z - MK.ZK) * 1.2, x, y);  // kerb top (the face is a separate quad)
  if (Z < MK.ZK + 0.55) return pk(P.asph, 0.18, x, y);                      // gutter
  const n = h2(R(X * 30), R(Z * 30), 4), n2 = h2(Math.floor(X * 2), Math.floor(Z * 2), 5);
  if (Math.abs(Z - 8.2) < 0.08 && ((X % 4) + 4) % 4 < 2.2) return pk(P.line, 0.7 + 0.3 * n, x, y);
  { const gx = ((X % 7) + 7) % 7; if (Z < MK.ZK + 0.95 && gx > 3.0 && gx < 3.7) { const gz = Z - MK.ZK - 0.6; return gz < 0.02 || gx < 3.04 || gx > 3.66 ? pk(P.iron, 0.2, x, y) : pk(P.iron, (((gx - 3) * 14) % 1) < 0.4 ? 0.1 : 0.7, x, y); } }
  { const mx = ((X % 11) + 11) % 11 - 6, mz = Z - 6.4, q = Math.hypot(mx / 0.85, mz / 0.55); if (q < 1) return pk(P.iron, q > 0.86 ? 0.1 : 0.45 + 0.3 * ((Math.floor(mx * 6) + Math.floor(mz * 8)) % 2 ? 1 : 0), x, y); }
  if (Z > 9.5 && Z < 9.9 && ((X % 9) + 9) % 9 < 0.7) return pk(P.line, 0.55, x, y);
  return pk(P.asph, 0.42 + 0.16 * (n - 0.5) + 0.08 * (n2 - 0.5), x, y);
}
export function drawBackdrop(c, C) {
  // facade plane + sky above the roofs
  const yBase = R(C.sy(0, MK.ZF));
  for (let y = 0; y < Math.min(c.h, yBase); y++) { const Y = C.wY(y, MK.ZF);
    for (let x = 0; x < c.w; x++) { const X = C.wX(x, MK.ZF), B = bldAt(X), col = facadePx(X, Y, x, y, B); put(c, x, y, col || pk(P.sky, clamp01(1 - (Y - 14) / 10), x, y)); } }
  // ground rows
  for (let y = Math.max(0, yBase); y < c.h; y++) { const Z = C.planeZ(y, 0); if (Z === null) continue; const k = C.k(Z);
    for (let x = 0; x < c.w; x++) { const X = C.x + (x + 0.5 - 270) / k; if (Z < MK.ZF) continue; put(c, x, y, Z < MK.ZB ? pk(P.plinth, 0.3, x, y) : groundPx(X, Z, x, y, k)); } }
  balconies(c, C, 0);
  // kerb face
  const xa = C.wX(-10, MK.ZK), xb = C.wX(560, MK.ZK);
  quad(c, C, [[xa, 0, MK.ZK + 0.22], [xb, 0, MK.ZK + 0.22], [xb, 0.14, MK.ZK + 0.22], [xa, 0.14, MK.ZK + 0.22]], (x, y) => pk(P.curb, 0.4 + 0.12 * h2(x >> 3, 0, 3), x, y));
}

// ---------------------------------------------------------------- one stall (module i): back canvas, vendor, counter, crates, awning
export const stallX = (i) => [i * MK.STEP + 0.3, i * MK.STEP + 0.3 + MK.SW];
export const VENDORS = [
  { h: 1.74, skin: "skinB", top: "white", legs: "khaki", shoe: "shoe", hair: "dark", style: "short", apron: "green", beard: true },
  { h: 1.66, skin: "skinA", top: "pink", legs: "denim", shoe: "shoe", hair: "brown", style: "bun", apron: "navy" },
  { h: 1.8, skin: "skinD", top: "mustard", legs: "black", shoe: "shoe", hair: "dark", style: "curly", apron: "camel", cap: "red" },
  { h: 1.7, skin: "skinC", top: "teal", legs: "khaki", shoe: "shoe", hair: "ginger", style: "long", apron: "white" },
  { h: 1.76, skin: "skinA", top: "white", legs: "grey", shoe: "shoe", hair: "greyH", style: "bald", apron: "red", glasses: true },
];
function crate(c, C, X0, X1, Y0, Z0, Z1, goods, seed, hDome = 0.12) {
  box3(c, C, X0, X1, Y0, Y0 + 0.2, Z0, Z1, { front: (x, y) => pk(P.wood, ((y - R(C.sy(Y0 + 0.2, Z1))) % 4 === 0 ? 0.2 : 0.62) + (h2(x >> 2, y >> 2, seed) - 0.5) * 0.15, x, y), side: (x, y) => pk(P.wood, 0.35, x, y), top: (x, y) => pk(P.wood, 0.25, x, y) });
  // the fruit dome: rows of round fruits from back to front
  const F = FRUIT[goods], r = goods === "grape" ? 0.035 : goods === "banana" || goods === "cuke" ? 0.05 : 0.045;
  const nx = Math.max(2, Math.floor((X1 - X0) / (r * 2.1))), nz = Math.max(2, Math.floor((Z1 - Z0) / (r * 2.1)));
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const fx = X0 + (ix + 0.5 + (iz % 2) * 0.35) * ((X1 - X0) / (nx + 0.35)), fz = Z0 + (iz + 0.5) * ((Z1 - Z0) / nz), u = (fx - X0) / (X1 - X0) - 0.5, w = (fz - Z0) / (Z1 - Z0) - 0.5;
    const fyW = Y0 + 0.2 + hDome * (1 - 2.2 * (u * u + w * w)) + r * 0.6, k = C.k(fz), [sx, sy] = C.P(fx, fyW, fz), rr = Math.max(1.4, r * k), n = h2(ix, iz, seed);
    fruit(c, sx + (n - 0.5) * rr * 0.6, sy, rr, F, n, goods === "banana" || goods === "cuke");
  }
}
export function fruit(c, sx, sy, rr, F, n = 0.5, long = false) {
  const rx = long ? rr * 1.7 : rr, ry = rr * 0.92;
  for (let j = -Math.ceil(ry) - 1; j <= Math.ceil(ry) + 1; j++) for (let i = -Math.ceil(rx) - 1; i <= Math.ceil(rx) + 1; i++) {
    const q = (i * i) / (rx * rx) + (j * j) / (ry * ry), x = R(sx + i), y = R(sy + j);
    if (q > 1.25) continue; if (q > 1) { put(c, x, y, F[0]); continue; }
    const lit = 0.68 - (i / rx) * 0.22 - (j / ry) * 0.32 - q * 0.25 + (n - 0.5) * 0.15; put(c, x, y, pk(F, lit, x, y));
  }
  if (rr >= 2.5) put(c, R(sx - rx * 0.35), R(sy - ry * 0.45), F[3]);
}
/** a chalk slate on a little easel stand with doodles (no words): a fruit, a wavy line, a dot */
function slate(c, C, X, Z, seed) {
  const k = C.k(Z), [x0, y0] = C.P(X - 0.22, 0.95, Z), [x1, y1] = C.P(X + 0.22, 0.45, Z);
  for (let y = R(y0); y < R(y1); y++) for (let x = R(x0); x < R(x1); x++) { const e = x - R(x0) < Math.max(1, R(0.03 * k)) || R(x1) - x <= Math.max(1, R(0.03 * k)) || y - R(y0) < Math.max(1, R(0.03 * k)) || R(y1) - y <= Math.max(1, R(0.03 * k)); put(c, x, y, e ? P.wood[3] : pk(P.slate, 0.5 + 0.2 * h2(x, y, 1), x, y)); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, s = (x1 - x0) / 10;
  for (let a = 0; a < 18; a++) { const an = (a / 18) * Math.PI * 2; put(c, R(cx - 2 * s + Math.cos(an) * 1.6 * s), R(cy - 1.2 * s + Math.sin(an) * 1.6 * s), P.chalk); }
  for (let i = -4; i <= 4; i++) put(c, R(cx + i * s * 0.6), R(cy + 2.2 * s + Math.sin(i + seed) * s * 0.5), P.chalk);
  put(c, R(cx + 2.5 * s), R(cy - 1.4 * s), hex("#F4CA50")); put(c, R(cx + 2.5 * s) + 1, R(cy - 1.4 * s), hex("#F4CA50"));
  // legs
  for (const dx of [-0.16, 0.16]) { const [a, b] = C.P(X + dx, 0.45, Z), [, d] = C.P(X + dx * 1.3, 0, Z + 0.1); for (let y = R(b); y < R(d); y++) put(c, R(a + (dx > 0 ? 1 : -1) * (y - b) * 0.15), y, P.wood[1]); }
}
/** the table scale with a round dial (screen-drawn on the counter at X, Z) */
export function tableScale(c, C, X, Z, Y = 0.85, o = {}) {
  const k = C.k(Z); box3(c, C, X - 0.2, X + 0.2, Y, Y + 0.08, Z - 0.18, Z + 0.12, { front: (x, y) => pk(P.pole, 0.75, x, y), top: (x, y) => pk(P.pole, 0.9, x, y), side: (x, y) => pk(P.pole, 0.4, x, y) });
  box3(c, C, X - 0.08, X + 0.08, Y + 0.08, Y + 0.22, Z - 0.05, Z + 0.05, { front: (x, y) => pk(P.pole, 0.55, x, y), side: (x, y) => pk(P.pole, 0.3, x, y) });
  const [dx, dy] = C.P(X, Y + 0.34, Z + 0.06), r = 0.13 * k;
  for (let j = -R(r) - 1; j <= R(r) + 1; j++) for (let i = -R(r) - 1; i <= R(r) + 1; i++) { const q = Math.hypot(i, j) / r; if (q > 1.08) continue; put(c, R(dx + i), R(dy + j), q > 0.86 ? (q > 1 ? P.iron[0] : hex("#C83A2E")) : pk(RG(["#C8C4B8", "#E8E4DA", "#FFFFF8"]), 0.8 - j / r * 0.2, R(dx + i), R(dy + j))); }
  const an = -Math.PI / 2 + (o.needle ?? 0.6) * Math.PI * 1.6 - Math.PI * 0.8; for (let s = 0; s < r * 0.8; s++) put(c, R(dx + Math.cos(an) * s), R(dy + Math.sin(an) * s), P.iron[0]);
  // the pan
  const [px, py] = C.P(X, Y + 0.5, Z); for (let i = -R(0.2 * k); i <= R(0.2 * k); i++) { put(c, R(px + i), R(py), P.pole[3]); put(c, R(px + i * 0.85), R(py + 1), P.pole[1]); }
}
/** a watermelon lying on the ground (or anywhere) at world (X, Y bottom, Z), diameter dm (m) */
export function melon3(c, C, X, Y, Z, dm = 0.26, a = 1, spin = 0) {
  const k = C.k(Z), [sx, sy] = C.P(X, Y + dm / 2, Z), rx = (dm / 2) * k * 1.12, ry = (dm / 2) * k * 0.95;
  for (let j = -Math.ceil(ry) - 1; j <= Math.ceil(ry) + 1; j++) for (let i = -Math.ceil(rx) - 1; i <= Math.ceil(rx) + 1; i++) {
    const x = R(sx + i), y = R(sy + j); if (a < 1 && a <= BY[(y & 3) * 4 + (x & 3)]) continue;
    const q = (i * i) / (rx * rx) + (j * j) / (ry * ry); if (q > 1.18) continue; if (q > 1) { put(c, x, y, MELON.rind[0]); continue; }
    const u = i / rx, v = j / ry, z = Math.sqrt(Math.max(0, 1 - q)), st = Math.sin((Math.asin(Math.max(-1, Math.min(1, v))) * 3.2 + Math.sin(u * 4 + spin) * 0.5 + spin) * 2.6);
    const lit = 0.58 - u * 0.18 - v * 0.34 + z * 0.22;
    put(c, x, y, st > 0.35 ? pk(MELON.stripe, lit * 0.9, x, y) : pk(MELON.rind, lit, x, y));
  }
  if (rx > 4 && a > 0.5) { put(c, R(sx - rx * 0.4), R(sy - ry * 0.5), MELON.rind[4]); put(c, R(sx - rx * 0.4) + 1, R(sy - ry * 0.5), MELON.rind[4]); }
}
export function drawStall(c, C, i, t, o = {}) {
  const [X0, X1] = stallX(i), ZB = MK.ZB, ZA = MK.ZA, hB = 2.85, hF = 2.3, aw = AWN[(((i * 3 + Math.floor(h2(i, 3, 5) * 2)) % AWN.length) + AWN.length) % AWN.length], goods = [0, 1, 2, 3].map((q) => GOODS[Math.floor(h2(i, q, 17) * GOODS.length)]);
  if (C.sx(X1, ZA) < -40 || C.sx(X0, ZA) > c.w + 40) return;
  // back canvas + side canvas (in the awning's shade)
  quad(c, C, [[X0, 0, ZB], [X1, 0, ZB], [X1, hB, ZB], [X0, hB, ZB]], (x, y) => pk(P.canvas, 0.35 + 0.15 * (((C.wX(x, ZB) * 3) % 1) < 0.5 ? 1 : 0), x, y));
  // crates on a back shelf
  box3(c, C, X0 + 0.1, X1 - 0.1, 1.05, 1.12, ZB, ZB + 0.45, { front: (x, y) => pk(P.wood, 0.3, x, y), top: (x, y) => pk(P.wood, 0.45, x, y) });
  for (let q = 0; q < 3; q++) crate(c, C, X0 + 0.2 + q * 0.9, X0 + 0.95 + q * 0.9, 1.12, ZB + 0.05, ZB + 0.42, GOODS[Math.floor(h2(i, q, 23) * GOODS.length)], i * 7 + q, 0.07);
  // the vendor behind the counter
  const V = o.vendor ?? VENDORS[i % VENDORS.length];
  if (V && !o.noVendor) { const vx = X0 + 1.1 + 0.9 * rnd(i * 3 + 1), [fx, fy] = C.P(vx, 0, -1.25); drawPerson(c, fx, fy, C.k(-1.25), t, V, { dir: rnd(i * 5) > 0.5 ? 1 : -1, turn: 0.3 * Math.sin(t * 0.7 + i), mouth: 0, ...(o.pose || {}) }, { a: 1 }); }
  if (o.behind) o.behind(c, C);
  // the counter: plank front (or cloth), top, side
  const clothed = rnd(i * 29 + 2) > 0.5, CL = clothed ? AWN[(i + 3) % AWN.length][0] : null;
  box3(c, C, X0, X1, 0, 0.85, MK.ZC0, MK.ZC1, {
    front: (x, y) => { const Y = C.wY(y, MK.ZC1); if (clothed) return Y > 0.62 ? pk(CL, 0.55 + 0.25 * (((C.wX(x, 0) * 4) % 1) < 0.5 ? 1 : 0) - (Y > 0.8 ? 0 : 0.1), x, y) : pk(P.wood, 0.3, x, y); const pl = Math.floor(Y / 0.17); return pk(P.wood, ((Y / 0.17) % 1) < 0.12 ? 0.15 : 0.5 + 0.18 * (h2(pl, i, 3) - 0.5) + 0.06 * (h2(R(C.wX(x, 0) * 20), pl, 8) - 0.5), x, y); },
    top: (x, y) => pk(P.wood, 0.72, x, y), side: (x, y) => pk(P.wood, 0.35, x, y) });
  // crates on the counter top (fruit domes)
  if (!o.noCrates) for (let q = 0; q < 3; q++) { const cx0 = X0 + 0.12 + q * 0.95; crate(c, C, cx0, cx0 + 0.82, 0.85, MK.ZC0 + 0.08, MK.ZC1 - 0.06, goods[q], i * 11 + q, 0.12); }
  if (o.scale) tableScale(c, C, X1 - 0.35, -0.3, 0.85, o.scale);
  // a slate and a crate pile on the ground in front of the counter
  if (rnd(i * 31 + 1) > 0.45) slate(c, C, X0 + 0.25 + 2.5 * rnd(i * 37), 0.25, i);
  if (o.front) o.front(c, C);
  // poles
  for (const [px, pz] of [[X0 + 0.04, ZA - 0.05], [X1 - 0.04, ZA - 0.05]]) { const [x, y0] = C.P(px, hF, pz), [, y1] = C.P(px, 0, pz), w = Math.max(1, R(0.05 * C.k(pz))); for (let y = R(y0); y < R(y1); y++) for (let q = 0; q < w; q++) put(c, R(x) + q, y, q === 0 ? P.pole[3] : P.pole[1]); }
  // awning: sloped striped canvas (top visible from the 3 m camera), then the scalloped valance
  const stripe = (x, y, lit) => { const X = C.wX(x, ZA), s = ((Math.floor((X - X0) / 0.3) % 2) + 2) % 2; return pk(aw[s], lit, x, y); };
  quad(c, C, [[X0 - 0.1, hB, ZB], [X1 + 0.1, hB, ZB], [X1 + 0.1, hF, ZA], [X0 - 0.1, hF, ZA]], (x, y) => stripe(x, y, 0.82));
  const vk = C.k(ZA), [vx0, vy0] = C.P(X0 - 0.1, hF, ZA), [vx1] = C.P(X1 + 0.1, hF, ZA), vh = 0.26 * vk, sw = 0.3 * vk;
  for (let x = Math.max(0, R(vx0)); x < Math.min(c.w, R(vx1)); x++) { const u = (x - vx0) / sw, scal = vh * (0.72 + 0.28 * Math.sqrt(Math.max(0, 1 - (2 * (u % 1) - 1) ** 2))), s = ((Math.floor(u) % 2) + 2) % 2;
    for (let y = R(vy0); y < R(vy0 + scal); y++) put(c, x, y, pk(aw[s], y - vy0 < 2 ? 0.95 : 0.55 - 0.25 * ((y - vy0) / vh), x, y));
    put(c, x, R(vy0 + scal), aw[s][0]); }
}

/** the whole market for camera C: backdrop, stalls in view (sorted), o.stallOpts(i) → per-stall options */
export function drawMarket(c, C, t, o = {}) {
  drawBackdrop(c, C);
  const xa = C.wX(-60, 0), xb = C.wX(600, 0), i0 = Math.floor(xa / MK.STEP) - 1, i1 = Math.ceil(xb / MK.STEP) + 1;
  for (let i = i0; i <= i1; i++) { if (o.skip && o.skip(i)) continue; drawStall(c, C, i, t, o.stallOpts ? o.stallOpts(i) || {} : {}); }
}
