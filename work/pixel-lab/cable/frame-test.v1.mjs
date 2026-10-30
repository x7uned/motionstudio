// Test frame for «How your text crosses the ocean» (pixel film, isometric).
// Opening shot: one isometric slab of the Atlantic, not to scale — New York (friend, sunset) on the far end,
// London (you, night) on the near end, the ocean cut open in front so the cable on the sea floor is visible.
// 540×960 grid ×2 nearest → 1080×1920; characters, avatar and flags are full-resolution overlays.
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex } from "../../../renderer/pixel/raster.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ME = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const BUDDY = "/Users/rv/Downloads/Pixel Buddy/spritesheet.png";
const GW = 540, GH = 960, S = 2, TOP = 190, K = "#000000";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", YL = "#FAE375", MU = "#959595", L = "#E0CDF8", P = "#8D59DA";
const p3 = "#3B2C5C", p5 = "#6E4FB0", p7 = "#B08AE8";
const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sstep = (x) => x * x * (3 - 2 * x);
const noise = (x, seed = 0) => { const i = Math.floor(x), f = x - i; return lerp(rnd(i * 7 + seed), rnd((i + 1) * 7 + seed), sstep(f)); };
// dithered blend between two colours in `steps` levels
const dmix = (a, b, k, x, y, steps = 4) => { const s = clamp01(k) * steps, lo = Math.floor(s); return mix(a, b, (s - lo > bayer(x, y) ? lo + 1 : lo) / steps); };
const ramp = (stops, v, x, y) => { v = clamp01(v); const n = stops.length - 1, i = Math.min(n - 1, Math.floor(v * n)); return dmix(stops[i], stops[i + 1], v * n - i, x, y); };

const c = new Canvas(GW, GH, K);

// ---------------------------------------------------------------- sky: dusk over New York (left) → night over London (right)
const DUSK = [[190, "#1A1030"], [250, "#3A1D4E"], [300, "#7A3360"], [340, "#C9586B"], [368, "#F2A06A"], [400, "#F6C27E"]];
const duskAt = (x, y) => { for (let i = 0; i + 1 < DUSK.length; i++) if (y <= DUSK[i + 1][0]) return dmix(DUSK[i][1], DUSK[i + 1][1], (y - DUSK[i][0]) / (DUSK[i + 1][0] - DUSK[i][0]), x, y); return hex(DUSK[DUSK.length - 1][1]); };
for (let y = TOP; y < GH; y++) for (let x = 0; x < GW; x++) {
  const night = dmix("#0C0A20", "#1C1842", (y - TOP) / 420, x, y), kx = clamp01((360 - x - (y - TOP) * 0.25) / 300);
  c.px(x, y, dmix(night, duskAt(x, y), kx, x + 1, y, 5));
}
for (let i = 0; i < 140; i++) { const x = R(rnd(i * 3 + 1) * GW), y = R(TOP + 4 + rnd(i * 5 + 2) * 260); if (x < 230 + (y - TOP) * 0.3) continue; c.px(x, y, rnd(i * 11) < 0.15 ? IV : rnd(i * 13) < 0.5 ? L : "#5A5480"); if (rnd(i * 17) < 0.06) { c.px(x - 1, y, "#5A5480"); c.px(x + 1, y, "#5A5480"); c.px(x, y - 1, "#5A5480"); c.px(x, y + 1, "#5A5480"); } }

// ---------------------------------------------------------------- the Atlantic slab
const U = 3.6, OX = 122.5, OY = 300, LEN = 110, D = 28, NYC1 = 22, LON0 = 88, LAND = 5;
const P3 = (x, y, z) => [OX + (x - y) * U, OY + ((x + y) / 2 - z) * U];
const quad = (pts, col, shade) => c.poly(pts.map((p) => P3(...p)), col, shade);
function box(x, y, z, w, d, h, { top, left, right }, g = c) {
  g.poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]].map((p) => P3(...p)), left);
  g.poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]].map((p) => P3(...p)), right);
  g.poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]].map((p) => P3(...p)), top);
}
// windows on the two visible faces of a box
function windows(x, y, z, w, d, h, col, seed, { step = 1.3, rows = 2.2, on = 0.55 } = {}) {
  for (let zz = z + 1.6; zz < z + h - 0.8; zz += rows) {
    for (let xx = x + 0.7; xx < x + w - 0.4; xx += step) if (rnd(seed + xx * 31 + zz * 7) < on) { const [sx, sy] = P3(xx, y + d, zz); c.px(R(sx), R(sy), col); c.px(R(sx), R(sy) - 1, col); }
    for (let yy = y + 0.7; yy < y + d - 0.4; yy += step) if (rnd(seed + yy * 29 + zz * 13 + 5) < on * 0.7) { const [sx, sy] = P3(x + w, yy, zz); c.px(R(sx), R(sy), mix(col, O, 0.35)); c.px(R(sx), R(sy) - 1, mix(col, O, 0.35)); }
  }
}

// sea floor profile along the route (z, negative = below the surface): shelf, slope, abyss, Mid-Atlantic Ridge, abyss, slope, shelf
const BED = [[22, -3], [25, -6], [28, -14], [32, -60], [36, -100], [42, -107], [48, -103], [51, -82], [53, -66], [55, -74], [57, -60], [59, -78], [62, -96], [68, -99], [73, -94], [77, -62], [81, -20], [84, -8], [88, -3]];
function seabed(x) {
  if (x <= NYC1 || x >= LON0) return LAND;
  let i = 0; while (i < BED.length - 2 && BED[i + 1][0] < x) i++;
  const [x0, z0] = BED[i], [x1, z1] = BED[i + 1], k = sstep(clamp01((x - x0) / (x1 - x0)));
  const ridge = x > 49 && x < 61 ? 3.2 : 1.2;
  return lerp(z0, z1, k) + (noise(x * 1.7, 3) - 0.5) * ridge * (x > 25 && x < 85 ? 1 : 0.2);
}
const WATER = ["#4A6BD0", "#3653AE", "#283F8C", "#1E306E", "#172454", "#111B40", "#0C1330", "#080D22"];
function rock(x, z, zTop, sx, sy, dark = 0) {
  const dz = zTop - z;
  let col;
  if (zTop >= LAND - 0.01 && dz < 0.9) col = x < 50 ? "#4F6A4A" : "#33473D";                       // grass / park on land
  else if (dz < 1.4) col = zTop >= LAND - 0.01 ? "#6A5246" : "#6E6178";                                // soil / sediment line
  else { const band = Math.floor((z + 1.6 * Math.sin(x * 0.45) + 400) / 6.5) % 3; col = ["#3E2E44", "#35283C", "#2D2134"][band]; }
  col = dmix(col, "#120C1A", clamp01((-z - 20) / 160) * 0.85 + dark, sx, sy);
  if (dz >= 1.4 && rnd(R(sx) * 977 + R(sy) * 131) < 0.035) col = mix(col, "#7A6A84", 0.35);         // grit
  return col;
}
function waterAt(x, z, sx, sy) {
  const d = -z;
  let col = ramp(WATER, d / 104, sx, sy);
  // sun shafts near the surface (fade with depth)
  const shaft = ((x * 2.4 + z * 0.55) % 9 + 9) % 9;
  if (d < 30 && shaft < 1.8 && (1 - d / 30) * 0.5 > bayer(R(sx), R(sy))) col = mix(col, "#7FA0F0", 0.25);
  return col;
}

// top surfaces: sea, then the two land blocks
quad([[NYC1, 0, 0], [LON0, 0, 0], [LON0, D, 0], [NYC1, D, 0]], null, (sx, sy) => {
  const a = (sx - OX) / U, b = 2 * (sy - OY) / U, x = (a + b) / 2, y = (b - a) / 2;
  let col = dmix("#4C4A9A", "#1C2A66", (x - NYC1) / 40, sx, sy);                       // pink-violet dusk reflection → night blue
  const w = Math.sin(x * 1.25 + y * 0.35) + 0.6 * Math.sin(y * 1.9 - x * 0.45);
  if (w > 1.15) col = mix(col, x < 50 ? "#E6A0B8" : "#6F8BE0", 0.55);
  else if (w < -1.3) col = mix(col, O, 0.25);
  if (x < NYC1 + 1.3 || x > LON0 - 1.3) col = mix(col, "#CFD8FF", 0.5);                // surf at both coasts
  return col;
});
box(0, 0, 0, NYC1, D, LAND, { top: "#5A6E55", left: "#000", right: "#6B5866" });
box(LON0, 0, 0, LEN - LON0, D, LAND, { top: "#33473D", left: "#000", right: "#000" });
// quay edges
for (let y = 0; y <= D; y += 0.25) { const [sx, sy] = P3(NYC1, y, LAND); c.px(R(sx), R(sy), "#A79AB0"); const [lx, ly] = P3(LON0, y, LAND); c.px(R(lx), R(ly), "#5E6E66"); }

// the cut-open front face (plane y = D) — land, water, sea floor
const F0 = R(P3(0, D, 0)[0]), F1 = R(P3(LEN, D, 0)[0]);
for (let sx = F0; sx < F1; sx++) {
  const x = (sx + 0.5 - OX) / U + D, zTopSurf = x <= NYC1 || x >= LON0 ? LAND : 0, bed = seabed(x);
  const syTop = Math.ceil(OY + ((x + D) / 2 - zTopSurf) * U);
  for (let sy = syTop; sy < GH; sy++) {
    const z = (x + D) / 2 - (sy + 0.5 - OY) / U;
    let col = z > bed ? waterAt(x, z, sx, sy) : rock(x, z, bed, sx, sy);
    if (sy === syTop && zTopSurf === 0) col = hex("#9DB5FF");
    if (sx === F0) col = mix(col, IV, 0.25);
    c.px(sx, sy, col);
  }
}
// right face (plane x = LEN) under London
for (let sx = F1; sx <= R(P3(LEN, 0, 0)[0]); sx++) {
  const y = LEN - (sx + 0.5 - OX) / U, syTop = Math.ceil(OY + ((LEN + y) / 2 - LAND) * U);
  for (let sy = syTop; sy < GH; sy++) { const z = (LEN + y) / 2 - (sy + 0.5 - OY) / U; c.px(sx, sy, rock(LEN + y * 0.3, z, LAND, sx, sy, 0.22)); }
}
for (let sy = R(P3(LEN, D, LAND)[1]); sy < GH; sy++) c.px(F1, sy, mix(c.get(F1, sy), IV, 0.2));

// sea life on the cut face
const FP = (x, z) => P3(x, D, z);
for (let i = 0; i < 7; i++) { const [sx, sy] = FP(38 + (i % 4) * 1.6 + rnd(i) * 0.8, -10 - Math.floor(i / 4) * 2.2 - rnd(i + 9) * 1.2); c.rect(R(sx), R(sy), 3, 1, "#9FB6F0"); c.px(R(sx) + 3, R(sy) - 1, "#9FB6F0"); c.px(R(sx) + 3, R(sy) + 1, "#9FB6F0"); }
{ const [jx, jy] = FP(68, -34); c.tint(R(jx) - 8, R(jy) - 8, 16, 18, (x, y) => 0.5 - Math.hypot(x - jx, y - jy) / 16, "#D07AC8", 4); c.ellipse(R(jx), R(jy), 3, 2, "#E9A6E0"); for (let k = -2; k <= 2; k += 2) for (let j = 1; j < 7; j++) if (j % 2 || k === 0) c.px(R(jx) + k + (j % 3 === 0 ? 1 : 0), R(jy) + 2 + j, "#B06AAE"); }
{ const [ax, ay] = FP(45, -94); c.tint(R(ax) - 10, R(ay) - 10, 20, 20, (x, y) => 0.55 - Math.hypot(x - ax, y - ay) / 12, "#F6E79A", 4); c.ellipse(R(ax) + 6, R(ay) + 6, 5, 3, "#05070F"); c.line(R(ax) + 3, R(ay) + 4, R(ax), R(ay), "#05070F"); c.px(R(ax), R(ay), YL); c.px(R(ax) + 8, R(ay) + 5, "#3A4A80"); }
for (let i = 0; i < 9; i++) { const [bx, by] = FP(55.5 + rnd(i * 3) * 2, -2 - i * 1.4 - rnd(i * 5)); c.px(R(bx), R(by), "#AFC4FF"); }

// the cable on the sea floor, buried into both shores up to the landing stations
const CABLE = [];
for (let x = 19; x <= 91; x += 0.08) {
  let z;
  if (x < NYC1 + 1) z = lerp(LAND - 1.8, seabed(NYC1 + 1.5) + 0.7, sstep(clamp01((x - 19) / 4)));
  else if (x > LON0 - 1) z = lerp(seabed(LON0 - 1.5) + 0.7, LAND - 1.8, sstep(clamp01((x - (LON0 - 1)) / 4)));
  else z = seabed(x) + 0.7;
  CABLE.push(FP(x, z));
}
for (const [sx, sy] of CABLE) { c.px(R(sx), R(sy), "#1A1622"); c.px(R(sx), R(sy) + 1, "#0E0B14"); c.px(R(sx), R(sy) - 1, "#585070"); }
// faint glow + resting light pulses (the hook: "the real path")
for (let i = 0; i < CABLE.length; i += 1) { const [sx, sy] = CABLE[i]; if (Math.floor(i / 9) % 10 === 0) { c.px(R(sx), R(sy) - 1, YL); c.px(R(sx), R(sy), Y); } }
c.tint(0, TOP, GW, GH - TOP, (x, y) => { let best = 99; for (let i = 0; i < CABLE.length; i += 12) { const d = Math.abs(CABLE[i][0] - x) + Math.abs(CABLE[i][1] - y); if (d < best) best = d; } return best < 7 ? 0.22 * (1 - best / 7) : 0; }, "#F4CA50", 4);
// repeaters every ~7 units
for (let x = 27; x < 86; x += 6.5) { const [sx, sy] = FP(x, seabed(x) + 0.7); c.rect(R(sx) - 2, R(sy) - 2, 5, 3, "#3A3450"); c.rect(R(sx) - 1, R(sy) - 2, 3, 1, "#77709A"); c.px(R(sx), R(sy) - 1, "#7FE0FF"); }

// ---------------------------------------------------------------- New York (dusk): skyline, Statue of Liberty, landing station
const DUSKB = { top: "#9A6A8C", left: "#C9707E", right: "#4A2F58" }, DUSKB2 = { top: "#7E5A86", left: "#A6627E", right: "#3C2850" };
for (const [x, y, w, d, h, m, s] of [[1, 1, 4, 4, 21, DUSKB2, 3], [12, 1, 5, 4, 18, DUSKB, 5], [17, 2, 3, 3, 12, DUSKB2, 7], [2, 7, 4, 4, 13, DUSKB, 9], [8, 9, 4, 3, 9, DUSKB2, 11], [13, 8, 3, 3, 7, DUSKB, 13]]) {
  if (x === 12) { // Empire-State-like tower with setbacks and a spire (drawn in back-to-front order)
    box(6, 2, LAND, 4, 4, 26, DUSKB); windows(6, 2, LAND, 4, 4, 26, YL, 21); box(6.8, 2.8, LAND + 26, 2.4, 2.4, 4, DUSKB); box(7.5, 3.5, LAND + 30, 1, 1, 2, DUSKB);
    const [sx, sy] = P3(8, 4, LAND + 32); c.rect(R(sx), R(sy) - 10, 1, 10, "#D8C4E0"); c.px(R(sx), R(sy) - 11, "#FF6A6A");
  }
  box(x, y, LAND, w, d, h, m); windows(x, y, LAND, w, d, h, YL, s * 101);
}
// Statue of Liberty on its pedestal at the harbour corner
{ box(2.2, 22.2, LAND, 2.2, 2.2, 3, { top: "#9A8FA8", left: "#B9AFC2", right: "#6E6680" }); const [sx, sy] = P3(3.3, 23.3, LAND + 3);
  const G = "#5FB3A1", G2 = "#3E8576"; c.rect(R(sx) - 2, R(sy) - 14, 5, 14, G); c.rect(R(sx) + 1, R(sy) - 14, 2, 14, G2); c.rect(R(sx) - 1, R(sy) - 18, 3, 4, G); c.px(R(sx) - 2, R(sy) - 19, G); c.px(R(sx), R(sy) - 20, G); c.px(R(sx) + 2, R(sy) - 19, G);
  c.rect(R(sx) - 4, R(sy) - 24, 2, 11, G); c.rect(R(sx) - 5, R(sy) - 27, 3, 3, YL); c.px(R(sx) - 4, R(sy) - 28, "#FFF3B0"); }
box(17.5, 23.5, LAND, 3, 3, 2.4, { top: "#B4A9C2", left: "#8F84A2", right: "#5E5674" }); // landing station
{ const [sx, sy] = P3(17.5, 26.5, LAND + 1.2); c.rect(R(sx) + 3, R(sy) - 2, 3, 2, YL); }

// ---------------------------------------------------------------- London (night): Westminster, the clock tower, row houses, a phone mast
const NIGHT = { top: "#4A4058", left: "#5C4E5E", right: "#2E2738" }, STONE = { top: "#7A6A5A", left: "#8E7A62", right: "#4A3E3A" };
for (let i = 0; i < 4; i++) { const x = 89.5 + i * 3.4; box(x, 9, LAND, 3, 3, 4, NIGHT); quad([[x, 9, LAND + 4], [x + 3, 9, LAND + 4], [x + 3, 10.5, LAND + 6], [x, 10.5, LAND + 6]], "#3A3048"); quad([[x, 10.5, LAND + 6], [x + 3, 10.5, LAND + 6], [x + 3, 12, LAND + 4], [x, 12, LAND + 4]], "#52445E"); windows(x, 9, LAND, 3, 3, 4, "#FFC86A", 300 + i * 17, { step: 1.2, rows: 1.8, on: 0.6 }); }
box(93, 1.5, LAND, 11, 3, 6, STONE); windows(93, 1.5, LAND, 11, 3, 6, "#FFD27A", 501, { step: 1.1, rows: 2, on: 0.7 });
for (let x = 93.5; x < 104; x += 1.5) { const [sx, sy] = P3(x, 4.5, LAND + 6); c.rect(R(sx), R(sy) - 3, 1, 3, "#8E7A62"); c.px(R(sx), R(sy) - 4, "#A89070"); }
box(104.5, 5.5, LAND, 2.6, 2.6, 22, STONE); windows(104.5, 5.5, LAND, 2.6, 2.6, 22, "#FFD27A", 777, { step: 1.2, rows: 2.4, on: 0.35 });
box(104.2, 5.2, LAND + 22, 3.2, 3.2, 4, { top: "#9A8466", left: "#A88E6A", right: "#5A4A3E" });
for (const [fx, fy, face] of [[105.8, 8.4, "L"], [107.4, 6.8, "R"]]) { const [sx, sy] = P3(fx, fy, LAND + 24); c.disc(R(sx), R(sy), 3, face === "L" ? "#FFF3C4" : "#E6CE8E"); c.px(R(sx), R(sy) - 1, "#3A2E28"); c.px(R(sx) + 1, R(sy), "#3A2E28"); c.tint(R(sx) - 10, R(sy) - 10, 20, 20, (x, y) => 0.35 - Math.hypot(x - sx, y - sy) / 26, "#FFE9A0", 4); }
quad([[104.2, 5.2, LAND + 26], [107.4, 5.2, LAND + 26], [105.8, 6.8, LAND + 33]], "#5A6878"); quad([[104.2, 8.4, LAND + 26], [107.4, 8.4, LAND + 26], [105.8, 6.8, LAND + 33]], "#3E4A5A"); quad([[107.4, 5.2, LAND + 26], [107.4, 8.4, LAND + 26], [105.8, 6.8, LAND + 33]], "#2C3644");
// phone mast (the first hop of the message)
{ const [bx, by] = P3(95.5, 15.5, LAND), [tx, ty] = P3(95.5, 15.5, LAND + 15); c.line(R(bx) - 2, R(by), R(tx), R(ty), "#8C88A0"); c.line(R(bx) + 2, R(by), R(tx), R(ty), "#6C6880"); for (let k = 0.15; k < 1; k += 0.18) { const y = R(lerp(by, ty, k)), hw = R(2 * (1 - k)); c.line(R(bx) - hw, y, R(bx) + hw, y - 3, "#6C6880"); }
  c.rect(R(tx) - 2, R(ty) + 2, 1, 3, "#B8B4C8"); c.rect(R(tx) + 2, R(ty) + 2, 1, 3, "#B8B4C8"); c.px(R(tx), R(ty) - 1, "#FF5A5A"); c.tint(R(tx) - 6, R(ty) - 7, 12, 12, (x, y) => 0.4 - Math.hypot(x - tx, y - ty + 1) / 10, "#FF5A5A", 3); }
for (const x of [93, 98.5, 104]) { const [sx, sy] = P3(x, 26.5, LAND); c.rect(R(sx), R(sy) - 9, 1, 9, "#4A4458"); c.rect(R(sx) - 1, R(sy) - 10, 3, 1, YL); c.tint(R(sx) - 7, R(sy) - 10, 14, 12, (xx, yy) => 0.28 - Math.hypot(xx - sx, yy - sy + 6) / 24, "#FFD27A", 3); }
box(89.2, 23.5, LAND, 3, 3, 2.4, { top: "#7A7088", left: "#625872", right: "#3E3650" }); // landing station
{ const [sx, sy] = P3(89.2, 26.5, LAND + 1.2); c.rect(R(sx) + 3, R(sy) - 2, 3, 2, YL); }

// ship crossing the ocean surface, heading west, with its wake
{ const sx0 = 54, sy0 = 11; for (let k = 0; k < 14; k++) { const [wx, wy] = P3(sx0 + 9 + k * 0.9, sy0 + 1.5 + ((k % 2) ? 0.9 : -0.9) * (k / 14) * 1.6, 0); c.px(R(wx), R(wy), "#9DB5FF"); }
  box(sx0, sy0, -0.3, 9, 3, 1.4, { top: "#5A4A6A", left: "#8A3A4A", right: "#5A2434" });
  for (let i = 0; i < 4; i++) box(sx0 + 1 + i * 1.6, sy0 + 0.5, 1.1, 1.4, 2, 1.1, [{ top: "#E0A040", left: "#B07020", right: "#704A18" }, { top: "#5AA0C0", left: "#3A7A98", right: "#265468" }][i % 2]);
  box(sx0 + 7.2, sy0 + 0.4, 1.1, 1.6, 2.2, 2.4, { top: "#E8E2F0", left: "#C8C0D6", right: "#8C84A0" }); const [lx, ly] = P3(sx0 + 7.8, sy0 + 2.6, 2.8); c.px(R(lx), R(ly), YL); }

// ---------------------------------------------------------------- the characters' footing
const FRIEND_AT = P3(13.5, 18.5, LAND), ME_AT = P3(100.5, 20.5, LAND);
for (const [x, y, rx] of [[FRIEND_AT[0], FRIEND_AT[1], 15], [ME_AT[0], ME_AT[1], 17]]) c.tint(R(x - rx), R(y - 4), rx * 2, 8, (xx, yy) => 0.6 - Math.hypot((xx - x) / rx, (yy - y) / 3.2) * 0.6, O, 3);

// ---------------------------------------------------------------- the hook: "YOU UP?" leaves your phone; a dotted guess toward a satellite
function bubble(x, y, txt) {
  const w = c.measure(MAIN, txt, { scale: 2 }) + 18, h = 26;
  c.rrect(x - 1, y - 1, w + 2, h + 2, O, 3); c.rrect(x, y, w, h, IV, 3); c.rect(x + 2, y + h - 3, w - 4, 1, "#D8D2E8");
  for (let j = 0; j < 7; j++) { c.rect(x + w - 22 + j, y + h + j, 7 - j, 1, IV); c.px(x + w - 22 + j - 1, y + h + j, O); c.px(x + w - 15, y + h + j, O); }
  c.text(MAIN, txt, x + 9, y + 7, O, { scale: 2 });
}
const SAT = [470, 222];
for (let i = 0; i <= 60; i++) { const k = i / 60, x = (1 - k) ** 2 * 372 + 2 * (1 - k) * k * 410 + k * k * (SAT[0] - 12), y = (1 - k) ** 2 * 350 + 2 * (1 - k) * k * 236 + k * k * (SAT[1] + 8); if (i % 4 < 2) c.rect(R(x), R(y), 2, 2, k < 0.8 ? L : mix(L, "#5A5480", (k - 0.8) * 4)); }
{ const [x, y] = SAT; c.rect(x - 4, y - 3, 8, 7, "#D9B44A"); c.rect(x - 3, y - 2, 6, 1, "#F6DE84"); c.rect(x + 4, y, 2, 1, "#8C88A0"); c.rect(x - 6, y, 2, 1, "#8C88A0");
  for (const sx of [x - 18, x + 6]) { c.rect(sx, y - 3, 12, 7, "#2E4AA8"); for (let k = 0; k < 12; k += 3) c.rect(sx + k, y - 3, 1, 7, "#5C7FE0"); c.rect(sx, y, 12, 1, "#5C7FE0"); }
  c.rect(x - 1, y - 7, 2, 4, "#B8B4C8"); c.px(x, y - 8, IV);
  c.text(MAIN, "?", x + 22, y - 18, Y, { scale: 3, shadow: O, shadowOffset: 1 }); }
bubble(296, 330, "YOU UP?");

// ---------------------------------------------------------------- city tags (flags are full-resolution overlays)
const overlays = [];
function tag(x, y, city, time, flag) {
  const w = 40 + Math.max(c.measure(MAIN, city, { scale: 2 }), c.measure(MAIN, time)) + 10, h = 38;
  c.rrect(x, y, w, h, p7, 2); c.rrect(x + 1, y + 1, w - 2, h - 2, p5, 2); for (let j = y + 2; j < y + h - 2; j++) c.rect(x + 2, j, w - 4, 1, mix(CARD, "#1D1430", (j - y) / h));
  c.text(MAIN, city, x + 40, y + 7, IV, { scale: 2 }); c.text(MAIN, time, x + 40, y + 24, MU);
  overlays.push({ file: flag, x: (x + 6) * S, y: (y + 8) * S, w: 56, h: 32 });
}
tag(156, 214, "NEW YORK", "6:04 PM", HERE + "media/flag-united-states-deb41780.png");
tag(362, 566, "LONDON", "11:04 PM", HERE + "media/flag-united-kingdom-a1eaca71.png");

// ---------------------------------------------------------------- header + karaoke caption (as in the dog film)
c.rect(0, 0, GW, TOP - 2, K);
for (let x = 0; x < GW; x++) for (let j = 0; j < 8; j++) if (bayer(x, TOP - 2 + j) > j / 8) c.px(x, TOP - 2 + j, K);
c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin(Math.PI * (y - 640) / 150), O, 6);
c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 }); c.text(MAIN, "62 S", 469 - c.measure(MAIN, "62 S", { scale: 2 }), 136, MU, { scale: 2 });
c.text(MAIN, "HOW TEXTS CROSS THE OCEAN", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
{ const words = ["YOU", "TEXT", "A", "FRIEND"], o = { scale: 3 }, gap = c.measure(MAIN, " ", o) + 3, total = words.reduce((s, w) => s + c.measure(MAIN, w, o), 0) + gap * (words.length - 1);
  let x = R(270 - total / 2); const y0 = 690;
  words.forEach((wd, i) => { const ww = c.measure(MAIN, wd, o), fill = [1, 1, 0.6, 0][i];
    c.text(MAIN, wd, x + 1, y0 + 1, O, o);
    c.text(MAIN, wd, x, y0, IV, { ...o, colorAt: (X) => (X >= x + ww * fill ? mix(IV, K, 0.62) : i < 2 ? IV : Y) });
    x += ww + gap; }); }

// ---------------------------------------------------------------- full-resolution overlays: avatar, characters, flags
async function cell(sheet, col, row) { const { data, info } = await sharp(sheet).extract({ left: col * 192, top: row * 208, width: 192, height: 208 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, data: new Uint8ClampedArray(data) }; }
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(ME).extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = new Uint8ClampedArray(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null; if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } } else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P); if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; } }
  return { w: size, h: size, data: out };
}
// you: "hands together" pose with a phone in the hands, screen lit
const me = await cell(ME, 0, 8);
{ const put = (x, y, col) => { const k = (y * me.w + x) * 4; me.data[k] = col[0]; me.data[k + 1] = col[1]; me.data[k + 2] = col[2]; me.data[k + 3] = 255; };
  for (let y = 112; y < 132; y++) for (let x = 92; x < 106; x++) { const edge = x === 92 || x === 105 || y === 112 || y === 131; put(x, y, edge ? hex("#141018") : y < 115 || y > 128 ? hex("#2A2434") : mix("#BFD4FF", "#7FA0F0", (y - 115) / 13)); }
  for (const [x, y] of [[95, 117], [96, 117], [97, 117], [98, 117], [95, 120], [96, 120], [97, 120], [99, 123], [100, 123], [101, 123], [102, 123]]) put(x, y, hex("#2E4AA8")); }
const friend = await cell(BUDDY, 0, 0);
const full = Buffer.alloc(1080 * 1920 * 3);
for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const o = ((y * 2 + dy) * 1080 + x * 2 + dx) * 3; full[o] = c.d[s]; full[o + 1] = c.d[s + 1]; full[o + 2] = c.d[s + 2]; } }
const blitFull = (img, X, Y) => { for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const k = (j * img.w + i) * 4, a = img.data[k + 3] / 255; if (a < 0.5) continue; const x = X + i, y = Y + j; if (x < 0 || y < 0 || x >= 1080 || y >= 1920) continue; const o = (y * 1080 + x) * 3; for (let q = 0; q < 3; q++) full[o + q] = img.data[k + q]; } };
blitFull(friend, R(FRIEND_AT[0] * S - 95), R(FRIEND_AT[1] * S - 198));
blitFull(me, R(ME_AT[0] * S - 99), R(ME_AT[1] * S - 201));
blitFull(await avatar(66), 76, 254);
for (const f of overlays) { const { data, info } = await sharp(f.file).resize(f.w, f.h, { fit: "fill", kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); blitFull({ w: info.width, h: info.height, data }, f.x, f.y); }
await sharp(full, { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + "frame-test.png");
console.log("frame-test.png");
