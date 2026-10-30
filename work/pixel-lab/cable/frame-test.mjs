// Test frame for «How your text crosses the ocean» (pixel film, isometric).
// Opening shot: one isometric slab of the Atlantic, not to scale — New York (friend, sunset) on the far end,
// London (you, night) on the near end, the ocean cut open in front so the cable on the sea floor is visible.
// 540×960 grid ×2 nearest → 1080×1920; characters, avatar and flags are full-resolution overlays.
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, hex } from "../../../renderer/pixel/raster.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ME = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const BUDDY = HERE + "assets/pixel-buddy-spritesheet.png"; // the friend: copy of ~/Downloads/Pixel Buddy
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
const DUSK = [[190, "#1A1030"], [236, "#3A1D4E"], [276, "#7A3360"], [312, "#C9586B"], [342, "#F2A06A"], [372, "#F6C27E"]];
const duskAt = (x, y) => { for (let i = 0; i + 1 < DUSK.length; i++) if (y <= DUSK[i + 1][0]) return dmix(DUSK[i][1], DUSK[i + 1][1], (y - DUSK[i][0]) / (DUSK[i + 1][0] - DUSK[i][0]), x, y); return hex(DUSK[DUSK.length - 1][1]); };
for (let y = TOP; y < GH; y++) for (let x = 0; x < GW; x++) {
  const night = dmix("#0C0A20", "#1C1842", (y - TOP) / 380, x, y), kx = clamp01((300 - x - (y - TOP) * 0.15) / 260);
  c.px(x, y, dmix(night, duskAt(x, y), kx, x + 1, y, 5));
}
for (let i = 0; i < 150; i++) { const x = R(rnd(i * 3 + 1) * GW), y = R(TOP + 4 + rnd(i * 5 + 2) * 330); if (x < 200 + (y - TOP) * 0.4) continue; c.px(x, y, rnd(i * 11) < 0.15 ? IV : rnd(i * 13) < 0.5 ? L : "#5A5480"); if (rnd(i * 17) < 0.06) { c.px(x - 1, y, "#5A5480"); c.px(x + 1, y, "#5A5480"); c.px(x, y - 1, "#5A5480"); c.px(x, y + 1, "#5A5480"); } }

// ---------------------------------------------------------------- the Atlantic slab (route along +x: New York → London), not to scale
const U = 3.2, LEN = 140, D = 28, NYC1 = 18, LON0 = 122, LAND = 5, OX = 90.6, OY = 338;
const P3 = (x, y, z) => [OX + (x - y) * U, OY + ((x + y) / 2 - z) * U];
// iso kit for any projection (the slab, or a city's own larger prop scale)
function kit(P) {
  const quad = (pts, col, shade) => c.poly(pts.map((p) => P(...p)), col, shade);
  const box = (x, y, z, w, d, h, { top, left, right }) => {
    quad([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], left);
    quad([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], right);
    quad([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top);
  };
  const windows = (x, y, z, w, d, h, col, seed, { step = 1.1, rows = 1.9, on = 0.55 } = {}) => {
    for (let zz = z + 1.4; zz < z + h - 0.7; zz += rows) {
      for (let xx = x + 0.6; xx < x + w - 0.4; xx += step) if (rnd(seed + R(xx * 31 + zz * 7)) < on) { const [sx, sy] = P(xx, y + d, zz); c.px(R(sx), R(sy), col); c.px(R(sx), R(sy) - 1, col); }
      for (let yy = y + 0.6; yy < y + d - 0.4; yy += step) if (rnd(seed + R(yy * 29 + zz * 13) + 5) < on * 0.7) { const [sx, sy] = P(x + w, yy, zz); c.px(R(sx), R(sy), mix(col, O, 0.4)); c.px(R(sx), R(sy) - 1, mix(col, O, 0.4)); }
    }
  };
  return { P, quad, box, windows };
}
const SL = kit(P3);
const UL = 4, local = (ax, ay) => { const [X0, Y0] = P3(ax, ay, LAND); return (x, y, z) => [X0 + (x - y) * UL, Y0 + ((x + y) / 2 - z) * UL]; };
const NY = kit(local(0, 0)), LD = kit(local(LON0, 0));

// sea floor along the route (z < 0): shelf, slope, abyss, Mid-Atlantic Ridge, abyss, slope, shelf
const BED = [[18, -3], [22, -6], [26, -11], [30, -42], [35, -100], [40, -120], [48, -126], [56, -124], [62, -114], [65.5, -100], [68.5, -106], [71.5, -97], [75, -112], [80, -118], [96, -114], [104, -104], [109, -60], [113, -18], [118, -8], [122, -3]];
function seabed(x) {
  if (x <= NYC1 || x >= LON0) return LAND;
  let i = 0; while (i < BED.length - 2 && BED[i + 1][0] < x) i++;
  const [x0, z0] = BED[i], [x1, z1] = BED[i + 1], k = sstep(clamp01((x - x0) / (x1 - x0)));
  const amp = x > 61 && x < 76 ? 2.4 : x > 24 && x < 116 ? 1.6 : 0.3;
  return lerp(z0, z1, k) + (noise(x * 1.9, 3) - 0.5) * amp;
}
const WATER = ["#5279DE", "#3D60C0", "#2F4CA2", "#253C86", "#1E316E", "#18285A", "#14214A", "#111C3E"];
function rock(x, z, zTop, sx, sy, dark = 0) {
  const dz = zTop - z, land = zTop >= LAND - 0.01;
  let col;
  if (land && dz < 0.8) col = x < 60 ? "#5E7A55" : "#3A5244";
  else if (dz < 1.5) col = land ? "#7A5C4C" : "#7C6E8E";
  else if (land && dz < 4) col = "#5E4640";
  else { const band = Math.floor((z + 1.4 * Math.sin(x * 0.35 + z * 0.05) + 600) / 5) % 4; col = ["#644A58", "#5A4252", "#503A4A", "#5E4655"][band]; }
  col = dmix(col, "#140E1C", clamp01((-z - 10) / 170) * 0.7 + dark, sx, sy);
  const pb = rnd(Math.floor(sx / 3) * 977 + Math.floor(sy / 2) * 131);
  if (dz >= 1.5 && pb < 0.05) col = mix(col, "#9A8AA6", 0.3); else if (dz >= 1.5 && pb > 0.97) col = mix(col, "#0E0A14", 0.35);
  if (!land && dz >= 1.5 && dz < 2.6 && rnd(R(sx) * 61 + R(sy) * 17) < 0.25) col = mix(col, "#9A8CA6", 0.5);   // sand under the sediment line
  return col;
}
function waterAt(x, z, sx, sy) {
  const d = -z;
  let col = ramp(WATER, d / 126, sx, sy);
  const shaft = ((x * 2.2 + z * 0.5) % 11 + 11) % 11;
  if (d < 40 && shaft < 2 && (1 - d / 40) * 0.55 > bayer(R(sx), R(sy))) col = mix(col, "#8FB0F8", 0.22);
  if (d > 70 && rnd(R(sx) * 7919 + R(sy) * 104729) < 0.006) col = mix(col, "#C8D4FF", 0.45);                 // marine snow
  return col;
}

// sea surface: long low swells along the route, dusk-pink near New York, night-blue near London
SL.quad([[NYC1, 0, 0], [LON0, 0, 0], [LON0, D, 0], [NYC1, D, 0]], null, (sx, sy) => {
  const a = (sx - OX) / U, b = 2 * (sy - OY) / U, x = (a + b) / 2, y = (b - a) / 2;
  let col = dmix("#5A4E9C", "#1E2C68", (x - NYC1) / 60, sx, sy);
  const crest = (y * 0.85 + 0.35 * Math.sin(x * 0.55) + 10) % 1;
  if (crest < 0.1 && noise(x * 0.9 + Math.floor(y * 0.85) * 13, 5) > 0.5) col = mix(col, x < 60 ? "#F0A8C0" : "#7A96E8", 0.6);
  else if (crest > 0.55 && crest < 0.62) col = mix(col, O, 0.18);
  if (x < NYC1 + 1.2 || x > LON0 - 1.2) col = mix(col, "#D8E0FF", 0.55);
  return col;
});
SL.box(0, 0, 0, NYC1, D, LAND, { top: "#5E7A55", left: "#000", right: "#7A6870" });
SL.box(LON0, 0, 0, LEN - LON0, D, LAND, { top: "#3A5244", left: "#000", right: "#000" });
for (let y = 0; y <= D; y += 0.2) { const [sx, sy] = P3(NYC1, y, LAND); c.px(R(sx), R(sy), "#B8ACC2"); const [lx, ly] = P3(LON0, y, LAND); c.px(R(lx), R(ly), "#6A7A70"); }

// cut-open front face (plane y = D): land, water, sea floor
const F0 = Math.max(0, R(P3(0, D, 0)[0])), F1 = R(P3(LEN, D, 0)[0]);
for (let sx = F0; sx < F1; sx++) {
  const x = (sx + 0.5 - OX) / U + D, top = x <= NYC1 || x >= LON0 ? LAND : 0, bed = seabed(x), syTop = Math.ceil(OY + ((x + D) / 2 - top) * U);
  for (let sy = syTop; sy < GH; sy++) {
    const z = (x + D) / 2 - (sy + 0.5 - OY) / U;
    let col = z > bed ? waterAt(x, z, sx, sy) : rock(x, z, bed, sx, sy);
    if (sy === syTop && top === 0) col = hex("#A8BEFF");
    c.px(sx, sy, col);
  }
}
for (let sx = F1; sx < GW; sx++) {
  const y = LEN - (sx + 0.5 - OX) / U; if (y < 0) break;
  const syTop = Math.ceil(OY + ((LEN + y) / 2 - LAND) * U);
  for (let sy = syTop; sy < GH; sy++) { const z = (LEN + y) / 2 - (sy + 0.5 - OY) / U; c.px(sx, sy, rock(LEN + y * 0.4, z, LAND, sx, sy, 0.2)); }
}
for (let sy = R(P3(LEN, D, LAND)[1]); sy < GH; sy++) c.px(F1, sy, mix(c.get(F1, sy), IV, 0.18));

// sea life on the cut face
const FP = (x, z) => P3(x, D, z);
for (let i = 0; i < 9; i++) { const [sx, sy] = FP(40 + (i % 5) * 1.5 + rnd(i) * 0.8, -12 - Math.floor(i / 5) * 2.4 - rnd(i + 9) * 1.2); c.rect(R(sx), R(sy), 3, 1, "#A9C0F4"); c.px(R(sx) + 3, R(sy) - 1, "#A9C0F4"); c.px(R(sx) + 3, R(sy) + 1, "#A9C0F4"); }
{ const [jx, jy] = FP(86, -42); c.tint(R(jx) - 9, R(jy) - 9, 18, 20, (x, y) => 0.5 - Math.hypot(x - jx, y - jy) / 16, "#D07AC8", 4); c.ellipse(R(jx), R(jy), 4, 2, "#E9A6E0"); c.rect(R(jx) - 3, R(jy) - 1, 7, 1, "#F6CDEE"); for (let k = -3; k <= 3; k += 2) for (let j = 1; j < 9; j++) if ((j + k) % 3) c.px(R(jx) + k + (j % 4 === 0 ? 1 : 0), R(jy) + 2 + j, "#B06AAE"); }
{ const [ax, ay] = FP(50, -112); c.tint(R(ax) - 12, R(ay) - 12, 24, 24, (x, y) => 0.6 - Math.hypot(x - ax, y - ay) / 13, "#F6E79A", 4); c.ellipse(R(ax) + 7, R(ay) + 7, 6, 4, "#070A16"); c.px(R(ax) + 4, R(ay) + 6, "#C8D4FF"); c.line(R(ax) + 4, R(ay) + 4, R(ax), R(ay), "#070A16"); c.px(R(ax), R(ay), YL); c.px(R(ax) + 1, R(ay), "#FFF6C8"); }
{ const [wx, wy] = FP(98, -70); const whale = ["......XXXXXXXXX.........", "...XXXXXXXXXXXXXXX....XX", ".XXXXXXXXXXXXXXXXXXXXXX.", "XXOXXXXXXXXXXXXXXXXXX.XX", ".XXXXXXXXXXXXXX.........", "...LLLLLLLL............."];
  whale.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === ".") return; c.px(R(wx) + i, R(wy) + j, ch === "O" ? "#C8D4FF" : ch === "L" ? "#3A4E86" : "#22305E"); })); }
for (let i = 0; i < 10; i++) { const [bx, by] = FP(70.5 + rnd(i * 3) * 2, -2 - i * 1.6 - rnd(i * 5)); c.px(R(bx), R(by), "#B8CCFF"); }

for (let i = 0; i < 12; i++) { const [sx, sy] = FP(92 + (i % 6) * 1.3 + rnd(i * 7) * 0.7, -26 - Math.floor(i / 6) * 2.2 - rnd(i + 3)); c.rect(R(sx), R(sy), 3, 1, "#7E98DA"); c.px(R(sx) - 1, R(sy) - 1, "#7E98DA"); c.px(R(sx) - 1, R(sy) + 1, "#7E98DA"); }
{ const [hx, hy] = FP(60, -64); ["........X.........", ".......XX.........", "..XXXXXXXXXXXXX..X", "XXXXXXXXXXXXXXXXXX", ".XXXXXXXXXXXXX...X", "......X..X........"].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "X") c.px(R(hx) + i, R(hy) + j, j < 3 ? "#56607E" : "#3E4660"); })); c.px(R(hx) + 2, R(hy) + 3, "#C8D4FF"); }
// depth ruler on the New York slope: 1 KM ≈ 31 units of the exaggerated vertical scale
for (let k = 1; k <= 4; k++) {
  const z = -31 * k; let sx0 = -1, sy0 = 0;
  for (let sx = R(P3(NYC1, D, 0)[0]); sx < F1; sx++) { const x = (sx + 0.5 - OX) / U + D; if (seabed(x) < z - 1) { sx0 = sx; sy0 = R(OY + ((x + D) / 2 - z) * U); break; } }
  if (sx0 < 0) continue;
  for (let i = 0; i < 34; i += 3) c.rect(sx0 + 2 + i, sy0, 2, 1, "#A8BEFF");
  c.text(MAIN, k + " KM", sx0 + 4, sy0 - 10, "#C8D4FF");
}

// the cable on the sea floor, buried into both shores up to the landing stations
const CABLE = [];
for (let x = 14.5; x <= 125.5; x += 0.06) {
  let z;
  if (x < NYC1 + 1) z = lerp(LAND - 1.6, seabed(NYC1 + 1.5) + 0.6, sstep(clamp01((x - 14.5) / 5)));
  else if (x > LON0 - 1) z = lerp(seabed(LON0 - 1.5) + 0.6, LAND - 1.6, sstep(clamp01((x - (LON0 - 1)) / 4.5)));
  else z = seabed(x) + 0.6;
  CABLE.push(FP(x, z));
}
c.tint(0, TOP, GW, GH - TOP, (x, y) => { let best = 99; for (let i = 0; i < CABLE.length; i += 10) { const d = Math.abs(CABLE[i][0] - x) + Math.abs(CABLE[i][1] - y); if (d < best) best = d; } return best < 10 ? 0.42 * (1 - best / 10) : 0; }, "#F4CA50", 4);
for (const [sx, sy] of CABLE) { c.px(R(sx), R(sy) - 2, "#5A5274"); c.px(R(sx), R(sy) - 1, "#A89ECC"); c.px(R(sx), R(sy), "#3A3250"); c.px(R(sx), R(sy) + 1, "#120E1A"); }
for (let i = 0; i < CABLE.length; i++) { const [sx, sy] = CABLE[i]; if (Math.floor(i / 14) % 9 === 0) { c.px(R(sx), R(sy) - 2, YL); c.px(R(sx), R(sy) - 1, IV); c.px(R(sx), R(sy), Y); } }
for (let x = 30; x < 112; x += 8) { const [sx, sy] = FP(x, seabed(x) + 0.6); c.rect(R(sx) - 2, R(sy) - 2, 5, 3, "#4A4462"); c.rect(R(sx) - 1, R(sy) - 2, 3, 1, "#8A82AA"); c.px(R(sx), R(sy) - 1, "#7FE0FF"); }

// ---------------------------------------------------------------- New York (dusk): skyline, Statue of Liberty, landing station
const DB = { top: "#A2729A", left: "#D27C84", right: "#4C3060" }, DB2 = { top: "#86609A", left: "#AE6A88", right: "#3E2A56" };
NY.box(0.8, 0.8, 0, 3.6, 3.6, 22, DB2); NY.windows(0.8, 0.8, 0, 3.6, 3.6, 22, YL, 31);
NY.box(5, 1, 0, 3.6, 3.6, 26, DB); NY.windows(5, 1, 0, 3.6, 3.6, 26, YL, 57); NY.box(5.7, 1.7, 26, 2.2, 2.2, 4, DB); NY.box(6.3, 2.3, 30, 1, 1, 2, DB);
{ const [sx, sy] = NY.P(6.8, 2.8, 32); c.rect(R(sx), R(sy) - 12, 1, 12, "#E2D2EA"); c.px(R(sx), R(sy) - 13, "#FF6A6A"); }
NY.box(1, 6, 0, 3.4, 3.4, 12, DB); NY.windows(1, 6, 0, 3.4, 3.4, 12, YL, 77);
NY.box(9.6, 0.8, 0, 3.8, 3.4, 17, DB2); NY.windows(9.6, 0.8, 0, 3.8, 3.4, 17, YL, 91);
NY.box(6, 6.2, 0, 3, 3, 9, DB2); NY.windows(6, 6.2, 0, 3, 3, 9, YL, 113);
NY.box(10.4, 5.4, 0, 3, 3, 7, DB); NY.windows(10.4, 5.4, 0, 3, 3, 7, YL, 131);
{ NY.box(1.2, 17, 0, 2.2, 2.2, 2.6, { top: "#A89CB4", left: "#C4B8CC", right: "#76708A" }); const [sx, sy] = NY.P(2.3, 18.1, 2.6), G = "#62B8A4", G2 = "#3E8878";
  c.rect(R(sx) - 2, R(sy) - 16, 5, 16, G); c.rect(R(sx) + 1, R(sy) - 16, 2, 16, G2); c.rect(R(sx) - 1, R(sy) - 20, 3, 4, G); c.px(R(sx) - 2, R(sy) - 21, G); c.px(R(sx), R(sy) - 22, G); c.px(R(sx) + 2, R(sy) - 21, G);
  c.rect(R(sx) - 4, R(sy) - 27, 2, 12, G); c.rect(R(sx) - 5, R(sy) - 30, 3, 3, YL); c.px(R(sx) - 4, R(sy) - 31, "#FFF3B0"); c.tint(R(sx) - 12, R(sy) - 38, 16, 16, (x, y) => 0.35 - Math.hypot(x - sx + 4, y - sy + 30) / 14, "#FFE9A0", 3); }
NY.box(11, 18.4, 0, 2.6, 2.6, 2, { top: "#C0B6CE", left: "#9A8EAE", right: "#625A7A" });
{ const [sx, sy] = NY.P(11.6, 21, 1); c.rect(R(sx), R(sy) - 1, 3, 2, YL); }

// ---------------------------------------------------------------- London (night): Westminster, the clock tower, row houses, a phone mast
const NB = { top: "#4E4460", left: "#62546A", right: "#30283C" }, ST = { top: "#806E5C", left: "#9A8466", right: "#4E423C" };
LD.box(1.5, 0.8, 0, 9.5, 2.6, 5, ST); LD.windows(1.5, 0.8, 0, 9.5, 2.6, 5, "#FFD27A", 501, { step: 1, rows: 1.7, on: 0.7 });
for (let x = 2; x < 11; x += 1.3) { const [sx, sy] = LD.P(x, 3.4, 5); c.rect(R(sx), R(sy) - 3, 1, 3, "#9A8466"); c.px(R(sx), R(sy) - 4, "#B49C78"); }
for (let i = 0; i < 3; i++) { const x = 0.8 + i * 3; LD.box(x, 7.5, 0, 2.8, 2.8, 3.6, NB); LD.quad([[x, 7.5, 3.6], [x + 2.8, 7.5, 3.6], [x + 2.8, 8.9, 5.2], [x, 8.9, 5.2]], "#3C3250"); LD.quad([[x, 8.9, 5.2], [x + 2.8, 8.9, 5.2], [x + 2.8, 10.3, 3.6], [x, 10.3, 3.6]], "#584A66"); LD.windows(x, 7.5, 0, 2.8, 2.8, 3.6, "#FFC86A", 300 + i * 17, { step: 1, rows: 1.5, on: 0.65 }); }
LD.box(11.2, 3.8, 0, 2.4, 2.4, 19, ST); LD.windows(11.2, 3.8, 0, 2.4, 2.4, 19, "#FFD27A", 777, { step: 1.1, rows: 2.2, on: 0.35 });
LD.box(11, 3.6, 19, 2.8, 2.8, 3.4, { top: "#A08A6A", left: "#B09470", right: "#5E4E40" });
for (const [fx, fy, k] of [[12.4, 6.4, 0], [13.8, 5, 1]]) { const [sx, sy] = LD.P(fx, fy, 20.7); c.tint(R(sx) - 10, R(sy) - 10, 20, 20, (x, y) => 0.4 - Math.hypot(x - sx, y - sy) / 24, "#FFE9A0", 4); c.disc(R(sx), R(sy), 3, k ? "#E6CE8E" : "#FFF3C4"); c.px(R(sx), R(sy) - 1, "#3A2E28"); c.px(R(sx) + 1, R(sy), "#3A2E28"); }
LD.quad([[11, 3.6, 22.4], [13.8, 3.6, 22.4], [12.4, 5, 28]], "#5A6878"); LD.quad([[11, 6.4, 22.4], [13.8, 6.4, 22.4], [12.4, 5, 28]], "#3E4A5A"); LD.quad([[13.8, 3.6, 22.4], [13.8, 6.4, 22.4], [12.4, 5, 28]], "#2C3644");
{ const [bx, by] = LD.P(13.2, 12.8, 0), [tx, ty] = LD.P(13.2, 12.8, 13); c.line(R(bx) - 2, R(by), R(tx), R(ty), "#8C88A0"); c.line(R(bx) + 2, R(by), R(tx), R(ty), "#6C6880"); for (let k = 0.15; k < 1; k += 0.17) { const yy = R(lerp(by, ty, k)), hw = R(2 * (1 - k)); c.line(R(bx) - hw, yy, R(bx) + hw, yy - 3, "#6C6880"); }
  c.rect(R(tx) - 2, R(ty) + 2, 1, 3, "#B8B4C8"); c.rect(R(tx) + 2, R(ty) + 2, 1, 3, "#B8B4C8"); c.px(R(tx), R(ty) - 1, "#FF5A5A"); c.tint(R(tx) - 6, R(ty) - 7, 12, 12, (x, y) => 0.45 - Math.hypot(x - tx, y - ty + 1) / 10, "#FF5A5A", 3); }
for (const [x, y] of [[2, 20.5], [13.6, 9]]) { const [sx, sy] = LD.P(x, y, 0); c.rect(R(sx), R(sy) - 9, 1, 9, "#4A4458"); c.rect(R(sx) - 1, R(sy) - 10, 3, 1, YL); c.tint(R(sx) - 8, R(sy) - 12, 16, 14, (xx, yy) => 0.3 - Math.hypot(xx - sx, yy - sy + 7) / 24, "#FFD27A", 3); }
LD.box(0.8, 17.4, 0, 2.6, 2.6, 2, { top: "#7A7088", left: "#625872", right: "#3E3650" });
{ const [sx, sy] = LD.P(1.4, 20, 1); c.rect(R(sx), R(sy) - 1, 3, 2, YL); }

// ship crossing the ocean, heading west, with its wake
{ const x0 = 66, y0 = 10; for (let k = 0; k < 18; k++) { const [wx, wy] = P3(x0 + 9 + k * 0.8, y0 + 1.5 + ((k % 2) ? 1 : -1) * (k / 18) * 1.8, 0); c.px(R(wx), R(wy), "#A8BEFF"); }
  SL.box(x0, y0, -0.3, 9, 3, 1.4, { top: "#5A4A6A", left: "#9A3E4E", right: "#5A2434" });
  for (let i = 0; i < 4; i++) SL.box(x0 + 1 + i * 1.6, y0 + 0.5, 1.1, 1.4, 2, 1.1, [{ top: "#E8A848", left: "#B87828", right: "#704A18" }, { top: "#62A8C8", left: "#3A7A98", right: "#265468" }][i % 2]);
  SL.box(x0 + 7.2, y0 + 0.4, 1.1, 1.6, 2.2, 2.4, { top: "#ECE6F4", left: "#CCC4DA", right: "#8C84A0" }); const [lx, ly] = P3(x0 + 7.8, y0 + 2.6, 2.8); c.px(R(lx), R(ly), YL); }

// ---------------------------------------------------------------- the characters' footing
const FRIEND_AT = NY.P(8, 13.5, 0), ME_AT = LD.P(8.5, 15.5, 0);
for (const [x, y, rx] of [[FRIEND_AT[0], FRIEND_AT[1], 16], [ME_AT[0], ME_AT[1], 18]]) c.tint(R(x - rx), R(y - 4), rx * 2, 8, (xx, yy) => 0.6 - Math.hypot((xx - x) / rx, (yy - y) / 3.2) * 0.6, O, 3);
// phone glow on the ground in front of you
c.tint(R(ME_AT[0]) - 14, R(ME_AT[1]) - 50, 28, 30, (x, y) => 0.25 - Math.hypot(x - ME_AT[0], y - ME_AT[1] + 36) / 50, "#9DB5FF", 3);

// ---------------------------------------------------------------- the hook: "YOU UP?" leaves your phone; a dotted guess toward a satellite
function bubble(x, y, txt, tailX) {
  const w = c.measure(MAIN, txt, { scale: 2 }) + 18, h = 26;
  c.rrect(x - 1, y - 1, w + 2, h + 2, O, 3); c.rrect(x, y, w, h, IV, 3); c.rect(x + 2, y + h - 3, w - 4, 1, "#D8D2E8");
  for (let j = 0; j < 7; j++) { c.rect(tailX + j, y + h + j, 7 - j, 1, IV); c.px(tailX + j - 1, y + h + j, O); c.px(tailX + 7, y + h + j, O); }
  c.text(MAIN, txt, x + 9, y + 7, O, { scale: 2 });
}
const SAT = [468, 226], B0 = [372, 420];
for (let i = 0; i <= 64; i++) { const k = i / 64, x = (1 - k) ** 2 * B0[0] + 2 * (1 - k) * k * 398 + k * k * (SAT[0] - 10), y = (1 - k) ** 2 * B0[1] + 2 * (1 - k) * k * 250 + k * k * (SAT[1] + 9); if (i % 4 < 2) c.rect(R(x), R(y), 2, 2, k < 0.75 ? L : mix(L, "#5A5480", (k - 0.75) * 3)); }
{ const [x, y] = SAT; c.rect(x - 4, y - 3, 8, 7, "#D9B44A"); c.rect(x - 3, y - 2, 6, 1, "#F6DE84"); c.rect(x + 4, y, 2, 1, "#8C88A0"); c.rect(x - 6, y, 2, 1, "#8C88A0");
  for (const sx of [x - 18, x + 6]) { c.rect(sx, y - 3, 12, 7, "#2E4AA8"); for (let k = 0; k < 12; k += 3) c.rect(sx + k, y - 3, 1, 7, "#5C7FE0"); c.rect(sx, y, 12, 1, "#5C7FE0"); }
  c.rect(x - 1, y - 7, 2, 4, "#B8B4C8"); c.px(x, y - 8, IV);
  c.text(MAIN, "?", x + 22, y - 20, Y, { scale: 3, shadow: O, shadowOffset: 1 }); }
bubble(318, 424, "YOU UP?", 396);

// ---------------------------------------------------------------- city tags (flags are full-resolution overlays)
const overlays = [];
function tag(x, y, city, time, flag) {
  const w = 40 + Math.max(c.measure(MAIN, city, { scale: 2 }), c.measure(MAIN, time)) + 10, h = 38;
  c.rrect(x, y, w, h, p7, 2); c.rrect(x + 1, y + 1, w - 2, h - 2, p5, 2); for (let j = y + 2; j < y + h - 2; j++) c.rect(x + 2, j, w - 4, 1, mix(CARD, "#1D1430", (j - y) / h));
  c.text(MAIN, city, x + 40, y + 7, IV, { scale: 2 }); c.text(MAIN, time, x + 40, y + 24, MU);
  overlays.push({ file: flag, x: (x + 6) * S, y: (y + 8) * S, w: 56, h: 32 });
}
tag(168, 236, "NEW YORK", "6:04 PM", HERE + "media/flag-united-states-deb41780.png");
tag(394, 600, "LONDON", "11:04 PM", HERE + "media/flag-united-kingdom-a1eaca71.png");

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
