// catalog-v1 item «mirror»: the wall mirror of the not-ugly film (not-ugly/film/levels/room-cast.mjs#drawMirror,mirrorView:
// violet-tinted glass, two soft diagonal glints, dark-toned reflection). The film's frame (room-set GLASS) was not in the
// pack, so the frame is a new simple wood ramp shaded the house way; the channel hero reflection is NOT ported. The glass shows
// a plain violet gradient with a faint reflected window bar. Fog and crack are new, simple procedural states.
import { bayer, MAIN } from "../../../../renderer/pixel/raster.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v)), sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const HW = 62, HH = 92, FR = 9, RAD = 24;
const WOOD = ["#2A1A0C", "#4A2E14", "#6E4620", "#966230", "#C08A4C", "#E0B472"];
const GL = ["#1C1A44", "#2E2C5E", "#43407A", "#5C5898", "#7A76B4"];
const sdRR = (u, v, hw, hh, r) => { const qx = Math.abs(u) - (hw - r), qy = Math.abs(v) - (hh - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy), a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
const pick = (R, v, x, y, w = 0.34) => { const s = clamp01(v) * (R.length - 1), i = Math.floor(s), f = s - i, lo = 0.5 - w / 2, k = f <= lo ? 0 : f >= 1 - lo ? 1 : (f - lo) / w; return R[Math.min(R.length - 1, k > bayer(x, y) ? i + 1 : i)]; };
const lite = (col, k) => "#" + [1, 3, 5].map((i) => { const a = parseInt(col.slice(i, i + 2), 16); return Math.round(a + (255 - a) * k).toString(16).padStart(2, "0"); }).join("");
// crack: a fixed star of polylines from the impact point (film units, glass centre = 0,0); drawn up to fraction k of the length
const IMP = [14, -10];
const CRACKS = [
  [[14, -10], [26, -22], [30, -36], [44, -52], [52, -70]], [[14, -10], [32, -4], [46, 6], [56, 4]], [[14, -10], [2, -26], [-8, -40], [-20, -58]],
  [[14, -10], [4, 4], [-14, 12], [-34, 18], [-46, 34]], [[14, -10], [18, 12], [12, 34], [20, 58], [18, 74]], [[26, -22], [40, -20], [50, -30]], [[-14, 12], [-18, 28], [-30, 40]],
].map((pl) => { let L = 0; const seg = pl.slice(1).map((p, i) => { const l = Math.hypot(p[0] - pl[i][0], p[1] - pl[i][1]); const o = { a: pl[i], b: p, l0: L, l }; L += l; return o; }); return { seg, L }; });
export default {
  kind: "mirror",
  covers: ["mirror"],
  source: "not-ugly/film/levels/room-cast.mjs#drawMirror,mirrorView (glass tint + two diagonal glints)",
  desc: "wooden wall mirror, violet glass with soft reflections; can shine, fog up or crack",
  hw: 62, hh: 92,
  start: "still glass with two faint diagonal glints and a drifting light bar",
  states: {
    still: [0.5, "still wall mirror"],
    shine: [0.9, "a bright glint sweeps across the glass", "sparkle"],
    fog: [1.1, "the glass fogs up pale and blurry", "dim"],
    crack: [0.5, "cracks spread from one point across the glass", "thud"],
  },
  base: { fog: 0, crack: 0 },
  st: { still: { fog: 0, crack: 0 }, shine: { fog: 0, crack: 0 }, fog: { fog: 1, crack: 0 }, crack: { fog: 0, crack: 1 } },
  linear: ["crack"],
  demo: {},
  notes: "Frame is new (wood ramp, inner lip); the film's hero reflection is not ported, the glass shows a gradient and a soft light bar instead (s.look is not used). Crack lines are drawn as 1px polylines growing with the eased parameter. Fog coverage is a Bayer-gated noise field so it spreads smoothly.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, fog = v.fog, crack = v.crack, acc = s.acc("shine", 0, 1), sw = Math.sin(Math.PI * acc), swp = -100 + 200 * acc;
    const gw = HW - FR, gh = HH - FR;
    const x0 = Math.floor(cx - (HW + 2) * z), x1 = Math.ceil(cx + (HW + 2) * z), y0 = Math.floor(cy - (HH + 2) * z), y1 = Math.ceil(cy + (HH + 2) * z);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const u = (x + 0.5 - cx) / z, vv = (y + 0.5 - cy) / z, dd = sdRR(u, vv, HW, HH, RAD);
      if (dd >= 0.5) continue;
      if (dd >= -FR) {                                                       // wooden frame, lit from the upper left
        if (dd >= -1) { c.px(x, y, WOOD[0]); continue; }
        const w = (dd + FR) / FR, lit = clamp01(0.5 - (u / HW) * 0.35 - (vv / HH) * 0.45), lip = dd < -FR + 1.5 ? -0.25 : (w > 0.35 && w < 0.5 ? 0.12 : 0);
        c.px(x, y, pick(WOOD, 0.25 + 0.6 * lit + lip + (hash(Math.floor(u / 3), Math.floor(vv * 0.5)) - 0.5) * 0.06, x, y)); continue;
      }
      if (dd >= -FR - 1) { c.px(x, y, "#12102A"); continue; }                // inner shadow line
      // glass
      const wv = u + 0.45 * vv, g = (vv + gh) / (2 * gh);
      let col = pick(GL, 0.22 + 0.28 * (1 - g) + 0.1 * Math.sin(u * 0.05 + 1), x, y);
      const bar = (u - (-6 + 8 * Math.sin(t * 0.25)) + vv * 0.12), bw = Math.abs(bar);   // faint reflected window bar, slow drift
      if (bw < 14 && vv > -gh + 12 && vv < gh - 36) col = pick(GL, 0.5 + 0.18 * (1 - bw / 14), x, y);
      for (const [off, w, k] of [[-14, 5, 0.32], [2, 2, 0.22]]) { const dw = wv - (-32 + off); if (dw > 0 && dw < w && k > bayer(x, y)) col = lite(col, 0.3); }
      if (sw > 0.001) { const dw = Math.abs(wv - swp); if (dw < 9) col = lite(col, sw * (1 - dw / 9) * 0.75); }
      if (fog > 0) {
        const f = fog * 1.25 - 0.15 + (vnoise(u * 0.06 + 3, vv * 0.06) - 0.5) * 0.9 - Math.abs(u) / gw * 0.15;
        if (clamp01(f * 1.1) > bayer(x, y)) col = pick(["#8E8CB8", "#B0AED0", "#D2D0E6", "#ECEBF6"], 0.3 + f * 0.5 + (hash(Math.floor(u / 2), Math.floor(vv / 2)) - 0.5) * 0.2, x, y, 0.5);
      }
      c.px(x, y, col);
    }
    if (crack > 0.001) for (const cr of CRACKS) for (const sg of cr.seg) {
      const k = clamp01((crack * cr.L - sg.l0) / sg.l); if (k <= 0) continue;
      const ax = cx + sg.a[0] * z, ay = cy + sg.a[1] * z, bx = cx + (sg.a[0] + (sg.b[0] - sg.a[0]) * k) * z, by = cy + (sg.a[1] + (sg.b[1] - sg.a[1]) * k) * z;
      c.line(ax, ay, bx, by, "#F2F0FF"); c.px(ax + 1, ay + 1, "#2A2860");
    }
    return { box: { x0: cx - HW * z, y0: cy - HH * z, x1: cx + HW * z, y1: cy + HH * z }, pt: [cx, cy] };
  },
};
