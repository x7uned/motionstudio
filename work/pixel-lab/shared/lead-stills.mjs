// Lead's own stills (kept apart from the builders' stills/): node lead-stills.mjs <film dir> <label> 1.2,3.4 [cols]
// → <film>/dev/lead-<label>.jpg contact sheet (270×480 tiles).
import sharp from "sharp";
import path from "node:path";
const [dir, label, list, colsArg] = process.argv.slice(2), ts = list.split(",").map(Number), cols = Number(colsArg || 4);
const { frame, toFull } = await import(path.resolve(dir, "render.mjs"));
const w = 270, h = 480, rows = Math.ceil(ts.length / cols), tiles = [];
for (const [i, t] of ts.entries()) {
  const img = await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).resize(w, h).png().toBuffer();
  const lab = Buffer.from(`<svg width="${w}" height="26"><rect width="${w}" height="26" fill="#000" opacity="0.6"/><text x="8" y="19" font-family="Menlo" font-size="16" fill="#fff">${t.toFixed(2)} s</text></svg>`);
  tiles.push({ input: await sharp(img).composite([{ input: lab, top: 0, left: 0 }]).png().toBuffer(), left: (i % cols) * w, top: Math.floor(i / cols) * h });
}
const out = path.resolve(dir, `dev/lead-${label}.jpg`);
await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: "#000" } }).composite(tiles).jpeg({ quality: 88 }).toFile(out);
console.log(out);
