// Cyrillic for our pixel fonts · v1 (2026-10-29). Same style as MAIN (5×7) and TINY (3×5) in raster.mjs:
// square pixels, no anti-aliasing, 1 px strokes. raster.mjs stays unchanged, so old films render as before;
// a Russian film builds its fonts with withCyrillic(MAIN) / withCyrillic(TINY, "tiny").
// Letters that look the same as Latin (А В Е К М Н О Р С Т Х) reuse the Latin glyph.
// Text is drawn upper-case; lower-case unit letters (км/ч, м, с) go through lcRu() to their own glyphs.
// Letters keep their full size: the mark of Й and Ё sits ABOVE the cap line (glyph.up rows), the tails of
// Д Ц Щ go BELOW the baseline (extra rows). Draw Russian text on CanvasRu, which knows glyph.up.
import { Canvas } from "./raster.mjs";
const G = (s) => s.trim().split(/\s+/);
/** a glyph whose first `up` rows are drawn above the cap line */
const GU = (up, s) => Object.assign(G(s), { up });

const SAME = { А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X" };

export const CYR_MAIN = {
  Б: G("##### #.... #.... ####. #...# #...# ####."),
  Г: G("##### #.... #.... #.... #.... #.... #...."),
  Д: G(".###. .#.#. .#.#. .#.#. .#.#. .#.#. ##### #...#"),
  Ё: GU(2, ".#.#. ..... ##### #.... #.... ####. #.... #.... #####"),
  Ж: G("#.#.# #.#.# .###. ..#.. .###. #.#.# #.#.#"),
  З: G(".###. #...# ....# ..##. ....# #...# .###."),
  И: G("#...# #...# #..## #.#.# ##..# #...# #...#"),
  Й: GU(2, ".###. ..... #...# #...# #..## #.#.# ##..# #...# #...#"),
  Л: G("..### .#..# .#..# .#..# .#..# .#..# #...#"),
  П: G("##### #...# #...# #...# #...# #...# #...#"),
  У: G("#...# #...# #...# .#### ....# #...# .###."),
  Ф: G("..#.. .###. #.#.# #.#.# #.#.# .###. ..#.."),
  Ц: G("#..#. #..#. #..#. #..#. #..#. #..#. ##### ....#"),
  Ч: G("#...# #...# #...# .#### ....# ....# ....#"),
  Ш: G("#.#.# #.#.# #.#.# #.#.# #.#.# #.#.# #####"),
  Щ: G("#.#.#. #.#.#. #.#.#. #.#.#. #.#.#. #.#.#. ###### .....#"),
  Ъ: G("##... .#... .#... .###. .#..# .#..# .###."),
  Ы: G("#...# #...# #...# ###.# #.#.# #.#.# ###.#"),
  Ь: G("#.... #.... #.... ####. #...# #...# ####."),
  Э: G(".###. #...# ....# ..### ....# #...# .###."),
  Ю: G("#..#. #.#.# #.#.# ###.# #.#.# #.#.# #..#."),
  Я: G(".#### #...# #...# .#### ..#.# .#..# #...#"),
  // lower-case unit letters (x-height 5, sit on the baseline), reached through lcRu()
  "\uE101": G(".... .... #..# #.#. ##.. #.#. #..#"), // к
  "\uE102": G("..... ..... #...# ##.## #.#.# #...# #...#"), // м
  "\uE103": G("..... ..... .###. #.... #.... #.... .###."), // с
  "\uE104": G(".... .... #..# #..# .### ...# ...#"), // ч
  "\uE105": G("..... ..... .##.. ...#. .###. #..#. .###."), // а (for «ч», «мин» style units if needed)
};

export const CYR_TINY = {
  Б: G("### #.. ##. #.# ##."),
  Г: G("### #.. #.. #.. #.."),
  Д: G(".### .#.# .#.# .#.# #### #..#"),
  Ё: GU(2, "#.# ... ### #.. ##. #.. ###"),
  Ж: G("#.#.# #.#.# .###. #.#.# #.#.#"),
  З: G("##. ..# .#. ..# ##."),
  И: G("#..# #..# #.## ##.# #..#"),
  Й: GU(2, ".##. .... #..# #..# #.## ##.# #..#"),
  Л: G(".## #.# #.# #.# #.#"),
  П: G("### #.# #.# #.# #.#"),
  У: G("#.# #.# .## ..# ##."),
  Ф: G("..#.. .###. #.#.# .###. ..#.."),
  Ц: G("#.#. #.#. #.#. #.#. #### ...#"),
  Ч: G("#.# #.# .## ..# ..#"),
  Ш: G("#.#.# #.#.# #.#.# #.#.# #####"),
  Щ: G("#.#.#. #.#.#. #.#.#. #.#.#. ###### .....#"),
  Ъ: G("##.. .#.. .##. .#.# .##."),
  Ы: G("#...# #...# ##..# #.#.# ##..#"),
  Ь: G("#.. #.. ##. #.# ##."),
  Э: G("##. ..# .## ..# ##."),
  Ю: G("#..#. #.#.# ###.# #.#.# #..#."),
  Я: G(".## #.# .## #.# #.#"),
  "\uE101": G("... #.# ##. #.# #.#"),       // к
  "\uE102": G("..... #...# ##.## #.#.# #...#"), // м
  "\uE103": G("... .## #.. #.. .##"),       // с
  "\uE104": G("... #.# #.# .## ..#"),       // ч
  "\uE105": G("... .#. ..# ### .##"),       // а
};

/** A copy of a raster.mjs font with Cyrillic added (MAIN → kind "main", TINY → "tiny"). */
export function withCyrillic(font, kind = "main") {
  const add = kind === "tiny" ? CYR_TINY : CYR_MAIN, glyphs = { ...font.glyphs, ...add };
  for (const [ru, lat] of Object.entries(SAME)) glyphs[ru] = font.glyphs[lat];
  return { ...font, glyphs };
}

/** lower-case unit letters stay lower-case on screen: lcRu("52 км/ч") draws «52 км/ч», not «52 КМ/Ч». */
const LC = { к: "\uE101", м: "\uE102", с: "\uE103", ч: "\uE104", а: "\uE105" };
export const lcRu = (str) => String(str).replace(/[кмсча]/g, (ch) => LC[ch]);

/** Canvas for Russian films: same as raster.mjs Canvas, plus glyph.up (marks above the cap line).
 *  fade(c, a) views inherit it. Old films keep using Canvas and render exactly as before. */
export class CanvasRu extends Canvas {
  text(font, str, x, y, c, o = {}) {
    const s = o.scale ?? 1, sp = o.spacing ?? 1;
    if (o.shadow) { const d = o.shadowOffset ?? s; this.text(font, str, x + d, y + d, o.shadow, { ...o, shadow: null, colorAt: null }); }
    let cx = x;
    for (const ch of str.toUpperCase()) {
      if (ch === " ") { cx += (font.space + sp) * s; continue; }
      const g = font.glyphs[ch] ?? font.glyphs["?"], w = g[0].length, up = g.up ?? 0;
      const col = typeof c === "function" ? c(cx, ch) : c;
      g.forEach((row, j) => [...row].forEach((p, i) => {
        if (p !== "#") return;
        const gy = y + (j - up) * s;
        if (o.colorAt) { for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) { const X = cx + i * s + a, Yy = gy + b, cc = o.colorAt(X, Yy); if (cc) this.px(X, Yy, cc); } return; }
        this.rect(cx + i * s, gy, s, s, col);
        if (o.bold) this.rect(cx + (i + 1) * s, gy, s, s, col);
      }));
      cx += (w + sp + (o.bold ? 1 : 0)) * s;
    }
    return cx - x - sp * s;
  }
}

/** Every Cyrillic capital, for checks: all must have a glyph in withCyrillic(font). */
export const RU_CAPS = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
