// catalog-v1 copy (2026-10-26) of work/pixel-lab/dogs/kit/park-props.mjs; changes: import paths only.
// Dog series park (2026-10-23) · furniture: a wooden bench with dark iron ends (LAYOUT.bench, lawn plane), a park lamp
// (LAYOUT.lamp), the far bench across the park (LAYOUT.farBench, p 0.62) with a little lamp beside it, and flower beds
// (yellow / white / purple / blue only — nothing red or orange in the park). Sizes in real units via park-geo frameAt.
import { LAYOUT } from "./dogs-park-layout.mjs";
import { ramp, rgb, band, h1, h2, poly, rect, stroke } from "./dogs-park-px.mjs";
import { frameAt, wind } from "./dogs-park-geo.mjs";

export const WOOD = ramp(["#2A170C", "#432614", "#5E381E", "#7A4C2A", "#966238", "#B07C4A", "#C89A62", "#DDB884"]);
export const IRON = ramp(["#121620", "#1C2230", "#283042", "#364056", "#48546C", "#62708A", "#8090A8"]);
const GLASS = ramp(["#9AB8C8", "#C4DCE4", "#E6F2EE", "#FFFBE8"]);
const SOIL = ramp(["#2A1A10", "#3E2818", "#553823", "#6A4830"]);
const STONE = ramp(["#5A6070", "#7C8494", "#A0A8B4", "#C4CAD2", "#E0E4E8"]);
const PETAL = { yellow: [rgb("#FFE04A"), rgb("#E8B820"), rgb("#FFF4A8")], white: [rgb("#FFFFFF"), rgb("#D2D6EC"), rgb("#F6D24A")], purple: [rgb("#A47AEE"), rgb("#7048C2"), rgb("#E8D8FF")], blue: [rgb("#7AA0FA"), rgb("#4A6ED6"), rgb("#E4ECFF")], lavender: [rgb("#B898F0"), rgb("#8A68D0"), rgb("#B898F0")] };
const LEAF = ramp(["#163E1E", "#205228", "#2C6A32", "#3C8440", "#52A04E"]);

/** Wooden slat bench seen from the front (the camera is a little above): seat top −38, backrest top −68, length 124
 *  real units, dark cast-iron ends with legs and scrolled armrests. f = frameAt(...). */
export function bench(S, f) {
  const s = f.s, X = (dx) => f.X(dx), Y = (dy) => f.Y(dy), L = 62;
  if (X(L + 12) < 0 || X(-L - 12) > S.w || Y(-75) > S.h) return;
  const w1 = Math.max(0.6, 2.6 * s), w2 = Math.max(0.6, 2 * s);
  const ironCol = (sx) => (x_, y_, tt, e, qx, qy) => (e > 0.62 ? IRON[0] : qx * sx > 0 ? IRON[2] : qy < 0 ? IRON[5] : IRON[4]);
  // front: iron ends (legs, armrest scroll) — drawn first, they are in front of the wood
  for (const sx of [-1, 1]) {
    const x = sx * (L - 5), ic = ironCol(sx);
    stroke(S, X(x), Y(-1), X(x), Y(-34), w1, ic);                                // front leg
    stroke(S, X(x - sx * 3), Y(-46), X(x + sx * 3), Y(-46), w2, ic);              // armrest bar
    stroke(S, X(x + sx * 3), Y(-46), X(x + sx * 3.5), Y(-40), w2, ic);            // scroll end
    stroke(S, X(x), Y(-34), X(x), Y(-46), w2, ic);
    rect(S, X(x) - w1 - s, Y(-2), 2 * w1 + 2 * s, Math.max(1, 2 * s), IRON[1]);    // foot
  }
  const plank = (x0, x1, y0, h, k, top) => {
    const xa = X(x0), xb = X(x1), ya = Y(y0), yb = Y(y0 + h), ox = Math.round(xa);
    rect(S, xa, ya, xb - xa, Math.max(1, yb - ya), (x, y) => {
      if (y >= Math.round(yb) - 1 && yb - ya > 2.5) return WOOD[1];
      if (x <= Math.round(xa) || x >= Math.round(xb) - 1) return WOOD[1];
      if (y <= Math.round(ya) && yb - ya > 2.5) return WOOD[top ? 7 : 6];
      const grain = h2(Math.floor((x - ox) / Math.max(1, 5 * s)), k * 7 + Math.floor((y - ya) / Math.max(1, 2 * s))) < 0.18 ? -0.8 : 0;
      return WOOD[band((top ? 5.2 : 4.2) + grain - (y - ya) / Math.max(1, yb - ya) * 1.1, 7, x - ox, y)];
    });
  };
  plank(-L, L, -38, 3.5, 1, true);                                                // seat top (lit)
  plank(-L, L, -34.5, 5, 2, false);                                               // seat front edge
  plank(-L + 3, L - 3, -68, 7, 3, false); plank(-L + 3, L - 3, -58.5, 7, 4, false); plank(-L + 3, L - 3, -49, 5.5, 5, false);
  // back: rear legs and back posts (darker, partly hidden), the shade under the seat
  for (const sx of [-1, 1]) {
    const x = sx * (L - 9);
    stroke(S, X(x), Y(-4), X(x), Y(-30), w2, IRON[1]);
    stroke(S, X(x + sx * 2), Y(-38), X(x + sx * 3), Y(-70), w2, (x_, y_, tt, e) => (e > 0.62 ? IRON[0] : IRON[2]));
  }
  rect(S, X(-L + 4), Y(-29.5), (2 * L - 8) * s, 3 * s, (x, y) => (((x + y) & 1) ? IRON[1] : null));
}

/** Park lamp: dark iron post with a lantern head (glass pale in daylight). Height ≈ 220 real units. */
export function lamp(S, f, t = 0) {
  const s = f.s, X = (dx) => f.X(dx), Y = (dy) => f.Y(dy);
  if (X(20) < 0 || X(-20) > S.w) return;
  const ironCol = (x_, y_, tt, e, qx) => (e > 0.62 ? IRON[0] : qx < 0 ? IRON[5] : IRON[2]);
  // cap and finial
  poly(S, [[X(-13), Y(-200)], [X(0), Y(-212)], [X(13), Y(-200)], [X(10), Y(-197)], [X(-10), Y(-197)]], (x, y) => (y >= Math.round(Y(-198)) ? IRON[0] : x < X(-2) ? IRON[5] : IRON[3]));
  stroke(S, X(0), Y(-212), X(0), Y(-218), Math.max(0.6, 1.4 * s), IRON[2]);
  // lantern: tapered glass between frames
  const gy0 = -196, gy1 = -168;
  poly(S, [[X(-11), Y(gy0)], [X(11), Y(gy0)], [X(8), Y(gy1)], [X(-8), Y(gy1)]], (x, y) => {
    const u = (x - X(0)) / (11 * s), v = (y - Y(gy0)) / ((gy1 - gy0) * s);
    if (Math.abs(u) > 0.92 - v * 0.25 || Math.abs(u) < 0.08) return IRON[1];
    return GLASS[band(1.8 - u * 1.2 + (1 - v) * 0.6, 3, x, y)];
  });
  rect(S, X(-12), Y(gy0) - 1, 24 * s, Math.max(1, 2 * s), IRON[1]); rect(S, X(-9), Y(gy1), 18 * s, Math.max(1, 3 * s), IRON[1]);
  // post with a decorative collar and a wide foot
  stroke(S, X(0), Y(gy1), X(0), Y(-8), Math.max(0.7, 3 * s), ironCol);
  for (const yy of [-150, -40]) rect(S, X(-4.5), Y(yy), 9 * s, Math.max(1, 3 * s), IRON[3]);
  poly(S, [[X(-9), Y(0)], [X(-5), Y(-22)], [X(5), Y(-22)], [X(9), Y(0)]], (x) => (x < X(-3) ? IRON[4] : x > X(4) ? IRON[1] : IRON[2]));
  void t;
}

/** Flower bed: low oval of soil edged with stones, rows of flowers. w = width (real), cols = list of PETAL keys. */
export function flowerBed(S, f, w, cols, seed, t, P) {
  const s = f.s, X = (dx) => f.X(dx), Y = (dy) => f.Y(dy);
  if (X(w / 2 + 20) < 0 || X(-w / 2 - 20) > S.w) return;
  const sw = wind(t, P, f.X0) * 0.8;
  // flowers first (they are in front of the soil)
  const n = Math.round(w / 7);
  for (let row = 0; row < 3; row++) for (let i = 0; i < n; i++) {
    const r1 = h2(i + seed, row), u = -w / 2 + 6 + (i + r1 * 0.6) * ((w - 12) / n), hgt = 14 + row * 4 + r1 * 6, dy = -2 - row * 2.5;
    const key = cols[(i + row * 2) % cols.length], [pc, pd, ec] = PETAL[key], x = X(u + sw * (hgt / 20)), y = Y(dy - hgt), r = (key === "lavender" ? 1.5 : 2.6) * s;
    if (key === "lavender") { for (let k = 0; k < 4; k++) { const yy = Y(dy - hgt + k * 2.6); if (r < 0.8) S.put(Math.round(x), Math.round(yy), pc); else rect(S, x - r, yy - r, r * 2, r * 2, k % 2 ? pd : pc); } }
    else if (r < 1) { S.put(Math.round(x), Math.round(y), pc); S.put(Math.round(x) + 1, Math.round(y), pd); }
    else {
      for (let Y_ = Math.floor(y - r); Y_ <= Math.ceil(y + r); Y_++) for (let X_ = Math.floor(x - r); X_ <= Math.ceil(x + r); X_++) {
        const dx = X_ + 0.5 - x, dyy = Y_ + 0.5 - y, d = Math.hypot(dx, dyy); if (d > r) continue;
        S.put(X_, Y_, d < r * 0.38 ? ec : dyy > r * 0.3 ? pd : pc);
      }
    }
    stroke(S, X(u), Y(dy), x, y + r, Math.max(0.45, 0.8 * s), LEAF[2]);
    if (s > 0.5) { S.put(Math.round(X(u) - s), Math.round(Y(dy - 4)), LEAF[3]); S.put(Math.round(X(u) + s), Math.round(Y(dy - 6)), LEAF[4]); }
  }
  // leafy band and the stone edging
  for (let i = 0; i < n * 2; i++) { const u = -w / 2 + 4 + (i / (n * 2)) * (w - 8), h = 4 + h2(i, seed + 7) * 4; stroke(S, X(u), Y(-1), X(u + (h2(i, seed) - 0.5) * 3), Y(-h), Math.max(0.5, 1.2 * s), LEAF[1 + (i % 3)]); }
  const ns = Math.max(4, Math.round(w / 9));
  for (let i = 0; i < ns; i++) {
    const u = -w / 2 + (i + 0.5) * (w / ns), cx = X(u), cy = Y(-1.5), rx = (w / ns) * 0.55 * s, ry = 3 * s, ox = Math.round(cx);
    for (let Y_ = Math.floor(cy - ry); Y_ <= Math.ceil(cy + ry); Y_++) for (let X_ = Math.floor(cx - rx); X_ <= Math.ceil(cx + rx); X_++) {
      const dx = (X_ + 0.5 - cx) / rx, dy = (Y_ + 0.5 - cy) / ry, d = dx * dx + dy * dy; if (d > 1) continue;
      S.put(X_, Y_, d > 0.7 && dy > 0 ? STONE[0] : STONE[band(2.4 - dy * 1.2 - dx * 0.4, 4, X_ - ox, Y_)]);
    }
  }
  rect(S, X(-w / 2), Y(-4), w * s, 4 * s, (x, y) => SOIL[band(1.6 + (h2(x, y) - 0.5) * 1.2, 3, x, y)]);
}

export const BEDS = [
  { x: -455, p: 0.9, w: 150, cols: ["yellow", "white", "purple"], seed: 11 },
  { x: 540, p: 0.72, w: 130, cols: ["lavender", "white", "yellow"], seed: 23 },
  { x: 1060, p: 0.88, w: 160, cols: ["purple", "yellow", "white", "blue"], seed: 37 },
  { x: -880, p: 0.86, w: 140, cols: ["white", "blue", "yellow"], seed: 41 },
];
export const FAR_LAMP = { x: 690 - 0, p: 0.6 };
export { STONE };
