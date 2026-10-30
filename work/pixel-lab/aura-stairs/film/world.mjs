// «Aura stairs» — the world: a full sky scene. Sky gradient that darkens from day to a violet night as the aura grows,
// the sun turning into a moon, stars, a far cloud sea, two floating islands with a waterfall, a flock of birds (they
// freeze when time stops), mid clouds, the floating marble staircase (stairs he has stepped on glow in that step's
// aura colour) and big soft foreground clouds at the bottom edge. Everything is a pure function of (cam, τ, look).
import { mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { layer, ground, clamp01, sm, lerp, rnd, frac, RUN, RISE, GW, GH } from "./layout.mjs";

const R = Math.round, PI = Math.PI;

/** Aura colours: step 1 … 5, then MAX (time stop). */
export const COL = ["#7FF0FF", "#4C8DFF", "#A15CFF", "#FF4FD8", "#FF4646", "#FFD24A"];
export const tone = (col, k) => (k < 0 ? mix(col, "#05030C", -k) : mix(col, "#FFFFFF", k));
export const levelColor = (L) => { const i = Math.max(0, Math.min(COL.length - 1, L - 1)), a = Math.floor(i), b = Math.min(COL.length - 1, a + 1); return mix(COL[a], COL[b], i - a); };

// ---------------------------------------------------------------- value noise
const h2 = (x, y) => rnd((x * 7919) ^ (y * 104729) ^ 0x5bd1e995);
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export const fbm = (x, y) => 0.55 * vnoise(x, y) + 0.3 * vnoise(x * 2.1 + 17, y * 2.1 + 5) + 0.15 * vnoise(x * 4.3 + 3, y * 4.3 + 29);

// ---------------------------------------------------------------- sky
const DAY = ["#2F6FD0", "#4E8FE2", "#73AEEE", "#9CCBF5", "#C4E2FA", "#E6F4FF"];
const NIGHT = ["#0C0824", "#170E3A", "#26144F", "#3A1B63", "#592676", "#86377F"];
/** dark 0..1: how far the sky has gone toward night. */
export function drawSky(c, cam, dark) {
  const off = cam.cy * 0.08;
  for (let y = 0; y < GH; y++) {
    const u = clamp01((y + off + 60) / (GH + 40)) * (DAY.length - 1), i = Math.floor(u), f = u - i;
    const top = mix(DAY[i], NIGHT[i], dark), bot = mix(DAY[Math.min(5, i + 1)], NIGHT[Math.min(5, i + 1)], dark);
    for (let x = 0; x < GW; x++) { const q = f > 0.25 && f < 0.75 ? ((f - 0.25) * 2 > bayer(x, y) ? bot : top) : f >= 0.75 ? bot : top; const k = (y * GW + x) * 3; c.d[k] = q[0]; c.d[k + 1] = q[1]; c.d[k + 2] = q[2]; }
  }
}
export function drawStars(c, cam, T, a) {
  if (a <= 0) return;
  const g = fade(c, a);
  for (let i = 0; i < 90; i++) {
    const x = R(rnd(i * 3 + 1) * GW - cam.cx * 0.02) % GW, y = R(rnd(i * 3 + 2) * 620 - cam.cy * 0.02), tw = 0.5 + 0.5 * Math.sin(T * (1.5 + rnd(i) * 2) + i);
    const xx = (x + GW) % GW, col = tw > 0.6 ? "#FFFFFF" : "#B8B0E8";
    g.px(xx, y, col); if (rnd(i * 7) > 0.8 && tw > 0.5) { g.px(xx - 1, y, "#8C80D0"); g.px(xx + 1, y, "#8C80D0"); g.px(xx, y - 1, "#8C80D0"); g.px(xx, y + 1, "#8C80D0"); }
  }
}
/** The sun (day) dissolving into a big pale moon (night). */
export function drawSunMoon(c, cam, dark) {
  const L = layer(cam, 0.06), x = R(L.X(cam.cx * 0.06 + 150)), y = R(L.Y(cam.cy * 0.06 - 160)), r = 44;
  // glow rings
  for (let k = 3; k >= 1; k--) { const rr = r + k * 10, col = mix(mix("#FFF4C8", "#C8B8FF", dark), "#FFFFFF", 0), a = 0.16 * (4 - k); c.dither(x - rr, y - rr, 2 * rr + 1, 2 * rr + 1, (X, Y) => { const d = Math.hypot(X - x, Y - y); return d < rr && d >= rr - 10 ? a : 0; }, col); }
  const sun = fade(c, 1 - dark), moon = fade(c, dark);
  if (dark < 1) { sun.disc(x, y, r, "#FFF2B0"); sun.disc(x - 6, y - 6, r - 12, "#FFF9DA"); sun.disc(x - 12, y - 12, r - 30, "#FFFFFF"); }
  if (dark > 0) {
    moon.disc(x, y, r, "#E6E0FA"); moon.disc(x + 4, y + 4, r - 6, "#D2CAF0");
    for (const [cx, cy, cr] of [[-14, -10, 9], [12, 6, 12], [-4, 18, 6], [16, -18, 5], [-22, 12, 4]]) { moon.disc(x + cx, y + cy, cr, "#BCB2E0"); moon.disc(x + cx - 1, y + cy - 1, Math.max(1, cr - 3), "#C8BFEA"); }
  }
}

// ---------------------------------------------------------------- clouds
const CLOUDS = (() => {
  const out = [];
  const make = (seed, w, h) => { const b = []; const n = 7 + Math.floor(rnd(seed) * 5); for (let i = 0; i < n; i++) { const u = i / (n - 1), r = h * (0.45 + 0.55 * Math.sin(PI * u)) * (0.7 + 0.4 * rnd(seed * 13 + i)); b.push([(u - 0.5) * w, -r * 0.55 + rnd(seed * 7 + i) * 6, r]); } return b; };
  // far cloud sea (p 0.18), mid clouds (p 0.5), near clouds (p 1.5)
  for (let i = 0; i < 14; i++) out.push({ p: 0.18, x: -500 + i * 95 + rnd(i) * 40, y: 250 + rnd(i + 50) * 30, blobs: make(i + 1, 140, 46), drift: 2 });
  for (let i = 0; i < 9; i++) out.push({ p: 0.5, x: -380 + i * 170 + rnd(i + 9) * 60, y: -40 - rnd(i + 70) * 260 + (i % 2) * 120, blobs: make(i + 30, 120 + rnd(i) * 60, 30 + rnd(i + 3) * 14), drift: 5 });
  return out;
})();
const CLOUD_DAY = ["#8FA6D8", "#B8CAEE", "#E2ECFC", "#FFFFFF"], CLOUD_NIGHT = ["#2A1A50", "#43286E", "#62408C", "#8A62B0"];
/** depth: "far" | "mid" | "near". glow: aura colour for rims (or null), ga 0..1. */
export function drawClouds(c, cam, T, dark, depth, glow = null, ga = 0) {
  const P = depth === "far" ? 0.18 : depth === "mid" ? 0.5 : 1.45;
  const ramp = CLOUD_DAY.map((d, i) => mix(d, CLOUD_NIGHT[i], dark));
  for (const cl of CLOUDS) {
    if (cl.p !== P) continue;
    const L = layer(cam, P), cx = L.X(cl.x - cl.drift * T + cam.cx * P * 0), cy = L.Y(cl.y + cam.cy * 0), z = L.z;
    // wrap horizontally around the camera so the sky never runs out
    const span = depth === "far" ? 1330 : depth === "mid" ? 1530 : 1560, sx = ((cx + 300) % span + span) % span - 300;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [bx, by, br] of cl.blobs) { x0 = Math.min(x0, sx + (bx - br) * z); x1 = Math.max(x1, sx + (bx + br) * z); y0 = Math.min(y0, cy + (by - br) * z); y1 = Math.max(y1, cy + (by + br) * z); }
    if (x1 < 0 || x0 > GW || y1 < 0 || y0 > GH) continue;
    const base = cy + Math.max(...cl.blobs.map(([, by, br]) => by + br * 0.35)) * z;
    for (let Y = Math.max(0, Math.floor(y0)); Y <= Math.min(GH - 1, Math.ceil(y1)); Y++) for (let X = Math.max(0, Math.floor(x0)); X <= Math.min(GW - 1, Math.ceil(x1)); X++) {
      if (depth !== "far" && Y > base + 2) continue;
      let inside = -1, best = 0;
      for (const [bx, by, br] of cl.blobs) { const dx = (X + 0.5 - (sx + bx * z)) / (br * z), dy = (Y + 0.5 - (cy + by * z)) / (br * z), d = dx * dx + dy * dy; if (d < 1) { inside = 1; best = Math.max(best, -dy * 0.8 - dx * 0.25 + (1 - d) * 0.6); } }
      if (inside < 0) continue;
      const v = clamp01(0.35 + best * 0.9 - (Y - y0) / (y1 - y0 + 1) * 0.35) * 3.2, i = Math.floor(v), f = v - i, q = Math.min(3, f > bayer(X, Y) ? i + 1 : i);
      let col = ramp[q];
      if (glow && ga > 0 && q >= 2) col = mix(col, glow, ga * 0.35 * (q - 1) / 2);
      c.px(X, Y, col);
    }
    if (depth === "far") c.rect(Math.max(0, Math.floor(x0)), Math.ceil(base), Math.max(0, Math.min(GW, Math.ceil(x1)) - Math.max(0, Math.floor(x0))), Math.max(0, GH - Math.ceil(base)), ramp[1]);
  }
}

// ---------------------------------------------------------------- floating islands (p 0.32) with a waterfall
const ISLANDS = [{ x: -150, y: -215, w: 62, seed: 3 }, { x: 205, y: -45, w: 44, seed: 8 }, { x: 600, y: -260, w: 56, seed: 5 }];
export function drawIslands(c, cam, T, dark) {
  const L = layer(cam, 0.32), z = L.z;
  const grass = mix("#6CCB5A", "#2E5A5E", dark * 0.8), grassD = mix("#3E9A48", "#1E3A4A", dark * 0.8), rock = mix("#8A7060", "#3A2A48", dark * 0.8), rockD = mix("#5E4638", "#24183A", dark * 0.8);
  const water = mix("#9EE6FF", "#6A7ACC", dark), trunk = mix("#6A4428", "#2A1A30", dark), leaf = mix("#3FAE4A", "#1C3E48", dark * 0.8), leafL = mix("#7ADC62", "#305C5E", dark * 0.8);
  for (const is of ISLANDS) {
    const cx = L.X(is.x), cy = L.Y(is.y), w = is.w * z; if (cx + w < -20 || cx - w > GW + 20 || cy < -80 || cy > GH + 80) continue;
    // rock cone
    c.poly([[cx - w, cy], [cx + w, cy], [cx + w * 0.4, cy + w * 0.7], [cx + w * 0.05, cy + w * 1.25], [cx - w * 0.3, cy + w * 0.8]], rock, (X, Y) => (X - cx > w * 0.15 || ((X + Y) % 7 === 0 && bayer(X, Y) > 0.5) ? rockD : rock));
    // grass cap
    c.rrect(R(cx - w - 2), R(cy - 6), R(2 * w + 4), 8, grass, 2); c.rect(R(cx - w), R(cy + 1), R(2 * w), 2, grassD);
    // a tree
    const tx = R(cx - w * 0.35 + is.seed), ty = R(cy - 6);
    c.rect(tx - 1, ty - 14, 3, 14, trunk); c.disc(tx, ty - 20, 9, leaf); c.disc(tx - 3, ty - 23, 6, leafL); c.disc(tx + 6, ty - 15, 6, leaf);
    // waterfall off the right edge, falling and fading into mist
    const wx = R(cx + w * 0.7);
    for (let Y = R(cy); Y < R(cy + 70 * z); Y++) { const k = (Y - cy) / (70 * z); for (let X = wx; X < wx + 4; X++) if (1 - k > bayer(X, Y + R(T * 40))) c.px(X, Y, (Y + R(T * 60)) % 6 < 2 ? "#FFFFFF" : water); }
  }
}

// ---------------------------------------------------------------- birds (p 0.6): a small flock crossing right → left
export function drawBirds(c, cam, T, dark) {
  const L = layer(cam, 0.6), col = mix("#2A2440", "#0A0614", dark);
  for (let i = 0; i < 5; i++) {
    const x = L.X(cam.cx * 0.6 + 330 - (T + 0.4) * 70 - i * 22 - (i % 2) * 8), y = L.Y(cam.cy * 0.6 - 215 + i * 9 - (i % 2) * 14 + 3 * Math.sin(T * 2 + i));
    if (x < -10 || x > GW + 10) continue;
    const ph = Math.sin((T * 9 + i * 1.3) * 1.0), up = R(ph * 3);
    const X = R(x), Y = R(y);
    c.px(X, Y, col); c.px(X + 1, Y, col);
    for (let k = 1; k <= 4; k++) { const dy = R((up * k) / 4); c.px(X - k, Y - dy, col); c.px(X + 1 + k, Y - dy, col); }
  }
}

// ---------------------------------------------------------------- the staircase (actor plane p = 1)
const MARBLE = ["#3E3858", "#5E5680", "#8880A8", "#ACA6CA", "#CDC8E4", "#E8E5F4", "#FAF9FE"];
const THICK = 26;                      // world units from a tread down to the stringer's underside, below each front corner
/**
 * lit(n) → { col, k } | null: stair n glows in col with strength k (0..1+). dark tints the marble for the night.
 */
export function drawStairs(c, cam, dark, lit, T) {
  const G = ground(cam), z = G.z, m0 = Math.floor(G.wx(-40) / RUN) - 1, m1 = Math.ceil(G.wx(GW + 40) / RUN) + 1;
  const ramp = MARBLE.map((m) => mix(m, "#3A2A5E", dark * 0.55));
  const under = (wx) => -(wx / RUN) * RISE + THICK;
  // stringer side face: per column, from the sawtooth top down to the slanted underside
  const X0 = Math.max(0, Math.floor(G.X(m0 * RUN))), X1 = Math.min(GW - 1, Math.ceil(G.X(m1 * RUN)));
  for (let X = X0; X <= X1; X++) {
    const wx = G.wx(X + 0.5), n = Math.floor(wx / RUN), top = G.Y(-n * RISE), bot = G.Y(under(wx)), h = bot - top;
    if (h <= 0) continue;
    const L = lit(n), Ln = lit(n + 1);
    for (let Y = Math.max(0, Math.floor(top)); Y <= Math.min(GH - 1, Math.ceil(bot)); Y++) {
      const d = Y - top, u = d / h;
      let col;
      if (d < 1) col = ramp[6];
      else if (d < 1 + 2 * z) col = ramp[5];
      else if (Y > bot - 1.5) col = ramp[0];
      else if (Y > bot - 1.5 - 1.6 * z) col = mix("#C99A2A", "#F4CA50", bayer(X, Y) > 0.5 ? 1 : 0.4);   // gold trim
      else { const v = 4.6 - u * 2.6 + 0.6 * (fbm(wx * 0.05, (Y / z) * 0.05) - 0.5), i = Math.floor(v), f = v - i; col = ramp[Math.max(1, Math.min(5, f > bayer(X, Y) ? i + 1 : i))]; }
      // the riser seam of each stair
      const fx = (wx - n * RUN) * z; if (fx < 1 && d > 2) col = ramp[2];
      // glow from a lit tread above (and a little from the next stair's riser)
      if (L && L.k > 0) { const g = L.k * Math.exp(-d / (9 * z)) * 0.9; if (g > bayer(X, Y) * 0.9) col = mix(col, d < 2 * z + 1 ? tone(L.col, 0.55) : L.col, Math.min(1, g * 1.1)); }
      if (Ln && Ln.k > 0 && fx > RUN * z - 3 * z) { const g = Ln.k * 0.5 * (1 - (RUN * z - fx) / (3 * z)); if (g > bayer(X, Y)) col = mix(col, Ln.col, 0.5); }
      c.px(X, Y, col);
    }
  }
  // lit treads also throw a soft column of light upward (a thin dithered haze)
  for (let n = m0; n <= m1; n++) {
    const L = lit(n); if (!L || L.k <= 0) continue;
    const xa = G.X(n * RUN), xb = G.X((n + 1) * RUN), ty = G.Y(-n * RISE);
    for (let Y = R(ty - 34 * z); Y < R(ty); Y++) for (let X = Math.floor(xa); X < Math.ceil(xb); X++) { const k = L.k * 0.35 * (1 - (ty - Y) / (34 * z)) * (0.6 + 0.4 * Math.sin((X * 0.7 + T * 6 + n) * 0.9)); if (k > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), L.col, 0.45)); }
  }
}

// ---------------------------------------------------------------- the cloud sea below: rows of cloud tops to the bottom edge
// Row j: farther rows are smaller, hazier and move less (x and y parallax); the nearest row has big billows at the bottom.
const SEA = [{ y: 668, r: 13, px: 0.16, py: 0.10, drift: 3, haze: 0.55 }, { y: 712, r: 20, px: 0.3, py: 0.16, drift: 5, haze: 0.35 },
  { y: 770, r: 30, px: 0.52, py: 0.24, drift: 8, haze: 0.15 }, { y: 850, r: 46, px: 0.85, py: 0.34, drift: 12, haze: 0 }];
export function drawCloudSea(c, cam, T, dark, glow = null, ga = 0) {
  const lit = mix("#FFFFFF", "#9A78C8", dark), mid = mix("#DCE8FA", "#6A4C98", dark), shade = mix("#A8BCE6", "#432C6E", dark), deep = mix("#7E92C8", "#2C1C50", dark);
  const hazeC = mix("#C4E2FA", "#3A1B63", dark);
  SEA.forEach((row, j) => {
    const base = row.y - (cam.cy + 70) * row.py * cam.z, scroll = cam.cx * row.px * cam.z + row.drift * T, sp = row.r * 1.55;
    const k0 = Math.floor((scroll - row.r * 2) / sp), k1 = Math.ceil((scroll + GW + row.r * 2) / sp);
    const bumps = []; for (let k = k0; k <= k1; k++) { const r = row.r * (0.75 + 0.5 * rnd(k * 31 + j * 7)), bx = k * sp - scroll + (rnd(k * 17 + j) - 0.5) * row.r * 0.6, by = base - r * (0.35 + 0.4 * rnd(k * 13 + j * 3));
      bumps.push([bx, by, r]);
      // cumulus: two smaller puffs on top of each billow
      for (const [ox, s2] of [[-0.42, 0.52], [0.36, 0.44]]) { const rr = r * s2 * (0.8 + 0.4 * rnd(k * 7 + j + ox * 10)); bumps.push([bx + ox * r, by - r * 0.62 + rr * 0.35, rr]); } }
    for (let X = 0; X < GW; X++) {
      const near = bumps.filter((bb) => Math.abs(X + 0.5 - bb[0]) < bb[2]);
      let top = base; for (const bb of near) { const dx = X + 0.5 - bb[0]; top = Math.min(top, bb[1] - Math.sqrt(bb[2] * bb[2] - dx * dx)); }
      if (top >= GH) continue;
      for (let Y = Math.max(0, Math.floor(top)); Y < GH; Y++) {
        // shade by the billow this pixel belongs to (the one it is deepest inside), lit from the upper left
        let best = null, bd = 1;
        for (const bb of near) { const nx = (X + 0.5 - bb[0]) / bb[2], ny = (Y + 0.5 - bb[1]) / bb[2], d = nx * nx + ny * ny; if (d < bd) { bd = d; best = [nx, ny]; } }
        const v = best ? 2.25 - best[0] * 0.85 - best[1] * 1.25 + 0.25 * (vnoise(X * 0.15 + j * 9, Y * 0.15) - 0.5) : 0.9 - (Y - base) / (row.r * 3);
        const i = Math.floor(v), f = v - i, q = Math.max(0, Math.min(3, f > bayer(X, Y) ? i + 1 : i));
        let col = [deep, shade, mid, lit][q];
        if (row.haze > 0) col = mix(col, hazeC, row.haze);
        if (glow && ga > 0 && q >= 2) col = mix(col, glow, ga * 0.25);
        if (Y < top + 1) col = mix(col, "#FFFFFF", 0.3 * (1 - row.haze));
        c.px(X, Y, col);
      }
    }
  });
}
