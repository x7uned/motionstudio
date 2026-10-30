// steve-real · inventory-grid (new, 2026-10-28): OUR own 4 × 9 inventory card (three rows + a separated bottom row) — not
// the game's GUI art. Slots fill in a wave with small gold-block icons, «64» counts appear, slots can turn into purple
// boxes in a second wave; one slot can pulse. HUD item; s.cols / s.rows change the grid (the box's own 3 × 9 grid).
import { plate, label, C, TINY } from "../lib/hud.mjs";
import { putIcon } from "../lib/blocks.mjs";
import { fade, mix } from "../../../../../renderer/pixel/raster.mjs";
const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const back = (x) => { x = clamp01(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
/** slot geometry: centre of slot i for a card at (cx, cy) */
export function slotXY(i, cx, cy, o = {}) {
  const cols = o.cols ?? 9, rows = o.rows ?? 4, sz = o.size ?? 40, gap = 2, sep = rows === 4 ? 8 : 0, W = cols * (sz + gap) - gap, H = rows * (sz + gap) - gap + sep;
  const r = Math.floor(i / cols), q = i % cols; return [R(cx - W / 2 + q * (sz + gap) + sz / 2), R(cy - H / 2 + r * (sz + gap) + (r === rows - 1 ? sep : 0) + sz / 2)];
}
export default {
  kind: "inventory-grid", covers: ["inventory", "slots", "grid"], source: "steve-real/film (new)", hud: true,
  desc: "a 4 x 9 slot inventory card; slots fill with gold blocks in a wave, counts appear, slots turn into purple boxes",
  hw: 196, hh: 92, start: "empty slots",
  states: { empty: [0.4, "empty slots"], fill: [1.4, "slots fill with gold in a wave", "tick"], count: [0.5, "a count appears on every slot", "blip"], boxes: [1.6, "slots turn into purple boxes one by one", "tick"] },
  base: { fill: 0, count: 0, boxes: 0 }, st: { empty: { fill: 0, count: 0, boxes: 0 }, fill: { fill: 1 }, count: { count: 1 }, boxes: { boxes: 1 } }, linear: ["fill", "boxes"],
  draw(c, cx, cy, z, t, s) {
    const a = s.a ?? 1, cols = s.cols ?? 9, rows = s.rows ?? 4, n = cols * rows, sz = s.size ?? 40, gap = 2, sep = rows === 4 ? 8 : 0;
    const W = cols * (sz + gap) - gap, H = rows * (sz + gap) - gap + sep, x0 = R(cx - W / 2), y0 = R(cy - H / 2);
    plate(c, x0 - 8, y0 - 8, W + 16, H + 16, a, s.edge ?? "#B9A8E0", "#2A2340");
    const g = fade(c, a), v = s.v, fillN = v.fill * (n + 6), boxN = v.boxes * (n + 3);
    for (let i = 0; i < n; i++) {
      const [sx, sy] = slotXY(i, cx, cy, { cols, rows, size: sz }), X = sx - sz / 2, Y = sy - sz / 2;
      g.rect(X, Y, sz, sz, "#4A4064"); g.rect(X, Y, sz, 1, "#1E1830"); g.rect(X, Y, 1, sz, "#1E1830"); g.rect(X + 1, Y + sz - 1, sz - 1, 1, "#6E6290"); g.rect(X + sz - 1, Y + 1, 1, sz - 1, "#6E6290");
      const pulse = s.pulse === i ? Math.sin(Math.PI * clamp01(s.pulseK ?? 0)) : 0;
      if (pulse > 0) { const pg = fade(c, a * pulse); pg.frame(X - 2, Y - 2, sz + 4, sz + 4, C.Y); pg.frame(X - 1, Y - 1, sz + 2, sz + 2, "#FFF2A6"); }
      const f = clamp01((fillN - i) / 6), b = clamp01(((s.boxAt ? s.boxAt(i) : boxN - i)) / 3), ic = Math.round(sz * 0.5);
      if (f > 0 && b < 1) putIcon(fade(c, a * (1 - b)), "gold", sx, sy - 1, ic, back(f) * (1 + 0.15 * pulse));
      if (b > 0) putIcon(fade(c, a * Math.min(1, b * 1.5)), "shulker", sx, sy - 1, ic, back(b) * (1 + 0.15 * pulse));
      const ca = a * v.count * f * (1 - b); if (ca > 0.02) { const txt = s.countText ?? "64", tw = c.measure(TINY, txt, { scale: 2 }); const cg = fade(c, ca); cg.text(TINY, txt, X + sz - tw - 1, Y + sz - 11, C.O, { scale: 2 }); cg.text(TINY, txt, X + sz - tw - 2, Y + sz - 12, C.IV, { scale: 2 }); }
    }
    return { box: { x0: x0 - 8, y0: y0 - 8, x1: x0 + W + 8, y1: y0 + H + 8 }, pt: [cx, cy] };
  },
};
