// Phone close-up (screen space): blurred street behind, the phone with the missed-call screen, the far mitten holding it,
// the near mitten pressing CALL BACK. Drawn at scale 1; render.mjs resamples it for the zoom in and out.
import { MAIN, TINY, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth as spline, drawPart } from "../../dog/shade.mjs";
import { MITT, COAT } from "./hero.mjs";
import { EV } from "./timeline.mjs";

const W = 540, TOP = 190, BOT = 960, R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const IV = "#FDFEED", Y = "#F4CA50", L = "#E0CDF8", PK = "#E03056", O = "#0B0812", CARD = "#120C1D", p3 = "#3B2C5C", p5 = "#6E4FB0", p7 = "#B08AE8";
export const BUTTON = { x: 256, y: 552, r: 38 };   // CALL BACK: the press point

function bokeh(c, t) {
  for (let y = TOP; y < BOT; y++) { const k = (y - TOP) / (BOT - TOP); for (let x = 0; x < W; x++) c.px(x, y, mix("#0E0A1C", "#1C1430", k + (bayer(x, y) - 0.5) * 0.08)); }
  for (const [bx, by, r, col, s] of [[70, 250, 70, "#FFE9A8", 0.32], [470, 300, 56, "#F4CA50", 0.25], [500, 230, 34, PK, 0.28], [60, 520, 60, "#C98A40", 0.22], [480, 700, 80, "#BFD4F2", 0.2], [110, 820, 64, "#6E4FB0", 0.2], [300, 230, 30, "#E0CDF8", 0.12]])
    for (let y = by - r; y <= by + r; y++) for (let x = bx - r; x <= bx + r; x++) { if (y < TOP || y >= BOT || x < 0 || x >= W) continue; const d = Math.hypot(x - bx, y - by) / r; if (d > 1) continue; const a = d < 0.82 ? 1 : (1 - d) / 0.18; if (a > bayer(x, y)) c.px(x, y, mix(c.get(x, y), col, d > 0.9 ? s * 1.4 : s)); }
  // big soft near flakes
  for (let i = 0; i < 26; i++) { const sp = 30 + rnd(i * 3) * 40, x = R((rnd(i * 7) * 600 + t * 8 + Math.sin(t + i) * 10) % 560) - 10, y = TOP + R((rnd(i * 11) * 800 + t * sp) % 790), r = 2 + R(rnd(i * 13) * 4);
    for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) { const d = Math.hypot(j, k) / r; if (d < 1 && (1 - d * d) * 0.8 > bayer(x + k, y + j)) c.px(x + k, y + j, mix(c.get(x + k, y + j), "#E8ECF8", 0.7)); } }
}
const knitOld = (c, x, y, base) => { const u = ((x + Math.floor(y / 5) * 3) % 6 + 6) % 6, v = ((y % 5) + 5) % 5; if ((u === 0 && v < 3) || (u === 5 && v > 1) || v === 4) c.px(x, y, mix(c.get(x, y), MITT[1], 0.45)); else if (u === 2 && v === 1) c.px(x, y, mix(c.get(x, y), MITT[7], 0.35)); void base; };

export function drawCloseup(c, t) {
  bokeh(c, t);
  const press = sm(t, EV.pressure[0] - 0.1, EV.pressure[0] + 0.25), shake = t > EV.pressure[0] && t < EV.pressure[1] + 0.3 ? R(Math.sin(t * 60) * 1.4 * press) : 0;
  const px0 = 130 + shake, py0 = 236, pw = 252, ph = 520;
  mittenCU(c, [178, 694], 2.25, 110, 130, 0, 0);
  // phone body, bezel, screen
  c.rrect(px0 - 2, py0 - 2, pw + 4, ph + 4, "#05030A", 26); c.rrect(px0, py0, pw, ph, "#1E1A2C", 24); c.rrect(px0 + 3, py0 + 3, pw - 6, ph - 6, "#0E0A18", 22);
  c.rect(px0 + pw - 3, py0 + 80, 3, 50, "#3A3456"); c.rect(px0 + 24, py0 + 3, pw - 48, 1, "#3A3456");
  const sx = px0 + 12, sy = py0 + 12, sw = pw - 24, sh = ph - 24;
  for (let y = sy; y < sy + sh; y++) for (let x = sx; x < sx + sw; x++) { const k = (y - sy) / sh; c.px(x, y, mix("#2A1F48", "#120C1D", k * 0.9 + (bayer(x, y) - 0.5) * 0.12)); }
  c.rrect(px0 + pw / 2 - 30, sy + 6, 60, 14, "#05030A", 7);
  c.text(TINY, "21:47", sx + 14, sy + 10, IV, { scale: 2 }); for (let k = 0; k < 4; k++) c.rect(sx + sw - 54 + k * 6, sy + 20 - k * 3, 4, 4 + k * 3, IV); c.rrect(sx + sw - 26, sy + 10, 18, 10, IV, 2); c.rect(sx + sw - 24, sy + 12, 9, 6, "#65DA41");
  // contact, MISSED CALL, call-back button
  const cx = px0 + pw / 2; c.disc(cx, sy + 104, 40, "#3B2C5C"); c.disc(cx, sy + 96, 15, p7); c.ellipse(cx, sy + 132, 25, 15, p7); c.ring(cx, sy + 104, 40, p5);
  const name = "MOM", nm = c.measure(MAIN, name, { scale: 4 }); c.text(MAIN, name, R(cx - nm / 2), sy + 160, IV, { scale: 4 });
  const ms = "MISSED CALL", mw = c.measure(MAIN, ms, { scale: 2 }); c.text(MAIN, ms, R(cx - mw / 2), sy + 200, PK, { scale: 2 });
  c.text(TINY, "1 MIN AGO", R(cx - c.measure(TINY, "1 MIN AGO", { scale: 2 }) / 2), sy + 224, "#959595", { scale: 2 });
  const B = { x: BUTTON.x + shake, y: BUTTON.y, r: BUTTON.r };
  c.disc(B.x, B.y + 3, B.r, "#1E5A20"); c.disc(B.x, B.y, B.r, "#4CB830"); c.disc(B.x - 4, B.y - 5, B.r - 8, "#65DA41"); c.disc(B.x - 12, B.y - 14, 6, "#9BF07A");
  [".XX........", "XXXX.......", "XXXX.......", ".XX........", ".XX........", "..XX.......", "...XX...XX.", "....XXXXXXX", "......XXXXX"].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "X") c.rect(B.x - 22 + i * 4, B.y - 18 + j * 4, 4, 4, IV); }));
  const cb = "CALL BACK", cw = c.measure(TINY, cb, { scale: 2 }); c.text(TINY, cb, R(B.x - cw / 2), B.y + B.r + 10, IV, { scale: 2 });
  // far thumb over the left edge (the mitten itself is behind the phone); near mitten pressing CALL BACK from the right
  drawPart(c, [spline([[100, 650], [138, 612], [170, 606], [182, 626], [160, 652], [118, 684]], new Set(), 5)], { ramp: MITT, base: 4, gain: 1.4, slope: 0.4, thick: 16, light: [-0.4, -0.9], outline: MITT[0], litOutline: MITT[5] });
  const sq = 7 * press;
  mittenCU(c, [B.x + 26 + shake, B.y + 2], -0.42, 130, 124, 1, sq);
  // pressure meter (left) and the IGNORED stamp
  const pm = sm(t, EV.cuIn[1] - 0.2, EV.cuIn[1] + 0.2) * (1 - sm(t, EV.cuZoom[0], EV.cuZoom[0] + 0.3));
  if (pm > 0) { const g = fade(c, pm); g.rrect(12, 204, 108, 344, p7, 3); g.rrect(14, 206, 104, 340, CARD, 3); g.text(TINY, "PRESSURE", 22, 216, L, { scale: 2 });
    const fill = sm(t, EV.pressure[0], EV.pressure[1]); for (let k = 0; k < 12; k++) { const y = 520 - k * 24, on = k / 12 < fill; g.rect(44, y, 44, 18, on ? (k > 8 ? PK : k > 5 ? "#F28A4A" : Y) : p3); if (on) g.rect(44, y, 44, 2, IV); }
    if (fill > 0.98) g.text(TINY, "MAX", 50, 236, PK, { scale: 2 }); }
  const ig = sm(t, EV.ignored, EV.ignored + 0.2) * (1 - sm(t, EV.cuZoom[0], EV.cuZoom[0] + 0.3));
  if (ig > 0) { const g = fade(c, ig), w = c.measure(MAIN, "IGNORED", { scale: 3 }) + 32, x = R(cx - w / 2), y = 326 + R((1 - ig) * 8); g.rrect(x - 3, y - 3, w + 6, 46, PK, 3); g.rrect(x, y, w, 40, CARD, 3); g.text(MAIN, "IGNORED", x + 16, y + 9, PK, { scale: 3 }); }
  // electricity: sparks around the touch point
  if (t > EV.spark[0] && t < EV.spark[1]) { const a = 1 - sm(t, EV.spark[0] + 0.15, EV.spark[1]);
    for (let k = 0; k < 7; k++) { const ang = k * 0.9 + t * 3, r0 = 18, r1 = 46 + 10 * Math.sin(t * 20 + k); let x0 = B.x + Math.cos(ang) * r0, y0 = B.y + 6 + Math.sin(ang) * r0; const g = fade(c, a);
      for (let s = 1; s <= 4; s++) { const r = r0 + (r1 - r0) * s / 4, j = (rnd(k * 9 + s + Math.floor(t * 20)) - 0.5) * 0.7, x1 = B.x + Math.cos(ang + j) * r, y1 = B.y + 6 + Math.sin(ang + j) * r; g.line(R(x0), R(y0), R(x1), R(y1), s % 2 ? Y : IV); g.line(R(x0) + 1, R(y0), R(x1) + 1, R(y1), Y); x0 = x1; y0 = y1; } } }
}

/** A knitted mitten in close-up: rounded pouch (tip at `tip`, axis angle `ang` pointing back toward the wrist), thumb lobe
 *  on side `thumb` (−1 = upper), V-stitch knit following the axis, ribbed cuff and the jacket sleeve. `sq` flattens the tip. */
function mittenCU(c, tip, ang, len, wid, thumb, sq) {
  const a = [Math.cos(ang), Math.sin(ang)], n = [-a[1], a[0]], r = wid / 2;
  const S = (u, v) => [tip[0] + a[0] * u + n[0] * v, tip[1] + a[1] * u + n[1] * v];
  const pouch = []; for (let k = 0; k <= 12; k++) { const th = -Math.PI / 2 + (Math.PI * k) / 12; pouch.push(S(Math.max(sq * Math.cos(th), r - r * Math.cos(th)), r * Math.sin(th))); }
  pouch.push(S(len, r * 0.94), S(len + 6, -r * 0.94));
  const cuff = [S(len - 4, -r * 0.98), S(len - 4, r * 0.98), S(len + 56, r * 1.0), S(len + 56, -r * 1.0)];
  const sleeve = [S(len + 50, -r * 1.2), S(len + 50, r * 1.2), S(len + 320, r * 1.3), S(len + 320, -r * 1.3)];
  const thumbP = [S(len * 0.42, thumb * r * 0.8), S(len * 0.5, thumb * (r + 34)), S(len * 0.66, thumb * (r + 44)), S(len * 0.8, thumb * (r + 26)), S(len * 0.84, thumb * r * 0.8)];
  const L = [-0.4, -0.9];
  drawPart(c, [spline(sleeve, new Set([0, 1, 2, 3]), 3)], { ramp: COAT, base: 3.5, gain: 1.4, slope: 0.6, thick: 40, light: L, outline: COAT[0] });
  drawPart(c, [spline(cuff, new Set([0, 1, 2, 3]), 3)], { ramp: MITT, base: 3.2, gain: 1.2, slope: 0.4, thick: 22, light: L, outline: MITT[0] });
  if (thumb) drawPart(c, [spline(thumbP, new Set(), 5)], { ramp: MITT, base: 3.6, gain: 1.4, slope: 0.4, thick: 18, light: L, outline: MITT[0], litOutline: MITT[5] });
  drawPart(c, [spline(pouch, new Set([13, 14]), 4)], { ramp: MITT, base: 3.9, gain: 1.7, slope: 0.6, thick: r * 0.75, light: L, outline: MITT[0], litOutline: MITT[5] });
  // knit: V stitches in columns along the axis; ribbing on the cuff
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of [...pouch, ...cuff, ...(thumb ? thumbP : [])]) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.max(TOP, R(y0)); y < Math.min(BOT, R(y1)); y++) for (let x = Math.max(0, R(x0)); x < Math.min(W, R(x1)); x++) {
    const o = c.get(x, y), hx = "#" + o.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase(); if (!MITT.includes(hx) || hx === MITT[0]) continue;
    const dx = x - tip[0], dy = y - tip[1], u = dx * a[0] + dy * a[1], v = dx * n[0] + dy * n[1];
    if (u > len - 4 && u < len + 56) { if (((Math.floor(v / 5) % 2) + 2) % 2 === 0) c.px(x, y, mix(o, MITT[1], 0.35)); continue; }
    const cu = ((v % 8) + 8) % 8, ru = ((u % 7) + 7) % 7, vv = Math.abs(cu - 4);
    if (Math.abs(ru - (6 - vv * 1.3)) < 0.9) c.px(x, y, mix(o, MITT[1], 0.4)); else if (Math.abs(ru - (5 - vv * 1.3)) < 0.6 && vv < 2) c.px(x, y, mix(o, MITT[7], 0.3));
  }
}
