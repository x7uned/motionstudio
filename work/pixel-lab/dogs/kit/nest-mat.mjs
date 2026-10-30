// Dog series kit · film 3 · the two mats of Stanley Coren's study (62 dogs): a flat, tight-woven striped mat ("smooth")
// and a lumpy shaggy rug with long fluffy fibres ("shaggy"). World units through G (nest-hf.mjs frame). Pure functions.
import { KS, lit, band, ramp, sm, clamp01, lerp, h2, vnoise, heightfield, splitRule, outline, stroke, emit, memo, keyOf, viewOf, frameFor, groundShadow } from "./nest-hf.mjs";
import { wind } from "./park-geo.mjs";

/** Mat geometry (world units): both ≈ 140 wide. */
export const MAT = { smooth: { w: 70, d: 42, T: 2.4, r: 6 }, shaggy: { w: 68, d: 42, pile: 2.4, nest: 52 } };

// ---------------------------------------------------------------- palettes
const BLUE = ramp(["#18223E", "#26385E", "#36507E", "#4A6CA2", "#6488C0", "#86A8DA"]);
const OAT = ramp(["#5A4E3E", "#9A8A6E", "#C8B896", "#E4D8BA", "#F4ECD6", "#FFF8EC"]);
const MUST = ramp(["#4E3008", "#875A12", "#BC8420", "#DCA436", "#EEC25A", "#F8DC88"]);
const NAVY = ramp(["#0C101E", "#161E34", "#222C4A", "#303E62", "#425480"]);
const RUG = ramp(["#3E2A22", "#634636", "#8A6650", "#AC8668", "#C6A284", "#DABCA0", "#EAD4BC", "#F5E7D6", "#FFF7EE"]);
const OUT_S = [10, 14, 26], OUT_R = [99, 70, 54];

// ---------------------------------------------------------------- smooth woven mat
function smoothH(X, S) {
  const { w, d, T, r } = MAT.smooth, qx = Math.abs(X) - (w - r), qs = Math.abs(S) - (d - r);
  const e = r - (qx > 0 && qs > 0 ? Math.hypot(qx, qs) : Math.max(qx, qs, -r));   // distance inside the rounded rectangle
  if (e <= 0) return -1;
  return T * Math.min(1, Math.sqrt(e / 0.9));
}
/** Stripe colour ramp at X: wide slate-blue bands, thin oat and mustard lines (rag-rug look), mirrored about the centre. */
function stripeAt(X) {
  const p = ((X + 70) % 20 + 20) % 20;
  return p < 11 ? BLUE : p < 12.6 ? OAT : p < 15.4 ? MUST : p < 17 ? OAT : BLUE;
}
function smoothShade(X, S, h, gX, gS, px, py, out) {
  const { w, d, r } = MAT.smooth, w0 = lit(gX, gS);
  const qx = Math.abs(X) - (w - r), qs = Math.abs(S) - (d - r), e = r - (qx > 0 && qs > 0 ? Math.hypot(qx, qs) : Math.max(qx, qs, -r));
  const row = Math.floor(S / 3.6), weave = ((Math.floor(X / 1.7) + row) & 1) ? 0.17 : -0.17;
  let R, v, m;
  if (e < 4.6) {                                             // bound edge with a stitched line
    R = NAVY; v = -0.6 + 4.4 * w0 + weave * 0.5; m = 2;
    if (Math.abs(e - 2.6) < 0.45 && qs > qx && ((Math.abs(X) / 2.2) % 2) < 1.1 && h > 1.5) { R = OAT; v = 3; }   // stitches along the long edges
  } else { R = stripeAt(X); v = -0.9 + 5.0 * w0 + weave; m = 1; }
  const c = R[band(v, R.length - 1, px, py)]; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return m;
}

// ---------------------------------------------------------------- shaggy rug
const LUMPS = [];                                             // jittered lumps (static)
for (let j = -4; j <= 4; j++) for (let i = -6; i <= 6; i++) {
  const x = i * 12 + (j & 1) * 6 + (h2(i, j * 3 + 1) - 0.5) * 5, s = j * 11 + (h2(i * 5, j) - 0.5) * 5;
  LUMPS.push({ x, s, a: 3.4 + h2(i + 9, j) * 3.2, r: 4.6 + h2(i, j + 17) * 1.8 });
}
const LG = new Map(); for (const L of LUMPS) { const k = `${Math.round(L.x / 12)},${Math.round(L.s / 11)}`; (LG.get(k) ?? LG.set(k, []).get(k)).push(L); }
function lumpsAt(X, S) {
  let v = 0; const ci = Math.round(X / 12), cj = Math.round(S / 11);
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const arr = LG.get(`${ci + di},${cj + dj}`); if (!arr) continue;
    for (const L of arr) { const dx = X - L.x, ds = S - L.s, q = (dx * dx + ds * ds) / (L.r * L.r); if (q < 4) v += L.a * Math.exp(-q); }
  }
  return v;
}
/** Shaggy outline: a rounded rectangle with a softly lumpy edge; returns the depth e inside it (≤ 0 outside). */
function shagEdge(X, S) {
  const { w, d } = MAT.shaggy, a = Math.atan2(S / d, X / w), ex = Math.pow(Math.pow(Math.abs(X) / w, 4) + Math.pow(Math.abs(S) / d, 4), 0.25);
  return (1 + 0.035 * vnoise(a * 4.2, 1.3, 5) - ex) * 30;
}
/** Pressed amount 0..1 at (X, S): a round patch growing from the centre with flat. */
let NEST_R = MAT.shaggy.nest;                                 // set per render from o.radius (pure: render() always sets it)
const pressAt = (X, S, flat) => { if (flat <= 0) return 0; const R = flat * NEST_R, d = Math.hypot(X, S * 1.05); return sm(R - d, -2, 9) * sm(flat, 0, 0.12); };
// static grids (0.5-unit cells): edge depth e, unpressed pile height, pressed-floor noise — sampled bilinearly
const GX0 = -MAT.shaggy.w - 2, GS0 = -MAT.shaggy.d - 2, GD = 0.5, GW = Math.ceil((2 * MAT.shaggy.w + 4) / GD) + 2, GH = Math.ceil((2 * MAT.shaggy.d + 4) / GD) + 2;
const GE = new Float32Array(GW * GH), GB = new Float32Array(GW * GH), GN = new Float32Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  const X = GX0 + i * GD, S = GS0 + j * GD, k = j * GW + i;
  GE[k] = shagEdge(X, S); GB[k] = MAT.shaggy.pile + lumpsAt(X, S) + 0.6 * vnoise(X / 3.5, S / 3.5, 2); GN[k] = 0.5 * vnoise(X / 4, S / 4, 8);
}
const SMP = { e: 0, b: 0, n: 0 };
function sample(X, S) {
  const fx = (X - GX0) / GD, fs = (S - GS0) / GD, i = Math.floor(fx), j = Math.floor(fs);
  if (i < 0 || j < 0 || i >= GW - 1 || j >= GH - 1) { SMP.e = -1; return SMP; }
  const u = fx - i, v = fs - j, k = j * GW + i, a = (1 - u) * (1 - v), b = u * (1 - v), c = (1 - u) * v, d = u * v;
  SMP.e = GE[k] * a + GE[k + 1] * b + GE[k + GW] * c + GE[k + GW + 1] * d;
  SMP.b = GB[k] * a + GB[k + 1] * b + GB[k + GW] * c + GB[k + GW + 1] * d;
  SMP.n = GN[k] * a + GN[k + 1] * b + GN[k + GW] * c + GN[k + GW + 1] * d;
  return SMP;
}
function shagH(X, S, flat) {
  const g = sample(X, S); if (g.e <= 0) return -1;
  let h = g.b * Math.sqrt(sm(g.e, 0, 5));
  const k = pressAt(X, S, flat); if (k > 0) h = lerp(h, 2.4 + g.n, k);
  return h;
}
function shagShade(flat) {
  return (X, S, h, gX, gS, px, py, out) => {
    const w = lit(gX * 1.4, gS * 1.4), k = pressAt(X, S, flat);
    let v = 0.4 + 7.0 * w - 1.6 * (1 - sm(h, 2, 8)) * (1 - k) + 0.6 * k;
    const n = h2(Math.floor(X * 1.1), Math.floor(S * 0.6)); if (n > 0.85) v += 0.7; else if (n < 0.15) v -= 0.8;
    const c = RUG[band(v, 8, px, py)]; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return 1;
  };
}
// fibres: roots on a jittered grid (static list); each one leans its own way, edge fibres hang outward
const FIB = [];
for (let j = -20; j <= 20; j++) for (let i = -32; i <= 32; i++) {
  const X = i * 2.2 + (h2(i, j * 7 + 3) - 0.5) * 2.2, S = j * 2.15 + (h2(i * 3 + 1, j) - 0.5) * 2.1, e = shagEdge(X, S);
  if (e <= 0.3) continue;
  const a = h2(i * 11, j * 5 + 2) * Math.PI * 2, r = h2(i + 3, j * 13);
  const h0 = shagH(X, S, 0), hl = shagH(X - 0.9, S, 0), hr = shagH(X + 0.9, S, 0), hb = shagH(X, S - 0.9, 0), hf = shagH(X, S + 0.9, 0);
  const gX = hl >= 0 && hr >= 0 ? (hr - hl) / 1.8 : 0, gS = hb >= 0 && hf >= 0 ? (hf - hb) / 1.8 : 0;
  FIB.push({ X, S, e, h0, gX, gS, pn: sample(X, S).n, L: 3.4 + r * 2.6, lx: Math.cos(a) * (0.5 + 0.5 * r), ls: Math.sin(a) * (0.5 + 0.5 * r), tone: h2(i * 7, j * 3) - 0.5, curl: (h2(i, j + 99) - 0.5) * 2.6 });
}
const dir = [0, 0, 0];
function fibres(L, V, t, P, flat, split) {
  for (const f of FIB) {
    if (f.h0 < 0) continue;
    const k = pressAt(f.X, f.S, flat), h0 = k > 0 ? lerp(f.h0, 2.4 + f.pn, k) : f.h0, gX = f.gX * (1 - k), gS = f.gS * (1 - k);
    const sw = wind(t, P, f.X) * 0.6 * (1 - k);
    // standing: up, splayed along the lump's slope; edge fibres droop outward; pressed: lying along the swirl round the centre
    const edge = 1 - sm(f.e, 0.5, 6), d = Math.hypot(f.X, f.S) || 1;
    let ux = f.lx * 0.7 - gX * 1.7 + sw * 0.45, uy = 1, us = f.ls * 0.7 - gS * 1.7;
    if (edge > 0) { const ox = f.X / d, os = f.S / d; ux = lerp(ux, ox * 1.4, edge); us = lerp(us, os * 1.4, edge); uy = lerp(1, -0.15, edge); }
    if (k > 0) { const tx = -f.S / d, ts = f.X / d, inw = 0.25; ux = lerp(ux, tx - inw * f.X / d, k); us = lerp(us, ts - inw * f.S / d, k); uy = lerp(uy, 0.12, k); }
    const n = Math.hypot(ux, uy, us); dir[0] = ux / n; dir[1] = uy / n; dir[2] = us / n;
    const Lf = f.L * (1 - 0.1 * k), cx = f.curl * (1 - k * 0.6);
    const P0 = [f.X, h0 - 0.8, f.S], P2 = [f.X + dir[0] * Lf, h0 + dir[1] * Lf, f.S + dir[2] * Lf];
    const P1 = [f.X + dir[0] * Lf * 0.3 + cx, h0 + dir[1] * Lf * 0.7, f.S + dir[2] * Lf * 0.3];
    const w = lit(gX * 1.5, gS * 1.5), base = -0.6 + 6.0 * w + f.tone * 1.0 + (sm(h0, 2.5, 8) - 0.5) * 3.2 * (1 - k) + 0.5 * k;
    stroke(L, V, P0, P1, P2, 1.4, 0.8, (tt, side) => RUG[Math.max(1, Math.min(8, Math.round(base + tt * 1.8 - side * 0.8)))], split);
  }
}
/** A few fibres flying up out of the rug while the dog digs (amplitude ∝ dig; they leave and land in the pile). */
function digBits(L, V, t, P, dig, flat, at, split) {
  for (let i = 0; i < 11; i++) {
    const life0 = 0.62 + h2(i, 401) * 0.3, n = Math.max(1, Math.round(P / life0)), life = P / n;
    const u = ((t / life + h2(i, 402)) % 1 + 1) % 1, cyc = ((Math.floor(t / life + h2(i, 402)) % n) + n) % n;   // loop-safe: t and t + P match
    const X0 = at + (h2(i * 7 + cyc, 403) - 0.5) * 34, S0 = 6 + (h2(i, 404 + cyc) - 0.5) * 22;
    const vx = (h2(i, 405 + cyc) - 0.5) * 60, up = 30 + h2(i, 406 + cyc) * 30;
    const hs = shagH(X0, S0, flat), X = X0 + vx * u * dig, H = Math.max(0, hs) + up * 4 * u * (1 - u) * dig, S = S0 + 4 * u;
    if (H < hs + 1.5) continue;
    const ang = u * 7 + i, cl = 3.4, dx = Math.cos(ang) * cl, dy = Math.sin(ang) * cl;
    const A = [X - dx, H - dy, S], B = [X + dy * 0.7, H + dx * 0.7, S], C = [X + dx, H + dy, S];
    stroke(L, V, A, B, C, 2.4, 1.8, () => RUG[3], split);
    stroke(L, V, A, B, C, 1.2, 0.9, (tt) => RUG[tt < 0.5 ? 6 : 8], split);
  }
}

// ---------------------------------------------------------------- render + API
const CACHE = [];
function render(c, G, x, y, t, o) {
  const kind = o.kind === "shaggy" ? "shaggy" : "smooth", split = o.split ?? 4, side = o.splitSide ?? 0.5;
  const flat = clamp01(o.flat ?? 0), dig = clamp01(o.dig ?? 0), P = o.period ?? 8, at = o.digX ?? 0;
  const tk = kind === "shaggy" ? t : 0, rad = o.radius ?? MAT.shaggy.nest;   // the smooth mat is still: cached across frames
  const key = keyOf(c, G, x, y, `${kind}|${split}|${side}|${flat}|${dig}|${P}|${at}|${tk}|${rad}`);
  NEST_R = rad;
  return memo(CACHE, key, (L) => {
    const V = viewOf(G, x, y), M = MAT[kind], sp = splitRule(split, side, 36);
    if (!frameFor(L, c, V, -M.w - 10, M.w + 10, -M.d - 10, M.d + 10, kind === "shaggy" ? 50 : 8)) return null;
    if (kind === "smooth") {
      heightfield(L, V, { X0: -M.w, X1: M.w, S0: -M.d, S1: M.d, h: smoothH, shade: smoothShade, split: sp, crease: () => null });
      outline(L, () => OUT_S);
      // knotted fringe on the two short ends, lying on the lawn
      for (const sx of [-1, 1]) for (let s = -M.d + 4; s <= M.d - 4; s += 3.4) {
        const r = h2(Math.round(s * 10), sx + 7), X0 = sx * (M.w - 0.5), L5 = 5 + r * 1.6, a = (r - 0.5) * 0.5;
        stroke(L, V, [X0, 0.8, s], [X0 + sx * L5 * 0.5, 0.5, s + a * 2], [X0 + sx * L5, 0.3, s + a * 4], 1.0, 0.8, (tt, sd) => OAT[Math.max(1, Math.min(4, Math.round(3.4 - sd * 0.8 - tt * 0.4)))], sp);
      }
    } else {
      heightfield(L, V, { X0: -M.w - 1, X1: M.w + 1, S0: -M.d - 1, S1: M.d + 1, h: (X, S) => shagH(X, S, flat), shade: shagShade(flat), split: sp, crease: () => RUG[2] });
      outline(L, () => OUT_R);
      fibres(L, V, t, P, flat, sp);
      if (dig > 0) digBits(L, V, t, P, dig, flat, at, sp);
    }
    return L;
  });
}

/** World y offset of the seat (lawn point of the dog lying on the mat): smooth −2.4; shaggy sinks from −6.5 to −2.8 as flat → 1. */
export function matSeat(o = {}) { return o.kind === "shaggy" ? -lerp(6.5, 2.8, clamp01(o.flat ?? 0)) : -MAT.smooth.T; }

/**
 * BACK part of a mat (draw BEFORE the dog). (x, y) = lawn point under the mat centre; t = time (s). o:
 *   kind "smooth" (flat, tight-woven striped mat, 140 × 84, 2.4 thick, knotted fringe) | "shaggy" (lumpy rug 136 × 84,
 *   pile 5.5 + lumps up to ≈ 4.8, fibres 5–9 long that sway with the park wind);
 *   flat 0..1 (shaggy) — a flattened round patch grows from the centre (radius o.radius, default 52, at 1): lumps pressed,
 *     fibres lie in a swirl;
 *   dig 0..1 (shaggy) — a few fibres fly up out of the pile (driven by t), digX — where (world x offset, default 0);
 *   period — loop period P (s) for the sway / flying fibres (default 8); split / splitSide — BACK/FRONT depth rule
 *   (S > split + splitSide·max(0, |X| − 36) is FRONT; defaults 4 / 0.5); a — dissolve.
 * Returns { seat: [sx, sy], box }.
 */
export function matBack(c, G, x, y, t = 0, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const z = G.z, M = o.kind === "shaggy" ? MAT.shaggy : MAT.smooth;
  const L = render(c, G, x, y, t, o);
  groundShadow(c, G.X(x) + 3 * z, G.Y(y) + 1.5 * z, (M.w + 5) * z, (M.d * KS + 3) * z, o.kind === "shaggy" ? 0.45 : 0.32, undefined, L, a);
  emit(c, L, 0, a);
  return { seat: [G.X(x), G.Y(y + matSeat(o))], box: L ? [L.x0, L.y0, L.w, L.h] : null };
}
/** FRONT part of a mat (draw AFTER the dog): the near edge, and for the shaggy rug the near fibres over the dog's paws. */
export function matFront(c, G, x, y, t = 0, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const L = render(c, G, x, y, t, o); emit(c, L, 1, a);
  return { seat: [G.X(x), G.Y(y + matSeat(o))], box: L ? [L.x0, L.y0, L.w, L.h] : null };
}
