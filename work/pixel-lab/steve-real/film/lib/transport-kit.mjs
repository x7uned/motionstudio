// init catalog · group «transport» · shared drawing kit (new code, 2026-10-27).
// Everything is drawn in local units (1 unit = k screen px) through a Frame that mirrors (dir) and rotates (ang) the part,
// so vehicles can face the centre and pitch/tilt. A shape is an analytic test in local units → pixel mask → dark 1-px outline,
// flat tone bands from a ramp (light from the upper left, narrow ordered-Bayer seams), a 1-px lit rim top-left and a darker
// rim bottom-right. No anti-aliasing, no gradients.
import { band } from "./layout.mjs";
import { fade, hex } from "../../../../../renderer/pixel/raster.mjs";

export const OUT = "#07060E";
export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;

// 8-step ramps, dark -> light
export const RP = {
  red: ["#2A0810", "#5A1020", "#8A1A2C", "#B82838", "#DC4048", "#F06A5E", "#FA9684", "#FFD0C0"],
  blue: ["#0C1430", "#14264E", "#1E3E7A", "#2C5CA8", "#4482D0", "#68A6EA", "#9CC8F8", "#D4EAFF"],
  yellow: ["#3A2404", "#6E4408", "#A8680C", "#D8920E", "#F4BC1C", "#FCD84A", "#FFEC88", "#FFF8C8"],
  green: ["#0A2412", "#14401E", "#1E6430", "#2E8A40", "#4CB050", "#78D060", "#A8EA88", "#DCFAC4"],
  orange: ["#3A1A04", "#7A3A08", "#B85E10", "#E08A1C", "#F5AE2E", "#FBC94A", "#FDE07A", "#FFF2B8"],
  teal: ["#08222A", "#0E3C48", "#16606C", "#208890", "#34B0B0", "#5CD0C8", "#94E8DC", "#D0FAF2"],
  glass: ["#0C1830", "#16305C", "#244E86", "#3A72B0", "#5C98D0", "#88BCE8", "#B8DCF8", "#E8F6FF"],
  steel: ["#141820", "#232A36", "#36404E", "#4C5868", "#647284", "#808EA0", "#A0ACBC", "#C4CEDA"],
  white: ["#2A2A3A", "#4A4A60", "#6E6E88", "#9494AE", "#B8B8CE", "#D4D4E4", "#EAEAF4", "#FFFFFF"],
  ink: ["#06050C", "#0E0C1A", "#18152A", "#23203C", "#302C50", "#403B66", "#55507E", "#6E6A98"],
  brown: ["#1E0E06", "#3E200E", "#623418", "#8A4C24", "#B06A34", "#CC8A4C", "#E2AC70", "#F2CEA0"],
  purple: ["#1C0E3A", "#34206A", "#52358E", "#7650B4", "#9870D0", "#B894E6", "#D6BCF6", "#F0E4FF"],
};

// ---------------------------------------------------------------- local tests
export const tRR = (x, y, w, h, r) => (u, v) => {
  if (u < x || u > x + w || v < y || v > y + h) return false;
  const cx = u < x + r ? x + r : u > x + w - r ? x + w - r : u, cy = v < y + r ? y + r : v > y + h - r ? y + h - r : v;
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
};
export const tEl = (cx, cy, rx, ry) => (u, v) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;
export const tPoly = (pts) => {
  const n = pts.length;
  return (u, v) => {
    let ins = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a[1] > v) !== (b[1] > v) && u < ((b[0] - a[0]) * (v - a[1])) / (b[1] - a[1]) + a[0]) ins = !ins;
    }
    return ins;
  };
};
export const bbPoly = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
/** Convex-ish rounded polygon: Chaikin corner cutting (it keeps hand-written outlines pixel-clean). */
export function round(pts, n = 2) {
  let p = pts;
  for (let it = 0; it < n; it++) {
    const q = [];
    for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    p = q;
  }
  return p;
}

// ---------------------------------------------------------------- painter
/**
 * Paint a shape given by a screen-space test. o: ramp, lo/hi (tone range, default .28 → .86), v(X, Y) → 0..1 custom tone,
 * outline (colour or false), rim (lit/dark rim strength, default 1), light (extra left light, default .14).
 * bb = screen bbox [x0, y0, x1, y1]; tone is relative to it.
 */
export function paint(c, bb, test, o = {}) {
  const x0 = Math.floor(bb[0]) - 1, y0 = Math.floor(bb[1]) - 1, x1 = Math.ceil(bb[2]) + 1, y1 = Math.ceil(bb[3]) + 1, W = x1 - x0 + 1, H = y1 - y0 + 1;
  const m = new Uint8Array(W * H);
  if (o.poly) {   // screen-space scanline fill (fast path for polygons)
    const pp = o.poly, n = pp.length;
    for (let y = 0; y < H; y++) {
      const yc = y0 + y + 0.5, xs = [];
      for (let i = 0, j = n - 1; i < n; j = i++) { const a = pp[i], b = pp[j]; if ((a[1] > yc) !== (b[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
      xs.sort((p, q) => p - q);
      for (let q = 0; q + 1 < xs.length; q += 2) { const xa = Math.max(0, Math.ceil(xs[q] - 0.5 - x0)), xb = Math.min(W - 1, Math.floor(xs[q + 1] - 0.5 - x0)); for (let x = xa; x <= xb; x++) m[y * W + x] = 1; }
    }
  } else for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (test(x0 + x + 0.5, y0 + y + 0.5)) m[y * W + x] = 1;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]);
  const ramp = o.ramp ?? RP.steel, IDX = ramp.map((_, i) => i), rgb = ramp.map(hex), fast = !Object.prototype.hasOwnProperty.call(c, "px"), D = c.d, CW = c.w, CH = c.h, outRgb = o.outline === false ? null : hex(o.outline === undefined ? OUT : o.outline), lo = o.lo ?? 0.28, hi = o.hi ?? 0.86, rim = o.rim ?? 1, lg = o.light ?? 0.14, out = o.outline === undefined ? OUT : o.outline;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!m[y * W + x]) continue;
    const X = x0 + x, Y = y0 + y;
    if (!(at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1))) { if (out) { if (fast) { if (X >= 0 && Y >= 0 && X < CW && Y < CH) { const i = (Y * CW + X) * 3; D[i] = outRgb[0]; D[i + 1] = outRgb[1]; D[i + 2] = outRgb[2]; } } else c.px(X, Y, out); } else if (o.fillEdge) c.px(X, Y, ramp[1]); continue; }
    let t;
    if (o.v) t = o.v(X, Y);
    else t = hi - (hi - lo) * ((Y + 0.5 - bb[1]) / Math.max(1, bb[3] - bb[1])) + lg * (0.5 - (X + 0.5 - bb[0]) / Math.max(1, bb[2] - bb[0]));
    if (rim) {
      if (!at(x, y - 2) || !at(x - 2, y)) t += 0.2 * rim;
      else if (!at(x, y + 2) || !at(x + 2, y)) t -= 0.14 * rim;
    }
    const q = band(IDX, t, X, Y, 0.3);
    if (fast) { if (X >= 0 && Y >= 0 && X < CW && Y < CH) { const i = (Y * CW + X) * 3, r = rgb[q]; D[i] = r[0]; D[i + 1] = r[1]; D[i + 2] = r[2]; } } else c.px(X, Y, ramp[q]);
  }
}

/** A frame: local units → screen (scale k, mirror dir ±1, rotation ang in screen radians, origin cx, cy). */
export function frame(c, cx, cy, k, dir = 1, ang = 0) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (u, v) => { const a = dir * u; return [cx + (a * ca - v * sa) * k, cy + (a * sa + v * ca) * k]; };
  const inv = (X, Y) => { const dx = (X - cx) / k, dy = (Y - cy) / k; return [dir * (dx * ca + dy * sa), -dx * sa + dy * ca]; };
  const F = { c, k, dir, ang, P, inv };
  /** generic local shape: lb = local bbox [u0, v0, u1, v1], test(u, v) in local units. */
  F.shape = (lb, test, o = {}) => {
    const cs = [P(lb[0], lb[1]), P(lb[2], lb[1]), P(lb[0], lb[3]), P(lb[2], lb[3])];
    const bb = [Math.min(...cs.map((p) => p[0])), Math.min(...cs.map((p) => p[1])), Math.max(...cs.map((p) => p[0])), Math.max(...cs.map((p) => p[1]))];
    const du = Math.max(1e-6, lb[2] - lb[0]), dv = Math.max(1e-6, lb[3] - lb[1]), lo = o.lo ?? 0.28, hi = o.hi ?? 0.86, lg = o.light ?? 0.14;
    const oo = { ...o }, ik = 1 / k;
    if (!o.v) oo.v = (X, Y) => { const dx = (X + 0.5 - cx) * ik, dy = (Y + 0.5 - cy) * ik, u = dir * (dx * ca + dy * sa), v = -dx * sa + dy * ca; const fu = dir > 0 ? (u - lb[0]) / du : 1 - (u - lb[0]) / du; return hi - (hi - lo) * ((v - lb[1]) / dv) + lg * (0.5 - fu); };
    else oo.v = (X, Y) => { const dx = (X + 0.5 - cx) * ik, dy = (Y + 0.5 - cy) * ik; return o.v(dir * (dx * ca + dy * sa), -dx * sa + dy * ca); };
    paint(c, bb, (X, Y) => { const dx = (X - cx) * ik, dy = (Y - cy) * ik; return test(dir * (dx * ca + dy * sa), -dx * sa + dy * ca); }, oo);
  };
  F.rr = (x, y, w, h, r, o) => F.shape([x, y, x + w, y + h], tRR(x, y, w, h, r), o);
  F.ov = (cu, cv, rx, ry, o) => F.shape([cu - rx, cv - ry, cu + rx, cv + ry], tEl(cu, cv, rx, ry), o);
  F.pg = (pts, o) => F.shape(bbPoly(pts), tPoly(pts), { ...o, poly: pts.map((p) => P(p[0], p[1])) });
  /** stamped line of width w (local units): dark outline, body colour, lit streak */
  F.ln = (a, b, w, col, o = {}) => {
    const [x0, y0] = P(a[0], a[1]), [x1, y1] = P(b[0], b[1]), r = (w * k) / 2, n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    const out = o.outline === undefined ? OUT : o.outline;
    for (const [rad, cc, ox, oy] of [[r + 1, out, 0, 0], [r, col, 0, 0], [Math.max(0, r - 1.4), o.hl ?? null, -0.6, -0.6]]) {
      if (!cc || (rad <= 0.4 && cc !== col)) continue;
      for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n + ox, y = y0 + ((y1 - y0) * i) / n + oy; stampDisc(c, x, y, rad, cc); }
    }
  };
  /** plain filled disc without outline (details) */
  F.dot = (u, v, r, col) => { const [x, y] = P(u, v); stampDisc(c, x, y, Math.max(0.5, r * k), col); };
  F.px = (u, v, col, w = 1) => { const [x, y] = P(u, v); const s = Math.max(1, R(w * k)); c.rect(Math.floor(x - s / 2), Math.floor(y - s / 2), s, s, col); };
  return F;
}
export function stampDisc(c, x, y, r, col) {
  const X0 = Math.floor(x - r), X1 = Math.ceil(x + r), Y0 = Math.floor(y - r), Y1 = Math.ceil(y + r);
  for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) if ((X + 0.5 - x) ** 2 + (Y + 0.5 - y) ** 2 <= r * r + 0.3) c.px(X, Y, col);
}

// ---------------------------------------------------------------- parts used by several vehicles
/**
 * Spoked wheel (screen space, not mirrored): tire, rim, hub, spokes turned by `ang`. r in screen px.
 * o.tire ramp, o.rim ramp, o.spokes count, o.hub colour.
 */
export function wheel(c, x, y, r, ang, o = {}) {
  x = Math.round(x); y = Math.round(y); r = Math.max(4, Math.round(r));
  const tire = o.tire ?? RP.ink, rim = o.rim ?? RP.steel, rr = Math.round(r * (o.rimK ?? 0.62)), n = o.spokes ?? 5;
  const disc = (rad) => (X, Y) => (X - x - 0.5) ** 2 + (Y - y - 0.5) ** 2 <= rad * rad;
  paint(c, [x - r, y - r, x + r, y + r], disc(r + 0.4), { ramp: tire, lo: 0.3, hi: 0.62, rim: 1 });
  paint(c, [x - rr, y - rr, x + rr, y + rr], disc(rr + 0.4), { ramp: rim, lo: 0.42, hi: 0.95, outline: tire[0], rim: 0.6 });
  for (let i = 0; i < n; i++) {
    const a = ang + (i * 2 * Math.PI) / n, ex = x + Math.cos(a) * (rr - 1.5), ey = y + Math.sin(a) * (rr - 1.5);
    c.line(x, y, Math.round(ex), Math.round(ey), rim[2]);
  }
  paint(c, [x - 2, y - 2, x + 2, y + 2], disc(Math.max(2, rr * 0.32) + 0.4), { ramp: rim, lo: 0.5, hi: 1, outline: tire[0], rim: 0 });
}
/** Dithered soft glow of colour col, strength k (0..1), radius r (screen px). Goes through c so it dissolves with the item. */
export function glow(c, x, y, r, col, k) {
  if (k <= 0.01) return;
  r = Math.max(2, r);
  c.tint(Math.round(x - r), Math.round(y - r), Math.round(r * 2) + 1, Math.round(r * 2) + 1, (X, Y) => { const d = Math.hypot(X - x, Y - y) / r; return d >= 1 ? 0 : k * (1 - d) ** 1.6; }, col, 4);
}
/** Round smoke / steam puff: light body, darker lower-right half-moon, tiny light spec. a dissolves it. */
export function puff(c, x, y, r, a, o = {}) {
  if (a <= 0.02 || r < 1) return;
  const g = fade(c, Math.min(1, a)), lite = o.lite ?? "#F2F0FA", mid = o.mid ?? "#C4C0DA", dark = o.dark ?? "#9C98BC";
  x = Math.round(x); y = Math.round(y); r = Math.max(2, Math.round(r));
  stampDisc(g, x + r * 0.18, y + r * 0.22, r, dark);
  stampDisc(g, x, y, r - 0.6, mid);
  stampDisc(g, x - r * 0.12, y - r * 0.14, Math.max(1, r * 0.62), lite);
}
/** Cheap deterministic hash noise for flicker (0..1, continuous in t). */
export const wob = (t, f, ph = 0) => 0.5 + 0.5 * Math.sin(t * f + ph) * Math.sin(t * f * 0.57 + ph * 2.3 + 1);
/** Contact shadow (dithered ellipse) under a vehicle. */
export function groundShadow(c, x, y, rx, ry, k = 0.4) {
  c.tint(Math.round(x - rx), Math.round(y - ry), Math.round(rx * 2) + 1, Math.round(ry * 2) + 1, (X, Y) => { const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; return d >= 1 ? 0 : k * (1 - d) ** 0.7; }, "#000000", 3);
}
/** Which way a vehicle faces: toward the centre of the frame (right-hand slots face left). */
export const facing = (s) => (s.slot === "right" || s.slot === "top-right" ? -1 : 1);
