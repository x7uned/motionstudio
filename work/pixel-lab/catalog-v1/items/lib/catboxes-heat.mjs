// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-boxes/film/props-ui.mjs#heatAura (helpers R/frac/rnd from
// cat-boxes/film/props-kit.mjs); changes: takes a centre + size instead of a rect (the film's box hid the glow's lower
// edge, a free prop must not cut it, so the tint covers the whole ellipse, centred a little low); glow strength `k`,
// heat-line strength `ln`, an integrated rise phase `ph` (rate changes never jump) and `hot` (two more heat lines that
// fade in with it) are parameters; colours and shapes as in the film.
// Soft warm dithered glow and wavy heat lines rising through it, fading at both ends; loops continuously.
import { fade, bayer } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), frac = (v) => v - Math.floor(v);
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const LX = [0.22, 0.4, 0.6, 0.78, 0.31, 0.69];   // the film's four lines at 0.22 + 0.56·i/3, then the two `hot` ones
export function heatAura(c, cx, cy, w, h, t = 0, a = 1, o = {}) {
  const k = o.k ?? 1, ln = clamp01(o.ln ?? 1), hot = clamp01(o.hot ?? 0), phase = o.ph ?? t;
  if (a <= 0 || w < 4 || h < 4) return;
  const mx = cx, my = cy + h * 0.08, rx = w / 2, ry = h * 0.52, pul = 0.9 + 0.1 * Math.sin(t * 2.4);
  if (k > 0.001) c.tint(Math.max(0, R(mx - rx)), Math.max(0, R(my - ry)), R(2 * rx) + 1, R(2 * ry) + 1, (X, Y) => { const q = ((X + 0.5 - mx) / rx) ** 2 + ((Y + 0.5 - my) / ry) ** 2; return q >= 1 ? 0 : a * 0.42 * pul * k * Math.pow(1 - q, 1.4); }, "#FFB060", 4);
  const g = fade(c, a), th = Math.max(1, R(w / 90)), x0 = cx - w / 2, yb = cy + h * 0.32;
  for (let i = 0; i < 6; i++) {
    const wi = ln * (i < 4 ? 1 : hot); if (wi <= 0.01) continue;
    const ph = frac(phase * 0.42 + i * 0.27 + rnd(i) * 0.1), lxc = x0 + w * LX[i] + (rnd(i + 5) - 0.5) * w * 0.08, cyl = yb - h * 0.78 * ph, len = h * 0.34;
    for (let q = 0; q <= len; q++) {
      const u = q / len, yy = R(cyl - len / 2 + q), xx = R(lxc + Math.sin(yy * 0.13 + t * 3.2 + i * 1.7) * (2.5 + w * 0.012));
      const al = Math.sin(Math.PI * u) * Math.sin(Math.PI * ph) * wi;
      if (al <= bayer(xx, yy)) continue;
      for (let j = 0; j < th; j++) g.px(xx + j, yy, u < 0.5 ? "#FFE6B0" : "#FFC878");
    }
  }
}
