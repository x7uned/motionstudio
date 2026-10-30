// Helpers of the park level (LV5 dog + LV6 human), copied from the first film's meadow-kit (work/pixel-lab/animals/film):
// a cached world-space layer (offscreen canvas with a coverage mask, copied row by row into the frame with clipping)
// and small pixel-art props (flowers, tufts, leaf clusters). Deterministic (rnd seeds): layers are drawn once.
import { Canvas, hex, bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, fade } from "../cute.mjs";

const R = Math.round;

/** Canvas that also records which pixels were painted (the layer's alpha). */
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
/** Small 5-petal flower (s = petal radius 1..4) at x, y (centre), petals col, centre eye. */
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
export function dotted(c, pts, k, col, { gap = 7, size = 2, a = 1, dark = "#0B0812", from = 0 } = {}) {
  if (k <= 0 || a <= 0) return; const g = fade(c, a);
  let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  const end = L * Math.min(1, k);
  for (let s = from * L; s <= end; s += gap) {
    let acc = 0, i = 0; while (i < seg.length - 1 && acc + seg[i] < s) acc += seg[i++];
    const f = seg[i] ? (s - acc) / seg[i] : 0, x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
    const X = R(x - size / 2), Y = R(y - size / 2);
    g.rect(X - 1, Y - 1, size + 2, size + 2, dark); g.rect(X, Y, size, size, col);
  }
}
/** Point and tangent at fraction f of a polyline (for things flying along a path). */
export function along(pts, f) {
  let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let s = Math.max(0, Math.min(1, f)) * L, i = 0; while (i < seg.length - 1 && s > seg[i]) s -= seg[i++];
  const k = seg[i] ? s / seg[i] : 0, a = pts[i], b = pts[i + 1];
  return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dx: b[0] - a[0], dy: b[1] - a[1] };
}
/** Rotate/scale a polygon around (ox, oy). */
export function xform(poly, ox, oy, ang = 0, sx = 1, sy = sx, dx = 0, dy = 0) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return poly.map(([x, y]) => { const u = (x - ox) * sx, v = (y - oy) * sy; return [ox + dx + u * c - v * s, oy + dy + u * s + v * c]; });
}
export { R };

// ---------------------------------------------------------------- lawn ramp (perspective bands, light at the far edge)
export const GRASS = ["#B8E07A", "#A6D86E", "#92CC62", "#80BE58", "#6EB04E", "#5EA046", "#509040", "#44803A", "#3A7138", "#306232", "#28542C"];
/** Ground ramp index by depth below the ground line (perspective: narrow bands near the horizon). `shift` darkens. */
export function grassIdx(d, shift = 0) { return Math.min(GRASS.length - 1.001, Math.max(0, Math.sqrt(Math.max(0, d) / 330) * 6.6 + shift)); }
export function grassAt(x, y, d, shift = 0) { const v = grassIdx(d, shift), lo = Math.floor(v), fr = v - lo; return GRASS[Math.min(GRASS.length - 1, fr > 0.5 + 0.45 * (bayer(x, y) - 0.5) ? lo + 1 : lo)]; }
