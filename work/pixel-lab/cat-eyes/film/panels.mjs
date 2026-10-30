// Panels of «Why your cat's eyes glow» (screen space, above the captions): the pupil race (cat ×135 vs you ×15), the
// light needed to see (6× dimmer), the detail test (7× closer) and the flash photo (red eyes vs green eyes).
// Every element dissolves in and out; counters and pupils change continuously.
import { MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { blob, flat, ell, tube, bez, blush, mouthW, nose, smile, RAMP } from "../../animals/film/cute.mjs";
import { catEye, SHINE } from "./cat.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
export const UI = { O: "#0B0812", CARD: "#120C1D", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", GR: "#9CFF7A", p5: "#6E4FB0", p7: "#B08AE8", RED: "#FF4D5E" };
export function panel(c, x, y, w, h, a = 1, edge = UI.p7) { if (a <= 0) return; const g = fade(c, a); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, UI.p5, 2); for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(UI.CARD, "#1D1430", (j - y) / h)); }
export const txt = (c, s, x, y, col, a = 1, scale = 2) => { if (a > 0) fade(c, a).text(MAIN, s, R(x), R(y), col, { scale }); };
export const tw = (c, s, scale = 2) => c.measure(MAIN, s, { scale });
const ctext = (c, s, cx, y, col, a, scale) => txt(c, s, cx - tw(c, s, scale) / 2, y, col, a, scale);

// ---------------------------------------------------------------- a human eye (white almond, brown iris, round pupil)
export function humanEye(c, x, y, rx, ry, open, a = 1, o = {}) {
  const g = fade(c, a), irisR = ry * 0.92, pr = irisR * lerp(0.22, 0.62, open), red = o.red ?? 0;
  for (let Y = R(y - ry - 2); Y <= R(y + ry + 2); Y++) for (let X = R(x - rx - 2); X <= R(x + rx + 2); X++) {
    const u = (X + 0.5 - x) / rx, v = (Y + 0.5 - y) / ry, inA = Math.abs(v) <= (1 - u * u) * 1.0 && Math.abs(u) <= 1;   // almond
    if (!inA) continue;
    const edge = Math.abs(v) > (1 - u * u) - 1.6 / ry || Math.abs(u) > 1 - 1.6 / rx;
    const d = Math.hypot(X + 0.5 - x, Y + 0.5 - y);
    let col = edge ? "#3A2418" : v < -0.55 ? "#D8D0E0" : "#F4F0F8";
    if (!edge && d <= irisR) { const k = d / irisR; col = k > 0.92 ? "#3A1E10" : (k * 3 + bayer(X, Y)) % 2 > 1 ? "#8A5A2E" : "#A8703A"; }
    if (!edge && d <= pr) { const q = d / pr; col = red > 0 ? (q < 0.45 ? "#FFB0A0" : q < 0.8 ? mix("#E02A2A", "#8A0A14", q) : "#5A0610") : "#0A0608"; if (red > 0 && red < 1 && red <= bayer(X, Y)) col = "#0A0608"; }
    g.px(X, Y, col);
  }
  const hx = x - irisR * 0.35, hy = y - irisR * 0.35; g.disc(R(hx), R(hy), Math.max(1, R(irisR * 0.16)), "#FFFFFF");
}

// ---------------------------------------------------------------- 1. the pupil race: cat ×135, you ×15
export function drawCompare(c, t, EV, a) {
  if (a <= 0) return;
  // top: the cat eye; slit → circle on "slit to circle", then breathing between them
  panel(c, 30, 70, 480, 270, a, UI.Y);
  ctext(c, "CAT", 270, 84, UI.Y, a, 3);
  const k1 = sm(t, EV.circle - 0.15, EV.circle + 0.55), open = t < EV.circle + 0.55 ? k1 : 0.5 + 0.5 * Math.cos((t - EV.circle - 0.55) * 1.6);
  catEye(fade(c, a), 150, 220, 70, 78, { open, a });
  // the light bar grows with the counter
  const n1 = R(1 + 134 * sm(t, EV.hundred - 0.1, EV.lightEnd)), bar1 = R(250 * (n1 / 135));
  { const g = fade(c, a); g.rect(250, 196, 250, 26, "#2A2040"); for (let x = 0; x < bar1; x++) g.rect(250 + x, 196, 1, 26, x % 6 === 5 ? "#C99A2A" : UI.Y); }
  txt(c, "×" + n1, 252, 236, UI.Y, a * sm(t, EV.hundred - 0.2, EV.hundred), 5);
  // bottom: your eye
  panel(c, 30, 356, 480, 270, a * sm(t, EV.your - 0.3, EV.your), UI.L);
  const b = a * sm(t, EV.your - 0.3, EV.your);
  ctext(c, "YOU", 270, 370, UI.L, b, 3);
  const open2 = 0.5 + 0.5 * Math.cos(Math.max(0, t - EV.your) * 1.6 + Math.PI);
  humanEye(c, 150, 500, 86, 56, open2, b);
  const n2 = R(1 + 14 * sm(t, EV.pupils2, EV.fifteen + 0.2)), bar2 = R(250 * (n2 / 135));
  { const g = fade(c, b); g.rect(250, 476, 250, 26, "#2A2040"); for (let x = 0; x < bar2; x++) g.rect(250 + x, 476, 1, 26, x % 6 === 5 ? "#9A8CD8" : UI.L); }
  txt(c, "×" + n2, 252, 516, UI.L, b * sm(t, EV.pupils2 - 0.2, EV.pupils2), 5);
}

// ---------------------------------------------------------------- 2. light needed to see: you 6, cat 1
export function drawMeter(c, t, EV, a) {
  if (a <= 0) return;
  panel(c, 30, 70, 480, 250, a, UI.Y);
  ctext(c, "LIGHT NEEDED TO SEE", 270, 86, UI.Y, a, 2);
  const lamp = (x, y, on, col) => { const g = fade(c, a * on); g.disc(x, y, 14, col); g.disc(x - 4, y - 4, 4, "#FFFFFF"); g.rect(x - 6, y + 14, 12, 8, "#6E6A96"); };
  const off = (x, y) => { const g = fade(c, a); g.disc(x, y, 14, "#2A2440"); g.rect(x - 6, y + 14, 12, 8, "#3B3252"); };
  txt(c, "YOU", 50, 140, UI.L, a, 3);
  for (let k = 0; k < 6; k++) { off(170 + k * 52, 150); lamp(170 + k * 52, 150, sm(t, EV.withW + 0.2 + k * 0.18, EV.withW + 0.35 + k * 0.18), "#FFE9A0"); }
  txt(c, "CAT", 50, 230, UI.GR, a, 3);
  for (let k = 0; k < 6; k++) { off(170 + k * 52, 240); if (k === 0) lamp(170, 240, sm(t, EV.six - 0.4, EV.six - 0.1), "#FFE9A0"); }
  const d = sm(t, EV.dimmer - 0.15, EV.dimmer + 0.2) * a;
  if (d > 0) { const w = tw(c, "6× DIMMER", 3) + 24; panel(c, R(270 - w / 2), 276, w, 34, d, UI.GR); txt(c, "6× DIMMER", 270 - w / 2 + 12, 283, UI.GR, d, 3); }
}

// ---------------------------------------------------------------- 3. the detail test: the same bird, you vs the cat
function bird(c, x, y, s, a = 1) {
  // a cute round bird on a twig (drawn at scale s, centred at x, y)
  const P = (pts) => pts.map(([u, v]) => [x + u * s, y + v * s]);
  const g = fade(c, a);
  g.rect(R(x - 30 * s), R(y + 16 * s), R(60 * s), Math.max(1, R(3 * s)), "#6A4A2A");
  blob(c, [P(ell(0, 0, 16, 14)), P([[12, -4], [26, -10], [22, 2]])], { ramp: ["#0E2A5A", "#1A4A8A", "#2A6EB8", "#3E8EDA", "#62AEF0", "#8ECCF8", "#BCE4FC", "#E6F6FF"], thick: 6 * s, a });
  flat(c, [P(ell(-2, 4, 9, 7))], "#F2E6D0", { a });
  flat(c, [P([[-14, -2], [-22, 0], [-14, 3]])], "#F4A82A", { a });
  g.disc(R(x - 7 * s), R(y - 4 * s), Math.max(1, R(2.6 * s)), "#07060E"); g.px(R(x - 8 * s), R(y - 5 * s), "#FFFFFF");
  blob(c, [P([[2, -2], [14, 2], [6, 10], [-2, 6]])], { ramp: ["#0A1E44", "#123468", "#1E5296", "#2A6EB8", "#3E8EDA", "#62AEF0", "#8ECCF8", "#BCE4FC"], thick: 3 * s, a });
}
function pixelate(c, x0, y0, w, h, block) {
  if (block <= 1) return;
  for (let by = y0; by < y0 + h; by += block) for (let bx = x0; bx < x0 + w; bx += block) {
    let r = 0, g = 0, b = 0, n = 0; for (let y = by; y < Math.min(by + block, y0 + h); y++) for (let x = bx; x < Math.min(bx + block, x0 + w); x++) { const p = c.get(x, y); r += p[0]; g += p[1]; b += p[2]; n++; }
    const col = [R(r / n), R(g / n), R(b / n)]; for (let y = by; y < Math.min(by + block, y0 + h); y++) for (let x = bx; x < Math.min(bx + block, x0 + w); x++) c.px(x, y, col);
  }
}
import { Canvas } from "../../../../renderer/pixel/raster.mjs";
const OFF = new Canvas(540, 960, "#000000");
// draw a panel's picture off-screen, then copy its window into the frame with a dissolve
function windowed(c, x, y, w, h, a, draw) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) OFF.px(i, j, mix("#2A2058", "#4A3A86", (j - y) / h + (bayer(i, j) - 0.5) * 0.1));
  draw(OFF);
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { if (a < 1 && a <= bayer(i, j)) continue; c.px(i, j, OFF.get(i, j)); }
}
export function drawDetail(c, t, EV, a) {
  if (a <= 0) return;
  // top: what you see — small but sharp
  panel(c, 30, 70, 480, 260, a, UI.L); txt(c, "YOU", 46, 82, UI.L, a, 3);
  windowed(c, 46, 112, 448, 202, a, (o) => bird(o, 270, 222, 1.4));
  // bottom: the same bird for the cat, blurred into blocks; the cat gets 7× closer (we zoom towards the bird's head)
  // and the same blocks now show its eye and beak clearly
  const b = a * sm(t, EV.detail - 0.6, EV.detail - 0.2);
  panel(c, 30, 350, 480, 270, b, UI.GR); txt(c, "CAT", 46, 362, UI.GR, b, 3);
  if (b > 0) {
    const close = sm(t, EV.seven - 0.2, EV.closer + 0.5), s = 1.4 * Math.exp(Math.log(7) * close), hx = 270, hy = 498;
    windowed(c, 46, 392, 448, 212, b, (o) => { bird(o, hx + 7 * s, hy + 4 * s, s); pixelate(o, 46, 392, 448, 212, 10); });
    const blurry = Math.min(sm(t, EV.detail - 0.3, EV.detail), 1 - sm(t, EV.seven - 0.2, EV.seven + 0.1)) * b;
    if (blurry > 0) { const ww = tw(c, "BLURRY", 3) + 24; panel(c, R(270 - ww / 2), 560, ww, 34, blurry, UI.PK); txt(c, "BLURRY", 270 - ww / 2 + 12, 567, UI.PK, blurry, 3); }
    const k7 = sm(t, EV.seven - 0.1, EV.seven + 0.3) * b;
    if (k7 > 0) { const ww = tw(c, "7× CLOSER", 3) + 24; panel(c, R(270 - ww / 2), 560, ww, 34, k7, UI.GR); txt(c, "7× CLOSER", 270 - ww / 2 + 12, 567, UI.GR, k7, 3); }
  }
}

// ---------------------------------------------------------------- 4. the flash photo: you with red eyes, the cat with green
function youFace(c, x, y, s, a, red) {
  const P = (pts) => pts.map(([u, v]) => [x + u * s, y + v * s]);
  // coral puffer collar, face, purple bobble hat (the recurring hero)
  blob(c, [P([[-60, 60], [60, 60], [70, 110], [-70, 110]])], { ramp: ["#2A0E1A", "#5A1A2E", "#8A2840", "#B83A50", "#E0565A", "#F08070", "#F8A890", "#FCD0B8"], thick: 14 * s, a });
  blob(c, [P(ell(0, 10, 50, 54))], { ramp: RAMP.skin, thick: 18 * s, base: 4.2, a });
  blob(c, [P([[-54, -6], [-50, -40], [0, -62], [50, -40], [54, -6], [0, -22]]), P(ell(0, -70, 14, 13))], { ramp: ["#1E0E3A", "#33185E", "#4A2484", "#6232A8", "#7E46C8", "#9A64DE", "#BA8EEC", "#DCC2F8"], thick: 10 * s, a });
  humanEye(c, x - 21 * s, y + 8 * s, 17 * s, 12 * s, 0.8, a, { red });
  humanEye(c, x + 21 * s, y + 8 * s, 17 * s, 12 * s, 0.8, a, { red });
  blush(c, x - 30 * s, y + 30 * s, 9 * s, 4 * s, "#F27A9A", a); blush(c, x + 30 * s, y + 30 * s, 9 * s, 4 * s, "#F27A9A", a);
  smile(c, x, y + 38 * s, Math.max(2, R(8 * s)), { a });
}
function catFace(c, x, y, s, a, shine) {
  const P = (pts) => pts.map(([u, v]) => [x + u * s, y + v * s]), ramp = RAMP.black, lit = "#9A8CD8";
  blob(c, [P([[-70, -18], [-64, -122], [-8, -56]]), P([[70, -18], [64, -122], [8, -56]])], { ramp, litOutline: lit, thick: 10 * s, a });
  flat(c, [P([[-58, -36], [-56, -98], [-22, -56]]), P([[58, -36], [56, -98], [22, -56]])], "#E58AA8", { a });
  blob(c, [P(ell(0, 0, 80, 60))], { ramp, litOutline: lit, thick: 24 * s, base: 2.8, a });
  for (const sx of [-33, 33]) catEye(fade(c, a), x + sx * s, y - 6 * s, 19 * s, 21 * s, { open: 0.9, shine, a });
  nose(c, x, y + 22 * s, Math.max(2, 4 * s), "#F09AB8", a); mouthW(c, x, y + 28 * s, "#07060E", Math.max(2, R(3 * s)), a);
}
export function drawPhoto(c, t, EV, a) {
  if (a <= 0) return;
  // the photo card that the flash produced
  const k = a * sm(t, EV.flash + 0.1, EV.flash + 0.5);
  if (k <= 0) return;
  panel(c, 30, 90, 480, 400, k, UI.IV);
  { const g = fade(c, k); for (let j = 104; j < 476; j++) for (let i = 44; i < 496; i++) g.px(i, j, mix("#3A3060", "#1C1838", (j - 104) / 372 + (bayer(i, j) - 0.5) * 0.06)); }
  youFace(c, 160, 300, 1.45, k, 1);
  catFace(c, 390, 330, 1.05, k, 0.95);
  const lab = sm(t, EV.red - 0.1, EV.red + 0.2) * k;
  if (lab > 0) { const w1 = tw(c, "RED", 3) + 24; panel(c, R(160 - w1 / 2), 500, w1, 34, lab, UI.RED); txt(c, "RED", 160 - w1 / 2 + 12, 507, UI.RED, lab, 3);
    const w2 = tw(c, "GREEN", 3) + 24; panel(c, R(390 - w2 / 2), 500, w2, 34, lab, UI.GR); txt(c, "GREEN", 390 - w2 / 2 + 12, 507, UI.GR, lab, 3); }
}
