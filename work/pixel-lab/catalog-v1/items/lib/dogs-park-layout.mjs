// catalog-v1 copy (2026-10-26) of work/pixel-lab/dogs/kit/layout.mjs (+ catalog LAYOUT re-lay-out in park.mjs); changes: import path.
// Dog series (Kagenami, 2026-10-23) — shared conventions for every module of the three dog pixel films
// («Is my dog blind?», «Why is a dog's nose wet?», «Why do dogs spin before lying down?»).
// Side view of ONE sunny park. World units; the lawn line where paws and feet touch is wy = 0; up is negative.
// At camera zoom z = 1 one world unit is one grid pixel (grid 540×960, upscaled ×2 nearest → 1080×1920).
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

export const GW = 540, GH = 960, FPS = 30;

/** Where things are in the park (world x / y). Every module uses these numbers, never its own. */
export const LAYOUT = {
  lawn: { x0: -900, x1: 1100 },          // the open lawn; the action happens between owner.x and ball.land + 120
  owner: { x: -230 },                      // the owner's feet when throwing (faces right)
  ball: { land: 60, r: 7 },                // where the thrown ball comes to rest in the grass; ball radius
  dogRun: { x0: -170, x1: 150 },           // the dog runs from beside the owner past the ball (overshoots to x1)
  oak: { x: 300, p: 0.82 },                // the big oak just behind the lawn (depth p < 1 = further back)
  bench: { x: -300 }, lamp: { x: -215 },   // park furniture on the left, on the lawn plane (p = 1)
  farBench: { x: 760, p: 0.62 },           // «across the park»: a bench with a squirrel, far right and further back
};

/** Typical cameras {cx, cy, z}. */
export const CAMS = {
  hook: { cx: -60, cy: -120, z: 1.0 },     // owner at screen x ≈ 100, ball at ≈ 390, lawn line at screen y ≈ 640
  dogFace: { z: 3.0 },                     // cx/cy on the dog's head
  ballClose: { cx: 60, cy: -14, z: 2.6 },
  across: { cx: 700, cy: -110, z: 0.75 },  // looking across the park toward the far bench
};

/** Layer transform for depth p (1 = the lawn plane where actors stand; < 1 further back; > 1 nearer, foreground). */
export function layer(cam, p) {
  const z = 1 + (cam.z - 1) * p, cx = cam.cx * p, cy = -24 + (cam.cy + 24) * p;
  return { z, p, X: (wx) => 270 + (wx - cx) * z, Y: (wy) => 520 + (wy - cy) * z, wx: (sx) => cx + (sx - 270) / z, wy: (sy) => cy + (sy - 520) / z };
}
/** The actors' plane: screen = (270 + (wx − cam.cx)·z, 520 + (wy − cam.cy)·z). */
export const ground = (cam) => layer(cam, 1);

// ---------------------------------------------------------------- timing helpers (pure functions; no Math.random)
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** A view of canvas c that only writes pixels whose Bayer threshold lies in [lo, hi). Two complementary gates
 *  (gate(c, 0, k) for the new state, gate(c, k, 1) for the old one) give a clean pixel crossfade between two drawings. */
export function gate(c, lo, hi) {
  if (lo <= 0 && hi >= 1) return c;
  const o = Object.create(c);
  o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) c.px(x, y, col); };
  return o;
}
