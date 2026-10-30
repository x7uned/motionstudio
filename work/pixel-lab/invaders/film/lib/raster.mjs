// Pixel-art experiment (2026-10-21): a tiny raster on a low-res grid, upscaled nearest-neighbour.
// Not a template and not wired into the studio.
import sharp from "sharp";

const cache = new Map();
export const hex = (c) => {
  if (Array.isArray(c)) return c;
  let v = cache.get(c);
  if (!v) { v = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); cache.set(c, v); }
  return v;
};
export const mix = (a, b, k) => { const x = hex(a), y = hex(b); return x.map((v, i) => Math.round(v + (y[i] - v) * k)); };
export const toHex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export const bayer = (x, y) => (BAYER[y & 3][x & 3] + 0.5) / 16;

export class Canvas {
  constructor(w, h, bg = "#000000") { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 3); this.rect(0, 0, w, h, bg); }
  px(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex(c), i = (y * this.w + x) * 3; this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b;
  }
  get(x, y) { x = Math.max(0, Math.min(this.w - 1, x | 0)); y = Math.max(0, Math.min(this.h - 1, y | 0)); const i = (y * this.w + x) * 3; return [this.d[i], this.d[i + 1], this.d[i + 2]]; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c); }
  frame(x, y, w, h, c) { this.rect(x, y, w, 1, c); this.rect(x, y + h - 1, w, 1, c); this.rect(x, y, 1, h, c); this.rect(x + w - 1, y, 1, h, c); }
  // Rounded frame: corner pixel skipped (classic sprite box).
  rframe(x, y, w, h, c, r = 1) {
    this.rect(x + r, y, w - 2 * r, 1, c); this.rect(x + r, y + h - 1, w - 2 * r, 1, c);
    this.rect(x, y + r, 1, h - 2 * r, c); this.rect(x + w - 1, y + r, 1, h - 2 * r, c);
    if (r === 2) { this.px(x + 1, y + 1, c); this.px(x + w - 2, y + 1, c); this.px(x + 1, y + h - 2, c); this.px(x + w - 2, y + h - 2, c); }
  }
  rrect(x, y, w, h, c, r = 1) {
    for (let j = 0; j < h; j++) {
      const inset = r === 0 ? 0 : (j < r ? r - j : j >= h - r ? j - (h - r) + 1 : 0);
      const k = r === 2 && (j === 0 || j === h - 1) ? 2 : r === 2 && (j === 1 || j === h - 2) ? 1 : inset ? 1 : 0;
      this.rect(x + k, y + j, w - 2 * k, 1, c);
    }
  }
  line(x0, y0, x1, y1, c, dash) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      if (!dash || n % (dash[0] + dash[1]) < dash[0]) this.px(x0, y0, c);
      n++;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // Clean 2:1 isometric line: two pixels across per pixel down.
  iline(x, y, len, dir, c) { for (let i = 0; i < len; i++) this.px(x + i * dir, y + Math.floor(i / 2), c); }
  poly(pts, c, shade) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, shade ? shade(x, y) : c);
    }
  }
  disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) this.px(cx + x, cy + y, c); }
  ring(cx, cy, r, c) {
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.sqrt(x * x + y * y); if (Math.abs(d - r) < 0.5) this.px(cx + x, cy + y, c);
    }
  }
  ellipse(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.02) this.px(cx + x, cy + y, c); }
  ering(cx, cy, rx, ry, c, from = 0, to = Math.PI * 2) {
    const n = Math.ceil((rx + ry) * 4);
    for (let i = 0; i <= n; i++) { const a = from + ((to - from) * i) / n; this.px(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), c); }
  }
  // Ordered dither: pixel painted where level(x,y) beats the Bayer threshold.
  dither(x, y, w, h, level, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const l = level(i, j); if (l > 0 && l > bayer(i, j)) this.px(i, j, c); } }
  // Blend the existing pixel toward `c` by k(x,y), quantised to `steps` and dithered between steps.
  tint(x, y, w, h, k, c, steps = 4) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const v = Math.max(0, Math.min(1, k(i, j))); if (v <= 0) continue;
      const s = v * steps, lo = Math.floor(s), q = (s - lo > bayer(i, j) ? lo + 1 : lo) / steps;
      if (q > 0) this.px(i, j, mix(this.get(i, j), c, q));
    }
  }
  sprite(x, y, rows, map, flip = false) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { const c = map[ch]; if (c) this.px(flip ? x + row.length - 1 - i : x + i, y + j, c); }));
  }
  blit(img, x, y, { threshold = 128, outline, flip = false } = {}) {
    const on = (i, j) => i >= 0 && j >= 0 && i < img.w && j < img.h && img.data[(j * img.w + i) * 4 + 3] >= threshold;
    for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
      const k = (j * img.w + i) * 4;
      const tx = flip ? x + img.w - 1 - i : x + i;
      if (on(i, j)) this.px(tx, y + j, [img.data[k], img.data[k + 1], img.data[k + 2]]);
      else if (outline && (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) this.px(tx, y + j, outline);
    }
  }
  text(font, str, x, y, c, o = {}) {
    const s = o.scale ?? 1, sp = o.spacing ?? 1;
    if (o.shadow) { const d = o.shadowOffset ?? s; this.text(font, str, x + d, y + d, o.shadow, { ...o, shadow: null, colorAt: null }); }
    let cx = x;
    for (const ch of str.toUpperCase()) {
      if (ch === " ") { cx += (font.space + sp) * s; continue; }
      const g = font.glyphs[ch] ?? font.glyphs["?"], w = g[0].length;
      const col = typeof c === "function" ? c(cx, ch) : c;
      g.forEach((row, j) => [...row].forEach((p, i) => {
        if (p !== "#") return;
        if (o.colorAt) { for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) { const X = cx + i * s + a, Yy = y + j * s + b, cc = o.colorAt(X, Yy); if (cc) this.px(X, Yy, cc); } return; }
        this.rect(cx + i * s, y + j * s, s, s, col);
        if (o.bold) this.rect(cx + (i + 1) * s, y + j * s, s, s, col);
      }));
      cx += (w + sp + (o.bold ? 1 : 0)) * s;
    }
    return cx - x - sp * s;
  }
  measure(font, str, o = {}) {
    const s = o.scale ?? 1, sp = o.spacing ?? 1; let w = 0;
    for (const ch of str.toUpperCase()) w += ch === " " ? (font.space + sp) * s : ((font.glyphs[ch] ?? font.glyphs["?"])[0].length + sp + (o.bold ? 1 : 0)) * s;
    return w - sp * s;
  }
  async save(path, scale) {
    await sharp(Buffer.from(this.d), { raw: { width: this.w, height: this.h, channels: 3 } })
      .resize(this.w * scale, this.h * scale, { kernel: "nearest" }).png().toFile(path);
  }
}

export async function loadImage(path, w, h, opts = {}) {
  let img = sharp(path);
  if (opts.extract) img = img.extract(opts.extract);
  const { data, info } = await img.resize(w, h, { kernel: opts.kernel ?? "lanczos3", fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = { w: info.width, h: info.height, data: new Uint8ClampedArray(data) };
  if (opts.palette) {
    const pal = opts.palette.map(hex);
    for (let i = 0; i < out.w * out.h; i++) {
      const p = [out.data[i * 4], out.data[i * 4 + 1], out.data[i * 4 + 2]];
      let best = pal[0], bd = Infinity;
      for (const q of pal) { const d = (p[0] - q[0]) ** 2 * 0.3 + (p[1] - q[1]) ** 2 * 0.59 + (p[2] - q[2]) ** 2 * 0.11; if (d < bd) { bd = d; best = q; } }
      out.data.set(best, i * 4);
    }
  }
  if (opts.levels) for (let i = 0; i < out.w * out.h; i++) for (let k = 0; k < 3; k++) out.data[i * 4 + k] = Math.round(Math.round((out.data[i * 4 + k] / 255) * opts.levels) * (255 / opts.levels));
  return out;
}

const G = (s) => s.trim().split(/\s+/);
// 5×7 main font.
export const MAIN = {
  height: 7, space: 3, glyphs: {
    A: G(".###. #...# #...# ##### #...# #...# #...#"), B: G("####. #...# #...# ####. #...# #...# ####."),
    C: G(".###. #...# #.... #.... #.... #...# .###."), D: G("####. #...# #...# #...# #...# #...# ####."),
    E: G("##### #.... #.... ####. #.... #.... #####"), F: G("##### #.... #.... ####. #.... #.... #...."),
    G: G(".###. #...# #.... #.### #...# #...# .####"), H: G("#...# #...# #...# ##### #...# #...# #...#"),
    I: G("### .#. .#. .#. .#. .#. ###"), J: G("..### ...#. ...#. ...#. ...#. #..#. .##.."),
    K: G("#...# #..#. #.#.. ##... #.#.. #..#. #...#"), L: G("#.... #.... #.... #.... #.... #.... #####"),
    M: G("#...# ##.## #.#.# #.#.# #...# #...# #...#"), N: G("#...# #...# ##..# #.#.# #..## #...# #...#"),
    O: G(".###. #...# #...# #...# #...# #...# .###."), P: G("####. #...# #...# ####. #.... #.... #...."),
    Q: G(".###. #...# #...# #...# #.#.# #..#. .##.#"), R: G("####. #...# #...# ####. #.#.. #..#. #...#"),
    S: G(".#### #.... #.... .###. ....# ....# ####."), T: G("##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#.."),
    U: G("#...# #...# #...# #...# #...# #...# .###."), V: G("#...# #...# #...# #...# #...# .#.#. ..#.."),
    W: G("#...# #...# #...# #.#.# #.#.# #.#.# .#.#."), X: G("#...# #...# .#.#. ..#.. .#.#. #...# #...#"),
    Y: G("#...# #...# .#.#. ..#.. ..#.. ..#.. ..#.."), Z: G("##### ....# ...#. ..#.. .#... #.... #####"),
    0: G(".###. #...# #..## #.#.# ##..# #...# .###."), 1: G("..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###."),
    2: G(".###. #...# ....# ...#. ..#.. .#... #####"), 3: G("##### ...#. ..#.. ...#. ....# #...# .###."),
    4: G("...#. ..##. .#.#. #..#. ##### ...#. ...#."), 5: G("##### #.... ####. ....# ....# #...# .###."),
    6: G("..##. .#... #.... ####. #...# #...# .###."), 7: G("##### ....# ...#. ..#.. .#... .#... .#..."),
    8: G(".###. #...# #...# .###. #...# #...# .###."), 9: G(".###. #...# #...# .#### ....# ...#. .##.."),
    "@": G(".###. #...# #.### #.#.# #.### #.... .###."), _: G("..... ..... ..... ..... ..... ..... #####"),
    ".": G(". . . . . . #"), ",": G(".. .. .. .. .. .# #."), "!": G("# # # # # . #"), "'": G("# # . . . . ."),
    "?": G(".###. #...# ....# ...#. ..#.. ..... ..#.."), "-": G(".... .... .... #### .... .... ...."),
    ":": G(". . # . . # ."), "/": G("....# ....# ...#. ..#.. .#... #.... #...."), "+": G("..... ..#.. ..#.. ##### ..#.. ..#.. ....."),
    "%": G("##..# ##..# ...#. ..#.. .#... #..## #..##"), "°": G(".#. #.# .#. ... ... ... ..."), "·": G(". . . # . . ."),
    ">": G("#... .#.. ..#. ...# ..#. .#.. #..."), "*": G("..... ..#.. #.#.# .###. #.#.# ..#.. ....."),
    "✓": G("..... ....# ...## #.##. ###.. .#... ....."), "±": G("..#.. ..#.. ##### ..#.. ..#.. ..... #####"), "×": G("..... #...# .#.#. ..#.. .#.#. #...# ....."), "=": G("..... ..... ##### ..... ##### ..... ....."), "$": G("..#.. .#### #.#.. .###. ..#.# ####. ..#.."), "<": G("...# ..#. .#.. #... .#.. ..#. ...#"),
  },
};
// 3×5 small font (labels, header).
export const TINY = {
  height: 5, space: 2, glyphs: {
    A: G(".#. #.# ### #.# #.#"), B: G("##. #.# ##. #.# ##."), C: G(".## #.. #.. #.. .##"), D: G("##. #.# #.# #.# ##."),
    E: G("### #.. ##. #.. ###"), F: G("### #.. ##. #.. #.."), G: G(".## #.. #.# #.# .##"), H: G("#.# #.# ### #.# #.#"),
    I: G("### .#. .#. .#. ###"), J: G("..# ..# ..# #.# .#."), K: G("#.# #.# ##. #.# #.#"), L: G("#.. #.. #.. #.. ###"),
    M: G("#...# ##.## #.#.# #...# #...#"), N: G("#..# ##.# #.## #..# #..#"), O: G(".#. #.# #.# #.# .#."),
    P: G("##. #.# ##. #.. #.."), Q: G(".#. #.# #.# ##. .##"), R: G("##. #.# ##. #.# #.#"), S: G(".## #.. .#. ..# ##."),
    T: G("### .#. .#. .#. .#."), U: G("#.# #.# #.# #.# ###"), V: G("#.# #.# #.# #.# .#."), W: G("#...# #...# #.#.# ##.## #...#"),
    X: G("#.# #.# .#. #.# #.#"), Y: G("#.# #.# .#. .#. .#."), Z: G("### ..# .#. #.. ###"),
    0: G("### #.# #.# #.# ###"), 1: G(".#. ##. .#. .#. ###"), 2: G("##. ..# .#. #.. ###"), 3: G("##. ..# .#. ..# ##."),
    4: G("#.# #.# ### ..# ..#"), 5: G("### #.. ##. ..# ##."), 6: G(".## #.. ### #.# ###"), 7: G("### ..# .#. .#. .#."),
    8: G("### #.# ### #.# ###"), 9: G("### #.# ### ..# ##."), "@": G(".###. #.#.# #.##. #.... .###."), _: G("... ... ... ... ###"),
    ".": G(". . . . #"), "·": G(". . # . ."), "°": G(".#. #.# .#. ... ..."), "-": G("... ... ### ... ..."), ":": G(". # . # ."),
    "/": G("..# ..# .#. #.. #.."), "%": G("#.# ..# .#. #.. #.#"), ">": G("#.. .#. ..# .#. #.."), "'": G("# # . . ."),
    "!": G("# # # . #"), "?": G("##. ..# .#. ... .#."), "+": G("... .#. ### .#. ..."), ",": G(". . . # #"),
  },
};

/** A view of canvas c whose every pixel write passes an ordered-dither gate: alpha 0..1 dissolves anything drawn through it. */
export function fade(c, a) {
  if (a >= 1) return c;
  const o = Object.create(c);
  o.px = (x, y, col) => { if (a > bayer(Math.floor(x), Math.floor(y))) c.px(x, y, col); };
  return o;
}
