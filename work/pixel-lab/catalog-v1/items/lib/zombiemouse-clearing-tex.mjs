// catalog-v1 copy (2026-10-26) of work/pixel-lab/zombie-mouse/film/clearing-tex.mjs; changes: import paths only.
// «The last person alive» — Builder W: the clearing's layer textures (a tiny deferred renderer's G-textures).
// A texel stores material + albedo tone, moon exposure + horizontal normal, and an object id; clearing.mjs samples
// the textures at the current zoom and lights them in screen space (moon + fire, banded), with 1-px outlines.
import { rnd, clamp01, lerp } from "./zombiemouse-layout.mjs";
import { vnoise, fbm } from "./zombiemouse-W-util.mjs";
import { pineRaster, deadTree } from "./zombiemouse-W-trees.mjs";

export const MAT = { needle: 1, bark: 2, moss: 3, dirt: 4, ffloor: 5, stone: 6, logbark: 7, wood: 8, fern: 9, ash: 10, dead: 11, root: 12, char: 13, grass: 14 };
const R = Math.round;

export class Tex {
  /** layer depth p; layer-x range [u0, u1]; world-y range [v0, v1] (up negative); res texels per unit. */
  constructor(p, u0, u1, v0, v1, res, index) {
    this.p = p; this.u0 = u0; this.v0 = v0; this.v1 = v1; this.R = res; this.index = index;
    this.w = Math.ceil((u1 - u0) * res) + 1; this.h = Math.ceil((v1 - v0) * res) + 1;
    this.a = new Uint8Array(this.w * this.h); this.b = new Uint8Array(this.w * this.h); this.o = new Uint16Array(this.w * this.h);
    this.nobj = 0;
  }
  I(wx) { return (wx - this.u0) * this.R; }
  J(wy) { return (wy - this.v0) * this.R; }
  /** mat 1..15, tone 0..15, moon 0..15, nrm -8..7 */
  put(i, j, mat, tone, moon, nrm, oid) {
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return;
    const k = j * this.w + i; this.a[k] = (mat << 4) | Math.max(0, Math.min(15, tone | 0)); this.b[k] = (Math.max(0, Math.min(15, moon | 0)) << 4) | (Math.max(-8, Math.min(7, nrm | 0)) + 8); this.o[k] = oid;
  }
  has(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h && this.a[j * this.w + i] !== 0; }
  newId() { return this.index * 1000 + (++this.nobj); }
}

// ---------------------------------------------------------------- authoring helpers (world units of the layer)
/** A pine standing at layer x. e: edge width in texels (≈ texels per screen pixel in the wide shot). */
export function texPine(T, x, seed, H, W, bare, e, opt = {}) {
  const r = pineRaster(seed, H * T.R, W * T.R, bare, e), oid = T.newId();
  const i0 = R(T.I(x)) - r.ax, j0 = R(T.J(0)) - r.ay, half = r.w / 2, dk = opt.dark ?? 0;
  for (let y = 0; y < r.h; y++) for (let xx = 0; xx < r.w; xx++) {
    const v = r.c[y * r.w + xx]; if (!v) continue;
    const side = (xx - r.ax) / half, nr = R(side * 6);
    if (v === 4 || v === 5) T.put(i0 + xx, j0 + y, MAT.bark, (v === 5 ? 10 : 6) - dk, v === 5 ? 10 : 4, v === 5 ? -7 : R(((xx - r.ax) / Math.max(1, e * 2)) * 4), oid);
    else T.put(i0 + xx, j0 + y, MAT.needle, (v === 2 ? 10 : v === 3 ? 2 : v === 6 ? 4 : 6) - dk, v === 2 ? (opt.rim ?? 15) : v === 3 ? 1 : v === 6 ? 3 : 4, nr, oid);
  }
  return oid;
}
export function texDeadTree(T, x, seed, H, e) {
  const oid = T.newId();
  for (const [x0, y0, x1, y1, w] of deadTree(seed, H)) {
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * T.R));
    for (let k = 0; k <= n; k++) {
      const u = k / n, cx = T.I(x + lerp(x0, x1, u)), cy = T.J(lerp(y0, y1, u)), r = Math.max(e * 1.1, w * T.R * 0.6);
      for (let dx = -r; dx <= r; dx++) T.put(R(cx + dx), R(cy), MAT.dead, dx < -r + e ? 9 : 5, dx < -r + e ? 11 : 4, R((dx / r) * 6), oid);
    }
  }
}
/** A low bush / fern clump (rounded lobes), base at layer x. */
export function texBush(T, x, seed, H, W, mat = MAT.fern) {
  const oid = T.newId(), n = 4 + Math.floor(rnd(seed) * 4);
  for (let k = 0; k < n; k++) {
    const bx = x + (rnd(seed * 7 + k) - 0.5) * W, by = -H * (0.25 + 0.5 * rnd(seed * 11 + k)), br = H * (0.3 + 0.3 * rnd(seed * 13 + k));
    const ci = T.I(bx), cj = T.J(by), rr = br * T.R;
    for (let j = Math.floor(cj - rr); j <= Math.ceil(Math.min(cj + rr, T.J(0))); j++) for (let i = Math.floor(ci - rr * 1.3); i <= Math.ceil(ci + rr * 1.3); i++) {
      const dx = (i - ci) / (rr * 1.3), dy = (j - cj) / rr, d = dx * dx + dy * dy, wob = (vnoise(i * 0.25 / T.R + k, j * 0.25 / T.R) - 0.5) * 0.5;
      if (d > 1 + wob) continue;
      const lit = -dx * 0.5 - dy * 0.8; T.put(i, j, mat, 6 + R(lit * 5), 6 + R(lit * 7), R(dx * 6), oid);
    }
  }
}
/** A rounded stone, base at layer x (width w, height h). */
export function texStone(T, x, w, h, seed, tone = 7) {
  const oid = T.newId(), ci = T.I(x), cj = T.J(-h * 0.5), rx = (w / 2) * T.R, ry = (h / 2) * T.R;
  for (let j = Math.floor(cj - ry - 1); j <= Math.ceil(cj + ry); j++) for (let i = Math.floor(ci - rx - 1); i <= Math.ceil(ci + rx + 1); i++) {
    const dx = (i - ci) / rx, dy = (j - cj) / ry, wob = (vnoise(i / (T.R * 2) + seed, j / (T.R * 2)) - 0.5) * 0.35;
    if (dx * dx + dy * dy > 1 + wob || j > T.J(0) + 1) continue;
    const lit = -dx * 0.45 - dy * 0.9; T.put(i, j, MAT.stone, tone + R(lit * 4), 7 + R(lit * 7), R(dx * 7), oid);
  }
}

/** The log she sits on: a horizontal trunk resting on the ground, bark with grooves, moss on top, broken ends. */
export function texLog(T, x0, x1, top, e) {
  const oid = T.newId(), D = -top, j0 = T.J(top), j1 = T.J(0) + 1;
  for (let i = Math.floor(T.I(x0 - 3)); i <= Math.ceil(T.I(x1 + 3)); i++) {
    const wx = T.u0 + i / T.R;
    const endL = clamp01((wx - x0 + 2) / 4), endR = clamp01((x1 + 2 - wx) / 4), round = Math.min(endL, endR);
    const tTop = j0 + (1 - Math.sqrt(round)) * D * T.R * 0.45 + (vnoise(wx * 0.4, 3) - 0.5) * 1.2 * T.R * (round < 1 ? 1 : 0.2);
    for (let j = Math.floor(tTop); j <= j1; j++) {
      const v = (j - j0) / (j1 - j0), ny = v * 2 - 1;                        // -1 top … +1 bottom
      const groove = Math.sin(wx * 0.9 + v * 7 + vnoise(wx * 0.3, v * 4) * 4) > 0.55, moss = v < 0.22 && vnoise(wx * 0.15, 7) > 0.45;
      const atEnd = wx < x0 + 1.5 || wx > x1 - 1.5;
      if (atEnd) T.put(i, j, MAT.wood, 7 + R((1 - Math.abs(ny)) * 4) - ((R(Math.hypot(ny * 5, 0)) % 2) ? 2 : 0), 6, wx < x0 + 1.5 ? -7 : 7, oid);
      else if (moss) T.put(i, j, MAT.moss, 9 - R(v * 10), 13 - R(v * 12), 0, oid);
      else T.put(i, j, MAT.logbark, R(8 - ny * 3.5 - (groove ? 3 : 0)), R(9 - ny * 7), R(Math.max(-1, Math.min(1, (wx - (x0 + x1) / 2) / ((x1 - x0) / 2))) * 3), oid);
    }
  }
  // a broken branch stub sticking up
  const sx = lerp(x0, x1, 0.72), si = T.I(sx);
  for (let j = Math.floor(T.J(top - 9)); j < T.J(top + 1); j++) for (let di = -1.5 * T.R; di <= 1.5 * T.R; di++) T.put(R(si + di + (T.J(top) - j) * 0.35), j, MAT.logbark, di < -0.5 * T.R ? 10 : 6, di < 0 ? 11 : 5, R(di / T.R * 3), oid);
}

/** Firewood inside the ring: charred sticks leaning together, ember cracks glow (material char). */
export function texFirewood(T, cx, e) {
  const oid = T.newId();
  const sticks = [[-11, -1, 6, -12, 2.4], [11, -1, -5, -13, 2.4], [-9, -2, 9, -3, 2.6], [-3, -1, 2, -15, 2.0], [7, -1, -1, -10, 2.1]];
  for (const [ax, ay, bx, by, w] of sticks) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) * T.R);
    for (let k = 0; k <= n; k++) { const u = k / n, x = T.I(cx + lerp(ax, bx, u)), y = T.J(lerp(ay, by, u)), r = w * T.R * 0.5;
      for (let d = -r; d <= r; d++) T.put(R(x + d * 0.3), R(y + d), MAT.char, R(4 + (d < 0 ? 3 : 0) + (u > 0.6 ? -1 : 0)), d < 0 ? 6 : 2, 0, oid); }
  }
}

/** A fern: lobed fronds arching out of one base (leaflet bumps along each frond), upper sides catch the moon. */
export function texFern(T, x, seed, H, W, mat = MAT.fern) {
  const oid = T.newId(), n = 5 + Math.floor(rnd(seed) * 4), bi = T.I(x), bj = T.J(0), e = Math.max(1, T.R / 1.6);
  for (let f = 0; f < n; f++) {
    const side = f % 2 ? 1 : -1, spread = (0.3 + 0.9 * ((f + 0.5) / n)) * side * (0.8 + 0.4 * rnd(seed * 3 + f)), len = H * (0.7 + 0.4 * rnd(seed * 5 + f)) * T.R;
    const steps = Math.ceil(len * 1.4), lobes = 5 + Math.floor(rnd(seed * 7 + f) * 4), fw = W * 0.11 * T.R;
    for (let s2 = 0; s2 <= steps; s2++) {
      const u = s2 / steps, a = spread * (0.3 + 1.5 * u * u);
      const px = bi + Math.sin(a) * len * u * (W / H) * 0.8, py = bj - Math.cos(a) * len * u + u * u * len * 0.3 * Math.abs(spread);
      const hw = Math.max(e * 0.6, fw * Math.pow(1 - u, 0.7) * (0.45 + 0.55 * Math.abs(Math.sin(u * lobes * Math.PI))) * (u < 0.12 ? u / 0.12 : 1));
      for (let dj = -hw; dj <= hw; dj += 0.7) for (let di = -hw * 0.6; di <= hw * 0.6; di += 0.7) {
        if ((di * di) / (hw * hw * 0.36 + 0.01) + (dj * dj) / (hw * hw + 0.01) > 1) continue;
        const top = dj < -hw * 0.25, bot = dj > hw * 0.45;
        T.put(Math.round(px + di), Math.round(py + dj), mat, top ? 9 : bot ? 3 : 6, top ? 11 : bot ? 1 : 5, side * 4, oid);
      }
    }
  }
}

/**
 * A spruce built from needle clumps: whorls of drooping branches every ~16–24 units, each branch a row of overlapping
 * clumps (lit on their upper-left side by the moon, dark beneath), a straight trunk with bark grooves. Scales with the
 * texture resolution, so a near tree has real branch structure and a far one stays a clean silhouette.
 */
export function texSpruce(T, x, seed, H, W, bare, opt = {}) {
  const oid = T.newId(), Rr = T.R, bi = T.I(x), bj = T.J(0), dk = opt.dark ?? 0, rim = opt.rim ?? 15;
  const tw = Math.max(1.2, W * 0.045) * Rr, crownBot = -H * bare, crownTop = -H;
  // trunk
  for (let j = Math.floor(T.J(crownTop * 0.96)); j <= Math.ceil(bj); j++) for (let di = -tw; di <= tw; di++) {
    const u = di / tw, groove = Math.sin((di / Rr) * 2.2 + seed) > 0.7 ? -2 : 0;
    T.put(Math.round(bi + di), j, MAT.bark, 6 + groove - (u > 0.5 ? 2 : 0) + (u < -0.6 ? 3 : 0) - dk, u < -0.6 ? 9 : 4, Math.round(u * 6), oid);
  }
  // whorls from the bottom up, so every upper branch droops over the one below
  const whorls = []; for (let y = crownBot; y > crownTop + 6; y -= (16 + rnd(seed * 3 + whorls.length) * 8) * (0.6 + 0.4 * (y - crownTop) / (crownBot - crownTop + 1e-6))) whorls.push(y);
  const clump = (cx, cy, rx, ry, depthDark) => {
    const ci = T.I(x + cx), cj = T.J(cy), RX = rx * Rr, RY = ry * Rr;
    for (let j = Math.floor(cj - RY); j <= Math.ceil(cj + RY); j++) for (let i = Math.floor(ci - RX); i <= Math.ceil(ci + RX); i++) {
      const dx = (i - ci) / RX, dy = (j - cj) / RY, wob = (vnoise(i / (Rr * 2.2) + seed, j / (Rr * 2.2)) - 0.5) * 0.5;
      if (dx * dx + dy * dy > 1 + wob) continue;
      const lit = -0.45 * dx - 0.85 * dy + wob * 0.6;
      const code = lit > 0.62 ? 2 : lit < -0.35 ? 0 : 1;
      T.put(i, j, MAT.needle, (code === 2 ? 10 : code === 0 ? 2 : 6) - dk - depthDark, code === 2 ? rim : code === 0 ? 1 : 4, Math.round(Math.max(-1, Math.min(1, (i - bi) / (W * 0.5 * Rr))) * 6), oid);
    }
  };
  for (let w = 0; w < whorls.length; w++) {
    const y = whorls[w], k = Math.pow((y - crownTop) / (crownBot - crownTop + 1e-6), 0.85), hw = (W / 2) * (0.1 + 0.9 * k) * (0.82 + 0.3 * rnd(seed * 7 + w));
    for (const side of [-1, 1]) {
      const L = hw * (0.85 + 0.3 * rnd(seed * 11 + w * 2 + (side > 0 ? 1 : 0))), n = Math.max(2, Math.round(L / 4.2)), droop = 0.3 + 0.2 * rnd(seed * 17 + w);
      // the bare branch under the needles (visible between clumps)
      for (let s = 0; s <= 1; s += 1 / Math.max(4, L * Rr)) { const bx = T.I(x + side * s * L), byy = T.J(y + s * s * L * droop + 1); for (let d = 0; d < Math.max(1, Rr * 0.9 * (1 - s)); d++) T.put(Math.round(bx), Math.round(byy + d), MAT.bark, 3 - dk, 2, side * 3, oid); }
      for (let c = n; c >= 0; c--) {
        const s = c / n, cx = side * s * L + (rnd(seed * 19 + w * 5 + c) - 0.5) * 2, cy = y + s * s * L * droop + 1.5 + (rnd(seed * 23 + w + c) - 0.5) * 2;
        const rx = (4 + 5.5 * (1 - s)) * (0.8 + 0.4 * rnd(seed * 13 + w * 7 + c)) * (0.55 + 0.45 * Math.min(1, W / 110)), ry = rx * (0.7 + 0.15 * rnd(seed + c));
        clump(cx, cy, rx, ry, side > 0 && s > 0.5 ? 1 : 0);
      }
    }
  }
  // a crown tip
  for (let k = 0; k < 4; k++) clump(0, crownTop + k * 3.5, 1.2 + k * 0.7, 2 + k * 0.4, 0);
  return oid;
}
