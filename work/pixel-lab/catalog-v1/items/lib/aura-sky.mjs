// catalog-v1 copy (2026-10-26) of aura-full/film/world.mjs: drawSky, drawSunMoon, drawClouds, drawCloudSea (+ vnoise/fbm).
// Changes: imports re-pointed to catalog engine/layout; sun placed at the rest-screen upper right (not the film stair
// camera); mid clouds lifted by +330 and cloud-sea rows by -80 to sit in the stage frame; stars/islands/birds/stairs not copied.
import { mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { layer, clamp01, lerp, rnd, GW, GH } from "../../engine/layout.mjs";
const R = Math.round, PI = Math.PI;


export const tone = (col, k) => (k < 0 ? mix(col, "#05030C", -k) : mix(col, "#FFFFFF", k));

const h2 = (x, y) => rnd((x * 7919) ^ (y * 104729) ^ 0x5bd1e995);

export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export const fbm = (x, y) => 0.55 * vnoise(x, y) + 0.3 * vnoise(x * 2.1 + 17, y * 2.1 + 5) + 0.15 * vnoise(x * 4.3 + 3, y * 4.3 + 29);


const DAY = ["#2F6FD0", "#4E8FE2", "#73AEEE", "#9CCBF5", "#C4E2FA", "#E6F4FF"];

const NIGHT = ["#0C0824", "#170E3A", "#26144F", "#3A1B63", "#592676", "#86377F"];

export function drawSky(c, cam, dark) {
  const off = cam.cy * 0.08;
  for (let y = 0; y < GH; y++) {
    const u = clamp01((y + off + 60) / (GH + 40)) * (DAY.length - 1), i = Math.floor(u), f = u - i;
    const top = mix(DAY[i], NIGHT[i], dark), bot = mix(DAY[Math.min(5, i + 1)], NIGHT[Math.min(5, i + 1)], dark);
    for (let x = 0; x < GW; x++) { const q = f > 0.25 && f < 0.75 ? ((f - 0.25) * 2 > bayer(x, y) ? bot : top) : f >= 0.75 ? bot : top; const k = (y * GW + x) * 3; c.d[k] = q[0]; c.d[k + 1] = q[1]; c.d[k + 2] = q[2]; }
  }
}

export function drawSunMoon(c, cam, dark) {
  const L = layer(cam, 0.06), x = R(L.X(400)), y = R(L.Y(150)), r = 44;
  const disc = { x, y, r };
  // glow rings
  for (let k = 3; k >= 1; k--) { const rr = r + k * 10, col = mix(mix("#FFF4C8", "#C8B8FF", dark), "#FFFFFF", 0), a = 0.16 * (4 - k); c.dither(x - rr, y - rr, 2 * rr + 1, 2 * rr + 1, (X, Y) => { const d = Math.hypot(X - x, Y - y); return d < rr && d >= rr - 10 ? a : 0; }, col); }
  const sun = fade(c, 1 - dark), moon = fade(c, dark);
  if (dark < 1) { sun.disc(x, y, r, "#FFF2B0"); sun.disc(x - 6, y - 6, r - 12, "#FFF9DA"); sun.disc(x - 12, y - 12, r - 30, "#FFFFFF"); }
  if (dark > 0) {
    moon.disc(x, y, r, "#E6E0FA"); moon.disc(x + 4, y + 4, r - 6, "#D2CAF0");
    for (const [cx, cy, cr] of [[-14, -10, 9], [12, 6, 12], [-4, 18, 6], [16, -18, 5], [-22, 12, 4]]) { moon.disc(x + cx, y + cy, cr, "#BCB2E0"); moon.disc(x + cx - 1, y + cy - 1, Math.max(1, cr - 3), "#C8BFEA"); }
  }
  return disc;
}


const CLOUDS = (() => {
  const out = [];
  const make = (seed, w, h) => { const b = []; const n = 7 + Math.floor(rnd(seed) * 5); for (let i = 0; i < n; i++) { const u = i / (n - 1), r = h * (0.45 + 0.55 * Math.sin(PI * u)) * (0.7 + 0.4 * rnd(seed * 13 + i)); b.push([(u - 0.5) * w, -r * 0.55 + rnd(seed * 7 + i) * 6, r]); } return b; };
  // far cloud sea (p 0.18), mid clouds (p 0.5), near clouds (p 1.5)
  for (let i = 0; i < 14; i++) out.push({ p: 0.18, x: -500 + i * 95 + rnd(i) * 40, y: 250 + rnd(i + 50) * 30, blobs: make(i + 1, 140, 46), drift: 2 });
  for (let i = 0; i < 26; i++) out.push({ p: 0.5, x: -380 + (i % 9) * 170 + rnd(i + 9) * 60, y: -40 - rnd(i + 70) * 260 + (i % 2) * 120 - Math.floor(i / 9) * 360, blobs: make(i + 30, 120 + rnd(i) * 60, 30 + rnd(i + 3) * 14), drift: 5 });
  return out;
})();

const CLOUD_DAY = ["#8FA6D8", "#B8CAEE", "#E2ECFC", "#FFFFFF"], CLOUD_NIGHT = ["#2A1A50", "#43286E", "#62408C", "#8A62B0"];

export function drawClouds(c, cam, T, dark, depth, glow = null, ga = 0) {
  const P = depth === "far" ? 0.18 : depth === "mid" ? 0.5 : 1.45;
  const ramp = CLOUD_DAY.map((d, i) => mix(d, CLOUD_NIGHT[i], dark));
  for (const cl of CLOUDS) {
    if (cl.p !== P) continue;
    const L = layer(cam, P), cx = L.X(cl.x - cl.drift * T + cam.cx * P * 0), cy = L.Y(cl.y + (depth === "mid" ? 330 : 0)), z = L.z;
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


const SEA = [{ y: 588, r: 13, px: 0.16, py: 0.012, drift: 3, haze: 0.55 }, { y: 632, r: 20, px: 0.3, py: 0.02, drift: 5, haze: 0.35 },
  { y: 690, r: 30, px: 0.52, py: 0.03, drift: 8, haze: 0.15 }, { y: 770, r: 46, px: 0.85, py: 0.045, drift: 12, haze: 0 }];

export function drawCloudSea(c, cam, T, dark, glow = null, ga = 0) {
  const lit = mix("#FFFFFF", "#9A78C8", dark), mid = mix("#DCE8FA", "#6A4C98", dark), shade = mix("#A8BCE6", "#432C6E", dark), deep = mix("#7E92C8", "#2C1C50", dark);
  const hazeC = mix("#C4E2FA", "#3A1B63", dark);
  const done = new Uint8Array(GW * GH);   // catalog: paint near rows first and skip covered pixels (same picture, 3x cheaper)
  for (let j = SEA.length - 1; j >= 0; j--) { const row = SEA[j];
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
        if (done[Y * GW + X]) continue; done[Y * GW + X] = 1;
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
  }
}


