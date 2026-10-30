// FINDER · the big FRONT face of our recurring hero (cat-zoomies/film/person.mjs, side view → here front-on): the same
// skin ramp, purple bobble hat with a ribbed cuff and a pale pompom, brown hair, glossy brown eyes, dithered blush,
// light-blue striped pyjamas with navy piping. Built in "face units" (head ≈ 100 wide; y down) and drawn through a warp:
//   screen = anchor + (sx·s, s) · M(r) · (p − bulgeCentre),  M(r) = 1 + k·exp(−r² / 2σ²)
// so the same polygons give the normal face (k = 0), the wide-angle selfie bulge (k > 0: the nose and centre magnified,
// the ears / hat sides pulled in) and the card-turn (sx = cos θ: squash to a line, then the mirror image — the
// asymmetric fringe, mole and pompom swap sides by themselves). Polygons go through the volume-shading engine in
// screen space (crisp 1-px outlines at every warp); eyes, brows, mouth, blush and mole are painted per pixel through the
// exact inverse warp. Pure functions of their arguments.
import { mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { smooth as spline } from "../../../dog/shade.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------- palettes (person.mjs, 8 steps dark → light)
export const SKIN = ["#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC"];
export const HAT = ["#1A1030", "#2A1F40", "#3B2C5C", "#523D82", "#6E4FB0", "#8D59DA", "#B08AE8", "#E0CDF8"];
export const HAIR = ["#120A06", "#1E120A", "#2E1C10", "#3E2818", "#523620", "#6A4628", "#806040", "#9A7A58"];
export const PJ = ["#141A3E", "#232F66", "#37498F", "#5069B6", "#7090D6", "#94B2EC", "#BCD2F8", "#E4EEFF"];
export const PIPE = ["#0C0A18", "#181430", "#22204A", "#2E2E66", "#3E4284", "#5258A0", "#6A74BC", "#8A94D4"];
export const POM = ["#3A3254", "#5A5276", "#7A7298", "#9C94B8", "#BEB6D6", "#D8D2EA", "#EEEAF8", "#FFFFFF"];
const INK = "#1E0E0C", BROW = "#3A2414", WHITE = "#FDF6EE", IRIS = ["#3A1608", "#6A3216", "#94502A", "#B8743E", "#D09058"], BLUSH = "#E8807A";
const LIGHT = [-0.55, -0.85];

// ---------------------------------------------------------------- warp
/**
 * o: { x, y } screen point of the bulge centre (the nose), s px per unit, sx horizontal factor (1 real, −1 mirror, cos θ
 * during a card turn), bulge 0..1 (wide-angle selfie), k (max centre gain), sigma (Gaussian radius, units).
 */
export function makeXf(o) {
  const bc = o.bc ?? [0, 17], sg = o.sigma ?? 26, k = (o.k ?? 0.52) * clamp01(o.bulge ?? 0), s = o.s, sx = o.sx ?? 1, sxs = Math.abs(sx) < 1e-3 ? 1e-3 : sx;
  const i2 = 1 / (2 * sg * sg), M = (r2) => 1 + k * Math.exp(-r2 * i2);
  return {
    s, sx, k, bc,
    P: (p) => { const du = p[0] - bc[0], dv = p[1] - bc[1], m = M(du * du + dv * dv); return [o.x + sxs * s * du * m, o.y + s * dv * m]; },
    inv: (X, Y) => {
      const px = (X - o.x) / (sxs * s), py = (Y - o.y) / s, rho = Math.hypot(px, py);
      if (k < 1e-5 || rho < 1e-6) return [bc[0] + px, bc[1] + py];
      let r = rho / M((rho / (1 + k * 0.5)) ** 2);                 // Newton on r·M(r) = rho (monotone for k < 2)
      for (let it = 0; it < 3; it++) { const e = k * Math.exp(-r * r * i2), f = r * (1 + e) - rho, d = 1 + e * (1 - 2 * r * r * i2); r -= f / d; }
      const f = r / rho; return [bc[0] + px * f, bc[1] + py * f];
    },
    /** local magnification (px per unit) at a unit point */
    mag: (p) => { const du = p[0] - bc[0], dv = p[1] - bc[1]; return s * M(du * du + dv * dv); },
  };
}

// ---------------------------------------------------------------- volume shading (person.mjs part(), multi-polygon union + tone pattern)
export function part(g, polys, o) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (!(x1 - x0 >= 0.6) || !(y1 - y0 >= 0.6)) return;
  const thick = o.thick ?? 10, M = Math.ceil(thick) + 4, cw = g.w ?? 4000, ch = g.h ?? 4000;
  x0 = Math.max(-M, Math.floor(x0) - 2); y0 = Math.max(-M, Math.floor(y0) - 2); x1 = Math.min(cw + M, Math.ceil(x1) + 2); y1 = Math.min(ch + M, Math.ceil(y1) + 2);
  const W = x1 - x0, H = y1 - y0; if (W <= 0 || H <= 0 || W * H > 3e6) return;
  const m = new Uint8Array(W * H);
  for (const poly of polys) {
    const n = poly.length;
    for (let y = 0; y < H; y++) {
      const yc = y0 + y + 0.5, xs = [];
      for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
      xs.sort((a, b) => a - b);
      for (let q = 0; q + 1 < xs.length; q += 2) { const e = Math.min(W, Math.round(xs[q + 1]) - x0); for (let x = Math.max(0, Math.round(xs[q]) - x0); x < e; x++) m[y * W + x] = 1; }
    }
  }
  const d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = m[i] ? 1e9 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 1.414); } d[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x < W - 1) v = Math.min(v, d[i + 1] + 1); if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + W - 1] + 1.414); } d[i] = v; }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]);
  const { ramp, base = 3.4, gain = 1.4, slope = 1.0, rimLit = 0.8, rimShade = 0.8, outline = ramp[0], litOutline = null, pattern = null, light = LIGHT } = o;
  const ln = Math.hypot(light[0], light[1]), ux = light[0] / ln, uy = light[1] / ln;
  const lx3 = R(ux * 3), ly3 = R(uy * 3), sx4 = R(-ux * 4), sy4 = R(-uy * 4), lx1 = R(ux * 1.5), ly1 = R(uy * 1.5);
  const gx0 = Math.max(0, -x0), gy0 = Math.max(0, -y0), gx1 = Math.min(W, cw - x0), gy1 = Math.min(H, ch - y0);
  for (let y = gy0; y < gy1; y++) for (let x = gx0; x < gx1; x++) {
    const i = y * W + x; if (!m[i]) continue;
    const X = x0 + x, Y = y0 + y;
    if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) { if (outline) g.px(X, Y, litOutline && !at(x + lx1, y + ly1) ? litOutline : outline); continue; }
    let v = base + gain * Math.pow(Math.min(1, d[i] / thick), 0.6) - slope * (y / H);
    if (!at(x + lx3, y + ly3)) v += rimLit;
    if (!at(x + sx4, y + sy4)) v -= rimShade;
    if (pattern) v += pattern(X, Y);
    const fl = Math.floor(v), f = v - fl, q = f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl;
    g.px(X, Y, ramp[Math.max(1, Math.min(ramp.length - 1, q))]);
  }
}
const ellP = (cx, cy, rx, ry, n = 20) => Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const mirrorX = (pts) => pts.map(([x, y]) => [-x, y]);
/** unit-space control points → smoothed → warped screen polygon */
export const W_ = (xf, pts, sharp = new Set(), seg = 5) => spline(pts, sharp, seg).map(xf.P);
/** Per-pixel painter in unit space: fn(u, v, X, Y) → colour | null. box = [u0, v0, u1, v1]. */
export function paint(g, xf, box, fn) {
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) { const [X, Y] = xf.P([lerp(box[0], box[2], i / 4), lerp(box[1], box[3], j / 4)]); if (X < X0) X0 = X; if (Y < Y0) Y0 = Y; if (X > X1) X1 = X; if (Y > Y1) Y1 = Y; }
  const cw = g.w ?? 4000, ch = g.h ?? 4000;
  for (let Y = Math.max(0, Math.floor(Y0) - 1); Y <= Math.min(ch - 1, Math.ceil(Y1) + 1); Y++) for (let X = Math.max(0, Math.floor(X0) - 1); X <= Math.min(cw - 1, Math.ceil(X1) + 1); X++) {
    const q = xf.inv(X + 0.5, Y + 0.5); if (!q) continue;
    const [u, v] = q; if (u < box[0] || u > box[2] || v < box[1] || v > box[3]) continue;
    const c = fn(u, v, X, Y); if (c) g.px(X, Y, c);
  }
}
const segD = (u, v, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((u - a[0]) * dx + (v - a[1]) * dy) / L)); return Math.hypot(u - a[0] - dx * t, v - a[1] - dy * t); };
const bezPts = (a, c, b, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = 1 - t; return [s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]; });
const polyD = (u, v, pts) => { let d = Infinity; for (let i = 0; i + 1 < pts.length; i++) d = Math.min(d, segD(u, v, pts[i], pts[i + 1])); return d; };

// ---------------------------------------------------------------- geometry (units; origin between the eyes, y down)
const HEAD_R = [[0, -64], [20, -62], [36, -54], [45, -40], [49.5, -22], [50.5, -4], [49.5, 10], [46, 24], [40, 36], [31, 46], [18, 53]];
const HEAD = [...HEAD_R, [0, 56], ...mirrorX(HEAD_R.slice(1)).reverse()];
const NECK = [[-15, 40], [15, 40], [16.5, 76], [-16.5, 76]];
const BODY_R = [[0, 66], [20, 66.5], [52, 73], [84, 85], [100, 102], [108, 160]];
const BODY = [...BODY_R, ...mirrorX(BODY_R.slice(1)).reverse()];
const LAPEL_R = [[15, 65], [34, 71], [12, 104], [3, 96]];
const CUFF_TOP = (x) => -53 + 13 * (x / 57) ** 2, CUFF_BOT = (x) => -31 + 14 * (x / 57) ** 2;
const CUFF = [...Array.from({ length: 13 }, (_, i) => { const x = -57 + i * 9.5; return [x, CUFF_TOP(x)]; }), ...Array.from({ length: 13 }, (_, i) => { const x = 57 - i * 9.5; return [x, CUFF_BOT(x)]; })];
const CUFF_SHARP = new Set([0, 12, 13, 25]);
// asymmetric details (REAL view; the mirror image comes from sx < 0)
const FRINGE = [[-34, -33], [-14, -36], [8, -35], [26, -31], [39, -22], [45, -7], [37, -12.5], [28, -18.5], [15, -21.5], [1, -23.5], [-11, -25.0], [-22, -26.4], [-33, -28]];
const LOCK = [[-31, -30], [-23, -30], [-25, -25.5], [-28, -24.5], [-31.5, -27]];
const SIDEBURN = [[41, -29], [50.5, -27], [51.5, -8], [47.5, -6], [44, -17]];
const MOLE = [29, 27];
const POM_LEAN = 15;

/**
 * Draw the face. o: { x, y, s, sx, bulge, k } (warp, see makeXf) and the expression (all continuous 0..1):
 *   sad (droopy lids, worried brows, frown) · smile (curved smile, raised cheeks) · grin (open happy mouth) · blink ·
 *   look [dx, dy] (−1..1) · blush (0..1.5) · earIn (0..1 pull the ears behind the cheeks) · body (draw pyjama shoulders)
 * Returns anchors in screen px: { nose: {x, y, halfW}, eyeL, eyeR, mouth, top, chin, cheekR }.
 */
export function drawFace(g, o) {
  const xf = o.xf ?? makeXf(o), s = xf.s, asx = Math.abs(xf.sx);
  if (asx < 0.03) return null;
  const sad = clamp01(o.sad ?? 0), smile = clamp01(o.smile ?? 0), grin = clamp01(o.grin ?? 0), blink = clamp01(o.blink ?? 0), look = o.look ?? [0, 0];
  const lean = POM_LEAN, th = (u) => Math.max(2, u * s);
  // pyjama shoulders: vertical stripes (cylinder-ish), navy piping on the collar, two buttons
  if (o.body !== false) {
    part(g, [W_(xf, BODY, new Set([5, 6]))], { ramp: PJ, base: 4.2, gain: 1.1, slope: 0.9, thick: th(26), rimLit: 0.6, pattern: (X, Y) => { const q = xf.inv(X + 0.5, Y + 0.5); if (!q) return 0; const u = q[0] * (1 + 0.004 * Math.abs(q[0])); return ((u / 11 + 100.5) % 1) < 0.28 ? -1 : 0; } });
    for (const sd of [1, -1]) part(g, [W_(xf, sd > 0 ? LAPEL_R : mirrorX(LAPEL_R), new Set([0, 1, 2, 3]), 3)], { ramp: PJ, base: 4.9, gain: 0.6, slope: 0.4, thick: th(4), outline: PIPE[2], rimLit: 0.4 });
    paint(g, xf, [-4, 106, 4, 140], (u, v) => { for (const by of [112, 130]) { const d = Math.hypot(u, v - by); if (d < 2.6) return d > 1.7 ? PIPE[3] : PJ[7]; } return null; });
  }
  part(g, [W_(xf, NECK, new Set([0, 1, 2, 3]), 2)], { ramp: SKIN, base: 3.1, gain: 0.9, slope: 0.6, thick: th(10), rimLit: 0.3 });
  // ears (behind the head; pulled in toward the cheeks in the wide-angle shot)
  const earIn = clamp01(o.earIn ?? 0), earX = 49.5 - 5.5 * earIn;
  for (const sd of [-1, 1]) {
    part(g, [W_(xf, ellP(sd * earX, 4, 8.6, 13.5, 18))], { ramp: SKIN, base: 3.9, gain: 1.0, slope: 0.7, thick: th(5), rimLit: 0.5 });
    paint(g, xf, [sd * earX - 9, -10, sd * earX + 9, 18], (u, v) => { const a = (u - sd * (earX + 1.4)) / 4.2, b = (v - 4) / 8.2, r2 = a * a + b * b; return r2 < 1 && r2 > 0.38 && (u - sd * earX) * sd > -1.2 ? SKIN[3] : null; });
  }
  // head
  part(g, [W_(xf, HEAD, new Set(), 4)], { ramp: SKIN, base: 4.25, gain: 1.45, slope: 1.0, thick: th(22), rimLit: 0.55, rimShade: 0.6 });
  // blush, mole (under the hair and features)
  const bl = clamp01((o.blush ?? 0.7) / 1.5) * 1.5;
  for (const sd of [-1, 1]) { const bx = sd * 31.5, by = 15 - 1.5 * smile;
    paint(g, xf, [bx - 10, by - 6, bx + 10, by + 6], (u, v, X, Y) => { const dd = ((u - bx) / 9.5) ** 2 + ((v - by) / 4.6) ** 2; return dd < 1 && (1 - dd) * 1.5 * bl > bayer(X, Y) && ((X + Y) & 1) === 0 ? BLUSH : null; }); }
  paint(g, xf, [MOLE[0] - 2.5, MOLE[1] - 2.5, MOLE[0] + 2.5, MOLE[1] + 2.5], (u, v) => { const d = Math.hypot(u - MOLE[0], v - MOLE[1]), r = Math.max(1.9, 1.6 / xf.mag(MOLE)); return d < r ? (d < r * 0.55 ? "#3A1A10" : "#6A3424") : null; });
  // hair: sideburns, the side-swept fringe and a small lock
  for (const sd of [-1, 1]) part(g, [W_(xf, sd > 0 ? SIDEBURN : mirrorX(SIDEBURN), new Set([0, 1]), 3)], { ramp: HAIR, base: 3.4, gain: 1.0, slope: 0.6, thick: th(3), rimLit: 0.8 });
  part(g, [W_(xf, LOCK, new Set([3]), 4)], { ramp: HAIR, base: 3.5, gain: 1.0, slope: 0.6, thick: th(3), rimLit: 0.9 });
  part(g, [W_(xf, FRINGE, new Set([5, 12, 0]), 5)], { ramp: HAIR, base: 3.6, gain: 1.2, slope: 0.7, thick: th(4), rimLit: 1.0, pattern: (X, Y) => { const q = xf.inv(X + 0.5, Y + 0.5); if (!q) return 0; const w = q[0] * 0.55 + q[1] * 1.1; return ((w / 3.2 + 100) % 1) < 0.22 ? -0.7 : 0; } });
  // the hat: crown (leans a little with the pompom), ribbed cuff, pompom
  const CROWN = [[-54, -42], [-53, -66], [-45 + lean * 0.1, -86], [-29 + lean * 0.35, -101], [-8 + lean * 0.6, -109], [12 + lean * 0.75, -108], [31 + lean * 0.55, -99], [45 + lean * 0.2, -85], [53, -66], [54, -42]];
  part(g, [W_(xf, CROWN, new Set([0, 9]), 5)], { ramp: HAT, base: 3.55, gain: 1.5, slope: 1.0, thick: th(20), rimLit: 0.8, pattern: (X, Y) => { const q = xf.inv(X + 0.5, Y + 0.5); if (!q) return 0; const [u, v] = q, row = (v + 200) / 7, fr = row % 1, col = (u + 200) / 6 + (Math.floor(row) % 2) * 0.5; return fr < 0.2 && ((col % 1) < 0.5 ? (col % 1) < fr * 2.2 : (1 - col % 1) < fr * 2.2) ? -0.55 : 0; } });
  part(g, [W_(xf, CUFF, CUFF_SHARP, 4)], { ramp: HAT, base: 4.35, gain: 0.9, slope: 0.7, thick: th(7), rimLit: 0.6, pattern: (X, Y) => { const q = xf.inv(X + 0.5, Y + 0.5); if (!q) return 0; const u = q[0]; return ((u / 5.6 + 100.5) % 1) < 0.3 ? -1 : 0; } });
  const pc = [lean * 1.05, -120 + Math.abs(lean) * 0.12], fuzz = Array.from({ length: 30 }, (_, i) => { const a = (2 * Math.PI * i) / 30, r = 17 + (i % 2 ? 0.9 : -0.6) + 0.6 * Math.sin(i * 2.3); return [pc[0] + Math.cos(a) * r, pc[1] + Math.sin(a) * r]; });
  part(g, [W_(xf, fuzz, new Set(), 2)], { ramp: POM, base: 4.0, gain: 1.7, slope: 0.9, thick: th(12), rimLit: 1.0 });
  paint(g, xf, [pc[0] - 15, pc[1] - 15, pc[0] + 15, pc[1] + 15], (u, v, X, Y) => { const d = Math.hypot(u - pc[0], v - pc[1]); if (d > 13.5) return null; const h = ((X * 7 + Y * 13) % 11 + 11) % 11; return h === 0 ? POM[3] : h === 5 && d < 10 ? POM[7] : null; });
  // eyes
  const pp = 1 / xf.mag([0, 0]);
  for (const sd of [-1, 1]) drawEye(g, xf, sd, { sad, smile: Math.max(smile, grin), blink, look, pp });
  // brows: sad → inner ends up (worried), happy → lifted arch
  for (const sd of [-1, 1]) {
    const lift = 0.9 * Math.max(smile, grin), inner = [sd * 9.5, -16.8 - 4.5 * sad - lift], outer = [sd * 31, -17.4 + 3 * sad - lift * 0.6], mid = [sd * 20, -20.2 - 1.2 * sad - lift + 0.4 * sad], pts = bezPts(inner, mid, outer, 10);
    const w = Math.max(1.6, 1.4 / xf.mag([sd * 20, -19]));
    paint(g, xf, [Math.min(inner[0], outer[0]) - 3, -32, Math.max(inner[0], outer[0]) + 3, -10], (u, v) => { const d = polyD(u, v, pts), t = clamp01((u - inner[0]) / (outer[0] - inner[0])); return d <= w * (1.15 - 0.45 * Math.abs(t - 0.35)) ? BROW : null; });
  }
  // nose: soft volume (tip + wings), nostrils, highlight
  const nose = [ellP(0, 17, 5.6, 5.0, 16), ellP(-5.6, 19.6, 3.5, 3.0, 12), ellP(5.6, 19.6, 3.5, 3.0, 12)].map((p) => spline(p, new Set(), 2).map(xf.P));
  part(g, nose, { ramp: SKIN, base: 4.35, gain: 1.0, slope: 1.4, thick: th(3.2), rimLit: 0.7, rimShade: 0.9, outline: SKIN[2] });
  paint(g, xf, [-8, 18, 8, 23], (u, v) => { for (const sd of [-1, 1]) if (((u - sd * 3.4) / 1.6) ** 2 + ((v - 21.0) / 0.95) ** 2 < 1) return SKIN[1]; return null; });
  paint(g, xf, [-4, 12, 1, 17], (u, v) => (((u + 1.7) / 1.5) ** 2 + ((v - 14.6) / 1.3) ** 2 < 1 ? SKIN[7] : null));
  paint(g, xf, [1, 6, 6, 13], (u, v) => (segD(u, v, [3.8, 8], [4.6, 12.2]) < Math.max(0.55, 0.6 * pp) ? SKIN[4] : null));
  // mouth
  drawMouth(g, xf, { sad, smile, grin, pp });
  // anchors
  const nl = xf.P([-9.1, 19.6]), nr = xf.P([9.1, 19.6]), nc = xf.P([0, 18.5]);
  return { nose: { x: (nl[0] + nr[0]) / 2, y: nc[1], halfW: Math.abs(nr[0] - nl[0]) / 2, l: nl, r: nr }, eyeL: xf.P([-21, 0]), eyeR: xf.P([21, 0]), mouth: xf.P([0, 34]), top: xf.P([lean, -139]), chin: xf.P([0, 56]), cheekR: xf.P([40, 20]), cheekL: xf.P([-40, 20]), hatL: xf.P([-55, -60]), hatR: xf.P([55, -60]), boxTL: xf.P([-52, -27]), boxBR: xf.P([52, 60]), noseTop: xf.P([0, 11]), noseBot: xf.P([0, 23.5]) };
}

function drawEye(g, xf, sd, { sad, smile, blink, look, pp }) {
  const ex = sd * 21, ey = 0, rx = 11, ry = 13;
  const lid = Math.max(blink, 0.16 * sad + 0.04), droop = 4.5 * sad, low = 0.2 * smile;   // droop: outer side of the lid lower
  const I = [ex + look[0] * 2.6 - sd * 0.6, ey + 1.4 + look[1] * 2.2], ir = 8.0, pr = 4.0;
  const lw = Math.max(1.0, pp * 1.05);
  paint(g, xf, [ex - rx - 4, ey - ry - 4, ex + rx + 4, ey + ry + 2], (u, v, X, Y) => {
    const a = (u - ex) / rx, b = (v - ey) / ry, r2 = a * a + b * b;
    const out = (u - ex) * sd / rx;                                                // −1 inner … +1 outer
    const yl = ey - ry + 2 * ry * lid + droop * Math.max(0, out + 0.2) * 0.85;      // upper lid line
    // lash flick at the outer corner
    if (lid < 0.9 && segD(u, v, [ex + sd * rx * 0.86, yl + 2.6], [ex + sd * (rx + 2.0), yl + 0.2 + droop * 0.4]) < lw * 0.75) return INK;
    if (r2 > 1) return null;
    if (v < yl - lw * 0.5) return SKIN[5];
    if (v < yl + lw * 1.2) return INK;
    const yb = ey + ry - 2 * ry * low * (1 - a * a) ** 0.6;
    if (low > 0.01 && v > yb - lw * 0.3) return v < yb + lw * 0.7 ? INK : SKIN[5];
    if (r2 > (1 - lw / 11) ** 2) return INK;
    const di = Math.hypot(u - I[0], (v - I[1]) * 0.94);
    if (Math.hypot(u - (I[0] - 3.0), v - (I[1] - 3.6)) < 2.5) return "#FFFFFF";
    if (Math.hypot(u - (I[0] + 3.1), v - (I[1] + 3.0)) < 1.15) return "#FFFFFF";
    if (di < pr) return INK;
    if (di < ir) { if (di > ir - lw * 0.9) return IRIS[0]; const t = (v - (I[1] - ir)) / (2 * ir); return IRIS[Math.min(4, Math.max(1, Math.floor(t * 4 + 0.5 + 0.35 * bayer(X, Y))))]; }
    return v < yl + 3.2 ? "#E2D4CC" : WHITE;
  });
}

function drawMouth(g, xf, { sad, smile, grin, pp }) {
  const curve = lerp(lerp(0.25, -1, sad), 1, Math.max(smile, grin)), open = grin, w = lerp(7.5, 12, Math.max(0, curve)) + 3 * grin, my = 33.5;
  const lw = Math.max(1.0, pp * 1.1);
  const top = (u) => { const t = clamp01(Math.abs(u) / w); return my + curve * 2.6 * (1 - t * t) - curve * 2.6 * 0.5 - open * 1.5 * (1 - t * t) * 0; };
  const bot = (u) => { const t = clamp01(Math.abs(u) / w); return top(u) + open * 12.5 * Math.pow(Math.max(0, 1 - t * t), 0.75); };
  paint(g, xf, [-w - 3, my - 6, w + 3, my + 15], (u, v) => {
    if (Math.abs(u) > w + lw * 0.5) return null;
    const t0 = top(u), b0 = bot(u);
    if (open < 0.08) return Math.abs(v - t0) <= lw * 0.62 ? INK : null;
    if (v < t0 - lw * 0.6 || v > b0 + lw * 0.6) return null;
    if (v < t0 + lw * 0.3 || v > b0 - lw * 0.6 || Math.abs(u) > w - lw * 0.7) return INK;
    const k = (v - t0) / Math.max(0.1, b0 - t0);
    if (v < t0 + lw * 0.3 + 2.6 * open && Math.abs(u) < w * 0.8) return "#FDF6EE";     // upper teeth (a uniform band)
    return k > 0.62 ? "#E06A80" : "#4A1420";
  });
  // corners: little dimples when smiling
  if (Math.max(smile, grin) > 0.3) for (const sd of [-1, 1]) paint(g, xf, [sd * w - 3, my - 6, sd * w + 3, my + 2], (u, v) => (segD(u, v, [sd * (w + 0.4), top(sd * w) - 0.4], [sd * (w + 1.6), top(sd * w) - 2.6]) < lw * 0.55 ? SKIN[2] : null));
}
