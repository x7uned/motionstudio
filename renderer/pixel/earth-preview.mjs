// Preview sheet of the pixel Earth component (node renderer/pixel/earth-preview.mjs → earth-preview.png).
import { Canvas, MAIN } from "./raster.mjs";
import { drawGlobe, project, routeSamples } from "./earth.mjs";
const c = new Canvas(1080, 300, "#000000"), sun = { lat: -11, lon: 150 };
const views = [
  { lat0: 38, lon0: 72, R: 120, cx: 135, cy: 150, title: "OVERVIEW" },
  { lat0: 15, lon0: -60, R: 120, cx: 405, cy: 150, title: "AMERICAS" },
  { lat0: 36, lon0: 138, R: 1400, cx: 675, cy: 150, title: "JAPAN", clip: [540, 0, 810, 300] },
  { lat0: 53, lon0: -3, R: 1600, cx: 945, cy: 150, title: "BRITAIN", clip: [810, 0, 1080, 300] },
];
for (const v of views) drawGlobe(c, v, sun, { clip: v.clip ?? [v.cx - 135, 0, v.cx + 135, 300] });
const route = routeSamples([[139.7, 35.7], [114.2, 22.3], [103.8, 1.3], [72.8, 19], [43.4, 12.6], [32.5, 29.9], [5.4, 43.3], [-0.1, 51.5]]);
let prev = null; for (const [lo, la] of route.pts) { const p = project(views[0], la, lo); if (p.visible && prev) c.line(Math.round(prev.x), Math.round(prev.y), Math.round(p.x), Math.round(p.y), "#F4CA50"); prev = p.visible ? p : null; }
for (const v of views) c.text(MAIN, v.title, v.cx - 125, 8, "#E0CDF8");
for (const x of [270, 540, 810]) c.rect(x, 0, 1, 300, "#3B2C5C");
await c.save(new URL("./earth-preview.png", import.meta.url).pathname.replace(/%20/g, " "), 1);
console.log("earth-preview.png, route", Math.round(route.km), "km");
