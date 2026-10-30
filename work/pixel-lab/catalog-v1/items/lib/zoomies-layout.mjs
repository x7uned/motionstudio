// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-zoomies/film/layout.mjs; changes: only the living room is kept and
// re-laid out for the catalog (sofa + lamp left, window + curtain right, calm wall in the middle, clock high up); the film's
// camera is replaced by an adapter onto the catalog camera (engine/layout.mjs layer): film world (wx, wy) with the floor
// line wy = 0 → catalog world (270 + wx·SC, FLOOR_Y + wy·SC), the same depth p for parallax.
import { layer as catLayer } from "../../engine/layout.mjs";

export const GW = 540, GH = 960, FPS = 30;
export const FLOOR = 0, CEIL = -430;
export const SC = 1, FLOOR_Y = 560;     // catalog px per film unit at the wide shot; catalog y of the film's wy = 0

/** Where things stand (film units; screen x = 270 + wx at the wide shot). */
export const LAYOUT = {
  room: { x0: -780, x1: 760 },
  door: { x0: -1e9, x1: -1e9, top: -300 },              // no door / bedroom in the catalog room (lamp light reaches everywhere)
  floorLamp: { x: -244, shadeY: -262 },
  sofa: { x0: -218, x1: -46, seatTop: -62, backTop: -136, armTop: -96 },
  clock: { x: -132, y: -380, r: 26 },                    // analog wall clock above the sofa, under the cornice
  plant: { x: 300 },                                     // rubber plant beyond the curtain (seen on right-hand camera moves)
  sideTable: { x: -300 },                                // side table left of the lamp (seen on left-hand camera moves)
  window: { x0: 60, x1: 230, top: -362, sill: -128 },
  curtain: { x0: 230, x1: 266, top: -384, bottom: -8 },
  rug: { x0: -196, x1: 196 },
};

/** Film layer for depth p on the catalog camera. */
export function layer(cam, p) {
  const C = catLayer(cam, p);
  return { z: C.z * SC, X: (wx) => C.X(270 + wx * SC), Y: (wy) => C.Y(FLOOR_Y + wy * SC), wx: (sx) => (C.wx(sx) - 270) / SC, wy: (sy) => (C.wy(sy) - FLOOR_Y) / SC };
}
export const ground = (cam) => layer(cam, 1);

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
