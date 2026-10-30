// «Why do cats love boxes?» — a printed paper sheet lying flat on the floor in the actors' plane (the "if it fits, it
// sits" shapes). Seen from above at an angle: a slightly squashed, slightly rotated sheet (nearer edge a little wider),
// taped to the floor at the far corners, a dog-eared near corner, a soft shadow. Printed in black:
//   "square"  — a square outline;   "kanizsa" — four pac-man discs whose mouths face inward (an illusory square);
//   "wonky"   — the same discs with their mouths turned the wrong way (no square).
// Drawn per pixel by inverse projection, so the print stays locked to the sheet at every zoom.
import { R, clamp01, lerp, frac, rnd, view, bayer, mix, hex } from "./props-kit.mjs";

export const PAPER = { KP: 0.38, persp: 0.0018 };
const P0 = "#7E7468", P1 = "#B6AE9F", PB = "#EDE9E0", PL = "#FAF8F3", PH = "#FFFFFF", PU = "#DDD6C8", INK = "#16121E";
const GLOW = ["#F4CA50", "#FFE88A", "#FFF6CC"], TAPE = "#E8D8A8", TAPE_E = "#C8B482";

/**
 * drawPaper(g, G, wx, kind, o) — kind "square" | "kanizsa" | "wonky"; wx = sheet centre (the cat sits at (wx, 0)).
 * o = { alpha = 1, size = 80 (side of the printed figure's square, world units; the sheet is 1.3 × 1.15 of it),
 *       glow = 0 (0..1: the illusory square's edges shimmer in yellow, dithered; kanizsa only — on "square" it outlines
 *       the drawn square), corners = 0 (0..1 yellow halo pulse around the four discs), t (s, shimmer phase),
 *       rot = −0.035 (rad, the sheet's turn on the floor), wy = 0 (depth of the sheet centre), light | st }.
 * Returns { x0, y0, x1, y1 } screen bbox of the sheet and corner: [[x, y] ×4] (figure corners on screen: far-left,
 * far-right, near-right, near-left).
 */
export function drawPaper(c, G, wx, kind = "square", o = {}) {
  const g = view(c, o, wx, 0), z = G.z, S = o.size ?? 80, KP = PAPER.KP, ps = PAPER.persp, rot = o.rot ?? -0.035, wy0 = o.wy ?? 0;
  const PW = 1.3 * S, PD = 1.15 * S, Q = 0.7 * S, rD = 0.17 * S, tl = 0.02 * S, t = o.t ?? 0;
  const glow = clamp01(o.glow ?? 0), cor = clamp01(o.corners ?? 0), ca = Math.cos(rot), sa = Math.sin(rot);
  const toW = (u, v) => { const x = u * ca - v * sa, d = u * sa + v * ca; return [wx + x * (1 + ps * d), wy0 + d * KP]; };
  const toS = (u, v) => { const [a, b] = toW(u, v); return [G.X(a), G.Y(b)]; };
  const corners = [toS(-PW / 2, -PD / 2), toS(PW / 2, -PD / 2), toS(PW / 2, PD / 2), toS(-PW / 2, PD / 2)];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of corners) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const res = { x0: R(x0), y0: R(y0), x1: R(x1), y1: R(y1), corner: [toS(-Q / 2, -Q / 2), toS(Q / 2, -Q / 2), toS(Q / 2, Q / 2), toS(-Q / 2, Q / 2)] };
  const pad = 3 * z, X0 = Math.max(0, Math.floor(x0 - pad)), X1 = Math.min((c.w ?? 540) - 1, Math.ceil(x1 + pad)), Y0 = Math.max(0, Math.floor(y0 - pad)), Y1 = Math.min((c.h ?? 960) - 1, Math.ceil(y1 + pad));
  if (X1 < X0 || Y1 < Y0) return res;
  // inverse: screen → sheet-local (u across, v depth toward the viewer); per-column world x, per-row depth
  const WXc = new Float32Array(X1 - X0 + 1); for (let X = X0; X <= X1; X++) WXc[X - X0] = G.wx(X + 0.5) - wx;
  const pxU = 1 / z, pxV = 1 / (z * KP);                    // one screen pixel in sheet units (across / depth)
  const discs = [[-Q / 2, -Q / 2], [Q / 2, -Q / 2], [Q / 2, Q / 2], [-Q / 2, Q / 2]];
  const mAng = kind === "wonky" ? [Math.PI * 1.25, Math.PI * 1.25, Math.PI * 0.5, Math.PI * 0.65] : discs.map(([a, b]) => Math.atan2(-b, -a));
  const mouth = mAng.map((a) => [Math.cos(a), Math.sin(a)]), C45 = Math.SQRT1_2;
  const fold = 7.5, tapes = [[-PW / 2, -PD / 2, 0.75], [PW / 2, -PD / 2, -0.75]].map(([tu, tv, a]) => [tu, tv, Math.cos(a), Math.sin(a)]);
  const under = (X, Y) => c.get(X, Y);
  const pulse = [0, 1, 2, 3].map((i) => cor * (0.75 + 0.25 * Math.sin(t * 8 + i)));
  for (let Y = Y0; Y <= Y1; Y++) {
   const d = (G.wy(Y + 0.5) - wy0) / KP, si = 1 / (1 + ps * d);
   if (d < -PD / 2 - 12 || d > PD / 2 + 12) continue;
   for (let X = X0; X <= X1; X++) {
    const xx = WXc[X - X0] * si, u = xx * ca + d * sa, v = -xx * sa + d * ca, au = Math.abs(u), av = Math.abs(v);
    if (au > PW / 2 + 9 || av > PD / 2 + 9) continue;
    // tape pieces at the far corners (translucent, over paper and floor)
    let tapeHit = 0;
    if (v < -PD / 2 + 7) for (const [tu, tv, tc, ts] of tapes) { const du = u - tu, dv = v - tv, a = du * tc + dv * ts, b = -du * ts + dv * tc; if (Math.abs(a) < 7 && Math.abs(b) < 2.6) { tapeHit = Math.abs(a) > 7 - pxU * 1.2 || Math.abs(b) > 2.6 - pxV * 1.1 ? 2 : 1; break; } }
    const inSheet = au <= PW / 2 && av <= PD / 2;
    // dog-ear: the near-right corner is folded over along a 45° line
    const ca_ = PW / 2 - u, cb = PD / 2 - v, cc = ca_ + cb;
    if (!inSheet || cc < fold) {
      // floor: soft shadow just outside the right and near edges
      const sx = u - PW / 2, sv = v - PD / 2, sh = (au <= PW / 2 + 2.2 && av <= PD / 2 + 2.2 && (sx > -0.5 || sv > -0.5) && u > -PW / 2 + 1.5 && v > -PD / 2 + 1.5) || (inSheet && cc < fold);
      if (tapeHit) { g.px(X, Y, tapeHit === 2 ? TAPE_E : mix(under(X, Y), TAPE, bayer(X, Y) < 0.5 ? 0.6 : 0.45)); continue; }
      if (sh) { const k = inSheet ? 0.32 : 0.28 * (1 - Math.max(sx, sv, 0) / 2.2); if (k > bayer(X, Y) * 0.9) g.px(X, Y, mix(under(X, Y), "#2A1A12", 0.32)); }
      continue;
    }
    // the folded flap (paper underside, slightly grey) with its own outline
    if (cc < 2 * fold && Math.abs(ca_ - cb) <= 2 * fold - cc) {
      const edge = cc < fold + pxU * 1.2 || 2 * fold - cc - Math.abs(ca_ - cb) < pxU * 1.3;
      g.px(X, Y, edge ? P0 : cc < fold + 2.2 ? PL : PU); continue;
    }
    // sheet edge (1-px outline), a thickness row on the near edge
    const eU = PW / 2 - au, eV = PD / 2 - av;
    if (eU < pxU || eV < pxV || cc < fold + pxU * 1.1) { g.px(X, Y, v > 0 && eV < pxV ? P1 : P0); continue; }
    let col = null;
    // print
    if (kind === "square") {
      const m = Math.max(au, av); if (Math.abs(m - Q / 2) < tl) col = INK;
      if (!col && glow > 0 && Math.abs(m - Q / 2) < tl + 1.8 && glow * (0.5 + 0.5 * Math.sin(t * 5 - (u + v) * 0.18)) > bayer(X, Y)) col = GLOW[1];
    } else {
      if (au > Q / 2 - rD - 3 && av > Q / 2 - rD - 3) for (let i = 0; i < 4; i++) {
        const du = u - discs[i][0], dv = v - discs[i][1], dd = Math.hypot(du, dv);
        if (dd < rD) { if (du * mouth[i][0] + dv * mouth[i][1] < C45 * dd) { col = INK; break; } }
        else if (cor > 0 && dd < rD + 2.6 && pulse[i] * (1 - (dd - rD) / 2.6) > bayer(X, Y)) { col = dd < rD + 1.1 ? GLOW[0] : GLOW[1]; }
      }
      if (!col && glow > 0 && kind === "kanizsa") {
        // the illusory square: its edges between the discs shimmer, its inside looks a touch brighter
        const m = Math.max(au, av), onEdge = Math.abs(m - Q / 2) < 1.5 && Math.min(au, av) < Q / 2 - rD * 0.85;
        if (onEdge) { const s = av > au ? u : v, k = glow * (0.55 + 0.45 * Math.sin(t * 6 - s * 0.22 + (av > au ? 0 : 1.7))); if (k > bayer(X, Y)) col = Math.abs(m - Q / 2) < 0.6 ? GLOW[0] : GLOW[1]; }
        else if (m < Q / 2 - 1.5 && glow * 0.22 > bayer(X, Y)) col = GLOW[2];
      }
    }
    if (!col) {
      // paper: white with a soft sheen across, a hint of grey toward the far edge
      const sheen = frac((u * 0.7 + v * 0.35) / 60 + 0.3), k = v < -PD / 2 + 6 ? 0.35 : 0;
      col = sheen < 0.1 ? PH : k > bayer(X, Y) ? PB : PL;
      if (eU < pxU * 2.1 && u > 0) col = PB;
    }
    if (tapeHit) col = tapeHit === 2 ? TAPE_E : mix(col, TAPE, 0.5);
    g.px(X, Y, col);
   }
  }
  return res;
}
void lerp; void rnd; void hex;
