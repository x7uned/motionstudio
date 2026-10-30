// pacman-real · topdown (new, 2026-10-29, drawn for this film): the market's crossroads seen straight from above at noon, an
// orthographic map in metres (X east →, Z south ↓) at s px per metre. The main street (north pavement Z 0–4 with the line of
// watermelons, road Z 4–11 with a dashed centre line, south pavement with trees) meets the cross street (road X 0–8). The
// north-west kerb corner at (0, 4) is a SHARP square corner. Zebra crossings, stop lines, painted turn arrows (no words),
// manholes, drain grates, market umbrellas with fruit tables, parked cars, people seen from above, traffic-light poles, short
// noon shadows to the lower right. Ramps + ordered dither; pure functions of (view, t).
import { hex } from "../../../../../renderer/pixel/raster.mjs";
import { R, RG, pk, put, tint, h2, clamp01, BY } from "../lib/cam.mjs";
import { P as MP, FRUIT, MELON } from "./market.mjs";

export const TD = { kerbN: 4, kerbS: 11, xW: 0, xE: 8, paveW: -3.5 };
const P = {
  asph: RG(["#3E3E48", "#4A4A56", "#575764", "#666672", "#787884"]), pave: MP.pave, curb: RG(["#8A888C", "#B0AEB0", "#D2D0CC", "#ECEAE2"]),
  line: RG(["#C8C6BE", "#ECEAE0", "#FFFFF6"]), yel: RG(["#C89A1E", "#E8BE3A", "#FFDA6A"]), iron: MP.iron, shadow: hex("#2A2436"),
  grass: RG(["#3A6A2A", "#4E8A34", "#6AA844", "#8CC45A"]), canopy: RG(["#1E4A22", "#2C6A2C", "#428A38", "#62A848", "#8CC866"]), bark: RG(["#4A2E1C", "#6A4228"]),
  car: [RG(["#6A1A1A", "#9A2A26", "#C84438", "#E87A66"]), RG(["#1E3A6A", "#2C5490", "#4472B4", "#78A0D8"]), RG(["#C8C4BC", "#E0DCD2", "#F4F0E8", "#FFFFFF"]), RG(["#2E5A3A", "#3E7A4E", "#5A9A66", "#8AC292"])],
  glass: RG(["#1A2232", "#2A3448", "#3E4C66", "#6A80A0"]), wood: MP.wood, cloth: RG(["#E8E2D2", "#F6F2E6", "#FFFFFF"]),
};
const UMB = [["#C84A3C", "#F4EAD8"], ["#3C6EB4", "#F2F0E6"], ["#E0A030", "#FBF2DC"], ["#3E8A5A", "#F2EEDC"]].map(([a, b]) => [hex(a), hex(b)]);

/** view: { cx, cz (world point at screen 270, 480), s } */
export const vx = (v, X) => 270 + (X - v.cx) * v.s, vy = (v, Z) => 480 + (Z - v.cz) * v.s;
function groundTD(X, Z, x, y) {
  const inMainRoad = Z >= TD.kerbN && Z <= TD.kerbS, inCrossRoad = X >= TD.xW && X <= TD.xE;
  if (inMainRoad || inCrossRoad) {
    // kerb shadow on the road edge, zebra crossings, stop lines, centre lines, arrows, manholes
    const n = h2(R(X * 30), R(Z * 30), 4), n2 = h2(Math.floor(X * 2), Math.floor(Z * 2), 5); let v = 0.42 + 0.16 * (n - 0.5) + 0.08 * (n2 - 0.5);
    if (inCrossRoad && Z < TD.kerbN - 0.6 && Z > 1.2 && Z < 3.3 && ((X - TD.xW) % 0.9) < 0.5) return pk(P.line, 0.7 + 0.25 * n, x, y);               // zebra across the cross street
    if (inMainRoad && X > -2.7 && X < -0.6 && ((Z - TD.kerbN) % 0.9) < 0.5 && X < TD.xW) return pk(P.line, 0.7 + 0.25 * n, x, y);                    // zebra across the main road
    if (inCrossRoad && Z < 1.0 && Z > 0.8 && X > 4.1) return pk(P.line, 0.8, x, y);                                                                 // stop line
    if (inMainRoad && X < TD.xW && Math.abs(Z - 7.5) < 0.07 && (((X % 3) + 3) % 3) < 1.6) return pk(P.line, 0.75 + 0.2 * n, x, y);                    // main centre line
    if (inCrossRoad && Z < TD.kerbN && Math.abs(X - 4) < 0.07 && (((Z % 3) + 3) % 3) < 1.6) return pk(P.line, 0.75 + 0.2 * n, x, y);                  // cross centre line
    if (inCrossRoad && Z < -0.6 && Math.abs(X - 2) < 0.12 && Z > -2.3) return pk(P.line, 0.7, x, y);                                                // arrow shaft (north lane)
    { const ax = X - 2, az = Z + 2.9; if (inCrossRoad && az > 0 && az < 0.6 && Math.abs(ax) < az * 0.6) return pk(P.line, 0.7, x, y); }            // arrow head pointing north
    { const q = Math.hypot(X - 6.2, Z - 8.6); if (q < 0.42) return pk(P.iron, q > 0.36 ? 0.1 : 0.45 + 0.3 * ((Math.floor(X * 8) + Math.floor(Z * 8)) % 2 ? 1 : 0), x, y); }
    // shadow under the kerb (a dark line just off the kerb)
    const dk = Math.min(inMainRoad && X < TD.xW ? Math.min(Z - TD.kerbN, TD.kerbS - Z) : 9, inCrossRoad && Z < TD.kerbN ? Math.min(X - TD.xW, TD.xE - X) : 9, inMainRoad && X > TD.xE ? Math.min(Z - TD.kerbN, TD.kerbS - Z) : 9, inCrossRoad && Z > TD.kerbS ? Math.min(X - TD.xW, TD.xE - X) : 9);
    if (dk < 0.12) v -= 0.25; else if (dk < 0.5 && ((X * 1.7 + Z * 1.3) % 1.2) < 0.08) v -= 0.12;
    return pk(P.asph, v, x, y);
  }
  // pavements: kerb band (0.22 m) along road edges, then slabs
  const dRoad = Math.min(Z < TD.kerbN ? TD.kerbN - Z : 9, Z > TD.kerbS ? Z - TD.kerbS : 9, X < TD.xW ? TD.xW - X : 9, X > TD.xE ? X - TD.xE : 9);
  if (dRoad < 0.24) return pk(P.curb, dRoad < 0.06 ? 0.95 : 0.65 + 0.15 * h2(R(X * 4), R(Z * 4), 3), x, y);
  const row = Math.floor(Z / 0.5), sx = (X + (row % 2) * 0.25) / 0.5, jx = sx - Math.floor(sx), jz = Z / 0.5 - row;
  if (jx < 0.06 || jz < 0.06) return MP.paveJ;
  return pk(P.pave, 0.62 + 0.14 * (h2(Math.floor(sx), row, 2) - 0.5) + 0.05 * (h2(R(X * 40), R(Z * 40), 9) - 0.5), x, y);
}
/** shadow tint helper: a world ellipse at (X, Z) radii (rx, rz) offset by the noon sun (to the lower right) */
function shadowEll(c, v, X, Z, rx, rz, k = 0.45) {
  const cx = vx(v, X + 0.12), cy = vy(v, Z + 0.16), ax = rx * v.s, az = rz * v.s;
  for (let j = -Math.ceil(az); j <= Math.ceil(az); j++) for (let i = -Math.ceil(ax); i <= Math.ceil(ax); i++) { if ((i * i) / (ax * ax) + (j * j) / (az * az) > 1) continue; tint(c, R(cx + i), R(cy + j), P.shadow, k, 3); }
}
/** a market umbrella from above: 8 alternating panels, ribs, the finial, its shadow, a table with fruit under it */
function umbrella(c, v, X, Z, rad, ci) {
  const [A, B] = UMB[ci % UMB.length]; shadowEll(c, v, X + 0.25, Z + 0.3, rad, rad, 0.5);
  const cx = vx(v, X), cy = vy(v, Z), r = rad * v.s;
  for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) {
    const q = Math.hypot(i, j) / r; if (q > 1) continue; const an = Math.atan2(j, i), seg = Math.floor(((an + Math.PI) / (Math.PI * 2)) * 8), local = (((an + Math.PI) / (Math.PI * 2)) * 8) % 1;
    const base = seg % 2 ? B : A, lit = 1 - 0.18 * q - 0.22 * Math.abs(local - 0.5) * 2 * q - (i + j) / r * 0.08, x = R(cx + i), y = R(cy + j);
    put(c, x, y, q > 0.93 ? [base[0] * 0.6, base[1] * 0.6, base[2] * 0.6] : [Math.min(255, base[0] * lit), Math.min(255, base[1] * lit), Math.min(255, base[2] * lit)]);
  }
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= 4) put(c, R(cx + i), R(cy + j), i + j < 0 ? [240, 240, 230] : [150, 140, 120]);
}
/** a parked car from above (length along X), body ramp ci, centre (X, Z) */
function carTop(c, v, X, Z, ci, along = "x") {
  const L = 4.0, Wd = 1.8, body = P.car[ci % P.car.length]; shadowEll(c, v, X + 0.15, Z + 0.2, (along === "x" ? L : Wd) / 2 + 0.05, (along === "x" ? Wd : L) / 2 + 0.05, 0.55);
  const hx = (along === "x" ? L : Wd) / 2, hz = (along === "x" ? Wd : L) / 2, x0 = vx(v, X - hx), x1 = vx(v, X + hx), y0 = vy(v, Z - hz), y1 = vy(v, Z + hz);
  for (let y = R(y0); y < R(y1); y++) for (let x = R(x0); x < R(x1); x++) {
    const u = (x - x0) / (x1 - x0), w = (y - y0) / (y1 - y0), a = along === "x" ? u : w, b = along === "x" ? w : u; // a: nose→tail, b: side→side
    const cr = 0.12, inC = (a < cr && b < cr && Math.hypot((a - cr) / cr, (b - cr) / cr) > 1) || (a < cr && b > 1 - cr && Math.hypot((a - cr) / cr, (b - 1 + cr) / cr) > 1) || (a > 1 - cr && b < cr && Math.hypot((a - 1 + cr) / cr, (b - cr) / cr) > 1) || (a > 1 - cr && b > 1 - cr && Math.hypot((a - 1 + cr) / cr, (b - 1 + cr) / cr) > 1);
    if (inC) continue;
    const edge = a < 0.03 || a > 0.97 || b < 0.05 || b > 0.95; let col;
    if (edge) col = body[0];
    else if (a > 0.22 && a < 0.36 && b > 0.12 && b < 0.88) col = pk(P.glass, 0.5 + 0.3 * (1 - b), x, y);                 // windscreen
    else if (a > 0.72 && a < 0.82 && b > 0.14 && b < 0.86) col = pk(P.glass, 0.35, x, y);                                // rear window
    else if (a >= 0.36 && a <= 0.72 && b > 0.14 && b < 0.86) col = pk(body, 0.78 - 0.2 * Math.abs(b - 0.5), x, y);        // roof
    else col = pk(body, 0.55 + 0.25 * (1 - Math.abs(b - 0.5) * 2) - (a < 0.1 || a > 0.9 ? 0.1 : 0), x, y);
    put(c, x, y, col);
  }
}
/** a person seen from above: shoulders ellipse (shirt) + head (hair), arms swinging a little */
function personTop(c, v, X, Z, ang, shirt, hair, t, walk = 0) {
  shadowEll(c, v, X + 0.08, Z + 0.1, 0.24, 0.16, 0.45);
  const s = v.s, ca = Math.cos(ang), sa = Math.sin(ang), cx = vx(v, X), cy = vy(v, Z), sw = Math.sin(t * 6) * 0.08 * walk;
  const pt = (u, w) => [cx + (u * ca - w * sa) * s, cy + (u * sa + w * ca) * s];
  const S = RG(shirt), Hh = RG(hair);
  for (let j = -R(0.26 * s); j <= R(0.26 * s); j++) for (let i = -R(0.26 * s); i <= R(0.26 * s); i++) {
    const u = (i * ca + j * sa) / s, w = (-i * sa + j * ca) / s, q = (u * u) / (0.11 * 0.11) + (w * w) / (0.23 * 0.23); if (q > 1) continue;
    put(c, R(cx + i), R(cy + j), pk(S, 0.75 - 0.3 * q - u * 1.2, R(cx + i), R(cy + j)));
  }
  for (const side of [-1, 1]) { const [hx, hy] = pt(0.05 + side * sw, side * 0.25); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(c, R(hx + i), R(hy + j), [222, 172, 132]); }
  const [hx, hy] = pt(0.02, 0), hr = 0.1 * s;
  for (let j = -Math.ceil(hr); j <= Math.ceil(hr); j++) for (let i = -Math.ceil(hr); i <= Math.ceil(hr); i++) { const q = Math.hypot(i, j) / hr; if (q > 1) continue; put(c, R(hx + i), R(hy + j), pk(Hh, 0.7 - 0.4 * q - (i + j) / hr * 0.15, R(hx + i), R(hy + j))); }
}
function tree(c, v, X, Z, rad, seed) {
  shadowEll(c, v, X + 0.4, Z + 0.5, rad, rad * 0.95, 0.55);
  const cx = vx(v, X), cy = vy(v, Z), r = rad * v.s;
  for (let j = -Math.ceil(r) - 2; j <= Math.ceil(r) + 2; j++) for (let i = -Math.ceil(r) - 2; i <= Math.ceil(r) + 2; i++) {
    const an = Math.atan2(j, i), rr = r * (0.9 + 0.1 * Math.sin(an * 7 + seed)), q = Math.hypot(i, j) / rr; if (q > 1) continue;
    const blob = h2(R((cx + i) / 3), R((cy + j) / 3), seed), x = R(cx + i), y = R(cy + j);
    put(c, x, y, pk(P.canopy, 0.78 - 0.45 * q - (i + j) / r * 0.22 + (blob - 0.5) * 0.3, x, y));
  }
}
function watermelonTop(c, v, X, Z, a = 1) {
  const cx = vx(v, X), cy = vy(v, Z), r = 0.14 * v.s;
  for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r * 1.15); i <= Math.ceil(r * 1.15); i++) {
    const q = (i * i) / (r * r * 1.3) + (j * j) / (r * r); if (q > 1) continue; const x = R(cx + i), y = R(cy + j); if (a < 1 && a <= BY[(y & 3) * 4 + (x & 3)]) continue;
    const st = Math.sin((j / r) * 5.5 + Math.sin(i / r * 3) * 0.6) > 0.3; put(c, x, y, st ? MELON.stripe[1] : pk(MELON.rind, 0.75 - 0.35 * q - (i + j) / r * 0.15, x, y));
  }
}
/** the whole crossroads; o.eaten(X) → true if the watermelon at X is gone; o.people(t) handled inside */
export function drawCross(c, v, t, o = {}) {
  for (let y = 0; y < c.h; y++) { const Z = v.cz + (y + 0.5 - 480) / v.s; for (let x = 0; x < c.w; x++) { const X = v.cx + (x + 0.5 - 270) / v.s; put(c, x, y, groundTD(X, Z, x, y)); } }
  // the line of watermelons on the north pavement (Z 2.2), one per metre
  for (let X = Math.floor(v.cx - 6); X < v.cx + 6; X++) { if (X > TD.xW - 0.6 && X < TD.xE + 0.6) continue; if (o.eaten && o.eaten(X)) continue; shadowEll(c, v, X + 0.03, 2.2 + 0.04, 0.16, 0.13, 0.4); watermelonTop(c, v, X, 2.2); }
  // planters with grass and the trees on the south pavement; a bench
  for (const [X, Z, r, s] of [[-2.3, 12.9, 1.5, 3], [3.6, 13.3, 1.7, 5], [10.2, 12.9, 1.5, 7]]) tree(c, v, X, Z, r, s);
  // traffic-light poles at the corners (round tops, short shadows)
  for (const [X, Z] of [[-0.45, 3.55], [8.45, 3.55], [-0.45, 11.45], [8.45, 11.45]]) { shadowEll(c, v, X + 0.35, Z + 0.4, 0.12, 0.45, 0.5); const cx = vx(v, X), cy = vy(v, Z); for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j <= 16) put(c, R(cx + i), R(cy + j), i + j < -1 ? [120, 120, 130] : [44, 42, 52]); }
  // parked cars along the south kerb and on the cross street's east side
  carTop(c, v, -2.6, 10.0, 0, "x"); carTop(c, v, 7.0, -3.2, 2, "z"); carTop(c, v, 7.0, -8.0, 1, "z"); carTop(c, v, 7.0, -13.2, 3, "z"); carTop(c, v, 7.0, -18.0, 0, "z");
  // market umbrellas with fruit tables on the west pavement and north pavement
  for (const [X, Z, r, ci] of [[-2.0, 0.3, 1.25, 0], [-2.0, -3.0, 1.25, 1], [-5.3, 0.4, 1.25, 2], [10.6, 0.6, 1.25, 3], [10.6, -2.6, 1.25, 0], [-2.0, -6.4, 1.25, 2], [-2.0, -9.8, 1.25, 3], [-2.0, -13.2, 1.25, 0], [-2.0, -16.6, 1.25, 1]]) umbrella(c, v, X, Z, r, ci);
  // people (walking slowly along the pavements, seen from above)
  const ppl = [[-1.2, 2.9, 0, ["#2E5A9A", "#4A7AC0", "#7AA6E0"], ["#2A1E18", "#4A3424", "#6A4A30"], 0.35], [-2.9, 1.7, Math.PI / 2, ["#C84A3A", "#E87A5E", "#FFAA8A"], ["#141016", "#2E262C", "#544850"], 0.25], [-1.0, -1.6, Math.PI, ["#E8D25A", "#F6E68A", "#FFF6C0"], ["#7A4A20", "#A86A30", "#D8964A"], 0.3], [9.6, 2.7, 0, ["#5A9A5A", "#7ABA74", "#A6DA9A"], ["#141016", "#2E262C", "#544850"], 0.3], [1.2, 12.3, 0, ["#9A5AA0", "#BA7AC0", "#DCA6E0"], ["#5A5660", "#A09CA6", "#E2DEE4"], 0.25], [-0.9, -5.0, -Math.PI / 2, ["#2E8A8A", "#4AAAA6", "#7ACAC4"], ["#141016", "#2E262C", "#544850"], 0.3], [-3.0, -8.1, Math.PI / 2, ["#D86A3A", "#F08A5A", "#FFB48A"], ["#6A4A1C", "#94702E", "#BC9646"], 0.25], [-1.0, -11.8, -Math.PI / 2, ["#F2F0E6", "#FFFFFF", "#FFFFFF"], ["#2A1E18", "#4A3424", "#6A4A30"], 0.3], [-2.9, -15.0, Math.PI / 2, ["#3C6EB4", "#5A8AD0", "#8AB0E8"], ["#7A4A20", "#A86A30", "#D8964A"], 0.3]];
  for (const [X, Z, ang, sh, hr, sp] of ppl) { const dx = Math.cos(ang) * sp * (t - 50) * 10, dz = Math.sin(ang) * sp * (t - 50) * 10; personTop(c, v, X + dx * 0.1, Z + dz * 0.1, ang, sh, hr, t, 1); }
}
export { watermelonTop, umbrella, carTop, personTop, tree };
