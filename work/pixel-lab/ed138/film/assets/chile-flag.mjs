// ed138 «chile-flag» (new, 2026-10-28): the flag of Chile drawn in pixels by us (public-domain design: white over red, a blue
// square at the hoist with a white five-point star) on a slim pole, the cloth waving with shaded folds. States: down (furled
// low on the pole), raise (hoisted to the top, waving), flutter (a strong wind). Pure function of its inputs.
import { bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { clamp01, band } from "../lib/layout.mjs";
import { Spr, OUT } from "../lib/space-kit.mjs";

const WHITE = ["#2A2A3A", "#4A4A60", "#70708A", "#9898B0", "#BEBED0", "#DCDCE8", "#F0F0F6", "#FFFFFF"];
const RED = ["#2A060A", "#4A0C12", "#70141C", "#981E26", "#BC2A30", "#D8403E", "#EC6656", "#F89478"];
const BLUE = ["#060A26", "#0C1646", "#14266C", "#1C3890", "#2A4CB0", "#4068C8", "#5E88DC", "#88AAEC"];
const POLE = ["#1A1820", "#2C2A36", "#46424E", "#64606E", "#8A8694", "#B0ACBA", "#D2CEDA", "#EEEAF4"];

function inStar(x, y, cx, cy, r) {              // five-point star (point up), polar test
  const dx = x - cx, dy = y - cy, ang = Math.atan2(dx, -dy), d = Math.hypot(dx, dy), k = ((ang / (2 * Math.PI / 5)) % 1 + 1) % 1;
  const rr = r * (0.42 + 0.58 * Math.abs(1 - 2 * k) ** 1.6); return d <= rr * 0.98;
}
/** o: { a, raise 0..1, wind 0..1, t } */
export function drawFlag(c, cx, cy, z, o) {
  const t = o.t ?? 0, raise = clamp01(o.raise ?? 1), wind = clamp01(o.wind ?? 0.35), FW = 48, FH = 32, PH = 100;
  const base = cy + 50 * z, px0 = cx - 26 * z, spr = new Spr(cx, cy, 34 * z, 56 * z);
  // pole with a gold finial
  for (let Y = Math.floor(base - PH * z); Y <= base; Y++) for (let X = Math.floor(px0 - 1.5 * z); X <= px0 + 1.5 * z; X++) { const u = (X + 0.5 - px0) / (1.5 * z); spr.set(X, Y, band(POLE, 0.7 - 0.45 * u, X, Y)); }
  for (let j = -2; j <= 1; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= 4 * z) spr.set(Math.round(px0 + i), Math.round(base - PH * z - 2 + j), j < 0 ? "#FDE07A" : "#C88A0C");
  // cloth: hoisted to the top by `raise`; furled (narrow) while low
  const top = base - (8 + (PH - 10 - FH) * raise) * z - FH * z, spread = 0.25 + 0.75 * clamp01(raise * 1.3);
  const amp = (1.2 + 3.5 * wind) * z, w = 2.2 + 2 * wind, k = 0.2;
  for (let i = 0; i < Math.ceil(FW * spread * z); i++) {
    const u = i / (FW * z * spread), fu = u * FW, ph = fu * k - t * w;
    const dy = amp * u * Math.sin(ph), slope = amp * u * k * Math.cos(ph) * spread, shade = -slope * 0.55;
    const shrink = 1 - 0.05 * wind * u * (1 + Math.sin(ph * 0.7));
    for (let j = 0; j < Math.ceil(FH * z * shrink); j++) {
      const X = Math.round(px0 + 2 * z + i), Y = Math.round(top + dy + j + (1 - shrink) * FH * z * 0.5), fv = (j / (FH * z * shrink)) * FH;
      let ramp, vv = 0.72 + shade;
      if (fv >= FH / 2) ramp = RED;
      else if (fu < FW / 3) { ramp = inStar(fu, fv, FW / 6, FH / 4, 5.2) ? WHITE : BLUE; vv += ramp === BLUE ? -0.08 : 0; }
      else ramp = WHITE;
      spr.set(X, Y, band(ramp, vv - 0.15 * (1 - spread), X, Y));
    }
  }
  spr.outline(OUT, "#2A2638");
  spr.flush(c);
  return { box: { x0: px0 - 2 * z, y0: base - PH * z - 4, x1: px0 + FW * z + 4, y1: base }, pt: [px0 + FW * z * 0.5, top + FH * z * 0.5] };
}

export default {
  kind: "chile-flag",
  covers: ["chile", "flag of chile", "chilean flag", "flag"],
  source: "ed138 (new; our pixel drawing of the public-domain design)",
  desc: "the flag of Chile on a slim pole: white and red halves, blue square with a white star, waving",
  hw: 34, hh: 54, start: "hangs furled low on the pole, stirring",
  states: {
    down: [0.5, "furled low on the pole"],
    raise: [1.0, "hoisted to the top of the pole, waving", "rise"],
    flutter: [0.6, "waves hard in a strong wind", "flutter"],
  },
  base: { raise: 0, wind: 0.3 },
  st: { down: { raise: 0, wind: 0.3 }, raise: { raise: 1, wind: 0.45 }, flutter: { raise: 1, wind: 1 } },
  notes: "anchor (cx, cy) = body centre; the pole foot is at cy + 50·z",
  draw(c, cx, cy, z, t, s) {
    const v = s.v;
    return drawFlag(c, cx, cy, z, { a: s.a, raise: v.raise, wind: v.wind, t });
  },
};
