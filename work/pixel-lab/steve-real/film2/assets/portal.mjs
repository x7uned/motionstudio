// steve-real · portal (new, 2026-10-28): a standing gateway — a frame of dark purple-black blocks around a swirling purple
// field (our own drawing, not a game texture). States: open (frame dissolves in, the field spreads from the centre) /
// close (the field collapses to a point, the frame dissolves). Sparks drift out while it is open.
import { mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
const R = Math.round, TAU = Math.PI * 2, clamp01 = (v) => Math.max(0, Math.min(1, v));
const RAMP = ["#2A0C52", "#40148A", "#5A22B0", "#7A3CD6", "#9E66EE", "#C9A2FF", "#EEDCFF"];
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export default {
  kind: "portal", covers: ["portal", "gateway", "magic door"], source: "steve-real/film (new)",
  desc: "standing frame of dark blocks with a swirling purple field; opens from the centre, collapses shut",
  hw: 48, hh: 64, start: "the field swirls, sparks drift out",
  states: { open: [0.6, "frame forms, the purple field spreads from the centre", "swell"], close: [0.8, "the field collapses to a point, the frame fades", "fold"] },
  base: { field: 1, frame: 1 }, st: { open: { field: 1, frame: 1 }, close: { field: 0, frame: 0 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const v = s.v, B = R(16 * z), cols = 6, rows = 8, W = cols * B, H = rows * B, x0 = R(cx - W / 2), y0 = R(cy + this.hh * z - H);
    const frA = clamp01(v.frame * 1.4 - 0.15 * (1 - v.field)), fg = fade(c, frA);
    // the field (inside the frame): swirl bands, spread from the centre by v.field
    const ix0 = x0 + B, iy0 = y0 + B, iw = W - 2 * B, ih = H - 2 * B, fcx = ix0 + iw / 2, fcy = iy0 + ih / 2;
    if (v.field > 0.01) for (let y = iy0; y < iy0 + ih; y++) for (let x = ix0; x < ix0 + iw; x++) {
      const dx = (x - fcx) / (iw / 2), dy = (y - fcy) / (ih / 2), d = Math.hypot(dx, dy) / 1.42;
      if (d > v.field * 1.05) continue; if (d > v.field * 1.05 - 0.12 && (v.field * 1.05 - d) / 0.12 < bayer(x, y)) continue;
      const an = Math.atan2(dy, dx), sw = Math.sin(an * 2 + d * 7 - t * 3.2) * 0.5 + Math.sin(dy * 5 + t * 1.7 + Math.sin(dx * 4 - t)) * 0.35;
      const k = clamp01(0.42 + sw * 0.38 + (1 - d) * 0.12); const i = Math.min(RAMP.length - 1, Math.floor(k * (RAMP.length - 1) + bayer(x, y)));
      c.px(x, y, RAMP[i]);
    }
    // the frame: blocks with a dark speckle and a lilac glint, outlined
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (i > 0 && i < cols - 1 && j > 0 && j < rows - 1) continue;
      const bx = x0 + i * B, by = y0 + j * B;
      fg.rect(bx, by, B, B, "#160C26"); fg.rect(bx + 1, by + 1, B - 2, B - 2, "#24143E");
      for (let q = 0; q < 4; q++) { const r = rnd(i * 31 + j * 7 + q); fg.rect(bx + 1 + R(r * (B - 3)), by + 1 + R(rnd(q * 11 + i + j * 5) * (B - 3)), Math.max(1, R(B / 6)), Math.max(1, R(B / 6)), q % 2 ? "#3E2466" : "#0E0618"); }
      fg.rect(bx + 1, by + 1, B - 2, 1, "#4A2E78");
    }
    fg.frame(x0 - 1, y0 - 1, W + 2, H + 2, "#07060E"); fg.frame(ix0, iy0, iw, ih, "#07060E");
    // sparks drifting out of the field
    if (v.field > 0.05) for (let q = 0; q < 14; q++) {
      const ph = (t * 0.45 + rnd(q * 3 + 1)) % 1, sx = fcx + (rnd(q * 5 + 2) - 0.5) * iw * 1.5 + Math.sin(t + q) * 4 * z, sy = fcy + ih * 0.4 - ph * ih * 1.1;
      const a = v.field * Math.sin(Math.PI * ph); if (a > bayer(R(sx), R(sy)) * 1.2) c.rect(R(sx), R(sy), Math.max(1, R(z)), Math.max(1, R(z)), q % 3 ? "#C9A2FF" : "#EEDCFF");
    }
    return { box: { x0, y0, x1: x0 + W, y1: y0 + H }, pt: [fcx, fcy] };
  },
};
