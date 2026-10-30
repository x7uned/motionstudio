// steve-real · asphalt-cracks (new, 2026-10-28): a web of cracks spreading over a pavement / road surface seen at a low angle
// (flattened), with a dark sunken crater in the middle, lifted slab edges and dust. States: none / crack (the web spreads
// from the centre, the crater sinks) / settle (dust clears). Size by z (radius ≈ 70 px at z 1).
import { bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
const R = Math.round, TAU = Math.PI * 2, clamp01 = (v) => Math.max(0, Math.min(1, v));
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const RAYS = (() => { const out = []; for (let k = 0; k < 11; k++) { let a = (k / 11) * TAU + rnd(k) * 0.4, x = 0, y = 0; const pts = [[0, 0]]; const L = 0.6 + rnd(k + 20) * 0.45; for (let i = 1; i <= 14; i++) { a += (rnd(k * 31 + i) - 0.5) * 0.5; x += Math.cos(a) * (L / 14); y += Math.sin(a) * (L / 14); pts.push([x, y]); if (i === 6 && rnd(k + 7) < 0.6) { let bx = x, by = y, ba = a + (rnd(k + 9) < 0.5 ? 0.9 : -0.9); const br = [[bx, by]]; for (let j = 1; j < 6; j++) { ba += (rnd(k * 7 + j) - 0.5) * 0.5; bx += Math.cos(ba) * 0.04; by += Math.sin(ba) * 0.04; br.push([bx, by]); } out.push({ pts: br, t0: 0.35 }); } } out.push({ pts, t0: 0 }); } return out; })();
export default {
  kind: "asphalt-cracks", covers: ["cracks", "broken road", "crater"], source: "steve-real/film (new)",
  desc: "a web of cracks spreading over the pavement with a sunken crater and dust", hw: 72, hh: 20, start: "intact",
  states: { none: [0.3, "intact"], crack: [0.9, "the crack web spreads, the centre sinks", "crunch"], settle: [1.2, "dust clears"] },
  base: { k: 0, dust: 0 }, st: { none: { k: 0, dust: 0 }, crack: { k: 1, dust: 1 }, settle: { k: 1, dust: 0 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const k = s.v.k, rx = 72 * z, ry = 20 * z;
    if (k <= 0.001) return { box: { x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry }, pt: [cx, cy] };
    // crater: dark sunken ellipse with a lit far rim and a shaded near rim
    const cr = clamp01(k * 1.6), ex = 26 * z * cr, ey = 8 * z * cr;
    for (let y = -R(ey) - 2; y <= R(ey) + 2; y++) for (let x = -R(ex) - 2; x <= R(ex) + 2; x++) {
      const d = (x / Math.max(1, ex)) ** 2 + (y / Math.max(1, ey)) ** 2; if (d > 1.18) continue;
      c.px(R(cx + x), R(cy + y), d > 1 ? (y < 0 ? "#8A84A0" : "#1A1624") : y < 0 ? "#141020" : "#2A2438");
    }
    // the web: rays grow from the centre (flattened), each ray's pixels appear along its length
    for (const ray of RAYS) { const g = clamp01((k - ray.t0) / (1 - ray.t0)); const n = ray.pts.length - 1, m = g * n;
      for (let i = 0; i < Math.min(n, Math.ceil(m)); i++) { const [ax, ay] = ray.pts[i], [bx, by] = ray.pts[i + 1], f = Math.min(1, m - i); const X0 = cx + ax * rx * 1.25, Y0 = cy + ay * ry * 2.4, X1 = cx + (ax + (bx - ax) * f) * rx * 1.25, Y1 = cy + (ay + (by - ay) * f) * ry * 2.4;
        if (Math.hypot(ax * 1.25 / 0.36, ay * 2.4 / 0.4 * (ry / rx)) < 0.7 * cr) continue;
        c.line(R(X0), R(Y0), R(X1), R(Y1), "#120E1C"); if (i < 4) c.line(R(X0), R(Y0) - 1, R(X1), R(Y1) - 1, "#3A344C"); } }
    // dust puffs
    const du = s.v.dust; if (du > 0.02) for (let q = 0; q < 16; q++) { const a = (q / 16) * TAU, r = (0.4 + 0.6 * k) * rx * (0.5 + rnd(q) * 0.6), px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.3 - 10 * z * k * rnd(q + 4), rr = (5 + rnd(q + 9) * 5) * z;
      for (let j = -R(rr); j <= R(rr); j++) for (let i = -R(rr); i <= R(rr); i++) if (i * i + j * j <= rr * rr && du * 0.85 > bayer(R(px + i), R(py + j)) + (i * i + j * j) / (rr * rr) * 0.4) c.px(R(px + i), R(py + j), j < 0 ? "#D8D0E4" : "#B0A8C0"); }
    return { box: { x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry }, pt: [cx, cy] };
  },
};
