// catalog-v1 (2026-10-26, wave W / WS6) · shared helpers of the beach and farm backdrops: a daylight sky with drifting
// clouds (same look as items/backyard.mjs), a camera-scaled nearest-neighbour blit of cached masked layers, and the
// world-anchored Cache class of animals-weight/film/levels/ocean-sea.mjs (copy; film clock/light removed).
import { Canvas, hex } from "../../../../../renderer/pixel/raster.mjs";
import { band, clamp01, frac } from "../../engine/layout.mjs";

export const R = Math.round;
const SKY = ["#6A9EDC", "#80B0E6", "#98C2EE", "#B2D4F4", "#CCE4F6", "#E4F0F2"].map(hex);
const CLOUD = ["#F8FAFE", "#E4ECF8", "#C8D6EC"].map(hex);
const CLOUDS = [[70, 3.0, 0.12, 1.1], [150, 2.2, 0.48, 0.85], [230, 3.8, 0.79, 0.7]];
const BLOBS = [[0, 0, 20], [-22, 6, 14], [23, 5, 16], [7, -11, 14]];

/** Daylight sky for the stage rows y < yMax (stage world coords from the camera layer V = layer(cam, 1)); pale at the horizon hy. */
export function drawSky(c, V, t, yMax, hy = 560) {
  const GW = c.w, d = c.d, WX = new Float64Array(GW);
  for (let x = 0; x < GW; x++) WX[x] = V.wx(x + 0.5);
  const CL = CLOUDS.map(([cy, v, ph, s]) => [-150 + frac(ph + (t * v) / 900) * 900, cy, s]);
  for (let y = 0; y < c.h; y++) {
    const wy = V.wy(y + 0.5); if (wy > yMax) break;
    const sv = clamp01((wy + 60) / (hy + 60));
    for (let x = 0; x < GW; x++) {
      let col = null;
      for (const [ccx, ccy, s] of CL) {
        const dx = (WX[x] - ccx) / s, dy = (wy - ccy) / s; if (dx * dx + dy * dy > 1600) continue;
        for (const [bx, by, br] of BLOBS) { const ex = dx - bx, ey = dy - by; if (ex * ex + ey * ey <= br * br) { col = CLOUD[dy > 9 ? 2 : dy > 3 ? 1 : 0]; break; } }
        if (col) break;
      }
      if (!col) col = band(SKY, sv, x, y);
      const q = (y * GW + x) * 3; d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2];
    }
  }
}

/** Nearest-neighbour scaled copy of a masked layer {d, m, w, h, wx0, wy0} (world coords) into the frame; V maps screen→world. */
export function blitScaled(c, S, V) {
  const GW = c.w, dd = c.d, sd = S.d, sm_ = S.m, W = S.w, H = S.h;
  const xs = new Int32Array(GW); for (let x = 0; x < GW; x++) { const i = Math.floor(V.wx(x + 0.5) - S.wx0); xs[x] = i < 0 || i >= W ? -1 : i; }
  for (let y = 0; y < c.h; y++) {
    const j = Math.floor(V.wy(y + 0.5) - S.wy0); if (j < 0 || j >= H) continue;
    const row = j * W;
    for (let x = 0; x < GW; x++) { const i = xs[x]; if (i < 0) continue; const li = row + i; if (!sm_[li]) continue; const a = li * 3, b = (y * GW + x) * 3; dd[b] = sd[a]; dd[b + 1] = sd[a + 1]; dd[b + 2] = sd[a + 2]; }
  }
}

/** Offscreen world layer (film Cache): paint(g) draws in WORLD coordinates through g.px/get/has (+ every Canvas primitive). */
export class Cache {
  constructor(wx0, wy0, w, h, paint) {
    this.wx0 = wx0; this.wy0 = wy0; this.w = w; this.h = h; this.cv = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const cv = this.cv, m = this.m, base = Canvas.prototype.px;
    const g = Object.create(cv);
    g.px = (x, y, col) => { x = Math.floor(x) - wx0; y = Math.floor(y) - wy0; if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(cv, x, y, col); m[y * w + x] = 1; };
    g.get = (x, y) => cv.get(Math.floor(x) - wx0, Math.floor(y) - wy0);
    g.has = (x, y) => { x = Math.floor(x) - wx0; y = Math.floor(y) - wy0; return x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1; };
    this.g = g; paint(g, this);
  }
  get src() { return { d: this.cv.d, m: this.m, w: this.w, h: this.h, wx0: this.wx0, wy0: this.wy0 }; }
}
/** Smooth profile y(x) through [x, y] keys (cosine-eased between keys). */
export function profile(keys) {
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [a, ya] = keys[i], [b, yb] = keys[i + 1]; if (x <= b) { const k = (x - a) / (b - a), e = (1 - Math.cos(Math.PI * k)) / 2; return ya + (yb - ya) * e; } }
    return keys[keys.length - 1][1];
  };
}
