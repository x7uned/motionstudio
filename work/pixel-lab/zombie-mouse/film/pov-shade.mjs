// «The last person alive» · Builder P — volume ("pillow") shading for organic shapes, after ../../dog/shade.mjs drawPart:
// Catmull-Rom outlines → mask → chamfer distance → value = base + gain·depth + directional term + lit/shadow rims,
// quantised to an RGB ramp in flat bands (dither only in transitions), selective dark outline (lit side warm).
import { BT } from "./pov-core.mjs";

const SCR = { m: new Uint8Array(1 << 16), d: new Float32Array(1 << 16) };
export const ramp = (...hexes) => hexes.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

/** Smooth closed outline through control points; indices in `sharp` stay corners. */
export function smooth(pts, sharp = null, seg = 4) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (sharp && (sharp.has(i) || sharp.has((i + 1) % n))) { out.push(p1); continue; }
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  return out;
}

/** A tapered limb (capsule chain) as a polygon: pts [[x,y],…], radii [r,…]. */
export function limb(pts, radii, seg = 6) {
  const L = [], Rr = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const r = radii[i]; L.push([pts[i][0] - dy * r, pts[i][1] + dx * r]); Rr.push([pts[i][0] + dy * r, pts[i][1] - dx * r]);
  }
  // round caps
  const capA = [], capB = [];
  const p0 = pts[0], p1 = pts[pts.length - 1], r0 = radii[0], r1 = radii[radii.length - 1];
  const a0 = Math.atan2(pts[1][1] - p0[1], pts[1][0] - p0[0]), a1 = Math.atan2(p1[1] - pts[pts.length - 2][1], p1[0] - pts[pts.length - 2][0]);
  for (let k = 1; k < seg; k++) { const a = a1 - Math.PI / 2 + (Math.PI * k) / seg; capB.push([p1[0] + Math.cos(a) * r1, p1[1] + Math.sin(a) * r1]); }
  for (let k = 1; k < seg; k++) { const a = a0 + Math.PI / 2 + (Math.PI * k) / seg; capA.push([p0[0] + Math.cos(a) * r0, p0[1] + Math.sin(a) * r0]); }
  return [...L, ...capB.reverse(), ...Rr.reverse(), ...capA.reverse()];
}

/**
 * Fill the union of polygons with volume shading into target g (has w, h, d [rgb], optional m mask).
 * o: { ramp, base, gain, thick, light [lx, ly] (direction light comes FROM, screen), dir (directional gradient gain),
 *      rimLit, rimShade, outline (rgb|null), litOutline (rgb|null), alpha, clip(X,Y)→bool, slope, tex(X,Y)→Δvalue }
 * Returns the mask box { x0, y0, W, H, m } so callers can add details inside the shape.
 */
export function vol(g, polys, o) {
  const rp = o.ramp, base = o.base ?? 3, gain = o.gain ?? 1.4, thick = o.thick ?? 8, slope = o.slope ?? 0.6;
  const [lx, ly] = o.light ?? [-0.8, -0.4], ln = Math.hypot(lx, ly) || 1, ux = lx / ln, uy = ly / ln, dirG = o.dir ?? 0;
  const rimLit = o.rimLit ?? 0.9, rimShade = o.rimShade ?? 0.8, alpha = o.alpha ?? 1;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  x0 = Math.floor(x0) - 2; y0 = Math.floor(y0) - 2; x1 = Math.ceil(x1) + 2; y1 = Math.ceil(y1) + 2;
  const W = x1 - x0, H = y1 - y0; if (W <= 0 || H <= 0 || W * H > 4e6) return null;
  if (SCR.m.length < W * H) { SCR.m = new Uint8Array(W * H * 2); SCR.d = new Float32Array(W * H * 2); }
  const m = SCR.m, xs = []; m.fill(0, 0, W * H);
  for (const poly of polys) for (let y = 0; y < H; y++) {
    const yc = y0 + y + 0.5; xs.length = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k]) - x0); x < Math.min(W, Math.round(xs[k + 1]) - x0); x++) m[y * W + x] = 1;
  }
  const INF = 1e9, d = SCR.d;
  for (let i = 0; i < W * H; i++) d[i] = m[i] ? INF : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 1.414); } d[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x < W - 1) v = Math.min(v, d[i + 1] + 1); if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + W - 1] + 1.414); } d[i] = v; }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]);
  const cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2, hx = Math.max(1, (x1 - x0) / 2), hy = Math.max(1, (y1 - y0) / 2);
  const gw = g.w, gh = g.h, gd = g.d, gm = g.m;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!m[i]) continue;
    const X = x0 + x, Y = y0 + y;
    if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue;
    const b = BT[((Y & 3) << 2) | (X & 3)];
    if (alpha < 1 && alpha <= b) continue;
    if (o.clip && !o.clip(X, Y)) continue;
    const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
    let col;
    if (edge && o.outline) {
      const litSide = !at(Math.round(x + ux * 1.6), Math.round(y + uy * 1.6));
      col = litSide && o.litOutline ? o.litOutline : o.outline;
    } else {
      const t = Math.min(1, d[i] / thick), yN = (Y - cym) / hy, xN = (X - cxm) / hx;
      let v = base + gain * Math.pow(t, 0.6) - slope * (yN * 0.5 + 0.5) + dirG * (xN * ux + yN * uy);
      if (!at(Math.round(x + ux * 2.5), Math.round(y + uy * 2.5))) v += rimLit;
      if (!at(Math.round(x - ux * 3.5), Math.round(y - uy * 3.5))) v -= rimShade;
      if (o.tex) v += o.tex(X, Y);
      const fl = Math.floor(v), f = v - fl, qv = f < 0.34 ? fl : f > 0.66 ? fl + 1 : (f - 0.34) / 0.32 > b ? fl + 1 : fl;
      col = rp[Math.max(0, Math.min(rp.length - 1, qv))];
    }
    const k = (Y * gw + X) * 3; gd[k] = col[0]; gd[k + 1] = col[1]; gd[k + 2] = col[2];
    if (gm) gm[Y * gw + X] = 1;
  }
  return { x0, y0, W, H };
}
