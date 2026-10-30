// Contact sheet of rendered stills: node sheet.mjs out.jpg 0,1.8,... (reads stills/tX.XX.png), labelled with seconds.
import sharp from "sharp";
const [out, list, colsArg] = process.argv.slice(2), ts = list.split(",").map(Number), cols = Number(colsArg || 6), w = 270, h = 480, rows = Math.ceil(ts.length / cols);
const tiles = await Promise.all(ts.map(async (t, i) => {
  const img = await sharp(`stills/t${t.toFixed(2)}.png`).resize(w, h).png().toBuffer();
  const label = Buffer.from(`<svg width="${w}" height="26"><rect width="${w}" height="26" fill="#000" opacity="0.6"/><text x="8" y="19" font-family="Menlo" font-size="16" fill="#fff">${t.toFixed(2)} s</text></svg>`);
  return { input: await sharp(img).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer(), left: (i % cols) * w, top: Math.floor(i / cols) * h };
}));
await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: "#000" } }).composite(tiles).jpeg({ quality: 88 }).toFile(out);
console.log("sheet", out);
