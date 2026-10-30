// ed138 «orbit-path» (new, 2026-10-28): a dotted orbit seen from slightly above the plane of the Solar System, centred on its
// sun (cx, cy). The near half is brighter than the far half; «draw» lays the dots round from the start point, «tilt» lifts the
// orbit out of the plane (up to 25°, like a tilted Kuiper-belt orbit), «glow» brightens it. orbitPoint() gives positions on it.
import { bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { clamp01, tintPx } from "../lib/layout.mjs";

const R = Math.round, D2R = Math.PI / 180;
/** Screen point of orbit angle th (rad) for semi-major axis a (px), eccentricity e, inclination inc (deg), node om (deg),
 *  view elevation el (deg, 90 = top view), perihelion angle w (deg). Returns [x, y, depth] (depth > 0 = near half). */
export function orbitPoint(cx, cy, a, th, o = {}) {
  const e = o.e ?? 0, inc = (o.inc ?? 0) * D2R, om = (o.om ?? 0) * D2R, el = (o.el ?? 22) * D2R, w = (o.w ?? 0) * D2R;
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(th - w)), px = r * Math.cos(th), py = r * Math.sin(th);
  const x1 = px, y1 = py * Math.cos(inc), z1 = py * Math.sin(inc);                         // tilt about the node line (x)
  const x = x1 * Math.cos(om) - y1 * Math.sin(om), y = x1 * Math.sin(om) + y1 * Math.cos(om); // turn the node
  return [cx + x, cy + y * Math.sin(el) + z1 * Math.cos(el), y];
}
/** o: { a (px), e, inc, om, el, w, prog 0..1, start (rad), glow, col, a: presence, dots spacing (px) } */
export function drawOrbit(c, cx, cy, o) {
  const A = o.alpha ?? 1, a = o.a, prog = clamp01(o.prog ?? 1), col = o.col || "#8CA8E0", sp = o.spacing ?? 5, glow = o.glow ?? 0;
  const n = Math.max(24, Math.round((2 * Math.PI * a) / sp)), start = o.start ?? -Math.PI / 2;
  for (let q = 0; q < n; q++) {
    const u = q / n; if (u > prog) break;
    const th = start + u * 2 * Math.PI, [x, y, d] = orbitPoint(cx, cy, a, th, o), X = R(x), Y = R(y);
    const near = d > 0 ? 1 : 0.55, edgeFade = clamp01((prog - u) * n / 3);
    const k = A * near * edgeFade; if (k <= bayer(X, Y) * 0.999) continue;
    const cc = mix("#20244A", col, Math.min(1, 0.55 + 0.35 * near + 0.3 * glow));
    c.px(X, Y, cc); if ((o.thick ?? 1) > 1) c.px(X + 1, Y, cc);
    if (glow > 0.05) for (const [i, j] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) tintPx(c, X + i, Y + j, col, A * glow * 0.5 * near, 4);
  }
  const [x, y] = orbitPoint(cx, cy, a, start + prog * 2 * Math.PI, o);
  return { box: { x0: cx - a, y0: cy - a * 0.5, x1: cx + a, y1: cy + a * 0.5 }, pt: [x, y] };
}

export default {
  kind: "orbit-path",
  covers: ["orbit", "orbit path", "trajectory", "planet orbit", "tilted orbit"],
  source: "ed138 (new)",
  desc: "a dotted planet orbit seen from slightly above, round its sun; can be drawn in or tilted",
  hw: 110, hh: 50, start: "a still dotted ellipse; the near half brighter",
  states: {
    idle: [0.5, "a dotted orbit round the sun"],
    trace: [1.2, "a bright spark races once round the orbit", "scan"],
    tilt: [1.0, "the orbit tilts up out of the flat plane", "swish"],
    glow: [0.6, "the orbit brightens", "glow"],
  },
  base: { prog: 1, tilt: 0, glow: 0 },
  st: { idle: { prog: 1, tilt: 0, glow: 0 }, trace: {}, tilt: { tilt: 1 }, glow: { glow: 1 } },
  linear: ["prog"],
  notes: "anchor = the sun; drawOrbit(prog) lets a film lay the dots in; trace = a spark (head) running round once",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, o = { a: 110 * z, inc: 25 * v.tilt, om: -20, el: 24, prog: v.prog, glow: v.glow, alpha: s.a }, k = s.acc("trace");
    const res = drawOrbit(c, cx, cy, o);
    if (k > 0 && k < 1) { const amp = Math.sin(Math.PI * k); for (let q = 0; q < 10; q++) { const [x, y] = orbitPoint(cx, cy, o.a, -Math.PI / 2 + (k - q * 0.012) * 2 * Math.PI, o), X = R(x), Y = R(y); if (amp * (1 - q / 10) > bayer(X, Y)) { c.px(X, Y, q < 2 ? "#FFFFFF" : "#BFE0FF"); if (q < 2) { c.px(X + 1, Y, "#BFE0FF"); c.px(X, Y + 1, "#BFE0FF"); } } } }
    return res;
  },
};
