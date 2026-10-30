// «Why do cats love boxes?» — the fancy new cat bed: a round plush bed with a raised, rolled "donut" rim (shaggy
// lavender faux fur), a soft cream sherpa cushion inside the ring, a gold satin ribbon tied in a bow, a price tag
// dangling on a string, and "brand new" twinkles. Side view seen a little from above (actors' plane), in two halves:
//   "back"  — floor shadow, the plush body (side wall), the back half of the rim, the cushion;
//   "front" — the front half of the rim (its top contour hides the sitting cat's paws), ribbon, bow, tag, twinkles.
// The rim is a union of fluffy discs along an ellipse; both halves are shaded as rounded volumes that meet without a
// seam at the sides (extended arcs for the distance fields, exact arcs for what each half paints).
import { R, TAU, clamp01, lerp, rnd, view, volume, ellP, contact, twinkle, zDetail, fade, bayer } from "./props-kit.mjs";

export const BED = { w: 96, h: 30, K: 0.36, Rm: 39, rb: 8.5, yc: 21.5, Rbody: 44, hBody: 13.5, cushR: 32, seat: 12 };
BED.seatWy = -BED.seat;                                        // the cat's floor point when it sits/lies in the bed
BED.rimWy = -BED.yc + BED.Rm * BED.K - BED.rb;                 // −16: world wy of the front rim's top at the centre

const PLUSH = ["#2A1A3A", "#47305E", "#664A84", "#8566A6", "#A386C2", "#BFA6D8", "#D8C6EA", "#EEE4F8"];
const CUSH = ["#3C2E2A", "#6C5A50", "#9C887A", "#C2AE9C", "#DCCCB8", "#EDE2D0", "#F7F1E6", "#FFFFFF"];
const RIBBON = ["#3A2204", "#6A4208", "#A06A10", "#D0961C", "#EEBB36", "#F8D666", "#FFEDA6", "#FFF8DC"];
const OUT = "#22142E", ROUT = "#3A2204", CARD = ["#5A4A3E", "#CFC4B0", "#EFE8D8", "#FFFBF0"], STRING = "#EDE4D0", PRICE = "#C8344A";

const hashI = (n) => { let h = Math.imul(n | 0, 374761393); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
const hash = (n) => hashI(n) & 255;
/** Screen y of the front rim's top at the centre (cat pixels above it show). */
export function bedRim(G, wx) { return G.Y(BED.rimWy); }

let MBUF = new Uint8Array(0);
function rasterMask(polys, x0, y0, W, H) {
  if (MBUF.length < W * H) MBUF = new Uint8Array(W * H * 2);
  const m = MBUF; m.fill(0, 0, W * H);
  for (const poly of polys) {
    let py0 = Infinity, py1 = -Infinity; for (const p of poly) { if (p[1] < py0) py0 = p[1]; if (p[1] > py1) py1 = p[1]; }
    for (let y = Math.max(0, Math.floor(py0) - y0); y < Math.min(H, Math.ceil(py1) - y0 + 1); y++) {
      const yc = y0 + y + 0.5, xs = [];
      for (let i = 0; i < poly.length; i++) { const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
      if (xs.length < 2) continue; xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k]) - x0); x < Math.min(W, Math.round(xs[k + 1]) - x0); x++) m[y * W + x] = 1;
    }
  }
  return (X, Y) => { const x = X - x0, y = Y - y0; return x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1; };
}

/**
 * drawBed(g, G, wx, part, o) — part "back" | "front"; wx = bed centre on the floor (wy = 0).
 * o = { alpha = 1, tag = 1 (0..1 price tag dissolves in), shine = 0 (0..1 "brand new" twinkles), t (s: twinkle phase,
 *       tag sway), light | st (optional room light) }.
 * Returns { seat: [x, y] screen point of (wx, BED.seatWy) — draw the cat there between back and front; rim: screen y of
 * the front rim top; knot: [x, y] bow knot; tag: [x, y] tag centre (null when hidden); bbox }.
 */
export function drawBed(c, G, wx, part, o = {}) {
  const g = view(c, o, wx, -20), z = G.z, t = o.t ?? 0, { Rm, rb, yc, K, Rbody, hBody, cushR } = BED;
  const cx = G.X(wx), cy = G.Y(-yc), rx = Rm * z, ry = Rm * K * z, r0 = rb * z;
  const res = { seat: [cx, G.Y(BED.seatWy)], rim: G.Y(BED.rimWy), knot: null, tag: null, bbox: [R(cx - 50 * z), R(G.Y(-yc - Rm * K - rb - 2)), R(cx + 50 * z), R(G.Y(Rbody * K + 2))] };
  if (res.bbox[2] < -10 || res.bbox[0] > (c.w ?? 540) + 10 || res.bbox[1] > (c.h ?? 960) + 10 || res.bbox[3] < -10) return res;
  const arcPt = (f) => [cx + Math.cos(f) * rx, cy + Math.sin(f) * ry];
  const rad = (f) => r0 * (1 + 0.06 * Math.sin(f * 13 + 0.7) + 0.04 * Math.sin(f * 29 + 2.1));
  const discs = (f0, f1) => {
    const n = Math.max(14, Math.ceil(Math.abs(f1 - f0) * (rx + ry) / Math.max(1.6, r0 * 0.5))), out = [];
    for (let i = 0; i <= n; i++) { const f = f0 + ((f1 - f0) * i) / n, [x, y] = arcPt(f), r = rad(f), m = Math.max(14, Math.min(26, Math.ceil(r * 1.2))); out.push(ellP(x, y, r, r, m).map(([px, py], k) => { const a = (k / m) * TAU, b = 1 + 0.05 * Math.sin(a * 7 + f * 9); return [x + (px - x) * b, y + (py - y) * b]; })); }
    return out;
  };
  const lx = (X) => (X + 0.5 - cx) / z, ly = (Y) => (Y + 0.5 - cy) / z;     // bed-local units (origin: rim centre line)
  const furD = zDetail(z, 1.2, 2.1);
  const fur = (X, Y, P, k) => {                                            // shaggy tufts: irregular little crescents
    if (furD <= 0) return;
    const u = lx(X), v = ly(Y), row = Math.floor(v / 2.9), off = hash(row * 7 + 3) * 0.0141, uu = (u + off) / 3.6, col = Math.floor(uu), h = hashI(col * 31 + row * 17);
    if ((h & 255) < 46) return;
    const fu = (uu - col) * 3.6 - 1.8 - (((h >>> 8) & 255) / 255 - 0.5) * 1.2, fv = (v / 2.9 - row) * 2.9 - 1.3 - (((h >>> 16) & 255) / 255 - 0.5) * 0.9;
    const s = 0.8 + ((h >>> 24) & 255) / 510, d = Math.hypot(fu / 1.25, fv) / s;
    if (d > 0.82 && d < 1.22 && fv > -0.1 && furD > bayer(X, Y) * 0.9) P.dv -= 0.7 * k;
    else if (d < 0.62 && fv < 0.25 && furD * 0.75 > bayer(X + 2, Y + 1)) P.dv += 0.42 * k;
  };
  const ribX = 15, ribW = 2.5, ribShift = (v) => -0.1 * v;                // ribbon: a vertical band at x ≈ 15 over rim and body
  const ribbonPaint = (X, Y, P, vv) => {
    const u = lx(X) - ribX - ribShift(vv);
    if (Math.abs(u) < ribW) { P.ramp = RIBBON; P.dv = Math.abs(u) < 0.7 ? 0.8 : Math.abs(u) > ribW - 0.7 ? -0.5 : 0.15; return true; }
    if (Math.abs(u) < ribW + 0.7) { P.dv -= 0.9; return true; }          // the ribbon presses into the plush
    return false;
  };
  const x0 = Math.floor(cx - rx - r0 * 1.3) - 2, y0 = Math.floor(cy - ry - r0 * 1.3) - 2, W = Math.ceil(2 * (rx + r0 * 1.3)) + 5, H = Math.ceil(2 * (ry + r0 * 1.3)) + 5;
  const exactFront = rasterMask(discs(0, Math.PI), x0, y0, W, H);

  if (part === "back") {
    contact(fade(c, o.alpha ?? 1), cx + 3 * z, G.Y(Rbody * K * 0.55), (Rbody + 6) * z, (Rbody * K + 3) * z, 0.4, "#1A0E14");
    // plush body: a squat cylinder under the rim (its top hides under the rim and the cushion)
    const bry = Rbody * K * z, btop = G.Y(-hBody), bbot = G.Y(0), brx = Rbody * z;
    const body = [...ellP(cx, btop, brx, bry, 0, Math.PI, TAU), ...ellP(cx, bbot, brx, bry, 0, 0, Math.PI)];
    volume(g, [body], { ramp: PLUSH, outline: OUT, base: 2.7, gain: 1.6, slope: 1.2, thick: 7 * z, light: [-0.6, -0.8], rimLit: 0.7, rimShade: 0.8,
      paint: (X, Y, P, k) => { const u = lx(X) / Rbody; P.dv = -0.6 * u - 0.35 * u * u; if (ribbonPaint(X, Y, P, ly(Y))) return; fur(X, Y, P, k); } });
    // back half of the rim
    volume(g, discs(Math.PI - 0.55, TAU + 0.55), { ramp: PLUSH, outline: OUT, base: 3.0, gain: 2.3, slope: 0.9, thick: 7 * z, light: [-0.6, -0.8], rimLit: 0.8, rimShade: 0.8,
      only: (X, Y) => !exactFront(X, Y), paint: (X, Y, P, k) => { P.dv = -0.25; fur(X, Y, P, k); } });
    // cushion: a cream sherpa dome inside the ring, with a soft button dimple
    const ccy = G.Y(-hBody - 2.2), crx = cushR * z, cry = cushR * K * z + 2.4 * z;
    volume(g, [ellP(cx, ccy, crx, cry, 0)], { ramp: CUSH, outline: "#5A4640", base: 3.6, gain: 2.2, slope: 1.3, thick: 8 * z, light: [-0.6, -0.8], rimLit: 0.5, rimShade: 1.0,
      paint: (X, Y, P) => {
        const u = (X + 0.5 - cx) / z, v = (Y + 0.5 - ccy) / z, dd = Math.hypot(u / 3.2, v / 1.4);
        if (dd < 1) { P.dv = dd < 0.45 ? -1.2 : -0.5; return; }
        if (furD > 0) { const cu = Math.floor(u / 2.3), cv = Math.floor(v / 1.9), fu = u / 2.3 - cu - 0.5, fv = v / 1.9 - cv - 0.5, q = fu * fu + fv * fv + rnd(cu * 13 + cv * 7) * 0.06; if (q < 0.06 && furD > bayer(X, Y)) P.dv += 0.55; else if (q > 0.19 && q < 0.24 && furD > bayer(X, Y)) P.dv -= 0.5; }
      } });
    return res;
  }

  // ---------------------------------------------------------------- front: the front half of the rim + ribbon
  volume(g, discs(-0.55, Math.PI + 0.55), { ramp: PLUSH, outline: OUT, base: 3.3, gain: 2.3, slope: 1.1, thick: 7 * z, light: [-0.6, -0.8], rimLit: 0.9, rimShade: 0.8,
    only: exactFront, paint: (X, Y, P, k) => { if (ribbonPaint(X, Y, P, ly(Y))) return; fur(X, Y, P, k); } });
  // bow on top of the front rim
  const frontC = Math.sqrt(clamp01(1 - (ribX / Rm) ** 2)) * Rm * K, kTopV = frontC - rb + 0.6;
  const knot = [cx + (ribX + ribShift(kTopV)) * z, cy + kTopV * z]; res.knot = knot;
  const rotE = (c0, rxe, rye, ang) => ellP(c0[0], c0[1], rxe, rye, 0).map(([px, py]) => { const dx = px - c0[0], dy = py - c0[1], ca = Math.cos(ang), sa = Math.sin(ang); return [c0[0] + dx * ca - dy * sa, c0[1] + dx * sa + dy * ca]; });
  const loop = (ang, len) => rotE([knot[0] + Math.cos(ang) * len * 0.55 * z, knot[1] + Math.sin(ang) * len * 0.55 * z], len * 0.55 * z, 2.6 * z, ang);
  const tail = (ang, len) => { const a = knot, b = [knot[0] + Math.cos(ang) * len * z, knot[1] + Math.sin(ang) * len * z], nx = -Math.sin(ang) * 1.25 * z, ny = Math.cos(ang) * 1.25 * z; return [[a[0] + nx, a[1] + ny], [b[0] + nx * 1.4, b[1] + ny * 1.4], [b[0] + Math.cos(ang) * 1.2 * z, b[1] + Math.sin(ang) * 1.2 * z + 0.9 * z], [b[0] - nx * 1.4, b[1] - ny * 1.4], [a[0] - nx, a[1] - ny]]; };
  volume(g, [tail(Math.PI * 0.64, 7.5), tail(Math.PI * 0.34, 7)], { ramp: RIBBON, outline: ROUT, base: 3.6, gain: 1.4, slope: 0.6, thick: 2 * z });
  volume(g, [loop(Math.PI + 0.45, 9.5), loop(-0.4, 9.0)], { ramp: RIBBON, outline: ROUT, base: 3.4, gain: 2.2, slope: 1.0, thick: 2.6 * z, rimLit: 1.2,
    paint: (X, Y, P) => { const d = Math.hypot((X + 0.5 - knot[0]) / z, (Y + 0.5 - knot[1]) / z); if (d < 3.4 && d > 2.3) P.dv = -1.1; } });
  volume(g, [ellP(knot[0], knot[1], 2.3 * z, 2.0 * z, 0)], { ramp: RIBBON, outline: ROUT, base: 4, gain: 1.6, slope: 0.8, thick: 1.5 * z });

  // the price tag on its string, swinging a little
  const ta = clamp01(o.tag ?? 1);
  if (ta > 0) {
    const gt = ta < 1 ? fade(g, ta) : g, sw = 0.2 * Math.sin(t * 2.1) + 0.07 * Math.sin(t * 3.7 + 1), len = 8.5;
    const hole = [knot[0] + Math.sin(0.4 + sw) * len * z, knot[1] + Math.cos(0.4 + sw) * len * z];
    const n = Math.max(6, R(len * z * 1.2));
    for (let i = 0; i <= n; i++) { const k = i / n, sag = Math.sin(Math.PI * k) * 0.9 * z; gt.px(R(lerp(knot[0], hole[0], k) - sag * 0.4), R(lerp(knot[1], hole[1], k) + sag), STRING); }
    const ang = 0.4 + sw * 1.3, ca = Math.cos(ang), sa = Math.sin(ang), Tw = 7.4, Th = 11.5;
    const toS = (u, v) => [hole[0] + (u * ca - v * sa) * z, hole[1] + (u * sa + v * ca) * z];
    volume(gt, [[toS(-1.7, -0.7), toS(1.7, -0.7), toS(Tw / 2, 2.1), toS(Tw / 2, Th), toS(-Tw / 2, Th), toS(-Tw / 2, 2.1)]], { ramp: CARD, outline: CARD[0], base: 2.4, gain: 0.8, slope: 0.6, thick: 2 * z, rimLit: 0.5, rimShade: 0.4,
      paint: (X, Y, P) => {
        const dx = (X + 0.5 - hole[0]) / z, dy = (Y + 0.5 - hole[1]) / z, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        if (Math.hypot(u, v - 0.9) < 0.75) { P.col = CARD[0]; return; }
        if (dollar(u, v - 6.9)) P.col = PRICE;
      } });
    res.tag = toS(0, Th * 0.55);
  }
  // "brand new" twinkles
  const sh = clamp01(o.shine ?? 0);
  if (sh > 0) {
    const gs = sh < 1 ? fade(g, sh) : g;
    for (const [sx, sy, ph] of [[-27, -24, 0], [7, -27, 1.9], [36, -12, 3.7], [-40, 2, 5.1], [25, 9, 2.6]]) {
      const b = Math.pow(Math.max(0, Math.sin(t * 2.6 + ph)), 3); if (b < 0.08) continue;
      twinkle(gs, cx + sx * z, G.Y(sy - 4), Math.max(1, (1 + 2.6 * b) * Math.min(1.6, z * 0.6)), "#FFFFFF", b > 0.5 ? "#FFF2B8" : "#E0CDF8");
    }
  }
  return res;
}

/** A "$" sign in glyph units (≈ 3 wide, 7 tall), centred at 0,0: S-curve from two arcs + a vertical bar. */
function dollar(x, y) {
  if (Math.abs(x) < 0.42 && Math.abs(y) < 3.6) return true;
  const ring = (cy) => Math.abs(Math.hypot(x / 1.35, (y - cy) / 1.25) - 1) < 0.36;
  if (y < 0 && ring(-1.25) && !(x > 0.3 && y > -1.25)) return true;            // upper bowl, open lower right
  if (y >= 0 && ring(1.25) && !(x < -0.3 && y < 1.25)) return true;             // lower bowl, open upper left
  return false;
}
