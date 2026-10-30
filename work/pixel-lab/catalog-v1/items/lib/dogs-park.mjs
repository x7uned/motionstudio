// catalog-v1 copy (2026-10-26) of work/pixel-lab/dogs/kit/park.mjs (back, front and the shadow tables); changes: import
// paths (dogs-park-*.mjs), the squirrel on the far bench and the PARK constants are not ported (scenery only).
import { scratchFor } from "./dogs-park-px.mjs";
import { LAYOUT } from "./dogs-park-layout.mjs";
import { frameAt } from "./dogs-park-geo.mjs";
import { floor, backLawn, backBlades, frontLawn } from "./dogs-park-lawn.mjs";
import { drawFar } from "./dogs-park-sky.mjs";
import { treeLine, midTree, MID_TREES, midShadows, oak, oakShadow } from "./dogs-park-flora.mjs";
import { bench, lamp, flowerBed, BEDS, FAR_LAMP } from "./dogs-park-props.mjs";

const FLOOR_SHADOWS = [
  { u: LAYOUT.bench.x + 14, q: 1.012, ru: 74, rq: 0.016, k: 1.3, q0: 0.99, q1: 1.03 },
  { u: LAYOUT.lamp.x + 10, q: 1.006, ru: 16, rq: 0.008, k: 1.2, q0: 0.99, q1: 1.015 },
];
const FAR_BENCH_SHADOW = { x: LAYOUT.farBench.x + 10, p: LAYOUT.farBench.p + 0.004, rx: 50, rp: 0.01, k: 1.4, p0: LAYOUT.farBench.p - 0.01, p1: LAYOUT.farBench.p + 0.02 };
const LAMP_SHADOWS = [{ x: FAR_LAMP.x + 6, p: FAR_LAMP.p + 0.002, rx: 10, rp: 0.005, k: 1.2, p0: FAR_LAMP.p - 0.01, p1: FAR_LAMP.p + 0.01 }];
const BACK_SHADOWS = [...oakShadow(), ...midShadows(), FAR_BENCH_SHADOW, ...LAMP_SHADOWS];

export function back(c, cam, t = 0, o = {}) {
  const P = o.period ?? 60, S = scratchFor(c.w, c.h);
  floor(S, cam, t, P, FLOOR_SHADOWS);
  lamp(S, frameAt(cam, 1, LAYOUT.lamp.x), t);
  bench(S, frameAt(cam, 1, LAYOUT.bench.x));
  const items = [
    { p: LAYOUT.oak.p, draw: () => oak(S, cam, t, P) },
    ...BEDS.map((b) => ({ p: b.p, draw: () => flowerBed(S, frameAt(cam, b.p, b.x), b.w, b.cols, b.seed, t, P) })),
    { p: LAYOUT.farBench.p, draw: () => bench(S, frameAt(cam, LAYOUT.farBench.p, LAYOUT.farBench.x)) },
    { p: FAR_LAMP.p, draw: () => lamp(S, frameAt(cam, FAR_LAMP.p, FAR_LAMP.x), t) },
    ...MID_TREES.map((T) => ({ p: T.p, draw: () => midTree(S, cam, T, t, P) })),
  ].sort((a, b) => b.p - a.p);
  let pPrev = 1;
  for (const it of items) { backBlades(S, cam, t, P, pPrev, it.p); it.draw(); pPrev = Math.min(pPrev, it.p); }
  backBlades(S, cam, t, P, pPrev, 0.5);
  treeLine(S, cam, t, P);
  drawFar(S, cam, t, P, () => backLawn(S, cam, BACK_SHADOWS));
  S.blitTo(c);
}
export function front(c, cam, t = 0, o = {}) { frontLawn(c, cam, t, o.period ?? 60); }
