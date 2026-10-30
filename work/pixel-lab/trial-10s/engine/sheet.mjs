// Labelled contact sheet of stills: node engine/sheet.mjs <run> <out.jpg> <t1,t2,…> [cols]
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const HERE = fileURLToPath(new URL("..", import.meta.url));
const [run, out, list, cols = "4"] = process.argv.slice(2), dir = HERE + "runs/" + run + "/stills/", ts = list.split(",").map(Number), C = Number(cols), w = 270, h = 480;
const tiles = [];
for (const [i, t] of ts.entries()) { const f = dir + `t${t.toFixed(2)}.png`; if (!fs.existsSync(f)) continue;
  const img = await sharp(f).resize(w, h, { kernel: "nearest" }).png().toBuffer(), label = Buffer.from(`<svg width="${w}" height="22"><rect width="${w}" height="22" fill="#000" opacity="0.65"/><text x="5" y="16" font-family="Menlo" font-size="14" fill="#fff">${t.toFixed(2)} s</text></svg>`);
  tiles.push({ input: await sharp(img).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer(), left: (i % C) * w, top: Math.floor(i / C) * h }); }
await sharp({ create: { width: C * w, height: Math.ceil(ts.length / C) * h, channels: 3, background: "#000" } }).composite(tiles).jpeg({ quality: 86 }).toFile(out);
console.log(out);
