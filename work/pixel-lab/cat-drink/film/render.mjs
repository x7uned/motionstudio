// «How your cat drinks» — pixel film, flat side view, loop. 540×960 grid ×2 → 1080×1920, 30 fps. No header overlay:
// the picture runs to the top and bottom edges; captions sit over a soft dithered shade.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawKitchen, drawBowl, drawForeground, ground, wallLayer } from "./kitchen.mjs";
import { drawCat, catSilhouette } from "./cat.mjs";
import { drawDog3 } from "./dog-drink.mjs";
import { drawMacro } from "./macro.mjs";
import { EV, CAM, END, FPS, WORDS, VOICE, LAP_HZ } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, K = "#000000", R = Math.round;
const C = { O: "#0B0812", CARD: "#120C1D", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", MU: "#959595", p3: "#3B2C5C", p5: "#6E4FB0", p7: "#B08AE8", GR: "#65DA41" };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const CAT_X = -50, CAT_S = 0.9, DOG_X = 331, DOG_S = 1.0, FEED_X = 262, FEED_H = 34, CAMERA_X = -150, WATER_Y = -8.6;
const RED = ["#5A1A2A", "#8A2A3E", "#B83A50", "#E03056", "#F29AA6"];

// ---------------------------------------------------------------- camera
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) };
}

// ---------------------------------------------------------------- HUD helpers
function panel(c, x, y, w, h, a = 1, edge = C.p7) { if (a <= 0) return; const g = fade(c, a); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, C.p5, 2); for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(C.CARD, "#1D1430", (j - y) / h)); }
const dtext = (c, s, x, y, col, a = 1, scale = 2) => { if (a > 0) fade(c, a).text(MAIN, s, R(x), R(y), col, { scale }); };
const tw = (c, s, scale = 2) => c.measure(MAIN, s, { scale });
function tag(c, lines, cx, y, a, col = C.Y, scale = 2) { if (a <= 0) return; const w = Math.max(...lines.map((l) => tw(c, l, scale))) + 20, h = lines.length * (8 * scale + 4) + 10, x = R(Math.max(12, Math.min(GW - 12 - w, cx - w / 2))); panel(c, x, R(y), w, h, a, col); lines.forEach((l, i) => dtext(c, l, x + 10, R(y) + 7 + i * (8 * scale + 4), i ? C.IV : col, a, scale)); return { x, w, h }; }

// ---------------------------------------------------------------- the cat's lapping ripples (periodic over the loop)
function catRipples(t) {
  const out = [], k1 = Math.floor(t * LAP_HZ), k0 = Math.floor((t - 0.7) * LAP_HZ);
  for (let k = k0; k <= k1; k++) { const tk = (k + 0.3) / LAP_HZ, age = t - tk; if (age < 0 || age > 0.7) continue; out.push({ x: -5.7, r: 2 + age * 22, a: 1 - age / 0.7 }); }
  return out;
}

// ---------------------------------------------------------------- the high-speed camera on its tripod (world space)
function drawSpeedCam(c, G, t) {
  const roll = ease((t - EV.camIn[0]) / (EV.camIn[1] - EV.camIn[0])), wx = t < EV.camIn[0] ? -290 : lerp(-290, CAMERA_X, roll), z = G.z;
  const X = (u) => G.X(wx + u), Y = G.Y; if (X(40) < -10 || X(-30) > GW + 10) return;
  for (const [u0, u1] of [[0, -16], [0, 0], [0, 15]]) for (let k = 0; k < Math.max(1, R(z)); k++) c.line(R(X(u0)) + k, R(Y(-40)), R(X(u1)) + k, R(Y(0)), u1 === 0 ? "#2A2140" : "#523D82");
  c.rect(R(X(-6)), R(Y(-44)), R(12 * z), R(5 * z), "#2A2140");
  c.rect(R(X(-17)), R(Y(-62)), R(34 * z), R(18 * z), "#3B3252"); c.rect(R(X(-17)), R(Y(-62)), R(34 * z), Math.max(1, R(2 * z)), "#6E6A96"); c.frame(R(X(-17)), R(Y(-62)), R(34 * z), R(18 * z), "#0B0812");
  c.rect(R(X(17)), R(Y(-58)), R(10 * z), R(10 * z), "#2A2140"); c.disc(R(X(28)), R(Y(-53)), Math.max(2, R(5.5 * z)), "#0B0812"); c.disc(R(X(28)), R(Y(-53)), Math.max(1, R(4 * z)), "#33458A"); c.px(R(X(26.5)), R(Y(-55)), "#D8E4FF");
  const rec = t >= EV.rec ? 0.55 + 0.45 * Math.sin((2 * Math.PI * 1.5 * (t - EV.rec))) : 0; if (rec > 0) fade(c, smooth(t, EV.rec, EV.rec + 0.2)).disc(R(X(-12)), R(Y(-57)), Math.max(1, R(2 * z)), mix("#5A1A2A", C.PK, rec));
  if (z >= 1.6) { c.text(TINY, "MIT", R(X(-4)), R(Y(-55)), C.IV, { scale: Math.max(1, R(z / 1.4)) }); }
}

// ---------------------------------------------------------------- the shadow on the wall: the cat, then a lion lapping slower
const LION = {
  torso: [[20, 26], [34, 20], [56, 19], [72, 22], [80, 28], [82, 38], [76, 44], [58, 46], [36, 46], [24, 44], [18, 36]],
  legs: [[[24, 40], [31, 40], [30, 52], [33, 60], [24, 60]], [[33, 40], [41, 40], [40, 52], [42, 60], [33, 60]], [[66, 40], [72, 40], [73, 60], [66, 60]], [[73, 38], [80, 38], [81, 60], [74, 60]]],
  muzzle: [[86, 38], [95, 42], [99, 51], [93, 56], [86, 51]],
};
function drawShadows(c, cam, t) {
  const a = win(t, EV.macroOut[0] + 0.4, EV.dogsPan[0] + 0.2, 0.6, 0.6); if (a <= 0) return;
  const L = wallLayer(cam), morph = smooth(t, EV.tigers, EV.tigers + 0.9), grow = lerp(2.0, 2.35, morph);
  const T = (sc) => ([x, y]) => [L.X(10 + (x - 55) * sc * CAT_S), L.Y(-22 + (y - 60) * sc * CAT_S)];
  const col = "#110B20";
  const catA = a * (1 - morph), lionA = a * morph;
  if (catA > 0) { const g = fade(c, catA * 0.92), p = (t * LAP_HZ) % 1; for (const poly of catSilhouette(T(grow), Math.sin(2 * Math.PI * p))) g.poly(poly, col); }
  if (lionA > 0) { const g = fade(c, lionA * 0.92), tr = T(grow), bob = 1.8 * Math.max(0, Math.sin(2 * Math.PI * 1.6 * t)), hd = ([x, y]) => tr([x, y + bob]);
    g.poly(LION.torso.map(tr), col); for (const l of LION.legs) g.poly(l.map(tr), col);
    // mane: a jagged ring round the lowered head, then the muzzle reaching down to drink
    const [mx, my] = hd([83, 37]), mr = 15 * grow * CAT_S * L.z; for (let k = 0; k < 22; k++) { const ang = (2 * Math.PI * k) / 22, r2 = mr * (k % 2 ? 1.22 : 0.95); g.poly([[mx, my], [mx + Math.cos(ang - 0.18) * mr * 0.9, my + Math.sin(ang - 0.18) * mr * 0.9], [mx + Math.cos(ang) * r2, my + Math.sin(ang) * r2], [mx + Math.cos(ang + 0.18) * mr * 0.9, my + Math.sin(ang + 0.18) * mr * 0.9]], col); }
    g.disc(R(mx), R(my), R(mr * 0.92), col); g.poly(LION.muzzle.map(hd), col);
    { const ear = [[78, 25], [80, 20], [83, 25]].map(hd); g.poly(ear, col); }
    const tail = [[19, 30], [12, 35], [9, 44], [11, 52]].map(tr), lw = Math.max(1, R(1.2 * grow * L.z * CAT_S)); for (let i = 0; i < tail.length - 1; i++) for (let k = -lw; k <= lw; k++) g.line(R(tail[i][0]) + k, R(tail[i][1]), R(tail[i + 1][0]) + k, R(tail[i + 1][1]), col); const tp = tail[tail.length - 1]; g.disc(R(tp[0]), R(tp[1] + 2 * grow * L.z), R(3.6 * grow * L.z * CAT_S), col); }
}

// ---------------------------------------------------------------- the dog at its raised feeder: laps hard, splashes
const DOG_HZ = 3.0;
const SPLASH = [];
for (let k = 0; k < 400; k++) for (let i = 0; i < 22; i++) { const id = k * 22 + i; SPLASH.push({ k, i, t0: (k + 0.45) / DOG_HZ + rnd(id * 9) * 0.06, vx: (rnd(id * 3) - 0.5) * 120, vy: -30 - rnd(id * 5) * 75, r: rnd(id * 7) < 0.35 ? 2.6 : 1.7 }); }
function drawDog(c, G, t) {
  const p = (t * DOG_HZ) % 1, slap = Math.sin(Math.PI * Math.min(1, p / 0.5)) * (p < 0.5 ? 1 : 0);
  const gx = G.X(DOG_X), gy = G.Y(0), s = DOG_S * G.z; if (gx < -200 || gx > GW + 200) return null;
  c.ellipse(R(gx), R(gy + 2), R(52 * s), R(4 * s), "#15102A");
  const d = drawDog3(c, gx, gy, s, { nod: -0.5 - 0.05 * slap, wet: 0, light: [-0.7, -0.7], litOutline: C.L });
  const m = d.H([5, 26.5]), wy = G.Y(-10 - FEED_H - 1.5), reach = slap;
  if (reach > 0.05) { const w = Math.max(2, R(3.2 * s)); c.rect(R(m[0] - w / 2), R(m[1]), w, Math.max(1, R((wy - m[1]) * reach + 2)), "#E26E80"); c.rect(R(m[0] - w / 2), R(m[1] + (wy - m[1]) * reach), w + 2, 2, "#C84A62"); }
  return { mouthX: m[0], waterY: wy };
}
function drawSplash(c, G, t) {
  const show = smooth(t, EV.dogsPan[0], EV.dogsPan[0] + 0.4) * (1 - smooth(t, EV.backPan[0] + 1.2, EV.backPan[0] + 2)); if (show <= 0) return;
  const hard = smooth(t, EV.harder - 0.3, EV.harder + 0.2), big = win(t, EV.splash - 0.1, EV.splash + 0.6, 0.1, 0.5);
  for (const q of SPLASH) { const age = t - q.t0; if (age < 0 || age > 0.8) continue; if (!hard && q.i > 7) continue;
    const boost = 1 + hard * 0.35 + big * 0.9, wx = FEED_X - 4 + q.vx * age * boost, wy = -10 - FEED_H - 2 + q.vy * age * boost + 0.5 * 260 * age * age; if (wy > 0) continue;
    const x = G.X(wx), y = G.Y(wy); const g = fade(c, show * (1 - age / 0.8)), sz = Math.max(2, R(q.r * G.z)); g.rect(R(x), R(y), sz, sz, "#A9C4FF"); g.px(R(x), R(y), "#FDFEED"); }
}
function drawPuddle(c, G, t) {
  const k = smooth(t, EV.dogsPan[0] + 0.3, EV.splash + 1.0); if (k <= 0 || t < 30) return;
  const x = G.X(FEED_X + 6), y = G.Y(3), rx = (10 + 26 * k) * G.z, ry = (1.5 + 2.5 * k) * G.z; fade(c, 0.8).ellipse(R(x), R(y), R(rx), R(ry), "#33458A"); fade(c, 0.8).ellipse(R(x - rx * 0.2), R(y - ry * 0.3), R(rx * 0.5), Math.max(1, R(ry * 0.4)), "#5470B8");
}

// ---------------------------------------------------------------- captions (karaoke, same style as the earlier pixel films)
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
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, C.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : C.O) });
      c.text(MAIN, txt, x, y0, C.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(C.IV, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? C.IV : C.Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- frame
const layer = new Canvas(GW, GH, K), tmp = new Canvas(GW, GH, K);
function dissolve(c, src, a) { if (a >= 1) { c.d.set(src.d); return; } if (a <= 0) return; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = src.d[i]; c.d[i + 1] = src.d[i + 1]; c.d[i + 2] = src.d[i + 2]; } }

function world(c, t) {
  const cam = camera(t), G = ground(cam), p = (((t * LAP_HZ) % 1) + 1) % 1;
  drawKitchen(c, cam, t, END);
  drawShadows(c, cam, t);
  drawSpeedCam(c, G, t);
  // the dog's raised feeder, the dog, its splashes and puddle
  drawPuddle(c, G, t);
  drawBowl(c, G, FEED_X, "back", { stand: FEED_H, color: RED, r: 18 });
  const dog = drawDog(c, G, t);
  drawBowl(c, G, FEED_X, "front", { stand: FEED_H, color: RED, r: 18 });
  drawSplash(c, G, t);
  // the cat and its bowl
  c.ellipse(R(G.X(-42)), R(G.Y(1)), R(52 * G.z), Math.max(1, R(3 * G.z)), "#15102A");
  drawBowl(c, G, 0, "back", { ripples: catRipples(t) });
  const cat = drawCat(c, G.X(CAT_X), G.Y(0), G.z * CAT_S, { p, waterY: G.Y(WATER_Y) });
  drawBowl(c, G, 0, "front", {});
  drawForeground(c, cam, t);
  return { cam, G, cat, dog };
}

function hud(c, t, w) {
  const { G } = w;
  // opening: "no scooping" over the cat, then the lap counter
  { const a = win(t, EV.scoop, EV.four - 0.35, 0.3, 0.3); if (a > 0) { const r = tag(c, ["NO SCOOPING"], G.X(-20), 300, a, C.Y, 3); const g = fade(c, a); g.line(R(G.X(-6)), r ? 300 + r.h : 340, R(G.X(-6)), R(G.Y(-16)), C.Y); } }
  { const a = win(t, EV.four, EV.camIn[0] + 0.2, 0.3, 0.35); if (a > 0) { panel(c, 150, 250, 240, 112, a, C.Y); dtext(c, "4", 172, 266, C.Y, a, 6); dtext(c, "LAPS", 226, 266, C.IV, a, 3); dtext(c, "PER SECOND", 226, 296, C.IV, a, 2);
    const f = smooth(t, EV.see - 0.7, EV.see - 0.3) * a; if (f > 0) { dtext(c, "TOO FAST TO SEE", 172, 330, C.PK, f, 2); }
    const pulse = 0.5 + 0.5 * Math.cos(2 * Math.PI * ((t * LAP_HZ) % 1)); fade(c, a * pulse).disc(368, 270, 6, C.Y); } }
  // the high-speed camera and the cat's name
  { const a = win(t, EV.mit, EV.diveIn[0] - 0.1, 0.3, 0.3); if (a > 0) tag(c, ["MIT", "HIGH-SPEED CAMERA"], G.X(CAMERA_X + 6), R(G.Y(-62)) - 74, a, C.L, 2); }
  { const a = win(t, EV.name, EV.diveIn[0] - 0.1, 0.3, 0.3); if (a > 0) { const r = tag(c, ["CUTTA CUTTA"], G.X(-20), R(G.Y(-46)) - 60, a, C.Y, 2); if (r) fade(c, a).line(R(G.X(-12)), R(G.Y(-46)) - 60 + r.h, R(G.X(-12)), R(G.Y(-42)), C.Y); } }
  // lions and tigers
  { const a1 = win(t, EV.wideAt, EV.dogsPan[0], 0.3, 0.35), a2 = win(t, EV.slower, EV.dogsPan[0], 0.3, 0.35), a3 = win(t, EV.bigger, EV.dogsPan[0], 0.3, 0.35);
    if (a1 > 0) tag(c, ["SAME TRICK"], 270, 112, a1, C.Y, 3);
    if (a2 > 0) { panel(c, 60, 170, 200, 44, a2, C.L); dtext(c, "CAT", 74, 184, C.L, a2, 2); dtext(c, "FAST", 128, 184, C.IV, a2, 2); fade(c, a2 * (0.5 + 0.5 * Math.cos(2 * Math.PI * ((t * LAP_HZ) % 1)))).disc(240, 191, 6, C.Y);
      panel(c, 280, 170, 200, 44, a2, C.L); dtext(c, "LION", 294, 184, C.L, a2, 2); dtext(c, "SLOWER", 360, 184, C.IV, a2, 2); fade(c, a2 * (0.5 + 0.5 * Math.cos(2 * Math.PI * 1.6 * t))).disc(460, 191, 6, C.Y); }
    if (a3 > 0) tag(c, ["BIGGER TONGUE"], 370, 232, a3, C.PK, 2); }
  // dogs
  { const end = EV.backPan[0] + 0.3, a1 = win(t, EV.sameWay, end, 0.3, 0.35), a2 = win(t, EV.harder, end, 0.3, 0.35), a3 = win(t, EV.splash, end, 0.2, 0.35);
    if (a1 > 0) tag(c, ["SAME TRICK"], 270, 112, a1, C.Y, 3);
    if (a2 > 0) tag(c, ["MUCH HARDER"], 270, 170, a2, C.PK, 3);
    if (a3 > 0 && w.dog) tag(c, ["SPLASH!"], w.dog.mouthX - 60, R(w.dog.waterY) - 150, a3, C.L, 3); }
}

export function frame(t) {
  const c = new Canvas(GW, GH, K);
  const w = world(c, t);
  const ma = smooth(t, EV.macroIn[0], EV.macroIn[1]) * (1 - smooth(t, EV.macroOut[0], EV.macroOut[0] + 0.55));
  if (ma > 0) { layer.d.fill(0); drawMacro(layer, t, EV, tmp); dissolve(c, layer, ma); }
  hud(c, t, w);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin(Math.PI * (y - 640) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  return FULL;
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
