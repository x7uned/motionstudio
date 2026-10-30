// catalog-v1 item «fossil»: the T-rex skeleton of the animals film sea floor (animals/film/levels/sea-terrain.mjs#dinoDraw,
// with the film's bone shading, eye socket, nostril and teeth; lib/animals-fossil.mjs). Changes: the film draws the skeleton in
// the pale sea-bed; here it lies in a small rock slab (new filler) so the prop stands alone. Dust cover that clears from
// left to right is a per-pixel dithered reveal (field + Bayer gate), the glow is a pulsing gold ring around the bones.
import { sprite, SW, SH } from "./lib/animals-fossil.mjs";
import { mix, bayer } from "../../../../renderer/pixel/raster.mjs";

const K = 1.45;   // screen px per sprite px at z 1
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const DUST = ["#C9A66E", "#D6B47C", "#BE9866", "#E0C088"];
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export default {
  kind: "fossil",
  covers: ["fossil"],
  source: "animals/film/levels/sea-terrain.mjs#dinoDraw (+ stamp shading, fossils() skull details)",
  desc: "dinosaur skeleton lying in a rock slab; starts buried under dust, then is uncovered and can glow",
  hw: 90, hh: 62,
  start: "a dim dusty rock slab, bones hidden under sand",
  states: {
    buried: [0.4, "dim rock slab, the bones hidden under dust"],
    reveal: [1.4, "dust clears from left to right and the bones appear", "swish"],
    glow: [0.6, "a warm gold glow pulses around the bones", "glow"],
    show: [0.6, "the glow fades, bones stay clean and bright"],
  },
  // dig: 0 covered … 1 uncovered · glow: 0..1 · dim: 0..1 darkening of the whole slab
  base: { dig: 0, glow: 0, dim: 0.45 },
  st: { buried: { dig: 0, glow: 0, dim: 0.45 }, reveal: { dig: 1, glow: 0, dim: 0 }, glow: { dig: 1, glow: 1, dim: 0 }, show: { dig: 1, glow: 0, dim: 0 } },
  linear: [],
  notes: "Rock slab around the skeleton is new filler (film bones lie in the pale bed). Dust is a flat sand tone over the slab, the bones are invisible while covered. Dust puffs are a few 2-px specks rising while the dig changes.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = z * K, sp = sprite(), { rock, bone, ring, field } = sp;
    const x0 = Math.floor(cx - (SW * S) / 2), y0 = Math.floor(cy - (SH * S) / 2), x1 = Math.ceil(cx + (SW * S) / 2), y1 = Math.ceil(cy + (SH * S) / 2);
    const gl = clamp01(v.glow) * (0.72 + 0.28 * Math.sin(t * 5)), dim = 0.55 * clamp01(v.dim), dig = v.dig * 1.6;
    for (let Y = y0; Y < y1; Y++) {
      const sv = Math.floor((Y - y0) / S); if (sv < 0 || sv >= SH) continue;
      for (let X = x0; X < x1; X++) {
        const su = Math.floor((X - x0) / S); if (su < 0 || su >= SW) continue;
        const i = sv * SW + su, r = rock[i]; if (!r) continue;
        const k = clamp01((dig - field[i] * 1.2) / 0.3), open = bayer(X, Y) < k;   // local uncovering
        let col;
        if (open) {
          col = bone[i] || r;
          if (bone[i]) { if (gl > 0) col = mix(col, "#FFF2B0", 0.4 * gl); }
          else if (ring[i] && bayer(X + 1, Y) < gl * (ring[i] === 2 ? 0.95 : 0.55)) col = ring[i] === 2 ? "#F6C84A" : "#C8963A";
        } else {
          // dust cover: sandy, with a faint bump where the bones lie underneath
          col = DUST[(rnd(su * 31 + sv * 17) * 4) | 0]; if (bone[i] && bayer(su, sv) < 0.35) col = DUST[2];
        }
        if (dim > 0) col = mix(col, "#14102A", dim);
        c.px(X, Y, col);
      }
    }
    // dust puffs while the cover moves
    const act = clamp01(4 * v.dig * (1 - v.dig)) * (0.4 + 0.6 * 1);
    if (act > 0.02) for (let n = 0; n < 16; n++) {
      const ph = (t * 0.9 + rnd(n * 5 + 1)) % 1, u = (0.1 + 0.8 * rnd(n * 7 + 2) * 0 + 0.8 * ((v.dig * 0.8 + rnd(n * 3 + 9) * 0.25) % 1)) * SW;
      const X = x0 + u * S, Y = cy - 8 * S * 0.5 - ph * 30 * S * 0.5 + 10 * S * 0.4;
      if (bayer(n, n * 3) < act * (1 - ph)) c.rect(Math.floor(X), Math.floor(Y), 3, 2, DUST[n & 3]);
    }
    return { box: { x0, y0, x1, y1 }, pt: [cx + 32 * S * 0.5, cy] };
  },
};
