// catalog-v1 item «bed»: the low wooden bed of the cat-zoomies bedroom (cat-zoomies/film/apartment-props.mjs#drawBedroom,
// bed part only: headboard and footboard, side rail, mattress, pillow, quilt with stitches and a turned-down sheet edge).
// Film bed geometry: film layout.mjs LAYOUT.bed (x −720…−420, headTop −178, footTop −112, mattressTop −80, blanketTop −96).
// Nightstand, lamp, picture and shelf are not part of this prop. Drawn through lib/zoomies-props-canvas.mjs, palettes from
// lib/zoomies-props.mjs (PAL). Scale S = px per film unit at z 1.
import { target, poly, ellipse, line, rect1, dim, vol, smooth, rr, rgb } from "./lib/zoomies-props-canvas.mjs";
import { PAL } from "./lib/zoomies-props.mjs";

const R = Math.round, TAU = Math.PI * 2;
const S = 0.7, OX = -570, OY = -89;            // film centre of the bed (x −570, y −89), px per film unit at z 1
const B = { x0: -720, x1: -420, mattressTop: -80, headTop: -178, footTop: -112, pillow: [-706, -636], blanketTop: -96 };
const WARM = [255, 196, 120];
const mixA = (a, b, k) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k));
const tintRamp = (arr, k) => arr.map((c) => mixA(c, WARM, k));

export default {
  kind: "bed",
  covers: ["bed"],
  source: "cat-zoomies/film/apartment-props.mjs#drawBedroom (bed part)",
  desc: "low wooden bed with a pale blue mattress, cream pillow and mustard quilt; the quilt can be rumpled, the bed bounces",
  hw: 105, hh: 68, start: "stands made, the quilt smooth and neat",
  states: {
    made: [0.5, "the bed is made, the quilt is smooth and neat"],
    messy: [0.8, "the quilt is rumpled and pulled up, the bed looks slept in", "fold"],
    lit: [0.7, "a warm lamp light falls across the bed", "glow"],
    shake: [0.4, "the bed bounces as a cat lands on it", "thump"],
  },
  base: { messy: 0, lit: 0 },
  st: { made: { messy: 0, lit: 0 }, messy: { messy: 1, lit: 0 }, lit: { messy: 0, lit: 1 }, shake: {} },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "Film bed copied as drawn (headboard and footboard with rails, side rail, mattress, pillow, quilt with stitches, turned-down sheet, floor contact shadow). Added: messy = the quilt top sags and rumples (continuous, no swap), lit = warm tint of every bed colour (0.22 × lit, no separate glow), shake = a bounce of the whole bed in whole pixels with the film-style envelope. Nightstand, bedside lamp, picture, shelf and rug are not in this prop. Flag: one jump at the first whole-pixel step of the bounce onset (3.9 s), accepted as pixel-grid motion.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = z * S, lit = Math.max(0, Math.min(1, v.lit)), messy = Math.max(0, Math.min(1, v.messy));
    const shk = s.acc("shake", 0, 0.9), env = Math.sin(Math.PI * shk) * (1 - 0.35 * shk);
    const bounce = Math.round(env * 2.2 * Math.sin(t * TAU * 9));                      // whole-pixel bounce (pixel-art motion)
    const WOOD = tintRamp(PAL.wood, 0.22 * lit), SHEET = tintRamp(PAL.sheet, 0.22 * lit), CREAM = tintRamp(PAL.cream, 0.22 * lit), MUST = tintRamp(PAL.must, 0.22 * lit);
    const paint = (Y0) => {
      const L = { z: k, X: (x) => cx + (x - OX) * k, Y: (y) => Y0 + (y - OY) * k };
      const T = (p) => [L.X(p[0]), L.Y(p[1])];
      const wsoft = (x0, y0, x1, y1, r, Rm, o = {}) => vol([rr(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), r * k)], Rm, { thick: (o.th ?? 7) * k, light: [-0.45, -0.9], ...o });
      const wr1 = (x0, y0, x1, y1, col) => rect1(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), col);
      // contact shadow on the floor under the bed (film dim)
      dim(L.X(B.x0 + 16), L.Y(-30), L.X(B.x1 - 16), L.Y(0), () => 0.9, 0.38);
      // headboard with two rail lines, footboard, side rail
      wsoft(B.x0, B.headTop, B.x0 + 20, 0, 8, WOOD, { base: 3, gain: 1.6, th: 6 });
      wr1(B.x0 + 6, B.headTop + 14, B.x0 + 7.2, -40, WOOD[2]); wr1(B.x0 + 13, B.headTop + 14, B.x0 + 14.2, -40, WOOD[5]);
      wsoft(B.x1 - 18, B.footTop, B.x1, 0, 5, WOOD, { base: 3, gain: 1.6, th: 5 });
      wsoft(B.x0 + 16, -46, B.x1 - 14, -26, 3, WOOD, { base: 3.2, gain: 1.2, th: 4 });
      // mattress
      wsoft(B.x0 + 18, B.mattressTop, B.x1 - 16, -44, 6, SHEET, { base: 3.4, gain: 1.4, th: 8 });
      // pillow
      { const [pa, pb] = B.pillow; vol([smooth([[pa + 2, -80], [pa, -92], [pa + 6, -104], [(pa + pb) / 2, -106], [pb - 4, -103], [pb + 1, -92], [pb - 2, -80], [(pa + pb) / 2, -78]].map(T))], CREAM, { thick: 9 * k, base: 3.2, gain: 1.6, slope: 1.2, light: [-0.4, -0.9] }); }
      // quilt: its top edge sags and rumples as messy rises (continuous)
      const top = [], hem = [];
      for (let x = -654; x <= -432; x += 9) top.push([x, B.blanketTop + 1.5 * Math.sin(x * 0.07) + 2.4 * Math.sin(x * 0.023 + 1) - (x > -560 && x < -500 ? 3 : 0) + messy * (9 + 7 * Math.sin(x * 0.045 + 0.8))]);
      for (let x = -430; x >= -654; x -= 9) hem.push([x, -38 + 2.2 * Math.sin(x * 0.11) + 1.2 * Math.sin(x * 0.31)]);
      const pts = [...top, [-428, B.blanketTop + 4 + messy * 8], [-426, -70], [-428, -40], ...hem, [-658, -60]];
      vol([smooth(pts.map(T), new Set(), 3)], MUST, { thick: 10 * k, base: 3.1, gain: 1.6, slope: 1.3, light: [-0.4, -0.9] });
      // quilt stitches and rumples (film), then the turned-down sheet edge
      for (let x = -630; x < -440; x += 26) for (let y = -90; y < -44; y += 3) if ((y / 3) % 2 === 0) wr1(x + Math.sin(y * 0.2) * 1.5, y, x + Math.sin(y * 0.2) * 1.5 + 0.8, y + 1.6, MUST[2]);
      for (let x = -648; x < -436; x += 3) if (R(x / 3) % 2 === 0) wr1(x, -66 + Math.sin(x * 0.07) * 1.5, x + 1.6, -65.2 + Math.sin(x * 0.07) * 1.5, MUST[2]);
      for (const [x, y, l] of [[-600, -92, 10], [-540, -90, 14], [-480, -91, 9]]) line(L.X(x), L.Y(y), L.X(x + l * 0.6), L.Y(y + l), MUST[2], Math.max(1, 0.9 * k));
      vol([smooth([[-662, -100], [-648, -101], [-646, -42], [-660, -40]].map(T), new Set([0, 1, 2, 3]))], SHEET, { thick: 3 * k, base: 4, gain: 1.2 });
      return { x0: L.X(B.x0 - 6), y0: L.Y(B.headTop - 6), x1: L.X(B.x1 + 6), y1: L.Y(6), pt: [L.X(-570), L.Y(-100)] };
    };
    target(c, 1);
    const out = paint(cy + bounce);
    return { box: out, pt: out.pt };
  },
};
