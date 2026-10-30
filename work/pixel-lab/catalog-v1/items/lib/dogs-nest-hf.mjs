// catalog-v1 copy (2026-10-26) of work/pixel-lab/dogs/kit/nest-hf.mjs (shared engine of the nest/bed items); changes: only the
// raster import path (items/lib depth). Pure: the render memo keys on the arguments.
// tall grass / snow). Everything is drawn from WORLD units through G = ground(cam), so it stays crisp from z 0.7 to 4.
//
// Item frame: X along the lawn (right +), H height above the lawn (up +), S depth toward the viewer (+ = nearer).
// The park is seen from the side and slightly above: a point S units nearer appears S·KS units LOWER on screen
//   screen = (G.X(x) + X·z, G.Y(y) + (S·KS − H)·z)
// so the item's ground centre (X 0, S 0) is the lawn point (x, y) where the dog stands / lies (its depth S = 0).
//
// An item is rendered once into a private two-layer buffer — layer 0 = BACK (behind the dog: S ≤ split), layer 1 =
// FRONT (in front of the dog) — by a y-buffer heightfield marcher (volume shading in flat tone bands with Bayer
// transitions, dark 1-px silhouette outline, creases where a near part hides a far one) plus a z-tested 3-D stroke
// brush (grass blades, rug fibres). back()/front() then copy their layer through the caller's canvas (any gate/fade
// view). The render is memoised on its arguments, so calling back() and front() costs one render.
import { bayer, fade, Canvas } from "../../../../../renderer/pixel/raster.mjs";

export const KS = 0.25;                                     // view tilt (depth squash)
const LV = (() => { const v = [-0.5, 0.8, 0.35], n = Math.hypot(...v); return v.map((a) => a / n); })();
export const LIGHT = LV;                                    // light comes FROM the upper left, a little toward the viewer
/** Half-Lambert light (0..1) of a heightfield with slopes gX = ∂H/∂X, gS = ∂H/∂S. */
export const lit = (gX, gS) => 0.5 + 0.5 * (-gX * LV[0] + LV[1] - gS * LV[2]) / Math.sqrt(gX * gX + 1 + gS * gS);

// ---------------------------------------------------------------- small pure helpers
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const h2 = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** Smooth value noise (−1..1), deterministic. */
export function vnoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h2(xi + seed * 131, yi), b = h2(xi + 1 + seed * 131, yi), c = h2(xi + seed * 131, yi + 1), d = h2(xi + 1 + seed * 131, yi + 1);
  return (a + (b - a) * ux + (c - a + (a - b + d - c) * ux) * uy) * 2 - 1;
}
const BY = new Float32Array(16);
for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) BY[y * 4 + x] = bayer(x, y);
export const by = (x, y) => BY[(y & 3) * 4 + (x & 3)];
/** Ramp index from a continuous tone v: flat bands, dithered only in a narrow transition (dog/shade.mjs look). */
export const band = (v, n, X, Y) => { const fl = Math.floor(v), f = v - fl, q = f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > by(X, Y) ? fl + 1 : fl; return q < 0 ? 0 : q > n ? n : q; };
export const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const ramp = (a) => a.map(rgb);
export const mixc = (a, b, k) => [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];

// ---------------------------------------------------------------- «long ago, at dusk» grade (exported for the lead)
const DUSK = ramp(["#1A1030", "#3A2050", "#6A3A64", "#A0586A", "#D08A70", "#F0BC86", "#FFE4B4"]);
/** Warm sepia-violet dusk grade of one colour: k 0..1 (0 = untouched). Darks go violet, lights go amber.
 *  out (optional) receives the result; returns it. Use it to grade the dog/lawn the same way in the flashback. */
export function duskTint(c, k, out = [0, 0, 0]) {
  if (k <= 0) { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return out; }
  const l = Math.min(0.999, (0.3 * c[0] + 0.55 * c[1] + 0.15 * c[2]) / 255) * (DUSK.length - 1), i = Math.floor(l), f = l - i, A = DUSK[i], B = DUSK[i + 1];
  const m = Math.min(1, k) * 0.78;
  for (let j = 0; j < 3; j++) { const g = A[j] + (B[j] - A[j]) * f; out[j] = Math.round(c[j] + (g - c[j]) * m); }
  return out;
}

// ---------------------------------------------------------------- the two-layer buffer
export class Layers {
  constructor() { this.n = 0; }
  reset(x0, y0, w, h) {
    this.x0 = x0; this.y0 = y0; this.w = w; this.h = h; const n = Math.max(1, w * h);
    if (n > this.n) {
      this.n = n; this.col = [new Uint8Array(n * 3), new Uint8Array(n * 3)]; this.cov = [new Uint8Array(n), new Uint8Array(n)];
      this.hf = new Uint8Array(n); this.lab = new Uint8Array(n); this.dep = new Float32Array(n);
    }
    this.cov[0].fill(0, 0, n); this.cov[1].fill(0, 0, n); this.hf.fill(0, 0, n); this.dep.fill(-1e9, 0, n);
    return this;
  }
  /** Heightfield pixel (x, y screen ints): material id m (1..255), depth S, layer l. */
  surf(x, y, l, c, m, S) {
    const i = (y - this.y0) * this.w + (x - this.x0), C = this.col[l], j = i * 3;
    C[j] = c[0]; C[j + 1] = c[1]; C[j + 2] = c[2]; this.cov[l][i] = 1; this.hf[i] = m; this.lab[i] = l; this.dep[i] = S;
  }
  /** Stroke pixel: z-tested against everything drawn so far (S = depth toward the viewer, bigger = nearer). */
  plot(x, y, l, c, S) {
    x = Math.round(x); y = Math.round(y);
    const ix = x - this.x0, iy = y - this.y0; if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    const i = iy * this.w + ix; if (S < this.dep[i] - 0.9) return;
    this.dep[i] = S; const C = this.col[l], j = i * 3; C[j] = c[0]; C[j + 1] = c[1]; C[j + 2] = c[2]; this.cov[l][i] = 1;
    if (l === 0) this.cov[1][i] = 0;                         // a nearer back-layer pixel replaces a front one only if nearer (z-test passed)
  }
  /** Recolour an already drawn heightfield pixel in its own layer (outlines, creases). */
  recolor(ix, iy, c) { const i = iy * this.w + ix, l = this.lab[i], C = this.col[l], j = i * 3; C[j] = c[0]; C[j + 1] = c[1]; C[j + 2] = c[2]; }
}

/** BACK/FRONT rule: a point is FRONT when S > s + side·max(0, |X| − x0). Returned as numbers (hot loops inline it). */
export const splitRule = (s, side, x0) => ({ s, side, x0 });
const isFront = (sp, X, S) => S > sp.s + sp.side * Math.max(0, (X < 0 ? -X : X) - sp.x0);
export { isFront };

/** View of an item: ground-centre screen point and zoom. */
export const viewOf = (G, x, y) => ({ ox: G.X(x), oy: G.Y(y), z: G.z });
/** Screen point of an item point (X, H, S). */
export const proj = (V, X, H, S) => [V.ox + X * V.z, V.oy + (S * KS - H) * V.z];

/** Allocate the item's buffer rectangle from world bounds, clipped to the canvas. Returns null when off screen. */
export function frameFor(L, c, V, X0, X1, S0, S1, Hmax, pad = 3) {
  const z = V.z, x0 = Math.max(0, Math.floor(V.ox + X0 * z) - pad), x1 = Math.min(c.w, Math.ceil(V.ox + X1 * z) + pad);
  const y0 = Math.max(0, Math.floor(V.oy + (S0 * KS - Hmax) * z) - pad), y1 = Math.min(c.h, Math.ceil(V.oy + S1 * KS * z) + pad);
  if (x1 <= x0 || y1 <= y0) return null;
  return L.reset(x0, y0, x1 - x0, y1 - y0);
}

// ---------------------------------------------------------------- heightfield marcher
let HA = new Float32Array(0), HB = HA, HC = HA;
const OUT = [0, 0, 0];
/**
 * sp: { X0, X1, S0, S1 (item bounds), h(X, S) → height ≥ 0 or −1 (no surface), shade(X, S, h, gX, gS, px, py, out) →
 * material id 1..255 (writes the colour into out) or 0 to leave the pixel empty, split(X, S) → 1 front / 0 back,
 * creaseS (min. hidden depth, world units, for a crease line; default 3 rows), crease(m) → rgb or null }.
 */
export function heightfield(L, V, sp) {
  const z = V.z, dS = Math.min(1, 0.42 / (KS * z)), S1 = sp.S1, K = Math.ceil((S1 - sp.S0) / dS) + 2;
  const xa = Math.max(L.x0, Math.floor(V.ox + sp.X0 * z) - 1), xb = Math.min(L.x0 + L.w - 1, Math.ceil(V.ox + sp.X1 * z) + 1);
  if (xa > xb) return;
  if (HA.length < K) { HA = new Float32Array(K); HB = new Float32Array(K); HC = new Float32Array(K); }
  let hp = HA, hc = HB, hn = HC;
  const fill = (arr, x) => { const X = (x + 0.5 - V.ox) / z; for (let k = 0; k < K; k++) arr[k] = sp.h(X, S1 - k * dS); };
  const yT = L.y0, yB = L.y0 + L.h, creaseS = sp.creaseS ?? (3 / (KS * z) + 2), crease = sp.crease, s0 = sp.split.s, sk = sp.split.side, sx0 = sp.split.x0;
  fill(hp, xa - 1); fill(hc, xa);
  for (let x = xa; x <= xb; x++) {
    fill(hn, x + 1);
    const X = (x + 0.5 - V.ox) / z, ix = x - L.x0;
    let rTop = Infinity, pv = false, py = 0, ph = 0, pgx = 0, pgs = 0, pS = 0, hidden = false, hidS = 0;
    for (let k = 0; k < K; k++) {
      const h = hc[k]; if (!(h >= 0)) { pv = false; continue; }
      const S = S1 - k * dS, y = V.oy + (S * KS - h) * z;
      if (!pv && !sp.noWall) { pv = true; hidden = false; py = V.oy + S * KS * z; ph = 0; pS = S; pgx = NaN; if (rTop === Infinity) rTop = Math.ceil(py - 0.5); }   // first sample after a gap: a wall down to the lawn
      const a = k > 0 ? hc[k - 1] : -1, b = k < K - 1 ? hc[k + 1] : -1;
      const gs = a >= 0 && b >= 0 ? (a - b) / (2 * dS) : a >= 0 ? (a - h) / dS : b >= 0 ? (h - b) / dS : 0;
      const l = hp[k], r = hn[k];
      const gx = l >= 0 && r >= 0 ? (r - l) * z / 2 : r >= 0 ? (r - h) * z : l >= 0 ? (h - l) * z : 0;
      const rNew = Math.ceil(y - 0.5);
      if (rNew < rTop) {
        if (hidden && rTop !== Infinity && hidS - S > creaseS && crease && rTop >= yT && rTop < yB) {
          const i = (rTop - L.y0) * L.w + ix; if (L.hf[i]) { const cc = crease(L.hf[i]); if (cc) L.recolor(ix, rTop - L.y0, cc); }
        }
        const interp = pv && !hidden && py > y, rEnd = rTop === Infinity ? rNew + 1 : rTop;
        for (let rr = Math.max(rNew, yT); rr < Math.min(rEnd, yB); rr++) {
          let Si = S, hi = h, gxi = gx, gsi = gs;
          if (interp) { const u = clamp01((py - (rr + 0.5)) / (py - y)); Si = pS + (S - pS) * u; hi = ph + (h - ph) * u; if (pgx === pgx) { gxi = pgx + (gx - pgx) * u; gsi = pgs + (gs - pgs) * u; } }
          const m = sp.shade(X, Si, hi, gxi, gsi, x, rr, OUT);
          if (m) L.surf(x, rr, Si > s0 + sk * Math.max(0, (X < 0 ? -X : X) - sx0) ? 1 : 0, OUT, m, Si);
        }
        rTop = rNew; hidden = false;
      } else if (!hidden) { hidden = true; hidS = S; }
      pv = true; py = y; ph = h; pgx = gx; pgs = gs; pS = S;
    }
    const tmp = hp; hp = hc; hc = hn; hn = tmp;
  }
}

/** Dark 1-px silhouette outline on the heightfield coverage (inside the shape). colOf(m) → rgb or null. */
export function outline(L, colOf) {
  const W = L.w, H = L.h, hf = L.hf;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, m = hf[k]; if (!m) continue;
    if (i === 0 || j === 0 || i === W - 1 || j === H - 1) continue;    // clipped by the canvas edge: no outline there
    if (!hf[k - 1] || !hf[k + 1] || !hf[k - W] || !hf[k + W]) { const c = colOf(m); if (c) L.recolor(i, j, c); }
  }
}

// ---------------------------------------------------------------- 3-D stroke brush (blades, fibres, stems)
/**
 * Tapered stroke along the quadratic Bézier P0 → P1 → P2 (item points [X, H, S]). w0 → w1 = width in world units.
 * col(t, side) → rgb (t 0 root → 1 tip; side −1 lit (left) edge, 0 body, +1 shaded edge). split(X, S) picks the layer
 * per pixel; every pixel is z-tested with its own depth S.
 */
export function stroke(L, V, P0, P1, P2, w0, w1, col, split) {
  const z = V.z, s0 = split.s, sk = split.side, sx0 = split.x0;
  const ax = V.ox + P0[0] * z, ay = V.oy + (P0[2] * KS - P0[1]) * z, bx = V.ox + P1[0] * z, by_ = V.oy + (P1[2] * KS - P1[1]) * z, cx = V.ox + P2[0] * z, cy = V.oy + (P2[2] * KS - P2[1]) * z;
  const len = Math.hypot(bx - ax, by_ - ay) + Math.hypot(cx - bx, cy - by_);
  const n = Math.max(2, Math.ceil(len));
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = 1 - t, A = u * u, B = 2 * u * t, C = t * t;
    const x = A * ax + B * bx + C * cx, y = A * ay + B * by_ + C * cy;
    const X = A * P0[0] + B * P1[0] + C * P2[0], S = A * P0[2] + B * P1[2] + C * P2[2];
    const l = S > s0 + sk * Math.max(0, (X < 0 ? -X : X) - sx0) ? 1 : 0, w = (w0 + (w1 - w0) * t) * z;
    if (w < 1.6) { L.plot(x, y, l, col(t, 0), S); continue; }
    let tx = 2 * u * (bx - ax) + 2 * t * (cx - bx), ty = 2 * u * (by_ - ay) + 2 * t * (cy - by_);
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    let nx = -ty, ny = tx; if (nx > 0 || (nx === 0 && ny > 0)) { nx = -nx; ny = -ny; }   // normal toward the lit (left/upper) side
    const half = w / 2, steps = Math.max(1, Math.ceil(w)), cLit = col(t, -1), cBody = col(t, 0), cDark = col(t, 1);
    for (let s = 0; s <= steps; s++) {
      const o = -half + (w * s) / steps;
      L.plot(x - nx * o, y - ny * o, l, o < -half + 0.9 ? cLit : o > half - 0.9 ? cDark : cBody, S);
    }
  }
}

// ---------------------------------------------------------------- copy out + memo
const P = [0, 0, 0], Q = [0, 0, 0];
const plain = (c) => c.px === Canvas.prototype.px && !!c.d;
/** Copy layer l of the buffer into canvas c (any gate/fade view), dissolved by a, graded by dusk. */
export function emit(c, L, l, a = 1, dusk = 0) {
  if (!L || a <= 0) return;
  const col = L.col[l], cov = L.cov[l], W = L.w, H = L.h;
  if (a >= 1 && plain(c)) {                                  // fast path: straight into the canvas bytes
    const D = c.d, CW = c.w;
    for (let j = 0; j < H; j++) {
      const row = j * W, drow = (L.y0 + j) * CW + L.x0;
      for (let i = 0; i < W; i++) {
        const k = row + i; if (!cov[k]) continue;
        const o = (drow + i) * 3, s = k * 3;
        if (dusk > 0) { P[0] = col[s]; P[1] = col[s + 1]; P[2] = col[s + 2]; duskTint(P, dusk, Q); D[o] = Q[0]; D[o + 1] = Q[1]; D[o + 2] = Q[2]; }
        else { D[o] = col[s]; D[o + 1] = col[s + 1]; D[o + 2] = col[s + 2]; }
      }
    }
    return;
  }
  const g = a < 1 ? fade(c, a) : c;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i; if (!cov[k]) continue;
    P[0] = col[k * 3]; P[1] = col[k * 3 + 1]; P[2] = col[k * 3 + 2];
    g.px(L.x0 + i, L.y0 + j, dusk > 0 ? duskTint(P, dusk, Q) : P);
  }
}
/** Tiny LRU memo: the same arguments → the same buffer (back() and front() share one render). */
export function memo(cache, key, build) {
  for (let i = 0; i < cache.length; i++) if (cache[i].k === key) { const e = cache[i]; if (i) { cache.splice(i, 1); cache.unshift(e); } return e.v; }
  const spare = cache.length >= 4 ? cache.pop().L : new Layers();
  const v = build(spare); cache.unshift({ k: key, v, L: spare }); return v;
}
/** Memo key of a draw call (canvas size, view, position, options). */
export const keyOf = (c, G, x, y, extra) => `${c.w}x${c.h}|${G.z}|${G.X(0)}|${G.Y(0)}|${x}|${y}|${extra}`;

/** Soft dithered contact shadow ellipse on whatever is already drawn (lawn); skips pixels that layer 0 of L covers
 *  (they are painted right after). a dissolves it (Bayer gate). */
export function groundShadow(c, cx, cy, rx, ry, k = 0.42, col = [14, 42, 18], L = null, a = 1) {
  if (a <= 0) return;
  const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(c.w, Math.ceil(cx + rx)), y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(c.h, Math.ceil(cy + ry));
  const fast = plain(c), D = c.d, cv = L ? L.cov[0] : null;
  for (let Y = y0; Y < y1; Y++) for (let X = x0; X < x1; X++) {
    const d = ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2; if (d >= 1) continue;
    if (cv) { const ix = X - L.x0, iy = Y - L.y0; if (ix >= 0 && iy >= 0 && ix < L.w && iy < L.h && cv[iy * L.w + ix]) continue; }
    const b = by(X, Y); if (a < 1 && a <= b) continue;
    const v = k * Math.min(1, (1 - d) * 1.8), sc = v * 3, lo = Math.floor(sc), q = (sc - lo > b ? lo + 1 : lo) / 3; if (q <= 0) continue;
    if (fast) { const o = (Y * c.w + X) * 3; D[o] += (col[0] - D[o]) * q; D[o + 1] += (col[1] - D[o + 1]) * q; D[o + 2] += (col[2] - D[o + 2]) * q; }
    else { const e = c.get(X, Y); P[0] = Math.round(e[0] + (col[0] - e[0]) * q); P[1] = Math.round(e[1] + (col[1] - e[1]) * q); P[2] = Math.round(e[2] + (col[2] - e[2]) * q); c.px(X, Y, P); }
  }
}
