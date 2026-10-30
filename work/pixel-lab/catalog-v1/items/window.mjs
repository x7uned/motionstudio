// catalog-v1 item «window»: the tall window of the cat-zoomies apartment (cat-zoomies/film/apartment-props.mjs#drawWindow:
// white frame with two mullions, sill with apron, a small succulent in a pot, curtain rod) plus the rose floor-length curtain
// (drawCurtain). The film paints the glass in its sky pass; here the glass is drawn in the item: a day sky with a soft cloud,
// and a night sky with stars and a crescent moon, crossfaded by dissolve. Film code copied in lib/zoomies-props.mjs (PAL,
// LAYOUT), drawn through lib/zoomies-props-canvas.mjs. Scale S = catalog px per film unit at z 1.
import { target, put, span, rect, rect1, poly, ellipse, disc, ring, dim, vol, smooth, rr, rgb, bayer } from "./lib/zoomies-props-canvas.mjs";
import { PAL } from "./lib/zoomies-props.mjs";
import { LAYOUT } from "./lib/zoomies-layout.mjs";

const R = Math.round, W = 540, H = 960;
const S = 0.6, OX = 160, OY = -199;            // film origin of the window + curtain group, px per film unit at z 1
const DAY = ["#5EA6E0", "#78B6E8", "#94C6EE", "#B4D8F3", "#D6EBF9"];
const NIGHT = ["#111A3E", "#17245A", "#1E2F70", "#283C84", "#34489A"];

// ---- helpers (as in the film, taking the local layer L)
const visX = (L, x0, x1) => L.X(x1) >= -2 && L.X(x0) <= W + 2;
const visY = (L, y0, y1) => L.Y(y1) >= -2 && L.Y(y0) <= H + 2;
const vis = (L, x0, y0, x1, y1) => visX(L, x0, x1) && visY(L, y0, y1);
const wr = (L, x0, y0, x1, y1, c) => rect(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), c);
const wr1 = (L, x0, y0, x1, y1, c) => rect1(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), c);
const T = (L) => (p) => [L.X(p[0]), L.Y(p[1])];
function box(x0, y0, x1, y1, Rm, { fill = 3, hi = 5, lo = 2, out = 0, b = 1 } = {}) {
  x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1); if (x1 - x0 < 2 || y1 - y0 < 2) { rect(x0, y0, Math.max(x1, x0 + 1), Math.max(y1, y0 + 1), Rm[out]); return; }
  rect(x0, y0, x1, y1, Rm[fill]);
  b = Math.max(1, R(b));
  rect(x0 + 1, y0 + 1, x1 - 1, y0 + 1 + b, Rm[hi]); rect(x0 + 1, y0 + 1, x0 + 1 + b, y1 - 1, Rm[hi]);
  rect(x0 + 1, y1 - 1 - b, x1 - 1, y1 - 1, Rm[lo]); rect(x1 - 1 - b, y0 + 1 + b, x1 - 1, y1 - 1, Rm[lo]);
  rect(x0, y0, x1, y0 + 1, Rm[out]); rect(x0, y1 - 1, x1, y1, Rm[out]); rect(x0, y0, x0 + 1, y1, Rm[out]); rect(x1 - 1, y0, x1, y1, Rm[out]);
}
const wbox = (L, x0, y0, x1, y1, Rm, o = {}) => box(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), Rm, { b: Math.max(1, (o.bu ?? 1.4) * L.z), ...o });
const hash = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** Glass: a vertical band gradient with a dithered seam between bands. */
function glass(L, Wn, stops) {
  const f = 8, xa = R(L.X(Wn.x0 + f)), xb = R(L.X(Wn.x1 - f)), ya = R(L.Y(Wn.top + f)), yb = R(L.Y(Wn.sill - f));
  const n = stops.length;
  for (let y = ya; y < yb; y++) {
    const g = ((y + 0.5 - ya) / Math.max(1, yb - ya)) * (n - 1), i0 = Math.floor(g), fr = g - i0;
    span(y, xa, xb, (x) => (fr > 0.7 && bayer(x, y) < (fr - 0.7) / 0.3 ? stops[Math.min(n - 1, i0 + 1)] : stops[i0]));
  }
}

/** Frame, mullions, sill, apron, succulent and rod (film drawWindow; the reveal and the glass are drawn before this). */
function drawFrame(L, t, Wn, z) {
  const f = 8, gx0 = Wn.x0 + f, gx1 = Wn.x1 - f, gy0 = Wn.top + f, gy1 = Wn.sill - f, mx = (Wn.x0 + Wn.x1) / 2, my = Wn.top + (Wn.sill - Wn.top) * 0.45;
  const bar = (x0, y0, x1, y1) => wbox(L, x0, y0, x1, y1, PAL.trim, { fill: 4, hi: 6, lo: 2, bu: 1.2 });
  bar(Wn.x0, Wn.top, Wn.x1, gy0); bar(Wn.x0, gy1, Wn.x1, Wn.sill); bar(Wn.x0, gy0 - 1, gx0, gy1 + 1); bar(gx1, gy0 - 1, Wn.x1, gy1 + 1);
  bar(mx - 2.5, gy0, mx + 2.5, gy1); bar(gx0, my - 2.5, gx1, my + 2.5);
  wbox(L, Wn.x0 - 9, Wn.sill, Wn.x1 + 9, Wn.sill + 7, PAL.trim, { fill: 4, hi: 6, lo: 2 });
  wbox(L, Wn.x0 + 2, Wn.sill + 7, Wn.x1 - 2, Wn.sill + 14, PAL.trim, { fill: 3, hi: 5, lo: 1 });
  dim(L.X(Wn.x0 - 4), L.Y(Wn.sill + 14), L.X(Wn.x1 + 4), L.Y(Wn.sill + 22), (x, y) => 1 - (y - L.Y(Wn.sill + 14)) / Math.max(1, 8 * z), 0.25);
  // little succulent in a pot on the sill (static, as in the film)
  const px = Wn.x0 + 26;
  for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.48, lx = px + Math.cos(a) * 8, ly = Wn.sill - 14 + Math.sin(a) * 9; vol([smooth([[px, Wn.sill - 13], [lx - 2.5, ly + 2], [lx + Math.cos(a) * 3, ly + Math.sin(a) * 3], [lx + 2.5, ly + 2]].map(T(L)))], PAL.leaf, { thick: 3 * z, base: 3.2, gain: 1.4 }); }
  vol([smooth([[px - 8, Wn.sill - 14], [px + 8, Wn.sill - 14], [px + 6, Wn.sill], [px - 6, Wn.sill]].map(T(L)), new Set([0, 1, 2, 3]))], PAL.pot, { thick: 4 * z, base: 3.2, gain: 1.4 });
  wbox(L, px - 9, Wn.sill - 16, px + 9, Wn.sill - 13, PAL.pot, { fill: 4, hi: 6, lo: 2 });
  // curtain rod with brass finials
  const ry = LAYOUT.curtain.top - 6;
  wr1(L, Wn.x0 - 12, ry, LAYOUT.curtain.x1 + 10, ry + 2.6, PAL.brass[2]); wr1(L, Wn.x0 - 12, ry, LAYOUT.curtain.x1 + 10, ry + 0.9, PAL.brass[5]);
  for (const fx of [Wn.x0 - 14, LAYOUT.curtain.x1 + 12]) { disc(L.X(fx), L.Y(ry + 1.3), Math.max(1.2, 3.4 * z), PAL.brass[2]); disc(L.X(fx - 0.8), L.Y(ry + 0.5), Math.max(0.6, 1.5 * z), PAL.brass[5]); }
  for (const bx of [Wn.x0 - 9, Wn.x1 - 54]) wr1(L, bx, ry - 2, bx + 3, ry + 7, PAL.brass[1]);
}

/** Floor-length rose curtain with a swaying hem (film drawCurtain). swing 0..1. */
function drawCurtain(L, t, swing) {
  const Cu = LAYOUT.curtain, z = L.z;
  if (!vis(L, Cu.x0 - 30, Cu.top - 6, Cu.x1 + 30, Cu.bottom)) return;
  const ya = Math.max(0, R(L.Y(Cu.top))), yb = Math.min(H, R(L.Y(Cu.bottom))), RO = PAL.rose, hgt = Cu.bottom - Cu.top;
  const ph = 2 * Math.PI * 0.85 * t;
  for (let y = ya; y < yb; y++) {
    const wy = L.wy(y + 0.5), s = Math.max(0, Math.min(1, (wy - Cu.top) / hgt));
    const sway = swing * (10 * Math.sin(ph - s * 1.4) * Math.pow(s, 1.5) + 2.2 * Math.sin(ph * 2.1 + 1.3) * s * s);
    const flare = 1 + 4 * Math.pow(s, 2);
    const xl = Cu.x0 - flare + sway + (s < 0.06 ? 2 * (0.06 - s) / 0.06 : 0), xr = Cu.x1 + flare + sway * 0.85 - (s < 0.06 ? 2 * (0.06 - s) / 0.06 : 0);
    const sxl = L.X(xl), sxr = L.X(xr), wdt = Math.max(1, sxr - sxl), hem = wy > Cu.bottom - 7;
    span(y, R(sxl), R(sxr), (x) => {
      const u = (x + 0.5 - sxl) / wdt;
      if (x === R(sxl) || x === R(sxr) - 1) return RO[0];
      const fold = Math.cos(2 * Math.PI * (u * 3.3 + 0.12 + sway * 0.012));
      let v = 3.3 + 1.25 * fold - 0.5 * s + (u < 0.1 ? 0.5 : 0);
      if (hem) v = wy > Cu.bottom - 2.2 ? 1.6 : v + 0.4;
      const fl = Math.floor(v), f = v - fl, q = f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > ((x * 7 + y * 3) % 16) / 16 ? fl + 1 : fl;
      return RO[Math.max(1, Math.min(6, q))];
    });
  }
  const ry = Cu.top - 6;
  for (let k = 0; k < 5; k++) { const rx = Cu.x0 + 3 + k * 8.5; ring(L.X(rx), L.Y(ry + 2.5), Math.max(0.5, 2 * z), Math.max(1.2, 3.4 * z), PAL.brass[3]); }
}

export default {
  kind: "window",
  covers: ["window"],
  source: "cat-zoomies/film/apartment-props.mjs#drawWindow",
  desc: "tall window with white frame and sill plant, rose floor curtain beside it; day sky or night sky with stars",
  hw: 72, hh: 120, start: "shows a bright day sky, the curtain hangs still",
  states: {
    day: [0.6, "the sky is bright day blue, the curtain hangs still"],
    night: [0.9, "the sky fades to night, stars and a moon come out", "glow"],
    breeze: [0.8, "the rose curtain sways in a breeze", "swish"],
  },
  base: { night: 0, breeze: 0 },
  st: { day: { night: 0, breeze: 0 }, night: { night: 1 }, breeze: { breeze: 1 } },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "Economy port of drawWindow + drawCurtain (lib copies). The film's sky pass is replaced by an item-drawn glass: day gradient with a cloud that rocks gently (no wrap-around), night gradient with 40 fixed stars and a crescent. Night and day cross-dissolve on the Bayer gate (night drawn over day with alpha = night). Rain not ported (no film rain in the apartment). Film units at S = 0.6 px per unit; wall shadow and sill dim kept.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = z * S, Wn = LAYOUT.window;
    const L = { z: k, X: (x) => cx + (x - OX) * k, Y: (y) => cy + (y - OY) * k, wx: (sx) => OX + (sx - cx) / k, wy: (sy) => OY + (sy - cy) / k };
    const night = Math.max(0, Math.min(1, v.night));
    const gx0 = Wn.x0 + 8, gx1 = Wn.x1 - 8, gy0 = Wn.top + 8, gy1 = Wn.sill - 8;
    // day glass (opaque base), then the night glass dissolved over it
    target(c, 1);
    wbox(L, Wn.x0 - 4, Wn.top - 4, Wn.x1 + 4, Wn.sill + 2, PAL.trim, { fill: 3, hi: 5, lo: 2 });   // reveal, under the glass
    glass(L, Wn, DAY.map((h) => rgb(h)));
    {
      const sway = 6 * Math.sin(t * 0.35), cxl = Wn.x0 + 40 + sway, cyl = Wn.top + 46;
      for (const [dx, dy, rx, ry] of [[0, 0, 15, 5.5], [9, -4, 10, 6], [-8, -1, 8, 4.5]]) {
        ellipse(L.X(cxl + dx), L.Y(cyl + dy), rx * k, ry * k, rgb("#FFFFFF"));
      }
      ellipse(L.X(cxl + 40 - sway), L.Y(Wn.top + 62), 12 * k, 4.2 * k, rgb("#E6F2FB"));
    }
    if (night > 0.001) {
      target(c, night);
      glass(L, Wn, NIGHT.map((h) => rgb(h)));
      for (let i = 0; i < 40; i++) {
        const sx = gx0 + 6 + hash(i * 3 + 1) * (gx1 - gx0 - 12), sy = gy0 + 6 + hash(i * 3 + 2) * (gy1 - gy0 - 12);
        const bright = hash(i * 3 + 3) > 0.7 ? "#F6F8DC" : "#B9C3E8";
        put(R(L.X(sx)), R(L.Y(sy)), rgb(bright));
      }
      // crescent moon: a cream disc with the night colour bitten out of it
      const mx = gx1 - 16, my = gy0 + 18;
      disc(L.X(mx), L.Y(my), 6.4 * k, rgb("#F6F0C8"));
      disc(L.X(mx + 3.2), L.Y(my - 1.6), 5.6 * k, rgb(NIGHT[2]));
    }
    target(c, 1);
    drawFrame(L, t, Wn, k);
    drawCurtain(L, t, v.breeze);
    return { box: { x0: L.X(Wn.x0 - 10), y0: L.Y(-392), x1: L.X(LAYOUT.curtain.x1 + 12), y1: L.Y(-6) }, pt: [L.X(145), L.Y(-245)] };
  },
};
