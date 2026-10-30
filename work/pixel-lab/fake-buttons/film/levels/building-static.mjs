// Static art of the office building cut open like a dollhouse («Fake buttons», builder BUILDING). Painted ONCE into
// three world-space layers: BACK (walls, floors, furniture, the open shaft), MID (desk fronts in front of the seated
// colleague, behind walkers) and FRONT (slab sections and the facade strip, in front of everyone and of the car).
// Late-afternoon light: warm lobby (art-deco marble, brass), cool blue office (it is cold in there), lavender archive.
import { G, band, CAR, HPANEL, KEYSW, THERMO_P, BOX, DUCT, DESK_A, DESK_B, PHONE, Layer, OUT, vgrad, box, label, textW, mix, bayer, rnd, R, lerp, clamp01, MAIN, TINY } from "./building-kit.mjs";
import { SHAFT } from "../timeline.mjs";

// ---------------------------------------------------------------- palette
export const P = {
  sec: "#3B2B3F", secH: "#4D3B52", secHi: "#7A6282", secLo: "#22162A",          // section cut faces (dollhouse slices)
  stone: ["#A8845E", "#C9A57C", "#E2C49A", "#F2DDB8"],                          // limestone facade
  marble: ["#C9AE88", "#DCC39C", "#EAD6B2", "#F5E7CA"], vein: "#CDB48E",
  teal: ["#1E3A38", "#2A4E4A", "#376660", "#4A8078"], brass: ["#7A4E1C", "#B07A30", "#E0A848", "#FFD98A"],
  lobbyCeil: ["#A88E6C", "#BFA27C", "#D2B890"],
  office: ["#8E9CAE", "#AEBBCA", "#CAD4DE", "#E2E8EF"], carpet: ["#3C4864", "#4A5876", "#58688A", "#66789A"],
  arch: ["#9C8CB2", "#B4A6C8", "#CABEDA", "#DDD4EA"], parquet: ["#6A4028", "#86563A", "#A06C48", "#B8845A"],
  shaft: ["#231E2C", "#2E2838", "#3A3446", "#474154"], rail: ["#4A5060", "#7A8294", "#AEB6C6"],
  conc: ["#3A3546", "#4A4458", "#5A546A", "#6C667C"], soil: ["#2A1A16", "#3C261E", "#523426", "#6A4632"],
  wood: ["#4A2A18", "#6E3E22", "#94582E", "#B87640", "#D49A5E"], glass: ["#5A86A8", "#7EAACA", "#A8CCE4", "#D8F0FF"],
  sky: ["#FFD8A8", "#F8B888", "#E89A84", "#B8789A", "#7A5A9A"],
};

// ---------------------------------------------------------------- shared pieces
/** Section cut face (wall/slab sliced by the dollhouse cut): dark fill, diagonal hatch, lit top edge, dark bottom edge. */
function section(g, x0, y0, x1, y1, { hatch = 6, top = true, bottom = true } = {}) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g.px(x, y, ((x + y) % hatch + hatch) % hatch === 0 ? P.secH : P.sec);
  if (top) g.rect(x0, y0, x1 - x0, 1, P.secHi);
  if (bottom) g.rect(x0, y1 - 1, x1 - x0, 1, P.secLo);
  g.rect(x0, y0, 1, y1 - y0, P.secLo); g.rect(x1 - 1, y0, 1, y1 - y0, P.secLo);
}
/** Recessed ceiling light with its glow washing down the wall (dithered tint toward `glow`). */
function ceilLight(g, x, ceilY, w, glow, lamp = "#FFF6D8", reach = 120, k = 0.32) {
  g.rect(x - w, ceilY + 4, w * 2, 3, OUT); g.rect(x - w + 1, ceilY + 5, w * 2 - 2, 2, lamp); g.rect(x - w + 2, ceilY + 4, w * 2 - 4, 1, "#FFFFFF");
  g.tint(x - w - reach * 0.6, ceilY + 12, w * 2 + reach * 1.2, reach, (X, Y) => { const dy = (Y - ceilY - 12) / reach, dx = Math.abs(X - x) / (w + 10 + dy * reach * 0.55); return dx >= 1 ? 0 : (1 - dy) * (1 - dx * dx) * k; }, glow, 4);
}
function window(g, x0, y0, x1, y1, seed = 1, frame = "#F2F4F6", frameLo = "#9AA4B4") {
  // sky through the window: golden gradient, the city's far towers, a soft sun glare
  vgrad(g, x0, y0, x1 - x0, y1 - y0, ["#8A6AB0", "#C07AA0", "#EE9E86", "#FFC896", "#FFDCAA"]);
  for (let i = 0; i < 9; i++) {
    const bx = x0 + R(rnd(seed * 31 + i) * (x1 - x0)) - 10, bw = 10 + R(rnd(seed * 7 + i) * 18), bh = 30 + R(rnd(seed * 13 + i) * (y1 - y0) * 0.55);
    const col = i % 2 ? "#7A5A8C" : "#8C6A96";
    for (let y = y1 - bh; y < y1; y++) for (let x = Math.max(x0, bx); x < Math.min(x1, bx + bw); x++) g.px(x, y, (x - bx) < 2 ? "#A07AA0" : col);
    for (let y = y1 - bh + 6; y < y1 - 4; y += 7) for (let x = Math.max(x0, bx + 3); x < Math.min(x1, bx + bw - 2); x += 4) if (rnd(i * 97 + x * 3 + y) < 0.45) g.px(x, y, "#FFD98A");
  }
  // frame + mullions + sill
  g.rect(x0 - 4, y0 - 4, x1 - x0 + 8, 4, frame); g.rect(x0 - 4, y1, x1 - x0 + 8, 5, frame); g.rect(x0 - 4, y0, 4, y1 - y0, frame); g.rect(x1, y0, 4, y1 - y0, frame);
  const mx = R((x0 + x1) / 2); g.rect(mx - 1, y0, 3, y1 - y0, frame); g.rect(x0, R(y0 + (y1 - y0) * 0.38), x1 - x0, 2, frame);
  g.rect(x0 - 6, y1 + 5, x1 - x0 + 12, 3, frameLo); g.frame(x0 - 5, y0 - 5, x1 - x0 + 10, y1 - y0 + 11, OUT);
  // glass glints
  for (let k = 0; k < 2; k++) { const gx = x0 + 6 + k * R((x1 - x0) / 2); for (let i = 0; i < 16; i++) { g.px(gx + i, y0 + 22 - i, "#FFF4E0"); g.px(gx + i + 4, y0 + 22 - i, "#FFF4E0"); } }
}
function plant(g, x, y, s = 1, pot = ["#8A3E2A", "#B85A3A", "#D8784E"]) {
  const pw = R(22 * s), ph = R(24 * s);
  g.poly([[x - pw / 2, y - ph], [x + pw / 2, y - ph], [x + pw / 2 - 3, y], [x - pw / 2 + 3, y]], OUT);
  g.poly([[x - pw / 2 + 1, y - ph + 1], [x + pw / 2 - 1, y - ph + 1], [x + pw / 2 - 4, y - 1], [x - pw / 2 + 4, y - 1]], pot[1]);
  g.rect(R(x - pw / 2), R(y - ph), pw, 4, pot[2]); g.rect(R(x - pw / 2), R(y - ph + 4), pw, 1, pot[0]);
  const L = ["#1E4A2A", "#2E6A38", "#3E8A44", "#62AE58", "#9AD474"];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.28 + (rnd(i * 5) - 0.5) * 0.2, len = (46 + rnd(i * 3) * 34) * s, bx = x + (i - 4) * 1.5, by = y - ph;
    const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a), w = (5 + rnd(i) * 3) * s;
    const mid = [(bx + tx) / 2 + nx * w * 0.4, (by + ty) / 2 + ny * w * 0.4];
    const leaf = [[bx, by], [mid[0] + nx * w, mid[1] + ny * w], [tx, ty], [mid[0] - nx * w, mid[1] - ny * w]];
    g.poly(leaf.map(([px, py]) => [px - 1, py]), OUT); g.poly(leaf.map(([px, py]) => [px + 1, py]), OUT); g.poly(leaf.map(([px, py]) => [px, py - 1]), OUT);
    g.poly(leaf, L[1 + (i % 3)]);
    g.poly([[bx, by], [mid[0] + nx * w * 0.6, mid[1] + ny * w * 0.6], [tx, ty], [mid[0], mid[1]]], L[2 + (i % 3)]);
    g.line(R(bx), R(by), R(tx), R(ty), L[0]);
  }
}

// ---------------------------------------------------------------- the facade strip (−90 … −60) with the glass entrance
function facade(g) {
  const [x0, x1] = G.face, top = G.roof - 40;
  // limestone blocks, lit from the low sun on the left
  for (let y = top; y < 2; y++) for (let x = x0; x < x1; x++) {
    const row = Math.floor((y - top) / 18), joint = ((y - top) % 18 === 0) || ((x - x0 + (row % 2) * 13) % 26 === 0);
    const lit = x - x0 < 3 ? 3 : x - x0 < 8 ? 2 : 1;
    g.px(x, y, joint ? P.stone[0] : (x - x0 < 8 && (x - x0 - 3) / 5 > bayer(x, y)) ? P.stone[3] : P.stone[lit]);
  }
  // band courses at each floor + the cornice at the roof
  for (const F of [...G.floors, G.roof]) { g.rect(x0 - 2, F - 4, x1 - x0 + 2, 6, P.stone[3]); g.rect(x0 - 2, F + 2, x1 - x0 + 2, 2, P.stone[0]); g.rect(x0 - 2, F - 5, x1 - x0 + 2, 1, OUT); }
  g.rect(x0 - 4, top, x1 - x0 + 4, 8, P.stone[3]); g.rect(x0 - 4, top + 8, x1 - x0 + 4, 2, P.stone[0]); g.rect(x0 - 4, top - 1, x1 - x0 + 4, 1, OUT);
  // window slivers on floors 2 and 3
  for (const F of [G.floors[1], G.floors[2]]) { const wy0 = F - 226, wy1 = F - 108;
    g.rect(x0 + 5, wy0 - 3, 20, wy1 - wy0 + 6, OUT); g.rect(x0 + 6, wy0 - 2, 18, wy1 - wy0 + 4, "#EDE6DA"); vgrad(g, x0 + 8, wy0, 14, wy1 - wy0, ["#7A5A9A", "#C07AA0", "#F0A088", "#FFD0A0"]);
    g.rect(x0 + 6, R(wy0 + (wy1 - wy0) * 0.38), 18, 2, "#EDE6DA"); for (let i = 0; i < 10; i++) { g.px(x0 + 10 + (i % 6), wy0 + 14 + i - (i % 6), "#FFF4E0"); }
    g.rect(x0 + 3, wy1 + 3, 24, 3, P.stone[3]); g.rect(x0 + 3, wy1 + 6, 24, 1, OUT); g.rect(x0 + 3, wy0 - 6, 24, 3, P.stone[3]); }
  // the glass entrance (street level): bronze frame, two glass leaves, push bars, a transom
  const ey0 = -236; g.rect(x0 + 2, ey0, 26, 236, "#3A2618"); g.rect(x0 + 3, ey0 + 1, 24, 2, "#8A6A48");
  vgrad(g, x0 + 4, ey0 + 4, 22, 28, ["#FFE2B0", "#E8B890", "#B88AA0"]);                       // transom: warm sky reflection
  g.rect(x0 + 2, ey0 + 32, 26, 3, "#5A3E2A");
  for (let y = ey0 + 35; y < 0; y++) for (let x = x0 + 4; x < x0 + 26; x++) {
    const u = (x - x0 - 4) / 22, v = (y - ey0) / 236, refl = ((x + y * 0.6) % 22 + 22) % 22;
    let col = P.glass[v < 0.5 ? 2 : 1]; if (refl < 3) col = P.glass[3]; else if (refl < 5) col = P.glass[2];
    if (u > 0.85) col = P.glass[0];
    g.px(x, y, col);
  }
  g.rect(x0 + 14, ey0 + 35, 2, 235 - 35, "#3A2618");                                           // leaf meeting stile
  g.rect(x0 + 5, -118, 8, 2, P.brass[2]); g.rect(x0 + 17, -118, 8, 2, P.brass[2]);               // push bars
  g.rect(x0 + 5, -117, 8, 1, P.brass[0]); g.rect(x0 + 17, -117, 8, 1, P.brass[0]);
  // outline: the outer edge (lit) and the cut edge (dark section line) on the right
  g.rect(x0 - 1, top, 1, 2 - top, OUT); g.rect(x0, top, 1, 2 - top, "#FFD8A0");
  for (let y = top; y < 2; y++) { g.px(x1 - 2, y, P.secLo); g.px(x1 - 1, y, P.sec); }
}

// ---------------------------------------------------------------- lobby (F = 0): art-deco marble, brass, checker floor
function lobby(g) {
  const B = band(0), x0 = G.in0, x1 = G.sw0;
  // ceiling band
  vgrad(g, x0, B.ceil, x1 - x0, 12, P.lobbyCeil, 0, 1); g.rect(x0, B.wallTop - 1, x1 - x0, 1, P.brass[0]);
  // upper wall: cream marble panels with soft veins
  for (let y = B.wallTop; y < -86; y++) for (let x = x0; x < x1; x++) {
    const seam = ((x - x0) % 84 === 0), v = (y - B.wallTop) / (-86 - B.wallTop);
    let col = P.marble[v < 0.15 ? 3 : v < 0.75 ? 2 : (v - 0.75) / 0.25 > bayer(x, y) ? 1 : 2];
    if (seam) col = P.marble[0];
    g.px(x, y, col);
  }
  for (let i = 0; i < 22; i++) { let vx = x0 + rnd(i * 13) * (x1 - x0), vy = B.wallTop + 10 + rnd(i * 7) * 140; for (let k = 0; k < 40; k++) { vx += 0.8 + rnd(i * 50 + k) * 0.6; vy += (rnd(i * 70 + k) - 0.35) * 1.4; if (vx < x1 && ((R(vx) - x0) % 84)) g.px(R(vx), R(vy), P.vein); } }
  // deco frieze under the ceiling: brass chevrons on dark teal
  g.rect(x0, B.wallTop, x1 - x0, 12, P.teal[1]); g.rect(x0, B.wallTop + 12, x1 - x0, 2, P.brass[1]); g.rect(x0, B.wallTop + 11, x1 - x0, 1, P.brass[3]);
  for (let x = x0; x < x1; x++) { const k = ((x - x0) % 12 + 12) % 12, h = k < 6 ? k : 12 - k; g.px(x, B.wallTop + 2 + h, P.brass[2]); g.px(x, B.wallTop + 3 + h, P.brass[0]); }
  // wainscot: dark green marble + brass rail
  for (let y = -86; y < B.floorTop; y++) for (let x = x0; x < x1; x++) { const k = (x * 7 + y * 3) % 23; g.px(x, y, k === 0 ? P.teal[3] : ((x - x0) % 42 === 0) ? P.teal[0] : (y - -86) < 3 ? P.teal[3] : P.teal[(x + y) % 9 === 0 ? 1 : 2]); }
  g.rect(x0, -88, x1 - x0, 3, P.brass[2]); g.rect(x0, -88, x1 - x0, 1, P.brass[3]); g.rect(x0, -85, x1 - x0, 1, P.brass[0]);
  g.rect(x0, B.floorTop - 3, x1 - x0, 3, P.teal[0]);
  // pilasters
  for (const px of [40, 196]) {
    g.rect(px - 10, B.wallTop + 14, 20, B.floorTop - B.wallTop - 14, OUT);
    vgrad(g, px - 9, B.wallTop + 14, 18, B.floorTop - B.wallTop - 15, [P.marble[3], P.marble[2], P.marble[1]]);
    for (let y = B.wallTop + 20; y < B.floorTop - 6; y++) { g.px(px - 4, y, P.marble[0]); g.px(px + 4, y, P.marble[0]); g.px(px - 8, y, P.marble[3]); }
    g.rect(px - 12, B.wallTop + 14, 24, 5, P.brass[2]); g.rect(px - 12, B.wallTop + 14, 24, 1, P.brass[3]); g.rect(px - 12, B.wallTop + 18, 24, 1, P.brass[0]);
    g.rect(px - 12, B.floorTop - 8, 24, 8, P.teal[1]); g.rect(px - 12, B.floorTop - 8, 24, 1, P.brass[2]);
  }
  // deco sunburst above the reception desk (brass rays)
  { const cx = 118, cy = -150; for (let i = 0; i < 11; i++) { const a = Math.PI + (i + 0.5) * (Math.PI / 11), len = 54; for (let r = 14; r < len; r++) { const x = R(cx + Math.cos(a) * r), y = R(cy + Math.sin(a) * r); g.px(x, y, r % 7 === 0 ? P.brass[3] : P.brass[1]); g.px(x + 1, y, P.brass[2]); } }
    for (let y = -14; y <= 0; y++) for (let x = -14; x <= 14; x++) if (x * x + y * y <= 196) g.px(cx + x, cy + y, x * x + y * y > 150 ? P.brass[0] : y < -6 ? P.brass[3] : P.brass[2]); g.rect(cx - 30, cy, 60, 3, P.brass[0]); }
  // wall clock over the bench
  { const cx = 270, cy = -196, r = 15; g.disc(cx, cy, r + 1, OUT); g.disc(cx, cy, r, P.brass[2]); g.disc(cx, cy, r - 3, "#FFF8EA"); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.px(R(cx + Math.cos(a) * (r - 5)), R(cy + Math.sin(a) * (r - 5)), OUT); } g.line(cx, cy, cx + 6, cy - 4, OUT); g.line(cx, cy, cx, cy - 9, OUT); g.px(cx, cy, "#C8303A"); }
  // directory board
  { const bx = 304, by = -232, bw = 56, bh = 64; box(g, bx, by, bw, bh, "#2A1E26", OUT); g.rect(bx + 2, by + 2, bw - 4, 1, P.brass[2]); g.rect(bx + 2, by + bh - 3, bw - 4, 1, P.brass[2]);
    label(g, TINY, "FLOORS", bx + 10, by + 6, P.brass[3]); [["3", "ARCHIVE"], ["2", "OFFICE"], ["1", "LOBBY"]].forEach(([n, s], i) => { g.text(TINY, n, bx + 6, by + 18 + i * 13, P.brass[2]); g.text(TINY, s, bx + 16, by + 18 + i * 13, "#F4E6C8"); }); }
  // ceiling lights + their warm glow on the marble
  for (const lx of [-20, 92, 196, 300]) ceilLight(g, lx, B.ceil, 14, "#FFF2C8", "#FFF6D8", 150, 0.3);
  // art-deco pendant lamps (brass cap, a cord, a glowing frosted globe)
  for (const lx of [24, 140, 252]) {
    g.rect(lx - 5, B.ceil + 1, 11, 4, OUT); g.rect(lx - 4, B.ceil + 2, 9, 2, P.brass[2]); g.rect(lx, B.ceil + 5, 1, 22, OUT);
    g.tint(lx - 30, B.ceil + 4, 61, 60, (X, Y) => Math.max(0, 1 - Math.hypot(X - lx, Y - B.ceil - 34) / 30) * 0.45, "#FFF0B8", 4);
    g.poly([[lx - 9, B.ceil + 27], [lx + 10, B.ceil + 27], [lx + 6, B.ceil + 44], [lx - 5, B.ceil + 44]], OUT);
    g.poly([[lx - 8, B.ceil + 28], [lx + 9, B.ceil + 28], [lx + 5, B.ceil + 43], [lx - 4, B.ceil + 43]], "#FFF2C0");
    g.rect(lx - 7, B.ceil + 28, 15, 2, P.brass[2]); g.rect(lx - 4, B.ceil + 41, 9, 2, P.brass[1]); g.rect(lx - 5, B.ceil + 31, 2, 8, "#FFFFFF");
  }
  // floor: polished checker marble (two receding rows) with soft reflections
  for (let y = B.floorTop; y < 2; y++) {
    const back = y < B.floorTop + 11, tw = back ? 24 : 28, off = back ? 12 : 0;
    for (let x = x0; x < x1; x++) {
      const skew = R((y - B.floorTop) * 0.35), cell = Math.floor((x - x0 + off + skew) / tw) + (back ? 1 : 0), dark = cell % 2 === 0;
      let col = dark ? "#2E3A3C" : "#E6D4B0"; if (y === B.floorTop + 11) col = "#8A7A66";
      if (!dark && (x + y * 2) % 37 === 0) col = "#D2BE98";
      g.px(x, y, col);
    }
  }
  for (const lx of [-20, 92, 196, 300]) g.tint(lx - 20, B.floorTop + 2, 40, 22, (X, Y) => Math.max(0, 1 - Math.abs(X - lx) / 18) * 0.5, "#FFF6E0", 3);
  g.rect(x0, B.floorTop, x1 - x0, 1, OUT); g.rect(x0, 1, x1 - x0, 1, "#FFF2D0");
  // entrance mat
  g.rect(x0 + 2, -8, 44, 8, "#6A2A2E"); g.rect(x0 + 2, -8, 44, 1, "#9A4A44"); for (let x = x0 + 4; x < x0 + 44; x += 3) g.px(x, -4, "#8A3A3A");
  // reception desk (front panel faces us): curved wood + brass inlay, a lamp, a bell, the back of a monitor
  { const dx0 = 62, dx1 = 176, top = -74;
    g.rect(dx0 - 2, top - 2, dx1 - dx0 + 4, 8, OUT); g.rect(dx0 - 1, top - 1, dx1 - dx0 + 2, 6, "#2A1A14"); g.rect(dx0, top - 1, dx1 - dx0, 2, "#6A4630");
    g.rect(dx0, top + 6, dx1 - dx0, -top - 8, OUT);
    for (let y = top + 7; y < -2; y++) for (let x = dx0 + 1; x < dx1 - 1; x++) { const u = (x - dx0) / (dx1 - dx0), sh = Math.abs(u - 0.4); g.px(x, y, sh > 0.45 ? P.wood[1] : sh > 0.3 ? ((sh - 0.3) / 0.15 > bayer(x, y) ? P.wood[1] : P.wood[2]) : P.wood[(x * 3 + y) % 31 === 0 ? 2 : 3]); }
    g.rect(dx0 + 1, top + 18, dx1 - dx0 - 2, 2, P.brass[2]); g.rect(dx0 + 1, top + 18, dx1 - dx0 - 2, 1, P.brass[3]); g.rect(dx0 + 1, -10, dx1 - dx0 - 2, 2, P.brass[1]);
    for (let i = 0; i < 5; i++) { const bx = dx0 + 14 + i * 22; g.rect(bx, top + 26, 2, 34, P.wood[1]); g.rect(bx + 2, top + 26, 1, 34, P.wood[4]); }
    // lamp
    g.rect(dx0 + 12, top - 14, 2, 12, P.brass[1]); g.poly([[dx0 + 5, top - 14], [dx0 + 21, top - 14], [dx0 + 17, top - 24], [dx0 + 9, top - 24]], OUT); g.poly([[dx0 + 6, top - 15], [dx0 + 20, top - 15], [dx0 + 16, top - 23], [dx0 + 10, top - 23]], "#3E7A5A"); g.rect(dx0 + 8, top - 16, 10, 1, "#7AC89A");
    g.tint(dx0 - 10, top - 14, 50, 14, (X, Y) => Math.max(0, 1 - Math.hypot(X - dx0 - 13, (Y - top + 2) * 2) / 22) * 0.5, "#FFF0B0", 3);
    // monitor back + bell + a little sign
    box(g, dx0 + 70, top - 30, 30, 22, "#3A3A4A", OUT, "#5A5A6E"); g.rect(dx0 + 82, top - 8, 6, 6, "#2A2A36");
    g.disc(dx0 + 48, top - 4, 4, OUT); g.disc(dx0 + 48, top - 4, 3, P.brass[2]); g.px(dx0 + 47, top - 6, "#FFFFFF"); g.rect(dx0 + 43, top - 2, 11, 2, P.brass[0]);
  }
  // waiting bench + a newspaper
  { const bx0 = 220, bx1 = 330; box(g, bx0, -40, bx1 - bx0, 10, P.wood[3], OUT, P.wood[4], P.wood[1]); box(g, bx0 + 2, -60, bx1 - bx0 - 4, 8, P.wood[3], OUT, P.wood[4]);
    for (const lx of [bx0 + 6, bx1 - 10]) { g.rect(lx, -30, 4, 30, OUT); g.rect(lx + 1, -30, 2, 29, P.brass[1]); }
    g.rect(bx0 + 4, -52, 2, 12, OUT); g.rect(bx1 - 6, -52, 2, 12, OUT);
    g.rect(bx0 + 70, -44, 18, 4, "#F2EEE0"); g.rect(bx0 + 70, -44, 18, 1, "#FFFFFF"); for (let i = 0; i < 4; i++) g.rect(bx0 + 72, -43 + i, 12, 1, i % 2 ? "#F2EEE0" : "#9A9A9A"); }
  plant(g, -30, -2, 1.15); plant(g, 352, -2, 0.85, ["#2A3A3E", "#3E5A5E", "#5A7E80"]);
  // the hall call panel (brass plate: ▲▼ calls, the FIRE section with its keyswitch, the CLOSE icon lamp)
  { const { x, y, w, h } = HPANEL; g.rect(x - 1, y - 1, w + 2, h + 2, OUT); vgrad(g, x, y, w, h, [P.brass[3], P.brass[2], P.brass[1]]); g.rect(x + 1, y + 1, w - 2, 1, "#FFF0C0");
    for (const [cy, up] of [[y + 13, 1], [y + 29, 0]]) { g.disc(x + w / 2, cy, 6, OUT); g.disc(x + w / 2, cy, 5, "#E8E4DC"); g.disc(x + w / 2, cy, 3, "#B8B2A8"); for (let i = 0; i < 3; i++) g.rect(x + w / 2 - i, cy + (up ? -1 + i : 1 - i), 2 * i + 1, 1, OUT); }
    // fire section
    g.rect(x + 3, y + 40, w - 6, h - 44, "#C8302E"); g.rect(x + 4, y + 41, w - 8, h - 46, "#2A1418"); g.rect(x + 4, y + 41, w - 8, 1, "#5A2A2E");
    label(g, MAIN, "FIRE", x + w / 2 - 11, y + 44, "#FF6A50");
    g.disc(KEYSW.x, KEYSW.y, 6, OUT); g.disc(KEYSW.x, KEYSW.y, 5, "#C8C8D0"); g.disc(KEYSW.x, KEYSW.y, 3, "#8A8A96");
    g.text(TINY, "OFF", x + 4, y + 66, "#9A8A8E"); g.text(TINY, "ON", x + w - 12, y + 66, "#9A8A8E");
    box(g, x + w / 2 - 8, y + h - 16, 16, 11, "#3A2228", OUT);    // CLOSE icon lamp (unlit; lit dynamically)
  }
}

// ---------------------------------------------------------------- the open shaft (back wall, rails, pit, machine room)
function shaft(g) {
  const x0 = G.sh0, x1 = G.sh1, yTop = G.roof - 100, yBot = G.base.floor;
  for (let y = yTop; y < yBot; y++) for (let x = x0; x < x1; x++) {
    const panel = ((y - yTop) % 60 === 0) || ((x - x0) % 35 === 0), tie = ((y - yTop) % 60 === 30) && ((x - x0) % 35 === 17);
    g.px(x, y, tie ? P.shaft[0] : panel ? P.shaft[1] : P.shaft[(x + y) % 13 === 0 ? 3 : 2]);
  }
  // a soft gradient: darker toward the shaft's sides (depth)
  g.tint(x0, yTop, x1 - x0, yBot - yTop, (X) => { const u = Math.abs((X - x0) / (x1 - x0) - 0.5) * 2; return Math.max(0, u - 0.55) * 0.9; }, "#120E18", 3);
  // car guide rails (left/right) and the counterweight's rails (back right)
  for (const rx of [x0 + 3, x1 - 7]) { g.rect(rx, yTop, 4, yBot - yTop, P.rail[0]); g.rect(rx + 1, yTop, 2, yBot - yTop, P.rail[1]); g.rect(rx + 1, yTop, 1, yBot - yTop, P.rail[2]);
    for (let y = yTop + 20; y < yBot; y += 75) { g.rect(rx - 2, y, 8, 5, OUT); g.rect(rx - 1, y + 1, 6, 3, P.rail[0]); } }
  for (const rx of [x1 - 38, x1 - 14]) { g.rect(rx, yTop, 2, yBot - yTop, P.rail[0]); g.rect(rx, yTop, 1, yBot - yTop, P.rail[1]); }
  // pit: floor band, buffers (springs), a ladder, a pit lamp
  const pf = G.base.floor;
  g.rect(x0, pf, x1 - x0, 26, P.conc[0]); g.rect(x0, pf, x1 - x0, 1, P.conc[2]);
  for (const bx of [x0 + 38, x0 + 102]) { g.rect(bx - 9, pf - 4, 18, 5, OUT); g.rect(bx - 8, pf - 3, 16, 3, "#C8302E");
    for (let k = 0; k < 5; k++) { const yy = pf - 8 - k * 6; g.line(bx - 6, yy, bx + 6, yy - 3, "#E8C040"); g.line(bx - 6, yy + 1, bx + 6, yy - 2, "#9A7A20"); }
    g.rect(bx - 7, pf - 40, 14, 5, OUT); g.rect(bx - 6, pf - 39, 12, 3, "#3A3A44"); }
  { const bx = x1 - 26; for (let k = 0; k < 3; k++) { const yy = pf - 8 - k * 6; g.line(bx - 4, yy, bx + 4, yy - 3, "#E8C040"); } g.rect(bx - 5, pf - 26, 10, 4, OUT); }
  for (let y = 52; y < pf; y++) { if ((y - 52) % 12 === 0) g.rect(x0 + 8, y, 12, 2, P.rail[2]); }
  g.rect(x0 + 7, 52, 2, pf - 52, P.rail[1]); g.rect(x0 + 19, 52, 2, pf - 52, P.rail[1]);
  g.rect(x0 + 60, 70, 10, 6, OUT); g.rect(x0 + 61, 71, 8, 4, "#FFE8A0"); g.tint(x0 + 30, 76, 70, 60, (X, Y) => Math.max(0, 1 - Math.hypot(X - x0 - 65, (Y - 76) * 0.8) / 50) * 0.35, "#FFE8A0", 3);
  // machine room on the roof (motor, brake drum, the traction sheave the ropes hang from)
  const my0 = G.roof - 100, my1 = G.roof - 24;
  g.rect(x0 - 10, my0, x1 - x0 + 20, my1 - my0, OUT); vgrad(g, x0 - 9, my0 + 1, x1 - x0 + 18, my1 - my0 - 1, ["#5A4A5E", "#6E5C70", "#7E6A80"]);
  for (let y = my0 + 6; y < my1; y += 8) g.rect(x0 - 8, y, x1 - x0 + 16, 1, "#4A3C50");
  box(g, x0 + 20, my1 - 34, 44, 34, "#3E6A5A", OUT, "#5A8A78", "#2A4A40"); g.disc(x0 + 76, my1 - 20, 15, OUT); g.disc(x0 + 76, my1 - 20, 13, "#8A92A6"); g.disc(x0 + 76, my1 - 20, 5, "#3A3A48");
  g.rect(x1 - 30, my0 - 14, 22, 14, OUT); g.rect(x1 - 29, my0 - 13, 20, 12, "#6E5C70"); for (let y = my0 - 11; y < my0 - 2; y += 3) g.rect(x1 - 27, y, 16, 1, "#3A2C40");
}

// ---------------------------------------------------------------- office (F = −300): cool, desks, window, water cooler
function office(g) {
  const F = G.floors[1], B = band(F), x0 = G.in0, x1 = G.sw0;
  // drop ceiling grid
  vgrad(g, x0, B.ceil, x1 - x0, 12, ["#B8C2CE", "#D0D8E2", "#E2E8EE"]); for (let x = x0; x < x1; x += 30) g.rect(x, B.ceil, 1, 12, "#9AA6B4");
  g.rect(x0, B.wallTop - 1, x1 - x0, 1, "#8A96A6");
  // wall: pale blue, soft vertical light bands
  for (let y = B.wallTop; y < B.floorTop; y++) for (let x = x0; x < x1; x++) { const v = (y - B.wallTop) / (B.floorTop - B.wallTop); g.px(x, y, P.office[v < 0.1 ? 3 : v < 0.8 ? 2 : (v - 0.8) / 0.2 > bayer(x, y) ? 1 : 2]); }
  g.rect(x0, B.floorTop - 8, x1 - x0, 8, "#E8ECF0"); g.rect(x0, B.floorTop - 8, x1 - x0, 1, "#FFFFFF"); g.rect(x0, B.floorTop - 1, x1 - x0, 1, "#7A8698");
  window(g, -44, F - 226, 60, F - 108, 2);
  // pinboard with notes + a "PLEASE DON'T TOUCH" note is NOT here — just a calm board and a wall poster
  { const bx = 120, by = F - 220, bw = 70, bh = 46; box(g, bx, by, bw, bh, "#C89A62", OUT, "#E0B880"); for (let i = 0; i < 6; i++) { const nx = bx + 6 + (i % 3) * 21, ny = by + 6 + Math.floor(i / 3) * 19, col = ["#FFE680", "#9AE0F0", "#FFB0C8"][i % 3]; g.rect(nx, ny, 15, 13, col); g.rect(nx, ny + 12, 15, 1, mix(col, "#000000", 0.25)); g.px(nx + 7, ny + 1, "#C8302E"); for (let k = 0; k < 3; k++) g.rect(nx + 3, ny + 4 + k * 3, 9 - (k === 2 ? 4 : 0), 1, "#8A7A70"); } }
  // the wall clock
  { const cx = 330, cy = F - 196, r = 13; g.disc(cx, cy, r + 1, OUT); g.disc(cx, cy, r, "#F4F6F8"); g.ring(cx, cy, r - 1, "#7A8698"); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.px(R(cx + Math.cos(a) * (r - 4)), R(cy + Math.sin(a) * (r - 4)), OUT); } g.line(cx, cy, cx + 5, cy + 3, OUT); g.line(cx, cy, cx - 1, cy - 9, OUT); }
  // thermostat base plate (the dial and the display are dynamic)
  { const { x, y, r } = THERMO_P; g.rrect(x - r - 5, y - r - 5, 2 * r + 11, 2 * r + 11, OUT, 2); g.rrect(x - r - 4, y - r - 4, 2 * r + 9, 2 * r + 9, "#F2EEE6", 2); g.rect(x - r - 3, y + r + 3, 2 * r + 7, 1, "#C8C0B0"); }
  // the ceiling duct + the building computer box (its screen is dynamic)
  { const { x0: dx0, x1: dx1, y0, y1 } = DUCT; g.rect(dx0, y0, dx1 - dx0, y1 - y0, OUT); vgrad(g, dx0, y0 + 1, dx1 - dx0, y1 - y0 - 2, ["#E2E6EC", "#BAC2CE", "#9AA4B2"]); for (let x = dx0 + 20; x < dx1; x += 40) { g.rect(x, y0, 2, y1 - y0, "#7A8494"); g.rect(x + 2, y0 + 1, 1, y1 - y0 - 2, "#F4F6F8"); }
    g.rect(dx0 + 4, y1, 24, 4, OUT); for (let x = dx0 + 5; x < dx0 + 27; x += 2) g.px(x, y1 + 1, "#5A6474");
    const { x, y, w, h } = BOX; g.rect(x + 12, y1, 3, y - y1, "#5A6474"); g.rect(x + w - 15, y1, 3, y - y1, "#5A6474");
    box(g, x, y, w, h, "#C4CAD4", OUT, "#E8ECF2", "#8A94A4"); g.rect(x + 4, y + 4, w - 8, h - 9, OUT); g.rect(x + 5, y + 5, w - 10, h - 11, "#0E2A22");
  }
  // ceiling panels (cool light)
  for (const lx of [20, 160, 296]) ceilLight(g, lx, B.ceil, 20, "#F4FAFF", "#F2FAFF", 130, 0.3);
  // carpet floor band
  for (let y = B.floorTop; y < F + 2; y++) for (let x = x0; x < x1; x++) { const k = (Math.floor((x + (y - B.floorTop) * 0.4) / 8) + Math.floor((y - B.floorTop) / 6)) % 2; g.px(x, y, P.carpet[(y - B.floorTop) < 4 ? 1 : k ? 2 : 3]); }
  g.rect(x0, B.floorTop, x1 - x0, 1, OUT); g.rect(x0, F + 1, x1 - x0, 1, "#8A9AB8");
  // desk B (the worker's desk: monitor with a spreadsheet, the desk phone, his empty chair)
  deskBack(g, DESK_B.x0, DESK_B.x1, F);
  { const mx = DESK_B.x0 + 8, my = F - 112; box(g, mx, my, 40, 30, "#2A2A36", OUT); g.rect(mx + 3, my + 3, 34, 22, "#DDE8F4"); for (let r = 0; r < 5; r++) for (let cc = 0; cc < 4; cc++) g.rect(mx + 4 + cc * 8, my + 4 + r * 4, 7, 3, r === 0 ? "#7AB0E0" : (r + cc) % 3 ? "#F4F8FC" : "#C8E8C8"); g.rect(mx + 17, my + 30, 6, 6, "#3A3A48"); g.rect(mx + 10, my + 36, 20, 3, OUT); }
  g.rect(DESK_B.x0 + 52, F - 79, 14, 4, "#E8E4DC"); g.rect(DESK_B.x0 + 52, F - 79, 14, 1, "#FFFFFF");
  officeChair(g, 232, F, "#3A4A6A");
  // water cooler
  { const wx = 362, base = F; box(g, wx - 12, base - 66, 24, 66, "#E8ECF2", OUT, "#FFFFFF", "#A8B0BE"); g.rect(wx - 6, base - 50, 4, 4, "#3A9AE8"); g.rect(wx + 2, base - 50, 4, 4, "#E84A4A"); g.rect(wx - 8, base - 40, 16, 2, "#7A8494");
    g.rect(wx - 10, base - 102, 20, 36, OUT); vgrad(g, wx - 9, base - 101, 18, 34, ["#E8F8FF", "#A8E0F8", "#70C0EC"]); g.rect(wx - 9, base - 92, 18, 1, "#FFFFFF"); g.rect(wx - 6, base - 99, 2, 24, "#FFFFFF"); g.rect(wx - 4, base - 106, 8, 4, OUT); }
  plant(g, 398, F - 2, 0.9, ["#4A4A5A", "#6A6A7E", "#8A8AA0"]);
}
function deskBack(g, x0, x1, F) {
  const top = F - 72;
  // legs + back of the desk (the top surface and the front panel)
  g.rect(x0 + 3, top + 6, 4, 66, OUT); g.rect(x1 - 7, top + 6, 4, 66, OUT); g.rect(x0 + 4, top + 6, 2, 65, "#7A8494"); g.rect(x1 - 6, top + 6, 2, 65, "#7A8494");
  g.rect(x0, top - 4, x1 - x0, 6, OUT); g.rect(x0 + 1, top - 3, x1 - x0 - 2, 4, "#E8DCC8"); g.rect(x0 + 1, top - 3, x1 - x0 - 2, 1, "#FFF8EC"); g.rect(x0 + 1, top + 1, x1 - x0 - 2, 1, "#A89878");
  g.rect(x0 + 8, top + 2, x1 - x0 - 16, 34, OUT); g.rect(x0 + 9, top + 2, x1 - x0 - 18, 33, "#B8AE9A"); g.rect(x0 + 9, top + 2, x1 - x0 - 18, 2, "#8A8070");
}
function officeChair(g, x, F, col) {
  g.rect(x - 2, F - 30, 4, 20, OUT); g.rect(x - 12, F - 6, 24, 3, OUT); g.disc(x - 11, F - 2, 2, OUT); g.disc(x + 11, F - 2, 2, OUT);
  box(g, x - 16, F - 40, 32, 10, col, OUT, mix(col, "#FFFFFF", 0.3)); box(g, x + 6, F - 86, 10, 48, col, OUT, mix(col, "#FFFFFF", 0.3));
}

// ---------------------------------------------------------------- floor 3: archive / meeting room (warm lavender)
function floor3(g) {
  const F = G.floors[2], B = band(F), x0 = G.in0, x1 = G.sw0;
  vgrad(g, x0, B.ceil, x1 - x0, 12, ["#8E80A4", "#A698BC", "#BCB0D0"]); g.rect(x0, B.wallTop - 1, x1 - x0, 1, "#7A6E92");
  for (let y = B.wallTop; y < B.floorTop; y++) for (let x = x0; x < x1; x++) { const v = (y - B.wallTop) / (B.floorTop - B.wallTop); g.px(x, y, P.arch[v < 0.12 ? 3 : v < 0.8 ? 2 : (v - 0.8) / 0.2 > bayer(x, y) ? 1 : 2]); }
  g.rect(x0, B.floorTop - 7, x1 - x0, 7, "#8A7AA0"); g.rect(x0, B.floorTop - 7, x1 - x0, 1, "#C8BCDA");
  window(g, -44, F - 226, 60, F - 108, 3);
  // archive shelves full of binders and boxes
  for (const [sx0, sx1] of [[88, 200], [296, 404]]) {
    g.rect(sx0, F - 210, sx1 - sx0, 186, OUT); g.rect(sx0 + 2, F - 208, sx1 - sx0 - 4, 182, P.wood[1]);
    for (let s = 0; s < 4; s++) { const sy = F - 208 + s * 46; g.rect(sx0 + 2, sy + 40, sx1 - sx0 - 4, 5, P.wood[3]); g.rect(sx0 + 2, sy + 40, sx1 - sx0 - 4, 1, P.wood[4]);
      let x = sx0 + 5; let i = 0; while (x < sx1 - 10) { const kind = rnd(sx0 + s * 17 + i * 3), bw = kind < 0.7 ? 7 + R(rnd(i + s) * 3) : 22, bh = kind < 0.7 ? 30 + R(rnd(i * 2 + s) * 6) : 22; if (x + bw > sx1 - 5) break;
        const col = kind < 0.7 ? ["#C8443C", "#3A6AB0", "#E8B840", "#3A8A5A", "#8A4AA0", "#E0E0E8"][(i + s) % 6] : "#C8A070";
        g.rect(x, sy + 40 - bh, bw, bh, OUT); g.rect(x + 1, sy + 41 - bh, bw - 2, bh - 1, col); g.rect(x + 1, sy + 41 - bh, 1, bh - 1, mix(col, "#FFFFFF", 0.35));
        if (kind < 0.7) g.rect(x + 2, sy + 46 - bh, bw - 4, 4, "#F4F0E6"); else { g.rect(x + 4, sy + 30, bw - 8, 5, "#F4F0E6"); }
        x += bw + (kind < 0.7 ? 0 : 2); i++; } }
  }
  // meeting table + chairs + whiteboard
  { const tx0 = 214, tx1 = 284, top = F - 66; g.rect(tx0, top, tx1 - tx0, 6, OUT); g.rect(tx0 + 1, top + 1, tx1 - tx0 - 2, 4, P.wood[3]); g.rect(tx0 + 1, top + 1, tx1 - tx0 - 2, 1, P.wood[4]); g.rect(R((tx0 + tx1) / 2) - 3, top + 6, 6, 60, OUT); g.rect(R((tx0 + tx1) / 2) - 2, top + 6, 4, 59, "#6A6A7A");
    officeChair(g, tx0 - 4, F, "#6A4A8A"); g.rect(tx0 + 20, top - 14, 10, 14, OUT); g.rect(tx0 + 21, top - 13, 8, 13, "#F4F0E6"); g.rect(tx0 + 29, top - 10, 3, 6, OUT);
    box(g, 216, F - 214, 66, 44, "#FAFAFC", OUT, "#FFFFFF"); g.line(222, F - 178, 236, F - 192, "#3A6AB0"); g.line(236, F - 192, 248, F - 186, "#3A6AB0"); g.line(248, F - 186, 268, F - 206, "#C8443C"); g.rect(224, F - 208, 20, 2, "#3A3A48"); g.rect(224, F - 203, 14, 1, "#8A8A96"); }
  for (const lx of [0, 160, 300]) ceilLight(g, lx, B.ceil, 14, "#FFF0D8", "#FFF4DC", 120, 0.28);
  for (let y = B.floorTop; y < F + 2; y++) for (let x = x0; x < x1; x++) { const board = Math.floor((y - B.floorTop) / 7), off = (board % 2) * 23, seam = ((x + off) % 46 === 0) || (y - B.floorTop) % 7 === 0; g.px(x, y, seam ? P.parquet[0] : P.parquet[(y - B.floorTop) < 3 ? 1 : (x + board) % 3 ? 2 : 3]); }
  g.rect(x0, B.floorTop, x1 - x0, 1, OUT); g.rect(x0, F + 1, x1 - x0, 1, P.parquet[3]);
}

// ---------------------------------------------------------------- roof
function roof(g) {
  const F = G.roof, x0 = G.in0, x1 = G.x1;
  g.rect(G.x0, F - 40, x1 - G.x0, 14, OUT); g.rect(G.x0 + 1, F - 39, x1 - G.x0 - 2, 12, "#8A7A86"); g.rect(G.x0 + 1, F - 39, x1 - G.x0 - 2, 2, "#C8B4AE");   // back parapet + coping
  for (let y = F - 26; y < F + 2; y++) for (let x = G.x0; x < x1; x++) g.px(x, y, (x * 5 + y * 3) % 17 === 0 ? "#5A5266" : y < F - 20 ? "#3A3446" : "#4A4458");     // tar roof band
  g.rect(G.x0, F - 26, x1 - G.x0, 1, OUT);
  // rooftop AC unit + a vent pipe
  box(g, 110, F - 62, 74, 40, "#B8BCC8", OUT, "#E0E4EC", "#8A90A0"); g.disc(147, F - 42, 13, OUT); g.disc(147, F - 42, 12, "#4A4E5E"); for (let a = 0; a < 6; a++) g.line(147, F - 42, R(147 + Math.cos(a) * 11), R(F - 42 + Math.sin(a) * 11), "#8A90A0");
  g.rect(40, F - 56, 8, 34, OUT); g.rect(41, F - 55, 6, 33, "#9A9AAA"); g.rect(36, F - 60, 16, 5, OUT); g.rect(37, F - 59, 14, 3, "#7A7A8A");
}

// ---------------------------------------------------------------- stairwell (right of the shaft) + the right outer wall
function stairs(g) {
  // the service core right of the shaft: stair doors with EXIT signs and the red fire standpipe (seen in the slices)
  const x0 = G.st0, x1 = G.st1, yTop = G.roof, yBot = G.base.floor + 26;
  for (let y = yTop; y < yBot; y++) for (let x = x0; x < x1; x++) g.px(x, y, (x + y * 3) % 29 === 0 ? P.conc[3] : (y % 40 === 0) ? P.conc[1] : P.conc[2]);
  g.tint(x0, yTop, x1 - x0, yBot - yTop, (X) => Math.max(0, (X - x0) / (x1 - x0) - 0.4) * 0.5, "#120E18", 3);
  for (const F of [...G.floors, G.base.floor]) {
    const dx = x0 + 6, dw = 24, dy = F - 186;
    g.rect(dx - 2, dy - 2, dw + 4, 188, OUT); g.rect(dx - 1, dy - 1, dw + 2, 187, "#8A92A6");
    vgrad(g, dx, dy, dw, 186, ["#C8CEDA", "#A8B0C0", "#8A92A6"]); g.rect(dx + 1, dy + 1, 1, 184, "#E8ECF2");
    g.rect(dx + 6, dy + 24, 12, 20, OUT); g.rect(dx + 7, dy + 25, 10, 18, "#5A7A9A"); g.rect(dx + 8, dy + 26, 3, 6, "#9AC0E0");
    g.rect(dx + 2, dy + 96, dw - 4, 4, OUT); g.rect(dx + 3, dy + 97, dw - 6, 2, "#E8ECF2");
    g.rect(dx - 1, F - 214, 26, 11, OUT); g.rect(dx, F - 213, 24, 9, "#1E8A4A"); g.text(TINY, "EXIT", dx + 4, F - 211, "#E8FFE8");
    g.tint(dx - 6, F - 206, 36, 20, (X, Y) => Math.max(0, 1 - Math.hypot(X - dx - 12, (Y - F + 206) * 1.4) / 18) * 0.35, "#6AF09A", 3);
    // standpipe valve + wheel at each floor
    g.disc(x1 - 7, F - 120, 5, OUT); g.disc(x1 - 7, F - 120, 4, "#C8302E"); g.rect(x1 - 12, F - 121, 10, 2, "#FF7A6A");
  }
  g.rect(x1 - 10, yTop, 7, yBot - yTop, OUT); g.rect(x1 - 9, yTop, 5, yBot - yTop, "#C8302E"); g.rect(x1 - 9, yTop, 1, yBot - yTop, "#FF8A7A"); g.rect(x1 - 5, yTop, 1, yBot - yTop, "#7A1A18");
  section(g, x1, G.roof - 40, G.x1, yBot + 28, { hatch: 5 });
}

// ---------------------------------------------------------------- basement (pipes, the boiler) + foundation + soil
function basement(g) {
  const x0 = G.in0, x1 = G.sw0, c0 = G.base.ceil, f0 = G.base.floor;
  vgrad(g, x0, c0, x1 - x0, 12, ["#2E2A38", "#3A3546", "#46405A"]);
  for (let y = c0 + 12; y < f0; y++) for (let x = x0; x < x1; x++) { const row = Math.floor((y - c0 - 12) / 14), joint = (y - c0 - 12) % 14 === 0 || ((x - x0 + (row % 2) * 18) % 36 === 0); g.px(x, y, joint ? P.conc[0] : P.conc[(x * 3 + y) % 23 === 0 ? 3 : 2]); }
  g.tint(x0, c0 + 12, x1 - x0, f0 - c0 - 12, (X, Y) => 0.15 + 0.35 * ((Y - c0) / (f0 - c0)), "#120E18", 3);
  for (let y = f0; y < f0 + 26; y++) for (let x = x0; x < x1; x++) g.px(x, y, (x + y) % 11 === 0 ? P.conc[0] : P.conc[1]); g.rect(x0, f0, x1 - x0, 1, OUT);
  // pipes along the ceiling, with hangers, flanges and a valve wheel
  for (const [py, col, dk, hi] of [[c0 + 18, "#C87A3A", "#7A3E18", "#F2B07A"], [c0 + 30, "#3A7AB8", "#1E3E6A", "#8AC0F0"], [c0 + 42, "#C8443C", "#6A1E1C", "#F28A80"]]) {
    g.rect(x0, py - 4, x1 - x0, 9, OUT); g.rect(x0, py - 3, x1 - x0, 7, col); g.rect(x0, py - 3, x1 - x0, 2, hi); g.rect(x0, py + 2, x1 - x0, 2, dk);
    for (let x = x0 + 30; x < x1; x += 90) { g.rect(x, py - 5, 5, 11, OUT); g.rect(x + 1, py - 4, 3, 9, dk); g.rect(x + 2, c0 + 12, 1, py - 5 - c0 - 12, "#5A5466"); }
  }
  { const vx = 120, vy = c0 + 30; g.rect(vx, vy - 14, 2, 10, OUT); g.ring(vx + 1, vy - 18, 6, OUT); g.ring(vx + 1, vy - 18, 5, "#C8302E"); g.line(vx - 4, vy - 18, vx + 6, vy - 18, "#C8302E"); }
  // the boiler: a big riveted tank with a gauge and a warm flame window
  { const bx0 = 150, bx1 = 270, by0 = f0 - 118;
    g.rrect(bx0 - 1, by0 - 1, bx1 - bx0 + 2, f0 - by0 + 1, OUT, 2);
    for (let y = by0; y < f0; y++) for (let x = bx0; x < bx1; x++) { const u = (x - bx0) / (bx1 - bx0), v = Math.abs(u - 0.35); g.px(x, y, v > 0.5 ? "#2A4A44" : v > 0.32 ? (v - 0.32) / 0.18 > bayer(x, y) ? "#2A4A44" : "#3A6058" : v > 0.12 ? "#3A6058" : "#4E7A70"); }
    for (let x = bx0 + 6; x < bx1 - 4; x += 10) { g.px(x, by0 + 5, "#8AB0A8"); g.px(x, f0 - 6, "#8AB0A8"); }
    g.rect(bx0, by0 + 40, bx1 - bx0, 2, "#22383A");
    g.disc(bx0 + 30, by0 + 22, 9, OUT); g.disc(bx0 + 30, by0 + 22, 8, "#F4F0E6"); g.line(bx0 + 30, by0 + 22, bx0 + 34, by0 + 17, "#C8302E");
    g.rect(bx0 + 64, by0 + 56, 30, 22, OUT); g.rect(bx0 + 65, by0 + 57, 28, 20, "#3A1408"); for (let i = 0; i < 6; i++) { const fx = bx0 + 68 + i * 4, fh = 8 + (i % 3) * 4; g.rect(fx, by0 + 77 - fh, 3, fh, i % 2 ? "#FF9A3A" : "#FFD25A"); }
    g.tint(bx0 + 50, by0 + 50, 60, 50, (X, Y) => Math.max(0, 1 - Math.hypot(X - bx0 - 79, Y - by0 - 67) / 36) * 0.4, "#FF8A3A", 3);
    g.rect(bx0 + 40, c0 + 46, 8, by0 - c0 - 46, OUT); g.rect(bx0 + 41, c0 + 46, 6, by0 - c0 - 46, "#8A8A96"); g.rect(bx0 + 41, c0 + 46, 2, by0 - c0 - 46, "#C8C8D4"); }
  // electrical panel with a hazard stripe, a water heater, a mop bucket
  { const ex = 12, ey = f0 - 150; box(g, ex, ey, 42, 58, "#8A94A4", OUT, "#B8C0CC"); for (let x = ex + 2; x < ex + 40; x++) g.px(x, ey + 50 + ((x >> 2) & 1), ((x >> 2) & 1) ? "#F4C430" : "#1A1A1A"); g.rect(ex + 6, ey + 8, 30, 3, OUT); g.rect(ex + 6, ey + 16, 30, 3, OUT); g.rect(ex + 6, ey + 24, 30, 3, OUT); g.rect(ex + 33, ey + 30, 3, 8, "#3A3A48"); }
  { const hx = 312; g.rrect(hx, f0 - 96, 40, 96, OUT, 2); vgrad(g, hx + 1, f0 - 95, 38, 94, ["#E8E8F0", "#C8C8D4", "#A8A8B8"]); g.rect(hx + 1, f0 - 95, 6, 94, "#F8F8FF"); g.rect(hx + 16, f0 - 60, 10, 6, "#C8302E"); }
  { const mx = 84; g.poly([[mx, f0 - 26], [mx + 26, f0 - 26], [mx + 23, f0], [mx + 3, f0]], OUT); g.poly([[mx + 1, f0 - 25], [mx + 25, f0 - 25], [mx + 22, f0 - 1], [mx + 4, f0 - 1]], "#E8C040"); g.rect(mx + 18, f0 - 64, 3, 40, P.wood[2]); }
  // lights
  for (const lx of [80, 330]) { g.rect(lx - 6, c0 + 52, 12, 5, OUT); g.rect(lx - 5, c0 + 53, 10, 3, "#FFE8A0"); g.tint(lx - 60, c0 + 58, 120, 140, (X, Y) => Math.max(0, 1 - Math.hypot(X - lx, (Y - c0 - 58) * 0.7) / 70) ** 1.5 * 0.22, "#FFE8A0", 6); }
  // foundation slab (section) + soil to the bottom edge, the left foundation wall
  section(g, G.x0, f0 + 26, G.x1, f0 + 54, { hatch: 5 });
  for (let y = f0 + 54; y < 360; y++) for (let x = G.x0; x < G.x1; x++) { const k = rnd(x * 7 + y * 131); g.px(x, y, k < 0.04 ? P.soil[3] : k < 0.3 ? P.soil[2] : y - f0 - 54 > 30 && k < 0.6 ? P.soil[0] : P.soil[1]); }
  for (let i = 0; i < 28; i++) { const sx = G.x0 + R(rnd(i * 3) * (G.x1 - G.x0)), sy = f0 + 64 + R(rnd(i * 5) * 50), r = 2 + R(rnd(i * 9) * 3); g.disc(sx, sy, r, "#6A5A58"); g.px(sx - 1, sy - 1, "#9A8A80"); }
  section(g, G.x0, 2, G.in0, f0 + 26, { hatch: 5, top: false });
  section(g, G.sw0, 30, G.sh0, f0 + 26, { hatch: 5, top: false }); section(g, G.sh1, 30, G.sw1, f0 + 26, { hatch: 5, top: false });
}

// ---------------------------------------------------------------- front layer: slab sections + side walls of the shaft
function front(g) {
  for (const F of [...G.floors, G.roof]) section(g, G.in0, F + 2, G.st1, F + 30);
  // the shaft side walls seen edge-on (thin sections) between the slabs, and the facade strip's cut edge
  for (const F of [G.floors[0], G.floors[1], G.floors[2]]) { section(g, G.sw0, F - 270, G.sh0, F + 2, { top: false, bottom: false }); section(g, G.sh1, F - 270, G.sw1, F + 2, { top: false, bottom: false }); }
  // floor indicators' bases hang under each slab across the shaft (digits drawn live)
  for (const F of G.floors) { const y = F - 270; g.rect(474, y, 32, 16, OUT); g.rect(475, y, 30, 15, P.brass[1]); g.rect(475, y, 30, 1, P.brass[3]); g.rect(478, y + 3, 24, 10, "#1A0E10"); }
}

// ---------------------------------------------------------------- bake
let BAKED = null;
export function baked() {
  if (BAKED) return BAKED;
  const X0 = G.x0 - 10, X1 = G.x1 + 10, Y0 = G.roof - 120, Y1 = 380;
  const back = new Layer(X0, Y0, X1, Y1), mid = new Layer(X0, Y0, X1, Y1), fr = new Layer(X0, Y0, X1, Y1);
  roof(back.g); floor3(back.g); office(back.g); lobby(back.g); shaft(back.g); stairs(back.g); basement(back.g);
  // MID: desk A's front (the cold colleague sits behind it) + its props
  deskFront(mid.g);
  facade(fr.g); front(fr.g);
  BAKED = { back: back.seal(), mid: mid.seal(), front: fr.seal() };
  return BAKED;
}
function deskFront(g) {
  const F = G.floors[1], { x0, x1 } = DESK_A, top = F - 72;
  g.rect(x0, top - 4, x1 - x0, 7, OUT); g.rect(x0 + 1, top - 3, x1 - x0 - 2, 5, "#E8DCC8"); g.rect(x0 + 1, top - 3, x1 - x0 - 2, 1, "#FFF8EC"); g.rect(x0 + 1, top + 1, x1 - x0 - 2, 1, "#A89878");
  g.rect(x0 + 2, top + 3, x1 - x0 - 4, 69, OUT); vgrad(g, x0 + 3, top + 3, x1 - x0 - 6, 68, ["#D8CCB4", "#C8BCA4", "#B0A48C"]); g.rect(x0 + 3, top + 3, x1 - x0 - 6, 2, "#8A8070");
  g.rect(x1 - 34, top + 14, 26, 14, OUT); g.rect(x1 - 33, top + 15, 24, 12, "#C8BCA4"); g.rect(x1 - 24, top + 20, 6, 2, "#6A6050");      // drawer
  // a tiny space heater glowing under the desk (she is cold)
  { const hx = x0 + 14, hy = F - 2; g.rect(hx, hy - 22, 26, 22, OUT); g.rect(hx + 1, hy - 21, 24, 20, "#E8E4DC"); for (let i = 0; i < 4; i++) g.rect(hx + 4, hy - 18 + i * 4, 18, 2, i % 2 ? "#FF7A3A" : "#FFB040"); g.tint(hx - 10, hy - 34, 46, 34, (X, Y) => Math.max(0, 1 - Math.hypot(X - hx - 13, Y - hy + 11) / 26) * 0.4, "#FF9A50", 3); }
  // on the desk: a monitor (3/4, screen glow), a mug of tea, papers
  { const mx = x0 + 4, my = top - 40; g.poly([[mx, my], [mx + 26, my + 4], [mx + 26, my + 30], [mx, my + 32]], OUT); g.poly([[mx + 2, my + 3], [mx + 24, my + 6], [mx + 24, my + 27], [mx + 2, my + 29]], "#BFE0F8"); g.rect(mx + 4, my + 8, 14, 2, "#7AB0E0"); g.rect(mx + 4, my + 13, 18, 1, "#8AA0B8"); g.rect(mx + 4, my + 17, 12, 1, "#8AA0B8"); g.rect(mx + 10, my + 31, 6, 6, OUT); g.rect(mx + 5, my + 36, 16, 3, OUT); }
  { const mx = x1 - 22, my = top - 14; g.rect(mx, my, 11, 12, OUT); g.rect(mx + 1, my + 1, 9, 10, "#E86A7A"); g.rect(mx + 1, my + 1, 9, 2, "#C84A5A"); g.ring(mx + 12, my + 5, 3, OUT); for (let i = 0; i < 3; i++) g.px(mx + 3 + i * 2, my - 3 - (i % 2) * 2, "#F4F4F8"); }
  g.rect(x0 + 34, top - 5, 22, 2, "#F8F8F2"); g.rect(x0 + 36, top - 7, 20, 2, "#E8E8E2");
}
