// The two "tombstone" cards (dark stone, thin pumpkin-orange frame) at the top of the main zone, the face brackets,
// and the beam of light from the brain's face area to the pumpkin. Cards rise in (scale 0.88 → 1, 18 px → 0,
// dithered) and fold away (1 → 0.88, dissolve); every content part has its own moment.
import { mix, bayer, fade, MAIN, TINY } from "../../../../../renderer/pixel/raster.mjs";
import { clamp01, lerp, easeOut, TAU } from "./util.mjs";

const OR = "#F08A3C", YE = "#F4CA50", STONE = "#170F25", STONE2 = "#1F1530", LINE = "#3A2852", IV = "#FDFEED";
export const BRAIN_CARD = { x0: 46, y0: 156, x1: 262, y1: 318 };
export const TIMER_CARD = { x0: 280, y0: 156, x1: 494, y1: 318 };

/** A gated view that also maps drawing through a scale k about (ox, oy) and a vertical offset. */
function xf(c, k, ox, oy, dy) {
  const o = Object.create(c), base = c;
  o.px = (x, y, col) => { const X = ox + (x - ox) * k, Y = oy + (y - oy) * k + dy;
    // scaling < 1 leaves gaps; fill the covered target pixel range
    const X0 = Math.floor(X), Y0 = Math.floor(Y), X1 = Math.floor(ox + (x + 1 - ox) * k), Y1 = Math.floor(oy + (y + 1 - oy) * k + dy);
    for (let j = Y0; j <= Math.max(Y0, Y1 - 1); j++) for (let i = X0; i <= Math.max(X0, X1 - 1); i++) base.px(i, j, col); };
  return o;
}
/** Card presence → { a, k, dy } for enter window [a0,a1] and exit window [b0,b1]. */
export function presence(t, inW, outW) {
  const e = easeOut((t - inW[0]) / (inW[1] - inW[0])), x = easeOut((t - outW[0]) / (outW[1] - outW[0]));
  if (t < inW[0] || t > outW[1]) return null;
  if (t < outW[0]) return { a: clamp01(e * 1.15), k: lerp(0.88, 1, e), dy: 18 * (1 - e) };
  return { a: 1 - x, k: lerp(1, 0.88, x), dy: 0 };
}

function stone(c, B, frameK) {
  const r = 26, w = B.x1 - B.x0, h = B.y1 - B.y0;
  for (let y = B.y0; y < B.y1; y++) for (let x = B.x0; x < B.x1; x++) {
    const ix = x - B.x0, iy = y - B.y0; let inside = true, edge = ix === 0 || ix === w - 1 || iy === h - 1;
    for (const cx of [B.x0 + r, B.x1 - 1 - r]) if (iy < r && ((x < B.x0 + r && cx === B.x0 + r) || (x > B.x1 - 1 - r && cx === B.x1 - 1 - r))) { const d = Math.hypot(x - cx, y - (B.y0 + r)); if (d > r + 0.4) inside = false; else if (d > r - 0.7) edge = true; }
    if (iy === 0) edge = true;
    if (!inside) continue;
    if (edge) { c.px(x, y, mix("#7A4422", OR, frameK)); continue; }
    const inner = ix === 3 || ix === w - 4 || iy === h - 4 ? 1 : 0;
    let col = (bayer(x, y) > 0.86 && ((x * 7 + y * 13) % 5 === 0)) ? STONE2 : STONE; if (inner && iy > r * 0.6) col = LINE;
    c.px(x, y, col);
  }
  // a small crack in the lower left corner
  for (const [i, j] of [[8, -8], [9, -9], [10, -9], [11, -10], [11, -11], [12, -12], [14, -12], [15, -13]]) c.px(B.x0 + i, B.y1 + j, "#0B0714");
}

// ---------------------------------------------------------------- the brain (side view, facing left)
export const BR = { cx: 154, cy: 220 };
export const FACE_AREA = { u: 17, v: 34, rx: 17, ry: 6 };       // ventral temporal (fusiform) surface, toward the back
const BRAMP = ["#4A2440", "#7A4766", "#B07094", "#D99AB8", "#F2C6D9"];
function brainAt(u, v) {
  const cer = (u / 72) ** 2 + ((v + 6) / 46) ** 2, tem = ((u + 4) / 52) ** 2 + ((v - 20) / 20) ** 2, cbl = ((u - 50) / 22) ** 2 + ((v - 28) / 13) ** 2;
  const stem = v > 26 && v < 56 && u > 26 + 0.25 * (v - 26) && u < 39 + 0.25 * (v - 26);
  if (cer <= 1 || (tem <= 1 && u < 52)) return { part: "cer", d: Math.min(cer, tem) };
  if (cbl <= 1) return { part: "cbl", d: cbl };
  if (stem) return { part: "stem", d: 0.5 };
  return null;
}
let RING = null; const st_ring = (t) => (RING ? Math.max(0, Math.min(1, (t - RING[0]) / (RING[1] - RING[0]))) : 0);
export function setRing(w) { RING = w; }
function drawBrain(c, glow, outline, t) {
  const { cx, cy } = BR;
  for (let y = cy - 60; y <= cy + 66; y++) for (let x = cx - 80; x <= cx + 80; x++) {
    const u = x - cx, v = y - cy, b = brainAt(u, v); if (!b) continue;
    const nb = [brainAt(u - 1, v), brainAt(u + 1, v), brainAt(u, v - 1), brainAt(u, v + 1)];
    if (nb.some((n) => !n) || (b.part !== "cer" && nb.some((n) => n && n.part === "cer"))) { c.px(x, y, "#1A0C18"); continue; }
    let L, col;
    if (b.part === "cer") {
      L = 0.35 + 0.55 * Math.sqrt(Math.max(0, 1 - b.d)) + 0.25 * (-u / 72 * 0.3 - (v + 6) / 46 * 0.6);
      const sul = Math.abs(Math.sin(0.23 * u + 2.1 * Math.sin(0.14 * v + 0.5)) * Math.cos(0.21 * v + 1.8 * Math.sin(0.12 * u)));
      if (sul < 0.11) L -= 0.38; else if (sul < 0.2) L -= 0.12;
      const syl = v - (10 - (u + 44) * 0.16); if (u > -46 && u < 30 && Math.abs(syl) < 1.3) L -= 0.5;   // lateral fissure
    } else if (b.part === "cbl") { L = 0.45 + 0.3 * Math.sqrt(1 - b.d) - (Math.floor(v + 0.3 * u) % 3 === 0 ? 0.3 : 0); }
    else L = 0.38 + (u - (26 + 0.25 * (v - 26)) < 4 ? 0.15 : 0);
    const q = clamp01(L) * 4 + bayer(x, y) * 0.9 - 0.45, i = Math.max(0, Math.min(4, Math.floor(q + 0.5)));
    // the rest of the brain dims a little while the face area lights, so the light reads at phone size
    col = mix(BRAMP[i], "#24142E", 0.45 * glow);
    // the face area: a dotted outline that draws round it, then a warm glow that lights it up
    const fa = Math.hypot((u - FACE_AREA.u) / FACE_AREA.rx, (v - FACE_AREA.v) / FACE_AREA.ry);
    if (glow > 0 && fa < 2.2) { const g = glow * (fa < 1 ? 1 : (2.2 - fa) / 1.2) * (0.92 + 0.08 * Math.sin(TAU * 3 * t)); const qq = Math.floor(g * 4 + bayer(x + 2, y) * 0.99) / 4; if (qq > 0) col = mix(col, fa < 0.55 ? "#FFF0A8" : fa < 1 ? YE : OR, Math.min(1, qq)); }
    const ang = (Math.atan2(v - FACE_AREA.v, (u - FACE_AREA.u) / 2.8) / TAU + 1.25) % 1;
    if (outline > 0 && Math.abs(fa - 1.2) < 0.24 && ang <= outline && (((x >> 1) + (y >> 1)) & 1)) col = glow > 0.5 ? mix(YE, "#FFF0A8", glow) : YE;
    c.px(x, y, col);
  }
  // halo outside the brain edge once it lights
  if (glow > 0) { const hx = cx + FACE_AREA.u, hy = cy + FACE_AREA.v;
    c.tint(hx - 50, hy - 26, 100, 56, (x, y) => { if (brainAt(x - cx, y - cy)) return 0; const d = Math.hypot((x - hx) / 44, (y - hy) / 22); return glow * 0.7 * clamp01(1 - d); }, OR, 3);
    // one ring of light spreading out from the area as it lights up
    const rk = st_ring(t); if (rk > 0 && rk < 1) { const rr = 10 + 46 * rk, a = 1 - rk;
      for (let k = 0; k < 220; k++) { const th = (k / 220) * TAU, x = Math.round(hx + Math.cos(th) * rr * 1.5), y = Math.round(hy + Math.sin(th) * rr * 0.62); if (a > bayer(x, y)) c.px(x, y, YE); } } }
}

export function brainCard(c, t, pres, st) {
  if (!pres) return;
  const B = BRAIN_CARD, g = xf(fade(c, pres.a), pres.k, (B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, pres.dy);
  stone(g, B, 0.55 + 0.45 * st.glow);
  drawBrain(st.brainA < 1 ? fade(g, st.brainA) : g, st.glow, st.outline, t);
  if (st.label > 0) { const lg = fade(g, st.label), txt = "FACE AREA", w = c.measure(MAIN, txt, { scale: 2 }), x = Math.round(BR.cx - w / 2), y = 289 + Math.round(4 * (1 - st.label));
    lg.text(MAIN, txt, x + 1, y + 1, "#0B0812", { scale: 2 }); lg.text(MAIN, txt, x, y, mix(IV, YE, st.glow), { scale: 2 });
    for (let j = 0; j < 7; j++) if (j % 2 === 0) lg.px(BR.cx + FACE_AREA.u, BR.cy + FACE_AREA.v + FACE_AREA.ry + 4 + j, mix("#8A7AA8", OR, st.glow)); }
}

// ---------------------------------------------------------------- the timer: 0 → 165 ms, a pie filling one sixth
export function timerCard(c, t, pres, st) {
  if (!pres) return;
  const B = TIMER_CARD, g = xf(fade(c, pres.a), pres.k, (B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, pres.dy);
  stone(g, B, 0.55 + 0.45 * st.done);
  const px = 387, py = 214, R = 44, sweep = st.k * (TAU / 6);
  for (let y = -R - 2; y <= R + 2; y++) for (let x = -R - 2; x <= R + 2; x++) {
    const d = Math.hypot(x, y); if (d > R + 1.2) continue;
    const ang = (Math.atan2(x, -y) + TAU) % TAU;
    let col = d > R - 1 ? mix("#5A3A6A", OR, 0.5 + 0.5 * st.done) : "#241838";
    if (d <= R - 1) { const div = Math.abs(((ang / (TAU / 6)) % 1) - 0) < 0.012 * (R / Math.max(4, d)) || Math.abs(((ang / (TAU / 6)) % 1) - 1) < 0.012 * (R / Math.max(4, d)); if (div && d > 6) col = LINE;
      if (ang <= sweep && d > 2) col = d > R - 5 ? YE : bayer(x, y) > 0.8 - 0.25 * (d / R) ? "#F4A23C" : OR; }
    g.px(px + x, py + y, col);
  }
  // tick marks round the rim, and the hand
  for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; for (let r = R + 3; r <= R + 5; r++) g.px(Math.round(px + Math.sin(a) * r), Math.round(py - Math.cos(a) * r), "#8A7AA8"); }
  for (let r = 0; r <= R - 3; r++) g.px(Math.round(px + Math.sin(sweep) * r), Math.round(py - Math.cos(sweep) * r), IV);
  g.rect(px - 1, py - 1, 3, 3, IV);
  const n = Math.round(st.k * 165), txt = `${String(n).padStart(3, "0")} MS`, w = c.measure(MAIN, txt, { scale: 3 });
  g.text(MAIN, txt, Math.round(px - w / 2) + 1, 279, "#0B0812", { scale: 3 });
  g.text(MAIN, txt, Math.round(px - w / 2), 278, mix(IV, YE, st.done), { scale: 3 });
}

// ---------------------------------------------------------------- face brackets (closing in on the holes and the line)
export function brackets(c, box, k, a, tagA) {
  if (a <= 0) return;
  const g = fade(c, a), cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, s = lerp(1.45, 1, k);
  const x0 = Math.round(cx + (box.x0 - cx) * s), x1 = Math.round(cx + (box.x1 - cx) * s), y0 = Math.round(cy + (box.y0 - cy) * s), y1 = Math.round(cy + (box.y1 - cy) * s), L = 18;
  for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    g.rect(Math.min(x, x + dx * L), y - (dy < 0 ? 1 : 0), L, 2, OR); g.rect(x - (dx < 0 ? 1 : 0), Math.min(y, y + dy * L), 2, L, OR); }
  if (tagA > 0) { const tg = fade(c, a * tagA), txt = "FACE", w = c.measure(MAIN, txt, { scale: 2 });
    tg.rect(x0, y0 - 22, w + 10, 20, OR); tg.text(MAIN, txt, x0 + 5, y0 - 19, "#1A0C10", { scale: 2 }); }
}

// ---------------------------------------------------------------- the beam: dotted light from the face area to the pumpkin
export function beam(c, t, from, to, head, a) {
  if (a <= 0 || head <= 0) return;
  const g = fade(c, a), ctrl = { x: (from.x + to.x) / 2 + 60, y: (from.y + to.y) / 2 - 10 }, N = 26;
  for (let i = 0; i <= N; i++) { const s = i / N; if (s > head) break;
    const x = (1 - s) ** 2 * from.x + 2 * (1 - s) * s * ctrl.x + s * s * to.x, y = (1 - s) ** 2 * from.y + 2 * (1 - s) * s * ctrl.y + s * s * to.y;
    const pulse = 0.5 + 0.5 * Math.sin(TAU * (s * 3 - t * 1.6)), near = clamp01(1 - (head - s) * 6), col = near > 0.3 || pulse > 0.7 ? YE : OR;
    g.rect(Math.round(x) - 1, Math.round(y) - 1, near > 0.5 ? 4 : 3, near > 0.5 ? 4 : 3, col); }
}
