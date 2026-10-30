// The persistent Halloween night set: purple sky, stars, moon, far hills with a bare tree and a fence, a field with a
// path, drifting dithered fog, foreground grass, bats. Static parts are drawn once into cached layers; the camera
// push-in scales the hills (parallax 0.35), the field (1.0) and the grass (1.3) about the pumpkin's anchor.
// Everything that moves is a loop-exact function of t (integer cycles per 10 s), so frame 300 = frame 0.
import { Canvas, mix, bayer, hex } from "../../../../../renderer/pixel/raster.mjs";
import { GW, GH, clamp01, rnd, TAU, wob, lerp } from "./util.mjs";

export const C = {
  sky0: "#140D24", sky1: "#1D1430", sky2: "#2A1F48", sky3: "#3B2C5C", glow: "#4A3870",
  moon: "#B9C8F0", moonL: "#E6ECFF", moonD: "#8C9BD0", moonC: "#7584BA",
  hill0: "#2A1E46", hill1: "#211738", tree: "#120B20", fence: "#1A1230",
  field0: "#2A2040", field1: "#251B34", field2: "#1E1529", field3: "#170F20", path: "#3A2D4E", pathD: "#2E2340",
  grass: "#0F1A16", grassL: "#1C2A20", fog: "#7A6AA8", ink: "#0B0812",
};
export const ANCHOR = { x: 255, y: 520 };   // the camera scales about this point (the pumpkin's middle)

class Layer extends Canvas {
  constructor(w, h) { super(w, h, "#000000"); this.m = new Uint8Array(w * h); }
  px(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return; super.px(x, y, c); if (this.m) this.m[y * this.w + x] = 1; }
}

// ---------------------------------------------------------------- sky (cached), stars, moon
const SKY = new Canvas(GW, GH, C.sky0);
{ const stops = [[0, C.sky0], [260, C.sky1], [470, C.sky2], [580, C.sky3], [640, C.glow]];
  for (let y = 0; y < GH; y++) { let i = 0; while (i < stops.length - 2 && y > stops[i + 1][0]) i++;
    const [y0, a] = stops[i], [y1, b] = stops[i + 1], k = clamp01((y - y0) / (y1 - y0));
    for (let x = 0; x < GW; x++) { const q = Math.floor(k * 4 + bayer(x, y)) / 4; SKY.px(x, y, mix(a, b, Math.min(1, q))); } } }
export const MOON = { x: 420, y: 92, r: 36 };
{ const { x: mx, y: my, r } = MOON;           // halo first, then the disc with a few craters, lit from the left
  SKY.tint(mx - 90, my - 90, 180, 180, (x, y) => { const d = Math.hypot(x - mx, y - my); return d < r ? 0 : 0.5 * Math.pow(clamp01(1 - (d - r) / 54), 1.6); }, "#8A86C8", 4);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d > r + 0.3) continue;
    const nz = Math.sqrt(Math.max(0, 1 - (d / r) ** 2)), L = 0.55 * nz + 0.35 * (-x / r) * 0.5 + 0.35 - 0.2 * (y / r);
    let col = L > 0.78 ? C.moonL : L > 0.45 ? C.moon : C.moonD; if (L > 0.45 && L < 0.52 && bayer(x, y) > 0.5) col = C.moonD; if (L > 0.75 && L < 0.8 && bayer(x, y) > 0.5) col = C.moon;
    for (const [cx, cy, cr] of [[-12, -8, 7], [10, 6, 9], [-4, 18, 5], [16, -16, 4], [-20, 10, 4]]) { const e = Math.hypot(x - cx, y - cy); if (e < cr) col = e > cr - 1.5 && x - cx < 0 ? C.moonL : C.moonC; }
    if (d > r - 1) col = mix(col, "#5E5A96", 0.5);
    SKY.px(mx + x, my + y, col); } }
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: Math.floor(rnd(i * 3 + 1) * GW), y: Math.floor(rnd(i * 3 + 2) * 520), k: 2 + Math.floor(rnd(i * 7) * 5), ph: rnd(i * 11) * TAU, big: rnd(i * 13) > 0.86 }))
  .filter((s) => Math.hypot(s.x - MOON.x, s.y - MOON.y) > 70);

// ---------------------------------------------------------------- far hills, the bare tree, the fence, two plain pumpkins (cached, parallax 0.35)
const FAR = new Layer(GW, GH);
{ for (let x = 0; x < GW; x++) {
    const h0 = 548 - 26 * Math.sin(x / 70 + 0.6) - 12 * Math.sin(x / 31 + 2), h1 = 572 - 14 * Math.sin(x / 55 + 2.4) - 6 * Math.sin(x / 19);
    for (let y = Math.floor(h0); y < 660; y++) FAR.px(x, y, y < h0 + 2 ? mix(C.hill0, C.sky3, 0.35) : C.hill0);
    for (let y = Math.floor(h1); y < 660; y++) FAR.px(x, y, C.hill1); }
  // bare tree on the left: recursive branches, deterministic
  const stamp = (x, y, r, col) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 0.5) FAR.px(Math.round(x + i), Math.round(y + j), col); };
  const branch = (x, y, ang, len, w, depth, seed) => {
    const n = Math.max(2, Math.floor(len / 2)); let px = x, py = y;
    for (let i = 0; i <= n; i++) { const k = i / n, a = ang + 0.25 * Math.sin(k * 3 + seed); px = x + Math.sin(a) * len * k; py = y - Math.cos(a) * len * k; stamp(px, py, Math.max(0, Math.round(w * (1 - 0.5 * k))), C.tree); }
    if (depth <= 0) return;
    const m = 2 + (rnd(seed) > 0.5 ? 1 : 0);
    for (let j = 0; j < m; j++) branch(px, py, ang + (j - (m - 1) / 2) * 0.65 + (rnd(seed * 7 + j) - 0.5) * 0.4, len * (0.62 + 0.15 * rnd(seed * 3 + j)), Math.max(0, w * 0.6), depth - 1, seed * 5 + j + 1);
  };
  branch(44, 600, 0.12, 96, 6, 4, 3);
  branch(48, 520, -0.9, 40, 3, 3, 9);
  // fence posts on the right
  for (let i = 0; i < 6; i++) { const x = 392 + i * 27, top = 548 + Math.round(4 * Math.sin(i * 1.7)), lean = i % 2 ? 1 : -1;
    for (let y = top; y < 610; y++) { const dx = Math.round(lean * (610 - y) / 30); FAR.rect(x + dx, y, 5, 1, C.fence); } FAR.px(x + 2, top - 1, C.fence); }
  for (const y of [566, 586]) for (let x = 380; x < GW; x++) FAR.rect(x, y + Math.round(2 * Math.sin(x / 23)), 1, 3, C.fence);
}
// ---------------------------------------------------------------- the field (cached, parallax 1.0): bands, a path to the pumpkin, stones
const FIELD = new Layer(GW, GH);
{ for (let y = 585; y < GH; y++) for (let x = 0; x < GW; x++) {
    const k = clamp01((y - 585) / 375), q = k * 3 + bayer(x, y) * 0.9 - 0.45, band = Math.max(0, Math.min(3, Math.floor(q + 0.5)));
    let col = [C.field0, C.field1, C.field2, C.field3][band];
    // a trodden path coming toward the viewer from the pumpkin, widening with depth
    const pw = 26 + (y - 585) * 0.55, pc = 255 + (y - 585) * 0.18 + 10 * Math.sin(y / 60);
    const e = Math.abs(x - pc) - pw; if (e < 0) col = e > -3 ? C.pathD : bayer(x, y) > 0.82 - 0.2 * k ? C.pathD : C.path;
    if (y < 588 && bayer(x, y) > 0.5) col = C.hill1;
    FIELD.px(x, y, col); }
  for (let i = 0; i < 26; i++) { const y = 610 + Math.floor(rnd(i * 5 + 3) ** 1.4 * 340), x = Math.floor(rnd(i * 5 + 4) * GW), r = 1 + Math.floor((y - 600) / 90);
    for (let j = -r; j <= r; j++) for (let ii = -r * 2; ii <= r * 2; ii++) if ((ii / 2) ** 2 + j * j <= r * r) FIELD.px(x + ii, y + j, j < 0 ? "#3A3050" : "#120C1C"); }
  // two plain pumpkins far off at the sides (background, no faces)
  for (const [x0, y0, r] of [[70, 606, 13], [486, 618, 17]]) for (let y = -r; y <= r; y++) for (let x = -r * 1.3; x <= r * 1.3; x++) { const d = (x / (r * 1.3)) ** 2 + (y / r) ** 2; if (d > 1) continue;
    const rib = Math.cos((x / (r * 1.3)) * 5.5), L = 0.5 + 0.35 * (-y / r) + 0.15 * rib; let col = d > 0.82 ? "#2A1018" : L > 0.6 ? "#9A4E2C" : L > 0.35 ? "#7A3A22" : "#55261A";
    FIELD.px(Math.round(x0 + x), Math.round(y0 + y), col); if (y === -r) FIELD.rect(x0 - 1, y0 - r - 3, 2, 3, "#2E3518"); }
}
// ---------------------------------------------------------------- foreground grass (cached, parallax 1.3)
const GRASS = new Layer(GW, GH);
{ for (let i = 0; i < 150; i++) { const x0 = Math.floor(rnd(i * 9 + 1) * (GW + 40)) - 20, base = GH + 4, h = 36 + Math.floor(rnd(i * 9 + 2) * 70) * (x0 < 120 || x0 > 400 ? 1.4 : 0.8), lean = (rnd(i * 9 + 3) - 0.5) * 1.2, w = 2 + Math.floor(rnd(i * 9 + 4) * 3);
    for (let j = 0; j < h; j++) { const k = j / h, x = x0 + lean * h * k * k, ww = Math.max(1, Math.round(w * (1 - k))); GRASS.rect(Math.round(x), base - j, ww, 1, k > 0.6 && i % 3 === 0 ? C.grassL : C.grass); } }
  for (let x = 0; x < GW; x++) for (let y = GH - 26 - Math.floor(8 * Math.sin(x / 13) ** 2); y < GH; y++) GRASS.px(x, y, C.grass);
}

/** Copy a cached layer scaled by z about ANCHOR (nearest), only where its mask is set. */
function blitScaled(c, L, z, y0 = 0, y1 = GH) {
  const ax = ANCHOR.x, ay = ANCHOR.y;
  for (let y = y0; y < y1; y++) { const sy = Math.round(ay + (y + 0.5 - ay) / z - 0.5); if (sy < 0 || sy >= GH) continue;
    for (let x = 0; x < GW; x++) { const sx = Math.round(ax + (x + 0.5 - ax) / z - 0.5); if (sx < 0 || sx >= GW) continue; const s = sy * GW + sx; if (!L.m[s]) continue;
      const q = (y * GW + x) * 3, p = s * 3; c.d[q] = L.d[p]; c.d[q + 1] = L.d[p + 1]; c.d[q + 2] = L.d[p + 2]; } }
}
const zAt = (z, p) => 1 + (z - 1) * p;

export function drawBack(c, t, z) {
  c.d.set(SKY.d);
  for (const s of STARS) { const b = 0.45 + 0.55 * (0.5 + 0.5 * wob(t, s.k, s.ph)); const col = mix(SKY.get(s.x, s.y), s.big ? "#F4EEFF" : "#C9C2EE", b);
    c.px(s.x, s.y, col); if (s.big) { const cc = mix(SKY.get(s.x, s.y), "#B9B0E8", b * 0.45); c.px(s.x - 1, s.y, cc); c.px(s.x + 1, s.y, cc); c.px(s.x, s.y - 1, cc); c.px(s.x, s.y + 1, cc); } }
  blitScaled(c, FAR, zAt(z, 0.35), 380, 700);
  blitScaled(c, FIELD, z, 560, GH);
}
/** World → screen for the field plane (the pumpkin stands on it). */
export const fieldX = (wx, z) => ANCHOR.x + (wx - ANCHOR.x) * z, fieldY = (wy, z) => ANCHOR.y + (wy - ANCHOR.y) * z;

/** Ground fog: two loop-exact drifting bands. back = behind the pumpkin, front = a thin veil over its base. */
export function drawFog(c, t, layer) {
  const y0 = layer === "back" ? 500 : 600, y1 = layer === "back" ? 700 : 760;
  c.tint(0, y0, GW, y1 - y0, (x, y) => {
    const body = layer === "back" ? Math.exp(-(((y - 600) / 46) ** 2)) * 0.42 : Math.exp(-(((y - 668) / 34) ** 2)) * 0.3;
    const n = 0.55 + 0.3 * Math.sin((TAU * x) / 180 - (TAU * 1 * t) / 10 + y / 40) + 0.25 * Math.sin((TAU * x) / 97 + (TAU * 2 * t) / 10 + 1.3 + y / 23);
    return body * clamp01(n);
  }, C.fog, 4);
}
export function drawFront(c, t, z) { blitScaled(c, GRASS, zAt(z, 1.3), 760, GH); }

/** Bats: silhouettes crossing the top background (y < 150 grid), wings flap continuously. Paths wrap at 10 s. */
const BATS = [
  { t0: 9.1, dur: 2.2, x0: 560, y0: 70, x1: -30, y1: 118, s: 1.0, flap: 7.5 },   // crosses the moon around the seam (loop-exact)
  { t0: 7.95, dur: 1.7, x0: -24, y0: 132, x1: 300, y1: 40, s: 0.8, flap: 9 },
  { t0: 8.25, dur: 1.5, x0: -30, y0: 104, x1: 250, y1: 24, s: 0.65, flap: 10 },
];
export function drawBats(c, t) {
  for (const b of BATS) { const tt = ((t - b.t0) % 10 + 10) % 10; if (tt > b.dur) continue; const k = tt / b.dur;
    const x = lerp(b.x0, b.x1, k), y = lerp(b.y0, b.y1, k) + 8 * Math.sin(k * TAU * 1.2), f = Math.sin(TAU * b.flap * tt), s = b.s;
    // body + head + ears
    for (let j = -3; j <= 3; j++) for (let i = -2; i <= 2; i++) if ((i / 2.2) ** 2 + (j / 3.2) ** 2 <= 1) c.px(Math.round(x + i * s), Math.round(y + j * s), C.ink);
    c.px(Math.round(x - 1 * s), Math.round(y - 4 * s), C.ink); c.px(Math.round(x + 1 * s), Math.round(y - 4 * s), C.ink);
    // wings: a scalloped polygon whose tips follow the flap
    for (const side of [-1, 1]) { const tipY = y - 7 * s * f, tipX = x + side * 15 * s;
      for (let i = 0; i <= Math.round(15 * s); i++) { const u = i / (15 * s), wx = x + side * (2 + i), top = lerp(y - 1, tipY, Math.sin(u * Math.PI / 2)), bot = top + (1 - u) * 5 * s + 2 - 2 * Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u * 0.3);
        for (let yy = Math.round(top); yy <= Math.round(bot); yy++) c.px(Math.round(wx), yy, C.ink); }
      c.px(Math.round(tipX), Math.round(tipY) - 1, C.ink); }
  }
}
