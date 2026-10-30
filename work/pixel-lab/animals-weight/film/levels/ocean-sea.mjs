// Shared helpers for LV10 ocean (levels/ocean.mjs) and the dawn shore (levels/shore.mjs) of «lightest → heaviest»:
// the sea body (world.mjs drawWater, blended across the night → dawn change so it never jumps), the far sea band to the
// horizon with the moon/sun glitter, time-of-day light for terrain, world-anchored static caches, small pixel icons.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { drawWater, tod } from "../world.mjs";

export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const cyc = (T) => ((T % 7) + 7) % 7;

// ---------------------------------------------------------------- light by time of day (T = cyclic tod 0..7 of the camera)
/** Night, dusk and dawn weights for the camera (continuous through night → dawn → morning). */
export function light(cx) {
  const T = cyc(tod(cx));
  const night = T > 6.5 ? 1 - sm(T, 6.5, 7) : sm(T, 5, 6);
  const dusk = sm(T, 3.8, 5) * (1 - sm(T, 5.4, 6.2));
  const dawn = T > 6.2 ? sm(T, 6.2, 6.9) : 1 - sm(T, 0.1, 1.1);
  return { T, night, dusk, dawn };
}
/** Tint (colour, amount) that puts day-coloured scenery into the camera's light. */
export function sceneTint(cx) {
  const L = light(cx), wN = 0.58 * L.night, wD = 0.3 * L.dusk * (1 - L.night), wA = 0.24 * L.dawn * (1 - L.night * 0.5), k = Math.min(0.7, wN + wD + wA);
  if (k <= 0.001) return { col: [0, 0, 0], k: 0 };
  const cn = hex("#121036"), cd = hex("#6A2A4E"), ca = hex("#7A5A9C"), s = wN + wD + wA;
  return { col: [0, 1, 2].map((i) => (cn[i] * wN + cd[i] * wD + ca[i] * wA) / s), k };
}

// ---------------------------------------------------------------- the sea body
const TMP = new Canvas(540, 960, "#000000");
/**
 * Water below y = 0 between world x0..x1. world.mjs drawWater switches its night factor off at tod 6.5 in one step,
 * so across tod 6.5..7.6 the night look and the morning look are drawn both and mixed by the dawn progress (the
 * dawn sea keeps a little of the night's depth).
 */
export function seaWater(c, V, t, x0, x1) {
  const T = cyc(tod(V.cx)), Tl = T > 3.5 ? T - 7 : T;          // −0.5 … 0.6 around the dawn change
  if (!(Tl > -0.5 && Tl < 0.6)) { drawWater(c, V, t, x0, x1, 0); return; }
  const k = sm(Tl, -0.5, 0.6);
  drawWater(c, { ...V, tod: 0 }, t, x0, x1, 0);
  drawWater(TMP, { ...V, tod: 6.4 }, t, x0, x1, 0);
  const sx0 = Math.max(0, R(V.X(x0))), sx1 = Math.min(c.w, R(V.X(x1))), sy0 = Math.max(0, R(V.Y(0)) + 2), d = c.d, s = TMP.d;
  for (let y = sy0; y < c.h; y++) for (let x = sx0; x < sx1; x++) { const i = (y * c.w + x) * 3; d[i] = s[i] + (d[i] - s[i]) * k; d[i + 1] = s[i + 1] + (d[i + 1] - s[i + 1]) * k; d[i + 2] = s[i + 2] + (d[i + 2] - s[i + 2]) * k; }
}

/** The far sea band (the receding surface up to the horizon) between world x0..x1, rows y = −h..0, with glitter under the disc. */
export function seaBand(c, V, t, x0, x1, h = 34, edge = null) {
  const L = light(V.cx), sx0 = Math.max(0, R(V.X(x0))), sx1 = Math.min(c.w, R(V.X(x1)));
  if (sx0 >= sx1) return;
  const day = ["#D8F0F2", "#A8DCE2", "#8ACFD8", "#62C2D0"], dawn = ["#FAD6CC", "#E6B4C4", "#B096C6", "#8290C8"], night = ["#6A6AAA", "#3C4078", "#2A3064", "#1E2656"];
  const band = day.map((d, i) => mix(mix(d, dawn[i], L.dawn * (1 - L.night)), night[i], L.night));
  const gl = mix(mix("#FFF4D0", "#FFD8B0", L.dawn), "#F8E8BC", L.night);
  for (let wy = -h; wy < 0; wy++) {
    const y = R(V.Y(wy)); if (y < 0 || y >= c.h) continue;
    const v = (wy + h) / h, q = v * 3, lo = Math.floor(q), f = q - lo;
    for (let x = sx0; x < sx1; x++) {
      const wx = x - 270 + V.cx; if (edge && wy < edge(wx)) continue;
      let col = f > bayer(x, y) ? band[Math.min(3, lo + 1)] : band[lo];
      if (v > 0.2 && ((x * 7 + wy * 13 + R(t * 2)) % 23) === 0) col = band[Math.max(0, lo - 1)];       // soft swell streaks
      const gx = Math.abs(x - 270) / (26 + v * 40);                                                      // glitter path under the disc
      if (gx < 1 && ((x + (wy & 1) * 2 + R(t * 6 + wy * 0.7)) % 5) < 2 && (1 - gx) * (0.4 + v) > bayer(x, y + 1)) col = gl;
      c.px(x, y, col);
    }
  }
  const hy = R(V.Y(-h)); if (hy >= 0 && hy < c.h) for (let x = sx0; x < sx1; x++) { const wx = x - 270 + V.cx; if (!edge || -h >= edge(wx)) c.px(x, hy, band[0]); }
}

// ---------------------------------------------------------------- world-anchored static cache
/** Offscreen world layer covering world x wx0..wx0+w, y wy0..wy0+h; paint(g) draws in WORLD coordinates. */
export class Cache {
  constructor(wx0, wy0, w, h, paint) {
    this.wx0 = wx0; this.wy0 = wy0; this.w = w; this.h = h; this.cv = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const cv = this.cv, m = this.m, base = Canvas.prototype.px, self = this;
    const g = Object.create(cv);
    g.px = (x, y, col) => { x = Math.floor(x) - wx0; y = Math.floor(y) - wy0; if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(cv, x, y, col); m[y * w + x] = 1; };
    g.get = (x, y) => cv.get(Math.floor(x) - wx0, Math.floor(y) - wy0);
    g.has = (x, y) => { x = Math.floor(x) - wx0; y = Math.floor(y) - wy0; return x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1; };
    this.g = g; paint(g, self);
  }
  /** Copy to the screen with an optional scene tint {col, k} (o.kx(wx) scales it per world column) or a colour grade
   *  o.grade {mul, add}; o.x0/o.x1 clip world columns. */
  blit(c, V, tint = null, o = {}) {
    const ox = R(V.X(this.wx0)), oy = R(V.Y(this.wy0)), W = this.w;
    const xa = Math.max(0, ox, o.x0 != null ? R(V.X(o.x0)) : 0), xb = Math.min(c.w, ox + W, o.x1 != null ? R(V.X(o.x1)) : c.w), ya = Math.max(0, oy), yb = Math.min(c.h, oy + this.h);
    if (xa >= xb || ya >= yb) return;
    const d = c.d, s = this.cv.d, m = this.m, k0 = tint?.k ?? 0, tc = tint?.col ?? [0, 0, 0], gr = o.grade ?? null;
    const KX = o.kx ? Float32Array.from({ length: xb - xa }, (_, i) => k0 * o.kx(xa + i - 270 + V.cx)) : null;
    let k = k0;
    for (let y = ya; y < yb; y++) {
      let li = (y - oy) * W + (xa - ox), p = (y * c.w + xa) * 3;
      for (let x = xa; x < xb; x++, li++, p += 3) {
        if (!m[li]) continue; const q = li * 3; if (KX) k = KX[x - xa];
        if (gr) { d[p] = s[q] * gr.mul[0] + gr.add[0]; d[p + 1] = s[q + 1] * gr.mul[1] + gr.add[1]; d[p + 2] = s[q + 2] * gr.mul[2] + gr.add[2]; }
        else if (k > 0) { d[p] = s[q] + (tc[0] - s[q]) * k; d[p + 1] = s[q + 1] + (tc[1] - s[q + 1]) * k; d[p + 2] = s[q + 2] + (tc[2] - s[q + 2]) * k; }
        else { d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2]; }
      }
    }
  }
}

/** Smooth profile y(x) through [x, y] keys (cosine-eased between keys). */
export function profile(keys) {
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [a, ya] = keys[i], [b, yb] = keys[i + 1]; if (x <= b) { const k = (x - a) / (b - a), e = (1 - Math.cos(Math.PI * k)) / 2; return ya + (yb - ya) * e; } }
    return keys[keys.length - 1][1];
  };
}
/** Colour of a static thing at world depth wy below the surface (fixed blue water veil). */
export function under(col, wy) { if (wy <= 0) return hex(col); const k = Math.min(0.62, 0.18 + wy / 900); return mix(col, wy < 160 ? "#2E8AB0" : "#1C5486", k); }

// ---------------------------------------------------------------- tiny pixel icons (sprites in rows; '.' = empty)
/** Build an icon from simple shapes on a w×h grid (later shapes paint over earlier ones), then add a 1-px outline. */
function shapeIcon(w, h, shapes, map, outline = "o") {
  const g = Array.from({ length: h }, () => Array(w).fill("."));
  for (const s of shapes) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x + 0.5, Y = y + 0.5;
    let on = false;
    if (s.e) { const [cx, cy, rx, ry] = s.e; on = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1; }
    else if (s.r) { const [x0, y0, x1, y1] = s.r; on = X >= x0 && X <= x1 && Y >= y0 && Y <= y1; }
    else if (s.p) on = s.p.some(([px, py]) => px === x && py === y);
    if (on) g[y][x] = s.c;
  }
  const out = g.map((row, y) => row.map((ch, x) => { if (ch !== ".") return ch; const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const q = g[y + dy]?.[x + dx]; return q && q !== "." && q !== "w"; }); return n ? outline : "."; }).join(""));
  return { rows: out, map };
}
export const ICON = {
  elephant: shapeIcon(17, 13, [
    { e: [10.6, 6.2, 5.6, 3.9], c: "G" }, { r: [6.2, 7, 8.4, 11.6], c: "G" }, { r: [12.4, 7, 14.6, 11.6], c: "G" }, { r: [9.2, 8, 10.8, 11.6], c: "D" },
    { p: [[16, 5], [16, 6], [16, 7]], c: "G" },
    { e: [4.6, 4.8, 3.6, 3.4], c: "G" }, { r: [1.4, 6.5, 3.3, 10.6], c: "G" }, { p: [[3, 11], [4, 11]], c: "G" },
    { e: [7.4, 4.9, 2.3, 3.0], c: "E" }, { p: [[3, 4]], c: "k" }, { p: [[4, 8]], c: "w" },
    { p: [[3, 2], [4, 2], [5, 2], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3]], c: "g" },
  ], { o: "#14141E", G: "#9C9CB6", g: "#C8C8DC", D: "#74748E", E: "#C08EA6", k: "#14141E", w: "#FFFFFF" }),
  whale: { rows: [
    "..........oooooooo.......",
    ".......ooBBBBBBBBBoo...oo",
    ".....ooBBBbBBBBBBBBBo.oBo",
    "...ooBBBBBBBBBBBBBBBBoBBo",
    "..oBwkBBBBBBBBBBBBBBBBBo.",
    ".oBBBBBBBBBBBBBBBBBBBBo..",
    "oBBpppppBBBBBBBBBBBBBo...",
    ".oppppppppppppppBBBoo....",
    "..oooooooooooooooo......."], map: { o: "#0A1428", B: "#4A74A8", b: "#86AEDA", p: "#B4CCE4", w: "#FFFFFF", k: "#0A1428" } },
  hero: { rows: [
    "...y...",
    "..PPP..",
    ".PPPPP.",
    "oSSSSSo",
    "osssss.",
    ".kssk..",
    ".sssso.",
    "obbbbbo",
    "mCCCCCm",
    "mCCCCCm",
    ".CCCCC.",
    ".nn.nn.",
    ".dd.dd."].map((r) => r.replace(/o/g, ".")), map: { y: "#F4CA50", P: "#8D59DA", S: "#6E4FB0", s: "#F3CBAA", k: "#2A1416", b: "#5470B8", C: "#E0565A", m: "#F4CA50", n: "#2E2E66", d: "#4A2C18" } },
  bee: { rows: [".ww.", "ybyb", ".yb."], map: { w: "#E8F4FF", y: "#F4C430", b: "#2A1A08" } },
};
/** Draw an icon with its bottom-centre at (x, y), scale s, optional dissolve a and outline colour. */
export function icon(c, name, x, y, s = 1, a = 1) {
  const I = ICON[name], h = I.rows.length, w = I.rows[0].length, x0 = R(x - (w * s) / 2), y0 = R(y - h * s);
  if (a <= 0) return;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const col = I.map[I.rows[j][i]]; if (!col) continue;
    for (let b = 0; b < s; b++) for (let q = 0; q < s; q++) { const X = x0 + i * s + q, Y = y0 + j * s + b; if (a < 1 && a <= bayer(X, Y)) continue; c.px(X, Y, col); }
  }
}
export { hex, mix, bayer };
