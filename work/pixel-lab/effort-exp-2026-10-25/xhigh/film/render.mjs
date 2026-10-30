// «Pumpkin face» — 10 s Halloween pixel film (effort experiment, xhigh, 2026-10-25). 540×960 grid ×2 nearest → 1080×1920,
// 30 fps, exactly 300 frames. No overlay: the night scene runs to every edge; karaoke captions (orange highlight) over a
// soft dithered shade. One continuous camera: close-up on the pumpkin (holes and slit cut on the words) → pull-back to
// the child looking at it → X-ray brain, stopwatch, face area lights up → the pumpkin winks.
// node render.mjs --stills 0.5,2,… | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { GW, GH, R, clamp01, sm, lerp, win, ease, easeOut, backOut, kOf, flicker, camAt } from "./layout.mjs";
import { EV, B, END, FPS, FRAMES, WORDS } from "./timeline.mjs";
import { drawSky, drawMoon, drawHills, drawTree, drawFence, drawGround, drawBale, warmLight, drawFog, drawForeground, drawBats, drawDust, drawWeb, PUMPKIN_BASE } from "./world.mjs";
import { drawPumpkin, drawBurst, drawSparks, FACE, BH } from "./pumpkin.mjs";
import { drawKid, drawKidOverlays } from "./kid.mjs";
import { drawSight, drawBrackets, drawCard, drawAreaLabel, drawLink } from "./hud.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const K0 = "#000000", UI = { O: "#0B0812", IV: "#FDFEED", HI: "#F08A3C" };

// ---------------------------------------------------------------- captions: phrase groups by hand, karaoke fill per word
const GROUP_WORDS = [["two", "holes", "and", "a", "line,"], ["and", "your", "brain"], ["sees", "a", "face."], ["in", "a", "sixth", "of", "a", "second,"], ["the", "area", "that"], ["reads", "faces"], ["lights", "up"], ["for", "this", "pumpkin."]];
const GROUPS = (() => { let i = 0; return GROUP_WORDS.map((g) => { const ws = g.map((txt) => { const w = WORDS[i++]; if (w.text.toLowerCase() !== txt) throw new Error(`caption mismatch ${w.text} vs ${txt}`); return w; }); return { ws, start: ws[0].start, end: ws[ws.length - 1].end }; }); })();
// hand-over between groups: the old one dissolves out (0.1 s) just before the next word, the new one dissolves in right
// after, with a 2-frame overlap on complementary dither pixels — never two lines on top of each other
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1]; g.show = i === 0 ? g.start - 0.14 : g.start - 0.05; g.inDur = 0.12; g.hide = next ? next.start - 0.13 : END - 0.45; g.outDur = next ? 0.1 : 0.3; });
export function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show - 0.01 || t > g.hide + g.outDur + 0.01) continue;
    const ain = sm(t, g.show, g.show + g.inDur), aout = 1 - sm(t, g.hide, g.hide + g.outDur), a = Math.min(ain, aout); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.text.toUpperCase()), sp = c.measure(MAIN, " ", o) + 3, width = words.reduce((s, w) => s + c.measure(MAIN, w, o), 0) + sp * (words.length - 1);
    const y0 = 690 + R((1 - ain) * 5) - R((1 - aout) * 5);
    let x = R(270 - width / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = sm(t, wd.end, wd.end + 0.3);
      const vis = (X, Y) => a >= 1 || (ain < 1 ? ain > bayer(X, Y) : aout > 1 - bayer(X, Y));
      c.text(MAIN, txt, x + 1, y0 + 1, UI.O, { scale: 3, colorAt: (X, Y) => (vis(X, Y) ? UI.O : null) });
      c.text(MAIN, txt, x, y0, UI.IV, { scale: 3, colorAt: (X, Y) => (!vis(X, Y) ? null : t < wd.start || X >= fillX ? mix(UI.IV, K0, 0.6) : toIv > bayer(X + 3, Y + 1) ? UI.IV : UI.HI) });
      x += ww + sp; });
  }
}

// ---------------------------------------------------------------- state from the timeline
export function state(t) {
  const k1 = kOf(t, B.hole1), k2 = kOf(t, B.hole2), kc = kOf(t, B.line);
  const open1 = k1 > 0 ? backOut(k1, 1.25) : 0, open2 = k2 > 0 ? backOut(k2, 1.25) : 0, cut = sm(kc, 0, 1) * 0.15 + kc * 0.85;
  const area = 0.3 * Math.min(1, open1) ** 2 + 0.3 * Math.min(1, open2) ** 2 + 0.4 * Math.min(1, cut);
  const lockFlash = 0.28 * win(t, B.lock[1] - 0.04, B.lock[1] + 0.25, 0.08, 0.55);
  const flare = 0.4 * win(t, B.flare[0], B.flare[0] + 0.2, 0.16, 0.5) + 0.12 * sm(t, B.flare[0], B.flare[1]);
  const fl = flicker(t);
  // the drop: falling in frame 0, lands at 0.26, squash and settle
  const td = t - B.drop[1], u = clamp01(t / B.drop[1]);
  const dy = t < B.drop[1] ? -54 * (1 - (0.35 * u + 0.65 * u * u)) : 0;
  const squash = td < 0 ? -0.045 * sm(t, 0, 0.2) : 0.14 * sm(td, 0, 0.05) * Math.exp(-Math.max(0, td - 0.05) * 7.5) * Math.cos(Math.max(0, td - 0.05) * 17);
  return {
    pumpkin: { dy, sx: 1 + squash * 0.75, sy: 1 - squash, open1, open2, cut, lidL: Math.max(Math.sin(Math.PI * kOf(t, B.blink)), Math.sin(Math.PI * kOf(t, B.wink))), lidR: Math.sin(Math.PI * kOf(t, B.blink)), smile: ease(kOf(t, B.smile)), glow: (0.86 + lockFlash + flare) * fl },
    warm: area * (1 + lockFlash + flare) * fl,
    kid: {
      xray: ease(kOf(t, B.xray)),
      pulse: t < B.sweep[0] ? -1 : t > B.sweep[1] ? 1 : kOf(t, B.sweep),
      trail: 1 - sm(t, B.sweep[1], B.sweep[1] + 0.7),
      mark: easeOut(kOf(t, B.mark)), ring: kOf(t, [B.light[0], B.light[0] + 0.55]),
      light: Math.max(0.24 * sm(t, B.arrive[0], B.arrive[0] + 0.25), t < B.light[0] ? 0 : lerp(0.24, 1, easeOut(kOf(t, B.light))) + 0.25 * win(t, B.light[0] + 0.25, B.light[1] + 0.05, 0.12, 0.4) + 0.15 * win(t, B.flare[0], B.flare[0] + 0.2, 0.16, 0.5) + 0.3 * Math.sin(Math.PI * kOf(t, B.wink))) * (t > B.light[0] ? 0.96 + 0.04 * fl : 1),
      glow: area * (0.9 + 0.5 * lockFlash + 0.5 * flare) * fl,
      blink: Math.max(Math.sin(Math.PI * kOf(t, [5.42, 5.6])), Math.sin(Math.PI * kOf(t, [9.32, 9.5]))),
      smile: ease(kOf(t, [8.6, 9.1])), breath: 1.2 * Math.sin(t * 1.8), brow: win(t, B.lock[1] - 0.06, B.blink[1] + 0.3, 0.16, 0.4) + 0.8 * win(t, B.wink[0], B.smile[1], 0.15, 0.5),
    },
  };
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, K0), cam = camAt(t), S = state(t);
  drawSky(c, cam, t);
  drawMoon(c, cam, t);
  drawBats(c, cam, t);
  drawHills(c, cam, t);
  drawTree(c, cam, t);
  drawWeb(c, cam, t);
  drawFence(c, cam, t);
  drawFog(c, cam, t, 0);
  drawGround(c, cam, t);
  // pumpkin face position for the warm light (computed from the same geometry as drawPumpkin)
  const pz = cam.z, pfx = 270 + (PUMPKIN_BASE.x - cam.cx) * pz, pfy = 450 + (PUMPKIN_BASE.y - BH + S.pumpkin.dy - cam.cy) * pz;
  warmLight(c, cam, t, S.warm, pfx, pfy);
  drawBale(c, cam, t, S.warm);
  const P = drawPumpkin(c, cam, t, S.pumpkin);
  drawDust(c, cam, t);
  drawBurst(c, P.eyeL[0], P.eyeL[1], kOf(t, [B.hole1[0] + 0.05, B.hole1[0] + 0.45]), P.z, 1);
  drawBurst(c, P.eyeR[0], P.eyeR[1], kOf(t, [B.hole2[0] + 0.05, B.hole2[0] + 0.45]), P.z, 2);
  { const kc = kOf(t, B.line); if (kc > 0 && kc < 1) { const tip = P.toS(-FACE.mouthHW + 2 * FACE.mouthHW * S.pumpkin.cut, FACE.mouthY); drawSparks(c, tip[0], tip[1], t, P.z, Math.min(1, kc * 8, (1 - kc) * 8)); } }
  const look = [(P.eyeL[0] + P.eyeR[0]) / 2, (P.eyeL[1] + P.mouth[1]) / 2];
  const A = drawKid(c, cam, t, { ...S.kid, look });
  drawKidOverlays(c, cam, t, S.kid, A);
  drawFog(c, cam, t, 1);
  drawForeground(c, cam, t, S.warm);
  // readable layer
  if (A.visible) drawSight(c, t, look, A.eye);
  drawBrackets(c, t, P);
  drawCard(c, t);
  if (A.visible) drawAreaLabel(c, t, A.ffa, A.z, sm(t, 8.7, 9.15));
  if (A.visible) drawLink(c, t, [A.ffa[0] + 6, A.ffa[1] - 4], look, kOf(t, B.linkOut));
  // caption shade + captions
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), UI.O, 6);
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
  const out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-frames:v", String(FRAMES), "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = 0; f < FRAMES; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 30 === 0) console.log(`frame ${f}/${FRAMES} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
