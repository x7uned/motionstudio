// Shared helpers for LV7 pasture (horse) and LV8 river (hippo): masked offscreen layers (static scenery drawn once and
// copied row by row into the frame), cached sprites, a tinted canvas view (things seen through water), small pixel
// props (flowers, tufts), the shared soil strata (one set of layers runs under the pasture and the river banks, so the
// seam at x 3510 matches), tiny chibi icons for the balance seesaws (hero-coloured people, a pony, a hippo) and the
// seesaw itself. Everything is a pure function of its inputs; the caches only memoise.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, fade, sm, ease, clamp01, lerp } from "../cute.mjs";

const R = Math.round;

/** Offscreen canvas with a coverage mask. Draw on `.g` (any cute.mjs / raster call), then copy with `.blit`. */
export class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m, base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    this.g = c;
  }
  /** Copy covered pixels with the layer's top-left at screen (sx, sy). o.a dissolves, o.x0/o.x1/o.y0/o.y1 clip,
   *  o.below + o.tint + o.k(y) recolour rows below a screen line (water), o.flip mirrors horizontally. */
  blit(c, sx, sy, o = {}) {
    sx = R(sx); sy = R(sy);
    const W = this.w, H = this.h, s = this.c.d, m = this.m, d = c.d, CW = c.w, a = o.a ?? 1;
    if (a <= 0) return;
    const xa = Math.max(o.x0 ?? 0, sx, 0), xb = Math.min(o.x1 ?? CW, sx + W, CW), ya = Math.max(0, sy, o.y0 ?? 0), yb = Math.min(c.h, sy + H, o.y1 ?? c.h);
    const below = o.below ?? 1e9, tint = o.tint ? hex(o.tint) : null, kf = o.k, flip = o.flip;
    for (let y = ya; y < yb; y++) {
      const row = (y - sy) * W, wet = tint && y > below ? kf(y) : 0;
      for (let x = xa; x < xb; x++) {
        const lx = flip ? W - 1 - (x - sx) : x - sx, li = row + lx; if (!m[li]) continue;
        if (a < 1 && a <= bayer(x, y)) continue;
        const q = li * 3, p = (y * CW + x) * 3;
        if (wet > 0) { d[p] = s[q] + (tint[0] - s[q]) * wet; d[p + 1] = s[q + 1] + (tint[1] - s[q + 1]) * wet; d[p + 2] = s[q + 2] + (tint[2] - s[q + 2]) * wet; }
        else { d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2]; }
      }
    }
  }
}

/** World-anchored static layer covering world x wx0..wx0+w, y wy0..wy0+h; `paint(g, L, T)` draws with L(wx)/T(wy). */
export function worldLayer(wx0, wy0, w, h, paint) {
  const L = new Layer(w, h); paint(L.g, (wx) => wx - wx0, (wy) => wy - wy0, L);
  return { layer: L, wx0, wy0, blit(c, V, o) { L.blit(c, V.X(wx0), V.Y(wy0), o); } };
}

/** Memoised sprite: key → { layer, ox, oy } where (ox, oy) is the anchor inside the layer. Small LRU. */
export function spriteCache(max = 48) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new Layer(w, h); paint(L.g, ox, oy); s = { layer: L, ox, oy, blit(c, x, y, o) { L.blit(c, x - (o?.flip ? w - 1 - ox : ox), y - oy, o); } };
    map.set(key, s); if (map.size > max) map.delete(map.keys().next().value);
    return s;
  };
}

/** A view of canvas c that recolours every pixel drawn through it: f(x, y, rgb) → rgb. */
export function tinted(c, f) {
  const o = Object.create(c);
  o.px = (x, y, col) => { if (!col) return; c.px(x, y, f(Math.floor(x), Math.floor(y), hex(col))); };
  return o;
}
/** Underwater look below screen row `sy`: mix toward `col` by k (deeper → more). */
export function underwater(c, sy, col, k0 = 0.4, k1 = 0.58, depth = 240) {
  const W = hex(col);
  return tinted(c, (x, y, p) => { if (y <= sy) return p; const k = k0 + (k1 - k0) * Math.min(1, (y - sy) / depth); return [R(p[0] + (W[0] - p[0]) * k), R(p[1] + (W[1] - p[1]) * k), R(p[2] + (W[2] - p[2]) * k)]; });
}

/** Rotate + translate points: local [x, y] → screen, about the local origin, then offset by (ox, oy), scaled by s. */
export function xf(ox, oy, s = 1, rot = 0) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (x, y) => [ox + (x * cs - y * sn) * s, oy + (x * sn + y * cs) * s];
  P.poly = (pts) => pts.map(([x, y]) => P(x, y)); P.s = s; P.rot = rot;
  return P;
}

/** Thick pixel polyline (radius r, round caps) in one colour. */
export function thick(g, pts, r, col) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n; for (let j = -r; j <= r; j++) for (let i2 = -r; i2 <= r; i2++) if (i2 * i2 + j * j <= r * r + 0.5) g.px(R(x) + i2, R(y) + j, col); }
  }
}

/** Smooth piecewise profile y(x) through [x, y] keys (cosine-eased between keys). */
export function profile(keys) {
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [a, ya] = keys[i], [b, yb] = keys[i + 1]; if (x <= b) { const k = (x - a) / (b - a), e = (1 - Math.cos(Math.PI * k)) / 2; return ya + (yb - ya) * e; } }
    return keys[keys.length - 1][1];
  };
}

/** Gaze keyframes: [[t0, [x, y]], [t1, [x, y]], …] → the look at time t, easing over `dur` seconds after each key. */
export function gaze(t, keys, dur = 0.25) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [tk, v] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / dur), e = k * k * (3 - 2 * k); cur = [cur[0] + (v[0] - cur[0]) * e, cur[1] + (v[1] - cur[1]) * e]; }
  return cur;
}

// ---------------------------------------------------------------- small props
/** Small 5-petal flower (s = petal radius 1..3) centred at x, y. */
export function flower(g, x, y, s, col, eye = "#F8D040", dark = null) {
  x = R(x); y = R(y);
  if (s <= 1) { g.px(x, y - 1, col); g.px(x - 1, y, col); g.px(x + 1, y, col); g.px(x, y + 1, dark ?? col); g.px(x, y, eye); return; }
  const d = dark ?? mix(col, "#000000", 0.25);
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5, px = x + Math.cos(a) * s * 0.95, py = y + Math.sin(a) * s * 0.95, r = s * 0.62;
    for (let Y = R(py - r); Y <= R(py + r); Y++) for (let X = R(px - r); X <= R(px + r); X++) if ((X - px) ** 2 + (Y - py) ** 2 <= r * r + 0.4) g.px(X, Y, Y > y + s * 0.3 ? d : col);
  }
  const er = Math.max(1, s * 0.42);
  for (let Y = R(y - er); Y <= R(y + er); Y++) for (let X = R(x - er); X <= R(x + er); X++) if ((X - x) ** 2 + (Y - y) ** 2 <= er * er + 0.3) g.px(X, Y, eye);
}
/** Grass tuft of n blades (h tall) at ground point x, y; cols dark → light; sway shifts the tips. */
export function tuft(g, x, y, h, n, cols, seed = 0, sway = 0) {
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 2 + R((rnd(seed + i * 3) - 0.5) * 2), bh = h * (0.6 + rnd(seed + i * 7) * 0.5), lean = (rnd(seed + i * 11) - 0.5) * h * 0.5 + sway;
    const col = cols[Math.min(cols.length - 2, i % (cols.length - 1))];
    for (let j = 0; j <= bh; j++) { const k = j / bh; g.px(R(bx + lean * k * k), R(y - j), j > bh * 0.7 ? cols[cols.length - 1] : col); }
  }
}

// ---------------------------------------------------------------- shared soil strata (pasture → river banks)
const SOIL = ["#7A4A2A", "#6C4026", "#835232", "#62391F", "#77482A", "#8A5A36"];
/** How muddy the soil is toward the river (shared by the pasture and the river so the strata match at x 3510). */
export const mudAt = (wx) => 0.9 * sm(wx, 3470, 3600);
/** Soil colour at world (wx, wy), d = depth below the local surface; mud 0..1 blends toward wet river mud. */
export function soil(wx, wy, d, mud = 0) {
  const wv = Math.sin(wx * 0.029) * 5 + Math.sin(wx * 0.12) * 2, v = (wy + wv + 400) / 21, band = Math.floor(v), f = v - band;
  let col = SOIL[((band % SOIL.length) + SOIL.length) % SOIL.length];
  if (f < 0.09 && bayer(wx, wy) > 0.35) col = mix(col, "#3A2010", 0.3);
  if (mud > 0) col = mix(col, ["#4A3A2A", "#433424", "#52402E", "#3E3020", "#4C3C2A", "#584632"][((band % 6) + 6) % 6], mud);
  if (wy > 100) col = mix(col, "#2E1A10", Math.min(0.42, (wy - 100) / 700));
  if (d > 6 && rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#E8C8A0", 0.45); else if (d > 6 && rnd(wx * 29 + wy * 17) < 0.006) col = mix(col, "#24140A", 0.5);
  return col;
}

// ---------------------------------------------------------------- tiny chibi icons for the balance seesaws
// people in the hero's colours (purple bobble hat, coral puffer, blue scarf, yellow mittens), a pony, a hippo
const MAP = {
  O: "#1A1024", B: "#B08AE8", H: "#8D59DA", h: "#6E4FB0", L: "#C8B0F4", S: "#F3CBAA", s: "#CF9A7A", E: "#1E2A5A", p: "#F28A9A", m: "#8A3A3A",
  F: "#7E98DA", f: "#5470B8", C: "#E0565A", c: "#B83A50", Y: "#F4CA50", P: "#3E4284", K: "#4A2C18", W: "#FFFFFF",
};
export const PERSON = [
  "....OBO....",
  "...OBBBO...",
  "..OHHHHHO..",
  ".OHHHHHHHO.",
  ".OHHHHHHhO.",
  ".OLLLLLLLO.",
  ".OSSSSSSSO.",
  ".OSESSSESO.",
  ".OSWSSSWSO.",
  ".OpSSmSSpO.",
  "..OSSSSSO..",
  ".OFFFFFFfO.",
  "OCCCCFCCCcO",
  "YCCCCfCCCcY",
  "OCCCCCCCCcO",
  ".OccccccccO",
  "..OPPOPPO..",
  "..OKKOKKO..",
];
const PONY_MAP = { O: "#2A0E08", A: "#C2602A", a: "#98401E", l: "#E08A44", M: "#5A2014", m: "#7A3018", W: "#FFF4E0", E: "#0B0812", K: "#2A1A14", p: "#F28A9A", w: "#FFFFFF" };
export const PONY = [   // side view, facing left, 24 × 19; anchor = bottom centre
  "......OO................",
  ".....OAO.O..............",
  "....OAAOMO..............",
  "...OAAAAMmO.............",
  "..OAwEAAAMmO............",
  ".OWAEEAAAAMmO...........",
  "OWWAAAAAAAAMmO..........",
  "OWWpAAAAAAAAMMOOOOOOO...",
  ".OOOOAAAAAAAAAAAlllAAOO.",
  ".....OAAAAAAAAAAAAAAAAMO",
  ".....OAAAAAAAAAAAAAAAAMO",
  ".....OaAAAAAAAAAAAAAAaMO",
  "......OaaaaaaaaaaaaaaOMO",
  "......OAaO.OAO..OAaO.OMO",
  "......OAaO.OAO..OAaO..O.",
  "......OAaO.OAO..OAaO....",
  "......OWWO.OAO..OAaO....",
  "......OKKO.OKO..OKKO....",
  ".......OO...O....OO.....",
];
const HIPPO_MAP = { O: "#1E1428", G: "#8A7496", g: "#6A5878", l: "#B4A0BC", P: "#E89AAE", E: "#0B0812", W: "#FFFFFF", T: "#F8F4E4" };
export const HIPPO = [  // front-ish view, 26 × 17; anchor = bottom centre
  "...OO..............OO.....",
  "..OPGO............OGPO....",
  "..OGGOOOOOOOOOOOOOOGGO....",
  ".OGGlllGGGGGGGGGGGlllGO...",
  ".OGGOWEGGGGGGGGGGOWEGGO...",
  "OGGGOEEGGGGGGGGGGOEEGGGO..",
  "OGGGGGGGGGGGGGGGGGGGGGGGO.",
  "OGlllllGGGGGGGGGGGlllllGO.",
  "OGllOllllllllllllllOllGGO.",
  "OPGlllllllllllllllllllGPO.",
  "OPGGlllllllllllllllllGGPO.",
  ".OGGTOOOOOOOOOOOOOOTGGGO..",
  "..OGGGGGGGGGGGGGGGGGGGO...",
  "..OgGGGGGGGGGGGGGGGGGgO...",
  "..OggOgggOOOOOOgggOggO....",
  "..OllOlllO....OlllOllO....",
  "...OO.OOO......OOO.OO.....",
];
/** Draw a string sprite with its bottom-centre at (x, y); a dissolves, flip mirrors, sq squashes (1 = none). */
export function icon(c, rows, map, x, y, { a = 1, flip = false } = {}) {
  if (a <= 0) return; const g = fade(c, a), w = rows[0].length, h = rows.length, x0 = R(x - w / 2), y0 = R(y - h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = rows[j][flip ? w - 1 - i : i], col = map[ch]; if (col) g.px(x0 + i, y0 + j, col); }
}
export const personIcon = (c, x, y, o) => icon(c, PERSON, MAP, x, y, o);
export const ponyIcon = (c, x, y, o) => icon(c, PONY, PONY_MAP, x, y, o);
export const hippoIcon = (c, x, y, o) => icon(c, HIPPO, HIPPO_MAP, x, y, o);

// ---------------------------------------------------------------- the balance seesaw
const WOOD = ["#2E1A10", "#5A3420", "#7A4A2C", "#9A6438", "#B88050", "#D49C66", "#E8BC88"];
/**
 * A wooden seesaw: pivot at screen (x, y) (top of the fulcrum), plank half-length hl, tilt ang (rad, + = right end down).
 * Returns the screen positions of the two plank ends' top surfaces {L: [x, y], Rt: [x, y]} so loads can sit on them.
 * base: "log" (a log seen end-on) | "hay" | "rock".
 */
export function seesaw(c, x, y, hl, ang, { base = "log", a = 1 } = {}) {
  const g = fade(c, a), cs = Math.cos(ang), sn = Math.sin(ang);
  // fulcrum
  if (base === "log") {
    const r = 13, cy = y + 2 + r;   // a log lying across, seen end-on: bark ring, growth rings, a lit top
    for (let Y = -r; Y <= r; Y++) for (let X = -r; X <= r; X++) { const d = Math.hypot(X, Y); if (d > r + 0.4) continue; const ring = Math.floor(d / 2.6); g.px(x + X, cy + Y, d > r - 0.6 ? "#2A160C" : d > r - 2.6 ? (Y < -r * 0.3 ? "#8A5A32" : "#6A4024") : ring % 2 ? "#D8A868" : "#E8C488"); }
    g.px(x, cy, "#9A6A3A"); g.px(x + 1, cy, "#9A6A3A"); for (let k = 0; k < 6; k++) g.px(x + 2 + k, cy - 1 - (k >> 1), "#B8864E");
    g.rect(x - r - 2, cy + r, 2 * r + 5, 1, "#2A160C");
  } else if (base === "hay") {
    const r = 15;
    for (let Y = -r; Y <= r; Y++) for (let X = -r - 3; X <= r + 3; X++) { const d = (X / (r + 3)) ** 2 + (Y / r) ** 2; if (d > 1) continue; const yy = y + 2 + r + Y, band = (Y + r) % 5 === 0; g.px(x + X, yy, d > 0.86 ? "#6A4A14" : band ? "#B08A2A" : (X + Y * 2) % 7 === 0 ? "#F4DA7A" : Y < -r * 0.3 ? "#E8C454" : "#D0A83A"); }
  } else {
    const RK = ["#2A2230", "#3E3446", "#564A5E", "#706476", "#8C8090", "#A89CAA"];
    for (let Y = 0; Y <= 22; Y++) { const hw = R(6 + Y * 0.8); for (let X = -hw; X <= hw; X++) { const edge = Math.abs(X) === hw || Y === 22; g.px(x + X, y + 2 + Y, edge ? RK[0] : X < -hw * 0.3 ? RK[4] : X > hw * 0.4 ? RK[2] : RK[3]); } }
    g.px(x - 2, y + 5, RK[5]); g.px(x - 3, y + 7, RK[5]);
  }
  // plank (5 px thick) rotated about the pivot
  const P = (u, v) => [x + u * cs - v * sn, y + u * sn + v * cs];
  for (let u = -hl; u <= hl; u += 0.5) for (let v = -5; v <= 0; v += 0.5) { const [px, py] = P(u, v); const edge = v <= -4.6 || v >= -0.4 || Math.abs(u) > hl - 0.6; g.px(R(px), R(py), edge ? WOOD[0] : v < -3.5 ? WOOD[5] : (R(u) % 23 === 0) ? WOOD[2] : WOOD[3]); }
  // little end stops
  for (const sd of [-1, 1]) for (let v = -9; v <= -4; v += 0.5) for (let du = 0; du <= 2; du += 0.5) { const [px, py] = P(sd * (hl - du), v); g.px(R(px), R(py), du > 1.6 || v < -8.5 ? WOOD[0] : WOOD[4]); }
  g.px(x, y - 2, WOOD[6]); g.px(x, y - 3, WOOD[1]);
  return { L: P(-hl * 0.66, -5), Rt: P(hl * 0.66, -5), at: (u) => P(u, -5) };
}
/** Damped spring step: 0 before u = 0, then settles at 1 with a small overshoot (plank tilts, landings). */
export const spring = (u, k = 6.5, w = 11) => (u <= 0 ? 0 : 1 - Math.exp(-k * u) * Math.cos(w * u));
/** A view of canvas c that only paints inside the circle (cx, cy, r). */
export function clipped(c, cx, cy, r) { const o = Object.create(c); o.px = (x, y, col) => { if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) c.px(x, y, col); }; return o; }
export { R, sm, ease, clamp01, lerp, rnd, fade, mix, bayer, hex };
