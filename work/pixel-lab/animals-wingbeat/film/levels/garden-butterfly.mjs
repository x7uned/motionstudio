// LV3 · the garden butterfly (a generic, made-up species): seen from the front, chubby and fuzzy, glossy bead eyes with two
// highlights, pink blush, curled antennae with little clubs. Bright orange forewings with a violet border, white margin
// dots and a peacock-like eye-spot; violet hindwings with an orange-ringed eye-spot and a scalloped edge.
// Wings: from the front they clap up over the body and open down to the sides — an in-plane rotation about each
// shoulder, driven ONLY by the caller's elevation e = cos(2π·wingPhase)·amt (+1 top, −1 bottom). Each wing is painted
// once into a texture (local u along the wing, v across it) and rotated per frame with a crisp 1-px outline computed
// after the rotation; optional smear samples (earlier elevations of the same stroke) draw as faint silhouettes behind.
// The body (abdomen, legs, fuzzy thorax, head) is a cached volume-shaded sprite per tilt; face and antennae per frame.
import { blob, ell, tube, bez, eye, blush, smile, fade, mix, bayer } from "../cute.mjs";
import { smooth } from "../shade.mjs";
import { hex } from "../../../../../renderer/pixel/raster.mjs";
import { spriteCache, xform } from "./meadow-kit.mjs";

const R = Math.round;
// ---------------------------------------------------------------- palettes
const PLUM = ["#16081E", "#2A1034", "#43194E", "#5C2668", "#783884", "#9450A0", "#B272BE", "#D29ADA"];
const FUZZ = ["#3A1404", "#6A2808", "#A0440E", "#D0661A", "#F0882E", "#F9A64C", "#FDC47C", "#FFE2B4"];
const ORANGE = ["#4E1404", "#8A2A08", "#C04612", "#E6661C", "#FF862C", "#FFA44C", "#FFC37C", "#FFE0B0"];
const VIOLET = ["#1C0834", "#321058", "#4A1C80", "#6630A8", "#8448C8", "#A468DE", "#C490EE", "#E2C2FA"];
const EYE_IRIS = ["#0A0410", "#160A1E", "#26102E", "#5A2E7A", "#9A68C4"];
const OUT = "#1A0822";
/** wing colour table (index → hex); textures store indices so a smear can use a flat tint */
const PAL = [null, OUT, ...ORANGE, ...VIOLET, ...PLUM, "#FFE070", "#FFF6C8", "#FFFFFF", "#1A0A2E", "#6A8CF4", "#F8E8FF", "#FF5A7A"];
const O = 2, V = 10, P = 18, YEL = 26, YEL2 = 27, WHITE = 28, DARK = 29, BLUE = 30, LILAC = 31, PINK = 32;
const RGB = PAL.map((c) => (c ? hex(c) : null));

// ---------------------------------------------------------------- wing textures (built once)
const FORE_L = 132, HIND_L = 100;
const FORE_PTS = [[0.02, -0.05], [0.3, -0.17], [0.62, -0.26], [0.86, -0.27], [0.99, -0.17], [1.03, 0.02], [0.95, 0.22], [0.78, 0.36], [0.56, 0.41], [0.33, 0.31], [0.13, 0.15], [0.02, 0.05]];
const HIND_PTS = [[0.02, -0.07], [0.3, -0.3], [0.66, -0.42], [0.93, -0.3], [1.04, -0.02], [0.97, 0.24], [0.74, 0.4], [0.42, 0.33], [0.14, 0.14], [0.02, 0.05]];
function inPoly(poly, x, y) { let k = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) k = !k; } return k; }
function distPoly(poly, x, y) { let d = Infinity; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)); d = Math.min(d, Math.hypot(x - ax - k * dx, y - ay - k * dy)); } return d; }
/** Texture: idx[(v − v0) * w + (u − u0)] (0 = outside). fore = orange field + violet border; hind = violet field + orange ring. */
function buildWing(kind) {
  const L = kind === "fore" ? FORE_L : HIND_L, raw = (kind === "fore" ? FORE_PTS : HIND_PTS).map(([u, v]) => [u * L, v * L]);
  let poly = smooth(raw, new Set(), 6);
  if (kind === "hind") poly = poly.map(([u, v]) => { const r = Math.hypot(u, v), a = Math.atan2(v, u), k = Math.max(0, (r / L - 0.55) / 0.45); return [u + Math.cos(a) * k * 2.2 * Math.sin(a * 22), v + Math.sin(a) * k * 2.2 * Math.sin(a * 22)]; });
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [u, v] of poly) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  u0 = Math.floor(u0) - 1; v0 = Math.floor(v0) - 1; u1 = Math.ceil(u1) + 1; v1 = Math.ceil(v1) + 1;
  const w = u1 - u0 + 1, h = v1 - v0 + 1, idx = new Uint8Array(w * h);
  // the outer margin = the part of the outline far from the root (u large); the border band follows it
  const margin = poly.filter(([u, v]) => kind === "fore" ? u > L * 0.8 || (v > L * 0.22 && u > L * 0.45) : Math.hypot(u, v) > L * 0.5);
  const veins = kind === "fore" ? [-0.33, -0.18, -0.02, 0.14, 0.3, 0.46] : [-0.5, -0.28, -0.06, 0.16, 0.38, 0.6];
  const spot = kind === "fore" ? [0.7 * L, -0.06 * L, 0.125 * L] : [0.6 * L, 0.02 * L, 0.17 * L];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const u = u0 + i + 0.5, v = v0 + j + 0.5;
    if (!inPoly(poly, u, v)) continue;
    const r = Math.hypot(u, v), a = Math.atan2(v, u), dm = distPoly(margin, u, v), b = bayer(i, j), dE = distPoly(poly, u, v);
    let id;
    if (kind === "fore") {
      // orange field: lighter toward the leading edge (costa, v < 0), darker toward the inner margin; warm glow mid-wing
      const lit = 0.5 - (v / L) * 1.4 - Math.abs(r / L - 0.45) * 0.6, s = 3.4 + lit * 1.6;
      id = O + Math.max(2, Math.min(6, Math.floor(s) + (s - Math.floor(s) > 0.35 + 0.3 * b ? 1 : 0)));
      // fuzzy plum root
      const root = r / L; if (root < 0.2) { const k = (0.2 - root) / 0.12; id = k > 1 || k > b ? P + (root < 0.1 ? 3 : 4) : id; }
      // violet border band along the outer margin (scalloped inner edge), white/lilac dots inside it
      const bw = 0.12 * L + 2.2 * Math.sin(a * 26);
      if (dm < bw) id = V + (dm < 3 ? 2 : dm > bw - 2.5 ? 3 : 4);
      if (dm < bw && dm > 3) { const da = a * 16.5, near = Math.abs(da - Math.round(da)) < 0.16 && Math.abs(dm - bw * 0.52) < 2.1; if (near) id = (Math.round(da) & 1) ? WHITE : LILAC; }
    } else {
      // violet field: lighter toward the middle, pink-lilac glow near the margin
      const lit = 0.55 - (v / L) * 0.7 - Math.abs(r / L - 0.5) * 0.7, s = 3.3 + lit * 1.8;
      id = V + Math.max(2, Math.min(6, Math.floor(s) + (s - Math.floor(s) > 0.35 + 0.3 * b ? 1 : 0)));
      const root = r / L; if (root < 0.22) { const k = (0.22 - root) / 0.13; id = k > 1 || k > b ? P + (root < 0.1 ? 3 : 4) : id; }
      // orange margin band
      const bw = 0.11 * L + 1.5 * Math.sin(a * 22);
      if (dm < bw) id = O + (dm < 2.5 ? 3 : dm > bw - 2 ? 4 : 5);
    }
    // veins: darker hairlines fanning out from the root through the field (not over the border)
    if (r > L * 0.16 && id !== WHITE && id !== LILAC) for (const va of veins) { const ang = va + (r / L) * 0.12; if (Math.abs(a - ang) * r < 0.55) { if (id > O && id < O + 8) id = Math.max(O + 1, id - 2); else if (id > V && id < V + 8) id = Math.max(V + 1, id - 2); break; } }
    // eye-spot: dark heart with blue glints, violet/blue ring, yellow ring, dark rim
    const er = Math.hypot(u - spot[0], v - spot[1]) / spot[2];
    if (er < 1) {
      if (kind === "fore") id = er < 0.36 ? (Math.hypot(u - spot[0] + 2, v - spot[1] + 2) < 2.2 ? WHITE : er < 0.2 && ((i + j) & 1) ? BLUE : DARK) : er < 0.6 ? (er < 0.5 ? V + 4 : V + 5) : er < 0.82 ? (er < 0.7 ? YEL2 : YEL) : P + 2;
      else id = er < 0.4 ? (Math.hypot(u - spot[0] + 3, v - spot[1] + 3) < 3 ? WHITE : er < 0.25 ? BLUE : DARK) : er < 0.62 ? (er < 0.52 ? PINK : O + 6) : er < 0.84 ? O + 4 : V + 1;
    }
    // light leading-edge line (1 px inside the outline on the costa side)
    if (dE < 1.6 && v < -0.05 * L && r < 0.9 * L && r > 0.15 * L) id = kind === "fore" ? O + 7 : V + 7;
    idx[j * w + i] = id;
  }
  return { idx, u0, v0, w, h, L };
}
let FORE = null, HIND = null;
const wings = () => { if (!FORE) { FORE = buildWing("fore"); HIND = buildWing("hind"); } };

/**
 * Rotate a wing texture about the shoulder (px, py): α = angle from straight up, outward positive; side ±1.
 * ku/kv scale length/chord (foreshortening). tint (index) draws a flat smear silhouette at density `a`, no outline.
 * Writes through g.px (so gradeView masks and fades work).
 */
function drawWing(g, W, px, py, alpha, side, ku, kv, a = 1, tint = 0) {
  const dx = side * Math.sin(alpha), dy = -Math.cos(alpha), mx = side * -dy, my = side * dx;
  // bbox of the transformed texture rectangle
  const cs = [[W.u0, W.v0], [W.u0 + W.w, W.v0], [W.u0, W.v0 + W.h], [W.u0 + W.w, W.v0 + W.h]].map(([u, v]) => [px + u * ku * dx + v * kv * mx, py + u * ku * dy + v * kv * my]);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of cs) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1); x1 = Math.min(g.w - 1, Math.ceil(x1) + 1); y1 = Math.min(g.h - 1, Math.ceil(y1) + 1);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1; if (bw <= 0 || bh <= 0) return;
  const buf = new Uint8Array(bw * bh);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const wx = x + 0.5 - px, wy = y + 0.5 - py, u = Math.floor((wx * dx + wy * dy) / ku) - W.u0, v = Math.floor((wx * mx + wy * my) / kv) - W.v0;
    if (u < 0 || v < 0 || u >= W.w || v >= W.h) continue;
    buf[(y - y0) * bw + (x - x0)] = W.idx[v * W.w + u];
  }
  const at = (i, j) => (i < 0 || j < 0 || i >= bw || j >= bh ? 0 : buf[j * bw + i]);
  for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
    const id = buf[j * bw + i]; if (!id) continue; const X = x0 + i, Y = y0 + j;
    if (a < 1 && a <= bayer(X, Y)) continue;
    if (tint) { g.px(X, Y, ((X + Y) & 1) ? RGB[tint] : RGB[tint + 1] ?? RGB[tint]); continue; }
    const edge = !at(i - 1, j) || !at(i + 1, j) || !at(i, j - 1) || !at(i, j + 1);
    g.px(X, Y, edge ? RGB[1] : RGB[id]);
  }
}
/** wing angles for an elevation e (+1 top … −1 bottom): forewing from 13° (clapped up) to 100° (open, a bit below level) */
export function wingAngles(e) {
  const u = (e + 1) / 2, af = ((100 - 87 * u) * Math.PI) / 180, ah = af + ((52 - 20 * u) * Math.PI) / 180;
  return { af, ah, ku: 1 - 0.13 * u * u, kv: 1 - 0.12 * u * u };
}

// ---------------------------------------------------------------- body sprite (cached per tilt)
const SPR = spriteCache(12);
const PIV = 44;                                  // tilt pivot / thorax centre below the head centre
const fz = (cx, cy, rx, ry, n, amp, ph) => { const out = []; for (let i = 0; i < n; i++) { const an = (i / n) * 6.283, k = 1 + amp * (i % 2 ? 1 : -0.4) * (0.7 + 0.3 * Math.sin(i * 1.7 + ph)); out.push([cx + Math.cos(an) * rx * k, cy + Math.sin(an) * ry * k]); } return out; };
function bodySprite(tilt) {
  const key = `bf:${tilt.toFixed(2)}`, W = 130, H = 190, ox = 65, oy = 56;
  return SPR(key, W, H, ox, oy, (g, x, y) => {
    const T = (pts) => xform(pts, x, y + PIV, tilt);
    // abdomen: chubby, tapering, plum with lilac segment rings (recolour bands keep the volume shading)
    const ab = T([[x - 15, y + 54], [x - 17, y + 72], [x - 14, y + 92], [x - 8, y + 108], [x, y + 116], [x + 8, y + 108], [x + 14, y + 92], [x + 17, y + 72], [x + 15, y + 54], [x, y + 50]]);
    blob(g, [smooth(ab, new Set(), 4)], { ramp: PLUM, base: 3.4, gain: 2.2, thick: 11, litOutline: PLUM[2] });
    const idx = new Map(PLUM.map((c, i) => [c.toUpperCase(), i]));
    for (const ry of [68, 81, 94, 105]) for (let Y = y + ry - 9; Y <= y + ry + 6; Y++) for (let X = x - 19; X <= x + 19; X++) {
      const xx = X - x, rr = ry + 3.5 * (1 - (xx / 17) ** 2) - xx * Math.tan(tilt); if (Math.abs(Y - (y + rr)) > 0.9) continue;
      const col = g.get(X, Y), hx = "#" + col.map((q) => q.toString(16).padStart(2, "0")).join("").toUpperCase(), i = idx.get(hx);
      if (i !== undefined && i >= 2) g.px(X, Y, PLUM[Math.min(7, i + 2)]);
    }
    // six thin legs tucked under the thorax, little dark feet
    for (const sd of [-1, 1]) for (const [ax, ay, bx2, by2, cx2, cy2] of [[11, 50, 21, 56, 19, 65], [13, 55, 23, 64, 21, 73], [11, 60, 18, 70, 15, 79]]) {
      const p = T([[x + sd * ax, y + ay], [x + sd * bx2, y + by2], [x + sd * cx2, y + cy2]]);
      g.line(R(p[0][0]), R(p[0][1]), R(p[1][0]), R(p[1][1]), PLUM[1]); g.line(R(p[1][0]), R(p[1][1]), R(p[2][0]), R(p[2][1]), PLUM[1]); g.px(R(p[2][0]) + sd, R(p[2][1]), PLUM[1]);
    }
    // fuzzy thorax collar (warm orange fluff)
    blob(g, [T(fz(x, y + PIV, 26, 18, 52, 0.09, 2))], { ramp: FUZZ, base: 4.0, gain: 2.0, thick: 9, litOutline: FUZZ[1], outline: FUZZ[0] });
    // head: round, plum, a little fuzzy rim; two orange tufts on top
    for (const [dx, h, lean] of [[-5, 9, -3], [4, 11, 2]]) { const p0 = T([[x + dx, y - 28], [x + dx + lean, y - 28 - h]]); blob(g, [tube([p0[0], [(p0[0][0] + p0[1][0]) / 2 + lean * 0.3, (p0[0][1] + p0[1][1]) / 2], p0[1]], 3.4, 1.5)], { ramp: FUZZ, base: 4.8, thick: 3, litOutline: FUZZ[2], outline: FUZZ[0] }); }
    blob(g, [T(fz(x, y, 36, 32, 96, 0.02, 0))], { ramp: PLUM, base: 3.9, gain: 2.1, thick: 18, litOutline: PLUM[3] });
  });
}

/**
 * Cute butterfly facing the camera. (x, y) = head centre (screen). o: e (wing elevation +1 top … −1 bottom), smear
 * (array of earlier elevations, newest first) with smearA (density), tilt (rad), look [dx, dy], blink 0..1, open 0..1,
 * antSway (px), a (dissolve). Returns the two shoulder points.
 */
export function drawButterfly(c, x, y, o = {}) {
  wings();
  const a = o.a ?? 1; x = R(x); y = R(y); if (a <= 0) return null;
  const tilt = Math.round((o.tilt ?? 0) * 50) / 50, cs = Math.cos(tilt), sn = Math.sin(tilt);
  const T = (dx, dy) => { dy -= PIV; return [x + dx * cs - dy * sn, y + PIV + dx * sn + dy * cs]; };
  const g = a < 1 ? fade(c, a) : c;
  const sh = [T(-12, PIV + 2), T(12, PIV + 2)];
  // smear: faint silhouettes of the same stroke a moment earlier (oldest first), then the real wings
  const smear = o.smear ?? [];
  for (let k = smear.length - 1; k >= 0; k--) {
    const A = wingAngles(smear[k]), dens = (o.smearA ?? 0.3) * (1 - k / (smear.length + 0.5));
    for (const [side, p] of [[-1, sh[0]], [1, sh[1]]]) { drawWing(g, HIND, p[0], p[1], A.ah - side * tilt, side, A.ku, A.kv, a * dens * 0.8, V + 4); drawWing(g, FORE, p[0], p[1], A.af - side * tilt, side, A.ku, A.kv, a * dens, O + 5); }
  }
  const A = wingAngles(o.e ?? 0);
  for (const [side, p] of [[-1, sh[0]], [1, sh[1]]]) drawWing(g, HIND, p[0], p[1], A.ah - side * tilt, side, A.ku, A.kv, a);
  for (const [side, p] of [[-1, sh[0]], [1, sh[1]]]) drawWing(g, FORE, p[0], p[1], A.af - side * tilt, side, A.ku, A.kv, a);
  // body
  bodySprite(tilt).blit(c, x, y, { a });
  // curled antennae with club tips (the curl sways a little behind the hover)
  const sway = o.antSway ?? 0;
  for (const sd of [-1, 1]) {
    const pts = [], cx0 = sd * (27 + sway * 0.7), cy0 = -66;
    for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push(T(sd * (9 + 18 * k) + sway * k * k * 0.7, -28 - 38 * Math.sin(k * 1.3))); }
    const st = pts[pts.length - 1];
    // the curl: from the stalk end, a ¾ turn outward and down (radius shrinking)
    for (let i = 1; i <= 10; i++) { const ang = Math.PI + sd * 0 - (i / 10) * 4.2 * sd * -1, r = 6.5 - i * 0.3; const px = cx0 + 6.5 * sd + Math.cos(Math.PI - (i / 10) * 4.2) * r * sd, py = cy0 + 5 - Math.sin(Math.PI - (i / 10) * 4.2) * r; void ang; pts.push(T(px, py)); }
    blob(c, [tube(pts, 2.2, 1.5)], { ramp: PLUM, thick: 2, base: 3.6, a, litOutline: PLUM[3] });
    const end = pts[pts.length - 1]; blob(c, [ell(end[0], end[1], 3.6, 3.6)], { ramp: PLUM, thick: 3, base: 4.2, a, litOutline: PLUM[4] }); g.px(R(end[0] - 1), R(end[1] - 1), PLUM[7]);
    void st;
  }
  // face
  const look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const sd of [-1, 1]) { const [ex, ey] = T(sd * 15, 1); eye(c, ex, ey, 13, { ry: 15, iris: EYE_IRIS, pupil: "bead", look, blink, lid: PLUM[4], a }); }
  for (const sd of [-1, 1]) { const [bx, by] = T(sd * 26, 16); blush(c, bx, by, 8, 4, "#FF6E9E", a); }
  const [mx, my] = T(0, 16); smile(c, mx, my, 6, { open: o.open ?? 0.3, a });
  return { shoulderL: sh[0], shoulderR: sh[1] };
}
export { mix };
