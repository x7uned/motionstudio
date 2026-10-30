// «From the slowest wingbeat to the fastest» — pixel film, flat side view, cute animals facing the camera, loop.
// 540×960 grid ×2 → 1080×1920, 30 fps. No overlay: the picture fills the frame; captions sit over a soft dithered shade.
// node render.mjs --stills 3,9.5,... | --video
// Layers per frame: sky → fill → sky disc → back → actors → front → hud (per level) → the wing meter → caption shade →
// captions. Fast camera moves (the rewind LV8 → LV1, the hops between levels) are motion-blurred by averaging sub-frames.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer } from "../../../../renderer/pixel/raster.mjs";
import { view, drawSky, drawDisc } from "./world.mjs";
import { CAM, END, FPS, WORDS, VOICE } from "./timeline.mjs";
import * as ocean from "./levels/ocean.mjs";
import * as city from "./levels/city.mjs";
import * as garden from "./levels/garden.mjs";
import * as pond from "./levels/pond.mjs";
import * as tropic from "./levels/tropic.mjs";
import * as leaf from "./levels/leaf.mjs";
import * as clover from "./levels/clover.mjs";
import * as hive from "./levels/hive.mjs";
import * as porch from "./levels/porch.mjs";
import * as marsh from "./levels/marsh.mjs";
import * as meter from "./levels/meter.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, K = "#000000", R = Math.round;
const C = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50" };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------- camera (eased between keys)
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k) };
}

// ---------------------------------------------------------------- level modules (each may export fill/back/actors/front/hud and RANGE)
export const MODULES = [ocean, city, garden, pond, tropic, leaf, clover, hive, porch, marsh];
function visible(m, V) { const r = m.RANGE; return !r || (r[1] + 140 > V.x0 && r[0] - 140 < V.x1); }

// ---------------------------------------------------------------- captions (karaoke, same style as the earlier pixel films)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.2, e + 0.9) - 0.15; });
export const CAPTION_Y = 682;
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(smooth(t, g.show, g.show + 0.18), 1 - smooth(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = CAPTION_Y + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      for (const [dx, dy] of [[1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) c.text(MAIN, txt, x + dx, y0 + dy, C.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : C.O) });
      c.text(MAIN, txt, x, y0, C.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(C.IV, K, 0.55) : toIv > bayer(X + 3, Yy + 1) ? C.IV : C.Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- the world at one instant (no screen overlays)
function world(t, cxOverride) {
  const c = new Canvas(GW, GH, K), cam = camera(t), V = view(cxOverride ?? cam.cx, cam.cy, { t });
  const passes = MODULES.filter((m) => visible(m, V));
  drawSky(c, V, t);
  for (const m of passes) m.fill?.(c, V, t);
  drawDisc(c, V, t);
  for (const m of passes) m.back?.(c, V, t);
  for (const m of passes) m.actors?.(c, V, t);
  for (const m of passes) m.front?.(c, V, t);
  for (const m of passes) m.hud?.(c, V, t);
  return { c, V };
}
/** motion blur: the shutter opens with the camera speed v (px per frame) — closed below 4 px/frame, a full frame from
 *  20 px/frame — so the blur grows continuously; samples every ≤ 2.5 px of the swept span (1 … 10). */
export function shutter(t) { const v = Math.abs(camera(t + 0.5 / FPS).cx - camera(t - 0.5 / FPS).cx), s = Math.max(0, Math.min(1, (v - 4) / 16)); return { s, n: Math.max(1, Math.min(10, Math.ceil((v * s) / 2.5))) }; }

// ---------------------------------------------------------------- frame
export function frame(t) {
  const { s, n } = shutter(t);
  let out;
  if (n === 1) {
    // sub-pixel camera: while the camera creeps (between whole pixels), blend the two neighbouring whole-pixel views,
    // so the first and last 1-px steps of a pan are soft instead of a sudden shift of every dither pattern
    const cx = camera(t).cx, lo = Math.floor(cx), f = cx - lo, moving = Math.abs(camera(t + 1 / FPS).cx - camera(t - 1 / FPS).cx) > 1e-3;
    if (!moving || f < 0.02 || f > 0.98) out = world(t).c;
    else { const a = world(t, lo).c, b = world(t, lo + 1).c; out = new Canvas(GW, GH, K); for (let i = 0; i < out.d.length; i++) out.d[i] = Math.round(a.d[i] * (1 - f) + b.d[i] * f); }
  } else {
    const acc = new Float32Array(GW * GH * 3);
    for (let k = 0; k < n; k++) { const { c } = world(t + (((k + 0.5) / n - 0.5) * s) / FPS); for (let i = 0; i < acc.length; i++) acc[i] += c.d[i]; }
    out = new Canvas(GW, GH, K); for (let i = 0; i < acc.length; i++) out.d[i] = Math.round(acc[i] / n);
  }
  const V = view(camera(t).cx, camera(t).cy, { t });
  meter.hud(out, V, t);
  out.tint(0, CAPTION_Y - 44, GW, 150, (x, y) => 0.5 * Math.sin((Math.PI * (y - CAPTION_Y + 44)) / 150), "#0B0812", 6);
  captions(out, t);
  return out;
}

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
export function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  return FULL;
}
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
} else if (args[0] === "--video") {
  const from = Number(args[1] ?? 0), to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
