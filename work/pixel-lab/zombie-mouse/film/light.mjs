// «The last person alive» — Builder W: the light of the third-person shots, shared by the world and the actors.
//  · Town (shot A): a low sun on the left at dusk → violet shade with a warm cast; as the camera finds the far fire a
//    faint warm bloom appears around it (only near the glow; he is far from it).
//  · Clearing (shots C, E): cool moonlight + warm firelight that falls off with distance from the flames and flickers.
//    Light is quantised into flat bands with a narrow Bayer seam, exactly like the world (clearing.mjs uses fireLight).
// Everything is a pure function of (pixel, cam, t).
import { bayer } from "../../../../renderer/pixel/raster.mjs";
import { ground, clamp01, sm } from "./layout.mjs";
import { EV } from "./timeline.mjs";
import { FIRE } from "./places.mjs";

export const FIRE_H = 12;                       // flames' centre height above the ground (world units)
export const MOON = [0.36, 0.43, 0.64];         // moonlight + sky ambient on a lit-by-nothing surface (multiplier)
export const FIRECOL = [1.1, 0.7, 0.34];      // firelight colour (multiplier per unit of intensity)

/** Screen point of the flames' centre for camera cam. */
export function fireScreen(cam) { const G = ground(cam); return { x: G.X(FIRE.x), y: G.Y(-FIRE_H) }; }

/** Fire brightness over time: a few incommensurate sines, smooth (no frame-to-frame jumps), ±12 %. */
export function flicker(t) {
  return 1 + 0.05 * Math.sin(t * 9.7) + 0.035 * Math.sin(t * 15.3 + 1.7) + 0.025 * Math.sin(t * 23.9 + 0.4) + 0.015 * Math.sin(t * 37.1 + 2.2);
}
/** Firelight falloff for squared world distance d2 from the flames: a hot core and a long soft tail. */
export function fireFall(d2) { return 0.92 / (1 + d2 / 2025) + 0.3 / (1 + d2 / 12100); }

/** Extra gloom while the camera turns to the deep forest (the lead passes the same value as st.dark). */
export const clearingDark = (t) => sm(t, EV.it2, EV.and1);

/** Fire intensity at screen (X, Y) on depth layer p (1 = the actors' plane). dz: depth separation in world units. */
export function fireLight(X, Y, cam, t, fire, p = 1, F = fireScreen(cam)) {
  const z = 1 + (cam.z - 1) * p, dx = (X - F.x) / z, dy = (Y - F.y) / z, ip = 1 / Math.max(0.05, p), dz = ip > 1 ? (ip - 1) * 150 : (1 - ip) * 420;
  return fire * flicker(t) * fireFall(dx * dx + dy * dy + dz * dz);
}

const bandQ = (v, X, Y) => { const fl = Math.floor(v), f = v - fl; return f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > bayer(X, Y) ? fl + 1 : fl; };
const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/** Actor pixel in the clearing: cool, slightly desaturated moonlight + banded warm firelight. */
export function gradeClearing(rgb, X, Y, cam, t, fire = 1, dark = clearingDark(t)) {
  const I = bandQ(fireLight(X, Y, cam, t, fire) * 7, X, Y) / 7;
  const l = 0.3 * rgb[0] + 0.55 * rgb[1] + 0.15 * rgb[2], moon = 1 - 0.45 * dark;
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) { const base = rgb[i] + (l - rgb[i]) * 0.3; out[i] = cl(base * MOON[i] * moon + rgb[i] * FIRECOL[i] * I); }
  return out;
}

/** Glow of the far fire in the town (screen point, strength) — set by town.mjs so the grade can use it. */
export const TOWN_GLOW = { x: 400, y: 505, k: (t) => sm(t, 7.7, 8.4) };
/** Actor pixel in the town at dusk: warm-violet shade from the low sun on the left, a touch warmer higher up. */
export function gradeTown(rgb, X, Y, t) {
  const up = clamp01((620 - Y) / 260);                                   // head and shoulders catch more of the low sun
  const kr = 0.9 + 0.08 * up, kg = 0.74 + 0.05 * up, kb = 0.84 - 0.02 * up;
  const g = TOWN_GLOW.k(t), dg = g > 0 ? g * 0.35 / (1 + ((X - TOWN_GLOW.x) ** 2 + (Y - TOWN_GLOW.y) ** 2) / 9000) : 0;
  const l = 0.3 * rgb[0] + 0.55 * rgb[1] + 0.15 * rgb[2];
  return [cl((rgb[0] * 0.9 + l * 0.1) * kr + 22 * up + 255 * dg * 0.6), cl((rgb[1] * 0.9 + l * 0.1) * kg + 6 * up + 255 * dg * 0.3), cl((rgb[2] * 0.9 + l * 0.1) * kb + 14)];
}
