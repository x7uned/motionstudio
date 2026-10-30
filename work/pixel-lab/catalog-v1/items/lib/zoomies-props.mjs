// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-zoomies/film/apartment-props.mjs (the living-room parts only: palettes, roof
// slab, trims, clock, sofa + plant + side table, window, curtain, floor lamp); changes: import paths, positions from the
// re-laid-out catalog LAYOUT (plant / side table no longer hard-coded), the framed cat portrait removed (topic-specific).
// Furniture and fittings of the cat-zoomies apartment, painted in ALBEDO colours into the scratch raster
// (apartment-px.mjs). Positions come only from layout.mjs LAYOUT. Wall-mounted things and furniture stand in the prop
// layer L = layer(cam, PROP_P); feet touch wy = 0. Lighting is applied afterwards by apartment.mjs.
import { LAYOUT, CEIL, rnd } from "./zoomies-layout.mjs";
import { TINY } from "../../../../../renderer/pixel/raster.mjs";
import { W, H, P, rgb, ramp, put, span, rect, rect1, poly, ellipse, disc, line, ring, dim, vol, smooth, rr } from "./zoomies-px.mjs";

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
  // rubber plant in a terracotta pot between the door and the sofa
  const px = LAYOUT.plant.x;
  if (vis(L, px - 48, -200, px + 46, 0)) {
    const trunk = (h) => [px + 3 * Math.sin(h * 0.025), -40 - h];
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
  const tx = LAYOUT.sideTable.x + 25;   // the film's table stood at x −48…−2
  if (vis(L, tx - 48, -110, tx - 2, 0)) {
    wr1(L, tx - 27, -68, tx - 23, -4, PAL.oak[2]); wr1(L, tx - 27, -68, tx - 26, -4, PAL.oak[4]);
    ellipse(L.X(tx - 25), L.Y(-2), 12 * z, Math.max(1, 2.2 * z), PAL.oak[1]);
    wbox(L, tx - 46, -74, tx - 4, -68, PAL.oak, { fill: 4, hi: 6, lo: 2 });
    wbox(L, tx - 42, -80, tx - 18, -74, [INK, PAL.blue[3], PAL.blue[3], PAL.blue[4], PAL.blue[4], PAL.blue[5]]);
    wbox(L, tx - 40, -85, tx - 20, -80, [INK, PAL.must[4], PAL.must[4], PAL.must[5], PAL.must[5], PAL.must[6]]);
    wbox(L, tx - 15, -86, tx - 7, -74, PAL.cream, { fill: 5, hi: 6, lo: 3 });
    ring(L.X(tx - 6), L.Y(-80), 1.6 * z, 3 * z, PAL.cream[3]);
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
