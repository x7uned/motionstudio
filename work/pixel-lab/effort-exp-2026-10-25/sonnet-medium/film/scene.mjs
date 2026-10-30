// «Pumpkin face» — the picture. Pure functions of t. 540×960 grid (×2 → 1080×1920).
import { hex, bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { GW, GH, EV, B } from "./timeline.mjs";

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const prog = (t, [a, b]) => ease((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const R = (c) => hex(c);
const mixa = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const ramp = (cols, v, x, y) => { const n = cols.length - 1, s = clamp01(v) * n, lo = Math.floor(s); return cols[Math.min(n, s - lo > bayer(x, y) ? lo + 1 : lo)]; };
const put = (c, x, y, rgb) => { if (x < 0 || y < 0 || x >= GW || y >= GH) return; const i = (y * GW + x) * 3; c.d[i] = rgb[0]; c.d[i + 1] = rgb[1]; c.d[i + 2] = rgb[2]; };
const putA = (c, x, y, rgb, a) => { if (a > bayer(x, y)) put(c, x, y, rgb); };

export const PAL = { sky0: R("#1D1430"), sky1: R("#3B2C5C"), moon: R("#B9C8F0"), orange: R("#F08A3C"), gold: R("#F4CA50"), outline: R("#12060C"), fog: R("#7B66B0") };
const SKIN = ["#2E1112", "#5A1E18", "#8E3416", "#C2561F", "#E6742A", "#F59B48"].map(R);
const HOLE = ["#14070C", "#4A1A12", "#A53A14", "#F08A3C", "#F4CA50", "#FFF3C0"].map(R);

// ------------------------------------------------------------------ static background (built once)
const BG = new Uint8ClampedArray(GW * GH * 3);
const STARS = Array.from({ length: 46 }, (_, i) => ({ x: 8 + rnd(i * 7 + 1) * 524, y: 10 + rnd(i * 7 + 2) * 420, ph: rnd(i * 7 + 3) * 6.28, sp: 0.8 + rnd(i * 7 + 4) * 1.6 }));
const MOON = { x: 112, y: 200, r: 44 };
function groundY(x) { return 528 + 6 * Math.sin(x * 0.021) + 3 * Math.sin(x * 0.07 + 1); }
function hillY(x) { return 478 + 22 * Math.sin(x * 0.011 + 0.6) + 9 * Math.sin(x * 0.033); }
(function buildBG() {
  const bgPut = (x, y, rgb) => { if (x < 0 || y < 0 || x >= GW || y >= GH) return; const i = (y * GW + x) * 3; BG[i] = rgb[0]; BG[i + 1] = rgb[1]; BG[i + 2] = rgb[2]; };
  const hillCol = R("#2A1F45"), gCol = R("#150C22"), gHi = R("#1E1230");
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const v = clamp01(y / 560);
    const s = v * 6, lo = Math.floor(s), step = (s - lo > bayer(x, y) ? lo + 1 : lo) / 6;
    let col = mixa(PAL.sky0, PAL.sky1, Math.min(1, step));
    // moon + halo
    const dm = Math.hypot(x - MOON.x, y - MOON.y);
    if (dm < MOON.r + 46) { const h = clamp01(1 - (dm - MOON.r) / 46); const hs = Math.floor(h * h * 4 + (h * h * 4 % 1 > bayer(x, y) ? 1 : 0)) / 4; if (dm >= MOON.r && hs > 0) col = mixa(col, PAL.moon, hs * 0.32); }
    if (dm < MOON.r) { const cr = Math.hypot(x - 100, y - 190) < 9 || Math.hypot(x - 128, y - 212) < 7 || Math.hypot(x - 96, y - 218) < 5; const sh = (x - MOON.x) * 0.35 + (y - MOON.y) * 0.2; col = cr ? R("#9FB0DC") : sh > 14 ? R("#C4D0F2") : R("#E6ECFF"); }
    // hills and ground
    if (y > hillY(x)) col = y < hillY(x) + 1 ? R("#3A2C5E") : hillCol;
    if (y > groundY(x)) col = y < groundY(x) + 1 ? gHi : gCol;
    bgPut(x, y, col);
  }
  // dead tree (right, background), gravestones, fence
  const wood = R("#0B0612"), L = (x0, y0, x1, y1, w = 2) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(lerp(x0, x1, i / n)), y = Math.round(lerp(y0, y1, i / n)); for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) bgPut(x + a, y + b, wood); } };
  L(486, 528, 490, 400, 6); L(490, 410, 462, 362, 3); L(462, 362, 448, 338, 2); L(462, 362, 470, 332, 2); L(490, 396, 516, 352, 3); L(516, 352, 528, 330, 2); L(516, 352, 526, 366, 2); L(488, 450, 466, 430, 2); L(466, 430, 452, 428, 2); L(490, 440, 512, 420, 2);
  for (const [gx, gw, gh] of [[44, 22, 34], [76, 18, 26], [416, 20, 30]]) { const gy = Math.round(groundY(gx)) + 2; for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const r = y < 8 ? Math.round(6 - Math.sqrt(Math.max(0, 36 - (y - 8) * (y - 8)) ) ) : 0; const xx = x - gw / 2; if (Math.abs(xx) <= gw / 2 - (y < 7 ? 7 - y : 0) * 0.5 + 0) bgPut(gx + x, gy - gh + y, R(x === 0 || x === gw - 1 ? "#241A3A" : "#1B1230")); void r; } }
})();

// ------------------------------------------------------------------ light state
export function state(t) {
  const flick = 0.045 * Math.sin(t * 9.1) + 0.03 * Math.sin(t * 15.7 + 1) + 0.02 * Math.sin(t * 23.3 + 2);
  const dim = sm(t, B.dim[0], B.dim[1]) - sm(t, B.relight[0], B.relight[1]);
  const g0 = sm(t, B.ignite[0], B.ignite[1] + 0.15);
  let L = 0.2 + 0.52 * g0 + 0.28 * sm(t, B.surge[0], B.surge[1]) - 0.6 * dim;
  L = clamp01(L + flick * (0.4 + L));
  const grin = sm(t, EV.sees + 0.05, EV.face + 0.12) * (1 - 0.98 * dim);
  const brainGlow = clamp01(0.58 * sm(t, B.glow[0], B.glow[1] + 0.8) + 0.42 * sm(t, B.surge[0], B.surge[1]));
  // little squash at the "decision"
  const sq = Math.sin(clamp01((t - (EV.face - 0.12)) / 0.55) * Math.PI) * Math.exp(-3 * clamp01((t - EV.face) / 0.8)) * 0.05;
  const rise = 1 - ease(t / 0.7);
  return { L, grin, brainGlow, dim, flick, sq, rise, eyeL: prog(t, B.eyeL), eyeR: prog(t, B.eyeR), mouth: prog(t, B.mouth) };
}

// ------------------------------------------------------------------ pumpkin
const HW = 130, HH = 100, CX = 270, CY = 440;
const LOBES = [-2, -1, 0, 1, 2].map((k) => ({ cx: k * 0.27 * HW, wl: (Math.abs(k) === 2 ? 0.47 : 0.5) * HW, hh: HH * [0.86, 0.95, 1, 0.95, 0.86][k + 2], oy: HH * [0.06, 0.02, 0, 0.02, 0.06][k + 2] }));
const eyeIn = (lx, ly, sg, p) => { if (p <= 0.01) return false; const cx = sg * 62, cy = -20, w = 42 * p, h = 38 * p, top = cy - h * 0.55, bot = cy + h * 0.45; if (ly < top || ly > bot) return false; return Math.abs(lx - cx - sg * 0.12 * (ly - top)) <= ((ly - top) / (bot - top)) * w / 2 + 0.3; };
const mouthIn = (lx, ly, p, g) => {
  if (p <= 0.005 || lx < -72 || lx > -72 + 144 * p) return false;
  const u = lx / 72, yc = 52 - 26 * g * u * u, th = 6 + g * 14 * Math.pow(Math.max(0, 1 - u * u), 0.7);
  if (Math.abs(ly - yc) > th / 2) return false;
  if (g > 0.45) { const tg = (g - 0.45) / 0.55;
    for (const tx of [-44, -8, 28]) if (Math.abs(lx - tx) < 4.5 && ly < yc - th / 2 + tg * th * 0.5) return false;
    for (const tx of [-26, 10, 46]) if (Math.abs(lx - tx) < 4.5 && ly > yc + th / 2 - tg * th * 0.45) return false; }
  return true;
};
const PL = { x0: 80, y0: 270, w: 380, h: 300 };
const PCOL = new Uint8ClampedArray(PL.w * PL.h * 3), PMASK = new Uint8Array(PL.w * PL.h);
function drawPumpkin(c, S, t) {
  PMASK.fill(0);
  const bob = 3 * Math.sin(t * 2.1) + 18 * S.rise, sx = 1 + S.sq * 1.1 + 0.006 * Math.sin(t * 2.1), sy = 1 - S.sq * 1.3 - 0.008 * Math.sin(t * 2.1), L = S.L;
  const feat = [[-62, -20, S.eyeL], [62, -20, S.eyeR], [0, 48, S.mouth]];
  for (let Y = PL.y0; Y < PL.y0 + PL.h; Y++) for (let X = PL.x0; X < PL.x0 + PL.w; X++) {
    const lx = (X - CX) / sx, ly = (Y - CY - bob) / sy; let b = -9, b2 = -9;
    for (const l of LOBES) { const u = (lx - l.cx) / l.wl, v = (ly - l.oy) / l.hh, d = 1 - u * u - v * v; if (d > b) { b2 = b; b = d; } else if (d > b2) b2 = d; }
    let col = null;
    // stem
    if (ly < -HH + 14 && ly > -HH - 30) { const j = -HH + 8 - ly, xc = 2 + j * 0.2 + 2 * Math.sin(t * 1.3) * j * 0.02, hw = 9 - j * 0.14; if (j > -8 && Math.abs(lx - xc) <= hw && b < 0.4) { const sh = (lx - xc) / hw; col = ramp([R("#2B2A12"), R("#4E4A1C"), R("#6D6A2A")], 0.55 - sh * 0.4 + j * 0.004, X, Y); } }
    if (b >= 0) {
      const eye = eyeIn(lx, ly, -1, S.eyeL) || eyeIn(lx, ly, 1, S.eyeR), mouth = mouthIn(lx, ly, S.mouth, S.grin);
      if (eye || mouth) {
        // inside the hole: candle light, brighter low and toward the middle of the hole
        const fy = eye ? clamp01((ly + 38) / 34) : 0.7, v = L * (0.55 + 0.4 * fy) + 0.06 * Math.sin(t * 13 + lx * 0.2);
        col = ramp(HOLE, v * 1.3, X, Y);
        // carved edge: the lit wall inside the hole
        const e = (!eyeIn(lx - 1.4 / sx, ly, -1, S.eyeL) && !eyeIn(lx - 1.4 / sx, ly, 1, S.eyeR) && !mouthIn(lx - 1.4 / sx, ly, S.mouth, S.grin)) || (!eyeIn(lx, ly - 1.4 / sy, -1, S.eyeL) && !eyeIn(lx, ly - 1.4 / sy, 1, S.eyeR) && !mouthIn(lx, ly - 1.4 / sy, S.mouth, S.grin));
        if (e) col = mixa(col, R("#2A0F10"), 0.55 * (1 - L));
      } else {
        let s = 0.3 + 0.52 * Math.sqrt(b); const lamb = 0.5 - 0.35 * (lx / HW) - 0.25 * (ly / HH); s *= 0.72 + 0.55 * lamb;
        if (b2 > 0 && b - b2 < 0.05) s *= 0.62;
        let dmin = 999; for (const [fx, fy, p] of feat) if (p > 0.02) dmin = Math.min(dmin, Math.hypot(lx - fx, (ly - fy) * 1.1));
        if (dmin < 999) s += L * 0.75 * Math.exp(-dmin / 40);
        col = ramp(SKIN, s * 1.05, X, Y);
        if (b < 0.14 && lx < 10 && ly < 30) col = mixa(col, PAL.moon, 0.28 * (1 - L * 0.6));
      }
    }
    if (col) { const i = (Y - PL.y0) * PL.w + (X - PL.x0); PMASK[i] = 1; PCOL[i * 3] = col[0]; PCOL[i * 3 + 1] = col[1]; PCOL[i * 3 + 2] = col[2]; }
  }
  for (let y = 0; y < PL.h; y++) for (let x = 0; x < PL.w; x++) {
    const i = y * PL.w + x; let o = PMASK[i];
    if (!o) { if ((x > 0 && PMASK[i - 1]) || (x < PL.w - 1 && PMASK[i + 1]) || (y > 0 && PMASK[i - PL.w]) || (y < PL.h - 1 && PMASK[i + PL.w])) put(c, PL.x0 + x, PL.y0 + y, PAL.outline); }
    else put(c, PL.x0 + x, PL.y0 + y, [PCOL[i * 3], PCOL[i * 3 + 1], PCOL[i * 3 + 2]]);
  }
}

// ------------------------------------------------------------------ brain (side view, front to the left)
const BR = { x0: 170, y0: 160, w: 200, h: 150 }, BCX = 270, BCY = 226;
const BCOL = new Uint8ClampedArray(BR.w * BR.h * 3), BMASK = new Uint8Array(BR.w * BR.h), BFACE = new Float32Array(BR.w * BR.h), BEDGE = new Uint8Array(BR.w * BR.h);
const FACE = { x: 286, y: 262, rx: 30, ry: 9 };
(function buildBrain() {
  const ell = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
  const inB = (x, y) => ell(x, y, BCX, BCY, 80, 50) <= 1 || ell(x, y, 258, 255, 52, 19) <= 1 || ell(x, y, 326, 258, 28, 17) <= 1 || (x >= 296 && x <= 308 + (y - 262) * 0.15 && y >= 262 && y <= 290);
  const cols = ["#4A2D5E", "#74497F", "#A266A0", "#C98BB4"].map(R);
  for (let y = 0; y < BR.h; y++) for (let x = 0; x < BR.w; x++) {
    const X = BR.x0 + x, Y = BR.y0 + y, i = y * BR.w + x; if (!inB(X, Y)) continue; BMASK[i] = 1;
    let sh = 0.55 - 0.3 * ((X - BCX) / 80) * 0.6 - 0.32 * ((Y - BCY) / 50) * 0.7; const wv = X * 0.17 + 2.4 * Math.sin(Y * 0.19 + X * 0.05) + 1.6 * Math.sin(X * 0.11 - Y * 0.13), fr = wv - Math.floor(wv);
    if (Math.abs(fr - 0.5) < 0.11) sh -= 0.34; else if (fr < 0.3) sh += 0.1;
    const sy = (X - 228) * 0.45 + 240 - Y; if (Math.abs(sy) < 1.4 && X > 226 && X < 302) sh = 0.0;     // sylvian fissure
    if (ell(X, Y, 326, 258, 28, 17) <= 1 && ((X * 0.9 + Y * 1.1) % 5) < 1.2) sh -= 0.25;               // cerebellum ridges
    const c = ramp(cols, sh * 1.1, X, Y); BCOL[i * 3] = c[0]; BCOL[i * 3 + 1] = c[1]; BCOL[i * 3 + 2] = c[2];
    const e = ell(X, Y, FACE.x, FACE.y, FACE.rx, FACE.ry); BFACE[i] = e <= 1 ? 1 - e : 0;
  }
})();
function drawBrain(c, S, t, a) {
  if (a <= 0.01) return;
  const dy = Math.round(2 * Math.sin(t * 1.5)), G = S.brainGlow, gcols = [R("#C2561F"), R("#F08A3C"), R("#F4CA50"), R("#FFF3C0")];
  // halo behind/around the face area (only outside the brain)
  const hx = FACE.x, hy = FACE.y + dy;
  for (let Y = hy - 50; Y <= hy + 50; Y++) for (let X = hx - 62; X <= hx + 62; X++) {
    const bi = (Y - dy - BR.y0) * BR.w + (X - BR.x0); const inside = X >= BR.x0 && X < BR.x0 + BR.w && Y - dy >= BR.y0 && Y - dy < BR.y0 + BR.h && BMASK[bi];
    if (inside) continue; const d = Math.hypot((X - hx) / 1.3, Y - hy), k = G * a * Math.pow(clamp01(1 - d / 48), 2) * 0.8; if (k > bayer(X, Y) * 0.9) put(c, X, Y, mixa(c.get(X, Y), PAL.orange, 0.55));
  }
  for (let y = 0; y < BR.h; y++) for (let x = 0; x < BR.w; x++) {
    const i = y * BR.w + x, X = BR.x0 + x, Y = BR.y0 + y + dy;
    if (!BMASK[i]) { if (a > 0.05 && ((x > 0 && BMASK[i - 1]) || (x < BR.w - 1 && BMASK[i + 1]) || (y > 0 && BMASK[i - BR.w]) || (y < BR.h - 1 && BMASK[i + BR.w]))) putA(c, X, Y, PAL.outline, a); continue; }
    let col = [BCOL[i * 3], BCOL[i * 3 + 1], BCOL[i * 3 + 2]];
    const f = BFACE[i]; if (f > 0 && G > 0.02) { const k = clamp01(G * (0.35 + 0.9 * Math.sqrt(f)) + 0.08 * Math.sin(t * 11)); col = k < 0.12 ? col : ramp([col, ...gcols], k * 0.96, X, Y); }
    putA(c, X, Y, col, a);
  }
}

// ------------------------------------------------------------------ signal packets pumpkin → brain
function drawSignals(c, t, S) {
  const P0 = [270, 392], P1 = [FACE.x, FACE.y + 6], Cc = [214, 322];
  const pt = (u) => [(1 - u) ** 2 * P0[0] + 2 * u * (1 - u) * Cc[0] + u * u * P1[0], (1 - u) ** 2 * P0[1] + 2 * u * (1 - u) * Cc[1] + u * u * P1[1]];
  const run = (w, speed, n, col, size) => {
    const env = Math.min(sm(t, w[0], w[0] + 0.1), 1 - sm(t, w[1] - 0.12, w[1])); if (env <= 0.01) return;
    for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
      const u = (((t - w[0]) * speed + i / n - k * 0.012) % 1 + 1) % 1, [x, y] = pt(u), a = env * Math.min(sm(u, 0, 0.1), 1 - sm(u, 0.88, 1)) * (1 - k * 0.24);
      const s = size - (k > 1 ? 1 : 0); for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) putA(c, Math.round(x) + dx, Math.round(y) + dy, k === 0 ? R("#FFF3C0") : PAL.gold, a);
    }
  };
  run(B.sig1, 1.9, 5, 0, 3); run(B.sig2, 1.3, 5, 0, 3);
}

// ------------------------------------------------------------------ fog, embers, bats, rings, card
function fog(c, t, y0, y1, speed, scale, strength, S, front) {
  for (let y = y0; y < y1; y++) { const e = Math.sin(Math.PI * (y - y0) / (y1 - y0));
    for (let x = 0; x < GW; x++) {
      const n = 0.5 + 0.25 * Math.sin(x * 0.02 * scale + t * speed + 1.7 * Math.sin(y * 0.045 + t * 0.2)) + 0.25 * Math.sin(x * 0.047 * scale - t * speed * 0.7 + y * 0.03);
      const k = clamp01((n - 0.42) * 2.2) * e * strength; if (k <= 0.02) continue;
      const q = Math.floor(k * 3 + (k * 3 % 1 > bayer(x, y) ? 1 : 0)) / 3; if (q <= 0) continue;
      const lit = S.L * 0.7 * clamp01(1 - Math.hypot(x - 270, (y - 450) * 1.4) / 240), fc = mixa(PAL.fog, PAL.orange, lit);
      put(c, x, y, mixa(c.get(x, y), fc, q * 0.55));
    } }
}
function embers(c, t, S) {
  const lit = clamp01((S.L - 0.4) / 0.4) * (1 - S.dim);
  if (lit <= 0.02) return;
  for (let i = 0; i < 16; i++) { const ph = (t * (0.16 + 0.1 * rnd(i)) + rnd(i + 50)) % 1, x = 270 + (rnd(i + 9) - 0.5) * 180 + 14 * Math.sin(t * 1.1 + i), y = 420 - ph * 190, a = Math.sin(Math.PI * ph) * lit; putA(c, Math.round(x), Math.round(y), i % 3 ? PAL.gold : PAL.orange, a); if (i % 4 === 0) putA(c, Math.round(x) + 1, Math.round(y), PAL.orange, a * 0.7); }
}
function bats(c, t) {
  for (let i = 0; i < 3; i++) {
    const per = 14 + i * 3, x = ((t * (46 + i * 14) + i * 190) % (GW + 120)) - 60, y = 70 + i * 17 + 8 * Math.sin(t * 1.3 + i * 2), fl = Math.sin(t * (13 + i)), wing = Math.round(5 + 3 * fl), X = Math.round(x), Y = Math.round(y);
    void per; const k = R("#0B0812");
    for (let d = 0; d <= wing; d++) { const yy = Y - Math.round(d * 0.5 * fl) + (d > wing * 0.6 ? 1 : 0); put(c, X - d, yy, k); put(c, X + d, yy, k); put(c, X - d, yy + 1, k); put(c, X + d, yy + 1, k); }
    for (const [dx, dy] of [[0, 0], [0, 1], [0, 2], [-1, 1], [1, 1], [-1, -1], [1, -1]]) put(c, X + dx, Y + dy, k);
  }
}
function rings(c, t) {
  const u = (t - B.ring[0]) / (B.ring[1] - B.ring[0]); if (u <= 0 || u >= 1) return;
  for (const [d, col] of [[0, PAL.gold], [0.18, PAL.orange]]) { const uu = clamp01(u - d); if (uu <= 0) continue; const r = 115 + 170 * ease(uu), a = (1 - uu) * 0.9;
    for (let y = 440 - Math.ceil(r) - 3; y <= 440 + r + 3; y++) for (let x = 270 - Math.ceil(r) - 3; x <= 270 + r + 3; x++) { const dd = Math.hypot((x - 270) / 1, (y - 440) * 0.82); if (Math.abs(dd - r) < 1.6) putA(c, x, y, col, a); } }
}
export const TEXT_UI = { O: "#0B0812", IV: "#FDFEED", Y: "#F08A3C" };
function card(c, t, S, MAIN, TINY) {
  const a = Math.min(sm(t, B.card[0], B.card[1]), 1 - sm(t, 8.1, 8.6)); if (a <= 0.01) return;
  const x0 = 165, y0 = 562, w = 210, h = 46;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const edge = x === x0 || x === x0 + w - 1 || y === y0 || y === y0 + h - 1; if (edge) putA(c, x, y, PAL.orange, a); else putA(c, x, y, R("#1D1430"), a * 0.92); }
  const cp = clamp01((t - B.count[0]) / (B.count[1] - B.count[0])), n = Math.round(165 * (cp < 1 ? cp * (2 - cp) * 0.35 + cp * 0.65 : 1)), txt = String(n).padStart(3, " ");
  const done = sm(t, B.count[1], B.count[1] + 0.2), flash = Math.sin(done * Math.PI) * 0.6;
  const col = (Y) => (done > 0.5 ? mixa(R(TEXT_UI.IV), PAL.gold, 0.6 + flash) : R(TEXT_UI.IV));
  const num = txt.trim() || "0", tw = c.measure(MAIN, num, { scale: 3 }), uw = c.measure(MAIN, " MS", { scale: 2 }), total = tw + uw, sx0 = Math.round(270 - total / 2);
  const draw = (str, X, Y, o, color) => c.text(MAIN, str, X, Y, color, { ...o, colorAt: (xx, yy) => (a < 1 && a <= bayer(xx, yy) ? null : color) });
  draw(num, sx0, y0 + 9, { scale: 3 }, mixa(R(TEXT_UI.IV), PAL.gold, done * (0.6 + flash)).map(Math.round));
  draw(" MS", sx0 + tw, y0 + 16, { scale: 2 }, PAL.orange);
  const bw = Math.round((w - 12) * cp); for (let x = 0; x < w - 12; x++) putA(c, x0 + 6 + x, y0 + h - 5, x < bw ? PAL.gold : R("#3B2C5C"), a);
}
function label(c, t, S, TINY) {
  const a = Math.min(sm(t, B.label[0], B.label[1]), 1 - sm(t, 8.3, 8.8)); if (a <= 0.01) return;
  const x = 352, y = 294, s = "FACE AREA", dy = Math.round(2 * Math.sin(t * 1.5));
  const g = (X, Y) => (a < 1 && a <= bayer(X, Y) ? null : PAL.gold);
  c.text(TINY, s, x, y, PAL.gold, { scale: 3, colorAt: g });
  // leader from the label to the glowing spot
  const x1 = x - 4, y1 = y + 7, x2 = FACE.x + 18, y2 = FACE.y + dy + 4, n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= n; i += 1) if (i % 3 !== 2) putA(c, Math.round(lerp(x1, x2, i / n)), Math.round(lerp(y1, y2, i / n)), PAL.gold, a);
}

// ------------------------------------------------------------------ the scene
export function drawScene(c, t, FONTS) {
  const S = state(t);
  c.d.set(BG);
  for (const s of STARS) { const a = 0.45 + 0.55 * Math.sin(t * s.sp + s.ph) ** 2, x = Math.round(s.x), y = Math.round(s.y); if (Math.hypot(x - MOON.x, y - MOON.y) < MOON.r + 30) continue; putA(c, x, y, R("#E6ECFF"), a); if (a > 0.9) { putA(c, x - 1, y, PAL.moon, 0.5); putA(c, x + 1, y, PAL.moon, 0.5); putA(c, x, y - 1, PAL.moon, 0.5); putA(c, x, y + 1, PAL.moon, 0.5); } }
  // pumpkin light on the ground
  const gl = S.L * 0.55;
  for (let y = 500; y < 640; y++) for (let x = 90; x < 450; x++) { const d = Math.hypot((x - 270) / 1.9, (y - 540) * 1.2), k = gl * clamp01(1 - d / 100) ** 1.5; if (k > 0.01) { const q = Math.floor(k * 4 + (k * 4 % 1 > bayer(x, y) ? 1 : 0)) / 4; if (q > 0) put(c, x, y, mixa(c.get(x, y), PAL.orange, q * 0.7)); } }
  fog(c, t, 456, 556, 0.34, 1.0, 0.7, S);
  drawPumpkin(c, S, t);
  drawBrain(c, S, t, sm(t, B.brainIn[0], B.brainIn[1]));
  drawSignals(c, t, S);
  fog(c, t, 508, 640, -0.28, 1.3, 0.8, S, true);
  rings(c, t); embers(c, t, S); bats(c, t);
  card(c, t, S, FONTS.MAIN, FONTS.TINY); label(c, t, S, FONTS.TINY);
  return S;
}
