// catalog-v1 copy (2026-10-26) of work/pixel-lab/deadliest/film/levels/desert-kit.mjs#sparkle (a four-ray star with a
// bright core and diagonal glints from size 3, used by the desert film's poke and the village spell). Changes: the
// one function only; fade imported from the shared raster.mjs (the film takes it from its cute.mjs); R inlined. The
// drawing is unchanged. Ray length is an integer, so the caller must fade a star out (through `a`) before its size
// drops below 0.6, which this function already treats as nothing.
import { fade } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;

export function sparkle(c, x, y, s, col = "#FFFFFF", a = 1, core = "#FFFFFF") {
  if (a <= 0 || s < 0.6) return; const g = fade(c, a), n = R(s);
  for (let k = 1; k <= n; k++) { const q = k > n * 0.6 ? col : core; g.px(R(x) + k, R(y), q); g.px(R(x) - k, R(y), q); g.px(R(x), R(y) + k, q); g.px(R(x), R(y) - k, q); }
  g.px(R(x), R(y), core); if (n >= 3) { g.px(R(x) + 1, R(y) + 1, col); g.px(R(x) - 1, R(y) - 1, col); g.px(R(x) + 1, R(y) - 1, col); g.px(R(x) - 1, R(y) + 1, col); }
}
