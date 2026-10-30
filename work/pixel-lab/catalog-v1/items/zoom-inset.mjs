// catalog-v1 item «zoom-inset»: a magnifier lens that shows an enlarged view of what is drawn under it.
// Source: animals-wingbeat/film/levels/marsh.mjs#drawLens (nearest-neighbour magnified view of the canvas behind the
// glass, slightly cool/bright tint, darker glass thickness at the edge by Bayer dither). Changes: the film magnified x2
// fixed with the lens at a fixed place; here the magnification eases continuously (mag), the view reads the canvas
// (s.raw) around the target prop s.look blended by s.lookK (around the lens itself when there is no target), the lens
// glides (sweep), shrinks to a small dot on close, and gets a shaded rim + handle in the house ramp style.
// Nothing new is drawn inside the glass: it is only a resampling of the canvas pixels.
import { bayer, mix } from "../../../../renderer/pixel/raster.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v)), TAU = Math.PI * 2;
const RIM = ["#0B0812", "#2A2048", "#4A3C72", "#7A6AA8", "#B4A6D8", "#E4DCF8"];   // dark → light, light from the upper left
const R_GLASS = 52, R_RIM = 8;
export default {
  kind: "zoom-inset",
  covers: ["zoom-inset"],
  source: "animals-wingbeat/film/levels/marsh.mjs#drawLens",
  desc: "round magnifier lens with handle; shows an enlarged view of its target prop (or what is under it)",
  hw: 68, hh: 68, start: "lens with handle, view enlarged about 1.7 times, floats gently",
  states: {
    show: [0.5, "magnifier shows a gently enlarged view"],
    zoom: [0.8, "magnification rises smoothly to about 3.5 times", "rise"],
    sweep: [0.7, "lens glides left and right over the picture", "swish"],
    close: [0.6, "lens shrinks to a small dot", "dim"],
  },
  base: { mag: 1.7, sw: 0, open: 1 },
  st: {
    show: { mag: 1.7, sw: 0, open: 1 },
    zoom: { mag: 3.5, sw: 0, open: 1 },
    sweep: { mag: 2, sw: 1, open: 1 },
    close: { mag: 1.2, sw: 0, open: 0.3 },
  },
  demo: { tile: "zoom",  target: true },
  notes: "Needs s.raw (the canvas) and reads it before drawing the lens; the view is a plain nearest-neighbour resample, so thin 1-px detail shimmers a little while the magnification eases. With a target the view centres on it (blend by lookK), otherwise on the lens position.",
  draw(c, cx0, cy0, z, t, s) {
    const v = s.v, ph = s.integ(() => 0.35);
    const sweep = Math.sin(TAU * ph) * v.sw * 46 * z;                 // glide amplitude scales with the sweep parameter
    const cx = Math.round(cx0 - 8 * z + sweep), cy = Math.round(cy0 - 8 * z + Math.sin(t * 1.7) * 2 * z);
    const op = v.open, rg = Math.max(3, Math.round(R_GLASS * z * op)), rim = Math.max(1, Math.round(R_RIM * z * op)), ro = rg + rim;
    // source point: the target (blend by lookK) or the lens itself
    const sx = s.look ? cx + (s.look[0] - cx) * s.lookK : cx, sy = s.look ? cy + (s.look[1] - cy) * s.lookK : cy;
    const mag = Math.max(1, v.mag), raw = s.raw;
    // snapshot the magnified view first (the lens must not read its own output)
    const N = rg * 2 + 1, buf = new Uint8ClampedArray(N * N * 3);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const dx = i - rg, dy = j - rg, p = raw.get(Math.floor(sx + dx / mag), Math.floor(sy + dy / mag)), o = (j * N + i) * 3;
      buf[o] = p[0]; buf[o + 1] = p[1]; buf[o + 2] = p[2];
    }
    // handle (lower right), drawn first so the rim covers its root
    const hl = 28 * z * op, hw = Math.max(2, 4.5 * z * op), ux = Math.SQRT1_2, ax = cx + ux * (ro - 2), ay = cy + ux * (ro - 2), bx = ax + ux * hl, by = ay + ux * hl;
    const hp = (w, l = 0) => [[ax - ux * l + ux * w, ay - ux * l - ux * w], [bx + ux * w, by - ux * w], [bx - ux * w, by + ux * w], [ax - ux * l - ux * w, ay - ux * l + ux * w]];
    c.poly(hp(hw + 1), RIM[0]); c.poly(hp(hw), RIM[2]); c.poly(hp(hw * 0.45), RIM[4]);
    c.disc(Math.round(bx), Math.round(by), Math.round(hw + 1), RIM[0]); c.disc(Math.round(bx), Math.round(by), Math.round(hw), RIM[2]);
    // rim: dark outline, ring shaded by the angle to the light (upper left), dithered between bands
    for (let y = cy - ro; y <= cy + ro; y++) for (let x = cx - ro; x <= cx + ro; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > ro || d <= rg - 0.5) continue;
      if (d > ro - 1) { c.px(x, y, RIM[0]); continue; }
      const lit = 0.5 - 0.5 * ((x - cx) * 0.7 + (y - cy) * 0.7) / Math.max(1, d), ring = (d - rg) / Math.max(1, rim);
      const val = 1.4 + lit * 3.2 + (ring < 0.3 ? -0.8 : ring > 0.75 ? -0.6 : 0.3), lo = Math.floor(val);
      c.px(x, y, RIM[Math.max(1, Math.min(5, val - lo > bayer(x, y) ? lo + 1 : lo))]);
    }
    // glass: magnified pixels, a touch cool and bright, darker glass thickness near the edge, two diagonal glare streaks
    for (let y = cy - rg; y <= cy + rg; y++) for (let x = cx - rg; x <= cx + rg; x++) {
      const d = Math.hypot(x - cx, y - cy); if (d > rg) continue;
      const o = ((y - cy + rg) * N + (x - cx + rg)) * 3;
      let col = mix([buf[o], buf[o + 1], buf[o + 2]], "#F4F8FF", 0.07);
      const e = rg * 0.17;
      if (d > rg - e && ((d - (rg - e)) / e) * 0.55 > bayer(x, y)) col = mix(col, "#2A2048", 0.3);
      const u = ((x - cx) - (y - cy) * 0.0) / rg, w = (x - cx) * 0.7 + (y - cy) * 0.7;
      if (((Math.abs(w + rg * 0.55) < rg * 0.07 || Math.abs(w + rg * 0.7) < rg * 0.025) && bayer(x, y) < 0.35 && d < rg - e * 0.6) && u < 0) col = mix(col, "#FFFFFF", 0.55);
      c.px(x, y, col);
    }
    return { box: { x0: cx - ro, y0: cy - ro, x1: Math.round(bx + hw + 1), y1: Math.round(by + hw + 1) }, pt: [cx, cy] };
  },
};
