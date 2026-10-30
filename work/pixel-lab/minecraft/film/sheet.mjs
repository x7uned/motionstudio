// contact sheet of stills: node sheet.mjs out.jpg t1,t2,...  (reads stills/tX.XX.png)
import sharp from "sharp";
const [out, list] = process.argv.slice(2), ts = list.split(","), W = 270, H = 480, cols = Math.min(6, ts.length), rows = Math.ceil(ts.length / cols);
const ims = await Promise.all(ts.map((t) => sharp(`stills/t${Number(t).toFixed(2)}.png`).resize(W, H).toBuffer()));
await sharp({ create: { width: W * cols, height: H * rows, channels: 3, background: "#000" } }).composite(ims.map((b, i) => ({ input: b, left: (i % cols) * W, top: Math.floor(i / cols) * H }))).jpeg({ quality: 85 }).toFile(out);
