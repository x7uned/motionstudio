// «Pumpkin face» — 10 s Halloween pixel film (effort experiment, high, 2026-10-25). 540×960 grid ×2 nearest →
// 1080×1920, 30 fps, 300 frames. One persistent night set; the pumpkin's two holes and a line become a face when the
// brain "decides"; a timer counts a sixth of a second (165 ms) and the brain's face area lights up for this pumpkin.
// The picture returns to frame 0 at the end (visual loop). No overlay: karaoke captions over a soft shade only.
// node render.mjs --stills 0,1.2,3.4 | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { GW, GH, clamp01, sm, ease, easeOut, k01, lerp, wob, TAU } from "./util.mjs";
import { EV, B, END, FPS, WORDS } from "./timeline.mjs";
import { drawBack, drawFog, drawFront, drawBats, fieldX, fieldY } from "./scene.mjs";
import { drawPumpkin, toScreen } from "./pumpkin.mjs";
import { brainCard, timerCard, brackets, beam, presence, BRAIN_CARD, FACE_AREA, BR, setRing } from "./cards.mjs";

const PS = 1.22;   // pumpkin size
setRing(B.ring);  // the ring of light round the face area
const HERE = fileURLToPath(new URL(".", import.meta.url));
const UI = { O: "#0B0812", IV: "#FDFEED", HL: "#F08A3C" }, K0 = "#000000", R = Math.round;

// ---------------------------------------------------------------- captions: karaoke, orange highlight (Halloween)
const SPLIT = [["two", "holes", "and", "a", "line,"], ["and", "your", "brain"], ["sees", "a", "face."], ["in", "a", "sixth", "of", "a", "second,"], ["the", "area", "that"], ["reads", "faces"], ["lights", "up"], ["for", "this", "pumpkin."]];
const GROUPS = (() => { let i = 0; return SPLIT.map((g) => { const ws = g.map((txt) => { const w = WORDS[i++]; if (w.text.toLowerCase() !== txt) throw new Error(`caption split ${txt} ≠ ${w.text}`); return { ...w, shown: w.text.toUpperCase() }; }); return { ws, start: ws[0].start }; }); })();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.2, e + 0.9) : 9.05; });
const CAP_X = 254;   // centre of the captions zone (x 39–470 on the grid)
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.2) continue;
    const a = Math.min(sm(t, g.show, g.show + 0.18), 1 - sm(t, g.hide, g.hide + 0.18)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown), w = c.measure(MAIN, words.join(" "), o) + 3 * (words.length - 1), y0 = 690 + R((1 - a) * 6);
    let x = R(CAP_X - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = sm(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, UI.O, { scale: 3, colorAt: (X, Y) => (a < 1 && a <= bayer(X, Y) ? null : UI.O) });
      c.text(MAIN, txt, x, y0, UI.IV, { scale: 3, colorAt: (X, Y) => (a < 1 && a <= bayer(X, Y) ? null : t < wd.start || X >= fillX ? mix(UI.IV, K0, 0.62) : toIv > bayer(X + 3, Y + 1) ? UI.IV : UI.HL) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- state of everything at t
export function state(t) {
  const camZ = 1 + 0.07 * ease(k01(t, B.camIn)) * (1 - ease(k01(t, B.camOut)));
  const hopK = k01(t, B.hop), hop = t > B.hop[0] && t < B.hop[1] ? Math.sin(Math.PI * hopK) : 0;
  // squash: anticipation before the hop, stretch in the air, squash on landing (all smooth)
  const sq = t < B.hop[0] ? 0.05 * Math.sin(Math.PI * clamp01((t - (B.hop[0] - 0.14)) / 0.14))
    : t < B.hop[1] ? -0.04 * Math.sin(Math.PI * hopK) : 0.06 * Math.sin(Math.PI * clamp01((t - B.hop[1]) / 0.2)) * (t < B.hop[1] + 0.2 ? 1 : 0);
  const ignite = ease(k01(t, B.ignite)), dim = ease(k01(t, B.dim));
  const catchFlick = t > B.ignite[0] && t < B.ignite[1] + 0.2 ? 0.25 * Math.sin(TAU * 7 * (t - B.ignite[0])) * (1 - k01(t, [B.ignite[0], B.ignite[1] + 0.2])) : 0;
  const lit = clamp01(ignite * (1 - dim) + catchFlick * ignite);
  const flick = 0.5 + 0.3 * wob(t, 23, 0.4) + 0.2 * wob(t, 37, 1.9);
  const hiA = 1 - sm(t, B.hiOut[0], B.hiOut[1]);
  const flare = sm(t, B.flare[0], B.flare[1]) * (1 - sm(t, 8.9, B.dim[1]));
  return {
    camZ, lit, flick, hop, sq,
    rot: 0.028 * wob(t, 4) * (1 - 0.6 * hop),
    smile: ease(k01(t, B.smile)) * (1 - ease(k01(t, [B.dim[0] + 0.1, B.dim[1]]))),
    wink: Math.sin(Math.PI * k01(t, B.wink)) ** 2,
    hi: { e1: ease(k01(t, B.eye1)), e2: ease(k01(t, B.eye2)), line: ease(k01(t, B.line)), a: hiA },
    glowBoost: 1 + 0.35 * flare,
    detectK: ease(k01(t, B.detect)), detectA: sm(t, B.detect[0], B.detect[0] + 0.2) * (1 - sm(t, B.detectOut[0], B.detectOut[1])), tagA: sm(t, EV.face - 0.05, EV.face + 0.2),
    brainP: presence(t, B.brainIn, B.brainOut), timerP: presence(t, B.timerIn, B.timerOut),
    count: ease(k01(t, B.count)), countDone: sm(t, B.count[1] - 0.05, B.count[1] + 0.3),
    outline: sm(t, B.area[0], B.area[1]), label: sm(t, B.label[0], B.label[1]), glow: ease(k01(t, B.glow)) * (1 - sm(t, B.brainOut[0] - 0.1, B.brainOut[1])),
    beamHead: ease(k01(t, B.beam)), beamA: sm(t, B.beam[0], B.beam[0] + 0.1) * (1 - sm(t, 8.55, 9.25)),
  };
}

export function frame(t) {
  const S = state(t), c = new Canvas(GW, GH, K0), z = S.camZ;
  drawBack(c, t, z);
  drawBats(c, t);
  drawFog(c, t, "back");
  // the pumpkin stands on the field at world (255, 600); the camera scales the field about the anchor
  const P = { cx: fieldX(255, z), base: fieldY(600, z) - 14 * S.hop * z, s: z * PS, rot: S.rot, sq: S.sq, lit: S.lit, flick: S.flick, smile: S.smile, wink: S.wink, hi: S.hi, glowBoost: S.glowBoost };
  // its shadow, and the warm pool of candle light spilling on the ground in front
  { const gx = fieldX(255, z), gy = fieldY(602, z), shrink = 1 - 0.35 * S.hop;
    c.tint(R(gx - 180 * z), R(gy - 16 * z), R(360 * z), R(34 * z), (x, y) => { const d = Math.hypot((x - gx) / (156 * z * shrink), (y - gy) / (13 * z * shrink)); return 0.7 * clamp01(1.15 - d); }, "#0A0612", 3);
    if (S.lit > 0) c.tint(R(gx - 230 * z), R(gy - 6), R(460 * z), R(120 * z), (x, y) => { if (y < gy - 2) return 0; const d = Math.hypot((x - gx) / (210 * z), (y - gy - 18 * z) / (54 * z)); return S.lit * (0.32 + 0.06 * S.flick) * S.glowBoost * clamp01(1 - d); }, "#F08A3C", 4); }
  drawPumpkin(c, P);
  drawFog(c, t, "front");
  drawFront(c, t, z);
  // face brackets round the two holes and the line
  { const a = toScreen(P, -64, -40), b = toScreen(P, 64, 52); brackets(c, { x0: a.x, y0: a.y, x1: b.x, y1: b.y }, S.detectK, S.detectA, S.tagA); }
  // the cards
  brainCard(c, t, S.brainP, { glow: S.glow, outline: S.outline, label: S.label, brainA: S.brainP ? clamp01((S.brainP.a - 0.15) / 0.85) : 0 });
  timerCard(c, t, S.timerP, { k: S.count, done: S.countDone });
  // the beam from the lit face area to the pumpkin's face
  { const from = { x: BR.cx + FACE_AREA.u + 2, y: BR.cy + FACE_AREA.v + 2 }, to = toScreen(P, 30, -62); beam(c, t, from, to, S.beamHead, S.beamA); }
  // caption shade + captions
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
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
  for (const s of args[1].split(",")) { const t = Number(s), t0 = Date.now(), c = frame(t), ms = Date.now() - t0; await sharp(Buffer.from(toFull(c)), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t, ms + " ms"); }
} else if (args[0] === "--video") {
  const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-frames:v", String(to), "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = 0; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 60 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
