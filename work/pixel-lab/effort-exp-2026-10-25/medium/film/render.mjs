// «Pumpkin face» — 10 s Halloween pixel film (effort experiment, medium). 540×960 grid ×2 nearest → 1080×1920, 30 fps.
// One persistent night scene: purple sky, moon, fog, a carved pumpkin on a hill. The two holes and the line are carved on
// their words, face-detect brackets lock on "sees a face", a brain grows in above, a signal runs eyes → face area while
// a counter runs 0 → 165 ms ("a sixth of a second"), the face area lights up on "lights up", the pumpkin grins and winks.
// No overlay; karaoke captions (orange highlight) over a soft dithered shade.
// node render.mjs --stills 1,4,8 | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, fade, hex } from "../../../../../renderer/pixel/raster.mjs";
import { EV, B, END, FPS, WORDS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, R = Math.round, TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const C = { O: "#0B0812", IV: "#FDFEED", OR: "#F08A3C", GO: "#F4CA50", MOON: "#B9C8F0", INK: "#140C1E" };
const dith = (ramp, v, x, y) => { const s = clamp01(v) * (ramp.length - 1), lo = Math.floor(s); return ramp[Math.min(ramp.length - 1, s - lo > bayer(x, y) ? lo + 1 : lo)]; };
const setPx = (c, x, y, rgb) => { const i = (y * GW + x) * 3; c.d[i] = rgb[0]; c.d[i + 1] = rgb[1]; c.d[i + 2] = rgb[2]; };
const blendPx = (c, x, y, rgb, k) => { if (k <= 0 || x < 0 || y < 0 || x >= GW || y >= GH) return; const i = (y * GW + x) * 3; for (let j = 0; j < 3; j++) c.d[i + j] = c.d[i + j] + (rgb[j] - c.d[i + j]) * Math.min(1, k); };
const H = (s) => hex(s);

// ---------------------------------------------------------------- candle light (smooth flicker, no one-frame jumps)
const flick = (t) => 0.82 + 0.09 * Math.sin(t * 7.1) + 0.06 * Math.sin(t * 12.7 + 1.3) + 0.03 * Math.sin(t * 23.3 + 0.4);
const carved = (t) => Math.max(sm(t, B.eyeL[0], B.eyeL[1]), sm(t, B.eyeR[0], B.eyeR[1]), sm(t, B.mouth[0], B.mouth[1]));
const glow = (t) => carved(t) * flick(t) * (0.75 + 0.25 * sm(t, EV.face - 0.1, EV.face + 0.35) + 0.25 * Math.sin(Math.PI * sm(t, B.pumpGlow[0], B.pumpGlow[1])) + 0.12 * sm(t, B.smile[0], B.smile[1]));

// ---------------------------------------------------------------- static backdrop (cached): sky, moon, hill, graves, tree
const SKY = ["#140D22", "#1D1430", "#261A3E", "#30224D", "#3B2C5C"];
const BACK = new Canvas(GW, GH, "#000000");
{
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) setPx(BACK, x, y, H(dith(SKY, 0.1 + 0.85 * (y / 640), x, y)));
  // moon: big, upper right, with dithered craters and a cool halo
  const mx = 430, my = 150, mr = 44;
  for (let y = my - 120; y < my + 120; y++) for (let x = mx - 120; x < Math.min(GW, mx + 120); x++) { if (y < 0) continue; const d = Math.hypot(x - mx, y - my);
    if (d > mr) blendPx(BACK, x, y, H(C.MOON), 0.28 * Math.max(0, 1 - (d - mr) / 75) > bayer(x, y) * 0.9 ? 0.18 : 0); }
  for (let y = my - mr; y <= my + mr; y++) for (let x = mx - mr; x <= mx + mr; x++) { const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy); if (d > mr) continue;
    let v = 0.78 + 0.22 * (-dx - dy) / (mr * 1.4) - 0.1 * (d / mr) ** 3;
    for (const [cx, cy, cr] of [[-14, -10, 9], [12, 8, 12], [-6, 20, 6], [20, -18, 5]]) if (Math.hypot(dx - cx, dy - cy) < cr) v -= 0.2;
    setPx(BACK, x, y, H(dith(["#6F7AA8", "#8E9BCB", "#B9C8F0", "#E2E9FB"], v, x, y))); }
  // far hills (two bands), graves and a dead tree as silhouettes
  for (let x = 0; x < GW; x++) {
    const h1 = 600 - 22 * Math.sin(x * 0.011 + 0.8) - 12 * Math.sin(x * 0.031), h2 = 640 - 30 * Math.cos((x - 270) * 0.006);
    for (let y = R(h1); y < GH; y++) setPx(BACK, x, y, H(y < h2 ? "#22183A" : "#160F26"));
  }
  const grave = (gx, gy, w, h) => { for (let y = gy - h; y < gy; y++) for (let x = gx - w; x <= gx + w; x++) { const top = gy - h + w - Math.sqrt(Math.max(0, w * w - (x - gx) ** 2)); if (y >= top) setPx(BACK, x, y, H(x === gx - w || y === R(top) ? "#3A2C58" : "#1B1230")); } };
  grave(70, 628, 13, 34); grave(112, 634, 9, 22); grave(470, 630, 12, 30); grave(430, 638, 8, 18);
  const tree = (x0, y0, x1, y1, w) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) { const k = i / n, x = lerp(x0, x1, k), y = lerp(y0, y1, k), ww = lerp(w, 1, k); for (let j = -ww; j <= ww; j++) BACK.px(R(x + j), R(y), "#0E0919"); } };
  tree(26, 640, 30, 420, 6); tree(29, 520, 70, 470, 3); tree(28, 470, 4, 420, 2); tree(50, 488, 64, 440, 1.5); tree(29, 440, 46, 395, 2);
  // a single cobweb in the top-left corner (background zone)
  for (let k = 0; k < 6; k++) { const a = (k / 5) * (Math.PI / 2); BACK.line(0, 0, R(Math.cos(a) * 70), R(Math.sin(a) * 70), "#4A3E68"); }
  for (const r of [22, 40, 58]) for (let k = 0; k < 5; k++) { const a0 = (k / 5) * (Math.PI / 2), a1 = ((k + 1) / 5) * (Math.PI / 2); BACK.line(R(Math.cos(a0) * r), R(Math.sin(a0) * r), R(Math.cos(a1) * r), R(Math.sin(a1) * r), "#4A3E68"); }
}
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: R(rnd(i * 3 + 1) * 540), y: R(rnd(i * 3 + 2) * 520), ph: rnd(i * 3 + 3) * TAU, big: rnd(i * 7) > 0.85 }));

function backdrop(c, t) {
  c.d.set(BACK.d);
  for (const s of STARS) { if (Math.hypot(s.x - 430, s.y - 150) < 80) continue; const k = 0.5 + 0.5 * Math.sin(t * 2.1 + s.ph); blendPx(c, s.x, s.y, H("#E8E0FF"), 0.35 + 0.6 * k);
    if (s.big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendPx(c, s.x + dx, s.y + dy, H("#C8B8F0"), 0.5 * k); }
  // bats in the top band (background zone): continuous wing flap, they cross and leave
  for (const [t0, dur, y0, dir, s] of [[-0.6, 3.6, 70, 1, 1], [-0.2, 4.2, 100, 1, 0.8], [4.6, 3.8, 82, -1, 0.9], [6.0, 4.6, 110, -1, 0.7]]) {
    const u = (t - t0) / dur; if (u < 0 || u > 1) continue; const x = dir > 0 ? lerp(-30, 570, u) : lerp(570, -30, u), y = y0 + 10 * Math.sin(u * 9), w = Math.sin(t * 16 + t0) * 0.8;
    bat(c, x, y, s, w); }
}
function bat(c, x, y, s, w) {
  const col = "#0A0612";
  for (let i = -14; i <= 14; i++) { const ax = Math.abs(i), yy = y + (ax * w * 0.7) * s - (ax > 9 ? (ax - 9) * 0.5 : 0); for (let j = 0; j < Math.max(1, 3 - ax / 6); j++) c.px(R(x + i * s), R(yy + j), col); }
  c.rect(R(x - 2), R(y - 2), 4, 5, col); c.px(R(x - 2), R(y - 3), col); c.px(R(x + 1), R(y - 3), col);
}

// fog: drifting dithered bands near the ground; back layer behind the pumpkin, a thin front layer over its base
function fog(c, t, y0, y1, amt) {
  const fc = H("#8C7DB4");
  for (let y = y0; y < y1; y++) { const vy = Math.sin(Math.PI * (y - y0) / (y1 - y0)); for (let x = 0; x < GW; x++) {
    const n = 0.5 + 0.25 * Math.sin(x * 0.021 + t * 0.5 + y * 0.05) + 0.25 * Math.sin(x * 0.047 - t * 0.8 + y * 0.11);
    const a = amt * vy * n; if (a > bayer(x, y) * 1.6) blendPx(c, x, y, fc, 0.22 + 0.18 * n); } }
}

// ---------------------------------------------------------------- the pumpkin (per-pixel, rocks gently about its base)
const P = { cx: 270, cy: 488, rx: 150, ry: 112 };
const PUMP = ["#3E140A", "#6A2410", "#9C3A14", "#CC5A1C", "#F08A3C", "#F8B868"];
const holeL = { x: -52, y: -22, rx: 24, ry: 28 }, holeR = { x: 52, y: -22, rx: 24, ry: 28 };
function pumpkin(c, t) {
  const th = 0.03 * Math.sin(TAU * t / 2.7) + 0.012 * Math.sin(TAU * t / 1.3), pvx = P.cx, pvy = P.cy + P.ry, co = Math.cos(-th), si = Math.sin(-th);
  const bob = 1.5 * Math.sin(TAU * t / 1.35), g = glow(t);
  const eL = easeOut((t - B.eyeL[0]) / (B.eyeL[1] - B.eyeL[0])), eR = easeOut((t - B.eyeR[0]) / (B.eyeR[1] - B.eyeR[0]));
  const mk = easeOut((t - B.mouth[0]) / (B.mouth[1] - B.mouth[0])), smile = sm(t, B.smile[0], B.smile[1]);
  const wk = Math.sin(Math.PI * sm(t, B.wink[0], B.wink[1])), winkY = 1 - 0.72 * wk;
  const inside = (hx, hy, h, k, sy = 1) => { if (k <= 0) return 2; const rx = h.rx * (0.25 + 0.75 * k), ry = h.ry * (0.25 + 0.75 * k) * sy; return ((hx - h.x) / rx) ** 2 + ((hy - h.y - (1 - sy) * h.ry * 0.5) / ry) ** 2; };
  const mouthY = (hx) => 38 + smile * (8 - 22 * (hx / 66) ** 2), mouthW = 66;
  const holeCol = (v, x, y) => H(dith(["#B8461A", "#F08A3C", "#F4CA50", "#FFF0B0"], v, x, y));
  for (let y = 330; y < 620; y++) for (let x = 100; x < 440; x++) {
    const dx = x - pvx, dy = y - pvy - bob, ux = dx * co - dy * si, uy = dx * si + dy * co + P.ry;   // local coords, centre = 0
    const nx = ux / P.rx, ny = uy / P.ry;
    // stem (above the body), curved
    if (uy < -P.ry + 14 && uy > -P.ry - 34) { const sx = 4 + 6 * ((-P.ry + 14 - uy) / 48) ** 2; if (Math.abs(ux - sx) < 9 - (uy < -P.ry - 26 ? 2 : 0)) { const e = Math.abs(ux - sx) > 7; setPx(c, x, y, H(e ? C.INK : dith(["#2C3A18", "#4A5E22", "#6E8430"], 0.5 - (ux - sx) / 14, x, y))); continue; } }
    // body: ribbed outline (5 lobes), flattened top/bottom dents
    const lobe = 1 - 0.035 * Math.abs(Math.sin(nx * Math.PI * 2.5)) * (Math.abs(ny) > 0.6 ? 1 : 0.3);
    const d = nx * nx + ny * ny * (1 + 0.15 * (ny < 0 ? 1 : 0) * Math.exp(-nx * nx * 20)), rr = lobe * lobe;
    if (d > rr * 1.035) continue;
    if (d > rr) { setPx(c, x, y, H(C.INK)); continue; }
    // features: holes and the mouth line, carved progressively; light from the candle inside
    const iL = inside(ux, uy, holeL, eL, winkY), iR = inside(ux, uy, holeR, eR);
    const mx = ux / mouthW, my = uy - mouthY(ux), inMouth = mk > 0 && mx > -1 && mx < -1 + 2 * mk && Math.abs(my) < 6.5 * (1 - mx * mx * 0.25);
    if (iL < 1 || iR < 1 || inMouth) {
      const edge = inMouth ? Math.abs(my) / 6.5 : Math.min(iL, iR);
      const lowerRim = inMouth ? my > 3.2 : (iL < 1 ? (uy - holeL.y) > 0 : (uy - holeR.y) > 0) && edge > 0.62;
      if (lowerRim) setPx(c, x, y, H(dith(["#C87A3C", "#E8B070", "#F6D49A"], 0.4 + 0.5 * g, x, y)));
      else { const h = iL < 1 ? holeL : holeR, vy = inMouth ? my / 6.5 : (uy - h.y) / h.ry; setPx(c, x, y, holeCol((0.25 + 0.6 * g) * (0.75 + 0.3 * vy) * (1 - 0.3 * edge), x, y)); }
      continue;
    }
    // near a feature: a dark carved lip (1–2 px)
    if (iL < 1.18 || iR < 1.18 || (mk > 0 && mx > -1.04 && mx < -1 + 2 * mk + 0.04 && Math.abs(my) < 8.5)) { setPx(c, x, y, H("#2A0E08")); continue; }
    const rib = Math.abs(Math.cos(nx * Math.PI * 2.5 / Math.max(0.35, Math.sqrt(1 - Math.min(0.9, ny * ny)))));
    let v = 0.25 + 0.55 * Math.sqrt(Math.max(0, 1 - d)) + 0.18 * (rib - 0.5) - 0.18 * ny - 0.1 * nx;
    v += 0.12 * g * Math.max(0, 1 - Math.hypot(nx, ny - 0.1) * 1.4);               // the candle warms the face
    let col = H(dith(PUMP, v, x, y));
    { const rk = clamp01((d - 0.6) / 0.38) * clamp01((nx - 0.25) / 0.35) * clamp01((-ny - 0.05) / 0.35); if (rk > bayer(x, y)) col = mix(col, C.MOON, 0.2); }   // cool moon rim
    setPx(c, x, y, col);
  }
  return { th, bob };
}
// warm light spilling from the holes onto the ground/fog and a halo around the pumpkin
function halo(c, t) {
  const g = glow(t); if (g <= 0.01) return; const oc = H(C.OR);
  for (let y = 380; y < 700; y++) for (let x = 60; x < 480; x++) { const d = Math.hypot((x - P.cx) / 1.6, (y - 520) / 1.0); const k = g * 0.32 * Math.max(0, 1 - d / 150); if (k > bayer(x, y) * 0.55) blendPx(c, x, y, oc, 0.12 + k * 0.4); }
}

// foreground (bottom background zone): small uncarved pumpkins, candles with smooth flicker, grass tufts
function foreground(c, t) {
  const small = (cx, cy, rx, ry) => { for (let y = cy - ry - 8; y <= cy + ry; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) { const nx = (x - cx) / rx, ny = (y - cy) / ry, d = nx * nx + ny * ny;
    if (y < cy - ry + 2 && Math.abs(x - cx - 1) < 3 && y > cy - ry - 8) { setPx(c, x, y, H("#3A4A1C")); continue; }
    if (d > 1.08) continue; if (d > 1) { setPx(c, x, y, H(C.INK)); continue; } const rib = Math.abs(Math.cos(nx * Math.PI * 1.5)); setPx(c, x, y, H(dith(["#3E140A", "#6A2410", "#9C3A14", "#CC5A1C"], 0.25 + 0.5 * Math.sqrt(1 - d) + 0.15 * (rib - 0.5) - 0.2 * ny + 0.15 * nx, x, y))); } };
  small(82, 815, 40, 30); small(468, 835, 34, 26);
  for (const [cx, cy, h, ph] of [[150, 850, 26, 0.3], [178, 862, 16, 1.7], [398, 868, 22, 2.4]]) {
    c.rect(cx - 5, cy - h, 10, h, "#E8DCC0"); c.rect(cx + 2, cy - h, 3, h, "#BDAE90"); c.frame(cx - 6, cy - h - 1, 12, h + 2, C.INK);
    const fl = 1 + 0.18 * Math.sin(t * 9 + ph) + 0.1 * Math.sin(t * 15.3 + ph * 2), fh = 11 * fl, sw = 1.2 * Math.sin(t * 5 + ph);
    for (let y = 0; y < fh; y++) { const w = 3.2 * Math.sin(Math.PI * Math.pow(y / fh, 0.7)); for (let x = -4; x <= 4; x++) if (Math.abs(x - sw * y / fh) < w) c.px(cx + x, R(cy - h - 2 - y), y < fh * 0.4 && Math.abs(x) < w * 0.5 ? "#FFF0B0" : y < fh * 0.75 ? C.GO : C.OR); }
    const oc = H(C.OR); for (let y = cy - h - 40; y < cy + 10; y++) for (let x = cx - 40; x < cx + 40; x++) { const d = Math.hypot(x - cx, y - cy + h); const k = 0.3 * fl * Math.max(0, 1 - d / 40); if (k > bayer(x, y) * 0.9) blendPx(c, x, y, oc, 0.2); } }
  for (let i = 0; i < 26; i++) { const x = R(rnd(i + 90) * 540), y = 770 + R(rnd(i + 190) * 170), h = 5 + R(rnd(i + 290) * 8), sw = Math.sin(t * 1.6 + i) * 1.5;
    for (let k = -1; k <= 1; k++) c.line(x + k * 3, y, R(x + k * 5 + sw), y - h + Math.abs(k) * 2, "#2C2046"); }
}

// ---------------------------------------------------------------- face-detect brackets ("your brain sees a face")
function brackets(c, t) {
  const a = Math.min(sm(t, B.lock[0], B.lock[0] + 0.25), 1 - sm(t, B.lockOut[0], B.lockOut[1])); if (a <= 0) return;
  const k = easeOut((t - B.lock[0]) / (B.lock[1] - B.lock[0])), sc = lerp(1.55, 1, k), w = 96 * sc, h = 64 * sc, cx = P.cx, cy = P.cy + 8, L = 20;
  const f = fade(c, a), col = sm(t, EV.face - 0.05, EV.face + 0.2) > 0.5 ? C.GO : "#E8D8FF";
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x0 = R(cx + sx * w), y0 = R(cy + sy * h);
    for (let o = -1; o <= 1; o++) { for (let i = 0; i < L; i++) { f.px(x0 - sx * i, y0 + o, o === 0 ? col : C.INK); f.px(x0 + o, y0 - sy * i, o === 0 ? col : C.INK); } }
    for (let i = 0; i < L; i++) { f.px(x0 - sx * i, y0 + sy * 0, col); f.px(x0 - sx * i, y0 - sy, col); f.px(x0, y0 - sy * i, col); f.px(x0 - sx, y0 - sy * i, col); } }
  // on "face": a little FACE tag under the box
  const tk = Math.min(sm(t, EV.face - 0.05, EV.face + 0.25), 1 - sm(t, B.lockOut[0], B.lockOut[1]));
  if (tk > 0) { const ft = fade(c, tk), s = "FACE", tw = c.measure(MAIN, s, { scale: 2 }), ty = R(cy + h + 8 + (1 - tk) * 6);
    ft.rect(R(cx - tw / 2) - 5, ty - 4, tw + 10, 22, C.INK); ft.text(MAIN, s, R(cx - tw / 2), ty, C.GO, { scale: 2 }); }
}

// ---------------------------------------------------------------- the brain (illustration, side view), face area underneath
const BR = { cx: 262, cy: 232 };
const BRAIN = ["#2E2048", "#4A3470", "#6E54A0", "#9A80C8", "#C8B4E8"];
const FA = { x: 252, y: 286, rx: 36, ry: 10 };                                   // ventral fusiform "face area" (illustrative)
function inBrain(x, y) {                                                          // brain-local coords
  const cer = ((x) / 108) ** 2 + ((y + 8) / 62) ** 2, tem = ((x + 14) / 64) ** 2 + ((y - 30) / 28) ** 2, cbl = ((x - 68) / 30) ** 2 + ((y - 42) / 19) ** 2;
  const sx = x - 30 + (y - 40) * 0.25, stem = sx > 0 && sx < 16 && y > 36 && y < 84;
  return Math.min(cer, tem, cbl, stem ? 0.5 : 9);
}
function brain(c, t) {
  const a = sm(t, B.brain[0], B.brain[1]); if (a <= 0) return;
  const s = lerp(0.88, 1, easeOut((t - B.brain[0]) / (B.brain[1] - B.brain[0]))), oy = (1 - easeOut((t - B.brain[0]) / (B.brain[1] - B.brain[0]))) * 18 + 2 * Math.sin(TAU * t / 3.1);
  const pre = 0.4 * sm(t, B.signal[1] - 0.15, B.signal[1] + 0.3), F = Math.min(1, pre + 0.6 * sm(t, B.light[0], B.light[1])) * (1 - 0.12 * Math.sin(TAU * Math.max(0, t - B.light[1]) * 1.1) * sm(t, B.light[1], B.light[1] + 0.3));
  for (let y = 140; y < 330; y++) for (let x = 130; x < 410; x++) {
    if (a < 1 && a <= bayer(x, y)) continue;
    const lx = (x - BR.cx) / s, ly = (y - BR.cy - oy) / s, d = inBrain(lx, ly);
    if (d > 1.06) continue;
    if (d > 1) { setPx(c, x, y, H(C.INK)); continue; }
    // folds: wavy sulci; cerebellum gets fine horizontal folia
    const isCbl = ((lx - 68) / 30) ** 2 + ((ly - 42) / 19) ** 2 < 1 && ly > 30 && ((lx) / 108) ** 2 + ((ly + 8) / 62) ** 2 > 0.92;
    const isStem = ly > 46 && ((lx) / 108) ** 2 + ((ly + 8) / 62) ** 2 > 1 && !isCbl && ((lx + 14) / 64) ** 2 + ((ly - 30) / 28) ** 2 > 1;
    const ga = lx * 0.13 + 2.8 * Math.sin(ly * 0.085 + lx * 0.02) + 1.4 * Math.sin(ly * 0.05 - lx * 0.04 + 1), gs = Math.abs(Math.sin(ga));
    const fold = isStem ? 1 : isCbl ? Math.abs(Math.sin(ly * 0.8 + lx * 0.1)) : gs;
    const lateral = !isCbl && !isStem && Math.abs(ly - (8 + lx * 0.18 + 6 * Math.sin(lx * 0.05))) < 1.6 && lx > -70 && lx < 60;   // the lateral fissure
    let v = 0.3 + 0.42 * Math.sqrt(Math.max(0, 1 - d)) - 0.25 * (ly / 70) - 0.08 * (lx / 100) + (isCbl || isStem ? 0 : 0.14 * fold);
    if (fold < 0.13 || lateral) v -= 0.38; if (isStem) v = 0.3 - 0.2 * (lx - 34) / 16;
    let col = H(dith(BRAIN, v, x, y));
    // face area: glows orange on the underside of the temporal lobe
    const fd = ((lx - (FA.x - BR.cx)) / FA.rx) ** 2 + ((ly - (FA.y - BR.cy)) / FA.ry) ** 2;
    if (F > 0 && fd < 1.6) { const k = F * clamp01(1.25 - fd * 0.75); if (k > bayer(x + 1, y)) col = H(dith(["#B8461A", "#F08A3C", "#F4CA50", "#FFF0B0"], 0.25 + 0.75 * k * (1 - 0.3 * fd), x, y)); }
    setPx(c, x, y, col);
  }
  // glow halo around the face area and a pulse ring on "lights up"
  if (F > 0) { const oc = H(C.GO); for (let y = 250; y < 330; y++) for (let x = 190; x < 330; x++) { const d = Math.hypot((x - FA.x) / 2.2, y - FA.y - oy); const k = F * 0.5 * Math.max(0, 1 - d / 34); if (k > bayer(x, y) * 0.8) blendPx(c, x, y, oc, 0.25 + 0.4 * k); } }
  const ru = (t - B.ring[0]) / (B.ring[1] - B.ring[0]);
  if (ru > 0 && ru < 1) { const rr = lerp(12, 70, easeOut(ru)), ra = 1 - ru, f = fade(c, ra); for (let k = 0; k < 220; k++) { const an = (k / 220) * TAU; f.px(R(FA.x + Math.cos(an) * rr * 1.8), R(FA.y + oy + Math.sin(an) * rr * 0.6), C.GO); } }
  return oy;
}

// ---------------------------------------------------------------- the signal: eyes → face area, while the counter runs
const P0 = [P.cx + 52, P.cy - 34], P1 = [372, 380], P2 = [FA.x - 6, FA.y + 6];
const bez = (u) => [(1 - u) ** 2 * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0], (1 - u) ** 2 * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1]];
function signal(c, t) {
  const u = clamp01((t - B.signal[0]) / (B.signal[1] - B.signal[0])), head = u < 1 ? u * u * (3 - 2 * u) : 1; if (t < B.signal[0]) return;
  const ta = 1 - sm(t, B.trailOut[0], B.trailOut[1]); if (ta <= 0) return;
  const f = fade(c, ta);
  for (let s = 0; s <= head; s += 0.03) { const [x, y] = bez(s); f.rect(R(x) - 1, R(y) - 1, 3, 3, C.INK); f.rect(R(x), R(y), 2, 2, s > head - 0.12 ? C.GO : C.OR); }
  if (u < 1) { const [x, y] = bez(head); const hc = H(C.GO); for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) { const d = Math.hypot(i, j); if (d < 9) blendPx(c, R(x) + i, R(y) + j, hc, d < 3.5 ? 1 : 0.5 * (1 - d / 9)); } }
}
function counter(c, t) {
  const a = sm(t, B.counter[0], B.counter[1]); if (a <= 0) return;
  const u = clamp01((t - B.signal[0]) / (B.signal[1] - B.signal[0])), ms = R(165 * u * u * (3 - 2 * u));
  const f = fade(c, a), x0 = 50, y0 = R(352 + (1 - easeOut((t - B.counter[0]) / 0.3)) * 14), w = 118, h = 66;
  f.rect(x0, y0, w, h, "#1A1028"); f.frame(x0, y0, w, h, C.INK); f.frame(x0 + 1, y0 + 1, w - 2, h - 2, mix(C.OR, "#1A1028", 0.25));
  const s = String(ms).padStart(3, "0") + " MS", tw = c.measure(MAIN, s, { scale: 3 });
  f.text(MAIN, s, x0 + R((w - tw) / 2), y0 + 10, u >= 1 ? C.GO : C.IV, { scale: 3, shadow: C.INK, shadowOffset: 1 });
  const bx = x0 + 10, bw = w - 20, by = y0 + 40; f.rect(bx, by, bw, 6, "#2C1E44"); f.rect(bx, by, R(bw * ms / 165), 6, C.OR);
  const s2 = "1/6 SECOND", tw2 = c.measure(TINY, s2, { scale: 2 }); f.text(TINY, s2, x0 + R((w - tw2) / 2), by + 11, mix(C.IV, "#1A1028", 0.3), { scale: 2 });
}
function faceLabel(c, t, oy) {
  const a = sm(t, B.label[0], B.label[1]); if (a <= 0) return;
  const f = fade(c, a), s = "FACE AREA", tw = c.measure(MAIN, s, { scale: 2 }), x0 = 334, y0 = R(322 + oy + (1 - a) * 8);
  f.rect(x0 - 6, y0 - 5, tw + 12, 24, "#1A1028"); f.frame(x0 - 6, y0 - 5, tw + 12, 24, C.OR);
  f.text(MAIN, s, x0, y0, C.GO, { scale: 2 });
  f.line(x0 - 6, y0 + 6, FA.x + FA.rx - 6, R(FA.y + oy + 3), C.GO);
}

// ---------------------------------------------------------------- captions (karaoke, orange highlight)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {                                                           // phrase groups by word count (fit ≤ 460 px at scale 3)
  const sizes = [5, 3, 3, 6, 5, 2, 3], gs = []; let k = 0;
  for (const n of sizes) { gs.push(WORDS.slice(k, k + n).map((w) => ({ ...w, shown: w.text }))); k += n; }
  if (k !== WORDS.length) throw new Error("caption groups do not cover the words");
  return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.17, e + 0.9) : Math.min(END - 0.5, e + 0.9); });
export const CAPTION_GROUPS = GROUPS.map((g) => [g.ws.map((w) => w.shown).join(" "), +g.show.toFixed(2), +g.hide.toFixed(2)]);
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(sm(t, g.show, g.show + 0.16), 1 - sm(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o) + 3 * (words.length - 1), y0 = 690 + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = sm(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, C.O, { scale: 3, colorAt: (X, Y) => (a < 1 && a <= bayer(X, Y) ? null : C.O) });
      c.text(MAIN, txt, x, y0, C.IV, { scale: 3, colorAt: (X, Y) => (a < 1 && a <= bayer(X, Y) ? null : t < wd.start || X >= fillX ? mix(C.IV, "#000000", 0.62) : toIv > bayer(X + 3, Y + 1) ? C.IV : C.OR) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, "#000000");
  backdrop(c, t);
  fog(c, t, 560, 700, 0.9);
  halo(c, t);
  pumpkin(c, t);
  fog(c, t + 3, 588, 640, 0.6);
  foreground(c, t);
  const oy = brain(c, t) || 0;
  signal(c, t);
  brackets(c, t);
  counter(c, t);
  faceLabel(c, t, oy);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), C.O, 6);
  captions(c, t);
  return c;
}

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
