// Shared world layer: the sky, the water body and the one sky disc that sits behind every animal's head
// (deep glow → sun window → dawn → morning → day → golden sun → red dusk sun → full moon, like the reference cat).
// Everything is a pure function of the camera, so the loop seam (deep floor) is identical at t = 0 and t = END.
import { hex, bayer, mix } from "../../../../renderer/pixel/raster.mjs";
import { WORLD_W, DISC, TOD_KEYS, SEA_RANGES, END } from "./timeline.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const cyc = (T) => ((T % 7) + 7) % 7;
const mixHex = (a, b, k) => mix(a, b, clamp01(k));
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** View of the world for one frame. Integer camera so every layer moves in lockstep and stays pixel-crisp. */
export function view(cx, cy, extra = {}) {
  cx = R(cx); cy = R(cy);
  return { cx, cy, X: (wx) => 270 + wx - cx, Y: (wy) => 480 + wy - cy, x0: cx - 270, x1: cx + 270, y0: cy - 480, y1: cy + 480, ...extra };
}

// ---------------------------------------------------------------- time of day by camera x, wetness/depth by camera y
// tod 0 dawn · 1 morning · 2 day · 3 afternoon · 4 golden · 5 dusk · 6 night · 7 dawn again (cyclic, period 7)
// TOD_KEYS ([camera x, tod] pairs, increasing x) come from the film's timeline; values may run past 6 into the next day.
export function tod(cx) {
  if (cx <= TOD_KEYS[0][0]) return TOD_KEYS[0][1]; if (cx >= TOD_KEYS[TOD_KEYS.length - 1][0]) return TOD_KEYS[TOD_KEYS.length - 1][1];
  for (let i = 0; i < TOD_KEYS.length - 1; i++) { const [a, va] = TOD_KEYS[i], [b, vb] = TOD_KEYS[i + 1]; if (cx <= b) { const k = (cx - a) / (b - a); return lerp(va, vb, k * k * (3 - 2 * k)); } }
  return 6;
}
// sky looks per tod: [top, mid, horizon]
const SKY = [
  ["#2E2C6E", "#7A5A9A", "#F4A6A0"], ["#3C7AD0", "#86BDF0", "#FDE6C0"], ["#2A6ED0", "#6AAEF0", "#C8EAFF"], ["#2E6ACC", "#78AEE8", "#D8E8F0"],
  ["#3E6CC0", "#9AB4E0", "#FFD8A8"], ["#4A2E86", "#C0507A", "#FFA05A"], ["#26185A", "#7A2E7A", "#E8607A"], ["#120E30", "#2A2058", "#4A3A86"],
];
// sky-disc looks per tod: radius, core, rim, glow ring colour, crater colour (moon)
const SUN = [
  { r: 62, core: "#FFF0D8", rim: "#FFC8A0", glow: "#FFB4A8" }, { r: 60, core: "#FFF8DC", rim: "#FFE494", glow: "#FFF0B8" },
  { r: 54, core: "#FFFFF4", rim: "#FFF4AC", glow: "#FFFBD8" }, { r: 58, core: "#FFF8E0", rim: "#FFE8A0", glow: "#FFF2C8" },
  { r: 72, core: "#FFF0C8", rim: "#FFD078", glow: "#FFE0A8" }, { r: 112, core: "#FFD887", rim: "#FF9A40", glow: "#FF7A58" },
  { r: 92, core: "#FF9A72", rim: "#E2505E", glow: "#B23C78" }, { r: 104, core: "#F8E8BC", rim: "#E6CE96", glow: "#7A64B4", crater: "#D6BA86" },
];
SUN.push(SUN[0]);
const SUN_T = [0, 1, 2, 2.2, 3, 4, 5, 6, 7];
function pick(table, keys, v) { let i = 0; while (i < keys.length - 2 && v > keys[i + 1]) i++; const k = clamp01((v - keys[i]) / (keys[i + 1] - keys[i] || 1)); return [table[i], table[i + 1], k]; }
SKY.push(SKY[0]);
const SKY_T = [0, 1, 2, 2.6, 3, 4, 5, 6, 7];

/** Is the camera over one of the film's deep-water ranges (SEA_RANGES, world x, wrapped)? Returns 0..1. */
export function seaness(cx) { const lx = ((cx % WORLD_W) + WORLD_W) % WORLD_W; let v = 0; for (const [a, b] of SEA_RANGES) for (const x of [lx - WORLD_W, lx, lx + WORLD_W]) v = Math.max(v, x >= a && x < b ? 1 : x < a ? sm(x, a - 300, a) : 1 - sm(x, b, b + 300)); return v; }
/** Underwater factor of the camera (0 above water → 1 below) and depth factor (0 shallow → 1 deep floor). */
export function wetness(cx, cy) { return sm(cy, 30, 300) * seaness(cx); }
export function depth(cy) { return sm(cy, 450, 1500); }

// ---------------------------------------------------------------- sky (screen space)
export function drawSky(c, V, t) {
  const T = cyc(tod(V.cx)), [a, b, k] = pick(SKY, SKY_T, T), top = mix(a[0], b[0], k), mid = mix(a[1], b[1], k), hor = mix(a[2], b[2], k);
  const d = c.d, W = c.w, hy = 560; // horizon row (screen) — land biomes cover it
  const rows = [];
  for (let y = 0; y < c.h; y++) { const v = y < hy * 0.55 ? (y / (hy * 0.55)) * 0.5 : 0.5 + clamp01((y - hy * 0.55) / (hy * 0.45)) * 0.5; rows.push(v); }
  const steps = 7;
  for (let y = 0; y < c.h; y++) {
    const v = rows[y] * steps, lo = Math.floor(v), f = v - lo;
    const col = (q) => { const s = Math.min(steps, q) / steps; return s < 0.5 ? mix(top, mid, s * 2) : mix(mid, hor, (s - 0.5) * 2); };
    const c0 = col(lo), c1 = col(lo + 1);
    for (let x = 0; x < W; x++) { const cc = f > bayer(x, y) ? c1 : c0, i = (y * W + x) * 3; d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; }
  }
  // stars at dawn (few) and at night (many, twinkling); fixed to the sky so they drift slowly with the camera
  const night = T > 6 ? 1 - 0.65 * (T - 6) : Math.max(sm(T, 5.2, 6), 0.35 * (1 - sm(T, 0, 0.8)));
  if (night > 0.02) for (let i = 0; i < 160; i++) {
    const sx = R(((rnd(i * 3 + 1) * 1400 - V.cx * ((Math.max(1, Math.round((0.05 * WORLD_W) / 540)) * 540) / WORLD_W)) % 540 + 540) % 540), sy = R(rnd(i * 3 + 2) * 470), tw = 0.6 + 0.4 * Math.sin(t * (1.3 + rnd(i) * 2) + i);
    if (rnd(i * 3 + 3) > night * tw) continue; const big = rnd(i * 7) < 0.12;
    c.px(sx, sy, big ? "#FFF6D8" : "#C8C0F0"); if (big) { c.px(sx - 1, sy, "#8A80C8"); c.px(sx + 1, sy, "#8A80C8"); c.px(sx, sy - 1, "#8A80C8"); c.px(sx, sy + 1, "#8A80C8"); }
  }
  // day clouds: soft pixel clouds drifting slowly, parallax 0.25
  const day = sm(T, 0.5, 1.2) * (1 - sm(T, 3.6, 4.4));
  if (day > 0.02) for (let i = 0; i < 6; i++) {
    // parallax and drift chosen so one world-width and one film length shift the 900-px cloud pattern by whole periods (loop-safe)
    const PX = (Math.max(1, Math.round((0.25 * WORLD_W) / 900)) * 900) / WORLD_W, DR = (Math.max(1, Math.round((4 * END) / 900)) * 900) / END;
    const w = 60 + rnd(i * 11) * 70, x = (((rnd(i * 5) * 1600 - V.cx * PX + t * DR) % 900) + 900) % 900 - 180, y = 70 + rnd(i * 13) * 300;
    cloud(c, x, y, w, day);
  }
}
function cloud(c, x, y, w, a) {
  const h = w * 0.32, parts = [[0, 0, w * 0.5, h * 0.55], [-w * 0.28, h * 0.12, w * 0.3, h * 0.4], [w * 0.3, h * 0.1, w * 0.32, h * 0.45], [w * 0.05, -h * 0.25, w * 0.28, h * 0.45]];
  for (let Y = R(y - h); Y <= R(y + h * 0.7); Y++) for (let X = R(x - w * 0.62); X <= R(x + w * 0.66); X++) {
    let inside = false; for (const [dx, dy, rx, ry] of parts) if (((X - x - dx) / rx) ** 2 + ((Y - y - dy) / ry) ** 2 <= 1) { inside = true; break; }
    if (!inside || a <= bayer(X, Y) * 0.999) continue;
    const shade = Y > y + h * 0.25 ? "#D6E6F8" : "#FFFFFF"; c.px(X, Y, shade);
  }
}

// ---------------------------------------------------------------- water body (screen space): drawn over the sky where the world is sea
/** Fill the water below the surface line between world x0..x1 (sea column, its wrapped copy, the bay). Depth gradient + light shafts. */
export function drawWater(c, V, t, x0, x1, surfaceY = 0) {
  const sx0 = Math.max(0, R(V.X(x0))), sx1 = Math.min(c.w, R(V.X(x1))), sy0 = Math.max(0, R(V.Y(surfaceY)));
  if (sx0 >= sx1 || sy0 >= c.h) return;
  const T0 = V.tod ?? cyc(tod(V.cx)), T = T0 > 6.5 ? 0 : T0, night = T0 > 6.5 ? 1 - sm(T0, 6.5, 7) : sm(T0, 5, 6), dusk = sm(T, 3.6, 5) * (1 - night);
  const shallow = mixHex(mixHex("#3ACCD8", "#5A6AB0", dusk), "#24306A", night), mid = mixHex(mixHex("#1A6EAA", "#2A3E86", dusk), "#16205A", night), deep = "#0A1A3A", abyss = "#06102A";
  const d = c.d, W = c.w;
  for (let y = sy0; y < c.h; y++) {
    const wy = y - 480 + V.cy - surfaceY, v = wy < 900 ? (wy / 900) * 2 : 2 + Math.min(1, (wy - 900) / 900), lo = Math.floor(v), f = v - lo, steps = [shallow, mid, deep, abyss];
    // banded depth with dithered transitions (4 sub-steps per band)
    const sub = f * 4, sl = Math.floor(sub), sf = sub - sl;
    const A = steps[Math.min(3, lo)], B = steps[Math.min(3, lo + 1)], ca = hex(mix(A, B, sl / 4)), cb = hex(mix(A, B, Math.min(4, sl + 1) / 4));
    for (let x = sx0; x < sx1; x++) { const cc = sf > bayer(x, y) ? cb : ca, i = (y * W + x) * 3; d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; }
  }
  // light shafts from the surface, slowly swaying (fixed to the world, fading with depth)
  for (let k = 0; k < 7; k++) {
    const wx0 = x0 + (k + 0.3) * ((x1 - x0) / 7) + Math.sin(t * 0.35 + k * 1.7) * 18, wid = 10 + rnd(k * 9) * 18, slant = 0.32;
    for (let y = sy0; y < c.h; y++) {
      const wy = y - 480 + V.cy - surfaceY, fall = Math.max(0, 1 - wy / (700 + rnd(k) * 300)); if (fall <= 0) break;
      const cx = V.X(wx0 + wy * slant); for (let x = R(cx - wid); x <= R(cx + wid); x++) { if (x < sx0 || x >= sx1) continue; const e = 1 - Math.abs(x - cx) / wid; if (e * fall * 0.42 > bayer(x, y) + 0.08) c.px(x, y, mix(c.get(x, y), "#BFF6FF", 0.22 * (1 - night * 0.6))); }
    }
  }
  // the surface seen from below / from the side: a bright wavy line
  if (sy0 > 0 && sy0 < c.h) for (let x = sx0; x < sx1; x++) { const wv = R(Math.sin((x + V.cx) * 0.09 + t * 2.2) * 1.5); c.px(x, sy0 + wv, "#E8FFFF"); c.px(x, sy0 + wv + 1, mixHex(shallow, "#FFFFFF", 0.4)); }
}

// ---------------------------------------------------------------- the sky disc behind the animal's head (screen space, DISC)
export function discLook(cx, cy) {
  const T = cyc(tod(cx)), [a, b, k] = pick(SUN, SUN_T, T), wet = wetness(cx, cy), deep = depth(cy);
  const L = { r: lerp(a.r, b.r, k), core: mix(a.core, b.core, k), rim: mix(a.rim, b.rim, k), glow: mix(a.glow, b.glow, k), crater: b.crater ? (a.crater ? mix(a.crater, b.crater, k) : b.crater) : null, craterA: b.crater ? (a.crater ? 1 : k) : 0, wet, deep };
  return L;
}
export function drawDisc(c, V, t, a = 1) {
  if (a <= 0) return;
  const L = discLook(V.cx, V.cy), x = DISC.x, y = DISC.y;
  // underwater variants: shallow = bright sun window with wavy edge, deep = big dim glow
  const water = { r: lerp(84, 124, L.deep), core: mix("#E8FFFF", "#2A6E90", L.deep), rim: mix("#9AE8F0", "#1C5476", L.deep), glow: mix("#58C0D8", "#123A5C", L.deep) };
  const r = lerp(L.r, water.r, L.wet), core = mix(L.core, water.core, L.wet), rim = mix(L.rim, water.rim, L.wet), glow = mix(L.glow, water.glow, L.wet), crA = L.craterA * (1 - L.wet);
  const wob = L.wet * (1 - L.deep) * 2.5;
  // outer dithered glow ring (like the reference moon's soft halo)
  for (let Y = R(y - r - 26); Y <= R(y + r + 26); Y++) for (let X = R(x - r - 26); X <= R(x + r + 26); X++) {
    const ang = Math.atan2(Y - y, X - x), rr = r + wob * Math.sin(ang * 7 + (2 * Math.PI * Math.round((2.4 * END) / (2 * Math.PI)) * t) / END), dd = Math.hypot(X - x, Y - y) - rr;
    if (dd > 0 && dd < 26) { const k = (1 - dd / 26) ** 1.6 * 0.55 * a; if (k > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), glow, 0.55)); continue; }
    if (dd <= 0) {
      if (a < 1 && a <= bayer(X, Y)) continue;
      const u = Math.hypot(X - x + r * 0.18, Y - y + r * 0.22) / r;            // light centre upper-left
      let col = u < 0.72 ? core : u < 0.92 ? ((u - 0.72) / 0.2 > bayer(X, Y) ? rim : core) : rim;
      if (dd > -2) col = mix(rim, glow, 0.35);
      // moon craters (dithered patches), as on the reference moon
      if (crA > 0) for (const [cxx, cyy, cr] of [[-0.42, -0.36, 0.14], [0.36, -0.5, 0.1], [0.5, 0.08, 0.16], [-0.18, 0.46, 0.12], [-0.6, 0.18, 0.08], [0.1, -0.08, 0.07]]) { const q = Math.hypot(X - (x + cxx * r), Y - (y + cyy * r)) / (cr * r); if (q < 1 && crA * (1.1 - q) > bayer(X, Y)) col = L.crater; }
      c.px(X, Y, col);
    }
  }
}
