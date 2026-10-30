// catalog-v1 copy (2026-10-26) of work/pixel-lab/ping/film/people.mjs drawDesk via lib/ping-desk.mjs; changes: drawComputer = only the monitor + PC tower (no chair, desk, person) on a short slab; RGB brightness (RGBK) and screen time/brightness are parameters; screen is an abstract desktop / busy bars
import { bayer, hex, mix } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round, clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v), lerp = (a, b, k) => a + (b - a) * k;
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const h1 = (n) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
const keyOf = (c) => (c[0] << 16) | (c[1] << 8) | c[2];
const CHAIR = ["#050409", "#0C0A14", "#15121F", "#201C2D", "#2C273D", "#3C3552"];
const DESK = ["#07050C", "#100C18", "#1A1526", "#251E36", "#312845", "#3F3458"];
const WHO_YOU = { accent: ["#1E3A6E", "#5B8BD6"], can: ["#2A5092", "#84ACEC"], phase: 0 };
export const LIGHT_GAME = "#BCD6FF", LIGHT_DEAD = "#FF2E48";
const RIM_PURPLE = "#A878F0", RIM_MAGENTA = "#D46CEC", RGB = ["#B08AE8", "#E03CC8", "#4FD8F0", "#6E4FB0"];

/** Ramp under coloured light: bright steps take on the light colour, the dark end keeps the night ambient. */
function litRamp(ramp, color, k, lo = 0.15, gain = 1.12) {
  const n = ramp.length, L = hex(color);
  return ramp.map((c, i) => {
    const a = hex(c), w = clamp(k * (lo + (1 - lo) * Math.pow(i / (n - 1), 1.3)));
    return a.map((v, j) => R(v + (Math.min(255, (v * L[j] / 255) * gain + v * 0.08) - v) * w));
  });
}
/** Cycle through the RGB palette (soft colour cycle for fans / strips). */
let RGBK = 1;
function rgbAt(p) { const n = RGB.length, q = ((p % 1) + 1) % 1 * n, i = Math.floor(q), f = q - i; return mix("#120E1C", mix(RGB[i], RGB[(i + 1) % n], ss(0, 1, f)), RGBK); }
/** Polygon union → mask over its bbox (clamped to the canvas plus a margin). */
function field(g, polys, mg = 8) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of polys) for (const q of p) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
  if (!(x0 <= x1)) return null;
  const bb = [x0, y0, x1, y1], cw = g.w ?? 540, ch = g.h ?? 960;
  x0 = Math.floor(x0) - 2; y0 = Math.floor(y0) - 2; x1 = Math.ceil(x1) + 2; y1 = Math.ceil(y1) + 2;
  if (x1 < 0 || y1 < 0 || x0 >= cw || y0 >= ch) return null;
  x0 = Math.max(x0, -mg); y0 = Math.max(y0, -mg); x1 = Math.min(x1, cw + mg); y1 = Math.min(y1, ch + mg);
  const W = x1 - x0, H = y1 - y0; if (W <= 0 || H <= 0) return null;
  const m = new Uint8Array(W * H), xs = [];
  for (const poly of polys) {
    let p0 = 1e9, p1 = -1e9; for (const q of poly) { if (q[1] < p0) p0 = q[1]; if (q[1] > p1) p1 = q[1]; }
    const ya = Math.max(0, Math.floor(p0) - y0), yb = Math.min(H - 1, Math.ceil(p1) - y0), n = poly.length;
    for (let y = ya; y <= yb; y++) {
      const yc = y0 + y + 0.5; xs.length = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) { const a = poly[j], b = poly[i]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
      if (xs.length < 2) continue; xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.max(0, R(xs[k]) - x0), xb = Math.min(W, R(xs[k + 1]) - x0); for (let x = xa; x < xb; x++) m[y * W + x] = 1; }
    }
  }
  return { x0, y0, W, H, m, bb };
}
function dist(F) {
  const { W, H, m } = F, d = new Float32Array(W * H), D = 1.414;
  for (let i = 0; i < W * H; i++) d[i] = m[i] ? 1e9 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x > 0 && d[i - 1] + 1 < v) v = d[i - 1] + 1; if (y > 0) { if (d[i - W] + 1 < v) v = d[i - W] + 1; if (x > 0 && d[i - W - 1] + D < v) v = d[i - W - 1] + D; if (x < W - 1 && d[i - W + 1] + D < v) v = d[i - W + 1] + D; } d[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x < W - 1 && d[i + 1] + 1 < v) v = d[i + 1] + 1; if (y < H - 1) { if (d[i + W] + 1 < v) v = d[i + W] + 1; if (x < W - 1 && d[i + W + 1] + D < v) v = d[i + W + 1] + D; if (x > 0 && d[i + W - 1] + D < v) v = d[i + W - 1] + D; } d[i] = v; }
  F.d = d; return F;
}
/**
 * Volume-shaded part (extends shade.mjs drawPart): pillow shading from the distance field, key light rim/shade,
 * directional tilt across the part, an optional coloured back rim (RGB light from behind), flat tone bands with
 * Bayer dither only in narrow transitions, crisp outline with lit/rim-coloured edges.
 */
function shade(g, polys, o) {
  const thick = Math.max(1, o.thick ?? 10), mg = o.mg ?? Math.min(80, Math.ceil(thick * 1.3) + 8);
  const F = field(g, polys, mg); if (!F) return null; dist(F);
  const { x0, y0, W, H, m, d, bb } = F, ramp = o.ramp, n = ramp.length;
  const base = o.base ?? 3.4, gain = o.gain ?? 1.6, slope = o.slope ?? 0.8, alpha = o.alpha ?? 1;
  const [lx, ly] = o.light ?? [0.8, -0.5], ln = Math.hypot(lx, ly) || 1, ux = lx / ln, uy = ly / ln;
  const lw = o.litW ?? 3, sw = o.shadeW ?? 4, rimLit = o.rimLit ?? 0.8, rimShade = o.rimShade ?? 0.8;
  const outline = o.outline === undefined ? ramp[0] : o.outline, litOutline = o.litOutline ?? null, rim = o.rim ?? null, tilt = o.tilt ?? null, tex = o.tex ?? null;
  const bcx = (bb[0] + bb[2]) / 2, bcy = (bb[1] + bb[3]) / 2, bhw = Math.max(1, (bb[2] - bb[0]) / 2), bhh = Math.max(1, (bb[3] - bb[1]) / 2), bH = Math.max(1, bb[3] - bb[1]);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]);
  let rx = 0, ry = 0, rw = 0; if (rim) { const rl = Math.hypot(rim.dir[0], rim.dir[1]) || 1; rx = rim.dir[0] / rl; ry = rim.dir[1] / rl; rw = rim.w ?? 2; }
  const cw = g.w ?? 540, ch = g.h ?? 960, xa = Math.max(0, -x0), xb = Math.min(W, cw - x0), ya = Math.max(0, -y0), yb = Math.min(H, ch - y0);
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
    const i = y * W + x; if (!m[i]) continue;
    const X = x0 + x, Y = y0 + y;
    if (alpha < 1 && alpha <= bayer(X, Y)) continue;
    if (outline && (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1))) {
      if (rim && !at(R(x + rx * 1.5), R(y + ry * 1.5))) { g.px(X, Y, rim.edge ?? rim.c); continue; }
      g.px(X, Y, litOutline && !at(R(x + ux * 1.5), R(y + uy * 1.5)) ? litOutline : outline); continue;
    }
    if (rw > 0 && !at(R(x + rx * rw), R(y + ry * rw)) && (rim.k ?? 1) > bayer(X, Y)) { g.px(X, Y, rim.c); continue; }
    let v = base + gain * Math.pow(Math.min(1, d[i] / thick), 0.6) - slope * (Y - bb[1]) / bH;
    if (tilt) v += tilt[0] * (X - bcx) / bhw + tilt[1] * (Y - bcy) / bhh;
    if (tex) v += tex(X, Y);
    if (rimLit && !at(R(x + ux * lw), R(y + uy * lw))) v += rimLit;
    if (rimShade && !at(R(x - ux * sw), R(y - uy * sw))) v -= rimShade;
    const fl = Math.floor(v), f = v - fl, q = f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl;
    g.px(X, Y, ramp[q < 1 ? 1 : q > n - 1 ? n - 1 : q]);
  }
  return F;
}
/** Flat colour with a dithered feathered edge (k = overall density). */
function soft(g, polys, col, feather = 3, k = 1) {
  if (k <= 0) return; const F = field(g, polys, 2); if (!F) return; dist(F);
  const { x0, y0, W, H, m, d } = F, cw = g.w ?? 540, ch = g.h ?? 960, fn = typeof col === "function";
  for (let y = Math.max(0, -y0); y < Math.min(H, ch - y0); y++) for (let x = Math.max(0, -x0); x < Math.min(W, cw - x0); x++) {
    const i = y * W + x; if (!m[i]) continue; const X = x0 + x, Y = y0 + y;
    if (k * Math.min(1, d[i] / feather) > bayer(X, Y)) { const c = fn ? col(X, Y) : col; if (c) g.px(X, Y, c); }
  }
}
/** Shift pixels that belong to `ramp` by `delta` steps inside the polygons (relative shading overlays). */
function shiftArea(g, polys, ramp, delta, feather = 3, k = 1) {
  if (k <= 0) return; const F = field(g, polys, 2); if (!F) return; dist(F);
  const idx = new Map(ramp.map((c, i) => [keyOf(hex(c)), i])), n = ramp.length;
  const { x0, y0, W, H, m, d } = F, cw = g.w ?? 540, ch = g.h ?? 960;
  for (let y = Math.max(0, -y0); y < Math.min(H, ch - y0); y++) for (let x = Math.max(0, -x0); x < Math.min(W, cw - x0); x++) {
    const i = y * W + x; if (!m[i]) continue; const X = x0 + x, Y = y0 + y;
    if (k * Math.min(1, d[i] / feather) <= bayer(X, Y)) continue;
    const j = idx.get(keyOf(g.get(X, Y))); if (j === undefined || j === 0) continue;
    g.px(X, Y, ramp[clamp(j + delta, 1, n - 1)]);
  }
}
/** Scanline polygon fill, clipped; col may be a function (x, y) → colour | null. */
function fill(g, pts, col) {
  if (!pts.length) return;
  let p0 = 1e9, p1 = -1e9; for (const q of pts) { if (q[1] < p0) p0 = q[1]; if (q[1] > p1) p1 = q[1]; }
  const cw = g.w ?? 540, ch = g.h ?? 960, fn = typeof col === "function", n = pts.length, xs = [];
  for (let y = Math.max(0, Math.floor(p0)); y <= Math.min(ch - 1, Math.ceil(p1)); y++) {
    const yc = y + 0.5; xs.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) { const a = pts[j], b = pts[i]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
    if (xs.length < 2) continue; xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, R(xs[k])); x < Math.min(cw, R(xs[k + 1])); x++) { const c = fn ? col(x, y) : col; if (c) g.px(x, y, c); }
  }
}
function box(g, x, y, w, h, c) {
  const cw = g.w ?? 540, ch = g.h ?? 960, xa = Math.max(0, Math.floor(x)), ya = Math.max(0, Math.floor(y)), xb = Math.min(cw, Math.floor(x + w)), yb = Math.min(ch, Math.floor(y + h));
  for (let j = ya; j < yb; j++) for (let i = xa; i < xb; i++) g.px(i, j, c);
}
/** Blend existing pixels toward colour by k(x, y) (quantised, dithered) inside a rect — glows and light spill. */
function glow(g, x, y, w, h, k, c, steps = 4) {
  const cw = g.w ?? 540, ch = g.h ?? 960, C = hex(c);
  for (let j = Math.max(0, Math.floor(y)); j < Math.min(ch, Math.ceil(y + h)); j++) for (let i = Math.max(0, Math.floor(x)); i < Math.min(cw, Math.ceil(x + w)); i++) {
    const v = k(i, j); if (v <= 0.01) continue;
    const s = Math.min(1, v) * steps, lo = Math.floor(s), q = (s - lo > bayer(i, j) ? lo + 1 : lo) / steps;
    if (q > 0) g.px(i, j, mix(g.get(i, j), C, q));
  }
}
const ell = (cx, cy, rx, ry, n = 24, a0 = 0, a1 = Math.PI * 2) => { const p = []; for (let i = 0; i < n; i++) { const a = a0 + ((a1 - a0) * i) / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
/** Open Catmull-Rom through points. */
function spline(pts, seg = 6) {
  const n = pts.length, out = []; if (n < 3) return pts.slice();
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < seg; k++) { const t = k / seg, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  out.push(pts[n - 1]); return out;
}
/** Polygon around a polyline with width tapering w0 → w1. */
function tube(pts, w0, w1 = w0, cap = true) {
  const L = [], Rr = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = lerp(w0, w1, n > 1 ? i / (n - 1) : 0) / 2;
    L.push([p[0] - dy * w, p[1] + dx * w]); Rr.unshift([p[0] + dy * w, p[1] - dx * w]);
  }
  if (cap && n > 1) { // round ends
    const e = pts[n - 1], q = pts[n - 2], a = Math.atan2(e[1] - q[1], e[0] - q[0]), w = w1 / 2, s0 = pts[0], s1 = pts[1], b = Math.atan2(s0[1] - s1[1], s0[0] - s1[0]), v = w0 / 2;
    const endArc = [], startArc = [];
    for (let k = 1; k < 4; k++) { const t = a + Math.PI / 2 - (Math.PI * k) / 4; endArc.push([e[0] + Math.cos(t) * w, e[1] + Math.sin(t) * w]); }
    for (let k = 1; k < 4; k++) { const t = b + Math.PI / 2 - (Math.PI * k) / 4; startArc.push([s0[0] + Math.cos(t) * v, s0[1] + Math.sin(t) * v]); }
    return [...L, ...endArc, ...Rr, ...startArc];
  }
  return [...L, ...Rr];
}
const GREY = ["#0E0D14", "#2A2836", "#4E4A60", "#7E7894", "#B4B0C8"];

function screenColor(kind, u, v, X, Y, t) {
  if (kind === "off") return (u * 0.6 - v * 0.8 > 0.05 && u * 0.6 - v * 0.8 < 0.12 && bayer(X, Y) > 0.6) ? "#1C1A28" : "#0A0910";
  // catalog: an abstract glowing desktop (no game picture, no text): blue field, two plain panels, a dark bottom strip,
  // a faint bright band rolling slowly down
  if (v > 0.9) return "#141A24";
  const roll = (((t * 0.07) % 1) + 1) % 1 * 1.1 - 0.08, rb = Math.abs(v - roll) < 0.05 ? 1 : 0;
  if (u > 0.08 && u < 0.52 && v > 0.12 && v < 0.5) return v < 0.18 ? "#BCD6FF" : rb ? "#A8C6F4" : "#8CB0EC";
  if (u > 0.58 && u < 0.92 && v > 0.22 && v < 0.78) return v < 0.28 ? "#8CB0EC" : rb ? "#4E7CC4" : "#3E6AB0";
  const k = v / 0.9, q = (k * 3 % 1 > bayer(X, Y) ? Math.ceil(k * 3) : Math.floor(k * 3)) / 3;
  return mix(rb ? "#3A66B4" : "#2A4A86", "#5E8EC8", q);
}
/** Fill a quad whose left and right edges are vertical (the angled monitor) with a colour function of (u, v). */
function quadFill(g, Q, fn) {
  const [tl, tr, br, bl] = Q, cw = g.w ?? 540, ch = g.h ?? 960;
  for (let X = Math.max(0, Math.ceil(tl[0])); X < Math.min(cw, Math.ceil(tr[0])); X++) {
    const u = (X + 0.5 - tl[0]) / (tr[0] - tl[0]), yt = lerp(tl[1], tr[1], u), yb = lerp(bl[1], br[1], u);
    for (let Y = Math.max(0, Math.ceil(yt - 0.5)); Y < Math.min(ch, yb - 0.5); Y++) { const c = fn(u, (Y + 0.5 - yt) / (yb - yt), X, Y); if (c) g.px(X, Y, c); }
  }
}
/** Mouse-hand flicks: new target every 0.22 s, fast eased move (continuous). */
function lightOf(st, fallbackColor, fallbackK) {
  const l = st.light ?? {};
  return { color: l.color ?? fallbackColor, k: l.k ?? fallbackK };
}
// ---------------------------------------------------------------- the desk set (no gamer)
export function drawComputer(c, x, y, s = 1, st = {}) {
  const t = st.t ?? 0, sk0 = clamp(st.on ?? 1); RGBK = clamp(st.rgb ?? 1);
  const Lc = LIGHT_GAME, Lk = 0.08 + 0.5 * sk0 * (st.bright ?? 1);
  const P = (p) => [x + p[0] * s, y + (p[1] < -38 ? p[1] + 10.64 : p[1] * 0.72) * s];
  const dk = litRamp(DESK, Lc, Lk * 0.45);
  const KEY = [1, -0.3], rim = { dir: [-1, -0.08], c: RIM_PURPLE, w: clamp(R(0.7 * s), 1, 4), edge: mix(RIM_PURPLE, "#FFFFFF", 0.25) };
  const op = { light: KEY, rim, rimLit: 0.8, litW: Math.max(1, 0.5 * s), shadeW: Math.max(1, 0.6 * s) };
  const part = (pts, o, g = c) => shade(g, [pts.map(P)], { ...op, ...o, thick: (o.thick ?? 2) * s });
  const Lt = { k: Lk };
  // short desk slab under the set
  part([[54, -61], [130, -61], [130, -57.4], [54, -57.4]], { ramp: dk, base: 1.8, gain: 0.5, thick: 0.6, rim: null, litOutline: dk[5] });
  // --- monitor: stand, frame, screen (skewed quad, right edge nearer and taller), glow on the desk
  part(ell(80, -60.3, 7, 1.4, 14), { ramp: GREY, base: 1.4, gain: 0.8, thick: 0.6, rim: null });
  part([[78.2, -70], [82, -70], [82.6, -60.6], [78.6, -60.6]], { ramp: GREY, base: 1.6, gain: 0.8, thick: 0.6, rim: null });
  const SQ = [[60, -97], [92, -101.6], [92, -65.4], [60, -70]], FQ = [[58.6, -98.6], [93.4, -103.4], [93.4, -63.8], [58.6, -68.6]];
  shade(c, [FQ.map(P)], { ...op, ramp: ["#05040A", "#0C0A14", "#16131F", "#221E2E", "#2E2940"], base: 1.6, gain: 0.6, thick: 0.6 * s, litOutline: "#3E3854", rim: null });
  const sq = SQ.map(P);
  if (typeof st.screenFill === "function") st.screenFill(sq);
  else quadFill(c, sq, (u, v, X, Y) => (sk0 >= 1 || sk0 > bayer(X, Y) ? (st.scr ? st.scr(u, v, X, Y, screenColor("desktop", u, v, X, Y, st.scrT ?? t)) : screenColor("desktop", u, v, X, Y, st.scrT ?? t)) : screenColor("off", u, v, X, Y, t)));
  { const g0 = P([76, -60]); glow(c, P([38, 0])[0], P([0, -64])[1], 64 * s, 14 * s, (i, j) => 0.55 * Lt.k * Math.max(0, 1 - Math.hypot((i - g0[0]) / (30 * s), (j - g0[1]) / (6 * s))), Lc, 3); }
  fill(c, tube(spline([[87, -69], [91, -62.6], [96, -61.4], [100.6, -62.8]].map(P), 4), Math.max(1, 0.6 * s), Math.max(1, 0.6 * s), false), "#06050A");

  // --- PC tower: mesh front (facing the gamer), tempered-glass side with RGB fans, GPU, cooler
  part([[97.4, -99.8], [102, -102.2], [102, -61], [97.4, -61.6]], { ramp: ["#05040A", "#0C0A14", "#16131F", "#221E2E"], base: 1.8, gain: 0.4, thick: 0.6, rim: null });
  if (s >= 1.8) for (let yy = -99; yy < -62; yy += 1.2) for (let xx = 98; xx < 101.6; xx += 1.2) { const p = P([xx, yy + (xx - 98) * -0.5]); c.px(R(p[0]), R(p[1]), "#2A2638"); }
  part([[102, -102.2], [126, -102.2], [126, -61], [102, -61]], { ramp: ["#05040A", "#0A0812", "#100D1A", "#181424", "#221D30"], base: 1.6, gain: 0.5, thick: 1, litOutline: "#3A3450", rim: null });
  for (let i = 0; i < 3; i++) {
    const fc = P([107.2, -94 + i * 10]), col = rgbAt(t * 0.15 + i * 0.12), r = 3.6 * s;
    glow(c, fc[0] - r * 1.6, fc[1] - r * 1.6, r * 3.2, r * 3.2, (a, b) => 0.4 * Math.max(0, 1 - Math.hypot(a - fc[0], b - fc[1]) / (r * 1.5)), col, 3);
    for (let w = 0; w < Math.max(1, 0.7 * s); w += 1) c.ering(R(fc[0]), R(fc[1]), Math.max(1, r * 0.82 - w), Math.max(1, r - w), col);
    if (s >= 1.6) { fill(c, ell(fc[0], fc[1], 1 * s, 1.2 * s, 8), "#1A1626"); for (let k = 0; k < 5; k++) { const a = k * 1.2566 + t * 9; c.line(R(fc[0]), R(fc[1]), R(fc[0] + Math.cos(a) * r * 0.62), R(fc[1] + Math.sin(a) * r * 0.75), "#2A2438"); } }
  }
  part([[112, -80], [125, -80], [125, -76], [112, -76]], { ramp: ["#05040A", "#1A1626", "#2A2438", "#3E3852"], base: 2, gain: 0.6, thick: 0.4, rim: null });
  box(c, R(P([112.4, -76.6])[0]), R(P([0, -76.6])[1]), R(12.4 * s), Math.max(1, R(0.5 * s)), rgbAt(t * 0.15 + 0.5));
  { const cc = P([119, -91.5]), col = rgbAt(t * 0.15 + 0.3); for (let w = 0; w < Math.max(1, 0.6 * s); w += 1) c.ering(R(cc[0]), R(cc[1]), Math.max(1, 3 * s - w), Math.max(1, 3 * s - w), col); }
  glow(c, P([102, 0])[0], P([0, -102])[1], 24 * s, 41 * s * 0.72, (i, j) => { const u = (i - P([102, 0])[0]) / (24 * s), v = (j - P([0, -102])[1]) / (41 * s * 0.72); return (u * 0.7 - v * 0.5 > 0.25 && u * 0.7 - v * 0.5 < 0.3) ? 0.35 : 0; }, "#FFFFFF", 2);
  glow(c, P([94, 0])[0], P([0, -64])[1], 40 * s, 10 * s, (i, j) => 0.35 * Math.max(0, 1 - Math.hypot((i - P([114, 0])[0]) / (18 * s), (j - P([0, -60])[1]) / (4 * s))), rgbAt(0.1), 3);   // catalog: static spill colour

  if (st.led) { const p = P([99.7, -64.5]); box(c, R(p[0]), R(p[1]), Math.max(1, R(1.2 * s)), Math.max(1, R(1.2 * s)), mix("#2A1A10", "#FFB04A", st.led)); }
  return { screenQuad: sq, top: P([0, -104.6])[1], bottom: P([0, -57.4])[1], left: P([54, 0])[0], right: P([130, 0])[0] };
}
