// «How a dog shakes dry» — pixel film, flat side view (style variant 1). 540×960 grid ×2 → 1080×1920, 30 fps.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, hex, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawScenery, drawShallows, ground } from "./scenery.mjs";
import { drawDog3, dogPoint } from "./dog3.mjs";
import { drawMouse, drawRat, drawBear } from "./animals.mjs";
import { drawMacroFur, drawDropletScene, drawSign, drawWasher, droplet, panel, dtext, tw, C } from "./props.mjs";
import { EV, CAM, END, FPS, WORDS, VOICE, W } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const GW = 540, GH = 960, S = 2, TOP = 190, BOT = 680, K = "#000000";
const { O, CARD, IV, Y, YL, GR, MU, L, P, PK, p2, p3, p5, p7 } = C;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const R = Math.round;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- assets
async function rgba(input, w, h, o = {}) { let img = sharp(input); if (o.extract) img = img.extract(o.extract); const { data, info } = await img.resize(w, h, { kernel: o.kernel ?? "nearest", fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, data: new Uint8ClampedArray(data) }; }
const A = {};
async function loadAssets() {
  A.avatar = await avatar(66);
  A.outro = {};
  for (const [name, row, n] of [["wave", 1, 4], ["point", 4, 6], ["happy", 9, 6]]) { A.outro[name] = []; for (let f = 0; f < n; f++) A.outro[name].push(await rgba(SHEET, 192, 208, { extract: { left: f * 192, top: row * 208, width: 192, height: 208 } })); }
  A.char = {};
  for (const z of [1.25, 1.3, 1.35]) { A.char[z] = {}; for (const [name, row, n] of [["idle", 0, 7], ["wow", 7, 6]]) { A.char[z][name] = []; for (let f = 0; f < n; f++) A.char[z][name].push(await rgba(SHEET, R(192 * 0.95 * z), R(208 * 0.95 * z), { extract: { left: f * 192, top: row * 208, width: 192, height: 208 } })); } }
}
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(SHEET).extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = new Uint8ClampedArray(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null; if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } } else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P); if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; } }
  return { w: size, h: size, data: out };
}

// ---------------------------------------------------------------- camera
function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  // zoom interpolates in log space so a 1 → 7 dive feels even
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) };
}

// ---------------------------------------------------------------- the dog: position, gait, shakes (real speed and slow-mo ×8)
const DOG_S = 2.0, SLOW = 8;
const REAL = [EV.shake1, EV.shake2, EV.soak], SLOWW = [[EV.slowmo, 31.5], [38.9, 50.2]];
function dogState(t) {
  const tt = t >= EV.freeze[0] && t < EV.freeze[1] ? EV.freeze[0] : t;
  const walking = tt < EV.walk[1];
  const x = walking ? lerp(190, 0, 1 - Math.pow(1 - tt / EV.walk[1], 1.6)) : 0;
  let phase = 0, shake = 0, sway = 0, slow = false;
  for (const [a, b] of REAL) if (tt >= a && tt < b + 0.2) { const env = smooth(tt, a, a + 0.15) * (1 - smooth(tt, b - 0.2, b)); phase = 2 * Math.PI * 4.5 * (tt - a); shake = env; sway = 7 * env * Math.sin(phase); }
  for (const [a, b] of SLOWW) if (tt >= a && tt < b) { const env = smooth(tt, a, a + 0.5) * (1 - smooth(tt, b - 0.4, b)); phase = 2 * Math.PI * (4.5 / SLOW) * (tt - a); shake = env; sway = 9 * env * Math.sin(phase); slow = true; }
  return { tt, x, walk: walking ? tt * 2 * Math.PI * 1.7 : null, phase, shake, sway, slow, wet: t < EV.shake1[1] ? 1 : 0.6 };
}
// spray: deterministic particles with gravity, born on the body during each shake window
const PARTS = [];
{ let id = 0;
  const burst = (a, b, n, slow) => { for (let i = 0; i < n; i++, id++) { const te = a + (b - a) * rnd(id * 3 + 1), ang = -Math.PI * (0.05 + 0.9 * rnd(id * 3 + 2)), r = rnd(id * 5); PARTS.push({ te, slow, ox: 60 + Math.cos(ang) * (44 + 6 * r), oy: 42 + Math.sin(ang) * (17 + 3 * r), vx: Math.cos(ang) * (150 + 170 * rnd(id * 7)) + (rnd(id * 11) - 0.5) * 120, vy: Math.sin(ang) * (120 + 160 * rnd(id * 9)) - 40, size: rnd(id * 13) < 0.3 ? 3 : 2 }); } };
  for (const w of REAL) burst(w[0], w[1], 150, false);
  burst(SLOWW[0][0] + 0.6, SLOWW[0][1] - 0.6, 70, true); burst(EV.flung - 0.05, EV.flung + 0.45, 90, true);
}
function drawSpray(c, G, t, dx) {
  const tt = t >= EV.freeze[0] && t < EV.freeze[1] ? EV.freeze[0] : t;
  for (const p of PARTS) {
    if (tt < p.te) continue; const tau = (tt - p.te) / (p.slow ? SLOW : 1); if (tau > 1.1) continue;
    const wx = dx + (p.ox - 60) * DOG_S + p.vx * tau, wy = (p.oy - 78) * DOG_S + p.vy * tau + 300 * tau * tau;
    if (wy > 6) continue;
    const x = G.X(wx), y = G.Y(wy); if (x < -4 || x > GW + 4 || y < TOP || y > BOT) continue;
    const sz = Math.max(1, R(p.size * Math.min(2.4, G.z * 0.8))), g = fade(c, 1 - smooth(tau, 0.8, 1.1));
    const vx = p.vx, vy = p.vy + 600 * tau, vn = Math.hypot(vx, vy) || 1;
    for (let k = 1; k <= 3; k++) fade(g, 0.6 - k * 0.15).rect(R(x - vx / vn * k * 3 * sz), R(y - vy / vn * k * 3 * sz), Math.max(1, sz - 1), Math.max(1, sz - 1), "#A9C4FF");
    g.rect(R(x), R(y), sz, sz, "#A9C4FF"); g.px(R(x), R(y), IV);
    // during the time-stop, dotted trajectories of the frozen droplets
    if (t >= EV.freeze[0] && t < EV.freeze[1] && PARTS.indexOf(p) % 3 === 0) { const fa = win(t, EV.freeze[0] + 0.2, EV.freeze[1] - 0.3, 0.4, 0.3); for (let k = 1; k <= 8; k++) { const tk = tau + k * 0.05, qx = dx + (p.ox - 60) * DOG_S + p.vx * tk, qy = (p.oy - 78) * DOG_S + p.vy * tk + 300 * tk * tk; if (qy > 6) break; fade(c, fa * (1 - k / 9)).px(R(G.X(qx)), R(G.Y(qy)), L); } }
  }
}
function drawDrips(c, G, t, dx, wet) {
  for (let k = 0; k < 6; k++) { const period = 0.9 + k * 0.17, ph = ((t + k * 0.37) % period) / period, wx = dx + (-30 + k * 16) * 1.2, wy = -46 + ph * 46; if (ph > 0.95) continue; const x = G.X(wx), y = G.Y(wy); fade(c, wet * (1 - ph)).rect(R(x), R(y), Math.max(1, R(G.z)), Math.max(2, R(2 * G.z)), "#A9C4FF"); }
}

// ---------------------------------------------------------------- animals of the line-up (walk in, shake slow-mo, walk out)
const LINE = [
  { kind: "mouse", draw: drawMouse, s: 2.4, x: -268, from: -440, to: -600, h: 14 },
  { kind: "rat", draw: drawRat, s: 2.2, x: -190, from: -400, to: -560, h: 18 },
  { kind: "bear", draw: drawBear, s: 3.0, x: 300, from: 620, to: -900, h: 78 },
];
const FREQ = { mouse: 30, rat: 18, bear: 4 };
const IN = [37.5, 38.9], OUT = [W("researchers", 2), W("shake", 2)];
function animalX(a, t) { if (t < IN[0]) return a.from; if (t < IN[1]) return lerp(a.from, a.x, ease((t - IN[0]) / (IN[1] - IN[0]))); if (t < OUT[0]) return a.x; return lerp(a.x, a.to, ease((t - OUT[0]) / (OUT[1] - OUT[0]))); }

// ---------------------------------------------------------------- the channel character for the soak (world space)
function drawCharacter(c, G, wx, t) {
  if (t < OUT[0]) return;
  const z = [1.25, 1.3, 1.35].reduce((a, b) => (Math.abs(b - G.z) < Math.abs(a - G.z) ? b : a)), set = A.char[z];
  const wow = smooth(t, EV.surprised, EV.surprised + 0.3), fr = (arr, rate, t0) => arr[Math.floor(Math.max(0, t - t0) * rate) % arr.length];
  const x = G.X(wx), y = G.Y(0);
  const blit = (img, a) => { for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const k = (j * img.w + i) * 4; if (img.data[k + 3] < 128) continue; const X = R(x - img.w / 2 + i), Yy = R(y - img.h + j + 4); if (a < 1 && a <= bayer(X, Yy)) continue; c.px(X, Yy, [img.data[k], img.data[k + 1], img.data[k + 2]]); } };
  c.ellipse(R(x), R(y + 2), R(46 * G.z), R(6 * G.z), "#1A1328");
  if (wow < 1) blit(fr(set.idle, 3, 0), 1 - wow); if (wow > 0) blit(fr(set.wow, 4, EV.surprised), wow);
  if (t > EV.surprised) for (let k = 0; k < 8; k++) { const ph = ((t * 1.3 + k * 0.29) % 1), xx = x + (-50 + k * 14) * G.z * 0.6, yy = y - 200 * G.z + ph * 190 * G.z; fade(c, 1 - ph).rect(R(xx), R(yy), Math.max(1, R(G.z)), Math.max(2, R(2.5 * G.z)), "#A9C4FF"); }
}

// ---------------------------------------------------------------- captions
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

// ---------------------------------------------------------------- frame
const overlays = [];
const layer = new Canvas(GW, GH, K);
function dissolve(c, src, a) { if (a >= 1) { c.d.set(src.d); return; } if (a <= 0) return; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = src.d[i]; c.d[i + 1] = src.d[i + 1]; c.d[i + 2] = src.d[i + 2]; } }

function world(c, t) {
  const cam = camera(t), G = ground(cam), d = dogState(t);
  drawScenery(c, cam, d.tt);
  drawSign(c, G, 600, t, EV);
  const lineup = t >= IN[0] && t < OUT[1] + 0.2;
  // bear behind the dog
  const bear = LINE[2], sl = (a) => (t >= SLOWW[1][0] && t < SLOWW[1][1] ? Math.sin(2 * Math.PI * (FREQ[a.kind] / SLOW) * (t - SLOWW[1][0])) * smooth(t, SLOWW[1][0], SLOWW[1][0] + 0.5) : 0);
  if (lineup) { const bx = animalX(bear, t), walking = t < IN[1] || t > OUT[0]; bear.draw(c, G.X(bx), G.Y(0) - (walking ? Math.abs(Math.sin(t * 6)) * 3 * G.z : 0), bear.s * G.z, { sway: sl(bear) * 10 * G.z, phase: t * 3, shake: Math.abs(sl(bear)) }); }
  // dog (+ motion smear during real-speed shakes)
  const gx = G.X(d.x), gy = G.Y(0), s = DOG_S * G.z;
  c.ellipse(R(gx), R(gy + 2), R(56 * s), R(4 * s), "#1A1328");
  if (d.shake > 0.2 && !d.slow) { drawDog3(c, gx, gy, s, { phase: d.phase - 1.4, shake: d.shake, sway: -9 * s, legs: false, alpha: 0.22, wet: d.wet }); drawDog3(c, gx, gy, s, { phase: d.phase + 1.4, shake: d.shake, sway: 9 * s, legs: false, alpha: 0.22, wet: d.wet }); }
  drawDog3(c, gx, gy, s, { phase: d.phase, shake: d.shake, sway: d.sway * G.z, walk: d.walk, wet: d.wet });
  // x-ray: spine line inside the body
  const xr = win(t, EV.spine, 31.3, 0.35, 0.3);
  if (xr > 0) { const f = fade(c, xr), ang = (Math.PI / 6) * Math.sin(d.phase) * 0.35; const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16, p = dogPoint(gx, gy, s, [42 + u * 64, 24 + u * 10], d.sway * G.z * 0.4); pts.push(p); }
    for (let k = 0; k < pts.length - 1; k++) if (k % 2 === 0) { f.line(R(pts[k][0]), R(pts[k][1]), R(pts[k + 1][0]), R(pts[k + 1][1]), L); f.line(R(pts[k][0]), R(pts[k][1]) + 1, R(pts[k + 1][0]), R(pts[k + 1][1]) + 1, L); }
    for (let k = 1; k < 16; k += 3) f.disc(R(pts[k][0]), R(pts[k][1]), Math.max(2, R(1.4 * G.z)), IV); }
  // mouse and rat in front
  for (const a of LINE.slice(0, 2)) if (lineup) { const ax = animalX(a, t), walking = t < IN[1] || t > OUT[0]; a.draw(c, G.X(ax), G.Y(0) - (walking ? Math.abs(Math.sin(t * 14)) * 2 * G.z : 0), a.s * G.z, { sway: sl(a) * 2.2 * G.z, phase: t * 8, shake: Math.abs(sl(a)) }); }
  drawCharacter(c, G, -190, t);
  drawSpray(c, G, t, d.x);
  if (d.wet > 0 && d.shake < 0.2 && t < 37) drawDrips(c, G, d.tt, d.x, d.tt < EV.walk[1] + 1.5 ? 1 : 0.5);
  drawShallows(c, cam, d.tt);
  // water rings where the dog left the river
  if (t < EV.walk[1] + 2) for (const r of [14, 26, 40]) { const k = clamp01((t - 0.2) / 3); fade(c, 0.7 * (1 - k)).ering(R(G.X(150)), R(G.Y(-6)), R(r * G.z * (0.6 + k)), R(r * 0.25 * G.z * (0.6 + k)), "#6A78D0"); }
  // line-up overlays: rotation circle round the mouse, frequency tags
  if (lineup) {
    const mc = win(t, EV.circle, W("rat,") - 0.1, 0.35, 0.35);
    if (mc > 0) { const m = LINE[0], mx = G.X(animalX(m, t)), my = G.Y(-6), rx = 15 * m.s * G.z, ry = 6 * m.s * G.z; fade(c, mc).ering(R(mx), R(my), R(rx), R(ry), Y); const ang = 2 * Math.PI * (FREQ.mouse / SLOW) * t; droplet(fade(c, mc), mx + Math.cos(ang) * rx, my + Math.sin(ang) * ry, Math.max(3, 3 * G.z)); dtext(c, "TIGHT CIRCLE", mx - tw(c, "TIGHT CIRCLE", 2) / 2, my - 52 * G.z, Y, mc, 2); }
    const tag = (wx, h, str, at, col) => { const a = smooth(t, at, at + 0.35) * (1 - smooth(t, OUT[0], OUT[0] + 0.4)); if (a <= 0) return; const w = tw(c, str, 2) + 16, x = G.X(wx) - w / 2, y = G.Y(-h) - 40; panel(c, R(x), R(y), R(w), 26, a, col); dtext(c, str, x + 8, y + 6, col, a, 2); };
    tag(animalX(LINE[0], t), 14, "30/S", EV.lbl30, Y); tag(animalX(LINE[1], t), 18, "18/S", EV.lbl18, Y); tag(0, 78, "4.5/S", IN[1], L); tag(animalX(bear, t), 80, "4/S", EV.lbl4, Y);
  }
  return { cam, G, d, gx, gy, s };
}

function hud(c, t, w) {
  // water meter (opening)
  const wm = win(t, EV.meter[0], EV.freeze[1] - 0.2, 0.3, 0.3);
  if (wm > 0) { panel(c, 20, 200, 214, 52, wm); dtext(c, "WATER IN FUR", 32, 208, L, wm, 1); const k = 1 - 0.7 * smooth(t, EV.meter[1], EV.meter[2]); for (let i = 0; i < 16; i++) fade(c, wm).rect(32 + i * 12, 224, 9, 16, i / 16 < k ? "#A9C4FF" : p3); if (t > EV.seconds) dtext(c, "-70%", 160, 207, Y, wm * smooth(t, EV.seconds, EV.seconds + 0.3), 1); }
  // freeze: time-stop badge
  const fz = win(t, EV.freeze[0] + 0.05, EV.freeze[1] - 0.25, 0.2, 0.25);
  if (fz > 0) { panel(c, 330, 200, 190, 30, fz, Y); const f = fade(c, fz); f.rect(344, 207, 5, 16, Y); f.rect(353, 207, 5, 16, Y); dtext(c, "PHYSICS", 368, 208, Y, fz * smooth(t, EV.physics, EV.physics + 0.3), 2); dtext(c, "PAUSE", 368, 208, MU, fz * (1 - smooth(t, EV.physics, EV.physics + 0.3)), 2); }
  // slow-mo badge
  const sm = Math.max(win(t, EV.slowmo, 31.3), win(t, EV.lineup - 0.3, OUT[0], 0.3, 0.4));
  if (sm > 0) { panel(c, 20, 200, 154, 30, sm, p7); dtext(c, "SLOW-MO X8", 32, 208, L, sm, 2); }
  // 4.5 per second counter
  const ct = win(t, EV.counter, 31.3, 0.3, 0.3);
  if (ct > 0) { panel(c, 336, 200, 184, 60, ct, Y); dtext(c, "4.5", 348, 210, Y, ct, 4); dtext(c, "SHAKES", 428, 212, IV, ct, 2); dtext(c, "PER SEC", 428, 234, IV, ct, 2); }
  // x-ray gauges above the back: spine ±30°, loose skin ±90° (×3)
  const sp = win(t, EV.spine, 31.3, 0.35, 0.3), sk = win(t, EV.skin, 31.3, 0.35, 0.3);
  if (sp > 0) { const cx = R(w.gx + 6 * w.s), cy = R(w.gy - 92 * w.s), ph = w.d.phase;
    const gauge = (r, deg, col, a, lag) => { if (a <= 0) return; const f = fade(c, a); for (let k = 0; k < 2; k++) f.ering(cx, cy, r + k, R((r + k) * 0.6), col, -Math.PI / 2 - deg * Math.PI / 180, -Math.PI / 2 + deg * Math.PI / 180); const ang = -Math.PI / 2 + (deg * Math.PI / 180) * Math.sin(ph - lag); f.line(cx, cy, R(cx + Math.cos(ang) * r), R(cy + Math.sin(ang) * r * 0.6), col); f.disc(R(cx + Math.cos(ang) * r), R(cy + Math.sin(ang) * r * 0.6), 3, col); };
    gauge(46, 30, L, sp, 0); gauge(96, 90, Y, sk, 0.5);
    panel(c, 20, 270, 118, 44, sp, L); dtext(c, "SPINE", 30, 278, L, sp, 2); dtext(c, "±30°", 30, 296, IV, sp, 1);
    panel(c, 392, 270, 128, 44, sk, Y); dtext(c, "LOOSE SKIN", 402, 278, Y, sk, 1); dtext(c, "±90°", 402, 292, IV, sk, 2);
    const x3 = win(t, EV.x3, 31.3, 0.25, 0.3); if (x3 > 0) { panel(c, 402, 320, 92, 44, x3, Y); dtext(c, "X3", 424, 328, Y, x3, 4); } }
  // energy panel (macro fur)
  const en = win(t, EV.evap, EV.macroOut[0] - 0.2, 0.35, 0.35);
  if (en > 0) { panel(c, 30, 204, 480, 104, en, Y); dtext(c, "DRYING BY EVAPORATION", 44, 214, IV, en, 2); const k = 1 - 0.2 * smooth(t, EV.drain[0], EV.drain[1]);
    for (let i = 0; i < 20; i++) fade(c, en).rect(44 + i * 22, 240, 18, 22, i / 20 < k ? (i > 15 ? YL : Y) : "#4A1E2A");
    const l60 = smooth(t, EV.lb60, EV.lb60 + 0.3) * en, l1 = smooth(t, EV.lb1, EV.lb1 + 0.3) * en, f5 = smooth(t, EV.fifth, EV.fifth + 0.3) * en;
    dtext(c, "60 LB DOG", 44, 274, L, l60, 2); dtext(c, "+ 1 LB WATER", 172, 274, "#A9C4FF", l1, 2); dtext(c, "-20% DAILY ENERGY", 330, 274, Y, f5, 1); dtext(c, "1/5", 446, 286, YL, f5, 2); }
  // washing machine
  const wa = win(t, EV.washer[0], EV.washer[1], 0.35, 0.3);
  if (wa > 0) { panel(c, 352, 200, 168, 168, wa, Y); drawWasher(c, 394, 214, 1.0, t, wa); dtext(c, "SPIN CYCLE", 368, 340, Y, wa, 2); }
}

// pixel outro (same pack as the Kagenami films)
function outroScene(c, t) {
  for (let i = 0; i < 60; i++) c.px((i * 211) % GW, TOP + ((i * 137) % (BOT - TOP)), i % 5 ? "#2A2140" : MU);
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

function frame(t) {
  overlays.length = 0;
  const c = new Canvas(GW, GH, K), outro = smooth(t, EV.outroIn[0], EV.outroIn[1]);
  if (outro < 1) {
    const w = world(c, t);
    const ma = smooth(t, EV.macroIn[0] + 0.55, EV.macroIn[1]) * (1 - smooth(t, EV.macroOut[0], EV.macroOut[0] + 0.55));
    if (ma > 0) { layer.d.set(c.d); drawMacroFur(layer, t); dissolve(c, layer, ma); }
    const da = smooth(t, EV.dropIn[0] + 0.5, EV.dropIn[1]) * (1 - smooth(t, EV.dropOut[0], EV.dropOut[0] + 0.5));
    if (da > 0) { layer.d.set(c.d); drawDropletScene(layer, t, EV); dissolve(c, layer, da); }
    hud(c, t, w);
  }
  if (outro > 0) { layer.d.fill(0); outroScene(layer, t); dissolve(c, layer, outro); }
  c.rect(0, 0, GW, TOP - 2, K); c.rect(0, BOT + 2, GW, GH - BOT - 2, K);
  for (let x = 0; x < GW; x++) for (let j = 0; j < 8; j++) { if (bayer(x, TOP - 2 + j) > j / 8) c.px(x, TOP - 2 + j, K); if (bayer(x, BOT + 2 - j) > j / 8) c.px(x, BOT + 2 - j, K); }
  c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 }); const dur = Math.round(END) + " S"; c.text(MAIN, dur, 469 - c.measure(MAIN, dur, { scale: 2 }), 136, MU, { scale: 2 });
  c.text(MAIN, "HOW A DOG SHAKES DRY", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
  overlays.push({ img: A.avatar, x: 76, y: 254, alpha: 1 });
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  for (const { img, x, y } of overlays) for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const k = (j * img.w + i) * 4, a = img.data[k + 3] / 255; if (!a) continue; const o = ((y + j) * 1080 + x + i) * 3; for (let q = 0; q < 3; q++) FULL[o + q] = FULL[o + q] * (1 - a) + img.data[k + q] * a; }
  return FULL;
}
await loadAssets();
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
