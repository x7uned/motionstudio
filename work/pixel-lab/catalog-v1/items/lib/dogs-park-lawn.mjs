// catalog-v1 copy (2026-10-26) of work/pixel-lab/dogs/kit/park-lawn.mjs; changes: import paths only.
// Dog series park (2026-10-23) · the lawn. Three parts:
//  · floor(S, cam, t, P) — the lawn BELOW the lawn line toward the viewer (park-geo floor model): rich dithered greens
//    with soft mottled patches, world-anchored grass blades growing bigger in the nearer rows, clover, daisies,
//    dandelions, violets, speedwell and two stones (all outside the clear action zone near the lawn line).
//  · backLawn(S, cam, shadows) — the lawn strip BEHIND the actors (rows between the far hills and the lawn line): each row
//    is the lawn at depth p of layout's layer(cam, p), hazier with distance, with a winding sandy path at the far edge.
//  · front(c, cam, t, P) — grass ON the lawn line (covers paws and the lower third of the resting ball) and big foreground
//    tufts / flowers along the bottom (floor depth q 1.15–1.6). Drawn straight through c.px (works through gate/fade views).
import { LAYOUT } from "./dogs-park-layout.mjs";
import { ramp, rgb, mixc, band, dith, by, h1, h2, blade } from "./dogs-park-px.mjs";
import { floorOf, backRows, wind, DIST } from "./dogs-park-geo.mjs";
import { layer, ground } from "./dogs-park-layout.mjs";

export const LAWN = ramp(["#13451B", "#195420", "#206526", "#29772B", "#348A31", "#419C37", "#50AC3E", "#62BA47", "#78C752", "#90D25F", "#AADC72"]);
const NL = LAWN.length - 1;
const HAZE = rgb("#B8DCC8");
export const CLEAR = { x0: -320, x1: 300, q: 1.15 };       // keep the near lawn free of clutter here (action zone)

// ---------------------------------------------------------------- smooth value noise (periodic tile, bilinear)
const NT = 64, NV = new Float32Array(NT * NT);
for (let i = 0; i < NT * NT; i++) NV[i] = h2(i, 4242) * 2 - 1;
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const x0 = xi & 63, x1 = (xi + 1) & 63, y0 = (yi & 63) * NT, y1 = ((yi + 1) & 63) * NT;
  const a = NV[y0 + x0], b = NV[y0 + x1], c = NV[y1 + x0], d = NV[y1 + x1];
  return a + (b - a) * ux + (c - a + (a - b + d - c) * ux) * uy;
}
/** Lawn tone (ramp index, continuous) at world u, depth s along the floor, magnification q. */
export function lawnTone(u, s, q) {
  const st = Math.sin(u * 0.0349 + 0.6), stripe = st > 0.25 ? 0.42 : st < -0.25 ? -0.42 : st * 1.68;   // soft mowing stripes
  return 6.7 - 6.4 * (1 - 1 / q) + 1.2 * vnoise(u / 74, s / 42 + 7.3) + 0.5 * vnoise(u / 23 + 17, s / 15) + stripe;
}

// ---------------------------------------------------------------- floor features (world-anchored, deterministic)
const FLOWERS = { daisy: [rgb("#FFFFFF"), rgb("#D8DCF0"), rgb("#F6CE3A")], dandelion: [rgb("#FFE04A"), rgb("#E8B820"), rgb("#FFF29A")], violet: [rgb("#9A6AE2"), rgb("#6A3EB4"), rgb("#F4E27A")], speedwell: [rgb("#6E98F4"), rgb("#4466C8"), rgb("#FFFFFF")], clover: [rgb("#F4F2FA"), rgb("#CFC6E6"), rgb("#E6DDF4")] };
const STONE = ramp(["#3E4450", "#5C6370", "#7C8490", "#9CA4AE", "#BCC2CA"]);
const FEATS = [];
{
  // scattered flowers in drifts (cells of 46 × 40 world units over the near lawn), never in the clear zone near the line
  for (let j = 0; j < 30; j++) for (let i = -60; i <= 60; i++) {
    const s0 = j * 26, k = h2(i * 31 + 7, j * 17 + 3);
    const drift = vnoise(i * 0.31 + 3, j * 0.37 + 11);                 // flower drifts: dense in some places, none in others
    if (k > 0.22 + drift * 0.55) continue;
    const u = i * 46 + h2(i, j + 77) * 46, s = s0 + h2(i + 5, j) * 26, q = DIST / (DIST - s);
    if (q < 1.04) continue;
    if (q < CLEAR.q + 0.05 && u > CLEAR.x0 - 30 && u < CLEAR.x1 + 30) continue;
    const r = h2(i * 3, j * 7);
    const kind = r < 0.36 ? "daisy" : r < 0.56 ? "dandelion" : r < 0.72 ? "clover" : r < 0.86 ? "violet" : "speedwell";
    FEATS.push({ kind, u, s, seed: i * 1000 + j });
    if (kind === "daisy" || kind === "speedwell") for (let m = 0; m < 2; m++) FEATS.push({ kind, u: u + (h2(i + m, j * 3) - 0.5) * 20, s: s + (h2(i, j + m * 5) - 0.5) * 8, seed: i * 1000 + j + 300 + m });
  }
  // clover patches (darker trefoil leaves)
  for (let j = 0; j < 14; j++) for (let i = -30; i <= 30; i++) {
    if (h2(i * 13 + 1, j * 29 + 5) > 0.2) continue;
    const u0 = i * 90 + h2(i, j) * 60, s0 = 30 + j * 52 + h2(j, i) * 30, q = DIST / (DIST - s0);
    if (q < CLEAR.q + 0.04 && u0 > CLEAR.x0 - 40 && u0 < CLEAR.x1 + 40) continue;
    for (let m = 0; m < 9; m++) FEATS.push({ kind: "leaf", u: u0 + (h2(i * 7 + m, j) - 0.5) * 36, s: s0 + (h2(i, j * 7 + m) - 0.5) * 16, seed: i * 77 + j * 13 + m });
  }
  // two stones: one by the bench (left), one in the right foreground
  FEATS.push({ kind: "stone", u: -455, s: 70, r: 7, seed: 1 }, { kind: "stone", u: -442, s: 76, r: 4, seed: 2 }, { kind: "stone", u: 420, s: 380, r: 10, seed: 3 });
  FEATS.sort((a, b) => a.s - b.s);
}

function drawFeature(set, F, f, t, P) {
  const q = F.qOfS(f.s), z = F.zq(q), x = F.X(f.u, q), y = F.row(q);
  if (x < -40 * z || x > 540 + 40 * z || y > 1000 + 30 * z) return;
  const sway = wind(t, P, f.u) * 0.45 * z, R = Math.round;
  if (f.kind === "stone") {
    const rx = f.r * z, ry = f.r * z * 0.62, ox = R(x), oy = R(y);
    for (let Y = R(y - ry * 1.3); Y <= R(y + ry * 0.35); Y++) for (let X = R(x - rx - 1); X <= R(x + rx + 1); X++) {
      const dx = (X + 0.5 - x) / rx, dy = (Y + 0.5 - (y - ry * 0.45)) / (ry * 0.95), d = dx * dx + dy * dy; if (d > 1) continue;
      const edge = d > 1 - 2.2 / Math.max(3, rx), l = -(dx * 0.55 + dy * 0.85);
      set(X, Y, edge ? STONE[0] : STONE[band(2.2 + l * 1.6 + (h2(X - ox, Y - oy) - 0.5) * 0.5, 4, X - ox, Y - oy)]);
    }
    for (let k = -3; k <= 3; k++) blade(set, x + k * rx * 0.33, y + ry * 0.3, (3 + h2(f.seed, k) * 4) * z, z * 0.9, sway * 0.6 + k * 0.4 * z, [LAWN[2], LAWN[5], LAWN[8]]);
    return;
  }
  if (f.kind === "leaf") {                                            // trefoil clover leaf on a short stem
    const r = 1.25 * z, cy = y - 2.2 * z, cx = x + sway * 0.3, dark = LAWN[3], mid = LAWN[5], hi = LAWN[7];
    if (z >= 1.5) blade(set, x, y, 2.2 * z, Math.max(1, z * 0.5), sway * 0.3, [LAWN[2], LAWN[3], LAWN[4]]);
    for (const [dx, dy] of [[-1.15, 0.2], [1.15, 0.2], [0, -1.05]]) {
      const lx = cx + dx * r, ly = cy + dy * r, rr = r * 1.02;
      for (let Y = Math.floor(ly - rr); Y <= Math.ceil(ly + rr); Y++) for (let X = Math.floor(lx - rr); X <= Math.ceil(lx + rr); X++) {
        const ex = X + 0.5 - lx, ey = Y + 0.5 - ly, d = Math.hypot(ex, ey); if (d > rr + 0.2) continue;
        set(X, Y, rr > 2.2 && d > rr - 0.9 ? dark : ey < -rr * 0.2 && ex < 0 ? hi : mid);
      }
    }
    return;
  }
  const [pc, pd, ec] = FLOWERS[f.kind], h = (f.kind === "daisy" ? 6 : f.kind === "dandelion" ? 7 : 4.5) * (0.8 + h1(f.seed) * 0.5) * z;
  const fx = x + sway, fy = y - h;
  blade(set, x, y, h, Math.max(1, z * 0.55), sway, [LAWN[2], LAWN[3], LAWN[5]]);
  if (z * q > 1.25 && f.kind !== "clover") { blade(set, x - 0.8 * z, y, h * 0.45, z * 0.9, -1.3 * z, [LAWN[2], LAWN[4], LAWN[6]]); blade(set, x + 0.8 * z, y, h * 0.38, z * 0.9, 1.3 * z, [LAWN[2], LAWN[4], LAWN[6]]); }
  const r = (f.kind === "daisy" ? 1.9 : f.kind === "dandelion" ? 1.7 : f.kind === "clover" ? 1.5 : 1.3) * z;
  if (r < 1.1) { set(R(fx), R(fy), pc); set(R(fx) + 1, R(fy), pc); set(R(fx), R(fy) - 1, pc); return; }
  if (f.kind === "dandelion" || f.kind === "clover") {
    for (let Y = Math.floor(fy - r); Y <= Math.ceil(fy + r); Y++) for (let X = Math.floor(fx - r); X <= Math.ceil(fx + r); X++) {
      const dx = X + 0.5 - fx, dy = Y + 0.5 - fy, d = Math.hypot(dx, dy); if (d > r) continue;
      set(X, Y, d > r - 1 && dy > 0 ? pd : dy < -r * 0.25 && dx < r * 0.2 ? ec : pc);
    }
    return;
  }
  // five petals around a centre (daisy, violet, speedwell)
  const n = 5;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / n + h1(f.seed) * 0.6, px = fx + Math.cos(a) * r * 0.95, py = fy + Math.sin(a) * r * 0.62, pr = r * 0.62;
    for (let Y = Math.floor(py - pr); Y <= Math.ceil(py + pr); Y++) for (let X = Math.floor(px - pr); X <= Math.ceil(px + pr); X++) { const d = Math.hypot(X + 0.5 - px, Y + 0.5 - py); if (d <= pr + 0.25) set(X, Y, Y + 0.5 > fy + r * 0.2 ? pd : pc); }
  }
  const er = Math.max(0.7, r * 0.38);
  for (let Y = Math.floor(fy - er); Y <= Math.ceil(fy + er); Y++) for (let X = Math.floor(fx - er); X <= Math.ceil(fx + er); X++) if (Math.hypot(X + 0.5 - fx, Y + 0.5 - fy) <= er + 0.3) set(X, Y, ec);
}

// ---------------------------------------------------------------- the near floor (stage 1, nearest of everything)
const CU = 3, CS = 4;   // blade cell size at the lawn line (world units: across, in depth); cells widen in nearer rows
let TONE = null, SAMP = null;
/** Wind sampled every 4 world units across the visible span (blades read it instead of three sines each). */
function windTable(t, P, u0, u1) { const n = Math.ceil((u1 - u0) / 4) + 2, a = new Float32Array(n); for (let k = 0; k < n; k++) a[k] = wind(t, P, u0 + k * 4); return (u) => { const f = (u - u0) / 4, k = Math.max(0, Math.min(n - 2, Math.floor(f))), r = Math.max(0, Math.min(1, f - k)); return a[k] + (a[k + 1] - a[k]) * r; }; }
export function floor(S, cam, t, P, shadows = []) {
  const F = floorOf(cam), L = F.L, z = F.z, W = S.w, H = S.h, D = S.d, O = S.o, y0 = Math.max(0, Math.ceil(L - 0.5));
  if (!TONE || TONE.length !== W * H) { TONE = new Float32Array(W * H); SAMP = new Float32Array((W >> 2) + 3); }
  // 1) base tones (patches, stripes, depth gradient; sampled every 4 px and interpolated), dithered bands anchored to
  //    each row's own scroll so nothing crawls while the camera pans
  for (let Y = y0; Y < H; Y++) {
    const q = F.q(Y + 0.5), s = F.s(q), zq = z * q, u0 = F.u(0.5, q), du = 1 / zq, ox = Math.round(F.X(0, q)), oy = Y - Math.round(L);
    const sh = shadows.length ? shadows.filter((d) => d.q0 <= q && d.q1 >= q) : null, NS = (W >> 2) + 2;
    for (let k = 0; k < NS; k++) {
      const u = u0 + k * 4 * du; let v = lawnTone(u, s, q);
      if (sh) for (const d of sh) { const ex = (u - d.u) / d.ru, eq = (q - d.q) / d.rq, e = ex * ex + eq * eq; if (e < 1) v -= d.k * Math.min(1, (1 - e) * 2.2); }
      SAMP[k] = v;
    }
    const row = Y * W;
    for (let X = 0; X < W; X++) {
      const k = X >> 2, v = SAMP[k] + (SAMP[k + 1] - SAMP[k]) * (X & 3) * 0.25; TONE[row + X] = v;
      const fl = Math.floor(v), f = v - fl; let qi = f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > by(X - ox, oy) ? fl + 1 : fl;
      if (qi < 0) qi = 0; else if (qi > NL) qi = NL;
      const c = LAWN[qi], i = row + X, j = i * 3; O[i] = 1; D[j] = c[0]; D[j + 1] = c[1]; D[j + 2] = c[2];
    }
  }
  // 2) blades + features, far rows first (nearer ones overwrite); nearer rows: wider cells, bigger blades
  const set = (x, y, c) => S.set(x, y, c), qMax = F.q(H + 8), sMax = F.s(qMax), wt = windTable(t, P, cam.cx - 290 / z, cam.cx + 290 / z);
  const toneAt = (x, y, u, s, q) => { const X = Math.round(x), Y = Math.round(y); return X >= 0 && X < W && Y >= y0 && Y < H ? TONE[Y * W + X] : lawnTone(u, s, q); };
  let fi = 0;
  while (fi < FEATS.length && FEATS[fi].s < 0) fi++;
  for (let j = 0; j * CS <= sMax + CS; j++) {
    const sRow = j * CS;
    while (fi < FEATS.length && FEATS[fi].s <= sRow) drawFeature(set, F, FEATS[fi++], t, P);
    const qr = F.qOfS(sRow), cu = CU * (1 + (qr - 1) * 1.5), uA = F.u(-12, qr), uB = F.u(W + 12, qr);
    for (let i = Math.floor(uA / cu); i <= Math.ceil(uB / cu); i++) {
      const r1 = h2(i, j * 3 + 1), r2 = h2(i * 5 + 3, j), r3 = h2(i + 911, j * 7);
      const u = i * cu + r1 * cu, s = sRow + r2 * CS, q = F.qOfS(s), zq = z * q, x = F.X(u, q), y = F.row(q);
      if (x < -6 || x > W + 6) continue;
      const grow = 1 + (q - 1) * 2.2, hb = (1.7 + r3 * 2.6) * grow, v = toneAt(x, y, u, s, q), dark = r3 < 0.55;
      const ci = dark ? v - 1.6 - r1 * 0.6 : v + 1.2 + r2 * 0.8, cm = LAWN[Math.max(0, Math.min(NL, Math.round(ci)))], cl = LAWN[Math.max(0, Math.min(NL, Math.round(ci + (dark ? 0.6 : 1))))];
      const lean = ((r2 - 0.5) * 0.9 + wt(u) * 0.22) * hb * zq;
      blade(set, x, y, hb * zq, zq * (0.75 + (q - 1) * 0.9 + r1 * 0.35), lean, [LAWN[Math.max(0, Math.round(v - 2.4))], cm, cl]);
    }
  }
  while (fi < FEATS.length && FEATS[fi].s <= sMax + 60) drawFeature(set, F, FEATS[fi++], t, P);
  return F;
}

// ---------------------------------------------------------------- the back lawn strip (stage: after all objects)
const PATH = [rgb("#E8D6A6"), rgb("#D6BF8A"), rgb("#BFA572")];
export const pathP = (x) => 0.54 + 0.034 * Math.sin(x * 0.0062 + 1.2) + 0.012 * Math.sin(x * 0.019);
/** Grass blades on the back lawn strip for depths pLo ≤ p < pHi, nearest rows first (front-to-back into the scratch).
 *  The caller interleaves this with the objects standing on the strip, so blades at p > p_object stand in front of it. */
const BDP = 0.011;
export function backBlades(S, cam, t, P, pHi, pLo) {
  pLo = Math.max(0.5, pLo); if (pHi <= pLo) return;
  const put = (x, y, c) => S.put(x, y, c), j0 = Math.ceil((1 - Math.min(pHi, 1)) / BDP - 1e-9), j1 = Math.floor((1 - pLo) / BDP);
  for (let j = j0; j <= j1; j++) {
    const p = 1 - j * BDP; if (p >= pHi || p < pLo) continue;
    const V = layer(cam, p), y = V.Y(0), sc = p * V.z; if (y < -10 || y > S.h + 10) continue;
    const cw = 3.4 * p, i0 = Math.floor(V.wx(-8) / cw), i1 = Math.ceil(V.wx(S.w + 8) / cw), hz = Math.pow(1 - p, 1.6) * 0.66, sd = -DIST * (1 - p) * 0.35;
    for (let i = i0; i <= i1; i++) {
      const r1 = h2(i, j * 3 + 5001), r2 = h2(i * 5 + 1, j + 5003), r3 = h2(i + 77, j * 7 + 5005);
      const wx = (i + r1) * cw, yy = y + (r2 - 0.5) * BDP * 0.9 * (V.Y(0) - layer(cam, p - BDP).Y(0)) / BDP, x = V.X(wx), hb = (1.5 + r3 * 2.3) * sc;
      if (hb < 1.2) continue;
      const v = lawnTone(wx, sd, 1) + (1 - p) * 1.1, dark = r3 < 0.55, ci = dark ? v - 1.5 : v + 1.3;
      let cm = LAWN[Math.max(0, Math.min(NL, Math.round(ci)))], cl = LAWN[Math.max(0, Math.min(NL, Math.round(ci + 0.8)))], cd = LAWN[Math.max(0, Math.round(v - 2.4))];
      if (hz > 0.02) { cm = mixc(cm, HAZE, hz); cl = mixc(cl, HAZE, hz); cd = mixc(cd, HAZE, hz); }
      blade(put, x, yy + 0.5, hb, Math.max(0.8, sc * 0.85), ((r2 - 0.5) * 0.8 + wind(t, P, wx) * 0.2) * hb, [cd, cm, cl]);
    }
  }
}
const DOTS = [rgb("#FFFFFF"), rgb("#FFE45A"), rgb("#B48CF0")];
export function backLawn(S, cam, shadows = []) {
  const B = backRows(cam, S.h), L = ground(cam).Y(0), W = S.w, O = S.o, D = S.d, Ly = Math.min(S.h, Math.ceil(L - 0.5)), Lr = Math.round(L);
  for (let Y = B.top; Y < Ly; Y++) {
    let p = B.p[Y]; if (!(p >= 0)) continue; p = Math.min(1, p);
    const V = layer(cam, p), zx = 1 / V.z, w0 = V.wx(0.5), ox = Math.round(V.X(0)), hz = Math.pow(1 - p, 1.6) * 0.66, ky = (Lr - Y) >> 1;
    const s = -DIST * (1 - p) * 0.35;                                // depth coordinate continues the floor's behind the line
    const sh = shadows.length ? shadows.filter((d) => d.p0 <= p && d.p1 >= p) : null;
    const pw = 0.026 + 0.006 * p, dotsOK = p > 0.5;
    for (let X = 0; X < W; X++) {
      const i = Y * W + X; if (O[i]) continue;
      const wx = w0 + X * zx;
      let v = lawnTone(wx, s, 1) + (1 - p) * 1.1, c = null;
      const dp = Math.abs(p - pathP(wx));
      if (dp < pw) { const e = dp / pw; c = e > 0.78 ? (by(X - ox, Y) < (e - 0.78) / 0.22 ? null : PATH[2]) : (h2(X - ox, ky) < 0.1 ? PATH[1] : PATH[0]); }
      if (!c) {
        if (sh) for (const d of sh) { const ex = (wx - d.x) / d.rx, ep = (p - d.p) / d.rp, e = ex * ex + ep * ep; if (e < 1) v -= d.k * Math.min(1, (1 - e) * 2.2); }
        const n = h2(X - ox, ky);
        if (dotsOK && n > 0.996 && !(p > 0.88 && wx > CLEAR.x0 && wx < CLEAR.x1)) c = DOTS[Math.floor(h2(X - ox, ky + 7) * 3)];
        else { if (n < 0.13) v -= 1.3; else if (n > 0.9) v += 1.1; c = LAWN[band(v, NL, X - ox, Y)]; }
      }
      if (hz > 0.02) c = mixc(c, HAZE, hz);
      O[i] = 1; const j = i * 3; D[j] = c[0]; D[j + 1] = c[1]; D[j + 2] = c[2];
    }
  }
}

// ---------------------------------------------------------------- front: grass on the lawn line + foreground tufts
const TUFT = [LAWN[3], LAWN[6], LAWN[9]];
const TUFT_D = [LAWN[2], LAWN[5], LAWN[8]];
/** Tufts standing exactly on the lawn line (p = 1). Positions every ~7 units: a low fringe everywhere, taller tufts sparse,
 *  and a deliberate clump in front of the ball's resting spot so its lower third sinks into the grass. */
function lineTufts(c, cam, t, P) {
  const G = ground(cam), z = G.z, y0 = G.Y(0), x0 = G.wx(-20), x1 = G.wx(560), put = (x, y, col) => c.px(x, y, col), ball = LAYOUT.ball.land;
  for (let i = Math.floor(x0 / 7); i <= Math.ceil(x1 / 7); i++) {
    const r1 = h2(i, 61), r2 = h2(i, 62), r3 = h2(i, 63), wx = i * 7 + r1 * 7, nearBall = Math.abs(wx - ball) < 13;
    const tall = nearBall || r2 < 0.2, n = nearBall ? 7 : tall ? 3 + Math.floor(r3 * 3) : 2;
    const hBase = nearBall ? 5.2 : tall ? 3.2 + r3 * 3.2 : 1.3 + r3 * 1.4;
    for (let k = 0; k < n; k++) {
      const r = h2(i * 7 + k, 64), bx = wx + (k - (n - 1) / 2) * 1.6 + (r - 0.5) * 1.2, h = hBase * (0.6 + r * 0.6), lean = ((r - 0.5) * 1.6 + (k - (n - 1) / 2) * 0.5 + wind(t, P, bx) * 0.35) * h * 0.35;
      blade(put, G.X(bx), y0 + 0.6 * z, h * z, z * 0.95, lean * z, k % 2 ? TUFT_D : TUFT);
    }
  }
  // a low continuous fringe in front of the ball: covers the bottom of it (wy −2.3 … +2)
  for (let k = 0; k < 30; k++) {
    const r = h2(k, 71), bx = ball - 10 + k * 0.7 + (r - 0.5) * 0.8, h = 3.4 + r * 2.4, lean = ((r - 0.5) * 1.4 + wind(t, P, bx) * 0.3) * h * 0.3;
    blade(put, G.X(bx), y0 + 2.2 * z, h * z, z * 0.95, lean * z, k % 3 ? TUFT : TUFT_D);
  }
}
/** Foreground: lush grass clumps, tall daisies, violets, buttercups and clover heads at floor depth q 1.15–1.95 (the bottom
 *  of the hook frame is q ≈ 1.64; deeper ones only show in wide shots). Sparse just below the lawn line (caption rows). */
const FG = [];
for (let j = 0; j < 12; j++) {
  const qb = 1.17 + j * 0.068, keep = qb < 1.3 ? 0.1 : qb < 1.45 ? 0.22 : 0.4, step = 44 / qb;
  for (let i = -90; i <= 90; i++) {
    if (h2(i * 7 + j, 81) > keep) continue;
    const q = qb + (h2(i, j * 5 + 82) - 0.5) * 0.06, u = (i + h2(i, j * 5 + 83) * 0.8) * step + j * 11;
    const r = h2(i * 3 + j, 85), kind = r < 0.12 ? "daisy" : r < 0.18 ? "violet" : r < 0.24 ? "buttercup" : r < 0.29 ? "clover" : "tuft";
    FG.push({ u, q, kind, seed: i * 31 + j * 7, n: 8 + Math.floor(h2(i, j * 5 + 87) * 7), h: (10 + h2(i, j * 5 + 88) * 13) * (1 + (q - 1.2) * 1.8) });
  }
}
FG.sort((a, b) => a.q - b.q);
const FG_C = [[rgb("#164A1C"), rgb("#2E802C"), rgb("#62B446")], [rgb("#1A521F"), rgb("#3A9434"), rgb("#7CC654")], [rgb("#123F18"), rgb("#246E26"), rgb("#4A9C3A")], [rgb("#1C5622"), rgb("#46A23C"), rgb("#8ED262")]];
const FG_FLOWER = { daisy: [rgb("#FFFFFF"), rgb("#C8CEE8"), rgb("#F4C430"), 7, 3.3], violet: [rgb("#A47CEE"), rgb("#6A40B8"), rgb("#F8E070"), 5, 2.6], buttercup: [rgb("#FFE34A"), rgb("#D8A818"), rgb("#FFF6B0"), 5, 2.4], clover: [rgb("#F2EEFA"), rgb("#BDB2DC"), rgb("#E2D8F4"), 0, 2.3] };
function petals(c, fx, fy, r, n, rot, col) {
  if (n === 0) {                                                       // clover head: a round cluster of tiny florets
    for (let Y = Math.floor(fy - r); Y <= Math.ceil(fy + r); Y++) for (let X = Math.floor(fx - r); X <= Math.ceil(fx + r); X++) {
      const dx = X + 0.5 - fx, dy = Y + 0.5 - fy, d = Math.hypot(dx, dy); if (d > r) continue;
      c.px(X, Y, d > r - 1 && dy > -r * 0.2 ? col[1] : ((X + Y) & 1) && d < r - 1 ? col[2] : col[0]);
    }
    return;
  }
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / n + rot, px = fx + Math.cos(a) * r * 0.92, py = fy + Math.sin(a) * r * 0.58, pr = r * (n > 5 ? 0.4 : 0.5);
    for (let Y = Math.floor(py - pr); Y <= Math.ceil(py + pr); Y++) for (let X = Math.floor(px - pr * 1.3); X <= Math.ceil(px + pr * 1.3); X++) { const dx = (X + 0.5 - px) / 1.3, dy = Y + 0.5 - py; if (dx * dx + dy * dy <= pr * pr + 0.3) c.px(X, Y, Y + 0.5 > fy + r * 0.12 ? col[1] : col[0]); }
  }
  const er = Math.max(1, r * 0.36);
  for (let Y = Math.floor(fy - er); Y <= Math.ceil(fy + er); Y++) for (let X = Math.floor(fx - er); X <= Math.ceil(fx + er); X++) { const d = Math.hypot(X + 0.5 - fx, Y + 0.5 - fy); if (d <= er + 0.3) c.px(X, Y, d < er * 0.5 && er > 1.5 ? col[0] === col[2] ? col[2] : col[2] : col[2]); }
}
function foreground(c, cam, t, P) {
  const F = floorOf(cam), put = (x, y, col) => c.px(x, y, col);
  for (const f of FG) {
    const z = F.zq(f.q), x = F.X(f.u, f.q), y = F.row(f.q) + 2 * z;
    if (y - 40 * z > c.h || x < -40 * z || x > c.w + 40 * z) continue;
    const sw = wind(t, P, f.u) * 0.9;
    if (f.kind === "tuft") {
      // a fan of curved blades: back ones darker and taller, front ones lighter and shorter; a soft shade at the root
      const rw = f.n * 1.1 * z, rh = 1.6 * z;
      for (let Y = Math.floor(y - rh); Y <= Math.ceil(y + rh * 0.4); Y++) for (let X = Math.floor(x - rw); X <= Math.ceil(x + rw); X++) { const e = ((X + 0.5 - x) / rw) ** 2 + ((Y + 0.5 - y) / rh) ** 2; if (e < 1 && ((X + Y) & 1) === 0) c.px(X, Y, FG_C[2][0]); }
      for (let k = 0; k < f.n; k++) {
        const r = h2(f.seed * 13 + k, 91), mid = (h2(f.seed * 17 + k, 92) - 0.5) * 2, back = k < f.n * 0.45;
        const h = f.h * (back ? 0.8 + r * 0.4 : 0.5 + r * 0.4) * (1 - Math.abs(mid) * 0.25), bx = x + mid * f.n * 0.9 * z;
        const lean = (mid * 1.9 + (r - 0.5) * 1.2 + sw) * z * h * 0.1, w = z * (1.7 + r * 0.8);
        blade(put, bx, y, h * z, w, lean, back ? FG_C[2] : FG_C[k & 1 ? 1 : 3]);
      }
    } else {
      const [pc, pd, ec, n, rr] = FG_FLOWER[f.kind], h = f.h * 1.45, sx = sw * z * 1.4, fy = y - h * z;
      blade(put, x - 1.6 * z, y, h * 0.42 * z, z * 1.5, -2.6 * z + sx * 0.3, FG_C[1]); blade(put, x + 1.6 * z, y, h * 0.36 * z, z * 1.5, 2.6 * z + sx * 0.3, FG_C[2]);
      blade(put, x, y, h * z, Math.max(1, z * 0.7), sx, FG_C[0]);
      petals(c, x + sx, fy, rr * z, n, f.seed * 0.7, [pc, pd, ec]);
    }
  }
}
export function frontLawn(c, cam, t, P) { lineTufts(c, cam, t, P); foreground(c, cam, t, P); }
export { NL, h1 };
