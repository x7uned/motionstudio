// «How your touchscreen feels your finger» — pixel film, flat side view. 540×960 grid ×2 → 1080×1920, 30 fps.
// One world: the winter street; the camera dives into the phone (close-up → top view of the sensor → cross-section) and back.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, hex, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawStreetBack, drawStreetFront, ground } from "./street.mjs";
import { drawHero, heroPose, heroX, prints } from "./hero.mjs";
import { drawCloseup, BUTTON } from "./closeup.mjs";
import { drawSection, drawTop, pill } from "./macro.mjs";
import { EV, END, FPS, WORDS, VOICE, PHONE, camera } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const GW = 540, GH = 960, S = 2, TOP = 190, BOT = 960, K = "#000000", R = Math.round;
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", MU = "#959595", L = "#E0CDF8", P = "#8D59DA", PK = "#E03056", GR = "#65DA41", p3 = "#3B2C5C", p5 = "#6E4FB0", p7 = "#B08AE8";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const dtext = (c, str, x, y, col, a = 1, scale = 1, font = MAIN) => { if (a > 0) fade(c, a).text(font, str, R(x), R(y), col, { scale }); };

// ---------------------------------------------------------------- assets
async function rgba(input, w, h, o = {}) { let img = sharp(input); if (o.extract) img = img.extract(o.extract); const { data, info } = await img.resize(w, h, { kernel: o.kernel ?? "nearest", fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, data: new Uint8ClampedArray(data) }; }
const MEDIA = JSON.parse(fs.readFileSync(HERE + "media.json", "utf8")).assets;
const A = {};
async function loadAssets() {
  A.avatar = await avatar(66);
  A.flagKR = await rgba(HERE + "media/" + MEDIA.find((a) => a.subject === "South Korea").file.split("/").pop(), 54, 36, { kernel: "lanczos3" });
  A.outro = {};
  for (const [name, row, n] of [["wave", 1, 4], ["point", 4, 6], ["happy", 9, 6]]) { A.outro[name] = []; for (let f = 0; f < n; f++) A.outro[name].push(await rgba(SHEET, 192, 208, { extract: { left: f * 192, top: row * 208, width: 192, height: 208 } })); }
}
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(SHEET).extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = new Uint8ClampedArray(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null; if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } } else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P); if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; } }
  return { w: size, h: size, data: out };
}
const overlays = [];
const overlay = (img, x, y, alpha = 1) => { if (alpha > 0) overlays.push({ img, x: R(x), y: R(y), alpha }); };

// ---------------------------------------------------------------- street + its HUD
function cross(c, x, y, a, col = PK) { if (a <= 0) return; const g = fade(c, a); for (let k = -6; k <= 6; k++) { g.rect(R(x + k) - 1, R(y + k) - 1, 3, 3, col); g.rect(R(x + k) - 1, R(y - k) - 1, 3, 3, col); } }
function street(c, t) {
  const cam = camera(t), G = ground(cam), pose = heroPose(t);
  drawStreetBack(c, cam, t, { prints: prints(t), taken: t > EV.pick[0] + 0.05 });
  drawHero(c, G, t, pose);
  drawStreetFront(c, cam, t);
  const hx = heroX(t), px = G.X(hx + PHONE.x), py = G.Y(PHONE.y - 6.5);
  // ✕ over the phone on the gloved taps
  cross(c, px + 6 * G.z, py - 16 * G.z, win(t, EV.tap1[1], EV.tap1[1] + 0.45, 0.06, 0.25));
  cross(c, px + 6 * G.z, py - 16 * G.z, win(t, EV.press[1], EV.press[2], 0.06, 0.25));
  // "…" thought bubble over the head
  const db = win(t, EV.dots[0], EV.dots[1], 0.15, 0.2);
  if (db > 0) { const g = fade(c, db), bx = R(G.X(hx + 14)), by = R(G.Y(-108)); g.rrect(bx - 26, by - 14, 52, 26, IV, 6); g.rect(bx - 10, by + 12, 8, 4, IV); g.rect(bx - 14, by + 16, 4, 4, IV); for (let k = 0; k < 3; k++) if ((t - EV.dots[0]) * 4 > k) g.rect(bx - 14 + k * 12, by - 3, 6, 6, O); }
  const mc = win(t, EV.drop, EV.frozen[0] - 0.2, 0.15, 0.3); if (mc > 0) pill(c, "MISSED CALL", R(Math.min(450, px + 100)), R(py - 30), PK, PK, mc);
  // hypotheses, struck out one after the other
  const hyp = (txt, y, a0, strike, a1) => { const a = win(t, a0, a1, 0.25, 0.3); if (a <= 0) return; const [x, w] = pill(c, txt, 150, y, L, p7, a); const k = smooth(t, strike, strike + 0.25);
    if (k > 0) { fade(c, a).rect(x + 6, y + 12, R((w - 12) * k), 3, PK); pill(c, "NO", x + w + 30, y, PK, PK, a * smooth(t, strike + 0.15, strike + 0.35)); } };
  hyp("FROZEN?", 210, EV.frozen[0], EV.frozen[1], EV.zoomPhone[0] - 0.1); hyp("CRACKED?", 250, EV.cracked, EV.glint[1], EV.zoomPhone[0] - 0.1);
  // South Korea, winter 2010 (flag tile from Wikimedia Commons)
  const kr = win(t, EV.korea[0], EV.korea[1], 0.3, 0.35);
  if (kr > 0) { const g = fade(c, kr); g.rrect(18, 202, 236, 56, p7, 2); g.rrect(20, 204, 232, 52, CARD, 2); overlay(A.flagKR, 30 * S, 214 * S, kr); g.rect(29, 213, 29, 20, p3); dtext(c, "SOUTH KOREA", 70, 212, IV, kr, 2); dtext(c, "WINTER 2010", 70, 234, Y, kr, 2, TINY); }
  pill(c, "CALL ✓", R(Math.min(470, px + 80)), R(py - 30), GR, GR, win(t, EV.connected, EV.ear[1], 0.15, 0.3));
}

// ---------------------------------------------------------------- close-up resampling (zoom in to the phone and into the button)
const cuBuf = new Canvas(GW, GH, K);
function closeup(c, t) {
  cuBuf.rect(0, 0, GW, GH, K); drawCloseup(cuBuf, t);
  let s = 1, ax = 256, ay = 500;
  if (t < EV.cuIn[1] + 0.2) { s = lerp(0.5, 1, ease((t - EV.cuIn[0]) / (EV.cuIn[1] + 0.2 - EV.cuIn[0]))); }
  if (t > EV.cuZoom[0]) { const k = clamp01((t - EV.cuZoom[0]) / (EV.cuZoom[1] - EV.cuZoom[0])); s = Math.exp(Math.log(6) * k * k); ax = BUTTON.x + 26; ay = BUTTON.y + 2; }
  if (s === 1) { c.d.set(cuBuf.d); return; }
  for (let y = TOP; y < GH; y++) { const sy = R(ay + (y - ay) / s); for (let x = 0; x < GW; x++) { const sx = R(ax + (x - ax) / s); const i = (y * GW + x) * 3; if (sx < 0 || sx >= GW || sy < TOP || sy >= GH) { c.d[i] = 11; c.d[i + 1] = 8; c.d[i + 2] = 18; continue; } const j = (sy * GW + sx) * 3; c.d[i] = cuBuf.d[j]; c.d[i + 1] = cuBuf.d[j + 1]; c.d[i + 2] = cuBuf.d[j + 2]; } }
}

// ---------------------------------------------------------------- scene schedule: each scene dissolves in over the previous one
const SCENES = [
  { in: [-1, 0], draw: street },
  { in: EV.cuIn, draw: closeup },
  { in: EV.tvIn, draw: drawTop },
  { in: EV.csIn1, draw: drawSection },
  { in: EV.tvIn2, draw: drawTop },
  { in: EV.csIn2, draw: drawSection },
  { in: EV.csOut, draw: street },
];
const layer = new Canvas(GW, GH, K);
function dissolve(c, src, a) { if (a >= 1) { c.d.set(src.d); return; } if (a <= 0) return; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = src.d[i]; c.d[i + 1] = src.d[i + 1]; c.d[i + 2] = src.d[i + 2]; } }

// ---------------------------------------------------------------- captions (karaoke, the same as the other pixel films)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { if (w.start >= EV.outroIn[0]) break; const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = g.start - 0.12; g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(EV.outroIn[0], e + 0.9); });
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(smooth(t, g.show, g.show + 0.18), 1 - smooth(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : O) });
      c.text(MAIN, txt, x, y0, IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(IV, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? IV : Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- outro (same pack as the Kagenami films)
function outroScene(c, t) {
  for (let y = TOP; y < BOT; y++) for (let x = 0; x < GW; x++) c.px(x, y, "#0B0812");
  for (let i = 0; i < 60; i++) c.px((i * 211) % GW, TOP + ((i * 137) % (BOT - TOP)), i % 5 ? "#2A2140" : MU);
  for (let i = 0; i < 40; i++) { const x = R((i * 97 + t * 12 + Math.sin(t + i) * 8) % GW), y = TOP + R((i * 53 + t * (22 + (i % 5) * 6)) % (BOT - TOP)); c.px(x, y, i % 3 ? "#6A6A96" : "#B4B4D2"); }
  c.tint(0, TOP, GW, BOT - TOP, (x, y) => Math.max(0, 0.35 - Math.hypot(x - 270, (y - 420) * 1.1) / 420), "#2A1B4A", 10);
  const o = { scale: 3 }, qa = smooth(t, EV.outroIn[1], EV.outroIn[1] + 0.4);
  for (const [s, y] of [["WANT MORE BREAKDOWNS", 214], ["LIKE THIS?", 244]]) dtext(c, s, R(270 - c.measure(MAIN, s, o) / 2), y, IV, qa, 3);
  const pose = t < EV.point ? "wave" : t < EV.toggle ? "point" : "happy", start = pose === "wave" ? EV.outroIn[0] : pose === "point" ? EV.point : EV.toggle;
  const frames = A.outro[pose], fpos = (t - start) * 4, f0 = Math.floor(fpos) % frames.length, f1 = (f0 + 1) % frames.length, mk = smooth(fpos % 1, 0.75, 1);
  const prev = pose === "point" ? "wave" : pose === "happy" ? "point" : null, pk = prev ? smooth(t, start, start + 0.3) : 1, sx = 174, sy = 288;
  const spr = (img, a) => { for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const k = (j * img.w + i) * 4; if (img.data[k + 3] < 128) continue; if (a < 1 && a <= bayer(sx + i, sy + j)) continue; c.px(sx + i, sy + j, [img.data[k], img.data[k + 1], img.data[k + 2]]); } };
  if (prev && pk < 1) spr(A.outro[prev][A.outro[prev].length - 1], 1 - pk); spr(frames[f0], pk * (1 - mk)); if (mk > 0) spr(frames[f1], pk * mk);
  const ha = smooth(t, EV.outroIn[1] + 0.1, EV.outroIn[1] + 0.5), hs = "@KAGENAMI_AI"; dtext(c, hs, R(270 - c.measure(MAIN, hs, o) / 2), 512, IV, ha, 3);
  const press = t >= EV.click && t < EV.click + 0.14 ? 2 : 0, done = smooth(t, EV.toggle, EV.toggle + 0.2), bw = 232, bx = 270 - bw / 2, by = 560 + press;
  for (let j = 0; j < 44; j++) for (let i = 0; i < bw; i++) { if (ha <= bayer(bx + i, by + j)) continue; if ((i < 2 || i > bw - 3) && (j < 2 || j > 41)) continue; const edge = i === 0 || i === bw - 1 || j === 0 || j === 43, base = done > bayer(bx + i + 2, by + j) ? (j < 4 ? "#9BF07A" : GR) : (j < 4 ? p7 : P); c.px(bx + i, by + j, edge ? O : j > 38 ? mix(base, O, 0.35) : base); }
  if (done < 1) dtext(c, "FOLLOW", R(270 - c.measure(MAIN, "FOLLOW", o) / 2), by + 12, IV, ha * (1 - done), 3); if (done > 0) dtext(c, "FOLLOWING ✓", R(270 - c.measure(MAIN, "FOLLOWING ✓", o) / 2), by + 12, O, ha * done, 3);
  const ca = smooth(t, EV.point, EV.point + 0.3) * (1 - smooth(t, EV.toggle + 0.4, EV.toggle + 0.7));
  if (ca > 0) { const k = ease((t - EV.point) / 0.6), cx = R(lerp(470, 300, k)), cy = R(lerp(660, 586, k)) + press;
    ["..XX......", ".X..X.....", ".X..X.....", ".X..XXX...", ".X..X..XX.", "XX..X..X.X", "X...X..X.X", "X........X", ".X.......X", "..X.....X.", "...XXXXX.."].forEach((row, j) => [...row].forEach((ch, i) => { const X = cx + i * 2, Yy = cy + j * 2; if (ca <= bayer(X, Yy)) return; const col = ch === "X" ? O : (row.indexOf("X") < i && row.lastIndexOf("X") > i ? IV : null); if (col) c.rect(X, Yy, 2, 2, col); })); }
}

// ---------------------------------------------------------------- frame
function frame(t) {
  overlays.length = 0;
  const c = new Canvas(GW, GH, K), outro = smooth(t, EV.outroIn[0], EV.outroIn[1]);
  if (outro < 1) {
    let cur = 0; for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i].in[0]) cur = i;
    const sc = SCENES[cur], a = smooth(t, sc.in[0], sc.in[1]);
    if (a < 1 && cur > 0) { const keep = overlays.length; SCENES[cur - 1].draw(c, t); layer.d.fill(0); const before = overlays.length; sc.draw(layer, t); for (let k = before; k < overlays.length; k++) overlays[k].alpha *= a; for (let k = keep; k < before; k++) overlays[k].alpha *= 1 - a; dissolve(c, layer, a); }
    else sc.draw(c, t);
  }
  if (outro > 0) { layer.d.fill(0); outroScene(layer, t); dissolve(c, layer, outro); for (const o of overlays) o.alpha *= 1 - outro; }
  // picture runs to the bottom edge; only the header stays black. A soft dithered shade keeps the captions legible.
  c.rect(0, 0, GW, TOP - 2, K);
  for (let x = 0; x < GW; x++) for (let j = 0; j < 8; j++) if (bayer(x, TOP - 2 + j) > j / 8) c.px(x, TOP - 2 + j, K);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 }); const dur = Math.round(END) + " S"; c.text(MAIN, dur, 469 - c.measure(MAIN, dur, { scale: 2 }), 136, MU, { scale: 2 });
  c.text(MAIN, "HOW SCREENS FEEL YOU", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
  overlays.push({ img: A.avatar, x: 76, y: 254, alpha: 1 });
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  for (const { img, x, y, alpha } of overlays) for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const k = (j * img.w + i) * 4; if (!img.data[k + 3]) continue; if (alpha < 1 && alpha <= bayer((x + i) >> 1, (y + j) >> 1)) continue; const a = img.data[k + 3] / 255, o = ((y + j) * 1080 + x + i) * 3; for (let q = 0; q < 3; q++) FULL[o + q] = FULL[o + q] * (1 - a) + img.data[k + q] * a; }
  return FULL;
}
await loadAssets();
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
} else if (args[0] === "--sheet") {
  const ts = args[1].split(",").map(Number), tiles = [];
  for (const t of ts) { const buf = await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).resize(270, 480).png().toBuffer();
    const lab = Buffer.from(`<svg width="270" height="24"><rect width="270" height="24" fill="#000"/><text x="6" y="17" font-family="Menlo" font-size="15" fill="#fff">${t.toFixed(2)}s</text></svg>`);
    tiles.push(await sharp(buf).extend({ top: 24, background: "#000" }).composite([{ input: lab, top: 0, left: 0 }]).png().toBuffer()); }
  const cols = 8, rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: 270 * cols, height: 504 * rows, channels: 3, background: "#000" } }).composite(tiles.map((b, i) => ({ input: b, left: (i % cols) * 270, top: Math.floor(i / cols) * 504 }))).jpeg({ quality: 88 }).toFile(HERE + (args[2] ?? "sheet.jpg"));
  console.log("sheet", tiles.length);
} else if (args[0] === "--video") {
  const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = 0; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
