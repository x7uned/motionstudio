// «Why your cat's eyes glow» — pixel film, loop. 540×960 grid ×2 → 1080×1920, 30 fps. No header overlay: the picture
// runs to every edge; captions sit over a soft dithered shade. One world (the black cat on a ledge under the moon);
// the inside of the eye grows out of the cat's own eye; panels dissolve over the world.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawWorld, phone } from "./cat.mjs";
import { drawSection, E } from "./eye.mjs";
import { drawCompare, drawMeter, drawDetail, drawPhoto, panel, txt, tw, UI } from "./panels.mjs";
import { EV, SC, END, FPS, WORDS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, K = "#000000", R = Math.round;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const per = (t, n, ph = 0) => Math.sin((2 * Math.PI * n * t) / END + ph);   // periodic over the loop (n whole cycles)

// ---------------------------------------------------------------- camera keys {t, cx, cy, z}, eased, zoom in log space
const SEAM = { cx: 270, cy: 332, z: 3.0 };
const EYE = { cx: 303 - 30 / 11.16, cy: 330 + 10 / 11.16, z: 11.16 };     // the right eye exactly under the section's eyeball
const MED = { cx: 270, cy: 440, z: 1.15 }, FACE = { cx: 270, cy: 334, z: 3.5 }, WIDE = { cx: 270, cy: 470, z: 1.0 };
const CAM = [
  { t: 0, ...SEAM }, { t: SC.sectionIn[0] - 0.4, ...SEAM }, { t: SC.sectionIn[1], ...EYE },
  { t: SC.sectionOut[0], ...EYE }, { t: SC.sectionOut[1] + 0.5, ...MED },
  { t: EV.back2 - 0.1, ...MED }, { t: EV.pupils + 0.2, ...FACE },
  { t: SC.night[0], ...FACE }, { t: SC.night[1], ...WIDE },
  { t: SC.photo[0], ...WIDE }, { t: SC.photo[0] + 0.8, ...MED },
  { t: EV.so - 0.1, ...MED }, { t: EV.dark3 - 0.1, ...SEAM }, { t: END + 10, ...SEAM },
];
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  const c = { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) };
  // a slow breathing drift, whole cycles over the loop, quiet while the section is open
  const q = 1 - win(t, SC.sectionIn[0], SC.sectionOut[1], 0.6, 0.6);
  c.cx += q * 3 * per(t, 3); c.cy += q * 2 * per(t, 2, 1.3); return c;
}

// ---------------------------------------------------------------- the world's state at time t
function state(t) {
  const night2 = smooth(t, SC.night[0], SC.night[1]), day = smooth(t, SC.day[0], SC.day[1]) * (1 - night2);
  const tod = lerp(6, 2, day);
  // darkness: the opening/closing dark, lighter with the phone, daylight, then night again
  let dark = 0.86;
  dark = lerp(dark, 0.5, smooth(t, SC.sectionOut[0], SC.sectionOut[1]));
  dark = lerp(dark, 0.42, smooth(t, EV.pupils - 0.3, EV.pupils + 0.3));
  dark = lerp(dark, 0, day);
  dark = lerp(dark, 0.6, night2);
  dark = lerp(dark, 0.8, smooth(t, EV.dimmer - 0.2, EV.dimmer + 0.6));
  dark = lerp(dark, 0.62, smooth(t, SC.photo[0], SC.photo[0] + 0.6));
  dark = lerp(dark, 0.86, smooth(t, EV.so, EV.dark3));
  // eyeshine: the reflected light; the phone's beam makes it strong
  const phoneUp = win(t, SC.sectionOut[0] + 0.2, EV.back2 + 0.1, 1.0, 0.7);
  let shine = 0.85 + 0.08 * per(t, 5);
  shine = lerp(shine, 0.95, phoneUp);
  shine = lerp(shine, 0, smooth(t, EV.pupils - 0.2, EV.inDark - 0.2));
  shine = lerp(shine, 0, day);
  shine = lerp(shine, 0.55, night2);
  shine = lerp(shine, 0.85 + 0.08 * per(t, 5), smooth(t, EV.so, EV.dark3));
  // pupils: wide in the dark, open on "open", slits in the sun, wide again at night
  let open = 0.95;
  open = lerp(open, 0.55, smooth(t, EV.pupils - 0.5, EV.pupils + 0.3));
  open = lerp(open, 1, smooth(t, EV.open - 0.05, EV.circles + 0.1));
  open = lerp(open, 0.02, smooth(t, EV.close - 0.05, EV.slits + 0.1));
  open = lerp(open, 0.88, night2);
  open = lerp(open, 0.95, smooth(t, EV.so, EV.dark3));
  const blink = Math.max(...[21.95, 44.2].map((b) => (t > b && t < b + 0.22 ? Math.sin((Math.PI * (t - b)) / 0.22) : 0)));
  const look = [0.25 * per(t, 2, 0.4), 0.15 * per(t, 3, 2.1)];
  return { tod, dark, shine, open, blink, look, phoneUp };
}

// ---------------------------------------------------------------- the phone: up for "lamp or phone" and for the flash photo
const flashA = (t) => smooth(t, EV.flash - 0.04, EV.flash + 0.06) * (1 - smooth(t, EV.flash + 0.12, EV.flash + 0.6));
function phoneY(t) { const up1 = win(t, SC.sectionOut[0] + 0.2, EV.back2 + 0.1, 1.0, 0.7), up2 = win(t, SC.photo[0], EV.so + 0.2, 0.9, 0.8); return { up: Math.max(up1, up2), first: up1 >= up2 }; }

// ---------------------------------------------------------------- composition helpers
const SEC = new Canvas(GW, GH, K);
// draw the section scaled by s around the eye's screen point (ex, ey), dissolved by a
function composeSection(c, t, ex, ey, s, a) {
  if (a <= 0) return;
  SEC.d.fill(0); drawSection(SEC, t, EV);
  for (let Y = 0; Y < GH; Y++) { const sy = R((Y + 0.5 - ey) / s + E.y - 0.5); if (sy < 0 || sy >= GH) continue;
    for (let X = 0; X < GW; X++) { const sx = R((X + 0.5 - ex) / s + E.x - 0.5); if (sx < 0 || sx >= GW) continue; if (a < 1 && a <= bayer(X, Y)) continue; const i = (sy * GW + sx) * 3, o = (Y * GW + X) * 3; c.d[o] = SEC.d[i]; c.d[o + 1] = SEC.d[i + 1]; c.d[o + 2] = SEC.d[i + 2]; } }
}
function tagAt(c, lines, cx, y, a, col, scale = 3) { if (a <= 0) return; const w = Math.max(...lines.map((l) => tw(c, l, scale))) + 24, h = lines.length * (8 * scale + 4) + 12, x = R(Math.max(10, Math.min(GW - 10 - w, cx - w / 2))); panel(c, x, R(y), w, h, a, col); lines.forEach((l, i) => txt(c, l, x + 12, R(y) + 8 + i * (8 * scale + 4), i ? UI.IV : col, a, scale)); }
function arrow(c, x0, y0, x1, y1, col, a, t, dir = 1) {
  if (a <= 0) return; const g = fade(c, a), L = Math.hypot(x1 - x0, y1 - y0), ph = (t * 60 * dir) % 14;
  for (let d = 0; d < L; d += 1) { if (((d - ph) % 14 + 14) % 14 > 8) continue; const k = d / L; g.rect(R(x0 + (x1 - x0) * k) - 1, R(y0 + (y1 - y0) * k) - 1, 3, 3, col); }
  const ux = (x1 - x0) / L, uy = (y1 - y0) / L; for (let k = 0; k < 9; k++) for (let j = -k; j <= k; j++) g.px(R(x1 - ux * (9 - k) - uy * j * 0.6), R(y1 - uy * (9 - k) + ux * j * 0.6), col);
}

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
    const a = Math.min(smooth(t, g.show, g.show + 0.18), 1 - smooth(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt2, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt2, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt2, x + 1, y0 + 1, UI.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : UI.O) });
      c.text(MAIN, txt2, x, y0, UI.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(UI.IV, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? UI.IV : UI.Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, K), cam = camera(t), st = state(t), ph = phoneY(t);
  const LED = { x: 150 + 0, y: 600 + (1 - ease(ph.up)) * 520 };
  const beamOn = ph.first ? ph.up : 0;
  const w = drawWorld(c, cam, t, { ...st, beam: beamOn > 0 ? { x: LED.x + 34, y: LED.y + 2, a: beamOn } : null });
  // light from the phone to the eyes and back (the glow is your own light)
  { const a1 = win(t, EV.lamp - 0.2, EV.back2 + 0.1, 0.3, 0.5) * beamOn, a2 = win(t, EV.bouncing - 0.15, EV.back2 + 0.1, 0.3, 0.5) * beamOn, [ex, ey] = w.eyes[0];
    arrow(c, LED.x + 34, LED.y - 8, ex - 10, ey + 26, "#FFF2C8", a1, t, 1); arrow(c, ex + 6, ey + 30, LED.x + 52, LED.y - 4, "#9CFF7A", a2, t, 1);
    tagAt(c, ["LAMP OR PHONE"], 300, 560, win(t, EV.lamp - 0.1, EV.back2 + 0.1, 0.25, 0.5), UI.Y, 2);
    tagAt(c, ["BOUNCING BACK"], 380, 470, win(t, EV.bouncing - 0.1, EV.back2 + 0.1, 0.25, 0.5), UI.GR, 2); }
  if (ph.up > 0) phone(c, LED.x, LED.y, 1, flashA(t));
  // the hook and the pupils, written next to the eyes
  { const [ex, ey] = w.eyes[0]; void ex;
    tagAt(c, ["DON'T GLOW"], 270, 96, win(t, EV.glow - 0.1, EV.mirror - 0.2, 0.25, 0.3), UI.GR, 3);
    tagAt(c, ["A MIRROR INSIDE"], 270, 96, win(t, EV.mirror - 0.1, SC.sectionIn[0] + 0.6, 0.25, 0.3), UI.GR, 3);
    tagAt(c, ["DARK", "BIG CIRCLES"], 270, 70, win(t, EV.inDark - 0.1, EV.sun - 0.4, 0.3, 0.3), UI.L, 3);
    tagAt(c, ["SUN", "THIN SLITS"], 270, 70, win(t, EV.sun - 0.1, SC.compare[0] - 0.35, 0.3, 0.3), UI.Y, 3); void ey; }
  // inside the eye: the section grows out of the right eye and shrinks back into it
  { const zIn = cam.z, s = (19 * zIn) / E.r, ex = w.eyes[1][0], ey = w.eyes[1][1];
    const a = t < (SC.sectionIn[1] + SC.sectionOut[0]) / 2 ? smooth(t, SC.sectionIn[0] + 0.5, SC.sectionIn[1]) : 1 - smooth(t, SC.sectionOut[0], SC.sectionOut[1] - 0.3);
    if (a > 0 && t > SC.sectionIn[0] && t < SC.sectionOut[1]) composeSection(c, t, ex, ey, Math.min(1, s), a); }
  // panels
  drawCompare(c, t, EV, win(t, SC.compare[0], SC.compare[1], 0.4, 0.45));
  drawMeter(c, t, EV, win(t, SC.meter[0], SC.meter[1], 0.4, 0.45));
  drawDetail(c, t, EV, win(t, SC.detail[0], SC.detail[1], 0.4, 0.45));
  drawPhoto(c, t, EV, win(t, SC.photo[0], SC.photo[1], 0.3, 0.45));
  // the camera flash (a few frames up, half a second down; dithered)
  { const f = flashA(t); if (f > 0) c.tint(0, 0, GW, GH, () => f, "#FFFFFF", 6); }
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin(Math.PI * (y - 640) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
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
