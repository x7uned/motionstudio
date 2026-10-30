// Plant painters for LV5 · tropic and LV6 · leaf (pure and deterministic; most draw once into cached world layers).
// leaf() is a general shaded leaf: a local frame (along / across the midrib) with a droop, shapes (ovate, lance, paddle,
// heart, lobed), banded tones lit from the upper left, lateral veins, a light midrib, gloss, monstera slits and holes,
// banana tears, squash mottling and a selective dark outline. Plus palms, a banana plant, salvia, fuchsias,
// bougainvillea, bromeliads, ferns, the feeding flower and the hummingbird feeder (per frame).
import { mix, bayer, rnd, fade, ell, blob, bez, tube } from "../cute.mjs";
import { thick, leafBall } from "./meadow-kit.mjs";

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
  const out = o.outline ?? ramp[0];
  for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) {
    const id = j * BW + i; if (!M[id]) continue;
    const X = X0 + i, Y = Y0 + j, edge = i === 0 || j === 0 || i === BW - 1 || j === BH - 1 || !M[id - 1] || !M[id + 1] || !M[id - BW] || !M[id + BW];
    if (edge) { const lit = SD[id] * sideLit > 0.3 && !M[id - BW]; g.px(X, Y, lit ? ramp[2] : out); continue; }
    const v = TN[id];
    if (v === 99) { g.px(X, Y, bayer(X, Y) > 0.35 ? mix(ramp[6], "#E8F0D0", 0.5) : ramp[5]); continue; }
    const fl = Math.floor(v), f = v - fl, q = f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl;
    g.px(X, Y, (IN[id] ? o.inner.ramp : ramp)[Math.max(1, Math.min(7, q))]);
  }
}

/** Dissolve a cached Layer's content over its outer w columns (ordered dither), so decor that reaches into a
 *  neighbour's range ends in a soft edge instead of a hard vertical cut where the layer stops. */
export function fadeEdges(layer, w = 18) {
  const c = layer.c, W = c.w, H = c.h;
  for (let y = 0; y < H; y++) for (let i = 0; i < w; i++) {
    const k = (i + 0.5) / w;                                              // 0 at the outer column → 1 inside
    for (const x of [i, W - 1 - i]) { const id = y * W + x; if (c.m[id] && k <= bayer(x + layer.wx0, y + layer.wy0)) c.m[id] = 0; }
  }
}

// ---------------------------------------------------------------- stems, palms, banana
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
/** Pinnate palm frond: arching spine from p0 with leaflets hanging on both sides. */
export function frond(g, p0, ang, L, droop, ramp = P.palm, seed = 0, lw = 1) {
  const dir = [Math.cos(ang), Math.sin(ang)], p1 = [p0[0] + dir[0] * L * 0.55, p0[1] + dir[1] * L * 0.55 - L * 0.22], p2 = [p0[0] + dir[0] * L, p0[1] + dir[1] * L + droop];
  const sp = bez(p0, p1, p2, R(L / 2.2));
  for (let i = 2; i < sp.length; i++) {
    const u = i / (sp.length - 1), [px, py] = sp[i], [qx, qy] = sp[i - 1], tdx = px - qx, tdy = py - qy, tl = Math.hypot(tdx, tdy) || 1, nx = -tdy / tl, ny = tdx / tl;
    const ll = (5 + 22 * Math.sin(Math.PI * Math.min(1, u * 1.08))) * lw;
    for (const sd of [-1, 1]) {
      const ex = px + (nx * sd * 0.6 + (tdx / tl) * 0.45) * ll, ey = py + (ny * sd * 0.6 + (tdy / tl) * 0.45) * ll + ll * 0.62;
      const top = sd < 0 === ny < 0, col = ramp[Math.max(1, Math.min(7, R(2.2 + (top ? 2.6 : 0.8) + (1 - u) * 1.2 + (rnd(seed * 31 + i * 7 + sd) - 0.5) * 1.6)))];
      g.line(R(px), R(py), R(ex), R(ey), col); g.line(R(px), R(py) + 1, R(ex), R(ey) + 1, i % 3 === 0 ? ramp[1] : col);
      g.px(R(ex), R(ey) + 1, ramp[1]);
    }
  }
  for (let i = 1; i < sp.length; i++) g.line(R(sp[i - 1][0]), R(sp[i - 1][1]), R(sp[i][0]), R(sp[i][1]), "#D8E0A0");
}
/** Coconut palm: curved ringed trunk through pts (base first), crown of fronds, a coconut cluster. */
export function coconutPalm(g, pts, seed = 0, frondSet = null) {
  const sp = []; for (let i = 0; i < pts.length - 2; i += 2) sp.push(...bez(pts[i], pts[i + 1], pts[i + 2], 30).slice(i ? 1 : 0));
  stalk(g, sp, 10, 6.5, P.trunk, 7);
  const top = sp[sp.length - 1];
  const fr = frondSet ?? [[-2.9, 120, 60], [-2.5, 130, 40], [-2.0, 110, 10], [-1.55, 90, -10], [-1.1, 110, 10], [-0.6, 135, 40], [-0.15, 140, 70], [0.35, 110, 70], [-3.3, 90, 60]];
  fr.forEach(([a, L, d], i) => frond(g, top, a + (rnd(seed + i) - 0.5) * 0.1, L, d, P.palm, seed * 7 + i));
  for (const [dx, dy] of [[-6, 8], [5, 9], [0, 15], [-10, 15], [9, 3]]) blob(g, [ell(top[0] + dx, top[1] + dy, 6.5, 6)], { ramp: ["#1E1A08", "#3A3210", "#5A4A16", "#7A6A20", "#96862C", "#B2A040", "#CAB85A", "#E0D07A"], thick: 5, base: 3.4, litOutline: "#5A4A16" });
  return top;
}
/** Banana plant: striped pseudostem, big torn paddle leaves (list [ang, L, bend]). */
export function bananaPlant(g, x, y, h, leaves, seed = 0) {
  const top = [x - 4, y - h];
  stalk(g, [[x, y], [x - 2, y - h * 0.5], top], 9, 6, ["#1E2E14", "#2E4418", "#44601E", "#5A7A26", "#749232", "#8EAA42", "#AAC060", "#C8D688"]);
  leaves.forEach(([a, L, bend], i) => {
    const bx = top[0] + Math.cos(a) * 6, by = top[1] + i * 6;
    stalk(g, [[top[0], by + 10], [bx + Math.cos(a) * 14, by + Math.sin(a) * 14]], 2.4, 1.8, P.banana);
    leaf(g, bx + Math.cos(a) * 14, by + Math.sin(a) * 14, a, L, { shape: "paddle", W: 0.2, bend, ramp: P.banana, veins: 4, vk: 0.25, tears: 0.22, seed: seed + i * 17, rib: 1.6, base: 3.6, gloss: 0.3 });
  });
}

export const PINK = ["#4A0E26", "#7A1A3E", "#A82A58", "#CC4474", "#E8688E", "#F496B0", "#FCC2D2", "#FFE6EE"];
/** Caladium: a fan of heart leaves on petioles, pink centres with pale veins and green margins. */
export function caladium(g, x, y, s = 1, seed = 0, n = 5) {
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.42 + (rnd(seed + k) - 0.5) * 0.12, pl = (26 + rnd(seed + k * 3) * 14) * s, px = x + Math.cos(a) * pl, py = y + Math.sin(a) * pl;
    stalk(g, [[x, y], [x + Math.cos(a) * pl * 0.5, y + Math.sin(a) * pl * 0.5 - 4 * s], [px, py]], 1.6 * s, 1.1 * s, ["#3A1A20", "#5A2A30", "#7A4048", "#9A5A5E", "#B47478", "#CC9294", "#E0B0B0", "#F0D0D0"]);
    const side = Math.cos(a) >= 0 ? 1 : -1;
    leaf(g, px, py, a + side * 0.75, (48 + rnd(seed + k * 5) * 16) * s, { shape: "heart", W: 0.56, ramp: P.leaf, inner: { ramp: PINK, k: 0.66 }, veinAng: 0.4, veinK: 1.3, bend: side * 6 * s, seed: seed + k * 7, tip: 0.3, pw: 1.25 });
  }
}
/** Calathea: ovate leaves with dark feathered stripes along the lateral veins. */
export function calathea(g, x, y, s = 1, seed = 0, n = 5) {
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.38 + (rnd(seed + k) - 0.5) * 0.1, pl = (14 + rnd(seed + k * 3) * 10) * s, px = x + Math.cos(a) * pl, py = y + Math.sin(a) * pl;
    stalk(g, [[x, y], [px, py]], 1.4 * s, 1 * s, P.jungle);
    leaf(g, px, py, a, (60 + rnd(seed + k * 5) * 20) * s, { shape: "ovate", W: 0.3, ramp: P.lime, veins: 6 * s, vk: 1.1, stripes: 1.5, bend: (Math.cos(a) >= 0 ? 1 : -1) * 8 * s, seed: seed + k * 11, gloss: 0.3 });
  }
}

/** Flat garden stepping stone (ellipse rx × ry) lit from the upper left, with speckles. */
export function stone(g, x, y, rx, ry, seed = 0) {
  const ST = ["#3E3A34", "#5E584E", "#7E766A", "#9C9486", "#B6AE9E", "#CEC8B8", "#E2DCCE"];
  for (let Y = R(y - ry - 1); Y <= R(y + ry + 2); Y++) for (let X = R(x - rx - 1); X <= R(x + rx + 1); X++) {
    const dx = (X + 0.5 - x) / rx, dy = (Y + 0.5 - y) / ry, w = 1 + 0.08 * Math.sin(Math.atan2(dy, dx) * 3 + seed), d = Math.hypot(dx, dy) / w;
    if (d > 1) { if (Y > y && Math.hypot(dx, (Y - 1.5 - y) / ry) / w <= 1) g.px(X, Y, mix(g.get(X, Y), "#0E2A10", 0.45)); continue; }
    let t = 4.2 - dx * 0.8 - dy * 1.2 - d * d * 0.8 + (rnd(X * 7 + Y * 13 + seed) - 0.5) * 0.9; if (d > 0.88) t = Y < y ? 4.6 : 1.4;
    const fl = Math.floor(t); g.px(X, Y, ST[Math.max(1, Math.min(6, t - fl > bayer(X, Y) ? fl + 1 : fl))]);
  }
}
/** Bird of paradise clump: blue-green paddle leaves and crested orange/blue flowers (s scale, dir ±1 = beak side). */
export function strelitzia(g, x, y, s = 1, seed = 0) {
  const BG = ["#102A26", "#183C34", "#205040", "#2C664E", "#3A7C5C", "#4E946C", "#6AAC80", "#8EC49A"];
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.32 + (rnd(seed + k) - 0.5) * 0.15, pl = (20 + rnd(seed + k * 3) * 10) * s, px = x + Math.cos(a) * pl, py = y + Math.sin(a) * pl; stalk(g, [[x, y], [px, py]], 1.3 * s, 1 * s, BG); leaf(g, px, py, a, (34 + rnd(seed + k) * 12) * s, { shape: "paddle", W: 0.22, ramp: BG, veins: 3, vk: 0.3, seed: seed + k, bend: (k - 2) * 3 * s }); }
  for (let f = 0; f < 2; f++) {
    const fx = x + (f ? 6 : -4) * s, fy = y - (40 + f * 10) * s, dir = f ? 1 : -1;
    for (let i = 0; i < 26 * s; i++) g.px(R(fx), R(fy + i), "#2E5A3A");
    const sp = 16 * s; for (let i = 0; i <= sp; i++) { const k = i / sp, w = (2.6 - 2 * k) * s; for (let j = -R(w); j <= R(w); j++) g.px(R(fx + dir * i), R(fy - k * 3 * s + j), j < 0 ? "#6A5A8A" : "#3A6A4A"); }
    for (let p = 0; p < 3; p++) { const bx = fx + dir * (3 + p * 2.5) * s, by = fy - 2 * s, L = (11 + p * 2) * s, ang = -Math.PI / 2 - dir * (0.35 + p * 0.28); for (let i = 0; i <= L; i++) { const k = i / L, w = (1.8 - 1.6 * k) * s; for (let j = -R(w); j <= R(w); j++) g.px(R(bx + Math.cos(ang) * i + j), R(by + Math.sin(ang) * i), j < 0 ? "#FFC040" : k > 0.6 ? "#FF9A20" : "#F07A10"); } }
    const bx = fx + dir * 5 * s, by = fy - 3 * s; for (let i = 0; i < 8 * s; i++) g.px(R(bx + dir * i * 0.6), R(by - i * 0.7), "#3A6AE8"); g.px(R(bx), R(by - 1), "#8AB4FF");
  }
}

// ---------------------------------------------------------------- flowers
/** One salvia flower: a red tube leaning `dir` (±1) with a hooded upper lip and a little lower lip. */
export function salviaFlower(g, x, y, dir, s = 1, cols = ["#8A0E1E", "#D8202E", "#FF5048", "#FF9A80"]) {
  const L = R(8 * s), w = Math.max(1, 1.3 * s);
  for (let i = 0; i <= L; i++) { const px = x + dir * i * 0.8, py = y - i * 0.55 + (i / L) ** 2 * 2 * s; for (let j = -R(w); j <= R(w); j++) g.px(R(px), R(py + j), i < 2 ? cols[0] : j < 0 ? cols[2] : cols[1]); }
  const mx = x + dir * L * 0.8, my = y - L * 0.55 + 2 * s;
  g.px(R(mx + dir), R(my - w - 1), cols[1]); g.px(R(mx + dir * 2), R(my - w), cols[1]); g.px(R(mx + dir), R(my + w + 1), cols[3]); g.px(R(mx + dir * 2), R(my + w + 1), cols[2]);
}
/** Salvia spike: stem with paired red tubes from (x, y) up h px (s = flower scale). */
export function salviaSpike(g, x, y, h, s = 1, seed = 0, lean = 0) {
  const pts = []; for (let i = 0; i <= h; i++) { const k = i / h; pts.push([x + lean * k * k, y - i]); }
  for (const [px, py] of pts) { g.px(R(px), R(py), "#2E5A22"); if (s > 1.4) g.px(R(px) + 1, R(py), "#4A7A30"); }
  for (let i = 0; i < 2; i++) leaf(g, x, y - 4 - i * 6, -Math.PI / 2 + (i ? 1.1 : -1.1), 10 * s, { shape: "ovate", W: 0.32, ramp: P.leaf, veins: 0, seed: seed + i });
  const n = Math.max(3, R(h / (6 * s)));
  for (let k = 0; k < n; k++) { const f = 0.35 + 0.65 * (k / (n - 1)), [px, py] = pts[R(f * h)], d = k % 2 ? 1 : -1; g.px(R(px) - d, R(py) + 1, "#5A1A3A"); salviaFlower(g, R(px), R(py), d, s * (1 - 0.35 * f) + 0.2); }
  const [tx, ty] = pts[h]; g.rect(R(tx) - 1, R(ty) - 2, 2, 3, "#C8202E");
}
/** Hanging fuchsia at (x, y) = where the pedicel leaves the twig. sw = sideways swing (px at the flower). */
export function fuchsia(g, x, y, s = 1, sw = 0, cols = { sep: ["#9A1430", "#E0304A", "#FF6A7A"], pet: ["#4A1260", "#7A2898", "#A44EC4", "#C47ADC"], st: "#FF8AB0" }) {
  const L = 7 * s, bx = x + sw, by = y + L;
  g.line(R(x), R(y), R(bx), R(by), "#5A2A20");
  g.rect(R(bx) - 1, R(by), 2, 2, "#4A6A2A");                                    // ovary
  const ty = by + 2, tl = R(4 * s);
  for (let i = 0; i < tl; i++) g.rect(R(bx) - 1, ty + i, 3, 1, i < 1 ? cols.sep[0] : cols.sep[1]);    // tube
  const sy = ty + tl, sl = 6 * s;
  for (const [dx, up] of [[-1, 0.7], [1, 0.7], [-0.45, 0.9], [0.45, 0.9]]) { for (let i = 0; i <= sl; i++) { const k = i / sl, px = bx + dx * i * 0.9, py = sy - up * i * 0.35 + k * k * 2; g.px(R(px), R(py), k > 0.75 ? cols.sep[2] : cols.sep[1]); if (k < 0.6) g.px(R(px), R(py) + 1, cols.sep[0]); } }
  const ch = 6 * s, cw = 3.2 * s;                                                  // corolla bell
  for (let j = 0; j <= ch; j++) { const k = j / ch, w = cw * (0.6 + 0.5 * Math.sin(Math.PI * Math.min(1, k * 0.8))); for (let i = -R(w); i <= R(w); i++) g.px(R(bx + i), R(sy + 1 + j), Math.abs(i) >= R(w) ? cols.pet[0] : i < 0 ? cols.pet[3] : j > ch * 0.7 ? cols.pet[1] : cols.pet[2]); }
  for (const dx of [-2, 0, 2]) { const ly = R(sy + 1 + ch + 4 * s + (dx ? 0 : 2 * s)); g.line(R(bx + dx * 0.6 * s), R(sy + ch), R(bx + dx * s), ly, cols.st); g.px(R(bx + dx * s), ly + 1, "#FFE0F0"); }
}
/** Fuchsia shrub: leafy mound with hanging flowers. */
export function fuchsiaBush(g, cx, cy, r, seed = 0, nFl = 18) {
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI - Math.PI, rr = r * (0.55 + rnd(seed + i) * 0.25); leafBall(g, cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.3, rr, P.jungle.slice(1), seed + i * 11, { amp: 0.14, bumps: 11 }); }
  leafBall(g, cx, cy - r * 0.15, r * 0.7, P.jungle.slice(1), seed + 99, { amp: 0.12, bumps: 13, lift: 0.08 });
  for (let i = 0; i < nFl; i++) { const a = -Math.PI + rnd(seed + i * 5) * Math.PI, q = 0.35 + rnd(seed + i * 7) * 0.6, x = cx + Math.cos(a) * r * q, y = cy + Math.sin(a) * r * q * 0.7 + r * 0.15; fuchsia(g, x, y, 0.9 + rnd(i + seed) * 0.4); }
}
/** Bougainvillea mound: green leaves under magenta bract clusters. */
export function bougainvillea(g, cx, cy, r, seed = 0) {
  leafBall(g, cx, cy, r, P.leaf.slice(1), seed, { amp: 0.16, bumps: 9 });
  const M = ["#7A0E4A", "#B81A6C", "#E2348C", "#FF62AC", "#FF9ACC"];
  for (let i = 0; i < r * 5; i++) {
    const a = rnd(seed + i * 3) * Math.PI * 2, q = Math.sqrt(rnd(seed + i * 3 + 1)) * r * 0.95, x = R(cx + Math.cos(a) * q), y = R(cy + Math.sin(a) * q * 0.9);
    const lit = (cx - x) * 0.6 + (cy - y) * 0.8 > -r * 0.3 ? 1 : 0, bs = 1 + (rnd(seed + i) < 0.4 ? 1 : 0);
    for (let Y = -bs; Y <= bs; Y++) for (let X = -bs; X <= bs; X++) if (Math.abs(X) + Math.abs(Y) <= bs + (bs > 1 ? 0 : 1)) g.px(x + X, y + Y, Y > 0 ? M[1 + lit] : M[2 + lit]);
    g.px(x, y, M[3 + lit]); if (lit && rnd(i) < 0.3) g.px(x - 1, y - 1, M[4]);
  }
}
export function bromeliad(g, x, y, s = 1, seed = 0, heart = "#F0402E") {
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.36 + (rnd(seed + i) - 0.5) * 0.1, L = (14 + rnd(seed + i * 3) * 6) * s * (1 - Math.abs(i - 4) * 0.08);
    const pts = bez([x, y], [x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L * 0.6], [x + Math.cos(a) * L * 1.05, y + Math.sin(a) * L * 0.7 + L * 0.35], 8);
    for (let k = 1; k < pts.length; k++) { const w = (1 - k / pts.length) * 2.2 * s; for (let j = -R(w); j <= R(w); j++) g.px(R(pts[k][0] + j * 0.3), R(pts[k][1]), j < 0 ? "#6AB84E" : k > 5 ? "#3A7A34" : "#4E9A40"); }
  }
  for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.3; thick(g, [[x, y], [x + Math.cos(a) * 9 * s, y + Math.sin(a) * 11 * s]], 1, i % 2 ? heart : mix(heart, "#FFC040", 0.4)); }
}
export function fern(g, x, y, s, seed, ramp = P.leaf, n = 6, spread = 0.42) {
  for (let f = 0; f < n; f++) {
    const a = -Math.PI / 2 + (f - (n - 1) / 2) * spread, L = (26 + rnd(seed + f) * 14) * s, sp = bez([x, y], [x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L * 0.7], [x + Math.cos(a) * L, y + Math.sin(a) * L * 0.4 + L * 0.3], R(18 * Math.max(1, s * 0.7)));
    for (let i = 1; i < sp.length; i++) { const u = i / sp.length, ll = 6 * s * Math.sin(Math.PI * u) + 1; for (const sd of [-1, 1]) g.line(R(sp[i][0]), R(sp[i][1]), R(sp[i][0] + sd * ll * 0.6), R(sp[i][1] + ll * 0.7), ramp[sd < 0 ? 5 : 3]); g.px(R(sp[i][0]), R(sp[i][1]), ramp[2]); }
  }
}
/** Nasturtium flower: five rounded petals (orange / red / yellow) with dark nectar lines, seen a little from above. */
export function nasturtium(g, x, y, s, col) {
  const C = { o: ["#8A2A04", "#D85A0C", "#FF8A1C", "#FFB45A"], r: ["#6A0A0A", "#B81C14", "#E8402A", "#FF7A5A"], y: ["#8A5A04", "#E0A010", "#FFD030", "#FFEA80"] }[col];
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5 + 0.2, px = x + Math.cos(a) * 4 * s, py = y + Math.sin(a) * 3.2 * s, r = 3.3 * s;
    for (let Y = R(py - r); Y <= R(py + r); Y++) for (let X = R(px - r); X <= R(px + r); X++) { const d = Math.hypot(X - px, (Y - py) * 1.1) / r; if (d > 1) continue; g.px(X, Y, d > 0.86 ? C[0] : (X - px) + (Y - py) < -r * 0.4 ? C[3] : d < 0.45 ? C[2] : C[1] === C[1] && Y > py ? C[1] : C[2]); }
    g.line(R(x + Math.cos(a) * s), R(y + Math.sin(a) * s * 0.8), R(x + Math.cos(a) * 4 * s), R(y + Math.sin(a) * 3.2 * s), C[0]);
  }
  g.rect(R(x) - 1, R(y) - 1, 2, 2, "#FFE070"); g.px(R(x), R(y), "#6A2A04");
}
/** Small 5-petal impatiens-like flower. */
export function smallFlower(g, x, y, s, col, eye = "#FFE070") {
  x = R(x); y = R(y); const d = mix(col, "#000000", 0.25), hi = mix(col, "#FFFFFF", 0.35);
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5, px = x + Math.cos(a) * s, py = y + Math.sin(a) * s, r = s * 0.7; for (let Y = R(py - r); Y <= R(py + r); Y++) for (let X = R(px - r); X <= R(px + r); X++) if ((X - px) ** 2 + (Y - py) ** 2 <= r * r + 0.4) g.px(X, Y, Y > y + s * 0.3 ? d : X < px - r * 0.3 && Y < py ? hi : col); }
  g.px(x, y, eye); if (s >= 3) { g.px(x + 1, y, eye); g.px(x, y + 1, mix(eye, "#C08020", 0.5)); }
}

// ---------------------------------------------------------------- per-frame pieces
/** The feeding flower: a red trumpet whose open mouth (scalloped, yellow throat) is at (mx, my) facing the bill; `ang`
 *  points from the mouth back along the tube to the calyx. s scales it; nod tilts it a little. Returns the calyx end. */
export function tubeFlower(c, mx, my, ang, L = 30, s = 1) {
  const cs = Math.cos(ang), sn = Math.sin(ang), nx = -sn, ny = cs, RED = P.red, lit = nx * -0.6 + ny * -0.8 > 0 ? 1 : -1;
  const shadeTo = (X, Y, t) => { const fl = Math.floor(t); c.px(X, Y, RED[Math.max(1, Math.min(7, t - fl > bayer(X, Y) ? fl + 1 : fl))]); };
  // calyx + tube behind the mouth: narrowing toward the base, lit along the upper side
  const bx = mx + cs * L, by = my + sn * L;
  for (let i = 0; i < 8 * s; i++) { const w = (3.6 - i * 0.2) * s; for (let j = -Math.ceil(w); j <= Math.ceil(w); j++) if (Math.abs(j) <= w) c.px(R(bx + cs * i + nx * j), R(by + sn * i + ny * j), j * lit > 0 ? "#7A3A50" : "#4A1A32"); }
  for (let i = 0; i <= L; i++) {
    const k = i / L, w = (4.2 - 1.8 * k) * s, px = mx + cs * i, py = my + sn * i;
    for (let j = -Math.ceil(w) - 1; j <= Math.ceil(w) + 1; j++) {
      if (Math.abs(j) > w + 0.4) continue; const e = (j / w) * lit, X = R(px + nx * j), Y = R(py + ny * j);
      if (Math.abs(j) > w - 0.6) { c.px(X, Y, RED[0]); continue; }
      shadeTo(X, Y, 3.6 + e * 1.8 - k * 0.6 + (e > 0.3 && e < 0.7 && k > 0.15 && k < 0.8 ? 1.2 : 0));
    }
  }
  // the open mouth: an ellipse across the axis with five scalloped lobes, a yellow throat and a dark opening
  const ra = 4.2 * s, rb = 10 * s;
  for (let Y = R(my - rb - 2); Y <= R(my + rb + 2); Y++) for (let X = R(mx - rb - 2); X <= R(mx + rb + 2); X++) {
    const dx = X + 0.5 - mx, dy = Y + 0.5 - my, p = dx * cs + dy * sn, q = dx * nx + dy * ny, th = Math.atan2(q / rb, p / ra), sc = 1 - 0.13 * Math.abs(Math.sin(2.5 * th + 0.3));
    const d = Math.hypot(p / ra, q / rb) / sc; if (d > 1) continue;
    if (d > 0.86) { c.px(X, Y, q * lit > 0 ? RED[2] : RED[0]); continue; }
    const vein = Math.abs(Math.sin(2.5 * th + 0.3 + Math.PI / 2)) < 0.12 && d > 0.4;
    if (d < 0.22) c.px(X, Y, d < 0.12 ? "#2A0408" : "#6A1010");
    else if (d < 0.46) c.px(X, Y, d < 0.33 ? "#E89A28" : (d - 0.33) / 0.13 > bayer(X, Y) ? RED[5] : "#FFD04A");
    else shadeTo(X, Y, vein ? 3.4 : 4.6 + (q * lit > 0 ? 1.4 : 0) + (p < 0 ? 0.6 : -0.4) - (d - 0.46) * 1.5);
  }
  return [bx + cs * 8 * s, by + sn * 8 * s];
}
/** Hummingbird feeder hanging from (hx, hy) on a wire of length wl; sw = swing angle (rad). */
export function feeder(c, hx, hy, wl, sw = 0, a = 1) {
  const g = fade(c, a), cs = Math.cos(sw), sn = Math.sin(sw), P2 = (u, v) => [hx + u * cs - (v) * sn, hy + u * sn + v * cs];
  const [tx, ty] = P2(0, wl); g.line(R(hx), R(hy), R(tx), R(ty), "#3A3A44"); g.px(R(hx), R(hy) - 1, "#3A3A44");
  const x = R(tx), y = R(ty);
  // hook + red cap
  g.rect(x - 1, y, 3, 3, "#5A5A66"); for (let j = 0; j < 7; j++) { const w = R(3 + j * 1.6); g.rect(x - w, y + 3 + j, 2 * w + 1, 1, j === 0 ? "#FF6A5A" : j < 3 ? "#E8302E" : "#B81C24"); }
  g.rect(x - 14, y + 10, 29, 2, "#6A0E14");
  // glass bottle with red nectar (light reflections)
  for (let j = 0; j < 30; j++) { const w = 11 - (j < 4 ? 4 - j : 0); for (let i = -w; i <= w; i++) { const edge = Math.abs(i) === w, nect = j > 7; let col = edge ? "#7A8AA0" : nect ? (i < -w + 3 ? "#FF7A86" : i > w - 3 ? "#A0182C" : "#E0283C") : (i < -w + 3 ? "#F4FAFF" : "#C8D8EC"); if (j === 8 && !edge) col = "#FF9AA4"; if (!edge && i === -w + 2 && j > 2 && j < 26) col = "#FFFFFF"; g.px(x + i, y + 12 + j, col); } }
  // red base dish with yellow flower ports
  for (let j = 0; j < 8; j++) { const w = 16 - Math.abs(j - 3) * (j > 3 ? 1.6 : 0.6); g.rect(R(x - w), y + 42 + j, R(2 * w) + 1, 1, j < 2 ? "#FF5A50" : j < 5 ? "#D8202A" : "#8A0E18"); }
  for (const dx of [-11, 0, 11]) { smallFlower(g, x + dx, y + 43, 2.2, "#FFD23A", "#C86A10"); }
}
/** A round dew drop (r 2..5) with a highlight and a soft twinkle (tw 0..1). */
export function dewDrop(c, x, y, r, base, tw = 0) {
  x = R(x); y = R(y);
  for (let Y = -r; Y <= r; Y++) for (let X = -r; X <= r; X++) { const d = (X * X + Y * Y) / (r * r); if (d > 1.05) continue; const col = d > 0.7 ? mix(base, "#0A2A10", 0.35) : Y > 0 ? mix(base, "#F0FFF0", 0.45) : mix(base, "#CFF0D8", 0.25); c.px(x + X, y + Y, col); }
  c.px(x - R(r * 0.4), y - R(r * 0.4), "#FFFFFF"); if (r >= 3) c.px(x - R(r * 0.4) + 1, y - R(r * 0.4), "#FFFFFF");
  if (tw > 0.05) { const L = R(1 + tw * (r + 2)), hx = x - R(r * 0.4), hy = y - R(r * 0.4); for (let i = 1; i <= L; i++) { const col = i === L ? "#E8FFF0" : "#FFFFFF"; c.px(hx + i, hy, col); c.px(hx - i, hy, col); c.px(hx, hy + i, col); c.px(hx, hy - i, col); } }
}
export { tube };
