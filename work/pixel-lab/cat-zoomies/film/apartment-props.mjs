// Furniture and fittings of the cat-zoomies apartment, painted in ALBEDO colours into the scratch raster
// (apartment-px.mjs). Positions come only from layout.mjs LAYOUT. Wall-mounted things and furniture stand in the prop
// layer L = layer(cam, PROP_P); feet touch wy = 0. Lighting is applied afterwards by apartment.mjs.
import { LAYOUT, CEIL, rnd } from "./layout.mjs";
import { TINY } from "../../../../renderer/pixel/raster.mjs";
import { W, H, P, rgb, ramp, put, span, rect, rect1, poly, ellipse, disc, line, ring, dim, vol, smooth, rr } from "./apartment-px.mjs";

const R = Math.round;
// ---------------------------------------------------------------- albedo palettes (index 0 = outline, dark → light)
export const PAL = {
  wood: ramp(["#3A2214", "#5C3620", "#7C4C2A", "#9A6436", "#B47C46", "#CA9860", "#DEB682"]),
  oak: ramp(["#4A3018", "#7A5430", "#9E7240", "#BC8E52", "#D2A868", "#E4C286", "#F2DAA8"]),
  teal: ramp(["#1A3440", "#28545E", "#36717A", "#468C90", "#5CA4A4", "#7ABCB6", "#A2D6CA"]),
  must: ramp(["#4A3010", "#7A5418", "#A47422", "#C8962E", "#DEB444", "#EECE6A", "#F8E4A0"]),
  coral: ramp(["#4A1A1A", "#7A2E2A", "#A64236", "#C85A46", "#DE7A5E", "#EE9C80", "#F8C4AC"]),
  cream: ramp(["#4A4038", "#8A8070", "#ACA494", "#CAC2B4", "#E0DACE", "#F0ECE4", "#FCFAF6"]),
  sheet: ramp(["#34445A", "#72869E", "#98ACC6", "#B6C8DE", "#D0DDEE", "#E6EEF8", "#F6FAFE"]),
  rose: ramp(["#3E1622", "#682638", "#92384E", "#B24E64", "#C8687C", "#DA8C9C", "#ECB4C0"]),
  leaf: ramp(["#12301C", "#1C4A2A", "#286636", "#368446", "#4EA256", "#70C06A", "#9CDA8C"]),
  pot: ramp(["#3A1A10", "#663020", "#90442C", "#B25A36", "#CC7648", "#E09868", "#F0BC92"]),
  brass: ramp(["#3A2A10", "#664A1A", "#946E26", "#BE9438", "#DCB856", "#F0D888", "#FBEFC0"]),
  linen: ramp(["#5A4A38", "#968670", "#BEAE90", "#D8C9AA", "#E8DCC0", "#F6EEDA", "#FFFAEE"]),
  mint: ramp(["#24403A", "#467468", "#6A9A8C", "#8AB8A8", "#A8D0C2", "#C8E6DA", "#E6F6F0"]),
  steel: ramp(["#2A2E3A", "#4A5262", "#6E7888", "#96A0AE", "#BCC4CE", "#E0E6EC", "#F6F8FA"]),
  blue: ramp(["#1A2250", "#22306A", "#33458A", "#4A58B8", "#6A78D0", "#8EA4E4", "#B8CCF6"]),
  kraft: ramp(["#3E2810", "#6E4A22", "#9A6C38", "#BC8C50", "#D6AA6C", "#E8C892", "#F6E2BC"]),
  trim: ramp(["#5A5048", "#9A9084", "#BEB4A6", "#D8D0C2", "#ECE6DA", "#F8F4EC", "#FFFFFF"]),
};
export const WALLC = {
  liv: rgb("#E8D4B0"), livL: rgb("#D6BC94"), livD: rgb("#F2E4C8"),
  bed: rgb("#A6B1D6"), bedD: rgb("#C6CFEE"), bedF: rgb("#8C98C4"),
  kit: rgb("#B4C9A0"), kitL: rgb("#A6BC92"),
  sect: rgb("#5E5470"), sectL: rgb("#7A7090"), sectD: rgb("#463E58"),
};
const INK = rgb("#2A1E26");

// ---------------------------------------------------------------- helpers
const visX = (L, x0, x1) => L.X(x1) >= -2 && L.X(x0) <= W + 2;
const visY = (L, y0, y1) => L.Y(y1) >= -2 && L.Y(y0) <= H + 2;
const vis = (L, x0, y0, x1, y1) => visX(L, x0, x1) && visY(L, y0, y1);
const px1 = (L, u) => Math.max(1, R(u * L.z));
/** World rect in layer L. */
const wr = (L, x0, y0, x1, y1, c) => rect(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), c);
const wr1 = (L, x0, y0, x1, y1, c) => rect1(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), c);
const T = (L) => (p) => [L.X(p[0]), L.Y(p[1])];

/** Flat box with 1-px outline, lit top/left bevel and shaded bottom/right (screen coords). */
function box(x0, y0, x1, y1, Rm, { fill = 3, hi = 5, lo = 2, out = 0, b = 1 } = {}) {
  x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1); if (x1 - x0 < 2 || y1 - y0 < 2) { rect(x0, y0, Math.max(x1, x0 + 1), Math.max(y1, y0 + 1), Rm[out]); return; }
  rect(x0, y0, x1, y1, Rm[fill]);
  b = Math.max(1, R(b));
  rect(x0 + 1, y0 + 1, x1 - 1, y0 + 1 + b, Rm[hi]); rect(x0 + 1, y0 + 1, x0 + 1 + b, y1 - 1, Rm[hi]);
  rect(x0 + 1, y1 - 1 - b, x1 - 1, y1 - 1, Rm[lo]); rect(x1 - 1 - b, y0 + 1 + b, x1 - 1, y1 - 1, Rm[lo]);
  rect(x0, y0, x1, y0 + 1, Rm[out]); rect(x0, y1 - 1, x1, y1, Rm[out]); rect(x0, y0, x0 + 1, y1, Rm[out]); rect(x1 - 1, y0, x1, y1, Rm[out]);
}
const wbox = (L, x0, y0, x1, y1, Rm, o = {}) => box(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), Rm, { b: Math.max(1, (o.bu ?? 1.4) * L.z), ...o });
/** Rounded pillow-shaded world rectangle. */
const wsoft = (L, x0, y0, x1, y1, r, Rm, o = {}) => { if (!vis(L, x0, y0, x1, y1)) return; vol([rr(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), r * L.z)], Rm, { thick: (o.th ?? 7) * L.z, light: [-0.45, -0.9], ...o }); };
/** Tiny font text in scratch (scale s px per font pixel). */
export function text(str, x, y, c, s = 1) {
  let cx = R(x);
  for (const ch of str.toUpperCase()) {
    if (ch === " ") { cx += (TINY.space + 1) * s; continue; }
    const g = TINY.glyphs[ch] ?? TINY.glyphs["?"];
    g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === "#") rect(cx + i * s, R(y) + j * s, cx + (i + 1) * s, R(y) + (j + 1) * s, c); });
    cx += (g[0].length + 1) * s;
  }
}
export const textW = (str, s = 1) => { let w = 0; for (const ch of str.toUpperCase()) w += ch === " " ? (TINY.space + 1) * s : ((TINY.glyphs[ch] ?? TINY.glyphs["?"])[0].length + 1) * s; return w - s; };

// ================================================================ above the ceiling: slab section, roof, rooftop bits
export const ROOF_Y = -462, SLAB_TOP = -458;
export function drawRoof(L) {
  if (L.Y(CEIL) < 0) return;
  const y0 = L.Y(SLAB_TOP), y1 = L.Y(CEIL), z = L.z;
  // concrete section with diagonal hatch (cut-away language, same as the partition above the door)
  for (let y = Math.max(0, R(y0)); y < Math.min(H, R(y1)); y++) {
    const wy = L.wy(y + 0.5);
    span(y, 0, W, (x) => { const wx = L.wx(x + 0.5), h = ((wx + wy) % 9 + 9) % 9; return h < Math.max(0.9, 1 / z) ? WALLC.sectD : WALLC.sect; });
  }
  wr1(L, -2000, SLAB_TOP, 2000, SLAB_TOP + 1.6, WALLC.sectL);
  wr1(L, -2000, ROOF_Y, 2000, SLAB_TOP, rgb("#2A2434"));
  wr1(L, -2000, CEIL - 1.2, 2000, CEIL, WALLC.sectD);
  // gravel speckles on the roof membrane
  if (z > 1.4) for (let x = 0; x < W; x += 3) { const wx = L.wx(x); if (rnd(R(wx)) < 0.4) put(x, R(L.Y(ROOF_Y + 1.5)), rgb("#4A4252")); }
  const C1 = rgb("#4A4458"), C2 = rgb("#7A7290");
  // TV antenna above the bedroom
  if (visX(L, -600, -520)) {
    const ax = -560; wr1(L, ax - 1, -548, ax + 1, ROOF_Y, C1); wr1(L, ax - 1, -548, ax, ROOF_Y, C2);
    for (const [yy, w] of [[-538, 22], [-524, 17], [-511, 12]]) { wr1(L, ax - w, yy, ax + w, yy + 1.4, C1); for (let k = -w; k <= w; k += 6) wr1(L, ax + k, yy - 3, ax + k + 1, yy, C1); }
    wr1(L, ax - 8, ROOF_Y - 3, ax + 8, ROOF_Y, C1);
  }
  // satellite dish above the living room
  if (visX(L, -120, -60)) {
    const dx = -92; wr1(L, dx - 1, -478, dx + 1, ROOF_Y, C1); wr1(L, dx - 6, ROOF_Y - 2.5, dx + 6, ROOF_Y, C1);
    const t = T(L), pts = []; for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + (k / 12) * Math.PI; pts.push([dx - 2 + Math.cos(a) * 7, -486 + Math.sin(a) * 13]); }
    poly(pts.map(t), PAL.steel[4]); poly(pts.map(([x, y]) => [x + 1.2 + (x - dx + 2) * -0.3, y]).map(t), PAL.steel[3]);
    line(L.X(dx + 2), L.Y(-486), L.X(dx + 13), L.Y(-492), C1, Math.max(1, 1.1 * L.z)); wr1(L, dx + 12, -494, dx + 16, -490, C1);
  }
  // vent pipe with a cap
  if (visX(L, 220, 260)) {
    wbox(L, 234, -484, 246, ROOF_Y, PAL.steel, { fill: 3, hi: 4, lo: 2 });
    wbox(L, 229, -490, 251, -484, PAL.steel, { fill: 2, hi: 4, lo: 1 });
  }
  // brick chimney above the kitchen
  if (visX(L, 580, 640)) {
    wbox(L, 596, -500, 628, ROOF_Y, PAL.coral, { fill: 3, hi: 4, lo: 2 });
    for (let yy = -496; yy < ROOF_Y - 2; yy += 6) wr1(L, 597, yy, 627, yy + 0.8, PAL.coral[2]);
    wbox(L, 592, -506, 632, -500, PAL.coral, { fill: 2, hi: 4, lo: 1 });
  }
}

// ================================================================ wall fittings: cornice, baseboard
export function drawTrims(L) {
  const z = L.z;
  // cornice (crown moulding): three steps + a shadow line on the wall below it
  if (visY(L, CEIL, CEIL + 20)) {
    wr1(L, -2000, CEIL, 2000, CEIL + 5, PAL.trim[4]); wr1(L, -2000, CEIL + 5, 2000, CEIL + 9, PAL.trim[5]);
    wr1(L, -2000, CEIL + 9, 2000, CEIL + 12, PAL.trim[3]); wr1(L, -2000, CEIL + 12, 2000, CEIL + 13.2, PAL.trim[1]);
    wr1(L, -2000, CEIL + 5, 2000, CEIL + 5.8, PAL.trim[6]);
    const ya = R(L.Y(CEIL + 13.2)), yb = R(L.Y(CEIL + 22)); dim(0, ya, W, yb, (x, y) => 1 - (y - ya) / Math.max(1, yb - ya), 0.22);
  }
  // baseboard
  if (visY(L, -30, -18)) {
    wr1(L, -2000, -30, 2000, -20, PAL.trim[4]); wr1(L, -2000, -30, 2000, -28.6, PAL.trim[6]);
    wr1(L, -2000, -21.2, 2000, -20, PAL.trim[2]); wr1(L, -2000, -31.4, 2000, -30, PAL.trim[1]);
  }
  void z;
}

// ================================================================ bedroom
export function drawBedroom(L, st) {
  const B = LAYOUT.bed, N = LAYOUT.nightstand, z = L.z, t = T(L);
  // framed picture above the bed: a small night-sea landscape
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
  }
  // wall shelf with books and a trailing plant
  if (vis(L, -546, -300, -440, -214)) {
    const sy = -236;
    for (const [bx, w, h, col] of [[-536, 7, 24, PAL.coral[3]], [-528, 6, 28, PAL.blue[3]], [-521, 8, 22, PAL.must[4]], [-512, 5, 26, PAL.teal[3]]]) { wbox(L, bx, sy - h, bx + w, sy, [INK, col, col, col, col, col], { fill: 3, hi: 3, lo: 3 }); wr1(L, bx + 1, sy - h + 4, bx + w - 1, sy - h + 5, PAL.cream[5]); }
    wbox(L, -488, sy - 14, -468, sy, PAL.pot, { fill: 3, hi: 5, lo: 2 });
    for (let k = 0; k < 7; k++) { const a = -2.75 + k * 0.42, lx = -478 + Math.cos(a) * 11, ly = sy - 15 + Math.sin(a) * 8; vol([smooth([[lx - 4.5, ly], [lx, ly - 3.5], [lx + 4.5, ly], [lx, ly + 3.5]].map(t))], PAL.leaf, { thick: 3 * z, base: 3.4, gain: 1.3 }); }
    for (const [sx, len, ph] of [[-473, 40, 0], [-466, 26, 1.7], [-482, 18, 3.1]]) { let px0 = sx, py0 = sy + 1;
      for (let k = 0; k <= len; k += 2) { const lx = sx + Math.sin(k * 0.16 + ph) * 3.2, ly = sy + 1 + k; line(L.X(px0), L.Y(py0), L.X(lx), L.Y(ly), PAL.leaf[2], Math.max(1, 0.7 * z)); px0 = lx; py0 = ly; }
      for (let k = 4; k <= len; k += 7) { const lx = sx + Math.sin(k * 0.16 + ph) * 3.2, ly = sy + 1 + k, sd = (k / 7) % 2 ? 1 : -1; vol([smooth([[lx, ly - 2.4], [lx + sd * 5, ly - 1], [lx + sd * 5.5, ly + 2], [lx + sd * 1.5, ly + 2.6]].map(t))], PAL.leaf, { thick: 2.5 * z, base: 3.5, gain: 1.2 }); } }
    wbox(L, -548, sy, -462, sy + 4, PAL.wood, { fill: 4, hi: 6, lo: 2 });
    for (const bx of [-536, -476]) poly([[bx, sy + 4], [bx + 3, sy + 4], [bx + 3, sy + 12], [bx, sy + 8]].map(t), PAL.wood[1]);
  }
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
    // a book and a little alarm clock on top
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
export function lampBedGeom() { const x = LAYOUT.nightstand.lampX, top = LAYOUT.nightstand.top; return { x, base: top, shadeTop: top - 52, shadeBot: top - 28, wTop: 9, wBot: 15, cy: top - 38 }; }
function drawLampBed(L) {
  const g = lampBedGeom(), z = L.z, t = T(L);
  if (!vis(L, g.x - 20, g.shadeTop - 4, g.x + 20, g.base)) return;
  vol([smooth([[g.x - 7, g.base], [g.x - 9, g.base - 7], [g.x - 5, g.base - 15], [g.x + 5, g.base - 15], [g.x + 9, g.base - 7], [g.x + 7, g.base]].map(t), new Set([0, 5]))], PAL.rose, { thick: 4 * z, base: 3, gain: 1.6 });
  wr1(L, g.x - 1, g.shadeBot, g.x + 1, g.base - 15, PAL.brass[3]);
  poly([[g.x - g.wTop, g.shadeTop], [g.x + g.wTop, g.shadeTop], [g.x + g.wBot, g.shadeBot], [g.x - g.wBot, g.shadeBot]].map(t), (x) => { const u = (x - L.X(g.x - g.wBot)) / ((g.wBot * 2) * z); return PAL.linen[u < 0.25 ? 5 : u < 0.7 ? 4 : 3]; });
  line(L.X(g.x - g.wTop), L.Y(g.shadeTop), L.X(g.x + g.wTop), L.Y(g.shadeTop), PAL.linen[1]);
  line(L.X(g.x - g.wBot), L.Y(g.shadeBot), L.X(g.x + g.wBot), L.Y(g.shadeBot), PAL.linen[1]);
  line(L.X(g.x - g.wTop), L.Y(g.shadeTop), L.X(g.x - g.wBot), L.Y(g.shadeBot), PAL.linen[1]);
  line(L.X(g.x + g.wTop), L.Y(g.shadeTop), L.X(g.x + g.wBot), L.Y(g.shadeBot), PAL.linen[1]);
}

// ================================================================ door between bedroom and living room
export function drawDoor(L) {
  const D0 = LAYOUT.door, z = L.z, t = T(L);
  if (!visX(L, D0.x0 - 50, D0.x1 + 8)) return;
  // partition cut above the door (same hatch as the ceiling slab)
  if (visY(L, CEIL, D0.top)) {
    for (let y = Math.max(0, R(L.Y(CEIL))); y < Math.min(H, R(L.Y(D0.top - 6))); y++) { const wy = L.wy(y + 0.5); span(y, R(L.X(D0.x0)), R(L.X(D0.x1)), (x) => { const h = ((L.wx(x + 0.5) + wy) % 9 + 9) % 9; return h < Math.max(0.9, 1 / z) ? WALLC.sectD : WALLC.sect; }); }
    wr1(L, D0.x0, CEIL, D0.x0 + 1, D0.top - 6, WALLC.sectD); wr1(L, D0.x1 - 1, CEIL, D0.x1, D0.top - 6, WALLC.sectD);
  }
  // doorway recess (we look along the partition through the opening)
  wr(L, D0.x0 + 2, D0.top, D0.x1 - 2, 0, rgb("#8C7A70"));
  dim(L.X(D0.x0 + 2), L.Y(D0.top), L.X(D0.x1 - 2), L.Y(0), (x) => 1 - (x - L.X(D0.x0 + 2)) / Math.max(1, (D0.x1 - D0.x0 - 4) * z), 0.4);
  // open door leaf swung into the bedroom
  const hx = D0.x0 - 4, fx = D0.x0 - 46;
  poly([[hx, D0.top + 2], [fx, D0.top + 9], [fx, -6], [hx, -1]].map(t), PAL.trim[4]);
  poly([[hx - 2, D0.top + 2.5], [hx, D0.top + 2], [hx, -1], [hx - 2, -1.3]].map(t), PAL.trim[2]);
  for (const [ya, yb] of [[D0.top + 22, -170], [-150, -22]]) {
    const k0 = (u) => [hx + (fx - hx) * u, 0], top = (u, y) => y + 7 * u * (y < -150 ? 1 : 0.45);
    const q = [[0.22, ya], [0.84, ya], [0.84, yb], [0.22, yb]].map(([u, y]) => [k0(u)[0], top(u, y)]);
    poly(q.map(t), PAL.trim[3]); for (let i = 0; i < 4; i++) line(...t(q[i]), ...t(q[(i + 1) % 4]), PAL.trim[1]);
  }
  for (const [a, b] of [[[hx, D0.top + 2], [fx, D0.top + 9]], [[fx, D0.top + 9], [fx, -6]], [[fx, -6], [hx, -1]]]) line(...t(a), ...t(b), PAL.trim[0]);
  disc(L.X(fx + 5), L.Y(-128), Math.max(1, 2.4 * z), PAL.brass[4]); put(R(L.X(fx + 4.4)), R(L.Y(-129)), PAL.brass[6]);
  // casing
  wbox(L, D0.x0 - 4, D0.top - 6, D0.x0 + 2, 0, PAL.trim, { fill: 4, hi: 6, lo: 2 });
  wbox(L, D0.x1 - 2, D0.top - 6, D0.x1 + 4, 0, PAL.trim, { fill: 4, hi: 6, lo: 2 });
  wbox(L, D0.x0 - 4, D0.top - 6, D0.x1 + 4, D0.top, PAL.trim, { fill: 4, hi: 6, lo: 2 });
}

// ================================================================ living room
export function clockGeom() { return LAYOUT.clock; }
export function drawClockFace(L, hours) {
  const C0 = LAYOUT.clock, z = L.z, cx = L.X(C0.x), cy = L.Y(C0.y), r = C0.r * z;
  if (cx + r < -2 || cx - r > W + 2 || cy + r < -2 || cy - r > H + 2) return;
  // soft drop shadow on the wall, rim, face
  dim(cx - r, cy - r + 2 * z, cx + r + 3 * z, cy + r + 4 * z, (x, y) => (Math.hypot(x - cx - 1.5 * z, y - cy - 2.5 * z) < r ? 1 : 0), 0.25);
  disc(cx, cy, r, PAL.wood[0]);
  ring(cx, cy, r - 4.2 * z, r - 0.8 * z, (x, y) => PAL.wood[(x - cx) + (y - cy) < -r * 0.5 ? 5 : (x - cx) + (y - cy) > r * 0.6 ? 2 : 4]);
  disc(cx, cy, r - 4.2 * z, PAL.cream[6]);
  ring(cx, cy, r - 5.4 * z, r - 4.2 * z, PAL.cream[3]);
  // ticks
  const rf = C0.r - 4.2;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 - Math.PI / 2, big = k % 3 === 0, r0 = rf - (big ? 5.2 : 3), r1 = rf - 1.2;
    line(cx + Math.cos(a) * r0 * z, cy + Math.sin(a) * r0 * z, cx + Math.cos(a) * r1 * z, cy + Math.sin(a) * r1 * z, INK, big ? Math.max(1, 1.8 * z) : Math.max(1, 1.0 * z));
  }
  if (r >= 40) { // numerals at higher zoom
    const s = Math.max(1, Math.floor(r / 34));
    for (const [str, k] of [["12", 0], ["3", 3], ["6", 6], ["9", 9]]) { const a = (k / 12) * Math.PI * 2 - Math.PI / 2, rr0 = (rf - 9.5) * z; text(str, cx + Math.cos(a) * rr0 - textW(str, s) / 2 + 0.5, cy + Math.sin(a) * rr0 - 2.5 * s + 0.5, INK, s); }
  }
  // hands
  const hh = ((hours % 12) + 12) % 12, ha = (hh / 12) * Math.PI * 2 - Math.PI / 2, ma = (hh % 1) * Math.PI * 2 - Math.PI / 2;
  hand(cx, cy, ha, 11.5 * z, Math.max(1.6, 2.8 * z), INK);
  hand(cx, cy, ma, 17.5 * z, Math.max(1.2, 1.9 * z), INK);
  disc(cx, cy, Math.max(1, 2.2 * z), PAL.coral[3]);
}
function hand(cx, cy, a, len, w, c) {
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, tail = len * 0.18;
  if (w < 2.2) { line(cx - dx * tail, cy - dy * tail, cx + dx * len, cy + dy * len, c, w < 1.5 ? 1 : 2); return; }
  poly([[cx - dx * tail + nx * w * 0.5, cy - dy * tail + ny * w * 0.5], [cx + dx * len * 0.85 + nx * w * 0.45, cy + dy * len * 0.85 + ny * w * 0.45], [cx + dx * len, cy + dy * len], [cx + dx * len * 0.85 - nx * w * 0.45, cy + dy * len * 0.85 - ny * w * 0.45], [cx - dx * tail - nx * w * 0.5, cy - dy * tail - ny * w * 0.5]], c);
}
/** Hand / tick geometry for the luminous overlay (screen space). */
export function clockMarks(L, hours) {
  const C0 = LAYOUT.clock, z = L.z, cx = L.X(C0.x), cy = L.Y(C0.y), rf = C0.r - 4.2, out = [];
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 - Math.PI / 2, r0 = rf - (k % 3 === 0 ? 4.5 : 2.6); out.push([cx + Math.cos(a) * r0 * z, cy + Math.sin(a) * r0 * z, k % 3 === 0 ? 1.3 : 0.8]); }
  const hh = ((hours % 12) + 12) % 12, ha = (hh / 12) * Math.PI * 2 - Math.PI / 2, ma = (hh % 1) * Math.PI * 2 - Math.PI / 2;
  return { cx, cy, z, dots: out, hands: [[ha, 11.5], [ma, 17.5]] };
}

export function drawLiving(L, st) {
  const S = LAYOUT.sofa, z = L.z, t = T(L);
  // small framed cat portrait above the side table
  if (vis(L, -44, -246, -8, -196)) {
    wbox(L, -42, -244, -10, -200, PAL.wood, { fill: 2, hi: 4, lo: 1 });
    wr(L, -39, -241, -13, -203, PAL.cream[5]);
    const cx = -26, cy = -218, fur = PAL.must;
    poly([[cx - 8, cy - 4], [cx - 7, cy - 13], [cx - 2, cy - 7]].map(t), fur[4]); poly([[cx + 8, cy - 4], [cx + 7, cy - 13], [cx + 2, cy - 7]].map(t), fur[4]);
    ellipse(L.X(cx), L.Y(cy), 8.5 * z, 7 * z, fur[4]); ellipse(L.X(cx), L.Y(cy + 3), 5 * z, 3 * z, PAL.cream[6]);
    disc(L.X(cx - 3.2), L.Y(cy - 1), Math.max(0.8, 1.1 * z), INK); disc(L.X(cx + 3.2), L.Y(cy - 1), Math.max(0.8, 1.1 * z), INK);
    wr(L, -39, -207, -13, -203, PAL.rose[4]);
  }
  // rubber plant in a terracotta pot between the door and the sofa
  if (vis(L, -330, -200, -236, 0)) {
    const px = -282, trunk = (h) => [px + 3 * Math.sin(h * 0.025), -40 - h];
    for (let h = 0; h < 132; h += 2) { const [x0, y0] = trunk(h), [x1, y1] = trunk(h + 2); line(L.X(x0), L.Y(y0), L.X(x1), L.Y(y1), PAL.wood[2], Math.max(1, 2.2 * z)); }
    const LV = [[18, -1, -2.4, 24], [26, 1, -0.75, 25], [40, -1, -2.25, 27], [50, 1, -0.9, 27], [64, -1, -2.1, 26], [74, 1, -1.0, 27], [88, -1, -2.0, 25], [98, 1, -1.15, 24], [110, -1, -1.85, 22], [118, 1, -1.3, 21], [128, 0, -1.57, 20]];
    for (const [h, side, ang, len] of LV) {
      const [bx, byy] = trunk(h), ca = Math.cos(ang), sa = Math.sin(ang), wd = len * 0.42;
      const loc = [[0, 0], [len * 0.22, wd * 0.42], [len * 0.55, wd * 0.52], [len * 0.86, wd * 0.28], [len, 0], [len * 0.86, -wd * 0.28], [len * 0.55, -wd * 0.52], [len * 0.22, -wd * 0.42]];
      const pts = loc.map(([u, v]) => [bx + u * ca - v * sa, byy + u * sa + v * ca]);
      vol([smooth(pts.map(t), new Set([0, 4]), 4)], PAL.leaf, { thick: 5 * z, base: 3.1, gain: 1.5, slope: 0.4, light: [-0.4, -0.9] });
      line(L.X(bx + len * 0.12 * ca), L.Y(byy + len * 0.12 * sa), L.X(bx + len * 0.82 * ca), L.Y(byy + len * 0.82 * sa), PAL.leaf[5], Math.max(1, 0.7 * z));
      void side;
    }
    vol([smooth([[px - 16, -40], [px + 16, -40], [px + 12, 0], [px - 12, 0]].map(t), new Set([0, 1, 2, 3]))], PAL.pot, { thick: 6 * z, base: 3, gain: 1.4, light: [-0.6, -0.8] });
    wbox(L, px - 18, -44, px + 18, -37, PAL.pot, { fill: 4, hi: 6, lo: 2 });
  }
  // sofa
  if (vis(L, S.x0, S.backTop, S.x1, 0)) {
    dim(L.X(S.x0 + 6), L.Y(-12), L.X(S.x1 - 6), L.Y(2), () => 1, 0.35);
    const TL = PAL.teal, o = { base: 3.1, gain: 1.5, slope: 0.9 };
    for (const fx of [S.x0 + 12, S.x1 - 18]) poly([[fx, -12], [fx + 6, -12], [fx + 5, 0], [fx + 1, 0]].map(t), PAL.wood[2]);
    wsoft(L, S.x0 + 14, S.backTop, S.x1 - 14, -50, 12, TL, { ...o, base: 2.6, th: 8 });
    wsoft(L, S.x0 + 22, S.backTop + 5, (S.x0 + S.x1) / 2 + 1, S.seatTop + 2, 11, TL, { ...o, th: 10 });
    wsoft(L, (S.x0 + S.x1) / 2 - 1, S.backTop + 5, S.x1 - 22, S.seatTop + 2, 11, TL, { ...o, th: 10 });
    wsoft(L, S.x0 + 4, -36, S.x1 - 4, -10, 5, TL, { ...o, base: 2.6, gain: 1.2, th: 6 });
    wsoft(L, S.x0 + 22, S.seatTop, (S.x0 + S.x1) / 2 + 1, -32, 6, TL, { ...o, base: 3.3, th: 7 });
    wsoft(L, (S.x0 + S.x1) / 2 - 1, S.seatTop, S.x1 - 22, -32, 6, TL, { ...o, base: 3.3, th: 7 });
    // throw pillows
    vol([smooth([[S.x0 + 30, S.seatTop - 2], [S.x0 + 27, S.seatTop - 22], [S.x0 + 34, S.seatTop - 40], [S.x0 + 56, S.seatTop - 38], [S.x0 + 62, S.seatTop - 16], [S.x0 + 58, S.seatTop - 1]].map(t))], PAL.must, { thick: 7 * z, base: 3.2, gain: 1.6, light: [-0.4, -0.9] });
    vol([smooth([[S.x1 - 60, S.seatTop - 1], [S.x1 - 64, S.seatTop - 18], [S.x1 - 54, S.seatTop - 34], [S.x1 - 36, S.seatTop - 33], [S.x1 - 28, S.seatTop - 17], [S.x1 - 32, S.seatTop - 1]].map(t))], PAL.coral, { thick: 7 * z, base: 3.2, gain: 1.6, light: [-0.4, -0.9] });
    for (const [a, b] of [[[S.x0 + 36, S.seatTop - 30], [S.x0 + 52, S.seatTop - 12]]]) line(...t(a), ...t(b), PAL.must[2], Math.max(1, z * 0.8));
    // arms
    wsoft(L, S.x0, S.armTop, S.x0 + 26, -10, 10, TL, { ...o, base: 3.2, th: 8 });
    wsoft(L, S.x1 - 26, S.armTop, S.x1, -10, 10, TL, { ...o, base: 3.2, th: 8 });
    // piping on the arm fronts
    for (const ax of [S.x0 + 13, S.x1 - 13]) wr1(L, ax - 0.5, S.armTop + 12, ax + 0.5, -16, TL[2]);
  }
  // side table with a mug and books
  if (vis(L, -48, -110, -2, 0)) {
    wr1(L, -27, -68, -23, -4, PAL.oak[2]); wr1(L, -27, -68, -26, -4, PAL.oak[4]);
    ellipse(L.X(-25), L.Y(-2), 12 * z, Math.max(1, 2.2 * z), PAL.oak[1]);
    wbox(L, -46, -74, -4, -68, PAL.oak, { fill: 4, hi: 6, lo: 2 });
    wbox(L, -42, -80, -18, -74, [INK, PAL.blue[3], PAL.blue[3], PAL.blue[4], PAL.blue[4], PAL.blue[5]]);
    wbox(L, -40, -85, -20, -80, [INK, PAL.must[4], PAL.must[4], PAL.must[5], PAL.must[5], PAL.must[6]]);
    wbox(L, -15, -86, -7, -74, PAL.cream, { fill: 5, hi: 6, lo: 3 });
    ring(L.X(-6), L.Y(-80), 1.6 * z, 3 * z, PAL.cream[3]);
  }
  void st;
}

/** Window frame + glass marker (kind 3 = sky) + sill + a plant. */
export function drawWindow(L) {
  const Wn = LAYOUT.window, z = L.z, t = T(L);
  if (!vis(L, Wn.x0 - 12, Wn.top - 40, Wn.x1 + 50, Wn.sill + 20)) return;
  const f = 8, gx0 = Wn.x0 + f, gx1 = Wn.x1 - f, gy0 = Wn.top + f, gy1 = Wn.sill - f, mx = (Wn.x0 + Wn.x1) / 2, my = Wn.top + (Wn.sill - Wn.top) * 0.45;
  // reveal shadow around the opening
  wbox(L, Wn.x0 - 4, Wn.top - 4, Wn.x1 + 4, Wn.sill + 2, PAL.trim, { fill: 3, hi: 5, lo: 2 });
  P.kind = 3; wr(L, gx0, gy0, gx1, gy1, [255, 0, 255]); P.kind = 2;
  // frame bars
  const bar = (x0, y0, x1, y1) => wbox(L, x0, y0, x1, y1, PAL.trim, { fill: 4, hi: 6, lo: 2, bu: 1.2 });
  bar(Wn.x0, Wn.top, Wn.x1, gy0); bar(Wn.x0, gy1, Wn.x1, Wn.sill); bar(Wn.x0, gy0 - 1, gx0, gy1 + 1); bar(gx1, gy0 - 1, Wn.x1, gy1 + 1);
  bar(mx - 2.5, gy0, mx + 2.5, gy1); bar(gx0, my - 2.5, gx1, my + 2.5);
  // sill + apron
  wbox(L, Wn.x0 - 9, Wn.sill, Wn.x1 + 9, Wn.sill + 7, PAL.trim, { fill: 4, hi: 6, lo: 2 });
  wbox(L, Wn.x0 + 2, Wn.sill + 7, Wn.x1 - 2, Wn.sill + 14, PAL.trim, { fill: 3, hi: 5, lo: 1 });
  dim(L.X(Wn.x0 - 4), L.Y(Wn.sill + 14), L.X(Wn.x1 + 4), L.Y(Wn.sill + 22), (x, y) => 1 - (y - L.Y(Wn.sill + 14)) / Math.max(1, 8 * z), 0.25);
  // little succulent in a pot on the sill
  const px = Wn.x0 + 26;
  for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.48, lx = px + Math.cos(a) * 8, ly = Wn.sill - 14 + Math.sin(a) * 9; vol([smooth([[px, Wn.sill - 13], [lx - 2.5, ly + 2], [lx + Math.cos(a) * 3, ly + Math.sin(a) * 3], [lx + 2.5, ly + 2]].map(t))], PAL.leaf, { thick: 3 * z, base: 3.2, gain: 1.4 }); }
  vol([smooth([[px - 8, Wn.sill - 14], [px + 8, Wn.sill - 14], [px + 6, Wn.sill], [px - 6, Wn.sill]].map(t), new Set([0, 1, 2, 3]))], PAL.pot, { thick: 4 * z, base: 3.2, gain: 1.4 });
  wbox(L, px - 9, Wn.sill - 16, px + 9, Wn.sill - 13, PAL.pot, { fill: 4, hi: 6, lo: 2 });
  // curtain rod
  const ry = LAYOUT.curtain.top - 6;
  wr1(L, Wn.x0 - 12, ry, LAYOUT.curtain.x1 + 10, ry + 2.6, PAL.brass[2]); wr1(L, Wn.x0 - 12, ry, LAYOUT.curtain.x1 + 10, ry + 0.9, PAL.brass[5]);
  for (const fx of [Wn.x0 - 14, LAYOUT.curtain.x1 + 12]) { disc(L.X(fx), L.Y(ry + 1.3), Math.max(1.2, 3.4 * z), PAL.brass[2]); disc(L.X(fx - 0.8), L.Y(ry + 0.5), Math.max(0.6, 1.5 * z), PAL.brass[5]); }
  for (const bx of [Wn.x0 - 9, Wn.x1 - 54]) wr1(L, bx, ry - 2, bx + 3, ry + 7, PAL.brass[1]);
}
export function glassRect() { const Wn = LAYOUT.window, f = 8; return { x0: Wn.x0 + f, x1: Wn.x1 - f, y0: Wn.top + f, y1: Wn.sill - f, mx: (Wn.x0 + Wn.x1) / 2, my: Wn.top + (Wn.sill - Wn.top) * 0.45 }; }

/** Floor-length curtain at LAYOUT.curtain; swing 0..1 amplitude, phase from t. */
export function drawCurtain(L, t, swing) {
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
  // rings on the rod
  const ry = Cu.top - 6;
  for (let k = 0; k < 5; k++) { const rx = Cu.x0 + 3 + k * 8.5; ring(L.X(rx), L.Y(ry + 2.5), Math.max(0.5, 2 * z), Math.max(1.2, 3.4 * z), PAL.brass[3]); }
}

/** Floor lamp geometry. */
export function lampFloorGeom() { const x = LAYOUT.floorLamp.x, cy = LAYOUT.floorLamp.shadeY; return { x, shadeTop: cy - 20, shadeBot: cy + 17, wTop: 16, wBot: 25, cy }; }
export function drawFloorLamp(L) {
  const g = lampFloorGeom(), z = L.z, t = T(L);
  if (!vis(L, g.x - 30, g.shadeTop - 4, g.x + 30, 2)) return;
  ellipse(L.X(g.x), L.Y(-2.5), 15 * z, Math.max(1.2, 3 * z), PAL.brass[1]); ellipse(L.X(g.x - 1), L.Y(-3.4), 11 * z, Math.max(0.8, 1.6 * z), PAL.brass[3]);
  wr1(L, g.x - 1.5, g.shadeBot, g.x + 1.5, -4, PAL.brass[2]); wr1(L, g.x - 1.5, g.shadeBot, g.x - 0.6, -4, PAL.brass[5]);
  wbox(L, g.x - 3, -150, g.x + 3, -143, PAL.brass, { fill: 3, hi: 5, lo: 2 });
  poly([[g.x - g.wTop, g.shadeTop], [g.x + g.wTop, g.shadeTop], [g.x + g.wBot, g.shadeBot], [g.x - g.wBot, g.shadeBot]].map(t), (x) => { const u = (x - L.X(g.x - g.wBot)) / ((g.wBot * 2) * z); return PAL.linen[u < 0.22 ? 5 : u < 0.72 ? 4 : 3]; });
  for (let k = 1; k < 5; k++) { const u = k / 5; line(L.X(g.x - g.wTop + 2 * g.wTop * u), L.Y(g.shadeTop + 1), L.X(g.x - g.wBot + 2 * g.wBot * u), L.Y(g.shadeBot - 1), PAL.linen[2]); }
  const edge = [[g.x - g.wTop, g.shadeTop], [g.x + g.wTop, g.shadeTop], [g.x + g.wBot, g.shadeBot], [g.x - g.wBot, g.shadeBot]];
  for (let i = 0; i < 4; i++) line(...t(edge[i]), ...t(edge[(i + 1) % 4]), PAL.linen[0]);
  wr1(L, g.x - g.wBot + 1, g.shadeBot - 2.2, g.x + g.wBot - 1, g.shadeBot - 0.8, PAL.linen[2]);
}

// ================================================================ kitchen corner
export function drawKitchen(L) {
  const Ct = LAYOUT.counter, F = LAYOUT.fridge, z = L.z, t = T(L);
  // small fish picture above the bowl
  if (vis(L, 350, -224, 396, -184)) {
    wbox(L, 352, -222, 394, -186, PAL.coral, { fill: 3, hi: 5, lo: 2 });
    wr(L, 355, -219, 391, -189, PAL.cream[6]);
    const fx = 371, fy = -204;
    ellipse(L.X(fx), L.Y(fy), 9 * z, 5 * z, PAL.blue[4]); poly([[fx + 7, fy], [fx + 14, fy - 6], [fx + 14, fy + 6]].map(t), PAL.blue[4]);
    disc(L.X(fx - 5), L.Y(fy - 1), Math.max(0.8, 1.2 * z), INK);
    for (let k = 0; k < 3; k++) line(L.X(fx - 2 + k * 4), L.Y(fy - 4), L.X(fx - 3 + k * 4), L.Y(fy + 4), PAL.blue[5]);
  }
  if (!visX(L, Ct.x0 - 10, F.x1 + 10)) return;
  // backsplash: white subway tiles
  { const y0 = -234, y1 = Ct.top, x0 = Ct.x0, x1 = Ct.x1;
    const ya = Math.max(0, R(L.Y(y0))), yb = Math.min(H, R(L.Y(y1))), G1 = rgb("#C9C2B6"), T1 = rgb("#F2EFE8"), T2 = rgb("#FFFFFF"), T3 = rgb("#E2DCD0"), seam = Math.max(0.55, 1 / z);
    for (let y = ya; y < yb; y++) { const wy = L.wy(y + 0.5), row = Math.floor((wy - y0) / 10), fy = (wy - y0) - row * 10;
      span(y, R(L.X(x0)), R(L.X(x1)), (x) => { const wx = L.wx(x + 0.5) - x0 + (row % 2) * 11, fx = ((wx % 22) + 22) % 22; if (fy < seam || fx < seam) return G1; if (fy < 1.6 && z > 1.6) return T2; if (fy > 8.4) return T3; return T1; }); }
  }
  // upper cabinets
  if (visY(L, -356, -258)) {
    wbox(L, Ct.x0 + 2, -356, Ct.x1 - 2, -262, PAL.cream, { fill: 3, hi: 5, lo: 2 });
    const n = 3, wd = (Ct.x1 - Ct.x0 - 10) / n;
    for (let k = 0; k < n; k++) { const a = Ct.x0 + 5 + k * wd; wbox(L, a + 1, -352, a + wd - 1, -266, PAL.cream, { fill: 4, hi: 6, lo: 2 }); wbox(L, a + 6, -346, a + wd - 6, -272, PAL.cream, { fill: 5, hi: 4, lo: 6 }); const hx = k === 1 ? a + 9 : a + wd - 11; wbox(L, hx, -284, hx + 2.4, -272, PAL.steel, { fill: 4, hi: 6, lo: 2 }); }
    dim(L.X(Ct.x0), L.Y(-262), L.X(Ct.x1), L.Y(-250), (x, y) => 1 - (y - L.Y(-262)) / Math.max(1, 12 * z), 0.3);
  }
  // items on the counter (behind the counter top edge)
  // cat food bag
  { const x0 = Ct.x0 + 12, x1 = x0 + 32, top = Ct.top - 48, bot = Ct.top;
    vol([smooth([[x0 + 2, top + 8], [x1 - 2, top + 8], [x1 + 1, bot - 6], [x1, bot], [x0, bot], [x0 - 1, bot - 6]].map(t), new Set([0, 1, 3, 4]))], PAL.kraft, { thick: 6 * z, base: 3.2, gain: 1.4, light: [-0.5, -0.85] });
    poly([[x0 + 2, top + 9], [x0 + 4, top], [x1 - 4, top], [x1 - 2, top + 9]].map(t), PAL.kraft[4]);
    for (let k = 1; k < 4; k++) wr1(L, x0 + 3, top + k * 2.2, x1 - 3, top + k * 2.2 + 0.7, PAL.kraft[2]);
    wbox(L, x0 + 1, top + 8, x1 - 1, top + 12, PAL.coral, { fill: 3, hi: 5, lo: 2 });
    ellipse(L.X((x0 + x1) / 2), L.Y(top + 27), 11 * z, 9 * z, PAL.cream[6]);
    const fx = (x0 + x1) / 2 - 1, fy = top + 27; ellipse(L.X(fx), L.Y(fy), 6 * z, 3.4 * z, PAL.blue[4]); poly([[fx + 4.5, fy], [fx + 9, fy - 4], [fx + 9, fy + 4]].map(t), PAL.blue[4]); disc(L.X(fx - 3), L.Y(fy - 0.8), Math.max(0.6, 0.9 * z), INK);
    for (const [kx, ky] of [[x0 + 6, bot - 7], [x0 + 13, bot - 5], [x1 - 9, bot - 8]]) disc(L.X(kx), L.Y(ky), Math.max(0.8, 1.6 * z), PAL.kraft[1]);
  }
  // fruit bowl with oranges
  { const cx = Ct.x0 + 92;
    for (const [dx, dy] of [[-8, -10], [7, -10], [0, -17]]) { disc(L.X(cx + dx), L.Y(Ct.top + dy), 6.4 * z, PAL.must[4]); disc(L.X(cx + dx - 2), L.Y(Ct.top + dy - 2), 2.2 * z, PAL.must[6]); put(R(L.X(cx + dx)), R(L.Y(Ct.top + dy - 6)), PAL.leaf[3]); }
    poly([[cx - 18, Ct.top - 10], [cx + 18, Ct.top - 10], [cx + 12, Ct.top], [cx - 12, Ct.top]].map(t), PAL.blue[3]); wr1(L, cx - 18, Ct.top - 10, cx + 18, Ct.top - 9, PAL.blue[5]); wr1(L, cx - 13, Ct.top - 1, cx + 13, Ct.top, PAL.blue[1]);
  }
  // kettle
  { const cx = Ct.x0 + 150, by = Ct.top;
    vol([smooth([[cx - 14, by], [cx - 15, by - 12], [cx - 10, by - 22], [cx + 10, by - 22], [cx + 15, by - 12], [cx + 14, by]].map(t), new Set([0, 5]))], PAL.coral, { thick: 7 * z, base: 3.2, gain: 1.6 });
    poly([[cx + 13, by - 12], [cx + 24, by - 22], [cx + 25, by - 19], [cx + 15, by - 6]].map(t), PAL.coral[3]);
    wbox(L, cx - 4, by - 26, cx + 4, by - 22, PAL.steel, { fill: 3, hi: 5, lo: 1 });
    ring(L.X(cx), L.Y(by - 22), 9 * z, 11 * z, (x, y) => (y < L.Y(by - 24) ? PAL.steel[1] : null));
  }
  // herb pot
  { const cx = Ct.x1 - 14; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.42, lx = cx + Math.cos(a) * 9, ly = Ct.top - 16 + Math.sin(a) * 10; vol([smooth([[lx - 3.4, ly], [lx, ly - 3], [lx + 3.4, ly], [lx, ly + 3]].map(t))], PAL.leaf, { thick: 2.5 * z, base: 3.4, gain: 1.2 }); }
    vol([smooth([[cx - 8, Ct.top - 14], [cx + 8, Ct.top - 14], [cx + 6, Ct.top], [cx - 6, Ct.top]].map(t), new Set([0, 1, 2, 3]))], PAL.pot, { thick: 4 * z, base: 3.2, gain: 1.4 }); }
  // base cabinets + counter top
  wr(L, Ct.x0 + 2, -6, Ct.x1 - 2, 0, PAL.cream[1]);
  wbox(L, Ct.x0, Ct.top + 6, Ct.x1, -6, PAL.cream, { fill: 3, hi: 5, lo: 2 });
  { const n = 3, wd = (Ct.x1 - Ct.x0 - 6) / n;
    for (let k = 0; k < n; k++) { const a = Ct.x0 + 3 + k * wd; wbox(L, a + 1, Ct.top + 10, a + wd - 1, -10, PAL.cream, { fill: 4, hi: 6, lo: 2 }); wbox(L, a + 6, Ct.top + 16, a + wd - 6, -16, PAL.cream, { fill: 5, hi: 4, lo: 6 }); wbox(L, a + wd / 2 - 9, Ct.top + 19, a + wd / 2 + 9, Ct.top + 22, PAL.steel, { fill: 4, hi: 6, lo: 2 }); }
  }
  wbox(L, Ct.x0 - 4, Ct.top, Ct.x1 + 4, Ct.top + 7, PAL.oak, { fill: 4, hi: 6, lo: 2 });
  for (let x = Ct.x0 + 10; x < Ct.x1; x += 24) wr1(L, x, Ct.top + 2, x + 0.8, Ct.top + 6, PAL.oak[3]);
  // fridge (retro, rounded top)
  if (vis(L, F.x0 - 4, F.top - 34, F.x1 + 4, 0)) {
    // wicker basket on top
    { const x0 = F.x0 + 10, x1 = F.x1 - 12, y0 = F.top - 26; wbox(L, x0, y0, x1, F.top, PAL.kraft, { fill: 3, hi: 5, lo: 2 }); for (let y = y0 + 3; y < F.top - 1; y += 4) for (let x = x0 + 2 + ((y - y0) % 8 ? 3 : 0); x < x1 - 2; x += 6) wr1(L, x, y, x + 3, y + 1.4, PAL.kraft[1]); wr1(L, x0 - 1, y0, x1 + 1, y0 + 2.2, PAL.kraft[4]); }
    wr(L, F.x0 + 4, -10, F.x1 - 4, 0, PAL.steel[1]);
    for (let x = F.x0 + 8; x < F.x1 - 8; x += 5) wr1(L, x, -8, x + 2, -3, PAL.steel[0]);
    wsoft(L, F.x0, F.top, F.x1, -10, 12, PAL.mint, { base: 3.4, gain: 1.4, slope: 0.6, th: 14 });
    wr1(L, F.x0 + 2, -282, F.x1 - 2, -280.8, PAL.mint[0]); wr1(L, F.x0 + 2, -280.8, F.x1 - 2, -279.8, PAL.mint[5]);
    for (const [y0, y1] of [[F.top + 22, F.top + 74], [-262, -168]]) { wbox(L, F.x0 + 7, y0, F.x0 + 12, y1, PAL.steel, { fill: 4, hi: 6, lo: 2 }); }
    wbox(L, F.x1 - 30, F.top + 14, F.x1 - 12, F.top + 22, PAL.steel, { fill: 4, hi: 6, lo: 2 });
    // magnets + a child's drawing of the cat
    for (const [mx, my, col] of [[F.x0 + 30, -240, PAL.coral[4]], [F.x0 + 74, -232, PAL.must[4]], [F.x0 + 56, -150, PAL.leaf[4]], [F.x0 + 34, F.top + 40, PAL.blue[4]]]) wbox(L, mx, my, mx + 7, my + 7, [INK, col, col, col, col, col]);
    { const px = F.x0 + 38, py = -226, w = 40, h = 32; wbox(L, px, py, px + w, py + h, PAL.cream, { fill: 6, hi: 6, lo: 4 }); const cx = px + w / 2, cy = py + h * 0.62;
      ellipse(L.X(cx - 2), L.Y(cy), 11 * z, 6.5 * z, PAL.must[3]); disc(L.X(cx + 9), L.Y(cy - 6), 5 * z, PAL.must[3]); poly([[cx + 5, cy - 9], [cx + 6, cy - 15], [cx + 9, cy - 10]].map(t), PAL.must[3]); poly([[cx + 10, cy - 10], [cx + 13, cy - 15], [cx + 14, cy - 8]].map(t), PAL.must[3]);
      line(L.X(cx - 12), L.Y(cy), L.X(cx - 18), L.Y(cy - 8), PAL.must[3], Math.max(1, 1.4 * z)); wbox(L, cx - 4, py - 2, cx + 3, py + 4, [INK, PAL.coral[4], PAL.coral[4], PAL.coral[4], PAL.coral[4], PAL.coral[4]]); }
  }
}
