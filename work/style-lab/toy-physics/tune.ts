// Offline seeded search for launch params that make packets arrive 3,1,4,2 via different routers.
// Usage: node --import tsx work/style-lab/toy-physics/tune.ts [trials] [seed]
import {simulate, EXPECTED_ORDER, PARAMS, type SimParams} from "../../../renderer/style-lab/toy-physics/sim";

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function score(p: SimParams) {
  const r = simulate(p);
  let s = 0;
  if (r.order.join() !== EXPECTED_ORDER.join()) s -= 100;
  if (r.finalOrder.join() !== EXPECTED_ORDER.join()) s -= 100;
  if (!r.settled) s -= 50;
  s -= r.wallHits * 25;
  // Keep packets below the caption card (block centre y >= 470) and inside x 90..990.
  let minY = 1e9, xOut = 0;
  for (const fr of r.frames) for (const b of fr) { if (b.live) { minY = Math.min(minY, b.y); if (b.x < 90 || b.x > 990) xOut++; } }
  if (minY < 470) s -= 40 + (470 - minY) * 0.3;
  s -= xOut * 0.5;
  // Distinct first routers; packet 2 (index 1) should take the long way (>=2 router hits).
  const first = r.routerHits.map((h) => (h.length ? h[0] : -1));
  if (first.some((x) => x < 0)) s -= 30;
  s += new Set(first.filter((x) => x >= 0)).size * 6;
  // Route signature: packet1 -> left router, packet4 -> right router, packet3 -> centre router, packet2 the long way.
  if (first[0] === 0) s += 12;
  if (first[3] === 1) s += 12;
  if (first[2] === 2) s += 12;
  if (new Set(r.routerHits[1]).size >= 2) s += 12;
  const sig = r.routerHits.map((h) => [...new Set(h)].join(">"));
  s += new Set(sig).size * 8;
  // Readable spacing of arrivals in 8.6..11.2 s.
  const arr = EXPECTED_ORDER.map((i) => r.arrival[i]);
  for (let k = 0; k < 4; k++) {
    if (arr[k] < 0) { s -= 40; continue; }
    if (arr[k] < 262) s -= 10; if (arr[k] > 330) s -= 10 + (arr[k] - 330);
    if (k > 0 && arr[k - 1] >= 0) s += Math.min(arr[k] - arr[k - 1], 16) * 0.8 - (arr[k] - arr[k - 1] < 7 ? 15 : 0);
  }
  return {s, r};
}

const trials = Number(process.argv[2] ?? 4000);
const rnd = mulberry32(Number(process.argv[3] ?? 7));
const start = process.argv[4] ? (JSON.parse(process.argv[4]) as SimParams) : null;
let best = start ? {s: score(start).s, p: start} : {s: -1e9, p: PARAMS};
for (let t = 0; t < (start ? 0 : trials); t++) {
  const p: SimParams = {
    belt: 0.00025 + rnd() * 0.0003,
    launch: [0, 1, 2, 3].map(() => ({vx: Math.round((rnd() * 14 - 7) * 10) / 10, vy: Math.round((-rnd() * 10 - 1) * 10) / 10, w: Math.round((rnd() * 0.16 - 0.08) * 1000) / 1000, delay: Math.floor(rnd() * 20)})),
  };
  const {s} = score(p);
  if (s > best.s) { best = {s, p}; console.log(t, s.toFixed(1), JSON.stringify(p)); }
}
// Local refinement around the best candidate.
const jit = (v: number, a: number, d: number) => Math.round((v + (rnd() * 2 - 1) * a) * d) / d;
for (let t = 0; t < trials; t++) {
  const q: SimParams = {belt: Math.max(0.0002, Math.min(0.0008, best.p.belt + (rnd() * 2 - 1) * 0.00005)), launch: best.p.launch.map((l) => ({vx: jit(l.vx, 0.6, 10), vy: jit(l.vy, 0.6, 10), w: jit(l.w, 0.01, 1000), delay: Math.max(0, Math.min(16, l.delay + Math.round((rnd() * 2 - 1) * 1.4)))}))};
  const {s} = score(q);
  if (s > best.s) { best = {s, p: q}; console.log("refine", t, s.toFixed(1), JSON.stringify(q)); }
}
const {r} = score(best.p);
console.log("BEST", best.s, JSON.stringify(best.p));
console.log("order", r.order.map((i) => i + 1), "final", r.finalOrder.map((i) => i + 1), "arrival", r.arrival, "settled", r.settled, "routers", JSON.stringify(r.routerHits), "walls", r.wallHits);
