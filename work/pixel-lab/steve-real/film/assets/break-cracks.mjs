// steve-real · break-cracks (new, 2026-10-28): the 10-stage breaking overlay — dark cracks that grow from the centre of a
// face; each stage's new crack texels dither in, so it never pops. Draws over any rect (s.w × s.h px, default 64 × 64).
import { crackAt } from "../lib/blocks.mjs";
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
export default {
  kind: "break-cracks", covers: ["cracks", "breaking", "damage"], source: "steve-real/film (new)",
  desc: "dark cracks growing in 10 stages over a block face", hw: 32, hh: 32, start: "no cracks",
  states: { none: [0.3, "clean face"], crack: [3, "cracks grow in 10 stages", "tick"] },
  base: { stage: 0 }, st: { none: { stage: 0 }, crack: { stage: 1 } }, linear: ["stage"],
  draw(c, cx, cy, z, t, s) {
    const w = (s.w ?? 64) * z, h = (s.h ?? 64) * z, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2), st = Math.floor(s.v.stage * 10 + 0.0001) / 10 + (s.v.stage * 10 % 1) * 0.1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const iu = Math.min(15, Math.floor((x / w) * 16)), iv = Math.min(15, Math.floor((y / h) * 16)), k = crackAt(iu, iv, st); if (k > 0 && k > bayer(x0 + x, y0 + y)) c.px(x0 + x, y0 + y, "#1E1A26"); }
    return { box: { x0, y0, x1: x0 + w, y1: y0 + h }, pt: [cx, cy] };
  },
};
