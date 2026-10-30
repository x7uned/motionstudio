// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-zoomies/film/apartment-props.mjs drawBedroom / lampBedGeom /
// drawLampBed (and the bedroom foreground plant of apartment.mjs drawFront); changes: import paths; the film's drawing code
// is kept in the film's coordinates and placed in the catalog bedroom through shifted layers (BEDROOM below): nightstand,
// lamp and bed shifted together, the framed picture over the headboard, the book shelf moved up above the nightstand
// lamp; lampBedGeom returns catalog coordinates for the light model. Palettes come from zoomies-props.mjs (PAL).
// Furniture of the cat-zoomies apartment bedroom, painted in ALBEDO colours into the scratch raster (zoomies-px.mjs);
// lighting is applied afterwards by zoomies-bedroom.mjs. Wall-mounted things and furniture stand in the prop layer.
import { W, H, P, rgb, rect, rect1, poly, disc, line, dim, vol, smooth, rr } from "./zoomies-px.mjs";
import { PAL } from "./zoomies-props.mjs";

const R = Math.round;
const INK = rgb("#2A1E26");
// the film's bedroom geometry (cat-zoomies/film/layout.mjs LAYOUT.nightstand / bed)
const FN = { x0: -780, x1: -728, top: -96, lampX: -754 };
const FB = { x0: -720, x1: -420, mattressTop: -80, headTop: -178, footTop: -112, pillow: [-706, -636], blanketTop: -96 };
/** Where the film's bedroom parts stand in the catalog room: catalog = film + (dx, dy). Screen x = 270 + catalog x at the wide shot. */
export const BEDROOM = {
  bed: { dx: 518, dy: 0 },          // nightstand x −262…−210 (screen 8…60), bed x −202…98 (screen 68…368)
  picture: { dx: 512, dy: -8 },     // framed night-sea picture over the pillow end of the bed (screen 132…214)
  shelf: { dx: 296, dy: -58 },      // book shelf with the trailing plant, high above the nightstand lamp (screen 18…104)
  rug: { cx: -48, cy: 12, rx: 74, ry: 17 },   // the film's round rug in front of the bed (floor coordinates)
};
const shift = (L, o) => ({ z: L.z, X: (wx) => L.X(wx + o.dx), Y: (wy) => L.Y(wy + o.dy), wx: (sx) => L.wx(sx) - o.dx, wy: (sy) => L.wy(sy) - o.dy });

// ---------------------------------------------------------------- helpers (as in the film)
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
const wsoft = (L, x0, y0, x1, y1, r, Rm, o = {}) => { if (!vis(L, x0, y0, x1, y1)) return; vol([rr(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), r * L.z)], Rm, { thick: (o.th ?? 7) * L.z, light: [-0.45, -0.9], ...o }); };

// ================================================================ bedroom
export function drawBedroom(L0, st) {
  const B = FB, N = FN;
  // framed picture above the bed: a small night-sea landscape
  { const L = shift(L0, BEDROOM.picture), z = L.z, t = T(L);
  if (vis(L, -652, -306, -566, -236)) {
    const x0 = -650, x1 = -568, y0 = -304, y1 = -240;
    wbox(L, x0, y0, x1, y1, PAL.wood, { fill: 3, hi: 5, lo: 2 });
    wr(L, x0 + 4, y0 + 4, x1 - 4, y1 - 4, PAL.cream[5]);
    const ax = x0 + 7, ay = y0 + 7, bx = x1 - 7, byy = y1 - 7;
    wr(L, ax, ay, bx, ay + 22, rgb("#F4C77A")); wr(L, ax, ay + 10, bx, ay + 22, rgb("#F0A070"));
    disc(L.X(ax + 46), L.Y(ay + 15), 5.5 * z, rgb("#FFF0B0"));
    poly([[ax, ay + 30], [ax + 18, ay + 14], [ax + 34, ay + 28], [ax + 48, ay + 18], [bx, ay + 32], [bx, byy], [ax, byy]].map(t), rgb("#6A5AA0"));
    poly([[ax, ay + 34], [ax + 26, ay + 24], [bx, ay + 36], [bx, byy], [ax, byy]].map(t), rgb("#4A4488"));
    wr(L, ax, ay + 38, bx, byy, rgb("#3A6AA8")); wr1(L, ax + 10, ay + 41, ax + 30, ay + 41.8, rgb("#8EB4E8")); wr1(L, ax + 38, ay + 44, ax + 60, ay + 44.8, rgb("#8EB4E8"));
  } }
  // wall shelf with books and a trailing plant
  { const L = shift(L0, BEDROOM.shelf), z = L.z, t = T(L);
  if (vis(L, -546, -300, -440, -190)) {
    const sy = -236;
    for (const [bx, w, h, col] of [[-536, 7, 24, PAL.coral[3]], [-528, 6, 28, PAL.blue[3]], [-521, 8, 22, PAL.must[4]], [-512, 5, 26, PAL.teal[3]]]) { wbox(L, bx, sy - h, bx + w, sy, [INK, col, col, col, col, col], { fill: 3, hi: 3, lo: 3 }); wr1(L, bx + 1, sy - h + 4, bx + w - 1, sy - h + 5, PAL.cream[5]); }
    wbox(L, -488, sy - 14, -468, sy, PAL.pot, { fill: 3, hi: 5, lo: 2 });
    for (let k = 0; k < 7; k++) { const a = -2.75 + k * 0.42, lx = -478 + Math.cos(a) * 11, ly = sy - 15 + Math.sin(a) * 8; vol([smooth([[lx - 4.5, ly], [lx, ly - 3.5], [lx + 4.5, ly], [lx, ly + 3.5]].map(t))], PAL.leaf, { thick: 3 * z, base: 3.4, gain: 1.3 }); }
    for (const [sx, len, ph] of [[-473, 40, 0], [-466, 26, 1.7], [-482, 18, 3.1]]) { let px0 = sx, py0 = sy + 1;
      for (let k = 0; k <= len; k += 2) { const lx = sx + Math.sin(k * 0.16 + ph) * 3.2, ly = sy + 1 + k; line(L.X(px0), L.Y(py0), L.X(lx), L.Y(ly), PAL.leaf[2], Math.max(1, 0.7 * z)); px0 = lx; py0 = ly; }
      for (let k = 4; k <= len; k += 7) { const lx = sx + Math.sin(k * 0.16 + ph) * 3.2, ly = sy + 1 + k, sd = (k / 7) % 2 ? 1 : -1; vol([smooth([[lx, ly - 2.4], [lx + sd * 5, ly - 1], [lx + sd * 5.5, ly + 2], [lx + sd * 1.5, ly + 2.6]].map(t))], PAL.leaf, { thick: 2.5 * z, base: 3.5, gain: 1.2 }); } }
    wbox(L, -548, sy, -462, sy + 4, PAL.wood, { fill: 4, hi: 6, lo: 2 });
    for (const bx of [-536, -476]) poly([[bx, sy + 4], [bx + 3, sy + 4], [bx + 3, sy + 12], [bx, sy + 8]].map(t), PAL.wood[1]);
  } }
  const L = shift(L0, BEDROOM.bed), z = L.z, t = T(L);
  // nightstand
  if (vis(L, N.x0 - 4, N.top - 60, N.x1 + 4, 0)) {
    const x0 = N.x0, x1 = N.x1, top = N.top;
    for (const lx of [x0 + 3, x1 - 7]) wbox(L, lx, -14, lx + 4, 0, PAL.wood, { fill: 2, hi: 3, lo: 1 });
    wbox(L, x0 + 1, top + 6, x1 - 1, -12, PAL.wood, { fill: 3, hi: 4, lo: 2 });
    wbox(L, x0 + 4, top + 10, x1 - 4, top + 32, PAL.wood, { fill: 4, hi: 5, lo: 3 });
    disc(L.X((x0 + x1) / 2), L.Y(top + 21), Math.max(1, 2.2 * z), PAL.brass[4]);
    wr(L, x0 + 4, top + 37, x1 - 4, -16, PAL.wood[1]);
    wbox(L, x0 + 9, -44, x0 + 30, -16, [INK, PAL.blue[2], PAL.blue[2], PAL.blue[3], PAL.blue[3], PAL.blue[4]]);
    wbox(L, x0 + 31, -36, x1 - 8, -16, [INK, PAL.coral[3], PAL.coral[3], PAL.coral[4], PAL.coral[4], PAL.coral[5]]);
    wbox(L, x0 - 2, top, x1 + 2, top + 6, PAL.wood, { fill: 4, hi: 6, lo: 2 });
    // a book on top
    wbox(L, x1 - 22, top - 5, x1 - 5, top, [INK, PAL.teal[3], PAL.teal[3], PAL.teal[4], PAL.teal[4], PAL.teal[5]]);
    wr1(L, x1 - 22, top - 3, x1 - 6, top - 2, PAL.cream[5]);
  }
  // bedside lamp (shade colours; it glows in the emissive pass when lampBed > 0)
  drawLampBed(L);
  // bed: headboard, footboard, side rail, mattress, pillow, blanket
  if (vis(L, B.x0, B.headTop, B.x1, 0)) {
    dim(L.X(B.x0 + 16), L.Y(-30), L.X(B.x1 - 16), L.Y(0), () => 0.9, 0.38);
    wsoft(L, B.x0, B.headTop, B.x0 + 20, 0, 8, PAL.wood, { base: 3, gain: 1.6, th: 6 });
    wr1(L, B.x0 + 6, B.headTop + 14, B.x0 + 7.2, -40, PAL.wood[2]); wr1(L, B.x0 + 13, B.headTop + 14, B.x0 + 14.2, -40, PAL.wood[5]);
    wsoft(L, B.x1 - 18, B.footTop, B.x1, 0, 5, PAL.wood, { base: 3, gain: 1.6, th: 5 });
    wsoft(L, B.x0 + 16, -46, B.x1 - 14, -26, 3, PAL.wood, { base: 3.2, gain: 1.2, th: 4 });
    wsoft(L, B.x0 + 18, B.mattressTop, B.x1 - 16, -44, 6, PAL.sheet, { base: 3.4, gain: 1.4, th: 8 });
    // pillow
    { const [a, b] = B.pillow; vol([smooth([[a + 2, -80], [a, -92], [a + 6, -104], [(a + b) / 2, -106], [b - 4, -103], [b + 1, -92], [b - 2, -80], [(a + b) / 2, -78]].map(t))], PAL.cream, { thick: 9 * z, base: 3.2, gain: 1.6, slope: 1.2, light: [-0.4, -0.9] }); }
    // blanket (dissolves with bedBlanket)
    const a = st.bedBlanket ?? 1;
    if (a > 0) {
      P.alpha = a;
      const top = [], hem = [];
      for (let x = -654; x <= -432; x += 9) top.push([x, B.blanketTop + 1.5 * Math.sin(x * 0.07) + 2.4 * Math.sin(x * 0.023 + 1) - (x > -560 && x < -500 ? 3 : 0)]);
      for (let x = -430; x >= -654; x -= 9) hem.push([x, -38 + 2.2 * Math.sin(x * 0.11) + 1.2 * Math.sin(x * 0.31)]);
      const pts = [...top, [-428, B.blanketTop + 4], [-426, -70], [-428, -40], ...hem, [-658, -60]];
      vol([smooth(pts.map(t), new Set(), 3)], PAL.must, { thick: 10 * z, base: 3.1, gain: 1.6, slope: 1.3, light: [-0.4, -0.9] });
      // quilt stitches and rumples
      for (let x = -630; x < -440; x += 26) for (let y = -90; y < -44; y += 3) if ((y / 3) % 2 === 0) wr1(L, x + Math.sin(y * 0.2) * 1.5, y, x + Math.sin(y * 0.2) * 1.5 + 0.8, y + 1.6, PAL.must[2]);
      for (let x = -648; x < -436; x += 3) if (R(x / 3) % 2 === 0) wr1(L, x, -66 + Math.sin(x * 0.07) * 1.5, x + 1.6, -65.2 + Math.sin(x * 0.07) * 1.5, PAL.must[2]);
      for (const [x, y, l] of [[-600, -92, 10], [-540, -90, 14], [-480, -91, 9]]) line(L.X(x), L.Y(y), L.X(x + l * 0.6), L.Y(y + l), PAL.must[2], Math.max(1, 0.9 * z));
      // turned-down sheet edge
      vol([smooth([[-662, -100], [-648, -101], [-646, -42], [-660, -40]].map(t), new Set([0, 1, 2, 3]))], PAL.sheet, { thick: 3 * z, base: 4, gain: 1.2 });
      P.alpha = 1;
    }
  }
}
const filmLampGeom = () => { const x = FN.lampX, top = FN.top; return { x, base: top, shadeTop: top - 52, shadeBot: top - 28, wTop: 9, wBot: 15, cy: top - 38 }; };
/** Bedside lamp geometry in catalog coordinates (for the light model and the emissive pass). */
export function lampBedGeom() { const g = filmLampGeom(), o = BEDROOM.bed; return { ...g, x: g.x + o.dx, base: g.base + o.dy, shadeTop: g.shadeTop + o.dy, shadeBot: g.shadeBot + o.dy, cy: g.cy + o.dy }; }
function drawLampBed(L) {
  const g = filmLampGeom(), z = L.z, t = T(L);
  if (!vis(L, g.x - 20, g.shadeTop - 4, g.x + 20, g.base)) return;
  vol([smooth([[g.x - 7, g.base], [g.x - 9, g.base - 7], [g.x - 5, g.base - 15], [g.x + 5, g.base - 15], [g.x + 9, g.base - 7], [g.x + 7, g.base]].map(t), new Set([0, 5]))], PAL.rose, { thick: 4 * z, base: 3, gain: 1.6 });
  wr1(L, g.x - 1, g.shadeBot, g.x + 1, g.base - 15, PAL.brass[3]);
  poly([[g.x - g.wTop, g.shadeTop], [g.x + g.wTop, g.shadeTop], [g.x + g.wBot, g.shadeBot], [g.x - g.wBot, g.shadeBot]].map(t), (x) => { const u = (x - L.X(g.x - g.wBot)) / ((g.wBot * 2) * z); return PAL.linen[u < 0.25 ? 5 : u < 0.7 ? 4 : 3]; });
  line(L.X(g.x - g.wTop), L.Y(g.shadeTop), L.X(g.x + g.wTop), L.Y(g.shadeTop), PAL.linen[1]);
  line(L.X(g.x - g.wBot), L.Y(g.shadeBot), L.X(g.x + g.wBot), L.Y(g.shadeBot), PAL.linen[1]);
  line(L.X(g.x - g.wTop), L.Y(g.shadeTop), L.X(g.x - g.wBot), L.Y(g.shadeBot), PAL.linen[1]);
  line(L.X(g.x + g.wTop), L.Y(g.shadeTop), L.X(g.x + g.wBot), L.Y(g.shadeBot), PAL.linen[1]);
}
