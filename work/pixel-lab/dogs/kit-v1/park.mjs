// Dog series (Kagenami, 2026-10-23) · THE SUNNY PARK — one persistent side-view world (platformer look with depth
// layers), sunny afternoon, shared by all three dog films. No red or orange anywhere in the park (yellow, white, purple and
// blue accents, wood browns) so the red ball is the only red thing; brightness steps sky > lawn > trees keep it readable
// in «dog vision». Everything is drawn per frame from world geometry, crisp at every zoom 0.7 … 4.
//
//   back(c, cam, t, o)   everything behind the actors: sky, sun, clouds, city, hills, far tree line, path, mid trees and
//                        bushes, flower beds, the far bench (+ squirrel), the oak, lamp, bench, the lawn (to every edge).
//   front(c, cam, t, o)  grass tufts on the lawn line (hide the ball's lower third, cover paws a little) + foreground
//                        tufts and flowers along the bottom.
//   drawSquirrel(c, G, x, y, t, o)   the squirrel (also drawn by back() on the far bench unless o.squirrel === false).
//   PARK                 constants (ramps, oak, squirrel seat, floor model, clear zone).
// o.period (s): the loop period — every motion (cloud drift, wind sway, squirrel cycles) is exactly periodic with it.
import { Canvas, hex } from "../../../../renderer/pixel/raster.mjs";
import { LAYOUT, layer, ground } from "./layout.mjs";
import { scratchFor } from "./park-px.mjs";
import { frameAt, floorOf, EYE, DIST, wind } from "./park-geo.mjs";
import { floor, backLawn, backBlades, frontLawn, LAWN, CLEAR, pathP, lawnTone } from "./park-lawn.mjs";
import { drawFar, SKY, SUN_AT } from "./park-sky.mjs";
import { treeLine, midTree, MID_TREES, midShadows, oak, oakShadow, OAK_INFO, OAK, BARK } from "./park-flora.mjs";
import { bench, lamp, flowerBed, BEDS, FAR_LAMP, WOOD, IRON } from "./park-props.mjs";
import { drawSquirrel } from "./park-squirrel.mjs";

export { drawSquirrel };
const toHex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

/** Where the squirrel sits on the far bench (layer coordinates of p = farBench.p) and its scale (px per squirrel unit
 *  at z = 1 is p, i.e. 0.62). squirrelSpot(cam) gives a ready G for drawSquirrel(c, G, x, y, t, o). */
const SEAT = { dx: 26, dy: -36 };
export function squirrelSpot(cam) {
  const p = LAYOUT.farBench.p, V = layer(cam, p), x = LAYOUT.farBench.x + SEAT.dx * p, y = SEAT.dy * p;
  return { G: { X: V.X, Y: V.Y, z: V.z * p }, x, y, p };
}

export const PARK = {
  lawn: LAWN.map(toHex),                    // dark → light, saturated healthy greens (the floor bands)
  sky: SKY.map(toHex),                      // top (deep) → horizon (pale)
  oakLeaves: OAK.map(toHex), bark: BARK.map(toHex), wood: WOOD.map(toHex), iron: IRON.map(toHex),
  sun: SUN_AT,                              // layer p 0.03; screen ≈ (138, 110) in the hook
  oak: OAK_INFO,                            // trunk at layer x 330 (p 0.82); crown box in REAL units from the trunk base
  oakCrownHook: { x0: 425, x1: 540, y0: 0, y1: 300 },   // screen box the crown covers in CAMS.hook (upper right)
  squirrelSeat: { x: LAYOUT.farBench.x + SEAT.dx * LAYOUT.farBench.p, y: SEAT.dy * LAYOUT.farBench.p, p: LAYOUT.farBench.p, scale: LAYOUT.farBench.p },
  ballRest: { x: LAYOUT.ball.land, y: -5, r: LAYOUT.ball.r },   // front() buries the lower third of a ball here
  clear: CLEAR,                             // near lawn kept free of flowers/stones for x0..x1 while floor depth q < CLEAR.q
  floor: { EYE, DIST },                     // near-lawn model: row = L + G.z·EYE·(q − 1), x = 270 + G.z·q·(u − cam.cx)
  midTrees: MID_TREES.map(({ kind, x, p }) => ({ kind, x, p })), beds: BEDS.map(({ x, p, w }) => ({ x, p, w })), farLamp: FAR_LAMP,
  floorOf, squirrelSpot, pathP, lawnTone, wind,
};

// ---------------------------------------------------------------- an offscreen layer (normal painter's order) that is
// flushed into the front-to-back scratch afterwards (used for the squirrel, drawn with the cute kit)
let OFF = null;
function off(w, h) {
  if (!OFF || OFF.w !== w || OFF.h !== h) {
    const o = Object.create(Canvas.prototype); o.w = w; o.h = h; o.d = new Uint8ClampedArray(w * h * 3); o.m = new Uint32Array(w * h); o.stamp = 0; o.list = [];
    o.px = function (x, y, c) { x = Math.floor(x); y = Math.floor(y); if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return; const v = hex(c), i = y * this.w + x; if (this.m[i] !== this.stamp) { this.m[i] = this.stamp; this.list.push(i); } const j = i * 3; this.d[j] = v[0]; this.d[j + 1] = v[1]; this.d[j + 2] = v[2]; };
    o.get = function (x, y) { x = Math.max(0, Math.min(this.w - 1, x | 0)); y = Math.max(0, Math.min(this.h - 1, y | 0)); const i = (y * this.w + x) * 3; return [this.d[i], this.d[i + 1], this.d[i + 2]]; };
    OFF = o;
  }
  OFF.stamp++; OFF.list.length = 0; return OFF;
}
function flush(O, S) { const col = [0, 0, 0]; for (const i of O.list) { const j = i * 3; col[0] = O.d[j]; col[1] = O.d[j + 1]; col[2] = O.d[j + 2]; S.put(i % O.w, (i / O.w) | 0, col); } }

// ---------------------------------------------------------------- back
const FLOOR_SHADOWS = [
  { u: LAYOUT.bench.x + 14, q: 1.012, ru: 74, rq: 0.016, k: 1.3, q0: 0.99, q1: 1.03 },
  { u: LAYOUT.lamp.x + 10, q: 1.006, ru: 16, rq: 0.008, k: 1.2, q0: 0.99, q1: 1.015 },
];
const FAR_BENCH_SHADOW = { x: LAYOUT.farBench.x + 10, p: LAYOUT.farBench.p + 0.004, rx: 50, rp: 0.01, k: 1.4, p0: LAYOUT.farBench.p - 0.01, p1: LAYOUT.farBench.p + 0.02 };
const LAMP_SHADOWS = [{ x: FAR_LAMP.x + 6, p: FAR_LAMP.p + 0.002, rx: 10, rp: 0.005, k: 1.2, p0: FAR_LAMP.p - 0.01, p1: FAR_LAMP.p + 0.01 }];
const BACK_SHADOWS = [...oakShadow(), ...midShadows(), FAR_BENCH_SHADOW, ...LAMP_SHADOWS];

export function back(c, cam, t = 0, o = {}) {
  const P = o.period ?? 60, S = scratchFor(c.w, c.h);
  // 1) the near lawn (nearest of all), then things standing on the lawn line
  floor(S, cam, t, P, FLOOR_SHADOWS);
  lamp(S, frameAt(cam, 1, LAYOUT.lamp.x), t);
  bench(S, frameAt(cam, 1, LAYOUT.bench.x));
  // 2) layered objects, nearest first (front-to-back)
  const items = [
    { p: LAYOUT.oak.p, draw: () => oak(S, cam, t, P) },
    ...BEDS.map((b) => ({ p: b.p, draw: () => flowerBed(S, frameAt(cam, b.p, b.x), b.w, b.cols, b.seed, t, P) })),
    { p: LAYOUT.farBench.p, draw: () => {
      if (o.squirrel !== false) { const sp = squirrelSpot(cam), O = off(S.w, S.h); drawSquirrel(O, sp.G, sp.x, sp.y, t, { period: P, ...(o.squirrelOpts ?? {}) }); flush(O, S); }
      bench(S, frameAt(cam, LAYOUT.farBench.p, LAYOUT.farBench.x));
    } },
    { p: FAR_LAMP.p, draw: () => lamp(S, frameAt(cam, FAR_LAMP.p, FAR_LAMP.x), t) },
    ...MID_TREES.map((T) => ({ p: T.p, draw: () => midTree(S, cam, T, t, P) })),
  ].sort((a, b) => b.p - a.p);
  let pPrev = 1;
  for (const it of items) { backBlades(S, cam, t, P, pPrev, it.p); it.draw(); pPrev = Math.min(pPrev, it.p); }
  backBlades(S, cam, t, P, pPrev, 0.5);
  treeLine(S, cam, t, P);
  // 3) far scenery; the back lawn strip is painted after every object standing on it, then clouds, sun, sky
  drawFar(S, cam, t, P, () => backLawn(S, cam, BACK_SHADOWS));
  S.blitTo(c);
}

// ---------------------------------------------------------------- front
export function front(c, cam, t = 0, o = {}) { frontLawn(c, cam, t, o.period ?? 60); }
export { ground };
