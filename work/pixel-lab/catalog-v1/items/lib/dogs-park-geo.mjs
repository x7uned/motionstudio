// catalog-v1 copy (2026-10-26) of work/pixel-lab/dogs/kit/park-geo.mjs; changes: import paths only.
// Dog series park (2026-10-23) · geometry shared by the park modules: depth frames for objects on the layers behind the
// actors (layout.mjs `layer`), the near-lawn floor model below the lawn line, the back-lawn row → depth table, and the
// periodic wind / drift clocks (whole cycles per loop period, so frame(0) == frame(period)).
import { layer, ground } from "./dogs-park-layout.mjs";

/** Floor model for the lawn BELOW the lawn line (toward the viewer): a ground plane seen from a camera EYE units above it
 *  and DIST units in front of the actors' plane. Depth q ≥ 1 is the magnification (1 = the actors' plane, 1.6 ≈ the bottom
 *  of the hook frame). Screen row = L + G.z·EYE·(q − 1); x = 270 + G.z·q·(u − cam.cx) (at G.z = 1 this equals layout's
 *  layer(cam, q).X(u·q)); one world unit at depth q is G.z·q pixels. */
export const EYE = 500, DIST = 1500;

export function floorOf(cam) {
  const G = ground(cam), L = G.Y(0), k = G.z * EYE, z = G.z, cx = cam.cx;
  return {
    G, L, k, z,
    q: (sy) => 1 + (sy - L) / k,
    row: (q) => L + k * (q - 1),
    /** depth coordinate along the ground (world units in front of the actors' plane) */
    s: (q) => DIST * (1 - 1 / q),
    qOfS: (s) => DIST / (DIST - s),
    X: (u, q) => 270 + z * q * (u - cx),
    u: (sx, q) => cx + (sx - 270) / (z * q),
    zq: (q) => z * q,
  };
}

/** Frame for an object standing on layer p at layer x (and layer y, default the layer's lawn wy = 0). Sizes are REAL world
 *  units scaled by depth: one real unit = p · layer.z pixels (so a far bench looks smaller than the near one). */
export function frameAt(cam, p, x, y = 0) {
  const V = layer(cam, p), s = p * V.z, X0 = V.X(x), Y0 = V.Y(y);
  return { V, s, X0, Y0, X: (dx) => X0 + dx * s, Y: (dy) => Y0 + dy * s, p };
}

/** Back lawn between the far scenery and the lawn line: for each screen row above L, the depth p (0..1) of the lawn seen
 *  there (where layer(cam, p).Y(0) meets the row). Rows outside get NaN. Envelope keeps it monotonic at low cameras. */
export function backRows(cam, H = 960) {
  const N = 250, ys = new Float32Array(N + 1);
  let m = -Infinity;
  for (let i = 0; i <= N; i++) { const y = layer(cam, i / N).Y(0); m = Math.max(m, y); ys[i] = m; }
  const out = new Float32Array(H).fill(NaN), top = Math.max(0, Math.ceil(ys[0])), bot = Math.min(H - 1, Math.floor(ys[N]));
  let i = 0;
  for (let r = top; r <= bot; r++) {
    while (i < N && ys[i + 1] < r + 0.5) i++;
    if (i >= N) { out[r] = 1; continue; }
    const a = ys[i], b = ys[i + 1]; out[r] = (i + (b > a ? Math.max(0, Math.min(1, (r + 0.5 - a) / (b - a))) : 0)) / N;
  }
  return { p: out, top, bot };
}

// ---------------------------------------------------------------- periodic clocks
/** Whole number of cycles of a ~sec-long motion inside the loop period P (at least 1). */
export const cyc = (P, sec) => Math.max(1, Math.round(P / sec));
const TAU = Math.PI * 2;
/** Wind at world x and time t: a travelling gust (−1.3..1.3), exactly periodic with P. */
export function wind(t, P, x = 0) {
  const a = TAU * t / P;
  return 0.62 * Math.sin(a * cyc(P, 3.3) - x * 0.012) + 0.24 * Math.sin(a * cyc(P, 1.9) - x * 0.027 + 1.3) + 0.4 * Math.sin(a * cyc(P, 8.5) - x * 0.0045 + 0.4);
}
/** Loop-safe phase 0..1 of a cycle of about `sec` seconds. */
export const phase = (t, P, sec, off = 0) => { const n = cyc(P, sec), v = (t / P) * n + off; return v - Math.floor(v); };
