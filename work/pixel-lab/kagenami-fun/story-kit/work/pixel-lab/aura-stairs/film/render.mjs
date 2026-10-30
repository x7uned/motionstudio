// «Aura stairs» — 5 s test for the friend's brainrot pixel channel (2026-10-25). 540×960 grid ×2 → 1080×1920, 30 fps.
// No overlay: the sky scene runs to every edge; karaoke captions (same style as the Kagenami pixel films) over a soft
// dithered shade. A guy in a hoodie climbs a floating staircase in the sky; every step lands on an 808 accent of the
// music and his aura grows (+1000), the sky darkens, the stairs he touched glow. On "time" time stops: a grey wave
// spreads from him, birds and sparks freeze, his hair rises and turns gold, eyes glow, the music tape-slows.
// node render.mjs --stills 0.3,1.6,3.0,4.6 | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, K, RUN, RISE, ground, clamp01, sm, lerp, win, ease } from "./layout.mjs";
import { EV, END, FPS, WORDS, VOICE, LAND, Q0, tau, slowK, stairQ, level } from "./timeline.mjs";
import { drawSky, drawStars, drawSunMoon, drawClouds, drawCloudSea, drawIslands, drawBirds, drawStairs, COL, tone, levelColor } from "./world.mjs";
import { drawGuy, climbAt } from "./guy.mjs";
import { Layer, drawAura, sparks, shockRing, lightning, eyeGlow } from "./aura.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const K0 = "#000000", R = Math.round;
const UI = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50" };

// ---------------------------------------------------------------- captions (karaoke, the same style as the earlier pixel films)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : END + 1; });
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(g.show <= 0 ? 1 : sm(t, g.show, g.show + 0.18), 1 - sm(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt2, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt2, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = sm(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt2, x + 1, y0 + 1, UI.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : UI.O) });
      c.text(MAIN, txt2, x, y0, UI.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(UI.IV, K0, 0.62) : toIv > bayer(X + 3, Yy + 1) ? UI.IV : UI.Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- camera: follows a smoothed stair progress; pushes in when time stops
const qAt = (T) => (T < 0 ? Q0 + T * 1.6 : stairQ(T));
function camQ(T) { let s = 0; for (let k = -3; k <= 3; k++) s += qAt(T + k * 0.1); return s / 7; }
export function camera(t) {
  const T = tau(t), q = camQ(T), zk = ease(sm(t, EV.time - 0.1, END));
  return { cx: q * RUN + 10, cy: -(q - 0.5) * RISE - 70 - 10 * zk, z: lerp(1.7, 2.2, zk), sx: 252, sy: 400 };
}

// ---------------------------------------------------------------- the time-stop grade: a wave from his chest turns the world grey-blue
function timeStop(c, t, ctr) {
  const k = sm(t, EV.time - 0.04, EV.time + 0.5); if (k <= 0) return null;
  const r = 30 + 900 * Math.pow(k, 1.6), cx = ctr[0], cy = ctr[1];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const d = Math.hypot(x - cx, y - cy); if (d > r) continue;
    const i = (y * GW + x) * 3, l = 0.3 * c.d[i] + 0.59 * c.d[i + 1] + 0.11 * c.d[i + 2], g = 0.82;
    c.d[i] = R(lerp(c.d[i], l * 0.78 * g + 18, 0.92)); c.d[i + 1] = R(lerp(c.d[i + 1], l * 0.86 * g + 22, 0.92)); c.d[i + 2] = R(lerp(c.d[i + 2], l * 1.05 * g + 40, 0.92));
  }
  return { r, k };
}
function timeRing(c, t, ctr, st) {
  if (!st || st.k >= 1) return;
  const a = 1 - sm(t, EV.time + 0.3, EV.time + 0.5), g = fade(c, a);
  for (const [dr, col] of [[0, "#FFFFFF"], [-2, "#FFE9A8"], [2, "#C8D8FF"]]) g.ering(R(ctr[0]), R(ctr[1]), R(st.r + dr), R(st.r + dr), col);
}

// ---------------------------------------------------------------- HUD: the aura counter and the "+1000" pop-ups
function outlined(c, str, x, y, col, scale, a = 1, dark = UI.O) {
  const g = fade(c, a);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 2]]) g.text(MAIN, str, x + dx, y + dy, dark, { scale });
  g.text(MAIN, str, x, y, col, { scale });
}
/** A thick pixel ∞ (lemniscate): dark outline, white stroke, gold core. */
function infinity(c, cx, cy, a, k) {
  const g = fade(c, k), pts = [];
  for (let i = 0; i < 160; i++) { const s = (2 * Math.PI * i) / 160, d = 1 + Math.sin(s) ** 2; pts.push([cx + (a * Math.cos(s)) / d, cy + (a * Math.sin(s) * Math.cos(s)) / d * 1.25]); }
  for (const [rr, col] of [[6, UI.O], [4.4, "#FFFFFF"], [2.2, COL[5]]]) for (const [x, y] of pts) g.disc(R(x + (rr === 6 ? 1 : 0)), R(y + (rr === 6 ? 1 : 0)), R(rr), col);
}
function hud(c, t, T, G) {
  // counter: AURA / rolling total; becomes ∞ when time stops
  const total = LAND.reduce((s, l) => s + 1000 * ease(sm(T, l, l + 0.3)), 0), sk = sm(t, EV.time + 0.05, EV.time + 0.45);
  const show = sm(t, 0.15, 0.4);
  if (show > 0) {
    const lab = "AURA", lw = c.measure(MAIN, lab, { scale: 2 }), L = level(T), col = L > 0.2 ? levelColor(Math.max(1, L)) : "#FFFFFF";
    outlined(c, lab, R(270 - lw / 2), 156, tone(col, 0.5), 2, show);
    const num = String(Math.round(total / 10) * 10), nw = c.measure(MAIN, num, { scale: 5 });
    const pulse = LAND.reduce((s, l) => s + Math.max(0, 1 - Math.abs(T - l - 0.06) / 0.12), 0);
    if (sk < 1) outlined(c, num, R(270 - nw / 2), 178 - R(pulse * 2), "#FFFFFF", 5, show * (1 - sk));
    if (sk > 0) infinity(c, 270, 197, 46, sk);
  }
  // pop-ups: "+1000" over his head at every landing, drifting up (frozen with time)
  LAND.forEach((l, i) => {
    const age = T - l, last = i === LAND.length - 2; if (age < 0 || (!last && age > 0.62)) return;
    const a = Math.min(sm(age, 0, 0.08), last ? 1 : 1 - sm(age, 0.42, 0.62)), at = climbAt(i + 1), x = G.X(at.wx + 20), y = G.Y(at.wy - 98 * K) - 22 * ease(clamp01(age / 0.6)) - 6 * sm(age, 0, 0.1);
    const str = "+1000", w = c.measure(MAIN, str, { scale: 3 });
    outlined(c, str, R(x - w / 2 + 34), R(y), tone(COL[i], 0.25), 3, a);
  });
}

// ---------------------------------------------------------------- frame
const ACT = new Layer(GW, GH);
export function frame(t) {
  const c = new Canvas(GW, GH, K0), T = tau(t), cam = camera(t), G = ground(cam), L = level(T), sk = slowK(t);
  const stopK = sm(t, EV.time - 0.04, EV.time + 0.4);
  const dark = clamp01(L / 5) * 0.88;
  drawSky(c, cam, dark);
  drawStars(c, cam, T, sm(dark, 0.35, 0.8));
  drawSunMoon(c, cam, sm(dark, 0.25, 0.85));
  drawClouds(c, cam, T, dark, "far");
  drawCloudSea(c, cam, T, dark, L > 0.2 ? levelColor(L) : null, sm(L, 0, 2) * 0.5);
  drawIslands(c, cam, T, dark);
  drawClouds(c, cam, T, dark, "mid", L > 0.2 ? levelColor(L) : null, sm(L, 0, 2) * 0.6);
  drawBirds(c, cam, T, dark);
  // stairs: stair n lights up when the n-th step lands on it, in that step's colour; a flash, then a steady glow
  const lit = (n) => { if (n < 1 || n > LAND.length) return null; const l = LAND[n - 1], age = T - l; if (age < 0) return null; return { col: COL[n - 1], k: 0.75 * sm(age, -0.02, 0.08) + 0.6 * Math.exp(-age / 0.25) }; };
  drawStairs(c, cam, dark, lit, T);
  // the climber into the actor layer
  ACT.d.fill(0); ACT.m.fill(0); ACT.bb = [GW, GH, -1, -1];
  const q = stairQ(T), gold = sm(t, EV.time + 0.08, EV.time + 0.42);
  const an = drawGuy(ACT, G, { q, spike: 0.12 * Math.min(5, L) + 0.4 * stopK, gold, wob: T * 2.2 });
  const chest = an.chest;
  const ts = timeStop(c, t, chest);
  // aura: reach grows with each step, pulses on each landing, explodes when time stops
  const pulse = LAND.reduce((s, l) => s + (T >= l ? Math.exp(-(T - l) / 0.16) : 0), 0);
  const col = stopK > 0 ? mix(levelColor(Math.max(1, L)), COL[5], stopK) : levelColor(Math.max(1, L));
  const reach = (L > 0 ? 5 + 6.5 * L : 0) * sm(L, 0, 0.6) + 12 * pulse + 16 * stopK;
  const hip = an.hip, ground0 = Math.max(an.footFront[1], an.footBack[1]) + 2;
  drawAura(c, ACT, { col, reach, heat: clamp01(L / 5 + stopK), T, up: 0.9 + 0.3 * stopK, ground: ground0, hipY: hip[1] });
  // landing rings
  LAND.forEach((l, i) => { const k = (T - l) / 0.45; if (k > 0 && k < 1) { const at = climbAt(i + 1); shockRing(c, G.X((i + 1.5) * RUN), G.Y(-(i + 1) * RISE) + 1, k, COL[i]); } });
  // sparks and lightning stay outside his silhouette (never scratch the face)
  const outside = Object.create(c); outside.px = (x, y, cc) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < GW && y < GH && !ACT.m[y * GW + x]) c.px(x, y, cc); };
  sparks(outside, T, hip, an.top[1], reach, col, sm(L, 0, 0.8));
  lightning(outside, T, hip, an.top[1], reach, col, sm(L, 3.2, 4.2) + stopK);
  eyeGlow(c, an.eye, sm(t, EV.time + 0.1, EV.time + 0.4), COL[5], T);
  timeRing(c, t, chest, ts);
  // caption shade + HUD + captions
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  hud(c, t, T, G);
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
  for (let f = 0; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 30 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
