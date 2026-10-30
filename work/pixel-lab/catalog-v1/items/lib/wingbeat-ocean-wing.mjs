// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-wingbeat/film/levels/ocean-wing.mjs; changes: import ./cute.mjs.
// A feathered bird wing seen from the front (the cute "spread" convention: the upper surface faces the camera, the
// leading edge on top), shared by my two birds: the wandering albatross (LV1, ocean.mjs) and the rock pigeon (LV2,
// city.mjs). The wing is a bent spine — arm (shoulder → wrist) and hand (wrist → tip), each with its own elevation —
// with a chord profile around it. Elevation angles come from the caller (wingPhase/strokeAmt), never from a clock here.
// Drawing: a volume-shaded blob for the wing, then flat tone bands (coverts, bars, white underside edge, dark tip) and
// feather lines on top. Pure function of its inputs.
import { blob, fade, mix, bayer } from "./cute.mjs";

const R = Math.round;
const ss = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * Wing frame. S = shoulder [x, y] (screen); sd = +1 right wing on screen, −1 left wing.
 * o: La, Lh (arm / hand length), ea, eh (elevation of arm / hand in rad, + = up), rot (roll of the body, rad),
 *    lead(u), trail(u) (half-chords above / below the spine, u = 0 root … 1 tip), n (samples), bend (wrist blend px).
 * Returns { P(i, v), U(i), n, poly } — P maps sample i and chord offset v (+ toward the leading edge) to screen.
 */
export function wingFrame(S, sd, o) {
  const L = o.La + o.Lh, n = o.n ?? 36, b = o.bend ?? 12, cr = Math.cos(o.rot ?? 0), sr = Math.sin(o.rot ?? 0);
  const sp = new Array(n + 1), nr = new Array(n + 1);
  let x = S[0], y = S[1];
  for (let i = 0; i <= n; i++) {
    const s = (L * i) / n, th = o.ea + (o.eh - o.ea) * ss((s - (o.La - b)) / (2 * b));
    const dx = sd * Math.cos(th), dy = -Math.sin(th), rx = dx * cr - dy * sr, ry = dx * sr + dy * cr;
    sp[i] = [x, y]; nr[i] = sd > 0 ? [ry, -rx] : [-ry, rx];
    x += (rx * L) / n; y += (ry * L) / n;
  }
  const U = (i) => i / n;
  const P = (i, v) => { i = Math.max(0, Math.min(n, i)); const a = Math.floor(i), f = i - a, b2 = Math.min(n, a + 1);
    const px = sp[a][0] + (sp[b2][0] - sp[a][0]) * f, py = sp[a][1] + (sp[b2][1] - sp[a][1]) * f, nx = nr[a][0] + (nr[b2][0] - nr[a][0]) * f, ny = nr[a][1] + (nr[b2][1] - nr[a][1]) * f;
    return [px + v * nx, py + v * ny]; };
  const poly = [];
  for (let i = 0; i <= n; i++) poly.push(P(i, o.lead(U(i))));
  for (let i = n; i >= 0; i--) poly.push(P(i, -o.trail(U(i))));
  return { P, U, n, poly, tip: P(n, 0), wrist: P((o.La / L) * n, 0) };
}

/** Polygon of the chord band between v = top(u) and v = bot(u) for u in [u0, u1] (flat overlay regions). */
export function band(F, u0, u1, top, bot, steps = 14) {
  const pts = [];
  for (let k = 0; k <= steps; k++) { const u = u0 + ((u1 - u0) * k) / steps; pts.push(F.P(u * F.n, top(u))); }
  for (let k = steps; k >= 0; k--) { const u = u0 + ((u1 - u0) * k) / steps; pts.push(F.P(u * F.n, bot(u))); }
  return pts;
}

/**
 * Draw one wing. look: { ramp (8 tones, the upper surface), outline, under (white underside edge colour), underW (px),
 * tip (dark wingtip colour), tipFrom (u), coverts (lighter leading band colour), covW, bars: [[u0, u1, v0, v1, col]],
 * patch: { u1, col } (pale inner-wing patch), feathers: { from, every, col } (feather lines on the trailing part),
 * primaries: n (separated tip feathers) }. shade: −1..1 overall tone shift (+ lighter: underside catching sky light).
 */
export function drawWing(c, F, o, look, a = 1, shade = 0) {
  if (a <= 0) return;
  const g = fade(c, a);
  blob(c, [F.poly], { ramp: look.ramp, base: 3.0 + shade * 0.7, gain: 1.6, slope: 0.4, thick: look.thick ?? 6, light: [-0.4, -0.9], rimLit: 0.7, rimShade: 0.5, outline: look.outline, litOutline: look.litOutline ?? null, a });
  // pale inner-wing patch near the body (albatross coverts / pigeon underwing hint)
  if (look.patch) g.poly(band(F, 0, look.patch.u1, (u) => o.lead(u) - 1.2, (u) => o.lead(u) - (o.lead(u) + o.trail(u)) * (look.patch.depth ?? 0.55) * (1 - u / look.patch.u1) ** 0.6), look.patch.col);
  // coverts: a lighter band along the leading edge
  if (look.coverts) g.poly(band(F, 0.02, look.covTo ?? 0.62, (u) => o.lead(u) - 1.2, (u) => o.lead(u) - (look.covW ?? 5) * (1 - 0.4 * u)), look.coverts);
  // wing bars (pigeon) and tone bands
  // (f = fraction of the chord from the leading edge: 0 leading edge … 1 trailing edge)
  const vf = (u, f) => o.lead(u) - f * (o.lead(u) + o.trail(u));
  for (const [u0, u1, f0, f1, col] of look.bars ?? []) g.poly(band(F, u0, u1, (u) => vf(u, f0), (u) => vf(u, f1)), col);
  // white underside showing along the trailing edge
  if (look.under) { const w = look.underW ?? 3; g.poly(band(F, 0.0, look.underTo ?? 0.86, (u) => -o.trail(u) + w * (1 - 0.6 * u), (u) => -o.trail(u) + 0.6), look.under); }
  // dark wingtip
  if (look.tip) g.poly(band(F, look.tipFrom ?? 0.82, 1, (u) => o.lead(u) - 0.8, (u) => -o.trail(u) + 0.8, 10), look.tip);
  // feather lines on the trailing half (secondaries / primaries), from the trailing edge inward
  if (look.feathers) { const fe = look.feathers, n = Math.floor((1 - fe.from) / fe.every);
    for (let k = 1; k <= n; k++) { const u = fe.from + k * fe.every; if (u >= 0.985) break; const deep = fe.depth ?? 0.55, lean = fe.lean ?? 0.025;
      const p = F.P(u * F.n, -o.trail(u) + 0.8), q = F.P(Math.max(0, u - lean) * F.n, -o.trail(u) + (o.trail(u) + o.lead(u)) * deep * (u > (fe.handFrom ?? 0.5) ? 0.8 : 0.5));
      g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), fe.col); } }
  // outline again on top of the overlays (keeps the silhouette crisp)
  const P = F.poly; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), look.outline); }
}

/** Faint dithered sweep between the wing's previous spine (dt earlier) and now: a little motion smear for fast strokes. */
export function smear(c, Fprev, Fnow, col, a = 0.35) {
  if (a <= 0) return; const n = Fnow.n, g = fade(c, a);
  for (let i = Math.floor(n * 0.35); i < n; i += 1) {
    const A = Fprev.P(i, 0), B = Fnow.P(i, 0), C2 = Fprev.P(i + 1, 0), D = Fnow.P(i + 1, 0);
    g.poly([A, C2, D, B], null, (X, Y) => (((X + Y) & 1) === 0 && bayer(X, Y) < 0.5 + 0.5 * (i / n) ? col : null));
  }
}
export { mix };
