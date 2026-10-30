// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-boxes/film/props-box.mjs (drawBox, geom, BOX); changes: kit import path → ./cat-boxes-kit.mjs; geom adds an o.squash offset to the wobble term (a sit-down squash, 0 when absent).
// «Why do cats love boxes?» — the corrugated cardboard shipping box the bed came in (actors' plane, side view seen a
// little from above, like the bowl). Drawn in two halves so the cat sits between them:
//   "back"  — floor contact shadow, the back flap standing up, the two side flaps opened out like wings, the inner back
//             wall and the inner side walls in shadow, fold highlights on the back/side rims;
//   "front" — the front wall (kraft, corner shading, faint flutes, dents, optional print), the front flap folded open
//             and hanging forward over the front wall, the front rim fold highlight, a strip of torn tape.
// Box coordinates: x across (centre 0), y up from the floor, d depth (+ toward the viewer). Screen projection:
// wx = cx + x·(1 − taper·(D/2 − d)/D)·sx, wy = −y·sy + d·K (oblique, slightly narrower at the back).
import { R, TAU, clamp01, lerp, s01, ease, rnd, frac, pick, view, faces, contact, zDetail, fade, bayer, mix } from "./cat-boxes-kit.mjs";

export const BOX = { w: 92, h: 44, d: 52, flapH: 26, K: 0.3, taper: 0.06 };
BOX.rimWy = -BOX.h + (BOX.d / 2) * BOX.K;          // −36.2: world wy of the front rim (cat at wy 0 shows above this)
BOX.backRimWy = -BOX.h - (BOX.d / 2) * BOX.K;      // −51.8
BOX.frontWy = (BOX.d / 2) * BOX.K;                 // +7.8: front bottom edge on the floor

// kraft ramp (dark → light), outline, print ink, packing tape, label paper
export const KRAFT = ["#2C1C10", "#4A3220", "#684A30", "#866440", "#A27E50", "#BC9864", "#D2B27C", "#E4CB98"];
const OUT = "#26180E", RIM = "#F0DCB0", INK = "#3A2416", INK2 = "#5A3A22";
const TAPE = ["#4A2A0C", "#7A4818", "#9E6624", "#BC8238", "#D6A052", "#ECC07A", "#FAE0A8"];
const LABEL = ["#B8B0A0", "#DCD6C8", "#F2EEE2", "#FBF8F0"];

function geom(o = {}) {
  const { w, h, d: D, flapH: L, K, taper } = BOX;
  const p = clamp01(o.wobble ?? 0), amt = o.wobbleAmt ?? 1;
  const q = (p > 0 && p < 1 ? 0.075 * amt * Math.sin(p * TAU * 1.5) * Math.pow(1 - p, 1.5) : 0) + (o.squash ?? 0);   // + squash / − stretch
  const sy = 1 - q, sx = 1 + 0.55 * q;
  const fl = clamp01(o.flaps ?? 1), k1 = ease(clamp01(fl / 0.62)), k2 = ease(clamp01((fl - 0.38) / 0.62));
  const cut = clamp01(o.cut ?? 0), hc = lerp(h, 13, s01(cut));
  return {
    w, h, D, L, K, taper, q, sx, sy, k1, k2, cut, hc,
    thF: Math.PI * 1.15 * k1 + 1.4 * q, thB: Math.PI * 0.58 * k1 - 1.1 * q, thS: Math.PI * 0.74 * k2 + 2.4 * q,
  };
}
/** Screen y of the front rim (or of the cut edge when o.cut > 0) for a box centred at wx. */
export function boxRim(G, wx, o = {}) { const g = geom(o); return G.Y(-g.hc * g.sy + (g.D / 2) * g.K); }
/** A canvas view for drawing the cat INSIDE the box: between the side walls everything above the box's bottom edge is
 *  drawn; outside them only what rises above the (uncut) rim. So a long tail (crouch: ~110 units nose→tail tip) never
 *  pokes out through the sides, and a cat sunk low (e.g. "sit" at wy ≈ +12 so only ears and eyes clear the rim) never
 *  shows below the box. */
export function boxClip(c, G, wx, o = {}) {
  const gm = geom({ ...o, cut: 0 }), rimY = boxRim(G, wx, { ...o, cut: 0 }), botY = G.Y((gm.D / 2) * gm.K) - 1;
  const x0 = G.X(wx - (gm.w / 2 - 1.2) * gm.sx), x1 = G.X(wx + (gm.w / 2 - 1.2) * gm.sx), v = Object.create(c);
  v.px = (x, y, col) => { if (y < botY && (y < rimY - 1 || (x >= x0 && x < x1))) c.px(x, y, col); };
  return v;
}
/** World numbers of the box for the lead (rim heights in floor-plane wy for a cat standing at wy = 0). */
export function boxGeom(o = {}) { const g = geom(o); return { rimWy: -g.hc * g.sy + (g.D / 2) * g.K, backRimWy: -g.h * g.sy - (g.D / 2) * g.K, frontWy: (g.D / 2) * g.K, x0: -g.w / 2 * g.sx, x1: g.w / 2 * g.sx }; }

/**
 * drawBox(g, G, wx, part, o) — part "back" | "front"; wx = box centre on the floor (wy = 0).
 * o = { alpha = 1, flaps = 1 (0 closed → 1 open), tape = 1 (0..1 tape strips dissolve in), label = false (print: "this
 *       side up" arrows, a cat-bed doodle, a blank shipping sticker), wobble = 0 (phase 0..1 of the squash after the cat
 *       lands; 0 and 1 = rest), wobbleAmt = 1 (multiplier; 1 ≈ 7 % squash), cut = 0 (0..1 cross-section: the front wall
 *       lowers to 13 units and shows its corrugated cut edge, the front flap dissolves — to show a curled cat inside),
 *       t (s, sways the loose tape), light | st (optional room light) }.
 * Returns { rim, rimWy, backRim, x0, x1, top } — screen y of the front rim (cat pixels above it show), world wy of it,
 * screen y of the back rim, screen x of the front wall's edges, screen y of the highest flap point.
 */
export function drawBox(c, G, wx, part, o = {}) {
  const g0 = view(c, o, wx, -20), gm = geom(o), z = G.z;
  const { w, h, D, L, K, taper, sx, sy, k1, hc, cut } = gm;
  const P = (x, y, d) => { const s = 1 - taper * (D / 2 - d) / D; return [G.X(wx + x * s * sx), G.Y(-y * sy + d * K)]; };
  const rim = boxRim(G, wx, o), backRim = G.Y(-h * sy - (D / 2) * K), XL = G.X(wx - (w / 2) * sx), XRt = G.X(wx + (w / 2) * sx);
  const res = { rim, rimWy: G.wy(rim), backRim, x0: XL, x1: XRt, top: backRim };
  if (XRt + 40 * z < 0 || XL - 40 * z > (c.w ?? 540) || backRim - 40 * z > (c.h ?? 960)) return res;
  const tapeA = clamp01(o.tape ?? 1), det = zDetail(z, 1.7, 2.5);
  const ch = 2.6;                                           // chamfer of the flap corners

  // flap polygons -------------------------------------------------------------------------------------------------
  // long flaps (front/back): hinge along x at the rim; dir in the (y, d) plane
  const longFlap = (dSign, th) => {
    const dy = Math.sin(th), dd = dSign > 0 ? -Math.cos(th) : Math.cos(th), d0 = (dSign * D) / 2, a = (v) => [h + v * dy, d0 + v * dd];
    const [ya, da] = a(L - ch), [yb, db] = a(L);
    const pts = [P(-w / 2, h, d0), P(w / 2, h, d0), P(w / 2, ya, da), P(w / 2 - ch, yb, db), P(-w / 2 + ch, yb, db), P(-w / 2, ya, da)];
    return { pts, H: P(0, h, d0), T: P(0, yb, db), outerVisible: cross(pts) < 0 === dSign > 0 };
  };
  // side flaps: hinge along d at x = ±w/2; dir in the (x, y) plane
  const sideFlap = (xs, th) => {
    const cx = Math.cos(th) * -xs, cy = Math.sin(th), x0 = (xs * w) / 2, a = (v) => [x0 + v * cx, h + v * cy];
    const [xa, ya] = a(L - ch), [xb, yb] = a(L);
    const pts = [P(x0, h, -D / 2), P(x0, h, D / 2), P(xa, ya, D / 2), P(xb, yb, D / 2 - ch), P(xb, yb, -D / 2 + ch), P(xa, ya, -D / 2)];
    return { pts, H: P(x0, h, 0), T: P(xb, yb, 0), outerVisible: gm.thS < 0.06 * Math.PI };
  };
  const vAlong = (F) => { const tx = F.T[0] - F.H[0], ty = F.T[1] - F.H[1], l2 = tx * tx + ty * ty; return l2 < 4 ? () => 0.5 : (X, Y) => clamp01(((X + 0.5 - F.H[0]) * tx + (Y + 0.5 - F.H[1]) * ty) / l2); };
  const tapeBand = (v, X, Y, uu) => {                       // tape along a flap's free edge, glossy diagonal streak
    if (tapeA <= 0 || v < 1 - 5.2 / L || tapeA <= bayer(X, Y)) return null;
    const e = (1 - v) * L, gl = frac((uu * 0.09 + e * 0.12)) < 0.16;
    return e < 0.7 ? TAPE[2] : gl ? TAPE[6] : e > 4.4 ? TAPE[3] : TAPE[4];
  };
  const fB = longFlap(-1, gm.thB), fF = longFlap(1, gm.thF), wL = sideFlap(-1, gm.thS), wR = sideFlap(1, gm.thS);
  const flapFace = (F, base, top, uOf, taped = true) => {
    const v = vAlong(F);
    return { pts: F.pts, out: OUT, shade: (X, Y) => {
      const vv = v(X, Y), u = uOf(X, Y), tp = taped ? tapeBand(vv, X, Y, u) : null; if (tp) return tp;
      let tone = lerp(base, top, vv);
      if (det > 0 && frac(u / 3.1) < 0.2 && det * 0.6 > bayer(X, Y)) tone -= 0.4;   // faint flutes
      return pick(KRAFT, tone, X, Y);
    } };
  };
  const uX = (X) => (X + 0.5 - G.X(wx)) / (z * sx);          // box-local x (front wall scale)
  const uD = (X, Y) => (Y + 0.5) / z;                       // side flaps: flutes run along the length (use screen y)

  if (part === "back") {
    // floor contact shadow (front-bottom edge, a little toward the right — the room light comes from the left)
    contact(fade(c, o.alpha ?? 1), G.X(wx + 4), G.Y(BOX.frontWy - 0.4), (w / 2 + 7) * z * sx, 4.2 * z, 0.5);
    const list = [];
    const iB = gm.thB >= 0.3 * Math.PI ? list.push(flapFace(fB, fB.outerVisible ? 5.6 : 3.7, fB.outerVisible ? 6.2 : 4.9, uX)) - 1 : -1;
    const iL = gm.thS >= 0.25 * Math.PI ? list.push(flapFace(wL, wL.outerVisible ? 5.8 : 4.3, wL.outerVisible ? 6.3 : 5.3, uD, false)) - 1 : -1;
    const iR = gm.thS >= 0.25 * Math.PI ? list.push(flapFace(wR, wR.outerVisible ? 5.8 : 5.0, wR.outerVisible ? 6.3 : 5.9, uD, false)) - 1 : -1;
    // inner walls
    const yOf = (Y) => (G.Y(0) - (Y + 0.5)) / (z * sy);       // approx height inside (back wall: d = −D/2 → offset)
    const backY0 = G.Y(-(D / 2) * K);                         // screen y of the back wall's foot
    const inner = (tone0, tone1) => (X, Y) => {
      const y = (backY0 - (Y + 0.5)) / (z * sy), deep = clamp01((h - y) / h), x = uX(X);
      let tone = lerp(tone0, tone1, Math.pow(deep, 0.7));
      tone -= 0.55 * s01((x + w / 2 - 14) / -12) * (0.6 + 0.4 * deep);    // the left wall shades the back wall's left part
      tone -= 0.5 * s01((y - 4) / -4);                                    // dark crease at the floor
      if (det > 0 && frac((x + 50) / 3.1) < 0.2 && det * 0.5 > bayer(X, Y)) tone -= 0.35;
      return pick(KRAFT, tone, X, Y);
    };
    void yOf;
    const crease = {}; if (iB >= 0) crease[iB] = RIM;
    const iBack = list.push({ pts: [P(-w / 2, h, -D / 2), P(w / 2, h, -D / 2), P(w / 2, 0, -D / 2), P(-w / 2, 0, -D / 2)], out: OUT, crease, shade: inner(3.0, 1.1) }) - 1;
    void iBack;
    const cL = {}; if (iL >= 0) cL[iL] = RIM;
    const cR = {}; if (iR >= 0) cR[iR] = RIM;
    list.push({ pts: [P(-w / 2, h, -D / 2), P(-w / 2, h, D / 2), P(-w / 2, 0, D / 2), P(-w / 2, 0, -D / 2)], out: OUT, crease: cL, shade: (X, Y) => pick(KRAFT, 1.9 - 0.6 * clamp01((rim - Y) / -(14 * z)), X, Y) });
    list.push({ pts: [P(w / 2, h, -D / 2), P(w / 2, h, D / 2), P(w / 2, 0, D / 2), P(w / 2, 0, -D / 2)], out: OUT, crease: cR, shade: (X, Y) => pick(KRAFT, 3.1 - 0.7 * clamp01((rim - Y) / -(14 * z)), X, Y) });
    const bb = faces(g0, list);
    res.top = Math.min(res.top, ...[fB, wL, wR].map((F) => Math.min(...F.pts.map((p) => p[1]))));
    void bb;
    return res;
  }

  // ---------------------------------------------------------------- front
  const Yfloor = G.Y((D / 2) * K), Ytop = G.Y(-hc * sy + (D / 2) * K), label = !!o.label, sticker = o.sticker ?? label;
  const flapOpen = gm.thF > 0.55 * Math.PI, flapA = 1 - s01(cut / 0.3);
  const tipY = flapOpen && flapA > 0 ? Math.max(fF.pts[3][1], fF.pts[4][1]) : -1e9;
  const shadowA = flapA * s01((gm.thF - 0.7 * Math.PI) / (0.3 * Math.PI));
  const wear = (x, y) => rnd(Math.floor(x * 1.7 + 200) * 73 + Math.floor(y * 1.7 + 50) * 19) < 0.13;
  const print = (x, y) => {                                  // returns ink colour or null; local units, y up
    if (label) {
      // "this side up": two arrows on a bar
      for (const ax of [-36.2, -30.6]) {
        if (Math.abs(x - ax) < 0.8 && y > 7.6 && y < 15.2) return wear(x, y) ? null : INK;
        if (y >= 14.2 && y < 19 && Math.abs(x - ax) < 2.7 * (19 - y) / 4.8) return wear(x, y) ? null : INK;
      }
      if (y > 5.0 && y < 6.5 && x > -39.6 && x < -27.2) return wear(x, y) ? null : INK;
      // the cat-bed doodle: a round bed (outer + inner ellipse) with a sleepy cat head and two ears peeking out
      const bx = -12, by = 9.2, e1 = ((x - bx) / 8.4) ** 2 + ((y - by) / 3.6) ** 2, e2 = ((x - bx) / 5.0) ** 2 + ((y - by - 0.9) / 1.7) ** 2;
      const hx = x - bx + 0.6, hy = y - by - 3.4, hd = Math.hypot(hx / 3.3, hy / 2.7);
      if (hy > -0.6 && Math.abs(hd - 1) < 0.24) return INK2;
      for (const ex of [-1.9, 1.5]) { const tx = x - (bx + ex), ty = y - (by + 6.0); if (ty > -1.3 && ty < 1.7 && Math.abs(Math.abs(tx) - (1.7 - ty) * 0.55) < 0.34) return INK2; }
      if (Math.abs(hx - 1.0) < 0.9 && Math.abs(hy - 0.7) < 0.3) return INK2;                 // a closed eye
      if (e2 < 1 && hy < -0.6 && Math.abs(Math.sqrt(e2) - 1) < 0.22) return INK2;
      if (Math.abs(Math.sqrt(e1) - 1) < 0.11 && !(hd < 1 && hy > -0.6)) return INK2;
    }
    if (sticker && x > 12 && x < 34 && y > 4 && y < 17.4) {
      const ex = Math.min(x - 12, 34 - x), ey = Math.min(y - 4, 17.4 - y);
      if (ex < 0.55 || ey < 0.55) return LABEL[0];
      if (y > 5.4 && y < 9.6 && x > 14 && x < 32) return rnd(Math.floor((x - 14) * 1.25) * 7 + 3) < 0.55 ? "#2A2420" : LABEL[3];
      if ((y > 11.3 && y < 12.4 && x > 14 && x < 30) || (y > 13.8 && y < 14.9 && x > 14 && x < 25.5)) return LABEL[1];
      return y > 15.6 ? LABEL[2] : LABEL[3];
    }
    return null;
  };
  const dents = [[-20, 12.5, 3.4, 1.9], [31, 24, 2.6, 1.6], [-41, 30, 2.2, 3.4]];
  const wallShade = (X, Y) => {
    const x = uX(X), y = (Yfloor - (Y + 0.5)) / (z * sy);
    if (cut > 0 && y > hc - 2.2) {                           // cross-section cut edge: corrugated flutes
      const v = (hc - y) / 2.2; if (det <= 0.2 || z < 1.6) return v < 0.45 ? KRAFT[7] : KRAFT[6];
      const wv = 0.5 + 0.34 * Math.sin(x * 2.1); return Math.abs(v - wv) < 0.17 ? KRAFT[3] : v < 0.2 || v > 0.84 ? KRAFT[6] : KRAFT[7];
    }
    const ink = print(x, y); if (ink) return ink;
    let tone = 4.75 + 0.75 * clamp01(y / h);
    if (x < -w / 2 + 2.0) tone += 0.8; else if (x > w / 2 - 2.6) tone -= 0.9;
    if (y < 2.6) tone -= 0.85 * (1 - y / 2.6);
    if (Math.abs(y - (h - 1.8)) < 0.36 + 0.4 / z && cut <= 0) tone -= 0.55;
    if (Math.abs(y - 2.4) < 0.3 + 0.4 / z) tone -= 0.35;
    for (const [dx, dy, rx, ry] of dents) { const e = ((x - dx) / rx) ** 2 + ((y - dy) / ry) ** 2; if (e < 1) tone += (x - dx) / rx + (dy - y) / ry > 0 ? -0.55 : 0.35; }
    if (det > 0 && frac((x + 50) / 3.1) < 0.2 && det * 0.55 > bayer(X, Y)) tone -= 0.35;
    if (shadowA > 0 && Y >= tipY && Y < tipY + 2.8 * z) { const k = 1 - (Y - tipY) / (2.8 * z); if (shadowA * (0.4 + 0.6 * k) > bayer(X + 1, Y)) tone -= 1.2; }
    return pick(KRAFT, tone, X, Y);
  };
  const list = [{ pts: [P(-w / 2, hc, D / 2), P(w / 2, hc, D / 2), P(w / 2, 0, D / 2), P(-w / 2, 0, D / 2)], out: OUT, shade: wallShade }];
  if (gm.thS < 0.25 * Math.PI) { list.push(flapFace(wL, 5.9, 6.3, uD, false)); list.push(flapFace(wR, 5.9, 6.4, uD, false)); }
  if (gm.thB < 0.3 * Math.PI) list.push(flapFace(fB, 5.7, 6.3, uX));
  faces(g0, list);
  // the front flap (own pass: its outline sits on the wall it hangs over; dissolves with the cut)
  if (flapA > 0) {
    const gF = flapA < 1 ? fade(g0, flapA) : g0, v = vAlong(fF), outer = fF.outerVisible;
    const hingeY = fF.H[1];
    faces(gF, [{ pts: fF.pts, out: (X, Y, top, bottom) => (outer && bottom ? RIM : OUT), shade: (X, Y) => {
      const vv = v(X, Y), u = uX(X), tp = tapeBand(vv, X, Y, u); if (tp) return tp;
      if (!outer && Math.abs(Y + 0.5 - hingeY) < Math.max(1, 0.9 * z)) return RIM;     // the rounded fold catches the light
      let tone = outer ? lerp(5.8, 6.3, vv) : lerp(5.1, 6.15, vv);
      if (det > 0 && frac(u / 3.1) < 0.2 && det * 0.6 > bayer(X, Y)) tone -= 0.4;
      return pick(KRAFT, tone, X, Y);
    } }]);
    // a peeled-off end of tape curling away from the front flap's edge (sways with t and with the wobble)
    const ta = tapeA * s01((k1 - 0.7) / 0.3) * flapA;
    if (ta > 0 && flapOpen) {
      const gt = ta < 1 ? fade(g0, ta) : g0, sw = Math.sin((o.t ?? 0) * 2.3) * 0.35 + gm.q * 9;
      const ty0 = (fF.pts[3][1] + fF.pts[4][1]) / 2 - 0.6 * z, xA = G.X(wx + 12 * sx), T2 = (u, v) => [xA + u * z, ty0 + v * z];
      // glossy outer side (attached part bending down) and the paler sticky side where the end curls toward us
      const outer = [T2(-2.6, 0), T2(2.6, 0), T2(2.9 + sw, 2.6), T2(-2.2 + sw, 2.9)];
      const curl = [T2(-2.2 + sw, 2.9), T2(2.9 + sw, 2.6), T2(3.4 + sw * 1.4, 4.4), T2(2.2 + sw * 1.4, 5.3), T2(0.8 + sw * 1.4, 4.6), T2(-0.6 + sw * 1.4, 5.4), T2(-1.9 + sw * 1.3, 4.5)];
      faces(gt, [
        { pts: outer, out: TAPE[0], shade: (X, Y) => (frac(((X + 0.5 - xA) / z) * 0.22 + ((Y - ty0) / z) * 0.1) < 0.2 ? TAPE[6] : TAPE[3]) },
        { pts: curl, out: TAPE[0], crease: { 0: TAPE[1] }, shade: (X, Y) => ((Y - ty0) / z > 4.2 ? TAPE[4] : TAPE[5]) },
      ]);
    }
  }
  return res;
}
function cross(pts) { const [a, b, , , , d] = pts; return (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]); }
