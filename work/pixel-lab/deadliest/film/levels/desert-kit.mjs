// Shared helpers of the desert (LV5 scorpion) and village (LV6 dog) levels: a cached world-space layer (offscreen canvas
// with a coverage mask, copied row by row into the frame with clipping — adapted from the series' park-kit), the one
// ground plane both levels share (wet mud at the swamp seam → golden sand → packed dirt road of the village, so the
// 2700 seam is one continuous surface), and small props (dry shrub, pebble, sparkle star, leaf ball).
// Deterministic (rnd seeds): static layers are drawn once.
import { Canvas, hex, bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, fade, clamp01, sm, lerp } from "../cute.mjs";

export const R = Math.round;

/** Canvas that also records which pixels were painted (the layer's alpha). */
export class MaskCanvas extends Canvas {
  constructor(w, h) { super(w, h, "#000000"); this.m = new Uint8Array(w * h); }
  px(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex(c), i = y * this.w + x; this.d[i * 3] = r; this.d[i * 3 + 1] = g; this.d[i * 3 + 2] = b;
    if (this.m) this.m[i] = 1;
  }
}

/** World-space cached layer: draw with world coordinates through `g`, blit each frame (clipped to [clip0, clip1) world x). */
export class Layer {
  constructor(wx0, wy0, wx1, wy1) {
    this.wx0 = wx0; this.wy0 = wy0; this.c = new MaskCanvas(wx1 - wx0, wy1 - wy0);
    const L = this, c = this.c, g = Object.create(c);
    g.px = (x, y, col) => c.px(x - L.wx0, y - L.wy0, col);
    g.get = (x, y) => c.get(x - L.wx0, y - L.wy0);
    g.has = (x, y) => { x = Math.floor(x - L.wx0); y = Math.floor(y - L.wy0); return x >= 0 && y >= 0 && x < c.w && y < c.h && c.m[y * c.w + x] === 1; };
    g.erase = (x, y) => { x = Math.floor(x - L.wx0); y = Math.floor(y - L.wy0); if (x >= 0 && y >= 0 && x < c.w && y < c.h) c.m[y * c.w + x] = 0; };
    this.g = g;
  }
  blit(dst, V) {
    const src = this.c, W = src.w, ox = R(V.X(this.wx0)), oy = R(V.Y(this.wy0));
    const y0 = Math.max(0, oy), y1 = Math.min(dst.h, oy + src.h), x0 = Math.max(0, ox), x1 = Math.min(dst.w, ox + W);
    if (x1 <= x0 || y1 <= y0) return;
    const sd = src.d, sm_ = src.m, dd = dst.d, DW = dst.w;
    for (let y = y0; y < y1; y++) {
      let li = (y - oy) * W + (x0 - ox), ci = y * DW + x0;
      for (let x = x0; x < x1; x++, li++, ci++) if (sm_[li]) { const a = li * 3, b = ci * 3; dd[b] = sd[a]; dd[b + 1] = sd[a + 1]; dd[b + 2] = sd[a + 2]; }
    }
  }
}

// ---------------------------------------------------------------- the shared ground plane (side view, perspective bands)
// d = depth below the ground line (world y − LAND): 0 at the far edge → ~420 at the bottom of a water-level camera.
// Sand at golden hour: glare-bright near the horizon, warmer and deeper toward the viewer; wind ripples in perspective.
export const SAND = ["#FFE8B4", "#FBD898", "#F6C682", "#F0B470", "#E8A262", "#DE9258", "#D28450", "#C47848", "#B46C42"];
// the village dirt road at dusk: rosy light far away (sky glow), plum shadows toward the viewer
export const DIRT = ["#E6A88C", "#D6927C", "#C27E70", "#AC6C66", "#965C5E", "#824E56", "#6E424E", "#5C3846", "#4C2E3E"];
const MUD = ["#E2B486", "#D8A478", "#CC946C", "#C08662", "#B47A5A", "#A86E52", "#9C644C", "#905A46", "#845242"];   // damp sand
export const RIP_DARK = "#A0563E", RIP_LIGHT = "#FFF2CC";

/** 0 sand → 1 dirt across the village seam: a slow colour blend (the light changes with it), not a hard edge. */
export const dirtK = (wx) => sm(wx, 2640, 2790);
/** 0 → 1 dampness across the swamp seam. */
export const wetK = (wx) => 1 - sm(wx, 2156, 2178);
/** 0 → 1 darkening of the road into the jungle floor (the jungle's soil starts at 3240). */
export const jungleK = (wx) => sm(wx, 3176, 3242);
const idxAt = (d, ramp) => Math.min(ramp.length - 1.001, Math.max(0, Math.sqrt(Math.max(0, d) / 360) * (ramp.length - 1.4)));
function pick(ramp, v, x, y) { const lo = Math.floor(v), f = v - lo; return ramp[Math.min(ramp.length - 1, f > 0.5 + 0.42 * (bayer(x, y) - 0.5) ? lo + 1 : lo)]; }
const qmix = (a, b, k, x, y, steps = 6) => { const s = k * steps, lo = Math.floor(s), q = (s - lo > bayer(x, y) ? lo + 1 : lo) / steps; return q <= 0 ? a : q >= 1 ? b : mix(a, b, q); };

function sandAt(wx, wy, d, rip) {
  const n = (rnd((wx >> 2) * 7 + (wy >> 2) * 131) - 0.5) * 0.35, kw = clamp01(wetK(wx) + n * 0.5);
  const wet = kw > bayer(wx + 1, wy + 2) * 0.9 + 0.05, ramp = wet ? MUD : SAND;
  let col = pick(ramp, idxAt(d, ramp), wx, wy);
  if (wet) return rnd(wx * 11 + wy * 37) < 0.01 ? mix(col, "#2A1E1C", 0.35) : col;
  // wind ripples: lines evenly spaced in distance → bunched near the horizon, wide near the viewer
  const ph = 3400 / (d + 34) + Math.sin(wx * 0.031 + Math.sin(wx * 0.011) * 2) * 0.22 + Math.sin(wx * 0.083 + d * 0.05) * 0.06, f = ph - Math.floor(ph);
  const sp = (d + 34) * (d + 34) / 3400, lw = Math.min(0.5, 1 / Math.max(1, sp)), on = d > 14 && sp > 2.2 && rip > bayer(wx, wy + 1);
  if (on && f < lw) col = mix(col, RIP_DARK, 0.22 * Math.min(1, (sp - 2.2) / 3)); else if (on && f < lw * 2 && f >= lw) col = mix(col, RIP_LIGHT, 0.2 * Math.min(1, (sp - 2.2) / 3));
  if (d > 4 && rnd(wx * 13 + wy * 71) < 0.004) col = mix(col, "#FFF6D8", 0.5);
  else if (d > 4 && rnd(wx * 29 + wy * 17) < 0.004) col = mix(col, "#6A3A2A", 0.35);
  return col;
}
function dirtAt(wx, wy, d) {
  let col = pick(DIRT, idxAt(d, DIRT), wx, wy);
  // two wheel ruts running along the street and a worn lighter crown between them
  const rut = (c0) => Math.abs(d - c0) < 1.2 + c0 * 0.012;
  if (rut(58) || rut(118)) col = mix(col, "#3A2234", 0.32);
  else if (Math.abs(d - 61) < 1 || Math.abs(d - 122) < 1.2) col = mix(col, "#F6C8A8", 0.18);
  if (d > 4 && rnd(wx * 17 + wy * 53) < 0.006) col = mix(col, "#2E1C28", 0.3);
  else if (d > 4 && rnd(wx * 41 + wy * 23) < 0.004) col = mix(col, "#FFD8B8", 0.3);
  return col;
}
/** Colour of the shared ground plane at world (wx, wy), depth d = wy − LAND. */
export function groundAt(wx, wy, d) {
  const k = dirtK(wx);
  let col = k <= 0 ? sandAt(wx, wy, d, 1) : k >= 1 ? dirtAt(wx, wy, d) : qmix(sandAt(wx, wy, d, 1 - k), dirtAt(wx, wy, d), k, wx, wy);
  const j = jungleK(wx);
  if (j > 0) col = qmix(col, d < 3 ? "#2E5A32" : "#24181C", j * (d < 3 ? 1 : 0.92), wx, wy, 5);
  return col;
}

// ---------------------------------------------------------------- props
/** Dry desert shrub: a dome of thin twigs (h tall, w wide) rooted at (x, y). cols [dark, mid, light]. */
export function shrub(g, x, y, w, h, seed, cols = ["#5A3424", "#8A5A3A", "#C8925A"]) {
  for (let i = 0; i < 9 + w / 3; i++) {
    const a = -Math.PI / 2 + (rnd(seed + i * 7) - 0.5) * 2.4, len = h * (0.55 + rnd(seed + i * 3) * 0.5);
    let px = x + (rnd(seed + i * 5) - 0.5) * 4, py = y, ang = a;
    const n = R(len);
    for (let k = 0; k < n; k++) {
      ang += (rnd(seed * 3 + i * 31 + k) - 0.5) * 0.3;
      px += Math.cos(ang) * (w / h) * 0.8; py += Math.sin(ang);
      g.px(R(px), R(py), k < n * 0.35 ? cols[0] : k < n * 0.75 ? cols[1] : cols[2]);
      if (k > n * 0.4 && rnd(seed + i * 13 + k) < 0.18) { const s = rnd(seed + k) < 0.5 ? -1 : 1; g.px(R(px) + s, R(py) - 1, cols[2]); g.px(R(px) + 2 * s, R(py) - 2, cols[2]); }
    }
  }
}
/** Round shaded pebble (rx × ry) at (x, y) bottom-centre. ramp dark → light. */
export function pebble(g, x, y, rx, ry, ramp) {
  const cy = y - ry;
  for (let Y = R(cy - ry); Y <= R(y); Y++) for (let X = R(x - rx); X <= R(x + rx); X++) {
    const u = (X - x) / rx, v = (Y - cy) / ry, d = u * u + v * v; if (d > 1) continue;
    if (d > 0.78) { g.px(X, Y, ramp[0]); continue; }
    const l = -u * 0.55 - v * 0.75 + 0.2, k = l > 0.35 ? 3 : l > 0 ? 2 : 1;
    g.px(X, Y, ramp[Math.min(ramp.length - 1, k + (l > 0.15 && bayer(X, Y) > 0.5 ? 1 : 0))]);
  }
}
/** Four-point sparkle star (size s, a dissolve). */
export function sparkle(c, x, y, s, col = "#FFFFFF", a = 1, core = "#FFFFFF") {
  if (a <= 0 || s < 0.6) return; const g = fade(c, a), n = R(s);
  for (let k = 1; k <= n; k++) { const q = k > n * 0.6 ? col : core; g.px(R(x) + k, R(y), q); g.px(R(x) - k, R(y), q); g.px(R(x), R(y) + k, q); g.px(R(x), R(y) - k, q); }
  g.px(R(x), R(y), core); if (n >= 3) { g.px(R(x) + 1, R(y) + 1, col); g.px(R(x) - 1, R(y) - 1, col); g.px(R(x) + 1, R(y) - 1, col); g.px(R(x) - 1, R(y) + 1, col); }
}
/** Leafy cluster ball (bush/canopy chunk), dithered tone bands lit from the upper left. */
export function leafBall(g, cx, cy, r, ramp, seed = 0, o = {}) {
  const out = o.outline ?? ramp[0], bumps = o.bumps ?? 9, amp = o.amp ?? 0.12;
  const rad = (a) => r * (1 + amp * Math.sin(a * bumps + seed) + amp * 0.5 * Math.sin(a * (bumps * 2 + 1) + seed * 2.3));
  for (let Y = R(cy - r * 1.25); Y <= R(cy + r * 1.25); Y++) for (let X = R(cx - r * 1.25); X <= R(cx + r * 1.25); X++) {
    const dx = X - cx, dy = Y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), rr = rad(a);
    if (d > rr) continue;
    if (d > rr - 1.1) { g.px(X, Y, out); continue; }
    const lx = (-dx * 0.6 - dy * 0.8) / r, v = 0.5 + lx * 0.45 - (d / rr) * 0.18 + (o.lift ?? 0);
    const n = ramp.length - 1, s = Math.max(1, Math.min(n, v * n + (rnd((X * 31 + Y * 17) ^ seed) - 0.5) * 0.9)), lo = Math.floor(s);
    g.px(X, Y, ramp[Math.min(n, s - lo > bayer(X, Y) ? lo + 1 : lo)]);
  }
}
/** Soft additive-looking glow: blend toward col by k·(1 − d/r)^p, quantised + dithered (screen space). */
export function glow(c, x, y, r, col, k = 0.5, p = 1.6, steps = 4) {
  c.tint(R(x - r), R(y - r), R(2 * r) + 1, R(2 * r) + 1, (X, Y) => { const d = Math.hypot(X - x, Y - y) / r; return d >= 1 ? 0 : k * (1 - d) ** p; }, col, steps);
}
export { rnd, fade, clamp01, sm, lerp, mix, bayer };
/** Blink curve from a list of blink start times (each blink ~0.2 s, continuous). */
export function blinks(t, times, d = 0.2) { let v = 0; for (const b of times) { const p = t - b; if (p > 0 && p < d) v = Math.max(v, Math.sin((Math.PI * p) / d)); } return v; }
