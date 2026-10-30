// «Pumpkin face» (effort experiment · sonnet-high) — 10 s pixel film, 540×960 grid ×2 → 1080×1920, 30 fps.
// node render.mjs --stills 0.3,1.2,… | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { GW, GH, clamp01, sm, lerp, win, ease, rnd } from "./layout.mjs";
import { EV, B, END, FPS, WORDS, VOICE } from "./timeline.mjs";
import { drawBack, drawFront, COL, GROUND_Y } from "./scene.mjs";
import { drawPumpkin, faceShape } from "./pumpkin.mjs";
import { drawBrainStage } from "./brain.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const K0 = "#000000", R = Math.round;
const UI = { O: "#0B0812", IV: "#FDFEED", Y: "#F08A3C" };           // Halloween karaoke: orange fill (not yellow)

// ---------------------------------------------------------------- captions (karaoke, orange highlight)
const VOICE_TEXT = VOICE.text, WORDS_ = WORDS;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS_) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.2, e + 1.4); });
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(sm(t, g.show, g.show + 0.18), 1 - sm(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt2, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt2, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = sm(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt2, x + 1, y0 + 1, UI.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : UI.O) });
      c.text(MAIN, txt2, x, y0, UI.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(UI.IV, K0, 0.62) : toIv > bayer(X + 3, Yy + 1) ? UI.IV : UI.Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- state of the pumpkin over time
const flick = (t) => 1 + 0.05 * Math.sin(t * 9.7) + 0.035 * Math.sin(t * 15.3 + 1.7) + 0.025 * Math.sin(t * 23.9 + 0.4);
export function pumpkinState(t) {
  const camK = ease(clamp01((t - B.cam[0]) / (B.cam[1] - B.cam[0]))), push = sm(t, 0, B.cam[0]), s0 = 1 + 0.045 * push, backK = ease(clamp01((t - B.back[0]) / (B.back[1] - B.back[0]))), s = lerp(lerp(s0, 0.7, camK), 1.04, backK);
  const rot = 0.1 * Math.exp(-t * 2.3) * Math.cos(t * 8.6);         // the pumpkin has just been set down: it rocks and settles
  const winkP = Math.sin(Math.PI * clamp01((t - B.wink[0]) / (B.wink[1] - B.wink[0])));
  const decide = ease(clamp01((t - B.decide[0]) / (B.decide[1] - B.decide[0])));
  const answer = win(t, B.answer[0], B.answer[1] + 0.9, 0.4, 0.7);
  return {
    cx: 238, cy: GROUND_Y - 91 * s, s, rot,
    holes0: clamp01((t - B.hole1[0]) / (B.hole1[1] - B.hole1[0])), holes1: clamp01((t - B.hole2[0]) / (B.hole2[1] - B.hole2[0])),
    line: ease(clamp01((t - B.line[0]) / (B.line[1] - B.line[0]))), decide, wink: 1 - 0.88 * winkP,
    candle: sm(t, B.decide[0] + 0.06, B.decide[1] + 0.1) * (0.9 + 0.3 * answer + 0.18 * win(t, B.back[0] + 0.2, END + 1, 0.5, 0.3)), flick: flick(t), spill: 0.55 * answer, t,
  };
}

// ---------------------------------------------------------------- the frame
export function frame(t) {
  const c = new Canvas(GW, GH, K0);
  const P = pumpkinState(t);
  drawBack(c, t);
  // candle glow on the ground and fog around the pumpkin
  { const k = P.candle * P.flick; if (k > 0.01) { const gx = P.cx, gy = P.cy + 70 * P.s, rx = 230 * P.s + 40, ry = 90 * P.s + 24;
      c.tint(Math.floor(gx - rx), Math.floor(gy - ry), Math.ceil(rx * 2), Math.ceil(ry * 2), (x, y) => k * 0.5 * Math.max(0, 1 - ((x - gx) / rx) ** 2 - ((y - gy) / ry) ** 2) ** 1.4, COL.orange, 5); } }
  // contact shadow
  { const gx = P.cx, gy = GROUND_Y + 2, rx = 112 * P.s, ry = 11 * P.s + 2; c.tint(Math.floor(gx - rx - 4), Math.floor(gy - ry - 2), Math.ceil(rx * 2 + 8), Math.ceil(ry * 2 + 4), (x, y) => 0.8 * Math.max(0, 1 - ((x - gx) / rx) ** 2 - ((y - gy) / ry) ** 2), "#05030A", 4); }
  drawPumpkin(c, P);
  { const k = P.candle * P.flick; if (k > 0.02) for (const [u, v, R, w] of [[-48, -22, 40, 1], [48, -22, 40, 1], [0, 34 + 15 * P.decide, 58, 0.6]]) { const bx = P.cx + u * P.s, by = P.cy + v * P.s, r = R * P.s;
    c.tint(Math.floor(bx - r), Math.floor(by - r), Math.ceil(r * 2), Math.ceil(r * 2), (x, y) => k * 0.34 * w * Math.max(0, 1 - Math.hypot(x - bx, y - by) / r) ** 1.5, COL.gold, 5); } }
  drawBrainStage(c, t, P);
  drawFront(c, t);
  c.tint(0, 640, GW, 150, (x, y) => 0.6 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- output
const FULLBUF = new Uint8ClampedArray(1080 * 1920 * 3);
export function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULLBUF.set(row, y * 2 * 3240); FULLBUF.set(row, (y * 2 + 1) * 3240); }
  return FULLBUF;
}
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s), t0 = Date.now(), c = frame(t), ms = Date.now() - t0; await sharp(Buffer.from(toFull(c)), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t, ms + " ms"); }
} else if (args[0] === "--video") {
  const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = 0; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 60 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
