import sharp from "sharp"; import fs from "node:fs";
const dir = process.argv[2], out = process.argv[3], cols = Number(process.argv[4] ?? 6), files = fs.readdirSync(dir).filter(f => f.endsWith(".png")).sort((a, b) => parseFloat(a.slice(1)) - parseFloat(b.slice(1)));
const w = 270, h = 480, rows = Math.ceil(files.length / cols);
const tiles = await Promise.all(files.map(f => sharp(dir + "/" + f).resize(w, h).toBuffer()));
await sharp({ create: { width: cols * (w + 6), height: rows * (h + 6), channels: 3, background: "#333" } }).composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * (w + 6), top: Math.floor(i / cols) * (h + 6) }))).jpeg({ quality: 82 }).toFile(out);
console.log(files.join(" "));
