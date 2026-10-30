// Check sheet for cyrillic.mjs: node renderer/pixel/cyrillic-preview.mjs → cyrillic-preview.png (540×960 grid ×2).
import { fileURLToPath } from "node:url";
import { MAIN, TINY } from "./raster.mjs";
import { withCyrillic, lcRu, RU_CAPS, CanvasRu } from "./cyrillic.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const M = withCyrillic(MAIN), T = withCyrillic(TINY, "tiny");
for (const ch of RU_CAPS) { if (!M.glyphs[ch]) throw new Error("MAIN missing " + ch); if (!T.glyphs[ch]) throw new Error("TINY missing " + ch); }

const BG = "#0B0812", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", DIM = "#6E6390", B = "#7FE3F0";
const c = new CanvasRu(540, 960, BG);
const R = Math.round;
const centre = (font, s, y, col, sc, o = {}) => c.text(font, s, R(270 - c.measure(font, s, { scale: sc }) / 2), y, col, { scale: sc, ...o });
const outlined = (font, s, y, col, sc) => {
  const x = R(270 - c.measure(font, s, { scale: sc }) / 2);
  for (const [dx, dy] of [[1, 1], [-1, 0], [1, 0], [0, -1], [0, 1], [2, 2]]) c.text(font, s, x + dx, y + dy, BG, { scale: sc });
  c.text(font, s, x, y, col, { scale: sc });
};

let y = 20;
c.text(TINY, "PIXEL FONT · CYRILLIC V1", 20, y, DIM, { scale: 2 }); y += 24;

// MAIN 5×7, every capital, big
c.text(T, "ОСНОВНОЙ 5 НА 7", 20, y, L, { scale: 2 }); y += 26;
const rows = ["АБВГДЕЁЖЗИЙ", "КЛМНОПРСТУФ", "ХЦЧШЩЪЫЬЭЮЯ"];
for (const r of rows) { c.text(M, r.split("").join(" "), 20, y, IV, { scale: 3 }); y += 38; }
y += 4;

// TINY 3×5, every capital
c.text(T, "МЕЛКИЙ 3 НА 5 · ЙОД · ЁЖ", 20, y, L, { scale: 2 }); y += 28;
for (const r of rows) { c.text(T, r.split("").join(" "), 20, y, IV, { scale: 4 }); y += 36; }
y += 6;

// English vs Russian in the same style
c.text(T, "КАК В РОЛИКЕ", 20, y, L, { scale: 2 }); y += 20;
outlined(M, "SUPERPOWER", y, Y, 3); y += 30;
outlined(M, "СУПЕРСИЛА", y, Y, 3); y += 40;
outlined(M, "СЛЕДУЮЩИЙ: PAC-MAN", y, IV, 2); y += 28;
outlined(M, "ЁЖИК · ЙОД · ЦАПЛЯ · ЩУКА · ДОМ", y + 4, IV, 2); y += 32;
outlined(M, "ЗЕМЛЯ 1×   ИГРА 10×", y, B, 2); y += 30;
outlined(M, lcRu("52 км/ч"), y, Y, 3); y += 30;
outlined(M, lcRu("11 м   3 с"), y, IV, 3); y += 36;

// cover / caption style lines
centre(M, "КАК ВЫСОКО", y, IV, 4); y += 38;
centre(M, "ПРЫГНЕТ МАРИО?", y, Y, 4); y += 46;
// karaoke caption look (scale 3, yellow word being spoken)
{ const words = ["ЕГО", "НАСТОЯЩАЯ", "СУПЕРСИЛА"], sc = 3, sp = c.measure(M, " ", { scale: sc }) + 3;
  const w = words.reduce((a, t) => a + c.measure(M, t, { scale: sc }), 0) + sp * (words.length - 1); let x = R(270 - w / 2);
  words.forEach((t, i) => { c.text(M, t, x + 1, y + 1, BG, { scale: sc }); c.text(M, t, x, y, i === 1 ? Y : IV, { scale: sc }); x += c.measure(M, t, { scale: sc }) + sp; }); }
y += 40;
centre(M, "ПОДПИСАТЬСЯ", y, IV, 3); y += 30;
centre(M, "ПОДПИСКА ✓", y, B, 3); y += 34;
centre(T, "ЖЁСТКИЙ ПОДЪЁМ · ЩУКА · ЭХО · ЮЛА · ЦИФРЫ 0123456789", y, DIM, 2); y += 18;
centre(T, "ВЫСОКИЙ ПРЫЖОК, ФИЗИКА, ЧАСЫ, ШАГ", y, DIM, 2);

await c.save(HERE + "cyrillic-full.tmp.png", 2);
const sharp = (await import("sharp")).default, fs = await import("node:fs");
await sharp(HERE + "cyrillic-full.tmp.png").extract({ left: 0, top: 0, width: 1080, height: 1600 }).toFile(HERE + "cyrillic-preview.png");
fs.unlinkSync(HERE + "cyrillic-full.tmp.png");
console.log("ok, last y", y);
