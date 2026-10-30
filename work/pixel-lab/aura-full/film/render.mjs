// «Infinite aura» — full brainrot pixel film for the friend's channel (2026-10-25), ≈ 38 s. 540×960 grid ×2 → 1080×1920,
// 30 fps. No overlay: full sky scene to every edge; karaoke captions over a soft dithered shade. The hoodie guy from the
// «Aura stairs» test climbs the floating staircase; every step lands on the beat of the user's phonk and the aura grows;
// on each milestone the world gets more absurd (pigeons → laser pigeons → dinosaurs → meteors → explosions → the moon
// stares → aliens want an autograph); on "Time stops" the world freezes grey and only he keeps walking; on "One billion"
// he is in space above a tiny Earth; "Infinite aura"; the end card asks how much aura you have.
// Effect modules (builders, optional imports): pigeons, dinos, ufo, moonface, meteors, explosions, space, cta — each
// exports any of { sky, sea, near, front, hud }(c, X). node render.mjs --stills 1,4,… | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, K, RUN, RISE, ground, layer, clamp01, sm, lerp, win, ease, rnd } from "./layout.mjs";
import { EV, END, FPS, WORDS, VOICE, LAND, Q0, tau, frozen, stairQ, auraCount, level, STOP, MUSIC } from "./timeline.mjs";
import { drawSky, drawStars, drawSunMoon, drawClouds, drawCloudSea, drawIslands, drawStairs, tone } from "./world.mjs";
import { drawGuy, climbAt } from "./guy.mjs";
import { Layer, drawAura, sparks, shockRing, lightning, eyeGlow } from "./aura.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const K0 = "#000000", R = Math.round;
const UI = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50" };
// the font has no "#", and its comma floats mid-height: local glyphs for the counter (rows of the 5×7 font)
MAIN.glyphs["#"] = [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."];
MAIN.glyphs[","] = ["..", "..", "..", "..", ".#", ".#", "#."];
const opt = async (f) => { if (process.env.NOFX) return null; try { return await import(f); } catch (e) { if (process.env.STRICT) throw e; if (!String(e.message).includes("Cannot find module")) console.warn("module error", f, String(e.message).slice(0, 160)); return null; } };
const FX = {};
for (const n of ["pigeons", "dinos", "ufo", "moonface", "meteors", "explosions", "space", "cta"]) FX[n] = await opt(`./${n}.mjs`);
const slot = (name, c, X) => { for (const n of ["space", "meteors", "dinos", "explosions", "moonface", "ufo", "pigeons", "cta"]) { const m = FX[n]; if (m && m[name]) m[name](c, X); } };

/** Aura colours by level 1 … 10 (milestones), then white-gold. */
export const AURA_COL = ["#7FF0FF", "#4C8DFF", "#A15CFF", "#FF4FD8", "#FF4646", "#FF8A2A", "#FFD24A", "#8CFF6A", "#FFE680", "#FFF6D8", "#FFFFFF"];
const auraColor = (L) => { const i = Math.max(0, Math.min(AURA_COL.length - 1, L - 1)), a = Math.floor(i), b = Math.min(AURA_COL.length - 1, a + 1); return mix(AURA_COL[a], AURA_COL[b], i - a); };
/** The "unlocked" line under the counter, one per milestone (words from the narration). */
export const UNLOCKS = [[EV.hundred, "PIGEONS: WATCHING"], [EV.thousand, "PIGEONS: LASERS"], [EV.ten, "DINOSAURS: AWAKE"], [EV.fifteen, "METEORS: ON"], [EV.twenty, "EVERYTHING: EXPLODES"], [EV.fifty, "MOON: STARING"], [EV.hundredK, "ALIENS: FANS"], [EV.million, "TIME: STOPPED"], [EV.billion, "PLANET: TOO SMALL"], [EV.infinite, "AURA: INFINITE"]];

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

// ---------------------------------------------------------------- camera: follows a smoothed stair progress; zoom keys per phase
function camQ(t) { let s = 0; for (let k = -3; k <= 3; k++) s += stairQ(Math.max(0, t + k * 0.1)) + (t + k * 0.1 < 0 ? (t + k * 0.1) * 1.6 : 0); return s / 7; }
const ZK = [[0, 1.75, 252], [EV.ten - 0.3, 1.75, 252], [EV.ten + 0.5, 1.45, 240], [EV.fifty - 0.3, 1.45, 240], [EV.fifty + 0.4, 1.55, 248], [EV.million - 0.1, 1.55, 248], [EV.time + 0.6, 1.95, 252], [EV.billion - 0.05, 1.95, 252], [EV.billion + 0.35, 1.35, 250], [EV.infinite - 0.1, 1.35, 250], [EV.infinite + 0.5, 1.6, 252], [EV.how - 0.3, 1.6, 252], [EV.how + 0.5, 1.5, 170]];
function zoomAt(t) { let i = 0; while (i + 1 < ZK.length && t >= ZK[i + 1][0]) i++; if (i + 1 >= ZK.length) return ZK[i]; const [a, za, xa] = ZK[i], [b, zb, xb] = ZK[i + 1]; const k = ease((t - a) / (b - a)); return [t, lerp(za, zb, k), lerp(xa, xb, k)]; }
export function camera(t) { const q = camQ(t), [, z, sx] = zoomAt(t); return { cx: q * RUN + 10, cy: -(q - 0.5) * RISE - 70, z, sx, sy: 400 }; }
/** 0 → 1: the sky world turning into space (white flash on "One billion"). */
export const spaceK = (t) => sm(t, EV.billion - 0.06, EV.billion + 0.18);

// ---------------------------------------------------------------- time stop grade (a grey-blue wave from his chest), flashes
function timeStop(c, t, ctr) {
  const k = sm(t, STOP.a, STOP.a + 0.55) , out = 1 - spaceK(t); if (k <= 0 || out <= 0) return null;
  const r = 30 + 900 * Math.pow(k, 1.6), cx = ctr[0], cy = ctr[1];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const d = Math.hypot(x - cx, y - cy); if (d > r) continue; if (out < 1 && out <= bayer(x, y)) continue;
    const i = (y * GW + x) * 3, l = 0.3 * c.d[i] + 0.59 * c.d[i + 1] + 0.11 * c.d[i + 2], g = 0.82;
    c.d[i] = R(lerp(c.d[i], l * 0.78 * g + 18, 0.92)); c.d[i + 1] = R(lerp(c.d[i + 1], l * 0.86 * g + 22, 0.92)); c.d[i + 2] = R(lerp(c.d[i + 2], l * 1.05 * g + 40, 0.92));
  }
  return { r, k };
}
function flash(c, t) {
  let a = 0; for (const [m, s] of [[EV.ten, 0.7], [EV.billion - 0.04, 0.95], [EV.infinite, 0.8], [EV.explodes, 0.35]]) a = Math.max(a, s * Math.min(sm(t, m - 0.07, m), 1 - sm(t, m, m + 0.32)));
  if (a > 0) for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = R(lerp(c.d[i], 255, 0.85)); c.d[i + 1] = R(lerp(c.d[i + 1], 252, 0.85)); c.d[i + 2] = R(lerp(c.d[i + 2], 240, 0.85)); }
}

// ---------------------------------------------------------------- HUD: step, the aura counter, the unlocked line
const fmt = (n) => (n === Infinity ? "∞" : n.toLocaleString("en-US"));
function outlined(c, str, x, y, col, scale, a = 1, dark = UI.O) {
  const g = fade(c, a);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 2]]) g.text(MAIN, str, x + dx, y + dy, dark, { scale });
  g.text(MAIN, str, x, y, col, { scale });
}
function infinity(c, cx, cy, a, k, col) {
  const g = fade(c, k), pts = [];
  for (let i = 0; i < 160; i++) { const s = (2 * Math.PI * i) / 160, d = 1 + Math.sin(s) ** 2; pts.push([cx + (a * Math.cos(s)) / d, cy + (a * Math.sin(s) * Math.cos(s)) / d * 1.25]); }
  for (const [rr, cc] of [[6, UI.O], [4.4, "#FFFFFF"], [2.2, col]]) for (const [x, y] of pts) g.disc(R(x + (rr === 6 ? 1 : 0)), R(y + (rr === 6 ? 1 : 0)), R(rr), cc);
}
function hud(c, t, L, col, ctaK) {
  const show = sm(t, 0.15, 0.4) * (1 - ctaK); if (show <= 0) return;
  const n = auraCount(t), steps = Math.max(0, Math.floor(stairQ(t) - Q0 + 0.0001));
  const st = `STEP #${steps}`, sw = c.measure(MAIN, st, { scale: 2 });
  outlined(c, st, R(270 - sw / 2), 152, "#C8C4E0", 2, show);
  const pulse = LAND.reduce((s, l) => s + Math.max(0, 1 - Math.abs(t - l - 0.05) / 0.1), 0) * 0 + UNLOCKS.reduce((s, [m]) => s + Math.max(0, 1 - Math.abs(t - m - 0.08) / 0.16), 0);
  const ik = sm(t, EV.infinite - 0.05, EV.infinite + 0.35);
  if (ik < 1) { const str = fmt(Math.round(n === Infinity ? 1e9 : n)), sc = str.length > 9 ? 4 : 5, w = c.measure(MAIN, str, { scale: sc }); outlined(c, str, R(270 - w / 2), 172 - R(pulse * 3) + (sc === 4 ? 4 : 0), "#FFFFFF", sc, show * (1 - ik)); }
  if (ik > 0) infinity(c, 270, 192, 44, ik * show, AURA_COL[8]);
  { const lab = "AURA", lw = c.measure(MAIN, lab, { scale: 2 }); outlined(c, lab, R(270 - lw / 2), 215, tone(col, 0.45), 2, show); }
  // the unlocked line: dissolves from one to the next
  for (let i = 0; i < UNLOCKS.length; i++) {
    const [m, txt] = UNLOCKS[i], nx = UNLOCKS[i + 1]?.[0] ?? 1e9, a = Math.min(sm(t, m - 0.02, m + 0.2), 1 - sm(t, nx - 0.12, nx + 0.06)) * show; if (a <= 0) continue;
    const w = c.measure(MAIN, txt, { scale: 2 }), y = 236 + R((1 - sm(t, m - 0.02, m + 0.2)) * 6);
    outlined(c, txt, R(270 - w / 2), y, UI.Y, 2, a);
  }
}

// ---------------------------------------------------------------- frame
const ACT = new Layer(GW, GH);
export function frame(t, o = {}) {   // o.clean: no HUD, captions or caption shade (for the cover)
  const c = new Canvas(GW, GH, K0), T = tau(t), cam = camera(t), G = ground(cam), L = level(t), fz = frozen(t), sk = spaceK(t);
  const col = auraColor(Math.max(1, L)), dark = clamp01(L / 6) * 0.9;
  const X = { t, T, cam, G, layer, L, col, frozen: fz, space: sk, EV, hero: null, moon: null, cta: sm(t, EV.how - 0.2, EV.how + 0.3) };
  // the climber into the actor layer first, so every slot (sky, sea, near…) knows where he is
  ACT.d.fill(0); ACT.m.fill(0); ACT.bb = [GW, GH, -1, -1];
  const q = stairQ(t), gold = sm(t, EV.billion, EV.billion + 0.4);
  const an = drawGuy(ACT, G, { q, spike: Math.min(1, L / 8), gold, wob: t * 2.2, face: "cool" });
  X.hero = an;
  // the sky world (until space has fully taken over)
  if (sk < 1) {
    drawSky(c, cam, dark);
    drawStars(c, cam, T, sm(dark, 0.35, 0.8));
    X.moon = drawSunMoon(c, cam, sm(dark, 0.25, 0.85));
    slot("sky", c, X);
    drawClouds(c, cam, T, dark, "far");
    drawCloudSea(c, cam, T, dark, L > 0.2 ? col : null, sm(L, 0, 2) * 0.5);
    drawIslands(c, cam, T, dark);
    drawClouds(c, cam, T, dark, "mid", L > 0.2 ? col : null, sm(L, 0, 2) * 0.6);
    slot("sea", c, X);
  }
  if (sk > 0 && FX.space?.back) { const S = sk >= 1 ? c : new Canvas(GW, GH, K0); FX.space.back(S, X); if (S !== c) for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (sk > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = S.d[i]; c.d[i + 1] = S.d[i + 1]; c.d[i + 2] = S.d[i + 2]; } }
  // stairs: every stair he has stepped on glows in the colour of the aura at that moment
  const lit = (n) => { if (n < 1 || n > LAND.length) return null; const l = LAND[n - 1], age = t - l; if (age < 0) return null; return { col: auraColor(Math.max(1, level(l))), k: 0.7 * sm(age, -0.02, 0.08) + 0.5 * Math.exp(-age / 0.25) }; };
  drawStairs(c, cam, dark * (1 - sk) + 0.6 * sk, lit, t);
  slot("near", c, X);
  const ts = timeStop(c, t, an.chest);
  // aura
  const pulse = LAND.reduce((s, l) => s + (t >= l ? Math.exp(-(t - l) / 0.12) * 0.35 : 0), 0) + UNLOCKS.reduce((s, [m]) => s + (t >= m ? Math.exp(-(t - m) / 0.2) : 0), 0);
  const reach = (L > 0 ? 6 + 4.2 * L : 0) * sm(L, 0, 0.6) + 10 * pulse;
  drawAura(c, ACT, { col, reach, heat: clamp01(L / 9), T: t, up: 0.9 + 0.04 * L, ground: Math.max(an.footFront[1], an.footBack[1]) + 2, hipY: an.hip[1] });
  LAND.forEach((l, i) => { const k = (t - l) / 0.45; if (k > 0 && k < 1) shockRing(c, G.X((i + 1.5) * RUN), G.Y(-(i + 1) * RISE) + 1, k, auraColor(Math.max(1, level(l)))); });
  const outside = Object.create(c); outside.px = (x, y, cc) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < GW && y < GH && !ACT.m[y * GW + x]) c.px(x, y, cc); };
  sparks(outside, t, an.hip, an.top[1], reach, col, sm(L, 0, 0.8));
  lightning(outside, t, an.hip, an.top[1], reach, col, sm(L, 4, 6));
  eyeGlow(c, an.eye, sm(t, EV.million, EV.million + 0.4), col, t);
  if (ts && ts.k < 1) { const a = 1 - sm(t, STOP.a + 0.3, STOP.a + 0.55), g = fade(c, a); for (const [dr, cc] of [[0, "#FFFFFF"], [-2, "#FFE9A8"], [2, "#C8D8FF"]]) g.ering(R(an.chest[0]), R(an.chest[1]), R(ts.r + dr), R(ts.r + dr), cc); }
  slot("front", c, X);
  flash(c, t);
  // caption shade + HUD + end card + captions
  if (o.clean) return c;
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  hud(c, t, L, col, X.cta);
  slot("hud", c, X);
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
  const pre = args[2] || "t";
  for (const s of args[1].split(",")) { const t = Number(s), t0 = Date.now(), c = frame(t), ms = Date.now() - t0; await sharp(Buffer.from(toFull(c)), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/${pre}${t.toFixed(2)}.png`); console.log("still", t, ms + " ms"); }
} else if (args[0] === "--video") {
  const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = 0; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 60 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
