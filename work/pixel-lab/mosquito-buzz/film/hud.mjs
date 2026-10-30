// «Why your cat sleeps all day…» — screen-space game-like UI for the whole film (same palette and tag look as the
// earlier pixel films: C from animals/film/cute.mjs, tags/panels as in cat-eyes). Everything is drawn in screen grid
// pixels (540×960) and takes `a` (0..1) to dissolve through an ordered-dither fade; every animated value is continuous
// (pass smooth k / t / blink), so nothing appears or changes in one frame. Pure functions of their arguments.
import { MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { C, panel } from "./cute.mjs";
import { gate } from "./layout.mjs";
export { C };

const R = Math.round, TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const frac = (v) => v - Math.floor(v);
const SHADOW = "#2A1A48", WHITE = "#FFFFFF", RED = "#FF4D5E";
export const tw = (c, s, scale = 2) => c.measure(MAIN, s, { scale });
/** Pixel text with a 1-step dark outline (readable over any picture). */
export function otext(c, s, x, y, col, a = 1, scale = 2, out = C.O) {
  if (a <= 0) return; const g = fade(c, a), X = R(x), Y = R(y), d = Math.max(1, R(scale / 2));
  for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d], [d, d], [-d, d], [d, -d], [-d, -d], [d, 2 * d], [0, 2 * d]]) g.text(MAIN, s, X + dx, Y + dy, out, { scale });
  g.text(MAIN, s, X, Y, col, { scale });
}
// chunky line of square brush (radius r) — for strokes, arcs, crosses
function brush(g, x, y, r, col) { const s = Math.max(1, R(2 * r)); g.rect(Math.floor(x - s / 2 + 0.5), Math.floor(y - s / 2 + 0.5), s, s, col); }
function stroke(g, pts, w, col) { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.5)); for (let k = 0; k <= n; k++) brush(g, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, w / 2, col); } }

// ---------------------------------------------------------------- energy bar
const LEVEL_KEYS = [[0, "#E03056"], [0.22, "#F2484E"], [0.38, "#F59A3A"], [0.52, "#F4CA50"], [0.72, "#65DA41"], [1, "#7AEA52"]];
export function levelColor(level) {
  const v = clamp01(level); let i = 0; while (i < LEVEL_KEYS.length - 2 && v > LEVEL_KEYS[i + 1][0]) i++;
  const [a, ca] = LEVEL_KEYS[i], [b, cb] = LEVEL_KEYS[i + 1]; return mix(ca, cb, clamp01((v - a) / (b - a)));
}
/**
 * Pixel battery/HP bar with a label. (x, y) = top-left of the label row; the bar sits 20 px below it.
 * level 0..1.3: fill width and colour (red → orange → yellow → green); above 1 = overfull: the bar glows, a shimmer
 * runs through it and "MAX" blinks smoothly. Below 0.25 the frame pulses red with `blink`.
 * o = { a = 1, w = 120 (bar body width), blink (0..1, e.g. 0.5 + 0.5·sin), label = "ENERGY", t (shimmer phase, s) }.
 * Returns { x, y, w, h, fillX } (fillX = screen x of the current fill edge).
 */
export function energyBar(c, x, y, level, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const w = R(o.w ?? 120), blink = clamp01(o.blink ?? 0), t = o.t ?? 0, g = fade(c, a), X = R(x), Y = R(y);
  const ov = clamp01((level - 1) / 0.3), low = clamp01(1 - level / 0.25), col = ov > 0 ? mix(levelColor(1), "#D8FF7A", ov) : levelColor(level), bx = X, by = Y + 20, bh = 26;
  // label (+ MAX)
  otext(c, o.label ?? "ENERGY", X, Y, C.IV, a, 2);
  if (ov > 0) { const ma = a * ov * (0.35 + 0.65 * blink), s = "MAX"; otext(c, s, X + w - tw(c, s, 2), Y, mix(C.Y, WHITE, 0.3 * blink), ma, 2); }
  // overfull glow halo (dithered), pulsing with blink
  if (ov > 0) { const gk = ov * (0.45 + 0.35 * blink); for (let j = by - 6; j < by + bh + 6; j++) for (let i = bx - 6; i < bx + w + 11; i++) { const dx = Math.max(bx - i, 0, i - (bx + w + 5)), dy = Math.max(by - j, 0, j - (by + bh)); const d = Math.hypot(dx, dy); if (d <= 0 || d > 6) continue; if (gk * (1 - d / 6) > bayer(i, j)) g.px(i, j, mix(c.get(i, j), "#FFE88A", 0.6)); } }
  // body: dark outline, edge, inner well; nub on the right
  const edge = low > 0 ? mix(C.p7, RED, low * (0.4 + 0.6 * blink)) : ov > 0 ? mix(C.p7, "#FFE07A", ov) : C.p7;
  g.rrect(bx - 1, by - 1, w + 2, bh + 2, C.O, 2); g.rrect(bx, by, w, bh, edge, 2); g.rrect(bx + 1, by + 1, w - 2, bh - 2, C.p5, 2);
  g.rect(bx + 2, by + 2, w - 4, bh - 4, "#0E0918");
  g.rect(bx + w, by + 7, 6, 12, C.O); g.rect(bx + w, by + 8, 5, 10, edge); g.rect(bx + w, by + 9, 4, 8, C.p5);
  // fill: continuous width, segment cuts every 10 px, lit top rows and darker bottom rows
  const fx0 = bx + 4, fy0 = by + 4, fw = w - 8, fh = bh - 8, fill = fw * clamp01(level), lit = mix(col, WHITE, 0.38 + 0.25 * ov), dark = mix(col, C.O, 0.32);
  for (let i = 0; i < Math.ceil(fill); i++) {
    const cut = i % 10 === 9, part = Math.min(1, fill - i);
    if (part < 1 && part <= bayer(fx0 + i, fy0) * 0.999) continue;
    for (let j = 0; j < fh; j++) {
      let cc = j < 2 ? lit : j >= fh - 3 ? dark : col;
      if (ov > 0) { const sh = frac((i - j * 0.6) / 46 - t * 0.9); if (sh < 0.12 * ov) cc = mix(cc, WHITE, 0.55); }
      if (cut) cc = mix(cc, C.O, 0.55);
      g.px(fx0 + i, fy0 + j, cc);
    }
  }
  if (fill > 1) g.rect(fx0 + R(fill) - 1, fy0, 1, fh, mix(col, WHITE, 0.6));
  return { x: X, y: Y, w: w + 6, h: 20 + bh, fillX: fx0 + fill };
}

// ---------------------------------------------------------------- the tag box of the earlier films
/** Rounded dark panel, coloured first line, ivory next lines (cat-eyes tagAt). cx = centre (kept 10 px inside the
 *  frame), y = top. Returns { x, y, w, h }. */
export function tag(c, lines, cx, y, a, col = C.Y, scale = 3) {
  if (a <= 0) return null; if (typeof lines === "string") lines = [lines];
  const w = Math.max(...lines.map((l) => tw(c, l, scale))) + 24, h = lines.length * (8 * scale + 4) + 12, x = R(Math.max(10, Math.min(540 - 10 - w, cx - w / 2)));
  panel(c, x, R(y), w, h, a, col); lines.forEach((l, i) => fade(c, a).text(MAIN, l, x + 12, R(y) + 8 + i * (8 * scale + 4), i ? C.IV : col, { scale }));
  return { x, y: R(y), w, h };
}

// ---------------------------------------------------------------- big title
const BITMAPS = new Map();
// pre-bolded glyphs where 1-px doubling would merge strokes (M, W, N)
const BOLD = { M: ["##...##", "###.###", "##.#.##", "##.#.##", "##...##", "##...##", "##...##"], W: ["##...##", "##...##", "##...##", "##.#.##", "##.#.##", "###.###", "##...##"], N: ["##...##", "###..##", "####.##", "##.####", "##..###", "##...##", "##...##"] };
function bitmap(text, bold) {
  const key = (bold ? "B|" : "N|") + text; let b = BITMAPS.get(key); if (b) return b;
  const ch = [...text.toUpperCase()], gly = (s) => (bold && BOLD[s] ? { g: BOLD[s], ex: 0 } : { g: MAIN.glyphs[s] ?? MAIN.glyphs["?"], ex: bold ? 1 : 0 });
  let w = 0; for (const s of ch) { if (s === " ") { w += MAIN.space + 1 + (bold ? 1 : 0); continue; } const { g, ex } = gly(s); w += g[0].length + 1 + ex; } w = Math.max(1, w - 1);
  const bits = new Uint8Array(w * 7); let cx = 0;
  for (const s of ch) { if (s === " ") { cx += MAIN.space + 1 + (bold ? 1 : 0); continue; } const { g: gl, ex } = gly(s); gl.forEach((row, j) => [...row].forEach((p, i) => { if (p === "#") { bits[j * w + cx + i] = 1; if (ex) bits[j * w + cx + i + 1] = 1; } })); cx += gl[0].length + 1 + ex; }
  b = { w, h: 7, bits, at: (u, v) => (u >= 0 && v >= 0 && u < w && v < 7 ? bits[(v | 0) * w + (u | 0)] : 0) }; BITMAPS.set(key, b); return b;
}
const popEase = (x) => { x = clamp01(x); const c1 = 2.0, y = x - 1; return 1 + (c1 + 1) * y * y * y + c1 * y * y; };
/**
 * Huge pixel word ("ZOOMIES!", "FRAPS") centred at cx, top y (at full size). k 0..1 pops it in: it grows from 30 % with
 * an overshoot (~10 %) and dissolves in over the first 40 % — never a one-frame pop; a short sparkle burst follows.
 * o = { col = C.Y, scale = 7 (px per font pixel), bold = true (MAIN glyphs thickened 1 px → chunky), shake (0..1, smooth
 *       amount), t (s, shake/speed-line phase), lines (0..1 speed lines trailing on the left; dir -1 → on the right), a }.
 * Returns { x, y, w, h } of the word at full size.
 */
export function bigTitle(c, text, cx, y, k, o = {}) {
  const a = (o.a ?? 1) * sm(k, 0, 0.4); if (a <= 0) return null;
  const B = bitmap(text, o.bold ?? true), col = o.col ?? C.Y, S = o.scale ?? 7, t = o.t ?? 0, sh = clamp01(o.shake ?? 0), f = 0.3 + 0.7 * popEase(k), s = S * f;
  const Wp = B.w * s, Hp = 7 * s, shx = sh * 3.2 * (Math.sin(t * 41) + 0.6 * Math.sin(t * 67 + 1.3)) / 1.6, shy = sh * 2.4 * (Math.sin(t * 53 + 0.7) + 0.6 * Math.sin(t * 29 + 2.1)) / 1.6;
  const x0 = cx - Wp / 2 + shx, y0 = y + (7 * S) / 2 - Hp / 2 + shy, g = fade(c, a);
  // speed lines behind the word: solid streaks sliding away, dissolving at both ends
  const ln = clamp01(o.lines ?? 0) * a;
  if (ln > 0) {
    const dir = (o.dir ?? 1) < 0 ? -1 : 1, gl = fade(c, ln);
    for (let i = 0; i < 7; i++) {
      const yy = R(y0 + Hp * (0.1 + 0.8 * (i + 0.5) / 7) + (rnd(i * 3) - 0.5) * 3), L = 36 + rnd(i * 5) * 64, ph = frac(t * 1.6 + rnd(i * 7)), th = i % 2 ? 1 : 2;
      const start = dir > 0 ? x0 - 10 - ph * 60 : x0 + Wp + 10 + ph * 60, al = Math.sin(Math.PI * ph);
      for (let q = 0; q < L; q++) { const X = R(start - dir * q), u = q / L, k = al * Math.pow(Math.sin(Math.PI * u), 0.4) * (1 - 0.5 * u); if (k <= bayer(X, yy)) continue; gl.px(X, yy, u < 0.5 ? C.IV : C.L); if (th > 1) gl.px(X, yy + 1, u < 0.5 ? C.L : C.p7); }
    }
  }
  const ot = Math.max(2, R(S * 0.42 * f)), sd = Math.max(2, R(S * 0.55 * f));
  const lit = mix(col, WHITE, 0.5), top = mix(col, WHITE, 0.22), low = mix(col, C.O, 0.22), hl = mix(col, WHITE, 0.82);
  const X0 = Math.floor(x0 - ot - 1), X1 = Math.ceil(x0 + Wp + ot + sd + 1), Y0 = Math.floor(y0 - ot - 1), Y1 = Math.ceil(y0 + Hp + ot + sd + 1);
  const bit = (X, Y) => B.at(Math.floor((X + 0.5 - x0) / s), Math.floor((Y + 0.5 - y0) / s));
  for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
    if (bit(X, Y)) {
      const v = (Y + 0.5 - y0) / s, rowTop = !bit(X, Y - Math.max(1, R(s * 0.22)));
      g.px(X, Y, rowTop ? hl : v < 1.2 ? lit : v < 3 ? top : v < 5.2 ? col : low); continue;
    }
    let near = false; for (const [dx, dy] of [[ot, 0], [-ot, 0], [0, ot], [0, -ot], [ot, ot], [-ot, ot], [ot, -ot], [-ot, -ot], [R(ot / 2), 0], [-R(ot / 2), 0], [0, R(ot / 2)], [0, -R(ot / 2)]]) if (bit(X + dx, Y + dy)) { near = true; break; }
    if (near) { g.px(X, Y, C.O); continue; }
    let shd = false; for (const [dx, dy] of [[sd, sd], [sd - ot, sd], [sd, sd - ot], [sd + ot, sd], [sd, sd + ot], [sd + ot, sd + ot]]) if (bit(X - dx, Y - dy)) { shd = true; break; }
    if (shd) g.px(X, Y, SHADOW);
  }
  // sparkle burst after the pop
  const e = sm(k, 0.3, 1), sa = Math.sin(Math.PI * e) * a;
  if (sa > 0.02) { const gs = fade(c, sa); for (let i = 0; i < 8; i++) { const ang = (i / 8) * TAU + 0.4, rx = Wp / 2 + 10 + 34 * e, ry = Hp / 2 + 8 + 24 * e, px = R(cx + Math.cos(ang) * rx), py = R(y0 + Hp / 2 + Math.sin(ang) * ry), r = i % 2 ? 2 : 3; for (let q = -r; q <= r; q++) { gs.px(px + q, py, q === 0 ? WHITE : col); gs.px(px, py + q, q === 0 ? WHITE : col); } } }
  return { x: R(cx - (B.w * S) / 2), y: R(y), w: R(B.w * S), h: 7 * S };
}

// ---------------------------------------------------------------- mouse icons (catch counter)
const MI_W = 28, MI_H = 18;
function mouseIconSprite(lit) {
  const m = new Uint8Array(MI_W * MI_H), part = new Uint8Array(MI_W * MI_H);   // part: 1 body, 2 ear, 3 belly, 4 tail, 5 foot
  const set = (x, y, p) => { x = R(x); y = R(y); if (x < 0 || y < 0 || x >= MI_W || y >= MI_H) return; if (!m[y * MI_W + x] || p === 2) { m[y * MI_W + x] = 1; part[y * MI_W + x] = p; } };
  for (let y = 0; y < MI_H; y++) for (let x = 0; x < MI_W; x++) {
    const X = x + 0.5, Y = y + 0.5;
    const body = ((X - 12.5) / 7.6) ** 2 + ((Y - 11) / 5.2) ** 2 <= 1, head = ((X - 19.5) / 4.6) ** 2 + ((Y - 10) / 4.0) ** 2 <= 1;
    const snout = X > 20 && X < 26.5 && Math.abs(Y - 10.6) < (26.5 - X) * 0.55;
    if (body || head || snout) set(x, y, Y > 13.2 && X < 18.5 ? 3 : 1);
  }
  for (let y = 0; y < MI_H; y++) for (let x = 0; x < MI_W; x++) { const d = ((x + 0.5 - 16.2) / 3.4) ** 2 + ((y + 0.5 - 4.6) / 3.6) ** 2; if (d <= 1) set(x, y, d < 0.42 ? 6 : 2); }
  for (let i = 0; i <= 14; i++) { const u = i / 14, x = 5.2 - 4.4 * u, y = 11.5 - 7 * u * u + 1.5 * Math.sin(u * 3); set(x, y, 4); }
  for (const fx of [9, 16]) { set(fx, 16, 5); set(fx + 1, 16, 5); }
  const at = (x, y) => (x < 0 || y < 0 || x >= MI_W || y >= MI_H ? 0 : m[y * MI_W + x]);
  const pal = lit ? { 1: "#FDFEED", 2: "#FDFEED", 3: "#E8D2B8", 4: "#F2B4A8", 5: "#F2B4A8", 6: "#F27A9A" } : { 1: "#33264F", 2: "#33264F", 3: "#2C2146", 4: "#4A3A6A", 5: "#4A3A6A", 6: "#221A38" };
  const out = [];
  for (let y = -1; y <= MI_H; y++) for (let x = -1; x <= MI_W; x++) {
    if (at(x, y)) { let col = pal[part[y * MI_W + x]]; if (lit && part[y * MI_W + x] === 1 && y > 12) col = "#EADFD0"; out.push([x, y, col]); }
    else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) out.push([x, y, lit ? C.O : "#7A62B8"]);
  }
  if (lit) out.push([21, 8, C.O], [21, 9, C.O], [26, 10, "#F27A9A"]); else out.push([21, 8, "#1A1228"], [21, 9, "#1A1228"]);
  return out;
}
const MI = { on: mouseIconSprite(true), off: mouseIconSprite(false) };
/**
 * Row of n small mouse icons (28×18 px each, 32 px apart) starting at top-left (x, y); `filled` (float) of them lit —
 * the next one dissolves in (with a small hop) as filled passes through its fraction. o = { gap = 4 }.
 * Returns { w, h }.
 */
export function mouseIcons(c, x, y, n, filled, a, o = {}) {
  if (a <= 0) return null; const step = MI_W + (o.gap ?? 4), g = fade(c, a);
  for (let i = 0; i < n; i++) {
    const on = clamp01(filled - i), hop = on > 0 && on < 1 ? -R(4 * Math.sin(Math.PI * on)) : 0, X = R(x + i * step), Y = R(y) + hop;
    if (on < 1) { const go = on > 0 ? gate(g, on, 1) : g; for (const [px, py, col] of MI.off) go.px(X + px, Y + py, col); }
    if (on > 0) { const gi = on < 1 ? gate(g, 0, on) : g; for (const [px, py, col] of MI.on) gi.px(X + px, Y + py, col); }
  }
  return { w: n * step - (o.gap ?? 4), h: MI_H };
}

// ---------------------------------------------------------------- digital alarm clock tag
const SEG = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abfgcd" };
function segRects(s) {   // digit box 14×26 at scale s: [x, y, w, h, horizontal]
  const T = 3;
  return { a: [2, 0, 10, T, 1], b: [11, 2, T, 10, 0], c: [11, 14, T, 10, 0], d: [2, 23, 10, T, 1], e: [0, 14, T, 10, 0], f: [0, 2, T, 10, 0], g: [2, 11.5, 10, T, 1] };
}
function seg(g, X, Y, r, s, col, hi) {
  const [x, y, w, h, hor] = r, x0 = R(X + x * s), y0 = R(Y + y * s), W = R(w * s), H = R(h * s);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const ci = hor ? Math.min(i, W - 1 - i) : Math.min(j, H - 1 - j), cj = hor ? Math.abs(j - (H - 1) / 2) : Math.abs(i - (W - 1) / 2);
    if (cj > ci + 0.6) continue;                                   // chamfered (hexagonal) segment ends
    g.px(x0 + i, y0 + j, hi && (hor ? j === 0 : i === 0) ? hi : col);
  }
}
/**
 * Digital alarm-clock tag: dark rounded body, recessed display, red 7-segment LED digits (dim unlit segments, a soft
 * dithered glow), blinking colon, small "AM"/"PM". (x, y) = centre of the top edge. text like "3:00 AM".
 * o = { scale = 1 (digit 14×26 px), colon (0..1 brightness, default 1), glow (0..1, default 1) }. Returns { x, y, w, h }.
 */
export function clockTag(c, x, y, text, a, o = {}) {
  if (a <= 0) return null;
  const s = o.scale ?? 1, colon = clamp01(o.colon ?? 1), glow = clamp01(o.glow ?? 1), g = fade(c, a), LIT = "#FF3B3B", HI = "#FF9C8C", DIM = "#3A0E18";
  const m = String(text).toUpperCase().match(/^([0-9: ]+?)\s*([AP]M)?$/) || [null, String(text), null], digits = m[1].trim(), suf = m[2] || "";
  const DW = 14 * s, GAP = 4 * s, CW = 7 * s;
  let dw = 0; for (const ch of digits) dw += (ch === ":" ? CW : DW) + GAP; dw -= GAP;
  const sufW = suf ? tw(c, suf, 2 * s) + 6 * s : 0, padX = 10 * s, padY = 9 * s, w = R(dw + sufW + padX * 2), h = R(26 * s + padY * 2), X0 = R(x - w / 2), Y0 = R(y);
  // body (with tiny feet), bezel and recessed display
  g.rrect(X0 - 4, Y0 - 4, w + 8, h + 8, C.O, 2); g.rrect(X0 - 3, Y0 - 3, w + 6, h + 6, "#4A3A6A", 2); g.rrect(X0 - 2, Y0 - 2, w + 4, h + 4, "#2A2040", 2);
  g.rect(X0 - 1, Y0 - 2, w + 2, 1, "#6A5A8E");
  g.rect(X0 + 6, Y0 + h + 4, 8, 3, C.O); g.rect(X0 + w - 14, Y0 + h + 4, 8, 3, C.O);
  g.rrect(X0, Y0, w, h, "#07040A", 2); for (let j = 1; j < h - 1; j++) g.rect(X0 + 1, Y0 + j, w - 2, 1, mix("#0E060C", "#160810", j / h));
  // glyph layout
  const lit = []; let cx = X0 + padX; const dy = Y0 + padY;
  for (const ch of digits) {
    if (ch === ":") { lit.push(["colon", cx, dy]); cx += CW + GAP; continue; }
    if (ch === " ") { cx += DW + GAP; continue; }
    const on = SEG[ch] ?? ""; for (const k of "abcdefg") lit.push([on.includes(k) ? "on" : "off", cx, dy, k]); cx += DW + GAP;
  }
  const rects = segRects(s);
  // glow first (soft dithered halo around lit segments)
  if (glow > 0) for (const [kind, gx, gy, k] of lit) {
    if (kind === "off" || (kind === "colon" && colon <= 0)) continue;
    const boxes = kind === "colon" ? [[gx + 2 * s, gy + 7 * s, 3 * s, 3 * s], [gx + 2 * s, gy + 16 * s, 3 * s, 3 * s]] : [[gx + rects[k][0] * s, gy + rects[k][1] * s, rects[k][2] * s, rects[k][3] * s]];
    const kk = 0.45 * glow * (kind === "colon" ? colon : 1);
    for (const [bx, by, bw, bh] of boxes) for (let j = Math.floor(by - 3); j < by + bh + 3; j++) for (let i = Math.floor(bx - 3); i < bx + bw + 3; i++) { const d = Math.hypot(Math.max(bx - i, 0, i - bx - bw), Math.max(by - j, 0, j - by - bh)); if (d > 0 && kk * (1 - d / 3.5) > bayer(i, j)) g.px(i, j, "#7A1424"); }
  }
  for (const [kind, gx, gy, k] of lit) {
    if (kind === "colon") { for (const yy of [7, 16]) { g.rect(R(gx + 2 * s), R(gy + yy * s), R(3 * s), R(3 * s), DIM); if (colon > 0) gate(g, 0, colon).rect(R(gx + 2 * s), R(gy + yy * s), R(3 * s), R(3 * s), LIT); } continue; }
    seg(g, gx, gy, rects[k], s, kind === "on" ? LIT : DIM, kind === "on" ? HI : null);
  }
  if (suf) g.text(MAIN, suf, R(cx + 6 * s - GAP), R(dy + 26 * s - 14 * s), LIT, { scale: 2 * s });
  // glass glint
  g.rect(X0 + 3, Y0 + 2, Math.min(18, w - 6), 1, "#2A1A2A");
  return { x: X0 - 4, y: Y0 - 4, w: w + 8, h: h + 11 };
}

// ---------------------------------------------------------------- sleep Zs
/** Floating "Z z z": three Zs rise from (x, y) up and to the right, growing and fading, in a seamless loop of t
 *  (period 2.4 s). o = { col = C.L, size = 1 (scale), period = 2.4 }. */
export function zzz(c, x, y, t, a, o = {}) {
  if (a <= 0) return; const per = o.period ?? 2.4, sc = o.size ?? 1, col = o.col ?? C.L;
  for (let i = 0; i < 3; i++) {
    const ph = frac(t / per + i / 3), al = a * sm(ph, 0, 0.14) * (1 - sm(ph, 0.62, 1)); if (al <= 0.01) continue;
    const S = (7 + 15 * ph) * sc, th = Math.max(2, S * 0.2), zx = x + (16 * ph + 5 * Math.sin(TAU * ph + i)) * sc, zy = y - 70 * ph * sc - S;
    const pts = [[zx, zy], [zx + S, zy], [zx, zy + S], [zx + S, zy + S]], g = fade(c, al);
    stroke(g, pts, th + 2, C.O); stroke(g, pts, th, col);
    stroke(g, [[zx + th * 0.3, zy - th * 0.1], [zx + S * 0.7, zy - th * 0.1]], 1, mix(col, WHITE, 0.6));
  }
}

// ---------------------------------------------------------------- sound waves
const DIRS = { right: 0, left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2 };
/**
 * Arcs spreading from a sound source at (x, y). k = phase (k and k+1 look the same: three arcs at k, k+⅓, k+⅔ grow
 * and fade). dir: 1 right, -1 left, 0 rings all round, "up" / "down" / "left" / "right", or { angle (rad), spread }.
 * label (optional, e.g. "TWEET", "DING") sits beyond the arcs. o = { col = C.IV, labelCol = C.Y, r = 34 (reach px),
 * scale = 2 (label) }. Returns the label box or null.
 */
export function soundWaves(c, x, y, k, dir, a, label, o = {}) {
  if (a <= 0) return null;
  let ang = 0, spread = 0.8, full = false;
  if (typeof dir === "object" && dir) { ang = dir.angle ?? 0; spread = dir.spread ?? 0.8; }
  else if (typeof dir === "string") ang = DIRS[dir] ?? 0; else if (dir === 0) full = true; else ang = dir < 0 ? Math.PI : 0;
  const reach = o.r ?? 34, col = o.col ?? C.IV, r0 = 5;
  for (let i = 0; i < 3; i++) {
    const ph = frac(k + i / 3), al = a * Math.sin(Math.PI * ph); if (al <= 0.02) continue;
    const rr = r0 + (reach - r0) * ph, sp = full ? Math.PI : spread * (0.75 + 0.25 * ph), th = ph < 0.5 ? 3 : 2, g = fade(c, al), n = Math.max(6, Math.ceil(rr * sp * 2));
    const pts = []; for (let q = 0; q <= n; q++) { const aa = ang - sp + (2 * sp * q) / n; pts.push([x + Math.cos(aa) * rr, y + Math.sin(aa) * rr]); }
    stroke(g, pts, th + 2, C.O); stroke(g, pts, th, col);
  }
  if (!label) return null;
  const s = o.scale ?? 2, w = tw(c, label, s), lx = full ? x - w / 2 : x + Math.cos(ang) * (reach + 10) - w / 2 + Math.cos(ang) * (w / 2 + 2), ly = full ? y - reach - 8 * s - 6 : y + Math.sin(ang) * (reach + 10) - 4 * s + Math.sin(ang) * 8 * s;
  otext(c, label, lx, ly, o.labelCol ?? C.Y, a, s);
  return { x: R(lx), y: R(ly), w, h: 7 * s };
}

// ---------------------------------------------------------------- speed lines
/**
 * Motion streaks behind a running cat inside the band y0..y1: streaks slide from x1 (the cat) toward x0 (behind) and
 * fade out toward x0. If x1 < x0 the cat runs left. Continuous in t. o = { col = C.IV, density = 1, speed = 420 px/s }.
 */
export function speedLines(c, x0, y0, x1, y1, t, a, o = {}) {
  if (a <= 0) return;
  const dir = x1 >= x0 ? 1 : -1, D = Math.max(1, Math.abs(x1 - x0)), ya = Math.min(y0, y1), yb = Math.max(y0, y1), n = Math.max(2, R(((yb - ya) / 5) * (o.density ?? 1))), col = o.col ?? C.IV, sp = o.speed ?? 420, g = fade(c, a);
  const mid = mix(col, C.L, 0.45), under = mix(C.L, C.p5, 0.5);
  for (let i = 0; i < n; i++) {
    const yy = R(ya + ((i + 0.5 + (rnd(i * 3 + 1) - 0.5) * 0.6) * (yb - ya)) / n), L = 22 + rnd(i * 5 + 2) * 64, per = D + L, s = frac((t * sp) / per + rnd(i * 7 + 3)) * per;
    const lead = x1 - dir * s, th = rnd(i * 11) < 0.5 ? 2 : 1;   // enters at the cat (s = 0) and has fully left past x0 when it wraps (s = D + L)
    for (let q = 0; q < L; q++) {
      const X = R(lead + dir * q), u = (x1 - X) * dir; if (u < 0 || u > D) continue;
      const far = u / D; if (far > 0.62 && 1 - (far - 0.62) / 0.38 <= bayer(X, yy)) continue;   // solid, dissolving only near x0
      g.px(X, yy, q > L * 0.55 ? col : mid); if (th > 1) g.px(X, yy + 1, under);
    }
  }
}

// ---------------------------------------------------------------- step icons: HUNT → EAT → WASH → SLEEP
const ICON_PAL = {
  lit: { stick: "#C8945A", stickD: "#7A4E2A", string: "#FDFEED", f1: "#F27A9A", f2: "#E03056", f3: "#FFE2EA", f4: "#B08AE8", bowl: "#E05A44", bowlD: "#9A2E28", bowlL: "#F49A80", kib: "#A8642A", kibL: "#D89A52", fur: "#F4C890", furD: "#D89A5A", bean: "#F27A9A", beanD: "#C84468", drop: "#7FE3F0", dropD: "#3A9AC8", moon: "#F4CA50", moonD: "#C99A2A", moonL: "#FDF0A8", z: "#E0CDF8", out: C.O },
  dim: { stick: "#4A3A6A", stickD: "#33264F", string: "#5A4A80", f1: "#4A3A6A", f2: "#3B2C5C", f3: "#5A4A80", f4: "#433562", bowl: "#4A3A6A", bowlD: "#33264F", bowlL: "#5A4A80", kib: "#3B2C5C", kibL: "#4A3A6A", fur: "#4A3A6A", furD: "#3B2C5C", bean: "#33264F", beanD: "#2A2040", drop: "#4A3A6A", dropD: "#33264F", moon: "#4A3A6A", moonD: "#3B2C5C", moonL: "#5A4A80", z: "#4A3A6A", out: "#1A1228" },
};
function ellFill(g, cx, cy, rx, ry, f) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2; if (d <= 1) { const col = f(x, y, d); if (col) g.px(x, y, col); } } }
/** Outline-then-fill helper: draws `shape(g2, grow)` twice — dark (grown by 1) and coloured. */
function icon(g, X, Y, name, P) {
  const O = P.out;
  if (name === "HUNT") {                       // feather wand: stick, string, a bunch of three feathers
    stroke(g, [[X - 14, Y + 13], [X + 1, Y - 12]], 5, O); stroke(g, [[X - 14, Y + 13], [X + 1, Y - 12]], 3, P.stick); stroke(g, [[X - 13, Y + 13], [X + 0, Y - 10]], 1, P.stickD);
    const str = []; for (let i = 0; i <= 10; i++) { const u = i / 10; str.push([X + 1 + 8 * u, Y - 12 + 11 * u * u - 2 * Math.sin(u * Math.PI)]); } stroke(g, str, 3, O); stroke(g, str, 1, P.string);
    const fx = X + 9, fy = Y - 1, fe = [[0.55, P.f2], [-0.35, P.f4 ?? P.f1], [0.1, P.f1]];
    for (const pass of [0, 1]) for (const [rot, col] of fe) {
      const cx2 = fx + Math.sin(rot) * 7, cy2 = fy + Math.cos(rot) * 7, rx = 2.6 + (pass ? 0 : 1.3), ry = 6.6 + (pass ? 0 : 1.3);
      ellFill(g, cx2, cy2, ry + 1, ry + 1, (x, y) => { const dx = x + 0.5 - cx2, dy = y + 0.5 - cy2, u = dx * Math.cos(rot) - dy * Math.sin(rot), v = dx * Math.sin(rot) + dy * Math.cos(rot); if ((u / rx) ** 2 + (v / ry) ** 2 > 1) return null; if (!pass) return O; return Math.abs(u) < 0.6 ? P.f3 : u < 0 ? mix(col, WHITE, 0.25) : col; });
    }
    ellFill(g, fx, fy, 2.2, 2.2, () => O); ellFill(g, fx, fy, 1.4, 1.4, () => P.moon);
    return;
  }
  if (name === "EAT") {                        // bowl with a kibble mound
    for (let i = 0; i < 9; i++) { const kx = X - 8 + (i % 5) * 4 + (i >= 5 ? 2 : 0), ky = Y - 1 - (i >= 5 ? 3 : 0) - (i % 5 === 2 ? 1 : 0); ellFill(g, kx, ky, 2.8, 2.4, () => O); }
    for (let i = 0; i < 9; i++) { const kx = X - 8 + (i % 5) * 4 + (i >= 5 ? 2 : 0), ky = Y - 1 - (i >= 5 ? 3 : 0) - (i % 5 === 2 ? 1 : 0); ellFill(g, kx, ky, 1.9, 1.5, (x, y) => (y + 0.5 < ky ? P.kibL : P.kib)); }
    const poly = (grow) => [[X - 14 - grow, Y + 1 - grow], [X + 14 + grow, Y + 1 - grow], [X + 9 + grow, Y + 12 + grow], [X - 9 - grow, Y + 12 + grow]];
    g.poly(poly(1), O); g.poly(poly(0), P.bowl); g.rect(X - 13, Y + 1, 26, 2, P.bowlL); g.rect(X - 9, Y + 10, 18, 2, P.bowlD);
    g.rect(X - 4, Y + 5, 2, 2, P.bowlL); g.rect(X + 1, Y + 5, 2, 2, P.bowlL); g.px(X - 1, Y + 7, P.bowlL);   // little paw print
    return;
  }
  if (name === "WASH") {                       // paw with toe beans and a lick drop
    ellFill(g, X - 2, Y + 3, 11.5, 10, () => O); ellFill(g, X - 2, Y + 3, 10.5, 9, (x, y, d) => (y + 0.5 > Y + 7 && d > 0.4 ? P.furD : P.fur));
    ellFill(g, X - 2, Y + 6, 5.5, 4.2, () => P.beanD); ellFill(g, X - 2, Y + 5.6, 4.6, 3.4, () => P.bean);
    for (const [bx, by] of [[-9, -1], [-5, -5], [1, -5], [5, -1]]) { ellFill(g, X + bx, Y + by, 2.4, 2.2, () => P.beanD); ellFill(g, X + bx, Y + by - 0.3, 1.7, 1.5, () => P.bean); }
    const dx = X + 11, dy = Y - 9;
    for (const [grow, f] of [[1, () => O], [0, (x, y) => (x < dx - 0.5 && y < dy + 1 ? WHITE : y > dy + 2 ? P.dropD : P.drop)]]) { ellFill(g, dx, dy + 2, 3.2 + grow, 3.2 + grow, f); for (let j = 0; j < 5 + grow; j++) { const hw = Math.max(0, R((j / 5) * (2.6 + grow))); g.rect(R(dx - hw), R(dy - 4 - grow + j), hw * 2 + 1, 1, grow ? O : P.drop); } }
    return;
  }
  if (name === "SLEEP") {                      // crescent moon and a small z
    const mx = X - 2, my = Y + 1;
    ellFill(g, mx, my, 12, 12, (x, y) => (((x + 0.5 - (mx + 6.5)) / 9.5) ** 2 + ((y + 0.5 - (my - 4.5)) / 9.5) ** 2 <= 1 ? null : O));
    ellFill(g, mx, my, 11, 11, (x, y) => { const q = ((x + 0.5 - (mx + 6.5)) / 10.5) ** 2 + ((y + 0.5 - (my - 4.5)) / 10.5) ** 2; if (q <= 1) return null; return x + 0.5 < mx - 6 && y + 0.5 < my + 2 ? P.moonL : y + 0.5 > my + 6 ? P.moonD : P.moon; });
    const zx = X + 7, zy = Y - 13; stroke(g, [[zx, zy], [zx + 6, zy], [zx, zy + 6], [zx + 6, zy + 6]], 4, O); stroke(g, [[zx, zy], [zx + 6, zy], [zx, zy + 6], [zx + 6, zy + 6]], 2, P.z);
    return;
  }
}
/**
 * Row of pixel icon tiles with labels, centred at cx, tiles' top at y (labels below). items default
 * ["HUNT","EAT","WASH","SLEEP"] (feather wand, bowl, paw with a lick drop, moon; any other label gets a blank tile).
 * lit = float index: item i turns on as lit passes i−1 → i and stays on; the current one (|lit − i| < 1) glows and lifts.
 * Use lit = −1 for all off. Arrows between tiles light up with the next item.
 * o = { step = 84 (px between centres), cross: { i, k } (red cross over item i, drawn stroke by stroke as k goes 0 → 1) }.
 * Returns { x, y, w, h, centers: [x…] }.
 */
export function stepIcons(c, cx, y, items = ["HUNT", "EAT", "WASH", "SLEEP"], lit = -1, a = 1, o = {}) {
  if (a <= 0) return null;
  const n = items.length, step = o.step ?? 84, T = 48, g = fade(c, a), Y = R(y), centers = [];
  for (let i = 0; i < n; i++) centers.push(R(cx + (i - (n - 1) / 2) * step));
  // arrows
  for (let i = 0; i < n - 1; i++) {
    const on = clamp01(lit - i), ax = R((centers[i] + centers[i + 1]) / 2), ay = Y + T / 2;
    for (const [col, gg] of [[C.p5, on < 1 ? gate(g, on, 1) : null], [C.Y, on > 0 ? gate(g, 0, on) : null]]) if (gg) for (let j = -4; j <= 4; j++) { const xx = ax - 2 + (4 - Math.abs(j)); gg.rect(xx - 1, ay + j, 3, 1, col); }
  }
  for (let i = 0; i < n; i++) {
    const on = clamp01(lit - i + 1), glow = clamp01(1 - Math.abs(lit - i)), lift = R(-3 * glow), x0 = centers[i] - T / 2, y0 = Y + lift;
    if (glow > 0) { const gk = glow * 0.55; for (let j = y0 - 6; j < y0 + T + 6; j++) for (let q = x0 - 6; q < x0 + T + 6; q++) { const d = Math.hypot(Math.max(x0 - q, 0, q - x0 - T + 1), Math.max(y0 - j, 0, j - y0 - T + 1)); if (d > 0 && d <= 6 && gk * (1 - d / 6) > bayer(q, j)) g.px(q, j, mix(c.get(q, j), C.Y, 0.55)); } }
    panel(c, x0, y0, T, T, a, C.p5); if (on > 0) panel(gate(c, 0, on), x0, y0, T, T, a, C.Y);
    const ic = items[i].toUpperCase();
    if (on < 1) icon(on > 0 ? gate(g, on, 1) : g, centers[i], y0 + T / 2, ic, ICON_PAL.dim);
    if (on > 0) icon(on < 1 ? gate(g, 0, on) : g, centers[i], y0 + T / 2, ic, ICON_PAL.lit);
    const lw = tw(c, ic, 2), lx = centers[i] - lw / 2, ly = Y + T + 8;
    otext(c, ic, lx, ly, C.p7, a * (1 - on), 2); otext(c, ic, lx, ly, glow > 0.5 ? C.Y : C.IV, a * on, 2);
  }
  // red cross over one item, stroke by stroke
  const cr = o.cross;
  if (cr && cr.k > 0 && cr.i >= 0 && cr.i < n) {
    const X = centers[cr.i], m = T / 2 + 6, k1 = clamp01(cr.k / 0.5), k2 = clamp01((cr.k - 0.5) / 0.5), Yc = Y + T / 2;
    const s1 = [[X - m, Yc - m], [X - m + 2 * m * k1, Yc - m + 2 * m * k1]], s2 = [[X + m, Yc - m], [X + m - 2 * m * k2, Yc - m + 2 * m * k2]];
    if (k1 > 0) { stroke(g, s1, 9, C.O); } if (k2 > 0) stroke(g, s2, 9, C.O);
    if (k1 > 0) { stroke(g, s1, 6, RED); stroke(g, [[s1[0][0] + 1, s1[0][1] - 1], [s1[1][0] + 1, s1[1][1] - 1]], 1, "#FF9AA4"); }
    if (k2 > 0) { stroke(g, s2, 6, RED); stroke(g, [[s2[0][0] - 1, s2[0][1] - 1], [s2[1][0] - 1, s2[1][1] - 1]], 1, "#FF9AA4"); }
  }
  const x0 = centers[0] - T / 2; return { x: x0, y: Y, w: centers[n - 1] + T / 2 - x0, h: T + 8 + 16, centers };
}

// ---------------------------------------------------------------- rewind glyph
/** "◀◀" rewind glyph centred at cx, top y: two ivory triangles with a dark outline and a drop shadow.
 *  o = { scale = 1 (≈ 44×24 px), col = C.IV, label (optional text under it, e.g. "REWIND") }. Returns { x, y, w, h }. */
export function rewindIcon(c, cx, y, a, o = {}) {
  if (a <= 0) return null;
  const s = o.scale ?? 1, col = o.col ?? C.IV, g = fade(c, a), tw1 = 20 * s, th = 24 * s, gap = 2 * s, W = tw1 * 2 + gap, X0 = cx - W / 2, Y0 = y;
  const tri = (x, dx, dy, grow) => [[x - grow + dx, Y0 + th / 2 + dy], [x + tw1 + grow * 0.6 + dx, Y0 - grow + dy], [x + tw1 + grow * 0.6 + dx, Y0 + th + grow + dy]];
  const sd = Math.max(2, R(3 * s));
  for (const x of [X0, X0 + tw1 + gap]) g.poly(tri(x, sd, sd, 2), SHADOW);
  for (const x of [X0, X0 + tw1 + gap]) g.poly(tri(x, 0, 0, 2), C.O);
  for (const x of [X0, X0 + tw1 + gap]) { g.poly(tri(x, 0, 0, 0), col); g.poly([[x + tw1 * 0.55, Y0 + th * 0.3], [x + tw1, Y0 + th * 0.06], [x + tw1, Y0 + th * 0.3]], mix(col, WHITE, 0.6)); g.poly([[x + 2 * s, Y0 + th / 2], [x + tw1, Y0 + th - 3 * s], [x + tw1, Y0 + th]], mix(col, C.p7, 0.45)); }
  if (o.label) { const lw = tw(c, o.label, 2); otext(c, o.label, cx - lw / 2, Y0 + th + 8, col, a, 2); }
  return { x: R(X0), y: R(Y0), w: R(W), h: R(th + (o.label ? 24 : 0)) };
}
