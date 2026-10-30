// catalog-v1 item «fridge»: the retro mint fridge of the cat-zoomies kitchen corner (cat-zoomies/film/apartment-props.mjs#
// drawKitchen, fridge part only: rounded mint body with a seam between freezer and lower door, steel plinth, wicker basket on
// top, two handles, magnets and a child's drawing of the cat on the lower door). Film fridge geometry: film layout.mjs
// LAYOUT.fridge {x0 652, x1 752, top −372} (not in the catalog layout, copied here). Items: the lower door swings open on the
// right hinge (free edge narrows with cos, nearer edge taller), the inside is a cool mint light with shelves; hum = a faint
// trembling. Film code drawn through lib/zoomies-props-canvas.mjs, palettes from lib/zoomies-props.mjs (PAL).
import { target, rect, rect1, span, poly, ellipse, disc, line, vol, smooth, rr, rgb } from "./lib/zoomies-props-canvas.mjs";
import { PAL } from "./lib/zoomies-props.mjs";

const R = Math.round, TAU = Math.PI * 2;
const S = 0.5, OX = 702, OY = -199;             // film origin (fridge centre), px per film unit at z 1
const F = { x0: 652, x1: 752, top: -372 };      // film LAYOUT.fridge
const MAXA = 1.2;                               // swing at open = 1 (about 69 deg)
const INK = rgb("#2A1E26");
const INT = ["#E6F6F0", "#C8E6DA", "#A8D0C2", "#8AB8A8", "#6A9A8C"].map(rgb);

/** A wbox like the film (fill / lit top-left / shade bottom-right / dark outline), in layer L. */
function wbox(L, x0, y0, x1, y1, Rm, { fill = 3, hi = 5, lo = 2, out = 0, b = 1 } = {}) {
  const X0 = R(L.X(x0)), Y0 = R(L.Y(y0)), X1 = R(L.X(x1)), Y1 = R(L.Y(y1)), bb = Math.max(1, R(b * L.z));
  if (X1 - X0 < 2 || Y1 - Y0 < 2) { rect(X0, Y0, Math.max(X1, X0 + 1), Math.max(Y1, Y0 + 1), Rm[out]); return; }
  rect(X0, Y0, X1, Y1, Rm[fill]);
  rect(X0 + 1, Y0 + 1, X1 - 1, Y0 + 1 + bb, Rm[hi]); rect(X0 + 1, Y0 + 1, X0 + 1 + bb, Y1 - 1, Rm[hi]);
  rect(X0 + 1, Y1 - 1 - bb, X1 - 1, Y1 - 1, Rm[lo]); rect(X1 - 1 - bb, Y0 + 1 + bb, X1 - 1, Y1 - 1, Rm[lo]);
  rect(X0, Y0, X1, Y0 + 1, Rm[out]); rect(X0, Y1 - 1, X1, Y1, Rm[out]); rect(X0, Y0, X0 + 1, Y1, Rm[out]); rect(X1 - 1, Y0, X1, Y1, Rm[out]);
}
const wr = (L, x0, y0, x1, y1, c) => rect(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), c);
const wr1 = (L, x0, y0, x1, y1, c) => rect1(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), c);

export default {
  kind: "fridge",
  covers: ["fridge"],
  source: "cat-zoomies/film/apartment-props.mjs#drawKitchen (fridge part)",
  desc: "tall retro mint fridge with a wicker basket on top and magnets; the door swings open, the motor hums",
  hw: 26, hh: 104, start: "stands shut, the lower door flush",
  states: {
    closed: [0.6, "the fridge door is shut, the magnets and the drawing show"],
    open: [0.9, "the lower door swings open, cool light spills from inside", "creak"],
    hum: [0.8, "the door is shut and the fridge hums, trembling faintly", "whirr"],
  },
  base: { open: 0, hum: 0 },
  st: { closed: { open: 0, hum: 0 }, open: { open: 1, hum: 0 }, hum: { open: 0, hum: 1 } },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "Film fridge drawn as the film draws it (rounded pillow-shaded mint body, seam, plinth, basket weave, handles, magnets, the child's cat drawing). Only the lower door moves: its parts (handle, magnets, drawing) are mapped onto the leaf and compress with it. Interior (mint gradient with four shelf lines) is new: the film has no open fridge. hum = whole-pixel trembling. Not ported: the light pool on the floor, the counter and cabinets. Flags: the leaf edge steps by whole pixels while the door opens slowly and the hum starts from zero, so a few 1-px steps are counted as jumps (about 100-200 px each); these are pixel-grid steps of a slow edge, not swaps.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = z * S;
    const sh = Math.round(v.hum * 1.3 * (Math.sin(t * TAU * 6.5) + 0.35 * Math.sin(t * TAU * 11.3 + 0.7)));   // whole-pixel trembling
    const paint = (X0) => {
      const Y0 = cy;
    const L = { z: k, X: (x) => X0 + (x - OX) * k, Y: (y) => Y0 + (y - OY) * k };
    const T = (p) => [L.X(p[0]), L.Y(p[1])];
    // wicker basket on top (static)
    { const x0 = F.x0 + 10, x1 = F.x1 - 12, y0 = F.top - 26;
      wbox(L, x0, y0, x1, F.top, PAL.kraft, { fill: 3, hi: 5, lo: 2 });
      for (let y = y0 + 3; y < F.top - 1; y += 4) for (let x = x0 + 2 + ((y - y0) % 8 ? 3 : 0); x < x1 - 2; x += 6) wr1(L, x, y, x + 3, y + 1.4, PAL.kraft[1]);
      wr1(L, x0 - 1, y0, x1 + 1, y0 + 2.2, PAL.kraft[4]); }
    // plinth
    wr(L, F.x0 + 4, -10, F.x1 - 4, 0, PAL.steel[1]);
    for (let x = F.x0 + 8; x < F.x1 - 8; x += 5) wr1(L, x, -8, x + 2, -3, PAL.steel[0]);
    // body: rounded mint box with pillow shading (film wsoft), then the freezer/lower seam
    vol([rr(L.X(F.x0), L.Y(F.top), L.X(F.x1), L.Y(-10), 12 * k)], PAL.mint, { thick: 14 * k, base: 3.4, gain: 1.4, slope: 0.6, light: [-0.45, -0.9] });
    wr1(L, F.x0 + 2, -282, F.x1 - 2, -280.8, PAL.mint[0]); wr1(L, F.x0 + 2, -280.8, F.x1 - 2, -279.8, PAL.mint[5]);
    // freezer door handle, its small horizontal grip and the top magnet (static, on the freezer door)
    wbox(L, F.x0 + 7, F.top + 22, F.x0 + 12, F.top + 74, PAL.steel, { fill: 4, hi: 6, lo: 2 });
    wbox(L, F.x1 - 30, F.top + 14, F.x1 - 12, F.top + 22, PAL.steel, { fill: 4, hi: 6, lo: 2 });
    wbox(L, F.x0 + 34, F.top + 40, F.x0 + 41, F.top + 47, [INK, PAL.blue[4], PAL.blue[4], PAL.blue[4], PAL.blue[4], PAL.blue[4]]);
    // lower door: swings on the right hinge (F.x1); free edge at xf moves toward the hinge as it opens
    const th = Math.max(0, Math.min(1, v.open)) * MAXA, cs = Math.cos(th), sn = Math.sin(th);
    const xf = F.x1 - (F.x1 - F.x0) * cs, yT = -280, yB = -10;
    {
      // inside: mint light, brighter at the top, four shelves
      const xa = R(L.X(F.x0 + 1)), xb = R(L.X(xf)), ya = R(L.Y(yT)), yb = R(L.Y(yB));
      rect(xa, ya, xb, yb, (x, y) => INT[Math.min(4, Math.floor(((y - ya) / Math.max(1, yb - ya)) * 5))]);
      for (const sy of [-236, -190, -140, -90]) wr1(L, F.x0 + 3, sy, xf - 3, sy + 1.4, PAL.steel[4]);
    }
    // leaf: its own layer, so handle, magnets and the drawing compress with it (film x → leaf x)
    const m = (wx) => xf + (wx - F.x0) * (F.x1 - xf) / (F.x1 - F.x0);
    const LL = { z: k, X: (wx) => L.X(m(wx)), Y: L.Y };
    const TL = (p) => [LL.X(p[0]), LL.Y(p[1])];
    const tp = sn * 5;
    vol([[L.X(xf), L.Y(yT - tp)], [L.X(F.x1), L.Y(yT)], [L.X(F.x1), L.Y(yB)], [L.X(xf), L.Y(yB + tp)]], PAL.mint, { thick: 10 * k, base: 3.4, gain: 1.4, slope: 0.6, light: [-0.45, -0.9] });
    // lower-door parts (film drawKitchen: handle, magnets, child's drawing of the cat)
    wbox(LL, F.x0 + 7, -262, F.x0 + 12, -168, PAL.steel, { fill: 4, hi: 6, lo: 2 });
    for (const [mx, my, col] of [[F.x0 + 30, -240, PAL.coral[4]], [F.x0 + 74, -232, PAL.must[4]], [F.x0 + 56, -150, PAL.leaf[4]]]) wbox(LL, mx, my, mx + 7, my + 7, [INK, col, col, col, col, col]);
    { const px = F.x0 + 38, py = -226, w = 40, h = 32; wbox(LL, px, py, px + w, py + h, PAL.cream, { fill: 6, hi: 6, lo: 4 });
      const cxp = px + w / 2, cyp = py + h * 0.62, Z = k;
      ellipse(LL.X(cxp - 2), LL.Y(cyp), 11 * Z, 6.5 * Z, PAL.must[3]); disc(LL.X(cxp + 9), LL.Y(cyp - 6), 5 * Z, PAL.must[3]);
      poly([[cxp + 5, cyp - 9], [cxp + 6, cyp - 15], [cxp + 9, cyp - 10]].map(TL), PAL.must[3]); poly([[cxp + 10, cyp - 10], [cxp + 13, cyp - 15], [cxp + 14, cyp - 8]].map(TL), PAL.must[3]);
      line(LL.X(cxp - 12), LL.Y(cyp), LL.X(cxp - 18), LL.Y(cyp - 8), PAL.must[3], Math.max(1, 1.4 * Z));
      wbox(LL, cxp - 4, py - 2, cxp + 3, py + 4, [INK, PAL.coral[4], PAL.coral[4], PAL.coral[4], PAL.coral[4], PAL.coral[4]]); }
    return { box: { x0: L.X(F.x0 - 6), y0: L.Y(F.top - 28), x1: L.X(F.x1 + 6), y1: L.Y(0) }, pt: [L.X(702), L.Y(-200)] };
    };
    target(c, 1);
    return paint(cx + sh);
  },
};
