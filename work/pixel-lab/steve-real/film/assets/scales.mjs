// init asset «scales»: brass balance scales (pedestal, post, rocking beam, two hanging pans); the beam tips left or right, the pans stay level.
import { xf, RP, OUT, part, rrectP, circP, ell, roundPoly, contact, TAU, bez } from "../lib/concepts-kit.mjs";

const PIV = [0, -60], BEAM = 70, CHAIN = 60, PAN = 28;
export default {
  kind: "scales",
  covers: ["scales", "balance scales", "balance", "justice", "weighing", "compare"],
  source: "init (new)",
  desc: "brass balance scales with two hanging pans; beam tips left or right to compare",
  hw: 100, hh: 72, start: "balanced, gently swaying",
  states: {
    balanced: [0.5, "the beam is level, both pans equal"],
    "tip-left": [0.9, "the left pan sinks, the beam tilts left", "thud"],
    "tip-right": [0.9, "the right pan sinks, the beam tilts right", "thud"],
  },
  base: { tilt: 0 },
  st: { balanced: { tilt: 0 }, "tip-left": { tilt: -1 }, "tip-right": { tilt: 1 } },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "tilt is eased by the engine; pans hang vertically from the beam ends, a tiny pendulum sway keeps it alive",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, beta = v.tilt * 0.27 + Math.sin(t * 1.5) * 0.012 * (1 - Math.abs(v.tilt) * 0.6);
    const T = xf(cx, cy + 4 * z, z), cb = Math.cos(beta), sb = Math.sin(beta);
    contact(c, cx, cy + 70 * z, 54 * z, 5 * z, 0.38 * s.a);
    const end = (sg) => [PIV[0] + sg * BEAM * cb, PIV[1] + sg * BEAM * sb];     // sg −1 left, +1 right (positive tilt: right end goes down)
    // base and post
    part(c, [T.m([[-44, 64], [-30, 46], [30, 46], [44, 64], [28, 69], [-28, 69]].map(([x, y]) => [x, y]))], RP.brass, z, { thick: 10, base: 2.5, gain: 2.4 });
    part(c, [T.m(rrectP(-8, -56, 8, 52, 4))], RP.brass, z, { thick: 8, base: 2.6, gain: 2.4, slope: 0.4 });
    // pans with chains
    for (const sg of [-1, 1]) {
      const e = end(sg), rimY = e[1] + CHAIN, L = T(e[0], e[1]);
      for (const dxp of [-PAN + 2, PAN - 2]) {
        const q = T(e[0] + dxp, rimY);
        c.line(Math.round(L[0]), Math.round(L[1]), Math.round(q[0]), Math.round(q[1]), RP.brass[0]);
        c.line(Math.round(L[0]) + (dxp < 0 ? 1 : -1), Math.round(L[1]) + 1, Math.round(q[0]) + (dxp < 0 ? 1 : -1), Math.round(q[1]), RP.brass[4], [2, 1]);
      }
      const bowl = [[-PAN, 0], ...bez([-PAN, 0], [-PAN + 2, 20], [0, 20], 8).slice(1), ...bez([0, 20], [PAN - 2, 20], [PAN, 0], 8).slice(1)].map(([x, y]) => [e[0] + x, rimY + y]);
      part(c, [T.m(bowl)], RP.brass, z, { thick: 10, base: 2.5, gain: 2.5 });
      // rim ellipse (the pan seen slightly from above)
      const rim = T.m(ell(e[0], rimY, PAN + 1, 4.5, 0, 28)), rc = T(e[0], rimY);
      c.poly(rim, RP.brass[0]); c.poly(T.m(ell(e[0], rimY + 0.5, PAN - 1, 3, 0, 28)), RP.brass[2]);
      c.px(Math.round(rc[0] - PAN * 0.6 * z), Math.round(rc[1] - 1), RP.brass[6]);
      part(c, [T.m(circP(e[0], e[1], 4.5))], RP.brass, z, { thick: 4, base: 3.6, gain: 1.6 });     // ring where the chain hangs
    }
    // beam
    const bp = [[-BEAM - 4, -7], [-BEAM - 4, 7], [-14, 7], [-9, 11], [9, 11], [14, 7], [BEAM + 4, 7], [BEAM + 4, -7], [14, -7], [9, -11], [-9, -11], [-14, -7]].map(([x, y]) => [PIV[0] + x * cb - y * sb, PIV[1] + x * sb + y * cb]);
    part(c, [T.m(bp)], RP.brass, z, { thick: 7, base: 2.7, gain: 2.4 });
    part(c, [T.m(circP(PIV[0], PIV[1], 12))], RP.brass, z, { thick: 8, base: 3.8, gain: 2.0 });
    const pc = T(PIV[0] - 3, PIV[1] - 4); c.px(Math.round(pc[0]), Math.round(pc[1]), "#FFFFFF");
    part(c, [T.m(circP(PIV[0], PIV[1] - 16, 6))], RP.brass, z, { thick: 5, base: 3.8, gain: 1.8 });
    return { box: { x0: Math.round(cx - 100 * z), y0: Math.round(cy + (4 - 68) * z), x1: Math.round(cx + 100 * z), y1: Math.round(cy + (4 + 68) * z) }, pt: [Math.round(cx), Math.round(cy + 4 * z)] };
  },
};
