// Dog series kit · film 3 · «long ago»: a patch of TALL wild grass that the circling animal presses flat into a swirled
// nest — or the same patch as deep snow with a round pressed hollow. World units through G (nest-hf.mjs frame).
// Pure functions of their arguments (t drives the wind; periodic with o.period).
import { KS, lit, band, ramp, sm, clamp01, lerp, h2, vnoise, by, heightfield, splitRule, outline, stroke, emit, memo, keyOf, viewOf, frameFor, groundShadow, Layers } from "./nest-hf.mjs";
import { wind } from "./park-geo.mjs";

/** Patch geometry (world units): ellipse 220 × 164 of roots; nest circle radius 58; snow mound 26 high. */
export const GRASS = { ax: 110, as: 82, nest: 58, hmax: 90, snowH: 26, floor: 6 };
const { ax: AX, as: AS } = GRASS;

// ---------------------------------------------------------------- palettes (exported so the lead can grade them)
export const GRASS_PAL = {
  meadow: ramp(["#123A18", "#1C5020", "#2A682A", "#3E8434", "#58A040", "#78BC52", "#9CD26A"]),
  yellow: ramp(["#2E3A12", "#465A1A", "#627A22", "#82982E", "#A2B440", "#C2CC5C", "#DCE084"]),
  teal: ramp(["#0E3428", "#164A36", "#206446", "#2E7E58", "#44986C", "#62B286", "#8ACCA4"]),
  straw: ramp(["#4A4416", "#6E6A22", "#929030", "#B2AE48", "#CCC866", "#E2DC8A", "#F2ECB4"]),
  seed: ramp(["#4E3A16", "#7E6026", "#A8863A", "#C8A858", "#E0C67A", "#F2E0A4"]),
  ground: ramp(["#102A12", "#173818", "#20471E", "#2B5826", "#386A2E"]),
  snow: ramp(["#26304E", "#3A4874", "#56689C", "#7A8EC0", "#A2B4DA", "#C4D4EC", "#E2ECF8", "#FAFDFF"]),
};
const P = GRASS_PAL, BLADE_R = [P.meadow, P.yellow, P.teal];

// ---------------------------------------------------------------- the blades (static list, deterministic)
const BL = [];
{
  const cw = 5.4;
  for (let j = Math.floor(-AS / cw); j <= Math.ceil(AS / cw); j++) for (let i = Math.floor(-AX / cw); i <= Math.ceil(AX / cw); i++) {
    const X = (i + h2(i, j * 3 + 11)) * cw, S = (j + h2(i * 7 + 2, j)) * cw, rho = Math.hypot(X / AX, S / AS);
    if (rho > 1) continue;
    const r1 = h2(i * 13, j * 5 + 1), r2 = h2(i + 41, j * 11), r3 = h2(i * 3 + 9, j * 17), r4 = h2(i, j + 333);
    let H = 70 + 20 * r1;
    H *= 0.42 + 0.58 * sm(1 - rho, 0, 0.5);                                    // shorter toward the rim of the patch
    H *= 1 - 0.58 * sm(S, 8, 72) * (1 - 0.65 * sm(Math.abs(X), 40, 100));       // the near-centre stays low (the dog stays visible)
    H *= 0.8 + 0.4 * h2(i * 29 + 5, j * 31 + 7);                                  // ragged tops
    const seed = r4 < 0.075 && rho < 0.92, a = r2 * Math.PI * 2, lean = 0.12 + 0.3 * r2 * (0.6 + 0.8 * sm(S, 20, 80));
    BL.push({ X, S, rho, r: Math.hypot(X, S), H: seed ? H * 1.1 + 6 : H, w: seed ? 0.9 : 1.35 + r3 * 0.95, ramp: Math.floor(r3 * 2.999), tone: r1 - 0.5,
      lx: Math.cos(a) * lean + (h2(i, j) - 0.5) * 0.3, ls: Math.sin(a) * 0.18, rnd: r4, ph: r2 * 6.28, seed, curl: (r3 - 0.5) * 0.5 });
  }
  BL.sort((a, b) => a.S - b.S);
}

const rotY = (x, s, b) => { const c = Math.cos(b), n = Math.sin(b); return [x * c - s * n, x * n + s * c]; };
/** Draw every blade into the buffer. flat bends the blades inside the nest circle into a swirl; the rim leans out. */
function blades(L, V, t, Pp, flat, R, sp) {
  for (const b of BL) {
    const sw = wind(t, Pp, b.X) + 0.25 * Math.sin(b.ph + (t * 2 * Math.PI * Math.max(1, Math.round(Pp / 2.6))) / Pp);
    // bend: inside the circle → lies flat along the swirl; just outside → pushed outward a little
    const rr = b.r / R, gIn = flat * 1.4 - 0.32 * Math.min(1.2, rr) - 0.12 * b.rnd;
    let fb = rr < 1 ? sm(gIn, 0, 0.8) : 0;
    const push = flat * (1 - sm(b.r, R - 3, R + 16)) * (rr >= 1 ? 1 : 1 - fb);
    let alpha = fb * 1.5 + push * 0.62, dx, ds;
    const d = b.r || 1;
    if (rr < 1) { const tx = -b.S / d, ts = b.X / d; dx = lerp(b.X / d, tx * 0.94 - 0.34 * b.X / d, fb); ds = lerp(b.S / d, ts * 0.94 - 0.34 * b.S / d, fb); if (fb < 0.01) { dx = b.X / d; ds = b.S / d; } }
    else { dx = b.X / d; ds = b.S / d; }
    { const n = Math.hypot(dx, ds) || 1; dx /= n; ds /= n; }
    alpha = Math.min(1.52, alpha);
    const H = b.H * (1 - 0.08 * fb), up = Math.cos(alpha), out = Math.sin(alpha), stand = 1 - Math.min(1, fb + push * 0.5);
    const lx = (b.lx + sw * 0.16) * stand, ls = b.ls * stand;
    // swirl curvature: lying blades follow the circle (tip rotated round the centre)
    const beta = fb * Math.min(1.1, (H * 0.55) / Math.max(10, b.r));
    const [tdx, tds] = rotY(dx, ds, beta), [mdx, mds] = rotY(dx, ds, beta * 0.5);
    const lieH = (0.8 + 2.2 * b.rnd) * fb;
    const P0 = [b.X, 0, b.S];
    const P2 = [b.X + H * (out * tdx + lx), Math.max(lieH, H * up), b.S + H * (out * tds + ls)];
    const P1 = [b.X + H * 0.5 * (Math.sin(alpha * 0.55) * mdx + lx * 0.3) + b.curl * H * 0.1 * stand, Math.max(lieH * 1.2, H * 0.62 * Math.cos(alpha * 0.55)), b.S + H * 0.5 * (Math.sin(alpha * 0.55) * mds + ls * 0.3)];
    if (b.seed) {
      const Rr = P.straw, base = 2.2 + b.tone + fb * 1.4;
      stroke(L, V, P0, P1, P2, b.w, 0.7, (tt, s) => Rr[Math.max(1, Math.min(6, Math.round(base + tt * 1.5 - s * 0.6)))], sp);
      // the seed head: a golden spindle on the last quarter of the stem
      const q = (u) => { const v = 1 - u; return [0, 1, 2].map((k) => v * v * P0[k] + 2 * v * u * P1[k] + u * u * P2[k]); };
      const A = q(0.74), M = q(0.87), Z = [P2[0] + (P2[0] - M[0]) * 0.15, P2[1] + (P2[1] - M[1]) * 0.15, P2[2] + (P2[2] - M[2]) * 0.15];
      const SR = P.seed, sb = 2.4 + fb;
      stroke(L, V, A, q(0.8), M, 1.4, 3.0, (tt, s) => SR[Math.max(0, Math.min(5, Math.round(sb + 0.6 - s * 1.1 + (s === 0 ? (((tt * 9) | 0) & 1) * 0.6 : 0))))], sp);
      stroke(L, V, M, q(0.94), Z, 3.0, 1.0, (tt, s) => SR[Math.max(0, Math.min(5, Math.round(sb + 0.9 - s * 1.1 + (s === 0 ? (((tt * 9) | 0) & 1) * 0.6 : 0))))], sp);
      continue;
    }
    const Rr = fb > 0.55 ? P.straw : BLADE_R[b.ramp], base = 1.6 + b.tone * 1.6 + fb * 1.6 + (b.S < 0 ? -0.4 : 0.2);
    stroke(L, V, P0, P1, P2, b.w, 0.55, (tt, s) => Rr[Math.max(0, Math.min(6, Math.round(base + tt * 2.8 - s * 1.0 - (1 - tt) * (1 - fb) * 0.8)))], sp);
  }
}

// ---------------------------------------------------------------- ground under the grass (matted, shaded)
function groundShade(X, S, h, gX, gS, px, py, out) {
  const rho = Math.hypot(X / AX, S / AS); if (rho > 1.04) return 0;
  if (rho > 0.84 && by(px, py) < (rho - 0.84) / 0.2) return 0;       // dithered edge into the lawn
  let v = 1.6 + 1.6 * (rho - 0.4) + 0.5 * vnoise(X / 9, S / 6, 4);
  if (h2(Math.floor(X * 0.7), Math.floor(S * 0.4)) > 0.86) v += 0.8;
  const c = P.ground[band(v, 4, px, py)]; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return 1;
}

// ---------------------------------------------------------------- snow
// static drift detail on a 1-unit grid (noise lumps N, wind ripples Q), sampled bilinearly
const SW = 2 * AX + 3, SH = 2 * AS + 3, SN = new Float32Array(SW * SH), SQ = new Float32Array(SW * SH);
for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
  const X = i - AX - 1, S = j - AS - 1, rip = Math.sin(X * 0.085 + S * 0.05 + 2.2 * vnoise(X / 30, S / 20, 3));
  SN[j * SW + i] = 3.4 * vnoise(X / 22, S / 15, 11); SQ[j * SW + i] = 1.9 * (Math.abs(rip) - 0.5);
}
function snowH(X, S, flat, R) {
  const rho2 = (X / AX) ** 2 + (S / AS) ** 2; if (rho2 >= 1) return -1;
  const e = 1 - rho2, fx = X + AX + 1, fs = S + AS + 1, i = Math.min(SW - 2, Math.floor(fx)), j = Math.min(SH - 2, Math.floor(fs)), u = fx - i, v = fs - j, k = j * SW + i;
  const a = (1 - u) * (1 - v), b = u * (1 - v), c = (1 - u) * v, d = u * v;
  const nz = SN[k] * a + SN[k + 1] * b + SN[k + SW] * c + SN[k + SW + 1] * d, rq = SQ[k] * a + SQ[k + 1] * b + SQ[k + SW] * c + SQ[k + SW + 1] * d;
  const se = Math.sqrt(e);
  let h = GRASS.snowH * se * (0.82 + 0.18 * e) + nz * e + rq * se;
  if (flat > 0) {
    const d = Math.hypot(X, S * 1.05), F = GRASS.floor + 1.6 * (d / R) ** 2, wall = F + (h - F) * sm(d, R - 9, R + 1);
    h = lerp(h, Math.min(h, wall), flat) + flat * 3.2 * Math.exp(-(((d - R - 4) / 5) ** 2)) * e;
  }
  return Math.max(0, h);
}
function snowShade(t, Pp, flat, R) {
  return (X, S, h, gX, gS, px, py, out) => {
    const w = lit(gX * 1.2, gS * 1.2), d = Math.hypot(X, S * 1.05);
    let v = 0.4 + 7.4 * Math.pow(w, 1.3) - flat * 1.2 * (1 - sm(d, R - 14, R - 2));
    const cx = Math.floor(X * 0.6), cs = Math.floor(S * 0.32 + h * 0.6), n = h2(cx * 3 + 1, cs * 7 + 5);
    if (n > 0.975 && w > 0.8) { const tw = Math.sin((t * 2 * Math.PI * Math.max(1, Math.round(Pp / 1.7))) / Pp + n * 900); if (tw > 0.2) v += 2.2; }
    else if (n < 0.05) v -= 0.5;
    const c = P.snow[band(v, 7, px, py)]; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return 1;
  };
}

// ---------------------------------------------------------------- render (grass, snow, or a dithered crossfade of both)
const CACHE = [], TMP = new Layers();
function renderGrass(L, V, t, Pp, flat, R, sp) {
  heightfield(L, V, { X0: -AX - 4, X1: AX + 4, S0: -AS - 4, S1: AS + 4, h: (X, S) => (Math.hypot(X / AX, S / AS) < 1.05 ? 0 : -1), shade: groundShade, split: sp, noWall: true, crease: null });
  blades(L, V, t, Pp, flat, R, sp);
}
function renderSnow(L, V, t, Pp, flat, R, sp) {
  heightfield(L, V, { X0: -AX, X1: AX, S0: -AS, S1: AS, h: (X, S) => snowH(X, S, flat, R), shade: snowShade(t, Pp, flat, R), split: sp, crease: () => P.snow[2] });
  outline(L, () => P.snow[1]);
  // a few dry stalks of the buried grass poke out of the drift (not inside the pressed hollow)
  for (const b of STALKS) {
    const d = Math.hypot(b.X, b.S * 1.05); if (flat > 0 && d < R + 6 && b.k < flat * 1.4) continue;
    const h0 = snowH(b.X, b.S, flat, R); if (h0 < 0) continue;
    const sw = wind(t, Pp, b.X) * 0.12, H = b.H, base = 2.4 + b.tone;
    stroke(L, V, [b.X, h0 - 1, b.S], [b.X + (b.lx + sw * 0.5) * H * 0.4, h0 + H * 0.6, b.S], [b.X + (b.lx + sw) * H, h0 + H, b.S + b.ls * H], b.w, 0.5, (tt, sd) => P.straw[Math.max(1, Math.min(6, Math.round(base + tt * 1.6 - sd * 0.9)))], sp);
  }
}
const STALKS = [];
for (let i = 0; i < 60; i++) {
  const a = h2(i, 901) * Math.PI * 2, rho = 0.5 + 0.42 * h2(i, 902), X = Math.cos(a) * rho * AX, S = Math.sin(a) * rho * AS;
  if (S > -12 && Math.abs(X) < 72) continue;                       // keep the dog's face clear
  STALKS.push({ X, S, H: 9 + h2(i, 903) * 16, w: 0.9 + h2(i, 904) * 0.6, lx: (h2(i, 905) - 0.5) * 0.7, ls: (h2(i, 906) - 0.5) * 0.3, tone: h2(i, 907) - 0.5, k: h2(i, 908) });
}
function render(c, G, x, y, t, o) {
  const flat = clamp01(o.flat ?? 0), snow = clamp01(o.snow ?? 0), Pp = o.period ?? 8, R = o.radius ?? GRASS.nest;
  const split = o.split ?? 2, side = o.splitSide ?? 0.45;
  const key = keyOf(c, G, x, y, `${flat}|${snow}|${Pp}|${R}|${split}|${side}|${t}`);
  return memo(CACHE, key, (L) => {
    const V = viewOf(G, x, y), sp = splitRule(split, side, 40);
    const fr = (B) => frameFor(B, c, V, -AX - 40, AX + 40, -AS - 4, AS + 30, GRASS.hmax + 30);
    if (!fr(L)) return null;
    if (snow >= 1) { renderSnow(L, V, t, Pp, flat, R, sp); return L; }
    renderGrass(L, V, t, Pp, flat, R, sp);
    if (snow <= 0) return L;
    fr(TMP); renderSnow(TMP, V, t, Pp, flat, R, sp);
    for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {        // complementary Bayer gates: snow wins where bayer < snow
      if (by(L.x0 + i, L.y0 + j) >= snow) continue;
      const k = j * L.w + i;
      for (let l = 0; l < 2; l++) { L.cov[l][k] = TMP.cov[l][k]; if (TMP.cov[l][k]) { L.col[l][k * 3] = TMP.col[l][k * 3]; L.col[l][k * 3 + 1] = TMP.col[l][k * 3 + 1]; L.col[l][k * 3 + 2] = TMP.col[l][k * 3 + 2]; } }
    }
    return L;
  });
}

/** World y offset of the seat (the dog's lawn point): grass −2.2·flat (the pressed blades); snow: 0 (wading, paws in the
 *  snow) → −6 (the floor of the pressed hollow) as flat → 1; blended by snow. */
export function grassSeat(o = {}) { const f = clamp01(o.flat ?? 0), s = clamp01(o.snow ?? 0); return lerp(-2.2 * f, -GRASS.floor * f, s); }

/**
 * BACK part of the patch (draw BEFORE the dog): shaded ground, blades rooted behind the dog, the far snow and the hollow.
 * (x, y) = lawn point at the centre (where the dog circles); t = time (s). o:
 *   flat 0..1 — blades inside the nest circle (radius o.radius, default 58) bend down and lie flat in a counter-clockwise
 *     swirl (pressed straw-green), blades just outside lean outward; snow: a round hollow is pressed into the mound;
 *   snow 0..1 — the same patch as a deep snow mound (26 high, drifts, twinkles); in-between values crossfade (Bayer gates);
 *   dusk 0..1 — «long ago, at dusk» sepia-violet grade (duskTint); period — wind loop period P (s), default 8;
 *   split / splitSide — BACK/FRONT depth rule (S > split + splitSide·max(0, |X| − 40) is FRONT; defaults 2 / 0.45); a — dissolve.
 * Returns { seat: [sx, sy], box }.
 */
export function grassBack(c, G, x, y, t = 0, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const z = G.z, snow = clamp01(o.snow ?? 0);
  const L = render(c, G, x, y, t, o);
  if (snow > 0) groundShadow(c, G.X(x) + 4 * z, G.Y(y) + 2 * z, (AX + 4) * z, (AS * KS + 3) * z, 0.4, [24, 30, 60], L, a * snow);
  emit(c, L, 0, a, o.dusk ?? 0);
  return { seat: [G.X(x), G.Y(y + grassSeat(o))], box: L ? [L.x0, L.y0, L.w, L.h] : null };
}
/** FRONT part (draw AFTER the dog): blades rooted in front of it (low in the near middle), the near snow wall. */
export function grassFront(c, G, x, y, t = 0, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const L = render(c, G, x, y, t, o); emit(c, L, 1, a, o.dusk ?? 0);
  return { seat: [G.X(x), G.Y(y + grassSeat(o))], box: L ? [L.x0, L.y0, L.w, L.h] : null };
}
