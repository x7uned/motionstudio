// Ping film — characters (2026-10-22). Three PC gamers at night, lit by their monitors:
//   you    — light skin, messy dark-brown hair, CT-blue hoodie, black headset (blue LED, mic boom)
//   enemy  — medium-brown skin, backwards dark cap, rust hoodie, red headset
//   friend — darker skin, curly black hair, round glasses, green hoodie, white headset
// drawDesk  = 3/4 desk set facing right (gamer, chair, desk, angled monitor, PC tower with RGB fans)
// drawFace  = big close-up portrait (head ~260 px tall at s = 1) with blended expressions, blinks and breathing
// drawOTS   = the opening over-the-shoulder push from behind `you` into his monitor (true dolly parallax)
// Pure functions of their arguments: deterministic (no Math.random), every state is a continuous blend. No logos.
import { bayer, hex, mix, fade, TINY } from "../../../../renderer/pixel/raster.mjs";
import { smooth } from "./shade.mjs";

const R = Math.round, clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v), lerp = (a, b, k) => a + (b - a) * k;
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const h1 = (n) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
const keyOf = (c) => (c[0] << 16) | (c[1] << 8) | c[2];

// ---------------------------------------------------------------- palettes
const SK_LIGHT = ["#1E0E1A", "#4A2230", "#7C3E44", "#AE6458", "#D08A70", "#E8AE8E", "#F6CDAE", "#FFE6D0"];
const SK_MED = ["#170B14", "#34171E", "#582C26", "#7C4630", "#9E6440", "#BA8256", "#D29E70", "#E6BC8E"];
const SK_DARK = ["#0F0710", "#22111A", "#3A1F22", "#54302A", "#6E4434", "#895A44", "#A27458", "#BC9070"];
const HAIR_BROWN = ["#0A0508", "#170C0C", "#251410", "#361E16", "#4A2A1C", "#603A26", "#7C5034"];
const HAIR_BLACK = ["#050408", "#0C0A10", "#17131D", "#231D2B", "#30283A", "#41374D", "#574A66"];
const HOOD_BLUE = ["#0A1028", "#122046", "#1E3A6E", "#2A5092", "#3A68B4", "#5B8BD6", "#84ACEC", "#B4CFF8"];
const HOOD_RUST = ["#200A08", "#41160C", "#6A2A10", "#8E3C16", "#B4561E", "#D06E30", "#E8874A", "#F6B07A"];
const HOOD_GREEN = ["#06180C", "#0C2E16", "#164A22", "#20642E", "#2E7E3C", "#46984E", "#6CB668", "#9CD48E"];
const HS_BLACK = ["#040408", "#0B0B12", "#15151F", "#20202D", "#2D2D3E", "#404056", "#5A5A74"];
const HS_RED = ["#1C0306", "#3E070C", "#6A1016", "#961A20", "#BE2A2C", "#DE4A40", "#F27A62"];
const HS_WHITE = ["#2A2838", "#4C4A60", "#77758E", "#A2A2BA", "#C6C6DA", "#E2E2EE", "#F8F8FF"];
const CAP = ["#06060C", "#101018", "#1A1A26", "#262636", "#343448", "#46465E", "#5C5C78"];
const JEANS = ["#06070F", "#0E1426", "#18223C", "#243254", "#32446C", "#445A86"];
const CHAIR = ["#050409", "#0C0A14", "#15121F", "#201C2D", "#2C273D", "#3C3552"];
const SHOE = ["#0A0910", "#3A3648", "#8A86A0", "#E8E6F2"];
const DESK = ["#07050C", "#100C18", "#1A1526", "#251E36", "#312845", "#3F3458"];
const INK = "#160A12";

const WHO = {
  you: { skin: SK_LIGHT, hair: HAIR_BROWN, hairStyle: "messy", hoodie: HOOD_BLUE, headset: HS_BLACK, led: "#4FC8FF",
    iris: ["#140A0C", "#3A2414", "#5C3A1E", "#86592E", "#B08048"], lip: "#D0505E", lipK: 0.3, accent: ["#1E3A6E", "#5B8BD6"], can: ["#2A5092", "#84ACEC"], phase: 0 },
  enemy: { skin: SK_MED, hair: HAIR_BLACK, hairStyle: "cap", hoodie: HOOD_RUST, headset: HS_RED, led: "#FF6048",
    iris: ["#0C0608", "#24140E", "#3E2414", "#5C381E", "#7E5230"], lip: "#9E3A44", lipK: 0.28, accent: ["#6A2A10", "#E8874A"], can: ["#B01C2C", "#F27A62"], phase: 1.37 },
  friend: { skin: SK_DARK, hair: HAIR_BLACK, hairStyle: "curly", glasses: true, hoodie: HOOD_GREEN, headset: HS_WHITE, led: "#7CFFB0",
    iris: ["#0A0608", "#1E120C", "#352012", "#50321C", "#6E4A2A"], lip: "#5E2230", lipK: 0.28, accent: ["#164A22", "#6CB668"], can: ["#E0A020", "#F6D070"], phase: 2.21 },
};
export const PEOPLE = Object.keys(WHO);

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
function rgbAt(p) { const n = RGB.length, q = ((p % 1) + 1) % 1 * n, i = Math.floor(q), f = q - i; return mix(RGB[i], RGB[(i + 1) % n], ss(0, 1, f)); }

// ---------------------------------------------------------------- expressions
const EXPR = {
  focus: { browY: 0.05, browTilt: 0.32, browArch: 0.35, browIn: 0.25, browAsym: 0, lidTop: 0.8, lidTilt: 0.25, lidBot: 0.15, pupil: 1, gazeX: 0.55, gazeY: 0.05, mOpen: 0, mWide: 0.82, mCurve: -0.18, mAsym: 0, mRound: 0, mTeeth: 0, cheek: 0, knit: 0.35 },
  shock: { browY: -1, browTilt: -0.55, browArch: 1, browIn: 0, browAsym: 0, lidTop: 1.28, lidTilt: -0.15, lidBot: 0, pupil: 0.66, gazeX: 0.3, gazeY: 0, mOpen: 0.95, mWide: 0.6, mCurve: 0, mAsym: 0, mRound: 1, mTeeth: 0, cheek: 0, knit: 0 },
  annoyed: { browY: 0.5, browTilt: 1.15, browArch: -0.25, browIn: 1, browAsym: 0, lidTop: 0.56, lidTilt: 1, lidBot: 0.5, pupil: 0.95, gazeX: 0.45, gazeY: 0.1, mOpen: 0.42, mWide: 1, mCurve: -0.75, mAsym: 0, mRound: 0, mTeeth: 1, cheek: 0.15, knit: 1 },
  smirk: { browY: 0.15, browTilt: 0.3, browArch: 0.3, browIn: 0.15, browAsym: 1, lidTop: 0.52, lidTilt: -0.1, lidBot: 0.32, pupil: 1, gazeX: 0.6, gazeY: 0.05, mOpen: 0, mWide: 0.86, mCurve: 0.15, mAsym: 1, mRound: 0, mTeeth: 0, cheek: 0.35, knit: 0 },
  happy: { browY: -0.35, browTilt: -0.25, browArch: 0.7, browIn: 0, browAsym: 0, lidTop: 0.85, lidTilt: -0.15, lidBot: 0.65, pupil: 1, gazeX: 0.3, gazeY: 0, mOpen: 0.45, mWide: 1.08, mCurve: 1, mAsym: 0, mRound: 0, mTeeth: 0.75, cheek: 1, knit: 0 },
};
export const EXPRESSIONS = Object.keys(EXPR);

/** Blink roughly every 3 s (deterministic jitter): closes over 2 frames, opens over 3. */
function blinkAt(t, phase) {
  const P = 3.05; let b = 0;
  for (const n of [Math.floor((t + phase) / P) - 1, Math.floor((t + phase) / P)]) {
    const t0 = n * P + 0.4 + 1.1 * h1(n * 7.31 + phase * 3.1) - phase, dt = t - t0;
    if (dt >= 0 && dt < 0.22) b = Math.max(b, dt < 0.07 ? ss(0, 0.07, dt) : dt < 0.1 ? 1 : 1 - ss(0.1, 0.2, dt));
  }
  return b;
}
function exprAt(st, phase) {
  const a = EXPR[st.expr] ?? EXPR.focus, b = EXPR[st.exprTo ?? st.expr] ?? a, k = ss(0, 1, st.exprK ?? 0), E = {};
  for (const key in a) E[key] = lerp(a[key], b[key], k);
  E.blink = st.blink ?? blinkAt(st.t ?? 0, phase);
  return E;
}

// ---------------------------------------------------------------- raster helpers (all clipped to the canvas)
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
const bez = (a, b, c, u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]];
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
function capsule(a, b, ra, rb, n = 5) {
  const dx = b[0] - a[0], dy = b[1] - a[1], ang = Math.atan2(dy, dx), pts = [];
  for (let i = 0; i <= n; i++) { const t = ang - Math.PI / 2 + (Math.PI * i) / n; pts.push([b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb]); }
  for (let i = 0; i <= n; i++) { const t = ang + Math.PI / 2 + (Math.PI * i) / n; pts.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra]); }
  return pts;
}
/** Two-bone IK; `down` picks the elbow below the shoulder-target line. */
function ik(S, T, l1, l2, down = true) {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, Math.hypot(dx, dy))), base = Math.atan2(dy, dx), a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const e1 = [S[0] + Math.cos(base + a) * l1, S[1] + Math.sin(base + a) * l1], e2 = [S[0] + Math.cos(base - a) * l1, S[1] + Math.sin(base - a) * l1];
  const E = (e1[1] > e2[1]) === down ? e1 : e2, ex = T[0] - E[0], ey = T[1] - E[1], el = Math.hypot(ex, ey) || 1;
  return { E, W: [E[0] + (ex / el) * l2, E[1] + (ey / el) * l2] };
}
/** Leaf-shaped hair lock from root to tip (round root, pointed tip), bent sideways by `bend`. */
function lock(r, p, w, bend = 0, n = 8) {
  const dx = p[0] - r[0], dy = p[1] - r[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, c = [(r[0] + p[0]) / 2 + nx * bend, (r[1] + p[1]) / 2 + ny * bend], A = [], B = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, q = bez(r, c, p, u), q2 = bez(r, c, p, Math.min(1, u + 0.01)), q1 = bez(r, c, p, Math.max(0, u - 0.01));
    let tx = q2[0] - q1[0], ty = q2[1] - q1[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const hw = (w / 2) * Math.pow(1 - u, 0.75) * (0.75 + 0.25 * Math.sin(Math.min(1, u * 3) * Math.PI / 2));
    A.push([q[0] - ty * hw, q[1] + tx * hw]); B.unshift([q[0] + ty * hw, q[1] - tx * hw]);
  }
  return [...A, ...B.slice(1)];
}
function lightOf(st, fallbackColor, fallbackK) {
  const l = st.light ?? {};
  return { color: l.color ?? fallbackColor, k: l.k ?? fallbackK };
}

// ================================================================= CLOSE-UP PORTRAIT
// Local units: px at s = 1, origin at the head centre (eye line y ≈ -5, chin y ≈ 121, hair top ≈ -150).
const HEAD = [[0, -122], [50, -116], [84, -94], [102, -60], [108, -22], [108, 14], [102, 44], [90, 68], [72, 86], [50, 97], [28, 102], [10, 102], [-12, 99], [-40, 90], [-66, 74], [-86, 50], [-100, 18], [-106, -20], [-102, -60], [-80, -96], [-42, -118]];
const EYE_N = { x: -30, y: 0, hw: 22, f: 1, inner: 1 }, EYE_F = { x: 60, y: -2, hw: 22, f: 0.8, inner: -1 };
const MOUTH = { x: 20, y: 66 };

/** One close-up eye: lid skin, sclera, iris, pupil, highlights (monitor catchlight), lash line, crease, lower lid. */
function eyeCU(g, X, Y, s, e, E, sk, iris, Lc) {
  const o = clamp(E.lidTop, 0, 1.4) * (1 - E.blink), hU = 15.5, hD = 10.5, hw = e.hw * e.f;
  const bump = (u) => Math.pow(Math.max(0, 1 - u * u), 0.7), cant = (u) => 2.2 * u * e.inner;
  const yLow = (u) => e.y + cant(u) + hD * Math.pow(Math.max(0, 1 - u * u), 0.85) * (1 - 0.72 * E.lidBot);
  const yRef = (u) => e.y + cant(u) - hU * bump(u) + 6 * bump(u) * (E.lidTilt * 0.5 * u * e.inner + Math.abs(E.lidTilt) * 0.5);
  const yUp = (u) => yLow(u) - 0.6 + (yRef(u) - yLow(u) + 0.6) * o;
  const crease = (u) => e.y + cant(u) - (hU + 7 + 2.5 * Math.max(0, E.lidTop - 1)) * bump(u) + 3 * E.lidTilt * Math.max(0, u * e.inner) * bump(u);
  const ix = e.x + E.gazeX * hw * 0.42, iy = e.y + 0.6 + E.gazeY * 3, ri = 12.6, rp = 5.2 * E.pupil;
  const scl = mix("#E6E2EE", Lc, 0.25), sclS = mix("#A49AB8", Lc, 0.12), sclC = mix("#C4BCD2", Lc, 0.18), hl = mix("#FFFFFF", Lc, 0.2), lid = sk[4], ink = INK;
  const Xc = X(e.x), Xa = Math.floor(X(e.x - hw)) - 2, Xb = Math.ceil(X(e.x + hw)) + 3;
  for (let PX = Xa; PX <= Xb; PX++) {
    const u = (PX + 0.5 - Xc) / s / hw; if (u < -1.08 || u > 1.08) continue;
    const uc = clamp(u, -1, 1), yu = Y(yUp(uc)), yl = Y(yLow(uc)), yc = Y(crease(uc));
    if (Math.abs(u) <= 1) {
      // lid skin between crease and lash line
      for (let PY = Math.ceil(yc); PY < yu - 0.5; PY++) g.px(PX, PY, lid);
      // opening
      for (let PY = Math.ceil(yu); PY < yl; PY++) {
        const lxx = (PX + 0.5 - X(ix)) / s / e.f, lyy = (PY + 0.5 - Y(iy)) / s, dI = Math.hypot(lxx, lyy);
        const under = PY < yu + 3.2 * s;
        let col;
        if (dI < ri) {
          if (dI < rp) col = "#06040A";
          else if (dI > ri - 1.7) col = iris[0];
          else col = under ? iris[1] : lyy > ri * 0.3 ? (lxx < 1 ? iris[4] : iris[3]) : lyy > -ri * 0.2 ? iris[2] : iris[1];
          if (!under) {
            const hx = ri * 0.36, hy = -ri * 0.4;
            if (Math.abs(lxx - hx) < 2.5 && Math.abs(lyy - hy) < 2.5) col = hl;
            else if (Math.abs(lxx + ri * 0.42) < 1.3 && Math.abs(lyy - ri * 0.36) < 1.3) col = mix(hl, iris[3], 0.35);
          }
        } else col = under ? sclS : Math.abs(u) > 0.78 ? sclC : scl;
        g.px(PX, PY, col);
      }
      // lash line (heavier toward the outer corner)
      const lw = (2.3 + 1.9 * clamp(-u * e.inner) + 0.6 * (1 - Math.min(1, o))) * s;
      for (let PY = Math.floor(yu - lw + 0.5); PY <= Math.floor(yu + 0.3); PY++) g.px(PX, PY, ink);
      // crease line and lower lid
      if (Math.abs(u) < 0.86 && yc < yu - 1.5 * s) g.px(PX, Math.floor(yc), sk[2]);
      if (Math.abs(u) < 0.92 && yl > yu + 0.5) { g.px(PX, Math.floor(yl), u * e.inner < -0.3 ? sk[2] : sk[3]); if (s > 1.4) g.px(PX, Math.floor(yl) + 1, sk[6]); }
    }
  }
  // outer lash flick
  const uo = -e.inner, ox = X(e.x + uo * hw), oy = Y(yUp(uo * 0.97)), fl = 4.5 * s;
  for (let k = 0; k < fl; k++) for (let j = 0; j < Math.max(1, 1.6 * s); j++) g.px(R(ox + uo * k), R(oy - k * 0.55 - j), ink);
}

/** Brow: tapered arched band from the inner end to the outer end. */
function browCU(g, T, s, e, E, raise, hr) {
  const hw = e.hw * e.f, inX = e.x + e.inner * (hw * 0.92 - E.browIn * 5), outX = e.x - e.inner * hw * 1.18;
  const base = e.y - 33 + E.browY * 12 - raise * 10, inY = base + E.browTilt * 9, outY = base - E.browTilt * 2.6 + 3;
  const arch = 5 + E.browArch * 6, top = [], bot = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10, x = lerp(inX, outX, u), y = lerp(inY, outY, u) - arch * Math.sin(Math.PI * Math.pow(u, 0.8)) * 0.9;
    const th = lerp(10.5, 3.6, Math.pow(u, 1.15)) * (e.f < 1 ? 0.92 : 1);
    top.push([x, y - th * 0.58]); bot.unshift([x, y + th * 0.42]);
  }
  const poly = [...top, ...bot].map(T);
  fill(g, poly, hr[1]);
  // lit upper edge + hair strokes at the inner end
  for (let i = 1; i < 8; i++) { const p = T(top[i]); g.px(R(p[0]), R(p[1]) + 1, hr[3]); if (s >= 1.5) g.px(R(p[0]) + 1, R(p[1]) + 1, hr[3]); }
  for (let k = 0; k < 4; k++) { const u = 0.04 + k * 0.05, q = T([lerp(inX, outX, u), lerp(inY, outY, u)]); for (let j = 0; j < 4 * s; j++) g.px(R(q[0] - e.inner * j * 0.4), R(q[1] - j + 3 * s), hr[2]); }
  return { inner: [inX, inY], outer: [outX, outY] };
}

/** Close-up mouth: lips, opening (teeth / tongue / dark), corners, dimples. */
function mouthCU(g, X, Y, s, E, sk, lips, Lc, geo = null) {
  const mx = geo?.x ?? MOUTH.x, my = geo?.y ?? MOUTH.y, wl = (geo?.wl ?? 33) * E.mWide * (1 - 0.42 * E.mRound), wr = (geo?.wr ?? 26) * E.mWide * (1 - 0.42 * E.mRound);
  const yL = my - E.mCurve * 11, yR = my - E.mCurve * 11 - E.mAsym * 12;
  const topMid = my - E.mOpen * 7 - Math.max(0, E.mCurve) * 1.5 + Math.max(0, -E.mCurve) * 1.5, botMid = my + E.mOpen * 30 + Math.max(0, E.mCurve) * E.mOpen * 9;
  const pT = lerp(0.9, 0.5, E.mRound), pB = lerp(0.75, 0.5, E.mRound);
  const cornerY = (u) => (yL * (1 - u) + yR * (1 + u)) / 2;
  const yTop = (u) => lerp(cornerY(u), topMid, Math.pow(Math.max(0, 1 - u * u), pT)), yBot = (u) => lerp(cornerY(u), botMid, Math.pow(Math.max(0, 1 - u * u), pB));
  const lx = (u) => mx + (u < 0 ? u * wl : u * wr);
  const teeth = mix("#F2EEE6", Lc, 0.2), teethS = mix("#B4ACB4", Lc, 0.1), dark = "#2A0A14", tongue = mix("#B04656", Lc, 0.15);
  const Xa = Math.floor(X(mx - wl)) - 1, Xb = Math.ceil(X(mx + wr)) + 1;
  for (let PX = Xa; PX <= Xb; PX++) {
    const lxx = (PX + 0.5 - X(mx)) / s, u = clamp(lxx < 0 ? lxx / wl : lxx / wr, -1, 1); if (Math.abs(lxx < 0 ? lxx / wl : lxx / wr) > 1.04) continue;
    const yt = Y(yTop(u)), yb = Y(yBot(u)), au = Math.abs(u);
    // upper lip (cupid's bow dip at the centre), lower lip with highlight
    const ul = (4.2 + 1.6 * (1 - au)) * (1 - 0.25 * E.mWide * Math.max(0, E.mCurve)) * s, dip = 1.4 * Math.exp(-Math.pow((lxx - 1) / 3.2, 2)) * s;
    for (let PY = Math.floor(yt - ul + dip); PY < yt; PY++) g.px(PX, PY, au > 0.85 ? lips[3] : lips[4]);
    const ll = 7.5 * Math.pow(Math.max(0, 1 - au * au), 0.6) * (1 - 0.3 * E.mRound) * s;
    for (let PY = Math.ceil(yb); PY < yb + ll; PY++) { const v = (PY - yb) / Math.max(1, ll); g.px(PX, PY, v < 0.45 && lxx > -6 && lxx < 10 && au < 0.6 ? lips[6] : v > 0.8 ? lips[4] : lips[5]); }
    // opening
    const tH = E.mTeeth * 9 * (1 - 0.4 * E.mRound) * s, bH = E.mTeeth * 8.5 * (1 - 0.4 * E.mRound) * s;
    for (let PY = Math.ceil(yt); PY < yb; PY++) {
      let col = dark;
      const gap = ((lxx + 300) % 7.6) < 1.1 ? 1 : 0;
      if (PY < yt + tH) col = PY < yt + 1.2 * s ? teethS : gap ? teethS : teeth;
      else if (PY >= yb - bH) col = PY > yb - 1.2 * s ? teethS : gap ? teethS : mix(teeth, teethS, 0.3);
      else if (PY > yb - (yb - yt) * 0.38 && E.mTeeth < 0.6) col = tongue;
      g.px(PX, PY, col);
    }
    // mouth line
    const th = (2.6 - 1.2 * au) * s;
    for (let PY = Math.floor(yt - th * 0.5); PY < yt + th * 0.5; PY++) g.px(PX, PY, lips[1]);
  }
  // corners: dark dot + dimple creases (smile / smirk)
  for (const [u, k] of [[-1, Math.max(0, E.mCurve) + 0.3], [1, Math.max(0, E.mCurve) + E.mAsym + 0.3]]) {
    const cx0 = X(lx(u)), cy0 = Y(cornerY(u)), d = u < 0 ? -1 : 1;
    box(g, R(cx0 - (d < 0 ? 1.5 * s : 0)), R(cy0 - s), Math.max(1, R(1.6 * s)), Math.max(1, R(2 * s)), lips[1]);
    if (k > 0.45) for (let j = 0; j < 7 * s * Math.min(1, k - 0.3); j++) g.px(R(cx0 + d * (2.5 * s + j * 0.25)), R(cy0 - 2 * s - j * 0.8), sk[3]);
  }
  return { yTop, yBot, cornerY, lx };
}


/** Facepalm hand seen from the back (palm on the face) with its sleeve; k 0..1 lifts it from below the frame onto the face. */
function handCU(g, X0, Y0, s, k, sk, hd, KEY, rim) {
  if (k <= 0.001) return;
  const e = ss(0, 1, k), px = lerp(250, 12, e), py = lerp(620, -42, e), a = lerp(-0.62, -0.74, e);
  const ca = Math.cos(a), sa = Math.sin(a), H = ([x, y]) => [X0 + (px + x * ca - y * sa) * s, Y0 + (py + x * sa + y * ca) * s];
  shade(g, [[[-54, 46], [56, 42], [74, 760], [-74, 760]].map(H)], { ramp: hd, base: 2.3, gain: 1.5, slope: 0.2, thick: 34 * s, light: KEY, rim, tilt: [0.6, 0], litOutline: hd[6] });
  shade(g, [[[-52, 40], [54, 36], [57, 68], [-54, 72]].map(H)], { ramp: hd, base: 2.9, gain: 0.9, thick: 6 * s, light: KEY, rim, litOutline: hd[6] });
  for (let x = -42; x <= 46; x += 8) fill(g, tube([H([x, 44]), H([x + 0.5, 66])], Math.max(1, 1.3 * s), Math.max(1, 1.3 * s), false), hd[2]);
  const opt = { ramp: sk, base: 3.5, gain: 1.3, slope: 0.25, thick: 8 * s, light: KEY, rim, litOutline: mix(sk[7], "#FFFFFF", 0.25), rimLit: 0.9, litW: 3 * s };
  shade(g, [capsule([-36, 20], [-60, -14], 12.5, 10).map(H)], opt);
  shade(g, [smooth([[-46, 44], [-48, 6], [-42, -30], [-22, -40], [0, -42], [22, -40], [40, -32], [46, 0], [42, 38], [20, 52], [-24, 52]].map(H), new Set(), 4)], { ...opt, thick: 20 * s, base: 3.3 });
  for (const [bx, ang, len, w] of [[-32, -0.06, 58, 23], [-11, -0.02, 67, 23.5], [10, 0.025, 63, 23], [30, 0.07, 49, 20]]) {
    const b = [bx, -30], tp = [bx + Math.sin(ang) * len, -30 - Math.cos(ang) * len];
    shade(g, [capsule(b, tp, w / 2, w / 2 - 1.6, 6).map(H)], opt);
    const nail = H([lerp(b[0], tp[0], 0.86), lerp(b[1], tp[1], 0.86)]);
    soft(g, [ell(nail[0], nail[1], 5 * s, 6 * s, 12)], sk[6], 2 * s, 0.9);
    for (const q of [0.42, 0.7]) { const m0 = [lerp(b[0], tp[0], q), lerp(b[1], tp[1], q)], c0 = H([m0[0] - w * 0.28, m0[1] + 1]), c1 = H([m0[0], m0[1] - 1]), c2 = H([m0[0] + w * 0.28, m0[1] + 1]); g.line(R(c0[0]), R(c0[1]), R(c1[0]), R(c1[1]), sk[3]); g.line(R(c1[0]), R(c1[1]), R(c2[0]), R(c2[1]), sk[3]); }
    const kn = H([bx, -32]); soft(g, [ell(kn[0], kn[1], 6 * s, 4 * s, 10)], sk[6], 2 * s, 0.8);
  }
  for (const [x0, y0, x1, y1] of [[-24, 30], [0, 32], [22, 28]].map(([x, y]) => [x, y, x + 2, y - 46])) { const p0 = H([x0, y0]), p1 = H([x1, y1]); soft(g, [tube([p0, p1], 3 * s)], sk[3], 2 * s, 0.6); }
}

// Cel-shading planes of the face (relative ramp steps over a flat mid tone).
const FACE_LIT = [[-26, -108], [30, -114], [72, -98], [96, -66], [103, -24], [103, 14], [97, 42], [84, 66], [66, 82], [46, 93], [26, 98], [8, 98], [-10, 93], [-24, 82], [-34, 62], [-42, 40], [-52, 20], [-60, -8], [-62, -46], [-50, -86]];
const FACE_HOT = [[46, -110], [82, -92], [100, -58], [106, -20], [106, 14], [100, 42], [88, 64], [72, 78], [78, 54], [84, 24], [86, -6], [82, -36], [72, -66], [60, -92]];
const FACE_SHADOW = [[-42, -118], [-80, -96], [-102, -60], [-106, -20], [-100, 18], [-86, 50], [-66, 74], [-40, 90], [-26, 94], [-36, 76], [-56, 56], [-70, 26], [-76, -12], [-76, -54], [-64, -92]];
const FACE_DEEP = [[-102, -60], [-106, -20], [-100, 18], [-86, 50], [-66, 74], [-40, 90], [-12, 99], [10, 102], [20, 102], [6, 96], [-18, 92], [-44, 80], [-64, 60], [-80, 30], [-88, -6], [-90, -46]];
const JAW = [[-66, 74], [-40, 90], [-12, 99], [10, 102], [28, 102], [50, 97], [72, 86], [90, 68]];

export function drawFace(c, cx, cy, s = 1, st = {}) {
  const who = WHO[st.who] ?? WHO.you, t = st.t ?? 0, E = exprAt(st, who.phase), Lt = lightOf(st, LIGHT_GAME, 0.6), Lc = Lt.color;
  const br = Math.sin(((t + who.phase) * 2 * Math.PI) / 3.8), hx = Math.sin((t + who.phase) * 0.83) * 1.1, hy = br * 1.0;
  const X = (x) => cx + (x + hx) * s, Y = (y) => cy + (y + hy) * s, T = (p) => [X(p[0]), Y(p[1])];
  const by = br * 2.3 - 12, B = (p) => [cx + p[0] * s, cy + (p[1] + by) * s];
  const sk = litRamp(who.skin, Lc, Lt.k), hr = litRamp(who.hair, Lc, Lt.k * 0.55), hd = litRamp(who.hoodie, Lc, Lt.k * 0.75), hs = litRamp(who.headset, Lc, Lt.k * 0.6);
  const lips = litRamp(who.skin.map((q) => mix(q, who.lip, who.lipK)), Lc, Lt.k), capR = litRamp(CAP, Lc, Lt.k * 0.6);
  const KEY = [0.92, -0.32], rimC = who.rimC ?? RIM_PURPLE, rim = { dir: [-1, -0.25], c: rimC, w: Math.max(1, R(2.6 * s)), edge: mix(rimC, "#FFFFFF", 0.3) };
  const rimS = { ...rim, w: Math.max(1, R(1.6 * s)) }, litEdge = mix(sk[7], Lc, 0.45);
  const L = (pts, d, f, k = 1, M = T) => shiftArea(c, [pts.map(M)], sk, d, f * s, k);

  // --- hoodie: hood bunched behind the neck, neck, torso, crossed collar, drawstrings
  shade(c, [[[-158, 214], [-148, 160], [-114, 124], [-62, 106], [0, 100], [62, 104], [112, 120], [148, 156], [160, 210], [152, 270], [-152, 270]].map(B)], { ramp: hd, base: 2.1, gain: 1.5, slope: 0.7, thick: 16 * s, light: KEY, rim, tilt: [0.7, 0], litOutline: hd[5] });
  soft(c, [[[-104, 150], [-62, 124], [0, 118], [62, 122], [104, 146], [62, 156], [0, 152], [-62, 158]].map(B)], hd[1], 5 * s, 1);
  const neck = [T([-46, 66]), T([54, 62]), B([56, 140]), B([60, 240]), B([-56, 240]), B([-52, 140])];
  shade(c, [neck], { ramp: sk, base: 3, gain: 0, slope: 0, rimLit: 0, rimShade: 0, thick: 4, light: KEY, rim, litOutline: litEdge });
  shiftArea(c, [[...JAW.map(T), ...JAW.slice().reverse().map(([x, y]) => T([x, y + 30 + 6 * Math.cos(x / 50)]))]], sk, -1, 6 * s);
  shiftArea(c, [[B([22, 124]), B([54, 108]), B([60, 240]), B([34, 240])]], sk, 1, 6 * s);
  shade(c, [[[-292, 640], [-288, 420], [-270, 300], [-238, 250], [-180, 214], [-120, 186], [-94, 172], [-74, 192], [-40, 210], [0, 218], [40, 208], [74, 188], [96, 168], [124, 182], [184, 212], [240, 248], [272, 298], [290, 420], [294, 640]].map(B)], { ramp: hd, base: 2.35, gain: 1.35, slope: 1.1, thick: 46 * s, light: KEY, rim, tilt: [0.95, -0.25], litOutline: hd[6], rimLit: 1, litW: 4 * s });
  for (const [pts, d, w] of [[[[-188, 290], [-202, 370], [-208, 470], [-206, 560]], -1, 7], [[[200, 300], [210, 380], [214, 470]], -1, 5], [[[-150, 330], [-96, 352], [-40, 356]], -1, 5], [[[60, 352], [112, 344], [150, 324]], 1, 6]]) shiftArea(c, [tube(spline(pts.map(B), 5), w * s)], hd, d, 2 * s, 0.9);
  for (const side of [-1, 1]) { const pts = spline([[side * 98, 178], [side * 146, 222], [side * 192, 290], [side * 226, 400]].map(B), 6); for (let i = 0; i + 1 < pts.length; i++) c.line(R(pts[i][0]), R(pts[i][1]), R(pts[i + 1][0]), R(pts[i + 1][1]), hd[2]); }
  const band = (pts, w0, w1, base) => shade(c, [tube(spline(pts.map(B), 5), w0 * s, w1 * s)], { ramp: hd, base, gain: 1.5, thick: 10 * s, light: KEY, rim, litOutline: hd[6], rimLit: 0.9 });
  band([[114, 140], [102, 172], [70, 200], [26, 220], [-12, 224]], 30, 22, 3.0);
  band([[-114, 144], [-96, 176], [-60, 202], [-12, 224], [28, 220]], 32, 22, 2.7);
  const sway = Math.sin(t * 1.3 + who.phase) * 2.2;
  for (const [ex, ey, dx, len] of [[-42, 200, -4, 112], [56, 192, 5, 100]]) {
    const ep = B([ex, ey]); shade(c, [ell(ep[0], ep[1], 5 * s, 5 * s, 12)], { ramp: ["#141220", "#5A566C", "#9894AE", "#D0CCE0", "#F0EEF8"], base: 2.6, gain: 1.5, thick: 2 * s, light: KEY });
    box(c, R(ep[0] - 1.5 * s), R(ep[1] - 1.5 * s), Math.max(1, R(3 * s)), Math.max(1, R(3 * s)), hd[0]);
    const cord = spline([[ex, ey], [ex + dx * 0.4 + sway * 0.3, ey + len * 0.5], [ex + dx + sway, ey + len]].map(B), 6);
    shade(c, [tube(cord, 5.4 * s, 5 * s)], { ramp: litRamp(["#2A2836", "#6A667E", "#A8A4BC", "#D4D0E2", "#EEECF6"], Lc, Lt.k * 0.6), base: 2.6, gain: 1.2, thick: 2 * s, light: KEY });
    const tip = cord[cord.length - 1];
    shade(c, [capsule([tip[0], tip[1]], [tip[0] + 0.4 * s, tip[1] + 16 * s], 3.6 * s, 3.2 * s)], { ramp: ["#1A1824", "#4A4658", "#7C7890", "#B0ACC4", "#E4E2EE"], base: 2.6, gain: 1.4, thick: 2 * s, light: KEY });
  }

  // --- far ear cup (behind the head), cap brim (enemy), curly volume
  shade(c, [ell(X(106), Y(10), 15 * s, 44 * s, 24)], { ramp: hs, base: 2.0, gain: 1.4, thick: 8 * s, light: KEY, rim: rimS });
  if (who.hairStyle === "cap") shade(c, [[[-94, -84], [-148, -104], [-166, -98], [-162, -80], [-104, -62]].map(T)], { ramp: capR, base: 2.0, gain: 1.2, thick: 8 * s, light: KEY, rim });

  // --- head: flat mid tone + outline/rim, then cel planes
  shade(c, [HEAD.map(T)], { ramp: sk, base: 4, gain: 0, slope: 0, rimLit: 0, rimShade: 0, thick: 4, light: KEY, rim, litOutline: litEdge });
  L(FACE_LIT, 1, 3); L(FACE_HOT, 1, 3); L(FACE_SHADOW, -1, 3); L(FACE_DEEP, -1, 2);
  L(ell(EYE_N.x, EYE_N.y - 8, 30, 18, 20), -1, 7, 0.85); L(ell(EYE_F.x, EYE_F.y - 8, 23, 17, 20), -1, 7, 0.75);
  L([[8, -10], [18, -8], [24, 18], [22, 34], [10, 38], [4, 24]], -1, 4);
  L([[19, -4], [25, -4], [31, 22], [27, 26]], 1, 1.5, 0.9);
  L([[12, 45], [42, 44], [36, 51], [16, 52]], -1, 3);
  L(ell(24, 91, 12, 5, 14), 1, 3, 0.8); L(ell(20, 82, 15, 3.4, 14), -1, 2.5, 0.85);
  if (E.knit > 0.05) for (const [x0, x1] of [[13, 12], [22, 23]]) soft(c, [tube(spline([[x0, -34], [(x0 + x1) / 2 + 1.5, -25], [x1, -16]].map(T), 3), 2 * s, 1.2 * s)], sk[3], 1.2, ss(0.2, 0.9, E.knit));
  if (E.cheek > 0.05) {
    soft(c, [tube(spline([[9, 42], [0, 54], [-8, 66]].map(T), 4), 2.4 * s, 1.2 * s)], sk[3], 1.2, E.cheek);
    soft(c, [tube(spline([[46, 42], [52, 52], [53, 62]].map(T), 4), 2.2 * s, 1.2 * s)], sk[3], 1.2, Math.max(E.cheek * (1 - E.mAsym), E.mAsym * 0.8));
    for (const e of [EYE_N, EYE_F]) soft(c, [tube(spline([[e.x - e.hw * e.f * 0.6, e.y + 17], [e.x, e.y + 19.5], [e.x + e.hw * e.f * 0.6, e.y + 17]].map(T), 4), 1.8 * s)], sk[3], 1.2, E.cheek * 0.8);
  }
  // nose: wings, nostrils (left one shows, right one barely), tip highlight
  soft(c, [tube(spline([[11, 33], [9, 40], [14, 45]].map(T), 4), 2.2 * s)], sk[2], 1, 1);
  soft(c, [tube(spline([[42, 35], [44, 40], [40, 44]].map(T), 4), 2 * s)], sk[4], 1, 1);
  soft(c, [ell(X(20), Y(43), 4.4 * s, 1.8 * s, 12)], sk[1], 1, 1);
  soft(c, [ell(X(36), Y(42.5), 2.2 * s, 1.2 * s, 10)], sk[2], 1, 1);
  soft(c, [ell(X(32), Y(29), 3 * s, 2.2 * s, 10)], sk[7], 1, 1);

  // --- eyes, mouth
  eyeCU(c, X, Y, s, EYE_N, E, sk, who.iris, Lc);
  eyeCU(c, X, Y, s, EYE_F, E, sk, who.iris, Lc);
  mouthCU(c, X, Y, s, E, sk, lips, Lc);

  // --- hair / cap / curls, then brows over the fringe edge so they always read
  if (who.hairStyle === "messy") hairMessyCU(c, T, s, hr, sk, KEY, rim);
  else if (who.hairStyle === "cap") capCU(c, T, X, Y, s, hr, capR, sk, KEY, rim);
  else hairCurlyCU(c, T, s, hr, sk, KEY, rim);
  browCU(c, T, s, EYE_N, E, 0, hr);
  browCU(c, T, s, EYE_F, E, E.browAsym, hr);
  if (who.glasses) glassesCU(c, T, X, Y, s, Lc, Lt.k);

  // --- headset: band, near cup, mic boom
  const bandP = spline([[-108, -36], [-106, -84], [-88, -124], [-56, -154], [-12, -170], [36, -164], [72, -140], [94, -106], [104, -64]].map(T), 5);
  shade(c, [tube(bandP, 18 * s, 16 * s)], { ramp: hs, base: 2.6, gain: 1.6, thick: 7 * s, light: KEY, rim, litOutline: hs[5] });
  shade(c, [tube(bandP.slice(2, -3), 7 * s, 6 * s, false)], { ramp: hs, base: 1.4, gain: 0.6, thick: 3 * s, light: KEY, outline: null });
  shade(c, [[[-114, -46], [-98, -46], [-96, -26], [-116, -26]].map(T)], { ramp: hs, base: 2.4, gain: 1.2, thick: 4 * s, light: KEY, rim });
  shade(c, [ell(X(-96), Y(12), 15 * s, 45 * s, 24)], { ramp: hs, base: 1.5, gain: 1.0, thick: 8 * s, light: KEY, rim });
  shade(c, [ell(X(-112), Y(12), 25 * s, 47 * s, 28)], { ramp: hs, base: 2.6, gain: 1.8, thick: 16 * s, light: KEY, rim, litOutline: hs[5] });
  c.ering(R(X(-114)), R(Y(12)), R(15 * s), R(32 * s), hs[1]);
  const ledOn = 0.75 + 0.25 * Math.sin(t * 2.4 + who.phase);
  glow(c, X(-128), Y(18), 18 * s, 18 * s, (i, j) => 0.5 * ledOn * (1 - Math.hypot(i - X(-119), j - Y(27)) / (8 * s)), who.led, 3);
  box(c, R(X(-121)), R(Y(25)), Math.max(1, R(4 * s)), Math.max(1, R(4 * s)), mix(who.led, "#FFFFFF", 0.3 * ledOn));
  const boom = spline([[-102, 40], [-94, 66], [-72, 82], [-42, 88]].map(T), 6);
  shade(c, [tube(boom, 6.5 * s, 5 * s)], { ramp: hs, base: 2.4, gain: 1.4, thick: 3 * s, light: KEY, litOutline: hs[5] });
  shade(c, [ell(X(-34), Y(88), 10 * s, 7.5 * s, 16)], { ramp: hs, base: 1.6, gain: 1.2, thick: 5 * s, light: KEY, rim, tex: (x, y) => ((x + y) & 1 ? 0.3 : -0.2) });

  // --- facepalm hand (over everything)
  handCU(c, cx + hx * s, cy + hy * s, s, st.facepalm ?? 0, sk, hd, KEY, rim);
  return { face: [X(20), Y(10)], eyes: [[X(EYE_N.x), Y(EYE_N.y)], [X(EYE_F.x), Y(EYE_F.y)]], mouth: [X(MOUTH.x), Y(MOUTH.y)] };
}

const HAIR_YOU = [[-96, -4], [-106, -40], [-124, -60], [-110, -80], [-136, -100], [-108, -112], [-122, -146], [-88, -140], [-92, -178], [-58, -160], [-48, -198], [-20, -168], [2, -208], [20, -172], [50, -200], [58, -166], [94, -176], [88, -142], [124, -134], [104, -110], [126, -86], [106, -68], [110, -26], [96, -50],
  [84, -40], [76, -66], [60, -50], [50, -78], [26, -24], [16, -72], [0, -48], [-12, -80], [-34, -40], [-46, -74], [-68, -54], [-80, -76], [-92, -28], [-98, -50]];
const CLUMPS = [[[-70, -150], [-72, -140], [-74, -128]], [[-32, -168], [-32, -152], [-30, -136]], [[10, -176], [10, -160], [10, -142]], [[40, -172], [38, -156], [36, -140]], [[74, -158], [72, -144], [68, -130]], [[104, -124], [100, -112], [96, -100]], [[-112, -110], [-108, -98], [-104, -86]]];
const BANGS = [[[72, -124], [84, -40], 30, 9], [[44, -132], [26, -24], 38, 13], [[8, -136], [0, -48], 34, 6], [[-26, -134], [-34, -40], 36, 7], [[-56, -126], [-68, -54], 32, 7], [[-84, -112], [-92, -28], 26, 5]];

function hairMessyCU(g, T, s, hr, sk, KEY, rim) {
  shiftArea(g, [[[-100, -36], [-92, -46], [-64, -40], [-32, -34], [2, -38], [32, -30], [62, -34], [88, -36], [106, -30], [106, -70], [0, -96], [-102, -74]].map(T)], sk, -1, 5 * s);
  const F = shade(g, [HAIR_YOU.map(T)], { ramp: hr, base: 2.4, gain: 1.0, slope: 0.7, thick: 10 * s, light: KEY, rim, tilt: [0.85, -0.55], litOutline: hr[4], rimLit: 0.9, litW: 3 * s });
  for (const [a, b, v] of CLUMPS) fill(g, tube(spline([a, b, v].map(T), 5), 1 * s, 3.4 * s), hr[0]);
  for (const [r, p, w, bend] of BANGS) {
    shade(g, [lock(r, p, w, bend, 10).map(T)], { ramp: hr, base: 2.5, gain: 1.3, slope: 0.9, thick: 8 * s, light: KEY, tilt: [0.5, -0.4], litOutline: hr[3], rimLit: 1, litW: 2.5 * s });
  }
  for (const [x, y, l, a] of [[20, -136, 22, 1.25], [42, -130, 20, 1.3], [60, -120, 18, 1.4], [80, -104, 14, 1.5], [-6, -138, 18, 1.2], [-30, -132, 14, 1.15], [-60, -122, 12, 1.1]]) {
    const p0 = T([x, y]), p1 = T([x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l]);
    fill(g, tube([p0, p1], 3.4 * s, 0.8 * s), hr[5]); g.px(R(p0[0]), R(p0[1]), hr[6]);
  }
  return F;
}
function capCU(g, T, X, Y, s, hr, capR, sk, KEY, rim) {
  shade(g, [[[-106, -64], [-110, -10], [-98, 12], [-88, -30], [-90, -60]].map(T)], { ramp: hr, base: 2.0, gain: 1.0, thick: 6 * s, light: KEY, rim });
  shade(g, [[[92, -66], [104, -40], [100, -24], [90, -48]].map(T)], { ramp: hr, base: 2.4, gain: 1.0, thick: 4 * s, light: KEY });
  shiftArea(g, [[[-98, -50], [0, -62], [100, -54], [100, -74], [0, -84], [-98, -72]].map(T)], sk, -1, 6 * s);
  const dome = [[-108, -54], [-114, -96], [-98, -130], [-62, -154], [-10, -164], [42, -158], [82, -136], [104, -100], [108, -60], [72, -68], [30, -72], [-12, -72], [-62, -66]];
  shade(g, [dome.map(T)], { ramp: capR, base: 2.4, gain: 2.0, slope: 0.6, thick: 40 * s, light: KEY, rim, tilt: [0.7, -0.2], litOutline: capR[5] });
  for (const bx of [-74, -26, 26, 74]) { const pts = spline([[-8, -160], [bx * 0.55 - 4, -128], [bx, -70]].map(T), 6); for (let i = 0; i + 1 < pts.length; i++) g.line(R(pts[i][0]), R(pts[i][1]), R(pts[i + 1][0]), R(pts[i + 1][1]), capR[1]); }
  shade(g, [ell(X(-8), Y(-160), 6 * s, 3.5 * s, 12)], { ramp: capR, base: 3, gain: 1, thick: 2 * s, light: KEY });
  shade(g, [tube(spline([[-108, -58], [-62, -68], [-12, -74], [30, -74], [72, -68], [108, -62]].map(T), 4), 6 * s)], { ramp: capR, base: 1.8, gain: 0.8, thick: 2 * s, light: KEY, outline: capR[0] });
  const arch = [[-8, -72], [-8, -88], [2, -98], [14, -101], [26, -98], [36, -88], [36, -72]];
  shade(g, [arch.map(T)], { ramp: hr, base: 1.8, gain: 0.8, thick: 6 * s, light: KEY, outline: capR[0] });
  shade(g, [[[-12, -82], [40, -82], [40, -72], [-12, -72]].map(T)], { ramp: capR, base: 2.6, gain: 1.0, thick: 2 * s, light: KEY, litOutline: capR[5] });
  for (const x of [-2, 10, 22, 32]) { const p = T([x, -77]); box(g, R(p[0]), R(p[1] - s), Math.max(1, R(2.4 * s)), Math.max(1, R(2.4 * s)), capR[6]); }
}
function hairCurlyCU(g, T, s, hr, sk, KEY, rim) {
  shiftArea(g, [[[-104, -40], [-60, -54], [0, -58], [60, -54], [104, -44], [104, -80], [0, -96], [-104, -80]].map(T)], sk, -1, 6 * s);
  const pts = [];
  for (let i = 0; i <= 72; i++) { const a = lerp(Math.PI * 0.92, Math.PI * 2.08, i / 72), b = 1 + 0.06 * Math.pow(Math.abs(Math.cos(a * 8)), 0.6); pts.push([Math.cos(a) * 124 * b, -86 + Math.sin(a) * 100 * b]); }
  for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([lerp(114, -118, u), -62 - 8 * Math.sin(u * Math.PI) + 8 * Math.pow(Math.abs(Math.sin(u * Math.PI * 7)), 0.7)]); }
  const F = shade(g, [pts.map(T)], { ramp: hr, base: 2.0, gain: 1.3, slope: 0.7, thick: 18 * s, light: KEY, rim, tilt: [0.75, -0.5], litOutline: hr[4], rimLit: 1, litW: 3 * s });
  if (!F) return;
  const inside = (x, y, m) => { const i = R(x) - F.x0, j = R(y) - F.y0; return i >= 0 && j >= 0 && i < F.W && j < F.H && F.m[j * F.W + i] && F.d[j * F.W + i] > m; };
  // tight-curl texture: rows of small scallops (dark under-arc, lit cap) like a pixel afro
  let n = 0;
  for (let gy = -196, row = 0; gy < -46; gy += 10, row++) for (let gx = -140; gx < 140; gx += 12) {
    n++; const x = gx + (row & 1) * 6 + (h1(n * 1.7) - 0.5) * 3, y = gy + (h1(n * 2.9) - 0.5) * 2.5, [px, py] = T([x, y]), r = (5 + h1(n * 5.3) * 1.2) * s;
    if (!inside(px, py, r + 2 * s)) continue;
    const lit = (px - (F.bb[0] + F.bb[2]) / 2) / ((F.bb[2] - F.bb[0]) / 2) * 0.8 - (py - F.bb[1]) / (F.bb[3] - F.bb[1]) * 1.2 + h1(n * 3.1) * 0.5;
    for (let q = 0; q <= 1; q += 0.05) { const a = 0.15 + q * 2.85; g.px(R(px + Math.cos(a) * r), R(py + Math.sin(a) * r * 0.7), hr[0]); }
    if (lit > -0.2) g.px(R(px - r * 0.2), R(py - r * 0.25), lit > 0.35 ? hr[6] : hr[4]);
    if (lit > 0.1 && s >= 1) g.px(R(px + r * 0.2), R(py - r * 0.3), hr[4]);
  }
}
function glassesCU(g, T, X, Y, s, Lc, k) {
  const frame = "#2C2638", hi = mix("#C8C0E0", Lc, 0.4);
  for (const [e, rx, ry] of [[EYE_N, 26, 22], [EYE_F, 20, 21]]) {
    const cxp = X(e.x + 1), cyp = Y(e.y + 3);
    glow(g, cxp - rx * s, cyp - ry * s, 2 * rx * s, 2 * ry * s, (i, j) => {
      const u = (i - cxp) / (rx * s), v = (j - cyp) / (ry * s); if (u * u + v * v > 0.86) return 0;
      const band = u * 0.8 - v * 0.6; return (band > 0.18 && band < 0.5 ? 0.45 : band > 0.58 && band < 0.68 ? 0.32 : 0.08) * (0.4 + 0.6 * k);
    }, Lc, 3);
    for (let w = 0; w < 4 * s; w += 0.5) g.ering(R(cxp), R(cyp), rx * s - w * 0.5 + 1.5, ry * s - w * 0.5 + 1.5, frame);
    g.ering(R(cxp), R(cyp), rx * s + 0.5, ry * s + 0.5, hi, -1.3, 0.3);
    g.ering(R(cxp), R(cyp), rx * s - 1.5 * s, ry * s - 1.5 * s, mix(frame, hi, 0.4), 2.0, 3.2);
  }
  const brg = spline([[EYE_N.x + 27, EYE_N.y - 4], [(EYE_N.x + EYE_F.x) / 2 + 4, EYE_N.y - 11], [EYE_F.x - 21, EYE_F.y - 4]].map(T), 4);
  fill(g, tube(brg, 3.5 * s), frame);
  fill(g, tube([T([EYE_N.x - 27, EYE_N.y - 6]), T([-100, -10])], 3.5 * s), frame);
}


// ================================================================= DESK SET (3/4 view, facing right)
// Local units = px at s = 1, origin = floor point under the chair, y up is negative. Head ≈ 22 units tall.
const HEAD_D = [[0, -9.6], [4.8, -8.9], [7.8, -6.3], [9.0, -3.2], [9.2, -1.0], [10.7, 1.5], [9.4, 2.7], [9.5, 4.3], [8.9, 5.5], [8.5, 7.0], [6.6, 8.7], [3.6, 9.5], [0.4, 9.1], [-3.2, 7.6], [-6.6, 5.0], [-8.8, 1.4], [-9.6, -2.6], [-8.6, -6.4], [-5.2, -9.0]];
const HAIR_DM = [[-9.0, 3.8], [-10.4, -0.8], [-11.8, -3.6], [-10.2, -5.6], [-12.4, -8.6], [-8.8, -9.4], [-8.8, -12.8], [-5.0, -10.9], [-3.6, -14.0], [-0.6, -11.3], [2.4, -13.8], [4.0, -10.8], [7.6, -12.2], [7.6, -9.4], [10.8, -8.8], [9.0, -6.8], [10.4, -4.2], [8.4, -5.4], [7.4, -2.8], [6.0, -5.2], [4.6, -2.6], [3.4, -5.1], [1.6, -3.4], [-0.4, -5.4], [-2.0, -2.8], [-4.2, -4.0], [-5.8, -0.6], [-7.4, 1.6]];
const CAP_D = [[-9.6, -3.2], [-9.9, -6.6], [-7.5, -9.7], [-2.8, -11.1], [2.4, -10.9], [6.5, -9.1], [8.7, -6.1], [8.9, -4.4], [5.6, -4.7], [1.6, -4.7], [-3.0, -4.3], [-6.6, -3.7]];
const GREY = ["#0E0D14", "#2A2836", "#4E4A60", "#7E7894", "#B4B0C8"];

function screenColor(kind, u, v, X, Y, t) {
  if (kind === "dead") {
    const band = Math.abs(v - 0.5) < 0.1, vig = Math.hypot(u - 0.5, (v - 0.5) * 1.2);
    return band ? (Math.abs(v - 0.5) < 0.085 ? "#B0182E" : "#7A0E20") : vig > 0.55 ? "#1E040A" : vig > 0.42 && bayer(X, Y) > 0.5 ? "#1E040A" : "#3A0812";
  }
  if (kind === "off") return (u * 0.6 - v * 0.8 > 0.05 && u * 0.6 - v * 0.8 < 0.12 && bayer(X, Y) > 0.6) ? "#1C1A28" : "#0A0910";
  // game: sky gradient, sand floor, a wall block, crosshair, HUD strip
  if (v > 0.9) return u < 0.26 && v > 0.93 && v < 0.97 ? "#6CE08A" : "#141A24";
  if (Math.abs(u - 0.5) < 0.012 && Math.abs(v - 0.46) < 0.06 || Math.abs(v - 0.46) < 0.018 && Math.abs(u - 0.5) < 0.04) return "#FDFEED";
  if (u > 0.58 && u < 0.84 && v > 0.3 && v < 0.62) return u > 0.79 ? "#8A6638" : v < 0.34 ? "#D8B47A" : "#B48C54";
  if (v > 0.58) { const k = (v - 0.58) / 0.32; return k > 0.5 && bayer(X, Y) < (k - 0.5) * 1.4 ? "#9A7442" : "#C8A062"; }
  const k = v / 0.58; return k * 3 % 1 > bayer(X, Y) ? mix("#4A78C8", "#BCD6FF", Math.ceil(k * 3) / 3) : mix("#4A78C8", "#BCD6FF", Math.floor(k * 3) / 3);
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
function flick(t, seed) {
  const step = 0.22, i = Math.floor(t / step), f = t / step - i, k = ss(0, 0.35, f);
  const a = [h1(i * 3.1 + seed) - 0.5, h1(i * 5.7 + seed) - 0.5], b = [h1((i + 1) * 3.1 + seed) - 0.5, h1((i + 1) * 5.7 + seed) - 0.5];
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
}

/** Small-scale face features (s < 3.4): pixel-snapped eyes, brows, mouth that stay readable at a few pixels. */
function faceSmall(g, ox, oy, s, E, sk, hr, lips, iris) {
  const Q = (u) => R(u * s), o = clamp(E.lidTop, 0, 1.4) * (1 - E.blink);
  for (const [ex, ey, ew0, far] of [[3.7, -0.5, 2.3, false], [8.0, -0.7, 1.2, true]]) {
    const ew = Math.max(far ? 1 : 2, R(ew0 * s)), full = Math.max(2, R(2.3 * s)), eh = clamp(R(full * o * (1 - 0.45 * E.lidBot)), 0, R(full * 1.3));
    const x0 = ox + R((ex - ew0 / 2) * s), by = oy + R((ey + 1.2) * s);
    if (eh > 0) {
      box(g, x0, by - eh, ew, eh, "#ECE8F2");
      const pw = Math.max(1, R(1.05 * s)), ph = Math.min(eh, Math.max(1, R(1.7 * s * E.pupil))), px0 = x0 + ew - pw - (ew > 3 ? R(0.25 * s) : 0), py0 = by - ph - R((eh - ph) * 0.4);
      box(g, px0, py0, pw, ph, s >= 2.2 ? iris[2] : INK);
      if (s >= 2.2) { box(g, px0 + R(pw * 0.3), py0 + R(ph * 0.3), Math.max(1, R(pw * 0.5)), Math.max(1, R(ph * 0.5)), "#06040A"); g.px(px0, py0, "#FFFFFF"); }
    }
    const lw = Math.max(1, R(0.55 * s)), ext = far ? 0 : Math.max(1, R(0.35 * s)), tilt = E.lidTilt > 0.45 ? 1 : 0;
    for (let k = 0; k < lw; k++) { const yy = (eh > 0 ? by - eh - 1 : by - 1) - k; g.line(x0 - ext, yy - (tilt ? 0 : 0), x0 + ew - 1, yy + tilt * Math.max(1, R(0.5 * s)), INK); }
    if (s >= 2.2 && eh > 0) g.line(x0, by, x0 + ew - 1, by, sk[3]);
  }
  // brows: tilt = anger (inner end down), browY raise, arch, smirk raises the far one
  const bw = Math.max(1, R(0.75 * s));
  for (const [xi, xo, far] of [[5.5 + 0.3 * E.browIn, 1.8, 0], [7.2 - 0.3 * E.browIn, 9.0, 1]]) {
    const yb = -3.4 + 1.45 * E.browY - far * E.browAsym * 1.3, yi = yb + 1.15 * E.browTilt, yo = yb - 0.4 * E.browTilt - 0.2, ym = (yi + yo) / 2 - 0.45 * E.browArch;
    const A = [ox + Q(xi), oy + Q(yi)], M = [ox + Q((xi + xo) / 2), oy + Q(ym)], B = [ox + Q(xo), oy + Q(yo)];
    for (let k = 0; k < bw; k++) { g.line(A[0], A[1] + k, M[0], M[1] + k, hr[1]); g.line(M[0], M[1] + k, B[0], B[1] + k, hr[1]); }
  }
  // nose shadow
  g.px(ox + Q(9.1), oy + Q(2.7), sk[2]);
  // mouth
  const wl = 2.0 * E.mWide * (1 - 0.45 * E.mRound), wr = 1.3 * E.mWide * (1 - 0.45 * E.mRound), mw = Math.max(2, R((wl + wr) * s)), mh = R(E.mOpen * 2.3 * s * (1 + 0.25 * E.mRound));
  const x0 = ox + R((6.6 - wl) * s), y0 = oy + R(5.3 * s), cl = R(E.mCurve * 0.75 * s), cr = R((E.mCurve * 0.75 + E.mAsym * 0.9) * s), lt = Math.max(1, R(0.45 * s));
  if (mh < 1) {
    const xm = x0 + R(mw * 0.55);
    for (let k = 0; k < lt; k++) { g.line(x0, y0 - cl + k, xm, y0 + k + (cl < 0 ? 0 : 0), lips[1]); g.line(xm, y0 + k, x0 + mw - 1, y0 - cr + k, lips[1]); }
    if (s >= 2.2) g.line(x0 + 1, y0 + lt, x0 + mw - 2, y0 + lt, lips[4]);
  } else {
    const top = y0 - Math.max(0, R(mh * 0.3)), dark = "#2A0A14", teeth = "#F0ECE4";
    if (E.mRound > 0.5 && mh >= 3) fill(g, ell(x0 + mw / 2, top + mh / 2, mw / 2 + 0.3, mh / 2 + 0.3, 12), dark); else box(g, x0, top, mw, mh, dark);
    if (E.mTeeth > 0.3) { const tt = Math.max(1, R(mh * 0.5 * E.mTeeth)); box(g, x0 + (mw > 3 ? 1 : 0), top, mw - (mw > 3 ? 2 : 0), Math.min(mh, tt), teeth); if (E.mTeeth > 0.8 && mh >= 3) box(g, x0 + 1, top + mh - tt + 1, mw - 2, tt - 1, mix(teeth, "#B0A8B0", 0.3)); }
    else if (mh >= 3) box(g, x0 + 1, top + mh - R(mh * 0.4), mw - 2, R(mh * 0.4), "#A84858");
    if (cl > 0) g.px(x0 - 1, top - 1, lips[1]); if (cr > 0) g.px(x0 + mw, top - 1, lips[1]); if (cl < 0) g.px(x0 - 1, top + mh, lips[1]); if (cr < 0) g.px(x0 + mw, top + mh, lips[1]);
    for (let k = 0; k < lt; k++) { g.line(x0, top - 1 - k, x0 + mw - 1, top - 1 - k, lips[1]); if (E.mTeeth > 0.8) g.line(x0, top + mh + k, x0 + mw - 1, top + mh + k, lips[1]); }
  }
}

/** Desk-view head: shaded skull, hair/cap/curls, headset, face (pixel features when small, close-up features when large). */
function headDesk(g, HC, s, who, E, sk, hr, hs, lips, capR, KEY, rim, Lc, Lk, t) {
  const ox = R(HC[0]), oy = R(HC[1]), H = (p) => [ox + p[0] * s, oy + p[1] * s];
  let curlF = null;
  const big = s >= 3.4, op = { light: KEY, rim, rimLit: 0.8, litW: Math.max(1, 0.4 * s), shadeW: Math.max(1, 0.5 * s) };
  if (who.hairStyle === "cap") shade(g, [[[-8.4, -6.4], [-14.2, -7.6], [-14.6, -5.6], [-9.0, -4.0]].map(H)], { ...op, ramp: capR, base: 2.0, gain: 1.0, thick: 1 * s });
  if (who.hairStyle === "curly") { // volume behind the head
    const pts = []; for (let i = 0; i <= 40; i++) { const a = lerp(Math.PI * 0.62, Math.PI * 2.14, i / 40), b = 1 + 0.07 * Math.pow(Math.abs(Math.cos(a * 6)), 0.6); pts.push([-0.8 + Math.cos(a) * 11.2 * b, -4.4 + Math.sin(a) * 8.8 * b]); }
    curlF = shade(g, [pts.map(H)], { ...op, ramp: hr, base: 2.0, gain: 1.2, thick: 2.2 * s, tilt: [0.7, -0.5], litOutline: hr[4] });
  }
  shade(g, [HEAD_D.map(H)], { ...op, ramp: sk, base: 3.2, gain: 1.6, slope: 0.6, thick: 4 * s, tilt: [1.2, -0.1], litOutline: mix(sk[7], Lc, 0.4) });
  shiftArea(g, [[[-9.6, 1], [-6, 6], [0, 9.4], [6, 9], [3, 7.2], [-2, 6], [-6, 2]].map(H)], sk, -1, 0.8 * s);
  // face
  let brows = null;
  if (big) {
    const sc = s / 11.8, Xf = (x) => ox + x * sc, Yf = (y) => oy + y * sc, Tf = (p) => [Xf(p[0]), Yf(p[1])];
    const eN = { x: 3.7 * 11.8, y: -0.6 * 11.8, hw: 18, f: 1, inner: 1 }, eF = { x: 8.0 * 11.8, y: -0.8 * 11.8, hw: 18, f: 0.5, inner: -1 };
    eyeCU(g, Xf, Yf, sc, eN, E, sk, who.iris, Lc); eyeCU(g, Xf, Yf, sc, eF, E, sk, who.iris, Lc);
    mouthCU(g, Xf, Yf, sc, E, sk, lips, Lc, { x: 6.6 * 11.8, y: 5.3 * 11.8, wl: 25, wr: 15 });
    soft(g, [ell(Xf(9.1 * 11.8), Yf(2.7 * 11.8), 3 * sc, 1.6 * sc, 10)], sk[2], 1, 1);
    brows = () => { browCU(g, Tf, sc, eN, E, 0, hr); browCU(g, Tf, sc, eF, E, E.browAsym, hr); };
  } else faceSmall(g, ox, oy, s, E, sk, hr, lips, who.iris);
  // hair / cap / curls (front parts)
  if (who.hairStyle === "messy") {
    shade(g, [HAIR_DM.map(H)], { ...op, ramp: hr, base: 2.3, gain: 1.3, slope: 0.6, thick: 2.2 * s, tilt: [0.8, -0.5], litOutline: hr[4] });
    if (s >= 1.8) for (const [a, b] of [[[1.2, -10], [2.0, -5.6]], [[4.6, -9.6], [6.0, -5.6]], [[-2.4, -9.6], [-1.2, -5.8]], [[-6.2, -9], [-6.4, -4.6]]]) fill(g, tube([H(a), H(b)], 0.25 * s, 0.6 * s), hr[0]);
    if (s >= 1.5) for (const [a, b] of [[[2.6, -10.4], [4.4, -8.6]], [[5.6, -9.6], [7.2, -7.8]], [[-0.4, -10.6], [1.4, -9.0]]]) fill(g, tube([H(a), H(b)], 0.55 * s, 0.2 * s), hr[5]);
  } else if (who.hairStyle === "cap") {
    shade(g, [[[-9.4, -3.6], [-9.9, 1.4], [-8.2, 3.8], [-5.6, 0.2], [-5.8, -3.4]].map(H)], { ...op, ramp: hr, base: 2.0, gain: 0.8, thick: 1 * s });
    shade(g, [CAP_D.map(H)], { ...op, ramp: capR, base: 2.4, gain: 1.8, slope: 0.6, thick: 3 * s, tilt: [0.8, -0.3], litOutline: capR[5] });
    if (s >= 1.6) { for (const [a, b] of [[[-0.4, -10.9], [-3.6, -4.4]], [[-0.4, -10.9], [3.0, -4.7]]]) fill(g, tube([H(a), H(b)], Math.max(1, 0.18 * s)), capR[1]); }
    fill(g, [[5.6, -4.7], [5.6, -6.4], [6.6, -7.2], [7.6, -6.4], [7.6, -4.6]].map(H), hr[1]);
    fill(g, tube([H([5.4, -5.2]), H([7.9, -5.1])], Math.max(1, 0.55 * s), Math.max(1, 0.55 * s), false), capR[4]);
  } else if (curlF) {
    const F = curlF; shade(g, [[[8.2, -5.0], [9.8, -7.4], [7.8, -11.2], [3, -13.2], [0, -8], [2.6, -5.2], [5.4, -3.8]].map(H)], { ...op, ramp: hr, base: 2.2, gain: 1.2, thick: 1.5 * s, litOutline: hr[4] });
    if (s < 4) { let n = 0; for (let gy = -14; gy < 0; gy += 1.3) for (let gx = -13; gx < 11; gx += 1.3) { n++; const [px, py] = H([gx + h1(n) * 0.8, gy + h1(n * 3) * 0.8]), i = R(px) - F.x0, j = R(py) - F.y0; if (i < 0 || j < 0 || i >= F.W || j >= F.H || !F.m[j * F.W + i] || F.d[j * F.W + i] < 1.2) continue; const v = h1(n * 7.1); if (v > 0.55) g.px(R(px), R(py), gx > -2 && gy < -6 ? hr[5] : hr[3]); else if (v < 0.25 && s >= 1.5) g.px(R(px), R(py), hr[0]); } }
    else { let n = 0; for (let gy = -14; gy < 0; gy += 1.0) for (let gx = -13; gx < 11; gx += 1.15) { n++; const [px, py] = H([gx + ((R(gy) & 1) * 0.55), gy]), i = R(px) - F.x0, j = R(py) - F.y0; if (i < 0 || j < 0 || i >= F.W || j >= F.H || !F.m[j * F.W + i] || F.d[j * F.W + i] < 0.6 * s) continue; const r = 0.42 * s; for (let q = 0; q <= 1; q += 0.12) { const a = 0.2 + q * 2.8; g.px(R(px + Math.cos(a) * r), R(py + Math.sin(a) * r * 0.7), hr[0]); } if (h1(n) > 0.4) g.px(R(px), R(py - r * 0.3), gx > 0 && gy < -6 ? hr[5] : hr[3]); } }
    
  }
  if (brows) brows();
  // glasses (friend)
  if (who.glasses) {
    const fr = "#2C2638", gl = mix("#C8C0E0", Lc, 0.4);
    for (const [cxu, rx] of [[3.8, 1.9], [8.2, 0.95]]) {
      const C = H([cxu, -0.2]);
      glow(g, C[0] - rx * s, C[1] - 1.7 * s, 2 * rx * s, 3.4 * s, (i, j) => { const u = (i - C[0]) / (rx * s), v = (j - C[1]) / (1.7 * s); return u * u + v * v < 0.8 && u * 0.8 - v * 0.6 > 0.15 && u * 0.8 - v * 0.6 < 0.5 ? 0.45 * (0.4 + 0.6 * Lk) : 0; }, Lc, 2);
      for (let w = 0; w < Math.max(1, 0.32 * s); w++) g.ering(R(C[0]), R(C[1]), rx * s + 0.5 - w, 1.7 * s + 0.5 - w, fr);
      if (s >= 2) g.ering(R(C[0]), R(C[1]), rx * s + 0.5, 1.7 * s + 0.5, gl, -1.4, 0.1);
    }
    fill(g, tube([H([5.7, -0.7]), H([7.25, -0.8])], Math.max(1, 0.3 * s)), fr);
    fill(g, tube([H([1.9, -0.6]), H([-2.0, -0.4])], Math.max(1, 0.3 * s)), fr);
  }
  // headset: band, near cup with LED, mic boom
  const band = spline([[-3.0, -2.6], [-3.8, -7.4], [-1.8, -11.6], [2.8, -12.6], [6.6, -10.6]].map(H), 4);
  shade(g, [tube(band, 1.5 * s, 1.3 * s)], { ...op, ramp: hs, base: 2.6, gain: 1.4, thick: 0.6 * s, litOutline: hs[5] });
  shade(g, [ell(ox - 2.1 * s, oy + 0.9 * s, 1.6 * s, 3.4 * s, 16)], { ...op, ramp: hs, base: 1.6, gain: 0.8, thick: 0.6 * s });
  shade(g, [ell(ox - 3.2 * s, oy + 0.9 * s, 2.6 * s, 3.6 * s, 18)], { ...op, ramp: hs, base: 2.6, gain: 1.6, thick: 1.4 * s, litOutline: hs[5] });
  if (s >= 2.5) g.ering(R(ox - 3.4 * s), R(oy + 0.9 * s), R(1.5 * s), R(2.4 * s), hs[1]);
  if (s >= 1.2) { const on = 0.75 + 0.25 * Math.sin(t * 2.4 + who.phase); box(g, R(ox - 4.4 * s), R(oy + 2.4 * s), Math.max(1, R(0.45 * s)), Math.max(1, R(0.45 * s)), mix(who.led, "#FFFFFF", 0.3 * on)); }
  const boom = spline([[-2.0, 3.6], [0.4, 6.2], [3.6, 7.2], [5.0, 7.0]].map(H), 4);
  shade(g, [tube(boom, Math.max(1, 0.55 * s), Math.max(1, 0.45 * s))], { ...op, ramp: hs, base: 2.4, gain: 1.2, thick: 0.3 * s, rim: null });
  shade(g, [ell(ox + 5.2 * s, oy + 7.0 * s, Math.max(1, 0.8 * s), Math.max(1, 0.65 * s), 10)], { ...op, ramp: hs, base: 1.8, gain: 1, thick: 0.4 * s });
}

export function drawDesk(c, x, y, s = 1, st = {}) {
  const who = WHO[st.who] ?? WHO.you, t = st.t ?? 0, E = exprAt(st, who.phase), scr = st.screen ?? { kind: "game", k: 1 }, sk0 = clamp(scr.k ?? 1);
  const Lt = lightOf(st, scr.kind === "dead" ? LIGHT_DEAD : LIGHT_GAME, scr.kind === "off" ? 0.08 : 0.08 + 0.5 * sk0), Lc = Lt.color;
  // below the seat the set is compressed (shorter shins, lower chair) so the seated figure reads stocky, not stilted
  const P = (p) => [x + p[0] * s, y + (p[1] < -38 ? p[1] + 10.64 : p[1] * 0.72) * s];
  const lean = ss(0, 1, st.lean ?? 0), mouse = clamp(st.mouse ?? 0), palm = ss(0, 1, st.facepalm ?? 0), thr = ss(0, 1, st.throwArm ?? 0);
  const sk = litRamp(who.skin, Lc, Lt.k), hr = litRamp(who.hair, Lc, Lt.k * 0.55), hd = litRamp(who.hoodie, Lc, Lt.k * 0.75), hs = litRamp(who.headset, Lc, Lt.k * 0.6);
  const lips = litRamp(who.skin.map((q) => mix(q, who.lip, who.lipK)), Lc, Lt.k), capR = litRamp(CAP, Lc, Lt.k * 0.6), jn = litRamp(JEANS, Lc, Lt.k * 0.5), chR = litRamp(CHAIR, Lc, Lt.k * 0.4), dk = litRamp(DESK, Lc, Lt.k * 0.45);
  const KEY = [1, -0.3], rim = { dir: [-1, -0.08], c: RIM_PURPLE, w: clamp(R(0.7 * s), 1, 4), edge: mix(RIM_PURPLE, "#FFFFFF", 0.25) };
  const op = { light: KEY, rim, rimLit: 0.8, litW: Math.max(1, 0.5 * s), shadeW: Math.max(1, 0.6 * s) };
  const part = (pts, o, g = c) => shade(g, [pts.map(P)], { ...op, ...o, thick: (o.thick ?? 2) * s });
  const br = Math.sin(((t + who.phase) * 2 * Math.PI) / 3.6);

  // --- chair back (behind the gamer), base, lift
  part([[-10.5, -38], [-13, -60], [-15.5, -84], [-17.2, -101], [-14.6, -106.8], [-8.4, -107.6], [-5.8, -103], [-6.4, -92], [-5, -80], [-3.6, -60], [-4.4, -40]], { ramp: chR, base: 2.4, gain: 1.4, thick: 3, tilt: [0.6, 0] });
  fill(c, tube(spline([[-12.2, -44], [-14.2, -72], [-15.6, -99]].map(P), 4), Math.max(1, 1.5 * s)), who.accent[1]);
  if (s >= 1.4) fill(c, tube(spline([[-12.8, -44], [-14.8, -72], [-16.2, -99]].map(P), 4), Math.max(1, 0.5 * s)), who.accent[0]);
  part(ell(-11, -97.5, 3.2, 2.6, 14), { ramp: chR, base: 3, gain: 1.2, thick: 1.2 });
  for (const [ex, ey] of [[-16, -3.6], [15, -3.6], [-7, -2.2], [8, -1.8]]) part(tube([[0, -5.6], [ex, ey]], 1.8, 1.4), { ramp: chR, base: 2.4, gain: 1, thick: 0.6 });
  for (const ex of [-16.4, 15.4, -7.4, 8.4]) part(ell(ex, -1.6, 1.6, 1.6, 10), { ramp: chR, base: 1.6, gain: 1, thick: 0.6, rim: null });
  part([[-1.2, -32], [1.2, -32], [1.2, -5.6], [-1.2, -5.6]], { ramp: GREY, base: 2.2, gain: 1.4, thick: 0.6 });
  part([[-2.1, -14], [2.1, -14], [2.4, -5.4], [-2.4, -5.4]], { ramp: chR, base: 2.2, gain: 1, thick: 0.8 });

  // --- desk: back legs, top, front, LED strip, legs
  for (const lx of [19, 123]) part([[lx, -53], [lx + 2, -53], [lx + 2, -6], [lx, -6]], { ramp: dk, base: 1.6, gain: 0.6, thick: 0.6, rim: null });
  fill(c, [[12, -61], [132, -61], [132, -53], [12, -53]].map(P), (X, Y) => { const v = (Y - P([0, -61])[1]) / (8 * s); return v < 0.3 ? dk[2] : v < 0.38 && bayer(X, Y) < 0.5 ? dk[2] : dk[3]; });
  box(c, R(P([12, -61])[0]), R(P([0, -61])[1]), R(120 * s), Math.max(1, R(0.4 * s)), dk[1]);
  part([[12, -53], [132, -53], [132, -50.4], [12, -50.4]], { ramp: dk, base: 1.6, gain: 0.4, thick: 0.4, rim: null, litOutline: dk[5] });
  { const a = P([13, -50.2]), w = 118 * s; for (let X = Math.max(0, R(a[0])); X < Math.min(c.w ?? 540, R(a[0] + w)); X++) { const col = rgbAt(t * 0.12 + (X - a[0]) / w * 0.8); c.px(X, R(a[1]), col); } glow(c, a[0], a[1] + 1, w, 7 * s, (i, j) => 0.4 * (1 - (j - a[1]) / (7 * s)), rgbAt(t * 0.12 + 0.3), 3); }
  for (const lx of [13, 128.6]) part([[lx, -50.4], [lx + 2.4, -50.4], [lx + 2.4, 0], [lx, 0]], { ramp: dk, base: 2.2, gain: 0.8, thick: 0.6 });
  // desk mat, keyboard, mouse pad, soda can
  fill(c, [[13, -60.4], [52, -60.4], [51, -53.6], [12.4, -53.6]].map(P), "#0E0B16");
  fill(c, tube([P([12.6, -53.9]), P([51, -53.9])], Math.max(1, 0.4 * s), Math.max(1, 0.4 * s), false), rgbAt(t * 0.12 + 0.6));
  const kb = [[16.4, -59.8], [32.6, -59.8], [30.2, -56.0], [13.8, -56.0]];
  fill(c, tube([P([14, -55.9]), P([30.2, -55.9])], Math.max(1, 0.9 * s), Math.max(1, 0.9 * s), false), "#08060E");
  fill(c, kb.map(P), (X, Y) => { const a = P([0, -59.8])[1], b = P([0, -56])[1], v = (Y - a) / (b - a), xl = lerp(P(kb[0])[0], P(kb[3])[0], v), xr = lerp(P(kb[1])[0], P(kb[2])[0], v), u = (X - xl) / (xr - xl); if (s < 1.6) return "#2A2638"; const cu = (u * 14) % 1, cv = (v * 4) % 1; return cu < 0.2 || cv < 0.22 ? mix("#100E18", rgbAt(t * 0.12 + u * 0.5), 0.45) : "#3A3650"; });
  fill(c, [[23, -56.8], [46, -56.8], [44.6, -53.7], [21.6, -53.7]].map(P), "#141120");
  const fl = flick(t, who.phase * 10), mpos = [34.5 + fl[0] * 5 * mouse, -55.4 + fl[1] * 1.2 * mouse];
  part(ell(mpos[0], mpos[1], 2.2, 1.15, 12), { ramp: ["#06050A", "#141220", "#24202E", "#3A3448", "#585070"], base: 2.2, gain: 1.6, thick: 0.6 });
  if (s >= 1.4) box(c, R(P(mpos)[0] - 0.3 * s), R(P(mpos)[1] - 0.2 * s), Math.max(1, R(0.6 * s)), Math.max(1, R(0.3 * s)), rgbAt(t * 0.2 + 0.4));
  part([[50.6, -66.2], [54, -66.2], [54, -61.2], [50.6, -61.2]], { ramp: litRamp(["#0C0A14", mix(who.can[0], "#0C0A14", 0.5), who.can[0], mix(who.can[0], who.can[1], 0.5), who.can[1]], Lc, Lt.k * 0.5), base: 2.2, gain: 1.2, thick: 0.8 });
  if (s >= 1.4) { box(c, R(P([50.8, -66.7])[0]), R(P([0, -66.7])[1]), R(3 * s), Math.max(1, R(0.6 * s)), GREY[3]); box(c, R(P([50.6, -64.2])[0]), R(P([0, -64.2])[1]), R(3.4 * s), Math.max(1, R(0.6 * s)), mix(who.can[1], "#FDFEED", 0.5)); }

  // --- monitor: stand, frame, screen (skewed quad, right edge nearer and taller), glow on the desk
  part(ell(80, -60.3, 7, 1.4, 14), { ramp: GREY, base: 1.4, gain: 0.8, thick: 0.6, rim: null });
  part([[78.2, -70], [82, -70], [82.6, -60.6], [78.6, -60.6]], { ramp: GREY, base: 1.6, gain: 0.8, thick: 0.6, rim: null });
  const SQ = [[60, -97], [92, -101.6], [92, -65.4], [60, -70]], FQ = [[58.6, -98.6], [93.4, -103.4], [93.4, -63.8], [58.6, -68.6]];
  shade(c, [FQ.map(P)], { ...op, ramp: ["#05040A", "#0C0A14", "#16131F", "#221E2E", "#2E2940"], base: 1.6, gain: 0.6, thick: 0.6 * s, litOutline: "#3E3854", rim: null });
  const sq = SQ.map(P), kind = scr.kind ?? "game";
  if (typeof st.screenFill === "function") st.screenFill(sq);
  else quadFill(c, sq, (u, v, X, Y) => (sk0 >= 1 || sk0 > bayer(X, Y) ? screenColor(kind, u, v, X, Y, t) : screenColor("off", u, v, X, Y, t)));
  if (!st.screenFill && kind === "dead" && sk0 > 0.3) { const w = c.measure(TINY, "YOU DIED"), sc = P([76, -83.6]); if ((sq[1][0] - sq[0][0]) > w + 6) c.text(TINY, "YOU DIED", R(sc[0] - w / 2), R(sc[1] - 2), "#FDFEED"); }
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
  glow(c, P([94, 0])[0], P([0, -64])[1], 40 * s, 10 * s, (i, j) => 0.35 * Math.max(0, 1 - Math.hypot((i - P([114, 0])[0]) / (18 * s), (j - P([0, -60])[1]) / (4 * s))), rgbAt(t * 0.15 + 0.1), 3);

  // --- gamer body: torso frame tilts forward with lean
  const a = 0.2 + 0.34 * lean + br * 0.006, up = [Math.sin(a), -Math.cos(a)], rt = [Math.cos(a), Math.sin(a)], Hp = [1, -41];
  const TP = ([tx, ty]) => [Hp[0] + rt[0] * tx + up[0] * ty, Hp[1] + rt[1] * tx + up[1] * ty];
  const Sf = TP([3.6, 27.4]), Sn = TP([0.4, 26.8]), HC = TP([3.2 + 1.6 * lean, 41.6 + br * 0.15]);
  // far arm to the keyboard (typing), or up to the face (facepalm)
  const typ = Math.abs(Math.sin(t * 15 + who.phase)) * 0.6 * mouse, kbT = [22.5 + Math.sin(t * 3.1) * 0.6 * mouse, -59.4 - typ], faceT = [HC[0] + 6.4, HC[1] + 0.4];
  const farT = [lerp(kbT[0], faceT[0], palm), lerp(kbT[1], faceT[1], palm)], FA = ik(Sf, farT, 16.5, 16.5, true);
  const drawArm = (S, A, sleeveDark, g = c) => {
    part(capsule(S, A.E, 2.9, 2.6), { ramp: hd, base: sleeveDark ? 1.9 : 2.6, gain: 1.3, thick: 1.4 }, g);
    part(capsule(A.E, A.W, 2.6, 2.2), { ramp: hd, base: sleeveDark ? 2.0 : 2.8, gain: 1.3, thick: 1.2 }, g);
    const dx = A.W[0] - A.E[0], dy = A.W[1] - A.E[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux, side = ux >= 0 ? 1 : -1;
    const HP = ([a2, b2]) => [A.W[0] + ux * a2 + nx * b2 * side, A.W[1] + uy * a2 + ny * b2 * side];
    part([[-0.2, -1.15], [1.3, -1.5], [2.0, -2.5], [2.7, -2.2], [2.8, -1.4], [3.6, -1.2], [4.2, -0.5], [4.3, 0.4], [3.7, 1.15], [2.0, 1.45], [-0.2, 1.2]].map(HP), { ramp: sk, base: 3.4, gain: 1.2, thick: 0.9, litOutline: mix(sk[7], Lc, 0.3) }, g);
    if (s >= 3) for (const b2 of [-0.45, 0.35]) { const p0 = P(HP([2.9, b2])), p1 = P(HP([4.0, b2 * 0.8])); g.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), sk[3]); }
    return HP([2.4, 0]);
  };
  // the far arm passes from behind the torso to in front of the face: a dither crossfade of draw order (no pop)
  const front = ss(0.18, 0.42, palm);
  if (front < 1) drawArm(Sf, FA, true, fade(c, 1 - front));
  // legs (far leg first) on the seat
  const legs = (dx, dy, base) => {
    const hip = [Hp[0] + dx, Hp[1] + dy], K = [25 + dx, -43 + dy], A = [26.4 + dx, -5 + dy * 0.2];
    part(capsule(hip, K, 4.4, 3.7), { ramp: jn, base, gain: 1.3, thick: 1.6 });
    part(capsule(K, A, 3.1, 2.5), { ramp: jn, base: base - 0.2, gain: 1.2, thick: 1.2 });
    part([[A[0] - 3.2, -6.2], [A[0] + 5.4, -5.6], [A[0] + 7.6, -2.6], [A[0] + 7.6, 0], [A[0] - 3.6, 0]], { ramp: SHOE, base: 1.4, gain: 1, thick: 0.6, litOutline: SHOE[2] });
    box(c, R(P([A[0] - 3.6, 0])[0]), R(P([0, -0.9])[1]), R(11.2 * s), Math.max(1, R(0.9 * s)), SHOE[3]);
  };
  part([[-15, -38.5], [15, -39.5], [17.5, -37.5], [17, -32.5], [-13.5, -32], [-16, -34.5]], { ramp: chR, base: 2.4, gain: 1.3, thick: 2 });
  fill(c, tube([P([-14, -34.6]), P([16.4, -35])], Math.max(1, 0.5 * s), Math.max(1, 0.5 * s), false), who.accent[1]);
  legs(1.6, -1.4, 1.9);
  legs(0, 0, 2.6);
  // torso (hoodie), hood lump, drawstrings, pocket
  part([[-9.6, 23.5], [-11.2, 29.4], [-9, 34], [-3.8, 33.8], [-2, 30]].map(TP), { ramp: hd, base: 2.0, gain: 1.2, thick: 1.4 });
  part([[-8.6, -1], [-9.5, 10], [-9.1, 21], [-7.2, 28.6], [-2.6, 31.6], [4.2, 31.2], [8.2, 27.2], [9.7, 18], [9.3, 8], [8.7, -1]].map(TP), { ramp: hd, base: 2.6, gain: 1.5, slope: 0.6, thick: 4, tilt: [0.9, -0.2], litOutline: hd[6] });
  if (s >= 1.8) {
    for (const dx of [5.4, 7.2]) fill(c, tube([P(TP([dx, 28.4])), P(TP([dx + 0.3 + br * 0.1, 20.4]))], Math.max(1, 0.45 * s)), "#D8D4E6");
    fill(c, tube([P(TP([1, 7])), P(TP([8.6, 8.4]))], Math.max(1, 0.35 * s), Math.max(1, 0.35 * s), false), hd[2]);
  }
  // neck + head
  part([TP([-0.6, 30]), TP([4.4, 30.4]), [HC[0] + 2.8, HC[1] + 7.6], [HC[0] - 2, HC[1] + 7.2]], { ramp: sk, base: 2.4, gain: 0.6, thick: 1 });
  headDesk(c, P(HC), s, who, E, sk, hr, hs, lips, capR, KEY, rim, Lc, Lt.k, t);
  let farHand = null;
  if (front > 0) farHand = drawArm(Sf, FA, false, fade(c, front));
  // near armrest, then the near arm: mouse hand, or raised throwing a paper plane
  part([[2.6, -38], [4.6, -38], [4.6, -49.4], [2.6, -49.4]], { ramp: chR, base: 2, gain: 0.8, thick: 0.6 });
  part(tube([[-5, -50.6], [12.4, -50.6]], 2.4, 2.4), { ramp: chR, base: 2.6, gain: 1.2, thick: 0.8 });
  const throwT = [HC[0] + 13, HC[1] - 21], nearT = [lerp(mpos[0] - 1.6, throwT[0], thr), lerp(mpos[1] - 1.3, throwT[1], thr)], NA0 = ik(Sn, nearT, 16.5, 16.5, true);
  // raising to throw: the elbow swings up behind the head so the arm clears the face (continuous blend, no IK flip)
  const NA = { E: [lerp(NA0.E[0], HC[0] - 6.5, thr), lerp(NA0.E[1], HC[1] + 0.5, thr)], W: thr > 0 ? nearT : NA0.W };
  const hand = drawArm(Sn, NA, false);
  if (thr > 0.02) {
    const k = ss(0.05, 0.45, thr) * (st.planeHeld ?? 1), pl = [hand[0] + 0.6, hand[1] - 2.2], ang = lerp(0.3, -0.35, thr), Rt = ([u, v]) => [pl[0] + u * Math.cos(ang) - v * Math.sin(ang), pl[1] + u * Math.sin(ang) + v * Math.cos(ang)];
    soft(c, [[[-5, 0.8], [7, -1.6], [-3.4, -1.2]].map(Rt).map(P)], "#FDFEED", 0.5, k);
    soft(c, [[[-5, 0.8], [7, -1.6], [-2.2, 2.2]].map(Rt).map(P)], "#C8C2E0", 0.5, k);
    if (s >= 1.5) soft(c, [tube([P(Rt([-5, 0.8])), P(Rt([7, -1.6]))], Math.max(1, 0.3 * s))], "#8C86A8", 0.5, k);
  }
  return { face: P([HC[0] + 4, HC[1]]), screenQuad: sq, screenCenter: P([76, -83.5]), pcPort: P([126, -90]), hand: P(hand), farHand: farHand ? P(farHand) : null, deskTop: P([0, -53])[1], head: P(HC) };
}

// ================================================================= OVER-THE-SHOULDER OPENING
// World units: the monitor SCREEN is x ∈ [-80, 80], y ∈ [-45, 45] (y down) at depth k = 0. Every other object has a depth
// k = Δ / F (Δ = distance in front of the screen plane, F = focal length): a true dolly with a fixed physical camera at
// OTS_CAM and a lens shift that frames (cam.cx, cam.cy). Scale at depth k is z / (1 - k·z); for k = 0 this is exactly the
// lead's mapping (270 + (wx - cx)·z, 480 + (wy - cy)·z), so the bezel stays locked to the screen rect at every z, while the
// gamer (k ≈ 0.15) and the desk front (k ≈ 0.12) grow faster, slide down/left and leave the frame by z ≈ 5.
const OTS_CAM = [-5, -60];
export function otsScreenRect(cam) { return { x: 270 + (-80 - cam.cx) * cam.z, y: 480 + (-45 - cam.cy) * cam.z, w: 160 * cam.z, h: 90 * cam.z }; }

export function drawOTS(c, cam, st = {}, screenFill = null) {
  const { cx, cy, z } = cam, [px, py] = OTS_CAM, t = st.t ?? 0, who = WHO[st.who ?? "you"] ?? WHO.you, mouse = clamp(st.mouse ?? 0);
  const Wc = c.w ?? 540, Hc = c.h ?? 960, Lc = st.light?.color ?? LIGHT_GAME, Lk = st.light?.k ?? 0.6;
  const S = (k) => z / (1 - k * z), vis = (k) => 1 - k * z > 0.05;
  const A = (wx, wy, k = 0) => { const s = S(k); return [270 + s * (wx - px) - z * (cx - px), 480 + s * (wy - py) - z * (cy - py)]; };
  const kAtY = (Y, wy) => { const s = (Y - 480 + z * (cy - py)) / (wy - py); return s > 0 ? (1 - z / s) / z : -9; };
  const kAtX = (X, wx) => { const s = (X - 270 + z * (cx - px)) / (wx - px); return s > 0 ? (1 - z / s) / z : -9; };
  const kNear = (0.95 / z), clampK = (k) => Math.min(k, kNear);
  const rgb = (p) => hex(rgbAt(p));
  // horizontal plane at height wy between depths k0..k1 and wx0..wx1; fn(wx, k, X, Y) → colour
  const plane = (wy, k0, k1, wx0, wx1, fn) => {
    k1 = clampK(k1); if (k1 <= k0) return;
    const ya = A(0, wy, k0)[1], yb = A(0, wy, k1)[1], y0 = Math.max(0, Math.ceil(Math.min(ya, yb))), y1 = Math.min(Hc, Math.ceil(Math.max(ya, yb)));
    for (let Y = y0; Y < y1; Y++) { const k = kAtY(Y + 0.5, wy); if (k < k0 || k > k1) continue; const s = S(k), xa = Math.max(0, Math.ceil(A(wx0, wy, k)[0])), xb = Math.min(Wc, Math.ceil(A(wx1, wy, k)[0])); for (let X = xa; X < xb; X++) { const col = fn(px + (X + 0.5 - 270 + z * (cx - px)) / s, k, X, Y); if (col) put(X, Y, col); } }
  };
  // vertical side plane x = wx (facing -x) between depths k0..k1 and heights wy0..wy1; fn(k, wy, X, Y)
  const side = (wx, k0, k1, wy0, wy1, fn) => {
    k1 = clampK(k1); if (k1 <= k0) return;
    const xa = A(wx, 0, k0)[0], xb = A(wx, 0, k1)[0], x0 = Math.max(0, Math.ceil(Math.min(xa, xb))), x1 = Math.min(Wc, Math.ceil(Math.max(xa, xb)));
    for (let X = x0; X < x1; X++) { const k = kAtX(X + 0.5, wx); if (k < k0 || k > k1) continue; const s = S(k), ya = Math.max(0, Math.ceil(A(wx, wy0, k)[1])), yb = Math.min(Hc, Math.ceil(A(wx, wy1, k)[1])); for (let Y = ya; Y < yb; Y++) { const col = fn(k, py + (Y + 0.5 - 480 + z * (cy - py)) / s, X, Y); if (col) put(X, Y, col); } }
  };
  const quad = (pts, col) => fill(c, pts.map(([x, y, k]) => A(x, y, k)), col);
  const own = Object.prototype.hasOwnProperty.call(c, "px") || !c.d, D = c.d;
  const put = own ? (X, Y, col) => c.px(X, Y, col) : (X, Y, col) => { const q = typeof col === "string" ? hex(col) : col, i = (Y * Wc + X) * 3; D[i] = q[0]; D[i + 1] = q[1]; D[i + 2] = q[2]; };

  // --- 1. wall with the bias-light halo around the monitor (fast direct pass)
  { const KW = -0.075, sw = S(KW), m0 = A(-86, -50, KW), m1 = A(86, 54, KW), T0 = hex("#0E0918"), T1 = hex("#1E1630"), Pu = hex("#7A56C8"), Cy = hex("#3FB8D8"), d = c.d, wallEnd = Math.min(Hc, Math.ceil(A(0, 85, -0.075)[1]) + 1);
    for (let Y = 0; Y < wallEnd; Y++) {
      const v = clamp((Y - m0[1] + 220) / (Hc + 120)), dy = Y < m0[1] ? m0[1] - Y : Y > m1[1] ? Y - m1[1] : 0;
      for (let X = 0; X < Wc; X++) {
        const b = bayer(X, Y), vq = Math.floor(v * 5 + b) / 5, dx = X < m0[0] ? m0[0] - X : X > m1[0] ? X - m1[0] : 0;
        const dd = (dx + dy === 0 ? 0 : Math.sqrt(dx * dx + dy * dy)) / sw, gk = Math.max(0, 1 - dd / 80), q = Math.floor((0.62 * gk * gk) * 5 + b) / 5;
        const u = clamp((X - m0[0]) / (m1[0] - m0[0])), r0 = T0[0] + (T1[0] - T0[0]) * vq, g0 = T0[1] + (T1[1] - T0[1]) * vq, b0 = T0[2] + (T1[2] - T0[2]) * vq;
        const rg = Pu[0] + (Cy[0] - Pu[0]) * u, gg = Pu[1] + (Cy[1] - Pu[1]) * u, bg = Pu[2] + (Cy[2] - Pu[2]) * u;
        const qq = q * 0.55, cr = R(r0 + (rg - r0) * qq), cg = R(g0 + (gg - g0) * qq), cb = R(b0 + (bg - b0) * qq);
        if (!own && d) { const i = (Y * Wc + X) * 3; d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; } else c.px(X, Y, [cr, cg, cb]);
      }
    }
  }
  // --- 2. poster and shelf on the wall (abstract art, no text or logos)
  { const KP = -0.074, p0 = A(-150, -150, KP), p1 = A(-92, -72, KP);
    if (p1[0] > 0 && p0[0] < Wc && p1[1] > 0 && p0[1] < Hc) {
      box(c, p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1], "#2E2446");
      const f = Math.max(1, R(2.5 * S(KP))), q0 = [p0[0] + f, p0[1] + f], q1 = [p1[0] - f, p1[1] - f], cxp = lerp(q0[0], q1[0], 0.42), cyp = lerp(q0[1], q1[1], 0.42), rr = (q1[0] - q0[0]) * 0.3;
      fill(c, [[q0[0], q0[1]], [q1[0], q0[1]], [q1[0], q1[1]], [q0[0], q1[1]]], (X, Y) => { const v = (Y - q0[1]) / (q1[1] - q0[1]), dd = Math.hypot(X - cxp, Y - cyp); if (dd < rr) return dd < rr * 0.8 && (X - cxp) * 0.6 - (Y - cyp) > rr * 0.15 ? "#3B2C5C" : (Y - cyp) > rr * 0.25 && bayer(X, Y) > 0.5 ? "#3B2C5C" : "#6E4FB0"; if (Math.abs((Y - cyp) - (X - cxp) * 0.25) < Math.max(1, rr * 0.06) && dd < rr * 1.6) return "#B08AE8"; if (v > 0.8) return v > 0.86 ? "#E03056" : "#F4CA50"; return h1(R(X / 3) * 7.1 + R(Y / 3) * 3.3) > 0.985 ? "#FDFEED" : "#140E24"; });
    }
    const KS = -0.072, s0 = A(40, -103, KS), s1 = A(160, -99, KS);
    if (s0[0] < Wc && s1[1] > 0) {
      let x = 44; for (const [w, h, col] of [[6, 22, "#3B2C5C"], [7, 26, "#6E4FB0"], [5, 20, "#2A5092"], [8, 24, "#7A2440"], [6, 18, "#3B2C5C"], [10, 6, "#B08AE8"]]) { quad([[x, -103, KS], [x + w, -103, KS], [x + w, -103 - h, KS], [x, -103 - h, KS]], col); if (h > 10) quad([[x + 1.4, -103 - h * 0.7, KS], [x + w - 1.4, -103 - h * 0.7, KS], [x + w - 1.4, -103 - h * 0.62, KS], [x + 1.4, -103 - h * 0.62, KS]], "#F4CA50"); x += w + 0.8; }
      quad([[102, -103, KS], [114, -103, KS], [112, -114, KS], [104, -114, KS]], "#5A3A2A");
      for (const [dx, a] of [[-6, -2.1], [-2, -1.7], [3, -1.3], [7, -1.0]]) quad([[108, -114, KS], [108 + Math.cos(a) * 14 + dx * 0.2, -114 + Math.sin(a) * 14, KS], [108 + Math.cos(a) * 14 + dx * 0.2 + 3, -114 + Math.sin(a) * 14 + 2, KS]], "#2E6A3C");
      quad([[124, -103, KS], [134, -103, KS], [133, -117, KS], [125, -117, KS]], "#2E2840"); quad([[125.5, -117, KS], [132.5, -117, KS], [132.5, -125, KS], [125.5, -125, KS]], "#3E3654"); quad([[127, -122, KS], [129, -122, KS], [129, -120.5, KS], [127, -120.5, KS]], "#4FD8F0");
      box(c, s0[0], s0[1], s1[0] - s0[0], s1[1] - s0[1], "#3B2C5C"); box(c, s0[0], s0[1], s1[0] - s0[0], Math.max(1, R(S(KS) * 0.8)), "#6E4FB0");
    }
  }
  // --- 3. desk top: monitor light pool, PC RGB spill, back-edge LED strip
  const DY = 85, KF = 0.118, KB = -0.075, lit = hex(Lc), pcCol = rgb(t * 0.15 + 0.3);
  const deskCache = new Map(), DR = ["#140F20", "#1A1428", "#211A32"];
  plane(DY, KB, KF, -420, 420, (wx, k, X, Y) => {
    const b = bayer(X, Y), mon = Math.exp(-((wx / 95) ** 2) - (((k - 0.01) / 0.06) ** 2)) * Lk, pc = Math.exp(-(((wx - 110) / 45) ** 2) - (((k + 0.03) / 0.04) ** 2)) * 0.7, led = Math.exp(-((k - KB) / 0.008)) * 0.8;
    const base = k < 0.02 ? (k < -0.02 ? 0 : 1) : 2, q1 = Math.floor(mon * 4 + b), q2 = Math.floor(pc * 3 + b), q3 = Math.floor(led * 3 + b), lb = q3 > 0 ? (Math.floor(wx / 12) & 63) : 0;
    const key = base | (q1 << 2) | (q2 << 6) | (q3 << 9) | (lb << 12); let col = deskCache.get(key);
    if (!col) { col = hex(DR[base]); if (q3 > 0) col = mix(col, rgbAt(t * 0.12 + lb * 12 / 300), (q3 / 3) * 0.6); if (q2 > 0) col = mix(col, pcCol, (q2 / 3) * 0.35); if (q1 > 0) col = mix(col, lit, (q1 / 4) * 0.22); deskCache.set(key, col); }
    return col;
  });
  // --- 4. desk lamp (off), left back
  if (vis(-0.03)) { const K = -0.032, rimL = mix("#4A4460", Lc, 0.3);
    fill(c, ell(...A(-142, 84, K), 16 * S(K), 3 * S(K), 16), "#16131F");
    fill(c, tube([A(-142, 82, K), A(-152, 18, K)], 3.4 * S(K)), "#1C1828"); fill(c, tube([A(-152, 18, K), A(-124, -14, K)], 3 * S(K)), "#1C1828");
    fill(c, [A(-130, -20, K), A(-104, -8, K), A(-110, 4, K), A(-128, -2, K)], "#221E30"); fill(c, tube([A(-130, -20, K), A(-104, -8, K)], 1.2 * S(K)), rimL);
    fill(c, tube([A(-152, 18, K), A(-124, -14, K)], Math.max(1, 0.8 * S(K))), rimL);
  }
  // --- 5. PC tower right of the monitor: glass side panel (facing the camera) with RGB fans, mesh front
  if (vis(0)) {
    const TX = 90, k0 = -0.07, k1 = -0.006, top = -36, bot = DY;
    side(TX, k0, k1, top, bot, (k, wy, X, Y) => { const u = (k - k0) / (k1 - k0), v = (wy - top) / (bot - top); if (u < 0.04 || u > 0.96 || v < 0.02 || v > 0.98) return "#2A2438"; for (let i = 0; i < 3; i++) { const fy = 0.2 + i * 0.27, du = (u - 0.78) / 0.16, dv = (v - fy) / 0.12, r = Math.hypot(du, dv); if (r < 1 && r > 0.72) return rgbAt(t * 0.15 + i * 0.12); if (r <= 0.72) return r < 0.25 ? "#1A1626" : (Math.atan2(dv, du) * 5 / Math.PI + t * 6) % 2 < 1 ? "#141020" : "#0C0A14"; } if (v > 0.6 && v < 0.66 && u < 0.7) return v < 0.61 ? rgbAt(t * 0.15 + 0.5) : "#2A2438"; return (u * 0.9 - v * 0.5 > 0.1 && u * 0.9 - v * 0.5 < 0.16) ? "#2E2A40" : "#0B0912"; });
    quad([[TX, top, k1], [TX + 52, top, k1], [TX + 52, bot, k1], [TX, bot, k1]], (X, Y) => ((X + Y) & 1) && ((X >> 1) & 1) ? "#16131F" : "#0C0A12");
    quad([[TX, top, k0], [TX + 52, top, k0], [TX + 52, top, k1], [TX, top, k1]], "#1E1A2A");
    const g0 = A(TX, (top + bot) / 2, (k0 + k1) / 2); glow(c, g0[0] - 60 * S(0), g0[1] - 70 * S(0), 120 * S(0), 140 * S(0), (i, j) => 0.3 * Math.max(0, 1 - Math.hypot(i - g0[0], (j - g0[1]) * 0.6) / (55 * S(0))), pcCol, 3);
  }
  // --- 6. monitor stand, top edge, bezel, screen, glare
  quad([[-34, DY, -0.06], [34, DY, -0.06], [26, DY, -0.002], [-26, DY, -0.002]], "#1A1724");
  quad([[-9, 44, -0.03], [9, 44, -0.03], [9, DY, -0.03], [-9, DY, -0.03]], (X, Y) => (X & 3) === 0 ? "#2A2638" : "#1E1A2A");
  quad([[-83.5, -48.5, -0.02], [83.5, -48.5, -0.02], [83.5, -48.5, 0], [-83.5, -48.5, 0]], "#221E2E");
  { const o = A(-83.5, -48.5), i0 = A(-80, -45), i1 = A(80, 45), o1 = A(83.5, 51.5), edge = mix("#3E3854", Lc, 0.2);
    box(c, o[0], o[1], o1[0] - o[0], i0[1] - o[1], "#0C0A12"); box(c, o[0], i1[1], o1[0] - o[0], o1[1] - i1[1], "#0E0C15"); box(c, o[0], i0[1], i0[0] - o[0], i1[1] - i0[1], "#0C0A12"); box(c, i1[0], i0[1], o1[0] - i1[0], i1[1] - i0[1], "#0C0A12");
    box(c, o[0], o[1], o1[0] - o[0], Math.max(1, R(0.5 * z)), edge); const led = A(72, 48.4); box(c, led[0], led[1], Math.max(1, R(1.2 * z)), Math.max(1, R(0.8 * z)), "#4FC8FF"); }
  const rect = otsScreenRect(cam), clip = { x0: Math.max(0, Math.floor(rect.x)), y0: Math.max(0, Math.floor(rect.y)), x1: Math.min(Wc, Math.ceil(rect.x + rect.w)), y1: Math.min(Hc, Math.ceil(rect.y + rect.h)) };
  if (screenFill && clip.x1 > clip.x0 && clip.y1 > clip.y0) screenFill(rect, clip);
  if (z < 5 && clip.x1 > clip.x0) { const ga = 0.24 * clamp((5 - z) / 2.6); glow(c, clip.x0, clip.y0, clip.x1 - clip.x0, clip.y1 - clip.y0, (X, Y) => { const wx = cx + (X - 270) / z, wy = cy + (Y - 480) / z, b = wx * 0.55 + wy * 0.85 + 26; return ga * (Math.exp(-((b / 13) ** 2)) + 0.5 * Math.exp(-(((b + 40) / 5) ** 2)) + 0.35 * clamp(-(wx + wy + 60) / 80)); }, "#FFFFFF", 4); }
  // --- 7. keyboard, mouse pad, mouse
  const fl = flick(t, 3.3), mx = 62 + fl[0] * 6 * mouse, mk = 0.108 + fl[1] * 0.002 * mouse;
  if (vis(0.11)) {
    plane(81.5, 0.074, 0.104, -112, 26, (wx, k, X, Y) => { const u = (wx + 112) / 138, v = (k - 0.074) / 0.03, cu = (u * 18) % 1, cv = (v * 5) % 1; return cu < 0.16 || cv < 0.2 ? mix("#0C0A14", rgbAt(t * 0.12 + u * 0.6), 0.5) : v > 0.85 ? "#2A2638" : "#363048"; });
    quad([[-112, 81.5, 0.104], [26, 81.5, 0.104], [26, DY, 0.104], [-112, DY, 0.104]], "#0E0C16");
    plane(DY - 0.2, 0.07, 0.112, 34, 112, (wx, k, X, Y) => (k > 0.109 ? rgbAt(t * 0.12 + wx / 200) : "#100D1A"));
    const m = A(mx, 82.5, mk), sm = S(mk); fill(c, ell(m[0], m[1], 5.5 * sm, 3.6 * sm, 16), "#14111E"); box(c, m[0] - sm, m[1] - 2.6 * sm, Math.max(1, 2 * sm), Math.max(1, 0.8 * sm), rgbAt(t * 0.2 + 0.4));
  }
  // --- 8. desk front edge + RGB strip under it + darkness below
  if (vis(KF)) {
    const e0 = A(0, DY, KF), e1 = A(0, 92, KF), kf = S(KF);
    box(c, 0, e1[1], Wc, Hc - e1[1], "#07050C");
    box(c, 0, e0[1], Wc, e1[1] - e0[1], "#120E1C"); box(c, 0, e0[1], Wc, Math.max(1, R(0.5 * kf)), mix("#3E3458", Lc, 0.25));
    const sy = e1[1]; for (let X = 0; X < Wc; X++) { const wx = px + (X - 270 + z * (cx - px)) / kf, col = rgbAt(t * 0.12 + wx / 300); box(c, X, sy, 1, Math.max(1, R(0.7 * kf)), col); }
    glow(c, 0, sy + 1, Wc, 26 * kf, (i, j) => 0.45 * (1 - (j - sy) / (26 * kf)), rgbAt(t * 0.12 + 0.2), 3);
  }
  // --- 9. the gamer: right arm on the mouse, back (hoodie + hood), head with headset (backlit by the monitor)
  const KH = 0.15, KT = 0.155;
  if (vis(KT)) {
    const hd = litRamp(who.hoodie, Lc, Lk * 0.5), sk = litRamp(who.skin, Lc, Lk), hr = litRamp(who.hair, Lc, Lk * 0.4), hs = litRamp(who.headset, Lc, Lk * 0.4);
    const sT = S(KT), sH = S(KH), br = Math.sin((t * 2 * Math.PI) / 3.8) * 0.8, sw = Math.sin(t * 0.8) * 0.8;
    const rimM = { dir: [1, 0.15], c: RIM_MAGENTA, w: clamp(R(1.2 * sT), 1, 5), edge: mix(RIM_MAGENTA, "#FFFFFF", 0.3) }, edgeL = mix(Lc, "#FFFFFF", 0.35);
    const a3 = (p) => A(p[0], p[1], p[2]);
    const op = { light: [0.25, -1], rim: rimM, litOutline: edgeL, rimLit: 1.3, rimShade: 0.6, litW: clamp(2 * sT * 0.5, 1, 4), shadeW: 3, mg: 10 };
    // arm: shoulder → elbow (hanging in front of the desk edge) → wrist on the desk → hand on the mouse
    // both forearms rest low on the desk: elbows on the front edge beside his body, forearms lying almost flat,
    // right hand on the mouse (lower right), left hand on the keyboard (typing bob); the upper arms hang from the shoulders
    const G = 12, typ = Math.abs(Math.sin(t * 13 + 1.1)) * 1.2 * mouse;
    const arm = (SH, EL, WR, HN) => {
      soft(c, [tube([a3([EL[0], 86, EL[2]]), a3([WR[0], 85.5, WR[2]])], 15 * S(EL[2]), 11 * S(WR[2]))], "#08060E", 3, 0.7);
      shade(c, [tube([a3(SH), a3(EL)], 22 * S(SH[2]), 20 * S(EL[2]))], { ...op, ramp: hd, base: 1.8, gain: 1.0, thick: Math.min(30, 9 * sT) });
      shade(c, [tube([a3(EL), a3(WR)], 19 * S(EL[2]), 15 * S(WR[2]))], { ...op, ramp: hd, base: 2.0, gain: 1.0, thick: Math.min(24, 7 * sT) });
      const w = a3(WR), h = a3(HN), dx = h[0] - w[0], dy = h[1] - w[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, sh = S(HN[2]) * 2.6;
      const HP = ([u, v]) => [w[0] + ux * u * sh - uy * v * sh, w[1] + uy * u * sh + ux * v * sh];
      shade(c, [[[-0.4, -1.4], [1.6, -1.8], [3.2, -1.5], [4.2, -0.6], [4.3, 0.6], [3.4, 1.5], [1.6, 1.8], [-0.4, 1.5]].map(HP)], { ...op, ramp: sk, base: 2.6, gain: 1.2, thick: Math.min(12, 1.4 * sh), litOutline: mix(sk[7], Lc, 0.4) });
      for (const v of [-0.7, 0, 0.7]) { const p0 = HP([3.0, v]), p1 = HP([4.0, v * 0.9]); c.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), sk[2]); }
    };
    arm([-104, 100 + br + G, KT], [-114, 92, 0.135], [-86, 84.5 - typ * 0.4, 0.113], [-76, 82.5 - typ, 0.109]);
    arm([18, 102 + br + G, KT], [28, 92, 0.135], [mx - 9, 84, mk + 0.004], [mx, 82, mk]);
    // torso back, hood lying on it
    shade(c, [[[-170, 420], [-170, 122], [-150, 98], [-112, 84], [-80, 76], [-60, 70], [-32, 70], [-10, 78], [8, 85], [26, 93], [36, 114], [36, 420]].map(([x, y]) => A(x, y + br + G, KT))], { ...op, ramp: hd, base: 1.7, gain: 1.1, slope: 0.8, thick: Math.min(40, 30 * sT) });
    const hood = [[-94, 78], [-74, 70], [-46, 66], [-18, 70], [2, 80], [-2, 108], [-20, 138], [-46, 152], [-70, 142], [-90, 112]].map(([x, y]) => A(x, y + br + G, KT - 0.002));
    shade(c, [hood], { ...op, ramp: hd, base: 2.0, gain: 1.3, slope: 0.6, thick: Math.min(30, 16 * sT) });
    soft(c, [[[-84, 80], [-46, 72], [-6, 82], [-28, 94], [-62, 92]].map(([x, y]) => A(x, y + br + G, KT - 0.003))], hd[1], 3, 1);
    // head (back view), slightly turned to the screen centre
    const HC = [-47 + sw, 35 + G + br * 0.6], Hp = ([x, y]) => A(HC[0] + x * 0.93, HC[1] + y * 0.93, KH);
    shade(c, [[[-14, 22], [14, 22], [16, 48], [-16, 48]].map(Hp)], { ...op, ramp: sk, base: 1.6, gain: 0.6, thick: Math.min(16, 6 * sH), rim: rimM });
    shade(c, [[[22, 4], [31, 6], [32, 20], [27, 30], [18, 33], [20, 18]].map(Hp)], { ...op, ramp: sk, base: 3.4, gain: 1.0, thick: Math.min(10, 3 * sH), tilt: [0.8, -0.4] });
    const HB = [[-31, 10], [-34, -8], [-38, -22], [-28, -27], [-31, -40], [-18, -37], [-15, -48], [-4, -41], [4, -50], [10, -41], [21, -46], [22, -35], [33, -36], [30, -23], [37, -13], [32, -2], [33, 10], [28, 22], [22, 30], [14, 35], [8, 28], [0, 37], [-6, 28], [-14, 35], [-18, 26], [-26, 22]];
    shade(c, [HB.map(Hp)], { ...op, ramp: hr, base: 1.9, gain: 1.4, slope: 0.6, thick: Math.min(24, 9 * sH), tilt: [0.3, -0.6], litOutline: edgeL, rimLit: 1.6 });
    for (const [a, b] of [[[-20, -30], [-15, 2]], [[0, -36], [1, 0]], [[16, -32], [13, 4]], [[-30, -12], [-24, 10]], [[-8, -10], [-6, 26]], [[10, -6], [8, 26]]]) fill(c, tube([Hp(a), Hp(b)], Math.max(1, 0.4 * sH), Math.max(1, 1.2 * sH)), hr[1]);
    // headset from behind: band over the crown, right cup (we look over his right shoulder), a sliver of the left cup with the LED
    shade(c, [ell(...Hp([-31, 6]), 5 * sH, 13 * sH, 16)], { ...op, ramp: hs, base: 1.8, gain: 0.8, thick: Math.min(8, 2 * sH) });
    { const l = Hp([-34, 10]); box(c, R(l[0]), R(l[1]), Math.max(1, R(1.4 * sH)), Math.max(1, R(1.4 * sH)), who.led); }
    shade(c, [tube(spline([[-30, -2], [-28, -26], [-13, -43], [6, -45], [23, -33], [31, -4]].map(Hp), 5), 6.5 * sH)], { ...op, ramp: hs, base: 2.2, gain: 1.2, thick: Math.min(8, 2 * sH) });
    shade(c, [ell(...Hp([32, 6]), 8 * sH, 15 * sH, 20)], { ...op, ramp: hs, base: 2.2, gain: 1.4, thick: Math.min(12, 4 * sH) });
    { const cc = Hp([33, 6]); c.ering(R(cc[0]), R(cc[1]), Math.max(1, R(4.5 * sH)), Math.max(1, R(10 * sH)), hs[1]); }
  }
  return { screen: rect, head: A(-47, 47, KH) };
}
