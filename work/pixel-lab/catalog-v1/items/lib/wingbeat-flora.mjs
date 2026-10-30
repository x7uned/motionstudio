// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-wingbeat/film/levels/tropic-plants.mjs (P, leaf, stalk),
// levels/meadow-kit.mjs (leafBall) and levels/garden-flora.mjs (LEAF, PETALS.pink, appleTree); changes: imports from
// ./cute.mjs; leaf() takes o.mixes = [[ramp, k], …] (per-pixel ordered-dither crossfade to other ramps, so a colour
// change is never one frame); leafBall() keys its tone noise to the ball centre (texture moves with a swaying crown);
// appleTree() scales the trunk width with sc, takes o.bend(h) (x offset at height h above the foot: sway/lean),
// o.jit (per-ball flutter px), o.fruit / o.bloom (0..1: apples / pink blossoms dither in per spot, staggered; apples
// drawn as small shaded discs scaled with sc instead of fixed 3×3 squares) and returns nothing new.
import { mix, bayer, rnd } from "./cute.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const frac = (v) => v - Math.floor(v);

// ---------------------------------------------------------------- palettes (dark → light, 8 tones)
export const P = {
  leaf: ["#0C2614", "#143A1C", "#1C5026", "#28682E", "#368238", "#4A9C44", "#66B454", "#8ACC6C"],
  jungle: ["#0A2418", "#0F3420", "#16482A", "#1E5E34", "#2A7840", "#3C924C", "#56AC5C", "#7CC676"],
  lime: ["#1A3410", "#284C16", "#38661C", "#4C8024", "#64992E", "#80B23C", "#A0C854", "#C4DE7C"],
  banana: ["#183418", "#224C1E", "#2E6624", "#3E802C", "#529A36", "#6CB244", "#8CC85A", "#B2DC7C"],
  warm: ["#1C3010", "#2A4616", "#3A5E1C", "#4E7824", "#64922E", "#7EAA3A", "#9CC04E", "#C0D670"],
  squash: ["#12300E", "#1C4614", "#285E1A", "#367820", "#469228", "#5AAA34", "#76C046", "#9CD466"],
  palm: ["#16341A", "#1E4A22", "#28602A", "#347832", "#42903A", "#56A846", "#72BE56", "#98D272"],
  trunk: ["#2E2016", "#46321E", "#5E4428", "#785834", "#926E42", "#AA8654", "#C2A06C", "#DABC8E"],
  red: ["#3A040C", "#640A16", "#961420", "#C61E2A", "#E83838", "#FA5E4E", "#FF907A", "#FFC4AE"],
};

/**
 * Shaded leaf. (x, y) = base (petiole), ang = direction to the tip, L = length (px).
 * o: shape, W (half width / L), bend (px the tip droops along +normal), ramp, light [x, y] (where light comes FROM),
 * base (tone), veins (lateral vein spacing px, 0 = none), vk (vein slant), rib (midrib half width), gloss 0..1,
 * slits/holes (monstera), tears (banana), mottle (squash silver), serr (serration), lobe (lobed depth), seed, outline.
 */
export function leaf(g, x, y, ang, L, o = {}) {
  const shape = o.shape ?? "ovate", ramp = o.ramp ?? P.leaf, Wr = o.W ?? 0.3, W = Wr * L, bend = o.bend ?? 0, seed = o.seed ?? 0;
  const fx = Math.cos(ang), fy = Math.sin(ang), nx = -fy, ny = fx;
  const [lx0, ly0] = o.light ?? [-0.6, -0.8], ln = Math.hypot(lx0, ly0), lx = lx0 / ln, ly = ly0 / ln;
  const sideLit = nx * lx + ny * ly;                     // > 0: the +normal half faces the light
  const round = shape === "round", polar = shape === "heart" || shape === "lobed" || round, k = polar ? 0.62 / Wr : 1;
  const veins = o.veins ?? (polar ? 0 : 7), vk = o.vk ?? 0.85, base = o.base ?? 3.5, rib = o.rib ?? 0.9;
  // bbox
  const ext = polar ? Math.max(L * (round ? 1.1 : 0.8), W * 1.4) : 0, back = polar ? L * (round ? 1.05 : 0.45) : 0;
  const pts = [[x - fx * back, y - fy * back], [x + fx * L, y + fy * L], [x + fx * L + nx * bend, y + fy * L + ny * bend]];
  const xs = [], ys = [];
  for (const [px, py] of pts) for (const s of [-1, 1]) { xs.push(px + nx * s * (W * 1.1 + ext + Math.abs(bend))); ys.push(py + ny * s * (W * 1.1 + ext + Math.abs(bend))); }
  const X0 = Math.floor(Math.min(...xs)) - 2, X1 = Math.ceil(Math.max(...xs)) + 2, Y0 = Math.floor(Math.min(...ys)) - 2, Y1 = Math.ceil(Math.max(...ys)) + 2;
  const BW = X1 - X0 + 1, BH = Y1 - Y0 + 1, M = new Uint8Array(BW * BH), IN = new Uint8Array(BW * BH), TN = new Float32Array(BW * BH), SD = new Int8Array(BW * BH);
  const slitA = o.slits ? Array.from({ length: o.slits }, (_, i) => (i + 0.5 + (rnd(seed + i) - 0.5) * 0.3) / o.slits) : null;
  for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) {
    const X = X0 + i, Y = Y0 + j, dx = X + 0.5 - x, dy = Y + 0.5 - y;
    const a = dx * fx + dy * fy, ua = a / L, b = dx * nx + dy * ny - bend * Math.max(0, ua) * Math.max(0, ua);
    let e, u, side = b >= 0 ? 1 : -1, vein = false, ribHit = false, vein2 = false, mot = false, centre = false;
    if (!polar) {
      if (ua < 0 || ua > 1) continue;
      u = ua; let h;
      if (shape === "lance") h = Math.pow(Math.sin(Math.PI * u), 1.1) * (1 - 0.35 * u);
      else if (shape === "paddle") h = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 6))) * Math.min(1, u / 0.05);
      else h = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.75);
      if (o.serr) h *= 1 - o.serr * Math.abs(Math.sin(u * L * 0.45 + (b > 0 ? 0 : 1.3)));
      const half = h * W; if (Math.abs(b) > half || half < 0.3) continue;
      e = Math.abs(b) / half;
      if (veins) { const s = (a - Math.abs(b) * vk) / veins; vein = frac(s) < 1.15 / veins && e > 0.1 && e < 0.9; }
      ribHit = Math.abs(b) < rib * (1 - u * 0.6) + 0.3 && u < 0.97;
      if (o.tears) { const s = Math.floor((a - Math.abs(b) * 0.3) / 5), tk = rnd(seed * 13 + s * 7 + (b > 0 ? 3 : 0)); if (tk < o.tears && e > 0.18 + rnd(s * 3 + seed) * 0.4 && frac((a - Math.abs(b) * 0.3) / 5) < 0.28) continue; }
    } else {
      const bb = b * k, phi = Math.atan2(bb, a), rho = Math.hypot(a, bb) / L;
      let r = round ? 1 + 0.05 * Math.sin(phi * 5 + seed) + 0.03 * Math.sin(phi * 9 + seed * 2) : Math.pow(Math.max(0, Math.cos(phi / 2)), o.pw ?? 1.2) * (1 + (o.tip ?? 0.2) * Math.exp(-Math.abs(phi) / 0.13));
      if (shape === "lobed") r *= 1 - (o.lobe ?? 0.2) * Math.pow(Math.abs(Math.sin(2.5 * phi)), 3);
      if (o.serr) r *= 1 - o.serr * 0.5 * (1 + Math.sin(rho * L * 0.9 + phi * 8));
      if (rho > r) continue;
      e = rho / Math.max(0.01, r); u = clamp01(a / L * 0.5 + 0.5);
      const vs = o.veinAng ?? 0.5, pv = phi / vs, near = Math.abs(pv - Math.round(pv)) * vs * rho * L;
      vein = rho > 0.06 && e < 0.94 && near < (0.75 + L * 0.002) && (round || Math.round(pv) !== 0);
      ribHit = !round && Math.abs(b) < rib + 0.3 && a > 0 && e < 0.97;
      if (o.subVeins && !vein && e > 0.4 && e < 0.93) { const pv2 = (phi / vs) * 2 + 0.5, n2 = Math.abs(pv2 - Math.round(pv2)) * (vs / 2) * rho * L; if (n2 < 0.6) vein2 = true; }
      if (o.mottle && e < 0.62 && near < 1.6 + 3.2 * rnd(R(rho * L / 4) * 7 + Math.round(pv) * 13 + seed) && rho > 0.08) mot = true;
      if (round && rho < 0.07) centre = true;
      if (slitA) {                                          // monstera: slits from the edge toward the rib between veins
        const sa = Math.abs(phi) / 2.4, sw = o.slitW ?? 1.4 + L * 0.006; for (const s0 of slitA) { if (Math.abs(sa - s0) * 2.4 * rho * L < sw && e > 0.42 + 0.2 * rnd(seed + R(s0 * 100))) { e = -1; break; } }
        if (e < 0) continue;
        if (o.holes) for (let h2 = 0; h2 < slitA.length - 1; h2++) { const pa = ((slitA[h2] + slitA[h2 + 1]) / 2) * 2.4, hr = 0.3 + 0.08 * rnd(seed + h2); if (Math.hypot((Math.abs(phi) - pa) * rho * L, (rho - hr) * L) < 2.6 + L * 0.012) { e = -1; break; } }
        if (e < 0) continue;
      }
    }
    const id = j * BW + i; M[id] = 1; SD[id] = side; if (o.inner && e < o.inner.k) IN[id] = 1;
    const sl = side * sideLit;
    let v = base + 0.85 * sl + (sl > 0 ? 0.45 * e : -0.35 * e * e) + (o.along ?? 0.4) * (0.5 - u) + (rnd(X * 31 + Y * 17 + seed) - 0.5) * 0.4;
    if (vein) v += (sl > 0 ? -0.75 : 0.85) * (o.veinK ?? 1);
    if (o.stripes && !polar && e < 0.86 && e > 0.08 && Math.floor((dx * fx + dy * fy - Math.abs(b) * vk) / veins) % 2 === 0) v -= o.stripes;
    if (o.gloss && sl > 0 && e > 0.22 && e < 0.62 && u > 0.15 && u < 0.78) v += o.gloss * 1.4 * Math.sin(Math.PI * (e - 0.22) / 0.4);
    if (vein2) v += sl > 0 ? -0.45 : 0.5;
    if (o.lobeShade) v += o.lobeShade * Math.cos(Math.atan2(b * k, dx * fx + dy * fy) * 5) * e;
    if (mot) v = 99;
    if (centre) v = 7;
    if (ribHit) v = Math.max(v + 1.6, 6);
    TN[id] = v;
  }
  const out = o.outline ?? null, mixes = o.mixes ?? [];
  const pick = (X, Y) => { let r = ramp; for (let m = 0; m < mixes.length; m++) if (mixes[m][1] > 0 && bayer(X + m * 2 + 1, Y + m * 3) < mixes[m][1]) r = mixes[m][0]; return r; };
  for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) {
    const id = j * BW + i; if (!M[id]) continue;
    const X = X0 + i, Y = Y0 + j, edge = i === 0 || j === 0 || i === BW - 1 || j === BH - 1 || !M[id - 1] || !M[id + 1] || !M[id - BW] || !M[id + BW];
    if (edge) { const lit = SD[id] * sideLit > 0.3 && !M[id - BW]; const pr = pick(X, Y); g.px(X, Y, lit ? pr[2] : out ?? pr[0]); continue; }
    const v = TN[id];
    if (v === 99) { g.px(X, Y, bayer(X, Y) > 0.35 ? mix(ramp[6], "#E8F0D0", 0.5) : ramp[5]); continue; }
    const fl = Math.floor(v), f = v - fl, q = f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl;
    g.px(X, Y, (IN[id] ? o.inner.ramp : pick(X, Y))[Math.max(1, Math.min(7, q))]);
  }
}

/** Dissolve a cached Layer's content over its outer w columns (ordered dither), so decor that reaches into a
 *  neighbour's range ends in a soft edge instead of a hard vertical cut where the layer stops. */

/** Tapered shaded stalk along points (lit from the left). */
export function stalk(g, pts, r0, r1, ramp = P.leaf, rings = 0) {
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let s = 0; s <= len; s++) {
      const k = (i + s / len) / (n - 1), cx = ax + ((bx - ax) * s) / len, cy = ay + ((by - ay) * s) / len, r = r0 + (r1 - r0) * k, ri = Math.ceil(r);
      for (let d = -ri; d <= ri; d++) { const u = d / Math.max(0.6, r); if (Math.abs(u) > 1.05) continue; let t = 4.2 - u * 1.8; if (Math.abs(u) > 0.78) t = 1; if (rings && R(cy + d * 0.3) % rings === 0 && Math.abs(u) < 0.85) t -= 1.2; const fl = Math.floor(t); g.px(R(cx + d), R(cy), ramp[Math.max(1, Math.min(7, t - fl > bayer(R(cx + d), R(cy)) ? fl + 1 : fl))]); }
    }
  }
}

/** Leafy cluster ball (canopy/hedge chunk): dithered tone bands lit from the upper left, bumpy outline. */
export function leafBall(g, cx, cy, r, ramp, seed = 0, o = {}) {
  const out = o.outline ?? ramp[0], bumps = o.bumps ?? 9, amp = o.amp ?? 0.12, sy = o.sy ?? 1;
  const rad = (a) => r * (1 + amp * Math.sin(a * bumps + seed) + amp * 0.5 * Math.sin(a * (bumps * 2 + 1) + seed * 2.3));
  for (let Y = R(cy - r * 1.25 * sy); Y <= R(cy + r * 1.25 * sy); Y++) for (let X = R(cx - r * 1.25); X <= R(cx + r * 1.25); X++) {
    const dx = X - cx, dy = (Y - cy) / sy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), rr = rad(a);
    if (d > rr) continue;
    if (d > rr - 1.1) { g.px(X, Y, out); continue; }
    const lx = (-dx * 0.6 - dy * 0.8) / r, v = 0.5 + lx * 0.45 - (d / rr) * 0.18 + (o.lift ?? 0);
    const n = ramp.length - 1, s = Math.max(1, Math.min(n, v * n + (rnd((R(X - cx) * 31 + R(Y - cy) * 17) ^ seed) - 0.5) * 0.9)), lo = Math.floor(s);
    g.px(X, Y, ramp[Math.min(n, s - lo > bayer(X, Y) ? lo + 1 : lo)]);
  }
}

export const PINK_PETALS = ["#6A1040", "#A01E5E", "#D23E84", "#EE66A6", "#F98EC2", "#FFB8D8", "#FFE0EE"];
export const LEAF = ["#0E2E14", "#16421C", "#205826", "#2C6E30", "#3C863A", "#52A044", "#6CB852", "#90CE6A"];
/** Apple tree: short trunk, a round crown from leaf balls with little red apples. (x, y) = trunk foot. */
export function appleTree(g, x, y, sc = 1, seed = 0, o = {}) {
  const T = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834"], bend = o.bend ?? (() => 0), jit = o.jit ?? (() => [0, 0]);
  const tw = Math.max(4, R(4 * sc)), fw = R(2 * sc), foot = 8 * sc;
  for (let yy = R(y - 58 * sc); yy < R(y); yy++) { const h = y - yy, X0 = R(x + bend(h)), w = tw + (h < foot ? fw : 0); for (let xx = -w; xx <= w; xx++) g.px(X0 + xx, yy, xx === -w || xx === w ? T[0] : xx < 0 ? T[3] : T[2]); }
  let b = 0;
  for (const [dx, dy, r] of [[-26, -70, 26], [22, -74, 28], [0, -96, 30], [-32, -96, 20], [30, -100, 20], [0, -64, 22]]) { const [jx, jy] = jit(b++); leafBall(g, x + dx * sc + bend(-dy * sc) + jx, y + dy * sc + jy, r * sc, LEAF, seed + dx, { amp: 0.1, bumps: 9 }); }
  const fruit = o.fruit ?? 1, bloom = o.bloom ?? 0;
  if (fruit > 0) for (let i = 0; i < 14; i++) {                 // apples: shaded discs, each dithers in on its own delay
    const k = clamp01(fruit * 1.5 - rnd(seed + i * 3) * 0.5); if (k <= 0) continue;
    const ay = -56 * sc - rnd(seed + i * 9) * 64 * sc, px = x + (rnd(seed + i * 5) - 0.5) * 92 * sc + bend(-ay), py = y + ay, ra = 1.7 * sc;
    for (let Y = R(py - ra - 1); Y <= R(py + ra + 1); Y++) for (let X = R(px - ra - 1); X <= R(px + ra + 1); X++) {
      const ux = X + 0.5 - px, uy = Y + 0.5 - py, d = Math.hypot(ux, uy); if (d > ra || bayer(X, Y) >= k) continue;
      const lit = (-0.6 * ux - 0.8 * uy) / ra;
      g.px(X, Y, ra >= 2.5 && d > ra - 0.9 ? "#4A0810" : lit > 0.4 ? "#FF6A5A" : lit < -0.45 ? "#7A0E18" : "#C21E2A");
    }
    for (let j = 1; j <= Math.max(1, R(0.7 * sc)); j++) { const X = R(px), Y = R(py - ra) - j; if (bayer(X, Y) < k) g.px(X, Y, T[1]); }
  }
  if (bloom > 0) for (let i = 0; i < 22; i++) {                 // blossoms: five-lobed pink flowers with a yellow eye, same dither-in
    const k = clamp01(bloom * 1.5 - rnd(seed + i * 11 + 7) * 0.5); if (k <= 0) continue;
    const ay = -54 * sc - rnd(seed + i * 13 + 5) * 70 * sc, px = x + (rnd(seed + i * 17 + 3) - 0.5) * 96 * sc + bend(-ay), py = y + ay, rb = 2.1 * sc;
    for (let Y = R(py - rb - 1); Y <= R(py + rb + 1); Y++) for (let X = R(px - rb - 1); X <= R(px + rb + 1); X++) {
      const ux = X + 0.5 - px, uy = Y + 0.5 - py, d = Math.hypot(ux, uy), rr = rb * (0.78 + 0.22 * Math.cos(5 * Math.atan2(uy, ux) + i));
      if (d > rr || bayer(X, Y) >= k) continue;
      g.px(X, Y, d < rb * 0.34 ? "#FFE070" : rb >= 2.5 && d > rr - 0.9 ? PINK_PETALS[1] : -0.6 * ux - 0.8 * uy > 0 ? PINK_PETALS[5] : PINK_PETALS[3]);
    }
  }
}
