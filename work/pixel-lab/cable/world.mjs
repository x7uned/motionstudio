// The one persistent set of «How your text crosses the ocean»: an isometric slab of the Atlantic, not to scale.
// New York (dusk, the friend) at the far end, London (night, you) at the near end, the ocean cut open in front
// with the cable on the sea floor. Everything is drawn through a camera {cx, cy, z} so the film can push in,
// dive and pan continuously; textures are anchored to the world, dithering to the screen.
import { MAIN, mix, bayer, hex, fade } from "../../../renderer/pixel/raster.mjs";
import { EV } from "./timeline.mjs";

export const GW = 540, GH = 960, TOP = 190, CX = 270, CY = 575;
export const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", YL = "#FAE375", GR = "#65DA41", MU = "#959595", L = "#E0CDF8", P = "#8D59DA", PK = "#E03056";
export const p3 = "#3B2C5C", p5 = "#6E4FB0", p7 = "#B08AE8";
const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sstep = (x) => x * x * (3 - 2 * x);
const noise = (x, seed = 0) => { const i = Math.floor(x), f = x - i; return lerp(rnd(i * 7 + seed), rnd((i + 1) * 7 + seed), sstep(f)); };
export const dmix = (a, b, k, x, y, steps = 4) => { const s = clamp01(k) * steps, lo = Math.floor(s); return mix(a, b, (s - lo > bayer(x, y) ? lo + 1 : lo) / steps); };
const ramp = (stops, v, x, y) => { v = clamp01(v); const n = stops.length - 1, i = Math.min(n - 1, Math.floor(v * n)); return dmix(stops[i], stops[i + 1], v * n - i, x, y); };

// ---------------------------------------------------------------- geometry (slab units → world grid px → screen)
export const XMIN = -24, U = 3.2, LEN = 164, D = 28, NYC1 = 18, LON0 = 122, LAND = 5, OX = 90.6, OY = 338;
export const P3 = (x, y, z) => [OX + (x - y) * U, OY + ((x + y) / 2 - z) * U];
export const toScreen = (cam, w) => [CX + (w[0] - cam.cx) * cam.z, CY + (w[1] - cam.cy) * cam.z];
export const NYL = (x, y, z = 0) => [x * 1.25, y * 1.25, LAND + z * 1.25];          // New York props: local units ×1.25
export const LDL = (x, y, z = 0) => [LON0 + x * 1.25, y * 1.25, LAND + z * 1.25];
export const FRIEND_W = P3(...NYL(8, 13.5)), ME_W = P3(...LDL(8.5, 15.5));
export const MAST_H = 19, MAST_TOP = P3(...LDL(13.6, 0.8, MAST_H)), MAST_BASE = P3(...LDL(13.6, 0.8, 0));
export const PHONE_W = [ME_W[0] - 0.25, ME_W[1] - 39.5];                            // phone in your hands (sprite px / 2)
const STATION_L = [124.6, 25, LAND], STATION_N = [15.4, 26.25, LAND];
const TRENCH_L = [[139, 1, LAND], [139, 26.6, LAND], [126.3, 26.6, LAND], [124.6, 25, LAND]];
const TRENCH_N = [[15.4, 26.25, LAND], [15.4, 27, LAND], [10.6, 27, LAND], [10.6, 18.4, LAND], [10, 16.9, LAND]];

const BED = [[18, -3], [22, -6], [26, -11], [30, -42], [35, -100], [40, -120], [48, -126], [56, -124], [62, -114], [65.5, -100], [68.5, -106], [71.5, -97], [75, -112], [80, -118], [96, -114], [104, -104], [109, -60], [113, -18], [118, -8], [122, -3]];
export function seabed(x) {
  if (x <= NYC1 || x >= LON0) return LAND;
  let i = 0; while (i < BED.length - 2 && BED[i + 1][0] < x) i++;
  const [x0, z0] = BED[i], [x1, z1] = BED[i + 1], k = sstep(clamp01((x - x0) / (x1 - x0)));
  const amp = x > 61 && x < 76 ? 2.4 : x > 24 && x < 116 ? 1.6 : 0.3;
  return lerp(z0, z1, k) + (noise(x * 1.9, 3) - 0.5) * amp;
}
function cableZ(x) {
  if (x < NYC1 + 1) return lerp(LAND - 1.6, seabed(NYC1 + 1.5) + 0.6, sstep(clamp01((x - 14.5) / 5)));
  if (x > LON0 - 1) return lerp(seabed(LON0 - 1.5) + 0.6, LAND - 1.6, sstep(clamp01((x - (LON0 - 1)) / 4.5)));
  return seabed(x) + 0.6;
}
// cable samples, evenly spaced along the drawn line (world px), from New York (x 14.5) to London (x 125.5)
export const CAB = [];
{ let prev = null, acc = 0; for (let x = 14.5; x <= 125.5; x += 0.01) { const z = cableZ(x), w = P3(x, D, z); if (!prev) { CAB.push({ x, z, w }); prev = w; continue; } acc += Math.hypot(w[0] - prev[0], w[1] - prev[1]); prev = w; if (acc >= 0.35) { CAB.push({ x, z, w }); acc = 0; } } }
export function cabIndex(x) { let lo = 0, hi = CAB.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (CAB[m].x < x) lo = m; else hi = m; } return lo; }
export const cableW = (x) => CAB[cabIndex(x)].w;
export const REPEATERS = []; for (let x = 30; x <= 110; x += 8) REPEATERS.push(x);
export const FEATURED = 102;

// ---------------------------------------------------------------- the message's path
const segLen = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], (pts[i][2] ?? 0) - (pts[i - 1][2] ?? 0)); return s; };
export function along(pts, k) {
  const total = segLen(pts); let d = clamp01(k) * total;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], (pts[i][2] ?? 0) - (pts[i - 1][2] ?? 0)); if (d <= l || i === pts.length - 1) { const f = l ? clamp01(d / l) : 0; return pts[i - 1].map((v, j) => lerp(v, pts[i][j], f)); } d -= l; }
  return pts[pts.length - 1];
}
// pulse x on the cable over time (London end 125.5 → New York end 14.5); camera keys use the same table
export const PULSE_X = [[EV.slides, 125.5], [EV.sea + 0.44, 120], [20.2, 112], [21.4, 108], [22.4, 104], [EV.every + 0.4, 104], [EV.boosts, 102], [EV.boosts + 0.9, 99.5], [EV.five, 99.5], [EV.five + 0.9, 70], [EV.five + 1.7, 40], [EV.ashore - 0.1, 20], [EV.ashore, 14.5]];
export function pulseX(t) {
  if (t <= PULSE_X[0][0]) return 125.5;
  for (let i = 1; i < PULSE_X.length; i++) { const [t1, x1] = PULSE_X[i], [t0, x0] = PULSE_X[i - 1]; if (t <= t1) { const k = (t - t0) / (t1 - t0 || 1); return lerp(x0, x1, i >= 9 ? k : sstep(k)); } }
  return 14.5;
}
// where the message is (world px) and what it looks like, for any t
export function message(t) {
  if (t < EV.sends) return null;
  if (t < EV.tower + 0.15) { const k = ease((t - EV.sends) / (EV.tower + 0.15 - EV.sends)), mid = [lerp(PHONE_W[0], MAST_TOP[0], 0.5), Math.min(PHONE_W[1], MAST_TOP[1]) - 26];
    return { kind: "envelope", w: [(1 - k) ** 2 * PHONE_W[0] + 2 * (1 - k) * k * mid[0] + k * k * MAST_TOP[0], (1 - k) ** 2 * PHONE_W[1] + 2 * (1 - k) * k * mid[1] + k * k * MAST_TOP[1]] }; }
  if (t < EV.light) return { kind: "envelope", w: MAST_TOP, settle: true };
  if (t < EV.racing) { const k = smooth(t, EV.light, EV.racing); return { kind: "pulse", w: [lerp(MAST_TOP[0], MAST_BASE[0], k), lerp(MAST_TOP[1], MAST_BASE[1], k)] }; }
  if (t < EV.coast + 0.1) return { kind: "pulse", w: P3(...along(TRENCH_L, smooth(t, EV.racing, EV.coast + 0.1))), trench: "L" };
  if (t < EV.enters) return { kind: "station", w: P3(...STATION_L) };
  if (t < EV.slides) { const k = smooth(t, EV.enters, EV.slides), a = P3(...STATION_L), b = CAB[CAB.length - 1].w; return { kind: "pulse", w: [lerp(a[0], b[0], k), lerp(a[1], b[1], k)] }; }
  if (t < EV.ashore) { const x = pulseX(t); return { kind: "cable", x, w: cableW(x), dim: t > EV.every + 0.4 && t < EV.boosts ? 0.6 * smooth(t, EV.every + 0.4, EV.boosts - 0.05) : 0 }; }
  if (t < EV.ashore + 0.45) { const k = smooth(t, EV.ashore, EV.ashore + 0.45), a = CAB[0].w, b = P3(...STATION_N); return { kind: "pulse", w: [lerp(a[0], b[0], k), lerp(a[1], b[1], k)] }; }
  if (t < EV.buzzes - 0.1) return { kind: "pulse", w: P3(...along(TRENCH_N, smooth(t, EV.ashore + 0.45, EV.buzzes - 0.1))), trench: "N" };
  return null;
}

// ---------------------------------------------------------------- drawing helpers
function kit(c, PS) {
  const quad = (pts, col, shade) => c.poly(pts.map((p) => PS(...p)), col, shade);
  const box = (x, y, z, w, d, h, { top, left, right }) => {
    quad([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], left);
    quad([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], right);
    quad([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top);
  };
  // windows as tiny quads so they scale with the camera
  const windows = (x, y, z, w, d, h, col, seed, { step = 1.1, rows = 1.9, on = 0.55, ww = 0.32, wh = 0.55 } = {}) => {
    for (let zz = z + 1.4; zz < z + h - 0.7; zz += rows) {
      for (let xx = x + 0.6; xx < x + w - 0.4; xx += step) if (rnd(seed + R(xx * 31 + zz * 7)) < on) quad([[xx, y + d, zz], [xx + ww, y + d, zz], [xx + ww, y + d, zz + wh], [xx, y + d, zz + wh]], col);
      for (let yy = y + 0.6; yy < y + d - 0.4; yy += step) if (rnd(seed + R(yy * 29 + zz * 13) + 5) < on * 0.7) quad([[x + w, yy, zz], [x + w, yy + ww, zz], [x + w, yy + ww, zz + wh], [x + w, yy, zz + wh]], mix(col, O, 0.4));
    }
  };
  return { PS, quad, box, windows };
}
// scaled rectangle relative to an anchor (base px × s), for small hand-drawn props
const pr = (c, ax, ay, s, x, y, w, h, col) => { const x0 = R(ax + x * s), y0 = R(ay + y * s), x1 = R(ax + (x + w) * s), y1 = R(ay + (y + h) * s); c.rect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0), col); };
// pixel pattern scaled by s (continuous), '.' transparent
export function pattern(c, ax, ay, s, rows, map, flip = false) { const w = rows[0].length; rows.forEach((row, j) => [...row].forEach((ch, i) => { const col = map[ch]; if (col) pr(c, ax, ay, s, flip ? w - 1 - i : i, j, 1, 1, col); })); }
// radial glow accumulated in a max-buffer, applied once as a dithered tint
export class Glow {
  constructor() { this.b = new Float32Array(GW * GH); this.used = false; }
  add(x, y, r, a) { if (a <= 0 || r <= 0) return; this.used = true; const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(GW - 1, Math.ceil(x + r)), y0 = Math.max(TOP, Math.floor(y - r)), y1 = Math.min(GH - 1, Math.ceil(y + r));
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) { const d = Math.hypot(i - x, j - y) / r; if (d < 1) { const v = a * (1 - d) * (1 - d); const k = j * GW + i; if (v > this.b[k]) this.b[k] = v; } } }
  apply(c, col, steps = 4) { if (!this.used) return; c.tint(0, TOP, GW, GH - TOP, (x, y) => this.b[y * GW + x], col, steps); this.b.fill(0); this.used = false; }
}
const glowY = new Glow(), glowB = new Glow();

// ---------------------------------------------------------------- sky
const DUSK = [[-10, "#1A1030"], [36, "#3A1D4E"], [76, "#7A3360"], [112, "#C9586B"], [142, "#F2A06A"], [172, "#F6C27E"], [230, "#C9586B"], [320, "#3A1D4E"], [460, "#140C26"], [2000, "#140C26"]];
function sky(c, cam) {
  const px = (cam.cx - 270) * 0.5, py = (cam.cy - 575) * 0.25;
  for (let sy = TOP; sy < GH; sy++) {
    const yy = sy - TOP + py; let i = 0; while (i < DUSK.length - 2 && yy > DUSK[i + 1][0]) i++;
    const dk = (yy - DUSK[i][0]) / (DUSK[i + 1][0] - DUSK[i][0]);
    for (let sx = 0; sx < GW; sx++) {
      const kx = clamp01((300 - sx - px - yy * 0.15) / 260), night = dmix("#0C0A20", "#1C1842", yy / 380, sx, sy);
      c.px(sx, sy, kx <= 0 ? night : dmix(night, dmix(DUSK[i][1], DUSK[i + 1][1], dk, sx, sy), kx, sx + 1, sy, 5));
    }
  }
  for (let i = 0; i < 170; i++) { const x = R(((rnd(i * 3 + 1) * 900 - px * 0.6) % 900 + 900) % 900 - 180), y = R(TOP + 4 + rnd(i * 5 + 2) * 400 - py * 0.6); if (x < 0 || x >= GW || y < TOP || y >= GH) continue; if (x + px < 200 + (y - TOP + py) * 0.4) continue;
    c.px(x, y, rnd(i * 11) < 0.15 ? IV : rnd(i * 13) < 0.5 ? L : "#5A5480"); if (rnd(i * 17) < 0.06) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.px(x + a, y + b, "#5A5480"); }
}

// ---------------------------------------------------------------- the slab: sea surface, land, cut faces
const WATER = ["#5279DE", "#3D60C0", "#2F4CA2", "#253C86", "#1E316E", "#18285A", "#14214A", "#111C3E"];
function rock(x, z, zTop, sx, sy, dark = 0) {
  const dz = zTop - z, land = zTop >= LAND - 0.01;
  let col;
  if (land && dz < 0.8) col = x < 60 ? "#5E7A55" : "#3A5244";
  else if (dz < 1.5) col = land ? "#7A5C4C" : "#7C6E8E";
  else if (land && dz < 4) col = "#5E4640";
  else { const band = Math.floor((z + 1.4 * Math.sin(x * 0.35 + z * 0.05) + 600) / 5) % 4; col = ["#644A58", "#5A4252", "#503A4A", "#5E4655"][band]; }
  col = dmix(col, "#140E1C", clamp01((-z - 10) / 170) * 0.7 + dark, sx, sy);
  const pb = rnd(Math.floor(x * 3.2) * 977 + Math.floor(z * 2.2) * 131);
  if (dz >= 1.5 && pb < 0.05) col = mix(col, "#9A8AA6", 0.3); else if (dz >= 1.5 && pb > 0.97) col = mix(col, "#0E0A14", 0.35);
  if (!land && dz >= 1.5 && dz < 2.6 && rnd(Math.floor(x * 6) * 61 + Math.floor(z * 5) * 17) < 0.25) col = mix(col, "#9A8CA6", 0.5);
  return col;
}
function waterAt(x, z, sx, sy, t) {
  const d = -z;
  let col = ramp(WATER, d / 126, sx, sy);
  const shaft = ((x * 2.2 + z * 0.5 + t * 0.6) % 11 + 11) % 11;
  if (d < 40 && shaft < 2 && (1 - d / 40) * 0.55 > bayer(sx, sy)) col = mix(col, "#8FB0F8", 0.22);
  if (d > 60) { const fx = Math.floor(x * 3), fz = Math.floor(z * 2 + t * 0.8); if (rnd(fx * 7919 + fz * 104729) < 0.012 && rnd(fx * 31 + fz * 17) < 0.5 && (x * 3 - fx) < 0.34 && (z * 2 + t * 0.8 - fz) < 0.5) col = mix(col, "#C8D4FF", 0.45); }
  return col;
}
function slab(c, cam, t) {
  const z = cam.z, inv = (sx, sy) => [cam.cx + (sx - CX) / z, cam.cy + (sy - CY) / z], S = (x, y, zz) => toScreen(cam, P3(x, y, zz));
  const SL = kit(c, S);
  // sea surface: swells drift west, dusk pink near New York, night blue near London
  SL.quad([[NYC1, 0, 0], [LON0, 0, 0], [LON0, D, 0], [NYC1, D, 0]], null, (sx, sy) => {
    const [wx, wy] = inv(sx + 0.5, sy + 0.5), a = (wx - OX) / U, b = 2 * (wy - OY) / U, x = (a + b) / 2, y = (b - a) / 2;
    let col = dmix("#5A4E9C", "#1E2C68", (x - NYC1) / 60, sx, sy);
    const crest = (((y * 0.85 + 0.35 * Math.sin(x * 0.55 + t * 0.9) - t * 0.12) % 1) + 1) % 1;
    if (crest < 0.1 && noise(x * 0.9 + Math.floor(y * 0.85 - t * 0.12) * 13, 5) > 0.5) col = mix(col, x < 60 ? "#F0A8C0" : "#7A96E8", 0.6);
    else if (crest > 0.55 && crest < 0.62) col = mix(col, O, 0.18);
    if (x < NYC1 + 1.2 || x > LON0 - 1.2) col = mix(col, "#D8E0FF", 0.55 + 0.15 * Math.sin(t * 2 + y));
    return col;
  });
  SL.box(XMIN, 0, 0, NYC1 - XMIN, D, LAND, { top: "#5E7A55", left: "#000", right: "#7A6870" });
  SL.box(LON0, 0, 0, LEN - LON0, D, LAND, { top: "#3A5244", left: "#000", right: "#000" });
  for (let y = 0; y <= D; y += 0.2 / Math.max(1, z)) { const [sx, sy] = S(NYC1, y, LAND); c.px(R(sx), R(sy), "#B8ACC2"); const [lx, ly] = S(LON0, y, LAND); c.px(R(lx), R(ly), "#6A7A70"); }
  // front cut face (plane y = D)
  const f0 = Math.max(0, Math.floor(S(XMIN, D, 0)[0])), f1 = Math.min(GW, Math.ceil(S(LEN, D, 0)[0]));
  for (let sx = f0; sx < f1; sx++) {
    const wx = cam.cx + (sx + 0.5 - CX) / z, x = (wx - OX) / U + D; if (x < XMIN || x > LEN) continue;
    const top = x <= NYC1 || x >= LON0 ? LAND : 0, bed = seabed(x), syTop = Math.ceil(CY + (OY + ((x + D) / 2 - top) * U - cam.cy) * z);
    for (let sy = Math.max(TOP, syTop); sy < GH; sy++) {
      const wy = cam.cy + (sy + 0.5 - CY) / z, zz = (x + D) / 2 - (wy - OY) / U;
      let col = zz > bed ? waterAt(x, zz, sx, sy, t) : rock(x, zz, bed, sx, sy);
      if (sy === syTop && top === 0) col = hex("#A8BEFF");
      c.px(sx, sy, col);
    }
  }
  // right cut face (plane x = LEN) under London
  const r1 = Math.min(GW, Math.ceil(S(LEN, 0, 0)[0]));
  for (let sx = Math.max(0, f1); sx < r1; sx++) {
    const wx = cam.cx + (sx + 0.5 - CX) / z, y = LEN - (wx - OX) / U; if (y < 0 || y > D) continue;
    const syTop = Math.ceil(CY + (OY + ((LEN + y) / 2 - LAND) * U - cam.cy) * z);
    for (let sy = Math.max(TOP, syTop); sy < GH; sy++) { const wy = cam.cy + (sy + 0.5 - CY) / z, zz = (LEN + y) / 2 - (wy - OY) / U; c.px(sx, sy, rock(LEN + y * 0.4, zz, LAND, sx, sy, 0.2)); }
  }
  if (f1 > 0 && f1 < GW) for (let sy = Math.max(TOP, R(S(LEN, D, LAND)[1])); sy < GH; sy++) c.px(f1, sy, mix(c.get(f1, sy), IV, 0.18));
  return { S, SL };
}

// ---------------------------------------------------------------- sea life
const FISH = ["..XX..", "XXXXX.", "XXXXXX", "XXXXX.", "..XX.."].map((r) => r.replace(/X/g, "X"));
const SHARK = ["..........X.........", ".........XX.........", "...XXXXXXXXXXXXX..XX", ".XXXXXXXXXXXXXXXXXX.", "XXOXXXXXXXXXXXXXXXXX", "WWWWWXXXXXXXXXXX..XX", ".WWWW.......X......."];
const SHARK_BITE = ["..........X.........", ".........XX.........", "...XXXXXXXXXXXXX..XX", "XXXXXXXXXXXXXXXXXXX.", "XO....XXXXXXXXXXXXXX", "WWWW..XXXXXXXXXX..XX", ".WWWW.......X......."];
const WHALE = ["......XXXXXXXXX.........", "...XXXXXXXXXXXXXXX....XX", ".XXXXXXXXXXXXXXXXXXXXXX.", "XXOXXXXXXXXXXXXXXXXXX.XX", ".XXXXXXXXXXXXXX.........", "...LLLLLLLL............."];
function seaLife(c, cam, t, S) {
  const s = Math.max(1, cam.z * 0.9), FP = (x, z) => S(x, D, z);
  // a school of fish near the surface, drifting west
  for (let i = 0; i < 9; i++) { const x = 40 + (i % 5) * 1.5 + rnd(i) * 0.8 - ((t * 0.35) % 30), [sx, sy] = FP(x < 26 ? x + 30 : x, -12 - Math.floor(i / 5) * 2.4 - rnd(i + 9) * 1.2 + 0.4 * Math.sin(t * 2 + i)); pattern(c, sx, sy, s * 0.6, FISH, { X: "#A9C0F4" }, true); }
  for (let i = 0; i < 12; i++) { const x = 92 + (i % 6) * 1.3 + rnd(i * 7) * 0.7 + ((t * 0.25) % 8), [sx, sy] = FP(x, -26 - Math.floor(i / 6) * 2.2 - rnd(i + 3) + 0.4 * Math.sin(t * 1.7 + i)); pattern(c, sx, sy, s * 0.55, FISH, { X: "#7E98DA" }); }
  // jellyfish (soft glow), whale, anglerfish lamp
  { const [jx, jy] = FP(86, -42 + Math.sin(t * 0.8) * 1.5); glowB.add(jx, jy, 10 * s, 0.5); pattern(c, jx - 4 * s, jy - 2 * s, s, ["..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", "W.W.W.W.W", "W.W.W.W.W", ".W.W.W.W.", ".W...W...", "..W...W.."], { X: "#E9A6E0", W: "#B06AAE" }); }
  { const [wx, wy] = FP(98 - t * 0.12, -70 + Math.sin(t * 0.3) * 2); pattern(c, wx, wy, s, WHALE, { X: "#22305E", O: "#C8D4FF", L: "#3A4E86" }); }
  { const [ax, ay] = FP(50, -112); glowY.add(ax, ay, 12 * s, 0.6 * (0.8 + 0.2 * Math.sin(t * 3))); pattern(c, ax - 1 * s, ay - 1 * s, s, ["Y.......", ".X......", "..XXXXX.", ".XXXXXXX", "XOXXXXXX", ".XXXXXX.", "..XXXX.."], { Y: YL, X: "#070A16", O: "#C8D4FF" }); }
  // the shark: swims to the cable, bites, swims off (story beat)
  const sa = win(t, EV.sharks - 0.35, EV.bitten + 1.1, 0.3, 0.5);
  if (sa > 0) {
    const k1 = smooth(t, EV.sharks - 0.35, EV.bitten), k2 = smooth(t, EV.bitten + 0.35, EV.bitten + 1.5), bx = 86.5, bz = cableZ(86.5) + 2.2;
    const x = k2 > 0 ? lerp(bx, 99, k2) : lerp(64, bx, k1), zz = k2 > 0 ? lerp(bz, -84, k2) : lerp(-92, bz, k1), [sx, sy] = FP(x, zz), biting = t > EV.bitten - 0.12 && t < EV.bitten + 0.3, ss = s * 1.6;
    pattern(fade(c, sa), sx - 10 * ss, sy - 4 * ss, ss, biting ? SHARK_BITE : SHARK, { X: "#7A86A8", O: "#E8EEFF", W: "#B8C0D8" }, k2 <= 0);
  }
}

// ---------------------------------------------------------------- the cable, repeaters, pulses, power, damage
function kinkAt(x, t) {
  // the anchor drags the cable: samples near the anchor are pulled along and lifted
  const a = anchorState(t); if (!a || a.drag <= 0) return [0, 0];
  const d = Math.abs(x - a.x), r = 3.2; if (d > r || x > a.x + 0.2) return [0, 0];
  const f = Math.cos((d / r) * Math.PI / 2) ** 2 * Math.min(1, a.drag);
  return [f * Math.min(2.4, (a.x - 74.5)), f * 2.2];
}
export function anchorState(t) {
  const t0 = EV.anchors - 0.45, t1 = EV.anchors + 0.15; if (t < t0 || t > EV.nets + 1.6) return null;
  const bedZ = seabed(73.5) + 1.2, fall = clamp01((t - t0) / (t1 - t0));
  const zz = lerp(0.3, bedZ, fall * fall), x = t < t1 ? 73.5 : lerp(73.5, 78.5, smooth(t, t1 + 0.05, EV.nets + 0.6));
  return { x, z: zz, drag: t > t1 + 0.05 ? smooth(t, t1 + 0.05, t1 + 0.3) : 0, hit: t1 };
}
function cable(c, cam, t, S) {
  const z = cam.z, th = Math.max(3, R(1.5 * z)), glowOn = Math.max(0.35, smooth(t, EV.under, EV.oceanEnd));   // hook: dim until "under the ocean"
  const kinkLive = t > EV.anchors - 0.5 && t < EV.nets + 1.8;
  const pts = CAB.map((p) => { let w = p.w; if (kinkLive) { const [dx, dz] = kinkAt(p.x, t); if (dx || dz) w = P3(p.x + dx, D, p.z + dz); } return toScreen(cam, w); });
  // soft gold glow along the line (sweeps from London to New York on "under the ocean")
  const sweep = smooth(t, EV.under - 0.1, EV.oceanEnd + 0.2);
  for (let i = 0; i < pts.length; i += Math.max(2, R(8 / z))) { const [sx, sy] = pts[i]; if (sx < -20 || sx > GW + 20 || sy < TOP - 20 || sy > GH + 20) continue; const lit = t < EV.oceanEnd + 0.3 ? (CAB[i].x > 125.5 - 111 * sweep ? 1 : 0.35) : 1; glowY.add(sx, sy, 9 * Math.pow(z, 0.75), 0.42 * glowOn * lit); }
  for (let i = 0; i < pts.length; i++) { const [sx, sy] = pts[i]; if (sx < -th || sx > GW + th || sy < TOP - th || sy > GH + th) continue; const x0 = R(sx - th / 2), y0 = R(sy - th / 2);
    c.rect(x0, y0 + th, th, 1, "#0E0A14"); c.rect(x0, y0, th, th, "#3A3250"); c.rect(x0, y0, th, Math.max(1, R(th / 3)), "#A89ECC"); }
  // resting light flecks in the hook (they come alive on "under the ocean")
  if (t < EV.zoomIn[1] + 1) for (let i = 0; i < pts.length; i++) if (Math.floor((i + t * 40 * smooth(t, EV.under, EV.oceanEnd)) / 14) % 9 === 0) { const [sx, sy] = pts[i]; c.rect(R(sx) - 1, R(sy) - 1, 2, 2, YL); }
  // repeaters
  for (const x of REPEATERS) { const big = x === FEATURED ? 1.7 : 1, i = cabIndex(x - 0.6 * big), [sx, sy] = pts[i], j = cabIndex(x + 1.2 * big), [ex, ey] = pts[j], len = Math.max(5, Math.hypot(ex - sx, ey - sy)), ang = Math.atan2(ey - sy, ex - sx);
    const rr = Math.max(2, 0.95 * U * z * 0.55 * big), boost = x === FEATURED ? win(t, EV.boosts - 0.05, EV.boosts + 0.5, 0.08, 0.6) : 0;
    for (let k = -len / 2; k <= len / 2; k += 0.5) { const cx0 = (sx + ex) / 2 + Math.cos(ang) * k, cy0 = (sy + ey) / 2 + Math.sin(ang) * k, taper = Math.min(1, (len / 2 - Math.abs(k)) / (rr * 0.9) + 0.3); c.disc(R(cx0), R(cy0), Math.max(1, R(rr * taper)), "#4A4462"); c.px(R(cx0), R(cy0 - rr * taper), "#9A92BC"); }
    const mx = R((sx + ex) / 2), my = R((sy + ey) / 2); c.rect(mx - 1, my - 1, 2, 2, boost > 0 ? IV : "#7FE0FF"); if (boost > 0) glowY.add(mx, my, 26 * Math.pow(z, 0.6), 0.9 * boost); else glowB.add(mx, my, 5 * z, 0.35); }
  // power from shore: sparks run along the copper from London toward the featured repeater
  const pw = win(t, EV.thousands - 0.1, EV.sharks - 0.2, 0.25, 0.3);
  if (pw > 0) for (let k = 0; k < 9; k++) { const x = FEATURED + ((k * 2.6 - t * 7) % 23 + 23) % 23; if (x > 124) continue; const i = cabIndex(x), [sx, sy] = pts[i], g = fade(c, pw), s = Math.max(1, z * 0.8);
    pattern(g, sx - 3 * s, sy - 6 * s, s, ["...Y.", "..Y..", ".YYY.", "..Y..", ".Y..."], { Y: YL }); glowY.add(sx, sy - 2 * s, 8 * s, 0.5 * pw); }
  return pts;
}
function drawPulse(c, cam, pts, x, { trail = 7, bright = 1, size = 1 } = {}) {
  const i0 = cabIndex(x), z = cam.z, step = Math.max(1, R(1 / z));
  const n = Math.min(CAB.length - 1 - i0, R(trail * U * 1.2 / 0.35));
  for (let k = n; k >= 0; k -= step) { const [sx, sy] = pts[i0 + k], f = 1 - k / (n + 1), r = Math.max(1, (1.2 + 1.6 * f) * Math.pow(z, 0.7) * size);
    c.disc(R(sx), R(sy), R(r * 0.6), mix(Y, IV, f * bright)); }
  const [hx, hy] = pts[i0]; glowY.add(hx, hy, 18 * Math.pow(z, 0.7) * size, 0.95 * bright); c.disc(R(hx), R(hy), Math.max(1, R(2.4 * Math.pow(z, 0.7) * size)), IV);
}

// ---------------------------------------------------------------- cities
function newYork(c, cam, t) {
  const NY = kit(c, (x, y, z) => toScreen(cam, P3(...NYL(x, y, z)))), s = cam.z;
  const DB = { top: "#A2729A", left: "#D27C84", right: "#4C3060" }, DB2 = { top: "#86609A", left: "#AE6A88", right: "#3E2A56" };
  NY.box(0.8, 0.8, 0, 3.6, 3.6, 22, DB2); NY.windows(0.8, 0.8, 0, 3.6, 3.6, 22, YL, 31);
  NY.box(5, 1, 0, 3.6, 3.6, 26, DB); NY.windows(5, 1, 0, 3.6, 3.6, 26, YL, 57); NY.box(5.7, 1.7, 26, 2.2, 2.2, 4, DB); NY.box(6.3, 2.3, 30, 1, 1, 2, DB);
  { const [sx, sy] = NY.PS(6.8, 2.8, 32); pr(c, sx, sy, s, 0, -12, 1, 12, "#E2D2EA"); pr(c, sx, sy, s, 0, -13, 1, 1, Math.sin(t * 4) > 0 ? "#FF6A6A" : "#802838"); }
  NY.box(1, 6, 0, 3.4, 3.4, 12, DB); NY.windows(1, 6, 0, 3.4, 3.4, 12, YL, 77);
  NY.box(9.6, 0.8, 0, 3.8, 3.4, 17, DB2); NY.windows(9.6, 0.8, 0, 3.8, 3.4, 17, YL, 91);
  NY.box(6, 6.2, 0, 3, 3, 9, DB2); NY.windows(6, 6.2, 0, 3, 3, 9, YL, 113);
  NY.box(10.4, 5.4, 0, 3, 3, 7, DB); NY.windows(10.4, 5.4, 0, 3, 3, 7, YL, 131);
  for (const [x, y, w, d, h, k] of [[-14, 3, 3, 3, 8, 0], [-10, 2, 3.4, 3, 11, 1], [-6, 3, 3, 3, 7, 0], [-14, 9, 3, 3, 5, 1], [-9.5, 9.5, 3, 3, 6, 0], [-5, 8.5, 3, 3, 9, 1], [-13, 15, 3, 3, 4, 0], [-8, 15.5, 3, 3, 5, 1]]) { NY.box(x, y, 0, w, d, h, k ? DB : DB2); NY.windows(x, y, 0, w, d, h, YL, 900 + R(x * 13 + y * 7)); }
  for (const [x, y] of [[-15, 20], [-11, 21], [-6.5, 20.5], [-2.5, 19.5]]) { NY.box(x, y, 0, 0.5, 0.5, 1.6, { top: "#4A3A30", left: "#5A4638", right: "#3A2E26" }); NY.box(x - 0.9, y - 0.9, 1.6, 2.3, 2.3, 2, { top: "#6E9A5E", left: "#4E7A48", right: "#355A36" }); }
  // Statue of Liberty
  NY.box(1.2, 17, 0, 2.2, 2.2, 2.6, { top: "#A89CB4", left: "#C4B8CC", right: "#76708A" });
  { const [sx, sy] = NY.PS(2.3, 18.1, 2.6), G = "#62B8A4", G2 = "#3E8878";
    pr(c, sx, sy, s, -2, -16, 5, 16, G); pr(c, sx, sy, s, 1, -16, 2, 16, G2); pr(c, sx, sy, s, -1, -20, 3, 4, G); pr(c, sx, sy, s, -2, -21, 1, 1, G); pr(c, sx, sy, s, 0, -22, 1, 1, G); pr(c, sx, sy, s, 2, -21, 1, 1, G);
    pr(c, sx, sy, s, -4, -27, 2, 12, G); pr(c, sx, sy, s, -5, -30, 3, 3, YL); pr(c, sx, sy, s, -4, -31, 1, 1, "#FFF3B0"); glowY.add(sx - 4 * s, sy - 30 * s, 8 * s, 0.45); }
  // landing station
  NY.box(11, 18.4, 0, 2.6, 2.6, 2, { top: "#C0B6CE", left: "#9A8EAE", right: "#625A7A" });
  { const [sx, sy] = NY.PS(11.6, 21, 1); pr(c, sx, sy, s, 0, -1, 3, 2, YL); }
}
function london(c, cam, t) {
  const LD = kit(c, (x, y, z) => toScreen(cam, P3(...LDL(x, y, z)))), s = cam.z;
  const NB = { top: "#4E4460", left: "#62546A", right: "#30283C" }, ST = { top: "#806E5C", left: "#9A8466", right: "#4E423C" };
  LD.box(1.5, 0.8, 0, 9.5, 2.6, 5, ST); LD.windows(1.5, 0.8, 0, 9.5, 2.6, 5, "#FFD27A", 501, { step: 1, rows: 1.7, on: 0.7 });
  for (let x = 2; x < 11; x += 1.3) { const [sx, sy] = LD.PS(x, 3.4, 5); pr(c, sx, sy, s, 0, -3, 1, 3, "#9A8466"); pr(c, sx, sy, s, 0, -4, 1, 1, "#B49C78"); }
  for (let i = 0; i < 3; i++) { const x = 0.8 + i * 3; LD.box(x, 7.5, 0, 2.8, 2.8, 3.6, NB); LD.quad([[x, 7.5, 3.6], [x + 2.8, 7.5, 3.6], [x + 2.8, 8.9, 5.2], [x, 8.9, 5.2]], "#3C3250"); LD.quad([[x, 8.9, 5.2], [x + 2.8, 8.9, 5.2], [x + 2.8, 10.3, 3.6], [x, 10.3, 3.6]], "#584A66"); LD.windows(x, 7.5, 0, 2.8, 2.8, 3.6, "#FFC86A", 300 + i * 17, { step: 1, rows: 1.5, on: 0.65 }); }
  LD.box(11.2, 3.8, 0, 2.4, 2.4, 19, ST); LD.windows(11.2, 3.8, 0, 2.4, 2.4, 19, "#FFD27A", 777, { step: 1.1, rows: 2.2, on: 0.35 });
  LD.box(11, 3.6, 19, 2.8, 2.8, 3.4, { top: "#A08A6A", left: "#B09470", right: "#5E4E40" });
  for (const [fx, fy, k] of [[12.4, 6.4, 0], [13.8, 5, 1]]) { const [sx, sy] = LD.PS(fx, fy, 20.7); glowY.add(sx, sy, 10 * s, 0.4); c.disc(R(sx), R(sy), Math.max(2, R(3 * s * 0.8)), k ? "#E6CE8E" : "#FFF3C4"); pr(c, sx, sy, s * 0.8, 0, -1.5, 0.6, 1.5, "#3A2E28"); pr(c, sx, sy, s * 0.8, 0, 0, 1.4, 0.6, "#3A2E28"); }
  LD.quad([[11, 3.6, 22.4], [13.8, 3.6, 22.4], [12.4, 5, 28]], "#5A6878"); LD.quad([[11, 6.4, 22.4], [13.8, 6.4, 22.4], [12.4, 5, 28]], "#3E4A5A"); LD.quad([[13.8, 3.6, 22.4], [13.8, 6.4, 22.4], [12.4, 5, 28]], "#2C3644");
  for (let i = 0; i < 4; i++) for (let r = 0; r < 2; r++) { const x = 16.5 + i * 3.1, y = 2 + r * 9; LD.box(x, y, 0, 2.9, 2.8, 3.4 + (i % 2) * 0.6, NB); LD.quad([[x, y, 3.4 + (i % 2) * 0.6], [x + 2.9, y, 3.4 + (i % 2) * 0.6], [x + 2.9, y + 1.4, 5 + (i % 2) * 0.6], [x, y + 1.4, 5 + (i % 2) * 0.6]], "#3C3250"); LD.quad([[x, y + 1.4, 5 + (i % 2) * 0.6], [x + 2.9, y + 1.4, 5 + (i % 2) * 0.6], [x + 2.9, y + 2.8, 3.4 + (i % 2) * 0.6], [x, y + 2.8, 3.4 + (i % 2) * 0.6]], "#584A66"); LD.windows(x, y, 0, 2.9, 2.8, 3.4, "#FFC86A", 610 + i * 7 + r * 31, { step: 1, rows: 1.5, on: 0.6 }); }
  for (const [x, y] of [[17, 16], [21, 17.5], [25, 16.5], [18.5, 21], [23, 21.5]]) { LD.box(x, y, 0, 0.5, 0.5, 1.4, { top: "#3A2E26", left: "#4A3A30", right: "#2A221C" }); LD.box(x - 0.9, y - 0.9, 1.4, 2.3, 2.3, 2, { top: "#3E5E44", left: "#2E4A36", right: "#1E3226" }); }
  // phone mast (the message's first hop)
  { const [bx, by] = LD.PS(13.6, 0.8, 0), [tx, ty] = LD.PS(13.6, 0.8, MAST_H), w = 2.4 * s;
    c.line(R(bx - w), R(by), R(tx), R(ty), "#8C88A0"); c.line(R(bx + w), R(by), R(tx), R(ty), "#6C6880"); if (s > 1.6) { c.line(R(bx - w) + 1, R(by), R(tx) + 1, R(ty), "#8C88A0"); c.line(R(bx + w) - 1, R(by), R(tx) - 1, R(ty), "#6C6880"); }
    for (let k = 0.12; k < 1; k += 0.14) { const yy = lerp(by, ty, k), hw = w * (1 - k); c.line(R(bx - hw), R(yy), R(bx + hw), R(yy - 3 * s * 0.5), "#6C6880"); }
    pr(c, tx, ty, s, -2.5, 2, 1, 3, "#B8B4C8"); pr(c, tx, ty, s, 1.5, 2, 1, 3, "#B8B4C8"); pr(c, tx, ty, s, -0.5, -1, 1, 1, Math.sin(t * 3) > -0.3 ? "#FF5A5A" : "#7A2A30"); glowY.add(tx, ty - s, 6 * s, 0); }
  for (const [x, y] of [[2, 20.5], [13.6, 9]]) { const [sx, sy] = LD.PS(x, y, 0); pr(c, sx, sy, s, 0, -9, 1, 9, "#4A4458"); pr(c, sx, sy, s, -1, -10, 3, 1, YL); glowY.add(sx, sy - 9 * s, 8 * s, 0.35); }
  // landing station (plain building by the beach)
  const lit = win(t, EV.coast - 0.1, EV.slides + 0.2, 0.2, 0.4);
  LD.box(0.8, 17.4, 0, 2.6, 2.6, 2, { top: "#7A7088", left: "#625872", right: "#3E3650" });
  { const [sx, sy] = LD.PS(1.4, 20, 1); pr(c, sx, sy, s, 0, -1, 3, 2, lit > 0.5 ? IV : YL); if (lit > 0) glowY.add(sx + 1.5 * s, sy, 12 * s, 0.8 * lit); }
}
// open trenches with the fibre under the streets
function trench(c, cam, t, pts, kind) {
  const a = kind === "L" ? win(t, EV.racing - 0.45, EV.enters, 0.4, 0.6) : win(t, EV.ashore + 0.2, EV.buzzes + 1.2, 0.35, 0.6); if (a <= 0) return;
  const g = fade(c, a), S = (p) => toScreen(cam, P3(...p)), z = cam.z, w = Math.max(2, R(0.9 * U * z * 0.5));
  for (let i = 1; i < pts.length; i++) { const A = S(pts[i - 1]), B = S(pts[i]), n = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1])); for (let k = 0; k <= n; k++) { const x = lerp(A[0], B[0], k / n), y = lerp(A[1], B[1], k / n); g.rect(R(x - w / 2), R(y - w / 4), w, Math.max(2, R(w / 2)), "#1A1424"); g.px(R(x), R(y), "#7A6A92"); } }
}
// ship, fishing boat, anchor with chain, trawl net
function shipping(c, cam, t, S) {
  const SL = kit(c, S), x0 = 73 - 0.05 * Math.min(t, EV.anchors - 0.5), y0 = 24, s = cam.z;
  for (let k = 0; k < 18; k++) { const w = S(x0 + 9 + k * 0.8, y0 + 1.5 + ((k % 2) ? 1 : -1) * (k / 18) * 1.6, 0); c.px(R(w[0]), R(w[1]), "#A8BEFF"); }
  SL.box(x0, y0, -0.3, 9, 3, 1.4, { top: "#5A4A6A", left: "#9A3E4E", right: "#5A2434" });
  for (let i = 0; i < 4; i++) SL.box(x0 + 1 + i * 1.6, y0 + 0.5, 1.1, 1.4, 2, 1.1, [{ top: "#E8A848", left: "#B87828", right: "#704A18" }, { top: "#62A8C8", left: "#3A7A98", right: "#265468" }][i % 2]);
  SL.box(x0 + 7.2, y0 + 0.4, 1.1, 1.6, 2.2, 2.4, { top: "#ECE6F4", left: "#CCC4DA", right: "#8C84A0" }); { const w = S(x0 + 7.8, y0 + 2.6, 2.8); pr(c, w[0], w[1], s, 0, 0, 1, 1, YL); }
  // anchor on its chain
  const an = anchorState(t);
  if (an) { const top = S(x0 + 0.5, D, 0.2), bot = S(an.x, D, an.z), n = Math.ceil(Math.hypot(bot[0] - top[0], bot[1] - top[1]) / Math.max(2, 2 * s));
    for (let k = 0; k <= n; k++) { const x = lerp(top[0], bot[0], k / n) + Math.sin(k * 0.7) * 0.5 * s * (1 - an.drag), y = lerp(top[1], bot[1], k / n); pr(c, x, y, s * 0.8, -1, -1, 2, 2, k % 2 ? "#5A5470" : "#8A84A0"); }
    pattern(c, bot[0] - 4 * s, bot[1] - 2 * s, s, ["...XX...", "..XXXX..", "...XX...", "...XX...", "X..XX..X", "XX.XX.XX", ".XXXXXX.", "..XXXX.."], { X: "#2A2636" });
    const hit = win(t, an.hit, an.hit + 0.35, 0.03, 0.3); if (hit > 0) { glowY.add(bot[0], bot[1], 24 * s, 0); const g = fade(c, hit); for (let k = 0; k < 8; k++) { const a2 = k * Math.PI / 4, r = (6 + 10 * smooth(t, an.hit, an.hit + 0.35)) * s; g.rect(R(bot[0] + Math.cos(a2) * r), R(bot[1] + Math.sin(a2) * r * 0.6), Math.max(1, R(s)), Math.max(1, R(s)), "#C8B8D0"); } }
    if (an.drag > 0) { const fl = win(t, an.hit + 0.25, an.hit + 0.75, 0.05, 0.3); if (fl > 0) { const w = cableW(an.x + 0.3), p = toScreen(cam, w); for (const r of [14, 22]) fade(c, fl * (r === 14 ? 1 : 0.6)).ering(R(p[0]), R(p[1]), R(r * s), R(r * s * 0.7), PK); } }
  }
  // fishing boat dragging a trawl net along the bottom
  const na = win(t, EV.fishing - 0.45, EV.nets + 1.2, 0.35, 0.45);
  if (na > 0) { const g = fade(c, na), xn = lerp(91, 83.5, smooth(t, EV.fishing - 0.45, EV.nets + 1.0)), bx = xn + 9;
    kit(g, S).box(bx, 24.5, -0.2, 4, 2, 1, { top: "#4A5A6A", left: "#3A6A8A", right: "#24485E" }); kit(g, S).box(bx + 2.6, 24.8, 0.8, 1.2, 1.4, 1.4, { top: "#D8D2E0", left: "#B8B0C8", right: "#7A7290" });
    const nb = seabed(xn) + 0.8, top = S(bx + 0.3, D, 0.1), c1 = S(xn + 2.5, D, nb + 4.5), c2 = S(xn + 2.5, D, nb);
    g.line(R(top[0]), R(top[1]), R(c1[0]), R(c1[1]), "#9A94B0"); g.line(R(top[0]), R(top[1]), R(c2[0]), R(c2[1]), "#9A94B0");
    const q = [S(xn + 2.5, D, nb + 4.5), S(xn + 2.5, D, nb), S(xn - 3, D, nb), S(xn - 3.5, D, nb + 2.2)];
    for (let k = 0; k <= 6; k++) { const a = [lerp(q[0][0], q[3][0], k / 6), lerp(q[0][1], q[3][1], k / 6)], b = [lerp(q[1][0], q[2][0], k / 6), lerp(q[1][1], q[2][1], k / 6)]; g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#B8B0C8"); }
    for (let k = 0; k <= 4; k++) { const a = [lerp(q[0][0], q[1][0], k / 4), lerp(q[0][1], q[1][1], k / 4)], b = [lerp(q[3][0], q[2][0], k / 4), lerp(q[3][1], q[2][1], k / 4)]; g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#B8B0C8"); }
    for (let k = 0; k <= 4; k++) { const p = [lerp(q[0][0], q[3][0], k / 4), lerp(q[0][1], q[3][1], k / 4)]; g.disc(R(p[0]), R(p[1]), Math.max(1, R(s)), "#F0A040"); } }
}

// ---------------------------------------------------------------- the whole world for one frame
export function drawWorld(c, cam, t) {
  sky(c, cam, t);
  const { S } = slab(c, cam, t);
  seaLife(c, cam, t, S);
  // depth ruler on the slopes (1 km ≈ 31 units of the exaggerated vertical scale): both in the hook, London side in the dive
  const hookA = 1 - smooth(t, EV.zoomIn[0], EV.zoomIn[0] + 0.4), diveA = win(t, EV.sea, EV.garden - 0.5, 0.4, 0.4);
  for (const side of [0, 1]) { const a = Math.max(hookA, side ? diveA : 0); if (a <= 0) continue;
    for (let k = 1; k <= 4; k++) {
      const zz = -31 * k; let hit = null;
      for (let x = side ? 121 : NYC1 + 0.5; side ? x > 60 : x < 60; x += side ? -0.1 : 0.1) if (seabed(x) < zz - 1) { hit = x; break; }
      if (hit == null) continue;
      const [sx, sy] = S(hit, D, zz), g = fade(c, a), dir = side ? -1 : 1, len = R(30 * Math.min(2, cam.z));
      for (let i = 0; i < len; i += 3) g.rect(R(sx + dir * (2 + i)), R(sy), 2, 1, "#A8BEFF");
      const lbl = k + " KM", o = { scale: cam.z > 1.6 ? 2 : 1 };
      g.text(MAIN, lbl, side ? R(sx - 4 - c.measure(MAIN, lbl, o)) : R(sx + 4), R(sy - 3 - 7 * o.scale), "#C8D4FF", o);
    } }
  const pts = cable(c, cam, t, S);
  shipping(c, cam, t, S);
  newYork(c, cam, t);
  london(c, cam, t);
  trench(c, cam, t, TRENCH_L, "L"); trench(c, cam, t, TRENCH_N, "N");
  // the message
  const m = message(t);
  if (m) {
    if (m.kind === "cable") { const pa = 1 - win(t, EV.sharks - 0.2, EV.five - 0.5, 0.3, 0.3); if (pa > 0.02) drawPulse(c, cam, pts, m.x, { bright: (1 - m.dim) * pa, size: m.dim ? 1 - 0.35 * m.dim : 1, trail: t > EV.five ? 22 : 7 }); }
    else if (m.kind === "envelope") { const [sx, sy] = toScreen(cam, m.w); envelope(c, sx, sy, Math.min(2.2, cam.z * 0.95)); glowY.add(sx, sy, 16, 0.5); }
    else if (m.kind === "station") { /* inside the building: the station window glows */ }
    else { const [sx, sy] = toScreen(cam, m.w); glowY.add(sx, sy, 16 * Math.pow(cam.z, 0.7), 1); c.disc(R(sx), R(sy), Math.max(2, R(2.4 * Math.pow(cam.z, 0.7))), IV); }
  }
  // the light trail left in the trenches
  for (const [kind, path, a0, a1] of [["L", TRENCH_L, EV.racing, EV.coast + 0.1], ["N", TRENCH_N, EV.ashore + 0.45, EV.buzzes - 0.1]]) {
    const k = smooth(t, a0, a1), fadeOut = 1 - smooth(t, a1 + 0.3, a1 + 1.4); if (k <= 0 || fadeOut <= 0) continue;
    for (let u = Math.max(0, k - 0.6); u <= k; u += 0.004) { const [sx, sy] = toScreen(cam, P3(...along(path, u))), f = 1 - (k - u) / 0.6; c.rect(R(sx), R(sy), Math.max(1, R(cam.z * 0.8)), Math.max(1, R(cam.z * 0.6)), mix(Y, IV, f)); if (Math.floor(u * 250) % 6 === 0) glowY.add(sx, sy, 6 * cam.z, 0.35 * f * fadeOut); }
  }
  // the replay streak across the whole ocean (stopwatch beat)
  const rp = win(t, EV.replay[0], EV.replay[1] + 0.2, 0.05, 0.4);
  if (rp > 0) { const x = lerp(125.5, 14.5, smooth(t, EV.replay[0], EV.replay[1])); drawPulse(fade(c, rp), cam, pts, x, { trail: 30, bright: rp }); }
  glowB.apply(c, "#9DB5FF", 3);
  glowY.apply(c, "#F4CA50", 4);
}
export function envelope(c, x, y, s) {
  const w = Math.max(5, R(13 * s)), h = Math.max(4, R(9 * s)), x0 = R(x - w / 2), y0 = R(y - h / 2);
  c.rect(x0 - 1, y0 - 1, w + 2, h + 2, O); c.rect(x0, y0, w, h, Y); c.rect(x0, y0, w, 1, IV);
  c.line(x0, y0, R(x0 + w / 2), R(y0 + h * 0.6), "#B88A2A"); c.line(x0 + w - 1, y0, R(x0 + w / 2), R(y0 + h * 0.6), "#B88A2A");
}
export { glowY, glowB };
