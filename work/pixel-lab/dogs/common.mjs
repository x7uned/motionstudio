// Shared harness pieces for the dog series films 2 and 3 (film 1 «Is my dog blind?» keeps its own copy, frozen):
// karaoke captions over a soft shade, small UI drawings (labels, bubbles, leaders), ×2 output and the CLI
// (`--stills t1,t2,…` → stills/tX.XX.png, `--video` → video-noaudio.mp4).
import fs from "node:fs";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { MAIN, mix, bayer, fade } from "../../../renderer/pixel/raster.mjs";

const R = Math.round, K = "#000000", GW = 540, GH = 960;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const CC = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50", G: "#65DA41", PK: "#FF5A6A", CY: "#7FE3F0", L: "#E0CDF8", P: "#8D59DA" };
export const CAPTION_Y = 682;

/** karaoke captions (same grouping and look as the earlier pixel films) */
export function makeCaptions(VOICE, WORDS, END) {
  const text = VOICE.text, gs = []; let cur = [];
  const after = (w) => text.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur);
  const G = gs.map((ws) => ({ ws, start: ws[0].start }));
  G.forEach((g, i) => { const next = G[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.2, e + 0.9) - 0.15; });
  return function captions(c, t) {
    c.tint(0, CAPTION_Y - 44, GW, 150, (x, y) => 0.5 * Math.sin((Math.PI * (y - CAPTION_Y + 44)) / 150), "#0B0812", 6);
    for (const g of G) {
      if (t < g.show || t > g.hide + 0.16) continue;
      const a = Math.min(sm(t, g.show, g.show + 0.18), 1 - sm(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
      const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = CAPTION_Y + R((1 - a) * 6);
      let x = R(270 - w / 2);
      words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = sm(t, wd.end, wd.end + 0.3);
        for (const [dx, dy] of [[1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) c.text(MAIN, txt, x + dx, y0 + dy, CC.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : CC.O) });
        c.text(MAIN, txt, x, y0, CC.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(CC.IV, K, 0.55) : toIv > bayer(X + 3, Yy + 1) ? CC.IV : CC.Y) });
        x += ww + c.measure(MAIN, " ", o) + 3; });
    }
  };
}

// ---------------------------------------------------------------- small UI drawings (all dissolve with a)
export function label(c, text, x, y, a, col = CC.IV, scale = 2) { if (a <= 0) return; const g = fade(c, a), w = c.measure(MAIN, text, { scale }); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) g.text(MAIN, text, R(x - w / 2) + dx, R(y) + dy, CC.O, { scale }); g.text(MAIN, text, R(x - w / 2), R(y), col, { scale }); return w; }
export function bubble(c, x, y, text, a) { if (a <= 0) return; const g = fade(c, a), w = c.measure(MAIN, text, { scale: 3 }) + 14, h = 30, bx = R(x - w / 2), by = R(y - h - 8 + (1 - a) * 4);
  g.rrect(bx - 1, by - 1, w + 2, h + 2, CC.O, 3); g.rrect(bx, by, w, h, CC.IV, 3); g.poly([[x - 5, by + h], [x + 5, by + h], [x, by + h + 8]], CC.IV); g.line(R(x - 5), by + h, R(x), by + h + 8, CC.O); g.line(R(x + 5), by + h, R(x), by + h + 8, CC.O);
  g.text(MAIN, text, bx + 7, by + 6, CC.O, { scale: 3 }); }
export function dashedCircle(c, x, y, r, a, col, t) { if (a <= 0) return; const g = fade(c, a), n = Math.max(16, R(r * 1.6)); for (let i = 0; i < n; i++) { if (((i + Math.floor(t * 8)) & 3) > 1) continue; const an = (2 * Math.PI * i) / n; g.px(R(x + Math.cos(an) * r), R(y + Math.sin(an) * r), col); g.px(R(x + Math.cos(an) * r) + 1, R(y + Math.sin(an) * r), col); } }
/** dotted leader line from (x0, y0) to (x1, y1) with a 2-px dot at the target; k 0..1 draws it from the start */
export function leader(c, x0, y0, x1, y1, a, col = CC.IV, k = 1) { if (a <= 0) return; const g = fade(c, a), n = Math.max(2, R(Math.hypot(x1 - x0, y1 - y0) / 3));
  for (let i = 0; i <= n * k; i++) { if (i % 2) continue; const u = i / n, x = R(x0 + (x1 - x0) * u), y = R(y0 + (y1 - y0) * u); g.px(x + 1, y + 1, CC.O); g.px(x, y, col); }
  if (k >= 1) { g.rect(R(x1) - 1, R(y1) - 1, 3, 3, CC.O); g.rect(R(x1) - 1, R(y1) - 1, 2, 2, col); } }
export function chip(c, x, y, w, h, col, a) { if (a <= 0) return; const g = fade(c, a); g.rrect(x - 1, y - 1, w + 2, h + 2, CC.O, 2); g.rrect(x, y, w, h, col, 2); g.rect(x + 2, y + 2, w - 4, 2, mix(col, "#FFFFFF", 0.25)); }

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
export function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  return FULL;
}
export async function cli(frame, END, FPS, HERE, args = process.argv.slice(2)) {
  if (args[0] === "--stills") {
    fs.mkdirSync(HERE + "stills", { recursive: true });
    for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); }
    console.log("stills", args[1]);
  } else if (args[0] === "--video") {
    const from = Number(args[1] ?? 0), to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
    const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
    const t0 = Date.now();
    for (let f = from; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
    ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
  }
}
