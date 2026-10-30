// catalog-v1 copy (2026-10-26) of work/pixel-lab/deadliest/film/levels/river-kit.mjs#bubble (a dotted pale-cyan ring with
// one white highlight, the river film's rising bubbles). Changes: the one function only; fade imported from the shared
// raster.mjs (the film takes it from its cute.mjs); R inlined. The drawing is unchanged.
import { fade } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;

export function bubble(c, x, y, r, a = 1, rim = "#D8F6F0") { const g = fade(c, a); for (let q = 0; q < Math.PI * 2; q += 0.4 / Math.max(1, r * 0.5)) g.px(R(x + Math.cos(q) * r), R(y + Math.sin(q) * r), rim); g.px(R(x - r * 0.4), R(y - r * 0.4), "#FFFFFF"); }
