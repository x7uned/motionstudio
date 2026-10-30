// «Why mosquitoes buzz right in your ear» — pixel film, loop. 540×960 grid ×2 → 1080×1920, 30 fps. No overlay: the
// picture runs to every edge; karaoke captions over a soft dithered shade. The bedroom of the apartment kit at night, the
// hero asleep in bed (person.mjs), the series' mosquito (mosquito.mjs from «Why mosquitoes bite you first»).
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, ground, sm, lerp, win, clamp01 } from "./layout.mjs";
import { drawApartment, drawFront, lightAt, litView } from "./apartment.mjs";
import { drawPerson, drawPersonBlend } from "./person.mjs";
import { drawMosquito } from "./mosquito.mjs";
import { tag, soundWaves } from "./hud.mjs";
import { checkRow } from "./name-hud.mjs";
import { cloud, shimmer, heart, note, wingMeter, volumeMeter, songPanel } from "./fx.mjs";
import { EV, END, FPS, WORDS, VOICE, EAR, MOUTH, HEADC } from "./timeline.mjs";
import { camera, world, breath, exhale, awake, female, male, loudness, songK, plume, BREATH_N } from "./direction.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const K = "#000000", R = Math.round, TAU = Math.PI * 2;
const UI = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", GR: "#65DA41", CY: "#7FE3F0", OR: "#F59A3A", GREY: "#B8B2CC" };
const SEAM = new Canvas(GW, GH, K);
const MSCALE = 2.2;                                   // the mosquito is drawn 1.5× world scale: an illustration, not to scale
const WING_T = (t) => t * (Math.round(9.3 * END) / (9.3 * END));   // mosquito.mjs wing shimmer runs 9.3 Hz: whole cycles over the loop

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
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.2, e + 0.9) - 0.15; });
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(sm(t, g.show, g.show + 0.18), 1 - sm(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt2, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt2, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = sm(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt2, x + 1, y0 + 1, UI.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : UI.O) });
      c.text(MAIN, txt2, x, y0, UI.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(UI.IV, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? UI.IV : UI.Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- a mosquito at a world point, turning by dissolve
function mosq(c, G, st, o) {
  const x = G.X(st.p[0]), y = G.Y(st.p[1]), s = G.z * MSCALE, f = clamp01((st.face + 1) / 2), base = { ...o, fly: st.fly ?? 1, legs: 1 - (st.fly ?? 1), t: WING_T(o.t) };
  const a = (st.vis ?? 1) * (st.a ?? 1); if (a <= 0) return null;
  if (f < 1) drawMosquito(c, x, y, s, { ...base, face: -1, alpha: a * (1 - f) });
  if (f > 0) drawMosquito(c, x, y, s, { ...base, face: 1, alpha: a * f });
  return [x, y];
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, K), cam = camera(t), G = ground(cam), W = world(t);
  drawApartment(c, cam, W);
  if (t > END - 1) { const k = sm(t, END - 1, END - 1 / FPS); SEAM.d.set(c.d); drawApartment(SEAM, cam, { ...W, t: t - END }); for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (bayer(x, y) < k) { const i = (y * GW + x) * 3; c.d[i] = SEAM.d[i]; c.d[i + 1] = SEAM.d[i + 1]; c.d[i + 2] = SEAM.d[i + 2]; } }
  const L = lightAt(W, -627, -120), q = Math.min(0.5, 0.7 * L.k), LV = litView(c, { mul: L.mul.map((m) => lerp(m, 1, q)), add: L.add.map((v) => v * (1 - q)), sat: lerp(L.sat, 1, q) });
  const F = female(t), M = male(t);
  // she flies behind the head on the far half of each orbit
  let fPos = null;
  if (F.behind) fPos = mosq(LV, G, F, { t });
  const aw = awake(t), st = { pose: "bed", breath: breath(t) }, an = aw > 0 ? drawPersonBlend(LV, G, 0, 0, st, { ...st, face: "surprised" }, aw) : drawPerson(LV, G, 0, 0, st);
  drawFront(c, cam, W);
  fx(c, t, G, an, F);
  if (!F.behind) fPos = mosq(c, G, F, { t });
  let mPos = null; if (M) mPos = mosq(c, G, { p: M.p, face: M.face, a: M.a, fly: 1 }, { t: t + 1.7, male: true });
  hud(c, t, G, an, F, fPos, mPos);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- world effects: breath clouds, warmth
function fx(c, t, G, an, F) {
  // CO₂: one cloud per exhale, rising along the plume (shown while the narration is about breath)
  const show = win(t, EV.every - 0.6, EV.close - 0.3, 0.5, 0.8);
  if (show > 0) {
    const P = END / BREATH_N;
    for (let n = Math.floor(t / P) - 3; n <= Math.floor(t / P); n++) {
      const born = (n + 0.5) * P, age = t - born; if (age < 0 || age > 3.2) continue;
      const s = age / 3.2, [wx, wy] = plume(s), r = (7 + 16 * s) * G.z, a = show * sm(age, 0, 0.4) * (1 - sm(s, 0.65, 1));
      cloud(c, G.X(wx), G.Y(wy), r, a); cloud(c, G.X(wx - 6 - 4 * s), G.Y(wy + 3), r * 0.6, a * 0.9); cloud(c, G.X(wx + 7 + 5 * s), G.Y(wy + 2), r * 0.55, a * 0.9);
      if (r > 22) { const g = fade(c, a * sm(s, 0.15, 0.3)); g.text(MAIN, "CO2", R(G.X(wx)) - 9, R(G.Y(wy)) - 3, "#3A5A9A", { scale: 1 }); }
    }
  }
  // the meeting: a soft pink spotlight behind the pair
  { const a = win(t, EV.males - 0.6, EV.togetherEnd + 0.2, 0.6, 0.6); if (a > 0) { const cx = G.X(-591), cy = G.Y(-236), r = 150;
      for (let Y = R(cy - r); Y <= R(cy + r); Y++) for (let X = R(cx - r * 1.3); X <= R(cx + r * 1.3); X++) { const d = Math.hypot((X - cx) / 1.3, Y - cy) / r; if (d >= 1) continue; const k = a * 0.5 * (1 - d) ** 1.4; if (k > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), "#B45A9A", 0.35)); } } }
  // warmth: shimmer rising from the face
  { const a = win(t, EV.up - 0.2, EV.warmthEnd + 0.1, 0.4, 0.5); if (a > 0) shimmer(c, G.X(HEADC[0] + 8), G.Y(HEADC[1] - 6), 30 * G.z, 34 * G.z, t * 0.9, a * 0.8); }
}

// ---------------------------------------------------------------- HUD
function hud(c, t, G, an, F, fPos, mPos) {
  // the whine: rings spreading from her while she is loud (hook, by the ear)
  const ld = loudness(t);
  { const quietShots = 1 - Math.min(1, win(t, EV.now - 0.3, EV.hear1End, 0.3, 0.4) + win(t, EV.males - 0.6, EV.togetherEnd + 0.2, 0.3, 0.4));
    if (fPos && ld > 0.35 && F.fly > 0.5 && quietShots > 0) { const ex = G.X(EAR[0]), ey = G.Y(EAR[1]), ang = Math.atan2(ey - fPos[1], ex - fPos[0]), d0 = 12 * G.z * MSCALE / 2.2;
      soundWaves(c, fPos[0] + Math.cos(ang) * d0, fPos[1] + Math.sin(ang) * d0, ((Math.round(2.4 * END) * t) / END) % 1, { angle: ang, spread: 0.55 }, Math.min(1, (ld - 0.35) * 2.2) * quietShots, null, { col: UI.L, r: 10 + 4 * G.z }); } }
  // the hook: love song (heart + notes), not for you
  { const a = win(t, EV.love - 0.15, EV.notFor + 0.3, 0.25, 0.4) + win(t, EV.singing - 0.2, EV.you1End + 0.2, 0.25, 0.4); if (a > 0 && fPos) { heart(c, fPos[0] + 26, fPos[1] - 34, 13, Math.min(1, a * 1.4), Math.min(1, a)); note(c, fPos[0] - 24, fPos[1] - 26 - 3 * Math.sin(t * 5), a); } }
  tag(c, ["A LOVE SONG"], 270, 112, win(t, EV.love - 0.1, EV.notFor - 0.1, 0.25, 0.3), UI.PK, 3);
  { const a = win(t, EV.notFor - 0.1, EV.you0End + 0.2, 0.25, 0.3) + win(t, EV.singing - 0.1, EV.you1End + 0.2, 0.25, 0.3); if (a > 0) checkRow(c, 270, 120, [{ label: "FOR YOU", ok: false, k: Math.min(1, a) }], Math.min(1, a), { scale: 3 }); }
  // breath
  tag(c, ["CO2", "CARBON DIOXIDE"], 270, 112, win(t, EV.cloud - 0.1, EV.dioxideEnd + 0.2, 0.25, 0.3), UI.CY, 3);
  tag(c, ["SHE FOLLOWS IT"], 270, 112, win(t, EV.follows - 0.15, EV.face1End + 0.1, 0.25, 0.3), UI.PK, 3);
  if (fPos) { const a = win(t, EV.female - 0.1, EV.face1End + 0.3, 0.25, 0.3); if (a > 0) tag(c, ["FEMALE"], fPos[0], fPos[1] + 26, a, UI.PK, 2); }
  // only the face is out of the blanket: a dashed ring around the head
  { const a = win(t, EV.only - 0.15, EV.blanketEnd, 0.3, 0.4); if (a > 0 && an && an.head) { const g = fade(c, a), [hx, hy] = an.head, r = 32 * G.z; for (let i = 0; i < 80; i++) { if (i % 4 > 1) continue; const ang = (TAU * i) / 80 + t * 0.4; g.rect(R(hx + 6 + Math.cos(ang) * r) - 2, R(hy - 4 + Math.sin(ang) * r * 0.85) - 2, 4, 4, UI.O); g.rect(R(hx + 6 + Math.cos(ang) * r) - 1, R(hy - 4 + Math.sin(ang) * r * 0.85) - 1, 3, 3, UI.Y); }
      tag(c, ["ONLY THE FACE IS OUT"], 270, 112, a, UI.Y, 3); } }
  tag(c, ["WARMTH"], 270, 112, win(t, EV.up - 0.1, EV.now - 0.4, 0.25, 0.3), UI.OR, 3);
  // listen: the wings, not a voice
  tag(c, ["LISTEN"], 270, 112, win(t, EV.now - 0.1, EV.listenEnd + 0.1, 0.2, 0.3), UI.L, 3);
  { const a = win(t, EV.whine1 - 0.15, EV.wingsEnd + 0.2, 0.25, 0.3); if (a > 0) { const kk = (w) => sm(t, w - 0.1, w + 0.45); checkRow(c, 270, 124, [{ label: "VOICE", ok: false, k: kk(EV.voice) }, { label: "WINGS", ok: true, k: kk(EV.wings) }], a, { scale: 3 }); } }
  wingMeter(c, t, win(t, EV.beat - 0.2, EV.hear1End + 0.1, 0.3, 0.35));
  // how loud she is at your ear
  volumeMeter(c, ld, win(t, EV.quiet - 0.2, EV.goesEnd + 0.1, 0.3, 0.35));
  // the meeting: labels, the fluffy antennae, the song panel
  if (fPos) { const a = win(t, EV.males - 0.2, EV.fluffy - 0.2, 0.3, 0.3) + win(t, EV.meet - 0.1, EV.togetherEnd, 0.3, 0.3); if (a > 0) tag(c, ["FEMALE"], fPos[0] - 30, fPos[1] + 70, Math.min(1, a), UI.PK, 2); }
  if (mPos) { const a = win(t, EV.males - 0.2, EV.togetherEnd, 0.3, 0.3); if (a > 0) tag(c, ["MALE"], mPos[0] + 30, mPos[1] + 70, a, UI.CY, 2); }
  { const a = win(t, EV.fluffy - 0.15, EV.antennaeEnd + 0.1, 0.25, 0.3); if (a > 0 && mPos) { const g = fade(c, a), ax = mPos[0] - 6 * G.z * MSCALE / 1.5, ay = mPos[1] - 1 * G.z; for (let i = 0; i < 48; i++) { if (i % 4 > 1) continue; const ang = (TAU * i) / 48 + t * 0.6, r = 4.2 * G.z; g.rect(R(ax + Math.cos(ang) * r) - 1, R(ay + Math.sin(ang) * r) - 1, 3, 3, UI.CY); }
      tag(c, ["HIS EARS: FLUFFY ANTENNAE"], 270, 112, a, UI.CY, 2); } }
  songPanel(c, t, songK(t), win(t, EV.meet - 0.3, EV.togetherEnd + 0.2, 0.3, 0.35));
  { const a = win(t, EV.fit - 0.05, EV.togetherEnd + 0.2, 0.2, 0.35); if (a > 0) { tag(c, ["FIT!"], 270, 296, a, UI.GR, 3); if (fPos && mPos) heart(c, (fPos[0] + mPos[0]) / 2, (fPos[1] + mPos[1]) / 2 - 60, 16, Math.min(1, a * 1.3), a); } }
  // the silence: she landed
  tag(c, ["SILENCE..."], 270, 112, win(t, EV.stops + 0.05, EV.landed - 0.4, 0.25, 0.3), UI.L, 3);
  { const a = win(t, EV.landed - 0.05, EV.so2 + 0.3, 0.2, 0.4); if (a > 0) { tag(c, ["SHE LANDED?"], 270, 112, a, UI.Y, 3); if (an && an.head) tag(c, ["!"], an.head[0] - 40, an.head[1] - 30 * G.z, a, UI.Y, 3); } }
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
  for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
} else if (args[0] === "--video") {
  const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = 0; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
