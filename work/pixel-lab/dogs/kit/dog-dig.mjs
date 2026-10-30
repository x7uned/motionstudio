// Dog series kit · film 3: the bits a digging dog flicks backwards (dirt / grass / snow / rug fluff). Separate from the
// dog so the lead chooses whether and where to draw them. Pure function of t: every stroke of drawDogSide({ dig }) at the
// same t throws the same few bits; they dissolve in at the paw, fly back in a ballistic arc, land and dissolve away.
import { fade } from "../../animals/film/cute.mjs";
import { DIG, digPaw } from "./dog-gait.mjs";

export const BITS = {
  dirt: ["#3A2414", "#5A3A20", "#7A5230", "#9A6E44"],
  grass: ["#2E5A1E", "#4C8A2E", "#6AAE40", "#9AD060"],
  snow: ["#9AB0C8", "#C4D4E6", "#E6EEF8", "#FFFFFF"],
  fluff: ["#8A7A9A", "#B0A2C0", "#D4C8E0", "#F0E8F8"],
};
const hash = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

/**
 * Bits flicked back by the digging front paws. (x, y, t) and o.facing / o.turn / o.dig exactly as given to drawDogSide
 * (turn ≥ 0.5 counts as facing the other way). o.bits "dirt" | "grass" | "snow" | "fluff" or a 4-colour list (dark →
 * light), o.n bits per stroke (default 4), o.a alpha. Draw it before the dog (bits behind it) or after (in front).
 */
export function digBits(c, G, x, y, t = 0, o = {}) {
  const k = sm01(Math.max(0, Math.min(1, o.dig ?? 0))), a = o.a ?? 1; if (k <= 0 || a <= 0) return;
  let f = (o.facing ?? 1) < 0 ? -1 : 1; if ((o.turn ?? 0) >= 0.5) f = -f;
  const cols = Array.isArray(o.bits) ? o.bits : BITS[o.bits ?? "dirt"] ?? BITS.dirt, n = Math.round((o.n ?? 4) * (0.5 + 0.5 * k));
  const z = G.z, g0 = a >= 1 ? c : fade(c, a), T = 1 / DIG.freq, grav = 320;
  for (const [pi, off, [x0, x1]] of [[0, 0, DIG.near], [1, 0.5, DIG.far]]) {
    const cyc = Math.floor(t * DIG.freq + off);
    for (let s = cyc - 2; s <= cyc; s++) for (let i = 0; i < n; i++) {
      const seed = s * 131 + pi * 17 + i * 7919, r1 = hash(seed), r2 = hash(seed + 1), r3 = hash(seed + 2), r4 = hash(seed + 3);
      const q0 = DIG.scrape * (0.45 + 0.5 * r1), tl = (s - off + q0) * T, tau = t - tl;   // launch time of this bit
      if (tau < 0) continue;
      const P = digPaw(q0, x0, x1), vx = -(40 + 60 * r2) * (0.6 + 0.4 * k), vy = -(35 + 55 * r3) * (0.6 + 0.4 * k);
      const tLand = (-vy + Math.sqrt(vy * vy + 2 * grav * 1.6)) / grav;                 // from y −1.6 down to the lawn
      const tt = Math.min(tau, tLand), life = tLand + 0.3;
      if (tau > life) continue;
      const wx = P[0] - 2 + vx * tt + (tau > tLand ? vx * 0.06 * Math.min(1, (tau - tLand) / 0.1) : 0), wy = Math.min(0, -1.6 + vy * tt + 0.5 * grav * tt * tt);
      const alpha = sm01(tau / 0.07) * (1 - sm01((tau - tLand - 0.05) / 0.25));
      if (alpha <= 0.02) continue;
      const g = alpha >= 1 ? g0 : fade(g0, alpha), sz = Math.max(1, Math.round(z * (0.8 + 0.7 * r4) * (0.6 + 0.4 * sm01(tau / 0.08))));
      const X = Math.round(G.X(x + f * wx)), Y = Math.round(G.Y(y + wy)) - (tau >= tLand ? sz - 1 : 0), col = cols[Math.min(3, Math.floor(r4 * 4))];
      g.rect(X, Y, sz, sz, col);
      if (sz >= 2) { g.px(X, Y, cols[Math.min(3, Math.floor(r4 * 4) + 1)] ?? col); if (sz >= 3) g.px(X + sz - 1, Y + sz - 1, cols[0]); }
    }
  }
}
