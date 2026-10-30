// steve-real · eiffel-silhouette (new, 2026-10-28): a flat skyline silhouette of a lattice tower (arched base, two platforms,
// tapering spire) in dusky blue with a light edge and a cross-hatch hint. States: down (hidden below its base) / rise
// (rises into view) / glow (edge brightens). s.part (0..1) keeps only the lower part of a tower (a partial one).
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
const R = Math.round;
export function halfW(h) { // half width (fraction of the tower height) at height fraction h: splayed legs, two platforms, thin spire
  if (h > 0.96) return 0.006;
  const base = h < 0.2 ? 0.3 - 0.75 * h * (1 - h * 1.4) : h < 0.42 ? 0.15 - 0.3 * (h - 0.2) : h < 0.8 ? 0.084 - 0.17 * (h - 0.42) : 0.02 - 0.06 * (h - 0.8);
  return h > 0.415 && h < 0.44 ? base + 0.02 : h > 0.19 && h < 0.22 ? base + 0.03 : h > 0.79 && h < 0.805 ? base + 0.01 : Math.max(0.008, base);
}
export default {
  kind: "eiffel-silhouette", covers: ["eiffel tower", "tower", "landmark"], source: "steve-real/film (new)",
  desc: "flat dusky-blue silhouette of a lattice tower that rises into the skyline", hw: 40, hh: 100, start: "stands in the skyline",
  states: { down: [0.3, "hidden below its base"], rise: [0.8, "rises into the skyline", "rise"], glow: [0.4, "the edge brightens", "glow"] },
  base: { up: 1, glow: 0 }, st: { down: { up: 0 }, rise: { up: 1 }, glow: { up: 1, glow: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const H = 2 * this.hh * z, base = cy + this.hh * z, off = (1 - s.v.up) * H, part = s.part ?? 1, col = s.col ?? "#5E6A92", edge = s.v.glow > 0.5 ? "#C8D2F4" : "#7A86B8";
    for (let y = R(base - H); y <= R(base); y++) {
      const h = (base - y) / H; if (h > part + 0.0001) continue; const yy = y + R(off); const w = halfW(h) * H;
      for (let x = R(cx - w); x <= R(cx + w); x++) {
        if (h < 0.19 && Math.abs(x - cx) < w * 0.7 * Math.sqrt(Math.max(0, 1 - Math.pow(h / 0.19, 2)))) continue;   // the arch
        if (h > 0.22 && h < 0.415 && Math.abs(x - cx) < w * 0.45 * Math.sqrt(Math.max(0, 1 - Math.pow((h - 0.22) / 0.19, 2)))) continue;   // the second arch
        const rel = (x - cx) / Math.max(1, w), edgeL = x <= R(cx - w) + 0, hatch = ((x + y) % 7 === 0 || (x - y + 700) % 7 === 0) && Math.abs(rel) < 0.85 && h < 0.9;
        c.px(x, yy, edgeL ? edge : x >= R(cx + w) ? "#2E3456" : hatch ? "#3C4570" : col);
      }
      if (part < 1 && Math.abs(h - part) < 1 / H) for (let x = R(cx - w); x <= R(cx + w); x++) if ((x + y) % 3 === 0) c.px(x, yy, "#9AA6D8");
    }
    return { box: { x0: R(cx - 0.37 * H), y0: R(base - H * part + off), x1: R(cx + 0.37 * H), y1: R(base) }, pt: [cx, base - H * 0.6 + off] };
  },
};
