// «Why your cat sleeps all day and goes crazy at 3 a.m.» — shared conventions for every module of this film.
// Side view of ONE apartment (bedroom | living room | kitchen corner). World units; the floor plane, where feet and paws
// touch, is wy = 0; up is negative. At camera zoom z = 1 one world unit is one grid pixel (grid 540×960, ×2 → 1080×1920).
import { bayer } from "../../../../renderer/pixel/raster.mjs";

export const GW = 540, GH = 960, FPS = 30;
export const FLOOR = 0, CEIL = -430;

/** Where things stand in the apartment (world x ranges / y heights). Every module uses these numbers, never its own. */
export const LAYOUT = {
  room: { x0: -780, x1: 760 },
  // bedroom (left)
  nightstand: { x0: -780, x1: -728, top: -96, lampX: -754 },
  bed: { x0: -720, x1: -420, mattressTop: -80, headTop: -178, footTop: -112, pillow: [-706, -636], blanketTop: -96 },
  door: { x0: -332, x1: -308, top: -300 },               // open door frame between bedroom and living room
  // living room (middle)
  sofa: { x0: -250, x1: -50, seatTop: -62, backTop: -136, armTop: -96 },
  clock: { x: -150, y: -330, r: 26 },                    // analog wall clock above the sofa
  window: { x0: 10, x1: 200, top: -362, sill: -128 },
  curtain: { x0: 200, x1: 240, top: -384, bottom: -8 },   // the cat climbs it during the zoomies
  floorLamp: { x: 282, shadeY: -262 },
  rug: { x0: -270, x1: 236 },
  // kitchen corner (right)
  bowl: { x: 372, r: 17 },                                // cat bowl on a mat on the floor
  counter: { x0: 440, x1: 640, top: -126 },
  fridge: { x0: 652, x1: 752, top: -372 },
};

/** Layer transform for depth p (1 = the floor plane where actors stand; < 1 further back; > 1 nearer, foreground). */
export function layer(cam, p) {
  const z = 1 + (cam.z - 1) * p, cx = cam.cx * p, cy = -24 + (cam.cy + 24) * p;
  return { z, X: (wx) => 270 + (wx - cx) * z, Y: (wy) => 520 + (wy - cy) * z, wx: (sx) => cx + (sx - 270) / z, wy: (sy) => cy + (sy - 520) / z };
}
/** The actors' plane: screen = (270 + (wx − cam.cx)·z, 520 + (wy − cam.cy)·z). */
export const ground = (cam) => layer(cam, 1);

// ---------------------------------------------------------------- timing helpers (pure functions of t; no Math.random)
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
