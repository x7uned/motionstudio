// Shore (RANGE BIOME.shore = 5130..5670) — seen during the loop pan at dawn (≈ EV.how → END) from the whale back to the
// meadow. The night sea gets shallower to the right: a sandy seabed with ripples, sea grass, shells and a starfish rises
// to a dawn beach (foamy swash, wet then dry sand, shells, driftwood, marram tufts), a low dune, and spring meadow grass
// with small flowers at x 5670 (= the LV1 meadow at x 0). On "bees … giant" a driftwood seesaw on the beach balances a
// whale silhouette against a swarm of bees that streams in from the meadow ("1,000,000,000+ BEES").
// Loop rule: nothing is drawn at x ≥ 5670 once the camera settles (the last frame must equal the first).
import { BIOME, EV, LAND, END } from "../timeline.mjs";
import { panel, sm, ease, win, rnd, fade, mix, bayer, C, MAIN } from "../cute.mjs";
import { R, clamp01, seaWater, seaBand, sceneTint, light, Cache, profile, under, icon, ICON } from "./ocean-sea.mjs";

export const RANGE = BIOME.shore;
const [X0, X1] = RANGE;
const WATERLINE = 5388;
export const ground = profile([[X0, 480], [5170, 420], [5220, 340], [5268, 250], [5310, 158], [5344, 76], [5368, 26], [5384, 4], [5396, -4], [5420, -10],
  [5460, -13], [5500, -14], [5560, -14], [5596, -18], [5616, -28], [5634, -32], [5650, -27], [5662, -22], [X1, LAND]]);

const SAND = ["#5A4028", "#80603A", "#A8804E", "#C89E62", "#DDB878", "#EBCB8E", "#F4DCA6", "#FCEBC4"];
const STRATA = ["#E4C48C", "#D6B078", "#CBA26A", "#DDB982", "#C2965E", "#D2AA72"];
const GRASS = ["#1E3A1C", "#2C5426", "#3C6E2E", "#548C38", "#6EA844", "#8EC056", "#B0D46E", "#D2E894"];
const MARRAM = ["#3A4A20", "#5A6A2A", "#7A8A3A", "#9AA84E", "#B8C266", "#D2D68A"];
const WOOD = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488", "#F0D2A8"];
const FLW = [["#F48AB0", "#FFE070"], ["#FFD84A", "#E08A20"], ["#FFFFFF", "#F8C840"], ["#B07CE8", "#FFE890"]];

// the meadow's ground: same perspective ramp and time-of-day grade as the LV1 meadow (copied from meadow-kit grassAt/grade)
const MGRASS = ["#B4E07A", "#A2D86E", "#8ECC62", "#7CBE58", "#6AB04E", "#5AA046", "#4C9040", "#40803A", "#36713A", "#2C6234", "#24542E"];
function fieldAt(wx, wy, d) {
  const v = Math.min(MGRASS.length - 1.001, Math.sqrt(Math.max(0, d) / 330) * 6.6), lo = Math.floor(v), fr = v - lo;
  let col = MGRASS[Math.min(MGRASS.length - 1, fr > 0.5 + 0.45 * (bayer(wx, wy) - 0.5) ? lo + 1 : lo)];
  if (rnd(wx * 31 + wy * 17) < 0.04) col = mix(col, "#2C6234", 0.5);
  return col;
}
const LOOKS = {
  0: { mul: [0.9, 0.74, 0.84], add: [34, 12, 26] }, 1: { mul: [1, 1, 1], add: [0, 0, 0] }, 2: { mul: [1, 1, 1], add: [0, 0, 0] },
  3: { mul: [1.02, 0.97, 0.9], add: [6, 2, 0] }, 4: { mul: [1.04, 0.86, 0.66], add: [18, 6, 0] }, 5: { mul: [0.82, 0.58, 0.62], add: [22, 4, 16] },
  6: { mul: [0.34, 0.36, 0.6], add: [6, 6, 28] }, 7: { mul: [0.9, 0.74, 0.84], add: [34, 12, 26] },
};
function meadowGrade(T) { T = ((T % 7) + 7) % 7; const i = Math.floor(T), k = T - i, A = LOOKS[i], B = LOOKS[i + 1], q = k * k * (3 - 2 * k); return { mul: A.mul.map((v, j) => v + (B.mul[j] - v) * q), add: A.add.map((v, j) => v + (B.add[j] - v) * q) }; }

// ---------------------------------------------------------------- static terrain (built once)
let LAND_C = null, FIELD_C = null;
function terrain() {
  if (LAND_C) return LAND_C;
  FIELD_C = new Cache(5560, -90, X1 - 5560, 600, () => {});
  const fg = FIELD_C.g;
  return LAND_C = new Cache(X0, -90, X1 - X0, 600, (g) => {
    for (let wx = X0; wx < X1; wx++) {
      const gy = ground(wx), wetEdge = wx < WATERLINE + 34;
      for (let wy = R(gy); wy < 510; wy++) {
        const d = wy - gy, b = bayer(wx, wy);
        const wv = Math.sin(wx * 0.029) * 4 + Math.sin(wx * 0.1) * 2, v = (wy + wv + 400) / 20, band = Math.floor(v), f = v - band;
        let col = STRATA[band % STRATA.length]; if (f < 0.08 && b > 0.4) col = mix(col, "#7A5636", 0.22);
        col = mix(col, "#8A6440", Math.min(0.5, Math.max(0, wy + 10) / 600));
        if (d > 5 && rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#FFF4D8", 0.5); else if (d > 5 && rnd(wx * 29 + wy * 17) < 0.006) col = mix(col, "#5A3A22", 0.45);
        if (wy > -1) {                                  // seabed: ripples on top, wet colours, depth veil
          if (d < 2) col = (Math.sin(wx * 0.45 + wy * 0.2) > 0.3 ? "#E0CC9C" : "#C8B48A"); else if (d < 4) col = "#A89470";
          col = under(col, wy);
        } else if (wetEdge && d < 6) col = d < 1.5 ? "#C4A878" : "#A88C62";          // wet sand near the waterline
        else if (wx > 5590 && d < 5) {                    // meadow soil under the grass, dune top
          const gk = sm(wx, 5596, 5640); col = d < 2 ? mix(SAND[7], GRASS[5], gk) : mix(SAND[6], "#7A5232", gk * 0.8);
        } else if (d < 2) col = SAND[7]; else if (d < 4) col = SAND[6]; else if (d < 7 && b < 0.5) col = SAND[5];
        if (wx > 5600 && d >= 5 && d < 18 + Math.sin(wx * 0.3) * 2) col = mix(col, d < 9 ? "#7A5232" : "#6A4628", sm(wx, 5600, 5650));
        // toward x 5670 the dune's face turns into the meadow's green field (same bands as the LV1 meadow at x 0)
        const gk = sm(wx + Math.sin(wy * 0.07) * 9 + Math.sin(wy * 0.023 + 1) * 14, 5584, 5650);
        if (gk > 0 && gk > bayer(wx, wy) * 0.9 + 0.05 && d >= 3) { fg.px(wx, wy, fieldAt(wx, wy, wy - LAND)); continue; }
        g.px(wx, wy, col);
      }
    }
    // seabed life: sea grass, pebbles, shells, a starfish
    for (let i = 0; i < 16; i++) { const wx = X0 + 30 + rnd(i * 7) * 230, gy = R(ground(wx)); for (let s = -1; s <= 1; s++) { const h = 8 + rnd(i * 5 + s) * 16; for (let k = 0; k < h; k++) g.px(R(wx + s * 3 + Math.sin(k * 0.4 + i + s) * 1.5), gy - k, under(k > h - 4 ? "#8ACB74" : "#4E9A62", gy)); } }
    for (let i = 0; i < 22; i++) { const wx = X0 + 20 + rnd(i * 3 + 1) * 250, gy = R(ground(wx)), k = rnd(i * 5); if (k < 0.5) { g.px(wx, gy - 1, under("#8A9890", gy)); g.px(wx + 1, gy - 1, under("#B8C4BC", gy)); g.px(wx - 1, gy, under("#6A7870", gy)); } else { g.px(wx, gy - 1, under("#F8EAE0", gy)); g.px(wx + 1, gy - 1, under("#E8C8C0", gy)); } }
    { const wx = 5296, wy = R(ground(5296)) - 3, col = under("#F08A5A", wy), hi = under("#FFC48A", wy); for (let a = 0; a < 5; a++) { const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5; for (let r = 0; r < 6; r++) g.px(R(wx + Math.cos(ang) * r), R(wy + Math.sin(ang) * r * 0.7), r < 2 ? hi : col); } }
    // beach: shells, pebbles, a piece of driftwood
    for (const [wx, col] of [[5412, "#F8C8C0"], [5436, "#FFF0E0"], [5478, "#F0D0F0"], [5584, "#FFE8D0"], [5446, "#E8D8C8"]]) { const gy = R(ground(wx)) - 1; g.px(wx, gy, col); g.px(wx + 1, gy, col); g.px(wx - 1, gy, mix(col, "#806040", 0.4)); g.px(wx, gy - 1, col); }
    for (let k = 0; k < 26; k++) { const wx = 5568 + k, gy = R(ground(wx)) - 2 - (k > 4 && k < 22 ? 1 : 0); g.px(wx, gy, k % 7 === 0 ? WOOD[3] : WOOD[5]); g.px(wx, gy + 1, WOOD[2]); if (k > 3 && k < 23) g.px(wx, gy - 1, WOOD[6]); }
    // marram tufts on the dune, then meadow grass with little flowers toward x 5670
    for (let i = 0; i < 26; i++) {
      const wx = 5560 + i * 4.2 + rnd(i) * 3, gy = ground(wx), meadow = sm(wx, 5612, 5650), h = 8 + rnd(i * 5) * 12 - meadow * 3;
      for (let s = -2; s <= 2; s++) for (let k = 0; k < h; k++) {
        const x = R(wx + s * 1.8 + (s * k) / (5 + meadow * 3)), y = R(gy - k), m = k > h - 3 ? 5 : k > h / 2 ? 4 : 2;
        g.px(x, y, meadow > rnd(i * 31 + s) ? GRASS[m + 1] : MARRAM[m]);
      }
    }
    for (let i = 0; i < 70; i++) { const wy = R(-10 + rnd(i * 3 + 1) ** 1.4 * 340), wx = R(5604 + rnd(i * 3 + 2) * 64 + wy * 0.05), [p, q] = FLW[i % FLW.length], r = wy < 60 ? 0 : wy < 180 ? 1 : 2;
      if (wx >= X1 - r - 1 || !FIELD_C.g.has(wx, wy)) continue;
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + 0.5) fg.px(wx + xx, wy + yy, yy > 0 && r > 1 ? mix(p, "#000000", 0.2) : p);
      fg.px(wx, wy, r ? q : p); if (r === 0) { fg.px(wx - 1, wy, p); fg.px(wx + 1, wy, p); fg.px(wx, wy - 1, p); }
    }
    for (let i = 0; i < 9; i++) { const wx = R(5626 + i * 5 + rnd(i * 9) * 3), gy = R(ground(wx)) - 6 - R(rnd(i) * 6), [p, q] = FLW[i % FLW.length]; g.px(wx, gy + 1, GRASS[3]); g.px(wx, gy + 2, GRASS[3]); g.px(wx - 1, gy, p); g.px(wx + 1, gy, p); g.px(wx, gy - 1, p); g.px(wx, gy + 1 - 1 + 1, GRASS[3]); g.px(wx, gy, q); }
  });
}

// ---------------------------------------------------------------- seesaw + bees (world anchored)
const SEE = { x: 5530, y: -14, half: 80 };
const TB = EV.bees, TBAL = EV.balance;
const SW = { x: 5600, y: -52 };                       // bee swarm centre when settled over the right seat
const NB = 140;
const TILT = [TB + 0.35, TBAL], WOBBLE = [TBAL, TBAL + 1.2], TAG = [TB + 0.55, END - 0.4], SWASH = { rate: 1.25, ripple: 2.9 };
/** Flight of bee i: it leaves the meadow edge at t0 and settles over the right seat at t1. */
export const beeFlight = (i) => { const t1 = TB + 0.1 + (i / NB) * 0.75, fly = 0.55 + rnd(i * 3) * 0.3; return [t1 - fly, t1]; };
/** Timing shared with levels/ocean-motions.mjs (sound design): the picture reads the same constants. */
export const TIMING = { TB, TBAL, NB, TILT, WOBBLE, TAG, SWASH, WATERLINE, SEE_X: SEE.x, SWARM_X: SW.x };
// MAIN with a taller comma (as in the LV1 meadow) so 1,000,000,000 never reads as 1.000.000.000
const FONT = { ...MAIN, glyphs: { ...MAIN.glyphs, ",": ["..", "..", "..", "..", "..", "##", "##", ".#", "#."] } };
/** Plank angle: whale side (left) down until the swarm gathers, level on "balance", a small settle wobble. */
function plankAngle(t) { const f = sm(t, TILT[0], TILT[1]); return -0.17 * (1 - f) + Math.sin((t - TBAL) * 8) * 0.025 * win(t, WOBBLE[0], WOBBLE[1], 0.05, 0.9); }
function plankEnds(t) { const a = plankAngle(t), cs = Math.cos(a), sn = Math.sin(a), py = SEE.y - 20; return { a, L: [SEE.x - SEE.half * cs, py - SEE.half * sn], Rr: [SEE.x + SEE.half * cs, py + SEE.half * sn], py }; }

function seesaw(c, V, t, tint) {
  const T = (wx, wy) => [R(V.X(wx)), R(V.Y(wy))], k = tint.k * 0.8, tc = tint.col, tt = (col) => (k > 0 ? mix(col, tc, k) : col);
  const P = plankEnds(t);
  // fulcrum: a weathered wooden trestle on the sand
  const [fx, fy] = T(SEE.x, SEE.y);
  for (let j = 0; j <= 20; j++) { const hw = R(3 + j * 0.55); for (let i = -hw; i <= hw; i++) c.px(fx + i, fy - 20 + j, Math.abs(i) === hw ? tt(WOOD[1]) : i < 0 ? tt(WOOD[5]) : tt(WOOD[4])); }
  c.rect(fx - 15, fy, 31, 2, tt("#A88C62"));
  // the plank (driftwood: 5 px thick, lit top edge, knots) with grips at both ends
  const [lx, ly] = T(...P.L), [rx, ry] = T(...P.Rr), n = Math.max(1, R(Math.hypot(rx - lx, ry - ly)));
  for (let i = 0; i <= n; i++) { const x = R(lx + ((rx - lx) * i) / n), y = R(ly + ((ry - ly) * i) / n); c.px(x, y - 3, tt(WOOD[1])); c.px(x, y - 2, tt(WOOD[6])); c.px(x, y - 1, tt(i % 23 === 7 ? WOOD[3] : WOOD[5])); c.px(x, y, tt(WOOD[4])); c.px(x, y + 1, tt(WOOD[3])); c.px(x, y + 2, tt(WOOD[1])); }
  for (const [x, y] of [[lx + 10, ly + R((ry - ly) * 10 / n)], [rx - 10, ry - R((ry - ly) * 10 / n)]]) for (let j = 1; j <= 9; j++) { c.px(R(x), R(y) - 3 - j, tt(WOOD[1])); c.px(R(x) + 1, R(y) - 3 - j, tt(WOOD[4])); }
  // whale silhouette sitting on the left end (dark, a pale eye glint)
  const W = ICON.whale, ww = W.rows[0].length * 3, wh = W.rows.length * 3, ang = P.a;
  for (let j = 0; j < W.rows.length; j++) for (let i = 0; i < W.rows[0].length; i++) {
    const ch = W.rows[j][i]; if (ch === ".") continue;
    const col = ch === "o" ? "#0A1020" : ch === "w" ? "#E8F0FF" : ch === "b" ? "#3A5480" : "#22345A";
    const dx = i * 3 - ww / 2, dy = j * 3 - wh, rx2 = dx * Math.cos(ang) - dy * Math.sin(ang), ry2 = dx * Math.sin(ang) + dy * Math.cos(ang);
    c.rect(R(lx + 36 * Math.cos(ang) + rx2), R(ly - 3 + 36 * Math.sin(ang) + ry2), 3, 3, tt(col));
  }
}
/** One bee of the swarm: flies in from the meadow edge, then buzzes in a loose cloud above the right seat. */
function bee(c, V, t, i, P) {
  const [t0, tArr] = beeFlight(i), fly = tArr - t0; if (t < t0) return;
  const sx = 5668 - rnd(i * 5) * 6, sy = -40 - rnd(i * 7) * 70;
  const r1 = rnd(i * 11), r2 = rnd(i * 13), ph = r1 * 6.28, sp = 5 + r2 * 6;
  const seat = [P.Rr[0] - 6, P.Rr[1] - 34];
  const ox = Math.cos(ph + t * sp) * (6 + 22 * r1) + Math.sin(t * 3.1 + i) * 2, oy = Math.sin(ph * 1.3 + t * sp * 1.2) * (4 + 16 * r2) - 6 * r2;
  const k = ease(clamp01((t - t0) / fly)), wx = sx + (seat[0] + ox - sx) * k, wy = sy + (seat[1] + oy - sy) * k - Math.sin(Math.PI * k) * 14;
  if (wx >= 5669) return;                                      // never past the seam (the meadow belongs to x ≥ 5670)
  const x = R(V.X(wx)), y = R(V.Y(wy)), a = Math.min(1, (t - t0) / 0.15); if (a <= bayer(x, y)) return;
  c.px(x, y, "#F4C430"); c.px(x + 1, y, "#2A1A08"); c.px(x, y + 1, "#2A1A08"); c.px(x + 1, y + 1, "#F4C430");
  if (((i + R(t * 30)) & 1) === 0) c.px(x, y - 1, "#E8F4FF"); else c.px(x + 1, y - 1, "#E8F4FF");
}

// ---------------------------------------------------------------- layers
export function fill(c, V, t) {
  if (V.x1 < X0 || V.x0 > WATERLINE + 40) return;
  seaWater(c, V, t, X0, WATERLINE + 40);
  seaBand(c, V, t, X0, WATERLINE + 40, 34, (wx) => (wx > WATERLINE - 90 ? -34 + (wx - (WATERLINE - 90)) * 0.27 : -99));
}

export function back(c, V, t) {
  if (V.x1 < X0 || V.x0 > X1) return;
  const st = sceneTint(V.cx);
  // a low hazy far shore behind the beach, sinking into the horizon toward the sea
  const L = light(V.cx), haze = mix(mix("#A8C8B0", "#C8A8C0", L.dawn * 0.6), "#3A3A70", L.night);
  for (let wx = Math.max(X0, R(V.x0)); wx < Math.min(X1, R(V.x1)); wx++) { const h = R(14 * sm(wx, WATERLINE - 80, WATERLINE + 60) + 6 * Math.sin(wx * 0.05) * sm(wx, WATERLINE, WATERLINE + 80)); for (let wy = -34 - h; wy < -10; wy++) { const x = R(V.X(wx)), y = R(V.Y(wy)); if (wy > -34 || bayer(x, y) < 0.92) c.px(x, y, wy < -32 - h ? mix(haze, "#FFFFFF", 0.3) : haze); } }
  terrain().blit(c, V, { col: st.col, k: st.k * 0.5 });
  FIELD_C.blit(c, V, null, { grade: meadowGrade(light(V.cx).T) });
  // swash: a thin sheet of water running up the wet sand and sliding back, with a foam edge
  const sw = WATERLINE + 8 + 12 * (0.5 + 0.5 * Math.sin(t * SWASH.rate)) + 3 * Math.sin(t * SWASH.ripple);
  for (let wx = WATERLINE - 6; wx < sw; wx++) { const gy = ground(wx), x = R(V.X(wx)), y = R(V.Y(gy)); if (x < 0 || x >= 540) continue; const edge = sw - wx < 3; c.px(x, y - 1, edge ? "#FFFFFF" : mix("#A8E0F0", "#6A7AB8", L.night * 0.6)); if (edge || (wx + R(t * 7)) % 5 === 0) c.px(x, y - 2, "#F4FFFF"); }
}

export function actors(c, V, t) {
  if (V.x1 < X0 || V.x0 > X1) return;
  if (t < TB - 0.5) return;                                    // the seesaw is set up out of view before the pan reaches it
  const A = sm(t, TB - 0.5, TB - 0.1), st = sceneTint(V.cx), P = plankEnds(t);
  if (A < 1) { const g = fade(c, A); seesaw(g, V, t, st); } else seesaw(c, V, t, st);
  for (let i = 0; i < NB; i++) bee(c, V, t, i, P);
}

export function hud(c, V, t) {
  if (V.x1 < X0 || V.x0 > X1) return;
  const a = win(t, TAG[0], TAG[1], 0.35, 0.2); if (a <= 0) return;
  // a small world-anchored tag over the seesaw (not clamped to the screen: it slides away with the beach)
  const lines = ["1,000,000,000+", "BEES"], w = Math.max(...lines.map((s) => c.measure(FONT, s, { scale: 2 }))) + 20, h = lines.length * 20 + 10;
  const x = R(V.X(SEE.x + 14) - w / 2), y = R(V.Y(-150));
  if (x > 540 || x + w < 0) return;
  panel(c, x, y, w, h, a, C.Y);
  lines.forEach((l, i) => fade(c, a).text(FONT, l, x + R((w - c.measure(FONT, l, { scale: 2 })) / 2), y + 7 + i * 20, i ? C.IV : C.Y, { scale: 2 }));
}
