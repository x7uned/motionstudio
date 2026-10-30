// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-heart/film/levels/snow.mjs (SNOW/TOPS/SOIL/CLAY/SAND/ROCK/PINE palettes,
// ground(), rock(), pine()). Changes: G/snowT/rockTop are plain functions of x (no beach, shore or burrow), the soil/clay split sits at
// film y 90, the sand-beach blend is off; imports point to catalog libs.
import { bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, sm, R } from "./sea-kit.mjs";
export const GY = -20;                                              // snow top (film y); the stage shows it at y 565
export const G = (x) => GY + R(2.2 * Math.sin(x * 0.031) + 1.2 * Math.sin(x * 0.09 + 1));
export const snowT = (x) => 15 + R(2 * Math.sin(x * 0.07));
export const rockTop = (x) => 232 + R(8 * Math.sin(x * 0.02));
const SNOW = { lip: "#FFF8F2", top: "#FBEFF0", body: "#ECE6F6", mid: "#DCD6F0", shade: "#C2BEE6", deep: "#A6A4D6", out: "#6A68A8" };
const TOPS = ["#33242A", "#2A1E24"], SOIL = ["#4A3634", "#42302E", "#56403A"], CLAY = ["#5A4034", "#50392E", "#64483A"], SAND = ["#E2CC9C", "#D4BA86", "#C6A874"];
const ROCK = ["#3E4558", "#454C60", "#4B5266", "#41475A", "#50586C", "#3A4052"];
const PINE = ["#152C36", "#1C3A44", "#24505A", "#2E6468", "#3C7A78"];

export function ground(x, y) {
  const g = G(x), s = snowT(x), d = y - g;                          // depth below the snow top
  if (d < s) {                                                     // snow layer, lit from the dawn sky
    if (d <= 0) return SNOW.lip; if (d === 1) return SNOW.top;
    const v = d / Math.max(1, s); let col = v < 0.35 ? SNOW.body : v < 0.7 ? ((v - 0.35) / 0.35 > bayer(x, y) ? SNOW.mid : SNOW.body) : v < 0.92 ? SNOW.mid : SNOW.shade;
    if (rnd(x * 31 + y * 17) < 0.03) col = "#FFFFFF"; else if (rnd(x * 7 + y * 41) < 0.03) col = SNOW.shade;
    return col;
  }
  if (d === s) return SNOW.out;
  const rt = rockTop(x) + (rnd(Math.floor(x / 5) * 5) - 0.5) * 8;
  if (y >= rt) return rock(x, y);                                                // granite: stacked rounded blocks
  const ds = d - s, sand = 0;
  let col;
  if (ds < 22) { col = TOPS[(rnd(x * 13 + y * 7) < 0.25) | 0]; if (rnd(x * 17 + y * 3) < 0.025) col = "#8A98B8"; }   // frozen topsoil with frost
  else if (y < 90) { col = SOIL[rnd(x * 5 + y * 29) < 0.18 ? 1 : rnd(x * 3 + y * 11) < 0.1 ? 2 : 0]; if ((y + R(Math.sin(x * 0.05) * 3)) % 23 === 0) col = SOIL[1]; }
  else { col = CLAY[rnd(x * 5 + y * 29) < 0.18 ? 1 : rnd(x * 3 + y * 11) < 0.1 ? 2 : 0]; if ((y + R(Math.sin(x * 0.04) * 4)) % 19 === 0) col = CLAY[1]; }
  if (ds === 22 || (y >= 89 && y < 90 && ds > 22)) col = mix(col, "#1E120A", 0.25);
  if (sand > 0 && sand > bayer(x, y) * 0.95) col = SAND[ds < 3 ? 0 : rnd(x * 7 + y * 3) < 0.2 ? 2 : 1];
  if (rnd(x * 97 + y * 31) < 0.006) col = "#6E6A78";                                           // pebbles
  if (y > rt - 3) col = mix(col, "#1E1610", 0.35);
  return col;
}
function rock(x, y) {
  const S = 38, cx = Math.floor(x / S), cy = Math.floor(y / (S * 0.8));
  let d1 = 1e9, d2 = 1e9, id = 0, px0 = 0, py0 = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = cx + i, gy = cy + j, k = gx * 7919 + gy * 104729, px = (gx + 0.2 + rnd(k) * 0.6) * S, py = (gy + 0.2 + rnd(k + 1) * 0.6) * S * 0.8;
    const d = Math.hypot((x - px) * 0.9, y - py);
    if (d < d1) { d2 = d1; d1 = d; id = k; px0 = px; py0 = py; } else if (d < d2) d2 = d;
  }
  if (d2 - d1 < 1.4) return "#1E2230";
  const base = ROCK[Math.floor(rnd(id + 3) * ROCK.length)], u = (x - px0) / S, v = (y - py0) / (S * 0.8);
  let col = base;
  if (d2 - d1 < 3.2 && (u > 0.05 || v > 0.05)) col = mix(base, "#1E2230", 0.3);           // shadowed lower-right rim
  else if (d2 - d1 < 3.2) col = mix(base, "#C8D4EC", 0.18);                                // lit upper-left rim
  else if (u + v < -0.45) col = mix(base, "#C8D4EC", 0.07);
  if (rnd(x * 131 + y * 71) < 0.006) col = mix(base, "#C8D0E0", 0.35);
  return col;
}

// ---------------------------------------------------------------- static layers (drawn once)
export function pine(g, x, base, h, w, seed) {
  const tiers = Math.max(4, Math.floor(h / 34));
  g.rect(R(x - 3), R(base - h * 0.22), 6, R(h * 0.22) + 4, "#3A2620"); g.rect(R(x - 3), R(base - h * 0.22), 2, R(h * 0.22) + 4, "#5A3C2E");
  for (let k = 0; k < tiers; k++) {
    const ty = base - h * 0.16 - (k / tiers) * h * 0.84, th = (h * 0.84) / tiers * 1.55, tw = w * (1 - k / tiers * 0.82);
    for (let yy = R(ty - th); yy <= R(ty); yy++) {
      const v = (yy - (ty - th)) / th, half = tw * (0.18 + 0.82 * v) + (rnd(yy * 7 + seed) - 0.5) * 3;
      for (let xx = R(x - half); xx <= R(x + half); xx++) {
        const u = (xx - x) / Math.max(1, half);
        let col = u < -0.35 ? PINE[3] : u < 0.25 ? PINE[2] : PINE[1];
        if (v > 0.85) col = PINE[0];
        if (Math.abs(u) > 0.92 || yy === R(ty)) col = PINE[0];
        // snow resting on each tier: a lumpy white band on the upper part of the tier, heavier on the lit side
        const snowLine = 0.32 + 0.1 * Math.sin(xx * 0.6 + k) + (u < 0 ? -0.05 : 0.06);
        if (v < snowLine && Math.abs(u) < 0.98) col = v < snowLine - 0.12 ? SNOW.top : u < 0.1 ? SNOW.body : SNOW.mid;
        g.px(xx, yy, col);
      }
    }
  }
  g.px(R(x), R(base - h - 2), SNOW.lip); g.px(R(x), R(base - h - 1), SNOW.top);
}
