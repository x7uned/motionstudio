// «How to say "I love you" in cat» — pixel film, loop. 540×960 grid ×2 → 1080×1920, 30 fps. No header overlay: the
// picture runs to every edge; captions sit over a soft dithered shade. The same apartment and cat as «Your cat sleeps
// all day…», but the cat sits facing the camera — the viewer is its owner — and slowly blinks.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, ground, sm, ease, lerp, win, clamp01, gate } from "../../cat-zoomies/film/layout.mjs";
import { drawApartment, drawFront, lightAt, litView, propLayer } from "../../cat-zoomies/film/apartment.mjs";
import { drawCat } from "../../cat-zoomies/film/cat.mjs";
import { drawPerson } from "../../cat-zoomies/film/person.mjs";
import { tag } from "../../cat-zoomies/film/hud.mjs";
import { drawCatFront, drawHeart } from "./catface.mjs";
import { EV, END, FPS, WORDS, VOICE } from "./timeline.mjs";
import { camera, world, face, frontVis, sideCatTrack, personTrack, strangerArm, youEyes, SET } from "./direction.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const K = "#000000", R = Math.round;
const UI = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", GR: "#65DA41", CY: "#7FE3F0", OR: "#F59A3A", CARD: "#120C1D" };
const SEAM = new Canvas(GW, GH, K);

function drawTrack(g, entries, fn) { for (const e of entries) { let v = gate(g, e.lo, e.hi); if (e.a < 1) v = fade(v, e.a); if (e.a > 0 && e.hi > e.lo) fn(v, e); } }

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

// ---------------------------------------------------------------- small drawings: the stranger's arm, an eye glyph
function strangerHand(c, G, k, t) { // a white lab-coat sleeve reaching in from the right edge, hand offered low, palm down
  if (k <= 0) return; const g = fade(c, Math.min(1, k * 1.5)), s = G.z, e = ease(k), [hx, hy] = SET.hand, X = G.X(hx + (1 - e) * 140), Y = G.Y(hy + 0.8 * Math.sin(t * 2.2));
  const wrist = [X + 11 * s, Y - 2 * s], elbow = [GW + 30, Y - 46 * s], w = 9 * s, dx = elbow[0] - wrist[0], dy = elbow[1] - wrist[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const quad = (a, b, wa, wb) => [[a[0] + nx * wa, a[1] + ny * wa], [b[0] + nx * wb, b[1] + ny * wb], [b[0] - nx * wb, b[1] - ny * wb], [a[0] - nx * wa, a[1] - ny * wa]];
  g.poly(quad(wrist, elbow, w + 1.5, w * 1.5 + 1.5), "#7A80A0"); g.poly(quad(wrist, elbow, w, w * 1.5), "#F4F5FB");
  g.poly(quad([wrist[0] + dx * 0.25, wrist[1] + dy * 0.25], elbow, w * 0.35, w * 0.6).map(([x, y]) => [x + nx * w * 0.55, y + ny * w * 0.55]), "#D6D9E6");
  const cuff = [wrist[0] + dx * 0.06, wrist[1] + dy * 0.06]; g.poly(quad(wrist, cuff, w + 0.5, w + 0.5), "#C8CCDA");
  g.ellipse(R(X), R(Y), Math.max(3, R(12 * s)), Math.max(2, R(6.5 * s)), "#B8775A"); g.ellipse(R(X), R(Y - 0.5 * s), Math.max(3, R(11 * s)), Math.max(2, R(5.5 * s)), "#E6AD8A");
  g.ellipse(R(X + 1 * s), R(Y - 2 * s), Math.max(2, R(6 * s)), Math.max(1, R(2.5 * s)), "#F3CBAA");
  for (let f = 0; f < 4; f++) g.rect(R(X - 12.5 * s), R(Y - 4 * s + f * 2.4 * s), Math.max(2, R(5 * s)), Math.max(1, R(2 * s)), f % 2 ? "#CF8A6A" : "#E6AD8A");
}
function eyeGlyph(c, cx, cy, s, lid, a, col = "#FDFEED") { // an almond eye (screen px), lid 0 open .. 1 closed
  if (a <= 0) return; const g = fade(c, a), w = 14 * s, h = 7 * s * (1 - lid);
  for (let x = -w; x <= w; x++) { const u = x / w, top = -h * Math.sqrt(Math.max(0, 1 - u * u)), bot = 7 * s * Math.sqrt(Math.max(0, 1 - u * u)) * (lid > 0.98 ? 0 : 1 - lid * 0.6);
    g.px(R(cx + x), R(cy + top), UI.O); if (lid < 0.98) { g.px(R(cx + x), R(cy + bot), UI.O); for (let y = R(top) + 1; y < R(bot); y++) g.px(R(cx + x), R(cy + y), Math.hypot(x, y) < 5 * s ? (Math.hypot(x + s, y + s) < 1.6 * s ? col : "#6A3E20") : col); } }
  if (lid > 0.98) for (let x = -w; x <= w; x += 1) { const u = x / w; g.px(R(cx + x), R(cy + 3 * s * (1 - u * u)), UI.O); }
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, K), cam = camera(t), G = ground(cam), W = world(t);
  drawApartment(c, cam, W);
  if (t > END - 1) { const k = sm(t, END - 1, END - 1 / FPS); SEAM.d.set(c.d); drawApartment(SEAM, cam, { ...W, t: t - END }); for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (bayer(x, y) < k) { const i = (y * GW + x) * 3; c.d[i] = SEAM.d[i]; c.d[i + 1] = SEAM.d[i + 1]; c.d[i + 2] = SEAM.d[i + 2]; } }
  const LV = litView(c, lightAt(W, cam.cx, -60)), GP = propLayer(cam);
  // side-view study scenes: the owner on the sofa and the cat; the stranger's hand
  let personAn = null, sideAn = null;
  drawTrack(LV, personTrack(t), (g, e) => { const an = drawPerson(g, e.prop ? GP : G, e.x, e.y, e.st); if (e.lo === 0) personAn = an; });
  drawTrack(LV, sideCatTrack(t), (g, e) => { const an = drawCat(g, G, e.x, e.y, e.st); if (e.lo === 0 || !sideAn) sideAn = an; });
  strangerHand(LV, G, strangerArm(t), t);
  // the front-facing cat
  let frontAn = null; const fv = frontVis(t);
  if (fv > 0) frontAn = drawCatFront(fv < 1 ? fade(LV, fv) : LV, G, SET.front, 0, face(t));
  drawFront(c, cam, W);
  hud(c, t, G, frontAn, sideAn, personAn);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

function hud(c, t, G, frontAn, sideAn, personAn) {
  // hearts near the eyes: "I love you", "I feel safe", the blink back, the hand, "said it too"
  const heartAt = (an, k, dx = 0, dy = -40) => { if (k <= 0 || !an || !an.head) return; const top = an.earL && an.earR ? [(an.earL[0] + an.earR[0]) / 2, Math.min(an.earL[1], an.earR[1]) - 26] : [an.head[0] + dx, an.head[1] + dy]; drawHeart(c, R(top[0]), R(top[1]), 26, k); };
  heartAt(frontAn, win(t, EV.love, EV.miss, 0.35, 0.4), 0, -64);
  heartAt(frontAn, win(t, EV.safe - 0.1, EV.safeEnd + 0.2, 0.35, 0.4), 0, -60);
  heartAt(frontAn, win(t, EV.said - 0.1, EV.too2End + 0.2, 0.35, 0.4), 0, -64);
  heartAt(sideAn, win(t, EV.blinkedBack1 + 0.3, EV.back1End + 0.3, 0.3, 0.4), 0, -34);
  heartAt(sideAn, win(t, EV.hand - 0.05, EV.handEnd + 0.3, 0.3, 0.4), 0, -34);
  tag(c, ["I LOVE YOU"], 270, 128, win(t, EV.i1 - 0.1, EV.miss - 0.15, 0.25, 0.3), UI.PK, 3);
  tag(c, ["MOST PEOPLE MISS IT"], 270, 128, win(t, EV.miss - 0.1, EV.watch, 0.25, 0.3), UI.L, 3);
  // the slow blink, spelled out: open → soft → closed → open
  { const a = win(t, EV.slow - 0.15, EV.blinkEnd + 0.2, 0.25, 0.3); if (a > 0) { tag(c, ["SLOW BLINK"], 270, 128, a, UI.Y, 3); const lids = [0, 0.5, 1, 0];
      lids.forEach((l, i) => { const k = sm(t, EV.slow + i * 0.22, EV.slow + i * 0.22 + 0.18); eyeGlyph(c, 135 + i * 90, 205, 1.5, l, a * k); if (i < 3) tag(c, [">"], 180 + i * 90, 196, a * k, UI.L, 2); }); } }
  tag(c, ["HARD STARE"], 270, 128, win(t, EV.hard - 0.1, EV.threat - 0.1, 0.25, 0.3), UI.PK, 3);
  tag(c, ["= THREAT"], 270, 128, win(t, EV.threat - 0.05, EV.closing, 0.2, 0.3), UI.PK, 3);
  tag(c, ["I FEEL SAFE", "WITH YOU"], 270, 120, win(t, EV.means, EV.safeEnd + 0.2, 0.25, 0.3), UI.GR, 3);
  tag(c, ["2020 STUDY", "SUSSEX + PORTSMOUTH, UK"], 270, 112, win(t, EV.y2020 - 0.1, EV.owners - 0.05, 0.25, 0.3), UI.OR, 2);
  tag(c, ["OWNER BLINKS"], 270, 128, win(t, EV.owners - 0.05, EV.blinkedBack1 - 0.1, 0.25, 0.25), UI.Y, 3);
  tag(c, ["CAT BLINKS BACK"], 270, 128, win(t, EV.blinkedBack1 - 0.1, EV.back1End + 0.15, 0.25, 0.3), UI.GR, 3);
  tag(c, ["A STRANGER"], 270, 128, win(t, EV.stranger1 - 0.1, EV.blinked2 - 0.15, 0.25, 0.25), UI.L, 3);
  tag(c, ["BLINKS BACK TOO"], 270, 128, win(t, EV.blinked2 - 0.1, EV.likely - 0.1, 0.25, 0.25), UI.GR, 3);
  tag(c, ["WALKS UP TO THE HAND"], 270, 128, win(t, EV.likely - 0.1, EV.handEnd + 0.2, 0.25, 0.3), UI.GR, 3);
  // the tutorial: your own eyes
  tag(c, ["TRY IT"], 270, 128, win(t, EV.want - 0.1, EV.soft - 0.15, 0.25, 0.25), UI.Y, 3);
  tag(c, ["1  SOFT EYES"], 270, 128, win(t, EV.soft - 0.1, EV.slowly2 - 0.1, 0.25, 0.25), UI.Y, 3);
  tag(c, ["2  CLOSE SLOWLY"], 270, 128, win(t, EV.slowly2 - 0.1, EV.open - 0.1, 0.25, 0.25), UI.Y, 3);
  tag(c, ["3  OPEN"], 270, 128, win(t, EV.open - 0.1, EV.openEnd + 0.15, 0.25, 0.3), UI.Y, 3);
  { const Y = youEyes(t); if (Y.a > 0) { tag(c, ["YOU"], 270, 176, Y.a, UI.L, 2); eyeGlyph(c, 212, 236, 3.2, Y.lid, Y.a); eyeGlyph(c, 328, 236, 3.2, Y.lid, Y.a);
      tag(c, ["1"], 270, 270, Y.a * win(t, EV.second - 0.05, EV.two - 0.05, 0.15, 0.2), UI.IV, 2); tag(c, ["2"], 270, 270, Y.a * win(t, EV.two - 0.05, EV.open - 0.1, 0.15, 0.2), UI.IV, 2); } }
  tag(c, ["I LOVE YOU TOO"], 270, 128, win(t, EV.said - 0.15, EV.too2End + 0.25, 0.25, 0.3), UI.PK, 3);
}

// ---------------------------------------------------------------- output
const FULLBUF = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
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
