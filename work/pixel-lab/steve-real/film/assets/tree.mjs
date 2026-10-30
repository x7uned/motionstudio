// init/nature · tree: a round broadleaf tree (no fruit): two-tone bark trunk with forking branches and a crown of 12 leaf
// lobes, each lobe shaded on its own so the crown reads bumpy. Sway/wind bend the whole tree (quadratic with height);
// blossom dots grow on the crown; autumn recolours the lobes one after another; bare shrinks the lobes away (leaves
// fall) and leaves the branches.
import { blob, ell, tube, bez, shadow, R8, mixRamp, mix, fade, rnd, noise1, sm, sm3, clamp01 } from "../lib/nature-kit.mjs";

const H = 240;                                           // tree height (px at z 1)
// crown lobes: [x, h(eight above foot), r]; order = draw order (top first, low front lobes last)
const LOBES = [[0, 212, 28], [-30, 195, 34], [32, 196, 34], [-60, 182, 26], [62, 184, 26], [0, 165, 48], [-72, 150, 24], [72, 152, 24], [-44, 140, 36], [44, 142, 36], [-18, 128, 26], [20, 126, 26]];
const BRANCH = [[[0, 82], [-10, 104], [-32, 128], 6.5, 2.4], [[0, 82], [12, 106], [30, 132], 6.5, 2.4], [[0, 80], [2, 120], [0, 168], 6, 2.2],
  [[-22, 118], [-40, 136], [-62, 160], 3.4, 1.6], [[24, 122], [42, 142], [60, 164], 3.4, 1.6], [[-6, 100], [-22, 124], [-34, 150], 3, 1.4], [[28, 110], [36, 128], [44, 150], 2.4, 1.2], [[2, 130], [14, 150], [22, 176], 2.4, 1.2], [[-2, 140], [-16, 166], [-22, 194], 2.2, 1.1]];
const THR = LOBES.map((_, i) => rnd(i * 5 + 3));          // per-lobe thresholds (autumn order, leaf-fall order)
// blossom dots inside lobes: [x, h, threshold]
const DOTS = (() => { const o = []; for (let k = 0; k < 64; k++) { const L = LOBES[Math.floor(rnd(k * 3 + 1) * LOBES.length)], a = rnd(k * 3 + 2) * 6.283, d = Math.sqrt(rnd(k * 3 + 3)) * L[2] * 0.8; o.push([L[0] + Math.cos(a) * d, L[1] + Math.sin(a) * d, rnd(k * 7 + 5)]); } return o; })();
const LEAVES = Array.from({ length: 8 }, (_, j) => [(rnd(j * 3 + 40) - 0.5) * 150, 120 + rnd(j * 3 + 41) * 90, rnd(j * 3 + 42), 0.5 + rnd(j * 3 + 43) * 0.5]);

export default {
  kind: "tree",
  covers: ["tree", "oak", "big tree"],
  source: "init (new)",
  desc: "round leafy tree with bark trunk and bumpy crown; sways, bends in wind, blossoms, turns autumn, goes bare",
  hw: 96, hh: 120,
  start: "stands, the crown stirs slightly",
  states: {
    still: [0.7, "stands calmly in full green leaf"],
    sway: [0.7, "the crown sways gently in a breeze", "swish"],
    wind: [0.8, "strong wind: the whole tree leans and the leaves shake", "whoosh"],
    blossom: [1.0, "pink blossoms open all over the crown", "sparkle"],
    autumn: [1.2, "the leaves turn orange and red lobe by lobe, a few drift down", "swell"],
    bare: [1.4, "the leaves fall away and leave bare branches", "dim"],
  },
  base: { sway: 0, wind: 0, bloom: 0, autumn: 0, bare: 0 },
  st: {
    still: { sway: 0, wind: 0, bloom: 0, autumn: 0, bare: 0 },
    sway: { sway: 1, wind: 0, bare: 0 },
    wind: { wind: 1, sway: 0, bare: 0 },
    blossom: { bloom: 1, autumn: 0, bare: 0, wind: 0, sway: 0 },
    autumn: { autumn: 1, bloom: 0, bare: 0, wind: 0, sway: 0 },
    bare: { bare: 1, autumn: 1, bloom: 0, wind: 0, sway: 0 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "No fruit. Lobes are drawn as separate shaded balls (outlines give the leafy bumps). Bare keeps `autumn` at 1 so leaves fall while the lobes shrink; leaving bare regrows the lobes.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = z, fx = cx, fy = cy + 118 * S;
    const A = S * (1.2 * Math.sin(1.1 * t) + 0.5 * Math.sin(2.3 * t + 1) + v.sway * (5 * Math.sin(1.7 * t + 0.4) + 1.5 * Math.sin(3.9 * t))
      + v.wind * (16 + 4 * Math.sin(3.1 * t) + 2 * Math.sin(7.3 * t + 1)));
    const P = (x, h, jx = 0, jy = 0) => { const k = h / H; return [fx + x * S + A * k * k + jx, fy - h * S + jy]; };
    const J = (i) => [S * v.wind * (2.2 * Math.sin(6.1 * t + i * 1.7) + 0.8 * Math.sin(11 * t + i)), S * v.wind * 1.4 * Math.sin(5.3 * t + i * 2.3)];
    shadow(c, fx + A * 0.1, fy + 1 * S, 50 * S, 9 * S, "#000000", 0.5);
    // trunk + flare + branches: one bark blob
    const trunk = tube([P(0, 0), P(-1, 28), P(1, 58), P(0, 88)].flatMap((p, i, a) => i ? bez(a[i - 1], [(a[i - 1][0] + p[0]) / 2, (a[i - 1][1] + p[1]) / 2], p, 4) : [p]), 13 * S, 8 * S);
    const polys = [trunk, ell(fx, fy - 3 * S, 22 * S, 7 * S), ...BRANCH.map(([a, b, d, r0, r1]) => tube(bez(P(...a), P(...b), P(...d), 8), r0 * S, r1 * S))];
    blob(c, polys, { ramp: R8.bark, base: 3.4, gain: 2.2, slope: 0.5, thick: 9 * S, rimLit: 0.9 });
    // crown
    const leaf = 1 - v.bare;
    LOBES.forEach(([x, h, r], i) => {
      const k = sm3(leaf, THR[i] * 0.55, THR[i] * 0.55 + 0.4);
      if (k <= 0.04) return;
      const au = sm3(v.autumn, THR[i] * 0.55, THR[i] * 0.55 + 0.45);
      let ramp = mixRamp(R8.leaf, i % 4 === 0 ? mixRamp(R8.autumn, R8.red, 0.35) : R8.autumn, au);
      if (i % 3 === 1) ramp = mixRamp(ramp, R8.lime, 0.45 * (1 - au));
      const [jx, jy] = J(i), [px, py] = P(x, h + (1 - k) * r * 0.4, jx, jy);
      blob(c, [ell(px, py, r * S * k, r * S * k * 0.96)], { ramp, base: 3.15 + (h > 165 ? 0.25 : -0.05), gain: 2.1, slope: 1.0, thick: Math.max(4, r * 0.62) * S, rimLit: 0.9 });
    });
    // blossoms
    if (v.bloom > 0.01) for (const [x, h, th] of DOTS) {
      const k = sm3(v.bloom, th * 0.6, th * 0.6 + 0.4) * leaf; if (k < 0.15) continue;
      const [jx, jy] = J(h), [px, py] = P(x, h, jx, jy), X = Math.round(px), Y = Math.round(py), cl = k > 0.8 ? R8.blossom[6] : R8.blossom[3];
      c.px(X, Y, R8.blossom[7]); if (k > 0.45) { c.px(X - 1, Y, cl); c.px(X + 1, Y, cl); c.px(X, Y - 1, cl); c.px(X, Y + 1, R8.blossom[2]); }
      if (k > 0.8) { c.px(X - 1, Y + 1, R8.blossom[2]); c.px(X + 1, Y + 1, R8.blossom[2]); c.px(X + 1, Y - 1, R8.blossom[5]); c.px(X - 1, Y - 1, R8.blossom[5]); }
    }
    // falling autumn leaves
    const env = v.autumn * (1 - v.bare);
    if (env > 0.02) for (let j = 0; j < LEAVES.length; j++) {
      const [x0, h0, ph0, sp] = LEAVES[j], ph = (t * 0.16 * sp + ph0) % 1, h = h0 * (1 - ph), x = x0 + 22 * Math.sin(ph * 8 + j * 2) + ph * 12;
      const a = env * Math.min(1, ph * 6) * Math.min(1, (1 - ph) * 6); if (a <= 0) continue;
      const g = fade(c, a), [px, py] = P(x, h), X = Math.round(px), Y = Math.round(py), cl = j % 2 ? R8.autumn[5] : R8.autumn[3];
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) if (dx + dy < 4) g.px(X + dx, Y + dy, dy === 2 || dx === 2 ? R8.autumn[2] : cl);
    }
    return { box: { x0: cx - 92 * S + Math.min(0, A), y0: fy - 240 * S, x1: cx + 92 * S + Math.max(0, A), y1: fy + 6 * S }, pt: [cx + A * 0.4, fy - 150 * S] };
  },
};
const OUTL = "#07060E";
