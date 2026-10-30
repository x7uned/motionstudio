// catalog-v1 copy (2026-10-26) of work/pixel-lab/dogs/kit/park-sky.mjs; changes: import paths only.
// Dog series park (2026-10-23) · far scenery: afternoon sky gradient, a small warm sun, drifting pixel clouds (two depths,
// exactly periodic with the loop), a soft hazy city skyline (p 0.12) and two rows of hills (p 0.2 / 0.3) with tiny trees.
// All painted front-to-back into the scratch (park-px.mjs), crisp at every zoom.
import { layer } from "./dogs-park-layout.mjs";
import { ramp, rgb, mixc, band, dith, by, BY, h1, h2, ball, rect } from "./dogs-park-px.mjs";
import { frameAt, cyc } from "./dogs-park-geo.mjs";

export const SKY = ramp(["#3C86D8", "#468FDD", "#5099E2", "#5CA3E7", "#69AEEB", "#77B8EE", "#86C2F0", "#96CBF2", "#A7D5F4", "#B9DEF5", "#CAE6F6"]);
const CLOUD = ramp(["#A6C8EA", "#C0DAF2", "#D9EAF8", "#EFF6FC", "#FFFFFF"]);
const CLOUD_EDGE = rgb("#94BAE2");
const CITY = ramp(["#86ACD2", "#94B7D9", "#A2C2E0", "#B2CDE6", "#C2D8EC"]);
const HILL_FAR = ramp(["#7FB4A8", "#8BBEAE", "#98C7B5", "#A7D1BD", "#B8DAC6"]);
const HILL_NEAR = ramp(["#5E9E7E", "#6AAA86", "#78B68E", "#88C298", "#9ACDA4", "#AED8B0"]);
const HILL_TREE = ramp(["#3E7E62", "#4A8C6A", "#589A72", "#6AA87C", "#7EB688"]);
const WARM = rgb("#FFF0C4");
const SUN = ramp(["#FFC94A", "#FFD866", "#FFE48A", "#FFEFB4", "#FFF8DC"]);

/** Sun position: layer p 0.03 (almost fixed on screen), upper left in the hook. */
export const SUN_AT = { x: -132, y: -437, p: 0.03, r: 14 };

// ---------------------------------------------------------------- clouds (pattern of width W drifting W per period)
const CLOUD_LAYERS = [
  { p: 0.07, n: 6, y0: -505, y1: -250, w0: 56, w1: 128, seed: 11, per: 170 },
  { p: 0.04, n: 7, y0: -205, y1: -125, w0: 26, w1: 58, seed: 29, per: 140 },
];
const CLOUD_CACHE = new Map();
function cloudPattern(L, W) {
  const key = L.seed * 100000 + W; let pat = CLOUD_CACHE.get(key); if (pat) return pat;
  const n = Math.max(3, Math.round(W / L.per)); pat = [];
  for (let i = 0; i < n; i++) {
    const s = L.seed * 1000 + i * 17, w = L.w0 + h1(s + 1) * (L.w1 - L.w0), x = ((i + 0.15 + h1(s + 2) * 0.7) / n) * W, y = L.y0 + h1(s + 3) * (L.y1 - L.y0);
    const puffs = [], k = 3 + Math.floor(h1(s + 4) * 3);
    // a big central puff, smaller ones toward the ends; bottoms sit on the flat base (y)
    for (let j = 0; j < k; j++) {
      const u = k === 1 ? 0 : j / (k - 1) - 0.5, r = w * (0.2 + 0.16 * (1 - Math.abs(u) * 1.6) + h1(s + 10 + j) * 0.06);
      puffs.push([u * w * 0.78 + (h1(s + 20 + j) - 0.5) * w * 0.08, -r * (0.55 + h1(s + 30 + j) * 0.3), r]);
    }
    puffs.push([w * 0.05, -w * 0.33, w * 0.24]);
    pat.push({ x, y, w, puffs, seed: s });
  }
  CLOUD_CACHE.set(key, pat); return pat;
}
/** Cloud drift settings for loop period P: whole pattern widths per period (static clouds for very short loops). */
export function cloudDrift(P, p) { const W = Math.max(820, Math.round(P * 13)), k = W / P > 26 ? 0 : 1; return { W, off: (t) => (k ? ((t / P) * W) % W : 0) }; }

const R_sqrt = Math.sqrt;
function drawCloud(S, V, cx, cy, cl) {
  const z = V.z, X0 = V.X(cx), Y0 = V.Y(cy), ox = Math.round(X0), oy = Math.round(Y0);
  let xa = Infinity, xb = -Infinity, ya = Infinity;
  const P = cl.puffs.map(([dx, dy, r]) => { const X = X0 + dx * z, Y = Y0 + dy * z, R = r * z; xa = Math.min(xa, X - R); xb = Math.max(xb, X + R); ya = Math.min(ya, Y - R); return [X, Y, R]; });
  const yb = Y0, H = Math.max(1, yb - ya);
  xa = Math.max(0, Math.floor(xa)); xb = Math.min(S.w - 1, Math.ceil(xb)); const y0 = Math.max(0, Math.floor(ya)), y1 = Math.min(S.h - 1, Math.round(yb) - 1);
  if (xa > xb || y0 > y1) return;
  for (let Y = y0; Y <= y1; Y++) for (let X = xa; X <= xb; X++) {
    if (S.o[Y * S.w + X]) continue;
    let best = -1e9, bi = -1;
    for (let i = 0; i < P.length; i++) { const p_ = P[i], ex = X + 0.5 - p_[0], ey = Y + 0.5 - p_[1]; if (ex * ex + ey * ey > p_[2] * p_[2] && best >= 0) continue; const d = R_sqrt(ex * ex + ey * ey), v = p_[2] - d; if (v > best) { best = v; bi = i; } }
    if (best < 0) continue;
    const [px, py, R] = P[bi], nx = (X + 0.5 - px) / R, ny = (Y + 0.5 - py) / R, l = -(nx * 0.45 + ny * 0.89), vy = (Y - ya) / H;
    let c;
    if (Y >= Math.round(yb) - 1 || (best < 1 && ny > 0.1)) c = CLOUD_EDGE;
    else { const v = 2.9 + l * 1.5 - Math.max(0, vy - 0.55) * 4.2; c = CLOUD[band(v, 4, X - ox, Y - oy)]; }
    S.put(X, Y, c);
  }
}
export function drawClouds(S, cam, t, P) {
  for (const L of CLOUD_LAYERS) {
    const V = layer(cam, L.p), { W, off } = cloudDrift(P, L.p), o = off(t), xl = V.wx(-160), xr = V.wx(S.w + 160);
    for (const cl of cloudPattern(L, W)) {
      const base = cl.x + o;
      for (let k = Math.floor((xl - base) / W) - 1; k <= Math.ceil((xr - base) / W) + 1; k++) {
        const x = base + k * W; if (x + cl.w < xl || x - cl.w > xr) continue;
        drawCloud(S, V, x, cl.y, cl);
      }
    }
  }
}

// ---------------------------------------------------------------- city skyline (p 0.12): pale towers in the haze
const CITY_B = [];
for (let i = -60; i <= 60; i++) {
  const s = 5000 + i * 7, gapZone = Math.sin(i * 0.37 + 1.1) + Math.sin(i * 0.13);
  if (gapZone < -0.9 || h1(s) < 0.12) continue;
  const tower = h1(s + 1) < 0.16, w = tower ? 9 + h1(s + 2) * 6 : 10 + h1(s + 2) * 16, h = tower ? 70 + h1(s + 3) * 50 : 22 + h1(s + 3) * 42 * (0.6 + 0.4 * Math.max(0, gapZone));
  CITY_B.push({ x: i * 13 + (h1(s + 4) - 0.5) * 8, w, h, roof: h1(s + 5), seed: s, tower });
}
CITY_B.sort((a, b) => a.h - b.h);  // lower buildings in front
function drawCity(S, cam) {
  const V = layer(cam, 0.12), z = V.z, base = V.Y(0) + 1;
  for (const b of CITY_B) {
    const x0 = V.X(b.x), x1 = V.X(b.x + b.w), top = V.Y(-b.h);
    if (x1 < 0 || x0 > S.w) continue;
    const ox = Math.round(x0), oy = Math.round(top), lit = Math.max(1, Math.round(z * 1.4));
    rect(S, x0, top, x1 - x0, base - top, (X, Y) => {
      const lx = X - ox, ly = Y - oy;
      if (lx < lit) return CITY[3];
      if (b.w * z > 9 && ly > 3 && lx > 1 && X < x1 - 2 && (ly % Math.max(3, Math.round(z * 4))) === 1 && (lx % 3) !== 0 && h2(lx, ly + b.seed) > 0.35) return CITY[ly > (base - top) * 0.7 ? 1 : 2];
      return CITY[ly < 2 ? 2 : 1];
    });
    if (b.tower) { const ax = Math.round(V.X(b.x + b.w * 0.5)); rect(S, ax, top - 8 * z, Math.max(1, Math.round(z)), 8 * z, CITY[1]); }
    else if (b.roof < 0.3) { const w = (x1 - x0) * 0.5; rect(S, x0 + w * 0.5, top - 3 * z, w, 3 * z, CITY[2]); }
  }
}

// ---------------------------------------------------------------- hills (per screen column)
export const hillFar = (x) => 34 + 15 * Math.sin(x * 0.0095 + 0.6) + 9 * Math.sin(x * 0.027 + 2.0) + 4 * Math.sin(x * 0.061);
export const hillNear = (x) => 22 + 13 * Math.sin(x * 0.0125 + 3.3) + 7 * Math.sin(x * 0.034 + 0.4) + 3 * Math.sin(x * 0.08 + 1);
function drawHills(S, cam) {
  // near row first (front-to-back), with tiny round trees along the crest
  {
    const F = (x) => frameAt(cam, 0.3, x), V = layer(cam, 0.3);
    for (let i = Math.floor(V.wx(-40) / 23); i <= Math.ceil(V.wx(S.w + 40) / 23); i++) {
      if (h1(i * 3 + 801) < 0.45) continue;
      const x = i * 23 + h1(i * 3 + 802) * 14, hy = hillNear(x) - 2 - h1(i * 3 + 803) * 6, r = 4 + h1(i * 3 + 804) * 4, f = F(x);
      const X = f.X0, Y = V.Y(-hy);
      rect(S, X - 0.5 * f.s, Y - r * V.z * 0.4, Math.max(1, f.s * 1.2), r * V.z * 0.9, HILL_TREE[0]);
      ball(S, X, Y - r * V.z * 0.9, r * V.z, HILL_TREE, { seed: i, amp: 0.1, bumps: 5, sparkle: 0, outline: HILL_TREE[0] });
    }
    column(S, V, hillNear, HILL_NEAR, 1);
  }
  column(S, layer(cam, 0.2), hillFar, HILL_FAR, 0);
}
function column(S, V, hf, R, near) {
  const base = Math.round(V.Y(0)), n = R.length - 1, oy = Math.round(V.Y(0)), ox = Math.round(V.X(0));
  for (let X = 0; X < S.w; X++) {
    const wx = V.wx(X + 0.5), h = hf(wx), top = V.Y(-h), yt = Math.max(0, Math.round(top)), H = Math.max(1, base - top);
    const slope = hf(wx + 2) - hf(wx - 2);                       // facing the sun (left) → lighter
    for (let Y = yt; Y <= Math.min(S.h - 1, base); Y++) {
      if (S.o[Y * S.w + X]) continue;
      const k = (Y - top) / H;
      let v = Y - yt < 1 ? n : (n - 0.6) - k * (n - 1.2) + (slope > 0 ? 0.5 : -0.4) * (1 - k);
      if (near) v += (h2(Math.floor(wx * 0.5), Y - oy) - 0.5) * 0.6;
      S.put(X, Y, R[band(v, n, X - ox, Y - oy)]);
    }
  }
}

// ---------------------------------------------------------------- final stage: sun disc, then sky into every free pixel
function drawSun(S, cam) {
  const V = layer(cam, SUN_AT.p), cx = V.X(SUN_AT.x), cy = V.Y(SUN_AT.y), r = SUN_AT.r * V.z;
  const xa = Math.max(0, Math.floor(cx - r - 2)), xb = Math.min(S.w - 1, Math.ceil(cx + r + 2)), ya = Math.max(0, Math.floor(cy - r - 2)), yb = Math.min(S.h - 1, Math.ceil(cy + r + 2));
  for (let Y = ya; Y <= yb; Y++) for (let X = xa; X <= xb; X++) {
    const dx = X + 0.5 - cx, dy = Y + 0.5 - cy, d = Math.hypot(dx, dy); if (d > r) continue;
    const e = d / r, l = -(dx * 0.5 + dy * 0.6) / r;
    const c = e > 0.9 ? SUN[0] : SUN[band(2.6 + l * 1.6 - e * 1.2, 4, X, Y)];
    S.put(X, Y, c);
  }
  return { cx, cy, r };
}
export function drawSkyFill(S, sun, horizon) {
  const n = SKY.length - 1, W = S.w, O = S.o, D = S.d, gr = sun.r * 4.2, core = sun.r + 2.2 * (sun.r / 14), gx0 = Math.max(0, Math.floor(sun.cx - gr)), gx1 = Math.min(W - 1, Math.ceil(sun.cx + gr));
  for (let Y = 0; Y < S.h; Y++) {
    const k = Math.min(1, Math.max(0, Y / Math.max(200, horizon))), base = 0.4 + Math.pow(k, 1.35) * (n - 0.4), dy = Y + 0.5 - sun.cy, near = Math.abs(dy) < gr;
    const fl = Math.floor(base), fr = base - fl, lo = SKY[Math.min(n, fl)], hi = SKY[Math.min(n, fl + 1)], b0 = (Y & 3) * 4, row = Y * W;
    for (let X = 0; X < W; X++) {
      const i = row + X; if (O[i]) continue;
      let c;
      if (near && X >= gx0 && X <= gx1) {
        let v = base; const dx = X + 0.5 - sun.cx, d = Math.sqrt(dx * dx + dy * dy);
        if (d < gr) { const g = 1 - d / gr; v += g * g * 5.5; }
        const f2 = Math.floor(v), q = v - f2 > BY[b0 + (X & 3)] ? f2 + 1 : f2; c = SKY[q > n ? n : q];
        if (d < core + 3.5 * (sun.r / 14) && (d < core + 1 || BY[b0 + (X & 3)] > (d - core - 1) / (2.5 * (sun.r / 14)))) c = WARM;
      } else c = fr > BY[b0 + (X & 3)] ? hi : lo;
      O[i] = 1; const j = i * 3; D[j] = c[0]; D[j + 1] = c[1]; D[j + 2] = c[2];
    }
  }
}

/** Far scenery in front-to-back order: hills, city, clouds, sun, then the sky in every pixel still free. */
export function drawFar(S, cam, t, P, backLawn) {
  drawHills(S, cam);
  drawCity(S, cam);
  backLawn();                         // the far end of the lawn (rows below the hills) is painted by the caller here
  drawClouds(S, cam, t, P);
  const sun = drawSun(S, cam);
  drawSkyFill(S, sun, layer(cam, 0.12).Y(0) + 10);
}
export { mixc, cyc };
