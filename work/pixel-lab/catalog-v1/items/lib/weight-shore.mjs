// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-weight/film/levels/shore.mjs (terrain, back) with the helpers of
// ocean-sea.mjs it uses (under, seaWater / seaBand, swash) and the 5 constants of timeline.mjs it needs.
// Changes: daylight only (the film's dawn/night tint and meadow grade are dropped); the sand/dune/meadow part of the
// profile is moved D = 120 px to the right so the flat beach fills the prop slots (dune and flowers at the right edge);
// meadow, tufts and flowers continue to the far right; the world is painted 200 px beyond both stage edges for camera
// moves; the sea water, far sea band and swash are re-drawn per screen pixel through the camera (zoom aware) and the
// film's glitter/sun are not part of it; the starfish moved into view; film actors (balance seesaw, bees, whale) not copied.
// World coordinates are the film's; stage x = wx − OX, stage y = wy + OY.
import { bayer, mix, hex } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, sm } from "./cute.mjs";
import { Cache, profile, R } from "./ws6-common.mjs";

export const OX = 5290, OY = 584;
const X0 = 5130, X1 = 6100, LAND = -20, WATERLINE = 5388, D = 120;
export const ground = profile([[X0, 480], [5170, 420], [5220, 340], [5268, 250], [5310, 158], [5344, 76], [5368, 26], [5384, 4], [5396, -4], [5420, -10],
  [5460, -13], [5560, -14], [5596 + D, -18], [5616 + D, -28], [5634 + D, -32], [5650 + D, -27], [5662 + D, -22], [X1, LAND]]);

const SAND = ["#5A4028", "#80603A", "#A8804E", "#C89E62", "#DDB878", "#EBCB8E", "#F4DCA6", "#FCEBC4"];
const STRATA = ["#E4C48C", "#D6B078", "#CBA26A", "#DDB982", "#C2965E", "#D2AA72"];
const GRASS = ["#1E3A1C", "#2C5426", "#3C6E2E", "#548C38", "#6EA844", "#8EC056", "#B0D46E", "#D2E894"];
const MARRAM = ["#3A4A20", "#5A6A2A", "#7A8A3A", "#9AA84E", "#B8C266", "#D2D68A"];
const WOOD = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488", "#F0D2A8"];
const FLW = [["#F48AB0", "#FFE070"], ["#FFD84A", "#E08A20"], ["#FFFFFF", "#F8C840"], ["#B07CE8", "#FFE890"]];
const MGRASS = ["#B4E07A", "#A2D86E", "#8ECC62", "#7CBE58", "#6AB04E", "#5AA046", "#4C9040", "#40803A", "#36713A", "#2C6234", "#24542E"];
function fieldAt(wx, wy, d) {
  const v = Math.min(MGRASS.length - 1.001, Math.sqrt(Math.max(0, d) / 330) * 6.6), lo = Math.floor(v), fr = v - lo;
  let col = MGRASS[Math.min(MGRASS.length - 1, fr > 0.5 + 0.45 * (bayer(wx, wy) - 0.5) ? lo + 1 : lo)];
  if (rnd(wx * 31 + wy * 17) < 0.04) col = mix(col, "#2C6234", 0.5);
  return col;
}
/** Colour of a static thing at world depth wy below the surface (fixed blue water veil). */
function under(col, wy) { if (wy <= 0) return hex(col); const k = Math.min(0.62, 0.18 + wy / 900); return mix(col, wy < 160 ? "#2E8AB0" : "#1C5486", k); }

let LAND_C = null, FIELD_C = null;
export function terrain() {
  if (LAND_C) return [LAND_C, FIELD_C];
  const P = 5560;                                         // field cache start
  FIELD_C = new Cache(P, -90, X1 - P, 600, () => {});
  const fg = FIELD_C.g;
  LAND_C = new Cache(X0, -90, X1 - X0, 600, (g) => {
    for (let wx = X0; wx < X1; wx++) {
      const gy = ground(wx), wetEdge = wx < WATERLINE + 34;
      for (let wy = R(gy); wy < 510; wy++) {
        const d = wy - gy, b = bayer(wx, wy);
        const wv = Math.sin(wx * 0.029) * 4 + Math.sin(wx * 0.1) * 2, v = (wy + wv + 400) / 20, band = Math.floor(v), f = v - band;
        let col = STRATA[band % STRATA.length]; if (f < 0.08 && b > 0.4) col = mix(col, "#7A5636", 0.22);
        col = mix(col, "#8A6440", Math.min(0.5, Math.max(0, wy + 10) / 600));
        if (d > 5 && rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#FFF4D8", 0.5); else if (d > 5 && rnd(wx * 29 + wy * 17) < 0.006) col = mix(col, "#5A3A22", 0.45);
        if (wy > -1 && wx < WATERLINE + 90 && sm(wx, WATERLINE - 10, WATERLINE + 90) <= b) {   // seabed under the water (dithered seam toward the dry beach)
          if (d < 2) col = (Math.sin(wx * 0.45 + wy * 0.2) > 0.3 ? "#E0CC9C" : "#C8B48A"); else if (d < 4) col = "#A89470";
          col = under(col, wy);
        } else if (wetEdge && d < 6) col = d < 1.5 ? "#C4A878" : "#A88C62";
        else if (wx > 5590 + D && d < 5) {
          const gk = sm(wx, 5596 + D, 5640 + D); col = d < 2 ? mix(SAND[7], GRASS[5], gk) : mix(SAND[6], "#7A5232", gk * 0.8);
        } else if (d < 2) col = SAND[7]; else if (d < 4) col = SAND[6]; else if (d < 7 && b < 0.5) col = SAND[5];
        if (wx > 5600 + D && d >= 5 && d < 18 + Math.sin(wx * 0.3) * 2) col = mix(col, d < 9 ? "#7A5232" : "#6A4628", sm(wx, 5600 + D, 5650 + D));
        const gk = sm(wx + Math.sin(wy * 0.07) * 9 + Math.sin(wy * 0.023 + 1) * 14, 5584 + D, 5650 + D);
        if (gk > 0 && gk > bayer(wx, wy) * 0.9 + 0.05 && d >= 3) { fg.px(wx, wy, fieldAt(wx, wy, wy - LAND)); continue; }
        g.px(wx, wy, col);
      }
    }
    // seabed life: sea grass, pebbles, shells, a starfish
    for (let i = 0; i < 16; i++) { const wx = X0 + 30 + rnd(i * 7) * 230, gy = R(ground(wx)); for (let s = -1; s <= 1; s++) { const h = 8 + rnd(i * 5 + s) * 16; for (let k = 0; k < h; k++) g.px(R(wx + s * 3 + Math.sin(k * 0.4 + i + s) * 1.5), gy - k, under(k > h - 4 ? "#8ACB74" : "#4E9A62", gy)); } }
    for (let i = 0; i < 22; i++) { const wx = X0 + 20 + rnd(i * 3 + 1) * 250, gy = R(ground(wx)), k = rnd(i * 5); if (k < 0.5) { g.px(wx, gy - 1, under("#8A9890", gy)); g.px(wx + 1, gy - 1, under("#B8C4BC", gy)); g.px(wx - 1, gy, under("#6A7870", gy)); } else { g.px(wx, gy - 1, under("#F8EAE0", gy)); g.px(wx + 1, gy - 1, under("#E8C8C0", gy)); } }
    { const wx = 5346, wy = R(ground(5346)) - 3, col = under("#F08A5A", wy), hi = under("#FFC48A", wy); for (let a = 0; a < 5; a++) { const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5; for (let r = 0; r < 6; r++) g.px(R(wx + Math.cos(ang) * r), R(wy + Math.sin(ang) * r * 0.7), r < 2 ? hi : col); } }
    // beach: shells, pebbles, a piece of driftwood (moved to the right of the slots)
    for (const [wx, col] of [[5412, "#F8C8C0"], [5436, "#FFF0E0"], [5478, "#F0D0F0"], [5584, "#FFE8D0"], [5446, "#E8D8C8"], [5660, "#F8C8C0"]]) { const gy = R(ground(wx)) - 1; g.px(wx, gy, col); g.px(wx + 1, gy, col); g.px(wx - 1, gy, mix(col, "#806040", 0.4)); g.px(wx, gy - 1, col); }
    for (let k = 0; k < 26; k++) { const wx = 5700 + k, gy = R(ground(wx)) - 2 - (k > 4 && k < 22 ? 1 : 0); g.px(wx, gy, k % 7 === 0 ? WOOD[3] : WOOD[5]); g.px(wx, gy + 1, WOOD[2]); if (k > 3 && k < 23) g.px(wx, gy - 1, WOOD[6]); }
    // marram tufts on the dune, then meadow grass
    for (let i = 0; i < 54; i++) {
      const wx = 5560 + i * 9.6 + rnd(i) * 3, gy = ground(wx), meadow = sm(wx, 5612 + D, 5650 + D), h = 8 + rnd(i * 5) * 12 - meadow * 3;
      for (let s = -2; s <= 2; s++) for (let k = 0; k < h; k++) {
        const x = R(wx + s * 1.8 + (s * k) / (5 + meadow * 3)), y = R(gy - k), m = k > h - 3 ? 5 : k > h / 2 ? 4 : 2;
        g.px(x, y, meadow > rnd(i * 31 + s) ? GRASS[m + 1] : MARRAM[m]);
      }
    }
    for (let i = 0; i < 130; i++) { const wy = R(-10 + rnd(i * 3 + 1) ** 1.4 * 340), wx = R(5724 + rnd(i * 3 + 2) * 330 + wy * 0.05), [p, q] = FLW[i % FLW.length], r = wy < 60 ? 0 : wy < 180 ? 1 : 2;
      if (wx >= X1 - r - 1 || !FIELD_C.g.has(wx, wy)) continue;
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + 0.5) fg.px(wx + xx, wy + yy, yy > 0 && r > 1 ? mix(p, "#000000", 0.2) : p);
      fg.px(wx, wy, r ? q : p); if (r === 0) { fg.px(wx - 1, wy, p); fg.px(wx + 1, wy, p); fg.px(wx, wy - 1, p); }
    }
    for (let i = 0; i < 22; i++) { const wx = R(5680 + i * 12 + rnd(i * 9) * 3), gy = R(ground(wx)) - 6 - R(rnd(i) * 6), [p, q] = FLW[i % FLW.length]; g.px(wx, gy + 1, GRASS[3]); g.px(wx, gy + 2, GRASS[3]); g.px(wx - 1, gy, p); g.px(wx + 1, gy, p); g.px(wx, gy - 1, p); g.px(wx, gy + 1, GRASS[3]); g.px(wx, gy, q); }
  });
  return [LAND_C, FIELD_C];
}

// ---------------------------------------------------------------- per-frame water (V = stage-world camera view with .X/.Y; Vs maps screen → film world)
/** Camera view in film world coordinates from the stage camera layer V. */
export function film(V) { return { z: V.z, X: (wx) => V.X(wx - OX), Y: (wy) => V.Y(wy + OY), wx: (sx) => V.wx(sx) + OX, wy: (sy) => V.wy(sy) - OY }; }

const SHALLOW = "#3ACCD8", MID = "#1A6EAA", DEEP = "#0A1A3A", ABYSS = "#06102A";
const BAND = ["#D8F0F2", "#A8DCE2", "#8ACFD8", "#62C2D0"];
/** The sea body below the surface wy = 0 between film world x0..x1 (banded depth, swaying light shafts, a wavy bright surface line). */
export function seaWater(c, Vf, t, x0, x1) {
  const sx0 = Math.max(0, R(Vf.X(x0))), sx1 = Math.min(c.w, R(Vf.X(x1))), sy0 = Math.max(0, R(Vf.Y(0)));
  if (sx0 >= sx1 || sy0 >= c.h) return;
  const steps = [SHALLOW, MID, DEEP, ABYSS], d = c.d, W = c.w;
  for (let y = sy0; y < c.h; y++) {
    const wy = Vf.wy(y + 0.5), v = wy < 900 ? (wy / 900) * 2 : 2 + Math.min(1, (wy - 900) / 900), lo = Math.floor(v), f = v - lo;
    const sub = f * 4, sl = Math.floor(sub), sf = sub - sl, A = steps[Math.min(3, lo)], B = steps[Math.min(3, lo + 1)], ca = hex(mix(A, B, sl / 4)), cb = hex(mix(A, B, Math.min(4, sl + 1) / 4));
    for (let x = sx0; x < sx1; x++) { const cc = sf > bayer(x, y) ? cb : ca, i = (y * W + x) * 3; d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; }
  }
  for (let k = 0; k < 7; k++) {
    const wx0 = x0 + (k + 0.3) * ((x1 - x0) / 7) + Math.sin(t * 0.35 + k * 1.7) * 18, wid = (10 + rnd(k * 9) * 18) * Vf.z, slant = 0.32;
    for (let y = sy0; y < c.h; y++) {
      const wy = Vf.wy(y + 0.5), fall = Math.max(0, 1 - wy / (700 + rnd(k) * 300)); if (fall <= 0) break;
      const cx = Vf.X(wx0 + wy * slant); for (let x = R(cx - wid); x <= R(cx + wid); x++) { if (x < sx0 || x >= sx1) continue; const e = 1 - Math.abs(x - cx) / wid; if (e * fall * 0.42 > bayer(x, y) + 0.08) c.px(x, y, mix(c.get(x, y), "#BFF6FF", 0.22)); }
    }
  }
  if (sy0 > 0) for (let x = sx0; x < sx1; x++) { const wv = R(Math.sin(Vf.wx(x + 0.5) * 0.09 + t * 2.2) * 1.5); c.px(x, sy0 + wv, "#E8FFFF"); c.px(x, sy0 + wv + 1, mix(SHALLOW, "#FFFFFF", 0.4)); }
}
/** The far sea band (receding surface up to the horizon) rows wy −h..0, tapering out over the beach (edge(wx) = top row kept). */
export function seaBand(c, Vf, t, x0, x1, h, edge) {
  const sx0 = Math.max(0, R(Vf.X(x0))), sx1 = Math.min(c.w, R(Vf.X(x1))); if (sx0 >= sx1) return;
  const ya = Math.max(0, R(Vf.Y(-h))), yb = Math.min(c.h, R(Vf.Y(0)));
  for (let y = ya; y < yb; y++) {
    const wy = Vf.wy(y + 0.5), v = (wy + h) / h, q = Math.max(0, Math.min(2.999, v * 3)), lo = Math.floor(q), f = q - lo;
    for (let x = sx0; x < sx1; x++) {
      const wx = Vf.wx(x + 0.5); if (wy < edge(wx)) continue;
      let col = f > bayer(x, y) ? BAND[Math.min(3, lo + 1)] : BAND[lo];
      if (v > 0.2 && ((R(wx * 7) + R(wy * 13)) % 23) === 0) col = BAND[Math.max(0, lo - 1)];
      c.px(x, y, col);
    }
  }
}
/** A low hazy far shore behind the beach, sinking into the horizon toward the sea. */
export function farShore(c, Vf) {
  const haze = "#A8C8B0";
  for (let x = 0; x < c.w; x++) {
    const wx = Vf.wx(x + 0.5); if (wx < X0 || wx > X1) continue;
    const h = 14 * sm(wx, WATERLINE - 80, WATERLINE + 60) * (1 - sm(wx, WATERLINE + 60, WATERLINE + 150)) + 6 * Math.sin(wx * 0.05) * sm(wx, WATERLINE, WATERLINE + 80) * (1 - sm(wx, WATERLINE + 80, WATERLINE + 150));
    const ya = Math.max(0, R(Vf.Y(-34 - h))), yb = Math.min(c.h, R(Vf.Y(-10)));
    for (let y = ya; y < yb; y++) { const wy = Vf.wy(y + 0.5); if (wy > -34 || bayer(x, y) < 0.92) c.px(x, y, wy < -32 - h ? mix(haze, "#FFFFFF", 0.3) : haze); }
  }
}
/** Swash: a thin sheet of water running up the wet sand and sliding back, with a foam edge. */
export function swash(c, Vf, t) {
  const sw = WATERLINE + 8 + 12 * (0.5 + 0.5 * Math.sin(t * 1.25)) + 3 * Math.sin(t * 2.9), z = Math.max(1, R(Vf.z));
  for (let sx = 0; sx < c.w; sx++) {
    const wx = Vf.wx(sx + 0.5); if (wx < WATERLINE - 6 || wx >= sw) continue;
    const y = R(Vf.Y(ground(wx))), edge = sw - wx < 3;
    c.rect(sx, y - z, 1, z, edge ? "#FFFFFF" : "#A8E0F0"); if (edge || R(wx) % 5 === 0) c.rect(sx, y - 2 * z, 1, z, "#F4FFFF");
  }
}
export const WL = WATERLINE;
