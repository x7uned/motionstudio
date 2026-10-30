// Aedes aegypti in pixel art at any scale: a few outlined pixels in the wide shots, a detailed shaded insect in the macro.
// Female: thin antennae, short palps; male: bushy (plumose) antennae and long palps. Black body with white scale
// marks (side patches on the thorax, bands on legs and abdomen). Wings blur into a dithered fan while flying. Illustration.
import { fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth, drawPart } from "./mshade.mjs";

const R = Math.round;
export const BUG = ["#07050B", "#120E19", "#1F1929", "#30283E", "#463C58", "#655A7C", "#948AAE"];
const WHITE = "#E9E6F2", RIM = "#A99FC8", WING = "#C9D4F2", WINGD = "#9AA6CC", BLOOD = ["#3A060E", "#6E0E1C", "#A41C2A", "#D8343C", "#F2706A", "#FFB0A0"], EGG = "#FBF3D8";
const HALO = "#D9CCF5";

/** Draw through a recording proxy, then paint a 1-px halo around everything that was drawn (keeps a tiny dark bug readable). */
function outlined(c, draw, col, a = 1, bodyA = 1) {
  const rec = new Map(), p = Object.create(c);
  p.px = (x, y, cc) => { x = Math.floor(x); y = Math.floor(y); if (!cc || x < 0 || y < 0 || x >= c.w || y >= c.h) return; rec.set(y * c.w + x, cc); };
  const ret = draw(p), o = fade(c, a);
  for (const k of rec.keys()) { const x = k % c.w, y = (k - x) / c.w; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = (y + dy) * c.w + x + dx; if (!rec.has(q)) o.px(x + dx, y + dy, col); } }
  const b = fade(c, bodyA); for (const [k, cc] of rec) { const x = k % c.w; b.px(x, (k - x) / c.w, cc); }
  return ret;
}

/**
 * x, y: screen point of the thorax centre. s: pixels per world unit (body ≈ 8 units long). face: -1 = facing left, 1 = right.
 * o: { tilt (rad, + = head down), fly (0..1 wing blur vs folded), legs (0 flying .. 1 standing), fed (0..1 abdomen full of blood),
 *      eggs (0..1 eggs shown through the abdomen), male (bool), t (time for the wing beat), alpha, halo (0..1 outline for small sizes) }
 */
export function drawMosquito(c, x, y, s, o = {}) {
  // the small and the detailed drawing cross-dissolve over a range of sizes, so a zoom never swaps styles in one frame
  if (o.detail === undefined) { const k = Math.max(0, Math.min(1, (s - 3.8) / 0.8)), a = o.alpha ?? 1; let r; if (k < 1) r = drawMosquito(c, x, y, s, { ...o, detail: false, alpha: a * (1 - k) }); if (k > 0) r = drawMosquito(c, x, y, s, { ...o, detail: true, alpha: a * k }); return r; }
  const halo = o.halo ?? (s < 3.8 ? 0.7 : s < 4.6 ? 0.7 - 0.25 * (s - 3.8) / 0.8 : s < 12 ? 0.45 : s < 16 ? 0.45 * (16 - s) / 4 : 0);
  if (halo > 0 && !o._inner) return outlined(c, (p) => drawMosquito(p, x, y, s, { ...o, _inner: true, alpha: 1 }), HALO, halo * (o.alpha ?? 1), o.alpha ?? 1);
  const { tilt = 0, fly = 1, legs = 0, fed = 0, eggs = 0, male = false, t = 0, alpha = 1 } = o, face = o.face ?? -1;
  const g = alpha < 1 ? fade(c, alpha) : c, th = -tilt, ca = Math.cos(th), sa = Math.sin(th);
  // local (u along the body, + towards the tail; v down) → screen; facing left means the head (u < 0) is on the left
  const P = (u, v) => { const lu = u + 0.55, lv = v + 0.25, ru = lu * ca - lv * sa, rv = lu * sa + lv * ca; return [x - face * ru * s, y + rv * s]; };
  const seg = (a, b, col, w = 1) => { const [x0, y0] = P(...a), [x1, y1] = P(...b); if (w <= 1.2) { g.line(R(x0), R(y0), R(x1), R(y1), col); return; } const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))), r = w / 2; for (let i = 0; i <= n; i++) { const cx = x0 + (x1 - x0) * i / n, cy = y0 + (y1 - y0) * i / n; g.rect(R(cx - r), R(cy - r), Math.max(1, R(w)), Math.max(1, R(w)), col); } };
  const lerp2 = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  const big = o.detail, mid = s >= 2.6;

  // ---------------- wings: a narrow blurred stroke above the body while flying (denser where the wing turns), folded over the abdomen when standing
  const hinge = [-0.3, -0.85];
  if (fly > 0) {
    const len = 3.7, beat = Math.sin(t * 2 * Math.PI * 9.3), a0 = -1.85 + 0.12 * beat, a1 = -0.62 + 0.08 * beat;
    const n = Math.ceil(len * s * 1.9), step = 1 / s;
    for (let k = 0; k <= n; k++) {
      const q = k / n, dwell = 0.35 + 0.65 * Math.pow(Math.abs(q - 0.5) * 2, 3), a = a0 + (a1 - a0) * q, ca2 = Math.cos(a), sa2 = Math.sin(a) * 0.85;
      for (let r = big ? 2 * step : step; r < len; r += step) { const dens = fly * (big ? 0.34 : 0.6) * dwell * (0.4 + 0.6 * r / len), [px, py] = P(hinge[0] + ca2 * r, hinge[1] + sa2 * r); fade(c, alpha * dens).px(R(px), R(py), r > len - 1.5 * step ? WINGD : WING); }
    }
  }
  if (fly < 1 && big) {
    const f = fade(c, alpha * (1 - fly) * 0.85), a = P(...hinge), b = P(3.4, -0.25), m = P(1.6, -0.95);
    f.poly([a, m, b, P(1.4, -0.35)], WING); f.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), WINGD); f.line(R(a[0]), R(a[1]), R(m[0]), R(m[1]), WINGD); f.line(R(m[0]), R(m[1]), R(b[0]), R(b[1]), WINGD);
  }
  // ---------------- legs (6): flying → trailing and dangling; standing → splayed down to the surface, hind pair raised
  const legSet = [
    { root: [-0.95, 0.35], flyK: [-1.9, 1.5], flyF: [-2.5, 3.1], stK: [-2.0, 0.55], stF: [-3.0, 2.15] },
    { root: [-0.6, 0.45], flyK: [-0.45, 1.9], flyF: [0.25, 3.6], stK: [-0.5, 0.85], stF: [-0.2, 2.2] },
    { root: [-0.2, 0.4], flyK: [1.15, 1.45], flyF: [3.2, 2.6], stK: [1.1, 0.45], stF: [2.6, 2.1] },
  ];
  const lw = big ? Math.max(1, s * 0.1) : 1;
  const leg = (L, side) => {
    const off = side * 0.2, k = [L.flyK[0] + (L.stK[0] - L.flyK[0]) * legs + off, L.flyK[1] + (L.stK[1] - L.flyK[1]) * legs], f = [L.flyF[0] + (L.stF[0] - L.flyF[0]) * legs + off * 2, L.flyF[1] + (L.stF[1] - L.flyF[1]) * legs];
    const col = side < 0 ? BUG[5] : BUG[4];
    if (!mid) { if (side > 0) seg(L.root, [f[0] + 0.6 * (1 - legs), f[1] - 0.5 * (1 - legs)], col); return; }
    seg(L.root, k, col, lw * 1.3); seg(k, f, col, lw);
    const bands = (a, b) => { if (big) for (let q = 0.25; q < 0.95; q += 0.25) seg(lerp2(a, b, q), lerp2(a, b, q + 0.05), WHITE, lw); };
    bands(k, f);
    // Aedes holds the hind tarsi curled up when standing
    if (L === legSet[2] && legs > 0.3) { const tip = [f[0] + 0.9 * legs, f[1] - 2.0 * legs]; seg(f, tip, col, lw); bands(f, tip); }
  };
  for (const L of legSet) leg(L, 1);

  // ---------------- abdomen (8 segments, white basal bands below; swells red with blood; eggs show through)
  const abd = [], swell = 1 + 0.6 * fed;
  for (let k = 0; k <= 12; k++) { const u = k / 12, cu = 0.35 + u * 3.35, cv = 0.05 + u * 0.48 + Math.sin(u * Math.PI) * 0.14 * fed, w = (0.58 - 0.3 * u) * swell * (1 - 0.6 * Math.pow(u, 6)); abd.push({ cu, cv, w }); }
  const ring = (k0, k1, f) => [...abd.slice(k0, k1 + 1).map((p) => P(p.cu, p.cv - p.w * f)), ...abd.slice(k0, k1 + 1).reverse().map((p) => P(p.cu, p.cv + p.w * f))];
  if (big) {
    drawPart(g, [smooth(ring(0, 12, 1), new Set(), 4)], { ramp: BUG, base: 2.2, gain: 2.4, thick: 0.45 * s, light: [-0.5, -0.9], outline: BUG[0], litOutline: RIM, alpha });
    if (fed > 0) drawPart(fade(c, alpha * Math.min(1, fed * 1.2)), [smooth(ring(1, 11, 0.86), new Set(), 4)], { ramp: BLOOD, base: 2.4, gain: 2.4, thick: 0.4 * s, light: [-0.5, -0.9], outline: BLOOD[0], litOutline: BLOOD[5] });
    // dark tergite plates over the top half and white bands at the base of each segment below
    for (let k = 1; k < 11; k++) { const p = abd[k], q = abd[k + 1];
      if (fed > 0) { const tf = fade(c, alpha * fed); const [ax, ay] = P(p.cu, p.cv - p.w * 0.95), [bx, by] = P(q.cu - 0.05, q.cv - q.w * 0.95), [cx2, cy2] = P(q.cu - 0.05, q.cv - q.w * 0.35), [dx, dy] = P(p.cu, p.cv - p.w * 0.35); tf.poly([[ax, ay], [bx, by], [cx2, cy2], [dx, dy]], BUG[2]); }
      if (k % 1.5 < 1) { const [ax, ay] = P(p.cu, p.cv + p.w * 0.35), [bx, by] = P(p.cu, p.cv + p.w * 0.92); g.line(R(ax), R(ay), R(bx), R(by), WHITE); if (s > 14) g.line(R(ax) + 1, R(ay), R(bx) + 1, R(by), WHITE); } }
    if (eggs > 0) for (let k = 0; k < 12; k++) { const u = 0.22 + (k % 6) * 0.1, row = k < 6 ? -0.28 : 0.28, p = abd[Math.min(12, Math.round(u * 12))], [ex, ey] = P(0.35 + u * 3.35, p.cv + row * p.w); const a = Math.max(0, Math.min(1, eggs * 12 - k * 0.55)); if (a > 0) { const f = fade(c, alpha * a), rx = Math.max(1, R(s * 0.17)), ry = Math.max(1, R(s * 0.1)); f.ellipse(R(ex), R(ey), rx + 1, ry + 1, "#5A3A20"); f.ellipse(R(ex), R(ey), rx, ry, EGG); f.px(R(ex - rx / 2), R(ey - ry / 2), "#FFFFFF"); } }
  } else {
    const n = 8; for (let i = 0; i <= n; i++) { const p = abd[Math.round(i / n * 12)], [ax, ay] = P(p.cu, p.cv); g.disc(R(ax), R(ay), Math.max(0, R(p.w * s - 0.6)), fed > 0.5 ? BLOOD[2] : BUG[2]); }
  }
  // ---------------- thorax (white side patches, white scutum edge), head with the compound eye, proboscis, palps, antennae
  const [tx, ty] = P(-0.55, -0.25);
  if (big) {
    const thp = []; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; thp.push(P(-0.55 + Math.cos(a) * 1.0, -0.25 + Math.sin(a) * 0.78 - (Math.sin(a) < 0 ? 0.14 * Math.abs(Math.cos(a)) : 0))); }
    drawPart(g, [smooth(thp, new Set(), 4)], { ramp: BUG, base: 2.4, gain: 2.8, thick: 0.6 * s, light: [-0.5, -0.9], outline: BUG[0], litOutline: RIM, alpha });
    for (let q = 0.12; q <= 0.88; q += 0.012) { const a = Math.PI + q * Math.PI * 0.62, [ax, ay] = P(-0.55 + Math.cos(a) * 0.82, -0.3 + Math.sin(a) * 0.62); g.px(R(ax), R(ay), WHITE); if (s > 12) g.px(R(ax), R(ay) + 1, WHITE); }
    for (const [u, v, r] of [[-0.95, 0.15, 0.13], [-0.5, 0.28, 0.12], [-0.15, 0.05, 0.1], [-1.15, -0.25, 0.09]]) { const [ax, ay] = P(u, v); g.disc(R(ax), R(ay), Math.max(1, R(r * s)), WHITE); }
  } else g.disc(R(tx), R(ty), Math.max(1, R(0.8 * s)), BUG[2]);
  if (big) { const [hx, hy] = P(0.25, -0.62); g.disc(R(hx), R(hy), Math.max(1, R(0.12 * s)), "#B7B2C6"); }
  const [hx, hy] = P(-1.62, -0.05);
  if (big) { g.disc(R(hx), R(hy), R(0.52 * s), BUG[1]); g.disc(R(hx + 0.08 * s * face), R(hy - 0.02 * s), R(0.4 * s), "#241A3A"); const [ex, ey] = P(-1.82, -0.24); g.disc(R(ex), R(ey), Math.max(1, R(0.1 * s)), "#9A90C8"); g.px(R(ex), R(ey), WHITE);
    for (let q = 0; q < 1; q += 0.05) { const a = -Math.PI * 0.95 + q * Math.PI * 0.8, [ax, ay] = [hx + Math.cos(a) * 0.52 * s, hy + Math.sin(a) * 0.52 * s]; g.px(R(ax), R(ay), RIM); } }
  else g.disc(R(hx), R(hy), Math.max(0, R(0.45 * s)), BUG[1]);
  // proboscis (black, a pale band in the middle)
  seg([-1.95, 0.15], [-4.1, 1.0], BUG[2], big ? Math.max(1, s * 0.12) : 1);
  if (big) seg([-2.85, 0.5], [-3.1, 0.6], WHITE, Math.max(1, s * 0.12));
  // palps
  if (male) {
    seg([-1.95, 0.05], [-3.95, 0.82], BUG[3], big ? Math.max(1, s * 0.11) : 1);
    if (big) for (let q = 0.45; q <= 1; q += 0.04) { const a = lerp2([-1.95, 0.05], [-3.95, 0.82], q), [ax, ay] = P(...a), [bx, by] = P(a[0] - 0.12, a[1] - 0.32 - 0.1 * Math.sin(q * 30)); g.line(R(ax), R(ay), R(bx), R(by), BUG[5]); }
  } else seg([-1.95, 0.05], [-2.42, 0.3], BUG[3], big ? Math.max(1, s * 0.11) : 1);
  // antennae: female sparse short whorls; male a dense bottle-brush
  for (const side of [0.22, 0]) {
    const a = [-1.95, -0.3], b = [-3.05 - side, -1.55 + side * 0.4];
    seg(a, b, side ? BUG[3] : BUG[4], big ? Math.max(1, s * 0.07) : 1);
    if (big) for (let q = 0.1; q <= 1; q += male ? 0.032 : 0.13) {
      const m = lerp2(a, b, q), L = male ? 0.6 * (1 - q * 0.45) : 0.17, [ax, ay] = P(...m);
      for (const d of [-1, 1]) { const [bx, by] = P(m[0] + d * 0.35 * L - 0.1 * L, m[1] + d * L * 0.9 - 0.1 * L); g.line(R(ax), R(ay), R(bx), R(by), male ? ((q * 37) % 1 > 0.5 ? BUG[6] : BUG[5]) : BUG[5]); }
    }
  }
  if (mid) for (const L of legSet) leg(L, -1);
  return { proboscisTip: P(-4.1, 1.0), abdomen: P(2.0, 0.35), head: [hx, hy], thorax: [tx, ty] };
}

/** Tiny 9×6 mosquito icon (for the counts). */
export const ICON = ["...#.....", "..#.#....", ".#####...", "#..####.#", "...#..##.", "..#..#..."];
