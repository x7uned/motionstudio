// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals/film/levels/yard.mjs (build/back/front: cottage, hedge, picket
// fence, doghouse, striped lawn, stepping stones, foreground tufts) with the helpers it uses from levels/meadow-kit.mjs
// (MaskCanvas, Layer, flower, stem, tuft, clover, leafBall, hills, grass ramp). Changes: import paths; constants of
// timeline.mjs inlined (LAND −20, yard range 1620–2160); lawn and its texture painted 40 px wider on each side so a
// drifting camera never sees an unpainted column; the live toy pile and duck are not copied; exports BACK/FRONT layers.
import { Canvas, hex, bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, sm } from "./cute.mjs";

const R = Math.round;
export const LAND = -20, RX0 = 1620, RX1 = 2160;
const LX0 = RX0 - 40, LX1 = RX1 + 40;
const DX = 1890;
export class MaskCanvas extends Canvas {
  constructor(w, h) { super(w, h, "#000000"); this.m = new Uint8Array(w * h); }
  px(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex(c), i = y * this.w + x; this.d[i * 3] = r; this.d[i * 3 + 1] = g; this.d[i * 3 + 2] = b;
    if (this.m) this.m[i] = 1;
  }
  /** Blend an already painted pixel toward colour col by k (keeps the mask). */
  blend(x, y, col, k) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h || !this.m[y * this.w + x]) return; this.px(x, y, mix(this.get(x, y), col, k)); }
}

/** World-space cached layer: draw with world coordinates through `g` (offset applied), blit each frame. */
export class Layer {
  constructor(wx0, wy0, wx1, wy1) {
    this.wx0 = wx0; this.wy0 = wy0; this.c = new MaskCanvas(wx1 - wx0, wy1 - wy0);
    const L = this, c = this.c;
    // drawing view taking WORLD coordinates: every Canvas method (rect, poly, line, text…) routes through px/get
    const g = Object.create(c);
    g.px = (x, y, col) => c.px(x - L.wx0, y - L.wy0, col);
    g.get = (x, y) => c.get(x - L.wx0, y - L.wy0);
    g.blend = (x, y, col, k) => c.blend(x - L.wx0, y - L.wy0, col, k);
    g.has = (x, y) => { x = Math.floor(x - L.wx0); y = Math.floor(y - L.wy0); return x >= 0 && y >= 0 && x < c.w && y < c.h && c.m[y * c.w + x] === 1; };
    this.g = g;
  }
  /** Copy the painted pixels into the frame canvas (screen = V.X/V.Y of world). */
  blit(dst, V) {
    const src = this.c, W = src.w, ox = R(V.X(this.wx0)), oy = R(V.Y(this.wy0));
    const y0 = Math.max(0, oy), y1 = Math.min(dst.h, oy + src.h), x0 = Math.max(0, ox), x1 = Math.min(dst.w, ox + W);
    if (x1 <= x0 || y1 <= y0) return;
    const sd = src.d, sm = src.m, dd = dst.d, DW = dst.w;
    for (let y = y0; y < y1; y++) {
      let li = (y - oy) * W + (x0 - ox), ci = y * DW + x0;
      for (let x = x0; x < x1; x++, li++, ci++) if (sm[li]) { const a = li * 3, b = ci * 3; dd[b] = sd[a]; dd[b + 1] = sd[a + 1]; dd[b + 2] = sd[a + 2]; }
    }
  }
}

// ---------------------------------------------------------------- small props (draw through any canvas-like g)
export function flower(g, x, y, s, col, eye = "#F8D040", dark = null) {
  x = R(x); y = R(y);
  if (s <= 1) { g.px(x, y, col); g.px(x - 1, y, col); g.px(x + 1, y, col); g.px(x, y - 1, col); g.px(x, y + 1, dark ?? col); g.px(x, y, eye); return; }
  const d = dark ?? mix(col, "#000000", 0.25);
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5, px = x + Math.cos(a) * s * 0.95, py = y + Math.sin(a) * s * 0.95, r = s * 0.62;
    for (let Y = R(py - r); Y <= R(py + r); Y++) for (let X = R(px - r); X <= R(px + r); X++) if ((X - px) ** 2 + (Y - py) ** 2 <= r * r + 0.4) g.px(X, Y, Y > y + s * 0.3 ? d : col);
  }
  const er = Math.max(1, s * 0.42);
  for (let Y = R(y - er); Y <= R(y + er); Y++) for (let X = R(x - er); X <= R(x + er); X++) if ((X - x) ** 2 + (Y - y) ** 2 <= er * er + 0.3) g.px(X, Y, eye);
  if (s >= 3) g.px(x - 1, y - 1, mix(eye, "#FFFFFF", 0.5));
}
/** Stem from (x, y0) down to (x + lean, y1), with an optional leaf. */
export function stem(g, x, y0, y1, col, lean = 0, leaf = true) {
  const n = Math.max(1, y1 - y0);
  for (let i = 0; i <= n; i++) { const k = i / n; g.px(R(x + lean * (1 - k) * (1 - k)), y0 + i, col); }
  if (leaf && n > 8) { const ly = R(y0 + n * 0.6), lx = R(x + lean * 0.16); g.px(lx + 1, ly, col); g.px(lx + 2, ly - 1, col); g.px(lx + 3, ly - 1, col); g.px(lx - 1, ly + 2, col); g.px(lx - 2, ly + 1, col); }
}
/** Grass tuft of n blades (h tall) at the ground point x, y. cols = [dark, mid, light]. sway shifts the tips. */
export function tuft(g, x, y, h, n, cols, seed = 0, sway = 0) {
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 2 + R((rnd(seed + i * 3) - 0.5) * 2), bh = h * (0.6 + rnd(seed + i * 7) * 0.5), lean = (rnd(seed + i * 11) - 0.5) * h * 0.5 + sway;
    const col = cols[Math.min(cols.length - 1, i % cols.length)];
    for (let j = 0; j <= bh; j++) { const k = j / bh; g.px(R(bx + lean * k * k), R(y - j), j > bh * 0.65 ? cols[cols.length - 1] : col); }
  }
}
/** Clover: three round leaflets (r ~2) around x, y. */
export function clover(g, x, y, col, hi) {
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2]]) { const cx = x + dx, cy = y + dy; for (let Y = cy - 1; Y <= cy + 1; Y++) for (let X = cx - 1; X <= cx + 1; X++) if (Math.abs(X - cx) + Math.abs(Y - cy) <= 1 || (X === cx - 1 && Y === cy - 1)) g.px(X, Y, col); g.px(cx - 1 + (dx < 0 ? 0 : 1), cy - 1, hi); }
  g.px(x, y + 2, col);
}
/** Leafy cluster ball (canopy/hedge chunk): dithered tone bands lit from the upper left, bumpy outline. */
export function leafBall(g, cx, cy, r, ramp, seed = 0, o = {}) {
  const out = o.outline ?? ramp[0], bumps = o.bumps ?? 9, amp = o.amp ?? 0.12;
  const rad = (a) => r * (1 + amp * Math.sin(a * bumps + seed) + amp * 0.5 * Math.sin(a * (bumps * 2 + 1) + seed * 2.3));
  for (let Y = R(cy - r * 1.25); Y <= R(cy + r * 1.25); Y++) for (let X = R(cx - r * 1.25); X <= R(cx + r * 1.25); X++) {
    const dx = X - cx, dy = Y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), rr = rad(a);
    if (d > rr) continue;
    if (d > rr - 1.1) { g.px(X, Y, out); continue; }
    // light from upper-left: v in 0..1
    const lx = (-dx * 0.6 - dy * 0.8) / r, v = 0.5 + lx * 0.45 - (d / rr) * 0.18 + (o.lift ?? 0);
    const n = ramp.length - 1, s = Math.max(1, Math.min(n, v * n + (rnd((X * 31 + Y * 17) ^ seed) - 0.5) * 0.9)), lo = Math.floor(s);
    g.px(X, Y, ramp[Math.min(n, s - lo > bayer(X, Y) ? lo + 1 : lo)]);
  }
}
/** Dotted path through points (screen), drawn up to fraction k (0..1) of its length, dots every `gap` px. */
export const GRASS = ["#B4E07A", "#A2D86E", "#8ECC62", "#7CBE58", "#6AB04E", "#5AA046", "#4C9040", "#40803A", "#36713A", "#2C6234", "#24542E"];
export const HILL_FAR = ["#9CCBB0", "#AAD6B6", "#BBE2BE", "#CDEBC8"], HILL_NEAR = ["#6FB06A", "#7EBE72", "#90CC7C", "#A6DA8C"];
const smk = (x, a, b) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
/** Distant hills over the whole meadow → forest stretch: rise from the shore (x 1080), sink before the bay (x 2700). */
export function hillEnv(x) { return smk(x, 1080, 1190) * (1 - smk(x, 2560, 2690)); }
export function hillFar(x) { return (70 + 26 * Math.sin(x * 0.0105 + 0.7) + 14 * Math.sin(x * 0.031 + 2.1)) * hillEnv(x); }
export function hillNear(x) { return (34 + 14 * Math.sin(x * 0.017 + 4.0) + 8 * Math.sin(x * 0.043)) * hillEnv(x); }
/** Paint the two hill rows behind the ground line `land` for world columns x0..x1 (g takes world coordinates). */
export function paintHills(g, x0, x1, land, far = HILL_FAR, near = HILL_NEAR) {
  for (let x = x0; x < x1; x++) {
    const hf = hillFar(x), hn = hillNear(x);
    for (let y = Math.round(land - hf); y < land; y++) { const k = (y - (land - hf)) / Math.max(1, hf); const s = k < 0.06 ? 3 : k < 0.3 ? ((k - 0.06) / 0.24 > bayer(x, y) ? 2 : 3) : k < 0.7 ? 2 - ((k - 0.3) / 0.4 > bayer(x, y) ? 1 : 0) : 1; g.px(x, y, far[s]); }
    for (let y = Math.round(land - hn); y < land; y++) { const k = (y - (land - hn)) / Math.max(1, hn); const s = k < 0.08 ? 3 : k < 0.35 ? 2 : k < 0.75 ? ((k - 0.35) / 0.4 > bayer(x, y) ? 1 : 2) : 0; g.px(x, y, near[s]); }
  }
}
/** Ground ramp index by depth below the ground line (perspective: narrow bands near the horizon). `shift` darkens. */
export function grassIdx(d, shift = 0) { return Math.min(GRASS.length - 1.001, Math.sqrt(Math.max(0, d) / 330) * 6.6 + shift); }
export function grassAt(x, y, d, shift = 0) { const v = grassIdx(d, shift), lo = Math.floor(v), fr = v - lo; return GRASS[Math.min(GRASS.length - 1, fr > 0.5 + 0.45 * (bayer(x, y) - 0.5) ? lo + 1 : lo)]; }
const WOOD = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488", "#F0D2A8"];
const ROOF = ["#3A0C10", "#6A161A", "#9A2424", "#C23A32", "#DC5244", "#EE7458", "#F89A7A", "#FCC6AA"];
const SIDING = ["#5A4A2A", "#8A7240", "#B89A58", "#D8BC72", "#ECD48C", "#F6E4A8", "#FBF0C8", "#FFFAE4"];
const FENCE = ["#4A4A60", "#7A7A92", "#A8A8BC", "#C8C8D8", "#DEDEEA", "#EEEEF4", "#F8F8FC", "#FFFFFF"];
const HEDGE = ["#163C22", "#205030", "#2C643A", "#3A7A44", "#4C904E", "#62A85C", "#80BE6E", "#A2D488"];
const DOGH = ["#1E2A4A", "#2A3E6A", "#3A5490", "#4E6CB0", "#6A8CCC", "#8EAEE0", "#B4CCF0", "#DCE8FA"];

let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(RX0 - 40, -660, RX1 + 40, 840); FRONT = new Layer(RX0 - 40, -120, RX1 + 40, 840);
  const g = BACK.g, f = FRONT.g;
  paintHills(g, LX0, LX1, LAND);
  for (let i = 0; i < 8; i++) {                                         // little trees on the far hills
    const x = R(RX0 + 200 + rnd(i * 17 + 9) * (RX1 - RX0 - 280)), hn = hillNear(x); if (hn < 14 || Math.abs(x - DX) < 80) continue;
    const y = R(LAND - hn + 3 + rnd(i) * 6), r = 3 + rnd(i * 7) * 3; g.rect(x, y, 1, R(r + 2), "#4A6A3A"); leafBall(g, x, y - r * 0.6, r, ["#3E7A48", "#4E8C52", "#5E9E5C", "#74B068", "#8CC27A"], i + 40, { amp: 0.08, bumps: 5 });
  }
  // lawn: shared ground ramp + mowing stripes fanning out toward the viewer (faded at both seams)
  for (let y = LAND; y < 840; y++) for (let x = LX0; x < LX1; x++) {
    const d = y - LAND, w = sm(x, RX0, RX0 + 70) * (1 - sm(x, RX1 - 90, RX1)), u = (x - DX) / (d + 90), stripe = ((Math.floor(u * 3.2) % 2) + 2) % 2;
    g.px(x, y, grassAt(x, y, d, stripe ? -0.55 * w : 0.25 * w));
  }
  g.rect(LX0, LAND, LX1 - LX0, 1, "#C6E88A");
  for (let i = 0; i < 2600; i++) {                                      // short mown grass texture
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 101), 1.4) * 850), x = R(RX0 + rnd(i * 3 + 102) * (RX1 - RX0)), d = y - LAND, h = d < 60 ? 1 : d < 200 ? 2 : 3;
    const col = rnd(i * 5 + 1) < 0.55 ? mix(g.get(x, y), "#1E5A2A", 0.25) : mix(g.get(x, y), "#E8FFB0", 0.25); for (let j = 0; j < h; j++) g.px(x, y - j, col);
  }
  for (let i = 0; i < 90; i++) {                                        // daisies and clover dots on the lawn
    const y = R(LAND + 6 + Math.pow(rnd(i * 7 + 201), 1.2) * 320), x = R(RX0 + 10 + rnd(i * 7 + 202) * (RX1 - RX0 - 20)), d = y - LAND, s = d < 40 ? 1 : d < 140 ? 2 : 3;
    if (rnd(i * 3) < 0.3) clover(g, x, y, "#3E8A3E", "#7CC85E"); else { if (s >= 2) stem(g, x, y + s, y + s + 2 + s, "#3A7A36", 0, false); flower(g, x, y, s, "#FFFFFF", "#F8C840"); }
  }
  // stepping stones from the cottage door toward the viewer
  for (const [x, y, rx] of [[1664, -10, 9], [1656, 14, 11], [1645, 46, 14], [1634, 90, 17], [1622, 148, 21]]) stone(g, x, y, rx);
  cottage(g); hedge(g); fence(g); doghouse(g);
  // FRONT: foreground tufts and daisies along the bottom; a few blades at the fence foot
  for (let i = 0; i < 46; i++) { const x = R(RX0 + rnd(i * 13 + 302) * (RX1 - RX0)), y = R(LAND + 260 + rnd(i * 13 + 305) * 320); tuft(f, x, y, 10 + rnd(i) * 10, 3 + Math.floor(rnd(i * 3) * 3), ["#2E6A30", "#3E8238", "#58A044"], i * 5 + 300, (rnd(i * 9) - 0.5) * 4); }
  for (let i = 0; i < 12; i++) { const x = R(RX0 + 20 + rnd(i * 19 + 401) * (RX1 - RX0 - 40)), y = R(LAND + 250 + rnd(i * 19 + 403) * 300), h = 10 + rnd(i * 5) * 12; stem(f, x, y - h, y, "#2E6A30", 0, true); flower(f, x, y - h, 5, "#FFFFFF", "#F8C840"); }
}

function stone(g, x, y, rx) {
  const ry = Math.max(3, rx * 0.38);
  for (let Y = R(y - ry - 1); Y <= R(y + ry + 1); Y++) for (let X = R(x - rx - 1); X <= R(x + rx + 1); X++) {
    const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; if (d > 1.08) continue;
    g.px(X, Y, d > 0.8 ? (Y > y ? "#3A4A3A" : "#6A7468") : Y < y - ry * 0.3 ? "#C4C8BC" : "#A4AAA0");
  }
}

function cottage(g) {
  const x0 = 1636, x1 = 1774, top = -150, O = "#3A1A14";
  // chimney behind the roof
  g.rect(1663, -238, 18, 52, O); g.rect(1664, -237, 16, 50, "#A2483A"); for (let y = -236; y < -188; y += 6) { g.rect(1664, y, 16, 1, "#7A3028"); g.rect(1664 + ((y / 6) & 1) * 8, y, 1, 6, "#7A3028"); } g.rect(1661, -242, 22, 5, O); g.rect(1662, -241, 20, 3, "#C4C0BC");
  // wall: horizontal siding, white corner trims, soft shade under the eaves and on the right
  g.rect(x0 - 1, top - 1, x1 - x0 + 2, LAND - top + 1, O);
  for (let y = top; y < LAND; y++) for (let x = x0; x < x1; x++) {
    const plank = (y - top) % 9, u = (x - x0) / (x1 - x0); let s = plank === 8 ? 3 : plank === 0 ? 6 : 5;
    if (y - top < 10) s -= 1; if (u > 0.86) s -= 1; if (u > 0.95) s -= 1; g.px(x, y, SIDING[Math.max(1, s)]);
  }
  for (const tx of [x0, x1 - 5]) { g.rect(tx, top, 5, LAND - top, FENCE[6]); g.rect(tx + 4, top, 1, LAND - top, FENCE[3]); }
  // door (left) with a round window and a brass knob
  const dx0 = 1648, dx1 = 1678, dy0 = -98;
  g.rect(dx0 - 3, dy0 - 3, dx1 - dx0 + 6, LAND - dy0 + 3, FENCE[6]); g.rect(dx0 - 1, dy0 - 1, dx1 - dx0 + 2, LAND - dy0 + 1, O);
  for (let y = dy0; y < LAND; y++) for (let x = dx0; x < dx1; x++) g.px(x, y, x - dx0 < 3 ? "#5A9AB4" : x > dx1 - 4 ? "#2E6A84" : "#3E82A0");
  for (const [yy, hh] of [[-88, 26], [-56, 30]]) { g.rect(dx0 + 5, yy, dx1 - dx0 - 10, hh, "#2E6A84"); g.rect(dx0 + 6, yy + 1, dx1 - dx0 - 12, hh - 2, "#4A90AE"); }
  for (let Y = -6; Y <= 6; Y++) for (let X = -6; X <= 6; X++) { const d = Math.hypot(X, Y); if (d <= 6) g.px(1663 + X, -78 + Y, d > 4.8 ? FENCE[6] : Y < -1 ? "#D8F0FA" : "#9ACEE6"); }
  g.rect(dx1 - 7, -60, 3, 3, "#F4CA50"); g.px(dx1 - 7, -60, "#FFF0A0");
  g.rect(dx0 - 6, LAND - 3, dx1 - dx0 + 12, 3, "#9A9A9A"); g.rect(dx0 - 6, LAND - 3, dx1 - dx0 + 12, 1, "#C8C8C8");
  // window with four panes, reflections and a flower box
  const wx0 = 1700, wx1 = 1758, wy0 = -122, wy1 = -76;
  g.rect(wx0 - 4, wy0 - 4, wx1 - wx0 + 8, wy1 - wy0 + 8, O); g.rect(wx0 - 3, wy0 - 3, wx1 - wx0 + 6, wy1 - wy0 + 6, FENCE[6]);
  for (let y = wy0; y < wy1; y++) for (let x = wx0; x < wx1; x++) { const k = (y - wy0) / (wy1 - wy0); let col = k < 0.5 ? "#BCE6F8" : "#8CCBEA"; if (((x - wx0) - (y - wy0) * 0.8 + 100) % 26 < 5) col = "#EAFAFF"; g.px(x, y, col); }
  g.rect(R((wx0 + wx1) / 2) - 1, wy0, 3, wy1 - wy0, FENCE[6]); g.rect(wx0, R((wy0 + wy1) / 2) - 1, wx1 - wx0, 3, FENCE[6]);
  // curtains peeking
  for (let y = wy0; y < wy0 + 30; y++) { const w = R(6 - (y - wy0) * 0.15); g.rect(wx0, y, Math.max(1, w), 1, "#F49AB0"); g.rect(wx1 - Math.max(1, w), y, Math.max(1, w), 1, "#F49AB0"); }
  g.rect(wx0 - 6, wy1 + 4, wx1 - wx0 + 12, 9, O); g.rect(wx0 - 5, wy1 + 5, wx1 - wx0 + 10, 7, WOOD[4]); g.rect(wx0 - 5, wy1 + 5, wx1 - wx0 + 10, 1, WOOD[6]);
  for (let i = 0; i < 9; i++) { const fx = wx0 - 2 + i * 7.5, fy = wy1 + 2 - (i % 2) * 3; leafBall(g, fx, fy + 2, 3.2, ["#1E5A2A", "#2E7A36", "#4A9A44", "#6AB85A"], i + 7, { amp: 0.1, bumps: 4 }); flower(g, fx + (i % 2), fy - 1, 2, i % 3 === 0 ? "#F4F4F4" : "#E8344A", "#FFD040"); }
  // red gable roof with scalloped shingle rows, white fascia
  const ex0 = x0 - 12, ex1 = x1 + 12, ey = top + 4, ax = (x0 + x1) / 2, ay = -240;
  g.poly([[ex0 - 2, ey + 3], [ax, ay - 3], [ex1 + 2, ey + 3]], O);
  g.poly([[ex0, ey], [ax, ay], [ex1, ey]], ROOF[3], (X, Y) => {
    const row = Math.floor((Y - ay) / 8), off = (row & 1) * 5, cell = ((X - ax + 200 + off) % 10 + 10) % 10, yy = (Y - ay) % 8;
    const half = ((Y - ay) / (ey - ay)) * (ex1 - ex0) / 2, u = (X - ax) / Math.max(1, half);
    let s = 4 - (yy >= 6 ? 1 : 0) - ((yy >= 4 && (cell < 1 || cell > 8)) ? 1 : 0) + (yy < 2 ? 1 : 0) - (u > 0.55 ? 1 : 0);
    return ROOF[Math.max(1, Math.min(6, s))];
  });
  for (let i = 0; i <= 4; i++) { const k = i / 4; } // (fascia below)
  g.line(ex0, ey, R(ax), ay, FENCE[6]); g.line(ex0, ey + 1, R(ax), ay + 1, FENCE[6]); g.line(R(ax), ay, ex1, ey, FENCE[4]); g.line(R(ax), ay + 1, ex1, ey + 1, FENCE[4]);
  // attic round window
  for (let Y = -9; Y <= 9; Y++) for (let X = -9; X <= 9; X++) { const d = Math.hypot(X, Y); if (d <= 9) g.px(R(ax) + X, -188 + Y, d > 8 ? O : d > 6.4 ? FENCE[6] : (X + Y < -3 ? "#D8F0FA" : "#8CC8E6")); }
  g.rect(R(ax) - 6, -188, 13, 1, FENCE[6]); g.rect(R(ax), -194, 1, 13, FENCE[6]);
  // a soft shadow line where the wall meets the lawn
  for (let x = x0; x < x1 + 4; x++) { g.px(x, LAND, "#3A7A36"); g.px(x, LAND + 1, mix(g.get(x, LAND + 1), "#1E4A2A", 0.4)); }
}

function hedge(g) {
  for (const [x, y, r, s] of [[1604, -36, 17, 1], [1624, -48, 22, 2], [1642, -34, 17, 3], [1614, -26, 14, 4]]) leafBall(g, x, y, r, HEDGE, s + 60, { amp: 0.1, bumps: 8 });
  for (let i = 0; i < 18; i++) { const a = rnd(i * 3 + 70) * 6.283, rr = Math.sqrt(rnd(i * 5 + 71)) * 26, px = R(1622 + Math.cos(a) * rr), py = R(-40 + Math.sin(a) * rr * 0.7); if (g.has(px, py)) g.px(px, py, i % 3 ? "#FFFFFF" : "#F8D0DC"); }
  g.rect(1584, LAND, 74, 1, "#2A5A2E");
}

function fence(g) {
  const O = FENCE[0], y0 = LAND - 48;
  // two rails behind the pickets
  for (const ry of [y0 + 12, y0 + 34]) { g.rect(1776, ry - 1, RX1 - 1776 + 4, 6, O); g.rect(1776, ry, RX1 - 1776 + 4, 4, FENCE[4]); g.rect(1776, ry, RX1 - 1776 + 4, 1, FENCE[6]); }
  for (let x = 1778; x < RX1 - 2; x += 11) {
    const post = ((x - 1778) / 11) % 6 === 0, top = post ? y0 - 6 : y0, w = post ? 9 : 7;
    g.poly([[x - 1, LAND], [x - 1, top + 3], [x + w / 2, top - 3], [x + w + 1, top + 3], [x + w + 1, LAND]], O);
    for (let y = top - 1; y < LAND; y++) for (let X = x; X < x + w; X++) {
      const peak = top + 3 - (1 - Math.abs((X + 0.5 - (x + w / 2)) / (w / 2))) * 5; if (y < peak) continue;
      const u = (X - x) / w; g.px(X, y, FENCE[u < 0.3 ? 7 : u > 0.75 ? 4 : 6]);
    }
    if (post) { g.rect(x - 1, top - 4, w + 2, 2, O); }
    g.rect(x, LAND - 4, w, 4, FENCE[3]);
  }
  for (let x = 1776; x < RX1; x++) for (let y = LAND + 1; y < LAND + 6; y++) g.px(x, y, mix(g.get(x, y), "#1E4A2A", 0.35 * (1 - (y - LAND) / 6)));
}

function doghouse(g) {
  const x0 = 2082, x1 = 2154, top = LAND - 56, O = "#1A1430", ax = (x0 + x1) / 2, ay = top - 40;
  g.rect(x0 - 1, top - 1, x1 - x0 + 2, LAND - top + 1, O);
  for (let y = top; y < LAND; y++) for (let x = x0; x < x1; x++) { const pl = (x - x0) % 10, u = (x - x0) / (x1 - x0); let s = pl === 9 ? 3 : pl === 0 ? 6 : 5; if (u > 0.82) s -= 1; if (y - top < 6) s -= 1; g.px(x, y, DOGH[s]); }
  // arched door
  for (let y = top + 16; y < LAND; y++) for (let x = ax - 17; x <= ax + 17; x++) { const dy = y - (top + 33), r = 17; if (dy < 0 && (x - ax) ** 2 + dy * dy > r * r) continue; const edge = dy < 0 ? (x - ax) ** 2 + dy * dy > (r - 2) ** 2 : Math.abs(x - ax) > r - 2; g.px(x, y, edge ? O : y > LAND - 6 ? "#2A2030" : "#120C1A"); }
  // bone emblem over the door
  const by = top + 9; g.rect(ax - 7, by - 1, 14, 3, "#FFFFFF"); for (const s of [-1, 1]) { g.rect(ax + s * 8 - 1, by - 3, 3, 3, "#FFFFFF"); g.rect(ax + s * 8 - 1, by + 1, 3, 3, "#FFFFFF"); } g.rect(ax - 7, by + 2, 14, 1, "#C8C8D8");
  // red roof (same shingles as the cottage)
  g.poly([[x0 - 9, top + 3], [ax, ay - 3], [x1 + 9, top + 3]], "#3A0C10");
  g.poly([[x0 - 7, top], [ax, ay], [x1 + 7, top]], ROOF[3], (X, Y) => { const row = Math.floor((Y - ay) / 7), off = (row & 1) * 4, cell = ((X - ax + 200 + off) % 8 + 8) % 8, yy = (Y - ay) % 7; let s = 4 - (yy >= 5 ? 1 : 0) - ((yy >= 3 && (cell < 1 || cell > 6)) ? 1 : 0) + (yy < 2 ? 1 : 0) - (X > ax + 10 ? 1 : 0); return ROOF[Math.max(1, Math.min(6, s))]; });
  g.line(x0 - 7, top, R(ax), ay, FENCE[6]); g.line(R(ax), ay, x1 + 7, top, FENCE[4]);
  // food bowl
  for (let X = -10; X <= 10; X++) for (let Y = -4; Y <= 3; Y++) { const d = (X / 10) ** 2 + (Y / 4) ** 2; if (d <= 1 && Y >= -1) g.px(2010 + X, LAND - 2 + Y, d > 0.75 ? "#6A161A" : Y < 1 ? "#E8443C" : "#B0302C"); }
  g.rect(2002, LAND - 4, 17, 2, "#7A4A22"); g.rect(2004, LAND - 5, 12, 1, "#9A6A3A");
}

export function yardLayers() { if (!BACK) build(); return { BACK, FRONT }; }
