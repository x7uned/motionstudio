// «Why mosquitoes bite you» — pixel film, flat side view. 540×960 grid ×2 → 1080×1920, 30 fps. No overlay: the picture
// runs to both edges, only the captions sit on a soft dithered shade. One persistent world (a porch on a summer evening).
// node render.mjs --stills 3,9.5,... | --sheet t1,t2,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, hex, fade } from "../../../renderer/pixel/raster.mjs";
import { drawPart, smooth as smoothPts } from "./shade.mjs";
import { layer, ground, drawSky, drawFence, drawHouse, drawBenchBack, drawArmrests, drawYard, drawForeground, drawFireflies, REDBOX, LANTERN, CANG, BUCKETB, FLOWERP } from "./scenery.mjs";
import { drawFriends, SKIN_R, SKIN_L, BUMP } from "./people.mjs";
import { drawMosquito, ICON } from "./mosquito.mjs";
import { EV, CAM, END, FPS, WORDS, VOICE, W, POS, MOSQ_MACRO, BUGK } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, K = "#000000";
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", YL = "#FAE375", GR = "#65DA41", MU = "#959595", L = "#E0CDF8", P = "#8D59DA", PK = "#E03056", p2 = "#2A1F40", p3 = "#3B2C5C", p5 = "#6E4FB0", p7 = "#B08AE8";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const R = Math.round;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- camera
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) };
}

// ---------------------------------------------------------------- the mosquito: one female for the whole film
const LAND1 = [POS.bite[0] + 3.0 * BUGK, POS.bite[1] - 2.25 * BUGK], LAND2 = [POS.landing[0] + 3.0 * BUGK, POS.landing[1] - 2.25 * BUGK];
// the paper plane lands on R's right hand on the armrest; she hops from his forearm onto its wing
const PLANE_REST = [48, -55], LAND3 = [PLANE_REST[0] + 3.0 * BUGK - 3.5, PLANE_REST[1] - 1.5 - 2.25 * BUGK];
const MK = [
  [-0.5, 70, -104], [0, 62, -96], [0.35, 52, -84], [0.72, 38, -66], [EV.land1, ...LAND1], [EV.lift1, ...LAND1],
  [2.6, 46, -78], [3.3, 54, -96], [4.2, 56, -104], [5.6, 58, -108], [7.0, 53, -104], [7.9, ...MOSQ_MACRO], [EV.awayStart, ...MOSQ_MACRO],
  [13.6, 120, -110], [14.5, 300, -118], [15.6, 470, -122], [EV.follow[0] - 0.5, 470, -122], [EV.follow[1], 350, -104], [EV.vision[1] + 0.45, 350, -104],
  [24.45, 352, -84], [25.5, 320, -98], [EV.green, 262, -96], [EV.blue, 218, -97], [EV.purple, 166, -97], [29.3, 110, -98], [30.2, 62, -76], [30.8, 50, -66],
  [32.4, 48, -64], [33.4, 36, -60], [38.6, 34, -59], [40.1, 32, -96], [EV.land2[0], 30, -98], [EV.land2[0] + 0.6, 42, -68], [EV.land2[1], ...LAND2], [EV.hop[0], ...LAND2],
  [EV.hop[0] + 0.3, 46, -70], [EV.hop[1], ...LAND3], [END + 2, ...LAND3],
];
const LANDED = [[EV.land1, EV.lift1], [EV.land2[1], EV.hop[0]], [EV.hop[1], END + 5]];
function cr(p0, p1, p2, p3, u) { const u2 = u * u, u3 = u2 * u; return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3); }
function pathAt(t) {
  let i = 0; while (i < MK.length - 2 && MK[i + 1][0] <= t) i++;
  const a = MK[i], b = MK[i + 1], u = clamp01((t - a[0]) / (b[0] - a[0] || 1)), A = MK[Math.max(0, i - 1)], B = MK[Math.min(MK.length - 1, i + 2)];
  // keys that repeat a position are holds: no overshoot through them
  const hold = a[1] === b[1] && a[2] === b[2]; if (hold) return [a[1], a[2]];
  const pa = A[1] === a[1] && A[2] === a[2] ? a : A, pb = B[1] === b[1] && B[2] === b[2] ? b : B;
  return [cr(pa[1], a[1], b[1], pb[1], u), cr(pa[2], a[2], b[2], pb[2], u)];
}
export function mosq(t) {
  let landed = 0; for (const [a, b] of LANDED) landed = Math.max(landed, smooth(t, a - 0.12, a + 0.04) * (1 - smooth(t, b - 0.02, b + 0.14)));
  let [x, y] = pathAt(t);
  // hover wobble (small in the macros), zigzag while following the CO2 trail
  const zm = camera(t).z, amp = (1 - landed) * (zm > 8 ? 0.12 : zm > 4 ? 0.5 : 1.6) * (1 - 0.8 * win(t, 32.9, 38.7, 0.5, 0.5));
  x += amp * (Math.sin(t * 2.3) * 0.8 + Math.sin(t * 5.1 + 1) * 0.5); y += amp * (Math.sin(t * 3.1 + 2) * 0.9 + Math.sin(t * 7.3) * 0.4);
  const zz = win(t, EV.follow[0], EV.follow[1] - 0.2, 0.3, 0.3); y += zz * 7 * Math.sin(2 * Math.PI * (t - EV.follow[0]) / 0.62); x += zz * 3 * Math.cos(2 * Math.PI * (t - EV.follow[0]) / 0.62);
  const face = -1 + 2 * (smooth(t, EV.awayStart, EV.awayStart + 0.28) - smooth(t, 15.15, 15.45));
  const [x2, y2] = pathAt(t + 0.08), vy = (y2 - y) / 0.08;
  const tilt = landed * 0.3 + (1 - landed) * Math.max(-0.25, Math.min(0.25, vy * 0.004));
  const fed = smooth(t, EV.blood, EV.blood + 0.4) * (1 - 0.55 * smooth(t, EV.eggs, EV.eggs + 0.5)) * (1 - smooth(t, 12.7, 13.4));
  const eggs = smooth(t, EV.eggs, EV.eggs + 0.6) * (1 - smooth(t, 12.7, 13.4));
  return { x, y, face, tilt, fly: 1 - landed, legs: landed, fed, eggs, landed };
}
// the male only visits the macro (camera static there), so he is placed relative to her on screen
export function maleAt(t, fx, fy) { const a = smooth(t, 9.55, 9.9) * (1 - smooth(t, 11.9, 12.3)); const k = ease((t - 9.55) / 0.7), k2 = ease((t - 11.45) / 0.85); return { a, x: fx + lerp(lerp(-430, -118, k), -470, k2) + 2 * Math.sin(t * 2.7), y: fy + lerp(lerp(-330, -214, k), -360, k2) + 2 * Math.sin(t * 3.3) }; }

// ---------------------------------------------------------------- breath: CO2 puffs drifting downwind across the yard
const MOUTH = { R: [POS.R + 0.5, -76], L: [POS.L + 0.5, -76] };
const PUFFS = [];
for (const [who, times] of [["R", EV.exhales], ["L", EV.exhalesL]]) for (const te of times) for (let i = 0; i < 12; i++) PUFFS.push({ who, tb: te + 0.75 * i / 12, seed: PUFFS.length, label: who === "R" && i === 7 && te > EV.exhales[0] + 0.5 });
function drawPlume(c, G, t) {
  for (const p of PUFFS) {
    const age = t - p.tb; if (age <= 0 || age > 4.2) continue;
    const [mx, my] = MOUTH[p.who], d = 140 * (age - 0.3 * (1 - Math.exp(-age / 0.3))), x = mx + 3 + d, y = my + 2 - 5 * age + 3 * Math.sin(age * 2.5 + p.seed), r = 1.6 + 6.5 * age + rnd(p.seed) * 2;
    const a = 0.42 * smooth(age, 0, 0.25) * (1 - smooth(age, 2.6, 4.2)) * (p.who === "L" ? 0.75 : 1); if (a <= 0) continue;
    const X = G.X(x), Yy = G.Y(y), rr = Math.max(1, R(r * G.z));
    fade(c, a).disc(R(X), R(Yy), rr, "#B8C4EA"); fade(c, a * 0.7).disc(R(X - rr * 0.25), R(Yy - rr * 0.3), Math.max(1, R(rr * 0.55)), "#E2E8FF");
    if (p.label) { const la = clamp01(a * 2.4) * smooth(t, EV.co2 - 0.6, EV.co2 - 0.1); if (la > 0) { const s = "CO2"; c.text(MAIN, s, R(X - c.measure(MAIN, s, { scale: 2 }) / 2) + 1, R(Yy - 7) + 1, O, { scale: 2, colorAt: (q, w) => (la > bayer(q, w) ? O : null) }); c.text(MAIN, s, R(X - c.measure(MAIN, s, { scale: 2 }) / 2), R(Yy - 7), IV, { scale: 2, colorAt: (q, w) => (la > bayer(q, w) ? IV : null) }); } }
  }
}
function mouthO(t, who) { let m = 0; for (const te of who === "R" ? EV.exhales : EV.exhalesL) m = Math.max(m, win(t, te - 0.05, te + 0.75, 0.1, 0.15)); return m; }

// ---------------------------------------------------------------- smell: three fatty acids rising off the skin (many from R, few from L)
const SCENT_COL = ["#F4CA50", "#F27A9A", "#8EE6FF"], SCENT = [];
{ let id = 0; for (const [who, rate] of [["R", 30], ["L", 4]]) for (let tb = EV.smell - 0.2; tb < 46.2; tb += 1 / rate, id++) SCENT.push({ who, tb: tb + rnd(id * 7) / rate, id, k: id % 3 }); }
function scentOrigin(p) { const x0 = POS[p.who], r = rnd(p.id * 13); if (p.who === "R" && r < 0.45) { const u = rnd(p.id * 17); return [23 + u * 22, -52.5]; } if (r < 0.7) return [x0 + (rnd(p.id * 19) - 0.5) * 12, -88 + rnd(p.id * 23) * 10]; return [x0 + (rnd(p.id * 29) < 0.5 ? -7 : 7) + (rnd(p.id * 31) - 0.5) * 5, -30 + rnd(p.id * 37) * 12]; }
function drawScent(c, G, t, ga) {
  if (ga <= 0) return;
  for (const p of SCENT) { const age = t - p.tb; if (age <= 0 || age > 2.6) continue; const [ox, oy] = scentOrigin(p), x = ox + Math.sin(age * 3 + p.id) * 2.2 + (rnd(p.id * 3) - 0.5) * 6 * age, y = oy - 11 * age;
    const a = ga * smooth(age, 0, 0.3) * (1 - smooth(age, 1.6, 2.6)); if (a <= 0) continue; const s = Math.max(2, R(1.5 * G.z)); fade(c, a).rect(R(G.X(x) - s / 2), R(G.Y(y) - s / 2), s, s, SCENT_COL[p.k]); }
}

// ---------------------------------------------------------------- mosquito vision: only long wavelengths (skin, the red box, the orange lantern) light up
const GLOW = ["#4A1606", "#7A2A08", "#B0460C", "#E06A14", "#FF9028", "#FFB850", "#FFDC8C"];
const REDV = ["#5A0606", "#9A0E0C", "#E0221A", "#FF4A2A", "#FF7A50", "#FFB090"], ORV = ["#7A3008", "#B85010", "#F07A18", "#FF9E30", "#FFC860", "#FFEAAA"];
const GREY = ["#121218", "#1E1E26", "#2C2C36", "#3C3C48", "#50505C", "#666672"].map(hex);
const VMAP = new Map(), GLOWKEYS = new Set(), key = (c) => (c[0] << 16) | (c[1] << 8) | c[2];
SKIN_R.forEach((c, i) => VMAP.set(key(hex(c)), hex(GLOW[i]))); SKIN_L.forEach((c, i) => VMAP.set(key(hex(c)), hex(GLOW[Math.min(6, i + 0)]))); BUMP.forEach((c, i) => VMAP.set(key(hex(c)), hex(GLOW[3 + i])));
REDBOX.forEach((c, i) => VMAP.set(key(hex(c)), hex(REDV[i]))); LANTERN.forEach((c, i) => VMAP.set(key(hex(c)), hex(ORV[i])));
for (const k of VMAP.keys()) GLOWKEYS.add(k);
const VIS = new Canvas(GW, GH, K), MASK = new Float32Array((GW / 6) * (GH / 6)), MASK2 = new Float32Array(MASK.length);
function visionPass(src) {
  const d = src.d, o = VIS.d; MASK.fill(0);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = (y * GW + x) * 3, k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2], v = VMAP.get(k);
    if (v) { o[i] = v[0]; o[i + 1] = v[1]; o[i + 2] = v[2]; MASK[((y / 6) | 0) * (GW / 6) + ((x / 6) | 0)] += 1 / 36; continue; }
    const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255, s = Math.min(5, l * 7.5), lo = Math.floor(s), q = s - lo > bayer(x, y) ? Math.min(5, lo + 1) : lo, g = GREY[q];
    o[i] = g[0]; o[i + 1] = g[1]; o[i + 2] = g[2];
  }
  // a soft halo around everything she can see (box blur of the coarse mask), dithered over the grey
  const mw = GW / 6, mh = GH / 6;
  for (let pass = 0; pass < 2; pass++) { const a = pass ? MASK2 : MASK, b = pass ? MASK : MASK2; for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { let s = 0, n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= mw || yy >= mh) continue; s += a[yy * mw + xx]; n++; } b[y * mw + x] = s / n; } }
  const halo = hex("#FF8A3A");
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const i = (y * GW + x) * 3, k = (o[i] << 16) | (o[i + 1] << 8) | o[i + 2]; const m = Math.min(1, MASK[((y / 6) | 0) * mw + ((x / 6) | 0)] * 2.2); if (m <= 0.02) continue; if (m * 0.55 > bayer(x + 1, y + 2) && !GLOWSET.has(k)) { o[i] = (o[i] + halo[0]) >> 1; o[i + 1] = (o[i + 1] + halo[1]) >> 1; o[i + 2] = (o[i + 2] + halo[2]) >> 1; } }
  return VIS;
}
const GLOWSET = new Set([...VMAP.values()].map(key));

// ---------------------------------------------------------------- forearm macro (dedicated close-up dissolved in at the end of the zoom)
const PORES = Array.from({ length: 260 }, (_, i) => ({ x: rnd(i * 3) * 600 - 30, v: rnd(i * 5), r: rnd(i * 7) })), HAIRS = Array.from({ length: 70 }, (_, i) => ({ x: rnd(i * 11) * 620 - 40, v: 0.05 + rnd(i * 13) * 0.6, l: 14 + rnd(i * 17) * 18, b: (rnd(i * 19) - 0.5) * 6 }));
const armTop = (x) => 372 - (x - 270) * 0.05 + Math.sin(x * 0.012) * 5, ARM_H = 168, BITE_X = 270 + (POS.bite[0] - 31) * 10;
function drawArmMacro(c, t) {
  for (let y = 0; y < GH; y++) { const k = y / GH; for (let x = 0; x < GW; x++) c.px(x, y, k + (bayer(x, y) - 0.5) * 0.12 < 0.42 ? "#1A1430" : k < 0.75 ? "#151024" : "#100C1C"); }
  for (const [bx, by, br, col, a] of [[70, 230, 60, "#F6C860", 0.12], [470, 270, 46, "#FF9A40", 0.12], [500, 800, 70, "#8D59DA", 0.1], [60, 840, 50, "#3E9AA0", 0.08]]) for (let r = br; r > 0; r -= 6) fade(c, a * (1 - r / br) * 1.6).disc(bx, by, r, col);
  const pts = []; for (let x = -40; x <= 580; x += 20) pts.push([x, armTop(x)]); for (let x = 580; x >= -40; x -= 20) pts.push([x, armTop(x) + ARM_H + Math.sin(x * 0.02) * 4]);
  drawPart(c, [smoothPts(pts, new Set([31, 32, 0, 63]), 3)], { ramp: SKIN_R, base: 3.3, gain: 2.6, slope: 1.2, thick: 70, light: [-0.3, -0.95], outline: SKIN_R[0], litOutline: SKIN_R[6] });
  for (const p of PORES) { const y = armTop(p.x) + 12 + p.v * (ARM_H - 24); c.px(R(p.x), R(y), p.r < 0.5 ? SKIN_R[2] : SKIN_R[3]); if (p.r > 0.8) c.px(R(p.x) + 1, R(y), SKIN_R[3]); }
  for (const h of HAIRS) { const y0 = armTop(h.x) + 6 + h.v * (ARM_H - 20); for (let k = 0; k < h.l; k++) c.px(R(h.x + k * 0.9 + h.b * (k / h.l) ** 2), R(y0 - k * 0.45 + (k / h.l) ** 2 * 3), k < h.l * 0.7 ? SKIN_R[1] : SKIN_R[2]); }
  // the bite from the first seconds: a raised pink dome with the puncture in the middle
  { const bx = BITE_X, by = armTop(bx) + 2; for (let r = 30; r > 0; r -= 1) { const k = r / 30; c.ellipse(bx, R(by + 6 - (1 - k) * 8), R(r * 1.35), R(r * 0.6), k > 0.85 ? BUMP[0] : k > 0.6 ? BUMP[1] : k > 0.3 ? BUMP[2] : BUMP[3]); } c.disc(bx - 2, R(by - 1), 2, BUMP[0]); }
  // nylon sleeve slides on from the wrist side; its leading edge is an elastic band
  const sl = ease((t - EV.sleeve[0]) / (EV.sleeve[1] - EV.sleeve[0]));
  if (t >= EV.sleeve[0]) { const edge = lerp(600, -60, sl);
    for (let y = 300; y < 640; y++) for (let x = Math.max(0, R(edge)); x < GW; x++) { const top = armTop(x) - 10, bot = armTop(x) + ARM_H + 12; if (y < top || y > bot) continue; const u = (y - top) / (bot - top), mesh = ((x + y) % 5 === 0) || ((x - y + 1000) % 5 === 0); if (mesh) c.px(x, y, u < 0.25 ? "#FFFFFF" : u < 0.7 ? "#E4E6F2" : "#B8BCD4"); else if (0.32 + 0.25 * (1 - u) > bayer(x, y)) c.px(x, y, mix(c.get(x, y), "#E8EAF6", 0.45)); }
    if (edge > -20) for (let y = 300; y < 640; y++) { const top = armTop(edge) - 12, bot = armTop(edge) + ARM_H + 14; if (y < top || y > bot) continue; c.rect(R(edge) - 3, y, 7, 1, (y - top) % 6 < 3 ? "#D8DCEC" : "#A8AEC8"); } }
  // scent rising off the skin (larger here); after the sleeve is on, it seeps through the mesh
  for (let i = 0; i < 90; i++) { const tb = EV.smell - 0.4 + i * 0.065, age = (t - tb) % 2.4; if (t < tb) continue; const x = rnd(i * 41) * 560 - 10 + Math.sin(age * 2 + i) * 8, y = armTop(x) + 4 - age * 70, a = smooth(age, 0, 0.3) * (1 - smooth(age, 1.5, 2.4)); if (a <= 0) continue; const s = 4 + (i % 3); fade(c, a).rect(R(x - s / 2), R(y - s / 2), s, s, SCENT_COL[i % 3]); fade(c, a * 0.6).rect(R(x - s / 2) - 1, R(y - s / 2) - 1, s + 2, s + 2, SCENT_COL[i % 3]); }
}

// ---------------------------------------------------------------- HUD helpers
function panel(c, x, y, w, h, a = 1, edge = p7) { if (a <= 0) return; const g = fade(c, a); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, p5, 2); for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(CARD, "#1D1430", (j - y) / h)); }
function dtext(c, str, x, y, col, a = 1, scale = 1) { if (a > 0) fade(c, a).text(MAIN, str, R(x), R(y), col, { scale }); }
const tw = (c, str, scale = 1) => c.measure(MAIN, str, { scale });
function tag(c, str, cx, y, a, col = Y, edge = col, scale = 2) { if (a <= 0) return; const w = tw(c, str, scale) + 16, h = 7 * scale + 12, x = R(Math.max(4, Math.min(GW - 4 - w, cx - w / 2))), yy = R(y + (1 - a) * 6); panel(c, x, yy, w, h, a, edge); dtext(c, str, x + 8, yy + 6, col, a, scale); return { x, y: yy, w, h }; }
function headline(c, s, y, a, col = IV, scale = 4) { if (a <= 0) return; const w = tw(c, s, scale), x = R(270 - w / 2), yy = R(y + (1 - a) * 8); const g = fade(c, a); g.text(MAIN, s, x + 2, yy + 2, O, { scale }); g.text(MAIN, s, x, yy, col, { scale }); }
function icon(c, x, y, a, col, s = 1, rows = ICON) { const g = fade(c, a); rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#") g.rect(R(x) + i * s, R(y) + j * s, s, s, col); })); }
const PERSON = ["..###..", "..###..", "...#...", ".#####.", "#.###.#", "..###..", "..#.#..", "..#.#..", ".##.##."];
const HAND = ["..XX......", ".X..X.....", ".X..X.....", ".X..XXX...", ".X..X..XX.", "XX..X..X.X", "X...X..X.X", "X........X", ".X.......X", "..X.....X.", "...XXXXX.."];
function cursor(c, x, y, a) { if (a <= 0) return; HAND.forEach((row, j) => [...row].forEach((ch, i) => { const X = R(x) + i * 2, Yy = R(y) + j * 2; if (a <= bayer(X, Yy)) return; const col = ch === "X" ? O : (row.indexOf("X") < i && row.lastIndexOf("X") > i ? IV : null); if (col) c.rect(X, Yy, 2, 2, col); })); }
function plane(c, x, y, ang, a, s = 1) { const rot = ([px, py]) => [x + (px * Math.cos(ang) - py * Math.sin(ang)) * s, y + (px * Math.sin(ang) + py * Math.cos(ang)) * s], g = fade(c, a); g.poly([[9, 0], [-7, -6], [-3, 0]].map(rot), IV); g.poly([[9, 0], [-3, 0], [-7, 5]].map(rot), L); g.poly([[9, 0], [-3, 0], [-5, 2]].map(rot), p7); }

// ---------------------------------------------------------------- the wall calendar (JUL → YEAR 1 → 2 → 3, pages fold up, never swap in one frame)
const CAL = new Canvas(240, 288, K);
function calendarFace(g, w, h, face, a) {
  if (face === "JUL") { const s = h > 60 ? 2 : 1; dtext(g, "JUL", R(w / 2 - tw(g, "JUL", s) / 2), R(h * 0.24), P, a, s); for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) fade(g, a).rect(R(w * 0.14 + i * w * 0.13), R(h * 0.52 + j * h * 0.1), Math.max(1, R(w * 0.07)), Math.max(1, R(h * 0.05)), j === 2 && i === 3 ? PK : "#B8AE98"); return; }
  const n = face.slice(-1), s1 = h > 60 ? 2 : 1, s2 = h > 60 ? 5 : 3;
  dtext(g, "YEAR", R(w / 2 - tw(g, "YEAR", s1) / 2), R(h * 0.24), P, a, s1); dtext(g, n, R(w / 2 - tw(g, n, s2) / 2), R(h * 0.44), "#2A1F40", a, s2);
}
function drawCalendar(c, G, t) {
  const [cx, cy] = POS.calendar, w = R(30 * G.z), h = R(36 * G.z), x0 = R(G.X(cx) - w / 2), y0 = R(G.Y(cy) - h / 2);
  if (x0 > GW || y0 > GH || x0 + w < 0 || y0 + h < 0 || w > CAL.w || h > CAL.h) return;
  const fd = 0.3, [f0, f1] = EV.flips, ya = smooth(t, EV.years - 0.48, EV.years - 0.18);
  let top, under = null, k = 0;
  if (t < f0 - fd) top = "PRE"; else if (t < f0) { top = "Y1"; under = "Y2"; k = (t - (f0 - fd)) / fd; } else if (t < f1 - fd) top = "Y2"; else if (t < f1) { top = "Y2"; under = "Y3"; k = (t - (f1 - fd)) / fd; } else top = "Y3";
  const page = (face, bg) => { CAL.rect(0, 0, w, h, bg); CAL.rect(0, 0, w, Math.max(2, R(5 * G.z)), "#8D59DA"); calendarFace(CAL, w, h, face, 1); };
  const blit = (rows, a = 1) => { for (let j = 0; j < rows; j++) for (let i = 0; i < w; i++) { if (a < 1 && a <= bayer(x0 + i, y0 + j)) continue; const q = (j * CAL.w + i) * 3; c.px(x0 + i, y0 + j, [CAL.d[q], CAL.d[q + 1], CAL.d[q + 2]]); } };
  c.rect(x0 - 2, y0 - 2, w + 4, h + 4, "#120E22");
  if (top === "PRE") { page("JUL", "#E9E2D2"); blit(h); if (ya > 0) { page("Y1", "#E9E2D2"); blit(h, ya); } }
  else { if (under) { page(under, "#E9E2D2"); blit(h); } const hh = R(h * (1 - ease(k))); page(top, under ? "#F4EEE0" : "#E9E2D2"); blit(hh); if (under && hh > 0) c.rect(x0, y0 + hh - 1, w, 1, "#B8AE98"); }
  for (const dx of [-8, 8]) c.rect(R(G.X(cx + dx)) - 1, y0 - 3, Math.max(2, R(G.z)), Math.max(4, R(2.5 * G.z)), "#C8BEDC");
  const hi = win(t, EV.years - 0.45, EV.still + 0.6, 0.3, 0.4); if (hi > 0) fade(c, hi).rframe(x0 - 5, y0 - 5, w + 10, h + 10, Y, 2);
}

// ---------------------------------------------------------------- the ending: the phone, SEND → SENT ✓, the paper plane
function phoneUI(c, t, G, phoneW) {
  const a = smooth(t, EV.ui[0], EV.ui[1]) * (1 - smooth(t, EV.fly[1] - 0.1, EV.fly[1] + 0.4)); if (a <= 0) return null;
  const x = 34, y = R(150 + (1 - a) * 10), w = 196, h = 236, g = fade(c, a);
  // pointer tail to the phone in L's hands
  const [px, py] = [G.X(phoneW[0]), G.Y(phoneW[1] - 6)]; g.poly([[x + 70, y + h - 2], [x + 104, y + h - 2], [px, py]], O); g.poly([[x + 74, y + h - 3], [x + 100, y + h - 3], [px, py - 3]], "#2A2148");
  g.rrect(x, y, w, h, O, 2); g.rrect(x + 3, y + 3, w - 6, h - 6, "#2A2148", 2); g.rrect(x + 7, y + 7, w - 14, h - 14, "#171128", 2);
  dtext(c, "SEND TO", x + 18, y + 18, MU, a, 2);
  // contact: the friend's face with the bite on his cheek-level arm, tiny
  { const fx = x + 18, fy = y + 40; g.rrect(fx, fy, w - 36, 34, p3, 2); g.disc(fx + 17, fy + 17, 12, "#2E1A0E"); g.disc(fx + 17, fy + 19, 10, SKIN_R[4]); g.rect(fx + 7, fy + 6, 20, 6, "#4A2C16"); g.px(fx + 13, fy + 19, O); g.px(fx + 21, fy + 19, O); g.rect(fx + 15, fy + 24, 5, 1, SKIN_R[1]); g.disc(fx + 26, fy + 26, 3, BUMP[2]);
    dtext(c, "FRIEND", fx + 38, fy + 6, IV, a, 2); g.text(TINY, "BITTEN FIRST", fx + 38, fy + 22, Y, { scale: 1 }); }
  // the film as a card
  { const cx0 = x + 18, cy0 = y + 86; g.rrect(cx0, cy0, w - 36, 74, IV, 2); g.rect(cx0 + 6, cy0 + 6, 60, 62, "#1D1438"); for (let j = 0; j < 62; j++) for (let i = 0; i < 60; i++) if (j > 40 + Math.sin(i * 0.3) * 3) g.px(cx0 + 6 + i, cy0 + 6 + j, j > 52 ? "#24372E" : "#3E2752"); g.disc(cx0 + 52, cy0 + 18, 5, "#FFF4CC"); icon(c, cx0 + 14, cy0 + 26, a, O, 4);
    g.text(MAIN, "WHY", cx0 + 74, cy0 + 12, O, { scale: 1 }); g.text(MAIN, "MOSQUITOES", cx0 + 74, cy0 + 24, O, { scale: 1 }); g.text(MAIN, "BITE YOU", cx0 + 74, cy0 + 36, O, { scale: 1 }); g.text(TINY, "0:54", cx0 + 74, cy0 + 56, MU, { scale: 1 }); }
  // SEND → SENT ✓
  const press = t >= EV.press && t < EV.press + 0.12 ? 2 : 0, sent = smooth(t, EV.sent, EV.sent + 0.22), bw = 150, bx = R(x + w / 2 - bw / 2), by = y + 176 + press, bh = 38;
  for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) { if (a <= bayer(bx + i, by + j)) continue; if ((i < 2 || i > bw - 3) && (j < 2 || j > bh - 3)) continue; const edge = i === 0 || i === bw - 1 || j === 0 || j === bh - 1, base = sent > bayer(bx + i + 2, by + j) ? (j < 4 ? "#9BF07A" : GR) : (j < 4 ? p7 : P); c.px(bx + i, by + j, edge ? O : j > bh - 6 ? mix(base, O, 0.35) : base); }
  if (sent < 1) { const s = "SEND", tx = R(x + w / 2 - (tw(c, s, 2) + 20) / 2); plane(c, tx + 7, by + 18, -0.35, a * (1 - sent), 0.8); dtext(c, s, tx + 20, by + 12, IV, a * (1 - sent), 2); }
  if (sent > 0) { const s = "SENT ✓"; dtext(c, s, R(x + w / 2 - tw(c, s, 2) / 2), by + 12, O, a * sent, 2); }
  const ca = smooth(t, EV.ui[1], EV.ui[1] + 0.3) * (1 - smooth(t, EV.sent + 0.3, EV.sent + 0.6)), k = ease((t - EV.ui[1]) / (EV.press - EV.ui[1] - 0.1));
  cursor(c, lerp(x + w + 30, x + w / 2 + 6, k), lerp(by + 80, by + 18, k) + press, ca);
  return [x + w / 2, by + bh / 2];
}
function flightPlane(c, t, G, from) {
  if (t < EV.fly[0] || !from) return;
  const [fx, fy] = from, [tx, ty] = [G.X(PLANE_REST[0]), G.Y(PLANE_REST[1])], u = ease((t - EV.fly[0]) / (EV.fly[1] - EV.fly[0]));
  const pt = (q) => { const x = lerp(fx, tx, q), y = lerp(fy, ty, q) - Math.sin(Math.PI * q) * 150 - q * (1 - q) * 40; return [x, y]; };
  // dotted trail
  const ta = 1 - smooth(t, EV.fly[1], EV.fly[1] + 0.8);
  if (ta > 0) { const g = fade(c, ta * 0.9); for (let q = 0; q < u - 0.03; q += 0.012) if ((q * 83) % 2 < 1) { const [x, y] = pt(q); g.rect(R(x), R(y), 2, 2, YL); } }
  const [x, y] = pt(u), [x2, y2] = pt(Math.min(1, u + 0.02)), ang = u < 1 ? Math.atan2(y2 - y, x2 - x) : 0.08;
  plane(c, x, y, ang, 1, lerp(2.4, 1.6 * G.z, u));
}

// ---------------------------------------------------------------- captions (karaoke, the film's style)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = g.start - 0.12; g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.3, e + 1.4); });
const CAP_Y = 690;
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(smooth(t, g.show, g.show + 0.18), 1 - smooth(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = CAP_Y + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : O) });
      c.text(MAIN, txt, x, y0, IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(IV, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? IV : Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- frame
const layerC = new Canvas(GW, GH, K);
function dissolve(c, src, a) { if (a >= 1) { c.d.set(src.d); return; } if (a <= 0) return; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = src.d[i]; c.d[i + 1] = src.d[i + 1]; c.d[i + 2] = src.d[i + 2]; } }
const SCRATCH = (t) => Math.max(win(t, EV.scratch1[0], EV.scratch1[1], 0.3, 0.3), smooth(t, EV.scratch2[0], EV.scratch2[0] + 0.35));
export function frame(t) {
  const c = new Canvas(GW, GH, K), cam = camera(t), G = ground(cam), m = mosq(t);
  // ---- world
  drawSky(c, cam, t); drawFence(c, cam); drawHouse(c, cam, t); drawCalendar(c, G, t); drawBenchBack(c, cam); drawArmrests(c, cam);
  drawYard(c, cam, t); drawFireflies(c, cam, t, 1 - smooth(cam.z, 2.5, 4));
  const look = (P) => { const dx = m.x - P.x, dy = m.y + 81; const n = Math.hypot(dx, dy) || 1; return [dx / n, dy / n]; };
  const lPhone = smooth(t, EV.phoneUp[0], EV.phoneUp[1]);
  const pts = drawFriends(c, cam, t, {
    look: { R: look({ x: POS.R }), L: lPhone > 0.5 ? [0.3, 0.9] : t > EV.scratch2[0] ? [1, 0.2] : look({ x: POS.L }) },
    lPhone, rReach: SCRATCH(t), scratch: t * 2 * Math.PI * 5.5, bump: smooth(t, EV.bump[0], EV.bump[1]),
    sleeve: smooth(t, EV.sleeve[0] + 0.4, EV.sleeve[1]) * (1 - smooth(t, EV.macroOut[1] + 0.3, EV.macroOut[1] + 0.8)),
    mouthO: { R: mouthO(t, "R"), L: mouthO(t, "L") },
  });
  drawPlume(c, G, t);
  drawScent(c, G, t, smooth(t, EV.smell - 0.2, EV.smell + 0.3) * (1 - smooth(t, 45.6, 46.3)));
  // the paper plane resting on R's lap after it lands
  if (t >= EV.fly[1]) plane(c, G.X(PLANE_REST[0]), G.Y(PLANE_REST[1]), 0.08, 1, 1.6 * G.z);
  drawForeground(c, cam, t);
  // ---- macro depth: the far world darkens behind the insects
  const dz = smooth(cam.z, 4, 14) * (1 - win(t, EV.macroIn[0], EV.macroOut[1], 0.2, 0.2)); if (dz > 0) c.tint(0, 0, GW, GH, () => 0.6 * dz, "#3A3262", 4);
  // ---- mosquito vision
  const va = smooth(t, EV.vision[0], EV.vision[1]) * (1 - smooth(t, EV.visionOut[0], EV.visionOut[1]));
  if (va > 0) dissolve(c, visionPass(c), va);
  // heat shimmer off the skin (in her colours)
  const ha = win(t, EV.heat - 0.35, EV.visionOut[1] - 0.2, 0.4, 0.45);
  if (ha > 0) { const g = fade(c, ha * 0.8); for (const [wx, wy, n] of [[POS.R, -92, 5], [33, -54, 6], [POS.L, -92, 4], [POS.L + 12, -46, 3], [POS.R - 7, -33, 2], [POS.R + 7, -33, 2]]) for (let k = 0; k < n; k++) { const bx = G.X(wx + (k - n / 2) * 4.5), by = G.Y(wy); for (let j = 0; j < 34 * G.z; j++) { const yy = by - j, xx = bx + Math.sin(yy * 0.16 + t * 6 + k * 1.7) * 2.2 * G.z; if (((yy + t * 46 * G.z + k * 9) % (12 * G.z)) < 6 * G.z) g.px(R(xx), R(yy), j < 14 * G.z ? "#FFB850" : "#FF7A3A"); } } }
  // ---- forearm macro
  const ma = smooth(t, EV.macroIn[0] + 0.35, EV.macroIn[1]) * (1 - smooth(t, EV.macroOut[0], EV.macroOut[0] + 0.45));
  if (ma > 0) { drawArmMacro(layerC, t); dissolve(c, layerC, ma); }
  // ---- the mosquitoes (always on top of the world, normal colours)
  const s = Math.max(cam.z * BUGK, 3.0), MX = G.X(m.x), MY = G.Y(m.y);
  if (cam.z < 1.7 && m.fly > 0.5) { // dotted flight trail in the wide shots
    const g = fade(c, 0.55 * smooth(1.7 - cam.z, 0, 0.3)); for (let k = 1; k <= 26; k++) { const tp = t - k * 0.045; if (tp < 0) break; const q = mosq(tp); if (q.fly < 0.5) break; if (k % 2) continue; const a2 = 1 - k / 27; fade(g, a2).px(R(G.X(q.x)), R(G.Y(q.y)) + 3, "#D9CCF5"); }
  }
  const mm = maleAt(t, MX, MY);
  if (mm.a > 0 && cam.z > 8) drawMosquito(c, mm.x, mm.y, s * 0.92, { face: 1, fly: 1, male: true, t: t + 0.37, alpha: mm.a });
  drawMosquito(c, MX, MY, s, { face: m.face, tilt: m.tilt, fly: m.fly, legs: m.legs, fed: m.fed, eggs: m.eggs, t });
  hud(c, t, cam, G, m, mm, pts);
  // ---- captions over a soft dithered shade (no other overlay)
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin(Math.PI * (y - 640) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

function hud(c, t, cam, G, m, mm, pts) {
  // opening: NOT BAD LUCK
  headline(c, "NOT BAD LUCK", 206, win(t, EV.notbad, 3.75, 0.3, 0.35), Y, 4);
  // lab test: one person over 100× more than the least-liked
  tag(c, "LAB TEST", 270, 128, win(t, EV.labtest, 8.45, 0.3, 0.35), L, p7);
  // lab result as two gauges over their heads: one person over 100× the least-liked
  { const sa = 1 - smooth(t, 8.45, 8.8); if (sa > 0 && t > EV.stack[0] - 0.3) {
      const gauge = (wx, k, label, col, a) => { if (a <= 0) return; const cx = R(G.X(wx)), by = R(G.Y(-100)), h = 150, w = 34, x = cx - w / 2; panel(c, x - 4, by - h - 4, w + 8, h + 8, a * 0.9, p3); const fh = R(h * k); if (fh > 0) { const g = fade(c, a); g.rect(x, by - fh, w, fh, col); g.rect(x, by - fh, w, Math.min(fh, 3), YL); for (let j = by - fh + 6; j < by; j += 8) g.rect(x + 3, j, w - 6, 1, mix(col, O, 0.25)); } dtext(c, label, R(cx - tw(c, label, 4) / 2), by - h - 40, col, a, 4); };
      const k = ease((t - EV.stack[0]) / (EV.stack[1] - EV.stack[0])), n = Math.max(1, Math.round(100 * k)), ra = smooth(t, EV.stack[0] - 0.3, EV.stack[0]) * sa;
      gauge(POS.R, k, n >= 100 ? "100×+" : n + "×", Y, ra);
      gauge(POS.L, 1 / 100, "1×", MU, smooth(t, EV.least - 0.15, EV.least + 0.2) * sa); } }
  // macro: female and male
  if (cam.z > 8 && t < 13) {
    const fx = G.X(m.x), fy = G.Y(m.y);
    tag(c, "FEMALE: BITES", fx, fy + 96, win(t, EV.female, 12.45, 0.3, 0.3), Y, Y);
    tag(c, "MALE: NO BITE", mm.x + 10, mm.y + 74, win(t, 10.0, 11.35, 0.3, 0.3) * mm.a, L, p7);
    tag(c, "BLOOD PROTEIN", fx + 120, fy + 150, win(t, EV.protein, 12.45, 0.3, 0.3), "#F2706A", "#F2706A");
    tag(c, "> EGGS", fx + 120, fy + 188, win(t, EV.eggs, 12.45, 0.3, 0.3), "#FBF3D8", "#FBF3D8");
  }
  // the four clues, lit one by one
  { const a = smooth(t, EV.chips, EV.chips + 0.4) * (1 - smooth(t, 42.15, 42.6)); if (a > 0) {
      const items = [["BREATH", EV.breath], ["COLOR", EV.eyes], ["HEAT", EV.heat], ["SMELL", EV.smell]], ws = items.map(([s]) => tw(c, s, 2) + 16), total = ws.reduce((p, q) => p + q, 0) + 8 * 3; let x = R(270 - total / 2);
      items.forEach(([s, at], i) => { const lit = smooth(t, at, at + 0.3), y = 128 + R((1 - a) * 6); panel(c, x, y, ws[i], 26, a, lit > 0.5 ? Y : p3); dtext(c, s, x + 8, y + 6, MU, a * (1 - lit), 2); dtext(c, s, x + 8, y + 6, Y, a * lit, 2); x += ws[i] + 8; }); } }
  // vision label and the colour verdicts
  tag(c, "MOSQUITO VIEW", 270, 166, win(t, EV.vision[0] + 0.2, EV.visionOut[0], 0.35, 0.4), "#FF9028", "#FF9028");
  const ot = (wx, wy, s, at, col, edge, until) => { const a = win(t, at, until, 0.3, 0.35); if (a > 0) tag(c, s, G.X(wx), G.Y(wy) - 30, a, col, edge); };
  ot(POS.mailbox + 4, -82, "RED ✓", EV.red, "#FF6A50", "#FF6A50", EV.ignores - 0.2); ot(POS.lantern, -98, "ORANGE ✓", EV.orange, "#FFB040", "#FFB040", EV.ignores - 0.2); ot(-40, -96, "SKIN ✓", EV.skin, "#FFC070", "#FFC070", EV.ignores - 0.2);
  ot(POS.can + 6, -66, "GREEN ×", EV.green, "#86E07E", "#B8B8C4", 29.4); ot(POS.bucket, -36, "BLUE ×", EV.blue, "#8EA8FF", "#B8B8C4", 29.4); ot(POS.flowers, -66, "PURPLE ×", EV.purple, "#CC9CF6", "#B8B8C4", 29.4);
  // lab: New York, 64 people on nylon sleeves
  tag(c, "NEW YORK LAB", 112, 170, win(t, EV.lab, 39.6, 0.3, 0.4), L, p7);
  { const a = win(t, EV.n64[0] - 0.1, 40.0, 0.3, 0.4); if (a > 0) { const x = 380, y = 168, w = 140, h = 150; panel(c, x, y, w, h, a, Y); dtext(c, "64 PEOPLE", x + 16, y + 10, Y, a, 2);
      for (let i = 0; i < 64; i++) { const tb = lerp(EV.n64[0], EV.n64[1], i / 64), ia = smooth(t, tb, tb + 0.12) * a, fav = [9, 22, 45].includes(i) ? smooth(t, EV.favorites, EV.favorites + 0.3) : 0; if (ia <= 0) continue; icon(c, x + 14 + (i % 8) * 14, y + 34 + Math.floor(i / 8) * 14, ia, fav > 0.5 ? "#FF9028" : L, 1, PERSON); } } }
  { const sx = lerp(600, -60, ease((t - EV.sleeve[0]) / (EV.sleeve[1] - EV.sleeve[0]))); tag(c, "NYLON SLEEVE", Math.max(130, Math.min(420, sx + 70)), 590, win(t, EV.nylon + 0.2, EV.macroOut[0], 0.3, 0.3), IV, IV); }
  // favourites: much more of three fatty acids
  { const a = win(t, EV.much, 42.2, 0.3, 0.4); tag(c, "MUCH MORE", G.X(POS.R), G.Y(-112), a, Y, Y); tag(c, "LESS", G.X(POS.L), G.Y(-112), win(t, EV.much + 0.35, 42.2, 0.3, 0.4), MU, p3);
    const la = win(t, EV.acids, 42.2, 0.3, 0.4); if (la > 0) { const s = "3 FATTY ACIDS", w = tw(c, s, 2) + 16 + 40, x = R(270 - w / 2), y = 166 + R((1 - la) * 6); panel(c, x, y, w, 26, la, Y); SCENT_COL.forEach((col, i) => fade(c, la).rect(x + 10 + i * 11, y + 9, 8, 8, col)); dtext(c, s, x + 48, y + 6, IV, la, 2); } }
  tag(c, "STILL THE FAVORITE", G.X(POS.R), G.Y(-112), win(t, EV.still, 45.3, 0.3, 0.4), Y, Y);
  // not the blood — the skin
  headline(c, "NOT YOUR BLOOD", 196, win(t, EV.notblood - 0.05, 48.55, 0.3, 0.35), MU, 3);
  headline(c, "YOUR SKIN", 232, win(t, EV.yourskin - 0.05, 48.55, 0.3, 0.35), Y, 4);
  if (t > EV.notblood) { const a = win(t, EV.notblood + 0.25, 48.55, 0.25, 0.35); if (a > 0) { const w = tw(c, "NOT YOUR BLOOD", 3), x0 = R(270 - w / 2), x1 = R(lerp(x0, x0 + w, smooth(t, EV.notblood + 0.25, EV.notblood + 0.55))); fade(c, a).rect(x0 - 2, 205, x1 - x0 + 4, 3, "#F2706A"); } }
  // ending: phone, send, plane
  phoneUI(c, t, G, pts.phone ?? [POS.L + 1, -57]);
  flightPlane(c, t, G, [132, 345]);
}

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) { const d = c.d, row = new Uint8ClampedArray(1080 * 3); for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); } return FULL; }
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
} else if (args[0] === "--sheet") {
  // contact sheet: frames at half size in a grid (3 columns)
  const ts = args[1].split(",").map(Number), cols = 3, tw2 = 360, th2 = 640, out = args[2] ?? HERE + "stills/sheet.png";
  fs.mkdirSync(HERE + "stills", { recursive: true });
  const tiles = []; for (const t of ts) tiles.push({ input: await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).resize(tw2, th2, { kernel: "nearest" }).png().toBuffer(), left: (tiles.length % cols) * (tw2 + 8), top: Math.floor(tiles.length / cols) * (th2 + 8) });
  await sharp({ create: { width: cols * (tw2 + 8) - 8, height: Math.ceil(ts.length / cols) * (th2 + 8) - 8, channels: 3, background: "#222" } }).composite(tiles).png().toFile(out); console.log("sheet", out);
} else if (args[0] === "--video") {
  const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  // frame-to-frame difference on the grid (mean |Δ| per channel, 0..255) to find one-frame jumps afterwards
  const diffs = []; let prev = null;
  for (let f = 0; f < to; f++) { const c = frame(f / FPS); if (prev) { let d = 0; for (let i = 0; i < c.d.length; i += 3) d += Math.abs(c.d[i] - prev[i]) + Math.abs(c.d[i + 1] - prev[i + 1]) + Math.abs(c.d[i + 2] - prev[i + 2]); diffs.push(+(d / c.d.length).toFixed(3)); } prev = Uint8ClampedArray.from(c.d);
    if (!ff.stdin.write(Buffer.from(toFull(c)))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); fs.writeFileSync(HERE + "dev/diffs.json", JSON.stringify(diffs)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
