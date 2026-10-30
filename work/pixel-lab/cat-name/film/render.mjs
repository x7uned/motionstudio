// «Your cat knows its name. It just ignores you.» — pixel film, loop. 540×960 grid ×2 → 1080×1920, 30 fps. No overlay:
// the picture runs to every edge; karaoke captions sit over a soft dithered shade. The apartment and the orange tabby of
// «Your cat sleeps all day…» and «How to say "I love you" in cat» (frozen copies in this folder), golden hour; the cat
// sits facing the viewer (its owner). A hidden speaker plays the study's words; the cat's ears answer.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, ground, sm, ease, lerp, win, clamp01 } from "./layout.mjs";
import { drawApartment, drawFront, lightAt, litView } from "./apartment.mjs";
import { tag, otext } from "./hud.mjs";
import { drawCatFront, drawHeart } from "./catface.mjs";
import { speech, speaker, chart, checkRow, faceIcon, catGrid, miniCat, miniDog, rowsCard, mark } from "./name-hud.mjs";
import { EV, END, FPS, WORDS, VOICE, CALLS } from "./timeline.mjs";
import { camera, world, face, SET, speakerVis, bubbles, speakerBeat, hookBubble, heartK } from "./direction.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const K = "#000000", R = Math.round;
const UI = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", GR: "#65DA41", CY: "#7FE3F0", OR: "#F59A3A", GREY: "#B8B2CC" };
const SEAM = new Canvas(GW, GH, K);

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

// rhythm dots under a bubble: a big beat and a small one (MI·lo)
function rhythm(c, cx, y, a, col) { if (a <= 0) return; const g = fade(c, a); g.disc(R(cx - 10), y, 6, UI.O); g.disc(R(cx - 10), y, 5, col); g.disc(R(cx + 10), y + 2, 4, UI.O); g.disc(R(cx + 10), y + 2, 3, col); }

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, K), cam = camera(t), G = ground(cam), W = world(t);
  drawApartment(c, cam, W);
  // loop seam: the room's motes/sky run on t; in the last second they dissolve into the copy drawn at t − END
  if (t > END - 1) { const k = sm(t, END - 1, END - 1 / FPS); SEAM.d.set(c.d); drawApartment(SEAM, cam, { ...W, t: t - END }); for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (bayer(x, y) < k) { const i = (y * GW + x) * 3; c.d[i] = SEAM.d[i]; c.d[i + 1] = SEAM.d[i + 1]; c.d[i + 2] = SEAM.d[i + 2]; } }
  const LV = litView(c, lightAt(W, SET.cat, -60));
  const spv = speakerVis(t); let sp = null;
  if (spv > 0) sp = speaker(LV, G, SET.speaker, 0, speakerBeat(t), spv);
  const an = drawCatFront(LV, G, SET.cat, 0, face(t));
  drawFront(c, cam, W);
  hud(c, t, G, an, sp);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

function hud(c, t, G, an, sp) {
  // ---- the owner's call at the hook / the end (off screen, left)
  { const hb = hookBubble(t); if (hb.k > 0 && hb.a > 0) speech(c, "MILO!", 138, 196, 6, 286, hb.k, hb.a, { col: UI.Y, edge: UI.Y, icon: faceIcon("owner", 2), iconW: 40, scale: 5 }); }
  // ---- 2019 study: tag, the 77 cats
  tag(c, ["2019 STUDY", "TOKYO, JAPAN"], 270, 100, win(t, EV.y2019 - 0.1, EV.hidden - 0.2, 0.3, 0.35), UI.OR, 3);
  { const a = win(t, EV.cats77 - 0.15, EV.hidden - 0.2, 0.25, 0.35); if (a > 0) { catGrid(c, 72, 166, 77, 11, lerp(0, 77, sm(t, EV.cats77, EV.cats77 + 0.85)), a, 2); otext(c, "77 CATS", 270 - 63, 400, UI.Y, a * sm(t, EV.cats77 + 0.5, EV.cats77 + 0.8), 4); } }
  // ---- the hidden speaker's label
  if (sp) { const a = win(t, EV.hidden + 0.1, CALLS[0].t - 0.1, 0.3, 0.3); if (a > 0) { otext(c, "HIDDEN", R(sp.top[0] - 52), R(sp.top[1] - 74), UI.L, a, 3); otext(c, "SPEAKER", R(sp.top[0] - 61), R(sp.top[1] - 46), UI.L, a, 3); } }
  // ---- speech bubbles from the speaker
  if (sp) for (const b of bubbles(t)) {
    const lvl = b.i >= 6 && b.i <= 8 ? b.i - 6 : 0, bx = R(sp.top[0] - 18), by = R(sp.top[1] - 62 - 50 * lvl);
    const o = b.who === "owner" ? { col: UI.Y, edge: UI.P, icon: faceIcon("owner") } : b.who === "stranger" ? { col: UI.IV, edge: UI.GREY, icon: faceIcon("stranger") } : b.name ? { col: UI.Y, edge: UI.Y } : { col: UI.IV, edge: "#B08AE8" };
    const box = speech(c, b.text, bx, by, lvl ? bx - 6 : sp.top[0] - 4, lvl ? by + 30 : sp.top[1] - 4, b.k, b.a, o);
    if (box && !b.who) rhythm(c, box.x + box.w / 2, box.y - 14, b.a * sm(b.age, 0.2, 0.4), b.name ? UI.Y : UI.L);
  }
  // ---- the response chart (four words, then the name)
  { const a = win(t, CALLS[0].t - 0.3, EV.words2End + 0.1, 0.3, 0.4); if (a > 0) {
      const show = CALLS.slice(0, 5).map((cl) => sm(t, cl.t + 0.05, cl.t + 0.55));
      chart(c, 40, 146, 460, 84, CALLS.slice(0, 5).map((cl) => cl.resp), show, CALLS.slice(0, 5).map((cl) => cl.text), a, { hi: 4, title: "EAR + HEAD MOVES" }); } }
  tag(c, ["SAME RHYTHM AS", "ITS NAME: MI-LO"], 270, 300, win(t, EV.same - 0.1, EV.name2End + 0.1, 0.25, 0.3), UI.L, 3);
  tag(c, ["BORED..."], 270, 300, win(t, EV.bored - 0.1, EV.boredEnd + 0.2, 0.25, 0.3), UI.L, 3);
  tag(c, ["ITS NAME!"], 270, 300, win(t, CALLS[4].t + 0.1, EV.againEnd, 0.25, 0.3), UI.Y, 3);
  tag(c, ["IT KNOWS ITS NAME"], 270, 300, win(t, EV.so1 - 0.05, EV.words2End + 0.1, 0.25, 0.35), UI.GR, 3);
  { const a = win(t, EV.even - 0.1, EV.voiceEnd + 0.15, 0.25, 0.3); if (a > 0) { const b = tag(c, ["A STRANGER'S VOICE"], 250, 120, a, UI.GREY, 3); if (b) mark(c, b.x + b.w + 18, b.y + 18, true, sm(t, EV.voice - 0.05, EV.voice + 0.35), 16, a); } }
  // ---- what the cats did
  { const a = win(t, EV.look - 0.1, EV.stepEnd + 0.15, 0.25, 0.35); if (a > 0) {
      tag(c, ["WHAT THE CATS DID"], 270, 110, a, UI.Y, 3);
      const kk = (w) => sm(t, w - 0.1, w + 0.45);
      checkRow(c, 270, 176, [{ label: "EARS", ok: true, k: kk(EV.ears3) }, { label: "HEAD", ok: true, k: kk(EV.head2) }], a, { scale: 3 });
      checkRow(c, 270, 232, [{ label: "MEOW", ok: false, k: kk(EV.meowed) }, { label: "TAIL", ok: false, k: kk(EV.tail) }, { label: "STEP", ok: false, k: kk(EV.single) }], a, { scale: 3 }); } }
  // ---- 2013: strangers, then the owner
  tag(c, ["2013 STUDY", "20 CATS"], 270, 110, win(t, EV.years - 0.1, EV.owner1 - 0.1, 0.3, 0.35), UI.OR, 3);
  tag(c, ["OWNER'S VOICE: BIGGER"], 270, 110, win(t, EV.perked - 0.15, EV.owner2End + 0.1, 0.25, 0.3), UI.Y, 3);
  tag(c, ["STILL JUST A HEAD TURN"], 270, 110, win(t, EV.still - 0.1, EV.headsEnd + 0.15, 0.25, 0.3), UI.L, 3);
  // ---- dogs vs cats
  { const a = win(t, EV.dogs - 0.3, EV.usEnd + 0.15, 0.25, 0.35); if (a > 0) rowsCard(c, 270, 106, [
      { icon: (g, x, y) => miniDog(g, x, y), text: "DOGS: BRED TO OBEY", ok: true },
      { icon: (g, x, y) => miniCat(g, x + 1, y + 1, 0), text: "CATS: NEVER", ok: false }], [sm(t, EV.dogs - 0.25, EV.dogs + 0.4), sm(t, EV.never - 0.1, EV.never + 0.5)], a); }
  tag(c, ["WHEN THEY WANT TO"], 270, 110, win(t, EV.answer - 0.1, EV.toEnd + 0.2, 0.25, 0.3), UI.PK, 3);
  if (an && an.earL && an.earR) { const k = heartK(t); if (k > 0) drawHeart(c, R((an.earL[0] + an.earR[0]) / 2), R(Math.min(an.earL[1], an.earR[1]) - 24), 30, k); }
  // ---- not deaf, not confused, heard you
  { const a = win(t, EV.so2 - 0.1, EV.you2End + 0.2, 0.25, 0.35); if (a > 0) {
      const kk = (w) => sm(t, w - 0.1, w + 0.45);
      checkRow(c, 270, 120, [{ label: "DEAF", ok: false, k: kk(EV.deaf) }, { label: "CONFUSED", ok: false, k: kk(EV.confused) }], a, { scale: 3 });
      checkRow(c, 270, 176, [{ label: "HEARD YOU", ok: true, k: kk(EV.heard) }], a, { scale: 3 }); } }
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
