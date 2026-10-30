// «Infinite aura» · builder C (creatures) — shared kit for pigeons / dinos / moonface / ufo.
// World anchoring (things hang around the camera centre while the world runs and stay put in the world when τ freezes),
// a volume-shading part renderer (flat tone bands + Bayer dither + dark selective outline, like shade.mjs), laser beams,
// deterministic sparks, sea-coloured cloud puffs and the time-stop grey for things drawn in front of him.
// Pure functions of their arguments; no Math.random, no wall clock.
import { mix, bayer, fade, hex } from "../../../../renderer/pixel/raster.mjs";
import { clamp01, sm, lerp, rnd, RUN, RISE, GW, GH } from "./layout.mjs";
import { stairQ, STOP } from "./timeline.mjs";
import { climbAt } from "./guy.mjs";

export const R = Math.round, PI = Math.PI;
export { mix, bayer, fade, hex, clamp01, sm, lerp, rnd, GW, GH };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOut = (x) => { x = clamp01(x); return 1 - Math.pow(1 - x, 3); };
/** ease-out with a small overshoot (cartoon snap), 0 → 1. */
export const backOut = (x, s = 1.7) => { x = clamp01(x) - 1; return 1 + x * x * ((s + 1) * x + s); };
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
export const pulse = (t, a, up, hold, down) => Math.min(sm(t, a, a + up), 1 - sm(t, a + up + hold, a + up + hold + down));

// ---------------------------------------------------------------- world anchoring
// render.mjs camera(): the camera centre follows a smoothed stair progress. We evaluate it at world time τ: before the
// time stop τ = t, so the anchor is exactly the camera centre (the flock hangs around him); when τ freezes the anchor
// stays in the world and he walks on (the frozen flock slides back on screen).
const qCache = new Map();
export function camQ(t) {
  const key = Math.round(t * 1e4); let v = qCache.get(key); if (v !== undefined) return v;
  let s = 0; for (let k = -3; k <= 3; k++) s += stairQ(Math.max(0, t + k * 0.1)) + (t + k * 0.1 < 0 ? (t + k * 0.1) * 1.6 : 0);
  v = s / 7; if (qCache.size > 4000) qCache.clear(); qCache.set(key, v); return v;
}
export const camW = (t) => { const q = camQ(t); return [q * RUN + 10, -(q - 0.5) * RISE - 70]; };
/**
 * Screen point of something that hangs at screen offset (ox, oy) from the camera centre (sx, sy) at zoom zRef, on a
 * layer of depth p (1 = his plane, 0.5 = behind the stairs). Freezes in the world with τ.
 */
export function anchor(X, ox, oy, p = 1, zRef = 1.6) {
  const cam = X.cam, z = 1 + (cam.z - 1) * p, [wx, wy] = camW(X.T), s = z / (1 + (zRef - 1) * p);
  return [cam.sx + (wx - cam.cx) * p * z + ox * s, cam.sy + (wy - cam.cy) * p * z + oy * s];
}
/** How far (screen px) the frozen world has slid since τ stopped, on layer depth p (0 before the stop). */
export function slide(X, p = 1) { const cam = X.cam, z = 1 + (cam.z - 1) * p, [wx, wy] = camW(X.T); return [(wx - cam.cx) * p * z, (wy - cam.cy) * p * z]; }

/**
 * His head on screen. X.hero exists only from the near slot on, so sky/sea slots estimate it from his stair progress
 * (head = stair root + (10.6, −114.2) world units, fitted with dev/C-headfit.mjs, within ≈2.5 units). When the world
 * freezes the gaze of frozen things holds still: the target blends to where his head was when τ stopped.
 */
export function heroHead(X) {
  const at = (t) => { const w = climbAt(stairQ(t)), G = X.G; return [G.X(w.wx + 10.6), G.Y(w.wy - 114.2)]; };
  const now = X.hero ? X.hero.head : at(X.t); if (X.frozen <= 0) return now;
  const was = at(STOP.a);                       // the world point where his head was when τ stopped, on today's screen
  return [lerp(now[0], was[0], X.frozen), lerp(now[1], was[1], X.frozen)];
}

// ---------------------------------------------------------------- time-stop grey for things drawn after him (front slot)
/** A view of c that greys colours inside the lead's time-stop wave (same formula as render.mjs timeStop). */
export function greyView(c, X) {
  const t = X.t, k = sm(t, STOP.a, STOP.a + 0.55), out = 1 - X.space;
  if (k <= 0 || out <= 0 || !X.hero) return c;
  const r = 30 + 900 * Math.pow(k, 1.6), [cx, cy] = X.hero.chest, o = Object.create(c);
  o.px = (x, y, col) => {
    if (!col) return; x = Math.floor(x); y = Math.floor(y);
    if (Math.hypot(x - cx, y - cy) > r || (out < 1 && out <= bayer(x, y))) return c.px(x, y, col);
    const [rr, gg, bb] = hex(col), l = 0.3 * rr + 0.59 * gg + 0.11 * bb, g = 0.82;
    c.px(x, y, [R(lerp(rr, l * 0.78 * g + 18, 0.92)), R(lerp(gg, l * 0.86 * g + 22, 0.92)), R(lerp(bb, l * 1.05 * g + 40, 0.92))]);
  };
  return o;
}

// ---------------------------------------------------------------- volume-shaded parts
const SCR = { m: new Uint8Array(0), d: new Float32Array(0) };
/**
 * Fill the union of polygons with pillow shading quantised to a ramp (flat bands, dither only in the transition),
 * dark selective outline (lit side optionally lighter). o.rampAt(X, Y) → ramp overrides the ramp per pixel (patterns,
 * iridescence); o.tone(X, Y, u, v) → Δ tone; o.clip(X, Y) → false skips a pixel; o.a dissolves.
 */
export function part(g, polys, o) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (!(x1 > x0) || !(y1 > y0)) return;
  x0 = Math.floor(x0) - 2; y0 = Math.floor(y0) - 2; x1 = Math.ceil(x1) + 2; y1 = Math.ceil(y1) + 2;
  if (x1 < 0 || y1 < 0 || x0 >= GW || y0 >= GH) return;
  const W = x1 - x0, H = y1 - y0, N = W * H; if (N > 3e6) return;
  if (SCR.m.length < N) { SCR.m = new Uint8Array(N * 2); SCR.d = new Float32Array(N * 2); }
  const m = SCR.m, d = SCR.d; m.fill(0, 0, N);
  for (const poly of polys) {
    const n = poly.length;
    for (let y = 0; y < H; y++) {
      const yc = y0 + y + 0.5, xs = [];
      for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
      if (xs.length < 2) continue; xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const e = Math.min(W, Math.round(xs[k + 1]) - x0); for (let x = Math.max(0, Math.round(xs[k]) - x0); x < e; x++) m[y * W + x] = 1; }
    }
  }
  const { ramp, base = 3.3, gain = 1.6, slope = 1.0, thick = 10, light = [-0.6, -0.8], rimLit = 0.8, rimShade = 0.8, outline = ramp[0], litOutline = null, rampAt = null, tone = null, clip = null, a = 1, noOutline = false } = o;
  for (let i = 0; i < N; i++) d[i] = m[i] ? 1e9 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 1.414); } d[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x < W - 1) v = Math.min(v, d[i + 1] + 1); if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + W - 1] + 1.414); } d[i] = v; }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]);
  const ln = Math.hypot(light[0], light[1]) || 1, ux = light[0] / ln, uy = light[1] / ln;
  const lx3 = R(ux * 3), ly3 = R(uy * 3), sx4 = R(-ux * 4), sy4 = R(-uy * 4), lx1 = R(ux * 1.5), ly1 = R(uy * 1.5);
  for (let y = 0; y < H; y++) {
    const Y = y0 + y; if (Y < 0 || Y >= GH) continue;
    for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!m[i]) continue;
      const X = x0 + x; if (X < 0 || X >= GW) continue;
      if (a < 1 && a <= bayer(X, Y)) continue;
      if (clip && !clip(X, Y)) continue;
      const rp = rampAt ? rampAt(X, Y) || ramp : ramp;
      if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) { if (!noOutline) { g.px(X, Y, litOutline && !at(x + lx1, y + ly1) ? litOutline : outline); continue; } }
      let v = base + gain * Math.pow(Math.min(1, d[i] / thick), 0.6) - slope * (y / H);
      if (!at(x + lx3, y + ly3)) v += rimLit;
      if (!at(x + sx4, y + sy4)) v -= rimShade;
      if (tone) v += tone(X, Y, x / W, y / H);
      const fl = Math.floor(v), f = v - fl, q = f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl;
      g.px(X, Y, rp[Math.max(1, Math.min(rp.length - 1, q))]);
    }
  }
}

// ---------------------------------------------------------------- geometry
export const rot = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
export function ell(cx, cy, rx, ry, a = 0, n = 0) {
  n = n || Math.max(14, Math.ceil((rx + ry) * 1.3)); const out = [], c = Math.cos(a), s = Math.sin(a);
  for (let i = 0; i < n; i++) { const t = (2 * PI * i) / n, x = Math.cos(t) * rx, y = Math.sin(t) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}
/** Smooth closed outline (Catmull-Rom) through control points. */
export function smooth(pts, seg = 4) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < seg; k++) { const t = k / seg, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  return out;
}
/** Tapered tube along a polyline (r0 → r1) with a round end cap. */
export function tube(pts, r0, r1) {
  const L = [], Rr = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], dd = Math.hypot(dx, dy) || 1, r = lerp(r0, r1, i / (n - 1));
    L.push([pts[i][0] - (dy / dd) * r, pts[i][1] + (dx / dd) * r]); Rr.push([pts[i][0] + (dy / dd) * r, pts[i][1] - (dx / dd) * r]);
  }
  const tip = pts[n - 1], a = pts[n - 2], ang = Math.atan2(tip[1] - a[1], tip[0] - a[0]), cap = [];
  for (let k = 1; k < 6; k++) { const t = ang - PI / 2 + (PI * k) / 6; cap.push([tip[0] + Math.cos(t) * r1, tip[1] + Math.sin(t) * r1]); }
  return [...L, ...cap.reverse(), ...Rr.reverse()];
}
export function bez(p0, p1, p2, n = 12) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } return out; }
export const bez1 = (p0, p1, p2, t) => { const u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; };

// ---------------------------------------------------------------- small drawing helpers
/** Filled ellipse with a 1-px outline; col may be a function (X, Y) → colour. */
export function oval(g, cx, cy, rx, ry, col, outline = null) {
  for (let Y = Math.floor(cy - ry - 1); Y <= Math.ceil(cy + ry + 1); Y++) for (let X = Math.floor(cx - rx - 1); X <= Math.ceil(cx + rx + 1); X++) {
    const dx = (X + 0.5 - cx) / rx, dy = (Y + 0.5 - cy) / ry, dd = dx * dx + dy * dy; if (dd > 1) continue;
    if (outline) { const ex = (X + 0.5 - cx) / Math.max(0.5, rx - 1), ey = (Y + 0.5 - cy) / Math.max(0.5, ry - 1); if (ex * ex + ey * ey > 1) { g.px(X, Y, outline); continue; } }
    g.px(X, Y, typeof col === "function" ? col(X, Y, dx, dy) : col);
  }
}
/** Thick pixel line (square brush). */
export function thick(g, x0, y0, x1, y1, w, col) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))), h = (w - 1) / 2;
  for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), y = lerp(y0, y1, i / n); g.rect(R(x - h), R(y - h), w, w, col); }
}

// ---------------------------------------------------------------- laser beams
const LZ = { glow: "#7A0614", red: "#E8162E", hot: "#FF5A5A", core: "#FFF0F0" };
/** Where a ray from (x, y) along (dx, dy) leaves the frame, or hits the horizontal surface y = floorY first. */
export function rayEnd(x, y, dx, dy, floorY = Infinity) {
  let t = 1e9;
  if (dx > 1e-6) t = Math.min(t, (GW + 8 - x) / dx); if (dx < -1e-6) t = Math.min(t, (-8 - x) / dx);
  if (dy < -1e-6) t = Math.min(t, (-8 - y) / dy);
  let hit = false; if (dy > 1e-6) { const tf = (floorY - y) / dy, tb = (GH + 8 - y) / dy; if (tf < t) { t = tf; hit = true; } else t = Math.min(t, tb); }
  return { x: x + dx * t, y: y + dy * t, len: t, hit };
}
/**
 * A pair of parallel eye-laser beams from p (eye midpoint) along unit dir for `len` px, `gap` px apart (0 = one beam).
 * w 0..1 thickness (grows in / flickers); hw = half width of the red body at w = 1. Shading by the exact perpendicular
 * distance: white core, hot pink, red body, dithered glow blended into what is already there.
 */
export function laserPair(g, p, dir, len, gap, w = 1, hw = 2.2, col = LZ) {
  if (len <= 0 || w <= 0.02) return;
  const [dx, dy] = dir, nx = -dy, ny = dx, half = gap / 2, H = hw * w, reach = H + 4.5, horiz = Math.abs(dx) >= Math.abs(dy);
  const ex = p[0] + dx * len, ey = p[1] + dy * len;
  const dist = (X, Y) => { const qx = X + 0.5 - p[0], qy = Y + 0.5 - p[1], along = qx * dx + qy * dy, across = qx * nx + qy * ny; return [along, Math.min(Math.abs(across - half), Math.abs(across + half))]; };
  const paint = (X, Y) => {
    if (X < 0 || Y < 0 || X >= GW || Y >= GH) return;
    const [al, d] = dist(X, Y); if (al < -1 || al > len + 1 || d > reach) return;
    const tail = al > len - 8 ? Math.max(0, (len - al) / 8) : 1;
    if (d < 0.75 && w > 0.3) g.px(X, Y, col.core);
    else if (d < 1.7 * Math.max(0.6, w)) g.px(X, Y, col.hot);
    else if (d < H + 0.5) g.px(X, Y, col.red);
    else { const k = (d < H + 2.5 ? 0.75 : 0.32) * w * tail; if (k > bayer(X, Y)) g.px(X, Y, mix(g.get(X, Y), d < H + 2.5 ? "#D0102A" : col.glow, d < H + 2.5 ? 0.6 : 0.4)); }
  };
  const span = reach + half + 1;
  if (horiz) {
    const xa = Math.floor(Math.min(p[0], ex) - span), xb = Math.ceil(Math.max(p[0], ex) + span);
    for (let X = Math.max(0, xa); X <= Math.min(GW - 1, xb); X++) { const cy = p[1] + ((X + 0.5 - p[0]) / dx) * dy, m = span / Math.max(0.35, Math.abs(dx)); for (let Y = Math.floor(cy - m); Y <= Math.ceil(cy + m); Y++) paint(X, Y); }
  } else {
    const ya = Math.floor(Math.min(p[1], ey) - span), yb = Math.ceil(Math.max(p[1], ey) + span);
    for (let Y = Math.max(0, ya); Y <= Math.min(GH - 1, yb); Y++) { const cx = p[0] + ((Y + 0.5 - p[1]) / dy) * dx, m = span / Math.max(0.35, Math.abs(dy)); for (let X = Math.floor(cx - m); X <= Math.ceil(cx + m); X++) paint(X, Y); }
  }
}
/** A short-lived spark spray: n particles born continuously at emitter(tb) (a function of birth time), deterministic. */
export function sparkSpray(g, T, emitter, o = {}) {
  const { n = 14, life = 0.35, speed = 90, grav = 260, seed = 1, cols = ["#FFFFFF", "#FFE27A", "#FF9A3A", "#E8162E"], up = -1, spread = 1.2, on = () => 1, big = 0.3 } = o;
  for (let i = 0; i < n; i++) {
    const per = life * (0.7 + 0.6 * rnd(seed * 97 + i)), ph = rnd(seed * 31 + i) * per, age = ((T + ph) % per), tb = T - age, k = age / per;
    if (on(tb) <= 0.02) continue;
    const e = emitter(tb); if (!e) continue;
    const slot = Math.floor((T + ph) / per), ang = (up < 0 ? -PI / 2 : PI / 2) + (rnd(slot * 13 + i * 7 + seed) - 0.5) * 2 * spread, v = speed * (0.4 + 0.8 * rnd(slot * 17 + i + seed * 3));
    const x = e[0] + Math.cos(ang) * v * age, y = e[1] + Math.sin(ang) * v * age + 0.5 * grav * age * age;
    const col = cols[Math.min(cols.length - 1, Math.floor(k * cols.length))];
    if (1 - k * 0.8 > bayer(R(x), R(y)) * 0.7) { g.px(R(x), R(y), col); if (k < big) { g.px(R(x) + 1, R(y), col); g.px(R(x), R(y) + 1, col); g.px(R(x) + 1, R(y) + 1, col); } }
  }
}

// ---------------------------------------------------------------- cloud puffs in the cloud-sea palette (world.mjs drawCloudSea)
export function seaPalette(L, glow = null) {
  const dark = clamp01(L / 6) * 0.9;
  return { lit: mix("#FFFFFF", "#9A78C8", dark), mid: mix("#DCE8FA", "#6A4C98", dark), shade: mix("#A8BCE6", "#432C6E", dark), deep: mix("#7E92C8", "#2C1C50", dark), haze: mix("#C4E2FA", "#3A1B63", dark), glow, ga: sm(L, 0, 2) * 0.5 };
}
/** Union of round billows shaded like the cloud sea (light from the upper left). bumps: [x, y, r]; a dissolves. */
export function puffs(g, bumps, pal, haze = 0.2, a = 1) {
  if (!bumps.length || a <= 0) return;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y, r] of bumps) { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); }
  const tones = [pal.deep, pal.shade, pal.mid, pal.lit].map((c) => mix(c, pal.haze, haze));
  for (let Y = Math.max(0, Math.floor(y0)); Y <= Math.min(GH - 1, Math.ceil(y1)); Y++) for (let X = Math.max(0, Math.floor(x0)); X <= Math.min(GW - 1, Math.ceil(x1)); X++) {
    if (a < 1 && a <= bayer(X, Y)) continue;
    let best = null, bd = 1;
    for (const [bx, by, br] of bumps) { const nx = (X + 0.5 - bx) / br, ny = (Y + 0.5 - by) / br, dd = nx * nx + ny * ny; if (dd < bd) { bd = dd; best = [nx, ny]; } }
    if (!best) continue;
    const v = 2.25 - best[0] * 0.85 - best[1] * 1.25, i = Math.floor(v), f = v - i, q = Math.max(0, Math.min(3, f > bayer(X, Y) ? i + 1 : i));
    let col = tones[q]; if (pal.glow && pal.ga > 0 && q >= 2) col = mix(col, pal.glow, pal.ga * 0.25);
    g.px(X, Y, col);
  }
}
/** Expanding shock ring (partial ellipse arc), k = 0..1 age. */
export function shock(g, x, y, k, rMax, col, from = 0, to = 2 * PI, sq = 0.8, w = 2) {
  if (k <= 0 || k >= 1) return;
  const r = 6 + rMax * easeOut(k), a = 1 - k * k, f = fade(g, a);
  for (let j = 0; j < w; j++) f.ering(R(x), R(y), R(r) - j, Math.max(1, R(r * sq) - j), col, from, to);
  f.ering(R(x), R(y), R(r) + 1, R(r * sq) + 1, mix(col, "#6A6AA0", 0.5), from, to);
}
