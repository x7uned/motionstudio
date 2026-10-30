// Debug helper for the watercolor style lab: render exact frame numbers with browser logs.
// Usage: node --import tsx work/style-lab/watercolor/render-frames.ts 15,16,17 [outSubdir]
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {bundle} from "@remotion/bundler";
import {renderStill, selectComposition} from "@remotion/renderer";
import {CHROME} from "../../../src/lib/provider";

const ROOT = process.cwd();
async function main() {
  const frames = process.argv[2].split(",").map(Number);
  const sub = process.argv[3] ?? "dbg";
  const out = path.join(ROOT, "work", "style-lab", "watercolor", sub);
  await fs.mkdir(out, {recursive: true});
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "renderer", "style-lab", "watercolor", "index.tsx"),
    outDir: path.join(ROOT, ".runtime", "style-lab-bundles", "watercolor"),
  });
  const chromiumOptions = {gl: "angle" as const};
  const composition = await selectComposition({serveUrl, id: "StyleLab", inputProps: {}, browserExecutable: CHROME, chromiumOptions});
  const files: string[] = [];
  for (const frame of frames) {
    const file = path.join(out, `f-${String(frame).padStart(3, "0")}.png`);
    const t0 = Date.now();
    await renderStill({
      composition, serveUrl, inputProps: {}, frame, output: file, browserExecutable: CHROME, chromiumOptions,
      onBrowserLog: (l) => { if (!/VERSION/.test(l.text)) console.log("[browser]", l.type, l.text.slice(0, 400)); },
    });
    console.log(file, `${Date.now() - t0} ms`);
    files.push(file);
  }
  if (files.length > 1) {
    const w = 360, h = 640;
    const tiles = await Promise.all(files.map((f) => sharp(f).resize(w, h).png().toBuffer()));
    const cols = Math.min(files.length, 4);
    const rows = Math.ceil(files.length / cols);
    await sharp({create: {width: cols * w, height: rows * h, channels: 3, background: "#111"}})
      .composite(tiles.map((input, i) => ({input, left: (i % cols) * w, top: Math.floor(i / cols) * h})))
      .jpeg({quality: 88}).toFile(path.join(out, "sheet.jpg"));
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.stack : e); process.exit(1); });
