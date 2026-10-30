// «The last person alive» — 26 s pixel horror story for the friend's channel (2026-10-25). 540×960 grid ×2 → 1080×1920,
// 30 fps. No overlay: full scenes to every edge; karaoke captions (the same style as the Kagenami pixel films) over a
// soft dithered shade. Shots (timeline.mjs SHOTS): A town (3rd person) · B pov1 · C clearing · D pov2 · E clearing · F pov3,
// joined by 0.2 s dithered dissolves. Builders: town.mjs / clearing.mjs / light.mjs (world), pov.mjs (first person);
// the lead: people.mjs (him, her, the mouse), this harness, the sound.
// node render.mjs --stills 1,4,8,… | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, K, ground, clamp01, sm, lerp, win, ease, rnd } from "./layout.mjs";
import { EV, END, FPS, WORDS, VOICE, SHOTS, DISSOLVE } from "./timeline.mjs";
import { WOMAN, HERO_STAND, LOG } from "./places.mjs";
import { camTown, camClearing, heroWalkX } from "./camera.mjs";
import { drawHim, drawHer, drawMouse, drawCrowbar, blend, STRIDE } from "./people.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const K0 = "#000000", R = Math.round;
const UI = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50" };
const opt = async (f) => { if (process.env.NOWORLD) return null; try { return await import(f); } catch (e) { if (process.env.STRICT) throw e; console.warn("missing", f, String(e.message).slice(0, 120)); return null; } };
const TOWN = await opt("./town.mjs"), CLEAR = await opt("./clearing.mjs"), LIGHT = await opt("./light.mjs"), POV = await opt("./pov.mjs");

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
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.3, e + 1.2); });
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

// ---------------------------------------------------------------- the actor layer: people are drawn here, then lit like the world
class Layer extends Canvas {
  constructor(w, h) { super(w, h, "#000000"); this.m = new Uint8Array(w * h); }
  px(x, y, c) { if (!this.m) return super.px(x, y, c); x = Math.floor(x); y = Math.floor(y); if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return; super.px(x, y, c); this.m[y * this.w + x] = 1; }
  clear() { this.d.fill(0); this.m.fill(0); }
}
const ACT = new Layer(GW, GH);
function composite(c, grade) {
  for (let i = 0, n = GW * GH; i < n; i++) { if (!ACT.m[i]) continue; const k = i * 3, X = i % GW, Y = (i / GW) | 0; let p = [ACT.d[k], ACT.d[k + 1], ACT.d[k + 2]]; if (grade) p = grade(p, X, Y); c.d[k] = p[0]; c.d[k + 1] = p[1]; c.d[k + 2] = p[2]; }
}
const blink = (t, every = 3.3, ph = 0) => { const p = ((t + ph) % every + every) % every; return p < 0.16 ? Math.sin((Math.PI * p) / 0.16) : 0; };

// ---------------------------------------------------------------- shot A: the town
function shotTown(c, t) {
  const cam = camTown(t), G = ground(cam);
  if (TOWN) TOWN.drawTown(c, cam, t); else placeholder(c, cam, "#3A2A4A", "#2A2030");
  ACT.clear();
  const x = heroWalkX(t), stop = sm(t, 7.75, 8.25), look = sm(t, EV.fire - 0.2, EV.fire + 0.4);
  const walk = (g) => drawHim(g, G, x, 0, { pose: "walk", p: x / STRIDE, crowbar: "hand", face: "sleepy", headDy: -0.16, blink: blink(t, 3.1, 0.4) });
  const stand = (g) => drawHim(g, G, x, 0, { pose: "stand", p: t * 0.25, crowbar: "hand", face: look > 0.5 ? "surprised" : "sleepy", headDy: -0.16 - 0.12 * look, blink: blink(t, 3.1, 0.4) });
  blend(ACT, stop, walk, stand);
  composite(c, LIGHT ? (p, X, Y) => LIGHT.gradeTown(p, X, Y, t) : null);
  if (TOWN) TOWN.drawTownFront(c, cam, t);
}

// ---------------------------------------------------------------- shots C and E: the clearing
const FALL = { a: EV.jumps + 0.92, b: EV.jumps + 1.78 };            // his startle → fall (14.30 → 15.16)
const MOUSE_RUN = { a: EV.mouse1 + 0.05, b: EV.mouse1 + 0.75 };     // it dashes off to the left on "a mouse never runs…"
function shotClearing(c, t) {
  const cam = camClearing(t), G = ground(cam);
  const st = { fire: 1, dark: sm(t, EV.it2, EV.and1), rustle: t < EV.jumps + 0.3 ? { x: lerp(1650, 1190, sm(t, 12.75, EV.jumps)), k: win(t, 12.7, EV.jumps, 0.15, 0.25) } : null };
  if (CLEAR) CLEAR.drawClearing(c, cam, t, st); else placeholder(c, cam, "#18202E", "#1A241A");
  ACT.clear();
  // her on the log, facing left (toward the fire and him)
  { const laughK = win(t, EV.laughs - 0.12, EV.but + 0.5, 0.25, 0.6), worried = sm(t, EV.but + 0.3, EV.people), startled = win(t, EV.scream - 0.35, EV.laughs - 0.2, 0.15, 0.3);
    const face = laughK > 0.5 ? "laugh" : worried > 0.5 ? "worried" : startled > 0.5 ? "surprised" : "warm";
    drawHer(ACT, G, WOMAN.x, 0, { f: -1, seatH: -LOG.top, laugh: laughK, lp: t * 2.4, still: worried, breath: t * 0.3, face, blink: face === "laugh" ? 0 : blink(t, 3.7, 1.1), hairSway: Math.sin(t * 1.3) });
  }
  // him: stands smiling → startles and falls back (drops the crowbar) → sits on the ground, rubs his head → sits up, stares
  { const x0 = HERO_STAND.x;
    if (t < FALL.a) drawHim(ACT, G, x0, 0, { pose: "stand", p: t * 0.25, crowbar: "hand", face: t < EV.then1 + 0.3 ? "warm" : "worried", headDy: -0.05, blink: blink(t, 2.9) });
    else if (t < FALL.b) drawHim(ACT, G, x0, 0, { pose: "fall", k: ease((t - FALL.a) / (FALL.b - FALL.a)), face: "scream" });
    else {
      const rub = win(t, EV.laughs, EV.but + 0.2, 0.35, 0.4), fw = sm(t, EV.people - 0.3, EV.it2 + 0.4);
      const face = rub > 0.5 ? "sheepish" : fw > 0.4 ? "worried" : t < EV.its + 0.2 ? "surprised" : "sleepy";
      drawHim(ACT, G, x0, 0, { pose: "ground", rub, ph: t * 1.6, forward: fw, look: -0.3 * sm(t, MOUSE_RUN.a, MOUSE_RUN.a + 0.3) * (1 - fw), breath: t * 0.4, face, blink: blink(t, 3.4, 0.7) });
    }
    // the crowbar: flies out of his hand at the startle and clatters down in front of him
    if (t >= FALL.a + 0.08) { const u = clamp01((t - FALL.a - 0.08) / 0.55), x = lerp(x0 + 14, x0 - 58, u), y = lerp(-74, -1.5, u * u) - 46 * Math.sin(Math.PI * u) * (1 - u * 0.5), rot = lerp(1.4, 3.2, ease(u)) - (1 - u) * 7 * u;   // flung back over his shoulder
      drawCrowbar(ACT, G, x, y, rot); }
  }
  // the mouse: lands in front of him, sits up and sniffs, then dashes off to the left
  if (t >= EV.scream - 0.32 - DISSOLVE) {
    const land = clamp01((t - (EV.scream - 0.5)) / 0.35), mx0 = HERO_STAND.x + 52;
    let mx = mx0, my = -9 * Math.sin(Math.PI * land) * (1 - land * 0.3), pose = "sit", up = sm(t, EV.its - 0.2, EV.its + 0.3) * (1 - sm(t, MOUSE_RUN.a - 0.2, MOUSE_RUN.a)), p = 0;
    if (t > MOUSE_RUN.a - 0.05) { const u = (t - MOUSE_RUN.a) / (MOUSE_RUN.b - MOUSE_RUN.a); mx = mx0 - 300 * Math.pow(Math.max(0, u), 1.3); pose = "run"; p = (t - MOUSE_RUN.a) * 7; my = -4 * Math.max(0, Math.sin(Math.PI * clamp01((mx0 - 20 - mx) / 40))); }
    if (mx > cam.cx - 400) drawMouse(ACT, G, mx, my, { f: -1, pose, up, p, sniff: t * 1.4 });
  }
  composite(c, LIGHT ? (p, X, Y) => LIGHT.gradeClearing(p, X, Y, cam, t, st.fire) : null);
  if (CLEAR) CLEAR.drawClearingFront(c, cam, t, st);
}

function placeholder(c, cam, sky, gnd) { const G = ground(cam), y = R(G.Y(0)); c.rect(0, 0, GW, Math.max(0, y), sky); c.rect(0, Math.max(0, y), GW, GH - Math.max(0, y), gnd); }

// ---------------------------------------------------------------- shots → frame
function shotAt(kind, t) {
  const c = new Canvas(GW, GH, K0);
  if (kind === "town") shotTown(c, t);
  else if (kind === "clearing") shotClearing(c, t);
  else if (POV) ({ pov1: POV.drawPOV1, pov2: POV.drawPOV2, pov3: POV.drawPOV3 })[kind](c, t);
  else c.rect(0, 0, GW, GH, kind === "pov3" ? "#05040A" : "#101820");
  return c;
}
export function frame(t) {
  let i = SHOTS.findIndex((s) => t >= s[1] && t < s[2]); if (i < 0) i = SHOTS.length - 1;
  const [kind, a, b] = SHOTS[i];
  let c;
  const nearEnd = i + 1 < SHOTS.length && t > b - DISSOLVE / 2, nearStart = i > 0 && t < a + DISSOLVE / 2;
  if (nearEnd || nearStart) {
    const j = nearEnd ? i + 1 : i - 1, edge = nearEnd ? b : a, k = sm(t, edge - DISSOLVE / 2, edge + DISSOLVE / 2);
    const A = shotAt(nearEnd ? kind : SHOTS[j][0], t), B = shotAt(nearEnd ? SHOTS[j][0] : kind, t);
    c = A; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (k > bayer(x, y)) { const q = (y * GW + x) * 3; c.d[q] = B.d[q]; c.d[q + 1] = B.d[q + 1]; c.d[q + 2] = B.d[q + 2]; }
  } else c = shotAt(kind, t);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
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
