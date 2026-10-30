// «The last person alive» — cameras of the third-person shots and the hero's walk. cam = { cx, cy, z, sx, sy } (layout.mjs).
import { sm, lerp, ease } from "./layout.mjs";
import { EV } from "./timeline.mjs";

/** Shot A: his walk (world x) — steady 70 units/s, slowing to a stop as he sees the glow. */
export function heroWalkX(t) {
  // x = ∫ v, v = 70·(1 − sm(t, 7.3, 8.2)); closed form by sampling (cheap: 40 steps)
  let x = 40; const n = 40, dt = t / n; for (let i = 0; i < n; i++) { const u = (i + 0.5) * dt; x += 70 * (1 - sm(u, 7.3, 8.2)) * dt; } return x;
}
export function camTown(t) {
  const pan = 95 * ease(sm(t, EV.fire - 0.25, EV.fire + 0.7));
  return { cx: heroWalkX(t) + 30 + pan, cy: -95, z: 1.6, sx: 270, sy: 450 };
}
/** Shots C and E (the clearing). Keys blend with eased steps. */
const KEYS = [
  [0, { cx: 1245, cy: -85, z: 1.5 }],
  [EV.then1 - 0.35, { cx: 1245, cy: -85, z: 1.5 }],
  [EV.jumps, { cx: 1205, cy: -78, z: 1.48 }],
  [EV.scream - 0.32, { cx: 1185, cy: -70, z: 1.5 }],
  [EV.its - 0.1, { cx: 1185, cy: -70, z: 1.5 }],
  [EV.mouse0End + 0.1, { cx: 1196, cy: -22, z: 3.1 }],
  [EV.laughs - 0.15, { cx: 1196, cy: -22, z: 3.1 }],
  [EV.laughs + 0.45, { cx: 1245, cy: -85, z: 1.5 }],
  [EV.it2 - 0.1, { cx: 1245, cy: -85, z: 1.5 }],
  [EV.and1, { cx: 1500, cy: -90, z: 1.6 }],
];
export function camClearing(t) {
  let a = KEYS[0], b = KEYS[0];
  for (let i = 0; i + 1 < KEYS.length; i++) if (t >= KEYS[i][0]) { a = KEYS[i]; b = KEYS[i + 1]; }
  if (t >= KEYS[KEYS.length - 1][0]) { a = b = KEYS[KEYS.length - 1]; }
  const k = a === b ? 0 : ease((t - a[0]) / (b[0] - a[0])), c = { cx: lerp(a[1].cx, b[1].cx, k), cy: lerp(a[1].cy, b[1].cy, k), z: lerp(a[1].z, b[1].z, k) };
  return { ...c, sx: 270, sy: 480 };
}
