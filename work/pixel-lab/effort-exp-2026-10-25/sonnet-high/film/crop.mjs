// node crop.mjs <still.png> <out.png> x y w h  (1080×1920 pixels)
import sharp from "sharp";
const [i, o, x, y, w, h] = process.argv.slice(2);
await sharp(i).extract({ left: +x, top: +y, width: +w, height: +h }).toFile(o);
