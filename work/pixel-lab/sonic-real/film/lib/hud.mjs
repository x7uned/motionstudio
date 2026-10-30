// sonic-real: frozen copy of pacman-real/film/lib/hud.mjs (+ glyphs ≥ →). pacman-real: frozen copy of mario-real/film2/lib/hud.mjs (+ glyphs ( ) and lowercase c p x for «cm», «px»). steve-real HUD kit (new, 2026-10-28; film2: the comma got a tail below the baseline so «44,000» never reads as «44.000»): plates, outlined labels, a true odometer (a digit rolls only while the one below
// passes 9 → 0, so numbers never jump), a pixel fist and the small «?» silhouette. Fonts: MAIN / TINY of raster.mjs.
import { MAIN as MAIN0, TINY, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";

export const MAIN = { ...MAIN0, glyphs: { ...MAIN0.glyphs,
  "≈": [".....", ".##.#", "#.##.", ".....", ".##.#", "#.##.", "....."],
  "×": [".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "....."],
  "ₘ": [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#...#"],
  "ₛ": [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
  "ₜ": [".#...", ".#...", "####.", ".#...", ".#...", ".#..#", "..##."],
  "ₖ": ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  "ₕ": ["#....", "#....", "#.##.", "##..#", "#...#", "#...#", "#...#"],
  ",": ["...", "...", "...", "...", "...", ".##", ".##", "..#", ".#.", "#.."],
  "↑": ["..#..", ".###.", "#.#.#", "..#..", "..#..", "..#..", "..#.."],
  "↓": ["..#..", "..#..", "..#..", "..#..", "#.#.#", ".###.", "..#.."],
  "(": ["..#..", ".#...", "#....", "#....", "#....", ".#...", "..#.."],
  ")": ["..#..", "...#.", "....#", "....#", "....#", "...#.", "..#.."],
  "ᶜ": [".....", ".....", ".###.", "#....", "#....", "#....", ".###."],
  "ᵖ": [".....", ".....", "####.", "#...#", "#...#", "####.", "#...."],
  "ˣ": [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  "≥": ["#....", ".#...", "..#..", ".#...", "#....", ".....", "#####"],
  "→": [".....", "..#..", "...#.", "#####", "...#.", "..#..", "....."],
  "½": ["#....", "#..#.", "#.#..", "..###", ".#..#", "#..#.", "...##"],
} };
export { TINY };
/** lowercase unit letters (m s t k h) → our caseless lowercase glyphs (raster text upper-cases everything else) */
const LC = { m: "ₘ", s: "ₛ", t: "ₜ", k: "ₖ", h: "ₕ", c: "ᶜ", p: "ᵖ", x: "ˣ" };
export const lc = (str) => String(str).replace(/[mstkhcpx]/g, (ch) => LC[ch]);
export const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
export const C = { O: "#0B0812", CARD: "#16112A", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", G: "#7FE3A0", B: "#7FE3F0", R: "#FF6A5A" };

/** a rounded plate with a coloured edge; returns its rect */
export function plate(c, x, y, w, h, a, edge = C.Y, bg = C.CARD) {
  if (a <= 0) return null; const g = fade(c, a);
  g.rrect(x - 1, y - 1, w + 2, h + 2, C.O, 2); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 2, y + 2, w - 4, h - 4, bg, 1);
  g.rect(x + 4, y + 2, w - 8, 1, mix(bg, "#FFFFFF", 0.12));
  return { x, y, w, h };
}
/** text with a dark outline, centred at cx */
export function label(c, txt, cx, y, a, col = C.IV, sc = 2, font = MAIN) {
  if (a <= 0) return 0; txt = lc(txt); const g = fade(c, a), w = c.measure(font, txt, { scale: sc }), x = R(cx - w / 2);
  for (const [dx, dy] of [[1, 1], [-1, 0], [1, 0], [0, -1], [0, 1], [2, 2]]) g.text(font, txt, x + dx, R(y) + dy, C.O, { scale: sc });
  g.text(font, txt, x, R(y), col, { scale: sc }); return w;
}
/** a pill: plate sized to the text, centred at cx */
export function pill(c, txt, cx, y, a, o = {}) {
  if (a <= 0) return null; txt = lc(txt); const sc = o.scale ?? 2, w = c.measure(MAIN, txt, { scale: sc }) + 18 + (o.padL ?? 0), h = 7 * sc + 10, x = R(cx - w / 2);
  const p = plate(c, x, R(y), w, h, a, o.edge ?? C.Y, o.bg); fade(c, a).text(MAIN, txt, x + 9 + (o.padL ?? 0), R(y) + 5, o.col ?? C.IV, { scale: sc }); return p;
}

/** formatted width of a number string (digits, commas, dot) */
export const fmt = (v, dec = 0) => { const s = v.toFixed(dec), [i, d] = s.split("."); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? "." + d : ""); };
/**
 * Odometer: draws value (≥ 0) with `digits` integer digits (commas every 3) at (x, y), scale sc; prefix/suffix in plain text.
 * Leading zeros fade away. Returns the drawn width.
 */
export function odo(c, value, x, y, a, o = {}) {
  if (a <= 0) return 0;
  const sc = o.scale ?? 2, g = fade(c, a), col = o.col ?? C.IV, dh = 7 * sc + 2, cw = c.measure(MAIN, "0", { scale: sc }) + sc, digits = o.digits ?? String(Math.floor(o.final ?? value)).length;
  let X = x; if (o.prefix) { g.text(MAIN, lc(o.prefix), X, y, col, { scale: sc }); X += c.measure(MAIN, o.prefix, { scale: sc }) + sc; }
  const v = Math.max(0, value);
  for (let i = digits - 1; i >= 0; i--) {
    const wv = v / Math.pow(10, i), d = Math.floor(wv) % 10, f = wv - Math.floor(wv), ff = i === 0 ? (o.smoothOnes ? f : clamp01((f - 0.8) / 0.2)) : clamp01((f - 0.9) / 0.1);
    const lead = i > 0 && v < Math.pow(10, i) - 0.0001 ? 1 - clamp01((v - Math.pow(10, i) * 0.9) / (Math.pow(10, i) * 0.1)) : 0;
    const da = 1 - lead; if (da > 0) {
      const oy = R(ff * dh), sub = Object.create(g);
      sub.px = (XX, YY, cc) => { if (YY >= y - 1 && YY < y + 7 * sc + 1 && (da >= 1 || da > bayer(XX, YY))) g.px(XX, YY, cc); };
      sub.text(MAIN, String(d), X, y - oy, col, { scale: sc }); sub.text(MAIN, String((d + 1) % 10), X, y + dh - oy, col, { scale: sc });
      X += cw; if (i % 3 === 0 && i > 0) { if (da > 0.5) g.text(MAIN, ",", X - 1, y, col, { scale: sc }); X += c.measure(MAIN, ",", { scale: sc }) + sc; }
    }
  }
  if (o.suffix) { X += sc; g.text(MAIN, lc(o.suffix), X, y, o.suffixCol ?? col, { scale: sc }); X += c.measure(MAIN, o.suffix, { scale: sc }); }
  return X - x;
}
/** width the odometer will take for the final value (to centre it) */
export function odoW(c, final, o = {}) { const sc = o.scale ?? 2, digits = String(Math.floor(final)).length, cw = c.measure(MAIN, "0", { scale: sc }) + sc; let w = digits * cw + Math.floor((digits - 1) / 3) * (c.measure(MAIN, ",", { scale: sc }) + sc); if (o.prefix) w += c.measure(MAIN, o.prefix, { scale: sc }) + sc; if (o.suffix) w += sc + c.measure(MAIN, lc(o.suffix), { scale: sc }); return w; }

/** pixel fist (12×10 cells), knuckles to the right */
export function fist(c, x, y, s = 2, a = 1) {
  const rows = ["...XXXXXX...", "..XWWXWWXX..", ".XWWWXWWXWX.", ".XWWWXWWXWWX", "XWWWWWWWWWWX", "XWWWWWWWWWWX", "XWWWWWWWWWX.", ".XWWWWWWWWX.", "..XXWWWWWX..", "....XXXXX..."];
  const g = fade(c, a); rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== ".") g.rect(x + i * s, y + j * s, s, s, ch === "X" ? C.O : j < 4 ? "#F2C7A0" : "#D9A27C"); }));
}
/** a plain mystery silhouette (round head, body) with a «?» — no character art */
export function mystery(c, x, y, s, a) {
  const g = fade(c, a), D = "#2A2240";
  g.poly([[x - 9 * s, y + 18 * s], [x - 7 * s, y + 4 * s], [x + 7 * s, y + 4 * s], [x + 9 * s, y + 18 * s]], D);
  for (let j = -6 * s; j <= 6 * s; j++) for (let i = -6 * s; i <= 6 * s; i++) if (i * i + j * j <= 36 * s * s) g.px(x + i, y - 3 * s + j, D);
  label(c, "?", x, y - 6 * s, a, C.Y, s + 1);
}
