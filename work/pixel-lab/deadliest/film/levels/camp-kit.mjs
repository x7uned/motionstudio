// Helpers for LV8 · night camp: masked offscreen layers (static scenery drawn once, copied row by row into the frame),
// a memoised sprite cache, the camera curve (same formula as render.mjs, so HERO_POSE can answer in screen space without
// importing the harness) and the rest-screen ↔ world mapping of the camp. Pure functions; caches only memoise.
import { Canvas, hex, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { CAM, REST } from "../timeline.mjs";

const R = Math.round;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

/** Offscreen canvas with a coverage mask; draw on `.g` with any raster / cute.mjs call, then `.blit`. */
export class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m;
    c.px = function (x, y, col) {
      x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return;
      const [r, g, b] = hex(col), i = y * w + x; c.d[i * 3] = r; c.d[i * 3 + 1] = g; c.d[i * 3 + 2] = b; m[i] = 1;
    };
    this.g = c;
  }
  /** Copy covered pixels with the layer's top-left at screen (sx, sy). o.a dissolves; o.x0/x1/y0/y1 clip. */
  blit(c, sx, sy, o = {}) {
    sx = R(sx); sy = R(sy);
    const W = this.w, H = this.h, s = this.c.d, m = this.m, d = c.d, CW = c.w, a = o.a ?? 1;
    if (a <= 0) return;
    const xa = Math.max(o.x0 ?? 0, sx, 0), xb = Math.min(o.x1 ?? CW, sx + W, CW), ya = Math.max(0, sy, o.y0 ?? 0), yb = Math.min(c.h, sy + H, o.y1 ?? c.h);
    for (let y = ya; y < yb; y++) {
      const row = (y - sy) * W;
      for (let x = xa; x < xb; x++) {
        const li = row + x - sx; if (!m[li]) continue;
        if (a < 1 && a <= bayer(x, y)) continue;
        const q = li * 3, p = (y * CW + x) * 3; d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2];
      }
    }
  }
}

/** World-anchored static layer: world rect (wx0, wy0, w, h); paint(g, X, Y) draws with X(wx)/Y(wy) → layer pixels. */
export function worldLayer(wx0, wy0, w, h, paint) {
  const L = new Layer(w, h); paint(L.g, (wx) => wx - wx0, (wy) => wy - wy0, L);
  return { L, wx0, wy0, w, h, blit(c, V, o) { if (V.X(wx0) >= c.w || V.X(wx0 + w) <= 0) return; L.blit(c, V.X(wx0), V.Y(wy0), o); } };
}

/** Memoised sprite: key → { blit(c, x, y, o) } with (ox, oy) the anchor inside the sprite. Small LRU. */
export function spriteCache(max = 64) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new Layer(w, h); paint(L.g, ox, oy);
    s = { L, blit(c, x, y, o) { L.blit(c, R(x) - ox, R(y) - oy, o); } };
    map.set(key, s); if (map.size > max) map.delete(map.keys().next().value);
    return s;
  };
}

// ---------------------------------------------------------------- camera (identical to render.mjs camera())
export function camAt(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: R(a.cx + (b.cx - a.cx) * k), cy: R(a.cy + (b.cy - a.cy) * k) };
}

// ---------------------------------------------------------------- rest-screen coordinates of the camp
// The whole level is laid out in the screen coordinates it has once the camera rests on REST.camp (x 0..540, y 0..960);
// W2(sx, sy) turns them into world coordinates, so everything moves with the world during the arrival pan.
export const OX = REST.camp.cx - 270, OY = REST.camp.cy - 480;
export const WX = (sx) => sx + OX, WY = (sy) => sy + OY;
/** Rest-screen point → current screen point for view V. */
export const S = (V, sx, sy) => [V.X(sx + OX), V.Y(sy + OY)];
