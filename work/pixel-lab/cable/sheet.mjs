// contact sheet of stills: node sheet.mjs out.png t1,t2,... (reads stills/tX.XX.png), 4 per row at 270×480
import sharp from "sharp";
const [out, list] = process.argv.slice(2), ts = list.split(",").map(Number), W = 270, H = 480, cols = Math.min(4, ts.length), rows = Math.ceil(ts.length / cols);
const comps = await Promise.all(ts.map(async (t, i) => ({ input: await sharp(`stills/t${t.toFixed(2)}.png`).resize(W, H).png().toBuffer(), left: (i % cols) * (W + 6), top: Math.floor(i / cols) * (H + 6) })));
await sharp({ create: { width: cols * (W + 6) - 6, height: rows * (H + 6) - 6, channels: 3, background: "#222" } }).composite(comps).png().toFile(out);
console.log(out);
