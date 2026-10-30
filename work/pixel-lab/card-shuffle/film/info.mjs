// Everything that appears over the table, on narration cues (our own drawings, our pixel fonts, Latin only):
// the three places where decks get shuffled (casino, game night, campfire) and NEVER; the choice cells 52 × 51 × 50 × … × 1;
// the 68-digit ticker of 52! (computed with BigInt, checked against the script); the pixel Earth (renderer/pixel/earth.mjs,
// read-only) with 8 billion shufflers and 13.8 billion years; ANY TWO THE SAME? → 1 IN 13,000,000,000,000; AFTER 1 RIFFLE;
// the HOW FAR FROM RANDOM bars (Bayer & Diaconis 1992: 1.00 1.00 1.00 1.00 0.92 0.61 0.33); OVERHAND → THOUSANDS;
// PERFECT SHUFFLE, 26 | 26, the ×1…×8 counter and BACK TO START ✓; the magician's hat and the cheat's sleeve; dice, a
// checkers board and a puzzle cube. Every appearance is a dithered dissolve and/or an eased move; counters roll like an
// odometer (continuous), so nothing changes in one frame.
import { MAIN, TINY, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawGlobe, project, ground } from "../../../../renderer/pixel/earth.mjs";
import { EV, T, HOME, CARD_W, CARD_H, perfLand, perfAt } from "./timeline.mjs";
import { CELLS, drawCard, COL } from "./deck.mjs";
import { blob, ell, tube, panel, RAMP, C } from "./cute.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const backOut = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const win = (t, a, b, fi = 0.3, fo = 0.4) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
const hash = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const O = "#0B0812", IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", CY = "#7FE3F0", PK = "#E03056", GR = "#65DA41";

// ---------------------------------------------------------------- text helpers
function otext(c, font, txt, x, y, col, scale, a, edge = O) {
  if (a <= 0) return; const g = fade(c, a);
  for (const [dx, dy] of [[1, 1], [-1, 0], [1, 0], [0, -1], [0, 1], [2, 2]]) g.text(font, txt, x + dx, y + dy, edge, { scale });
  g.text(font, txt, x, y, col, { scale });
}
const ctext = (c, font, txt, cx, y, col, scale, a, edge) => otext(c, font, txt, R(cx - c.measure(font, txt, { scale }) / 2), y, col, scale, a, edge);
function chip(c, txt, cx, y, col, a, scale = 2, font = MAIN) {
  if (a <= 0) return; const w = c.measure(font, txt, { scale }) + 20, h = (font === MAIN ? 7 : 5) * scale + 12, x = R(cx - w / 2);
  panel(c, x, R(y), w, h, a, col); fade(c, a).text(font, txt, x + 10, R(y) + 6, col, { scale });
}
/** Text whose commas are real commas (a dot with a tail below the baseline); returns the width. */
function commaText(g, txt, x, y, col, scale, measureOnly = false) {
  let cx = x;
  for (const part of txt.split(/(,)/)) {
    if (part === ",") { if (!measureOnly) { g.rect(cx, y + 5 * scale, 2 * scale, 2 * scale, col); g.rect(cx, y + 7 * scale, scale, scale, col); } cx += 3 * scale; continue; }
    if (!part) continue; if (!measureOnly) g.text(MAIN, part, cx, y, col, { scale }); cx += g.measure(MAIN, part, { scale }) + scale;
  }
  return cx - x - scale;
}
/** Odometer number (continuous roll), left-aligned at x; commas every three digits. Returns the width. */
function odo(c, value, x, y, scale, col, a, edge = O) {
  if (a <= 0) return 0;
  const n = Math.max(1, Math.floor(Math.log10(Math.max(1, value))) + 1), ch = 8 * scale, adv = 6 * scale, g = fade(c, a);
  let cx = x;
  for (let k = n - 1; k >= 0; k--) {
    const p = Math.pow(10, k), d = Math.floor(value / p) % 10, lower = value - Math.floor(value / p) * p, r = k === 0 ? value - Math.floor(value) : clamp01(lower - (p - 1));
    const oy = R(r * ch);
    for (const [dd, yy] of [[d, y - oy], [(d + 1) % 10, y - oy + ch]]) {
      const clip = (X, Yy) => (Yy < y - 1 || Yy > y + 7 * scale ? null : col);
      for (const [dx, dy] of [[1, 1], [2, 2], [-1, 0], [1, 0]]) g.text(MAIN, String(dd), cx + dx, yy + dy, edge, { scale, colorAt: (X, Yy) => (clip(X, Yy) ? edge : null) });
      g.text(MAIN, String(dd), cx, yy, col, { scale, colorAt: clip });
    }
    cx += adv;
    if (k % 3 === 0 && k > 0) { g.rect(cx, y + 5 * scale, 2 * scale, 2 * scale, col); g.rect(cx, y + 7 * scale, scale, scale, col); cx += 4 * scale; }
  }
  return cx - x;
}

// ---------------------------------------------------------------- 1) where decks get shuffled
const VIG = [{ x: 44, kind: "casino", t: EV.casino - 0.2, label: "CASINO" }, { x: 201, kind: "game", t: EV.game - 0.2, label: "GAME NIGHT" }, { x: 358, kind: "fire", t: EV.ever2 - 0.35, label: "CAMPFIRE" }];
const VY = 176, VW = 138, VH = 132, vigOut = [EV.first - 0.5, EV.first - 0.08];
function vignette(c, v, t) {
  const a = sm(t, v.t, v.t + 0.35) * (1 - sm(t, ...vigOut)); if (a <= 0) return;
  const g = fade(c, a), x = v.x, y = R(VY + 8 * (1 - ease((t - v.t) / 0.4)));
  g.rrect(x, y, VW, VH, O, 2); g.rrect(x + 2, y + 2, VW - 4, VH - 4, "#3B2C5C", 2);
  const ix = x + 4, iy = y + 4, iw = VW - 8, ih = VH - 26;
  if (v.kind === "casino") {
    for (let j = 0; j < ih; j++) g.rect(ix, iy + j, iw, 1, mix("#5A1024", "#2A0612", j / ih));
    for (let i = 0; i < 9; i++) { const lx = ix + 8 + i * 13, ly = iy + 8 + (i % 2) * 5, tw = 0.6 + 0.4 * Math.sin(t * 5 + i * 1.7); g.rect(lx, ly, 2, 2, mix("#8A5A20", "#FFE08A", tw)); }
    g.ellipse(ix + iw / 2, iy + ih - 18, 52, 20, "#3A1A0A"); g.ellipse(ix + iw / 2, iy + ih - 19, 48, 17, "#1E6142"); g.ering(ix + iw / 2, iy + ih - 19, 44, 14, "#C8A048");
    for (const [dx, col] of [[-26, "#B8283A"], [-18, "#2A4FA8"], [22, "#1E1A2A"]]) { g.ellipse(ix + iw / 2 + dx, iy + ih - 17, 5, 3, mix(col, "#000", 0.4)); g.ellipse(ix + iw / 2 + dx, iy + ih - 19, 5, 3, col); }
    for (let k = 0; k < 4; k++) { const cx = ix + iw / 2 - 8 + k * 6; g.rect(cx, iy + ih - 30, 8, 11, O); g.rect(cx + 1, iy + ih - 29, 6, 9, IV); g.px(cx + 3, iy + ih - 26, k % 2 ? COL.RED : COL.BLK); }
  } else if (v.kind === "game") {
    for (let j = 0; j < ih; j++) g.rect(ix, iy + j, iw, 1, mix("#3A2A4A", "#22182E", j / ih));
    g.line(ix + iw / 2, iy, ix + iw / 2, iy + 14, "#14101E"); g.poly([[ix + iw / 2 - 12, iy + 24], [ix + iw / 2 - 6, iy + 14], [ix + iw / 2 + 6, iy + 14], [ix + iw / 2 + 12, iy + 24]], "#F4CA50");
    for (let j = 0; j < 3; j++) g.dither(ix + iw / 2 - 30 + j * 6, iy + 26, 60 - j * 12, 30, () => 0.18 - j * 0.05, "#FFE6A0");
    g.rect(ix, iy + ih - 28, iw, 28, "#6A3E1C"); g.rect(ix, iy + ih - 28, iw, 2, "#9A6232"); g.rect(ix, iy + ih - 6, iw, 6, "#4A2A12");
    for (const mx of [ix + 16, ix + iw - 30]) { g.rect(mx, iy + ih - 42, 14, 16, O); g.rect(mx + 1, iy + ih - 41, 12, 14, mx < ix + 50 ? "#D84A4A" : "#4A8AD8"); g.rect(mx + 13, iy + ih - 38, 4, 7, O); g.rect(mx + 2, iy + ih - 40, 10, 2, "#FFFFFF"); }
    for (let k = 0; k < 4; k++) { const cx = ix + iw / 2 - 14 + k * 7; g.rect(cx, iy + ih - 24, 9, 12, O); g.rect(cx + 1, iy + ih - 23, 7, 10, IV); g.px(cx + 3, iy + ih - 20, k % 2 ? COL.BLK : COL.RED); }
  } else {
    for (let j = 0; j < ih; j++) g.rect(ix, iy + j, iw, 1, mix("#0A0E26", "#1A1838", j / ih));
    for (let i = 0; i < 14; i++) { const sx = ix + 4 + R(hash(i + 3) * (iw - 8)), sy = iy + 3 + R(hash(i + 40) * (ih - 40)); if ((0.5 + 0.5 * Math.sin(t * 3 + i)) > 0.3) g.px(sx, sy, "#E0E8FF"); }
    g.rect(ix, iy + ih - 20, iw, 20, "#141026");
    const fx = ix + iw / 2, fy = iy + ih - 18;
    for (let j = 0; j < 4; j++) g.dither(fx - 34 + j * 7, fy - 36 + j * 6, 68 - j * 14, 40 - j * 8, () => 0.16, "#F59A3A");
    g.poly([[fx - 22, fy + 4], [fx + 20, fy - 4], [fx + 22, fy + 1], [fx - 20, fy + 9]], "#5A3418"); g.poly([[fx - 20, fy - 4], [fx + 22, fy + 4], [fx + 20, fy + 9], [fx - 22, fy + 1]], "#7A4A22");
    const fl = (k, h, w, col) => { const sway = Math.sin(t * 9 + k) * 2; g.poly([[fx - w, fy], [fx - w * 0.4 + sway * 0.5, fy - h * 0.55], [fx + sway, fy - h], [fx + w * 0.5 + sway * 0.5, fy - h * 0.5], [fx + w, fy]], col); };
    fl(0, 30 + 3 * Math.sin(t * 7), 12, "#E04A1C"); fl(1, 22 + 2 * Math.sin(t * 11), 8, "#F59A3A"); fl(2, 12 + 2 * Math.sin(t * 13), 5, "#FFE08A");
    for (let k = 0; k < 3; k++) { const cx = ix + 10 + k * 7; g.rect(cx, iy + ih - 30, 9, 12, O); g.rect(cx + 1, iy + ih - 29, 7, 10, IV); g.px(cx + 3, iy + ih - 26, k % 2 ? COL.RED : COL.BLK); }
  }
  const lw = c.measure(TINY, v.label, { scale: 2 }); g.text(TINY, v.label, R(x + VW / 2 - lw / 2), y + VH - 17, L, { scale: 2 });
}

// ---------------------------------------------------------------- 2) cells, 3) ticker
const FACT52 = (() => { let f = 1n; for (let i = 1n; i <= 52n; i++) f *= i; return f.toString(); })();
if (FACT52 !== "80658175170943878571660636856403766975289505440883277824000000000000") throw new Error("52! mismatch");
const GROUPS = FACT52.replace(/\B(?=(\d{3})+(?!\d))/g, " ");          // "80 658 175 …"
const TK = { y: 152, x0: 35, x1: 505, t0: EV.number + 0.1, tEnd: EV.trillionEnd + 0.15, in: [EV.number - 0.1, EV.number + 0.2], out: [EV.but1 - 0.05, EV.but1 + 0.5] };
const TKW = (() => { let w = 0; for (const ch of GROUPS) w += ch === " " ? 8 : 12; return w; })();
const TKV = TKW / (TK.tEnd - TK.t0);
function ticker(c, t) {
  const a = sm(t, ...TK.in) * (1 - sm(t, ...TK.out)); if (a <= 0) return;
  const g = fade(c, a); g.rrect(TK.x0, TK.y, TK.x1 - TK.x0, 28, "#5A4296", 2); g.rrect(TK.x0 + 1, TK.y + 1, TK.x1 - TK.x0 - 2, 26, "#120C1D", 2);
  for (let x = TK.x0 + 3; x < TK.x1 - 3; x += 3) g.px(x, TK.y + 3, "#22183A");
  let x = TK.x1 - 8 - TKV * Math.max(0, t - TK.t0);
  for (const ch of GROUPS) {
    if (ch === " ") { x += 8; continue; }
    const X = R(x); x += 12; if (X > TK.x1 - 8 || X < TK.x0 - 12) continue;
    const edgeA = Math.min(clamp01((X - TK.x0 - 2) / 18), clamp01((TK.x1 - 8 - X - 10) / 18)), aa = a * edgeA; if (aa <= 0) continue;
    const gg = fade(c, aa); gg.text(MAIN, ch, X + 1, TK.y + 8, "#5A3A08", { scale: 2 }); gg.text(MAIN, ch, X, TK.y + 7, Y, { scale: 2 });
  }
  // "68 DIGITS" chip under the right end, counting up as it appears
  const ca = sm(t, EV.sixty8 - 0.1, EV.sixty8 + 0.2) * (1 - sm(t, ...TK.out)); if (ca <= 0) return;
  const v = 68 * ease((t - EV.sixty8 + 0.05) / 0.65), w = 2 * 12 + 4 + c.measure(MAIN, "DIGITS", { scale: 2 }) + 20, cx0 = 498 - w;
  panel(c, cx0, 183, w, 26, ca, Y); odo(c, Math.min(68, v), cx0 + 10, 189, 2, Y, ca, "#120C1D");
  fade(c, ca).text(MAIN, "DIGITS", cx0 + 10 + 28, 189, IV, { scale: 2 });
}
const TIMES = (c, x, y, s, col, a) => otext(c, MAIN, "×", x, y, col, s, a);
function cells(c, t, back) {
  const out = 1 - sm(t, T.cellsBack[0] - 0.1, T.cellsBack[0] + 0.35); if (out <= 0) return;
  const show = [EV.first + 0.1, EV.next1, EV.multiply - 0.05];
  CELLS.forEach((q, i) => {
    const a = sm(t, show[i], show[i] + 0.3) * out; if (a <= 0) return;
    if (back) { const g = fade(c, a * 0.85); for (let k = 0; k < (CARD_W + CARD_H) * 2; k += 4) { const p = k < CARD_W ? [k, 0] : k < CARD_W + CARD_H ? [CARD_W - 1, k - CARD_W] : k < 2 * CARD_W + CARD_H ? [2 * CARD_W + CARD_H - k, CARD_H - 1] : [0, 2 * (CARD_W + CARD_H) - k]; g.rect(q.x + p[0], q.y + p[1], 2, 2, "#9CE0B8"); } return; }
    const lab = ["52", "51", "50"][i], la = sm(t, [EV.fifty2 - 0.05, EV.fifty1 - 0.05, EV.multiply + 0.1][i], [EV.fifty2 + 0.25, EV.fifty1 + 0.25, EV.multiply + 0.4][i]) * out;
    ctext(c, MAIN, lab, q.x + CARD_W / 2, q.y + CARD_H + 8, Y, 3, la);
    if (i > 0) TIMES(c, q.x - 27, q.y + 18, 3, IV, a);
  });
  if (back) return;
  // "× ... × 1", typed in on "all the way down"
  const parts = [["×", 3, IV], ["...", 3, IV], ["×", 3, IV], ["1", 3, Y]]; let x = CELLS[2].x + CARD_W + 12;
  parts.forEach(([s, sc, col], k) => { const a = sm(t, EV.all1 + k * 0.16, EV.all1 + k * 0.16 + 0.2) * out; otext(c, MAIN, s, x, CELLS[2].y + 18, col, sc, a); x += c.measure(MAIN, s, { scale: sc }) + 9; });
}

// ---------------------------------------------------------------- 4) the Earth, 5) two decks and the odds
const GLOBE = { cx: 270, cy: 266, R: 78 };
const earthA = (t) => sm(t, EV.let1 - 0.15, EV.let1 + 0.55) * (1 - sm(t, EV.but1, EV.but1 + 0.55));
const DOTS = (() => { const out = []; for (let i = 0; out.length < 340 && i < 6000; i++) { const lat = -48 + hash(i * 3 + 1) * 112, lon = -180 + hash(i * 3 + 2) * 360; if (ground(lat, lon) === 1) out.push({ lat, lon, ph: hash(i * 7 + 5) * 6.28 }); } return out; })();
function earth(c, t) {
  const a = earthA(t); if (a <= 0) return;
  const view = { lat0: 18, lon0: -20 + 5 * (t - EV.let1), R: GLOBE.R, cx: GLOBE.cx, cy: R(GLOBE.cy + 14 * (1 - ease((t - EV.let1 + 0.15) / 0.7))) };
  drawGlobe(c, view, { lat: 12, lon: view.lon0 - 35 }, { alpha: a });
  const da = a * sm(t, EV.shuffle2 - 0.1, EV.shuffle2 + 0.6);
  if (da > 0) for (const d of DOTS) { const p = project(view, d.lat, d.lon); if (!p.visible || p.z < 0.12) continue; const tw = da * (0.55 + 0.45 * Math.sin(t * 7 + d.ph)); const g = fade(c, tw); g.px(R(p.x), R(p.y), Y); g.px(R(p.x) + 1, R(p.y), IV); }
  otext(c, MAIN, "8 BILLION", 44, 214, Y, 2, a * sm(t, EV.person - 0.1, EV.person + 0.25));
  otext(c, MAIN, "PEOPLE", 44, 234, IV, 2, a * sm(t, EV.person, EV.person + 0.3));
  otext(c, MAIN, "1 SHUFFLE", 362, 214, Y, 2, a * sm(t, EV.once - 0.1, EV.once + 0.25));
  otext(c, MAIN, "A SECOND", 362, 234, IV, 2, a * sm(t, EV.once, EV.once + 0.3));
  // the clock: 13.8 BILLION YEARS (its hand spins fast)
  const ka = a * sm(t, EV.big - 0.15, EV.big + 0.25);
  if (ka > 0) { const txt = "13.8 BILLION YEARS", w = c.measure(MAIN, txt, { scale: 2 }), x0 = R(270 - (w + 22) / 2), cx = x0 + 7, cy = 361, g = fade(c, ka);
    g.disc(cx, cy, 8, O); g.disc(cx, cy, 7, IV); g.ring(cx, cy, 7, "#5A4296"); const ang = (t - EV.big) * 9; g.line(cx, cy, R(cx + Math.sin(ang) * 5), R(cy - Math.cos(ang) * 5), O); g.line(cx, cy, R(cx + Math.sin(ang / 12) * 3), R(cy - Math.cos(ang / 12) * 3), PK);
    otext(c, MAIN, txt, x0 + 22, cy - 7, IV, 2, ka); }
}
function odds(c, t) {
  const out = 1 - sm(t, EV.but1, EV.but1 + 0.5), a = sm(t, EV.two1 - 0.15, EV.two1 + 0.25) * out; if (a <= 0) return;
  // two little decks, top cards differ; "= ?" between them
  for (const [k, ids, x] of [[0, [33, 8, 45], 168], [1, [20, 50, 2], 332]]) {
    const dy = R(6 * (1 - ease((t - EV.two1 + 0.1 - k * 0.12) / 0.4)));
    ids.forEach((id, j) => drawCard(c, id, x - CARD_W / 2 + j * 2, 392 + dy - j * 2, { a }));
  }
  ctext(c, MAIN, "=?", 270, 410, Y, 3, a * sm(t, EV.decks, EV.decks + 0.3));
  const pa = sm(t, EV.one2 - 0.12, EV.one2 + 0.22) * out; if (pa <= 0) return;
  const txt = "1 IN 13,000,000,000,000", w = commaText(c, txt, 0, 0, Y, 2, true) + 24, x = R(270 - w / 2), y = R(468 - 6 * (backOut((t - EV.one2 + 0.12) / 0.4) - 1));
  panel(c, x, y, w, 32, pa, Y); const g = fade(c, pa); commaText(g, txt, x + 13, y + 9, "#3A2A08", 2); commaText(g, txt, x + 12, y + 8, Y, 2);
}

// ---------------------------------------------------------------- 6) after one riffle, 7) the bars
function afterRiffle(c, t) {
  const out = 1 - sm(t, EV.in1992 - 0.3, EV.in1992 + 0.1), a = sm(t, EV.after - 0.05, EV.after + 0.3) * out; if (a <= 0) return;
  ctext(c, MAIN, "AFTER 1 RIFFLE", 270, 236, IV, 3, a);
  const b = sm(t, EV.still - 0.05, EV.still + 0.3) * out; if (b <= 0) return;
  ctext(c, MAIN, "STILL IN ORDER", 270, 280, Y, 2, b);
  const g = fade(c, b), k = ease((t - EV.keeps) / 1.2);
  for (const [x0, col] of [[150, Y], [290, CY]]) { const len = R(100 * k); g.rect(x0, 306, len, 3, O); g.rect(x0, 305, len, 3, col); if (len > 6) { g.poly([[x0 + len, 299], [x0 + len + 8, 306], [x0 + len, 313]], O); g.poly([[x0 + len, 300], [x0 + len + 7, 306], [x0 + len, 312]], col); } }
}
const BARS = [1, 1, 1, 1, 0.92, 0.61, 0.33], BAR = { x0: 91, step: 54, w: 34, base: 316, h: 110 };
const barCol = (v) => (v > 0.99 ? "#E05A44" : v > 0.8 ? "#F08A3A" : v > 0.5 ? Y : GR);
function bars(c, t) {
  const out = 1 - sm(t, EV.slow - 0.2, EV.slow + 0.25), a = sm(t, EV.in1992 - 0.05, EV.in1992 + 0.3) * out; if (a <= 0) return;
  ctext(c, MAIN, "HOW FAR FROM RANDOM", 270, 158, IV, 2, a);
  ctext(c, TINY, "BAYER · DIACONIS · 1992", 270, 178, L, 2, a * sm(t, EV.y1992, EV.y1992 + 0.3));
  const g = fade(c, a); g.rect(BAR.x0 - 8, BAR.base, 7 * BAR.step - BAR.step + BAR.w + 16, 2, O); g.rect(BAR.x0 - 8, BAR.base, 7 * BAR.step - BAR.step + BAR.w + 16, 1, L);
  BARS.forEach((v, i) => {
    const s0 = EV.two2 + 0.1 + i * 0.2, k = ease((t - s0) / 0.35), h = R(BAR.h * v * k), x = BAR.x0 + i * BAR.step;
    if (h > 0) { g.rect(x - 1, BAR.base - h - 1, BAR.w + 2, h + 1, O); g.rect(x, BAR.base - h, BAR.w, h, barCol(v)); g.rect(x, BAR.base - h, BAR.w, 2, mix(barCol(v), "#FFFFFF", 0.4)); g.rect(x + BAR.w - 4, BAR.base - h + 2, 4, h - 2, mix(barCol(v), "#000000", 0.25)); }
    const va = a * sm(t, s0 + 0.3, s0 + 0.5); ctext(c, MAIN, v.toFixed(2), x + BAR.w / 2, BAR.base - h - 11, IV, 1, va);
    ctext(c, MAIN, String(i + 1), x + BAR.w / 2, BAR.base + 6, i === 6 ? Y : IV, 2, a * sm(t, s0 - 0.1, s0 + 0.2));
  });
  ctext(c, TINY, "RIFFLES", 270, 340, L, 2, a * sm(t, EV.two2 + 0.4, EV.two2 + 0.8));
  // "seven": a gold frame around bar 7
  const ra = a * sm(t, EV.seven - 0.1, EV.seven + 0.2); if (ra > 0) { const x = BAR.x0 + 6 * BAR.step, pulse = 0.75 + 0.25 * Math.sin((t - EV.seven) * 8), gg = fade(c, ra * pulse); gg.rframe(x - 6, BAR.base - R(BAR.h * 0.33) - 18, BAR.w + 12, R(BAR.h * 0.33) + 40, Y, 2); gg.rframe(x - 5, BAR.base - R(BAR.h * 0.33) - 17, BAR.w + 10, R(BAR.h * 0.33) + 38, mix(Y, O, 0.5), 2); }
}

// ---------------------------------------------------------------- 8) overhand → THOUSANDS
function overhandInfo(c, t) {
  const out = 1 - sm(t, EV.and3 - 0.1, EV.and3 + 0.3), a = sm(t, EV.slow - 0.05, EV.slow + 0.3) * out; if (a <= 0) return;
  ctext(c, MAIN, "OVERHAND", 270, 196, IV, 3, a);
  const r0 = EV.overhand + 0.25, r1 = EV.thousands - 0.02, th = sm(t, EV.thousands - 0.08, EV.thousands + 0.18);
  const v = Math.pow(10, 3.48 * ease((t - r0) / (r1 - r0))), na = a * sm(t, r0 - 0.15, r0 + 0.1) * (1 - th);
  if (na > 0) { const w = 6 * 4 * (Math.floor(Math.log10(Math.max(1, v))) + 1) + (v >= 1000 ? 12 : 0) + 30; const x0 = R(270 - w / 2); otext(c, MAIN, "×", x0, 240, IV, 4, na); odo(c, v, x0 + 30, 240, 4, Y, na); }
  ctext(c, MAIN, "THOUSANDS", 270, 240, Y, 4, a * th);
  ctext(c, TINY, "OF SHUFFLES", 270, 284, L, 2, a * sm(t, r0, r0 + 0.3));
}

// ---------------------------------------------------------------- 9) the perfect shuffle
function perfectInfo(c, t, back) {
  const out = 1 - sm(t, EV.magicians - 0.35, EV.magicians + 0.05);
  if (back) { // the cut line between the halves (under the cards)
    const a = sm(t, EV.cut + 0.05, EV.cut + 0.3) * (1 - sm(t, EV.weave - 0.1, EV.weave + 0.2)); if (a <= 0) return;
    const k = ease((t - EV.cut - 0.1) / (EV.halves + 0.25 - EV.cut)), x1 = R(85 + 362 * k), g = fade(c, a);
    for (let x = 85; x < x1; x++) if (((x - 85) % 8) < 5) { g.px(x, 421, Y); g.px(x, 422, "#8A6A2A"); }
    return;
  }
  const a = sm(t, EV.perfect - 0.1, EV.perfect + 0.25) * out; if (a <= 0) return;
  ctext(c, MAIN, "PERFECT SHUFFLE", 270, 184, IV, 3, a);
  ctext(c, MAIN, "NOT RANDOM", 270, 220, PK, 2, a * sm(t, EV.random - 0.1, EV.random + 0.25));
  // 26 | 26
  const ca = sm(t, EV.exact - 0.1, EV.exact + 0.25) * (1 - sm(t, EV.weave - 0.1, EV.weave + 0.25));
  chip(c, "26", 60, 368, Y, ca); chip(c, "26", 60, 454, CY, ca);
  // ×1 … ×8 (each new count crossfades in on its landing)
  let n = 0; for (let j = 1; j <= 8; j++) if (t >= perfLand(j) - 0.1) n = j;
  const ka = a * sm(t, perfLand(1) - 0.15, perfLand(1) + 0.1);
  if (ka > 0 && n > 0) {
    const k = sm(t, perfLand(n) - 0.1, perfLand(n) + 0.06), gold = sm(t, perfLand(8), perfLand(8) + 0.3);
    if (n > 1 && k < 1) ctext(c, MAIN, "×" + (n - 1), 270, 252, IV, 5, ka * (1 - k));
    ctext(c, MAIN, "×" + n, 270, 252, n === 8 ? mix(IV, Y, gold) : IV, 5, ka * (n > 1 ? k : 1));
  }
  chip(c, "BACK TO START ✓", 270, 304, GR, a * sm(t, perfLand(8) - 0.05, perfLand(8) + 0.25));
}

// ---------------------------------------------------------------- 10) magicians and card cheats
function hatAndSleeve(c, t) {
  const out = 1 - sm(t, EV.theres - 0.25, EV.theres + 0.2);
  const ha = sm(t, EV.magicians - 0.1, EV.magicians + 0.3) * out;
  if (ha > 0) {
    const hop = R(-10 * Math.sin(Math.PI * clamp01((t - EV.magicians + 0.1) / 0.45))), x = 140, y = 300 + hop, g = fade(c, ha);
    g.ellipse(x, y + 6, 52, 13, "#000000"); g.ellipse(x, y + 3, 50, 12, "#14101E"); g.ellipse(x, y + 1, 48, 10, "#2A2440");
    g.poly([[x - 31, y - 2], [x - 28, y - 74], [x + 28, y - 74], [x + 31, y - 2]], O);
    g.poly([[x - 29, y - 3], [x - 26, y - 72], [x + 26, y - 72], [x + 29, y - 3]], "#2A2440");
    g.poly([[x - 26, y - 72], [x - 14, y - 72], [x - 15, y - 3], [x - 29, y - 3]], "#3D3458"); g.rect(x + 14, y - 70, 10, 66, "#1C1830");
    g.rect(x - 29, y - 18, 58, 10, "#B8283A"); g.rect(x - 29, y - 18, 58, 2, "#E05A5A"); g.ellipse(x, y - 73, 27, 6, "#3D3458"); g.ering(x, y - 73, 27, 6, O);
    // the wand with a white tip and sparkles
    const wx0 = x + 46, wy0 = y - 6, wx1 = x + 86, wy1 = y - 62; for (let k = -1; k <= 1; k++) g.line(wx0 + k, wy0, wx1 + k, wy1, O); g.line(wx0, wy0, wx1, wy1, "#14101E");
    g.line(wx1 - 6, wy1 + 8, wx1, wy1, IV); g.line(wx1 - 5, wy1 + 8, wx1 + 1, wy1, IV);
    for (let i = 0; i < 6; i++) { const ph = t * 3 + i * 1.05, r = 8 + 10 * ((ph % 1)), ang = i * 1.9 + t, sa = ha * (1 - (ph % 1)); const sx = R(wx1 + Math.cos(ang) * r), sy = R(wy1 + Math.sin(ang) * r); const gg = fade(c, sa); gg.px(sx, sy, Y); gg.px(sx + 1, sy, IV); gg.px(sx, sy - 1, IV); }
  }
  const sa = sm(t, EV.cheats - 0.25, EV.cheats + 0.15) * out;
  if (sa > 0) {
    const g = fade(c, sa), dx = R(16 * (1 - ease((t - EV.cheats + 0.25) / 0.4)));
    const P = (x, y) => [x + dx, y], cuffX = 330, cuffY = 268;
    blob(fade(c, sa), [tube([P(520, 330), P(420, 300), P(cuffX + 14, cuffY)], 34, 27)], { ramp: RAMP.ink, base: 3.4, gain: 1.4, slope: 0.3, thick: 10, outline: O });
    g.poly([P(cuffX + 6, cuffY - 26), P(cuffX + 18, cuffY - 26), P(cuffX + 24, cuffY + 26), P(cuffX + 12, cuffY + 26)].map(([x, y]) => [x, y]), "#EDEBF2");
    blob(fade(c, sa), [ell(cuffX - 18 + dx, cuffY + 2, 22, 19, 0.2)], { ramp: RAMP.skin, base: 3.7, gain: 1.4, thick: 8, outline: "#1A0C10" });
    for (let i = 0; i < 4; i++) blob(fade(c, sa), [tube([[cuffX - 30 + dx, cuffY - 12 + i * 8], [cuffX - 46 + dx, cuffY - 10 + i * 8.5]], 4.6, 4)], { ramp: RAMP.skin, base: 3.7, gain: 1.2, thick: 5, outline: "#1A0C10" });
    // the ace slides out of the cuff over the back of the hand (clipped at the cuff, so it comes from inside the sleeve)
    const k = ease((t - EV.cheats - 0.1) / 0.6), ax = R(cuffX + 8 - 44 * k) + dx, ay = cuffY - 40;
    drawCard(c, 0, ax, ay, { a: sa, clipX1: cuffX + 7 + dx });
  }
}

// ---------------------------------------------------------------- 11) dice, a board, a puzzle cube
function iso(g, cx, cy, s, top, left, right) { // an isometric cube of edge s, centre-top at (cx, cy)
  const h = s * 0.5; g.poly([[cx, cy - h], [cx + s, cy], [cx, cy + h], [cx - s, cy]], top); g.poly([[cx - s, cy], [cx, cy + h], [cx, cy + h + s], [cx - s, cy + s]], left); g.poly([[cx + s, cy], [cx, cy + h], [cx, cy + h + s], [cx + s, cy + s]], right);
  for (const [a, b] of [[[cx - s, cy], [cx, cy - h]], [[cx, cy - h], [cx + s, cy]], [[cx + s, cy], [cx + s, cy + s]], [[cx + s, cy + s], [cx, cy + h + s]], [[cx, cy + h + s], [cx - s, cy + s]], [[cx - s, cy + s], [cx - s, cy]], [[cx - s, cy], [cx, cy + h]], [[cx, cy + h], [cx + s, cy]], [[cx, cy + h], [cx, cy + h + s]]]) g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), O);
}
function games(c, t) {
  const pop = (t0) => ({ a: sm(t, t0, t0 + 0.3), dy: R(-12 * Math.sin(Math.PI * clamp01((t - t0) / 0.42))) });
  // dice
  { const { a, dy } = pop(EV.hidden - 0.1); if (a > 0) { const g = fade(c, a);
    for (const [cx, cy, s, top, sideP] of [[86, 262, 22, 5, 3], [134, 282, 20, 3, 6]]) { const y = cy + dy; iso(g, cx, y, s, IV, "#D8D2E4", "#B4ACC8");
      const tp = { 3: [[-0.5, 0], [0, 0], [0.5, 0]], 5: [[-0.5, 0], [0.5, 0], [0, 0], [0, -0.5], [0, 0.5]] }[top];
      for (const [u, v] of tp) { const px = R(cx + (u - v) * s * 0.55), py = R(y + (u + v) * s * 0.28); g.rect(px - 1, py - 1, 3, 2, PK); }
      for (let i = 0; i < sideP; i++) { const px = R(cx - s * 0.5 + ((i % 2) - 0.5) * 8), py = R(y + s * 0.6 + Math.floor(i / 2) * 7); g.rect(px - 1, py, 3, 2, O); } } } }
  // checkers board (top-down) with a piece hopping on "lot"
  { const { a, dy } = pop(EV.math - 0.1); if (a > 0) { const g = fade(c, a), N = 8, sq = 14, x0 = 214, y0 = 200 + dy;
    g.rect(x0 - 6, y0 - 6, N * sq + 12, N * sq + 12, O); g.rect(x0 - 5, y0 - 5, N * sq + 10, N * sq + 10, "#8A5834"); g.rect(x0 - 4, y0 - 4, N * sq + 8, 1, "#B87A48");
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) g.rect(x0 + i * sq, y0 + j * sq, sq, sq, (i + j) % 2 ? "#3A2414" : "#E8D2A8");
    const pieces = [[1, 0, 0], [3, 0, 0], [5, 0, 0], [0, 1, 0], [4, 1, 0], [7, 2, 0], [0, 7, 1], [2, 7, 1], [6, 7, 1], [3, 6, 1], [5, 6, 1], [2, 5, 1]];
    const hop = ease((t - EV.lot) / 0.45);
    pieces.forEach(([i, j, p], n) => { let px = x0 + i * sq + sq / 2, py = y0 + j * sq + sq / 2; if (n === 11) { px += hop * sq; py -= hop * sq + Math.sin(Math.PI * hop) * 6; }
      g.disc(R(px), R(py) + 1, 5, O); g.disc(R(px), R(py), 5, p ? "#D0283E" : "#2A2140"); g.ring(R(px), R(py), 3, p ? "#F07070" : "#5A5078"); }); } }
  // puzzle cube (isometric, 3×3 stickers), turning its top layer a little
  { const { a, dy } = pop(EV.games - 0.25); if (a > 0) { const g = fade(c, a), cx = 420, cy = 236 + dy, s = 36;
    iso(g, cx, cy, s, "#14101E", "#14101E", "#14101E");
    const TOP = ["#FDFEED", "#F4CA50", "#FDFEED", "#3A7AE0", "#FDFEED", "#E03056", "#FDFEED", "#65DA41", "#FDFEED"], LEFT = ["#E03056", "#E03056", "#3A7AE0", "#E03056", "#E03056", "#F4CA50", "#65DA41", "#E03056", "#E03056"], RIGHT = ["#3A7AE0", "#65DA41", "#3A7AE0", "#3A7AE0", "#F59A3A", "#3A7AE0", "#3A7AE0", "#3A7AE0", "#FDFEED"];
    const h = s * 0.5;
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const T0 = (u, v) => [cx + (u - v) * s, cy - h + (u + v) * h], q = 0.1;
      g.poly([T0(i / 3 + q / 3, j / 3 + q / 3), T0((i + 1) / 3 - q / 3, j / 3 + q / 3), T0((i + 1) / 3 - q / 3, (j + 1) / 3 - q / 3), T0(i / 3 + q / 3, (j + 1) / 3 - q / 3)], TOP[j * 3 + i]);
      const Lf = (u, v) => [cx - s + u * s, cy + u * h + v * s];
      g.poly([Lf(i / 3 + q / 3, j / 3 + q / 3), Lf((i + 1) / 3 - q / 3, j / 3 + q / 3), Lf((i + 1) / 3 - q / 3, (j + 1) / 3 - q / 3), Lf(i / 3 + q / 3, (j + 1) / 3 - q / 3)], mix(LEFT[j * 3 + i], "#000000", 0.18));
      const Rf = (u, v) => [cx + u * s, cy + h - u * h + v * s];
      g.poly([Rf(i / 3 + q / 3, j / 3 + q / 3), Rf((i + 1) / 3 - q / 3, j / 3 + q / 3), Rf((i + 1) / 3 - q / 3, (j + 1) / 3 - q / 3), Rf(i / 3 + q / 3, (j + 1) / 3 - q / 3)], mix(RIGHT[j * 3 + i], "#000000", 0.35));
    } } }
}

// ---------------------------------------------------------------- "NEW DECK" chip that rides in with the fresh deck
function newDeck(c, t) {
  const a = win(t, T.swapIn[0] + 0.2, T.spreadP[0] + 0.1, 0.25, 0.3); if (a <= 0) return;
  const k = ease((t - T.swapIn[0]) / (T.swapIn[1] - T.swapIn[0])), x = -40 + (HOME.x + 40) * k;
  chip(c, "NEW DECK", Math.max(70, x), HOME.y - CARD_H / 2 - 30, Y, a, 2, TINY);
}

export function infoBack(c, t) {
  if (t > EV.first && t < T.cellsBack[1] + 0.2) cells(c, t, true);
  if (t > EV.cut && t < EV.weave + 0.4) perfectInfo(c, t, true);
}
export function infoFront(c, t) {
  if (t > 4 && t < EV.first) for (const v of VIG) vignette(c, v, t);
  if (t > EV.ever2 - 0.1 && t < EV.first) { const a = sm(t, EV.ever2 - 0.05, EV.ever2 + 0.2) * (1 - sm(t, ...vigOut)); chip(c, "NEVER", 270, 312 + R(4 * (1 - ease((t - EV.ever2) / 0.3))), PK, a, 3); }
  if (t > EV.first && t < T.cellsBack[1] + 0.2) cells(c, t, false);
  if (t > EV.number - 0.2 && t < EV.but1 + 0.6) ticker(c, t);
  if (t > EV.let1 - 0.2 && t < EV.but1 + 0.6) earth(c, t);
  if (t > EV.two1 - 0.2 && t < EV.but1 + 0.6) odds(c, t);
  if (t > EV.after - 0.1 && t < EV.in1992 + 0.2) afterRiffle(c, t);
  if (t > EV.in1992 - 0.1 && t < EV.slow + 0.3) bars(c, t);
  if (t > EV.slow - 0.1 && t < EV.and3 + 0.35) overhandInfo(c, t);
  if (t > T.swapIn[0] && t < T.spreadP[0] + 0.5) newDeck(c, t);
  if (t > EV.perfect - 0.15 && t < EV.magicians + 0.1) perfectInfo(c, t, false);
  if (t > EV.magicians - 0.15 && t < EV.theres + 0.25) hatAndSleeve(c, t);
  if (t > EV.hidden - 0.15) games(c, t);
}
